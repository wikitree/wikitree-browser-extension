/*
Created By: Ian Beacall (Beacall-6)
Groups added by Riël Smit (Smit-641)
*/

import $ from "jquery";
import "jquery-ui/ui/widgets/sortable";
import "jquery-ui/ui/widgets/draggable";
import "./clipboard_and_notes.css";
import { htmlEntities, extensionContextInvalidatedCheck, setHighestZIndex } from "../../core/common";
import { shouldInitializeFeature, checkIfFeatureEnabled } from "../../core/options/options_storage";
import {
  isAddUnrelatedPerson,
  isProfileAddRelative,
  isSpaceEdit,
  isSpacePage,
  isProfileEdit,
  isWikiEdit,
  isSpecialTrustedList,
  isMergeEdit,
} from "../../core/pageType";
import { IndexedDBHelper } from "../../core/lib/indexedDBHelper.js";
import { copyToClipboard } from "../../core/clipboard.js";

// Store the last caret/selection in an editable field, tagged with the field's id
// so a paste only restores a selection that actually belongs to the target field.
let lastTextboxSelection = { id: null, start: 0, end: 0 };

// The fields we track a caret position for, so a clipping can be inserted at the caret.
const TRACKED_FIELD_IDS = ["wpTextbox1", "newUser_mBio", "wpSummary"];
const TRACKED_FIELD_SELECTOR = TRACKED_FIELD_IDS.map((id) => `#${id}`).join(", ");

// Whether the Change Explanation field (#wpSummary) was the focused element at the moment
// the clipboard was opened. This is read from document.activeElement on button mousedown
// (before focus moves to the popup), which is reliable even when the biography uses the
// CodeMirror editor — CodeMirror's editable is an id-less contenteditable div, so it never
// looks like #wpSummary and never fires our field-focus handlers.
let summaryWasActiveOnClipboardOpen = false;

const CB_DB_NAME = "Clipboard";
const CB_DB_VERSION = 1;
const CB_DB_STORE = "Clipboard";
const dbHelper = new IndexedDBHelper(CB_DB_NAME, CB_DB_VERSION);

async function initializeDatabase() {
  if (!dbHelper.db) {
    await dbHelper.openDB((db, fromVersion, toVersion) => {
      // This code needs to change whenever we have to change the version number (CB_DB_VERSION)
      IndexedDBHelper.createObjectStore(db, CB_DB_STORE, { autoIncrement: true });
    });
  }
  return dbHelper;
}

export async function appendClipboardButtons(clipboardButtons = $()) {
  const isStickyHeader = await checkIfFeatureEnabled("stickyHeader");

  // Append buttons initially to the header
  const clipboardContainer = $(".clipboardContainer");

  let hasEditorToolbar = null;
  let position = null;

  // Determine where the editor toolbar is based on the conditions
  if ($("h1:contains('Edit Marriage Information')").length) {
    position = $("#header");
  } else if ((isSpaceEdit || isAddUnrelatedPerson || isProfileAddRelative || isProfileEdit) && !isStickyHeader) {
    if ($("#editToolbarExt").length) {
      position = $("#editToolbarExt");
      hasEditorToolbar = true;
    } else if ($("#toolbar").length) {
      position = $("#toolbar");
      hasEditorToolbar = true;
    } else if ($("a.toggleAdvancedSources").length) {
      position = $("a.toggleAdvancedSources").parent();
    }
  }

  // Check if an editor toolbar exists
  if (!position || !position.length) {
    return; // Exit if no toolbar is found
  }

  // Function to check if the header is visible
  function isHeaderVisible() {
    const header = $("#header,#HEADER");
    const headerBottom = header.offset().top + header.outerHeight();
    return $(window).scrollTop() < headerBottom;
  }

  // Function to handle moving clipboard buttons between header and editor
  function handleScroll() {
    if (!isHeaderVisible()) {
      // Move buttons to the editor toolbar if the header is not visible and they're not already there
      if (!clipboardButtons.parent().is(position)) {
        if (hasEditorToolbar) {
          clipboardButtons.detach().appendTo(position);
        } else {
          clipboardButtons.detach().prependTo(position);
        }
      }
    } else {
      // Move buttons back to the header if the header is visible and the buttons are not already in the header
      if (!clipboardButtons.parent().is(clipboardContainer)) {
        clipboardButtons.detach().appendTo(clipboardContainer);
      }
    }
  }

  // Attach scroll listener to window
  $(window).on("scroll", handleScroll);

  // Trigger scroll function initially in case user is already scrolled
  handleScroll();
}

// Remember the last selection in the text box

// Update whenever the textarea is interacted with
function rememberSelection(field) {
  // selectionStart/End are non-numeric for field types that don't support a caret,
  // and can be unreliable on blur in some browsers; guard against both.
  if (field && typeof field.selectionStart === "number" && typeof field.selectionEnd === "number") {
    lastTextboxSelection.id = field.id;
    lastTextboxSelection.start = field.selectionStart;
    lastTextboxSelection.end = field.selectionEnd;
  }
}

