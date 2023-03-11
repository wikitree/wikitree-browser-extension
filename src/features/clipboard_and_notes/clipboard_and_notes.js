/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "jquery-ui/ui/widgets/sortable";
import "jquery-ui/ui/widgets/draggable";
import "./clipboard_and_notes.css";
import { htmlEntities } from "../../core/common";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

export function appendClipboardButtons(clipboardButtons = $()) {
  if ($("h1:contains('Edit Marriage Information')").length) {
    $("#header").append(clipboardButtons, $("span.theClipboardButtons"));
  } else if ($("body.page-Special_EditPerson").length) {
    if ($("#editToolbarExt").length) {
      $("#editToolbarExt").append(clipboardButtons, $("span.theClipboardButtons"));
    } else {
      $("#toolbar").append(clipboardButtons, $("span.theClipboardButtons"));
    }
  } else if ($("body.page-Special_EditFamily").length) {
    $("#mEmail").after(clipboardButtons, $("span.theClipboardButtons"));
  } else if ($("body.page-Special_EditFamilySteps").length) {
    $("p.sourcesContent").append(clipboardButtons, $("span.theClipboardButtons"));
  } else {
    $("#header,#HEADER").append(clipboardButtons, $("span.theClipboardButtons"));
  }
}

checkIfFeatureEnabled("clipboardAndNotes").then((result) => {
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

    $("#mBioWithoutSources,#mSources,#wpTextbox1,#wpSummary,#privateMessage-comments").on("mouseup", function () {
      window.activeTextarea = document.activeElement.id;
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

    function addClipping(type) {
      const clipboardDB = window.indexedDB.open("Clipboard", window.idbv2);
      clipboardDB.onsuccess = function (event) {
        let cdb = clipboardDB.result;
        let insert = cdb
          .transaction(["Clipboard"], "readwrite")
          .objectStore("Clipboard")
          .put({ type: type, text: $("#clippingBox").val() });
        clipboard(type, "add");
        $("#clippingBox").val("");
      };
    }

    function deleteClipping(key, type) {
      const clipboardDB = window.indexedDB.open("Clipboard", window.idbv2);
      clipboardDB.onsuccess = function (event) {
        let cdb = clipboardDB.result;
        let insert = cdb.transaction(["Clipboard"], "readwrite").objectStore("Clipboard").delete(key);
        clipboard(type, "delete");
        $("#clippingBox").val("");
      };
    }

    function editClipping(key, type) {
      const clipboardDB = window.indexedDB.open("Clipboard", window.idbv2);
      clipboardDB.onsuccess = function (event) {
        let cdb = clipboardDB.result;
        let insert = cdb
          .transaction(["Clipboard"], "readwrite")
          .objectStore("Clipboard")
          .put({ type: type, text: $("#clippingBox").val() }, key);
        clipboard(type, "edit");
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

      let enhanced = false;
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
        let box = window.activeTextarea;
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

    function renumberClipboardTable() {
      let rowNum = 0;
      $("#clipboard tbody tr").each(function () {
        rowNum++;
        $(this).find(".index").text(rowNum);
      });
    }

    function setAddClippingAction(type) {
      $("#addClipping").unbind();
      $("#addClipping").on("click", function (e) {
        e.preventDefault();
        if ($("#clippingBox").val() != "") {
          addClipping(type);
        }
      });
      let word = "clipping";
      if (type == "notes") {
        word = "note";
      }
      $("#addClipping").text("Add " + word);
      $("#clippingBox").val("");
    }

    function placeClipboard(aClipboard) {
      if ($("#privatemessage-modal").css("display") == "block") {
        aClipboard.insertAfter($(".theClipboardButtons"));
      } else if ($("h1:contains('Edit Marriage Information')").length) {
        aClipboard.insertAfter($("#header"));
      } else if ($("body.page-Special_EditPerson,body.page-Special_EditFamily").length) {
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
    }

    async function clipboard(type, action = false) {
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

        let thisWord = word.slice(0, -1);

        const aClipboard = $(
          "<div id='clipboard' data-type='" +
            type +
            "'><h1>" +
            h1 +
            "<x>x</x></h1><table id='clipboardTable'><tbody></tbody></table><textarea id='clippingBox'></textarea><button class='small button' id='addClipping'>Add " +
            thisWord +
            "</button></div>"
        );

        placeClipboard(aClipboard);
        if ($("body.page-Special_EditPerson").length && thisWord == "clipping") {
          if ($("#clipboardInfo").length == 0) {
            function setClipboardText() {
              $("#clipboardInfo").remove();
              let clipboardInfoText = "";
              if ($("#toggleMarkupColor").val().match("Turn Off")) {
                clipboardInfoText =
                  "<a class='button small'>ON</a>: Click a clipping to copy it to your system's clipboard.";
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
            setClipboardText();
          }
        }

        $("#clipboard x").unbind();
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

      if (action == false) {
        $("#clipboard").toggle();

        placeClipboard($("#clipboard"));
      } else {
        $("#clipboard").show();
        placeClipboard($("#clipboard"));
      }

      window.lastClipboardClicker = window.clipboardClicker;

      $("#clipboard table").show();
      $("#clipboard p").remove();
      $("#clipboard tbody").html("");

      const clipboardDB = window.indexedDB.open("Clipboard", window.idbv2);
      clipboardDB.onsuccess = function (event) {
        let cdb = clipboardDB.result;
        let transaction = cdb.transaction(["Clipboard"]);
        let req = transaction.objectStore("Clipboard").openCursor();
        req.onsuccess = function (event) {
          let res = req.result;
          res = [];
          let cursor = event.target.result;

          if (cursor) {
            let key = cursor.primaryKey;
            let value = cursor.value;

            if (value.type == type) {
              if ($("#clipboardTable tr[data-key='" + key + "']").length == 0) {
                $("#clipboard p").remove();
                let index = $("#clipboard table tbody tr").length + 1;
                let thisText = "";
                thisText = htmlEntities(value.text);
                let oText = thisText;
                if (type == "notes") {
                  thisText = thisText.replaceAll(/(\bhttps?:\/\/.*\b)/g, "<a href='$1'>$1</a>");
                }

                const row = $(
                  "<tr data-key='" +
                    key +
                    "' data-original='" +
                    oText.replaceAll(/'/g, "'").replaceAll(/"/g, '"') +
                    "'><td class='index'>" +
                    index +
                    "</td><td class='clipping'><pre>" +
                    thisText +
                    "</pre></td><td class='editClipping'><img src='" +
                    chrome.runtime.getURL("images/edit.png") +
                    "' class='button small editClippingButton'></td><td class='deleteClipping '><span class='deleteClippingButton button small'>X</span></td></tr>"
                );
                $("#clipboard tbody").append(row);

                if (type == "clipboard") {
                  $(".clipping").unbind();
                  $(".clipping").click(function () {
                    copyClippingToClipboard($(this).parent().data("original"));
                    $("#clipboard").slideUp();
                  });
                }
              }
            }
            cursor.continue();
          }
          $(".deleteClippingButton").unbind();
          $(".deleteClippingButton").click(function () {
            deleteClipping($(this).closest("tr").data("key"), type);
          });
          $(".editClippingButton").each(function () {
            let aButton = $(this);
            aButton.unbind();
            aButton.click(function () {
              if ($(this).closest("tr").hasClass("editing")) {
                $(this).closest("tr").removeClass("editing");
                setAddClippingAction(type);
              } else {
                $("#clipboardTable tr").removeClass("editing");
                $(this).closest("tr").addClass("editing");

                $("#clippingBox").val(original2real($(this).closest("tr").data("original")));

                let key = $(this).closest("tr").data("key");

                $("#addClipping").text("Save edit");

                $("#addClipping").unbind();
                $("#addClipping").on("click", function (e) {
                  e.preventDefault();
                  editClipping(key, type);

                  var word = "clipping";
                  if (type == "notes") {
                    word = "note";
                  }

                  $("#addClipping").text("Add " + word);
                });
              }
            });
          });

          if (localStorage["clipboard_" + type + "_order"]) {
            let theOrder = localStorage["clipboard_" + type + "_order"].split("|");
            theOrder.forEach(function (aKey) {
              $("#clipboard tr[data-key='" + aKey + "']").appendTo($("#clipboardTable tbody"));
              renumberClipboardTable();
            });
          }

          if ($("#clipboard table tbody tr").length == 0) {
            $("#clipboard p").remove();
            let word = "clippings";
            if ($("#clipboard").data("type") == "notes") {
              word = "notes";
            }
            $("#clipboard table").after($("<p>You have no " + word + ".  You can add one below.</p>"));
          }
          $("#clipboard tbody").sortable({
            containment: $("#clipboard"),
            revert: true,
            stop: function (event, ui) {
              let rowNum = 0;
              let order = "";
              $("#clipboard tbody tr").each(function () {
                rowNum++;
                $(this).find(".index").text(rowNum);
                order += $(this).data("key") + "|";
              });
              localStorage.setItem("clipboard_" + type + "_order", order);
            },
          });
        };
      };
    }

    async function initClipboard() {
      window.idbv2 = 1;
      const clipboardReq = window.indexedDB.open("Clipboard", idbv2);
      clipboardReq.onupgradeneeded = function (event) {
        console.log(event.oldVersion);
        if (event.oldVersion < 1) {
          let clipboardDB = event.target.result;
          let cOS = clipboardDB.createObjectStore("Clipboard", {
            autoIncrement: true,
          });
        }
      };
      clipboardReq.onsuccess = function (event) {
        let clipboardDB = event.target.result;
        let clipboardButtons = $();
        const clipboardButton = $(
          "<img title='Clipboard' class='button small aClipboardButton'  src='" +
            chrome.runtime.getURL("images/clipboard.png") +
            "'>"
        );
        const notesButton = $(
          "<img  title='Notes' class='button small aNotesButton'  src='" +
            chrome.runtime.getURL("images/notes.png") +
            "'>"
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

        let clipboardButtons2 = $(".theClipboardButtons").clone(true);
        $(".qa-a-form .qa-form-tall-table,.qa-c-form .qa-form-tall-table").before(clipboardButtons2);
        $("form[name='a_form'] .theClipboardButtons").addClass("answerForm");
        $(".qa-c-form .theClipboardButtons").addClass("commentForm");
        $("#toolbar + br").remove();
        $(".aClipboardButton").each(function () {
          $(this).on("click", function (e) {
            e.preventDefault();
            window.clipboardClicker = $(this);
            let ccpc = window.clipboardClicker.parent().attr("class");
            let lccpc = window.lastClipboardClicker.parent().attr("class");
            if ($("#clipboard").data("type") == "notes") {
              $("#clipboard").remove();
              clipboard("clipboard");
            } else if ($("#clipboard").css("display") == "block") {
              if (ccpc == lccpc || lccpc == undefined) {
                $("#clipboard").slideUp();
              }
              placeClipboard($("#clipboard"));
            } else {
              clipboard("clipboard");
            }
            window.lastClipboardClicker = window.clipboardClicker;
          });
        });
        $(".aNotesButton").each(function () {
          $(this).on("click", function (e) {
            e.preventDefault();
            window.clipboardClicker = $(this);
            let ccpc = window.clipboardClicker.parent().attr("class");
            let lccpc = window.lastClipboardClicker.parent().attr("class");

            if ($("#clipboard").data("type") == "clipboard") {
              $("#clipboard").remove();
              clipboard("notes");
            } else if ($("#clipboard").css("display") == "block") {
              if (ccpc == lccpc || lccpc == undefined) {
                $("#clipboard").slideUp();
              }
              placeClipboard($("#clipboard"));
            } else {
              clipboard("notes");
            }

            window.lastClipboardClicker = window.clipboardClicker;
          });
        });
      };
      clipboardReq.onerror = function (event) {
        console.log("error opening database " + event.target.errorCode);
      };

      $(".privateMessageLink").on("click", function () {
        setTimeout(function () {
          $(".theClipboardButtons").insertAfter("#privateMessage-subject").css("float", "right");
          $("#privatemessage-modal-close").on("click", function () {
            $(".theClipboardButtons").appendTo($("#header"));
          });
        }, 1000);
      });
    }
  }
});
