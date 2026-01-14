// =============================================================================
// VISUALISEUR 3D - RESEAU NEURONAL AVEC THREE.JS
// Navigation fluide, animations de flux de donnees, drill-down multi-niveaux
// =============================================================================

import type { AnalysisResult } from './types';
import type { SecurityReport } from './security-analyzer';
import { getAllStyles, type StyleConfig } from './visualization/styles';
import { getHtmlBody } from './visualization/templates';
import { getAllScripts, type ScriptConfig, type ScriptData } from './visualization/scripts';

export interface VisualizationConfig {
  enableParticles: boolean;
  enableBloom: boolean;
  particleSpeed: number;
  nodeScale: number;
  edgeOpacity: number;
  backgroundColor: string;
  highlightColor: string;
}

const DEFAULT_CONFIG: VisualizationConfig = {
  enableParticles: true,
  enableBloom: true,
  particleSpeed: 0.02,
  nodeScale: 1.0,
  edgeOpacity: 0.3,
  backgroundColor: '#0a0a0f',
  highlightColor: '#00ffff'
};

/**
 * Genere une visualisation HTML 3D complete du code analyse
 */
export function generate3DVisualization(
  analysis: AnalysisResult,
  securityReport?: SecurityReport,
  config: Partial<VisualizationConfig> = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Prepare data for injection into JavaScript
  const scriptData: ScriptData = {
    nodesData: JSON.stringify(analysis.nodes),
    edgesData: JSON.stringify(analysis.edges),
    callGraphData: JSON.stringify(analysis.callGraph),
    issuesData: JSON.stringify(analysis.issues),
    securityData: securityReport ? JSON.stringify(securityReport) : 'null',
    statsData: JSON.stringify(analysis.stats),
    layersData: JSON.stringify(analysis.layers),
    dataFlowsData: JSON.stringify(analysis.dataFlows)
  };

  // Style configuration
  const styleConfig: StyleConfig = {
    backgroundColor: cfg.backgroundColor,
    highlightColor: cfg.highlightColor
  };

  // Script configuration
  const scriptConfig: ScriptConfig = {
    edgeOpacity: cfg.edgeOpacity
  };

  // Generate complete HTML document
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quantum Viz 3D - ${analysis.meta.projectName}</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    ${getAllStyles(styleConfig)}
  </style>
</head>
<body>
  ${getHtmlBody(analysis)}
  ${getAllScripts(scriptConfig, scriptData)}
</body>
</html>`;
}
