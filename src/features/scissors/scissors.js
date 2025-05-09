/*
Created By: Ian Beacall (Beacall-6), Aleš Trtnik (Trtnik-2)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import {
  isMediaWikiPage,
  isProfileHistoryDetail,
  isProfilePage,
  isProfileEdit,
  isSpaceEdit,
  isSpacePage,
  isCategoryPage,
  isImagePage,
  isTemplatePage,
  isProjectPage,
  isNetworkFeed,
  isCategoryEdit,
} from "../../core/pageType";
import { profilePerson } from "../../core/common";
import { showCopyMessage } from "../access_keys/access_keys.js";

shouldInitializeFeature("scissors").then((result) => {
  if (result) {
    import("./scissors.css");
    $(document).on("click", ".copy--buttons button", function (e) {
      e.preventDefault();
      copyThingToClipboard($(this).data("copy-text"));
      const text = $(this).data("copy-text");
      showCopyMessage(text);
    });

    if ($("#helpScissors").length == 0) {
      helpScissors();

      // setTimeout(removeWhitespaceBeforeCopyUserID, 2000);
    }
  }
});

async function helpScissors() {
  const options = await getFeatureOptions("scissors");
  let copyItems = [];
  let copyPosition = $("#person ul.copy--buttons");
  let useIsNew = false;
  // Network feed
  if (isNetworkFeed || isProfileHistoryDetail) {
    const urlParams = new URLSearchParams(window.location.search);
    useIsNew = true;
    $("h1").first().parent().append(`<div id="wbe-copy" class="col-auto col-lg-12 text-lg-end"></div>`);
    copyPosition = $("#wbe-copy");
    let feedID = urlParams.get("who");
    if (isProfileHistoryDetail) {
      feedID = urlParams.get("title");
    }
    const feedURL = window.location.href;
    let feedTitle = $("h1").first().text();
    const feedName = $('span.feed-item a[href*="wiki/' + feedID + '"')
      .eq(0)
      .text();
    if (isProfileHistoryDetail) {
      feedTitle = "Change Details of " + feedName;
    }

    copyItems.push({ label: "ID", text: feedID, image: true });
    copyItems.push({ label: "Link", text: `[[${feedID}|${feedName}]]` });
    copyItems.push({ label: "Title", text: feedTitle });
    copyItems.push({ label: "URL", text: feedURL });

    // Profiles change details page
    if (isProfileHistoryDetail) {
      const historyItem = $("span.feed-item");
      const theAct = historyItem.find("a:contains(created),a:contains(imported the data)");
      const createDetail = theAct.length ? ` at creation of WikiTree profile ${theAct[0].title}` : "";
      const fromGedcom = theAct.length ? historyItem.find('a[title*="UploadGedcom"]') : undefined;
      const changesMadeBy = $("td:contains(Changes made by)");
      const theDate = changesMadeBy.text().match(/[0-9]+ [A-Z][a-z]+ [0-9]{4}/);
      const adderA = changesMadeBy.find("a").eq(0);
      const adderID = adderA.attr("href").split("wiki/")[1];
      const adderName = adderA.text();
      const url = decodeURIComponent(window.location.href);
      let reference = `[${url} Added]${createDetail} by [[${adderID}|${adderName}]]`;
      if (fromGedcom && fromGedcom.length) {
        reference += ` through the import of ${fromGedcom.text()}`;
      }
      if (theDate) {
        reference += " on " + theDate + ".";
      } else {
        reference += ".";
      }
      copyItems.push({ label: "Reference", text: reference });
    }
  }

  // MediaWiki pages
  if (isMediaWikiPage || isCategoryEdit) {
    let aTitle = "";
    if (isProjectPage) {
      aTitle = "Project:" + document.title.replace(" Project", "");
    } else if (isCategoryPage || isCategoryEdit) {
      aTitle = document.title.replace("Edit ", "").replace(": ", ":").replace(" :", ":").trim();
    } else {
      aTitle = document.title;
    }
    copyItems.push({ label: "ID", text: aTitle, image: true });
    let aLink = "";
    if (isCategoryPage || isCategoryEdit) {
      if (options.categoryLinkFormat == "withParameter") {
        const aTitleWithAlias = aTitle + "|" + aTitle.replace("Category:", "").trim() + " category";
        aLink = `[[:${aTitleWithAlias}]]`;
      } else {
        aLink = `[[:${aTitle}]]`;
      }
    } else {
      aLink = `[[${aTitle}]]`;
    }
    copyItems.push({ label: "Link", text: aLink });
    let aUrl = window.location;

    /* //this will link to the base page
    if (!aUrl.includes("/wiki/")) {
      const params = new URLSearchParams(window.location.search);
      aUrl = "https://www.wikitree.com/wiki/" + params.get("title");
    }*/
    copyItems.push({ label: "URL", text: aUrl });

    if (isCategoryPage || isCategoryEdit) {
      copyPosition = $("h1");
      useIsNew = true;

      const aLink = `[[${aTitle}]]`;
      copyItems.push({ label: "Use", text: aLink });
    }
    if (isTemplatePage) {
      const aLink = `{{${aTitle.replace("Template:", "")}}}`;
      copyItems.push({ label: "Use", text: aLink });
    }
  }

  if (isImagePage) {
    copyPosition = $("#jump-nav");
    useIsNew = true;
    const aTitle = document.title.trim();
    const url = window.location.toString().split("#")[0].split("?")[0];

    //wikitree.com/photo/pdf/THE_STORY_OF_MY_YOUTH_AND_EARLY_MARRIED_LIFE_AS_TOLD_TO_LOIS_ELKINTON-1
    const linkParts = url.split("/");
    const fileName = linkParts[linkParts.length - 1];
    const ext = linkParts[linkParts.length - 2];
    const fullName = fileName + "." + ext;
    const aLink = `[[:Image:${fullName}|${aTitle}]]`;

    const useTemplate = `{{Image|file=${fullName}
      |align=r
      |size=m
      |caption=${aTitle}\n}}`;

    let useLink = `[[Image:${fullName}|250px|${aTitle}]]`;
    copyItems.push({ label: "ID", text: fullName, image: true });
    copyItems.push({ label: "Link", text: aLink });
    copyItems.push({ label: "URL", text: url });

    if (ext != "pdf") {
      copyItems.push({ label: "Use[]", text: useLink });
      copyItems.push({ label: "Use{}", text: useTemplate });
    }
  }

  // Space page
  if (isSpacePage || isSpaceEdit) {
    const aTitle = document.title.replace("Editing ", "");
    copyItems.push({ label: "/Title", text: aTitle });

    if (isSpaceEdit) {
      const aLink = " will be set in modifyLinkButtons";
      copyItems.push({ label: "Link", text: aLink });
    }
  }

  // Profile page
  if (isProfilePage || isProfileEdit) {
    const userID = $("#pageData").attr("data-mid");
    copyItems.push({ label: "UserID", text: userID });
  }

  addItems(copyItems, copyPosition, { isNew: useIsNew });

  modifyLinkButtons(options);

  // Sections of Space and Help
  AddToSections(options.sectionLinkOnProfiles);

  attachScissorsEvent();
}

