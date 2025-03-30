// --- START OF FILE full_detail_loader.js ---

document.addEventListener("DOMContentLoaded", async () => {
    // --- Get parameters from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");

    // --- Get DOM elements ---
    const materialNameEl = document.getElementById("material-name");
    const tocListEl = document.getElementById("toc-list");
    const mainContentEl = document.getElementById("main-content");
    const referencesSectionEl = document.getElementById("references-section");
    const referencesListEl = document.getElementById("references-list");

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
        displayError("Material name missing from URL parameters.");
        return;
    }
    const materialName = decodeURIComponent(materialNameParam);

    // --- Update Title Bar ---
    if (materialNameEl) materialNameEl.textContent = materialName;
    document.title = `${materialName} - Full Details`;

    // --- Construct file path ---
    const safeMaterialName = materialName.replace(/ /g, '_').toLowerCase();
    const detailFilePath = `./details/${safeMaterialName}_details.json`;

    console.log(`[Full Detail] Loading all details for material '${materialName}' from '${detailFilePath}'`);

    // --- Fetch and Process Data ---
    try {
        const response = await fetch(detailFilePath);
        if (!response.ok) {
            if (response.status === 404) { throw new Error(`Details file not found: ${detailFilePath}.`); }
            else { throw new Error(`HTTP error ${response.status} fetching ${detailFilePath}`); }
        }

        const materialDetails = await response.json(); // This line would fail if JSON was invalid
        const sectionDataMap = new Map();

        // --- Process References ---
        const collectedRefs = new Set();
        const processRefs = (data) => {
             if (typeof data === 'object' && data !== null) {
                 if (data.ref && materialDetails.references && materialDetails.references[data.ref]) { collectedRefs.add(data.ref); }
                 Object.values(data).forEach(value => {
                     if (typeof value === 'object' || Array.isArray(value)) {
                         processRefs(value);
                     }
                 });
             } else if (Array.isArray(data)) {
                 data.forEach(processRefs);
             }
        };
        processRefs(materialDetails);

        // --- Build Table of Contents & Store Section Data ---
        if (tocListEl && mainContentEl) {
            tocListEl.innerHTML = '';
            for (const sectionKey in materialDetails) {
                if (sectionKey === 'materialName' || sectionKey === 'references') continue;
                const sectionData = materialDetails[sectionKey];
                if (typeof sectionData !== 'object' || sectionData === null || !sectionData.properties) continue;

                sectionDataMap.set(sectionKey, sectionData);

                const sectionDisplayName = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const sectionId = `section-${sectionKey}`;

                const tocLi = document.createElement('li');
                const tocLink = document.createElement('a');
                tocLink.href = `#${sectionId}`;
                tocLink.textContent = sectionDisplayName;
                tocLi.appendChild(tocLink);
                tocListEl.appendChild(tocLi);
            }
        }

        // --- Populate Sections from Stored Data ---
        for (const [sectionKey, sectionData] of sectionDataMap.entries()) {
             const sectionId = `section-${sectionKey}`;
             const sectionElement = document.getElementById(sectionId);
             if (!sectionElement) { console.warn(`HTML section placeholder '${sectionId}' not found.`); continue; }

             const sectionTitleEl = document.getElementById(`${sectionId}-title`);
             const sectionIntroEl = document.getElementById(`${sectionId}-intro`);
             const propertiesContainerEl = document.getElementById(`${sectionId}-properties`);

             if(sectionTitleEl) sectionTitleEl.textContent = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

             if (sectionIntroEl) {
                 if (sectionData.introduction) {
                    sectionIntroEl.innerHTML = sectionData.introduction;
                    sectionIntroEl.style.display = 'block';
                 } else {
                     sectionIntroEl.style.display = 'none';
                     sectionIntroEl.innerHTML = '';
                 }
             }

             if (propertiesContainerEl && sectionData.properties && typeof sectionData.properties === 'object') {
                 propertiesContainerEl.innerHTML = '';
                 Object.entries(sectionData.properties).forEach(([propKey, propData]) => {
                     const propertyBlockElement = renderPropertyBlock(propKey, propData, materialDetails, propertiesContainerEl);
                     if (propertyBlockElement) { propertiesContainerEl.appendChild(propertyBlockElement); }
                 });
                 propertiesContainerEl.style.display = 'block';
             } else if (propertiesContainerEl) {
                 propertiesContainerEl.style.display = 'none';
             }
             sectionElement.style.display = 'block';
        }

        // --- Populate References ---
        if (collectedRefs.size > 0 && referencesListEl && materialDetails.references) {
             referencesListEl.innerHTML = '';
             const sortedRefs = Array.from(collectedRefs).sort();

             sortedRefs.forEach(refKey => {
                 const refData = materialDetails.references[refKey];
                 if(refData){
                     const li = document.createElement('li'); li.id = `ref-${refKey}`;
                     let linkHtml = refData.text;
                     if(refData.doi){ linkHtml += ` <a href="https://doi.org/${refData.doi}" target="_blank" rel="noopener noreferrer" title="View via DOI">[DOI]</a>`; }
                     li.innerHTML = `<strong>[${refKey}]</strong> ${linkHtml}`;
                     referencesListEl.appendChild(li);
                 } else {
                     console.warn(`Reference key '${refKey}' found in data but not defined in references section.`);
                 }
             });
             referencesSectionEl.style.display = 'block';
             mainContentEl.addEventListener('click', handleRefLinkClick);
        } else if(referencesSectionEl){
             referencesSectionEl.style.display = 'none';
        }

    } catch (error) {
        if (error instanceof SyntaxError && error.message.includes("JSON")) {
             displayError(`Failed to parse details file. Check for invalid JSON format (e.g., comments, trailing commas). Error: ${error.message}`);
        } else {
             displayError(error.message || "An unknown error occurred loading material details.");
        }
        console.error(error);
    }

    // --- Helper Function to Render a Single Property Block ---
    function renderPropertyBlock(propKey, propData, allDetails, parentContainer) {
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
                      if(viewerArea){
                           viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Error: 3Dmol.js library failed to load. Cannot display viewer.</p>`;
                      }
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
                         if (viewerArea) {
                              viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Could not load interactive 3D viewer. Check console for details.</p>`;
                         }
                         const controlsArea = document.getElementById(`${viewerContainerId}-controls`);
                         if(controlsArea) controlsArea.innerHTML = '';
                     }
                 } else {
                     console.error("initialize3DViewer function not found!");
                     const viewerArea = document.getElementById(`${viewerContainerId}-viewer`);
                     if(viewerArea){
                           viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Error: Viewer initialization script missing or failed.</p>`;
                     }
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
                     detailContent.forEach(item => {
                         const li = document.createElement('li');
                         li.innerHTML = item;
                         ul.appendChild(li);
                        });
                     subsection.appendChild(ul);
                 } else if (detailKey === 'equations' && Array.isArray(detailContent)) {
                      detailContent.forEach(eq => {
                         const eqBlock = document.createElement('div'); eqBlock.className = 'equation-block';
                         if (eq.name) { const nameEl = document.createElement('span'); nameEl.className = 'eq-name'; nameEl.textContent = eq.name; eqBlock.appendChild(nameEl); }
                         if (eq.description) { const descEl = document.createElement('p'); descEl.className = 'eq-desc'; descEl.innerHTML = eq.description; eqBlock.appendChild(descEl); }

                         const formulaContainer = document.createElement('div');
                         formulaContainer.className = 'eq-formula-container';
                         if (eq.formula_html) {
                             formulaContainer.innerHTML = eq.formula_html;
                             formulaContainer.classList.add('eq-formula-html');
                         } else if (eq.formula_plain) {
                             formulaContainer.textContent = eq.formula_plain;
                             formulaContainer.classList.add('eq-formula-plain');
                         } else {
                             formulaContainer.textContent = "[Formula not available]";
                             formulaContainer.style.fontStyle = 'italic';
                             formulaContainer.style.color = '#888';
                         }
                         eqBlock.appendChild(formulaContainer);

                         if(eq.units){ const unitsEl = document.createElement('div'); unitsEl.className = 'eq-units'; unitsEl.innerHTML = `Units: ${eq.units}`; eqBlock.appendChild(unitsEl); }
                         if (eq.variables && Array.isArray(eq.variables)) {
                             const varsDiv = document.createElement('div'); varsDiv.className = 'eq-vars'; varsDiv.innerHTML = '<strong>Variables:</strong>'; const varsUl = document.createElement('ul');
                             eq.variables.forEach(v => { const li = document.createElement('li'); li.innerHTML = `<strong>${v.symbol}:</strong> ${v.description}`; varsUl.appendChild(li); });
                             varsDiv.appendChild(varsUl); eqBlock.appendChild(varsDiv); }
                         if (eq.ref && allDetails.references && allDetails.references[eq.ref]) {
                             const refEl = document.createElement('div'); refEl.className = 'eq-ref';
                             refEl.innerHTML = `Ref: <a href="#ref-${eq.ref}" class="ref-link" data-ref-key="${eq.ref}">[${eq.ref}]</a>`;
                             eqBlock.appendChild(refEl);
                         }
                         subsection.appendChild(eqBlock); });
                 } else if (detailKey === 'measurement_characterization' && typeof detailContent === 'object') {
                     if(detailContent.techniques && Array.isArray(detailContent.techniques) && detailContent.techniques.length > 0){
                         const techDiv = document.createElement('div'); techDiv.className = "techniques";
                         const ulTech = document.createElement('ul');
                         detailContent.techniques.forEach(tech => { const li = document.createElement('li'); li.innerHTML = tech; ulTech.appendChild(li); });
                         techDiv.appendChild(ulTech); subsection.appendChild(techDiv);
                     }
                     if(detailContent.considerations && Array.isArray(detailContent.considerations) && detailContent.considerations.length > 0){
                         const considDiv = document.createElement('div'); considDiv.className = "considerations";
                         if (subsection.querySelector('.techniques')) {
                              const considTitle = document.createElement('p');
                              considTitle.innerHTML = '<strong>Considerations:</strong>';
                              considTitle.style.marginTop = '1rem';
                              considTitle.style.marginBottom = '0.25rem';
                              considDiv.appendChild(considTitle);
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
                      pre.style.cssText = 'font-size: 0.8em; background-color: #eee; padding: 5px; border-radius: 3px; overflow-x: auto;';
                      subsection.appendChild(pre);
                 }

                 if(subsection.children.length > 1) {
                     propBlock.appendChild(subsection);
                 }
             }
        }
        return propBlock;
    }

    // Function to handle reference link clicks (for smooth scroll and highlight)
    function handleRefLinkClick(event) {
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

                 window.scrollTo({
                     top: Math.max(0, desiredScrollPos),
                     behavior: 'smooth'
                 });

                 document.querySelectorAll('#references-list li.highlight-ref').forEach(el => {
                     el.classList.remove('highlight-ref');
                 });
                 targetElement.classList.add('highlight-ref');

                 setTimeout(() => {
                     targetElement.classList.remove('highlight-ref');
                 }, 2500);
            } else {
                console.warn(`Reference target element with ID '${targetId}' not found.`);
            }
        }
    }

    // --- Initialize 3D Viewer Function (DEBUGGED and SIMPLIFIED) ---
    function initialize3DViewer(viewerElementId, controlsElementId, vizData, allMaterialDetails) {
        console.log("--- Initializing 3D Viewer ---");
        console.log("Viewer Element ID:", viewerElementId);
        console.log("Controls Element ID:", controlsElementId);
        console.log("Visualization Data:", vizData);

        const viewerElement = document.getElementById(viewerElementId);
        const controlsElement = document.getElementById(controlsElementId);

        if (!viewerElement || !controlsElement) {
            console.error("Viewer or controls element not found:", viewerElementId, controlsElementId);
            return;
        }
        viewerElement.innerHTML = ''; // Clear loading message
        controlsElement.innerHTML = ''; // Clear loading message

        // --- Populate Controls HTML ---
        // (Keep the HTML structure from the previous version, it's generally fine)
         controlsElement.innerHTML = `
            <h4>Controls</h4>
            <div class="control-group" id="${controlsElementId}-composition-group">
                <label class="control-title" for="${controlsElementId}-composition">Composition (${vizData.composition.variable_element} fraction 'x')</label>
                <input type="range" id="${controlsElementId}-composition" class="slider"
                       min="${vizData.composition.min_x}" max="${vizData.composition.max_x}" step="0.05" value="${vizData.composition.initial_x}">
                <div id="${controlsElementId}-composition-value">x = ${vizData.composition.initial_x.toFixed(2)}</div>
            </div>
            <div class="control-group">
                <div class="control-title">Visualization</div>
                <button id="${controlsElementId}-btn-stick">Stick</button>
                <button id="${controlsElementId}-btn-ball-stick" class="active">Ball & Stick</button>
                <button id="${controlsElementId}-btn-spacefill">Spacefill</button>
            </div>
            <div class="control-group">
                <div class="control-title">Unit Cell</div>
                <button id="${controlsElementId}-btn-show-cell">Show Cell</button>
                <button id="${controlsElementId}-btn-hide-cell">Hide Cell</button>
            </div>
             <div class="control-group">
                <div class="control-title">Supercell</div>
                ${(vizData.supercell_options || [1]).map(size =>
                    `<button id="${controlsElementId}-btn-${size}x${size}x${size}" class="${size === 1 ? 'active' : ''}">${size}×${size}×${size}</button>`
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
            <div class="control-group">
                <div class="control-title">Actions</div>
                <button id="${controlsElementId}-btn-spin">Spin</button>
                <button id="${controlsElementId}-btn-stop">Stop</button>
                <button id="${controlsElementId}-btn-screenshot">Screenshot (PNG)</button>
            </div>
        `;

        // Hide composition slider if fixed composition
        if (vizData.composition.min_x === vizData.composition.max_x) {
           const compGroup = document.getElementById(`${controlsElementId}-composition-group`);
           if(compGroup) compGroup.style.display = 'none';
           const compInfo = document.getElementById(`${controlsElementId}-composition-info`);
           if(compInfo) compInfo.style.display = 'none';
        }

        // --- 3Dmol.js Initialization ---
        let viewer;
        try {
            viewer = $3Dmol.createViewer(viewerElement, {
                backgroundColor: "white",
                antialias: true,
                hoverable: true
            });
            console.log("3Dmol viewer created successfully.");
            // DEBUG: Add a simple sphere to test rendering
            // viewer.addSphere({ center: {x:0, y:0, z:0}, radius: 1.0, color: 'red' });
            // viewer.render();
            // viewer.zoomTo();
        } catch (e) {
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
        const atomColors = {};
        const atomRadii = {}; // Primarily for manual spacefill if needed

        // Info Panel elements
        const latticeInfoEl = document.getElementById(`${controlsElementId}-lattice-info`);
        const compositionInfoEl = document.getElementById(`${controlsElementId}-composition-info`);
        const legendEl = document.getElementById(`${controlsElementId}-legend`);
        const compValueEl = document.getElementById(`${controlsElementId}-composition-value`);

        // Populate Legend & Atom Data Map
        legendEl.innerHTML = '';
        Object.entries(atomInfo).forEach(([symbol, info]) => {
            atomColors[symbol] = info.color || '#CCCCCC';
            atomRadii[symbol] = info.radius || 1.0;
            const legendItem = document.createElement('div');
            legendItem.className = 'legend';
            legendItem.innerHTML = `<div class="legend-color" style="background-color:${atomColors[symbol]};"></div><div>${symbol}</div>`;
            legendEl.appendChild(legendItem);
        });
        console.log("Atom Colors Map:", atomColors);


        // --- Structure Generation ---
        function getLatticeConstant(compositionRatio) {
            // Simplified - assumes structure defined in JSON is correct type
             if (vizData.structure_type === 'zincblende_alloy' && vizData.lattice_constants.HgTe && vizData.lattice_constants.CdTe) {
                 return vizData.lattice_constants.HgTe * (1 - compositionRatio) + vizData.lattice_constants.CdTe * compositionRatio;
             } else if (vizData.lattice_constants.a) {
                 return vizData.lattice_constants.a;
             }
             console.warn("Cannot determine lattice constant."); return 6.0;
        }

        function generateAtomArray(compositionRatio, cellSize) {
            console.log(`Generating atoms: x=${compositionRatio}, cell=${cellSize}x${cellSize}x${cellSize}`);
            const latticeConstant = getLatticeConstant(compositionRatio);
            let atoms = [];
            const anion = Object.keys(atomInfo).find(key => atomInfo[key].role === 'anion');
            const cation_host = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_host');
            const cation_subst = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_subst');

            if (vizData.structure_type === 'zincblende_alloy') {
                 if (!anion || !cation_host || !cation_subst) {
                     console.error("Atom roles missing for zincblende_alloy"); return null;
                 }
                const cationPositions = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
                const anionPositions = [[0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]];

                for (let i = 0; i < cellSize; i++) {
                    for (let j = 0; j < cellSize; j++) {
                        for (let k = 0; k < cellSize; k++) {
                            cationPositions.forEach(pos => {
                                let elemType = Math.random() < compositionRatio ? cation_subst : cation_host;
                                atoms.push({
                                    elem: elemType,
                                    x: (pos[0] + i) * latticeConstant,
                                    y: (pos[1] + j) * latticeConstant,
                                    z: (pos[2] + k) * latticeConstant
                                    // Removed clickable/callback here, will set on model later
                                });
                            });
                             anionPositions.forEach(pos => {
                                atoms.push({
                                    elem: anion,
                                    x: (pos[0] + i) * latticeConstant,
                                    y: (pos[1] + j) * latticeConstant,
                                    z: (pos[2] + k) * latticeConstant
                                });
                            });
                        }
                    }
                }
            }
            // ADD OTHER structure_type GENERATORS HERE
            else {
                console.error("Unsupported structure_type:", vizData.structure_type);
                displayViewerError(`Unsupported structure type: ${vizData.structure_type}`);
                return null;
            }

            // Update Info Panel
            if(latticeInfoEl) latticeInfoEl.textContent = `Lattice: a ≈ ${latticeConstant.toFixed(3)} Å`;
            if(compositionInfoEl && vizData.composition.formula_template && vizData.composition.min_x !== vizData.composition.max_x) {
                 compositionInfoEl.innerHTML = `Composition: ${vizData.composition.formula_template.replace('{x}', compositionRatio.toFixed(2)).replace('{1-x}', (1 - compositionRatio).toFixed(2))}`;
            } else if (compositionInfoEl && vizData.composition.formula_template) {
                 compositionInfoEl.innerHTML = `Formula: ${vizData.composition.formula_template.replace(/{1-x}/g,'').replace(/{x}/g,'')}`;
            } else if (compositionInfoEl) {
                 compositionInfoEl.textContent = `Composition: x = ${compositionRatio.toFixed(2)}`;
            }

            console.log(`Generated ${atoms.length} atoms.`);
            return atoms;
        }

        // --- PDB Conversion ---
        // Corrected PDB formatting function
        function atomsToPDB(atoms) {
            let pdb = "";
            atoms.forEach((atom, index) => {
                // PDB requires specific column alignment. Use padStart/padEnd carefully.
                const serial = (index + 1).toString().padStart(5);
                // Atom name: Left-aligned, max 4 chars. Element usually right-aligned in last 2 chars.
                let atomName = atom.elem.substring(0, 2).padEnd(4); // Use first 2 letters, left align
                const resName = "MOL";
                const chainID = "A";
                const resSeq = "1".padStart(4); // Residue sequence number
                const iCode = " ";
                const x = atom.x.toFixed(3).padStart(8);
                const y = atom.y.toFixed(3).padStart(8);
                const z = atom.z.toFixed(3).padStart(8);
                const occupancy = "1.00".padStart(6);
                const tempFactor = "0.00".padStart(6);
                // Element symbol: Right-aligned in columns 77-78
                const element = atom.elem.substring(0, 2).padStart(2);

                pdb += `ATOM  ${serial} ${atomName} ${resName} ${chainID}${resSeq}${iCode}   ${x}${y}${z}${occupancy}${tempFactor}          ${element}  \n`;
            });
            // Add CONECT records (Optional but recommended for 3Dmol bonding)
             pdb += generatePDBConnectivity(atoms);
             pdb += "END\n";
            // console.log("Generated PDB:\n", pdb); // DEBUG: Log PDB
            return pdb;
        }

        // Helper for CONECT records (basic nearest neighbor)
        function generatePDBConnectivity(atoms) {
             let conectRecords = "";
             const bondCutoffSq = (vizData.bond_cutoff || 3.0) ** 2;
             const maxConnect = 4; // Max bonds per CONECT line

             for (let i = 0; i < atoms.length; i++) {
                 let bonds = [];
                 for (let j = 0; j < atoms.length; j++) {
                     if (i === j) continue;

                     // Basic bonding check (could add role checks here if needed)
                     const dx = atoms[i].x - atoms[j].x;
                     const dy = atoms[i].y - atoms[j].y;
                     const dz = atoms[i].z - atoms[j].z;
                     const distSq = dx * dx + dy * dy + dz * dz;

                     if (distSq > 0.01 && distSq < bondCutoffSq) {
                         bonds.push(j + 1); // Add serial number of bonded atom
                     }
                 }

                 if (bonds.length > 0) {
                     for (let k = 0; k < bonds.length; k += maxConnect) {
                         conectRecords += `CONECT${(i + 1).toString().padStart(5)}`;
                         const slice = bonds.slice(k, k + maxConnect);
                         slice.forEach(bondSerial => {
                             conectRecords += bondSerial.toString().padStart(5);
                         });
                         conectRecords += "\n";
                     }
                 }
             }
             return conectRecords;
         }

        // --- Viewer Display Functions ---
         function displayViewerError(message) {
             viewerElement.innerHTML = `<p class="error-message" style="padding: 20px; text-align: center;">${message}</p>`;
         }

         function drawUnitCellShape(cellSize) {
            try {
                 viewer.removeShape({id: 'unit_cell_shape'}); // Remove previous if exists
                 const currentLatConst = getLatticeConstant(currentComposition);
                 const cellLength = currentLatConst * cellSize;
                 console.log(`Drawing unit cell: size=${cellSize}, length=${cellLength}`);
                 viewer.addUnitCell({
                     box: {a: cellLength, b: cellLength, c: cellLength, alpha: 90, beta: 90, gamma: 90}, // Assumes cubic
                     origin: {x:0, y:0, z:0},
                     color: "#555555",
                     lineWidth: 1.5
                 }, "unit_cell_shape"); // Assign ID
                 viewer.render();
            } catch(e) {
                 console.error("Error drawing unit cell:", e);
            }
         }

        // --- Main Render Function ---
        function renderStructure() {
            console.log(`--- Rendering Structure: Style=${currentViewStyle}, Supercell=${currentSupercell}, Comp=${currentComposition.toFixed(2)} ---`);
            try {
                viewer.removeAllModels(); // Clear previous models
                 viewer.removeShape({id: 'unit_cell_shape'}); // Clear old cell shape explicitly

                const atoms = generateAtomArray(currentComposition, currentSupercell);
                if (!atoms) {
                    console.error("Atom generation failed, cannot render.");
                    return;
                }

                const pdbData = atomsToPDB(atoms);
                 if (!pdbData || pdbData.length === 0) {
                     console.error("PDB data generation failed.");
                     displayViewerError("Failed to generate structure data (PDB).");
                     return;
                 }

                viewer.addModel(pdbData, "pdb");
                console.log("Model added from PDB data.");

                // Apply styles based on current selection
                if (currentViewStyle === "stick") {
                    viewer.setStyle({}, { stick: { radius: 0.12, colorscheme: { prop: 'elem', map: atomColors } } });
                } else if (currentViewStyle === "ballAndStick") {
                    viewer.setStyle({}, { sphere: { scale: 0.35, colorscheme: { prop: 'elem', map: atomColors } } });
                    viewer.addStyle({}, { stick: { radius: 0.1, colorscheme: { prop: 'elem', map: atomColors } } });
                } else if (currentViewStyle === "spacefill") {
                     // Use vdW radii implicitly by not specifying radius/scale, or use custom radii map
                     viewer.setStyle({}, { sphere: { colorscheme: { prop: 'elem', map: atomColors } } });
                     // viewer.setStyle({}, {sphere: {colorscheme: {prop:'elem', map: atomColors}, radii: atomRadii}}); // If using custom radii
                }
                 console.log(`Style applied: ${currentViewStyle}`);

                // Re-draw cell if enabled
                if (cellShown) {
                    drawUnitCellShape(currentSupercell);
                }

                 // Make atoms clickable AFTER adding the model and styles
                 viewer.setClickable({}, true, (atom, vwr) => {
                     // Simple hover effect or info display on click
                     console.log("Clicked atom data:", atom);
                     vwr.addLabel(`Atom ${atom.serial}: ${atom.elem}`, { position: { x: atom.x, y: atom.y, z: atom.z }, backgroundColor: 'lightgray', backgroundOpacity: 0.8 });
                     setTimeout(() => vwr.removeAllLabels(), 1500); // Remove label after 1.5s
                 });

                viewer.zoomTo();
                viewer.render();
                console.log("Structure rendered and zoomed.");

            } catch (e) {
                console.error("Error during renderStructure:", e);
                displayViewerError("An error occurred while rendering the structure.");
            }
        }


        // --- Event Listeners Setup ---
        function setupButtonListener(idSuffix, callback) {
             const button = document.getElementById(`${controlsElementId}-${idSuffix}`);
             if(button) {
                button.addEventListener("click", callback);
             } else { console.warn(`Button ${controlsElementId}-${idSuffix} not found.`); }
        }
         function updateActiveButtons(groupSelector, activeButton) {
             controlsElement.querySelectorAll(groupSelector).forEach(btn => btn.classList.remove('active'));
             if (activeButton) activeButton.classList.add('active');
         }

        // Composition Slider
        const compSlider = document.getElementById(`${controlsElementId}-composition`);
        if (compSlider) {
             compSlider.addEventListener("input", function() {
                 currentComposition = parseFloat(this.value);
                 if(compValueEl) compValueEl.textContent = `x = ${currentComposition.toFixed(2)}`;
                 // Optional: Debounce slider updates if rendering is slow
                 // clearTimeout(renderTimeout);
                 // renderTimeout = setTimeout(renderStructure, 50);
                 renderStructure(); // Render immediately for now
             });
             // let renderTimeout;
        }

        // Style Buttons
        setupButtonListener("btn-stick", function() { currentViewStyle = "stick"; updateActiveButtons(`#${controlsElementId} .control-group:nth-child(2) button`, this); renderStructure(); });
        setupButtonListener("btn-ball-stick", function() { currentViewStyle = "ballAndStick"; updateActiveButtons(`#${controlsElementId} .control-group:nth-child(2) button`, this); renderStructure(); });
        setupButtonListener("btn-spacefill", function() { currentViewStyle = "spacefill"; updateActiveButtons(`#${controlsElementId} .control-group:nth-child(2) button`, this); renderStructure(); });

        // Cell Buttons
        setupButtonListener("btn-show-cell", () => { if (!cellShown) { cellShown = true; drawUnitCellShape(currentSupercell); } });
        setupButtonListener("btn-hide-cell", () => { if (cellShown) { cellShown = false; viewer.removeShape({id: 'unit_cell_shape'}); viewer.render(); } });

        // Supercell Buttons
        (vizData.supercell_options || [1]).forEach(size => {
             setupButtonListener(`btn-${size}x${size}x${size}`, function() {
                 currentSupercell = size;
                 updateActiveButtons(`#${controlsElementId} .control-group:nth-child(4) button`, this);
                 renderStructure();
             });
         });

        // Action Buttons
        setupButtonListener("btn-spin", () => viewer.spin(true));
        setupButtonListener("btn-stop", () => viewer.spin(false));
        setupButtonListener("btn-screenshot", function() {
             let imageData = viewer.pngURI();
             let link = document.createElement('a');
             const safeMaterialName = allMaterialDetails.materialName.replace(/ /g, '_').toLowerCase();
             let compString = (vizData.composition.min_x !== vizData.composition.max_x) ? `_x${currentComposition.toFixed(2)}` : "";
             link.download = `${safeMaterialName}_${vizData.structure_type}${compString}_${currentSupercell}x${currentSupercell}x${currentSupercell}.png`;
             link.href = imageData;
             document.body.appendChild(link); link.click(); document.body.removeChild(link);
        });

        // --- Initial Render ---
        renderStructure();

    } // --- END initialize3DViewer FUNCTION ---


}); // End DOMContentLoaded
