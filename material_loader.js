/**
 * Loads DETAILED material data for the detail page.
 * Fetches data/material_details.json, finds the material, populates page.
 */
document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");
    let materialName = null;

    // Wrap decodeURIComponent in try-catch for malformed URIs
    try {
        materialName = materialNameParam ? decodeURIComponent(materialNameParam) : null;
    } catch (uriError) {
        console.error("[Detail Page] Error decoding material name from URL:", uriError);
        const mainContainer = document.querySelector('main');
        if (mainContainer) {
            mainContainer.innerHTML = `<p class="error-message" style="color: red; padding: 1rem;">Error: Invalid material name in URL (${materialNameParam}). Please check the link.</p>`;
        }
        const nameElement = document.getElementById("material-name");
        if(nameElement) nameElement.textContent = "Error";
        return; // Stop execution if URL is malformed
    }


    console.log("[Detail Page] Attempting to load DETAILED view for:", materialName);

    const header = document.querySelector('.detail-header');
    const mainContainer = document.querySelector('main');
    const nameElement = document.getElementById("material-name");

    if (!materialName) {
        if (nameElement) nameElement.textContent = "Material not specified.";
        console.error("[Detail Page] No material specified in URL.");
        if(mainContainer) mainContainer.innerHTML = '<p class="error-message" style="color: red; padding: 1rem;">Error: No material specified in the URL.</p>';
        return;
    }

    if (!mainContainer) {
        console.error("Essential element 'main' not found.");
        if(nameElement) nameElement.textContent = "Page Error";
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

        let allDetailData;
        try {
            allDetailData = await detailRes.json();
        } catch (jsonError) {
            console.error(`[Detail Page] Failed to parse JSON from ${detailDataPath}:`, jsonError);
            throw new Error(`Invalid JSON format in ${detailDataPath}. Check the file content for syntax errors. ${jsonError.message}`);
        }

        console.log("[Detail Page] Detailed data loaded and parsed:", allDetailData);

         if (typeof allDetailData !== 'object' || allDetailData === null) {
             throw new Error(`Data format error in ${detailDataPath}. Expected a top-level JSON object.`);
         }

        const material = allDetailData[materialName];

        if (!material) {
             throw new Error(`Detailed information for "${materialName}" not found within the data loaded from ${detailDataPath}. Check if the material name exists as a key in the JSON file.`);
        }
        console.log("[Detail Page] Specific detailed material object found:", material);

        // Set page title dynamically
        document.title = `${material.name || 'Material'} Detail - MaterialsDB`;

        populatePage(material); // Call populate function

    } catch (e) {
        console.error("[Detail Page] Failed to load material details:", e);
        document.title = `Error Loading Material - MaterialsDB`; // Update title on error
        if (nameElement) nameElement.textContent = "Error loading details";
        mainContainer.innerHTML = `<p class="error-message" style="color: red; padding: 1rem;">Error loading material details: ${e.message}. Please check the console for more information.</p>`;
    }
});

/**
 * Populates the HTML elements with data from the material object.
 * @param {object} material - The detailed material data object.
 */