function modifyLinkButtons(options) {
  if ((isProfilePage || isProfileEdit) && options.removeDates) {
    const dateless = $("button[aria-label='Copy Wiki Link']")
      .data("copy-text")
      .replace(/\s\([^\s]*[0-9]{3,4}.*\)/, ""); //year brackets might contain abt., two years or one, but never a blank
    $("button[aria-label='Copy Wiki Link']").data("copy-text", dateless).attr("data-copy-text", dateless);
  }

  if (isSpacePage || isSpaceEdit) {
    const buttonQuery = isSpacePage ? "button[aria-label='Copy Wiki Link']" : "button[aria-label='Link']";
    const button = $(buttonQuery);
    const aTitle = document.title.replace("Editing ", "").trim();
    const pageUrlPartEncoded = window.location.href
      .split(/Space(?:\:|%3A)/)[1]
      .split("#")[0]
      .split("?")[0]
      .split("&")[0];
    const urlPartDecoded = decodeURIComponent(pageUrlPartEncoded).split("_").join(" ");

    if (options.spaceLinkFormat == "withParameter") {
      //overwriting partial url encodings of the default server version
      const withParameter = "[[Space:" + urlPartDecoded + "|" + aTitle + "]]";
      button.data("copy-text", withParameter).attr("data-copy-text", withParameter);
    } else {
      const noParameter = "[[Space:" + urlPartDecoded + "]]";
      button.data("copy-text", noParameter).attr("data-copy-text", noParameter);
    }

    if (isSpaceEdit) {
      //fixing encoded ID part in the default server version
      const h1s = document.getElementsByTagName("h1");
      if (h1s.length > 0) {
        const buttons = h1s[0].getElementsByTagName("button");
        if (buttons.length > 0 && buttons[0].getAttribute("aria-label") == "Copy ID") {
          buttons[0].setAttribute("data-copy-text", "Space:" + urlPartDecoded);
        }
      }
    }
  }
}

