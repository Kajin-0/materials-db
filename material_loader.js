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
        return;
    }

    try {
        const detailDataPath = "data/material_details.json";
        console.log("[Detail Page] Fetching dedicated detail data file:", detailDataPath);
        const detailRes = await fetch(detailDataPath);
        if (!detailRes.ok) {
            if (detailRes.status === 404) { throw new Error(`Detailed data file not found at ${detailDataPath}.`); }
            else { throw new Error(`HTTP error! status: ${detailRes.status} - Could not fetch ${detailDataPath}`); }
        }

        const allDetailData = await detailRes.json();
        console.log("[Detail Page] Detailed data loaded:", allDetailData);

         if (typeof allDetailData !== 'object' || allDetailData === null) {
             throw new Error(`Data format error in ${detailDataPath}. Expected object.`);
         }

        const material = allDetailData[materialName]; // Direct lookup

        if (!material) {
             throw new Error(`Detailed information for "${materialName}" not found in ${detailDataPath}.`);
        }
        console.log("[Detail Page] Specific detailed material object found:", material);

        populatePage(material); // Call populate function

    } catch (e) {
        console.error("[Detail Page] Failed to load material details:", e);
        if (nameElement) nameElement.textContent = "Error loading details.";
        if (mainContainer) mainContainer.innerHTML = `<p class="error-message">Error loading material details: ${e.message}. Check console.</p>`;
    }
});

/**
 * Populates the HTML elements with data from the material object.
 * @param {object} material - The detailed material data object.
 */
