/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isSpaceEdit } from "../../core/pageType";

/*──────────────────────────────
  1. Default phrases
  ─────────────────────────────*/
const defaultOptions = [
  "Adding sources.",
  "Bio improvement.",
  "Changes from new source.",
  "Categorization.",
  "Fixing typos.",
  "Formatting.",
  "Minor corrections.",
  "Research notes.",
];

/*──────────────────────────────
  2. summaryEntries helpers
  ─────────────────────────────*/
function getSummaryEntries() {
  return JSON.parse(localStorage.getItem("summaryEntries")) || [];
}
function setSummaryEntries(list) {
  localStorage.setItem("summaryEntries", JSON.stringify(list));
}

/*──────────────────────────────
  3. wpSummary helpers
  ─────────────────────────────*/
function appendToSummary(text) {
  const $fld = $("#wpSummary");
  if (!$fld.val().includes(text)) {
    $fld.val(`${$fld.val()} ${text}`.replace(/\s+/g, " ").trim());
    $("#wpSummaryTextArea").text($fld.val());
  }
}
function removeFromSummary(text) {
  const $fld = $("#wpSummary");
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  $fld.val(
    $fld
      .val()
      .replace(new RegExp(`\\s*${escaped}\\s*`, "g"), " ")
      .replace(/\s+/g, " ")
      .trim()
  );
  $("#wpSummaryTextArea").text($fld.val());
}

/*──────────────────────────────
  4. Init
  ─────────────────────────────*/
shouldInitializeFeature("customChangeSummaryOptions").then(async (on) => {
  if (!on) return;
  if ($("#summaryOptionsContainer").length) return; // already initialized
  setTimeout(async () => {
    $("#save").closest("div.page--content").prop("id", "saveButtons");

    if (isSpaceEdit) {
      const opt = await getFeatureOptions("customChangeSummaryOptions");
      if (!opt.showOnSpacePages) return;
    }

    await import("./custom_change_summary_options.css");

    localStorage.removeItem("summaryEntries");
    const initTxt = $("#wpSummary").val().trim();
    if (initTxt) {
      setSummaryEntries([{ type: "manual", text: initTxt, order: 1 }]);
    }

    buildCheckboxContainer();
    addGearAndPopup();
    renderSummaryOptions();
    renderCustomOptionsPopup();
    addListeners();
  }, 3000);
});

function addListeners() {
  /*──────────────────────────────
  6. Event delegation
  ─────────────────────────────*/
  $("body").on("click", "#changeSummaryGears", () => {
    $("#changeSummaryOptions").toggle();
    $("#newOption").prop("disabled", false).trigger("focus"); // enable here
  });

  $("body")
    .on("click", "#closeChangeSummaryOptions", () => $("#changeSummaryOptions").hide())
    .on("click", "#addOptionButton", (e) => {
      e.preventDefault();
      let t = $("#newOption").val().trim();
      if (!t) return;
      if (!t.endsWith(".")) t += ".";
      addCustomOption(t);
      $("#newOption").val("");
    })
    .on("click", ".deleteOption", function (e) {
      e.preventDefault();
      deleteCustomOption($(this).data("option"));
    })
    .on("click", ".editOption", function (e) {
      e.preventDefault();
      const txt = $(this).data("option").replace(/\.$/, "");
      deleteCustomOption($(this).data("option"));
      $("#newOption").val(txt).trigger("focus");
    })
    /* Toggle pseudo-checkbox with click, Enter, or Space */
    .on("click keydown", "#summaryOptionsContainer .wbe-checkbox", function (e) {
      if (e.type === "keydown" && ![13, 32].includes(e.which)) return;
      e.preventDefault();
      const $cb = $(this);
      const now = $cb.attr("aria-checked") === "true";
      const option = $cb.data("option");

      $cb.attr("aria-checked", !now);

      if (!now) {
        addButtonEntry(option);
        appendToSummary(option);
      } else {
        removeButtonEntry(option);
        removeFromSummary(option);
      }
      $("#wpSave").prop("disabled", $("#wpSummary").val() === "");
    });

  /* add once, right after the existing .wbe-checkbox handler */
  $("body").on("click", "#summaryOptionsContainer label", function (e) {
    // If the user clicked anywhere except the span, forward the click
    if (!$(e.target).hasClass("wbe-checkbox")) {
      $(this).find(".wbe-checkbox").trigger(e.type);
    }
  });

  $("body")
    .on("keydown", "#summaryOptionsContainer label", function (e) {
      if ([13, 32].includes(e.which)) {
        // Enter or Space
        e.preventDefault();
        $(this).find(".wbe-checkbox").trigger("click");
      }
    })
    .find("#summaryOptionsContainer label")
    .attr("tabindex", "0"); // make labels focusable
}

