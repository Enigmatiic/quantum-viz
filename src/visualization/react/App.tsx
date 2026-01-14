// =============================================================================
// APP - Composant principal de l'application React
// =============================================================================

import React, { useState, useCallback, useRef, useMemo } from 'react';
import type {
  CodeNode,
  CodeEdge,
  CodeIssue,
  GranularityLevel,
  ProjectStats,
  AnalysisResult
} from '../../types';

import {
  TopBar,
  TreeView,
  FilterPanel,
  ContextMenu,
  BottomPanel,
  NodeDetails,
  ShortcutsModal
} from './components';

import { useThreeScene } from './hooks';

interface AppProps {
  analysis: AnalysisResult;
  securityReport?: {
    vulnerabilities: any[];
    summary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

interface FilterState {
  showDeadCode: boolean;
  showUnused: boolean;
  showCircularDeps: boolean;
  showHighComplexity: boolean;
  nodeTypes: Set<string>;
  layers: Set<string>;
  searchQuery: string;
}

export const App: React.FC<AppProps> = ({ analysis, securityReport }) => {
  // Refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // State
  const [currentLevel, setCurrentLevel] = useState<GranularityLevel>('L3');
  const [selectedNode, setSelectedNode] = useState<CodeNode | null>(null);
  const [activeView, setActiveView] = useState<'default' | 'clusters' | 'layers'>('default');
  const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set());
  const [lockedNodes, setLockedNodes] = useState<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isVisible: boolean;
    x: number;
    y: number;
    node: CodeNode | null;
  }>({ isVisible: false, x: 0, y: 0, node: null });

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    showDeadCode: false,
    showUnused: false,
    showCircularDeps: false,
    showHighComplexity: false,
    nodeTypes: new Set(),
    layers: new Set(),
    searchQuery: ''
  });

  // Filtered nodes based on level and filters
  const filteredNodes = useMemo(() => {
    let nodes = analysis.nodes;

    // Filter by level
    const levelIndex = parseInt(currentLevel.slice(1));
    nodes = nodes.filter(n => {
      const nodeLevel = parseInt(n.level.slice(1));
      return nodeLevel >= levelIndex - 1 && nodeLevel <= levelIndex + 2;
    });

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      nodes = nodes.filter(n =>
        n.name.toLowerCase().includes(query) ||
        n.fullPath.toLowerCase().includes(query)
      );
    }

    // Filter by node types
    if (filters.nodeTypes.size > 0) {
      nodes = nodes.filter(n => filters.nodeTypes.has(n.type));
    }

    // Filter by layers
    if (filters.layers.size > 0) {
      nodes = nodes.filter(n => n.layer && filters.layers.has(n.layer));
    }

    // Filter for dead code
    if (filters.showDeadCode) {
      const deadCodeIds = new Set(
        analysis.issues
          .filter(i => i.type === 'dead_code' || i.type === 'unused_function')
          .flatMap(i => i.relatedNodes || [])
      );
      nodes = nodes.filter(n => deadCodeIds.has(n.id));
    }

    return nodes;
  }, [analysis.nodes, analysis.issues, currentLevel, filters]);

  // Issue counts
  const issueCounts = useMemo(() => {
    const deadCode = analysis.issues.filter(i => i.type === 'dead_code').length;
    const unused = analysis.issues.filter(i =>
      i.type === 'unused_import' || i.type === 'unused_variable' || i.type === 'unused_function'
    ).length;
    const circular = analysis.issues.filter(i => i.type === 'circular_dependency').length;
    const highComplexity = analysis.issues.filter(i => i.type === 'high_complexity').length;

    return { deadCode, unused, circular, highComplexity };
  }, [analysis.issues]);

  // Three.js scene
  const {
    isReady,
    resetAllPositions,
    focusOnNode
  } = useThreeScene(canvasContainerRef, {
    nodes: filteredNodes,
    edges: analysis.edges,
    hiddenNodes,
    lockedNodes,
    onNodeSelect: setSelectedNode,
    onNodeContextMenu: (event, node) => {
      setContextMenu({
        isVisible: true,
        x: event.clientX,
        y: event.clientY,
        node
      });
    }
  });

  // Handlers
  const handleLevelChange = useCallback((level: GranularityLevel) => {
    setCurrentLevel(level);
  }, []);

  const handleViewToggle = useCallback((view: 'default' | 'clusters' | 'layers') => {
    setActiveView(view);
  }, []);

  const handleNodeSelect = useCallback((node: CodeNode) => {
    setSelectedNode(node);
    focusOnNode(node.id);
  }, [focusOnNode]);

  const handleContextMenuAction = useCallback((action: string, node: CodeNode) => {
    switch (action) {
      case 'center':
      case 'focus':
        focusOnNode(node.id);
        break;
      case 'hide':
        setHiddenNodes(prev => new Set([...prev, node.id]));
        break;
      case 'lock':
        setLockedNodes(prev => {
          const next = new Set(prev);
          if (next.has(node.id)) {
            next.delete(node.id);
          } else {
            next.add(node.id);
          }
          return next;
        });
        break;
      case 'reset':
        resetAllPositions();
        break;
      case 'copy':
        navigator.clipboard.writeText(node.fullPath);
        break;
      case 'details':
        setSelectedNode(node);
        break;
    }
    setContextMenu({ isVisible: false, x: 0, y: 0, node: null });
  }, [focusOnNode, resetAllPositions]);

  const handleTreeContextMenu = useCallback((event: React.MouseEvent, node: CodeNode) => {
    event.preventDefault();
    setContextMenu({
      isVisible: true,
      x: event.clientX,
      y: event.clientY,
      node
    });
  }, []);

  const handleIssueClick = useCallback((issue: CodeIssue) => {
    // Find and select the related node
    if (issue.relatedNodes && issue.relatedNodes.length > 0) {
      const node = analysis.nodes.find(n => n.id === issue.relatedNodes![0]);
      if (node) {
        handleNodeSelect(node);
      }
    }
  }, [analysis.nodes, handleNodeSelect]);

  const handleShowAllNodes = useCallback(() => {
    setHiddenNodes(new Set());
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case '?':
          setShowShortcuts(prev => !prev);
          break;
        case 'Escape':
          setContextMenu({ isVisible: false, x: 0, y: 0, node: null });
          setShowShortcuts(false);
          break;
        case 'a':
        case 'A':
          handleShowAllNodes();
          break;
        case 'r':
        case 'R':
          resetAllPositions();
          break;
        case 'f':
        case 'F':
          if (selectedNode) focusOnNode(selectedNode.id);
          break;
        case 'h':
        case 'H':
          if (selectedNode) {
            setHiddenNodes(prev => new Set([...prev, selectedNode.id]));
          }
          break;
        case 'l':
        case 'L':
          if (selectedNode) {
            setLockedNodes(prev => {
              const next = new Set(prev);
              if (next.has(selectedNode.id)) {
                next.delete(selectedNode.id);
              } else {
                next.add(selectedNode.id);
              }
              return next;
            });
          }
          break;
      }

      // Level shortcuts
      if (e.key >= '1' && e.key <= '7') {
        setCurrentLevel(`L${e.key}` as GranularityLevel);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, focusOnNode, resetAllPositions, handleShowAllNodes]);

  return (
    <div className="quantum-viz-app">
      {/* Canvas 3D */}
      <div ref={canvasContainerRef} id="canvas-container" />

      {/* Top Bar */}
      <TopBar
        projectName={analysis.meta.projectName}
        stats={analysis.stats}
        currentLevel={currentLevel}
        onLevelChange={handleLevelChange}
        onResetPositions={resetAllPositions}
        onToggleView={handleViewToggle}
        activeView={activeView}
      />

      {/* Left Panel - Navigation */}
      <div id="left-panel" className="hud">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Navigation</span>
          </div>
          <div className="panel-content">
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              deadCodeCount={issueCounts.deadCode}
              unusedCount={issueCounts.unused}
              circularDepsCount={issueCounts.circular}
              highComplexityCount={issueCounts.highComplexity}
            />
            <TreeView
              nodes={filteredNodes}
              selectedNodeId={selectedNode?.id || null}
              lockedNodes={lockedNodes}
              hiddenNodes={hiddenNodes}
              onNodeSelect={handleNodeSelect}
              onNodeContextMenu={handleTreeContextMenu}
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Details */}
      <div id="right-panel" className="hud">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Détails</span>
          </div>
          <div className="panel-content">
            <NodeDetails
              node={selectedNode}
              edges={analysis.edges}
              onNavigateToNode={(nodeId) => {
                const node = analysis.nodes.find(n => n.id === nodeId);
                if (node) handleNodeSelect(node);
              }}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        </div>
      </div>

      {/* Bottom Panel - Issues */}
      <BottomPanel
        issues={analysis.issues}
        vulnerabilities={securityReport?.vulnerabilities}
        securitySummary={securityReport?.summary}
        onIssueClick={handleIssueClick}
      />

      {/* Show All Button */}
      {hiddenNodes.size > 0 && (
        <button className="show-all-btn visible" onClick={handleShowAllNodes}>
          Afficher tous ({hiddenNodes.size} masqués)
        </button>
      )}

      {/* Context Menu */}
      <ContextMenu
        isVisible={contextMenu.isVisible}
        x={contextMenu.x}
        y={contextMenu.y}
        node={contextMenu.node}
        isNodeLocked={contextMenu.node ? lockedNodes.has(contextMenu.node.id) : false}
        onAction={handleContextMenuAction}
        onClose={() => setContextMenu({ isVisible: false, x: 0, y: 0, node: null })}
      />

      {/* Shortcuts Modal */}
      <ShortcutsModal
        isVisible={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
};

export default App;
