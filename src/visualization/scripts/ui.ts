// =============================================================================
// UI UPDATES - Mises a jour de l'interface utilisateur
// =============================================================================

/**
 * Genere le script des mises a jour UI
 */
export function getUIUpdates(): string {
  return `
    // ===========================================================================
    // UI UPDATES
    // ===========================================================================
    function showTooltip(node, x, y) {
      const tooltip = document.getElementById('tooltip');
      tooltip.querySelector('.tooltip-title').textContent = node.name;
      tooltip.querySelector('.type').textContent = \`Type: \${node.type} (\${node.level})\`;
      tooltip.querySelector('.location').textContent = node.location?.file || '';
      tooltip.querySelector('.metrics').textContent =
        \`LOC: \${node.metrics?.loc || 0} | Complexity: \${node.metrics?.complexity || '-'}\`;

      tooltip.style.left = (x + 15) + 'px';
      tooltip.style.top = (y + 15) + 'px';
      tooltip.classList.add('visible');
    }

    function hideTooltip() {
      document.getElementById('tooltip').classList.remove('visible');
    }

    function updateNodeDetails(node) {
      const container = document.getElementById('selected-node-details');

      container.innerHTML = \`
        <div class="detail-section">
          <div class="detail-label">Nom</div>
          <div class="detail-value" style="color: #00ffff; font-size: 16px; font-weight: bold;">
            \${node.name}
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-label">Type / Niveau</div>
          <div class="detail-value">\${node.type} (\${node.level})</div>
        </div>

        \${node.signature ? \`
        <div class="detail-section">
          <div class="detail-label">Signature</div>
          <div class="detail-code">\${node.signature}</div>
        </div>
        \` : ''}

        \${node.location?.file ? \`
        <div class="detail-section">
          <div class="detail-label">Fichier</div>
          <div class="detail-value">\${node.location.file}:\${node.location.line}</div>
        </div>
        \` : ''}

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">\${node.metrics?.loc || 0}</div>
            <div class="metric-label">Lignes</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">\${node.metrics?.complexity || '-'}</div>
            <div class="metric-label">Complexite</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">\${node.metrics?.dependencies || 0}</div>
            <div class="metric-label">Dependances</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">\${node.children?.length || 0}</div>
            <div class="metric-label">Enfants</div>
          </div>
        </div>

        \${node.documentation ? \`
        <div class="detail-section" style="margin-top: 15px;">
          <div class="detail-label">Documentation</div>
          <div class="detail-value" style="font-size: 11px; color: #888;">
            \${node.documentation.substring(0, 200)}...
          </div>
        </div>
        \` : ''}
      \`;

      // Update relations tab
      updateNodeRelations(node);

      // Update code tab
      updateNodeCode(node);
    }

    function updateNodeCode(node) {
      const container = document.getElementById('selected-node-code');

      // Build code preview content
      let codeContent = '';

      if (node.signature) {
        codeContent += \`
          <div class="detail-section">
            <div class="detail-label">Signature</div>
            <div class="detail-code">\${escapeHtml(node.signature)}</div>
          </div>
        \`;
      }

      if (node.type === 'function' || node.type === 'method' || node.type === 'arrow' || node.type === 'closure') {
        // Show function parameters if available
        const params = node.parameters || [];
        if (params.length > 0) {
          codeContent += \`
            <div class="detail-section">
              <div class="detail-label">Parametres (\${params.length})</div>
              <div class="detail-code">\${params.map(p => \`\${p.name}: \${p.type || 'any'}\`).join('\\n')}</div>
            </div>
          \`;
        }

        // Show return type if available
        if (node.returnType) {
          codeContent += \`
            <div class="detail-section">
              <div class="detail-label">Type de retour</div>
              <div class="detail-code">\${escapeHtml(node.returnType)}</div>
            </div>
          \`;
        }
      }

      if (node.type === 'class' || node.type === 'struct' || node.type === 'interface') {
        // Show class members summary
        const childFunctions = (node.children || [])
          .map(id => nodesData.find(n => n.id === id))
          .filter(n => n && (n.type === 'method' || n.type === 'function' || n.type === 'constructor'));

        const childProps = (node.children || [])
          .map(id => nodesData.find(n => n.id === id))
          .filter(n => n && (n.type === 'property' || n.type === 'variable' || n.type === 'attribute'));

        if (childProps.length > 0) {
          codeContent += \`
            <div class="detail-section">
              <div class="detail-label">Proprietes (\${childProps.length})</div>
              <div class="detail-code">\${childProps.slice(0, 10).map(p => p.name).join('\\n')}\${childProps.length > 10 ? '\\n...' : ''}</div>
            </div>
          \`;
        }

        if (childFunctions.length > 0) {
          codeContent += \`
            <div class="detail-section">
              <div class="detail-label">Methodes (\${childFunctions.length})</div>
              <div class="detail-code">\${childFunctions.slice(0, 10).map(f => f.signature || f.name).join('\\n')}\${childFunctions.length > 10 ? '\\n...' : ''}</div>
            </div>
          \`;
        }
      }

      // Show file location with clickable link
      if (node.location?.file) {
        codeContent += \`
          <div class="detail-section">
            <div class="detail-label">Emplacement</div>
            <div class="detail-code" style="color: #00ccff; cursor: pointer;"
                 title="Fichier: \${node.location.file}">
              \${node.location.file}:\${node.location.line || 1}\${node.location.endLine ? '-' + node.location.endLine : ''}
            </div>
          </div>
        \`;
      }

      // Show documentation/comments
      if (node.documentation) {
        codeContent += \`
          <div class="detail-section">
            <div class="detail-label">Documentation</div>
            <div class="detail-code" style="color: #888; font-style: italic; white-space: pre-wrap;">
\${escapeHtml(node.documentation.substring(0, 500))}\${node.documentation.length > 500 ? '...' : ''}
            </div>
          </div>
        \`;
      }

      // Fallback if no code info available
      if (!codeContent) {
        codeContent = \`
          <div style="color: #666; text-align: center; padding: 30px;">
            <div style="font-size: 24px; margin-bottom: 10px;">📝</div>
            <div>Pas d'apercu de code disponible</div>
            <div style="font-size: 11px; margin-top: 5px;">pour ce type de noeud</div>
          </div>
        \`;
      }

      container.innerHTML = codeContent;
    }

    function escapeHtml(text) {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function updateNodeRelations(node) {
      const container = document.getElementById('selected-node-relations');

      const incoming = edgesData.filter(e => e.target === node.id);
      const outgoing = edgesData.filter(e => e.source === node.id);

      container.innerHTML = \`
        <div class="detail-section">
          <div class="detail-label">Entrant (\${incoming.length})</div>
          \${incoming.slice(0, 10).map(e => {
            const source = nodesData.find(n => n.id === e.source);
            return \`<div class="tree-node" onclick="selectNodeById('\${e.source}')">
              <span style="color: #00ff88;">←</span> \${source?.name || e.source} <small style="color: #666;">(\${e.type})</small>
            </div>\`;
          }).join('')}
        </div>

        <div class="detail-section">
          <div class="detail-label">Sortant (\${outgoing.length})</div>
          \${outgoing.filter(e => e.type !== 'contains').slice(0, 10).map(e => {
            const target = nodesData.find(n => n.id === e.target);
            return \`<div class="tree-node" onclick="selectNodeById('\${e.target}')">
              <span style="color: #ff8800;">→</span> \${target?.name || e.target} <small style="color: #666;">(\${e.type})</small>
            </div>\`;
          }).join('')}
        </div>
      \`;
    }

    function updateBreadcrumb(node) {
      const breadcrumb = document.getElementById('breadcrumb');
      const path = [];

      let current = node;
      while (current) {
        path.unshift(current);
        current = current.parent ? nodesData.find(n => n.id === current.parent) : null;
      }

      breadcrumb.innerHTML = path.map((n, i) => \`
        <span class="breadcrumb-item" onclick="selectNodeById('\${n.id}')">\${n.name}</span>
        \${i < path.length - 1 ? '<span class="breadcrumb-separator">›</span>' : ''}
      \`).join('');
    }
  `;
}
