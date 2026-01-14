// =============================================================================
// VISUALISEUR 3D - RÉSEAU NEURONAL AVEC THREE.JS
// Navigation fluide, animations de flux de données, drill-down multi-niveaux
// =============================================================================

import type { AnalysisResult, CodeNode, CodeEdge, GranularityLevel } from './types';
import type { SecurityReport, SecurityVulnerability } from './security-analyzer';

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

export function generate3DVisualization(
  analysis: AnalysisResult,
  securityReport?: SecurityReport,
  config: Partial<VisualizationConfig> = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Prepare data for visualization
  const nodesData = JSON.stringify(analysis.nodes);
  const edgesData = JSON.stringify(analysis.edges);
  const callGraphData = JSON.stringify(analysis.callGraph);
  const issuesData = JSON.stringify(analysis.issues);
  const securityData = securityReport ? JSON.stringify(securityReport) : 'null';
  const statsData = JSON.stringify(analysis.stats);
  const layersData = JSON.stringify(analysis.layers);
  const dataFlowsData = JSON.stringify(analysis.dataFlows);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quantum Viz 3D - ${analysis.meta.projectName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      background: ${cfg.backgroundColor};
      color: #e0e0e0;
      overflow: hidden;
      height: 100vh;
    }

    #canvas-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
    }

    /* HUD Overlay */
    .hud {
      position: fixed;
      z-index: 100;
      pointer-events: none;
    }

    .hud > * {
      pointer-events: auto;
    }

    /* Top Bar */
    #top-bar {
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 25px;
      background: linear-gradient(to bottom, rgba(10,10,15,0.95), rgba(10,10,15,0));
    }

    .project-info {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .project-name {
      font-size: 24px;
      font-weight: bold;
      background: linear-gradient(135deg, #00ffff, #00ff88);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 30px rgba(0,255,255,0.3);
    }

    .stats-mini {
      display: flex;
      gap: 20px;
      font-size: 12px;
      color: #888;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .stat-value {
      color: #00ffff;
      font-weight: bold;
    }

    /* Level Selector */
    #level-selector {
      display: flex;
      gap: 5px;
      background: rgba(20,20,30,0.8);
      padding: 8px 12px;
      border-radius: 25px;
      border: 1px solid rgba(0,255,255,0.2);
    }

    .level-btn {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      color: #888;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      transition: all 0.3s ease;
    }

    .level-btn:hover {
      background: rgba(0,255,255,0.2);
      color: #00ffff;
      transform: scale(1.1);
    }

    .level-btn.active {
      background: linear-gradient(135deg, #00ffff, #00ff88);
      color: #000;
      box-shadow: 0 0 20px rgba(0,255,255,0.5);
    }

    /* View Mode Toggle */
    #view-modes {
      display: flex;
      gap: 10px;
    }

    .view-btn {
      padding: 8px 16px;
      border: 1px solid rgba(0,255,255,0.3);
      border-radius: 20px;
      background: rgba(20,20,30,0.8);
      color: #888;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.3s ease;
    }

    .view-btn:hover, .view-btn.active {
      border-color: #00ffff;
      color: #00ffff;
      box-shadow: 0 0 15px rgba(0,255,255,0.3);
    }

    .view-btn.reset-btn {
      border-color: rgba(255,136,0,0.5);
      color: #ff8800;
    }

    .view-btn.reset-btn:hover {
      border-color: #ff8800;
      background: rgba(255,136,0,0.2);
      box-shadow: 0 0 15px rgba(255,136,0,0.3);
    }

    .view-btn.filter-btn {
      border-color: rgba(255,0,64,0.5);
      color: #ff4488;
    }

    .view-btn.filter-btn:hover {
      border-color: #ff4488;
      background: rgba(255,0,64,0.2);
      box-shadow: 0 0 15px rgba(255,0,64,0.3);
    }

    .view-btn.filter-btn.active {
      border-color: #ff0040;
      color: #ff0040;
      background: rgba(255,0,64,0.3);
      box-shadow: 0 0 20px rgba(255,0,64,0.5);
    }

    /* Left Panel - Navigation */
    #left-panel {
      top: 80px;
      left: 20px;
      bottom: 20px;
      width: 300px;
    }

    .panel {
      background: rgba(15,15,25,0.9);
      border: 1px solid rgba(0,255,255,0.15);
      border-radius: 12px;
      backdrop-filter: blur(10px);
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border-bottom: 1px solid rgba(0,255,255,0.1);
      background: rgba(0,255,255,0.05);
    }

    .panel-title {
      font-size: 14px;
      font-weight: bold;
      color: #00ffff;
    }

    .panel-content {
      padding: 15px;
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }

    .panel-content::-webkit-scrollbar {
      width: 6px;
    }

    .panel-content::-webkit-scrollbar-track {
      background: rgba(0,0,0,0.3);
    }

    .panel-content::-webkit-scrollbar-thumb {
      background: rgba(0,255,255,0.3);
      border-radius: 3px;
    }

    /* Breadcrumb */
    #breadcrumb {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .breadcrumb-item {
      padding: 4px 10px;
      background: rgba(0,255,255,0.1);
      border-radius: 12px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .breadcrumb-item:hover {
      background: rgba(0,255,255,0.3);
    }

    .breadcrumb-separator {
      color: #444;
    }

    /* Tree View - Hierarchical Navigation */
    .node-tree {
      font-size: 12px;
      user-select: none;
    }

    .tree-item {
      /* Container for each tree node */
    }

    .tree-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      margin: 1px 0;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      border-left: 2px solid transparent;
    }

    .tree-row:hover {
      background: rgba(0,255,255,0.08);
    }

    .tree-row.selected {
      background: rgba(0,255,255,0.15);
      border-left-color: #00ffff;
    }

    .tree-toggle {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: #666;
      flex-shrink: 0;
      border-radius: 3px;
      transition: all 0.15s;
    }

    .tree-toggle:hover {
      background: rgba(0,255,255,0.2);
      color: #00ffff;
    }

    .tree-toggle.collapsed {
      color: #888;
    }

    .tree-toggle.expanded {
      color: #00ffff;
    }

    .tree-toggle.leaf {
      color: #444;
      font-size: 6px;
    }

    .tree-icon {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      flex-shrink: 0;
    }

    .tree-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #ccc;
    }

    .tree-row:hover .tree-label {
      color: #fff;
    }

    .tree-row.selected .tree-label {
      color: #00ffff;
    }

    .tree-badge {
      background: rgba(255,255,255,0.1);
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 9px;
      color: #888;
      flex-shrink: 0;
    }

    .tree-children {
      border-left: 1px solid rgba(255,255,255,0.08);
      margin-left: 11px;
    }

    /* Folder/File specific styles */
    .tree-row[data-type="module"] .tree-label,
    .tree-row[data-type="system"] .tree-label {
      font-weight: 500;
    }

    /* Right Panel - Details */
    #right-panel {
      top: 80px;
      right: 20px;
      bottom: 20px;
      width: 350px;
    }

    .detail-section {
      margin-bottom: 20px;
    }

    .detail-label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }

    .detail-value {
      font-size: 13px;
      color: #e0e0e0;
    }

    .detail-code {
      background: rgba(0,0,0,0.3);
      padding: 10px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      overflow-x: auto;
      white-space: pre;
    }

    /* Metrics Display */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .metric-card {
      background: rgba(0,0,0,0.2);
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }

    .metric-value {
      font-size: 24px;
      font-weight: bold;
      background: linear-gradient(135deg, #00ffff, #00ff88);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .metric-label {
      font-size: 10px;
      color: #666;
      margin-top: 5px;
    }

    /* Bottom Panel - Issues */
    #bottom-panel {
      bottom: 20px;
      left: 340px;
      right: 390px;
    }

    .issues-container {
      max-height: 250px;
      overflow-y: auto;
    }

    .issue-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      margin-bottom: 8px;
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border-left: 3px solid transparent;
    }

    .issue-item:hover {
      background: rgba(0,0,0,0.4);
    }

    .issue-item.critical { border-left-color: #ff0040; }
    .issue-item.high { border-left-color: #ff6600; }
    .issue-item.medium { border-left-color: #ffcc00; }
    .issue-item.low { border-left-color: #00ccff; }
    .issue-item.info { border-left-color: #888; }

    .issue-severity {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 5px;
    }

    .issue-severity.critical { background: #ff0040; box-shadow: 0 0 10px #ff0040; }
    .issue-severity.high { background: #ff6600; box-shadow: 0 0 10px #ff6600; }
    .issue-severity.medium { background: #ffcc00; }
    .issue-severity.low { background: #00ccff; }
    .issue-severity.info { background: #888; }

    .issue-content {
      flex: 1;
    }

    .issue-title {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .issue-location {
      font-size: 11px;
      color: #666;
    }

    /* Security Summary */
    .security-summary {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .severity-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: bold;
    }

    .severity-badge.critical { background: rgba(255,0,64,0.2); color: #ff0040; }
    .severity-badge.high { background: rgba(255,102,0,0.2); color: #ff6600; }
    .severity-badge.medium { background: rgba(255,204,0,0.2); color: #ffcc00; }
    .severity-badge.low { background: rgba(0,204,255,0.2); color: #00ccff; }

    /* Minimap */
    #minimap {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 200px;
      height: 150px;
      background: rgba(15,15,25,0.9);
      border: 1px solid rgba(0,255,255,0.2);
      border-radius: 8px;
      z-index: 100;
    }

    /* Search */
    #search-container {
      position: relative;
      margin-bottom: 15px;
    }

    #search-input {
      width: 100%;
      padding: 10px 15px;
      padding-left: 35px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(0,255,255,0.2);
      border-radius: 20px;
      color: #e0e0e0;
      font-size: 13px;
      outline: none;
      transition: all 0.3s;
    }

    #search-input:focus {
      border-color: #00ffff;
      box-shadow: 0 0 15px rgba(0,255,255,0.2);
    }

    #search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #666;
    }

    #search-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: rgba(15,15,25,0.98);
      border: 1px solid rgba(0,255,255,0.2);
      border-radius: 8px;
      max-height: 300px;
      overflow-y: auto;
      display: none;
      z-index: 1000;
    }

    #search-results.active {
      display: block;
    }

    .search-result {
      padding: 10px 15px;
      cursor: pointer;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      transition: background 0.2s;
    }

    .search-result:hover {
      background: rgba(0,255,255,0.1);
    }

    .search-result-type {
      font-size: 10px;
      color: #00ffff;
      text-transform: uppercase;
    }

    .search-result-name {
      font-size: 13px;
      margin-top: 2px;
    }

    .search-result-path {
      font-size: 10px;
      color: #666;
      margin-top: 2px;
    }

    /* Controls Help */
    #controls-help {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 20px;
      background: rgba(15,15,25,0.9);
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 11px;
      color: #666;
      z-index: 100;
    }

    .control-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .control-key {
      background: rgba(255,255,255,0.1);
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
    }

    /* Tooltips */
    #tooltip {
      position: fixed;
      background: rgba(10,10,15,0.95);
      border: 1px solid rgba(0,255,255,0.3);
      border-radius: 8px;
      padding: 12px;
      max-width: 300px;
      font-size: 12px;
      z-index: 10000;
      pointer-events: none;
      display: none;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }

    #tooltip.visible {
      display: block;
    }

    .tooltip-title {
      font-weight: bold;
      color: #00ffff;
      margin-bottom: 8px;
    }

    .tooltip-info {
      color: #888;
      margin: 4px 0;
    }

    /* Loading Overlay */
    #loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: ${cfg.backgroundColor};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      transition: opacity 0.5s;
    }

    #loading-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .loading-spinner {
      width: 60px;
      height: 60px;
      border: 3px solid rgba(0,255,255,0.1);
      border-top-color: #00ffff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-text {
      margin-top: 20px;
      font-size: 14px;
      color: #00ffff;
    }

    /* Animations */
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes glow {
      0%, 100% { box-shadow: 0 0 5px currentColor; }
      50% { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
    }

    /* Collapsible panels */
    .panel-header .collapse-btn {
      background: none;
      border: none;
      color: #888;
      cursor: pointer;
      font-size: 14px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .panel-header .collapse-btn:hover {
      background: rgba(0,255,255,0.1);
      color: #00ffff;
    }

    .panel.collapsed .panel-content {
      display: none;
    }

    .panel.collapsed .collapse-btn {
      transform: rotate(-90deg);
    }

    /* Context Menu */
    #context-menu {
      position: fixed;
      background: rgba(15,15,25,0.98);
      border: 1px solid rgba(0,255,255,0.3);
      border-radius: 8px;
      min-width: 200px;
      padding: 6px 0;
      z-index: 10001;
      display: none;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
    }

    #context-menu.visible {
      display: block;
    }

    .context-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      cursor: pointer;
      font-size: 13px;
      color: #ccc;
      transition: all 0.15s;
    }

    .context-menu-item:hover {
      background: rgba(0,255,255,0.15);
      color: #fff;
    }

    .context-menu-item .icon {
      width: 18px;
      text-align: center;
      font-size: 14px;
    }

    .context-menu-item.danger {
      color: #ff6666;
    }

    .context-menu-item.danger:hover {
      background: rgba(255,100,100,0.15);
    }

    .context-menu-divider {
      height: 1px;
      background: rgba(255,255,255,0.1);
      margin: 6px 0;
    }

    .context-menu-header {
      padding: 8px 16px;
      font-size: 11px;
      color: #00ffff;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 6px;
    }

    /* Bottom panel improvements */
    #bottom-panel {
      transition: all 0.3s ease;
    }

    #bottom-panel.collapsed {
      bottom: -200px;
    }

    #bottom-panel .panel {
      position: relative;
    }

    #bottom-panel .expand-tab {
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15,15,25,0.95);
      border: 1px solid rgba(0,255,255,0.2);
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      padding: 6px 20px;
      cursor: pointer;
      color: #888;
      font-size: 12px;
      transition: all 0.2s;
      display: none;
    }

    #bottom-panel.collapsed .expand-tab {
      display: block;
    }

    #bottom-panel .expand-tab:hover {
      color: #00ffff;
      background: rgba(0,255,255,0.1);
    }

    /* Notification animation */
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
      15% { opacity: 1; transform: translateX(-50%) translateY(0); }
      85% { opacity: 1; transform: translateX(-50%) translateY(0); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    }

    /* Show all button */
    .show-all-btn {
      position: fixed;
      top: 80px;
      right: 390px;
      background: rgba(255,136,0,0.2);
      border: 1px solid rgba(255,136,0,0.5);
      color: #ff8800;
      padding: 8px 16px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 12px;
      z-index: 100;
      display: none;
      transition: all 0.2s;
    }

    .show-all-btn:hover {
      background: rgba(255,136,0,0.3);
      box-shadow: 0 0 15px rgba(255,136,0,0.3);
    }

    .show-all-btn.visible {
      display: block;
    }

    /* Locked node indicator */
    .tree-row.locked::after {
      content: '📌';
      margin-left: auto;
      font-size: 10px;
    }

    /* Keyboard shortcuts modal */
    #shortcuts-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(15,15,25,0.98);
      border: 1px solid rgba(0,255,255,0.3);
      border-radius: 12px;
      padding: 24px;
      z-index: 10003;
      display: none;
      min-width: 400px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }

    #shortcuts-modal.visible {
      display: block;
    }

    #shortcuts-modal h3 {
      color: #00ffff;
      margin-bottom: 20px;
      font-size: 16px;
    }

    .shortcut-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .shortcut-key {
      background: rgba(255,255,255,0.1);
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      color: #00ffff;
    }

    .shortcut-desc {
      color: #888;
      font-size: 13px;
    }

    /* Minimap toggle */
    #minimap-toggle {
      position: fixed;
      bottom: 180px;
      right: 20px;
      background: rgba(15,15,25,0.9);
      border: 1px solid rgba(0,255,255,0.2);
      color: #888;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 11px;
      z-index: 100;
      transition: all 0.2s;
    }

    #minimap-toggle:hover {
      color: #00ffff;
      border-color: #00ffff;
    }

    /* Tab switching */
    .tab-container {
      display: flex;
      border-bottom: 1px solid rgba(0,255,255,0.1);
    }

    .tab-btn {
      flex: 1;
      padding: 10px;
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      color: #00ffff;
      background: rgba(0,255,255,0.05);
    }

    .tab-btn.active {
      color: #00ffff;
      border-bottom: 2px solid #00ffff;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }
  </style>
</head>
<body>
  <div id="loading-overlay">
    <div class="loading-spinner"></div>
    <div class="loading-text">Initializing Neural Network...</div>
  </div>

  <div id="canvas-container"></div>

  <div id="tooltip">
    <div class="tooltip-title"></div>
    <div class="tooltip-info type"></div>
    <div class="tooltip-info location"></div>
    <div class="tooltip-info metrics"></div>
  </div>

  <!-- Context Menu -->
  <div id="context-menu">
    <div class="context-menu-header" id="context-menu-title">Node</div>
    <div class="context-menu-item" onclick="contextAction('center')">
      <span class="icon">⊙</span>
      <span>Centrer la vue</span>
    </div>
    <div class="context-menu-item" onclick="contextAction('focus')">
      <span class="icon">🎯</span>
      <span>Focus (zoom)</span>
    </div>
    <div class="context-menu-item" onclick="contextAction('drilldown')">
      <span class="icon">⤵</span>
      <span>Drill-down (enfants)</span>
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" onclick="contextAction('relations')">
      <span class="icon">🔗</span>
      <span>Voir les relations</span>
    </div>
    <div class="context-menu-item" onclick="contextAction('dataflow')">
      <span class="icon">⇢</span>
      <span>Voir le flux de données</span>
    </div>
    <div class="context-menu-item" onclick="contextAction('isolate')">
      <span class="icon">◎</span>
      <span>Isoler ce nœud</span>
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" onclick="contextAction('lock')">
      <span class="icon">📌</span>
      <span>Verrouiller la position</span>
    </div>
    <div class="context-menu-item" onclick="contextAction('reset')">
      <span class="icon">↺</span>
      <span>Reset position</span>
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" onclick="contextAction('copy')">
      <span class="icon">📋</span>
      <span>Copier le chemin</span>
    </div>
    <div class="context-menu-item" onclick="contextAction('details')">
      <span class="icon">📄</span>
      <span>Voir les détails</span>
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item danger" onclick="contextAction('hide')">
      <span class="icon">👁</span>
      <span>Masquer ce nœud</span>
    </div>
  </div>

  <!-- Top Bar -->
  <div class="hud" id="top-bar">
    <div class="project-info">
      <div class="project-name">${analysis.meta.projectName}</div>
      <div class="stats-mini">
        <div class="stat-item">
          <span>📁</span>
          <span class="stat-value">${analysis.stats.totalFiles}</span>
          <span>fichiers</span>
        </div>
        <div class="stat-item">
          <span>📝</span>
          <span class="stat-value">${analysis.stats.totalLines.toLocaleString()}</span>
          <span>lignes</span>
        </div>
        <div class="stat-item">
          <span>🧩</span>
          <span class="stat-value">${analysis.nodes.length.toLocaleString()}</span>
          <span>noeuds</span>
        </div>
        <div class="stat-item">
          <span>🔗</span>
          <span class="stat-value">${analysis.edges.length.toLocaleString()}</span>
          <span>relations</span>
        </div>
      </div>
    </div>

    <div id="level-selector">
      <button class="level-btn active" data-level="L1" title="Système">1</button>
      <button class="level-btn" data-level="L2" title="Module">2</button>
      <button class="level-btn" data-level="L3" title="Fichier">3</button>
      <button class="level-btn" data-level="L4" title="Classe">4</button>
      <button class="level-btn" data-level="L5" title="Fonction">5</button>
      <button class="level-btn" data-level="L6" title="Bloc">6</button>
      <button class="level-btn" data-level="L7" title="Variable">7</button>
    </div>

    <div id="view-modes">
      <button class="view-btn active" data-mode="architecture">Architecture</button>
      <button class="view-btn" data-mode="callgraph">Call Graph</button>
      <button class="view-btn" data-mode="dataflow">Data Flow</button>
      <button class="view-btn" data-mode="security">Security</button>
      <button class="view-btn filter-btn" data-filter="deadcode" onclick="toggleDeadCodeFilter()" title="Afficher uniquement le code mort">☠ Dead Code</button>
      <button class="view-btn reset-btn" onclick="resetAllPositions()" title="Remettre tous les nœuds à leur position initiale">↺ Reset</button>
    </div>
  </div>

  <!-- Left Panel -->
  <div class="hud" id="left-panel">
    <div class="panel" style="height: 100%;">
      <div class="panel-header">
        <span class="panel-title">Navigation</span>
      </div>
      <div class="panel-content">
        <div id="search-container">
          <span id="search-icon">🔍</span>
          <input type="text" id="search-input" placeholder="Rechercher...">
          <div id="search-results"></div>
        </div>
        <div id="breadcrumb"></div>
        <div id="node-tree" class="node-tree"></div>
      </div>
    </div>
  </div>

  <!-- Right Panel -->
  <div class="hud" id="right-panel">
    <div class="panel" style="height: 100%;">
      <div class="tab-container">
        <button class="tab-btn active" data-tab="details">Détails</button>
        <button class="tab-btn" data-tab="relations">Relations</button>
        <button class="tab-btn" data-tab="code">Code</button>
      </div>
      <div class="panel-content">
        <div id="tab-details" class="tab-content active">
          <div id="selected-node-details">
            <p style="color: #666; text-align: center; margin-top: 50px;">
              Sélectionnez un noeud pour voir ses détails
            </p>
          </div>
        </div>
        <div id="tab-relations" class="tab-content">
          <div id="selected-node-relations"></div>
        </div>
        <div id="tab-code" class="tab-content">
          <div id="selected-node-code"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom Panel -->
  <div class="hud" id="bottom-panel">
    <div class="panel">
      <div class="expand-tab" onclick="toggleBottomPanel()">▲ Issues & Vulnérabilités</div>
      <div class="panel-header">
        <span class="panel-title">Issues & Vulnérabilités</span>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span id="issues-count" style="color: #ff6600;"></span>
          <button class="collapse-btn" onclick="toggleBottomPanel()" title="Réduire/Agrandir">▼</button>
        </div>
      </div>
      <div class="panel-content">
        <div class="security-summary" id="security-summary"></div>
        <div class="issues-container" id="issues-list"></div>
      </div>
    </div>
  </div>

  <!-- Show All Button (appears when nodes are hidden) -->
  <button class="show-all-btn" id="show-all-btn" onclick="showAllNodes()">
    👁 Afficher tous les nœuds
  </button>

  <!-- Keyboard Shortcuts Modal -->
  <div id="shortcuts-modal">
    <h3>⌨️ Raccourcis Clavier</h3>
    <div class="shortcut-row">
      <span class="shortcut-key">1-7</span>
      <span class="shortcut-desc">Changer de niveau de granularité</span>
    </div>
    <div class="shortcut-row">
      <span class="shortcut-key">Esc</span>
      <span class="shortcut-desc">Reset vue / Fermer menu</span>
    </div>
    <div class="shortcut-row">
      <span class="shortcut-key">Backspace</span>
      <span class="shortcut-desc">Remonter d'un niveau</span>
    </div>
    <div class="shortcut-row">
      <span class="shortcut-key">F</span>
      <span class="shortcut-desc">Focus sur le nœud sélectionné</span>
    </div>
    <div class="shortcut-row">
      <span class="shortcut-key">R</span>
      <span class="shortcut-desc">Reset toutes les positions</span>
    </div>
    <div class="shortcut-row">
      <span class="shortcut-key">H</span>
      <span class="shortcut-desc">Masquer nœud sélectionné</span>
    </div>
    <div class="shortcut-row">
      <span class="shortcut-key">A</span>
      <span class="shortcut-desc">Afficher tous les nœuds</span>
    </div>
    <div class="shortcut-row">
      <span class="shortcut-key">I</span>
      <span class="shortcut-desc">Isoler le nœud sélectionné</span>
    </div>
    <div class="shortcut-row">
      <span class="shortcut-key">L</span>
      <span class="shortcut-desc">Verrouiller/Déverrouiller position</span>
    </div>
    <div class="shortcut-row">
      <span class="shortcut-key">?</span>
      <span class="shortcut-desc">Afficher cette aide</span>
    </div>
    <div style="margin-top: 20px; text-align: center;">
      <button onclick="document.getElementById('shortcuts-modal').classList.remove('visible')"
              style="background: rgba(0,255,255,0.2); border: 1px solid #00ffff; color: #00ffff; padding: 8px 20px; border-radius: 20px; cursor: pointer;">
        Fermer
      </button>
    </div>
  </div>

  <!-- Controls Help -->
  <div id="controls-help">
    <div class="control-item">
      <span class="control-key">Clic</span>
      <span>Sélectionner</span>
    </div>
    <div class="control-item">
      <span class="control-key">Clic droit</span>
      <span>Menu</span>
    </div>
    <div class="control-item">
      <span class="control-key">Double-clic</span>
      <span>Drill-down</span>
    </div>
    <div class="control-item">
      <span class="control-key">Drag</span>
      <span>Déplacer</span>
    </div>
    <div class="control-item">
      <span class="control-key">Molette</span>
      <span>Zoom</span>
    </div>
    <div class="control-item">
      <span class="control-key">?</span>
      <span>Aide</span>
    </div>
  </div>

  <!-- Three.js with ES6 modules -->
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }
  }
  </script>
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

    // Expose to global scope for inline script
    window.THREE = THREE;
    window.OrbitControls = OrbitControls;
    window.EffectComposer = EffectComposer;
    window.RenderPass = RenderPass;
    window.UnrealBloomPass = UnrealBloomPass;

    // Signal that Three.js is loaded
    window.dispatchEvent(new Event('three-loaded'));
  </script>

  <script>
    // ===========================================================================
    // DATA
    // ===========================================================================
    const nodesData = ${nodesData};
    const edgesData = ${edgesData};
    const callGraphData = ${callGraphData};
    const issuesData = ${issuesData};
    const securityData = ${securityData};
    const statsData = ${statsData};
    const layersData = ${layersData};
    const dataFlowsData = ${dataFlowsData};

    // ===========================================================================
    // STATE
    // ===========================================================================
    let currentLevel = 'L1';
    let selectedNode = null;
    let focusNode = null;
    let viewMode = 'architecture';
    let deadCodeFilterActive = false;
    let nodeMeshes = new Map();
    let edgeLines = new Map();
    let particles = [];
    let animatedEdges = [];

    // Dead code node IDs (computed from issues)
    const deadCodeNodeIds = new Set(
      issuesData
        .filter(i => i.type === 'dead_code' || i.type === 'unused_function' || i.type === 'unused_variable' || i.type === 'unused_import')
        .flatMap(i => i.relatedNodes || [])
    );

    // Drag state (initialized after THREE.js loads)
    let isDragging = false;
    let wasDragging = false;  // To prevent click after drag
    let draggedMesh = null;
    let dragPlane = null;
    let dragOffset = null;

    // Physics simulation for spring effect
    const nodeVelocities = new Map();
    const nodeTargetPositions = new Map();
    const SPRING_STIFFNESS = 0.08;
    const SPRING_DAMPING = 0.85;
    const VELOCITY_THRESHOLD = 0.01;

    // Context menu state
    let contextMenuNode = null;
    const hiddenNodes = new Set();
    const lockedNodes = new Set();

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

    // ===========================================================================
    // THREE.JS SETUP
    // ===========================================================================
    let scene, camera, renderer, controls, composer;
    let raycaster, mouse;

    function initThreeJS() {
      const container = document.getElementById('canvas-container');

      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0f);
      scene.fog = new THREE.FogExp2(0x0a0a0f, 0.0015);

      // Camera
      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
      camera.position.set(0, 200, 500);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ReinhardToneMapping;
      renderer.toneMappingExposure = 1.5;
      container.appendChild(renderer.domElement);

      // Controls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.rotateSpeed = 0.5;
      controls.zoomSpeed = 1.2;
      controls.minDistance = 50;
      controls.maxDistance = 2000;

      // Raycaster for picking
      raycaster = new THREE.Raycaster();
      mouse = new THREE.Vector2();

      // Post-processing (Bloom)
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.4,  // strength (reduced for cleaner look)
        0.5,  // radius
        0.8   // threshold (higher = less bloom on dark objects)
      );
      composer.addPass(bloomPass);

      // Ambient light
      const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
      scene.add(ambientLight);

      // Point lights
      const pointLight1 = new THREE.PointLight(0x00ffff, 1, 1000);
      pointLight1.position.set(200, 300, 200);
      scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(0xff6600, 0.5, 1000);
      pointLight2.position.set(-200, -100, -200);
      scene.add(pointLight2);

      // Grid helper (subtle)
      const gridHelper = new THREE.GridHelper(2000, 100, 0x111122, 0x111122);
      gridHelper.position.y = -100;
      scene.add(gridHelper);

      // Handle resize
      window.addEventListener('resize', onWindowResize);

      // Mouse events
      renderer.domElement.addEventListener('mousemove', onMouseMove);
      renderer.domElement.addEventListener('click', onMouseClick);
      renderer.domElement.addEventListener('dblclick', onMouseDoubleClick);

      // Drag events
      renderer.domElement.addEventListener('mousedown', onMouseDown);
      renderer.domElement.addEventListener('mouseup', onMouseUp);
      renderer.domElement.addEventListener('mouseleave', onMouseUp);

      // Context menu (right click)
      renderer.domElement.addEventListener('contextmenu', onContextMenu);
      document.addEventListener('click', hideContextMenu);

      // Create drag plane and offset vector (for node dragging)
      dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      dragOffset = new THREE.Vector3();

      // Keyboard events
      document.addEventListener('keydown', onKeyDown);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    }

    // ===========================================================================
    // NODE CREATION
    // ===========================================================================
    function createNodes(filteredNodes) {
      // Clear existing
      nodeMeshes.forEach(mesh => scene.remove(mesh));
      nodeMeshes.clear();

      // Layout parameters
      const nodeCount = filteredNodes.length;
      const layoutRadius = Math.min(500, 50 + nodeCount * 2);

      // Create node groups by parent
      const nodesByParent = new Map();
      filteredNodes.forEach(node => {
        const parent = node.parent || 'root';
        if (!nodesByParent.has(parent)) {
          nodesByParent.set(parent, []);
        }
        nodesByParent.get(parent).push(node);
      });

      // Position nodes in 3D space
      let globalIndex = 0;
      filteredNodes.forEach((node, index) => {
        const geometry = createNodeGeometry(node);
        const material = createNodeMaterial(node);
        const mesh = new THREE.Mesh(geometry, material);

        // Position based on level and relationships
        const position = calculateNodePosition(node, index, nodeCount, layoutRadius);
        mesh.position.copy(position);

        // Store reference (including positions for spring effect and reset)
        mesh.userData = {
          node,
          originalScale: mesh.scale.clone(),
          initialPosition: position.clone(),   // Never changes - for reset
          originalPosition: position.clone()   // Current "home" - updated on drag
        };
        nodeMeshes.set(node.id, mesh);
        scene.add(mesh);

        // Initialize physics state
        nodeVelocities.set(node.id, new THREE.Vector3(0, 0, 0));
        nodeTargetPositions.delete(node.id);

        // Add glow effect for important nodes
        if (node.level === 'L1' || node.level === 'L2') {
          addNodeGlow(mesh, node);
        }

        // Add label
        addNodeLabel(mesh, node);

        globalIndex++;
      });
    }

    function createNodeGeometry(node) {
      const baseSize = getNodeSize(node);

      switch (node.type) {
        case 'system':
          // Cristal sphere with high detail for system nodes
          return new THREE.IcosahedronGeometry(baseSize * 3, 3);
        case 'module':
          // Rounded cube effect using chamfered box (octahedron with more segments)
          return new THREE.OctahedronGeometry(baseSize * 2, 1);
        case 'file':
          // Flat hexagonal prism for files
          return new THREE.CylinderGeometry(baseSize * 1.2, baseSize * 1.2, baseSize * 0.4, 6, 1);
        case 'class':
        case 'struct':
          // Clean dodecahedron with smooth faces
          return new THREE.DodecahedronGeometry(baseSize * 1.3, 1);
        case 'interface':
        case 'trait':
          // Torus ring for interfaces (contracts)
          return new THREE.TorusGeometry(baseSize * 1.0, baseSize * 0.25, 16, 32);
        case 'enum':
        case 'type_alias':
          // Octahedron for type definitions
          return new THREE.OctahedronGeometry(baseSize * 1.0, 0);
        case 'function':
        case 'method':
          // Smooth sphere for functions
          return new THREE.SphereGeometry(baseSize, 24, 24);
        case 'constructor':
          // Cone pointing up for constructors
          return new THREE.ConeGeometry(baseSize * 0.8, baseSize * 1.5, 16);
        case 'arrow':
        case 'closure':
          // Small smooth sphere for lambdas
          return new THREE.SphereGeometry(baseSize * 0.8, 16, 16);
        case 'variable':
          // Small cube for variables
          return new THREE.BoxGeometry(baseSize * 0.6, baseSize * 0.6, baseSize * 0.6);
        case 'constant':
          // Diamond shape for constants
          return new THREE.OctahedronGeometry(baseSize * 0.7, 0);
        case 'parameter':
          // Tiny sphere for parameters
          return new THREE.SphereGeometry(baseSize * 0.5, 12, 12);
        case 'handler':
          // Capsule-like shape for handlers
          return new THREE.CapsuleGeometry(baseSize * 0.5, baseSize * 0.8, 8, 16);
        default:
          return new THREE.SphereGeometry(baseSize * 0.6, 12, 12);
      }
    }

    function createNodeMaterial(node) {
      const color = nodeColors[node.type] || 0x888888;

      // PBR Material for cleaner, more realistic look
      return new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.15,
        metalness: 0.3,
        roughness: 0.5,
        transparent: true,
        opacity: 0.92,
        flatShading: false
      });
    }

    function getNodeSize(node) {
      const baseSize = 5;
      const locMultiplier = Math.min(2, 1 + (node.metrics?.loc || 0) / 500);
      const complexityMultiplier = 1 + (node.metrics?.complexity || 0) / 20;

      switch (node.level) {
        case 'L1': return baseSize * 5;
        case 'L2': return baseSize * 3;
        case 'L3': return baseSize * 2 * locMultiplier;
        case 'L4': return baseSize * 1.5 * locMultiplier;
        case 'L5': return baseSize * complexityMultiplier;
        case 'L6': return baseSize * 0.8;
        case 'L7': return baseSize * 0.5;
        default: return baseSize;
      }
    }

    function calculateNodePosition(node, index, total, radius) {
      // Hierarchical 3D layout
      const levelOffsets = { L1: 0, L2: 1, L3: 2, L4: 3, L5: 4, L6: 5, L7: 6 };
      const levelOffset = levelOffsets[node.level] || 0;

      // Spiral layout with vertical separation by level
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const theta = index * goldenAngle;
      const y = (levelOffset - 3) * 80; // Vertical spread

      // Radius decreases with level
      const levelRadius = radius * (1 - levelOffset * 0.1);
      const phi = Math.acos(1 - 2 * (index + 0.5) / Math.max(total, 1));

      // Add some randomness for organic look
      const noise = 0.2;
      const rx = (Math.random() - 0.5) * noise * levelRadius;
      const rz = (Math.random() - 0.5) * noise * levelRadius;

      return new THREE.Vector3(
        levelRadius * Math.sin(phi) * Math.cos(theta) + rx,
        y + (Math.random() - 0.5) * 30,
        levelRadius * Math.sin(phi) * Math.sin(theta) + rz
      );
    }

    function addNodeGlow(mesh, node) {
      const glowGeometry = mesh.geometry.clone();
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: nodeColors[node.type] || 0x00ffff,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.scale.multiplyScalar(1.4);
      mesh.add(glow);
    }

    function addNodeLabel(mesh, node) {
      // Create canvas texture for label
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;

      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = 'bold 24px JetBrains Mono, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(node.name.substring(0, 20), canvas.width / 2, canvas.height / 2 + 8);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.8
      });

      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(50, 12.5, 1);
      sprite.position.y = getNodeSize(node) * 2;
      mesh.add(sprite);

      // Hide label initially if too many nodes
      if (nodeMeshes.size > 100) {
        sprite.visible = false;
      }
    }

    // ===========================================================================
    // EDGE CREATION WITH PARTICLES
    // ===========================================================================
    function createEdges(filteredEdges) {
      // Clear existing
      edgeLines.forEach(line => scene.remove(line));
      edgeLines.clear();
      particles = [];
      animatedEdges = [];

      filteredEdges.forEach(edge => {
        const sourceMesh = nodeMeshes.get(edge.source);
        const targetMesh = nodeMeshes.get(edge.target);

        if (!sourceMesh || !targetMesh) return;

        // Create curved line
        const curve = createEdgeCurve(sourceMesh.position, targetMesh.position);
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const color = getEdgeColor(edge.type);
        const material = new THREE.LineBasicMaterial({
          color: color,
          transparent: true,
          opacity: ${cfg.edgeOpacity},
          linewidth: 1
        });

        const line = new THREE.Line(geometry, material);
        line.userData = { edge, curve };
        edgeLines.set(edge.id, line);
        scene.add(line);

        // Add particles for data flow visualization
        if (edge.type === 'calls' || edge.type === 'data_flow' || edge.type === 'imports') {
          animatedEdges.push({ edge, curve, line, progress: Math.random() });
        }
      });

      // Create particle system for flow visualization
      createFlowParticles();
    }

    function createEdgeCurve(start, end) {
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      // Add curvature
      const distance = start.distanceTo(end);
      mid.y += distance * 0.2;

      return new THREE.QuadraticBezierCurve3(start, mid, end);
    }

    function getEdgeColor(type) {
      const colors = {
        imports: 0x4488ff,
        exports: 0x44ff88,
        calls: 0x00ffff,
        awaits: 0x00ffaa,
        extends: 0xff8800,
        implements: 0xff6600,
        contains: 0x444466,
        data_flow: 0xff00ff,
        reads: 0x88ff88,
        writes: 0xff8888
      };
      return colors[type] || 0x444466;
    }

    function createFlowParticles() {
      const particleCount = Math.min(animatedEdges.length * 3, 500);
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const edgeIndex = i % animatedEdges.length;
        const edge = animatedEdges[edgeIndex];
        const point = edge.curve.getPoint(Math.random());

        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;

        const color = new THREE.Color(getEdgeColor(edge.edge.type));
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        particles.push({
          edgeIndex,
          progress: Math.random(),
          speed: 0.005 + Math.random() * 0.01
        });
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 3,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });

      const particleSystem = new THREE.Points(geometry, material);
      particleSystem.name = 'flowParticles';
      scene.add(particleSystem);
    }

    // ===========================================================================
    // ANIMATION LOOP
    // ===========================================================================
    let animationTime = 0;

    function animate() {
      requestAnimationFrame(animate);
      animationTime += 0.016; // ~60fps

      controls.update();

      // Animate particles along edges
      if (particles.length > 0 && animatedEdges.length > 0) {
        const particleSystem = scene.getObjectByName('flowParticles');
        if (particleSystem) {
          const positions = particleSystem.geometry.attributes.position.array;

          particles.forEach((particle, i) => {
            particle.progress += particle.speed;
            if (particle.progress > 1) {
              particle.progress = 0;
              particle.edgeIndex = Math.floor(Math.random() * animatedEdges.length);
            }

            if (animatedEdges[particle.edgeIndex]) {
              const point = animatedEdges[particle.edgeIndex].curve.getPoint(particle.progress);
              positions[i * 3] = point.x;
              positions[i * 3 + 1] = point.y;
              positions[i * 3 + 2] = point.z;
            }
          });

          particleSystem.geometry.attributes.position.needsUpdate = true;
        }
      }

      // Subtle animations for all nodes
      nodeMeshes.forEach((mesh, id) => {
        const node = mesh.userData.node;
        if (!node) return;

        // Skip physics for currently dragged node
        if (isDragging && draggedMesh && draggedMesh.userData.node.id === node.id) {
          return;
        }

        // Apply spring physics if node has been moved
        const velocity = nodeVelocities.get(node.id);
        const targetPos = nodeTargetPositions.get(node.id);
        const originalPos = mesh.userData.originalPosition;

        if (velocity && originalPos) {
          // Calculate spring force towards original position
          const displacement = new THREE.Vector3().subVectors(originalPos, mesh.position);
          const springForce = displacement.multiplyScalar(SPRING_STIFFNESS);

          // Apply force to velocity
          velocity.add(springForce);

          // Apply damping
          velocity.multiplyScalar(SPRING_DAMPING);

          // Apply velocity to position if above threshold
          if (velocity.length() > VELOCITY_THRESHOLD) {
            mesh.position.add(velocity);

            // Update connected edges
            updateConnectedEdges(node);

            // Jelly effect - subtle scale wobble based on velocity
            const wobble = 1 + velocity.length() * 0.02;
            mesh.scale.copy(mesh.userData.originalScale).multiplyScalar(
              1 + Math.sin(animationTime * 10) * (wobble - 1) * 0.5
            );
          } else {
            // Reset to original scale when settled
            if (!selectedNode || node.id !== selectedNode.id) {
              mesh.scale.copy(mesh.userData.originalScale);
            }
          }
        }

        // Slow rotation for modules and systems
        if (node.type === 'module' || node.type === 'system') {
          mesh.rotation.y += 0.001;
        }

        // Gentle pulsation for functions (only when not selected and not being animated by physics)
        if ((node.type === 'function' || node.type === 'method') && node !== selectedNode) {
          if (!velocity || velocity.length() <= VELOCITY_THRESHOLD) {
            const pulse = 1 + Math.sin(animationTime * 2 + mesh.position.x * 0.01) * 0.02;
            mesh.scale.copy(mesh.userData.originalScale).multiplyScalar(pulse);
          }
        }

        // Torus rotation for interfaces
        if (node.type === 'interface' || node.type === 'trait') {
          mesh.rotation.x += 0.002;
          mesh.rotation.z += 0.001;
        }
      });

      // Gentle rotation for selected node (faster)
      if (selectedNode) {
        const mesh = nodeMeshes.get(selectedNode.id);
        if (mesh) {
          mesh.rotation.y += 0.015;
        }
      }

      // Render
      composer.render();
    }

    // ===========================================================================
    // MOUSE INTERACTION
    // ===========================================================================
    function onMouseMove(event) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Handle dragging
      if (isDragging && draggedMesh) {
        // Update plane to face camera
        dragPlane.setFromNormalAndCoplanarPoint(
          camera.getWorldDirection(new THREE.Vector3()).negate(),
          draggedMesh.position
        );

        // Get intersection point with plane
        raycaster.setFromCamera(mouse, camera);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, intersection);

        if (intersection) {
          // Move node to new position with offset
          const newPos = intersection.sub(dragOffset);
          draggedMesh.position.copy(newPos);

          // Store as target position for spring physics
          nodeTargetPositions.set(draggedMesh.userData.node.id, newPos.clone());

          // Update connected edges in real-time
          updateConnectedEdges(draggedMesh.userData.node);
        }

        document.body.style.cursor = 'grabbing';
        return;
      }

      // Raycast for hover
      raycaster.setFromCamera(mouse, camera);
      const meshArray = Array.from(nodeMeshes.values());
      const intersects = raycaster.intersectObjects(meshArray);

      // Reset all hovers
      nodeMeshes.forEach(mesh => {
        if (mesh.userData.node !== selectedNode && !isDragging) {
          mesh.scale.copy(mesh.userData.originalScale);
        }
      });

      // Apply hover effect
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        if (mesh.userData?.node && mesh.userData.node !== selectedNode) {
          mesh.scale.copy(mesh.userData.originalScale).multiplyScalar(1.2);
          showTooltip(mesh.userData.node, event.clientX, event.clientY);
        }
        document.body.style.cursor = 'grab';
      } else {
        hideTooltip();
        document.body.style.cursor = 'default';
      }
    }

    function onMouseDown(event) {
      // Only handle left click
      if (event.button !== 0) return;

      raycaster.setFromCamera(mouse, camera);
      const meshArray = Array.from(nodeMeshes.values());
      const intersects = raycaster.intersectObjects(meshArray);

      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        if (mesh.userData?.node) {
          // Don't drag locked nodes
          if (lockedNodes.has(mesh.userData.node.id)) {
            showNotification('Ce nœud est verrouillé (L pour déverrouiller)');
            return;
          }

          // Start dragging
          isDragging = true;
          draggedMesh = mesh;

          // Disable orbit controls during drag
          controls.enabled = false;

          // Calculate offset from mesh center to click point
          dragPlane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(new THREE.Vector3()).negate(),
            mesh.position
          );

          const intersection = new THREE.Vector3();
          raycaster.ray.intersectPlane(dragPlane, intersection);
          dragOffset.subVectors(intersection, mesh.position);

          // Initialize velocity for this node
          nodeVelocities.set(mesh.userData.node.id, new THREE.Vector3(0, 0, 0));

          // Visual feedback
          mesh.material.emissiveIntensity = 0.8;

          document.body.style.cursor = 'grabbing';
          hideTooltip();
        }
      }
    }

    function onMouseUp(event) {
      if (isDragging && draggedMesh) {
        // Re-enable orbit controls
        controls.enabled = true;

        const node = draggedMesh.userData.node;

        // Update the "home" position to the new dropped position
        draggedMesh.userData.originalPosition = draggedMesh.position.clone();

        // Apply a small bounce effect (wobble around new position)
        const velocity = nodeVelocities.get(node.id) || new THREE.Vector3();
        // Random small impulse for elastic wobble effect
        velocity.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        );
        nodeVelocities.set(node.id, velocity);

        // Reset material
        draggedMesh.material.emissiveIntensity = selectedNode === node ? 0.6 : 0.15;

        document.body.style.cursor = 'default';

        // Mark that we just finished dragging (to prevent click handler)
        wasDragging = true;
      }

      isDragging = false;
      draggedMesh = null;
    }

    function updateConnectedEdges(node) {
      // Update all edges connected to this node
      edgeLines.forEach((line, id) => {
        const edge = line.userData.edge;

        if (edge.source === node.id || edge.target === node.id) {
          const sourceMesh = nodeMeshes.get(edge.source);
          const targetMesh = nodeMeshes.get(edge.target);

          if (sourceMesh && targetMesh) {
            // Recreate the curve with new positions
            const curve = createEdgeCurve(sourceMesh.position, targetMesh.position);
            const points = curve.getPoints(50);

            // Update geometry
            line.geometry.setFromPoints(points);
            line.userData.curve = curve;
          }
        }
      });
    }

    // ===========================================================================
    // CONTEXT MENU
    // ===========================================================================
    function onContextMenu(event) {
      event.preventDefault();

      // Update mouse position
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Raycast to find node under cursor
      raycaster.setFromCamera(mouse, camera);
      const meshArray = Array.from(nodeMeshes.values());
      const intersects = raycaster.intersectObjects(meshArray);

      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        if (mesh.userData?.node) {
          contextMenuNode = mesh.userData.node;
          showContextMenu(event.clientX, event.clientY, mesh.userData.node);
        }
      } else {
        hideContextMenu();
      }
    }

    function showContextMenu(x, y, node) {
      const menu = document.getElementById('context-menu');
      const title = document.getElementById('context-menu-title');

      title.textContent = node.name;

      // Position menu (ensure it stays on screen)
      const menuWidth = 220;
      const menuHeight = 400;
      const posX = Math.min(x, window.innerWidth - menuWidth - 10);
      const posY = Math.min(y, window.innerHeight - menuHeight - 10);

      menu.style.left = posX + 'px';
      menu.style.top = posY + 'px';
      menu.classList.add('visible');

      // Update lock button text
      const lockItem = menu.querySelector('[onclick="contextAction(\\'lock\\')"]');
      if (lockItem) {
        const isLocked = lockedNodes.has(node.id);
        lockItem.innerHTML = \`<span class="icon">\${isLocked ? '🔓' : '📌'}</span><span>\${isLocked ? 'Déverrouiller' : 'Verrouiller la position'}</span>\`;
      }
    }

    function hideContextMenu() {
      document.getElementById('context-menu').classList.remove('visible');
    }

    window.contextAction = function(action) {
      if (!contextMenuNode) return;

      const node = contextMenuNode;
      const mesh = nodeMeshes.get(node.id);

      switch (action) {
        case 'center':
          // Center view on node without selecting
          if (mesh) {
            gsapTo(controls.target, {
              x: mesh.position.x,
              y: mesh.position.y,
              z: mesh.position.z
            });
          }
          break;

        case 'focus':
          // Zoom in close to the node
          if (mesh) {
            const targetPos = mesh.position.clone();
            const cameraOffset = new THREE.Vector3(0, 30, 80);
            const newCameraPos = targetPos.clone().add(cameraOffset);
            gsapTo(camera.position, { x: newCameraPos.x, y: newCameraPos.y, z: newCameraPos.z });
            gsapTo(controls.target, { x: targetPos.x, y: targetPos.y, z: targetPos.z });
          }
          break;

        case 'drilldown':
          if (node.children?.length > 0) {
            drillDown(node);
          }
          break;

        case 'relations':
          selectNode(node);
          highlightConnectedEdges(node);
          // Switch to relations tab
          document.querySelector('[data-tab="relations"]').click();
          break;

        case 'dataflow':
          // Show data flow for this node
          showNodeDataFlow(node);
          break;

        case 'isolate':
          // Hide all nodes except this one and its connections
          isolateNode(node);
          break;

        case 'lock':
          // Toggle lock state
          if (lockedNodes.has(node.id)) {
            lockedNodes.delete(node.id);
            if (mesh) mesh.material.emissiveIntensity = 0.15;
          } else {
            lockedNodes.add(node.id);
            if (mesh) mesh.material.emissiveIntensity = 0.4;
          }
          break;

        case 'reset':
          // Reset this node's position
          if (mesh && mesh.userData.initialPosition) {
            mesh.userData.originalPosition = mesh.userData.initialPosition.clone();
            const velocity = nodeVelocities.get(node.id) || new THREE.Vector3();
            const displacement = new THREE.Vector3().subVectors(mesh.userData.initialPosition, mesh.position);
            velocity.copy(displacement.multiplyScalar(0.1));
            nodeVelocities.set(node.id, velocity);
          }
          break;

        case 'copy':
          // Copy file path to clipboard
          const path = node.location?.file || node.fullPath || node.name;
          navigator.clipboard.writeText(path).then(() => {
            showNotification('Chemin copié: ' + path);
          });
          break;

        case 'details':
          selectNode(node);
          document.querySelector('[data-tab="details"]').click();
          break;

        case 'hide':
          // Hide this node
          if (mesh) {
            mesh.visible = false;
            hiddenNodes.add(node.id);
            // Also hide connected edges
            edgeLines.forEach((line, id) => {
              const edge = line.userData.edge;
              if (edge.source === node.id || edge.target === node.id) {
                line.visible = false;
              }
            });
            updateShowAllButton();
          }
          break;
      }

      hideContextMenu();
    };

    function showNodeDataFlow(node) {
      // Highlight data flow paths involving this node
      const flowNodes = new Set([node.id]);
      const flowEdges = [];

      // Find all data flows involving this node
      dataFlowsData.forEach(flow => {
        const sourceNode = nodesData.find(n =>
          n.location?.file === flow.defined.file && n.location?.line === flow.defined.line
        );

        if (sourceNode?.id === node.id || flow.flowsTo.some(t => {
          const targetNode = nodesData.find(n => n.location?.file === t.file);
          return targetNode?.id === node.id;
        })) {
          if (sourceNode) flowNodes.add(sourceNode.id);
          flow.flowsTo.forEach(t => {
            const targetNode = nodesData.find(n => n.location?.file === t.file);
            if (targetNode) {
              flowNodes.add(targetNode.id);
              flowEdges.push({ source: sourceNode?.id, target: targetNode.id });
            }
          });
        }
      });

      // Dim all nodes except flow nodes
      nodeMeshes.forEach((mesh, id) => {
        if (flowNodes.has(id)) {
          mesh.material.opacity = 1;
          mesh.material.emissiveIntensity = 0.5;
        } else {
          mesh.material.opacity = 0.1;
          mesh.material.emissiveIntensity = 0.05;
        }
      });

      // Highlight flow edges
      edgeLines.forEach((line, id) => {
        const edge = line.userData.edge;
        const isFlowEdge = flowEdges.some(fe =>
          fe.source === edge.source && fe.target === edge.target
        );
        line.material.opacity = isFlowEdge ? 0.8 : 0.05;
        if (isFlowEdge) {
          line.material.color.setHex(0xff00ff);
        }
      });
    }

    function isolateNode(node) {
      // Find connected nodes
      const connectedNodes = new Set([node.id]);
      edgesData.forEach(edge => {
        if (edge.source === node.id) connectedNodes.add(edge.target);
        if (edge.target === node.id) connectedNodes.add(edge.source);
      });

      // Hide non-connected nodes
      nodeMeshes.forEach((mesh, id) => {
        if (connectedNodes.has(id)) {
          mesh.visible = true;
          mesh.material.opacity = 0.92;
        } else {
          mesh.visible = false;
        }
      });

      // Hide non-connected edges
      edgeLines.forEach((line, id) => {
        const edge = line.userData.edge;
        const isConnected = connectedNodes.has(edge.source) && connectedNodes.has(edge.target);
        line.visible = isConnected;
      });
    }

    function showNotification(message) {
      // Create temporary notification
      const notif = document.createElement('div');
      notif.style.cssText = \`
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,255,255,0.2);
        border: 1px solid #00ffff;
        padding: 12px 24px;
        border-radius: 8px;
        color: #00ffff;
        font-size: 13px;
        z-index: 10002;
        animation: fadeInOut 2s ease forwards;
      \`;
      notif.textContent = message;
      document.body.appendChild(notif);

      setTimeout(() => notif.remove(), 2000);
    }

    // Toggle bottom panel
    window.toggleBottomPanel = function() {
      document.getElementById('bottom-panel').classList.toggle('collapsed');
    };

    // Show all hidden nodes
    window.showAllNodes = function() {
      hiddenNodes.clear();
      nodeMeshes.forEach((mesh) => {
        mesh.visible = true;
        mesh.material.opacity = 0.92;
        mesh.material.emissiveIntensity = 0.15;
      });
      edgeLines.forEach((line) => {
        line.visible = true;
        line.material.opacity = 0.3;
      });
      updateShowAllButton();
      showNotification('Tous les nœuds sont visibles');
    };

    function onMouseClick(event) {
      // Ignore click if we just finished dragging
      if (wasDragging) {
        wasDragging = false;
        return;
      }

      raycaster.setFromCamera(mouse, camera);
      const meshArray = Array.from(nodeMeshes.values());
      const intersects = raycaster.intersectObjects(meshArray);

      if (intersects.length > 0) {
        const node = intersects[0].object.userData?.node;
        if (node) {
          selectNode(node);
        }
      }
    }

    function onMouseDoubleClick(event) {
      raycaster.setFromCamera(mouse, camera);
      const meshArray = Array.from(nodeMeshes.values());
      const intersects = raycaster.intersectObjects(meshArray);

      if (intersects.length > 0) {
        const node = intersects[0].object.userData?.node;
        if (node && node.children?.length > 0) {
          drillDown(node);
        }
      }
    }

    function onKeyDown(event) {
      // Don't trigger shortcuts when typing in input
      if (event.target.tagName === 'INPUT') return;

      // Level shortcuts
      if (event.key >= '1' && event.key <= '7') {
        setLevel('L' + event.key);
      }

      // Reset view
      if (event.key === 'Escape') {
        hideContextMenu();
        document.getElementById('shortcuts-modal').classList.remove('visible');
        resetView();
      }

      // Navigate up
      if (event.key === 'Backspace') {
        event.preventDefault();
        navigateUp();
      }

      // Focus on selected node
      if (event.key === 'f' || event.key === 'F') {
        if (selectedNode) {
          const mesh = nodeMeshes.get(selectedNode.id);
          if (mesh) {
            const targetPos = mesh.position.clone();
            const cameraOffset = new THREE.Vector3(0, 30, 80);
            const newCameraPos = targetPos.clone().add(cameraOffset);
            gsapTo(camera.position, { x: newCameraPos.x, y: newCameraPos.y, z: newCameraPos.z });
            gsapTo(controls.target, { x: targetPos.x, y: targetPos.y, z: targetPos.z });
          }
        }
      }

      // Reset all positions
      if (event.key === 'r' || event.key === 'R') {
        resetAllPositions();
      }

      // Hide selected node
      if (event.key === 'h' || event.key === 'H') {
        if (selectedNode) {
          contextMenuNode = selectedNode;
          contextAction('hide');
          updateShowAllButton();
        }
      }

      // Show all nodes
      if (event.key === 'a' || event.key === 'A') {
        showAllNodes();
      }

      // Isolate selected node
      if (event.key === 'i' || event.key === 'I') {
        if (selectedNode) {
          isolateNode(selectedNode);
        }
      }

      // Lock/unlock selected node
      if (event.key === 'l' || event.key === 'L') {
        if (selectedNode) {
          contextMenuNode = selectedNode;
          contextAction('lock');
        }
      }

      // Show shortcuts help
      if (event.key === '?') {
        document.getElementById('shortcuts-modal').classList.toggle('visible');
      }
    }

    function updateShowAllButton() {
      const btn = document.getElementById('show-all-btn');
      if (hiddenNodes.size > 0) {
        btn.classList.add('visible');
        btn.textContent = \`👁 Afficher tous (\${hiddenNodes.size} masqués)\`;
      } else {
        btn.classList.remove('visible');
      }
    }

    // ===========================================================================
    // NODE SELECTION & NAVIGATION
    // ===========================================================================
    function selectNode(node) {
      selectedNode = node;

      // Update mesh appearance
      nodeMeshes.forEach((mesh, id) => {
        if (id === node.id) {
          mesh.scale.copy(mesh.userData.originalScale).multiplyScalar(1.3);
          mesh.material.emissiveIntensity = 0.6;
        } else {
          mesh.scale.copy(mesh.userData.originalScale);
          mesh.material.emissiveIntensity = 0.3;
          mesh.material.opacity = 0.5;
        }
      });

      // Highlight connected edges
      highlightConnectedEdges(node);

      // Update UI
      updateNodeDetails(node);
      updateBreadcrumb(node);

      // Expand tree to show selected node and update tree view
      expandToNode(node.id);
      const filteredNodes = getFilteredNodesForCurrentLevel();
      updateNodeTree(filteredNodes);

      // Animate camera to node
      animateCameraTo(node);
    }

    function drillDown(node) {
      focusNode = node;

      // Change to appropriate level
      const childLevel = getNextLevel(node.level);
      if (childLevel) {
        setLevel(childLevel, node.id);
      }
    }

    function navigateUp() {
      if (focusNode && focusNode.parent) {
        const parentNode = nodesData.find(n => n.id === focusNode.parent);
        if (parentNode) {
          focusNode = parentNode;
          setLevel(parentNode.level, parentNode.id);
          selectNode(parentNode);
        }
      } else {
        resetView();
      }
    }

    function resetView() {
      focusNode = null;
      selectedNode = null;
      setLevel('L1');

      // Reset camera
      gsapTo(camera.position, { x: 0, y: 200, z: 500 });
      controls.target.set(0, 0, 0);

      // Reset all meshes
      nodeMeshes.forEach(mesh => {
        mesh.scale.copy(mesh.userData.originalScale);
        mesh.material.opacity = 0.9;
        mesh.material.emissiveIntensity = 0.3;
      });
    }

    function setLevel(level, parentId = null) {
      currentLevel = level;

      // Update UI
      document.querySelectorAll('.level-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.level === level);
      });

      // Filter nodes
      let filteredNodes;
      if (parentId) {
        const parent = nodesData.find(n => n.id === parentId);
        if (parent) {
          filteredNodes = nodesData.filter(n =>
            n.id === parentId ||
            (parent.children && parent.children.includes(n.id))
          );
        } else {
          filteredNodes = nodesData.filter(n => n.level === level);
        }
      } else {
        // Show current level and one above
        const levelIndex = parseInt(level.substring(1));
        filteredNodes = nodesData.filter(n => {
          const nodeLevel = parseInt(n.level.substring(1));
          return nodeLevel >= levelIndex - 1 && nodeLevel <= levelIndex;
        });
      }

      // Apply dead code filter if active
      if (deadCodeFilterActive) {
        filteredNodes = filteredNodes.filter(n => deadCodeNodeIds.has(n.id));
      }

      // Limit for performance
      if (filteredNodes.length > 500) {
        filteredNodes = filteredNodes.slice(0, 500);
      }

      // Filter edges
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      const filteredEdges = edgesData.filter(e =>
        nodeIds.has(e.source) && nodeIds.has(e.target) && e.type !== 'contains'
      );

      // Recreate visualization
      createNodes(filteredNodes);
      createEdges(filteredEdges);

      // Update tree view
      updateNodeTree(filteredNodes);
    }

    function getNextLevel(level) {
      const levels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
      const index = levels.indexOf(level);
      return index < levels.length - 1 ? levels[index + 1] : null;
    }

    function animateCameraTo(node) {
      const mesh = nodeMeshes.get(node.id);
      if (!mesh) return;

      const targetPosition = mesh.position.clone();
      const cameraOffset = new THREE.Vector3(0, 50, 150);
      const newCameraPos = targetPosition.clone().add(cameraOffset);

      gsapTo(camera.position, {
        x: newCameraPos.x,
        y: newCameraPos.y,
        z: newCameraPos.z
      });

      gsapTo(controls.target, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z
      });
    }

    function highlightConnectedEdges(node) {
      edgeLines.forEach((line, id) => {
        const edge = line.userData.edge;
        const isConnected = edge.source === node.id || edge.target === node.id;

        line.material.opacity = isConnected ? 0.8 : 0.1;
        if (isConnected) {
          line.material.color.setHex(0x00ffff);
        }
      });
    }

    // Simple animation helper (since we're not loading gsap)
    function gsapTo(obj, props) {
      const duration = 1000;
      const start = {};
      const keys = Object.keys(props);
      keys.forEach(k => start[k] = obj[k]);

      const startTime = Date.now();

      function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        keys.forEach(k => {
          obj[k] = start[k] + (props[k] - start[k]) * eased;
        });

        if (progress < 1) {
          requestAnimationFrame(update);
        }
      }

      update();
    }

    // ===========================================================================
    // UI UPDATES
    // ===========================================================================
    function showTooltip(node, x, y) {
      const tooltip = document.getElementById('tooltip');
      tooltip.querySelector('.tooltip-title').textContent = node.name;
      tooltip.querySelector('.type').textContent = \`Type: \${node.type} (\${node.level})\`;
      tooltip.querySelector('.location').textContent = node.location?.file || '';
      tooltip.querySelector('.metrics').textContent =
        \`LOC: \${node.metrics?.loc || 0} | Complexity: \${node.metrics?.complexity || '-'}\`;

      tooltip.style.left = (x + 15) + 'px';
      tooltip.style.top = (y + 15) + 'px';
      tooltip.classList.add('visible');
    }

    function hideTooltip() {
      document.getElementById('tooltip').classList.remove('visible');
    }

    function updateNodeDetails(node) {
      const container = document.getElementById('selected-node-details');

      container.innerHTML = \`
        <div class="detail-section">
          <div class="detail-label">Nom</div>
          <div class="detail-value" style="color: #00ffff; font-size: 16px; font-weight: bold;">
            \${node.name}
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-label">Type / Niveau</div>
          <div class="detail-value">\${node.type} (\${node.level})</div>
        </div>

        \${node.signature ? \`
        <div class="detail-section">
          <div class="detail-label">Signature</div>
          <div class="detail-code">\${node.signature}</div>
        </div>
        \` : ''}

        \${node.location?.file ? \`
        <div class="detail-section">
          <div class="detail-label">Fichier</div>
          <div class="detail-value">\${node.location.file}:\${node.location.line}</div>
        </div>
        \` : ''}

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">\${node.metrics?.loc || 0}</div>
            <div class="metric-label">Lignes</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">\${node.metrics?.complexity || '-'}</div>
            <div class="metric-label">Complexité</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">\${node.metrics?.dependencies || 0}</div>
            <div class="metric-label">Dépendances</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">\${node.children?.length || 0}</div>
            <div class="metric-label">Enfants</div>
          </div>
        </div>

        \${node.documentation ? \`
        <div class="detail-section" style="margin-top: 15px;">
          <div class="detail-label">Documentation</div>
          <div class="detail-value" style="font-size: 11px; color: #888;">
            \${node.documentation.substring(0, 200)}...
          </div>
        </div>
        \` : ''}
      \`;

      // Update relations tab
      updateNodeRelations(node);

      // Update code tab
      updateNodeCode(node);
    }

    function updateNodeCode(node) {
      const container = document.getElementById('selected-node-code');

      // Build code preview content
      let codeContent = '';

      if (node.signature) {
        codeContent += \`
          <div class="detail-section">
            <div class="detail-label">Signature</div>
            <div class="detail-code">\${escapeHtml(node.signature)}</div>
          </div>
        \`;
      }

      if (node.type === 'function' || node.type === 'method' || node.type === 'arrow' || node.type === 'closure') {
        // Show function parameters if available
        const params = node.parameters || [];
        if (params.length > 0) {
          codeContent += \`
            <div class="detail-section">
              <div class="detail-label">Paramètres (\${params.length})</div>
              <div class="detail-code">\${params.map(p => \`\${p.name}: \${p.type || 'any'}\`).join('\\n')}</div>
            </div>
          \`;
        }

        // Show return type if available
        if (node.returnType) {
          codeContent += \`
            <div class="detail-section">
              <div class="detail-label">Type de retour</div>
              <div class="detail-code">\${escapeHtml(node.returnType)}</div>
            </div>
          \`;
        }
      }

      if (node.type === 'class' || node.type === 'struct' || node.type === 'interface') {
        // Show class members summary
        const childFunctions = (node.children || [])
          .map(id => nodesData.find(n => n.id === id))
          .filter(n => n && (n.type === 'method' || n.type === 'function' || n.type === 'constructor'));

        const childProps = (node.children || [])
          .map(id => nodesData.find(n => n.id === id))
          .filter(n => n && (n.type === 'property' || n.type === 'variable' || n.type === 'attribute'));

        if (childProps.length > 0) {
          codeContent += \`
            <div class="detail-section">
              <div class="detail-label">Propriétés (\${childProps.length})</div>
              <div class="detail-code">\${childProps.slice(0, 10).map(p => p.name).join('\\n')}\${childProps.length > 10 ? '\\n...' : ''}</div>
            </div>
          \`;
        }

        if (childFunctions.length > 0) {
          codeContent += \`
            <div class="detail-section">
              <div class="detail-label">Méthodes (\${childFunctions.length})</div>
              <div class="detail-code">\${childFunctions.slice(0, 10).map(f => f.signature || f.name).join('\\n')}\${childFunctions.length > 10 ? '\\n...' : ''}</div>
            </div>
          \`;
        }
      }

      // Show file location with clickable link
      if (node.location?.file) {
        codeContent += \`
          <div class="detail-section">
            <div class="detail-label">Emplacement</div>
            <div class="detail-code" style="color: #00ccff; cursor: pointer;"
                 title="Fichier: \${node.location.file}">
              \${node.location.file}:\${node.location.line || 1}\${node.location.endLine ? '-' + node.location.endLine : ''}
            </div>
          </div>
        \`;
      }

      // Show documentation/comments
      if (node.documentation) {
        codeContent += \`
          <div class="detail-section">
            <div class="detail-label">Documentation</div>
            <div class="detail-code" style="color: #888; font-style: italic; white-space: pre-wrap;">
\${escapeHtml(node.documentation.substring(0, 500))}\${node.documentation.length > 500 ? '...' : ''}
            </div>
          </div>
        \`;
      }

      // Fallback if no code info available
      if (!codeContent) {
        codeContent = \`
          <div style="color: #666; text-align: center; padding: 30px;">
            <div style="font-size: 24px; margin-bottom: 10px;">📝</div>
            <div>Pas d'aperçu de code disponible</div>
            <div style="font-size: 11px; margin-top: 5px;">pour ce type de nœud</div>
          </div>
        \`;
      }

      container.innerHTML = codeContent;
    }

    function escapeHtml(text) {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function updateNodeRelations(node) {
      const container = document.getElementById('selected-node-relations');

      const incoming = edgesData.filter(e => e.target === node.id);
      const outgoing = edgesData.filter(e => e.source === node.id);

      container.innerHTML = \`
        <div class="detail-section">
          <div class="detail-label">Entrant (\${incoming.length})</div>
          \${incoming.slice(0, 10).map(e => {
            const source = nodesData.find(n => n.id === e.source);
            return \`<div class="tree-node" onclick="selectNodeById('\${e.source}')">
              <span style="color: #00ff88;">←</span> \${source?.name || e.source} <small style="color: #666;">(\${e.type})</small>
            </div>\`;
          }).join('')}
        </div>

        <div class="detail-section">
          <div class="detail-label">Sortant (\${outgoing.length})</div>
          \${outgoing.filter(e => e.type !== 'contains').slice(0, 10).map(e => {
            const target = nodesData.find(n => n.id === e.target);
            return \`<div class="tree-node" onclick="selectNodeById('\${e.target}')">
              <span style="color: #ff8800;">→</span> \${target?.name || e.target} <small style="color: #666;">(\${e.type})</small>
            </div>\`;
          }).join('')}
        </div>
      \`;
    }

    function updateBreadcrumb(node) {
      const breadcrumb = document.getElementById('breadcrumb');
      const path = [];

      let current = node;
      while (current) {
        path.unshift(current);
        current = current.parent ? nodesData.find(n => n.id === current.parent) : null;
      }

      breadcrumb.innerHTML = path.map((n, i) => \`
        <span class="breadcrumb-item" onclick="selectNodeById('\${n.id}')">\${n.name}</span>
        \${i < path.length - 1 ? '<span class="breadcrumb-separator">›</span>' : ''}
      \`).join('');
    }

    // Track expanded state
    const expandedNodes = new Set();

    function updateNodeTree(nodes) {
      const container = document.getElementById('node-tree');

      // Build hierarchical tree structure
      const nodeMap = new Map();
      nodes.forEach(n => nodeMap.set(n.id, n));

      // Find root nodes (nodes without parent or parent not in current view)
      const rootNodes = nodes.filter(n => !n.parent || !nodeMap.has(n.parent));

      // Sort roots: systems first, then modules, then by name
      rootNodes.sort((a, b) => {
        const levelOrder = { L1: 0, L2: 1, L3: 2, L4: 3, L5: 4, L6: 5, L7: 6 };
        const levelDiff = (levelOrder[a.level] || 7) - (levelOrder[b.level] || 7);
        if (levelDiff !== 0) return levelDiff;
        return a.name.localeCompare(b.name);
      });

      container.innerHTML = renderTreeNodes(rootNodes, nodeMap, 0);
    }

    function renderTreeNodes(nodes, nodeMap, depth) {
      if (!nodes || nodes.length === 0) return '';

      return nodes.map(node => {
        // Get children that are in current view
        const children = (node.children || [])
          .map(childId => nodeMap.get(childId))
          .filter(Boolean)
          .sort((a, b) => {
            const levelOrder = { L1: 0, L2: 1, L3: 2, L4: 3, L5: 4, L6: 5, L7: 6 };
            const levelDiff = (levelOrder[a.level] || 7) - (levelOrder[b.level] || 7);
            if (levelDiff !== 0) return levelDiff;
            return a.name.localeCompare(b.name);
          });

        const hasChildren = children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        const indent = depth * 16;
        const colorHex = (nodeColors[node.type] || 0x888888).toString(16).padStart(6, '0');

        const isLocked = lockedNodes.has(node.id);
        const isHidden = hiddenNodes.has(node.id);

        return \`
          <div class="tree-item" data-node-id="\${node.id}">
            <div class="tree-row \${selectedNode?.id === node.id ? 'selected' : ''} \${isLocked ? 'locked' : ''} \${isHidden ? 'hidden' : ''}"
                 style="padding-left: \${indent + 8}px; \${isHidden ? 'opacity: 0.4;' : ''}"
                 onclick="handleTreeClick(event, '\${node.id}')"
                 ondblclick="drillDownById('\${node.id}')"
                 oncontextmenu="showTreeContextMenu(event, '\${node.id}')">
              <span class="tree-toggle \${hasChildren ? (isExpanded ? 'expanded' : 'collapsed') : 'leaf'}"
                    onclick="event.stopPropagation(); toggleTreeNode('\${node.id}')">
                \${hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
              </span>
              <span class="tree-icon" style="background: #\${colorHex}25; color: #\${colorHex};">
                \${getNodeIcon(node.type)}
              </span>
              <span class="tree-label" title="\${node.fullPath || node.name}">\${node.name}</span>
              \${hasChildren ? \`<span class="tree-badge">\${children.length}</span>\` : ''}
            </div>
            \${hasChildren && isExpanded ? \`
              <div class="tree-children">
                \${renderTreeNodes(children, nodeMap, depth + 1)}
              </div>
            \` : ''}
          </div>
        \`;
      }).join('');
    }

    window.toggleTreeNode = function(nodeId) {
      if (expandedNodes.has(nodeId)) {
        expandedNodes.delete(nodeId);
      } else {
        expandedNodes.add(nodeId);
      }
      // Re-render tree
      const filteredNodes = getFilteredNodesForCurrentLevel();
      updateNodeTree(filteredNodes);
    };

    window.handleTreeClick = function(event, nodeId) {
      selectNodeById(nodeId);
      // Update tree to show selection
      document.querySelectorAll('.tree-row').forEach(row => {
        row.classList.remove('selected');
      });
      const clickedRow = event.currentTarget;
      clickedRow.classList.add('selected');
    };

    window.showTreeContextMenu = function(event, nodeId) {
      event.preventDefault();
      event.stopPropagation();

      const node = nodesData.find(n => n.id === nodeId);
      if (node) {
        contextMenuNode = node;
        showContextMenu(event.clientX, event.clientY, node);
      }
    };

    function getFilteredNodesForCurrentLevel() {
      const levelIndex = parseInt(currentLevel.substring(1));
      return nodesData.filter(n => {
        const nodeLevel = parseInt(n.level.substring(1));
        return nodeLevel >= levelIndex - 1 && nodeLevel <= levelIndex + 2;
      }).slice(0, 500);
    }

    // Expand to node (reveal path)
    function expandToNode(nodeId) {
      const node = nodesData.find(n => n.id === nodeId);
      if (!node) return;

      // Expand all ancestors
      let current = node;
      while (current && current.parent) {
        const parent = nodesData.find(n => n.id === current.parent);
        if (parent) {
          expandedNodes.add(parent.id);
          current = parent;
        } else {
          break;
        }
      }
    }

    function getNodeIcon(type) {
      const icons = {
        system: '⚡',
        module: '📦',
        file: '📄',
        class: '🔷',
        struct: '🔶',
        interface: '🔻',
        trait: '🔸',
        enum: '🔹',
        function: 'ƒ',
        method: 'ƒ',
        arrow: '→',
        constructor: '🔨',
        variable: '𝑥',
        constant: '𝐶',
        parameter: '𝑝'
      };
      return icons[type] || '•';
    }

    // Global functions for onclick handlers
    window.selectNodeById = function(id) {
      const node = nodesData.find(n => n.id === id);
      if (node) selectNode(node);
    };

    window.drillDownById = function(id) {
      const node = nodesData.find(n => n.id === id);
      if (node && node.children?.length > 0) drillDown(node);
    };

    // Reset all nodes to their initial calculated positions
    window.resetAllPositions = function() {
      nodeMeshes.forEach((mesh, id) => {
        const initialPos = mesh.userData.initialPosition;
        if (initialPos) {
          // Reset originalPosition to initial
          mesh.userData.originalPosition = initialPos.clone();

          // Apply velocity towards initial position for smooth animation
          const velocity = nodeVelocities.get(id) || new THREE.Vector3();
          const displacement = new THREE.Vector3().subVectors(initialPos, mesh.position);
          velocity.copy(displacement.multiplyScalar(0.1));
          nodeVelocities.set(id, velocity);
        }
      });

      // Update all edges
      nodeMeshes.forEach((mesh, id) => {
        if (mesh.userData.node) {
          updateConnectedEdges(mesh.userData.node);
        }
      });
    };

    // Toggle dead code filter
    window.toggleDeadCodeFilter = function() {
      deadCodeFilterActive = !deadCodeFilterActive;

      // Update button UI
      const btn = document.querySelector('[data-filter="deadcode"]');
      if (btn) {
        btn.classList.toggle('active', deadCodeFilterActive);
      }

      // Show notification
      if (deadCodeFilterActive) {
        const count = deadCodeNodeIds.size;
        showNotification(\`Filtre Dead Code activé (\${count} éléments)\`);
      } else {
        showNotification('Filtre Dead Code désactivé');
      }

      // Refresh visualization
      setLevel(currentLevel);
    };

    // ===========================================================================
    // SEARCH
    // ===========================================================================
    function initSearch() {
      const input = document.getElementById('search-input');
      const results = document.getElementById('search-results');

      input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        if (query.length < 2) {
          results.classList.remove('active');
          return;
        }

        const matches = nodesData
          .filter(n => n.name.toLowerCase().includes(query) || n.fullPath?.toLowerCase().includes(query))
          .slice(0, 20);

        if (matches.length === 0) {
          results.classList.remove('active');
          return;
        }

        results.innerHTML = matches.map(n => \`
          <div class="search-result" onclick="selectNodeById('\${n.id}'); document.getElementById('search-results').classList.remove('active');">
            <div class="search-result-type">\${n.type}</div>
            <div class="search-result-name">\${n.name}</div>
            <div class="search-result-path">\${n.location?.file || ''}</div>
          </div>
        \`).join('');

        results.classList.add('active');
      });

      input.addEventListener('blur', () => {
        setTimeout(() => results.classList.remove('active'), 200);
      });
    }

    // ===========================================================================
    // ISSUES PANEL
    // ===========================================================================
    function initIssuesPanel() {
      const summary = document.getElementById('security-summary');
      const list = document.getElementById('issues-list');
      const count = document.getElementById('issues-count');

      // Combine regular issues and security vulnerabilities
      let allIssues = [...issuesData];

      if (securityData) {
        allIssues = allIssues.concat(
          securityData.vulnerabilities.map(v => ({
            ...v,
            type: v.category,
            message: v.title + ': ' + v.description.substring(0, 100)
          }))
        );
      }

      // Sort by severity
      const severityOrder = { critical: 0, error: 0, high: 1, medium: 2, warning: 2, low: 3, info: 4 };
      allIssues.sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4));

      count.textContent = \`\${allIssues.length} issues\`;

      // Summary badges
      if (securityData) {
        const s = securityData.summary;
        summary.innerHTML = \`
          \${s.critical > 0 ? \`<div class="severity-badge critical">🔴 \${s.critical} Critical</div>\` : ''}
          \${s.high > 0 ? \`<div class="severity-badge high">🟠 \${s.high} High</div>\` : ''}
          \${s.medium > 0 ? \`<div class="severity-badge medium">🟡 \${s.medium} Medium</div>\` : ''}
          \${s.low > 0 ? \`<div class="severity-badge low">🔵 \${s.low} Low</div>\` : ''}
        \`;
      }

      // Issue list
      list.innerHTML = allIssues.slice(0, 50).map(issue => {
        const severity = issue.severity === 'error' ? 'critical' : issue.severity;
        return \`
          <div class="issue-item \${severity}" onclick="focusOnIssue('\${issue.location?.file}', \${issue.location?.line})">
            <div class="issue-severity \${severity}"></div>
            <div class="issue-content">
              <div class="issue-title">\${issue.title || issue.type}</div>
              <div class="issue-location">\${issue.location?.file || ''}:\${issue.location?.line || ''}</div>
              <div style="font-size: 11px; color: #888; margin-top: 4px;">\${(issue.message || issue.description || '').substring(0, 100)}</div>
            </div>
          </div>
        \`;
      }).join('');
    }

    window.focusOnIssue = function(file, line) {
      // Find node at this location
      const node = nodesData.find(n => n.location?.file === file && n.location?.line === line);
      if (node) {
        selectNode(node);
      }
    };

    // ===========================================================================
    // VIEW MODE SWITCHING
    // ===========================================================================
    function initViewModes() {
      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.mode;
          viewMode = mode;

          document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          switchViewMode(mode);
        });
      });
    }

    function switchViewMode(mode) {
      switch (mode) {
        case 'callgraph':
          showCallGraph();
          break;
        case 'dataflow':
          showDataFlow();
          break;
        case 'security':
          showSecurityView();
          break;
        default:
          setLevel(currentLevel);
      }
    }

    function showCallGraph() {
      const cgNodes = callGraphData.nodes;
      const cgEdges = callGraphData.edges;

      // Convert to our format
      const nodes = cgNodes.map(n => {
        const original = nodesData.find(o => o.id === n.id);
        return original || {
          id: n.id,
          name: n.name,
          type: 'function',
          level: 'L5',
          location: { file: n.file, line: n.line },
          metrics: { loc: 0, complexity: 0, dependencies: 0, dependents: 0 },
          children: []
        };
      });

      const edges = cgEdges.map(e => ({
        id: \`cg-\${e.source}-\${e.target}\`,
        source: e.source,
        target: e.target,
        type: e.isAsync ? 'awaits' : 'calls'
      }));

      createNodes(nodes.slice(0, 300));
      createEdges(edges);
    }

    function showDataFlow() {
      // Highlight data flow paths
      const flowNodes = new Set();
      const flowEdges = [];

      dataFlowsData.forEach(flow => {
        const sourceNode = nodesData.find(n =>
          n.location?.file === flow.defined.file && n.location?.line === flow.defined.line
        );
        if (sourceNode) {
          flowNodes.add(sourceNode.id);

          flow.flowsTo.forEach(target => {
            const targetNode = nodesData.find(n =>
              n.location?.file === target.file
            );
            if (targetNode) {
              flowNodes.add(targetNode.id);
              flowEdges.push({
                id: \`df-\${sourceNode.id}-\${targetNode.id}\`,
                source: sourceNode.id,
                target: targetNode.id,
                type: 'data_flow'
              });
            }
          });
        }
      });

      const nodes = nodesData.filter(n => flowNodes.has(n.id));
      createNodes(nodes);
      createEdges(flowEdges);
    }

    function showSecurityView() {
      if (!securityData) {
        setLevel(currentLevel);
        return;
      }

      // Show nodes with vulnerabilities
      const vulnFiles = new Set(securityData.vulnerabilities.map(v => v.location.file));
      const nodes = nodesData.filter(n => vulnFiles.has(n.location?.file));

      createNodes(nodes);

      // Color nodes by severity
      nodes.forEach(n => {
        const vuln = securityData.vulnerabilities.find(v => v.location.file === n.location?.file);
        if (vuln) {
          const mesh = nodeMeshes.get(n.id);
          if (mesh) {
            mesh.material.color.setHex(severityColors[vuln.severity] || 0x888888);
            mesh.material.emissive.setHex(severityColors[vuln.severity] || 0x888888);
          }
        }
      });
    }

    // ===========================================================================
    // TAB SWITCHING
    // ===========================================================================
    function initTabs() {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.dataset.tab;

          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

          btn.classList.add('active');
          document.getElementById('tab-' + tab).classList.add('active');
        });
      });
    }

    // ===========================================================================
    // INITIALIZATION
    // ===========================================================================
    function init() {
      initThreeJS();
      initSearch();
      initIssuesPanel();
      initViewModes();
      initTabs();

      // Initial render
      setLevel('L1');

      // Start animation
      animate();

      // Hide loading
      setTimeout(() => {
        document.getElementById('loading-overlay').classList.add('hidden');
      }, 1500);
    }

    // Start when Three.js is loaded
    function startApp() {
      if (window.THREE && window.OrbitControls && window.EffectComposer) {
        init();
      } else {
        window.addEventListener('three-loaded', init, { once: true });
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startApp);
    } else {
      startApp();
    }
  </script>
</body>
</html>`;
}
