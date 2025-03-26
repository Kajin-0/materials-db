
const input = document.getElementById("landingSearch");
const list = document.getElementById("autocompleteList");

const fuse = new Fuse(materials, {
  keys: ["name", "formula", "synonyms", "tags"],
  threshold: 0.3
});

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
