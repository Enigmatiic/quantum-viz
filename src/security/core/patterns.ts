// =============================================================================
// SECURITY PATTERNS - Source unique pour tous les patterns de detection
// =============================================================================

import type { TaintSource, SinkType } from './types';

// =============================================================================
// TAINT SOURCES - Sources de donnees non fiables
// =============================================================================

export const TAINT_SOURCES: Record<string, TaintSource> = {
  // JavaScript/TypeScript - Express
  'req.body': 'request.body',
  'req.query': 'request.query',
  'req.params': 'request.params',
  'req.headers': 'request.headers',
  'request.body': 'request.body',
  'request.query': 'request.query',
  'request.params': 'request.params',
  'request.headers': 'request.headers',

  // Koa/Fastify
  'ctx.request.body': 'request.body',
  'ctx.query': 'request.query',
  'ctx.params': 'request.params',

  // Environment/Args
  'process.argv': 'process.argv',
  'process.env': 'env',
  'Bun.argv': 'process.argv',
  'Bun.env': 'env',
  'Deno.args': 'process.argv',
  'Deno.env': 'env',

  // Python - Flask/Django
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

  // Go
  'r.URL.Query()': 'request.query',
  'r.FormValue': 'request.body',
  'r.PostFormValue': 'request.body',
  'os.Args': 'process.argv',
  'os.Getenv': 'env',
};

// =============================================================================
// DANGEROUS SINKS - Operations dangereuses
// =============================================================================

export const DANGEROUS_SINKS: Record<string, SinkType> = {
  // SQL
  'execute': 'sql_query',
  'query': 'sql_query',
  'raw': 'sql_query',
  'rawQuery': 'sql_query',
  'sequelize.query': 'sql_query',
  'knex.raw': 'sql_query',
  'prisma.$queryRaw': 'sql_query',
  'prisma.$executeRaw': 'sql_query',
  'cursor.execute': 'sql_query',
  'conn.execute': 'sql_query',
  'db.execute': 'sql_query',
  'sqlx.query': 'sql_query',

  // Command Execution
  'exec': 'command_exec',
  'execSync': 'command_exec',
  'spawn': 'command_exec',
  'spawnSync': 'command_exec',
  'child_process.exec': 'command_exec',
  'subprocess.run': 'command_exec',
  'subprocess.Popen': 'command_exec',
  'subprocess.call': 'command_exec',
  'os.system': 'command_exec',
  'os.popen': 'command_exec',
  'Bun.spawn': 'command_exec',
  'Bun.$': 'command_exec',
  'std::process::Command': 'command_exec',

  // File Operations
  'readFile': 'file_operation',
  'writeFile': 'file_operation',
  'readFileSync': 'file_operation',
  'writeFileSync': 'file_operation',
  'open': 'file_operation',
  'fs.read': 'file_operation',
  'fs.write': 'file_operation',
  'fs.unlink': 'file_operation',
  'fs.rmdir': 'file_operation',
  'os.remove': 'file_operation',
  'shutil.rmtree': 'file_operation',

  // HTML/XSS
  'innerHTML': 'html_injection',
  'outerHTML': 'html_injection',
  'document.write': 'html_injection',
  'dangerouslySetInnerHTML': 'html_injection',
  'v-html': 'html_injection',
  'render_template_string': 'html_injection',
  'Markup': 'html_injection',

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
  'reqwest::get': 'url_fetch',

  // Eval/Code Execution
  'eval': 'eval',
  'Function': 'eval',
  'setTimeout': 'eval',
  'setInterval': 'eval',
  'new Function': 'eval',
  'compile': 'eval',
  'py_exec': 'eval',

  // Deserialization
  'pickle.loads': 'deserialization',
  'yaml.load': 'deserialization',
  'yaml.unsafe_load': 'deserialization',
  'JSON.parse': 'deserialization',
  'unserialize': 'deserialization',
  'ObjectInputStream': 'deserialization',
};

