// ============================================
// Global Variables
// ============================================
let materials = []; // Holds combined data from all source files
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
      // Log errors but don't stop Promise.all unless critical
      console.error(`Fetch Error for ${url}: ${response.status} ${response.statusText}`);
      return null; // Indicate failure for this file
    }
    try {
      const data = await response.json();
      // Source files MUST be arrays
      if (!Array.isArray(data)) {
        console.error(`Data format error: ${url} MUST be a JSON array [...]. Received:`, data);
        return null; // Indicate format error
      }
      console.log(`Successfully fetched and parsed: ${url}`);
      return data; // Return valid array data
    } catch (parseError) {
      console.error(`JSON Parse Error in ${url}:`, parseError);
      return null; // Indicate parse error
    }
  } catch (networkError) {
    console.error(`Network Error fetching ${url}:`, networkError);
    return null; // Indicate network error
  }
}

// Updates loading/status message
function updateStatusMessage(message, isError = false) {
    const summaryElement = document.getElementById("result-summary");
    if (!summaryElement) return; // Exit if element doesn't exist
    if (message) {
        summaryElement.innerHTML = `<p style="text-align: center; color: ${isError ? 'red' : '#777'};">${message}</p>`;
    } else {
        summaryElement.innerHTML = ''; // Clear message
    }
}

// Disables filter dropdowns
function disableFilters() {
    const taxonomy = window.tagTaxonomy || {};
    for (const prefix in taxonomy) {
        const filterElement = document.getElementById(`${prefix}Filter`);
        if (filterElement) filterElement.disabled = true;
    }
    console.log("Filters disabled.");
}

// Enables filter dropdowns
function enableFilters() {
    const taxonomy = window.tagTaxonomy || {};
    for (const prefix in taxonomy) {
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
  updateStatusMessage("Loading materials data...");
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
      // Filter out null results (errors) before flattening
      const loadedMaterials = results.filter(data => data !== null).flat();
      console.log(`loadMaterials finished. ${loadedMaterials.length} entries loaded.`);
      if (loadedMaterials.length === 0) {
          updateStatusMessage("Error: No material data loaded successfully. Check console.", true);
      } else {
          updateStatusMessage("Materials loaded."); // Update status
      }
      return loadedMaterials; // Return the combined array
  } catch (error) {
      // Catch potential errors from Promise.all itself (less likely with fetchJson handling)
      console.error("Critical error during Promise.all in loadMaterials:", error);
      updateStatusMessage("Error: Failed to load material files. Check console.", true);
      return []; // Return empty array on major failure
  }
}

// Initializes the Fuse.js search index
function initializeSearchIndex() {
  updateStatusMessage("Initializing search index...");
  if (!materials || materials.length === 0) {
      console.warn("Cannot initialize search index: No material data available.");
      updateStatusMessage("Warning: No data for search index.", true);
      return false;
  }
  try {
      fuse = new Fuse(materials, {
        keys: ['name', 'formula', 'synonyms', 'tags'],
        threshold: 0.3, // Adjust sensitivity as needed
        ignoreLocation: true,
        includeScore: true // Often useful
      });
      console.log("Fuse search index initialized successfully.");
      updateStatusMessage("Search index ready.");
      return true;
  } catch (error) {
      console.error("Error initializing Fuse.js:", error);
      updateStatusMessage("Error: Failed to initialize search index. Check console.", true);
      return false;
  }
}

// Populates filter dropdowns based on tagTaxonomy.js
function populateFilterOptions() {
  updateStatusMessage("Populating filters...");
  const toolbar = document.getElementById("toolbar");
  const taxonomy = window.tagTaxonomy; // Assumes tagTaxonomy.js is loaded

  if (!toolbar) { console.error("Toolbar element not found."); return false; }
  if (!taxonomy) { console.error("tagTaxonomy object not found. Ensure tagTaxonomy.js loaded correctly."); return false; }

  toolbar.innerHTML = ""; // Clear any previous content

  try {
      for (const prefix in taxonomy) {
        if (!Object.hasOwnProperty.call(taxonomy, prefix)) continue; // Skip inherited properties

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
          if (typeof tag !== 'string') return; // Skip non-strings
          const option = document.createElement("option");
          option.value = `${prefix}:${tag}`; // Value format prefix:tag
          option.textContent = tag.replace(/_/g, " "); // Display format
          select.appendChild(option);
        });

        select.addEventListener("change", performSearch); // Add listener to trigger search
        div.appendChild(select);
        toolbar.appendChild(div);
      }
      console.log("Filter options populated successfully.");
      enableFilters(); // Enable filters now that they are populated
      updateStatusMessage("Filters ready.");
      return true;
  } catch(error) {
      console.error("Error populating filter options:", error);
      updateStatusMessage("Error: Failed to create filters. Check console.", true);
      disableFilters();
      return false;
  }
}

