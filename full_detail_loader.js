// --- START OF FILE full_detail_loader.js ---

document.addEventListener("DOMContentLoaded", async () => {
    // ... (Keep existing code from top down to initialize3DViewer call) ...

    // --- Helper Function to Render a Single Property Block ---
    function renderPropertyBlock(propKey, propData, allDetails, parentContainer) {
        // ... (Keep the existing renderPropertyBlock code - no changes needed here) ...
         const propBlock = document.createElement('div');
        propBlock.className = 'property-detail-block';
        propBlock.id = `prop-${propKey}`;

        const propTitle = document.createElement('h3');
        propTitle.innerHTML = propData.displayName || propKey.replace(/_/g, ' ');
        propBlock.appendChild(propTitle);

        if (propData.summary) {
            const summaryEl = document.createElement('div');
            summaryEl.className = 'summary';
            summaryEl.innerHTML = propData.summary;
            propBlock.appendChild(summaryEl);
        }

        if (propKey === 'crystal_structure' && propData.details && propData.details.visualization_data) {
            const vizData = propData.details.visualization_data;
            const viewerContainerId = vizData.container_id || `viewer-container-${propKey}-${Date.now()}`;
            const viewerWrapper = document.createElement('div');
            viewerWrapper.className = 'crystal-viewer-wrapper';
            const viewerHeight = vizData.viewer_height || '450px';
            viewerWrapper.style.setProperty('--viewer-height', viewerHeight);

            viewerWrapper.innerHTML = `
                <div id="${viewerContainerId}" class="crystal-viewer-container">
                    <div id="${viewerContainerId}-viewer" class="viewer-area">
                        <p style="padding:20px; color:#888; text-align:center;">Loading 3D Viewer...</p>
                    </div>
                    <div id="${viewerContainerId}-controls" class="viewer-controls">
                         <p style="padding:10px; color:#888;">Loading Controls...</p>
                    </div>
                </div>
            `;
            propBlock.appendChild(viewerWrapper);

            requestAnimationFrame(() => {
                 if (typeof $3Dmol === 'undefined') {
                     console.error("3Dmol.js library not loaded!");
                      const viewerArea = document.getElementById(`${viewerContainerId}-viewer`);
                      if(viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Error: 3Dmol.js library failed to load. Cannot display viewer.</p>`;
                      const controlsArea = document.getElementById(`${viewerContainerId}-controls`);
                      if(controlsArea) controlsArea.innerHTML = '';
                     return;
                 }

                 if (typeof initialize3DViewer === 'function') {
                    try {
                         initialize3DViewer(
                             `${viewerContainerId}-viewer`,
                             `${viewerContainerId}-controls`,
                             vizData,
                             allDetails
                         );
                     } catch(e) {
                        console.error("Error initializing 3D viewer:", e);
                         const viewerArea = document.getElementById(`${viewerContainerId}-viewer`);
                         if (viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Could not load interactive 3D viewer. Check console for details.</p>`;
                         const controlsArea = document.getElementById(`${viewerContainerId}-controls`);
                         if(controlsArea) controlsArea.innerHTML = '';
                     }
                 } else {
                     console.error("initialize3DViewer function not found!");
                     const viewerArea = document.getElementById(`${viewerContainerId}-viewer`);
                     if(viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Error: Viewer initialization script missing or failed.</p>`;
                     const controlsArea = document.getElementById(`${viewerContainerId}-controls`);
                     if(controlsArea) controlsArea.innerHTML = '';
                 }
            });
        }


        if (propData.details && typeof propData.details === 'object') {
             for (const [detailKey, detailContent] of Object.entries(propData.details)) {
                 if (detailKey === 'visualization_data') continue;
                 if (!detailContent || (Array.isArray(detailContent) && detailContent.length === 0) || (typeof detailContent === 'object' && !Array.isArray(detailContent) && Object.keys(detailContent).length === 0) ) continue;

                 const subsection = document.createElement('div');
                 subsection.className = `detail-subsection ${detailKey.replace(/ /g, '_').toLowerCase()}`;
                 const subsectionTitle = document.createElement('h4');
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
                         if (eq.variables && Array.isArray(eq.variables)) {
                             const varsDiv = document.createElement('div'); varsDiv.className = 'eq-vars'; varsDiv.innerHTML = '<strong>Variables:</strong>'; const varsUl = document.createElement('ul');
                             eq.variables.forEach(v => { const li = document.createElement('li'); li.innerHTML = `<strong>${v.symbol}:</strong> ${v.description}`; varsUl.appendChild(li); });
                             varsDiv.appendChild(varsUl); eqBlock.appendChild(varsDiv); }
                         if (eq.ref && allDetails.references && allDetails.references[eq.ref]) {
                             const refEl = document.createElement('div'); refEl.className = 'eq-ref';
                             refEl.innerHTML = `Ref: <a href="#ref-${eq.ref}" class="ref-link" data-ref-key="${eq.ref}">[${eq.ref}]</a>`;
                             eqBlock.appendChild(refEl); }
                         subsection.appendChild(eqBlock); });
                 } else if (detailKey === 'measurement_characterization' && typeof detailContent === 'object') {
                     if(detailContent.techniques && Array.isArray(detailContent.techniques) && detailContent.techniques.length > 0){
                         const techDiv = document.createElement('div'); techDiv.className = "techniques"; const ulTech = document.createElement('ul');
                         detailContent.techniques.forEach(tech => { const li = document.createElement('li'); li.innerHTML = tech; ulTech.appendChild(li); });
                         techDiv.appendChild(ulTech); subsection.appendChild(techDiv); }
                     if(detailContent.considerations && Array.isArray(detailContent.considerations) && detailContent.considerations.length > 0){
                         const considDiv = document.createElement('div'); considDiv.className = "considerations";
                         if (subsection.querySelector('.techniques')) {
                              const considTitle = document.createElement('p'); considTitle.innerHTML = '<strong>Considerations:</strong>'; considTitle.style.cssText = 'margin-top: 1rem; margin-bottom: 0.25rem;';
                              considDiv.appendChild(considTitle); }
                         const ulConsid = document.createElement('ul');
                         detailContent.considerations.forEach(note => { const li = document.createElement('li'); li.innerHTML = note; ulConsid.appendChild(li); });
                         considDiv.appendChild(ulConsid); subsection.appendChild(considDiv); }
                 } else if (typeof detailContent === 'string') {
                      const p = document.createElement('p'); p.innerHTML = detailContent; subsection.appendChild(p);
                 } else {
                      console.warn(`Unhandled detail structure for key '${detailKey}' in property '${propKey}'`, detailContent);
                      const pre = document.createElement('pre'); pre.textContent = JSON.stringify(detailContent, null, 2);
                      pre.style.cssText = 'font-size: 0.8em; background-color: #eee; padding: 5px; border-radius: 3px; overflow-x: auto; margin-left: 0.5rem;';
                      subsection.appendChild(pre);
                 }

                 if(subsection.children.length > 1) {
                     propBlock.appendChild(subsection);
                 }
             }
        }
        return propBlock;
    } // --- End renderPropertyBlock ---

    // Function to handle reference link clicks
    function handleRefLinkClick(event) { /* ... same as previous version ... */
        const link = event.target.closest('a.ref-link[data-ref-key]');
        if (link) {
            event.preventDefault();
            const targetId = `ref-${link.dataset.refKey}`;
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                 const elementRect = targetElement.getBoundingClientRect();
                 const absoluteElementTop = elementRect.top + window.pageYOffset;
                 const headerOffset = 60;
                 const viewportHeight = window.innerHeight;
                 const desiredScrollPos = absoluteElementTop - (viewportHeight * 0.3) - headerOffset;
                 window.scrollTo({ top: Math.max(0, desiredScrollPos), behavior: 'smooth' });
                 document.querySelectorAll('#references-list li.highlight-ref').forEach(el => el.classList.remove('highlight-ref'));
                 targetElement.classList.add('highlight-ref');
                 setTimeout(() => targetElement.classList.remove('highlight-ref'), 2500);
            } else { console.warn(`Reference target element with ID '${targetId}' not found.`); }
        }
    } // --- End handleRefLinkClick ---


    // --- Initialize 3D Viewer Function (REVISED) ---
    function initialize3DViewer(viewerElementId, controlsElementId, vizData, allMaterialDetails) {
        console.log("--- Initializing 3D Viewer ---");
        console.log("Viewer Element ID:", viewerElementId);
        console.log("Controls Element ID:", controlsElementId);

        const viewerElement = document.getElementById(viewerElementId);
        const controlsElement = document.getElementById(controlsElementId);

        if (!viewerElement || !controlsElement) { console.error("Viewer or controls element not found"); return; }
        viewerElement.innerHTML = ''; // Clear loading message
        controlsElement.innerHTML = ''; // Clear loading message

        // --- Populate Controls HTML (Keep the same structure) ---
        controlsElement.innerHTML = `
            <h4>Controls</h4>
            <div class="control-group" id="${controlsElementId}-composition-group">
                <label class="control-title" for="${controlsElementId}-composition">Composition (${vizData.composition.variable_element} fraction 'x')</label>
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
                <button id="${controlsElementId}-btn-hide-cell">Hide Cell</button>
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
        `; // Added data attributes for easier handling

        if (vizData.composition.min_x === vizData.composition.max_x) {
            const compGroup = document.getElementById(`${controlsElementId}-composition-group`);
            if(compGroup) compGroup.style.display = 'none';
            const compInfo = document.getElementById(`${controlsElementId}-composition-info`);
            if(compInfo) compInfo.style.display = 'none';
        }

        // --- 3Dmol.js Initialization ---
        let viewer;
        try {
            viewer = $3Dmol.createViewer(viewerElement, { /* ऑप्शन्स */
                backgroundColor: "white",
                antialias: true,
                hoverable: true
            });
            console.log("3Dmol viewer created.");
        } catch (e) { /* एरर हैंडलिंग */
            console.error("Error creating 3Dmol viewer:", e);
            displayViewerError("Failed to create 3D viewer instance.");
            return;
        }

        // --- State and Constants ---
        let cellShown = false;
        let currentViewStyle = "ballAndStick";
        let currentSupercell = 1;
        let currentComposition = vizData.composition.initial_x;
        const atomInfo = vizData.atom_info;
        const atomColors = {}; // Use uppercase keys {HG: color, CD: color, TE: color}
        const atomRadii = {};  // {HG: radius, CD: radius, TE: radius}

        // --- Info Panel & Legend Elements ---
        const latticeInfoEl = document.getElementById(`${controlsElementId}-lattice-info`);
        const compositionInfoEl = document.getElementById(`${controlsElementId}-composition-info`);
        const legendEl = document.getElementById(`${controlsElementId}-legend`);
        const compValueEl = document.getElementById(`${controlsElementId}-composition-value`);

        // ** REVISED Legend Population - Ensure all atoms are processed **
        legendEl.innerHTML = ''; // Clear first
        console.log("Populating legend with atomInfo:", atomInfo);
        if (atomInfo && typeof atomInfo === 'object') {
            Object.entries(atomInfo).forEach(([symbol, info]) => {
                console.log(`Processing legend for symbol: ${symbol}`); // Debug log
                const upperSymbol = symbol.toUpperCase();
                atomColors[upperSymbol] = info.color || '#CCCCCC';
                atomRadii[upperSymbol] = info.radius || 1.0;
                const legendItem = document.createElement('div');
                legendItem.className = 'legend';
                // Ensure background color is applied correctly
                legendItem.innerHTML = `<div class="legend-color" style="background-color:${atomColors[upperSymbol]};"></div><div>${symbol}</div>`;
                legendEl.appendChild(legendItem);
            });
        } else {
             console.error("vizData.atom_info is missing or not an object!");
        }
        console.log("Atom Colors Map:", atomColors);

        // --- Structure Generation (No changes here) ---
        function getLatticeConstant(compositionRatio) { /* ... */
             if (vizData.structure_type === 'zincblende_alloy' && vizData.lattice_constants.HgTe && vizData.lattice_constants.CdTe) {
                 return vizData.lattice_constants.HgTe * (1 - compositionRatio) + vizData.lattice_constants.CdTe * compositionRatio;
             } else if (vizData.lattice_constants.a) { return vizData.lattice_constants.a; }
             console.warn("Cannot determine lattice constant."); return 6.0;
        }
        function generateAtomArray(compositionRatio, cellSize) { /* ... */
            const latticeConstant = getLatticeConstant(compositionRatio);
            let atoms = [];
            const anion = Object.keys(atomInfo).find(key => atomInfo[key].role === 'anion');
            const cation_host = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_host');
            const cation_subst = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_subst');
            if (vizData.structure_type === 'zincblende_alloy') {
                 if (!anion || !cation_host || !cation_subst) { console.error("Atom roles missing for zincblende_alloy"); return null; }
                const cationPositions = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
                const anionPositions = [[0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]];
                for (let i = 0; i < cellSize; i++) { for (let j = 0; j < cellSize; j++) { for (let k = 0; k < cellSize; k++) {
                    cationPositions.forEach(pos => {
                        let elemType = Math.random() < compositionRatio ? cation_subst : cation_host;
                        atoms.push({ elem: elemType, x: (pos[0] + i) * latticeConstant, y: (pos[1] + j) * latticeConstant, z: (pos[2] + k) * latticeConstant });
                    });
                    anionPositions.forEach(pos => {
                        atoms.push({ elem: anion, x: (pos[0] + i) * latticeConstant, y: (pos[1] + j) * latticeConstant, z: (pos[2] + k) * latticeConstant });
                    });
                }}}
            } else { console.error("Unsupported structure_type:", vizData.structure_type); return null; }
            if(latticeInfoEl) latticeInfoEl.textContent = `Lattice: a ≈ ${latticeConstant.toFixed(3)} Å`;
            if(compositionInfoEl && vizData.composition.formula_template && vizData.composition.min_x !== vizData.composition.max_x) {
                 compositionInfoEl.innerHTML = `Composition: ${vizData.composition.formula_template.replace('{x}', compositionRatio.toFixed(2)).replace('{1-x}', (1 - compositionRatio).toFixed(2))}`;
            } else if (compositionInfoEl && vizData.composition.formula_template) {
                 compositionInfoEl.innerHTML = `Formula: ${vizData.composition.formula_template.replace(/{1-x}/g,'').replace(/{x}/g,'')}`;
            } else if (compositionInfoEl) { compositionInfoEl.textContent = `Composition: x = ${compositionRatio.toFixed(2)}`; }
            return atoms;
        }

        // --- PDB Conversion (Use robust version) ---
         function atomsToPDB(atoms) { /* ... same robust version ... */
            let pdb = "";
            atoms.forEach((atom, index) => {
                const serial = (index + 1).toString().padStart(5);
                let elementSymbol = atom.elem.substring(0, 2).toUpperCase();
                let atomName = elementSymbol.padEnd(4);
                const resName = "MOL"; const chainID = "A"; const resSeq = "1".padStart(4); const iCode = " ";
                const x = atom.x.toFixed(3).padStart(8); const y = atom.y.toFixed(3).padStart(8); const z = atom.z.toFixed(3).padStart(8);
                const occupancy = "1.00".padStart(6); const tempFactor = "0.00".padStart(6);
                const elementPDB = elementSymbol.padStart(2);
                pdb += `ATOM  ${serial} ${atomName} ${resName} ${chainID}${resSeq}${iCode}   ${x}${y}${z}${occupancy}${tempFactor}          ${elementPDB}  \n`;
            });
             pdb += generatePDBConnectivity(atoms);
             pdb += "END\n";
            return pdb;
        }
        function generatePDBConnectivity(atoms) { /* ... same robust version ... */
            let conectRecords = "";
            const bondCutoffSq = (vizData.bond_cutoff || 3.0) ** 2; const maxConnect = 4;
            for (let i = 0; i < atoms.length; i++) {
                let bonds = [];
                for (let j = 0; j < atoms.length; j++) {
                    if (i === j) continue;
                    const dx = atoms[i].x - atoms[j].x; const dy = atoms[i].y - atoms[j].y; const dz = atoms[i].z - atoms[j].z;
                    const distSq = dx*dx + dy*dy + dz*dz;
                    if (distSq > 0.01 && distSq < bondCutoffSq) { bonds.push(j + 1); }
                }
                if (bonds.length > 0) {
                    for (let k = 0; k < bonds.length; k += maxConnect) {
                        conectRecords += `CONECT${(i + 1).toString().padStart(5)}`;
                        const slice = bonds.slice(k, k + maxConnect);
                        slice.forEach(bondSerial => { conectRecords += bondSerial.toString().padStart(5); });
                        conectRecords += "\n";
                    }
                }
            } return conectRecords;
        }

        // --- Viewer Display Functions ---
         function displayViewerError(message) { /* ... same ... */
            viewerElement.innerHTML = `<p class="error-message" style="padding: 20px; text-align: center;">${message}</p>`;
         }
         function drawUnitCellShape(cellSize) { /* ... same ... */
            try {
                // Note: removeAllShapes is called in renderStructure, no need to remove here
                const currentLatConst = getLatticeConstant(currentComposition);
                const cellLength = currentLatConst * cellSize;
                console.log(`Drawing unit cell shape: size=${cellSize}, length=${cellLength}`); // Debug log
                viewer.addUnitCell({
                    box: {a: cellLength, b: cellLength, c: cellLength, alpha: 90, beta: 90, gamma: 90},
                    origin: {x:0, y:0, z:0}, color: "#555555", lineWidth: 1.5
                }); // Let 3Dmol handle adding the shape, ID is implicitly managed?
            } catch(e) { console.error("Error drawing unit cell:", e); }
         }

        // --- Main Render Function (Using removeAllShapes) ---
        function renderStructure() {
            console.log(`--- Rendering Structure: Style=${currentViewStyle}, Supercell=${currentSupercell}, Comp=${currentComposition.toFixed(2)} ---`);
            try {
                viewer.removeAllModels();
                viewer.removeAllShapes(); // Clear previous cell/shapes

                const atoms = generateAtomArray(currentComposition, currentSupercell);
                if (!atoms) { console.error("Atom generation failed."); return; }
                if (atoms.length === 0) { console.warn("Generated 0 atoms."); displayViewerError("No atoms generated for current parameters."); return; }

                const pdbData = atomsToPDB(atoms);
                 if (!pdbData || pdbData.trim() === "END" || pdbData.trim() === "") {
                     console.error("PDB data generation failed or empty."); displayViewerError("Failed to generate structure data (PDB)."); return;
                 }

                 viewer.addModel(pdbData, "pdb");
                 console.log("Model added from PDB data.");

                 // Apply styles - Ensure atomColors keys are uppercase
                 const styleColors = {};
                 Object.keys(atomColors).forEach(key => styleColors[key] = atomColors[key]); // Use the uppercase map

                 if (currentViewStyle === "stick") {
                     viewer.setStyle({}, { stick: { radius: 0.12, colorscheme: { prop: 'elem', map: styleColors } } });
                 } else if (currentViewStyle === "ballAndStick") {
                      viewer.setStyle({}, {
                          sphere: { scale: 0.35, colorscheme: { prop: 'elem', map: styleColors } },
                          stick: { radius: 0.1, colorscheme: { prop: 'elem', map: styleColors } }
                      });
                 } else if (currentViewStyle === "spacefill") {
                      viewer.setStyle({}, { sphere: { colorscheme: { prop: 'elem', map: styleColors } } });
                 }
                 console.log(`Style applied: ${currentViewStyle}`);

                // Re-draw cell if enabled
                if (cellShown) {
                    console.log("Cell is shown, calling drawUnitCellShape."); // Debug log
                    drawUnitCellShape(currentSupercell);
                } else {
                     console.log("Cell is hidden."); // Debug log
                }

                // Set clickable
                 viewer.setClickable({}, true, (atom, vwr) => { /* ... same click handler ... */
                     console.log("Clicked atom data:", atom);
                     vwr.removeAllLabels(); // Clear previous click labels
                     vwr.addLabel(`Atom ${atom.serial}: ${atom.elem}`, { position: { x: atom.x, y: atom.y, z: atom.z }, backgroundColor: 'lightyellow', backgroundOpacity: 0.8, borderColor: 'black', borderWidth: 0.2, fontSize: 10 });
                     setTimeout(() => vwr.removeAllLabels(), 2000); // Auto-remove after 2s
                 });

                viewer.zoomTo();
                viewer.render();
                console.log("Structure rendered and zoomed.");

            } catch (e) {
                console.error("!!! Error during renderStructure:", e);
                displayViewerError("An error occurred while rendering the structure.");
            }
        } // --- END RENDER STRUCTURE ---


        // --- Event Listeners Setup (REVISED Button Handling) ---
        function setupButtonListener(idSuffix, callback) {
             const button = document.getElementById(`${controlsElementId}-${idSuffix}`);
             if(button) { button.addEventListener("click", callback); } else { console.warn(`Button ${controlsElementId}-${idSuffix} not found.`); }
        }

        // ** REVISED Button Active State Handler **
        function updateActiveButtons(clickedButton, buttonGroupSelector) {
            // Find the group containing the clicked button
             const buttonGroup = clickedButton.closest(buttonGroupSelector);
             if (!buttonGroup) {
                 console.warn("Could not find button group for selector:", buttonGroupSelector);
                 return;
             }
             // Remove active class from all buttons within that specific group
             buttonGroup.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
             // Add active class to the actually clicked button
             clickedButton.classList.add('active');
         }

        // Comp Slider
        const compSlider = document.getElementById(`${controlsElementId}-composition`);
        if (compSlider) { compSlider.addEventListener("input", function() { currentComposition = parseFloat(this.value); if(compValueEl) compValueEl.textContent = `x = ${currentComposition.toFixed(2)}`; renderStructure(); }); }

        // Style Buttons - Use direct event listeners and updateActiveButtons
        controlsElement.querySelectorAll('.viz-controls button').forEach(button => {
            button.addEventListener('click', function() {
                currentViewStyle = this.dataset.style; // Get style from data attribute
                updateActiveButtons(this, '.viz-controls'); // Update within this group
                renderStructure();
            });
        });

        // Cell Buttons
        setupButtonListener("btn-show-cell", () => {
            console.log("Show Cell clicked. Current state:", cellShown); // Debug log
            if (!cellShown) {
                cellShown = true;
                console.log("Setting cellShown = true, drawing cell.");
                drawUnitCellShape(currentSupercell); // Draw the cell
                viewer.render(); // Render the change
            } else {
                console.log("Cell already shown.");
            }
        });
        setupButtonListener("btn-hide-cell", () => {
            console.log("Hide Cell clicked. Current state:", cellShown); // Debug log
            if (cellShown) {
                cellShown = false;
                console.log("Setting cellShown = false, removing shapes.");
                viewer.removeAllShapes(); // Remove the cell shape
                viewer.render(); // Render the change
            } else {
                 console.log("Cell already hidden.");
            }
        });

        // Supercell Buttons - Use direct event listeners
        controlsElement.querySelectorAll('.supercell-controls button').forEach(button => {
            button.addEventListener('click', function() {
                 currentSupercell = parseInt(this.dataset.size); // Get size from data attribute
                 updateActiveButtons(this, '.supercell-controls'); // Update within this group
                 renderStructure();
            });
        });

        // Action Buttons
        setupButtonListener("btn-spin", () => viewer.spin(true));
        setupButtonListener("btn-stop", () => viewer.spin(false));
        setupButtonListener("btn-screenshot", function() { /* ... same screenshot logic ... */
            let imageData = viewer.pngURI(); let link = document.createElement('a'); const safeMaterialName = allMaterialDetails.materialName.replace(/ /g, '_').toLowerCase(); let compString = (vizData.composition.min_x !== vizData.composition.max_x) ? `_x${currentComposition.toFixed(2)}` : ""; link.download = `${safeMaterialName}_${vizData.structure_type}${compString}_${currentSupercell}x${currentSupercell}x${currentSupercell}.png`; link.href = imageData; document.body.appendChild(link); link.click(); document.body.removeChild(link);
        });

        // --- Initial Render ---
        renderStructure();

    } // --- END initialize3DViewer FUNCTION ---


}); // End DOMContentLoaded
