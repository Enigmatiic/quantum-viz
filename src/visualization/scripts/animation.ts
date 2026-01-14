// =============================================================================
// ANIMATION LOOP - Boucle d'animation principale
// =============================================================================

/**
 * Genere le script de la boucle d'animation
 */
export function getAnimationLoop(): string {
  return `
    // ===========================================================================
    // ANIMATION LOOP
    // ===========================================================================
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
  `;
}
