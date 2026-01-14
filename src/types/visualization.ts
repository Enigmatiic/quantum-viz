// =============================================================================
// TYPES DE VISUALISATION - Configuration et état du visualiseur 3D
// =============================================================================

import type { CodeNode } from './nodes';

/**
 * Configuration de la visualisation
 */
export interface VisualizationConfig {
  enableParticles: boolean;
  enableBloom: boolean;
  particleSpeed: number;
  nodeScale: number;
  edgeOpacity: number;
  backgroundColor: string;
  highlightColor: string;
}

export const DEFAULT_VISUALIZATION_CONFIG: VisualizationConfig = {
  enableParticles: true,
  enableBloom: true,
  particleSpeed: 0.02,
  nodeScale: 1.0,
  edgeOpacity: 0.3,
  backgroundColor: '#0a0a0f',
  highlightColor: '#00ffff'
};

/**
 * Couleurs par type de noeud
 */
export interface NodeColors {
  primary: string;
  secondary: string;
  emissive: string;
}

export const NODE_TYPE_COLORS: Record<string, NodeColors> = {
  system: { primary: '#ffffff', secondary: '#ccccff', emissive: '#6666ff' },
  module: { primary: '#00ffff', secondary: '#004455', emissive: '#003344' },
  file: { primary: '#00ff88', secondary: '#003322', emissive: '#002211' },
  class: { primary: '#ff6600', secondary: '#442200', emissive: '#331100' },
  struct: { primary: '#ffaa00', secondary: '#443300', emissive: '#332200' },
  interface: { primary: '#ff00ff', secondary: '#440044', emissive: '#330033' },
  trait: { primary: '#aa00ff', secondary: '#330044', emissive: '#220033' },
  enum: { primary: '#ffff00', secondary: '#444400', emissive: '#333300' },
  function: { primary: '#00ccff', secondary: '#003344', emissive: '#002233' },
  method: { primary: '#0099ff', secondary: '#002244', emissive: '#001133' },
  constructor: { primary: '#ff4444', secondary: '#441111', emissive: '#330000' },
  variable: { primary: '#88ff88', secondary: '#224422', emissive: '#113311' },
  constant: { primary: '#ff88ff', secondary: '#442244', emissive: '#331133' }
};

/**
 * État de la vue 3D
 */
export interface ViewState {
  currentLevel: string;
  selectedNode: CodeNode | null;
  hoveredNode: CodeNode | null;
  focusedNode: CodeNode | null;
  hiddenNodes: Set<string>;
  lockedNodes: Set<string>;
  expandedNodes: Set<string>;
}

/**
 * Configuration de la physique des noeuds
 */
export interface PhysicsConfig {
  springStiffness: number;
  springDamping: number;
  velocityThreshold: number;
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  springStiffness: 0.08,
  springDamping: 0.85,
  velocityThreshold: 0.01
};

/**
 * État du drag & drop
 */
export interface DragState {
  isDragging: boolean;
  draggedNodeId: string | null;
  dragOffset: { x: number; y: number; z: number } | null;
}

/**
 * Options du menu contextuel
 */
export interface ContextMenuOption {
  id: string;
  label: string;
  icon: string;
  action: string;
  isDanger?: boolean;
  dividerBefore?: boolean;
}

export const CONTEXT_MENU_OPTIONS: ContextMenuOption[] = [
  { id: 'center', label: 'Centrer la vue', icon: '⊙', action: 'center' },
  { id: 'focus', label: 'Focus', icon: '◎', action: 'focus' },
  { id: 'drilldown', label: 'Drill-down', icon: '↘', action: 'drilldown' },
  { id: 'relations', label: 'Voir les relations', icon: '⟷', action: 'relations', dividerBefore: true },
  { id: 'dataflow', label: 'Voir le flux', icon: '→', action: 'dataflow' },
  { id: 'isolate', label: 'Isoler', icon: '◯', action: 'isolate' },
  { id: 'lock', label: 'Verrouiller position', icon: '📌', action: 'lock', dividerBefore: true },
  { id: 'reset', label: 'Réinitialiser position', icon: '↺', action: 'reset' },
  { id: 'copy', label: 'Copier le chemin', icon: '📋', action: 'copy', dividerBefore: true },
  { id: 'details', label: 'Voir les détails', icon: 'ℹ', action: 'details' },
  { id: 'hide', label: 'Masquer', icon: '👁', action: 'hide', isDanger: true, dividerBefore: true }
];

/**
 * Raccourcis clavier
 */
export interface KeyboardShortcut {
  key: string;
  description: string;
  action: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: '1-7', description: 'Changer de niveau (L1-L7)', action: 'setLevel' },
  { key: 'Escape', description: 'Réinitialiser la vue', action: 'resetView' },
  { key: 'Backspace', description: 'Remonter d\'un niveau', action: 'navigateUp' },
  { key: 'F', description: 'Focus sur le noeud sélectionné', action: 'focus' },
  { key: 'R', description: 'Réinitialiser toutes les positions', action: 'resetPositions' },
  { key: 'H', description: 'Masquer le noeud sélectionné', action: 'hide' },
  { key: 'A', description: 'Afficher tous les noeuds', action: 'showAll' },
  { key: 'I', description: 'Isoler le noeud sélectionné', action: 'isolate' },
  { key: 'L', description: 'Verrouiller/déverrouiller la position', action: 'lock' },
  { key: '?', description: 'Afficher les raccourcis', action: 'showShortcuts' }
];
