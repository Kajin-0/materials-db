
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const results = document.getElementById("results");

  input.addEventListener("input", () => {
    const val = input.value.trim().toLowerCase();
    render(val ? filterMaterials(val) : []);
  });

  function filterMaterials(query) {
    return window.materials.filter(m => {
      const content = [m.name, m.formula, ...(m.synonyms || [])].join(" ").toLowerCase();
      return content.includes(query);
    });
  }

  function render(materials) {
    results.innerHTML = "";
    if (!materials.length) {
      results.innerHTML = "<p>No materials found.</p>";
      return;
    }
    materials.forEach(m => {
      const el = document.createElement("div");
      el.className = "material-card";
      el.innerHTML = `
        <h2>${m.name}</h2>
        <p><strong>Formula:</strong> ${m.formula}</p>
        <p><strong>Category:</strong> ${m.category}</p>
        <div class="tags">${(m.tags || []).map(t => `<span class="tag" data-tag="${t}">${t}</span>`).join("")}</div>
      `;
      results.appendChild(el);
    });

    document.querySelectorAll(".tag").forEach(tagEl => {
      tagEl.addEventListener("click", e => {
        input.value = tagEl.dataset.tag;
        render(filterMaterials(tagEl.dataset.tag.toLowerCase()));
      });
    });
  }
});
