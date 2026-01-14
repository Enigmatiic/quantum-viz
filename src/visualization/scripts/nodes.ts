// =============================================================================
// NODE CREATION - Creation et gestion des noeuds 3D
// =============================================================================

/**
 * Genere le script de creation des noeuds
 */
export function getNodeCreation(): string {
  return `
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
  `;
}
