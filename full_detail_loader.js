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

        const materialDetails = await response.json();
        const sectionDataMap = new Map();

        // --- Process References ---
        const collectedRefs = new Set();
        const processRefs = (data) => {
             if (typeof data === 'object' && data !== null) {
                 if (data.ref && materialDetails.references && materialDetails.references[data.ref]) { collectedRefs.add(data.ref); }
                 Object.values(data).forEach(value => { if (typeof value === 'object' || Array.isArray(value)) { processRefs(value); } });
             } else if (Array.isArray(data)) { data.forEach(processRefs); }
        };
        processRefs(materialDetails); // Process all data for references

        // --- Build Table of Contents & Store Section Data ---
        if (tocListEl && mainContentEl) {
            tocListEl.innerHTML = '';
            for (const sectionKey in materialDetails) {
                if (sectionKey === 'materialName' || sectionKey === 'references') continue;
                const sectionData = materialDetails[sectionKey];
                if (typeof sectionData !== 'object' || sectionData === null) continue;

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
                 sectionIntroEl.innerHTML = sectionData.introduction || '';
                 sectionIntroEl.style.display = sectionData.introduction ? 'block' : 'none';
             }
             if (propertiesContainerEl && sectionData.properties && typeof sectionData.properties === 'object') {
                 propertiesContainerEl.innerHTML = '';
                 Object.entries(sectionData.properties).forEach(([propKey, propData]) => {
                     // Pass the container for the viewer
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
             collectedRefs.forEach(refKey => {
                 const refData = materialDetails.references[refKey];
                 if(refData){
                     const li = document.createElement('li'); li.id = `ref-${refKey}`;
                     let linkHtml = refData.text;
                     if(refData.doi){ linkHtml += ` <a href="https://doi.org/${refData.doi}" target="_blank" title="View via DOI">[DOI]</a>`; }
                     li.innerHTML = `<strong>[${refKey}]</strong> ${linkHtml}`;
                     referencesListEl.appendChild(li);
                 }
             });
             referencesSectionEl.style.display = 'block';
             mainContentEl.addEventListener('click', handleRefLinkClick); // Use main content for broader click capture
        } else if(referencesSectionEl){
             referencesSectionEl.style.display = 'none';
        }

    } catch (error) {
        displayError(error.message || "An unknown error occurred.");
        console.error(error); // Log full error for debugging
    }

    // --- Helper Function to Render a Single Property Block ---
    // Added parentContainer parameter
    function renderPropertyBlock(propKey, propData, allDetails, parentContainer) {
        const propBlock = document.createElement('div');
        propBlock.className = 'property-detail-block';
        propBlock.id = `prop-${propKey}`; // Add an ID for potential targeting

        const propTitle = document.createElement('h3');
        propTitle.innerHTML = propData.displayName || propKey.replace(/_/g, ' ');
        propBlock.appendChild(propTitle);

        if (propData.summary) {
            const summaryEl = document.createElement('div');
            summaryEl.className = 'summary';
            summaryEl.innerHTML = propData.summary; // Use innerHTML to render potential HTML tags like <sub>
            propBlock.appendChild(summaryEl);
        }

        // Check for and handle visualization_data
        if (propKey === 'crystal_structure' && propData.details && propData.details.visualization_data) {
            const vizData = propData.details.visualization_data;
            const viewerContainerId = vizData.container_id || `viewer-container-${propKey}`; // Use provided or generate ID
            const viewerWrapper = document.createElement('div');
            viewerWrapper.className = 'crystal-viewer-wrapper'; // Add a wrapper class for styling
            viewerWrapper.innerHTML = `
                <div id="${viewerContainerId}" class="crystal-viewer-container">
                    <div id="${viewerContainerId}-viewer" class="viewer-area" style="height: ${vizData.viewer_height || '400px'};">
                        <!-- 3Dmol viewer will attach here -->
                        <p style="padding:20px; color:#888;">Loading 3D Viewer...</p>
                    </div>
                    <div id="${viewerContainerId}-controls" class="viewer-controls">
                         <p style="padding:10px; color:#888;">Loading Controls...</p>
                        <!-- Controls will be populated by JS -->
                    </div>
                </div>
            `;
            propBlock.appendChild(viewerWrapper);

            // Defer initialization until the element is definitely in the DOM
            requestAnimationFrame(() => {
                 if (typeof $3Dmol === 'undefined') {
                     console.error("3Dmol.js library not loaded!");
                      const errorMsg = document.createElement('p');
                      errorMsg.className = 'error-message';
                      errorMsg.textContent = 'Error: 3Dmol.js library failed to load.';
                      document.getElementById(`${viewerContainerId}-viewer`).innerHTML = ''; // Clear loading message
                      document.getElementById(`${viewerContainerId}-viewer`).appendChild(errorMsg);
                     return; // Stop initialization
                 }

                 if (typeof initialize3DViewer === 'function') {
                    try {
                         initialize3DViewer(
                             `${viewerContainerId}-viewer`,
                             `${viewerContainerId}-controls`,
                             vizData,
                             allDetails // Pass all material details if needed later (e.g., space group from another property)
                         );
                     } catch(e) {
                        console.error("Error initializing 3D viewer:", e);
                        const errorMsg = document.createElement('p');
                        errorMsg.className = 'error-message';
                        errorMsg.textContent = 'Could not load interactive 3D viewer. Check console for details.';
                        document.getElementById(`${viewerContainerId}-viewer`).innerHTML = ''; // Clear loading message
                        document.getElementById(`${viewerContainerId}-viewer`).appendChild(errorMsg);
                     }
                 } else {
                     console.error("initialize3DViewer function not found!");
                     const errorMsg = document.createElement('p');
                     errorMsg.className = 'error-message';
                     errorMsg.textContent = 'Error: Viewer initialization script missing or failed.';
                     document.getElementById(`${viewerContainerId}-viewer`).innerHTML = ''; // Clear loading message
                     document.getElementById(`${viewerContainerId}-viewer`).appendChild(errorMsg);
                 }
            });
        }


        if (propData.details && typeof propData.details === 'object') {
             for (const [detailKey, detailContent] of Object.entries(propData.details)) {
                 // Skip visualization_data here as it's handled above
                 if (detailKey === 'visualization_data') continue;

                 if (!detailContent || (Array.isArray(detailContent) && detailContent.length === 0) || (typeof detailContent === 'object' && !Array.isArray(detailContent) && Object.keys(detailContent).length === 0) ) continue;

                 const subsection = document.createElement('div');
                 subsection.className = `detail-subsection ${detailKey.replace(/ /g, '_').toLowerCase()}`;
                 const subsectionTitle = document.createElement('h4');
                 subsection.appendChild(subsectionTitle); // Title handled by CSS

                 // --- Rendering logic for different detail types ---
                  if (Array.isArray(detailContent) && detailKey !== 'equations') { // List of strings
                     const ul = document.createElement('ul');
                     detailContent.forEach(item => { const li = document.createElement('li'); li.innerHTML = item; ul.appendChild(li); });
                     subsection.appendChild(ul);
                 } else if (detailKey === 'equations' && Array.isArray(detailContent)) { // Equations array
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
                         }
                         eqBlock.appendChild(formulaContainer);

                         if(eq.units){ const unitsEl = document.createElement('div'); unitsEl.className = 'eq-units'; unitsEl.innerHTML = `Units: ${eq.units}`; eqBlock.appendChild(unitsEl); }
                         if (eq.variables && Array.isArray(eq.variables)) {
                             const varsDiv = document.createElement('div'); varsDiv.className = 'eq-vars'; varsDiv.innerHTML = '<strong>Variables:</strong>'; const varsUl = document.createElement('ul');
                             eq.variables.forEach(v => { const li = document.createElement('li'); li.innerHTML = `<strong>${v.symbol}:</strong> ${v.description}`; varsUl.appendChild(li); });
                             varsDiv.appendChild(varsUl); eqBlock.appendChild(varsDiv); }
                         if (eq.ref && allDetails.references && allDetails.references[eq.ref]) {
                             const refEl = document.createElement('div'); refEl.className = 'eq-ref';
                             // Updated reference link format
                             refEl.innerHTML = `Ref: <a href="#ref-${eq.ref}" class="ref-link" data-ref-key="${eq.ref}">[${eq.ref}]</a>`;
                             eqBlock.appendChild(refEl);
                         }
                         subsection.appendChild(eqBlock); });
                 } else if (detailKey === 'measurement_characterization' && typeof detailContent === 'object') { // Measurement object
                     if(detailContent.techniques && Array.isArray(detailContent.techniques)){ const techDiv = document.createElement('div'); techDiv.className = "techniques"; const ulTech = document.createElement('ul'); detailContent.techniques.forEach(tech => { const li = document.createElement('li'); li.innerHTML = tech; ulTech.appendChild(li); }); techDiv.appendChild(ulTech); subsection.appendChild(techDiv); }
                     if(detailContent.considerations && Array.isArray(detailContent.considerations)){ const considDiv = document.createElement('div'); considDiv.className = "considerations"; if (detailContent.techniques && subsection.querySelector('.techniques')) { const considTitle = document.createElement('p'); considTitle.innerHTML = '<strong>Considerations:</strong>'; considTitle.style.marginTop = '1rem'; considDiv.appendChild(considTitle); } const ulConsid = document.createElement('ul'); detailContent.considerations.forEach(note => { const li = document.createElement('li'); li.innerHTML = note; ulConsid.appendChild(li); }); considDiv.appendChild(ulConsid); subsection.appendChild(considDiv); }
                 } else if (typeof detailContent === 'string') { // Simple string content
                      const p = document.createElement('p');
                      p.innerHTML = detailContent; // Use innerHTML to allow basic HTML like <sup>, <sub> etc.
                      subsection.appendChild(p);
                 } else {
                      console.warn(`Unhandled detail structure for key '${detailKey}' in property '${propKey}'`, detailContent);
                 }


                 if(subsection.children.length > 1) propBlock.appendChild(subsection); // Only add subsection if it has content beyond the title placeholder
             }
        }
        return propBlock;
    } // --- End renderPropertyBlock ---


    // Function to handle reference link clicks (for smooth scroll)
    function handleRefLinkClick(event) {
        const link = event.target.closest('a.ref-link');
        if (link && link.dataset.refKey) {
            event.preventDefault();
            const targetId = `ref-${link.dataset.refKey}`;
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                // Calculate scroll position to center the reference entry
                 const elementRect = targetElement.getBoundingClientRect();
                 const absoluteElementTop = elementRect.top + window.pageYOffset;
                 // Aim for vertical center, or slightly above if space is limited
                 const offset = Math.min(window.innerHeight * 0.4, elementRect.height * 1.5); // Adjust offset calculation
                 const scrollToPosition = absoluteElementTop - offset;

                 window.scrollTo({ top: scrollToPosition, behavior: 'smooth' });

                 // Highlight the reference briefly
                 document.querySelectorAll('#references-list li.highlight-ref').forEach(el => el.classList.remove('highlight-ref')); // Clear previous highlights
                 targetElement.classList.add('highlight-ref');
                 setTimeout(() => {
                     targetElement.classList.remove('highlight-ref');
                 }, 2500); // Highlight for 2.5 seconds
            }
        }
    } // --- End handleRefLinkClick ---


    // --- Initialize 3D Viewer Function ---
    function initialize3DViewer(viewerElementId, controlsElementId, vizData, allMaterialDetails) {
        console.log("Initializing 3D Viewer for:", viewerElementId, "with data:", vizData);

        const viewerElement = document.getElementById(viewerElementId);
        const controlsElement = document.getElementById(controlsElementId);

        if (!viewerElement || !controlsElement) {
            console.error("Viewer or controls element not found:", viewerElementId, controlsElementId);
            return;
        }
        // Clear loading messages
        viewerElement.innerHTML = '';
        controlsElement.innerHTML = '';

        // --- Basic HTML Structure for Controls ---
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
                ${(vizData.supercell_options || [1]).map(size => // Default to [1] if not provided
                    `<button id="${controlsElementId}-btn-${size}x${size}x${size}" class="${size === 1 ? 'active' : ''}">${size}×${size}×${size}</button>`
                 ).join('')}
            </div>
            <div class="control-group">
                <div class="control-title">Animation</div>
                <button id="${controlsElementId}-btn-spin">Spin</button>
                <button id="${controlsElementId}-btn-stop">Stop</button>
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
                <div class="control-title">Export</div>
                <button id="${controlsElementId}-btn-screenshot">Screenshot (PNG)</button>
            </div>
        `;

        // Check if composition slider should be hidden (fixed composition)
        if (vizData.composition.min_x === vizData.composition.max_x) {
           const compGroup = document.getElementById(`${controlsElementId}-composition-group`);
           if(compGroup) compGroup.style.display = 'none';
           // Also hide the composition display in the info panel if it's fixed
            const compInfo = document.getElementById(`${controlsElementId}-composition-info`);
             if(compInfo) compInfo.style.display = 'none';
        }


        // --- 3Dmol.js Logic ---
        let viewer = $3Dmol.createViewer(viewerElement, {
            backgroundColor: "white",
            antialias: true,
            hoverable: true // Enable hovering
        });

        // State variables specific to this viewer instance
        let labelsShown = false;
        let cellShown = false;
        let currentLabels = [];
        let cellLines = [];
        let currentViewStyle = "ballAndStick";
        let currentSupercell = 1; // Default supercell
        let currentComposition = vizData.composition.initial_x;

        // Info Panel elements
        const latticeInfoEl = document.getElementById(`${controlsElementId}-lattice-info`);
        const compositionInfoEl = document.getElementById(`${controlsElementId}-composition-info`);
        const legendEl = document.getElementById(`${controlsElementId}-legend`);
        const compValueEl = document.getElementById(`${controlsElementId}-composition-value`);

        // Populate Legend & Atom Data
        const atomInfo = vizData.atom_info;
        const atomColors = {};
        const atomRadii = {};
        legendEl.innerHTML = ''; // Clear potential placeholders
        Object.entries(atomInfo).forEach(([symbol, info]) => {
            atomColors[symbol] = info.color || '#CCCCCC'; // Default color
            atomRadii[symbol] = info.radius || 1.0;     // Default radius
            const legendItem = document.createElement('div');
            legendItem.className = 'legend';
            legendItem.innerHTML = `<div class="legend-color" style="background-color:${atomColors[symbol]};"></div><div>${symbol}</div>`;
            legendEl.appendChild(legendItem);
        });


        // --- Structure Generation Logic ---
        function getLatticeConstant(compositionRatio) {
             // Handle different ways lattice constants might be defined
             if (vizData.structure_type === 'zincblende_alloy' && vizData.lattice_constants.HgTe && vizData.lattice_constants.CdTe) {
                 // Specific Vegard's Law for HgCdTe example
                 const a_Host = vizData.lattice_constants.HgTe;
                 const a_Subst = vizData.lattice_constants.CdTe;
                 return a_Host * (1 - compositionRatio) + a_Subst * compositionRatio;
             } else if (vizData.lattice_constants.a) {
                 // Simple cubic or diamond-like structure
                 return vizData.lattice_constants.a;
             } else {
                // Add more cases or a default/error
                 console.warn("Cannot determine lattice constant from vizData:", vizData.lattice_constants);
                 return 6.0; // Default fallback
             }
        }

        function generateStructure(compositionRatio, cellSize) {
            // Clear previous shapes/labels specific to this viewer instance's state
            currentLabels.forEach(lbl => viewer.removeLabel(lbl));
            currentLabels = [];
            cellLines.forEach(shape => viewer.removeShape(shape));
            cellLines = [];
            // NOTE: We clear the models (spheres/cylinders) later in renderStructure before adding new ones

            const latticeConstant = getLatticeConstant(compositionRatio);
            let atoms = [];

            // Find elements based on roles defined in JSON
            const anion = Object.keys(atomInfo).find(key => atomInfo[key].role === 'anion');
            const cation_host = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_host');
            const cation_subst = Object.keys(atomInfo).find(key => atomInfo[key].role === 'cation_subst');
            const lattice_atom = Object.keys(atomInfo).find(key => atomInfo[key].role === 'lattice_atom'); // For simple structures


            // --- Select Structure Generation based on type ---
            if (vizData.structure_type === 'zincblende_alloy') {
                 if (!anion || !cation_host || !cation_subst) {
                     console.error("Atom roles 'anion', 'cation_host', 'cation_subst' required for zincblende_alloy not fully defined in visualization_data.atom_info");
                     displayViewerError("Atom roles configuration error for Zincblende Alloy.");
                     return null;
                 }
                // Base positions for zincblende (fractional coordinates)
                const cationPositions = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
                const anionPositions = [[0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]];

                for (let i = 0; i < cellSize; i++) {
                    for (let j = 0; j < cellSize; j++) {
                        for (let k = 0; k < cellSize; k++) {
                            // Add cations (randomly substitute based on ratio)
                            cationPositions.forEach(pos => {
                                let elemType = Math.random() < compositionRatio ? cation_subst : cation_host;
                                atoms.push({
                                    elem: elemType,
                                    x: (pos[0] + i) * latticeConstant,
                                    y: (pos[1] + j) * latticeConstant,
                                    z: (pos[2] + k) * latticeConstant,
                                    clickable: true, // Make atoms clickable for info
                                    callback: atomClickCallback
                                });
                            });
                             // Add anions
                             anionPositions.forEach(pos => {
                                atoms.push({
                                    elem: anion,
                                    x: (pos[0] + i) * latticeConstant,
                                    y: (pos[1] + j) * latticeConstant,
                                    z: (pos[2] + k) * latticeConstant,
                                    clickable: true,
                                    callback: atomClickCallback
                                });
                            });
                        }
                    }
                }
            }
             // --- ADD OTHER STRUCTURE TYPES HERE ---
             // else if (vizData.structure_type === 'diamond') {
             //     if (!lattice_atom) { /* Error */ }
             //     const basis = [ [0,0,0], [0.25,0.25,0.25], [0,0.5,0.5], [0.25,0.75,0.75],
             //                     [0.5,0,0.5], [0.75,0.25,0.75], [0.5,0.5,0], [0.75,0.75,0.25] ];
             //     for (let i = 0; i < cellSize; i++) { /* loops */
             //          basis.forEach(pos => { atoms.push({ elem: lattice_atom, x: (pos[0]+i)*latConst, ... clickable...}); });
             //     }
             // }
             // else if (vizData.structure_type === 'rocksalt') { ... }
             else {
                 console.error("Unsupported structure_type:", vizData.structure_type);
                 displayViewerError(`Unsupported structure type: ${vizData.structure_type}`);
                 return null;
             }

             // --- Update info panel text ---
             if(latticeInfoEl) latticeInfoEl.textContent = `Lattice: a ≈ ${latticeConstant.toFixed(3)} Å`; // Use approx symbol
             if(compositionInfoEl && vizData.composition.formula_template && vizData.composition.min_x !== vizData.composition.max_x) {
                 compositionInfoEl.innerHTML = `Composition: ${
                     vizData.composition.formula_template
                         .replace('{x}', compositionRatio.toFixed(2))
                         .replace('{1-x}', (1 - compositionRatio).toFixed(2))
                 }`;
             } else if (compositionInfoEl && vizData.composition.formula_template) {
                  // Fixed composition - display the formula directly if template exists
                  compositionInfoEl.innerHTML = `Formula: ${vizData.composition.formula_template.replace('{x}','').replace('{1-x}','')}`; // Crude removal, improve if needed
             } else if (compositionInfoEl) {
                 compositionInfoEl.textContent = `Composition: x = ${compositionRatio.toFixed(2)}`; // Fallback
             }


            return atoms;
        }

         // Function to display errors within the viewer area
         function displayViewerError(message) {
             viewerElement.innerHTML = `<p class="error-message" style="padding: 20px; text-align: center;">${message}</p>`;
         }

         // Callback for clicking atoms
         let clickLabelId = null;
         function atomClickCallback(atom, viewer) {
             if (clickLabelId) {
                 viewer.removeLabel(clickLabelId); // Remove previous label
             }
             clickLabelId = viewer.addLabel(
                 `Atom: ${atom.elem}<br>Pos: (${atom.x.toFixed(2)}, ${atom.y.toFixed(2)}, ${atom.z.toFixed(2)})`,
                 {
                     position: { x: atom.x, y: atom.y, z: atom.z },
                     showBackground: true,
                     backgroundColor: 'rgba(240, 240, 240, 0.8)',
                     backgroundOpacity: 0.8,
                     borderThickness: 0.5,
                     borderColor: '#555555',
                     fontColor: '#111111',
                     fontSize: 10,
                     inFront: true // Make sure it's visible
                 }
             );
             console.log("Clicked atom:", atom);
         }


        // --- Rendering Functions (Bonds, Labels, Unit Cell) ---
        function addBonds(atoms) {
            const bondCutoff = vizData.bond_cutoff || 3.0;
            // Define roles that can bond with each other (e.g., cation with anion)
            const cationRoles = ['cation_host', 'cation_subst'];
            const anionRoles = ['anion'];
            const latticeRoles = ['lattice_atom']; // For simple structures like diamond

            for (let i = 0; i < atoms.length; i++) {
                for (let j = i + 1; j < atoms.length; j++) {
                    const atom1 = atoms[i];
                    const atom2 = atoms[j];
                    const role1 = atomInfo[atom1.elem]?.role;
                    const role2 = atomInfo[atom2.elem]?.role;

                    // Bonding rules:
                    // 1. Cation only bonds with Anion
                    // 2. Lattice_atom only bonds with Lattice_atom
                    let shouldBond = false;
                    if ((cationRoles.includes(role1) && anionRoles.includes(role2)) || (anionRoles.includes(role1) && cationRoles.includes(role2))) {
                        shouldBond = true;
                    } else if (latticeRoles.includes(role1) && latticeRoles.includes(role2)) {
                        shouldBond = true;
                    }
                    // Add more rules if needed for complex structures

                    if (!shouldBond) continue;

                    const dx = atom1.x - atom2.x;
                    const dy = atom1.y - atom2.y;
                    const dz = atom1.z - atom2.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (distance < bondCutoff && distance > 0.1) { // Check distance > 0.1 to avoid self-bonding
                        viewer.addCylinder({
                            start: { x: atom1.x, y: atom1.y, z: atom1.z },
                            end: { x: atom2.x, y: atom2.y, z: atom2.z },
                            radius: 0.12, // Slightly thinner bonds
                            color: "#999999", // Lighter gray
                            fromCap: 1,
                            toCap: 1
                        });
                    }
                }
            }
        }

        function addLabels(atoms) {
             atoms.forEach(atom => {
                 const labelId = viewer.addLabel(atom.elem, {
                    position: { x: atom.x, y: atom.y, z: atom.z },
                    inFront: true,
                    fontSize: 11,
                    fontColor: atomColors[atom.elem] || '#333333', // Use atom color for label?
                    fontOpacity: 0.8,
                    // Optional: simpler label without background
                    // showBackground: false,
                 });
                currentLabels.push(labelId); // Track added labels
            });
        }

        function drawUnitCell(cellSize) {
            const currentLatConst = getLatticeConstant(currentComposition);
            const cellLength = currentLatConst * cellSize;
            const cellOrigin = {x: 0, y: 0, z: 0}; // Assuming origin is 0,0,0 for now

            // Use $3Dmol.GLModel.prototype.addUnitCell
            // Need to create a dummy model or add cell to existing model if possible,
            // or draw lines manually as before. Manual lines offer more control on style.
             viewer.addUnitCell({
                             box: {a: cellLength, b: cellLength, c: cellLength, alpha: 90, beta: 90, gamma: 90}, // Assuming cubic for now
                             color: "#444444",
                             lineWidth: 1.5, // 3Dmol's line width setting
                 //           dashed: true // Check if $3Dmol supports dashed unit cells directly
                             }, "unit_cell_shape"); // Give it an ID to potentially remove later? (Check 3Dmol docs)


            // Manual line drawing (alternative if addUnitCell isn't flexible enough or doesn't exist)
            /*
            const vertices = [
                [cellOrigin.x, cellOrigin.y, cellOrigin.z], [cellOrigin.x+cellLength, cellOrigin.y, cellOrigin.z], // ... and so on
            ];
            const edges = [ [0, 1], [0, 2], ... ]; // Edges connecting vertices indices

            edges.forEach(edge => {
                const start = vertices[edge[0]];
                const end = vertices[edge[1]];
                let lineId = viewer.addCylinder({
                    start: { x: start[0], y: start[1], z: start[2] },
                    end: { x: end[0], y: end[1], z: end[2] },
                    radius: 0.04,
                    color: "#555555",
                    // dashed: true, dashLength: 0.4, gapLength: 0.2, // Manual dashed lines if needed
                    fromCap: 1, toCap: 1
                });
                cellLines.push(lineId); // Track shapes added for the cell
            });
             */

            // Optional: Add lattice constant label (can clutter)
            /*
             let labelId = viewer.addLabel(`a = ${currentLatConst.toFixed(3)} Å`, {
                  position: { x: cellLength / 2, y: -1.0, z: -1.0 }, // Adjust position
                  inFront: true, fontSize: 12, fontColor: "#333333"
              });
             currentLabels.push(labelId);
             */
        }


        // --- Main Render Function ---
        function renderStructure() {
            // Clear previous atom/bond models first
            viewer.removeAllModels();
             if (clickLabelId) { viewer.removeLabel(clickLabelId); clickLabelId = null; } // Clear click label on rerender

            const atoms = generateStructure(currentComposition, currentSupercell);
            if (!atoms) {
                console.error("Structure generation failed.");
                return; // Stop if generation failed
            }

            // Add new atoms/bonds based on the current style
            if (currentViewStyle === "stick") {
                viewer.addStyle({}, { stick: { radius: 0.12, colorscheme: {prop: 'elem', map: atomColors} } });
                 viewer.addModel(atomsToPDB(atoms), "pdb");
                 // viewer.addAtoms(atoms); // Alternative if atoms format matches $3Dmol
                 // viewer.setStyle({}, {stick: {}}); // Apply style after adding atoms
                 // addBonds(atoms); // Manual bonds needed if addAtoms doesn't create them based on structure
            } else if (currentViewStyle === "ballAndStick") {
                 viewer.addStyle({}, { stick: { radius: 0.12, colorscheme: {prop: 'elem', map: atomColors} } });
                 viewer.addStyle({}, { sphere: { scale: 0.4, colorscheme: {prop: 'elem', map: atomColors} } }); // Smaller spheres
                 viewer.addModel(atomsToPDB(atoms), "pdb");
                // atoms.forEach(atom => viewer.addSphere({ center: { x: atom.x, y: atom.y, z: atom.z }, radius: atomRadii[atom.elem] * 0.4, color: atomColors[atom.elem], clickable: true, callback: atomClickCallback }));
                // addBonds(atoms);
            } else if (currentViewStyle === "spacefill") {
                 viewer.addStyle({}, { sphere: { colorscheme: {prop: 'elem', map: atomColors} } }); // Use default radii based on element
                 viewer.addModel(atomsToPDB(atoms), "pdb");
                // atoms.forEach(atom => viewer.addSphere({ center: { x: atom.x, y: atom.y, z: atom.z }, radius: atomRadii[atom.elem], color: atomColors[atom.elem], clickable: true, callback: atomClickCallback }));
            }

             // Add Model Data (alternative using PDB format - often easier for 3Dmol styles)
             // const pdbData = atomsToPDB(atoms);
             // viewer.addModel(pdbData, "pdb");
             // Set styles based on currentViewStyle using viewer.setStyle
             // if (currentViewStyle === "stick") { viewer.setStyle({}, {stick: {radius: 0.1, colorscheme: {prop:'elem', map: atomColors}}}); }
             // else if (currentViewStyle === "ballAndStick") { viewer.setStyle({}, {sphere: {scale:0.3, colorscheme:{prop:'elem', map: atomColors}}, stick: {radius: 0.1, colorscheme:{prop:'elem', map: atomColors}}}); }
             // else if (currentViewStyle === "spacefill") { viewer.setStyle({}, {sphere: {colorscheme:{prop:'elem', map: atomColors}}}); }


            // Re-add labels and cell if they are currently enabled
            if (labelsShown) addLabels(atoms);
            if (cellShown) {
                 viewer.removeShape("unit_cell_shape"); // Remove old unit cell if using addUnitCell
                 drawUnitCell(currentSupercell); // Redraw cell based on current state
             }


            viewer.zoomTo();
            viewer.render();
        }

        // Helper to convert atom array to basic PDB string for $3Dmol.addModel
        function atomsToPDB(atoms) {
            let pdb = "";
            atoms.forEach((atom, index) => {
                let atomName = atom.elem.padEnd(4);
                let resName = "MOL"; // Residue name
                let chainID = "A";
                let resSeq = 1; // Residue sequence number
                let iCode = ""; // Insertion code
                let x = atom.x.toFixed(3).padStart(8);
                let y = atom.y.toFixed(3).padStart(8);
                let z = atom.z.toFixed(3).padStart(8);
                let occupancy = "1.00".padStart(6);
                let tempFactor = "0.00".padStart(6);
                let element = atom.elem.padStart(2); // Element symbol
                let charge = ""; // Charge

                 // Basic PDB ATOM record format
                 pdb += `ATOM  ${(index + 1).toString().padStart(5)} ${atomName} ${resName} ${chainID}${resSeq.toString().padStart(4)}${iCode}   ${x}${y}${z}${occupancy}${tempFactor}          ${element}${charge}\n`;
             });
            // Add connectivity if needed (CONECT records), though 3Dmol often infers bonds
            // pdb += "END\n"; // Optional END record
             return pdb;
        }


        // --- Event Listeners (Scoped to this viewer's controls) ---
        const compositionSlider = document.getElementById(`${controlsElementId}-composition`);
        if (compositionSlider) {
             compositionSlider.addEventListener("input", function() {
                 currentComposition = parseFloat(this.value);
                 if(compValueEl) compValueEl.textContent = `x = ${currentComposition.toFixed(2)}`;
                 // Debounce rendering slightly for sliders can be good practice if complex
                 // clearTimeout(renderTimeout);
                 // renderTimeout = setTimeout(renderStructure, 50); // Render after 50ms pause
                 renderStructure(); // Render immediately for now
             });
             // let renderTimeout; // For debouncing
        }

        function setupButtonListener(buttonId, callback) {
             const button = document.getElementById(buttonId);
             if(button) {
                button.addEventListener("click", callback);
             } else {
                console.warn(`Button with ID ${buttonId} not found.`);
             }
        }

         function updateActiveButtons(groupSelector, activeButton) {
             controlsElement.querySelectorAll(groupSelector).forEach(btn => btn.classList.remove('active'));
             if (activeButton) activeButton.classList.add('active');
         }


        // Style Buttons
        setupButtonListener(`${controlsElementId}-btn-stick`, function() {
            currentViewStyle = "stick";
            updateActiveButtons(`#${controlsElementId} .control-group:nth-child(2) button`, this);
            renderStructure();
        });
        setupButtonListener(`${controlsElementId}-btn-ball-stick`, function() {
            currentViewStyle = "ballAndStick";
            updateActiveButtons(`#${controlsElementId} .control-group:nth-child(2) button`, this);
            renderStructure();
        });
         setupButtonListener(`${controlsElementId}-btn-spacefill`, function() {
            currentViewStyle = "spacefill";
             updateActiveButtons(`#${controlsElementId} .control-group:nth-child(2) button`, this);
            renderStructure();
        });

        // Cell Buttons
         setupButtonListener(`${controlsElementId}-btn-show-cell`, function() {
            if (!cellShown) {
                cellShown = true;
                drawUnitCell(currentSupercell); // Draw based on current supercell
                viewer.render();
            }
        });
        setupButtonListener(`${controlsElementId}-btn-hide-cell`, function() {
             if (cellShown) {
                cellShown = false;
                 viewer.removeShape("unit_cell_shape"); // Remove cell added via addUnitCell
                 // Or if using manual lines:
                 // cellLines.forEach(shape => viewer.removeShape(shape));
                 // cellLines = [];
                 // Also remove cell labels if any were added
                 // currentLabels = currentLabels.filter(lbl => !isCellLabel(lbl)); // Need a way to identify cell labels
                viewer.render();
             }
        });

         // Supercell Buttons
         (vizData.supercell_options || [1]).forEach(size => {
             setupButtonListener(`${controlsElementId}-btn-${size}x${size}x${size}`, function() {
                 currentSupercell = size;
                 // Update button active state using a more robust selector
                 updateActiveButtons(`#${controlsElementId}-controls .control-group:nth-child(4) button`, this);
                 renderStructure();
             });
         });


        // Spin Buttons
        setupButtonListener(`${controlsElementId}-btn-spin`, () => viewer.spin(true));
        setupButtonListener(`${controlsElementId}-btn-stop`, () => viewer.spin(false));

        // Screenshot Button
        setupButtonListener(`${controlsElementId}-btn-screenshot`, function() {
             let imageData = viewer.pngURI();
             let link = document.createElement('a');
             // Use material name and structure type for filename
             const safeMaterialName = allMaterialDetails.materialName.replace(/ /g, '_').toLowerCase();
             let compositionString = "";
             if (vizData.composition.min_x !== vizData.composition.max_x) {
                compositionString = `_x${currentComposition.toFixed(2)}`;
             }
             link.download = `${safeMaterialName}_${vizData.structure_type}${compositionString}_${currentSupercell}x${currentSupercell}x${currentSupercell}.png`;
             link.href = imageData;
             document.body.appendChild(link); // Required for Firefox
             link.click();
             document.body.removeChild(link); // Clean up
        });

        // --- Initial Render ---
        renderStructure(); // Perform the first render

    } // --- END initialize3DViewer FUNCTION ---


}); // End DOMContentLoaded
