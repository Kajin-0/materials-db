
document.addEventListener("DOMContentLoaded", () => {
  const taxonomy = window.tagTaxonomy;
  const toolbar = document.getElementById("toolbar");
  toolbar.innerHTML = ""; // Clear default

  function createFilterGroup(title, tags, idPrefix) {
    const groupDiv = document.createElement("div");
    groupDiv.className = "filter-block";

    const titleEl = document.createElement("h3");
    titleEl.textContent = title;
    groupDiv.appendChild(titleEl);

    tags.forEach(tag => {
      const label = document.createElement("label");
      label.className = "checkbox-label";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = tag;
      input.name = idPrefix;

      input.addEventListener("change", runFilter);
      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + tag));
      groupDiv.appendChild(label);
    });

    return groupDiv;
  }

  for (const [category, tags] of Object.entries(taxonomy)) {
    const title = category.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
    toolbar.appendChild(createFilterGroup(title, tags, category));
  }

  document.getElementById("searchInput").addEventListener("input", runFilter);
});

function runFilter() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const toolbar = document.getElementById("toolbar");
  toolbar.style.display = query ? "block" : "none";

  const checkedTags = Array.from(document.querySelectorAll("#toolbar input:checked")).map(i => i.value.toLowerCase());
  const results = window.materials.filter(m => {
    const content = [m.name, m.formula, ...(m.synonyms || [])].join(" ").toLowerCase();
    const matchesQuery = !query || content.includes(query);
    const materialTags = (m.tags || []).map(t => t.toLowerCase());
    const matchesTags = checkedTags.every(tag => materialTags.includes(tag));
    return matchesQuery && matchesTags;
  });

  render(results);
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
