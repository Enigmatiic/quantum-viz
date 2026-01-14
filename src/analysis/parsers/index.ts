// =============================================================================
// PARSEURS PAR LANGAGE - Module Index
// =============================================================================

import type { Language } from '../../types';

// Re-export base utilities and types
export * from './base';

// Export language-specific parsers
export { TypeScriptParser, typescriptParser, javascriptParser } from './typescript';
export { RustParser, rustParser } from './rust';
export { PythonParser, pythonParser } from './python';

// Import instances for factory
import { typescriptParser, javascriptParser } from './typescript';
import { rustParser } from './rust';
import { pythonParser } from './python';
import type { LanguageParser } from './base';

// =============================================================================
// PARSER FACTORY
// =============================================================================

const parsers: Record<string, LanguageParser> = {
  typescript: typescriptParser,
  javascript: javascriptParser,
  rust: rustParser,
  python: pythonParser,
};

/**
 * Retourne le parseur approprie pour un langage donne
 */
export function getParser(language: Language): LanguageParser | null {
  return parsers[language] || null;
}

/**
 * Verifie si un parseur existe pour le langage
 */
export function hasParser(language: Language): boolean {
  return language in parsers;
}

/**
 * Liste des langages supportes
 */
export function getSupportedLanguages(): Language[] {
  return Object.keys(parsers) as Language[];
}
