// =============================================================================
// TREE VIEW - Navigation hiérarchique des noeuds
// =============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import type { CodeNode, NodeType } from '../../../types';

interface TreeViewProps {
  nodes: CodeNode[];
  selectedNodeId: string | null;
  lockedNodes: Set<string>;
  hiddenNodes: Set<string>;
  onNodeSelect: (node: CodeNode) => void;
  onNodeContextMenu: (event: React.MouseEvent, node: CodeNode) => void;
}

// Icônes par type de noeud
const NODE_ICONS: Record<NodeType, string> = {
  system: '⚡',
  module: '📦',
  file: '📄',
  class: '🔷',
  struct: '🔶',
  interface: '🔻',
  trait: '🔸',
  enum: '🔹',
  function: 'ƒ',
  method: 'ƒ',
  constructor: '🔨',
  closure: '→',
  handler: '⚡',
  block: '▢',
  conditional: '⬦',
  loop: '↻',
  try_catch: '⚠',
  match_arm: '↝',
  variable: '𝑥',
  constant: '𝐶',
  parameter: '𝑝',
  attribute: '◆',
  property: '◇',
  type_alias: '𝑇'
};

// Couleurs par type de noeud
const NODE_COLORS: Record<NodeType, string> = {
  system: '#ffffff',
  module: '#00ffff',
  file: '#00ff88',
  class: '#ff6600',
  struct: '#ffaa00',
  interface: '#ff00ff',
  trait: '#aa00ff',
  enum: '#ffff00',
  function: '#00ccff',
  method: '#0099ff',
  constructor: '#ff4444',
  closure: '#88ccff',
  handler: '#ffcc00',
  block: '#666666',
  conditional: '#ff8844',
  loop: '#44ff88',
  try_catch: '#ff4488',
  match_arm: '#88ff44',
  variable: '#88ff88',
  constant: '#ff88ff',
  parameter: '#aaaaff',
  attribute: '#ffaa88',
  property: '#88ffaa',
  type_alias: '#ccaaff'
};

interface TreeItemProps {
  node: CodeNode;
  nodes: CodeNode[];
  depth: number;
  expandedNodes: Set<string>;
  selectedNodeId: string | null;
  lockedNodes: Set<string>;
  hiddenNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  onSelect: (node: CodeNode) => void;
  onContextMenu: (event: React.MouseEvent, node: CodeNode) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({
  node,
  nodes,
  depth,
  expandedNodes,
  selectedNodeId,
  lockedNodes,
  hiddenNodes,
  onToggle,
  onSelect,
  onContextMenu
}) => {
  const children = useMemo(() =>
    nodes.filter(n => n.parent === node.id),
    [nodes, node.id]
  );

  const hasChildren = children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const isLocked = lockedNodes.has(node.id);
  const isHidden = hiddenNodes.has(node.id);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(node.id);
    }
  };

  const handleSelect = () => {
    onSelect(node);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, node);
  };

  return (
    <div className="tree-item">
      <div
        className={`tree-row ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''} ${isHidden ? 'hidden' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleSelect}
        onContextMenu={handleContextMenu}
        data-type={node.type}
      >
        {/* Toggle */}
        <span
          className={`tree-toggle ${hasChildren ? (isExpanded ? 'expanded' : 'collapsed') : 'leaf'}`}
          onClick={handleToggle}
        >
          {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
        </span>

        {/* Icon */}
        <span
          className="tree-icon"
          style={{ backgroundColor: `${NODE_COLORS[node.type]}22`, color: NODE_COLORS[node.type] }}
        >
          {NODE_ICONS[node.type] || '•'}
        </span>

        {/* Label */}
        <span className="tree-label">{node.name}</span>

        {/* Badge */}
        {hasChildren && (
          <span className="tree-badge">{children.length}</span>
        )}

        {/* Lock indicator */}
        {isLocked && <span className="lock-indicator">📌</span>}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="tree-children">
          {children.map(child => (
            <TreeItem
              key={child.id}
              node={child}
              nodes={nodes}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              selectedNodeId={selectedNodeId}
              lockedNodes={lockedNodes}
              hiddenNodes={hiddenNodes}
              onToggle={onToggle}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TreeView: React.FC<TreeViewProps> = ({
  nodes,
  selectedNodeId,
  lockedNodes,
  hiddenNodes,
  onNodeSelect,
  onNodeContextMenu
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const rootNodes = useMemo(() =>
    nodes.filter(n => !n.parent),
    [nodes]
  );

  const handleToggle = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  return (
    <div className="tree-view">
      {rootNodes.map(node => (
        <TreeItem
          key={node.id}
          node={node}
          nodes={nodes}
          depth={0}
          expandedNodes={expandedNodes}
          selectedNodeId={selectedNodeId}
          lockedNodes={lockedNodes}
          hiddenNodes={hiddenNodes}
          onToggle={handleToggle}
          onSelect={onNodeSelect}
          onContextMenu={onNodeContextMenu}
        />
      ))}
    </div>
  );
};

export default TreeView;
