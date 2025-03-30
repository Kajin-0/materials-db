document.addEventListener("DOMContentLoaded", async () => {
    // --- Get parameters from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const materialNameParam = urlParams.get("material");
    const sectionKeyParam = urlParams.get("section");

    // --- Get DOM elements ---
    const sectionDisplayNameEl = document.getElementById("section-display-name");
    const materialContextEl = document.getElementById("material-context");
    const sectionIntroEl = document.getElementById("section-introduction");
    const propertiesContainerEl = document.getElementById("properties-container");
    // REMOVED: const darkCurrentContainerEl = document.getElementById("dark-current-container");
    const referencesSectionEl = document.getElementById("references-section");
    const referencesListEl = document.getElementById("references-list");

    const displayError = (message) => {
        console.error("[Section Detail] Error:", message);
        if (sectionDisplayNameEl) sectionDisplayNameEl.textContent = "Error";
        if (materialContextEl) materialContextEl.textContent = "";
        if (propertiesContainerEl) propertiesContainerEl.innerHTML = `<p class="error-message">Could not load section details: ${message}</p>`;
        document.title = "Error - Section Detail";
    };

    // --- Validate parameters ---
    if (!materialNameParam || !sectionKeyParam) {
        displayError("Material name or section key missing from URL parameters.");
        return;
    }

    const materialName = decodeURIComponent(materialNameParam);
    const sectionKey = decodeURIComponent(sectionKeyParam);

    // Update context immediately
    if (materialContextEl) materialContextEl.textContent = `for ${materialName}`;

    // --- Construct file path ---
    const safeMaterialName = materialName.replace(/ /g, '_').toLowerCase();
    const detailFilePath = `./details/${safeMaterialName}_details.json`;

    console.log(`[Section Detail] Loading section '${sectionKey}' for material '${materialName}' from '${detailFilePath}'`);

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
        const sectionData = materialDetails[sectionKey];

        if (!sectionData) {
            throw new Error(`Section key '${sectionKey}' not found within the data for '${materialName}'.`);
        }

        // --- Populate Header and Introduction ---
        const sectionDisplayName = sectionData.displayName || sectionKey.split('.').pop().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (sectionDisplayNameEl) sectionDisplayNameEl.textContent = sectionDisplayName;
        document.title = `${sectionDisplayName} - ${materialName}`;

        if (sectionData.introduction && sectionIntroEl) {
            sectionIntroEl.innerHTML = sectionData.introduction;
            sectionIntroEl.style.display = 'block';
        } else if (sectionIntroEl) {
            sectionIntroEl.style.display = 'none';
        }

        // --- Process References ---
        const collectedRefs = new Set();
        const processRefs = (data) => {
             if (typeof data === 'object' && data !== null) {
                 if (data.ref && materialDetails.references && materialDetails.references[data.ref]) {
                     collectedRefs.add(data.ref);
                 }
                 Object.values(data).forEach(processRefs);
             } else if (Array.isArray(data)) {
                 data.forEach(processRefs);
             }
        };
        processRefs(sectionData.properties); // Only scan properties block for refs now


        // --- Populate Properties ---
        if (propertiesContainerEl && sectionData.properties && typeof sectionData.properties === 'object') {
            propertiesContainerEl.innerHTML = ''; // Clear
            Object.entries(sectionData.properties).forEach(([propKey, propData]) => {
                // --- Start of code to create propBlock --- (Same as previous correct version)
                const propBlock = document.createElement('div');
                propBlock.className = 'property-detail-block';
                propBlock.id = `prop_${sectionKey.replace(/\./g, '_')}_${propKey}`;

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
                        if (!detailContent || (Array.isArray(detailContent) && detailContent.length === 0)) continue;

                        const subsection = document.createElement('div');
                        subsection.className = `detail-subsection ${detailKey}`;

                        const subsectionTitle = document.createElement('h4');
                        subsectionTitle.textContent = detailKey.charAt(0).toUpperCase() + detailKey.slice(1);
                        subsection.appendChild(subsectionTitle);

                        if ((detailKey === 'notes' || detailKey === 'significance') && Array.isArray(detailContent)) {
                            const ul = document.createElement('ul');
                            detailContent.forEach(item => { const li = document.createElement('li'); li.innerHTML = item; ul.appendChild(li); });
                            subsection.appendChild(ul);
                        } else if (detailKey === 'equations' && Array.isArray(detailContent)) {
                             detailContent.forEach(eq => {
                                const eqBlock = document.createElement('div'); eqBlock.className = 'equation-block';
                                if (eq.name) { const nameEl = document.createElement('span'); nameEl.className = 'eq-name'; nameEl.textContent = eq.name; eqBlock.appendChild(nameEl); }
                                if (eq.description) { const descEl = document.createElement('p'); descEl.className = 'eq-desc'; descEl.innerHTML = eq.description; eqBlock.appendChild(descEl); }
                                if (eq.formula_html) { const formulaEl = document.createElement('div'); formulaEl.className = 'eq-formula-html'; formulaEl.innerHTML = eq.formula_html; eqBlock.appendChild(formulaEl); }
                                else if (eq.formula_plain) { const formulaEl = document.createElement('div'); formulaEl.className = 'eq-formula-plain'; formulaEl.textContent = eq.formula_plain; eqBlock.appendChild(formulaEl); }
                                else if (eq.formula_latex) { /* Placeholder logic */ }
                                if(eq.units){ const unitsEl = document.createElement('div'); unitsEl.className = 'eq-units'; unitsEl.innerHTML = `Units: ${eq.units}`; eqBlock.appendChild(unitsEl); }
                                if (eq.variables && Array.isArray(eq.variables)) {
                                    const varsDiv = document.createElement('div'); varsDiv.className = 'eq-vars'; varsDiv.innerHTML = '<strong>Variables:</strong>'; const varsUl = document.createElement('ul');
                                    eq.variables.forEach(v => { const li = document.createElement('li'); li.innerHTML = `<strong>${v.symbol}:</strong> ${v.description}`; varsUl.appendChild(li); });
                                    varsDiv.appendChild(varsUl); eqBlock.appendChild(varsDiv); }
                                if (eq.ref) { const refEl = document.createElement('div'); refEl.className = 'eq-ref'; refEl.innerHTML = `Ref: <a href="#ref-${eq.ref}" class="ref-link" data-ref-key="${eq.ref}">${eq.ref}</a>`; eqBlock.appendChild(refEl); }
                                subsection.appendChild(eqBlock); });
                        } else if (detailKey === 'measurement' && typeof detailContent === 'object') {
                            if(detailContent.techniques && Array.isArray(detailContent.techniques)){ const ul = document.createElement('ul'); detailContent.techniques.forEach(tech => { const li = document.createElement('li'); li.innerHTML = tech; ul.appendChild(li); }); subsection.appendChild(ul); }
                            if(detailContent.notes && Array.isArray(detailContent.notes)){ detailContent.notes.forEach(note => { const p = document.createElement('p'); p.innerHTML = note; p.style.fontSize = '0.9em'; p.style.color = '#555'; subsection.appendChild(p); });
                            } else if (typeof detailContent === 'string') { const p = document.createElement('p'); p.innerHTML = detailContent; subsection.appendChild(p); }
                        } else if (typeof detailContent === 'string') { const p = document.createElement('p'); p.innerHTML = detailContent; subsection.appendChild(p);
                        } else { console.warn(`Unhandled detail type '${detailKey}'`); }

                        if(subsection.children.length > 1) propBlock.appendChild(subsection);
                    }
                }
                 // --- End of code to create propBlock ---
                propertiesContainerEl.appendChild(propBlock);
            });
        } else {
            if (propertiesContainerEl) propertiesContainerEl.innerHTML = '<p>No specific properties detailed for this section yet.</p>';
        }

        // --- REMOVED Dark Current Section Population Logic ---


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

             // Add smooth scroll for internal reference links - EVENT DELEGATION
             // Listener only needed on properties container now
             propertiesContainerEl.addEventListener('click', handleRefLinkClick);

        } else if(referencesSectionEl){
             referencesSectionEl.style.display = 'none';
        }

    } catch (error) {
        displayError(error.message || "An unknown error occurred.");
    }

    // Function to handle reference link clicks (for smooth scroll)
    function handleRefLinkClick(event) {
        if (event.target.classList.contains('ref-link') && event.target.dataset.refKey) {
            event.preventDefault();
            const targetId = `ref-${event.target.dataset.refKey}`;
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

}); // End DOMContentLoaded
