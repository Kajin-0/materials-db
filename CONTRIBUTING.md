# Contributing to materials‑db

Thank you for your interest in improving materials‑db! Our goal is to build an open, accurate and comprehensive materials database. This document describes how you can contribute new materials, correct existing entries and improve the codebase.

## Adding a New Material

1. Locate the correct `materials‑*.json` file (e.g. `materials‑a.json` for materials whose names start with “A”). Add an object with the following fields:
   * `name` – The official name of the material.
   * `formula` – The chemical formula. Use proper capitalization and formatting.
   * `synonyms` – An array of alternate names, abbreviations or trade names.
   * `category` – A high‑level classification (e.g. Element, Compound, Composite, Polymer).
   * `tags` – A list of keywords describing properties, applications or domains.

2. If detailed information is available, add an entry to `material_details.json` using the exact material name as the top‑level key. Provide as much of the following as possible:
   * `description` – A concise overview of the material.
   * `safety` – Information about toxicity, handling precautions and disposal.
   * `identification` – CAS number, crystal structure, space group, lattice constants, density, melting point and other identifiers.
   * `phase_diagram` – Notes on phase diagrams or transitions.
   * `appearance` – Colour, texture, and other notable visual traits.
   * `fabrication_notes` – Notes on stoichiometry control, doping/alloying strategies, process parameters and growth techniques.
   * Wherever possible include units and references (DOIs or URLs) in parentheses.

3. Test your additions by opening `index.html` and searching for the new material. Ensure the material appears in the results and its detail page renders correctly.

4. Commit your changes using a descriptive message, such as `Add material X to materials‑b.json and details`.

## Coding Standards

* Use UTF‑8 encoding for all files.
* Format JSON with two‑space indentation and no trailing commas.
* Keep arrays in `materials‑*.json` sorted alphabetically by `name` to minimize merge conflicts.
* Include citations for data sources in comments or documentation where appropriate.

## Pull Requests

1. Fork the repository and create a feature branch from `main`.
2. Make your changes, ensuring that they do not break the application.
3. Describe your changes clearly in the pull request. Reference any issues that the pull request addresses.
4. A project maintainer will review your submission. Please be prepared to make revisions or provide additional information.

## Data Quality

We strive for complete and reliable data. When adding or updating values:

* Verify numeric properties against authoritative sources.
* Use consistent units and include units explicitly (e.g., density in g cm⁻³).
* Avoid duplicate entries by checking existing materials and synonyms.
* If a property is unknown, omit it rather than guessing or leaving a placeholder.

## Reporting Issues

If you find an error or omission, please open an issue on GitHub. Provide as much context as possible (material name, property in question, source of correct data). Community contributions are invaluable in keeping the database accurate and up to date.

## Contact

For questions or discussion, use the GitHub Issues page. We welcome feedback and new contributors!