function populatePage(material) {
    // Helper to get potentially nested data
    const getData = (obj, path, fallback = 'N/A') => {
        const value = path.split('.').reduce((o, key) => (o && typeof o === 'object' && o[key] !== 'undefined' && o[key] !== null) ? o[key] : undefined, obj);
        if (typeof value === 'object' && typeof value.value !== 'undefined') {
           let text = String(value.value);
           if (value.unit) text += ` ${value.unit}`;
           if (value.notes) text += ` (${value.notes})`;
           return text;
        }
        if (Array.isArray(value)) {
            const listPaths = [ // Paths containing arrays that should be bulleted lists
                'device_applications.key_applications', // Updated path
                'processing_availability.synthesis_methods', // Still relevant? Maybe redundant
                'processing_availability.forms', // Still relevant? Maybe redundant
                'device_applications.sensor_types', // Updated path
                'growth_fabrication_properties.common_growth_methods',
                'device_integration_characterization.characterization_techniques' // New path
            ];
            if (listPaths.includes(path)) {
                 return value.length > 0 ? value.map(item => `• ${item}`).join('<br>') : fallback;
            }
            return value.length > 0 ? value.join(', ') : fallback;
        }
        return (value !== null && typeof value !== 'undefined' && value !== '') ? String(value) : fallback;
    };

    // Helper to update element content (text or HTML)
    const updateContent = (id, value, isHtml = false) => {
       const element = document.getElementById(id);
       if (element) {
           if (element.textContent === 'Loading...') element.innerHTML = '';
           if (isHtml) { element.innerHTML = value; }
           else { element.textContent = value; }
           if (value === 'N/A') { element.classList.add('na-value'); }
           else { element.classList.remove('na-value'); }
       } else { console.warn(`[Detail Page] Element with ID "${id}" not found.`); }
   };

    console.log("[Detail Page] Populating page with detailed nested data:", material);

    // --- Populate Header, Overview, Wiki Link, Tags ---
    updateContent('material-name', getData(material, 'name', 'Unknown Material'));
    updateContent('material-formula', getData(material, 'formula', ''));
    updateContent('material-description', getData(material, 'description'));
    const wikiLink = document.getElementById('wiki-link');
    if (wikiLink) wikiLink.href = getData(material, 'wiki_link', '#');

    const tagsContainer = document.getElementById('material-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        const tags = material.tags || [];
        if (Array.isArray(tags) && tags.length > 0) {
            tags.forEach(tag => { /* ... existing tag rendering ... */
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = typeof tag === 'string' ? tag.replace(/^\w+:/, "") : tag;
                tagsContainer.appendChild(tagElement);
             });
        } else { updateContent('material-tags', 'N/A'); }
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
    updateContent('prop-phase-diagram', getData(material, 'identification.phase_diagram_notes'));

    // --- Populate Advanced Fabrication Insights ---
    updateContent('prop-stoichiometry', getData(material, 'advanced_fabrication_insights.stoichiometry_control'));
    updateContent('prop-defects', getData(material, 'advanced_fabrication_insights.common_defects_impact'));
    updateContent('prop-surface-prep', getData(material, 'advanced_fabrication_insights.surface_preparation'));
    updateContent('prop-method-nuances', getData(material, 'advanced_fabrication_insights.method_specific_notes'));

    // --- Populate Growth & Fabrication Properties ---
    updateContent('prop-common-growth-methods', getData(material, 'growth_fabrication_properties.common_growth_methods'));
    updateContent('prop-source-materials', getData(material, 'growth_fabrication_properties.source_materials_purity'));
    updateContent('prop-substrates-orientations', getData(material, 'growth_fabrication_properties.preferred_substrates_orientations')); // Combined ID
    // updateContent('prop-crystal-orientations', getData(material, 'growth_fabrication_properties.preferred_substrates_orientations')); // Covered above
    updateContent('prop-growth-parameters', getData(material, 'growth_fabrication_properties.typical_growth_parameters'));
    updateContent('prop-passivation', getData(material, 'growth_fabrication_properties.passivation_methods'));

    // --- Populate Post-Growth Processing ---
    updateContent('prop-annealing', getData(material, 'post_growth_processing.annealing'));
    updateContent('prop-lapping-polishing', getData(material, 'post_growth_processing.lapping_polishing'));
    updateContent('prop-etching', getData(material, 'post_growth_processing.etching'));
    updateContent('prop-grinding-milling', getData(material, 'post_growth_processing.grinding_milling'));

    // --- Populate Device Integration & Characterization ---
    updateContent('prop-device-arch', getData(material, 'device_integration_characterization.device_architectures'));
    updateContent('prop-readout-integration', getData(material, 'device_integration_characterization.readout_integration'));
    updateContent('prop-ar-coatings', getData(material, 'device_integration_characterization.ar_coatings'));
    updateContent('prop-packaging-cooling', getData(material, 'device_integration_characterization.packaging_cooling'));
    updateContent('prop-char-techniques', getData(material, 'device_integration_characterization.characterization_techniques'), true); // Use HTML list

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
     const spectralNotes = getData(material, 'optical_properties.notes', '');
     const spectralRangeElement = document.getElementById('prop-spectral-range');
     if (spectralRangeElement && spectralNotes && spectralNotes !== 'N/A') {
         if (!spectralRangeElement.textContent.includes(spectralNotes)) { spectralRangeElement.textContent += ` (${spectralNotes})`; }
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

    // --- Populate Key Applications & Sensor Types --- (Using updated IDs)
    updateContent('prop-sensor-types', getData(material, 'device_applications.sensor_types'), true);
    updateContent('prop-key-applications', getData(material, 'device_applications.key_applications'), true);

    // --- Populate Chemical Properties ---
    updateContent('prop-stability-oxidation', getData(material, 'chemical_properties.stability_oxidation'));

    // --- Populate Magnetic Properties ---
    updateContent('prop-magnetic-type', getData(material, 'magnetic_properties.type'));

    // --- Populate Comparison ---
    updateContent('prop-comparison-notes', getData(material, 'comparison_alternatives.notes'));
    updateContent('prop-vs-insb', getData(material, 'comparison_alternatives.vs_InSb'));
    updateContent('prop-vs-qwips', getData(material, 'comparison_alternatives.vs_QWIPs'));
    updateContent('prop-vs-t2sls', getData(material, 'comparison_alternatives.vs_T2SLs'));

    // --- Populate References ---
    const refList = document.getElementById('reference-list');
    if (refList && material.references_further_reading) {
        refList.innerHTML = ''; // Clear loading
        const refs = material.references_further_reading;
        if(refs.notes) { // Add notes first if they exist
             const li = document.createElement('li');
             li.innerHTML = `<small><em>${refs.notes}</em></small>`;
             refList.appendChild(li);
        }
        Object.entries(refs).forEach(([key, value]) => {
            if (key !== 'notes') { // Process actual references
                const li = document.createElement('li');
                if (key === 'wikipedia' && typeof value === 'string' && value.startsWith('http')) {
                    li.innerHTML = `Wikipedia: <a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
                } else if (typeof value === 'string') {
                     // Simple display for book/review keys
                     li.textContent = value; // Display the reference text directly
                }
                 if (li.textContent || li.innerHTML) { // Add only if content exists
                    refList.appendChild(li);
                 }
            }
        });
        if (refList.children.length === 0 || (refList.children.length === 1 && refList.children[0].querySelector('small'))) {
            refList.innerHTML = '<li>Reference information not available.</li>'; // Fallback
        }
    } else if (refList) {
        refList.innerHTML = '<li>Reference information not available.</li>';
    }


    // --- Populate Vendor Info ---
    const vendorList = document.getElementById('vendor-list');
    if (vendorList && material.vendor_info) { // Logic remains same as before
        vendorList.innerHTML = '';
        let vendorsFound = false;
        if(material.vendor_info.notes) { /* ... add notes ... */
            const li = document.createElement('li');
            li.innerHTML = `<small><em>${material.vendor_info.notes}</em></small>`;
            vendorList.appendChild(li);
        }
        Object.entries(material.vendor_info).forEach(([key, value]) => {
            if (key.startsWith('vendor_')) { /* ... render vendor link/text ... */
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
         if (!vendorsFound) { /* ... add placeholder if no vendors ... */
            const li = document.createElement('li'); li.textContent = "Vendor information not available.";
            if(!material.vendor_info.notes) vendorList.appendChild(li);
        }
    } else if (vendorList) {
         vendorList.innerHTML = '<li>Vendor information not available.</li>';
    }


    console.log("[Detail Page] Page population attempt complete.");
}
