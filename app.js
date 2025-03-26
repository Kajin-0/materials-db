
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

  // Make tags clickable
  document.querySelectorAll(".tag").forEach(tagEl => {
    tagEl.addEventListener("click", () => {
      document.getElementById("searchInput").value = tagEl.textContent;
      runFilter();
    });
  });
}

function updateFilters(materials) {
  const industrySelect = document.getElementById("industryFilter");
  const categorySelect = document.getElementById("categoryFilter");
  const propertySelect = document.getElementById("propertyFilter");

  const industries = [...new Set(materials.flatMap(m => (m.tags || []).filter(t => t.startsWith("industry:")).map(t => t.replace("industry:", ""))))].sort();
  const categories = [...new Set(materials.map(m => m.category))].sort();
  const tags = [...new Set(materials.flatMap(m => m.tags || []).filter(t => !t.startsWith("industry:")))].sort();

  function populateSelect(select, values) {
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

  populateSelect(industrySelect, industries);
  populateSelect(categorySelect, categories);
  populateSelect(propertySelect, tags);
}

function runFilter() {
  const query = document.getElementById("searchInput").value.trim();
  const showFilters = query.length > 0;
  document.getElementById("toolbar").style.display = showFilters ? "flex" : "none";

  const industry = document.getElementById("industryFilter").value;
  const category = document.getElementById("categoryFilter").value;
  const tag = document.getElementById("propertyFilter").value;

  const results = filterMaterials(window.materials, query, industry, category, tag);
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
