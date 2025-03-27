<pre><code>// Global variables for data and Fuse.js instance
let indexData = [];
let allMaterialsData = {}; // Cache for loaded material files (e.g., {'./data/materials-b.json': [...]})
let fuse;

// Function to load the main index file
async function loadIndex() {
try {
// Fetch using relative path, suitable for GitHub Pages
const res = await fetch("./data/materials-index.json");
if (!res.ok) {
console.error("Failed to load materials index:", res.status, res.statusText);
document.getElementById("results").innerHTML = `<p style="color: red; text-align: center;">Error: Could not load material index. Check console (F12) and file paths.</p>`;
return;
}
indexData = await res.json();

// Initialize Fuse.js for searching the index data
fuse = new Fuse(indexData, {
keys: ["name", "formula", "synonyms"],
threshold: 0.3, // Adjust sensitivity as needed
includeScore: true,
});

// Populate filter dropdowns based on the index data
updateFilters(indexData);

console.log("Material index loaded successfully.");
// Initially display a message or potentially all materials (if desired)
performSearch(""); // Perform an initial empty search to show all or a message

} catch (error) {
console.error("Error loading or processing index:", error);
document.getElementById("results").innerHTML = `<p style="color: red; text-align: center;">Error processing material index. Check console (F12).</p>`;
}
}

