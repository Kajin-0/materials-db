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

        // --- Process References ---
        const collectedRefs = new Set();
        const processRefs = (data) => {
             if (typeof data === 'object' && data !== null) {
                if (data.ref && typeof data.ref === 'string' && allMaterialDetails.references && allMaterialDetails.references[data.ref]) {
                    collectedRefs.add(data.ref);
                }
                Object.values(data).forEach(value => { if (typeof value === 'object' || Array.isArray(value)) processRefs(value); });
             } else if (Array.isArray(data)) { data.forEach(processRefs); }
        };
        processRefs(allMaterialDetails);
        console.log(`[Full Detail Loader] References processed: ${collectedRefs.size} unique references found.`);

        // --- Build Table of Contents ---
        if (tocListEl && mainContentEl) {
            tocListEl.innerHTML = ''; let sectionCount = 0;
            const excludedKeys = ['materialName', 'references'];
            for (const sectionKey in allMaterialDetails) {
                if (excludedKeys.includes(sectionKey) || !allMaterialDetails.hasOwnProperty(sectionKey)) continue;
                const sectionData = allMaterialDetails[sectionKey];
                if (typeof sectionData !== 'object' || sectionData === null || typeof sectionData.displayName !== 'string') { console.warn(`[TOC] Skipping ${sectionKey}: Invalid format.`); continue; }
                const sectionId = `section-${sectionKey}`;
                if (!document.getElementById(sectionId)) { console.warn(`[TOC] Skipping ${sectionKey}: HTML element #${sectionId} not found.`); continue; }
                sectionDataMap.set(sectionKey, sectionData); sectionCount++;
                const tocLi = document.createElement('li'); const tocLink = document.createElement('a');
                tocLink.href = `#${sectionId}`; tocLink.textContent = sectionData.displayName;
                tocLi.appendChild(tocLink); tocListEl.appendChild(tocLi);
            }
             console.log(`[TOC] Built with ${sectionCount} valid sections.`);
             if (sectionCount === 0) { tocListEl.innerHTML = '<li>No valid sections found/linked.</li>'; }
        } else { console.warn("[TOC] List or Main element not found."); }

        // --- Populate Sections ---
        let populatedSectionCount = 0;
        for (const [sectionKey, sectionData] of sectionDataMap.entries()) {
             const sectionId = `section-${sectionKey}`; const sectionElement = document.getElementById(sectionId);
             if (!sectionElement) continue; // Should have been caught by TOC check, but be safe
             const h2Title = sectionElement.querySelector('h2'); if (h2Title) h2Title.textContent = sectionData.displayName;
             const sectionIntroEl = document.getElementById(`${sectionId}-intro`);
             if (sectionIntroEl) { if (sectionData.introduction) { sectionIntroEl.innerHTML = sectionData.introduction; sectionIntroEl.style.display = 'block'; } else { sectionIntroEl.style.display = 'none'; sectionIntroEl.innerHTML = ''; } }
             const propertiesContainerEl = document.getElementById(`${sectionId}-properties`);
             if (propertiesContainerEl) {
                 if (sectionData.properties && typeof sectionData.properties === 'object' && Object.keys(sectionData.properties).length > 0) {
                     propertiesContainerEl.innerHTML = '';
                     Object.entries(sectionData.properties).forEach(([propKey, propData]) => {
                        const propertyBlockElement = renderPropertyBlock(sectionKey, propKey, propData, allMaterialDetails);
                        if (propertyBlockElement) propertiesContainerEl.appendChild(propertyBlockElement);
                     });
                     propertiesContainerEl.style.display = 'block';
                 } else { propertiesContainerEl.style.display = 'none'; propertiesContainerEl.innerHTML = ''; }
             }
             sectionElement.style.display = 'block'; populatedSectionCount++;
        }
         console.log(`[Sections] Populated content for ${populatedSectionCount} sections.`);

        // --- Populate References Section ---
        if (referencesSectionEl && referencesListEl && allMaterialDetails.references && collectedRefs.size > 0) {
             referencesListEl.innerHTML = '';
             const sortedRefs = Array.from(collectedRefs).sort((a, b) => { const nA = parseInt(a, 10), nB = parseInt(b, 10); return !isNaN(nA)&&!isNaN(nB) ? nA-nB : String(a).localeCompare(String(b)); });
             let populatedRefCount = 0;
             sortedRefs.forEach(refKey => {
                 const refData = allMaterialDetails.references[refKey];
                 if(refData?.text) {
                     const li = document.createElement('li'); li.id = `ref-${refKey}`;
                     let html = `<strong>[${refKey}]</strong> ${refData.text}`;
                     if(refData.doi?.includes('/')) html += ` <a href="https://doi.org/${encodeURIComponent(refData.doi)}" targe="_blank" rel="noopener noreferrer">[DOI]</a>`;
                     li.innerHTML = html; referencesListEl.appendChild(li); populatedRefCount++;
                 } else console.warn(`[Refs] Invalid data for key ${refKey}.`);
             });
             if (populatedRefCount > 0) { referencesSectionEl.style.display = 'block'; mainContentEl.addEventListener('click', handleRefLinkClick); console.log(`[Refs] Populated ${populatedRefCount} items.`); }
             else { referencesSectionEl.style.display = 'none'; console.log("[Refs] Section hidden, no valid items."); }
        } else { if(referencesSectionEl) referencesSectionEl.style.display = 'none'; console.log("[Refs] Section hidden."); }
        console.log("[Loader] Page data processing complete.");

    } catch (error) {
         console.error("[Loader] CRITICAL ERROR:", error); displayError(`Failed load: ${error.message}`);
    }

    // --- Helper Function to Render a Single Property Block ---
    function renderPropertyBlock(sectionKey, propKey, propData, allDetails) {
        if (typeof propData !== 'object' || propData === null) return null;
        const propBlock = document.createElement('div'); propBlock.className = 'property-detail-block'; propBlock.id = `prop-${sectionKey}-${propKey}`;
        const title = document.createElement('h3'); title.textContent = propData.displayName || propKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); propBlock.appendChild(title);
        if (propData.summary) { const s = document.createElement('div'); s.className = 'summary'; s.innerHTML = propData.summary; propBlock.appendChild(s); }

        // --- Visualization ---
        const isViz = sectionKey === 'physical_properties' && propKey === 'crystal_structure' && propData.details?.visualization_data;
        if (isViz) {
            const vizData = propData.details.visualization_data; let err = null;
            if (!vizData || typeof vizData !== 'object') err = "Missing 'visualization_data'.";
            else if (!vizData.atom_info || typeof vizData.atom_info !== 'object' || !Object.keys(vizData.atom_info).length) err = "Missing/empty 'atom_info'.";
            else if (!vizData.composition || typeof vizData.composition !== 'object') err = "Missing 'composition'.";
            else if (typeof vizData.composition.initial_x !== 'number' || typeof vizData.composition.min_x !== 'number' || typeof vizData.composition.max_x !== 'number') err = "Invalid 'composition' fields.";
            else if (!vizData.lattice_constants || typeof vizData.lattice_constants !== 'object') err = "Missing 'lattice_constants'.";
            if (err) { console.error(`[Viz ${propKey}] Invalid data: ${err}`, vizData); const d = document.createElement('div'); d.className='error-message'; d.style.padding='10px'; d.textContent=`Viz Error: ${err}`; propBlock.appendChild(d); }
            else {
                const baseId = `viewer-${sectionKey}-${propKey}`; const vId= `${baseId}-viewer`; const cId = `${baseId}-controls`;
                const wrap = document.createElement('div'); wrap.className = 'crystal-viewer-wrapper';
                wrap.style.setProperty('--viewer-height', vizData.viewer_height || '450px');
                wrap.innerHTML = `<div id="${baseId}-container" class="crystal-viewer-container"><div id="${vId}" class="viewer-area"><p style="padding:20px; color:#888; text-align:center;">Loading 3D...</p></div><div id="${cId}" class="viewer-controls"><p style="padding:10px; color:#888;">Loading Controls...</p></div></div>`;
                propBlock.appendChild(wrap);
                requestAnimationFrame(() => {
                    let missing = [];
                    if (typeof THREE === 'undefined') missing.push("THREE"); if (typeof THREE.OrbitControls === 'undefined') missing.push("OrbitControls");
                    if (typeof THREE.CSS2DRenderer === 'undefined') missing.push("CSS2DRenderer"); if (typeof THREE.CSS2DObject === 'undefined') missing.push("CSS2DObject");
                    if (missing.length) { displayError(`Missing 3D libs: ${missing.join(', ')}`, vId); return; }
                    if (typeof initializeSimplifiedThreeJsViewer === 'function') {
                        try { if(document.getElementById(vId) && document.getElementById(cId)) initializeSimplifiedThreeJsViewer(vId, cId, vizData, allDetails); else throw new Error("Target elements not found."); }
                        catch (e) { console.error(`[Viz ${propKey}] Init error:`, e); displayError(`Viz Init Error: ${e.message}`, vId); }
                    } else { console.error("[Viz] Initializer not found!"); displayError("Viz init code missing.", vId); }
                });
            }
        } // --- End Viz ---

        // --- Other Details ---
        if (propData.details && typeof propData.details === 'object') {
            for (const [detailKey, detailContent] of Object.entries(propData.details)) {
                if (detailKey === 'visualization_data') continue;
                if (!detailContent || (Array.isArray(detailContent) && !detailContent.length) || (typeof detailContent === 'object' && !Array.isArray(detailContent) && !Object.keys(detailContent).length)) continue;
                const sub = document.createElement('div'); sub.className = `detail-subsection sub-${detailKey.replace(/ /g,'_').toLowerCase()}`;
                const subT = document.createElement('h4'); subT.textContent = detailKey.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase()); sub.appendChild(subT);
                try { renderDetailContent(sub, detailKey, detailContent); } catch (e) { console.error(`[Detail ${detailKey}] Render error:`,e); const p=document.createElement('p'); p.className='error-message'; p.textContent=`Render error.`; sub.appendChild(p); }
                if (sub.children.length > 1) propBlock.appendChild(sub);
            }
        } // --- End Details ---
        return propBlock;
    }

    // --- Helper: Render Detail Content ---
    function renderDetailContent(parent, key, content) {
        if (Array.isArray(content)) {
            if (key === 'equations' && content.every(i => typeof i === 'object' && i.formula)) {
                 content.forEach(eq => { const b = document.createElement('div'); b.className = 'equation-block'; b.innerHTML = `<div class="eq-formula">${eq.formula}</div>${eq.description?`<div class="eq-desc">${eq.description}</div>`:''}${eq.ref?`<div class="eq-ref">Ref: <span class="ref-link" data-ref="${eq.ref}">[${eq.ref}]</span></div>`:''}`; parent.appendChild(b); });
            } else { const ul = document.createElement('ul'); content.forEach(i => { const li = document.createElement('li'); if(typeof i === 'string') li.innerHTML = i; else li.textContent = JSON.stringify(i); ul.appendChild(li); }); parent.appendChild(ul); }
        } else if (typeof content === 'object' && content !== null) {
            if (key === 'measurement_characterization') { const dl = document.createElement('dl'); Object.entries(content).forEach(([k,v])=>{ const dt = document.createElement('dt'); dt.textContent = k.replace(/_/g,' '); const dd = document.createElement('dd'); if(typeof v === 'object' && v !== null && v.value !== undefined){ dd.textContent = `${v.value}${v.unit?' '+v.unit:''}`; if(v.ref) dd.innerHTML += ` <span class="ref-link" data-ref="${v.ref}">[${v.ref}]</span>`; } else if (typeof v === 'string') dd.innerHTML = v; else dd.textContent = String(v); dl.appendChild(dt); dl.appendChild(dd); }); parent.appendChild(dl); }
            else { const pre = document.createElement('pre'); pre.textContent = JSON.stringify(content, null, 2); parent.appendChild(pre); }
        } else { const p = document.createElement('p'); p.innerHTML = String(content); parent.appendChild(p); }
    }

    // --- Ref Link Click Handler ---
    function handleRefLinkClick(event) {
        let target = event.target; let refKey = null;
        const span = target.closest('span[data-ref]'); if (span?.dataset.ref) refKey = span.dataset.ref;
        else if (referencesListEl?.contains(target)) { const li = target.closest('li[id^="ref-"]'); if (li?.id) refKey = li.id.substring(4); }
        if (refKey) { const el = document.getElementById(`ref-${refKey}`); if (el && referencesSectionEl?.contains(el)) { event.preventDefault(); const cls = 'reference-highlight'; document.querySelectorAll(`.${cls}`).forEach(e=>e.classList.remove(cls)); el.classList.add(cls); el.scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(()=>el.classList.remove(cls), 2500); } }
    }

    // --- ========================================================================= ---
    // ---      *** Three.js Initializer START (Restored Verbose Syntax) ***         ---
    // --- ========================================================================= ---
    function initializeSimplifiedThreeJsViewer(viewerElementId, controlsElementId, vizData, allMaterialDetails) {
        const logPrefix = `[Three.js ${viewerElementId}]`;
        console.log(`${logPrefix} Initializing...`);

        const viewerContainer = document.getElementById(viewerElementId);
        const controlsContainer = document.getElementById(controlsElementId);
        if (!viewerContainer || !controlsContainer) { console.error(`${logPrefix} Container elements not found!`); return; }

        viewerContainer.innerHTML = `<p style="padding:20px; color:#888; text-align:center;">Setting up 3D...</p>`;
        controlsContainer.innerHTML = '';

        try { // WebGL Check
            const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) throw new Error('WebGL required but not supported/enabled.');
            console.log(`${logPrefix} WebGL OK.`);
        } catch (e) { console.error(`${logPrefix} WebGL Error:`, e.message); displayError(`WebGL Error: ${e.message}`, viewerElementId); return; }

        // --- Scope variables ---
        let scene, camera, renderer, css2DRenderer, controls, crystalModelGroup, unitCellOutline;
        let isSpinning = false, showLabels = true, currentViewStyle = 'ballAndStick', cdConcentration;
        let supercellDims, atomInfo, latticeConstantsSource, lattice_a;
        let sphereScales, stickRadius, labelOffset, sphereDetail, stickDetail, fallbackBondCutoffFactor;
        let bondCutoff, bondCutoffSq;
        let materials, defaultMaterial, bondMaterial, unitCellMaterial;
        let sphereGeometries = {}, stickGeometry, yAxis;
        let animationFrameId = null;

        // --- Initialization ---
        function init() {
            try {
                if (viewerContainer.clientWidth === 0 || viewerContainer.clientHeight === 0) { requestAnimationFrame(init); return; }
                console.log(`${logPrefix} Container: ${viewerContainer.clientWidth}x${viewerContainer.clientHeight}`);
                while (viewerContainer.firstChild) viewerContainer.removeChild(viewerContainer.firstChild);

                // --- Config ---
                cdConcentration = vizData.composition.initial_x;
                supercellDims = { nx: vizData.supercell?.nx ?? 2, ny: vizData.supercell?.ny ?? 2, nz: vizData.supercell?.nz ?? 2 };
                atomInfo = vizData.atom_info; latticeConstantsSource = vizData.lattice_constants;
                sphereScales = { spacefill: 0.55, ballAndStick: 0.28, stick: 0.1 };
                stickRadius = 0.05; labelOffset = 0.3; sphereDetail = 12; stickDetail = 6;
                fallbackBondCutoffFactor = 0.45; yAxis = new THREE.Vector3(0, 1, 0);
                crystalModelGroup = new THREE.Group(); crystalModelGroup.name = `Group-${viewerElementId}`;

                // --- Initial Calcs ---
                lattice_a = calculateLatticeConstant(cdConcentration); calculateBondCutoff();

                // --- Materials ---
                materials = {}; defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xccc, metalness: 0.4, roughness: 0.6 });
                Object.entries(atomInfo).forEach(([sym, inf])=>{ materials[sym.toUpperCase()] = new THREE.MeshStandardMaterial({ color: inf?.color||'#ccc', metalness: inf?.metalness??0.4, roughness: inf?.roughness??0.6 }); });
                bondMaterial = new THREE.MeshStandardMaterial({ color: 0x666, metalness: 0.1, roughness: 0.8 });
                unitCellMaterial = new THREE.LineBasicMaterial({ color: 0x33f, linewidth: 2 });
                stickGeometry = new THREE.CylinderGeometry(stickRadius, stickRadius, 1, stickDetail, 1); // Template, Y-up

                // --- Scene, Camera ---
                scene = new THREE.Scene(); scene.background = new THREE.Color(0xddeeff);
                const width = viewerContainer.clientWidth, height = viewerContainer.clientHeight;
                camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
                const dist = (lattice_a * Math.max(supercellDims.nx, supercellDims.ny, supercellDims.nz)) * 1.5;
                camera.position.set(dist * 0.8, dist * 0.6, dist); camera.lookAt(0, 0, 0);

                // --- Renderers ---
                renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
                renderer.setSize(width, height); renderer.setPixelRatio(window.devicePixelRatio);
                viewerContainer.appendChild(renderer.domElement);
                const cssOverlay = document.createElement('div'); cssOverlay.className = 'css2d-renderer-overlay';
                cssOverlay.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; overflow:hidden;';
                viewerContainer.appendChild(cssOverlay);
                css2DRenderer = new THREE.CSS2DRenderer(); css2DRenderer.setSize(width, height);
                cssOverlay.appendChild(css2DRenderer.domElement);

                // --- Controls ---
                controls = new THREE.OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
                controls.dampingFactor = 0.1; controls.minDistance = lattice_a * 0.5;
                controls.maxDistance = lattice_a * Math.max(supercellDims.nx, supercellDims.ny, supercellDims.nz) * 5;

                // --- Lighting, Scene Add ---
                scene.add(new THREE.AmbientLight(0xfff, 0.7)); const dl = new THREE.DirectionalLight(0xfff, 0.9); dl.position.set(5, 10, 7.5); scene.add(dl);
                scene.add(crystalModelGroup);

                // --- Initial Build ---
                createOrUpdateUnitCellOutline(); updateCrystalModel(); // Builds data + visuals

                window.addEventListener('resize', onWindowResize); console.log(`${logPrefix} Init OK.`);

            } catch(e) { console.error(`${logPrefix} Init failed:`, e); displayError(`3D Init Error: ${e.message}`, viewerElementId); cleanup(); }
        }

        // --- Dispose Meshes ---
        function disposeMeshes(group, keepOutline = false) {
            if (!group) return;
            [...group.children].forEach(obj => {
                if (keepOutline && obj === unitCellOutline) return;
                if (obj.isMesh || obj.isLineSegments) { if (obj.geometry && obj.geometry !== stickGeometry) obj.geometry.dispose(); }
                else if (obj.isCSS2DObject) { if (obj.element?.parentNode) obj.element.parentNode.removeChild(obj.element); obj.element = null; }
                group.remove(obj);
            });
        }

        // --- Calculate Lattice Constant ---
        function calculateLatticeConstant(concentration) {
            let hostSym, subSym;
            for(const s in atomInfo){ if(atomInfo[s].role === 'cation_host') hostSym=s; if(atomInfo[s].role === 'cation_subst') subSym=s; }
            if(!hostSym || !subSym){ console.warn(`${logPrefix} Roles missing for lattice calc.`); return lattice_a; }
            const aH=Number(latticeConstantsSource[hostSym]), aS=Number(latticeConstantsSource[subSym]), r=Number(concentration);
            if(isNaN(aH) || isNaN(aS) || isNaN(r)){ console.warn(`${logPrefix} Invalid Vegard values.`); return lattice_a; }
            const calc_a = aH * (1-r) + aS * r;
            return (!isNaN(calc_a) && calc_a > 0) ? calc_a : lattice_a;
        }

        // --- Calculate Bond Cutoff ---
        function calculateBondCutoff() {
            const jsonCutoff = Number(vizData.bond_cutoff);
            bondCutoff = (!isNaN(jsonCutoff) && jsonCutoff > 0) ? jsonCutoff : lattice_a * fallbackBondCutoffFactor;
            bondCutoffSq = bondCutoff * bondCutoff;
            if (isNaN(bondCutoffSq) || bondCutoffSq <= 0) { console.error(`${logPrefix} Invalid bondCutoffSq: ${bondCutoffSq}`); bondCutoffSq = -1; }
        }

        // --- Generate Atom Data (VERBOSE & CORRECT) ---
        function generateCrystalData(nx, ny, nz, currentConcentration) {
            const atoms = [];
            lattice_a = calculateLatticeConstant(currentConcentration); // Update lattice_a based on concentration

            let cation_host_symbol, cation_subst_symbol, anion_symbol;
            for(const symbol in atomInfo){
                if(atomInfo[symbol].role === 'cation_host') cation_host_symbol = symbol.toUpperCase();
                if(atomInfo[symbol].role === 'cation_subst') cation_subst_symbol = symbol.toUpperCase();
                if(atomInfo[symbol].role === 'anion') anion_symbol = symbol.toUpperCase();
            }
            if (!cation_host_symbol || !cation_subst_symbol || !anion_symbol) { console.error(`${logPrefix} Roles missing.`); return []; }

            const supercellCenter = new THREE.Vector3(
                (nx * lattice_a) / 2.0 - lattice_a / 2.0,
                (ny * lattice_a) / 2.0 - lattice_a / 2.0,
                (nz * lattice_a) / 2.0 - lattice_a / 2.0
            );

            const baseAnion = [[0,0,0], [0,.5,.5], [.5,0,.5], [.5,.5,0]];
            const baseCation = [[.25,.25,.25], [.25,.75,.75], [.75,.25,.75], [.75,.75,.25]];

            for (let i = 0; i < nx; i++) {
                for (let j = 0; j < ny; j++) {
                    for (let k = 0; k < nz; k++) {
                        const cellOrigin = new THREE.Vector3(i * lattice_a, j * lattice_a, k * lattice_a);
                        // Anions
                        baseAnion.forEach(pos => {
                            const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2]);
                            atomPos.multiplyScalar(lattice_a);
                            atomPos.add(cellOrigin);
                            atomPos.sub(supercellCenter);
                            if (!isNaN(atomPos.x)) atoms.push({ element: anion_symbol, position: atomPos });
                        });
                        // Cations
                        baseCation.forEach(pos => {
                            const element = Math.random() < currentConcentration ? cation_subst_symbol : cation_host_symbol;
                            const atomPos = new THREE.Vector3(pos[0], pos[1], pos[2]);
                            atomPos.multiplyScalar(lattice_a);
                            atomPos.add(cellOrigin);
                            atomPos.sub(supercellCenter);
                            if (!isNaN(atomPos.x)) atoms.push({ element: element, position: atomPos });
                        });
                    }
                }
            }
            console.log(`${logPrefix} Generated ${atoms.length} atoms (a=${lattice_a.toFixed(3)}, x=${currentConcentration.toFixed(2)}).`);
            return atoms;
        }

        // --- Create CSS Label ---
        function createCSS2DLabel(text) { const d=document.createElement('div'); d.className='atom-label'; d.textContent=text; const l=new THREE.CSS2DObject(d); l.layers.set(0); return l; }

        // --- Create Visual Model (VERBOSE & CORRECT) ---
        function createOrUpdateVisualModel(atomData) {
            console.log(`${logPrefix} Rebuilding visuals (Style: ${currentViewStyle})...`);
            disposeMeshes(crystalModelGroup, true); // Keep outline
            const scale = sphereScales[currentViewStyle] || sphereScales.ballAndStick;

            // Update sphere geometries based on scale
            Object.keys(atomInfo).forEach(symbol => {
                const upperSymbol = symbol.toUpperCase(); const baseRadius = atomInfo[symbol]?.radius ?? 1.0;
                let radius = baseRadius * scale; if (isNaN(radius) || radius <= 1e-3) radius = 0.05;
                if (sphereGeometries[upperSymbol]) sphereGeometries[upperSymbol].dispose();
                try { sphereGeometries[upperSymbol] = new THREE.SphereGeometry(radius, sphereDetail, sphereDetail); } catch (e) { console.error(`${logPrefix} Sphere geom error ${upperSymbol}: ${e.message}`); sphereGeometries[upperSymbol] = null; }
            });

            let spheres=0, labels=0, bonds=0, checked=0;
            // Add Spheres & Labels
            atomData.forEach(atom => {
                const symbol = atom.element.toUpperCase(); const geometry = sphereGeometries[symbol]; const material = materials[symbol] || defaultMaterial;
                if (!geometry || !material || !atom.position || isNaN(atom.position.x)) return;
                const sphere = new THREE.Mesh(geometry, material); sphere.position.copy(atom.position); crystalModelGroup.add(sphere); spheres++;
                if (showLabels) { const label = createCSS2DLabel(atom.element); label.position.copy(atom.position).y += labelOffset; crystalModelGroup.add(label); labels++; }
            });

            // Add Bonds
            const drawBonds = (currentViewStyle === 'stick' || currentViewStyle === 'ballAndStick');
            if (drawBonds && bondCutoffSq > 0) {
                // console.log(`${logPrefix} Bonds: Cutoff=${bondCutoff.toFixed(3)}, Sq=${bondCutoffSq.toFixed(3)}`);
                for (let i = 0; i < atomData.length; i++) {
                    for (let j = i + 1; j < atomData.length; j++) {
                        checked++;
                        const atom1 = atomData[i], atom2 = atomData[j];
                        if (!atom1?.position || !atom2?.position || isNaN(atom1.position.x) || isNaN(atom2.position.x)) continue;
                        const distSq = atom1.position.distanceToSquared(atom2.position);
                        if (distSq > 1e-6 && distSq < bondCutoffSq) {
                            const role1 = atomInfo[atom1.element]?.role ?? 'unk', role2 = atomInfo[atom2.element]?.role ?? 'unk';
                            const isPair = (role1.includes('cation') && role2 === 'anion') || (role1 === 'anion' && role2.includes('cation'));
                            if (isPair) {
                                const distance = Math.sqrt(distSq); if (isNaN(distance) || distance <= 1e-3) continue;
                                const stickMesh = new THREE.Mesh(stickGeometry, bondMaterial);
                                stickMesh.position.copy(atom1.position).add(atom2.position).multiplyScalar(0.5);
                                const direction = new THREE.Vector3().subVectors(atom2.position, atom1.position).normalize();
                                const quaternion = new THREE.Quaternion().setFromUnitVectors(yAxis, direction);
                                stickMesh.quaternion.copy(quaternion);
                                stickMesh.scale.set(1, distance, 1); // Scale along local Y
                                crystalModelGroup.add(stickMesh); bonds++;
                            }
                        }
                    }
                }
                 console.log(`${logPrefix} Bonds: Checked ${checked}, Added ${bonds}.`);
            } else if (drawBonds) console.log(`${logPrefix} Bonds skipped (CutoffSq <= 0).`);
             console.log(`${logPrefix} Visuals done: ${spheres} spheres, ${labels} labels. Children: ${crystalModelGroup.children.length}`);
        }

        // --- Update Outline (VERBOSE & CORRECT) ---
        function createOrUpdateUnitCellOutline() {
            lattice_a = calculateLatticeConstant(cdConcentration);
            if (unitCellOutline) { if (unitCellOutline.geometry) unitCellOutline.geometry.dispose(); crystalModelGroup.remove(unitCellOutline); unitCellOutline = null; }

            const boxGeo = new THREE.BoxGeometry(lattice_a, lattice_a, lattice_a);
            const edges = new THREE.EdgesGeometry(boxGeo);

            const supercellCenterOffset = new THREE.Vector3(
                (supercellDims.nx * lattice_a) / 2.0 - lattice_a / 2.0,
                (supercellDims.ny * lattice_a) / 2.0 - lattice_a / 2.0,
                (supercellDims.nz * lattice_a) / 2.0 - lattice_a / 2.0
            );
            const outlinePosition = new THREE.Vector3(lattice_a / 2, lattice_a / 2, lattice_a / 2);
            outlinePosition.sub(supercellCenterOffset);

            unitCellOutline = new THREE.LineSegments(edges, unitCellMaterial);
            unitCellOutline.position.copy(outlinePosition);
            unitCellOutline.name = `Outline-${viewerElementId}`;
            crystalModelGroup.add(unitCellOutline);
            boxGeo.dispose();
            console.log(`${logPrefix} Outline updated.`);
        }

        // --- Update Model Wrapper (VERBOSE & CORRECT) ---
        function updateCrystalModel() {
            console.log(`${logPrefix} Updating model...`); const old_a = lattice_a;
            lattice_a = calculateLatticeConstant(cdConcentration); const changed = Math.abs(lattice_a - old_a) > 1e-4;
            calculateBondCutoff(); // Recalc bond cutoff

            console.log(`${logPrefix} Generating atom data...`);
            const atomData = generateCrystalData(supercellDims.nx, supercellDims.ny, supercellDims.nz, cdConcentration);
            if (!atomData || atomData.length === 0) { console.error(`${logPrefix} Atom data gen failed!`); return; }

            console.log(`${logPrefix} Rebuilding visuals...`); createOrUpdateVisualModel(atomData);
            if (changed) { console.log(`${logPrefix} Lattice changed, updating outline.`); createOrUpdateUnitCellOutline(); }

            if (controls) { // Update control limits
                controls.minDistance = lattice_a * 0.5;
                controls.maxDistance = lattice_a * Math.max(supercellDims.nx, supercellDims.ny, supercellDims.nz) * 5;
            }
            console.log(`${logPrefix} Model update complete.`);
        }

        // --- Setup UI (VERBOSE & CORRECT) ---
        function setupUI() {
            controlsContainer.innerHTML = ''; const wrap = document.createElement('div');
            const name = allMaterialDetails?.materialName || 'Material'; let compHTML = '';
            const { min_x, max_x } = vizData.composition;
            const cid = controlsElementId; // Alias for brevity

            if (typeof min_x === 'number' && typeof max_x === 'number' && min_x !== max_x) {
                compHTML = `
                <div class="control-item">
                    <label for="${cid}-cdSlider">Cd Conc (x): <span id="${cid}-cdValue">${cdConcentration.toFixed(2)}</span></label>
                    <input type="range" class="concentration-slider" id="${cid}-cdSlider" min="${min_x}" max="${max_x}" step="0.01" value="${cdConcentration}">
                </div>`;
            } else {
                compHTML = `<div class="control-item"><p>Composition (x): Fixed at ${cdConcentration.toFixed(2)}</p></div>`;
            }

            wrap.innerHTML = `
                <h3>${name} Model Controls</h3><p>${supercellDims.nx}x${supercellDims.ny}x${supercellDims.nz} Supercell</p>
                ${compHTML}
                <div class="control-item">
                    <label>View Style:</label>
                    <select id="${cid}-styleSelect">
                        <option value="ballAndStick" ${currentViewStyle === 'ballAndStick' ? 'selected' : ''}>Ball & Stick</option>
                        <option value="spacefill" ${currentViewStyle === 'spacefill' ? 'selected' : ''}>Space Filling</option>
                        <option value="stick" ${currentViewStyle === 'stick' ? 'selected' : ''}>Stick Only</option>
                    </select>
                </div>
                <div class="control-item button-group">
                    <button id="${cid}-spinButton" class="viewer-button">${isSpinning ? 'Stop' : 'Start'} Spin</button>
                    <button id="${cid}-labelToggleButton" class="viewer-button">${showLabels ? 'Hide' : 'Show'} Labels</button>
                </div>
                <div class="control-item">
                    <label>Legend:</label><ul id="${cid}-legendList" class="viewer-legend"></ul>
                </div>
                <p class="viewer-hint">Drag rotate, Scroll/Pinch zoom.</p>`;
            controlsContainer.appendChild(wrap);

            // Add Listeners
            const slider = document.getElementById(`${cid}-cdSlider`); const valueSpan = document.getElementById(`${cid}-cdValue`);
            const spinBtn = document.getElementById(`${cid}-spinButton`); const labelBtn = document.getElementById(`${cid}-labelToggleButton`);
            const styleSelect = document.getElementById(`${cid}-styleSelect`);

            if (slider) {
                slider.addEventListener('input', e => { if (valueSpan) valueSpan.textContent = parseFloat(e.target.value).toFixed(2); });
                slider.addEventListener('change', e => { cdConcentration = parseFloat(e.target.value); console.log(`${logPrefix} Conc changed: ${cdConcentration}`); if (valueSpan) valueSpan.textContent = cdConcentration.toFixed(2); updateCrystalModel(); });
            }
            if (spinBtn) spinBtn.addEventListener('click', () => { isSpinning = !isSpinning; spinBtn.textContent = `${isSpinning ? 'Stop' : 'Start'} Spin`; console.log(`${logPrefix} Spin: ${isSpinning}`); });
            if (labelBtn) labelBtn.addEventListener('click', () => { showLabels = !showLabels; labelBtn.textContent = `${showLabels ? 'Hide' : 'Show'} Labels`; console.log(`${logPrefix} Labels: ${showLabels}`); updateCrystalModel(); });
            if (styleSelect) styleSelect.addEventListener('change', e => { currentViewStyle = e.target.value; console.log(`${logPrefix} Style: ${currentViewStyle}`); updateCrystalModel(); populateLegendUI(); });

            populateLegendUI(); console.log(`${logPrefix} UI OK.`);
        }

        // --- Populate Legend ---
         function populateLegendUI() {
             const leg = document.getElementById(`${controlsElementId}-legendList`); if (!leg) return; leg.innerHTML = '';
             Object.entries(atomInfo).forEach(([sym, inf])=>{const s=sym.toUpperCase(); const c=materials[s]?.color.getStyle()||'#ccc'; const li=document.createElement('li');li.innerHTML=`<span class="color-box" style="background-color:${c};"></span> ${sym} (${inf.role||'N/A'})`;leg.appendChild(li)});
             if(currentViewStyle==='ballAndStick'||currentViewStyle==='stick'){const li=document.createElement('li');li.innerHTML=`<span class="color-box" style="background-color:${bondMaterial.color.getStyle()};"></span> Bonds`;leg.appendChild(li);}
         }

        // --- Resize Handler ---
        function onWindowResize() { if (!camera || !renderer || !css2DRenderer || !viewerContainer) return; const w=viewerContainer.clientWidth, h=viewerContainer.clientHeight; if(w===0||h===0)return; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h); css2DRenderer.setSize(w,h); }

        // --- Animation Loop ---
        function animate() { if (!renderer) { if(animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null; return; } animationFrameId = requestAnimationFrame(animate); if(controls) controls.update(); if(isSpinning&&crystalModelGroup) crystalModelGroup.rotation.y += 0.005; if(scene&&camera){renderer.render(scene,camera); if(css2DRenderer) css2DRenderer.render(scene,camera);} }

        // --- Cleanup ---
        function cleanup() {
             console.log(`${logPrefix} Cleaning up...`); if(animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
             window.removeEventListener('resize', onWindowResize);
             Object.values(sphereGeometries).forEach(g=>{if(g)g.dispose()}); Object.keys(sphereGeometries).forEach(k=>delete sphereGeometries[k]);
             if(stickGeometry)stickGeometry.dispose(); if(unitCellOutline?.geometry)unitCellOutline.geometry.dispose();
             Object.values(materials).forEach(m=>{if(m)m.dispose()}); if(bondMaterial)bondMaterial.dispose(); if(unitCellMaterial)unitCellMaterial.dispose(); if(defaultMaterial)defaultMaterial.dispose();
             if(crystalModelGroup)disposeMeshes(crystalModelGroup, false); if(scene?.remove)scene.remove(crystalModelGroup); crystalModelGroup=null; unitCellOutline=null; scene=null; camera=null;
             if(controls)controls.dispose(); controls=null;
             if(renderer){renderer.dispose(); renderer.domElement?.parentNode?.removeChild(renderer.domElement); renderer=null;}
             const ov=viewerContainer?.querySelector('.css2d-renderer-overlay'); if(ov?.parentNode)ov.parentNode.removeChild(ov); css2DRenderer=null;
             if(viewerContainer)viewerContainer.innerHTML=''; if(controlsContainer)controlsContainer.innerHTML=''; console.log(`${logPrefix} Cleanup OK.`);
        }

        // --- Main Flow ---
        try {
            console.log(`${logPrefix} Starting flow...`); init();
            if (!scene || !camera || !renderer || !css2DRenderer || !controls) throw new Error("Core component init failed.");
            setupUI();
            if (renderer && scene && camera) { console.log(`${logPrefix} First render...`); renderer.render(scene, camera); if (css2DRenderer) css2DRenderer.render(scene, camera); } else console.error(`${logPrefix} No first render.`);
            animate(); console.log(`${logPrefix} Animation started.`);
            const obsTarget = viewerContainer.closest('.crystal-viewer-wrapper') || viewerContainer;
            if (obsTarget?.parentNode) { const obs = new MutationObserver((muts, o)=>{let rem=false;for(const m of muts){if(m.removedNodes)m.removedNodes.forEach(n=>{if(n===obsTarget||n.contains(obsTarget))rem=true})} if(rem){console.log(`${logPrefix} Viewer removed. Cleanup.`);cleanup();o.disconnect()}}); obs.observe(obsTarget.parentNode, {childList: true}); console.log(`${logPrefix} Observer watching.`); }
            else console.warn(`${logPrefix} Cannot setup observer cleanup.`);
        } catch(error) { console.error(`${logPrefix} Main flow failed:`, error); displayError(`Viewer Fail: ${error.message}`, viewerElementId); cleanup(); }

    } // --- End initializeSimplifiedThreeJsViewer ---
    // --- ======================================================================= ---
    // ---      *** Three.js Initializer END (Restored Verbose Syntax) ***         ---
    // --- ======================================================================= ---

}); // --- End DOMContentLoaded ---
