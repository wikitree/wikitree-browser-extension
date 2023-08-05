/*
Created By: Aleš Trtnik (Trtnik-2)
*/

import { isWikiEdit } from "../../core/pageType";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { wtAPICatCIBSearch } from "../../core/API/wtPlusAPI";
import { dataTables, dataTableTemplateFindByName, dataTablesLoad } from "../../core/API/wtPlusData";

let tb = {};

const newTabIconURL = chrome.runtime.getURL("images/newTab.png");

shouldInitializeFeature("wtplus").then((result) => {
  if (result && isWikiEdit) {
    import("./wtPlus.css");
    initWTPlus();
  }
});

function paramsCopy(templateName) {
  tb.template = dataTableTemplateFindByName(templateName);
  tb.templateitems = tb.template.prop.map((item) => {
    return {
      name: item.name,
      type: item.type,
      usage: item.usage,
      numbered: item.numbered,
      initial: item.initial,
      help: item.help,
      example: item.example,
      group: item.group,
      values: item.values || [],
      value: "",
    };
  });
  tb.unknownParams = "";
}

function paramsFromSelection() {
  //finds menu item
  //    var params = tb.textSelected.split(/.*?\|\s*([^{}[\]|]*?(?:\[\[[^{}[\]|]*?(?:\|[^{}[\]|]*?)*?[^{}[\]|]*?\]\][^{}[\]|]*?|\{\{[^{}[\]|]*?(?:\|[^{}[\]|]*?)*?[^{}[\]|]*?\}\}[^{}[\]|]*?)*?[^{}[\]|]*?)\s*(?:(?=\|)|}})/g).map(par => par.trim()).filter(par => par != '');
  var params = tb.textSelected
    .split(
      /\|\s*([^{}[\]|]*?(?:\[\[[^{}[\]|]*?(?:\|[^{}[\]|]*?)*?[^{}[\]|]*?\]\][^{}[\]|]*?|\{\{[^{}[\]|]*?(?:\|[^{}[\]|]*?)*?[^{}[\]|]*?\}\}[^{}[\]|]*?)*?[^{}[\]|]*?)\s*(?:(?=\|)|}})/g
    )
    .map((par) => par.trim())
    .filter((par) => par != "");
  tb.textSelected = tb.textSelected.replace("{{", "").replace("}}", "");
  params[0] = params[0].replace("{{", "").replace("}}", "").replace("_", " ");
  tb.template = dataTableTemplateFindByName(params[0]);
  if (tb.template) {
    params.splice(0, 1);
    var paramsNumbered = params.filter((par) => !par.includes("="));
    var paramsNamed = params.filter((par) => par.includes("=")).map((item) => item.split("=").map((par) => par.trim()));
    tb.templateitems = tb.template.prop.map((item) => {
      var x;
      if (item.numbered) {
        x = paramsNumbered[item.numbered - 1];
      } else {
        x = paramsNamed
          .filter((par) => par[0].toUpperCase() === item.name.toUpperCase())
          .map((par) => par[1])
          .join("");
      }
      if (!x) {
        x = "";
      }
      return {
        name: item.name,
        type: item.type,
        usage: item.usage,
        numbered: item.numbered,
        initial: item.initial,
        help: item.help,
        example: item.example,
        group: item.group,
        values: item.values || [],
        value: x.trim(),
      };
    });
    var unknownNamed = paramsNamed.filter(
      (par) => !tb.templateitems.find((ti) => ti.name.toUpperCase() === par[0].toUpperCase())
    );
    var unknownNumbered = paramsNumbered.filter((par, i) => !tb.templateitems.find((ti) => ti.numbered === i + 1));
    tb.unknownParams = unknownNamed
      .map((i) => "|" + i[0] + "= " + i[1])
      .concat(unknownNumbered.map((i) => "|" + i))
      .join("\n");
  } else {
    alert('Template "' + params[0] + '" is not recognised by the extension');
  }
}

function paramsInitialValues() {
  if (tb.templateitems && tb.templateitems.length) {
    for (let prop of tb.templateitems) {
      if (prop.value === "" && prop.initial) {
        if (prop.initial.startsWith("Title:")) {
          prop.value = document.title.replace(RegExp(prop.initial.substring(6)), "$1");
        }
        if (prop.initial.startsWith("Category:") && tb.categories) {
          var r = RegExp(prop.initial.substring(9), "mg");
          var a = tb.categories.match(r);
          prop.value = a ? a.join("\n").replace(r, "$1") : "";
        }
      }
    }
  }
}

function reformatCoortoURL(s) {
  return "https://www.openstreetmap.org/#map=18/" + s.replace(",", "/").replace("%20", "");
}

