
async function fetchMaterial(name) {
  const indexRes = await fetch('data/materials-index.json');
  const index = await indexRes.json();
  const entry = index.find(m => m.name.toLowerCase() === name.toLowerCase());
  if (!entry) throw new Error("Material not found in index.");
  const fileRes = await fetch('data/' + entry.file);
  const data = await fileRes.json();
  return data.find(m => m.name.toLowerCase() === name.toLowerCase());
}

function getMaterialParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get("material");
}

function populateMaterial(material) {
  document.getElementById("material-name").textContent = material.name;
  document.getElementById("material-formula").textContent = material.formula || "";

  const content = document.getElementById("material-content");
  content.innerHTML = "";

  const section = document.createElement("section");
  section.className = "material-section";
  section.innerHTML = "<h2>Basic Information</h2>";
  const dl = document.createElement("dl");
  dl.className = "property-list";

  for (const key of ["category", "synonyms", "tags"]) {
    if (material[key]) {
      const item = document.createElement("div");
      item.className = "property-item";
      item.innerHTML = `
        <dt class="property-key">${key.charAt(0).toUpperCase() + key.slice(1)}</dt>
        <dd class="property-value">${Array.isArray(material[key]) ? material[key].join(", ") : material[key]}</dd>
      `;
      dl.appendChild(item);
    }
  }

  section.appendChild(dl);
  content.appendChild(section);
}

(async () => {
  const name = getMaterialParam();
  if (!name) return;
  try {
    const material = await fetchMaterial(name);
    populateMaterial(material);
  } catch (err) {
    document.getElementById("material-content").innerHTML = "<p style='color: red;'>Error loading material: " + err.message + "</p>";
  }
})();
