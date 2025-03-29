/**
 * Loads DETAILED material data for the detail page.
 * Fetches data/material_details.json, finds the material, populates page dynamically based on available data,
 * and enhances the periodic table with relevant information and highlighting.
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
        // Error logged within displayError now
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
            if (foundKey) {
                 console.warn(`[Detail Page] Case-insensitive match found for "${materialName}" as "${foundKey}". Using data for "${foundKey}".`);
                 material = allDetailData[foundKey];
            } else {
                throw new Error(`Data for "${materialName}" not found in ${detailDataPath}. Check material name and file content.`);
            }
        }

        console.log("[Detail Page] Specific material object found:", materialName);
        mainContainer.innerHTML = ''; // Clear potential loading messages
        populatePage(material, mainContainer); // Populate sections and trigger table enhancement

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
    // This is more forgiving than just A-Z[a-z]? and handles symbols like 'Uue' if needed, though less strict.
    // We rely on the periodicTableData check below to validate.
    const elementRegex = /[A-Z][a-z]*/g;
    const potentialSymbols = formula.match(elementRegex);

    if (potentialSymbols) {
        potentialSymbols.forEach(symbol => {
            // Validate against known elements in periodicTableData
            if (window.periodicTableData && window.periodicTableData[symbol]) {
                elements.add(symbol);
            } else {
                // Log symbols found by regex but not in our data - helps debug formulas/regex
                // Avoid logging common formula parts like 'x' or single letters from descriptions
                if (symbol.length <= 2 || symbol.toLowerCase() !== symbol) { // Basic filter
                     // console.log(`[Formula Parse] Ignoring potential non-element match: ${symbol}`);
                }
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
 * Enhances the static periodic table in material_detail.html:
 * - Clears previous highlights and data.
 * - Adds detailed element information (name, number, category, mass) to the title attribute for hover tooltips.
 * - Adds formatted atomic mass to the designated span within each element box.
 * - Highlights elements present in the provided material formula using the 'highlighted-element' class.
 * @param {string | null} materialFormula The formula string of the current material, or null to clear the table state.
 */
function enhancePeriodicTable(materialFormula) {
    console.log("[Detail Page] Enhancing periodic table...");
    const elementsToHighlight = parseFormulaForElements(materialFormula);
    console.log("[Detail Page] Elements parsed from formula:", materialFormula, "->", elementsToHighlight);
    const allPtElements = document.querySelectorAll('.periodic-table-container .pt-element');

    if (!window.periodicTableData) {
        console.warn("[Detail Page] Periodic table data (window.periodicTableData) is not available. Cannot enhance table.");
        // Clear any existing highlights just in case
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
             massSpan.textContent = ''; // Clear previous mass text
             massSpan.style.display = isPlaceholder ? 'none' : ''; // Ensure mass span is hidden for placeholders/labels
        }

        // Skip further processing for placeholders/labels
        if (isPlaceholder) {
            const placeholderText = element.textContent.match(/\d+-\d+/); // Get range like 57-71
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
            const massDisplay = mass ? mass.toFixed(3) : 'N/A'; // Format mass or show N/A

            // Add hover title with comprehensive info
            element.title = `${name} (${number})\nCategory: ${category}\nMass: ${massDisplay}`;
            if(elementData.electron_configuration_semantic) {
                 element.title += `\nConfig: ${elementData.electron_configuration_semantic}`;
            }
             if(elementData.e_neg_pauling) {
                 element.title += `\nE. Neg.: ${elementData.e_neg_pauling}`;
            }
            // Add more properties to title if needed...

            // Add atomic mass to the designated span
            if (massSpan && mass) {
                massSpan.textContent = massDisplay;
            } else if (massSpan) {
                massSpan.textContent = 'N/A'; // Explicitly show N/A if mass is missing in data
            }

            // --- 3. Highlight if needed ---
            if (elementsToHighlight.has(symbol)) {
                element.classList.add('highlighted-element');
                console.log(`[Detail Page] Highlighting: ${symbol}`);
            }
        } else if (symbol) {
             // Basic title even if data is missing in periodicTableData.js
            element.title = symbol;
             console.warn(`[Detail Page] Data missing in periodicTableData for symbol: ${symbol}`);
        } else {
            // Should not happen if HTML is correct, but good to log
             console.warn("[Detail Page] Found .pt-element without data-symbol attribute.");
        }
    });
     console.log("[Detail Page] Periodic table enhancement complete.");
}


/**
 * Dynamically populates the main content container with sections and properties
 * based *only* on the keys present in the provided material data object.
 * @param {object} material - The detailed material data object.
 * @param {HTMLElement} container - The main HTML element to append sections to.
 */
function populatePage(material, container) {
    const fallbackValue = '<span class="na-value">N/A</span>'; // Use HTML for N/A display

    // --- Helper Function: getData --- (Handles nested access and formatting)
    const getData = (obj, path, fallback = fallbackValue) => {
        // Handles dot notation paths, e.g., 'electrical_properties.band_gap'
        const value = path.split('.').reduce((o, key) => (o && typeof o === 'object' && o[key] !== undefined && o[key] !== null) ? o[key] : undefined, obj);

        // Undefined or explicitly null -> return fallback
        if (value === undefined || value === null) return fallback;

        // 1. Handle specific object structure: { value: ..., unit: ..., notes: ... }
        if (typeof value === 'object' && !Array.isArray(value) && value.value !== undefined) {
           const stringVal = String(value.value).trim();
           // If value itself represents N/A, treat whole object as fallback
           if (stringVal === '' || stringVal.toUpperCase() === 'N/A') return fallback;

           let text = stringVal; // Start with the core value
           if (value.unit) text += ` <span class="unit">${value.unit}</span>`; // Append unit if present
           if (value.notes) text += ` <span class="notes">(${value.notes})</span>`; // Append notes if present
           return text; // Return combined HTML string
        }

        // 2. Handle arrays: join with comma, or create bulleted list for specific paths
        if (Array.isArray(value)) {
            // Specific data paths that should be rendered as <ul> lists
            const listPathsForBullets = [
                'device_applications.key_applications',
                'device_integration_characterization.key_characterization_techniques'
                // Add other paths here if they should be bulleted lists
            ];
            // Filter out null/undefined/empty items before joining/listing
            const filteredValues = value.filter(item => item !== null && item !== undefined && String(item).trim() !== '');
            if (filteredValues.length === 0) return fallback; // If array becomes empty after filtering

            // Check if the current path needs a bulleted list
            if (listPathsForBullets.includes(path)) {
                return `<ul class="property-list-items">${filteredValues.map(item => `<li>${getData(material, item)}</li>`).join('')}</ul>`; // Recursively call getData for list items if they might be complex objects/paths themselves (unlikely here, but safer)
                // Simplified if list items are always simple strings:
                // return `<ul class="property-list-items">${filteredValues.map(item => `<li>${item}</li>`).join('')}</ul>`;
            } else {
                // Otherwise, join array elements with a comma and space
                return filteredValues.map(item => getData(material, item)).join(', '); // Recursively call getData for items
                // Simplified if list items are always simple strings:
                // return filteredValues.join(', ');
            }
        }

        // 3. Handle simple objects with ONLY a 'notes' key: { notes: "..." }
        if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1 && value.notes !== undefined) {
            const noteString = String(value.notes).trim();
            // Return notes directly if they exist and aren't 'N/A', otherwise fallback
            return (noteString !== '' && noteString.toUpperCase() !== 'N/A')
                   ? `<span class="notes-only">${noteString}</span>` // Wrap notes in a span for styling
                   : fallback;
        }

        // 4. Handle other unexpected object types -> return fallback and log warning
         if (typeof value === 'object' && !Array.isArray(value)) {
            console.warn(`[getData] Encountered unexpected object structure for path "${path}". Returning fallback. Object:`, value);
            return fallback;
        }

        // 5. Handle simple values (string, number, boolean)
        const stringValue = String(value).trim();
        // Treat empty strings or explicit "N/A" strings as fallback
        return (stringValue === '' || stringValue.toUpperCase() === 'N/A') ? fallback : stringValue;
    };


    // --- Helper Function: createPropertyItem --- (Creates dt/dd structure for property lists)
    const createPropertyItem = (keyText, valueHtml, isKey = false) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'property-item';
        if (isKey) {
            itemDiv.classList.add('key-property'); // Add class for highlighting key properties
        }

        const dt = document.createElement('dt');
        dt.className = 'property-key';
        dt.textContent = keyText + ':'; // Add colon to key text

        const dd = document.createElement('dd');
        dd.className = 'property-value';
        dd.innerHTML = valueHtml; // Use innerHTML as value might contain spans (unit, notes, N/A)
        // Add 'na-value' class if the content is exactly the fallback HTML
        if (valueHtml === fallbackValue) {
            dd.classList.add('na-value');
        }

        itemDiv.appendChild(dt);
        itemDiv.appendChild(dd);
        return itemDiv;
    };

    // --- Helper Function: createSection --- (Creates section element with title)
    const createSection = (id, title, icon = null) => {
        const section = document.createElement('section');
        section.className = 'material-section'; // Base class for styling
        section.id = id; // Assign ID for potential linking or specific styling

        const h2 = document.createElement('h2');
        if (icon) {
            // Add icon span if provided
            const iconSpan = document.createElement('span');
            iconSpan.setAttribute('aria-hidden', 'true'); // Good practice for accessibility
            iconSpan.textContent = icon;
            h2.appendChild(iconSpan);
            h2.appendChild(document.createTextNode(' ')); // Add space after icon
        }
        h2.appendChild(document.createTextNode(title)); // Add title text
        section.appendChild(h2);

        // Add specific class for safety section styling
        if (id === 'section-safety') {
            section.classList.add('safety-info');
        }
        return section;
    };

    // --- Configuration for Sections and Properties ---
    // Defines the structure, titles, and data mapping for each section.
    const sectionConfig = [
        // isSpecial indicates custom rendering logic needed (not just a simple property list)
        { id: 'section-overview', title: 'Overview', isSpecial: true },
        // Standard sections map dataKey (top-level key in JSON) to properties (nested keys)
        { id: 'section-safety', title: 'Safety Information', icon: '⚠️', dataKey: 'safety', properties: {
            'toxicity': { label: 'Toxicity', isKey: true },
            'handling': { label: 'Handling' }
        }},
        { id: 'section-identification', title: 'Identification & Structure', dataKey: 'identification', properties: {
            // 'class' is handled specially below (added alongside category)
            'cas_number': { label: 'CAS Number' },
            'crystal_structure': { label: 'Crystal Structure', isKey: true },
            'lattice_constant': { label: 'Lattice Constant', isKey: true, isHtml: true }, // isHtml flag (currently unused by getData) might denote value contains HTML
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
            'key_characterization_techniques': { label: 'Key Characterization', isHtml: true } // Needs array handling in getData
        }},
        { id: 'section-electrical', title: 'Electrical Properties', dataKey: 'electrical_properties', properties: {
            'bandgap_type': { label: 'Bandgap Type' },
            'band_gap': { label: 'Bandgap (Eg)', isKey: true, isHtml: true },
            'bandgap_equation.hansen_eg': { label: 'Hansen Eg Eq' }, // Nested path example
            'bandgap_equation.varshni_equation': { label: 'Varshni Eg Eq' },
            'bandgap_equation.wavelength_relation': { label: 'Cutoff λ Eq' },
            'common_dopants': { label: 'Common Dopants', isKey: true },
            'carrier_concentration': { label: 'Carrier Conc', isHtml: true },
            'electron_mobility': { label: 'Electron Mobility (μₑ)', isKey: true, isHtml: true },
            'hole_mobility': { label: 'Hole Mobility (μ<0xE2><0x82><0x95>)', isHtml: true }, // Note: Unicode subscript used here
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
            'noise_equivalent_power': { label: 'Noise Equiv. Power (NEP)', isHtml: true },
             // Add other optical properties here if available in JSON
             'nonlinear_refractive_index_n2': { label: 'Nonlinear Index (n₂)'},
             'scattering_loss': { label: 'Scattering Loss'}
        }},
        { id: 'section-thermal', title: 'Thermal Properties', dataKey: 'thermal_properties', properties: {
            'operating_temperature': { label: 'Operating Temperature', isKey: true, isHtml: true },
            'thermal_conductivity': { label: 'Thermal Conductivity (k)', isHtml: true },
            'specific_heat': { label: 'Specific Heat (Cp)', isHtml: true },
            'melting_point': { label: 'Melting Point', isHtml: true },
            'glass_transition_temp_tg': { label: 'Glass Transition (Tg)'}, // Example for glass
            'thermal_expansion': { label: 'Thermal Expansion (CTE)'},
             'decomposition_temperature': { label: 'Decomposition Temp'} // Example for polymers
        }},
        { id: 'section-mechanical', title: 'Mechanical Properties', dataKey: 'mechanical_properties', properties: {
            'density': { label: 'Density', isHtml: true },
            'youngs_modulus': { label: 'Young\'s Modulus (E)', isHtml: true },
            'tensile_strength': { label: 'Tensile Strength' }, // Example for films/fibers
            'elongation_at_break': { label: 'Elongation @ Break (%)' }, // Example for films/fibers
            'hardness_vickers': { label: 'Hardness (Vickers)', isHtml: true },
            'poissons_ratio': { label: 'Poisson\'s Ratio (ν)' },
            'fracture_toughness': { label: 'Fracture Toughness (K<small>IC</small>)', isHtml: true } // Small tag example
        }},
        { id: 'section-applications', title: 'Key Applications & Sensor Types', dataKey: 'device_applications', properties: {
            'sensor_types': { label: 'Common Sensor Types' },
            'key_applications': { label: 'Key Applications', isKey: true, isHtml: true } // Needs array handling
        }},
        { id: 'section-chemical', title: 'Chemical Properties', dataKey: 'chemical_properties', properties: {
            'stability_oxidation': { label: 'Stability & Oxidation' },
             'solvent_resistance': { label: 'Solvent Resistance'}, // Example for polymers
             'acid_resistance': { label: 'Acid Resistance'},
             'base_resistance': { label: 'Base Resistance'},
             'water_solubility': { label: 'Water Solubility'},
             'radiation_resistance': { label: 'Radiation Resistance'},
             'uv_resistance': { label: 'UV Resistance'}
        }},
        { id: 'section-magnetic', title: 'Magnetic Properties', dataKey: 'magnetic_properties', properties: {
            'type': { label: 'Magnetic Type', isKey: true },
            'critical_temperature_tc': { label: 'Critical Temp (Tc)', isHtml: true }, // For superconductors
            'upper_critical_field_bc2': { label: 'Upper Critical Field (Bc2)', isHtml: true }, // For superconductors
            'critical_current_density_jc': { label: 'Critical Current (Jc)', isHtml: true } // For superconductors
        }},
        // Special sections require custom rendering logic below
        { id: 'section-comparison', title: 'Comparison with Alternatives', dataKey: 'comparison_alternatives', isSpecial: true },
        { id: 'section-references', title: 'References & Further Reading', dataKey: 'references_further_reading', isSpecial: true },
        { id: 'section-vendors', title: 'Commercial Vendors (Example)', dataKey: 'vendor_info', isSpecial: true }
    ];

    // --- Populate Header, Title, and Tags ---
    // Get name and formula safely using getData
    const materialNameDisplay = getData(material, 'name', 'Unknown Material');
    const materialFormulaDisplay = getData(material, 'formula', ''); // Use empty string if no formula

    document.title = `${materialNameDisplay} Detail - MaterialsDB`; // Set dynamic page title
    document.getElementById('material-name').textContent = materialNameDisplay;
    const formulaElement = document.getElementById('material-formula');
    if (formulaElement) {
        formulaElement.innerHTML = materialFormulaDisplay; // Use innerHTML in case formula has sub/sup tags (though not currently supported by getData)
    }

    // Populate tags section
    const tagsContainer = document.getElementById('material-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = ''; // Clear any previous content
        const tags = material.tags || [];
        let tagsAdded = false;
        if (Array.isArray(tags) && tags.length > 0) {
            tags.forEach(tag => {
                if (typeof tag === 'string' && tag.trim() !== '') {
                    const tagElement = document.createElement('span');
                    tagElement.className = 'tag';
                    // Basic removal of prefixes like 'industry:' for display
                    tagElement.textContent = tag.replace(/^\w+:/, "");
                    tagsContainer.appendChild(tagElement);
                    tagsAdded = true;
                }
            });
        }
        // Display fallback message if no valid tags were found/added
        if (!tagsAdded) {
            tagsContainer.innerHTML = fallbackValue; // Shows 'N/A' span
        }
    } else {
        console.warn("[Detail Page] Tags container '#material-tags' not found.");
    }

    // --- Dynamically Create and Populate Main Content Sections ---
    console.log("[Detail Page] Dynamically building content sections based on available data...");
    const fragment = document.createDocumentFragment(); // Use fragment for performance

    sectionConfig.forEach(config => {
        const { id, title, icon, dataKey, properties, isSpecial } = config;

        // Determine if the section has *any* relevant data in the JSON object
        let sectionDataExists = false;
        if (isSpecial) {
            // Special sections might depend on specific keys or the top-level dataKey existing
            if (id === 'section-overview') {
                // Overview exists if description or wiki_link is present
                sectionDataExists = material['description'] || material['wiki_link'];
            } else if (dataKey && material[dataKey]) {
                 // Other special sections just need their main data key
                sectionDataExists = true;
            }
        } else if (dataKey && material[dataKey]) {
             // Standard sections need their main data key object to exist
            sectionDataExists = typeof material[dataKey] === 'object' && material[dataKey] !== null;
        }

        // If no data exists for this section's primary key(s), skip creating it entirely
        if (!sectionDataExists) {
            // console.log(`[Detail Page] Skipping section "${title}" - no data found for key "${dataKey || id}".`);
            return;
        }

        // Create the basic section element
        let section = createSection(id, title, icon);
        let sectionHasRenderableContent = false; // Flag to track if anything was actually added

        // --- Handle Special Sections with Custom Logic ---
        if (isSpecial) {
            if (id === 'section-overview') {
                // Add description paragraph if present
                const descVal = getData(material, 'description', fallbackValue);
                if (descVal !== fallbackValue) {
                    const p = document.createElement('p');
                    p.className = 'description'; // Apply specific class for styling
                    p.textContent = descVal; // Use textContent as description should be plain text
                    section.appendChild(p);
                    sectionHasRenderableContent = true;
                }

                // Add Wikipedia link paragraph if present
                const wikiUrl = getData(material, 'wiki_link', '#'); // Default to '#' if missing
                if (wikiUrl !== '#' && wikiUrl !== fallbackValue) {
                    const p = document.createElement('p');
                    const a = document.createElement('a');
                    a.id = 'wiki-link';
                    a.href = wikiUrl;
                    a.target = '_blank'; // Open in new tab
                    a.rel = 'noopener noreferrer'; // Security best practice
                    a.textContent = 'Wikipedia Article';
                    p.appendChild(document.createTextNode('See also: ')); // Add leading text
                    p.appendChild(a);
                    section.appendChild(p);
                    sectionHasRenderableContent = true;
                }

                // Add a placeholder for an image/diagram (always shown for layout consistency)
                const imgPlaceholder = document.createElement('div');
                imgPlaceholder.className = 'image-placeholder';
                imgPlaceholder.textContent = 'Image Placeholder / Diagram';
                section.appendChild(imgPlaceholder);
                sectionHasRenderableContent = true; // Always consider overview section as having content due to placeholder

            } else if (id === 'section-comparison' && material.comparison_alternatives) {
                // Create list for comparison points
                const dl = document.createElement('dl');
                dl.className = 'property-list'; // Reuse property list styling
                dl.id = 'comparison-list';
                let comparisonsAdded = false;

                // Add general comparison notes first, if available
                const notesValue = getData(material, 'comparison_alternatives.notes', fallbackValue);
                if (notesValue !== fallbackValue) {
                    // Use createPropertyItem but maybe with a different label or style?
                    // For now, just add it as a special item or a paragraph before the list
                     const notesP = document.createElement('p');
                     notesP.innerHTML = `<em>${notesValue}</em>`; // Italicize notes
                     section.insertBefore(notesP, section.firstChild.nextSibling); // Insert after h2
                     // dl.appendChild(createPropertyItem('Comparison Notes', notesValue));
                    sectionHasRenderableContent = true; // Mark content added
                    comparisonsAdded = true; // Consider notes as content
                }

                // Iterate through keys starting with 'vs_'
                Object.entries(material.comparison_alternatives).forEach(([key, value]) => {
                    if (key.startsWith('vs_')) {
                        const comparisonValueStr = getData(material, `comparison_alternatives.${key}`, fallbackValue);
                        if (comparisonValueStr !== fallbackValue) {
                            // Format label nicely (e.g., 'vs. InSb')
                            const comparisonLabel = key.replace(/^vs_/, 'vs. ');
                            dl.appendChild(createPropertyItem(comparisonLabel, comparisonValueStr));
                            sectionHasRenderableContent = true;
                            comparisonsAdded = true;
                        }
                    }
                });

                 // Only append the <dl> if comparisons were actually added (beyond just notes)
                if (comparisonsAdded) {
                     if (dl.hasChildNodes()) { // Check if list has items before appending
                        section.appendChild(dl);
                    } else if (notesValue === fallbackValue) { // If ONLY notes were missing and no comparisons, show N/A
                         dl.innerHTML = `<div class="property-item comparison-na-message"><dd class="property-value">${fallbackValue}</dd></div>`;
                         section.appendChild(dl);
                         sectionHasRenderableContent = true;
                    }
                }

            } else if (id === 'section-references' && material.references_further_reading) {
                // Create unordered list for references
                const ul = document.createElement('ul');
                ul.id = 'reference-list';
                let listHasContent = false;

                // Add general notes first if available
                const notesValue = getData(material, 'references_further_reading.notes', fallbackValue);
                 if (notesValue !== fallbackValue) {
                     const notesLi = document.createElement('li');
                     notesLi.className = 'ref-notes'; // Special class for styling notes
                     notesLi.innerHTML = `<em>${notesValue}</em>`;
                     ul.appendChild(notesLi);
                     listHasContent = true;
                 }

                 // Add individual references
                 Object.entries(material.references_further_reading).forEach(([key, value]) => {
                     // Skip the 'notes' key we already handled
                     if (key !== 'notes') {
                         const refValue = getData(material, `references_further_reading.${key}`, fallbackValue);
                         if (refValue !== fallbackValue) {
                             const li = document.createElement('li');
                             let itemHtml = refValue;
                             // Make links clickable (simple check for http/www)
                              if (key === 'wikipedia' && typeof refValue === 'string' && refValue.startsWith('http')) {
                                  itemHtml = `Wikipedia: <a href="${refValue}" target="_blank" rel="noopener noreferrer">${refValue}</a>`;
                              } else if (typeof refValue === 'string' && (refValue.startsWith('http') || refValue.startsWith('www'))) {
                                  const url = refValue.startsWith('http') ? refValue : 'http://' + refValue;
                                  itemHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${refValue}</a>`;
                              } // Add more specific link formatting if needed (e.g., for DOIs)
                             li.innerHTML = itemHtml;
                             ul.appendChild(li);
                             listHasContent = true;
                         }
                     }
                 });

                 // If list is still empty after processing, add fallback message
                if (!listHasContent) {
                    ul.innerHTML = `<li>Reference information ${fallbackValue}</li>`;
                }
                section.appendChild(ul);
                sectionHasRenderableContent = true; // Assume section has content if dataKey exists

            } else if (id === 'section-vendors' && material.vendor_info) {
                // Add introductory text
                const introP = document.createElement('p');
                introP.textContent = 'This space can list companies supplying materials or related services. (Example data)';
                section.appendChild(introP);

                const ul = document.createElement('ul');
                ul.id = 'vendor-list';
                let listHasContent = false;

                 // Add general notes first if available
                 const notesValue = getData(material, 'vendor_info.notes', fallbackValue);
                 if (notesValue !== fallbackValue) {
                     const notesLi = document.createElement('li');
                     notesLi.className = 'vendor-notes'; // Special class for styling notes
                     notesLi.innerHTML = `<em>${notesValue}</em>`;
                     ul.appendChild(notesLi);
                     listHasContent = true;
                 }

                 // Add individual vendors
                 Object.entries(material.vendor_info).forEach(([key, value]) => {
                     if (key !== 'notes') {
                         const vendorValue = getData(material, `vendor_info.${key}`, fallbackValue);
                         if (vendorValue !== fallbackValue) {
                              const li = document.createElement('li');
                             let itemHtml = vendorValue;
                             // Attempt to auto-link URLs within the vendor string
                             try {
                                 const urlMatch = String(vendorValue).match(/(https?:\/\/[^\s"'>]+)|(www\.[^\s"'>]+)/);
                                 if (urlMatch) {
                                     const url = urlMatch[0].startsWith('http') ? urlMatch[0] : 'http://' + urlMatch[0];
                                     itemHtml = String(vendorValue).replace(urlMatch[0], `<a href="${url}" target="_blank" rel="noopener noreferrer">${urlMatch[0]}</a>`);
                                 }
                             } catch (linkError) { /* ignore errors during regex matching */ }
                             li.innerHTML = itemHtml;
                             ul.appendChild(li);
                             listHasContent = true;
                         }
                     }
                 });

                // Add fallback if list is empty
                if (!listHasContent) {
                    ul.innerHTML = `<li>Vendor information ${fallbackValue}</li>`;
                }
                section.appendChild(ul);

                // Add disclaimer text
                const disclaimerP = document.createElement('p');
                const small = document.createElement('small');
                small.textContent = 'Note: Listing does not imply endorsement. Contact vendors directly for current offerings.';
                disclaimerP.appendChild(small);
                section.appendChild(disclaimerP);
                sectionHasRenderableContent = true; // Assume section has content if dataKey exists
            }

            // Append the populated special section if it has content
            if (sectionHasRenderableContent) {
                fragment.appendChild(section);
            } else {
                 console.log(`[Detail Page] Skipping special section "${title}" - no renderable content found.`);
            }

        // --- Handle Standard Sections (Property Lists) ---
        } else if (dataKey && properties && material[dataKey]) {
            const dl = document.createElement('dl');
            dl.className = 'property-list';
            let propertiesAddedToDl = false; // Track if we add anything to *this* dl

            // Special handling for Material Category/Class within Identification section
            if (id === 'section-identification') {
                // Get category from top level of material object
                let catVal = getData(material, 'category', fallbackValue);
                if (catVal !== fallbackValue) {
                    dl.appendChild(createPropertyItem('Material Category', catVal));
                    sectionHasRenderableContent = true;
                    propertiesAddedToDl = true;
                }
                // Get class from within the 'identification' object
                let classVal = getData(material, 'identification.class', fallbackValue);
                if (classVal !== fallbackValue) {
                    dl.appendChild(createPropertyItem('Material Class', classVal));
                    sectionHasRenderableContent = true;
                    propertiesAddedToDl = true;
                }
            }

            // Iterate through the properties defined in the config for this section
            Object.entries(properties).forEach(([propKey, propConfig]) => {
                const dataPath = `${dataKey}.${propKey}`; // Construct the full path (e.g., 'electrical_properties.band_gap')
                const value = getData(material, dataPath, fallbackValue); // Get the data using the helper

                // Only add the property if it has a value other than the fallback
                if (value !== fallbackValue) {
                    dl.appendChild(createPropertyItem(propConfig.label, value, propConfig.isKey || false));
                    sectionHasRenderableContent = true; // Mark that this section has content
                    propertiesAddedToDl = true; // Mark that we added something to this list
                }
            });

            // Only append the section if we actually added properties to its list
            if (propertiesAddedToDl) {
                section.appendChild(dl);
                fragment.appendChild(section);
            } else {
                 // console.log(`[Detail Page] Skipping standard section "${title}" - no properties found for "${dataKey}".`);
            }
        }
    }); // End of sectionConfig loop

    // Append the completed fragment containing all populated sections to the main container
    container.appendChild(fragment);
    console.log("[Detail Page] Dynamic page section population complete.");

    // --- Enhance Periodic Table AFTER sections are added to DOM ---
    // Pass the actual formula string for parsing and highlighting
    enhancePeriodicTable(material ? material.formula : null);

} // End of populatePage function
