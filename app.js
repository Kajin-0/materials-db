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
      .then(res => {
          if (!res.ok) {
              console.error(`Fetch failed for data/${file}: ${res.status} ${res.statusText}`);
              // Return null or an empty array to allow Promise.all to continue
              return null;
          }
          return res.json();
       })
      .then(data => {
        // Check if data is null (due to fetch error) or not an array
        if (data === null) return null; // Propagate the failure
        if (!Array.isArray(data)) {
            console.error(`Data format error in ${file}: Expected Array, got ${typeof data}`);
            // Throwing here stops Promise.all. Returning null might be better.
            return null; // Treat format error like a fetch error for continuation
        }
        return data;
      })
      .catch(error => {
          // Catch network errors or errors from .json() parsing
          console.error(`Error loading or parsing data/${file}:`, error);
          return null; // Ensure Promise.all doesn't reject entirely on one file's error
      })
  );
  // Use Promise.allSettled if you want more detail on errors,
  // but Promise.all with null returns is often sufficient here.
  return Promise.all(promises).then(results =>
      // Filter out null results (fetch/parse/format errors) before flattening
      results.filter(data => data !== null).flat()
  );
}


function initializeSearchIndex() {
  if (!materials || materials.length === 0) {
      console.warn("Attempted to initialize search index with no material data.");
      return;
  }
  fuse = new Fuse(materials, {
    keys: ['name', 'formula', 'synonyms', 'tags'],
    threshold: 0.3,
    ignoreLocation: true // Added based on previous successful versions
  });
  console.log("Fuse search index initialized.");
}

function populateFilterOptions() {
  const toolbar = document.getElementById("toolbar");
  if (!toolbar) {
      console.error("Toolbar element not found.");
      return;
  }
  toolbar.innerHTML = ""; // Clear previous options if any
  const taxonomy = window.tagTaxonomy;
  if (!taxonomy) {
      console.error("tagTaxonomy not found. Ensure tagTaxonomy.js is loaded before app.js.");
      return;
  }


  console.log("Populating filters based on taxonomy:", taxonomy);
  for (const prefix in taxonomy) {
    // Ensure the property belongs to the taxonomy object itself
    if (!Object.hasOwnProperty.call(taxonomy, prefix)) continue;

    const group = taxonomy[prefix];
    // Basic validation of the taxonomy structure
    if (!group || typeof group !== 'object' || !group.label || !Array.isArray(group.tags)) {
        console.warn(`Invalid structure for taxonomy key "${prefix}". Skipping.`);
        continue;
    }

    const div = document.createElement("div");
    div.className = "filter-group";

    const label = document.createElement("label");
    label.setAttribute("for", `${prefix}Filter`); // Improve accessibility
    label.textContent = group.label + ":";
    div.appendChild(label);

    const select = document.createElement("select");
    select.id = `${prefix}Filter`;

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All";
    select.appendChild(allOption);

    // Add options from taxonomy tags
    group.tags.forEach(tag => {
      if (typeof tag !== 'string') {
          console.warn(`Invalid tag found in taxonomy.${prefix}.tags:`, tag);
          return; // Skip non-string tags
      }
      const option = document.createElement("option");
      option.value = `${prefix}:${tag}`; // Value includes prefix
      // Display text: replace underscores, could capitalize later if desired
      option.textContent = tag.replace(/_/g, " ");
      select.appendChild(option);
    });

    select.addEventListener("change", performSearch); // Add listener
    div.appendChild(select);
    toolbar.appendChild(div);
  }
  console.log("Filter options populated.");
}


function getActiveFilters() {
  const taxonomy = window.tagTaxonomy;
  const active = [];
  if (!taxonomy) return active; // Return empty if taxonomy not loaded

  for (const prefix in taxonomy) {
     if (!Object.hasOwnProperty.call(taxonomy, prefix)) continue;
    // Check if the select element actually exists
    const filterElement = document.getElementById(`${prefix}Filter`);
    const value = filterElement?.value; // Use optional chaining
    if (value) { // Only add if a value is selected (not the "All" option)
        active.push(value);
    }
  }
  console.log("Active Filters:", active);
  return active;
}

