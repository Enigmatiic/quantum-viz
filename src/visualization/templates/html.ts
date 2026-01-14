// =============================================================================
// HTML TEMPLATES - Structure HTML de la visualisation 3D
// =============================================================================

import type { AnalysisResult } from '../../types';

/**
 * Genere le template du loading overlay
 */
export function getLoadingOverlay(): string {
  return `
  <div id="loading-overlay">
    <div class="loading-spinner"></div>
    <div class="loading-text">Initializing Neural Network...</div>
  </div>
  `;
}

/**
 * Genere le template du tooltip
 */
export function getTooltip(): string {
  return `
  <div id="tooltip">
    <div class="tooltip-title"></div>
    <div class="tooltip-info type"></div>
    <div class="tooltip-info location"></div>
    <div class="tooltip-info metrics"></div>
  </div>
  `;
}

/**
 * Genere le menu contextuel
 */
export function getContextMenu(): string {
  return `
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
  `;
}

/**
 * Genere la barre superieure
 */
export function getTopBar(analysis: AnalysisResult): string {
  return `
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
  `;
}

/**
 * Genere le panneau de navigation gauche
 */
export function getLeftPanel(): string {
  return `
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
  `;
}

/**
 * Genere le panneau de details droit
 */
export function getRightPanel(): string {
  return `
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
  `;
}

/**
 * Genere le panneau des issues en bas
 */
export function getBottomPanel(): string {
  return `
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
  `;
}

/**
 * Genere le bouton "Show All"
 */
export function getShowAllButton(): string {
  return `
  <button class="show-all-btn" id="show-all-btn" onclick="showAllNodes()">
    👁 Afficher tous les nœuds
  </button>
  `;
}

/**
 * Genere le modal des raccourcis clavier
 */
export function getKeyboardShortcutsModal(): string {
  return `
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
  `;
}

/**
 * Genere les controles d'aide
 */
export function getControlsHelp(): string {
  return `
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
  `;
}

/**
 * Genere les imports Three.js
 */
export function getThreeJsImports(): string {
  return `
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
  `;
}
