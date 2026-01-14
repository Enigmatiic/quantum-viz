// =============================================================================
// VISUALIZATION SCRIPTS - Module Index
// =============================================================================

import { getColorSchemes } from './colors';
import { getStateInitialization } from './state';
import { getThreeJsSetup } from './three-setup';
import { getNodeCreation } from './nodes';
import { getEdgeCreation } from './edges';
import { getAnimationLoop } from './animation';
import { getMouseInteraction } from './interaction';
import { getContextMenuScript } from './context-menu';
import { getNavigation } from './navigation';
import { getUIUpdates } from './ui';
import { getTreeNavigation } from './tree';
import { getSearch } from './search';
import { getIssuesPanel } from './issues-panel';
import { getViewModes } from './view-modes';
import { getInitialization } from './init';

export interface ScriptConfig {
  edgeOpacity: number;
}

/**
 * Interface pour les donnees injectees dans le script
 */
export interface ScriptData {
  nodesData: string;
  edgesData: string;
  callGraphData: string;
  issuesData: string;
  securityData: string;
  statsData: string;
  layersData: string;
  dataFlowsData: string;
}

/**
 * Genere le script d'injection des donnees
 */
function getDataInjection(data: ScriptData): string {
  return `
    // ===========================================================================
    // DATA
    // ===========================================================================
    const nodesData = ${data.nodesData};
    const edgesData = ${data.edgesData};
    const callGraphData = ${data.callGraphData};
    const issuesData = ${data.issuesData};
    const securityData = ${data.securityData};
    const statsData = ${data.statsData};
    const layersData = ${data.layersData};
    const dataFlowsData = ${data.dataFlowsData};
  `;
}

/**
 * Genere l'ensemble du script JavaScript pour la visualisation 3D
 */
export function getAllScripts(config: ScriptConfig, data: ScriptData): string {
  return `
  <script>
    ${getDataInjection(data)}
    ${getStateInitialization()}
    ${getColorSchemes()}
    ${getThreeJsSetup()}
    ${getNodeCreation()}
    ${getEdgeCreation(config.edgeOpacity)}
    ${getAnimationLoop()}
    ${getMouseInteraction()}
    ${getContextMenuScript()}
    ${getNavigation()}
    ${getUIUpdates()}
    ${getTreeNavigation()}
    ${getSearch()}
    ${getIssuesPanel()}
    ${getViewModes()}
    ${getInitialization()}
  </script>
  `;
}

// Re-export individual functions for selective usage
export {
  getColorSchemes,
  getStateInitialization,
  getThreeJsSetup,
  getNodeCreation,
  getEdgeCreation,
  getAnimationLoop,
  getMouseInteraction,
  getContextMenuScript,
  getNavigation,
  getUIUpdates,
  getTreeNavigation,
  getSearch,
  getIssuesPanel,
  getViewModes,
  getInitialization
};
