/**
 * Loads DETAILED material data for the detail page.
 * Fetches data/material_details.json, finds the material, populates page dynamically based on available data.
 */
document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");
    let materialName = null;
    const mainContainer = document.getElementById('material-content-container');
    const headerNameElement = document.getElementById("material-name");

    const displayError = (message) => {
        console.error("[Detail Page] Error:", message);
        if (headerNameElement) headerNameElement.textContent = "Error";
        if (mainContainer) {
             mainContainer.innerHTML = `<p class="error-message" style="color: red; padding: 1rem;">Error loading material details: ${message}. Please check the console for more information.</p>`;
        }
        document.title = "Error - MaterialsDB";
     };

    try { materialName = materialNameParam ? decodeURIComponent(materialNameParam) : null; }
    catch (uriError) { displayError(`Invalid material name in URL (${materialNameParam}). ${uriError.message}`); return; }

    console.log("[Detail Page] Attempting to load DETAILED view for:", materialName);

    if (!materialName) { displayError("No material specified in the URL."); return; }
    if (!mainContainer) { console.error("Essential element '#material-content-container' not found."); if(headerNameElement) headerNameElement.textContent = "Page Structure Error"; document.title = "Page Error - MaterialsDB"; return; }

    try {
        const detailDataPath = "data/material_details.json";
        const detailRes = await fetch(detailDataPath);
        if (!detailRes.ok) {
            if (detailRes.status === 404) { throw new Error(`Data file not found: ${detailDataPath}.`); }
            else { throw new Error(`HTTP error ${detailRes.status} fetching ${detailDataPath}`); }
        }
        let allDetailData;
        try { allDetailData = await detailRes.json(); }
        catch (jsonError) { throw new Error(`Invalid JSON in ${detailDataPath}: ${jsonError.message}`); }

        console.log("[Detail Page] Detailed data loaded and parsed.");

        if (typeof allDetailData !== 'object' || allDetailData === null) { throw new Error(`Data format error: ${detailDataPath} expected top-level object.`); }
        const material = allDetailData[materialName];
        if (!material) { throw new Error(`Data for "${materialName}" not found in ${detailDataPath}.`); }

        console.log("[Detail Page] Specific material object found:", materialName);
        mainContainer.innerHTML = '';
        populatePage(material, mainContainer);

    } catch (e) { displayError(e.message); }
});


/**
 * Dynamically populates the main content container with sections and properties
 * based *only* on the keys present in the provided material data object.
 * @param {object} material - The detailed material data object.
 * @param {HTMLElement} container - The main HTML element to append sections to.
 */
