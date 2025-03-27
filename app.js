<pre><code>
// Force redeploy test
  
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
// This is expected for files not yet created, log as warning
console.warn(`Source file not found (404): ${url}`);
} else {
// Log other fetch errors more prominently
console.error(`Fetch Error for ${url}: ${response.status} ${response.statusText}`);
}
return null; // Indicate failure
}
// Try parsing JSON
try {
const data = await response.json();
// **Crucial Check:** Ensure the data from source files is an array
if (!Array.isArray(data)) {
console.error(`Data format error: Content of ${url} is not a JSON array.`);
return null; // Treat non-array content as an error
}
console.log(`Successfully fetched and parsed: ${url}`);
return data;
} catch (parseError) {
console.error(`JSON Parse Error in ${url}:`, parseError);
return null; // Indicate failure due to parsing error
}
} catch (networkError) {
console.error(`Network Error fetching ${url}:`, networkError);
return null; // Indicate failure
}
}

// Loads index, fetches all sources, initializes Fuse.js and UI
async function initializeDatabase() {
const resultsContainer = document.getElementById("results");
updateLoadingMessage("Loading material index...");
console.log("Initializing database...");

const indexData = await fetchJson('./data/materials-index.json');

if (!indexData || !indexData.sources || !Array.isArray(indexData.sources)) {
console.error("Failed to load or invalid format: ./data/materials-index.json. Expected { \"sources\": [...] }");
updateLoadingMessage("Error: Could not load material index. Check console (F12).", true);
disableFilters();
return;
}

updateLoadingMessage(`Loading ${indexData.sources.length} source files...`);
console.log("Index loaded. Sources:", indexData.sources);

const fetchPromises = indexData.sources
.filter(sourceFile => typeof sourceFile === 'string' && sourceFile.endsWith('.json')) // Ensure valid entries
.map(sourceFile => fetchJson(`./data/${sourceFile}`));

if (fetchPromises.length !== indexData.sources.length) {
console.warn("Some entries in materials-index.json sources were invalid filenames.");
}

if (fetchPromises.length === 0) {
console.error("No valid source files listed in materials-index.json.");
updateLoadingMessage("Error: No valid source files found in index. Check console (F12).", true);
disableFilters();
return;
}

try {
const results = await Promise.all(fetchPromises);

// Combine valid results (which should all be arrays)
// Filter out nulls (fetch/parse errors) before flattening
allMaterialsData = results.filter(data => data !== null).flat();

console.log(`Total materials loaded after filtering and flattening: ${allMaterialsData.length}`);

if (allMaterialsData.length === 0) {
console.error("Failed to load any valid material data from source files.");
updateLoadingMessage("Error: No material data loaded. Check source files and console (F12).", true);
disableFilters();
return;
}

updateLoadingMessage("Initializing search index...");

// Initialize Fuse.js
try {
fuse = new Fuse(allMaterialsData, {
keys: ["name", "formula", "synonyms", "tags"],
threshold: 0.3,
includeScore: true,
ignoreLocation: true, // Useful for keyword matching across fields
});
console.log("Fuse.js initialized successfully.");
} catch (fuseError) {
console.error("Error initializing Fuse.js:", fuseError);
updateLoadingMessage("Error: Failed to initialize search index. Check console (F12).", true);
disableFilters();
return;
}


updateLoadingMessage("Updating filters...");
// Populate filters
updateFilters(allMaterialsData);

updateLoadingMessage(""); // Clear loading message
// Perform initial display (e.g., show all or prompt)
performSearch("");
console.log("Database initialization complete.");

} catch (error) {
// Catch potential errors from Promise.all itself, though individual errors are handled in fetchJson
console.error("Unexpected error during source file processing:", error);
updateLoadingMessage("Error: Failed to process material data. Check console (F12).", true);
disableFilters();
}
}

// --- UI and Filtering ---

// Updates loading message in the results area
function updateLoadingMessage(message, isError = false) {
const resultsContainer = document.getElementById("results");
if (message) {
resultsContainer.innerHTML = `<p style="text-align: center; color: ${isError ? 'red' : '#777'};">${message}</p>`;
} else {
// Clear message only if it's not an error, otherwise leave error showing
if (!resultsContainer.querySelector('p[style*="color: red"]')) {
resultsContainer.innerHTML = '';
}
}
}

// Disables filter dropdowns
function disableFilters() {
try {
document.getElementById("industryFilter").disabled = true;
document.getElementById("categoryFilter").disabled = true;
document.getElementById("propertyFilter").disabled = true;
console.log("Filters disabled due to error.");
} catch (e) { console.error("Error disabling filters:", e); }
}


