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

    // --- Preprocess Data: Add Normalized Formula Field ---
    allMaterialsData = allMaterialsData.map(material => {
        if (material.formula) {
            // Normalization logic: remove variables, parentheses, subscripts, spaces, separators
            material.formula_normalized = material.formula
                .replace(/\(.*?\)/g, '') // Remove content within parentheses (e.g., (1-x))
                .replace(/[\d.\sₓ₁₂₃₄₅₆₇₈₉₊₋₀\(\)]+/g, '') // Remove numbers, common subscripts, brackets - ADJUST as needed
                .replace(/[-_\/]/g, ''); // Remove common separators
        } else {
             material.formula_normalized = '';
        }
        // Add other preprocessing steps here if needed
        return material;
    });
    console.log("Data preprocessing complete (added formula_normalized).");
    // --------------------------------------------------

    // --- Initialize Fuse.js ---
    updateLoadingMessage("Initializing search index...");
    try {
        const fuseOptions = {
            // *** UPDATED keys and weights ***
            keys: [
                { name: "name", weight: 0.4 },
                { name: "formula_normalized", weight: 0.4 }, // Added normalized formula with high weight
                { name: "synonyms", weight: 0.2 },
                { name: "formula", weight: 0.1 },          // Lowered weight for original formula
                { name: "tags", weight: 0.1 },
                { name: "category", weight: 0.1 }
            ],
            threshold: 0.3, // Slightly lower threshold for more fuzziness
            includeScore: true,
            includeMatches: true, // *** ADDED: Include match indices ***
            ignoreLocation: true,
            minMatchCharLength: 2
        };
        fuse = new Fuse(allMaterialsData, fuseOptions);
        console.log("Fuse.js initialized successfully with includeMatches: true.");
    } catch (fuseError) {
        console.error("Error initializing Fuse.js:", fuseError);
        updateLoadingMessage("Error: Failed to initialize search index. Check console.", true);
        disableFilters();
        return;
    }
    // --------------------------

    updateLoadingMessage("Updating filters...");
    updateFilters(allMaterialsData); // Populate filters based on loaded data

    updateLoadingMessage("", false); // Clear "Loading..."
    setInitialResultsMessage("Enter a search query or select filters to begin.");

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
         if (!resultsContainer.querySelector('p[style*="color: red"]')) {
            resultsContainer.innerHTML = '';
         }
    }
}

function setInitialResultsMessage(message) {
    const resultsContainer = document.getElementById("results");
    if (!resultsContainer) return;
    // Only set if results are currently empty or contain the placeholder
    if (resultsContainer.innerHTML === '' || resultsContainer.querySelector('p.initial-message')) {
        resultsContainer.innerHTML = `<p class="initial-message" style="text-align: center; color: #70757a; font-size: 1.1rem; padding: 3rem 1rem;">${message}</p>`;
    }
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
  query = query.trim();
  hasPerformedSearch = true;
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

  const isAnyFilterActive = industry || category || tag;
  const isSearchActive = query !== "";
  const shouldShowResultsArea = isSearchActive || isAnyFilterActive;

  if (toolbar) {
    toolbar.classList.toggle("active", shouldShowResultsArea);
  }
  if (body) {
      body.classList.toggle("results-active", shouldShowResultsArea);
  }

  if (shouldShowResultsArea) {
     const initialMsg = resultsContainer.querySelector('p.initial-message');
     if (initialMsg) {
         resultsContainer.innerHTML = '';
     }
  } else {
     setInitialResultsMessage("Enter a search query or select filters to begin.");
     render([]); // Ensure render function clears any old results
     return;
  }


  // --- Perform Fuse search or use all data ---
  let results;
  if (query === "") {
      // Wrap all data for consistency, no matches needed here
      results = allMaterialsData.map(item => ({ item: item, matches: [] }));
  } else {
      // *** Request matches from Fuse ***
      results = fuse.search(query, { includeMatches: true });
  }
  // -----------------------------------------


  // --- Filter based on dropdowns ---
  let filteredFuseResults = results; // Keep the full result object {item, matches}

  if (industry) {
      filteredFuseResults = filteredFuseResults.filter(r => r.item.tags?.includes("industry:" + industry));
  }
  if (category) {
      filteredFuseResults = filteredFuseResults.filter(r => r.item.category === category);
  }
  if (tag) {
      filteredFuseResults = filteredFuseResults.filter(r => r.item.tags?.includes(tag));
  }
  // ---------------------------------

  console.log(`Search/filter resulted in ${filteredFuseResults.length} materials.`);
  render(filteredFuseResults); // *** Pass the full filtered results with matches ***
}