// =============================================================================
// SANITIZATION METHODS - Methodes de sanitization connues
// =============================================================================

export const SANITIZATION_METHODS: Record<string, 'sql' | 'html' | 'url' | 'path' | 'command' | 'general'> = {
  // SQL
  'escape': 'sql',
  'escapeId': 'sql',
  'prepare': 'sql',
  'parameterize': 'sql',
  'quote': 'sql',
  'sanitize_sql': 'sql',

  // HTML/XSS
  'escapeHtml': 'html',
  'sanitize': 'html',
  'DOMPurify.sanitize': 'html',
  'xss': 'html',
  'encode': 'html',
  'htmlEscape': 'html',
  'bleach.clean': 'html',
  'html_escape': 'html',

  // URL
  'encodeURIComponent': 'url',
  'encodeURI': 'url',
  'url_encode': 'url',
  'quote_plus': 'url',

  // Path
  'path.normalize': 'path',
  'path.resolve': 'path',
  'path.join': 'path',
  'realpath': 'path',
  'basename': 'path',

  // Command
  'shellescape': 'command',
  'shlex.quote': 'command',

  // General
  'validate': 'general',
  'parseInt': 'general',
  'Number': 'general',
  'String': 'general',
  'trim': 'general',
};

// =============================================================================
// SECRET PATTERNS - Patterns pour detecter les secrets
// =============================================================================

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  entropy?: number;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  // API Keys
  { name: 'AWS Access Key', pattern: /(?:AKIA|ABIA|ACCA)[A-Z0-9]{16}/gi, severity: 'critical' },
  { name: 'AWS Secret Key', pattern: /aws[_-]?secret[_-]?access[_-]?key\s*[=:]\s*['"][A-Za-z0-9/+=]{40}['"]/gi, severity: 'critical' },
  { name: 'Google API Key', pattern: /AIza[0-9A-Za-z_-]{35}/gi, severity: 'high' },
  { name: 'GitHub Token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/gi, severity: 'critical' },
  { name: 'GitLab Token', pattern: /glpat-[A-Za-z0-9_-]{20,}/gi, severity: 'critical' },
  { name: 'Slack Token', pattern: /xox[baprs]-[0-9A-Za-z-]{24,}/gi, severity: 'high' },
  { name: 'Stripe Key', pattern: /sk_live_[0-9a-zA-Z]{24,}/gi, severity: 'critical' },
  { name: 'Stripe Publishable', pattern: /pk_live_[0-9a-zA-Z]{24,}/gi, severity: 'medium' },
  { name: 'Anthropic API Key', pattern: /sk-ant-[a-zA-Z0-9_-]{40,}/gi, severity: 'critical' },
  { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{48}/gi, severity: 'critical' },

  // Tokens/Passwords
  { name: 'Generic API Key', pattern: /api[_-]?key\s*[=:]\s*['"][A-Za-z0-9_-]{20,}['"]/gi, severity: 'high' },
  { name: 'Generic Secret', pattern: /secret[_-]?key?\s*[=:]\s*['"][A-Za-z0-9_-]{20,}['"]/gi, severity: 'high' },
  { name: 'Generic Token', pattern: /token\s*[=:]\s*['"][A-Za-z0-9_.-]{20,}['"]/gi, severity: 'high' },
  { name: 'Password in Code', pattern: /password\s*[=:]\s*['"][^'"]{8,}['"]/gi, severity: 'high' },
  { name: 'Private Key', pattern: /-----BEGIN\s+(RSA|DSA|EC|OPENSSH|PRIVATE)\s+.*KEY-----/gi, severity: 'critical' },
  { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/gi, severity: 'high' },

  // Database
  { name: 'MongoDB URI', pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\s'"]+/gi, severity: 'critical' },
  { name: 'PostgreSQL URI', pattern: /postgres(ql)?:\/\/[^:]+:[^@]+@[^\s'"]+/gi, severity: 'critical' },
  { name: 'MySQL URI', pattern: /mysql:\/\/[^:]+:[^@]+@[^\s'"]+/gi, severity: 'critical' },
  { name: 'Redis URI', pattern: /redis:\/\/[^:]+:[^@]+@[^\s'"]+/gi, severity: 'high' },
];

// =============================================================================
// VULNERABILITY PATTERNS - Patterns pour detecter les vulnerabilites
// =============================================================================

export interface VulnerabilityPattern {
  name: string;
  category: string;
  patterns: RegExp[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  cwe?: string;
  owasp?: string;
}

export const VULNERABILITY_PATTERNS: VulnerabilityPattern[] = [
  {
    name: 'SQL Injection',
    category: 'injection',
    patterns: [
      /query\s*\(\s*`[^`]*\$\{/gi,
      /query\s*\(\s*['"][^'"]*['"]\s*\+/gi,
      /execute\s*\(\s*['"].*\+.*['"].*\)/gi,
      /cursor\.execute\s*\(\s*f['"]/gi,
      /\.raw\s*\(\s*`[^`]*\$\{/gi,
    ],
    severity: 'critical',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
  },
  {
    name: 'Command Injection',
    category: 'command_injection',
    patterns: [
      /exec\s*\(\s*`[^`]*\$\{/gi,
      /exec\s*\(\s*['"][^'"]*['"]\s*\+/gi,
      /spawn\s*\(\s*[^,]+,\s*\[.*\$\{/gi,
      /os\.system\s*\(\s*f?['"]/gi,
      /subprocess\..*\(.*shell\s*=\s*True/gi,
    ],
    severity: 'critical',
    cwe: 'CWE-78',
    owasp: 'A03:2021',
  },
  {
    name: 'XSS',
    category: 'xss',
    patterns: [
      /innerHTML\s*=\s*[^;]*\$\{/gi,
      /dangerouslySetInnerHTML\s*=\s*\{\s*\{/gi,
      /v-html\s*=\s*['"]/gi,
      /document\.write\s*\([^)]*\+/gi,
    ],
    severity: 'high',
    cwe: 'CWE-79',
    owasp: 'A03:2021',
  },
  {
    name: 'Path Traversal',
    category: 'path_traversal',
    patterns: [
      /readFile.*\$\{.*\}/gi,
      /readFileSync.*\+/gi,
      /path\.join\s*\([^)]*req\./gi,
      /open\s*\(\s*f?['"][^'"]*\{/gi,
    ],
    severity: 'high',
    cwe: 'CWE-22',
    owasp: 'A01:2021',
  },
  {
    name: 'Insecure Deserialization',
    category: 'deserialization',
    patterns: [
      /pickle\.loads?\s*\(/gi,
      /yaml\.load\s*\([^)]*\)(?!\s*,\s*Loader)/gi,
      /yaml\.unsafe_load/gi,
      /unserialize\s*\(\s*\$/gi,
    ],
    severity: 'high',
    cwe: 'CWE-502',
    owasp: 'A08:2021',
  },
  {
    name: 'Hardcoded Credentials',
    category: 'secrets',
    patterns: [
      /password\s*[=:]\s*['"][^'"]{4,}['"]/gi,
      /secret\s*[=:]\s*['"][^'"]{8,}['"]/gi,
      /api[_-]?key\s*[=:]\s*['"][^'"]{16,}['"]/gi,
    ],
    severity: 'high',
    cwe: 'CWE-798',
    owasp: 'A07:2021',
  },
  {
    name: 'Weak Cryptography',
    category: 'crypto',
    patterns: [
      /createHash\s*\(\s*['"]md5['"]\)/gi,
      /createHash\s*\(\s*['"]sha1['"]\)/gi,
      /DES|3DES|RC4|RC2/gi,
      /hashlib\.md5/gi,
      /hashlib\.sha1/gi,
    ],
    severity: 'medium',
    cwe: 'CWE-327',
    owasp: 'A02:2021',
  },
];