// Populates filter dropdowns
function updateFilters(materials) {
try {
const industrySelect = document.getElementById("industryFilter");
const categorySelect = document.getElementById("categoryFilter");
const propertySelect = document.getElementById("propertyFilter");

// Ensure elements exist before proceeding
if (!industrySelect || !categorySelect || !propertySelect) {
console.error("Filter select elements not found in the DOM.");
return;
}

industrySelect.disabled = false;
categorySelect.disabled = false;
propertySelect.disabled = false;

const industries = [...new Set(materials.flatMap(m => (m.tags || []).filter(t => typeof t === 'string' && t.startsWith("industry:")).map(t => t.replace("industry:", ""))))].sort();
const categories = [...new Set(materials.map(m => m.category).filter(Boolean))].sort();
const tags = [...new Set(materials.flatMap(m => (m.tags || []).filter(t => typeof t === 'string' && !t.startsWith("industry:"))))].sort();

function fill(sel, items) {
sel.innerHTML = "<option value=''>All</option>" + items.map(i => `<option value="${i}">${i}</option>`).join("");
}

fill(industrySelect, industries);
fill(categorySelect, categories);
fill(propertySelect, tags);
console.log("Filters updated and enabled.");
} catch (error) {
console.error("Error updating filters:", error);
updateLoadingMessage("Error: Failed to update filters. Check console (F12).", true);
disableFilters();
}
}

// Performs search and filtering
function performSearch(query) {
console.log(`Performing search. Query: "${query}"`);
const resultsContainer = document.getElementById("results");

// Explicit check if Fuse is ready
if (!fuse) {
console.warn("Search called before Fuse.js was initialized.");
// Do not overwrite critical error messages
if (!resultsContainer.querySelector('p[style*="color: red"]')) {
updateLoadingMessage("Database loading, please wait...", false);
}
return;
}

// Get filter values (ensure elements exist)
const industryFilter = document.getElementById("industryFilter");
const categoryFilter = document.getElementById("categoryFilter");
const propertyFilter = document.getElementById("propertyFilter");
const industry = industryFilter ? industryFilter.value : "";
const category = categoryFilter ? categoryFilter.value : "";
const tag = propertyFilter ? propertyFilter.value : "";

// Toggle toolbar
const toolbar = document.getElementById("toolbar");
if (toolbar) {
toolbar.classList.toggle("active", query.trim() !== "" || industry || category || tag);
}


let results = [];
// Execute search or use all data
if (query.trim() === "") {
results = allMaterialsData;
console.log(`Query empty, starting with ${results.length} total materials.`);
} else {
console.log(`Executing Fuse search for "${query}"...`);
const fuseResults = fuse.search(query);
results = fuseResults.map(x => x.item);
console.log(`Fuse search returned ${results.length} initial matches.`);
}

// Apply filters
const initialCount = results.length;
if (industry) {
results = results.filter(m => m.tags && Array.isArray(m.tags) && m.tags.includes("industry:" + industry));
console.log(`After industry filter ('${industry}'): ${results.length} materials remaining.`);
}
if (category) {
results = results.filter(m => m.category === category);
console.log(`After category filter ('${category}'): ${results.length} materials remaining.`);
}
if (tag) {
results = results.filter(m => m.tags && Array.isArray(m.tags) && m.tags.includes(tag));
console.log(`After tag filter ('${tag}'): ${results.length} materials remaining.`);
}
if (industry || category || tag) {
console.log(`Filtering reduced results from ${initialCount} to ${results.length}.`);
}


render(results); // Render the final list
}

// Renders material cards
function render(materials) {
const out = document.getElementById("results");
if (!out) {
console.error("Results container (#results) not found.");
return;
}
out.innerHTML = ""; // Clear previous

if (!materials || materials.length === 0) {
console.log("Render: No materials to display.");
// CSS :empty::after handles the message
return;
}

console.log(`Render: Displaying ${materials.length} material cards.`);
// Use DocumentFragment for potential performance boost with many items
const fragment = document.createDocumentFragment();
for (const m of materials) {
const el = document.createElement("div");
el.className = "material-card";
const name = m.name || 'Unnamed Material';
const formula = m.formula || 'N/A';
const category = m.category || 'N/A';
const tagsHtml = Array.isArray(m.tags)
? m.tags.filter(t => typeof t === 'string').map(t => `<span class='tag'>${t}</span>`).join(" ")
: '';

el.innerHTML = `
<h2>${name}</h2>
<p><strong>Formula:</strong> ${formula}</p>
<p><strong>Category:</strong> ${category}</p>
<div class="tags">${tagsHtml}</div>
`;
fragment.appendChild(el);
}
out.appendChild(fragment); // Append all cards at once
}