function updateLastTextboxSelection() {
  // Track the caret in any editable field a clipping can be pasted into, including
  // the Change Explanation field (#wpSummary), so a paste lands where the user left it.
  $(document).on("focus click keyup select blur", TRACKED_FIELD_SELECTOR, function () {
    rememberSelection(this);
  });
  // The instant a clipboard button is pressed (before the popup steals focus), record
  // which field was focused: whether it was the Change Explanation field, and — for a
  // tracked field — its caret position.
  $(document).on("mousedown", ".aClipboardButton", function () {
    const active = document.activeElement;
    summaryWasActiveOnClipboardOpen = !!(active && active.id === "wpSummary");
    if (active && TRACKED_FIELD_IDS.includes(active.id)) {
      rememberSelection(active);
    }
  });
}

var clippingRow = -1;
var keyMode = false; // flags whether the user is using cursor keys or mouse

shouldInitializeFeature("clipboardAndNotes").then((result) => {
  if (!result) {
    return; // Exit if the feature is not enabled
  }

  updateLastTextboxSelection();

  $(".qa-form-light-button-comment,.qa-form-light-button-answer").on("click", function () {
    $("#clipboard").remove();
  });
  $(document).on("click", ".aClipboardButton", function (e) {
    e.preventDefault();
    window.clipboardClicker = $(this);
    handleClipboardClick(e);
  });
  $(document).on("click", ".aNotesButton", function (e) {
    e.preventDefault();
    window.clipboardClicker = $(this);
    handleNotesClick(e);
  });

  if (result && $(".clipboardButtons").length == 0) {
    // BEE class
    window.clipboardClicker = $();
    window.lastClipboardClicker = $();

    //console.log("[clipboard_and_notes] Initializing clipboard and notes feature");
    if ($("body.Special_EditPerson").length || isSpacePage) {
      setTimeout(function () {
        if ($(".clipboardButtons").length == 0) {
          initClipboard();
        }
      }, 1000);
    } else {
      if ($(".clipboardButtons").length == 0) {
        initClipboard();
      }
    }

    $(document).on("focusin", "textarea, #wpSummary", function () {
      window.activeFormElement = this.id;
    });

    setTimeout(function () {
      $("#mBioWithoutSources").on("mouseup", function () {
        window.activeFormElement = document.activeElement.id;
      });
    }, 1500);
  }

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "showClipboard") {
      clipboard("clipboard", null, "show");
      $("#clipboard").show();
    } else {
      if (request.action === "showNotes") {
        clipboard("notes", null, "show");
        $("#clipboard").show();
      }
    }
    if (request.action == "showClipboard" || request.action == "showNotes") {
      setHighestZIndex($("#clipboard"));
      $("body").addClass("modal-open");
    }
  });
});

function decodeHTMLEntities(text) {
  const textArea = document.createElement("textarea");
  textArea.innerHTML = text;
  return textArea.value;
}

function htmlEntitiesReverse(str) {
  return String(str)
    .replaceAll(/&amp;/g, "&")
    .replaceAll(/&lt;/g, "<")
    .replaceAll(/&gt;/g, ">")
    .replaceAll(/&quot;/g, '"')
    .replaceAll(/$apos;/g, "'");
}

function display2real(element) {
  return htmlEntitiesReverse($(element).html());
}
function original2real(val) {
  return htmlEntitiesReverse(val);
}

function itemOrderNameForGroup(groupKey, type) {
  return `clipboard_${type}_order${groupKey}`;
}

function groupsOrderNameFor(type) {
  return `clipboard_${type}_group_order`;
}

function groupNameFromInput() {
  return $("#groupInput").val().trim();
}

function activeTabVarNameFor(type) {
  return `clipboard_${type}_active_tab`;
}

function focusOnGroup(group) {
  const groupKey = makeKeyFrom(group);
  const $li = $(`#tab-list .tab[data-groupkey="${groupKey}"]`);
  if ($li.length) {
    $li.addClass("active");
  } else {
    // The group has not been loaded yet. Assume it will be loaded and add it's tab item
    // so long so we can mark it as active for the next refresh
    addGroupTab(groupKey, htmlEntities(group));
    $("#tab-list .tab").removeClass("active");
    $(`#tab-list .tab[data-groupkey="${groupKey}"]`).addClass("active");
  }
}

async function addClipping(type, e) {
  const group = groupNameFromInput();
  try {
    const dbh = await initializeDatabase();
    await dbh.putData(CB_DB_STORE, {
      type: type,
      text: $("#clippingBox").val(),
      group: group,
      title: $("#thingTitle").val(),
    });

    // Add the group button so long so we can mark it active so that focus can be changed to it
    focusOnGroup(group);
    clipboard(type, e, "add");
    $("#clippingBox,#thingTitle").val("");
  } catch (error) {
    console.error(`Failed to save ${type} to group ${group}`, error);
  }
}

