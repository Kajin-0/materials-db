// ============================================
// Global Variables
// ============================================
let materials = []; // Holds combined data
let fuse; // Fuse.js instance

// ============================================
// Core Functions (Define First)
// ============================================

// --- Data Loading ---
async function fetchJson(url) {
  // ... (Keep fetchJson function exactly as in the previous correct version) ...
  console.log(`Attempting to fetch: ${url}`);
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
    try {
        const data = await response.json();
        if (url.endsWith('materials-index.json')) {
             if (!data || typeof data !== 'object' || !Array.isArray(data.sources)) {
                 console.error(`Data format error: ${url} MUST be an object like { "sources": [...] }. Received:`, data);
                 return null;
             }
        } else {
             if (!Array.isArray(data)) {
                 console.error(`Data format error: ${url} MUST be a JSON array [...]. Received:`, data);
                 return null;
             }
        }
        console.log(`Successfully fetched and validated: ${url}`);
        return data;
    } catch (parseError) {
        console.error(`JSON Parse Error in ${url}:`, parseError);
        return null;
    }
  } catch (networkError) {
    console.error(`Network Error fetching ${url}:`, networkError);
    return null;
  }
}

async function loadMaterials() {
  console.log("loadMaterials called.");
  // List of files to load (ensure this matches your available files)
  const files = [
    'materials-b.json', 'materials-c.json', 'materials-f.json', 'materials-g.json',
    'materials-i.json', 'materials-l.json', 'materials-m.json', 'materials-n.json',
    'materials-o.json', 'materials-p.json', 'materials-r.json', 'materials-s.json',
    'materials-t.json', 'materials-x.json', 'materials-y.json', 'materials-z.json'
  ];
  const promises = files.map(file => fetchJson(`data/${file}`)); // Use relative path

  return Promise.all(promises).then(results => {
      const loaded = results.filter(data => data !== null).flat();
      console.log(`loadMaterials finished. Loaded ${loaded.length} entries.`);
      return loaded; // Return the flattened, filtered array
  }).catch(error => {
      // This catch might be less likely if fetchJson handles errors, but good practice
      console.error("Error in Promise.all for loadMaterials:", error);
      return []; // Return empty array on major failure
  });
}

// --- Search Index ---
function initializeSearchIndex() {
  if (!materials || materials.length === 0) {
      console.warn("Attempted to initialize search index with no material data.");
      return false; // Indicate failure
  }
  try {
      fuse = new Fuse(materials, {
        keys: ['name', 'formula', 'synonyms', 'tags'],
        threshold: 0.3,
        ignoreLocation: true
      });
      console.log("Fuse search index initialized.");
      return true; // Indicate success
  } catch (error) {
      console.error("Error initializing Fuse.js:", error);
      return false; // Indicate failure
  }
}

// --- UI Updates ---
function updateLoadingMessage(message, isError = false) {
    const resultsContainer = document.getElementById("results");
    if (!resultsContainer) return;
    if (message) {
        resultsContainer.innerHTML = `<p style="text-align: center; color: ${isError ? 'red' : '#777'};">${message}</p>`;
    } else {
         if (!resultsContainer.querySelector('p[style*="color: red"]')) {
            resultsContainer.innerHTML = '';
         }
    }
}

function disableFilters() {
    try {
        document.getElementById("industryFilter").disabled = true;
        document.getElementById("categoryFilter").disabled = true;
        document.getElementById("propertyFilter").disabled = true;
        console.log("Filters disabled.");
    } catch (e) { /* Ignore */ }
}

function populateFilterOptions() {
  const toolbar = document.getElementById("toolbar");
  if (!toolbar) { console.error("Toolbar element not found."); return false; }
  toolbar.innerHTML = "";
  const taxonomy = window.tagTaxonomy;
  if (!taxonomy) { console.error("tagTaxonomy not found."); return false; }

  console.log("Populating filters...");
  try {
      for (const prefix in taxonomy) {
        if (!Object.hasOwnProperty.call(taxonomy, prefix)) continue;
        const group = taxonomy[prefix];
        if (!group || typeof group !== 'object' || !group.label || !Array.isArray(group.tags)) continue;

        const div = document.createElement("div"); div.className = "filter-group";
        const label = document.createElement("label"); label.setAttribute("for", `${prefix}Filter`); label.textContent = group.label + ":"; div.appendChild(label);
        const select = document.createElement("select"); select.id = `${prefix}Filter`;
        const allOption = document.createElement("option"); allOption.value = ""; allOption.textContent = "All"; select.appendChild(allOption);

        group.tags.forEach(tag => {
          if (typeof tag !== 'string') return;
          const option = document.createElement("option"); option.value = `${prefix}:${tag}`; option.textContent = tag.replace(/_/g, " "); select.appendChild(option);
        });

        select.addEventListener("change", performSearch); // Attach listener
        div.appendChild(select);
        toolbar.appendChild(div);
      }
      console.log("Filter options populated.");
      return true; // Indicate success
  } catch (error) {
      console.error("Error populating filters:", error);
      return false; // Indicate failure
  }
}

