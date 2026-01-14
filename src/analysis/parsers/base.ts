// =============================================================================
// BASE PARSER - Types et interface commune pour tous les parseurs
// =============================================================================

import type {
  ImportInfo,
  ExportInfo,
  ClassInfo,
  FunctionInfo,
  VariableInfo,
  ParameterInfo,
  CallInfo,
  VariableUsageInfo,
  AttributeInfo,
  MethodInfo,
  Visibility,
  Language
} from '../../types';

// =============================================================================
// INTERFACE DU PARSEUR
// =============================================================================

export interface LanguageParser {
  readonly language: Language;
  extractImports(content: string): ImportInfo[];
  extractExports(content: string): ExportInfo[];
  extractClasses(content: string): ClassInfo[];
  extractFunctions(content: string): FunctionInfo[];
  extractVariables(content: string): VariableInfo[];
}

// =============================================================================
// HELPERS COMMUNS
// =============================================================================

/**
 * Trouve la fin d'un bloc { } depuis une position donnee
 */
export function findBlockEnd(content: string, startPosition: number): number {
  let depth = 0;
  let started = false;
  let lineNumber = content.substring(0, startPosition).split('\n').length;

  for (let i = startPosition; i < content.length; i++) {
    const char = content[i];
    if (char === '\n') lineNumber++;

    if (char === '{') {
      depth++;
      started = true;
    } else if (char === '}') {
      depth--;
      if (started && depth === 0) {
        return lineNumber;
      }
    }
  }

  return lineNumber;
}

/**
 * Trouve la fin d'une arrow function
 */
export function findArrowFunctionEnd(content: string, startPosition: number): number {
  const arrowPos = content.indexOf('=>', startPosition);
  if (arrowPos === -1) return content.substring(0, startPosition).split('\n').length;

  const afterArrow = content.substring(arrowPos + 2).trim();

  if (afterArrow.startsWith('{')) {
    return findBlockEnd(content, arrowPos + 2);
  }

  // Expression-body arrow function
  let depth = 0;
  let lineNumber = content.substring(0, arrowPos).split('\n').length;

  for (let i = arrowPos + 2; i < content.length; i++) {
    const char = content[i];
    if (char === '\n') lineNumber++;

    if (char === '(' || char === '[' || char === '{') depth++;
    else if (char === ')' || char === ']' || char === '}') depth--;
    else if ((char === ';' || char === ',' || char === '\n') && depth === 0) {
      return lineNumber;
    }
  }

  return lineNumber;
}

/**
 * Trouve la fin d'un bloc Python (base sur l'indentation)
 */
export function findPythonBlockEnd(content: string, startPosition: number): number {
  const lines = content.split('\n');
  const startLine = content.substring(0, startPosition).split('\n').length - 1;

  // Trouve l'indentation de la ligne de depart
  const startIndent = (lines[startLine].match(/^\s*/) || [''])[0].length;

  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // Ignore les lignes vides

    const indent = (line.match(/^\s*/) || [''])[0].length;
    if (indent <= startIndent) {
      return i;
    }
  }

  return lines.length;
}

/**
 * Obtient la position dans le texte a une ligne donnee
 */
export function getPositionAtLine(content: string, lineNumber: number): number {
  const lines = content.split('\n');
  let pos = 0;

  for (let i = 0; i < Math.min(lineNumber, lines.length); i++) {
    pos += lines[i].length + 1;
  }

  return pos;
}

/**
 * Decoupe une liste de parametres en respectant les parentheses
 */
export function splitParameters(params: string): string[] {
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

/**
 * Nettoie une valeur pour le stockage
 */
export function sanitizeValue(value: string): string {
  // Limite la longueur
  if (value.length > 100) {
    return value.substring(0, 97) + '...';
  }
  return value;
}

/**
 * Calcule la complexite cyclomatique d'un bloc de code
 */
export function calculateComplexity(body: string): number {
  let complexity = 1;

  // Compte les points de decision
  const patterns = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bwhile\b/g,
    /\bfor\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\?\?/g,
    /\|\|/g,
    /&&/g,
    /\?[^:]/g,
  ];

  for (const pattern of patterns) {
    const matches = body.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

/**
 * Extrait les usages de variables dans un corps de fonction
 */
export function extractVariableUsages(body: string, language: Language): VariableUsageInfo[] {
  const usages: VariableUsageInfo[] = [];
  const varRegex = /\b([a-zA-Z_]\w*)\b/g;
  const keywords = new Set([
    // JS/TS
    'const', 'let', 'var', 'function', 'class', 'return', 'if', 'else', 'while',
    'for', 'break', 'continue', 'switch', 'case', 'default', 'try', 'catch',
    'finally', 'throw', 'new', 'this', 'super', 'import', 'export', 'from',
    'async', 'await', 'yield', 'typeof', 'instanceof', 'in', 'of', 'true',
    'false', 'null', 'undefined', 'void', 'delete', 'interface', 'type',
    // Rust
    'fn', 'pub', 'mod', 'use', 'struct', 'enum', 'impl', 'trait', 'match',
    'loop', 'mut', 'ref', 'move', 'self', 'Self', 'dyn', 'where',
    // Python
    'def', 'and', 'or', 'not', 'is', 'None', 'True', 'False', 'pass',
    'with', 'as', 'assert', 'lambda', 'global', 'nonlocal', 'raise', 'except',
  ]);

  let match;
  while ((match = varRegex.exec(body)) !== null) {
    const name = match[1];
    if (keywords.has(name) || /^\d/.test(name)) continue;

    const line = body.substring(0, match.index).split('\n').length;
    const context = body.substring(Math.max(0, match.index - 20), match.index + name.length + 20).trim();

    // Determine si c'est une lecture ou ecriture
    const beforeChar = body.substring(Math.max(0, match.index - 3), match.index).trim();
    const afterChar = body.substring(match.index + name.length, match.index + name.length + 3).trim();
    const isWrite = afterChar.startsWith('=') && !afterChar.startsWith('==') && !afterChar.startsWith('=>');

    usages.push({
      name,
      line,
      operation: isWrite ? 'write' : 'read',
      scope: 'local',
      context,
    });
  }

  return usages;
}