function removeOrderItem(orderName, item) {
  const order = localStorage[orderName];
  if (order) {
    const newOrder = order
      .split("|")
      .filter((g) => g != item)
      .join("|");
    localStorage.setItem(orderName, newOrder);
  }
}

async function deleteClipping(key, type, groupTBody, e) {
  try {
    const dbh = await initializeDatabase();
    await dbh.deleteItem(CB_DB_STORE, +key);

    const groupKey = groupTBody.closest(".tab-content").data("groupkey") || "";
    if (groupTBody.children("tr").length > 1) {
      // Remove the clipping's key from it's group's order record
      removeOrderItem(itemOrderNameForGroup(groupKey, type), key);
    } else {
      // We've removed the last item in a group, therefore delete the group's order record
      localStorage.removeItem(itemOrderNameForGroup(groupKey, type));

      // Also delete the group's key from the group order record
      removeOrderItem(groupsOrderNameFor(type), groupKey);
    }
    clipboard(type, e, "delete");
    $("#clippingBox,#thingTitle").val("");
  } catch (error) {
    console.error(`Failed to delete ${type} with key ${key}`, error);
  }
}

async function renameGroup(currentKey, newName, type, e) {
  const records = [];
  $(`.tab-content[data-groupkey="${currentKey}"] tr`).each((i, tr) => {
    const $tr = $(tr);
    records.push({
      key: $tr.data("key"),
      value: { type: type, text: original2real($tr.data("original")), group: newName },
    });
  });

  try {
    const dbh = await initializeDatabase();
    await dbh.multiPut("Clipboard", records);
    focusOnGroup(newName);
    clipboard(type, e, "edit");
    $("#groupInput").val("");
  } catch (error) {
    console.error(`Failed during rename of ${currentKey} to ${newName}`, error);
  }
}

async function editClipping(key, type, e) {
  try {
    const dbh = await initializeDatabase();
    await dbh.putData(
      CB_DB_STORE,
      { type: type, text: $("#clippingBox").val(), group: groupNameFromInput(), title: $("#thingTitle").val() },
      +key
    );
    clipboard(type, e, "edit");
    $("#clippingBox").val("");
  } catch (error) {
    console.error(`Failed to update ${type} ${key}`, error);
  }
}

