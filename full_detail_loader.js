// --- START OF FILE full_detail_loader.js ---
console.log("[Full Detail Loader] Script started.");

// --- ================================================================= ---
// ---                *** Bandgap Plot Function START ***                ---
// --- ================================================================= ---
function initializeBandgapPlot(plotContainerId, sliderId, valueId, equationData) {
    console.log(`[Bandgap Plot] Initializing plot for ${plotContainerId}`);
    const plotContainer = document.getElementById(plotContainerId);
    const tempSlider = document.getElementById(sliderId);
    const tempValueSpan = document.getElementById(valueId);

    if (!plotContainer || !tempSlider || !tempValueSpan || typeof Plotly === 'undefined') {
        console.error("[Bandgap Plot] Error: Plot container, slider, value span, or Plotly library not found.");
        if (plotContainer) plotContainer.innerHTML = '<p class="error-message">Error initializing plot.</p>';
        return;
    }

    // --- Hansen Equation Implementation ---
    // E_g(x, T) = -0.302 + 1.93x + 5.35 × 10⁻⁴ T (1 - 2x) - 0.810x² + 0.832x³
    // Note: Ideally parse coefficients from equationData if it was structured that way.
    const calculateHansenEg = (x, T) => {
        return -0.302 + 1.93 * x + 5.35e-4 * T * (1 - 2 * x) - 0.810 * Math.pow(x, 2) + 0.832 * Math.pow(x, 3);
    };

    // --- Generate Data ---
    const numPoints = 101;
    const xValues = Array.from({ length: numPoints }, (_, i) => i / (numPoints - 1)); // x from 0 to 1

    const calculateYValues = (temp) => {
        return xValues.map(x => {
            const eg = calculateHansenEg(x, temp);
            // Plotly handles negative values fine (HgTe is ~ -0.3 eV)
            return eg;
        });
    };

    // --- Initial Plot Setup ---
    const initialTemp = 77; // Default temperature (e.g., 77K)
    tempSlider.value = initialTemp;
    tempValueSpan.textContent = `${initialTemp} K`;
    let yValues = calculateYValues(initialTemp);

    const trace = {
        x: xValues,
        y: yValues,
        mode: 'lines',
        type: 'scatter',
        name: `Eg at ${initialTemp}K`,
        line: {
            color: 'rgb(0, 100, 200)',
            width: 3
        }
    };

    const layout = {
        title: 'Hg<sub>(1-x)</sub>Cd<sub>x</sub>Te Bandgap vs. Composition',
        xaxis: {
            title: 'Cd Mole Fraction (x)',
            range: [0, 1],
            zeroline: false
        },
        yaxis: {
            title: 'Bandgap E<sub>g</sub> (eV)',
            range: [-0.5, 1.6], // Explicit range to better see behavior near x=0
            zeroline: true
        },
        margin: { l: 60, r: 30, b: 50, t: 50 }, // Adjust margins
        hovermode: 'x unified'
    };

    Plotly.newPlot(plotContainerId, [trace], layout, {responsive: true});

    // --- Slider Event Listener ---
    tempSlider.addEventListener('input', () => {
        const currentTemp = parseFloat(tempSlider.value);
        tempValueSpan.textContent = `${currentTemp} K`;

        // Recalculate Y values
        const newYValues = calculateYValues(currentTemp);

        // Update plot data and trace name
        Plotly.update(plotContainerId, { y: [newYValues], name: [`Eg at ${currentTemp}K`] }, {}, [0]); // Update trace 0
    });

    console.log(`[Bandgap Plot] Plot initialized successfully for ${plotContainerId}`);

} // --- End initializeBandgapPlot ---
// --- ================================================================= ---
// ---                 *** Bandgap Plot Function END ***                 ---
// --- ================================================================= ---


