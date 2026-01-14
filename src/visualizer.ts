import type { AnalysisResult, GranularityLevel, LEVELS } from './types';

export function generateVisualization(result: AnalysisResult): string {
  const dataJson = JSON.stringify({
    meta: result.meta,
    stats: result.stats,
    nodes: result.nodes,
    edges: result.edges,
    layers: result.layers,
    callGraph: result.callGraph,
    dataFlows: result.dataFlows,
    issues: result.issues
  });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${result.meta.projectName} - Architecture Multi-Niveaux</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      overflow: hidden;
    }

    #app { display: flex; height: 100vh; }

    /* Sidebar */
    #sidebar {
      width: 360px;
      background: #161b22;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #30363d;
    }

    #sidebar-header {
      padding: 16px;
      border-bottom: 1px solid #30363d;
    }

    #sidebar-header h1 {
      font-size: 1.3rem;
      color: #58a6ff;
      margin-bottom: 4px;
    }

    #sidebar-header .subtitle {
      font-size: 0.75rem;
      color: #8b949e;
    }

    #sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    /* Stats Grid */
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }

    .stat-card {
      background: #21262d;
      padding: 10px;
      border-radius: 6px;
      text-align: center;
      border: 1px solid #30363d;
    }

    .stat-value {
      font-size: 1.3rem;
      font-weight: 600;
      color: #58a6ff;
    }

    .stat-label {
      font-size: 0.65rem;
      color: #8b949e;
      margin-top: 2px;
    }

    /* Level Selector */
    .level-selector {
      display: flex;
      gap: 4px;
      background: #21262d;
      padding: 4px;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .level-btn {
      flex: 1;
      padding: 8px 4px;
      background: transparent;
      border: none;
      color: #8b949e;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.15s;
    }

    .level-btn:hover { background: #30363d; color: #c9d1d9; }
    .level-btn.active { background: #58a6ff; color: #0d1117; }
    .level-btn .count { display: block; font-size: 0.65rem; opacity: 0.7; }

    /* Search */
    .search-box {
      width: 100%;
      padding: 10px 12px;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #c9d1d9;
      font-size: 0.85rem;
      margin-bottom: 16px;
    }

    .search-box:focus { outline: none; border-color: #58a6ff; }
    .search-box::placeholder { color: #6e7681; }

    /* Controls */
    .controls {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .btn {
      flex: 1;
      padding: 8px 12px;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #c9d1d9;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn:hover { background: #30363d; border-color: #58a6ff; }
    .btn.active { background: #238636; border-color: #238636; }

    /* Section Headers */
    .section-header {
      font-size: 0.7rem;
      font-weight: 600;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 16px 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #21262d;
    }

    /* Layer Legend */
    .legend { display: flex; flex-direction: column; gap: 4px; }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      background: #21262d;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
      border: 1px solid transparent;
    }

    .legend-item:hover { border-color: #30363d; }
    .legend-item.active { border-color: #58a6ff; background: #1c2128; }
    .legend-item.dimmed { opacity: 0.3; }

    .legend-color { width: 14px; height: 14px; border-radius: 3px; }
    .legend-text { flex: 1; }
    .legend-label { font-size: 0.8rem; }
    .legend-count { font-size: 0.65rem; color: #8b949e; }

    /* Issues Panel */
    .issues-list { max-height: 200px; overflow-y: auto; }

    .issue-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px;
      background: #21262d;
      border-radius: 4px;
      margin-bottom: 4px;
      font-size: 0.75rem;
      border-left: 3px solid;
    }

    .issue-item.error { border-color: #f85149; }
    .issue-item.warning { border-color: #d29922; }
    .issue-item.info { border-color: #58a6ff; }

    .issue-icon { font-size: 0.9rem; }
    .issue-content { flex: 1; }
    .issue-message { color: #c9d1d9; }
    .issue-location { color: #8b949e; font-size: 0.65rem; margin-top: 2px; }

    /* Details Panel */
    #details {
      background: #21262d;
      border-radius: 6px;
      padding: 12px;
      margin-top: 12px;
      display: none;
      border: 1px solid #30363d;
    }

    #details.visible { display: block; }

    #details h4 {
      color: #58a6ff;
      margin-bottom: 8px;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #details .badge {
      font-size: 0.65rem;
      padding: 2px 6px;
      background: #30363d;
      border-radius: 3px;
      color: #8b949e;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      padding: 4px 0;
      border-bottom: 1px solid #30363d;
    }

    .detail-label { color: #8b949e; }
    .detail-value { color: #c9d1d9; font-family: monospace; }

    .detail-section {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #30363d;
    }

    .detail-section h5 {
      font-size: 0.7rem;
      color: #8b949e;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .children-list, .signature-box {
      font-size: 0.75rem;
      font-family: monospace;
      background: #161b22;
      padding: 8px;
      border-radius: 4px;
      max-height: 150px;
      overflow-y: auto;
    }

    .children-list li {
      padding: 2px 0;
      color: #8b949e;
      cursor: pointer;
    }

    .children-list li:hover { color: #58a6ff; }

    /* Breadcrumb */
    #breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 16px;
      background: #21262d;
      border-bottom: 1px solid #30363d;
      font-size: 0.75rem;
      overflow-x: auto;
    }

    .breadcrumb-item {
      color: #58a6ff;
      cursor: pointer;
      white-space: nowrap;
    }

    .breadcrumb-item:hover { text-decoration: underline; }
    .breadcrumb-sep { color: #6e7681; }
    .breadcrumb-current { color: #c9d1d9; }

    /* Main Canvas */
    #main { flex: 1; display: flex; flex-direction: column; }
    #cy { flex: 1; background: #0d1117; }

    /* Toolbar */
    #toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #161b22;
      border-bottom: 1px solid #30363d;
    }

    .toolbar-group {
      display: flex;
      gap: 4px;
      padding-right: 12px;
      border-right: 1px solid #30363d;
    }

    .toolbar-btn {
      padding: 6px 12px;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 4px;
      color: #c9d1d9;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .toolbar-btn:hover { background: #30363d; }
    .toolbar-btn.active { background: #238636; border-color: #238636; }

    .toolbar-info {
      margin-left: auto;
      font-size: 0.75rem;
      color: #8b949e;
    }

    /* Node Type Colors */
    .node-system { color: #f0883e; }
    .node-module { color: #a371f7; }
    .node-file { color: #7ee787; }
    .node-class { color: #79c0ff; }
    .node-function { color: #ffa657; }
    .node-variable { color: #ff7b72; }
  </style>
</head>
<body>
  <div id="app">
    <div id="sidebar">
      <div id="sidebar-header">
        <h1>${result.meta.projectName}</h1>
        <p class="subtitle">v${result.meta.version} - ${new Date(result.meta.analyzedAt).toLocaleDateString('fr-FR')}</p>
      </div>

      <div id="breadcrumb">
        <span class="breadcrumb-item" onclick="navigateToRoot()">Root</span>
      </div>

      <div id="sidebar-content">
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-value">${result.stats.totalFiles}</div>
            <div class="stat-label">Fichiers</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${result.stats.totalClasses}</div>
            <div class="stat-label">Classes</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${result.stats.totalFunctions}</div>
            <div class="stat-label">Fonctions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${result.stats.totalVariables}</div>
            <div class="stat-label">Variables</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${(result.stats.totalLines / 1000).toFixed(1)}k</div>
            <div class="stat-label">Lignes</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${result.stats.avgComplexity.toFixed(1)}</div>
            <div class="stat-label">Complexite</div>
          </div>
        </div>

        <div class="level-selector" id="level-selector"></div>

        <input type="text" class="search-box" id="search" placeholder="Rechercher (nom, fichier, type...)">

        <div class="controls">
          <button class="btn" onclick="resetView()">Reset</button>
          <button class="btn" onclick="toggleLayout()">Layout</button>
          <button class="btn" id="callgraph-btn" onclick="toggleCallGraph()">Call Graph</button>
          <button class="btn" onclick="exportData()">Export</button>
        </div>

        <div class="section-header">Couches</div>
        <div class="legend" id="layer-legend"></div>

        <div class="section-header">Problemes Detectes (${result.issues.length})</div>
        <div class="issues-list" id="issues-list"></div>

        <div id="details">
          <h4><span id="detail-title"></span><span class="badge" id="detail-level"></span></h4>
          <div class="detail-row">
            <span class="detail-label">Type</span>
            <span class="detail-value" id="detail-type"></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Fichier</span>
            <span class="detail-value" id="detail-file"></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Ligne</span>
            <span class="detail-value" id="detail-line"></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Visibilite</span>
            <span class="detail-value" id="detail-visibility"></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">LOC</span>
            <span class="detail-value" id="detail-loc"></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Complexite</span>
            <span class="detail-value" id="detail-complexity"></span>
          </div>
          <div class="detail-section" id="signature-section" style="display:none">
            <h5>Signature</h5>
            <div class="signature-box" id="detail-signature"></div>
          </div>
          <div class="detail-section" id="children-section" style="display:none">
            <h5>Enfants (<span id="children-count">0</span>)</h5>
            <ul class="children-list" id="detail-children"></ul>
          </div>
        </div>
      </div>
    </div>

    <div id="main">
      <div id="toolbar">
        <div class="toolbar-group">
          <button class="toolbar-btn" onclick="zoomIn()">+</button>
          <button class="toolbar-btn" onclick="zoomOut()">-</button>
          <button class="toolbar-btn" onclick="fitView()">Fit</button>
        </div>
        <div class="toolbar-group">
          <button class="toolbar-btn" onclick="expandAll()">Expand All</button>
          <button class="toolbar-btn" onclick="collapseAll()">Collapse</button>
        </div>
        <span class="toolbar-info" id="view-info">Niveau: L1 | Noeuds: 0</span>
      </div>
      <div id="cy"></div>
    </div>
  </div>

  <script>
    // All data from analysis
    const DATA = ${dataJson};

    // State
    let currentLevel = 'L1';
    let currentParent = null;
    let showCallGraph = false;
    let activeLayer = null;
    let cy = null;

    // Level info
    const LEVELS = {
      L1: { name: 'Systeme', color: '#f0883e' },
      L2: { name: 'Module', color: '#a371f7' },
      L3: { name: 'Fichier', color: '#7ee787' },
      L4: { name: 'Classe', color: '#79c0ff' },
      L5: { name: 'Fonction', color: '#ffa657' },
      L6: { name: 'Bloc', color: '#d2a8ff' },
      L7: { name: 'Variable', color: '#ff7b72' }
    };

    // Layer colors
    const layerColors = {};
    DATA.layers.forEach(l => layerColors[l.id] = l.color);

    // Type shapes
    const typeShapes = {
      system: 'round-rectangle',
      module: 'round-rectangle',
      file: 'rectangle',
      class: 'round-rectangle',
      struct: 'round-rectangle',
      interface: 'diamond',
      trait: 'diamond',
      enum: 'hexagon',
      type_alias: 'round-tag',
      function: 'ellipse',
      method: 'ellipse',
      constructor: 'ellipse',
      arrow: 'ellipse',
      closure: 'ellipse',
      variable: 'tag',
      constant: 'tag',
      parameter: 'round-tag',
      attribute: 'round-tag',
      property: 'round-tag'
    };

    // Initialize level selector
    function initLevelSelector() {
      const container = document.getElementById('level-selector');
      container.innerHTML = '';

      Object.entries(LEVELS).forEach(([level, info]) => {
        const count = DATA.stats.byLevel[level] || 0;
        const btn = document.createElement('button');
        btn.className = 'level-btn' + (level === currentLevel ? ' active' : '');
        btn.innerHTML = level + '<span class="count">' + count + '</span>';
        btn.style.borderBottom = '2px solid ' + info.color;
        btn.onclick = () => setLevel(level);
        container.appendChild(btn);
      });
    }

    // Initialize layer legend
    function initLayerLegend() {
      const container = document.getElementById('layer-legend');
      container.innerHTML = '';

      const layerCounts = {};
      DATA.nodes.forEach(n => {
        if (n.layer) layerCounts[n.layer] = (layerCounts[n.layer] || 0) + 1;
      });

      DATA.layers.forEach(layer => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.dataset.layer = layer.id;
        item.innerHTML = \`
          <div class="legend-color" style="background: \${layer.color}"></div>
          <div class="legend-text">
            <div class="legend-label">\${layer.label}</div>
            <div class="legend-count">\${layerCounts[layer.id] || 0} composants</div>
          </div>
        \`;
        item.onclick = () => filterByLayer(layer.id, item);
        container.appendChild(item);
      });
    }

    // Initialize issues list
    function initIssuesList() {
      const container = document.getElementById('issues-list');
      container.innerHTML = '';

      const icons = { error: '!', warning: '?', info: 'i' };

      DATA.issues.slice(0, 20).forEach(issue => {
        const item = document.createElement('div');
        item.className = 'issue-item ' + issue.severity;
        item.innerHTML = \`
          <span class="issue-icon">\${icons[issue.severity]}</span>
          <div class="issue-content">
            <div class="issue-message">\${issue.message}</div>
            <div class="issue-location">\${issue.location.file}:\${issue.location.line}</div>
          </div>
        \`;
        item.onclick = () => highlightIssue(issue);
        container.appendChild(item);
      });

      if (DATA.issues.length > 20) {
        const more = document.createElement('div');
        more.className = 'issue-item info';
        more.innerHTML = '<span class="issue-icon">+</span><div class="issue-content"><div class="issue-message">' + (DATA.issues.length - 20) + ' autres problemes...</div></div>';
        container.appendChild(more);
      }
    }

    // Get nodes for current view
    function getVisibleNodes() {
      if (showCallGraph) {
        return DATA.callGraph.nodes.map(n => {
          const fullNode = DATA.nodes.find(fn => fn.id === n.id);
          return fullNode || { id: n.id, name: n.name, level: 'L5', type: 'function', location: { file: n.file, line: n.line } };
        });
      }

      if (currentParent) {
        const parent = DATA.nodes.find(n => n.id === currentParent);
        if (parent && parent.children.length > 0) {
          return DATA.nodes.filter(n => parent.children.includes(n.id));
        }
      }

      return DATA.nodes.filter(n => n.level === currentLevel);
    }

    // Get edges for current view
    function getVisibleEdges() {
      const visibleNodeIds = new Set(getVisibleNodes().map(n => n.id));

      if (showCallGraph) {
        return DATA.callGraph.edges.map(e => ({
          id: 'cg-' + e.source + '-' + e.target,
          source: e.source,
          target: e.target,
          type: e.isAsync ? 'awaits' : 'calls'
        })).filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
      }

      return DATA.edges.filter(e =>
        visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target) &&
        e.type !== 'contains' && e.type !== 'contained_by'
      );
    }

    // Initialize Cytoscape
    function initCytoscape() {
      const nodes = getVisibleNodes();
      const edges = getVisibleEdges();

      const cyNodes = nodes.map(n => ({
        data: {
          id: n.id,
          label: n.name,
          level: n.level,
          type: n.type,
          layer: n.layer,
          hasChildren: n.children && n.children.length > 0,
          nodeData: n
        },
        classes: [n.level, n.type, n.layer].filter(Boolean).join(' ')
      }));

      const cyEdges = edges.map((e, i) => ({
        data: {
          id: e.id || 'e' + i,
          source: e.source,
          target: e.target,
          type: e.type,
          label: e.label || ''
        }
      }));

      if (cy) cy.destroy();

      cy = cytoscape({
        container: document.getElementById('cy'),
        elements: [...cyNodes, ...cyEdges],
        style: [
          {
            selector: 'node',
            style: {
              'label': 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'font-size': '10px',
              'color': '#c9d1d9',
              'text-outline-color': '#0d1117',
              'text-outline-width': 2,
              'width': (ele) => ele.data('hasChildren') ? 100 : 80,
              'height': (ele) => ele.data('hasChildren') ? 60 : 45,
              'shape': (ele) => typeShapes[ele.data('type')] || 'ellipse',
              'background-color': (ele) => ele.data('layer') ? layerColors[ele.data('layer')] : LEVELS[ele.data('level')]?.color || '#6e7681',
              'border-width': (ele) => ele.data('hasChildren') ? 3 : 2,
              'border-color': '#30363d',
              'border-style': (ele) => ele.data('hasChildren') ? 'double' : 'solid'
            }
          },
          {
            selector: 'node:selected',
            style: { 'border-width': 4, 'border-color': '#58a6ff' }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': (ele) => {
                const type = ele.data('type');
                if (type === 'calls' || type === 'awaits') return '#ffa657';
                if (type === 'imports') return '#7ee787';
                if (type === 'extends' || type === 'implements') return '#79c0ff';
                return '#6e7681';
              },
              'line-style': (ele) => {
                const type = ele.data('type');
                if (type === 'awaits') return 'dashed';
                if (type === 'imports') return 'dotted';
                return 'solid';
              },
              'target-arrow-shape': 'triangle',
              'target-arrow-color': (ele) => {
                const type = ele.data('type');
                if (type === 'calls' || type === 'awaits') return '#ffa657';
                if (type === 'imports') return '#7ee787';
                if (type === 'extends' || type === 'implements') return '#79c0ff';
                return '#6e7681';
              },
              'curve-style': 'bezier',
              'opacity': 0.7
            }
          },
          {
            selector: '.dimmed',
            style: { 'opacity': 0.15 }
          },
          {
            selector: '.highlighted',
            style: { 'border-width': 4, 'border-color': '#58a6ff', 'opacity': 1 }
          }
        ],
        layout: {
          name: 'cose',
          animate: true,
          animationDuration: 300,
          nodeRepulsion: 8000,
          idealEdgeLength: 150,
          gravity: 0.3,
          nodeDimensionsIncludeLabels: true
        }
      });

      // Event handlers
      cy.on('tap', 'node', onNodeTap);
      cy.on('tap', (e) => { if (e.target === cy) onBackgroundTap(); });
      cy.on('dbltap', 'node', onNodeDoubleTap);

      updateViewInfo();
    }

    // Node tap handler
    function onNodeTap(e) {
      const node = e.target;
      const data = node.data('nodeData');

      // Update details panel
      document.getElementById('detail-title').textContent = data.name;
      document.getElementById('detail-level').textContent = data.level;
      document.getElementById('detail-type').textContent = data.type;
      document.getElementById('detail-file').textContent = data.location?.file || '-';
      document.getElementById('detail-line').textContent = data.location?.line || '-';
      document.getElementById('detail-visibility').textContent = data.visibility || '-';
      document.getElementById('detail-loc').textContent = data.metrics?.loc || '-';
      document.getElementById('detail-complexity').textContent = data.metrics?.complexity || '-';

      // Signature
      if (data.signature) {
        document.getElementById('signature-section').style.display = 'block';
        document.getElementById('detail-signature').textContent = data.signature;
      } else {
        document.getElementById('signature-section').style.display = 'none';
      }

      // Children
      if (data.children && data.children.length > 0) {
        document.getElementById('children-section').style.display = 'block';
        document.getElementById('children-count').textContent = data.children.length;
        const list = document.getElementById('detail-children');
        list.innerHTML = '';
        data.children.slice(0, 20).forEach(childId => {
          const child = DATA.nodes.find(n => n.id === childId);
          if (child) {
            const li = document.createElement('li');
            li.textContent = '[' + child.level + '] ' + child.name;
            li.onclick = () => navigateTo(childId);
            list.appendChild(li);
          }
        });
        if (data.children.length > 20) {
          const li = document.createElement('li');
          li.textContent = '... et ' + (data.children.length - 20) + ' autres';
          li.style.fontStyle = 'italic';
          list.appendChild(li);
        }
      } else {
        document.getElementById('children-section').style.display = 'none';
      }

      document.getElementById('details').classList.add('visible');

      // Highlight
      cy.elements().removeClass('highlighted dimmed');
      node.addClass('highlighted');
      node.neighborhood().addClass('highlighted');
      cy.elements().not(node.neighborhood().add(node)).addClass('dimmed');
    }

    // Double-tap to drill down
    function onNodeDoubleTap(e) {
      const node = e.target;
      const data = node.data('nodeData');

      if (data.children && data.children.length > 0) {
        navigateTo(data.id);
      }
    }

    // Background tap
    function onBackgroundTap() {
      document.getElementById('details').classList.remove('visible');
      cy.elements().removeClass('highlighted dimmed');
      activeLayer = null;
      document.querySelectorAll('.legend-item').forEach(el => el.classList.remove('active', 'dimmed'));
    }

    // Navigate to a node (drill down)
    function navigateTo(nodeId) {
      const node = DATA.nodes.find(n => n.id === nodeId);
      if (!node) return;

      currentParent = nodeId;
      updateBreadcrumb();
      initCytoscape();
    }

    // Navigate to root
    function navigateToRoot() {
      currentParent = null;
      currentLevel = 'L1';
      updateBreadcrumb();
      initLevelSelector();
      initCytoscape();
    }

    // Navigate up one level
    function navigateUp() {
      if (!currentParent) return;

      const parent = DATA.nodes.find(n => n.id === currentParent);
      if (parent && parent.parent) {
        currentParent = parent.parent;
      } else {
        currentParent = null;
      }
      updateBreadcrumb();
      initCytoscape();
    }

    // Update breadcrumb
    function updateBreadcrumb() {
      const container = document.getElementById('breadcrumb');
      container.innerHTML = '<span class="breadcrumb-item" onclick="navigateToRoot()">Root</span>';

      if (currentParent) {
        const path = [];
        let nodeId = currentParent;
        while (nodeId) {
          const node = DATA.nodes.find(n => n.id === nodeId);
          if (node) {
            path.unshift(node);
            nodeId = node.parent;
          } else break;
        }

        path.forEach((node, i) => {
          container.innerHTML += '<span class="breadcrumb-sep">/</span>';
          if (i === path.length - 1) {
            container.innerHTML += '<span class="breadcrumb-current">' + node.name + '</span>';
          } else {
            container.innerHTML += '<span class="breadcrumb-item" onclick="navigateTo(\\'' + node.id + '\\')">' + node.name + '</span>';
          }
        });
      }
    }

    // Set level
    function setLevel(level) {
      currentLevel = level;
      currentParent = null;
      updateBreadcrumb();
      initLevelSelector();
      initCytoscape();
    }

    // Filter by layer
    function filterByLayer(layerId, element) {
      if (activeLayer === layerId) {
        cy.elements().removeClass('dimmed highlighted');
        document.querySelectorAll('.legend-item').forEach(el => el.classList.remove('active', 'dimmed'));
        activeLayer = null;
      } else {
        cy.elements().addClass('dimmed');
        cy.nodes('[layer="' + layerId + '"]').removeClass('dimmed').addClass('highlighted');
        cy.nodes('[layer="' + layerId + '"]').connectedEdges().removeClass('dimmed');
        cy.nodes('[layer="' + layerId + '"]').connectedEdges().connectedNodes().removeClass('dimmed');

        document.querySelectorAll('.legend-item').forEach(el => {
          if (el.dataset.layer === layerId) {
            el.classList.add('active');
            el.classList.remove('dimmed');
          } else {
            el.classList.add('dimmed');
            el.classList.remove('active');
          }
        });
        activeLayer = layerId;
      }
    }

    // Toggle call graph view
    function toggleCallGraph() {
      showCallGraph = !showCallGraph;
      document.getElementById('callgraph-btn').classList.toggle('active', showCallGraph);
      initCytoscape();
    }

    // Highlight issue
    function highlightIssue(issue) {
      const nodeIds = issue.relatedNodes || [];
      if (nodeIds.length > 0) {
        cy.elements().addClass('dimmed');
        nodeIds.forEach(id => {
          const node = cy.getElementById(id);
          if (node.length > 0) {
            node.removeClass('dimmed').addClass('highlighted');
          }
        });
      }
    }

    // Update view info
    function updateViewInfo() {
      const nodes = getVisibleNodes();
      const level = currentParent ? 'Children' : currentLevel;
      document.getElementById('view-info').textContent = 'Vue: ' + level + ' | Noeuds: ' + nodes.length;
    }

    // Layout options
    let layoutIndex = 0;
    const layouts = ['cose', 'circle', 'breadthfirst', 'grid', 'concentric'];

    function toggleLayout() {
      layoutIndex = (layoutIndex + 1) % layouts.length;
      cy.layout({
        name: layouts[layoutIndex],
        animate: true,
        animationDuration: 300,
        nodeDimensionsIncludeLabels: true
      }).run();
    }

    // Controls
    function resetView() {
      cy.elements().removeClass('dimmed highlighted');
      document.querySelectorAll('.legend-item').forEach(el => el.classList.remove('active', 'dimmed'));
      activeLayer = null;
      document.getElementById('search').value = '';
      document.getElementById('details').classList.remove('visible');
      cy.fit(50);
    }

    function zoomIn() { cy.zoom(cy.zoom() * 1.2); }
    function zoomOut() { cy.zoom(cy.zoom() / 1.2); }
    function fitView() { cy.fit(50); }

    function expandAll() {
      // Show all children of visible nodes
      const currentNodes = getVisibleNodes();
      const allChildIds = new Set();
      currentNodes.forEach(n => {
        if (n.children) n.children.forEach(c => allChildIds.add(c));
      });
      // This would need more complex logic to actually expand
    }

    function collapseAll() {
      navigateToRoot();
    }

    function exportData() {
      const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '${result.meta.projectName}-analysis.json';
      a.click();
      URL.revokeObjectURL(url);
    }

    // Search
    document.getElementById('search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      if (!query) {
        cy.elements().removeClass('dimmed highlighted');
        return;
      }

      cy.elements().addClass('dimmed');
      const matching = cy.nodes().filter(n => {
        const data = n.data('nodeData');
        return n.data('label').toLowerCase().includes(query) ||
               data.fullPath?.toLowerCase().includes(query) ||
               data.type?.toLowerCase().includes(query) ||
               data.location?.file?.toLowerCase().includes(query);
      });
      matching.removeClass('dimmed').addClass('highlighted');
      matching.connectedEdges().removeClass('dimmed');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      if (e.key === 'Escape') {
        resetView();
      } else if (e.key === 'Backspace') {
        navigateUp();
      } else if (e.key >= '1' && e.key <= '7') {
        setLevel('L' + e.key);
      }
    });

    // Initialize
    initLevelSelector();
    initLayerLegend();
    initIssuesList();
    updateBreadcrumb();
    initCytoscape();
  </script>
</body>
</html>`;
}
