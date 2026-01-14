// =============================================================================
// AST-BASED SECURITY ANALYZER
// Analyse syntaxique pour réduire les faux positifs
// Supporte TypeScript, JavaScript, et Python (via tree-sitter ou regex amélioré)
// =============================================================================

import type { SecurityVulnerability, VulnerabilitySeverity, VulnerabilityCategory } from './security-analyzer';

// =============================================================================
// TYPES
// =============================================================================

export interface ASTNode {
  type: string;
  name?: string;
  value?: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  children?: ASTNode[];
  parent?: ASTNode;
}

export interface TaintedVariable {
  name: string;
  source: TaintSource;
  declaredAt: { file: string; line: number };
  sanitizedAt?: { file: string; line: number; method: string };
  usedAt: Array<{ file: string; line: number; context: string }>;
}

export type TaintSource =
  | 'request.body'
  | 'request.query'
  | 'request.params'
  | 'request.headers'
  | 'process.argv'
  | 'stdin'
  | 'env'
  | 'file_read'
  | 'database'
  | 'external_api'
  | 'unknown';

export interface DataFlowPath {
  source: { variable: string; type: TaintSource; location: string };
  transformations: Array<{ operation: string; location: string }>;
  sink: { type: string; location: string; dangerous: boolean };
  sanitized: boolean;
  sanitizationMethod?: string;
}

export interface ASTAnalysisResult {
  functions: FunctionInfo[];
  variables: VariableInfo[];
  taintedVariables: TaintedVariable[];
  dataFlows: DataFlowPath[];
  dangerousSinks: DangerousSink[];
  sanitizationPoints: SanitizationPoint[];
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  calls: string[];
  usesUserInput: boolean;
  hasDangerousOperations: boolean;
}

export interface VariableInfo {
  name: string;
  line: number;
  type?: string;
  initialValue?: string;
  isConst: boolean;
  scope: 'global' | 'module' | 'function' | 'block';
  isTainted: boolean;
  taintSource?: TaintSource;
}

export interface DangerousSink {
  type: 'sql_query' | 'command_exec' | 'file_operation' | 'html_injection' | 'url_fetch' | 'eval' | 'deserialization';
  location: { file: string; line: number; column: number };
  inputVariable?: string;
  isParameterized: boolean;
  isSanitized: boolean;
}

export interface SanitizationPoint {
  method: string;
  category: 'sql' | 'html' | 'url' | 'path' | 'command' | 'general';
  location: { file: string; line: number };
  inputVariable: string;
  outputVariable: string;
}

// =============================================================================
// PATTERNS FOR DETECTION
// =============================================================================

const TAINT_SOURCES: Record<string, TaintSource> = {
  // JavaScript/TypeScript
  'req.body': 'request.body',
  'req.query': 'request.query',
  'req.params': 'request.params',
  'req.headers': 'request.headers',
  'request.body': 'request.body',
  'request.query': 'request.query',
  'request.params': 'request.params',
  'request.headers': 'request.headers',
  'ctx.request.body': 'request.body',
  'ctx.query': 'request.query',
  'ctx.params': 'request.params',
  'process.argv': 'process.argv',
  'process.env': 'env',
  'Bun.argv': 'process.argv',
  'Deno.args': 'process.argv',

  // Python
  'request.args': 'request.query',
  'request.form': 'request.body',
  'request.json': 'request.body',
  'request.data': 'request.body',
  'request.files': 'request.body',
  'sys.argv': 'process.argv',
  'os.environ': 'env',
  'input()': 'stdin',

  // Rust
  'std::env::args': 'process.argv',
  'std::env::var': 'env',
  'std::io::stdin': 'stdin',
};

