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
      return null; // Indicate fetch failure
    }
    try {
        const data = await response.json(); // Parse JSON first

        // === Data Structure Validation ===
        // Check structure based on filename
        if (url.endsWith('materials-index.json')) {
             // Index MUST be an object with a 'sources' array of strings
             if (!data || typeof data !== 'object' || !Array.isArray(data.sources) || !data.sources.every(s => typeof s === 'string')) {
                 console.error(`Data format error: ${url} MUST be an object like { "sources": ["file1.json", ...] }. Received:`, data);
                 return null; // Indicate validation failure
             }
        } else {
             // Source files MUST be arrays of objects (basic check)
             if (!Array.isArray(data) || !data.every(item => typeof item === 'object' && item !== null)) {
                // Allow empty arrays, but log if non-object found
                if (data.some(item => typeof item !== 'object' || item === null)) {
                    console.warn(`Data format warning: ${url} should be an array of objects [...], but contains non-object elements. Processing objects only.`);
                    // Filter out non-objects just in case, though ideally the source is fixed
                    data = data.filter(item => typeof item === 'object' && item !== null);
                } else if (!Array.isArray(data)) {
                     console.error(`Data format error: ${url} MUST be a JSON array [...]. Received:`, data);
                     return null; // Indicate validation failure for non-arrays
                }
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
  const indexData = await fetchJson(indexUrl); // fetchJson validates index structure

  if (!indexData) {
    console.error(`Failed to load or invalid format for index: ${indexUrl}. See previous logs.`);
    // Update message only if fetchJson didn't already show a specific format error
    if (resultsContainer && !resultsContainer.querySelector('p[style*="color: red"]')) {
        updateLoadingMessage(`Error: Could not load or validate material index (${indexUrl}). Check console.`, true);
    }
    disableFilters();
    return;
  }

  updateLoadingMessage(`Loading ${indexData.sources.length} source files...`);
  console.log("Index loaded. Sources:", indexData.sources);

  // Ensure sources are valid strings ending in .json before mapping
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

  // Fetch source files using relative paths
  const fetchPromises = validSourceFiles.map(sourceFile => fetchJson(`./data/${sourceFile}`)); // fetchJson validates these are arrays

  try {
    const results = await Promise.all(fetchPromises);
    allMaterialsData = results.filter(data => data !== null).flat(); // Filter nulls (errors) before flattening

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
        // Define Fuse options - Adjust keys and threshold as needed
        const fuseOptions = {
            keys: [
                { name: "name", weight: 0.4 },
                { name: "formula", weight: 0.2 },
                { name: "synonyms", weight: 0.2 },
                { name: "tags", weight: 0.1 },
                { name: "category", weight: 0.1 }
            ],
            threshold: 0.35, // Allow slightly more fuzziness
            includeScore: true,
            ignoreLocation: true, // Search whole strings
            minMatchCharLength: 2 // Require at least 2 characters to match
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

    updateLoadingMessage(""); // Clear loading message
    performSearch(""); // Perform initial display (all materials or based on URL params if implemented)
    console.log("Database initialization complete.");

  } catch (error) {
    // Catch errors from Promise.all or subsequent processing
    console.error("Unexpected error during source file processing or initialization:", error);
    updateLoadingMessage("Error: Failed to process material data. Check console.", true);
    disableFilters();
  }
}

// --- UI Updates ---
function updateLoadingMessage(message, isError = false) {
    const resultsContainer = document.getElementById("results");
    if (!resultsContainer) return; // Exit if container not found
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
    // Disable all filter dropdowns gracefully
    ["industryFilter", "categoryFilter", "propertyFilter"].forEach(id => {
        const filterElement = document.getElementById(id);
        if (filterElement) {
            filterElement.disabled = true;
            // Optional: Set a disabled message
            if (filterElement.options.length === 0 || filterElement.options[0].value === "") {
                filterElement.innerHTML = '<option value="">Filters Unavailable</option>';
            }
        }
    });
    console.log("Filters disabled due to error or lack of data.");
}

function updateFilters(materials) {
  // Safely get filter elements
  const industrySelect = document.getElementById("industryFilter");
  const categorySelect = document.getElementById("categoryFilter");
  const propertySelect = document.getElementById("propertyFilter");

  if (!industrySelect || !categorySelect || !propertySelect) {
      console.warn("One or more filter dropdowns not found in DOM during updateFilters.");
      return; // Exit if elements aren't found
  }

  try {
      // Extract unique, sorted values for filters
      const industries = [...new Set(
          materials.flatMap(m => m.tags || [])
                   .filter(t => typeof t === 'string' && t.startsWith("industry:"))
                   .map(t => t.replace("industry:", ""))
                   .filter(Boolean) // Remove empty strings if any
      )].sort();

      const categories = [...new Set(
          materials.map(m => m.category).filter(Boolean)
      )].sort();

      // Exclude industry tags from the general 'Tag' filter
      const tags = [...new Set(
          materials.flatMap(m => m.tags || [])
                   .filter(t => typeof t === 'string' && !t.startsWith("industry:"))
                   .filter(Boolean) // Remove empty strings
      )].sort();

      // Helper function to populate a select dropdown
      function fillSelect(selectElement, items, defaultLabel = "All") {
        // Keep track of current value to restore it if possible
        const currentValue = selectElement.value;
        // Clear existing options except the default 'All' if it exists
        selectElement.innerHTML = `<option value="">${defaultLabel}</option>`;
        // Add new options
        selectElement.innerHTML += items.map(item => `<option value="${item}">${item}</option>`).join("");
        // Restore previous value if it's still valid
        if (items.includes(currentValue)) {
            selectElement.value = currentValue;
        } else {
            selectElement.value = ""; // Reset if previous value is no longer valid
        }
        // Enable the dropdown only if there are items to select
        selectElement.disabled = items.length === 0;
      }

      fillSelect(industrySelect, industries, "All Industries");
      fillSelect(categorySelect, categories, "All Categories");
      fillSelect(propertySelect, tags, "All Tags");

      console.log("Filters updated successfully.");

  } catch (error) {
      console.error("Error updating filters:", error);
      updateLoadingMessage("Error: Failed to update filters. Check console.", true);
      disableFilters(); // Disable filters on error
  }
}

// --- Search and Rendering ---
function performSearch(query) {
  query = query.trim(); // Trim whitespace
  console.log(`Performing search. Query: "${query}"`);
  const resultsContainer = document.getElementById("results");

  if (!resultsContainer) {
      console.error("Results container not found.");
      return;
  }

  if (!fuse) {
    console.warn("Search attempted before Fuse was ready.");
    if (!resultsContainer.querySelector('p[style*="color: red"]')) {
        // Avoid overwriting potential error messages
        updateLoadingMessage("Initializing database...", false);
    }
    return;
  }

  // Get current filter values safely
  const industry = document.getElementById("industryFilter")?.value || "";
  const category = document.getElementById("categoryFilter")?.value || "";
  const tag = document.getElementById("propertyFilter")?.value || "";
  const toolbar = document.getElementById("toolbar");

  // Show/hide toolbar based on whether any search/filter is active
  if (toolbar) {
    toolbar.classList.toggle("active", query !== "" || industry || category || tag);
  }

  // Perform Fuse search or use all data if query is empty
  let results = query === ""
    ? allMaterialsData.map(item => ({ item })) // Wrap in { item } for consistency if needed later, or just use allMaterialsData directly
    : fuse.search(query); // Fuse returns results with score and item

  // Filter based on dropdowns
  let filteredResults = results.map(result => result.item); // Extract items

  if (industry) {
      filteredResults = filteredResults.filter(m => m.tags?.includes("industry:" + industry));
  }
  if (category) {
      filteredResults = filteredResults.filter(m => m.category === category);
  }
  if (tag) {
      // Ensure tag filtering looks for exact match within the tags array
      filteredResults = filteredResults.filter(m => m.tags?.includes(tag));
  }

  console.log(`Search/filter resulted in ${filteredResults.length} materials.`);
  render(filteredResults); // Render the filtered results
}

function render(materials) {
  const resultsContainer = document.getElementById("results");
  if (!resultsContainer) return; // Exit if container not found
  resultsContainer.innerHTML = ""; // Clear previous results

  if (!materials || materials.length === 0) {
    console.log("Render: No materials to display.");
    // The :empty CSS pseudo-class in style.css will handle the "No materials found" message
    return;
  }

  console.log(`Render: Displaying ${materials.length} cards.`);
  const fragment = document.createDocumentFragment(); // Use fragment for performance

  materials.forEach(material => { // Use forEach for clarity
    // Basic validation for essential properties
    if (!material || typeof material.name !== 'string' || material.name.trim() === '') {
        console.warn("Skipping material with missing or invalid name:", material);
        return; // Skip this material
    }

    const el = document.createElement("div");
    el.className = "material-card"; // Add class for styling and click detection

    const name = material.name; // Already validated
    const formula = material.formula || 'N/A';
    const category = material.category || 'N/A';

    // Generate HTML for tags, filtering out non-strings and trimming
    const tagsHtml = Array.isArray(material.tags)
      ? material.tags
          .filter(t => typeof t === 'string' && t.trim() !== '') // Ensure tag is a non-empty string
          .map(t => `<span class='tag'>${t.trim()}</span>`) // Trim tag content
          .join(" ")
      : '';

    el.innerHTML = `<h2>${name}</h2>
                    <p><strong>Formula:</strong> ${formula}</p>
                    <p><strong>Category:</strong> ${category}</p>
                    <div class="tags">${tagsHtml}</div>`;

    // Add data attribute for click handling using the validated name
    el.dataset.materialName = name;

    fragment.appendChild(el);
  });

  resultsContainer.appendChild(fragment); // Append all cards at once
}

function showSuggestions(query) {
    const suggestionsList = document.getElementById("suggestions");
    if (!suggestionsList || !fuse) return; // Exit if dependencies missing
    suggestionsList.innerHTML = ""; // Clear previous suggestions

    try {
        // Limit suggestions for performance and usability
        const results = fuse.search(query, { limit: 8 });

        if (results.length === 0) {
            suggestionsList.innerHTML = "<li class='disabled'>No suggestions found</li>";
            return;
        }

        results.forEach(result => { // Use forEach
            const item = result.item;
            // Ensure item and item.name are valid before creating list item
            if (!item?.name || typeof item.name !== 'string' || item.name.trim() === '') return;

            const li = document.createElement("li");
            li.textContent = item.name; // Use validated name

            // Use mousedown to register click before blur hides the list
            li.addEventListener("mousedown", (e) => {
                e.preventDefault(); // Prevent input blur before click registers
                const searchInput = document.getElementById("searchInput");
                if (searchInput) {
                    searchInput.value = item.name; // Fill input with selected suggestion
                }
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

  // Get references to DOM elements safely
  const searchInput = document.getElementById("searchInput");
  const suggestionsList = document.getElementById("suggestions");
  const resultsContainer = document.getElementById("results");
  const industryFilter = document.getElementById("industryFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const propertyFilter = document.getElementById("propertyFilter");

  // Attach listeners only if elements exist
  if (searchInput && suggestionsList) {
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
        if (e.key === "Enter") {
          e.preventDefault(); // Prevent potential form submission
          suggestionsList.innerHTML = ""; // Hide suggestions
          performSearch(searchInput.value); // Perform search with current input value
        }
      });

      // Hide suggestions when input loses focus (using focusout for better compatibility)
      searchInput.addEventListener("focusout", (event) => {
          // Check if the focus moved to an element within the suggestions list
          // If not, then hide the suggestions after a brief delay
          if (!suggestionsList.contains(event.relatedTarget)) {
              // Delay hiding to allow click events on suggestions to register
              setTimeout(() => {
                  // Final check: Hide only if focus isn't back on input or in suggestions
                   if (document.activeElement !== searchInput && !suggestionsList.contains(document.activeElement)) {
                       suggestionsList.innerHTML = "";
                   }
              }, 150); // Delay in ms
          }
      });


      // Show suggestions again on focus if there's already text
      searchInput.addEventListener("focus", () => {
        if (searchInput.value.trim()) {
            showSuggestions(searchInput.value.trim());
        }
      });
  } else {
      console.warn("Search input or suggestions list element not found. Search functionality disabled.");
  }

  // --- Filter Dropdown Listeners ---
  [industryFilter, categoryFilter, propertyFilter].forEach(filterElement => {
      if (filterElement) {
          filterElement.addEventListener("change", () => {
              // Perform search using the current value in the search input
              const currentQuery = searchInput ? searchInput.value : "";
              performSearch(currentQuery);
          });
      } else {
          console.warn("A filter dropdown element was not found.");
      }
  });

  // --- Results Container Click Listener (Event Delegation) ---
  if (resultsContainer) {
      resultsContainer.addEventListener("click", (event) => {
        let targetElement = event.target;

        // --- Handle Tag Click ---
        if (targetElement.classList.contains("tag")) {
          const clickedTag = targetElement.textContent.trim(); // Trim tag text
          console.log("Tag clicked:", clickedTag);
          const industryPrefix = "industry:";
          let searchTriggered = false;

          // Check if tag is an industry tag
          if (clickedTag.startsWith(industryPrefix)) {
            const industry = clickedTag.substring(industryPrefix.length);
            // Update industry filter if valid and different, reset property filter
            if (industryFilter && [...industryFilter.options].some(opt => opt.value === industry)) {
                 if (industryFilter.value !== industry) { industryFilter.value = industry; searchTriggered = true; }
                 if (propertyFilter && propertyFilter.value !== "") { propertyFilter.value = ""; searchTriggered = true; }
            } else { console.warn(`Industry filter option not found: ${industry}`); }
          }
          // Else, check if it's a general property tag
          else {
            // Update property filter if valid and different, reset industry filter
            if (propertyFilter && [...propertyFilter.options].some(opt => opt.value === clickedTag)) {
                if (propertyFilter.value !== clickedTag) { propertyFilter.value = clickedTag; searchTriggered = true; }
                if (industryFilter && industryFilter.value !== "") { industryFilter.value = ""; searchTriggered = true; }
            } else { console.warn(`Property filter option not found: ${clickedTag}`); }
          }

          // Trigger search only if a filter value was actually changed
          if (searchTriggered) {
              const currentQuery = searchInput ? searchInput.value : "";
              performSearch(currentQuery);
          }
        }
        // --- Handle Material Card Click ---
        else {
            // Find the closest ancestor element with the class 'material-card'
            const card = targetElement.closest('.material-card');
            if (card) {
                const materialName = card.dataset.materialName; // Get name from data attribute

                if (materialName) {
                    // Construct the URL for the detail page
                    const encodedName = encodeURIComponent(materialName);
                    const url = `material_detail.html?material=${encodedName}`;
                    console.log('Navigating to material detail:', url);
                    // Navigate the browser to the detail page
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
