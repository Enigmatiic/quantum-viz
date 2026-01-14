// =============================================================================
// TYPES DE NOEUDS - Définitions des éléments de code
// =============================================================================

import type { GranularityLevel, Visibility, Layer } from './base';

/**
 * Types de noeuds par niveau de granularité
 */
export type NodeType =
  // L1 - Système
  | 'system'
  // L2 - Module
  | 'module'
  // L3 - Fichier
  | 'file'
  // L4 - Types
  | 'class'
  | 'struct'
  | 'interface'
  | 'trait'
  | 'enum'
  | 'type_alias'
  // L5 - Fonctions
  | 'function'
  | 'method'
  | 'constructor'
  | 'closure'
  | 'handler'
  // L6 - Blocs
  | 'block'
  | 'conditional'
  | 'loop'
  | 'try_catch'
  | 'match_arm'
  // L7 - Variables
  | 'variable'
  | 'constant'
  | 'parameter'
  | 'attribute'
  | 'property';

/**
 * Localisation dans le code source
 */
export interface SourceLocation {
  file: string;
  line: number;
  endLine?: number;
  column?: number;
  endColumn?: number;
}

/**
 * Métriques d'un noeud
 */
export interface NodeMetrics {
  loc: number;           // Lignes de code
  complexity?: number;   // Complexité cyclomatique
  dependencies: number;  // Nombre de dépendances sortantes
  dependents: number;    // Nombre de dépendants
}

/**
 * Noeud de code principal (multi-niveaux)
 */
export interface CodeNode {
  id: string;
  level: GranularityLevel;
  type: NodeType;
  name: string;
  fullPath: string;          // Chemin complet (namespace.class.method)
  location: SourceLocation;
  visibility: Visibility;
  modifiers: string[];       // async, static, const, mut, pub, etc.
  signature?: string;        // Pour les fonctions: "fn(x: i32) -> bool"
  dataType?: string;         // Pour les variables: "string", "i32", etc.
  initialValue?: string;     // Pour les constantes (non sensibles)
  documentation?: string;
  layer?: Layer;
  metrics: NodeMetrics;
  children: string[];        // IDs des enfants
  parent?: string;           // ID du parent
  metadata?: Record<string, unknown>;
}

/**
 * Types de composants (legacy)
 */
export type ComponentType =
  | 'page'
  | 'component'
  | 'context'
  | 'hook'
  | 'store'
  | 'api'
  | 'command'
  | 'service'
  | 'model'
  | 'database'
  | 'client'
  | 'engine'
  | 'external';

/**
 * Noeud composant (legacy)
 */
export interface ComponentNode {
  id: string;
  label: string;
  type: ComponentType;
  layer: Layer;
  files: string[];
  metadata: Record<string, unknown>;
}
