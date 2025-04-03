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
    let allMaterialDetails; // Define here to be accessible in the whole block
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
        allMaterialDetails = await response.json(); // Attempt to parse JSON
        // Basic validation after parsing
        if (typeof allMaterialDetails !== 'object' || allMaterialDetails === null) {
            throw new Error(`Invalid JSON structure received from ${detailFilePath}. Expected an object.`);
        }
        console.log("[Full Detail Loader] JSON parsed successfully.");
        const sectionDataMap = new Map();

        // --- Process References ---
        console.log("[Full Detail Loader] Processing references...");
        const collectedRefs = new Set();
        const processRefs = (data) => {
             if (typeof data === 'object' && data !== null) {
                 // Ensure references object exists before trying to access it
                 if (data.ref && allMaterialDetails.references && allMaterialDetails.references[data.ref]) {
                     collectedRefs.add(data.ref);
                 }
                 // Recursively process nested objects and arrays
                 Object.values(data).forEach(value => {
                     if (typeof value === 'object' || Array.isArray(value)) {
                         processRefs(value);
                     }
                 });
             } else if (Array.isArray(data)) {
                 data.forEach(processRefs);
             }
        };
        // Start processing from the root of the details object
        processRefs(allMaterialDetails);
        console.log(`[Full Detail Loader] References processed. Found ${collectedRefs.size} unique refs.`);

        // --- Build Table of Contents & Store Section Data ---
        console.log("[Full Detail Loader] Building Table of Contents...");
        if (tocListEl && mainContentEl) {
            tocListEl.innerHTML = '';
            let sectionCount = 0;
            const excludedKeys = ['materialName', 'references']; // Keys to skip for TOC/Sections
            for (const sectionKey in allMaterialDetails) {
                // Skip excluded keys and non-object sections
                if (excludedKeys.includes(sectionKey) || typeof allMaterialDetails[sectionKey] !== 'object' || allMaterialDetails[sectionKey] === null) {
                    continue;
                }
                const sectionData = allMaterialDetails[sectionKey];
                // Optional: Add a check for a specific property like displayName if needed
                // if (typeof sectionData.displayName !== 'string') continue;

                sectionDataMap.set(sectionKey, sectionData); // Store data for later population
                sectionCount++;
                const sectionDisplayName = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const sectionId = `section-${sectionKey}`;
                const tocLi = document.createElement('li');
                const tocLink = document.createElement('a');
                tocLink.href = `#${sectionId}`;
                tocLink.textContent = sectionDisplayName;
                tocLi.appendChild(tocLink);
                tocListEl.appendChild(tocLi);
            }
             console.log(`[Full Detail Loader] TOC built with ${sectionCount} sections.`);
             if (sectionCount === 0) { console.warn("[Full Detail Loader] No valid sections found for TOC."); }
        } else { console.warn("[Full Detail Loader] TOC List Element or Main Content Element not found."); }

        // --- Populate Sections from Stored Data ---
        console.log("[Full Detail Loader] Populating sections...");
        let populatedSectionCount = 0;
        // Iterate through the stored section data
        for (const [sectionKey, sectionData] of sectionDataMap.entries()) {
             const sectionId = `section-${sectionKey}`;
             const sectionElement = document.getElementById(sectionId); // Find the corresponding placeholder div in HTML

             // Skip if the placeholder element doesn't exist in the HTML
             if (!sectionElement) {
                 console.warn(`HTML section placeholder '${sectionId}' not found. Skipping population for this section.`);
                 continue;
             }

             // Find elements within the section placeholder
             const sectionTitleEl = sectionElement.querySelector('h2'); // Find the H2 title within the section div
             const sectionIntroEl = document.getElementById(`${sectionId}-intro`); // Find the intro paragraph
             const propertiesContainerEl = document.getElementById(`${sectionId}-properties`); // Find the properties container

             // Populate Title (Use querySelector result)
             if(sectionTitleEl) {
                 sectionTitleEl.textContent = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
             } else {
                 console.warn(`Title element (h2) not found within section '${sectionId}'.`);
             }

             // Populate Introduction
             if (sectionIntroEl) {
                 if (sectionData.introduction) {
                     sectionIntroEl.innerHTML = sectionData.introduction; // Use innerHTML for potential HTML content
                     sectionIntroEl.style.display = 'block';
                 } else {
                     sectionIntroEl.style.display = 'none'; // Hide if no intro
                     sectionIntroEl.innerHTML = ''; // Clear content
                 }
             } else {
                 // console.log(`Intro element '${sectionId}-intro' not found.`); // Optional logging
             }

             // Populate Properties
             if (propertiesContainerEl && sectionData.properties && typeof sectionData.properties === 'object') {
                 propertiesContainerEl.innerHTML = ''; // Clear existing content
                 let propertyCount = 0;
                 Object.entries(sectionData.properties).forEach(([propKey, propData]) => {
                     // Call renderPropertyBlock for each property
                     const propertyBlockElement = renderPropertyBlock(propKey, propData, allMaterialDetails, propertiesContainerEl);
                     if (propertyBlockElement) {
                         propertiesContainerEl.appendChild(propertyBlockElement);
                         propertyCount++;
                     }
                 });
                 // Show or hide container based on whether properties were added
                 propertiesContainerEl.style.display = propertyCount > 0 ? 'block' : 'none';
             } else if (propertiesContainerEl) {
                 propertiesContainerEl.style.display = 'none'; // Hide if no properties or container doesn't exist
             }

             // Make the whole section visible now that it's populated
             sectionElement.style.display = 'block';
             populatedSectionCount++;
        }
         console.log(`[Full Detail Loader] Populated ${populatedSectionCount} sections.`);

        // --- Populate References ---
        console.log("[Full Detail Loader] Populating references section...");
        if (collectedRefs.size > 0 && referencesListEl && allMaterialDetails.references) {
             referencesListEl.innerHTML = ''; // Clear existing list
             const sortedRefs = Array.from(collectedRefs).sort(); // Sort keys alphabetically/numerically
             sortedRefs.forEach(refKey => {
                 const refData = allMaterialDetails.references[refKey];
                 if(refData){ // Check if reference data actually exists for the key
                     const li = document.createElement('li');
                     li.id = `ref-${refKey}`; // Set ID for linking
                     let linkHtml = refData.text; // Start with the reference text
                     // Add DOI link if present
                     if(refData.doi){
                         linkHtml += ` <a href="https://doi.org/${refData.doi}" target="_blank" rel="noopener noreferrer" title="View via DOI">[DOI]</a>`;
                     }
                     // Set the final HTML content for the list item
                     li.innerHTML = `<strong>[${refKey}]</strong> ${linkHtml}`;
                     referencesListEl.appendChild(li);
                 } else {
                     console.warn(`Reference key '${refKey}' was collected but is not defined in the 'references' object.`);
                 }
             });
             referencesSectionEl.style.display = 'block'; // Show the references section
             mainContentEl.addEventListener('click', handleRefLinkClick); // Add listener for ref link clicks
              console.log("[Full Detail Loader] References populated.");
        } else if(referencesSectionEl){
             referencesSectionEl.style.display = 'none'; // Hide references section if no refs or elements missing
             console.log("[Full Detail Loader] No references to populate or references elements missing.");
        }
        console.log("[Full Detail Loader] Data processing complete.");

    } catch (error) {
         console.error("[Full Detail Loader] CRITICAL ERROR in fetch/process:", error);
        // Provide more specific feedback for JSON parsing errors
        if (error instanceof SyntaxError && error.message.includes("JSON")) {
            displayError(`Failed to parse JSON data. Please check the format of the details file. Error: ${error.message}`);
        } else {
            displayError(error.message || "An unknown error occurred while loading material details.");
        }
    }

    // --- Helper Function to Render a Single Property Block ---
    // Uses the structure from your *second* file, but calls initialize3DViewer
    function renderPropertyBlock(propKey, propData, allDetails, parentContainer) {
        if (typeof propData !== 'object' || propData === null) return null; // Basic validation

        const propBlock = document.createElement('div');
        propBlock.className = 'property-detail-block';
        propBlock.id = `prop-${propKey}`;

        const propTitle = document.createElement('h3');
        propTitle.innerHTML = propData.displayName || propKey.replace(/_/g, ' '); // Use displayName or format key
        propBlock.appendChild(propTitle);

        if (propData.summary) {
            const summaryEl = document.createElement('div');
            summaryEl.className = 'summary';
            summaryEl.innerHTML = propData.summary; // Use innerHTML for potential HTML tags
            propBlock.appendChild(summaryEl);
        }

        // --- Visualization Integration (Calling 3Dmol viewer) ---
        if (propKey === 'crystal_structure' && propData.details && propData.details.visualization_data) {
            const vizData = propData.details.visualization_data;

            // Validate essential visualization data
             if (!vizData || typeof vizData !== 'object' || !vizData.atom_info || !vizData.composition || !vizData.lattice_constants || !vizData.structure_type) {
                 console.error(`[renderPropertyBlock] Invalid or incomplete viz_data for '${propKey}'. Missing essential fields.`);
                 const errorDiv = document.createElement('div');
                 errorDiv.className = 'error-message';
                 errorDiv.textContent = 'Error: Visualization data is invalid or incomplete. Cannot load viewer.';
                 propBlock.appendChild(errorDiv);
             } else {
                // Generate unique IDs for this specific viewer instance
                const viewerContainerId = vizData.container_id || `viewer-container-${propKey}-${Date.now()}`;
                const viewerAreaId = `${viewerContainerId}-viewer`;
                const controlsAreaId = `${viewerContainerId}-controls`;

                const viewerWrapper = document.createElement('div');
                viewerWrapper.className = 'crystal-viewer-wrapper';
                const viewerHeight = vizData.viewer_height || '450px'; // Default height if not specified
                viewerWrapper.style.setProperty('--viewer-height', viewerHeight); // Use CSS variable for height

                // Set up the HTML structure for the viewer and controls areas
                viewerWrapper.innerHTML = `
                    <div id="${viewerContainerId}" class="crystal-viewer-container">
                        <div id="${viewerAreaId}" class="viewer-area"><p style="padding:20px; color:#888; text-align:center;">Loading 3D Viewer...</p></div>
                        <div id="${controlsAreaId}" class="viewer-controls"><p style="padding:10px; color:#888;">Loading Controls...</p></div>
                    </div>`;
                propBlock.appendChild(viewerWrapper);

                 // Use requestAnimationFrame to ensure elements are in the DOM before initializing
                requestAnimationFrame(() => {
                     // Check if the 3Dmol library is loaded
                     if (typeof $3Dmol === 'undefined') {
                         console.error("3Dmol.js library not loaded!");
                         const viewerArea = document.getElementById(viewerAreaId);
                         if(viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Error: 3Dmol.js library failed to load. Check script inclusion.</p>`;
                         const controlsArea = document.getElementById(controlsAreaId);
                         if(controlsArea) controlsArea.innerHTML = ''; // Clear controls loading message
                         return;
                     }

                     // Check if the initialization function exists (it should, as it's defined below)
                     if (typeof initialize3DViewer === 'function') {
                        try {
                            // Call the 3Dmol viewer initializer with the correct element IDs and data
                            console.log(`[renderPropertyBlock] Initializing 3Dmol viewer for ${viewerAreaId}`);
                            initialize3DViewer(viewerAreaId, controlsAreaId, vizData, allDetails);
                        } catch(e) {
                            console.error(`Error initializing 3Dmol viewer for ${viewerAreaId}:`, e);
                            const viewerArea = document.getElementById(viewerAreaId);
                            if (viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Could not initialize 3D viewer. Error: ${e.message}. Check console.</p>`;
                            const controlsArea = document.getElementById(controlsAreaId);
                            if(controlsArea) controlsArea.innerHTML = ''; // Clear controls area on error
                        }
                     } else {
                         // This case should ideally not happen if the function is defined below
                         console.error("initialize3DViewer function not found! This indicates a script loading issue.");
                         const viewerArea = document.getElementById(viewerAreaId);
                         if(viewerArea) viewerArea.innerHTML = `<p class="error-message" style="padding: 20px;">Error: Viewer initialization script ('initialize3DViewer') missing.</p>`;
                         const controlsArea = document.getElementById(controlsAreaId);
                         if(controlsArea) controlsArea.innerHTML = '';
                     }
                });
             }
        } // --- End Visualization Integration ---

        // --- Process other details subsections ---
        if (propData.details && typeof propData.details === 'object') {
            for (const [detailKey, detailContent] of Object.entries(propData.details)) {
                 if (detailKey === 'visualization_data') continue; // Skip viz data here

                 // Skip empty content (null, empty array, empty object)
                 if (!detailContent ||
                     (Array.isArray(detailContent) && detailContent.length === 0) ||
                     (typeof detailContent === 'object' && !Array.isArray(detailContent) && Object.keys(detailContent).length === 0)
                    ) {
                     continue;
                 }

                 const subsection = document.createElement('div');
                 subsection.className = `detail-subsection ${detailKey.replace(/ /g, '_').toLowerCase()}`; // Class based on key

                 const subsectionTitle = document.createElement('h4');
                 // Set title based on key (formatted) - check if detailContent is not just a string first
                 if(typeof detailContent !== 'string') {
                    subsectionTitle.textContent = detailKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                 } else {
                    // If content is just a string, maybe don't add H4? Or add it differently.
                    // For now, let's keep it consistent but it might look odd.
                    subsectionTitle.textContent = detailKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                 }
                 subsection.appendChild(subsectionTitle); // Add title first

                 // --- Render different types of detail content ---

                 // 1. Array of strings (typical lists) - Exclude 'equations' which has special handling
                 if (Array.isArray(detailContent) && detailKey !== 'equations') {
                     const ul = document.createElement('ul');
                     detailContent.forEach(item => {
                         const li = document.createElement('li');
                         li.innerHTML = item; // Use innerHTML for potential HTML in list items
                         ul.appendChild(li);
                     });
                     subsection.appendChild(ul);
                 }
                 // 2. Equations Array
                 else if (detailKey === 'equations' && Array.isArray(detailContent)) {
                     detailContent.forEach(eq => {
                         if (typeof eq !== 'object' || eq === null) return; // Skip invalid equation entries
                         const eqBlock = document.createElement('div');
                         eqBlock.className = 'equation-block';

                         if (eq.name) { const nameEl = document.createElement('span'); nameEl.className = 'eq-name'; nameEl.textContent = eq.name; eqBlock.appendChild(nameEl); }
                         if (eq.description) { const descEl = document.createElement('p'); descEl.className = 'eq-desc'; descEl.innerHTML = eq.description; eqBlock.appendChild(descEl); }

                         const formulaContainer = document.createElement('div');
                         formulaContainer.className = 'eq-formula-container';
                         if (eq.formula_html) { formulaContainer.innerHTML = eq.formula_html; formulaContainer.classList.add('eq-formula-html'); }
                         else if (eq.formula_plain) { formulaContainer.textContent = eq.formula_plain; formulaContainer.classList.add('eq-formula-plain'); }
                         else { formulaContainer.textContent = "[Formula not available]"; formulaContainer.style.cssText = 'font-style: italic; color: #888;'; }
                         eqBlock.appendChild(formulaContainer);

                         if(eq.units){ const unitsEl = document.createElement('div'); unitsEl.className = 'eq-units'; unitsEl.innerHTML = `Units: ${eq.units}`; eqBlock.appendChild(unitsEl); }

                         if (eq.variables && Array.isArray(eq.variables) && eq.variables.length > 0) {
                             const varsDiv = document.createElement('div'); varsDiv.className = 'eq-vars'; varsDiv.innerHTML = '<strong>Variables:</strong>';
                             const varsUl = document.createElement('ul');
                             eq.variables.forEach(v => {
                                 if (typeof v === 'object' && v !== null && v.symbol && v.description) {
                                     const li = document.createElement('li');
                                     li.innerHTML = `<strong>${v.symbol}:</strong> ${v.description}`; // Use innerHTML for desc
                                     varsUl.appendChild(li);
                                 }
                             });
                             if (varsUl.children.length > 0) { varsDiv.appendChild(varsUl); eqBlock.appendChild(varsDiv); }
                         }

                         if (eq.ref && allDetails.references && allDetails.references[eq.ref]) {
                             const refEl = document.createElement('div'); refEl.className = 'eq-ref';
                             // Ensure ref link works with the main handler
                             refEl.innerHTML = `Ref: <a href="#ref-${eq.ref}" class="ref-link" data-ref-key="${eq.ref}">[${eq.ref}]</a>`;
                             eqBlock.appendChild(refEl);
                         }
                         subsection.appendChild(eqBlock); // Add the complete equation block
                     });
                 }
                 // 3. Measurement/Characterization Object
                 else if (detailKey === 'measurement_characterization' && typeof detailContent === 'object' && detailContent !== null) {
                     // Techniques List
                     if(detailContent.techniques && Array.isArray(detailContent.techniques) && detailContent.techniques.length > 0){
                         const techDiv = document.createElement('div'); techDiv.className = "techniques";
                         const ulTech = document.createElement('ul');
                         detailContent.techniques.forEach(tech => { const li = document.createElement('li'); li.innerHTML = tech; ulTech.appendChild(li); });
                         techDiv.appendChild(ulTech); subsection.appendChild(techDiv);
                     }
                     // Considerations List (with optional heading)
                     if(detailContent.considerations && Array.isArray(detailContent.considerations) && detailContent.considerations.length > 0){
                         const considDiv = document.createElement('div'); considDiv.className = "considerations";
                         // Add a heading if techniques were also present
                         if (subsection.querySelector('.techniques')) {
                             const considTitle = document.createElement('p'); considTitle.innerHTML = '<strong>Considerations:</strong>';
                             considTitle.style.cssText = 'margin-top: 1rem; margin-bottom: 0.25rem; font-weight: bold;'; // Added bold
                             considDiv.appendChild(considTitle);
                         }
                         const ulConsid = document.createElement('ul');
                         detailContent.considerations.forEach(note => { const li = document.createElement('li'); li.innerHTML = note; ulConsid.appendChild(li); });
                         considDiv.appendChild(ulConsid); subsection.appendChild(considDiv);
                     }
                 }
                 // 4. Simple String Content
                 else if (typeof detailContent === 'string') {
                     // Remove the H4 title if it's just a simple string value
                     if (subsectionTitle.parentNode === subsection) {
                         subsection.removeChild(subsectionTitle);
                     }
                     const p = document.createElement('p');
                     p.innerHTML = detailContent; // Use innerHTML for potential HTML
                     subsection.appendChild(p);
                 }
                 // 5. Fallback for other Object/Array types (display as JSON)
                 else {
                     console.warn(`Unhandled detail structure for key '${detailKey}' in property '${propKey}'. Displaying as JSON.`, detailContent);
                     const pre = document.createElement('pre');
                     pre.textContent = JSON.stringify(detailContent, null, 2); // Pretty print JSON
                     pre.style.cssText = 'font-size: 0.8em; background-color: #f0f0f0; padding: 8px; border: 1px solid #ccc; border-radius: 4px; overflow-x: auto; margin-top: 0.5rem;';
                     subsection.appendChild(pre);
                 }

                 // Add the subsection to the main property block only if it has content beyond the title
                 if(subsection.children.length > (subsection.contains(subsectionTitle) ? 1 : 0)) { // Check if more than just the title exists
                    propBlock.appendChild(subsection);
                 } else if (!subsection.contains(subsectionTitle) && subsection.children.length > 0) {
                     // Case where title was removed (string content) but content exists
                     propBlock.appendChild(subsection);
                 }
            }
        } // --- End processing details subsections ---

        return propBlock; // Return the fully constructed property block
    } // --- End renderPropertyBlock ---

    // --- Function to handle reference link clicks ---
    // (Copied directly from your first file - looks good)
    function handleRefLinkClick(event) {
        // Find the closest ancestor anchor tag with the specific class and data attribute
        const link = event.target.closest('a.ref-link[data-ref-key]');
        if (link) {
            event.preventDefault(); // Stop default anchor behavior
            const targetId = `ref-${link.dataset.refKey}`;
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                // Calculate scroll position to center the element slightly above the middle of the viewport
                const elementRect = targetElement.getBoundingClientRect();
                const absoluteElementTop = elementRect.top + window.pageYOffset; // Use pageYOffset for cross-browser compatibility
                const headerOffset = 60; // Adjust based on your fixed header height, if any
                const viewportHeight = window.innerHeight;
                // Aim for about 30% down from the top of the viewport
                const desiredScrollPos = absoluteElementTop - (viewportHeight * 0.3) - headerOffset;

                // Scroll smoothly to the calculated position (ensure it's not negative)
                window.scrollTo({
                    top: Math.max(0, desiredScrollPos),
                    behavior: 'smooth'
                });

                // Highlight the reference temporarily
                // Remove highlight from any previously highlighted refs
                document.querySelectorAll('#references-list li.highlight-ref').forEach(el => el.classList.remove('highlight-ref'));
                targetElement.classList.add('highlight-ref');
                // Remove the highlight after a short delay
                setTimeout(() => {
                    targetElement.classList.remove('highlight-ref');
                }, 2500); // Highlight for 2.5 seconds
            } else {
                console.warn(`Reference target element with ID '${targetId}' not found.`);
            }
        }
    } // --- End handleRefLinkClick ---


    // --- Initialize 3D Viewer Function (INTEGRATED FROM YOUR FIRST FILE) ---
    // This is the full 3Dmol.js based viewer initializer
    function initialize3DViewer(viewerElementId, controlsElementId, vizData, allMaterialDetails) {
        console.log("--- [3Dmol Init] Initializing 3D Viewer ---");
        console.log("Viewer Element ID:", viewerElementId);
        console.log("Controls Element ID:", controlsElementId);
        console.log("Viz Data:", vizData); // Log received vizData

        const viewerElement = document.getElementById(viewerElementId);
        const controlsElement = document.getElementById(controlsElementId);

        // --- Basic Checks ---
        if (!viewerElement) { console.error(`[3Dmol Error] Viewer element with ID '${viewerElementId}' not found!`); return; }
        if (!controlsElement) { console.error(`[3Dmol Error] Controls element with ID '${controlsElementId}' not found!`); return; }
        if (typeof $3Dmol === 'undefined') { console.error("[3Dmol Error] 3Dmol.js library ($3Dmol) is not defined!"); viewerElement.innerHTML = `<p class="error-message">Error: 3Dmol.js library not loaded.</p>`; return; }
        if (!vizData || typeof vizData !== 'object') { console.error("[3Dmol Error] Invalid vizData provided."); viewerElement.innerHTML = `<p class="error-message">Error: Invalid visualization data.</p>`; return; }
        if (!allMaterialDetails || typeof allMaterialDetails !== 'object') { console.error("[3Dmol Error] Invalid allMaterialDetails provided."); return; } // Less critical for viewer itself


        viewerElement.innerHTML = ''; // Clear "Loading..." message
        controlsElement.innerHTML = ''; // Clear "Loading..." message

        // --- Populate Controls HTML Dynamically ---
        // Ensure unique IDs by prefixing with controlsElementId
        controlsElement.innerHTML = `
            <h4>Controls</h4>

            ${(vizData.composition.min_x !== vizData.composition.max_x) ? `
            <div class="control-group" id="${controlsElementId}-composition-group">
                <label class="control-title" for="${controlsElementId}-composition">Composition (${vizData.composition.variable_element || 'x'} fraction 'x')</label>
                <input type="range" id="${controlsElementId}-composition" class="slider"
                       min="${vizData.composition.min_x}" max="${vizData.composition.max_x}" step="${vizData.composition.step_x || 0.01}" value="${vizData.composition.initial_x}">
                <div id="${controlsElementId}-composition-value" class="value-display">x = ${Number(vizData.composition.initial_x).toFixed(2)}</div>
            </div>
            ` : `<div class="control-group"><p>Composition: Fixed</p></div>` }

            <div class="control-group viz-controls">
                <div class="control-title">Visualization Style</div>
                <button data-style="stick" id="${controlsElementId}-btn-stick">Stick</button>
                <button data-style="ballAndStick" id="${controlsElementId}-btn-ball-stick" class="active">Ball & Stick</button>
                <button data-style="spacefill" id="${controlsElementId}-btn-spacefill">Spacefill</button>
            </div>

            <div class="control-group cell-controls">
                <div class="control-title">Unit Cell Outline</div>
                <button id="${controlsElementId}-btn-show-cell">Show</button>
                <button id="${controlsElementId}-btn-hide-cell" class="active">Hide</button>
            </div>

             <div class="control-group supercell-controls">
                <div class="control-title">Supercell Size</div>
                ${(vizData.supercell_options && Array.isArray(vizData.supercell_options) && vizData.supercell_options.length > 0 ? vizData.supercell_options : [1]).map(size =>
                    `<button data-size="${size}" id="${controlsElementId}-btn-${size}x${size}x${size}" class="${size === 1 ? 'active' : ''}">${size}×${size}×${size}</button>`
                 ).join('')}
            </div>

             <div class="control-group info-panel-group">
                 <div class="control-title">Information</div>
                 <div class="info-panel">
                     <h5 id="${controlsElementId}-info-title">${allMaterialDetails.materialName || 'Structure'}</h5>
                     <div id="${controlsElementId}-lattice-info">Lattice: Calculating...</div>
                     <div id="${controlsElementId}-composition-info"${(vizData.composition.min_x === vizData.composition.max_x) ? ' style="display: none;"' : ''}>Composition: Calculating...</div>
                     <div id="${controlsElementId}-spacegroup-info">Space group: ${allMaterialDetails.identification?.properties?.space_group?.summary || 'N/A'}</div>
                     <hr>
                     <div id="${controlsElementId}-legend" class="legend-container"></div>
                 </div>
             </div>

            <div class="control-group action-controls">
                <div class="control-title">Actions</div>
                <button id="${controlsElementId}-btn-spin">Spin</button>
                <button id="${controlsElementId}-btn-stop">Stop Spin</button>
                <button id="${controlsElementId}-btn-screenshot">Screenshot (PNG)</button>
            </div>
        `;

        // --- 3Dmol.js Viewer Initialization ---
        let viewer;
        try {
            viewer = $3Dmol.createViewer(viewerElement, {
                backgroundColor: "white", // Or use vizData.background_color || 'white'
                antialias: true,
                hoverable: true, // Enable hover events if needed later
                // Potentially add other options from vizData if needed
            });
            if (!viewer) throw new Error("createViewer returned null or undefined.");
            console.log("[3Dmol Init] 3Dmol viewer instance created.");
        } catch (e) {
            console.error("[3Dmol Error] Error creating 3Dmol viewer instance:", e);
            viewerElement.innerHTML = `<p class="error-message" style="padding: 20px;">Failed to create 3D viewer instance. Error: ${e.message}</p>`;
            controlsElement.innerHTML = ''; // Clear controls if viewer fails
            return;
        }

        // --- State and Configuration Variables ---
        const atomInfo = vizData.atom_info || {}; // e.g., { "Hg": { role: "cation_host", color: "#...", radius: ... }, ... }
        const latticeConstantsSource = vizData.lattice_constants || {}; // e.g., { "HgTe": 6.46, "CdTe": 6.48 }
        const structureType = vizData.structure_type; // e.g., "zincblende_alloy"
        const bondCutoffJson = Number(vizData.bond_cutoff); // Get bond cutoff from JSON if specified

        const atomColors = {}; // Map: { "HG": "#...", "CD": "#...", "TE": "#..." } (Uppercase keys)
        const atomRadii = {}; // Map: { "HG": 1.5, ... } (Uppercase keys) - Currently used mainly for spacefill

        // State variables managed by controls
        let currentComposition = Number(vizData.composition.initial_x);
        let currentViewStyle = "ballAndStick";
        let currentSupercell = 1; // Default supercell size
        let cellShown = false; // Unit cell outline visibility
        let isSpinning = false;

        // Internal state
        let currentAtoms = []; // Array of atom objects: { elem: 'TE', x: ..., y: ..., z: ..., serial: ... }
        let latticeConstant = 0; // Calculated lattice constant, updated by generateAtomData
        let cellShapes = []; // Stores 3Dmol shape objects for the cell outline

        // --- DOM Element References (Specific to this instance) ---
        const compSlider = document.getElementById(`${controlsElementId}-composition`);
        const compValueDisplay = document.getElementById(`${controlsElementId}-composition-value`);
        const latticeInfoEl = document.getElementById(`${controlsElementId}-lattice-info`);
        const compositionInfoEl = document.getElementById(`${controlsElementId}-composition-info`);
        const legendEl = document.getElementById(`${controlsElementId}-legend`);
        // (Button references are obtained within event listeners)

        // --- Helper: Display Error Message in Viewer Area ---
        function displayViewerError(message) {
            console.error("[3Dmol Viewer Error]", message);
            viewerElement.innerHTML = `<p class="error-message" style="padding: 20px; text-align: center;">${message}</p>`;
        }

        // --- Populate Legend & Color/Radius Maps ---
        function populateLegendAndMaps() {
            if (!legendEl) { console.warn("Legend element not found."); return; }
            legendEl.innerHTML = ''; // Clear previous legend items
            let legendHtml = '';
            if (atomInfo && typeof atomInfo === 'object' && Object.keys(atomInfo).length > 0) {
                Object.entries(atomInfo).forEach(([symbol, info]) => {
                    if (!info || typeof info !== 'object') return;
                    const upperSymbol = symbol.toUpperCase();
                    atomColors[upperSymbol] = info.color || '#CCCCCC'; // Default grey
                    atomRadii[upperSymbol] = Number(info.radius) || 1.0; // Default radius 1.0
                    // Use consistent display: inline-block for color swatch
                    legendHtml += `<div class="legend-item">
                                     <span class="legend-color-swatch" style="background-color:${atomColors[upperSymbol]};"></span>
                                     <span>${symbol} (${info.role || 'Atom'})</span>
                                   </div>`;
                });
                legendEl.innerHTML = legendHtml;
                console.log("[3Dmol Init] Atom Colors Map:", atomColors);
                console.log("[3Dmol Init] Atom Radii Map:", atomRadii);
            } else {
                console.error("[3Dmol Error] vizData.atom_info is missing, invalid, or empty! Cannot populate legend or color maps.");
                legendEl.innerHTML = '<p style="color: red; font-size: small;">Error: Atom info missing.</p>';
            }
        }
        populateLegendAndMaps(); // Call immediately

        // --- Structure Generation Function ---
        function generateAtomData(compositionRatio, cellSize) {
            console.log(`[3Dmol Gen] Generating atoms for x=${compositionRatio.toFixed(2)}, cell=${cellSize}x${cellSize}x${cellSize}, type=${structureType}`);
            let atoms = [];
            let calculated_a = 0; // Reset calculated 'a'

            // --- 1. Calculate Lattice Constant (Vegard's Law for alloys) ---
            if (structureType.includes('alloy')) {
                const cation_host_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'cation_host');
                const cation_subst_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'cation_subst');
                if (!cation_host_symbol || !cation_subst_symbol) {
                    console.error("[3Dmol Error] Cannot calculate alloy lattice constant: cation_host or cation_subst role missing in atomInfo.");
                    displayViewerError("Error: Alloy atom roles missing.");
                    return { atoms: [], latticeConstant: 0 }; // Return empty data
                }
                const a_host_compound = latticeConstantsSource[cation_host_symbol]; // e.g., latticeConstantsSource["HgTe"]
                const a_subst_compound = latticeConstantsSource[cation_subst_symbol]; // e.g., latticeConstantsSource["CdTe"]
                if (typeof a_host_compound !== 'number' || typeof a_subst_compound !== 'number') {
                     console.error(`[3Dmol Error] Missing or invalid lattice constants in vizData.lattice_constants for ${cation_host_symbol} (${a_host_compound}) or ${cation_subst_symbol} (${a_subst_compound}).`);
                     displayViewerError("Error: Missing base lattice constants.");
                     return { atoms: [], latticeConstant: 0 };
                }
                 calculated_a = a_host_compound * (1 - compositionRatio) + a_subst_compound * compositionRatio;
            } else {
                // For non-alloys, assume a single lattice constant is provided or use a default
                calculated_a = Number(latticeConstantsSource?.a) || Number(Object.values(latticeConstantsSource)[0]) || 6.5; // Try 'a', then first value, then fallback
                console.log(`[3Dmol Gen] Using fixed lattice constant for non-alloy: ${calculated_a}`);
            }

            if (isNaN(calculated_a) || calculated_a <= 0) {
                console.error(`[3Dmol Error] Calculated lattice constant 'a' is invalid: ${calculated_a}`);
                displayViewerError("Error: Invalid lattice constant calculated.");
                return { atoms: [], latticeConstant: 0 }; // Return empty data
            }
            latticeConstant = calculated_a; // Update global state for cell drawing etc.

            // --- 2. Generate Atom Positions based on Structure Type ---
            if (structureType === 'zincblende_alloy') {
                const anion_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'anion');
                const cation_host_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'cation_host');
                const cation_subst_symbol = Object.keys(atomInfo).find(key => atomInfo[key]?.role === 'cation_subst');
                if (!anion_symbol || !cation_host_symbol || !cation_subst_symbol) {
                     console.error("[3Dmol Error] Zincblende alloy generation failed: Required atom roles (anion, cation_host, cation_subst) not found in atomInfo.");
                     displayViewerError("Error: Missing roles for Zincblende.");
                     return { atoms: [], latticeConstant: latticeConstant };
                 }
                const cationSites = [[0.00, 0.00, 0.00], [0.00, 0.50, 0.50], [0.50, 0.00, 0.50], [0.50, 0.50, 0.00]]; // Check if this is correct for ZnS (often Anion here)
                const anionSites = [[0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]]; // And Cation here

                // Note: Check which role occupies which sublattice for Zincblende
                // Assuming cations are at fractional coords like (0,0,0) and anions like (1/4, 1/4, 1/4)

                for (let i = 0; i < cellSize; i++) {
                    for (let j = 0; j < cellSize; j++) {
                        for (let k = 0; k < cellSize; k++) {
                             // Place cations (randomly Host or Subst)
                            cationSites.forEach(pos => {
                                let elemType = Math.random() < compositionRatio ? cation_subst_symbol : cation_host_symbol;
                                atoms.push({
                                     elem: elemType.toUpperCase(), // Use UPPERCASE symbol for 3Dmol matching
                                     x: (pos[0] + i) * latticeConstant,
                                     y: (pos[1] + j) * latticeConstant,
                                     z: (pos[2] + k) * latticeConstant
                                });
                            });
                            // Place anions
                            anionSites.forEach(pos => {
                                atoms.push({
                                     elem: anion_symbol.toUpperCase(), // Use UPPERCASE
                                     x: (pos[0] + i) * latticeConstant,
                                     y: (pos[1] + j) * latticeConstant,
                                     z: (pos[2] + k) * latticeConstant
                                });
                            });
                        }
                    }
                }
            }
            // --- Add other structure types here (e.g., Rocksalt, Perovskite) ---
            // else if (structureType === 'rocksalt') { ... }
            else {
                console.error(`[3Dmol Error] Unsupported structure_type: '${structureType}'. Cannot generate atoms.`);
                displayViewerError(`Error: Structure type "${structureType}" not supported.`);
                return { atoms: [], latticeConstant: latticeConstant };
            }

            // Add serial numbers required by 3Dmol's addAtoms
            atoms.forEach((atom, index) => atom.serial = index);

            // --- 3. Update Info Panel Text ---
            if(latticeInfoEl) latticeInfoEl.textContent = `Lattice: a ≈ ${latticeConstant.toFixed(3)} Å`;
            if(compositionInfoEl) {
                if (vizData.composition.min_x !== vizData.composition.max_x && vizData.composition.formula_template) {
                     // Dynamic formula for alloys
                     compositionInfoEl.innerHTML = `Formula: ${vizData.composition.formula_template
                        .replace('{x}', compositionRatio.toFixed(2))
                        .replace('{1-x}', (1 - compositionRatio).toFixed(2))}`;
                     compositionInfoEl.style.display = 'block'; // Ensure visible
                } else if (vizData.composition.formula_template) {
                    // Fixed formula (replace placeholders if they exist, otherwise show as is)
                    compositionInfoEl.innerHTML = `Formula: ${vizData.composition.formula_template
                        .replace(/\{x\}/g, '')       // Remove {x} if present
                        .replace(/\{1-x\}/g, '')    // Remove {1-x} if present
                        .replace(/\[\]/g, '')}`;   // Clean up potential empty brackets if roles missing
                    compositionInfoEl.style.display = 'block'; // Ensure visible
                } else {
                     // Fallback if no template
                     compositionInfoEl.textContent = (vizData.composition.min_x !== vizData.composition.max_x)
                        ? `Composition: x = ${compositionRatio.toFixed(2)}`
                        : 'Composition: Fixed';
                     compositionInfoEl.style.display = 'block';
                 }
            }

            console.log(`[3Dmol Gen] Generated ${atoms.length} atoms.`);
            return { atoms: atoms, latticeConstant: latticeConstant }; // Return atoms and the constant used
        }


        // --- Unit Cell Drawing Function ---
        function drawUnitCellOutline() {
             // Remove previous cell shapes
             cellShapes.forEach(shape => viewer.removeShape(shape.id));
             cellShapes = [];
             if (!cellShown || !latticeConstant) return; // Don't draw if hidden or lattice constant invalid

             const cellLength = latticeConstant * currentSupercell; // Use the current supercell size
             const color = "#3333AA"; // Dark blue outline
             const radius = 0.04; // Thickness of the lines
             // Use dashed lines for visual distinction
             const dashLength = 0.3;
             const gapLength = 0.15;

             // Define vertices of the supercell cube (origin at 0,0,0)
             const vertices = [
                 {x:0, y:0, z:0}, {x:cellLength, y:0, z:0}, {x:0, y:cellLength, z:0}, {x:cellLength, y:cellLength, z:0},
                 {x:0, y:0, z:cellLength}, {x:cellLength, y:0, z:cellLength}, {x:0, y:cellLength, z:cellLength}, {x:cellLength, y:cellLength, z:cellLength}
             ];
             // Define edges connecting vertices
             const edges = [
                 [0,1],[0,2],[1,3],[2,3], // Bottom face
                 [4,5],[4,6],[5,7],[6,7], // Top face
                 [0,4],[1,5],[2,6],[3,7]  // Connecting edges
             ];

             // Add each edge as a dashed cylinder shape
             edges.forEach((edge, index) => {
               const start = vertices[edge[0]];
               const end = vertices[edge[1]];
               let shape = viewer.addCylinder({
                   start: start,
                   end: end,
                   radius: radius,
                   color: color,
                   dashed: true,
                   dashLength: dashLength,
                   gapLength: gapLength,
                   fromCap: false, // No end caps needed for simple lines
                   toCap: false
                });
                shape.id = `cell_line_${index}`; // Assign an ID for removal
               cellShapes.push(shape); // Store the shape object
             });
             console.log(`[3Dmol Draw] Added ${cellShapes.length} cell outline shapes.`);
             viewer.render(); // Render the newly added shapes
          }


        // --- Core Rendering Function ---
        // This function takes atom data and applies styles/cell outline
        function renderCore(atomDataResult) {
            console.log("[3Dmol RenderCore] Starting render...");
            if (!viewer) { console.error("RenderCore aborted: Viewer not initialized."); return; }
            if (!atomDataResult || !atomDataResult.atoms || !atomDataResult.latticeConstant) {
                console.error("RenderCore aborted: Invalid atom data received.");
                displayViewerError("Error: Failed to get atom data for rendering.");
                return;
            }

            currentAtoms = atomDataResult.atoms; // Update global atom state if needed
            // latticeConstant is updated globally by generateAtomData

            try {
                viewer.removeAllModels(); // Clear previous atom models
                viewer.removeAllLabels(); // Clear previous labels
                // Cell shapes are removed/added by drawUnitCellOutline

                if (currentAtoms.length === 0) {
                    console.warn("[3Dmol RenderCore] No atoms to render.");
                    viewer.render(); // Render empty scene
                    return;
                }

                // Add atoms using addModel/addAtoms
                let model = viewer.addModel();
                model.addAtoms(currentAtoms); // Add the generated atom data
                console.log("[3Dmol RenderCore] Added atoms to model.");

                // Define atom style based on currentViewStyle
                let styleSpec = {};
                const baseStickRadius = 0.08;
                const ballScale = 0.35; // Percentage of vdW radius for ball-and-stick spheres
                const spacefillScale = 0.65; // Percentage of vdW radius for spacefill spheres
                 const colorScheme = { prop: 'elem', map: atomColors }; // Use uppercase map

                switch (currentViewStyle) {
                  case "stick":
                    styleSpec = {
                      stick: { radius: baseStickRadius, colorscheme: colorScheme },
                      // Optionally add tiny spheres at nodes if desired:
                      // sphere: { scale: 0.1, colorscheme: colorScheme }
                    };
                    // Explicitly set bond cutoff if provided, otherwise let 3Dmol guess
                    if (!isNaN(bondCutoffJson) && bondCutoffJson > 0) { model.setBondCutoff(bondCutoffJson); console.log(`[3Dmol Style] Using JSON bond cutoff: ${bondCutoffJson}`); }
                    else { console.log(`[3Dmol Style] Using default bond cutoff for stick.`); }
                    break;
                  case "ballAndStick":
                    styleSpec = {
                      stick: { radius: baseStickRadius, colorscheme: colorScheme },
                      sphere: { scale: ballScale, colorscheme: colorScheme, radiusType: 'vdw' } // Scale vdW radius
                    };
                    if (!isNaN(bondCutoffJson) && bondCutoffJson > 0) { model.setBondCutoff(bondCutoffJson); console.log(`[3Dmol Style] Using JSON bond cutoff: ${bondCutoffJson}`); }
                    else { console.log(`[3Dmol Style] Using default bond cutoff for ball&stick.`); }
                    break;
                  case "spacefill":
                  default: // Fallback to spacefill
                    styleSpec = {
                        sphere: { colorscheme: colorScheme, scale: spacefillScale, radiusType: 'vdw' } // Scale vdW radius
                        // Optionally add radii map if vdW lookups fail: radiusMap: atomRadii
                    };
                    // No bonds needed for spacefill
                    break;
                }
                viewer.setStyle({}, styleSpec); // Apply the chosen style
                console.log(`[3Dmol RenderCore] Applied style "${currentViewStyle}"`);

                // Re-draw cell outline if it should be visible
                drawUnitCellOutline(); // This checks cellShown internally

                // Set atom click behavior (optional)
                viewer.setClickable({}, true, (atom, vwr, event, container) => {
                    vwr.removeAllLabels(); // Clear previous click labels
                    console.log("Clicked atom:", atom); // Log full atom data from 3Dmol
                    vwr.addLabel(`Atom ${atom.serial}: ${atom.elem} (${atom.atom})<br>Pos: (${atom.x.toFixed(2)}, ${atom.y.toFixed(2)}, ${atom.z.toFixed(2)})`, {
                        position: { x: atom.x, y: atom.y, z: atom.z },
                        backgroundColor: 'rgba(255, 255, 220, 0.85)', // Light yellow background
                        backgroundOpacity: 0.85,
                        borderColor: 'black',
                        borderWidth: 0.5,
                        fontSize: 10,
                        fontColor: 'black'
                    });
                    // Optional: Remove label after a delay
                     setTimeout(() => { if(vwr) vwr.removeAllLabels(); }, 3000);
                 });

                // Zoom to fit the model and render the scene
                viewer.zoomTo();
                viewer.render();
                console.log("[3Dmol RenderCore] Render complete.");

            } catch (e) {
                console.error("!!! [3Dmol Error] Error during renderCore:", e);
                displayViewerError(`Error during rendering: ${e.message}`);
            }
        } // --- END renderCore ---


        // --- Function to Regenerate Atoms AND Render ---
        // Called when composition or supercell size changes
        function regenerateAndRender() {
            console.log("--- [3Dmol Action] regenerateAndRender ---");
            // Get current values from controls
            if (compSlider) { currentComposition = parseFloat(compSlider.value); }
            // currentSupercell is updated by its button listener directly

            // Update composition display value if it exists
            if (compValueDisplay) compValueDisplay.textContent = `x = ${currentComposition.toFixed(2)}`;

            // Generate new atom data
            const atomDataResult = generateAtomData(currentComposition, currentSupercell);

            // Call the core rendering function with the new data
            renderCore(atomDataResult);
        }

        // --- Function to Update View Options AND Render ---
        // Called when style or cell visibility changes (doesn't regenerate atoms)
        function redrawView() {
            console.log("--- [3Dmol Action] redrawView (calls renderCore with existing atoms) ---");
            // This function just triggers a re-render with existing atoms but potentially new style/cell
            // We need the atom data and the lattice constant used to generate them
            const existingAtomDataResult = { atoms: currentAtoms, latticeConstant: latticeConstant };
            renderCore(existingAtomDataResult); // Re-render with current atom data
        }


        // --- Event Listeners Setup ---
        function setupButtonListener(idSuffix, callback) {
            const button = document.getElementById(`${controlsElementId}-${idSuffix}`);
            if(button) {
                button.addEventListener("click", callback);
            } else {
                console.warn(`Button with ID suffix '${idSuffix}' (full ID: ${controlsElementId}-${idSuffix}) not found.`);
            }
        }

        // Helper to update active class on buttons within a group
        function updateActiveButtons(clickedButton, buttonGroupSelector) {
            // Find the closest ancestor div with the specified class
            const buttonGroup = clickedButton.closest(buttonGroupSelector);
            if (!buttonGroup) {
                console.warn(`Could not find button group container matching selector: '${buttonGroupSelector}' for button`, clickedButton);
                // Fallback: Try finding relative to controlsElement if structure is flat
                const fallbackGroup = controlsElement.querySelector(buttonGroupSelector);
                if (fallbackGroup) {
                     fallbackGroup.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                } else {
                    // If still not found, just toggle the clicked button (less ideal)
                    clickedButton.closest('.control-group')?.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                }
            } else {
                 buttonGroup.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            }
            clickedButton.classList.add('active');
        }

        // Composition Slider Listener (only if slider exists)
        if (compSlider) {
             compSlider.addEventListener("input", () => {
                 // Update display immediately on input for better feedback
                 if (compValueDisplay) compValueDisplay.textContent = `x = ${parseFloat(compSlider.value).toFixed(2)}`;
             });
             compSlider.addEventListener("change", regenerateAndRender); // Regenerate atoms only on final change
        }

        // Style Button Listeners
        controlsElement.querySelectorAll('.viz-controls button').forEach(button => {
            button.addEventListener('click', function() {
                const newStyle = this.dataset.style;
                if (currentViewStyle !== newStyle) { // Only redraw if style actually changed
                    currentViewStyle = newStyle;
                    updateActiveButtons(this, '.viz-controls');
                    redrawView(); // Redraw scene with new style, same atoms
                }
            });
        });

        // Cell Button Listeners
        setupButtonListener("btn-show-cell", (e) => {
            if (!cellShown) {
                cellShown = true;
                updateActiveButtons(e.target, '.cell-controls');
                redrawView(); // Redraw to show cell
            }
        });
        setupButtonListener("btn-hide-cell", (e) => {
            if (cellShown) {
                cellShown = false;
                updateActiveButtons(e.target, '.cell-controls');
                redrawView(); // Redraw to hide cell
            }
        });

        // Supercell Button Listeners
        controlsElement.querySelectorAll('.supercell-controls button').forEach(button => {
            button.addEventListener('click', function() {
                 const newSize = parseInt(this.dataset.size);
                 if (currentSupercell !== newSize) { // Only regenerate if size changed
                     currentSupercell = newSize;
                     updateActiveButtons(this, '.supercell-controls');
                     regenerateAndRender(); // Regenerate atoms for new supercell size AND render
                 }
            });
        });

        // Action Button Listeners
        setupButtonListener("btn-spin", () => {
            if (viewer && !isSpinning) { viewer.spin(true); isSpinning = true; }
        });
        setupButtonListener("btn-stop", () => {
            if (viewer && isSpinning) { viewer.spin(false); isSpinning = false; }
        });
        setupButtonListener("btn-screenshot", function() {
            if (!viewer) return;
            try {
                let imageData = viewer.pngURI();
                let link = document.createElement('a');
                const safeMaterialName = (allMaterialDetails.materialName || 'structure').replace(/ /g, '_').toLowerCase();
                let compString = (vizData.composition.min_x !== vizData.composition.max_x) ? `_x${currentComposition.toFixed(2)}` : "";
                link.download = `${safeMaterialName}_${structureType}${compString}_${currentSupercell}x${currentSupercell}x${currentSupercell}_${currentViewStyle}.png`;
                link.href = imageData;
                document.body.appendChild(link); // Required for Firefox
                link.click();
                document.body.removeChild(link);
                console.log("[3Dmol Action] Screenshot generated.");
            } catch (e) {
                 console.error("[3Dmol Error] Failed to generate screenshot:", e);
                 // Optionally display a user-friendly message
            }
        });

        // Add resize handler to adapt viewer size
        let resizeTimeout;
        const resizeObserver = new ResizeObserver(entries => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (viewer && viewer.resize) { // Check if viewer and resize method exist
                    viewer.resize();
                    console.log("[3Dmol Action] Viewer resized.");
                }
            }, 150); // Debounce resize events
        });
        // Observe the container element that holds the viewer
        resizeObserver.observe(viewerElement.parentElement || viewerElement); // Observe parent or viewer itself

        // --- Initial Render ---
        console.log("[3Dmol Init] Performing initial render...");
        regenerateAndRender(); // Generate initial atoms and render the scene

        console.log("--- [3Dmol Init] Initialization Complete ---");

    } // --- END initialize3DViewer FUNCTION ---


}); // End DOMContentLoaded Event Listener