document.addEventListener("DOMContentLoaded", async () => {
    console.log("[Full Detail Loader] DOMContentLoaded event fired.");

    // --- Get parameters from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");
    // --- Get DOM elements ---
    const materialNameEl = document.getElementById("material-name");
    const tocListEl = document.getElementById("toc-list");
    const mainContentEl = document.getElementById("main-content");
    const referencesSectionEl = document.getElementById("references-section");
    const referencesListEl = document.getElementById("references-list");

    // --- Display Error Function ---
    const displayError = (message) => {
        console.error("[Full Detail] Error:", message);
        if (materialNameEl) materialNameEl.textContent = "Error Loading Material";
        if (tocListEl) tocListEl.innerHTML = '<li>Error loading contents</li>';
        if (mainContentEl) mainContentEl.innerHTML = `<p class="error-message">Could not load material details: ${message}</p>`;
        if (referencesSectionEl) referencesSectionEl.style.display = 'none';
        document.title = "Error - Material Detail";
    };

    // --- Validate parameters ---
    if (!materialNameParam) { displayError("Material name missing from URL parameters."); return; }
    const materialName = decodeURIComponent(materialNameParam);
    console.log("[Full Detail Loader] Decoded Material Name:", materialName);

    // --- Update Title Bar ---
    if (materialNameEl) { materialNameEl.textContent = materialName; }
    else { console.warn("[Full Detail Loader] Material name element not found."); }
    document.title = `${materialName} - Full Details`;

    // --- Construct file path ---
    // Determine which JSON file to load based on the material name
    let detailFilePath;
    const safeMaterialNameLower = materialName.replace(/ /g, '_').toLowerCase();
    const specificDetailFileName = `${safeMaterialNameLower}_details.json`; // e.g., mercury_cadmium_telluride_details.json

    // Check if a specific file exists (simplistic check, replace with actual existence check if needed)
    // For this example, we *know* which file to use if the name matches.
    if (materialName === "Mercury Cadmium Telluride") {
        detailFilePath = `./${specificDetailFileName}`;
        console.log(`[Full Detail Loader] Using specific detail file: '${detailFilePath}'`);
    } else {
        detailFilePath = `./material_details.json`; // Fallback to the main details file
        console.log(`[Full Detail Loader] Using main details file: '${detailFilePath}'`);
    }
    // *****************************************************************************

    // --- Fetch and Process Data ---
    let allMaterialDetails; // Holds the full JSON content (either the single object or the map)
    let materialData; // Variable to hold the specific material's data object

    try {
        const response = await fetch(detailFilePath);
        console.log(`[Full Detail Loader] Fetch response status for ${detailFilePath}: ${response.status} ${response.statusText}`);
        if (!response.ok) {
             const errorText = await response.text(); console.error(`Fetch failed: ${response.status}.`, errorText);
            if (response.status === 404) { throw new Error(`Details file not found: ${detailFilePath}. Check file name and path.`); }
            else { throw new Error(`HTTP error ${response.status} fetching ${detailFilePath}`); }
        }

        // Parse the JSON content
        const rawJson = await response.json();
        allMaterialDetails = rawJson; // Store the raw JSON content

        // Extract the specific material's data based on which file was loaded
        if (detailFilePath.endsWith('material_details.json')) {
            // Original structure: find the material within the main JSON object
            if (typeof allMaterialDetails !== 'object' || allMaterialDetails === null) throw new Error(`Invalid JSON structure in ${detailFilePath}. Expected top-level object.`);
             materialData = allMaterialDetails[materialName];
             if (!materialData) {
                 // Try case-insensitive fallback
                const lowerCaseMaterialName = materialName.toLowerCase();
                const foundKey = Object.keys(allMaterialDetails).find(key => key.toLowerCase() === lowerCaseMaterialName);
                if (foundKey) {
                     materialData = allMaterialDetails[foundKey];
                     console.warn(`[Full Detail Loader] Case-insensitive match found for "${materialName}" as "${foundKey}" in ${detailFilePath}.`);
                } else {
                    throw new Error(`Data for material '${materialName}' not found inside ${detailFilePath}.`);
                }
             }
        } else {
            // Dedicated file structure: the JSON *is* the material data
             if (typeof allMaterialDetails !== 'object' || allMaterialDetails === null || !allMaterialDetails.materialName) throw new Error(`Invalid JSON structure in dedicated file ${detailFilePath}. Expected object with material details.`);
             materialData = allMaterialDetails; // The whole file content is the data for this material
        }
        // ************************************************

        if (typeof materialData !== 'object' || materialData === null) { throw new Error(`Invalid data structure for material '${materialName}'.`); }
        console.log("[Full Detail Loader] JSON parsed successfully.");

        // Use the materialData directly from now on
        const sectionDataMap = new Map();

        // --- Process References ---
        const collectedRefs = new Set();
        const processRefs = (data) => {
             if (typeof data === 'object' && data !== null) {
                 // Check if the specific material data has a 'references' key
                 if (data.ref && materialData.references && materialData.references[data.ref]) {
                    collectedRefs.add(data.ref);
                 }
                 Object.values(data).forEach(value => { if (typeof value === 'object' || Array.isArray(value)) { processRefs(value); } });
             } else if (Array.isArray(data)) { data.forEach(processRefs); }
        };
        processRefs(materialData); // Process only the specific material's data
        console.log(`[Full Detail Loader] References processed: ${collectedRefs.size}`);

        // --- Build Table of Contents ---
        if (tocListEl && mainContentEl) {
            tocListEl.innerHTML = ''; let sectionCount = 0;
            const excludedKeys = ['materialName', 'references', 'name', 'formula', 'synonyms', 'category', 'constituent_elements', 'description', 'wiki_link', 'tags']; // Exclude top-level metadata keys
            for (const sectionKey in materialData) { // Iterate through the specific material's sections
                if (excludedKeys.includes(sectionKey) || typeof materialData[sectionKey] !== 'object' || materialData[sectionKey] === null) continue;
                const sectionDetailData = materialData[sectionKey]; // Get data for this section

                // Basic check: Ensure the section data is an object and potentially has a displayName
                if (typeof sectionDetailData !== 'object' || sectionDetailData === null) continue;

                sectionDataMap.set(sectionKey, sectionDetailData); sectionCount++;
                const sectionDisplayName = sectionDetailData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const sectionId = `section-${sectionKey}`;
                const tocLi = document.createElement('li'); const tocLink = document.createElement('a');
                tocLink.href = `#${sectionId}`; tocLink.textContent = sectionDisplayName;
                tocLi.appendChild(tocLink); tocListEl.appendChild(tocLi);
            }
             console.log(`[Full Detail Loader] TOC built: ${sectionCount} sections.`);
        } else { console.warn("TOC elements not found."); }

        // --- Populate Sections ---
        let populatedSectionCount = 0;
        for (const [sectionKey, sectionDetailData] of sectionDataMap.entries()) { // Use sectionDetailData now
             const sectionId = `section-${sectionKey}`;
             let sectionElement = document.getElementById(sectionId);

             // *** Dynamically create section if placeholder doesn't exist ***
             if (!sectionElement) {
                 console.warn(`HTML section placeholder '${sectionId}' not found. Creating dynamically.`);
                 sectionElement = document.createElement('section');
                 sectionElement.id = sectionId;
                 sectionElement.className = 'detail-content-section';
                 sectionElement.style.display = 'none'; // Keep hidden initially

                 const h2 = document.createElement('h2');
                 h2.id = `${sectionId}-title`;
                 sectionElement.appendChild(h2);

                 const introP = document.createElement('p');
                 introP.className = 'section-introduction';
                 introP.id = `${sectionId}-intro`;
                 sectionElement.appendChild(introP);

                 const propsDiv = document.createElement('div');
                 propsDiv.className = 'properties-container';
                 propsDiv.id = `${sectionId}-properties`;
                 sectionElement.appendChild(propsDiv);

                 mainContentEl.appendChild(sectionElement); // Add to main content
             }
             // ***********************************************************

             const h2Title = sectionElement.querySelector('h2'); // Find h2 within the section
             if (h2Title) {
                 h2Title.textContent = sectionDetailData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
             } else {
                 console.warn(`Title element (h2) not found within section '${sectionId}'.`);
             }

             const sectionIntroEl = document.getElementById(`${sectionId}-intro`);
             if (sectionIntroEl) {
                 if (sectionDetailData.introduction) {
                     sectionIntroEl.innerHTML = sectionDetailData.introduction; sectionIntroEl.style.display = 'block';
                 } else {
                     sectionIntroEl.style.display = 'none'; sectionIntroEl.innerHTML = '';
                 }
             }

             const propertiesContainerEl = document.getElementById(`${sectionId}-properties`);
             if (propertiesContainerEl && sectionDetailData.properties && typeof sectionDetailData.properties === 'object') {
                 propertiesContainerEl.innerHTML = '';
                 let propertyCount = 0;
                 Object.entries(sectionDetailData.properties).forEach(([propKey, propData]) => {
                     // Pass sectionKey and use materialData
                     const propertyBlockElement = renderPropertyBlock(sectionKey, propKey, propData, materialData, propertiesContainerEl);
                     if (propertyBlockElement) {
                         propertiesContainerEl.appendChild(propertyBlockElement);
                         propertyCount++;
                     }
                 });
                 propertiesContainerEl.style.display = propertyCount > 0 ? 'block' : 'none';
             } else if (propertiesContainerEl) {
                 propertiesContainerEl.style.display = 'none';
             }
             sectionElement.style.display = 'block'; populatedSectionCount++;
        }
         console.log(`[Full Detail Loader] Populated ${populatedSectionCount} sections.`);

        // --- Populate References ---
        if (collectedRefs.size > 0 && referencesListEl && materialData.references) { // Use materialData.references
             referencesListEl.innerHTML = ''; const sortedRefs = Array.from(collectedRefs).sort();
             sortedRefs.forEach(refKey => {
                 const refData = materialData.references[refKey]; // Use materialData.references
                 if(refData){
                     const li = document.createElement('li'); li.id = `ref-${refKey}`;
                     let linkHtml = refData.text;
                     if(refData.doi){ linkHtml += ` <a href="https://doi.org/${refData.doi}" target="_blank" rel="noopener noreferrer">[DOI]</a>`; }
                     li.innerHTML = `<strong>[${refKey}]</strong> ${linkHtml}`; referencesListEl.appendChild(li);
                 } else { console.warn(`Ref key '${refKey}' not defined.`); }
            });
             referencesSectionEl.style.display = 'block';
             // Add event listener to the main content area for delegated reference clicks
             mainContentEl.addEventListener('click', handleRefLinkClick);
             console.log("[Full Detail Loader] References populated.");
        } else if(referencesSectionEl){
            referencesSectionEl.style.display = 'none';
            console.log("[Full Detail Loader] No references to populate or elements missing.");
        }
        console.log("[Full Detail Loader] Data processing complete.");

    } catch (error) {
         console.error("[Full Detail Loader] CRITICAL ERROR in fetch/process:", error);
         displayError(error.message || "Unknown error loading details.");
    }

    // --- Helper Function to Render a Single Property Block ---
    // Modified to accept sectionKey and use materialData for references
    function renderPropertyBlock(sectionKey, propKey, propData, materialData, parentContainer) {
        if (typeof propData !== 'object' || propData === null) return null;
        const propBlock = document.createElement('div'); propBlock.className = 'property-detail-block';
        propBlock.id = `prop-${sectionKey}-${propKey}`; // Unique ID per section/property
        const propTitle = document.createElement('h3'); propTitle.innerHTML = propData.displayName || propKey.replace(/_/g, ' '); propBlock.appendChild(propTitle);
        if (propData.summary) { const summaryEl = document.createElement('div'); summaryEl.className = 'summary'; summaryEl.innerHTML = propData.summary; propBlock.appendChild(summaryEl); }

        // --- Bandgap Plot Integration ---
        if (sectionKey === 'electrical_properties' && propKey === 'band_gap') {
            const equationDetails = propData.details?.equations?.find(eq => eq.name === "Hansen E_g(x,T) Empirical Relation");
            if (equationDetails) {
                const plotControlsId = `bandgap-plot-controls-${sectionKey}-${propKey}`;
                const plotContainerId = `bandgap-plot-container-${sectionKey}-${propKey}`;
                const sliderId = `temp-slider-${sectionKey}-${propKey}`;
                const valueId = `temp-value-${sectionKey}-${propKey}`;

                const plotWrapper = document.createElement('div');
                plotWrapper.className = 'bandgap-plot-wrapper';

                const plotDiv = document.createElement('div');
                plotDiv.id = plotContainerId;
                plotDiv.className = 'bandgap-plot-container';
                plotDiv.innerHTML = `<p style="text-align:center; padding: 20px; color: #888;">Loading Bandgap Plot...</p>`;
                plotWrapper.appendChild(plotDiv);

                const controlsDiv = document.createElement('div');
                controlsDiv.id = plotControlsId;
                controlsDiv.className = 'plot-controls';
                controlsDiv.innerHTML = `
                    <label for="${sliderId}">Temperature:</label>
                    <input type="range" id="${sliderId}" min="4" max="300" step="1" value="77">
                    <span id="${valueId}" class="temp-value-display">77 K</span>
                `;
                plotWrapper.appendChild(controlsDiv);
                propBlock.appendChild(plotWrapper);

                requestAnimationFrame(() => {
                    if (typeof initializeBandgapPlot === 'function') {
                        try {
                            initializeBandgapPlot(plotContainerId, sliderId, valueId, equationDetails);
                        } catch(plotError) {
                             console.error(`Error initializing Bandgap Plot for ${plotContainerId}:`, plotError);
                             const targetPlotDiv = document.getElementById(plotContainerId);
                             if (targetPlotDiv) targetPlotDiv.innerHTML = `<p class="error-message">Error initializing plot: ${plotError.message}</p>`;
                        }
                    } else {
                        console.error("Plot initialization function 'initializeBandgapPlot' not found.");
                         const targetPlotDiv = document.getElementById(plotContainerId);
                         if (targetPlotDiv) targetPlotDiv.innerHTML = '<p class="error-message">Plotting function missing.</p>';
                    }
                });
            } else {
                 console.warn(`[renderPropertyBlock] Hansen equation data not found for ${sectionKey}.${propKey}, skipping plot.`);
            }
        }
        // --- End Bandgap Plot Integration ---


        // --- Visualization Integration (Calling THREE.JS viewer) ---
        if (propKey === 'crystal_structure' && propData.details && propData.details.visualization_data) {
            const vizData = propData.details.visualization_data;
             if (!vizData || typeof vizData !== 'object' || !vizData.atom_info || !vizData.composition || !vizData.lattice_constants) {
                 console.error(`[renderPropertyBlock] Invalid viz_data for '${propKey}'. Missing fields needed for Three.js viewer.`);
                 const errorDiv = document.createElement('div'); errorDiv.className = 'error-message'; errorDiv.textContent = 'Error: Visualization data is invalid or incomplete.'; propBlock.appendChild(errorDiv);
             } else {
                const viewerContainerId = vizData.container_id || `viewer-container-${propKey}-${Date.now()}`;
                const viewerWrapper = document.createElement('div'); viewerWrapper.className = 'crystal-viewer-wrapper';
                const viewerHeight = vizData.viewer_height || '450px'; viewerWrapper.style.setProperty('--viewer-height', viewerHeight);
                const viewerAreaId = `${viewerContainerId}-viewer`;
                const controlsAreaId = `${viewerContainerId}-controls`;
                viewerWrapper.innerHTML = `
                    <div id="${viewerContainerId}" class="crystal-viewer-container">
                        <div id="${viewerAreaId}" class="viewer-area"><p style="padding:20px; color:#888; text-align:center;">Loading 3D Viewer...</p></div>
                        <div id="${controlsAreaId}" class="viewer-controls"><p style="padding:10px; color:#888;">Loading Controls...</p></div>
                    </div>`;
                propBlock.appendChild(viewerWrapper);

                requestAnimationFrame(() => {
                     let missingLibs = [];
                     if (typeof THREE === 'undefined') missingLibs.push("THREE (core)");
                     if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls === 'undefined') missingLibs.push("OrbitControls.js");
                     if (typeof THREE !== 'undefined' && (typeof THREE.CSS2DRenderer === 'undefined' || typeof THREE.CSS2DObject === 'undefined')) missingLibs.push("CSS2DRenderer.js / CSS2DObject.js");

                     if (missingLibs.length > 0) {
                        console.error("Three.js components missing:", missingLibs.join(', '));
                        const targetViewerEl = document.getElementById(viewerAreaId);
                        if(targetViewerEl) targetViewerEl.innerHTML = `<p class="error-message" style="padding: 20px;">Error: Required Three.js components (${missingLibs.join(', ')}) failed to load. Check script inclusion and order.</p>`;
                        const targetControlsEl = document.getElementById(controlsAreaId);
                        if(targetControlsEl) targetControlsEl.innerHTML = '';
                        return;
                     }

                     if (typeof initializeSimplifiedThreeJsViewer === 'function') {
                        try {
                            const targetViewerEl = document.getElementById(viewerAreaId);
                            const targetControlsEl = document.getElementById(controlsAreaId);
                            if(targetViewerEl && targetControlsEl) {
                                console.log(`[renderPropertyBlock] Initializing Three.js viewer for ${viewerAreaId}`);
                                // Pass the specific materialData object
                                initializeSimplifiedThreeJsViewer(viewerAreaId, controlsAreaId, vizData, materialData);
                            } else {
                                console.error(`Target elements for Three.js viewer ${viewerContainerId} not found (Viewer: ${!!targetViewerEl}, Controls: ${!!targetControlsEl}).`);
                                if(targetViewerEl) targetViewerEl.innerHTML = '<p class="error-message">Error: Could not find viewer sub-element.</p>';
                            }
                        } catch(e) {
                            console.error(`Error initializing Three.js viewer for ${viewerAreaId}:`, e);
                            const targetViewerEl = document.getElementById(viewerAreaId);
                            if(targetViewerEl) targetViewerEl.innerHTML = `<p class="error-message">Error initializing 3D viewer: ${e.message}. Check console.</p>`;
                        }
                     } else {
                         console.error("Viewer initialization function 'initializeSimplifiedThreeJsViewer' not found!");
                         const targetViewerEl = document.getElementById(viewerAreaId);
                         if(targetViewerEl) targetViewerEl.innerHTML = '<p class="error-message">Error: Viewer initialization code not found.</p>';
                     }
                });
             }
        } // --- End Visualization Integration ---

        // --- Process other details subsections ---
        if (propData.details && typeof propData.details === 'object') {
            for (const [detailKey, detailContent] of Object.entries(propData.details)) {
                 if (detailKey === 'visualization_data') continue; // Already handled above
                 if (!detailContent || (Array.isArray(detailContent) && detailContent.length === 0) || (typeof detailContent === 'object' && !Array.isArray(detailContent) && Object.keys(detailContent).length === 0)) continue;

                 // Skip rendering 'equations' if the bandgap plot exists for this specific property block
                 if (sectionKey === 'electrical_properties' && propKey === 'band_gap' && detailKey === 'equations' && propBlock.querySelector('.bandgap-plot-container')) {
                     console.log(`[renderPropertyBlock] Skipping redundant equation block render for ${sectionKey}.${propKey} as plot exists.`);
                     continue;
                 }

                 const subsection = document.createElement('div');
                 subsection.className = `detail-subsection ${detailKey.replace(/ /g, '_').toLowerCase()}`;

                 const subsectionTitle = document.createElement('h4');
                 const titleText = detailKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                 subsectionTitle.setAttribute('data-title', titleText); // Use data-title for styling
                 // Add h4 only if content isn't just a string OR it's the 'equations' section
                 if (typeof detailContent !== 'string' || detailKey === 'equations') {
                    subsection.appendChild(subsectionTitle);
                 }

                 // Render different detail types
                 if (Array.isArray(detailContent) && detailKey !== 'equations' && detailKey !== 'measurement_characterization') {
                     const ul = document.createElement('ul');
                     detailContent.forEach(item => {
                        if (item === null || item === undefined) return;
                        const li = document.createElement('li');
                        li.innerHTML = typeof item === 'string' ? item : JSON.stringify(item);
                        ul.appendChild(li);
                     });
                     if (ul.children.length > 0) subsection.appendChild(ul);
                 }
                 else if (detailKey === 'equations' && Array.isArray(detailContent)) {
                     let equationsAdded = 0;
                     detailContent.forEach(eq => {
                        if (typeof eq !== 'object' || eq === null) return;
                        const eqBlock = document.createElement('div'); eqBlock.className = 'equation-block';
                        let blockHasContent = false;
                        if (eq.name) { const nameEl = document.createElement('span'); nameEl.className = 'eq-name'; nameEl.textContent = eq.name; eqBlock.appendChild(nameEl); blockHasContent = true; }
                        if (eq.description) { const descEl = document.createElement('p'); descEl.className = 'eq-desc'; descEl.innerHTML = eq.description; eqBlock.appendChild(descEl); blockHasContent = true; }
                        const formulaContainer = document.createElement('div'); formulaContainer.className = 'eq-formula-container';
                        if (eq.formula_html) { formulaContainer.innerHTML = eq.formula_html; formulaContainer.classList.add('eq-formula-html'); blockHasContent = true; }
                        else if (eq.formula_plain) { formulaContainer.textContent = eq.formula_plain; formulaContainer.classList.add('eq-formula-plain'); blockHasContent = true; }
                        else { formulaContainer.textContent = "[Formula not available]"; formulaContainer.style.cssText = 'font-style: italic; color: #888;'; }
                        eqBlock.appendChild(formulaContainer);
                        if(eq.units){ const unitsEl = document.createElement('div'); unitsEl.className = 'eq-units'; unitsEl.innerHTML = `Units: ${eq.units}`; eqBlock.appendChild(unitsEl); blockHasContent = true; }
                        if (eq.variables && Array.isArray(eq.variables) && eq.variables.length > 0) { const varsDiv = document.createElement('div'); varsDiv.className = 'eq-vars'; varsDiv.innerHTML = '<strong>Variables:</strong>'; const varsUl = document.createElement('ul'); eq.variables.forEach(v => { if (typeof v === 'object' && v !== null && v.symbol && v.description) { const li = document.createElement('li'); li.innerHTML = `<strong>${v.symbol}:</strong> ${v.description}`; varsUl.appendChild(li); } }); if (varsUl.children.length > 0) { varsDiv.appendChild(varsUl); eqBlock.appendChild(varsDiv); blockHasContent = true; } }
                        // Reference check using materialData
                        if (eq.ref && materialData.references && materialData.references[eq.ref]) {
                            const refEl = document.createElement('div'); refEl.className = 'eq-ref'; refEl.innerHTML = `Ref: <a href="#ref-${eq.ref}" class="ref-link" data-ref-key="${eq.ref}">[${eq.ref}]</a>`; eqBlock.appendChild(refEl); blockHasContent = true;
                        }
                        if (blockHasContent) {
                             subsection.appendChild(eqBlock);
                             equationsAdded++;
                         }
                     });
                     if (equationsAdded === 0) subsection.innerHTML = ''; // Clear if no equations were actually added
                 }
                 else if (detailKey === 'measurement_characterization' && typeof detailContent === 'object') {
                     let mcContentAdded = false;
                     if(detailContent.techniques && Array.isArray(detailContent.techniques) && detailContent.techniques.length > 0){ const techDiv = document.createElement('div'); techDiv.className = "techniques"; const ulTech = document.createElement('ul'); detailContent.techniques.forEach(tech => { const li = document.createElement('li'); li.innerHTML = tech; ulTech.appendChild(li); }); techDiv.appendChild(ulTech); subsection.appendChild(techDiv); mcContentAdded = true;}
                     if(detailContent.considerations && Array.isArray(detailContent.considerations) && detailContent.considerations.length > 0){ const considDiv = document.createElement('div'); considDiv.className = "considerations"; if (mcContentAdded) { const considTitle = document.createElement('p'); considTitle.innerHTML = '<strong>Considerations:</strong>'; considTitle.style.cssText = 'margin-top: 1rem; margin-bottom: 0.25rem; font-weight: bold;'; considDiv.appendChild(considTitle); } const ulConsid = document.createElement('ul'); detailContent.considerations.forEach(note => { const li = document.createElement('li'); li.innerHTML = note; ulConsid.appendChild(li); }); considDiv.appendChild(ulConsid); subsection.appendChild(considDiv); mcContentAdded = true; }
                     if (!mcContentAdded) subsection.innerHTML = '';
                 }
                 else if (typeof detailContent === 'string') {
                     const p = document.createElement('p'); p.innerHTML = detailContent;
                     subsection.appendChild(p);
                 }
                 else { // Fallback for unexpected structures
                    console.warn(`Unhandled detail structure for key '${detailKey}' in ${sectionKey}.${propKey}. Displaying JSON.`);
                    const pre = document.createElement('pre'); pre.textContent = JSON.stringify(detailContent, null, 2);
                    pre.style.cssText = 'font-size: 0.8em; background-color: #f0f0f0; padding: 8px; border: 1px solid #ccc; border-radius: 4px; overflow-x: auto; margin-top: 0.5rem;';
                    subsection.appendChild(pre);
                 }

                 // Add subsection only if it has rendered content
                 if(subsection.children.length > (subsection.querySelector('h4') ? 1 : 0)) { // Check if more than just the H4 exists
                    propBlock.appendChild(subsection);
                 }
            }
        }
        return propBlock;
    } // --- End renderPropertyBlock ---

    // --- Function to handle reference link clicks ---
    function handleRefLinkClick(event) {
        const link = event.target.closest('a.ref-link[data-ref-key]');
        if (link) {
            event.preventDefault(); // Prevent default anchor jump behavior
            const targetId = `ref-${link.dataset.refKey}`;
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                // Highlight logic
                document.querySelectorAll('#references-list li.highlight-ref').forEach(el => el.classList.remove('highlight-ref'));
                targetElement.classList.add('highlight-ref');
                // Optionally remove highlight after a delay
                setTimeout(() => targetElement.classList.remove('highlight-ref'), 2500);

                // Smooth scroll logic (adjusted for better centering)
                const elementRect = targetElement.getBoundingClientRect();
                const absoluteElementTop = elementRect.top + window.pageYOffset;
                // Estimate fixed header height (adjust if necessary or get dynamically)
                const headerOffset = 60;
                const middleOfViewport = window.innerHeight / 2;
                // Calculate scroll position to center the element, accounting for header
                const scrollPosition = absoluteElementTop - middleOfViewport + (targetElement.offsetHeight / 2) - headerOffset;

                window.scrollTo({
                    top: Math.max(0, scrollPosition), // Ensure not scrolling above top
                    behavior: 'smooth'
                });

            } else {
                console.warn(`Reference target element with ID '${targetId}' not found.`);
            }
        }
     } // --- End handleRefLinkClick ---


    // --- ================================================================= ---
    // ---      *** SIMPLIFIED Three.js Initializer START (FIXED v3) ***      ---
    // ---     (No changes needed here for the plot feature, only ensure    ---
    // ---      materialData is passed and used correctly)                ---
    // --- ================================================================= ---
    function initializeSimplifiedThreeJsViewer(viewerElementId, controlsElementId, vizData, materialData) { // Changed last parameter name
        console.log(`--- [Three.js Simplified Init v3] Initializing Viewer for ${viewerElementId} ---`);

        const viewerContainer = document.getElementById(viewerElementId);
        const controlsContainer = document.getElementById(controlsElementId);

        if (!viewerContainer || !controlsContainer) { console.error("[Three.js Simplified Error] Viewer or controls element not found!"); return; }

        // --- WebGL Support Check ---
        try {
            const canvas = document.createElement('canvas');
            if (!window.WebGLRenderingContext || !(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))) {
                throw new Error('WebGL is not supported by your browser.');
            }
        } catch (e) {
            console.error("[Three.js Error] WebGL check failed:", e.message);
            viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Error: WebGL is required but not available.</p>`;
            controlsContainer.innerHTML = '';
            return;
        }
        console.log("[Three.js Init] WebGL check passed.");

        // --- Scope variables ---
        let scene, camera, renderer, css2DRenderer, controls;
        let crystalModelGroup = new THREE.Group(); // Group for atoms, bonds, outline - this gets centered
        let unitCellOutline = null; // The Three.js LineSegments object for the outline
        let unitCellOutlineGeometry = null; // Reusable geometry for the outline edges
        let isSpinning = false;
        let showLabels = true; // Default label visibility
        let showOutline = true; // Default outline visibility
        let cdConcentration = vizData.composition?.initial_x ?? 0.5;
        let currentSupercellDims = { nx: 1, ny: 1, nz: 1 }; // Default state, updated in init/UI
        const spinSpeed = 0.005;
        let animationFrameId = null;
        let currentViewStyle = 'ballAndStick'; // Default view style

        // --- Constants & Config ---
        const atomInfo = vizData.atom_info || {};
        const latticeConstantsSource = vizData.lattice_constants || {};
        let lattice_a = 6.47; // Default, will be calculated

        const sphereScales = { spacefill: 0.55, ballAndStick: 0.28, stick: 0.1 };
        const stickRadius = 0.05;
        const labelOffset = 0.3;
        const sphereDetail = 12;
        const stickDetail = 6;
        const fallbackBondCutoffFactor = 0.45;

        // --- Materials ---
        const materials = {};
        const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.4, roughness: 0.6 });
        Object.entries(atomInfo).forEach(([symbol, info]) => {
            materials[symbol.toUpperCase()] = new THREE.MeshStandardMaterial({
                color: info?.color || '#cccccc',
                metalness: info?.metalness ?? 0.4,
                roughness: info?.roughness ?? 0.6
            });
        });
        const bondMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.1, roughness: 0.8 });
        const unitCellMaterial = new THREE.LineBasicMaterial({ color: 0x3333ff, linewidth: 1.5 });

        // --- Reusable Geometries ---
        const sphereGeometries = {};
        const stickGeometry = new THREE.CylinderGeometry(stickRadius, stickRadius, 1, stickDetail, 1);

        // --- Helper: Dispose Meshes and Labels ---
        function disposeMeshes(group) {
             if (!group) return;
             const children_to_remove = [...group.children];
             children_to_remove.forEach(object => {
                 // Don't remove the persistent unit cell outline here, handled separately
                 if (object === unitCellOutline) return;
                 if (object.isMesh || object.isLineSegments) {
                     if (object.geometry && object.geometry !== stickGeometry) { object.geometry.dispose(); }
                 } else if (object.isCSS2DObject) {
                     if (object.element && object.element.parentNode) { object.element.parentNode.removeChild(object.element); }
                     object.element = null;
                 }
                 group.remove(object);
             });
         }

        // --- Initialize Scene ---
        function init() {
            try {
                if (viewerContainer.clientWidth === 0 || viewerContainer.clientHeight === 0) {
                     animationFrameId = requestAnimationFrame(init); return; // Retry if hidden
                }
                console.log(`[Three.js Init] Container: ${viewerContainer.clientWidth}x${viewerContainer.clientHeight}`);
                while (viewerContainer.firstChild) { viewerContainer.removeChild(viewerContainer.firstChild); }

                scene = new THREE.Scene();
                scene.background = new THREE.Color(vizData.background_color || 0xddeeff);

                const width = viewerContainer.clientWidth; const height = viewerContainer.clientHeight;
                camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
                calculateLatticeConstant(cdConcentration); // Uses atomInfo from vizData

                // Set initial supercell from vizData options or default to 1
                const initialSizeOption = vizData.supercell_options && Array.isArray(vizData.supercell_options) ? vizData.supercell_options[0] : 1;
                currentSupercellDims = { nx: initialSizeOption, ny: initialSizeOption, nz: initialSizeOption };
                console.log("[Three.js Init] Initial supercell size:", currentSupercellDims);


                // Initial camera positioning based on initial supercell size
                const initialModelSize = lattice_a * Math.max(currentSupercellDims.nx, currentSupercellDims.ny, currentSupercellDims.nz);
                const initialDist = initialModelSize * 1.8;
                camera.position.set(initialDist * 0.7, initialDist * 0.5, initialDist);
                camera.lookAt(0, 0, 0);

                renderer = new THREE.WebGLRenderer({ antialias: true });
                renderer.setSize(width, height); renderer.setPixelRatio(window.devicePixelRatio);
                viewerContainer.appendChild(renderer.domElement);

                const css2dContainer = document.createElement('div');
                css2dContainer.style.position = 'absolute'; css2dContainer.style.top = '0'; css2dContainer.style.left = '0';
                css2dContainer.style.width = '100%'; css2dContainer.style.height = '100%';
                css2dContainer.style.pointerEvents = 'none'; css2dContainer.style.overflow = 'hidden';
                viewerContainer.appendChild(css2dContainer);

                css2DRenderer = new THREE.CSS2DRenderer(); css2DRenderer.setSize(width, height);
                // *** Append CSS2DRenderer to its dedicated overlay container ***
                css2dContainer.appendChild(css2DRenderer.domElement);
                css2DRenderer.domElement.classList.add('css2d-renderer-overlay'); // Add class for potential styling/debugging

                controls = new THREE.OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true; controls.dampingFactor = 0.1;
                controls.minDistance = lattice_a * 0.5;
                controls.maxDistance = initialModelSize * 5; // Initial max distance

                const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); scene.add(ambientLight);
                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); directionalLight.position.set(5, 10, 7.5); scene.add(directionalLight);

                scene.add(crystalModelGroup); // Add the main group that gets centered

                createUnitCellOutlineGeometry(); // Create reusable outline geometry/material

                // Build the initial model (atoms, bonds, labels) and position the outline
                updateCrystalModel(); // This will now handle initial outline visibility based on showOutline

                window.removeEventListener('resize', onWindowResize); window.addEventListener('resize', onWindowResize);
                console.log("[Three.js Simplified] Init function complete.");
             } catch(initError) {
                 console.error("[Three.js Error] Error during init:", initError);
                 viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Error setting up scene: ${initError.message}</p>`;
                 cleanup();
             }
        }

        // --- Calculate Lattice Constant ---
        function calculateLatticeConstant(currentConcentration) {
             const atomInfo = vizData?.atom_info; // Get atomInfo from vizData
             if (!atomInfo) { console.error("AtomInfo missing in vizData for lattice calculation."); lattice_a = 6.5; return; }

            let calculated_a = 0;
            if (vizData.composition.min_x !== vizData.composition.max_x && latticeConstantsSource && Object.keys(latticeConstantsSource).length >= 2) {
                 const cation_host_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'cation_host');
                 const cation_subst_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'cation_subst');
                 if (!cation_host_symbol || !cation_subst_symbol) {
                     console.warn("Cannot calculate alloy lattice constant: host/subst roles missing in atomInfo.");
                     const values = Object.values(latticeConstantsSource).filter(v => typeof v === 'number');
                     calculated_a = values.length > 0 ? values.reduce((a,b) => a+b, 0) / values.length : 6.5;
                     console.warn(`Falling back to lattice_a = ${calculated_a}`);
                 } else { /* ... Vegard's law calculation ... */
                    const a_host = Number(latticeConstantsSource[cation_host_symbol]);
                    const a_subst = Number(latticeConstantsSource[cation_subst_symbol]);
                    const ratio = Number(currentConcentration);
                    if (isNaN(a_host) || isNaN(a_subst) || isNaN(ratio)) {
                        console.warn("Invalid values for Vegard's law calculation.", {a_host, a_subst, ratio}); calculated_a = 6.5;
                    } else { calculated_a = a_host * (1 - ratio) + a_subst * ratio; }
                 }
            } else { calculated_a = Number(latticeConstantsSource?.a) || Number(Object.values(latticeConstantsSource)[0]) || 6.5; }
            if (!isNaN(calculated_a) && calculated_a > 0) { lattice_a = calculated_a; }
            else { console.error(`Invalid calculated lattice constant: ${calculated_a}. Using previous value: ${lattice_a}`); }
        }

        // --- Generate Atom Positions (Centered) ---
        function generateCrystalData(nx, ny, nz, currentCdConcentration) {
             const atoms = [];
             calculateLatticeConstant(currentCdConcentration); // Ensure lattice_a is up-to-date

             const atomInfo = vizData?.atom_info; // Get atomInfo from vizData
             if (!atomInfo) { console.error("AtomInfo missing in vizData for atom generation."); return { atoms: [], centerOffset: new THREE.Vector3() }; }

             const cation_host_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'cation_host');
             const cation_subst_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'cation_subst');
             const anion_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'anion');
             if (!anion_symbol || (vizData.composition.min_x !== vizData.composition.max_x && (!cation_host_symbol || !cation_subst_symbol))) {
                 console.error("Atom roles missing for data generation.");
                 return { atoms: [], centerOffset: new THREE.Vector3() }; // Return empty structure
             }

             const supercellCenter = new THREE.Vector3(
                  (nx * lattice_a) / 2.0 - lattice_a / 2.0,
                  (ny * lattice_a) / 2.0 - lattice_a / 2.0,
                  (nz * lattice_a) / 2.0 - lattice_a / 2.0
             );

             const baseAnionPos = [ [0.00, 0.00, 0.00], [0.00, 0.50, 0.50], [0.50, 0.00, 0.50], [0.50, 0.50, 0.00] ];
             const baseCationPos = [ [0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25] ];

             for (let i = 0; i < nx; i++) { for (let j = 0; j < ny; j++) { for (let k = 0; k < nz; k++) {
                 const cellOrigin = new THREE.Vector3(i * lattice_a, j * lattice_a, k * lattice_a);
                 // Add anions
                 baseAnionPos.forEach(pos => {
                     const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2]).multiplyScalar(lattice_a).add(cellOrigin).sub(supercellCenter);
                     if (!isNaN(atomPos.x)) atoms.push({ element: anion_symbol.toUpperCase(), position: atomPos });
                 });
                 // Add cations
                 baseCationPos.forEach(pos => {
                     let element;
                     if (vizData.composition.min_x !== vizData.composition.max_x) { element = Math.random() < currentCdConcentration ? cation_subst_symbol : cation_host_symbol; }
                     else { element = cation_subst_symbol || cation_host_symbol; }
                     const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2]).multiplyScalar(lattice_a).add(cellOrigin).sub(supercellCenter);
                     if (!isNaN(atomPos.x)) atoms.push({ element: element.toUpperCase(), position: atomPos });
                 });
             }}}
             console.log(`[Three.js] Generated ${atoms.length} atoms for ${nx}x${ny}x${nz} centered supercell.`);
             return { atoms: atoms, centerOffset: supercellCenter }; // Return atoms and offset
         }


        // --- Create CSS2D Label Object ---
        function createCSS2DLabel(text) {
            const div = document.createElement('div'); div.className = 'atom-label'; div.textContent = text;
            const label = new THREE.CSS2DObject(div); label.layers.set(0); return label;
        }

        // --- Create/Update Ball and Stick Model ---
        function createOrUpdateBallAndStickModel(atomData) {
             console.log("[Three.js updateModel] Rebuilding model...");
             disposeMeshes(crystalModelGroup); // Clear existing objects first (except outline)

             if (!atomData || atomData.length === 0) { console.warn("[Three.js updateModel] No atom data provided."); return; }

             const atomInfo = vizData?.atom_info; // Get atomInfo from vizData
             if (!atomInfo) { console.error("AtomInfo missing in vizData for model creation."); return; }

             const currentSphereScale = sphereScales[currentViewStyle] || sphereScales.ballAndStick;
             const jsonBondCutoff = Number(vizData.bond_cutoff);
             const bondCutoff = (!isNaN(jsonBondCutoff) && jsonBondCutoff > 0) ? jsonBondCutoff : (lattice_a * fallbackBondCutoffFactor);
             const bondCutoffSq = bondCutoff * bondCutoff;
             if (isNaN(bondCutoffSq) || bondCutoffSq <= 0) { console.warn(`Invalid bondCutoffSq: ${bondCutoffSq}`); }
             else { console.log(`Using bond cutoff: ${bondCutoff.toFixed(3)}`); }
             const yAxis = new THREE.Vector3(0, 1, 0);

             // --- Create Sphere Geometries ---
             Object.values(sphereGeometries).forEach(geom => { if(geom) geom.dispose(); });
             for (const key in sphereGeometries) delete sphereGeometries[key];
             Object.keys(atomInfo).forEach(symbol => {
                 const upperSymbol = symbol.toUpperCase(); const baseRadius = atomInfo[symbol]?.radius ?? 1.0;
                 let radius = baseRadius * currentSphereScale; radius = Math.max(radius, 0.01);
                 try { if (currentSphereScale > 0) { sphereGeometries[upperSymbol] = new THREE.SphereGeometry(radius, sphereDetail, sphereDetail); } else { sphereGeometries[upperSymbol] = null; } }
                 catch(e) { console.error(`Error creating sphere geom for ${upperSymbol}: ${e.message}`); sphereGeometries[upperSymbol] = null; }
             });

             // --- Add Spheres & Labels ---
             let spheresAdded = 0, labelsAdded = 0;
             atomData.forEach((atom) => {
                 const symbol = atom.element.toUpperCase(); const geometry = sphereGeometries[symbol]; const material = materials[symbol] || defaultMaterial;
                 if (geometry && material && atom.position && !isNaN(atom.position.x)) {
                     const sphere = new THREE.Mesh(geometry, material); sphere.position.copy(atom.position); crystalModelGroup.add(sphere); spheresAdded++;
                 }
                 if (showLabels && atom.position && !isNaN(atom.position.x)) {
                     const label = createCSS2DLabel(atom.element); label.position.copy(atom.position); label.position.y += labelOffset; crystalModelGroup.add(label); labelsAdded++;
                 }
             });
             console.log(`[Three.js updateModel] Added ${spheresAdded} spheres, ${labelsAdded} labels.`);

             // --- Add Sticks (Bonds) ---
             let bondsAdded = 0;
             if ((currentViewStyle === 'stick' || currentViewStyle === 'ballAndStick') && bondCutoffSq > 0) {
                 for (let i = 0; i < atomData.length; i++) { for (let j = i + 1; j < atomData.length; j++) {
                     const atom1 = atomData[i]; const atom2 = atomData[j];
                     if (!atom1?.position || !atom2?.position || isNaN(atom1.position.x) || isNaN(atom2.position.x)) continue;
                     const distSq = atom1.position.distanceToSquared(atom2.position);
                     if (distSq > 1e-6 && distSq < bondCutoffSq) {
                          const role1 = atomInfo[atom1.element]?.role ?? 'unknown'; const role2 = atomInfo[atom2.element]?.role ?? 'unknown';
                          const isCation1 = role1.includes('cation'); const isAnion1 = role1 === 'anion';
                          const isCation2 = role2.includes('cation'); const isAnion2 = role2 === 'anion';
                          if (!((isCation1 && isAnion2) || (isAnion1 && isCation2))) { continue; }
                          const distance = Math.sqrt(distSq); if (isNaN(distance) || distance <= 1e-3) continue;
                          const stickMesh = new THREE.Mesh(stickGeometry, bondMaterial);
                          stickMesh.position.copy(atom1.position).add(atom2.position).multiplyScalar(0.5);
                          const direction = new THREE.Vector3().subVectors(atom2.position, atom1.position).normalize();
                          const quaternion = new THREE.Quaternion();
                          if (Math.abs(direction.dot(yAxis)) < 1.0 - 1e-6) { quaternion.setFromUnitVectors(yAxis, direction); }
                          else if (direction.y < 0) { quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI); }
                          stickMesh.quaternion.copy(quaternion); stickMesh.scale.set(1, distance, 1);
                          crystalModelGroup.add(stickMesh); bondsAdded++;
                     }
                 }}
                 console.log(`[Three.js updateModel] Added ${bondsAdded} bonds.`);
             } else { console.log(`Skipping bond generation`); }
             console.log(`[Three.js updateModel] Rebuilt model. Total children: ${crystalModelGroup.children.length}`);
        }


        // --- Create Unit Cell Outline Geometry (Called Once) ---
        function createUnitCellOutlineGeometry() {
            const singleUnitCellGeo = new THREE.BoxGeometry(1, 1, 1);
            unitCellOutlineGeometry = new THREE.EdgesGeometry(singleUnitCellGeo); // Store reusable edges geometry
            singleUnitCellGeo.dispose();
            console.log("[Three.js Simplified] Created Unit Cell Outline Geometry");
        }

        // --- Create or Update Unit Cell Outline Object ---
        function createOrUpdateUnitCellOutlineObject(supercellCenterOffset) { // Takes the calculated center offset
             if (unitCellOutline && unitCellOutline.parent) {
                 crystalModelGroup.remove(unitCellOutline);
             }
             if (!unitCellOutlineGeometry) { console.error("Unit cell outline geometry not created!"); return; }
             if (!supercellCenterOffset) { console.warn("Supercell center offset not provided for outline positioning."); return;}

             unitCellOutline = new THREE.LineSegments(unitCellOutlineGeometry, unitCellMaterial);
             const firstCellOriginInGroup = new THREE.Vector3(0, 0, 0).sub(supercellCenterOffset);
             unitCellOutline.position.copy(firstCellOriginInGroup);
             unitCellOutline.scale.set(lattice_a, lattice_a, lattice_a);
             unitCellOutline.visible = showOutline;
             crystalModelGroup.add(unitCellOutline); // Add to the main group
             console.log(`[Three.js Simplified] Unit Cell Outline ${unitCellOutline.visible ? 'shown' : 'hidden'} at position ${unitCellOutline.position.x.toFixed(2)},${unitCellOutline.position.y.toFixed(2)},${unitCellOutline.position.z.toFixed(2)}`);
         }


        // --- Update Crystal Model (Wrapper) ---
        function updateCrystalModel() {
            console.log("[Three.js updateCrystalModel] Generating atom data...");
            const generationResult = generateCrystalData(currentSupercellDims.nx, currentSupercellDims.ny, currentSupercellDims.nz, cdConcentration);
            if (!generationResult || !generationResult.atoms) { console.error("Failed atom data generation."); return; }
            const atomData = generationResult.atoms;
            const centerOffset = generationResult.centerOffset; // Get the offset used for centering

            console.log("[Three.js updateCrystalModel] Rebuilding meshes and labels...");
            createOrUpdateBallAndStickModel(atomData);

            console.log("[Three.js updateCrystalModel] Updating unit cell outline...");
            createOrUpdateUnitCellOutlineObject(centerOffset); // Pass the center offset

            // Update camera limits
            if (controls) {
                const modelSize = lattice_a * Math.max(currentSupercellDims.nx, currentSupercellDims.ny, currentSupercellDims.nz);
                controls.minDistance = lattice_a * 0.5;
                controls.maxDistance = modelSize * 5;
                controls.update();
            }
            console.log("[Three.js updateCrystalModel] Model update wrapper complete.");
        }


        // --- UI Setup ---
        function setupUI() {
             controlsContainer.innerHTML = ''; // Clear previous controls
             const controlsWrapper = document.createElement('div');
             // Unique IDs
             const sliderId = `${controlsElementId}-cdSlider`;
             const valueId = `${controlsElementId}-cdValue`;
             const spinBtnId = `${controlsElementId}-spinButton`;
             const labelBtnId = `${controlsElementId}-labelToggleButton`;
             const styleSelectId = `${controlsElementId}-styleSelect`;
             const supercellSelectId = `${controlsElementId}-supercellSelect`;
             const outlineBtnId = `${controlsElementId}-outlineToggleButton`;
             const legendListId = `${controlsElementId}-legendList`;

             const showCompositionSlider = vizData.composition.min_x !== vizData.composition.max_x;
             const supercellOptions = vizData.supercell_options || [1];

             controlsWrapper.innerHTML = `
                 <h4>${materialData.materialName || 'Material'} Controls</h4>

                 ${showCompositionSlider ? `
                 <div class="control-group">
                     <label for="${sliderId}">Concentration (x): <span id="${valueId}">${cdConcentration.toFixed(2)}</span></label>
                     <input type="range" id="${sliderId}" min="${vizData.composition.min_x}" max="${vizData.composition.max_x}" step="${vizData.composition.step_x || 0.01}" value="${cdConcentration}" class="slider">
                 </div>
                 ` : `<div class="control-group"><p>Composition: Fixed</p></div>`}

                 <div class="control-group">
                     <label for="${styleSelectId}">View Style:</label>
                     <select id="${styleSelectId}">
                         <option value="ballAndStick" ${currentViewStyle === 'ballAndStick' ? 'selected' : ''}>Ball & Stick</option>
                         <option value="spacefill" ${currentViewStyle === 'spacefill' ? 'selected' : ''}>Spacefill</option>
                         <option value="stick" ${currentViewStyle === 'stick' ? 'selected' : ''}>Stick</option>
                     </select>
                 </div>

                 <div class="control-group">
                     <label for="${supercellSelectId}">Supercell:</label>
                     <select id="${supercellSelectId}">
                        ${supercellOptions.map(size => `<option value="${size}" ${size === currentSupercellDims.nx ? 'selected': ''}>${size}x${size}x${size}</option>`).join('')}
                     </select>
                 </div>

                 <div class="control-group action-buttons">
                    <button id="${labelBtnId}">${showLabels ? 'Hide' : 'Show'} Labels</button>
                    <button id="${outlineBtnId}">${showOutline ? 'Hide' : 'Show'} Outline</button>
                    <button id="${spinBtnId}">${isSpinning ? 'Stop Spin' : 'Start Spin'}</button>
                 </div>

                 <div class="control-group">
                     <p style="font-weight: bold; margin-bottom: 5px;">Legend:</p>
                     <ul id="${legendListId}" style="padding-left: 0; list-style: none; font-size: 0.9em;"></ul>
                 </div>

                 <p style="font-size: 12px; margin-top: 15px; color: #555;">Drag to rotate, Scroll to zoom.</p>
             `;
             controlsContainer.appendChild(controlsWrapper);

             // --- Add Listeners ---
             const slider = document.getElementById(sliderId);
             const valueSpan = document.getElementById(valueId);
             const spinButton = document.getElementById(spinBtnId);
             const labelButton = document.getElementById(labelBtnId);
             const styleSelect = document.getElementById(styleSelectId);
             const supercellSelect = document.getElementById(supercellSelectId);
             const outlineButton = document.getElementById(outlineBtnId);

             // Composition Slider Listener
             if (slider) {
                 slider.addEventListener('input', (event) => { if (valueSpan) valueSpan.textContent = parseFloat(event.target.value).toFixed(2); });
                 slider.addEventListener('change', (event) => { cdConcentration = parseFloat(event.target.value); if (valueSpan) valueSpan.textContent = cdConcentration.toFixed(2); updateCrystalModel(); });
             }
             // View Style Selector Listener
             if (styleSelect) {
                 styleSelect.addEventListener('change', (event) => { currentViewStyle = event.target.value; updateCrystalModel(); });
             }
             // Supercell Selector Listener
             if (supercellSelect) {
                 supercellSelect.addEventListener('change', (event) => {
                    const newSize = parseInt(event.target.value);
                    currentSupercellDims.nx = newSize; currentSupercellDims.ny = newSize; currentSupercellDims.nz = newSize;
                    updateCrystalModel(); // Rebuild model with new size
                 });
             }
             // Spin Button Listener
             if (spinButton) {
                 spinButton.addEventListener('click', () => { isSpinning = !isSpinning; spinButton.textContent = isSpinning ? 'Stop Spin' : 'Start Spin'; if (!isSpinning && animationFrameId) animate(); });
             }
             // Label Toggle Button Listener
             if (labelButton) {
                 labelButton.addEventListener('click', () => { showLabels = !showLabels; labelButton.textContent = showLabels ? 'Hide Labels' : 'Show Labels'; updateCrystalModel(); });
             }
             // Outline Toggle Button Listener
             if (outlineButton) {
                outlineButton.addEventListener('click', () => {
                    showOutline = !showOutline; // Toggle outline state
                    if (unitCellOutline) { unitCellOutline.visible = showOutline; } // Update visibility directly
                    else { console.warn("Outline object missing, cannot toggle visibility."); }
                    outlineButton.textContent = showOutline ? 'Hide Outline' : 'Show Outline'; // Update button text
                    if (renderer && scene && camera) { renderer.render(scene, camera); if (css2DRenderer) css2DRenderer.render(scene, camera); }
                    else { console.warn("Cannot re-render outline visibility change - renderer missing?"); }
                });
             }

             populateLegendUI(legendListId, materialData); // Pass materialData
             console.log("[Three.js Simplified] UI Setup Complete");
        }

        // --- Populate Legend UI ---
        // Modified to accept materialData, but uses atomInfo from vizData
        function populateLegendUI(legendListId, materialData) {
             const legendList = document.getElementById(legendListId);
             if (!legendList) { console.error("Legend list element not found:", legendListId); return; }
             legendList.innerHTML = ''; // Clear existing

             const atomInfo = vizData?.atom_info; // Get atomInfo from vizData passed into main function
             if(!atomInfo || Object.keys(atomInfo).length === 0) { console.warn("AtomInfo empty in vizData."); legendList.innerHTML = '<li>Legend missing.</li>'; return; }

             Object.entries(atomInfo).forEach(([symbol, info]) => {
                 const upperSymbol = symbol.toUpperCase(); const material = materials[upperSymbol];
                 const color = material ? material.color.getStyle() : (info?.color || '#cccccc');
                 const li = document.createElement('li'); li.style.marginBottom = '3px';
                 li.innerHTML = `<span class="color-box" style="display: inline-block; width: 12px; height: 12px; margin-right: 5px; border: 1px solid #ccc; background-color:${color}; vertical-align: middle;"></span> ${symbol} (${info.role || 'Atom'})`;
                 legendList.appendChild(li);
             });
             if (currentViewStyle === 'ballAndStick' || currentViewStyle === 'stick') {
                 const bondLi = document.createElement('li'); bondLi.style.marginTop = '5px';
                 bondLi.innerHTML = `<span class="color-box" style="display: inline-block; width: 12px; height: 12px; margin-right: 5px; border: 1px solid #888; background-color: ${bondMaterial.color.getStyle()}; vertical-align: middle;"></span> Bonds`;
                 legendList.appendChild(bondLi);
             }
         }

        // --- Window Resize Handler ---
        function onWindowResize() {
            if (!camera || !renderer || !css2DRenderer || !viewerContainer) return;
            const width = viewerContainer.clientWidth; const height = viewerContainer.clientHeight;
            if (width === 0 || height === 0) return;
            camera.aspect = width / height; camera.updateProjectionMatrix();
            renderer.setSize(width, height); css2DRenderer.setSize( width, height );
        }

        // --- Animation Loop ---
        function animate() {
            if (!renderer) { if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null; return; }
            animationFrameId = requestAnimationFrame(animate);
            if (controls) controls.update();
            if (isSpinning && crystalModelGroup) { crystalModelGroup.rotation.y += spinSpeed; }
            if (scene && camera) { renderer.render(scene, camera); if (css2DRenderer) css2DRenderer.render(scene, camera); }
        }

         // --- Cleanup Function ---
        function cleanup() {
             console.log("[Three.js Simplified] Cleaning up viewer resources...");
             if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
             window.removeEventListener('resize', onWindowResize);

             disposeMeshes(crystalModelGroup); // Dispose atoms/bonds/labels
             if(stickGeometry) stickGeometry.dispose(); // Dispose shared stick geo
             if (unitCellOutlineGeometry) unitCellOutlineGeometry.dispose(); // Dispose outline geo
             unitCellOutlineGeometry = null; unitCellOutline = null;

             Object.values(materials).forEach(mat => { if(mat) mat.dispose(); });
             if(bondMaterial) bondMaterial.dispose(); if(unitCellMaterial) unitCellMaterial.dispose(); if(defaultMaterial) defaultMaterial.dispose();
             if(scene && crystalModelGroup) scene.remove(crystalModelGroup); crystalModelGroup = null;
             if (renderer) { renderer.dispose(); if (renderer.domElement?.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); renderer = null; }
             if (css2DRenderer) { const cssOverlay = css2DRenderer.domElement?.parentNode; if (cssOverlay?.parentNode) cssOverlay.parentNode.removeChild(cssOverlay); css2DRenderer = null; }
             scene = null; camera = null; controls = null;

             if (viewerContainer) viewerContainer.innerHTML = ''; if (controlsContainer) controlsContainer.innerHTML = '';
             console.log("[Three.js Simplified] Cleanup complete.");
        }

        // --- === Main Execution Flow === ---
        try {
            console.log("[Three.js Simplified] Starting Main Execution Flow...");
            init();
            if (!scene || !camera || !renderer || !css2DRenderer || !controls) throw new Error("Initialization failed: Missing core components.");
            setupUI();
            animate();
             // Optional: Observer setup for cleanup
             const observerTargetNode = viewerContainer.closest('.property-detail-block') || viewerContainer.parentElement;
             if (observerTargetNode) {
                 const observer = new MutationObserver((mutationsList, observerInstance) => { /* ... */
                     for (const mutation of mutationsList) { if (mutation.removedNodes) { mutation.removedNodes.forEach(removedNode => { if (removedNode === viewerContainer || removedNode.contains(viewerContainer)) { console.log("Viewer element removed. Cleaning up..."); cleanup(); observerInstance.disconnect(); return; } }); } }
                 });
                 try { observer.observe(observerTargetNode, { childList: true }); console.log("Observing parent node for cleanup."); }
                 catch (obsError) { console.warn("Could not start observing:", obsError); }
             } else { console.warn("Could not find suitable parent node to observe for cleanup."); }
        } catch(error) {
            console.error("[Three.js Simplified Error] Main flow failed:", error);
            cleanup();
            if (viewerContainer) viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Failed to initialize viewer: ${error.message}</p>`;
            if (controlsContainer) controlsContainer.innerHTML = '';
        }

    } // --- End initializeSimplifiedThreeJsViewer ---
    // --- =============================================================== ---
    // ---      *** SIMPLIFIED Three.js Initializer END (FIXED v3) ***      ---
    // --- =============================================================== ---

}); // End DOMContentLoaded
