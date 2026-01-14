// =============================================================================
// MOUSE INTERACTION - Gestion des interactions souris
// =============================================================================

/**
 * Genere le script des interactions souris
 */
export function getMouseInteraction(): string {
  return `
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
            showNotification('Ce noeud est verrouille (L pour deverrouiller)');
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
  `;
}
