// ============================================
// Global Variables
// ============================================
let materials = []; // Holds combined data
let fuse; // Fuse.js instance

// ============================================
// Helper Functions (Define First)
// ============================================

// Robustly fetches and parses a single JSON file
async function fetchJson(url) {
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
        // Check structure based on filename
        if (url.endsWith('materials-index.json')) {
             // Index MUST be an object with a 'sources' array
             if (!data || typeof data !== 'object' || !Array.isArray(data.sources)) {
                 console.error(`Data format error: ${url} MUST be an object like { "sources": [...] }. Received:`, data);
                 return null;
             }
        } else {
             // Source files MUST be arrays
             if (!Array.isArray(data)) {
                 console.error(`Data format error: ${url} MUST be a JSON array [...]. Received:`, data);
                 return null;
             }
        }
        console.log(`Successfully fetched and validated: ${url}`);
        return data; // Return validated data

    } catch (parseError) {
        console.error(`JSON Parse Error in ${url}:`, parseError);
        return null;
    }
  } catch (networkError) {
    console.error(`Network Error fetching ${url}:`, networkError);
    return null;
  }
}

// Updates loading/status message
function updateStatusMessage(message, isError = false) {
    const summaryElement = document.getElementById("result-summary");
    if (!summaryElement) return; // Exit if element doesn't exist
    if (message) {
        summaryElement.innerHTML = `<p style="text-align: center; color: ${isError ? 'red' : '#777'};">${message}</p>`;
    } else {
        // Clear message only if it wasn't an error message previously
         if (!summaryElement.querySelector('p[style*="color: red"]')) {
            summaryElement.innerHTML = '';
         }
    }
}

// Disables filter dropdowns
function disableFilters() {
    const taxonomy = window.tagTaxonomy || {};
    for (const prefix in taxonomy) {
        if (!Object.hasOwnProperty.call(taxonomy, prefix)) continue;
        const filterElement = document.getElementById(`${prefix}Filter`);
        if (filterElement) filterElement.disabled = true;
    }
    console.log("Filters disabled.");
}

// Enables filter dropdowns
function enableFilters() {
    const taxonomy = window.tagTaxonomy || {};
    for (const prefix in taxonomy) {
         if (!Object.hasOwnProperty.call(taxonomy, prefix)) continue;
        const filterElement = document.getElementById(`${prefix}Filter`);
        if (filterElement) filterElement.disabled = false;
    }
    console.log("Filters enabled.");
}


// ============================================
// Core Logic Functions
// ============================================

// Loads all material data from specified files
async function loadMaterials() {
  console.log("loadMaterials started.");
  // updateStatusMessage("Loading materials data..."); // Message moved to caller
  // List of files to load
  const files = [
    'materials-b.json', 'materials-c.json', 'materials-f.json', 'materials-g.json',
    'materials-i.json', 'materials-l.json', 'materials-m.json', 'materials-n.json',
    'materials-o.json', 'materials-p.json', 'materials-r.json', 'materials-s.json',
    'materials-t.json', 'materials-x.json', 'materials-y.json', 'materials-z.json'
  ];
  // Use relative paths assuming 'data' folder is sibling to index.html
  const promises = files.map(file => fetchJson(`data/${file}`));

  try {
      const results = await Promise.all(promises);
      const loadedMaterials = results.filter(data => data !== null).flat();
      console.log(`loadMaterials finished. ${loadedMaterials.length} entries loaded.`);
      return loadedMaterials; // Return the combined array
  } catch (error) {
      console.error("Critical error during Promise.all in loadMaterials:", error);
      return []; // Return empty array on major failure
  }
}

