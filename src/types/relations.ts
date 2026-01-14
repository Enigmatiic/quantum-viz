// =============================================================================
// TYPES DE RELATIONS - Catégories de relations entre éléments
// =============================================================================

/**
 * Types de relations entre noeuds
 */
export type RelationType =
  // Imports/Exports
  | 'imports'
  | 'exports'
  | 'reexports'
  // Hiérarchie
  | 'extends'
  | 'implements'
  | 'uses_trait'
  | 'contains'
  | 'contained_by'
  // Appels
  | 'calls'
  | 'called_by'
  | 'instantiates'
  | 'instantiated_by'
  // Variables
  | 'reads'
  | 'writes'
  | 'read_by'
  | 'written_by'
  // Types
  | 'uses_type'
  | 'returns_type'
  | 'param_type'
  // Exceptions
  | 'throws'
  | 'catches'
  // Async
  | 'awaits'
  | 'yields'
  // Décorateurs
  | 'decorates'
  | 'decorated_by'
  // Communication
  | 'http'
  | 'ipc'
  | 'event'
  | 'data_flow';

/**
 * Catégories de relations
 */
export const RELATION_CATEGORIES = {
  imports: ['imports', 'exports', 'reexports'],
  hierarchy: ['extends', 'implements', 'uses_trait', 'contains', 'contained_by'],
  calls: ['calls', 'called_by', 'instantiates', 'instantiated_by'],
  variables: ['reads', 'writes', 'read_by', 'written_by'],
  types: ['uses_type', 'returns_type', 'param_type'],
  exceptions: ['throws', 'catches'],
  async: ['awaits', 'yields'],
  decorators: ['decorates', 'decorated_by'],
  communication: ['http', 'ipc', 'event', 'data_flow']
} as const;

/**
 * Couleurs par type de relation (pour visualisation)
 */
export const RELATION_COLORS: Record<RelationType, string> = {
  imports: '#00ffff',
  exports: '#00ff88',
  reexports: '#88ffcc',
  extends: '#ff6600',
  implements: '#ff9900',
  uses_trait: '#ffcc00',
  contains: '#4444ff',
  contained_by: '#6666ff',
  calls: '#00ccff',
  called_by: '#0099ff',
  instantiates: '#ff44ff',
  instantiated_by: '#ff88ff',
  reads: '#44ff44',
  writes: '#ff4444',
  read_by: '#88ff88',
  written_by: '#ff8888',
  uses_type: '#aaaaff',
  returns_type: '#ccccff',
  param_type: '#8888ff',
  throws: '#ff0000',
  catches: '#00ff00',
  awaits: '#00ffcc',
  yields: '#ccff00',
  decorates: '#ff00ff',
  decorated_by: '#ff88ff',
  http: '#ff8800',
  ipc: '#88ff00',
  event: '#00ff88',
  data_flow: '#ffff00'
};
