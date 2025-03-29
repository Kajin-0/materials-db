/**
 * Loads DETAILED material data for the detail page.
 * Fetches data/material_details.json, finds the material, populates page.
 */
document.addEventListener("DOMContentLoaded", async () => {
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
        // Optionally display error in main container
        if(mainContainer) mainContainer.innerHTML = '<p class="error-message">Error: No material specified in the URL.</p>';
        return;
    }

    if (!mainContainer) {
        console.error("Essential element 'main' not found.");
        // Cannot display errors if main container is missing
        return;
    }

    try {
        const detailDataPath = "data/material_details.json";
        console.log("[Detail Page] Fetching dedicated detail data file:", detailDataPath);
        const detailRes = await fetch(detailDataPath);
        if (!detailRes.ok) {
            if (detailRes.status === 404) { throw new Error(`Detailed data file not found at ${detailDataPath}. Ensure the file exists and the path is correct.`); }
            else { throw new Error(`HTTP error! status: ${detailRes.status} - Could not fetch ${detailDataPath}`); }
        }

        // Attempt to parse JSON, catching syntax errors here
        let allDetailData;
        try {
            allDetailData = await detailRes.json();
        } catch (jsonError) {
            console.error(`[Detail Page] Failed to parse JSON from ${detailDataPath}:`, jsonError);
            throw new Error(`Invalid JSON format in ${detailDataPath}. Check the file content for syntax errors (e.g., trailing commas, missing quotes). ${jsonError.message}`);
        }

        console.log("[Detail Page] Detailed data loaded and parsed:", allDetailData);

         if (typeof allDetailData !== 'object' || allDetailData === null) {
             // This check might be redundant if JSON parsing already succeeded, but good practice.
             throw new Error(`Data format error in ${detailDataPath}. Expected a top-level JSON object.`);
         }

        const material = allDetailData[materialName]; // Direct lookup using the decoded name

        if (!material) {
             throw new Error(`Detailed information for "${materialName}" not found within the data loaded from ${detailDataPath}. Check if the material name exists as a key.`);
        }
        console.log("[Detail Page] Specific detailed material object found:", material);

        populatePage(material); // Call populate function

    } catch (e) {
        console.error("[Detail Page] Failed to load material details:", e);
        if (nameElement) nameElement.textContent = "Error loading details.";
        // Display error message in the main content area
        mainContainer.innerHTML = `<p class="error-message" style="color: red; padding: 1rem;">Error loading material details: ${e.message}. Please check the console for more information.</p>`;
    }
});

/**
 * Populates the HTML elements with data from the material object.
 * @param {object} material - The detailed material data object.
 */
