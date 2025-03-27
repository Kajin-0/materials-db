// Constants for DOM elements
const DOM = {
  searchInput: document.getElementById("searchInput"),
  suggestions: document.getElementById("suggestions"),
  toolbar: document.getElementById("toolbar"),
  industryFilter: document.getElementById("industryFilter"),
  categoryFilter: document.getElementById("categoryFilter"),
  propertyFilter: document.getElementById("propertyFilter"),
  results: document.getElementById("results"),
};

// State
let indexData = [];
let fuse;

// Load index data with error handling
async function loadIndex() {
  try {
    const res = await fetch("data/materials-index.json");
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    indexData = await res.json();

    fuse = new Fuse(indexData, {
      keys: ["name", "formula", "synonyms"],
      threshold: 0.3,
      includeScore: true,
    });

    updateFilters(indexData);
  } catch (error) {
    console.error("Failed to load index:", error);
    DOM.results.innerHTML = "<p>Error loading materials. Please try again later.</p>";
  }
}

// Update filter dropdowns
function updateFilters(materials) {
  const getUnique = (arr) => [...new Set(arr)].sort();
  const industries = getUnique(
    materials.flatMap((m) => (m.tags || []).filter((t) => t.startsWith("industry:")).map((t) => t.replace("industry:", "")))
  );
  const categories = getUnique(materials.map((m) => m.category));
  const tags = getUnique(materials.flatMap((m) => (m.tags || []).filter((t) => !t.startsWith("industry:"))));

  const fillSelect = (select, items) => {
    select.innerHTML = "<option value=''>All</option>" + items.map((item) => `<option value="${item}">${item}</option>`).join("");
  };

  fillSelect(DOM.industryFilter, industries);
  fillSelect(DOM.categoryFilter, categories);
  fillSelect(DOM.propertyFilter, tags);
}

// Fetch materials by file
async function loadMaterialsByFiles(files) {
  const uniqueFiles = [...new Set(files)];
  const promises = uniqueFiles.map(async (file) => {
    const res = await fetch(`data/${file}`);
    if (!res.ok) throw new Error(`Failed to load ${file}`);
    return res.json();
  });
  return (await Promise.all(promises)).flat();
}

// Perform search with filters
function performSearch(query) {
  const filters = {
    industry: DOM.industryFilter.value,
    category: DOM.categoryFilter.value,
    tag: DOM.propertyFilter.value,
  };

  DOM.toolbar.classList.toggle("active", !!query);
  DOM.suggestions.innerHTML = "";

  if (!query) {
    render([]);
    return;
  }

  let results = fuse.search(query).map((x) => x.item);
  results = results.filter(
    (m) =>
      (!filters.industry || m.tags.includes(`industry:${filters.industry}`)) &&
      (!filters.category || m.category === filters.category) &&
      (!filters.tag || m.tags.includes(filters.tag))
  );

  if (!results.length) {
    render([]);
    return;
  }

  const neededFiles = [...new Set(results.map((m) => m.file))];
  loadMaterialsByFiles(neededFiles)
    .then((allMaterials) => {
      const shown = allMaterials.filter((m) => results.some((r) => r.name === m.name));
      render(shown);
    })
    .catch((error) => {
      console.error("Failed to load materials:", error);
      DOM.results.innerHTML = "<p>Error loading materials.</p>";
    });
}

// Render results
function render(materials) {
  DOM.results.innerHTML = materials.length
    ? materials
        .map(
          (m) => `
          <div class="material-card">
            <h2>${m.name}</h2>
            <p><strong>Formula:</strong> ${m.formula || "N/A"}</p>
            <p><strong>Category:</strong> ${m.category || "N/A"}</p>
            <div class="tags">${(m.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}</div>
          </div>
        `
        )
        .join("")
    : "<p>No materials found.</p>";
}

// Show suggestions with debouncing
function showSuggestions(query) {
  if (!query) {
    DOM.suggestions.innerHTML = "";
    return;
  }
  const suggestions = fuse.search(query, { limit: 8 }).map((x) => x.item.name);
  DOM.suggestions.innerHTML = suggestions
    .map(
      (name) => `
        <li tabindex="0" onclick="selectSuggestion('${name}')">${name}</li>
      `
    )
    .join("");
}

// Handle suggestion selection
function selectSuggestion(name) {
  DOM.searchInput.value = name;
  DOM.suggestions.innerHTML = "";
  performSearch(name);
}

// Debounce utility
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  loadIndex();

  const debouncedSuggestions = debounce((query) => showSuggestions(query), 200);

  DOM.searchInput.addEventListener("input", () => debouncedSuggestions(DOM.searchInput.value.trim()));
  DOM.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performSearch(DOM.searchInput.value.trim());
    }
  });

  DOM.headerTitle = document.querySelector(".header-title");
  DOM.headerTitle.addEventListener("click", () => window.location.reload());

  [DOM.industryFilter, DOM.categoryFilter, DOM.propertyFilter].forEach((filter) =>
    filter.addEventListener("change", () => performSearch(DOM.searchInput.value.trim()))
  );
});
