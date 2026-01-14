// =============================================================================
// ISSUES PANEL - Panneau des problemes et vulnerabilites
// =============================================================================

/**
 * Genere le script du panneau des issues
 */
export function getIssuesPanel(): string {
  return `
    // ===========================================================================
    // ISSUES PANEL
    // ===========================================================================
    function initIssuesPanel() {
      const summary = document.getElementById('security-summary');
      const list = document.getElementById('issues-list');
      const count = document.getElementById('issues-count');

      // Combine regular issues and security vulnerabilities
      let allIssues = [...issuesData];

      if (securityData) {
        allIssues = allIssues.concat(
          securityData.vulnerabilities.map(v => ({
            ...v,
            type: v.category,
            message: v.title + ': ' + v.description.substring(0, 100)
          }))
        );
      }

      // Sort by severity
      const severityOrder = { critical: 0, error: 0, high: 1, medium: 2, warning: 2, low: 3, info: 4 };
      allIssues.sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4));

      count.textContent = \`\${allIssues.length} issues\`;

      // Summary badges
      if (securityData) {
        const s = securityData.summary;
        summary.innerHTML = \`
          \${s.critical > 0 ? \`<div class="severity-badge critical">🔴 \${s.critical} Critical</div>\` : ''}
          \${s.high > 0 ? \`<div class="severity-badge high">🟠 \${s.high} High</div>\` : ''}
          \${s.medium > 0 ? \`<div class="severity-badge medium">🟡 \${s.medium} Medium</div>\` : ''}
          \${s.low > 0 ? \`<div class="severity-badge low">🔵 \${s.low} Low</div>\` : ''}
        \`;
      }

      // Issue list
      list.innerHTML = allIssues.slice(0, 50).map(issue => {
        const severity = issue.severity === 'error' ? 'critical' : issue.severity;
        return \`
          <div class="issue-item \${severity}" onclick="focusOnIssue('\${issue.location?.file}', \${issue.location?.line})">
            <div class="issue-severity \${severity}"></div>
            <div class="issue-content">
              <div class="issue-title">\${issue.title || issue.type}</div>
              <div class="issue-location">\${issue.location?.file || ''}:\${issue.location?.line || ''}</div>
              <div style="font-size: 11px; color: #888; margin-top: 4px;">\${(issue.message || issue.description || '').substring(0, 100)}</div>
            </div>
          </div>
        \`;
      }).join('');
    }

    window.focusOnIssue = function(file, line) {
      // Find node at this location
      const node = nodesData.find(n => n.location?.file === file && n.location?.line === line);
      if (node) {
        selectNode(node);
      }
    };
  `;
}
