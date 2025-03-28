// Global variables
let allMaterialsData = []; // Holds combined data
let fuse; // Fuse.js instance

// --- Core Data Loading ---

// Fetches and parses a single JSON file
async function fetchJson(url) {
  console.log(`Attempting to fetch: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Source file not found (404): ${url}`); // Expected for non-existent files
      } else {
        console.error(`Fetch Error for ${url}: ${response.status} ${response.statusText}`);
      }
      return null;
    }
    try {
        const data = await response.json();
        // Check structure: index must be object with sources array, others must be arrays
        if (url.endsWith('materials-index.json')) {
             if (!data || !data.sources || !Array.isArray(data.sources)) {
                 console.error(`Data format error: ${url} missing { "sources": [...] } structure.`);
                 return null;
             }
        } else {
             if (!Array.isArray(data)) {
                 console.error(`Data format error: ${url} is not a JSON array.`);
                 return null;
             }
        }
        console.log(`Successfully fetched and parsed: ${url}`);
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

// Loads index, fetches all sources, initializes Fuse.js and UI
async function initializeDatabase() {
  const resultsContainer = document.getElementById("results");
  updateLoadingMessage("Loading material index...");
  console.log("Initializing database...");

  // Use relative path, standard for files served from same origin/directory structure
  const indexUrl = './data/materials-index.json';
  const indexData = await fetchJson(indexUrl);

  if (!indexData) { // fetchJson handles validation and returns null on error/bad format
    console.error(`Failed to load or invalid format for index: ${indexUrl}`);
    updateLoadingMessage(`Error: Could not load material index (${indexUrl}). Check console.`, true);
    disableFilters();
    return;
  }

  updateLoadingMessage(`Loading ${indexData.sources.length} source files...`);
  console.log("Index loaded. Sources:", indexData.sources);

  // Fetch source files using relative paths
  const fetchPromises = indexData.sources
      .filter(sourceFile => typeof sourceFile === 'string' && sourceFile.endsWith('.json'))
      .map(sourceFile => fetchJson(`./data/${sourceFile}`)); // Relative path within data folder

  if (fetchPromises.length !== indexData.sources.length) {
      console.warn("Some entries in materials-index.json sources were invalid filenames.");
  }
  if (fetchPromises.length === 0) {
      console.error("No valid source files listed in materials-index.json.");
      updateLoadingMessage("Error: No valid source files found in index. Check console.", true);
      disableFilters();
      return;
  }

  try {
    const results = await Promise.all(fetchPromises);
    allMaterialsData = results.filter(data => data !== null).flat(); // Filter nulls (errors) before flattening

    console.log(`Total materials loaded: ${allMaterialsData.length}`);

    if (allMaterialsData.length === 0) {
      console.error("Failed to load any valid material data from source files.");
      updateLoadingMessage("Error: No material data loaded. Check source files and console.", true);
      disableFilters();
      return;
    }

    updateLoadingMessage("Initializing search index...");
    try {
        fuse = new Fuse(allMaterialsData, {
          keys: ["name", "formula", "synonyms", "tags"],
          threshold: 0.3, includeScore: true, ignoreLocation: true,
        });
        console.log("Fuse.js initialized successfully.");
    } catch (fuseError) {
        console.error("Error initializing Fuse.js:", fuseError);
        updateLoadingMessage("Error: Failed to initialize search index. Check console.", true);
        disableFilters(); return;
    }

    updateLoadingMessage("Updating filters...");
    updateFilters(allMaterialsData);

    updateLoadingMessage(""); // Clear loading
    performSearch(""); // Initial display
    console.log("Database initialization complete.");

  } catch (error) {
    console.error("Unexpected error during source file processing:", error);
    updateLoadingMessage("Error: Failed to process material data. Check console.", true);
    disableFilters();
  }
}

// --- UI and Filtering ---

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
    } catch (e) { /* Ignore if elements don't exist */ }
}

function updateFilters(materials) {
  try {
      const industrySelect = document.getElementById("industryFilter");
      const categorySelect = document.getElementById("categoryFilter");
      const propertySelect = document.getElementById("propertyFilter");
      if (!industrySelect || !categorySelect || !propertySelect) return;

      industrySelect.disabled = false; categorySelect.disabled = false; propertySelect.disabled = false;

      const industries = [...new Set(materials.flatMap(m => (m.tags || []).filter(t => typeof t === 'string' && t.startsWith("industry:")).map(t => t.replace("industry:", ""))))].sort();
      const categories = [...new Set(materials.map(m => m.category).filter(Boolean))].sort();
      const tags = [...new Set(materials.flatMap(m => (m.tags || []).filter(t => typeof t === 'string' && !t.startsWith("industry:"))))].sort();

      function fill(sel, items) {
        sel.innerHTML = "<option value=''>All</option>" + items.map(i => `<option value="${i}">${i}</option>`).join("");
      }
      fill(industrySelect, industries); fill(categorySelect, categories); fill(propertySelect, tags);
      console.log("Filters updated.");
  } catch (error) {
      console.error("Error updating filters:", error);
      updateLoadingMessage("Error: Failed to update filters. Check console.", true);
      disableFilters();
  }
}

