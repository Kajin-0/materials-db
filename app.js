
let indexData = [];
let allLoadedMaterials = {};
let activeTags = [];

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

async function loadMaterialsByFiles(files) {
  const uniqueFiles = [...new Set(files)];
  let combined = [];
  for (const file of uniqueFiles) {
    if (!allLoadedMaterials[file]) {
      const res = await fetch("data/" + file);
      const data = await res.json();
      allLoadedMaterials[file] = data;
    }
    combined = combined.concat(allLoadedMaterials[file]);
  }
  return combined;
}

function runFilter() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const industry = document.getElementById("industryFilter").value;
  const category = document.getElementById("categoryFilter").value;
  const tag = document.getElementById("propertyFilter").value;

  document.getElementById("toolbar").style.display = query ? "flex" : "none";
  activeTags = [];

  const matches = indexData.filter(m => {
    const text = [m.name, m.formula].join(" ").toLowerCase();
    const q = !query || text.includes(query);
    const i = !industry || m.tags.includes("industry:" + industry);
    const c = !category || m.category === category;
    const t = !tag || m.tags.includes(tag);
    return q && i && c && t;
  });

  const neededFiles = matches.map(m => m.file);
  loadMaterialsByFiles(neededFiles).then(allMaterials => {
    const filtered = allMaterials.filter(m => matches.some(idx => idx.name === m.name));
    render(filtered);
  });
}


function render(materials) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  const filterTagSet = new Set(activeTags.map(t => t.toLowerCase()));
  const filtered = activeTags.length
    ? materials.filter(m => filterTagSet.size === 0 || [...filterTagSet].every(tag => (m.tags || []).map(t => t.toLowerCase()).includes(tag)))
    : materials;

  const summary = document.createElement("div");
  summary.className = "result-summary";
  const activeTagList = activeTags.length ? `<strong>Tags:</strong> ${activeTags.join(", ")}` : "";
  summary.innerHTML = `<p>Showing ${filtered.length} materials ${activeTagList}</p>`;
  container.appendChild(summary);

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear All Tags";
  clearBtn.className = "clear-button";
  clearBtn.onclick = () => {
    activeTags = [];
    render(materials);
  };
  container.appendChild(clearBtn);

  container.appendChild(renderTagCloud(filtered));

  if (!filtered.length) {
    const msg = document.createElement("p");
    msg.textContent = "No materials found.";
    container.appendChild(msg);
    return;
  }

  filtered.forEach(m => {
    const div = document.createElement("div");
    div.className = "material-card";
    div.innerHTML = `
      <h2>${m.name}</h2>
      <p><strong>Formula:</strong> ${m.formula}</p>
      <p><strong>Category:</strong> ${m.category}</p>
      <div class="tags">
        ${(m.tags || []).map(t => {
          const active = filterTagSet.has(t.toLowerCase()) ? "tag-active" : "";
          return `<span class="tag ${active}" data-tag="${t}">${t}</span>`;
        }).join("")}
      </div>
    `;
    container.appendChild(div);
  });

  document.querySelectorAll(".tag").forEach(tagEl => {
    tagEl.addEventListener("click", () => {
      const tag = tagEl.dataset.tag;
      const i = activeTags.indexOf(tag);
      if (i >= 0) {
        activeTags.splice(i, 1);
      } else {
        activeTags.push(tag);
      }
      render(materials);
    });
  });
}

  const container = document.getElementById("results");
  
    container.innerHTML = "";
    const summary = document.createElement("div");
    summary.className = "result-summary";
    const activeTagList = activeTags.length ? `<strong>Tags:</strong> ${activeTags.join(", ")}` : "";
    summary.innerHTML = `<p>Showing ${filtered.length} materials ${activeTagList}</p>`;
    container.appendChild(summary);
    
  if (!materials.length) {
    container.innerHTML = "<p>No materials found.</p>";
    return;
  }

  const filterTagSet = new Set(activeTags.map(t => t.toLowerCase()));
  const filtered = activeTags.length
    ? materials.filter(m => filterTagSet.size === 0 || [...filterTagSet].every(tag => (m.tags || []).map(t => t.toLowerCase()).includes(tag)))
    : materials;

  filtered.forEach(m => {
    const div = document.createElement("div");
    div.className = "material-card";
    div.innerHTML = `
      <h2>${m.name}</h2>
      <p><strong>Formula:</strong> ${m.formula}</p>
      <p><strong>Category:</strong> ${m.category}</p>
      <div class="tags">
        ${(m.tags || []).map(t => {
          const active = filterTagSet.has(t.toLowerCase()) ? "tag-active" : "";
          return `<span class="tag ${active}" data-tag="${t}">${t}</span>`;
        }).join("")}
      </div>
    `;
    container.appendChild(div);
  });

  // Add tag refinement
  document.querySelectorAll(".tag").forEach(tagEl => {
    tagEl.addEventListener("click", () => {
      const tag = tagEl.dataset.tag;
      const i = activeTags.indexOf(tag);
      if (i >= 0) {
        activeTags.splice(i, 1);
      } else {
        activeTags.push(tag);
      }
      render(materials);
    });
  });

  // Add Clear button
  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear All Tags";
  clearBtn.className = "clear-button";
  clearBtn.onclick = () => {
    activeTags = [];
    render(materials);
  };
  container.prepend(clearBtn);
}

document.addEventListener("DOMContentLoaded", () => {
  loadIndex();
  document.getElementById("searchInput").addEventListener("input", runFilter);
  document.getElementById("industryFilter").addEventListener("change", runFilter);
  document.getElementById("categoryFilter").addEventListener("change", runFilter);
  document.getElementById("propertyFilter").addEventListener("change", runFilter);
});