function displayResults(results) {
  const resultsContainer = document.getElementById("results");
  const summaryElement = document.getElementById("result-summary");
  if (!resultsContainer || !summaryElement) { console.error("Cannot display results: #results or #result-summary element missing."); return; }

  resultsContainer.innerHTML = "";
  summaryElement.textContent = `${results ? results.length : 0} material(s) found`;

  if (!results || results.length === 0) { console.log("Display Results: No materials."); return; }

  console.log(`Display Results: Rendering ${results.length} cards.`);
  const fragment = document.createDocumentFragment();
  results.forEach(mat => {
    const card = document.createElement("div"); card.className = "material-card";
    const title = document.createElement("h2"); title.textContent = mat.name || "N/A"; card.appendChild(title);

    if (mat.formula) { const formula = document.createElement("p"); formula.innerHTML = `<strong>Formula:</strong> ${mat.formula}`; card.appendChild(formula); }

    if (Array.isArray(mat.tags) && mat.tags.length > 0) {
      const tagContainer = document.createElement("div"); tagContainer.className = "tags";
      mat.tags.forEach(tag => {
        if (typeof tag !== 'string') return;
        const span = document.createElement("span"); span.className = "tag";
        const displayTag = tag.split(":")[1]?.replace(/_/g, " ") ?? tag;
        span.textContent = displayTag; span.title = tag; // Show full tag on hover
        span.addEventListener("click", () => {
          const input = document.getElementById("searchInput"); if (input) input.value = "";
          performSearchWithTag(tag); // Use separate function for tag click
        });
        tagContainer.appendChild(span);
      });
      card.appendChild(tagContainer);
    }
    fragment.appendChild(card);
  });
  resultsContainer.appendChild(fragment);
}

// --- Search & Filtering Logic ---
function getActiveFilters() {
  const taxonomy = window.tagTaxonomy; const active = [];
  if (!taxonomy) return active;
  for (const prefix in taxonomy) {
     if (!Object.hasOwnProperty.call(taxonomy, prefix)) continue;
    const filterElement = document.getElementById(`${prefix}Filter`);
    const value = filterElement?.value;
    if (value) active.push(value);
  }
  return active; // No need to log here every time
}

function matchesFilters(material, filters) {
  if (!material || !Array.isArray(material.tags)) return false;
  return filters.every(filter => material.tags.includes(filter));
}

function performSearch() {
  console.log("Performing search..."); // Log start of search
  const searchInput = document.getElementById("searchInput");
  const query = searchInput ? searchInput.value.trim() : "";
  const activeFilters = getActiveFilters();
  console.log(`Query: "${query}", Active Filters:`, activeFilters);

  let results = [];
  if (!fuse || !materials) { console.warn("Search called before ready."); displayResults([]); return; }

  if (query === "") { results = [...materials]; }
  else { const fuseResults = fuse.search(query); results = fuseResults.map(result => result.item); }
  console.log(`Initial results (from query/all): ${results.length}`);

  if (activeFilters.length > 0) {
    const countBefore = results.length;
    results = results.filter(m => matchesFilters(m, activeFilters));
    console.log(`Filtered results (from ${countBefore}): ${results.length}`);
  }

  displayResults(results);
}

function performSearchWithTag(tag) {
  console.log(`Applying tag filter: ${tag}`);
  if (typeof tag !== 'string' || !tag.includes(':')) { console.warn(`Invalid tag: ${tag}`); return; }
  const [prefix] = tag.split(":");
  const filterElement = document.getElementById(`${prefix}Filter`);
  if (filterElement) {
    if ([...filterElement.options].some(opt => opt.value === tag)) {
        filterElement.value = tag;
        console.log(`Set ${prefix}Filter value to ${tag}`);
        performSearch(); // Re-run search
    } else { console.warn(`Option value "${tag}" not found in ${prefix}Filter.`); }
  } else { console.warn(`Filter dropdown element not found for prefix: ${prefix}`); }
}

