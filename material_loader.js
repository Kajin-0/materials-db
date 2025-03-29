document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const materialName = urlParams.get("material");
  if (!materialName) {
    document.getElementById("material-name").textContent = "Material not specified.";
    return;
  }

  try {
    const indexRes = await fetch("data/materials-index.json");
    const indexData = await indexRes.json();
    const entry = indexData.find(m => m.name.toLowerCase() === materialName.toLowerCase());
    if (!entry) {
      document.getElementById("material-name").textContent = "Material not found.";
      return;
    }

    const matRes = await fetch("data/" + entry.file);
    const matData = await matRes.json();
    const material = matData.find(m => m.name.toLowerCase() === materialName.toLowerCase());

    if (!material) {
      document.getElementById("material-name").textContent = "Material not found in file.";
      return;
    }

    // Core fields
    document.getElementById("material-name").textContent = material.name;
    document.getElementById("material-formula").textContent = material.formula || "";
    document.getElementById("material-description").textContent = material.description || "No description available.";

    // Tags
    const tagsContainer = document.getElementById("material-tags");
    tagsContainer.innerHTML = "";
    if (material.tags && Array.isArray(material.tags)) {
      material.tags.forEach(tag => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = tag.replace(/^\w+:/, ""); // hide prefix
        tagsContainer.appendChild(span);
      });
    }

    // Populate any prop-* fields
    Object.entries(material).forEach(([key, value]) => {
      const el = document.getElementById("prop-" + key);
      if (el) {
        el.innerHTML = value;
      }
    });
  } catch (e) {
    console.error("Failed to load material:", e);
    document.getElementById("material-name").textContent = "Error loading material.";
  }
});