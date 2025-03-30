// Global variables
let allMaterialsData = []; // Holds combined data
let fuse; // Fuse.js instance
let hasPerformedSearch = false; // Flag to track if initial search/filter has happened

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
      return null; // Indicate fetch failure
    }
    try {
        const data = await response.json(); // Parse JSON first

        // === Data Structure Validation ===
        if (url.endsWith('materials-index.json')) {
             if (!data || typeof data !== 'object' || !Array.isArray(data.sources) || !data.sources.every(s => typeof s === 'string')) {
                 console.error(`Data format error: ${url} MUST be an object like { "sources": ["file1.json", ...] }. Received:`, data);
                 return null; // Indicate validation failure
             }
        } else {
             if (!Array.isArray(data)) { // Allow empty arrays
                 console.error(`Data format error: ${url} MUST be a JSON array [...]. Received:`, data);
                 return null; // Indicate validation failure for non-arrays
             }
             // Optional: Check if all items are objects (more robust)
             if (!data.every(item => typeof item === 'object' && item !== null)) {
                  console.warn(`Data format warning: ${url} should ideally be an array of objects [...], but contains non-object elements. Check source file.`);
                  // Filter out non-objects before proceeding
                  data = data.filter(item => typeof item === 'object' && item !== null);
             }
        }
        // ============================

        console.log(`Successfully fetched and validated: ${url}`);
        return data; // Return validated data

    } catch (parseError) {
        console.error(`JSON Parse Error in ${url}:`, parseError);
        return null; // Indicate parse failure
    }
  } catch (networkError) {
    console.error(`Network Error fetching ${url}:`, networkError);
    return null; // Indicate network failure
  }
}

// Loads index, fetches all sources, initializes Fuse.js and UI
async function initializeDatabase() {
  const resultsContainer = document.getElementById("results");
  updateLoadingMessage("Loading material index...");
  console.log("Initializing database...");

  const indexUrl = './data/materials-index.json';
  const indexData = await fetchJson(indexUrl);

  if (!indexData) {
    console.error(`Failed to load or invalid format for index: ${indexUrl}. See previous logs.`);
    if (resultsContainer && !resultsContainer.querySelector('p[style*="color: red"]')) {
        updateLoadingMessage(`Error: Could not load material index (${indexUrl}). Check console.`, true);
    }
    disableFilters();
    return;
  }

  updateLoadingMessage(`Loading ${indexData.sources.length} source files...`);
  console.log("Index loaded. Sources:", indexData.sources);

  const validSourceFiles = indexData.sources.filter(sourceFile =>
      typeof sourceFile === 'string' && sourceFile.trim() !== '' && sourceFile.endsWith('.json')
  );

  if (validSourceFiles.length !== indexData.sources.length) {
      console.warn("Some entries in materials-index.json sources were invalid or not strings.");
  }

  if (validSourceFiles.length === 0) {
      console.error("No valid .json source files listed in materials-index.json.");
      updateLoadingMessage("Error: No valid source files found in index. Check console.", true);
      disableFilters();
      return;
  }

  const fetchPromises = validSourceFiles.map(sourceFile => fetchJson(`./data/${sourceFile}`));

  try {
    const results = await Promise.all(fetchPromises);
    allMaterialsData = results.filter(data => data !== null).flat();

    console.log(`Total materials loaded: ${allMaterialsData.length}`);

    if (allMaterialsData.length === 0) {
      console.error("Failed to load any valid material data from source files listed in the index.");
      updateLoadingMessage("Error: No material data loaded. Check source files and console logs.", true);
      disableFilters();
      return;
    }

    // --- Initialize Fuse.js ---
    updateLoadingMessage("Initializing search index...");
    try {
        const fuseOptions = {
            keys: [
                { name: "name", weight: 0.4 },
                { name: "formula", weight: 0.2 },
                { name: "synonyms", weight: 0.2 },
                { name: "tags", weight: 0.1 },
                { name: "category", weight: 0.1 }
            ],
            threshold: 0.35,
            includeScore: true,
            ignoreLocation: true,
            minMatchCharLength: 2
        };
        fuse = new Fuse(allMaterialsData, fuseOptions);
        console.log("Fuse.js initialized successfully.");
    } catch (fuseError) {
        console.error("Error initializing Fuse.js:", fuseError);
        updateLoadingMessage("Error: Failed to initialize search index. Check console.", true);
        disableFilters();
        return;
    }
    // --------------------------

    updateLoadingMessage("Updating filters...");
    updateFilters(allMaterialsData); // Populate filters based on loaded data

    // **** CHANGE: Don't perform initial search. Set initial message instead. ****
    updateLoadingMessage("", false); // Clear "Loading..."
    setInitialResultsMessage("Enter a search query or select filters to begin."); // Set default message
    // performSearch(""); // REMOVED - No initial display of all items

    console.log("Database initialization complete.");

  } catch (error) {
    console.error("Unexpected error during source file processing or initialization:", error);
    updateLoadingMessage("Error: Failed to process material data. Check console.", true);
    disableFilters();
  }
}