function performSearch(query) {
  console.log(`Performing search. Query: "${query}"`);
  const resultsContainer = document.getElementById("results");

  if (!fuse) {
    console.warn("Search attempted before Fuse was ready.");
    if (resultsContainer && !resultsContainer.querySelector('p[style*="color: red"]')) {
        updateLoadingMessage("Database loading...", false);
    }
    return;
  }

  const industry = document.getElementById("industryFilter")?.value || "";
  const category = document.getElementById("categoryFilter")?.value || "";
  const tag = document.getElementById("propertyFilter")?.value || "";
  const toolbar = document.getElementById("toolbar");

  if (toolbar) toolbar.classList.toggle("active", query.trim() !== "" || industry || category || tag);

  let results = query.trim() === "" ? allMaterialsData : fuse.search(query).map(x => x.item);
  if (industry) results = results.filter(m => m.tags?.includes("industry:" + industry));
  if (category) results = results.filter(m => m.category === category);
  if (tag) results = results.filter(m => m.tags?.includes(tag));

  console.log(`Search/filter resulted in ${results.length} materials.`);
  render(results);
}

function render(materials) {
  const out = document.getElementById("results");
  if (!out) return;
  out.innerHTML = "";

  if (!materials || materials.length === 0) {
    console.log("Render: No materials."); return; // CSS handles message
  }

  console.log(`Render: Displaying ${materials.length} cards.`);
  const fragment = document.createDocumentFragment();
  for (const m of materials) {
    const el = document.createElement("div");
    el.className = "material-card";
    const name = m.name || 'N/A'; const formula = m.formula || 'N/A'; const category = m.category || 'N/A';
    const tagsHtml = Array.isArray(m.tags) ? m.tags.filter(t => typeof t === 'string').map(t => `<span class='tag'>${t}</span>`).join(" ") : '';
    el.innerHTML = `<h2>${name}</h2><p><strong>Formula:</strong> ${formula}</p><p><strong>Category:</strong> ${category}</p><div class="tags">${tagsHtml}</div>`;
    fragment.appendChild(el);
  }
  out.appendChild(fragment);
}

function showSuggestions(query) {
    const ul = document.getElementById("suggestions");
    if (!ul || !fuse) return;
    ul.innerHTML = "";

    try {
        const results = fuse.search(query, { limit: 8 });
        results.map(x => x.item).forEach(item => {
            if (!item?.name) return;
            const li = document.createElement("li");
            li.textContent = item.name;
            li.addEventListener("mousedown", (e) => {
                e.preventDefault();
                document.getElementById("searchInput").value = item.name;
                ul.innerHTML = ""; performSearch(item.name);
            });
            ul.appendChild(li);
        });
    } catch (error) { console.error("Error generating suggestions:", error); }
}

// --- Event Listeners Setup ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded. Initializing database...");
  initializeDatabase();

  // Get elements, check for existence
  const searchInput = document.getElementById("searchInput");
  const suggestionsList = document.getElementById("suggestions");
  const resultsContainer = document.getElementById("results");
  const industryFilter = document.getElementById("industryFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const propertyFilter = document.getElementById("propertyFilter");

  if (!searchInput || !suggestionsList || !resultsContainer || !industryFilter || !categoryFilter || !propertyFilter) {
      console.error("Essential DOM element(s) missing. Aborting listener setup.");
      updateLoadingMessage("Error: Page structure incorrect.", true); return;
  }

  // Setup listeners
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    if (query) showSuggestions(query); else { suggestionsList.innerHTML = ""; performSearch(""); }
  });
  searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); suggestionsList.innerHTML = ""; performSearch(searchInput.value.trim()); }
  });
  searchInput.addEventListener("blur", () => { setTimeout(() => { if (document.activeElement !== searchInput) suggestionsList.innerHTML = ""; }, 150); });
  searchInput.addEventListener("focus", () => { if (searchInput.value.trim()) showSuggestions(searchInput.value.trim()); });

  industryFilter.addEventListener("change", () => performSearch(searchInput.value.trim()));
  categoryFilter.addEventListener("change", () => performSearch(searchInput.value.trim()));
  propertyFilter.addEventListener("change", () => performSearch(searchInput.value.trim()));

  resultsContainer.addEventListener("click", (event) => {
    if (event.target.classList.contains("tag")) {
      const clickedTag = event.target.textContent;
      console.log("Tag clicked:", clickedTag);
      const industryPrefix = "industry:"; let searchTriggered = false;

      if (clickedTag.startsWith(industryPrefix)) {
        const industry = clickedTag.substring(industryPrefix.length);
        if ([...industryFilter.options].some(opt => opt.value === industry)) {
             if (industryFilter.value !== industry) { industryFilter.value = industry; searchTriggered = true; }
             if (propertyFilter.value !== "") { propertyFilter.value = ""; searchTriggered = true; }
        } else { console.warn(`Industry filter option not found: ${industry}`); }
      } else {
        if ([...propertyFilter.options].some(opt => opt.value === clickedTag)) {
            if (propertyFilter.value !== clickedTag) { propertyFilter.value = clickedTag; searchTriggered = true; }
            if (industryFilter.value !== "") { industryFilter.value = ""; searchTriggered = true; }
        } else { console.warn(`Property filter option not found: ${clickedTag}`); }
      }
      if (searchTriggered) performSearch(searchInput.value.trim());
    }
  });
});
