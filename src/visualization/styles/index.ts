// =============================================================================
// VISUALIZATION STYLES - Module Index
// =============================================================================

import { getBaseStyles, type StyleConfig } from './base';
import { getTopBarStyles } from './top-bar';
import { getPanelStyles } from './panels';
import { getTreeStyles } from './tree';
import { getIssuesStyles } from './issues';
import { getUIElementsStyles } from './ui-elements';

export type { StyleConfig };

/**
 * Genere tous les styles CSS pour la visualisation 3D
 */
export function getAllStyles(config: StyleConfig): string {
  return `
    ${getBaseStyles(config)}
    ${getTopBarStyles()}
    ${getPanelStyles()}
    ${getTreeStyles()}
    ${getIssuesStyles()}
    ${getUIElementsStyles()}

    /* Loading overlay background from config */
    #loading-overlay {
      background: ${config.backgroundColor};
    }
  `;
}

// Re-export individual style functions for selective usage
export {
  getBaseStyles,
  getTopBarStyles,
  getPanelStyles,
  getTreeStyles,
  getIssuesStyles,
  getUIElementsStyles
};
