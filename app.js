
function filterMaterials(materials, query, industries, categories, tags) {
  return materials.filter(m => {
    const qMatch = !query || [m.name, m.formula, ...m.synonyms].join(" ").toLowerCase().includes(query.toLowerCase());
    const iMatch = !industries.length || industries.some(i => (m.tags || []).includes("industry:" + i));
    const cMatch = !categories.length || categories.includes(m.category);
    const tMatch = !tags.length || tags.some(t => (m.tags || []).includes(t));
    return qMatch && iMatch && cMatch && tMatch;
  });
}

function render(materials) {
  const out = document.getElementById("results");
  out.innerHTML = "";
  if (!materials.length) {
    out.innerHTML = "<p>No materials found.</p>";
    return;
  }
  materials.forEach(m => {
    const el = document.createElement("div");
    el.className = "material-card";
    el.innerHTML = `
      <h2>${m.name}</h2>
      <p><strong>Formula:</strong> ${m.formula}</p>
      <p><strong>Category:</strong> ${m.category}</p>
      <div class="tags">${(m.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}</div>
    `;
    out.appendChild(el);
  });
}

function updateFilters(materials) {
  const selects = {
    industryFilter: "industry:",
    categoryFilter: null,
    propertyFilter: null
  };

  for (const [id, prefix] of Object.entries(selects)) {
    const select = document.getElementById(id);
    const values = prefix
      ? [...new Set(materials.flatMap(m => (m.tags || []).filter(t => t.startsWith(prefix)).map(t => t.replace(prefix, ""))))].sort()
      : id === "categoryFilter"
        ? [...new Set(materials.map(m => m.category))].sort()
        : [...new Set(materials.flatMap(m => m.tags || []).filter(t => !t.startsWith("industry:")))].sort();

    select.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All";
    select.appendChild(allOption);
    for (const val of values) {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    }
  }
}

function getSelectedValues(select) {
  return Array.from(select.selectedOptions).map(o => o.value).filter(v => v !== "");
}

function runFilter() {
  const query = document.getElementById("searchInput").value.trim();
  const showFilters = query.length > 0;
  document.getElementById("toolbar").style.display = showFilters ? "flex" : "none";

  const industries = getSelectedValues(document.getElementById("industryFilter"));
  const categories = getSelectedValues(document.getElementById("categoryFilter"));
  const tags = getSelectedValues(document.getElementById("propertyFilter"));

  const results = filterMaterials(window.materials, query, industries, categories, tags);
  render(results);
}

document.addEventListener("DOMContentLoaded", () => {
  updateFilters(window.materials);
  render([]);
  document.getElementById("toolbar").style.display = "none";

  document.getElementById("searchInput").addEventListener("input", runFilter);
  document.getElementById("industryFilter").addEventListener("change", runFilter);
  document.getElementById("categoryFilter").addEventListener("change", runFilter);
  document.getElementById("propertyFilter").addEventListener("change", runFilter);
});
