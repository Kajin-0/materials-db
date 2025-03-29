/**
 * Loads DETAILED material data for the detail page.
 * Fetches data/material_details.json, finds the material, populates page.
 */
document.addEventListener("DOMContentLoaded", async () => {
    // ... (Keep the top part of the script the same - fetch, error handling etc.) ...
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");
    let materialName = null;

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
        return;
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

        document.title = `${material.name || 'Material'} Detail - MaterialsDB`;

        populatePage(material);

    } catch (e) {
        console.error("[Detail Page] Failed to load material details:", e);
        document.title = `Error Loading Material - MaterialsDB`;
        if (nameElement) nameElement.textContent = "Error loading details";
        mainContainer.innerHTML = `<p class="error-message" style="color: red; padding: 1rem;">Error loading material details: ${e.message}. Please check the console for more information.</p>`;
    }
});

/**
 * Populates the HTML elements with data from the material object.
 * @param {object} material - The detailed material data object.
 */
function populatePage(material) {
    const fallbackValue = '<span class="na-value">N/A</span>';

    const getData = (obj, path, fallback = fallbackValue) => {
        const value = path.split('.').reduce((o, key) => (o && typeof o === 'object' && o[key] !== undefined && o[key] !== null) ? o[key] : undefined, obj);
        if (value === undefined) return fallback;
        if (typeof value === 'object' && !Array.isArray(value) && value.value !== undefined) {
           let text = String(value.value);
           if (value.unit) text += ` <span class="unit">${value.unit}</span>`;
           if (value.notes) text += ` <span class="notes">(${value.notes})</span>`;
           return text;
        }
        if (Array.isArray(value)) {
            const listPathsForBullets = [
                'device_applications.key_applications',
                'device_integration_characterization.key_characterization_techniques'
            ];
            const filteredValues = value.filter(item => item !== null && item !== undefined && String(item).trim() !== '');
            if (filteredValues.length === 0) return fallback;
            if (listPathsForBullets.includes(path)) {
                 return filteredValues.map(item => `<li>${item}</li>`).join('');
            }
            return filteredValues.join(', ');
        }
        const stringValue = String(value);
        return stringValue.trim() === '' ? fallback : stringValue;
    };

    const updateContent = (id, value, isHtml = false) => {
       const element = document.getElementById(id);
       if (element) {
           element.classList.remove('na-value');
           const isFallback = (value === fallbackValue || value === 'N/A' || value === '');
           if (isFallback) {
               element.innerHTML = fallbackValue;
               element.classList.add('na-value');
           } else if (isHtml) {
               if (value.startsWith('<li>')) {
                   element.innerHTML = `<ul class="property-list-items">${value}</ul>`;
               } else {
                   element.innerHTML = value;
               }
           } else {
               element.textContent = value;
           }
       } else {
           console.warn(`[Detail Page] Element with ID "${id}" not found in the HTML.`);
       }
   };

    console.log("[Detail Page] Populating page with detailed data:", material);

    // --- Populate Header, Overview, Wiki Link, Tags ---
    // ... (keep this section as it was) ...
    updateContent('material-name', getData(material, 'name', 'Unknown Material'), false);
    updateContent('material-formula', getData(material, 'formula', ''), true);
    updateContent('material-description', getData(material, 'description'), false);

    const wikiLinkElement = document.getElementById('wiki-link');
    if (wikiLinkElement) {
        const wikiUrl = getData(material, 'wiki_link', '#');
        if (wikiUrl && wikiUrl !== '#' && wikiUrl !== fallbackValue) {
            wikiLinkElement.href = wikiUrl;
            wikiLinkElement.style.display = '';
        } else {
            wikiLinkElement.style.display = 'none';
        }
    }

    const tagsContainer = document.getElementById('material-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
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
        if (!tagsAdded) {
            tagsContainer.innerHTML = fallbackValue;
            tagsContainer.classList.add('na-value');
        }
    } else { console.warn("[Detail Page] Element with ID 'material-tags' not found."); }

    // --- Populate Safety ---
    // ... (keep this section) ...
    updateContent('prop-toxicity', getData(material, 'safety.toxicity'), false);
    updateContent('prop-handling', getData(material, 'safety.handling'), false);

    // --- Populate Identification & Structure ---
    // ... (keep this section) ...
    updateContent('prop-cas', getData(material, 'identification.cas_number'), false);
    updateContent('prop-category', getData(material, 'category'), false);
    updateContent('prop-class', getData(material, 'identification.class'), false);
    updateContent('prop-crystal-structure', getData(material, 'identification.crystal_structure'), false);
    updateContent('prop-lattice-constant', getData(material, 'identification.lattice_constant'), true);
    updateContent('prop-phase-diagram', getData(material, 'identification.phase_diagram_notes'), false);

    // --- Populate Advanced Fabrication Insights ---
    // ... (keep this section) ...
    updateContent('prop-stoichiometry', getData(material, 'advanced_fabrication_insights.stoichiometry_control'), false);
    updateContent('prop-defects', getData(material, 'advanced_fabrication_insights.common_defects_impact'), false);
    updateContent('prop-surface-prep', getData(material, 'advanced_fabrication_insights.surface_preparation'), false);
    updateContent('prop-method-nuances', getData(material, 'advanced_fabrication_insights.method_specific_notes'), false);

    // --- Populate Growth & Fabrication Properties ---
    // ... (keep this section) ...
    updateContent('prop-common-growth-methods', getData(material, 'growth_fabrication_properties.common_growth_methods'), false);
    updateContent('prop-source-materials', getData(material, 'growth_fabrication_properties.source_materials_purity'), false);
    updateContent('prop-substrates-orientations', getData(material, 'growth_fabrication_properties.preferred_substrates_orientations'), false);
    updateContent('prop-growth-parameters', getData(material, 'growth_fabrication_properties.typical_growth_parameters'), false);
    updateContent('prop-passivation', getData(material, 'growth_fabrication_properties.passivation_methods'), false);

    // --- Populate Post-Growth Processing ---
    // ... (keep this section) ...
    updateContent('prop-annealing', getData(material, 'post_growth_processing.annealing'), false);
    updateContent('prop-lapping-polishing', getData(material, 'post_growth_processing.lapping_polishing'), false);
    updateContent('prop-etching', getData(material, 'post_growth_processing.etching'), false);
    updateContent('prop-grinding-milling', getData(material, 'post_growth_processing.grinding_milling'), false);

    // --- Populate Device Integration & Characterization ---
    // ... (keep this section) ...
    updateContent('prop-device-arch', getData(material, 'device_integration_characterization.device_architectures'), false);
    updateContent('prop-readout-integration', getData(material, 'device_integration_characterization.readout_integration'), false);
    updateContent('prop-ar-coatings', getData(material, 'device_integration_characterization.ar_coatings'), false);
    updateContent('prop-packaging-cooling', getData(material, 'device_integration_characterization.packaging_cooling'), false);
    updateContent('prop-char-techniques', getData(material, 'device_integration_characterization.key_characterization_techniques'), true);

    // --- Populate Electrical Properties ---
    // ... (keep this section) ...
    updateContent('prop-bandgap-type', getData(material, 'electrical_properties.bandgap_type'), false);
    updateContent('prop-bandgap', getData(material, 'electrical_properties.band_gap'), true);
    updateContent('prop-hansen-eq', getData(material, 'electrical_properties.bandgap_equation.hansen_eg'), false);
    updateContent('prop-lambda-eq', getData(material, 'electrical_properties.bandgap_equation.wavelength_relation'), false);
    updateContent('prop-common-dopants', getData(material, 'electrical_properties.common_dopants'), false);
    updateContent('prop-carrier-concentration', getData(material, 'electrical_properties.carrier_concentration'), true);
    updateContent('prop-e-mobility', getData(material, 'electrical_properties.electron_mobility'), true);
    updateContent('prop-h-mobility', getData(material, 'electrical_properties.hole_mobility'), true);
    updateContent('prop-dielectric-constant', getData(material, 'electrical_properties.dielectric_constant'), true);
    updateContent('prop-resistivity', getData(material, 'electrical_properties.resistivity'), true);
    updateContent('prop-breakdown-field', getData(material, 'electrical_properties.breakdown_field'), true);

    // --- Populate Optical Properties ---
    // ... (keep this section) ...
    updateContent('prop-spectral-range', getData(material, 'optical_properties.spectral_range'), true);
    updateContent('prop-cutoff-wl', getData(material, 'optical_properties.cutoff_wavelength'), true);
    updateContent('prop-ref-index', getData(material, 'optical_properties.refractive_index'), true);
    updateContent('prop-absorption-coefficient', getData(material, 'optical_properties.absorption_coefficient'), true);
    updateContent('prop-quantum-efficiency', getData(material, 'optical_properties.quantum_efficiency'), true);
    updateContent('prop-responsivity', getData(material, 'optical_properties.responsivity'), true);
    updateContent('prop-noise-equivalent-power', getData(material, 'optical_properties.noise_equivalent_power'), true);

    // --- Populate Thermal Properties ---
    // ... (keep this section) ...
    updateContent('prop-op-temp', getData(material, 'thermal_properties.operating_temperature'), true);
    updateContent('prop-therm-cond', getData(material, 'thermal_properties.thermal_conductivity'), true);
    updateContent('prop-specific-heat', getData(material, 'thermal_properties.specific_heat'), true);
    updateContent('prop-melt-pt', getData(material, 'thermal_properties.melting_point'), true);

    // --- Populate Mechanical Properties ---
    // ... (keep this section) ...
    updateContent('prop-density', getData(material, 'mechanical_properties.density'), true);
    updateContent('prop-youngs-modulus', getData(material, 'mechanical_properties.youngs_modulus'), true);
    updateContent('prop-hardness-vickers', getData(material, 'mechanical_properties.hardness_vickers'), true);
    updateContent('prop-poissons-ratio', getData(material, 'mechanical_properties.poissons_ratio'), false);
    updateContent('prop-fracture-toughness', getData(material, 'mechanical_properties.fracture_toughness'), true);

    // --- Populate Key Applications & Sensor Types ---
    // ... (keep this section) ...
    updateContent('prop-sensor-types', getData(material, 'device_applications.sensor_types'), false);
    updateContent('prop-key-applications', getData(material, 'device_applications.key_applications'), true);

    // --- Populate Chemical Properties ---
    // ... (keep this section) ...
    updateContent('prop-stability-oxidation', getData(material, 'chemical_properties.stability_oxidation'), false);

    // --- Populate Magnetic Properties ---
    // ... (keep this section) ...
    updateContent('prop-magnetic-type', getData(material, 'magnetic_properties.type'), false);


    // --- Populate Comparison (DYNAMICALLY) --- MODIFIED ---
    updateContent('prop-comparison-notes', getData(material, 'comparison_alternatives.notes'), false); // Update notes field

    const comparisonDL = document.getElementById('comparison-list'); // Get the DL element by its new ID
    const comparisonData = material.comparison_alternatives;

    if (comparisonDL) {
        // Clear only dynamically added comparison items (optional, good practice)
        // You could give dynamic items a class like 'dynamic-comparison-item' to select them
        // Example: comparisonDL.querySelectorAll('.dynamic-comparison-item').forEach(el => el.remove());

        let comparisonsFound = false;
        if (comparisonData && typeof comparisonData === 'object') {
            Object.entries(comparisonData).forEach(([key, value]) => {
                const valueStr = getData(material, `comparison_alternatives.${key}`, 'CHECK_FALLBACK');
                if (key.startsWith('vs_') && valueStr !== 'CHECK_FALLBACK' && valueStr !== fallbackValue && valueStr !== 'N/A' && valueStr !== '') {
                    const comparisonItemDiv = document.createElement('div');
                    comparisonItemDiv.className = 'property-item dynamic-comparison-item'; // Added a class for potential clearing

                    const dt = document.createElement('dt');
                    dt.className = 'property-key';
                    const displayName = key.replace(/^vs_/, 'vs. ') + ':';
                    dt.textContent = displayName;

                    const dd = document.createElement('dd');
                    dd.className = 'property-value';
                    dd.textContent = valueStr; // Use textContent

                    comparisonItemDiv.appendChild(dt);
                    comparisonItemDiv.appendChild(dd);
                    comparisonDL.appendChild(comparisonItemDiv); // Append directly to the DL
                    comparisonsFound = true;
                }
            });
        }

        // Add N/A message if needed (only if notes are also absent)
        const notesValue = getData(material, 'comparison_alternatives.notes', 'CHECK_FALLBACK');
        if (!comparisonsFound && (notesValue === 'CHECK_FALLBACK' || notesValue === fallbackValue || notesValue === 'N/A' || notesValue === '')) {
           // Check if N/A message already exists to prevent duplicates
           if (!comparisonDL.querySelector('.comparison-na-message')) {
                const naItem = document.createElement('div');
                naItem.className = 'property-item comparison-na-message'; // Add class to identify it
                naItem.innerHTML = `<dd class="property-value">${fallbackValue}</dd>`; // Span full width
                comparisonDL.appendChild(naItem);
            }
        } else {
            // Remove any previous N/A message if comparisons were found
             const existingNaMessage = comparisonDL.querySelector('.comparison-na-message');
             if (existingNaMessage) {
                 existingNaMessage.remove();
             }
        }

    } else {
        console.warn("[Detail Page] Element with ID 'comparison-list' not found.");
    }
    // --- END DYNAMIC COMPARISON POPULATION ---


    // --- Populate References ---
    // ... (keep this section) ...
    const refList = document.getElementById('reference-list');
    if (refList && material.references_further_reading) {
        const refs = material.references_further_reading;
        let listContent = '';
        if(refs.notes) { listContent += `<li class="ref-notes"><em>${getData(material, 'references_further_reading.notes', '')}</em></li>`; }

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
        if (!refsAdded && !refs.notes) {
             refList.innerHTML = `<li>Reference information ${fallbackValue}</li>`;
        }
    } else if (refList) {
        refList.innerHTML = `<li>Reference information ${fallbackValue}</li>`;
    } else { console.warn("[Detail Page] Element with ID 'reference-list' not found."); }

    // --- Populate Vendor Info ---
    // ... (keep this section) ...
    const vendorList = document.getElementById('vendor-list');
    if (vendorList && material.vendor_info) {
        const vendors = material.vendor_info;
        let listContent = '';
        if(vendors.notes) { listContent += `<li class="vendor-notes"><em>${getData(material, 'vendor_info.notes', '')}</em></li>`; }

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
        if (!vendorsAdded && !vendors.notes) {
            vendorList.innerHTML = `<li>Vendor information ${fallbackValue}</li>`;
        }
    } else if (vendorList) {
        vendorList.innerHTML = `<li>Vendor information ${fallbackValue}</li>`;
    } else { console.warn("[Detail Page] Element with ID 'vendor-list' not found."); }

    console.log("[Detail Page] Page population complete.");

} // End of populatePage function
