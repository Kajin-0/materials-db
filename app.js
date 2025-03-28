// ============================================
// Global Variables ... (Keep as before)
// Helper Functions ... (Keep as before)
// Core Logic Functions ... (Keep as before)
// ============================================

// ============================================
// Initialization Sequence (Runs on DOM Load)
// ============================================
document.addEventListener("DOMContentLoaded", async () => { // Make listener async
  console.log("DOM content loaded. Starting initialization sequence...");

  // Attach logo listener
  const logoElement = document.getElementById("logo");
  if (logoElement) {
      logoElement.addEventListener("click", () => location.reload());
      console.log("Logo click listener attached.");
  } else { console.warn("Logo element not found."); }

  // Ensure essential DOM elements exist
  const neededIds = ["searchInput", "suggestions", "results", "result-summary", "toolbar"];
  // ... (keep element check as before) ...
  let missingElement = false;
  for (const id of neededIds) {
      if (!document.getElementById(id)) {
          console.error(`Essential DOM element missing: #${id}. Aborting initialization.`);
          updateStatusMessage(`Error: Page structure incorrect (missing #${id}).`, true);
          missingElement = true;
      }
  }
  if (missingElement) return;

  disableFilters();

  try {
    // === STEP 1: Load Materials ===
    updateStatusMessage("Loading materials...");
    materials = await loadMaterials();
    console.log(`Material loading complete. ${materials.length} entries loaded.`);
    if (materials.length === 0) throw new Error("No material data loaded successfully.");

    // === STEP 2: Initialize Fuse ===
    updateStatusMessage("Initializing search index...");
    if (!initializeSearchIndex()) throw new Error("Search index initialization failed.");

    // === STEP 3: Check for Taxonomy and Populate Filters ===
    updateStatusMessage("Populating filters...");
    // **** ADDED CHECK ****
    if (typeof window.tagTaxonomy === 'undefined') {
        throw new Error("tagTaxonomy object not found. Check tagTaxonomy.js loading order and content.");
    }
    // *********************
    if (!populateFilterOptions()) throw new Error("Filter population failed.");

    // === STEP 4: Initialize Suggestions ===
    updateStatusMessage("Initializing suggestions...");
    initSuggestions();

    // === STEP 5: Initial Search & Cleanup ===
    updateStatusMessage(""); // Clear loading messages
    performSearch();
    console.log("Initialization sequence complete.");

  } catch (error) {
    // Catch errors from any step in the sequence
    console.error("Error during initialization sequence:", error);
    const summaryElement = document.getElementById("result-summary");
    if (summaryElement && !summaryElement.querySelector('p[style*="color: red"]')) {
       updateStatusMessage(error.message || "Critical failure during initialization. Check console.", true);
    }
    disableFilters();
  }

  // --- Event Listeners Setup (Attach AFTER elements are confirmed) ---
  // Search Input Listeners (now handled within initSuggestions)
  // Filter Change Listeners (now handled within populateFilterOptions)

  // Tag Click Listener (Delegate on results container)
  document.getElementById("results").addEventListener("click", (event) => {
    if (event.target.classList.contains("tag")) {
      const fullTag = event.target.title;
      if (fullTag) {
          performSearchWithTag(fullTag);
      } else {
          console.warn("Clicked tag missing title attribute.");
      }
    }
  });
}); // End DOMContentLoaded

console.log("app.js script successfully parsed.");

// --- Make sure ALL function definitions are ABOVE the DOMContentLoaded listener ---
// (fetchJson, loadMaterials, initializeSearchIndex, updateLoadingMessage, disableFilters,
// enableFilters, populateFilterOptions, initSuggestions, getActiveFilters,
// matchesFilters, performSearch, performSearchWithTag, displayResults)
// Ensure these functions are defined globally or hoisted properly before this point.