// --- Suggestions ---
function initSuggestions() {
  const input = document.getElementById("searchInput");
  const suggestions = document.getElementById("suggestions");
  if (!input || !suggestions) { console.error("Cannot init suggestions: Elements missing."); return; }

  input.addEventListener("input", () => {
    if (!materials || materials.length === 0) { suggestions.innerHTML = ""; return; }
    const query = input.value.trim().toLowerCase();
    if (!query) { suggestions.innerHTML = ""; return; }

    // Simple includes-based suggestion
    const matches = materials.filter(m =>
      (m.name && m.name.toLowerCase().includes(query)) ||
      (m.formula && m.formula.toLowerCase().includes(query)) ||
      (m.synonyms && Array.isArray(m.synonyms) && m.synonyms.some(s => typeof s === 'string' && s.toLowerCase().includes(query)))
    ).slice(0, 8);

    suggestions.innerHTML = "";
    matches.forEach(m => {
      const li = document.createElement("li");
      li.textContent = `${m.name || 'N/A'} (${m.formula || 'N/A'})`;
      li.addEventListener("mousedown", () => { // Use mousedown
        input.value = m.name || '';
        suggestions.innerHTML = "";
        performSearch(); // Trigger search on select
      });
      suggestions.appendChild(li);
    });
  });
  console.log("Suggestions initialized.");
}

// ============================================
// Initialization Sequence (Runs on DOM Load)
// ============================================
document.addEventListener("DOMContentLoaded", async () => { // Make listener async
  console.log("DOM content loaded. Starting initialization...");

  // Attach logo listener immediately if element exists
  const logoElement = document.getElementById("logo");
  if (logoElement) {
      logoElement.addEventListener("click", () => location.reload());
      console.log("Logo click listener attached.");
  } else {
      console.warn("Logo element not found.");
  }

  // Get essential UI elements early
  const searchInput = document.getElementById("searchInput");
  const suggestionsList = document.getElementById("suggestions");
  const resultsContainer = document.getElementById("results");
  const industryFilter = document.getElementById("industryFilter"); // Used later, but check existence
  const categoryFilter = document.getElementById("categoryFilter");
  const propertyFilter = document.getElementById("propertyFilter");

  if (!searchInput || !suggestionsList || !resultsContainer || !industryFilter || !categoryFilter || !propertyFilter) {
      console.error("Essential DOM element(s) missing. Aborting initialization.");
      updateLoadingMessage("Error: Page structure incorrect. Cannot initialize.", true);
      return;
  }

  // Start data loading sequence
  updateLoadingMessage("Loading materials...");
  try {
      materials = await loadMaterials(); // Wait for materials
      console.log(`Material loading complete. ${materials.length} entries loaded.`);

      if (materials.length === 0) {
          throw new Error("No material data loaded successfully."); // Treat as error
      }

      // Initialize search and UI elements only after data is loaded
      updateLoadingMessage("Initializing search index...");
      if (!initializeSearchIndex()) { // Check if fuse init failed
          throw new Error("Failed to initialize search index.");
      }

      updateLoadingMessage("Populating filters...");
      if (!populateFilterOptions()) { // Check if filter populating failed
           throw new Error("Failed to populate filters.");
      }

      updateLoadingMessage("Initializing suggestions...");
      initSuggestions();

      updateLoadingMessage(""); // Clear loading message
      performSearch(); // Perform initial search
      console.log("Initialization sequence complete.");

  } catch (error) {
      // Catch errors from await loadMaterials() or subsequent steps
      console.error("Error during initialization sequence:", error);
      updateLoadingMessage(error.message || "Critical failure during loading. Check console.", true);
      disableFilters(); // Ensure filters remain disabled on error
  }

  // --- Setup Event Listeners (Attach AFTER elements are confirmed to exist) ---
  // These were checked at the start of the listener, safe to attach now
  searchInput.addEventListener("input", () => {
    // Note: The 'input' listener is duplicated here and in initSuggestions.
    // Keep the one in initSuggestions as it has more checks. Remove this one.
  });
  searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); suggestionsList.innerHTML = ""; performSearch(searchInput.value.trim()); }
  });
  searchInput.addEventListener("blur", () => { setTimeout(() => { if (document.activeElement !== searchInput) suggestionsList.innerHTML = ""; }, 150); });
   searchInput.addEventListener("focus", () => { if (searchInput.value.trim()) showSuggestions(searchInput.value.trim()); }); // Use showSuggestions here

  industryFilter.addEventListener("change", () => performSearch(searchInput.value.trim()));
  categoryFilter.addEventListener("change", () => performSearch(searchInput.value.trim()));
  propertyFilter.addEventListener("change", () => performSearch(searchInput.value.trim()));

  resultsContainer.addEventListener("click", (event) => { // Tag click listener
    if (event.target.classList.contains("tag")) {
      performSearchWithTag(event.target.title); // Use the full tag stored in title attribute
    }
  });

});

console.log("app.js script successfully parsed."); // Log end of script parsing