async function copyClippingToClipboard(element) {
  const $temp = $("<textarea>");
  $("body").append($temp);
  let theText = "";
  if (typeof element == "string") {
    theText = original2real(element);
  } else {
    theText = display2real(element);
  }
  // Modern clipboard API with fallback
  try {
    await copyToClipboard(theText); // uses background script
    console.log("Copied to clipboard (background script)");
  } catch (err) {
    console.warn("Background clipboard copy failed, using fallback:", err);

    // Legacy fallback using hidden textarea
    const $temp = $("<textarea>");
    $("body").append($temp);
    $temp.val(theText).trigger("focus").trigger("select");
    try {
      document.execCommand("copy");
      console.log("Copied to clipboard (fallback textarea)");
    } catch (fallbackErr) {
      console.error("Fallback copy also failed:", fallbackErr);
    } finally {
      $temp.remove();
    }
  }

  const enhancedEditorButton = $("#toggleMarkupColor");
  // The Change Explanation field (#wpSummary) is a plain <input>, independent of the
  // biography editor. When the enhanced editor (CodeMirror) is on, none of the bio-based
  // conditions below match this page, so we must recognise a #wpSummary target on its own
  // — otherwise a clipping only reaches the system clipboard and is never inserted. We
  // only treat it as the target when it was genuinely the focused field as the clipboard
  // opened, so clicking a clipping while editing the biography still copies (as before).
  const summaryIsTarget = summaryWasActiveOnClipboardOpen && $("#wpSummary").length;
  if (
    enhancedEditorButton.attr("value") == "turn on enhanced editor" ||
    enhancedEditorButton.attr("value") == "Turn On Enhanced Editor" || //toggles once used
    $("#mBioWithoutSources").length ||
    $("#photo_upload").length ||
    $("body.profile").length ||
    $("body.qa-body-js-on").length ||
    $("h1:contains('Edit Marriage Information')").length ||
    $("#mSources").length ||
    isSpecialTrustedList ||
    isMergeEdit ||
    summaryIsTarget
  ) {
    const box = window.activeFormElement;
    let el = $();
    if (summaryIsTarget) {
      // The Change Explanation field was focused as the clipboard opened; paste there.
      el = $("#wpSummary");
    } else if ($("#photo_upload").length) {
      el = $("#wpUploadDescription");
    } else if ($("h1:contains('Edit Marriage Information')").length) {
      el = $();
    } else if ($("#commentPostDiv").css("display") == "block") {
      el = $("#commentPostText");
    } else if ($(".memoriesFormToggle").css("display") == "block") {
      el = $("textarea[name='wpText']");
    } else if (isProfileAddRelative || isAddUnrelatedPerson) {
      if ($("textarea.expanded").length) {
        el = $("textarea.expanded");
      } else if (box) {
        el = $("#" + box);
      } else {
        el = $("#mSources");
      }
    } else if ($("textarea[name='a_content']").length) {
      const oIframe = $(".cke_wysiwyg_frame");
      const conDoc = oIframe[0].contentDocument;
      const lastPara = conDoc.querySelector(".cke_editable");

      const dTextBox = $(lastPara);
      dTextBox.append(decodeHTMLEntities(theText));
      return;
    } else if ($("#privateMessage-comments").length) {
      el = $("#privateMessage-comments");
    } else if (isSpecialTrustedList) {
      el = $("input[name='add_email']");
    } else if (isMergeEdit && $("#newUser_mBio").length) {
      el = $("#newUser_mBio");
    } else if (box && TRACKED_FIELD_IDS.includes(box) && $("#" + box).length) {
      // Honor the field the user last focused (e.g. the Change Explanation field,
      // #wpSummary) instead of always defaulting to the main #wpTextbox1 body.
      el = $("#" + box);
    } else if ($("#wpTextbox1").length) {
      el = $("#wpTextbox1");
    } else {
      el = $("#" + box);
    }
    if (el[0]) {
      let selStart;
      const elId = el.attr("id");

      // Do we have a saved caret that belongs to the field we're pasting into?
      // Matching on id means a saved position of 0 is still honored (caret at start),
      // and a caret saved for one field is never applied to another.
      const hasSavedSelectionForField =
        lastTextboxSelection && lastTextboxSelection.id === elId && typeof lastTextboxSelection.start === "number";

      if (TRACKED_FIELD_IDS.includes(elId) && hasSavedSelectionForField) {
        el[0].focus();
        el[0].selectionStart = lastTextboxSelection.start;
        el[0].selectionEnd = lastTextboxSelection.end;
        selStart = lastTextboxSelection.start;
      } else if (elId === "newUser_mBio" && isMergeEdit) {
        // If it's the merge edit textarea but no meaningful selection is stored, paste at the end on a new line
        el[0].focus();
        const currentContent = el.val();
        const textLength = currentContent.length;
        el[0].selectionStart = el[0].selectionEnd = textLength;
        selStart = textLength;

        // Add a newline before the content if there's already content and it doesn't end with a newline
        const textToInsert = decodeHTMLEntities(theText);
        const needsNewline = currentContent.length > 0 && !currentContent.endsWith("\n");
        const finalText = currentContent + (needsNewline ? "\n" : "") + textToInsert;

        el.val(finalText);

        // Place cursor after inserted text
        el[0].selectionStart = el[0].selectionEnd = finalText.length;
        el[0].focus();
        return; // Exit early since we've handled the insertion manually
      } else {
        // No saved caret for this field: use its own caret, or the end of its
        // content when the field can't report one (avoids a NaN split below).
        selStart = typeof el[0].selectionStart === "number" ? el[0].selectionStart : (el.val() || "").length;
      }

      const textToInsert = decodeHTMLEntities(theText);
      const before = el.val().substring(0, selStart);
      const after = el.val().substring(selStart);

      el.val(before + textToInsert + after);

      // Place cursor after inserted text
      el[0].selectionStart = el[0].selectionEnd = before.length + textToInsert.length;
      el[0].focus();
    }
  }
}

function tableBodyForGroup(groupKey) {
  return `#clippings div[data-groupkey="${groupKey}"] tbody.group`;
}

function renumberClipboardGroup(groupKey) {
  let rowNum = 0;
  $(`${tableBodyForGroup(groupKey)} tr`).each(function () {
    rowNum++;
    $(this).find(".index").text(rowNum);
  });
}

function setAddClippingAction(type) {
  $("#addClipping")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();
      if ($("#clippingBox").val() != "") {
        addClipping(type, e);
      }
    });
  let word = "clipping";
  if (type == "notes") {
    word = "note";
  }
  $("#addClipping").text("Add " + word);
  $("#clippingBox,#thingTitle").val("");
}