function populatePage(material) {
    // Helper to get potentially nested data and format it
    const getData = (obj, path, fallback = 'N/A') => {
        // Navigate the path
        const value = path.split('.').reduce((o, key) => (o && typeof o === 'object' && o[key] !== undefined && o[key] !== null) ? o[key] : undefined, obj);

        // Handle undefined or null results from navigation
        if (value === undefined) {
            return fallback;
        }

        // Format objects with value/unit/notes
        if (typeof value === 'object' && !Array.isArray(value) && value.value !== undefined) {
           let text = String(value.value); // Ensure value is string
           if (value.unit) text += ` <span class="unit">${value.unit}</span>`; // Add unit span
           if (value.notes) text += ` <span class="notes">(${value.notes})</span>`; // Add notes span
           return text; // Return as HTML string
        }

        // Format arrays
        if (Array.isArray(value)) {
            // Specific paths intended for bulleted lists
            const listPathsForBullets = [
                'device_applications.key_applications',
                'device_integration_characterization.key_characterization_techniques'
            ];
            if (value.length === 0) return fallback; // Handle empty arrays

            // Check if the path needs bulleted list format
            if (listPathsForBullets.includes(path)) {
                 // Filter out empty/null items before mapping
                 return value.filter(item => item !== null && item !== undefined && String(item).trim() !== '')
                             .map(item => `<li>${item}</li>`).join(''); // Use <li> for lists
            }
            // Default for other arrays: comma-separated string
            // Filter out empty/null items before joining
            return value.filter(item => item !== null && item !== undefined && String(item).trim() !== '').join(', ');
        }

        // Handle simple values (string, number, boolean)
        return String(value); // Ensure result is always a string
    };

    // Helper to update element content (text or HTML)
    const updateContent = (id, value, isHtml = false) => {
       const element = document.getElementById(id);
       if (element) {
           // Clear potential "Loading..." placeholder if needed
           // if (element.textContent === 'Loading...') element.innerHTML = ''; // Can be simplified
           element.classList.remove('na-value'); // Reset NA class

           if (value === 'N/A' || value === '') {
               element.innerHTML = fallbackValue; // Use a consistent fallback display
               element.classList.add('na-value'); // Style N/A values
           } else if (isHtml) {
               // If expecting list items, wrap in <ul>
               if (value.startsWith('<li>')) {
                   element.innerHTML = `<ul class="property-list-items">${value}</ul>`;
               } else {
                   element.innerHTML = value;
               }
           } else {
               element.textContent = value;
           }
       } else {
           // Only log warning if the ID was expected based on HTML structure
           const expectedIds = [ /* list all expected IDs here if needed for stricter check */ ];
           // if (expectedIds.includes(id)) {
               console.warn(`[Detail Page] Element with ID "${id}" not found in the HTML.`);
           // }
       }
   };

    // Define fallback value for consistency
    const fallbackValue = '<span class="na-value">N/A</span>';

    console.log("[Detail Page] Populating page with detailed data:", material);

    // --- Populate Header, Overview, Wiki Link, Tags ---
    updateContent('material-name', getData(material, 'name', 'Unknown Material'));
    // Formula might contain subscripts, treat as HTML might be safer if formatting needed
    updateContent('material-formula', getData(material, 'formula', ''), true); // Use HTML for potential formatting
    updateContent('material-description', getData(material, 'description', fallbackValue));

    // Wiki Link specific handling
    const wikiLinkElement = document.getElementById('wiki-link');
    if (wikiLinkElement) {
        const wikiUrl = getData(material, 'wiki_link', '#');
        if (wikiUrl && wikiUrl !== '#' && wikiUrl !== fallbackValue) {
            wikiLinkElement.href = wikiUrl;
            wikiLinkElement.style.display = ''; // Ensure it's visible
        } else {
            wikiLinkElement.style.display = 'none'; // Hide if no valid link
        }
    }

    // Tags specific handling
    const tagsContainer = document.getElementById('material-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = ''; // Clear previous
        const tags = material.tags || [];
        if (Array.isArray(tags) && tags.length > 0) {
            tags.forEach(tag => {
                if (typeof tag === 'string' && tag.trim() !== '') {
                    const tagElement = document.createElement('span');
                    tagElement.className = 'tag';
                    tagElement.textContent = tag.replace(/^\w+:/, ""); // Remove prefixes like 'industry:'
                    tagsContainer.appendChild(tagElement);
                }
             });
             // Check if any tags were actually added
             if (tagsContainer.children.length === 0) {
                 updateContent('material-tags', fallbackValue, true);
             }
        } else {
            updateContent('material-tags', fallbackValue, true); // Display N/A if no tags array or empty
        }
    } else { console.warn("[Detail Page] Element with ID 'material-tags' not found."); }


    // --- Populate Safety ---
    updateContent('prop-toxicity', getData(material, 'safety.toxicity', fallbackValue));
    updateContent('prop-handling', getData(material, 'safety.handling', fallbackValue));

    // --- Populate Identification & Structure ---
    updateContent('prop-cas', getData(material, 'identification.cas_number', fallbackValue));
    updateContent('prop-category', getData(material, 'category', fallbackValue));
    updateContent('prop-class', getData(material, 'identification.class', fallbackValue));
    updateContent('prop-crystal-structure', getData(material, 'identification.crystal_structure', fallbackValue));
    updateContent('prop-lattice-constant', getData(material, 'identification.lattice_constant', fallbackValue), true); // Use HTML for potential spans
    updateContent('prop-phase-diagram', getData(material, 'identification.phase_diagram_notes', fallbackValue));

    // --- Populate Advanced Fabrication Insights ---
    updateContent('prop-stoichiometry', getData(material, 'advanced_fabrication_insights.stoichiometry_control', fallbackValue));
    updateContent('prop-defects', getData(material, 'advanced_fabrication_insights.common_defects_impact', fallbackValue));
    updateContent('prop-surface-prep', getData(material, 'advanced_fabrication_insights.surface_preparation', fallbackValue));
    updateContent('prop-method-nuances', getData(material, 'advanced_fabrication_insights.method_specific_notes', fallbackValue));

    // --- Populate Growth & Fabrication Properties ---
    updateContent('prop-common-growth-methods', getData(material, 'growth_fabrication_properties.common_growth_methods', fallbackValue));
    updateContent('prop-source-materials', getData(material, 'growth_fabrication_properties.source_materials_purity', fallbackValue));
    updateContent('prop-substrates-orientations', getData(material, 'growth_fabrication_properties.preferred_substrates_orientations', fallbackValue));
    updateContent('prop-growth-parameters', getData(material, 'growth_fabrication_properties.typical_growth_parameters', fallbackValue));
    updateContent('prop-passivation', getData(material, 'growth_fabrication_properties.passivation_methods', fallbackValue));

    // --- Populate Post-Growth Processing ---
    updateContent('prop-annealing', getData(material, 'post_growth_processing.annealing', fallbackValue));
    updateContent('prop-lapping-polishing', getData(material, 'post_growth_processing.lapping_polishing', fallbackValue));
    updateContent('prop-etching', getData(material, 'post_growth_processing.etching', fallbackValue));
    updateContent('prop-grinding-milling', getData(material, 'post_growth_processing.grinding_milling', fallbackValue));

    // --- Populate Device Integration & Characterization ---
    updateContent('prop-device-arch', getData(material, 'device_integration_characterization.device_architectures', fallbackValue));
    updateContent('prop-readout-integration', getData(material, 'device_integration_characterization.readout_integration', fallbackValue));
    updateContent('prop-ar-coatings', getData(material, 'device_integration_characterization.ar_coatings', fallbackValue));
    updateContent('prop-packaging-cooling', getData(material, 'device_integration_characterization.packaging_cooling', fallbackValue));
    // Use HTML list format by passing isHtml=true (getData returns <li> items)
    updateContent('prop-char-techniques', getData(material, 'device_integration_characterization.key_characterization_techniques', fallbackValue), true);

    // --- Populate Electrical Properties ---
    updateContent('prop-bandgap-type', getData(material, 'electrical_properties.bandgap_type', fallbackValue));
    updateContent('prop-bandgap', getData(material, 'electrical_properties.band_gap', fallbackValue), true); // HTML for spans
    updateContent('prop-hansen-eq', getData(material, 'electrical_properties.bandgap_equation.hansen_eg', fallbackValue));
    updateContent('prop-lambda-eq', getData(material, 'electrical_properties.bandgap_equation.wavelength_relation', fallbackValue));
    updateContent('prop-common-dopants', getData(material, 'electrical_properties.common_dopants', fallbackValue));
    updateContent('prop-carrier-concentration', getData(material, 'electrical_properties.carrier_concentration', fallbackValue), true); // HTML for spans
    updateContent('prop-e-mobility', getData(material, 'electrical_properties.electron_mobility', fallbackValue), true); // HTML for spans
    updateContent('prop-h-mobility', getData(material, 'electrical_properties.hole_mobility', fallbackValue), true); // HTML for spans
    updateContent('prop-dielectric-constant', getData(material, 'electrical_properties.dielectric_constant', fallbackValue), true); // HTML for spans
    updateContent('prop-resistivity', getData(material, 'electrical_properties.resistivity', fallbackValue), true); // HTML for spans
    updateContent('prop-breakdown-field', getData(material, 'electrical_properties.breakdown_field', fallbackValue), true); // HTML for spans

    // --- Populate Optical Properties ---
    // Combine value and notes for spectral range if notes exist, handle spans
    updateContent('prop-spectral-range', getData(material, 'optical_properties.spectral_range', fallbackValue), true);
    // Remaining optical props
    updateContent('prop-cutoff-wl', getData(material, 'optical_properties.cutoff_wavelength', fallbackValue), true); // HTML for spans
    updateContent('prop-ref-index', getData(material, 'optical_properties.refractive_index', fallbackValue), true); // HTML for spans
    updateContent('prop-absorption-coefficient', getData(material, 'optical_properties.absorption_coefficient', fallbackValue), true); // HTML for spans
    updateContent('prop-quantum-efficiency', getData(material, 'optical_properties.quantum_efficiency', fallbackValue), true); // HTML for spans
    updateContent('prop-responsivity', getData(material, 'optical_properties.responsivity', fallbackValue), true); // HTML for spans
    updateContent('prop-noise-equivalent-power', getData(material, 'optical_properties.noise_equivalent_power', fallbackValue), true); // HTML for spans

    // --- Populate Thermal Properties ---
    updateContent('prop-op-temp', getData(material, 'thermal_properties.operating_temperature', fallbackValue), true); // HTML for spans
    updateContent('prop-therm-cond', getData(material, 'thermal_properties.thermal_conductivity', fallbackValue), true); // HTML for spans
    updateContent('prop-specific-heat', getData(material, 'thermal_properties.specific_heat', fallbackValue), true); // HTML for spans
    updateContent('prop-melt-pt', getData(material, 'thermal_properties.melting_point', fallbackValue), true); // HTML for spans

    // --- Populate Mechanical Properties ---
    updateContent('prop-density', getData(material, 'mechanical_properties.density', fallbackValue), true); // HTML for spans
    updateContent('prop-youngs-modulus', getData(material, 'mechanical_properties.youngs_modulus', fallbackValue), true); // HTML for spans
    updateContent('prop-hardness-vickers', getData(material, 'mechanical_properties.hardness_vickers', fallbackValue), true); // HTML for spans
    updateContent('prop-poissons-ratio', getData(material, 'mechanical_properties.poissons_ratio', fallbackValue));
    updateContent('prop-fracture-toughness', getData(material, 'mechanical_properties.fracture_toughness', fallbackValue), true); // HTML for spans

    // --- Populate Key Applications & Sensor Types ---
    // Use comma join (default array handling in getData)
    updateContent('prop-sensor-types', getData(material, 'device_applications.sensor_types', fallbackValue));
    // Use HTML list format by passing isHtml=true (getData returns <li> items)
    updateContent('prop-key-applications', getData(material, 'device_applications.key_applications', fallbackValue), true);

    // --- Populate Chemical Properties ---
    updateContent('prop-stability-oxidation', getData(material, 'chemical_properties.stability_oxidation', fallbackValue));
    // Etching is now under post_growth_processing ('prop-etching')

    // --- Populate Magnetic Properties ---
    updateContent('prop-magnetic-type', getData(material, 'magnetic_properties.type', fallbackValue));

    // --- Populate Comparison ---
    updateContent('prop-comparison-notes', getData(material, 'comparison_alternatives.notes', fallbackValue));
    updateContent('prop-vs-insb', getData(material, 'comparison_alternatives.vs_InSb', fallbackValue));
    updateContent('prop-vs-qwips', getData(material, 'comparison_alternatives.vs_QWIPs', fallbackValue));
    updateContent('prop-vs-t2sls', getData(material, 'comparison_alternatives.vs_T2SLs', fallbackValue));

    // --- Populate References ---
    const refList = document.getElementById('reference-list');
    if (refList && material.references_further_reading) {
        const refs = material.references_further_reading;
        let listContent = '';
        if(refs.notes) { listContent += `<li class="ref-notes"><em>${refs.notes}</em></li>`; }

        Object.entries(refs).forEach(([key, value]) => {
            if (key !== 'notes' && value && value !== fallbackValue) {
                let itemHtml = '';
                if (key === 'wikipedia' && typeof value === 'string' && value.startsWith('http')) {
                    itemHtml = `Wikipedia: <a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
                } else if (typeof value === 'string') {
                     itemHtml = value; // Display text directly
                }
                 if (itemHtml) { listContent += `<li>${itemHtml}</li>`; }
            }
        });
        refList.innerHTML = listContent || `<li>Reference information ${fallbackValue}</li>`; // Show N/A if empty
    } else if (refList) {
        refList.innerHTML = `<li>Reference information ${fallbackValue}</li>`;
    } else { console.warn("[Detail Page] Element with ID 'reference-list' not found."); }


    // --- Populate Vendor Info ---
    const vendorList = document.getElementById('vendor-list');
    if (vendorList && material.vendor_info) {
        const vendors = material.vendor_info;
        let listContent = '';
         if(vendors.notes) { listContent += `<li class="vendor-notes"><em>${vendors.notes}</em></li>`; }

        Object.entries(vendors).forEach(([key, value]) => {
             if (key !== 'notes' && value && value !== fallbackValue) {
                 let itemHtml = value; // Default display
                 // Attempt to make links clickable
                 try {
                    const urlMatch = value.match(/(https?:\/\/[^\s]+)|(www\.[^\s]+)/);
                    if (urlMatch) {
                        const url = urlMatch[0].startsWith('http') ? urlMatch[0] : 'http://' + urlMatch[0];
                        itemHtml = value.replace(urlMatch[0], `<a href="${url}" target="_blank" rel="noopener noreferrer">${urlMatch[0]}</a>`);
                    }
                 } catch (linkError) { console.warn("Error parsing vendor link:", linkError); }

                 listContent += `<li>${itemHtml}</li>`;
             }
        });
        vendorList.innerHTML = listContent || `<li>Vendor information ${fallbackValue}</li>`; // Show N/A if empty
    } else if (vendorList) {
        vendorList.innerHTML = `<li>Vendor information ${fallbackValue}</li>`;
    } else { console.warn("[Detail Page] Element with ID 'vendor-list' not found."); }

    console.log("[Detail Page] Page population complete.");

} // End of populatePage function
