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
    // *** GET BACK TO TOP BUTTON ***
    const backToTopButton = document.getElementById("backToTopBtn");
    // *****************************


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

    // --- =============================================================== ---
    // ---    *** START: SIMPLIFIED Fetch Logic v6 (Fallback Only) ***     ---
    // --- =============================================================== ---
    let materialData; // Variable to hold the specific material's data object
    const mainDetailFilePath = `./details/material_details.json`;

    try { // Simple try-catch for the entire process
        console.log(`[Full Detail Loader] Attempting to load ONLY main file: ${mainDetailFilePath}`);
        const response = await fetch(mainDetailFilePath);

        if (!response.ok) {
            throw new Error(`Failed to fetch main details file (${mainDetailFilePath}) - Status: ${response.status}`);
        }

        const allDetailData = await response.json();
        console.log(`[Full Detail Loader] Successfully fetched and parsed main detail file.`);

        if (typeof allDetailData !== 'object' || allDetailData === null) {
            throw new Error(`Invalid JSON structure in main file ${mainDetailFilePath}. Expected top-level object.`);
        }

        // Find material within the main file (case-sensitive first, then insensitive)
        materialData = allDetailData[materialName];
        if (!materialData) {
            const lowerCaseMaterialName = materialName.toLowerCase();
            const foundKey = Object.keys(allDetailData).find(key => key.toLowerCase() === lowerCaseMaterialName);
            if (foundKey) {
                materialData = allDetailData[foundKey];
                console.warn(`[Full Detail Loader] Case-insensitive match found: '${foundKey}'.`);
                 // Ensure materialName field matches the key found
                 if (!materialData.materialName || materialData.materialName !== foundKey) {
                      console.warn(`Updating materialName field to match key: ${foundKey}`);
                      materialData.materialName = foundKey;
                      // Update title elements if necessary
                      if (materialNameEl) materialNameEl.textContent = foundKey;
                      document.title = `${foundKey} - Full Details`;
                 }
            } else {
                throw new Error(`Material '${materialName}' not found in main file ${mainDetailFilePath}.`);
            }
        }
         // Ensure materialName field exists
        if (!materialData.materialName) {
             materialData.materialName = materialName; // Use the originally decoded name
        }

        // Final validation of the extracted materialData
        if (typeof materialData !== 'object' || materialData === null) {
            throw new Error(`Invalid data structure loaded for material '${materialName}'.`);
        }
        console.log("[Full Detail Loader] Material data successfully extracted from main file.");


        // --- Proceed with Populating Page ---
        const sectionDataMap = new Map();

        // --- Process References ---
        const collectedRefs = new Set();
        const processRefs = (data) => { if (typeof data === 'object' && data !== null) { if (data.ref && materialData.references && materialData.references[data.ref]) { collectedRefs.add(data.ref); } Object.values(data).forEach(value => { if (typeof value === 'object' || Array.isArray(value)) { processRefs(value); } }); } else if (Array.isArray(data)) { data.forEach(processRefs); } };
        processRefs(materialData);
        console.log(`[Full Detail Loader] References processed: ${collectedRefs.size}`);

        // --- Build Table of Contents ---
        if (tocListEl && mainContentEl) {
            tocListEl.innerHTML = ''; let sectionCount = 0; const excludedKeys = ['materialName', 'references', 'name', 'formula', 'synonyms', 'category', 'constituent_elements', 'description', 'wiki_link', 'tags'];
            for (const sectionKey in materialData) { if (excludedKeys.includes(sectionKey) || typeof materialData[sectionKey] !== 'object' || materialData[sectionKey] === null) continue; const sectionDetailData = materialData[sectionKey]; if (typeof sectionDetailData !== 'object' || sectionDetailData === null) continue; sectionDataMap.set(sectionKey, sectionDetailData); sectionCount++; const sectionDisplayName = sectionDetailData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); const sectionId = `section-${sectionKey}`; const tocLi = document.createElement('li'); const tocLink = document.createElement('a'); tocLink.href = `#${sectionId}`; tocLink.textContent = sectionDisplayName; tocLi.appendChild(tocLink); tocListEl.appendChild(tocLi); }
             console.log(`[Full Detail Loader] TOC built: ${sectionCount} sections.`);
        } else { console.warn("TOC elements not found."); }

        // --- Populate Sections ---
        let populatedSectionCount = 0;
        for (const [sectionKey, sectionDetailData] of sectionDataMap.entries()) {
             const sectionId = `section-${sectionKey}`; let sectionElement = document.getElementById(sectionId);
             if (!sectionElement) { console.warn(`HTML section placeholder '${sectionId}' not found. Creating dynamically.`); sectionElement = document.createElement('section'); sectionElement.id = sectionId; sectionElement.className = 'detail-content-section'; sectionElement.style.display = 'none'; const h2 = document.createElement('h2'); h2.id = `${sectionId}-title`; sectionElement.appendChild(h2); const introP = document.createElement('p'); introP.className = 'section-introduction'; introP.id = `${sectionId}-intro`; sectionElement.appendChild(introP); const propsDiv = document.createElement('div'); propsDiv.className = 'properties-container'; propsDiv.id = `${sectionId}-properties`; sectionElement.appendChild(propsDiv); mainContentEl.appendChild(sectionElement); }
             const h2Title = sectionElement.querySelector('h2'); if (h2Title) { h2Title.textContent = sectionDetailData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); } else { console.warn(`Title element (h2) not found within section '${sectionId}'.`); }
             const sectionIntroEl = document.getElementById(`${sectionId}-intro`); if (sectionIntroEl) { if (sectionDetailData.introduction) { sectionIntroEl.innerHTML = sectionDetailData.introduction; sectionIntroEl.style.display = 'block'; } else { sectionIntroEl.style.display = 'none'; sectionIntroEl.innerHTML = ''; } }
             const propertiesContainerEl = document.getElementById(`${sectionId}-properties`); if (propertiesContainerEl && sectionDetailData.properties && typeof sectionDetailData.properties === 'object') { propertiesContainerEl.innerHTML = ''; let propertyCount = 0; Object.entries(sectionDetailData.properties).forEach(([propKey, propData]) => { const propertyBlockElement = renderPropertyBlock(sectionKey, propKey, propData, materialData, sectionDetailData.properties); if (propertyBlockElement) { propertiesContainerEl.appendChild(propertyBlockElement); propertyCount++; } }); propertiesContainerEl.style.display = propertyCount > 0 ? 'block' : 'none'; } else if (propertiesContainerEl) { propertiesContainerEl.style.display = 'none'; }
             sectionElement.style.display = 'block'; populatedSectionCount++;
        }
         console.log(`[Full Detail Loader] Populated ${populatedSectionCount} sections.`);

        // --- Populate References ---
        if (collectedRefs.size > 0 && referencesListEl && materialData.references) {
             referencesListEl.innerHTML = ''; const sortedRefs = Array.from(collectedRefs).sort();
             sortedRefs.forEach(refKey => { const refData = materialData.references[refKey]; if(refData){ const li = document.createElement('li'); li.id = `ref-${refKey}`; let linkHtml = refData.text; if(refData.doi){ linkHtml += ` <a href="https://doi.org/${refData.doi}" target="_blank" rel="noopener noreferrer">[DOI]</a>`; } li.innerHTML = `<strong>[${refKey}]</strong> ${linkHtml}`; referencesListEl.appendChild(li); } else { console.warn(`Ref key '${refKey}' not defined.`); } });
             referencesSectionEl.style.display = 'block'; mainContentEl.addEventListener('click', handleRefLinkClick); console.log("[Full Detail Loader] References populated.");
        } else if(referencesSectionEl){ referencesSectionEl.style.display = 'none'; console.log("[Full Detail Loader] No references to populate or elements missing."); }
        console.log("[Full Detail Loader] Data processing complete.");

    } catch (error) { // Outer catch block
         console.error("[Full Detail Loader] CRITICAL ERROR in fetch/process:", error);
         displayError(error.message || "Unknown error loading details.");
    }
    // --- =============================================================== ---
    // ---     *** END: SIMPLIFIED Fetch Logic v6 (Fallback Only) ***      ---
    // --- =============================================================== ---

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
                     // Pass the entire section's properties object as well for context
                     const propertyBlockElement = renderPropertyBlock(sectionKey, propKey, propData, materialData, sectionDetailData.properties);
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
    // Modified to accept sectionKey and sectionProperties (parent object)
    function renderPropertyBlock(sectionKey, propKey, propData, materialData, sectionProperties) {
        if (typeof propData !== 'object' || propData === null) return null;
        const propBlock = document.createElement('div'); propBlock.className = 'property-detail-block';
        propBlock.id = `prop-${sectionKey}-${propKey}`; // Unique ID per section/property
        const propTitle = document.createElement('h3'); propTitle.innerHTML = propData.displayName || propKey.replace(/_/g, ' '); propBlock.appendChild(propTitle);
        if (propData.summary) { const summaryEl = document.createElement('div'); summaryEl.className = 'summary'; summaryEl.innerHTML = propData.summary; propBlock.appendChild(summaryEl); }

        // --- Bandgap Plot Integration ---
        // Check if this is the specific property block ('band_gap') where the plot should go
        if (sectionKey === 'electrical_properties' && propKey === 'band_gap') {
            // *** CORRECTED: Look for the equation in the sibling property ***
            const bandgapEquationPropData = sectionProperties?.bandgap_equation; // Access sibling property data
            const equationDetails = bandgapEquationPropData?.details?.equations?.find(eq => eq.name === "Hansen E_g(x,T) Empirical Relation");

            if (equationDetails) {
                console.log("[Render Property Block] Found Hansen equation, initializing plot setup for:", propKey);
                // Create container and controls elements dynamically
                const plotControlsId = `bandgap-plot-controls-${sectionKey}-${propKey}`;
                const plotContainerId = `bandgap-plot-container-${sectionKey}-${propKey}`;
                const sliderId = `temp-slider-${sectionKey}-${propKey}`;
                const valueId = `temp-value-${sectionKey}-${propKey}`;

                const plotWrapper = document.createElement('div');
                plotWrapper.className = 'bandgap-plot-wrapper'; // Optional wrapper class

                const plotDiv = document.createElement('div');
                plotDiv.id = plotContainerId;
                plotDiv.className = 'bandgap-plot-container'; // Add class for styling
                plotDiv.innerHTML = `<p style="text-align:center; padding: 20px; color: #888;">Loading Bandgap Plot...</p>`; // Placeholder text
                plotWrapper.appendChild(plotDiv);

                const controlsDiv = document.createElement('div');
                controlsDiv.id = plotControlsId;
                controlsDiv.className = 'plot-controls'; // Add class for styling
                controlsDiv.innerHTML = `
                    <label for="${sliderId}">Temperature:</label>
                    <input type="range" id="${sliderId}" min="4" max="300" step="1" value="77">
                    <span id="${valueId}" class="temp-value-display">77 K</span>
                `;
                plotWrapper.appendChild(controlsDiv);

                propBlock.appendChild(plotWrapper); // Add plot and controls to the property block

                // Use requestAnimationFrame to ensure elements are in DOM before initializing plot
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
                 console.warn(`[Render Property Block] Hansen equation data not found under 'bandgap_equation' property, skipping plot for ${propKey}.`);
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
        // Do not render the block if it only contains a title and no other content (e.g. 'bandgap_equation' after plot added to 'band_gap')
        if (propBlock.children.length <= 1 && propBlock.querySelector('h3')) {
             // Check if the ONLY child is the h3 title
            const plotWasAddedElsewhere = sectionKey === 'electrical_properties' && propKey === 'bandgap_equation' && sectionProperties?.band_gap;
             if (plotWasAddedElsewhere) {
                 console.log(`[Render Property Block] Skipping empty property block render for ${propKey} as its content (plot) was moved.`);
                 return null; // Don't render this block
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
    // ---      *** START: REFINED Three.js Viewer Logic v10 ***            ---
    // ---      (Absolute Label Pos within Group + Loading Text Fix)       ---
    // --- ================================================================= ---
    function initializeSimplifiedThreeJsViewer(viewerElementId, controlsElementId, vizData, materialData) {
        console.log(`--- [Three.js ADAPTED Init v10] Initializing Viewer for ${viewerElementId} ---`);

        const viewerContainer = document.getElementById(viewerElementId);
        const controlsContainer = document.getElementById(controlsElementId);

        if (!viewerContainer || !controlsContainer) { console.error("[Three.js Error] Viewer or controls element not found!"); return; }

        // *** FIX: Explicitly clear placeholder text ***
        viewerContainer.innerHTML = '';
        // ********************************************

        // WebGL Check
        try { const canvas = document.createElement('canvas'); if (!window.WebGLRenderingContext || !(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))) throw new Error('WebGL not supported.'); }
        catch (e) { console.error("[Three.js Error] WebGL check failed:", e.message); viewerContainer.innerHTML = `<p class="error-message">WebGL is required.</p>`; controlsContainer.innerHTML = ''; return; }

        // Scope variables
        let scene, camera, renderer, css2DRenderer, controls, animationFrameId;
        let crystalGroup = new THREE.Group(); // Main group for atoms, bonds, outline
        let unitCellOutline = null;
        let atoms = []; // Store atom data {element, position (relative to group origin)}
        let structureCenter = new THREE.Vector3(); // Store the calculated center
        let isSpinning = false;
        let showLabels = true;
        let showOutline = true;
        let currentViewStyle = 'ballAndStick';
        let cdConcentration = vizData.composition?.initial_x ?? 0.3;
        let currentSupercell = { nx: 1, ny: 1, nz: 1 };
        let lattice_a = 6.47; // Default, will be updated

        // Constants & Config
        const atomInfo = vizData.atom_info || {};
        const latticeConstantsSource = vizData.lattice_constants || {};
        const spinSpeed = 0.005;
        const sphereScales = { spacefill: 0.55, ballAndStick: 0.28, stick: 0.1 };
        const labelOffsetValue = 0.45; // *** Fixed world-unit offset for labels above atoms ***
        const sphereDetail = 12;
        const stickDetail = 6;
        const stickRadius = 0.05;
        const fallbackBondCutoffFactor = 0.45;

        // Materials Cache
        const materialsCache = {};
        function getMaterial(element) {
            const upperSymbol = element.toUpperCase();
            if (!materialsCache[upperSymbol]) {
                const symbolKey = Object.keys(atomInfo).find(k => k.toUpperCase() === upperSymbol) || upperSymbol;
                const info = atomInfo[symbolKey] || {};
                materialsCache[upperSymbol] = new THREE.MeshStandardMaterial({
                    color: info.color || '#cccccc', metalness: info.metalness ?? 0.4, roughness: info.roughness ?? 0.6, side: THREE.DoubleSide });
            } return materialsCache[upperSymbol];
        }
        const bondMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.1, roughness: 0.8, side: THREE.DoubleSide });
        const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x3333ff, linewidth: 1.5 });

        // Reusable Geometries
        const sphereGeometries = {};
        const stickGeometry = new THREE.CylinderGeometry(stickRadius, stickRadius, 1, stickDetail, 1);

        // --- Helper: Calculate Lattice Constant (Unchanged from v9) ---
        function calculateLatticeConstant_Adapted(concentration) {
             let calculated_a = 0; const default_a = 6.47;
            if (!atomInfo || !latticeConstantsSource) { console.warn("Atom info/lattice const missing, using default."); return default_a; }
            if (vizData.composition.min_x !== vizData.composition.max_x && Object.keys(latticeConstantsSource).length >= 2) {
                const host_symbol = Object.keys(atomInfo).find(k => atomInfo[k]?.role === 'cation_host'); const subst_symbol = Object.keys(atomInfo).find(k => atomInfo[k]?.role === 'cation_subst');
                if (!host_symbol || !subst_symbol) { console.warn("Cation host/subst roles missing."); calculated_a = default_a; }
                else { const a_host = Number(latticeConstantsSource[host_symbol]); const a_subst = Number(latticeConstantsSource[subst_symbol]); const ratio = Number(concentration); if (!isNaN(a_host) && !isNaN(a_subst) && !isNaN(ratio) && a_host > 0 && a_subst > 0) { calculated_a = a_host * (1 - ratio) + a_subst * ratio; } else { console.warn("Invalid values for Vegard's law.", {a_host, a_subst, ratio}); calculated_a = default_a; } }
            } else { calculated_a = Number(latticeConstantsSource?.a) || Number(Object.values(latticeConstantsSource)[0]) || default_a; }
            if (!isNaN(calculated_a) && calculated_a > 0) return calculated_a;
            console.error(`Invalid calculated lattice const: ${calculated_a}. Returning default.`); return default_a;
        }

        // --- Helper: Generate Atom Positions (RELATIVE TO ORIGIN) & Calculate Center (Unchanged from v9) ---
        function generateCrystalData_Adapted(nx, ny, nz, concentration) {
            const generatedAtoms = []; lattice_a = calculateLatticeConstant_Adapted(concentration);
            const host_symbol = Object.keys(atomInfo).find(k => atomInfo[k]?.role === 'cation_host'); const subst_symbol = Object.keys(atomInfo).find(k => atomInfo[k]?.role === 'cation_subst'); const anion_symbol = Object.keys(atomInfo).find(k => atomInfo[k]?.role === 'anion');
            if (!anion_symbol || (vizData.composition.min_x !== vizData.composition.max_x && (!host_symbol || !subst_symbol))) { console.error("Missing roles definition."); return { atoms: [], center: new THREE.Vector3() }; }
            const basis = [ { element: anion_symbol, coords: [new THREE.Vector3(0.00, 0.00, 0.00),new THREE.Vector3(0.00, 0.50, 0.50),new THREE.Vector3(0.50, 0.00, 0.50),new THREE.Vector3(0.50, 0.50, 0.00)] }, { element: 'cation', coords: [new THREE.Vector3(0.25, 0.25, 0.25),new THREE.Vector3(0.25, 0.75, 0.75),new THREE.Vector3(0.75, 0.25, 0.75),new THREE.Vector3(0.75, 0.75, 0.25)] }];
            const minBounds = new THREE.Vector3(Infinity, Infinity, Infinity); const maxBounds = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
            for (let i = 0; i < nx; i++) { for (let j = 0; j < ny; j++) { for (let k = 0; k < nz; k++) { basis.forEach(basisAtom => { basisAtom.coords.forEach(coord => { let elementSymbol; if (basisAtom.element === 'cation') { if (vizData.composition.min_x !== vizData.composition.max_x) { elementSymbol = Math.random() < concentration ? subst_symbol : host_symbol; } else { elementSymbol = subst_symbol || host_symbol; } } else { elementSymbol = basisAtom.element; } const pos = new THREE.Vector3( (coord.x + i) * lattice_a, (coord.y + j) * lattice_a, (coord.z + k) * lattice_a ); generatedAtoms.push({ element: elementSymbol.toUpperCase(), position: pos }); minBounds.min(pos); maxBounds.max(pos); }); }); } } }
            const center = new THREE.Vector3().addVectors(minBounds, maxBounds).multiplyScalar(0.5);
            console.log(`[Three.js Adapted v10] Generated ${generatedAtoms.length} atoms (relative coords). Lattice: ${lattice_a.toFixed(3)}. Center calculated: ${center.x.toFixed(2)},${center.y.toFixed(2)},${center.z.toFixed(2)}`);
            // *** DO NOT SUBTRACT CENTER HERE ***
            return { atoms: generatedAtoms, center: center }; // Return atoms relative to (0,0,0) and the center
        }

        // --- Helper: Create CSS2D Label Object (Unchanged from v7) ---
        function createCSS2DLabel_Adapted(text) {
            const div = document.createElement('div'); div.className = 'atom-label'; div.textContent = text;
            const label = new THREE.CSS2DObject(div);
            // label.center.set(0.5, 0.5); // Removed - incorrect property
            label.layers.set(0);
            return label;
        }

        // --- Helper: Create/Update Model (Atoms, Bonds, Labels - Adapted v10 - Absolute Label Positioning) ---
        function createOrUpdateModel_Adapted(atomData) {
            console.log("[Three.js Adapted v10] Rebuilding model...");
            const childrenToRemove = crystalGroup.children.filter(child => child !== unitCellOutline);
            childrenToRemove.forEach(object => {
                if (object.isMesh) { if (object.geometry && object.geometry !== stickGeometry) object.geometry.dispose(); }
                else if (object.isLineSegments && object.geometry) { object.geometry.dispose(); }
                else if (object.isCSS2DObject) { if (object.element?.parentNode) object.element.parentNode.removeChild(object.element); object.element = null; }
                crystalGroup.remove(object);
            });

            if (!atomData || atomData.length === 0) { console.warn("No atom data to build model."); return; }

            const currentSphereScale = sphereScales[currentViewStyle] || sphereScales.ballAndStick;
            const jsonBondCutoff = Number(vizData.bond_cutoff);
            const bondCutoff = (!isNaN(jsonBondCutoff) && jsonBondCutoff > 0) ? jsonBondCutoff : (lattice_a * fallbackBondCutoffFactor);
            const bondCutoffSq = bondCutoff * bondCutoff;
            if (!isNaN(bondCutoffSq) && bondCutoffSq > 0) console.log(`Using bond cutoff: ${bondCutoff.toFixed(3)}Å`);
            else console.warn(`Invalid bondCutoffSq: ${bondCutoffSq}, bonds disabled.`);

            // --- Create/Cache Sphere Geometries ---
            Object.values(sphereGeometries).forEach(geom => geom?.dispose());
            for (const key in sphereGeometries) delete sphereGeometries[key];
            if (currentSphereScale > 0) {
                atomData.forEach(atom => {
                    const symbol = atom.element; const symbolKey = Object.keys(atomInfo).find(k => k.toUpperCase() === symbol.toUpperCase()) || symbol;
                    const baseRadius = atomInfo[symbolKey]?.radius ?? 1.0; const radius = Math.max(0.01, baseRadius * currentSphereScale);
                    const radiusKey = radius.toFixed(3); if (!sphereGeometries[radiusKey]) { try { sphereGeometries[radiusKey] = new THREE.SphereGeometry(radius, sphereDetail, sphereDetail); } catch (e) { console.error(`Error creating sphere geom r=${radius}: ${e.message}`); } }
                });
            }

            // Add Spheres & Labels - POSITIONING USING RAW COORDS
            let spheresAdded = 0, labelsAdded = 0;
            atomData.forEach((atom) => {
                const symbol = atom.element;
                const symbolKey = Object.keys(atomInfo).find(k => k.toUpperCase() === symbol.toUpperCase()) || symbol;
                const baseRadius = atomInfo[symbolKey]?.radius ?? 1.0; const sphereRadius = Math.max(0.01, baseRadius * currentSphereScale);
                const radiusKey = sphereRadius.toFixed(3); const geometry = sphereGeometries[radiusKey];
                const material = getMaterial(symbol);

                // Add Sphere at its calculated position (relative to group origin)
                if (currentSphereScale > 0 && geometry && material && atom.position && !isNaN(atom.position.x)) {
                    const sphere = new THREE.Mesh(geometry, material);
                    sphere.position.copy(atom.position); // Use the position directly
                    crystalGroup.add(sphere);
                    spheresAdded++;
                }

                // Add Label at atom position + fixed offset (relative to group origin)
                if (showLabels && atom.position && !isNaN(atom.position.x)) {
                    const label = createCSS2DLabel_Adapted(atom.element);
                    label.position.copy(atom.position); // Start at atom's relative position
                    label.position.y += labelOffsetValue; // Add fixed offset in Y direction
                    crystalGroup.add(label); // Add label directly to the main group
                    labelsAdded++;
                }
            });
            console.log(`[Three.js Adapted v10] Added ${spheresAdded} spheres, ${labelsAdded} labels.`);

            // Add Bonds (Sticks) - POSITIONING USING RAW COORDS
            let bondsAdded = 0;
            if ((currentViewStyle === 'stick' || currentViewStyle === 'ballAndStick') && bondCutoffSq > 0) {
                const yAxis = new THREE.Vector3(0, 1, 0);
                for (let i = 0; i < atomData.length; i++) {
                    for (let j = i + 1; j < atomData.length; j++) {
                        const atom1 = atomData[i]; const atom2 = atomData[j];
                        if (!atom1?.position || !atom2?.position || isNaN(atom1.position.x) || isNaN(atom2.position.x)) continue;
                        const distSq = atom1.position.distanceToSquared(atom2.position);
                        if (distSq > 1e-6 && distSq < bondCutoffSq) {
                            const role1Key = Object.keys(atomInfo).find(k => k.toUpperCase() === atom1.element.toUpperCase()) || atom1.element;
                            const role2Key = Object.keys(atomInfo).find(k => k.toUpperCase() === atom2.element.toUpperCase()) || atom2.element;
                            const role1 = atomInfo[role1Key]?.role; const role2 = atomInfo[role2Key]?.role;
                            const isCation1 = role1?.includes('cation'); const isAnion1 = role1 === 'anion';
                            const isCation2 = role2?.includes('cation'); const isAnion2 = role2 === 'anion';
                            if (!((isCation1 && isAnion2) || (isAnion1 && isCation2))) continue;
                            const distance = Math.sqrt(distSq); if (isNaN(distance) || distance <= 1e-3) continue;
                            const stickMesh = new THREE.Mesh(stickGeometry, bondMaterial);
                            stickMesh.position.copy(atom1.position).lerp(atom2.position, 0.5); // Midpoint using raw coords
                            const direction = new THREE.Vector3().subVectors(atom2.position, atom1.position).normalize();
                            const quaternion = new THREE.Quaternion();
                            if (Math.abs(direction.dot(yAxis)) < 1.0 - 1e-6) { quaternion.setFromUnitVectors(yAxis, direction); }
                            else if (direction.y < 0) { quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI); }
                            stickMesh.quaternion.copy(quaternion);
                            stickMesh.scale.set(1, distance, 1);
                            crystalGroup.add(stickMesh); bondsAdded++;
                        }
                    }
                }
                console.log(`[Three.js Adapted v10] Added ${bondsAdded} bonds.`);
            } else { console.log(`[Three.js Adapted v10] Skipping bond generation.`); }
        }

        // --- Helper: Create/Update Unit Cell Outline (Adapted v10 - Positioning Relative to Group) ---
        function createOrUpdateUnitCellOutline_Adapted() {
            if (unitCellOutline) {
                crystalGroup.remove(unitCellOutline);
                if (unitCellOutline.geometry) unitCellOutline.geometry.dispose();
            }
            if (!showOutline) {
                console.log("[Three.js Adapted v10] Outline hidden.");
                unitCellOutline = null; return;
            }
            // Geometry represents a 1x1x1 box centered at its local (0,0,0)
            const unitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
            const edgesGeometry = new THREE.EdgesGeometry(unitBoxGeometry);
            unitBoxGeometry.dispose();

            unitCellOutline = new THREE.LineSegments(edgesGeometry, outlineMaterial);
            // Scale it to the lattice size
            unitCellOutline.scale.set(lattice_a, lattice_a, lattice_a);
            // Position its center at the center of the first unit cell (0.5a, 0.5a, 0.5a) relative to the group origin
            unitCellOutline.position.set(0.5 * lattice_a, 0.5 * lattice_a, 0.5 * lattice_a);

            crystalGroup.add(unitCellOutline);
            console.log(`[Three.js Adapted v10] Outline positioned relative to group at: ${unitCellOutline.position.x.toFixed(2)},${unitCellOutline.position.y.toFixed(2)},${unitCellOutline.position.z.toFixed(2)}`);
        }


        // --- UI Setup (Unchanged) ---
        function setupUI() {
             controlsContainer.innerHTML = '';
             const controlsWrapper = document.createElement('div');
             const sliderId = `${controlsElementId}-cdSlider`; const valueId = `${controlsElementId}-cdValue`;
             const spinBtnId = `${controlsElementId}-spinButton`; const labelBtnId = `${controlsElementId}-labelToggleButton`;
             const styleSelectId = `${controlsElementId}-styleSelect`; const supercellSelectId = `${controlsElementId}-supercellSelect`;
             const outlineBtnId = `${controlsElementId}-outlineToggleButton`; const legendListId = `${controlsElementId}-legendList`;
             const showCompositionSlider = vizData.composition.min_x !== vizData.composition.max_x; const supercellOptions = vizData.supercell_options || [1];
             controlsWrapper.innerHTML = `<h4>${materialData.materialName || 'Material'} Controls</h4> ${showCompositionSlider ? `<div class="control-group"><label for="${sliderId}">Concentration (x): <span id="${valueId}">${cdConcentration.toFixed(2)}</span></label><input type="range" id="${sliderId}" min="${vizData.composition.min_x}" max="${vizData.composition.max_x}" step="${vizData.composition.step_x || 0.01}" value="${cdConcentration}" class="slider"></div>` : `<div class="control-group"><p>Composition: Fixed</p></div>`} <div class="control-group"><label for="${styleSelectId}">View Style:</label><select id="${styleSelectId}"><option value="ballAndStick" ${currentViewStyle === 'ballAndStick' ? 'selected' : ''}>Ball & Stick</option><option value="spacefill" ${currentViewStyle === 'spacefill' ? 'selected' : ''}>Spacefill</option><option value="stick" ${currentViewStyle === 'stick' ? 'selected' : ''}>Stick</option></select></div> <div class="control-group"><label for="${supercellSelectId}">Supercell:</label><select id="${supercellSelectId}">${supercellOptions.map(size => `<option value="${size}" ${size === currentSupercell.nx ? 'selected': ''}>${size}x${size}x${size}</option>`).join('')}</select></div> <div class="control-group action-buttons"><button id="${labelBtnId}">${showLabels ? 'Hide' : 'Show'} Labels</button><button id="${outlineBtnId}">${showOutline ? 'Hide' : 'Show'} Outline</button><button id="${spinBtnId}">${isSpinning ? 'Stop Spin' : 'Start Spin'}</button></div> <div class="control-group"><p style="font-weight: bold; margin-bottom: 5px;">Legend:</p><ul id="${legendListId}" style="padding-left: 0; list-style: none; font-size: 0.9em;"></ul></div> <p style="font-size: 12px; margin-top: 15px; color: #555;">Drag to rotate, Scroll to zoom.</p>`;
             controlsContainer.appendChild(controlsWrapper);
             const slider = document.getElementById(sliderId); const valueSpan = document.getElementById(valueId);
             const spinButton = document.getElementById(spinBtnId); const labelButton = document.getElementById(labelBtnId);
             const styleSelect = document.getElementById(styleSelectId); const supercellSelect = document.getElementById(supercellSelectId);
             const outlineButton = document.getElementById(outlineBtnId);
             if (slider) { slider.addEventListener('input', (event) => { if (valueSpan) valueSpan.textContent = parseFloat(event.target.value).toFixed(2); }); slider.addEventListener('change', (event) => { cdConcentration = parseFloat(event.target.value); if (valueSpan) valueSpan.textContent = cdConcentration.toFixed(2); updateModelAndOutline(); }); }
             if (styleSelect) { styleSelect.addEventListener('change', (event) => { currentViewStyle = event.target.value; updateModelAndOutline(); }); }
             if (supercellSelect) { supercellSelect.addEventListener('change', (event) => { const newSize = parseInt(event.target.value); currentSupercell.nx = newSize; currentSupercell.ny = newSize; currentSupercell.nz = newSize; updateModelAndOutline(); }); }
             if (spinButton) { spinButton.addEventListener('click', () => { isSpinning = !isSpinning; spinButton.textContent = isSpinning ? 'Stop Spin' : 'Start Spin'; if (isSpinning && !animationFrameId) animate(); }); }
             if (labelButton) { labelButton.addEventListener('click', () => { showLabels = !showLabels; labelButton.textContent = showLabels ? 'Hide Labels' : 'Show Labels'; updateModelAndOutline(); }); }
             if (outlineButton) { outlineButton.addEventListener('click', () => { showOutline = !showOutline; outlineButton.textContent = showOutline ? 'Hide Outline' : 'Show Outline'; updateModelAndOutline(); }); }
             populateLegendUI(legendListId, materialData); console.log("[Three.js Adapted] UI Setup Complete");
        }

        // --- Populate Legend UI (Unchanged) ---
        function populateLegendUI(legendListId, materialData) {
             const legendList = document.getElementById(legendListId); if (!legendList) { console.error("Legend list element not found:", legendListId); return; } legendList.innerHTML = ''; const atomInfo = vizData?.atom_info; if(!atomInfo || Object.keys(atomInfo).length === 0) { console.warn("AtomInfo empty."); legendList.innerHTML = '<li>Legend missing.</li>'; return; }
             Object.entries(atomInfo).forEach(([symbol, info]) => { const upperSymbol = symbol.toUpperCase(); const material = materialsCache[upperSymbol]; const color = material ? material.color.getStyle() : (info?.color || '#cccccc'); const li = document.createElement('li'); li.style.marginBottom = '3px'; li.innerHTML = `<span class="color-box" style="display: inline-block; width: 12px; height: 12px; margin-right: 5px; border: 1px solid #ccc; background-color:${color}; vertical-align: middle;"></span> ${symbol} (${info.role || 'Atom'})`; legendList.appendChild(li); });
             if (currentViewStyle === 'ballAndStick' || currentViewStyle === 'stick') { const bondLi = document.createElement('li'); bondLi.style.marginTop = '5px'; bondLi.innerHTML = `<span class="color-box" style="display: inline-block; width: 12px; height: 12px; margin-right: 5px; border: 1px solid #888; background-color: ${bondMaterial.color.getStyle()}; vertical-align: middle;"></span> Bonds`; legendList.appendChild(bondLi); }
         }


        // --- Window Resize Handler (Unchanged) ---
        function onWindowResize() { if (!camera || !renderer || !css2DRenderer || !viewerContainer) return; const width = viewerContainer.clientWidth; const height = viewerContainer.clientHeight; if (width === 0 || height === 0) return; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); css2DRenderer.setSize( width, height ); }

        // --- Animation Loop (Unchanged) ---
        function animate() { if (!renderer || !scene || !camera) { if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null; return; } animationFrameId = requestAnimationFrame(animate); if (controls) controls.update(); if (isSpinning && crystalGroup) { crystalGroup.rotation.y += spinSpeed; } renderer.render(scene, camera); if (css2DRenderer) css2DRenderer.render(scene, camera); }

         // --- Cleanup Function (Unchanged) ---
        function cleanup() {
             console.log("[Three.js Adapted] Cleaning up..."); if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null; window.removeEventListener('resize', onWindowResize);
             if (crystalGroup) { const children_to_remove = [...crystalGroup.children]; children_to_remove.forEach(object => { if (object.isMesh) { if (object.geometry && object.geometry !== stickGeometry) object.geometry.dispose(); } else if (object.isLineSegments && object.geometry) { object.geometry.dispose(); } else if (object.isCSS2DObject) { if (object.element?.parentNode) object.element.parentNode.removeChild(object.element); object.element = null; } crystalGroup.remove(object); }); }
             if(stickGeometry) stickGeometry.dispose(); Object.values(sphereGeometries).forEach(geom => geom?.dispose()); for (const key in sphereGeometries) delete sphereGeometries[key];
             Object.values(materialsCache).forEach(mat => mat?.dispose()); if(bondMaterial) bondMaterial.dispose(); if(outlineMaterial) outlineMaterial.dispose();
             if(scene && crystalGroup) scene.remove(crystalGroup); crystalGroup = null; if (renderer) { renderer.dispose(); if (renderer.domElement?.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); renderer = null; } if (css2DRenderer) { const cssOverlay = css2DRenderer.domElement?.parentNode; if (cssOverlay?.parentNode) cssOverlay.parentNode.removeChild(cssOverlay); css2DRenderer = null; } scene = null; camera = null; controls = null; unitCellOutline = null;
             if (viewerContainer) viewerContainer.innerHTML = ''; if (controlsContainer) controlsContainer.innerHTML = ''; console.log("[Three.js Adapted] Cleanup complete.");
        }

        // --- Wrapper to Update Model & Outline (CENTERS GROUP) ---
        function updateModelAndOutline() {
            const result = generateCrystalData_Adapted(currentSupercell.nx, currentSupercell.ny, currentSupercell.nz, cdConcentration);
            atoms = result.atoms; // Update global atoms array (positions relative to 0,0,0)
            structureCenter = result.center; // Store the calculated center

            // Reset group position before adding children with absolute coords
            crystalGroup.position.set(0, 0, 0);
            crystalGroup.rotation.set(0, 0, 0); // Also reset rotation if applicable

            createOrUpdateModel_Adapted(atoms); // Rebuild atoms, bonds, labels relative to group origin
            createOrUpdateUnitCellOutline_Adapted(); // Rebuild outline relative to group origin

            // *** Center the entire group ***
            crystalGroup.position.copy(structureCenter).multiplyScalar(-1);

            populateLegendUI(`${controlsElementId}-legendList`, materialData); // Update legend

            // Adjust camera zoom limits
            if (controls) {
                 const modelSize = lattice_a * Math.max(currentSupercell.nx, currentSupercell.ny, currentSupercell.nz);
                 controls.maxDistance = modelSize * 5;
                 controls.minDistance = lattice_a * 0.5;
                 controls.update();
             }
        }

        // --- === Main Execution Flow === ---
        try {
            console.log("[Three.js Adapted v10] Starting Main Flow..."); // Version identifier updated
            // Initial Scene Setup
            scene = new THREE.Scene(); scene.background = new THREE.Color(vizData.background_color || 0xddeeff);
            const width = viewerContainer.clientWidth; const height = viewerContainer.clientHeight;
            camera = new THREE.PerspectiveCamera(60, width > 0 && height > 0 ? width / height : 1, 0.1, 1000);
            renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(width, height); renderer.setPixelRatio(window.devicePixelRatio); viewerContainer.appendChild(renderer.domElement);
            // CSS2D Renderer Setup
            const css2dContainer = document.createElement('div'); css2dContainer.className = 'css2d-renderer-overlay'; viewerContainer.appendChild(css2dContainer); css2DRenderer = new THREE.CSS2DRenderer(); css2DRenderer.setSize(width, height); css2dContainer.appendChild(css2DRenderer.domElement);
            // Controls
            controls = new THREE.OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.1;
            // Lights
            scene.add(new THREE.AmbientLight(0xffffff, 0.7)); const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); directionalLight.position.set(5, 10, 7.5); scene.add(directionalLight);
            scene.add(crystalGroup); // Add the main group TO THE SCENE
            // Initial Model Build and Centering
            updateModelAndOutline();
            // Set initial camera position AFTER group is centered
             const initialModelSize = lattice_a * Math.max(currentSupercell.nx, currentSupercell.ny, currentSupercell.nz); const initialDist = initialModelSize * 1.8; camera.position.set(initialDist * 0.7, initialDist * 0.5, initialDist);
             // Camera looks at world origin (0,0,0) which is where the group center is now
             camera.lookAt(0, 0, 0);
             controls.target.set(0, 0, 0); // Orbit controls target the world origin
             controls.minDistance = lattice_a * 0.5; controls.maxDistance = initialModelSize * 5; controls.update();
            setupUI(); // Setup controls
            animate(); // Start animation loop
            // Resize listener
            window.removeEventListener('resize', onWindowResize); window.addEventListener('resize', onWindowResize);
            // Cleanup Observer
            const observerTargetNode = viewerContainer.closest('.property-detail-block') || viewerContainer.parentElement;
             if (observerTargetNode) { const observer = new MutationObserver((mutationsList, observerInstance) => { for (const mutation of mutationsList) { if (mutation.removedNodes) { mutation.removedNodes.forEach(removedNode => { if (removedNode === viewerContainer || removedNode.contains(viewerContainer)) { console.log("Viewer element removed. Cleaning up..."); cleanup(); observerInstance.disconnect(); return; } }); } } }); try { observer.observe(observerTargetNode, { childList: true }); console.log("Observing parent node for cleanup."); } catch (obsError) { console.warn("Could not start observing:", obsError); } } else { console.warn("Could not find suitable parent node to observe for cleanup."); }
        } catch(error) {
            console.error("[Three.js Adapted Error] Main flow failed:", error); cleanup(); if (viewerContainer) viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Failed to initialize viewer: ${error.message}</p>`; if (controlsContainer) controlsContainer.innerHTML = '';
        }

    } // --- End initializeSimplifiedThreeJsViewer ---
    // --- =============================================================== ---
    // ---      *** END: REFINED Three.js Viewer Logic v10 ***              ---
    // --- =============================================================== ---


    // --- =============================================================== ---
    // ---      *** Back to Top Button Logic START ***                     ---
    // --- =============================================================== ---
    if (backToTopButton) {
        // Function to show/hide button based on scroll position
        const scrollFunction = () => {
            // Show button if scrolled down more than 100px (adjust threshold as needed)
            if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
                backToTopButton.classList.add('show');
            } else {
                backToTopButton.classList.remove('show');
            }
        };

        // Function to scroll to top smoothly
        const scrollToTop = () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Use smooth scrolling
            });
        };

        // Add event listeners
        window.addEventListener('scroll', scrollFunction);
        backToTopButton.addEventListener('click', scrollToTop);

        console.log("[Full Detail Loader] Back to Top button initialized.");
    } else {
        console.warn("[Full Detail Loader] Back to Top button element '#backToTopBtn' not found.");
    }
    // --- =============================================================== ---
    // ---      *** Back to Top Button Logic END ***                       ---
    // --- =============================================================== ---


}); // End DOMContentLoaded

// --- END OF FILE full_detail_loader.js ---
