import { isMainDomain } from "../../core/pageType";
import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage.js";
import "../../core/common.css";
import PerfectScrollbar from "perfect-scrollbar";
import "perfect-scrollbar/css/perfect-scrollbar.css";

class TextExpander {
  constructor() {
    this.expansions = new Map();
    this.originalExpansions = new Map(); // Store original state for cancel
    this.hasChanges = false;
    this.ps = null; // Store Perfect Scrollbar instance
    this.helperScriptId = "wbe-text-expander-helper";
    this.initializeExpansions().then(() => {
      this.setupEventListeners();
      this.injectHelperScript(); // inject helper for CodeMirror
      this.sendExpansionUpdate(); // send initial expansions
      this.addButtonListener();
      // Update the button's background image
      $("#textExpanderButton .icon--textExpander").css(
        "background-image",
        `url('${chrome.runtime.getURL("images/expand-right.svg")}')`
      );
    });
  }

  async initializeExpansions() {
    // Load from localStorage
    const stored = localStorage.getItem("wbe_text_expander_custom");
    if (stored) {
      try {
        const existingExpansions = JSON.parse(stored);
        this.expansions = new Map(Object.entries(existingExpansions));
      } catch (err) {
        this.initializeDefaultExpansions();
      }
    } else {
      // If no stored expansions, initialize with defaults
      this.initializeDefaultExpansions();
    }
  }

  initializeDefaultExpansions() {
    // Start with defaults
    const defaultExpansions = new Map([
      ["wt", "WikiTree"],
      ["wt+", "WikiTree+"],
      ["fs", "FamilySearch"],
      ["fg", "FindAGrave"],
      ["anc", "Ancestry"],
      ["myh", "MyHeritage"],
      ["ged", "GEDCOM"],
      ["dna", "DNA"],
      ["rn", "== Research Notes =="],
    ]);

    if (this.expansions.size == 0) {
      this.expansions = defaultExpansions;
    }

    this.saveCustomExpansions();
  }

  /** Injects cm_helper.js via chrome-extension:// URL */
  injectHelperScript() {
    if (document.getElementById(this.helperScriptId)) return; // already in

    const scriptURL = chrome.runtime.getURL("features/text_expander/cm_helper.js");

    const s = document.createElement("script");
    s.id = this.helperScriptId;
    s.src = scriptURL;
    s.onload = () => {};
    s.onerror = () => {};
    document.documentElement.appendChild(s);
  }

  /** Sends current expansions to helper */
  sendExpansionUpdate() {
    const expansions = Object.fromEntries(this.expansions);

    // Load and execute the event dispatcher script with expansions data
    const dispatcher = document.createElement("script");
    dispatcher.src = chrome.runtime.getURL("features/text_expander/event_dispatcher.js");
    dispatcher.setAttribute("data-expansions", JSON.stringify({ expansions }));
    dispatcher.onload = () => {
      dispatcher.remove();
    };
    dispatcher.onerror = () => {};
    document.documentElement.appendChild(dispatcher);
  }

  saveCustomExpansions() {
    const expansionsObj = Object.fromEntries(this.expansions);
    localStorage.setItem("wbe_text_expander_custom", JSON.stringify(expansionsObj));
    this.sendExpansionUpdate(); // inform helper of changes

    // Trigger a refresh of any existing CodeMirror instances
    const refreshEvent = new CustomEvent("wbeTextExpanderRefresh");
    document.dispatchEvent(refreshEvent);
  }

  addButtonListener() {
    $(document).on("click", "#textExpanderButton", (e) => {
      e.preventDefault();
      this.showManageDialog();
    });
  }

