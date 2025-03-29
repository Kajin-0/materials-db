/**
 * Loads material data for the detail page.
 * 1. Infers the data filename based on the material name's first letter.
 * 2. Validates this filename against the sources listed in materials-index.json.
 * 3. Fetches the specific data file (expected to be an array).
 * 4. Finds the material object within the array by name.
 * 5. Populates the detail page using data from the object, including NESTED properties.
 */
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Get Material Name from URL Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");
    const materialName = materialNameParam ? decodeURIComponent(materialNameParam) : null;

    console.log("[Detail Page] Attempting to load details for:", materialName);

    const header = document.querySelector('.detail-header');
    const mainContainer = document.querySelector('main');
    const nameElement = document.getElementById("material-name");

    if (!materialName) {
        if (nameElement) nameElement.textContent = "Material not specified.";
        console.error("[Detail Page] No material specified in URL.");
        return;
    }

    try {
        // --- Infer Filename and Validate Against Index ---
        if (materialName.length === 0) { throw new Error("Material name is empty."); }
        const firstLetter = materialName.charAt(0).toLowerCase();
        const targetFilename = `materials-${firstLetter}.json`;
        console.log(`[Detail Page] Inferred target data file: ${targetFilename}`);

        console.log("[Detail Page] Fetching index: data/materials-index.json");
        const indexRes = await fetch("data/materials-index.json");
        if (!indexRes.ok) { throw new Error(`HTTP error! status: ${indexRes.status} - Could not fetch index.`); }
        const indexData = await indexRes.json();

        if (!indexData || typeof indexData !== 'object' || !Array.isArray(indexData.sources)) {
             throw new Error(`Invalid index format in data/materials-index.json.`);
        }
        console.log("[Detail Page] Index loaded. Sources:", indexData.sources);

        if (!indexData.sources.includes(targetFilename)) {
            throw new Error(`Could not locate the data file (${targetFilename}) for "${materialName}" in the index.`);
        }
        console.log(`[Detail Page] Validated: "${targetFilename}" exists in index sources.`);

        // --- Fetch the Specific Material Data File ---
        const materialFilePath = "data/" + targetFilename;
        console.log("[Detail Page] Fetching material file:", materialFilePath);
        const matRes = await fetch(materialFilePath);
        if (!matRes.ok) { throw new Error(`HTTP error! status: ${matRes.status} - Could not fetch ${materialFilePath}`); }

        const matDataArray = await matRes.json();
         if (!Array.isArray(matDataArray)) {
             throw new Error(`Data format error: ${materialFilePath} MUST be a JSON array.`);
         }
        console.log("[Detail Page] Material data file loaded (as array):", matDataArray);

        // Find the specific material object within the loaded array (case-insensitive)
        const material = matDataArray.find(m => m.name && m.name.toLowerCase() === materialName.toLowerCase()); // Use name key as in materials-m.json

        if (!material) {
            throw new Error(`Data for "${materialName}" not found in ${targetFilename}.`);
        }
        console.log("[Detail Page] Specific material object found:", material);


        // --- Populate the Page with AVAILABLE data (now expecting nested structure) ---
        populatePage(material);

    } catch (e) {
        console.error("[Detail Page] Failed to load material:", e);
        if (nameElement) nameElement.textContent = "Error loading material.";
        if (mainContainer) mainContainer.innerHTML = `<p class="error-message">Error loading material details: ${e.message}. Check console.</p>`;
    }
});

/**
 * Populates the HTML elements with data from the material object,
 * including accessing nested properties using dot notation paths.
 * @param {object} material - The material data object (expected to have nested structure now).
 */
