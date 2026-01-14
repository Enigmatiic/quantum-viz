// =============================================================================
// VISUALIZATION TEMPLATES - Module Index
// =============================================================================

import type { AnalysisResult } from '../../types';

import {
  getLoadingOverlay,
  getTooltip,
  getContextMenu,
  getTopBar,
  getLeftPanel,
  getRightPanel,
  getBottomPanel,
  getShowAllButton,
  getKeyboardShortcutsModal,
  getControlsHelp,
  getThreeJsImports
} from './html';

// Re-export all HTML templates
export {
  getLoadingOverlay,
  getTooltip,
  getContextMenu,
  getTopBar,
  getLeftPanel,
  getRightPanel,
  getBottomPanel,
  getShowAllButton,
  getKeyboardShortcutsModal,
  getControlsHelp,
  getThreeJsImports
};

/**
 * Genere le body HTML complet
 */
export function getHtmlBody(analysis: AnalysisResult): string {
  return `
  ${getLoadingOverlay()}
  <div id="canvas-container"></div>
  ${getTooltip()}
  ${getContextMenu()}
  ${getTopBar(analysis)}
  ${getLeftPanel()}
  ${getRightPanel()}
  ${getBottomPanel()}
  ${getShowAllButton()}
  ${getKeyboardShortcutsModal()}
  ${getControlsHelp()}
  ${getThreeJsImports()}
  `;
}
