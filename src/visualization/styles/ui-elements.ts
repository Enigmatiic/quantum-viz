// =============================================================================
// UI ELEMENTS STYLES - Tooltip, menu contextuel, recherche, etc.
// =============================================================================

export function getUIElementsStyles(): string {
  return `
    /* Tooltips */
    #tooltip {
      position: fixed;
      background: rgba(10,10,15,0.95);
      border: 1px solid rgba(0,255,255,0.3);
      border-radius: 8px;
      padding: 12px;
      max-width: 300px;
      font-size: 12px;
      z-index: 10000;
      pointer-events: none;
      display: none;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }

    #tooltip.visible {
      display: block;
    }

    .tooltip-title {
      font-weight: bold;
      color: #00ffff;
      margin-bottom: 8px;
    }

    .tooltip-info {
      color: #888;
      margin: 4px 0;
    }

    /* Context Menu */
    #context-menu {
      position: fixed;
      background: rgba(15,15,25,0.98);
      border: 1px solid rgba(0,255,255,0.3);
      border-radius: 8px;
      min-width: 200px;
      padding: 6px 0;
      z-index: 10001;
      display: none;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
    }

    #context-menu.visible {
      display: block;
    }

    .context-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      cursor: pointer;
      font-size: 13px;
      color: #ccc;
      transition: all 0.15s;
    }

    .context-menu-item:hover {
      background: rgba(0,255,255,0.15);
      color: #fff;
    }

    .context-menu-item .icon {
      width: 18px;
      text-align: center;
      font-size: 14px;
    }

    .context-menu-item.danger {
      color: #ff6666;
    }

    .context-menu-item.danger:hover {
      background: rgba(255,100,100,0.15);
    }

    .context-menu-divider {
      height: 1px;
      background: rgba(255,255,255,0.1);
      margin: 6px 0;
    }

    .context-menu-header {
      padding: 8px 16px;
      font-size: 11px;
      color: #00ffff;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 6px;
    }

    /* Search */
    #search-container {
      position: relative;
      margin-bottom: 15px;
    }

    #search-input {
      width: 100%;
      padding: 10px 15px;
      padding-left: 35px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(0,255,255,0.2);
      border-radius: 20px;
      color: #e0e0e0;
      font-size: 13px;
      outline: none;
      transition: all 0.3s;
    }

    #search-input:focus {
      border-color: #00ffff;
      box-shadow: 0 0 15px rgba(0,255,255,0.2);
    }

    #search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #666;
    }

    #search-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: rgba(15,15,25,0.98);
      border: 1px solid rgba(0,255,255,0.2);
      border-radius: 8px;
      max-height: 300px;
      overflow-y: auto;
      display: none;
      z-index: 1000;
    }

    #search-results.active {
      display: block;
    }

    .search-result {
      padding: 10px 15px;
      cursor: pointer;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      transition: background 0.2s;
    }

    .search-result:hover {
      background: rgba(0,255,255,0.1);
    }

    .search-result-type {
      font-size: 10px;
      color: #00ffff;
      text-transform: uppercase;
    }

    .search-result-name {
      font-size: 13px;
      margin-top: 2px;
    }

    .search-result-path {
      font-size: 10px;
      color: #666;
      margin-top: 2px;
    }

    /* Loading Overlay */
    #loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      transition: opacity 0.5s;
    }

    #loading-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .loading-spinner {
      width: 60px;
      height: 60px;
      border: 3px solid rgba(0,255,255,0.1);
      border-top-color: #00ffff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .loading-text {
      margin-top: 20px;
      font-size: 14px;
      color: #00ffff;
    }

    /* Controls Help */
    #controls-help {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 20px;
      background: rgba(15,15,25,0.9);
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 11px;
      color: #666;
      z-index: 100;
    }

    .control-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .control-key {
      background: rgba(255,255,255,0.1);
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
    }

    /* Minimap */
    #minimap {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 200px;
      height: 150px;
      background: rgba(15,15,25,0.9);
      border: 1px solid rgba(0,255,255,0.2);
      border-radius: 8px;
      z-index: 100;
    }

    #minimap-toggle {
      position: fixed;
      bottom: 180px;
      right: 20px;
      background: rgba(15,15,25,0.9);
      border: 1px solid rgba(0,255,255,0.2);
      color: #888;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 11px;
      z-index: 100;
      transition: all 0.2s;
    }

    #minimap-toggle:hover {
      color: #00ffff;
      border-color: #00ffff;
    }

    /* Show all button */
    .show-all-btn {
      position: fixed;
      top: 80px;
      right: 390px;
      background: rgba(255,136,0,0.2);
      border: 1px solid rgba(255,136,0,0.5);
      color: #ff8800;
      padding: 8px 16px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 12px;
      z-index: 100;
      display: none;
      transition: all 0.2s;
    }

    .show-all-btn:hover {
      background: rgba(255,136,0,0.3);
      box-shadow: 0 0 15px rgba(255,136,0,0.3);
    }

    .show-all-btn.visible {
      display: block;
    }

    /* Keyboard shortcuts modal */
    #shortcuts-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(15,15,25,0.98);
      border: 1px solid rgba(0,255,255,0.3);
      border-radius: 12px;
      padding: 24px;
      z-index: 10003;
      display: none;
      min-width: 400px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }

    #shortcuts-modal.visible {
      display: block;
    }

    #shortcuts-modal h3 {
      color: #00ffff;
      margin-bottom: 20px;
      font-size: 16px;
    }

    .shortcut-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .shortcut-key {
      background: rgba(255,255,255,0.1);
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      color: #00ffff;
    }

    .shortcut-desc {
      color: #888;
      font-size: 13px;
    }
  `;
}
