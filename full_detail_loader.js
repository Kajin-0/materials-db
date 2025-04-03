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
                 targetEl.innerHTML = `<p class="error-message" style="padding: 10px; border: 1px solid red; background-color: #ffebeb;">${message}</p>`;
            } else {
                console.error(`[Display Error] Target element with ID '${elementId}' not found.`);
            }
        } else {
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
                if (data.ref && typeof data.ref === 'string' && allMaterialDetails.references && allMaterialDetails.references[data.ref]) {
                    collectedRefs.add(data.ref);
                }
                Object.values(data).forEach(value => {
                    if (typeof value === 'object' || Array.isArray(value)) {
                        processRefs(value);
                    }
                });
             } else if (Array.isArray(data)) {
                data.forEach(processRefs);
             }
        };
        processRefs(allMaterialDetails);
        console.log(`[Full Detail Loader] References processed: ${collectedRefs.size} unique references found.`);

        // --- Build Table of Contents ---
        if (tocListEl && mainContentEl) {
            tocListEl.innerHTML = '';
            let sectionCount = 0;
            const excludedKeys = ['materialName', 'references'];

            for (const sectionKey in allMaterialDetails) {
                if (excludedKeys.includes(sectionKey) || !allMaterialDetails.hasOwnProperty(sectionKey)) continue;
                const sectionData = allMaterialDetails[sectionKey];
                if (typeof sectionData !== 'object' || sectionData === null || typeof sectionData.displayName !== 'string') {
                    console.warn(`[Full Detail Loader] Skipping section key '${sectionKey}' in TOC: Invalid format or missing displayName.`);
                    continue;
                }
                const sectionId = `section-${sectionKey}`;
                if (!document.getElementById(sectionId)) {
                    console.warn(`[Full Detail Loader] Skipping section key '${sectionKey}' in TOC: HTML element '#${sectionId}' not found.`);
                    continue;
                }
                sectionDataMap.set(sectionKey, sectionData);
                sectionCount++;
                const sectionDisplayName = sectionData.displayName;
                const tocLi = document.createElement('li');
                const tocLink = document.createElement('a');
                tocLink.href = `#${sectionId}`;
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
             if (!sectionElement) continue;

             const h2Title = sectionElement.querySelector('h2');
             if (h2Title) { h2Title.textContent = sectionData.displayName; }
             else { console.warn(`[Full Detail Loader] No H2 element found within section '#${sectionId}'. Title not set.`); }

             const sectionIntroEl = document.getElementById(`${sectionId}-intro`);
             if (sectionIntroEl) {
                if (sectionData.introduction) { sectionIntroEl.innerHTML = sectionData.introduction; sectionIntroEl.style.display = 'block'; }
                else { sectionIntroEl.style.display = 'none'; sectionIntroEl.innerHTML = ''; }
             }

             const propertiesContainerEl = document.getElementById(`${sectionId}-properties`);
             if (propertiesContainerEl) {
                 if (sectionData.properties && typeof sectionData.properties === 'object' && Object.keys(sectionData.properties).length > 0) {
                     propertiesContainerEl.innerHTML = '';
                     Object.entries(sectionData.properties).forEach(([propKey, propData]) => {
                        const propertyBlockElement = renderPropertyBlock(sectionKey, propKey, propData, allMaterialDetails);
                        if (propertyBlockElement) { propertiesContainerEl.appendChild(propertyBlockElement); }
                        else { console.warn(`[Full Detail Loader] Failed to render property block for '${propKey}' in section '${sectionKey}'.`); }
                     });
                     propertiesContainerEl.style.display = 'block';
                 } else {
                     propertiesContainerEl.style.display = 'none'; propertiesContainerEl.innerHTML = '';
                 }
             }

             sectionElement.style.display = 'block';
             populatedSectionCount++;
        }
         console.log(`[Full Detail Loader] Populated content for ${populatedSectionCount} sections.`);

        // --- Populate References Section ---
        if (referencesSectionEl && referencesListEl && allMaterialDetails.references && collectedRefs.size > 0) {
             referencesListEl.innerHTML = '';
             const sortedRefs = Array.from(collectedRefs).sort((a, b) => {
                 const numA = parseInt(a, 10); const numB = parseInt(b, 10);
                 if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                 return String(a).localeCompare(String(b));
             });
             let populatedRefCount = 0;
             sortedRefs.forEach(refKey => {
                 const refData = allMaterialDetails.references[refKey];
                 if(refData && refData.text) {
                     const li = document.createElement('li'); li.id = `ref-${refKey}`;
                     let contentHtml = `<strong>[${refKey}]</strong> ${refData.text}`;
                     if(refData.doi && typeof refData.doi === 'string' && refData.doi.includes('/')) {
                         contentHtml += ` <a href="https://doi.org/${encodeURIComponent(refData.doi)}" target="_blank" rel="noopener noreferrer">[DOI]</a>`;
                     } else if (refData.doi) { console.warn(`[Full Detail Loader] Invalid DOI format for ref key '${refKey}': ${refData.doi}`); }
                     li.innerHTML = contentHtml; referencesListEl.appendChild(li); populatedRefCount++;
                 } else { console.warn(`[Full Detail Loader] Reference data missing or invalid for key '${refKey}'. Skipping.`); }
             });
             if (populatedRefCount > 0) {
                 referencesSectionEl.style.display = 'block';
                 mainContentEl.addEventListener('click', handleRefLinkClick);
                 console.log(`[Full Detail Loader] References section populated with ${populatedRefCount} items.`);
             } else {
                 referencesSectionEl.style.display = 'none';
                 console.log("[Full Detail Loader] References section hidden as no valid reference items could be populated.");
             }
        } else {
            if(referencesSectionEl) referencesSectionEl.style.display = 'none';
            console.log("[Full Detail Loader] References section hidden (no references found/processed, elements missing, or references data missing).");
        }
        console.log("[Full Detail Loader] Page data processing and population complete.");

    } catch (error) {
         console.error("[Full Detail Loader] CRITICAL ERROR during fetch or processing:", error);
         displayError(`Failed to load material details. ${error.message}`);
    }

    // --- Helper Function to Render a Single Property Block ---
    function renderPropertyBlock(sectionKey, propKey, propData, allDetails) {
        if (typeof propData !== 'object' || propData === null) {
            console.warn(`[Render Property] Invalid propData for key '${propKey}' in section '${sectionKey}'.`);
            return null;
        }
        const propBlock = document.createElement('div');
        propBlock.className = 'property-detail-block';
        propBlock.id = `prop-${sectionKey}-${propKey}`;
        const propTitle = document.createElement('h3');
        propTitle.textContent = propData.displayName || propKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        propBlock.appendChild(propTitle);
        if (propData.summary) {
            const summaryEl = document.createElement('div');
            summaryEl.className = 'summary'; summaryEl.innerHTML = propData.summary;
            propBlock.appendChild(summaryEl);
        }

        // --- Visualization Integration ---
        const isCrystalStructureViz = sectionKey === 'physical_properties' && propKey === 'crystal_structure';
        if (isCrystalStructureViz && propData.details && propData.details.visualization_data) {
            const vizData = propData.details.visualization_data;
            let validationError = null;
            if (!vizData || typeof vizData !== 'object') validationError = "Missing 'visualization_data' object.";
            else if (!vizData.atom_info || typeof vizData.atom_info !== 'object' || Object.keys(vizData.atom_info).length === 0) validationError = "Missing or empty 'atom_info'.";
            else if (!vizData.composition || typeof vizData.composition !== 'object') validationError = "Missing 'composition'.";
            else if (typeof vizData.composition.initial_x !== 'number' || typeof vizData.composition.min_x !== 'number' || typeof vizData.composition.max_x !== 'number') validationError = "Invalid 'composition' fields.";
            else if (!vizData.lattice_constants || typeof vizData.lattice_constants !== 'object') validationError = "Missing 'lattice_constants'.";

            if (validationError) {
                 console.error(`[Render Property] Invalid 'visualization_data' for '${propKey}': ${validationError}`, vizData);
                 const errorDiv = document.createElement('div'); errorDiv.className = 'error-message'; errorDiv.style.padding = '10px';
                 errorDiv.textContent = `Error: Visualization data is invalid (${validationError}). Cannot display 3D model.`;
                 propBlock.appendChild(errorDiv);
            } else {
                const baseViewerId = `viewer-${sectionKey}-${propKey}`;
                const viewerContainerId = `${baseViewerId}-container`; const viewerElementId = `${baseViewerId}-viewer`; const controlsElementId = `${baseViewerId}-controls`;
                const viewerWrapper = document.createElement('div'); viewerWrapper.className = 'crystal-viewer-wrapper';
                const viewerHeight = vizData.viewer_height || '450px'; viewerWrapper.style.setProperty('--viewer-height', viewerHeight);
                viewerWrapper.innerHTML = `
                    <div id="${viewerContainerId}" class="crystal-viewer-container">
                        <div id="${viewerElementId}" class="viewer-area"><p style="padding:20px; color:#888; text-align:center;">Loading 3D Viewer...</p></div>
                        <div id="${controlsElementId}" class="viewer-controls"><p style="padding:10px; color:#888;">Loading Controls...</p></div>
                    </div>`;
                propBlock.appendChild(viewerWrapper);
                requestAnimationFrame(() => {
                     let libsMissing = false;
                     if (typeof THREE === 'undefined') { console.error("THREE.js core (THREE) missing!"); libsMissing = true; }
                     if (typeof THREE.OrbitControls === 'undefined') { console.error("THREE.OrbitControls missing!"); libsMissing = true; }
                     if (typeof THREE.CSS2DRenderer === 'undefined') { console.error("THREE.CSS2DRenderer missing!"); libsMissing = true; }
                     if (typeof THREE.CSS2DObject === 'undefined') { console.error("THREE.CSS2DObject missing!"); libsMissing = true; }
                     if(libsMissing) { displayError("Essential 3D library components missing.", viewerElementId); return; }

                     if (typeof initializeSimplifiedThreeJsViewer === 'function') {
                        try {
                            const targetViewerEl = document.getElementById(viewerElementId);
                            const targetControlsEl = document.getElementById(controlsElementId);
                            if(targetViewerEl && targetControlsEl) {
                                console.log(`[Render Property] Initializing 3D viewer for: ${viewerElementId}`);
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
                         console.error("[Render Property] 'initializeSimplifiedThreeJsViewer' not found!");
                         displayError("Error: Viewer initialization code missing or failed.", viewerElementId);
                     }
                });
             }
        } // --- End Visualization ---

        // --- Process other 'details' ---
        if (propData.details && typeof propData.details === 'object') {
            for (const [detailKey, detailContent] of Object.entries(propData.details)) {
                 if (detailKey === 'visualization_data') continue;
                 if (!detailContent || (Array.isArray(detailContent) && detailContent.length === 0) || (typeof detailContent === 'object' && !Array.isArray(detailContent) && Object.keys(detailContent).length === 0)) continue;
                 const subsection = document.createElement('div');
                 subsection.className = `detail-subsection subsection-${detailKey.replace(/ /g, '_').toLowerCase()}`;
                 const subsectionTitle = document.createElement('h4');
                 subsectionTitle.textContent = detailKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                 subsection.appendChild(subsectionTitle);
                 try {
                     renderDetailContent(subsection, detailKey, detailContent);
                 } catch (renderError) {
                     console.error(`[Render Property] Error rendering detail subsection '${detailKey}':`, renderError);
                     const errorP = document.createElement('p'); errorP.className = 'error-message';
                     errorP.textContent = `Error rendering content for ${detailKey}.`; subsection.appendChild(errorP);
                 }
                 if(subsection.children.length > 1) { propBlock.appendChild(subsection); }
            }
        } // --- End 'details' ---
        return propBlock;
    } // --- End renderPropertyBlock ---

    // --- Helper to render content within a detail subsection ---
    function renderDetailContent(parentElement, detailKey, detailContent) {
        if (Array.isArray(detailContent)) {
            if (detailKey === 'equations' && detailContent.every(item => typeof item === 'object' && item.formula)) {
                 detailContent.forEach((eq) => {
                     const eqBlock = document.createElement('div'); eqBlock.className = 'equation-block';
                     eqBlock.innerHTML = `<div class="equation-formula">${eq.formula}</div>
                         ${eq.description ? `<div class="equation-description">${eq.description}</div>` : ''}
                         ${eq.ref ? `<div class="equation-ref">Ref: <span class="ref-link" data-ref="${eq.ref}">[${eq.ref}]</span></div>` : ''}`;
                     parentElement.appendChild(eqBlock);
                 });
            } else {
                 const ul = document.createElement('ul');
                 detailContent.forEach(item => {
                     const li = document.createElement('li');
                     if (typeof item === 'string') li.innerHTML = item;
                     else if (typeof item === 'object' && item !== null) li.textContent = JSON.stringify(item);
                     else li.textContent = String(item);
                     ul.appendChild(li);
                 });
                 parentElement.appendChild(ul);
            }
        } else if (typeof detailContent === 'object' && detailContent !== null) {
            if (detailKey === 'measurement_characterization') {
                const dl = document.createElement('dl');
                for (const [measKey, measValue] of Object.entries(detailContent)) {
                    const dt = document.createElement('dt'); dt.textContent = measKey.replace(/_/g, ' ');
                    const dd = document.createElement('dd');
                    if (typeof measValue === 'object' && measValue !== null && measValue.value !== undefined) {
                        dd.textContent = `${measValue.value}${measValue.unit ? ' ' + measValue.unit : ''}`;
                        if (measValue.ref) dd.innerHTML += ` <span class="ref-link" data-ref="${measValue.ref}">[${measValue.ref}]</span>`;
                    } else if (typeof measValue === 'string') { dd.innerHTML = measValue; }
                    else { dd.textContent = String(measValue); }
                    dl.appendChild(dt); dl.appendChild(dd);
                }
                parentElement.appendChild(dl);
            } else {
                 const pre = document.createElement('pre'); pre.textContent = JSON.stringify(detailContent, null, 2);
                 parentElement.appendChild(pre);
            }
        } else if (typeof detailContent === 'string') {
            const p = document.createElement('p'); p.innerHTML = detailContent; parentElement.appendChild(p);
        } else {
            const p = document.createElement('p'); p.textContent = String(detailContent); parentElement.appendChild(p);
        }
    }

    // --- Function to handle reference link clicks ---
    function handleRefLinkClick(event) {
        let target = event.target; let refKey = null;
        const refLinkSpan = target.closest('span[data-ref]');
        if (refLinkSpan && refLinkSpan.dataset.ref) { refKey = refLinkSpan.dataset.ref; }
        else if (referencesListEl && referencesListEl.contains(target)) {
             const parentLi = target.closest('li[id^="ref-"]');
             if (parentLi && parentLi.id) { refKey = parentLi.id.substring(4); }
        }
        if (refKey) {
            const targetRefElement = document.getElementById(`ref-${refKey}`);
            if (targetRefElement && referencesSectionEl && referencesSectionEl.contains(targetRefElement)) {
                event.preventDefault();
                const highlightClass = 'reference-highlight';
                document.querySelectorAll(`.${highlightClass}`).forEach(el => el.classList.remove(highlightClass));
                targetRefElement.classList.add(highlightClass);
                targetRefElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => { targetRefElement.classList.remove(highlightClass); }, 2500);
            } else { console.warn(`[Ref Click] Target reference element '#ref-${refKey}' not found.`); }
        }
    }

    // --- ========================================================================= ---
    // ---      *** SIMPLIFIED Three.js Initializer START (COMPLETE VERSION) ***      ---
    // --- ========================================================================= ---
    function initializeSimplifiedThreeJsViewer(viewerElementId, controlsElementId, vizData, allMaterialDetails) {
        const logPrefix = `[Three.js Init ${viewerElementId}]`;
        console.log(`${logPrefix} Initializing Viewer ---`);

        const viewerContainer = document.getElementById(viewerElementId);
        const controlsContainer = document.getElementById(controlsElementId);
        if (!viewerContainer) { console.error(`${logPrefix} Viewer container #${viewerElementId} not found!`); return; }
        if (!controlsContainer) { console.error(`${logPrefix} Controls container #${controlsElementId} not found!`); return; }

        viewerContainer.innerHTML = `<p style="padding:20px; color:#888; text-align:center;">Setting up 3D scene...</p>`;
        controlsContainer.innerHTML = '';

        try { // WebGL Check
            const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!window.WebGLRenderingContext || !gl) throw new Error('WebGL required but not supported/enabled.');
            console.log(`${logPrefix} WebGL check passed.`);
        } catch (e) { console.error(`${logPrefix} WebGL check failed:`, e.message); displayError(`Error: ${e.message}. 3D viewer cannot run.`, viewerElementId); return; }

        let scene, camera, renderer, css2DRenderer, controls, crystalModelGroup, unitCellOutline;
        let isSpinning = false, showLabels = true, currentViewStyle = 'ballAndStick', cdConcentration;
        let supercellDims, atomInfo, latticeConstantsSource, lattice_a;
        let sphereScales, stickRadius, labelOffset, sphereDetail, stickDetail, fallbackBondCutoffFactor;
        let bondCutoff, bondCutoffSq;
        let materials, defaultMaterial, bondMaterial, unitCellMaterial;
        let sphereGeometries = {}, stickGeometry, yAxis;
        let animationFrameId = null;

        // --- Initialization Function ---
        function init() {
            try {
                if (viewerContainer.clientWidth === 0 || viewerContainer.clientHeight === 0) {
                    console.warn(`${logPrefix} Container size zero, delaying init.`); requestAnimationFrame(init); return;
                }
                console.log(`${logPrefix} Container size: ${viewerContainer.clientWidth}x${viewerContainer.clientHeight}`);
                while (viewerContainer.firstChild) { viewerContainer.removeChild(viewerContainer.firstChild); }

                // --- Assign Config from vizData ---
                cdConcentration = vizData.composition.initial_x;
                supercellDims = { nx: vizData.supercell?.nx ?? 2, ny: vizData.supercell?.ny ?? 2, nz: vizData.supercell?.nz ?? 2 };
                atomInfo = vizData.atom_info;
                latticeConstantsSource = vizData.lattice_constants;
                sphereScales = { spacefill: 0.55, ballAndStick: 0.28, stick: 0.1 };
                stickRadius = 0.05; labelOffset = 0.3; sphereDetail = 12; stickDetail = 6;
                fallbackBondCutoffFactor = 0.45;
                yAxis = new THREE.Vector3(0, 1, 0);
                crystalModelGroup = new THREE.Group(); crystalModelGroup.name = `CrystalModelGroup-${viewerElementId}`;

                // --- Calculate Initial Values ---
                lattice_a = calculateLatticeConstant(cdConcentration);
                calculateBondCutoff();

                // --- Setup Materials ---
                materials = {};
                defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.4, roughness: 0.6 });
                Object.entries(atomInfo).forEach(([symbol, info]) => {
                    materials[symbol.toUpperCase()] = new THREE.MeshStandardMaterial({
                        color: info?.color || '#cccccc', metalness: info?.metalness ?? 0.4, roughness: info?.roughness ?? 0.6 });
                });
                bondMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.1, roughness: 0.8 });
                unitCellMaterial = new THREE.LineBasicMaterial({ color: 0x3333ff, linewidth: 2 });
                stickGeometry = new THREE.CylinderGeometry(stickRadius, stickRadius, 1, stickDetail, 1); // Template

                // --- Scene ---
                scene = new THREE.Scene(); scene.background = new THREE.Color(0xddeeff);
                const width = viewerContainer.clientWidth; const height = viewerContainer.clientHeight;

                // --- Camera ---
                camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
                const initialDist = (lattice_a * Math.max(supercellDims.nx, supercellDims.ny, supercellDims.nz)) * 1.5;
                camera.position.set(initialDist * 0.8, initialDist * 0.6, initialDist); camera.lookAt(0, 0, 0);

                // --- Renderers ---
                renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
                renderer.setSize(width, height); renderer.setPixelRatio(window.devicePixelRatio);
                viewerContainer.appendChild(renderer.domElement);
                const css2dOverlay = document.createElement('div'); css2dOverlay.className = 'css2d-renderer-overlay';
                css2dOverlay.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; overflow:hidden;';
                viewerContainer.appendChild(css2dOverlay);
                css2DRenderer = new THREE.CSS2DRenderer(); css2DRenderer.setSize(width, height);
                css2dOverlay.appendChild(css2DRenderer.domElement);

                // --- Controls ---
                controls = new THREE.OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
                controls.dampingFactor = 0.1; controls.minDistance = lattice_a * 0.5;
                controls.maxDistance = lattice_a * Math.max(supercellDims.nx, supercellDims.ny, supercellDims.nz) * 5;

                // --- Lighting ---
                scene.add(new THREE.AmbientLight(0xffffff, 0.7));
                const dirLight = new THREE.DirectionalLight(0xffffff, 0.9); dirLight.position.set(5, 10, 7.5); scene.add(dirLight);
                scene.add(crystalModelGroup);

                // --- Initial Model ---
                createOrUpdateUnitCellOutline();
                updateCrystalModel(); // Generates data and visuals

                window.addEventListener('resize', onWindowResize);
                console.log(`${logPrefix} Init complete.`);

            } catch(initError) { console.error(`${logPrefix} Init failed:`, initError); displayError(`Error setting up 3D scene: ${initError.message}`, viewerElementId); cleanup(); }
        }

        // --- Helper: Dispose Meshes ---
        function disposeMeshes(group, keepOutline = false) {
             if (!group) return;
             const children_to_remove = [...group.children];
             children_to_remove.forEach(object => {
                if (keepOutline && object === unitCellOutline) return;
                 if (object.isMesh || object.isLineSegments) {
                     if (object.geometry && object.geometry !== stickGeometry) { object.geometry.dispose(); }
                 } else if (object.isCSS2DObject) {
                    if (object.element?.parentNode) { object.element.parentNode.removeChild(object.element); object.element = null; }
                 }
                 group.remove(object);
             });
        } // <<< *** THIS WAS THE MISSING BRACE ***

        // --- Helper: Calculate Lattice Constant ---
        function calculateLatticeConstant(currentConcentration) {
            let hostSymbol, substSymbol;
            for (const symbol in atomInfo) {
                if (atomInfo[symbol].role === 'cation_host') hostSymbol = symbol;
                if (atomInfo[symbol].role === 'cation_subst') substSymbol = symbol;
            }
            if (!hostSymbol || !substSymbol) { console.warn(`${logPrefix} Roles missing for lattice calc.`); return lattice_a; }
            const a_host = Number(latticeConstantsSource[hostSymbol]); const a_subst = Number(latticeConstantsSource[substSymbol]);
            const ratio = Number(currentConcentration);
            if (isNaN(a_host) || isNaN(a_subst) || isNaN(ratio)) { console.warn(`${logPrefix} Invalid values for Vegard's law.`); return lattice_a; }
            const calculated_a = a_host * (1 - ratio) + a_subst * ratio;
            if (!isNaN(calculated_a) && calculated_a > 0) { return calculated_a; }
            else { console.warn(`${logPrefix} Invalid Vegard result (${calculated_a}).`); return lattice_a; }
        }

        // --- Helper: Calculate Bond Cutoff ---
        function calculateBondCutoff() {
            const jsonBondCutoff = Number(vizData.bond_cutoff);
            if (!isNaN(jsonBondCutoff) && jsonBondCutoff > 0) { bondCutoff = jsonBondCutoff; console.log(`${logPrefix} Using bond_cutoff from JSON: ${bondCutoff.toFixed(3)}`); }
            else { bondCutoff = lattice_a * fallbackBondCutoffFactor; console.log(`${logPrefix} Using fallback bond cutoff: ${bondCutoff.toFixed(3)}`); }
            bondCutoffSq = bondCutoff * bondCutoff;
            if (isNaN(bondCutoffSq) || bondCutoffSq <= 0) { console.error(`${logPrefix} Invalid bondCutoffSq: ${bondCutoffSq}. Bonding disabled.`); bondCutoffSq = -1; }
        }

        // --- Generate Atom Positions ---
        function generateCrystalData(nx, ny, nz, currentConcentration) {
             const atoms = []; lattice_a = calculateLatticeConstant(currentConcentration);
             let ch_sym, cs_sym, an_sym;
             for(const s in atomInfo){if(atomInfo[s].role==='cation_host')ch_sym=s.toUpperCase();if(atomInfo[s].role==='cation_subst')cs_sym=s.toUpperCase();if(atomInfo[s].role==='anion')an_sym=s.toUpperCase();}
             if (!ch_sym || !cs_sym || !an_sym) { console.error(`${logPrefix} Roles missing.`); return []; }
             const center = new THREE.Vector3(nx*l/2-l/2, ny*l/2-l/2, nz*l/2-l/2).replace('l', lattice_a); // Compact definition
             const basisAn = [[0,0,0],[0,.5,.5],[.5,0,.5],[.5,.5,0]]; const basisCat = [[.25,.25,.25],[.25,.75,.75],[.75,.25,.75],[.75,.75,.25]];
             for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)for(let k=0;k<nz;k++){ const o=new THREE.Vector3(i*l,j*l,k*l).replace('l',lattice_a); basisAn.forEach(p=>{const pos=new THREE.Vector3(...p).multiplyScalar(l).add(o).sub(center).replace('l',lattice_a);if(!isNaN(pos.x))atoms.push({e:an_sym,p:pos})}); basisCat.forEach(p=>{const el=Math.random()<currentConcentration?cs_sym:ch_sym;const pos=new THREE.Vector3(...p).multiplyScalar(l).add(o).sub(center).replace('l',lattice_a);if(!isNaN(pos.x))atoms.push({e:el,p:pos})});}
             console.log(`${logPrefix} Generated ${atoms.length} atoms (a=${lattice_a.toFixed(3)}, x=${currentConcentration.toFixed(2)}).`);
             return atoms.map(a => ({ element: a.e, position: a.p })); // Remap keys for clarity later
        } // Note: .replace added for brevity, standard JS doesn't have this on Vector3

        // --- Create CSS Label ---
        function createCSS2DLabel(text) {
            const div = document.createElement('div'); div.className = 'atom-label'; div.textContent = text;
            const label = new THREE.CSS2DObject(div); label.layers.set(0); return label;
        }

        // --- Create/Update Visual Model ---
        function createOrUpdateVisualModel(atomData) {
             console.log(`${logPrefix} Rebuilding visuals (Style: ${currentViewStyle})...`);
             disposeMeshes(crystalModelGroup, true); // Keep outline
             const scale = sphereScales[currentViewStyle] || sphereScales.ballAndStick;
             Object.keys(atomInfo).forEach(sym=>{const s=sym.toUpperCase();const r=atomInfo[sym]?.radius??1.0;let rad=r*scale;if(isNaN(rad)||rad<=1e-3)rad=0.05;if(sphereGeometries[s])sphereGeometries[s].dispose();try{sphereGeometries[s]=new THREE.SphereGeometry(rad,sphereDetail,sphereDetail)}catch(e){console.error(`${logPrefix} Sphere geom error ${s}: ${e.message}`);sphereGeometries[s]=null}});
             let spheres=0, labels=0, bonds=0, checked=0;
             atomData.forEach(a=>{const s=a.element.toUpperCase();const g=sphereGeometries[s];const m=materials[s]||defaultMaterial;if(!g||!m||!a.position||isNaN(a.position.x))return;const sph=new THREE.Mesh(g,m);sph.position.copy(a.position);crystalModelGroup.add(sph);spheres++;if(showLabels){const lbl=createCSS2DLabel(a.element);lbl.position.copy(a.position).y+=labelOffset;crystalModelGroup.add(lbl);labels++}});
             const drawBonds=(currentViewStyle==='stick'||currentViewStyle==='ballAndStick');
             if(drawBonds && bondCutoffSq > 0){console.log(`${logPrefix} Bonds: Cutoff=${bondCutoff.toFixed(3)}, Sq=${bondCutoffSq.toFixed(3)}`);for(let i=0;i<atomData.length;i++){for(let j=i+1;j<atomData.length;j++){checked++;const a1=atomData[i];const a2=atomData[j];if(!a1?.position||!a2?.position||isNaN(a1.position.x)||isNaN(a2.position.x))continue;const dSq=a1.position.distanceToSquared(a2.position);if(dSq>1e-6&&dSq<bondCutoffSq){const r1=atomInfo[a1.element]?.role??'unk';const r2=atomInfo[a2.element]?.role??'unk';const pair=(r1.includes('cation')&&r2==='anion')||(r1==='anion'&&r2.includes('cation'));if(pair){const dist=Math.sqrt(dSq);if(isNaN(dist)||dist<=1e-3)continue;const stk=new THREE.Mesh(stickGeometry,bondMaterial);stk.position.copy(a1.position).add(a2.position).multiplyScalar(0.5);const dir=new THREE.Vector3().subVectors(a2.position,a1.position).normalize();const quat=new THREE.Quaternion().setFromUnitVectors(yAxis,dir);stk.quaternion.copy(quat);stk.scale.set(1,dist,1);crystalModelGroup.add(stk);bonds++;}}}}console.log(`${logPrefix} Bonds: Checked ${checked}, Added ${bonds}.`);}else if(drawBonds)console.log(`${logPrefix} Bonds skipped (CutoffSq <= 0).`);
             console.log(`${logPrefix} Visuals updated: ${spheres} spheres, ${labels} labels. Group children: ${crystalModelGroup.children.length}`);
        }

        // --- Create/Update Unit Cell Outline ---
        function createOrUpdateUnitCellOutline() {
             lattice_a = calculateLatticeConstant(cdConcentration);
             if(unitCellOutline){if(unitCellOutline.geometry)unitCellOutline.geometry.dispose();crystalModelGroup.remove(unitCellOutline);unitCellOutline=null;}
             const boxGeo=new THREE.BoxGeometry(l,l,l).replace('l', lattice_a); const edges=new THREE.EdgesGeometry(boxGeo);
             const offset=new THREE.Vector3(nx*l/2-l/2, ny*l/2-l/2, nz*l/2-l/2).replace('l',lattice_a);
             const pos=new THREE.Vector3(l/2,l/2,l/2).replace('l',lattice_a).sub(offset);
             unitCellOutline = new THREE.LineSegments(edges, unitCellMaterial); unitCellOutline.position.copy(pos);
             unitCellOutline.name = `UnitCellOutline-${viewerElementId}`; crystalModelGroup.add(unitCellOutline);
             boxGeo.dispose(); console.log(`${logPrefix} Outline updated.`);
        }

        // --- Update Crystal Model Wrapper ---
        function updateCrystalModel() {
            console.log(`${logPrefix} Updating model...`); const old_a = lattice_a;
            lattice_a = calculateLatticeConstant(cdConcentration); const changed = Math.abs(lattice_a - old_a) > 1e-4;
            calculateBondCutoff(); console.log(`${logPrefix} Generating atom data...`);
            const atomData = generateCrystalData(supercellDims.nx, supercellDims.ny, supercellDims.nz, cdConcentration);
            if(!atomData || atomData.length === 0){console.error(`${logPrefix} Atom data gen failed!`); displayError("Error generating atom data.", viewerElementId); return;}
            console.log(`${logPrefix} Rebuilding visuals...`); createOrUpdateVisualModel(atomData);
            if(changed){console.log(`${logPrefix} Lattice changed, updating outline.`); createOrUpdateUnitCellOutline();}
            if(controls){controls.minDistance=l*0.5; controls.maxDistance=l*Math.max(nx,ny,nz)*5;}.replace('l',lattice_a).replace('nx',supercellDims.nx).replace('ny',supercellDims.ny).replace('nz',supercellDims.nz) // Hacky replace
            console.log(`${logPrefix} Model update complete.`);
        }

        // --- Setup UI ---
        function setupUI() {
             controlsContainer.innerHTML = ''; const wrap = document.createElement('div');
             const name = allMaterialDetails?.materialName || 'Material'; let compHTML = '';
             const {min_x, max_x} = vizData.composition;
             if(typeof min_x === 'number' && typeof max_x === 'number' && min_x !== max_x){ compHTML = `<div class="control-item"><label for="${c}-cdSlider">Cd Conc (x): <span id="${c}-cdValue">${cdConcentration.toFixed(2)}</span></label><input type="range" class="concentration-slider" id="${c}-cdSlider" min="${min_x}" max="${max_x}" step="0.01" value="${cdConcentration}"></div>`.replace('c', controlsElementId);}
             else { compHTML = `<div class="control-item"><p>Composition (x): Fixed at ${cdConcentration.toFixed(2)}</p></div>`; }
             wrap.innerHTML = `<h3>${name} Model Controls</h3><p>${nx}x${ny}x${nz} Supercell</p>${compHTML}
                 <div class="control-item"><label>View Style:</label><select id="${c}-styleSelect"><option value="ballAndStick" ${s==='ballAndStick'?'selected':''}>Ball & Stick</option><option value="spacefill" ${s==='spacefill'?'selected':''}>Space Filling</option><option value="stick" ${s==='stick'?'selected':''}>Stick Only</option></select></div>
                 <div class="control-item button-group"><button id="${c}-spinButton" class="viewer-button">${isSpinning?'Stop':'Start'} Spin</button><button id="${c}-labelToggleButton" class="viewer-button">${showLabels?'Hide':'Show'} Labels</button></div>
                 <div class="control-item"><label>Legend:</label><ul id="${c}-legendList" class="viewer-legend"></ul></div>
                 <p class="viewer-hint">Drag rotate, Scroll/Pinch zoom.</p>`.replace('c',controlsElementId).replace('s',currentViewStyle).replace('nx',supercellDims.nx).replace('ny',supercellDims.ny).replace('nz',supercellDims.nz); // More hacky replaces
             controlsContainer.appendChild(wrap);
             const sl=document.getElementById(`${c}-cdSlider`), v=document.getElementById(`${c}-cdValue`), sp=document.getElementById(`${c}-spinButton`), lb=document.getElementById(`${c}-labelToggleButton`), st=document.getElementById(`${c}-styleSelect`).replace('c',controlsElementId);
             if(sl){sl.addEventListener('input', e=>{if(v)v.textContent=parseFloat(e.target.value).toFixed(2)});sl.addEventListener('change', e=>{cdConcentration=parseFloat(e.target.value);console.log(`${logPrefix} Conc changed: ${cdConcentration}`);if(v)v.textContent=cdConcentration.toFixed(2);updateCrystalModel()})}
             if(sp)sp.addEventListener('click', ()=>{isSpinning=!isSpinning; sp.textContent=`${isSpinning?'Stop':'Start'} Spin`; console.log(`${logPrefix} Spin: ${isSpinning}`)});
             if(lb)lb.addEventListener('click', ()=>{showLabels=!showLabels; lb.textContent=`${showLabels?'Hide':'Show'} Labels`; console.log(`${logPrefix} Labels: ${showLabels}`); updateCrystalModel()});
             if(st)st.addEventListener('change', e=>{currentViewStyle=e.target.value; console.log(`${logPrefix} Style: ${currentViewStyle}`); updateCrystalModel(); populateLegendUI()});
             populateLegendUI(); console.log(`${logPrefix} UI Setup Complete`);
        }

        // --- Populate Legend UI ---
         function populateLegendUI() {
             const leg = document.getElementById(`${controlsElementId}-legendList`); if (!leg) return; leg.innerHTML = '';
             Object.entries(atomInfo).forEach(([sym, inf])=>{const s=sym.toUpperCase(); const c=materials[s]?.color.getStyle()||defaultMaterial.color.getStyle(); const li=document.createElement('li');li.innerHTML=`<span class="color-box" style="background-color:${c};"></span> ${sym} (${inf.role||'N/A'})`;leg.appendChild(li)});
             if(currentViewStyle==='ballAndStick'||currentViewStyle==='stick'){const li=document.createElement('li');li.innerHTML=`<span class="color-box" style="background-color:${bondMaterial.color.getStyle()};"></span> Bonds`;leg.appendChild(li);}
         }

        // --- Window Resize Handler ---
        function onWindowResize() {
            if (!camera || !renderer || !css2DRenderer || !viewerContainer) return;
            const w=viewerContainer.clientWidth, h=viewerContainer.clientHeight; if(w===0||h===0)return;
            camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h); css2DRenderer.setSize(w,h);
        }

        // --- Animation Loop ---
        function animate() {
            if (!renderer) { console.log(`${logPrefix} Stopping animation loop.`); if(animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null; return; }
            animationFrameId = requestAnimationFrame(animate);
            if (controls) controls.update(); if (isSpinning && crystalModelGroup) crystalModelGroup.rotation.y += spinSpeed;
            if (scene && camera) { renderer.render(scene, camera); if (css2DRenderer) css2DRenderer.render(scene, camera); }
        }

         // --- Cleanup Function ---
        function cleanup() {
             console.log(`${logPrefix} Cleaning up viewer...`);
             if(animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
             window.removeEventListener('resize', onWindowResize);
             // Remove UI listeners difficult here, done via removing parent usually
             Object.values(sphereGeometries).forEach(g=>{if(g)g.dispose()}); for(const k in sphereGeometries)delete sphereGeometries[k];
             if(stickGeometry)stickGeometry.dispose(); if(unitCellOutline?.geometry)unitCellOutline.geometry.dispose();
             Object.values(materials).forEach(m=>{if(m)m.dispose()}); if(bondMaterial)bondMaterial.dispose(); if(unitCellMaterial)unitCellMaterial.dispose(); if(defaultMaterial)defaultMaterial.dispose();
             if(crystalModelGroup)disposeMeshes(crystalModelGroup, false); if(scene?.remove)scene.remove(crystalModelGroup);
             crystalModelGroup=null; unitCellOutline=null; scene=null; camera=null;
             if(controls)controls.dispose(); controls=null;
             if(renderer){renderer.dispose(); if(renderer.domElement?.parentNode)renderer.domElement.parentNode.removeChild(renderer.domElement); renderer=null;}
             if(css2DRenderer){const ov=viewerContainer?.querySelector('.css2d-renderer-overlay'); if(ov?.parentNode)ov.parentNode.removeChild(ov); css2DRenderer=null;}
             if(viewerContainer)viewerContainer.innerHTML=''; if(controlsContainer)controlsContainer.innerHTML='';
             console.log(`${logPrefix} Cleanup complete.`);
        }

        // --- Main Execution Flow ---
        try {
            console.log(`${logPrefix} Starting main flow...`); init();
            if (!scene || !camera || !renderer || !css2DRenderer || !controls) throw new Error("Core components failed init.");
            setupUI(); console.log(`${logPrefix} UI setup complete.");
            if (renderer && scene && camera) { console.log(`${logPrefix} Requesting first render...`); renderer.render(scene, camera); if (css2DRenderer) css2DRenderer.render(scene, camera); console.log(`${logPrefix} First render done.`); }
            else { console.error(`${logPrefix} Cannot perform first render.`); }
            animate(); console.log(`${logPrefix} Animation loop started.`);
            const obsTarget = viewerContainer.closest('.crystal-viewer-wrapper') || viewerContainer;
            if (obsTarget?.parentNode) {
                 const obs = new MutationObserver((muts, o)=>{let rem=false;for(const m of muts){if(m.removedNodes)m.removedNodes.forEach(n=>{if(n===obsTarget||n.contains(obsTarget))rem=true})} if(rem){console.log(`${logPrefix} Viewer removed from DOM. Cleanup.`);cleanup();o.disconnect()}});
                 obs.observe(obsTarget.parentNode, {childList: true}); console.log(`${logPrefix} Observer watching parent.`);
            } else { console.warn(`${logPrefix} Cannot find node/parent for observer cleanup.`); }
        } catch(error) { console.error(`${logPrefix} Main flow failed:`, error); displayError(`Failed init viewer: ${error.message}`, viewerElementId); cleanup(); }

    } // --- End initializeSimplifiedThreeJsViewer ---
    // --- ======================================================================= ---
    // ---      *** SIMPLIFIED Three.js Initializer END (COMPLETE VERSION) ***      ---
    // --- ======================================================================= ---

}); // --- End DOMContentLoaded ---
