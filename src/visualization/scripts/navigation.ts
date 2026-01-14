// =============================================================================
// NODE SELECTION & NAVIGATION - Selection et navigation dans le graphe
// =============================================================================

/**
 * Genere le script de selection et navigation
 */
export function getNavigation(): string {
  return `
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
        showNotification(\`Filtre Dead Code active (\${count} elements)\`);
      } else {
        showNotification('Filtre Dead Code desactive');
      }

      // Refresh visualization
      setLevel(currentLevel);
    };
  `;
}
