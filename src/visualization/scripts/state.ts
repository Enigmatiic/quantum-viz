// =============================================================================
// APPLICATION STATE - Etat global de la visualisation 3D
// =============================================================================

/**
 * Genere le script d'initialisation de l'etat
 */
export function getStateInitialization(): string {
  return `
    // ===========================================================================
    // STATE
    // ===========================================================================
    let currentLevel = 'L1';
    let selectedNode = null;
    let focusNode = null;
    let viewMode = 'architecture';
    let deadCodeFilterActive = false;
    let nodeMeshes = new Map();
    let edgeLines = new Map();
    let particles = [];
    let animatedEdges = [];

    // Dead code node IDs (computed from issues)
    const deadCodeNodeIds = new Set(
      issuesData
        .filter(i => i.type === 'dead_code' || i.type === 'unused_function' || i.type === 'unused_variable' || i.type === 'unused_import')
        .flatMap(i => i.relatedNodes || [])
    );

    // Drag state (initialized after THREE.js loads)
    let isDragging = false;
    let wasDragging = false;  // To prevent click after drag
    let draggedMesh = null;
    let dragPlane = null;
    let dragOffset = null;

    // Physics simulation for spring effect
    const nodeVelocities = new Map();
    const nodeTargetPositions = new Map();
    const SPRING_STIFFNESS = 0.08;
    const SPRING_DAMPING = 0.85;
    const VELOCITY_THRESHOLD = 0.01;

    // Context menu state
    let contextMenuNode = null;
    const hiddenNodes = new Set();
    const lockedNodes = new Set();

    // Track expanded state for tree
    const expandedNodes = new Set();

    // Animation time
    let animationTime = 0;

    // Three.js globals
    let scene, camera, renderer, controls, composer;
    let raycaster, mouse;
  `;
}