// --- UI Updates ---
function updateLoadingMessage(message, isError = false) {
    const resultsContainer = document.getElementById("results");
    if (!resultsContainer) return;
    if (message) {
        resultsContainer.innerHTML = `<p class="initial-message" style="text-align: center; color: ${isError ? 'red' : '#70757a'}; font-size: 1.1rem; padding: 3rem 1rem;">${message}</p>`;
    } else {
         // Clear only if it's not an error message
         if (!resultsContainer.querySelector('p[style*="color: red"]')) {
            resultsContainer.innerHTML = ''; // Clear loading/initial messages
         }
    }
}

// **** NEW: Function to set initial/placeholder message ****
function setInitialResultsMessage(message) {
    const resultsContainer = document.getElementById("results");
    if (!resultsContainer) return;
    resultsContainer.innerHTML = `<p class="initial-message" style="text-align: center; color: #70757a; font-size: 1.1rem; padding: 3rem 1rem;">${message}</p>`;
}

function disableFilters() {
    ["industryFilter", "categoryFilter", "propertyFilter"].forEach(id => {
        const filterElement = document.getElementById(id);
        if (filterElement) {
            filterElement.disabled = true;
            if (filterElement.options.length === 0 || filterElement.options[0].value === "") {
                filterElement.innerHTML = '<option value="">Filters Unavailable</option>';
            }
        }
    });
    // Also hide the toolbar if filters are disabled
    const toolbar = document.getElementById("toolbar");
    if (toolbar) {
        toolbar.classList.remove("active");
    }
    console.log("Filters disabled due to error or lack of data.");
}

function updateFilters(materials) {
  const industrySelect = document.getElementById("industryFilter");
  const categorySelect = document.getElementById("categoryFilter");
  const propertySelect = document.getElementById("propertyFilter");

  if (!industrySelect || !categorySelect || !propertySelect) {
      console.warn("One or more filter dropdowns not found in DOM during updateFilters.");
      return;
  }

  try {
      const industries = [...new Set(
          materials.flatMap(m => m.tags || [])
                   .filter(t => typeof t === 'string' && t.startsWith("industry:"))
                   .map(t => t.replace("industry:", ""))
                   .filter(Boolean)
      )].sort();

      const categories = [...new Set(
          materials.map(m => m.category).filter(Boolean)
      )].sort();

      const tags = [...new Set(
          materials.flatMap(m => m.tags || [])
                   .filter(t => typeof t === 'string' && !t.startsWith("industry:"))
                   .filter(Boolean)
      )].sort();

      function fillSelect(selectElement, items, defaultLabel = "All") {
        const currentValue = selectElement.value;
        selectElement.innerHTML = `<option value="">${defaultLabel}</option>`;
        selectElement.innerHTML += items.map(item => `<option value="${item}">${item}</option>`).join("");
        if (items.includes(currentValue)) {
            selectElement.value = currentValue;
        } else {
            selectElement.value = "";
        }
        // Enable based on *initial* load, not current selection
        selectElement.disabled = items.length === 0;
      }

      fillSelect(industrySelect, industries, "All Industries");
      fillSelect(categorySelect, categories, "All Categories");
      fillSelect(propertySelect, tags, "All Tags");

      console.log("Filters updated successfully.");

  } catch (error) {
      console.error("Error updating filters:", error);
      updateLoadingMessage("Error: Failed to update filters. Check console.", true);
      disableFilters();
  }
}

