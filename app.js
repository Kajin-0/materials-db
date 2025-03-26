
(() => {
  const searchInput = document.getElementById('searchInput');
  const suggestionsList = document.getElementById('suggestions');
  const resultsContainer = document.getElementById('results');
  const popularTagsContainer = document.getElementById('popularTags');

  const fuse = new Fuse(window.materials, {
    keys: ['name', 'formula', 'synonyms', 'tags'],
    threshold: 0.3
  });

  const popularTags = [...new Set(window.materials.flatMap(m => m.tags))].slice(0, 10);
  popularTags.forEach(tag => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = tag;
    span.onclick = () => {
      searchInput.value = tag;
      performSearch(tag);
    };
    popularTagsContainer.appendChild(span);
  });

  searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim();
    suggestionsList.innerHTML = '';
    if (!val) {
      renderResults([]);
      return;
    }

    const results = fuse.search(val).slice(0, 5);
    results.forEach(r => {
      const li = document.createElement('li');
      li.textContent = r.item.name;
      li.onclick = () => {
        searchInput.value = r.item.name;
        suggestionsList.innerHTML = '';
        performSearch(r.item.name);
      };
      suggestionsList.appendChild(li);
    });
    performSearch(val);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = searchInput.value.trim();
      suggestionsList.innerHTML = '';
      if (val) {
        performSearch(val);
      }
    }
  });

  function performSearch(query) {
    const results = fuse.search(query).map(r => r.item);
    renderResults(results);
  }

  function renderResults(items) {
    resultsContainer.innerHTML = '';
    if (!items || !items.length) {
      if (searchInput.value.trim()) {
        resultsContainer.innerHTML = '<p>No materials found.</p>';
      }
      return;
    }

    items.forEach(m => {
      const card = document.createElement('div');
      card.className = 'material-card';
      card.innerHTML = `
        <h2>${m.name}</h2>
        <p><strong>Formula:</strong> ${m.formula}</p>
        <p><strong>Category:</strong> ${m.category || '—'}</p>
        <div class="tags">
          ${(m.tags || []).map(t => `<span class="tag">${t}</span>`).join(' ')}
        </div>
      `;
      const tagEls = card.querySelectorAll('.tag');
      tagEls.forEach(tagEl => {
        tagEl.onclick = () => {
          searchInput.value = tagEl.textContent;
          performSearch(tagEl.textContent);
        };
      });

      resultsContainer.appendChild(card);
    });
  }

  renderResults([]);
})();
