// =============================================================================
// INITIALIZATION - Initialisation de la visualisation 3D
// =============================================================================

/**
 * Genere le script d'initialisation
 */
export function getInitialization(): string {
  return `
    // ===========================================================================
    // INITIALIZATION
    // ===========================================================================
    function init() {
      initThreeJS();
      initSearch();
      initIssuesPanel();
      initViewModes();
      initTabs();

      // Initial render
      setLevel('L1');

      // Start animation
      animate();

      // Hide loading
      setTimeout(() => {
        document.getElementById('loading-overlay').classList.add('hidden');
      }, 1500);
    }

    // Start when Three.js is loaded
    function startApp() {
      if (window.THREE && window.OrbitControls && window.EffectComposer) {
        init();
      } else {
        window.addEventListener('three-loaded', init, { once: true });
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startApp);
    } else {
      startApp();
    }
  `;
}