async function clipboard(type, e, action = false) {
  clippingRow = -1;
  $("input, textarea").trigger("blur"); // ensure the clipboard has the focus
  let activeTab = localStorage[activeTabVarNameFor(type)] || "";
  let word = "";
  if (type == "clipboard") {
    word = "clippings";
  } else {
    word = type;
  }
  const thisWord = word.slice(0, -1);
  const capWord = word.charAt(0).toUpperCase() + word.slice(1);

  if ($("#clipboard").length) {
    activeTab = $("#tab-list .tab.active").data("groupkey");
    $("#clipboard #clippings").html("");
    $("#clipboard #tab-list").html("");
  } else {
    let h1 = "";
    if (type == "clipboard") {
      h1 = "Clipboard";
    }
    if (type == "notes") {
      h1 = "Notes";
    }

    const aClipboard = $(
      `<div id='clipboard' class="wbe-popup" data-type='${type}'>
        <h1>${h1}<x class="close-popup">x</x></h1>
        <div id='tab-container'>
          <div id='groupTabs'>
            <button id='reorderTabs' class='btn btn-secondary btn-sm' title='Reset the tab sort order to the default lexicographic order'>⇅</button>
            <ul id='tab-list'></ul>
          </div>
          <section id='clippings'></section>
        </div>
        <div id="clippingForm">
          <span>
            <label title='${capWord} can be grouped under a label entered here.'><span class="labelWord">Group:</span><input id='groupInput' type='text' placeholder='(Optional)'></label>
            <button id='renameGroup' class='btn btn-secondary btn-sm' title='Rename the current active group to the value entered at the left'>Rename Group</button>
            <label id="thingTitleLabel" title='Add an optional title or description for your ${thisWord}.'><span class="labelWord">Title:</span><input id='thingTitle' type='text' placeholder='(Optional)'></label>
          </span>
          <textarea id='clippingBox'></textarea>
          <button id='addClipping' class='btn btn-secondary btn-sm'>Add ${thisWord}</button>
        </div>
      </div>`
    );

    $("body").append(aClipboard);
    setHighestZIndex(aClipboard);

    if (isWikiEdit && thisWord == "clipping") {
      if ($("#clipboardInfo").length == 0) {
        setClipboardText();
      }
    }

    $("#clipboard x").off("click", closeClipboard).on("click", closeClipboard);
    $("#clipboard h1").off("dblclick", closeClipboard).on("dblclick", closeClipboard);
    $("#reorderTabs")
      .off("click")
      .on("click", function (e) {
        e.preventDefault();
        localStorage.removeItem(groupsOrderNameFor(type));
        clipboard(type, e, "edit");
      });
    $("#renameGroup")
      .off("click")
      .on("click", function (e) {
        e.preventDefault();
        const newName = groupNameFromInput();
        const $activeGroup = $("#tab-list .tab.active");
        if ($activeGroup.length) {
          const currentKey = $activeGroup.data("groupkey") || "";
          if (currentKey != makeKeyFrom(newName)) {
            renameGroup(currentKey, newName, type, e);
          }
        }
      });
    if ($("#clipboard").draggable()) {
      $("#clipboard").draggable("destroy");
    }
    $("#clipboard").draggable({
      handle: "h1",
      scroll: true,
      scrollSensitivity: 100,
    });
  }

  setAddClippingAction(type);

  if (action == false) {
    $("#clipboard").toggle();
    if (!$("#clipboard").is(":visible")) {
      $("body").removeClass("modal-open");
    }
    // If we just made the clipboard/notes popup visible via toggle, raise its z-index
    else {
      try {
        setHighestZIndex($("#clipboard"));
      } catch (e) {
        console.debug("[clipboard_and_notes] setHighestZIndex failed", e);
      }
    }
  } else {
    $("#clipboard").show();
    setHighestZIndex($("#clipboard"));
    $("body").addClass("modal-open");
  }

  window.lastClipboardClicker = window.clipboardClicker;

  $("#groupTabs p").remove();
  $("#clippings").html("");

  $(document).off("keydown", keyDownListener).on("keydown", keyDownListener);
  $(document).off("mousemove", mouseListener).on("mousemove", mouseListener);

  // Collect all the required type of elements into their groups
  const groupedItems = new Map();
  try {
    const dbh = await initializeDatabase();
    await dbh.openCursor(CB_DB_STORE, (value, key) => {
      if (value.type == type) {
        const group = value.group || "";
        const groupItems = groupedItems.get(group) || [];
        groupItems.push({ key: key, value: value });
        groupedItems.set(group, groupItems);
      }
      return true;
    });
  } catch (error) {
    console.error(`Failed to retrieve clipboard items`, error);
  }

  // We've collected them all, now render them
  if (groupedItems.size > 0) $("#clipboard p").remove();
  for (const group of [...groupedItems.keys()].sort()) {
    // Render a group - the group of non-grouped items are rendered first
    // Each group is rendered as a table
    const groupItems = groupedItems.get(group);
    const groupName = htmlEntities(group);
    const groupKey = makeKeyFrom(group);

    addGroupTab(groupKey, groupName);
    const grpTable = $(
      `<div class="tab-content" data-groupkey="${groupKey}" data-group="${groupName}">` +
        "<table><tbody class='group'></tbody></table></dev>"
    );

    let index = 0;
    for (const item of groupItems) {
      if (grpTable.find(`tr[data-key="${item.key}"]`).length == 0) {
        index += 1;
        let htmlText = htmlEntities(item.value.text);
        const oText = htmlText;
        if (type == "notes") {
          // render URLs as links
          htmlText = htmlText.replaceAll(/(\bhttps?:\/\/.*\b)/g, "<a href='$1'>$1</a>");
        }

        const titleSpan = item.value.title ? `<span class="titleSpan">${item.value.title}</span>` : "";
        const row = $(
          `<tr data-key="${item.key}" data-original="${oText}" data-group="${groupName}" data-title="${
            item.value.title
          }">${groupName.replaceAll(/'/g, "'").replaceAll(/"/g, '"')}">
                  <td class="index">${index}</td>
                  <td class="clippingCell">${titleSpan}
                    <pre class="clipping">${htmlText}</pre>
                  </td>
                  <td class="editClipping" title="Edit this ${thisWord}">
                    <span class="icon--edit-alt editClippingButton"></span>
                  </td>
                  <td class="deleteClipping" title="Delete this ${thisWord}">
                    <span class="icon--close deleteClippingButton"></span>
                  </td>
                </tr>`
        );
        grpTable.find("tbody").append(row);
      }
    }
    $("#clippings").append(grpTable);
    const itemOrderName = itemOrderNameForGroup(groupKey, type);
    if (localStorage[itemOrderName]) {
      localStorage[itemOrderName]
        .split("|")
        .reverse()
        .forEach((itemKey) => {
          if (itemKey != "") {
            // The above check prevents misbehaviour due to legacy sort orders always having an
            // extra blank key value at the end (which used to have no effect, but here will
            // result in moving the non-grouped group of items to the end of this named group)
            $(`#clippings tr[data-key="${itemKey}"]`).prependTo($(tableBodyForGroup(groupKey)));
          }
        });
      renumberClipboardGroup(groupKey);
    }
  }
  $("#tab-list .tab-name")
    .off("click")
    .on("click", function (ev) {
      showGroup($(this).parent(".tab"));
    });
  if (type == "clipboard") {
    $(".clippingCell")
      .off("click")
      .on("click", function () {
        copyClippingToClipboard($(this).closest("tr").data("original"));
        closeClipboard();
      });
  }

  $(".deleteClippingButton")
    .off("click")
    .on("click", function () {
      deleteClipping($(this).closest("tr").data("key"), type, $(this).closest("tbody.group"), e);
    });
  $(".editClippingButton").each(function () {
    const aButton = $(this);
    aButton.off("click").on("click", function () {
      // If #clippingForm is not visible, scroll it into view
      const formOffsetWithinClipboard =
        $("#clippingForm").offset().top - $("#clipboard").offset().top + $("#clipboard").scrollTop();
      $("#clipboard").animate(
        {
          scrollTop: formOffsetWithinClipboard,
        },
        500
      );

      if ($(this).closest("tr").hasClass("editing")) {
        $(this).closest("tr").removeClass("editing");
        setAddClippingAction(type);
      } else {
        $("#clipboard table tr").removeClass("editing");
        $(this).closest("tr").addClass("editing");

        $("#clippingBox").val(original2real($(this).closest("tr").data("original")));
        $("#groupInput").val(original2real($(this).closest(".tab-content").data("group")));
        $("#thingTitle").val(
          $(this).closest("tr").data("title") != "undefined" ? original2real($(this).closest("tr").data("title")) : ""
        );

        const key = $(this).closest("tr").data("key");

        $("#addClipping").text("Save edit");

        $("#addClipping")
          .off("click")
          .on("click", function (e) {
            e.preventDefault();
            editClipping(key, type, e);

            let word = "clipping";
            if (type == "notes") {
              word = "note";
            }

            $("#addClipping").text("Add " + word);
          });
      }
    });
  });

  const groupsOrderName = groupsOrderNameFor(type);
  if (localStorage[groupsOrderName]) {
    // Order the groups as determined by the saved sort order
    const $tabList = $("#tab-list");
    localStorage[groupsOrderName]
      .split("|")
      .reverse()
      .forEach((groupKey) => {
        $tabList.find(`.tab[data-groupkey="${groupKey}"]`).prependTo($tabList);
      });
  }

  if ($(".tab-content").length == 0) {
    $("#clipboard p").remove();
    let word = "clippings";
    if ($("#clipboard").data("type") == "notes") {
      word = "notes";
    }
    $("#clipboard #clippings").after($("<p>You have no " + word + ".  You can add one below.</p>"));
  }
  // Make the tabs re-orderable
  const tabList = $("#tab-list");
  if (tabList.find(".tab").length > 1) {
    tabList.sortable({
      containment: $("#groupTabs"),
      handle: ".tab-handle",
      placeholder: "sortable-tab-placeholder",
      revert: true,
      stop: function (event, ui) {
        // Record the current sort order of the groups
        let rowNum = 0;
        const order = [];
        $(this)
          .find(".tab")
          .each(function () {
            order.push($(this).data("groupkey"));
          });
        localStorage.setItem(groupsOrderNameFor(type), order.join("|"));
      },
    });
  }
  // Make the items in each group sortable
  $(".tab-content tbody.group").sortable({
    containment: $("#clipboard"),
    revert: true,
    helper: "clone",
    stop: function (event, ui) {
      // Record the current sort order within this group
      let rowNum = 0;
      const order = [];
      const groupKey = $(this).parents(".tab-content").data("groupkey") || "";
      $(this)
        .children("tr")
        .each(function () {
          rowNum++;
          $(this).find(".index").text(rowNum);
          order.push($(this).data("key"));
        });
      localStorage.setItem(itemOrderNameForGroup(groupKey, type), order.join("|"));
    },
  });
  $(`#tab-list .tab[data-groupkey="${activeTab}"] .tab-name`).trigger("click");
}