const DANGEROUS_SINKS: Record<string, DangerousSink['type']> = {
  // SQL
  'execute': 'sql_query',
  'query': 'sql_query',
  'raw': 'sql_query',
  'rawQuery': 'sql_query',
  'sequelize.query': 'sql_query',
  'knex.raw': 'sql_query',
  'prisma.$queryRaw': 'sql_query',
  'cursor.execute': 'sql_query',
  'conn.execute': 'sql_query',
  'db.execute': 'sql_query',

  // Command Execution
  'exec': 'command_exec',
  'execSync': 'command_exec',
  'spawn': 'command_exec',
  'spawnSync': 'command_exec',
  'child_process.exec': 'command_exec',
  'subprocess.run': 'command_exec',
  'subprocess.Popen': 'command_exec',
  'os.system': 'command_exec',
  'os.popen': 'command_exec',
  'Bun.spawn': 'command_exec',
  'Bun.$': 'command_exec',

  // File Operations
  'readFile': 'file_operation',
  'writeFile': 'file_operation',
  'readFileSync': 'file_operation',
  'writeFileSync': 'file_operation',
  'open': 'file_operation',
  'fs.read': 'file_operation',
  'fs.write': 'file_operation',

  // HTML/XSS
  'innerHTML': 'html_injection',
  'outerHTML': 'html_injection',
  'document.write': 'html_injection',
  'dangerouslySetInnerHTML': 'html_injection',
  'v-html': 'html_injection',

  // URL/SSRF
  'fetch': 'url_fetch',
  'axios': 'url_fetch',
  'http.request': 'url_fetch',
  'https.request': 'url_fetch',
  'urllib.request': 'url_fetch',
  'requests.get': 'url_fetch',
  'requests.post': 'url_fetch',
  'httpx.get': 'url_fetch',
  'aiohttp.get': 'url_fetch',

  // Eval/Code Execution
  'eval': 'eval',
  'Function': 'eval',
  'setTimeout': 'eval', // when string argument
  'setInterval': 'eval',
  'new Function': 'eval',

  // Deserialization
  'JSON.parse': 'deserialization',
  'pickle.loads': 'deserialization',
  'yaml.load': 'deserialization',
  'yaml.unsafe_load': 'deserialization',
  'marshal.loads': 'deserialization',
  'unserialize': 'deserialization',
};

const SANITIZATION_METHODS: Record<string, SanitizationPoint['category']> = {
  // SQL
  'escape': 'sql',
  'escapeId': 'sql',
  'mysql.escape': 'sql',
  'pg.escapeLiteral': 'sql',
  'pg.escapeIdentifier': 'sql',
  'sqlstring.escape': 'sql',

  // HTML/XSS
  'escapeHtml': 'html',
  'htmlspecialchars': 'html',
  'encodeURIComponent': 'url',
  'encodeURI': 'url',
  'DOMPurify.sanitize': 'html',
  'sanitizeHtml': 'html',
  'xss': 'html',
  'bleach.clean': 'html',
  'markupsafe.escape': 'html',

  // Path
  'path.basename': 'path',
  'path.normalize': 'path',
  'path.resolve': 'path',
  'os.path.basename': 'path',
  'os.path.normpath': 'path',
  'os.path.realpath': 'path',

  // Command
  'shlex.quote': 'command',
  'escapeshellarg': 'command',
  'escapeshellcmd': 'command',

  // General validation
  'parseInt': 'general',
  'parseFloat': 'general',
  'Number': 'general',
  'validator.escape': 'general',
  'validator.isEmail': 'general',
  'validator.isURL': 'general',
  'zod.parse': 'general',
  'yup.validate': 'general',
  'joi.validate': 'general',
};

// =============================================================================
// AST ANALYZER CLASS
// =============================================================================

export class ASTAnalyzer {
  private fileContent: string;
  private filePath: string;
  private language: string;
  private lines: string[];

