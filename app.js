import Fuse from 'fuse.js';

class MaterialSearch {
  constructor() {
    this.indexData = [];
    this.fuse = null;
    this.elements = {
      searchInput: document.getElementById('searchInput'),
      suggestions: document.getElementById('suggestions'),
      results: document.getElementById('results'),
      toolbar: document.getElementById('toolbar'),
      industryFilter: document.getElementById('industryFilter'),
      categoryFilter: document.getElementById('categoryFilter'),
      propertyFilter: document.getElementById('propertyFilter')
    };
  }

  async init() {
    await this.loadIndex();
    this.bindEvents();
  }

  async loadIndex() {
    try {
      const response = await fetch('data/materials-index.json');
      this.indexData = await response.json();

      this.fuse = new Fuse(this.indexData, {
        keys: ['name', 'formula', 'synonyms'],
        threshold: 0.3,
        includeScore: true
      });

      this.updateFilters(this.indexData);
    } catch (error) {
      console.error('Error loading index:', error);
      this.elements.results.innerHTML = '<p>Error loading materials data.</p>';
    }
  }

  updateFilters(materials) {
    const extractUniqueValues = (key, prefix = '') => 
      [...new Set(materials.flatMap(m => 
        (m[key] || [])
          .filter(t => !prefix || t.startsWith(prefix))
          .map(t => prefix ? t.replace(prefix, '') : t)
      ))];

    const fillSelect = (selectElement, items) => {
      selectElement.innerHTML = '<option value="">All</option>' + 
        items.map(item => `<option>${item}</option>`).join('');
    };

    fillSelect(this.elements.industryFilter, 
      extractUniqueValues('tags', 'industry:'));
    fillSelect(this.elements.categoryFilter, 
      extractUniqueValues('category'));
    fillSelect(this.elements.propertyFilter, 
      extractUniqueValues('tags').filter(tag => !tag.startsWith('industry:')));
  }

  bindEvents() {
    this.elements.searchInput.addEventListener('input', 
      this.debounce(this.handleInput.bind(this), 300));
    
    this.elements.searchInput.addEventListener('keydown', 
      this.handleKeyDown.bind(this));
    
    [
      this.elements.industryFilter, 
      this.elements.categoryFilter, 
      this.elements.propertyFilter
    ].forEach(filter => 
      filter.addEventListener('change', this.performSearch.bind(this))
    );
  }

  handleInput() {
    const query = this.elements.searchInput.value.trim();
    this.elements.suggestions.innerHTML = query 
      ? this.renderSuggestions(query) 
      : '';
  }

  handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = this.elements.searchInput.value.trim();
      this.elements.suggestions.innerHTML = '';
      this.performSearch(query);
    }
  }

  renderSuggestions(query) {
    const suggestions = this.fuse.search(query, { limit: 8 })
      .map(x => x.item.name);

    return suggestions.map(name => 
      `<li onclick="materialSearch.selectSuggestion('${name}')">${name}</li>`
    ).join('');
  }

  selectSuggestion(name) {
    this.elements.searchInput.value = name;
    this.elements.suggestions.innerHTML = '';
    this.performSearch(name);
  }

  async performSearch(query = '') {
    const filters = {
      industry: this.elements.industryFilter.value,
      category: this.elements.categoryFilter.value,
      tag: this.elements.propertyFilter.value
    };

    this.elements.toolbar.style.display = query ? 'flex' : 'none';

    let results = this.fuse.search(query).map(x => x.item);

    results = results.filter(m => 
      (!filters.industry || m.tags.includes(`industry:${filters.industry}`)) &&
      (!filters.category || m.category === filters.category) &&
      (!filters.tag || m.tags.includes(filters.tag))
    );

    if (!results.length) {
      this.renderResults([]);
      return;
    }

    try {
      const materials = await this.loadMaterialsByFiles([...new Set(results.map(m => m.file))]);
      const shown = materials.filter(m => results.find(r => r.name === m.name));
      this.renderResults(shown);
    } catch (error) {
      console.error('Error loading materials:', error);
      this.renderResults([]);
    }
  }

  async loadMaterialsByFiles(files) {
    const fetchPromises = [...new Set(files)].map(async file => {
      const response = await fetch(`data/${file}`);
      return response.json();
    });

    const allMaterials = await Promise.all(fetchPromises);
    return allMaterials.flat();
  }

  renderResults(materials) {
    if (!materials.length) {
      this.elements.results.innerHTML = '<p class="no-results">No materials found.</p>';
      return;
    }

    this.elements.results.innerHTML = materials.map(m => `
      <div class="material-card">
        <h2>${m.name}</h2>
        <p><strong>Formula:</strong> ${m.formula}</p>
        <p><strong>Category:</strong> ${m.category}</p>
        <div class="tags">
          ${(m.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }

  // Utility method to prevent excessive function calls
  debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
}

// Initialize the search when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.materialSearch = new MaterialSearch();
  window.materialSearch.init();
});
