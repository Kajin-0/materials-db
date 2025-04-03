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
        const processRefs = (data) => { /* ... Reference processing ... */
             if (typeof data === 'object' && data !== null) { if (data.ref && allMaterialDetails.references && allMaterialDetails.references[data.ref]) { collectedRefs.add(data.ref); } Object.values(data).forEach(value => { if (typeof value === 'object' || Array.isArray(value)) { processRefs(value); } }); } else if (Array.isArray(data)) { data.forEach(processRefs); }
        };
        processRefs(allMaterialDetails);
        console.log(`[Full Detail Loader] References processed: ${collectedRefs.size}`);

        // --- Build Table of Contents ---
        if (tocListEl && mainContentEl) {
            tocListEl.innerHTML = ''; let sectionCount = 0;
            const excludedKeys = ['materialName', 'references'];
            for (const sectionKey in allMaterialDetails) {
                if (excludedKeys.includes(sectionKey)) continue;
                const sectionData = allMaterialDetails[sectionKey];
                 if (typeof sectionData !== 'object' || sectionData === null || typeof sectionData.displayName !== 'string') continue;
                sectionDataMap.set(sectionKey, sectionData); sectionCount++;
                const sectionDisplayName = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const sectionId = `section-${sectionKey}`; const tocLi = document.createElement('li'); const tocLink = document.createElement('a');
                tocLink.href = `#${sectionId}`; tocLink.textContent = sectionDisplayName; tocLi.appendChild(tocLink); tocListEl.appendChild(tocLi);
            }
             console.log(`[Full Detail Loader] TOC built: ${sectionCount} sections.`);
        } else { console.warn("TOC elements not found."); }

        // --- Populate Sections ---
        let populatedSectionCount = 0;
        for (const [sectionKey, sectionData] of sectionDataMap.entries()) {
             const sectionId = `section-${sectionKey}`; const sectionElement = document.getElementById(sectionId);
             if (!sectionElement) continue;
             const h2Title = sectionElement.querySelector('h2'); if (h2Title) { h2Title.textContent = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); }
             const sectionIntroEl = document.getElementById(`${sectionId}-intro`); if (sectionIntroEl) { if (sectionData.introduction) { sectionIntroEl.innerHTML = sectionData.introduction; sectionIntroEl.style.display = 'block'; } else { sectionIntroEl.style.display = 'none'; sectionIntroEl.innerHTML = ''; } }
             const propertiesContainerEl = document.getElementById(`${sectionId}-properties`);
             if (propertiesContainerEl && sectionData.properties && typeof sectionData.properties === 'object') { propertiesContainerEl.innerHTML = ''; Object.entries(sectionData.properties).forEach(([propKey, propData]) => { const propertyBlockElement = renderPropertyBlock(propKey, propData, allMaterialDetails, propertiesContainerEl); if (propertyBlockElement) { propertiesContainerEl.appendChild(propertyBlockElement); } }); propertiesContainerEl.style.display = 'block'; }
             else if (propertiesContainerEl) { propertiesContainerEl.style.display = 'none'; }
             sectionElement.style.display = 'block'; populatedSectionCount++;
        }
         console.log(`[Full Detail Loader] Populated ${populatedSectionCount} sections.`);

        // --- Populate References ---
        if (collectedRefs.size > 0 && referencesListEl && allMaterialDetails.references) {
             referencesListEl.innerHTML = ''; const sortedRefs = Array.from(collectedRefs).sort();
             sortedRefs.forEach(refKey => { const refData = allMaterialDetails.references[refKey]; if(refData){ const li = document.createElement('li'); li.id = `ref-${refKey}`; let linkHtml = refData.text; if(refData.doi){ linkHtml += ` <a href="https://doi.org/${refData.doi}" target="_blank" rel="noopener noreferrer">[DOI]</a>`; } li.innerHTML = `<strong>[${refKey}]</strong> ${linkHtml}`; referencesListEl.appendChild(li); } else { console.warn(`Ref key '${refKey}' not defined.`); } });
             referencesSectionEl.style.display = 'block'; mainContentEl.addEventListener('click', handleRefLinkClick);
              console.log("[Full Detail Loader] References populated.");
        } else if(referencesSectionEl){ referencesSectionEl.style.display = 'none'; }
        console.log("[Full Detail Loader] Data processing complete.");

    } catch (error) {
         console.error("[Full Detail Loader] CRITICAL ERROR in fetch/process:", error);
         displayError(error.message || "Unknown error loading details.");
    }

    // --- Helper Function to Render a Single Property Block ---
    function renderPropertyBlock(propKey, propData, allDetails, parentContainer) {
        if (typeof propData !== 'object' || propData === null) return null;
        const propBlock = document.createElement('div'); propBlock.className = 'property-detail-block'; propBlock.id = `prop-${propKey}`;
        const propTitle = document.createElement('h3'); propTitle.innerHTML = propData.displayName || propKey.replace(/_/g, ' '); propBlock.appendChild(propTitle);
        if (propData.summary) { const summaryEl = document.createElement('div'); summaryEl.className = 'summary'; summaryEl.innerHTML = propData.summary; propBlock.appendChild(summaryEl); }

        // --- Visualization Integration ---
        if (propKey === 'crystal_structure' && propData.details && propData.details.visualization_data) {
            const vizData = propData.details.visualization_data;
             if (!vizData || typeof vizData !== 'object' || !vizData.atom_info || !vizData.composition || !vizData.lattice_constants) {
                 console.error(`[renderPropertyBlock] Invalid viz_data for '${propKey}'.`);
                 const errorDiv = document.createElement('div'); errorDiv.className = 'error-message'; errorDiv.textContent = 'Error: Visualization data is invalid or incomplete.'; propBlock.appendChild(errorDiv);
             } else {
                const viewerContainerId = vizData.container_id || `viewer-container-${propKey}-${Date.now()}`;
                const viewerWrapper = document.createElement('div'); viewerWrapper.className = 'crystal-viewer-wrapper';
                const viewerHeight = vizData.viewer_height || '450px'; viewerWrapper.style.setProperty('--viewer-height', viewerHeight);
                viewerWrapper.innerHTML = `
                    <div id="${viewerContainerId}" class="crystal-viewer-container">
                        <div id="${viewerContainerId}-viewer" class="viewer-area"><p style="padding:20px; color:#888; text-align:center;">Loading 3D Viewer...</p></div>
                        <div id="${viewerContainerId}-controls" class="viewer-controls"><p style="padding:10px; color:#888;">Loading Controls...</p></div>
                    </div>`;
                propBlock.appendChild(viewerWrapper);
                 // Delay initialization slightly to ensure elements are in the DOM
                requestAnimationFrame(() => {
                     // Check for Three.js components existence
                     if (typeof THREE === 'undefined') { console.error("THREE is not defined!"); return; }
                     if (typeof THREE.OrbitControls === 'undefined') { console.error("OrbitControls is not defined!"); return; }
                     if (typeof THREE.CSS2DRenderer === 'undefined' || typeof THREE.CSS2DObject === 'undefined') { console.error("CSS2DRenderer or CSS2DObject is not defined!"); return; }

                     if (typeof initializeSimplifiedThreeJsViewer === 'function') {
                        try {
                            // Make sure the target elements exist before calling init
                            const targetViewerEl = document.getElementById(`${viewerContainerId}-viewer`);
                            const targetControlsEl = document.getElementById(`${viewerContainerId}-controls`);
                            if(targetViewerEl && targetControlsEl) {
                                initializeSimplifiedThreeJsViewer(`${viewerContainerId}-viewer`, `${viewerContainerId}-controls`, vizData, allDetails);
                            } else {
                                console.error(`Target elements for viewer ${viewerContainerId} not found.`);
                                if(targetViewerEl) targetViewerEl.innerHTML = '<p class="error-message">Error: Viewer element missing.</p>';
                            }
                        } catch(e) {
                            console.error("Error initializing viewer:", e);
                            const targetViewerEl = document.getElementById(`${viewerContainerId}-viewer`);
                            if(targetViewerEl) targetViewerEl.innerHTML = `<p class="error-message">Error initializing 3D viewer: ${e.message}</p>`;
                        }
                     } else {
                         console.error("Viewer initialization function 'initializeSimplifiedThreeJsViewer' not found!");
                         const targetViewerEl = document.getElementById(`${viewerContainerId}-viewer`);
                         if(targetViewerEl) targetViewerEl.innerHTML = '<p class="error-message">Error: Viewer code not loaded.</p>';
                     }
                });
             }
        }

        // --- Process other details subsections ---
        if (propData.details && typeof propData.details === 'object') {
            for (const [detailKey, detailContent] of Object.entries(propData.details)) {
                 if (detailKey === 'visualization_data') continue;
                 if (!detailContent || (Array.isArray(detailContent) && detailContent.length === 0) || (typeof detailContent === 'object' && !Array.isArray(detailContent) && Object.keys(detailContent).length === 0) ) continue;
                 const subsection = document.createElement('div'); subsection.className = `detail-subsection ${detailKey.replace(/ /g, '_').toLowerCase()}`;
                 const subsectionTitle = document.createElement('h4'); subsectionTitle.dataset.title = detailKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); subsection.appendChild(subsectionTitle);
                 // Simplified content rendering logic (ensure full logic is present here)
                  if (Array.isArray(detailContent) && detailKey !== 'equations') { const ul = document.createElement('ul'); detailContent.forEach(item => { const li = document.createElement('li'); li.innerHTML = item; ul.appendChild(li); }); subsection.appendChild(ul); }
                  else if (detailKey === 'equations' && Array.isArray(detailContent)) { detailContent.forEach(eq => { /* ... eq block generation ... */ const eqBlock = document.createElement('div'); eqBlock.className = 'equation-block'; /* ... */ subsection.appendChild(eqBlock); }); }
                  else if (detailKey === 'measurement_characterization' && typeof detailContent === 'object') { /* ... measurement block ... */ }
                  else if (typeof detailContent === 'string') { const p = document.createElement('p'); p.innerHTML = detailContent; subsection.appendChild(p); }
                  else { /* ... JSON fallback ... */ }
                 if(subsection.children.length > 1) { propBlock.appendChild(subsection); }
            }
        }
        return propBlock;
    } // --- End renderPropertyBlock ---

    // --- Function to handle reference link clicks ---
    function handleRefLinkClick(event) { /* ... reference highlighting logic ... */ }


    // --- ================================================================= ---
    // ---      *** SIMPLIFIED Three.js Initializer START (FIXED) ***       ---
    // --- ================================================================= ---
    function initializeSimplifiedThreeJsViewer(viewerElementId, controlsElementId, vizData, allMaterialDetails) {
        console.log("--- [Three.js Simplified Init] Initializing Viewer ---");

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
        let crystalModelGroup = new THREE.Group();
        let unitCellOutline = null;
        let isSpinning = false;
        let showLabels = true;
        let cdConcentration = vizData.composition?.initial_x ?? 0.5;
        const supercellDims = { nx: 2, ny: 2, nz: 2 };
        const spinSpeed = 0.005;
        let animationFrameId = null;
        let currentViewStyle = 'ballAndStick'; // <<< FIX 1: Define default view style

        // --- Constants & Config ---
        const atomInfo = vizData.atom_info || {};
        const latticeConstantsSource = vizData.lattice_constants || {};
        let lattice_a = 6.47; // Default, will be calculated

        const sphereScales = { spacefill: 0.55, ballAndStick: 0.28, stick: 0.1 };
        const stickRadius = 0.05;
        const labelOffset = 0.3;
        const sphereDetail = 12;
        const stickDetail = 6;
        const fallbackBondCutoffFactor = 0.45; // Fallback if JSON value is missing/invalid

        // --- Materials ---
        const materials = {};
        const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.4, roughness: 0.6 });
        Object.entries(atomInfo).forEach(([symbol, info]) => {
            materials[symbol.toUpperCase()] = new THREE.MeshStandardMaterial({ color: info?.color || '#cccccc', metalness: 0.4, roughness: 0.6 });
        });
        const bondMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.1, roughness: 0.8 });
        const unitCellMaterial = new THREE.LineBasicMaterial({ color: 0x3333ff, linewidth: 1.5 }); // Solid blue line for outline

        // --- Reusable Geometries ---
        const sphereGeometries = {};
        const stickGeometry = new THREE.CylinderGeometry(stickRadius, stickRadius, 1, stickDetail, 1); // Template

        // --- Helper: Dispose Meshes ---
        function disposeMeshes(group) {
             if (!group) return;
             const children_to_remove = [...group.children];
             children_to_remove.forEach(object => {
                // IMPORTANT: Do NOT remove the unit cell outline here
                if (object === unitCellOutline) return;

                 if (object.isMesh || object.isLineSegments) {
                     if (object.geometry && object.geometry !== stickGeometry) { // Don't dispose stick template
                         object.geometry.dispose();
                     }
                     // Materials are shared, dispose them in cleanup()
                 } else if (object.isCSS2DObject && object.element?.parentNode) { // Remove CSS element if attached
                    object.element.parentNode.removeChild(object.element);
                    object.element = null; // Allow garbage collection
                 }
                 group.remove(object); // Remove from Three.js group
             });
         }

        // --- Initialize Scene ---
        function init() {
            try {
                 // Wait if container has no dimensions yet
                if (viewerContainer.clientWidth === 0 || viewerContainer.clientHeight === 0) {
                    console.warn("[Three.js Init] Container size 0, delaying init.");
                    requestAnimationFrame(init);
                    return;
                }
                console.log(`[Three.js Init] Container: ${viewerContainer.clientWidth}x${viewerContainer.clientHeight}`);
                // Clear any previous content (like error messages)
                while (viewerContainer.firstChild) { viewerContainer.removeChild(viewerContainer.firstChild); }

                scene = new THREE.Scene(); scene.background = new THREE.Color(0xddeeff);
                const width = viewerContainer.clientWidth; const height = viewerContainer.clientHeight;
                camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
                // Initial camera distance calculation needs lattice_a, calculate it first
                calculateLatticeConstant(cdConcentration); // Calculate initial lattice_a
                const initialDist = (lattice_a * supercellDims.nx) * 1.5;
                camera.position.set(initialDist * 0.8, initialDist * 0.6, initialDist); // Adjusted view angle
                camera.lookAt(0, 0, 0);

                renderer = new THREE.WebGLRenderer({ antialias: true });
                renderer.setSize(width, height); renderer.setPixelRatio(window.devicePixelRatio);
                viewerContainer.appendChild(renderer.domElement);

                // Setup CSS2D Renderer - Create overlay dynamically
                const css2dContainer = document.createElement('div');
                css2dContainer.style.position = 'absolute';
                css2dContainer.style.top = '0';
                css2dContainer.style.left = '0';
                css2dContainer.style.width = '100%';
                css2dContainer.style.height = '100%';
                css2dContainer.style.pointerEvents = 'none'; // Allow interaction with WebGL canvas below
                css2dContainer.style.overflow = 'hidden'; // Prevent scrollbars
                viewerContainer.appendChild(css2dContainer); // Add overlay to viewer container

                css2DRenderer = new THREE.CSS2DRenderer();
                css2DRenderer.setSize(width, height);
                css2dContainer.appendChild(css2DRenderer.domElement); // Add renderer to the overlay

                controls = new THREE.OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.1;
                controls.minDistance = lattice_a * 0.5; controls.maxDistance = lattice_a * supercellDims.nx * 5;

                const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); scene.add(ambientLight);
                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); directionalLight.position.set(5, 10, 7.5); scene.add(directionalLight);
                scene.add(crystalModelGroup); // Add the group that will hold everything

                // Initial Model Creation
                createUnitCellOutline(); // Create outline mesh (will be added to group)
                updateCrystalModel();   // Create atoms/bonds/labels (will add to group)

                window.removeEventListener('resize', onWindowResize); // Remove previous listener if any
                window.addEventListener('resize', onWindowResize);

                console.log("[Three.js Simplified] Init function complete.");
             } catch(initError) {
                console.error("[Three.js Error] Error during initThree:", initError);
                viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Error setting up scene: ${initError.message}</p>`;
                cleanup();
                throw initError; // Re-throw if needed by outer context
             }
        }

        // --- Calculate Lattice Constant ---
        function calculateLatticeConstant(currentConcentration) {
            const cation_host_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_host');
            const cation_subst_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_subst');
            if (!cation_host_symbol || !cation_subst_symbol) {
                console.warn("Cannot calculate lattice constant: host/subst roles missing.");
                return; // Keep default lattice_a
            }
            const a_host = Number(latticeConstantsSource[cation_host_symbol]);
            const a_subst = Number(latticeConstantsSource[cation_subst_symbol]);
            const ratio = Number(currentConcentration);
            if (isNaN(a_host) || isNaN(a_subst) || isNaN(ratio)) {
                console.warn("Invalid values for Vegard's law calculation.");
                return; // Keep current lattice_a
            }
            const calculated_a = a_host * (1 - ratio) + a_subst * ratio;
            if (!isNaN(calculated_a) && calculated_a > 0) {
                lattice_a = calculated_a;
                // console.log(`[Three.js] Calculated lattice_a: ${lattice_a.toFixed(4)} for x=${ratio.toFixed(2)}`);
            }
        }


        // --- Generate Atom Positions ---
        function generateCrystalData(nx, ny, nz, currentCdConcentration) {
             const atoms = [];
             calculateLatticeConstant(currentCdConcentration); // Ensure lattice_a is up-to-date

             const cation_host_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_host');
             const cation_subst_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_subst');
             const anion_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'anion');
             if (!cation_host_symbol || !cation_subst_symbol || !anion_symbol) { console.error("Atom roles missing for data generation."); return []; }

             // FIX 4: Correct Supercell Centering (Center of Volume)
             const supercellCenter = new THREE.Vector3(
                  (nx * lattice_a) / 2.0 - lattice_a / 2.0,
                  (ny * lattice_a) / 2.0 - lattice_a / 2.0,
                  (nz * lattice_a) / 2.0 - lattice_a / 2.0
             );

             const baseAnion = [ [0.00, 0.00, 0.00], [0.00, 0.50, 0.50], [0.50, 0.00, 0.50], [0.50, 0.50, 0.00] ];
             const baseCation = [ [0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25] ];
             for (let i = 0; i < nx; i++) { for (let j = 0; j < ny; j++) { for (let k = 0; k < nz; k++) {
                 const cellOrigin = new THREE.Vector3(i * lattice_a, j * lattice_a, k * lattice_a);
                 baseAnion.forEach(pos => {
                     const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2]).multiplyScalar(lattice_a).add(cellOrigin).sub(supercellCenter); // Apply centering
                     if (!isNaN(atomPos.x)) atoms.push({ element: anion_symbol.toUpperCase(), position: atomPos });
                 });
                 baseCation.forEach(pos => {
                     const element = Math.random() < currentCdConcentration ? cation_subst_symbol : cation_host_symbol;
                     const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2]).multiplyScalar(lattice_a).add(cellOrigin).sub(supercellCenter); // Apply centering
                     if (!isNaN(atomPos.x)) atoms.push({ element: element.toUpperCase(), position: atomPos });
                 });
             }}}
             console.log(`[Three.js] Generated ${atoms.length} atoms with lattice_a = ${lattice_a.toFixed(3)}.`);
             return atoms;
         }

        // --- Create CSS2D Label Object ---
        function createCSS2DLabel(text) {
            const div = document.createElement('div');
            div.className = 'atom-label'; // Defined in CSS
            div.textContent = text;
            const label = new THREE.CSS2DObject(div);
            label.layers.set(0); // Render on default layer
            return label;
        }

        // --- Create/Update Ball and Stick Model ---
        function createOrUpdateBallAndStickModel(atomData) {
             console.log("[Three.js updateModel] Rebuilding model...");
             disposeMeshes(crystalModelGroup); // Clear existing objects first (except outline)

             // FIX 1: Ensure currentViewStyle is used
             const currentSphereScale = sphereScales[currentViewStyle] || sphereScales.ballAndStick;

             // FIX 2: Use JSON bond cutoff primarily
             const jsonBondCutoff = Number(vizData.bond_cutoff);
             const bondCutoff = (!isNaN(jsonBondCutoff) && jsonBondCutoff > 0)
                                ? jsonBondCutoff
                                : (lattice_a * fallbackBondCutoffFactor); // Use calculated fallback
             const bondCutoffSq = bondCutoff * bondCutoff;
             if (isNaN(bondCutoffSq) || bondCutoffSq <= 0) {
                 console.error(`[Three.js updateModel] Invalid bondCutoffSq derived: ${bondCutoffSq}. No bonds will be generated.`);
             } else {
                 console.log(`[Three.js updateModel] Using bond cutoff: ${bondCutoff.toFixed(3)} (Cutoff²: ${bondCutoffSq.toFixed(3)})`);
             }

             const yAxis = new THREE.Vector3(0, 1, 0);

             // Prepare Sphere Geometries (regenerate based on current scale)
             Object.values(sphereGeometries).forEach(geom => { if(geom) geom.dispose(); });
             for (const key in sphereGeometries) delete sphereGeometries[key];
             let allGeometriesValid = true;
             Object.keys(atomInfo).forEach(symbol => {
                 const upperSymbol = symbol.toUpperCase();
                 const baseRadius = atomInfo[symbol]?.radius ?? 1.0;
                 let radius = baseRadius * currentSphereScale;
                 if (isNaN(radius) || radius <= 1e-3) { radius = 0.05; } // Min radius
                 try {
                     sphereGeometries[upperSymbol] = new THREE.SphereGeometry(radius, sphereDetail, sphereDetail);
                 } catch(e) {
                     console.error(`Error creating sphere geom for ${upperSymbol}: ${e.message}`);
                     allGeometriesValid = false; sphereGeometries[upperSymbol] = null;
                 }
             });
             if (!allGeometriesValid) { console.error("Failed to create some sphere geometries."); return; }

            // Add Spheres & Labels
             let spheresAdded = 0, labelsAdded = 0;
             atomData.forEach((atom) => {
                 const symbol = atom.element.toUpperCase(); const geometry = sphereGeometries[symbol]; const material = materials[symbol] || defaultMaterial;
                 if (!geometry || !material || isNaN(atom.position.x)) return;
                 const sphere = new THREE.Mesh(geometry, material); sphere.position.copy(atom.position); crystalModelGroup.add(sphere); spheresAdded++;
                 if (showLabels) {
                     const label = createCSS2DLabel(atom.element);
                     label.position.copy(atom.position);
                     label.position.y += labelOffset; // Position slightly above the atom
                     crystalModelGroup.add(label); // Add label to the same group
                     labelsAdded++;
                 }
             });
             console.log(`[Three.js updateModel] Added ${spheresAdded} spheres, ${labelsAdded} labels.`);

            // Add Sticks only if required by style and cutoff is valid
             let bondsAdded = 0;
             if ((currentViewStyle === 'stick' || currentViewStyle === 'ballAndStick') && bondCutoffSq > 0) {
                 for (let i = 0; i < atomData.length; i++) { for (let j = i + 1; j < atomData.length; j++) {
                     const atom1 = atomData[i]; const atom2 = atomData[j]; if (!atom1 || !atom2 || !atom1.position || !atom2.position || isNaN(atom1.position.x) || isNaN(atom2.position.x)) continue;
                     const distSq = atom1.position.distanceToSquared(atom2.position);
                     if (distSq > 1e-6 && distSq < bondCutoffSq) { // Check distance vs cutoff
                         const role1 = atomInfo[atom1.element]?.role ?? 'unknown';
                         const role2 = atomInfo[atom2.element]?.role ?? 'unknown';
                         // Ensure bonding only between Cation and Anion
                         if ((role1.includes('cation') && role2 === 'anion') || (role1 === 'anion' && role2.includes('cation'))) {
                             const distance = Math.sqrt(distSq); if (isNaN(distance) || distance <= 1e-3) continue; // Validate distance
                             // Create stick mesh - Clone geometry, reuse material
                             const stickMesh = new THREE.Mesh(stickGeometry, bondMaterial); // Use template geometry directly
                             stickMesh.position.copy(atom1.position).add(atom2.position).multiplyScalar(0.5); // Position stick at midpoint
                             // Orient stick
                             const direction = new THREE.Vector3().subVectors(atom2.position, atom1.position).normalize();
                             const quaternion = new THREE.Quaternion();
                             // Handle edge case where direction is parallel to yAxis
                             if (Math.abs(direction.y) < 1.0 - 1e-6) {
                                 quaternion.setFromUnitVectors(yAxis, direction);
                             } else if (direction.y < 0) {
                                 // Pointing straight down - rotate 180 degrees around X or Z
                                 quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
                             } // Else: pointing straight up, quaternion is identity (no rotation needed)
                             stickMesh.quaternion.copy(quaternion);
                             // Scale stick to correct length (along its local Y axis)
                             stickMesh.scale.set(1, distance, 1);
                             crystalModelGroup.add(stickMesh);
                             bondsAdded++;
                         }
                     }
                 }} // End loops
                 console.log(`[Three.js updateModel] Added ${bondsAdded} bonds.`);
             } // End if need bonds
             console.log(`[Three.js updateModel] Rebuilt model. Total children in group: ${crystalModelGroup.children.length}`);
        }

        // --- Create Unit Cell Outline ---
        function createUnitCellOutline() {
             // FIX 3: Corrected logic for single unit cell outline
             if (unitCellOutline && unitCellOutline.parent) {
                 crystalModelGroup.remove(unitCellOutline);
             }
             if (unitCellOutline && unitCellOutline.geometry) {
                 unitCellOutline.geometry.dispose(); // Dispose old geometry
             }

             // 1. Create geometry for ONE unit cell centered at origin temporarily
             const singleUnitCellGeo = new THREE.BoxGeometry(lattice_a, lattice_a, lattice_a);
             const edgesGeo = new THREE.EdgesGeometry(singleUnitCellGeo);

             // 2. Calculate position for the FIRST unit cell's outline center
             //    (Relative to the supercell center which is at world 0,0,0)
             const supercellCenterOffset = new THREE.Vector3(
                 (supercellDims.nx * lattice_a) / 2.0 - lattice_a / 2.0,
                 (supercellDims.ny * lattice_a) / 2.0 - lattice_a / 2.0,
                 (supercellDims.nz * lattice_a) / 2.0 - lattice_a / 2.0
             );
             // The first cell's origin was at (0,0,0) before centering.
             // Its center was at (a/2, a/2, a/2) before centering.
             // After centering, its center is at (a/2, a/2, a/2) - supercellCenterOffset
             const outlinePosition = new THREE.Vector3(lattice_a / 2, lattice_a / 2, lattice_a / 2)
                                       .sub(supercellCenterOffset);

             unitCellOutline = new THREE.LineSegments(edgesGeo, unitCellMaterial); // Use the defined material
             unitCellOutline.position.copy(outlinePosition); // Position the center of the outline box
             // unitCellOutline.computeLineDistances(); // Only needed for LineDashedMaterial

             crystalModelGroup.add(unitCellOutline); // Add to the group that spins
             singleUnitCellGeo.dispose(); // Dispose temporary BoxGeometry
             console.log("[Three.js Simplified] Created/Updated Single Unit Cell Outline");
         }

        // --- Update Crystal Model (Wrapper) ---
        function updateCrystalModel() {
            console.log("[Three.js updateCrystalModel] Generating atom data...");
            const atomData = generateCrystalData(supercellDims.nx, supercellDims.ny, supercellDims.nz, cdConcentration);
            if (!atomData || atomData.length === 0) { console.error("[Three.js updateCrystalModel] Failed to generate atom data."); return; }
            console.log("[Three.js updateCrystalModel] Rebuilding meshes...");
            createOrUpdateBallAndStickModel(atomData); // Rebuilds spheres, labels, bonds
            // Outline is already managed within createOrUpdate and created in init
            // createUnitCellOutline(); // Don't call here unless lattice_a changes *significantly* require geometry rebuild

            // Update controls based on potentially new lattice_a
            if (controls) {
                controls.minDistance = lattice_a * 0.5;
                controls.maxDistance = lattice_a * supercellDims.nx * 5;
            }
            console.log("[Three.js updateCrystalModel] Model update wrapper complete.");
        }


        // --- UI Setup ---
        function setupUI() {
             controlsContainer.innerHTML = ''; // Clear previous controls
             const controlsWrapper = document.createElement('div');
             controlsWrapper.innerHTML = `
                 <h2>${allMaterialDetails.materialName || 'Material'} Model</h2>
                 <p>Interactive ${supercellDims.nx}x${supercellDims.ny}x${supercellDims.nz} supercell.</p>
                 ${(vizData.composition.min_x !== vizData.composition.max_x) ? `
                 <label for="${controlsElementId}-cdSlider">Cd Concentration (x): <span id="${controlsElementId}-cdValue">${cdConcentration.toFixed(2)}</span></label>
                 <input type="range" id="${controlsElementId}-cdSlider" min="${vizData.composition.min_x}" max="${vizData.composition.max_x}" step="0.01" value="${cdConcentration}">
                 ` : `<p>Composition: Fixed</p>`}
                 <button id="${controlsElementId}-spinButton">Start Spin</button>
                 <button id="${controlsElementId}-labelToggleButton">${showLabels ? 'Hide' : 'Show'} Labels</button>
                 <p>Legend:</p>
                 <ul id="${controlsElementId}-legendList" style="padding-left: 0; list-style: none;">
                     <!-- Legend items added dynamically -->
                 </ul>
                 <p style="font-size: 12px; margin-top: 15px;">Drag to rotate, Scroll to zoom.</p>
             `;
             controlsContainer.appendChild(controlsWrapper);

             // Add Listeners
             const slider = document.getElementById(`${controlsElementId}-cdSlider`);
             const valueSpan = document.getElementById(`${controlsElementId}-cdValue`);
             const spinButton = document.getElementById(`${controlsElementId}-spinButton`);
             const labelButton = document.getElementById(`${controlsElementId}-labelToggleButton`);

             if (slider) {
                 // Update model ONLY on 'change' (slider release)
                 slider.addEventListener('change', (event) => {
                     cdConcentration = parseFloat(event.target.value);
                     if (valueSpan) valueSpan.textContent = cdConcentration.toFixed(2);
                     updateCrystalModel(); // Regenerate the model
                 });
                 // Update text display continuously on 'input' for feedback
                 slider.addEventListener('input', (event) => {
                     if (valueSpan) valueSpan.textContent = parseFloat(event.target.value).toFixed(2);
                 });
             }
             if (spinButton) { spinButton.addEventListener('click', () => { isSpinning = !isSpinning; spinButton.textContent = isSpinning ? 'Stop Spin' : 'Start Spin'; }); }
             if (labelButton) { labelButton.addEventListener('click', () => { showLabels = !showLabels; labelButton.textContent = showLabels ? 'Hide Labels' : 'Show Labels'; updateCrystalModel(); }); }

             // Populate Legend Dynamically
             populateLegendUI();

             console.log("[Three.js Simplified] UI Setup Complete");
        }

        // --- Populate Legend UI ---
         function populateLegendUI() {
             const legendList = document.getElementById(`${controlsElementId}-legendList`);
             if (!legendList) return;
             legendList.innerHTML = ''; // Clear existing
             Object.entries(atomInfo).forEach(([symbol, info]) => {
                 const upperSymbol = symbol.toUpperCase();
                 const color = materials[upperSymbol]?.color.getStyle() || '#cccccc';
                 const li = document.createElement('li');
                 li.innerHTML = `<span class="color-box" style="background-color:${color};"></span> ${symbol} (${info.role || 'N/A'})`;
                 legendList.appendChild(li);
             });
             // Add bond color to legend only if sticks are possible
             if (currentViewStyle === 'ballAndStick' || currentViewStyle === 'stick') {
                 const bondLi = document.createElement('li');
                 bondLi.innerHTML = `<span class="color-box" style="background-color: ${bondMaterial.color.getStyle()};"></span> Bonds`;
                 legendList.appendChild(bondLi);
             }
         }


        // --- Window Resize Handler ---
        function onWindowResize() {
            if (!camera || !renderer || !css2DRenderer || !viewerContainer) return;
            const width = viewerContainer.clientWidth; const height = viewerContainer.clientHeight;
            if (width === 0 || height === 0) return; // Ignore if container is hidden
            camera.aspect = width / height; camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            css2DRenderer.setSize( width, height );
        }

        // --- Animation Loop ---
        function animate() {
            // Stop loop if cleanup has occurred
            if (!renderer) { if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null; return; }

            animationFrameId = requestAnimationFrame(animate);

            if (isSpinning && crystalModelGroup) {
                crystalModelGroup.rotation.y += spinSpeed; // Rotate the whole group
            }
            if (controls) controls.update(); // Required for damping

            if (scene && camera) {
                renderer.render(scene, camera);       // Render WebGL scene
                if (css2DRenderer) css2DRenderer.render(scene, camera); // Render CSS2D labels overlay
            }
        }

         // --- Cleanup Function ---
        function cleanup() {
             console.log("[Three.js Simplified] Cleaning up viewer resources...");
             window.removeEventListener('resize', onWindowResize);
             if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;

             // Dispose objects in the main group
             disposeMeshes(crystalModelGroup);
             // Dispose the unit cell outline specifically if it exists
             if (unitCellOutline && unitCellOutline.geometry) unitCellOutline.geometry.dispose();
             if(scene && crystalModelGroup) scene.remove(crystalModelGroup); // Remove group from scene

             // Dispose shared geometries
             Object.values(sphereGeometries).forEach(geom => { if(geom) geom.dispose(); });
             if(stickGeometry) stickGeometry.dispose(); // Dispose template

             // Dispose materials
             Object.values(materials).forEach(mat => { if(mat) mat.dispose(); });
             if(bondMaterial) bondMaterial.dispose(); if(unitCellMaterial) unitCellMaterial.dispose(); if(defaultMaterial) defaultMaterial.dispose();

             // Dispose renderers and remove their DOM elements
             if (renderer) {
                 renderer.dispose();
                 if (renderer.domElement?.parentNode) { renderer.domElement.parentNode.removeChild(renderer.domElement); }
                 renderer = null;
             }
             if (css2DRenderer) {
                // Remove the CSS2D renderer's element and its overlay container
                 if (css2DRenderer.domElement?.parentNode) { css2DRenderer.domElement.parentNode.removeChild(css2DRenderer.domElement); }
                 const cssOverlay = viewerContainer.querySelector('.css2d-renderer-overlay'); // Find the dynamically created overlay
                 if (cssOverlay?.parentNode) { cssOverlay.parentNode.removeChild(cssOverlay); }
                 css2DRenderer = null;
             }

             // Nullify references
             scene = null; camera = null; controls = null; crystalModelGroup = null; unitCellOutline = null;
             console.log("[Three.js Simplified] Cleanup complete.");
        }


        // --- === Main Execution Flow === ---
        try {
            console.log("[Three.js Simplified] Starting Main Execution Flow...");
            init(); // Setup scene, camera, renderer, initial model+outline, etc.

            if (!scene || !camera || !renderer || !css2DRenderer || !controls) {
                 throw new Error("[Three.js Simplified Main Flow] Initialization failed: Missing core components.");
            }

            setupUI(); // Setup control listeners based on initial state
            console.log("[Three.js Simplified] setupUI() completed.");

            // Force First Render after setup
             if (renderer && scene && camera) {
                 console.log("[Three.js Simplified] Requesting first render...");
                 renderer.render(scene, camera);
                 if (css2DRenderer) css2DRenderer.render(scene, camera);
                 console.log("[Three.js Simplified] First render completed.");
             } else {
                 console.error("[Three.js Simplified] Cannot perform first render - missing components.");
             }

            animate(); // Start rendering loop
            console.log("[Three.js Simplified] Animation loop started.");

             // Setup MutationObserver for automatic cleanup when the container is removed from DOM
             const observerTargetNode = viewerContainer.closest('.crystal-viewer-wrapper'); // Watch the wrapper if it exists
             if (observerTargetNode) {
                 const observer = new MutationObserver((mutationsList, observerInstance) => {
                    for (const mutation of mutationsList) {
                        if (mutation.removedNodes) {
                            mutation.removedNodes.forEach(removedNode => {
                                // Check if the node containing our viewer was removed
                                if (removedNode.contains(viewerContainer)) {
                                    console.log("[Three.js Observer] Viewer container removed from DOM. Cleaning up.");
                                    cleanup();
                                    observerInstance.disconnect(); // Stop observing
                                    return;
                                }
                            });
                        }
                    }
                 });
                 // Observe the parent of the wrapper for removal of the wrapper itself
                 if (observerTargetNode.parentNode) {
                     observer.observe(observerTargetNode.parentNode, { childList: true });
                     console.log("[Three.js Simplified Observer] Observing parent node for cleanup.");
                 } else {
                    console.warn("[Three.js Simplified Observer] Wrapper has no parent to observe.");
                 }
             } else {
                 console.warn("[Three.js Simplified Observer] Could not find '.crystal-viewer-wrapper' to observe for cleanup.");
             }

        } catch(error) {
            console.error("[Three.js Simplified Error] Initialization or main flow failed:", error);
            if (viewerContainer) viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Failed to initialize viewer. Check console. Error: ${error.message}</p>`;
            if (controlsContainer) controlsContainer.innerHTML = ''; // Clear controls on error
            cleanup(); // Attempt cleanup even on error
        }

    } // --- End initializeSimplifiedThreeJsViewer ---
    // --- =============================================================== ---
    // ---      *** SIMPLIFIED Three.js Initializer END (FIXED) ***       ---
    // --- =============================================================== ---

}); // End DOMContentLoaded
