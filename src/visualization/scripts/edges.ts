// =============================================================================
// EDGE CREATION - Creation des aretes et particules
// =============================================================================

/**
 * Genere le script de creation des aretes avec particules
 * @param edgeOpacity L'opacite des aretes (depuis config)
 */
export function getEdgeCreation(edgeOpacity: number): string {
  return `
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
          opacity: ${edgeOpacity},
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
  `;
}
