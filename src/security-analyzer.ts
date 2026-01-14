// =============================================================================
// ANALYSEUR DE SÉCURITÉ ADVERSARIAL
// Détection de vulnérabilités OWASP, secrets, injections, et patterns dangereux
// =============================================================================

import type { FileInfo, Language } from './types';

// =============================================================================
// TYPES DE VULNÉRABILITÉS
// =============================================================================

export type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type VulnerabilityCategory =
  | 'injection'           // SQL, Command, Code, LDAP, XPath, Template
  | 'authentication'      // Weak auth, hardcoded creds, session issues
  | 'cryptography'        // Weak crypto, hardcoded keys, insecure random
  | 'data_exposure'       // Sensitive data leaks, PII exposure
  | 'access_control'      // IDOR, privilege escalation, missing auth
  | 'security_misconfig'  // Debug mode, default creds, exposed endpoints
  | 'xss'                 // Cross-site scripting
  | 'deserialization'     // Insecure deserialization
  | 'dependency'          // Known vulnerable dependencies
  | 'race_condition'      // TOCTOU, concurrent access issues
  | 'memory_safety'       // Buffer overflow, use-after-free (Rust unsafe)
  | 'path_traversal'      // Directory traversal, file inclusion
  | 'ssrf'                // Server-side request forgery
  | 'dos'                 // Denial of service, resource exhaustion
  | 'logging'             // Sensitive data in logs
  | 'error_handling'      // Information disclosure via errors
  | 'secrets'             // Hardcoded secrets, API keys, tokens
  | 'unsafe_code';        // Rust unsafe blocks, eval, exec

export interface SecurityVulnerability {
  id: string;
  category: VulnerabilityCategory;
  severity: VulnerabilitySeverity;
  title: string;
  description: string;
  location: {
    file: string;
    line: number;
    endLine?: number;
    column?: number;
    snippet?: string;
  };
  cwe?: string;           // CWE ID
  owasp?: string;         // OWASP Top 10 reference
  cvss?: number;          // CVSS score estimate
  remediation: string;
  references?: string[];
  confidence: 'high' | 'medium' | 'low';
  falsePositiveRisk?: string;
}

export interface SecurityReport {
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  vulnerabilities: SecurityVulnerability[];
  byCategory: Record<VulnerabilityCategory, SecurityVulnerability[]>;
  attackSurface: AttackSurface;
  dataFlowRisks: DataFlowRisk[];
  secretsFound: SecretFinding[];
}

export interface AttackSurface {
  endpoints: EndpointInfo[];
  inputPoints: InputPoint[];
  externalCalls: ExternalCall[];
  databaseOperations: DatabaseOperation[];
  fileOperations: FileOperation[];
  processExecutions: ProcessExecution[];
}

export interface EndpointInfo {
  path: string;
  method: string;
  file: string;
  line: number;
  authRequired: boolean;
  parameters: string[];
  risks: string[];
}

export interface InputPoint {
  type: 'query_param' | 'body' | 'header' | 'path_param' | 'file_upload' | 'websocket' | 'cli_arg' | 'env_var';
  name: string;
  file: string;
  line: number;
  validated: boolean;
  sanitized: boolean;
}

export interface ExternalCall {
  type: 'http' | 'websocket' | 'grpc' | 'database' | 'file' | 'process';
  target: string;
  file: string;
  line: number;
  usesUserInput: boolean;
  encrypted: boolean;
}

export interface DatabaseOperation {
  type: 'query' | 'insert' | 'update' | 'delete' | 'raw';
  file: string;
  line: number;
  parameterized: boolean;
  snippet: string;
}

export interface FileOperation {
  type: 'read' | 'write' | 'delete' | 'execute';
  file: string;
  line: number;
  pathValidated: boolean;
  snippet: string;
}

export interface ProcessExecution {
  type: 'spawn' | 'exec' | 'shell';
  file: string;
  line: number;
  usesUserInput: boolean;
  snippet: string;
}

export interface DataFlowRisk {
  source: { type: string; location: { file: string; line: number } };
  sink: { type: string; location: { file: string; line: number } };
  taintPath: string[];
  risk: string;
  severity: VulnerabilitySeverity;
}

export interface SecretFinding {
  type: string;
  value: string;  // Partially redacted
  file: string;
  line: number;
  entropy: number;
  confidence: 'high' | 'medium' | 'low';
}

// =============================================================================
// PATTERNS DE DÉTECTION
// =============================================================================

