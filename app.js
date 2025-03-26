
let indexData = [];

async function loadIndex() {
  const res = await fetch("data/materials-index.json");
  indexData = await res.json();
  updateFilters(indexData);
}

function updateFilters(materials) {
  const industrySelect = document.getElementById("industryFilter");
  const categorySelect = document.getElementById("categoryFilter");
  const propertySelect = document.getElementById("propertyFilter");

  const industries = [...new Set(materials.flatMap(m => (m.tags || []).filter(t => t.startsWith("industry:")).map(t => t.replace("industry:", ""))))];
  const categories = [...new Set(materials.map(m => m.category))];
  const tags = [...new Set(materials.flatMap(m => m.tags || []).filter(t => !t.startsWith("industry:")))];

  function fill(sel, items) {
    sel.innerHTML = "<option value=''>All</option>" + items.map(i => `<option>${i}</option>`).join("");
  }

  fill(industrySelect, industries);
  fill(categorySelect, categories);
  fill(propertySelect, tags);
}

async function loadMaterials(file) {
  const res = await fetch("data/" + file);
  return await res.json();
}

function runFilter() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const industry = document.getElementById("industryFilter").value;
  const category = document.getElementById("categoryFilter").value;
  const tag = document.getElementById("propertyFilter").value;
  document.getElementById("toolbar").style.display = query ? "flex" : "none";

  const matches = indexData.filter(m => {
    const text = [m.name, m.formula, ...(m.synonyms || [])].join(" ").toLowerCase();
    return (!query || text.includes(query))
        && (!industry || m.tags.includes("industry:" + industry))
        && (!category || m.category === category)
        && (!tag || m.tags.includes(tag));
  });

  if (!matches.length) return render([]);

  loadMaterials(matches[0].file).then(data => {
    const filtered = data.filter(m => matches.find(x => x.name === m.name));
    render(filtered);
  });
}

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

document.addEventListener("DOMContentLoaded", () => {
  loadIndex();
  document.getElementById("searchInput").addEventListener("input", runFilter);
  document.getElementById("industryFilter").addEventListener("change", runFilter);
  document.getElementById("categoryFilter").addEventListener("change", runFilter);
  document.getElementById("propertyFilter").addEventListener("change", runFilter);
});