// Shows search suggestions
function showSuggestions(query) {
const ul = document.getElementById("suggestions");
if (!ul) return; // Element check
ul.innerHTML = "";

if (!fuse) {
console.warn("Suggestions requested before Fuse was ready.");
return;
}

try {
const results = fuse.search(query, { limit: 8 });
const suggestionItems = results.map(x => x.item);

if (suggestionItems.length > 0) {
suggestionItems.forEach(item => {
if (!item || !item.name) return; // Skip if item or name is invalid
const li = document.createElement("li");
li.textContent = item.name;
li.addEventListener("mousedown", (e) => {
e.preventDefault();
const searchInput = document.getElementById("searchInput");
if(searchInput) searchInput.value = item.name;
ul.innerHTML = "";
performSearch(item.name);
});
ul.appendChild(li);
});
}
} catch (error) {
console.error("Error during suggestion generation:", error);
}
}

// --- Event Listeners Setup ---
document.addEventListener("DOMContentLoaded", () => {
console.log("DOM fully loaded. Initializing...");
initializeDatabase(); // Start the process

// Get elements (check for existence)
const searchInput = document.getElementById("searchInput");
const suggestionsList = document.getElementById("suggestions");
const resultsContainer = document.getElementById("results");
const industryFilter = document.getElementById("industryFilter");
const categoryFilter = document.getElementById("categoryFilter");
const propertyFilter = document.getElementById("propertyFilter");

if (!searchInput || !suggestionsList || !resultsContainer || !industryFilter || !categoryFilter || !propertyFilter) {
console.error("One or more essential DOM elements are missing. Check HTML IDs.");
updateLoadingMessage("Error: Page structure incorrect. Cannot initialize.", true);
return; // Stop initialization if elements are missing
}


// Search input
searchInput.addEventListener("input", () => {
const query = searchInput.value.trim();
if (query) {
showSuggestions(query);
} else {
suggestionsList.innerHTML = "";
performSearch(""); // Reset on clear
}
});

// Enter key
searchInput.addEventListener("keydown", e => {
if (e.key === "Enter") {
e.preventDefault();
const query = searchInput.value.trim();
suggestionsList.innerHTML = "";
performSearch(query);
}
});

// Blur hides suggestions
searchInput.addEventListener("blur", () => {
setTimeout(() => {
// Check if focus has moved to a suggestion - this is hard, mousedown is better
if (document.activeElement !== searchInput) {
suggestionsList.innerHTML = "";
}
}, 150);
});

// Focus shows suggestions if text exists
searchInput.addEventListener("focus", () => {
if (searchInput.value.trim()) {
showSuggestions(searchInput.value.trim());
}
});


// Filters trigger search
industryFilter.addEventListener("change", () => performSearch(searchInput.value.trim()));
categoryFilter.addEventListener("change", () => performSearch(searchInput.value.trim()));
propertyFilter.addEventListener("change", () => performSearch(searchInput.value.trim()));

// Tag clicking in results (delegated)
resultsContainer.addEventListener("click", (event) => {
if (event.target.classList.contains("tag")) {
const clickedTag = event.target.textContent;
console.log("Tag clicked:", clickedTag);

const industryPrefix = "industry:";
let searchTriggered = false;

if (clickedTag.startsWith(industryPrefix)) {
const industry = clickedTag.substring(industryPrefix.length);
if ([...industryFilter.options].some(opt => opt.value === industry)) {
if (industryFilter.value !== industry) {
industryFilter.value = industry;
searchTriggered = true;
}
if (propertyFilter.value !== "") {
propertyFilter.value = "";
searchTriggered = true;
}
} else { console.warn(`Industry filter option not found: ${industry}`); }
} else {
if ([...propertyFilter.options].some(opt => opt.value === clickedTag)) {
if (propertyFilter.value !== clickedTag) {
propertyFilter.value = clickedTag;
searchTriggered = true;
}
if (industryFilter.value !== "") {
industryFilter.value = "";
searchTriggered = true;
}
} else { console.warn(`Property filter option not found: ${clickedTag}`); }
}

// Only perform search if a filter value actually changed
if (searchTriggered) {
// Optionally clear search input:
// searchInput.value = "";
performSearch(searchInput.value.trim());
}
}
});
});
</code></pre>
