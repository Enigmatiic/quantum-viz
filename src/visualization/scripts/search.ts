// =============================================================================
// SEARCH - Fonctionnalite de recherche
// =============================================================================

/**
 * Genere le script de recherche
 */
export function getSearch(): string {
  return `
    // ===========================================================================
    // SEARCH
    // ===========================================================================
    function initSearch() {
      const input = document.getElementById('search-input');
      const results = document.getElementById('search-results');

      input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        if (query.length < 2) {
          results.classList.remove('active');
          return;
        }

        const matches = nodesData
          .filter(n => n.name.toLowerCase().includes(query) || n.fullPath?.toLowerCase().includes(query))
          .slice(0, 20);

        if (matches.length === 0) {
          results.classList.remove('active');
          return;
        }

        results.innerHTML = matches.map(n => \`
          <div class="search-result" onclick="selectNodeById('\${n.id}'); document.getElementById('search-results').classList.remove('active');">
            <div class="search-result-type">\${n.type}</div>
            <div class="search-result-name">\${n.name}</div>
            <div class="search-result-path">\${n.location?.file || ''}</div>
          </div>
        \`).join('');

        results.classList.add('active');
      });

      input.addEventListener('blur', () => {
        setTimeout(() => results.classList.remove('active'), 200);
      });
    }
  `;
}
