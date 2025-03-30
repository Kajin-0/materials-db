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
    // Replace spaces with underscores for the filename convention we chose
    const safeMaterialName = materialName.replace(/ /g, '_');
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

        // --- Find the specific section data ---
        const sectionData = materialDetails[sectionKey];

        if (!sectionData) {
            throw new Error(`Section key '${sectionKey}' not found within the data for '${materialName}'.`);
        }

        // --- Populate the page ---
        const sectionDisplayName = sectionData.displayName || sectionKey.split('.').pop().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Fallback formatting
        if (sectionDisplayNameEl) sectionDisplayNameEl.textContent = sectionDisplayName;
        document.title = `${sectionDisplayName} - ${materialName}`;

        if (sectionData.introduction && sectionIntroEl) {
            sectionIntroEl.textContent = sectionData.introduction;
            sectionIntroEl.style.display = 'block';
        } else if (sectionIntroEl) {
            sectionIntroEl.style.display = 'none';
        }

        // --- Populate Properties ---
        if (propertiesContainerEl && sectionData.properties && typeof sectionData.properties === 'object') {
            propertiesContainerEl.innerHTML = ''; // Clear loading/error
            const collectedRefs = new Set(); // To store unique reference keys used

            Object.entries(sectionData.properties).forEach(([propKey, propData]) => {
                const propBlock = document.createElement('div');
                propBlock.className = 'property-detail-block';
                propBlock.id = `prop_${sectionKey.replace(/\./g, '_')}_${propKey}`; // Create a unique ID

                const propTitle = document.createElement('h3');
                propTitle.textContent = propData.displayName || propKey.replace(/_/g, ' '); // Fallback formatting
                propBlock.appendChild(propTitle);

                if (propData.summary) {
                    const summaryEl = document.createElement('div');
                    summaryEl.className = 'summary';
                    summaryEl.textContent = propData.summary;
                    propBlock.appendChild(summaryEl);
                }

                // Process details subsections (notes, equations, measurement, significance)
                if (propData.details && typeof propData.details === 'object') {
                    for (const [detailKey, detailContent] of Object.entries(propData.details)) {
                        const subsection = document.createElement('div');
                        subsection.className = `detail-subsection ${detailKey}`; // e.g., detail-subsection notes

                        const subsectionTitle = document.createElement('h4');
                        subsectionTitle.textContent = detailKey.charAt(0).toUpperCase() + detailKey.slice(1); // Capitalize
                        subsection.appendChild(subsectionTitle);

                        // Handle different detail types
                        if (detailKey === 'notes' && Array.isArray(detailContent)) {
                            const ul = document.createElement('ul');
                            detailContent.forEach(note => {
                                const li = document.createElement('li');
                                li.textContent = note;
                                ul.appendChild(li);
                            });
                            subsection.appendChild(ul);
                        } else if (detailKey === 'equations' && Array.isArray(detailContent)) {
                            detailContent.forEach(eq => {
                                const eqBlock = document.createElement('div');
                                eqBlock.className = 'equation-block';

                                if (eq.name) {
                                    const nameEl = document.createElement('span');
                                    nameEl.className = 'eq-name';
                                    nameEl.textContent = eq.name;
                                    eqBlock.appendChild(nameEl);
                                }
                                if (eq.description) {
                                     const descEl = document.createElement('p');
                                     descEl.className = 'eq-desc';
                                     descEl.textContent = eq.description;
                                     eqBlock.appendChild(descEl);
                                }
                                // Prefer plain formula, add placeholder for LaTeX rendering later
                                if (eq.formula_plain) {
                                    const formulaEl = document.createElement('div');
                                    formulaEl.className = 'eq-formula-plain';
                                    formulaEl.textContent = eq.formula_plain;
                                    eqBlock.appendChild(formulaEl);
                                } else if (eq.formula_latex) {
                                    const formulaEl = document.createElement('div');
                                    formulaEl.className = 'eq-formula-latex';
                                    formulaEl.textContent = `[LaTeX Placeholder: ${eq.formula_latex}]`; // Placeholder
                                    eqBlock.appendChild(formulaEl);
                                }
                                if(eq.units){
                                     const unitsEl = document.createElement('div');
                                     unitsEl.style.fontSize = '0.9em';
                                     unitsEl.style.color = '#555';
                                     unitsEl.style.marginBottom = '0.5rem';
                                     unitsEl.textContent = `Units: ${eq.units}`;
                                     eqBlock.appendChild(unitsEl);
                                }
                                if (eq.variables && Array.isArray(eq.variables)) {
                                    const varsDiv = document.createElement('div');
                                    varsDiv.className = 'eq-vars';
                                    varsDiv.innerHTML = '<strong>Variables:</strong>';
                                    const varsUl = document.createElement('ul');
                                    eq.variables.forEach(v => {
                                        const li = document.createElement('li');
                                        li.innerHTML = `<strong>${v.symbol}:</strong> ${v.description}`;
                                        varsUl.appendChild(li);
                                    });
                                    varsDiv.appendChild(varsUl);
                                    eqBlock.appendChild(varsDiv);
                                }
                                if (eq.ref && materialDetails.references && materialDetails.references[eq.ref]) {
                                    collectedRefs.add(eq.ref); // Add ref key to set
                                    const refEl = document.createElement('div');
                                    refEl.className = 'eq-ref';
                                    refEl.innerHTML = `Ref: <a href="#" class="ref-link" data-ref-key="${eq.ref}">${eq.ref}</a>`;
                                    eqBlock.appendChild(refEl);
                                }
                                subsection.appendChild(eqBlock);
                            });
                        } else if (detailKey === 'measurement' && typeof detailContent === 'object') {
                            if(detailContent.techniques && Array.isArray(detailContent.techniques)){
                                const ul = document.createElement('ul');
                                detailContent.techniques.forEach(tech => {
                                    const li = document.createElement('li');
                                    li.textContent = tech;
                                    ul.appendChild(li);
                                });
                                subsection.appendChild(ul);
                            }
                            if(detailContent.notes && Array.isArray(detailContent.notes)){
                                detailContent.notes.forEach(note => {
                                    const p = document.createElement('p');
                                    p.textContent = note;
                                    p.style.fontSize = '0.9em'; // Smaller notes
                                    p.style.color = '#555';
                                    subsection.appendChild(p);
                                });
                            } else if (typeof detailContent === 'string') { // Handle simple string case too
                                const p = document.createElement('p');
                                p.textContent = detailContent;
                                subsection.appendChild(p);
                            }

                        } else if (detailKey === 'significance' && Array.isArray(detailContent)) {
                              const ul = document.createElement('ul');
                              detailContent.forEach(sig => {
                                  const li = document.createElement('li');
                                  li.textContent = sig;
                                  ul.appendChild(li);
                              });
                              subsection.appendChild(ul);
                        }
                         else if (typeof detailContent === 'string') { // Handle other simple string details
                            const p = document.createElement('p');
                            p.textContent = detailContent;
                            subsection.appendChild(p);
                        } else {
                            console.warn(`Unhandled detail type '${detailKey}' for property '${propKey}'`);
                        }

                        // Only append subsection if it contains more than just the title
                        if(subsection.children.length > 1) {
                           propBlock.appendChild(subsection);
                        }
                    }
                }
                propertiesContainerEl.appendChild(propBlock);
            });


            // --- Populate References ---
            if (collectedRefs.size > 0 && referencesListEl && materialDetails.references) {
                 referencesListEl.innerHTML = ''; // Clear any loading/error
                 collectedRefs.forEach(refKey => {
                     const refData = materialDetails.references[refKey];
                     if(refData){
                         const li = document.createElement('li');
                         li.id = `ref-${refKey}`; // ID for potential linking
                         let linkHtml = refData.text;
                         if(refData.doi){
                             linkHtml += ` <a href="https://doi.org/${refData.doi}" target="_blank" title="View via DOI">[DOI]</a>`;
                         }
                         li.innerHTML = `<strong>[${refKey}]</strong> ${linkHtml}`;
                         referencesListEl.appendChild(li);
                     }
                 });
                 referencesSectionEl.style.display = 'block'; // Show the section

                 // Add smooth scroll for internal reference links
                 propertiesContainerEl.addEventListener('click', (e) => {
                     if (e.target.classList.contains('ref-link') && e.target.dataset.refKey) {
                         e.preventDefault();
                         const targetId = `ref-${e.target.dataset.refKey}`;
                         const targetElement = document.getElementById(targetId);
                         if (targetElement) {
                             targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                             // Optional: Highlight the reference briefly
                             targetElement.style.backgroundColor = '#ffff99';
                             setTimeout(() => { targetElement.style.backgroundColor = ''; }, 1500);
                         }
                     }
                 });

            } else if(referencesSectionEl){
                 referencesSectionEl.style.display = 'none'; // Hide if no refs used
            }

        } else {
             // Handle case where section is found but has no properties block
             if (propertiesContainerEl) propertiesContainerEl.innerHTML = '<p>No specific properties detailed for this section yet.</p>';
        }


    } catch (error) {
        displayError(error.message || "An unknown error occurred.");
    }
});
