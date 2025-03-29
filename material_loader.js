/**
 * Loads DETAILED material data for the detail page.
 * Fetches data/material_details.json, finds the material, populates page dynamically.
 */
document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");
    let materialName = null;
    const mainContainer = document.getElementById('material-content-container'); // Target for dynamic sections
    const headerNameElement = document.getElementById("material-name"); // Header element

    // Utility to display errors prominently
    const displayError = (message) => {
        console.error("[Detail Page] Error:", message);
        if (headerNameElement) headerNameElement.textContent = "Error";
        if (mainContainer) {
             mainContainer.innerHTML = `<p class="error-message" style="color: red; padding: 1rem;">Error loading material details: ${message}. Please check the console for more information.</p>`;
        }
        document.title = "Error - MaterialsDB";
    };

    try {
        materialName = materialNameParam ? decodeURIComponent(materialNameParam) : null;
    } catch (uriError) {
        displayError(`Invalid material name in URL (${materialNameParam}). ${uriError.message}`);
        return;
    }

    console.log("[Detail Page] Attempting to load DETAILED view for:", materialName);

    if (!materialName) {
        displayError("No material specified in the URL.");
        return;
    }
    if (!mainContainer) {
         // Critical error, can't display anything useful if main container is missing
         console.error("Essential element '#material-content-container' not found.");
         if(headerNameElement) headerNameElement.textContent = "Page Structure Error";
         document.title = "Page Error - MaterialsDB";
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
            throw new Error(`Invalid JSON format in ${detailDataPath}. Check the file content. ${jsonError.message}`);
        }
        console.log("[Detail Page] Detailed data loaded and parsed.");

         if (typeof allDetailData !== 'object' || allDetailData === null) {
             throw new Error(`Data format error: ${detailDataPath} should contain a top-level JSON object.`);
         }

        const material = allDetailData[materialName];

        if (!material) {
             throw new Error(`Information for "${materialName}" not found in ${detailDataPath}.`);
        }
        console.log("[Detail Page] Specific material object found:", materialName);

        // Clear loading message before populating
        mainContainer.innerHTML = '';

        populatePage(material, mainContainer); // Pass container to populate function

    } catch (e) {
        displayError(e.message); // Use the centralized error display
    }
});


/**
 * Dynamically populates the main content container with sections and properties
 * based on the provided material data object.
 * @param {object} material - The detailed material data object.
 * @param {HTMLElement} container - The main HTML element to append sections to.
 */
