# Usage Guide

This guide explains how to use the materials database and add new materials.

## Searching for materials

You can search for materials by name, chemical formula, category, or tags using the search bar on the home page. The search uses fuzzy matching to handle partial names and misspellings. Search results display summary cards for each material.

**Examples:**
- Enter `HgCdTe` or `mercury cadmium telluride` to find the HgCdTe material.
- Enter `semiconductor` to list all materials in the semiconductor category.
- Enter `density > 5` to filter by density (future feature; not yet implemented).

## Viewing material details

Click a material card to open its detail page. Each material page includes:

- **Name, formula, synonyms, and category**
- **Description** – A summary of the material’s properties and uses
- **Safety** – Toxicity, handling, protective measures, disposal and storage notes
- **Identification** – CAS number, phase information, space group, lattice parameters and band structure information
- **Appearance** – Common appearance and color
- **Phase diagram and fabrication notes**
- **Applications** – Example uses

## Periodic Table Navigation

The periodic table view displays the elements and highlights those contained in your materials database. Clicking an element filters materials containing that element.

## Adding new materials

1. Edit the appropriate `materials-<letter>.json` file in the `data/` directory. Add a new entry with keys:

   - `name`
   - `formula`
   - `synonyms` (array of strings)
   - `category`
   - `tags` (array of classification tags)
   - Optional: other metadata

2. Add detailed information to `material_details.json` using the material’s name as the key. Follow the existing schema. Include fields such as `description`, `safety`, `identification`, `appearance`, `fabrication`, `applications` and citations.

3. If creating a new tag, update `tagTaxonomy.js` to include the tag and its category.

4. Commit your changes following the guidelines in CONTRIBUTING.md.

## Data schema

- `materials-*.json` – Array of material objects with summarised fields.
- `material_details.json` – Detailed dictionary keyed by material name.
- `periodic_table_data.js` – Static definitions for each element.

Ensure all numeric values include units and citations where possible.

## FAQ

**Why are some materials missing detailed data?**
The project is a work in progress. See `MATERIAL_STATUS.md` for missing entries and contribute!

**How can I integrate this database into my project?**
Clone the repository, run a local web server, and read the JSON files directly or build your own API layer.

---

For more information, see README.md or open an issue.
