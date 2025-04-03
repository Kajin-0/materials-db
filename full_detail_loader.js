// --- START OF FILE full_detail_loader.js ---
console.log("[Full Detail Loader] Script started.");

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
    const displayError = (message, elementId = null) => {
        console.error("[Full Detail] Error:", message);
        if (elementId) {
            const targetEl = document.getElementById(elementId);
            if (targetEl) {
                 // Clear existing content and add error message
                 targetEl.innerHTML = `<p class="error-message" style="padding: 10px; border: 1px solid red; background-color: #ffebeb;">${message}</p>`;
            } else {
                console.error(`[Display Error] Target element with ID '${elementId}' not found.`);
            }
        } else {
             // General page error display
             if (materialNameEl) materialNameEl.textContent = "Error Loading Material";
             if (tocListEl) tocListEl.innerHTML = '<li>Error loading contents</li>';
             if (mainContentEl) mainContentEl.innerHTML = `<p class="error-message">Could not load material details: ${message}</p>`;
             if (referencesSectionEl) referencesSectionEl.style.display = 'none';
             document.title = "Error - Material Detail";
        }
    };

    // --- Validate parameters ---
    if (!materialNameParam) {
        displayError("Material name missing from URL parameters.");
        return;
    }
    const materialName = decodeURIComponent(materialNameParam);
    console.log("[Full Detail Loader] Decoded Material Name:", materialName);

    // --- Update Title Bar ---
    if (materialNameEl) {
        materialNameEl.textContent = materialName;
    } else {
        console.warn("[Full Detail Loader] Material name element (#material-name) not found.");
    }
    document.title = `${materialName} - Full Details`;

    // --- Construct file path ---
    const safeMaterialName = materialName.replace(/ /g, '_').toLowerCase();
    const detailFilePath = `./details/${safeMaterialName}_details.json`;
    console.log(`[Full Detail Loader] Constructed file path: '${detailFilePath}'`);

    // --- Fetch and Process Data ---
    let allMaterialDetails;
    try {
        const response = await fetch(detailFilePath);
        console.log(`[Full Detail Loader] Fetch response status: ${response.status} ${response.statusText}`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Full Detail Loader] Fetch failed: ${response.status}. Response:`, errorText);
            if (response.status === 404) {
                throw new Error(`Details file not found: '${detailFilePath}'. Ensure the file exists and the path is correct.`);
            } else {
                throw new Error(`HTTP error ${response.status} fetching '${detailFilePath}'`);
            }
        }
        allMaterialDetails = await response.json();
        if (typeof allMaterialDetails !== 'object' || allMaterialDetails === null) {
            throw new Error(`Invalid JSON structure received from '${detailFilePath}'. Expected an object.`);
        }
        console.log("[Full Detail Loader] JSON parsed successfully.");

        const sectionDataMap = new Map();

        // --- Process References (find all referenced keys) ---
        const collectedRefs = new Set();
        const processRefs = (data) => {
             if (typeof data === 'object' && data !== null) {
                // Check for a 'ref' key directly on the object
                if (data.ref && typeof data.ref === 'string' && allMaterialDetails.references && allMaterialDetails.references[data.ref]) {
                    collectedRefs.add(data.ref);
                }
                // Recursively check values within the object or array
                Object.values(data).forEach(value => {
                    if (typeof value === 'object' || Array.isArray(value)) {
                        processRefs(value);
                    }
                    // Check for refs embedded in strings like "[Ref1]" - less reliable
                    // if (typeof value === 'string' && value.includes('[')) {
                    //     const matches = value.match(/\[([^\]]+)\]/g);
                    //     if (matches) {
                    //         matches.forEach(match => {
                    //             const key = match.slice(1, -1);
                    //             if (allMaterialDetails.references && allMaterialDetails.references[key]) {
                    //                 collectedRefs.add(key);
                    //             }
                    //         });
                    //     }
                    // }
                });
             } else if (Array.isArray(data)) {
                data.forEach(processRefs); // Process each item in the array
             }
        };
        processRefs(allMaterialDetails); // Start recursion from the root
        console.log(`[Full Detail Loader] References processed: ${collectedRefs.size} unique references found.`);

        // --- Build Table of Contents ---
        if (tocListEl && mainContentEl) {
            tocListEl.innerHTML = ''; // Clear previous content
            let sectionCount = 0;
            const excludedKeys = ['materialName', 'references']; // Top-level keys to exclude

            for (const sectionKey in allMaterialDetails) {
                if (excludedKeys.includes(sectionKey) || !allMaterialDetails.hasOwnProperty(sectionKey)) continue;

                const sectionData = allMaterialDetails[sectionKey];
                // Validate section structure (must be object with displayName)
                if (typeof sectionData !== 'object' || sectionData === null || typeof sectionData.displayName !== 'string') {
                    console.warn(`[Full Detail Loader] Skipping section key '${sectionKey}' in TOC: Invalid format or missing displayName.`);
                    continue;
                }

                // Check if corresponding HTML section element exists
                const sectionId = `section-${sectionKey}`;
                if (!document.getElementById(sectionId)) {
                    console.warn(`[Full Detail Loader] Skipping section key '${sectionKey}' in TOC: HTML element '#${sectionId}' not found.`);
                    continue;
                }

                sectionDataMap.set(sectionKey, sectionData); // Store valid section data
                sectionCount++;
                const sectionDisplayName = sectionData.displayName;
                const tocLi = document.createElement('li');
                const tocLink = document.createElement('a');
                tocLink.href = `#${sectionId}`; // Link to the HTML section
                tocLink.textContent = sectionDisplayName;
                tocLi.appendChild(tocLink);
                tocListEl.appendChild(tocLi);
            }
             console.log(`[Full Detail Loader] TOC built with ${sectionCount} valid sections linked to existing HTML elements.`);
             if (sectionCount === 0) {
                 tocListEl.innerHTML = '<li>No valid sections found in data or corresponding HTML elements are missing.</li>';
             }
        } else {
            console.warn("[Full Detail Loader] TOC list element (#toc-list) or Main content element (#main-content) not found. TOC not built.");
        }

        // --- Populate Sections based on existing HTML structure ---
        let populatedSectionCount = 0;
        for (const [sectionKey, sectionData] of sectionDataMap.entries()) {
             const sectionId = `section-${sectionKey}`;
             const sectionElement = document.getElementById(sectionId);
             // We already checked existence in TOC build, but double-check
             if (!sectionElement) continue;

             // Populate Title (H2)
             const h2Title = sectionElement.querySelector('h2');
             if (h2Title) {
                h2Title.textContent = sectionData.displayName;
             } else {
                 console.warn(`[Full Detail Loader] No H2 element found within section '#${sectionId}'. Title not set.`);
             }

             // Populate Introduction
             const sectionIntroEl = document.getElementById(`${sectionId}-intro`);
             if (sectionIntroEl) {
                if (sectionData.introduction) {
                    sectionIntroEl.innerHTML = sectionData.introduction;
                    sectionIntroEl.style.display = 'block';
                } else {
                    sectionIntroEl.style.display = 'none';
                    sectionIntroEl.innerHTML = '';
                }
             } // No warning if missing, maybe optional

             // Populate Properties Block
             const propertiesContainerEl = document.getElementById(`${sectionId}-properties`);
             if (propertiesContainerEl) {
                 if (sectionData.properties && typeof sectionData.properties === 'object' && Object.keys(sectionData.properties).length > 0) {
                     propertiesContainerEl.innerHTML = ''; // Clear existing
                     Object.entries(sectionData.properties).forEach(([propKey, propData]) => {
                        const propertyBlockElement = renderPropertyBlock(sectionKey, propKey, propData, allMaterialDetails);
                        if (propertyBlockElement) {
                             propertiesContainerEl.appendChild(propertyBlockElement);
                        } else {
                            console.warn(`[Full Detail Loader] Failed to render property block for '${propKey}' in section '${sectionKey}'.`);
                        }
                     });
                     propertiesContainerEl.style.display = 'block';
                 } else {
                     propertiesContainerEl.style.display = 'none';
                     propertiesContainerEl.innerHTML = '';
                 }
             } // No warning if missing, maybe optional

             sectionElement.style.display = 'block'; // Ensure section is visible
             populatedSectionCount++;
        }
         console.log(`[Full Detail Loader] Populated content for ${populatedSectionCount} sections.`);

        // --- Populate References Section ---
        if (referencesSectionEl && referencesListEl && allMaterialDetails.references && collectedRefs.size > 0) {
             referencesListEl.innerHTML = ''; // Clear previous
             // Sort references numerically if possible, then alphabetically
             const sortedRefs = Array.from(collectedRefs).sort((a, b) => {
                 const numA = parseInt(a, 10);
                 const numB = parseInt(b, 10);
                 if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                 return String(a).localeCompare(String(b)); // Fallback to string comparison
             });

             let populatedRefCount = 0;
             sortedRefs.forEach(refKey => {
                 const refData = allMaterialDetails.references[refKey];
                 if(refData && refData.text) { // Must have at least text
                     const li = document.createElement('li');
                     li.id = `ref-${refKey}`; // ID for linking
                     let contentHtml = `<strong>[${refKey}]</strong> ${refData.text}`;
                     if(refData.doi && typeof refData.doi === 'string' && refData.doi.includes('/')) { // Basic DOI check
                         contentHtml += ` <a href="https://doi.org/${encodeURIComponent(refData.doi)}" target="_blank" rel="noopener noreferrer">[DOI]</a>`;
                     } else if (refData.doi) {
                         console.warn(`[Full Detail Loader] Invalid DOI format for ref key '${refKey}': ${refData.doi}`);
                     }
                     li.innerHTML = contentHtml;
                     referencesListEl.appendChild(li);
                     populatedRefCount++;
                 } else {
                     console.warn(`[Full Detail Loader] Reference data missing or invalid for key '${refKey}'. Skipping.`);
                 }
             });

             if (populatedRefCount > 0) {
                 referencesSectionEl.style.display = 'block'; // Show section
                 // Add listener to main content for potential reference link clicks (for highlighting)
                 mainContentEl.addEventListener('click', handleRefLinkClick);
                 console.log(`[Full Detail Loader] References section populated with ${populatedRefCount} items.`);
             } else {
                 referencesSectionEl.style.display = 'none'; // Hide if all refs were invalid
                 console.log("[Full Detail Loader] References section hidden as no valid reference items could be populated.");
             }
        } else {
            if(referencesSectionEl) referencesSectionEl.style.display = 'none';
            console.log("[Full Detail Loader] References section hidden (no references found/processed, elements missing, or references data missing).");
        }
        console.log("[Full Detail Loader] Page data processing and population complete.");

    } catch (error) {
         console.error("[Full Detail Loader] CRITICAL ERROR during fetch or processing:", error);
         // Display a general error message on the page
         displayError(`Failed to load material details. ${error.message}`);
    }

    // --- Helper Function to Render a Single Property Block ---
    function renderPropertyBlock(sectionKey, propKey, propData, allDetails) {
        // Validate input
        if (typeof propData !== 'object' || propData === null) {
            console.warn(`[Render Property] Invalid propData for key '${propKey}' in section '${sectionKey}'. Expected an object.`);
            return null;
        }

        const propBlock = document.createElement('div');
        propBlock.className = 'property-detail-block';
        propBlock.id = `prop-${sectionKey}-${propKey}`; // Unique ID

        // Title (H3)
        const propTitle = document.createElement('h3');
        propTitle.textContent = propData.displayName || propKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        propBlock.appendChild(propTitle);

        // Summary (optional)
        if (propData.summary) {
            const summaryEl = document.createElement('div');
            summaryEl.className = 'summary';
            summaryEl.innerHTML = propData.summary; // Allow basic HTML
            propBlock.appendChild(summaryEl);
        }

        // --- Visualization Integration ---
        // Specific check for crystal structure visualization
        const isCrystalStructureViz = sectionKey === 'physical_properties' && propKey === 'crystal_structure';
        if (isCrystalStructureViz && propData.details && propData.details.visualization_data) {
            const vizData = propData.details.visualization_data;

            // --- Validate essential vizData fields ---
            let validationError = null;
            if (!vizData || typeof vizData !== 'object') validationError = "Missing 'visualization_data' object.";
            else if (!vizData.atom_info || typeof vizData.atom_info !== 'object' || Object.keys(vizData.atom_info).length === 0) validationError = "Missing or empty 'atom_info' object.";
            else if (!vizData.composition || typeof vizData.composition !== 'object') validationError = "Missing 'composition' object.";
            else if (typeof vizData.composition.initial_x !== 'number' || typeof vizData.composition.min_x !== 'number' || typeof vizData.composition.max_x !== 'number') validationError = "Invalid 'composition' fields (initial_x, min_x, max_x must be numbers).";
            else if (!vizData.lattice_constants || typeof vizData.lattice_constants !== 'object') validationError = "Missing 'lattice_constants' object.";
            // Add more checks if needed (e.g., for roles in atom_info, numeric values)

            if (validationError) {
                 console.error(`[Render Property] Invalid 'visualization_data' for '${propKey}': ${validationError}`, vizData);
                 const errorDiv = document.createElement('div');
                 errorDiv.className = 'error-message';
                 errorDiv.style.padding = '10px';
                 errorDiv.textContent = `Error: Visualization data is invalid (${validationError}). Cannot display 3D model.`;
                 propBlock.appendChild(errorDiv);
            } else {
                // --- Create Viewer Elements ---
                const baseViewerId = `viewer-${sectionKey}-${propKey}`; // Unique prefix
                const viewerContainerId = `${baseViewerId}-container`;
                const viewerElementId = `${baseViewerId}-viewer`;
                const controlsElementId = `${baseViewerId}-controls`;

                const viewerWrapper = document.createElement('div');
                viewerWrapper.className = 'crystal-viewer-wrapper';
                const viewerHeight = vizData.viewer_height || '450px'; // Use provided height or default
                viewerWrapper.style.setProperty('--viewer-height', viewerHeight);

                viewerWrapper.innerHTML = `
                    <div id="${viewerContainerId}" class="crystal-viewer-container">
                        <div id="${viewerElementId}" class="viewer-area">
                            <p style="padding:20px; color:#888; text-align:center;">Loading 3D Viewer...</p>
                        </div>
                        <div id="${controlsElementId}" class="viewer-controls">
                            <p style="padding:10px; color:#888;">Loading Controls...</p>
                        </div>
                    </div>`;
                propBlock.appendChild(viewerWrapper);

                // --- Initialize Viewer (deferred) ---
                requestAnimationFrame(() => {
                     // Check if THREE.js libs are loaded globally
                     let libsMissing = false;
                     if (typeof THREE === 'undefined') { console.error("THREE.js core library (THREE) is not defined!"); libsMissing = true; }
                     if (typeof THREE.OrbitControls === 'undefined') { console.error("THREE.OrbitControls is not defined!"); libsMissing = true; }
                     if (typeof THREE.CSS2DRenderer === 'undefined') { console.error("THREE.CSS2DRenderer is not defined!"); libsMissing = true; }
                     if (typeof THREE.CSS2DObject === 'undefined') { console.error("THREE.CSS2DObject is not defined!"); libsMissing = true; }

                     if(libsMissing) {
                         displayError("Essential 3D library components are missing. Cannot initialize viewer.", viewerElementId);
                         return;
                     }

                     // Check if our initializer function exists
                     if (typeof initializeSimplifiedThreeJsViewer === 'function') {
                        try {
                            const targetViewerEl = document.getElementById(viewerElementId);
                            const targetControlsEl = document.getElementById(controlsElementId);
                            if(targetViewerEl && targetControlsEl) {
                                console.log(`[Render Property] Initializing 3D viewer for: ${viewerElementId}`);
                                // Pass the validated vizData and the main details object
                                initializeSimplifiedThreeJsViewer(viewerElementId, controlsElementId, vizData, allDetails);
                            } else {
                                console.error(`[Render Property] Target elements not found just before init! Viewer: ${viewerElementId}, Controls: ${controlsElementId}`);
                                displayError("Internal Error: Viewer component elements could not be found.", viewerElementId);
                            }
                        } catch(e) {
                            console.error(`[Render Property] Error calling initializeSimplifiedThreeJsViewer for '${viewerElementId}':`, e);
                            displayError(`Error initializing 3D viewer: ${e.message}`, viewerElementId);
                        }
                     } else {
                         console.error("[Render Property] Viewer initialization function 'initializeSimplifiedThreeJsViewer' not found!");
                         displayError("Error: Viewer initialization code is missing or failed to load.", viewerElementId);
                     }
                });
             }
        } // --- End Visualization Integration ---

        // --- Process other 'details' subsections ---
        if (propData.details && typeof propData.details === 'object') {
            for (const [detailKey, detailContent] of Object.entries(propData.details)) {
                 if (detailKey === 'visualization_data') continue; // Skip viz data here
                 if (!detailContent || (Array.isArray(detailContent) && detailContent.length === 0) || (typeof detailContent === 'object' && !Array.isArray(detailContent) && Object.keys(detailContent).length === 0)) continue; // Skip empty

                 const subsection = document.createElement('div');
                 subsection.className = `detail-subsection subsection-${detailKey.replace(/ /g, '_').toLowerCase()}`;

                 const subsectionTitle = document.createElement('h4');
                 subsectionTitle.textContent = detailKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                 subsection.appendChild(subsectionTitle);

                 // --- Render subsection content based on type ---
                 try {
                     renderDetailContent(subsection, detailKey, detailContent);
                 } catch (renderError) {
                     console.error(`[Render Property] Error rendering detail subsection '${detailKey}':`, renderError);
                     const errorP = document.createElement('p');
                     errorP.className = 'error-message';
                     errorP.textContent = `Error rendering content for ${detailKey}.`;
                     subsection.appendChild(errorP);
                 }

                 // Add subsection only if it has content beyond the title
                 if(subsection.children.length > 1) {
                    propBlock.appendChild(subsection);
                 }
            }
        } // --- End 'details' processing ---

        return propBlock;
    } // --- End renderPropertyBlock ---

    // --- Helper to render content within a detail subsection ---
    function renderDetailContent(parentElement, detailKey, detailContent) {
        if (Array.isArray(detailContent)) {
            // Handle specific array types if needed
            if (detailKey === 'equations' && detailContent.every(item => typeof item === 'object' && item.formula)) {
                 detailContent.forEach((eq, index) => {
                     const eqBlock = document.createElement('div');
                     eqBlock.className = 'equation-block';
                     // Use textContent for formula initially if MathJax will render it
                     eqBlock.innerHTML = `
                         <div class="equation-formula">${eq.formula}</div>
                         ${eq.description ? `<div class="equation-description">${eq.description}</div>` : ''}
                         ${eq.ref ? `<div class="equation-ref">Ref: [${eq.ref}]</div>` : ''}
                     `;
                     // TODO: Trigger MathJax typesetting here if applicable: MathJax.typesetPromise([eqBlock]);
                     parentElement.appendChild(eqBlock);
                 });
            } else { // Default: render as an unordered list
                 const ul = document.createElement('ul');
                 detailContent.forEach(item => {
                     const li = document.createElement('li');
                     if (typeof item === 'string') li.innerHTML = item; // Allow HTML in list items
                     else if (typeof item === 'object' && item !== null) li.textContent = JSON.stringify(item); // Basic object display
                     else li.textContent = String(item); // Other primitives
                     ul.appendChild(li);
                 });
                 parentElement.appendChild(ul);
            }
        } else if (typeof detailContent === 'object' && detailContent !== null) {
            // Handle specific object types if needed
            if (detailKey === 'measurement_characterization') {
                const dl = document.createElement('dl');
                for (const [measKey, measValue] of Object.entries(detailContent)) {
                    const dt = document.createElement('dt');
                    dt.textContent = measKey.replace(/_/g, ' ');
                    const dd = document.createElement('dd');
                    if (typeof measValue === 'object' && measValue !== null && measValue.value !== undefined) { // Handle {value: X, unit: Y, ref: Z}
                        dd.textContent = `${measValue.value}${measValue.unit ? ' ' + measValue.unit : ''}`;
                        if (measValue.ref) dd.innerHTML += ` <span class="ref-link" data-ref="${measValue.ref}">[${measValue.ref}]</span>`; // Add clickable ref span
                    } else if (typeof measValue === 'string') {
                         dd.innerHTML = measValue; // Allow HTML
                    } else {
                         dd.textContent = String(measValue);
                    }
                    dl.appendChild(dt);
                    dl.appendChild(dd);
                }
                parentElement.appendChild(dl);
            } else { // Default: render object as preformatted JSON
                 const pre = document.createElement('pre');
                 pre.textContent = JSON.stringify(detailContent, null, 2);
                 parentElement.appendChild(pre);
            }
        } else if (typeof detailContent === 'string') {
            const p = document.createElement('p');
            p.innerHTML = detailContent; // Allow HTML
            parentElement.appendChild(p);
        } else { // Handle boolean, number, null, undefined
            const p = document.createElement('p');
            p.textContent = String(detailContent);
            parentElement.appendChild(p);
        }
    }

    // --- Function to handle reference link clicks (Basic Highlight) ---
    function handleRefLinkClick(event) {
        let target = event.target;
        let refKey = null;

        // Look for clicks specifically on spans with data-ref attribute
        const refLinkSpan = target.closest('span[data-ref]');
        if (refLinkSpan && refLinkSpan.dataset.ref) {
            refKey = refLinkSpan.dataset.ref;
        }
        // Allow clicking links within the main reference list too
        else if (referencesListEl && referencesListEl.contains(target)) {
             const parentLi = target.closest('li[id^="ref-"]');
             if (parentLi && parentLi.id) {
                 refKey = parentLi.id.substring(4); // Extract key from "ref-KEY"
             }
        }

        if (refKey) {
            const targetRefElement = document.getElementById(`ref-${refKey}`);
            if (targetRefElement && referencesSectionEl && referencesSectionEl.contains(targetRefElement)) {
                event.preventDefault(); // Prevent default jump if it was a link

                // Simple highlight effect
                const highlightClass = 'reference-highlight'; // Define in CSS
                // Remove from previous
                document.querySelectorAll(`.${highlightClass}`).forEach(el => el.classList.remove(highlightClass));
                // Add to current
                targetRefElement.classList.add(highlightClass);

                // Scroll to the reference smoothly
                targetRefElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Optional: Remove highlight after a delay
                setTimeout(() => {
                    targetRefElement.classList.remove(highlightClass);
                }, 2500);
            } else {
                console.warn(`[Ref Click] Target reference element '#ref-${refKey}' not found in the references list.`);
            }
        }
    }


    // --- ========================================================================= ---
    // ---      *** SIMPLIFIED Three.js Initializer START (with fixes & debug) ***    ---
    // --- ========================================================================= ---
    // Assumes THREE, OrbitControls, CSS2DRenderer, CSS2DObject are loaded globally
    function initializeSimplifiedThreeJsViewer(viewerElementId, controlsElementId, vizData, allMaterialDetails) {
        console.log(`--- [Three.js Init ${viewerElementId}] Initializing Viewer ---`);
        const logPrefix = `[Three.js Init ${viewerElementId}]`; // Unique prefix for logs from this instance

        const viewerContainer = document.getElementById(viewerElementId);
        const controlsContainer = document.getElementById(controlsElementId);

        // --- Essential Elements Check ---
        if (!viewerContainer) { console.error(`${logPrefix} Viewer container element #${viewerElementId} not found!`); return; }
        if (!controlsContainer) { console.error(`${logPrefix} Controls container element #${controlsElementId} not found!`); return; }

        // Clear containers initially
        viewerContainer.innerHTML = `<p style="padding:20px; color:#888; text-align:center;">Setting up 3D scene...</p>`;
        controlsContainer.innerHTML = '';

        // --- WebGL Support Check ---
        try {
            const canvas = document.createElement('canvas');
            const glContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!window.WebGLRenderingContext || !glContext) {
                throw new Error('WebGL is required but not supported or enabled.');
            }
            console.log(`${logPrefix} WebGL check passed.`);
        } catch (e) {
            console.error(`${logPrefix} WebGL check failed:`, e.message);
            displayError(`Error: ${e.message}. 3D viewer cannot run.`, viewerElementId);
            return;
        }

        // --- Scope variables ---
        let scene, camera, renderer, css2DRenderer, controls;
        let crystalModelGroup = new THREE.Group(); // Holds atoms, bonds, labels
        crystalModelGroup.name = `CrystalModelGroup-${viewerElementId}`; // Name for debugging
        let unitCellOutline = null; // Holds the outline mesh
        let isSpinning = false;
        let showLabels = true;
        let currentViewStyle = 'ballAndStick'; // Default style
        let cdConcentration = vizData.composition.initial_x; // Already validated
        const supercellDims = {
            nx: vizData.supercell?.nx ?? 2,
            ny: vizData.supercell?.ny ?? 2,
            nz: vizData.supercell?.nz ?? 2
        };
        const spinSpeed = 0.005;
        let animationFrameId = null;

        // --- Constants & Config ---
        const atomInfo = vizData.atom_info; // Already validated
        const latticeConstantsSource = vizData.lattice_constants; // Already validated
        let lattice_a = 6.47; // Default, calculated below

        // Style configs
        const sphereScales = { spacefill: 0.55, ballAndStick: 0.28, stick: 0.1 };
        const stickRadius = 0.05;
        const labelOffset = 0.3;
        const sphereDetail = 12;
        const stickDetail = 6;
        const fallbackBondCutoffFactor = 0.45; // Use if bond_cutoff is missing/invalid
        let bondCutoff; // Calculated based on JSON or fallback
        let bondCutoffSq; // Squared value for efficient distance check

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
        const unitCellMaterial = new THREE.LineBasicMaterial({ color: 0x3333ff, linewidth: 2 });

        // --- Reusable Geometries ---
        const sphereGeometries = {}; // Cache by symbol
        // Create STICK template geometry (Cylinder aligned along Y axis by default)
        const stickGeometry = new THREE.CylinderGeometry(stickRadius, stickRadius, 1, stickDetail, 1);
        const yAxis = new THREE.Vector3(0, 1, 0); // For stick orientation calculation

        // --- Helper: Dispose Meshes & Objects in a Group ---
        function disposeMeshes(group, keepOutline = false) {
             if (!group) return;
             // console.log(`${logPrefix} Dispose] Disposing children of group: ${group.name}`);
             const children_to_remove = [...group.children];
             children_to_remove.forEach(object => {
                if (keepOutline && object === unitCellOutline) return; // Optionally skip outline

                 if (object.isMesh || object.isLineSegments) {
                     // Dispose geometry unless it's the shared stick template
                     if (object.geometry && object.geometry !== stickGeometry) {
                         object.geometry.dispose();
                     }
                     // Don't dispose shared materials here; done in main cleanup
                 } else if (object.isCSS2DObject) {
                    // Remove the HTML element associated with CSS2DObject
                    if (object.element && object.element.parentNode) {
                         object.element.parentNode.removeChild(object.element);
                         object.element = null; // Help GC
                    }
                 }
                 group.remove(object); // Remove from Three.js group
             });
         }

        // --- Helper: Calculate Lattice Constant (Vegard's Law) ---
        function calculateLatticeConstant(currentConcentration) {
            // Find cation symbols based on roles
            let hostSymbol, substSymbol;
            for (const symbol in atomInfo) {
                if (atomInfo[symbol].role === 'cation_host') hostSymbol = symbol;
                if (atomInfo[symbol].role === 'cation_subst') substSymbol = symbol;
            }

            if (!hostSymbol || !substSymbol) {
                console.warn(`${logPrefix} Cannot calculate lattice constant: cation_host or cation_subst role missing in atom_info.`);
                return lattice_a; // Return current/default value
            }

            const a_host = Number(latticeConstantsSource[hostSymbol]);
            const a_subst = Number(latticeConstantsSource[substSymbol]);
            const ratio = Number(currentConcentration);

            if (isNaN(a_host) || isNaN(a_subst) || isNaN(ratio)) {
                console.warn(`${logPrefix} Invalid numeric values for Vegard's law calculation (a_host=${a_host}, a_subst=${a_subst}, ratio=${ratio}). Using previous lattice_a.`);
                return lattice_a;
            }

            const calculated_a = a_host * (1 - ratio) + a_subst * ratio;
            if (!isNaN(calculated_a) && calculated_a > 0) {
                // console.log(`${logPrefix} Calculated lattice_a: ${calculated_a.toFixed(4)} for x=${ratio.toFixed(2)}`);
                return calculated_a;
            } else {
                 console.warn(`${logPrefix} Vegard's law calculation resulted in invalid lattice_a (${calculated_a}). Using previous value.`);
                 return lattice_a;
            }
        }

        // --- Helper: Calculate Bond Cutoff ---
        function calculateBondCutoff() {
            const jsonBondCutoff = Number(vizData.bond_cutoff);
            const current_lattice_a = lattice_a; // Use the currently calculated lattice constant

             if (!isNaN(jsonBondCutoff) && jsonBondCutoff > 0) {
                 bondCutoff = jsonBondCutoff;
                 console.log(`${logPrefix} Using bond_cutoff from JSON: ${bondCutoff.toFixed(3)}`);
             } else {
                 bondCutoff = current_lattice_a * fallbackBondCutoffFactor;
                 console.log(`${logPrefix} Using fallback bond cutoff (lattice_a * ${fallbackBondCutoffFactor}): ${bondCutoff.toFixed(3)}`);
             }
             bondCutoffSq = bondCutoff * bondCutoff; // Update squared value
             if (isNaN(bondCutoffSq) || bondCutoffSq <= 0) {
                 console.error(`${logPrefix} Invalid bondCutoffSq derived: ${bondCutoffSq}. Bonding disabled.`);
                 bondCutoffSq = -1; // Disable bonding check explicitly
             }
        }

        // --- Initialize Scene ---
        function init() {
            try {
                // Wait if container has no dimensions yet
                if (viewerContainer.clientWidth === 0 || viewerContainer.clientHeight === 0) {
                    console.warn(`${logPrefix} Container size is zero, delaying init.`);
                    requestAnimationFrame(init); // Try again next frame
                    return;
                }
                console.log(`${logPrefix} Container size: ${viewerContainer.clientWidth}x${viewerContainer.clientHeight}`);
                while (viewerContainer.firstChild) { viewerContainer.removeChild(viewerContainer.firstChild); } // Clear placeholder

                // Calculate initial lattice constant and bond cutoff
                lattice_a = calculateLatticeConstant(cdConcentration);
                calculateBondCutoff();

                // --- Scene Setup ---
                scene = new THREE.Scene();
                scene.background = new THREE.Color(0xddeeff); // Light blue background
                const width = viewerContainer.clientWidth;
                const height = viewerContainer.clientHeight;

                // --- Camera Setup ---
                camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
                // Calculate reasonable initial distance based on supercell size
                const initialDist = (lattice_a * Math.max(supercellDims.nx, supercellDims.ny, supercellDims.nz)) * 1.5;
                camera.position.set(initialDist * 0.8, initialDist * 0.6, initialDist); // Angled view
                camera.lookAt(0, 0, 0); // Look at the center of the scene

                // --- WebGL Renderer ---
                renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Use alpha for potential background styling
                renderer.setSize(width, height);
                renderer.setPixelRatio(window.devicePixelRatio); // Adjust for high-DPI screens
                viewerContainer.appendChild(renderer.domElement); // Add canvas to the viewer div

                // --- CSS2D Renderer for Labels ---
                // Create an overlay div for the CSS renderer
                const css2dOverlay = document.createElement('div');
                css2dOverlay.className = 'css2d-renderer-overlay';
                css2dOverlay.style.position = 'absolute';
                css2dOverlay.style.top = '0';
                css2dOverlay.style.left = '0';
                css2dOverlay.style.width = '100%';
                css2dOverlay.style.height = '100%';
                css2dOverlay.style.pointerEvents = 'none'; // Allow clicks to pass through to the WebGL canvas
                css2dOverlay.style.overflow = 'hidden';
                viewerContainer.appendChild(css2dOverlay); // Add overlay ON TOP of the canvas

                css2DRenderer = new THREE.CSS2DRenderer();
                css2DRenderer.setSize(width, height);
                css2dOverlay.appendChild(css2DRenderer.domElement); // Add CSS renderer's div to the overlay

                // --- Controls ---
                controls = new THREE.OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true; // Smoother interaction
                controls.dampingFactor = 0.1;
                controls.minDistance = lattice_a * 0.5; // Prevent zooming too close
                controls.maxDistance = lattice_a * Math.max(supercellDims.nx, supercellDims.ny, supercellDims.nz) * 5; // Prevent zooming too far

                // --- Lighting ---
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Soft white light
                scene.add(ambientLight);
                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); // Brighter directional light
                directionalLight.position.set(5, 10, 7.5); // From top-right-front
                scene.add(directionalLight);

                // --- Add main group to scene ---
                scene.add(crystalModelGroup);

                // --- Initial Model Creation ---
                // Important: Create outline FIRST, then the rest, so outline is potentially behind atoms/bonds
                createOrUpdateUnitCellOutline(); // Create and add the outline mesh to the group
                updateCrystalModel();           // Generate atom data, create spheres/labels/bonds and add to group

                // --- Event Listeners ---
                window.removeEventListener('resize', onWindowResize); // Remove previous listener if any
                window.addEventListener('resize', onWindowResize);

                console.log(`${logPrefix} Init function complete.`);
             } catch(initError) {
                console.error(`${logPrefix} Error during Three.js init:`, initError);
                displayError(`Error setting up 3D scene: ${initError.message}`, viewerElementId);
                cleanup(); // Attempt cleanup on error
             }
        }

        // --- Generate Atom Positions (Zincblende specific) ---
        function generateCrystalData(nx, ny, nz, currentConcentration) {
             const atoms = [];
             // Ensure lattice_a is current for this concentration
             lattice_a = calculateLatticeConstant(currentConcentration);

             // Find element symbols based on roles
             let cation_host_symbol, cation_subst_symbol, anion_symbol;
             for (const symbol in atomInfo) {
                 if (atomInfo[symbol].role === 'cation_host') cation_host_symbol = symbol.toUpperCase();
                 if (atomInfo[symbol].role === 'cation_subst') cation_subst_symbol = symbol.toUpperCase();
                 if (atomInfo[symbol].role === 'anion') anion_symbol = symbol.toUpperCase();
             }
             if (!cation_host_symbol || !cation_subst_symbol || !anion_symbol) {
                 console.error(`${logPrefix} Atom roles (cation_host, cation_subst, anion) missing/incomplete in atom_info. Cannot generate structure.`);
                 return [];
             }

             // Calculate the geometric center of the supercell volume for centering
             // The center is halfway along each dimension from the origin (0,0,0) of the first cell
             const supercellCenter = new THREE.Vector3(
                  (nx * lattice_a) / 2.0 - lattice_a / 2.0,
                  (ny * lattice_a) / 2.0 - lattice_a / 2.0,
                  (nz * lattice_a) / 2.0 - lattice_a / 2.0
             );
             // console.log(`${logPrefix} Supercell center calculated at:`, supercellCenter);

             // Zincblende basis vectors (fractional coordinates within unit cell)
             const baseAnion = [ [0.00, 0.00, 0.00], [0.00, 0.50, 0.50], [0.50, 0.00, 0.50], [0.50, 0.50, 0.00] ]; // Typically Te
             const baseCation = [ [0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25] ]; // Typically Hg/Cd mix

             // Loop through supercell dimensions
             for (let i = 0; i < nx; i++) {
                 for (let j = 0; j < ny; j++) {
                     for (let k = 0; k < nz; k++) {
                         const cellOrigin = new THREE.Vector3(i * lattice_a, j * lattice_a, k * lattice_a);

                         // Add anion atoms for this cell
                         baseAnion.forEach(pos => {
                             const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2]) // Fractional coords
                                               .multiplyScalar(lattice_a)       // Scale to absolute coords within cell
                                               .add(cellOrigin)                 // Move to correct cell position
                                               .sub(supercellCenter);           // Center the whole structure
                             if (!isNaN(atomPos.x)) { // Basic check for valid position
                                atoms.push({ element: anion_symbol, position: atomPos });
                             } else { console.warn(`${logPrefix} NaN position generated for anion.`); }
                         });

                         // Add cation atoms for this cell (randomly choosing host or substituent)
                         baseCation.forEach(pos => {
                             const isSubstituent = Math.random() < currentConcentration;
                             const element = isSubstituent ? cation_subst_symbol : cation_host_symbol;
                             const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2])
                                               .multiplyScalar(lattice_a)
                                               .add(cellOrigin)
                                               .sub(supercellCenter);
                             if (!isNaN(atomPos.x)) {
                                atoms.push({ element: element, position: atomPos });
                             } else { console.warn(`${logPrefix} NaN position generated for cation.`); }
                         });
                     } // k
                 } // j
             } // i
             console.log(`${logPrefix} Generated ${atoms.length} atoms for ${nx}x${ny}x${nz} supercell with lattice_a = ${lattice_a.toFixed(3)}, x = ${currentConcentration.toFixed(2)}.`);
             return atoms;
         }

        // --- Create CSS2D Label Object ---
        function createCSS2DLabel(text) {
            const div = document.createElement('div');
            div.className = 'atom-label'; // Style this class in CSS
            div.textContent = text;
            const label = new THREE.CSS2DObject(div);
            label.layers.set(0); // Render on the default layer
            // Position is set when added to the group
            return label;
        }

        // --- Create/Update Visual Model (Spheres, Sticks, Labels) ---
        function createOrUpdateVisualModel(atomData) {
             console.log(`${logPrefix} Rebuilding visual model (Style: ${currentViewStyle})...`);
             // Dispose existing meshes (atoms, bonds, labels) but KEEP the outline
             disposeMeshes(crystalModelGroup, true);

             // Get scale factor based on current view style
             const currentSphereScale = sphereScales[currentViewStyle] || sphereScales.ballAndStick;

             // --- Prepare Sphere Geometries (cached) ---
             // Dispose old geometries if scale changed? Not strictly necessary unless memory is tight.
             // Regenerate geometries based on the *current* scale factor.
             Object.keys(atomInfo).forEach(symbol => {
                 const upperSymbol = symbol.toUpperCase();
                 const baseRadius = atomInfo[symbol]?.radius ?? 1.0;
                 let radius = baseRadius * currentSphereScale;
                 if (isNaN(radius) || radius <= 1e-3) radius = 0.05; // Minimum radius
                 // Dispose old one before creating new one if it exists
                 if (sphereGeometries[upperSymbol]) sphereGeometries[upperSymbol].dispose();
                 try {
                     sphereGeometries[upperSymbol] = new THREE.SphereGeometry(radius, sphereDetail, sphereDetail);
                 } catch(e) {
                     console.error(`${logPrefix} Error creating sphere geometry for ${upperSymbol}: ${e.message}`);
                     sphereGeometries[upperSymbol] = null; // Mark as invalid
                 }
             });

            // --- Add Spheres & Labels ---
             let spheresAdded = 0, labelsAdded = 0;
             atomData.forEach((atom) => {
                 const symbol = atom.element.toUpperCase();
                 const geometry = sphereGeometries[symbol];
                 const material = materials[symbol] || defaultMaterial;
                 if (!geometry || !material || !atom.position || isNaN(atom.position.x)) {
                     console.warn(`${logPrefix} Skipping atom due to invalid geometry, material, or position:`, atom);
                     return;
                 }
                 // Create sphere mesh
                 const sphere = new THREE.Mesh(geometry, material);
                 sphere.position.copy(atom.position);
                 crystalModelGroup.add(sphere);
                 spheresAdded++;

                 // Create and add label if enabled
                 if (showLabels) {
                     const label = createCSS2DLabel(atom.element);
                     label.position.copy(atom.position); // Position label at atom's center initially
                     label.position.y += labelOffset; // Offset slightly above
                     crystalModelGroup.add(label); // Add label to the main group
                     labelsAdded++;
                 }
             });
             console.log(`${logPrefix} Added ${spheresAdded} spheres, ${labelsAdded} labels.`);

            // --- Add Sticks (Bonds) if style requires and cutoff is valid ---
             let bondsAdded = 0;
             let potentialBondsChecked = 0;
             const shouldDrawBonds = (currentViewStyle === 'stick' || currentViewStyle === 'ballAndStick');

             if (shouldDrawBonds && bondCutoffSq > 0) { // Check if bonding is enabled and cutoff valid
                 console.log(`${logPrefix} [Bond Check] Starting bond generation. Cutoff Radius: ${bondCutoff.toFixed(3)}, CutoffSq: ${bondCutoffSq.toFixed(3)}`);
                 for (let i = 0; i < atomData.length; i++) {
                     for (let j = i + 1; j < atomData.length; j++) { // Avoid self-bonding and duplicate checks
                         potentialBondsChecked++;
                         const atom1 = atomData[i];
                         const atom2 = atomData[j];
                         // Basic validation of atom data
                         if (!atom1?.position || !atom2?.position || isNaN(atom1.position.x) || isNaN(atom2.position.x)) continue;

                         const distSq = atom1.position.distanceToSquared(atom2.position);

                         // Check distance against cutoff (and ignore tiny distances)
                         if (distSq > 1e-6 && distSq < bondCutoffSq) {
                             const role1 = atomInfo[atom1.element]?.role ?? 'unknown';
                             const role2 = atomInfo[atom2.element]?.role ?? 'unknown';

                             // --- Role Check: Bond only between Cation and Anion ---
                             const isCationAnionPair = (role1.includes('cation') && role2 === 'anion') || (role1 === 'anion' && role2.includes('cation'));

                             if (isCationAnionPair) {
                                // console.log(`${logPrefix} [Bond Check Success] Found potential bond: ${atom1.element}(${role1}) - ${atom2.element}(${role2}), DistSq: ${distSq.toFixed(3)}`);
                                 const distance = Math.sqrt(distSq);
                                 if (isNaN(distance) || distance <= 1e-3) continue; // Validate calculated distance

                                 // --- Create Stick Mesh ---
                                 // Use the shared stickGeometry template and bondMaterial
                                 const stickMesh = new THREE.Mesh(stickGeometry, bondMaterial);

                                 // 1. Position: Midpoint between the two atoms
                                 stickMesh.position.copy(atom1.position).add(atom2.position).multiplyScalar(0.5);

                                 // 2. Orientation: Align local Y-axis of cylinder along the vector from atom1 to atom2
                                 const direction = new THREE.Vector3().subVectors(atom2.position, atom1.position).normalize();
                                 const quaternion = new THREE.Quaternion();
                                 quaternion.setFromUnitVectors(yAxis, direction); // Calculate rotation
                                 stickMesh.quaternion.copy(quaternion);

                                 // 3. Scale: Scale along local Y-axis to match the distance
                                 stickMesh.scale.set(1, distance, 1);

                                 crystalModelGroup.add(stickMesh); // Add bond to the main group
                                 bondsAdded++;
                             } // End role check
                         } // End distance check
                     } // End inner loop (j)
                 } // End outer loop (i)
                 console.log(`${logPrefix} [Bond Check] Checked ${potentialBondsChecked} pairs, Added ${bondsAdded} bonds.`);
             } else if (shouldDrawBonds) {
                 console.log(`${logPrefix} [Bond Check] Skipped bond generation (CutoffSq <= 0).`);
             } // End if shouldDrawBonds

             console.log(`${logPrefix} Visual model update complete. Group children: ${crystalModelGroup.children.length}`);
        }

        // --- Create or Update the Unit Cell Outline ---
        function createOrUpdateUnitCellOutline() {
             // Ensure lattice_a is current before creating outline
             lattice_a = calculateLatticeConstant(cdConcentration);

             // Remove existing outline if it exists
             if (unitCellOutline) {
                 if (unitCellOutline.geometry) unitCellOutline.geometry.dispose();
                 crystalModelGroup.remove(unitCellOutline); // Remove from group
                 unitCellOutline = null;
             }

             // 1. Create geometry for ONE unit cell centered at origin
             const singleUnitCellGeo = new THREE.BoxGeometry(lattice_a, lattice_a, lattice_a);
             const edgesGeo = new THREE.EdgesGeometry(singleUnitCellGeo); // Get edges

             // 2. Determine the position for the outline (center of the first cell in the supercell grid, relative to the supercell's center)
             const supercellCenterOffset = new THREE.Vector3(
                 (supercellDims.nx * lattice_a) / 2.0 - lattice_a / 2.0,
                 (supercellDims.ny * lattice_a) / 2.0 - lattice_a / 2.0,
                 (supercellDims.nz * lattice_a) / 2.0 - lattice_a / 2.0
             );
             // The first cell's geometric center (relative to its own origin) is at (a/2, a/2, a/2).
             // Subtract the supercell offset to get its position in the centered world coordinates.
             const outlinePosition = new THREE.Vector3(lattice_a / 2, lattice_a / 2, lattice_a / 2)
                                       .sub(supercellCenterOffset);

             // 3. Create the LineSegments object
             unitCellOutline = new THREE.LineSegments(edgesGeo, unitCellMaterial);
             unitCellOutline.position.copy(outlinePosition); // Position the outline correctly
             unitCellOutline.name = `UnitCellOutline-${viewerElementId}`; // Name for debugging

             // 4. Add to the main model group so it rotates with the structure
             crystalModelGroup.add(unitCellOutline);

             singleUnitCellGeo.dispose(); // Dispose temporary box geometry

             console.log(`${logPrefix} Created/Updated Unit Cell Outline at position:`, outlinePosition);
         }

        // --- Update Crystal Model (Wrapper) ---
        // This function is called when concentration or display options change
        function updateCrystalModel() {
            console.log(`${logPrefix} Updating crystal model triggered.`);
            // 1. Recalculate lattice constant for the current concentration
            const new_lattice_a = calculateLatticeConstant(cdConcentration);
            const latticeChangedSignificantly = Math.abs(new_lattice_a - lattice_a) > 1e-4;
            lattice_a = new_lattice_a; // Update global lattice_a

            // 2. Recalculate bond cutoff based on potentially new lattice_a
            calculateBondCutoff();

            // 3. Regenerate atom positions using new lattice_a
            console.log(`${logPrefix} Generating atom data...`);
            const atomData = generateCrystalData(supercellDims.nx, supercellDims.ny, supercellDims.nz, cdConcentration);
            if (!atomData || atomData.length === 0) {
                console.error(`${logPrefix} Failed to generate atom data. Aborting model update.`);
                displayError("Error generating atom data for the 3D model.", viewerElementId);
                return;
            }

            // 4. Rebuild the visual elements (spheres, bonds, labels)
            console.log(`${logPrefix} Rebuilding visual meshes...`);
            createOrUpdateVisualModel(atomData);

            // 5. Recreate outline ONLY if lattice constant changed significantly
            if (latticeChangedSignificantly) {
                console.log(`${logPrefix} Lattice constant changed significantly, recreating outline.`);
                createOrUpdateUnitCellOutline();
            }

            // 6. Update camera/control limits based on potentially new lattice_a
            if (controls) {
                controls.minDistance = lattice_a * 0.5;
                controls.maxDistance = lattice_a * Math.max(supercellDims.nx, supercellDims.ny, supercellDims.nz) * 5;
                // controls.target.set(0, 0, 0); // Ensure target is centered if needed
                // controls.update();
            }
            console.log(`${logPrefix} Model update wrapper complete.`);
        }


        // --- Setup UI Controls ---
        function setupUI() {
             controlsContainer.innerHTML = ''; // Clear previous content
             const controlsWrapper = document.createElement('div');
             const materialDisplayName = allMaterialDetails?.materialName || 'Material'; // Use name from JSON

             // --- Composition Slider (if applicable) ---
             let compositionControlHtml = '';
             const { min_x, max_x } = vizData.composition;
             if (typeof min_x === 'number' && typeof max_x === 'number' && min_x !== max_x) {
                 compositionControlHtml = `
                 <div class="control-item">
                     <label for="${controlsElementId}-cdSlider">Cd Concentration (x): <span id="${controlsElementId}-cdValue">${cdConcentration.toFixed(2)}</span></label>
                     <input type="range" class="concentration-slider" id="${controlsElementId}-cdSlider"
                            min="${min_x}" max="${max_x}" step="0.01" value="${cdConcentration}">
                 </div>
                 `;
             } else {
                 compositionControlHtml = `<div class="control-item"><p>Composition (x): Fixed at ${cdConcentration.toFixed(2)}</p></div>`;
             }

             // --- Main Control Structure ---
             controlsWrapper.innerHTML = `
                 <h3>${materialDisplayName} Model Controls</h3>
                 <p>${supercellDims.nx}x${supercellDims.ny}x${supercellDims.nz} Supercell</p>
                 ${compositionControlHtml}
                 <div class="control-item">
                     <label>View Style:</label>
                     <select id="${controlsElementId}-styleSelect">
                         <option value="ballAndStick" ${currentViewStyle === 'ballAndStick' ? 'selected' : ''}>Ball and Stick</option>
                         <option value="spacefill" ${currentViewStyle === 'spacefill' ? 'selected' : ''}>Space Filling</option>
                         <option value="stick" ${currentViewStyle === 'stick' ? 'selected' : ''}>Stick Only</option>
                     </select>
                 </div>
                 <div class="control-item button-group">
                     <button id="${controlsElementId}-spinButton" class="viewer-button">${isSpinning ? 'Stop Spin' : 'Start Spin'}</button>
                     <button id="${controlsElementId}-labelToggleButton" class="viewer-button">${showLabels ? 'Hide' : 'Show'} Labels</button>
                 </div>
                 <div class="control-item">
                     <label>Legend:</label>
                     <ul id="${controlsElementId}-legendList" class="viewer-legend">
                         <!-- Legend items added dynamically -->
                     </ul>
                 </div>
                 <p class="viewer-hint">Drag to rotate, Scroll/Pinch to zoom.</p>
             `;
             controlsContainer.appendChild(controlsWrapper);

             // --- Add Listeners ---
             const slider = document.getElementById(`${controlsElementId}-cdSlider`);
             const valueSpan = document.getElementById(`${controlsElementId}-cdValue`);
             const spinButton = document.getElementById(`${controlsElementId}-spinButton`);
             const labelButton = document.getElementById(`${controlsElementId}-labelToggleButton`);
             const styleSelect = document.getElementById(`${controlsElementId}-styleSelect`);

             // Concentration Slider Listener
             if (slider) {
                 // Update display continuously while sliding
                 slider.addEventListener('input', (event) => {
                     if (valueSpan) valueSpan.textContent = parseFloat(event.target.value).toFixed(2);
                 });
                 // Update model only when slider is released ('change' event)
                 slider.addEventListener('change', (event) => {
                     cdConcentration = parseFloat(event.target.value);
                     console.log(`${logPrefix} Concentration changed to: ${cdConcentration}`);
                     if (valueSpan) valueSpan.textContent = cdConcentration.toFixed(2); // Ensure final value is set
                     updateCrystalModel(); // Regenerate the model with new concentration
                 });
             }

             // Spin Button Listener
             if (spinButton) {
                 spinButton.addEventListener('click', () => {
                     isSpinning = !isSpinning;
                     spinButton.textContent = isSpinning ? 'Stop Spin' : 'Start Spin';
                     console.log(`${logPrefix} Spin toggled: ${isSpinning}`);
                 });
             }

             // Label Toggle Button Listener
             if (labelButton) {
                 labelButton.addEventListener('click', () => {
                     showLabels = !showLabels;
                     labelButton.textContent = showLabels ? 'Hide Labels' : 'Show Labels';
                     console.log(`${logPrefix} Labels toggled: ${showLabels}`);
                     updateCrystalModel(); // Only need to update visuals, not atom data
                 });
             }

             // View Style Select Listener
             if (styleSelect) {
                 styleSelect.addEventListener('change', (event) => {
                     currentViewStyle = event.target.value;
                     console.log(`${logPrefix} View style changed to: ${currentViewStyle}`);
                     updateCrystalModel(); // Regenerate model with new style
                     populateLegendUI(); // Update legend (bond color might appear/disappear)
                 });
             }

             // Populate Legend Dynamically
             populateLegendUI();

             console.log(`${logPrefix} UI Setup Complete`);
        }

        // --- Populate Legend UI ---
         function populateLegendUI() {
             const legendList = document.getElementById(`${controlsElementId}-legendList`);
             if (!legendList) { console.warn(`${logPrefix} Legend list element not found.`); return; }
             legendList.innerHTML = ''; // Clear existing

             // Add atoms
             Object.entries(atomInfo).forEach(([symbol, info]) => {
                 const upperSymbol = symbol.toUpperCase();
                 // Use the actual material color
                 const color = materials[upperSymbol]?.color.getStyle() || defaultMaterial.color.getStyle();
                 const li = document.createElement('li');
                 li.innerHTML = `<span class="color-box" style="background-color:${color};"></span> ${symbol} (${info.role || 'N/A'})`;
                 legendList.appendChild(li);
             });

             // Add bond color ONLY if bonds are currently visible
             if (currentViewStyle === 'ballAndStick' || currentViewStyle === 'stick') {
                 const bondLi = document.createElement('li');
                 bondLi.innerHTML = `<span class="color-box" style="background-color: ${bondMaterial.color.getStyle()};"></span> Bonds`;
                 legendList.appendChild(bondLi);
             }
         }

        // --- Window Resize Handler ---
        function onWindowResize() {
            // Check if core components exist (might have been cleaned up)
            if (!camera || !renderer || !css2DRenderer || !viewerContainer) return;

            const width = viewerContainer.clientWidth;
            const height = viewerContainer.clientHeight;

            // Ignore resize if container is hidden or has no size
            if (width === 0 || height === 0) return;

            // console.log(`${logPrefix} Window resize detected: ${width}x${height}`);
            camera.aspect = width / height;
            camera.updateProjectionMatrix(); // Update camera aspect ratio

            renderer.setSize(width, height);       // Update WebGL renderer size
            css2DRenderer.setSize( width, height ); // Update CSS2D renderer size
        }

        // --- Animation Loop ---
        function animate() {
            // Stop the loop if cleanup has occurred (renderer is null)
            if (!renderer) {
                console.log(`${logPrefix} Renderer is null, stopping animation loop.`);
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
                return;
            }

            animationFrameId = requestAnimationFrame(animate); // Request next frame

            // Update controls (necessary for damping)
            if (controls) controls.update();

            // Apply spinning if enabled
            if (isSpinning && crystalModelGroup) {
                crystalModelGroup.rotation.y += spinSpeed; // Rotate the entire group
            }

            // Render the scene
            if (scene && camera) {
                renderer.render(scene, camera);            // Render WebGL elements
                if (css2DRenderer) css2DRenderer.render(scene, camera); // Render CSS labels/elements
            }
        }

         // --- Cleanup Function ---
        function cleanup() {
             console.log(`${logPrefix} Cleaning up viewer resources...`);

             // --- Stop Animation Loop ---
             if (animationFrameId) {
                 cancelAnimationFrame(animationFrameId);
                 animationFrameId = null;
                 console.log(`${logPrefix} Animation frame cancelled.`);
             }

             // --- Remove Event Listeners ---
             window.removeEventListener('resize', onWindowResize);
             // Remove UI listeners if they were added (might need more robust tracking)
             const slider = document.getElementById(`${controlsElementId}-cdSlider`);
             // ... remove listeners for slider, buttons, select ... (More complex to do reliably here)


             // --- Dispose Geometries ---
             // Dispose cached sphere geometries
             Object.values(sphereGeometries).forEach(geom => { if(geom) geom.dispose(); });
             for (const key in sphereGeometries) delete sphereGeometries[key]; // Clear cache object
             // Dispose shared stick geometry template
             if(stickGeometry) stickGeometry.dispose();
             // Dispose unit cell outline geometry specifically
             if (unitCellOutline && unitCellOutline.geometry) unitCellOutline.geometry.dispose();
             console.log(`${logPrefix} Geometries disposed.`);

             // --- Dispose Materials ---
             Object.values(materials).forEach(mat => { if(mat) mat.dispose(); });
             if(bondMaterial) bondMaterial.dispose();
             if(unitCellMaterial) unitCellMaterial.dispose();
             if(defaultMaterial) defaultMaterial.dispose();
             console.log(`${logPrefix} Materials disposed.`);

             // --- Dispose Scene Objects ---
             // Dispose children of the main group (atoms, bonds, labels, outline)
             if (crystalModelGroup) disposeMeshes(crystalModelGroup, false); // Dispose everything including outline now
             // Remove group from scene
             if (scene && crystalModelGroup && crystalModelGroup.parent === scene) {
                scene.remove(crystalModelGroup);
             }
             crystalModelGroup = null; // Clear reference
             unitCellOutline = null; // Clear reference
             scene = null; // Clear scene reference
             camera = null; // Clear camera reference
             console.log(`${logPrefix} Scene objects disposed.`);


             // --- Dispose Renderers & Controls ---
             if(controls) {
                 controls.dispose(); // Dispose orbit controls
                 controls = null;
             }
             if (renderer) {
                 renderer.dispose(); // Dispose WebGL renderer context
                 // Remove canvas from DOM
                 if (renderer.domElement && renderer.domElement.parentNode) {
                     renderer.domElement.parentNode.removeChild(renderer.domElement);
                 }
                 renderer = null;
             }
             if (css2DRenderer) {
                 // Remove CSS2D overlay and its contents
                 const cssOverlay = viewerContainer?.querySelector('.css2d-renderer-overlay');
                 if (cssOverlay && cssOverlay.parentNode) {
                     cssOverlay.parentNode.removeChild(cssOverlay);
                 }
                 css2DRenderer = null; // Clear reference
             }
             console.log(`${logPrefix} Renderers and controls disposed.`);

             // --- Clear Containers ---
             if(viewerContainer) viewerContainer.innerHTML = ''; // Clear viewer area
             if(controlsContainer) controlsContainer.innerHTML = ''; // Clear controls area

             console.log(`${logPrefix} Cleanup complete.`);
        } // --- End Cleanup ---


        // --- === Main Execution Flow for this Viewer Instance === ---
        try {
            console.log(`${logPrefix} Starting main execution flow...`);
            init(); // Setup scene, camera, renderer, initial model+outline, etc.

            // Check if essential components were created successfully
            if (!scene || !camera || !renderer || !css2DRenderer || !controls) {
                 throw new Error("Core Three.js components failed to initialize.");
            }

            setupUI(); // Setup control listeners based on initial state
            console.log(`${logPrefix} UI setup complete.");

            // Force a first render AFTER setup to ensure everything is drawn initially
             if (renderer && scene && camera) {
                 console.log(`${logPrefix} Requesting first render...`);
                 renderer.render(scene, camera);
                 if (css2DRenderer) css2DRenderer.render(scene, camera);
                 console.log(`${logPrefix} First render completed.`);
             } else {
                 console.error(`${logPrefix} Cannot perform first render - missing components.`);
             }

            animate(); // Start the rendering loop
            console.log(`${logPrefix} Animation loop started.`);

             // --- Setup MutationObserver for Automatic Cleanup ---
             // Observe if the viewer container or its wrapper is removed from the DOM
             const observerTargetNode = viewerContainer.closest('.crystal-viewer-wrapper') || viewerContainer; // Watch wrapper or container itself
             if (observerTargetNode && observerTargetNode.parentNode) {
                 const observer = new MutationObserver((mutationsList, observerInstance) => {
                    let viewerRemoved = false;
                    for (const mutation of mutationsList) {
                        if (mutation.removedNodes) {
                            mutation.removedNodes.forEach(removedNode => {
                                // Check if the removed node *is* or *contains* our target node
                                if (removedNode === observerTargetNode || removedNode.contains(observerTargetNode)) {
                                    viewerRemoved = true;
                                    return; // Exit inner loop
                                }
                            });
                        }
                        if (viewerRemoved) break; // Exit outer loop
                    }

                    if (viewerRemoved) {
                        console.log(`${logPrefix} Viewer container removed from DOM. Triggering cleanup.`);
                        cleanup();
                        observerInstance.disconnect(); // Stop observing once cleaned up
                    }
                 });

                 // Observe the parent node for changes in its direct children
                 observer.observe(observerTargetNode.parentNode, { childList: true });
                 console.log(`${logPrefix} MutationObserver watching parent node for cleanup.`);
             } else {
                 console.warn(`${logPrefix} Could not find a suitable node or parent to observe for automatic cleanup.`);
             }

        } catch(error) {
            console.error(`${logPrefix} Initialization or main flow failed catastrophically:`, error);
            displayError(`Failed to initialize viewer: ${error.message}`, viewerElementId);
            cleanup(); // Attempt cleanup even on catastrophic error
        }

    } // --- End initializeSimplifiedThreeJsViewer ---
    // --- ======================================================================= ---
    // ---      *** SIMPLIFIED Three.js Initializer END (with fixes & debug) ***    ---
    // --- ======================================================================= ---

}); // --- End DOMContentLoaded ---