// Check if a single material matches ALL active filters
function matchesFilters(material, filters) {
  if (!material || !Array.isArray(material.tags)) {
    return false; // Cannot match if material or tags are invalid
  }
  // .every returns true if the callback function returns true for every element
  return filters.every(filter => material.tags.includes(filter));
}


function performSearch() {
  console.log("Performing search...");
  const searchInput = document.getElementById("searchInput");
  const query = searchInput ? searchInput.value.trim() : "";
  const activeFilters = getActiveFilters();

  let results = [];

  // Ensure fuse and materials are ready
  if (!fuse || !materials) {
      console.warn("Search called before index or materials were ready.");
      displayResults([]); // Display empty results
      return;
  }

  // Start with all materials if query is empty, otherwise use Fuse search
  if (query === "") {
    results = [...materials]; // Use a copy
    console.log(`Query empty, starting with ${results.length} materials.`);
  } else {
    console.log(`Fuse searching for "${query}"...`);
    const fuseResults = fuse.search(query);
    results = fuseResults.map(result => result.item);
    console.log(`Fuse returned ${results.length} initial matches.`);
  }

  // Apply filters if any are active
  if (activeFilters.length > 0) {
    const countBeforeFilter = results.length;
    results = results.filter(m => matchesFilters(m, activeFilters));
    console.log(`Filtering reduced results from ${countBeforeFilter} to ${results.length}.`);
  } else {
      console.log("No active filters.")
  }

  displayResults(results);
}


function displayResults(results) {
  const resultsContainer = document.getElementById("results");
  const summaryElement = document.getElementById("result-summary"); // Corrected variable name

  // Ensure containers exist
  if (!resultsContainer || !summaryElement) {
      console.error("Cannot display results: #results or #result-summary element not found.");
      return;
  }

  resultsContainer.innerHTML = ""; // Clear previous results
  summaryElement.textContent = `${results.length} material(s) found`; // Update summary text

  if (!results || results.length === 0) {
      console.log("Display Results: No materials to display.");
      // Optional: Add a message directly if CSS :empty isn't desired
      // resultsContainer.innerHTML = "<p>No materials match your criteria.</p>";
      return;
  }

  console.log(`Display Results: Rendering ${results.length} cards.`);
  const fragment = document.createDocumentFragment(); // Use fragment for performance

  results.forEach(mat => {
    const card = document.createElement("div");
    card.className = "material-card";

    const title = document.createElement("h2");
    title.textContent = mat.name || "Unnamed Material";
    card.appendChild(title);

    const formula = document.createElement("p");
    // Display formula only if it exists
    if (mat.formula) {
        formula.innerHTML = `<strong>Formula:</strong> ${mat.formula}`; // Use innerHTML if formula might have special chars? Or just textContent.
        card.appendChild(formula);
    }

    // Display tags if they exist
    if (Array.isArray(mat.tags) && mat.tags.length > 0) {
      const tagContainer = document.createElement("div");
      tagContainer.className = "tags";

      mat.tags.forEach(tag => {
        if (typeof tag !== 'string') return; // Skip invalid tags

        const span = document.createElement("span");
        span.className = "tag";
        const displayTag = tag.split(":")[1]?.replace(/_/g, " ") ?? tag; // Get text after prefix, replace underscores
        span.textContent = displayTag;
        span.title = tag; // Tooltip shows the full tag with prefix

        // Add click handler to filter by this tag
        span.addEventListener("click", () => { // Use addEventListener
          // Clear search input value when tag is clicked
          const input = document.getElementById("searchInput");
          if (input) input.value = "";
          // Apply the clicked tag to the filters
          performSearchWithTag(tag);
        });
        tagContainer.appendChild(span);
      });

      card.appendChild(tagContainer);
    }

    fragment.appendChild(card); // Add card to fragment
  });

  resultsContainer.appendChild(fragment); // Append all cards at once
}


