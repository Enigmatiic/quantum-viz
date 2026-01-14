// =============================================================================
// TREE NAVIGATION - Navigation dans l'arborescence des noeuds
// =============================================================================

/**
 * Genere le script de navigation dans l'arbre
 */
export function getTreeNavigation(): string {
  return `
    // ===========================================================================
    // TREE NAVIGATION
    // ===========================================================================
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
  `;
}
