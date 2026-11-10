import { isMainDomain } from "../../core/pageType";
import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage.js";
import "../../core/common.css";

const EXPANSIONS_KEY = "wbe_text_expander_custom";
// Placeholders live in their own key ({ abbr: char }) so that the format of the
// expansions key stays unchanged and existing saved entries keep working.
const PLACEHOLDERS_KEY = "wbe_text_expander_placeholders";

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Applies an optional placeholder to an expansion.
 * If the placeholder character occurs in the expansion, its first occurrence is
 * removed and its position is returned as the cursor offset. Otherwise the
 * expansion is returned unchanged and the cursor offset is the end of it.
 */
export function applyPlaceholder(expansion, placeholder) {
  const index = placeholder ? expansion.indexOf(placeholder) : -1;
  if (index === -1) {
    return { text: expansion, cursorOffset: expansion.length, hasPlaceholder: false };
  }
  return {
    text: expansion.slice(0, index) + expansion.slice(index + placeholder.length),
    cursorOffset: index,
    hasPlaceholder: true,
  };
}

class TextExpander {
  constructor() {
    this.expansions = new Map();
    this.placeholders = new Map(); // abbr -> single placeholder character
    this.originalExpansions = new Map(); // Store original state for cancel
    this.originalPlaceholders = new Map();
    this.hasChanges = false;
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
    const stored = localStorage.getItem(EXPANSIONS_KEY);
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

    const storedPlaceholders = localStorage.getItem(PLACEHOLDERS_KEY);
    if (storedPlaceholders) {
      try {
        this.placeholders = new Map(Object.entries(JSON.parse(storedPlaceholders)));
      } catch (err) {
        this.placeholders = new Map();
      }
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
    const placeholders = Object.fromEntries(this.placeholders);

    // Load and execute the event dispatcher script with expansions data
    const dispatcher = document.createElement("script");
    dispatcher.src = chrome.runtime.getURL("features/text_expander/event_dispatcher.js");
    dispatcher.setAttribute("data-expansions", JSON.stringify({ expansions, placeholders }));
    dispatcher.onload = () => {
      dispatcher.remove();
    };
    dispatcher.onerror = () => {};
    document.documentElement.appendChild(dispatcher);
  }

  saveCustomExpansions() {
    // Drop placeholders for abbreviations that no longer exist
    for (const abbr of Array.from(this.placeholders.keys())) {
      if (!this.expansions.has(abbr) || !this.placeholders.get(abbr)) this.placeholders.delete(abbr);
    }

    const expansionsObj = Object.fromEntries(this.expansions);
    localStorage.setItem(EXPANSIONS_KEY, JSON.stringify(expansionsObj));
    localStorage.setItem(PLACEHOLDERS_KEY, JSON.stringify(Object.fromEntries(this.placeholders)));
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

  rowHtml(abbr, expansion, placeholder = "") {
    return `
      <tr>
        <td>
          <input type="text" class="abbr-input" value="${escapeHtml(abbr)}" data-original="${escapeHtml(abbr)}">
        </td>
        <td class="placeholder-cell">
          <input type="text" class="placeholder-input" maxlength="1" value="${escapeHtml(placeholder)}"
            title="Cursor placeholder (optional): a character in the expansion where the cursor should go after expanding">
        </td>
        <td>
          <textarea class="expansion-input">${escapeHtml(expansion)}</textarea>
        </td>
        <td>
          <button class="delete-expansion" data-abbr="${escapeHtml(abbr)}" title="Delete">🗑️</button>
        </td>
      </tr>
    `;
  }

  showManageDialog() {
    // Store original state for cancel functionality
    this.originalExpansions = new Map(this.expansions);
    this.originalPlaceholders = new Map(this.placeholders);
    this.hasChanges = false;

    const dialog = $(`
      <div id="textExpanderDialog" class="wbe-popup">
        <h1>Text Expander<span class="close-popup">&times;</span></h1>
        <div class="expansions-list">
          <table>
            <thead>
              <tr>
                <th>Abbreviation</th>
                <th class="placeholder-cell" title="Cursor placeholder (optional): a character in the expansion where the cursor should go after expanding">^</th>
                <th>Expansion</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${Array.from(this.expansions.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([abbr, expansion]) => this.rowHtml(abbr, expansion, this.placeholders.get(abbr) || ""))
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="add-expansion">
          <input type="text" id="newAbbr" placeholder="Abbreviation">
          <input type="text" id="newPlaceholder" maxlength="1"
            placeholder="^"
            title="Cursor placeholder (optional): a character in the expansion where the cursor should go after expanding">
          <textarea id="newExpansion" placeholder="Expansion"></textarea>
          <button id="addExpansion">Add</button>
        </div>
        <div class="dialog-buttons">
          <button id="cancelChanges" class="inactive">Cancel Changes</button>
        </div>
      </div>
    `);

    $("body").append(dialog);

    const updateCancelButton = () => {
      const $cancelButton = dialog.find("#cancelChanges");
      if (this.hasChanges) {
        $cancelButton.removeClass("inactive").addClass("active");
      } else {
        $cancelButton.removeClass("active").addClass("inactive");
      }
    };

    // Handle edits (delegated so rows added later are covered too)
    dialog.on("change", ".abbr-input, .placeholder-input, .expansion-input", (e) => {
      const $row = $(e.target).closest("tr");
      const $abbrInput = $row.find(".abbr-input");
      const oldAbbr = String($abbrInput.data("original"));
      const newAbbr = $abbrInput.val().trim();
      const newExpansion = $row.find(".expansion-input").val().trim();
      const newPlaceholder = $row.find(".placeholder-input").val().trim();

      if (newAbbr && newExpansion) {
        this.expansions.delete(oldAbbr);
        this.placeholders.delete(oldAbbr);
        this.expansions.set(newAbbr, newExpansion);
        if (newPlaceholder) this.placeholders.set(newAbbr, newPlaceholder);
        $abbrInput.data("original", newAbbr);
        $row.find(".delete-expansion").attr("data-abbr", newAbbr);
        this.hasChanges = true;
        updateCancelButton();
      }
    });

    // Handle deletes
    dialog.on("click", ".delete-expansion", (e) => {
      const $row = $(e.target).closest("tr");
      const abbr = String($row.find(".abbr-input").data("original"));
      this.expansions.delete(abbr);
      this.placeholders.delete(abbr);
      $row.remove();
      this.hasChanges = true;
      updateCancelButton();
    });

    // Add new expansion
    dialog.find("#addExpansion").on("click", () => {
      const abbr = dialog.find("#newAbbr").val().trim();
      const expansion = dialog.find("#newExpansion").val().trim();
      const placeholder = dialog.find("#newPlaceholder").val().trim();

      if (abbr && expansion) {
        // Replacing an existing abbreviation: drop its old row
        if (this.expansions.has(abbr)) {
          dialog.find("tbody tr").each((_, row) => {
            if (String($(row).find(".abbr-input").data("original")) === abbr) $(row).remove();
          });
        }

        this.expansions.set(abbr, expansion);
        if (placeholder) {
          this.placeholders.set(abbr, placeholder);
        } else {
          this.placeholders.delete(abbr);
        }
        dialog.find("#newAbbr, #newExpansion, #newPlaceholder").val("");

        const newRow = $(this.rowHtml(abbr, expansion, placeholder));

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
      }
    });

    // Cancel changes
    dialog.find("#cancelChanges").on("click", () => {
      if (this.hasChanges) {
        this.expansions = new Map(this.originalExpansions);
        this.placeholders = new Map(this.originalPlaceholders);
        this.hasChanges = false;
        updateCancelButton();
        dialog.remove();
        this.showManageDialog(); // Refresh the dialog with original data
      }
    });

    // Save and close the dialog
    const closeDialog = () => {
      if (this.hasChanges) {
        this.saveCustomExpansions();
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
      // Don't expand inside the Text Expander's own dialog
      if ($(input).closest("#textExpanderDialog").length) return;

      const value = input.value;
      const cursorPos = input.selectionStart;

      // Get the text before the cursor
      const textBeforeCursor = value.substring(0, cursorPos);

      // Find the last word before the cursor
      const words = textBeforeCursor.split(/\s+/);
      const lastWord = words[words.length - 1];

      if (this.expansions.has(lastWord)) {
        e.preventDefault();
        const { text, cursorOffset } = applyPlaceholder(this.expansions.get(lastWord), this.placeholders.get(lastWord));
        // Calculate the position where the expansion starts
        const expansionStartPos = textBeforeCursor.length - lastWord.length;
        // Replace the last word with its expansion
        input.value = textBeforeCursor.substring(0, expansionStartPos) + text + value.substring(cursorPos);
        // Put the cursor at the placeholder, or right after the expansion if there is none
        const newCursorPos = expansionStartPos + cursorOffset;
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
