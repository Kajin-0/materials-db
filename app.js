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
        console.warn(`Source file not found (404): ${url}`);
      } else {
        console.error(`Fetch Error for ${url}: ${response.status} ${response.statusText}`);
      }
      return null;
    }
    try {
        const data = await response.json(); // Parse JSON first

        // === CORRECTED VALIDATION ===
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
        // ============================

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

// Loads index, fetches all sources, initializes Fuse.js and UI
async function initializeDatabase() {
  const resultsContainer = document.getElementById("results");
  updateLoadingMessage("Loading material index...");
  console.log("Initializing database...");

  const indexUrl = './data/materials-index.json';
  const indexData = await fetchJson(indexUrl); // fetchJson now validates index structure

  if (!indexData) {
    // Error message shown by fetchJson or the validation within it
    console.error(`Failed to load or invalid format for index: ${indexUrl}. See previous logs.`);
    // Update message if fetchJson didn't already show specific error
    if (!resultsContainer.querySelector('p[style*="color: red"]')) {
        updateLoadingMessage(`Error: Could not load or validate material index (${indexUrl}). Check console.`, true);
    }
    disableFilters();
    return;
  }

  updateLoadingMessage(`Loading ${indexData.sources.length} source files...`);
  console.log("Index loaded. Sources:", indexData.sources);

  // Fetch source files using relative paths
  const fetchPromises = indexData.sources
      .filter(sourceFile => typeof sourceFile === 'string' && sourceFile.endsWith('.json'))
      .map(sourceFile => fetchJson(`./data/${sourceFile}`)); // fetchJson validates these are arrays

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

// --- UI Updates ---
function updateLoadingMessage(message, isError = false) {
    const resultsContainer = document.getElementById("results");
    if (!resultsContainer) return;
    if (message) {
        resultsContainer.innerHTML = `<p style="text-align: center; color: ${isError ? 'red' : '#777'};">${message}</p>`;
    } else {
         // Only clear if there isn't already an error message displayed
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
      if (!industrySelect || !categorySelect || !propertySelect) {
          console.warn("One or more filter dropdowns not found in DOM.");
          return;
      }

      industrySelect.disabled = false; categorySelect.disabled = false; propertySelect.disabled = false;

      // Extract unique, sorted values for filters
      const industries = [...new Set(materials.flatMap(m => (m.tags || []).filter(t => typeof t === 'string' && t.startsWith("industry:")).map(t => t.replace("industry:", ""))))].sort();
      const categories = [...new Set(materials.map(m => m.category).filter(Boolean))].sort();
      // Exclude industry tags from the general 'Tag' filter
      const tags = [...new Set(materials.flatMap(m => (m.tags || []).filter(t => typeof t === 'string' && !t.startsWith("industry:"))))].sort();

      // Helper function to populate a select dropdown
      function fillSelect(selectElement, items) {
        selectElement.innerHTML = "<option value=''>All</option>" + items.map(item => `<option value="${item}">${item}</option>`).join("");
      }

      fillSelect(industrySelect, industries);
      fillSelect(categorySelect, categories);
      fillSelect(propertySelect, tags);

      console.log("Filters updated.");
  } catch (error) {
      console.error("Error updating filters:", error);
      updateLoadingMessage("Error: Failed to update filters. Check console.", true);
      disableFilters();
  }
}

// --- Search and Rendering ---
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

  // Show/hide toolbar based on whether any search/filter is active
  if (toolbar) {
    toolbar.classList.toggle("active", query.trim() !== "" || industry || category || tag);
  }

  // Perform Fuse search or use all data if query is empty
  let results = query.trim() === "" ? allMaterialsData : fuse.search(query).map(result => result.item);

  // Apply filters sequentially
  if (industry) results = results.filter(m => m.tags?.includes("industry:" + industry));
  if (category) results = results.filter(m => m.category === category);
  if (tag) results = results.filter(m => m.tags?.includes(tag));

  console.log(`Search/filter resulted in ${results.length} materials.`);
  render(results); // Render the filtered results
}

function render(materials) {
  const resultsContainer = document.getElementById("results");
  if (!resultsContainer) return;
  resultsContainer.innerHTML = ""; // Clear previous results

  if (!materials || materials.length === 0) {
    console.log("Render: No materials to display.");
    // The :empty CSS pseudo-class in style.css will handle the "No materials found" message
    return;
  }

  console.log(`Render: Displaying ${materials.length} cards.`);
  const fragment = document.createDocumentFragment(); // Use fragment for performance

  for (const material of materials) {
    const el = document.createElement("div");
    el.className = "material-card"; // Add class for styling and click detection

    const name = material.name || 'N/A';
    const formula = material.formula || 'N/A';
    const category = material.category || 'N/A';

    // Generate HTML for tags, filtering out non-strings
    const tagsHtml = Array.isArray(material.tags)
      ? material.tags.filter(t => typeof t === 'string').map(t => `<span class='tag'>${t}</span>`).join(" ")
      : '';

    el.innerHTML = `<h2>${name}</h2>
                    <p><strong>Formula:</strong> ${formula}</p>
                    <p><strong>Category:</strong> ${category}</p>
                    <div class="tags">${tagsHtml}</div>`;

    // *** Add data attribute for click handling (only if name is valid) ***
    if (name !== 'N/A') {
      el.dataset.materialName = name;
    }

    fragment.appendChild(el);
  }
  resultsContainer.appendChild(fragment); // Append all cards at once
}

function showSuggestions(query) {
    const suggestionsList = document.getElementById("suggestions");
    if (!suggestionsList || !fuse) return;
    suggestionsList.innerHTML = ""; // Clear previous suggestions

    try {
        // Limit suggestions for performance and usability
        const results = fuse.search(query, { limit: 8 });

        if (results.length === 0) {
            suggestionsList.innerHTML = "<li class='disabled'>No suggestions found</li>";
            return;
        }

        results.map(result => result.item).forEach(item => {
            if (!item?.name) return; // Skip items without a name

            const li = document.createElement("li");
            li.textContent = item.name;

            // Use mousedown to register click before blur hides the list
            li.addEventListener("mousedown", (e) => {
                e.preventDefault(); // Prevent input blur before click registers
                const searchInput = document.getElementById("searchInput");
                searchInput.value = item.name; // Fill input with selected suggestion
                suggestionsList.innerHTML = ""; // Clear suggestions list
                performSearch(item.name); // Trigger search immediately
            });
            suggestionsList.appendChild(li);
        });
    } catch (error) {
        console.error("Error generating suggestions:", error);
        suggestionsList.innerHTML = "<li class='disabled'>Error loading suggestions</li>";
    }
}

// --- Event Listeners Setup ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded. Initializing database...");
  initializeDatabase(); // Start data loading

  // Get references to DOM elements
  const searchInput = document.getElementById("searchInput");
  const suggestionsList = document.getElementById("suggestions");
  const resultsContainer = document.getElementById("results");
  const industryFilter = document.getElementById("industryFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const propertyFilter = document.getElementById("propertyFilter");

  // Basic check for essential elements
  if (!searchInput || !suggestionsList || !resultsContainer || !industryFilter || !categoryFilter || !propertyFilter) {
      console.error("Essential DOM element(s) missing. Aborting listener setup.");
      updateLoadingMessage("Error: Page structure incorrect.", true); return;
  }

  // --- Search Input Listeners ---
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    if (query) {
      showSuggestions(query); // Show suggestions as user types
    } else {
      suggestionsList.innerHTML = ""; // Clear suggestions if input is empty
      performSearch(""); // Show all results when input is cleared
    }
  });

  searchInput.addEventListener("keydown", e => {
    // Trigger search on Enter key press
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission
      suggestionsList.innerHTML = ""; // Hide suggestions
      performSearch(searchInput.value.trim()); // Perform search
    }
  });

  // Hide suggestions when input loses focus (with a slight delay)
  searchInput.addEventListener("blur", () => {
      // Delay hiding to allow click events on suggestions to register
    setTimeout(() => {
        // Double check if focus is still elsewhere before hiding
        if (document.activeElement !== searchInput) {
             suggestionsList.innerHTML = "";
        }
    }, 150);
  });

  // Show suggestions again on focus if there's already text
  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim()) {
        showSuggestions(searchInput.value.trim());
    }
  });


  // --- Filter Dropdown Listeners ---
  industryFilter.addEventListener("change", () => performSearch(searchInput.value.trim()));
  categoryFilter.addEventListener("change", () => performSearch(searchInput.value.trim()));
  propertyFilter.addEventListener("change", () => performSearch(searchInput.value.trim()));

  // --- Results Container Click Listener (Event Delegation) ---
  resultsContainer.addEventListener("click", (event) => {
    // Check if a tag was clicked
    if (event.target.classList.contains("tag")) {
      const clickedTag = event.target.textContent;
      console.log("Tag clicked:", clickedTag);
      const industryPrefix = "industry:";
      let searchTriggered = false;

      if (clickedTag.startsWith(industryPrefix)) {
        const industry = clickedTag.substring(industryPrefix.length);
        // Check if the clicked industry exists as an option
        if ([...industryFilter.options].some(opt => opt.value === industry)) {
             // Update filter only if it's different, reset other filter
             if (industryFilter.value !== industry) { industryFilter.value = industry; searchTriggered = true; }
             if (propertyFilter.value !== "") { propertyFilter.value = ""; searchTriggered = true; } // Reset tag filter
        } else { console.warn(`Industry filter option not found: ${industry}`); }
      } else {
          // Check if the clicked tag exists as an option in the property filter
        if ([...propertyFilter.options].some(opt => opt.value === clickedTag)) {
            // Update filter only if it's different, reset other filter
            if (propertyFilter.value !== clickedTag) { propertyFilter.value = clickedTag; searchTriggered = true; }
            if (industryFilter.value !== "") { industryFilter.value = ""; searchTriggered = true; } // Reset industry filter
        } else { console.warn(`Property filter option not found: ${clickedTag}`); }
      }
      // Trigger search only if a filter value was actually changed
      if (searchTriggered) performSearch(searchInput.value.trim());

    }
    // *** NEW: Check if a material card (or its child) was clicked ***
    else if (event.target.closest('.material-card')) {
        const card = event.target.closest('.material-card');
        const materialName = card.dataset.materialName; // Get name from data attribute

        if (materialName) {
            // Construct the URL for the detail page
            const encodedName = encodeURIComponent(materialName);
            const url = `material_detail.html?material=${encodedName}`;
            console.log('Navigating to material detail:', url);
            // Navigate the browser to the detail page
            window.location.href = url;
        } else {
            console.warn("Clicked card does not have a valid material name dataset.");
            // Optionally provide user feedback here if needed
        }
    }
  });
});
