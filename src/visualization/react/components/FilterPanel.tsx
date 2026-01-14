// =============================================================================
// FILTER PANEL - Panneau de filtres pour la visualisation
// =============================================================================

import React, { useState, useCallback } from 'react';
import type { NodeType, Layer, IssueType } from '../../../types';

interface FilterState {
  showDeadCode: boolean;
  showUnused: boolean;
  showCircularDeps: boolean;
  showHighComplexity: boolean;
  nodeTypes: Set<NodeType>;
  layers: Set<Layer>;
  searchQuery: string;
}

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  deadCodeCount: number;
  unusedCount: number;
  circularDepsCount: number;
  highComplexityCount: number;
}

const NODE_TYPE_GROUPS = {
  'Structure': ['system', 'module', 'file'] as NodeType[],
  'Types': ['class', 'struct', 'interface', 'trait', 'enum', 'type_alias'] as NodeType[],
  'Fonctions': ['function', 'method', 'constructor', 'closure', 'handler'] as NodeType[],
  'Blocs': ['block', 'conditional', 'loop', 'try_catch', 'match_arm'] as NodeType[],
  'Variables': ['variable', 'constant', 'parameter', 'attribute', 'property'] as NodeType[]
};

const LAYER_LABELS: Record<Layer, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  sidecar: 'Sidecar',
  data: 'Data',
  external: 'External'
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  deadCodeCount,
  unusedCount,
  circularDepsCount,
  highComplexityCount
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleFilter = useCallback((key: keyof FilterState) => {
    if (typeof filters[key] === 'boolean') {
      onFiltersChange({
        ...filters,
        [key]: !filters[key]
      });
    }
  }, [filters, onFiltersChange]);

  const toggleNodeType = useCallback((type: NodeType) => {
    const newTypes = new Set(filters.nodeTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    onFiltersChange({ ...filters, nodeTypes: newTypes });
  }, [filters, onFiltersChange]);

  const toggleLayer = useCallback((layer: Layer) => {
    const newLayers = new Set(filters.layers);
    if (newLayers.has(layer)) {
      newLayers.delete(layer);
    } else {
      newLayers.add(layer);
    }
    onFiltersChange({ ...filters, layers: newLayers });
  }, [filters, onFiltersChange]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, searchQuery: e.target.value });
  }, [filters, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      showDeadCode: false,
      showUnused: false,
      showCircularDeps: false,
      showHighComplexity: false,
      nodeTypes: new Set(),
      layers: new Set(),
      searchQuery: ''
    });
  }, [onFiltersChange]);

  const hasActiveFilters = filters.showDeadCode ||
    filters.showUnused ||
    filters.showCircularDeps ||
    filters.showHighComplexity ||
    filters.nodeTypes.size > 0 ||
    filters.layers.size > 0 ||
    filters.searchQuery.length > 0;

  return (
    <div className={`filter-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="filter-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="filter-title">
          Filtres
          {hasActiveFilters && <span className="filter-badge">●</span>}
        </span>
        <span className="filter-toggle">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="filter-content">
          {/* Search */}
          <div className="filter-section">
            <input
              type="text"
              className="filter-search"
              placeholder="Rechercher..."
              value={filters.searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          {/* Issues Filters */}
          <div className="filter-section">
            <div className="filter-section-title">Problèmes</div>

            <label className={`filter-checkbox ${filters.showDeadCode ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={filters.showDeadCode}
                onChange={() => toggleFilter('showDeadCode')}
              />
              <span className="filter-label">
                <span className="filter-icon dead-code">☠</span>
                Code mort
                {deadCodeCount > 0 && (
                  <span className="filter-count">{deadCodeCount}</span>
                )}
              </span>
            </label>

            <label className={`filter-checkbox ${filters.showUnused ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={filters.showUnused}
                onChange={() => toggleFilter('showUnused')}
              />
              <span className="filter-label">
                <span className="filter-icon unused">⚠</span>
                Non utilisé
                {unusedCount > 0 && (
                  <span className="filter-count">{unusedCount}</span>
                )}
              </span>
            </label>

            <label className={`filter-checkbox ${filters.showCircularDeps ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={filters.showCircularDeps}
                onChange={() => toggleFilter('showCircularDeps')}
              />
              <span className="filter-label">
                <span className="filter-icon circular">↻</span>
                Dépendances circulaires
                {circularDepsCount > 0 && (
                  <span className="filter-count">{circularDepsCount}</span>
                )}
              </span>
            </label>

            <label className={`filter-checkbox ${filters.showHighComplexity ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={filters.showHighComplexity}
                onChange={() => toggleFilter('showHighComplexity')}
              />
              <span className="filter-label">
                <span className="filter-icon complexity">📈</span>
                Haute complexité
                {highComplexityCount > 0 && (
                  <span className="filter-count">{highComplexityCount}</span>
                )}
              </span>
            </label>
          </div>

          {/* Node Types */}
          <div className="filter-section">
            <div className="filter-section-title">Types de noeuds</div>
            {Object.entries(NODE_TYPE_GROUPS).map(([group, types]) => (
              <div key={group} className="filter-group">
                <div className="filter-group-title">{group}</div>
                <div className="filter-chips">
                  {types.map(type => (
                    <button
                      key={type}
                      className={`filter-chip ${filters.nodeTypes.has(type) ? 'active' : ''}`}
                      onClick={() => toggleNodeType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Layers */}
          <div className="filter-section">
            <div className="filter-section-title">Couches</div>
            <div className="filter-chips">
              {(Object.keys(LAYER_LABELS) as Layer[]).map(layer => (
                <button
                  key={layer}
                  className={`filter-chip layer-${layer} ${filters.layers.has(layer) ? 'active' : ''}`}
                  onClick={() => toggleLayer(layer)}
                >
                  {LAYER_LABELS[layer]}
                </button>
              ))}
            </div>
          </div>

          {/* Clear All */}
          {hasActiveFilters && (
            <button className="filter-clear-btn" onClick={clearAllFilters}>
              Effacer les filtres
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
