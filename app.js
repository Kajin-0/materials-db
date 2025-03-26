
function filterMaterials(materials, query, industry, category, tag) {
  return materials.filter(m => {
    const qMatch = !query || [m.name, m.formula, ...m.synonyms].join(" ").toLowerCase().includes(query.toLowerCase());
    const iMatch = !industry || (m.tags || []).includes("industry:" + industry);
    const cMatch = !category || m.category === category;
    const tMatch = !tag || (m.tags || []).includes(tag);
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
  const industrySelect = document.getElementById("industryFilter");
  const categorySelect = document.getElementById("categoryFilter");
  const propertySelect = document.getElementById("propertyFilter");

  const industries = [...new Set(materials.flatMap(m => (m.tags || []).filter(t => t.startsWith("industry:")).map(t => t.replace("industry:", ""))))].sort();
  industries.forEach(i => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    industrySelect.appendChild(opt);
  });

  const categories = [...new Set(materials.map(m => m.category))].sort();
  categories.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categorySelect.appendChild(opt);
  });

  const tags = [...new Set(materials.flatMap(m => m.tags || []).filter(t => !t.startsWith("industry:")))].sort();
  tags.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    propertySelect.appendChild(opt);
  });
}

function runFilter() {
  const query = document.getElementById("searchInput").value;
  const industry = document.getElementById("industryFilter").value;
  const category = document.getElementById("categoryFilter").value;
  const tag = document.getElementById("propertyFilter").value;
  const results = filterMaterials(window.materials, query, industry, category, tag);
  render(results);
}

document.addEventListener("DOMContentLoaded", () => {
  updateFilters(window.materials);
  render(window.materials);

  document.getElementById("searchInput").addEventListener("input", runFilter);
  document.getElementById("industryFilter").addEventListener("change", runFilter);
  document.getElementById("categoryFilter").addEventListener("change", runFilter);
  document.getElementById("propertyFilter").addEventListener("change", runFilter);
});
