// =============================================================================
// SCENE MANAGER - Gestion de la scène Three.js
// =============================================================================

import type { CodeNode, CodeEdge, VisualizationConfig } from '../../types';
import { DEFAULT_VISUALIZATION_CONFIG } from '../../types';
import { getNodeColor } from '../../utils';

/**
 * Gestionnaire de scène Three.js
 * Ce module encapsule toute la logique Three.js pour faciliter l'intégration
 */
export class SceneManager {
  private scene: any;
  private camera: any;
  private renderer: any;
  private controls: any;
  private container: HTMLElement;
  private config: VisualizationConfig;

  private nodeMeshes: Map<string, any> = new Map();
  private edgeLines: Map<string, any> = new Map();
  private nodeVelocities: Map<string, any> = new Map();

  private animationId: number | null = null;
  private isInitialized = false;

  // Callbacks
  private onNodeSelect?: (node: CodeNode | null) => void;
  private onNodeHover?: (node: CodeNode | null) => void;
  private onNodeContextMenu?: (event: MouseEvent, node: CodeNode) => void;

  constructor(
    container: HTMLElement,
    config: Partial<VisualizationConfig> = {}
  ) {
    this.container = container;
    this.config = { ...DEFAULT_VISUALIZATION_CONFIG, ...config };
  }

  /**
   * Initialiser la scène Three.js
   */
  async init(): Promise<void> {
    // Vérifier que Three.js est chargé
    if (typeof THREE === 'undefined') {
      throw new Error('Three.js not loaded');
    }

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.backgroundColor);
    this.scene.fog = new THREE.Fog(this.config.backgroundColor, 200, 800);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    this.camera.position.set(0, 100, 200);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Post-processing (bloom)
    if (this.config.enableBloom) {
      await this.setupBloom();
    }

    // Controls
    this.setupControls();

    // Lights
    this.setupLights();

    // Grid
    this.setupGrid();

    // Event listeners
    this.setupEventListeners();

