// =============================================================================
// SECURITY HELPERS - Fonctions utilitaires partagees
// =============================================================================

import type { Language, VulnerabilitySeverity } from './types';

// =============================================================================
// COMMENT DETECTION
// =============================================================================

/**
 * Verifie si une position dans le code est a l'interieur d'un commentaire
 */
export function isInComment(content: string, position: number, language: Language): boolean {
  const before = content.substring(Math.max(0, position - 500), position);

  // Single-line comments
  const lastNewline = before.lastIndexOf('\n');
  const currentLine = before.substring(lastNewline + 1);

  // Check for // comment (most languages)
  if (['typescript', 'javascript', 'rust', 'go', 'java', 'c', 'cpp'].includes(language)) {
    const singleLineComment = currentLine.lastIndexOf('//');
    if (singleLineComment !== -1 && currentLine.indexOf('"', singleLineComment) === -1) {
      return true;
    }
  }

  // Check for # comment (Python, Ruby, Shell)
  if (language === 'python') {
    const hashComment = currentLine.lastIndexOf('#');
    if (hashComment !== -1 && currentLine.indexOf('"', hashComment) === -1 && currentLine.indexOf("'", hashComment) === -1) {
      return true;
    }
  }

  // Multi-line comments /* */
  if (['typescript', 'javascript', 'rust', 'go', 'java', 'c', 'cpp'].includes(language)) {
    const blockStart = before.lastIndexOf('/*');
    const blockEnd = before.lastIndexOf('*/');
    if (blockStart > blockEnd) {
      return true;
    }
  }

  // Python docstrings
  if (language === 'python') {
    const tripleDouble = countOccurrences(before, '"""');
    const tripleSingle = countOccurrences(before, "'''");
    if (tripleDouble % 2 !== 0 || tripleSingle % 2 !== 0) {
      return true;
    }
  }

  return false;
}

/**
 * Verifie si une ligne est un commentaire complet
 */
export function isCommentLine(line: string, language: Language): boolean {
  const trimmed = line.trim();

  if (['typescript', 'javascript', 'rust', 'go', 'java', 'c', 'cpp'].includes(language)) {
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return true;
    }
  }

  if (language === 'python') {
    if (trimmed.startsWith('#') || trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// FILE CLASSIFICATION
// =============================================================================

/**
 * Verifie si un fichier est un fichier de test
 */
export function isTestFile(filePath: string): boolean {
  const testPatterns = [
    /(?:^|[/\\])test[s]?[/\\]/i,
    /(?:^|[/\\])__tests__[/\\]/i,
    /(?:^|[/\\])spec[s]?[/\\]/i,
    /(?:^|[/\\])testing[/\\]/i,
    /(?:^|[/\\])mock[s]?[/\\]/i,
    /(?:^|[/\\])fixture[s]?[/\\]/i,
    /\.test\.[jt]sx?$/i,
    /\.spec\.[jt]sx?$/i,
    /_test\.[jt]sx?$/i,
    /_spec\.[jt]sx?$/i,
    /test_[^/\\]+\.py$/i,
    /_test\.py$/i,
    /_test\.rs$/i,
    /_test\.go$/i,
  ];

  return testPatterns.some(pattern => pattern.test(filePath));
}

/**
 * Verifie si un fichier est un fichier d'exemple ou de documentation
 */
export function isExampleFile(filePath: string): boolean {
  const examplePatterns = [
    /(?:^|[/\\])examples?[/\\]/i,
    /(?:^|[/\\])samples?[/\\]/i,
    /(?:^|[/\\])demos?[/\\]/i,
    /(?:^|[/\\])docs?[/\\]/i,
    /\.example\./i,
    /\.sample\./i,
    /example[_-]/i,
    /sample[_-]/i,
  ];

  return examplePatterns.some(pattern => pattern.test(filePath));
}

/**
 * Verifie si un fichier est un fichier de configuration
 */
export function isConfigFile(filePath: string): boolean {
  const configPatterns = [
    /(?:^|[/\\])config[/\\]/i,
    /\.config\.[jt]s$/i,
    /\.conf$/i,
    /\.cfg$/i,
    /\.env\./i,
    /\.env$/i,
    /settings\.[jt]s$/i,
    /settings\.py$/i,
  ];

  return configPatterns.some(pattern => pattern.test(filePath));
}

/**
 * Verifie si un fichier est genere automatiquement
 */
export function isGeneratedFile(filePath: string): boolean {
  const generatedPatterns = [
    /(?:^|[/\\])node_modules[/\\]/i,
    /(?:^|[/\\])dist[/\\]/i,
    /(?:^|[/\\])build[/\\]/i,
    /(?:^|[/\\])target[/\\]/i,
    /(?:^|[/\\])vendor[/\\]/i,
    /(?:^|[/\\])\.next[/\\]/i,
    /(?:^|[/\\])__pycache__[/\\]/i,
    /\.min\.[jc]ss?$/i,
    /\.bundle\./i,
    /\.generated\./i,
    /\.g\.[jt]s$/i,
    /\.pb\.[jt]s$/i,
  ];

  return generatedPatterns.some(pattern => pattern.test(filePath));
}

// =============================================================================
// SQL HELPERS
// =============================================================================

/**
 * Verifie si une requete SQL utilise des parametres
 */
export function hasParameterizedQuery(line: string, language: Language): boolean {
  const paramPatterns: Record<Language, RegExp[]> = {
    typescript: [/\?\s*[,)]/, /\$\d+/, /:[\w]+/],
    javascript: [/\?\s*[,)]/, /\$\d+/, /:[\w]+/],
    python: [/%s/, /:\w+/, /\?/],
    rust: [/\$\d+/, /\?\s*[,)]/],
    go: [/\$\d+/, /\?\s*[,)]/],
    java: [/\?\s*[,)]/, /:\w+/],
    c: [/\?\s*[,)]/],
    cpp: [/\?\s*[,)]/],
    other: [/\?\s*[,)]/],
  };

  const patterns = paramPatterns[language] || paramPatterns.other;
  return patterns.some(pattern => pattern.test(line));
}

