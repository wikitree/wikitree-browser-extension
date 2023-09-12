/*
Created By: Ian Beacall (Beacall-6)
Groups added by Riël Smit (Smit-641)
*/

import $ from "jquery";
import "jquery-ui/ui/widgets/sortable";
import "jquery-ui/ui/widgets/draggable";
import "./clipboard_and_notes.css";
import { htmlEntities, extensionContextInvalidatedCheck } from "../../core/common";
import { shouldInitializeFeature } from "../../core/options/options_storage";

export function appendClipboardButtons(clipboardButtons = $()) {
  if ($("h1:contains('Edit Marriage Information')").length) {
    $("#header").append(clipboardButtons, $("span.theClipboardButtons"));
  } else if ($("body.page-Special_EditPerson").length) {
    if ($("#editToolbarExt").length) {
      $("#editToolbarExt").append(clipboardButtons, $("span.theClipboardButtons"));
    } else {
      $("#toolbar").append(clipboardButtons, $("span.theClipboardButtons"));
    }
  } else {
    $("#header,#HEADER").append(clipboardButtons, $("span.theClipboardButtons"));
  }
}

const editImage = chrome.runtime.getURL("images/edit.png");

shouldInitializeFeature("clipboardAndNotes").then((result) => {
  if (result && $(".clipboardButtons").length == 0) {
    // BEE class
    window.clipboardClicker = $();
    window.lastClipboardClicker = $();

    if ($("body.Special_EditPerson").length) {
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

    $("#mSources,#wpTextbox1,#wpSummary,#privateMessage-comments").on("mouseup", function () {
      window.activeTextarea = document.activeElement.id;
    });

    setTimeout(function () {
      $("#mBioWithoutSources").on("mouseup", function () {
        window.activeTextarea = document.activeElement.id;
      });
    }, 1500);
  }
});

function decodeHTMLEntities(text) {
  var textArea = document.createElement("textarea");
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

function currentActiveTabFor(type) {
  return localStorage[`clipboard_${type}_active_tab`];
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

function addClipping(type, e) {
  const group = groupNameFromInput();
  const clipboardDB = window.indexedDB.open("Clipboard", window.idbv2);
  clipboardDB.onsuccess = function (event) {
    const db = event.target.result;
    if (!db.objectStoreNames.contains("Clipboard")) {
      db.createObjectStore("Clipboard", { autoIncrement: true });
    }

    clipboardDB.result
      .transaction(["Clipboard"], "readwrite")
      .objectStore("Clipboard")
      .put({ type: type, text: $("#clippingBox").val(), group: group });

    // Add the group button so long so we can mark it active so that focus can be changed to it
    focusOnGroup(group);
    clipboard(type, e, "add");
    $("#clippingBox").val("");
  };
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

function deleteClipping(key, type, groupTBody, e) {
  const clipboardDB = window.indexedDB.open("Clipboard", window.idbv2);
  clipboardDB.onsuccess = function (event) {
    const db = event.target.result;
    if (!db.objectStoreNames.contains("Clipboard")) {
      db.createObjectStore("Clipboard", { autoIncrement: true });
    }

    clipboardDB.result
      .transaction(["Clipboard"], "readwrite")
      .objectStore("Clipboard")
      .delete(+key);

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
    $("#clippingBox").val("");
  };
}

function renameGroup(currentKey, newName, type, e) {
  const records = [];
  $(`.tab-content[data-groupkey="${currentKey}"] tr`).each((i, tr) => {
    const $tr = $(tr);
    records.push([$tr.data("key"), original2real($tr.data("original"))]);
  });

  const clipboardDB = window.indexedDB.open("Clipboard", window.idbv2);
  clipboardDB.onsuccess = function (event) {
    const db = event.target.result;
    if (!db.objectStoreNames.contains("Clipboard")) {
      db.createObjectStore("Clipboard", { autoIncrement: true });
    }

    const objStore = clipboardDB.result.transaction(["Clipboard"], "readwrite").objectStore("Clipboard");
    for (const [key, text] of records) {
      objStore.put({ type: type, text: text, group: newName }, key);
    }
    focusOnGroup(newName);
    clipboard(type, e, "edit");
    $("#groupInput").val("");
  };
}

function editClipping(key, type, e) {
  const clipboardDB = window.indexedDB.open("Clipboard", window.idbv2);
  clipboardDB.onsuccess = function (event) {
    const db = event.target.result;

    if (!db.objectStoreNames.contains("Clipboard")) {
      db.createObjectStore("Clipboard", { autoIncrement: true });
    }
    clipboardDB.result
      .transaction(["Clipboard"], "readwrite")
      .objectStore("Clipboard")
      .put({ type: type, text: $("#clippingBox").val(), group: groupNameFromInput() }, +key);

    clipboard(type, e, "edit");
    $("#clippingBox").val("");
  };
}

function copyClippingToClipboard(element) {
  const $temp = $("<textarea>");
  $("body").append($temp);
  let theText = "";
  if (typeof element == "string") {
    theText = original2real(element);
  } else {
    theText = display2real(element);
  }
  $temp.val(theText).select();
  document.execCommand("copy");
  $temp.remove();

  const enhancedEditorButton = $("#toggleMarkupColor");
  if (
    enhancedEditorButton.attr("value") == "Turn On Enhanced Editor" ||
    $("#mBioWithoutSources").length ||
    $("#photo_upload").length ||
    $("body.profile").length ||
    $("body.qa-body-js-on").length ||
    $("h1:contains('Edit Marriage Information')").length ||
    $("#mSources").length
  ) {
    const box = window.activeTextarea;
    let el = $();
    if ($("#photo_upload").length) {
      el = $("#wpUploadDescription");
    } else if ($("h1:contains('Edit Marriage Information')").length) {
      el = $("#wpSummary");
    } else if ($("#postNewCommentButton").css("display") == "none") {
      el = $("#commentPostText");
    } else if ($(".memoriesFormToggle").css("display") == "block") {
      el = $("textarea[name='wpText']");
    } else if ($("textarea[name='a_content']").length) {
      const oIframe = $(".cke_wysiwyg_frame");
      const conDoc = oIframe[0].contentDocument;
      const lastPara = conDoc.querySelector(".cke_editable");

      const dTextBox = $(lastPara);
      dTextBox.append(decodeHTMLEntities(theText));
      return;
    } else if ($("#privateMessage-comments").length) {
      el = $("#privateMessage-comments");
    } else {
      el = $("#" + box);
    }
    if (el[0]) {
      const selStart = el[0].selectionStart;
      const partA = el.val().substr(0, selStart);
      const partB = el.val().substr(selStart);

      el.val(partA + decodeHTMLEntities(theText) + partB);
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
  $("#addClipping").off();
  $("#addClipping").on("click", function (e) {
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
  $("#clippingBox").val("");
}

function placeClipboard(aClipboard, event) {
  // const mouseX = event.pageX;
  const mouseY = event.pageY;

  if ($("#privatemessage-modal").css("display") == "block") {
    aClipboard.insertAfter($(".theClipboardButtons"));
  } else if ($("h1:contains('Edit Marriage Information')").length) {
    aClipboard.insertAfter($("#header"));
  } else if ($("body.page-Special_EditPerson").length) {
    aClipboard.insertAfter($("#toolbar,#mEmail"));
  } else if (window.clipboardClicker != undefined) {
    if (window.clipboardClicker.parent().hasClass("answerForm")) {
      aClipboard.insertAfter($("form[name='a_form'] .theClipboardButtons"));
    } else if (window.clipboardClicker.parent().hasClass("commentForm")) {
      aClipboard.insertAfter($(".qa-c-form .theClipboardButtons"));
    } else {
      aClipboard.insertAfter($("#header,.qa-header"));
    }
  }

  // Set the position of the clipboard based on the current pointer location.
  aClipboard.css({
    position: "absolute",
    top: mouseY,
    // left: mouseX,
  });
}

async function clipboard(type, e, action = false) {
  let activeTab = localStorage[currentActiveTabFor(type)] || "";
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
    let word = "";
    if (type == "clipboard") {
      word = "clippings";
    } else {
      word = type;
    }

    const thisWord = word.slice(0, -1);
    const capWord = word.charAt(0).toUpperCase() + word.slice(1);

    const aClipboard = $(
      `<div id='clipboard' data-type='${type}'>` +
        `<h1>${h1}<x>x</x></h1>` +
        "<div id='tab-container'><div id='groupTabs'>" +
        "<button id='reorderTabs' class='small button' title='Reset the tab sort order to the default lexicographic order'>⇅</button>" +
        "<ul id='tab-list'></ul></div>" +
        "<section id='clippings'></section></div>" +
        `<span><label title='${capWord} can be grouped under a label entered here.'>Group:` +
        "<input id='groupInput' type='text' placeholder='(Optional)'></label>" +
        "<button id='renameGroup' class='small button' title='Rename the current active group to the value entered at the left'>Rename</button>" +
        "</span><textarea id='clippingBox'></textarea>" +
        `<button id='addClipping' class='small button'>Add ${thisWord}</button></div>`
    );

    placeClipboard(aClipboard, e);
    if ($("body.page-Special_EditPerson").length && thisWord == "clipping") {
      if ($("#clipboardInfo").length == 0) {
        setClipboardText();
      }
    }

    $("#clipboard x").off();
    $("#clipboard x").on("click", function () {
      $("#clipboard").slideUp();
    });
    $("#clipboard h1").on("dblclick", function () {
      $("#clipboard").slideUp();
    });
    $("#reorderTabs").off();
    $("#reorderTabs").on("click", function (e) {
      e.preventDefault();
      localStorage.removeItem(groupsOrderNameFor(type));
      clipboard(type, e, "edit");
    });
    $("#renameGroup").off();
    $("#renameGroup").on("click", function (e) {
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

  if ($(e.target).hasClass("aClipboardButton") || $(e.target).hasClass("aNotesButton")) {
    placeClipboard($("#clipboard"), e);
  }

  if (action == false) {
    $("#clipboard").toggle();
  } else {
    $("#clipboard").show();
  }

  window.lastClipboardClicker = window.clipboardClicker;

  $("#groupTabs p").remove();
  $("#clippings").html("");

  const clipboardDB = window.indexedDB.open("Clipboard", window.idbv2);
  clipboardDB.onsuccess = function (event) {
    const groupedItems = new Map();
    const db = event.target.result;

    if (!db.objectStoreNames.contains("Clipboard")) {
      db.createObjectStore("Clipboard", { autoIncrement: true });
    }
    const cdb = clipboardDB.result;
    const transaction = cdb.transaction(["Clipboard"]);
    const objStore = transaction.objectStore("Clipboard");

    objStore.openCursor().onsuccess = function (event) {
      const cursor = event.target.result;
      if (cursor) {
        // Collect all the required type of elements into their groups
        const value = cursor.value;
        if (value.type == type) {
          // console.log(
          //   `read key:${cursor.primaryKey} (${typeof cursor.primaryKey}), type:${value.type}, group:${value.group}`,
          //   value
          // );
          const group = value.group || "";
          const groupItems = groupedItems.get(group) || [];
          groupItems.push({ key: cursor.primaryKey, value: value });
          groupedItems.set(group, groupItems);
        }
        cursor.continue();
      } else {
        // We've collected them all, now render them
        // console.log("groupedItems", groupedItems);

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

              const row = $(
                `<tr data-key="${item.key}" data-original="${oText}" data-group="${groupName}">` +
                  groupName.replaceAll(/'/g, "'").replaceAll(/"/g, '"') +
                  `<td class="index">${index}</td>` +
                  `<td class="clipping"><pre>${htmlText}</pre></td>` +
                  `<td class="editClipping"><img src="${editImage}" class="button small editClippingButton"></td>` +
                  `<td class="deleteClipping"><span class="deleteClippingButton button small">X</span></td></tr>`
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
        $("#tab-list .tab-name").on("click", function (ev) {
          showGroup($(this).parent(".tab"));
        });
        if (type == "clipboard") {
          $(".clipping").off();
          $(".clipping").on("click", function () {
            copyClippingToClipboard($(this).parent().data("original"));
            $("#clipboard").slideUp();
          });
        }

        $(".deleteClippingButton").off();
        $(".deleteClippingButton").on("click", function () {
          deleteClipping($(this).closest("tr").data("key"), type, $(this).closest("tbody.group"), e);
        });
        $(".editClippingButton").each(function () {
          const aButton = $(this);
          aButton.off();
          aButton.on("click", function () {
            if ($(this).closest("tr").hasClass("editing")) {
              $(this).closest("tr").removeClass("editing");
              setAddClippingAction(type);
            } else {
              $("#clipboardTable tr").removeClass("editing");
              $(this).closest("tr").addClass("editing");

              $("#clippingBox").val(original2real($(this).closest("tr").data("original")));
              $("#groupInput").val(original2real($(this).closest(".tab-content").data("group")));

              const key = $(this).closest("tr").data("key");

              $("#addClipping").text("Save edit");

              $("#addClipping").off();
              $("#addClipping").on("click", function (e) {
                e.preventDefault();
                editClipping(key, type, e);

                var word = "clipping";
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
        // Make the tabs re-ordable
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
    };
  };
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
  window.idbv2 = 1;
  const clipboardReq = window.indexedDB.open("Clipboard", idbv2);
  clipboardReq.onupgradeneeded = function (event) {
    console.log(event.oldVersion);
    if (event.oldVersion < 1) {
      const clipboardDB = event.target.result;
      clipboardDB.createObjectStore("Clipboard", {
        autoIncrement: true,
      });
    }
  };
  clipboardReq.onsuccess = function (event) {
    // let clipboardDB = event.target.result;
    let clipboardButtons = $();
    const clipboardButton = $(
      "<img title='Clipboard' class='button small aClipboardButton'  src='" +
        chrome.runtime.getURL("images/clipboard.png") +
        "'>"
    );
    const notesButton = $(
      "<img title='Notes' class='button small aNotesButton' src='" + chrome.runtime.getURL("images/notes.png") + "'>"
    );
    if ($("span.theClipboardButtons").length && $(".aClipboardButton").length == 0) {
      $("span.theClipboardButtons").prepend(clipboardButton, notesButton);
    } else {
      clipboardButtons = $(
        "<span class='theClipboardButtons'><img title='Clipboard' class='button small aClipboardButton'  src='" +
          chrome.runtime.getURL("images/clipboard.png") +
          "'><img  title='Notes' class='button small aNotesButton'  src='" +
          chrome.runtime.getURL("images/notes.png") +
          "'></span>"
      );
    }

    appendClipboardButtons(clipboardButtons);

    const clipboardButtons2 = $(".theClipboardButtons").clone(true);
    $(".qa-a-form .qa-form-tall-table,.qa-c-form .qa-form-tall-table").before(clipboardButtons2);
    $("form[name='a_form'] .theClipboardButtons").addClass("answerForm");
    $(".qa-c-form .theClipboardButtons").addClass("commentForm");
    $("#toolbar + br").remove();
    $(".aClipboardButton").each(function () {
      $(this).on("click", function (e) {
        try {
          e.preventDefault();
          window.clipboardClicker = $(this);
          const ccpc = window.clipboardClicker.parent().attr("class");
          const lccpc = window.lastClipboardClicker.parent().attr("class");
          if ($("#clipboard").data("type") == "notes") {
            $("#clipboard").remove();
            clipboard("clipboard", e);
          } else if ($("#clipboard").css("display") == "block") {
            if (ccpc == lccpc || lccpc == undefined) {
              $("#clipboard").slideUp();
            }
            placeClipboard($("#clipboard"), e);
          } else {
            clipboard("clipboard", e);
          }
          window.lastClipboardClicker = window.clipboardClicker;
        } catch (e) {
          console.log(e);
          extensionContextInvalidatedCheck(e);
        }
      });
    });
    $(".aNotesButton").each(function () {
      $(this).on("click", function (e) {
        e.preventDefault();
        window.clipboardClicker = $(this);
        const ccpc = window.clipboardClicker.parent().attr("class");
        const lccpc = window.lastClipboardClicker.parent().attr("class");

        if ($("#clipboard").data("type") == "clipboard") {
          $("#clipboard").remove();
          clipboard("notes", e);
        } else if ($("#clipboard").css("display") == "block") {
          if (ccpc == lccpc || lccpc == undefined) {
            $("#clipboard").slideUp();
          }
          placeClipboard($("#clipboard"), e);
        } else {
          clipboard("notes", e);
        }

        window.lastClipboardClicker = window.clipboardClicker;
      });
    });
  };
  clipboardReq.onerror = function (event) {
    console.log("error opening clipboard/notes database: " + event.target.errorCode);
  };

  $(".privateMessageLink").on("click", function () {
    setTimeout(function () {
      $(".theClipboardButtons").insertAfter("#privateMessage-subject").css("float", "right");
      $("#privatemessage-modal-close").on("click", function () {
        $(".theClipboardButtons").appendTo($("#header"));
      });
    }, 2500);
  });
}

function showGroup($tab) {
  // Mark the active tab
  $("#tab-list .tab").removeClass("active");
  $tab.addClass("active");

  // Show the active tab content
  const groupKey = $tab.data("groupkey") || "";
  localStorage.setItem(currentActiveTabFor($("#clipboard").data("type")), groupKey);
  $("#clippings div").hide();
  const groupDiv = $(`#clippings div[data-groupkey="${groupKey}"]`);
  $("#groupInput").val(original2real(groupDiv.data("group")));
  groupDiv.show();
}

function setClipboardText() {
  $("#clipboardInfo").remove();
  let clipboardInfoText = "";
  if ($("#toggleMarkupColor").val().match("Turn Off")) {
    clipboardInfoText = "<a class='button small'>ON</a>: Click a clipping to copy it to your system's clipboard.";
  } else {
    clipboardInfoText = "<a class='button small'>OFF</a>: Click a clipping to paste it into the textbox.";
  }
  const clipboardInfo = $("<span id='clipboardInfo'>Enhanced editor " + clipboardInfoText + "</span>");
  $("#addClipping").after(clipboardInfo);
  $("#clipboardInfo a").on("click", () => {
    $("#toggleMarkupColor").trigger("click");
    setClipboardText();
    if (window.activeTextarea == undefined) {
      window.activeTextarea = "wpTextbox1";
    }
  });
}

function makeKeyFrom(groupName) {
  // The absence of the _ for the unnamed group ensures that legacy sort order for them is retained
  return groupName == "" ? groupName : `_${alphabetise(groupName)}`;
}

function alphabetise(str) {
  return str.replace(/[^a-zA-Z0-9]/g, "");
}
