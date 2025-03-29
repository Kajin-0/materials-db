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
 * Populates the HTML": "LPE, MBE, MOCVD, Bulk (less common).",
        "source_materials_purity": "Elemental Hg, Cd, Te (>6N purity essential).",
        "preferred_substrates_orientations": "Substrate: CdZnTe (~4% Zn); Si/GaAs/Ge usable (w/ buffers). Orientation: (111)B (LPE); (211)B, (100) (MBE/MOCVD).",
        "typical_growth_parameters": "Rates: ~1-5 um/hr (MBE/MOCVD). Precise Temp/Pressure control vital.",
        "passivation_methods": "Essential. Common: ZnS, CdTe, SiO2 via Sputtering, MBE, ALD."
    },
    "post_growth_processing": { // Concise points
        "annealing": "CRITICAL: Reduces Hg vacancies, activates dopants. Temps ~200-450C. Requires Hg overpressure.",
        "lapping_polishing": "Lapping: Al2O3/SiC slurries. Polishing: Diamond slurries (<1um) or CMP (Br-Methanol). Low pressure.",
        "etching": "Wet: Br-Methanol/Ethylene Glycol. Dry: RIE/ICP (CH4/H2, Ar, Halogens) for patterning.",
        "grinding_milling": "Avoid for wafers (brittle/contamination)."
    },
     "device_integration_characterization": { // Concise points
        "device_architectures": "Photoconductors (PC), Photovoltaic Diodes (PV/PD). Mesa or planar.",
        "readout_integration": "Flip-chip bonding to Si ROIC via Indium bumps (FPAs).",
        "ar_coatings": "Required (high n). Common: ZnS, Ge, dielectric stacks.",
        "packaging_cooling": "Requires vacuum package & cryogenic cooling (e.g., Stirling, LN2) for low noise.",
        "characterization_techniques": ["Hall (mobility, conc.)", "FTIR (λc, thickness)", "PL (quality)", "XRD (crystal)", "SIMS (composition)", "Spectral Response", "I-V (diodes)"] // List format
    },
    "electrical_properties": { // Kept concise data
      "bandgap_type": "Direct, Tunable",
      "band_gap": {"value": "0 - 1.5", "unit": "eV", "notes": "Tunable via x. Target: x≈0.2 LWIR, x≈0.3 MWIR."},
      "bandgap_equation": {"hansen_eg": "Eg(x,T) Empirical Eq.", "wavelength_relation": "λ_c (um) ≈ 1.24 / Eg (eV)"},
      "common_dopants": "n-type: In; p-type: As, Au, Hg-vacancies (10^14-10^17 cm^-3 typical).",
      "carrier_concentration": {"value": "ni ~10^16 (300K), ~10^13 (77K) @ x=0.2.", "notes": "Extrinsic via doping."},
      "electron_mobility": {"value": ">10,000", "unit": "cm^2/Vs", "notes": "High @ 77K (low x)."},
      "hole_mobility": {"value": "100 - 600", "unit": "cm^2/Vs", "notes": "Lower than μe (77K)."},
      "dielectric_constant": {"value": "~15 - 20", "notes": "Static."},
      "resistivity": {"value": "Variable (10^-3 - 10^3+)", "unit": "Ohm-cm", "notes": "Depends on x, T, doping."},
      "breakdown_field": {"value": "Low (~10^3 - 10^4)", "unit": "V/cm", "notes": "Limits high-field use."}
    },
    "optical_properties": { // Kept concise data
      "spectral_range": "SWIR, MWIR, LWIR (0.8 to >30 um)", "notes": "Determined by Eg(x).",
      "cutoff_wavelength": {"value": "0.8 to >30", "unit": "um", "notes": "λ_c ≈ 1.24 / Eg."},
      "refractive_index": {"value": "~3.4 - 4.0", "notes": "High index."},
      "absorption_coefficient": {"value": ">10^4", "unit": "cm^-1", "notes": "High near band edge."},
      "quantum_efficiency": {"value": ">70-80%", "notes": "With good material/AR coating."},
      "responsivity": {"value": "~1 - 10", "unit": "A/W", "notes": "At 77K."},
      "noise_equivalent_power": {"value": "~10^-11 - 10^-13", "unit": "W/Hz^0.5", "notes": "Cooled detectors."}
    },
    "thermal_properties": { // Kept concise data
      "operating_temperature": {"value": "Typically 77 K (LN2)", "notes": "Reduces dark current."},
      "thermal_conductivity": {"value": "Low (~1 - 5)", "unit": "W/(m K)", "notes": "Poor conductor."},
      "specific_heat": {"value": "~0.16 - 0.20", "unit": "J/(g K)", "notes": "RT."},
      "melting_point": {"value": "~700 - 800", "unit": "C", "notes": "Composition dependent."}
    },
     "mechanical_properties": { // Kept concise data
         "density": {"value": "~5.8 to ~8.1", "unit": "g/cm^3", "notes": "Increases with Hg."},
         "youngs_modulus": {"value": "~40 - 50", "unit": "GPa"},
         "hardness_vickers": {"value": "~70 - 100", "unit": "HV", "notes": "Soft, brittle."},
         "poissons_ratio": "~0.3",
         "fracture_toughness": {"value": "< 0.5", "unit": "MPa m^0.5", "notes": "Brittle."}
     },
     "device_applications": { // Renamed key, kept lists
         "sensor_types": ["Photoconductor (PC)", "Photovoltaic (PV / Photodiode)", "APD (less common)"],
         "key_applications": ["Thermal Imaging/FLIR", "Night Vision", "Medical Thermography", "Gas Sensing", "IR Astronomy", "Missile Guidance"]
     },
     "chemical_properties": { // Simplified
         "stability_oxidation": "Surface unstable; requires passivation. Readily oxidizes." elements with data from the material object.
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
            const listPaths = [
                'device_applications.key_applications', // Note key change
                //'processing_availability.synthesis_methods', // Removed from explicit list format here
                //'processing_availability.forms', // Removed from explicit list format here
                'device_applications.sensor_types',
                //'growth_fabrication_properties.common_growth_methods', // Use comma join for this one
                'device_integration_characterization.key_characterization_techniques' // Updated key
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
           if (value === 'N/A') { element.classList.add('na-value'); } // Optional: Add class for styling N/A
           else { element.classList.remove('na-value'); }
       } else { console.warn(`[Detail Page] Element with ID "${id}" not found: ${id}`); }
   };


    console.log("[Detail Page] Populating page with concise detailed data:", material);

    // --- Populate Header, Overview, Wiki Link, Tags ---
    updateContent('material-name', getData(material, 'name', 'Unknown Material'));
    updateContent('material-formula', getData(material, 'formula', ''));
    updateContent('material-description', getData(material, 'description'));
    const wikiLink = document.getElementById('wiki-link');
    if (wikiLink) wikiLink.href = getData(material, 'wiki_link', '#'); // Set Wiki Link Href

    const tagsContainer = document.getElementById('material-tags');
    if (tagsContainer) { // Logic unchanged
        tagsContainer.innerHTML = '';
        const tags = material.tags || [];
        if (Array.isArray(tags) && tags.length > 0) {
            tags.forEach(tag => {
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
    updateContent('prop-common-growth-methods', getData(material, 'growth_fabrication_properties.common_growth_methods')); // Now comma joined
    updateContent('prop-source-materials', getData(material, 'growth_fabrication_properties.source_materials_purity'));
    updateContent('prop-substrates-orientations', getData(material, 'growth_fabrication_properties.preferred_substrates_orientations')); // Use combined ID
    // No need to update prop-crystal-orientations separately if using combined ID above
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
    updateContent('prop-char-techniques', getData(material, 'device_integration_characterization.key_characterization_techniques'), true); // Use HTML list

    // --- Populate Electrical Properties --- (Paths unchanged)
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

    // --- Populate Optical Properties --- (Paths unchanged, notes handled)
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

    // --- Populate Thermal Properties --- (Paths unchanged)
    updateContent('prop-op-temp', getData(material, 'thermal_properties.operating_temperature'));
    updateContent('prop-therm-cond', getData(material, 'thermal_properties.thermal_conductivity'));
    updateContent('prop-specific-heat', getData(material, 'thermal_properties.specific_heat'));
    updateContent('prop-melt-pt', getData(material, 'thermal_properties.melting_point'));

    // --- Populate Mechanical Properties --- (Paths unchanged)
    updateContent('prop-density', getData(material, 'mechanical_properties.density'));
    updateContent('prop-youngs-modulus', getData(material, 'mechanical_properties.youngs_modulus'));
    updateContent('prop-hardness-vickers', getData(material, 'mechanical_properties.hardness_vickers'));
    updateContent('prop-poissons-ratio', getData(material, 'mechanical_properties.poissons_ratio'));
    updateContent('prop-fracture-toughness', getData(material, 'mechanical_properties.fracture_toughness'));

    // --- Populate Key Applications & Sensor Types --- (Using correct IDs)
    updateContent('prop-sensor-types', getData(material, 'device_applications.sensor_types')); // Use comma join
    updateContent('prop-key-applications', getData(material, 'device_applications.key_applications'), true); // Use HTML list

    // --- Populate Chemical Properties ---
    updateContent('prop-stability-oxidation', getData(material, 'chemical_properties.stability_oxidation'));
    // Note: 'etching' data is now handled under 'post_growth_processing'

    // --- Populate Magnetic Properties ---
    updateContent('prop-magnetic-type', getData(material, 'magnetic_properties.type'));

    // --- Populate Comparison ---
    updateContent('prop-comparison-notes', getData(material, 'comparison_alternatives.notes'));
    updateContent('prop-vs-insb', getData(material, 'comparison_alternatives.vs_InSb'));
    updateContent('prop-vs-qwips', getData(material, 'comparison_alternatives.vs_QWIPs'));
    updateContent('prop-vs-t2sls', getData(material, 'comparison_alternatives.vs_T2SLs'));

    // --- Populate References --- (Using simplified logic)
    const refList = document.getElementById('reference-list');
    if (refList && material.references_further_reading) {
        refList.innerHTML = ''; // Clear loading
        const refs = material.references_further_reading;
        if(refs.notes) { refList.innerHTML += `<li><small><em>${refs.notes}</em></small></li>`; } // Add notes

        Object.entries(refs).forEach(([key, value]) => {
            if (key !== 'notes' && value) { // Add only if value exists
                let itemHtml = '';
                if (key === 'wikipedia' && typeof value === 'string' && value.startsWith('http')) {
                    itemHtml = `Wikipedia: <a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
                } else if (typeof value === 'string') {
                     itemHtml = value; // Display the reference text directly
                }
                 if (itemHtml) { refList.innerHTML += `<li>${itemHtml}</li>`; }
            }
        });
        if (refList.children.length === 0 || (refList.children.length === 1 && refList.querySelector('small'))) {
            refList.innerHTML = '<li>Reference information not available.</li>'; // Fallback if only notes or nothing
        }
    } else if (refList) { refList.innerHTML = '<li>Reference information not available.</li>'; }


    // --- Populate Vendor Info --- (Logic unchanged)
    const vendorList = document.getElementById('vendor-list');
    if (vendorList && material.vendor_info) {
        vendorList.innerHTML = '';
        let vendorsFound = false;
        if(material.vendor_info.notes) { /* ... add notes ... */

     },
     "magnetic_properties": { // Kept as is
         "type": "Diamagnetic"
     },
     "comparison_alternatives": { // Concise points
         "notes": "Key IR Competitors:",
         "vs_InSb": "MCT: Wider tuning (LWIR+), higher T_op (MWIR). InSb: Cheaper, mature (MWIR).",
         "vs_QWIPs": "MCT: Higher QE, T_op. QWIPs (GaAs): Better uniformity, lower cost potential.",
         "vs_T2SLs": "T2SLs (e.g., InAs/GaSb): Potential for higher T_op, lower dark current, better uniformity; complex growth."
     },
     "references_further_reading": { // Key references only
         "notes": "Key Resources:",
         "book_rogalski": "Rogalski, A. 'Infrared Detectors' (SPIE Press)",
         "review_hansen": "Hansen, G. L. et al. J. Appl. Phys. 53, 7099 (1982) - Eg(x,T)",
         "review_norton": "Norton, P. R. Opto-Electron. Rev., 10(3), 159 (2002) - Detector Overview",
         "wikipedia": "https://en.wikipedia.org/wiki/Mercury_cadmium_telluride"
     },
     "vendor_info": { // Kept as is
         "notes": "Example Vendors (Placeholder):",
         "vendor_1": "Company A - www.example-vendor-a.com",
         "vendor_2": "Company B - www.example-vendor-b.com",
         "vendor_3": "Company C - www.example-vendor-c.com"
     },
    "tags": [ // Kept as is
      "II-VI", "LPE", "MBE", "MOCVD", "aerospace", "cadmium", "chalcogenide", "cryogenic",
      "epitaxial", "group 12", "group 16", "industry:aerospace", "industry:infrared",
      "industry:photonics", "ir", "lwir", "mercury", "mwir", "nitrogen cooled",
      "photoconductive", "photoconductor", "photodiode", "photosensor", "semiconductor",
      "sensor", "single crystal", "tellurium", "toxic", "tunable bandgap"
    ]
  }
}