  constructor(fileContent: string, filePath: string) {
    this.fileContent = fileContent;
    this.filePath = filePath;
    this.language = this.detectLanguage(filePath);
    this.lines = fileContent.split('\n');
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'mjs': 'javascript',
      'cjs': 'javascript',
      'py': 'python',
      'rs': 'rust',
      'go': 'go',
    };
    return langMap[ext] || 'unknown';
  }

  // ===========================================================================
  // MAIN ANALYSIS
  // ===========================================================================

  analyze(): ASTAnalysisResult {
    return {
      functions: this.analyzeFunctions(),
      variables: this.analyzeVariables(),
      taintedVariables: this.analyzeTaintedVariables(),
      dataFlows: this.analyzeDataFlows(),
      dangerousSinks: this.findDangerousSinks(),
      sanitizationPoints: this.findSanitizationPoints(),
    };
  }

  // ===========================================================================
  // FUNCTION ANALYSIS
  // ===========================================================================

  private analyzeFunctions(): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const patterns = this.getFunctionPatterns();

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];

      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          const funcName = match[pattern.nameGroup] || 'anonymous';
          const endLine = this.findFunctionEnd(i);
          const funcBody = this.lines.slice(i, endLine + 1).join('\n');

          functions.push({
            name: funcName,
            startLine: i + 1,
            endLine: endLine + 1,
            parameters: this.extractParameters(line),
            isAsync: /async\s/.test(line),
            isExported: /export\s/.test(line),
            calls: this.extractFunctionCalls(funcBody),
            usesUserInput: this.checkForUserInput(funcBody),
            hasDangerousOperations: this.checkForDangerousOps(funcBody),
          });
          break;
        }
      }
    }

    return functions;
  }

  private getFunctionPatterns(): Array<{ regex: RegExp; nameGroup: number }> {
    switch (this.language) {
      case 'typescript':
      case 'javascript':
        return [
          { regex: /(?:async\s+)?function\s+(\w+)/, nameGroup: 1 },
          { regex: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>/, nameGroup: 1 },
          { regex: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function/, nameGroup: 1 },
          { regex: /(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/, nameGroup: 1 },
        ];
      case 'python':
        return [
          { regex: /(?:async\s+)?def\s+(\w+)/, nameGroup: 1 },
        ];
      case 'rust':
        return [
          { regex: /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/, nameGroup: 1 },
        ];
      case 'go':
        return [
          { regex: /func\s+(?:\([^)]+\)\s+)?(\w+)/, nameGroup: 1 },
        ];
      default:
        return [];
    }
  }

  private findFunctionEnd(startLine: number): number {
    let braceCount = 0;
    let started = false;

    // Python: use indentation
    if (this.language === 'python') {
      const startIndent = this.lines[startLine].match(/^(\s*)/)?.[1].length || 0;
      for (let i = startLine + 1; i < this.lines.length; i++) {
        const line = this.lines[i];
        if (line.trim() === '') continue;
        const currentIndent = line.match(/^(\s*)/)?.[1].length || 0;
        if (currentIndent <= startIndent) {
          return i - 1;
        }
      }
      return this.lines.length - 1;
    }

    // Brace-based languages
    for (let i = startLine; i < this.lines.length; i++) {
      const line = this.lines[i];
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;

      if (braceCount > 0) started = true;
      if (started && braceCount === 0) {
        return i;
      }
    }

    return this.lines.length - 1;
  }

  private extractParameters(line: string): string[] {
    const match = line.match(/\(([^)]*)\)/);
    if (!match) return [];

    return match[1]
      .split(',')
      .map(p => p.trim().split(/[:\s=]/)[0].trim())
      .filter(p => p.length > 0);
  }

  private extractFunctionCalls(funcBody: string): string[] {
    const calls: string[] = [];
    const callPattern = /(\w+(?:\.\w+)*)\s*\(/g;
    let match;

    while ((match = callPattern.exec(funcBody)) !== null) {
      if (!['if', 'for', 'while', 'switch', 'catch', 'function', 'async'].includes(match[1])) {
        calls.push(match[1]);
      }
    }

    return [...new Set(calls)];
  }

  private checkForUserInput(code: string): boolean {
    return Object.keys(TAINT_SOURCES).some(source => code.includes(source));
  }

  private checkForDangerousOps(code: string): boolean {
    return Object.keys(DANGEROUS_SINKS).some(sink => code.includes(sink));
  }

  // ===========================================================================
  // VARIABLE ANALYSIS
  // ===========================================================================

  private analyzeVariables(): VariableInfo[] {
    const variables: VariableInfo[] = [];
    const varPatterns = this.getVariablePatterns();

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];

      for (const pattern of varPatterns) {
        const match = line.match(pattern.regex);
        if (match) {
          const varName = match[pattern.nameGroup];
          const isConst = pattern.isConst;
          const initialValue = this.extractInitialValue(line, varName);
          const taintSource = this.detectTaintSource(initialValue);

          variables.push({
            name: varName,
            line: i + 1,
            initialValue,
            isConst,
            scope: this.determineScope(i),
            isTainted: taintSource !== undefined,
            taintSource,
          });
        }
      }
    }

    return variables;
  }

  private getVariablePatterns(): Array<{ regex: RegExp; nameGroup: number; isConst: boolean }> {
    switch (this.language) {
      case 'typescript':
      case 'javascript':
        return [
          { regex: /const\s+(\w+)\s*[=:]/, nameGroup: 1, isConst: true },
          { regex: /let\s+(\w+)\s*[=:]/, nameGroup: 1, isConst: false },
          { regex: /var\s+(\w+)\s*[=:]/, nameGroup: 1, isConst: false },
        ];
      case 'python':
        return [
          { regex: /^(\w+)\s*=\s*(?!.*def\s|.*class\s)/, nameGroup: 1, isConst: false },
        ];
      case 'rust':
        return [
          { regex: /let\s+(mut\s+)?(\w+)/, nameGroup: 2, isConst: false },
          { regex: /const\s+(\w+)/, nameGroup: 1, isConst: true },
        ];
      default:
        return [];
    }
  }

  private extractInitialValue(line: string, varName: string): string {
    const match = line.match(new RegExp(`${varName}\\s*=\\s*(.+)`));
    return match ? match[1].trim().replace(/;$/, '') : '';
  }

  private detectTaintSource(value: string): TaintSource | undefined {
    for (const [pattern, source] of Object.entries(TAINT_SOURCES)) {
      if (value.includes(pattern)) {
        return source;
      }
    }
    return undefined;
  }

  private determineScope(lineIndex: number): 'global' | 'module' | 'function' | 'block' {
    // Simple heuristic based on indentation
    const indent = this.lines[lineIndex].match(/^(\s*)/)?.[1].length || 0;
    if (indent === 0) return 'module';
    if (indent <= 2) return 'function';
    return 'block';
  }

  // ===========================================================================
  // TAINT ANALYSIS
  // ===========================================================================

  private analyzeTaintedVariables(): TaintedVariable[] {
    const tainted: TaintedVariable[] = [];
    const variables = this.analyzeVariables();

    for (const variable of variables) {
      if (variable.isTainted && variable.taintSource) {
        const usages = this.findVariableUsages(variable.name);
        const sanitization = this.findSanitization(variable.name);

        tainted.push({
          name: variable.name,
          source: variable.taintSource,
          declaredAt: { file: this.filePath, line: variable.line },
          sanitizedAt: sanitization,
          usedAt: usages,
        });
      }
    }

    return tainted;
  }

  private findVariableUsages(varName: string): Array<{ file: string; line: number; context: string }> {
    const usages: Array<{ file: string; line: number; context: string }> = [];
    const pattern = new RegExp(`\\b${varName}\\b`, 'g');

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      if (pattern.test(line)) {
        const context = this.determineUsageContext(line);
        usages.push({
          file: this.filePath,
          line: i + 1,
          context,
        });
      }
    }

    return usages;
  }

  private determineUsageContext(line: string): string {
    for (const [sink, type] of Object.entries(DANGEROUS_SINKS)) {
      if (line.includes(sink)) {
        return type;
      }
    }
    for (const [method, category] of Object.entries(SANITIZATION_METHODS)) {
      if (line.includes(method)) {
        return `sanitization:${category}`;
      }
    }
    return 'general';
  }

  private findSanitization(varName: string): { file: string; line: number; method: string } | undefined {
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      for (const method of Object.keys(SANITIZATION_METHODS)) {
        if (line.includes(method) && line.includes(varName)) {
          return { file: this.filePath, line: i + 1, method };
        }
      }
    }
    return undefined;
  }

  // ===========================================================================
  // DATA FLOW ANALYSIS
  // ===========================================================================

  public analyzeDataFlows(): DataFlowPath[] {
    const flows: DataFlowPath[] = [];
    const taintedVars = this.analyzeTaintedVariables();

    for (const tainted of taintedVars) {
      for (const usage of tainted.usedAt) {
        const sink = this.getSinkType(usage.context);
        if (sink) {
          flows.push({
            source: {
              variable: tainted.name,
              type: tainted.source,
              location: `${tainted.declaredAt.file}:${tainted.declaredAt.line}`,
            },
            transformations: [],
            sink: {
              type: sink,
              location: `${usage.file}:${usage.line}`,
              dangerous: true,
            },
            sanitized: tainted.sanitizedAt !== undefined,
            sanitizationMethod: tainted.sanitizedAt?.method,
          });
        }
      }
    }

    return flows;
  }

  private getSinkType(context: string): string | undefined {
    if (context.startsWith('sanitization:')) return undefined;
    if (context === 'general') return undefined;
    return context;
  }

  // ===========================================================================
  // DANGEROUS SINKS DETECTION
  // ===========================================================================

  public findDangerousSinks(): DangerousSink[] {
    const sinks: DangerousSink[] = [];

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];

      for (const [pattern, type] of Object.entries(DANGEROUS_SINKS)) {
        if (line.includes(pattern)) {
          sinks.push({
            type,
            location: { file: this.filePath, line: i + 1, column: line.indexOf(pattern) },
            isParameterized: this.checkParameterized(line),
            isSanitized: this.checkSanitized(line, i),
          });
        }
      }
    }

    return sinks;
  }

  private checkParameterized(line: string): boolean {
    return /\?\s*[,)]|\$\d+|:\w+|@\w+|%s/.test(line);
  }

  private checkSanitized(line: string, lineIndex: number): boolean {
    // Check current line and 5 lines above
    const context = this.lines.slice(Math.max(0, lineIndex - 5), lineIndex + 1).join('\n');
    return Object.keys(SANITIZATION_METHODS).some(method => context.includes(method));
  }

  // ===========================================================================
  // SANITIZATION POINTS DETECTION
  // ===========================================================================

  private findSanitizationPoints(): SanitizationPoint[] {
    const points: SanitizationPoint[] = [];

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];

      for (const [method, category] of Object.entries(SANITIZATION_METHODS)) {
        if (line.includes(method)) {
          const varMatch = line.match(/(\w+)\s*=\s*.*?${method}/);
          points.push({
            method,
            category,
            location: { file: this.filePath, line: i + 1 },
            inputVariable: this.extractInputVar(line, method),
            outputVariable: varMatch?.[1] || 'unknown',
          });
        }
      }
    }

    return points;
  }

  private extractInputVar(line: string, method: string): string {
    const match = line.match(new RegExp(`${method}\\s*\\(\\s*(\\w+)`));
    return match?.[1] || 'unknown';
  }

  // ===========================================================================
  // UTILITY: Check if line is in specific context
  // ===========================================================================

  isLineInComment(lineNum: number): boolean {
    if (lineNum < 1 || lineNum > this.lines.length) return false;

    const line = this.lines[lineNum - 1].trim();

    // Single-line comments
    if (line.startsWith('//') || line.startsWith('#') || line.startsWith('--')) {
      return true;
    }

    // Multi-line comment check
    let inComment = false;
    for (let i = 0; i < lineNum; i++) {
      const l = this.lines[i];
      if (l.includes('/*') && !l.includes('*/')) inComment = true;
      if (l.includes('*/')) inComment = false;
      if (l.includes('"""') || l.includes("'''")) inComment = !inComment;
    }

    return inComment;
  }

  isLineInLogging(lineNum: number): boolean {
    if (lineNum < 1 || lineNum > this.lines.length) return false;

    const line = this.lines[lineNum - 1];
    const loggingPatterns = [
      /console\.(log|error|warn|info|debug)/,
      /logger?\.(log|error|warn|info|debug|critical)/,
      /logging\.(log|error|warn|info|debug|critical)/,
      /print\s*\(/,
      /println!/,
      /eprintln!/,
      /fmt\.Print/,
      /log\.(Print|Fatal|Panic)/,
    ];

    return loggingPatterns.some(p => p.test(line));
  }

  isLineInTestFile(): boolean {
    const testPatterns = [
      /\.test\./,
      /\.spec\./,
      /_test\./,
      /test_/,
      /__tests__/,
      /\/tests?\//,
      /\/spec\//,
    ];

    return testPatterns.some(p => p.test(this.filePath));
  }

  getLineContent(lineNum: number): string {
    if (lineNum < 1 || lineNum > this.lines.length) return '';
    return this.lines[lineNum - 1];
  }

  getFunctionContaining(lineNum: number): FunctionInfo | undefined {
    const functions = this.analyzeFunctions();
    return functions.find(f => lineNum >= f.startLine && lineNum <= f.endLine);
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createASTAnalyzer(fileContent: string, filePath: string): ASTAnalyzer {
  return new ASTAnalyzer(fileContent, filePath);
}

// =============================================================================
// ENHANCED VULNERABILITY FILTER USING AST
// =============================================================================

export function filterVulnerabilityWithAST(
  vulnerability: SecurityVulnerability,
  fileContent: string
): { isLikelyFalsePositive: boolean; reason?: string; confidence: number } {
  const ast = new ASTAnalyzer(fileContent, vulnerability.location.file);

  // Check if in comment
  if (ast.isLineInComment(vulnerability.location.line)) {
    return { isLikelyFalsePositive: true, reason: 'Code is in a comment', confidence: 0.95 };
  }

  // Check if in logging
  if (ast.isLineInLogging(vulnerability.location.line)) {
    return { isLikelyFalsePositive: true, reason: 'Code is a logging statement', confidence: 0.9 };
  }

  // Check if in test file
  if (ast.isLineInTestFile()) {
    return { isLikelyFalsePositive: true, reason: 'Code is in a test file', confidence: 0.85 };
  }

  // Check if sink is parameterized
  const sinks = ast.findDangerousSinks();
  const relevantSink = sinks.find(s => s.location.line === vulnerability.location.line);
  if (relevantSink?.isParameterized) {
    return { isLikelyFalsePositive: true, reason: 'Uses parameterized query', confidence: 0.95 };
  }

  // Check if sanitization exists
  if (relevantSink?.isSanitized) {
    return { isLikelyFalsePositive: true, reason: 'Input is sanitized before use', confidence: 0.8 };
  }

  // Check data flow
  const flows = ast.analyzeDataFlows();
  const relevantFlow = flows.find(f =>
    f.sink.location === `${vulnerability.location.file}:${vulnerability.location.line}`
  );

  if (relevantFlow?.sanitized) {
    return {
      isLikelyFalsePositive: true,
      reason: `Sanitized with ${relevantFlow.sanitizationMethod}`,
      confidence: 0.85
    };
  }

  // If tainted variable reaches dangerous sink without sanitization
  if (relevantFlow && !relevantFlow.sanitized) {
    return { isLikelyFalsePositive: false, confidence: 0.8 };
  }

  // Default: needs review
  return { isLikelyFalsePositive: false, confidence: 0.5 };
}
