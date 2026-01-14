// =============================================================================
// CONTEXT MENU - Menu contextuel et actions
// =============================================================================

/**
 * Genere le script du menu contextuel
 */
export function getContextMenuScript(): string {
  return `
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
        lockItem.innerHTML = \`<span class="icon">\${isLocked ? '🔓' : '📌'}</span><span>\${isLocked ? 'Deverrouiller' : 'Verrouiller la position'}</span>\`;
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
            showNotification('Chemin copie: ' + path);
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
      showNotification('Tous les noeuds sont visibles');
    };

    function updateShowAllButton() {
      const btn = document.getElementById('show-all-btn');
      if (hiddenNodes.size > 0) {
        btn.classList.add('visible');
        btn.textContent = \`👁 Afficher tous (\${hiddenNodes.size} masques)\`;
      } else {
        btn.classList.remove('visible');
      }
    }
  `;
}
