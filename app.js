<pre><code>let indexData = [];
let allMaterialsData = {}; // To store loaded material files
let fuse;

async function loadIndex() {
try {
const res = await fetch("./data/materials-index.json"); // Added "./"
if (!res.ok) {
console.error("Failed to load materials index:", res.status);
return;
}
indexData = await res.json();

fuse = new Fuse(indexData, {
keys: ["name", "formula", "synonyms"],
threshold: 0.3,
includeScore: true,
});

updateFilters(indexData);
} catch (error) {
console.error("Error loading index:", error);
}
}

async function loadMaterialsByFiles(files) {
const materials = [];
for (const file of new Set(files)) {
const filePath = `./data/${file}`; // Added "./"
if (!allMaterialsData.hasOwnProperty(filePath)) {
try {
const res = await fetch(filePath);
if (!res.ok) {
console.error(`Failed to load data file: ${filePath}`, res.status);
continue;
}
allMaterialsData[`./data/${file}`] = await res.json(); // Keep with "./"
} catch (error) {
console.error(`Error loading data file: ${filePath}`, error);
}
}
if (allMaterialsData.hasOwnProperty(filePath)) {
const key = `./data/${file}`; // Use the same key
materials.push(...allMaterialsData[`${key}`]);
}
}
return materials;
}

function updateFilters(materials) {
const industrySelect = document.getElementById("industryFilter");
const categorySelect = document.getElementById("categoryFilter");
const propertySelect = document.getElementById("propertyFilter");

const industries = [...new Set(materials.flatMap(m => (m.tags || []).filter(t => t.startsWith("industry:")).map(t => t.replace("industry:", ""))))].sort();
const categories = [...new Set(materials.map(m => m.category))].sort();
const tags = [...new Set(materials.flatMap(m => m.tags || []).filter(t => !t.startsWith("industry:"))].sort();

function fill(sel, items) {
sel.innerHTML = "<option value=''>All</option>" + items.map(i => `<option value="${i}">${i}</option>`).join("");
}

fill(industrySelect, industries);
fill(categorySelect, categories);
fill(propertySelect, tags);
}

function performSearch(query) {
const industry = document.getElementById("industryFilter").value;
const category = document.getElementById("categoryFilter").value;
const tag = document.getElementById("propertyFilter").value;
const toolbar = document.getElementById("toolbar");
toolbar.classList.toggle("active", query.trim() !== "");

let searchResults = query.trim() ? fuse.search(query).map(x => x.item) : indexData;

let filteredResults = searchResults.filter(m =>
(!industry || (m.tags && m.tags.includes("industry:" + industry))) &&
(!category || m.category === category) &&
(!tag || (m.tags && m.tags.includes(tag)))
);

if (!filteredResults.length) {
render([]);
return;
}

const neededFiles = [...new Set(filteredResults.map(m => m.file))];
loadMaterialsByFiles(neededFiles).then(loadedMaterials => {
const shownMaterials = loadedMaterials.filter(loaded =>
filteredResults.some(result => result.name === loaded.name)
);
render(shownMaterials);
});
}

function render(materials) {
const out = document.getElementById("results");
out.innerHTML = "";
if (!materials.length) {
return; // The CSS will handle the "No materials found" message
}

for (const m of materials) {
const el = document.createElement("div");
el.className = "material-card";
el.innerHTML = `
<h2>${m.name}</h2>
<p><strong>Formula:</strong> ${m.formula || 'N/A'}</p>
<p><strong>Category:</strong> ${m.category || 'N/A'}</p>
<div class="tags">${(m.tags || []).map(t => `<span class='tag'>${t}</span>`).join("")}</div>
`;
out.appendChild(el);
}
}

function showSuggestions(query) {
const ul = document.getElementById("suggestions");
if (!fuse) {
ul.innerHTML = "<li class='disabled'>Loading suggestions...</li>";
return;
}
const results = fuse.search(query, { limit: 8 }).map(x => x.item.name);
ul.innerHTML = "";
results.forEach(name => {
const li = document.createElement("li");
li.textContent = name;
li.addEventListener("click", () => {
document.getElementById("searchInput").value = name;
ul.innerHTML = "";
performSearch(name);
});
ul.appendChild(li);
});
if (results.length === 0 && query.trim() !== "") {
const li = document.createElement("li");
li.classList.add("disabled");
li.textContent = "No matching materials";
ul.appendChild(li);
}
}

document.addEventListener("DOMContentLoaded", () => {
loadIndex();
const input = document.getElementById("searchInput");
const suggestions = document.getElementById("suggestions");

input.addEventListener("input", () => {
const q = input.value.trim();
if (!q) {
suggestions.innerHTML = "";
performSearch(""); // Show all (from index) when input is cleared
return;
}
showSuggestions(q);
});

input.addEventListener("focus", () => {
if (input.value.trim()) {
showSuggestions(input.value.trim());
}
});

input.addEventListener("blur", () => {
setTimeout(() => {
suggestions.innerHTML = "";
}, 200);
});

input.addEventListener("keydown", e => {
if (e.key === "Enter") {
e.preventDefault();
const query = input.value.trim();
suggestions.innerHTML = "";
performSearch(query);
}
});

document.getElementById("industryFilter").addEventListener("change", () => performSearch(input.value.trim()));
document.getElementById("categoryFilter").addEventListener("change", () => performSearch(input.value.trim()));
document.getElementById("propertyFilter").addEventListener("change", () => performSearch(input.value.trim()));
});
</code></pre>
