import { isMainDomain } from "../../core/pageType";
import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage.js";
import "../../core/common.css";
import "./text_expander.css";
/* global chrome */

class TextExpander {
  constructor() {
    this.expansions = new Map();
    this.initializeExpansions().then(() => {
      this.setupEventListeners();
      this.loadCustomExpansions();
      this.addManageButton();
      // Update the button's background image
      $("#textExpanderButton .icon--textExpander").css(
        "background-image",
        `url('${chrome.runtime.getURL("images/expand-right.svg")}')`
      );
    });
  }

  async initializeExpansions() {
    // Try to load from storage first
    const stored = await chrome.storage.local.get("textExpanderExpansions");
    if (stored.textExpanderExpansions) {
      this.expansions = new Map(Object.entries(stored.textExpanderExpansions));
    } else {
      // If nothing in storage, initialize with defaults
      this.expansions = new Map([
        ["wt", "WikiTree"],
        ["wt+", "WikiTree+"],
        ["fs", "FamilySearch"],
        ["anc", "Ancestry"],
        ["myh", "MyHeritage"],
        ["ged", "GEDCOM"],
        ["dna", "DNA"],
      ]);
      this.saveCustomExpansions();
    }
  }

  loadCustomExpansions() {
    const customExpansions = localStorage.getItem("wbe_text_expander_custom");
    if (!customExpansions) return;

    try {
      const expansions = JSON.parse(customExpansions);
      for (const [abbr, expansion] of Object.entries(expansions)) {
        this.expansions.set(abbr, expansion);
      }
    } catch (err) {
      console.error("Error loading custom expansions:", err);
    }
  }

  saveCustomExpansions() {
    const expansionsObj = Object.fromEntries(this.expansions);
    chrome.storage.local.set({ textExpanderExpansions: expansionsObj });
  }

  addManageButton() {
    const manageButton = $("<a>")
      .attr("id", "textExpanderButton")
      .addClass("wbe-button")
      .attr("data-bs-title", "Manage Text Expansions")
      .attr("data-bs-toggle", "tooltip")
      .attr("data-tooltip", "Manage Text Expansions")
      .append(
        $("<span>")
          .addClass("icon--textExpander")
          .css("background-image", `url(${chrome.runtime.getURL("images/text-expander.svg")})`)
      )
      .on("click", (e) => {
        e.preventDefault();
        this.showManageDialog();
      });

    $(".clipboardContainer").append(manageButton);
  }

  showManageDialog() {
    const dialog = $(`
      <div id="textExpanderDialog" class="wbe-popup">
        <h1>Manage Text Expansions<span class="close-popup">&times;</span></h1>
        <div class="expansions-list">
          <table>
            <thead>
              <tr>
                <th>Abbreviation</th>
                <th>Expansion</th>
                <th>Actions</th>
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
                      <button class="delete-expansion" data-abbr="${abbr}">Delete</button>
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
          <button id="saveChanges">Save Changes</button>
          <button id="cancelChanges">Cancel</button>
        </div>
      </div>
    `);

    $("body").append(dialog);

    // Close button
    dialog.find(".close-popup, #cancelChanges").on("click", () => {
      dialog.remove();
      return false; // Prevent any other handlers from firing
    });

    // Handle edits
    dialog.find(".abbr-input, .expansion-input").on("change", (e) => {
      const $row = $(e.target).closest("tr");
      const oldAbbr = $row.find(".abbr-input").data("original");
      const newAbbr = $row.find(".abbr-input").val().trim();
      const newExpansion = $row.find(".expansion-input").val().trim();

      if (newAbbr && newExpansion) {
        // Store the changes but don't save yet
        $row.data("changes", { oldAbbr, newAbbr, newExpansion });
      }
    });

    // Handle deletes
    dialog.find(".delete-expansion").on("click", (e) => {
      const $row = $(e.target).closest("tr");
      const abbr = $row.find(".abbr-input").val().trim();
      // Remove from the map immediately
      this.expansions.delete(abbr);
      // Remove the row from the table
      $row.remove();
    });

    // Add new expansion
    dialog.find("#addExpansion").on("click", () => {
      const abbr = dialog.find("#newAbbr").val().trim();
      const expansion = dialog.find("#newExpansion").val().trim();

      if (abbr && expansion) {
        // Add to the map but don't save yet
        this.expansions.set(abbr, expansion);
        // Clear the input fields
        dialog.find("#newAbbr, #newExpansion").val("");

        // Add the new row to the table in the correct position
        const newRow = $(`
          <tr>
            <td>
              <input type="text" class="abbr-input" value="${abbr}" data-original="${abbr}">
            </td>
            <td>
              <input type="text" class="expansion-input" value="${expansion}">
            </td>
            <td>
              <button class="delete-expansion" data-abbr="${abbr}">Delete</button>
            </td>
          </tr>
        `);

        // Find the correct position to insert the new row
        let inserted = false;
        dialog.find("tbody tr").each((_, row) => {
          const rowAbbr = $(row).find(".abbr-input").val();
          if (abbr.localeCompare(rowAbbr) < 0) {
            $(row).before(newRow);
            inserted = true;
            return false; // break the loop
          }
        });

        // If not inserted, append to the end
        if (!inserted) {
          dialog.find("tbody").append(newRow);
        }
      }
    });

    // Save changes
    dialog.find("#saveChanges").on("click", () => {
      // Apply all changes
      dialog.find("tr").each((_, row) => {
        const $row = $(row);
        if ($row.data("changes")) {
          const { oldAbbr, newAbbr, newExpansion } = $row.data("changes");
          this.expansions.delete(oldAbbr);
          this.expansions.set(newAbbr, newExpansion);
        }
      });

      this.saveCustomExpansions();
      dialog.remove();
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
        // Replace the last word with its expansion
        const newValue =
          textBeforeCursor.substring(0, textBeforeCursor.length - lastWord.length) +
          this.expansions.get(lastWord) +
          " " +
          value.substring(cursorPos);
        input.value = newValue;
        input.setSelectionRange(newValue.length, newValue.length);
      }
    });
  }
}

// Initialize the feature
if (isMainDomain) {
  shouldInitializeFeature("textExpander").then((result) => {
    if (result) {
      new TextExpander();
    }
  });
}
