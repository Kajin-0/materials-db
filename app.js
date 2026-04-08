let allMaterialsData = [];
let fuse;
let hasPerformedSearch = false;

const INITIAL_PROMPT = "Start with a formula-first query or apply filters to inspect materials.";

async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Source file not found (404): ${url}`);
      } else {
        console.error(`Fetch Error for ${url}: ${response.status} ${response.statusText}`);
      }
      return null;
    }

    const data = await response.json();

    if (url.endsWith('materials-index.json')) {
      if (!data || typeof data !== 'object' || !Array.isArray(data.sources) || !data.sources.every(s => typeof s === 'string')) {
        console.error(`Invalid format for ${url}. Expected {"sources": ["file.json"]}.`);
        return null;
      }
      return data;
    }

    if (!Array.isArray(data)) {
      console.error(`Invalid format for ${url}. Expected an array.`);
      return null;
    }

    return data.filter(item => typeof item === 'object' && item !== null);
  } catch (error) {
    console.error(`Error fetching/parsing ${url}:`, error);
    return null;
  }
}

async function initializeDatabase() {
  updateLoadingMessage("Loading material index...");

  const indexData = await fetchJson('./data/materials-index.json');
  if (!indexData) {
    updateLoadingMessage("Failed to load material index. See console for diagnostics.", true);
    disableFilters();
    return;
  }

  const validSourceFiles = indexData.sources.filter(sourceFile =>
    typeof sourceFile === 'string' && sourceFile.trim() !== '' && sourceFile.endsWith('.json')
  );

  if (validSourceFiles.length === 0) {
    updateLoadingMessage("No valid source files were listed in data/materials-index.json.", true);
    disableFilters();
    return;
  }

  updateLoadingMessage(`Loading ${validSourceFiles.length} material datasets...`);

  const datasets = await Promise.all(validSourceFiles.map(sourceFile => fetchJson(`./data/${sourceFile}`)));
  allMaterialsData = datasets.filter(Boolean).flat();

  if (allMaterialsData.length === 0) {
    updateLoadingMessage("No valid material records could be loaded.", true);
    disableFilters();
    return;
  }

  allMaterialsData = allMaterialsData.map(material => ({
    ...material,
    formula_normalized: material.formula
      ? material.formula
          .replace(/\(.*?\)/g, '')
          .replace(/[\d.\sₓ₁₂₃₄₅₆₇₈₉₊₋₀\(\)]+/g, '')
          .replace(/[-_\/]/g, '')
      : ''
  }));

  try {
    fuse = new Fuse(allMaterialsData, {
      keys: [
        { name: 'name', weight: 0.4 },
        { name: 'formula_normalized', weight: 0.4 },
        { name: 'synonyms', weight: 0.2 },
        { name: 'formula', weight: 0.1 },
        { name: 'tags', weight: 0.1 },
        { name: 'category', weight: 0.1 }
      ],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true,
      ignoreLocation: true,
      minMatchCharLength: 2
    });
  } catch (error) {
    console.error('Error initializing Fuse.js:', error);
    updateLoadingMessage('Failed to initialize search index.', true);
    disableFilters();
    return;
  }

  updateFilters(allMaterialsData);
  updateLoadingMessage('');
  setInitialResultsMessage(INITIAL_PROMPT);
}

function updateLoadingMessage(message, isError = false) {
  const resultsContainer = document.getElementById('results');
  if (!resultsContainer) return;

  if (!message) {
    resultsContainer.innerHTML = '';
    return;
  }

  resultsContainer.innerHTML = `<p class="initial-message ${isError ? 'error-state' : ''}">${message}</p>`;
}

function setInitialResultsMessage(message) {
  const resultsContainer = document.getElementById('results');
  if (!resultsContainer) return;

  if (resultsContainer.innerHTML === '' || resultsContainer.querySelector('.initial-message')) {
    resultsContainer.innerHTML = `<p class="initial-message">${message}</p>`;
  }
}

function disableFilters() {
  ['industryFilter', 'categoryFilter', 'propertyFilter'].forEach(id => {
    const filterElement = document.getElementById(id);
    if (!filterElement) return;

    filterElement.disabled = true;
    if (filterElement.options.length === 0 || filterElement.options[0].value === '') {
      filterElement.innerHTML = '<option value="">Unavailable</option>';
    }
  });

  document.getElementById('toolbar')?.classList.remove('active');
}

function updateFilters(materials) {
  const industrySelect = document.getElementById('industryFilter');
  const categorySelect = document.getElementById('categoryFilter');
  const propertySelect = document.getElementById('propertyFilter');

  if (!industrySelect || !categorySelect || !propertySelect) return;

  const industries = [...new Set(
    materials.flatMap(m => m.tags || [])
      .filter(t => typeof t === 'string' && t.startsWith('industry:'))
      .map(t => t.replace('industry:', ''))
      .filter(Boolean)
  )].sort();

  const categories = [...new Set(materials.map(m => m.category).filter(Boolean))].sort();

  const tags = [...new Set(
    materials.flatMap(m => m.tags || [])
      .filter(t => typeof t === 'string' && !t.startsWith('industry:'))
      .filter(Boolean)
  )].sort();

  const fillSelect = (selectElement, items, defaultLabel) => {
    const currentValue = selectElement.value;
    selectElement.innerHTML = `<option value="">${defaultLabel}</option>`;
    selectElement.innerHTML += items.map(item => `<option value="${item}">${item}</option>`).join('');
    selectElement.value = items.includes(currentValue) ? currentValue : '';
    selectElement.disabled = items.length === 0;
  };

  fillSelect(industrySelect, industries, 'All Industry Domains');
  fillSelect(categorySelect, categories, 'All Material Categories');
  fillSelect(propertySelect, tags, 'All Tags');
}

function updateResultsMeta(count, query, filters) {
  const resultsMeta = document.getElementById('results-meta');
  if (!resultsMeta) return;

  const activeFilters = Object.entries(filters).filter(([, value]) => value);
  const filterLabel = activeFilters.length
    ? activeFilters.map(([k, v]) => `${k}: ${v}`).join(' • ')
    : 'No filters';

  resultsMeta.hidden = false;
  resultsMeta.innerHTML = `
    <p><strong>${count}</strong> material${count === 1 ? '' : 's'} matched</p>
    <p>Query: <span>${query || 'None'}</span></p>
    <p>Scope: <span>${filterLabel}</span></p>
  `;
}

function performSearch(query) {
  query = query.trim();
  hasPerformedSearch = true;

  const resultsContainer = document.getElementById('results');
  if (!resultsContainer || !fuse) return;

  const industry = document.getElementById('industryFilter')?.value || '';
  const category = document.getElementById('categoryFilter')?.value || '';
  const tag = document.getElementById('propertyFilter')?.value || '';

  const isAnyFilterActive = Boolean(industry || category || tag);
  const isSearchActive = query !== '';
  const shouldShowResultsArea = isSearchActive || isAnyFilterActive;

  document.getElementById('toolbar')?.classList.toggle('active', shouldShowResultsArea);
  document.body.classList.toggle('results-active', shouldShowResultsArea);

  if (!shouldShowResultsArea) {
    document.getElementById('results-meta')?.setAttribute('hidden', 'true');
    setInitialResultsMessage(INITIAL_PROMPT);
    render([]);
    return;
  }

  let results = query === ''
    ? allMaterialsData.map(item => ({ item, matches: [] }))
    : fuse.search(query, { includeMatches: true });

  if (industry) results = results.filter(r => r.item.tags?.includes(`industry:${industry}`));
  if (category) results = results.filter(r => r.item.category === category);
  if (tag) results = results.filter(r => r.item.tags?.includes(tag));

  updateResultsMeta(results.length, query, {
    Industry: industry || null,
    Category: category || null,
    Tag: tag || null
  });

  render(results);
}

function highlightMatches(text, key, matches) {
  if (!text || !matches || matches.length === 0) return text;

  const keyMatches = matches.filter(m => m.key === key);
  if (keyMatches.length === 0 || !keyMatches[0].indices?.length) return text;

  const allIndices = keyMatches.flatMap(m => m.indices).sort((a, b) => a[0] - b[0]);
  const mergedIndices = [];

  let current = [...allIndices[0]];
  for (let i = 1; i < allIndices.length; i++) {
    const next = allIndices[i];
    if (next[0] <= current[1] + 1) {
      current[1] = Math.max(current[1], next[1]);
    } else {
      mergedIndices.push(current);
      current = [...next];
    }
  }
  mergedIndices.push(current);

  let highlightedText = '';
  let lastIndex = 0;
  mergedIndices.forEach(([start, end]) => {
    highlightedText += text.substring(lastIndex, start);
    highlightedText += `<span class="highlight">${text.substring(start, end + 1)}</span>`;
    lastIndex = end + 1;
  });

  highlightedText += text.substring(lastIndex);
  return highlightedText;
}

function extractIndustry(tags = []) {
  const industryTag = tags.find(tag => typeof tag === 'string' && tag.startsWith('industry:'));
  return industryTag ? industryTag.replace('industry:', '') : 'General';
}

function getCardSummary(material) {
  if (typeof material.summary === 'string' && material.summary.trim()) return material.summary.trim();
  if (typeof material.description === 'string' && material.description.trim()) {
    return material.description.trim().split('. ')[0].slice(0, 180);
  }
  return 'Structured material profile available in detailed dossier view.';
}

function getQuickSignals(material) {
  const signals = [];
  const candidatePaths = [
    ['Class', material.identification?.class],
    ['Domain', extractIndustry(material.tags || [])],
    ['Density', material.mechanical_properties?.density_g_cm3],
    ['Bandgap', material.electrical_properties?.band_gap],
    ['Thermal Conductivity', material.thermal_properties?.thermal_conductivity]
  ];

  candidatePaths.forEach(([label, value]) => {
    if (value && signals.length < 2) {
      const normalized = typeof value === 'object' && value.value !== undefined
        ? `${value.value}${value.unit ? ` ${value.unit}` : ''}`
        : String(value);
      signals.push({ label, value: normalized });
    }
  });

  return signals;
}

function render(fuseResults) {
  const resultsContainer = document.getElementById('results');
  if (!resultsContainer) return;

  const materialsExist = Array.isArray(fuseResults) && fuseResults.length > 0;
  if (materialsExist || hasPerformedSearch) resultsContainer.innerHTML = '';

  if (!materialsExist) return;

  const fragment = document.createDocumentFragment();

  fuseResults.forEach(result => {
    const material = result.item;
    const matches = result.matches || [];
    if (!material?.name?.trim()) return;

    const name = material.name;
    const formula = material.formula || 'N/A';
    const category = material.category || 'Uncategorized';
    const tags = Array.isArray(material.tags) ? material.tags.filter(Boolean) : [];
    const displayTags = tags.filter(t => !t.startsWith('industry:')).slice(0, 4);
    const quickSignals = getQuickSignals(material);

    const card = document.createElement('article');
    card.className = 'material-card';
    card.dataset.materialName = name;
    card.dataset.category = category;
    card.dataset.industry = extractIndustry(tags);

    card.innerHTML = `
      <header class="material-card-header">
        <h3 class="material-card-title">${highlightMatches(name, 'name', matches)}</h3>
        <p class="material-card-formula" data-field="formula"><span class="field-label">Formula</span><code>${highlightMatches(formula, 'formula', matches)}</code></p>
      </header>
      <div class="material-card-meta">
        <p data-field="category"><span class="field-label">Category</span><span>${highlightMatches(category, 'category', matches)}</span></p>
        <p data-field="industry"><span class="field-label">Industry</span><span>${extractIndustry(tags)}</span></p>
      </div>
      <p class="material-card-summary">${getCardSummary(material)}</p>
      ${quickSignals.length ? `<dl class="quick-signals">${quickSignals.map(signal => `<div class="signal" data-signal="${signal.label}"><dt>${signal.label}</dt><dd>${signal.value}</dd></div>`).join('')}</dl>` : ''}
      <div class="tags" data-field="tags">${displayTags.map(tag => `<span class="tag">${highlightMatches(tag, 'tags', matches)}</span>`).join(' ')}</div>
    `;

    fragment.appendChild(card);
  });

  resultsContainer.appendChild(fragment);
}

function showSuggestions(query) {
  const suggestionsList = document.getElementById('suggestions');
  if (!suggestionsList || !fuse) return;

  suggestionsList.innerHTML = '';
  const results = fuse.search(query, { limit: 8, includeMatches: true });

  if (results.length === 0 && query.length > 0) {
    suggestionsList.innerHTML = "<li class='disabled'>No indexed materials match this query.</li>";
    return;
  }

  results.forEach(result => {
    if (!result.item?.name) return;
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.innerHTML = highlightMatches(result.item.name, 'name', result.matches || []);
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = result.item.name;
      suggestionsList.innerHTML = '';
      performSearch(result.item.name);
    });
    suggestionsList.appendChild(li);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initializeDatabase();

  const searchInput = document.getElementById('searchInput');
  const suggestionsList = document.getElementById('suggestions');
  const resultsContainer = document.getElementById('results');

  const industryFilter = document.getElementById('industryFilter');
  const categoryFilter = document.getElementById('categoryFilter');
  const propertyFilter = document.getElementById('propertyFilter');

  if (searchInput && suggestionsList) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim();
      if (query.length > 1) {
        showSuggestions(query);
      } else {
        suggestionsList.innerHTML = '';
        if (query === '' && hasPerformedSearch) {
          performSearch('');
        }
      }
    });

    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        suggestionsList.innerHTML = '';
        performSearch(searchInput.value);
      } else if (event.key === 'Tab') {
        const firstSuggestion = suggestionsList.querySelector('li:not(.disabled)');
        if (firstSuggestion) {
          event.preventDefault();
          searchInput.value = firstSuggestion.textContent;
          suggestionsList.innerHTML = '';
        }
      }
    });

    searchInput.addEventListener('focusout', (event) => {
      if (!suggestionsList.contains(event.relatedTarget)) {
        setTimeout(() => {
          if (document.activeElement !== searchInput && !suggestionsList.contains(document.activeElement)) {
            suggestionsList.innerHTML = '';
          }
        }, 100);
      }
    });
  }

  [industryFilter, categoryFilter, propertyFilter].forEach(filterElement => {
    filterElement?.addEventListener('change', () => {
      performSearch(searchInput ? searchInput.value : '');
    });
  });

  resultsContainer?.addEventListener('click', (event) => {
    const card = event.target.closest('.material-card');
    const tag = event.target.closest('.tag');

    if (tag) {
      const clickedTag = tag.textContent.trim();
      if (propertyFilter && [...propertyFilter.options].some(opt => opt.value === clickedTag)) {
        propertyFilter.value = clickedTag;
        performSearch(searchInput ? searchInput.value : '');
      }
      return;
    }

    if (card?.dataset.materialName) {
      const encodedMaterialName = encodeURIComponent(card.dataset.materialName);
      window.location.href = `material_detail.html?material=${encodedMaterialName}`;
    }
  });
});