function mouseListener() {
  if (keyMode) {
    // The user started to use the mouse after having used the cursor keys
    keyMode = false;
    $(".clippingCell").removeClass("clip-selected clip-unselected");
  }
}

function keyDownListener(e) {
  if (!e.shiftKey) return; // we only react to shift-<some key>
  if (!$("#clipboard").is(":visible")) return; // and only if the clipboard is visible
  if ($("input, textarea").is(":focus")) return; // and no text input area has the focus

  if (["ArrowDown", "ArrowUp", "PageUp", "PageDown"].includes(e.code)) {
    e.preventDefault();
    e.stopPropagation();
    $("#clipboard tr").removeClass("editing");
    const clippings = $(".clippingCell:visible");
    if (!keyMode) {
      keyMode = true;
      const hoveredEl = document.querySelector(".clippingCell:hover");
      if (hoveredEl) {
        const index = clippings.index($(hoveredEl));
        if (index > 0) {
          clippingRow = index;
        }
      }
    }

    clippings.addClass("clip-unselected");
    clippings.removeClass("clip-selected");
    switch (e.code) {
      case "ArrowDown":
        clippingRow = ++clippingRow % clippings.length;
        break;
      case "ArrowUp":
        --clippingRow;
        if (clippingRow < 0) clippingRow = clippings.length - 1;
        break;
      case "PageUp":
        clippingRow = Math.max(clippingRow - 5, 0);
        break;
      case "PageDown":
        clippingRow = Math.min(clippingRow + 5, clippings.length - 1);
    }
    const selectedRow = clippings.eq(clippingRow);
    selectedRow.addClass("clip-selected").removeClass("clip-unselected");
    scrollIfRequired(selectedRow);
  } else if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
    e.preventDefault();
    e.stopPropagation();
    $("#clipboard").scrollTop(0);
    keyMode = true;
    let activeTabs = $(".tab.active");
    let el;
    if (activeTabs.length) {
      const activeTab = activeTabs.first();
      el = e.code === "ArrowRight" ? activeTab.next() : activeTab.prev();
    } else {
      activeTabs = $(".tab");
      el = e.code === "ArrowRight" ? activeTabs.first() : activeTabs.last();
    }
    if (el) {
      $(".clippingCell").removeClass("clip-selected");
      $(".clippingCell").addClass("clip-unselected");
      clippingRow = -1;
      el.find(".tab-name").trigger("click");
    }
  } else if (e.code === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    const clippings = $(".clippingCell:visible");
    if (clippingRow >= 0 && clippingRow < clippings.length) {
      $(".clippingCell.clip-selected .clipping").trigger("click");
    }
  }
}