/**
 * Verifie si une requete utilise un ORM ou Query Builder
 */
export function usesQueryBuilder(line: string): boolean {
  const ormPatterns = [
    /\.where\s*\(/,
    /\.findOne\s*\(/,
    /\.findMany\s*\(/,
    /\.find\s*\(\s*\{/,
    /\.select\s*\(/,
    /\.insert\s*\(/,
    /\.update\s*\(\s*\{/,
    /\.delete\s*\(/,
    /Model\./,
    /prisma\./,
    /sequelize\./,
    /knex\./,
    /typeorm/i,
  ];

  return ormPatterns.some(pattern => pattern.test(line));
}

// =============================================================================
// ENTROPY CALCULATION
// =============================================================================

/**
 * Calcule l'entropie de Shannon pour detecter les secrets
 */
export function calculateEntropy(str: string): number {
  if (!str || str.length === 0) return 0;

  const freq = new Map<string, number>();
  for (const char of str) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }

  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Verifie si une chaine ressemble a un secret base sur l'entropie
 */
export function looksLikeSecret(value: string): boolean {
  if (value.length < 16) return false;

  const entropy = calculateEntropy(value);
  const hasUpperAndLower = /[a-z]/.test(value) && /[A-Z]/.test(value);
  const hasNumbers = /\d/.test(value);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);

  // High entropy (> 4) with mixed characters is likely a secret
  if (entropy > 4 && hasUpperAndLower && hasNumbers) return true;
  if (entropy > 4.5 && (hasUpperAndLower || hasNumbers)) return true;
  if (entropy > 5) return true;

  return false;
}

// =============================================================================
// SEVERITY HELPERS
// =============================================================================

/**
 * Reduit la severite d'une vulnerabilite (pour les fichiers de test)
 */
export function reduceSeverity(severity: VulnerabilitySeverity): VulnerabilitySeverity {
  const mapping: Record<VulnerabilitySeverity, VulnerabilitySeverity> = {
    critical: 'high',
    high: 'medium',
    medium: 'low',
    low: 'info',
    info: 'info',
  };
  return mapping[severity];
}

/**
 * Compare deux severites
 * Retourne > 0 si a est plus severe que b
 */
export function compareSeverity(a: VulnerabilitySeverity, b: VulnerabilitySeverity): number {
  const order: Record<VulnerabilitySeverity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    info: 0,
  };
  return order[a] - order[b];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function countOccurrences(str: string, substr: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(substr, pos)) !== -1) {
    count++;
    pos += substr.length;
  }
  return count;
}

/**
 * Extrait le contexte autour d'une ligne
 */
export function getLineContext(content: string, lineNumber: number, contextLines: number = 3): string[] {
  const lines = content.split('\n');
  const start = Math.max(0, lineNumber - contextLines - 1);
  const end = Math.min(lines.length, lineNumber + contextLines);
  return lines.slice(start, end);
}

/**
 * Detecte le langage a partir de l'extension de fichier
 */
export function detectLanguage(filePath: string): Language {
  const ext = filePath.split('.').pop()?.toLowerCase();

  const mapping: Record<string, Language> = {
    ts: 'typescript',
    tsx: 'typescript',
    mts: 'typescript',
    cts: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    py: 'python',
    pyw: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    hpp: 'cpp',
    hxx: 'cpp',
  };

  return mapping[ext || ''] || 'other';
}
