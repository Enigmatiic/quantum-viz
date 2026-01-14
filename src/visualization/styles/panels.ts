// =============================================================================
// PANEL STYLES - Panneaux lateraux et leur contenu
// =============================================================================

export function getPanelStyles(): string {
  return `
    /* Left Panel - Navigation */
    #left-panel {
      top: 80px;
      left: 20px;
      bottom: 20px;
      width: 300px;
    }

    .panel {
      background: rgba(15,15,25,0.9);
      border: 1px solid rgba(0,255,255,0.15);
      border-radius: 12px;
      backdrop-filter: blur(10px);
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border-bottom: 1px solid rgba(0,255,255,0.1);
      background: rgba(0,255,255,0.05);
    }

    .panel-title {
      font-size: 14px;
      font-weight: bold;
      color: #00ffff;
    }

    .panel-content {
      padding: 15px;
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }

    .panel-content::-webkit-scrollbar {
      width: 6px;
    }

    .panel-content::-webkit-scrollbar-track {
      background: rgba(0,0,0,0.3);
    }

    .panel-content::-webkit-scrollbar-thumb {
      background: rgba(0,255,255,0.3);
      border-radius: 3px;
    }

    /* Collapsible panels */
    .panel-header .collapse-btn {
      background: none;
      border: none;
      color: #888;
      cursor: pointer;
      font-size: 14px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .panel-header .collapse-btn:hover {
      background: rgba(0,255,255,0.1);
      color: #00ffff;
    }

    .panel.collapsed .panel-content {
      display: none;
    }

    .panel.collapsed .collapse-btn {
      transform: rotate(-90deg);
    }

    /* Right Panel - Details */
    #right-panel {
      top: 80px;
      right: 20px;
      bottom: 20px;
      width: 350px;
    }

    .detail-section {
      margin-bottom: 20px;
    }

    .detail-label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }

    .detail-value {
      font-size: 13px;
      color: #e0e0e0;
    }

    .detail-code {
      background: rgba(0,0,0,0.3);
      padding: 10px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      overflow-x: auto;
      white-space: pre;
    }

    /* Metrics Display */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .metric-card {
      background: rgba(0,0,0,0.2);
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }

    .metric-value {
      font-size: 24px;
      font-weight: bold;
      background: linear-gradient(135deg, #00ffff, #00ff88);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .metric-label {
      font-size: 10px;
      color: #666;
      margin-top: 5px;
    }

    /* Bottom Panel - Issues */
    #bottom-panel {
      bottom: 20px;
      left: 340px;
      right: 390px;
      transition: all 0.3s ease;
    }

    #bottom-panel.collapsed {
      bottom: -200px;
    }

    #bottom-panel .panel {
      position: relative;
    }

    #bottom-panel .expand-tab {
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15,15,25,0.95);
      border: 1px solid rgba(0,255,255,0.2);
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      padding: 6px 20px;
      cursor: pointer;
      color: #888;
      font-size: 12px;
      transition: all 0.2s;
      display: none;
    }

    #bottom-panel.collapsed .expand-tab {
      display: block;
    }

    #bottom-panel .expand-tab:hover {
      color: #00ffff;
      background: rgba(0,255,255,0.1);
    }

    /* Tab switching */
    .tab-container {
      display: flex;
      border-bottom: 1px solid rgba(0,255,255,0.1);
    }

    .tab-btn {
      flex: 1;
      padding: 10px;
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      color: #00ffff;
      background: rgba(0,255,255,0.05);
    }

    .tab-btn.active {
      color: #00ffff;
      border-bottom: 2px solid #00ffff;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }
  `;
}
