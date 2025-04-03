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
    const safeMaterialName = materialName.replace(/ /g, '_').toLowerCase();
    const detailFilePath = `./details/${safeMaterialName}_details.json`;
    console.log(`[Full Detail Loader] Constructed file path: '${detailFilePath}'`);

    // --- Fetch and Process Data ---
    let allMaterialDetails;
    try {
        const response = await fetch(detailFilePath);
        console.log(`[Full Detail Loader] Fetch response status: ${response.status} ${response.statusText}`);
        if (!response.ok) {
             const errorText = await response.text(); console.error(`Fetch failed: ${response.status}.`, errorText);
            if (response.status === 404) { throw new Error(`Details file not found: ${detailFilePath}. Check file name and path.`); }
            else { throw new Error(`HTTP error ${response.status} fetching ${detailFilePath}`); }
        }
        allMaterialDetails = await response.json();
        if (typeof allMaterialDetails !== 'object' || allMaterialDetails === null) { throw new Error(`Invalid JSON structure.`); }
        console.log("[Full Detail Loader] JSON parsed successfully.");

        const sectionDataMap = new Map(); // Moved inside try block

        // --- Process References ---
        const collectedRefs = new Set();
        const processRefs = (data) => {
             if (typeof data === 'object' && data !== null) {
                 if (data.ref && allMaterialDetails.references && allMaterialDetails.references[data.ref]) { collectedRefs.add(data.ref); }
                 Object.values(data).forEach(value => { if (typeof value === 'object' || Array.isArray(value)) { processRefs(value); } });
             } else if (Array.isArray(data)) { data.forEach(processRefs); }
        };
        processRefs(allMaterialDetails);
        console.log(`[Full Detail Loader] References processed: ${collectedRefs.size}`);

        // --- Build Table of Contents ---
        if (tocListEl && mainContentEl) {
            tocListEl.innerHTML = ''; let sectionCount = 0;
            const excludedKeys = ['materialName', 'references'];
            for (const sectionKey in allMaterialDetails) {
                if (excludedKeys.includes(sectionKey) || typeof allMaterialDetails[sectionKey] !== 'object' || allMaterialDetails[sectionKey] === null) continue;
                const sectionData = allMaterialDetails[sectionKey];
                 // Ensure sectionData has a displayName or is otherwise valid for TOC
                 // if (typeof sectionData.displayName !== 'string') continue; // Example stricter check

                sectionDataMap.set(sectionKey, sectionData); sectionCount++;
                const sectionDisplayName = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const sectionId = `section-${sectionKey}`;
                const tocLi = document.createElement('li'); const tocLink = document.createElement('a');
                tocLink.href = `#${sectionId}`; tocLink.textContent = sectionDisplayName;
                tocLi.appendChild(tocLink); tocListEl.appendChild(tocLi);
            }
             console.log(`[Full Detail Loader] TOC built: ${sectionCount} sections.`);
        } else { console.warn("TOC elements not found."); }

        // --- Populate Sections ---
        let populatedSectionCount = 0;
        for (const [sectionKey, sectionData] of sectionDataMap.entries()) {
             const sectionId = `section-${sectionKey}`; const sectionElement = document.getElementById(sectionId);
             if (!sectionElement) {
                 console.warn(`HTML section placeholder '${sectionId}' not found. Skipping.`);
                 continue;
             }
             const h2Title = sectionElement.querySelector('h2');
             if (h2Title) {
                 h2Title.textContent = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
             } else {
                 console.warn(`Title element (h2) not found within section '${sectionId}'.`);
             }

             const sectionIntroEl = document.getElementById(`${sectionId}-intro`);
             if (sectionIntroEl) {
                 if (sectionData.introduction) {
                     sectionIntroEl.innerHTML = sectionData.introduction; sectionIntroEl.style.display = 'block';
                 } else {
                     sectionIntroEl.style.display = 'none'; sectionIntroEl.innerHTML = '';
                 }
             }

             const propertiesContainerEl = document.getElementById(`${sectionId}-properties`);
             if (propertiesContainerEl && sectionData.properties && typeof sectionData.properties === 'object') {
                 propertiesContainerEl.innerHTML = '';
                 let propertyCount = 0;
                 Object.entries(sectionData.properties).forEach(([propKey, propData]) => {
                     const propertyBlockElement = renderPropertyBlock(propKey, propData, allMaterialDetails, propertiesContainerEl);
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
        if (collectedRefs.size > 0 && referencesListEl && allMaterialDetails.references) {
             referencesListEl.innerHTML = ''; const sortedRefs = Array.from(collectedRefs).sort();
             sortedRefs.forEach(refKey => {
                 const refData = allMaterialDetails.references[refKey];
                 if(refData){
                     const li = document.createElement('li'); li.id = `ref-${refKey}`;
                     let linkHtml = refData.text;
                     if(refData.doi){ linkHtml += ` <a href="https://doi.org/${refData.doi}" target="_blank" rel="noopener noreferrer">[DOI]</a>`; }
                     li.innerHTML = `<strong>[${refKey}]</strong> ${linkHtml}`; referencesListEl.appendChild(li);
                 } else { console.warn(`Ref key '${refKey}' not defined.`); }
            });
             referencesSectionEl.style.display = 'block';
             mainContentEl.addEventListener('click', handleRefLinkClick); // Add listener once
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
    // THIS VERSION CALLS THE Three.js INITIALIZER
    function renderPropertyBlock(propKey, propData, allDetails, parentContainer) {
        if (typeof propData !== 'object' || propData === null) return null;
        const propBlock = document.createElement('div'); propBlock.className = 'property-detail-block'; propBlock.id = `prop-${propKey}`;
        const propTitle = document.createElement('h3'); propTitle.innerHTML = propData.displayName || propKey.replace(/_/g, ' '); propBlock.appendChild(propTitle);
        if (propData.summary) { const summaryEl = document.createElement('div'); summaryEl.className = 'summary'; summaryEl.innerHTML = propData.summary; propBlock.appendChild(summaryEl); }

        // --- Visualization Integration (Calling THREE.JS viewer) ---
        if (propKey === 'crystal_structure' && propData.details && propData.details.visualization_data) {
            const vizData = propData.details.visualization_data;
             // Basic validation for Three.js viewer data
             if (!vizData || typeof vizData !== 'object' || !vizData.atom_info || !vizData.composition || !vizData.lattice_constants) {
                 console.error(`[renderPropertyBlock] Invalid viz_data for '${propKey}'. Missing fields needed for Three.js viewer.`);
                 const errorDiv = document.createElement('div'); errorDiv.className = 'error-message'; errorDiv.textContent = 'Error: Visualization data is invalid or incomplete.'; propBlock.appendChild(errorDiv);
             } else {
                const viewerContainerId = vizData.container_id || `viewer-container-${propKey}-${Date.now()}`;
                const viewerWrapper = document.createElement('div'); viewerWrapper.className = 'crystal-viewer-wrapper';
                const viewerHeight = vizData.viewer_height || '450px'; viewerWrapper.style.setProperty('--viewer-height', viewerHeight);
                // Ensure unique IDs for viewer and controls areas
                const viewerAreaId = `${viewerContainerId}-viewer`;
                const controlsAreaId = `${viewerContainerId}-controls`;
                viewerWrapper.innerHTML = `
                    <div id="${viewerContainerId}" class="crystal-viewer-container">
                        <div id="${viewerAreaId}" class="viewer-area"><p style="padding:20px; color:#888; text-align:center;">Loading 3D Viewer...</p></div>
                        <div id="${controlsAreaId}" class="viewer-controls"><p style="padding:10px; color:#888;">Loading Controls...</p></div>
                    </div>`;
                propBlock.appendChild(viewerWrapper);
                 // Delay initialization slightly to ensure elements are in the DOM
                requestAnimationFrame(() => {
                     // Check for Three.js components existence BEFORE calling the init function
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
                        return; // Stop initialization if libs are missing
                     }

                     // Check if the specific Three.js initializer exists
                     if (typeof initializeSimplifiedThreeJsViewer === 'function') {
                        try {
                            // Pass the specific IDs for viewer and controls areas
                            const targetViewerEl = document.getElementById(viewerAreaId);
                            const targetControlsEl = document.getElementById(controlsAreaId);
                            if(targetViewerEl && targetControlsEl) {
                                console.log(`[renderPropertyBlock] Initializing Three.js viewer for ${viewerAreaId}`);
                                initializeSimplifiedThreeJsViewer(viewerAreaId, controlsAreaId, vizData, allDetails);
                            } else {
                                // This case should be rare if the innerHTML is set correctly above
                                console.error(`Target elements for Three.js viewer ${viewerContainerId} not found (Viewer: ${!!targetViewerEl}, Controls: ${!!targetControlsEl}).`);
                                if(targetViewerEl) targetViewerEl.innerHTML = '<p class="error-message">Error: Could not find viewer sub-element.</p>';
                            }
                        } catch(e) {
                            console.error(`Error initializing Three.js viewer for ${viewerAreaId}:`, e);
                            const targetViewerEl = document.getElementById(viewerAreaId);
                            if(targetViewerEl) targetViewerEl.innerHTML = `<p class="error-message">Error initializing 3D viewer: ${e.message}. Check console.</p>`;
                        }
                     } else {
                         console.error("Viewer initialization function 'initializeSimplifiedThreeJsViewer' not found! Check if the function definition is included correctly in this file.");
                         const targetViewerEl = document.getElementById(viewerAreaId);
                         if(targetViewerEl) targetViewerEl.innerHTML = '<p class="error-message">Error: Viewer initialization code (initializeSimplifiedThreeJsViewer) not found.</p>';
                     }
                });
             }
        } // --- End Visualization Integration ---

        // --- Process other details subsections (logic from your second file) ---
        if (propData.details && typeof propData.details === 'object') {
            for (const [detailKey, detailContent] of Object.entries(propData.details)) {
                 if (detailKey === 'visualization_data') continue; // Already handled
                 // Skip empty content
                 if (!detailContent || (Array.isArray(detailContent) && detailContent.length === 0) || (typeof detailContent === 'object' && !Array.isArray(detailContent) && Object.keys(detailContent).length === 0) ) continue;

                 const subsection = document.createElement('div');
                 subsection.className = `detail-subsection ${detailKey.replace(/ /g, '_').toLowerCase()}`;

                 const subsectionTitle = document.createElement('h4');
                 subsectionTitle.textContent = detailKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                 // Only add title if content is not a simple string (avoids redundant titles)
                 if (typeof detailContent !== 'string') {
                    subsection.appendChild(subsectionTitle);
                 }

                 // Simplified content rendering logic (ensure this matches the full logic you had if needed)
                 if (Array.isArray(detailContent) && detailKey !== 'equations') {
                     const ul = document.createElement('ul');
                     detailContent.forEach(item => { const li = document.createElement('li'); li.innerHTML = item; ul.appendChild(li); });
                     subsection.appendChild(ul);
                 } else if (detailKey === 'equations' && Array.isArray(detailContent)) {
                     detailContent.forEach(eq => {
                        if (typeof eq !== 'object' || eq === null) return;
                         const eqBlock = document.createElement('div'); eqBlock.className = 'equation-block';
                         // ... (Add full equation block generation logic here if needed) ...
                         // Example snippet:
                         if (eq.name) { const nameEl = document.createElement('span'); nameEl.className = 'eq-name'; nameEl.textContent = eq.name; eqBlock.appendChild(nameEl); }
                         if (eq.formula_html) { const formulaEl = document.createElement('div'); formulaEl.className='eq-formula-html'; formulaEl.innerHTML = eq.formula_html; eqBlock.appendChild(formulaEl); }
                         // ... etc for description, variables, ref ...
                         subsection.appendChild(eqBlock);
                     });
                 } else if (detailKey === 'measurement_characterization' && typeof detailContent === 'object') {
                     // ... (Add measurement/characterization block generation logic here if needed) ...
                 } else if (typeof detailContent === 'string') {
                     const p = document.createElement('p'); p.innerHTML = detailContent;
                     subsection.appendChild(p);
                 } else { // Fallback for unexpected structures
                    console.warn(`Unhandled detail structure for key '${detailKey}'. Displaying JSON.`);
                    const pre = document.createElement('pre'); pre.textContent = JSON.stringify(detailContent, null, 2);
                    pre.style.cssText = 'font-size: 0.8em; background-color: #f0f0f0; padding: 8px; border: 1px solid #ccc; border-radius: 4px; overflow-x: auto; margin-top: 0.5rem;';
                    subsection.appendChild(pre);
                 }

                 // Add subsection only if it has content
                 if(subsection.children.length > 0) {
                    propBlock.appendChild(subsection);
                 }
            }
        }
        return propBlock;
    } // --- End renderPropertyBlock ---

    // --- Function to handle reference link clicks ---
    // (Using the version from previous steps, seems fine)
    function handleRefLinkClick(event) {
        const link = event.target.closest('a.ref-link[data-ref-key]');
        if (link) {
            event.preventDefault(); const targetId = `ref-${link.dataset.refKey}`; const targetElement = document.getElementById(targetId);
            if (targetElement) {
                const elementRect = targetElement.getBoundingClientRect();
                const absoluteElementTop = elementRect.top + window.pageYOffset;
                const headerOffset = 60; // Adjust if you have a fixed header
                const viewportHeight = window.innerHeight;
                const desiredScrollPos = absoluteElementTop - (viewportHeight * 0.3) - headerOffset;
                window.scrollTo({ top: Math.max(0, desiredScrollPos), behavior: 'smooth' });
                document.querySelectorAll('#references-list li.highlight-ref').forEach(el => el.classList.remove('highlight-ref'));
                targetElement.classList.add('highlight-ref');
                setTimeout(() => targetElement.classList.remove('highlight-ref'), 2500);
            }
            else { console.warn(`Reference target element with ID '${targetId}' not found.`); }
        }
     } // --- End handleRefLinkClick ---


    // --- ================================================================= ---
    // ---      *** SIMPLIFIED Three.js Initializer START (FIXED v2) ***      ---
    // ---         (Copied directly from your second provided file)          ---
    // --- ================================================================= ---
    function initializeSimplifiedThreeJsViewer(viewerElementId, controlsElementId, vizData, allMaterialDetails) {
        console.log(`--- [Three.js Simplified Init] Initializing Viewer for ${viewerElementId} ---`);

        const viewerContainer = document.getElementById(viewerElementId);
        const controlsContainer = document.getElementById(controlsElementId);

        if (!viewerContainer || !controlsContainer) { console.error("[Three.js Simplified Error] Viewer or controls element not found!"); return; }

        // --- WebGL Support Check ---
        // (Keep this check as it's essential for Three.js)
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
        let crystalModelGroup = new THREE.Group();
        let unitCellOutline = null;
        let isSpinning = false;
        let showLabels = true; // Default based on your code
        let cdConcentration = vizData.composition?.initial_x ?? 0.5;
        // Default supercell, adjust if needed or take from vizData
        const supercellDims = { nx: 1, ny: 1, nz: 1 };
        const spinSpeed = 0.005;
        let animationFrameId = null;
        let currentViewStyle = 'ballAndStick'; // Default view style

        // --- Constants & Config ---
        const atomInfo = vizData.atom_info || {};
        const latticeConstantsSource = vizData.lattice_constants || {};
        let lattice_a = 6.47; // Default, will be calculated

        const sphereScales = { spacefill: 0.55, ballAndStick: 0.28, stick: 0.1 };
        const stickRadius = 0.05;
        const labelOffset = 0.3; // Adjust label distance from atom center
        const sphereDetail = 12; // Lower for performance, higher for smoothness
        const stickDetail = 6;
        const fallbackBondCutoffFactor = 0.45; // Used if vizData.bond_cutoff is missing

        // --- Materials (Defined early for legend access) ---
        const materials = {};
        const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.4, roughness: 0.6 });
        Object.entries(atomInfo).forEach(([symbol, info]) => {
            materials[symbol.toUpperCase()] = new THREE.MeshStandardMaterial({
                color: info?.color || '#cccccc',
                metalness: info?.metalness ?? 0.4, // Allow override from JSON
                roughness: info?.roughness ?? 0.6
            });
        });
        const bondMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.1, roughness: 0.8 });
        const unitCellMaterial = new THREE.LineBasicMaterial({ color: 0x3333ff, linewidth: 1.5 }); // Solid blue line

        // --- Reusable Geometries ---
        const sphereGeometries = {}; // Will be populated per-atom-type in createOrUpdate...
        const stickGeometry = new THREE.CylinderGeometry(stickRadius, stickRadius, 1, stickDetail, 1); // Template height 1

        // --- Helper: Dispose Meshes and Labels ---
        function disposeMeshes(group) {
             if (!group) return;
             const children_to_remove = [...group.children];
             children_to_remove.forEach(object => {
                 // Don't remove the persistent unit cell outline here
                 if (object === unitCellOutline) return;

                 if (object.isMesh || object.isLineSegments) {
                     // Dispose geometry unless it's the shared stick template
                     if (object.geometry && object.geometry !== stickGeometry) {
                         object.geometry.dispose();
                     }
                     // Material disposal handled globally later if needed, or per-object if unique
                 } else if (object.isCSS2DObject) {
                     // Remove label HTML element from the DOM
                     if (object.element && object.element.parentNode) {
                         object.element.parentNode.removeChild(object.element);
                     }
                     object.element = null; // Clear reference
                 }
                 group.remove(object); // Remove from the Three.js group
             });
         }

        // --- Initialize Scene ---
        function init() {
            try {
                // Prevent init if container isn't visible yet
                if (viewerContainer.clientWidth === 0 || viewerContainer.clientHeight === 0) {
                     console.warn("[Three.js Init] Container size 0, delaying init.");
                     // Use requestAnimationFrame to try again on the next frame
                     animationFrameId = requestAnimationFrame(init);
                     return;
                }
                console.log(`[Three.js Init] Container: ${viewerContainer.clientWidth}x${viewerContainer.clientHeight}`);
                // Clear any previous content (like loading messages or old renderers)
                while (viewerContainer.firstChild) { viewerContainer.removeChild(viewerContainer.firstChild); }

                scene = new THREE.Scene();
                scene.background = new THREE.Color(vizData.background_color || 0xddeeff); // Use color from JSON or default

                const width = viewerContainer.clientWidth;
                const height = viewerContainer.clientHeight;
                camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
                calculateLatticeConstant(cdConcentration); // Calculate initial lattice_a based on initial concentration

                // Initial camera positioning - adjust based on supercell size
                const initialModelSize = lattice_a * Math.max(supercellDims.nx, supercellDims.ny, supercellDims.nz);
                const initialDist = initialModelSize * 1.8; // Further back for larger models
                camera.position.set(initialDist * 0.7, initialDist * 0.5, initialDist); // Adjust angles/ratios as needed
                camera.lookAt(0, 0, 0); // Look at the center of the model group

                renderer = new THREE.WebGLRenderer({ antialias: true });
                renderer.setSize(width, height);
                renderer.setPixelRatio(window.devicePixelRatio); // For sharper rendering on high DPI screens
                viewerContainer.appendChild(renderer.domElement); // Add canvas to the container

                // Setup CSS2DRenderer for labels
                const css2dContainer = document.createElement('div');
                css2dContainer.style.position = 'absolute';
                css2dContainer.style.top = '0'; css2dContainer.style.left = '0';
                css2dContainer.style.width = '100%'; css2dContainer.style.height = '100%';
                css2dContainer.style.pointerEvents = 'none'; // Allow clicks to pass through to the canvas
                css2dContainer.style.overflow = 'hidden'; // Prevent label overflow issues
                viewerContainer.appendChild(css2dContainer); // Add overlay div to the main viewer container

                css2DRenderer = new THREE.CSS2DRenderer();
                css2DRenderer.setSize(width, height);
                css2dContainer.appendChild(css2DRenderer.domElement); // Add CSS renderer's div to the overlay

                // Setup OrbitControls
                controls = new THREE.OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true; // Smooth camera movement
                controls.dampingFactor = 0.1;
                controls.minDistance = lattice_a * 0.5; // Prevent zooming too close
                // Adjust maxDistance based on supercell size
                controls.maxDistance = initialModelSize * 5;

                // Add Lighting
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Soft ambient light
                scene.add(ambientLight);
                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); // Main directional light
                directionalLight.position.set(5, 10, 7.5); // Adjust position for desired highlights
                scene.add(directionalLight);

                // Add the main group where atoms, bonds, outline will reside
                scene.add(crystalModelGroup);

                // Create the unit cell outline object (it will be positioned/updated later)
                createUnitCellOutlineGeometry(); // Create geometry/material once

                // Build the initial model (atoms, bonds, labels) and position the outline
                updateCrystalModel();

                // Add resize listener
                window.removeEventListener('resize', onWindowResize); // Remove old listener if any
                window.addEventListener('resize', onWindowResize);

                console.log("[Three.js Simplified] Init function complete.");
             } catch(initError) {
                 console.error("[Three.js Error] Error during init:", initError);
                 viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Error setting up scene: ${initError.message}</p>`;
                 cleanup(); // Attempt cleanup on init failure
                 // Optionally re-throw or handle further
             }
        }

        // --- Calculate Lattice Constant ---
        function calculateLatticeConstant(currentConcentration) {
            let calculated_a = 0;
            if (vizData.composition.min_x !== vizData.composition.max_x && latticeConstantsSource && Object.keys(latticeConstantsSource).length >= 2) {
                 // Alloy case: Use Vegard's Law (linear interpolation)
                const cation_host_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'cation_host');
                const cation_subst_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'cation_subst');

                if (!cation_host_symbol || !cation_subst_symbol) {
                    console.warn("Cannot calculate alloy lattice constant: host/subst roles missing in atomInfo.");
                     // Fallback: use average or first value if roles missing
                     const values = Object.values(latticeConstantsSource).filter(v => typeof v === 'number');
                     calculated_a = values.length > 0 ? values.reduce((a,b) => a+b, 0) / values.length : 6.5; // Average or default
                     console.warn(`Falling back to lattice_a = ${calculated_a}`);
                } else {
                    const a_host = Number(latticeConstantsSource[cation_host_symbol]); // Constant of compound with host cation (e.g., HgTe)
                    const a_subst = Number(latticeConstantsSource[cation_subst_symbol]); // Constant of compound with subst cation (e.g., CdTe)
                    const ratio = Number(currentConcentration);

                    if (isNaN(a_host) || isNaN(a_subst) || isNaN(ratio)) {
                        console.warn("Invalid values for Vegard's law calculation. Check latticeConstantsSource and concentration.", {a_host, a_subst, ratio});
                        calculated_a = 6.5; // Fallback
                    } else {
                        calculated_a = a_host * (1 - ratio) + a_subst * ratio;
                    }
                }
            } else {
                // Non-alloy or fixed composition: Use 'a' if present, else first value, else default
                 calculated_a = Number(latticeConstantsSource?.a) || Number(Object.values(latticeConstantsSource)[0]) || 6.5;
            }

             if (!isNaN(calculated_a) && calculated_a > 0) {
                lattice_a = calculated_a; // Update global lattice constant
             } else {
                console.error(`Invalid calculated lattice constant: ${calculated_a}. Using previous value: ${lattice_a}`);
             }
        }

        // --- Generate Atom Positions (Corrected Centering) ---
        function generateCrystalData(nx, ny, nz, currentCdConcentration) {
             const atoms = [];
             calculateLatticeConstant(currentCdConcentration); // Ensure lattice_a is up-to-date

             const cation_host_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'cation_host');
             const cation_subst_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'cation_subst');
             const anion_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'anion');
             if (!anion_symbol || (vizData.composition.min_x !== vizData.composition.max_x && (!cation_host_symbol || !cation_subst_symbol))) {
                 console.error("Atom roles missing for data generation (anion required, host/subst for alloys)."); return [];
             }

             // Calculate the center of the entire supercell volume for recentering
             const supercellCenter = new THREE.Vector3(
                  (nx * lattice_a) / 2.0 - lattice_a / 2.0, // Center of the first cell is offset by -a/2
                  (ny * lattice_a) / 2.0 - lattice_a / 2.0,
                  (nz * lattice_a) / 2.0 - lattice_a / 2.0
             );

             // Define base positions within a single unit cell (0,0,0 origin)
             // Assuming Zincblende structure (like HgTe/CdTe)
             // Check conventional cell definitions if using other structures
             const baseAnionPos = [ [0.00, 0.00, 0.00], [0.00, 0.50, 0.50], [0.50, 0.00, 0.50], [0.50, 0.50, 0.00] ]; // Usually Anions at FCC sites
             const baseCationPos = [ [0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25] ]; // Cations offset

             for (let i = 0; i < nx; i++) {
                 for (let j = 0; j < ny; j++) {
                     for (let k = 0; k < nz; k++) {
                         const cellOrigin = new THREE.Vector3(i * lattice_a, j * lattice_a, k * lattice_a);

                         // Add anions
                         baseAnionPos.forEach(pos => {
                             const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2])
                                 .multiplyScalar(lattice_a) // Scale to absolute coords
                                 .add(cellOrigin)          // Translate to current cell
                                 .sub(supercellCenter);     // Center the whole supercell at (0,0,0)
                             if (!isNaN(atomPos.x)) { // Basic check
                                 atoms.push({ element: anion_symbol.toUpperCase(), position: atomPos });
                             }
                         });

                         // Add cations (deterministically or randomly for alloys)
                         baseCationPos.forEach(pos => {
                             let element;
                             if (vizData.composition.min_x !== vizData.composition.max_x) {
                                 // Alloy: Randomly choose based on concentration
                                 element = Math.random() < currentCdConcentration ? cation_subst_symbol : cation_host_symbol;
                             } else {
                                 // Fixed composition: Use whichever cation role is defined (subst preferred if both exist)
                                 element = cation_subst_symbol || cation_host_symbol;
                             }
                             const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2])
                                 .multiplyScalar(lattice_a)
                                 .add(cellOrigin)
                                 .sub(supercellCenter);
                             if (!isNaN(atomPos.x)) {
                                 atoms.push({ element: element.toUpperCase(), position: atomPos });
                             }
                         });
                     } // k
                 } // j
             } // i
             console.log(`[Three.js] Generated ${atoms.length} atoms for ${nx}x${ny}x${nz} supercell with lattice_a = ${lattice_a.toFixed(3)}.`);
             return atoms;
         }


        // --- Create CSS2D Label Object ---
        function createCSS2DLabel(text) {
            const div = document.createElement('div');
            div.className = 'atom-label'; // Style this class in your CSS
            div.textContent = text;
            // Optional: Add background, border etc. via CSS or inline styles
            // div.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
            // div.style.padding = '1px 3px';
            // div.style.borderRadius = '3px';
            const label = new THREE.CSS2DObject(div);
            label.layers.set(0); // Render on the default layer
            return label;
        }

        // --- Create/Update Ball and Stick Model ---
        function createOrUpdateBallAndStickModel(atomData) {
             console.log("[Three.js updateModel] Rebuilding model...");
             disposeMeshes(crystalModelGroup); // Clear existing objects first (except outline)

             if (!atomData || atomData.length === 0) {
                 console.warn("[Three.js updateModel] No atom data provided.");
                 return;
             }

             const currentSphereScale = sphereScales[currentViewStyle] || sphereScales.ballAndStick;

             // Determine bond cutoff distance
             const jsonBondCutoff = Number(vizData.bond_cutoff);
             const bondCutoff = (!isNaN(jsonBondCutoff) && jsonBondCutoff > 0)
                                ? jsonBondCutoff
                                : (lattice_a * fallbackBondCutoffFactor); // Use factor of lattice_a as fallback
             const bondCutoffSq = bondCutoff * bondCutoff; // Use squared distance for efficiency
             if (isNaN(bondCutoffSq) || bondCutoffSq <= 0) {
                 console.warn(`[Three.js updateModel] Invalid bondCutoffSq derived: ${bondCutoffSq}. Bonds may not be generated correctly.`);
             } else {
                 console.log(`[Three.js updateModel] Using bond cutoff: ${bondCutoff.toFixed(3)} (Cutoff²: ${bondCutoffSq.toFixed(3)})`);
             }

             const yAxis = new THREE.Vector3(0, 1, 0); // For stick orientation calculation

             // --- Create Sphere Geometries (per atom type for this style) ---
             Object.values(sphereGeometries).forEach(geom => { if(geom) geom.dispose(); }); // Dispose old ones
             for (const key in sphereGeometries) delete sphereGeometries[key]; // Clear map

             Object.keys(atomInfo).forEach(symbol => {
                 const upperSymbol = symbol.toUpperCase();
                 const baseRadius = atomInfo[symbol]?.radius ?? 1.0; // Get base radius from JSON or default
                 let radius = baseRadius * currentSphereScale; // Apply style scale
                 // Ensure radius is a small positive number
                 radius = Math.max(radius, 0.01);
                 try {
                     // Create geometry only if scale > 0 (e.g., not needed for pure 'stick' view)
                     if (currentSphereScale > 0) {
                         sphereGeometries[upperSymbol] = new THREE.SphereGeometry(radius, sphereDetail, sphereDetail);
                     } else {
                         sphereGeometries[upperSymbol] = null; // No geometry needed
                     }
                 } catch(e) {
                     console.error(`Error creating sphere geometry for ${upperSymbol} (radius ${radius}): ${e.message}`);
                     sphereGeometries[upperSymbol] = null;
                 }
             });


             // --- Add Spheres & Labels ---
             let spheresAdded = 0, labelsAdded = 0;
             atomData.forEach((atom) => {
                 const symbol = atom.element.toUpperCase();
                 const geometry = sphereGeometries[symbol]; // Get pre-calculated geometry
                 const material = materials[symbol] || defaultMaterial; // Get pre-defined material

                 // Add sphere only if geometry exists (i.e., scale > 0)
                 if (geometry && material && atom.position && !isNaN(atom.position.x)) {
                     const sphere = new THREE.Mesh(geometry, material);
                     sphere.position.copy(atom.position);
                     crystalModelGroup.add(sphere);
                     spheresAdded++;
                 }

                 // Add labels if toggled on
                 if (showLabels && atom.position && !isNaN(atom.position.x)) {
                     const label = createCSS2DLabel(atom.element); // Create HTML element label
                     label.position.copy(atom.position);
                     label.position.y += labelOffset; // Offset label slightly above the atom
                     crystalModelGroup.add(label);
                     labelsAdded++;
                 }
             });
             console.log(`[Three.js updateModel] Added ${spheresAdded} spheres, ${labelsAdded} labels.`);


             // --- Add Sticks (Bonds) ---
             let bondsAdded = 0;
             // Only add bonds if style requires them AND cutoff is valid
             if ((currentViewStyle === 'stick' || currentViewStyle === 'ballAndStick') && bondCutoffSq > 0) {
                 for (let i = 0; i < atomData.length; i++) {
                     for (let j = i + 1; j < atomData.length; j++) { // Avoid duplicate bonds and self-bonding
                         const atom1 = atomData[i]; const atom2 = atomData[j];
                         // Basic checks
                         if (!atom1 || !atom2 || !atom1.position || !atom2.position || isNaN(atom1.position.x) || isNaN(atom2.position.x)) continue;

                         const distSq = atom1.position.distanceToSquared(atom2.position);

                         // Check distance against cutoff squared
                         if (distSq > 1e-6 && distSq < bondCutoffSq) { // Ensure not overlapping and within cutoff

                             // --- Optional: Role-based bonding filter ---
                             // Uncomment and adapt if you only want bonds between specific roles (e.g., Cation-Anion)
                              const role1 = atomInfo[atom1.element]?.role ?? 'unknown';
                              const role2 = atomInfo[atom2.element]?.role ?? 'unknown';
                              const isCation1 = role1.includes('cation'); const isAnion1 = role1 === 'anion';
                              const isCation2 = role2.includes('cation'); const isAnion2 = role2 === 'anion';
                              // Only bond Cation-Anion pairs
                              if (!((isCation1 && isAnion2) || (isAnion1 && isCation2))) {
                                  continue; // Skip if not a Cation-Anion pair
                              }
                             // --- End Optional Filter ---


                             const distance = Math.sqrt(distSq);
                             if (isNaN(distance) || distance <= 1e-3) continue; // Check distance validity

                             // Create stick mesh using the shared geometry and material
                             const stickMesh = new THREE.Mesh(stickGeometry, bondMaterial);

                             // Position the stick halfway between the atoms
                             stickMesh.position.copy(atom1.position).add(atom2.position).multiplyScalar(0.5);

                             // Orient the stick to point from atom1 to atom2
                             const direction = new THREE.Vector3().subVectors(atom2.position, atom1.position).normalize();
                             const quaternion = new THREE.Quaternion();
                             // Check for non-collinear vectors before using setFromUnitVectors
                             if (Math.abs(direction.dot(yAxis)) < 1.0 - 1e-6) {
                                 quaternion.setFromUnitVectors(yAxis, direction);
                             } else {
                                 // Handle case where direction is parallel to yAxis (up or down)
                                 // Rotate 180 degrees around X axis if pointing straight down
                                 if (direction.y < 0) {
                                     quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
                                 }
                                 // No rotation needed if pointing straight up (already aligned with template)
                             }
                             stickMesh.quaternion.copy(quaternion);

                             // Scale the stick's length (Y dimension of the cylinder template)
                             stickMesh.scale.set(1, distance, 1);

                             crystalModelGroup.add(stickMesh);
                             bondsAdded++;
                         }
                     } // End inner loop (j)
                 } // End outer loop (i)
                 console.log(`[Three.js updateModel] Added ${bondsAdded} bonds.`);
             } else {
                console.log(`[Three.js updateModel] Skipping bond generation (Style: ${currentViewStyle}, CutoffSq: ${bondCutoffSq})`);
             }
             console.log(`[Three.js updateModel] Rebuilt model. Total children in group: ${crystalModelGroup.children.length}`);
        }


        // --- Create Unit Cell Outline Geometry (Called Once) ---
        function createUnitCellOutlineGeometry() {
            // Creates the reusable geometry and material for the outline
            // The actual LineSegments object (unitCellOutline) will be added/removed/positioned
            const singleUnitCellGeo = new THREE.BoxGeometry(1, 1, 1); // Unit size initially
            const edgesGeo = new THREE.EdgesGeometry(singleUnitCellGeo);
            // Store geometry and material for later use in update/create outline object
            unitCellOutlineGeometry = edgesGeo; // Store the edges geometry
            // Material is already defined globally: unitCellMaterial
            singleUnitCellGeo.dispose(); // Dispose the temporary BoxGeometry
            console.log("[Three.js Simplified] Created Unit Cell Outline Geometry");
        }
        let unitCellOutlineGeometry = null; // Store geometry here


        // --- Create or Update Unit Cell Outline Object (Called during updates) ---
        function createOrUpdateUnitCellOutlineObject() {
             // Remove the old outline object if it exists
             if (unitCellOutline && unitCellOutline.parent) {
                 crystalModelGroup.remove(unitCellOutline);
             }
             // Don't dispose the shared geometry (unitCellOutlineGeometry) here

             if (!unitCellOutlineGeometry) {
                 console.error("Unit cell outline geometry not created!");
                 return;
             }

             // Create the LineSegments object using the shared geometry and material
             unitCellOutline = new THREE.LineSegments(unitCellOutlineGeometry, unitCellMaterial);

             // Calculate the correct position for the *first* unit cell's outline
             // within the potentially larger, centered supercell group.
             const supercellCenterOffset = new THREE.Vector3(
                 (supercellDims.nx * lattice_a) / 2.0 - lattice_a / 2.0,
                 (supercellDims.ny * lattice_a) / 2.0 - lattice_a / 2.0,
                 (supercellDims.nz * lattice_a) / 2.0 - lattice_a / 2.0
             );
             // Position the center of the outline geometry at the origin of the first cell (0,0,0) relative to the supercell origin
             const outlinePosition = new THREE.Vector3(0, 0, 0).sub(supercellCenterOffset); // Position of cell 0,0,0 relative to group center

             unitCellOutline.position.copy(outlinePosition);

             // Scale the unit cube geometry to the current lattice constant
             unitCellOutline.scale.set(lattice_a, lattice_a, lattice_a);

             // Add the outline to the scene group ONLY if it should be visible
             unitCellOutline.visible = showLabels; // <<< TIE VISIBILITY TO showLabels for now, or add separate control
             crystalModelGroup.add(unitCellOutline);

             console.log(`[Three.js Simplified] ${unitCellOutline.visible ? 'Created/Updated and showed' : 'Created/Updated and hid'} Single Unit Cell Outline`);
         }


        // --- Update Crystal Model (Wrapper) ---
        function updateCrystalModel() {
            console.log("[Three.js updateCrystalModel] Generating atom data...");
            // Regenerate atom positions based on current concentration and supercell size
            const atomData = generateCrystalData(supercellDims.nx, supercellDims.ny, supercellDims.nz, cdConcentration);
            if (!atomData) { // generateCrystalData returns undefined on error
                console.error("[Three.js updateCrystalModel] Failed to generate atom data. Aborting update.");
                // Optionally display an error to the user
                return;
            }

            console.log("[Three.js updateCrystalModel] Rebuilding meshes and labels...");
            // Rebuild spheres, labels, bonds based on new atom data and current style
            createOrUpdateBallAndStickModel(atomData);

            console.log("[Three.js updateCrystalModel] Updating unit cell outline...");
            // Re-create/update the position and scale of the unit cell outline object
            createOrUpdateUnitCellOutlineObject(); // Now handles visibility too

            // Update camera limits based on the potentially new lattice constant
            if (controls) {
                const modelSize = lattice_a * Math.max(supercellDims.nx, supercellDims.ny, supercellDims.nz);
                controls.minDistance = lattice_a * 0.5;
                controls.maxDistance = modelSize * 5;
                controls.update(); // Apply changes
            }
            console.log("[Three.js updateCrystalModel] Model update wrapper complete.");
        }


        // --- UI Setup ---
        function setupUI() {
             controlsContainer.innerHTML = ''; // Clear previous controls
             const controlsWrapper = document.createElement('div');
             // Use unique IDs for controls within this viewer instance
             const sliderId = `${controlsElementId}-cdSlider`;
             const valueId = `${controlsElementId}-cdValue`;
             const spinBtnId = `${controlsElementId}-spinButton`;
             const labelBtnId = `${controlsElementId}-labelToggleButton`; // Corrected ID reference
             const styleSelectId = `${controlsElementId}-styleSelect`; // For view style
             const supercellSelectId = `${controlsElementId}-supercellSelect`; // For supercell size
             const outlineBtnId = `${controlsElementId}-outlineToggleButton`; // Button for outline
             const legendListId = `${controlsElementId}-legendList`;

             // Determine if composition slider is needed
             const showCompositionSlider = vizData.composition.min_x !== vizData.composition.max_x;

             // Supercell Options (use from vizData or default)
             const supercellOptions = vizData.supercell_options || [1]; // Default to [1] if missing

             controlsWrapper.innerHTML = `
                 <h4>${allMaterialDetails.materialName || 'Material'} Controls</h4>

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
                        ${supercellOptions.map(size => `<option value="${size}" ${size === supercellDims.nx ? 'selected': ''}>${size}x${size}x${size}</option>`).join('')}
                     </select>
                 </div>

                 <div class="control-group action-buttons">
                    <button id="${labelBtnId}">${showLabels ? 'Hide' : 'Show'} Labels</button>
                    <button id="${outlineBtnId}">${unitCellOutline?.visible ? 'Hide' : 'Show'} Outline</button> {/* Reflect initial state */}
                    <button id="${spinBtnId}">${isSpinning ? 'Stop Spin' : 'Start Spin'}</button>
                 </div>

                 <div class="control-group">
                     <p style="font-weight: bold; margin-bottom: 5px;">Legend:</p>
                     <ul id="${legendListId}" style="padding-left: 0; list-style: none; font-size: 0.9em;"></ul>
                 </div>

                 <p style="font-size: 12px; margin-top: 15px; color: #555;">Drag to rotate, Scroll to zoom.</p>
             `;
             controlsContainer.appendChild(controlsWrapper);

             // --- Add Listeners using the unique IDs ---
             const slider = document.getElementById(sliderId);
             const valueSpan = document.getElementById(valueId);
             const spinButton = document.getElementById(spinBtnId);
             const labelButton = document.getElementById(labelBtnId);
             const styleSelect = document.getElementById(styleSelectId);
             const supercellSelect = document.getElementById(supercellSelectId);
             const outlineButton = document.getElementById(outlineBtnId); // Get outline button

             // Composition Slider Listener
             if (slider) {
                 slider.addEventListener('input', (event) => { // Update display continuously
                     if (valueSpan) valueSpan.textContent = parseFloat(event.target.value).toFixed(2);
                 });
                 slider.addEventListener('change', (event) => { // Update model on final change
                      cdConcentration = parseFloat(event.target.value);
                      if (valueSpan) valueSpan.textContent = cdConcentration.toFixed(2);
                      updateCrystalModel();
                 });
             }

             // View Style Selector Listener
             if (styleSelect) {
                 styleSelect.addEventListener('change', (event) => {
                     currentViewStyle = event.target.value;
                     updateCrystalModel(); // Rebuild model with new style
                 });
             }

             // Supercell Selector Listener
             if (supercellSelect) {
                 supercellSelect.addEventListener('change', (event) => {
                    const newSize = parseInt(event.target.value);
                    supercellDims.nx = newSize; supercellDims.ny = newSize; supercellDims.nz = newSize;
                    updateCrystalModel(); // Rebuild model with new size
                 });
             }

             // Spin Button Listener
             if (spinButton) {
                 spinButton.addEventListener('click', () => {
                     isSpinning = !isSpinning;
                     spinButton.textContent = isSpinning ? 'Stop Spin' : 'Start Spin';
                     // If stopping, maybe call animate once more to ensure final position is rendered if needed?
                     if (!isSpinning && animationFrameId) animate();
                 });
             }

             // Label Toggle Button Listener
             if (labelButton) {
                 labelButton.addEventListener('click', () => {
                     showLabels = !showLabels;
                     labelButton.textContent = showLabels ? 'Hide Labels' : 'Show Labels';
                     updateCrystalModel(); // Rebuild needed to add/remove labels
                 });
             }

             // Outline Toggle Button Listener
             if (outlineButton) {
                outlineButton.addEventListener('click', () => {
                    if (unitCellOutline) { // Ensure outline object exists
                        unitCellOutline.visible = !unitCellOutline.visible;
                        outlineButton.textContent = unitCellOutline.visible ? 'Hide Outline' : 'Show Outline';
                        // No need to call updateCrystalModel, just need to render the change
                        if (renderer && scene && camera) {
                            renderer.render(scene, camera);
                            if (css2DRenderer) css2DRenderer.render(scene, camera);
                        }
                    }
                });
             }


             // Populate Legend Dynamically
             populateLegendUI(legendListId); // Pass the specific legend list ID

             console.log("[Three.js Simplified] UI Setup Complete");
        }

        // --- Populate Legend UI (Corrected) ---
        function populateLegendUI(legendListId) {
             const legendList = document.getElementById(legendListId);
             if (!legendList) { console.error("Legend list element not found:", legendListId); return; }
             legendList.innerHTML = ''; // Clear existing

             // Check if materials object is ready and atomInfo exists
             if(!atomInfo || Object.keys(atomInfo).length === 0) {
                console.warn("AtomInfo object empty or missing during legend population.");
                legendList.innerHTML = '<li>Legend data missing.</li>';
                return;
             }
             console.log("[populateLegendUI] Materials keys:", Object.keys(materials)); // Log available materials

             Object.entries(atomInfo).forEach(([symbol, info]) => {
                 const upperSymbol = symbol.toUpperCase(); // Use consistent key case
                 const material = materials[upperSymbol];
                 // Use color from existing material if possible, fallback to info.color, then default
                 const color = material ? material.color.getStyle() : (info?.color || '#cccccc');
                 // console.log(`Legend for ${symbol} (key ${upperSymbol}): Color=${color}`); // Log color attempt

                 const li = document.createElement('li');
                 li.style.marginBottom = '3px'; // Add spacing
                 // Use inline-block span for color swatch
                 li.innerHTML = `<span class="color-box" style="display: inline-block; width: 12px; height: 12px; margin-right: 5px; border: 1px solid #ccc; background-color:${color}; vertical-align: middle;"></span> ${symbol} (${info.role || 'Atom'})`;
                 legendList.appendChild(li);
             });

             // Add bond color to legend only if sticks are possible
             if (currentViewStyle === 'ballAndStick' || currentViewStyle === 'stick') {
                 const bondLi = document.createElement('li');
                 bondLi.style.marginTop = '5px'; // Space before bond legend
                 bondLi.innerHTML = `<span class="color-box" style="display: inline-block; width: 12px; height: 12px; margin-right: 5px; border: 1px solid #888; background-color: ${bondMaterial.color.getStyle()}; vertical-align: middle;"></span> Bonds`;
                 legendList.appendChild(bondLi);
             }
         }


        // --- Window Resize Handler ---
        function onWindowResize() {
            if (!camera || !renderer || !css2DRenderer || !viewerContainer) return;
            // Check container size again, useful if it was hidden and revealed
            const width = viewerContainer.clientWidth;
            const height = viewerContainer.clientHeight;
            if (width === 0 || height === 0) return; // Ignore if container is hidden/zero-size

            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            renderer.setSize(width, height);
            css2DRenderer.setSize( width, height ); // Resize CSS renderer too
            // No need to call render here, animate loop will handle it
        }

        // --- Animation Loop ---
        function animate() {
            // Stop loop if renderer is disposed (during cleanup)
            if (!renderer) {
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
                return;
            }
            animationFrameId = requestAnimationFrame(animate); // Request next frame

            // Update controls (for damping)
            if (controls) controls.update();

            // Apply spin if active
            if (isSpinning && crystalModelGroup) {
                crystalModelGroup.rotation.y += spinSpeed; // Rotate around Y axis
            }

            // Render the scene
            if (scene && camera) {
                renderer.render(scene, camera);
                // Render labels using CSS2DRenderer
                if (css2DRenderer) css2DRenderer.render(scene, camera);
            }
        }

         // --- Cleanup Function ---
        function cleanup() {
             console.log("[Three.js Simplified] Cleaning up viewer resources...");
             window.removeEventListener('resize', onWindowResize); // Remove resize listener

             if (animationFrameId) {
                 cancelAnimationFrame(animationFrameId); // Stop animation loop
                 animationFrameId = null;
             }

             // Dispose meshes, geometries (except shared stick), labels
             disposeMeshes(crystalModelGroup);

             // Dispose the shared stick geometry
             if(stickGeometry) stickGeometry.dispose();

             // Dispose the unit cell outline geometry
             if (unitCellOutlineGeometry) unitCellOutlineGeometry.dispose(); unitCellOutlineGeometry = null; unitCellOutline = null;

             // Dispose materials
             Object.values(materials).forEach(mat => { if(mat) mat.dispose(); });
             if(bondMaterial) bondMaterial.dispose(); if(unitCellMaterial) unitCellMaterial.dispose(); if(defaultMaterial) defaultMaterial.dispose();

             // Remove group from scene
             if(scene && crystalModelGroup) scene.remove(crystalModelGroup); crystalModelGroup = null;

             // Dispose renderer and remove its canvas
             if (renderer) {
                 renderer.dispose();
                 if (renderer.domElement?.parentNode) {
                     renderer.domElement.parentNode.removeChild(renderer.domElement);
                 }
                 renderer = null;
             }
             // Remove CSS2D overlay
             if (css2DRenderer) {
                 const cssOverlay = css2DRenderer.domElement?.parentNode;
                 if (cssOverlay?.parentNode) { cssOverlay.parentNode.removeChild(cssOverlay); }
                 css2DRenderer = null;
             }

             // Nullify major objects
             scene = null; camera = null; controls = null;

             // Clear container contents as a final step
             if (viewerContainer) viewerContainer.innerHTML = '';
             if (controlsContainer) controlsContainer.innerHTML = '';

             console.log("[Three.js Simplified] Cleanup complete.");
        }


        // --- === Main Execution Flow === ---
        try {
            console.log("[Three.js Simplified] Starting Main Execution Flow...");
            // 1. Initialize Scene, Camera, Renderer, Controls, Lights, initial Model/Outline
            init();
            // Check if init succeeded before proceeding
            if (!scene || !camera || !renderer || !css2DRenderer || !controls) {
                // Error should have been logged in init() and cleanup called
                throw new Error("[Three.js Simplified Main Flow] Initialization failed: Missing core components after init().");
            }
            // 2. Setup UI Controls and Listeners
            setupUI();
            console.log("[Three.js Simplified] setupUI() completed.");

            // 3. Start Animation Loop
            animate();
            console.log("[Three.js Simplified] Animation loop started.");

             // 4. Optional: Setup MutationObserver for automatic cleanup if the viewer element is removed from DOM
             // This helps prevent memory leaks if the element is dynamically removed by other JS
             const observerTargetNode = viewerContainer.closest('.property-detail-block') || viewerContainer.parentElement; // Observe parent or block
             if (observerTargetNode) {
                 const observer = new MutationObserver((mutationsList, observerInstance) => {
                     for (const mutation of mutationsList) {
                         if (mutation.removedNodes) {
                             mutation.removedNodes.forEach(removedNode => {
                                 // Check if the viewerContainer itself or its wrapper was removed
                                 if (removedNode === viewerContainer || removedNode.contains(viewerContainer)) {
                                     console.log("[Three.js Observer] Viewer element removed from DOM. Cleaning up...");
                                     cleanup(); // Call cleanup function
                                     observerInstance.disconnect(); // Stop observing
                                     return;
                                 }
                             });
                         }
                     }
                 });
                  // Observe the parent node for changes in its children
                 try {
                    observer.observe(observerTargetNode, { childList: true });
                    console.log("[Three.js Simplified Observer] Observing parent node for cleanup.");
                 } catch (obsError) {
                    console.warn("[Three.js Simplified Observer] Could not start observing:", obsError);
                 }

             } else { console.warn("[Three.js Simplified Observer] Could not find suitable parent node to observe for cleanup."); }

        } catch(error) {
            console.error("[Three.js Simplified Error] Initialization or main flow failed:", error);
            // Ensure cleanup is attempted if an error occurs during setup
            cleanup();
            // Display error in container if possible
            if (viewerContainer) viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Failed to initialize viewer. Check console. Error: ${error.message}</p>`;
            if (controlsContainer) controlsContainer.innerHTML = '';
        }

    } // --- End initializeSimplifiedThreeJsViewer ---
    // --- =============================================================== ---
    // ---      *** SIMPLIFIED Three.js Initializer END (FIXED v2) ***      ---
    // --- =============================================================== ---

}); // End DOMContentLoaded