// Initializes the Fuse.js search index
function initializeSearchIndex() {
  // updateStatusMessage("Initializing search index..."); // Message moved to caller
  if (!materials || materials.length === 0) {
      console.warn("Cannot initialize search index: No material data available.");
      return false;
  }
  try {
      fuse = new Fuse(materials, {
        keys: ['name', 'formula', 'synonyms', 'tags'],
        threshold: 0.3,
        ignoreLocation: true,
        includeScore: true
      });
      console.log("Fuse search index initialized successfully.");
      return true;
  } catch (error) {
      console.error("Error initializing Fuse.js:", error);
      return false;
  }
}

// Populates filter dropdowns based on tagTaxonomy.js
function populateFilterOptions() {
  // updateStatusMessage("Populating filters..."); // Message moved to caller
  const toolbar = document.getElementById("toolbar");
  const taxonomy = window.tagTaxonomy;

  if (!toolbar) { console.error("Toolbar element not found."); return false; }
  // Check moved to initializer
  // if (!taxonomy) { console.error("tagTaxonomy object not found."); return false; }

  toolbar.innerHTML = "";

  try {
      for (const prefix in taxonomy) {
        if (!Object.hasOwnProperty.call(taxonomy, prefix)) continue;

        const group = taxonomy[prefix];
        if (!group || typeof group !== 'object' || !group.label || !Array.isArray(group.tags)) {
          console.warn(`Invalid structure for taxonomy key "${prefix}". Skipping.`);
          continue;
        }

        const div = document.createElement("div"); div.className = "filter-group";
        const label = document.createElement("label"); label.setAttribute("for", `${prefix}Filter`); label.textContent = group.label + ":"; div.appendChild(label);
        const select = document.createElement("select"); select.id = `${prefix}Filter`;
        const allOption = document.createElement("option"); allOption.value = ""; allOption.textContent = "All"; select.appendChild(allOption);

        group.tags.forEach(tag => {
          if (typeof tag !== 'string') return;
          const option = document.createElement("option");
          option.value = `${prefix}:${tag}`;
          option.textContent = tag.replace(/_/g, " ");
          select.appendChild(option);
        });

        select.addEventListener("change", performSearch);
        div.appendChild(select);
        toolbar.appendChild(div);
      }
      console.log("Filter options populated successfully.");
      enableFilters();
      return true;
  } catch(error) {
      console.error("Error populating filter options:", error);
      disableFilters();
      return false;
  }
}

// Initializes the suggestion functionality USING FUSE.JS
function initSuggestions() {
  // updateStatusMessage("Initializing suggestions..."); // Optional: uncomment if needed
  const input = document.getElementById("searchInput");
  const suggestions = document.getElementById("suggestions");

  if (!input || !suggestions) { console.error("Cannot initialize suggestions: Elements missing."); return; }

  input.addEventListener("input", () => {
    // Check if fuse instance is ready
    if (!fuse) {
        console.warn("Suggestions unavailable: Fuse index not ready.");
        suggestions.innerHTML = ""; // Ensure list is clear
        return;
    }

    const query = input.value.trim(); // Use original case for Fuse search might be better
    if (!query) {
      suggestions.innerHTML = ""; // Clear if query is empty
      return;
    }

    suggestions.innerHTML = ""; // Clear previous suggestions

    // *** Use Fuse.js for suggestions ***
    try {
        const fuseResults = fuse.search(query, {
            limit: 8, // Limit number of suggestions
        });

        if (fuseResults.length > 0) {
            fuseResults.forEach(result => {
                const item = result.item;
                if (!item || !item.name) return; // Skip if item or name is invalid

                const li = document.createElement("li");
                // Display suggestion (Name + Formula)
                li.textContent = `${item.name} (${item.formula || 'N/A'})`;

                // Add event listener (use mousedown to trigger before blur)
                li.addEventListener("mousedown", () => {
                    input.value = item.name; // Set input value to the selected material name
                    suggestions.innerHTML = ""; // Hide suggestions list
                    performSearch(); // Trigger a full search based on the selected name
                });
                suggestions.appendChild(li);
            });
        } else {
             // Optional: Show "No suggestions"
             // const li = document.createElement("li");
             // li.textContent = "No suggestions found";
             // li.style.color = "#888"; li.style.cursor = "default";
             // suggestions.appendChild(li);
        }
    } catch (error) {
        console.error("Error during Fuse suggestion search:", error);
        suggestions.innerHTML = ""; // Clear on error
    }
    // *** End Fuse.js suggestion logic ***

  }); // End input event listener

  console.log("Suggestions initialized (using Fuse.js).");
}