function populatePage(material, container) {
    const fallbackValue = '<span class="na-value">N/A</span>'; // Use HTML for N/A display

    // --- Helper Function: getData --- (Handles nested access and formatting - UPDATED)
    const getData = (obj, path, fallback = fallbackValue) => { // fallbackValue is '<span class="na-value">N/A</span>'
        const value = path.split('.').reduce((o, key) => (o && typeof o === 'object' && o[key] !== undefined && o[key] !== null) ? o[key] : undefined, obj);

        if (value === undefined) return fallback;

        // 1. Handle objects with value/unit/notes structure
        if (typeof value === 'object' && !Array.isArray(value) && value.value !== undefined) {
           // If value itself is N/A or empty, treat whole thing as fallback
           const stringVal = String(value.value).trim();
           if (stringVal === '' || stringVal.toUpperCase() === 'N/A') return fallback;

           let text = stringVal;
           if (value.unit) text += ` <span class="unit">${value.unit}</span>`;
           if (value.notes) text += ` <span class="notes">(${value.notes})</span>`;
           return text; // Return as HTML string
        }

        // 2. Handle arrays (Unchanged)
        if (Array.isArray(value)) {
            const listPathsForBullets = ['device_applications.key_applications', 'device_integration_characterization.key_characterization_techniques'];
            const filteredValues = value.filter(item => item !== null && item !== undefined && String(item).trim() !== '');
            if (filteredValues.length === 0) return fallback;
            if (listPathsForBullets.includes(path)) { return `<ul class="property-list-items">${filteredValues.map(item => `<li>${item}</li>`).join('')}</ul>`; }
            return filteredValues.join(', ');
        }

        // 3. *** NEW: Handle simple objects with ONLY a 'notes' key ***
        if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1 && value.notes !== undefined) {
            const noteString = String(value.notes).trim();
            // Return notes directly if they exist and aren't 'N/A', otherwise fallback
            return (noteString !== '' && noteString.toUpperCase() !== 'N/A') ? `<span class="notes-only">${noteString}</span>` : fallback; // Wrap notes in a span for potential styling
        }

        // 4. *** UPDATED: Handle other object types (likely unwanted) -> return fallback ***
         if (typeof value === 'object' && !Array.isArray(value)) {
            console.warn(`[getData] Encountered unexpected object structure for path "${path}". Returning fallback. Object:`, value);
            return fallback;
        }

        // 5. Handle simple values (string, number, boolean)
        const stringValue = String(value);
        // Treat explicit "N/A" strings as fallback too
        return (stringValue.trim() === '' || stringValue.toUpperCase() === 'N/A') ? fallback : stringValue;
    };


    // --- Helper Function: createPropertyItem --- (Unchanged)
    const createPropertyItem = (keyText, valueHtml, isKey = false) => {
        const itemDiv = document.createElement('div'); itemDiv.className = 'property-item';
        if (isKey) itemDiv.classList.add('key-property');
        const dt = document.createElement('dt'); dt.className = 'property-key'; dt.textContent = keyText + ':';
        const dd = document.createElement('dd'); dd.className = 'property-value'; dd.innerHTML = valueHtml;
        if (valueHtml === fallbackValue) dd.classList.add('na-value');
        itemDiv.appendChild(dt); itemDiv.appendChild(dd); return itemDiv;
    };

    // --- Helper Function: createSection --- (Unchanged)
    const createSection = (id, title, icon = null) => {
        const section = document.createElement('section'); section.className = 'material-section'; section.id = id;
        const h2 = document.createElement('h2');
        if (icon) { const iconSpan = document.createElement('span'); iconSpan.setAttribute('aria-hidden', 'true'); iconSpan.textContent = icon; h2.appendChild(iconSpan); h2.appendChild(document.createTextNode(' ')); }
        h2.appendChild(document.createTextNode(title)); section.appendChild(h2);
        if (id === 'section-safety') section.classList.add('safety-info');
        return section;
    };

    // --- Configuration for Sections and Properties --- (Unchanged)
    const sectionConfig = [
        { id: 'section-overview', title: 'Overview', isSpecial: true },
        { id: 'section-safety', title: 'Safety Information', icon: '⚠️', dataKey: 'safety', properties: { 'toxicity': { label: 'Toxicity', isKey: true }, 'handling': { label: 'Handling' }}},
        { id: 'section-identification', title: 'Identification & Structure', dataKey: 'identification', properties: { 'cas_number': { label: 'CAS Number' }, 'crystal_structure': { label: 'Crystal Structure', isKey: true }, 'lattice_constant': { label: 'Lattice Constant', isKey: true, isHtml: true }, 'phase_diagram_notes': { label: 'Phase Diagram Notes' }}},
        { id: 'section-fab-insights', title: 'Advanced Fabrication Insights', dataKey: 'advanced_fabrication_insights', properties: { 'stoichiometry_control': { label: 'Stoichiometry Control', isKey: true }, 'common_defects_impact': { label: 'Common Defects' }, 'surface_preparation': { label: 'Surface Preparation' }, 'method_specific_notes': { label: 'Method Nuances' }}},
        { id: 'section-growth', title: 'Growth & Fabrication Properties', dataKey: 'growth_fabrication_properties', properties: { 'common_growth_methods': { label: 'Common Methods' }, 'source_materials_purity': { label: 'Source Materials' }, 'preferred_substrates_orientations': { label: 'Substrates/Orientations', isKey: true }, 'typical_growth_parameters': { label: 'Growth Parameters' }, 'passivation_methods': { label: 'Passivation', isKey: true }}},
        { id: 'section-processing', title: 'Post-Growth Processing', dataKey: 'post_growth_processing', properties: { 'annealing': { label: 'Annealing', isKey: true }, 'lapping_polishing': { label: 'Lapping & Polishing' }, 'etching': { label: 'Etching Methods' }, 'grinding_milling': { label: 'Grinding/Milling Notes' }}},
        { id: 'section-device-char', title: 'Device Integration & Characterization', dataKey: 'device_integration_characterization', properties: { 'device_architectures': { label: 'Device Architectures' }, 'readout_integration': { label: 'Readout Integration', isKey: true }, 'ar_coatings': { label: 'AR Coatings' }, 'packaging_cooling': { label: 'Packaging/Cooling', isKey: true }, 'key_characterization_techniques': { label: 'Key Characterization', isHtml: true }}},
        { id: 'section-electrical', title: 'Electrical Properties', dataKey: 'electrical_properties', properties: { 'bandgap_type': { label: 'Bandgap Type' }, 'band_gap': { label: 'Bandgap (Eg)', isKey: true, isHtml: true }, 'bandgap_equation.hansen_eg': { label: 'Hansen Eg Eq' }, 'bandgap_equation.varshni_equation': { label: 'Varshni Eg Eq' }, 'bandgap_equation.wavelength_relation': { label: 'Cutoff λ Eq' }, 'common_dopants': { label: 'Common Dopants', isKey: true }, 'carrier_concentration': { label: 'Carrier Conc', isHtml: true }, 'electron_mobility': { label: 'Electron Mobility (μₑ)', isKey: true, isHtml: true }, 'hole_mobility': { label: 'Hole Mobility (μ<0xE2><0x82><0x95>)', isHtml: true }, 'dielectric_constant': { label: 'Dielectric Const (ε)', isHtml: true }, 'resistivity': { label: 'Resistivity (ρ)', isHtml: true }, 'breakdown_field': { label: 'Breakdown Field', isHtml: true }}},
        { id: 'section-optical', title: 'Optical Properties', dataKey: 'optical_properties', properties: { 'spectral_range': { label: 'Spectral Range', isKey: true, isHtml: true }, 'cutoff_wavelength': { label: 'Cutoff Wavelength (λc)', isKey: true, isHtml: true }, 'refractive_index': { label: 'Refractive Index (n)', isHtml: true }, 'absorption_coefficient': { label: 'Absorption Coeff (α)', isHtml: true }, 'quantum_efficiency': { label: 'Quantum Efficiency (η)', isKey: true, isHtml: true }, 'responsivity': { label: 'Responsivity (R)', isKey: true, isHtml: true }, 'noise_equivalent_power': { label: 'Noise Equiv. Power (NEP)', isHtml: true }}},
        { id: 'section-thermal', title: 'Thermal Properties', dataKey: 'thermal_properties', properties: { 'operating_temperature': { label: 'Operating Temperature', isKey: true, isHtml: true }, 'thermal_conductivity': { label: 'Thermal Conductivity (k)', isHtml: true }, 'specific_heat': { label: 'Specific Heat (Cp)', isHtml: true }, 'melting_point': { label: 'Melting Point', isHtml: true }}},
        { id: 'section-mechanical', title: 'Mechanical Properties', dataKey: 'mechanical_properties', properties: { 'density': { label: 'Density', isHtml: true }, 'youngs_modulus': { label: 'Young\'s Modulus (E)', isHtml: true }, 'hardness_vickers': { label: 'Hardness (Vickers)', isHtml: true }, 'poissons_ratio': { label: 'Poisson\'s Ratio (ν)' }, 'fracture_toughness': { label: 'Fracture Toughness (K<small>IC</small>)', isHtml: true }}},
        { id: 'section-applications', title: 'Key Applications & Sensor Types', dataKey: 'device_applications', properties: { 'sensor_types': { label: 'Common Sensor Types' }, 'key_applications': { label: 'Key Applications', isKey: true, isHtml: true }}},
        { id: 'section-chemical', title: 'Chemical Properties', dataKey: 'chemical_properties', properties: { 'stability_oxidation': { label: 'Stability & Oxidation' }}},
        { id: 'section-magnetic', title: 'Magnetic Properties', dataKey: 'magnetic_properties', properties: { 'type': { label: 'Magnetic Type', isKey: true }, 'critical_temperature_tc': { label: 'Critical Temp (Tc)', isHtml: true }, 'upper_critical_field_bc2': { label: 'Upper Critical Field (Bc2)', isHtml: true }, 'critical_current_density_jc': { label: 'Critical Current (Jc)', isHtml: true }}},
        { id: 'section-comparison', title: 'Comparison with Alternatives', dataKey: 'comparison_alternatives', isSpecial: true },
        { id: 'section-references', title: 'References & Further Reading', dataKey: 'references_further_reading', isSpecial: true },
        { id: 'section-vendors', title: 'Commercial Vendors (Example)', dataKey: 'vendor_info', isSpecial: true }
    ];

    // --- Populate Header & Tags --- (Unchanged)
     document.title = `${getData(material, 'name', 'Material')} Detail - MaterialsDB`; // Set dynamic title
     document.getElementById('material-name').textContent = getData(material, 'name', 'Unknown Material');
     const formulaElement = document.getElementById('material-formula');
     if(formulaElement) formulaElement.innerHTML = getData(material, 'formula', '');
     const tagsContainer = document.getElementById('material-tags');
     if (tagsContainer) { /* ... tags logic ... */
        tagsContainer.innerHTML = ''; const tags = material.tags || []; let tagsAdded = false;
        if (Array.isArray(tags) && tags.length > 0) {
            tags.forEach(tag => { if (typeof tag === 'string' && tag.trim() !== '') { const tagElement = document.createElement('span'); tagElement.className = 'tag'; tagElement.textContent = tag.replace(/^\w+:/, ""); tagsContainer.appendChild(tagElement); tagsAdded = true; } });
        }
        if (!tagsAdded) tagsContainer.innerHTML = fallbackValue;
     }

    // --- Dynamically Create and Populate Sections --- (Logic using refined getData)
    console.log("[Detail Page] Dynamically building sections based on available data...");
    const fragment = document.createDocumentFragment();

    sectionConfig.forEach(config => {
        const { id, title, icon, dataKey, properties, isSpecial } = config;

        let sectionDataExists = false;
        if (isSpecial) {
            if (id === 'section-overview') sectionDataExists = material['description'] || material['wiki_link'];
            else if (dataKey) sectionDataExists = material[dataKey];
        } else if (dataKey) {
            sectionDataExists = material[dataKey];
        }

        if (!sectionDataExists) return; // Skip section if primary data key missing

        let section = createSection(id, title, icon);
        let sectionHasContent = false;

        if (isSpecial) {
            // ... (Special section logic remains the same as previous response) ...
            // Example for Overview:
             if (id === 'section-overview') {
                const descVal = getData(material, 'description', fallbackValue); // Use updated getData
                if (descVal !== fallbackValue) { const p = document.createElement('p'); p.className='description'; p.textContent=descVal; section.appendChild(p); sectionHasContent = true; }
                const wikiUrl = getData(material, 'wiki_link', '#');
                if (wikiUrl !== '#' && wikiUrl !== fallbackValue) { const p = document.createElement('p'); const a = document.createElement('a'); a.id = 'wiki-link'; a.href=wikiUrl; a.target='_blank'; a.rel='noopener noreferrer'; a.textContent='Wikipedia Article'; p.appendChild(document.createTextNode('See also: ')); p.appendChild(a); section.appendChild(p); sectionHasContent = true;}
                const imgPlaceholder = document.createElement('div'); imgPlaceholder.className = 'image-placeholder'; imgPlaceholder.textContent = 'Image Placeholder / Diagram'; section.appendChild(imgPlaceholder);
                sectionHasContent = true;
            }
            // ... (Other special sections: Comparison, References, Vendors - logic unchanged) ...
            else if (id === 'section-comparison' && material.comparison_alternatives) {
                 const dl = document.createElement('dl'); dl.className = 'property-list'; dl.id = 'comparison-list';
                 const notesValue = getData(material, 'comparison_alternatives.notes', 'CHECK_FALLBACK');
                 if (notesValue !== 'CHECK_FALLBACK' && notesValue !== fallbackValue) { dl.appendChild(createPropertyItem('Notes', notesValue)); sectionHasContent = true; }
                 let comparisonsFound = false;
                 Object.entries(material.comparison_alternatives).forEach(([key, value]) => {
                    if (key.startsWith('vs_')) {
                         const valueStr = getData(material, `comparison_alternatives.${key}`, fallbackValue);
                         if (valueStr !== fallbackValue) { dl.appendChild(createPropertyItem(key.replace(/^vs_/, 'vs. '), valueStr)); comparisonsFound = true; }
                    }
                 });
                 if (!comparisonsFound && (notesValue === 'CHECK_FALLBACK' || notesValue === fallbackValue)) {
                     const naItem = document.createElement('div'); naItem.className = 'property-item comparison-na-message';
                     naItem.innerHTML = `<dd class="property-value">${fallbackValue}</dd>`; dl.appendChild(naItem);
                     sectionHasContent = true;
                 } else if (comparisonsFound) {
                     sectionHasContent = true;
                 }
                 if (sectionHasContent) section.appendChild(dl);
            }
            else if (id === 'section-references' && material.references_further_reading) {
                 const ul = document.createElement('ul'); ul.id = 'reference-list'; let listContent = '';
                 const notesValue = getData(material, 'references_further_reading.notes', 'CHECK_FALLBACK');
                 if (notesValue !== 'CHECK_FALLBACK' && notesValue !== fallbackValue) { listContent += `<li class="ref-notes"><em>${notesValue}</em></li>`; sectionHasContent = true; }
                 let refsAdded = false;
                 Object.entries(material.references_further_reading).forEach(([key, value])=>{
                     if(key !== 'notes'){
                         const refValue = getData(material, `references_further_reading.${key}`, fallbackValue);
                          if (refValue !== fallbackValue) {
                              let itemHtml = '';
                              if (key === 'wikipedia' && typeof refValue === 'string' && refValue.startsWith('http')) { itemHtml = `Wikipedia: <a href="${refValue}" target="_blank" rel="noopener noreferrer">${refValue}</a>`; }
                              else if (typeof refValue === 'string') { itemHtml = refValue; }
                              if(itemHtml){ listContent += `<li>${itemHtml}</li>`; refsAdded = true;}
                          }
                     }
                 });
                 if (refsAdded) sectionHasContent = true;
                 ul.innerHTML = listContent || `<li>Reference information ${fallbackValue}</li>`;
                 if (!refsAdded && (notesValue === 'CHECK_FALLBACK' || notesValue === fallbackValue)) { ul.innerHTML = `<li>Reference information ${fallbackValue}</li>`; }
                 section.appendChild(ul);
            }
             else if (id === 'section-vendors' && material.vendor_info) {
                  const introP = document.createElement('p'); introP.textContent = 'This space can list companies supplying materials or related services.'; section.appendChild(introP);
                  const ul = document.createElement('ul'); ul.id = 'vendor-list'; let listContent = '';
                  const notesValue = getData(material, 'vendor_info.notes', 'CHECK_FALLBACK');
                  if (notesValue !== 'CHECK_FALLBACK' && notesValue !== fallbackValue) { listContent += `<li class="vendor-notes"><em>${notesValue}</em></li>`; sectionHasContent = true; }
                  let vendorsAdded = false;
                  Object.entries(material.vendor_info).forEach(([key, value])=>{
                       if(key !== 'notes'){
                           const vendorValue = getData(material, `vendor_info.${key}`, fallbackValue);
                            if (vendorValue !== fallbackValue) {
                                let itemHtml = vendorValue;
                                try { const urlMatch = String(vendorValue).match(/(https?:\/\/[^\s]+)|(www\.[^\s]+)/); if (urlMatch) { const url = urlMatch[0].startsWith('http') ? urlMatch[0] : 'http://' + urlMatch[0]; itemHtml = String(vendorValue).replace(urlMatch[0], `<a href="${url}" target="_blank" rel="noopener noreferrer">${urlMatch[0]}</a>`); } } catch (linkError) { /* ignore */ }
                                listContent += `<li>${itemHtml}</li>`; vendorsAdded = true;
                            }
                       }
                  });
                  if (vendorsAdded) sectionHasContent = true;
                  ul.innerHTML = listContent || `<li>Vendor information ${fallbackValue}</li>`;
                  if (!vendorsAdded && (notesValue === 'CHECK_FALLBACK' || notesValue === fallbackValue)) { ul.innerHTML = `<li>Vendor information ${fallbackValue}</li>`; }
                  section.appendChild(ul);
                  const disclaimerP = document.createElement('p'); const small = document.createElement('small'); small.textContent = 'Note: Listing does not imply endorsement. Contact vendors directly for current offerings.'; disclaimerP.appendChild(small); section.appendChild(disclaimerP);
                  sectionHasContent = true;
             }

            if (sectionHasContent) { fragment.appendChild(section); }
        }
        // --- Populate Standard Sections ---
        else if (dataKey && properties && material[dataKey]) {
            const dl = document.createElement('dl'); dl.className = 'property-list';

             if (id === 'section-identification') {
                 let catVal = getData(material, 'category', fallbackValue);
                 if (catVal !== fallbackValue) { dl.appendChild(createPropertyItem('Material Category', catVal)); sectionHasContent = true; }
                 let classVal = getData(material, 'identification.class', fallbackValue); // Use specific path for class
                 if (classVal !== fallbackValue) { dl.appendChild(createPropertyItem('Material Class', classVal)); sectionHasContent = true; }
             }

            Object.entries(properties).forEach(([propKey, propConfig]) => {
                 const dataPath = `${dataKey}.${propKey}`;
                 const value = getData(material, dataPath, fallbackValue); // Use *UPDATED* getData
                 if (value !== fallbackValue) { // Check against the actual fallback value
                     dl.appendChild(createPropertyItem(propConfig.label, value, propConfig.isKey || false));
                     sectionHasContent = true;
                 }
            });

            if (sectionHasContent) {
                section.appendChild(dl);
                fragment.appendChild(section);
            }
        }
    });

    container.appendChild(fragment);
    console.log("[Detail Page] Dynamic page population complete.");

} // End of populatePage function
