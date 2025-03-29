/**
 * Loads material data for the detail page.
 * 1. Infers the data filename based on the material name's first letter (e.g., M -> materials-m.json).
 * 2. Validates this filename against the sources listed in materials-index.json.
 * 3. Fetches the specific data file (expected to be an array, like materials-m.json).
 * 4. Finds the material object within the array by name.
 * 5. Populates the detail page using AVAILABLE FLAT data from the object.
 * 6. Marks fields requiring unavailable nested data as N/A.
 */
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Get Material Name from URL Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");
    const materialName = materialNameParam ? decodeURIComponent(materialNameParam) : null;

    console.log("[Detail Page] Attempting to load details for:", materialName);

    const header = document.querySelector('.detail-header');
    const mainContainer = document.querySelector('main');
    const nameElement = document.getElementById("material-name"); // Get reference early

    if (!materialName) {
        if (nameElement) nameElement.textContent = "Material not specified.";
        console.error("[Detail Page] No material specified in URL.");
        return;
    }

    try {
        // --- Infer Filename and Validate Against Index ---
        if (materialName.length === 0) {
            throw new Error("Material name is empty.");
        }
        const firstLetter = materialName.charAt(0).toLowerCase();
        const targetFilename = `materials-${firstLetter}.json`;
        console.log(`[Detail Page] Inferred target data file: ${targetFilename}`);

        // Fetch index to validate the inferred filename exists
        console.log("[Detail Page] Fetching index: data/materials-index.json (expecting {sources: [...]} format)");
        const indexRes = await fetch("data/materials-index.json");
        if (!indexRes.ok) {
            throw new Error(`HTTP error! status: ${indexRes.status} - Could not fetch index.`);
        }
        const indexData = await indexRes.json(); // Expecting { sources: [...] }

        // Validate index structure
        if (!indexData || typeof indexData !== 'object' || !Array.isArray(indexData.sources)) {
             throw new Error(`Invalid index format in data/materials-index.json. Expected object with a "sources" array.`);
        }
        console.log("[Detail Page] Index loaded. Sources:", indexData.sources);

        // Check if the inferred filename is listed in the sources
        if (!indexData.sources.includes(targetFilename)) {
            console.error(`[Detail Page] Inferred file "${targetFilename}" not found in sources listed in data/materials-index.json.`);
            throw new Error(`Could not locate the data file (${targetFilename}) for "${materialName}" in the index.`);
        }
        console.log(`[Detail Page] Validated: "${targetFilename}" exists in index sources.`);

        // --- Fetch the Specific Material Data File ---
        const materialFilePath = "data/" + targetFilename; // e.g., data/materials-m.json
        console.log("[Detail Page] Fetching material file:", materialFilePath, "(expecting array format inside)");
        const matRes = await fetch(materialFilePath);
        if (!matRes.ok) {
            throw new Error(`HTTP error! status: ${matRes.status} - Could not fetch ${materialFilePath}`);
        }

        // Assume the file contains an ARRAY - find the material within it using 'name' key
        const matDataArray = await matRes.json(); // Expecting Array e.g., [{...HgCdTe...}]
         if (!Array.isArray(matDataArray)) {
             throw new Error(`Data format error: ${materialFilePath} MUST be a JSON array [...]. Received type: ${typeof matDataArray}`);
         }
        console.log("[Detail Page] Material data file loaded (as array):", matDataArray);

        // Find the specific material object within the loaded array (case-insensitive)
        const material = matDataArray.find(m => m.name && m.name.toLowerCase() === materialName.toLowerCase());

        if (!material) {
            console.error(`[Detail Page] Material "${materialName}" not found within the file ${materialFilePath}.`);
            throw new Error(`Data for "${materialName}" not found in ${targetFilename}.`);
        }
        console.log("[Detail Page] Specific material object found:", material);


        // --- Populate the Page with AVAILABLE data ---
        populatePage(material);

    } catch (e) {
        console.error("[Detail Page] Failed to load material:", e);
        if (nameElement) nameElement.textContent = "Error loading material.";
        if (mainContainer) mainContainer.innerHTML = `<p class="error-message">Error loading material details: ${e.message}. Check console.</p>`;
    }
});


/**
 * Populates the HTML elements with data found in the material object.
 * Uses data directly available in the FLAT object loaded (e.g., from materials-m.json).
 * Sets other fields requiring nested data to N/A.
 * @param {object} material - The FLAT material data object (e.g., from materials-m.json).
 */
function populatePage(material) {
     // Helper to update element text content IF element exists
     const updateText = (id, value, fallback = null) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = (value !== null && typeof value !== 'undefined' && value !== '') ? String(value) : (fallback !== null ? fallback : element.textContent);
         }
    };

    console.log("[Detail Page] Populating page with data:", material);

    // Populate Core Fields (Should work with materials-m.json)
    updateText('material-name', material.name, 'Unknown Material');
    updateText('material-formula', material.formula, '');
    updateText('material-description', material.description, 'No description available.');

    // Populate Tags (Should work with materials-m.json)
    const tagsContainer = document.getElementById('material-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = ''; // Clear loading text
        const tags = material.tags || [];
        if (Array.isArray(tags) && tags.length > 0) {
            tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = typeof tag === 'string' ? tag.replace(/^\w+:/, "") : tag; // Keep user's tag formatting
                tagsContainer.appendChild(tagElement);
            });
        } else {
            updateText('material-tags', 'N/A');
        }
    }

    // Attempt generic population for prop-* fields from top-level data
    console.log("[Detail Page] Attempting generic population for prop-* fields from flat data...");
    Object.entries(material).forEach(([key, value]) => {
        const elementId = "prop-" + key.toLowerCase().replace(/_/g, '-'); // e.g., category -> prop-category
        const element = document.getElementById(elementId);
        if (element) {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                 element.textContent = String(value);
                 console.log(`[Detail Page] Populated ${elementId} with top-level value: ${value}`);
            } else if (key === 'synonyms' && Array.isArray(value)) {
                 element.textContent = value.join(', ');
                 console.log(`[Detail Page] Populated ${elementId} with synonyms: ${value.join(', ')}`);
            }
        }
    });

    // Explicitly Set N/A for fields known to require NESTED data (not in materials-m.json)
    console.log("[Detail Page] Setting N/A for fields requiring nested data...");
    const detailedPropsIDs = [
        'prop-toxicity', 'prop-handling', 'prop-cas', 'prop-class',
        'prop-bandgap-type', 'prop-bandgap', 'prop-e-mobility', 'prop-h-mobility',
        'prop-spectral-range', 'prop-cutoff-wl', 'prop-ref-index',
        'prop-op-temp', 'prop-therm-cond', 'prop-melt-pt',
        'prop-synth', 'prop-forms'
    ];
    detailedPropsIDs.forEach(id => {
        const element = document.getElementById(id);
        // Only set to N/A if it's still showing "Loading..." (or empty)
        if (element && (element.textContent === 'Loading...' || element.textContent === '')) {
             updateText(id, 'N/A');
        }
    });

    console.log("[Detail Page] Page population attempt complete.");
}
