// =============================================================================
// USE THREE SCENE - Hook pour gérer la scène Three.js
// =============================================================================

import { useRef, useEffect, useCallback, useState } from 'react';
import type { CodeNode, CodeEdge, VisualizationConfig, PhysicsConfig } from '../../../types';
import { DEFAULT_VISUALIZATION_CONFIG, DEFAULT_PHYSICS_CONFIG } from '../../../types';

interface ThreeSceneState {
  isReady: boolean;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
}

interface UseThreeSceneOptions {
  nodes: CodeNode[];
  edges: CodeEdge[];
  config?: Partial<VisualizationConfig>;
  physicsConfig?: Partial<PhysicsConfig>;
  hiddenNodes: Set<string>;
  lockedNodes: Set<string>;
  onNodeSelect?: (node: CodeNode | null) => void;
  onNodeHover?: (node: CodeNode | null) => void;
  onNodeContextMenu?: (event: MouseEvent, node: CodeNode) => void;
  onNodeDoubleClick?: (node: CodeNode) => void;
}

// Type pour les objets Three.js (sera injecté à l'exécution)
declare const THREE: any;

export function useThreeScene(
  containerRef: React.RefObject<HTMLElement>,
  options: UseThreeSceneOptions
) {
  const {
    nodes,
    edges,
    config = {},
    physicsConfig = {},
    hiddenNodes,
    lockedNodes,
    onNodeSelect,
    onNodeHover,
    onNodeContextMenu,
    onNodeDoubleClick
  } = options;

  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const nodeMeshesRef = useRef<Map<string, any>>(new Map());
  const edgeLinesRef = useRef<Map<string, any>>(new Map());
  const animationIdRef = useRef<number | null>(null);

  // État local
  const [state, setState] = useState<ThreeSceneState>({
    isReady: false,
    selectedNodeId: null,
    hoveredNodeId: null
  });

  // Configuration fusionnée
  const finalConfig = { ...DEFAULT_VISUALIZATION_CONFIG, ...config };
  const finalPhysics = { ...DEFAULT_PHYSICS_CONFIG, ...physicsConfig };

  // Physique
  const nodeVelocitiesRef = useRef<Map<string, any>>(new Map());
  const nodeTargetPositionsRef = useRef<Map<string, any>>(new Map());

  // Initialiser Three.js
  const initThree = useCallback(() => {
    if (!containerRef.current || typeof THREE === 'undefined') return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(finalConfig.backgroundColor);
    scene.fog = new THREE.Fog(finalConfig.backgroundColor, 200, 800);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    camera.position.set(0, 100, 200);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls (OrbitControls)
    if (typeof THREE.OrbitControls !== 'undefined') {
      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 10;
      controls.maxDistance = 1000;
      controlsRef.current = controls;
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x00ffff, 0.5, 500);
    pointLight.position.set(0, 50, 0);
    scene.add(pointLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(400, 40, 0x004444, 0x002222);
    gridHelper.position.y = -50;
    scene.add(gridHelper);

    setState(prev => ({ ...prev, isReady: true }));
  }, [containerRef, finalConfig.backgroundColor]);

  // Créer les noeuds 3D
  const createNodes = useCallback(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    nodeMeshesRef.current.clear();

    nodes.forEach((node, index) => {
      if (hiddenNodes.has(node.id)) return;

      // Géométrie selon le type
      let geometry: any;
      const size = getNodeSize(node);

      switch (node.type) {
        case 'system':
          geometry = new THREE.IcosahedronGeometry(size, 1);
          break;
        case 'module':
          geometry = new THREE.OctahedronGeometry(size);
          break;
        case 'file':
          geometry = new THREE.BoxGeometry(size * 1.2, size * 0.8, size * 0.4);
          break;
        case 'class':
        case 'struct':
          geometry = new THREE.DodecahedronGeometry(size);
          break;
        case 'interface':
        case 'trait':
          geometry = new THREE.TorusGeometry(size * 0.8, size * 0.3, 8, 16);
          break;
        case 'function':
        case 'method':
          geometry = new THREE.SphereGeometry(size * 0.7, 16, 16);
          break;
        default:
          geometry = new THREE.SphereGeometry(size * 0.5, 12, 12);
      }

      // Matériau
      const color = getNodeColor(node);
      const material = new THREE.MeshStandardMaterial({
        color: color.primary,
        emissive: color.emissive,
        emissiveIntensity: 0.3,
        metalness: 0.3,
        roughness: 0.5,
        transparent: true,
        opacity: 0.9
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Position
      const position = calculateNodePosition(node, index, nodes.length);
      mesh.position.copy(position);

      // User data
      mesh.userData = {
        node,
        originalScale: mesh.scale.clone(),
        initialPosition: position.clone(),
        originalPosition: position.clone()
      };

      scene.add(mesh);
      nodeMeshesRef.current.set(node.id, mesh);
    });
  }, [nodes, hiddenNodes]);

  // Créer les arêtes
  const createEdges = useCallback(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    edgeLinesRef.current.clear();

    edges.forEach(edge => {
      const sourceMesh = nodeMeshesRef.current.get(edge.source);
      const targetMesh = nodeMeshesRef.current.get(edge.target);

      if (!sourceMesh || !targetMesh) return;

      const points = [sourceMesh.position, targetMesh.position];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const material = new THREE.LineBasicMaterial({
        color: getEdgeColor(edge.type),
        transparent: true,
        opacity: finalConfig.edgeOpacity
      });

      const line = new THREE.Line(geometry, material);
      line.userData = { edge };

      scene.add(line);
      edgeLinesRef.current.set(edge.id, line);
    });
  }, [edges, finalConfig.edgeOpacity]);

  // Animation loop
  const animate = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    animationIdRef.current = requestAnimationFrame(animate);

    // Update controls
    if (controlsRef.current) {
      controlsRef.current.update();
    }

    // Update physics
    updatePhysics();

    // Render
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, []);

  // Physique des noeuds
  const updatePhysics = useCallback(() => {
    nodeMeshesRef.current.forEach((mesh, id) => {
      if (lockedNodes.has(id)) return;

      const originalPos = mesh.userData.originalPosition;
      if (!originalPos) return;

      let velocity = nodeVelocitiesRef.current.get(id);
      if (!velocity) {
        velocity = new THREE.Vector3();
        nodeVelocitiesRef.current.set(id, velocity);
      }

      // Spring force
      const displacement = new THREE.Vector3().subVectors(originalPos, mesh.position);
      const springForce = displacement.multiplyScalar(finalPhysics.springStiffness);

      velocity.add(springForce);
      velocity.multiplyScalar(finalPhysics.springDamping);

      if (velocity.length() > finalPhysics.velocityThreshold) {
        mesh.position.add(velocity);
        updateConnectedEdges(id);
      }
    });
  }, [lockedNodes, finalPhysics]);

  // Mettre à jour les arêtes connectées
  const updateConnectedEdges = useCallback((nodeId: string) => {
    edgeLinesRef.current.forEach((line, edgeId) => {
      const edge = line.userData.edge;
      if (edge.source !== nodeId && edge.target !== nodeId) return;

      const sourceMesh = nodeMeshesRef.current.get(edge.source);
      const targetMesh = nodeMeshesRef.current.get(edge.target);

      if (sourceMesh && targetMesh) {
        const positions = line.geometry.attributes.position;
        positions.setXYZ(0, sourceMesh.position.x, sourceMesh.position.y, sourceMesh.position.z);
        positions.setXYZ(1, targetMesh.position.x, targetMesh.position.y, targetMesh.position.z);
        positions.needsUpdate = true;
      }
    });
  }, []);

  // Reset positions
  const resetAllPositions = useCallback(() => {
    nodeMeshesRef.current.forEach((mesh, id) => {
      const initialPos = mesh.userData.initialPosition;
      if (initialPos) {
        mesh.userData.originalPosition = initialPos.clone();
        const velocity = nodeVelocitiesRef.current.get(id) || new THREE.Vector3();
        const displacement = new THREE.Vector3().subVectors(initialPos, mesh.position);
        velocity.copy(displacement.multiplyScalar(0.1));
        nodeVelocitiesRef.current.set(id, velocity);
      }
    });
  }, []);

  // Focus sur un noeud
  const focusOnNode = useCallback((nodeId: string) => {
    const mesh = nodeMeshesRef.current.get(nodeId);
    if (!mesh || !cameraRef.current || !controlsRef.current) return;

    const targetPos = mesh.position.clone();
    const cameraOffset = new THREE.Vector3(0, 30, 80);
    const newCameraPos = targetPos.clone().add(cameraOffset);

    // Animation simple (sans GSAP)
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    camera.position.lerp(newCameraPos, 0.1);
    controls.target.lerp(targetPos, 0.1);
  }, []);

  // Initialisation
  useEffect(() => {
    initThree();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [initThree]);

  // Créer les objets quand Three.js est prêt
  useEffect(() => {
    if (state.isReady) {
      createNodes();
      createEdges();
      animate();
    }
  }, [state.isReady, createNodes, createEdges, animate]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isReady: state.isReady,
    selectedNodeId: state.selectedNodeId,
    hoveredNodeId: state.hoveredNodeId,
    resetAllPositions,
    focusOnNode
  };
}

// Helpers
function getNodeSize(node: CodeNode): number {
  const baseSizes: Record<string, number> = {
    system: 15,
    module: 10,
    file: 6,
    class: 5,
    struct: 5,
    interface: 4,
    function: 3,
    method: 3,
    variable: 2
  };
  return baseSizes[node.type] || 3;
}

function getNodeColor(node: CodeNode): { primary: string; emissive: string } {
  const colors: Record<string, { primary: string; emissive: string }> = {
    system: { primary: '#ffffff', emissive: '#6666ff' },
    module: { primary: '#00ffff', emissive: '#003344' },
    file: { primary: '#00ff88', emissive: '#002211' },
    class: { primary: '#ff6600', emissive: '#331100' },
    struct: { primary: '#ffaa00', emissive: '#332200' },
    interface: { primary: '#ff00ff', emissive: '#330033' },
    function: { primary: '#00ccff', emissive: '#002233' },
    method: { primary: '#0099ff', emissive: '#001133' },
    variable: { primary: '#88ff88', emissive: '#113311' }
  };
  return colors[node.type] || { primary: '#888888', emissive: '#111111' };
}

function getEdgeColor(type: string): string {
  const colors: Record<string, string> = {
    imports: '#00ffff',
    calls: '#00ccff',
    extends: '#ff6600',
    implements: '#ff00ff'
  };
  return colors[type] || '#444444';
}

function calculateNodePosition(node: CodeNode, index: number, total: number): any {
  // Distribution sphérique
  const phi = Math.acos(-1 + (2 * index) / total);
  const theta = Math.sqrt(total * Math.PI) * phi;

  const radius = 50 + (parseInt(node.level.slice(1)) - 1) * 30;

  return new THREE.Vector3(
    radius * Math.cos(theta) * Math.sin(phi),
    radius * Math.cos(phi),
    radius * Math.sin(theta) * Math.sin(phi)
  );
}

export default useThreeScene;
