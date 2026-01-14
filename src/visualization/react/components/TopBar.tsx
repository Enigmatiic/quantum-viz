// =============================================================================
// TOP BAR - Barre supérieure avec infos projet et contrôles
// =============================================================================

import React from 'react';
import type { GranularityLevel, ProjectStats, VisualizationConfig } from '../../../types';
import { LEVELS } from '../../../types';

interface TopBarProps {
  projectName: string;
  stats: ProjectStats;
  currentLevel: GranularityLevel;
  onLevelChange: (level: GranularityLevel) => void;
  onResetPositions: () => void;
  onToggleView: (view: 'default' | 'clusters' | 'layers') => void;
  activeView: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectName,
  stats,
  currentLevel,
  onLevelChange,
  onResetPositions,
  onToggleView,
  activeView
}) => {
  const levels: GranularityLevel[] = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];

  return (
    <div className="top-bar hud">
      {/* Project Info */}
      <div className="project-info">
        <div className="project-name">{projectName}</div>
        <div className="stats-mini">
          <div className="stat-item">
            <span className="stat-value">{stats.totalFiles}</span>
            <span>fichiers</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.totalFunctions}</span>
            <span>fonctions</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.totalLines.toLocaleString()}</span>
            <span>lignes</span>
          </div>
        </div>
      </div>

      {/* Level Selector */}
      <div className="level-selector">
        {levels.map(level => (
          <button
            key={level}
            className={`level-btn ${currentLevel === level ? 'active' : ''}`}
            onClick={() => onLevelChange(level)}
            title={LEVELS[level].description}
          >
            {level.slice(1)}
          </button>
        ))}
      </div>

      {/* View Modes */}
      <div className="view-modes">
        <button
          className={`view-btn ${activeView === 'default' ? 'active' : ''}`}
          onClick={() => onToggleView('default')}
        >
          Par défaut
        </button>
        <button
          className={`view-btn ${activeView === 'clusters' ? 'active' : ''}`}
          onClick={() => onToggleView('clusters')}
        >
          Clusters
        </button>
        <button
          className={`view-btn ${activeView === 'layers' ? 'active' : ''}`}
          onClick={() => onToggleView('layers')}
        >
          Couches
        </button>
        <button
          className="view-btn reset-btn"
          onClick={onResetPositions}
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
};

export default TopBar;
