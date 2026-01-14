// =============================================================================
// TYPES D'ARETES - Relations entre éléments de code
// =============================================================================

import type { RelationType } from './relations';

/**
 * Localisation d'une relation
 */
export interface EdgeLocation {
  file: string;
  line: number;
}

/**
 * Arête/Relation entre noeuds
 */
export interface CodeEdge {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  location?: EdgeLocation;
  label?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Arête de composant (legacy)
 */
export interface ComponentEdge {
  source: string;
  target: string;
  type: RelationType;
  label?: string;
}
