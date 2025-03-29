/**
 * Loads DETAILED material data for the detail page.
 * Fetches data/material_details.json, finds the material, populates page dynamically based on available data,
 * and enhances the periodic table with relevant information and highlighting using native browser tooltips.
 */
document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");
    let materialName = null;
    const mainContainer = document.getElementById('material-content-container');
    const headerNameElement = document.getElementById("material-name");

    // --- Error Display Function ---
    const displayError = (message) => {
        console.error("[Detail Page] Error:", message);
        if (headerNameElement) headerNameElement.textContent = "Error";
        // Ensure periodic table doesn't show stale highlights/data on error
        enhancePeriodicTable(null); // Call with null formula to clear table state
        if (mainContainer) {
             mainContainer.innerHTML = `<p class="error-message" style="color: red; padding: 1rem;">Error loading material details: ${message}. Please check the console for more information.</p>`;
        } else {
            // If even main container is missing, log to console as backup
             console.error("Critical Error: Main content container '#material-content-container' not found.");
        }
        document.title = "Error - MaterialsDB";
     };

    // --- Get Material Name from URL ---
    try {
        materialName = materialNameParam ? decodeURIComponent(materialNameParam) : null;
    } catch (uriError) {
        displayError(`Invalid material name in URL (${materialNameParam}). ${uriError.message}`);
        return;
    }

    console.log("[Detail Page] Attempting to load DETAILED view for:", materialName);

    // --- Basic Validation ---
    if (!materialName) {
        displayError("No material specified in the URL.");
        return;
    }
    if (!mainContainer) {
        displayError("Essential element '#material-content-container' not found.");
        return;
    }
    if (typeof window.periodicTableData === 'undefined') {
         console.warn("[Detail Page] periodic_table_data.js might not be loaded yet or is missing.");
        // Allow proceeding but log warning, table enhancement will fail gracefully later
    }

    // --- Fetch and Process Data ---
    try {
        const detailDataPath = "data/material_details.json";
        console.log(`[Detail Page] Fetching detailed data from: ${detailDataPath}`);
        const detailRes = await fetch(detailDataPath);

        if (!detailRes.ok) {
            if (detailRes.status === 404) {
                throw new Error(`Data file not found: ${detailDataPath}. Ensure the file exists and the path is correct.`);
            } else {
                throw new Error(`HTTP error ${detailRes.status} fetching ${detailDataPath}`);
            }
        }

        let allDetailData;
        try {
            allDetailData = await detailRes.json();
        } catch (jsonError) {
            throw new Error(`Invalid JSON in ${detailDataPath}: ${jsonError.message}`);
        }

        console.log("[Detail Page] Detailed data loaded and parsed.");

        if (typeof allDetailData !== 'object' || allDetailData === null) {
            throw new Error(`Data format error: ${detailDataPath} expected top-level object { "Material Name": {...} }.`);
        }

        const material = allDetailData[materialName];
        if (!material) {
            // Try case-insensitive match as a fallback
            const lowerCaseMaterialName = materialName.toLowerCase();
            const foundKey = Object.keys(allDetailData).find(key => key.toLowerCase() === lowerCaseMaterialName);
            const actualMaterial = foundKey ? allDetailData[foundKey] : null;

            if (actualMaterial) {
                 console.warn(`[Detail Page] Case-insensitive match found for "${materialName}" as "${foundKey}". Using data for "${foundKey}".`);
                 mainContainer.innerHTML = ''; // Clear potential loading messages
                 populatePage(actualMaterial, mainContainer); // Populate sections and trigger table enhancement
            } else {
                throw new Error(`Data for "${materialName}" not found in ${detailDataPath}. Check material name and file content.`);
            }
        } else {
             console.log("[Detail Page] Specific material object found:", materialName);
             mainContainer.innerHTML = ''; // Clear potential loading messages
             populatePage(material, mainContainer); // Populate sections and trigger table enhancement
        }

    } catch (e) {
        displayError(e.message || "An unknown error occurred during data loading.");
    }
});


/**
 * Parses a chemical formula string and returns a Set of unique element symbols.
 * Handles simple formulas and common notations like subscripts, parentheses.
 * More robust parsing might be needed for complex coordination compounds or alloys.
 * @param {string | null} formula The chemical formula string, or null.
 * @returns {Set<string>} A Set containing unique, valid element symbols found.
 */