// --- Helper function for highlighting matches ---
// (Can be placed inside render or globally)
function highlightMatches(text, key, matches) {
    if (!text || !matches || matches.length === 0) return text; // Return original if no text/matches

    const keyMatches = matches.filter(m => m.key === key);
    if (keyMatches.length === 0 || !keyMatches[0].indices || keyMatches[0].indices.length === 0) {
        return text; // No matches for this specific key
    }

    let highlightedText = "";
    let lastIndex = 0;

    // Combine and sort all match indices for this key
    const allIndices = keyMatches.flatMap(m => m.indices);
    allIndices.sort((a, b) => a[0] - b[0]);

    // Merge overlapping/adjacent indices (basic merge)
    const mergedIndices = [];
    if (allIndices.length > 0) {
        let current = [...allIndices[0]]; // Copy start/end
        for (let i = 1; i < allIndices.length; i++) {
            const next = allIndices[i];
            if (next[0] <= current[1] + 1) { // Overlap or adjacent
                current[1] = Math.max(current[1], next[1]); // Extend end
            } else {
                mergedIndices.push(current); // Push previous interval
                current = [...next];         // Start new interval
            }
        }
        mergedIndices.push(current); // Push the last interval
    }

    // Build the highlighted string
    mergedIndices.forEach(indices => {
        const start = indices[0];
        const end = indices[1] + 1;
        // Add text before the match
        highlightedText += text.substring(lastIndex, start);
        // Add highlighted match
        highlightedText += `<span class="highlight">${text.substring(start, end)}</span>`;
        lastIndex = end;
    });

    // Add any remaining text after the last match
    highlightedText += text.substring(lastIndex);

    return highlightedText;
}
// --- End Helper function ---


// *** MODIFIED render function ***
function render(fuseResults) { // Parameter is now array of {item, matches, score...}
  const resultsContainer = document.getElementById("results");
  if (!resultsContainer) return;

  // Check if there are items to render
  const materialsExist = fuseResults && fuseResults.length > 0;

  // Clear previous results only if we are going to add new ones or if no results were found *after* a search
  if (materialsExist || hasPerformedSearch) {
     resultsContainer.innerHTML = "";
  }

  if (!materialsExist) {
      if (hasPerformedSearch) {
         console.log("Render: No materials to display after search/filter.");
         // CSS :empty selector handles the "No materials found" message
      } else {
          console.log("Render: No materials to display (initial state).");
          // Initial message is handled by setInitialResultsMessage
      }
    return;
  }

  console.log(`Render: Displaying ${fuseResults.length} cards.`);
  const fragment = document.createDocumentFragment();

  // Iterate through the full results array
  fuseResults.forEach(result => {
      const material = result.item;
      const matches = result.matches || []; // Get matches array (empty if query was empty)

      if (!material || typeof material.name !== 'string' || material.name.trim() === '') {
          console.warn("Skipping material with missing or invalid name:", material);
          return;
      }

      const el = document.createElement("div");
      el.className = "material-card";

      const name = material.name;
      // Get normalized formula IF it exists AND has a match, otherwise use original or N/A
      let formulaToDisplay = material.formula || 'N/A';
      let formulaKeyForHighlight = 'formula';
      if(material.formula_normalized && matches.some(m => m.key === 'formula_normalized')){
          // Prefer showing original formula but highlight based on normalized match if needed
          formulaToDisplay = material.formula || material.formula_normalized; // Show original if possible
          formulaKeyForHighlight = 'formula_normalized'; // Tell highlight function which key had the match
      } else if (material.formula) {
          formulaKeyForHighlight = 'formula';
      }


      const category = material.category || 'N/A';

      // Highlight tags - pass 'tags' key
      const tagsHtml = Array.isArray(material.tags)
        ? material.tags
            .filter(t => typeof t === 'string' && t.trim() !== '')
            .map(t => `<span class='tag'>${highlightMatches(t.trim(), 'tags', matches)}</span>`) // Pass 'tags' key and matches
            .join(" ")
        : '';

      // Apply highlighting to displayed fields
      el.innerHTML = `<h2>${highlightMatches(name, 'name', matches)}</h2>
                      <p><strong>Formula:</strong> ${highlightMatches(formulaToDisplay, formulaKeyForHighlight, matches)}</p>
                      <p><strong>Category:</strong> ${highlightMatches(category, 'category', matches)}</p>
                      <div class="tags">${tagsHtml}</div>`;

      el.dataset.materialName = name;
      fragment.appendChild(el);
  });

  resultsContainer.appendChild(fragment);
}
// *** END MODIFIED render function ***


