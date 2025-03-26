
const urlParams = new URLSearchParams(window.location.search);
const query = urlParams.get('q') || '';
document.getElementById('searchBox').value = query;

function render(results) {
  const container = document.getElementById('results');
  container.innerHTML = '';
  results.forEach(item => {
    const m = item.item;
    const div = document.createElement('div');
    div.className = 'material';
    div.innerHTML = `
      <strong>${m.name}</strong><br>
      Formula: ${m.formula}<br>
      Category: ${m.category}<br>
      Tags: ${(m.tags || []).map(tag => `<span class="tag">${tag}</span>`).join(' ')}
    `;
    container.appendChild(div);
  });
}

const fuse = new Fuse(materials, {
  keys: ['name', 'formula', 'synonyms', 'tags'],
  threshold: 0.3
});

const results = fuse.search(query);
render(results);

document.getElementById('searchBox').addEventListener('input', (e) => {
  const newResults = fuse.search(e.target.value);
  render(newResults);
});