function parseFormulaForElements(formula) {
    const elements = new Set();
    if (typeof formula !== 'string' || formula.trim() === '') {
        return elements; // Return empty set if no formula provided
    }

    // Regex to find potential element symbols: An uppercase letter followed by zero or more lowercase letters.
    const elementRegex = /[A-Z][a-z]*/g;
    const potentialSymbols = formula.match(elementRegex);

    if (potentialSymbols) {
        potentialSymbols.forEach(symbol => {
            // Validate against known elements in periodicTableData
            if (window.periodicTableData && window.periodicTableData[symbol]) {
                elements.add(symbol);
            }
        });
    }

    // Handle special cases like alloys defined by composition (e.g., Fe-Ni-Co-Mo-Ti)
    if (elements.size === 0 && formula.includes('-')) {
        const alloyParts = formula.split(/[-/+,]/); // Split by common alloy delimiters
        alloyParts.forEach(part => {
            const trimmedPart = part.trim();
            if (window.periodicTableData && window.periodicTableData[trimmedPart]) {
                elements.add(trimmedPart);
            }
        });
    }
    return elements;
}

/**
 * Enhances the static periodic table in material_detail.html using NATIVE browser tooltips:
 * - Clears previous highlights and data.
 * - Adds detailed element information (name, number, category, mass, etc.) to the title attribute.
 * - Adds formatted atomic mass to the designated span within each element box.
 * - Highlights elements present in the provided material formula using the 'highlighted-element' class.
 * @param {string | null} materialFormula The formula string of the current material, or null to clear the table state.
 */
function enhancePeriodicTable(materialFormula) {
    console.log("[Detail Page] Enhancing periodic table using native titles...");
    const elementsToHighlight = parseFormulaForElements(materialFormula);
    console.log("[Detail Page] Elements parsed from formula:", materialFormula, "->", elementsToHighlight);
    const allPtElements = document.querySelectorAll('.periodic-table-container .pt-element');

    if (!window.periodicTableData) {
        console.warn("[Detail Page] Periodic table data (window.periodicTableData) is not available. Cannot enhance table.");
         allPtElements.forEach(element => element.classList.remove('highlighted-element'));
        return;
    }

    allPtElements.forEach(element => {
        const symbol = element.getAttribute('data-symbol');
        const massSpan = element.querySelector('.pt-mass');
        const isPlaceholder = element.classList.contains('pt-placeholder') || element.classList.contains('pt-series-label');

        // --- 1. Clear previous state ---
        element.classList.remove('highlighted-element');
        element.title = ''; // Clear previous title attribute
        if (massSpan) {
             massSpan.textContent = '';
             massSpan.style.display = isPlaceholder ? 'none' : '';
        }

        // Skip further processing for placeholders/labels, but add basic title
        if (isPlaceholder) {
            const placeholderText = element.textContent.match(/\d+-\d+/);
            if (placeholderText) element.title = `Elements ${placeholderText[0]}`;
            else if(element.classList.contains('pt-series-label')) element.title = element.textContent;
            return;
        }

        // --- 2. Populate with new data ---
        if (symbol && window.periodicTableData[symbol]) {
            const elementData = window.periodicTableData[symbol];
            const name = elementData.name || symbol;
            const number = elementData.number || '?';
            const category = elementData.category || 'unknown';
            const mass = elementData.mass;
            const massDisplay = mass ? mass.toFixed(3) : 'N/A';

            // *** Build TEXT content for the native title attribute ***
            let tooltipText = `${name} (${number})\n`; // Use newline character \n
            tooltipText += `Category: ${category}\n`;
            tooltipText += `Mass: ${massDisplay}`;
            if(elementData.electron_configuration_semantic) {
                 tooltipText += `\nConfig: ${elementData.electron_configuration_semantic}`;
            }
             if(elementData.e_neg_pauling) {
                 tooltipText += `\nE. Neg.: ${elementData.e_neg_pauling}`;
            }
            // Add more properties as needed using \n for new lines

            // *** Set the native title attribute ***
            element.title = tooltipText;


            // Add atomic mass to the designated span (unchanged)
            if (massSpan && mass) {
                massSpan.textContent = massDisplay;
            } else if (massSpan) {
                massSpan.textContent = 'N/A';
            }

            // --- 3. Highlight if needed (unchanged) ---
            if (elementsToHighlight.has(symbol)) {
                element.classList.add('highlighted-element');
                // console.log(`[Detail Page] Highlighting: ${symbol}`);
            }
        } else if (symbol) {
             // Basic title even if data is missing
            element.title = symbol;
             console.warn(`[Detail Page] Data missing in periodicTableData for symbol: ${symbol}`);
        } else {
             console.warn("[Detail Page] Found .pt-element without data-symbol attribute.");
        }
    });

    console.log("[Detail Page] Periodic table enhancement complete (using native titles).");
}


