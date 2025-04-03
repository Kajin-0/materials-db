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

        // --- Process References ---
        const collectedRefs = new Set();
        const processRefs = (data) => { /* ... Reference processing logic ... */
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
             const sectionTitleEl = document.getElementById(`${sectionId}-title`); const sectionIntroEl = document.getElementById(`${sectionId}-intro`); const propertiesContainerEl = document.getElementById(`${sectionId}-properties`);
             const h2Title = sectionElement.querySelector('h2'); if (h2Title) { h2Title.textContent = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); }
             if (sectionIntroEl) { if (sectionData.introduction) { sectionIntroEl.innerHTML = sectionData.introduction; sectionIntroEl.style.display = 'block'; } else { sectionIntroEl.style.display = 'none'; sectionIntroEl.innerHTML = ''; } }
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
                 console.error(`[renderPropertyBlock] Invalid viz_data for '${propKey}'. Skipping viewer.`);
                 const errorDiv = document.createElement('div'); errorDiv.className = 'error-message'; errorDiv.textContent = 'Error: Visualization data missing/invalid.'; propBlock.appendChild(errorDiv);
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
                requestAnimationFrame(() => { // Ensure elements are in DOM
                     if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined' || typeof THREE.CSS2DRenderer === 'undefined') {
                         console.error("Required 3D library component not loaded!");
                         const viewerArea = document.getElementById(`${viewerContainerId}-viewer`); if(viewerArea) viewerArea.innerHTML = `<p class="error-message">Error: 3D library failed to load.</p>`;
                         const controlsArea = document.getElementById(`${viewerContainerId}-controls`); if(controlsArea) controlsArea.innerHTML = ''; return;
                     }
                     if (typeof initializeSimplifiedThreeJsViewer === 'function') {
                        try { initializeSimplifiedThreeJsViewer(`${viewerContainerId}-viewer`, `${viewerContainerId}-controls`, vizData, allDetails); }
                        catch(e) { console.error("Error initializing viewer:", e); /* ... error display ... */ }
                     } else { console.error("initializeSimplifiedThreeJsViewer function not found!"); /* ... error display ... */ }
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
                // ... (logic for handling arrays, equations, measurement_characterization, strings, etc. as before) ...
                 if (Array.isArray(detailContent) && detailKey !== 'equations') { const ul = document.createElement('ul'); detailContent.forEach(item => { const li = document.createElement('li'); li.innerHTML = item; ul.appendChild(li); }); subsection.appendChild(ul); }
                 else if (detailKey === 'equations' && Array.isArray(detailContent)) { detailContent.forEach(eq => { /* ... eq block ... */ }); }
                 else if (detailKey === 'measurement_characterization' && typeof detailContent === 'object') { /* ... measurement block ... */ }
                 else if (typeof detailContent === 'string') { const p = document.createElement('p'); p.innerHTML = detailContent; subsection.appendChild(p); }
                 else { /* ... JSON fallback ... */ }
                if(subsection.children.length > 1) { propBlock.appendChild(subsection); }
            }
        }
        return propBlock;
    } // --- End renderPropertyBlock ---

    // --- Function to handle reference link clicks ---
    function handleRefLinkClick(event) { /* ... as before ... */ }


    // --- ================================================================= ---
    // ---      *** SIMPLIFIED Three.js Initializer START (Debugged Scope) *** ---
    // --- ================================================================= ---
    function initializeSimplifiedThreeJsViewer(viewerElementId, controlsElementId, vizData, allMaterialDetails) {
        console.log("--- [Three.js Simplified Init] Initializing Viewer ---");

        const viewerContainer = document.getElementById(viewerElementId);
        const controlsContainer = document.getElementById(controlsElementId);

        if (!viewerContainer || !controlsContainer) { console.error("[Three.js Simplified Error] Viewer or controls element not found!"); return; }

        // **** Check WebGL Support ****
         try {
             const canvas = document.createElement('canvas');
             if (!window.WebGLRenderingContext || !(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))) {
                 throw new Error("WebGL not supported by the browser.");
             }
         } catch (e) {
             console.error("[Three.js Error] WebGL check failed:", e.message);
             viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Error: WebGL is not supported or enabled in your browser.</p>`;
             controlsContainer.innerHTML = ''; // Clear controls placeholder too
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

        // --- Constants & Config ---
        const atomInfo = vizData.atom_info || {};
        const latticeConstantsSource = vizData.lattice_constants || {};
        let lattice_a = 6.47;

        const sphereScales = { spacefill: 0.55, ballAndStick: 0.28, stick: 0.1 }; // Defined HERE
        const stickRadius = 0.05;
        const labelOffset = 0.3;
        const sphereDetail = 12;
        const stickDetail = 6;
        const bondCutoffFactor = 0.5;

        // --- Materials ---
        const materials = {};
        const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.4, roughness: 0.6 });
        Object.entries(atomInfo).forEach(([symbol, info]) => {
             materials[symbol.toUpperCase()] = new THREE.MeshStandardMaterial({ color: info?.color || '#cccccc', metalness: 0.4, roughness: 0.6 });
        });
        const bondMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.1, roughness: 0.8 });
        const unitCellMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });

        // --- Reusable Geometries ---
        const sphereGeometries = {};
        const stickGeometry = new THREE.CylinderGeometry(stickRadius, stickRadius, 1, stickDetail, 1);

        // --- Helper: Dispose Meshes ---
         function disposeMeshes(group) { // Defined HERE
            if (!group) return;
            const children_to_remove = [...group.children];
            children_to_remove.forEach(object => {
                if (object.isMesh || object.isLineSegments || object.isCSS2DObject) {
                    if (object.geometry && object.geometry !== stickGeometry) { object.geometry.dispose(); }
                    if (object.isCSS2DObject && object.element) { object.element = null; }
                }
                group.remove(object);
            });
        }

        // --- Initialize Scene ---
        function init() {
            try { // **** Wrap init in try...catch ****
                if (viewerContainer.clientWidth === 0 || viewerContainer.clientHeight === 0) {
                     console.warn("[Three.js Init] Container zero size, delaying init."); requestAnimationFrame(init); return;
                }
                 console.log(`[Three.js Init] Container dimensions: ${viewerContainer.clientWidth}x${viewerContainer.clientHeight}`);
                 while (viewerContainer.firstChild) { viewerContainer.removeChild(viewerContainer.firstChild); } // Clear first

                 console.log("[Three.js Init] Setting up Scene...");
                 scene = new THREE.Scene();
                 scene.background = new THREE.Color(0xddeeff);

                 console.log("[Three.js Init] Setting up Camera...");
                 const width = viewerContainer.clientWidth; const height = viewerContainer.clientHeight;
                 camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
                 const initialDist = (lattice_a * supercellDims.nx) * 1.5;
                 camera.position.set(initialDist, initialDist * 0.8, initialDist);
                 camera.lookAt(0, 0, 0);

                 console.log("[Three.js Init] Setting up Renderer...");
                 renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Added alpha
                 renderer.setSize(width, height); renderer.setPixelRatio(window.devicePixelRatio);
                 viewerContainer.appendChild(renderer.domElement); // Append WebGL canvas

                 console.log("[Three.js Init] Setting up CSS2DRenderer...");
                 const css2dContainer = document.createElement('div');
                 css2dContainer.className = 'css2d-renderer-overlay';
                 viewerContainer.appendChild(css2dContainer);
                 css2DRenderer = new THREE.CSS2DRenderer();
                 css2DRenderer.setSize(width, height);
                 css2dContainer.appendChild(css2DRenderer.domElement);

                 console.log("[Three.js Init] Setting up Controls...");
                 controls = new THREE.OrbitControls(camera, renderer.domElement);
                 controls.enableDamping = true; controls.dampingFactor = 0.1;
                 controls.minDistance = lattice_a * 0.5; controls.maxDistance = lattice_a * supercellDims.nx * 5;

                 console.log("[Three.js Init] Setting up Lighting...");
                 const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); scene.add(ambientLight);
                 const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); directionalLight.position.set(5, 10, 7.5); scene.add(directionalLight);

                 console.log("[Three.js Init] Adding crystal group...");
                 scene.add(crystalModelGroup);

                 window.removeEventListener('resize', onWindowResize); window.addEventListener('resize', onWindowResize);
                 console.log("[Three.js Init] Initialization function complete.");
             } catch(initError) {
                 console.error("[Three.js Error] Error during initThree function:", initError);
                 viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Error setting up 3D scene. Check console.</p>`;
                 cleanup(); // Attempt cleanup if init fails
                 throw initError; // Re-throw to stop further execution
             }
        }

        // --- Generate Atom Positions ---
        function generateCrystalData(nx, ny, nz, currentCdConcentration) {
            const atoms = [];
            console.log(`[Three.js generateAtomData] Input compositionRatio: ${currentCdConcentration}, cellSize: ${nx}`);
            const cation_host_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_host');
            const cation_subst_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_subst');
            const anion_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'anion');
            if (!cation_host_symbol || !cation_subst_symbol || !anion_symbol) { console.error("Atom roles missing."); return []; }
            const a_host = Number(latticeConstantsSource[cation_host_symbol] || 6.46);
            const a_subst = Number(latticeConstantsSource[cation_subst_symbol] || 6.48);
            const ratio = Number(currentCdConcentration); if (isNaN(a_host) || isNaN(a_subst) || isNaN(ratio)) return [];
            lattice_a = a_host * (1 - ratio) + a_subst * ratio; if (isNaN(lattice_a) || lattice_a <= 0) return [];
            console.log(`[Three.js generateAtomData] Calculated lattice constant (a): ${lattice_a.toFixed(4)}`);
            const centerOffset = new THREE.Vector3( (nx - 1) * lattice_a / 2, (ny - 1) * lattice_a / 2, (nz - 1) * lattice_a / 2 );
            const baseAnion = [ [0.00, 0.00, 0.00], [0.00, 0.50, 0.50], [0.50, 0.00, 0.50], [0.50, 0.50, 0.00] ];
            const baseCation = [ [0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25] ];
            for (let i = 0; i < nx; i++) { for (let j = 0; j < ny; j++) { for (let k = 0; k < nz; k++) {
                const cellOrigin = new THREE.Vector3(i * lattice_a, j * lattice_a, k * lattice_a);
                baseAnion.forEach(pos => { const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2]).multiplyScalar(lattice_a).add(cellOrigin).sub(centerOffset); if (!isNaN(atomPos.x)) atoms.push({ element: anion_symbol.toUpperCase(), position: atomPos }); });
                baseCation.forEach(pos => { const element = Math.random() < currentCdConcentration ? cation_subst_symbol : cation_host_symbol; const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2]).multiplyScalar(lattice_a).add(cellOrigin).sub(centerOffset); if (!isNaN(atomPos.x)) atoms.push({ element: element.toUpperCase(), position: atomPos }); });
            }}}
             console.log(`[Three.js] Generated ${atoms.length} atoms.`);
             return atoms;
        }

        // --- Create CSS2D Label Object ---
        function createCSS2DLabel(text) { const div = document.createElement('div'); div.className = 'atom-label'; div.textContent = text; return new THREE.CSS2DObject(div); }

        // --- Create/Update Ball and Stick Model ---
        function createOrUpdateBallAndStickModel(atomData) {
             console.log("[Three.js updateModel] Starting model update..."); // DEBUG
             disposeMeshes(crystalModelGroup);
             if (unitCellOutline) { crystalModelGroup.add(unitCellOutline); }

             // **** Access sphereScales defined in the outer scope ****
             const currentSphereScale = sphereScales.ballAndStick;
             const bondCutoffSq = (lattice_a * bondCutoffFactor) * (lattice_a * bondCutoffFactor);
             const yAxis = new THREE.Vector3(0, 1, 0);

             // Prepare Sphere Geometries
             let allGeometriesValid = true;
             Object.keys(atomInfo).forEach(symbol => { /* ... as before ... */ });
             if (!allGeometriesValid) { console.error("Sphere geometry creation failed."); return; }

            // Add Spheres & Labels
             let spheresAdded = 0, labelsAdded = 0;
             atomData.forEach((atom) => {
                 const symbol = atom.element.toUpperCase(); const geometry = sphereGeometries[symbol]; const material = materials[symbol] || defaultMaterial;
                 if (!geometry || !material || isNaN(atom.position.x)) return;
                 const sphere = new THREE.Mesh(geometry, material); sphere.position.copy(atom.position); crystalModelGroup.add(sphere); spheresAdded++;
                 if (showLabels) { const label = createCSS2DLabel(atom.element); label.position.copy(atom.position); label.position.y += labelOffset; crystalModelGroup.add(label); labelsAdded++; }
             });
              console.log(`[Three.js updateModel] Added ${spheresAdded} spheres, ${labelsAdded} labels.`); // DEBUG

            // Add Sticks
             let bondsAdded = 0;
             if (isNaN(bondCutoffSq) || bondCutoffSq <= 0) { console.error(`Invalid bondCutoffSq: ${bondCutoffSq}`); } else {
                 for (let i = 0; i < atomData.length; i++) { for (let j = i + 1; j < atomData.length; j++) {
                     const atom1 = atomData[i]; const atom2 = atomData[j]; if (!atom1 || !atom2 || !atom1.position || !atom2.position || isNaN(atom1.position.x) || isNaN(atom2.position.x)) continue;
                     const distSq = atom1.position.distanceToSquared(atom2.position);
                     if (distSq > 1e-6 && distSq < bondCutoffSq) {
                         const role1 = atomInfo[atom1.element]?.role ?? 'unknown'; const role2 = atomInfo[atom2.element]?.role ?? 'unknown';
                         if ((role1.includes('cation') && role2 === 'anion') || (role1 === 'anion' && role2.includes('cation'))) {
                             const distance = Math.sqrt(distSq); if (isNaN(distance) || distance <= 1e-3) continue;
                             const stickMesh = new THREE.Mesh(stickGeometry.clone(), bondMaterial);
                             stickMesh.position.copy(atom1.position).add(atom2.position).multiplyScalar(0.5);
                             const direction = new THREE.Vector3().subVectors(atom2.position, atom1.position).normalize();
                             const quaternion = new THREE.Quaternion(); if (Math.abs(direction.y) < 1.0 - 1e-6) { quaternion.setFromUnitVectors(yAxis, direction); } else { if (direction.y < 0) quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI); }
                             stickMesh.quaternion.copy(quaternion); stickMesh.scale.set(1, distance, 1);
                             crystalModelGroup.add(stickMesh); bondsAdded++;
                         }
                     }
                 }} // End loops
             } // End else bondCutoff valid
             console.log(`[Three.js updateModel] Added ${bondsAdded} bonds.`);
             console.log(`[Three.js updateModel] Rebuilt model. Total children: ${crystalModelGroup.children.length}`);
        }

        // --- Create Unit Cell Outline ---
        function createUnitCellOutline() {
            if (unitCellOutline) { crystalModelGroup.remove(unitCellOutline); if(unitCellOutline.geometry) unitCellOutline.geometry.dispose(); }
            const supercellHalfSize = new THREE.Vector3( supercellDims.nx * lattice_a / 2.0, supercellDims.ny * lattice_a / 2.0, supercellDims.nz * lattice_a / 2.0 );
            const boxGeo = new THREE.BoxGeometry(supercellHalfSize.x * 2, supercellHalfSize.y * 2, supercellHalfSize.z * 2);
            const edgesGeo = new THREE.EdgesGeometry(boxGeo);
            unitCellOutline = new THREE.LineSegments(edgesGeo, unitCellMaterial);
            crystalModelGroup.add(unitCellOutline); boxGeo.dispose();
            // console.log("[Three.js Simplified] Created/Updated Unit Cell Outline"); // Less verbose
        }

        // --- Update Crystal Model (Wrapper) ---
        function updateCrystalModel() {
            console.log("[Three.js updateCrystalModel] Generating new atom data..."); // DEBUG
            const atomData = generateCrystalData(supercellDims.nx, supercellDims.ny, supercellDims.nz, cdConcentration);
            if (!atomData || atomData.length === 0) { console.error("[Three.js updateCrystalModel] Failed to generate atom data."); return; }
            console.log("[Three.js updateCrystalModel] Rebuilding meshes..."); // DEBUG
            createOrUpdateBallAndStickModel(atomData);
            createUnitCellOutline();
            if (controls) { controls.minDistance = lattice_a * 0.5; controls.maxDistance = lattice_a * supercellDims.nx * 5; }
             console.log("[Three.js updateCrystalModel] Model update complete."); // DEBUG
        }

        // --- UI Setup ---
        function setupUI() {
             controlsContainer.innerHTML = ''; // Clear placeholder
             const controlsWrapper = document.createElement('div');
             // Generate HTML (same as previous version)
             controlsWrapper.innerHTML = `... [Same HTML generation as previous version] ...`;
             controlsContainer.appendChild(controlsWrapper);
             // Add Listeners (same as previous version)
             const slider = document.getElementById(`${controlsElementId}-cdSlider`);
             const valueSpan = document.getElementById(`${controlsElementId}-cdValue`);
             const spinButton = document.getElementById(`${controlsElementId}-spinButton`);
             const labelButton = document.getElementById(`${controlsElementId}-labelToggleButton`);
             if (slider) { slider.addEventListener('change', (event) => { /* ... updateCrystalModel() ... */ }); slider.addEventListener('input', (event) => { /* ... update valueSpan ... */ }); }
             if (spinButton) { spinButton.addEventListener('click', () => { /* ... toggle isSpinning ... */ }); }
             if (labelButton) { labelButton.addEventListener('click', () => { /* ... toggle showLabels, updateCrystalModel() ... */ }); }
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
            if (isSpinning && crystalModelGroup) { crystalModelGroup.rotation.y += spinSpeed; } // Check crystalModelGroup exists
            if (controls) controls.update();
            if (scene && camera) { renderer.render(scene, camera); }
            if (css2DRenderer && scene && camera) { css2DRenderer.render(scene, camera); }
        }

         // --- Cleanup Function ---
        function cleanup() {
             console.log("[Three.js Simplified] Cleaning up viewer resources...");
             window.removeEventListener('resize', onWindowResize);
             if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
             disposeMeshes(crystalModelGroup); if(scene && crystalModelGroup) scene.remove(crystalModelGroup);
             Object.values(sphereGeometries).forEach(geom => { if(geom) geom.dispose(); });
             if(stickGeometry) stickGeometry.dispose(); // Dispose template
             if(unitCellOutline && unitCellOutline.geometry) unitCellOutline.geometry.dispose();
             Object.values(materials).forEach(mat => { if(mat) mat.dispose(); });
             if(bondMaterial) bondMaterial.dispose(); if(unitCellMaterial) unitCellMaterial.dispose(); if(defaultMaterial) defaultMaterial.dispose();
             if (renderer) { renderer.dispose(); if (renderer.domElement && renderer.domElement.parentNode) { viewerContainer.removeChild(renderer.domElement); } renderer = null; }
             if (css2DRenderer) { const cssOverlay = viewerContainer.querySelector('.css2d-renderer-overlay'); if (cssOverlay && cssOverlay.parentNode) { viewerContainer.removeChild(cssOverlay); } css2DRenderer = null; }
             scene = null; camera = null; controls = null; crystalModelGroup = null; unitCellOutline = null;
             console.log("[Three.js Simplified] Cleanup complete.");
        }

        // --- === Main Execution Flow === ---
        try {
            console.log("[Three.js Simplified] Starting Main Execution Flow..."); // DEBUG
            init(); // Setup scene, camera, renderer, etc.
            console.log("[Three.js Simplified] init() completed."); // DEBUG

            // ** Crucial Check: Ensure Three.js components are valid after init **
            if (!scene || !camera || !renderer || !css2DRenderer || !controls) {
                 throw new Error("[Three.js Simplified Main Flow] Failed to initialize critical Three.js components in init().");
            }

            setupUI(); // Setup control listeners
            console.log("[Three.js Simplified] setupUI() completed."); // DEBUG

            // Initial data generation and scene population
            console.log("[Three.js Simplified] Performing initial model generation and update..."); // DEBUG
            updateCrystalModel();
            console.log("[Three.js Simplified] Initial updateCrystalModel() completed."); // DEBUG


            animate(); // Start rendering loop
            console.log("[Three.js Simplified] Animation loop started."); // DEBUG

             // Setup MutationObserver for cleanup (remains the same)
             const observer = new MutationObserver((mutationsList, observerInstance) => { /* ... cleanup logic ... */ });
             const observeTarget = viewerContainer.closest('.crystal-viewer-wrapper')?.parentNode;
             if (observeTarget) { observer.observe(observeTarget, { childList: true }); }
             else { console.warn("[Three.js Simplified Observer] Could not find parent to observe."); }

        } catch(error) {
            console.error("[Three.js Simplified Error] Initialization failed:", error);
            if (viewerContainer) viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Failed init. Check console. Error: ${error.message}</p>`;
            if (controlsContainer) controlsContainer.innerHTML = ''; // Clear controls on error too
            cleanup();
        }

    } // --- End initializeSimplifiedThreeJsViewer ---
    // --- =============================================================== ---
    // ---      *** SIMPLIFIED Three.js Initializer END (Corrected Scope) *** ---
    // --- =============================================================== ---

}); // End DOMContentLoaded