function scrollIfRequired(selectedRow) {
  if (selectedRow.length == 0) return;

  // Calculate the position of the next element relative to the scrollable div
  // FVT = From Viewport Top
  const containerHeight = $("#clipboard").outerHeight();
  const divScrollTop = $("#clipboard").scrollTop();
  const tabsTop = $("#groupTabs").position().top;
  const tabsHeight = $("#groupTabs").outerHeight();
  const firstClipStartFVT = tabsTop + tabsHeight;
  const elementPos = selectedRow.position().top;
  const elementHeight = selectedRow.outerHeight();
  const elementTopFVT = firstClipStartFVT + elementPos;
  const elementBottomFVT = firstClipStartFVT + elementPos + elementHeight;

  // Check if the next element is below the bottom of the scrollable div
  if (elementBottomFVT > containerHeight) {
    // Scroll to bring the bottom of the next element into view
    const newScrollTop = divScrollTop + elementBottomFVT - containerHeight;
    $("#clipboard").animate({ scrollTop: newScrollTop }, 50);
    $("#clipboard").animate({ scrollTop: newScrollTop }, 50);
  } else if (elementTopFVT < 0) {
    // Scroll to bring the top of the next element into view
    const newScrollTop = elementTopFVT;
    $("#clipboard").animate({ scrollTop: newScrollTop }, 50);
  }
}

