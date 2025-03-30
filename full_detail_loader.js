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
    const detailFilePath = `./details/${safeMaterialName}_details.json`;
    console.log(`[Full Detail Loader] Constructed file path: '${detailFilePath}'`);

    // --- Fetch and Process Data ---
    console.log("[Full Detail Loader] Starting fetch operation...");
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
        const materialDetails = await response.json(); // Attempt to parse JSON
        console.log("[Full Detail Loader] JSON parsed successfully.");
        const sectionDataMap = new Map();

        // --- Process References ---
        console.log("[Full Detail Loader] Processing references...");
        const collectedRefs = new Set();
        const processRefs = (data) => {
             if (typeof data === 'object' && data !== null) {
                 if (data.ref && materialDetails.references && materialDetails.references[data.ref]) { collectedRefs.add(data.ref); }
                 Object.values(data).forEach(value => { if (typeof value === 'object' || Array.isArray(value)) { processRefs(value); } });
             } else if (Array.isArray(data)) { data.forEach(processRefs); }
        };
        processRefs(materialDetails);
        console.log(`[Full Detail Loader] References processed. Found ${collectedRefs.size} unique refs.`);

        // --- Build Table of Contents & Store Section Data ---
        console.log("[Full Detail Loader] Building Table of Contents...");
        if (tocListEl && mainContentEl) {
            tocListEl.innerHTML = '';
            let sectionCount = 0;
            for (const sectionKey in materialDetails) {
                if (sectionKey === 'materialName' || sectionKey === 'references') continue;
                const sectionData = materialDetails[sectionKey];
                if (typeof sectionData !== 'object' || sectionData === null) continue;
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
             if(sectionTitleEl) sectionTitleEl.textContent = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
             if (sectionIntroEl) {
                 if (sectionData.introduction) { sectionIntroEl.innerHTML = sectionData.introduction; sectionIntroEl.style.display = 'block'; }
                 else { sectionIntroEl.style.display = 'none'; sectionIntroEl.innerHTML = ''; }
             }
             if (propertiesContainerEl && sectionData.properties && typeof sectionData.properties === 'object') {
                 propertiesContainerEl.innerHTML = '';
                 Object.entries(sectionData.properties).forEach(([propKey, propData]) => {
                     const propertyBlockElement = renderPropertyBlock(propKey, propData, materialDetails, propertiesContainerEl);
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
        if (collectedRefs.size > 0 && referencesListEl && materialDetails.references) {
             referencesListEl.innerHTML = ''; const sortedRefs = Array.from(collectedRefs).sort();
             sortedRefs.forEach(refKey => {
                 const refData = materialDetails.references[refKey];
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
        // ... (Keep the existing renderPropertyBlock code - no changes needed here) ...
        const propBlock = document.createElement('div'); propBlock.className = 'property-detail-block'; propBlock.id = `prop-${propKey}`;
        const propTitle = document.createElement('h3'); propTitle.innerHTML = propData.displayName || propKey.replace(/_/g, ' '); propBlock.appendChild(propTitle);
        if (propData.summary) { const summaryEl = document.createElement('div'); summaryEl.className = 'summary'; summaryEl.innerHTML = propData.summary; propBlock.appendChild(summaryEl); }
        if (propKey === 'crystal_structure' && propData.details && propData.details.visualization_data) {
            const vizData = propData.details.visualization_data; const viewerContainerId = vizData.container_id || `viewer-container-${propKey}-${Date.now()}`;
            const viewerWrapper = document.createElement('div'); viewerWrapper.className = 'crystal-viewer-wrapper'; const viewerHeight = vizData.viewer_height || '450px'; viewerWrapper.style.setProperty('--viewer-height', viewerHeight);
            viewerWrapper.innerHTML = `
                <div id="${viewerContainerId}" class="crystal-viewer-container">
                    <div id="${viewerContainerId}-viewer" class="viewer-area"><p style="padding:20px; color:#888; text-align:center;">Loading 3D Viewer...</p></div>
                    <div id="${viewerContainerId}-controls" class="viewer-controls"><p style="padding:10px; color:#888;">Loading Controls...</p></div>
                </div>`;
            propBlock.appendChild(viewerWrapper);
            requestAnimationFrame(() => {
                 if (typeof $3Dmol === 'undefined') {
                     console.error("3Dmol.js library not loaded!"); const viewerArea = document.getElementById(`${viewerContainerId}-viewer`); if(viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Error: 3Dmol.js library failed to load.</p>`; const controlsArea = document.getElementById(`${viewerContainerId}-controls`); if(controlsArea) controlsArea.innerHTML = ''; return;
                 }
                 if (typeof initialize3DViewer === 'function') {
                    try { initialize3DViewer(`${viewerContainerId}-viewer`, `${viewerContainerId}-controls`, vizData, allDetails); }
                    catch(e) { console.error("Error initializing 3D viewer:", e); const viewerArea = document.getElementById(`${viewerContainerId}-viewer`); if (viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Could not load viewer. Check console.</p>`; const controlsArea = document.getElementById(`${viewerContainerId}-controls`); if(controlsArea) controlsArea.innerHTML = ''; }
                 } else { console.error("initialize3DViewer function not found!"); const viewerArea = document.getElementById(`${viewerContainerId}-viewer`); if(viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Error: Viewer init script missing.</p>`; const controlsArea = document.getElementById(`${viewerContainerId}-controls`); if(controlsArea) controlsArea.innerHTML = ''; }
            });
        }
        if (propData.details && typeof propData.details === 'object') {
             for (const [detailKey, detailContent] of Object.entries(propData.details)) {
                 if (detailKey === 'visualization_data') continue; if (!detailContent || (Array.isArray(detailContent) && detailContent.length === 0) || (typeof detailContent === 'object' && !Array.isArray(detailContent) && Object.keys(detailContent).length === 0) ) continue;
                 const subsection = document.createElement('div'); subsection.className = `detail-subsection ${detailKey.replace(/ /g, '_').toLowerCase()}`; const subsectionTitle = document.createElement('h4'); subsection.appendChild(subsectionTitle);
                  if (Array.isArray(detailContent) && detailKey !== 'equations') { const ul = document.createElement('ul'); detailContent.forEach(item => { const li = document.createElement('li'); li.innerHTML = item; ul.appendChild(li); }); subsection.appendChild(ul); }
                  else if (detailKey === 'equations' && Array.isArray(detailContent)) { detailContent.forEach(eq => { const eqBlock = document.createElement('div'); eqBlock.className = 'equation-block'; if (eq.name) { const nameEl = document.createElement('span'); nameEl.className = 'eq-name'; nameEl.textContent = eq.name; eqBlock.appendChild(nameEl); } if (eq.description) { const descEl = document.createElement('p'); descEl.className = 'eq-desc'; descEl.innerHTML = eq.description; eqBlock.appendChild(descEl); } const formulaContainer = document.createElement('div'); formulaContainer.className = 'eq-formula-container'; if (eq.formula_html) { formulaContainer.innerHTML = eq.formula_html; formulaContainer.classList.add('eq-formula-html'); } else if (eq.formula_plain) { formulaContainer.textContent = eq.formula_plain; formulaContainer.classList.add('eq-formula-plain'); } else { formulaContainer.textContent = "[Formula not available]"; formulaContainer.style.cssText = 'font-style: italic; color: #888;'; } eqBlock.appendChild(formulaContainer); if(eq.units){ const unitsEl = document.createElement('div'); unitsEl.className = 'eq-units'; unitsEl.innerHTML = `Units: ${eq.units}`; eqBlock.appendChild(unitsEl); } if (eq.variables && Array.isArray(eq.variables)) { const varsDiv = document.createElement('div'); varsDiv.className = 'eq-vars'; varsDiv.innerHTML = '<strong>Variables:</strong>'; const varsUl = document.createElement('ul'); eq.variables.forEach(v => { const li = document.createElement('li'); li.innerHTML = `<strong>${v.symbol}:</strong> ${v.description}`; varsUl.appendChild(li); }); varsDiv.appendChild(varsUl); eqBlock.appendChild(varsDiv); } if (eq.ref && allDetails.references && allDetails.references[eq.ref]) { const refEl = document.createElement('div'); refEl.className = 'eq-ref'; refEl.innerHTML = `Ref: <a href="#ref-${eq.ref}" class="ref-link" data-ref-key="${eq.ref}">[${eq.ref}]</a>`; eqBlock.appendChild(refEl); } subsection.appendChild(eqBlock); }); }
                  else if (detailKey === 'measurement_characterization' && typeof detailContent === 'object') { if(detailContent.techniques && Array.isArray(detailContent.techniques) && detailContent.techniques.length > 0){ const techDiv = document.createElement('div'); techDiv.className = "techniques"; const ulTech = document.createElement('ul'); detailContent.techniques.forEach(tech => { const li = document.createElement('li'); li.innerHTML = tech; ulTech.appendChild(li); }); techDiv.appendChild(ulTech); subsection.appendChild(techDiv); } if(detailContent.considerations && Array.isArray(detailContent.considerations) && detailContent.considerations.length > 0){ const considDiv = document.createElement('div'); considDiv.className = "considerations"; if (subsection.querySelector('.techniques')) { const considTitle = document.createElement('p'); considTitle.innerHTML = '<strong>Considerations:</strong>'; considTitle.style.cssText = 'margin-top: 1rem; margin-bottom: 0.25rem;'; considDiv.appendChild(considTitle); } const ulConsid = document.createElement('ul'); detailContent.considerations.forEach(note => { const li = document.createElement('li'); li.innerHTML = note; ulConsid.appendChild(li); }); considDiv.appendChild(ulConsid); subsection.appendChild(considDiv); } }
                  else if (typeof detailContent === 'string') { const p = document.createElement('p'); p.innerHTML = detailContent; subsection.appendChild(p); }
                  else { console.warn(`Unhandled detail structure for key '${detailKey}' in property '${propKey}'`, detailContent); const pre = document.createElement('pre'); pre.textContent = JSON.stringify(detailContent, null, 2); pre.style.cssText = 'font-size: 0.8em; background-color: #eee; padding: 5px; border-radius: 3px; overflow-x: auto; margin-left: 0.5rem;'; subsection.appendChild(pre); }
                 if(subsection.children.length > 1) { propBlock.appendChild(subsection); }
             }
        }
        return propBlock;
    } // --- End renderPropertyBlock ---

    // Function to handle reference link clicks
    function handleRefLinkClick(event) { /* ... same ... */
        const link = event.target.closest('a.ref-link[data-ref-key]');
        if (link) {
            event.preventDefault(); const targetId = `ref-${link.dataset.refKey}`; const targetElement = document.getElementById(targetId);
            if (targetElement) { const elementRect = targetElement.getBoundingClientRect(); const absoluteElementTop = elementRect.top + window.pageYOffset; const headerOffset = 60; const viewportHeight = window.innerHeight; const desiredScrollPos = absoluteElementTop - (viewportHeight * 0.3) - headerOffset; window.scrollTo({ top: Math.max(0, desiredScrollPos), behavior: 'smooth' }); document.querySelectorAll('#references-list li.highlight-ref').forEach(el => el.classList.remove('highlight-ref')); targetElement.classList.add('highlight-ref'); setTimeout(() => targetElement.classList.remove('highlight-ref'), 2500); }
            else { console.warn(`Reference target element with ID '${targetId}' not found.`); }
        }
    } // --- End handleRefLinkClick ---

    // --- Initialize 3D Viewer Function (INTEGRATED FROM STANDALONE) ---
    function initialize3DViewer(viewerElementId, controlsElementId, vizData, allMaterialDetails) {
        console.log("--- Initializing 3D Viewer (Using Integrated Standalone Logic) ---");
        console.log("Viewer Element ID:", viewerElementId);
        console.log("Controls Element ID:", controlsElementId);

        const viewerElement = document.getElementById(viewerElementId);
        const controlsElement = document.getElementById(controlsElementId);

        if (!viewerElement || !controlsElement) { console.error("Viewer or controls element not found"); return; }
        viewerElement.innerHTML = ''; // Clear loading message
        controlsElement.innerHTML = ''; // Clear loading message

        // --- Populate Controls HTML (Adapted IDs) ---
        controlsElement.innerHTML = `
            <h4>Controls</h4>
            <div class="control-group" id="${controlsElementId}-composition-group">
                <label class="control-title" for="${controlsElementId}-composition">Composition (${vizData.composition.variable_element || 'x'} fraction 'x')</label>
                <input type="range" id="${controlsElementId}-composition" class="slider"
                       min="${vizData.composition.min_x}" max="${vizData.composition.max_x}" step="0.05" value="${vizData.composition.initial_x}">
                <div id="${controlsElementId}-composition-value">x = ${vizData.composition.initial_x.toFixed(2)}</div>
            </div>
            <div class="control-group viz-controls">
                <div class="control-title">Visualization</div>
                <button data-style="stick" id="${controlsElementId}-btn-stick">Stick</button>
                <button data-style="ballAndStick" id="${controlsElementId}-btn-ball-stick" class="active">Ball & Stick</button>
                <button data-style="spacefill" id="${controlsElementId}-btn-spacefill">Spacefill</button>
            </div>
            <div class="control-group cell-controls">
                <div class="control-title">Unit Cell</div>
                <button id="${controlsElementId}-btn-show-cell">Show Cell</button>
                <button id="${controlsElementId}-btn-hide-cell" class="active">Hide Cell</button> {/* Default to hidden */}
            </div>
             <div class="control-group supercell-controls">
                <div class="control-title">Supercell</div>
                ${(vizData.supercell_options || [1]).map(size =>
                    `<button data-size="${size}" id="${controlsElementId}-btn-${size}x${size}x${size}" class="${size === 1 ? 'active' : ''}">${size}×${size}×${size}</button>`
                 ).join('')}
            </div>
             <div class="control-group">
                 <div class="control-title">Info</div>
                 <div class="info-panel">
                     <h5 id="${controlsElementId}-info-title">${allMaterialDetails.materialName} Structure</h5>
                     <div id="${controlsElementId}-lattice-info">Lattice: ...</div>
                     <div id="${controlsElementId}-composition-info">Composition: ...</div>
                     <div id="${controlsElementId}-spacegroup-info">Space group: ${allMaterialDetails.identification.properties.space_group?.summary || 'N/A'}</div>
                     <hr>
                     <div id="${controlsElementId}-legend"></div>
                 </div>
             </div>
            <div class="control-group action-controls">
                <div class="control-title">Actions</div>
                <button id="${controlsElementId}-btn-spin">Spin</button>
                <button id="${controlsElementId}-btn-stop">Stop</button>
                <button id="${controlsElementId}-btn-screenshot">Screenshot (PNG)</button>
            </div>
        `;

        if (vizData.composition.min_x === vizData.composition.max_x) {
            const compGroup = document.getElementById(`${controlsElementId}-composition-group`); if(compGroup) compGroup.style.display = 'none'; const compInfo = document.getElementById(`${controlsElementId}-composition-info`); if(compInfo) compInfo.style.display = 'none';
        }

        // --- 3Dmol.js Initialization ---
        let viewer;
        try {
            viewer = $3Dmol.createViewer(viewerElement, {
                backgroundColor: "white", antialias: true, hoverable: true
            });
            console.log("3Dmol viewer created.");
        } catch (e) { console.error("Error creating 3Dmol viewer:", e); displayViewerError("Failed to create 3D viewer instance."); return; }

        // --- State and Constants (Adapted from Standalone) ---
        const atomInfo = vizData.atom_info; // Get from vizData
        const latticeConstantsSource = vizData.lattice_constants; // Get from vizData

        // Extract specific lattice constants needed for HgCdTe example
        const a_HgTe = latticeConstantsSource?.HgTe || 6.46; // Default fallback
        const a_CdTe = latticeConstantsSource?.CdTe || 6.48; // Default fallback

        const atomColors = {}; // { HG: color, CD: color, TE: color }
        const atomRadii = {}; // Currently unused but populated

        let latticeConstant = a_HgTe; // Initial lattice constant, will be updated
        let labelsShown = false;
        let cellShown = false; // Default to hidden to match button state
        let atomLabels = []; // Stores label objects
        let cellShapes = []; // Stores shape objects for cell lines
        let cellLabel = null; // Stores label object for cell dimension
        let currentViewStyle = "ballAndStick";
        let currentSupercell = 1;
        let currentAtoms = []; // Stores the currently generated atom data array [{elem,x,y,z,serial}, ...]

        // --- Info Panel & Legend Elements ---
        const latticeInfoEl = document.getElementById(`${controlsElementId}-lattice-info`);
        const compositionInfoEl = document.getElementById(`${controlsElementId}-composition-info`);
        const legendEl = document.getElementById(`${controlsElementId}-legend`);
        const compValueEl = document.getElementById(`${controlsElementId}-composition-value`);

        // Populate Legend using vizData.atom_info
        legendEl.innerHTML = '';
        if (atomInfo && typeof atomInfo === 'object') {
            Object.entries(atomInfo).forEach(([symbol, info]) => {
                const upperSymbol = symbol.toUpperCase();
                atomColors[upperSymbol] = info.color || '#CCCCCC';
                atomRadii[upperSymbol] = info.radius || 1.0;
                const legendItem = document.createElement('div'); legendItem.className = 'legend';
                legendItem.innerHTML = `<div class="legend-color" style="background-color:${atomColors[upperSymbol]};"></div><div>${symbol}</div>`;
                legendEl.appendChild(legendItem);
            });
        } else { console.error("vizData.atom_info is missing or not an object!"); }
        console.log("Atom Colors Map:", atomColors);


        // --- Structure Generation (Adapted from Standalone) ---
        function generateAtomData(compositionRatio, cellSize) {
            // Use a_HgTe and a_CdTe defined above from vizData
            const currentLatticeConstant = a_HgTe * (1 - compositionRatio) + a_CdTe * compositionRatio;
            let atoms = [];
            // Get roles from vizData
            const anion = Object.keys(atomInfo).find(key => atomInfo[key].role === 'anion');
            const cation_host = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_host');
            const cation_subst = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_subst');

            if (vizData.structure_type === 'zincblende_alloy') {
                if (!anion || !cation_host || !cation_subst) { console.error("Atom roles missing for zincblende_alloy"); return []; }
                const cationPositions = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
                const anionPositions = [[0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]];
                for (let i = 0; i < cellSize; i++) { for (let j = 0; j < cellSize; j++) { for (let k = 0; k < cellSize; k++) {
                    cationPositions.forEach(pos => {
                        let elemType = Math.random() < compositionRatio ? cation_subst : cation_host;
                        atoms.push({ elem: elemType.toUpperCase(), // ** Use Uppercase **
                                     x: (pos[0] + i) * currentLatticeConstant,
                                     y: (pos[1] + j) * currentLatticeConstant,
                                     z: (pos[2] + k) * currentLatticeConstant });
                    });
                    anionPositions.forEach(pos => {
                        atoms.push({ elem: anion.toUpperCase(), // ** Use Uppercase **
                                     x: (pos[0] + i) * currentLatticeConstant,
                                     y: (pos[1] + j) * currentLatticeConstant,
                                     z: (pos[2] + k) * currentLatticeConstant });
                    });
                }}}
            }
            // ADD OTHER STRUCTURE TYPES HERE if needed
            else { console.error("Unsupported structure_type:", vizData.structure_type); return []; }

            atoms.forEach((atom, index) => atom.serial = index); // Add serial needed by addAtoms

            // Update Info Panel Text
             latticeConstant = currentLatticeConstant; // Update global latticeConstant for cell drawing
            if(latticeInfoEl) latticeInfoEl.textContent = `Lattice: a ≈ ${latticeConstant.toFixed(3)} Å`;
            if(compositionInfoEl && vizData.composition.formula_template && vizData.composition.min_x !== vizData.composition.max_x) { compositionInfoEl.innerHTML = `Composition: ${vizData.composition.formula_template.replace('{x}', compositionRatio.toFixed(2)).replace('{1-x}', (1 - compositionRatio).toFixed(2))}`; }
            else if (compositionInfoEl && vizData.composition.formula_template) { compositionInfoEl.innerHTML = `Formula: ${vizData.composition.formula_template.replace(/{1-x}/g,'').replace(/{x}/g,'')}`; }
            else if (compositionInfoEl) { compositionInfoEl.textContent = `Composition: x = ${compositionRatio.toFixed(2)}`; }

            console.log(`Generated ${atoms.length} atoms.`);
            return atoms;
        }


        // --- Viewer Display Functions (Adapted from Standalone) ---
         function displayViewerError(message) { viewerElement.innerHTML = `<p class="error-message" style="padding: 20px; text-align: center;">${message}</p>`; }

         // Add Atom Labels (Adapted - Plain JS, uses atomLabels array)
         function addAtomLabels() {
            atomLabels.forEach(label => viewer.removeLabel(label)); // Use internal array
            atomLabels = [];
            if (!labelsShown || !currentAtoms || currentAtoms.length === 0) return;

            // Simplified label positioning - add near atom
            currentAtoms.forEach(atom => {
                // Show labels only for the base cell (0,0,0) for less clutter in supercells
                if (atom.x < latticeConstant && atom.y < latticeConstant && atom.z < latticeConstant) {
                    let labelPos = { x: atom.x, y: atom.y, z: atom.z };
                    let labelText = atom.elem;
                    let label = viewer.addLabel(labelText, {
                        position: labelPos,
                        inFront: true, // Make sure labels are visible
                        fontSize: 10,
                        fontColor: '#333',
                        // background specs from standalone:
                        // backgroundColor: "rgba(255,255,255,0.7)",
                        // showBackground: true,
                        // backgroundOpacity: 0.5
                    });
                    atomLabels.push(label); // Store the label object
                }
            });
            console.log(`Added ${atomLabels.length} labels.`);
         }

         // Draw Unit Cell Outline (Adapted - Plain JS, uses cellShapes array)
         function drawUnitCellOutline() {
             cellShapes.forEach(shape => viewer.removeShape(shape)); // Use internal array
             cellShapes = [];
             if (cellLabel) { viewer.removeLabel(cellLabel); cellLabel = null; }
             if (!cellShown) return;

             const cellLength = latticeConstant * currentSupercell;
             console.log(`Drawing unit cell outline: size=${currentSupercell}, length=${cellLength}`);
             const vertices = [ [0,0,0],[cellLength,0,0],[0,cellLength,0],[cellLength,cellLength,0], [0,0,cellLength],[cellLength,0,cellLength],[0,cellLength,cellLength],[cellLength,cellLength,cellLength] ];
             const edges = [ [0,1],[0,2],[1,3],[2,3],[4,5],[4,6],[5,7],[6,7],[0,4],[1,5],[2,6],[3,7] ];
             edges.forEach(edge => {
               const start = {x:vertices[edge[0]][0], y:vertices[edge[0]][1], z:vertices[edge[0]][2]};
               const end = {x:vertices[edge[1]][0], y:vertices[edge[1]][1], z:vertices[edge[1]][2]};
               // Using cylinder for lines as in standalone
               let shape = viewer.addCylinder({
                   start: start, end: end, radius: 0.05, color: "#555555",
                   dashed: true, dashLength: 0.4, gapLength: 0.2
                });
               cellShapes.push(shape); // Store shape object
             });

             // Add cell dimension label only for 1x1x1 cell
             if (currentSupercell === 1) {
               cellLabel = viewer.addLabel(`a ≈ ${latticeConstant.toFixed(3)} Å`, {
                   position:{x:cellLength/2, y:-0.5 * latticeConstant, z:-0.5 * latticeConstant}, // Adjust position
                   backgroundColor:"rgba(255,255,255,0.8)", fontColor:"#333333", fontSize:12,
                   showBackground:true, backgroundOpacity:0.8
                });
             }
             console.log(`Added ${cellShapes.length} cell lines` + (cellLabel ? ' and 1 cell label.' : '.'));
          }


        // --- Core Rendering Function (Adapted from Standalone) ---
        function renderCore() {
            console.log("--- renderCore ---");
            try {
                viewer.removeAllModels(); // Clear models
                viewer.removeAllShapes(); // Clear shapes (like cell lines)
                atomLabels.forEach(label => viewer.removeLabel(label)); atomLabels = []; // Clear labels
                if (cellLabel) { viewer.removeLabel(cellLabel); cellLabel = null; }

                if (!currentAtoms || currentAtoms.length === 0) {
                    console.warn("renderCore: No atoms to render.");
                    viewer.render(); // Render empty scene
                    return;
                }

                // Add atoms using addModel/addAtoms (as in standalone)
                let model = viewer.addModel();
                model.addAtoms(currentAtoms); // Add the raw atom data
                console.log("renderCore: Added atoms to model.");

                // Apply styles (using definitions from standalone)
                let style = {};
                const baseStickRadius = 0.1;
                const ballScale = 0.35;
                const stickModeAtomScale = 0.05; // Very small spheres for stick nodes
                const colorScheme = { prop: 'elem', map: atomColors }; // Use uppercase map

                switch (currentViewStyle) {
                  case "stick":
                    style = {
                      stick: { radius: baseStickRadius, colorscheme: colorScheme },
                      sphere: { scale: stickModeAtomScale, colorscheme: colorScheme } // Keep tiny spheres at nodes
                    }; break;
                  case "ballAndStick":
                    style = {
                      stick: { radius: baseStickRadius, colorscheme: colorScheme },
                      sphere: { scale: ballScale, colorscheme: colorScheme }
                    }; break;
                  case "spacefill":
                  default: // Fallback to spacefill
                    style = { sphere: { colorscheme: colorScheme } }; break;
                }
                viewer.setStyle({}, style);
                console.log(`renderCore: Applied style "${currentViewStyle}"`);

                // Re-add cell and labels if needed
                if (cellShown) drawUnitCellOutline();
                if (labelsShown) addAtomLabels();

                // Set clickable after adding model and styles
                viewer.setClickable({}, true, (atom, vwr) => {
                    console.log("Clicked atom data:", atom); // Log 3Dmol atom object
                    vwr.removeAllLabels(); // Clear previous click/hover labels
                    vwr.addLabel(`Atom ${atom.serial + 1}: ${atom.elem}`, { // atom.serial is 0-based index
                        position: { x: atom.x, y: atom.y, z: atom.z },
                        backgroundColor: 'lightyellow', backgroundOpacity: 0.8, borderColor: 'black', borderWidth: 0.2, fontSize: 10
                    });
                    setTimeout(() => vwr.removeAllLabels(), 2000);
                 });


                viewer.zoomTo();
                viewer.render();
                console.log("renderCore: Completed and rendered.");

            } catch (e) {
                console.error("!!! Error during renderCore:", e);
                displayViewerError("Error during core rendering.");
            }
        } // --- END renderCore ---


        // --- Function to Regenerate Atoms AND Render (Adapted) ---
        function regenerateAndRender() {
            console.log("--- regenerateAndRender ---");
            const compositionSlider = document.getElementById(`${controlsElementId}-composition`);
            const compValueDisplay = document.getElementById(`${controlsElementId}-composition-value`);
            let cdRatio = parseFloat(compositionSlider.value);
            currentComposition = cdRatio; // Update state
            if (compValueDisplay) compValueDisplay.textContent = `x = ${cdRatio.toFixed(2)}`;

            // Generate new atom data based on current composition and supercell
            currentAtoms = generateAtomData(currentComposition, currentSupercell);

            // Call the core rendering function
            renderCore();
        }

        // --- Function to Update View Options AND Render (Adapted) ---
        function redrawView() {
            console.log("--- redrawView (calls renderCore) ---");
            // This function just triggers a re-render with existing atoms
            // It's called when style, labels, or cell visibility changes
            renderCore();
        }


        // --- Event Listeners Setup (Adapted - Plain JS) ---
        function setupButtonListener(idSuffix, callback) { const button = document.getElementById(`${controlsElementId}-${idSuffix}`); if(button) button.addEventListener("click", callback); else console.warn(`Button ${controlsElementId}-${idSuffix} not found.`); }
        function updateActiveButtons(clickedButton, buttonGroupSelector) { const buttonGroup = clickedButton.closest(buttonGroupSelector); if (!buttonGroup) { console.warn("Could not find button group:", buttonGroupSelector); return; } buttonGroup.querySelectorAll('button').forEach(btn => btn.classList.remove('active')); clickedButton.classList.add('active'); }

        // Comp Slider
        const compSlider = document.getElementById(`${controlsElementId}-composition`);
        if (compSlider) { compSlider.addEventListener("input", regenerateAndRender); } // Regenerate atoms on slider change

        // Style Buttons
        controlsElement.querySelectorAll('.viz-controls button').forEach(button => {
            button.addEventListener('click', function() {
                if (currentViewStyle !== this.dataset.style) { // Prevent redraw if style hasn't changed
                    currentViewStyle = this.dataset.style;
                    updateActiveButtons(this, '.viz-controls');
                    redrawView(); // Only redraw scene, don't regenerate atoms
                }
            });
        });

        // Cell Buttons
        setupButtonListener("btn-show-cell", () => {
            if (!cellShown) {
                cellShown = true; updateActiveButtons(document.getElementById(`${controlsElementId}-btn-show-cell`), '.cell-controls');
                redrawView(); // Redraw to show cell
            }
        });
        setupButtonListener("btn-hide-cell", () => {
            if (cellShown) {
                cellShown = false; updateActiveButtons(document.getElementById(`${controlsElementId}-btn-hide-cell`), '.cell-controls');
                redrawView(); // Redraw to hide cell
            }
        });

        // Supercell Buttons
        controlsElement.querySelectorAll('.supercell-controls button').forEach(button => {
            button.addEventListener('click', function() {
                 const newSize = parseInt(this.dataset.size);
                 if (currentSupercell !== newSize) { // Prevent redraw if size hasn't changed
                     currentSupercell = newSize;
                     updateActiveButtons(this, '.supercell-controls');
                     regenerateAndRender(); // Regenerate atoms for new supercell size
                 }
            });
        });

        // Label Buttons (Added)
        setupButtonListener("btn-show-labels", () => {
             if (!labelsShown) {
                 labelsShown = true; updateActiveButtons(document.getElementById(`${controlsElementId}-btn-show-labels`), '.label-controls'); // Assuming .label-controls class on parent div
                 redrawView();
             }
        });
         setupButtonListener("btn-hide-labels", () => {
             if (labelsShown) {
                 labelsShown = false; updateActiveButtons(document.getElementById(`${controlsElementId}-btn-hide-labels`), '.label-controls');
                 redrawView();
             }
         });


        // Action Buttons
        setupButtonListener("btn-spin", () => viewer.spin(true));
        setupButtonListener("btn-stop", () => viewer.spin(false));
        setupButtonListener("btn-screenshot", function() { /* ... same screenshot logic ... */
            let imageData = viewer.pngURI(); let link = document.createElement('a'); const safeMaterialName = allMaterialDetails.materialName.replace(/ /g, '_').toLowerCase(); let compString = (vizData.composition.min_x !== vizData.composition.max_x) ? `_x${currentComposition.toFixed(2)}` : ""; link.download = `${safeMaterialName}_${vizData.structure_type}${compString}_${currentSupercell}x${currentSupercell}x${currentSupercell}.png`; link.href = imageData; document.body.appendChild(link); link.click(); document.body.removeChild(link);
        });

        // Add resize handler
        // Note: viewer.resize() might need to be debounced for performance on frequent resize events
        let resizeTimeout;
        window.addEventListener('resize', () => {
             clearTimeout(resizeTimeout);
             resizeTimeout = setTimeout(() => {
                 if (viewer) viewer.resize();
                 console.log("Viewer resized.");
             }, 150); // Debounce resize for 150ms
        });

        // --- Initial Setup ---
        // Set initial active buttons based on default state variables
        updateActiveButtons(document.getElementById(`${controlsElementId}-btn-ball-stick`), '.viz-controls');
        updateActiveButtons(document.getElementById(`${controlsElementId}-btn-1x1x1`), '.supercell-controls');
        updateActiveButtons(document.getElementById(`${controlsElementId}-btn-hide-cell`), '.cell-controls');
        // updateActiveButtons(document.getElementById(`${controlsElementId}-btn-hide-labels`), '.label-controls'); // Assuming labels are initially hidden

        // --- Initial Render ---
        regenerateAndRender(); // Generate initial atoms and render the scene

    } // --- END initialize3DViewer FUNCTION ---


}); // End DOMContentLoaded