const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp; severity: VulnerabilitySeverity }> = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
  { name: 'AWS Secret Key', pattern: /[0-9a-zA-Z/+]{40}/g, severity: 'critical' },
  { name: 'GitHub Token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g, severity: 'critical' },
  { name: 'GitHub OAuth', pattern: /gho_[A-Za-z0-9_]{36,}/g, severity: 'critical' },
  { name: 'Slack Token', pattern: /xox[baprs]-[0-9a-zA-Z-]{10,}/g, severity: 'high' },
  { name: 'Slack Webhook', pattern: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g, severity: 'high' },
  { name: 'Private Key', pattern: /-----BEGIN (?:RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY-----/g, severity: 'critical' },
  { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, severity: 'high' },
  { name: 'Google API Key', pattern: /AIza[0-9A-Za-z-_]{35}/g, severity: 'high' },
  { name: 'Google OAuth', pattern: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/g, severity: 'high' },
  { name: 'Stripe Key', pattern: /sk_live_[0-9a-zA-Z]{24,}/g, severity: 'critical' },
  { name: 'Stripe Test Key', pattern: /sk_test_[0-9a-zA-Z]{24,}/g, severity: 'medium' },
  { name: 'Heroku API Key', pattern: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, severity: 'high' },
  { name: 'Twilio API Key', pattern: /SK[0-9a-fA-F]{32}/g, severity: 'high' },
  { name: 'SendGrid API Key', pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g, severity: 'high' },
  { name: 'NPM Token', pattern: /npm_[A-Za-z0-9]{36}/g, severity: 'high' },
  { name: 'Docker Auth', pattern: /[a-zA-Z0-9+\/=]{64,}/g, severity: 'medium' },
  { name: 'Password in URL', pattern: /:\/\/[^:]+:[^@]+@/g, severity: 'high' },
  { name: 'Bearer Token', pattern: /Bearer\s+[A-Za-z0-9_-]{20,}/g, severity: 'high' },
  { name: 'Basic Auth', pattern: /Basic\s+[A-Za-z0-9+\/=]{20,}/g, severity: 'high' },
  { name: 'API Key Generic', pattern: /api[_-]?key['"\s]*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi, severity: 'high' },
  { name: 'Secret Generic', pattern: /(?:client_secret|app_secret|auth_secret)['"\s]*[:=]\s*['"][a-zA-Z0-9_-]{16,}['"]/gi, severity: 'high' },
  { name: 'Password Hardcoded', pattern: /password['"\s]*[:=]\s*['"][^'"]{8,}['"](?!\s*[,})\]])/gi, severity: 'high' },
  { name: 'Connection String', pattern: /(?:mongodb|postgres|mysql|redis|amqp):\/\/[^:]+:[^@]+@[^\s'"]+/gi, severity: 'high' },
];

const INJECTION_PATTERNS = {
  sql: [
    { pattern: /(?:execute|query|raw|fetchval|fetchrow|fetch)\s*\(\s*['"`].*\$\{/gi, name: 'SQL template injection', requiresContext: false },
    { pattern: /(?:execute|query|raw|fetchval|fetchrow|fetch)\s*\(\s*['"`].*\+\s*\w+/gi, name: 'SQL string concatenation', requiresContext: false },
    { pattern: /(?:execute|query|raw|fetchval|fetchrow|fetch)\s*\(\s*f["'].*\{(?!param_idx)/gi, name: 'Python f-string in SQL function', requiresContext: false },
    { pattern: /f["'](?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\s+.*FROM\s+.*\{[^}]+\}/gi, name: 'SQL query with variable injection', requiresContext: true },
    { pattern: /\.format\s*\(.*(?:SELECT|INSERT|UPDATE|DELETE)/gi, name: 'Python format SQL', requiresContext: false },
    { pattern: /sprintf.*(?:SELECT|INSERT|UPDATE|DELETE)/gi, name: 'sprintf SQL injection', requiresContext: false },
  ],
  command: [
    { pattern: /(?:exec|spawn|system|popen|subprocess\.(?:call|run|Popen))\s*\([^)]*\$\{/gi, name: 'Command injection via template' },
    { pattern: /(?:exec|spawn|system)\s*\(\s*['"`].*\+/gi, name: 'Command injection via concatenation' },
    { pattern: /child_process.*exec\s*\(/gi, name: 'Node.js command execution' },
    { pattern: /os\.system\s*\(/gi, name: 'Python os.system' },
    { pattern: /subprocess\.(?:call|run|Popen)\s*\(\s*[^[\]]*,\s*shell\s*=\s*True/gi, name: 'Python shell=True' },
    { pattern: /std::process::Command::new\([^)]*\)\.arg\([^)]*(?:user|input|request)/gi, name: 'Rust command with user input' },
  ],
  code: [
    { pattern: /eval\s*\(/gi, name: 'eval() usage' },
    { pattern: /new\s+Function\s*\(/gi, name: 'new Function() constructor' },
    { pattern: /setTimeout\s*\(\s*['"`]/gi, name: 'setTimeout with string' },
    { pattern: /setInterval\s*\(\s*['"`]/gi, name: 'setInterval with string' },
    { pattern: /exec\s*\(\s*compile\s*\(/gi, name: 'Python exec(compile())' },
  ],
  xss: [
    { pattern: /innerHTML\s*=/gi, name: 'innerHTML assignment' },
    { pattern: /outerHTML\s*=/gi, name: 'outerHTML assignment' },
    { pattern: /document\.write\s*\(/gi, name: 'document.write()' },
    { pattern: /insertAdjacentHTML\s*\(/gi, name: 'insertAdjacentHTML()' },
    { pattern: /dangerouslySetInnerHTML/gi, name: 'React dangerouslySetInnerHTML' },
    { pattern: /\{\{\{.*\}\}\}/g, name: 'Unescaped Handlebars' },
    { pattern: /v-html\s*=/gi, name: 'Vue v-html directive' },
    { pattern: /\[innerHTML\]\s*=/gi, name: 'Angular innerHTML binding' },
  ],
  path: [
    { pattern: /(?:readFile|writeFile|unlink|rmdir|mkdir|open)\s*\([^)]*\+/gi, name: 'Path concatenation in file op' },
    { pattern: /(?:readFile|writeFile|open)\s*\([^)]*(?:params|query|body|request)\./gi, name: 'User input in file path' },
    { pattern: /(?:readFile|writeFile|open|fs\.\w+)\s*\([^)]*\.\.(?:\/|\\)/gi, name: 'Path traversal in file operation' },
    { pattern: /path\.join\s*\([^)]*(?:params|query|body|request)\./gi, name: 'User input in path.join' },
    { pattern: /(?:params|query|body|req)\.[^)]*\.\.(?:\/|\\)/gi, name: 'Path traversal via user input' },
  ],
  deserialization: [
    { pattern: /pickle\.loads?\s*\(/gi, name: 'Python pickle deserialization' },
    { pattern: /yaml\.(?:load|unsafe_load)\s*\(/gi, name: 'YAML unsafe load' },
    { pattern: /JSON\.parse\s*\(\s*(?:req|request)\./gi, name: 'JSON.parse of user input' },
    { pattern: /unserialize\s*\(/gi, name: 'PHP unserialize' },
    { pattern: /Marshal\.load/gi, name: 'Ruby Marshal.load' },
    { pattern: /ObjectInputStream/gi, name: 'Java ObjectInputStream' },
  ],
  ssrf: [
    { pattern: /(?:fetch|axios|request|http\.get|urllib)\s*\([^)]*(?:params|query|body|user)/gi, name: 'SSRF via user input URL' },
    { pattern: /(?:fetch|axios|request)\s*\(\s*\$\{/gi, name: 'SSRF via template literal' },
    { pattern: /requests?\.(get|post|put|delete)\s*\([^)]*(?:params|query|body|user)/gi, name: 'Python requests with user input' },
  ],
};

const CRYPTO_PATTERNS = [
  { pattern: /(?:crypto|hash|digest).*MD5|MD5\s*\(|\.md5\s*\(/gi, name: 'MD5 hash (weak)', severity: 'medium' as VulnerabilitySeverity },
  { pattern: /(?:crypto|hash|digest).*SHA1|SHA1\s*\(|\.sha1\s*\(/gi, name: 'SHA1 hash (weak)', severity: 'medium' as VulnerabilitySeverity },
  { pattern: /(?:DES|3DES|TripleDES)(?:[-_]|\s*\(|Cipher)/g, name: 'DES encryption (weak)', severity: 'high' as VulnerabilitySeverity },
  { pattern: /(?:RC4|ARC4|ARCFOUR)(?:[-_]|\s*\(|Cipher)/gi, name: 'RC4 encryption (weak)', severity: 'high' as VulnerabilitySeverity },
  { pattern: /['"](ECB|ecb)['"]\s*\)|mode\s*[:=]\s*['"]?ECB/gi, name: 'ECB mode (weak)', severity: 'medium' as VulnerabilitySeverity },
  { pattern: /Math\.random\s*\(\).*(?:token|secret|key|password|auth|crypt)/gi, name: 'Math.random() for security', severity: 'high' as VulnerabilitySeverity },
  { pattern: /(?:token|secret|key|password|auth|crypt).*Math\.random\s*\(\)/gi, name: 'Math.random() for security', severity: 'high' as VulnerabilitySeverity },
  { pattern: /random\.random\s*\(\).*(?:token|secret|key|password)/gi, name: 'random.random() for security', severity: 'high' as VulnerabilitySeverity },
  { pattern: /(?:secrets?|crypto).*\brand\s*\(\)/gi, name: 'rand() for security', severity: 'high' as VulnerabilitySeverity },
  { pattern: /createCipheriv?\s*\([^)]*['"](?:des|rc4|blowfish)/gi, name: 'Weak cipher algorithm', severity: 'high' as VulnerabilitySeverity },
];

const AUTH_PATTERNS = [
  { pattern: /password\s*===?\s*['"][^'"]+['"]/gi, name: 'Hardcoded password comparison', severity: 'critical' as VulnerabilitySeverity },
  { pattern: /admin.*password|password.*admin/gi, name: 'Admin password reference', severity: 'high' as VulnerabilitySeverity },
  { pattern: /(?:skip|bypass|disable).*auth/gi, name: 'Auth bypass logic', severity: 'high' as VulnerabilitySeverity },
  { pattern: /jwt\.decode\s*\([^)]*,\s*(?:verify\s*[:=]\s*false|options\s*[:=]\s*\{[^}]*verify\s*[:=]\s*false)/gi, name: 'JWT verify disabled', severity: 'critical' as VulnerabilitySeverity },
  { pattern: /verify\s*[:=]\s*false/gi, name: 'Verification disabled', severity: 'high' as VulnerabilitySeverity },
  { pattern: /(?:VERIFY_SSL|SSL_VERIFY|CERT_VERIFY)\s*[:=]\s*(?:false|False|0)/gi, name: 'SSL verification disabled', severity: 'high' as VulnerabilitySeverity },
  { pattern: /rejectUnauthorized\s*:\s*false/gi, name: 'TLS certificate check disabled', severity: 'high' as VulnerabilitySeverity },
  { pattern: /InsecureRequestWarning/gi, name: 'Insecure request warning suppressed', severity: 'medium' as VulnerabilitySeverity },
];

const RUST_UNSAFE_PATTERNS = [
  { pattern: /unsafe\s*\{/g, name: 'Unsafe block', severity: 'info' as VulnerabilitySeverity },
  { pattern: /unsafe\s+fn/g, name: 'Unsafe function', severity: 'info' as VulnerabilitySeverity },
  { pattern: /unsafe\s+impl/g, name: 'Unsafe impl', severity: 'info' as VulnerabilitySeverity },
  { pattern: /\*mut\s+/g, name: 'Raw mutable pointer', severity: 'low' as VulnerabilitySeverity },
  { pattern: /\*const\s+/g, name: 'Raw const pointer', severity: 'low' as VulnerabilitySeverity },
  { pattern: /std::mem::transmute/g, name: 'Memory transmute', severity: 'medium' as VulnerabilitySeverity },
  { pattern: /std::mem::forget/g, name: 'Memory forget (leak)', severity: 'low' as VulnerabilitySeverity },
  { pattern: /ManuallyDrop/g, name: 'ManuallyDrop usage', severity: 'low' as VulnerabilitySeverity },
  { pattern: /\.as_ptr\(\)|\.as_mut_ptr\(\)/g, name: 'Raw pointer conversion', severity: 'low' as VulnerabilitySeverity },
  { pattern: /from_raw_parts/g, name: 'from_raw_parts (unsafe slice)', severity: 'medium' as VulnerabilitySeverity },
];

const ERROR_HANDLING_PATTERNS = [
  { pattern: /console\.(log|error|warn)\s*\([^)]*(?:password|secret|key|token|credential)/gi, name: 'Sensitive data in console', severity: 'medium' as VulnerabilitySeverity },
  { pattern: /print\s*\([^)]*(?:password|secret|key|token|credential)/gi, name: 'Sensitive data in print', severity: 'medium' as VulnerabilitySeverity },
  { pattern: /logger?\.(info|debug|error|warn)\s*\([^)]*(?:password|secret|key|token)/gi, name: 'Sensitive data in logs', severity: 'medium' as VulnerabilitySeverity },
  { pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g, name: 'Empty catch block', severity: 'low' as VulnerabilitySeverity },
  { pattern: /except:\s*pass/g, name: 'Python bare except pass', severity: 'low' as VulnerabilitySeverity },
  { pattern: /\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g, name: 'Empty promise catch', severity: 'low' as VulnerabilitySeverity },
  { pattern: /stacktrace|stack_trace|backtrace/gi, name: 'Stack trace exposure', severity: 'low' as VulnerabilitySeverity },
];

const CONFIG_PATTERNS = [
  { pattern: /DEBUG\s*[:=]\s*(?:true|True|1|"true")/gi, name: 'Debug mode enabled', severity: 'medium' as VulnerabilitySeverity },
  { pattern: /CORS.*\*|Access-Control-Allow-Origin.*\*/gi, name: 'CORS wildcard', severity: 'medium' as VulnerabilitySeverity },
  { pattern: /allowedOrigins?\s*[:=]\s*\[?\s*['"]?\*/gi, name: 'CORS any origin', severity: 'medium' as VulnerabilitySeverity },
  { pattern: /httpOnly\s*:\s*false/gi, name: 'Cookie httpOnly disabled', severity: 'medium' as VulnerabilitySeverity },
  { pattern: /secure\s*:\s*false/gi, name: 'Cookie secure disabled', severity: 'medium' as VulnerabilitySeverity },
  { pattern: /sameSite\s*:\s*['"]?none['"]?/gi, name: 'Cookie sameSite none', severity: 'low' as VulnerabilitySeverity },
  { pattern: /X-Frame-Options.*ALLOWALL/gi, name: 'Clickjacking vulnerability', severity: 'medium' as VulnerabilitySeverity },
  { pattern: /helmet\s*\(\s*\{[^}]*contentSecurityPolicy\s*:\s*false/gi, name: 'CSP disabled', severity: 'medium' as VulnerabilitySeverity },
];

// =============================================================================
// CLASSE PRINCIPALE
// =============================================================================

export class SecurityAnalyzer {
  private vulnerabilities: SecurityVulnerability[] = [];
  private vulnIdCounter = 0;
  private fileContents = new Map<string, string>();

  async analyzeFiles(files: FileInfo[], basePath: string, readFile: (path: string) => string): Promise<SecurityReport> {
    this.vulnerabilities = [];
    this.vulnIdCounter = 0;

    // Cache file contents
    for (const file of files) {
      try {
        const content = readFile(`${basePath}/${file.path}`);
        this.fileContents.set(file.path, content);
      } catch {
        // File not readable
      }
    }

    // Run all detection passes
    for (const file of files) {
      const content = this.fileContents.get(file.path);
      if (!content) continue;

      this.detectSecrets(file, content);
      this.detectInjections(file, content);
      this.detectCryptoIssues(file, content);
      this.detectAuthIssues(file, content);
      this.detectConfigIssues(file, content);
      this.detectErrorHandlingIssues(file, content);

      if (file.language === 'rust') {
        this.detectRustUnsafe(file, content);
      }

      this.detectDeepPatterns(file, content);
    }

    // Build attack surface
    const attackSurface = this.buildAttackSurface(files);

    // Analyze data flow for risks
    const dataFlowRisks = this.analyzeDataFlowRisks(files);

    // Extract found secrets
    const secretsFound = this.extractSecrets(files);

    // Build report
    return this.buildReport(attackSurface, dataFlowRisks, secretsFound);
  }

  // ===========================================================================
  // SECRET DETECTION
  // ===========================================================================

  private detectSecrets(file: FileInfo, content: string): void {
    const lines = content.split('\n');
    const isTestFile = this.isTestFile(file.path);

    for (const { name, pattern, severity } of SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNum - 1] || '';

        // Skip if in comment
        if (this.isInComment(content, match.index, file.language)) continue;

        // Skip if looks like a placeholder or example
        if (this.isPlaceholder(match[0])) continue;

        // Skip test/example values in test files
        if (isTestFile && this.isTestSecretValue(line, match[0], name)) continue;

        // Skip import statements and type definitions
        if (this.isImportOrTypeLine(line)) continue;

        // Skip environment variable references (process.env, os.environ)
        if (this.isEnvVariableReference(line)) continue;

        // Calculate entropy
        const entropy = this.calculateEntropy(match[0]);
        if (entropy < 3 && !name.includes('Key') && !name.includes('Token')) continue;

        // Adjust severity for test files
        const adjustedSeverity = isTestFile ? this.reduceSeverity(severity) : severity;

        // Calculate confidence
        const confidence = this.calculateSecretConfidence(line, match[0], name, entropy, isTestFile);
        if (confidence === 'skip') continue;

        this.addVulnerability({
          category: 'secrets',
          severity: adjustedSeverity,
          title: `Hardcoded ${name}`,
          description: `Found potential ${name} in source code.${isTestFile ? ' (In test file - may be intentional test data)' : ' Secrets should never be committed to version control.'}`,
          location: {
            file: file.path,
            line: lineNum,
            snippet: this.redactSecret(line)
          },
          cwe: 'CWE-798',
          owasp: 'A02:2021 Cryptographic Failures',
          remediation: 'Move secrets to environment variables or a secure secrets manager. Use .gitignore to prevent accidental commits.',
          confidence
        });
      }
    }
  }

  // ===========================================================================
  // INJECTION DETECTION
  // ===========================================================================

  private detectInjections(file: FileInfo, content: string): void {
    const lines = content.split('\n');

    // SQL Injection
    for (const { pattern, name, requiresContext } of INJECTION_PATTERNS.sql as Array<{ pattern: RegExp; name: string; requiresContext?: boolean }>) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNum - 1] || '';

        // Skip if in logging/print context (major false positive source)
        if (this.isLoggingContext(line)) continue;

        // Skip if it's just a string description, not actual SQL
        if (this.isDescriptionString(line, content, match.index)) continue;

        // For patterns that require additional context validation
        if (requiresContext) {
          // Must be in a function that executes SQL
          const functionContext = this.getFunctionContext(content, match.index);
          if (!this.isSqlExecutionContext(functionContext)) continue;
        }

        // Determine confidence based on context
        const confidence = this.calculateSqlInjectionConfidence(line, content, match.index);
        if (confidence === 'skip') continue;

        this.addVulnerability({
          category: 'injection',
          severity: confidence === 'high' ? 'critical' : 'high',
          title: `SQL Injection: ${name}`,
          description: 'User input may be directly concatenated into SQL query, allowing attackers to manipulate database queries.',
          location: {
            file: file.path,
            line: lineNum,
            snippet: line.substring(0, 200)
          },
          cwe: 'CWE-89',
          owasp: 'A03:2021 Injection',
          remediation: 'Use parameterized queries or prepared statements. Never concatenate user input into SQL.',
          confidence
        });
      }
    }

    // Command Injection
    for (const { pattern, name } of INJECTION_PATTERNS.command) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;
        this.addVulnerability({
          category: 'injection',
          severity: 'critical',
          title: `Command Injection: ${name}`,
          description: 'User input may be passed to system command execution, allowing arbitrary command execution.',
          location: {
            file: file.path,
            line: lineNum,
            snippet: lines[lineNum - 1]?.substring(0, 200)
          },
          cwe: 'CWE-78',
          owasp: 'A03:2021 Injection',
          remediation: 'Avoid executing shell commands with user input. If necessary, use allow-lists and strict validation.',
          confidence: 'high'
        });
      }
    }

    // Code Injection
    for (const { pattern, name } of INJECTION_PATTERNS.code) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;
        this.addVulnerability({
          category: 'injection',
          severity: 'critical',
          title: `Code Injection: ${name}`,
          description: 'Dynamic code execution detected. This can lead to arbitrary code execution if user input is involved.',
          location: {
            file: file.path,
            line: lineNum,
            snippet: lines[lineNum - 1]?.substring(0, 200)
          },
          cwe: 'CWE-94',
          owasp: 'A03:2021 Injection',
          remediation: 'Avoid eval() and similar functions. Use safe alternatives like JSON.parse for data parsing.',
          confidence: 'medium'
        });
      }
    }

    // XSS
    for (const { pattern, name } of INJECTION_PATTERNS.xss) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;
        this.addVulnerability({
          category: 'xss',
          severity: 'high',
          title: `Cross-Site Scripting: ${name}`,
          description: 'HTML content is being set without proper escaping, potentially allowing XSS attacks.',
          location: {
            file: file.path,
            line: lineNum,
            snippet: lines[lineNum - 1]?.substring(0, 200)
          },
          cwe: 'CWE-79',
          owasp: 'A03:2021 Injection',
          remediation: 'Use text content instead of HTML, or properly sanitize HTML with a library like DOMPurify.',
          confidence: 'medium'
        });
      }
    }

    // Path Traversal
    for (const { pattern, name } of INJECTION_PATTERNS.path) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;
        this.addVulnerability({
          category: 'path_traversal',
          severity: 'high',
          title: `Path Traversal: ${name}`,
          description: 'File path may be constructed with user input, allowing access to arbitrary files.',
          location: {
            file: file.path,
            line: lineNum,
            snippet: lines[lineNum - 1]?.substring(0, 200)
          },
          cwe: 'CWE-22',
          owasp: 'A01:2021 Broken Access Control',
          remediation: 'Validate and sanitize file paths. Use path.resolve() and ensure the result is within allowed directories.',
          confidence: 'medium'
        });
      }
    }

    // Deserialization
    for (const { pattern, name } of INJECTION_PATTERNS.deserialization) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;
        this.addVulnerability({
          category: 'deserialization',
          severity: 'high',
          title: `Insecure Deserialization: ${name}`,
          description: 'Deserializing untrusted data can lead to remote code execution.',
          location: {
            file: file.path,
            line: lineNum,
            snippet: lines[lineNum - 1]?.substring(0, 200)
          },
          cwe: 'CWE-502',
          owasp: 'A08:2021 Software and Data Integrity Failures',
          remediation: 'Use safe serialization formats like JSON. If using pickle/yaml, only deserialize trusted data.',
          confidence: 'high'
        });
      }
    }

    // SSRF
    for (const { pattern, name } of INJECTION_PATTERNS.ssrf) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;
        this.addVulnerability({
          category: 'ssrf',
          severity: 'high',
          title: `Server-Side Request Forgery: ${name}`,
          description: 'URL for outbound request may be controlled by user input, allowing access to internal resources.',
          location: {
            file: file.path,
            line: lineNum,
            snippet: lines[lineNum - 1]?.substring(0, 200)
          },
          cwe: 'CWE-918',
          owasp: 'A10:2021 SSRF',
          remediation: 'Validate and sanitize URLs. Use allow-lists for permitted domains. Block internal/private IP ranges.',
          confidence: 'medium'
        });
      }
    }
  }

  // ===========================================================================
  // CRYPTOGRAPHY ISSUES
  // ===========================================================================

  private detectCryptoIssues(file: FileInfo, content: string): void {
    const lines = content.split('\n');

    for (const { pattern, name, severity } of CRYPTO_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNum - 1] || '';

        // Skip if it's just a reference/import
        if (line.includes('import') || line.includes('require')) continue;

        this.addVulnerability({
          category: 'cryptography',
          severity,
          title: `Weak Cryptography: ${name}`,
          description: `Use of weak or outdated cryptographic algorithm detected. ${name} should not be used for security-sensitive operations.`,
          location: {
            file: file.path,
            line: lineNum,
            snippet: line.substring(0, 200)
          },
          cwe: 'CWE-327',
          owasp: 'A02:2021 Cryptographic Failures',
          remediation: 'Use strong algorithms: SHA-256/SHA-3 for hashing, AES-256-GCM for encryption, crypto.randomBytes for random.',
          confidence: 'medium'
        });
      }
    }
  }

  // ===========================================================================
  // AUTHENTICATION ISSUES
  // ===========================================================================

  private detectAuthIssues(file: FileInfo, content: string): void {
    const lines = content.split('\n');

    for (const { pattern, name, severity } of AUTH_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;

        this.addVulnerability({
          category: 'authentication',
          severity,
          title: `Authentication Issue: ${name}`,
          description: 'Potential authentication weakness detected that could allow unauthorized access.',
          location: {
            file: file.path,
            line: lineNum,
            snippet: lines[lineNum - 1]?.substring(0, 200)
          },
          cwe: 'CWE-287',
          owasp: 'A07:2021 Identification and Authentication Failures',
          remediation: 'Implement proper authentication mechanisms. Never disable security checks in production.',
          confidence: 'medium'
        });
      }
    }
  }

  // ===========================================================================
  // CONFIGURATION ISSUES
  // ===========================================================================

  private detectConfigIssues(file: FileInfo, content: string): void {
    const lines = content.split('\n');

    for (const { pattern, name, severity } of CONFIG_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;

        this.addVulnerability({
          category: 'security_misconfig',
          severity,
          title: `Security Misconfiguration: ${name}`,
          description: 'Insecure configuration detected that may expose the application to attacks.',
          location: {
            file: file.path,
            line: lineNum,
            snippet: lines[lineNum - 1]?.substring(0, 200)
          },
          cwe: 'CWE-16',
          owasp: 'A05:2021 Security Misconfiguration',
          remediation: 'Use secure defaults. Disable debug mode in production. Apply proper security headers.',
          confidence: 'high'
        });
      }
    }
  }

  // ===========================================================================
  // ERROR HANDLING ISSUES
  // ===========================================================================

  private detectErrorHandlingIssues(file: FileInfo, content: string): void {
    const lines = content.split('\n');

    for (const { pattern, name, severity } of ERROR_HANDLING_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;

        this.addVulnerability({
          category: 'error_handling',
          severity,
          title: `Error Handling Issue: ${name}`,
          description: 'Improper error handling may leak sensitive information or mask security issues.',
          location: {
            file: file.path,
            line: lineNum,
            snippet: lines[lineNum - 1]?.substring(0, 200)
          },
          cwe: 'CWE-209',
          owasp: 'A09:2021 Security Logging and Monitoring Failures',
          remediation: 'Log errors securely without exposing sensitive data. Handle all exceptions appropriately.',
          confidence: 'medium'
        });
      }
    }
  }

  // ===========================================================================
  // RUST-SPECIFIC DETECTION
  // ===========================================================================

  private detectRustUnsafe(file: FileInfo, content: string): void {
    const lines = content.split('\n');

    for (const { pattern, name, severity } of RUST_UNSAFE_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;

        this.addVulnerability({
          category: 'unsafe_code',
          severity,
          title: `Rust Unsafe Code: ${name}`,
          description: 'Unsafe Rust code bypasses memory safety guarantees. Requires careful review for memory safety.',
          location: {
            file: file.path,
            line: lineNum,
            snippet: lines[lineNum - 1]?.substring(0, 200)
          },
          cwe: 'CWE-119',
          remediation: 'Minimize unsafe blocks. Document safety invariants. Consider safe alternatives.',
          confidence: 'high'
        });
      }
    }
  }

  // ===========================================================================
  // DEEP PATTERN DETECTION
  // ===========================================================================

  private detectDeepPatterns(file: FileInfo, content: string): void {
    const lines = content.split('\n');

    // Race conditions
    const racePatterns = [
      { pattern: /async.*await.*(?:fs|file|read|write)/gi, name: 'Async file operation' },
      { pattern: /\.lock\(\).*\.unwrap\(\)/g, name: 'Rust mutex unwrap (panic on poison)' },
      { pattern: /if.*exists.*(?:read|write|delete|remove)/gi, name: 'TOCTOU check-then-use' },
    ];

    for (const { pattern, name } of racePatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;
        this.addVulnerability({
          category: 'race_condition',
          severity: 'medium',
          title: `Potential Race Condition: ${name}`,
          description: 'Code pattern suggests potential race condition that could lead to data corruption or security bypass.',
          location: {
            file: file.path,
            line: lineNum,
            snippet: lines[lineNum - 1]?.substring(0, 200)
          },
          cwe: 'CWE-362',
          remediation: 'Use proper synchronization. Prefer atomic operations. Avoid check-then-act patterns.',
          confidence: 'low'
        });
      }
    }

    // Resource exhaustion / DoS
    const dosPatterns = [
      { pattern: /while\s*\(\s*true\s*\)/g, name: 'Infinite loop' },
      { pattern: /for\s*\(\s*;\s*;\s*\)/g, name: 'Infinite for loop' },
      { pattern: /(?:regex|RegExp)\s*\([^)]*(?:\+\+|\*\*|\{\d+,\})/gi, name: 'ReDoS vulnerable regex' },
      { pattern: /\.repeat\s*\(\s*(?:req|request|params|query)/gi, name: 'User-controlled repeat' },
      { pattern: /new\s+Array\s*\(\s*(?:req|request|params|query)/gi, name: 'User-controlled array size' },
    ];

    for (const { pattern, name } of dosPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;
        this.addVulnerability({
          category: 'dos',
          severity: 'medium',
          title: `Denial of Service Risk: ${name}`,
          description: 'Code pattern could lead to resource exhaustion or denial of service.',
          location: {
            file: file.path,
            line: lineNum,
            snippet: lines[lineNum - 1]?.substring(0, 200)
          },
          cwe: 'CWE-400',
          remediation: 'Add timeouts, rate limiting, and input validation. Limit resource consumption.',
          confidence: 'low'
        });
      }
    }

    // Mass assignment / Over-posting
    const massAssignmentPatterns = [
      { pattern: /Object\.assign\s*\([^,]+,\s*(?:req|request)\.body/gi, name: 'Object.assign with request body' },
      { pattern: /\{\s*\.\.\.(?:req|request)\.body/gi, name: 'Spread request body' },
      { pattern: /update\s*\(\s*(?:req|request)\.body\s*\)/gi, name: 'Direct update from body' },
    ];

    for (const { pattern, name } of massAssignmentPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (this.isInComment(content, match.index, file.language)) continue;

        const lineNum = content.substring(0, match.index).split('\n').length;
        this.addVulnerability({
          category: 'access_control',
          severity: 'high',
          title: `Mass Assignment: ${name}`,
          description: 'Directly using request body for object creation/update may allow attackers to set unauthorized fields.',
          location: {
            file: file.path,
            line: lineNum,
            snippet: lines[lineNum - 1]?.substring(0, 200)
          },
          cwe: 'CWE-915',
          owasp: 'A01:2021 Broken Access Control',
          remediation: 'Explicitly pick allowed fields. Use DTOs with validation. Never trust user input directly.',
          confidence: 'high'
        });
      }
    }
  }

  // ===========================================================================
  // ATTACK SURFACE ANALYSIS
  // ===========================================================================

  private buildAttackSurface(files: FileInfo[]): AttackSurface {
    const endpoints: EndpointInfo[] = [];
    const inputPoints: InputPoint[] = [];
    const externalCalls: ExternalCall[] = [];
    const databaseOperations: DatabaseOperation[] = [];
    const fileOperations: FileOperation[] = [];
    const processExecutions: ProcessExecution[] = [];

    for (const file of files) {
      const content = this.fileContents.get(file.path);
      if (!content) continue;

      // Detect HTTP endpoints
      const endpointPatterns = [
        { pattern: /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)/gi, type: 'express' },
        { pattern: /@(Get|Post|Put|Patch|Delete)\s*\(\s*['"`]?([^'"`)\s]*)/gi, type: 'nestjs' },
        { pattern: /#\[(?:get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)/gi, type: 'rust-actix' },
        { pattern: /@app\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)/gi, type: 'flask' },
        { pattern: /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)/gi, type: 'router' },
      ];

      for (const { pattern } of endpointPatterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          endpoints.push({
            path: match[2] || match[1],
            method: match[1].toUpperCase(),
            file: file.path,
            line: lineNum,
            authRequired: this.checkAuthRequired(content, match.index),
            parameters: this.extractEndpointParams(content, match.index),
            risks: []
          });
        }
      }

      // Detect input points
      const inputPatterns = [
        { pattern: /(?:req|request)\.(query|params|body|headers)\./gi, type: 'query_param' as const },
        { pattern: /\.files?\[/gi, type: 'file_upload' as const },
        { pattern: /process\.argv/gi, type: 'cli_arg' as const },
        { pattern: /process\.env\./gi, type: 'env_var' as const },
        { pattern: /(?:ws|socket)\.on\s*\(\s*['"]message/gi, type: 'websocket' as const },
      ];

      for (const { pattern, type } of inputPatterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          inputPoints.push({
            type,
            name: match[0],
            file: file.path,
            line: lineNum,
            validated: this.checkValidation(content, match.index),
            sanitized: this.checkSanitization(content, match.index)
          });
        }
      }

      // Detect external calls
      const externalCallPatterns = [
        { pattern: /(?:fetch|axios|request|got|superagent)\s*\(/gi, type: 'http' as const },
        { pattern: /(?:WebSocket|ws)\s*\(/gi, type: 'websocket' as const },
        { pattern: /(?:query|execute|raw)\s*\(/gi, type: 'database' as const },
        { pattern: /(?:readFile|writeFile|createReadStream)\s*\(/gi, type: 'file' as const },
        { pattern: /(?:spawn|exec|execFile)\s*\(/gi, type: 'process' as const },
      ];

      for (const { pattern, type } of externalCallPatterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          externalCalls.push({
            type,
            target: match[0],
            file: file.path,
            line: lineNum,
            usesUserInput: this.checkUserInput(content, match.index),
            encrypted: this.checkEncryption(content, match.index)
          });
        }
      }

      // Detect database operations
      const dbPatterns = [
        { pattern: /\.query\s*\(\s*['"`]([^'"`]{0,100})/gi, type: 'query' as const },
        { pattern: /\.execute\s*\(\s*['"`]([^'"`]{0,100})/gi, type: 'query' as const },
        { pattern: /\.raw\s*\(\s*['"`]([^'"`]{0,100})/gi, type: 'raw' as const },
      ];

      for (const { pattern, type } of dbPatterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          const context = content.substring(match.index, match.index + 200);
          databaseOperations.push({
            type,
            file: file.path,
            line: lineNum,
            parameterized: context.includes('?') || context.includes('$'),
            snippet: match[1] || ''
          });
        }
      }

      // Detect file operations
      const filePatterns = [
        { pattern: /(?:readFile(?:Sync)?|createReadStream)\s*\(/gi, type: 'read' as const },
        { pattern: /(?:writeFile(?:Sync)?|createWriteStream)\s*\(/gi, type: 'write' as const },
        { pattern: /(?:unlink(?:Sync)?|rm(?:Sync)?)\s*\(/gi, type: 'delete' as const },
      ];

      for (const { pattern, type } of filePatterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          const lines = content.split('\n');
          fileOperations.push({
            type,
            file: file.path,
            line: lineNum,
            pathValidated: this.checkPathValidation(content, match.index),
            snippet: lines[lineNum - 1]?.substring(0, 100) || ''
          });
        }
      }

      // Detect process executions
      const processPatterns = [
        { pattern: /(?:spawn|spawnSync)\s*\(/gi, type: 'spawn' as const },
        { pattern: /(?:exec|execSync)\s*\(/gi, type: 'exec' as const },
        { pattern: /(?:execFile|execFileSync)\s*\(/gi, type: 'exec' as const },
      ];

      for (const { pattern, type } of processPatterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          const lines = content.split('\n');
          processExecutions.push({
            type,
            file: file.path,
            line: lineNum,
            usesUserInput: this.checkUserInput(content, match.index),
            snippet: lines[lineNum - 1]?.substring(0, 100) || ''
          });
        }
      }
    }

    return {
      endpoints,
      inputPoints,
      externalCalls,
      databaseOperations,
      fileOperations,
      processExecutions
    };
  }

  // ===========================================================================
  // DATA FLOW RISK ANALYSIS
  // ===========================================================================

  private analyzeDataFlowRisks(files: FileInfo[]): DataFlowRisk[] {
    const risks: DataFlowRisk[] = [];

    // Find user input sources flowing to dangerous sinks
    const sources = ['req.body', 'req.query', 'req.params', 'request.body', 'request.args', 'user_input'];
    const sinks = [
      { pattern: /eval|exec|spawn|query|execute|innerHTML|dangerouslySetInnerHTML/g, type: 'dangerous_sink' },
    ];

    for (const file of files) {
      const content = this.fileContents.get(file.path);
      if (!content) continue;

      // Simple taint tracking - look for sources and sinks in same function
      const functions = content.matchAll(/(?:function|const|async)\s+(\w+)[^{]*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g);

      for (const match of functions) {
        const funcBody = match[2];
        const hasSource = sources.some(s => funcBody.includes(s));

        if (hasSource) {
          for (const { pattern, type } of sinks) {
            pattern.lastIndex = 0;
            if (pattern.test(funcBody)) {
              const lineNum = content.substring(0, match.index || 0).split('\n').length;
              risks.push({
                source: {
                  type: 'user_input',
                  location: { file: file.path, line: lineNum }
                },
                sink: {
                  type,
                  location: { file: file.path, line: lineNum }
                },
                taintPath: [match[1]],
                risk: 'User input flows to dangerous operation without validation',
                severity: 'high'
              });
            }
          }
        }
      }
    }

    return risks;
  }

  // ===========================================================================
  // SECRETS EXTRACTION
  // ===========================================================================

  private extractSecrets(files: FileInfo[]): SecretFinding[] {
    const secrets: SecretFinding[] = [];

    for (const vuln of this.vulnerabilities) {
      if (vuln.category === 'secrets') {
        secrets.push({
          type: vuln.title.replace('Hardcoded ', ''),
          value: vuln.location.snippet || '[REDACTED]',
          file: vuln.location.file,
          line: vuln.location.line,
          entropy: 4.5, // Approximate
          confidence: vuln.confidence
        });
      }
    }

    return secrets;
  }

  // ===========================================================================
  // REPORT BUILDING
  // ===========================================================================

  private buildReport(
    attackSurface: AttackSurface,
    dataFlowRisks: DataFlowRisk[],
    secretsFound: SecretFinding[]
  ): SecurityReport {
    // Deduplicate vulnerabilities by file:line:category
    const deduped = this.deduplicateVulnerabilities(this.vulnerabilities);

    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      total: deduped.length
    };

    const byCategory: Record<VulnerabilityCategory, SecurityVulnerability[]> = {
      injection: [],
      authentication: [],
      cryptography: [],
      data_exposure: [],
      access_control: [],
      security_misconfig: [],
      xss: [],
      deserialization: [],
      dependency: [],
      race_condition: [],
      memory_safety: [],
      path_traversal: [],
      ssrf: [],
      dos: [],
      logging: [],
      error_handling: [],
      secrets: [],
      unsafe_code: []
    };

    for (const vuln of deduped) {
      summary[vuln.severity]++;
      byCategory[vuln.category].push(vuln);
    }

    return {
      summary,
      vulnerabilities: deduped.sort((a, b) => {
        const order: Record<VulnerabilitySeverity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        return order[a.severity] - order[b.severity];
      }),
      byCategory,
      attackSurface,
      dataFlowRisks,
      secretsFound
    };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private addVulnerability(vuln: Omit<SecurityVulnerability, 'id'>): void {
    this.vulnerabilities.push({
      id: `vuln-${++this.vulnIdCounter}`,
      ...vuln
    });
  }

  /**
   * Deduplicate vulnerabilities by file:line:category
   * Keeps the highest severity/confidence when duplicates found
   */
  private deduplicateVulnerabilities(vulns: SecurityVulnerability[]): SecurityVulnerability[] {
    const seen = new Map<string, SecurityVulnerability>();
    const severityOrder: Record<VulnerabilitySeverity, number> = {
      critical: 0, high: 1, medium: 2, low: 3, info: 4
    };
    const confidenceOrder: Record<string, number> = {
      high: 0, medium: 1, low: 2
    };

    for (const vuln of vulns) {
      const key = `${vuln.location.file}:${vuln.location.line}:${vuln.category}`;
      const existing = seen.get(key);

      if (!existing) {
        seen.set(key, vuln);
      } else {
        // Keep higher severity, or higher confidence if same severity
        const existingSev = severityOrder[existing.severity];
        const newSev = severityOrder[vuln.severity];

        if (newSev < existingSev) {
          seen.set(key, vuln);
        } else if (newSev === existingSev) {
          const existingConf = confidenceOrder[existing.confidence] ?? 2;
          const newConf = confidenceOrder[vuln.confidence] ?? 2;
          if (newConf < existingConf) {
            seen.set(key, vuln);
          }
        }
      }
    }

    return Array.from(seen.values());
  }

  private isInComment(content: string, position: number, language: Language): boolean {
    const before = content.substring(Math.max(0, position - 500), position);
    const lastNewline = before.lastIndexOf('\n');
    const lineStart = before.substring(lastNewline + 1);

    // Single line comments
    if (lineStart.includes('//') || lineStart.includes('#')) {
      const commentPos = lineStart.indexOf('//') !== -1 ? lineStart.indexOf('//') : lineStart.indexOf('#');
      if (commentPos < lineStart.length - (position - (content.length - before.length))) {
        return true;
      }
    }

    // Multi-line comments
    const lastBlockStart = before.lastIndexOf('/*');
    const lastBlockEnd = before.lastIndexOf('*/');
    if (lastBlockStart > lastBlockEnd) return true;

    // Python docstrings
    if (language === 'python') {
      const quotes = (before.match(/"""/g) || []).length + (before.match(/'''/g) || []).length;
      if (quotes % 2 !== 0) return true;
    }

    return false;
  }

  private isPlaceholder(value: string): boolean {
    const placeholders = [
      'xxx', 'XXX', 'yyy', 'YYY', 'zzz', 'ZZZ',
      'your_', 'my_', 'example', 'test', 'demo', 'sample', 'placeholder',
      '<', '>', '{', '}', '${', 'ENV', 'process.env'
    ];
    return placeholders.some(p => value.toLowerCase().includes(p.toLowerCase()));
  }

  private calculateEntropy(str: string): number {
    const freq: Record<string, number> = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / str.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private redactSecret(line: string): string {
    return line.replace(/(['"`])([^'"`]{4})[^'"`]+([^'"`]{2})(['"`])/g, '$1$2****$3$4');
  }

  private checkAuthRequired(content: string, position: number): boolean {
    const context = content.substring(Math.max(0, position - 200), position + 200);
    return /auth|authenticate|authorize|jwt|session|login|token/i.test(context);
  }

  private extractEndpointParams(content: string, position: number): string[] {
    const params: string[] = [];
    const context = content.substring(position, position + 500);
    const paramMatches = context.matchAll(/(?:req|request)\.(params|query|body)\.(\w+)/g);
    for (const match of paramMatches) {
      params.push(`${match[1]}.${match[2]}`);
    }
    return params;
  }

  private checkValidation(content: string, position: number): boolean {
    const context = content.substring(Math.max(0, position - 100), position + 300);
    return /validate|sanitize|check|verify|assert|Joi|Yup|zod|ajv/i.test(context);
  }

  private checkSanitization(content: string, position: number): boolean {
    const context = content.substring(Math.max(0, position - 100), position + 300);
    return /sanitize|escape|encode|purify|clean|dompurify/i.test(context);
  }

  private checkUserInput(content: string, position: number): boolean {
    const context = content.substring(Math.max(0, position - 200), position + 200);
    return /req\.|request\.|params|query|body|args|argv|input|user/i.test(context);
  }

  private checkEncryption(content: string, position: number): boolean {
    const context = content.substring(Math.max(0, position - 100), position + 100);
    return /https|tls|ssl|encrypt|secure/i.test(context);
  }

  private checkPathValidation(content: string, position: number): boolean {
    const context = content.substring(Math.max(0, position - 200), position);
    return /path\.resolve|path\.normalize|sanitize|validate|allow/i.test(context);
  }

  // ===========================================================================
  // CONTEXTUAL ANALYSIS METHODS (Reduce False Positives)
  // ===========================================================================

  /**
   * Check if line is in a logging/print context (common false positive source)
   */
  private isLoggingContext(line: string): boolean {
    const loggingPatterns = [
      /^\s*print\s*\(/i,
      /^\s*console\.(log|error|warn|info|debug)\s*\(/i,
      /^\s*logger?\.(log|error|warn|info|debug|critical|exception)\s*\(/i,
      /^\s*logging\.(log|error|warn|info|debug|critical|exception)\s*\(/i,
      /^\s*self\.logger\./i,
      /^\s*log\.(error|warn|info|debug)\s*\(/i,
      /raise\s+\w*Error\s*\(/i,   // Python exceptions
      /throw\s+new\s+\w*Error/i,  // JS/TS exceptions
      /return\s+f["']/i,          // Return statements with f-strings (usually messages)
      /reason\s*=\s*f["']/i,      // Reason/message assignments
      /message\s*=\s*f["']/i,
      /description\s*=\s*f["']/i,
      /error\s*=\s*f["']/i,
      /msg\s*=\s*f["']/i,
    ];
    return loggingPatterns.some(p => p.test(line));
  }

  /**
   * Check if the string is a description/message rather than executable SQL
   */
  private isDescriptionString(line: string, content: string, position: number): boolean {
    // Check if line is assigning to message/reason/description variables
    if (/(?:reason|message|msg|description|error|text|label)\s*[:=]\s*f?["']/i.test(line)) {
      return true;
    }

    // Check if the f-string doesn't contain actual SQL structure
    const fstringMatch = line.match(/f["']([^"']+)["']/);
    if (fstringMatch) {
      const fstringContent = fstringMatch[1];
      // Real SQL has specific structure: SELECT...FROM, INSERT INTO, etc.
      const hasSqlStructure = /(?:SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+.+\s+SET|DELETE\s+FROM)/i.test(fstringContent);
      if (!hasSqlStructure) {
        return true;
      }
    }

    // Check context: if this is inside a string that's not passed to execute/query
    const surroundingLines = content.substring(
      Math.max(0, position - 300),
      Math.min(content.length, position + 100)
    );

    // If no SQL execution function nearby, it's likely not a real injection
    const hasSqlExecution = /(?:execute|query|fetchval|fetchrow|fetchall|cursor\.|conn\.)\s*\(/i.test(surroundingLines);
    if (!hasSqlExecution) {
      // Check if it's just parameter building (e.g., $param_idx)
      if (/\$\{?\s*param_idx\s*\}?|\$\d+/.test(line)) {
        return false; // This is parameterized query building, still flag but lower confidence
      }
      return true;
    }

    return false;
  }

  /**
   * Get the function/method context around a position
   */
  private getFunctionContext(content: string, position: number): string {
    // Find the start of the current function
    const before = content.substring(0, position);
    const functionStarts = [
      ...before.matchAll(/(?:async\s+)?(?:def|function)\s+(\w+)\s*\([^)]*\)\s*(?:->.*?)?:/g),
      ...before.matchAll(/(?:async\s+)?(?:def|function)\s+(\w+)\s*\([^)]*\)\s*\{/g),
    ];

    if (functionStarts.length === 0) return '';

    const lastFunc = Array.from(functionStarts).pop();
    if (!lastFunc) return '';

    // Get content from function start to current position
    return content.substring(lastFunc.index || 0, position + 200);
  }

  /**
   * Check if context is actually executing SQL
   */
  private isSqlExecutionContext(context: string): boolean {
    const sqlExecutionPatterns = [
      /(?:execute|query|fetchval|fetchrow|fetchall|fetch_one|fetch_all)\s*\(/i,
      /cursor\.\w+\s*\(/i,
      /conn\.\w+\s*\(/i,
      /session\.\w+\s*\(/i,
      /db\.\w+\s*\(/i,
      /await\s+.*\.fetch/i,
    ];
    return sqlExecutionPatterns.some(p => p.test(context));
  }

  /**
   * Calculate confidence level for SQL injection detection
   */
  private calculateSqlInjectionConfidence(line: string, content: string, position: number): 'high' | 'medium' | 'low' | 'skip' {
    // High confidence indicators
    const highConfidence = [
      /(?:execute|query|fetchval|fetchrow)\s*\(\s*f["']/i,  // Direct SQL execution with f-string
      /SELECT\s+.*\{[^}]+\}.*FROM/i,                         // SELECT with variable in columns
      /FROM\s+\{[^}]+\}/i,                                   // Variable table name (very dangerous)
      /WHERE\s+.*=\s*['"]?\{[^}]+\}/i,                       // Variable in WHERE clause
    ];

    if (highConfidence.some(p => p.test(line))) {
      return 'high';
    }

    // Medium confidence: f-string in SQL context but might be parameterized
    const mediumConfidence = [
      /query\s*\+?=\s*f["']/i,              // Building query string
      /sql\s*\+?=\s*f["']/i,                // Building SQL string
      /\$\{param_idx(?:\s*\+\s*\d+)?\}/,    // Parameterized position placeholder (asyncpg style)
    ];

    if (mediumConfidence.some(p => p.test(line))) {
      // Check if using parameterized queries ($ placeholders)
      if (/\$\d+|\$\{param_idx/.test(line)) {
        return 'low'; // Using parameterized queries, lower risk
      }
      return 'medium';
    }

    // Low confidence: might be SQL-related but not clearly dangerous
    const surroundingContext = content.substring(
      Math.max(0, position - 500),
      Math.min(content.length, position + 200)
    );

    // If in test file with mock data, lower confidence
    if (/test|spec|mock|fixture/i.test(line) || /def test_|it\(["']|describe\(["']/i.test(surroundingContext)) {
      return 'low';
    }

    // If no actual SQL keywords in the specific line, skip
    if (!/(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|SET|INTO)\s/i.test(line)) {
      return 'skip';
    }

    return 'medium';
  }

  /**
   * Check if file is a test file (for adjusting severity/confidence)
   */
  private isTestFile(filePath: string): boolean {
    return /(?:test|spec|__tests__|tests|testing|mock|fixture)/i.test(filePath);
  }

  /**
   * Check if this is a test secret value (common patterns in tests)
   */
  private isTestSecretValue(line: string, value: string, secretType: string): boolean {
    // Common test/mock patterns
    const testPatterns = [
      /valid_key|invalid_key|test_key|mock_key|fake_key/i,
      /valid_api|invalid_api|test_api|mock_api/i,
      /test_token|mock_token|fake_token/i,
      /example|sample|dummy|placeholder/i,
      /assert|expect|should|mock|stub|fake/i,
      /["']sk_test_/,  // Stripe test keys are intentionally test data
      /["']pk_test_/,
    ];

    if (testPatterns.some(p => p.test(line))) return true;

    // Short generic values that look like test data (e.g., "AIza1234", "test123")
    if (value.length < 20 && /^[A-Za-z]{4}[0-9]+$/.test(value)) return true;

    // Check for assignment to test variables
    if (/(?:test|mock|fake|dummy|example|sample)_?\w*\s*[:=]/i.test(line)) return true;

    return false;
  }

  /**
   * Check if line is an import or type definition (not actual secret)
   */
  private isImportOrTypeLine(line: string): boolean {
    return /^\s*(?:import|from|export|type|interface|const\s+\w+:\s*\w+Type)/i.test(line);
  }

  /**
   * Check if the line references an environment variable (not hardcoded)
   */
  private isEnvVariableReference(line: string): boolean {
    return /process\.env\.|os\.environ|os\.getenv|env\[|getenv\(|ENV\[/i.test(line);
  }

  /**
   * Reduce severity by one level
   */
  private reduceSeverity(severity: VulnerabilitySeverity): VulnerabilitySeverity {
    switch (severity) {
      case 'critical': return 'high';
      case 'high': return 'medium';
      case 'medium': return 'low';
      case 'low': return 'info';
      case 'info': return 'info';
    }
  }

  /**
   * Calculate confidence for secret detection
   */
  private calculateSecretConfidence(
    line: string,
    value: string,
    secretType: string,
    entropy: number,
    isTestFile: boolean
  ): 'high' | 'medium' | 'low' | 'skip' {
    // Very low entropy - likely not a real secret
    if (entropy < 2.5) return 'skip';

    // High entropy + specific pattern = high confidence
    if (entropy > 4.5 && (
      secretType.includes('Private Key') ||
      secretType.includes('JWT') ||
      secretType.includes('Stripe') ||
      value.startsWith('ghp_') ||
      value.startsWith('gho_') ||
      value.startsWith('AKIA')
    )) {
      return isTestFile ? 'medium' : 'high';
    }

    // Test files get lower confidence
    if (isTestFile) {
      return entropy > 4 ? 'low' : 'skip';
    }

    // Generic patterns need higher entropy
    if (secretType.includes('Generic')) {
      return entropy > 4 ? 'medium' : 'low';
    }

    return entropy > 3.5 ? 'medium' : 'low';
  }
}
