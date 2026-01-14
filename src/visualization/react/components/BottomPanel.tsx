// =============================================================================
// BOTTOM PANEL - Panneau des issues et vulnérabilités
// =============================================================================

import React, { useState, useMemo } from 'react';
import type { CodeIssue, IssueSeverity } from '../../../types';

interface SecurityVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  file: string;
  line: number;
}

interface SecuritySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface BottomPanelProps {
  issues: CodeIssue[];
  vulnerabilities?: SecurityVulnerability[];
  securitySummary?: SecuritySummary;
  onIssueClick: (issue: CodeIssue) => void;
  onVulnerabilityClick?: (vuln: SecurityVulnerability) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff0040',
  error: '#ff0040',
  high: '#ff6600',
  medium: '#ffcc00',
  warning: '#ffcc00',
  low: '#00ccff',
  info: '#888888'
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  error: 0,
  high: 1,
  medium: 2,
  warning: 2,
  low: 3,
  info: 4
};

export const BottomPanel: React.FC<BottomPanelProps> = ({
  issues,
  vulnerabilities = [],
  securitySummary,
  onIssueClick,
  onVulnerabilityClick
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'issues' | 'security'>('issues');
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);

  // Combiner et trier les issues
  const allIssues = useMemo(() => {
    const combined = [...issues];

    if (vulnerabilities.length > 0) {
      vulnerabilities.forEach(v => {
        combined.push({
          id: v.id,
          type: 'dead_code' as any, // Type approximatif
          severity: v.severity === 'critical' ? 'error' : v.severity as IssueSeverity,
          location: { file: v.file, line: v.line },
          message: `${v.title}: ${v.description.substring(0, 100)}`,
          suggestion: undefined,
          relatedNodes: undefined
        });
      });
    }

    return combined.sort((a, b) =>
      (SEVERITY_ORDER[a.severity] || 4) - (SEVERITY_ORDER[b.severity] || 4)
    );
  }, [issues, vulnerabilities]);

  // Filtrer par sévérité
  const filteredIssues = useMemo(() => {
    if (!filterSeverity) return allIssues;
    return allIssues.filter(issue => issue.severity === filterSeverity);
  }, [allIssues, filterSeverity]);

  // Compter par sévérité
  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allIssues.forEach(issue => {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1;
    });
    return counts;
  }, [allIssues]);

  if (isCollapsed) {
    return (
      <div className="bottom-panel collapsed" onClick={() => setIsCollapsed(false)}>
        <div className="expand-tab">
          ▲ Issues & Vulnérabilités ({allIssues.length})
          {securitySummary && securitySummary.critical > 0 && (
            <span className="critical-badge">🔴 {securitySummary.critical}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bottom-panel hud">
      <div className="panel">
        {/* Header */}
        <div className="panel-header">
          <div className="panel-tabs">
            <button
              className={`panel-tab ${activeTab === 'issues' ? 'active' : ''}`}
              onClick={() => setActiveTab('issues')}
            >
              Issues ({issues.length})
            </button>
            {vulnerabilities.length > 0 && (
              <button
                className={`panel-tab ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                Sécurité ({vulnerabilities.length})
              </button>
            )}
          </div>

          <div className="panel-actions">
            {/* Summary badges */}
            {securitySummary && (
              <div className="severity-badges">
                {securitySummary.critical > 0 && (
                  <span
                    className={`severity-badge critical ${filterSeverity === 'critical' ? 'active' : ''}`}
                    onClick={() => setFilterSeverity(filterSeverity === 'critical' ? null : 'critical')}
                  >
                    🔴 {securitySummary.critical}
                  </span>
                )}
                {securitySummary.high > 0 && (
                  <span
                    className={`severity-badge high ${filterSeverity === 'high' ? 'active' : ''}`}
                    onClick={() => setFilterSeverity(filterSeverity === 'high' ? null : 'high')}
                  >
                    🟠 {securitySummary.high}
                  </span>
                )}
                {securitySummary.medium > 0 && (
                  <span
                    className={`severity-badge medium ${filterSeverity === 'medium' ? 'active' : ''}`}
                    onClick={() => setFilterSeverity(filterSeverity === 'medium' ? null : 'medium')}
                  >
                    🟡 {securitySummary.medium}
                  </span>
                )}
                {securitySummary.low > 0 && (
                  <span
                    className={`severity-badge low ${filterSeverity === 'low' ? 'active' : ''}`}
                    onClick={() => setFilterSeverity(filterSeverity === 'low' ? null : 'low')}
                  >
                    🔵 {securitySummary.low}
                  </span>
                )}
              </div>
            )}

            <button
              className="collapse-btn"
              onClick={() => setIsCollapsed(true)}
              title="Réduire"
            >
              ▼
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="panel-content issues-container">
          {filteredIssues.length === 0 ? (
            <div className="no-issues">
              Aucun problème détecté
            </div>
          ) : (
            filteredIssues.slice(0, 50).map(issue => (
              <div
                key={issue.id}
                className={`issue-item ${issue.severity}`}
                onClick={() => onIssueClick(issue)}
              >
                <div
                  className={`issue-severity ${issue.severity}`}
                  style={{ backgroundColor: SEVERITY_COLORS[issue.severity] }}
                />
                <div className="issue-content">
                  <div className="issue-message">{issue.message}</div>
                  <div className="issue-location">
                    {issue.location.file}:{issue.location.line}
                  </div>
                  {issue.suggestion && (
                    <div className="issue-suggestion">
                      💡 {issue.suggestion}
                    </div>
                  )}
                </div>
                <div className="issue-type">{issue.type}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BottomPanel;
