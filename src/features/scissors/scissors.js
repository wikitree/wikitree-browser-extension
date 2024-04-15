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

shouldInitializeFeature("scissors").then((result) => {
  if (result) {
    import("./scissors.css");
    if ($("#helpScissors").length == 0) {
      helpScissors();
      setTimeout(removeWhitespaceBeforeCopyUserID, 2000);
    }
  }
});

async function helpScissors() {
  const options = await getFeatureOptions("scissors");
  let copyItems = [];
  let copyPosition = $("h1");

  // Network feed
  if (isNetworkFeed || isProfileHistoryDetail) {
    const urlParams = new URLSearchParams(window.location.search);
    let feedID = urlParams.get("who");
    if (isProfileHistoryDetail) {
      feedID = urlParams.get("title");
    }
    const feedURL = window.location.href;
    let feedTitle = $("h1").text();
    const feedName = $('span.HISTORY-ITEM a[href*="wiki/' + feedID + '"')
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
      const historyItem = $("span.HISTORY-ITEM");
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
  if (isMediaWikiPage) {
    let aTitle = "";
    if (isProjectPage) {
      aTitle = "Project:" + document.title.replace(" Project", "");
    } else {
      aTitle = document.title;
    }
    copyItems.push({ label: "ID", text: aTitle, image: true });
    let aLink = "";
    if (isCategoryPage) {
      if (options.categoryLinkFormat == "withParameter") {
        aTitle = aTitle + "|" + document.title.replace("Category:", "").trim() + " category";
      }
      aLink = `[[:${aTitle}]]`;
    } else if (isTemplatePage) {
      aLink = `{{${aTitle}}}`;
    } else {
      aLink = `[[${aTitle}]]`;
    }
    copyItems.push({ label: "Link", text: aLink });
    const aUrl = window.location.href;
    copyItems.push({ label: "URL", text: aUrl });
  }

  if (isCategoryPage || isCategoryEdit) {
    const aTitle = document.title.trim().replace(": ", ":");
    const aLink = `[[${aTitle}]]`;
    copyItems.push({ label: "Use", text: aLink });
  }

  if (isImagePage) {
    const aTitle = document.title.trim();
    const url = window.location.toString();

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
  }

  // Profile page
  if (isProfilePage || isProfileEdit) {
    const userID = $("#pageData").attr("data-mid");
    copyItems.push({ label: "UserID", text: userID });
  }

  addItems(copyItems, copyPosition);

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
    const button = $("button[aria-label='Copy Wiki Link']");
    const aTitle = document.title.trim();
    const pageUrlPartEncoded = window.location.href.split("Space:")[1].split("#")[0];
    const urlPartDecoded = decodeURIComponent(pageUrlPartEncoded).split("_").join(" ");

    if (options.spaceLinkFormat == "withParameter") {
      //overwriting partial url encodings of the default server version
      const withParameter = "[[Space:" + urlPartDecoded + "|" + aTitle + "]]";
      button.data("copy-text", withParameter).attr("data-copy-text", withParameter);
    } else {
      const noParameter = "[[Space:" + urlPartDecoded + "]]";
      button.data("copy-text", noParameter).attr("data-copy-text", noParameter);
    }
  }
}

function AddToSections(alsoOnProfilePages) {
  if ((isProfilePage && !alsoOnProfilePages) || isProfileEdit) {
    return;
  }

  const allAs = document.getElementsByTagName("a");
  for (let i = 0; i < allAs.length; i++) {
    if (allAs[i].getAttribute("name") == null || allAs[i].getAttribute("name") == "" || allAs[i].nextSibling == null) {
      continue;
    }
    const url = document.location.href.split("#")[0] + "#" + allAs[i].getAttribute("name");

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

    let title = document.title;
    if (isSpacePage) {
      title = "Space:" + title;
    }

    let wikiLink = "[[" + title + "#" + section + "]]";

    if (isProfilePage) {
      const profileID =
        $("a.pureCssMenui0 span.person").text() || $("h1 button[aria-label='Copy ID']").data("copy-text");
      wikiLink = `[[${profileID}#${section}|${title.replace(" - WikiTree Profile", "")}: ${section}]]`;
    }
    const wikiLinkItem = { label: "Link", text: wikiLink, image: true };
    const urlLinkItem = { label: "URL", text: url, image: false };
    addItems([wikiLinkItem, urlLinkItem], $(allAs[i].nextSibling));
  }
}

export function addItems(copyItems, copyPosition) {
  for (let i = 0; i < copyItems.length; i++) {
    const item = copyItems[i];
    let button = document.createElement("button");
    button.setAttribute("aria-label", item.label);
    button.setAttribute("title", item.text);
    button.setAttribute("data-copy-label", `Copy ${item.label}`);
    button.setAttribute("class", "copyWidget helpScissors");
    button.setAttribute("data-copy-text", item.text);
    button.setAttribute("style", "color:#8fc641;");

    if (item.image) {
      button.innerHTML = '<img src="/images/icons/scissors.png">';
    }
    button.innerHTML += item.label;
    if (i < copyItems.length - 1) {
      button.innerHTML += "/";
    }
    copyPosition.append(button);
  }
}

function removeWhitespaceBeforeCopyUserID() {
  // Remove the space before "UserID"
  const jqueryCopyID = $('button:contains("UserID")');
  const copyID = jqueryCopyID[0];

  if (copyID) {
    let previousSibling = copyID.previousSibling;

    while (previousSibling && previousSibling.nodeType === 3 && /^\s*$/.test(previousSibling.nodeValue)) {
      const toRemove = previousSibling;
      previousSibling = previousSibling.previousSibling;
      toRemove.parentNode.removeChild(toRemove);
    }
    // Prepend the button text with a slash
    copyID.textContent = `/${copyID.textContent}`;
  }
}

export function copyThingToClipboard(thing) {
  const $temp = $("<input>");
  $("body").prepend($temp);
  $temp.val(thing).select();
  document.execCommand("copy");
  $temp.remove();
}

export function attachScissorsEvent() {
  $("#g2gScissors button").on("click", function (e) {
    e.preventDefault();
    copyThingToClipboard($(this).attr("data-copy-text"));
  });
}
