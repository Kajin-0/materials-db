
let allMaterials = [];
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

  const industries = [...new Set(materials.flatMap(m => (m.tags || []).filter(t => t.startsWith("industry:")).map(t => t.replace("industry:", ""))))].sort();
  const categories = [...new Set(materials.map(m => m.category))].sort();
  const tags = [...new Set(materials.flatMap(m => m.tags || []).filter(t => !t.startsWith("industry:")))].sort();

  function populate(select, list) {
    select.innerHTML = "";
    select.append(new Option("All", ""));
    list.forEach(t => select.append(new Option(t, t)));
  }

  populate(industrySelect, industries);
  populate(categorySelect, categories);
  populate(propertySelect, tags);
}

async function loadMaterials(file) {
  const res = await fetch("data/" + file);
  const data = await res.json();
  allMaterials = data;
  render(data);
}

function runFilter() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const industry = document.getElementById("industryFilter").value;
  const category = document.getElementById("categoryFilter").value;
  const tag = document.getElementById("propertyFilter").value;

  document.getElementById("toolbar").style.display = query ? "flex" : "none";
  const matches = indexData.filter(m => {
    const text = [m.name, m.formula].join(" ").toLowerCase();
    const q = !query || text.includes(query);
    const i = !industry || m.tags.includes("industry:" + industry);
    const c = !category || m.category === category;
    const t = !tag || m.tags.includes(tag);
    return q && i && c && t;
  });

  if (matches.length > 0) {
    loadMaterials(matches[0].file); // Load the file that contains results
  } else {
    render([]);
  }
}

function render(materials) {
  const container = document.getElementById("results");
  container.innerHTML = "";
  if (!materials.length) {
    container.innerHTML = "<p>No materials found.</p>";
    return;
  }
  materials.forEach(m => {
    const div = document.createElement("div");
    div.className = "material-card";
    div.innerHTML = `
      <h2>${m.name}</h2>
      <p><strong>Formula:</strong> ${m.formula}</p>
      <p><strong>Category:</strong> ${m.category}</p>
      <div class="tags">${(m.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}</div>
    `;
    container.appendChild(div);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadIndex();
  document.getElementById("searchInput").addEventListener("input", runFilter);
  document.getElementById("industryFilter").addEventListener("change", runFilter);
  document.getElementById("categoryFilter").addEventListener("change", runFilter);
  document.getElementById("propertyFilter").addEventListener("change", runFilter);
});
