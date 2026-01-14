// =============================================================================
// COLOR SCHEMES - Palettes de couleurs pour la visualisation 3D
// =============================================================================

/**
 * Genere le script des schemas de couleurs
 */
export function getColorSchemes(): string {
  return `
    // ===========================================================================
    // COLOR SCHEMES
    // ===========================================================================
    const nodeColors = {
      system: 0x00ffff,
      module: 0x00ff88,
      file: 0x4488ff,
      class: 0xff8800,
      struct: 0xff6600,
      interface: 0xcc66ff,
      trait: 0xaa44ff,
      enum: 0xff66cc,
      type_alias: 0x8888ff,
      function: 0x00ccff,
      method: 0x00aaff,
      constructor: 0xff4400,
      closure: 0x66ccff,
      arrow: 0x44aaff,
      handler: 0x00ffaa,
      block: 0x666688,
      conditional: 0x888866,
      loop: 0x668866,
      variable: 0xaaaaaa,
      constant: 0xffcc00,
      parameter: 0x88aacc,
      attribute: 0xcc8844,
      property: 0xaa8866
    };

    const layerColors = {
      frontend: 0x2196F3,
      backend: 0xFF9800,
      sidecar: 0x4CAF50,
      data: 0x9C27B0,
      external: 0x607D8B
    };

    const severityColors = {
      critical: 0xff0040,
      high: 0xff6600,
      medium: 0xffcc00,
      low: 0x00ccff,
      info: 0x888888
    };
  `;
}