// Retrieves active filter values from the UI
function getActiveFilters() {
  const taxonomy = window.tagTaxonomy; const active = [];
  if (!taxonomy) return active;
  for (const prefix in taxonomy) {
     if (!Object.hasOwnProperty.call(taxonomy, prefix)) continue;
    const filterElement = document.getElementById(`${prefix}Filter`);
    const value = filterElement?.value;
    if (value) active.push(value);
  }
  return active;
}

// Checks if a material object matches all provided filters
function matchesFilters(material, filters) {
  if (!material || !Array.isArray(material.tags)) return false;
  return filters.every(filter => material.tags.includes(filter));
}


// Performs the search based on query and active filters
function performSearch() {
  console.log("Performing search...");
  const searchInput = document.getElementById("searchInput");
  const query = searchInput ? searchInput.value.trim() : "";
  const activeFilters = getActiveFilters();
  console.log(`Query: "${query}", Active Filters:`, activeFilters);

  let results = [];

  if (!fuse || !materials) { console.warn("Search called before materials or index were ready."); displayResults([]); return; }

  if (query === "") { results = [...materials]; }
  else { const fuseResults = fuse.search(query); results = fuseResults.map(result => result.item); }
  console.log(`Initial results count: ${results.length}`);

  if (activeFilters.length > 0) {
    const countBeforeFilter = results.length;
    results = results.filter(m => matchesFilters(m, activeFilters));
    console.log(`Filtering reduced results to ${results.length}.`);
  }

  displayResults(results); // Update the UI
}

// Handles click on a tag to apply it as a filter
function performSearchWithTag(tag) {
  console.log(`Applying tag filter via click: ${tag}`);
  if (typeof tag !== 'string' || !tag.includes(':')) { console.warn(`Invalid tag format: ${tag}`); return; }

  const [prefix] = tag.split(":");
  const filterElement = document.getElementById(`${prefix}Filter`);

  if (filterElement) {
    if ([...filterElement.options].some(opt => opt.value === tag)) {
        if (filterElement.value !== tag) {
            filterElement.value = tag;
            console.log(`Set ${prefix}Filter to ${tag}`);
            const searchInput = document.getElementById("searchInput");
            if (searchInput) searchInput.value = ""; // Clear search input
            performSearch(); // Re-run search
        } else { console.log(`Filter ${prefix}Filter already set to ${tag}.`); }
    } else { console.warn(`Option value "${tag}" not found in ${prefix}Filter.`); }
  } else { console.warn(`Filter dropdown element not found for prefix: ${prefix}`); }
}


// Displays the search results in the UI
function displayResults(results) {
  const resultsContainer = document.getElementById("results");
  const summaryElement = document.getElementById("result-summary");

  if (!resultsContainer || !summaryElement) { console.error("Cannot display results: UI elements missing."); return; }

  resultsContainer.innerHTML = ""; // Clear previous cards
  summaryElement.textContent = `${results ? results.length : 0} material(s) found`; // Update summary

  if (!results || results.length === 0) { console.log("Display Results: No materials."); return; }

  console.log(`Display Results: Rendering ${results.length} cards.`);
  const fragment = document.createDocumentFragment();
  results.forEach(mat => {
    const card = document.createElement("div"); card.className = "material-card";
    const title = document.createElement("h2"); title.textContent = mat.name || "N/A"; card.appendChild(title);

    if (mat.formula) { const formula = document.createElement("p"); formula.innerHTML = `<strong>Formula:</strong> ${mat.formula}`; card.appendChild(formula); }

    if (Array.isArray(mat.tags) && mat.tags.length > 0) {
      const tagContainer = document.createElement("div"); tagContainer.className = "tags";
      mat.tags.forEach(tag => { // Tag is the full "prefix:value" string
        if (typeof tag !== 'string') return;
        const span = document.createElement("span"); span.className = "tag";
        const displayTag = tag.split(":")[1]?.replace(/_/g, " ") ?? tag;
        span.textContent = displayTag;
        span.title = tag; // Store the FULL tag (prefix:value) in title

        span.addEventListener("click", (event) => {
            event.preventDefault(); // Good practice
            const clickedFullTag = event.target.title; // Get from title
            performSearchWithTag(clickedFullTag); // Use the full tag from title
        });
        tagContainer.appendChild(span);
      });
      card.appendChild(tagContainer);
    }
    fragment.appendChild(card);
  });
  resultsContainer.appendChild(fragment);
}

