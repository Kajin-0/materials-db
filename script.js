
let materials = [];

fetch('materials.json')
  .then(response => response.json())
  .then(data => {
    materials = data;
    setupSearch();
  });

function setupSearch() {
  const options = {
    keys: ['name', 'formula', 'synonyms'],
    threshold: 0.4
  };
  const fuse = new Fuse(materials, options);
  const searchBox = document.getElementById('searchBox');
  const results = document.getElementById('results');

  searchBox.addEventListener('input', () => {
    const query = searchBox.value;
    const result = fuse.search(query).map(r => r.item);
    displayResults(result);
  });

  displayResults(materials); // initial render
}

function displayResults(items) {
  const results = document.getElementById('results');
  results.innerHTML = '';
  items.forEach(m => {
    const div = document.createElement('div');
    div.className = 'material';
    div.innerHTML = `
      <strong>${m.name}</strong><br>
      Formula: ${m.formula}<br>
      Bandgap: ${m.bandgap} eV<br>
      Lattice Constant: ${m.lattice_constant} Å<br>
      Category: ${m.category}
    `;
    results.appendChild(div);
  });
}
