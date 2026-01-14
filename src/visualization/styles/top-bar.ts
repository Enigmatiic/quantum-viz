// =============================================================================
// TOP BAR STYLES - Barre superieure et controles
// =============================================================================

export function getTopBarStyles(): string {
  return `
    /* Top Bar */
    #top-bar {
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 25px;
      background: linear-gradient(to bottom, rgba(10,10,15,0.95), rgba(10,10,15,0));
    }

    .project-info {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .project-name {
      font-size: 24px;
      font-weight: bold;
      background: linear-gradient(135deg, #00ffff, #00ff88);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 30px rgba(0,255,255,0.3);
    }

    .stats-mini {
      display: flex;
      gap: 20px;
      font-size: 12px;
      color: #888;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .stat-value {
      color: #00ffff;
      font-weight: bold;
    }

    /* Level Selector */
    #level-selector {
      display: flex;
      gap: 5px;
      background: rgba(20,20,30,0.8);
      padding: 8px 12px;
      border-radius: 25px;
      border: 1px solid rgba(0,255,255,0.2);
    }

    .level-btn {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      color: #888;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      transition: all 0.3s ease;
    }

    .level-btn:hover {
      background: rgba(0,255,255,0.2);
      color: #00ffff;
      transform: scale(1.1);
    }

    .level-btn.active {
      background: linear-gradient(135deg, #00ffff, #00ff88);
      color: #000;
      box-shadow: 0 0 20px rgba(0,255,255,0.5);
    }

    /* View Mode Toggle */
    #view-modes {
      display: flex;
      gap: 10px;
    }

    .view-btn {
      padding: 8px 16px;
      border: 1px solid rgba(0,255,255,0.3);
      border-radius: 20px;
      background: rgba(20,20,30,0.8);
      color: #888;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.3s ease;
    }

    .view-btn:hover, .view-btn.active {
      border-color: #00ffff;
      color: #00ffff;
      box-shadow: 0 0 15px rgba(0,255,255,0.3);
    }

    .view-btn.reset-btn {
      border-color: rgba(255,136,0,0.5);
      color: #ff8800;
    }

    .view-btn.reset-btn:hover {
      border-color: #ff8800;
      background: rgba(255,136,0,0.2);
      box-shadow: 0 0 15px rgba(255,136,0,0.3);
    }

    .view-btn.filter-btn {
      border-color: rgba(255,0,64,0.5);
      color: #ff4488;
    }

    .view-btn.filter-btn:hover {
      border-color: #ff4488;
      background: rgba(255,0,64,0.2);
      box-shadow: 0 0 15px rgba(255,0,64,0.3);
    }

    .view-btn.filter-btn.active {
      border-color: #ff0040;
      color: #ff0040;
      background: rgba(255,0,64,0.3);
      box-shadow: 0 0 20px rgba(255,0,64,0.5);
    }
  `;
}
