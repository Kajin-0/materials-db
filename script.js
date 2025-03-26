
let materials = [];

fetch('materials.json')
  .then(response => response.json())
  .then(data => {
    materials = data;
    setupSearch();
  });

function setupSearch() {
  const options = {
    keys: ['name', 'formula', 'synonyms'],
    threshold: 0.3
  };
  const fuse = new Fuse(materials, options);
  const searchBox = document.getElementById('searchBox');
  const suggestions = document.getElementById('suggestions');
  const results = document.getElementById('results');
  const bandgapMin = document.getElementById('bandgapMin');
  const categoryFilter = document.getElementById('categoryFilter');
  const themeToggle = document.getElementById('themeToggle');

  themeToggle.onclick = () => {
    document.body.classList.toggle('dark');
  };

  function applyFilters(list) {
    const minBG = parseFloat(bandgapMin.value) || 0;
    const category = categoryFilter.value;
    return list.filter(m => {
      return (!category || m.category === category) &&
             (!m.bandgap || m.bandgap.value >= minBG);
    });
  }

  function displayResults(items) {
    results.innerHTML = '';
    items.forEach(m => {
      const div = document.createElement('div');
      div.className = 'material';
      div.innerHTML = `
        <h2>${m.name}</h2>
        <div class="property-group"><h3>Basic Properties</h3>
          <dl>
            <dt>Formula</dt><dd>${m.formula}</dd>
            <dt>Category</dt><dd>${m.category}</dd>
          </dl>
        </div>
        <div class="property-group"><h3>Electronic Properties</h3>
          <dl>
            <dt>Bandgap</dt><dd>${m.bandgap.value} ${m.bandgap.units} (${m.bandgap.type})</dd>
            <dt>Mobility</dt><dd>Electrons: ${m.mobility.electrons}, Holes: ${m.mobility.holes} ${m.mobility.units}</dd>
          </dl>
        </div>
        <div class="property-group"><h3>Thermal Properties</h3>
          <dl>
            <dt>Thermal Conductivity</dt><dd>${m.thermal_conductivity.value} ${m.thermal_conductivity.units}</dd>
          </dl>
        </div>
        <p>${m.notes}</p>
        <div class="tags">${(m.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
        <div class="references">${(m.references || []).map(ref => `<a href="${ref.url}" target="_blank">${ref.label}</a>`).join(' | ')}</div>
      `;
      results.appendChild(div);
    });
  }

  function updateSuggestions(query) {
    const result = fuse.search(query).map(r => r.item);
    suggestions.innerHTML = '';
    result.slice(0, 5).forEach(item => {
      const li = document.createElement('li');
      li.textContent = item.name;
      li.addEventListener('click', () => {
        searchBox.value = item.name;
        suggestions.innerHTML = '';
        displayResults(applyFilters([item]));
      });
      suggestions.appendChild(li);
    });
  }

  searchBox.addEventListener('input', () => {
    const query = searchBox.value;
    const result = fuse.search(query).map(r => r.item);
    updateSuggestions(query);
    displayResults(applyFilters(result));
  });

  [bandgapMin, categoryFilter].forEach(el =>
    el.addEventListener('input', () => {
      const result = fuse.search(searchBox.value).map(r => r.item);
      displayResults(applyFilters(result));
    })
  );

  searchBox.addEventListener('keydown', (e) => {
    const topSuggestion = suggestions.querySelector('li');
    if (e.key === 'Tab' && topSuggestion) {
      e.preventDefault();
      searchBox.value = topSuggestion.textContent;
      suggestions.innerHTML = '';
      const result = fuse.search(searchBox.value).map(r => r.item);
      displayResults(applyFilters(result));
    }
  });

  displayResults(applyFilters(materials)); // initial render
}
