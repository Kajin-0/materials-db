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
            if (response.status === 404) { throw new Error(`Details file not found: ${detailFilePath}. Check file name and path.`); }
            else { throw new Error(`HTTP error ${response.status} fetching ${detailFilePath}`); }
        }

        console.log("[Full Detail Loader] Fetch successful. Parsing JSON...");
        allMaterialDetails = await response.json(); // Assign to outer scope variable
        // Basic Validation of fetched JSON
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
            // Ensure materialName and references are excluded if they exist at the top level
            const excludedKeys = ['materialName', 'references'];
            for (const sectionKey in allMaterialDetails) {
                if (excludedKeys.includes(sectionKey)) continue;
                const sectionData = allMaterialDetails[sectionKey];
                // Also check if sectionData is an actual object intended to be a section
                 if (typeof sectionData !== 'object' || sectionData === null || typeof sectionData.displayName !== 'string') {
                    console.warn(`[Full Detail Loader] Skipping key '${sectionKey}' as it doesn't appear to be a valid section object with a displayName string.`);
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
            // **** ADD VALIDATION FOR VIZ DATA ****
            if (!vizData || typeof vizData !== 'object' || !vizData.atom_info || !vizData.composition || !vizData.lattice_constants) {
                 console.error(`[renderPropertyBlock] Invalid or incomplete visualization_data for '${propKey}'. Skipping viewer initialization.`);
            } else {
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
            } // End else block (vizData is valid)
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
    // ---            *** REVISED Three.js Initializer START ***         ---
    // ---          (WITH ENHANCED DEBUGGING FOR RENDERING)             ---
    // --- ============================================================== ---
    function initializeThreeJsViewer(viewerElementId, controlsElementId, vizData, allMaterialDetails) {
        console.log("--- [Three.js Init] Initializing Viewer ---");
        // console.log("[Three.js Init] Viz Data:", vizData); // DEBUG: Log vizData if needed

        const viewerContainer = document.getElementById(viewerElementId);
        const controlsContainer = document.getElementById(controlsElementId);

        if (!viewerContainer || !controlsContainer) {
            console.error("[Three.js Error] Viewer or controls element not found!");
            if(viewerContainer) viewerContainer.innerHTML = '<p class="error-message">Viewer container not found.</p>';
            if(controlsContainer) controlsContainer.innerHTML = '<p class="error-message">Controls container not found.</p>';
            return;
        }

        // --- Basic Three.js Setup ---
        let scene, camera, renderer, controls, crystalGroup;
        let animationFrameId = null; // Initialize to null

        // --- State Variables ---
        let currentComposition = vizData.composition?.initial_x ?? 0.5;
        let currentSupercell = 1; // Start with 1x1x1 for easier debugging
        let currentViewStyle = 'ballAndStick';
        let cellShown = false;
        let labelsShown = false;
        let isSpinning = false;
        let currentAtoms = [];
        let latticeConstant = 6.47; // Default, will be recalculated

        // --- Data Extraction and Validation ---
        const atomInfo = vizData.atom_info || {};
        const latticeConstantsSource = vizData.lattice_constants || {};
        currentSupercell = 1; // Force 1x1x1 start for debugging

        const structureType = vizData.structure_type;
        if (structureType !== 'zincblende_alloy') {
             console.error("[Three.js Error] Viewer currently only supports 'zincblende_alloy' structure type.");
             viewerContainer.innerHTML = `<p class="error-message">Viewer Error: Unsupported structure type '${structureType}'.</p>`; controlsContainer.innerHTML = ''; return;
        }
        if (!vizData.composition || typeof vizData.composition.min_x !== 'number' || typeof vizData.composition.max_x !== 'number') {
             console.error("[Three.js Error] Viewer requires vizData.composition with valid min_x and max_x numbers.");
             viewerContainer.innerHTML = `<p class="error-message">Viewer Error: Invalid composition data.</p>`; controlsContainer.innerHTML = ''; return;
        }
         if (!atomInfo || Object.keys(atomInfo).length < 3 || !Object.values(atomInfo).some(info => info.role === 'cation_host') || !Object.values(atomInfo).some(info => info.role === 'cation_subst') || !Object.values(atomInfo).some(info => info.role === 'anion')) {
             console.error("[Three.js Error] Viewer requires at least 3 elements defined in vizData.atom_info with roles 'cation_host', 'cation_subst', and 'anion'.");
             viewerContainer.innerHTML = `<p class="error-message">Viewer Error: Incomplete or invalid atom info role data.</p>`; controlsContainer.innerHTML = ''; return;
         }


        // --- Constants and Setup ---
        const bondCutoffFactor = 0.45;
        const sphereDetail = 16;
        const stickDetail = 8;
        const stickRadius = 0.06;
        const sphereScales = {
            spacefill: 0.55, ballAndStick: 0.28, stick: 0.1
        };

        // --- Materials ---
        const materials = {};
        const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.4, roughness: 0.6 });
        Object.entries(atomInfo).forEach(([symbol, info]) => {
            console.log(`[Three.js Mat Setup] Atom: ${symbol}, Info:`, info);
            if (!info || typeof info.color !== 'string' || typeof info.radius !== 'number' || info.radius <= 0 || typeof info.role !== 'string') {
                console.error(`[Three.js Mat Setup] Invalid atom_info for ${symbol}:`, info);
                materials[symbol.toUpperCase()] = defaultMaterial; // Use default if info is bad
            } else {
                materials[symbol.toUpperCase()] = new THREE.MeshStandardMaterial({ color: info.color, metalness: 0.4, roughness: 0.6 });
                console.log(`[Three.js Mat Setup] Created material for ${symbol.toUpperCase()}: Color ${info.color}`);
            }
        });
        const bondMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.1, roughness: 0.8 });
        const cellMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });

        // --- Geometries (Reusable) ---
        const sphereGeometries = {};
        // Stick geometry created *once* - DO NOT DISPOSE THIS ONE DIRECTLY
        const stickGeometry = new THREE.CylinderGeometry(stickRadius, stickRadius, 1, stickDetail, 1);

        // --- Helper Functions ---
        function disposeMeshes(group) {
            if (!group) return;
            const children_to_remove = [...group.children]; // Create shallow copy to iterate over
            // console.log(`[Three.js Cleanup] Attempting to dispose & remove ${children_to_remove.length} children.`); // DEBUG
            children_to_remove.forEach(object => {
                if (object.isMesh || object.isLineSegments) {
                    if (object.geometry) {
                        // Only dispose geometry if it's NOT the shared stickGeometry template
                        // Sphere geometries are dynamically created/disposed in updateScene's prep phase
                        // Cell lines geometry is disposed here if found by name
                        if (object.name === "unitCellLines") {
                            object.geometry.dispose();
                            // console.log(`[Three.js Cleanup] Disposed cell line geometry.`); // DEBUG
                        } else if (object.geometry !== stickGeometry){
                             // Check if it's one of the dynamic sphere geometries before disposing
                             if(Object.values(sphereGeometries).includes(object.geometry)){
                                // This geometry will be disposed when recreated in updateScene, skip here.
                             } else {
                                 // Dispose other potential geometries not handled elsewhere
                                 // object.geometry.dispose(); // Be cautious here
                             }
                        }
                    }
                    // Materials are shared, generally no disposal here
                }
                group.remove(object); // Remove from parent group
            });
        }


        // --- Initialize Scene ---
        function initThree() {
             // Ensure container is ready
             if (viewerContainer.clientWidth === 0 || viewerContainer.clientHeight === 0) {
                 console.warn("[Three.js Init] Viewer container has zero dimensions. Delaying init slightly.");
                 requestAnimationFrame(initThree); // Try again next frame
                 return;
             }

            console.log(`[Three.js Init] Container dimensions: ${viewerContainer.clientWidth}x${viewerContainer.clientHeight}`);
            while (viewerContainer.firstChild) { viewerContainer.removeChild(viewerContainer.firstChild); }
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xffffff);
            const width = viewerContainer.clientWidth; const height = viewerContainer.clientHeight;
            camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
            camera.position.set(0, 0, latticeConstant * currentSupercell * 2.5); // Adjusted initial distance
            camera.lookAt(0, 0, 0);
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(window.devicePixelRatio);
            viewerContainer.appendChild(renderer.domElement);
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true; controls.dampingFactor = 0.1;
            // Set initial min/max distance based on default lattice constant
            controls.minDistance = latticeConstant * 0.5;
            controls.maxDistance = latticeConstant * 10; // Initial reasonable max

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); scene.add(ambientLight);
            const keyLight = new THREE.DirectionalLight(0xffffff, 0.8); keyLight.position.set(5, 5, 10); scene.add(keyLight);
            const fillLight = new THREE.DirectionalLight(0xffffff, 0.4); fillLight.position.set(-5, 2, -5); scene.add(fillLight);
            const backLight = new THREE.DirectionalLight(0xffffff, 0.2); backLight.position.set(0, -5, -2); scene.add(backLight);
            crystalGroup = new THREE.Group(); scene.add(crystalGroup);
            window.removeEventListener('resize', onWindowResize); window.addEventListener('resize', onWindowResize, false);
            console.log("[Three.js] Scene initialized successfully.");
        }


        // --- Generate Atom Positions ---
        function generateAtomData(compositionRatio, cellSize) {
            const atoms = [];
            console.log(`[Three.js generateAtomData] Input compositionRatio: ${compositionRatio}, cellSize: ${cellSize}`);

            const cation_host_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_host');
            const cation_subst_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_subst');
            const anion_symbol = Object.keys(atomInfo).find(key => atomInfo[key].role === 'anion');

            if (!cation_host_symbol || !cation_subst_symbol || !anion_symbol) {
                console.error("[Three.js generateAtomData] Could not determine atom roles from atomInfo:", atomInfo);
                currentAtoms = []; updateInfoPanel(compositionRatio);
                return [];
            }
            console.log(`[Three.js generateAtomData] Roles: Host=${cation_host_symbol}, Subst=${cation_subst_symbol}, Anion=${anion_symbol}`);

            const a_host = Number(latticeConstantsSource[cation_host_symbol] || 6.46);
            const a_subst = Number(latticeConstantsSource[cation_subst_symbol] || 6.48);
            if (isNaN(a_host) || isNaN(a_subst)) {
                console.error("[Three.js generateAtomData] Invalid lattice constants:", latticeConstantsSource);
                 currentAtoms = []; updateInfoPanel(compositionRatio);
                 return [];
            }
            const ratio = Number(compositionRatio);
            if (isNaN(ratio)) {
                 console.error(`[Three.js generateAtomData] Invalid compositionRatio: ${compositionRatio}`);
                 currentAtoms = []; updateInfoPanel(compositionRatio);
                 return [];
            }

            latticeConstant = a_host * (1 - ratio) + a_subst * ratio;
            if (isNaN(latticeConstant) || latticeConstant <= 0) {
                 console.error(`[Three.js generateAtomData] Invalid calculated lattice constant: ${latticeConstant}`);
                 currentAtoms = []; updateInfoPanel(compositionRatio);
                 return [];
            }
            console.log(`[Three.js generateAtomData] Calculated lattice constant (a): ${latticeConstant.toFixed(4)}`);

            // Centering offset
            const centerOffset = new THREE.Vector3(
                 (cellSize - 1) * latticeConstant / 2,
                 (cellSize - 1) * latticeConstant / 2,
                 (cellSize - 1) * latticeConstant / 2
             );

            const baseAnion = [[0.00, 0.00, 0.00], [0.00, 0.50, 0.50], [0.50, 0.00, 0.50], [0.50, 0.50, 0.00]];
            const baseCation = [[0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]];

            let atomCount = 0;
            for (let i = 0; i < cellSize; i++) {
                for (let j = 0; j < cellSize; j++) {
                    for (let k = 0; k < cellSize; k++) {
                        const cellOrigin = new THREE.Vector3(i * latticeConstant, j * latticeConstant, k * latticeConstant);
                        baseAnion.forEach(pos => {
                            const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2]).multiplyScalar(latticeConstant).add(cellOrigin).sub(centerOffset);
                             if (atomCount % 100 === 0) console.log(`[Three.js generateAtomData Sample] ${anion_symbol.toUpperCase()} Pos: (${atomPos.x.toFixed(2)}, ${atomPos.y.toFixed(2)}, ${atomPos.z.toFixed(2)})`); // Log less frequently
                             if (isNaN(atomPos.x) || isNaN(atomPos.y) || isNaN(atomPos.z)) {
                                 console.error(`[Three.js generateAtomData] NaN position detected for ${anion_symbol}!`);
                             } else { atoms.push({ element: anion_symbol.toUpperCase(), position: atomPos }); }
                            atomCount++;
                        });
                        baseCation.forEach(pos => {
                            const elemType = Math.random() < ratio ? cation_subst_symbol : cation_host_symbol;
                            const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2]).multiplyScalar(latticeConstant).add(cellOrigin).sub(centerOffset);
                             if (atomCount % 100 === 1) console.log(`[Three.js generateAtomData Sample] ${elemType.toUpperCase()} Pos: (${atomPos.x.toFixed(2)}, ${atomPos.y.toFixed(2)}, ${atomPos.z.toFixed(2)})`); // Log less frequently
                             if (isNaN(atomPos.x) || isNaN(atomPos.y) || isNaN(atomPos.z)) {
                                 console.error(`[Three.js generateAtomData] NaN position detected for ${elemType}!`);
                             } else { atoms.push({ element: elemType.toUpperCase(), position: atomPos }); }
                             atomCount++;
                        });
                    }
                }
            }
            console.log(`[Three.js] Generated ${atoms.length} atoms for ${cellSize}x${cellSize}x${cellSize} cell.`);
            currentAtoms = atoms;
            updateInfoPanel(ratio);
            return atoms;
        }


        // --- Create/Update Scene Content ---
        function updateScene() {
            console.log(`[Three.js updateScene] Style=${currentViewStyle}, Supercell=${currentSupercell}, CellShown=${cellShown}`);
            if (!scene || !crystalGroup) { console.error("[Three.js updateScene] Scene or crystalGroup not initialized."); return; }
            disposeMeshes(crystalGroup); // Clear previous meshes geometries first
            // while(crystalGroup.children.length > 0){ crystalGroup.remove(crystalGroup.children[0]); } // Ensure group is empty - Handled by disposeMeshes now

            if (!currentAtoms || currentAtoms.length === 0) { console.warn("[Three.js updateScene] No atom data to render."); return; }
            console.log(`[Three.js updateScene] Rendering ${currentAtoms.length} atoms.`);

            // --- Prepare Sphere Geometries ---
            const currentSphereScale = sphereScales[currentViewStyle] || sphereScales.ballAndStick;
            console.log(`[Three.js updateScene] Current sphere scale factor: ${currentSphereScale}`);
            let allGeometriesValid = true;
            Object.keys(atomInfo).forEach(symbol => {
                const upperSymbol = symbol.toUpperCase();
                const baseRadius = atomInfo[symbol]?.radius ?? 1.0;
                let radius = baseRadius * currentSphereScale;
                if (isNaN(radius) || radius <= 1e-3) {
                    console.warn(`[Three.js updateScene] Calculated invalid radius ${radius} for ${upperSymbol}. Using small default 0.05.`);
                    radius = 0.05;
                    // Don't set allGeometriesValid to false here, just use the default radius
                }
                // Dispose old sphere geometry before creating new one
                if (sphereGeometries[upperSymbol]) { sphereGeometries[upperSymbol].dispose(); }
                try {
                     sphereGeometries[upperSymbol] = new THREE.SphereGeometry(radius, sphereDetail, sphereDetail);
                     // console.log(`[Three.js updateScene] Created sphere geometry for ${upperSymbol} with radius ${radius.toFixed(3)}`); // Less verbose
                } catch (e) {
                     console.error(`[Three.js updateScene] Error creating SphereGeometry for ${upperSymbol} with radius ${radius}:`, e);
                     allGeometriesValid = false; // Error creating geometry is critical
                     sphereGeometries[upperSymbol] = null;
                }
            });

             if (!allGeometriesValid) { console.error("[Three.js updateScene] Failed to create one or more critical sphere geometries. Aborting."); return; }

             // --- Add Atoms (Spheres) ---
             let spheresAdded = 0;
             currentAtoms.forEach((atom, index) => { // Add index for debugging
                 const symbol = atom.element.toUpperCase();
                 const geometry = sphereGeometries[symbol];
                 const material = materials[symbol] || defaultMaterial;
                 if (!geometry) { console.warn(`[Three.js updateScene] No geometry for ${symbol} at index ${index}, skipping sphere.`); return; }
                 if (!material) { console.warn(`[Three.js updateScene] No material for ${symbol} at index ${index}, using default.`); }
                 if (isNaN(atom.position.x) || isNaN(atom.position.y) || isNaN(atom.position.z)) {
                     console.error(`[Three.js updateScene] Invalid position for atom ${symbol} at index ${index}:`, atom.position);
                     return;
                 }
                 const sphere = new THREE.Mesh(geometry, material);
                 sphere.position.copy(atom.position);
                 crystalGroup.add(sphere);
                 spheresAdded++;
             });
             console.log(`[Three.js updateScene] Added ${spheresAdded} spheres.`);
             let spheresInGroup = crystalGroup.children.filter(c => c.isMesh && c.geometry.type === "SphereGeometry").length;
             console.log(`[Three.js updateScene] Spheres actually in group: ${spheresInGroup}`); // Verify spheres are added

            // --- Add Bonds (Sticks) ---
             let bondsAdded = 0;
             let potentialBondsChecked = 0;
            if (currentViewStyle === 'stick' || currentViewStyle === 'ballAndStick') {
                console.log(`[Three.js Bond Check] Using latticeConstant: ${latticeConstant?.toFixed(4)}`);
                console.log(`[Three.js Bond Check] Using stickRadius: ${stickRadius}`);

                const bondCutoffSq = (latticeConstant * bondCutoffFactor) * (latticeConstant * bondCutoffFactor);
                console.log(`[Three.js Bond Check] bondCutoffSq: ${bondCutoffSq?.toFixed(3)}`);

                if (isNaN(bondCutoffSq) || bondCutoffSq <= 0) {
                    console.error(`[Three.js Bond Check] Invalid bondCutoffSq: ${bondCutoffSq}. Skipping bond creation.`);
                } else {
                    const yAxis = new THREE.Vector3(0, 1, 0);
                    for (let i = 0; i < currentAtoms.length; i++) {
                        for (let j = i + 1; j < currentAtoms.length; j++) {
                            const atom1 = currentAtoms[i];
                            const atom2 = currentAtoms[j];
                             if (!atom1 || !atom2 || !atom1.position || !atom2.position || !atom1.element || !atom2.element || isNaN(atom1.position.x) || isNaN(atom2.position.x)) continue;

                            const distSq = atom1.position.distanceToSquared(atom2.position);
                            potentialBondsChecked++;

                            if (distSq > 1e-6 && distSq < bondCutoffSq) {
                                 const role1 = atomInfo[atom1.element]?.role ?? 'unknown';
                                 const role2 = atomInfo[atom2.element]?.role ?? 'unknown';
                                 const distance = Math.sqrt(distSq);

                                 // console.log(`[Bond Check ${i}-${j}] Dist: ${distance.toFixed(3)} (<${Math.sqrt(bondCutoffSq).toFixed(3)}?), Atom1: ${atom1.element}(${role1}), Atom2: ${atom2.element}(${role2})`); // Less verbose

                                 const rolesMatch = (role1.includes('cation') && role2 === 'anion') || (role1 === 'anion' && role2.includes('cation'));
                                 // console.log(`[Bond Check ${i}-${j}] Roles match for bonding? ${rolesMatch}`); // Less verbose

                                if (rolesMatch) {
                                     if (isNaN(distance) || distance <= 1e-3) { console.error(`[Bond Check ${i}-${j}] Invalid calculated distance: ${distance}`); continue; }
                                    // console.log(`[Bond Check ${i}-${j}] CREATING BOND`); // Less verbose

                                    // Use CLONE of the reusable stick geometry's GEOMETRY, but reuse the MATERIAL
                                    const stickMesh = new THREE.Mesh(stickGeometry.clone(), bondMaterial); // Clone geometry

                                    stickMesh.position.copy(atom1.position).add(atom2.position).multiplyScalar(0.5);
                                    const direction = new THREE.Vector3().subVectors(atom2.position, atom1.position).normalize();
                                    const quaternion = new THREE.Quaternion();
                                    if (Math.abs(direction.y) < 1.0 - 1e-6) {
                                        quaternion.setFromUnitVectors(yAxis, direction);
                                    } else {
                                         if (direction.y < 0) { quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI); }
                                    }
                                    stickMesh.quaternion.copy(quaternion);
                                    stickMesh.scale.set(1, distance, 1); // Scale only Y (length)

                                     // console.log(`[Bond Check ${i}-${j}] Stick Pos: (${stickMesh.position.x.toFixed(2)}, ${stickMesh.position.y.toFixed(2)}, ${stickMesh.position.z.toFixed(2)}), ScaleY: ${stickMesh.scale.y.toFixed(3)}`); // Less verbose

                                    crystalGroup.add(stickMesh);
                                    bondsAdded++;
                                } // End role check
                            } // End distance check
                        } // End inner loop (j)
                    } // End outer loop (i)
                    console.log(`[Three.js updateScene] Checked ${potentialBondsChecked} potential bonds, added ${bondsAdded} bonds.`);
                } // End else (bondCutoffSq is valid)
            } // End if need bonds

            // --- Add Unit Cell Outline ---
            if (cellShown) { drawUnitCellOutline(); }
             else { // Ensure removal if not shown
                 let existingLines = crystalGroup.getObjectByName("unitCellLines");
                 if (existingLines) { if (existingLines.geometry) existingLines.geometry.dispose(); crystalGroup.remove(existingLines); }
             }

            // --- Labels (Placeholder) ---
            if (labelsShown) { console.log("[Three.js updateScene] Label rendering not implemented."); }

            // --- Adjust camera/controls ---
             if (controls) {
                 controls.minDistance = latticeConstant * 0.5;
                 controls.maxDistance = latticeConstant * Math.max(currentSupercell * 5, 10);
                 controls.target.set(0, 0, 0); // Re-center target explicitly
                 controls.update();
             }

            console.log(`[Three.js updateScene] Scene update finished. CrystalGroup children: ${crystalGroup.children.length}`);
            let sticksInGroup = crystalGroup.children.filter(c => c.isMesh && c.geometry.type === "CylinderGeometry").length;
             console.log(`[Three.js updateScene] Spheres in group: ${spheresInGroup}, Sticks in group: ${sticksInGroup}`); // Verify sticks were added
            if (crystalGroup.children.length === 0) { console.warn("[Three.js updateScene] No objects were added."); }
            else { if (renderer && scene && camera) { renderer.render(scene, camera); console.log("[Three.js updateScene] Manual render requested."); } }

        } // --- End updateScene ---


        // --- Draw Unit Cell Outline ---
        function drawUnitCellOutline() {
            let existingLines = crystalGroup.getObjectByName("unitCellLines");
            if (existingLines) { if (existingLines.geometry) existingLines.geometry.dispose(); crystalGroup.remove(existingLines); }

            const halfSize = (currentSupercell * latticeConstant) / 2.0;
             const vertices = [
                 new THREE.Vector3(-halfSize, -halfSize, -halfSize), new THREE.Vector3( halfSize, -halfSize, -halfSize),
                 new THREE.Vector3( halfSize,  halfSize, -halfSize), new THREE.Vector3(-halfSize,  halfSize, -halfSize),
                 new THREE.Vector3(-halfSize, -halfSize,  halfSize), new THREE.Vector3( halfSize, -halfSize,  halfSize),
                 new THREE.Vector3( halfSize,  halfSize,  halfSize), new THREE.Vector3(-halfSize,  halfSize,  halfSize)
             ];
            const edges = [ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ];
            const lineGeometry = new THREE.BufferGeometry(); const positions = [];
            edges.forEach(index => { const vert = vertices[index]; positions.push(vert.x, vert.y, vert.z); });
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            const cellLines = new THREE.LineSegments(lineGeometry, cellMaterial); cellLines.name = "unitCellLines";
            crystalGroup.add(cellLines);
             // console.log("[Three.js] Drew unit cell outline."); // Less verbose
        }


        // --- UI and Controls ---
        function setupControls() {
             controlsContainer.innerHTML = ''; // Clear loading message
             let controlsHTML = `<h4>Controls</h4>`;
             if (vizData.composition.min_x !== vizData.composition.max_x) {
                 controlsHTML += `
                    <div class="control-group" id="${controlsElementId}-composition-group">
                        <label class="control-title" for="${controlsElementId}-composition">Composition (${vizData.composition.variable_element || 'x'} fraction 'x')</label>
                        <input type="range" id="${controlsElementId}-composition" class="slider"
                               min="${vizData.composition.min_x}" max="${vizData.composition.max_x}" step="0.01" value="${currentComposition}">
                        <div id="${controlsElementId}-composition-value">x = ${currentComposition.toFixed(2)}</div>
                    </div>`;
             }
             controlsHTML += `
                <div class="control-group viz-controls">
                    <div class="control-title">Visualization</div>
                    <button data-style="stick" id="${controlsElementId}-btn-stick">Stick</button>
                    <button data-style="ballAndStick" id="${controlsElementId}-btn-ball-stick">Ball & Stick</button>
                    <button data-style="spacefill" id="${controlsElementId}-btn-spacefill">Spacefill</button>
                </div>`;
             controlsHTML += `
                <div class="control-group cell-controls">
                    <div class="control-title">Unit Cell</div>
                    <button id="${controlsElementId}-btn-show-cell">Show Cell</button>
                    <button id="${controlsElementId}-btn-hide-cell">Hide Cell</button>
                </div>`;
            controlsHTML += `
                <div class="control-group supercell-controls">
                   <div class="control-title">Supercell</div>
                   ${(vizData.supercell_options || [1]).map(size =>
                       `<button data-size="${size}" id="${controlsElementId}-btn-${size}x${size}x${size}" class="${size === currentSupercell ? 'active' : ''}">${size}×${size}×${size}</button>`
                    ).join('')}
               </div>`;
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
             controlsHTML += `
                 <div class="control-group action-controls">
                    <div class="control-title">Actions</div>
                    <button id="${controlsElementId}-btn-spin">Spin</button>
                    <button id="${controlsElementId}-btn-stop">Stop</button>
                    <button id="${controlsElementId}-btn-screenshot">Screenshot (PNG)</button>
                 </div>`;
            controlsContainer.innerHTML = controlsHTML;

            // Add Event Listeners
            const compSlider = document.getElementById(`${controlsElementId}-composition`);
            if (compSlider) {
                 compSlider.addEventListener('input', () => {
                    currentComposition = parseFloat(compSlider.value);
                    document.getElementById(`${controlsElementId}-composition-value`).textContent = `x = ${currentComposition.toFixed(2)}`;
                    generateAtomData(currentComposition, currentSupercell); updateScene();
                });
            }
             controlsContainer.querySelectorAll('.viz-controls button').forEach(button => {
                 button.addEventListener('click', function() {
                     if (currentViewStyle !== this.dataset.style) {
                         currentViewStyle = this.dataset.style; updateActiveButtons(this, '.viz-controls'); updateScene(); populateLegend();
                     }
                 });
             });
            const showCellBtn = document.getElementById(`${controlsElementId}-btn-show-cell`);
            const hideCellBtn = document.getElementById(`${controlsElementId}-btn-hide-cell`);
             if (showCellBtn) showCellBtn.addEventListener('click', function() { if (!cellShown) { cellShown = true; updateActiveButtons(this, '.cell-controls'); updateScene(); } });
             if (hideCellBtn) hideCellBtn.addEventListener('click', function() { if (cellShown) { cellShown = false; updateActiveButtons(this, '.cell-controls'); updateScene(); } });
             controlsContainer.querySelectorAll('.supercell-controls button').forEach(button => {
                 button.addEventListener('click', function() {
                     const newSize = parseInt(this.dataset.size);
                     if (currentSupercell !== newSize) {
                         currentSupercell = newSize; updateActiveButtons(this, '.supercell-controls');
                         console.log(`[Three.js Controls] Supercell changed to ${newSize}. Regenerating...`);
                         generateAtomData(currentComposition, currentSupercell); updateScene();
                         if (camera && controls) { camera.position.setLength(latticeConstant * currentSupercell * 1.8); controls.target.set(0,0,0); controls.update(); }
                     }
                 });
             });
            const spinBtn = document.getElementById(`${controlsElementId}-btn-spin`);
            const stopBtn = document.getElementById(`${controlsElementId}-btn-stop`);
            const screenshotBtn = document.getElementById(`${controlsElementId}-btn-screenshot`);
             if (spinBtn) spinBtn.addEventListener('click', () => { if (!isSpinning && controls) { isSpinning = true; controls.autoRotate = true; controls.autoRotateSpeed = 1.0; console.log("[Three.js Controls] Spin enabled."); } });
             if(stopBtn) stopBtn.addEventListener('click', () => { if (isSpinning && controls) { isSpinning = false; controls.autoRotate = false; console.log("[Three.js Controls] Spin disabled."); } });
             if(screenshotBtn) screenshotBtn.addEventListener('click', () => { /* ... screenshot logic ... */
                if (!renderer || !scene || !camera) { console.error("Screenshot failed: Renderer, scene, or camera not initialized."); return; }
                 try {
                     renderer.render(scene, camera); // Ensure latest frame
                     const imageData = renderer.domElement.toDataURL('image/png');
                     const link = document.createElement('a');
                     const safeMaterialName = (allMaterialDetails?.materialName || 'material').replace(/ /g, '_').toLowerCase();
                     let compString = (vizData?.composition?.min_x !== vizData?.composition?.max_x) ? `_x${currentComposition.toFixed(2)}` : "";
                     link.download = `${safeMaterialName}_${structureType}${compString}_${currentSupercell}x${currentSupercell}x${currentSupercell}_${currentViewStyle}.png`;
                     link.href = imageData; document.body.appendChild(link); link.click(); document.body.removeChild(link);
                     console.log("[Three.js Controls] Screenshot captured.");
                 } catch (e) {
                     console.error("Screenshot failed:", e);
                     if (e.name === 'SecurityError') { alert("Could not capture screenshot due to security restrictions (cross-origin data)."); }
                     else { alert("Could not capture screenshot. Check console."); }
                 }
             });


            // Initial UI Setup
            updateInfoPanel(currentComposition); populateLegend();
            updateActiveButtons(controlsContainer.querySelector(`.viz-controls button[data-style="${currentViewStyle}"]`), '.viz-controls');
            updateActiveButtons(controlsContainer.querySelector(`.cell-controls button[id$="${cellShown ? 'show' : 'hide'}-cell"]`), '.cell-controls');
            updateActiveButtons(controlsContainer.querySelector(`.supercell-controls button[data-size="${currentSupercell}"]`), '.supercell-controls');
             console.log("[Three.js] Controls setup complete.");
        }

        // --- Info Panel & Legend ---
        function updateInfoPanel(compositionRatio) {
             const latticeInfoEl = document.getElementById(`${controlsElementId}-lattice-info`);
             const compositionInfoEl = document.getElementById(`${controlsElementId}-composition-info`);
             if(latticeInfoEl) latticeInfoEl.textContent = `Lattice: a ≈ ${latticeConstant.toFixed(3)} Å`;
             if(compositionInfoEl && vizData.composition?.formula_template) {
                 const isVariable = vizData.composition.min_x !== vizData.composition.max_x;
                 const formula = isVariable ? vizData.composition.formula_template.replace('{x}', compositionRatio.toFixed(2)).replace('{1-x}', (1 - compositionRatio).toFixed(2)) : vizData.composition.formula_template.replace(/{1-x}/g,'').replace(/{x}/g,'');
                 compositionInfoEl.innerHTML = `${isVariable ? 'Composition' : 'Formula'}: ${formula}`;
             } else if (compositionInfoEl) { compositionInfoEl.textContent = `Composition: x = ${compositionRatio.toFixed(2)}`; }
        }
        function populateLegend() {
            const legendEl = document.getElementById(`${controlsElementId}-legend`);
            if (!legendEl || !atomInfo) return;
            legendEl.innerHTML = '';
            Object.entries(atomInfo).forEach(([symbol, info]) => {
                const upperSymbol = symbol.toUpperCase(); const color = materials[upperSymbol]?.color.getStyle() || '#cccccc';
                const legendItem = document.createElement('div'); legendItem.className = 'legend';
                legendItem.innerHTML = `<div class="legend-color" style="background-color:${color};"></div><div>${symbol} (${info.role || 'N/A'})</div>`;
                legendEl.appendChild(legendItem);
            });
             if (currentViewStyle === 'stick' || currentViewStyle === 'ballAndStick') {
                 const bondLegendItem = document.createElement('div'); bondLegendItem.className = 'legend';
                 bondLegendItem.innerHTML = `<div class="legend-color" style="background-color:${bondMaterial.color.getStyle()};"></div><div>Bonds</div>`;
                 legendEl.appendChild(bondLegendItem);
             }
        }

        // --- Helper to update active button states ---
         function updateActiveButtons(clickedButton, buttonGroupSelector) {
             if (!clickedButton || !controlsContainer) return;
             const groupContainer = controlsContainer.querySelector(buttonGroupSelector);
             if (!groupContainer) { console.warn("Could not find button group container:", buttonGroupSelector); return; }
             groupContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
             clickedButton.classList.add('active');
         }

        // --- Window Resize Handler ---
        function onWindowResize() {
            if (!camera || !renderer || !viewerContainer) return;
            const width = viewerContainer.clientWidth; const height = viewerContainer.clientHeight;
            if (width === 0 || height === 0) return;
            camera.aspect = width / height; camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }

        // --- Animation Loop ---
        function animate() {
            if (!renderer) return; // Stop if cleaned up
            animationFrameId = requestAnimationFrame(animate);
            if (controls) controls.update();
            if (scene && camera) { renderer.render(scene, camera); }
            else { console.warn("[Three.js Animate] Scene or camera is null."); }
        }

        // --- Cleanup Function ---
        function cleanup() {
             console.log("[Three.js] Cleaning up viewer resources...");
             window.removeEventListener('resize', onWindowResize);
             if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
             disposeMeshes(crystalGroup); if(scene && crystalGroup) scene.remove(crystalGroup);
             Object.values(sphereGeometries).forEach(geom => { if(geom) geom.dispose(); });
             if(stickGeometry) stickGeometry.dispose(); // Dispose the template geometry
             Object.values(materials).forEach(mat => { if(mat) mat.dispose(); });
             if(bondMaterial) bondMaterial.dispose(); if(cellMaterial) cellMaterial.dispose(); if(defaultMaterial) defaultMaterial.dispose();
             if (renderer) { renderer.dispose(); if (renderer.domElement && renderer.domElement.parentNode === viewerContainer) { viewerContainer.removeChild(renderer.domElement); } renderer = null; }
             scene = null; camera = null; controls = null; crystalGroup = null; currentAtoms = [];
             console.log("[Three.js] Cleanup complete.");
        }

        // --- === Main Execution Flow === ---
        try {
            initThree();
            if (!scene || !camera || !renderer) { throw new Error("[Three.js Main Flow] Failed to initialize scene, camera, or renderer."); }
            setupControls();
            generateAtomData(currentComposition, currentSupercell);
            updateScene();
            animate();

             // Setup MutationObserver for cleanup
             const observer = new MutationObserver((mutationsList, observerInstance) => {
                 for(let mutation of mutationsList) {
                     if (mutation.removedNodes) {
                         mutation.removedNodes.forEach(node => {
                             if (node === viewerContainer || node === viewerContainer.closest('.crystal-viewer-wrapper')) {
                                 console.log("[Three.js Observer] Viewer container removed from DOM, initiating cleanup.");
                                 cleanup(); observerInstance.disconnect(); return;
                             }
                         });
                     }
                 }
             });
             const observeTarget = viewerContainer.closest('.crystal-viewer-wrapper')?.parentNode;
             if (observeTarget) { observer.observe(observeTarget, { childList: true }); console.log("[Three.js Observer] Observing parent node for viewer removal."); }
             else { console.warn("[Three.js Observer] Could not find parent of viewer wrapper to observe for cleanup."); }

        } catch(error) {
            console.error("[Three.js Error] Initialization failed:", error);
            if (viewerContainer) viewerContainer.innerHTML = `<p class="error-message" style="padding:20px;">Failed to initialize 3D viewer. Check console.</p>`;
            if (controlsContainer) controlsContainer.innerHTML = '';
            cleanup();
        }

    } // --- End initializeThreeJsViewer ---
    // --- ============================================================ ---
    // ---            *** REVISED Three.js Initializer END ***           ---
    // --- ============================================================ ---

}); // End DOMContentLoaded