function reformatURLtoCoor(s) {
  if (
    s.match(/^ *[\d]* *° *[\d]* *[′'] *([\d.]* *[″”"])? *[NS][, ]*[\d]* *° *[\d]* *[′'] *([\d.]* *[″”"])? *[EW] *$/gim)
  ) {
    // 32°42'16.02"N, 17°8'0.67"W
    let s1 = s.replace(
      /^ *([\d]{1,2}) *° *([\d]{1,2}) *[′'] *(([\d.]{1,5}) *[″”"])? *([NS])[, ]*([\d]{1,3}) *° *([\d]{1,2}) *[′'] *(([\d.]{1,5}) *[″”"])? *([EW]) *$/gim,
      "$1;$2;$4;$5;$6;$7;$9;$10"
    );
    let arr = s1.split(";");
    var lon, lat;
    lat = (arr[3] == "S" ? -1 : 1) * (Number(arr[0]) + Number(arr[1]) / 60 + Number(arr[2]) / 3600);
    lon = (arr[7] == "W" ? -1 : 1) * (Number(arr[4]) + Number(arr[5]) / 60 + Number(arr[6]) / 3600);
    return parseFloat(lat.toFixed(6)) + ", " + parseFloat(lon.toFixed(6));
  } else if (s.match(/^https:\/\/www\.openstreetmap\.org\/#map=[\d]*\/[\d.-]*\/[\d.-]*$/gim)) {
    // https://www.openstreetmap.org/#map=15/32.7051/-17.1220
    let s1 = s.replace(/^https:\/\/www\.openstreetmap\.org\/#map=[\d]{1,2}\/([\d.-]*)\/([\d.-]*)$/gim, "$1, $2");
    return s1;
  } else {
    return s.replace("/", ", ");
  }
}

function reformatTexttoWiki(s) {
  return s.replace(/ /g, "_");
}

function reformatWikitoText(s) {
  return decodeURIComponent(s.replace(/_/g, " "));
}

function getNumbertoSlash(s) {
  return s.replace(/(\d*)\/.*/g, "$1");
}

const urlMappings = [
  { type: "", placeholder: "Undefined type" },
  { type: "typeText", placeholder: "Enter text" },
  { type: "typeNumber", placeholder: "Enter a number" },
  { type: "typeDate", placeholder: "Enter date (d mmm yyyy)" },
  { type: "typeYear", placeholder: "Enter year (yyyy)" },
  { type: "typeYes", placeholder: "Enter yes" },
  { type: "typeNo", placeholder: "Enter no" },
  { type: "typeURL", placeholder: "Enter URL https://...", prefixURL: "", sufixURL: "", emptyURL: "" },
  {
    type: "typeWikitreeID",
    placeholder: "Enter profile's WikitreeID",
    prefixURL: "https://www.wikitree.com/wiki/",
    sufixURL: "",
    emptyURL: "",
    toURL: reformatTexttoWiki,
    fromURL: reformatWikitoText,
  },
  {
    type: "typeUser",
    placeholder: "Enter user's WikitreeID",
    prefixURL: "https://www.wikitree.com/wiki/",
    sufixURL: "",
    emptyURL: "",
    toURL: reformatTexttoWiki,
    fromURL: reformatWikitoText,
  },
  {
    type: "typePage",
    placeholder: "Enter Page name with Namespace",
    prefixURL: "https://www.wikitree.com/wiki/",
    sufixURL: "",
    emptyURL: "",
    toURL: reformatTexttoWiki,
    fromURL: reformatWikitoText,
  },
  {
    type: "typeCategory",
    placeholder: "Enter Category on WikiTree",
    prefixURL: "https://www.wikitree.com/wiki/Category:",
    sufixURL: "",
    emptyURL: "",
    toURL: reformatTexttoWiki,
    fromURL: reformatWikitoText,
  },
  {
    type: "typeProjectNeedsCategory",
    placeholder: "Enter Project Needs category",
    prefixURL: "",
    sufixURL: "",
    emptyURL: "",
  },
  {
    type: "typeProject",
    placeholder: "Enter Project on WikiTree",
    prefixURL: "https://www.wikitree.com/wiki/Project:",
    sufixURL: "",
    emptyURL: "",
    toURL: reformatTexttoWiki,
    fromURL: reformatWikitoText,
  },
  {
    type: "typeTeam",
    placeholder: "Enter Team of the project on WikiTree",
    prefixURL: "https://www.wikitree.com/wiki/Space:",
    sufixURL: " Team",
    emptyURL: "",
    toURL: reformatTexttoWiki,
    fromURL: reformatWikitoText,
  },
  {
    type: "typeSpace",
    placeholder: "Enter Space page on WikiTree",
    prefixURL: "https://www.wikitree.com/wiki/Space:",
    sufixURL: "",
    emptyURL: "",
    toURL: reformatTexttoWiki,
    fromURL: reformatWikitoText,
  },
  {
    type: "typeImage",
    placeholder: "Enter Image name",
    prefixURL: "https://www.wikitree.com/wiki/Image:",
    sufixURL: "",
    emptyURL: "",
    toURL: reformatTexttoWiki,
    fromURL: reformatWikitoText,
  },
  {
    type: "typeG2G",
    placeholder: "Enter question ID",
    prefixURL: "https://www.wikitree.com/g2g/",
    sufixURL: "",
    emptyURL: "",
    fromURL: getNumbertoSlash,
  },
  {
    type: "typeWikiTreeBlog",
    placeholder: "Enter blog name",
    prefixURL: "https://www.wikitree.com/blog/",
    sufixURL: "/",
    emptyURL: "",
  },
  {
    type: "typeWikiData",
    placeholder: "Enter WikiData code",
    prefixURL: "https://www.wikidata.org/wiki/",
    sufixURL: "",
  },
  {
    type: "typeYouTube",
    placeholder: "Enter YouTube code",
    prefixURL: "https://www.youtube.com/watch?v=",
    sufixURL: "",
  },
  {
    type: "typeFAGID",
    placeholder: "Enter FindAGrave ID",
    prefixURL: "https://www.findagrave.com/memorial/",
    sufixURL: "",
    emptyURL: "",
    fromURL: getNumbertoSlash,
  },
  {
    type: "typeFAGCemID",
    placeholder: "Enter FindAGrave Cemetery ID",
    prefixURL: "https://www.findagrave.com/cemetery/",
    sufixURL: "",
    emptyURL: "",
    fromURL: getNumbertoSlash,
  },
  {
    type: "typeFAGLocID",
    placeholder: "Enter FindAGrave Location ID",
    prefixURL: "https://www.findagrave.com/cemetery/search?locationId=",
  },
  {
    type: "typeBGID",
    placeholder: "Enter BillionGraves ID",
    prefixURL: "https://billiongraves.com/cemetery/Cemetery/",
    sufixURL: "",
    emptyURL: "https://billiongraves.com/",
  },
  {
    type: "typeCoor",
    placeholder: "Enter coordinate 15.123, -33.213",
    prefixURL: "",
    sufixURL: "",
    emptyURL: "https://www.openstreetmap.org/",
    toURL: reformatCoortoURL,
    fromURL: reformatURLtoCoor,
  },
  { type: "typeTOC", placeholder: "Not enough prfiles" },
  { type: "typeReadOnly" },
];

/* Setting result */

function updateEdit() {
  if (tb.elEnhancedActive) {
    tb.elEnhanced.click();
  }
  tb.elText.value = tb.textResult;
  if (tb.elEnhancedActive) {
    tb.elEnhanced.click();
  }
  tb.elText.setSelectionRange(tb.selStart, tb.selEnd);

  if (tb.birthLocationResult) {
    tb.elBirthLocation.value = tb.birthLocationResult;
  }
  if (tb.deathLocationResult) {
    tb.elDeathLocation.value = tb.deathLocationResult;
  }

  if (tb.elSummary) {
    tb.elSummary.focus();
    var s = tb.elSummary.value;
    if (s) {
      if (s.indexOf(tb.addToSummary) == -1) {
        s += ", " + tb.addToSummary;
      }
    } else {
      s = tb.addToSummary;
    }
    tb.elSummary.value = s;
  }
  tb.elText.focus();
  tb.addToSummary = "";

  // Let the page know that changes have been made so that the "Save Changes" button works
  //    if ("createEvent" in document) {
  var evt = document.createEvent("HTMLEvents");
  evt.initEvent("change", false, true);
  tb.elText.dispatchEvent(evt);
  //      } else {
  //        textbox.fireEvent("onchange");
  //      }
}

/**************************/
/* edit Template          */
/**************************/

function editTemplate(summaryPrefix) {
  if (tb.template) {
    var group, groupExpanded;
    tb.elDlg.innerHTML =
      '<h3 style="margin: 0 0 0 10px;">Editing ' +
      '<a href="/wiki/Template:' +
      tb.template.name +
      '" target="_blank">Template:' +
      tb.template.name +
      "</a></h3>" +
      '<table style="margin-bottom: 10px;"><tr><td style="white-space: nowrap;padding-right: 10px;">' +
      (tb.template.type ? "Type: <b>" + tb.template.type + "</b><br>" : "") +
      (tb.template.group ? "Group: <b>" + tb.template.group + "</b><br>" : "") +
      (tb.template.subgroup ? "SubGroup: <b>" + tb.template.subgroup + "</b>" : "") +
      "</td><td>" +
      tb.template.help +
      "</td></tr></table>" +
      '<div id="wtPlusDlgParams">' +
      '<table style="width: 100%;">' +
      tb.templateitems
        .map((item, i) => {
          var itemDef = urlMappings.filter((a) => a.type == item.type)[0];
          if (!itemDef) {
            console.log("Missing " + item.type + " type");
            itemDef = urlMappings[0];
          }
          // Sets TOC parameter
          if (item.type === "typeTOC") {
            var has_link = [].some.call(document.links, function (link) {
              return link.innerHTML.endsWith(" 200");
            });
            item.value = has_link ? "yes" : "";
          }
          var x = "";
          // Group
          if (item.group !== group) {
            if (item.group) {
              groupExpanded = Boolean(tb.templateitems.find((a) => a.group == item.group && a.value));
              x +=
                '<tr class="wtPlus' +
                item.group +
                '"><td colspan="2"><label>' +
                item.group +
                ":</label></td><td>" +
                '<button id="groupBtn' +
                item.group +
                '" title="Expand/Collapse" class="dlgClick" data-op="onDlgEditTemplateExpCol" data-id="' +
                item.group +
                '">' +
                (groupExpanded ? "Collapse" : "Expand") +
                '</button></td><td colspan="3"></td></tr>';
            }
            group = item.group;
          }
          x +=
            '<tr class="wtPlus' +
            item.usage +
            (item.group ? " group" + item.group + '" ' + (groupExpanded ? "" : 'style="visibility: collapse;') : "") +
            '">';
          // Name
          x += "<td><label>" + item.name + ":</label></td>";
          // Help
          x +=
            "<td>" +
            (item.help
              ? '<img src="/images/icons/help.gif" border="0" width="22" height="22" alt="Help" title="Usage: ' +
                item.usage +
                "\n" +
                item.help +
                (item.example ? "\nExample: " + item.example : "") +
                '" />'
              : "") +
            "</td>";
          // Input
          x +=
            '<td><input type="text" name="wtparam' +
            i +
            '" class="dlgPaste' +
            /*((item.type === "typeCategory") ? ' dlgCat' : '' ) + */ '" ' +
            'data-op="onDlgEditTemplatePaste" data-id="' +
            i +
            '" value="' +
            item.value +
            '" ';
          x += 'placeholder="' + itemDef.placeholder + '" ';
          x += 'list="wtPlusAutoComplete' + i + '" ';
          if (item.type === "typeReadOnly" || item.type === "typeTOC") {
            x += "readonly ";
          }
          if (i === 0) {
            x += "autofocus ";
          }
          x += '/><datalist id="wtPlusAutoComplete' + i + '">';
          x += item.values.map((item) => '<option value="' + item + '"/>').join("\n");
          x += "</datalist></td>";
          //Buttons
          x +=
            "<td>" +
            (item.type != "typeReadOnly" && item.type != "typeTOC"
              ? '<button title="Restore value" class="dlgClick" data-op="onDlgEditTemplateRestore" data-id="' +
                i +
                '" tabindex="-1">R</button>'
              : "") +
            "</td>";
          x +=
            "<td>" +
            (item.initial
              ? '<button title="Auto value" class="dlgClick" data-op="onDlgEditTemplateInitial" data-id="' +
                i +
                '" tabindex="-1">A</button>'
              : "") +
            "</td>";
          x +=
            "<td>" +
            (urlMappings
              .filter((a) => a.prefixURL !== undefined)
              .map((a) => a.type)
              .includes(item.type)
              ? '<button title="Open link" class="dlgClick" data-op="onDlgEditTemplateFollow" data-id="' +
                i +
                '" tabindex="-1">O</button>'
              : "") +
            "</td>";
          x += "</tr>";

          return x;
        })
        .join("") +
      "</table>" +
      "</div>" +
      '<div style="display:flex">' +
      //Legend
      '<button id="wtPlusLegendBtn" class="dlgClick" data-op="onDlgNone" tabindex="-1">Legend' +
      '<table class="wtPlusLegend">' +
      '<tr><td colspan="2" class="wtPlusRequired">Required</td></tr>' +
      '<tr><td colspan="2" class="wtPlusPreferred">Preferred</td></tr>' +
      '<tr><td colspan="2" class="wtPlusOptional">Optional</td></tr>' +
      '<tr><td><img src="/images/icons/help.gif" border="0" width="22" height="22" alt="Help" /></td><td>Hower for hint</td></tr>' +
      '<tr><td><button title="Restore value" class="dlgClick" data-op="onDlgNone">R</button></td><td>Restore value</td></tr>' +
      '<tr><td><button title="Auto value" class="dlgClick" data-op="onDlgNone">A</button></td><td>Auto value</td></tr>' +
      '<tr><td><button title="Open link" class="dlgClick" data-op="onDlgNone">O</button></td><td>Open link</td></tr>' +
      "</table>" +
      "</button>" +
      '<div style="flex:1"></div>' +
      '<a class="button" href="https://www.wikitree.com/wiki/Space:WikiTree_Plus_Chrome_Extension#Edit_Template" target="_blank">Help</a>' +
      //OK, Cancel
      '<button style="text-align:right" class="dlgClick" data-op="onDlgEditTemplateBtn" data-id="0">Close</button>' +
      '<button style="text-align:right" class="dlgClick" data-op="onDlgEditTemplateBtn" data-id="1" value="default">Update changes</button>' +
      "</div>";

    tb.elDlgParams = document.getElementById("wtPlusDlgParams");

    attachEvents("button.dlgClick", "click");
    attachEvents("input.dlgPaste", "paste");
    attachEvents("input.dlgPaste", "keypress");

    tb.addToSummary = summaryPrefix + " Template:" + tb.template.name;
    if (tb.unknownParams)
      alert("Unrecognized parameters:\n" + tb.unknownParams + "\n\nThey will be removed, unless you cancel.");
    tb.elDlg.showModal();
  }
}
/*

	if ($('#addCategoryInput').length) {
		$('#addCategoryInput').autoComplete({
			cache: false,
			source: function(term, suggest) {
				wtCategorySuggestion(term, suggest);
			},
			renderItem: function(category, search) {
				return wtCategorySuggestionItemRender(category, search);
			},
			onSelect: function(e, term, item) {
				changesMade = 1;
				var categoryText = "[[Category:" + term + "]]\n";
				categoryText = categoryText.replace(/_/g, ' ');
				if ((typeof coloredEditor !== 'undefined') && (coloredEditor)) {
					coloredEditor.setCursor(0, 0);
					var cursor = coloredEditor.getCursor();
					coloredEditor.replaceRange(categoryText, cursor, cursor);
					coloredEditor.focus();
				} else {
					var textArea = document.editform.wpTextbox1;
					var textScroll = textArea.scrollTop;
					textArea.value = categoryText + textArea.value;
					textArea.selectionStart = 0;
					textArea.selectionEnd = categoryText.length;
					textArea.scrollTop = textScroll;
					textArea.focus();
				}
				$('#addCategoryInput').val('').hide();
				e.preventDefault();
				return false;
			},
		});
	}
});
function wtCategorySuggestion(term, suggest) {
	var includeAll = 0;
	if ($('#categorySuggestionIncludeAll').length && $('#categorySuggestionIncludeAll').val()) {
		includeAll = 1;
	}
	sajax_do_call("Title::ajaxCategorySearch", [term, includeAll], function(result) {
		var suggestions = JSON.parse(result.responseText);
		suggest(suggestions);
	});
}
function wtCategorySuggestionItemRender(item, search) {
	search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	var re = new RegExp("(" + search.split(' ').join('|') + ")","gi");
	var html = '';
	html += '<div class="autocomplete-suggestion" data-val="' + item + '">';
	html += item.replace(re, "<b>$1</b>");
	html += '</div>';
	return html;
}

*/
function onDlgEditTemplateBtn(update) {
  tb.elDlg.close();
  if (update === "1") {
    var a = tb.elDlgParams.querySelectorAll("input");
    for (var i in tb.templateitems) {
      tb.templateitems[i].value = a[i].value.trim();
    }
    tb.inserttext = "";
    var line = "";
    if (tb.templateitems && tb.templateitems.length) {
      line = "\n";
      for (let prop of tb.templateitems) {
        if (prop.numbered) {
          line = "";
          if (prop.value) {
            tb.inserttext += "|" + prop.value;
          } else {
            switch (prop.usage) {
              case "Required":
              case "Preferred":
                tb.inserttext += "|";
                break;
            }
          }
        } else {
          if (prop.value) {
            tb.inserttext += "\n|" + prop.name + "= " + prop.value;
          } else {
            switch (prop.usage) {
              case "Required":
              case "Preferred":
                tb.inserttext += "\n|" + prop.name + "= ";
                break;
            }
          }
        }
      }
    }
    tb.inserttext = "{{" + tb.template.name + tb.inserttext + line + "}}";
    tb.inserttext += tb.textAfter[0] === "\n" ? "" : line;

    tb.textResult = tb.textBefore + tb.inserttext + tb.textAfter;
    tb.selStart = tb.textBefore.length;
    tb.selEnd = tb.selStart + tb.inserttext.length;
    tb.birthLocationResult = "";
    tb.deathLocationResult = "";
    updateEdit();
  }
  tb.elDlg.innerHTML = "";
  tb.addToSummary = "";
  return false;
}

//listener for paste event
function onDlgEditTemplatePaste(i, evt) {
  if (evt.type == "keypress") {
    var key = evt.which || evt.keyCode;
    if (key === 13) {
      onDlgEditTemplateBtn("1");
    }
  }
  if (evt.type == "paste") {
    let clipdata = evt.clipboardData || window.clipboardData;
    var s = clipdata.getData("text/plain");
    s = decodeURIComponent(s);
    for (const j of urlMappings) {
      if (tb.templateitems[i].type === j.type) {
        if (s.startsWith(j.prefixURL)) {
          s = s.replace(j.prefixURL, "");
          if (j.sufixURL != "" && s.endsWith(j.sufixURL)) {
            s = s.replace(j.sufixURL, "");
          }
          s = j.fromURL ? j.fromURL(s) : s;
          document.execCommand("insertHTML", false, s);
          evt.preventDefault();
        }
      }
    }
  }
}

function onDlgEditTemplateFollow(i) {
  var item = tb.templateitems[i];
  var e = tb.elDlgParams.querySelectorAll("input")[i];
  var s = e.value;

  for (const i of urlMappings) {
    if (item.type === i.type) {
      if (s) {
        s = i.prefixURL === "" ? encodeURI(s) : encodeURIComponent(s);
        s = i.toURL ? i.toURL(s) : s;
        s = i.prefixURL + s + i.sufixURL;
      } else {
        s = i.emptyURL !== undefined ? i.emptyURL : i.prefixURL;
      }
    }
  }

  if (s.startsWith("http")) {
    window.open(s, "_blank");
  }
  return false;
}

function onDlgEditTemplateInitial(i) {
  var item = tb.templateitems[i];
  var e = tb.elDlgParams.querySelectorAll("input")[i];
  if (item.initial.startsWith("Title:")) {
    e.value = document.title.replace(RegExp(item.initial.substring(6)), "$1");
  }
  if (item.initial.startsWith("Category:") && tb.categories) {
    var r = RegExp(item.initial.substring(9), "mg");
    e.value = tb.categories.match(r).join("\n").replace(r, "$1");
  }
  return false;
}

function onDlgEditTemplateRestore(i) {
  var item = tb.templateitems[i];
  var e = tb.elDlgParams.querySelectorAll("input")[i];
  e.value = item.value;
  return false;
}

function onDlgEditTemplateExpCol(gName) {
  var e = tb.elDlg.getElementsByClassName("group" + gName);
  var b = document.getElementById("groupBtn" + gName);
  var ei;
  if (b.innerHTML == "Expand") {
    b.innerHTML = "Collapse";
    for (ei of e) {
      ei.style.visibility = "visible";
    }
  } else {
    b.innerHTML = "Expand";
    for (ei of e) {
      ei.style.visibility = "collapse";
    }
  }
  return false;
}

/* to add autocomplete on category parameter
function WikiTreeGetCategory(query, fixed) {
  fetch("https://www.wikitree.com/index.php?action=ajax&rs=Title::ajaxCategorySearch&rsargs[]=" + query + "&rsargs[]=1")
    .then((resp) => resp.json())
    .then((jsonData) => {
      console.log("cat: " + jsonData);
      return jsonData;
    });
}
*/

/**************************/
/* Select template to add */
/**************************/

function selectTemplate(data) {
  tb.elDlg.innerHTML =
    "<h3>Select template</h3>" +
    '<input type="checkbox" class="cbFilter" id="cb1" name="cb1" data-op="onDlgSelectTemplateFlt" data-id="1" value="Project Box"' +
    (data == "Project Box" ? " checked" : "") +
    '><label for="cb1"> Project Box</label><br>' +
    '<input type="checkbox" class="cbFilter" id="cb2" name="cb2" data-op="onDlgSelectTemplateFlt" data-id="2" value="Sticker"' +
    (data == "Sticker" ? " checked" : "") +
    '><label for="cb2"> Sticker</label><br>' +
    '<input type="checkbox" class="cbFilter" id="cb3" name="cb3" data-op="onDlgSelectTemplateFlt" data-id="3" value="Profile Box"' +
    (data == "Profile Box" ? " checked" : "") +
    '><label for="cb3"> Research Note</label><br>' +
    '<input type="checkbox" class="cbFilter" id="cb4" name="cb4" data-op="onDlgSelectTemplateFlt" data-id="4" value="External Link"' +
    (data == "External Link" ? " checked" : "") +
    '><label for="cb4"> External Link</label><br>' +
    '<input type="checkbox" class="cbFilter" id="cb5" name="cb5" data-op="onDlgSelectTemplateFlt" data-id="5" value="CategoryInfoBox"' +
    (data == "CategoryInfoBox" ? " checked" : "") +
    '><label for="cb5"> CategoryInfoBox</label><br>' +
    '<label for="flt1">Filter: </label><input type="text" class="cbFilter" id="flt1" name="flt1" data-op="onDlgSelectTemplateFlt" data-id="9" autofocus><br>' +
    '<div style="min-width: 600px;overflow-y:auto;height: 400px;"><table style="width: 100%;" id="tb">' +
    dataTables.templates
      .map(
        (item) =>
          '<tr class="trSelect" data-op="onDlgSelectTemplateTrSel"><td>' +
          item.name +
          "</td><td>" +
          item.group +
          "</td><td>" +
          item.subgroup +
          "</td></tr>"
      )
      .join("\n") +
    "</table></div>" +
    '<div style="text-align:right">' +
    '<a class="button" href="https://www.wikitree.com/wiki/Space:WikiTree_Plus_Chrome_Extension#Add_Template" target="_blank">Help</a>' +
    //OK, Cancel
    '<button style="text-align:right" class="dlgClick" data-op="onDlgSelectTemplateBtn" data-id="0">Close</button>' +
    '<button style="text-align:right" class="dlgClick" data-op="onDlgSelectTemplateBtn" data-id="1" value="default">Select</button>' +
    "</div>";
  attachEvents("button.dlgClick", "click");
  attachEvents("input.cbFilter", "input");
  attachEvents("tr.trSelect", "click");
  onDlgSelectTemplateFlt();
  tb.elDlg.showModal();
}

function onDlgSelectTemplateFlt() {
  var lb = tb.elDlg.querySelector("#tb");
  var s0 = "";
  for (let i = 1; i <= 5; i++) {
    if (tb.elDlg.querySelector("#cb" + i).checked)
      s0 += (s0 == "" ? "" : "|") + tb.elDlg.querySelector("#cb" + i).value;
  }
  var r0 = new RegExp("(" + s0 + ")", "i");

  var s1 = tb.elDlg.querySelector("#flt1").value;
  var r1 = new RegExp(s1, "i");

  lb.innerHTML = dataTables.templates
    .filter(
      (item) =>
        (s0 === "" || item.type.match(r0)) &&
        (s1 === "" || item.name.match(r1) || item.group.match(r1) || item.subgroup.match(r1))
      //    ).map(item => '<option value="' + item.name + '">' + item.name + ' (' + item.group + ': ' + item.subgroup + ')</option>' ).join('\n')
    )
    .map(
      (item) =>
        '<tr class="trSelect" data-op="onDlgSelectTemplateTrSel">' +
        `<td><a target="_blank" href="https://www.wikitree.com/wiki/Template:${item.name}"><img src="${newTabIconURL}"'></a></td>` +
        "<td>" +
        item.name +
        "</td><td>" +
        item.group +
        "</td><td>" +
        item.subgroup +
        "</td></tr>"
    )
    .join("\n");
  attachEvents("tr.trSelect", "click");
}

function onDlgSelectTemplateTrSel(tr) {
  removeClass("tr.trSelect", "trSelected");
  tr.classList.add("trSelected");
}

function onDlgSelectTemplateBtn(update) {
  if (update === "1") {
    if (tb.elDlg.querySelectorAll(".trSelected>td").length === 0) {
      alert("No template selected: Select a template before closing the dialog");
      return false;
    }
    tb.elDlg.close();
    //Add template
    var templateName = tb.elDlg.querySelectorAll(".trSelected>td")[1].innerText;
    paramsCopy(templateName);
    paramsInitialValues();
    editTemplate("Added");
  } else {
    tb.elDlg.close();
    tb.elDlg.innerHTML = "";
    tb.addToSummary = "";
  }
  return false;
}

/**************************/
/* Select category to add */
/**************************/

function selectCIB(data) {
  tb.elDlgCIB.innerHTML =
    "<h3>Select " +
    data +
    " Category</h3>" +
    '<input type="checkbox" class="cbFilter" id="cb1" name="cb1" data-op="onDlgSelectCIBFlt" data-id="' +
    data +
    '" value="' +
    data +
    '" checked>' +
    '<label for="cb1"> ' +
    data +
    "</label><br>" +
    '<label for="flt1">Filter: </label><input type="text" class="cbFilter" id="flt1" name="flt1" data-op="onDlgSelectCIBFlt" data-id="9" autofocus>' +
    '<label id="cntr">enter word(s) to find</label><br>' +
    '<div style="min-width: 600px;overflow-y:auto;height: 400px;"><table style="width: 100%;" id="tb">' +
    "</table></div>" +
    '<div style="text-align:right">' +
    '<a class="button" href="https://www.wikitree.com/wiki/Space:WikiTree_Plus_Chrome_Extension#Add_Template" target="_blank">Help</a>' +
    //OK, Cancel
    '<button style="text-align:right" class="dlgClick" data-op="onDlgSelectCIBBtn" data-id="0">Close</button>' +
    '<button style="text-align:right" class="dlgClick" data-op="onDlgSelectCIBBtn" data-id="1" value="default">Select</button>' +
    "</div>";
  attachEvents("button.dlgClick", "click");
  attachEvents("input.cbFilter", "input");
  //  attachEvents("td.tdSelect", "click");
  onDlgSelectCIBFlt();
  tb.elDlgCIB.showModal();
}

function onDlgSelectCIBFlt() {
  let lb = tb.elDlgCIB.querySelector("#tb");
  let cntr = tb.elDlgCIB.querySelector("#cntr");
  var s0 = tb.elDlgCIB.querySelector("#cb1").value;
  var s1 = tb.elDlgCIB.querySelector("#flt1").value;

  if (s1.length < 3) {
    cntr.innerHTML = "enter word(s) to find";
  } else {
    // Retrieve categories
    cntr.innerHTML = "Retrieving...";
    wtAPICatCIBSearch("CIBPicker", s0, s1)
      .then((jsonData) => {
        let c = jsonData.response.categories;
        if (!c) {
          c = [];
        }
        switch (c.length) {
          case 0:
            cntr.innerHTML = "no matches";
            break;
          case 1:
            cntr.innerHTML = c.length + " match";
            break;
          case 100:
            cntr.innerHTML = "more than 100 matches";
            break;
          default:
            cntr.innerHTML = c.length + " matches";
        }
        lb.innerHTML = c
          .map(
            (item) =>
              "<tr>" +
              `<td><a target="_blank" href="https://www.wikitree.com/wiki/Category:${item.category}"><img src="${newTabIconURL}"'></a></td>` +
              '<td class="tdSelect" data-op="onDlgSelectCIBTrSel" title="' +
              (item.name ? "&#10;Name: " + item.name : "") +
              (item.aka ? "&#10;aka:&#10;&nbsp;&nbsp;" + item.aka.replaceAll(";", "&#10;&nbsp;&nbsp;") : "") +
              (item.parent ? "&#10;Parent: " + item.parent : "") +
              (item.gParent ? "&#10;&nbsp;&nbsp;" + item.gParent : "") +
              (item.ggParent ? "&#10;&nbsp;&nbsp;&nbsp;&nbsp;" + item.ggParent : "") +
              (item.gggParent ? "&#10;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + item.gggParent : "") +
              (item.parent1 ? "&#10;Parent 1: " + item.parent1 : "") +
              (item.gParent1 ? "&#10;&nbsp;&nbsp;" + item.gParent1 : "") +
              (item.parent2 ? "&#10;Parent 2: " + item.parent2 : "") +
              (item.gParent2 ? "&#10;&nbsp;&nbsp;" + item.gParent2 : "") +
              (item.location ? "&#10;Location: " + item.location : "") +
              (item.locationParent ? "&#10;&nbsp;&nbsp;" + item.locationParent : "") +
              (item.location1 ? "&#10;Location 1: " + item.location1 : "") +
              (item.location1Parent ? "&#10;&nbsp;&nbsp;" + item.location1Parent : "") +
              (item.succ1prev ? "&#10;Succession: " + item.succ1prev : "") +
              (item.succ1next ? "&#10;&nbsp;" + item.succ1next : "") +
              (item.succ1prev1 ? "&#10;Succession: " + item.succ1prev1 : "") +
              (item.succ1next1 ? "&#10;&nbsp;" + item.succ1next1 : "") +
              (item.succ1prev2 ? "&#10;Succession: " + item.succ1prev2 : "") +
              (item.succ1next2 ? "&#10;&nbsp;" + item.succ1next2 : "") +
              (item.succ1prev3 ? "&#10;Succession: " + item.succ1prev3 : "") +
              (item.succ1next3 ? "&#10;&nbsp;" + item.succ1next3 : "") +
              (item.succ2prev ? "&#10;Succession: " + item.succ2prev : "") +
              (item.succ2next ? "&#10;&nbsp;" + item.succ2next : "") +
              (item.other ? "&#10;Other:&#10;&nbsp;&nbsp;" + item.other.replaceAll(";", "&#10;&nbsp;&nbsp;") : "") +
              '">' +
              item.category +
              "</td>" +
              "</tr>"
          )
          .join("\n");
        attachEvents("td.tdSelect", "click");
      })
      .catch((error) => {
        lb.innerHTML = '<tr><td style="color:red">Error in WikiTree+ server' + error + "</td></tr>";
      });
  }
}

function onDlgSelectCIBTrSel(td) {
  removeClass("td.tdSelect", "tdSelected");
  td.classList.add("tdSelected");
}

function onDlgSelectCIBBtn(update) {
  if (update === "1") {
    if (tb.elDlgCIB.querySelectorAll("td.tdSelected").length === 0) {
      alert("No category selected: Select a category before closing the dialog");
      return false;
    }
    tb.elDlgCIB.close();
    //Add template

    tb.inserttext = "[[Category:" + tb.elDlgCIB.querySelectorAll("td.tdSelected")[0].innerText + "]]\n";
    tb.textResult = tb.inserttext + tb.textAll;
    tb.selStart = tb.textBefore.length;
    tb.selEnd = tb.selStart + tb.inserttext.length;
    tb.birthLocationResult = "";
    tb.deathLocationResult = "";
    tb.addToSummary = "Added " + tb.elDlgCIB.querySelector("#cb1").value + " Category";
    updateEdit();
  } else {
    tb.elDlgCIB.close();
    tb.addToSummary = "";
  }
  tb.elDlgCIB.innerHTML = "";
  return false;
}

function CreateMigrationCategory() {
  var title = window.document.title;

  var indexCategory = title.indexOf("Category:") + "Category:".length;
  var cat = title.substring(indexCategory);

  var countryFrom = "";
  var entityFrom = "";
  var countryTo = "";
  var entityTo = "";

  var entities = {
    "Holy Roman Empire": [],
    "German Empire": [] /* see below */,
    "German Confederation": [] /* see below */,
    Germany: [
      "Baden-Württemberg",
      "Bavaria",
      "Berlin",
      "Brandenburg",
      "Bremen",
      "Hamburg",
      "Hesse",
      "Mecklenburg-Vorpommern",
      "Lower Saxony",
      "North Rhine-Westphalia",
      "Rhineland-Palatinate",
      "Saarland",
      "Saxony",
      "Saxony-Anhalt",
      "Schleswig-Holstein",
      "Thuringia",
    ],

    "German Confederation/Empire": [
      "Prussia",
      "Kingdom of Hanover",
      "Württemberg",
      "Kingdom of Bavaria",
      "Grand Duchy of Baden",
      "Grand Duchy of Hesse",
    ],

    "United States": [
      "Alabama",
      "Alaska",
      "Arizona",
      "Arkansas",
      "Kalifornien",
      "Colorado",
      "Connecticut",
      "Delaware",
      "Florida",
      "Georgia",
      "Hawaii",
      "Idaho",
      "Illinois",
      "Indiana",
      "Iowa",
      "Kansas",
      "Kentucky",
      "Louisiana",
      "Maine",
      "Maryland",
      "Massachusetts",
      "Michigan",
      "Minnesota",
      "Mississippi",
      "Missouri",
      "Montana",
      "Nebraska",
      "Nevada",
      "New Hampshire",
      "New Jersey",
      "New Mexico",
      "New York",
      "North Carolina",
      "North Dakota",
      "Ohio",
      "Oklahoma",
      "Oregon",
      "Pennsylvania",
      "Rhode Island",
      "South Carolina",
      "South Dakota",
      "Tennessee",
      "Texas",
      "Utah",
      "Vermont",
      "Virginia",
      "Washington",
      "West Virginia",
      "Wisconsin",
      "Wyoming",
    ],

    Australia: ["Western Australia", "South Australia", "Queensland", "New South Wales", "Victoria", "Tasmania"],

    England: [
      "Bedfordshire",
      "Berkshire",
      "Buckinghamshire",
      "Cambridgeshire",
      "Cheshire",
      "Cornwall",
      "Cumberland",
      "Derbyshire",
      "Devon",
      "Dorset",
      "County Durham",
      "Essex",
      "Gloucestershire",
      "Hampshire",
      "Herefordshire",
      "Hertfordshire",
      "Huntingdonshire",
      "Kent",
      "Lancashire",
      "Leicestershire",
      "Lincolnshire",
      "Middlesex",
      "Norfolk",
      "Northamptonshire",
      "Northumberland",
      "Nottinghamshire",
      "Oxfordshire",
      "Rutland",
      "Shropshire",
      "Somerset",
      "Staffordshire",
      "Suffolk",
      "Surrey",
      "Sussex",
      "Warwickshire",
      "Westmorland",
      "Wiltshire",
      "Worcestershire",
      "Yorkshire",
    ],

    "Austria-Hungary": ["Kingdom of Bohemia", "Kingdom of Galicia and Lodomeria", "Kingdom of Hungary"],

    Canada: [
      "Ontario",
      "Quebec",
      "Nova Scotia",
      "New Brunswick",
      "Manitoba",
      "British Columbia",
      "Prince Edward Island",
      "Saskatchewan",
      "Alberta",
      "Newfoundland and Labrador",
    ],

    "the Netherlands": [
      "Drenthe",
      "Flevoland",
      "Friesland",
      "Gelderland",
      "Groningen",
      "Limburg",
      "North Brabant",
      "North Holland",
      "Overijssel",
      "South Holland",
      "Utrecht",
      "Zeeland",
    ],
  };
  if (cat.indexOf("Migrants") > -1) {
    var indexTo = cat.indexOf(" to ");
    var fromPart = cat.substring(0, indexTo);
    var toPart = cat.substring(indexTo);
    countryTo = getRightFromWord("to ", toPart);
    entityTo = getRightFromWord("to ", toPart);
    countryFrom = getRightFromWord("from ", fromPart);
    entityFrom = getRightFromWord("from ", fromPart);
  } else if (cat.indexOf("Emigrants") > -1) {
    countryFrom = getLeftFromComma(cat);
    entityFrom = getLeftFromComma(cat);

    if (cat.indexOf(" to ") > -1) {
      countryTo = getRightFromWord("to ", cat);
      entityTo = getRightFromWord("to ", cat);
    }
  } else if (cat.indexOf("Immigrants") > -1) {
    countryTo = getLeftFromComma(cat);
    entityTo = getLeftFromComma(cat);
    if (cat.indexOf(" from ") > -1) {
      countryFrom = getRightFromWord("from ", cat);
      entityFrom = getRightFromWord("from ", cat);
    }
  }

  countryTo = GetKnownCountry(entityTo, entities);
  entityTo = GetBlankEntityIfIsCountry(entityTo, entities);

  countryFrom = GetKnownCountry(entityFrom, entities);
  entityFrom = GetBlankEntityIfIsCountry(entityFrom, entities);

  document.getElementById("wpTextbox1").value =
    "{{CategoryInfoBox Migration\n" +
    "|fromCountry=" +
    countryFrom +
    "\n" +
    "|fromEntity=" +
    entityFrom +
    "\n" +
    "|image=\n" +
    "|location=\n" +
    "|toCountry=" +
    countryTo +
    "\n" +
    "|toEntity=" +
    entityTo +
    "\n" +
    "}}";

  void 0;
}
function getLeftFromComma(cat) {
  var indexComma = cat.indexOf(",");
  return cat.substring(0, indexComma).trim();
}

function getRightFromWord(word, cat) {
  var indexWord = cat.indexOf(word) + word.length;
  return cat.substring(indexWord).trim();
}

function GetBlankEntityIfIsCountry(entity, entities) {
  Object.entries(entities).forEach(([country, states]) => {
    if (country == entity) {
      entity = "";
    }
  });
  return entity;
}

function GetKnownCountry(entity, entities) {
  Object.entries(entities).forEach(([country, states]) => {
    if (states.includes(entity)) {
      entity = country;
    }
  });
  return entity;
}

/*********************************/
/* Automatic update like EditBOT */
/*********************************/

function AutoUpdate() {
  let s0 = "";
  let s1 = "";
  let s2 = "";
  let s3 = "";
  for (var loc = 0; loc < 3; loc++) {
    let actArr = "";
    if (loc == 0) {
      if (tb.birthLocation) {
        s0 = "Birth Location";
        s1 = tb.birthLocation;
        actArr = dataTables.locations;
      }
    } else if (loc == 1) {
      if (tb.deathLocation) {
        s0 = "Death Location";
        s1 = tb.deathLocation;
        actArr = dataTables.locations;
      }
    } else if (loc == 2) {
      if (tb.textAll) {
        s0 = "Bio";
        s1 = tb.textAll;
        actArr = dataTables.cleanup;
      }
    }
    if (actArr) {
      for (var j = 0; j < actArr.length; j++) {
        let clean = actArr[j];
        s3 = "";
        for (var i = 0; i < clean.actions.length; i++) {
          let s = s1;
          let action = clean.actions[i];
          switch (action.action) {
            case "replaceRegEx": {
              let reg = RegExp(action.from, action.flags);
              s1 = s1.replace(reg, action.to);
              break;
            }
            case "replace":
              s1 = s1.replace(action.from, action.to);
              break;
            default:
              alert("Unknown action: " + action.action + " defined for source: " + clean.name);
              s1 = "";
          }
          if (s1 == "") break;
          if (s1 !== "" && s !== s1) {
            s3 += (s3 !== "" ? ", " : "") + action.description;
          }
        }
        if (s3 !== "") {
          s2 +=
            '<input type="checkbox" class="cb' +
            loc +
            "_" +
            j +
            '" id="cb' +
            loc +
            "_" +
            j +
            '" name="cb' +
            loc +
            "_" +
            j +
            '" data-op="onDlgPasteSourceCB" data-id="1" value="' +
            loc +
            "_" +
            j +
            '" checked>' +
            '<label for="cb' +
            loc +
            "_" +
            j +
            '"> ' +
            s0 +
            " " +
            clean.description +
            " " +
            " (" +
            s3 +
            ")</label><br>\n";
        }
      }
    }
  }
  if (s2 == "") {
    alert("Nothing to change.");
  } else {
    tb.elDlg.innerHTML =
      "<h3>Automated cleanup</h3>" +
      s2 +
      '<div style="text-align:right">' +
      //OK, Cancel
      '<a class="button" href="https://www.wikitree.com/wiki/Space:WikiTree_Plus_Chrome_Extension#Profile_Cleanup" target="_blank">Help</a>' +
      '<button style="text-align:right" class="dlgClick" data-op="onDlgProfileCleanupBtn" data-id="0">Close</button>' +
      '<button style="text-align:right" class="dlgClick" data-op="onDlgProfileCleanupBtn" data-id="1" value="default">Select</button>' +
      "</div>";
    attachEvents("button.dlgClick", "click");
    attachEvents("input.cbInline", "input");
    tb.elDlg.showModal();
  }
}

function onDlgProfileCleanupBtn(update) {
  tb.elDlg.close();
  if (update === "1") {
    //Set updated text

    let s0 = "";
    let s1 = "";
    let s2 = "";
    let actArr = [];
    for (var loc = 0; loc < 3; loc++) {
      if (loc == 0) {
        s0 = "Birth Location";
        s1 = tb.birthLocation;
        actArr = dataTables.locations;
      } else if (loc == 1) {
        s0 = "Death Location";
        s1 = tb.deathLocation;
        actArr = dataTables.locations;
      } else if (loc == 2) {
        s0 = "Bio";
        s1 = tb.textAll;
        actArr = dataTables.cleanup;
      }
      if (actArr) {
        for (var j = 0; j < actArr.length; j++) {
          var cb = tb.elDlg.querySelectorAll("#cb" + loc + "_" + j)[0];
          if (cb && cb.checked) {
            let clean = actArr[j];

            let s = "";
            let s3 = "";
            for (var i = 0; i < clean.actions.length; i++) {
              s = s1;
              let action = clean.actions[i];
              switch (action.action) {
                case "replaceRegEx": {
                  let reg = RegExp(action.from, action.flags);
                  s1 = s1.replace(reg, action.to);
                  break;
                }
                case "replace":
                  s1 = s1.replace(action.from, action.to);
                  break;
                default:
                  s1 = "";
              }
              if (s1 == "") break;
              if (s1 !== "" && s !== s1) {
                s3 += (s3 !== "" ? ", " : "") + action.description;
              }
            }
            if (s3 !== "") {
              s2 += (s2 !== "" ? ", " : "") + "+" + s0 + " " + clean.description + " (" + s3 + ")";
            }
          }
        }
      }
      if (loc == 0) {
        tb.birthLocationResult = s1;
      } else if (loc == 1) {
        tb.deathLocationResult = s1;
      } else if (loc == 2) {
        tb.textResult = s1;
      }
    }
    tb.addToSummary = s2;
    updateEdit();
  } else {
    tb.elDlg.innerHTML = "";
    tb.addToSummary = "";
  }
  return false;
}

/**************************/
/* Paste source reformat  */
/**************************/

function pasteSource() {
  tb.elDlg.innerHTML =
    "<h3>Paste source</h3>" +
    '<label for="srcPaste">Clipboard:</label><br>' +
    '<textarea class="srcPaste" data-op="onDlgPasteSourcePaste" data-id="1" placeholder="Paste a source or URL here." rows="5" cols="80"></textarea><br>' +
    '<input type="checkbox" class="cbInline" id="cb1" name="cb1" data-op="onDlgPasteSourceCB" data-id="1" value="Inline"' +
    (tb.options.wtplusSourceInline ? " checked" : "") +
    '><label for="cb1"> Inline citation</label><br>' +
    '<label for="resultFld">Citation to add:</label><br>' +
    '<textarea class="resultFld" rows="5" cols="80"></textarea>' +
    '<div style="text-align:right">' +
    //OK, Cancel
    '<a class="button" href="https://www.wikitree.com/wiki/Space:WikiTree_Plus_Chrome_Extension#Paste_Sources" target="_blank">Help</a>' +
    '<button style="text-align:right" class="dlgClick" data-op="onDlgPasteSourceBtn" data-id="0">Close</button>' +
    '<button style="text-align:right" class="dlgClick" data-op="onDlgPasteSourceBtn" data-id="1" value="default">Select</button>' +
    "</div>";
  attachEvents("button.dlgClick", "click");
  attachEvents("input.cbInline", "input");
  attachEvents("textarea.srcPaste", "paste");
  tb.elDlg.showModal();
}

function onDlgPasteSourceBtn(update) {
  tb.elDlg.close();
  if (update === "1") {
    //Add template
    tb.inserttext = tb.elDlg.querySelectorAll(".resultFld")[0].value;
    tb.inserttext += tb.textAfter[0] === "\n" ? "" : "\n";
    tb.textResult = tb.textBefore + tb.inserttext + tb.textAfter;
    tb.selStart = tb.textBefore.length;
    tb.selEnd = tb.selStart + tb.inserttext.length;
    tb.birthLocationResult = "";
    tb.deathLocationResult = "";
    updateEdit();
  } else {
    tb.elDlg.innerHTML = "";
    tb.addToSummary = "";
  }
  return false;
}

// eslint-disable-next-line no-unused-vars
function onDlgPasteSourceCB(i, evt) {
  var e = tb.elDlg.querySelectorAll(".resultFld")[0];
  let s = e.value.replace("<ref>", "").replace("</ref>", "").replace("* ", "");
  if (tb.elDlg.querySelectorAll(".cbInline")[0].checked) {
    e.value = "<ref>" + s + "</ref>";
  } else {
    e.value = "* " + s;
  }
}

//listener for paste event
function onDlgPasteSourcePaste(i, evt) {
  if (evt.type == "keypress") {
    var key = evt.which || evt.keyCode;
    if (key === 13) {
      onDlgPasteSourceBtn("1");
    }
  }
  if (evt.type == "paste") {
    var clipdata = evt.clipboardData || window.clipboardData;
    var s = clipdata.getData("text/plain");
    var s1 = "";
    s = decodeURIComponent(s);

    if (dataTables.sources) {
      for (let source of dataTables.sources) {
        var b = false;
        for (let condition of source.conditions) {
          switch (condition.action) {
            case "startsWith":
              b = s.startsWith(condition.find);
              break;
            case "includes":
              b = s.includes(condition.find);
              break;
            default:
              alert("Unknown condition: " + condition.action + " defined for source: " + source.name);
          }
          if (b) break;
        }
        if (b) {
          s1 = s;
          for (let action of source.actions) {
            switch (action.action) {
              case "replaceRegEx": {
                let reg = RegExp(action.from, "mg");
                s1 = s1.replace(reg, action.to);
                break;
              }
              case "replace":
                s1 = s1.replace(action.from, action.to);
                break;
              default:
                alert("Unknown action: " + action.action + " defined for source: " + source.name);
                s1 = "";
            }
            if (s1 == "") break;
          }
          if (s1 !== "") {
            tb.addToSummary = "Added " + source.description;
            break;
          }
        }
      }
    }

    // Adding inline citation
    if (s1 !== "") {
      if (tb.elDlg.querySelectorAll(".cbInline")[0].checked) {
        s1 = "<ref>" + s1 + "</ref>";
      } else {
        s1 = "* " + s1;
      }
    }
    tb.elDlg.querySelectorAll(".resultFld")[0].value = s1;
  }
}

/**************************/
/* Menu events            */
/**************************/

/* for coloredEditor
function posToOffset(txt, pos) {
  const arr = txt.split("\n");
  var len = 0;
  for (var i = 0; i < pos.line; i++) len += length(arr[i]) + 1;
  return len + pos.ch;
}
*/
export function wtPlus(params) {
  if (params.action !== "AddCIBCategory") {
    if (tb.elText.style.display == "none") {
      alert("Enhanced editor is not supported.\n\nTurning it off to use the extension.");
      tb.elEnhanced.click();
      console.log("wt+");
    }
  }

  //Sets all edit variables
  tb.elEnhancedActive = tb.elText.style.display == "none";
  if (tb.elEnhancedActive) {
    console.log("wt+ temp Off");
    tb.elEnhanced.click();

    //            alert ('Enhanced editor is not supported.<br>Turn it off to use WikiTree+ extension.');
    /*
		if (window.coloredEditor) {
			tb.textAll = coloredEditor.getValue().replace(/\r\n|\n\r|\n|\r/g, '\n')
			tb.selStart = posToOffset (tb.textAll, coloredEditor.getCursor("from"))
			tb.selEnd = posToOffset (tb.textAll, coloredEditor.getCursor("to"))
*/
  }

  tb.selStart = tb.elText.selectionStart;
  tb.selEnd = tb.elText.selectionEnd;
  tb.textAll = tb.elText.value;
  if (tb.elBirthLocation) {
    tb.birthLocation = tb.elBirthLocation.value;
  }
  if (tb.elDeathLocation) {
    tb.deathLocation = tb.elDeathLocation.value;
  }
  if (tb.elEnhancedActive) {
    tb.elEnhanced.click();
    console.log("wt+ temp On");
  }

  tb.textBefore = tb.textAll.substring(0, tb.selStart);
  tb.textSelected = tb.selEnd == tb.selStart ? "" : tb.textAll.substring(tb.selStart, tb.selEnd);
  tb.textAfter = tb.textAll.substring(tb.selEnd);
  tb.categories = tb.textAll.match(/\[\[Category:.*?\]\]/gim);
  if (tb.categories) {
    tb.categories = tb.categories.join("\n").replace(/\[\[Category:\s*(.*?)\s*\]\]/gim, "$1");
  }
  tb.textResult = tb.textAll;

  if (params.template) {
    //Add template
    paramsCopy(params.template);
    paramsInitialValues();
    editTemplate("Added");
  } else {
    switch (params.action) {
      case "":
        break;
      case "EditTemplate": //Edit template
        //            var expression = /{{[\s\S]*?}}/g
        var expression =
          /\{\{.*?(\[\[[^{}[\]]*?\]\][^{}[\]]*?|\[[^{}[\]]*?\][^{}[\]]*?|\{\{[^{}[\]]*?\}\}[^{}[\]]*?)*?[^{}[\]]*?\}\}/gms;
        var s;
        if (tb.selStart != tb.selEnd) {
          let tem = tb.textSelected.match(expression);
          if (tem && tem.length == 1) {
            s = tb.textSelected.split(expression);
            tb.textBefore += s[0];
            tb.textSelected = tem[0];
            tb.textAfter = s[2] + tb.textAfter;
            tb.selStart = tb.textBefore.length;
            tb.selEnd = tb.selStart + tb.textSelected.length;
            paramsFromSelection();
            editTemplate("Edited");
          } else {
            alert("There is no template in selected text");
          }
        } else {
          let tem = tb.textAll.match(expression);
          if (tem) {
            if (tem.length == 1) {
              s = tb.textAll.split(expression);
              tb.textBefore = s[0];
              tb.textSelected = tem[0];
              tb.textAfter = s[2];
              tb.selStart = tb.textBefore.length;
              tb.selEnd = tb.selStart + tb.textSelected.length;
              paramsFromSelection();
              editTemplate("Edited");
            } else {
              let match = "";
              while ((match = expression.exec(tb.textAll))) {
                if (match.index < tb.selStart && expression.lastIndex > tb.selStart) {
                  tb.textBefore = tb.textAll.substring(0, match.index);
                  tb.textSelected = match[0];
                  tb.textAfter = tb.textAll.substring(expression.lastIndex);
                  tb.selStart = tb.textBefore.length;
                  tb.selEnd = tb.selStart + tb.textSelected.length;
                  paramsFromSelection();
                  editTemplate("Edited");
                  return;
                }
              }
              alert("There is no template at cursor position.");
            }
          } else {
            alert("There is no template on the page.");
          }
        }
        break;

      case "AutoFormat": //automatic formting
        tb.textResult = tb.textAll.replace(/^ *\| *([^ =|]*) *= */gm, "|$1= ");
        tb.birthLocationResult = "";
        tb.deathLocationResult = "";
        tb.addToSummary = "";
        updateEdit();
        break;

      case "CreateMigrationCategory": {
        CreateMigrationCategory();
        break;
      }
      case "AutoUpdate": //automatic corrections
        AutoUpdate();
        break;

      case "EditBOTConfirm": //EditBOT confirmation
        tb.textResult = tb.textAll.replace(/\|(Review|Manual)\}\}/gm, "|Confirmed}}");
        tb.textResult = tb.textResult.replace(/\s\s\}\}/gm, " ");
        tb.birthLocationResult = "";
        tb.deathLocationResult = "";
        tb.addToSummary = "Confirmation for EditBOT";
        updateEdit();
        break;

      case "AddTemplate": //add any template
        selectTemplate(params.data);
        break;

      case "AddCIBCategory": //add any category
        selectCIB(params.data);
        break;

      case "PasteSource": //paste a source citation
        pasteSource();
        break;

      default:
        alert("Unknown event " + params.action);
    }
  }
}

/* Classes */

// eslint-disable-next-line no-unused-vars
const attachClass = (selector, className) => {
  document.querySelectorAll(selector).forEach((i) => i.classList.add(className));
};

const removeClass = (selector, className) => {
  document.querySelectorAll(selector).forEach((i) => i.classList.remove(className));
};

/* Events */

const attachEvents = (selector, eventType) => {
  document.querySelectorAll(selector).forEach((i) => i.addEventListener(eventType, (event) => mainEventLoop(event)));
};
function mainEventLoop(event) {
  let element = event.srcElement;
  if (element.tagName == "TD") {
    if (!element.dataset.op) element = element.parentElement;
  }
  const op = element.dataset.op;
  const id = element.dataset.id;
  if (!op.startsWith("onDlgSelectCIB")) {
    if (tb.elText.style.display == "none") {
      alert("Enhanced editor is not supported.\n\nTurning it off to use the extension.");
      console.log("Main");
      tb.elEnhanced.click();
    }
  }

  if (op === "wtPlus") {
    event.preventDefault();
    return wtPlus(id);
  }
  if (op === "onDlgEditTemplateExpCol") {
    event.preventDefault();
    return onDlgEditTemplateExpCol(id);
  }
  if (op === "onDlgEditTemplateRestore") {
    event.preventDefault();
    return onDlgEditTemplateRestore(id);
  }
  if (op === "onDlgEditTemplateInitial") {
    event.preventDefault();
    return onDlgEditTemplateInitial(id);
  }
  if (op === "onDlgEditTemplateFollow") {
    event.preventDefault();
    return onDlgEditTemplateFollow(id);
  }
  if (op === "onDlgEditTemplateBtn") {
    event.preventDefault();
    return onDlgEditTemplateBtn(id);
  }
  if (op === "onDlgEditTemplatePaste") return onDlgEditTemplatePaste(id, event);

  if (op === "onDlgPasteSourcePaste") return onDlgPasteSourcePaste(id, event);
  if (op === "onDlgPasteSourceCB") return onDlgPasteSourceCB(id, event);
  if (op === "onDlgPasteSourceBtn") {
    event.preventDefault();
    return onDlgPasteSourceBtn(id);
  }

  if (op === "onDlgProfileCleanupBtn") {
    event.preventDefault();
    return onDlgProfileCleanupBtn(id);
  }

  if (op === "onDlgSelectTemplateFlt") return onDlgSelectTemplateFlt();
  if (op === "onDlgSelectTemplateTrSel") return onDlgSelectTemplateTrSel(element);
  if (op === "onDlgSelectTemplateBtn") {
    event.preventDefault();
    return onDlgSelectTemplateBtn(id);
  }

  if (op === "onDlgSelectCIBFlt") return onDlgSelectCIBFlt();
  if (op === "onDlgSelectCIBTrSel") return onDlgSelectCIBTrSel(element);
  if (op === "onDlgSelectCIBBtn") {
    event.preventDefault();
    return onDlgSelectCIBBtn(id);
  }

  if (op === "onDlgNone") {
    event.preventDefault();
    return;
  }

  console.error("Missing data-op on ", element);
}

function initWTPlus() {
  /* Initialization */
  getFeatureOptions("wtplus").then((result) => {
    tb.options = result;
    //    console.log(tb.options);
  });
  tb.nameSpace = document.title.startsWith("Edit Person ") ? "Profile" : "";
  let w = document.querySelector("h1 > .copyWidget");
  if (w) {
    tb.wikitreeID = w.getAttribute("data-copy-text");
  }
  tb.elText = document.getElementById("wpTextbox1");
  tb.elBirthLocation = document.getElementById("mBirthLocation");
  tb.elDeathLocation = document.getElementById("mDeathLocation");

  tb.elSummary = document.getElementById("wpSummary");
  tb.elEnhanced = document.getElementById("toggleMarkupColor");

  document
    .getElementById("toolbar")
    .insertAdjacentHTML("beforeend", '<dialog id="wtPlusDlg"></dialog><dialog id="wtPlusDlgCIB"></dialog>');
  tb.elDlg = document.getElementById("wtPlusDlg");
  tb.elDlgCIB = document.getElementById("wtPlusDlgCIB");

  dataTablesLoad("wtPlus");
}
