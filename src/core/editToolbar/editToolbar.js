/*
Created By: Aleš Trtnik (Trtnik-2)
*/

import editToolbarProfileOptions from "./editToolbarProfileOptions";
import editToolbarSpaceOptions from "./editToolbarSpaceOptions";
import editToolbarCategoryOptions from "./editToolbarCategoryOptions";
import editToolbarTemplateOptions from "./editToolbarTemplateOptions";
import editToolbarGenericOptions from "./editToolbarGenericOptions";

import {
  mainDomain,
  isCategoryEdit,
  isProfileEdit,
  isSpaceEdit,
  isSpacePage,
  isTemplateEdit,
  isWikiEdit,
} from "../pageType";
import { getEnabledStateForAllFeatures } from "../options/options_storage";

let editToolbarOptions = [];

/* Common events for links */
export function editToolbarWiki(params) {
  window.open("https://" + mainDomain + "/wiki/" + params.wiki, "_blank");
}

export function editToolbarApp(params) {
  let w = document.querySelector("h1 > .copyWidget");
  let wikitreeID = w.getAttribute("data-copy-text");
  window.open("https://apps.wikitree.com/apps/" + params.app + "?wikitreeid=" + wikitreeID, "_blank");
}

/* Finds the clicked item in editToolbarOptions */
function editToolbarFindItem(items, name) {
  if (items && items.length) {
    for (var item of items) {
      if (item.button) {
        let result = editToolbarFindItem(item.items, name);
        if (result) {
          return result;
        }
      } else if (name.toUpperCase() === item.title.toUpperCase()) {
        return item;
      } else {
        let result = editToolbarFindItem(item.items, name);
        if (result) {
          return result;
        }
      }
    }
  }
}

/* main event handler */
function editToolbarEvent(event) {
  const element = event.target || event.currentTarget || event.srcElement;
  const id = element?.dataset?.id;
  if (!id) return; // nothing to do
  if (event.preventDefault) event.preventDefault();
  const item = editToolbarFindItem(editToolbarOptions, id);
  if (item) {
    try {
      return item.call(item.params || {});
    } catch (err) {
      console.error("editToolbarEvent error executing", id, err);
    }
  } else {
    console.warn("Unknown edit toolbar event", id);
  }
}

/* creates html of the drop down menu */
function editToolbarCreateHtml(items, featureEnabled, level) {
  let result = "";
  if (items && items.length) {
    for (var item of items) {
      if (!item.featureid || featureEnabled[item.featureid]) {
        let btnText = editToolbarCreateHtml(item.items, featureEnabled, level + 1);
        if (btnText || item.call) {
          if (item.button) {
            result +=
              '<div class="editToolbarDiv">' +
              '<p class="editToolbarButton">' +
              item.button +
              "</p>" +
              // '<img src="/photo.php/8/89/WikiTree_Images-22.png" height="22" id="editToolbarButton" />' +
              btnText +
              "</div>";
          } else {
            result +=
              "<li><a " +
              (item.hint ? 'title= "' + item.hint + '"' : "") +
              'href="javascript:void(0);" class="editToolbarClick" data-id="' +
              item.title +
              '">' +
              item.title +
              (item.items ? " »" : "") +
              "</a>" +
              btnText +
              "</li>";
          }
        }
      }
    }
    if (level >= 0 && result) result = '<ul class="editToolbarMenu' + level + '">' + result + "</ul>";
  }
  return result;
}

/* creates menu next to the toolbar  */
async function editToolbarCreate(options) {
  // Don't build a second row if one is already on the page.
  if (document.getElementById("editToolbarExt")) return;
  const toolbar = document.getElementById("toolbar");
  if (!toolbar) return;
  editToolbarOptions = options;
  const featureEnabled = await getEnabledStateForAllFeatures();
  var menuHTML = editToolbarCreateHtml(editToolbarOptions, featureEnabled, -1);
  // Checked again: the await above means two calls could both clear the first check.
  if (menuHTML != "" && !document.getElementById("editToolbarExt")) {
    import("./editToolbar.css");
    toolbar.insertAdjacentHTML("afterend", '<div id="editToolbarExt" style="display: none">' + menuHTML + "</div>");
    // Scoped to the row we just inserted, so we never bind a second listener to
    // anchors belonging to an earlier one.
    document
      .getElementById("editToolbarExt")
      .querySelectorAll("a.editToolbarClick")
      .forEach((i) => i.addEventListener("click", (event) => editToolbarEvent(event)));
  }
}

if (isProfileEdit) {
  editToolbarCreate(editToolbarProfileOptions);
} else if (isSpaceEdit || isSpacePage) {
  if (document.querySelector("#wpTextbox1")) {
    editToolbarCreate(editToolbarSpaceOptions);
  }
} else if (isCategoryEdit) {
  editToolbarCreate(editToolbarCategoryOptions);
} else if (isTemplateEdit) {
  editToolbarCreate(editToolbarTemplateOptions);
} else if (isWikiEdit) {
  editToolbarCreate(editToolbarGenericOptions);
}
