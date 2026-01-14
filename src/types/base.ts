// =============================================================================
// TYPES DE BASE - Granularité, Langages, Visibilité
// =============================================================================

/**
 * Niveaux de granularité d'analyse (L1-L7)
 */
export type GranularityLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';

export interface LevelInfo {
  name: string;
  description: string;
}

export const LEVELS: Record<GranularityLevel, LevelInfo> = {
  L1: { name: 'Système', description: 'Architecture globale' },
  L2: { name: 'Module', description: 'Répertoires/packages principaux' },
  L3: { name: 'Fichier', description: 'Fichiers source individuels' },
  L4: { name: 'Classe/Struct', description: 'Types, interfaces, classes' },
  L5: { name: 'Fonction/Méthode', description: 'Fonctions, méthodes, handlers' },
  L6: { name: 'Bloc', description: 'Blocs logiques, closures, conditions' },
  L7: { name: 'Variable', description: 'Variables, constantes, paramètres' }
};

/**
 * Visibilité des éléments de code
 */
export type Visibility = 'public' | 'private' | 'protected' | 'internal' | 'unknown';

/**
 * Langages supportés
 */
export type Language =
  | 'typescript'
  | 'javascript'
  | 'rust'
  | 'python'
  | 'yaml'
  | 'json'
  | 'html'
  | 'css'
  | 'toml'
  | 'unknown';

/**
 * Couches architecturales
 */
export type Layer = 'frontend' | 'backend' | 'sidecar' | 'data' | 'external';

export interface LayerInfo {
  id: Layer;
  label: string;
  color: string;
  description: string;
}
