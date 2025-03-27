<pre><code>// Global variables
let allMaterialsData = []; // Will hold combined data from all source files
let fuse; // Fuse.js instance

// Function to fetch and parse a single JSON file
async function fetchJson(url) {
try {
const response = await fetch(url);
if (!response.ok) {
// Log specific errors for 404s which are expected if a listed file doesn't exist yet
if (response.status === 404) {
console.warn(`Source file not found (expected if not yet created): ${url}`);
} else {
console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
}
return null; // Return null for failed fetches or 404s
}
return await response.json();
} catch (error) {
console.error(`Error fetching or parsing ${url}:`, error);
return null; // Return null on other errors
}
}

// Function to load the index, then all source files, and initialize
async function initializeDatabase() {
const resultsContainer = document.getElementById("results");
resultsContainer.innerHTML = '<p style="text-align: center; color: #999;">Loading material index...</p>';

// 1. Fetch the index file containing the list of source filenames
const indexData = await fetchJson('./data/materials-index.json');

// Validate the index file structure
if (!indexData || !indexData.sources || !Array.isArray(indexData.sources)) {
console.error("Invalid or missing materials-index.json structure. Expected { \"sources\": [...] }");
resultsContainer.innerHTML = '<p style="color: red; text-align: center;">Error: Could not load material sources index. Check console (F12) and index file format.</p>';
return;
}

resultsContainer.innerHTML = '<p style="text-align: center; color: #999;">Loading material data files...</p>';
console.log("Index loaded. Sources to fetch:", indexData.sources);

// 2. Create promises for fetching all source files listed in the index
const fetchPromises = indexData.sources.map(sourceFile => {
// Basic validation of filename format
if (typeof sourceFile !== 'string' || !sourceFile.endsWith('.json')) {
console.warn(`Invalid source file entry in index: ${sourceFile}`);
return Promise.resolve(null); // Resolve immediately as null for invalid entries
}
return fetchJson(`./data/${sourceFile}`);
});


try {
// 3. Wait for all source files to be fetched concurrently
const results = await Promise.all(fetchPromises);

// 4. Combine data from all successfully fetched files into one array
// Filter out null results (failed fetches/404s) and flatten the arrays
allMaterialsData = results.flat().filter(material => material !== null);

if (allMaterialsData.length === 0) {
console.error("No material data successfully loaded from any source files listed in index.");
resultsContainer.innerHTML = '<p style="color: red; text-align: center;">Error: No material data could be loaded. Check source files exist and are valid JSON. Check console (F12).</p>';
// Keep filters disabled or show an error state
disableFilters();
return;
}

console.log(`Successfully loaded ${allMaterialsData.length} material entries from all sources.`);

// 5. Initialize Fuse.js with the combined data
fuse = new Fuse(allMaterialsData, {
keys: ["name", "formula", "synonyms", "tags"], // Include tags in search keys
threshold: 0.3, // Adjust sensitivity
includeScore: true,
// Add other Fuse options if needed
});
console.log("Fuse.js initialized.");

// 6. Populate filter dropdowns based on the loaded data
updateFilters(allMaterialsData);

// 7. Perform an initial empty search to clear loading message or show all results
performSearch("");

} catch (error) {
// Catch errors from Promise.all or subsequent processing
console.error("Error processing source files or initializing Fuse/Filters:", error);
resultsContainer.innerHTML = '<p style="color: red; text-align: center;">Error loading or processing material data. Check console (F12).</p>';
disableFilters();
}
}

// Function to disable filter dropdowns on error
function disableFilters() {
document.getElementById("industryFilter").disabled = true;
document.getElementById("categoryFilter").disabled = true;
document.getElementById("propertyFilter").disabled = true;
}


// Function to populate filter dropdowns
function updateFilters(materials) {
const industrySelect = document.getElementById("industryFilter");
const categorySelect = document.getElementById("categoryFilter");
const propertySelect = document.getElementById("propertyFilter");

// Enable filters now that data is loaded
industrySelect.disabled = false;
categorySelect.disabled = false;
propertySelect.disabled = false;

// Extract unique, sorted values
const industries = [...new Set(materials.flatMap(m => (m.tags || []).filter(t => typeof t === 'string' && t.startsWith("industry:")).map(t => t.replace("industry:", ""))))].sort();
const categories = [...new Set(materials.map(m => m.category).filter(Boolean))].sort(); // Filter out null/undefined
const tags = [...new Set(materials.flatMap(m => (m.tags || []).filter(t => typeof t === 'string' && !t.startsWith("industry:"))))].sort();

function fill(sel, items) {
sel.innerHTML = "<option value=''>All</option>" + items.map(i => `<option value="${i}">${i}</option>`).join("");
}

fill(industrySelect, industries);
fill(categorySelect, categories);
fill(propertySelect, tags);
console.log("Filters updated and enabled.");
}

