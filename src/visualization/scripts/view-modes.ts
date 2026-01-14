// =============================================================================
// VIEW MODES - Modes de visualisation (architecture, callgraph, dataflow, security)
// =============================================================================

/**
 * Genere le script des modes de visualisation
 */
export function getViewModes(): string {
  return `
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
  `;
}
