// =============================================================================
// THREE.JS SETUP - Configuration de la scene Three.js
// =============================================================================

/**
 * Genere le script de configuration Three.js
 */
export function getThreeJsSetup(): string {
  return `
    // ===========================================================================
    // THREE.JS SETUP
    // ===========================================================================
    function initThreeJS() {
      const container = document.getElementById('canvas-container');

      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0f);
      scene.fog = new THREE.FogExp2(0x0a0a0f, 0.0015);

      // Camera
      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
      camera.position.set(0, 200, 500);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ReinhardToneMapping;
      renderer.toneMappingExposure = 1.5;
      container.appendChild(renderer.domElement);

      // Controls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.rotateSpeed = 0.5;
      controls.zoomSpeed = 1.2;
      controls.minDistance = 50;
      controls.maxDistance = 2000;

      // Raycaster for picking
      raycaster = new THREE.Raycaster();
      mouse = new THREE.Vector2();

      // Post-processing (Bloom)
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.4,  // strength (reduced for cleaner look)
        0.5,  // radius
        0.8   // threshold (higher = less bloom on dark objects)
      );
      composer.addPass(bloomPass);

      // Ambient light
      const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
      scene.add(ambientLight);

      // Point lights
      const pointLight1 = new THREE.PointLight(0x00ffff, 1, 1000);
      pointLight1.position.set(200, 300, 200);
      scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(0xff6600, 0.5, 1000);
      pointLight2.position.set(-200, -100, -200);
      scene.add(pointLight2);

      // Grid helper (subtle)
      const gridHelper = new THREE.GridHelper(2000, 100, 0x111122, 0x111122);
      gridHelper.position.y = -100;
      scene.add(gridHelper);

      // Handle resize
      window.addEventListener('resize', onWindowResize);

      // Mouse events
      renderer.domElement.addEventListener('mousemove', onMouseMove);
      renderer.domElement.addEventListener('click', onMouseClick);
      renderer.domElement.addEventListener('dblclick', onMouseDoubleClick);

      // Drag events
      renderer.domElement.addEventListener('mousedown', onMouseDown);
      renderer.domElement.addEventListener('mouseup', onMouseUp);
      renderer.domElement.addEventListener('mouseleave', onMouseUp);

      // Context menu (right click)
      renderer.domElement.addEventListener('contextmenu', onContextMenu);
      document.addEventListener('click', hideContextMenu);

      // Create drag plane and offset vector (for node dragging)
      dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      dragOffset = new THREE.Vector3();

      // Keyboard events
      document.addEventListener('keydown', onKeyDown);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    }
  `;
}