  showManageDialog() {
    // Store original state for cancel functionality
    this.originalExpansions = new Map(this.expansions);
    this.hasChanges = false;

    const dialog = $(`
      <div id="textExpanderDialog" class="wbe-popup">
        <h1>Text Expander<span class="close-popup">&times;</span></h1>
        <div class="expansions-list">
          <table>
            <thead>
              <tr>
                <th>Abbreviation</th>
                <th>Expansion</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${Array.from(this.expansions.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(
                  ([abbr, expansion]) => `
                  <tr>
                    <td>
                      <input type="text" class="abbr-input" value="${abbr}" data-original="${abbr}">
                    </td>
                    <td>
                      <input type="text" class="expansion-input" value="${expansion}">
                    </td>
                    <td>
                      <button class="delete-expansion" data-abbr="${abbr}" title="Delete">🗑️</button>
                    </td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="add-expansion">
          <input type="text" id="newAbbr" placeholder="Abbreviation">
          <input type="text" id="newExpansion" placeholder="Expansion">
          <button id="addExpansion">Add</button>
        </div>
        <div class="dialog-buttons">
          <button id="cancelChanges" class="inactive">Cancel Changes</button>
        </div>
      </div>
    `);

    $("body").append(dialog);

    // Initialize Perfect Scrollbar
    const container = dialog.find(".expansions-list")[0];
    this.ps = new PerfectScrollbar(container, {
      suppressScrollX: true,
      wheelPropagation: false,
    });

    // Update scrollbar when content changes
    const updateScrollbar = () => {
      if (this.ps) {
        this.ps.update();
      }
    };

    const updateCancelButton = () => {
      const $cancelButton = dialog.find("#cancelChanges");
      if (this.hasChanges) {
        $cancelButton.removeClass("inactive").addClass("active");
      } else {
        $cancelButton.removeClass("active").addClass("inactive");
      }
    };

    // Handle edits
    dialog.find(".abbr-input, .expansion-input").on("change", (e) => {
      const $row = $(e.target).closest("tr");
      const oldAbbr = $row.find(".abbr-input").data("original");
      const newAbbr = $row.find(".abbr-input").val().trim();
      const newExpansion = $row.find(".expansion-input").val().trim();

      if (newAbbr && newExpansion) {
        this.expansions.delete(oldAbbr);
        this.expansions.set(newAbbr, newExpansion);
        this.hasChanges = true;
        updateCancelButton();
      }
    });

    // Handle deletes
    dialog.find(".delete-expansion").on("click", (e) => {
      const $row = $(e.target).closest("tr");
      const abbr = $row.find(".abbr-input").val().trim();
      this.expansions.delete(abbr);
      $row.remove();
      this.hasChanges = true;
      updateCancelButton();
    });

    // Add new expansion
    dialog.find("#addExpansion").on("click", () => {
      const abbr = dialog.find("#newAbbr").val().trim();
      const expansion = dialog.find("#newExpansion").val().trim();

      if (abbr && expansion) {
        this.expansions.set(abbr, expansion);
        dialog.find("#newAbbr, #newExpansion").val("");

        const newRow = $(`
          <tr>
            <td>
              <input type="text" class="abbr-input" value="${abbr}" data-original="${abbr}">
            </td>
            <td>
              <input type="text" class="expansion-input" value="${expansion}">
            </td>
            <td>
              <button class="delete-expansion" data-abbr="${abbr}" title="Delete">🗑️</button>
            </td>
          </tr>
        `);

        let inserted = false;
        dialog.find("tbody tr").each((_, row) => {
          const rowAbbr = $(row).find(".abbr-input").val();
          if (abbr.localeCompare(rowAbbr) < 0) {
            $(row).before(newRow);
            inserted = true;
            return false;
          }
        });

        if (!inserted) {
          dialog.find("tbody").append(newRow);
        }

        this.hasChanges = true;
        updateCancelButton();
        updateScrollbar();
      }
    });

    // Cancel changes
    dialog.find("#cancelChanges").on("click", () => {
      if (this.hasChanges) {
        this.expansions = new Map(this.originalExpansions);
        this.hasChanges = false;
        updateCancelButton();
        dialog.remove();
        this.showManageDialog(); // Refresh the dialog with original data
      }
    });

    // Clean up Perfect Scrollbar when dialog is closed
    const closeDialog = () => {
      if (this.hasChanges) {
        this.saveCustomExpansions();
      }
      if (this.ps) {
        this.ps.destroy();
        this.ps = null;
      }
      dialog.remove();
    };

    dialog.find(".close-popup").on("click", closeDialog);
    $(document).on("keydown", (e) => {
      if (e.key === "Escape" && dialog.is(":visible")) {
        closeDialog();
      }
    });
  }

  setupEventListeners() {
    // Listen for text input in any text field
    $(document).on("keydown", "input[type='text'], textarea", (e) => {
      // Only trigger on space key
      if (e.key !== " ") return;

      const input = e.target;
      const value = input.value;
      const cursorPos = input.selectionStart;

      // Get the text before the cursor
      const textBeforeCursor = value.substring(0, cursorPos);

      // Find the last word before the cursor
      const words = textBeforeCursor.split(/\s+/);
      const lastWord = words[words.length - 1];

      if (this.expansions.has(lastWord)) {
        e.preventDefault();
        // Calculate the position where the expansion starts
        const expansionStartPos = textBeforeCursor.length - lastWord.length;
        // Replace the last word with its expansion
        const newValue =
          textBeforeCursor.substring(0, expansionStartPos) + this.expansions.get(lastWord) + value.substring(cursorPos);
        input.value = newValue;
        // Set cursor position right after the expansion
        const newCursorPos = expansionStartPos + this.expansions.get(lastWord).length;
        input.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  }
}

// Initialize the feature
if (isMainDomain) {
  shouldInitializeFeature("textExpander").then((result) => {
    if (result) {
      import("./text_expander.css");
      new TextExpander();
    }
  });
}