function populatePage(material) {
    // Define fallback value for consistency
    const fallbackValue = '<span class="na-value">N/A</span>'; // HTML for N/A

    // Helper to get potentially nested data and format it
    const getData = (obj, path, fallback = fallbackValue) => { // Default fallback is HTML N/A
        const value = path.split('.').reduce((o, key) => (o && typeof o === 'object' && o[key] !== undefined && o[key] !== null) ? o[key] : undefined, obj);

        if (value === undefined) return fallback;

        if (typeof value === 'object' && !Array.isArray(value) && value.value !== undefined) {
           let text = String(value.value);
           if (value.unit) text += ` <span class="unit">${value.unit}</span>`;
           if (value.notes) text += ` <span class="notes">(${value.notes})</span>`;
           return text; // Return as HTML string
        }

        if (Array.isArray(value)) {
            const listPathsForBullets = [
                'device_applications.key_applications',
                'device_integration_characterization.key_characterization_techniques'
            ];
            const filteredValues = value.filter(item => item !== null && item !== undefined && String(item).trim() !== '');
            if (filteredValues.length === 0) return fallback;

            if (listPathsForBullets.includes(path)) {
                 return filteredValues.map(item => `<li>${item}</li>`).join(''); // Use <li> for lists
            }
            return filteredValues.join(', '); // Comma-separated string
        }

        // Handle simple non-empty values
        const stringValue = String(value);
        return stringValue.trim() === '' ? fallback : stringValue;
    };

    // Helper to update element content (text or HTML)
    const updateContent = (id, value, isHtml = false) => {
       const element = document.getElementById(id);
       if (element) {
           element.classList.remove('na-value'); // Reset NA class

           // Check if the effective value is the fallback
           const isFallback = (value === fallbackValue || value === 'N/A' || value === '');

           if (isFallback) {
               element.innerHTML = fallbackValue; // Use HTML fallback
               element.classList.add('na-value');
           } else if (isHtml) {
               // If expecting list items, wrap in <ul>
               if (value.startsWith('<li>')) {
                   element.innerHTML = `<ul class="property-list-items">${value}</ul>`;
               } else {
                   element.innerHTML = value; // Value already contains HTML spans etc.
               }
           } else {
               element.textContent = value; // Value is plain text
           }
       } else {
           console.warn(`[Detail Page] Element with ID "${id}" not found in the HTML.`);
       }
   };


    console.log("[Detail Page] Populating page with detailed data:", material);

    // --- Populate Header, Overview, Wiki Link, Tags ---
    updateContent('material-name', getData(material, 'name', 'Unknown Material'), false); // Name is text
    updateContent('material-formula', getData(material, 'formula', ''), true); // Allow HTML in formula (subscripts)
    updateContent('material-description', getData(material, 'description'), false); // Description is text

    const wikiLinkElement = document.getElementById('wiki-link');
    if (wikiLinkElement) {
        const wikiUrl = getData(material, 'wiki_link', '#'); // getData returns fallbackValue if not found
        if (wikiUrl && wikiUrl !== '#' && wikiUrl !== fallbackValue) {
            wikiLinkElement.href = wikiUrl;
            wikiLinkElement.style.display = ''; // Ensure it's visible
        } else {
            wikiLinkElement.style.display = 'none'; // Hide if no valid link
        }
    }

    const tagsContainer = document.getElementById('material-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = ''; // Clear previous
        const tags = material.tags || [];
        let tagsAdded = false;
        if (Array.isArray(tags) && tags.length > 0) {
            tags.forEach(tag => {
                if (typeof tag === 'string' && tag.trim() !== '') {
                    const tagElement = document.createElement('span');
                    tagElement.className = 'tag';
                    tagElement.textContent = tag.replace(/^\w+:/, "");
                    tagsContainer.appendChild(tagElement);
                    tagsAdded = true;
                }
             });
        }
        if (!tagsAdded) { // If no valid tags found
            tagsContainer.innerHTML = fallbackValue;
            tagsContainer.classList.add('na-value');
        }
    } else { console.warn("[Detail Page] Element with ID 'material-tags' not found."); }


    // --- Populate Safety ---
    updateContent('prop-toxicity', getData(material, 'safety.toxicity'), false);
    updateContent('prop-handling', getData(material, 'safety.handling'), false);

    // --- Populate Identification & Structure ---
    updateContent('prop-cas', getData(material, 'identification.cas_number'), false);
    updateContent('prop-category', getData(material, 'category'), false);
    updateContent('prop-class', getData(material, 'identification.class'), false);
    updateContent('prop-crystal-structure', getData(material, 'identification.crystal_structure'), false);
    updateContent('prop-lattice-constant', getData(material, 'identification.lattice_constant'), true); // HTML for spans
    updateContent('prop-phase-diagram', getData(material, 'identification.phase_diagram_notes'), false);

    // --- Populate Advanced Fabrication Insights ---
    updateContent('prop-stoichiometry', getData(material, 'advanced_fabrication_insights.stoichiometry_control'), false);
    updateContent('prop-defects', getData(material, 'advanced_fabrication_insights.common_defects_impact'), false);
    updateContent('prop-surface-prep', getData(material, 'advanced_fabrication_insights.surface_preparation'), false);
    updateContent('prop-method-nuances', getData(material, 'advanced_fabrication_insights.method_specific_notes'), false);

    // --- Populate Growth & Fabrication Properties ---
    updateContent('prop-common-growth-methods', getData(material, 'growth_fabrication_properties.common_growth_methods'), false);
    updateContent('prop-source-materials', getData(material, 'growth_fabrication_properties.source_materials_purity'), false);
    updateContent('prop-substrates-orientations', getData(material, 'growth_fabrication_properties.preferred_substrates_orientations'), false);
    updateContent('prop-growth-parameters', getData(material, 'growth_fabrication_properties.typical_growth_parameters'), false);
    updateContent('prop-passivation', getData(material, 'growth_fabrication_properties.passivation_methods'), false);

    // --- Populate Post-Growth Processing ---
    updateContent('prop-annealing', getData(material, 'post_growth_processing.annealing'), false);
    updateContent('prop-lapping-polishing', getData(material, 'post_growth_processing.lapping_polishing'), false);
    updateContent('prop-etching', getData(material, 'post_growth_processing.etching'), false);
    updateContent('prop-grinding-milling', getData(material, 'post_growth_processing.grinding_milling'), false);

    // --- Populate Device Integration & Characterization ---
    updateContent('prop-device-arch', getData(material, 'device_integration_characterization.device_architectures'), false);
    updateContent('prop-readout-integration', getData(material, 'device_integration_characterization.readout_integration'), false);
    updateContent('prop-ar-coatings', getData(material, 'device_integration_characterization.ar_coatings'), false);
    updateContent('prop-packaging-cooling', getData(material, 'device_integration_characterization.packaging_cooling'), false);
    updateContent('prop-char-techniques', getData(material, 'device_integration_characterization.key_characterization_techniques'), true); // HTML list

    // --- Populate Electrical Properties ---
    updateContent('prop-bandgap-type', getData(material, 'electrical_properties.bandgap_type'), false);
    updateContent('prop-bandgap', getData(material, 'electrical_properties.band_gap'), true); // HTML for spans
    updateContent('prop-hansen-eq', getData(material, 'electrical_properties.bandgap_equation.hansen_eg'), false);
    updateContent('prop-lambda-eq', getData(material, 'electrical_properties.bandgap_equation.wavelength_relation'), false);
    updateContent('prop-common-dopants', getData(material, 'electrical_properties.common_dopants'), false);
    updateContent('prop-carrier-concentration', getData(material, 'electrical_properties.carrier_concentration'), true); // HTML for spans
    updateContent('prop-e-mobility', getData(material, 'electrical_properties.electron_mobility'), true); // HTML for spans
    updateContent('prop-h-mobility', getData(material, 'electrical_properties.hole_mobility'), true); // HTML for spans
    updateContent('prop-dielectric-constant', getData(material, 'electrical_properties.dielectric_constant'), true); // HTML for spans
    updateContent('prop-resistivity', getData(material, 'electrical_properties.resistivity'), true); // HTML for spans
    updateContent('prop-breakdown-field', getData(material, 'electrical_properties.breakdown_field'), true); // HTML for spans

    // --- Populate Optical Properties ---
    updateContent('prop-spectral-range', getData(material, 'optical_properties.spectral_range'), true); // HTML for spans
    updateContent('prop-cutoff-wl', getData(material, 'optical_properties.cutoff_wavelength'), true); // HTML for spans
    updateContent('prop-ref-index', getData(material, 'optical_properties.refractive_index'), true); // HTML for spans
    updateContent('prop-absorption-coefficient', getData(material, 'optical_properties.absorption_coefficient'), true); // HTML for spans
    updateContent('prop-quantum-efficiency', getData(material, 'optical_properties.quantum_efficiency'), true); // HTML for spans
    updateContent('prop-responsivity', getData(material, 'optical_properties.responsivity'), true); // HTML for spans
    updateContent('prop-noise-equivalent-power', getData(material, 'optical_properties.noise_equivalent_power'), true); // HTML for spans

    // --- Populate Thermal Properties ---
    updateContent('prop-op-temp', getData(material, 'thermal_properties.operating_temperature'), true); // HTML for spans
    updateContent('prop-therm-cond', getData(material, 'thermal_properties.thermal_conductivity'), true); // HTML for spans
    updateContent('prop-specific-heat', getData(material, 'thermal_properties.specific_heat'), true); // HTML for spans
    updateContent('prop-melt-pt', getData(material, 'thermal_properties.melting_point'), true); // HTML for spans

    // --- Populate Mechanical Properties ---
    updateContent('prop-density', getData(material, 'mechanical_properties.density'), true); // HTML for spans
    updateContent('prop-youngs-modulus', getData(material, 'mechanical_properties.youngs_modulus'), true); // HTML for spans
    updateContent('prop-hardness-vickers', getData(material, 'mechanical_properties.hardness_vickers'), true); // HTML for spans
    updateContent('prop-poissons-ratio', getData(material, 'mechanical_properties.poissons_ratio'), false); // Plain number
    updateContent('prop-fracture-toughness', getData(material, 'mechanical_properties.fracture_toughness'), true); // HTML for spans

    // --- Populate Key Applications & Sensor Types ---
    updateContent('prop-sensor-types', getData(material, 'device_applications.sensor_types'), false); // Comma-separated list
    updateContent('prop-key-applications', getData(material, 'device_applications.key_applications'), true); // HTML list

    // --- Populate Chemical Properties ---
    updateContent('prop-stability-oxidation', getData(material, 'chemical_properties.stability_oxidation'), false);

    // --- Populate Magnetic Properties ---
    updateContent('prop-magnetic-type', getData(material, 'magnetic_properties.type'), false);


    // --- Populate Comparison (DYNAMICALLY) ---
    updateContent('prop-comparison-notes', getData(material, 'comparison_alternatives.notes'), false); // Update notes field

    const comparisonPlaceholder = document.getElementById('comparison-items-placeholder');
    const comparisonData = material.comparison_alternatives; // Get the comparison object

    if (comparisonPlaceholder) {
        comparisonPlaceholder.innerHTML = ''; // Clear placeholder content first

        let comparisonsFound = false;
        if (comparisonData && typeof comparisonData === 'object') {
            Object.entries(comparisonData).forEach(([key, value]) => {
                // Process only keys starting with 'vs_' and having a non-fallback value
                const valueStr = getData(material, `comparison_alternatives.${key}`, 'CHECK_FALLBACK');
                if (key.startsWith('vs_') && valueStr !== 'CHECK_FALLBACK' && valueStr !== fallbackValue && valueStr !== 'N/A' && valueStr !== '') {
                    const comparisonItemDiv = document.createElement('div');
                    comparisonItemDiv.className = 'property-item';

                    const dt = document.createElement('dt');
                    dt.className = 'property-key';
                    const displayName = key.replace(/^vs_/, 'vs. ') + ':'; // Format key nicely
                    dt.textContent = displayName;

                    const dd = document.createElement('dd');
                    dd.className = 'property-value';
                    dd.textContent = valueStr; // Use textContent for safety, value is already processed by getData

                    comparisonItemDiv.appendChild(dt);
                    comparisonItemDiv.appendChild(dd);
                    comparisonPlaceholder.appendChild(comparisonItemDiv);
                    comparisonsFound = true;
                }
            });
        }

        // Show N/A only if NO specific 'vs_' comparisons were found AND no general notes exist
         const notesValue = getData(material, 'comparison_alternatives.notes', 'CHECK_FALLBACK');
         if (!comparisonsFound && (notesValue === 'CHECK_FALLBACK' || notesValue === fallbackValue || notesValue === 'N/A' || notesValue === '')) {
            comparisonPlaceholder.innerHTML = `<div class="property-item"><dd class="property-value">${fallbackValue}</dd></div>`;
        } else if (!comparisonsFound) {
            // If notes exist but no 'vs_' items, the placeholder remains empty, which is fine.
        }

    } else {
        console.warn("[Detail Page] Element with ID 'comparison-items-placeholder' not found.");
    }
    // --- END DYNAMIC COMPARISON POPULATION ---


    // --- Populate References ---
    const refList = document.getElementById('reference-list');
    if (refList && material.references_further_reading) {
        const refs = material.references_further_reading;
        let listContent = '';
        if(refs.notes) { listContent += `<li class="ref-notes"><em>${getData(material, 'references_further_reading.notes', '')}</em></li>`; } // Use getData for notes

        let refsAdded = false;
        Object.entries(refs).forEach(([key, value]) => {
            if (key !== 'notes') {
                const refValue = getData(material, `references_further_reading.${key}`, 'CHECK_FALLBACK');
                 if (refValue !== 'CHECK_FALLBACK' && refValue !== fallbackValue && refValue !== 'N/A' && refValue !== '') {
                    let itemHtml = '';
                    if (key === 'wikipedia' && typeof refValue === 'string' && refValue.startsWith('http')) {
                        itemHtml = `Wikipedia: <a href="${refValue}" target="_blank" rel="noopener noreferrer">${refValue}</a>`;
                    } else if (typeof refValue === 'string') {
                        itemHtml = refValue;
                    }
                    if (itemHtml) {
                        listContent += `<li>${itemHtml}</li>`;
                        refsAdded = true;
                    }
                }
            }
        });
        refList.innerHTML = listContent || `<li>Reference information ${fallbackValue}</li>`;
        if (!refsAdded && !refs.notes) { // Ensure N/A shows if truly nothing
             refList.innerHTML = `<li>Reference information ${fallbackValue}</li>`;
        }
    } else if (refList) {
        refList.innerHTML = `<li>Reference information ${fallbackValue}</li>`;
    } else { console.warn("[Detail Page] Element with ID 'reference-list' not found."); }


    // --- Populate Vendor Info ---
    const vendorList = document.getElementById('vendor-list');
    if (vendorList && material.vendor_info) {
        const vendors = material.vendor_info;
        let listContent = '';
        if(vendors.notes) { listContent += `<li class="vendor-notes"><em>${getData(material, 'vendor_info.notes', '')}</em></li>`; } // Use getData for notes

        let vendorsAdded = false;
        Object.entries(vendors).forEach(([key, value]) => {
             if (key !== 'notes') {
                const vendorValue = getData(material, `vendor_info.${key}`, 'CHECK_FALLBACK');
                 if (vendorValue !== 'CHECK_FALLBACK' && vendorValue !== fallbackValue && vendorValue !== 'N/A' && vendorValue !== '') {
                     let itemHtml = vendorValue;
                     try {
                        const urlMatch = String(vendorValue).match(/(https?:\/\/[^\s]+)|(www\.[^\s]+)/);
                        if (urlMatch) {
                            const url = urlMatch[0].startsWith('http') ? urlMatch[0] : 'http://' + urlMatch[0];
                            itemHtml = String(vendorValue).replace(urlMatch[0], `<a href="${url}" target="_blank" rel="noopener noreferrer">${urlMatch[0]}</a>`);
                        }
                     } catch (linkError) { console.warn("Error parsing vendor link:", linkError); }

                     listContent += `<li>${itemHtml}</li>`;
                     vendorsAdded = true;
                 }
             }
        });
        vendorList.innerHTML = listContent || `<li>Vendor information ${fallbackValue}</li>`;
        if (!vendorsAdded && !vendors.notes) { // Ensure N/A shows if truly nothing
            vendorList.innerHTML = `<li>Vendor information ${fallbackValue}</li>`;
        }
    } else if (vendorList) {
        vendorList.innerHTML = `<li>Vendor information ${fallbackValue}</li>`;
    } else { console.warn("[Detail Page] Element with ID 'vendor-list' not found."); }

    console.log("[Detail Page] Page population complete.");

} // End of populatePage function
