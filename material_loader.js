/**
 * Loads DETAILED material data for the detail page.
 * 1. Fetches a dedicated JSON file (data/material_details.json).
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
            if (detailRes.status === 404) {
                 throw new Error(`Detailed data file not found at ${detailDataPath}. Create this file to enable detail views.`);
            } else {
                 throw new Error(`HTTP error! status: ${detailRes.status} - Could not fetch ${detailDataPath}`);
            }
        }

        const allDetailData = await detailRes.json();
        console.log("[Detail Page] Detailed data loaded:", allDetailData);

         if (typeof allDetailData !== 'object' || allDetailData === null) {
             throw new Error(`Data format error: ${detailDataPath} MUST be a JSON object { "Material Name": {details...} }. Received type: ${typeof allDetailData}`);
         }

        // --- Find the specific material data using the name as the key ---
        const material = allDetailData[materialName];

        if (!material) {
             throw new Error(`Detailed information for "${materialName}" is not yet available in ${detailDataPath}.`);
        }
        console.log("[Detail Page] Specific detailed material object found:", material);

        // --- Populate the Page using the nested data ---
        populatePage(material);

    } catch (e) {
        console.error("[Detail Page] Failed to load material details:", e);
        if (nameElement) nameElement.textContent = "Error loading details.";
        if (mainContainer) mainContainer.innerHTML = `<p class="error-message">Error loading material details: ${e.message}. Check console.</p>`;
    }
});

/**
 * Populates the HTML elements with data from the material object,
 * including accessing nested properties using dot notation paths.
 * @param {object} material - The detailed material data object.
 */