    this.isInitialized = true;
  }

  private setupBloom(): void {
    // Bloom sera configuré si EffectComposer est disponible
    if (typeof THREE.EffectComposer !== 'undefined') {
      // Configuration du bloom
    }
  }

  private setupControls(): void {
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.minDistance = 10;
      this.controls.maxDistance = 1000;
    }
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x00ffff, 0.5, 500);
    pointLight.position.set(0, 50, 0);
    this.scene.add(pointLight);
  }

  private setupGrid(): void {
    const gridHelper = new THREE.GridHelper(400, 40, 0x004444, 0x002222);
    gridHelper.position.y = -50;
    this.scene.add(gridHelper);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('click', (e: MouseEvent) => this.onClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e: MouseEvent) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('contextmenu', (e: MouseEvent) => this.onContextMenu(e));
  }

  /**
   * Créer les noeuds 3D
   */
  createNodes(nodes: CodeNode[]): void {
    // Supprimer les noeuds existants
    this.nodeMeshes.forEach(mesh => this.scene.remove(mesh));
    this.nodeMeshes.clear();

    nodes.forEach((node, index) => {
      const mesh = this.createNodeMesh(node);
      const position = this.calculateNodePosition(node, index, nodes.length);

      mesh.position.copy(position);
      mesh.userData = {
        node,
        originalScale: mesh.scale.clone(),
        initialPosition: position.clone(),
        originalPosition: position.clone()
      };

      this.scene.add(mesh);
      this.nodeMeshes.set(node.id, mesh);
    });
  }

  private createNodeMesh(node: CodeNode): any {
    const size = this.getNodeSize(node);
    let geometry: any;

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

    const colors = getNodeColor(node.type);
    const material = new THREE.MeshStandardMaterial({
      color: colors.primary,
      emissive: colors.emissive,
      emissiveIntensity: 0.3,
      metalness: 0.3,
      roughness: 0.5,
      transparent: true,
      opacity: 0.9
    });

    return new THREE.Mesh(geometry, material);
  }

  private getNodeSize(node: CodeNode): number {
    const sizes: Record<string, number> = {
      system: 15, module: 10, file: 6, class: 5, struct: 5,
      interface: 4, function: 3, method: 3, variable: 2
    };
    return sizes[node.type] || 3;
  }

  private calculateNodePosition(node: CodeNode, index: number, total: number): any {
    const phi = Math.acos(-1 + (2 * index) / total);
    const theta = Math.sqrt(total * Math.PI) * phi;
    const radius = 50 + (parseInt(node.level.slice(1)) - 1) * 30;

    return new THREE.Vector3(
      radius * Math.cos(theta) * Math.sin(phi),
      radius * Math.cos(phi),
      radius * Math.sin(theta) * Math.sin(phi)
    );
  }

  /**
   * Créer les arêtes
   */
  createEdges(edges: CodeEdge[]): void {
    this.edgeLines.forEach(line => this.scene.remove(line));
    this.edgeLines.clear();

    edges.forEach(edge => {
      const sourceMesh = this.nodeMeshes.get(edge.source);
      const targetMesh = this.nodeMeshes.get(edge.target);

      if (!sourceMesh || !targetMesh) return;

      const points = [sourceMesh.position, targetMesh.position];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: this.getEdgeColor(edge.type),
        transparent: true,
        opacity: this.config.edgeOpacity
      });

      const line = new THREE.Line(geometry, material);
      line.userData = { edge };

      this.scene.add(line);
      this.edgeLines.set(edge.id, line);
    });
  }

  private getEdgeColor(type: string): string {
    const colors: Record<string, string> = {
      imports: '#00ffff', calls: '#00ccff', extends: '#ff6600', implements: '#ff00ff'
    };
    return colors[type] || '#444444';
  }

  /**
   * Démarrer l'animation
   */
  startAnimation(): void {
    if (this.animationId) return;
    this.animate();
  }

  /**
   * Arrêter l'animation
   */
  stopAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.controls) {
      this.controls.update();
    }

    this.updatePhysics();
    this.renderer.render(this.scene, this.camera);
  };

  private updatePhysics(): void {
    const springStiffness = 0.08;
    const springDamping = 0.85;
    const velocityThreshold = 0.01;

    this.nodeMeshes.forEach((mesh, id) => {
      const originalPos = mesh.userData.originalPosition;
      if (!originalPos) return;

      let velocity = this.nodeVelocities.get(id);
      if (!velocity) {
        velocity = new THREE.Vector3();
        this.nodeVelocities.set(id, velocity);
      }

      const displacement = new THREE.Vector3().subVectors(originalPos, mesh.position);
      const springForce = displacement.multiplyScalar(springStiffness);

      velocity.add(springForce);
      velocity.multiplyScalar(springDamping);

      if (velocity.length() > velocityThreshold) {
        mesh.position.add(velocity);
        this.updateConnectedEdges(id);
      }
    });
  }

  private updateConnectedEdges(nodeId: string): void {
    this.edgeLines.forEach((line) => {
      const edge = line.userData.edge;
      if (edge.source !== nodeId && edge.target !== nodeId) return;

      const sourceMesh = this.nodeMeshes.get(edge.source);
      const targetMesh = this.nodeMeshes.get(edge.target);

      if (sourceMesh && targetMesh) {
        const positions = line.geometry.attributes.position;
        positions.setXYZ(0, sourceMesh.position.x, sourceMesh.position.y, sourceMesh.position.z);
        positions.setXYZ(1, targetMesh.position.x, targetMesh.position.y, targetMesh.position.z);
        positions.needsUpdate = true;
      }
    });
  }

  /**
   * Focus sur un noeud
   */
  focusOnNode(nodeId: string): void {
    const mesh = this.nodeMeshes.get(nodeId);
    if (!mesh) return;

    const targetPos = mesh.position.clone();
    const cameraOffset = new THREE.Vector3(0, 30, 80);
    const newCameraPos = targetPos.clone().add(cameraOffset);

    // Animation simple
    this.animateCameraTo(newCameraPos, targetPos);
  }

  private animateCameraTo(position: any, target: any): void {
    // Animation linéaire simple
    const duration = 500;
    const start = Date.now();
    const startPos = this.camera.position.clone();
    const startTarget = this.controls?.target.clone() || new THREE.Vector3();

    const animate = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // Ease out cubic

      this.camera.position.lerpVectors(startPos, position, eased);
      if (this.controls) {
        this.controls.target.lerpVectors(startTarget, target, eased);
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  /**
   * Réinitialiser les positions
   */
  resetAllPositions(): void {
    this.nodeMeshes.forEach((mesh, id) => {
      const initialPos = mesh.userData.initialPosition;
      if (initialPos) {
        mesh.userData.originalPosition = initialPos.clone();
        const velocity = this.nodeVelocities.get(id) || new THREE.Vector3();
        const displacement = new THREE.Vector3().subVectors(initialPos, mesh.position);
        velocity.copy(displacement.multiplyScalar(0.1));
        this.nodeVelocities.set(id, velocity);
      }
    });
  }

  // Event handlers
  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private onClick(event: MouseEvent): void {
    const node = this.getNodeAtPosition(event.clientX, event.clientY);
    this.onNodeSelect?.(node);
  }

  private onMouseMove(event: MouseEvent): void {
    const node = this.getNodeAtPosition(event.clientX, event.clientY);
    this.onNodeHover?.(node);
  }

  private onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    const node = this.getNodeAtPosition(event.clientX, event.clientY);
    if (node) {
      this.onNodeContextMenu?.(event, node);
    }
  }

  private getNodeAtPosition(x: number, y: number): CodeNode | null {
    const rect = this.container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((x - rect.left) / rect.width) * 2 - 1,
      -((y - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const meshes = Array.from(this.nodeMeshes.values());
    const intersects = raycaster.intersectObjects(meshes);

    return intersects.length > 0 ? intersects[0].object.userData.node : null;
  }

  // Setters for callbacks
  setOnNodeSelect(callback: (node: CodeNode | null) => void): void {
    this.onNodeSelect = callback;
  }

  setOnNodeHover(callback: (node: CodeNode | null) => void): void {
    this.onNodeHover = callback;
  }

  setOnNodeContextMenu(callback: (event: MouseEvent, node: CodeNode) => void): void {
    this.onNodeContextMenu = callback;
  }

  /**
   * Nettoyer les ressources
   */
  dispose(): void {
    this.stopAnimation();

    this.nodeMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.nodeMeshes.clear();

    this.edgeLines.forEach(line => {
      line.geometry.dispose();
      line.material.dispose();
    });
    this.edgeLines.clear();

    if (this.renderer) {
      this.container.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}

// Déclaration globale de THREE pour TypeScript
declare const THREE: any;

export default SceneManager;
