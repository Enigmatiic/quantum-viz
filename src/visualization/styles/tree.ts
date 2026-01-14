// =============================================================================
// TREE STYLES - Navigation arborescente
// =============================================================================

export function getTreeStyles(): string {
  return `
    /* Breadcrumb */
    #breadcrumb {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .breadcrumb-item {
      padding: 4px 10px;
      background: rgba(0,255,255,0.1);
      border-radius: 12px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .breadcrumb-item:hover {
      background: rgba(0,255,255,0.3);
    }

    .breadcrumb-separator {
      color: #444;
    }

    /* Tree View - Hierarchical Navigation */
    .node-tree {
      font-size: 12px;
      user-select: none;
    }

    .tree-item {
      /* Container for each tree node */
    }

    .tree-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      margin: 1px 0;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      border-left: 2px solid transparent;
    }

    .tree-row:hover {
      background: rgba(0,255,255,0.08);
    }

    .tree-row.selected {
      background: rgba(0,255,255,0.15);
      border-left-color: #00ffff;
    }

    .tree-toggle {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: #666;
      flex-shrink: 0;
      border-radius: 3px;
      transition: all 0.15s;
    }

    .tree-toggle:hover {
      background: rgba(0,255,255,0.2);
      color: #00ffff;
    }

    .tree-toggle.collapsed {
      color: #888;
    }

    .tree-toggle.expanded {
      color: #00ffff;
    }

    .tree-toggle.leaf {
      color: #444;
      font-size: 6px;
    }

    .tree-icon {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      flex-shrink: 0;
    }

    .tree-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #ccc;
    }

    .tree-row:hover .tree-label {
      color: #fff;
    }

    .tree-row.selected .tree-label {
      color: #00ffff;
    }

    .tree-badge {
      background: rgba(255,255,255,0.1);
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 9px;
      color: #888;
      flex-shrink: 0;
    }

    .tree-children {
      border-left: 1px solid rgba(255,255,255,0.08);
      margin-left: 11px;
    }

    /* Folder/File specific styles */
    .tree-row[data-type="module"] .tree-label,
    .tree-row[data-type="system"] .tree-label {
      font-weight: 500;
    }

    /* Locked node indicator */
    .tree-row.locked::after {
      content: '📌';
      margin-left: auto;
      font-size: 10px;
    }
  `;
}