/**
 * Dynamically populates the main content container with sections and properties
 * based *only* on the keys present in the provided material data object.
 * @param {object} material - The detailed material data object.
 * @param {HTMLElement} container - The main HTML element to append sections to.
 */
function populatePage(material, container) {
    const fallbackValue = '<span class="na-value">N/A</span>';

    // --- Helper Function: getData --- (Handles nested access and formatting)
    const getData = (obj, path, fallback = fallbackValue) => {
        const value = path.split('.').reduce((o, key) => (o && typeof o === 'object' && o[key] !== undefined && o[key] !== null) ? o[key] : undefined, obj);
        if (value === undefined || value === null) return fallback;

        if (typeof value === 'object' && !Array.isArray(value) && value.value !== undefined) {
           const stringVal = String(value.value).trim();
           if (stringVal === '' || stringVal.toUpperCase() === 'N/A') return fallback;
           let text = stringVal;
           if (value.unit) text += ` <span class="unit">${value.unit}</span>`;
           if (value.notes) text += ` <span class="notes">(${value.notes})</span>`;
           return text;
        }
        if (Array.isArray(value)) {
            const listPathsForBullets = ['device_applications.key_applications','device_integration_characterization.key_characterization_techniques'];
            const filteredValues = value.filter(item => item !== null && item !== undefined && String(item).trim() !== '');
            if (filteredValues.length === 0) return fallback;
            const itemsContent = filteredValues.map(item => (typeof item === 'string' && (item.includes('{') || item.includes('.'))) ? getData(material, item) : item).join(', '); // Basic handling, may need refinement
            if (listPathsForBullets.includes(path)) {
                return `<ul class="property-list-items">${filteredValues.map(item => `<li>${(typeof item === 'string' && (item.includes('{') || item.includes('.'))) ? getData(material, item) : item}</li>`).join('')}</ul>`;
            }
            return itemsContent;

        }
         if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1 && value.notes !== undefined) {
            const noteString = String(value.notes).trim();
            return (noteString !== '' && noteString.toUpperCase() !== 'N/A') ? `<span class="notes-only">${noteString}</span>` : fallback;
        }
        if (typeof value === 'object' && !Array.isArray(value)) {
            console.warn(`[getData] Encountered unexpected object structure for path "${path}". Returning fallback. Object:`, value);
            return fallback;
        }
        const stringValue = String(value).trim();
        return (stringValue === '' || stringValue.toUpperCase() === 'N/A') ? fallback : stringValue;
    };

    // --- Helper Function: createPropertyItem ---
    const createPropertyItem = (keyText, valueHtml, isKey = false) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'property-item';
        if (isKey) itemDiv.classList.add('key-property');
        const dt = document.createElement('dt');
        dt.className = 'property-key';
        dt.textContent = keyText + ':';
        const dd = document.createElement('dd');
        dd.className = 'property-value';
        dd.innerHTML = valueHtml;
        if (valueHtml === fallbackValue) dd.classList.add('na-value');
        itemDiv.appendChild(dt);
        itemDiv.appendChild(dd);
        return itemDiv;
    };

    // --- Helper Function: createSection ---
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
            h2.appendChild(document.createTextNode(' '));
        }
        h2.appendChild(document.createTextNode(title));
        section.appendChild(h2);
        if (id === 'section-safety') section.classList.add('safety-info');
        return section;
    };

    // --- Configuration for Sections and Properties ---
    const sectionConfig = [
        { id: 'section-overview', title: 'Overview', isSpecial: true },
        { id: 'section-safety', title: 'Safety Information', icon: '⚠️', dataKey: 'safety', properties: {'toxicity': { label: 'Toxicity', isKey: true }, 'handling': { label: 'Handling' }}},
        { id: 'section-identification', title: 'Identification & Structure', dataKey: 'identification', properties: {'cas_number': { label: 'CAS Number' }, 'crystal_structure': { label: 'Crystal Structure', isKey: true }, 'lattice_constant': { label: 'Lattice Constant', isKey: true, isHtml: true },'phase_diagram_notes': { label: 'Phase Diagram Notes' }}},
        { id: 'section-fab-insights', title: 'Advanced Fabrication Insights', dataKey: 'advanced_fabrication_insights', properties: {'stoichiometry_control': { label: 'Stoichiometry Control', isKey: true }, 'common_defects_impact': { label: 'Common Defects' }, 'surface_preparation': { label: 'Surface Preparation' }, 'method_specific_notes': { label: 'Method Nuances' }}},
        { id: 'section-growth', title: 'Growth & Fabrication Properties', dataKey: 'growth_fabrication_properties', properties: {'common_growth_methods': { label: 'Common Methods' }, 'source_materials_purity': { label: 'Source Materials' }, 'preferred_substrates_orientations': { label: 'Substrates/Orientations', isKey: true }, 'typical_growth_parameters': { label: 'Growth Parameters' }, 'passivation_methods': { label: 'Passivation', isKey: true }}},
        { id: 'section-processing', title: 'Post-Growth Processing', dataKey: 'post_growth_processing', properties: {'annealing': { label: 'Annealing', isKey: true }, 'lapping_polishing': { label: 'Lapping & Polishing' }, 'etching': { label: 'Etching Methods' }, 'grinding_milling': { label: 'Grinding/Milling Notes' }}},
        { id: 'section-device-char', title: 'Device Integration & Characterization', dataKey: 'device_integration_characterization', properties: {'device_architectures': { label: 'Device Architectures' }, 'readout_integration': { label: 'Readout Integration', isKey: true }, 'ar_coatings': { label: 'AR Coatings' }, 'packaging_cooling': { label: 'Packaging/Cooling', isKey: true }, 'key_characterization_techniques': { label: 'Key Characterization', isHtml: true }}},
        { id: 'section-electrical', title: 'Electrical Properties', dataKey: 'electrical_properties', properties: {'bandgap_type': { label: 'Bandgap Type' }, 'band_gap': { label: 'Bandgap (Eg)', isKey: true, isHtml: true }, 'bandgap_equation.hansen_eg': { label: 'Hansen Eg Eq' }, 'bandgap_equation.varshni_equation': { label: 'Varshni Eg Eq' }, 'bandgap_equation.wavelength_relation': { label: 'Cutoff λ Eq' }, 'common_dopants': { label: 'Common Dopants', isKey: true }, 'carrier_concentration': { label: 'Carrier Conc', isHtml: true }, 'electron_mobility': { label: 'Electron Mobility (μₑ)', isKey: true, isHtml: true }, 'hole_mobility': { label: 'Hole Mobility (μ<0xE2><0x82><0x95>)', isHtml: true }, 'dielectric_constant': { label: 'Dielectric Const (ε)', isHtml: true }, 'resistivity': { label: 'Resistivity (ρ)', isHtml: true }, 'breakdown_field': { label: 'Breakdown Field', isHtml: true }}},
        { id: 'section-optical', title: 'Optical Properties', dataKey: 'optical_properties', properties: {'spectral_range': { label: 'Spectral Range', isKey: true, isHtml: true }, 'cutoff_wavelength': { label: 'Cutoff Wavelength (λc)', isKey: true, isHtml: true }, 'refractive_index': { label: 'Refractive Index (n)', isHtml: true }, 'absorption_coefficient': { label: 'Absorption Coeff (α)', isHtml: true }, 'quantum_efficiency': { label: 'Quantum Efficiency (η)', isKey: true, isHtml: true }, 'responsivity': { label: 'Responsivity (R)', isKey: true, isHtml: true }, 'noise_equivalent_power': { label: 'Noise Equiv. Power (NEP)', isHtml: true }, 'nonlinear_refractive_index_n2': { label: 'Nonlinear Index (n₂)'},'scattering_loss': { label: 'Scattering Loss'}}},
        { id: 'section-thermal', title: 'Thermal Properties', dataKey: 'thermal_properties', properties: {'operating_temperature': { label: 'Operating Temperature', isKey: true, isHtml: true }, 'thermal_conductivity': { label: 'Thermal Conductivity (k)', isHtml: true }, 'specific_heat': { label: 'Specific Heat (Cp)', isHtml: true }, 'melting_point': { label: 'Melting Point', isHtml: true }, 'glass_transition_temp_tg': { label: 'Glass Transition (Tg)'}, 'thermal_expansion': { label: 'Thermal Expansion (CTE)'},'decomposition_temperature': { label: 'Decomposition Temp'}}},
        { id: 'section-mechanical', title: 'Mechanical Properties', dataKey: 'mechanical_properties', properties: {'density': { label: 'Density', isHtml: true }, 'youngs_modulus': { label: 'Young\'s Modulus (E)', isHtml: true }, 'tensile_strength': { label: 'Tensile Strength' }, 'elongation_at_break': { label: 'Elongation @ Break (%)' }, 'hardness_vickers': { label: 'Hardness (Vickers)', isHtml: true }, 'poissons_ratio': { label: 'Poisson\'s Ratio (ν)' }, 'fracture_toughness': { label: 'Fracture Toughness (K<small>IC</small>)', isHtml: true }}},
        { id: 'section-applications', title: 'Key Applications & Sensor Types', dataKey: 'device_applications', properties: {'sensor_types': { label: 'Common Sensor Types' }, 'key_applications': { label: 'Key Applications', isKey: true, isHtml: true }}},
        { id: 'section-chemical', title: 'Chemical Properties', dataKey: 'chemical_properties', properties: {'stability_oxidation': { label: 'Stability & Oxidation' },'solvent_resistance': { label: 'Solvent Resistance'}, 'acid_resistance': { label: 'Acid Resistance'},'base_resistance': { label: 'Base Resistance'},'water_solubility': { label: 'Water Solubility'},'radiation_resistance': { label: 'Radiation Resistance'},'uv_resistance': { label: 'UV Resistance'}}},
        { id: 'section-magnetic', title: 'Magnetic Properties', dataKey: 'magnetic_properties', properties: {'type': { label: 'Magnetic Type', isKey: true }, 'critical_temperature_tc': { label: 'Critical Temp (Tc)', isHtml: true }, 'upper_critical_field_bc2': { label: 'Upper Critical Field (Bc2)', isHtml: true }, 'critical_current_density_jc': { label: 'Critical Current (Jc)', isHtml: true }}},
        { id: 'section-comparison', title: 'Comparison with Alternatives', dataKey: 'comparison_alternatives', isSpecial: true },
        { id: 'section-references', title: 'References & Further Reading', dataKey: 'references_further_reading', isSpecial: true },
        { id: 'section-vendors', title: 'Commercial Vendors (Example)', dataKey: 'vendor_info', isSpecial: true }
    ];

    // --- Populate Header, Title, and Tags ---
    const materialNameDisplay = getData(material, 'name', 'Unknown Material');
    const materialFormulaDisplay = getData(material, 'formula', '');
    document.title = `${materialNameDisplay} Detail - MaterialsDB`;
    document.getElementById('material-name').textContent = materialNameDisplay;
    const formulaElement = document.getElementById('material-formula');
    if (formulaElement) formulaElement.innerHTML = materialFormulaDisplay;

    const tagsContainer = document.getElementById('material-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        const tags = material.tags || []; let tagsAdded = false;
        if (Array.isArray(tags) && tags.length > 0) {
            tags.forEach(tag => {
                if (typeof tag === 'string' && tag.trim() !== '') {
                    const tagElement = document.createElement('span'); tagElement.className = 'tag';
                    tagElement.textContent = tag.replace(/^\w+:/, "");
                    tagsContainer.appendChild(tagElement); tagsAdded = true;
                }
            });
        }
        if (!tagsAdded) tagsContainer.innerHTML = fallbackValue;
    } else { console.warn("[Detail Page] Tags container '#material-tags' not found."); }

    // --- Dynamically Create and Populate Main Content Sections ---
    console.log("[Detail Page] Dynamically building content sections...");
    const fragment = document.createDocumentFragment();

    sectionConfig.forEach(config => {
        const { id, title, icon, dataKey, properties, isSpecial } = config;
        let sectionDataExists = false;
        if (isSpecial) {
            if (id === 'section-overview') sectionDataExists = material['description'] || material['wiki_link'];
            else if (dataKey && material[dataKey]) sectionDataExists = true;
        } else if (dataKey && material[dataKey] && typeof material[dataKey] === 'object') {
            sectionDataExists = true;
        }
        if (!sectionDataExists) return;

        let section = createSection(id, title, icon);
        let sectionHasRenderableContent = false;

        if (isSpecial) {
            // --- Custom Logic for Special Sections ---
             if (id === 'section-overview') {
                const descVal = getData(material, 'description', fallbackValue);
                if (descVal !== fallbackValue) { const p = document.createElement('p'); p.className='description'; p.textContent=descVal; section.appendChild(p); sectionHasRenderableContent = true; }
                const wikiUrl = getData(material, 'wiki_link', '#');
                if (wikiUrl !== '#' && wikiUrl !== fallbackValue) { const p = document.createElement('p'); const a = document.createElement('a'); a.id = 'wiki-link'; a.href=wikiUrl; a.target='_blank'; a.rel='noopener noreferrer'; a.textContent='Wikipedia Article'; p.appendChild(document.createTextNode('See also: ')); p.appendChild(a); section.appendChild(p); sectionHasRenderableContent = true;}
                const imgPlaceholder = document.createElement('div'); imgPlaceholder.className = 'image-placeholder'; imgPlaceholder.textContent = 'Image Placeholder / Diagram'; section.appendChild(imgPlaceholder);
                sectionHasRenderableContent = true; // Placeholder always shown
            }
            else if (id === 'section-comparison' && material.comparison_alternatives) {
                 const dl = document.createElement('dl'); dl.className = 'property-list'; dl.id = 'comparison-list';
                 let comparisonsAdded = false;
                 const notesValue = getData(material, 'comparison_alternatives.notes', fallbackValue);
                 if (notesValue !== fallbackValue) {
                      const notesP = document.createElement('p'); notesP.innerHTML = `<em>${notesValue}</em>`;
                      section.insertBefore(notesP, section.firstChild.nextSibling); // Insert notes after h2
                      sectionHasRenderableContent = true; comparisonsAdded = true;
                 }
                 Object.entries(material.comparison_alternatives).forEach(([key, value]) => {
                    if (key.startsWith('vs_')) {
                         const comparisonValueStr = getData(material, `comparison_alternatives.${key}`, fallbackValue);
                         if (comparisonValueStr !== fallbackValue) {
                             dl.appendChild(createPropertyItem(key.replace(/^vs_/, 'vs. '), comparisonValueStr));
                             sectionHasRenderableContent = true; comparisonsAdded = true;
                         }
                    }
                 });
                 if (comparisonsAdded && dl.hasChildNodes()) {
                     section.appendChild(dl);
                 } else if (notesValue === fallbackValue) { // Only show N/A if notes were ALSO missing
                      dl.innerHTML = `<div class="property-item comparison-na-message"><dd class="property-value">${fallbackValue}</dd></div>`;
                      section.appendChild(dl); sectionHasRenderableContent = true;
                 }
            }
             else if (id === 'section-references' && material.references_further_reading) {
                 const ul = document.createElement('ul'); ul.id = 'reference-list'; let listHasContent = false;
                 const notesValue = getData(material, 'references_further_reading.notes', fallbackValue);
                 if (notesValue !== fallbackValue) { const notesLi = document.createElement('li'); notesLi.className = 'ref-notes'; notesLi.innerHTML = `<em>${notesValue}</em>`; ul.appendChild(notesLi); listHasContent = true; }
                 Object.entries(material.references_further_reading).forEach(([key, value])=>{
                     if(key !== 'notes'){
                         const refValue = getData(material, `references_further_reading.${key}`, fallbackValue);
                          if (refValue !== fallbackValue) {
                              const li = document.createElement('li'); let itemHtml = refValue;
                              if (key === 'wikipedia' && typeof refValue === 'string' && refValue.startsWith('http')) { itemHtml = `Wikipedia: <a href="${refValue}" target="_blank" rel="noopener noreferrer">${refValue}</a>`; }
                              else if (typeof refValue === 'string' && (refValue.startsWith('http') || refValue.startsWith('www'))) { const url = refValue.startsWith('http') ? refValue : 'http://' + refValue; itemHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${refValue}</a>`; }
                              li.innerHTML = itemHtml; ul.appendChild(li); listHasContent = true;
                          }
                     }
                 });
                 if (!listHasContent) { ul.innerHTML = `<li>Reference information ${fallbackValue}</li>`; }
                 section.appendChild(ul); sectionHasRenderableContent = true;
            }
             else if (id === 'section-vendors' && material.vendor_info) {
                  const introP = document.createElement('p'); introP.textContent = 'This space can list companies supplying materials or related services. (Example data)'; section.appendChild(introP);
                  const ul = document.createElement('ul'); ul.id = 'vendor-list'; let listHasContent = false;
                  const notesValue = getData(material, 'vendor_info.notes', fallbackValue);
                  if (notesValue !== fallbackValue) { const notesLi = document.createElement('li'); notesLi.className = 'vendor-notes'; notesLi.innerHTML = `<em>${notesValue}</em>`; ul.appendChild(notesLi); listHasContent = true; }
                  Object.entries(material.vendor_info).forEach(([key, value])=>{
                       if(key !== 'notes'){
                           const vendorValue = getData(material, `vendor_info.${key}`, fallbackValue);
                            if (vendorValue !== fallbackValue) {
                                const li = document.createElement('li'); let itemHtml = vendorValue;
                                try { const urlMatch = String(vendorValue).match(/(https?:\/\/[^\s"'>]+)|(www\.[^\s"'>]+)/); if (urlMatch) { const url = urlMatch[0].startsWith('http') ? urlMatch[0] : 'http://' + urlMatch[0]; itemHtml = String(vendorValue).replace(urlMatch[0], `<a href="${url}" target="_blank" rel="noopener noreferrer">${urlMatch[0]}</a>`); } } catch (linkError) {}
                                li.innerHTML = itemHtml; ul.appendChild(li); listHasContent = true;
                            }
                       }
                  });
                  if (!listHasContent) { ul.innerHTML = `<li>Vendor information ${fallbackValue}</li>`; }
                  section.appendChild(ul);
                  const disclaimerP = document.createElement('p'); const small = document.createElement('small'); small.textContent = 'Note: Listing does not imply endorsement. Contact vendors directly for current offerings.'; disclaimerP.appendChild(small); section.appendChild(disclaimerP);
                  sectionHasRenderableContent = true;
             }
            // --- Append Special Section ---
            if (sectionHasRenderableContent) fragment.appendChild(section);

        } else if (dataKey && properties && material[dataKey]) {
             // --- Logic for Standard Sections ---
            const dl = document.createElement('dl'); dl.className = 'property-list';
            let propertiesAddedToDl = false;

            if (id === 'section-identification') {
                let catVal = getData(material, 'category', fallbackValue);
                if (catVal !== fallbackValue) { dl.appendChild(createPropertyItem('Material Category', catVal)); sectionHasRenderableContent = true; propertiesAddedToDl = true;}
                let classVal = getData(material, 'identification.class', fallbackValue);
                if (classVal !== fallbackValue) { dl.appendChild(createPropertyItem('Material Class', classVal)); sectionHasRenderableContent = true; propertiesAddedToDl = true;}
            }

            Object.entries(properties).forEach(([propKey, propConfig]) => {
                 const dataPath = `${dataKey}.${propKey}`;
                 const value = getData(material, dataPath, fallbackValue);
                 if (value !== fallbackValue) {
                     dl.appendChild(createPropertyItem(propConfig.label, value, propConfig.isKey || false));
                     sectionHasRenderableContent = true; propertiesAddedToDl = true;
                 }
            });
            // --- Append Standard Section ---
            if (propertiesAddedToDl) { // Only append if dl has items
                section.appendChild(dl); fragment.appendChild(section);
            }
        }
    });

    container.appendChild(fragment);
    console.log("[Detail Page] Dynamic page section population complete.");

    // --- Enhance Periodic Table ---
    enhancePeriodicTable(material ? material.formula : null); // Pass formula string

} // End of populatePage function