function addGroupTab(groupKey, groupName) {
  const isNoGroup = groupKey == "";
  const tab = $(
    `<li class="tab" data-groupkey="${groupKey}">` +
      `<span class="tab-handle" title="Grab here to re-order the tabs (if there is more than one)">☰</span>` +
      `<span class="tab-name" title="${
        isNoGroup ? "Click to see non-grouped items" : "Click to see this group of items"
      }">${isNoGroup ? "&nbsp;" : groupName}</span></li>`
  );
  tab.appendTo("#tab-list");
}

async function initClipboard() {
  let clipboardButtons2;
  try {
    await initializeDatabase();

    clipboardButtons2 = $(".clipboardContainer").clone(true);
    clipboardButtons2.find("#extraWatchlistButton,#addToExtraWatchlistButton,#spaceWatchlistButton").remove();
    clipboardButtons2.find("#clipboardButton").prop("id", "clipboardButton2");
    clipboardButtons2.find("#notesButton").prop("id", "notesButton2");
  } catch (error) {
    console.error(`Failed to open clipboard db`, error);
  }

  $(document)
    .off("click.pm")
    .on("click.pm", ".privateMessageLink", function () {
      setTimeout(function () {
        clipboardButtons2.insertAfter("#privateMessage-subject").css("float", "right");
      }, 2500);
    });
}

function handleClipboardClick(e) {
  try {
    e.preventDefault();
    window.clipboardClicker = $(e.target);
    const ccpc = window.clipboardClicker.parent().attr("class");
    const lccpc = window.lastClipboardClicker.parent().attr("class");
    if ($("#clipboard").data("type") == "notes") {
      $("#clipboard").remove();
      clipboard("clipboard", e);
    } else if ($("#clipboard").css("display") == "block") {
      if (ccpc == lccpc) {
        closeClipboard();
      }
    } else {
      clipboard("clipboard", e);
    }
    window.lastClipboardClicker = window.clipboardClicker;
  } catch (e) {
    extensionContextInvalidatedCheck(e);
  }
}

function handleNotesClick(e) {
  e.preventDefault();
  window.clipboardClicker = $(e.target);
  const ccpc = window.clipboardClicker.parent().attr("class");
  const lccpc = window.lastClipboardClicker.parent().attr("class");

  if (
    $("#clipboard").data("type") == "clipboard" ||
    $("#clipboard").data("type") == undefined ||
    $("#clipboard").attr("data-type") == ""
  ) {
    $("#clipboard").remove();
    clipboard("notes", e);
  } else if ($("#clipboard").css("display") == "block") {
    if (ccpc == lccpc) {
      closeClipboard();
    }
  } else {
    clipboard("notes", e);
  }

  window.lastClipboardClicker = window.clipboardClicker;
}

function showGroup($tab) {
  // Mark the active tab
  $("#tab-list .tab").removeClass("active");
  $tab.addClass("active");

  // Show the active tab content
  const groupKey = $tab.data("groupkey") || "";
  localStorage.setItem(activeTabVarNameFor($("#clipboard").data("type")), groupKey);
  $("#clippings div").hide();
  const groupDiv = $(`#clippings div[data-groupkey="${groupKey}"]`);
  $("#groupInput").val(original2real(groupDiv.data("group")));
  groupDiv.show();
}

function setClipboardText() {
  $("#clipboardInfo").remove();
  let clipboardInfoText = "";
  if ($("#toggleMarkupColor").val().match("Turn Off")) {
    clipboardInfoText =
      "<a class='btn btn-secondary btn-sm'>ON</a>: Click a clipping to copy it to your system's clipboard.";
  } else {
    clipboardInfoText = "<a class='btn btn-secondary btn-sm'>OFF</a>: Click a clipping to paste it into the textbox.";
  }
  const clipboardInfo = $("<span id='clipboardInfo'>Enhanced editor " + clipboardInfoText + "</span>");
  $("#addClipping").after(clipboardInfo);
  $("#clipboardInfo a")
    .off("click")
    .on("click", () => {
      $("#toggleMarkupColor").trigger("click");
      setClipboardText();
      if (window.activeFormElement == undefined) {
        window.activeFormElement = "wpTextbox1";
      }
    });
}

function closeClipboard() {
  $("#clipboard").slideUp();
  $(document).off("keydown", keyDownListener);
  $(document).off("mousemove", mouseListener);
  $("body").removeClass("modal-open");
}

function makeKeyFrom(groupName) {
  // The absence of the _ for the unnamed group ensures that legacy sort order for them is retained
  return groupName == "" ? groupName : `_${alphabetise(groupName)}`;
}

function alphabetise(str) {
  return str.replace(/[^a-zA-Z0-9]/g, "");
}
