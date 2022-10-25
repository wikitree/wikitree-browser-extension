import editToolbarCategoryOptions from "./editToolbarCategoryOptions";
import editToolbarGenericOptions from "./editToolbarGenericOptions";
import editToolbarProfileOptions from "./editToolbarProfileOptions";
import editToolbarTemplateOptions from "./editToolbarTemplateOptions";
import editToolbarSpaceOptions from "./editToolbarSpaceOptions";
import "./editToolbar.css";

let editToolbarOptions = [];

/* Common events for links */
export function editToolbarWiki(params) {
  window.open("https://www.wikitree.com/wiki/" + params.wiki, "_blank");
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
  let element = event.srcElement;
  const id = element.dataset.id;
  event.preventDefault();
  let item = editToolbarFindItem(editToolbarOptions, id);
  if (item) {
    return item.call(item.params || {});
  } else {
    alert("Unknown event " + id);
  }
}

/* creates html of the drop down menu */
function editToolbarCreateHtml(items, featureEnabled, level) {
  let result = "";
  if (items && items.length) {
    for (var item of items) {
      if (!item.featureid || featureEnabled[item.featureid]) {
        let s = editToolbarCreateHtml(item.items, featureEnabled, level + 1);
        if (s || item.call) {
          if (item.button) {
            result +=
              '<div class="editToolbarDiv">' +
              '<p class="editToolbarButton">' +
              item.button +
              "</p>" +
              // '<img src="/photo.php/8/89/WikiTree_Images-22.png" height="22" id="editToolbarButton" />' +
              s +
              "</div>";
          } else {
            result += "<li><a ";
            result += item.hint ? 'title= "' + item.hint + '"' : "";
            result += 'href="javascript:void(0);" class="editToolbarClick" data-id="' + item.title + '"';
            result += ">" + item.title + (item.items ? " &gt;&gt;" : "") + "</a>";
            result += s;
            result += "</li>";
          }
        }
      }
    }
    if (level >= 0 && result) result = '<ul class="editToolbarMenu' + level + '">' + result + "</ul>";
  }
  return result;
}

/* creates menu next to the toolbar  */
function editToolbarCreate(options) {
  editToolbarOptions = options;
  chrome.storage.sync.get(null, (featureEnabled) => {
    var menuHTML = editToolbarCreateHtml(editToolbarOptions, featureEnabled, -1);
    document
      .getElementById("toolbar")
      .insertAdjacentHTML("afterend", '<div id="editToolbarExt">' + menuHTML + "</div>");
    document
      .querySelectorAll("a.editToolbarClick")
      .forEach((i) => i.addEventListener("click", (event) => editToolbarEvent(event)));
  });
}

if (window.location.href.match(/\/index.php\?title=Special:EditPerson&.*/g)) {
  editToolbarCreate(editToolbarProfileOptions);
} else if (
  window.location.href.match(/\/index.php\?title=Category:.*&action=edit.*/g) ||
  window.location.href.match(/\/index.php\?title=Category:.*&action=submit.*/g)
) {
  editToolbarCreate(editToolbarCategoryOptions);
} else if (
  window.location.href.match(/\/index.php\?title=Template:.*&action=edit.*/g) ||
  window.location.href.match(/\/index.php\?title=Template:.*&action=submit.*/g)
) {
  editToolbarCreate(editToolbarTemplateOptions);
} else if (
  window.location.href.match(/\/index.php\?title=Space:.*&action=edit.*/g) ||
  window.location.href.match(/\/index.php\?title=Space:.*&action=submit.*/g)
) {
  editToolbarCreate(editToolbarSpaceOptions);
} else if (
  window.location.href.match(/\/index.php\?title=.*&action=edit.*/g) ||
  window.location.href.match(/\/index.php\?title=.*&action=submit.*/g)
) {
  editToolbarCreate(editToolbarGenericOptions);
}