function populatePage(material, container) {
    const fallbackValue = '<span class="na-value">N/A</span>'; // HTML for N/A

    // --- Helper Function: getData --- (Handles nested access and formatting)
    const getData = (obj, path, fallback = fallbackValue) => {
        const value = path.split('.').reduce((o, key) => (o && typeof o === 'object' && o[key] !== undefined && o[key] !== null) ? o[key] : undefined, obj);
        if (value === undefined) return fallback;
        if (typeof value === 'object' && !Array.isArray(value) && value.value !== undefined) {
           let text = String(value.value);
           if (value.unit) text += ` <span class="unit">${value.unit}</span>`;
           if (value.notes) text += ` <span class="notes">(${value.notes})</span>`;
           return text; // Return as HTML string
        }
        if (Array.isArray(value)) {
            const listPathsForBullets = [ // Define paths that should be bulleted lists
                'device_applications.key_applications',
                'device_integration_characterization.key_characterization_techniques'
                // Add other array paths here if they need bullet points
            ];
            const filteredValues = value.filter(item => item !== null && item !== undefined && String(item).trim() !== '');
            if (filteredValues.length === 0) return fallback;
            if (listPathsForBullets.includes(path)) {
                 return `<ul class="property-list-items">${filteredValues.map(item => `<li>${item}</li>`).join('')}</ul>`; // Use UL/LI
            }
            return filteredValues.join(', '); // Comma-separated string otherwise
        }
        const stringValue = String(value);
        return stringValue.trim() === '' ? fallback : stringValue; // Handle empty strings
    };

    // --- Helper Function: createPropertyItem --- (Creates a DT/DD pair)
    const createPropertyItem = (keyText, valueHtml, isKey = false) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'property-item';
        if (isKey) {
            itemDiv.classList.add('key-property'); // Add class for key properties
        }

        const dt = document.createElement('dt');
        dt.className = 'property-key';
        dt.textContent = keyText + ':'; // Add colon to key text

        const dd = document.createElement('dd');
        dd.className = 'property-value';
        dd.innerHTML = valueHtml; // Use innerHTML as getData can return HTML

        // Add na-value class if the content matches the fallback
        if (valueHtml === fallbackValue) {
            dd.classList.add('na-value');
        }

        itemDiv.appendChild(dt);
        itemDiv.appendChild(dd);
        return itemDiv;
    };

     // --- Helper Function: createSection --- (Creates a complete section)
     const createSection = (id, title, icon = null) => {
        const section = document.createElement('section');
        section.className = 'material-section';
        section.id = id;

        const h2 = document.createElement('h2');
        if (icon) {
            const iconSpan = document.createElement('span');
            iconSpan.setAttribute('aria-hidden', 'true');
            iconSpan.textContent = icon;
            h2.appendChild(iconSpan);
            h2.appendChild(document.createTextNode(' ')); // Add space after icon
        }
        h2.appendChild(document.createTextNode(title));
        section.appendChild(h2);

        // Add safety-info class specifically for the safety section
        if (id === 'section-safety') {
            section.classList.add('safety-info');
        }

        return section;
    };

    // --- Configuration for Sections and Properties ---
    // Defines the order, title, and properties for each section.
    // 'dataKey' points to the top-level key in the material JSON object.
    // 'properties' maps JSON sub-keys to display labels and marks key properties.
    const sectionConfig = [
        { id: 'section-overview', title: 'Overview', isSpecial: true }, // Handled separately
        { id: 'section-safety', title: 'Safety Information', icon: '⚠️', dataKey: 'safety', properties: {
            'toxicity': { label: 'Toxicity', isKey: true },
            'handling': { label: 'Handling' }
        }},
        { id: 'section-identification', title: 'Identification & Structure', dataKey: 'identification', properties: {
            'cas_number': { label: 'CAS Number' },
            // 'category' and 'class' are handled slightly differently below
            'crystal_structure': { label: 'Crystal Structure', isKey: true },
            'lattice_constant': { label: 'Lattice Constant', isKey: true, isHtml: true }, // Allow HTML for spans
            'phase_diagram_notes': { label: 'Phase Diagram Notes' }
        }},
        { id: 'section-fab-insights', title: 'Advanced Fabrication Insights', dataKey: 'advanced_fabrication_insights', properties: {
            'stoichiometry_control': { label: 'Stoichiometry Control', isKey: true },
            'common_defects_impact': { label: 'Common Defects' },
            'surface_preparation': { label: 'Surface Preparation' },
            'method_specific_notes': { label: 'Method Nuances' }
        }},
        { id: 'section-growth', title: 'Growth & Fabrication Properties', dataKey: 'growth_fabrication_properties', properties: {
            'common_growth_methods': { label: 'Common Methods' },
            'source_materials_purity': { label: 'Source Materials' },
            'preferred_substrates_orientations': { label: 'Substrates/Orientations', isKey: true },
            'typical_growth_parameters': { label: 'Growth Parameters' },
            'passivation_methods': { label: 'Passivation', isKey: true }
        }},
        { id: 'section-processing', title: 'Post-Growth Processing', dataKey: 'post_growth_processing', properties: {
            'annealing': { label: 'Annealing', isKey: true },
            'lapping_polishing': { label: 'Lapping & Polishing' },
            'etching': { label: 'Etching Methods' },
            'grinding_milling': { label: 'Grinding/Milling Notes' }
        }},
        { id: 'section-device-char', title: 'Device Integration & Characterization', dataKey: 'device_integration_characterization', properties: {
            'device_architectures': { label: 'Device Architectures' },
            'readout_integration': { label: 'Readout Integration', isKey: true },
            'ar_coatings': { label: 'AR Coatings' },
            'packaging_cooling': { label: 'Packaging/Cooling', isKey: true },
            'key_characterization_techniques': { label: 'Key Characterization', isHtml: true } // Renders as list
        }},
        { id: 'section-electrical', title: 'Electrical Properties', dataKey: 'electrical_properties', properties: {
            'bandgap_type': { label: 'Bandgap Type' },
            'band_gap': { label: 'Bandgap (Eg)', isKey: true, isHtml: true },
            'bandgap_equation.hansen_eg': { label: 'Hansen Eg Eq' }, // Nested property example
            'bandgap_equation.varshni_equation': { label: 'Varshni Eg Eq' }, // Nested property example
            'bandgap_equation.wavelength_relation': { label: 'Cutoff λ Eq' }, // Nested property example
            'common_dopants': { label: 'Common Dopants', isKey: true },
            'carrier_concentration': { label: 'Carrier Conc', isHtml: true },
            'electron_mobility': { label: 'Electron Mobility (μₑ)', isKey: true, isHtml: true },
            'hole_mobility': { label: 'Hole Mobility (μ<0xE2><0x82><0x95>)', isHtml: true }, // Note: Use actual subscript in HTML if needed
            'dielectric_constant': { label: 'Dielectric Const (ε)', isHtml: true },
            'resistivity': { label: 'Resistivity (ρ)', isHtml: true },
            'breakdown_field': { label: 'Breakdown Field', isHtml: true }
        }},
        { id: 'section-optical', title: 'Optical Properties', dataKey: 'optical_properties', properties: {
            'spectral_range': { label: 'Spectral Range', isKey: true, isHtml: true },
            'cutoff_wavelength': { label: 'Cutoff Wavelength (λc)', isKey: true, isHtml: true },
            'refractive_index': { label: 'Refractive Index (n)', isHtml: true },
            'absorption_coefficient': { label: 'Absorption Coeff (α)', isHtml: true },
            'quantum_efficiency': { label: 'Quantum Efficiency (η)', isKey: true, isHtml: true },
            'responsivity': { label: 'Responsivity (R)', isKey: true, isHtml: true },
            'noise_equivalent_power': { label: 'Noise Equiv. Power (NEP)', isHtml: true }
        }},
         { id: 'section-thermal', title: 'Thermal Properties', dataKey: 'thermal_properties', properties: {
            'operating_temperature': { label: 'Operating Temperature', isKey: true, isHtml: true },
            'thermal_conductivity': { label: 'Thermal Conductivity (k)', isHtml: true },
            'specific_heat': { label: 'Specific Heat (Cp)', isHtml: true },
            'melting_point': { label: 'Melting Point', isHtml: true }
        }},
        { id: 'section-mechanical', title: 'Mechanical Properties', dataKey: 'mechanical_properties', properties: {
             'density': { label: 'Density', isHtml: true },
             'youngs_modulus': { label: 'Young\'s Modulus (E)', isHtml: true },
             'hardness_vickers': { label: 'Hardness (Vickers)', isHtml: true },
             'poissons_ratio': { label: 'Poisson\'s Ratio (ν)' }, // Plain number usually
             'fracture_toughness': { label: 'Fracture Toughness (K<small>IC</small>)', isHtml: true } // Allow small tag
        }},
        { id: 'section-applications', title: 'Key Applications & Sensor Types', dataKey: 'device_applications', properties: {
            'sensor_types': { label: 'Common Sensor Types' }, // Comma list
            'key_applications': { label: 'Key Applications', isKey: true, isHtml: true } // Bulleted list
        }},
        { id: 'section-chemical', title: 'Chemical Properties', dataKey: 'chemical_properties', properties: {
            'stability_oxidation': { label: 'Stability & Oxidation' }
        }},
        { id: 'section-magnetic', title: 'Magnetic Properties', dataKey: 'magnetic_properties', properties: { // Adjusted for Superconductors too
            'type': { label: 'Magnetic Type', isKey: true },
            'critical_temperature_tc': { label: 'Critical Temp (Tc)', isHtml: true },
             'upper_critical_field_bc2': { label: 'Upper Critical Field (Bc2)', isHtml: true },
             'critical_current_density_jc': { label: 'Critical Current (Jc)', isHtml: true }
        }},
        { id: 'section-comparison', title: 'Comparison with Alternatives', dataKey: 'comparison_alternatives', isSpecial: true }, // Handled separately
        { id: 'section-references', title: 'References & Further Reading', dataKey: 'references_further_reading', isSpecial: true }, // Handled separately
        { id: 'section-vendors', title: 'Commercial Vendors (Example)', dataKey: 'vendor_info', isSpecial: true } // Handled separately
    ];

    // --- Populate Header & Tags (Outside Main Container) ---
    document.getElementById('material-name').textContent = getData(material, 'name', 'Unknown Material');
    const formulaElement = document.getElementById('material-formula');
    if(formulaElement) formulaElement.innerHTML = getData(material, 'formula', ''); // Allow HTML

    const tagsContainer = document.getElementById('material-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = ''; // Clear
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
        if (!tagsAdded) tagsContainer.innerHTML = fallbackValue;
    }

    // --- Dynamically Create and Populate Sections ---
    console.log("[Detail Page] Dynamically building sections...");
    const fragment = document.createDocumentFragment(); // Use fragment for performance

    sectionConfig.forEach(config => {
        const { id, title, icon, dataKey, properties, isSpecial } = config;

        // Check if the top-level data key exists for standard sections
        if (dataKey && !material[dataKey]) {
            // console.log(`Skipping section "${title}" - data key "${dataKey}" not found in material data.`);
            return; // Skip section if its main data key is missing
        }

        // Handle Special Sections Separately
        if (isSpecial) {
            // --- Overview Section ---
            if (id === 'section-overview') {
                const section = createSection(id, title);
                const descP = document.createElement('p');
                descP.className = 'description';
                descP.textContent = getData(material, 'description', 'No description available.'); // Use textContent
                section.appendChild(descP);

                const wikiUrl = getData(material, 'wiki_link', '#');
                if (wikiUrl !== '#' && wikiUrl !== fallbackValue) {
                    const wikiP = document.createElement('p');
                    const wikiA = document.createElement('a');
                    wikiA.id = 'wiki-link'; // Keep ID if needed
                    wikiA.href = wikiUrl;
                    wikiA.target = '_blank';
                    wikiA.rel = 'noopener noreferrer';
                    wikiA.textContent = 'Wikipedia Article';
                    wikiP.appendChild(document.createTextNode('See also: '));
                    wikiP.appendChild(wikiA);
                    section.appendChild(wikiP);
                }
                 // Add placeholder image div
                 const imgPlaceholder = document.createElement('div');
                 imgPlaceholder.className = 'image-placeholder';
                 imgPlaceholder.textContent = 'Image Placeholder / Diagram';
                 section.appendChild(imgPlaceholder);

                 fragment.appendChild(section);
            }
            // --- Comparison Section ---
            else if (id === 'section-comparison' && material.comparison_alternatives) {
                 const section = createSection(id, title);
                 const dl = document.createElement('dl');
                 dl.className = 'property-list';
                 dl.id = 'comparison-list'; // Keep ID if useful

                 // Add Notes first if they exist
                 const notesValue = getData(material, 'comparison_alternatives.notes', 'CHECK_FALLBACK');
                 if (notesValue !== 'CHECK_FALLBACK' && notesValue !== fallbackValue) {
                    dl.appendChild(createPropertyItem('Notes', notesValue));
                 }

                 // Add dynamic 'vs_' items
                 let comparisonsFound = false;
                 Object.entries(material.comparison_alternatives).forEach(([key, value]) => {
                    if (key.startsWith('vs_')) {
                         const valueStr = getData(material, `comparison_alternatives.${key}`, fallbackValue); // Get formatted value
                         if (valueStr !== fallbackValue) {
                             const label = key.replace(/^vs_/, 'vs. ');
                             dl.appendChild(createPropertyItem(label, valueStr));
                             comparisonsFound = true;
                         }
                    }
                 });

                 // Add N/A message if nothing was added (and notes were also absent/NA)
                 if (!comparisonsFound && (notesValue === 'CHECK_FALLBACK' || notesValue === fallbackValue)) {
                     const naItem = document.createElement('div');
                     naItem.className = 'property-item comparison-na-message';
                     naItem.innerHTML = `<dd class="property-value">${fallbackValue}</dd>`;
                     dl.appendChild(naItem);
                 }

                 section.appendChild(dl);
                 fragment.appendChild(section);
            }
            // --- References Section ---
            else if (id === 'section-references' && material.references_further_reading) {
                 const section = createSection(id, title);
                 const ul = document.createElement('ul');
                 ul.id = 'reference-list';
                 let listContent = '';
                 const notesValue = getData(material, 'references_further_reading.notes', 'CHECK_FALLBACK');
                  if (notesValue !== 'CHECK_FALLBACK' && notesValue !== fallbackValue) {
                      listContent += `<li class="ref-notes"><em>${notesValue}</em></li>`;
                  }
                  let refsAdded = false;
                  Object.entries(material.references_further_reading).forEach(([key, value])=>{
                      if(key !== 'notes'){
                          const refValue = getData(material, `references_further_reading.${key}`, fallbackValue);
                           if (refValue !== fallbackValue) {
                                let itemHtml = '';
                                if (key === 'wikipedia' && typeof refValue === 'string' && refValue.startsWith('http')) {
                                    itemHtml = `Wikipedia: <a href="${refValue}" target="_blank" rel="noopener noreferrer">${refValue}</a>`;
                                } else if (typeof refValue === 'string') { itemHtml = refValue; }
                                if(itemHtml){ listContent += `<li>${itemHtml}</li>`; refsAdded = true;}
                           }
                      }
                  });
                  ul.innerHTML = listContent || `<li>Reference information ${fallbackValue}</li>`;
                   if (!refsAdded && (notesValue === 'CHECK_FALLBACK' || notesValue === fallbackValue)) {
                        ul.innerHTML = `<li>Reference information ${fallbackValue}</li>`;
                   }
                 section.appendChild(ul);
                 fragment.appendChild(section);
            }
             // --- Vendors Section ---
             else if (id === 'section-vendors' && material.vendor_info) {
                  const section = createSection(id, title);
                  // Add standard introductory text
                  const introP = document.createElement('p');
                  introP.textContent = 'This space can list companies supplying materials or related services.';
                  section.appendChild(introP);

                  const ul = document.createElement('ul');
                  ul.id = 'vendor-list';
                  let listContent = '';
                  const notesValue = getData(material, 'vendor_info.notes', 'CHECK_FALLBACK');
                   if (notesValue !== 'CHECK_FALLBACK' && notesValue !== fallbackValue) {
                       listContent += `<li class="vendor-notes"><em>${notesValue}</em></li>`;
                   }
                   let vendorsAdded = false;
                    Object.entries(material.vendor_info).forEach(([key, value])=>{
                        if(key !== 'notes'){
                            const vendorValue = getData(material, `vendor_info.${key}`, fallbackValue);
                             if (vendorValue !== fallbackValue) {
                                 let itemHtml = vendorValue;
                                 try { // Attempt to linkify URLs
                                    const urlMatch = String(vendorValue).match(/(https?:\/\/[^\s]+)|(www\.[^\s]+)/);
                                    if (urlMatch) {
                                        const url = urlMatch[0].startsWith('http') ? urlMatch[0] : 'http://' + urlMatch[0];
                                        itemHtml = String(vendorValue).replace(urlMatch[0], `<a href="${url}" target="_blank" rel="noopener noreferrer">${urlMatch[0]}</a>`);
                                    }
                                 } catch (linkError) { /* ignore */ }
                                 listContent += `<li>${itemHtml}</li>`;
                                 vendorsAdded = true;
                             }
                        }
                    });
                  ul.innerHTML = listContent || `<li>Vendor information ${fallbackValue}</li>`;
                    if (!vendorsAdded && (notesValue === 'CHECK_FALLBACK' || notesValue === fallbackValue)) {
                        ul.innerHTML = `<li>Vendor information ${fallbackValue}</li>`;
                    }
                   section.appendChild(ul);

                  // Add standard disclaimer text
                  const disclaimerP = document.createElement('p');
                  const small = document.createElement('small');
                  small.textContent = 'Note: Listing does not imply endorsement. Contact vendors directly for current offerings.';
                  disclaimerP.appendChild(small);
                  section.appendChild(disclaimerP);

                  fragment.appendChild(section);
             }
        }
        // --- Handle Standard Sections with Property Lists ---
        else if (dataKey && properties && material[dataKey]) {
            const sectionData = material[dataKey];
            let hasContent = false; // Flag to check if section has any real data

            const section = createSection(id, title, icon);
            const dl = document.createElement('dl');
            dl.className = 'property-list';

            // Add specific properties like Category/Class if they belong logically here
            // (Example for identification section)
            if (id === 'section-identification') {
                 let catVal = getData(material, 'category', fallbackValue);
                 if (catVal !== fallbackValue) {
                     dl.appendChild(createPropertyItem('Material Category', catVal)); hasContent = true;
                 }
                 let classVal = getData(material, 'identification.class', fallbackValue); // Get class from its specific path
                 if (classVal !== fallbackValue) {
                     dl.appendChild(createPropertyItem('Material Class', classVal)); hasContent = true;
                 }
            }


            // Iterate through configured properties for the section
            Object.entries(properties).forEach(([propKey, propConfig]) => {
                 // Construct the full path to the data (e.g., 'electrical_properties.band_gap')
                 const dataPath = `${dataKey}.${propKey}`;
                 const value = getData(material, dataPath, fallbackValue); // Use HTML fallback

                 // Only add item if data is not the fallback value
                 if (value !== fallbackValue) {
                     // Use label from config, allow HTML for units/notes/lists
                     dl.appendChild(createPropertyItem(propConfig.label, value, propConfig.isKey || false));
                     hasContent = true; // Mark that we found content
                 }
            });

            // Only append the section if it has actual content
            if (hasContent) {
                section.appendChild(dl);
                fragment.appendChild(section);
            } else {
                 console.log(`Skipping section "${title}" - No valid data found for its properties.`);
            }
        }
    });

    // Append the completed fragment to the main container
    container.appendChild(fragment);

    console.log("[Detail Page] Dynamic page population complete.");

} // End of populatePage function