// --- Search and Rendering ---
function performSearch(query) {
  query = query.trim(); // Trim whitespace
  hasPerformedSearch = true; // Mark that a search/filter action has occurred
  console.log(`Performing search. Query: "${query}"`);
  const resultsContainer = document.getElementById("results");

  if (!resultsContainer) {
      console.error("Results container not found.");
      return;
  }

  if (!fuse) {
    console.warn("Search attempted before Fuse was ready.");
    if (!resultsContainer.querySelector('p[style*="color: red"]')) {
        updateLoadingMessage("Initializing database...", false);
    }
    return;
  }

  const industry = document.getElementById("industryFilter")?.value || "";
  const category = document.getElementById("categoryFilter")?.value || "";
  const tag = document.getElementById("propertyFilter")?.value || "";
  const toolbar = document.getElementById("toolbar");
  const body = document.body;

  // **** UPDATED: Toolbar and Body Class Logic ****
  const isAnyFilterActive = industry || category || tag;
  const isSearchActive = query !== "";
  const shouldShowResultsArea = isSearchActive || isAnyFilterActive;

  // Activate toolbar if search or filters are active
  if (toolbar) {
    toolbar.classList.toggle("active", shouldShowResultsArea);
  }
  // Add class to body to adjust layout when results are shown
  if (body) {
      body.classList.toggle("results-active", shouldShowResultsArea);
  }
  // Clear initial message only if we are about to show results/toolbar
  if (shouldShowResultsArea) {
     const initialMsg = resultsContainer.querySelector('p.initial-message');
     if (initialMsg) {
         resultsContainer.innerHTML = ''; // Clear the initial message
     }
  } else {
     // If no search/filter, ensure initial message is present
     setInitialResultsMessage("Enter a search query or select filters to begin.");
     render([]); // Ensure render function clears any old results
     return; // Don't proceed with search/filter if nothing is active
  }
  // ************************************************


  // Perform Fuse search or use all data if query is empty
  let results = query === ""
    ? allMaterialsData.map(item => ({ item })) // Wrap for consistency if Fuse results are used
    : fuse.search(query);

  // Filter based on dropdowns
  let filteredResults = results.map(result => result.item); // Extract items

  if (industry) {
      filteredResults = filteredResults.filter(m => m.tags?.includes("industry:" + industry));
  }
  if (category) {
      filteredResults = filteredResults.filter(m => m.category === category);
  }
  if (tag) {
      filteredResults = filteredResults.filter(m => m.tags?.includes(tag));
  }

  console.log(`Search/filter resulted in ${filteredResults.length} materials.`);
  render(filteredResults); // Render the filtered results
}

function render(materials) {
  const resultsContainer = document.getElementById("results");
  if (!resultsContainer) return;

  // Clear previous results *only if* we are going to add new ones or if no results were found *after a search*
  if (materials.length > 0 || hasPerformedSearch) {
     resultsContainer.innerHTML = "";
  }
  // If no materials AND no search was performed, the initial message should already be there.

  if (!materials || materials.length === 0) {
      if (hasPerformedSearch) { // Only show "No results" if a search was actually done
         console.log("Render: No materials to display after search/filter.");
         // CSS :empty selector handles the "No materials found" message
      } else {
          console.log("Render: No materials to display (initial state).");
          // Initial message is handled by setInitialResultsMessage
      }
    return;
  }

  console.log(`Render: Displaying ${materials.length} cards.`);
  const fragment = document.createDocumentFragment();

  materials.forEach(material => {
    if (!material || typeof material.name !== 'string' || material.name.trim() === '') {
        console.warn("Skipping material with missing or invalid name:", material);
        return;
    }

    const el = document.createElement("div");
    el.className = "material-card";

    const name = material.name;
    const formula = material.formula || 'N/A';
    const category = material.category || 'N/A';

    const tagsHtml = Array.isArray(material.tags)
      ? material.tags
          .filter(t => typeof t === 'string' && t.trim() !== '')
          .map(t => `<span class='tag'>${t.trim()}</span>`)
          .join(" ")
      : '';

    el.innerHTML = `<h2>${name}</h2>
                    <p><strong>Formula:</strong> ${formula}</p>
                    <p><strong>Category:</strong> ${category}</p>
                    <div class="tags">${tagsHtml}</div>`;

    el.dataset.materialName = name;
    fragment.appendChild(el);
  });

  resultsContainer.appendChild(fragment);
}

