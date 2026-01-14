// =============================================================================
// SECURITY CORE TYPES - Types partagés pour l'analyse de sécurité
// =============================================================================

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

export type SinkType =
  | 'sql_query'
  | 'command_exec'
  | 'file_operation'
  | 'html_injection'
  | 'url_fetch'
  | 'eval'
  | 'deserialization';

export type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type VulnerabilityCategory =
  | 'injection'
  | 'xss'
  | 'auth'
  | 'crypto'
  | 'secrets'
  | 'ssrf'
  | 'path_traversal'
  | 'command_injection'
  | 'deserialization'
  | 'xxe'
  | 'dos'
  | 'race_condition'
  | 'information_disclosure'
  | 'misconfig';

export type Language = 'typescript' | 'javascript' | 'python' | 'rust' | 'go' | 'java' | 'c' | 'cpp' | 'other';

export interface VulnerabilityLocation {
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

export interface SecurityVulnerability {
  id: string;
  title: string;
  description: string;
  severity: VulnerabilitySeverity;
  category: VulnerabilityCategory;
  location: VulnerabilityLocation;
  cwe?: string;
  owasp?: string;
  snippet?: string;
  recommendation?: string;
  references?: string[];
  confidence?: 'high' | 'medium' | 'low';
}

export interface TaintedVariable {
  name: string;
  source: TaintSource;
  declaredAt: { file: string; line: number };
  sanitizedAt?: { file: string; line: number; method: string };
  usedAt: Array<{ file: string; line: number; context: string }>;
}

export interface DataFlowPath {
  source: { variable: string; type: TaintSource; location: string };
  transformations: Array<{ operation: string; location: string }>;
  sink: { type: string; location: string; dangerous: boolean };
  sanitized: boolean;
  sanitizationMethod?: string;
}

export interface DangerousSink {
  type: SinkType;
  location: VulnerabilityLocation;
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
