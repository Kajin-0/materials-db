document.addEventListener("DOMContentLoaded", async () => {
    // --- Get parameters from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");

    // --- Get DOM elements ---
    const materialNameEl = document.getElementById("material-name");
    const tocListEl = document.getElementById("toc-list");
    const mainContentEl = document.getElementById("main-content"); // Container for all sections
    const referencesSectionEl = document.getElementById("references-section");
    const referencesListEl = document.getElementById("references-list");
    // Removed containerEl as error message is placed in mainContentEl now

    const displayError = (message) => {
        console.error("[Full Detail] Error:", message);
        if (materialNameEl) materialNameEl.textContent = "Error Loading Material";
        if (tocListEl) tocListEl.innerHTML = '<li>Error loading contents</li>';
        // Display error within the main content area
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
            if (response.status === 404) {
                throw new Error(`Details file not found: ${detailFilePath}. Ensure the file exists and the naming convention matches.`);
            } else {
                throw new Error(`HTTP error ${response.status} fetching ${detailFilePath}`);
            }
        }

        const materialDetails = await response.json();

        // --- Process References (Collect all unique refs used anywhere) ---
        const collectedRefs = new Set();
        const processRefs = (data) => {
             if (typeof data === 'object' && data !== null) {
                 if (data.ref && materialDetails.references && materialDetails.references[data.ref]) {
                     collectedRefs.add(data.ref);
                 }
                 Object.values(data).forEach(value => {
                     if (typeof value === 'object' || Array.isArray(value)) { processRefs(value); }
                 });
             } else if (Array.isArray(data)) { data.forEach(processRefs); }
        };
        processRefs(materialDetails);


        // --- Build Table of Contents & Populate Sections ---
        if (tocListEl && mainContentEl) {
            tocListEl.innerHTML = ''; // Clear loading state

            // Iterate through top-level keys (excluding materialName and references)
            for (const sectionKey in materialDetails) {
                if (sectionKey === 'materialName' || sectionKey === 'references') continue;

                const sectionData = materialDetails[sectionKey];
                if (typeof sectionData !== 'object' || sectionData === null) continue;

                const sectionDisplayName = sectionData.displayName || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const sectionId = `section-${sectionKey}`; // Use key for ID

                // Add TOC entry
                const tocLi = document.createElement('li');
                const tocLink = document.createElement('a');
                tocLink.href = `#${sectionId}`;
                tocLink.textContent = sectionDisplayName;
                tocLi.appendChild(tocLink);
                tocListEl.appendChild(tocLi);

                // Find the corresponding section placeholder in HTML
                const sectionElement = document.getElementById(sectionId);
                if (!sectionElement) {
                    console.warn(`HTML section placeholder with id '${sectionId}' not found. Skipping rendering for this section.`);
                    continue;
                }

                // Populate Section Header
                const sectionTitleEl = document.getElementById(`${sectionId}-title`);
                if(sectionTitleEl) sectionTitleEl.textContent = sectionDisplayName;

                // Populate Section Introduction
                const sectionIntroEl = document.getElementById(`${sectionId}-intro`);
                if (sectionIntroEl) {
                    if (sectionData.introduction) {
                        sectionIntroEl.innerHTML = sectionData.introduction;
                        sectionIntroEl.style.display = 'block';
                    } else {
                        sectionIntroEl.style.display = 'none';
                    }
                }

                // Populate Properties within the section
                const propertiesContainerEl = document.getElementById(`${sectionId}-properties`);
                if (propertiesContainerEl && sectionData.properties && typeof sectionData.properties === 'object') {
                    propertiesContainerEl.innerHTML = ''; // Clear any potential placeholder

                    // *** CORRECTED LOOP ***
                    Object.entries(sectionData.properties).forEach(([propKey, propData]) => {
                        // Call renderPropertyBlock to CREATE the block
                        const propertyBlockElement = renderPropertyBlock(propKey, propData, materialDetails);
                        // Append the returned block DIRECTLY to this section's container
                        if (propertyBlockElement) {
                             propertiesContainerEl.appendChild(propertyBlockElement);
                        }
                    });
                    // *** REMOVED erroneous appendChild call after loop ***

                } else if (propertiesContainerEl) {
                    propertiesContainerEl.style.display = 'none';
                }

                 // Make the whole section visible
                 sectionElement.style.display = 'block';

            } // End loop through sections
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

             mainContentEl.addEventListener('click', handleRefLinkClick);

        } else if(referencesSectionEl){
             referencesSectionEl.style.display = 'none';
        }

    } catch (error) {
        displayError(error.message || "An unknown error occurred.");
    }

    // --- Helper Function to Render a Single Property Block ---
    // *** CORRECTED: Returns the created block element, does not take container arg ***
    function renderPropertyBlock(propKey, propData, allDetails) {
        const propBlock = document.createElement('div');
        propBlock.className = 'property-detail-block';

        const propTitle = document.createElement('h3');
        propTitle.innerHTML = propData.displayName || propKey.replace(/_/g, ' ');
        propBlock.appendChild(propTitle);

        if (propData.summary) {
            const summaryEl = document.createElement('div');
            summaryEl.className = 'summary';
            summaryEl.innerHTML = propData.summary;
            propBlock.appendChild(summaryEl);
        }

        if (propData.details && typeof propData.details === 'object') {
             for (const [detailKey, detailContent] of Object.entries(propData.details)) {
                 if (!detailContent || (Array.isArray(detailContent) && detailContent.length === 0) || (typeof detailContent === 'object' && !Array.isArray(detailContent) && Object.keys(detailContent).length === 0) ) continue;

                 const subsection = document.createElement('div');
                 subsection.className = `detail-subsection ${detailKey.replace(/ /g, '_').toLowerCase()}`;

                 const subsectionTitle = document.createElement('h4');
                 subsection.appendChild(subsectionTitle); // Title content added via CSS ::before

                 if (Array.isArray(detailContent) && detailKey !== 'equations') { // List of strings
                     const ul = document.createElement('ul');
                     detailContent.forEach(item => { const li = document.createElement('li'); li.innerHTML = item; ul.appendChild(li); });
                     subsection.appendChild(ul);
                 } else if (detailKey === 'equations' && Array.isArray(detailContent)) { // Equations array
                      detailContent.forEach(eq => {
                         const eqBlock = document.createElement('div'); eqBlock.className = 'equation-block';
                         if (eq.name) { const nameEl = document.createElement('span'); nameEl.className = 'eq-name'; nameEl.textContent = eq.name; eqBlock.appendChild(nameEl); }
                         if (eq.description) { const descEl = document.createElement('p'); descEl.className = 'eq-desc'; descEl.innerHTML = eq.description; eqBlock.appendChild(descEl); }
                         if (eq.formula_html) { const formulaEl = document.createElement('div'); formulaEl.className = 'eq-formula-html'; formulaEl.innerHTML = eq.formula_html; eqBlock.appendChild(formulaEl); }
                         else if (eq.formula_plain) { const formulaEl = document.createElement('div'); formulaEl.className = 'eq-formula-plain'; formulaEl.textContent = eq.formula_plain; eqBlock.appendChild(formulaEl); }
                         else if (eq.formula_latex) { /* Placeholder */ }
                         if(eq.units){ const unitsEl = document.createElement('div'); unitsEl.className = 'eq-units'; unitsEl.innerHTML = `Units: ${eq.units}`; eqBlock.appendChild(unitsEl); }
                         if (eq.variables && Array.isArray(eq.variables)) {
                             const varsDiv = document.createElement('div'); varsDiv.className = 'eq-vars'; varsDiv.innerHTML = '<strong>Variables:</strong>'; const varsUl = document.createElement('ul');
                             eq.variables.forEach(v => { const li = document.createElement('li'); li.innerHTML = `<strong>${v.symbol}:</strong> ${v.description}`; varsUl.appendChild(li); });
                             varsDiv.appendChild(varsUl); eqBlock.appendChild(varsDiv); }
                         if (eq.ref && allDetails.references && allDetails.references[eq.ref]) {
                             const refEl = document.createElement('div'); refEl.className = 'eq-ref';
                             refEl.innerHTML = `Ref: <a href="#ref-${eq.ref}" class="ref-link" data-ref-key="${eq.ref}">${eq.ref}</a>`;
                             eqBlock.appendChild(refEl);
                         }
                         subsection.appendChild(eqBlock); });
                 } else if (detailKey === 'measurement_characterization' && typeof detailContent === 'object') { // Measurement object
                     if(detailContent.techniques && Array.isArray(detailContent.techniques)){
                         const techDiv = document.createElement('div'); techDiv.className = "techniques";
                         const ulTech = document.createElement('ul');
                         detailContent.techniques.forEach(tech => { const li = document.createElement('li'); li.innerHTML = tech; ulTech.appendChild(li); });
                         techDiv.appendChild(ulTech); subsection.appendChild(techDiv);
                     }
                     if(detailContent.considerations && Array.isArray(detailContent.considerations)){
                         const considDiv = document.createElement('div'); considDiv.className = "considerations";
                         if (detailContent.techniques && subsection.querySelector('.techniques')) {
                              const considTitle = document.createElement('p'); considTitle.innerHTML = '<strong>Considerations:</strong>'; considTitle.style.marginTop = '1rem';
                              considDiv.appendChild(considTitle);
                         }
                         const ulConsid = document.createElement('ul');
                         detailContent.considerations.forEach(note => { const li = document.createElement('li'); li.innerHTML = note; ulConsid.appendChild(li); });
                         considDiv.appendChild(ulConsid); subsection.appendChild(considDiv);
                     }
                 } else if (typeof detailContent === 'string') { // Simple string
                     const p = document.createElement('p'); p.innerHTML = detailContent; subsection.appendChild(p);
                 } else { console.warn(`Unhandled detail structure for key '${detailKey}'`); }

                 if(subsection.children.length > 1) propBlock.appendChild(subsection);
             }
        }
        // Return the fully constructed property block element
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
                const elementRect = targetElement.getBoundingClientRect();
                const absoluteElementTop = elementRect.top + window.pageYOffset;
                // Try scrolling slightly above the element's center
                const offset = window.innerHeight * 0.25; // Adjust offset as needed (e.g., 0.33 for third)
                const scrollToPosition = absoluteElementTop - offset;
                window.scrollTo({ top: scrollToPosition, behavior: 'smooth' });
            }
        }
    } // --- End handleRefLinkClick ---

}); // End DOMContentLoaded
