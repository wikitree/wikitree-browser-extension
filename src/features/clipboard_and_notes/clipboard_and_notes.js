/*
Created By: Ian Beacall (Beacall-6)
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

function addClipping(type, e) {
  const clipboardDB = window.indexedDB.open("Clipboard", window.idbv2);
  clipboardDB.onsuccess = function (event) {
    const db = event.target.result;

    if (!db.objectStoreNames.contains("Clipboard")) {
      db.createObjectStore("Clipboard", { autoIncrement: true });
    }
    const cdb = clipboardDB.result;
    const group = $("#groupBox").val().trim();
    console.log(`group='${group}'`);
    cdb
      .transaction(["Clipboard"], "readwrite")
      .objectStore("Clipboard")
      .put({ type: type, text: $("#clippingBox").val(), group: group });
    clipboard(type, e, "add");
    $("#clippingBox").val("");
  };
}

function deleteClipping(key, type, groupTBody, e) {
  const clipboardDB = window.indexedDB.open("Clipboard", window.idbv2);
  clipboardDB.onsuccess = function (event) {
    const db = event.target.result;

    if (!db.objectStoreNames.contains("Clipboard")) {
      db.createObjectStore("Clipboard", { autoIncrement: true });
    }
    const cdb = clipboardDB.result;
    cdb.transaction(["Clipboard"], "readwrite").objectStore("Clipboard").delete(key);

    if (groupTBody.children("tr").length == 1) {
      // We've removed the last item in a group, delete the group order record
      const groupKey = groupTBody.siblings("caption").data("key") || "";
      console.log(`Deleteing ${itemOrderNameForGroup(groupKey, type)}`);
      cdb
        .transaction(["Clipboard"], "readwrite")
        .objectStore("Clipboard")
        .delete(itemOrderNameForGroup(groupKey, type));
    }
    clipboard(type, e, "delete");
    $("#clippingBox").val("");
  };
}

function editClipping(key, type, e) {
  const clipboardDB = window.indexedDB.open("Clipboard", window.idbv2);
  clipboardDB.onsuccess = function (event) {
    const db = event.target.result;

    if (!db.objectStoreNames.contains("Clipboard")) {
      db.createObjectStore("Clipboard", { autoIncrement: true });
    }
    const cdb = clipboardDB.result;
    console.log(`Edited. group=${$("#groupBox").val().trim()}`);
    cdb
      .transaction(["Clipboard"], "readwrite")
      .objectStore("Clipboard")
      .put({ type: type, text: $("#clippingBox").val(), group: $("#groupBox").val().trim() }, key);
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

function renumberClipboardTableGroups() {
  let rowNum = 0;
  $("#cbtBody > tr").each(function () {
    rowNum++;
    $(this).children(".index").text(rowNum);
  });
}

function tableBodyForGroup(groupKey) {
  return `#cbtBody tr[data-key="${groupKey}"] tbody.group`;
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
  if ($("#clipboard").length) {
    $("#clipboard tbody").html("");
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

    const aClipboard = $(
      "<div id='clipboard' data-type='" +
        type +
        "'><h1>" +
        h1 +
        "<x>x</x></h1><table id='clipboardTable'><tbody id='cbtBody'></tbody></table>" +
        `<textarea id="groupBox" rows="1" cols="50" placeholder="${
          thisWord.charAt(0).toUpperCase() + thisWord.slice(1)
        } Group. No group if you can see this."></textarea>` +
        "<textarea id='clippingBox'></textarea>" +
        "<button class='small button' id='addClipping'>Add " +
        thisWord +
        "</button></div>"
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

  $("#clipboard table").show();
  $("#clipboard p").remove();
  $("#clipboard tbody").html("");

  const clipboardDB = window.indexedDB.open("Clipboard", window.idbv2);
  clipboardDB.onsuccess = function (event) {
    console.log("clipboardDB.open.onsuccess called");
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
          console.log(`read key:${cursor.primaryKey}, type:${value.type}, group:${value.group}`, value);
          const group = value.group || "";
          const groupItems = groupedItems.get(group) || [];
          groupItems.push({ key: cursor.primaryKey, value: value });
          groupedItems.set(group, groupItems);
        }
        cursor.continue();
      } else {
        // We've collected them all, now render them
        console.log("groupedItems", groupedItems);
        if (groupedItems.size > 0) $("#clipboard p").remove();

        let groupNr = 0;
        for (const group of [...groupedItems.keys()].sort()) {
          // Render a group - the group of non-grouped items are rendered first
          // Each group is rendered as a table in a row of the main table
          const groupItems = groupedItems.get(group);
          const groupName = htmlEntities(group);
          const groupKey = makeKeyFrom(group);
          console.log(`drawing group '${group}', key:${groupKey}`, groupItems);

          const grpTable = $(
            `<tr data-key='${groupKey}'><td class="index" style="display: none;">${++groupNr}</td>` +
              "<td><table><tbody class='group'>" +
              "<caption class='groupName' title='Double-click to collapse or expand. Drag to re-position'" +
              ` data-key='${groupKey}'>${groupName}</caption>` +
              `</tbody></table></td></tr>`
          );
          $("#cbtBody").append(grpTable);

          let index = 0;
          for (const item of groupItems) {
            if ($("#clipboardTable tr[data-key='" + item.key + "']").length == 0) {
              index += 1;
              let thisText = "";
              thisText = htmlEntities(item.value.text);
              const oText = thisText;
              if (type == "notes") {
                // render URLs as links
                thisText = thisText.replaceAll(/(\bhttps?:\/\/.*\b)/g, "<a href='$1'>$1</a>");
              }

              const row = $(
                "<tr data-key='" +
                  item.key +
                  "' data-original='" +
                  oText.replaceAll(/'/g, "'").replaceAll(/"/g, '"') +
                  "' data-group='" +
                  groupName.replaceAll(/'/g, "'").replaceAll(/"/g, '"') +
                  "'><td class='index'>" +
                  index +
                  "</td><td class='clipping'><pre>" +
                  thisText +
                  "</pre></td><td class='editClipping'><img src='" +
                  editImage +
                  "' class='button small editClippingButton'></td><td class='deleteClipping '><span class='deleteClippingButton button small'>X</span></td></tr>"
              );
              $("#cbtBody tbody.group:last").append(row);

              if (type == "clipboard") {
                $(".clipping").off();
                $(".clipping").on("click", function () {
                  copyClippingToClipboard($(this).parent().data("original"));
                  $("#clipboard").slideUp();
                });
              }
            }
          }
        }
        $("#cbtBody .groupName").off();
        $("#cbtBody .groupName").on("dblclick", function () {
          $(this).closest("table").children("tbody.group").slideToggle();
        });
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
              $("#groupBox").val(original2real($(this).closest("tr").data("group")));

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
        console.log(`checking for ${groupsOrderName}`);
        if (localStorage[groupsOrderName]) {
          // Order the groups as determined by the saved sort order
          const reverseGroupOrder = localStorage[groupsOrderName].split("|").reverse();
          console.log("found reverse order:", reverseGroupOrder);
          reverseGroupOrder.forEach((groupKey) => {
            $(`#cbtBody > tr[data-key="${groupKey}"]`).prependTo($("#cbtBody"));
          });
          renumberClipboardTableGroups();
        }
        // Order the items in the groups as determined by the saved sort order
        for (const groupName of [...groupedItems.keys()]) {
          const groupKey = makeKeyFrom(groupName);
          const itemOrderName = itemOrderNameForGroup(groupKey, type);
          console.log(`checking for ${itemOrderName}`);
          if (localStorage[itemOrderName]) {
            const reverseItemOrder = localStorage[itemOrderName].split("|").reverse();
            console.log("found reverse order:", reverseItemOrder);
            reverseItemOrder.forEach((itemKey) => {
              if (itemKey != "") {
                // The above check prevents misbehaviour due to legacy sort orders always having an
                // extra blank key value at the end (which used to have no effect, but here will
                // result in moving the non-grouped group of items to the end of this named group)
                // console.log(
                //   `should preppend item ${itemKey} to goup '${groupKey}'`,
                //   $(`#cbtBody tr[data-key="${itemKey}"]`),
                //   $(tableBodyForGroup(groupKey))
                // );
                $(`#cbtBody tr[data-key="${itemKey}"]`).prependTo($(tableBodyForGroup(groupKey)));
              }
            });
            renumberClipboardGroup(groupKey);
          }
        }

        if ($("#clipboard table tbody tr").length == 0) {
          $("#clipboard p").remove();
          let word = "clippings";
          if ($("#clipboard").data("type") == "notes") {
            word = "notes";
          }
          $("#clipboard table").after($("<p>You have no " + word + ".  You can add one below.</p>"));
        }
        // Make the list of groups re-ordable
        $("#cbtBody").sortable({
          containment: $("#clipboard"),
          revert: true,
          stop: function (event, ui) {
            let rowNum = 0;
            const order = [];
            $(this)
              .children("tr")
              .each(function () {
                rowNum++;
                $(this).children(".index").text(rowNum);
                order.push($(this).data("key"));
              });
            console.log(`Writing ${groupsOrderNameFor(type)}: ${order.join("|")}`, order);
            localStorage.setItem(groupsOrderNameFor(type), order.join("|"));
          },
        });
        // Make the items in each group sortable
        $("#cbtBody tbody.group").sortable({
          containment: $("#clipboard"),
          revert: true,
          helper: "clone",
          stop: function (event, ui) {
            let rowNum = 0;
            const order = [];
            const groupKey = $(this).siblings("caption").data("key") || "";
            $(this)
              .children("tr")
              .each(function () {
                rowNum++;
                $(this).find(".index").text(rowNum);
                order.push($(this).data("key"));
              });
            console.log(`Writing ${itemOrderNameForGroup(groupKey, type)}: ${order.join("|")}`, order);
            localStorage.setItem(itemOrderNameForGroup(groupKey, type), order.join("|"));
          },
        });
      }
    };
  };
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