// *** MODIFIED showSuggestions function ***
function showSuggestions(query) {
    const suggestionsList = document.getElementById("suggestions");
    if (!suggestionsList || !fuse) return;
    suggestionsList.innerHTML = "";

    try {
        // *** Request matches from Fuse ***
        const results = fuse.search(query, { limit: 8, includeMatches: true });

        if (results.length === 0 && query.length > 0) {
            suggestionsList.innerHTML = "<li class='disabled'>No suggestions found</li>";
            return;
        }

        results.forEach(result => {
            const item = result.item;
            const matches = result.matches; // Get match data

            if (!item?.name || typeof item.name !== 'string' || item.name.trim() === '') return;

            const li = document.createElement("li");

            // --- Highlighting Logic for Suggestions (using helper function) ---
            // Primarily highlight matches in the 'name' field for suggestions
            li.innerHTML = highlightMatches(item.name, 'name', matches);
            // --- End Highlighting Logic ---

            li.addEventListener("mousedown", (e) => {
                e.preventDefault();
                const searchInput = document.getElementById("searchInput");
                if (searchInput) {
                    searchInput.value = item.name; // Use original item name
                }
                suggestionsList.innerHTML = "";
                performSearch(item.name);
            });
            suggestionsList.appendChild(li);
        });
    } catch (error) {
        console.error("Error generating suggestions:", error);
        suggestionsList.innerHTML = "<li class='disabled'>Error loading suggestions</li>";
    }
}
// *** END MODIFIED showSuggestions function ***


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
        if (query.length > 1) {
          showSuggestions(query);
        } else {
          suggestionsList.innerHTML = "";
          if (query === "" && hasPerformedSearch) {
             performSearch("");
          } else if (query === "") {
             setInitialResultsMessage("Enter a search query or select filters to begin.");
             document.body.classList.remove("results-active");
             const toolbar = document.getElementById("toolbar");
             if (toolbar) toolbar.classList.remove("active");
          }
        }
      });

      searchInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          suggestionsList.innerHTML = "";
          performSearch(searchInput.value);
        }
        // --- Tab Completion Logic ---
        else if (e.key === "Tab") {
            const firstSuggestion = suggestionsList.querySelector("li:not(.disabled)");
            if (firstSuggestion) {
                e.preventDefault(); // Prevent default Tab behavior
                const suggestionText = firstSuggestion.textContent; // Get raw text
                searchInput.value = suggestionText;
                suggestionsList.innerHTML = "";
                // Optional: Automatically search on Tab, or let user press Enter
                // performSearch(suggestionText);
            }
        }
        // --- End Tab Completion Logic ---
      });

      // Reduced timeout slightly
      searchInput.addEventListener("focusout", (event) => {
          if (!suggestionsList.contains(event.relatedTarget)) {
              setTimeout(() => {
                   if (document.activeElement !== searchInput && !suggestionsList.contains(document.activeElement)) {
                       suggestionsList.innerHTML = "";
                   }
              }, 100); // Shorter delay
          }
      });


      searchInput.addEventListener("focus", () => {
        if (searchInput.value.trim().length > 1) {
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
              performSearch(currentQuery);
          });
      } else {
          console.warn("A filter dropdown element was not found.");
      }
  });

  if (resultsContainer) {
      resultsContainer.addEventListener("click", (event) => {
        let targetElement = event.target;

        // --- Handle Tag Click ---
        if (targetElement.classList.contains("tag") || targetElement.closest(".tag")) {
            // Handle click on highlighted part inside tag span as well
            const tagSpan = targetElement.closest(".tag");
            if (!tagSpan) return;

            const clickedTag = tagSpan.textContent.trim(); // Use textContent to get raw tag name
            console.log("Tag clicked:", clickedTag);
            const industryPrefix = "industry:";
            let searchTriggered = false;

            if (clickedTag.startsWith(industryPrefix)) {
                const industry = clickedTag.substring(industryPrefix.length);
                if (industryFilter && [...industryFilter.options].some(opt => opt.value === industry)) {
                    if (industryFilter.value !== industry) { industryFilter.value = industry; searchTriggered = true; }
                    if (propertyFilter && propertyFilter.value !== "") { propertyFilter.value = ""; searchTriggered = true; }
                } else { console.warn(`Industry filter option not found: ${industry}`); }
            } else {
                if (propertyFilter && [...propertyFilter.options].some(opt => opt.value === clickedTag)) {
                    if (propertyFilter.value !== clickedTag) { propertyFilter.value = clickedTag; searchTriggered = true; }
                    if (industryFilter && industryFilter.value !== "") { industryFilter.value = ""; searchTriggered = true; }
                } else { console.warn(`Property filter option not found: ${clickedTag}`); }
            }

            if (searchTriggered) {
                const currentQuery = searchInput ? searchInput.value : "";
                performSearch(currentQuery);
                if (searchInput) searchInput.value = ""; // Clear search input
                if (suggestionsList) suggestionsList.innerHTML = ""; // Clear suggestions
            }
        }
        // --- Handle Material Card Click ---
        else {
            const card = targetElement.closest('.material-card');
            if (card) {
                const materialName = card.dataset.materialName;
                if (materialName) {
                    // *** Use original material name for navigation ***
                    const encodedName = encodeURIComponent(materialName);
                    // *** Point to the FULL detail page ***
                    const url = `material_full_detail.html?material=${encodedName}`;
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