function showSuggestions(query) {
    const suggestionsList = document.getElementById("suggestions");
    if (!suggestionsList || !fuse) return;
    suggestionsList.innerHTML = "";

    try {
        const results = fuse.search(query, { limit: 8 });

        if (results.length === 0 && query.length > 0) { // Only show 'no suggestions' if query is not empty
            suggestionsList.innerHTML = "<li class='disabled'>No suggestions found</li>";
            return;
        }

        results.forEach(result => {
            const item = result.item;
            if (!item?.name || typeof item.name !== 'string' || item.name.trim() === '') return;

            const li = document.createElement("li");
            li.textContent = item.name;

            li.addEventListener("mousedown", (e) => {
                e.preventDefault();
                const searchInput = document.getElementById("searchInput");
                if (searchInput) {
                    searchInput.value = item.name;
                }
                suggestionsList.innerHTML = "";
                performSearch(item.name); // Trigger search on suggestion click
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

  const searchInput = document.getElementById("searchInput");
  const suggestionsList = document.getElementById("suggestions");
  const resultsContainer = document.getElementById("results");
  const industryFilter = document.getElementById("industryFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const propertyFilter = document.getElementById("propertyFilter");

  if (searchInput && suggestionsList) {
      searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim();
        if (query.length > 1) { // Show suggestions only after 2+ chars
          showSuggestions(query);
        } else {
          suggestionsList.innerHTML = ""; // Clear suggestions if input is too short or empty
          if (query === "" && hasPerformedSearch) { // If user clears search after performing one, reset view
             performSearch("");
          } else if (query === "") {
             // Keep initial message if search wasn't performed yet
             setInitialResultsMessage("Enter a search query or select filters to begin.");
             document.body.classList.remove("results-active"); // Ensure layout resets
             const toolbar = document.getElementById("toolbar");
             if (toolbar) toolbar.classList.remove("active");
          }
        }
      });

      searchInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          suggestionsList.innerHTML = "";
          performSearch(searchInput.value); // Perform search with current input value
        }
      });

      searchInput.addEventListener("focusout", (event) => {
          if (!suggestionsList.contains(event.relatedTarget)) {
              setTimeout(() => {
                   if (document.activeElement !== searchInput && !suggestionsList.contains(document.activeElement)) {
                       suggestionsList.innerHTML = "";
                   }
              }, 150);
          }
      });

      searchInput.addEventListener("focus", () => {
        if (searchInput.value.trim().length > 1) { // Reshow suggestions on focus if applicable
            showSuggestions(searchInput.value.trim());
        }
      });
  } else {
      console.warn("Search input or suggestions list element not found. Search functionality disabled.");
  }

  [industryFilter, categoryFilter, propertyFilter].forEach(filterElement => {
      if (filterElement) {
          filterElement.addEventListener("change", () => {
              const currentQuery = searchInput ? searchInput.value : "";
              performSearch(currentQuery); // Trigger search on filter change
          });
      } else {
          console.warn("A filter dropdown element was not found.");
      }
  });

  if (resultsContainer) {
      resultsContainer.addEventListener("click", (event) => {
        let targetElement = event.target;

        // --- Handle Tag Click ---
        if (targetElement.classList.contains("tag")) {
          const clickedTag = targetElement.textContent.trim();
          console.log("Tag clicked:", clickedTag);
          const industryPrefix = "industry:";
          let searchTriggered = false;

          if (clickedTag.startsWith(industryPrefix)) {
            const industry = clickedTag.substring(industryPrefix.length);
            if (industryFilter && [...industryFilter.options].some(opt => opt.value === industry)) {
                 if (industryFilter.value !== industry) { industryFilter.value = industry; searchTriggered = true; }
                 if (propertyFilter && propertyFilter.value !== "") { propertyFilter.value = ""; searchTriggered = true; }
            } else { console.warn(`Industry filter option not found: ${industry}`); }
          }
          else {
            if (propertyFilter && [...propertyFilter.options].some(opt => opt.value === clickedTag)) {
                if (propertyFilter.value !== clickedTag) { propertyFilter.value = clickedTag; searchTriggered = true; }
                if (industryFilter && industryFilter.value !== "") { industryFilter.value = ""; searchTriggered = true; }
            } else { console.warn(`Property filter option not found: ${clickedTag}`); }
          }

          if (searchTriggered) {
              const currentQuery = searchInput ? searchInput.value : "";
              performSearch(currentQuery);
              searchInput.value = ""; // Clear search input when filter tag is clicked
              suggestionsList.innerHTML = ""; // Clear suggestions
          }
        }
        // --- Handle Material Card Click ---
        else {
            const card = targetElement.closest('.material-card');
            if (card) {
                const materialName = card.dataset.materialName;
                if (materialName) {
                    const encodedName = encodeURIComponent(materialName);
                    const url = `material_detail.html?material=${encodedName}`;
                    console.log('Navigating to material detail:', url);
                    window.location.href = url;
                } else {
                    console.warn("Clicked card does not have a valid 'data-material-name' attribute.");
                }
            }
        }
      });
  } else {
      console.warn("Results container not found. Click delegation disabled.");
  }
});
