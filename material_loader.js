/**
 * Loads DETAILED material data for the detail page.
 * Fetches data/material_details.json, finds the material, populates page dynamically based on available data,
 * and enhances the periodic table with relevant information and highlighting using native browser tooltips.
 * Hides the periodic table if an error occurs during loading.
 */
document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");
    let materialName = null;
    const mainContainer = document.getElementById('material-content-container');
    const headerNameElement = document.getElementById("material-name");
    const periodicTableSection = document.getElementById('section-periodic-table'); // Get table section early

    // --- Error Display Function ---
    const displayError = (message) => {
        console.error("[Detail Page] Error:", message);
        if (headerNameElement) headerNameElement.textContent = "Error";

        // HIDE the periodic table section on error
        if (periodicTableSection) {
            periodicTableSection.style.display = 'none';
            console.log("[Detail Page] Hiding periodic table due to error.");
        } else {
            console.warn("[Detail Page] Could not find periodic table section to hide.");
        }
        // enhancePeriodicTable(null); // Optional: clear table state anyway

        // Display error message in main content area
        if (mainContainer) {
             mainContainer.innerHTML = `<p class="error-message" style="color: red; padding: 1rem;">Error loading material details: ${message}. Please check the console for more information.</p>`;
        } else {
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
    if (!mainContainer || !periodicTableSection) { // Check for table section here too
        displayError("Essential page element(s) missing (#material-content-container or #section-periodic-table).");
        return;
    }
    if (typeof window.periodicTableData === 'undefined') {
         console.warn("[Detail Page] periodic_table_data.js might not be loaded yet or is missing.");
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

        let actualMaterial = allDetailData[materialName]; // Try direct match first

        if (!actualMaterial) {
            // Try case-insensitive match as a fallback only if direct match fails
            const lowerCaseMaterialName = materialName.toLowerCase();
            const foundKey = Object.keys(allDetailData).find(key => key.toLowerCase() === lowerCaseMaterialName);
            if (foundKey) {
                 actualMaterial = allDetailData[foundKey];
                 console.warn(`[Detail Page] Case-insensitive match found for "${materialName}" as "${foundKey}". Using data for "${foundKey}".`);
            } else {
                throw new Error(`Data for "${materialName}" not found in ${detailDataPath}. Check material name and file content.`);
            }
        }

        // Ensure periodic table is visible (it might have been hidden by a previous error)
        periodicTableSection.style.display = ''; // Reset display style

        mainContainer.innerHTML = ''; // Clear potential loading messages
        populatePage(actualMaterial, mainContainer); // Populate sections and trigger table enhancement

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
 * - Highlights elements present in the material's `constituent_elements` array (if defined)
 *   OR by parsing the `material.formula` string.
 * @param {object | null} material The full material object from details JSON, or null to clear.
 */
function enhancePeriodicTable(material) { // Takes the full material object
    console.log("[Detail Page] Enhancing periodic table using native titles...");
    let elementsToHighlight = new Set(); // Initialize empty set

    // Determine which elements to highlight
    if (material) {
        // *** PRIORITIZE constituent_elements array if it exists and is an array ***
        if (Array.isArray(material.constituent_elements)) {
            console.log("[Detail Page] Using constituent_elements array:", material.constituent_elements);
            material.constituent_elements.forEach(el => {
                if (typeof el === 'string' && window.periodicTableData && window.periodicTableData[el]) {
                    elementsToHighlight.add(el); // Add valid elements from the array
                } else if(typeof el === 'string') {
                    console.warn(`[Constituent Element] Invalid or unknown element symbol in array: ${el}`);
                }
            });
        } else if (material.formula) {
            // Fallback to parsing the formula string if the array is missing or not an array
            console.log("[Detail Page] constituent_elements not found or invalid, parsing formula:", material.formula);
            elementsToHighlight = parseFormulaForElements(material.formula);
        } else {
             console.log("[Detail Page] No constituent_elements array or formula found for material:", material.name);
        }
    } else {
         console.log("[Detail Page] No material data provided, clearing table highlights.");
    }

    console.log("[Detail Page] Elements determined for highlighting:", elementsToHighlight);
    const allPtElements = document.querySelectorAll('.periodic-table-container .pt-element');

    if (!window.periodicTableData) {
        console.warn("[Detail Page] Periodic table data (window.periodicTableData) is not available. Cannot enhance table.");
         allPtElements.forEach(element => element.classList.remove('highlighted-element'));
        return;
    }

    // Process each element tile in the table
    allPtElements.forEach(element => {
        const symbol = element.getAttribute('data-symbol');
        const massSpan = element.querySelector('.pt-mass');
        const isPlaceholder = element.classList.contains('pt-placeholder') || element.classList.contains('pt-series-label');

        // --- 1. Clear previous state ---
        element.classList.remove('highlighted-element');
        element.title = ''; // Clear previous title attribute
        if (massSpan) {
             massSpan.textContent = '';
             massSpan.style.display = isPlaceholder ? 'none' : ''; // Hide mass span for placeholders/labels
        }

        // Skip further processing for placeholders/labels, but add basic title
        if (isPlaceholder) {
            const placeholderText = element.textContent.match(/\d+-\d+/); // Extract range like "57-71"
            if (placeholderText) {
                element.title = `Elements ${placeholderText[0]}`;
            } else if (element.classList.contains('pt-series-label')) {
                element.title = element.textContent; // Use label text like "Lanthanides"
            }
            return; // Stop processing for this element
        }

        // --- 2. Populate with new data ---
        if (symbol && window.periodicTableData[symbol]) {
            const elementData = window.periodicTableData[symbol];
            const name = elementData.name || symbol;
            const number = elementData.number || '?';
            const category = elementData.category || 'unknown';
            const mass = elementData.mass;
            const massDisplay = mass ? mass.toFixed(3) : 'N/A';

            // Build TEXT content for the native title attribute (\n for newlines)
            let tooltipText = `${name} (${number})\n`;
            tooltipText += `Category: ${category}\n`;
            tooltipText += `Mass: ${massDisplay}`;
            if(elementData.electron_configuration_semantic) {
                 tooltipText += `\nConfig: ${elementData.electron_configuration_semantic}`;
            }
             if(elementData.e_neg_pauling) {
                 tooltipText += `\nE. Neg.: ${elementData.e_neg_pauling}`;
             }
             // Add other useful data from periodicTableData here if desired...

            // Set the native title attribute
            element.title = tooltipText;

            // Add atomic mass to the designated span
            if (massSpan) {
                massSpan.textContent = massDisplay;
            }

            // --- 3. Highlight if needed ---
            if (elementsToHighlight.has(symbol)) {
                element.classList.add('highlighted-element');
            }
        } else if (symbol) {
             // Element exists in HTML but not in our JS data
            element.title = symbol; // Basic title
            if(massSpan) massSpan.textContent = 'N/A';
             console.warn(`[Detail Page] Data missing in periodicTableData for symbol: ${symbol}`);
        } else {
             // Should not happen if HTML has data-symbol on all elements
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

        // Handle complex value/unit/notes objects
        if (typeof value === 'object' && !Array.isArray(value) && value.value !== undefined) {
           const stringVal = String(value.value).trim();
           if (stringVal === '' || stringVal.toUpperCase() === 'N/A') return fallback;
           let text = stringVal;
           if (value.unit) text += ` <span class="unit">${value.unit}</span>`;
           if (value.notes) text += ` <span class="notes">(${value.notes})</span>`;
           return text;
        }

        // Handle arrays: Create bullet points for specific paths, otherwise join with comma
        if (Array.isArray(value)) {
            const listPathsForBullets = [
                'device_applications.key_applications',
                'device_integration_characterization.key_characterization_techniques'
                // Add other paths here if needed
            ];
            const filteredValues = value.filter(item => item !== null && item !== undefined && String(item).trim() !== '');
            if (filteredValues.length === 0) return fallback;

            // Process items recursively using getData in case they are complex objects or paths
            const processedItems = filteredValues.map(item => {
                if (typeof item === 'string' && (item.includes('.') || item.includes('{'))) {
                     // Treat as path if it contains '.' and isn't clearly JSON
                    if (item.includes('.') && !item.trim().startsWith('{')) {
                        return getData(material, item, item); // Try getting data, fallback to original string if not found
                    }
                    // Basic check for JSON-like string (could be improved)
                    if (item.trim().startsWith('{') && item.trim().endsWith('}')) {
                        try {
                           const parsed = JSON.parse(item); // Attempt to parse if looks like JSON
                           if (parsed.value !== undefined) return getData(null, null, item); // Re-process if it fits value/unit/notes structure
                        } catch(e) { /* ignore parse error, treat as plain string */ }
                    }
                 }
                // Handle plain strings or non-path-like items directly
                return (typeof item === 'object') ? JSON.stringify(item) : item; // Stringify objects not handled above
            });


            if (listPathsForBullets.includes(path)) {
                return `<ul class="property-list-items">${processedItems.map(item => `<li>${item}</li>`).join('')}</ul>`;
            } else {
                 return processedItems.join(', ');
            }
        }

        // Handle simple objects containing only 'notes'
         if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1 && value.notes !== undefined) {
            const noteString = String(value.notes).trim();
            return (noteString !== '' && noteString.toUpperCase() !== 'N/A') ? `<span class="notes-only">${noteString}</span>` : fallback;
        }

        // Handle other unexpected objects
        if (typeof value === 'object' && !Array.isArray(value)) {
            console.warn(`[getData] Encountered unexpected object structure for path "${path}". Returning fallback. Object:`, value);
            return fallback;
        }

        // Handle primitive values (strings, numbers, booleans)
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
    // UPDATED: Added/Modified entries for properties from HgCdTe and ZTA examples
    const sectionConfig = [
        { id: 'section-overview', title: 'Overview', isSpecial: true },
        { id: 'section-safety', title: 'Safety Information', icon: '⚠️', dataKey: 'safety', properties: {'toxicity': { label: 'Toxicity', isKey: true }, 'handling': { label: 'Handling' }}},
        { id: 'section-identification', title: 'Identification & Structure', dataKey: 'identification', properties: {'cas_number': { label: 'CAS Number' }, 'class': {label: 'Material Class'}, 'crystal_structure': { label: 'Crystal Structure', isKey: true }, 'space_group': { label: 'Space Group', isHtml: true}, 'lattice_constant': { label: 'Lattice Constant', isKey: true, isHtml: true }, 'phase_diagram_notes': { label: 'Phase Diagram Notes' }, 'material_standard': {label: 'Material Standard'}, 'appearance': {label: 'Appearance', isHtml: true}, 'xrd_pattern': {label: 'XRD Pattern'}, 'grain_size_um': { label: 'Grain Size', isHtml: true }, 'molecular_weight': {label: 'Molecular Weight', isHtml: true}, 'zirconia_content': {label: 'Zirconia Content', isHtml: true}, 'fiber_volume_fraction': {label: 'Fiber Vol. Fraction', isHtml: true}, 'filament_diameter': {label: 'Filament Diameter', isHtml: true}, 'layer_density': {label: 'Layer Density', isHtml: true} }},
        { id: 'section-fab-insights', title: 'Advanced Fabrication Insights', dataKey: 'advanced_fabrication_insights', properties: {'stoichiometry_control': { label: 'Stoichiometry Control', isKey: true }, 'common_defects_impact': { label: 'Common Defects' }, 'surface_preparation': { label: 'Surface Preparation' }, 'method_specific_notes': { label: 'Method Nuances' }, 'process_control': {label: 'Process Control'}, 'interface_engineering': {label: 'Interface Engineering'}, 'alignment_techniques': {label: 'Alignment Techniques'}, 'cooling_rate_control': {label: 'Cooling Rate Control'}, 'particle_dispersion': {label: 'Particle Dispersion'}, 'transformation_toughening': { label: 'Transformation Toughening' }, 'coating_process': { label: 'Coating Process' }, 'machining': { label: 'Machining Notes' }, 'weave_style': { label: 'Weave Style' }, 'crystallinity_control': { label: 'Crystallinity Control' }, 'wear_mechanism': { label: 'Wear Mechanism' }, 'cold_welding': { label: 'Cold Welding' }, 'outgassing': { label: 'Outgassing' }, 'spacer_material': { label: 'Spacer Material' }, 'hydrophobicity': { label: 'Hydrophobicity (Fab.)' } }},
        { id: 'section-growth', title: 'Growth & Fabrication Properties', dataKey: 'growth_fabrication_properties', properties: {'common_growth_methods': { label: 'Common Methods' }, 'source_materials_purity': { label: 'Source Materials' }, 'preferred_substrates_orientations': { label: 'Substrates/Orientations', isKey: true }, 'typical_growth_parameters': { label: 'Growth Parameters' }, 'passivation_methods': { label: 'Passivation/Surface Treat.' }}}, // Combined surface treatment here
        { id: 'section-processing', title: 'Post-Growth Processing', dataKey: 'post_growth_processing', properties: {'annealing': { label: 'Annealing', isKey: true }, 'lapping_polishing': { label: 'Lapping & Polishing' }, 'etching': { label: 'Etching Methods' }, 'grinding_milling': { label: 'Grinding/Milling Notes' }}},
        { id: 'section-device-char', title: 'Device Integration & Characterization', dataKey: 'device_integration_characterization', properties: {'device_architectures': { label: 'Device Architectures' }, 'readout_integration': { label: 'Readout Integration', isKey: true }, 'ar_coatings': { label: 'AR Coatings' }, 'packaging_cooling': { label: 'Packaging/Cooling', isKey: true }, 'key_characterization_techniques': { label: 'Key Characterization', isHtml: true }}},
        { id: 'section-electrical', title: 'Electrical Properties', dataKey: 'electrical_properties', properties: {'bandgap_type': { label: 'Bandgap Type' }, 'band_gap': { label: 'Bandgap (Eg)', isKey: true, isHtml: true }, 'bandgap_equation.hansen_eg': { label: 'Hansen Eg Eq' }, 'bandgap_equation.varshni_equation': { label: 'Varshni Eg Eq' }, 'bandgap_equation.wavelength_relation': { label: 'Cutoff λ Eq' }, 'common_dopants': { label: 'Common Dopants', isKey: true }, 'carrier_concentration': { label: 'Carrier Conc', isHtml: true }, 'electron_mobility': { label: 'Electron Mobility (μₑ)', isKey: true, isHtml: true }, 'hole_mobility': { label: 'Hole Mobility (μ<0xE2><0x82><0x95>)', isHtml: true }, 'dielectric_constant': { label: 'Dielectric Const (ε)', isHtml: true }, 'resistivity': { label: 'Resistivity (ρ)', isHtml: true }, 'breakdown_field': { label: 'Breakdown Field', isHtml: true }, 'ionic_conductivity': {label: 'Ionic Conductivity', isHtml: true}, 'piezoelectric_coefficients': {label: 'Piezo Coefficients'}, 'pyroelectric_coefficient': {label: 'Pyroelectric Coeff'}, 'curie_temperature': {label: 'Curie Temperature'}, 'conductivity_electrical': {label: 'Electrical Conductivity (%IACS)', isHtml: true}, 'magnetic_permeability': {label: 'Magnetic Permeability', isHtml: true}, 'emi_shielding_effectiveness': {label: 'EMI Shielding', isHtml: true}, 'dielectric_strength': {label: 'Dielectric Strength', isHtml: true}, 'dissipation_factor': {label: 'Dissipation Factor (Df)', isHtml: true}, 'dielectric_breakdown_mv_cm': { label: 'Dielectric Breakdown', isHtml: true }, 'superconductivity': { label: 'Superconductivity', isHtml: true }, 'static_discharge': { label: 'Static Discharge Notes' } }},
        { id: 'section-optical', title: 'Optical Properties', dataKey: 'optical_properties', properties: {'spectral_range': { label: 'Spectral Range', isKey: true, isHtml: true }, 'cutoff_wavelength': { label: 'Cutoff Wavelength (λc)', isKey: true, isHtml: true }, 'refractive_index': { label: 'Refractive Index (n)', isHtml: true }, 'absorption_coefficient': { label: 'Absorption Coeff (α)', isHtml: true }, 'quantum_efficiency': { label: 'Quantum Efficiency (η)', isKey: true, isHtml: true }, 'responsivity': { label: 'Responsivity (R)', isKey: true, isHtml: true }, 'noise_equivalent_power': { label: 'Noise Equiv. Power (NEP)', isHtml: true }, 'nonlinear_refractive_index_n2': { label: 'Nonlinear Index (n₂)', isHtml: true},'scattering_loss': { label: 'Scattering Loss', isHtml: true}, 'dn_dt': {label: 'dn/dT', isHtml: true}, 'electro_optic_coefficients': {label: 'Electro-Optic Coeffs'}, 'nonlinear_coefficients': {label: 'Nonlinear Coeffs'}, 'photorefractive_effect': {label: 'Photorefractive Effect'}, 'haze': {label: 'Haze', isHtml: true}, 'scattering': {label: 'Scattering', isHtml: true}, 'photoluminescence_peak_nm': { label: 'Photoluminescence Peak', isHtml: true }, 'optical_loss': { label: 'Optical Loss Notes' }, 'emission_peak': { label: 'Emission Peak', isHtml: true }, 'decay_time': { label: 'Decay Time', isHtml: true }, 'light_yield': { label: 'Light Yield', isHtml: true }, 'afterglow': { label: 'Afterglow' }, 'reflectivity': { label: 'Reflectivity' }, 'emissivity': { label: 'Emissivity', isHtml: true } }},
        { id: 'section-thermal', title: 'Thermal Properties', dataKey: 'thermal_properties', properties: {'operating_temperature': { label: 'Operating Temperature', isKey: true, isHtml: true }, 'thermal_conductivity': { label: 'Thermal Conductivity (k)', isHtml: true }, 'specific_heat_capacity_j_gk': { label: 'Specific Heat (Cp)', isHtml: true }, 'melting_point_c': { label: 'Melting Point', isHtml: true }, 'boiling_point': { label: 'Boiling Point', isHtml: true }, 'glass_transition_temp_tg': { label: 'Glass Transition (Tg)', isHtml: true}, 'thermal_expansion_ppm_k': { label: 'Thermal Expansion (CTE)', isHtml: true},'decomposition_temperature': { label: 'Decomposition Temp', isHtml: true}, 'crystallization_temp_tx': {label: 'Crystallization Temp (Tx)', isHtml: true}, 'thermal_shock_resistance': { label: 'Thermal Shock Resistance' } }},
        { id: 'section-mechanical', title: 'Mechanical Properties', dataKey: 'mechanical_properties', properties: {'density_g_cm3': { label: 'Density', isHtml: true }, 'youngs_modulus_gpa': { label: 'Young\'s Modulus (E)', isHtml: true }, 'tensile_strength': { label: 'Tensile Strength', isHtml: true }, 'compressive_strength_mpa': { label: 'Compressive Strength', isHtml: true }, 'yield_strength': {label: 'Yield Strength', isHtml: true}, 'elongation_at_break': { label: 'Elongation @ Break (%)', isHtml: true }, 'hardness_vickers_gpa': { label: 'Hardness (Vickers)', isHtml: true }, 'hardness_rockwell': {label: 'Hardness (Rockwell)', isHtml: true}, 'hardness_mohs': {label: 'Hardness (Mohs)', isHtml: true}, 'hardness_shore_d': {label: 'Hardness (Shore D)', isHtml: true}, 'poissons_ratio': { label: 'Poisson\'s Ratio (ν)', isHtml: true }, 'fracture_toughness_mpa_m_sqrt': { label: 'Fracture Toughness (K<small>IC</small>)', isHtml: true }, 'elastic_limit': {label: 'Elastic Limit (%)', isHtml: true}, 'tear_strength': {label: 'Tear Strength', isHtml: true}, 'dimensional_stability': {label: 'Dimensional Stability'}, 'water_absorption': {label: 'Water Absorption (%)', isHtml: true}, 'wear_resistance': { label: 'Wear Resistance' }, 'impact_resistance': { label: 'Impact Resistance' }, 'creep_resistance': { label: 'Creep Resistance' }, 'coefficient_of_friction': { label: 'Coefficient of Friction', isHtml: true }, 'ductility': { label: 'Ductility' }, 'fragility': { label: 'Fragility' } }},
        { id: 'section-applications', title: 'Key Applications & Sensor Types', dataKey: 'device_applications', properties: {'sensor_types': { label: 'Common Sensor Types' }, 'key_applications': { label: 'Key Applications', isKey: true, isHtml: true }, 'industries': { label: 'Industries', isKey: false }}},
        { id: 'section-chemical', title: 'Chemical Properties', dataKey: 'chemical_properties', properties: {'stability_oxidation': { label: 'Stability & Oxidation' }, 'chemical_resistance': { label: 'Chemical Resistance' }, 'solvent_resistance': { label: 'Solvent Resistance'}, 'acid_resistance': { label: 'Acid Resistance'},'base_resistance': { label: 'Base Resistance'},'water_solubility': { label: 'Water Solubility'},'radiation_resistance': { label: 'Radiation Resistance'}, 'radiation_hardness': { label: 'Radiation Hardness' }, 'uv_resistance': { label: 'UV Resistance'}, 'stress_corrosion_cracking': {label: 'Stress Corrosion Cracking'}, 'inertness': {label: 'Inertness'}, 'molten_metal_resistance': {label: 'Molten Metal Resistance'}, 'flammability': {label: 'Flammability'}, 'hydrophobicity': {label: 'Hydrophobicity', isHtml: true}, 'biocompatibility': { label: 'Biocompatibility' }, 'wetting': { label: 'Wetting Behavior' }, 'hygroscopic': { label: 'Hygroscopic Nature' } }},
        { id: 'section-magnetic', title: 'Magnetic Properties', dataKey: 'magnetic_properties', properties: {'type': { label: 'Magnetic Type', isKey: true }, 'critical_temperature_tc': { label: 'Critical Temp (Tc)', isHtml: true }, 'upper_critical_field_bc2': { label: 'Upper Critical Field (Bc2)', isHtml: true }, 'critical_current_density_jc': { label: 'Critical Current (Jc)', isHtml: true }, 'permeability_initial': {label: 'Initial Permeability', isHtml: true}, 'saturation_magnetization_bs': {label: 'Saturation (Bs)', isHtml: true}, 'coercivity_hc': {label: 'Coercivity (Hc)', isHtml: true}, 'core_losses': {label: 'Core Losses', isHtml: true}, 'frequency_range': {label: 'Frequency Range', isHtml: true} }},
        { id: 'section-neutron-shielding', title: 'Neutron Shielding Properties', dataKey: 'neutron_shielding', properties: {'effectiveness': {label: 'Effectiveness'}, 'moderation': { label: 'Moderation' }, 'absorption': { label: 'Absorption' } }}, // Added moderation/absorption
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
                    // Strip prefixes like prop:, proc:, class:, env:, app: for display
                    tagElement.textContent = tag.replace(/^(prop|proc|class|env|app|industry):/i, "");
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

        // Determine if data exists for this section
        if (isSpecial) {
            if (id === 'section-overview') sectionDataExists = material['description'] || material['wiki_link'];
            else if (dataKey && material[dataKey]) sectionDataExists = true;
        } else if (dataKey && material[dataKey] && typeof material[dataKey] === 'object') {
             // Check if the object for the section actually contains any of the specified properties
             if (properties && Object.keys(properties).some(propKey => {
                 const dataPath = `${dataKey}.${propKey}`;
                 // Check if data exists at the path using a simplified check
                 return dataPath.split('.').reduce((o, key) => (o && typeof o === 'object' && o[key] !== undefined && o[key] !== null) ? o[key] : undefined, material) !== undefined;
             })) {
                sectionDataExists = true;
             }
             // Special case for Identification: Also check for top-level category
             if (id === 'section-identification' && material['category']) {
                 sectionDataExists = true;
             }
        } else if (dataKey && material[dataKey] !== undefined && material[dataKey] !== null) {
             // Handle cases where dataKey points directly to a primitive value (less common for sections)
             sectionDataExists = true;
        }

        // Skip creating the section if no relevant data exists
        if (!sectionDataExists) {
            // console.log(`[Detail Page] Skipping section "${title}" - no relevant data found.`);
            return;
        }


        let section = createSection(id, title, icon);
        let sectionHasRenderableContent = false;

        if (isSpecial) {
            // --- Custom Logic for Special Sections ---
             if (id === 'section-overview') {
                const descVal = getData(material, 'description', fallbackValue);
                if (descVal !== fallbackValue) { const p = document.createElement('p'); p.className='description'; p.innerHTML=descVal; section.appendChild(p); sectionHasRenderableContent = true; } // Use innerHTML for potential formatting
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
                 } else if (notesValue === fallbackValue && !dl.hasChildNodes()) { // Show N/A only if NO notes AND NO comparisons
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
                              // Smart link detection
                              if (typeof refValue === 'string' && (refValue.startsWith('http') || refValue.startsWith('www'))) {
                                  const url = refValue.startsWith('http') ? refValue : 'http://' + refValue;
                                  const label = key === 'wikipedia' ? `Wikipedia: ${url}` : url; // Special label for wikipedia
                                  itemHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
                              } else if (key === 'wikipedia') { // Handle non-URL wikipedia entry
                                   itemHtml = `Wikipedia: ${refValue}`;
                              }
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
                                // Auto-link URLs within vendor strings
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

            // Add top-level 'category' if it exists and section is 'Identification'
            if (id === 'section-identification') {
                let catVal = getData(material, 'category', fallbackValue);
                if (catVal !== fallbackValue) { dl.appendChild(createPropertyItem('Material Category', catVal)); sectionHasRenderableContent = true; propertiesAddedToDl = true;}
                // Also add 'identification.class' if it exists
                let classVal = getData(material, 'identification.class', fallbackValue);
                if (classVal !== fallbackValue) { dl.appendChild(createPropertyItem('Material Class', classVal)); sectionHasRenderableContent = true; propertiesAddedToDl = true;}
            }

            // Iterate through configured properties for the section
            Object.entries(properties).forEach(([propKey, propConfig]) => {
                 const dataPath = `${dataKey}.${propKey}`;
                 const value = getData(material, dataPath, fallbackValue);
                 // Only add the property if a non-fallback value was found
                 if (value !== fallbackValue) {
                     // Use label from config, allow HTML if specified (like for K_IC)
                     const label = propConfig.label;
                     dl.appendChild(createPropertyItem(label, value, propConfig.isKey || false));
                     sectionHasRenderableContent = true; propertiesAddedToDl = true;
                 }
            });
            // --- Append Standard Section ---
            if (propertiesAddedToDl) { // Only append section if it has actual content
                section.appendChild(dl); fragment.appendChild(section);
            } else if (sectionHasRenderableContent) {
                // If category/class was added but no other properties, still append
                section.appendChild(dl); fragment.appendChild(section);
            }
        }
    });

    container.appendChild(fragment);
    console.log("[Detail Page] Dynamic page section population complete.");

    // --- Enhance Periodic Table ---
    enhancePeriodicTable(material); // Pass full material object

} // End of populatePage function