/*──────────────────────────────
  buildCheckboxContainer
  ─────────────────────────────*/
function buildCheckboxContainer() {
  // ① the first native <input summary-suggestion …>
  const $firstNative = $("input.summary-suggestion").first().closest(".form-check, .form-check-inline");

  // ② create (or reuse) our container
  let $box = $("#summaryOptionsContainer");
  if (!$box.length) {
    $box = $('<div id="summaryOptionsContainer" class="mt-2"></div>');
  }

  if ($firstNative.length) {
    // insert our bar before the native radios
    $firstNative.before($box);

    // ③ hide ALL the native suggestion blocks
    $("input.summary-suggestion").closest(".form-check, .form-check-inline").hide();
  } else {
    // fallback: append inside #saveButtons if selector ever changes
    $("#saveButtons").append($box);
  }
}

/*──────────────────────────────
  addGearAndPopup
  ─────────────────────────────*/
function addGearAndPopup() {
  const $body = $("body");
  const $save = $("#saveButtons");

  /* ── gear icon (positioned top-right of the save area) */
  if (!$("#changeSummaryGears").length && $save.length) {
    const $gear = $(`
      <img id="changeSummaryGears"
           title="Add more phrases"
           src="${chrome.runtime.getURL("images/settings30.png")}">
    `).appendTo($save);
  }

  /* ── modal popup (anywhere in <body>, absolute / fixed handles placement) */
  if (!$("#changeSummaryOptions").length) {
    $body.append(`
      <div id="changeSummaryOptions">
        <div class="modal-header">
          <h3>Custom Options</h3>
          <span id="closeChangeSummaryOptions">&times;</span>
          <div class="add-option-container">
            <label>Add option:</label>
            <!-- name="" + disabled so WT draft-watcher ignores it -->
            <input type="text" id="newOption" name="" disabled />
            <button id="addOptionButton" class="small">Add Option</button>
          </div>
        </div>
        <div class="modal-body">
          <ul id="currentOptions"></ul>
        </div>
      </div>
    `);
  }
}

/*──────────────────────────────
  7. Renderers
  ─────────────────────────────*/
function renderSummaryOptions() {
  const custom = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  const items = [...new Set([...defaultOptions, ...custom])].sort((a, b) => a.localeCompare(b));

  const $c = $("#summaryOptionsContainer").empty();
  items.forEach((opt, i) => {
    const checked = getSummaryEntries().some((e) => e.type === "button" && e.text === opt);
    $c.append(`
      <label class="form-check-label mr-3" style="cursor:pointer;color:#000;">
        <span class="wbe-checkbox"
              role="checkbox"
              tabindex="0"
              data-option="${opt}"
              aria-checked="${checked}"></span>
        ${opt}
      </label>
    `);
  });
}

function renderCustomOptionsPopup() {
  const list = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  const $ul = $("#currentOptions").empty();

  list
    .sort((a, b) => a.localeCompare(b))
    .forEach((opt) =>
      $ul.append(`
        <li data-option="${opt}" style="color:#000;">
          ${opt}
          <a href="#" class="editOption" data-option="${opt}">[edit]</a>
          <a href="#" class="deleteOption" data-option="${opt}">[x]</a>
        </li>`)
    );
}

/*──────────────────────────────
  8. Custom-option helpers
  ─────────────────────────────*/
function addCustomOption(txt) {
  const list = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  if (!list.includes(txt)) {
    list.push(txt);
    localStorage.setItem("LSchangeSummaryOptions", JSON.stringify(list));
  }
  renderCustomOptionsPopup();
  renderSummaryOptions();
}
function deleteCustomOption(txt) {
  let list = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  list = list.filter((x) => x !== txt);
  localStorage.setItem("LSchangeSummaryOptions", JSON.stringify(list));
  removeButtonEntry(txt);
  renderCustomOptionsPopup();
  renderSummaryOptions();
}

/*──────────────────────────────
  9. Button-entry helpers
  ─────────────────────────────*/
function addButtonEntry(txt) {
  const list = getSummaryEntries();
  if (!list.some((e) => e.type === "button" && e.text === txt)) {
    const ord = list.length ? Math.max(...list.map((e) => e.order)) + 1 : 1;
    list.push({ type: "button", text: txt, order: ord });
    setSummaryEntries(list);
  }
}
function removeButtonEntry(txt) {
  setSummaryEntries(getSummaryEntries().filter((e) => !(e.type === "button" && e.text === txt)));
}
