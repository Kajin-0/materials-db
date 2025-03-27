
let indexData = [];
let fuse;

async function loadIndex() {
  const res = await fetch("data/materials-index.json");
  indexData = await res.json();

  fuse = new Fuse(indexData, {
    keys: ["name", "formula", "synonyms"],
    threshold: 0.3,
    includeScore: true,
  includeMatches: true,
  });

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
  const industry = document.getElementById("industryFilter").value;
  const category = document.getElementById("categoryFilter").value;
  const tag = document.getElementById("propertyFilter").value;
  document.getElementById("toolbar").style.display = query ? "flex" : "none";

  let results = fuse.search(query).map(x => x.item);

  results = results.filter(m =>
    (!industry || m.tags.includes("industry:" + industry)) &&
    (!category || m.category === category) &&
    (!tag || m.tags.includes(tag))
  );

  if (!results.length) return render([]);

  const neededFiles = [...new Set(results.map(m => m.file))];
  loadMaterialsByFiles(neededFiles).then(allMaterials => {
    const shown = allMaterials.filter(m => results.find(r => r.name === m.name));
    render(shown);
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


let selectedSuggestion = -1;
function showSuggestions(query) {

  const suggestions = fuse.search(query, { limit: 8 }).map(x => x.item.name);
  const ul = document.getElementById("suggestions");
  ul.innerHTML = "";
  
  const ul = document.getElementById("suggestions");
  ul.innerHTML = "";
  selectedSuggestion = -1;
  fuse.search(query, { limit: 8 }).forEach((result, index) => {
    const name = result.item.name;
    const li = document.createElement("li");

    // Highlight matched characters
    const match = result.matches?.find(m => m.key === "name");
    if (match) {
      let highlighted = "";
      let lastIndex = 0;
      for (const [start, end] of match.indices) {
        highlighted += name.slice(lastIndex, start) + "<mark>" + name.slice(start, end + 1) + "</mark>";
        lastIndex = end + 1;
      }
      highlighted += name.slice(lastIndex);
      li.innerHTML = highlighted;
    } else {
      li.textContent = name;
    }

    li.dataset.name = name;
    li.onclick = () => {
      document.getElementById("searchInput").value = name;
      ul.innerHTML = "";
      performSearch(name);
    };
    ul.appendChild(li);
  });

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
    const ul = document.getElementById("suggestions");
    const items = ul.querySelectorAll("li");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (items.length > 0) {
        selectedSuggestion = (selectedSuggestion + 1) % items.length;
        items.forEach((li, i) => li.classList.toggle("active", i === selectedSuggestion));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length > 0) {
        selectedSuggestion = (selectedSuggestion - 1 + items.length) % items.length;
        items.forEach((li, i) => li.classList.toggle("active", i === selectedSuggestion));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedSuggestion >= 0 && items[selectedSuggestion]) {
        const name = items[selectedSuggestion].dataset.name;
        document.getElementById("searchInput").value = name;
        ul.innerHTML = "";
        performSearch(name);
      } else {
        ul.innerHTML = "";
        performSearch(input.value.trim());
      }
    }
  });

    if (e.key === "Enter") {
      e.preventDefault();
      const query = input.value.trim();
      document.getElementById("suggestions").innerHTML = "";
      performSearch(query);
    }
  });

  document.getElementById("industryFilter").addEventListener("change", () => performSearch(input.value.trim()));
  document.getElementById("categoryFilter").addEventListener("change", () => performSearch(input.value.trim()));
  document.getElementById("propertyFilter").addEventListener("change", () => performSearch(input.value.trim()));
});
