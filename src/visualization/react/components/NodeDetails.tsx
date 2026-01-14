// =============================================================================
// NODE DETAILS - Panneau de détails d'un noeud sélectionné
// =============================================================================

import React, { useState } from 'react';
import type { CodeNode, CodeEdge, FunctionInfo, ClassInfo } from '../../../types';

interface NodeDetailsProps {
  node: CodeNode | null;
  edges: CodeEdge[];
  onNavigateToNode: (nodeId: string) => void;
  onClose: () => void;
}

type DetailsTab = 'info' | 'code' | 'relations' | 'metrics';

export const NodeDetails: React.FC<NodeDetailsProps> = ({
  node,
  edges,
  onNavigateToNode,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<DetailsTab>('info');

  if (!node) {
    return (
      <div className="node-details empty">
        <div className="empty-message">
          Sélectionnez un noeud pour voir ses détails
        </div>
      </div>
    );
  }

  // Relations du noeud
  const incomingEdges = edges.filter(e => e.target === node.id);
  const outgoingEdges = edges.filter(e => e.source === node.id);

  return (
    <div className="node-details">
      {/* Header */}
      <div className="details-header">
        <div className="details-title">
          <span className="node-type-badge">{node.type}</span>
          <span className="node-name">{node.name}</span>
        </div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      {/* Tabs */}
      <div className="details-tabs">
        <button
          className={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Info
        </button>
        <button
          className={`tab ${activeTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          Code
        </button>
        <button
          className={`tab ${activeTab === 'relations' ? 'active' : ''}`}
          onClick={() => setActiveTab('relations')}
        >
          Relations
        </button>
        <button
          className={`tab ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          Métriques
        </button>
      </div>

      {/* Tab Content */}
      <div className="details-content">
        {activeTab === 'info' && (
          <div className="tab-info">
            <div className="detail-section">
              <div className="detail-label">Chemin complet</div>
              <div className="detail-value path">{node.fullPath}</div>
            </div>

            <div className="detail-section">
              <div className="detail-label">Fichier</div>
              <div className="detail-value">
                {node.location.file}:{node.location.line}
                {node.location.endLine && `-${node.location.endLine}`}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-label">Niveau</div>
              <div className="detail-value">{node.level}</div>
            </div>

            <div className="detail-section">
              <div className="detail-label">Visibilité</div>
              <div className={`detail-value visibility-${node.visibility}`}>
                {node.visibility}
              </div>
            </div>

            {node.modifiers.length > 0 && (
              <div className="detail-section">
                <div className="detail-label">Modificateurs</div>
                <div className="detail-value modifiers">
                  {node.modifiers.map(mod => (
                    <span key={mod} className="modifier-tag">{mod}</span>
                  ))}
                </div>
              </div>
            )}

            {node.documentation && (
              <div className="detail-section">
                <div className="detail-label">Documentation</div>
                <div className="detail-value documentation">{node.documentation}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="tab-code">
            {node.signature && (
              <div className="detail-section">
                <div className="detail-label">Signature</div>
                <div className="detail-code">{node.signature}</div>
              </div>
            )}

            {node.dataType && (
              <div className="detail-section">
                <div className="detail-label">Type</div>
                <div className="detail-code">{node.dataType}</div>
              </div>
            )}

            {node.initialValue && (
              <div className="detail-section">
                <div className="detail-label">Valeur initiale</div>
                <div className="detail-code">{node.initialValue}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'relations' && (
          <div className="tab-relations">
            {/* Incoming */}
            <div className="detail-section">
              <div className="detail-label">
                Entrantes ({incomingEdges.length})
              </div>
              <div className="relations-list">
                {incomingEdges.slice(0, 20).map(edge => (
                  <div
                    key={edge.id}
                    className="relation-item incoming"
                    onClick={() => onNavigateToNode(edge.source)}
                  >
                    <span className="relation-type">{edge.type}</span>
                    <span className="relation-source">← {edge.source.split('::').pop()}</span>
                  </div>
                ))}
                {incomingEdges.length === 0 && (
                  <div className="no-relations">Aucune relation entrante</div>
                )}
              </div>
            </div>

            {/* Outgoing */}
            <div className="detail-section">
              <div className="detail-label">
                Sortantes ({outgoingEdges.length})
              </div>
              <div className="relations-list">
                {outgoingEdges.slice(0, 20).map(edge => (
                  <div
                    key={edge.id}
                    className="relation-item outgoing"
                    onClick={() => onNavigateToNode(edge.target)}
                  >
                    <span className="relation-type">{edge.type}</span>
                    <span className="relation-target">→ {edge.target.split('::').pop()}</span>
                  </div>
                ))}
                {outgoingEdges.length === 0 && (
                  <div className="no-relations">Aucune relation sortante</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="tab-metrics">
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-value">{node.metrics.loc}</div>
                <div className="metric-label">Lignes</div>
              </div>
              {node.metrics.complexity !== undefined && (
                <div className="metric-card">
                  <div className={`metric-value ${node.metrics.complexity > 10 ? 'high' : ''}`}>
                    {node.metrics.complexity}
                  </div>
                  <div className="metric-label">Complexité</div>
                </div>
              )}
              <div className="metric-card">
                <div className="metric-value">{node.metrics.dependencies}</div>
                <div className="metric-label">Dépendances</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{node.metrics.dependents}</div>
                <div className="metric-label">Dépendants</div>
              </div>
            </div>

            {node.children.length > 0 && (
              <div className="detail-section">
                <div className="detail-label">Enfants ({node.children.length})</div>
                <div className="children-list">
                  {node.children.slice(0, 10).map(childId => (
                    <div
                      key={childId}
                      className="child-item"
                      onClick={() => onNavigateToNode(childId)}
                    >
                      {childId.split('::').pop()}
                    </div>
                  ))}
                  {node.children.length > 10 && (
                    <div className="more-children">
                      +{node.children.length - 10} autres...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeDetails;
