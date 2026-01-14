// =============================================================================
// ISSUES STYLES - Panneau des problemes et vulnerabilites
// =============================================================================

export function getIssuesStyles(): string {
  return `
    .issues-container {
      max-height: 250px;
      overflow-y: auto;
    }

    .issue-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      margin-bottom: 8px;
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border-left: 3px solid transparent;
    }

    .issue-item:hover {
      background: rgba(0,0,0,0.4);
    }

    .issue-item.critical { border-left-color: #ff0040; }
    .issue-item.high { border-left-color: #ff6600; }
    .issue-item.medium { border-left-color: #ffcc00; }
    .issue-item.low { border-left-color: #00ccff; }
    .issue-item.info { border-left-color: #888; }

    .issue-severity {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 5px;
    }

    .issue-severity.critical { background: #ff0040; box-shadow: 0 0 10px #ff0040; }
    .issue-severity.high { background: #ff6600; box-shadow: 0 0 10px #ff6600; }
    .issue-severity.medium { background: #ffcc00; }
    .issue-severity.low { background: #00ccff; }
    .issue-severity.info { background: #888; }

    .issue-content {
      flex: 1;
    }

    .issue-title {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .issue-location {
      font-size: 11px;
      color: #666;
    }

    /* Security Summary */
    .security-summary {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .severity-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: bold;
    }

    .severity-badge.critical { background: rgba(255,0,64,0.2); color: #ff0040; }
    .severity-badge.high { background: rgba(255,102,0,0.2); color: #ff6600; }
    .severity-badge.medium { background: rgba(255,204,0,0.2); color: #ffcc00; }
    .severity-badge.low { background: rgba(0,204,255,0.2); color: #00ccff; }
  `;
}
