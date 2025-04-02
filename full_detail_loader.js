// --- START OF FILE full_detail_loader.js ---
console.log("[Full Detail Loader] Script started."); // Log script start

document.addEventListener("DOMContentLoaded", async () => {
    console.log("[Full Detail Loader] DOMContentLoaded event fired."); // Log DOM ready

    // --- Get parameters from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");
    console.log("[Full Detail Loader] URL Parameter 'material':", materialNameParam); // Log parameter

    // --- Get DOM elements ---
    const materialNameEl = document.getElementById("material-name");
    const tocListEl = document.getElementById("toc-list");
    const mainContentEl = document.getElementById("main-content");
    const referencesSectionEl = document.getElementById("references-section");
    const referencesListEl = document.getElementById("references-list");
    console.log("[Full Detail Loader] DOM elements obtained.");

    // --- Display Error Function ---
    const displayError = (message) => {
        console.error("[Full Detail] Error:", message); // Log error message passed here
        if (materialNameEl) materialNameEl.textContent = "Error Loading Material";
        if (tocListEl) tocListEl.innerHTML = '<li>Error loading contents</li>';
        if (mainContentEl) mainContentEl.innerHTML = `<p class="error-message">Could not load material details: ${message}</p>`;
        if (referencesSectionEl) referencesSectionEl.style.display = 'none';
        document.title = "Error - Material Detail";
    };

    // --- Validate parameters ---
    if (!materialNameParam) {
        console.error("[Full Detail Loader] Material name missing from URL."); // Specific log
        displayError("Material name missing from URL parameters.");
        return; // Stop execution
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
    // **** CORRECTED PATH: Assume details JSON is in ./details/ subdirectory ****
    const detailFilePath = `./details/${safeMaterialName}_details.json`;
    console.log(`[Full Detail Loader] Constructed file path: '${detailFilePath}'`);

    // --- Fetch and Process Data ---
    console.log("[Full Detail Loader] Starting fetch operation...");
    let allMaterialDetails; // Define outside try block
    try {
        const response = await fetch(detailFilePath);
        console.log(`[Full Detail Loader] Fetch response status: ${response.status} ${response.statusText}`); // Log fetch status

        if (!response.ok) {
             const errorText = await response.text(); // Attempt to read error response body
             console.error(`[Full Detail Loader] Fetch failed: ${response.status}. Response body:`, errorText);
            if (response.status === 404) { throw new Error(`Details file not found: ${detailFilePath}.`); }
            else { throw new Error(`HTTP error ${response.status} fetching ${detailFilePath}`); }
        }

        console.log("[Full Detail Loader] Fetch successful. Parsing JSON...");
        allMaterialDetails = await response.json(); // Assign to outer scope variable
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
            // Ensure materialName and references are excluded if they exist at the top level
            const excludedKeys = ['materialName', 'references'];
            for (const sectionKey in allMaterialDetails) {
                if (excludedKeys.includes(sectionKey)) continue;
                const sectionData = allMaterialDetails[sectionKey];
                // Also check if sectionData is an actual object intended to be a section
                if (typeof sectionData !== 'object' || sectionData === null || !sectionData.displayName) {
                    console.warn(`[Full Detail Loader] Skipping key '${sectionKey}' as it doesn't appear to be a valid section object with a displayName.`);
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

             // Set Section Title (using displayName or formatted key)
             if(sectionTitleEl) {
                 sectionTitleEl.textContent = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
             } else {
                 // If specific title element isn't found, try finding the first h2 within the section
                 const h2Title = sectionElement.querySelector('h2');
                 if (h2Title) {
                     h2Title.textContent = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                 }
             }

             // Set Introduction
             if (sectionIntroEl) {
                 if (sectionData.introduction) { sectionIntroEl.innerHTML = sectionData.introduction; sectionIntroEl.style.display = 'block'; }
                 else { sectionIntroEl.style.display = 'none'; sectionIntroEl.innerHTML = ''; }
             }

             // Populate Properties
             if (propertiesContainerEl && sectionData.properties && typeof sectionData.properties === 'object') {
                 propertiesContainerEl.innerHTML = '';
                 Object.entries(sectionData.properties).forEach(([propKey, propData]) => {
                     const propertyBlockElement = renderPropertyBlock(propKey, propData, allMaterialDetails, propertiesContainerEl);
                     if (propertyBlockElement) { propertiesContainerEl.appendChild(propertyBlockElement); }
                 });
                 propertiesContainerEl.style.display = 'block';
             } else if (propertiesContainerEl) { propertiesContainerEl.style.display = 'none'; }

             sectionElement.style.display = 'block'; // Make the whole section visible
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
        if (error instanceof SyntaxError && error.message.includes("JSON")) { displayError(`Failed JSON parse. Check format. Error: ${error.message}`); }
        else { displayError(error.message || "Unknown error loading details."); }
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

        // --- Check for Visualization Data and Initialize THREE.JS Viewer ---
        if (propKey === 'crystal_structure' && propData.details && propData.details.visualization_data) {
            const vizData = propData.details.visualization_data;
            const viewerContainerId = vizData.container_id || `viewer-container-${propKey}-${Date.now()}`;

            const viewerWrapper = document.createElement('div');
            viewerWrapper.className = 'crystal-viewer-wrapper';
            const viewerHeight = vizData.viewer_height || '450px';
            viewerWrapper.style.setProperty('--viewer-height', viewerHeight);

            // Create viewer and controls divs
            viewerWrapper.innerHTML = `
                <div id="${viewerContainerId}" class="crystal-viewer-container">
                    <div id="${viewerContainerId}-viewer" class="viewer-area"><p style="padding:20px; color:#888; text-align:center;">Loading 3D Viewer...</p></div>
                    <div id="${viewerContainerId}-controls" class="viewer-controls"><p style="padding:10px; color:#888;">Loading Controls...</p></div>
                </div>`;
            propBlock.appendChild(viewerWrapper);

            // Use requestAnimationFrame to ensure elements are in the DOM
            requestAnimationFrame(() => {
                 if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined') {
                     console.error("Three.js or OrbitControls library not loaded!");
                     const viewerArea = document.getElementById(`${viewerContainerId}-viewer`);
                     if(viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Error: Three.js library failed to load.</p>`;
                     const controlsArea = document.getElementById(`${viewerContainerId}-controls`);
                     if(controlsArea) controlsArea.innerHTML = '';
                     return;
                 }
                 if (typeof initializeThreeJsViewer === 'function') {
                    try {
                        // Call the NEW Three.js initializer
                        initializeThreeJsViewer(`${viewerContainerId}-viewer`, `${viewerContainerId}-controls`, vizData, allDetails);
                    }
                    catch(e) {
                        console.error("Error initializing Three.js viewer:", e);
                        const viewerArea = document.getElementById(`${viewerContainerId}-viewer`);
                        if (viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Could not load Three.js viewer. Check console.</p>`;
                        const controlsArea = document.getElementById(`${viewerContainerId}-controls`);
                        if(controlsArea) controlsArea.innerHTML = '';
                    }
                 } else {
                     console.error("initializeThreeJsViewer function not found!");
                     const viewerArea = document.getElementById(`${viewerContainerId}-viewer`);
                     if(viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Error: Viewer init script missing.</p>`;
                     const controlsArea = document.getElementById(`${viewerContainerId}-controls`);
                     if(controlsArea) controlsArea.innerHTML = '';
                 }
            });
        }
        // --- End Visualization Check ---


        // Process other details subsections (notes, equations, etc.)
        if (propData.details && typeof propData.details === 'object') {
            for (const [detailKey, detailContent] of Object.entries(propData.details)) {
                // Skip visualization data as it's handled above
                if (detailKey === 'visualization_data') continue;
                // Skip empty content
                if (!detailContent || (Array.isArray(detailContent) && detailContent.length === 0) || (typeof detailContent === 'object' && !Array.isArray(detailContent) && Object.keys(detailContent).length === 0) ) continue;

                const subsection = document.createElement('div');
                subsection.className = `detail-subsection ${detailKey.replace(/ /g, '_').toLowerCase()}`;
                const subsectionTitle = document.createElement('h4');
                // Set a data attribute for the CSS pseudo-element if you prefer that styling method
                subsectionTitle.dataset.title = detailKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                subsection.appendChild(subsectionTitle);

                 // Handle different detail types - USE innerHTML where HTML is expected
                if (Array.isArray(detailContent) && detailKey !== 'equations') {
                    const ul = document.createElement('ul');
                    detailContent.forEach(item => { const li = document.createElement('li'); li.innerHTML = item; ul.appendChild(li); });
                    subsection.appendChild(ul);
                } else if (detailKey === 'equations' && Array.isArray(detailContent)) {
                     detailContent.forEach(eq => {
                        const eqBlock = document.createElement('div');
                        eqBlock.className = 'equation-block';
                        if (eq.name) { const nameEl = document.createElement('span'); nameEl.className = 'eq-name'; nameEl.textContent = eq.name; eqBlock.appendChild(nameEl); }
                        if (eq.description) { const descEl = document.createElement('p'); descEl.className = 'eq-desc'; descEl.innerHTML = eq.description; eqBlock.appendChild(descEl); }
                        const formulaContainer = document.createElement('div'); formulaContainer.className = 'eq-formula-container';
                        if (eq.formula_html) { formulaContainer.innerHTML = eq.formula_html; formulaContainer.classList.add('eq-formula-html'); }
                        else if (eq.formula_plain) { formulaContainer.textContent = eq.formula_plain; formulaContainer.classList.add('eq-formula-plain'); }
                        else { formulaContainer.textContent = "[Formula not available]"; formulaContainer.style.cssText = 'font-style: italic; color: #888;'; }
                        eqBlock.appendChild(formulaContainer);
                        if(eq.units){ const unitsEl = document.createElement('div'); unitsEl.className = 'eq-units'; unitsEl.innerHTML = `Units: ${eq.units}`; eqBlock.appendChild(unitsEl); }
                        if (eq.variables && Array.isArray(eq.variables)) {
                            const varsDiv = document.createElement('div'); varsDiv.className = 'eq-vars'; varsDiv.innerHTML = '<strong>Variables:</strong>'; const varsUl = document.createElement('ul');
                            eq.variables.forEach(v => { const li = document.createElement('li'); li.innerHTML = `<strong>${v.symbol}:</strong> ${v.description}`; varsUl.appendChild(li); });
                            varsDiv.appendChild(varsUl); eqBlock.appendChild(varsDiv);
                        }
                        if (eq.ref && allDetails.references && allDetails.references[eq.ref]) {
                            const refEl = document.createElement('div'); refEl.className = 'eq-ref';
                            refEl.innerHTML = `Ref: <a href="#ref-${eq.ref}" class="ref-link" data-ref-key="${eq.ref}">[${eq.ref}]</a>`;
                            eqBlock.appendChild(refEl);
                        }
                        subsection.appendChild(eqBlock);
                    });
                } else if (detailKey === 'measurement_characterization' && typeof detailContent === 'object') {
                     if(detailContent.techniques && Array.isArray(detailContent.techniques) && detailContent.techniques.length > 0){
                         const techDiv = document.createElement('div'); techDiv.className = "techniques"; const ulTech = document.createElement('ul');
                         detailContent.techniques.forEach(tech => { const li = document.createElement('li'); li.innerHTML = tech; ulTech.appendChild(li); });
                         techDiv.appendChild(ulTech); subsection.appendChild(techDiv);
                     }
                     if(detailContent.considerations && Array.isArray(detailContent.considerations) && detailContent.considerations.length > 0){
                         const considDiv = document.createElement('div'); considDiv.className = "considerations";
                         if (subsection.querySelector('.techniques')) {
                            const considTitle = document.createElement('p'); considTitle.innerHTML = '<strong>Considerations:</strong>'; considTitle.style.cssText = 'margin-top: 1rem; margin-bottom: 0.25rem;'; considDiv.appendChild(considTitle);
                         }
                         const ulConsid = document.createElement('ul');
                         detailContent.considerations.forEach(note => { const li = document.createElement('li'); li.innerHTML = note; ulConsid.appendChild(li); });
                         considDiv.appendChild(ulConsid); subsection.appendChild(considDiv);
                     }
                } else if (typeof detailContent === 'string') {
                    const p = document.createElement('p');
                    p.innerHTML = detailContent;
                    subsection.appendChild(p);
                } else {
                    console.warn(`Unhandled detail structure for key '${detailKey}' in property '${propKey}'`, detailContent);
                    const pre = document.createElement('pre');
                    pre.textContent = JSON.stringify(detailContent, null, 2);
                    pre.style.cssText = 'font-size: 0.8em; background-color: #eee; padding: 5px; border-radius: 3px; overflow-x: auto; margin-left: 0.5rem;';
                    subsection.appendChild(pre);
                }

                if(subsection.children.length > 1) { // Only add if content was actually added
                   propBlock.appendChild(subsection);
                }
            }
        }

        return propBlock;
    } // --- End renderPropertyBlock ---

    // Function to handle reference link clicks
    function handleRefLinkClick(event) {
        const link = event.target.closest('a.ref-link[data-ref-key]');
        if (link) {
            event.preventDefault(); const targetId = `ref-${link.dataset.refKey}`; const targetElement = document.getElementById(targetId);
            if (targetElement) { const elementRect = targetElement.getBoundingClientRect(); const absoluteElementTop = elementRect.top + window.pageYOffset; const headerOffset = 60; const viewportHeight = window.innerHeight; const desiredScrollPos = absoluteElementTop - (viewportHeight * 0.3) - headerOffset; window.scrollTo({ top: Math.max(0, desiredScrollPos), behavior: 'smooth' }); document.querySelectorAll('#references-list li.highlight-ref').forEach(el => el.classList.remove('highlight-ref')); targetElement.classList.add('highlight-ref'); setTimeout(() => targetElement.classList.remove('highlight-ref'), 2500); }
            else { console.warn(`Reference target element with ID '${targetId}' not found.`); }
        }
    } // --- End handleRefLinkClick ---


    // --- ============================================================== ---
    // ---            *** NEW Three.js Initializer START ***             ---
    // --- ============================================================== ---
    function initializeThreeJsViewer(viewerElementId, controlsElementId, vizData, allMaterialDetails) {
        console.log("--- Initializing Three.js Viewer ---");
        console.log("Viz Data:", vizData);
        // console.log("All Material Details:", allMaterialDetails); // Optional: Less verbose logging

        const viewerContainer = document.getElementById(viewerElementId);
        const controlsContainer = document.getElementById(controlsElementId);

        if (!viewerContainer || !controlsContainer) {
            console.error("Three.js: Viewer or controls element not found!");
            if(viewerContainer) viewerContainer.innerHTML = '<p class="error-message">Viewer container not found.</p>';
            if(controlsContainer) controlsContainer.innerHTML = '<p class="error-message">Controls container not found.</p>';
            return;
        }

        // --- Basic Three.js Setup ---
        let scene, camera, renderer, controls, crystalGroup;
        let animationFrameId; // To cancel animation loop if needed

        // --- State Variables (mirrors 3Dmol version) ---
        let currentComposition = vizData.composition?.initial_x ?? 0.5; // Default if undefined
        let currentSupercell = 1;
        let currentViewStyle = 'ballAndStick'; // Default style
        let cellShown = false; // Cell initially hidden
        let labelsShown = false; // Labels initially hidden (Not implemented yet)
        let isSpinning = false;
        let currentAtoms = []; // Holds { element: 'Symbol', position: THREE.Vector3 }
        let latticeConstant = 6.47; // Will be calculated, provide a sensible default

        // --- Data Extraction and Validation ---
        const atomInfo = vizData.atom_info || {};
        const latticeConstantsSource = vizData.lattice_constants || {};
        const defaultSupercell = (vizData.supercell_options && vizData.supercell_options.includes(1)) ? 1 : (vizData.supercell_options ? vizData.supercell_options[0] : 1);
        currentSupercell = defaultSupercell;

        const structureType = vizData.structure_type;
        if (structureType !== 'zincblende_alloy') {
            console.error("Three.js viewer currently only supports 'zincblende_alloy' structure type.");
             viewerContainer.innerHTML = `<p class="error-message">Viewer Error: Unsupported structure type '${structureType}'.</p>`;
             controlsContainer.innerHTML = '';
             return;
        }
        // Validate required composition fields
        if (!vizData.composition || typeof vizData.composition.min_x === 'undefined' || typeof vizData.composition.max_x === 'undefined') {
             console.error("Three.js viewer requires vizData.composition with min_x and max_x.");
             viewerContainer.innerHTML = `<p class="error-message">Viewer Error: Invalid composition data.</p>`;
             controlsContainer.innerHTML = '';
             return;
        }


        // --- Constants and Setup ---
        const bondCutoffFactor = 0.45; // Factor of lattice constant for bonding (sqrt(3)/4 is ideal ~0.433)
        const sphereDetail = 12;
        const stickDetail = 6;
        const stickRadius = 0.06;
        const sphereScales = {
            spacefill: 0.5, // ~ van der waals radius factor
            ballAndStick: 0.25,
            stick: 0.08
        };

        // --- Materials ---
        const materials = {};
        const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.4, roughness: 0.6 });
        Object.entries(atomInfo).forEach(([symbol, info]) => {
            materials[symbol.toUpperCase()] = new THREE.MeshStandardMaterial({
                color: info.color || '#cccccc',
                metalness: 0.4,
                roughness: 0.6
            });
        });
        const bondMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.2, roughness: 0.8 });
        const cellMaterial = new THREE.LineBasicMaterial({ color: 0x333333 }); // Linewidth property is unreliable

        // --- Geometries (Reusable) ---
        const sphereGeometries = {}; // Will be populated based on radii * scale
        const stickGeometry = new THREE.CylinderGeometry(stickRadius, stickRadius, 1, stickDetail, 1); // Length 1, will be scaled

        // --- Helper Functions ---
        function disposeMeshes(group) {
            if (!group) return;
            const objectsToRemove = [];
            group.traverse(object => {
                if (object.isMesh || object.isLineSegments) {
                    if (object.geometry) object.geometry.dispose();
                    // Only dispose material if it's not one of the globally shared ones
                    if (object.material && !Object.values(materials).includes(object.material) && object.material !== bondMaterial && object.material !== cellMaterial && object.material !== defaultMaterial) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(mat => mat.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                }
                 objectsToRemove.push(object); // Add object itself to remove later
            });
             // Remove objects from the group after traversal
             objectsToRemove.forEach(obj => {
                 if (obj.parent) {
                     obj.parent.remove(obj);
                 }
             });
            // console.log("Disposed group children");
        }

        // --- Initialize Scene ---
        function initThree() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xffffff); // White background

            const width = viewerContainer.clientWidth;
            const height = viewerContainer.clientHeight;

            camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
            camera.position.set(0, 0, latticeConstant * currentSupercell * 1.8); // Adjust initial distance based on size

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(window.devicePixelRatio);
            viewerContainer.appendChild(renderer.domElement);

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.1;
            controls.minDistance = latticeConstant * currentSupercell * 0.5;
            controls.maxDistance = latticeConstant * currentSupercell * 10;

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);
            const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight1.position.set(1, 1, 1);
            scene.add(directionalLight1);
            const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
            directionalLight2.position.set(-1, -1, -0.5);
            scene.add(directionalLight2);

            crystalGroup = new THREE.Group(); // Group to hold all crystal elements
            scene.add(crystalGroup);

            window.addEventListener('resize', onWindowResize, false);

            console.log("Three.js scene initialized.");
        }

        // --- Generate Atom Positions ---
        function generateAtomData(compositionRatio, cellSize) {
            const atoms = [];
            // Find host and substituent symbols case-insensitively, fallback if needed
            const cation_host_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_host') || Object.keys(atomInfo)[0] || 'Hg';
            const cation_subst_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_subst') || Object.keys(atomInfo)[1] || 'Cd';
            const anion_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'anion') || Object.keys(atomInfo)[2] || 'Te';

            const a_host = latticeConstantsSource[cation_host_symbol] || 6.46;
            const a_subst = latticeConstantsSource[cation_subst_symbol] || 6.48;
            latticeConstant = a_host * (1 - compositionRatio) + a_subst * compositionRatio; // Update global latticeConstant

            const supercellTotalSize = new THREE.Vector3(cellSize * latticeConstant, cellSize * latticeConstant, cellSize * latticeConstant);
            // Adjust center calculation to be based on 0,0,0 origin of the supercell before centering
            const supercellCenter = new THREE.Vector3(
                (cellSize -1) * latticeConstant / 2,
                (cellSize -1) * latticeConstant / 2,
                (cellSize -1) * latticeConstant / 2
            );

            // Zincblende basis in fractional coordinates
            const baseAnion = [[0.00, 0.00, 0.00], [0.00, 0.50, 0.50], [0.50, 0.00, 0.50], [0.50, 0.50, 0.00]];
            const baseCation = [[0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]];

            for (let i = 0; i < cellSize; i++) {
                for (let j = 0; j < cellSize; j++) {
                    for (let k = 0; k < cellSize; k++) {
                        const cellOffset = new THREE.Vector3(i * latticeConstant, j * latticeConstant, k * latticeConstant);

                        // Anions (e.g., Te)
                        baseAnion.forEach(pos => {
                            const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2])
                                .multiplyScalar(latticeConstant)
                                .add(cellOffset)
                                .sub(supercellCenter);
                            atoms.push({ element: anion_symbol.toUpperCase(), position: atomPos });
                        });

                        // Cations (e.g., Hg/Cd) - Random Substitution
                        baseCation.forEach(pos => {
                            const elemType = Math.random() < compositionRatio ? cation_subst_symbol : cation_host_symbol;
                            const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2])
                                .multiplyScalar(latticeConstant)
                                .add(cellOffset)
                                .sub(supercellCenter);
                            atoms.push({ element: elemType.toUpperCase(), position: atomPos });
                        });
                    }
                }
            }
            console.log(`Generated ${atoms.length} atoms for ${cellSize}x${cellSize}x${cellSize} cell, composition x=${compositionRatio.toFixed(2)}, lattice a=${latticeConstant.toFixed(3)}`);
            currentAtoms = atoms; // Update state
            updateInfoPanel(compositionRatio); // Update UI
            return atoms;
        }

        // --- Create/Update Scene Content ---
        function updateScene() {
            console.log(`Updating scene: Style=${currentViewStyle}, Supercell=${currentSupercell}, CellShown=${cellShown}`);
            // --- 1. Clear existing crystal objects ---
            disposeMeshes(crystalGroup); // Dispose old meshes/geometries
            // No need to remove/re-add crystalGroup, just clear its children
            while(crystalGroup.children.length > 0){
                crystalGroup.remove(crystalGroup.children[0]);
            }


            if (!currentAtoms || currentAtoms.length === 0) {
                 console.warn("No atom data to render."); return;
            }

            // --- 2. Prepare Geometries based on current style ---
            const currentSphereScale = sphereScales[currentViewStyle] || sphereScales.ballAndStick;
            Object.keys(atomInfo).forEach(symbol => {
                const upperSymbol = symbol.toUpperCase();
                const radius = (atomInfo[symbol]?.radius || 1.0) * currentSphereScale;
                // Dispose old geometry if it exists before creating new one
                if (sphereGeometries[upperSymbol]) {
                    sphereGeometries[upperSymbol].dispose();
                }
                sphereGeometries[upperSymbol] = new THREE.SphereGeometry(radius, sphereDetail, sphereDetail);
            });

             // --- 3. Add Atoms (Spheres) ---
             currentAtoms.forEach(atom => {
                 const symbol = atom.element.toUpperCase();
                 const geometry = sphereGeometries[symbol];
                 const material = materials[symbol] || defaultMaterial;
                 if (!geometry) {
                     console.warn(`No sphere geometry found for element ${symbol}`);
                     return;
                 }
                 const sphere = new THREE.Mesh(geometry, material);
                 sphere.position.copy(atom.position);
                 crystalGroup.add(sphere);
             });

            // --- 4. Add Bonds (Sticks) - only for stick/ballAndStick ---
            if (currentViewStyle === 'stick' || currentViewStyle === 'ballAndStick') {
                const bondCutoffSq = (latticeConstant * bondCutoffFactor) * (latticeConstant * bondCutoffFactor);
                const yAxis = new THREE.Vector3(0, 1, 0); // Helper for orientation

                for (let i = 0; i < currentAtoms.length; i++) {
                    for (let j = i + 1; j < currentAtoms.length; j++) {
                        const atom1 = currentAtoms[i];
                        const atom2 = currentAtoms[j];

                        const distSq = atom1.position.distanceToSquared(atom2.position);

                        if (distSq > 1e-6 && distSq < bondCutoffSq) { // Add small epsilon check
                            // Get roles safely, default to empty string if symbol or role not found
                            const role1 = atomInfo[atom1.element]?.role ?? '';
                            const role2 = atomInfo[atom2.element]?.role ?? '';

                            // Bond only between cation and anion
                            if ((role1.includes('cation') && role2 === 'anion') || (role1 === 'anion' && role2.includes('cation'))) {
                                const distance = Math.sqrt(distSq);
                                const stick = new THREE.Mesh(stickGeometry, bondMaterial);

                                // Position and Orient
                                stick.position.copy(atom1.position).add(atom2.position).multiplyScalar(0.5);
                                const direction = new THREE.Vector3().subVectors(atom2.position, atom1.position).normalize();
                                // Avoid issues if direction is parallel to yAxis
                                const quaternion = new THREE.Quaternion();
                                if (Math.abs(direction.y) < 0.9999) { // Use default axis if not aligned
                                     quaternion.setFromUnitVectors(yAxis, direction);
                                } else { // Handle case where direction is along y-axis
                                    // No rotation needed or rotate 180 deg if pointing down
                                    if (direction.y < 0) {
                                        quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
                                    }
                                }
                                stick.quaternion.copy(quaternion);
                                stick.scale.y = distance; // Scale length

                                crystalGroup.add(stick);
                            }
                        }
                    }
                }
            }

             // --- 5. Add Unit Cell Outline ---
            if (cellShown) {
                 drawUnitCellOutline();
            }

             // --- 6. Add Labels (Placeholder - Not fully implemented) ---
             if (labelsShown) {
                 // Placeholder: Add simple sprites or text elements here if needed
                 console.log("Label rendering not implemented yet.");
             }

             // --- 7. Adjust camera/controls if supercell changed significantly ---
            // Check if controls exist before adjusting
             if (controls) {
                 controls.minDistance = latticeConstant * currentSupercell * 0.5;
                 controls.maxDistance = latticeConstant * currentSupercell * 10;
                 // Optional: Call controls.reset() or adjust camera position if needed
                 // camera.position.z = latticeConstant * currentSupercell * 1.8; // Example adjustment
                 controls.update(); // Apply changes
             }


             console.log("Scene update complete.");
        }


        // --- Draw Unit Cell Outline ---
        function drawUnitCellOutline() {
            const cellDimension = latticeConstant * currentSupercell;
            const minCorner = new THREE.Vector3(
                -(currentSupercell -1) * latticeConstant / 2 - latticeConstant / 2,
                -(currentSupercell -1) * latticeConstant / 2 - latticeConstant / 2,
                -(currentSupercell -1) * latticeConstant / 2 - latticeConstant / 2
            );
             const maxCorner = minCorner.clone().add(new THREE.Vector3(cellDimension, cellDimension, cellDimension));


            // Define vertices relative to the *centered* supercell origin
             const vertices = [
                new THREE.Vector3(minCorner.x, minCorner.y, minCorner.z), // 0: ---
                new THREE.Vector3(maxCorner.x, minCorner.y, minCorner.z), // 1: +--
                new THREE.Vector3(maxCorner.x, maxCorner.y, minCorner.z), // 2: ++-
                new THREE.Vector3(minCorner.x, maxCorner.y, minCorner.z), // 3: -+-
                new THREE.Vector3(minCorner.x, minCorner.y, maxCorner.z), // 4: --+
                new THREE.Vector3(maxCorner.x, minCorner.y, maxCorner.z), // 5: +-+
                new THREE.Vector3(maxCorner.x, maxCorner.y, maxCorner.z), // 6: +++
                new THREE.Vector3(minCorner.x, maxCorner.y, maxCorner.z)  // 7: -++
            ];

            const edges = [
                0, 1, 1, 2, 2, 3, 3, 0, // Bottom face
                4, 5, 5, 6, 6, 7, 7, 4, // Top face
                0, 4, 1, 5, 2, 6, 3, 7  // Vertical edges
            ];

            // Check if cellLines object already exists and dispose geometry if it does
            let cellLines = crystalGroup.getObjectByName("unitCellLines");
            if (cellLines) {
                if(cellLines.geometry) cellLines.geometry.dispose();
                crystalGroup.remove(cellLines);
            }

            const lineGeometry = new THREE.BufferGeometry();
            const positions = [];
            edges.forEach(index => {
                positions.push(vertices[index].x, vertices[index].y, vertices[index].z);
            });
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

            cellLines = new THREE.LineSegments(lineGeometry, cellMaterial);
            cellLines.name = "unitCellLines"; // Name it for easy removal
            crystalGroup.add(cellLines); // Add to the crystal group
            // console.log("Drew unit cell outline."); // Less verbose logging
        }


        // --- UI and Controls ---
        function setupControls() {
            controlsContainer.innerHTML = ''; // Clear loading message

             // Build Control HTML Dynamically
            let controlsHTML = `<h4>Controls</h4>`;

            // Composition Slider (if variable)
             if (vizData.composition.min_x !== vizData.composition.max_x) {
                 controlsHTML += `
                    <div class="control-group" id="${controlsElementId}-composition-group">
                        <label class="control-title" for="${controlsElementId}-composition">Composition (${vizData.composition.variable_element || 'x'} fraction 'x')</label>
                        <input type="range" id="${controlsElementId}-composition" class="slider"
                               min="${vizData.composition.min_x}" max="${vizData.composition.max_x}" step="0.01" value="${currentComposition}">
                        <div id="${controlsElementId}-composition-value">x = ${currentComposition.toFixed(2)}</div>
                    </div>`;
             }

             // Visualization Style Buttons
             controlsHTML += `
                <div class="control-group viz-controls">
                    <div class="control-title">Visualization</div>
                    <button data-style="stick" id="${controlsElementId}-btn-stick">Stick</button>
                    <button data-style="ballAndStick" id="${controlsElementId}-btn-ball-stick">Ball & Stick</button>
                    <button data-style="spacefill" id="${controlsElementId}-btn-spacefill">Spacefill</button>
                </div>`;

             // Unit Cell Buttons
             controlsHTML += `
                <div class="control-group cell-controls">
                    <div class="control-title">Unit Cell</div>
                    <button id="${controlsElementId}-btn-show-cell">Show Cell</button>
                    <button id="${controlsElementId}-btn-hide-cell">Hide Cell</button>
                </div>`;

            // Supercell Buttons
            controlsHTML += `
                <div class="control-group supercell-controls">
                   <div class="control-title">Supercell</div>
                   ${(vizData.supercell_options || [1]).map(size =>
                       `<button data-size="${size}" id="${controlsElementId}-btn-${size}x${size}x${size}">${size}×${size}×${size}</button>`
                    ).join('')}
               </div>`;

             // Info Panel
              controlsHTML += `
                 <div class="control-group">
                     <div class="control-title">Info</div>
                     <div class="info-panel">
                         <h5 id="${controlsElementId}-info-title">${allMaterialDetails.materialName || 'Material'} Structure</h5>
                         <div id="${controlsElementId}-lattice-info">Lattice: ...</div>
                         <div id="${controlsElementId}-composition-info">Composition: ...</div>
                         <div id="${controlsElementId}-spacegroup-info">Space group: ${allMaterialDetails.identification?.properties?.space_group?.summary || 'N/A'}</div>
                         <hr>
                         <div id="${controlsElementId}-legend"></div>
                     </div>
                 </div>`;

             // Action Buttons
             controlsHTML += `
                 <div class="control-group action-controls">
                    <div class="control-title">Actions</div>
                    <button id="${controlsElementId}-btn-spin">Spin</button>
                    <button id="${controlsElementId}-btn-stop">Stop</button>
                    <button id="${controlsElementId}-btn-screenshot">Screenshot (PNG)</button>
                 </div>`;

            controlsContainer.innerHTML = controlsHTML;

            // --- Add Event Listeners ---
            const compSlider = document.getElementById(`${controlsElementId}-composition`);
            const compValueDisplay = document.getElementById(`${controlsElementId}-composition-value`);

            if (compSlider) {
                 compSlider.addEventListener('input', () => {
                    currentComposition = parseFloat(compSlider.value);
                    if(compValueDisplay) compValueDisplay.textContent = `x = ${currentComposition.toFixed(2)}`;
                    // Regenerate atoms and update the scene
                    generateAtomData(currentComposition, currentSupercell);
                    updateScene();
                });
            }

            // Style Buttons
            controlsContainer.querySelectorAll('.viz-controls button').forEach(button => {
                button.addEventListener('click', function() {
                    if (currentViewStyle !== this.dataset.style) {
                        currentViewStyle = this.dataset.style;
                        updateActiveButtons(this, '.viz-controls');
                        updateScene(); // Redraw with new style
                    }
                });
            });

            // Cell Buttons
            const showCellBtn = document.getElementById(`${controlsElementId}-btn-show-cell`);
            const hideCellBtn = document.getElementById(`${controlsElementId}-btn-hide-cell`);
            if (showCellBtn) showCellBtn.addEventListener('click', function() {
                 if (!cellShown) {
                    cellShown = true; updateActiveButtons(this, '.cell-controls');
                    updateScene(); // Redraw to show cell
                 }
            });
            if (hideCellBtn) hideCellBtn.addEventListener('click', function() {
                 if (cellShown) {
                    cellShown = false; updateActiveButtons(this, '.cell-controls');
                    updateScene(); // Redraw to hide cell
                 }
            });

             // Supercell Buttons
             controlsContainer.querySelectorAll('.supercell-controls button').forEach(button => {
                 button.addEventListener('click', function() {
                     const newSize = parseInt(this.dataset.size);
                     if (currentSupercell !== newSize) {
                         currentSupercell = newSize;
                         updateActiveButtons(this, '.supercell-controls');
                         // Regenerate atoms for new supercell size and update scene
                         generateAtomData(currentComposition, currentSupercell);
                         updateScene();
                         // Adjust camera zoom slightly based on supercell size
                         if (camera && controls) {
                            camera.position.setLength(latticeConstant * currentSupercell * 1.8); // Maintain relative distance
                            controls.update();
                         }
                     }
                 });
             });

            // Action Buttons
             const spinBtn = document.getElementById(`${controlsElementId}-btn-spin`);
             const stopBtn = document.getElementById(`${controlsElementId}-btn-stop`);
             const screenshotBtn = document.getElementById(`${controlsElementId}-btn-screenshot`);

             if (spinBtn) spinBtn.addEventListener('click', () => {
                 if (!isSpinning && controls) {
                     isSpinning = true;
                     controls.autoRotate = true;
                     controls.autoRotateSpeed = 1.0; // Adjust speed as needed
                 }
             });
             if(stopBtn) stopBtn.addEventListener('click', () => {
                  if (isSpinning && controls) {
                     isSpinning = false;
                     controls.autoRotate = false;
                  }
             });
             if(screenshotBtn) screenshotBtn.addEventListener('click', () => {
                 if (!renderer || !scene || !camera) {
                     console.error("Screenshot failed: Renderer, scene, or camera not initialized.");
                     return;
                 }
                 try {
                     // Render right before capturing
                     renderer.render(scene, camera);
                     const imageData = renderer.domElement.toDataURL('image/png');
                     const link = document.createElement('a');
                     const safeMaterialName = (allMaterialDetails.materialName || 'material').replace(/ /g, '_').toLowerCase();
                     let compString = (vizData.composition.min_x !== vizData.composition.max_x) ? `_x${currentComposition.toFixed(2)}` : "";
                     link.download = `${safeMaterialName}_${structureType}${compString}_${currentSupercell}x${currentSupercell}x${currentSupercell}_${currentViewStyle}.png`;
                     link.href = imageData;
                     document.body.appendChild(link); // Required for Firefox
                     link.click();
                     document.body.removeChild(link); // Clean up
                 } catch (e) {
                     console.error("Screenshot failed:", e);
                     // Provide more specific feedback if possible (e.g., tainted canvas)
                     if (e.name === 'SecurityError') {
                         alert("Could not capture screenshot due to security restrictions (cross-origin data). Try serving files from a local web server.");
                     } else {
                         alert("Could not capture screenshot. Check console for errors.");
                     }
                 }
             });


            // Initialize Info Panel
            updateInfoPanel(currentComposition); // Initial update
            populateLegend();

             // Set initial active buttons based on state
             updateActiveButtons(controlsContainer.querySelector(`.viz-controls button[data-style="${currentViewStyle}"]`), '.viz-controls');
             updateActiveButtons(controlsContainer.querySelector(`.cell-controls button[id$="${cellShown ? 'show' : 'hide'}-cell"]`), '.cell-controls');
             updateActiveButtons(controlsContainer.querySelector(`.supercell-controls button[data-size="${currentSupercell}"]`), '.supercell-controls');

        } // --- End setupControls ---

        // --- Info Panel & Legend ---
        function updateInfoPanel(compositionRatio) {
             const latticeInfoEl = document.getElementById(`${controlsElementId}-lattice-info`);
             const compositionInfoEl = document.getElementById(`${controlsElementId}-composition-info`);

             if(latticeInfoEl) latticeInfoEl.textContent = `Lattice: a ≈ ${latticeConstant.toFixed(3)} Å`; // Uses calculated latticeConstant

             if(compositionInfoEl && vizData.composition.formula_template && vizData.composition.min_x !== vizData.composition.max_x) {
                const formula = vizData.composition.formula_template
                                  .replace('{x}', compositionRatio.toFixed(2))
                                  .replace('{1-x}', (1 - compositionRatio).toFixed(2));
                compositionInfoEl.innerHTML = `Composition: ${formula}`; // Use innerHTML for subscript
            } else if (compositionInfoEl && vizData.composition.formula_template) {
                const formula = vizData.composition.formula_template.replace(/{1-x}/g,'').replace(/{x}/g,'');
                compositionInfoEl.innerHTML = `Formula: ${formula}`;
            } else if (compositionInfoEl) {
                 compositionInfoEl.textContent = `Composition: x = ${compositionRatio.toFixed(2)}`;
            }
        }

        function populateLegend() {
            const legendEl = document.getElementById(`${controlsElementId}-legend`);
            if (!legendEl || !atomInfo) return;
            legendEl.innerHTML = ''; // Clear previous
            Object.entries(atomInfo).forEach(([symbol, info]) => {
                const upperSymbol = symbol.toUpperCase();
                const color = materials[upperSymbol]?.color.getStyle() || '#cccccc';
                const legendItem = document.createElement('div');
                legendItem.className = 'legend';
                legendItem.innerHTML = `<div class="legend-color" style="background-color:${color};"></div><div>${symbol}</div>`;
                legendEl.appendChild(legendItem);
            });
             // Add bond legend item only if relevant styles are selected
             if (currentViewStyle === 'stick' || currentViewStyle === 'ballAndStick') {
                 const bondLegendItem = document.createElement('div');
                 bondLegendItem.className = 'legend';
                 bondLegendItem.innerHTML = `<div class="legend-color" style="background-color:${bondMaterial.color.getStyle()};"></div><div>Bonds</div>`;
                 legendEl.appendChild(bondLegendItem);
             }
        }


        // --- Helper to update active button states ---
        function updateActiveButtons(clickedButton, buttonGroupSelector) {
            if (!clickedButton) return;
            // Find the button group relative to the controls container for robustness
            const groupContainer = controlsContainer.querySelector(buttonGroupSelector);
            if (!groupContainer) { console.warn("Could not find button group container:", buttonGroupSelector); return; }
            groupContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            clickedButton.classList.add('active');
        }

        // --- Window Resize Handler ---
        function onWindowResize() {
            if (!camera || !renderer || !viewerContainer) return;
            const width = viewerContainer.clientWidth;
            const height = viewerContainer.clientHeight;
            if (width === 0 || height === 0) return; // Prevent errors if container is hidden
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }

        // --- Animation Loop ---
        function animate() {
            // Only continue loop if renderer exists (allows cleanup)
            if (!renderer) return;
            animationFrameId = requestAnimationFrame(animate);
            if (controls) controls.update(); // Required if enableDamping is true
            renderer.render(scene, camera);
        }

        // --- Cleanup Function (Important for SPA/dynamic content) ---
        function cleanup() {
             console.log("Cleaning up Three.js viewer...");
             window.removeEventListener('resize', onWindowResize);
             if (animationFrameId) cancelAnimationFrame(animationFrameId);
             animationFrameId = null;
             disposeMeshes(crystalGroup); // Dispose geometries/materials in the group
             if(scene) scene.remove(crystalGroup);

             // Dispose sphere geometries map
             Object.values(sphereGeometries).forEach(geom => geom.dispose());
             stickGeometry.dispose(); // Dispose shared stick geometry

              // Dispose shared materials
             Object.values(materials).forEach(mat => mat.dispose());
             bondMaterial.dispose();
             cellMaterial.dispose();
             defaultMaterial.dispose();

             if (renderer) {
                renderer.dispose(); // Release WebGL context
                 if (renderer.domElement && renderer.domElement.parentNode) {
                     renderer.domElement.parentNode.removeChild(renderer.domElement); // Remove canvas
                 }
                renderer = null; // Clear reference
             }
              // Clear other references
             scene = null; camera = null; controls = null; crystalGroup = null;
             currentAtoms = [];
        }

        // --- === Main Execution Flow === ---
        try {
            viewerContainer.innerHTML = ''; // Clear loading message
            controlsContainer.innerHTML = ''; // Clear loading message
            initThree();
            setupControls();
            generateAtomData(currentComposition, currentSupercell); // Generate initial data
            updateScene(); // Perform initial render
            animate(); // Start animation loop

            // Add a listener to the parent container to detect when it's removed from DOM (experimental)
            // This might be useful if the section containing the viewer is dynamically removed.
            // A more robust solution might involve a MutationObserver or explicit cleanup calls.
             const observer = new MutationObserver((mutationsList, observerInstance) => {
                 for(let mutation of mutationsList) {
                     if (mutation.removedNodes) {
                         mutation.removedNodes.forEach(node => {
                             if (node === viewerContainer.closest('.crystal-viewer-wrapper') || node === viewerContainer) {
                                 console.log("Viewer container removed from DOM, initiating cleanup.");
                                 cleanup();
                                 observerInstance.disconnect(); // Stop observing
                                 return;
                             }
                         });
                     }
                 }
             });
             // Start observing the parent of the wrapper, or body if necessary
             const observeTarget = viewerContainer.closest('.property-detail-block') || document.body;
             observer.observe(observeTarget, { childList: true, subtree: true });


        } catch(error) {
            console.error("Error during Three.js initialization:", error);
            viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Failed to initialize 3D viewer. Check console.</p>`;
            controlsContainer.innerHTML = '';
            cleanup(); // Attempt cleanup on error
        }

    } // --- End initializeThreeJsViewer ---
    // --- ============================================================ ---
    // ---            *** NEW Three.js Initializer END ***             ---
    // --- ============================================================ ---

}); // End DOMContentLoaded
