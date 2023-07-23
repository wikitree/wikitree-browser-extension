/*
Created By: Ian Beacall (Beacall-6), Aleš Trtnik (Trtnik-2)
*/

import $ from "jquery";
import { copyThingToClipboard } from "../g2g/g2g";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import {
  isMediaWikiPage,
  isProfileHistoryDetail,
  isProfilePage,
  isProfileEdit,
  isSpaceEdit,
  isSpacePage,
  isCategoryPage,
  isTemplatePage,
  isProjectPage,
} from "../../core/pageType";

shouldInitializeFeature("scissors").then((result) => {
  if (result) {
    import("./scissors.css");
    if ($("#helpScissors").length == 0) {
      helpScissors();
    }
  }
});

function helpScissors() {
  let copyItems = [];
  let copyPosition = $("h1");

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
      aTitle = aTitle + "|" + document.title.replace("Category:", "").trim() + " category";
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
  // Space page
  if (isSpacePage || isSpaceEdit) {
    const aTitle = document.title.replace("Editing ", "");
    copyItems.push({ label: "Title", text: aTitle });
  }

  // Profile page
  if (isProfilePage || isProfileEdit) {
    const userID = $("#pageData").attr("data-mid");
    copyItems.push({ label: "UserID", text: userID });
  }

  // Profiles change details page
  if (isProfileHistoryDetail) {
    // if  ($("h1:contains('Change Details')").length || $("h1:contains('Creation of Profile')").length) {
    const historyItem = $("span.HISTORY-ITEM");
    let change = "Added";
    const theAct = historyItem.find("a:contains(created),a:contains(imported the data)");
    if (theAct.length) {
      change = `Creation of WikiTree profile ${theAct[0].title}`;
    }
    const changesMadeBy = $("td:contains(Changes made by)");
    const theDate = changesMadeBy.text().match(/[0-9]+ [A-Z][a-z]+ [0-9]{4}/);
    let adderA = changesMadeBy.find("a").eq(0);
    let adderID = adderA.attr("href").split("wiki/")[1];
    let adderName = adderA.text();
    const url = decodeURIComponent(window.location.href);
    let reference = "[" + url + " " + change + "] by [[" + adderID + "|" + adderName + "]]";
    if (theDate) {
      reference += " on " + theDate + ".";
    } else {
      reference += ".";
    }
    copyPosition = adderA.parent();
    copyItems.push({ label: "Reference", text: reference, image: true });
  }

  // Adds items and event
  if (copyItems && copyItems.length != 0) {
    copyPosition.append(
      $(
        copyItems
          .map((item) => {
            let x = `<button aria-label="Copy ${item.label}" title="${item.text}" data-copy-label="Copy ${item.label}" class="copyWidget helpScissors" data-copy-text="${item.text}" style="color:#8fc641;">`;
            if (item.image) {
              x += '<img src="/images/icons/scissors.png">' + item.label + "</button>";
            } else {
              x += "/" + item.label + "</button>";
            }
            return x;
          })
          .join("")
      )
    );
    $("helpScissors").on("click", function (e) {
      e.preventDefault();
      copyThingToClipboard($(this).attr("data-copy-text"));
    });
  }
}
