
const input = document.getElementById("landingSearch");
const list = document.getElementById("autocompleteList");
const tagContainer = document.getElementById("popularTags");

const fuse = new Fuse(materials, {
  keys: ["name", "formula", "synonyms", "tags"],
  threshold: 0.3
});

// Get unique tags from all materials
const allTags = [...new Set(materials.flatMap(m => m.tags || []))];

// Get N random tags
function getRandomTags(count = 10) {
  return [...allTags].sort(() => 0.5 - Math.random()).slice(0, count);
}

// Render random tags under search
function renderTags() {
  tagContainer.innerHTML = "";
  const tags = getRandomTags();
  tags.forEach(tag => {
    const tagEl = document.createElement("span");
    tagEl.className = "tag";
    tagEl.textContent = tag;
    tagEl.onclick = () => {
      input.value = tag;
      window.location.href = `index.html?q=${encodeURIComponent(tag)}`;
    };
    tagContainer.appendChild(tagEl);
  });
}
renderTags();

input.addEventListener("input", () => {
  const val = input.value.trim();
  list.innerHTML = "";
  if (!val) return;
  const results = fuse.search(val).slice(0, 5);
  results.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r.item.name;
    li.onclick = () => {
      window.location.href = `search.html?q=${encodeURIComponent(r.item.name)}`;
    };
    list.appendChild(li);
  });
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const val = input.value.trim();
    if (val) {
      window.location.href = `search.html?q=${encodeURIComponent(val)}`;
    }
  }
});