function performSearchWithTag(tag) {
  console.log(`Applying tag filter: ${tag}`);
  // Basic check for valid tag format
  if (typeof tag !== 'string' || !tag.includes(':')) {
      console.warn(`Invalid tag format passed to performSearchWithTag: ${tag}`);
      return;
  }

  const [prefix] = tag.split(":");
  const filterElement = document.getElementById(`${prefix}Filter`);

  if (filterElement) {
    // Check if this option exists before setting it
    if ([...filterElement.options].some(opt => opt.value === tag)) {
        filterElement.value = tag; // Set the dropdown to the clicked tag's value
        console.log(`Set ${prefix}Filter value to ${tag}`);
        performSearch(); // Re-run the search with the new filter applied
    } else {
        console.warn(`Option value "${tag}" not found in ${prefix}Filter dropdown.`);
    }
  } else {
      console.warn(`Filter dropdown element not found for prefix: ${prefix}`);
  }
}


function initSuggestions() {
  const input = document.getElementById("searchInput");
  const suggestions = document.getElementById("suggestions");

  if (!input || !suggestions) {
      console.error("Cannot initialize suggestions: Search input or suggestions list not found.");
      return;
  }

  input.addEventListener("input", () => {
    // Ensure materials are loaded before trying to suggest
    if (!materials || materials.length === 0) {
        suggestions.innerHTML = "";
        return;
    }

    const query = input.value.trim().toLowerCase();
    if (!query) {
      suggestions.innerHTML = "";
      return;
    }

    // Simple suggestion logic (can be improved with Fuse.js later if needed)
    const matches = materials.filter(m =>
      (m.name && m.name.toLowerCase().includes(query)) ||
      (m.formula && m.formula.toLowerCase().includes(query)) ||
      (m.synonyms && Array.isArray(m.synonyms) && m.synonyms.some(s => typeof s === 'string' && s.toLowerCase().includes(query)))
    ).slice(0, 8); // Limit suggestions

    suggestions.innerHTML = ""; // Clear previous
    matches.forEach(m => {
      const li = document.createElement("li");
      li.textContent = `${m.name || 'N/A'} (${m.formula || 'N/A'})`;
      // Use mousedown to potentially beat blur event
      li.addEventListener("mousedown", () => {
        input.value = m.name || ''; // Set input to the name
        suggestions.innerHTML = ""; // Clear suggestions
        performSearch(); // Perform search based on the selected name
      });
      suggestions.appendChild(li);
    });
  });
}

// --- Initialization ---

// Make sure the logo listener is attached only after DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM content loaded.");
    const logoElement = document.getElementById("logo");
    if (logoElement) {
        logoElement.addEventListener("click", () => location.reload());
        console.log("Logo click listener attached.");
    } else {
        console.warn("Logo element not found, click listener not attached.");
    }

    // Start loading materials after DOM is ready
    console.log("Initiating material loading...");
    updateLoadingMessage("Loading materials..."); // Show initial loading message

    loadMaterials().then(loadedData => {
      materials = loadedData;
      console.log(`Material loading complete. ${materials.length} entries loaded.`);

      if (materials.length > 0) {
          updateLoadingMessage("Initializing search...");
          initializeSearchIndex();

          updateLoadingMessage("Populating filters...");
          populateFilterOptions(); // Populate filters based on taxonomy

          updateLoadingMessage("Initializing suggestions...");
          initSuggestions(); // Initialize suggestion logic

          updateLoadingMessage(""); // Clear loading message
          performSearch(); // Perform initial search (likely empty query)
          console.log("Initialization sequence complete.");
      } else {
          // Handle case where loading finished but yielded no data
          console.error("Material loading finished, but no data was loaded successfully.");
          updateLoadingMessage("Error: Failed to load any material data.", true);
          disableFilters(); // Keep filters disabled
      }
    }).catch(error => {
        // Catch errors from the loadMaterials promise chain itself
        console.error("Error during initial material loading sequence:", error);
        updateLoadingMessage("Error: Critical failure during loading. Check console.", true);
        disableFilters();
    });
});

console.log("app.js script loaded."); // Log to confirm script execution start