function populatePage(material) {
    // Helper function to safely get potentially nested data and provide fallback
    const getData = (obj, path, fallback = 'N/A') => {
        const value = path.split('.').reduce((o, key) => (o && typeof o === 'object' && o[key] !== 'undefined' && o[key] !== null) ? o[key] : undefined, obj);
        if (typeof value === 'object' && typeof value.value !== 'undefined') {
           let text = String(value.value);
           if (value.unit) text += ` ${value.unit}`;
           if (value.notes) text += ` (${value.notes})`;
           return text;
        }
        if (Array.isArray(value)) {
            // Format arrays, join with newline for lists
            const listPaths = [
                'device_applications.common_applications',
                'processing_availability.synthesis_methods',
                'processing_availability.forms',
                'device_applications.sensor_types',
                'growth_fabrication.common_growth_methods', // Added path
                // Add other paths here if they contain arrays needing list format
            ];
            if (listPaths.includes(path)) {
                 return value.length > 0 ? value.map(item => `• ${item}`).join('<br>') : fallback;
            }
            return value.length > 0 ? value.join(', ') : fallback; // Default comma join
        }
        return (value !== null && typeof value !== 'undefined' && value !== '') ? String(value) : fallback;
    };

    // Helper to update element text content or HTML if needed
    const updateContent = (id, value, isHtml = false) => {
       const element = document.getElementById(id);
       if (element) {
           // Clear existing "Loading..." before setting new content
           if (element.textContent === 'Loading...') element.innerHTML = ''; // Use innerHTML to clear potential leftover HTML

           if (isHtml) {
               element.innerHTML = value;
           } else {
               element.textContent = value;
           }
           // Add 'N/A' class if value is the fallback
           if (value === 'N/A') {
                element.classList.add('na-value');
           } else {
                element.classList.remove('na-value');
           }
       } else {
            console.warn(`[Detail Page] Element with ID "${id}" not found.`);
       }
   };


    console.log("[Detail Page] Populating page with detailed nested data:", material);

    // --- Populate Header & Overview ---
    updateContent('material-name', getData(material, 'name', 'Unknown Material'));
    updateContent('material-formula', getData(material, 'formula', ''));
    updateContent('material-description', getData(material, 'description'));

    // --- Populate Tags ---
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
            updateContent('material-tags', 'N/A');
        }
    }

    // --- Populate Safety ---
    updateContent('prop-toxicity', getData(material, 'safety.toxicity'));
    updateContent('prop-handling', getData(material, 'safety.handling'));

    // --- Populate Identification & Structure ---
    updateContent('prop-cas', getData(material, 'identification.cas_number'));
    updateContent('prop-category', getData(material, 'category'));
    updateContent('prop-class', getData(material, 'identification.class'));
    updateContent('prop-crystal-structure', getData(material, 'identification.crystal_structure'));
    updateContent('prop-lattice-constant', getData(material, 'identification.lattice_constant'));
    updateContent('prop-phase-diagram', getData(material, 'identification.phase_diagram_notes')); // New

    // --- Populate Growth & Fabrication Properties ---
    updateContent('prop-common-growth-methods', getData(material, 'growth_fabrication_properties.common_growth_methods')); // New
    updateContent('prop-source-materials', getData(material, 'growth_fabrication_properties.source_materials_purity')); // New, renamed path slightly
    updateContent('prop-preferred-substrates', getData(material, 'growth_fabrication_properties.preferred_substrates_orientations')); // Renamed path
    updateContent('prop-crystal-orientations', getData(material, 'growth_fabrication_properties.preferred_substrates_orientations')); // Re-use same data for now, or split in JSON
    updateContent('prop-growth-parameters', getData(material, 'growth_fabrication_properties.typical_growth_parameters')); // New
    updateContent('prop-passivation', getData(material, 'growth_fabrication_properties.passivation_methods')); // Path fixed

    // --- Populate Post-Growth Processing ---
    updateContent('prop-annealing', getData(material, 'post_growth_processing.annealing')); // New
    updateContent('prop-lapping-polishing', getData(material, 'post_growth_processing.lapping_polishing')); // New
    updateContent('prop-etching', getData(material, 'post_growth_processing.etching')); // New, replacing chemical_properties.etchability
    updateContent('prop-grinding-milling', getData(material, 'post_growth_processing.grinding_milling')); // New

    // --- Populate Electrical Properties ---
    updateContent('prop-bandgap-type', getData(material, 'electrical_properties.bandgap_type'));
    updateContent('prop-bandgap', getData(material, 'electrical_properties.band_gap'));
    updateContent('prop-hansen-eq', getData(material, 'electrical_properties.bandgap_equation.hansen_eg'));
    updateContent('prop-lambda-eq', getData(material, 'electrical_properties.bandgap_equation.wavelength_relation'));
    updateContent('prop-common-dopants', getData(material, 'electrical_properties.common_dopants'));
    updateContent('prop-carrier-concentration', getData(material, 'electrical_properties.carrier_concentration'));
    updateContent('prop-e-mobility', getData(material, 'electrical_properties.electron_mobility'));
    updateContent('prop-h-mobility', getData(material, 'electrical_properties.hole_mobility'));
    updateContent('prop-dielectric-constant', getData(material, 'electrical_properties.dielectric_constant'));
    updateContent('prop-resistivity', getData(material, 'electrical_properties.resistivity'));
    updateContent('prop-breakdown-field', getData(material, 'electrical_properties.breakdown_field'));

    // --- Populate Optical Properties ---
    updateContent('prop-spectral-range', getData(material, 'optical_properties.spectral_range'));
     const spectralNotes = getData(material, 'optical_properties.notes', ''); // Notes handled as before
     const spectralRangeElement = document.getElementById('prop-spectral-range');
     if (spectralRangeElement && spectralNotes && spectralNotes !== 'N/A') {
         if (!spectralRangeElement.textContent.includes(spectralNotes)) {
             spectralRangeElement.textContent += ` (${spectralNotes})`;
         }
     }
    updateContent('prop-cutoff-wl', getData(material, 'optical_properties.cutoff_wavelength'));
    updateContent('prop-ref-index', getData(material, 'optical_properties.refractive_index'));
    updateContent('prop-absorption-coefficient', getData(material, 'optical_properties.absorption_coefficient'));
    updateContent('prop-quantum-efficiency', getData(material, 'optical_properties.quantum_efficiency'));
    updateContent('prop-responsivity', getData(material, 'optical_properties.responsivity'));
    updateContent('prop-noise-equivalent-power', getData(material, 'optical_properties.noise_equivalent_power'));

    // --- Populate Thermal Properties ---
    updateContent('prop-op-temp', getData(material, 'thermal_properties.operating_temperature'));
    updateContent('prop-therm-cond', getData(material, 'thermal_properties.thermal_conductivity'));
    updateContent('prop-specific-heat', getData(material, 'thermal_properties.specific_heat'));
    updateContent('prop-melt-pt', getData(material, 'thermal_properties.melting_point'));

    // --- Populate Mechanical Properties ---
    updateContent('prop-density', getData(material, 'mechanical_properties.density'));
    updateContent('prop-youngs-modulus', getData(material, 'mechanical_properties.youngs_modulus'));
    updateContent('prop-hardness-vickers', getData(material, 'mechanical_properties.hardness_vickers'));
    updateContent('prop-poissons-ratio', getData(material, 'mechanical_properties.poissons_ratio'));
    updateContent('prop-fracture-toughness', getData(material, 'mechanical_properties.fracture_toughness'));

    // --- Populate Device Applications ---
    updateContent('prop-sensor-types', getData(material, 'device_applications.sensor_types'), true); // Use HTML for lists
    updateContent('prop-common-applications', getData(material, 'device_applications.common_applications'), true); // Use HTML for lists

    // --- Populate Chemical Properties ---
    updateContent('prop-stability-oxidation', getData(material, 'chemical_properties.stability_oxidation')); // Renamed ID

    // --- Populate Magnetic Properties ---
    updateContent('prop-magnetic-type', getData(material, 'magnetic_properties.type'));

    // --- Populate Processing & Availability (Now only has synthesis/forms) ---
    // updateContent('prop-synth', getData(material, 'processing_availability.synthesis_methods'), true); // Redundant? Already in growth_fabrication
    // updateContent('prop-forms', getData(material, 'processing_availability.forms'), true); // Redundant?

    // --- Populate Vendor Info ---
    const vendorList = document.getElementById('vendor-list');
    if (vendorList && material.vendor_info) {
        vendorList.innerHTML = ''; // Clear loading
        let vendorsFound = false;
        if(material.vendor_info.notes) {
            const li = document.createElement('li');
            li.innerHTML = `<small><em>${material.vendor_info.notes}</em></small>`;
            vendorList.appendChild(li);
        }
        Object.entries(material.vendor_info).forEach(([key, value]) => {
            if (key.startsWith('vendor_')) {
                 vendorsFound = true;
                 const li = document.createElement('li');
                 const vendorName = key.replace('vendor_', '').replace(/_/g, ' ');
                 let isUrl = false; try { if (value && typeof value === 'string') { new URL(value); isUrl = true; } } catch (_) {}
                 if(isUrl) {
                     const a = document.createElement('a');
                     let displayName = vendorName; try { displayName = new URL(value).hostname.replace('www.', ''); } catch (_) {}
                     a.href = value; a.textContent = displayName; a.target = "_blank"; a.rel = "noopener noreferrer";
                     li.appendChild(a);
                 } else { li.textContent = `${vendorName}: ${value}`; }
                 vendorList.appendChild(li);
            }
        });
         if (!vendorsFound) {
            const li = document.createElement('li'); li.textContent = "Vendor information not available.";
            if(!material.vendor_info.notes) vendorList.appendChild(li);
        }
    } else if (vendorList) {
         vendorList.innerHTML = '<li>Vendor information not available.</li>';
    }


    console.log("[Detail Page] Page population attempt complete.");
}