// Function to populate filter dropdowns
function updateFilters(materials) {
const industrySelect = document.getElementById("industryFilter");
const categorySelect = document.getElementById("categoryFilter");
const propertySelect = document.getElementById("propertyFilter");

// Extract unique, sorted values for filters from the index data
const industries = [...new Set(materials.flatMap(m => (m.tags || []).filter(t => t.startsWith("industry:")).map(t => t.replace("industry:", ""))))].sort();
const categories = [...new Set(materials.map(m => m.category).filter(Boolean))].sort(); // Filter out null/undefined categories
const tags = [...new Set(materials.flatMap(m => m.tags || []).filter(t => !t.startsWith("industry:"))].sort();

// Helper function to fill a select element
function fill(sel, items) {
// Keep the "All" option, add others
sel.innerHTML = "<option value=''>All</option>" + items.map(i => `<option value="${i}">${i}</option>`).join("");
}

fill(industrySelect, industries);
fill(categorySelect, categories);
fill(propertySelect, tags);
console.log("Filters updated.");
}

// Function to load specific material data files as needed
async function loadMaterialsByFiles(files) {
const materials = [];
const filesToLoad = new Set(files); // Use a Set for unique file names

for (const file of filesToLoad) {
const filePath = `./data/${file}`; // Use relative path

// Check cache first
if (!allMaterialsData.hasOwnProperty(filePath)) {
console.log(`Fetching ${filePath}...`);
try {
const res = await fetch(filePath);
if (!res.ok) {
console.error(`Failed to load data file: ${filePath}`, res.status, res.statusText);
// Optionally notify the user or skip this file
continue; // Skip to the next file if one fails
}
const data = await res.json();
allMaterialsData[filePath] = data; // Cache the loaded data
console.log(`Cached ${filePath}`);
} catch (error) {
console.error(`Error loading or parsing data file: ${filePath}`, error);
// Optionally notify the user
continue; // Skip to the next file on error
}
} else {
// console.log(`Using cached ${filePath}`); // For debugging
}

// Add materials from the (now cached) file to the list
if (allMaterialsData.hasOwnProperty(filePath)) {
// Ensure the data is an array before spreading
if (Array.isArray(allMaterialsData[filePath])) {
materials.push(...allMaterialsData[filePath]);
} else {
console.warn(`Data in ${filePath} is not an array.`);
}
}
}
return materials; // Return combined materials from all loaded files
}

// Function to perform search and filtering
function performSearch(query) {
console.log(`Performing search for query: "${query}"`);
const resultsContainer = document.getElementById("results");
resultsContainer.innerHTML = '<p style="text-align: center; color: #777;">Loading results...</p>'; // Provide loading feedback


if (!fuse) {
console.warn("Fuse.js not initialized yet.");
resultsContainer.innerHTML = '<p style="text-align: center; color: #999;">Search index not ready.</p>';
return; // Exit if Fuse isn't ready
}

// Get filter values
const industry = document.getElementById("industryFilter").value;
const category = document.getElementById("categoryFilter").value;
const tag = document.getElementById("propertyFilter").value;

// Show/hide toolbar based on query presence
const toolbar = document.getElementById("toolbar");
toolbar.classList.toggle("active", query.trim() !== "" || industry || category || tag); // Show if query OR filters active

// 1. Perform fuzzy search on the index data if there's a query
let searchResults = query.trim() ? fuse.search(query).map(x => x.item) : indexData;

// 2. Filter the index results based on selected dropdown values
let filteredIndexResults = searchResults.filter(m =>
(!industry || (m.tags && m.tags.includes("industry:" + industry))) &&
(!category || m.category === category) &&
(!tag || (m.tags && m.tags.includes(tag)))
);

// 3. Check if any results remain after filtering
if (!filteredIndexResults.length) {
console.log("No matching materials found in index after filtering.");
render([]); // Render an empty list (CSS will show the message)
return;
}

// 4. Determine which data files are needed based on filtered index results
const neededFiles = [...new Set(filteredIndexResults.map(m => m.file).filter(Boolean))]; // Filter out any undefined file refs
if (!neededFiles.length) {
console.warn("Filtered results found, but no associated data files listed.");
render([]);
return;
}
console.log("Needed data files:", neededFiles);


// 5. Load the required data files (async)
loadMaterialsByFiles(neededFiles).then(loadedMaterials => {
// 6. Filter the fully loaded materials to match *only* those in filteredIndexResults
// This is crucial because a file might contain materials not matching the current filters
const finalMaterialsToShow = loadedMaterials.filter(loadedMaterial =>
filteredIndexResults.some(indexResult => indexResult.name === loadedMaterial.name)
);

console.log(`Rendering ${finalMaterialsToShow.length} materials.`);
render(finalMaterialsToShow); // Render the final list
}).catch(error => {
console.error("Error during material loading and rendering:", error);
resultsContainer.innerHTML = `<p style="color: red; text-align: center;">Error loading material details. Check console (F12).</p>`;
});
}

// Function to render the material cards
function render(materials) {
const out = document.getElementById("results");
out.innerHTML = ""; // Clear previous results or loading message

if (!materials || !materials.length) {
// The CSS :empty::after pseudo-element will display the "No materials found" message
console.log("Render: No materials to display.");
return;
}

// Create and append cards for each material
for (const m of materials) {
const el = document.createElement("div");
el.className = "material-card";
// Basic error checking for properties
const formula = m.formula || 'N/A';
const category = m.category || 'N/A';
const tagsHtml = (m.tags || []).map(t => `<span class='tag'>${t}</span>`).join(" "); // Add space between tags

el.innerHTML = `
<h2>${m.name || 'Unnamed Material'}</h2>
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
ul.innerHTML = ""; // Clear previous suggestions

if (!fuse) {
// Optionally show a loading state, but usually suggestions are fast
return;
}

// Get suggestions from Fuse.js based on the index
const results = fuse.search(query, { limit: 8 }); // Limit suggestions
const suggestionNames = results.map(x => x.item.name);

if (suggestionNames.length > 0) {
suggestionNames.forEach(name => {
const li = document.createElement("li");
li.textContent = name;
// Use 'mousedown' instead of 'click' to fire before 'blur'
li.addEventListener("mousedown", (e) => {
e.preventDefault(); // Prevent input blur
document.getElementById("searchInput").value = name;
ul.innerHTML = ""; // Clear suggestions
performSearch(name); // Perform search with selected suggestion
});
ul.appendChild(li);
});
} else if (query.trim() !== "") {
// Optionally show "No suggestions" - might be noisy
// const li = document.createElement("li");
// li.classList.add("disabled");
// li.textContent = "No suggestions";
// ul.appendChild(li);
}
}

// --- Event Listeners Setup ---
document.addEventListener("DOMContentLoaded", () => {
console.log("DOM fully loaded and parsed.");
loadIndex(); // Start loading the index data

const searchInput = document.getElementById("searchInput");
const suggestionsList = document.getElementById("suggestions");

// Handle search input typing
searchInput.addEventListener("input", () => {
const query = searchInput.value.trim();
if (query) {
showSuggestions(query);
} else {
suggestionsList.innerHTML = ""; // Clear suggestions if input is empty
performSearch(""); // Optionally reset results when cleared
}
});

// Handle Enter key in search input
searchInput.addEventListener("keydown", e => {
if (e.key === "Enter") {
e.preventDefault(); // Prevent form submission (if any)
const query = searchInput.value.trim();
suggestionsList.innerHTML = ""; // Hide suggestions
performSearch(query);
}
});

// Hide suggestions when clicking outside
// Use a slight delay on blur to allow suggestion clicks
searchInput.addEventListener("blur", () => {
setTimeout(() => {
suggestionsList.innerHTML = "";
}, 150); // Adjust delay if needed
});

// Show suggestions on focus if there's text
searchInput.addEventListener("focus", () => {
if (searchInput.value.trim()) {
showSuggestions(searchInput.value.trim());
}
});


// Add event listeners for filter dropdowns
document.getElementById("industryFilter").addEventListener("change", () => performSearch(searchInput.value.trim()));
document.getElementById("categoryFilter").addEventListener("change", () => performSearch(searchInput.value.trim()));
document.getElementById("propertyFilter").addEventListener("change", () => performSearch(searchInput.value.trim()));

// Add event listener for clicking on tags within results (event delegation)
document.getElementById("results").addEventListener("click", (event) => {
if (event.target.classList.contains("tag")) {
const clickedTag = event.target.textContent;
console.log("Tag clicked:", clickedTag);

// Try to apply the tag to the appropriate filter
const industryPrefix = "industry:";
if (clickedTag.startsWith(industryPrefix)) {
const industry = clickedTag.substring(industryPrefix.length);
document.getElementById("industryFilter").value = industry;
document.getElementById("propertyFilter").value = ""; // Clear other tag filter
} else {
// Assume it's a property tag
document.getElementById("propertyFilter").value = clickedTag;
document.getElementById("industryFilter").value = ""; // Clear industry filter
}
// Clear category filter? Optional, depending on desired behavior.
// document.getElementById("categoryFilter").value = "";

// Update search input and perform search
// searchInput.value = ""; // Optionally clear search query when clicking tag
performSearch(searchInput.value.trim()); // Re-run search with new filter
}
});

});
</code></pre>
