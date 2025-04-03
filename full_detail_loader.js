// --- START OF FILE full_detail_loader.js ---
console.log("[Full Detail Loader] Script started.");

document.addEventListener("DOMContentLoaded", async () => {
    console.log("[Full Detail Loader] DOMContentLoaded event fired.");

    // --- Get parameters from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");
    console.log("[Full Detail Loader] URL Parameter 'material':", materialNameParam);

    // --- Get DOM elements ---
    const materialNameEl = document.getElementById("material-name");
    const tocListEl = document.getElementById("toc-list");
    const mainContentEl = document.getElementById("main-content");
    const referencesSectionEl = document.getElementById("references-section");
    const referencesListEl = document.getElementById("references-list");
    console.log("[Full Detail Loader] DOM elements obtained.");

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
    if (!materialNameParam) {
        console.error("[Full Detail Loader] Material name missing from URL.");
        displayError("Material name missing from URL parameters.");
        return;
    }
    const materialName = decodeURIComponent(materialNameParam);
    console.log("[Full Detail Loader] Decoded Material Name:", materialName);

    // --- Update Title Bar ---
    if (materialNameEl) {
         materialNameEl.textContent = materialName;
         console.log("[Full Detail Loader] Material name element updated.");
    } else {
         console.warn("[Full Detail Loader] Material name element not found.");
    }
    document.title = `${materialName} - Full Details`;
    console.log("[Full Detail Loader] Document title updated.");

    // --- Construct file path ---
    const safeMaterialName = materialName.replace(/ /g, '_').toLowerCase();
    const detailFilePath = `./details/${safeMaterialName}_details.json`;
    console.log(`[Full Detail Loader] Constructed file path: '${detailFilePath}'`);

    // --- Fetch and Process Data ---
    console.log("[Full Detail Loader] Starting fetch operation...");
    let allMaterialDetails;
    try {
        const response = await fetch(detailFilePath);
        console.log(`[Full Detail Loader] Fetch response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
             const errorText = await response.text();
             console.error(`[Full Detail Loader] Fetch failed: ${response.status}. Response body:`, errorText);
            if (response.status === 404) { throw new Error(`Details file not found: ${detailFilePath}. Check file name and path.`); }
            else { throw new Error(`HTTP error ${response.status} fetching ${detailFilePath}`); }
        }

        console.log("[Full Detail Loader] Fetch successful. Parsing JSON...");
        allMaterialDetails = await response.json();
        if (typeof allMaterialDetails !== 'object' || allMaterialDetails === null) {
             throw new Error(`Invalid JSON structure in ${detailFilePath}. Expected a top-level object.`);
        }
        console.log("[Full Detail Loader] JSON parsed successfully.");
        const sectionDataMap = new Map();

        // --- Process References ---
        console.log("[Full Detail Loader] Processing references...");
        const collectedRefs = new Set();
        const processRefs = (data) => {
             if (typeof data === 'object' && data !== null) {
                 if (data.ref && allMaterialDetails.references && allMaterialDetails.references[data.ref]) { collectedRefs.add(data.ref); }
                 Object.values(data).forEach(value => { if (typeof value === 'object' || Array.isArray(value)) { processRefs(value); } });
             } else if (Array.isArray(data)) { data.forEach(processRefs); }
        };
        processRefs(allMaterialDetails);
        console.log(`[Full Detail Loader] References processed. Found ${collectedRefs.size} unique refs.`);

        // --- Build Table of Contents & Store Section Data ---
        console.log("[Full Detail Loader] Building Table of Contents...");
        if (tocListEl && mainContentEl) {
            tocListEl.innerHTML = '';
            let sectionCount = 0;
            const excludedKeys = ['materialName', 'references'];
            for (const sectionKey in allMaterialDetails) {
                if (excludedKeys.includes(sectionKey)) continue;
                const sectionData = allMaterialDetails[sectionKey];
                 if (typeof sectionData !== 'object' || sectionData === null || typeof sectionData.displayName !== 'string') {
                    console.warn(`[Full Detail Loader] Skipping key '${sectionKey}' (not a valid section object).`);
                    continue;
                }
                sectionDataMap.set(sectionKey, sectionData);
                sectionCount++;
                const sectionDisplayName = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const sectionId = `section-${sectionKey}`;
                const tocLi = document.createElement('li'); const tocLink = document.createElement('a');
                tocLink.href = `#${sectionId}`; tocLink.textContent = sectionDisplayName;
                tocLi.appendChild(tocLink); tocListEl.appendChild(tocLi);
            }
             console.log(`[Full Detail Loader] TOC built with ${sectionCount} sections.`);
             if (sectionCount === 0) { console.warn("[Full Detail Loader] No valid sections found for TOC."); }
        } else { console.warn("[Full Detail Loader] TOC or Main Content element not found."); }

        // --- Populate Sections from Stored Data ---
        console.log("[Full Detail Loader] Populating sections...");
        let populatedSectionCount = 0;
        for (const [sectionKey, sectionData] of sectionDataMap.entries()) {
             const sectionId = `section-${sectionKey}`;
             const sectionElement = document.getElementById(sectionId);
             if (!sectionElement) { console.warn(`HTML section placeholder '${sectionId}' not found.`); continue; }
             const sectionTitleEl = document.getElementById(`${sectionId}-title`);
             const sectionIntroEl = document.getElementById(`${sectionId}-intro`);
             const propertiesContainerEl = document.getElementById(`${sectionId}-properties`);

             if(sectionTitleEl) {
                 sectionTitleEl.textContent = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
             } else {
                 const h2Title = sectionElement.querySelector('h2');
                 if (h2Title) h2Title.textContent = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
             }
             if (sectionIntroEl) {
                 if (sectionData.introduction) { sectionIntroEl.innerHTML = sectionData.introduction; sectionIntroEl.style.display = 'block'; }
                 else { sectionIntroEl.style.display = 'none'; sectionIntroEl.innerHTML = ''; }
             }
             if (propertiesContainerEl && sectionData.properties && typeof sectionData.properties === 'object') {
                 propertiesContainerEl.innerHTML = '';
                 Object.entries(sectionData.properties).forEach(([propKey, propData]) => {
                     const propertyBlockElement = renderPropertyBlock(propKey, propData, allMaterialDetails, propertiesContainerEl);
                     if (propertyBlockElement) { propertiesContainerEl.appendChild(propertyBlockElement); }
                 });
                 propertiesContainerEl.style.display = 'block';
             } else if (propertiesContainerEl) { propertiesContainerEl.style.display = 'none'; }
             sectionElement.style.display = 'block';
             populatedSectionCount++;
        }
         console.log(`[Full Detail Loader] Populated ${populatedSectionCount} sections.`);

        // --- Populate References ---
        console.log("[Full Detail Loader] Populating references section...");
        if (collectedRefs.size > 0 && referencesListEl && allMaterialDetails.references) {
             referencesListEl.innerHTML = ''; const sortedRefs = Array.from(collectedRefs).sort();
             sortedRefs.forEach(refKey => {
                 const refData = allMaterialDetails.references[refKey];
                 if(refData){
                     const li = document.createElement('li'); li.id = `ref-${refKey}`; let linkHtml = refData.text;
                     if(refData.doi){ linkHtml += ` <a href="https://doi.org/${refData.doi}" target="_blank" rel="noopener noreferrer" title="View via DOI">[DOI]</a>`; }
                     li.innerHTML = `<strong>[${refKey}]</strong> ${linkHtml}`; referencesListEl.appendChild(li);
                 } else { console.warn(`Reference key '${refKey}' found but not defined.`); }
             });
             referencesSectionEl.style.display = 'block'; mainContentEl.addEventListener('click', handleRefLinkClick);
              console.log("[Full Detail Loader] References populated.");
        } else if(referencesSectionEl){
             referencesSectionEl.style.display = 'none'; console.log("[Full Detail Loader] No references to populate.");
        }
        console.log("[Full Detail Loader] Data processing complete.");

    } catch (error) {
         console.error("[Full Detail Loader] CRITICAL ERROR in fetch/process:", error);
         displayError(error.message || "Unknown error loading details.");
    }

    // --- Helper Function to Render a Single Property Block ---
    function renderPropertyBlock(propKey, propData, allDetails, parentContainer) {
        // Ensure propData is an object, otherwise skip
        if (typeof propData !== 'object' || propData === null) {
            console.warn(`[renderPropertyBlock] Invalid propData for key '${propKey}'. Skipping.`);
            return null;
        }

        const propBlock = document.createElement('div');
        propBlock.className = 'property-detail-block';
        propBlock.id = `prop-${propKey}`; // Use simple propKey for ID

        const propTitle = document.createElement('h3');
        propTitle.innerHTML = propData.displayName || propKey.replace(/_/g, ' ');
        propBlock.appendChild(propTitle);

        if (propData.summary) {
            const summaryEl = document.createElement('div');
            summaryEl.className = 'summary';
            summaryEl.innerHTML = propData.summary;
            propBlock.appendChild(summaryEl);
        }

        // --- Visualization Integration ---
        if (propKey === 'crystal_structure' && propData.details && propData.details.visualization_data) {
            const vizData = propData.details.visualization_data;
             if (!vizData || typeof vizData !== 'object' || !vizData.atom_info || !vizData.composition || !vizData.lattice_constants) {
                 console.error(`[renderPropertyBlock] Invalid or incomplete visualization_data for '${propKey}'. Skipping viewer initialization.`);
                 const errorDiv = document.createElement('div');
                 errorDiv.className = 'error-message';
                 errorDiv.textContent = 'Error: Visualization data is missing or invalid.';
                 propBlock.appendChild(errorDiv); // Append error message instead of viewer
             } else {
                const viewerContainerId = vizData.container_id || `viewer-container-${propKey}-${Date.now()}`;
                const viewerWrapper = document.createElement('div');
                viewerWrapper.className = 'crystal-viewer-wrapper';
                const viewerHeight = vizData.viewer_height || '450px'; // Default height
                viewerWrapper.style.setProperty('--viewer-height', viewerHeight);

                // ** Structure for Three.js + CSS2D **
                viewerWrapper.innerHTML = `
                    <div id="${viewerContainerId}" class="crystal-viewer-container">
                        <div id="${viewerContainerId}-viewer" class="viewer-area">
                             <p style="padding:20px; color:#888; text-align:center;">Loading 3D Viewer...</p>
                             <!-- CSS2D Renderer Overlay will be added here by JS -->
                        </div>
                        <div id="${viewerContainerId}-controls" class="viewer-controls">
                             <p style="padding:10px; color:#888;">Loading Controls...</p>
                        </div>
                    </div>`;
                propBlock.appendChild(viewerWrapper);

                requestAnimationFrame(() => { // Ensure elements are in DOM
                     // Check for Three.js and necessary components
                     if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined' || typeof THREE.CSS2DRenderer === 'undefined') {
                         console.error("Required 3D library component not loaded!");
                         const viewerArea = document.getElementById(`${viewerContainerId}-viewer`);
                         if(viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Error: Required 3D library component failed to load.</p>`;
                         const controlsArea = document.getElementById(`${viewerContainerId}-controls`);
                         if(controlsArea) controlsArea.innerHTML = '';
                         return;
                     }
                     if (typeof initializeSimplifiedThreeJsViewer === 'function') { // Call the new function name
                        try {
                            initializeSimplifiedThreeJsViewer(`${viewerContainerId}-viewer`, `${viewerContainerId}-controls`, vizData, allDetails);
                        } catch(e) {
                            console.error("Error initializing Simplified Three.js viewer:", e);
                            const viewerArea = document.getElementById(`${viewerContainerId}-viewer`);
                            if (viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Could not load simplified Three.js viewer. Check console.</p>`;
                            const controlsArea = document.getElementById(`${viewerContainerId}-controls`);
                            if (controlsArea) controlsArea.innerHTML = '';
                        }
                     } else {
                         console.error("initializeSimplifiedThreeJsViewer function not found!");
                         const viewerArea = document.getElementById(`${viewerContainerId}-viewer`);
                         if(viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Error: Viewer init script missing.</p>`;
                         const controlsArea = document.getElementById(`${viewerContainerId}-controls`);
                         if(controlsArea) controlsArea.innerHTML = '';
                     }
                });
             } // End else (vizData is valid)
        } // End visualization check

        // --- Process other details subsections ---
        if (propData.details && typeof propData.details === 'object') {
            for (const [detailKey, detailContent] of Object.entries(propData.details)) {
                if (detailKey === 'visualization_data') continue;
                if (!detailContent || (Array.isArray(detailContent) && detailContent.length === 0) || (typeof detailContent === 'object' && !Array.isArray(detailContent) && Object.keys(detailContent).length === 0) ) continue;
                const subsection = document.createElement('div');
                subsection.className = `detail-subsection ${detailKey.replace(/ /g, '_').toLowerCase()}`;
                const subsectionTitle = document.createElement('h4');
                subsectionTitle.dataset.title = detailKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                subsection.appendChild(subsectionTitle);

                 if (Array.isArray(detailContent) && detailKey !== 'equations') {
                     const ul = document.createElement('ul');
                     detailContent.forEach(item => { const li = document.createElement('li'); li.innerHTML = item; ul.appendChild(li); });
                     subsection.appendChild(ul);
                 } else if (detailKey === 'equations' && Array.isArray(detailContent)) {
                      detailContent.forEach(eq => {
                         const eqBlock = document.createElement('div'); eqBlock.className = 'equation-block';
                         if (eq.name) { const nameEl = document.createElement('span'); nameEl.className = 'eq-name'; nameEl.textContent = eq.name; eqBlock.appendChild(nameEl); }
                         if (eq.description) { const descEl = document.createElement('p'); descEl.className = 'eq-desc'; descEl.innerHTML = eq.description; eqBlock.appendChild(descEl); }
                         const formulaContainer = document.createElement('div'); formulaContainer.className = 'eq-formula-container';
                         if (eq.formula_html) { formulaContainer.innerHTML = eq.formula_html; formulaContainer.classList.add('eq-formula-html'); }
                         else if (eq.formula_plain) { formulaContainer.textContent = eq.formula_plain; formulaContainer.classList.add('eq-formula-plain'); }
                         else { formulaContainer.textContent = "[Formula not available]"; formulaContainer.style.cssText = 'font-style: italic; color: #888;'; }
                         eqBlock.appendChild(formulaContainer);
                         if(eq.units){ const unitsEl = document.createElement('div'); unitsEl.className = 'eq-units'; unitsEl.innerHTML = `Units: ${eq.units}`; eqBlock.appendChild(unitsEl); }
                         if (eq.variables && Array.isArray(eq.variables)) { const varsDiv = document.createElement('div'); varsDiv.className = 'eq-vars'; varsDiv.innerHTML = '<strong>Variables:</strong>'; const varsUl = document.createElement('ul'); eq.variables.forEach(v => { const li = document.createElement('li'); li.innerHTML = `<strong>${v.symbol}:</strong> ${v.description}`; varsUl.appendChild(li); }); varsDiv.appendChild(varsUl); eqBlock.appendChild(varsDiv); }
                         if (eq.ref && allDetails.references && allDetails.references[eq.ref]) { const refEl = document.createElement('div'); refEl.className = 'eq-ref'; refEl.innerHTML = `Ref: <a href="#ref-${eq.ref}" class="ref-link" data-ref-key="${eq.ref}">[${eq.ref}]</a>`; eqBlock.appendChild(refEl); }
                         subsection.appendChild(eqBlock);
                     });
                 } else if (detailKey === 'measurement_characterization' && typeof detailContent === 'object') {
                      if(detailContent.techniques && Array.isArray(detailContent.techniques) && detailContent.techniques.length > 0){ const techDiv = document.createElement('div'); techDiv.className = "techniques"; const ulTech = document.createElement('ul'); detailContent.techniques.forEach(tech => { const li = document.createElement('li'); li.innerHTML = tech; ulTech.appendChild(li); }); techDiv.appendChild(ulTech); subsection.appendChild(techDiv); }
                      if(detailContent.considerations && Array.isArray(detailContent.considerations) && detailContent.considerations.length > 0){ const considDiv = document.createElement('div'); considDiv.className = "considerations"; if (subsection.querySelector('.techniques')) { const considTitle = document.createElement('p'); considTitle.innerHTML = '<strong>Considerations:</strong>'; considTitle.style.cssText = 'margin-top: 1rem; margin-bottom: 0.25rem;'; considDiv.appendChild(considTitle); } const ulConsid = document.createElement('ul'); detailContent.considerations.forEach(note => { const li = document.createElement('li'); li.innerHTML = note; ulConsid.appendChild(li); }); considDiv.appendChild(ulConsid); subsection.appendChild(considDiv); }
                 } else if (typeof detailContent === 'string') {
                     const p = document.createElement('p'); p.innerHTML = detailContent; subsection.appendChild(p);
                 } else {
                     console.warn(`Unhandled detail structure for key '${detailKey}' in property '${propKey}'`, detailContent);
                     const pre = document.createElement('pre'); pre.textContent = JSON.stringify(detailContent, null, 2); pre.style.cssText = 'font-size: 0.8em; background-color: #eee; padding: 5px; border-radius: 3px; overflow-x: auto; margin-left: 0.5rem;'; subsection.appendChild(pre);
                 }

                if(subsection.children.length > 1) { propBlock.appendChild(subsection); }
            }
        }
        return propBlock;
    } // --- End renderPropertyBlock ---

    // --- Function to handle reference link clicks ---
    function handleRefLinkClick(event) {
        const link = event.target.closest('a.ref-link[data-ref-key]');
        if (link) {
            event.preventDefault(); const targetId = `ref-${link.dataset.refKey}`; const targetElement = document.getElementById(targetId);
            if (targetElement) { const elementRect = targetElement.getBoundingClientRect(); const absoluteElementTop = elementRect.top + window.pageYOffset; const headerOffset = 60; const viewportHeight = window.innerHeight; const desiredScrollPos = absoluteElementTop - (viewportHeight * 0.3) - headerOffset; window.scrollTo({ top: Math.max(0, desiredScrollPos), behavior: 'smooth' }); document.querySelectorAll('#references-list li.highlight-ref').forEach(el => el.classList.remove('highlight-ref')); targetElement.classList.add('highlight-ref'); setTimeout(() => targetElement.classList.remove('highlight-ref'), 2500); }
            else { console.warn(`Reference target element with ID '${targetId}' not found.`); }
        }
    } // --- End handleRefLinkClick ---


    // --- ================================================================= ---
    // ---      *** SIMPLIFIED Three.js Initializer START (Corrected Scope) *** ---
    // --- ================================================================= ---
    function initializeSimplifiedThreeJsViewer(viewerElementId, controlsElementId, vizData, allMaterialDetails) {
        console.log("--- [Three.js Simplified Init] Initializing Viewer ---");

        const viewerContainer = document.getElementById(viewerElementId);
        const controlsContainer = document.getElementById(controlsElementId);

        if (!viewerContainer || !controlsContainer) {
            console.error("[Three.js Simplified Error] Viewer or controls element not found!");
            return; // Exit if containers aren't found
        }

        // --- WebGL Support Check ---
         try {
             const canvas = document.createElement('canvas');
             if (!window.WebGLRenderingContext || !(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))) {
                 throw new Error("WebGL not supported by the browser.");
             }
         } catch (e) {
             console.error("[Three.js Error] WebGL check failed:", e.message);
             viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Error: WebGL is not supported or enabled in your browser.</p>`;
             controlsContainer.innerHTML = '';
             return; // Exit if WebGL not supported
         }
         console.log("[Three.js Init] WebGL check passed.");

        // --- Scope variables for this viewer instance ---
        let scene, camera, renderer, css2DRenderer, controls;
        let crystalModelGroup = new THREE.Group(); // Group for atoms, bonds, labels, outline
        let unitCellOutline = null; // Holds the outline mesh (LineSegments)
        let isSpinning = false;
        let showLabels = true; // Default to showing labels
        let cdConcentration = vizData.composition?.initial_x ?? 0.5;
        const supercellDims = { nx: 2, ny: 2, nz: 2 }; // Fixed supercell size from example
        const spinSpeed = 0.005;
        let animationFrameId = null; // For stopping the animation loop

        // --- Constants & Config from vizData and example ---
        const atomInfo = vizData.atom_info || {};
        const latticeConstantsSource = vizData.lattice_constants || {};
        let lattice_a = 6.47; // Default, will be calculated

        const sphereScales = { spacefill: 0.55, ballAndStick: 0.28, stick: 0.1 }; // Defined HERE
        const stickRadius = 0.05; // Example had 0.05
        const labelOffset = 0.3;
        const sphereDetail = 12;
        const stickDetail = 6;
        const bondCutoffFactor = 0.5; // Example used 0.5

        // --- Materials (Derived from vizData) ---
        const materials = {};
        const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.4, roughness: 0.6 });
        Object.entries(atomInfo).forEach(([symbol, info]) => {
            materials[symbol.toUpperCase()] = new THREE.MeshStandardMaterial({
                color: info?.color || '#cccccc', metalness: 0.4, roughness: 0.6
            });
        });
        const bondMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.1, roughness: 0.8 });
        const unitCellMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Example blue

        // --- Reusable Geometries (Templates) ---
        const sphereGeometries = {}; // Populated in createOrUpdate based on scale
        const stickGeometry = new THREE.CylinderGeometry(stickRadius, stickRadius, 1, stickDetail, 1); // Template, CLONE before use

        // --- Helper: Dispose Meshes and Geometries within a group ---
        function disposeMeshes(group) {
            if (!group) return;
            // console.log(`[Three.js Cleanup] Disposing meshes in group: ${group.uuid}`);
            const children_to_remove = [...group.children]; // Copy children array
            children_to_remove.forEach(object => {
                if (object.isMesh || object.isLineSegments) {
                    if (object.geometry) {
                         // Only dispose geometries that are cloned or dynamically created
                         // Check against the template stickGeometry AND the dynamic sphereGeometries map
                        let isSharedSphereGeometry = false;
                        for (const key in sphereGeometries) {
                            if (sphereGeometries[key] === object.geometry) {
                                isSharedSphereGeometry = true;
                                break;
                            }
                        }

                        // If it's not the stick template AND not a current sphere geometry template, dispose it.
                        // This primarily targets cloned stick geometries and the cell outline geometry.
                        if (object.geometry !== stickGeometry && !isSharedSphereGeometry) {
                             // console.log(`[Three.js Cleanup] Disposing geometry type: ${object.geometry.type}`);
                             object.geometry.dispose();
                        }
                    }
                    // Materials are shared, handled in main cleanup
                } else if (object.isCSS2DObject && object.element) {
                     // Remove CSS2D elements to prevent memory leaks
                     if (object.element.parentNode) {
                         object.element.parentNode.removeChild(object.element);
                     }
                     object.element = null; // Break reference
                }
                // Remove object from parent
                group.remove(object);
            });
             // console.log(`[Three.js Cleanup] Finished disposing/removing ${children_to_remove.length} children.`);
        }


        // --- Initialize Scene ---
        function init() {
            try {
                // Wait for container to have dimensions
                if (viewerContainer.clientWidth === 0 || viewerContainer.clientHeight === 0) {
                     console.warn("[Three.js Init] Container zero size, delaying init.");
                     requestAnimationFrame(init); return;
                }
                 console.log(`[Three.js Init] Container dimensions: ${viewerContainer.clientWidth}x${viewerContainer.clientHeight}`);
                 while (viewerContainer.firstChild) { viewerContainer.removeChild(viewerContainer.firstChild); } // Clear first

                 console.log("[Three.js Init] Setting up Scene..."); scene = new THREE.Scene(); scene.background = new THREE.Color(0xddeeff);
                 console.log("[Three.js Init] Setting up Camera..."); const width = viewerContainer.clientWidth; const height = viewerContainer.clientHeight; camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000); const initialDist = (lattice_a * supercellDims.nx) * 1.5; camera.position.set(initialDist, initialDist * 0.8, initialDist); camera.lookAt(0, 0, 0);
                 console.log("[Three.js Init] Setting up Renderer..."); renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(width, height); renderer.setPixelRatio(window.devicePixelRatio); viewerContainer.appendChild(renderer.domElement);
                 console.log("[Three.js Init] Setting up CSS2DRenderer..."); const css2dContainer = document.createElement('div'); css2dContainer.className = 'css2d-renderer-overlay'; viewerContainer.appendChild(css2dContainer); css2DRenderer = new THREE.CSS2DRenderer(); css2DRenderer.setSize(width, height); css2dContainer.appendChild(css2DRenderer.domElement);
                 console.log("[Three.js Init] Setting up Controls..."); controls = new THREE.OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.1; controls.minDistance = lattice_a * 0.5; controls.maxDistance = lattice_a * supercellDims.nx * 5;
                 console.log("[Three.js Init] Setting up Lighting..."); const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); scene.add(ambientLight); const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); directionalLight.position.set(5, 10, 7.5); scene.add(directionalLight);
                 console.log("[Three.js Init] Adding crystal group..."); scene.add(crystalModelGroup);
                 window.removeEventListener('resize', onWindowResize); window.addEventListener('resize', onWindowResize);
                 console.log("[Three.js Init] Initialization function complete.");
             } catch(initError) {
                 console.error("[Three.js Error] Error during initThree function:", initError);
                 viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Error setting up 3D scene. Check console.</p>`;
                 cleanup(); throw initError;
             }
        }

        // --- Generate Atom Positions ---
        function generateCrystalData(nx, ny, nz, currentCdConcentration) {
            const atoms = [];
            // console.log(`[Three.js generateAtomData] Input compositionRatio: ${currentCdConcentration}, cellSize: ${nx}`);
            const cation_host_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_host');
            const cation_subst_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_subst');
            const anion_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'anion');
            if (!cation_host_symbol || !cation_subst_symbol || !anion_symbol) { console.error("Atom roles missing."); return []; }
            const a_host = Number(latticeConstantsSource[cation_host_symbol] || 6.46);
            const a_subst = Number(latticeConstantsSource[cation_subst_symbol] || 6.48);
            const ratio = Number(currentCdConcentration); if (isNaN(a_host) || isNaN(a_subst) || isNaN(ratio)) return [];
            lattice_a = a_host * (1 - ratio) + a_subst * ratio; if (isNaN(lattice_a) || lattice_a <= 0) return [];
            console.log(`[Three.js generateAtomData] Calculated lattice constant (a): ${lattice_a.toFixed(4)}`);
            const supercellCenter = new THREE.Vector3( (nx - 1) * lattice_a / 2, (ny - 1) * lattice_a / 2, (nz - 1) * lattice_a / 2 );
            const baseAnion = [ [0.00, 0.00, 0.00], [0.00, 0.50, 0.50], [0.50, 0.00, 0.50], [0.50, 0.50, 0.00] ];
            const baseCation = [ [0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25] ];
            for (let i = 0; i < nx; i++) { for (let j = 0; j < ny; j++) { for (let k = 0; k < nz; k++) {
                const cellOrigin = new THREE.Vector3(i * lattice_a, j * lattice_a, k * lattice_a);
                baseAnion.forEach(pos => { const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2]).multiplyScalar(lattice_a).add(cellOrigin).sub(supercellCenter); if (!isNaN(atomPos.x)) atoms.push({ element: anion_symbol.toUpperCase(), position: atomPos }); });
                baseCation.forEach(pos => { const element = Math.random() < currentCdConcentration ? cation_subst_symbol : cation_host_symbol; const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2]).multiplyScalar(lattice_a).add(cellOrigin).sub(supercellCenter); if (!isNaN(atomPos.x)) atoms.push({ element: element.toUpperCase(), position: atomPos }); });
            }}}
             console.log(`[Three.js] Generated ${atoms.length} atoms.`);
             return atoms;
        }

        // --- Create CSS2D Label Object ---
        function createCSS2DLabel(text) { const div = document.createElement('div'); div.className = 'atom-label'; div.textContent = text; return new THREE.CSS2DObject(div); }

        // --- Create/Update Ball and Stick Model ---
        function createOrUpdateBallAndStickModel(atomData) {
             console.log("[Three.js updateModel] Starting model update...");
             disposeMeshes(crystalModelGroup); // Clear existing objects (excluding potential outline)
             if (unitCellOutline) { crystalModelGroup.add(unitCellOutline); } // Re-add outline if it exists

             const currentSphereScale = sphereScales.ballAndStick; // Fixed style from example
             const bondCutoffSq = (lattice_a * bondCutoffFactor) * (lattice_a * bondCutoffFactor);
             const yAxis = new THREE.Vector3(0, 1, 0);

             // Prepare Sphere Geometries (Dispose old ones first)
             Object.values(sphereGeometries).forEach(geom => { if(geom) geom.dispose(); });
             for (const key in sphereGeometries) delete sphereGeometries[key];
             let allGeometriesValid = true;
             Object.keys(atomInfo).forEach(symbol => {
                 const upperSymbol = symbol.toUpperCase(); const baseRadius = atomInfo[symbol]?.radius ?? 1.0; let radius = baseRadius * currentSphereScale;
                 if (isNaN(radius) || radius <= 1e-3) { radius = 0.05; }
                 try { sphereGeometries[upperSymbol] = new THREE.SphereGeometry(radius, sphereDetail, sphereDetail); }
                 catch(e) { console.error(`Error creating sphere geom for ${upperSymbol}`); allGeometriesValid = false; sphereGeometries[upperSymbol] = null; }
             });
             if (!allGeometriesValid) { console.error("Failed sphere geometry creation."); return; }

            // Add Spheres & Labels
             let spheresAdded = 0, labelsAdded = 0;
             atomData.forEach((atom) => {
                 const symbol = atom.element.toUpperCase(); const geometry = sphereGeometries[symbol]; const material = materials[symbol] || defaultMaterial;
                 if (!geometry || !material || isNaN(atom.position.x)) return;
                 const sphere = new THREE.Mesh(geometry, material); sphere.position.copy(atom.position); crystalModelGroup.add(sphere); spheresAdded++;
                 if (showLabels) { const label = createCSS2DLabel(atom.element); label.position.copy(atom.position); label.position.y += labelOffset; crystalModelGroup.add(label); labelsAdded++; }
             });
             console.log(`[Three.js updateModel] Added ${spheresAdded} spheres, ${labelsAdded} labels.`);

            // Add Sticks
             let bondsAdded = 0; let potentialBondsChecked = 0;
             if (isNaN(bondCutoffSq) || bondCutoffSq <= 0) { console.error(`Invalid bondCutoffSq: ${bondCutoffSq}`); } else {
                 for (let i = 0; i < atomData.length; i++) { for (let j = i + 1; j < atomData.length; j++) {
                     const atom1 = atomData[i]; const atom2 = atomData[j]; if (!atom1 || !atom2 || !atom1.position || !atom2.position || isNaN(atom1.position.x) || isNaN(atom2.position.x)) continue;
                     const distSq = atom1.position.distanceToSquared(atom2.position); potentialBondsChecked++;
                     if (distSq > 1e-6 && distSq < bondCutoffSq) {
                         const role1 = atomInfo[atom1.element]?.role ?? 'unknown'; const role2 = atomInfo[atom2.element]?.role ?? 'unknown';
                         if ((role1.includes('cation') && role2 === 'anion') || (role1 === 'anion' && role2.includes('cation'))) {
                             const distance = Math.sqrt(distSq); if (isNaN(distance) || distance <= 1e-3) continue;
                             const stickMesh = new THREE.Mesh(stickGeometry.clone(), bondMaterial); // Clone geometry
                             stickMesh.position.copy(atom1.position).add(atom2.position).multiplyScalar(0.5);
                             const direction = new THREE.Vector3().subVectors(atom2.position, atom1.position).normalize();
                             const quaternion = new THREE.Quaternion(); if (Math.abs(direction.y) < 1.0 - 1e-6) { quaternion.setFromUnitVectors(yAxis, direction); } else { if (direction.y < 0) quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI); }
                             stickMesh.quaternion.copy(quaternion); stickMesh.scale.set(1, distance, 1);
                             crystalModelGroup.add(stickMesh); bondsAdded++;
                         }
                     }
                 }} // End loops
                 console.log(`[Three.js updateModel] Checked ${potentialBondsChecked} potential bonds, added ${bondsAdded} bonds.`);
             } // End else bondCutoff valid
             console.log(`[Three.js updateModel] Rebuilt model. Total children: ${crystalModelGroup.children.length}`);
        }

        // --- Create Unit Cell Outline ---
        function createUnitCellOutline() {
            if (unitCellOutline) { crystalModelGroup.remove(unitCellOutline); if(unitCellOutline.geometry) unitCellOutline.geometry.dispose(); unitCellOutline = null; } // Dispose old geometry and clear ref

            const supercellHalfSize = new THREE.Vector3( supercellDims.nx * lattice_a / 2.0, supercellDims.ny * lattice_a / 2.0, supercellDims.nz * lattice_a / 2.0 );
            const boxGeo = new THREE.BoxGeometry(supercellHalfSize.x * 2, supercellHalfSize.y * 2, supercellHalfSize.z * 2);
            const edgesGeo = new THREE.EdgesGeometry(boxGeo);
            unitCellOutline = new THREE.LineSegments(edgesGeo, unitCellMaterial); // Assign to the instance variable
            crystalModelGroup.add(unitCellOutline);
            boxGeo.dispose(); // Dispose the temporary box geometry
            console.log("[Three.js Simplified] Created/Updated Unit Cell Outline");
        }


        // --- Update Crystal Model (Wrapper) ---
        function updateCrystalModel() {
            console.log("[Three.js updateCrystalModel] Generating new atom data...");
            const atomData = generateCrystalData(supercellDims.nx, supercellDims.ny, supercellDims.nz, cdConcentration);
            if (!atomData || atomData.length === 0) { console.error("[Three.js updateCrystalModel] Failed to generate atom data."); return; }
            console.log("[Three.js updateCrystalModel] Rebuilding meshes...");
            createOrUpdateBallAndStickModel(atomData); // Rebuilds spheres, labels, bonds
            createUnitCellOutline(); // Rebuilds outline with current lattice_a
            if (controls) { controls.minDistance = lattice_a * 0.5; controls.maxDistance = lattice_a * supercellDims.nx * 5; }
             console.log("[Three.js updateCrystalModel] Model update complete.");
        }


        // --- UI Setup ---
        function setupUI() {
             controlsContainer.innerHTML = ''; // Clear placeholder
             const controlsWrapper = document.createElement('div');
             // Dynamically create controls based on user's example structure AND vizData
             controlsWrapper.innerHTML = `
                 <h2>${allMaterialDetails.materialName || 'Material'} Model</h2>
                 <p>Interactive ${supercellDims.nx}x${supercellDims.ny}x${supercellDims.nz} supercell.</p>
                 ${vizData.composition.min_x !== vizData.composition.max_x ? `
                 <label for="${controlsElementId}-cdSlider">Cd Concentration (x): <span id="${controlsElementId}-cdValue">${cdConcentration.toFixed(2)}</span></label>
                 <input type="range" id="${controlsElementId}-cdSlider" min="${vizData.composition.min_x}" max="${vizData.composition.max_x}" step="0.01" value="${cdConcentration}">
                 ` : `<p>Composition: Fixed</p>`}
                 <button id="${controlsElementId}-spinButton">Start Spin</button>
                 <button id="${controlsElementId}-labelToggleButton">${showLabels ? 'Hide' : 'Show'} Labels</button>
                 <p>Legend:</p>
                 <ul>
                     ${Object.entries(atomInfo).map(([symbol, info]) => `<li><span class="color-box" style="background-color: ${materials[symbol.toUpperCase()]?.color.getStyle() || '#cccccc'};"></span> ${symbol} (${info.role || 'N/A'})</li>`).join('')}
                     <li><span class="color-box" style="background-color: ${bondMaterial.color.getStyle()};"></span> Bonds</li>
                 </ul>
                 <p style="font-size: 12px; margin-top: 15px;">Drag to rotate, Scroll to zoom.</p>
             `;
             controlsContainer.appendChild(controlsWrapper);

             // Attach Listeners
             const slider = document.getElementById(`${controlsElementId}-cdSlider`);
             const valueSpan = document.getElementById(`${controlsElementId}-cdValue`);
             const spinButton = document.getElementById(`${controlsElementId}-spinButton`);
             const labelButton = document.getElementById(`${controlsElementId}-labelToggleButton`);

             if (slider) {
                 slider.addEventListener('change', (event) => { cdConcentration = parseFloat(event.target.value); if (valueSpan) valueSpan.textContent = cdConcentration.toFixed(2); updateCrystalModel(); });
                 slider.addEventListener('input', (event) => { if (valueSpan) valueSpan.textContent = parseFloat(event.target.value).toFixed(2); });
             }
             if (spinButton) { spinButton.addEventListener('click', () => { isSpinning = !isSpinning; spinButton.textContent = isSpinning ? 'Stop Spin' : 'Start Spin'; }); }
             if (labelButton) { labelButton.addEventListener('click', () => { showLabels = !showLabels; labelButton.textContent = showLabels ? 'Hide Labels' : 'Show Labels'; updateCrystalModel(); }); }
             console.log("[Three.js Simplified] UI Setup Complete");
        }

        // --- Window Resize Handler ---
        function onWindowResize() {
            if (!camera || !renderer || !css2DRenderer || !viewerContainer) return;
            const width = viewerContainer.clientWidth; const height = viewerContainer.clientHeight;
            if (width === 0 || height === 0) return;
            camera.aspect = width / height; camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            css2DRenderer.setSize( width, height );
        }

        // --- Animation Loop ---
        function animate() {
            if (!renderer) { if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null; return; }
            animationFrameId = requestAnimationFrame(animate);
            if (isSpinning && crystalModelGroup) { crystalModelGroup.rotation.y += spinSpeed; }
            if (controls) controls.update();
            if (scene && camera) { renderer.render(scene, camera); }
            if (css2DRenderer && scene && camera) { css2DRenderer.render(scene, camera); }
        }

         // --- Cleanup Function ---
        function cleanup() {
             console.log("[Three.js Simplified] Cleaning up viewer resources...");
             window.removeEventListener('resize', onWindowResize);
             if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;

             // Dispose geometries and materials
             disposeMeshes(crystalModelGroup); // Dispose objects *in* the group
             if(scene && crystalModelGroup) scene.remove(crystalModelGroup); // Remove group from scene

             // Dispose *template* geometries
             Object.values(sphereGeometries).forEach(geom => { if(geom) geom.dispose(); });
             if(stickGeometry) stickGeometry.dispose();
             if(unitCellOutline && unitCellOutline.geometry) unitCellOutline.geometry.dispose(); // Dispose outline's geometry

              // Dispose shared materials
             Object.values(materials).forEach(mat => { if(mat) mat.dispose(); });
             if(bondMaterial) bondMaterial.dispose(); if(unitCellMaterial) unitCellMaterial.dispose(); if(defaultMaterial) defaultMaterial.dispose();

             // Dispose renderers and remove elements
             if (renderer) { renderer.dispose(); if (renderer.domElement && renderer.domElement.parentNode) { viewerContainer.removeChild(renderer.domElement); } renderer = null; }
             if (css2DRenderer) { const cssOverlay = viewerContainer.querySelector('.css2d-renderer-overlay'); if (cssOverlay && cssOverlay.parentNode) { viewerContainer.removeChild(cssOverlay); } css2DRenderer = null; }

             // Clear references
             scene = null; camera = null; controls = null; crystalModelGroup = null; unitCellOutline = null;
             console.log("[Three.js Simplified] Cleanup complete.");
        }


        // --- === Main Execution Flow === ---
        try {
            console.log("[Three.js Simplified] Starting Main Execution Flow...");
            init(); // Setup scene, camera, renderer, etc.

            if (!scene || !camera || !renderer || !css2DRenderer || !controls) {
                 throw new Error("[Three.js Simplified Main Flow] Failed to initialize critical Three.js components in init().");
            }

            setupUI(); // Setup control listeners
            console.log("[Three.js Simplified] setupUI() completed.");

            // Initial data generation and scene population already called within init via updateCrystalModel
            // updateCrystalModel(); // No need to call again here

            animate(); // Start rendering loop
            console.log("[Three.js Simplified] Animation loop started.");

             // Setup MutationObserver for cleanup
             const observer = new MutationObserver((mutationsList, observerInstance) => {
                 for(let mutation of mutationsList) {
                     if (mutation.removedNodes) {
                         mutation.removedNodes.forEach(node => {
                             if (node === viewerContainer || node === viewerContainer.closest('.crystal-viewer-wrapper')) {
                                 console.log("[Three.js Simplified Observer] Viewer removed, cleaning up.");
                                 cleanup(); observerInstance.disconnect(); return;
                             }
                         });
                     }
                 }
             });
             const observeTarget = viewerContainer.closest('.crystal-viewer-wrapper')?.parentNode;
             if (observeTarget) { observer.observe(observeTarget, { childList: true }); }
             else { console.warn("[Three.js Simplified Observer] Could not find parent to observe."); }

        } catch(error) {
            console.error("[Three.js Simplified Error] Initialization failed:", error);
            if (viewerContainer) viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Failed init. Check console. Error: ${error.message}</p>`;
            if (controlsContainer) controlsContainer.innerHTML = '';
            cleanup();
        }

    } // --- End initializeSimplifiedThreeJsViewer ---
    // --- =============================================================== ---
    // ---      *** SIMPLIFIED Three.js Initializer END (Corrected Scope) *** ---
    // --- =============================================================== ---

}); // End DOMContentLoaded
