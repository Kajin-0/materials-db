
let indexData = [];
let fuse;

async function loadIndex() {
  const res = await fetch("data/materials-index.json");
  indexData = await res.json();

  fuse = new Fuse(indexData, {
    keys: ["name", "formula", "synonyms"],
    threshold: 0.3,
    includeScore: true,
  });

  updateFilters(indexData);
}

function updateFilters(materials) {

  fill(industrySelect, industries);
  fill(categorySelect, categories);
  fill(propertySelect, tags);
}

async function loadMaterialsByFiles(files) {
  const all = {};
  for (const file of new Set(files)) {
    if (!all[file]) {
      const res = await fetch("data/" + file);
      all[file] = await res.json();
    }
  }
  return Object.values(all).flat();
}

function performSearch(query) {

function render(materials) {
  const out = document.getElementById("results");
  out.innerHTML = "";
  if (!materials.length) {
    out.innerHTML = "<p>No materials found.</p>";
    return;
  }

  for (const m of materials) {
    const el = document.createElement("div");
    el.className = "material-card";
    el.innerHTML = `
      <h2>${m.name}</h2>
      <p><strong>Formula:</strong> ${m.formula}</p>
      <p><strong>Category:</strong> ${m.category}</p>
      <div class="tags">${(m.tags || []).map(t => `<span class='tag'>${t}</span>`).join("")}</div>
    `;
    out.appendChild(el);
  }
}

function showSuggestions(query) {
  const suggestions = fuse.search(query, { limit: 8 }).map(x => x.item.name);
  const ul = document.getElementById("suggestions");
  ul.innerHTML = "";
  suggestions.forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    li.onclick = () => {
      document.getElementById("searchInput").value = name;
      ul.innerHTML = "";
      performSearch(name);
    };
    ul.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadIndex();
  const input = document.getElementById("searchInput");

  input.addEventListener("input", () => {
    const q = input.value.trim();
    const ul = document.getElementById("suggestions");
    if (!q) {
      ul.innerHTML = "";
      return;
    }
    showSuggestions(q);
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = input.value.trim();
      document.getElementById("suggestions").innerHTML = "";
      performSearch(query);
    }
  });
