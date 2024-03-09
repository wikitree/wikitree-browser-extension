/*
Created By: Ian Beacall (Beacall-6), Aleš Trtnik (Trtnik-2)
*/

import $ from "jquery";
import { copyThingToClipboard } from "../g2g/g2g";
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
    const aTitle = document.title.trim();
    const aLink = `[[${aTitle}]]`;
    copyItems.push({ label: "Use", text: aLink });
  }

  if (isImagePage) {
    const aTitle = document.title.trim();
    const url = window.location.toString();

    //www.wikitree.com/photo/pdf/THE_STORY_OF_MY_YOUTH_AND_EARLY_MARRIED_LIFE_AS_TOLD_TO_LOIS_ELKINTON-1
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
    copyItems.push({ label: "Title", text: aTitle });
  }

  // Profile page
  if (isProfilePage || isProfileEdit) {
    const userID = $("#pageData").attr("data-mid");
    copyItems.push({ label: "UserID", text: userID });
    if (options.removeDates) {
      const dateless = $("button[aria-label='Copy Wiki Link']")
        .data("copy-text")
        .replace(/ \(.*[0-9]{4}.*\)/, "");
      $("button[aria-label='Copy Wiki Link']").data("copy-text", dateless).attr("data-copy-text", dateless);
    }
  }

  // Space page
  if ((isSpacePage || isSpaceEdit) && options.spaceLinkFormat != "withParameter") {
    const button = $("button[aria-label='Copy Wiki Link']");
    const aTitle = document.title.trim();
    const noParameter = "[[:Space: " + aTitle + "]]";
    button.data("copy-text", noParameter).attr("data-copy-text", noParameter);
  }
  AddItems(copyItems, copyPosition);

  // Sections of Space and Help
  const allAs = document.getElementsByTagName("a");
  for (let i = 0; i < allAs.length; i++) {
    /*
    <a name="N.C3.A4chster_Termin"></a>
      <h2>
        <span class="editsection">[<a href="/index.php?title=Space:Stammtisch&amp;action=edit&amp;section=1" title="Edit section: Nächster Termin">edit</a>]
        </span> <span class="mw-headline"> Nächster Termin </span>
      </h2>
    */

    if (
      allAs[i].name == null ||
      allAs[i].name == "" ||
      allAs[i].nextSibling == null /*||
      allAs[i].nextSibling.nextSibling == null*/
    ) {
      continue;
    }

    const reg = /(\.)(\d{1})/gm;
    const section = decodeURIComponent(
      allAs[i].name
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

    const wikiLink = "[[" + title + "#" + section + "]]";
    const copyItemsSection = [{ label: "Link", text: wikiLink }];
    AddItems(copyItemsSection, $(allAs[i].nextSibling) /* headline */);
  }

  $("helpScissors").on("click", function (e) {
    e.preventDefault();
    copyThingToClipboard($(this).attr("data-copy-text"));
  });
}

function AddItems(copyItems, copyPosition) {
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

    // Remove the space before "UserID"
    const copyID = document.querySelector('.copyWidget[aria-label="Copy UserID"]');
    if (copyID) {
      let previousSibling = copyID.previousSibling;
      while (previousSibling && previousSibling.nodeType === 3 && /^\s*$/.test(previousSibling.nodeValue)) {
        var toRemove = previousSibling;
        previousSibling = previousSibling.previousSibling;
        toRemove.parentNode.removeChild(toRemove);
      }
    }
  }
}
