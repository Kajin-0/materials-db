

## Overview

Materials‑db is a searchable database of materials properties designed for engineers, scientists and researchers.  The project provides a static web application that allows users to search for materials by name, formula, category or tags.  For each material, it contains detailed information such as synonyms, category, tags, descriptions, safety considerations, identification data (CAS number, crystal structure, space group, lattice parameters, etc.), phase diagram notes, appearance, and fabrication notes.

## Features

* **Fast search** – The site uses Fuse.js to perform fuzzy searches across material names, formulas, synonyms, tags and categories.
* **Detailed material pages** – Each material page aggregates descriptive text, safety information, identification data, phase diagrams and fabrication notes to provide a comprehensive snapshot of the material.
* **Periodic table integration** – A periodic table view links each element to the materials that contain it.
* **Lightweight deployment** – The site is a static web application that can be deployed directly on GitHub Pages, Vercel, or any other static hosting service.

## Data Format

Data is stored in JSON files within the `data/` directory:

* `materials‑index.json` – Lists the source files to load (e.g. `materials-a.json`, `materials-b.json`, etc.).
* `materials‑*.json` – Each file contains an array of material objects with keys such as `name`, `formula`, `synonyms`, `category` and `tags`.
* `material_details.json` – Provides detailed information for materials keyed by material name.  Each entry may include properties such as descriptions, safety, identification, phase diagrams, appearance and fabrication notes.

Refer to the project wiki for a full schema description.

## Running Locally

No build step is required.  Simply clone the repository and open `index.html` in a web browser; the application will load the data and build the search index automatically.  For local development or testing across multiple devices you may want to run a simple web server from the repository root:

```
bash
python3 -m http.server
```

Then visit `http://localhost:8000` in your browser.  This avoids CORS issues and makes it easier to test relative paths.

## Roadmap

Upcoming improvements include:

* Exposing an API for programmatic access to the materials data.
* Adding range queries and boolean filters for properties and tags.
* Implementing a modern front‑end framework to improve responsiveness and maintainability.
* Enhancing the periodic table with interactive filtering and tooltips.

## License

Add your chosen license text here (e.g. MIT License, Apache 2.0).  A clear licence helps others know how they can use and contribute to this project.  
