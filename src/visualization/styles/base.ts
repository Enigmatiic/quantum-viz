// =============================================================================
// BASE STYLES - Styles de base et variables CSS
// =============================================================================

export interface StyleConfig {
  backgroundColor: string;
  highlightColor: string;
}

export function getBaseStyles(config: StyleConfig): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      background: ${config.backgroundColor};
      color: #e0e0e0;
      overflow: hidden;
      height: 100vh;
    }

    #canvas-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
    }

    /* HUD Overlay */
    .hud {
      position: fixed;
      z-index: 100;
      pointer-events: none;
    }

    .hud > * {
      pointer-events: auto;
    }

    /* Scrollbar styles */
    ::-webkit-scrollbar {
      width: 6px;
    }

    ::-webkit-scrollbar-track {
      background: rgba(0,0,0,0.3);
    }

    ::-webkit-scrollbar-thumb {
      background: rgba(0,255,255,0.3);
      border-radius: 3px;
    }

    /* Animations */
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes glow {
      0%, 100% { box-shadow: 0 0 5px currentColor; }
      50% { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
    }

    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
      15% { opacity: 1; transform: translateX(-50%) translateY(0); }
      85% { opacity: 1; transform: translateX(-50%) translateY(0); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    }
  `;
}
