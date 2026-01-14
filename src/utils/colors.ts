// =============================================================================
// COLORS - Couleurs utilisées dans la visualisation
// =============================================================================

import type { NodeType, Layer } from '../types';

/**
 * Couleurs par type de noeud
 */
export const NODE_COLORS: Record<NodeType, { primary: string; secondary: string; emissive: string }> = {
  // L1 - System
  system: { primary: '#ffffff', secondary: '#ccccff', emissive: '#6666ff' },

  // L2 - Module
  module: { primary: '#00ffff', secondary: '#004455', emissive: '#003344' },

  // L3 - File
  file: { primary: '#00ff88', secondary: '#003322', emissive: '#002211' },

  // L4 - Types
  class: { primary: '#ff6600', secondary: '#442200', emissive: '#331100' },
  struct: { primary: '#ffaa00', secondary: '#443300', emissive: '#332200' },
  interface: { primary: '#ff00ff', secondary: '#440044', emissive: '#330033' },
  trait: { primary: '#aa00ff', secondary: '#330044', emissive: '#220033' },
  enum: { primary: '#ffff00', secondary: '#444400', emissive: '#333300' },
  type_alias: { primary: '#ccaaff', secondary: '#332244', emissive: '#221133' },

  // L5 - Functions
  function: { primary: '#00ccff', secondary: '#003344', emissive: '#002233' },
  method: { primary: '#0099ff', secondary: '#002244', emissive: '#001133' },
  constructor: { primary: '#ff4444', secondary: '#441111', emissive: '#330000' },
  closure: { primary: '#88ccff', secondary: '#223344', emissive: '#112233' },
  handler: { primary: '#ffcc00', secondary: '#443300', emissive: '#332200' },
  arrow: { primary: '#66aaff', secondary: '#223355', emissive: '#112244' },

  // L6 - Blocks
  block: { primary: '#666666', secondary: '#222222', emissive: '#111111' },
  conditional: { primary: '#ff8844', secondary: '#442211', emissive: '#331100' },
  loop: { primary: '#44ff88', secondary: '#114422', emissive: '#003311' },
  try_catch: { primary: '#ff4488', secondary: '#441122', emissive: '#330011' },
  match_arm: { primary: '#88ff44', secondary: '#224411', emissive: '#113300' },

  // L7 - Variables
  variable: { primary: '#88ff88', secondary: '#224422', emissive: '#113311' },
  constant: { primary: '#ff88ff', secondary: '#442244', emissive: '#331133' },
  parameter: { primary: '#aaaaff', secondary: '#333355', emissive: '#222244' },
  attribute: { primary: '#ffaa88', secondary: '#442211', emissive: '#331100' },
  property: { primary: '#88ffaa', secondary: '#224433', emissive: '#113322' }
};

/**
 * Couleurs par couche architecturale
 */
export const LAYER_COLORS: Record<Layer, { primary: string; background: string }> = {
  frontend: { primary: '#00ffff', background: '#003344' },
  backend: { primary: '#ff6600', background: '#442200' },
  sidecar: { primary: '#ffff00', background: '#444400' },
  data: { primary: '#00ff88', background: '#003322' },
  external: { primary: '#888888', background: '#222222' }
};

/**
 * Couleurs par sévérité d'issue
 */
export const SEVERITY_COLORS = {
  critical: '#ff0040',
  error: '#ff0040',
  high: '#ff6600',
  medium: '#ffcc00',
  warning: '#ffcc00',
  low: '#00ccff',
  info: '#888888'
};

/**
 * Obtenir la couleur pour un type de noeud
 */
export function getNodeColor(type: NodeType): { primary: string; secondary: string; emissive: string } {
  return NODE_COLORS[type] || { primary: '#888888', secondary: '#333333', emissive: '#111111' };
}

/**
 * Obtenir la couleur pour une couche
 */
export function getLayerColor(layer: Layer): { primary: string; background: string } {
  return LAYER_COLORS[layer] || { primary: '#888888', background: '#222222' };
}

/**
 * Convertir une couleur hex en RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convertir RGB en hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.min(255, Math.max(0, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Éclaircir une couleur
 */
export function lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  return rgbToHex(
    rgb.r + (255 - rgb.r) * amount,
    rgb.g + (255 - rgb.g) * amount,
    rgb.b + (255 - rgb.b) * amount
  );
}

/**
 * Assombrir une couleur
 */
export function darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  return rgbToHex(
    rgb.r * (1 - amount),
    rgb.g * (1 - amount),
    rgb.b * (1 - amount)
  );
}