// Initializes the suggestion functionality
function initSuggestions() {
  updateStatusMessage("Initializing suggestions...");
  const input = document.getElementById("searchInput");
  const suggestions = document.getElementById("suggestions");

  if (!input || !suggestions) { console.error("Cannot initialize suggestions: Elements missing."); return; }

  input.addEventListener("input", () => {
    if (!fuse) { suggestions.innerHTML = ""; return; } // Check if fuse is ready

    const query = input.value.trim(); // Use original case for Fuse search
    if (!query) { suggestions.innerHTML = ""; return; }

    suggestions.innerHTML = ""; // Clear previous

    // Use Fuse.js for suggestions for better matching
    const fuseResults = fuse.search(query, { limit: 8 }); // Limit suggestions

    if (fuseResults.length > 0) {
        fuseResults.forEach(result => {
            const item = result.item;
            if (!item || !item.name) return; // Basic check

            const li = document.createElement("li");
            li.textContent = `${item.name} (${item.formula || 'N/A'})`;
            li.addEventListener("mousedown", () => { // Use mousedown to beat blur
                input.value = item.name; // Set input to name
                suggestions.innerHTML = ""; // Clear suggestions
                performSearch(); // Trigger search
            });
            suggestions.appendChild(li);
        });
    }
  });
  console.log("Suggestions initialized.");
  updateStatusMessage("Suggestions ready."); // Update status
}


// Retrieves active filter values from the UI
function getActiveFilters() {
  const taxonomy = window.tagTaxonomy; const active = [];
  if (!taxonomy) return active;
  for (const prefix in taxonomy) {
     if (!Object.hasOwnProperty.call(taxonomy, prefix)) continue;
    const filterElement = document.getElementById(`${prefix}Filter`);
    const value = filterElement?.value; // Use optional chaining
    if (value) active.push(value); // Add if not empty ("All")
  }
  return active;
}

// Checks if a material object matches all provided filters
function matchesFilters(material, filters) {
  if (!material || !Array.isArray(material.tags)) return false;
  // Ensure every filter in the 'filters' array is present in 'material.tags'
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

  // Ensure fuse and materials are ready before searching
  if (!fuse || !materials) {
      console.warn("Search called before materials or index were ready.");
      displayResults([]); // Show no results
      return;
  }

  // Perform search
  if (query === "") {
    results = [...materials]; // Start with all if no query
  } else {
    const fuseResults = fuse.search(query); // Use Fuse.js
    results = fuseResults.map(result => result.item);
  }
  console.log(`Initial results count (from query/all): ${results.length}`);


  // Apply filters
  if (activeFilters.length > 0) {
    const countBeforeFilter = results.length;
    results = results.filter(m => matchesFilters(m, activeFilters));
    console.log(`Filtering reduced results from ${countBeforeFilter} to ${results.length}.`);
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
    // Check if option exists before setting
    if ([...filterElement.options].some(opt => opt.value === tag)) {
        if (filterElement.value !== tag) { // Only search if value changed
            filterElement.value = tag;
            console.log(`Set ${prefix}Filter to ${tag}`);
            // Clear other filters maybe? Or keep them? Currently keeps them.
            performSearch(); // Re-run search
        } else {
            console.log(`Filter ${prefix}Filter already set to ${tag}.`);
        }
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
      mat.tags.forEach(tag => {
        if (typeof tag !== 'string') return;
        const span = document.createElement("span"); span.className = "tag";
        const displayTag = tag.split(":")[1]?.replace(/_/g, " ") ?? tag; // Text part after ":"
        span.textContent = displayTag;
        span.title = tag; // *** Store the FULL tag (prefix:value) in title ***
        span.addEventListener("click", () => {
            const input = document.getElementById("searchInput"); if (input) input.value = ""; // Clear search box
            performSearchWithTag(tag); // Use the full tag
        });
        tagContainer.appendChild(span);
      });
      card.appendChild(tagContainer);
    }
    fragment.appendChild(card);
  });
  resultsContainer.appendChild(fragment); // Append all at once
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
  if (missingElement) return; // Stop if crucial elements are missing

  // Disable filters initially
  disableFilters();

  // Start the async loading process
  try {
    materials = await loadMaterials(); // Wait for data

    if (materials.length === 0) {
      // loadMaterials function already logged error and updated status
      disableFilters(); // Ensure they stay disabled
      return; // Stop if no materials loaded
    }

    // Only proceed if materials loaded successfully
    if (!initializeSearchIndex()) { // Initialize Fuse.js
      throw new Error("Search index initialization failed."); // Propagate error
    }

    if (!populateFilterOptions()) { // Populate filters from taxonomy
      throw new Error("Filter population failed."); // Propagate error
    }

    initSuggestions(); // Setup search suggestions

    updateStatusMessage(""); // Clear loading messages
    performSearch(); // Perform initial search (empty query)
    console.log("Initialization sequence complete.");

  } catch (error) {
    // Catch errors from the async operations or subsequent init steps
    console.error("Error during initialization sequence:", error);
    // updateStatusMessage function might have already shown an error,
    // but we can add a general one if needed, checking first.
    const summaryElement = document.getElementById("result-summary");
    if (summaryElement && !summaryElement.querySelector('p[style*="color: red"]')) {
       updateStatusMessage(error.message || "Critical failure during initialization. Check console.", true);
    }
    disableFilters(); // Ensure filters are disabled on any init error
  }

  // --- Event Listeners Setup (Attach AFTER elements are confirmed) ---
  // Search Input Listeners (handled within initSuggestions)
  // Filter Change Listeners (handled within populateFilterOptions)

  // Tag Click Listener (Delegate on results container)
  document.getElementById("results").addEventListener("click", (event) => {
    if (event.target.classList.contains("tag")) {
      // Use the 'title' attribute which stores the full tag "prefix:value"
      const fullTag = event.target.title;
      if (fullTag) {
          performSearchWithTag(fullTag);
      } else {
          console.warn("Clicked tag missing title attribute with full tag value.");
      }
    }
  });
});

console.log("app.js script successfully parsed.");
