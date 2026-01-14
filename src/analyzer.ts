import { Glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import type {
  FileInfo,
  CodeNode,
  CodeEdge,
  AnalysisResult,
  Language,
  Layer,
  ProjectStats,
  LayerInfo,
  ClassInfo,
  FunctionInfo,
  VariableInfo,
  ImportInfo,
  ExportInfo,
  ParameterInfo,
  CallInfo,
  VariableUsageInfo,
  AttributeInfo,
  MethodInfo,
  CallGraph,
  CallGraphNode,
  CallGraphEdge,
  DataFlow,
  CodeIssue,
  GranularityLevel,
  Visibility,
  NodeType
} from './types';

// Import language parsers
import { getParser, hasParser } from './analysis/parsers';

// =============================================================================
// ANALYSEUR PRINCIPAL
// =============================================================================

export class CodebaseAnalyzer {
  private basePath: string;
  private files: FileInfo[] = [];
  private nodes: CodeNode[] = [];
  private edges: CodeEdge[] = [];
  private issues: CodeIssue[] = [];
  private nodeIdCounter = 0;
  private edgeIdCounter = 0;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
  }

  async analyze(): Promise<AnalysisResult> {
    console.log(`\n📂 Analyzing codebase at: ${this.basePath}\n`);

    // Phase 1: Scanner tous les fichiers
    await this.scanFiles();

    // Phase 2: Construire les nœuds multi-niveaux
    this.buildMultiLevelNodes();

    // Phase 3: Analyser les relations
    this.analyzeRelationships();

    // Phase 4: Construire le call graph
    const callGraph = this.buildCallGraph();

    // Phase 5: Analyser le data flow
    const dataFlows = this.analyzeDataFlow();

    // Phase 6: Détecter les problèmes
    this.detectIssues();

    // Calculer les statistiques
    const stats = this.calculateStats();

    return {
      meta: {
        projectName: path.basename(this.basePath),
        analyzedAt: new Date(),
        version: '2.0.0',
        rootPath: this.basePath
      },
      stats,
      nodes: this.nodes,
      edges: this.edges,
      files: this.files,
      layers: this.getLayerDefinitions(),
      callGraph,
      dataFlows,
      issues: this.issues
    };
  }

  // ===========================================================================
  // PHASE 1: SCAN DES FICHIERS
  // ===========================================================================

  private async scanFiles(): Promise<void> {
    const patterns = [
      '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx',
      '**/*.rs', '**/*.py',
      '**/package.json', '**/Cargo.toml', '**/pyproject.toml'
    ];

    const ignorePatterns = [
      '**/node_modules/**', '**/target/**', '**/.git/**',
      '**/dist/**', '**/__pycache__/**', '**/venv/**',
      '**/.venv/**', '**/build/**', '**/*.min.js', '**/*.bundle.js'
    ];

    for (const pattern of patterns) {
      const glob = new Glob(pattern, {
        cwd: this.basePath,
        ignore: ignorePatterns,
        absolute: true
      });

      for await (const filePath of glob) {
        const fileInfo = await this.analyzeFile(filePath);
        if (fileInfo) {
          this.files.push(fileInfo);
        }
      }
    }

    console.log(`📄 Found ${this.files.length} source files`);
  }

  private async analyzeFile(filePath: string): Promise<FileInfo | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(this.basePath, filePath).replace(/\\/g, '/');
      const ext = path.extname(filePath);
      const language = this.detectLanguage(ext);
      const layer = this.detectLayer(relativePath);

      // Use language-specific parser if available
      const parser = getParser(language);

      let imports: ImportInfo[];
      let exports: ExportInfo[];
      let classes: ClassInfo[];
      let functions: FunctionInfo[];
      let variables: VariableInfo[];

      if (parser) {
        // Delegate to specialized parser
        imports = parser.extractImports(content);
        exports = parser.extractExports(content);
        classes = parser.extractClasses(content);
        functions = parser.extractFunctions(content);
        variables = parser.extractVariables(content);
      } else {
        // Fallback to inline extraction for unsupported languages
        imports = this.extractImportsDetailed(content, language);
        exports = this.extractExportsDetailed(content, language);
        classes = this.extractClassesDetailed(content, language);
        functions = this.extractFunctionsDetailed(content, language);
        variables = this.extractVariablesDetailed(content, language);
      }

      return {
        path: relativePath,
        name: path.basename(filePath),
        extension: ext,
        language,
        size: content.length,
        lineCount: content.split('\n').length,
        layer,
        imports,
        exports,
        classes,
        functions,
        variables
      };
    } catch {
      return null;
    }
  }

  private detectLanguage(ext: string): Language {
    const map: Record<string, Language> = {
      '.ts': 'typescript', '.tsx': 'typescript',
      '.js': 'javascript', '.jsx': 'javascript',
      '.rs': 'rust', '.py': 'python',
      '.yaml': 'yaml', '.yml': 'yaml',
      '.json': 'json', '.html': 'html',
      '.css': 'css', '.toml': 'toml'
    };
    return map[ext] || 'unknown';
  }

  private detectLayer(filePath: string): Layer {
    if (filePath.startsWith('src/') && !filePath.startsWith('src-tauri/')) {
      return 'frontend';
    } else if (filePath.startsWith('src-tauri/')) {
      return 'backend';
    } else if (filePath.startsWith('sidecar/')) {
      return 'sidecar';
    }
    return 'data';
  }

  // ===========================================================================
  // EXTRACTION DÉTAILLÉE DES IMPORTS
  // ===========================================================================

  private extractImportsDetailed(content: string, lang: Language): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const lines = content.split('\n');

    if (lang === 'typescript' || lang === 'javascript') {
      // ES imports: import { x, y } from 'module'
      const esImportRegex = /import\s+(?:(\*\s+as\s+\w+)|(?:\{([^}]+)\})|(\w+))?\s*(?:,\s*(?:\{([^}]+)\}|(\w+)))?\s*from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = esImportRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        const isWildcard = !!match[1];
        const namedImports = (match[2] || match[4] || '').split(',').map(s => s.trim().split(' as ')[0]).filter(Boolean);
        const defaultImport = match[3] || match[5] || '';

        imports.push({
          module: match[6],
          items: defaultImport ? [defaultImport, ...namedImports] : namedImports,
          isDefault: !!defaultImport,
          isWildcard,
          line
        });
      }

      // require imports
      const requireRegex = /(?:const|let|var)\s+(?:\{([^}]+)\}|(\w+))\s*=\s*require\(['"]([^'"]+)['"]\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        const items = match[1] ? match[1].split(',').map(s => s.trim()) : [match[2]];
        imports.push({
          module: match[3],
          items,
          isDefault: !!match[2],
          isWildcard: false,
          line
        });
      }
    } else if (lang === 'rust') {
      // use statements
      const useRegex = /use\s+((?:crate|super|self|[\w:]+)(?:::\{[^}]+\}|::\w+|::\*)?);/g;
      let match;
      while ((match = useRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        const fullPath = match[1];
        const items = fullPath.includes('{')
          ? fullPath.match(/\{([^}]+)\}/)?.[1].split(',').map(s => s.trim()) || []
          : [fullPath.split('::').pop() || ''];

        imports.push({
          module: fullPath.split('::').slice(0, -1).join('::') || fullPath,
          items,
          isDefault: false,
          isWildcard: fullPath.includes('*'),
          line
        });
      }

      // mod statements
      const modRegex = /mod\s+(\w+);/g;
      while ((match = modRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        imports.push({
          module: match[1],
          items: [match[1]],
          isDefault: false,
          isWildcard: false,
          line
        });
      }
    } else if (lang === 'python') {
      // from module import x, y
      const fromImportRegex = /from\s+([\w.]+)\s+import\s+([^#\n]+)/g;
      let match;
      while ((match = fromImportRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        const items = match[2].split(',').map(s => s.trim().split(' as ')[0]).filter(Boolean);
        imports.push({
          module: match[1],
          items,
          isDefault: false,
          isWildcard: items.includes('*'),
          line
        });
      }

      // import module
      const importRegex = /^import\s+([\w., ]+)/gm;
      while ((match = importRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        const modules = match[1].split(',').map(s => s.trim().split(' as ')[0]);
        for (const mod of modules) {
          imports.push({
            module: mod,
            items: [mod],
            isDefault: true,
            isWildcard: false,
            line
          });
        }
      }
    }

    return imports;
  }

  // ===========================================================================
  // EXTRACTION DÉTAILLÉE DES EXPORTS
  // ===========================================================================

  private extractExportsDetailed(content: string, lang: Language): ExportInfo[] {
    const exports: ExportInfo[] = [];

    if (lang === 'typescript' || lang === 'javascript') {
      // export const/let/var/function/class
      const namedExportRegex = /export\s+(const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
      let match;
      while ((match = namedExportRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        const type = match[1] === 'const' || match[1] === 'let' || match[1] === 'var' ? 'variable' :
                     match[1] === 'function' ? 'function' :
                     match[1] === 'class' ? 'class' : 'type';
        exports.push({ name: match[2], type, line });
      }

      // export default
      if (content.includes('export default')) {
        const defaultMatch = content.match(/export\s+default\s+(?:class\s+|function\s+)?(\w+)?/);
        const line = content.indexOf('export default');
        exports.push({
          name: defaultMatch?.[1] || 'default',
          type: 'default',
          line: content.substring(0, line).split('\n').length
        });
      }

      // export { x, y }
      const namedExportsRegex = /export\s+\{([^}]+)\}/g;
      while ((match = namedExportsRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        const items = match[1].split(',').map(s => s.trim().split(' as ')[0]);
        for (const item of items) {
          exports.push({ name: item, type: 'variable', line });
        }
      }
    } else if (lang === 'rust') {
      // pub items
      const pubRegex = /pub(?:\s*\([^)]+\))?\s+(fn|struct|enum|trait|type|const|static|mod)\s+(\w+)/g;
      let match;
      while ((match = pubRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        const type = match[1] === 'fn' ? 'function' :
                     match[1] === 'struct' || match[1] === 'enum' || match[1] === 'trait' ? 'class' : 'variable';
        exports.push({ name: match[2], type, line });
      }
    } else if (lang === 'python') {
      // __all__ definition
      const allMatch = content.match(/__all__\s*=\s*\[([^\]]+)\]/);
      if (allMatch) {
        const items = allMatch[1].matchAll(/['"](\w+)['"]/g);
        const line = content.indexOf('__all__');
        for (const match of items) {
          exports.push({
            name: match[1],
            type: 'variable',
            line: content.substring(0, line).split('\n').length
          });
        }
      }
    }

    return exports;
  }

  // ===========================================================================
  // EXTRACTION DÉTAILLÉE DES CLASSES (L4)
  // ===========================================================================

  private extractClassesDetailed(content: string, lang: Language): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const lines = content.split('\n');

    if (lang === 'typescript' || lang === 'javascript') {
      // Classes
      const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g;
      let match;
      while ((match = classRegex.exec(content)) !== null) {
        const startLine = content.substring(0, match.index).split('\n').length;
        const endLine = this.findBlockEnd(content, match.index);
        const classBody = content.substring(match.index, this.getPositionAtLine(content, endLine));

        classes.push({
          name: match[1],
          type: 'class',
          line: startLine,
          endLine,
          visibility: content.substring(Math.max(0, match.index - 20), match.index).includes('export') ? 'public' : 'private',
          extends: match[2],
          implements: match[3] ? match[3].split(',').map(s => s.trim()) : [],
          decorators: this.extractDecorators(content, match.index),
          attributes: this.extractClassAttributes(classBody, lang),
          methods: this.extractClassMethods(classBody, lang, match[1]),
          documentation: this.extractDocumentation(content, match.index)
        });
      }

      // Interfaces
      const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+([\w,\s]+))?/g;
      while ((match = interfaceRegex.exec(content)) !== null) {
        const startLine = content.substring(0, match.index).split('\n').length;
        const endLine = this.findBlockEnd(content, match.index);

        classes.push({
          name: match[1],
          type: 'interface',
          line: startLine,
          endLine,
          visibility: 'public',
          implements: match[2] ? match[2].split(',').map(s => s.trim()) : [],
          decorators: [],
          attributes: [],
          methods: [],
          documentation: this.extractDocumentation(content, match.index)
        });
      }

      // Type aliases
      const typeRegex = /(?:export\s+)?type\s+(\w+)(?:<[^>]+>)?\s*=/g;
      while ((match = typeRegex.exec(content)) !== null) {
        const startLine = content.substring(0, match.index).split('\n').length;
        classes.push({
          name: match[1],
          type: 'type_alias',
          line: startLine,
          endLine: startLine,
          visibility: 'public',
          implements: [],
          decorators: [],
          attributes: [],
          methods: []
        });
      }
    } else if (lang === 'rust') {
      // Structs
      const structRegex = /(?:pub(?:\s*\([^)]+\))?\s+)?struct\s+(\w+)(?:<[^>]+>)?/g;
      let match;
      while ((match = structRegex.exec(content)) !== null) {
        const startLine = content.substring(0, match.index).split('\n').length;
        const endLine = this.findBlockEnd(content, match.index);
        const structBody = content.substring(match.index, this.getPositionAtLine(content, endLine));

        classes.push({
          name: match[1],
          type: 'struct',
          line: startLine,
          endLine,
          visibility: match[0].includes('pub') ? 'public' : 'private',
          implements: [],
          decorators: this.extractRustAttributes(content, match.index),
          attributes: this.extractRustStructFields(structBody),
          methods: [],
          documentation: this.extractRustDocumentation(content, match.index)
        });
      }

      // Enums
      const enumRegex = /(?:pub(?:\s*\([^)]+\))?\s+)?enum\s+(\w+)(?:<[^>]+>)?/g;
      while ((match = enumRegex.exec(content)) !== null) {
        const startLine = content.substring(0, match.index).split('\n').length;
        const endLine = this.findBlockEnd(content, match.index);

        classes.push({
          name: match[1],
          type: 'enum',
          line: startLine,
          endLine,
          visibility: match[0].includes('pub') ? 'public' : 'private',
          implements: [],
          decorators: this.extractRustAttributes(content, match.index),
          attributes: [],
          methods: []
        });
      }

      // Traits
      const traitRegex = /(?:pub(?:\s*\([^)]+\))?\s+)?trait\s+(\w+)(?:<[^>]+>)?/g;
      while ((match = traitRegex.exec(content)) !== null) {
        const startLine = content.substring(0, match.index).split('\n').length;
        const endLine = this.findBlockEnd(content, match.index);

        classes.push({
          name: match[1],
          type: 'trait',
          line: startLine,
          endLine,
          visibility: match[0].includes('pub') ? 'public' : 'private',
          implements: [],
          decorators: [],
          attributes: [],
          methods: []
        });
      }
    } else if (lang === 'python') {
      // Python classes
      const classRegex = /class\s+(\w+)(?:\(([^)]*)\))?:/g;
      let match;
      while ((match = classRegex.exec(content)) !== null) {
        const startLine = content.substring(0, match.index).split('\n').length;
        const endLine = this.findPythonBlockEnd(content, match.index);
        const classBody = content.substring(match.index, this.getPositionAtLine(content, endLine));

        const bases = match[2] ? match[2].split(',').map(s => s.trim()) : [];
        const parentClass = bases[0] && bases[0] !== 'object' ? bases[0] : undefined;

        classes.push({
          name: match[1],
          type: 'class',
          line: startLine,
          endLine,
          visibility: match[1].startsWith('_') ? 'private' : 'public',
          extends: parentClass,
          implements: bases.slice(1),
          decorators: this.extractPythonDecorators(content, match.index),
          attributes: this.extractPythonAttributes(classBody),
          methods: this.extractPythonMethods(classBody, match[1]),
          documentation: this.extractPythonDocstring(content, match.index)
        });
      }
    }

    return classes;
  }

  // ===========================================================================
  // EXTRACTION DÉTAILLÉE DES FONCTIONS (L5)
  // ===========================================================================

  private extractFunctionsDetailed(content: string, lang: Language): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    if (lang === 'typescript' || lang === 'javascript') {
      // Function declarations
      const funcRegex = /(?:export\s+)?(?:async\s+)?function\s*(\*?)\s*(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/g;
      let match;
      while ((match = funcRegex.exec(content)) !== null) {
        const startLine = content.substring(0, match.index).split('\n').length;
        const endLine = this.findBlockEnd(content, match.index);
        const funcBody = content.substring(match.index, this.getPositionAtLine(content, endLine));

        functions.push({
          name: match[2],
          type: 'function',
          line: startLine,
          endLine,
          visibility: content.substring(Math.max(0, match.index - 20), match.index).includes('export') ? 'public' : 'private',
          isAsync: content.substring(Math.max(0, match.index - 20), match.index).includes('async'),
          isStatic: false,
          isGenerator: match[1] === '*',
          parameters: this.parseParameters(match[3], lang),
          returnType: match[4]?.trim(),
          decorators: this.extractDecorators(content, match.index),
          documentation: this.extractDocumentation(content, match.index),
          calls: this.extractFunctionCalls(funcBody),
          variableUsages: this.extractVariableUsages(funcBody),
          complexity: this.calculateComplexity(funcBody)
        });
      }

      // Arrow functions (const/let)
      const arrowRegex = /(?:export\s+)?(?:const|let)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s*)?\(?([^)]*)\)?\s*(?::\s*([^=]+))?\s*=>/g;
      while ((match = arrowRegex.exec(content)) !== null) {
        const startLine = content.substring(0, match.index).split('\n').length;
        const endLine = this.findArrowFunctionEnd(content, match.index);
        const funcBody = content.substring(match.index, this.getPositionAtLine(content, endLine));

        functions.push({
          name: match[1],
          type: 'arrow',
          line: startLine,
          endLine,
          visibility: content.substring(Math.max(0, match.index - 20), match.index).includes('export') ? 'public' : 'private',
          isAsync: content.substring(match.index, match.index + 100).includes('async'),
          isStatic: false,
          isGenerator: false,
          parameters: this.parseParameters(match[2], lang),
          returnType: match[3]?.trim(),
          decorators: [],
          calls: this.extractFunctionCalls(funcBody),
          variableUsages: this.extractVariableUsages(funcBody),
          complexity: this.calculateComplexity(funcBody)
        });
      }
    } else if (lang === 'rust') {
      // Rust functions
      const fnRegex = /(?:pub(?:\s*\([^)]+\))?\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?/g;
      let match;
      while ((match = fnRegex.exec(content)) !== null) {
        const startLine = content.substring(0, match.index).split('\n').length;
        const endLine = this.findBlockEnd(content, match.index);
        const funcBody = content.substring(match.index, this.getPositionAtLine(content, endLine));

        functions.push({
          name: match[1],
          type: 'function',
          line: startLine,
          endLine,
          visibility: match[0].includes('pub') ? 'public' : 'private',
          isAsync: match[0].includes('async'),
          isStatic: false,
          isGenerator: false,
          parameters: this.parseRustParameters(match[2]),
          returnType: match[3]?.trim(),
          decorators: this.extractRustAttributes(content, match.index),
          documentation: this.extractRustDocumentation(content, match.index),
          calls: this.extractRustFunctionCalls(funcBody),
          variableUsages: this.extractRustVariableUsages(funcBody),
          complexity: this.calculateComplexity(funcBody)
        });
      }
    } else if (lang === 'python') {
      // Python functions
      const defRegex = /(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/g;
      let match;
      while ((match = defRegex.exec(content)) !== null) {
        const startLine = content.substring(0, match.index).split('\n').length;
        const endLine = this.findPythonBlockEnd(content, match.index);
        const funcBody = content.substring(match.index, this.getPositionAtLine(content, endLine));

        functions.push({
          name: match[1],
          type: 'function',
          line: startLine,
          endLine,
          visibility: match[1].startsWith('_') ? 'private' : 'public',
          isAsync: content.substring(Math.max(0, match.index - 10), match.index).includes('async'),
          isStatic: false,
          isGenerator: funcBody.includes('yield'),
          parameters: this.parsePythonParameters(match[2]),
          returnType: match[3]?.trim(),
          decorators: this.extractPythonDecorators(content, match.index),
          documentation: this.extractPythonDocstring(content, match.index),
          calls: this.extractPythonFunctionCalls(funcBody),
          variableUsages: this.extractPythonVariableUsages(funcBody),
          complexity: this.calculateComplexity(funcBody)
        });
      }
    }

    return functions;
  }

  // ===========================================================================
  // EXTRACTION DÉTAILLÉE DES VARIABLES (L7)
  // ===========================================================================

  private extractVariablesDetailed(content: string, lang: Language): VariableInfo[] {
    const variables: VariableInfo[] = [];

    if (lang === 'typescript' || lang === 'javascript') {
      // const/let/var declarations at module level
      const varRegex = /(?:export\s+)?(const|let|var)\s+(\w+)(?:\s*:\s*([^=]+))?\s*=\s*([^;\n]+)/g;
      let match;
      while ((match = varRegex.exec(content)) !== null) {
        // Skip if inside function/class
        const before = content.substring(0, match.index);
        const openBraces = (before.match(/\{/g) || []).length;
        const closeBraces = (before.match(/\}/g) || []).length;

        // Only top-level variables (brace count should be low)
        if (openBraces - closeBraces <= 1) {
          const line = before.split('\n').length;
          variables.push({
            name: match[2],
            type: match[1] === 'const' ? 'constant' : 'variable',
            dataType: match[3]?.trim(),
            line,
            visibility: content.substring(Math.max(0, match.index - 20), match.index).includes('export') ? 'public' : 'private',
            isConst: match[1] === 'const',
            isMutable: match[1] !== 'const',
            scope: 'module',
            initialValue: this.sanitizeValue(match[4].trim()),
            usages: []
          });
        }
      }
    } else if (lang === 'rust') {
      // const and static
      const constRegex = /(?:pub(?:\s*\([^)]+\))?\s+)?(const|static(?:\s+mut)?)\s+(\w+)\s*:\s*([^=]+)\s*=\s*([^;]+)/g;
      let match;
      while ((match = constRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        const isConst = match[1] === 'const';
        variables.push({
          name: match[2],
          type: isConst ? 'constant' : 'variable',
          dataType: match[3]?.trim(),
          line,
          visibility: match[0].includes('pub') ? 'public' : 'private',
          isConst,
          isMutable: match[1].includes('mut'),
          scope: 'module',
          initialValue: this.sanitizeValue(match[4].trim()),
          usages: []
        });
      }
    } else if (lang === 'python') {
      // Module-level variables (all caps = constant convention)
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip lines inside functions/classes (indented)
        if (line.match(/^\s+/)) continue;

        const varMatch = line.match(/^(\w+)(?:\s*:\s*([^=]+))?\s*=\s*(.+)$/);
        if (varMatch && !line.startsWith('def ') && !line.startsWith('class ') && !line.startsWith('import ') && !line.startsWith('from ')) {
          const isConst = varMatch[1] === varMatch[1].toUpperCase();
          variables.push({
            name: varMatch[1],
            type: isConst ? 'constant' : 'variable',
            dataType: varMatch[2]?.trim(),
            line: i + 1,
            visibility: varMatch[1].startsWith('_') ? 'private' : 'public',
            isConst,
            isMutable: !isConst,
            scope: 'module',
            initialValue: this.sanitizeValue(varMatch[3].trim()),
            usages: []
          });
        }
      }
    }

    return variables;
  }

  // ===========================================================================
  // HELPERS: EXTRACTION DE PARTIES
  // ===========================================================================

  private extractDecorators(content: string, position: number): string[] {
    const decorators: string[] = [];
    const before = content.substring(Math.max(0, position - 500), position);
    const lines = before.split('\n').reverse();

    for (const line of lines) {
      const match = line.match(/@(\w+)(?:\([^)]*\))?/);
      if (match) {
        decorators.unshift(match[1]);
      } else if (line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
        break;
      }
    }
    return decorators;
  }

  private extractRustAttributes(content: string, position: number): string[] {
    const attributes: string[] = [];
    const before = content.substring(Math.max(0, position - 500), position);
    const matches = before.matchAll(/#\[([^\]]+)\]/g);
    for (const match of matches) {
      attributes.push(match[1]);
    }
    return attributes;
  }

  private extractPythonDecorators(content: string, position: number): string[] {
    const decorators: string[] = [];
    const before = content.substring(Math.max(0, position - 500), position);
    const lines = before.split('\n').reverse();

    for (const line of lines) {
      const match = line.match(/@(\w+(?:\.\w+)*)(?:\([^)]*\))?/);
      if (match) {
        decorators.unshift(match[1]);
      } else if (line.trim() && !line.trim().startsWith('#')) {
        break;
      }
    }
    return decorators;
  }

  private extractDocumentation(content: string, position: number): string | undefined {
    const before = content.substring(Math.max(0, position - 1000), position);
    // JSDoc style
    const jsdocMatch = before.match(/\/\*\*([^*]|\*(?!\/))*\*\/\s*$/);
    if (jsdocMatch) {
      return jsdocMatch[0].replace(/\/\*\*|\*\/|^\s*\*\s?/gm, '').trim();
    }
    return undefined;
  }

  private extractRustDocumentation(content: string, position: number): string | undefined {
    const before = content.substring(Math.max(0, position - 1000), position);
    const lines = before.split('\n').reverse();
    const docLines: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith('///')) {
        docLines.unshift(line.replace(/^\s*\/\/\/\s?/, ''));
      } else if (line.trim() && !line.trim().startsWith('#[')) {
        break;
      }
    }
    return docLines.length > 0 ? docLines.join('\n') : undefined;
  }

  private extractPythonDocstring(content: string, position: number): string | undefined {
    const after = content.substring(position);
    const match = after.match(/:\s*\n\s*(?:'''|""")([^]*?)(?:'''|""")/);
    return match ? match[1].trim() : undefined;
  }

  private extractClassAttributes(body: string, lang: Language): AttributeInfo[] {
    const attributes: AttributeInfo[] = [];

    if (lang === 'typescript' || lang === 'javascript') {
      // Class properties
      const propRegex = /(?:(private|public|protected)\s+)?(?:(static)\s+)?(?:(readonly)\s+)?(\w+)(?:\s*[?!]?)(?:\s*:\s*([^=;\n]+))?(?:\s*=\s*([^;\n]+))?;/g;
      let match;
      while ((match = propRegex.exec(body)) !== null) {
        const line = body.substring(0, match.index).split('\n').length;
        attributes.push({
          name: match[4],
          type: match[5]?.trim(),
          visibility: (match[1] || 'public') as Visibility,
          isStatic: !!match[2],
          isReadonly: !!match[3],
          defaultValue: match[6]?.trim(),
          line
        });
      }
    }

    return attributes;
  }

  private extractClassMethods(body: string, lang: Language, className: string): MethodInfo[] {
    const methods: MethodInfo[] = [];

    if (lang === 'typescript' || lang === 'javascript') {
      const methodRegex = /(?:(private|public|protected)\s+)?(?:(static)\s+)?(?:(async)\s+)?(?:(get|set)\s+)?(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/g;
      let match;
      while ((match = methodRegex.exec(body)) !== null) {
        const startLine = body.substring(0, match.index).split('\n').length;
        const endLine = this.findBlockEnd(body, match.index);
        const methodBody = body.substring(match.index, this.getPositionAtLine(body, endLine));

        methods.push({
          name: match[5],
          type: match[5] === 'constructor' ? 'constructor' : 'method',
          line: startLine,
          endLine,
          visibility: (match[1] || 'public') as Visibility,
          isAsync: !!match[3],
          isStatic: !!match[2],
          isGenerator: false,
          parameters: this.parseParameters(match[6], lang),
          returnType: match[7]?.trim(),
          decorators: [],
          calls: this.extractFunctionCalls(methodBody),
          variableUsages: this.extractVariableUsages(methodBody),
          complexity: this.calculateComplexity(methodBody),
          parentClass: className
        });
      }
    }

    return methods;
  }

  private extractRustStructFields(body: string): AttributeInfo[] {
    const attributes: AttributeInfo[] = [];
    const fieldRegex = /(?:pub(?:\s*\([^)]+\))?\s+)?(\w+)\s*:\s*([^,}]+)/g;
    let match;
    while ((match = fieldRegex.exec(body)) !== null) {
      const line = body.substring(0, match.index).split('\n').length;
      attributes.push({
        name: match[1],
        type: match[2].trim(),
        visibility: body.substring(Math.max(0, match.index - 10), match.index).includes('pub') ? 'public' : 'private',
        isStatic: false,
        isReadonly: false,
        line
      });
    }
    return attributes;
  }

  private extractPythonAttributes(body: string): AttributeInfo[] {
    const attributes: AttributeInfo[] = [];
    // self.x = y in __init__
    const attrRegex = /self\.(\w+)\s*(?::\s*([^=]+))?\s*=/g;
    let match;
    while ((match = attrRegex.exec(body)) !== null) {
      const line = body.substring(0, match.index).split('\n').length;
      attributes.push({
        name: match[1],
        type: match[2]?.trim(),
        visibility: match[1].startsWith('_') ? 'private' : 'public',
        isStatic: false,
        isReadonly: false,
        line
      });
    }
    return attributes;
  }

  private extractPythonMethods(body: string, className: string): MethodInfo[] {
    const methods: MethodInfo[] = [];
    const defRegex = /(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/g;
    let match;
    while ((match = defRegex.exec(body)) !== null) {
      const startLine = body.substring(0, match.index).split('\n').length;
      const endLine = this.findPythonBlockEnd(body, match.index);
      const methodBody = body.substring(match.index, this.getPositionAtLine(body, endLine));

      methods.push({
        name: match[1],
        type: match[1] === '__init__' ? 'constructor' : 'method',
        line: startLine,
        endLine,
        visibility: match[1].startsWith('_') && !match[1].startsWith('__') ? 'private' : 'public',
        isAsync: body.substring(Math.max(0, match.index - 10), match.index).includes('async'),
        isStatic: false, // Would need decorator check
        isGenerator: methodBody.includes('yield'),
        parameters: this.parsePythonParameters(match[2]),
        returnType: match[3]?.trim(),
        decorators: this.extractPythonDecorators(body, match.index),
        calls: this.extractPythonFunctionCalls(methodBody),
        variableUsages: this.extractPythonVariableUsages(methodBody),
        complexity: this.calculateComplexity(methodBody),
        parentClass: className
      });
    }
    return methods;
  }

  // ===========================================================================
  // HELPERS: PARAMÈTRES
  // ===========================================================================

  private parseParameters(params: string, lang: Language): ParameterInfo[] {
    if (!params.trim()) return [];

    const result: ParameterInfo[] = [];
    const parts = this.splitParameters(params);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (lang === 'typescript' || lang === 'javascript') {
        const match = trimmed.match(/(?:\.\.\.)?(\w+)(?:\s*\??)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?/);
        if (match) {
          result.push({
            name: match[1],
            type: match[2]?.trim(),
            defaultValue: match[3]?.trim(),
            isOptional: trimmed.includes('?') || !!match[3],
            isRest: trimmed.startsWith('...')
          });
        }
      }
    }

    return result;
  }

  private parseRustParameters(params: string): ParameterInfo[] {
    if (!params.trim()) return [];

    const result: ParameterInfo[] = [];
    const parts = this.splitParameters(params);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed || trimmed === 'self' || trimmed === '&self' || trimmed === '&mut self') continue;

      const match = trimmed.match(/(?:mut\s+)?(\w+)\s*:\s*(.+)/);
      if (match) {
        result.push({
          name: match[1],
          type: match[2].trim(),
          isOptional: match[2].includes('Option<'),
          isRest: false
        });
      }
    }

    return result;
  }

  private parsePythonParameters(params: string): ParameterInfo[] {
    if (!params.trim()) return [];

    const result: ParameterInfo[] = [];
    const parts = this.splitParameters(params);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed || trimmed === 'self' || trimmed === 'cls') continue;

      const match = trimmed.match(/(?:\*\*?)?(\w+)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?/);
      if (match) {
        result.push({
          name: match[1],
          type: match[2]?.trim(),
          defaultValue: match[3]?.trim(),
          isOptional: !!match[3],
          isRest: trimmed.startsWith('*')
        });
      }
    }

    return result;
  }

  private splitParameters(params: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;

    for (const char of params) {
      if (char === '(' || char === '<' || char === '[' || char === '{') depth++;
      else if (char === ')' || char === '>' || char === ']' || char === '}') depth--;
      else if (char === ',' && depth === 0) {
        result.push(current);
        current = '';
        continue;
      }
      current += char;
    }
    if (current) result.push(current);

    return result;
  }

  // ===========================================================================
  // HELPERS: APPELS DE FONCTION
  // ===========================================================================

  private extractFunctionCalls(body: string): CallInfo[] {
    const calls: CallInfo[] = [];
    const callRegex = /(?:await\s+)?(\w+(?:\.\w+)*)\s*\(/g;
    let match;

    while ((match = callRegex.exec(body)) !== null) {
      const funcName = match[1];
      // Skip keywords
      if (['if', 'while', 'for', 'switch', 'catch', 'function', 'return', 'throw'].includes(funcName)) continue;

      const line = body.substring(0, match.index).split('\n').length;
      calls.push({
        target: funcName,
        line,
        arguments: [],
        isAwait: body.substring(Math.max(0, match.index - 10), match.index).includes('await'),
        isChained: funcName.includes('.')
      });
    }

    return calls;
  }

  private extractRustFunctionCalls(body: string): CallInfo[] {
    const calls: CallInfo[] = [];
    const callRegex = /(?:(\w+)::)?(\w+(?:::\w+)*)\s*\(/g;
    let match;

    while ((match = callRegex.exec(body)) !== null) {
      const funcName = match[2];
      if (['if', 'while', 'for', 'match', 'loop', 'fn', 'let', 'const'].includes(funcName)) continue;

      const line = body.substring(0, match.index).split('\n').length;
      calls.push({
        target: match[1] ? `${match[1]}::${funcName}` : funcName,
        line,
        arguments: [],
        isAwait: body.substring(match.index, match.index + 100).includes('.await'),
        isChained: funcName.includes('::')
      });
    }

    return calls;
  }

  private extractPythonFunctionCalls(body: string): CallInfo[] {
    const calls: CallInfo[] = [];
    const callRegex = /(?:await\s+)?(\w+(?:\.\w+)*)\s*\(/g;
    let match;

    while ((match = callRegex.exec(body)) !== null) {
      const funcName = match[1];
      if (['if', 'while', 'for', 'with', 'def', 'class', 'return', 'raise', 'except'].includes(funcName)) continue;

      const line = body.substring(0, match.index).split('\n').length;
      calls.push({
        target: funcName,
        line,
        arguments: [],
        isAwait: body.substring(Math.max(0, match.index - 10), match.index).includes('await'),
        isChained: funcName.includes('.')
      });
    }

    return calls;
  }

  // ===========================================================================
  // HELPERS: USAGES DE VARIABLES
  // ===========================================================================

  private extractVariableUsages(body: string): VariableUsageInfo[] {
    const usages: VariableUsageInfo[] = [];
    // Simplified: just track identifiers that look like variable reads/writes
    const assignRegex = /(\w+)\s*[+\-*\/]?=/g;
    let match;

    while ((match = assignRegex.exec(body)) !== null) {
      if (['const', 'let', 'var', 'function', 'class', 'if', 'while', 'for'].includes(match[1])) continue;

      const line = body.substring(0, match.index).split('\n').length;
      usages.push({
        name: match[1],
        line,
        operation: 'write',
        scope: 'local'
      });
    }

    return usages;
  }

  private extractRustVariableUsages(body: string): VariableUsageInfo[] {
    return this.extractVariableUsages(body);
  }

  private extractPythonVariableUsages(body: string): VariableUsageInfo[] {
    return this.extractVariableUsages(body);
  }

  // ===========================================================================
  // HELPERS: COMPLEXITÉ
  // ===========================================================================

  private calculateComplexity(body: string): number {
    let complexity = 1; // Base complexity

    // Count decision points
    const patterns = [
      /\bif\b/g, /\belse\s+if\b/g, /\belif\b/g,
      /\bfor\b/g, /\bwhile\b/g, /\bdo\b/g,
      /\bcase\b/g, /\bcatch\b/g, /\bexcept\b/g,
      /\?\?/g, /\?\.?/g, // Nullish coalescing, optional chaining
      /&&/g, /\|\|/g, // Logical operators
      /\bmatch\b/g // Rust match
    ];

    for (const pattern of patterns) {
      const matches = body.match(pattern);
      if (matches) complexity += matches.length;
    }

    return complexity;
  }

  // ===========================================================================
  // HELPERS: POSITIONS ET BLOCS
  // ===========================================================================

  private findBlockEnd(content: string, startPos: number): number {
    let braceCount = 0;
    let started = false;
    let line = content.substring(0, startPos).split('\n').length;

    for (let i = startPos; i < content.length; i++) {
      const char = content[i];
      if (char === '\n') line++;
      if (char === '{') {
        braceCount++;
        started = true;
      } else if (char === '}') {
        braceCount--;
        if (started && braceCount === 0) return line;
      }
    }

    return line;
  }

  private findArrowFunctionEnd(content: string, startPos: number): number {
    // Find the arrow first
    const arrowPos = content.indexOf('=>', startPos);
    if (arrowPos === -1) return content.substring(0, startPos).split('\n').length;

    // Check if it's a block body or expression body
    const afterArrow = content.substring(arrowPos + 2).trimStart();
    if (afterArrow.startsWith('{')) {
      return this.findBlockEnd(content, arrowPos);
    } else {
      // Expression body - find the end of expression
      let depth = 0;
      let line = content.substring(0, arrowPos).split('\n').length;
      for (let i = arrowPos + 2; i < content.length; i++) {
        const char = content[i];
        if (char === '\n') line++;
        if (char === '(' || char === '[' || char === '{') depth++;
        else if (char === ')' || char === ']' || char === '}') depth--;
        else if ((char === ';' || char === ',') && depth === 0) return line;
      }
      return line;
    }
  }

  private findPythonBlockEnd(content: string, startPos: number): number {
    const lines = content.split('\n');
    const startLine = content.substring(0, startPos).split('\n').length - 1;

    // Find the indentation of the definition line
    const defLine = lines[startLine];
    const baseIndent = defLine.match(/^(\s*)/)?.[1].length || 0;

    // Find where the block ends (next line with same or less indentation that's not empty/comment)
    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim() || line.trim().startsWith('#')) continue;

      const currentIndent = line.match(/^(\s*)/)?.[1].length || 0;
      if (currentIndent <= baseIndent) {
        return i;
      }
    }

    return lines.length;
  }

  private getPositionAtLine(content: string, lineNum: number): number {
    const lines = content.split('\n');
    let pos = 0;
    for (let i = 0; i < lineNum && i < lines.length; i++) {
      pos += lines[i].length + 1;
    }
    return pos;
  }

  private sanitizeValue(value: string): string {
    // Remove potentially sensitive values
    const sensitivePatterns = [/api[_-]?key/i, /secret/i, /password/i, /token/i, /credential/i];
    for (const pattern of sensitivePatterns) {
      if (pattern.test(value)) return '[REDACTED]';
    }
    // Truncate long values
    if (value.length > 100) return value.substring(0, 100) + '...';
    return value;
  }

  // ===========================================================================
  // PHASE 2: CONSTRUCTION DES NŒUDS MULTI-NIVEAUX
  // ===========================================================================

  private buildMultiLevelNodes(): void {
    // L1: System node
    const systemNode = this.createNode('L1', 'system', this.basePath, path.basename(this.basePath));
    this.nodes.push(systemNode);

    // L2: Module nodes (directories)
    const modules = new Map<string, CodeNode>();
    for (const file of this.files) {
      const parts = file.path.split('/');
      if (parts.length > 1) {
        const modulePath = parts[0];
        if (!modules.has(modulePath)) {
          const moduleNode = this.createNode('L2', 'module', modulePath, modulePath);
          moduleNode.parent = systemNode.id;
          moduleNode.layer = file.layer;
          modules.set(modulePath, moduleNode);
          this.nodes.push(moduleNode);
          systemNode.children.push(moduleNode.id);
        }
      }
    }

    // L3-L7: File and deeper nodes
    for (const file of this.files) {
      // L3: File node
      const fileNode = this.createNode('L3', 'file', file.path, file.name);
      fileNode.location = { file: file.path, line: 1 };
      fileNode.layer = file.layer;
      fileNode.metrics.loc = file.lineCount;

      // Link to parent module
      const modulePath = file.path.split('/')[0];
      const parentModule = modules.get(modulePath);
      if (parentModule) {
        fileNode.parent = parentModule.id;
        parentModule.children.push(fileNode.id);
      } else {
        fileNode.parent = systemNode.id;
        systemNode.children.push(fileNode.id);
      }

      this.nodes.push(fileNode);

      // L4: Classes
      for (const cls of file.classes) {
        const classNode = this.createNode('L4', cls.type as NodeType, `${file.path}::${cls.name}`, cls.name);
        classNode.location = { file: file.path, line: cls.line, endLine: cls.endLine };
        classNode.visibility = cls.visibility;
        classNode.parent = fileNode.id;
        classNode.documentation = cls.documentation;
        classNode.metrics.loc = cls.endLine - cls.line + 1;
        fileNode.children.push(classNode.id);
        this.nodes.push(classNode);

        // L7: Attributes
        for (const attr of cls.attributes) {
          const attrNode = this.createNode('L7', 'attribute', `${file.path}::${cls.name}::${attr.name}`, attr.name);
          attrNode.location = { file: file.path, line: cls.line + attr.line };
          attrNode.visibility = attr.visibility;
          attrNode.dataType = attr.type;
          attrNode.modifiers = [];
          if (attr.isStatic) attrNode.modifiers.push('static');
          if (attr.isReadonly) attrNode.modifiers.push('readonly');
          attrNode.parent = classNode.id;
          classNode.children.push(attrNode.id);
          this.nodes.push(attrNode);
        }

        // L5: Methods
        for (const method of cls.methods) {
          const methodNode = this.createNode('L5', method.type as NodeType, `${file.path}::${cls.name}::${method.name}`, method.name);
          methodNode.location = { file: file.path, line: cls.line + method.line - 1, endLine: cls.line + method.endLine - 1 };
          methodNode.visibility = method.visibility;
          methodNode.signature = this.buildSignature(method);
          methodNode.modifiers = [];
          if (method.isAsync) methodNode.modifiers.push('async');
          if (method.isStatic) methodNode.modifiers.push('static');
          methodNode.metrics.complexity = method.complexity;
          methodNode.metrics.loc = method.endLine - method.line + 1;
          methodNode.parent = classNode.id;
          classNode.children.push(methodNode.id);
          this.nodes.push(methodNode);

          // L7: Parameters
          for (const param of method.parameters) {
            const paramNode = this.createNode('L7', 'parameter', `${file.path}::${cls.name}::${method.name}::${param.name}`, param.name);
            paramNode.location = { file: file.path, line: cls.line + method.line - 1 };
            paramNode.dataType = param.type;
            paramNode.parent = methodNode.id;
            methodNode.children.push(paramNode.id);
            this.nodes.push(paramNode);
          }
        }
      }

      // L5: Standalone functions
      for (const func of file.functions) {
        if (func.parentClass) continue; // Skip methods

        const funcNode = this.createNode('L5', func.type as NodeType, `${file.path}::${func.name}`, func.name);
        funcNode.location = { file: file.path, line: func.line, endLine: func.endLine };
        funcNode.visibility = func.visibility;
        funcNode.signature = this.buildSignature(func);
        funcNode.modifiers = [];
        if (func.isAsync) funcNode.modifiers.push('async');
        if (func.isGenerator) funcNode.modifiers.push('generator');
        funcNode.metrics.complexity = func.complexity;
        funcNode.metrics.loc = func.endLine - func.line + 1;
        funcNode.parent = fileNode.id;
        fileNode.children.push(funcNode.id);
        this.nodes.push(funcNode);

        // L7: Parameters
        for (const param of func.parameters) {
          const paramNode = this.createNode('L7', 'parameter', `${file.path}::${func.name}::${param.name}`, param.name);
          paramNode.location = { file: file.path, line: func.line };
          paramNode.dataType = param.type;
          paramNode.parent = funcNode.id;
          funcNode.children.push(paramNode.id);
          this.nodes.push(paramNode);
        }
      }

      // L7: Module-level variables
      for (const variable of file.variables) {
        const varNode = this.createNode('L7', variable.type as NodeType, `${file.path}::${variable.name}`, variable.name);
        varNode.location = { file: file.path, line: variable.line };
        varNode.visibility = variable.visibility;
        varNode.dataType = variable.dataType;
        varNode.initialValue = variable.initialValue;
        varNode.modifiers = [];
        if (variable.isConst) varNode.modifiers.push('const');
        if (variable.isMutable) varNode.modifiers.push('mut');
        varNode.parent = fileNode.id;
        fileNode.children.push(varNode.id);
        this.nodes.push(varNode);
      }
    }

    console.log(`🧩 Built ${this.nodes.length} nodes across all levels`);
  }

  private createNode(level: GranularityLevel, type: NodeType, fullPath: string, name: string): CodeNode {
    return {
      id: `node-${++this.nodeIdCounter}`,
      level,
      type,
      name,
      fullPath,
      location: { file: '', line: 0 },
      visibility: 'public',
      modifiers: [],
      metrics: {
        loc: 0,
        dependencies: 0,
        dependents: 0
      },
      children: []
    };
  }

  private buildSignature(func: FunctionInfo): string {
    const params = func.parameters.map(p => {
      let sig = p.name;
      if (p.type) sig += `: ${p.type}`;
      if (p.isOptional) sig += '?';
      return sig;
    }).join(', ');

    let sig = `${func.name}(${params})`;
    if (func.returnType) sig += `: ${func.returnType}`;
    return sig;
  }

  // ===========================================================================
  // PHASE 3: ANALYSE DES RELATIONS
  // ===========================================================================

  private analyzeRelationships(): void {
    // Import relationships
    for (const file of this.files) {
      const sourceFileNode = this.nodes.find(n => n.type === 'file' && n.location.file === file.path);
      if (!sourceFileNode) continue;

      for (const imp of file.imports) {
        // Try to find target file
        const targetPath = this.resolveImportPath(file.path, imp.module);
        const targetFileNode = this.nodes.find(n => n.type === 'file' && n.location.file === targetPath);

        if (targetFileNode) {
          this.addEdge(sourceFileNode.id, targetFileNode.id, 'imports', {
            file: file.path,
            line: imp.line
          });
        }
      }
    }

    // Function call relationships
    for (const file of this.files) {
      for (const func of file.functions) {
        const funcNode = this.nodes.find(n =>
          (n.type === 'function' || n.type === 'method' || n.type === 'arrow') &&
          n.fullPath === `${file.path}::${func.name}`
        );
        if (!funcNode) continue;

        for (const call of func.calls) {
          // Try to find target function
          const targetNode = this.nodes.find(n =>
            (n.type === 'function' || n.type === 'method' || n.type === 'arrow') &&
            n.name === call.target.split('.').pop()
          );

          if (targetNode) {
            this.addEdge(funcNode.id, targetNode.id, call.isAwait ? 'awaits' : 'calls', {
              file: file.path,
              line: func.line + call.line - 1
            });
          }
        }
      }
    }

    // Class hierarchy relationships
    for (const file of this.files) {
      for (const cls of file.classes) {
        const classNode = this.nodes.find(n =>
          n.level === 'L4' && n.fullPath === `${file.path}::${cls.name}`
        );
        if (!classNode) continue;

        // Extends
        if (cls.extends) {
          const parentNode = this.nodes.find(n => n.level === 'L4' && n.name === cls.extends);
          if (parentNode) {
            this.addEdge(classNode.id, parentNode.id, 'extends');
          }
        }

        // Implements
        for (const impl of cls.implements) {
          const interfaceNode = this.nodes.find(n => n.level === 'L4' && n.name === impl);
          if (interfaceNode) {
            this.addEdge(classNode.id, interfaceNode.id, 'implements');
          }
        }
      }
    }

    // Containment relationships (already handled via parent/children)
    // Add explicit edges for visualization
    for (const node of this.nodes) {
      if (node.parent) {
        this.addEdge(node.parent, node.id, 'contains');
      }
    }

    console.log(`🔗 Identified ${this.edges.length} relationships`);
  }

  private addEdge(source: string, target: string, type: CodeEdge['type'], location?: { file: string; line: number }): void {
    // Avoid duplicates
    const exists = this.edges.some(e => e.source === source && e.target === target && e.type === type);
    if (exists) return;

    this.edges.push({
      id: `edge-${++this.edgeIdCounter}`,
      source,
      target,
      type,
      location
    });

    // Update metrics
    const sourceNode = this.nodes.find(n => n.id === source);
    const targetNode = this.nodes.find(n => n.id === target);
    if (sourceNode) sourceNode.metrics.dependencies++;
    if (targetNode) targetNode.metrics.dependents++;
  }

  private resolveImportPath(currentFile: string, importPath: string): string {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const currentDir = path.dirname(currentFile);
      let resolved = path.join(currentDir, importPath).replace(/\\/g, '/');

      // Try common extensions
      for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.rs', '.py', '/index.ts', '/index.js']) {
        const candidate = resolved + ext;
        if (this.files.some(f => f.path === candidate)) {
          return candidate;
        }
      }
      return resolved;
    }

    // Handle package imports - try to find matching file
    const parts = importPath.split('/');
    for (const file of this.files) {
      if (file.path.includes(parts[parts.length - 1])) {
        return file.path;
      }
    }

    return importPath;
  }

  // ===========================================================================
  // PHASE 4: CALL GRAPH
  // ===========================================================================

  private buildCallGraph(): CallGraph {
    const nodes: CallGraphNode[] = [];
    const edges: CallGraphEdge[] = [];
    const nodeMap = new Map<string, CallGraphNode>();

    // Build call graph nodes from function nodes
    for (const node of this.nodes) {
      if (node.type === 'function' || node.type === 'method' || node.type === 'arrow') {
        const cgNode: CallGraphNode = {
          id: node.id,
          name: node.name,
          file: node.location.file,
          line: node.location.line,
          isEntryPoint: false,
          isTerminal: true,
          depth: 0
        };
        nodes.push(cgNode);
        nodeMap.set(node.id, cgNode);
      }
    }

    // Build edges from call relationships
    for (const edge of this.edges) {
      if (edge.type === 'calls' || edge.type === 'awaits') {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);

        if (sourceNode && targetNode) {
          edges.push({
            source: edge.source,
            target: edge.target,
            callSites: edge.location ? [edge.location.line] : [],
            isAsync: edge.type === 'awaits'
          });

          targetNode.isTerminal = false;
        }
      }
    }

    // Identify entry points (functions not called by anything)
    const calledFunctions = new Set(edges.map(e => e.target));
    for (const node of nodes) {
      if (!calledFunctions.has(node.id)) {
        node.isEntryPoint = true;
      }
    }

    // Calculate depths (BFS from entry points)
    const visited = new Set<string>();
    const queue: { id: string; depth: number }[] = [];

    for (const node of nodes) {
      if (node.isEntryPoint) {
        queue.push({ id: node.id, depth: 0 });
      }
    }

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const node = nodeMap.get(id);
      if (node) {
        node.depth = Math.max(node.depth, depth);
      }

      for (const edge of edges) {
        if (edge.source === id && !visited.has(edge.target)) {
          queue.push({ id: edge.target, depth: depth + 1 });
        }
      }
    }

    return { nodes, edges };
  }

  // ===========================================================================
  // PHASE 5: DATA FLOW
  // ===========================================================================

  private analyzeDataFlow(): DataFlow[] {
    const dataFlows: DataFlow[] = [];

    // Analyze module-level variables
    for (const file of this.files) {
      for (const variable of file.variables) {
        const flow: DataFlow = {
          variable: variable.name,
          defined: { file: file.path, line: variable.line },
          flowsTo: [],
          transformedBy: []
        };

        // Find usages in functions
        for (const otherFile of this.files) {
          for (const func of otherFile.functions) {
            for (const usage of func.variableUsages) {
              if (usage.name === variable.name) {
                flow.flowsTo.push({
                  file: otherFile.path,
                  line: func.line + usage.line - 1,
                  usage: usage.operation === 'write' ? 'reassignment' : 'parameter',
                  context: func.name
                });
              }
            }
          }
        }

        if (flow.flowsTo.length > 0 || variable.scope === 'global') {
          dataFlows.push(flow);
        }
      }
    }

    return dataFlows;
  }

  // ===========================================================================
  // PHASE 6: DÉTECTION DE PROBLÈMES
  // ===========================================================================

  private detectIssues(): void {
    // Detect unused functions
    const calledFunctions = new Set<string>();
    for (const edge of this.edges) {
      if (edge.type === 'calls' || edge.type === 'awaits') {
        calledFunctions.add(edge.target);
      }
    }

    for (const node of this.nodes) {
      if ((node.type === 'function' || node.type === 'method') &&
          !calledFunctions.has(node.id) &&
          node.visibility === 'private') {
        this.issues.push({
          id: `issue-${this.issues.length + 1}`,
          type: 'unused_function',
          severity: 'warning',
          location: node.location,
          message: `Function '${node.name}' is never called`,
          suggestion: 'Consider removing this function or making it public if intended for external use',
          relatedNodes: [node.id]
        });
      }
    }

    // Detect high complexity
    for (const node of this.nodes) {
      if ((node.type === 'function' || node.type === 'method') &&
          node.metrics.complexity && node.metrics.complexity > 10) {
        this.issues.push({
          id: `issue-${this.issues.length + 1}`,
          type: 'high_complexity',
          severity: node.metrics.complexity > 20 ? 'error' : 'warning',
          location: node.location,
          message: `Function '${node.name}' has high cyclomatic complexity (${node.metrics.complexity})`,
          suggestion: 'Consider breaking this function into smaller, more focused functions',
          relatedNodes: [node.id]
        });
      }
    }

    // Detect long methods
    for (const node of this.nodes) {
      if ((node.type === 'function' || node.type === 'method') &&
          node.metrics.loc > 50) {
        this.issues.push({
          id: `issue-${this.issues.length + 1}`,
          type: 'long_method',
          severity: node.metrics.loc > 100 ? 'warning' : 'info',
          location: node.location,
          message: `Function '${node.name}' is ${node.metrics.loc} lines long`,
          suggestion: 'Consider refactoring into smaller functions',
          relatedNodes: [node.id]
        });
      }
    }

    // Detect god classes
    for (const node of this.nodes) {
      if (node.type === 'class' && node.children.length > 20) {
        this.issues.push({
          id: `issue-${this.issues.length + 1}`,
          type: 'god_class',
          severity: 'warning',
          location: node.location,
          message: `Class '${node.name}' has ${node.children.length} members`,
          suggestion: 'Consider splitting this class into smaller, more focused classes',
          relatedNodes: [node.id]
        });
      }
    }

    // Detect circular dependencies at module level
    this.detectCircularDependencies();

    console.log(`⚠️  Detected ${this.issues.length} potential issues`);
  }

  private detectCircularDependencies(): void {
    const moduleNodes = this.nodes.filter(n => n.level === 'L2');
    const graph = new Map<string, string[]>();

    // Build dependency graph
    for (const edge of this.edges) {
      if (edge.type === 'imports') {
        const sourceNode = this.nodes.find(n => n.id === edge.source);
        const targetNode = this.nodes.find(n => n.id === edge.target);

        if (sourceNode && targetNode) {
          const sourceModule = sourceNode.parent || sourceNode.id;
          const targetModule = targetNode.parent || targetNode.id;

          if (sourceModule !== targetModule) {
            if (!graph.has(sourceModule)) graph.set(sourceModule, []);
            graph.get(sourceModule)!.push(targetModule);
          }
        }
      }
    }

    // DFS to find cycles
    const visited = new Set<string>();
    const stack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (node: string, path: string[]): void => {
      if (stack.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart));
        return;
      }
      if (visited.has(node)) return;

      visited.add(node);
      stack.add(node);
      path.push(node);

      for (const neighbor of graph.get(node) || []) {
        dfs(neighbor, [...path]);
      }

      stack.delete(node);
    };

    for (const [node] of graph) {
      dfs(node, []);
    }

    for (const cycle of cycles) {
      const nodeNames = cycle.map(id => {
        const node = this.nodes.find(n => n.id === id);
        return node?.name || id;
      });

      this.issues.push({
        id: `issue-${this.issues.length + 1}`,
        type: 'circular_dependency',
        severity: 'error',
        location: { file: '', line: 0 },
        message: `Circular dependency detected: ${nodeNames.join(' -> ')}`,
        suggestion: 'Consider refactoring to break the circular dependency',
        relatedNodes: cycle
      });
    }
  }

  // ===========================================================================
  // STATISTIQUES
  // ===========================================================================

  private calculateStats(): ProjectStats {
    const byLanguage: Record<Language, number> = {
      typescript: 0, javascript: 0, rust: 0, python: 0,
      yaml: 0, json: 0, html: 0, css: 0, toml: 0, unknown: 0
    };

    const byLayer: Record<Layer, number> = {
      frontend: 0, backend: 0, sidecar: 0, data: 0, external: 0
    };

    const byLevel: Record<GranularityLevel, number> = {
      L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, L6: 0, L7: 0
    };

    let totalLines = 0;
    let totalClasses = 0;
    let totalFunctions = 0;
    let totalVariables = 0;
    let totalComplexity = 0;
    let maxComplexity = 0;
    let complexityCount = 0;

    for (const file of this.files) {
      byLanguage[file.language]++;
      byLayer[file.layer]++;
      totalLines += file.lineCount;
      totalClasses += file.classes.length;
      totalFunctions += file.functions.length;
      totalVariables += file.variables.length;
    }

    for (const node of this.nodes) {
      byLevel[node.level]++;
      if (node.metrics.complexity) {
        totalComplexity += node.metrics.complexity;
        maxComplexity = Math.max(maxComplexity, node.metrics.complexity);
        complexityCount++;
      }
    }

    return {
      totalFiles: this.files.length,
      totalLines,
      totalClasses,
      totalFunctions,
      totalVariables,
      byLanguage,
      byLayer,
      byLevel,
      avgComplexity: complexityCount > 0 ? totalComplexity / complexityCount : 0,
      maxComplexity
    };
  }

  private getLayerDefinitions(): LayerInfo[] {
    return [
      { id: 'frontend', label: 'Frontend (React)', color: '#2196F3', description: 'Interface utilisateur React avec Tauri WebView' },
      { id: 'backend', label: 'Backend (Rust)', color: '#FF9800', description: 'Logique métier Tauri, Risk Engine, IBKR Client' },
      { id: 'sidecar', label: 'Sidecar (Python)', color: '#4CAF50', description: 'Services LLM, agrégation de données market' },
      { id: 'data', label: 'Data Layer', color: '#9C27B0', description: 'SQLite local, PostgreSQL cloud (optionnel)' },
      { id: 'external', label: 'External Services', color: '#607D8B', description: 'APIs externes: LLMs, Market Data, IBKR' }
    ];
  }
}