// Function to perform search and filtering
function performSearch(query) {
console.log(`Performing search for query: "${query}"`);
const resultsContainer = document.getElementById("results");

// Handle case where initialization hasn't finished
if (!fuse) {
console.warn("Fuse.js not initialized yet. Search aborted.");
// Keep the loading message or show a specific "not ready" message
if (!resultsContainer.querySelector('p[style*="color: red"]')) { // Avoid overwriting error messages
resultsContainer.innerHTML = '<p style="text-align: center; color: #999;">Database is loading, please wait...</p>';
}
return;
}

// Get filter values
const industry = document.getElementById("industryFilter").value;
const category = document.getElementById("categoryFilter").value;
const tag = document.getElementById("propertyFilter").value;

// Toggle toolbar visibility
const toolbar = document.getElementById("toolbar");
toolbar.classList.toggle("active", query.trim() !== "" || industry || category || tag);

// --- Filtering Logic ---
let results = [];

// 1. Start with all data if query is empty, otherwise perform Fuse search
if (query.trim() === "") {
results = allMaterialsData;
} else {
results = fuse.search(query).map(x => x.item);
}

// 2. Apply filters sequentially
if (industry) {
results = results.filter(m => m.tags && m.tags.includes("industry:" + industry));
}
if (category) {
results = results.filter(m => m.category === category);
}
if (tag) {
results = results.filter(m => m.tags && m.tags.includes(tag));
}
// --- End Filtering Logic ---


console.log(`Found ${results.length} materials matching criteria.`);
render(results); // Render the final filtered list
}

// Function to render the material cards
function render(materials) {
const out = document.getElementById("results");
out.innerHTML = ""; // Clear previous results or messages

if (!materials || materials.length === 0) {
// CSS :empty::after will handle the "No materials found" message
console.log("Render: No materials to display.");
return;
}

// Create and append cards
for (const m of materials) {
const el = document.createElement("div");
el.className = "material-card";
// Add checks for potentially missing fields
const name = m.name || 'Unnamed Material';
const formula = m.formula || 'N/A';
const category = m.category || 'N/A';
// Ensure tags is an array and elements are strings before mapping
const tagsHtml = Array.isArray(m.tags)
? m.tags.filter(t => typeof t === 'string').map(t => `<span class='tag'>${t}</span>`).join(" ")
: '';

el.innerHTML = `
<h2>${name}</h2>
<p><strong>Formula:</strong> ${formula}</p>
<p><strong>Category:</strong> ${category}</p>
<div class="tags">${tagsHtml}</div>
`;
out.appendChild(el);
}
}

// Function to show search suggestions
function showSuggestions(query) {
const ul = document.getElementById("suggestions");
ul.innerHTML = "";

if (!fuse) {
return; // Fuse not ready
}

// Get suggestions from Fuse.js based on the combined data
const results = fuse.search(query, { limit: 8 });
const suggestionItems = results.map(x => x.item); // Get the full item for potential use

if (suggestionItems.length > 0) {
suggestionItems.forEach(item => {
const li = document.createElement("li");
li.textContent = item.name || 'Unnamed'; // Use name for suggestion text
li.addEventListener("mousedown", (e) => {
e.preventDefault(); // Prevent input blur messing with click
document.getElementById("searchInput").value = item.name || '';
ul.innerHTML = ""; // Hide suggestions
performSearch(item.name || ''); // Perform search with selected name
});
ul.appendChild(li);
});
}
// No "No suggestions" message needed, empty list is sufficient
}

// --- Event Listeners Setup ---
document.addEventListener("DOMContentLoaded", () => {
console.log("DOM fully loaded.");
initializeDatabase(); // Start loading data and initializing

const searchInput = document.getElementById("searchInput");
const suggestionsList = document.getElementById("suggestions");

// Input event for search
searchInput.addEventListener("input", () => {
const query = searchInput.value.trim();
if (query) {
showSuggestions(query);
} else {
suggestionsList.innerHTML = ""; // Clear suggestions
performSearch(""); // Show all/filtered results when input is cleared
}
});

// Enter key for search
searchInput.addEventListener("keydown", e => {
if (e.key === "Enter") {
e.preventDefault();
const query = searchInput.value.trim();
suggestionsList.innerHTML = ""; // Hide suggestions
performSearch(query);
}
});

// Hide suggestions on blur (with delay)
searchInput.addEventListener("blur", () => {
setTimeout(() => {
if (document.activeElement !== searchInput) { // Only hide if focus isn't back on input
suggestionsList.innerHTML = "";
}
}, 150);
});

// Show suggestions on focus if there's text
searchInput.addEventListener("focus", () => {
if (searchInput.value.trim()) {
showSuggestions(searchInput.value.trim());
}
});

// Filters trigger search
document.getElementById("industryFilter").addEventListener("change", () => performSearch(searchInput.value.trim()));
document.getElementById("categoryFilter").addEventListener("change", () => performSearch(searchInput.value.trim()));
document.getElementById("propertyFilter").addEventListener("change", () => performSearch(searchInput.value.trim()));

// Tag clicking in results
document.getElementById("results").addEventListener("click", (event) => {
if (event.target.classList.contains("tag")) {
const clickedTag = event.target.textContent;
console.log("Tag clicked:", clickedTag);

const industryPrefix = "industry:";
const industryFilter = document.getElementById("industryFilter");
const propertyFilter = document.getElementById("propertyFilter");

if (clickedTag.startsWith(industryPrefix)) {
const industry = clickedTag.substring(industryPrefix.length);
// Check if option exists before setting
if ([...industryFilter.options].some(opt => opt.value === industry)) {
industryFilter.value = industry;
} else {
console.warn(`Industry filter option not found for: ${industry}`);
}
propertyFilter.value = ""; // Clear other tag filter
} else {
// Check if option exists before setting
if ([...propertyFilter.options].some(opt => opt.value === clickedTag)) {
propertyFilter.value = clickedTag;
} else {
console.warn(`Property filter option not found for: ${clickedTag}`);
}
industryFilter.value = ""; // Clear industry filter
}
// Optionally clear category
// document.getElementById("categoryFilter").value = "";

// Optionally clear search input
// searchInput.value = "";

performSearch(searchInput.value.trim()); // Re-run search with new filter
}
});
});

</code></pre>