// ============================================
// Initialization Sequence
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM content loaded. Starting initialization sequence...");

  // Attach logo listener
  const logoElement = document.getElementById("logo");
  if (logoElement) {
      logoElement.addEventListener("click", () => location.reload());
      console.log("Logo click listener attached.");
  } else { console.warn("Logo element not found."); }

  // Ensure essential DOM elements exist before proceeding
  const neededIds = ["searchInput", "suggestions", "results", "result-summary", "toolbar"];
  let missingElement = false;
  for (const id of neededIds) {
      if (!document.getElementById(id)) {
          console.error(`Essential DOM element missing: #${id}. Aborting initialization.`);
          updateStatusMessage(`Error: Page structure incorrect (missing #${id}).`, true);
          missingElement = true;
      }
  }
  if (missingElement) return;

  // Disable filters initially
  disableFilters();

  // Start the async loading process
  try {
    // === STEP 1: Load Materials ===
    updateStatusMessage("Loading materials...");
    materials = await loadMaterials();
    console.log(`Material loading complete. ${materials.length} entries loaded.`);
    if (materials.length === 0) throw new Error("No material data loaded successfully.");

    // === STEP 2: Initialize Fuse ===
    updateStatusMessage("Initializing search index...");
    if (!initializeSearchIndex()) throw new Error("Search index initialization failed.");

    // === STEP 3: Check for Taxonomy and Populate Filters ===
    updateStatusMessage("Populating filters...");
    if (typeof window.tagTaxonomy === 'undefined') {
        throw new Error("tagTaxonomy object not found. Check tagTaxonomy.js loading order and content.");
    }
    if (!populateFilterOptions()) throw new Error("Filter population failed.");

    // === STEP 4: Initialize Suggestions ===
    // updateStatusMessage("Initializing suggestions..."); // Less critical status message
    initSuggestions();

    // === STEP 5: Initial Search & Cleanup ===
    updateStatusMessage(""); // Clear loading messages
    performSearch();
    console.log("Initialization sequence complete.");

  } catch (error) {
    console.error("Error during initialization sequence:", error);
    const summaryElement = document.getElementById("result-summary");
    if (summaryElement && !summaryElement.querySelector('p[style*="color: red"]')) {
       updateStatusMessage(error.message || "Critical failure during initialization. Check console.", true);
    }
    disableFilters();
  }

  // --- Event Listeners Setup (Attach AFTER elements are confirmed) ---
  // Search Input Listeners (now handled within initSuggestions)
  // Filter Change Listeners (now handled within populateFilterOptions)

  // Tag Click Listener (Delegate on results container)
  document.getElementById("results").addEventListener("click", (event) => {
    if (event.target.classList.contains("tag")) {
      const fullTag = event.target.title; // Use the 'title' attribute
      if (fullTag) {
          performSearchWithTag(fullTag);
      } else {
          console.warn("Clicked tag missing title attribute.");
      }
    }
  });
}); // End DOMContentLoaded

console.log("app.js script successfully parsed.");