function AddToSections(alsoOnProfilePages) {
  if ((isProfilePage && !alsoOnProfilePages) || isProfileEdit) {
    return;
  }

  const allHs = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  for (let i = 0; i < allHs.length; i++) {
    if (allHs[i].id == null || allHs[i].id == "") {
      continue;
    }
    const url = document.location.href.split("#")[0].split("?")[0] + "#" + allHs[i].id;

    const section = allHs[i].innerText.split("[edit]")[0];
    AddToOneSection(section, url, $(allHs[i]));
  }

  //just in case it gets switched back to the old pattern, we keep this loop for the moment as well
  const allAs = document.getElementsByTagName("a");
  for (let i = 0; i < allAs.length; i++) {
    if (allAs[i].getAttribute("name") == null || allAs[i].getAttribute("name") == "" || allAs[i].nextSibling == null) {
      continue;
    }
    const url = document.location.href.split("#")[0].split("?")[0] + "#" + allAs[i].getAttribute("name");

    const reg = /\.[A-Z|\d]{2}/gm;
    const section = decodeURIComponent(
      allAs[i]
        .getAttribute("name")
        .split("_")
        .join(" ")
        .replaceAll(reg, function (x) {
          return x.replace(".", "%");
        })
    );
    AddToOneSection(section, url, $(allAs[i].nextSibling));
  }
}

function AddToOneSection(section, url, copyPosition) {
  let title = document.title;
  if (isSpacePage) {
    title = "Space:" + title;
  }

  let wikiLink = "[[" + title + "#" + section + "]]";

  if (isProfilePage) {
    const profileID = profilePerson.Name;
    wikiLink = `[[${profileID}#${section}|${title.replace(" - WikiTree Profile", "")}: ${section}]]`;
  }
  const wikiLinkItem = { label: "Link", text: wikiLink, image: true };
  const urlLinkItem = { label: "URL", text: url, image: false };
  addItems([wikiLinkItem, urlLinkItem], copyPosition, { isNew: true });
}

export function addItems(copyItems, copyPosition, options = { isNew: false }) {
  if (options.isNew) {
    const aUL = $('<ul class="copy--buttons mono-b scissors"></ul>');
    const imageLI = $("<li></li>");
    const image = $('<img src="/images/icons/icon-copy.svg" alt="Copy icon">');
    imageLI.append(image);
    aUL.append(imageLI);

    copyItems.forEach((item, index) => {
      const aLI = $("<li></li>");
      let theLabel = item.label == "UserID" ? "User ID" : item.label;
      const button = $(`
          <button class="copyWidget helpScissors mono-b" data-copy-label="Copy ${item.label}" 
              data-copy-text="${item.text}" data-bs-toggle="tooltip" 
              data-bs-title="Copy ${item.label}">
              ${theLabel}
          </button>
      `);

      button.attr("aria-label", item.label);
      button.attr("title", item.text);
      button.attr("data-bs-title", "Copy User ID");

      aLI.append(button);
      aUL.append(aLI);
    });

    if (options.style) {
      const splitStyle = options.style.split(";");
      splitStyle.forEach((style) => {
        const split = style.split(":");
        aUL.css(split[0], split[1]);
      });
    }

    if (options.positioning == "before") {
      copyPosition.before(aUL);
    } else if (options.positioning == "prepend") {
      copyPosition.prepend(aUL);
    } else {
      copyPosition.append(aUL);
    }
  } else {
    for (let i = 0; i < copyItems.length; i++) {
      const item = copyItems[i];
      let button = document.createElement("button");
      button.setAttribute("aria-label", item.label);
      button.setAttribute("title", item.text);
      button.setAttribute("data-copy-label", `Copy ${item.label}`);
      button.setAttribute("class", "copyWidget helpScissors mono-b");
      button.setAttribute("data-copy-text", item.text);
      button.setAttribute("data-bs-toggle", "tooltip");
      button.setAttribute("data-bs-title", "Copy User ID");

      if (item.image) {
        button.innerHTML = '<img src="/images/icons/scissors.png">';
      }
      if (item.label == "UserID") {
        item.label = "User ID";
      }
      button.innerHTML += item.label.replace("/", "");

      if (item.label == "User ID" || item.label.match("Title")) {
        const li = document.createElement("li");
        li.append(button);
        copyPosition.append(li);
      } else {
        copyPosition.append(button);
      }
    }
  }
}

export function copyThingToClipboard(thing) {
  navigator.clipboard
    .writeText(thing)
    .then(() => {
      console.log("Text copied to clipboard");
    })
    .catch((err) => {
      console.error("Could not copy text: ", err);
    });
}

export function attachScissorsEvent() {
  $(document).on("click", "#g2gScissors button,.g2gScissors button", function (e) {
    e.preventDefault();
    copyThingToClipboard($(this).attr("data-copy-text"));
    showCopyMessage($(this).attr("data-copy-text"));
  });
}
