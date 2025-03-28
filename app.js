
let materials = [];
let fuse;
let filters = {
  industry: [],
  class: [],
  prop: [],
  proc: [],
  app: [],
  env: [],
  domain: [],
  element: []
};
let activeTags = [];

function loadMaterials() {
  const files = [
    'materials-b.json', 'materials-c.json', 'materials-f.json', 'materials-g.json',
    'materials-i.json', 'materials-l.json', 'materials-m.json', 'materials-n.json',
    'materials-o.json', 'materials-p.json', 'materials-r.json', 'materials-s.json',
    'materials-t.json', 'materials-x.json', 'materials-y.json', 'materials-z.json'
  ];
  const promises = files.map(file =>
    fetch(`data/${file}`)
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) throw new Error(`Data format error in ${file}`);
        return data;
      })
  );
  return Promise.all(promises).then(results => results.flat());
}

function initializeSearchIndex() {
  fuse = new Fuse(materials, {
    keys: ['name', 'formula', 'synonyms', 'tags'],
    threshold: 0.3
  });
}

function populateFilterOptions() {
  const toolbar = document.getElementById("toolbar");
  toolbar.innerHTML = "";
  const taxonomy = window.tagTaxonomy;

  for (const prefix in taxonomy) {
    const group = taxonomy[prefix];
    const div = document.createElement("div");
    div.className = "filter-group";

    const label = document.createElement("label");
    label.textContent = group.label + ":";
    div.appendChild(label);

    const select = document.createElement("select");
    select.id = `${prefix}Filter`;

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All";
    select.appendChild(allOption);

    group.tags.forEach(tag => {
      const option = document.createElement("option");
      option.value = `${prefix}:${tag}`;
      option.textContent = tag.replace(/_/g, " ");
      select.appendChild(option);
    });

    select.addEventListener("change", performSearch);
    div.appendChild(select);
    toolbar.appendChild(div);
  }
}

function getActiveFilters() {
  const taxonomy = window.tagTaxonomy;
  const active = [];
  for (const prefix in taxonomy) {
    const value = document.getElementById(`${prefix}Filter`)?.value;
    if (value) active.push(value);
  }
  return active;
}

function matchesFilters(material, filters) {
  return filters.every(filter => material.tags.includes(filter));
}

function performSearch() {
  const query = document.getElementById("searchInput").value.trim();
  const activeFilters = getActiveFilters();

  let results = query
    ? fuse.search(query).map(result => result.item)
    : [...materials];

  if (activeFilters.length > 0) {
    results = results.filter(m => matchesFilters(m, activeFilters));
  }

  displayResults(results);
}

function displayResults(results) {
  const resultsContainer = document.getElementById("results");
  const summary = document.getElementById("result-summary");
  resultsContainer.innerHTML = "";
  summary.textContent = `${results.length} materials found`;

  results.forEach(mat => {
    const card = document.createElement("div");
    card.className = "material-card";

    const title = document.createElement("h2");
    title.textContent = mat.name;
    card.appendChild(title);

    const formula = document.createElement("p");
    formula.textContent = mat.formula;
    card.appendChild(formula);

    if (mat.tags?.length) {
      const tagContainer = document.createElement("div");
      tagContainer.className = "tags";

      mat.tags.forEach(tag => {
        const span = document.createElement("span");
        span.className = "tag";
        // Hide prefixes in display but keep in logic
        span.textContent = tag.split(":")[1]?.replace(/_/g, " ") ?? tag;
        span.title = span.textContent;
        span.onclick = () => {
          const input = document.getElementById("searchInput");
          input.value = "";
          performSearchWithTag(tag);
        };
        tagContainer.appendChild(span);
      });

      card.appendChild(tagContainer);
    }

    resultsContainer.appendChild(card);
  });
}

function performSearchWithTag(tag) {
  const [prefix, value] = tag.split(":");
  const filterElement = document.getElementById(`${prefix}Filter`);
  if (filterElement) {
    filterElement.value = tag;
  }
  performSearch();
}

function initSuggestions() {
  const input = document.getElementById("searchInput");
  const suggestions = document.getElementById("suggestions");

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      suggestions.innerHTML = "";
      return;
    }

    const matches = materials.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.formula.toLowerCase().includes(query) ||
      (m.synonyms || []).some(s => s.toLowerCase().includes(query))
    ).slice(0, 10);

    suggestions.innerHTML = "";
    matches.forEach(m => {
      const li = document.createElement("li");
      li.textContent = `${m.name} (${m.formula})`;
      li.onclick = () => {
        input.value = m.name;
        suggestions.innerHTML = "";
        performSearch();
      };
      suggestions.appendChild(li);
    });
  });
}

document.getElementById("logo").addEventListener("click", () => location.reload());

loadMaterials().then(data => {
  materials = data;
  initializeSearchIndex();
  populateFilterOptions();
  initSuggestions();
  performSearch();
});
