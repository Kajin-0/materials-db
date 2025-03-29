/**
 * Loads DETAILED material data for the detail page.
 * 1. Fetches a dedicated JSON file (data/material_details.json) containing detailed objects mapped by material name.
 * 2. Looks up the material using the name from the URL parameter.
 * 3. Populates the detail page using the nested data found.
 */
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Get Material Name from URL Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");
    const materialName = materialNameParam ? decodeURIComponent(materialNameParam) : null;

    console.log("[Detail Page] Attempting to load DETAILED view for:", materialName);

    const header = document.querySelector('.detail-header');
    const mainContainer = document.querySelector('main');
    const nameElement = document.getElementById("material-name");

    if (!materialName) {
        if (nameElement) nameElement.textContent = "Material not specified.";
        console.error("[Detail Page] No material specified in URL.");
        return;
    }

    try {
        // --- Fetch the DEDICATED Detail Data File ---
        const detailDataPath = "data/material_details.json";
        console.log("[Detail Page] Fetching dedicated detail data file:", detailDataPath);
        const detailRes = await fetch(detailDataPath);
        if (!detailRes.ok) {
            // Handle 404 specifically - means the detail file itself is missing
            if (detailRes.status === 404) {
                 throw new Error(`Detailed data file not found at ${detailDataPath}. Create this file to enable detail views.`);
            } else {
                 throw new Error(`HTTP error! status: ${detailRes.status} - Could not fetch ${detailDataPath}`);
            }
        }

        // Assume the file contains an OBJECT mapping names to detail objects
        const allDetailData = await detailRes.json(); // Expecting { "Material Name": { details... }, ... }
        console.log("[Detail Page] Detailed data loaded:", allDetailData);

         if (typeof allDetailData !== 'object' || allDetailData === null) {
             throw new Error(`Data format error: ${detailDataPath} MUST be a JSON object { "Material Name": {details...} }. Received type: ${typeof allDetailData}`);
         }

        // --- Find the specific material data using the name as the key ---
        const material = allDetailData[materialName]; // Direct lookup using the name

        if (!material) {
            // Material exists in index/simple files, but not in the details file yet
            console.warn(`[Detail Page] Detailed data for "${materialName}" not found in ${detailDataPath}. Displaying basic info or error.`);
            // OPTION A: Show error that detail isn't available
            // throw new Error(`Detailed information for "${materialName}" is not yet available.`);
            // OPTION B: (Harder) Try to load the *simple* data file just to show *something* basic - adds complexity back.
            // For now, let's throw the error to indicate detail is missing from the detail source.
             throw new Error(`Detailed information for "${materialName}" is not yet available in ${detailDataPath}.`);
        }
        console.log("[Detail Page] Specific detailed material object found:", material);

        // --- Populate the Page using the nested data ---
        populatePage(material); // Use the same populatePage function that handles nesting

    } catch (e) {
        console.error("[Detail Page] Failed to load material details:", e);
        if (nameElement) nameElement.textContent = "Error loading details.";
        if (mainContainer) mainContainer.innerHTML = `<p class="error-message">Error loading material details: ${e.message}. Check console.</p>`;
    }
});

/**
 * Populates the HTML elements with data from the material object,
 * including accessing nested properties using dot notation paths.
 * (This function remains the same as the previous version that handled nested data)
 * @param {object} material - The detailed material data object.
 */
function populatePage(material) {
    // Helper function to safely get potentially nested data and provide fallback
    const getData = (obj, path, fallback = 'N/A') => {
        const value = path.split('.').reduce((o, key) => (o && o[key] !== 'undefined' && o[key] !== null) ? o[key] : undefined, obj);
        if (typeof value === 'object' && typeof value.value !== 'undefined') {
           let text = String(value.value);
           if (value.unit) text += ` ${value.unit}`;
           if (value.notes) text += ` (${value.notes})`;
           return text;
        }
        if (Array.isArray(value)) {
            return value.length > 0 ? value.join(', ') : fallback;
        }
        return (value !== null && typeof value !== 'undefined' && value !== '') ? String(value) : fallback;
    };
     const updateText = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        } else {
             console.warn(`[Detail Page] Element with ID "${id}" not found.`);
        }
    };

    console.log("[Detail Page] Populating page with detailed nested data:", material);

    // Populate Header
    updateText('material-name', getData(material, 'name', 'Unknown Material'));
    updateText('material-formula', getData(material, 'formula', ''));
    // Populate Overview
    updateText('material-description', getData(material, 'description'));
    // Populate Safety
    updateText('prop-toxicity', getData(material, 'safety.toxicity'));
    updateText('prop-handling', getData(material, 'safety.handling'));
    // Populate Identification
    updateText('prop-cas', getData(material, 'identification.cas_number'));
    updateText('prop-category', getData(material, 'category')); // Use top-level category
    updateText('prop-class', getData(material, 'identification.class'));
    // Populate Electrical Properties
    updateText('prop-bandgap-type', getData(material, 'electrical_properties.bandgap_type'));
    updateText('prop-bandgap', getData(material, 'electrical_properties.band_gap'));
    updateText('prop-e-mobility', getData(material, 'electrical_properties.electron_mobility'));
    updateText('prop-h-mobility', getData(material, 'electrical_properties.hole_mobility'));
    // Populate Optical Properties
    updateText('prop-spectral-range', getData(material, 'optical_properties.spectral_range'));
    const spectralNotes = getData(material, 'optical_properties.notes', '');
    const spectralRangeElement = document.getElementById('prop-spectral-range');
    if (spectralRangeElement && spectralNotes && spectralNotes !== 'N/A') {
        spectralRangeElement.textContent += ` (${spectralNotes})`;
    }
    updateText('prop-cutoff-wl', getData(material, 'optical_properties.cutoff_wavelength'));
    updateText('prop-ref-index', getData(material, 'optical_properties.refractive_index'));
    // Populate Thermal Properties
    updateText('prop-op-temp', getData(material, 'thermal_properties.operating_temperature'));
    updateText('prop-therm-cond', getData(material, 'thermal_properties.thermal_conductivity'));
    updateText('prop-melt-pt', getData(material, 'thermal_properties.melting_point'));
    // Populate Processing & Availability
    updateText('prop-synth', getData(material, 'processing_availability.synthesis_methods'));
    updateText('prop-forms', getData(material, 'processing_availability.forms'));
    // Populate Tags
    const tagsContainer = document.getElementById('material-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
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
    console.log("[Detail Page] Page population complete.");
}