function populatePage(material) {
    // Helper function to safely get potentially nested data and provide fallback
    const getData = (obj, path, fallback = 'N/A') => {
        // Navigate path e.g., 'electrical_properties.band_gap.value'
        const value = path.split('.').reduce((o, key) => (o && o[key] !== 'undefined' && o[key] !== null) ? o[key] : undefined, obj);

        // Format values that are objects with value/unit/notes
        if (typeof value === 'object' && typeof value.value !== 'undefined') {
           let text = String(value.value);
           if (value.unit) text += ` ${value.unit}`;
           if (value.notes) text += ` (${value.notes})`;
           return text;
        }
        // Format simple arrays
        if (Array.isArray(value)) {
            return value.length > 0 ? value.join(', ') : fallback;
        }
        // Return strings/numbers directly, or fallback
        return (value !== null && typeof value !== 'undefined' && value !== '') ? String(value) : fallback;
    };

     // Helper to update element text content
     const updateText = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        } else {
             console.warn(`[Detail Page] Element with ID "${id}" not found.`);
        }
    };

    console.log("[Detail Page] Populating page with potentially nested data:", material);

    // --- Populate Header ---
    updateText('material-name', getData(material, 'name', 'Unknown Material')); // 'name' is top-level
    updateText('material-formula', getData(material, 'formula', '')); // 'formula' is top-level

    // --- Populate Overview ---
    updateText('material-description', getData(material, 'description')); // 'description' is top-level

    // --- Populate Safety (using nested path) ---
    updateText('prop-toxicity', getData(material, 'safety.toxicity'));
    updateText('prop-handling', getData(material, 'safety.handling'));

    // --- Populate Identification (using nested path) ---
    updateText('prop-cas', getData(material, 'identification.cas_number'));
    updateText('prop-category', getData(material, 'category')); // 'category' is top-level
    updateText('prop-class', getData(material, 'identification.class'));

    // --- Populate Electrical Properties (using nested path) ---
    updateText('prop-bandgap-type', getData(material, 'electrical_properties.bandgap_type'));
    updateText('prop-bandgap', getData(material, 'electrical_properties.band_gap')); // Helper handles {value, unit, notes}
    updateText('prop-e-mobility', getData(material, 'electrical_properties.electron_mobility')); // Helper handles {value, unit, notes}
    updateText('prop-h-mobility', getData(material, 'electrical_properties.hole_mobility')); // Helper handles {value, unit, notes}

    // --- Populate Optical Properties (using nested path) ---
    // Note: Adding the 'notes' field separately for spectral_range as it doesn't fit the {value,unit,notes} pattern well
    updateText('prop-spectral-range', getData(material, 'optical_properties.spectral_range'));
    const spectralNotes = getData(material, 'optical_properties.notes', '');
    const spectralRangeElement = document.getElementById('prop-spectral-range');
    if (spectralRangeElement && spectralNotes && spectralNotes !== 'N/A') {
        spectralRangeElement.textContent += ` (${spectralNotes})`;
    }
    updateText('prop-cutoff-wl', getData(material, 'optical_properties.cutoff_wavelength')); // Helper handles {value, unit, notes}
    updateText('prop-ref-index', getData(material, 'optical_properties.refractive_index')); // Helper handles {value, unit, notes}

    // --- Populate Thermal Properties (using nested path) ---
    updateText('prop-op-temp', getData(material, 'thermal_properties.operating_temperature')); // Helper handles {value, unit, notes}
    updateText('prop-therm-cond', getData(material, 'thermal_properties.thermal_conductivity')); // Helper handles {value, unit, notes}
    updateText('prop-melt-pt', getData(material, 'thermal_properties.melting_point')); // Helper handles {value, unit, notes}

    // --- Populate Processing & Availability (using nested path) ---
    updateText('prop-synth', getData(material, 'processing_availability.synthesis_methods')); // Helper joins array
    updateText('prop-forms', getData(material, 'processing_availability.forms')); // Helper joins array

    // --- Populate Tags (using top-level 'tags') ---
    const tagsContainer = document.getElementById('material-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = ''; // Clear loading text
        const tags = material.tags || [];
        if (Array.isArray(tags) && tags.length > 0) {
            tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = typeof tag === 'string' ? tag.replace(/^\w+:/, "") : tag;
                tagsContainer.appendChild(tagElement);
            });
        } else {
            updateText('material-tags', 'N/A');
        }
    }

    console.log("[Detail Page] Page population attempt complete.");
}
