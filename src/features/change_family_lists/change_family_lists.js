/*
Created By: Ian Beacall (Beacall-6)
Contributors: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isOK, htmlEntities, displayName } from "../../core/common";
import { displayDates } from "../verifyID/verifyID";
import { getUserWtId } from "../../core/common";
import "./change_family_lists.css";
// import { mainDomain } from "../../core/pageType";
import { initRelationshipDB, RELATIONSHIP_STORE_NAME } from "../distanceAndRelationship/distanceAndRelationship.js";
import { profilePerson } from "../../core/common";

// temp
const mainDomain = "dev-2025.wikitree.com";

let options;
const user = getUserWtId();
window.people = null;
window.peopleByWtID = null;
let FAMILY_VITALS;
let profileApproxBirthDate;
let profPersonName;
let spouseData;

shouldInitializeFeature("changeFamilyLists").then(async (result) => {
  if (result) {
    // temp for testing

    $("#familyVitals-tab").trigger("click");

    spouseData = parseSpouseData();
    console.log("Spouse Data:", spouseData);

    FAMILY_VITALS = $("#familyVitals");
    await getWindowPeople();
    //TODO: handle failure to get people

    FAMILY_VITALS.find(".VITALS").each(function () {
      // Change tagname of each .VITAL to div
      $(this).replaceWith(function () {
        return $("<div />", {
          html: $(this).html(),
          class: $(this).attr("class"),
          id: $(this).attr("id"),
        });
      });
    });

    options = await getFeatureOptions("changeFamilyLists");
    window.excludeValues = ["", null, "null", "0000-00-00", "unknown", "undefined", undefined, NaN, "NaN"];
    prepareFamilyLists();
    if (options.moveToRight) {
      moveFamilyLists();
    }
    if (options.showSidebarHeading) {
      $("html").addClass("x-cfl-show-heading");
    }
    if (options.highlightActiveProfile) {
      $("html").addClass("x-cfl-highlight-active");
    }
    if (options.verticalLists) {
      $("#nVitals").addClass("vertical");
      makeVerticalFamLists();
    } else if (options.ageDifferences && $("li#profilePerson").length == 0) {
      window.insertInterval = setInterval(insertInSibList, 2000);
      window.triedInsertSib = 0;
    }
    if (!options.verticalLists) {
      prepareHeadingsForNonVertical();
      if (options.siblingAndChildCount) {
        addChildrenCount();
      }

      if (options.agesAtMarriages) {
        addMarriageAges();
      }
      const parentPerson = getPerson(profilePerson.Id);
      console.log("Parent Person:", parentPerson);

      // Add DNA confirmation tags
      if (parentPerson?.Children) {
        // Get the parent's Id
        const parentId = parentPerson.Id;
        // Iterate through the people to find children with the matching parent Id
        parentPerson.Children.forEach((childId) => {
          const child = getPerson(childId);
          let addDNAconfirmed = false;
          if (child.Mother == parentId && child.DataStatus?.Mother == 30) {
            addDNAconfirmed = true;
          } else if (child.Father == parentId && child.DataStatus?.Father == 30) {
            addDNAconfirmed = true;
          }
          child.NameWithSpaces = child.Name.replace(/_/g, " ");
          if (addDNAconfirmed) {
            $(`.VITALS a[href$="${child.Name}"],.VITALS a[href$="${child.NameWithSpaces}"]`).after(
              $(
                `<img class="DNAConfirmed" src="/images/icons/dna/DNA-confirmed.gif" border="0" width="38" height="12" alt="DNA confirmed" title="Confirmed with DNA testing">`
              )
            );
          }
        });
      }
      if (isOK(parentPerson?.BirthDate) && (options?.parentAges || options?.ageDifferences)) {
        addRelativeAges(parentPerson);
      }
    }

    if (window.people) {
      addParentStatusDataAttribute();
    }

    if (options.changeHeaders) {
      setTimeout(function () {
        changeFamilyHeaders(true);
      }, 5000);
    }

    setTimeout(function () {
      const openPadlock = $("img[title='Privacy Level: Open']");
      //console.log("User:", user);
      const currentProfile = getPerson(profilePerson.Id);
      let userOnTrustedList = false;
      if (user && currentProfile) {
        // Find user on Trusted List (Name)
        const trustedList = currentProfile.TrustedList;
        if (trustedList) {
          const trustedListNames = trustedList.map((item) => item.Name);
          userOnTrustedList = trustedListNames.includes(user);
        }
      }
      if (openPadlock.length || userOnTrustedList) {
        addAddLinksToHeadings();
      }
      if (options.highlightAncestors) {
        setTimeout(function () {
          getAncestorsOnPage().catch(console.error);
        }, 1000);
      }
      if (options.addPrefixes) {
        addPrefixes();
      }
    }, 3000);

    addParentStatus();

    window.onresize = function () {
      if ($("body.profile").length && window.location.href.match("Space:") == null) {
        moveFamilyLists();
      }
    };
  }
});

function getPerson(id) {
  return window.people?.get(String(id));
}

function getPersonByWtID(wtId) {
  return window.peopleByWtID?.get(wtId);
}

function parseSpouseData() {
  const spouseElem = document.getElementById("Spouses");
  if (!spouseElem) return null;

  const result = { spouses: [] };
  let currentSpouse = null;
  // A flag indicating that we’re in the midst of capturing marriage details.
  let expectingMarriageDetails = false;

  const nodes = spouseElem.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Process text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (!text) continue;

      // Detect the start of a new spouse block (e.g. "Husband of", "Wife of", or "Spouse of")
      const roleMatch = text.match(/^(Husband|Wife|Spouse)\s+of\b/i);
      if (roleMatch) {
        // If there's a block already in progress, push it before starting a new one.
        if (currentSpouse) {
          result.spouses.push(currentSpouse);
        }
        currentSpouse = { role: roleMatch[1] };
        // Reset any marriage details flag.
        expectingMarriageDetails = false;
        continue;
      }

      // If the text contains "married", begin capturing marriage details.
      if (text.toLowerCase().includes("married")) {
        expectingMarriageDetails = true;
        // Initialize marriageDetails with the current text.
        if (currentSpouse) {
          currentSpouse.marriageDetails = text;
        }
        continue;
      }

      // If we are capturing marriage details, then:
      if (expectingMarriageDetails && currentSpouse) {
        // If the text starts with "in ", treat it as the location.
        if (text.toLowerCase().startsWith("in ")) {
          currentSpouse.marriageLocation = text.replace(/^in\s+/i, "");
          currentSpouse.marriageDetails += " " + text;
          // We’re done with marriage details for this block.
          expectingMarriageDetails = false;
        } else {
          // Otherwise, treat this as the marriage date.
          currentSpouse.marriageDate = text;
          currentSpouse.marriageDetails += " " + text;
          // Do not clear the flag yet in case the next text node provides the location.
          continue;
        }
      }
    }

    // Process element nodes
    else if (node.nodeType === Node.ELEMENT_NODE) {
      // Capture the spouse’s name and wiki link
      if (node.tagName === "SPAN" && node.getAttribute("itemprop") === "spouse") {
        if (currentSpouse) {
          const a = node.querySelector("a");
          if (a) {
            currentSpouse.spouseWikiLink = a.getAttribute("href");
            const nameSpan = a.querySelector("span[itemprop='name']");
            if (nameSpan) {
              currentSpouse.spouseName = nameSpan.textContent.trim();
            }
          }
        }
      }
      // Capture the map link (if the href contains "maps.google.com")
      else if (
        node.tagName === "A" &&
        node.getAttribute("href") &&
        node.getAttribute("href").includes("maps.google.com")
      ) {
        if (currentSpouse) {
          currentSpouse.mapLink = node.getAttribute("href");
        }
      }
      // Capture the edit link and complete the current spouse block
      else if (node.tagName === "SPAN" && node.classList.contains("EDIT")) {
        const editA = node.querySelector("a");
        if (editA && currentSpouse) {
          currentSpouse.editLink = editA.getAttribute("href");
        }
        if (currentSpouse) {
          result.spouses.push(currentSpouse);
          currentSpouse = null;
          expectingMarriageDetails = false;
        }
      }
    }
  }
  // In case a spouse block is still in progress at the end.
  if (currentSpouse) {
    result.spouses.push(currentSpouse);
  }
  return result;
}

function addPrefixes() {
  const links = $(".VITALS a[href*='/wiki/']");
  // Find prefixes in window.people and add them.
  links.each(function () {
    const link = $(this);
    // Get wtid from link
    const wtid = link.attr("href").split("/").pop();
    const person = getPersonByWtID(wtid);
    if (!person) return;

    const prefix = person.Prefix;
    if (prefix) {
      link.prepend(`<span class="addedPrefix">${prefix}</span>`);
    }
  });
}

async function addAddLinksToHeadings() {
  $(".VITALS:contains([children unknown])").attr("id", "childrenUnknownHeading");
  $(".VITALS:contains([sibling(s) unknown])").attr("id", "siblingsUnknownHeading");
  $(".VITALS:contains([spouse(s) unknown])").attr("id", "spousesUnknownHeading");

  const linkBase = `https://${mainDomain}.wikitree.com/index.php?title=Special:EditFamily&u=${profilePerson.Id}`;
  const headings = [
    ["#siblingsHeader", "sibling"],
    ["#siblingsUnknownHeading", "sibling"],
    [".spouseText:first-of-type", "spouse"],
    ["#spousesUnknownHeading", "spouse"],
    ["#childrenHeader", "child"],
    ["#childrenUnknownHeading", "child"],
    ["#parentsHeader", "father"],
    ["#fatherUnknown", "father"],
    ["#motherUnknown", "mother"],
  ];
  let whichParent;

  if (window.people) {
    const pPerson = getPerson(profilePerson.Id);
    if (!pPerson?.Father) {
      whichParent = "mother";
    }

    headings.forEach(function (aHeading) {
      if (
        !(["#siblingsUnknown", "#siblingsHeader"].includes(aHeading[0]) && pPerson?.Mother == 0 && pPerson?.Father == 0)
      ) {
        $(aHeading[0])
          .attr("title", "Right click to add a " + aHeading[1])
          .css("cursor", "pointer");
        $(aHeading[0]).on("contextmenu", function (e) {
          e.preventDefault();
          if (!aHeading[1]) {
            aHeading[1] = whichParent;
          }
          window.location = linkBase + "&who=" + aHeading[1];
        });
      }
    });
  }
}

/**
 * Move .VITAL elements into the new container #nVitals
 */
function prepareFamilyLists() {
  if ($("body.profile").length && window.location.href.match("Space:") == null && $("#nVitals").length == 0) {
    const theVitals = $("#familyVitals .VITALS");
    // Create a new family list container #nVitals that we will contain all the family lists
    const familyLists = $(
      '<div id="nVitals" style="display: none;">' +
        '<h2 class="mt-5 sidebar-heading">Family Relationships</h2>' +
        "</div>"
    );
    const idsOfInterest = new Set(["Parents", "Siblings", "Spouses", "Children"]);

    // Add the new family list container after the last old vital object
    theVitals.last().after(familyLists);
    theVitals.each(function () {
      const $this = $(this);
      if ($this.find("span[itemprop='givenName']").length) {
        // Give the profile name .VITAL an id
        $this.prop("id", "profileName");
        if (!options.moveToRight) {
          // We're not moving lists to the right, so place the new container after the profile name.
          $this.after(familyLists);
        }
      } else {
        // Decorate each appropriate .VITAL with the familyList class and append all of them to the new container
        const id = $this.prop("id");
        if (idsOfInterest.has(id)) {
          $this.addClass("familyList");
        }
        if (id == "Spouses") {
          $this.addClass("spouseDetails");
        }
        $(this).appendTo(familyLists);
      }
    });

    familyLists.show();
  }
}

async function getWindowPeople() {
  const getPeopleResult = await getFamilyPeople();

  const people = getPeopleResult[0].people;
  const pPerson = people?.[profilePerson.Id];
  const peopleArray = Object.values(people);
  if (pPerson) {
    pPerson.Children = [];
    for (const p of peopleArray) {
      if (p.Father == profilePerson.Id || p.Mother == profilePerson.Id) {
        pPerson.Children.push(p.Id);
      }
    }
  }
  window.people = new Map(Object.entries(people));
  window.peopleByWtID = new Map(peopleArray.map((p) => [p.Name, p]));

  // Construct Children arrays for the profile person
  if (pPerson) {
    pPerson.Children = [];
    // Collect all the ids of profiles that have this person as parent
    for (const p of window.people.values()) {
      if (p.Father == profilePerson.Id || p.Mother == profilePerson.Id) {
        pPerson.Children.push(p.Id);
      }
    }
  }
  return true;
}

const getPeopleFields =
  "BirthDate,BirthDateDecade,BirthLocation,BirthName,Connected,DataStatus,DeathDate,DeathDateDecade,DeathLocation," +
  "Derived.BirthNamePrivate,Derived.LongName,Derived.LongNamePrivate,Father,FirstName,Gender,Id,IsLiving," +
  "LastNameAtBirth,LastNameCurrent,LastNameOther,Manager,MiddleName,Mother,Name,Prefix,RealName,ShortName," +
  "Spouses,Suffix,TrustedList";

async function getFamilyPeople(args) {
  const keys = args?.keys || profilePerson.Id;
  const fields = args?.fields || getPeopleFields;
  const result = await postToAPI({
    action: "getPeople",
    appId: "WBE_changeFamilyLists",
    keys: keys,
    fields: fields,
    nuclear: 1,
  });
  return result;
}

function postToAPI(postData) {
  var ajax = $.ajax({
    // The WikiTree API endpoint
    url: "https://api.wikitree.com/api.php",

    // We tell the browser to send any cookie credentials we might have (in case we authenticated).
    xhrFields: { withCredentials: true },

    // Doesn't help. Not required from (dev|apps).wikitree.com and api.wikitree.com disallows cross-origin:*
    //'crossDomain': true,

    // We're POSTing the data so we don't worry about URL size limits and want JSON back.
    type: "POST",
    dataType: "json",
    data: postData,
  });

  return ajax;
}

/**
 * Move the family lists into the right-hand column, if the screen is wide enough
 * and the option is enabled.
 */
async function moveFamilyLists() {
  const familyLists = $("#nVitals");

  if (window.innerWidth < 992) {
    familyLists.removeClass("row").insertAfter($("#birthDetails, #profileName").last());
  } else if (options.moveToRight) {
    familyLists.addClass("row");

    let $before;
    if (options.familyListPosition == "beforeManager") {
      $before = $("#Profile-Data");
    } else if (options.familyListPosition == "beforePhotos") {
      $before = $("#Photos");
    }
    if (!$before?.length) {
      $before = $("#geneticfamily");
      if (!$before.length) {
        $before = $("#DNA");
        if (!$before.length) {
          $before = $("#Research");
        }
      }
    }
    if ($before.length) {
      familyLists.insertBefore($before);
    } else {
      familyLists.insertAfter("#Profile-Data");
    }
  }
}

async function getAncestorsOnPage() {
  const storeName = RELATIONSHIP_STORE_NAME;
  const dbPromise = new Promise((resolve, reject) => {
    initRelationshipDB((event) => resolve(event.target.result));
  });

  const db = await dbPromise;

  // Get ancestor IDs based on the relationship filter
  const ancestorsPromise = new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const allItemsRequest = store.getAll();

    allItemsRequest.onsuccess = () => {
      const items = allItemsRequest.result;
      const ancestorKeys = items
        .filter((item) => {
          // console.log(item);
          const relationship = item?.relationship?.toLowerCase();
          //console.log(relationship);
          if (!relationship) return false;
          return relationship.match(/father|mother/i) != null && item.userId === user;
        })
        .map((item) => item.id); // Extract only ancestor IDs
      resolve(ancestorKeys);
    };

    allItemsRequest.onerror = (event) => reject(event.target.error);
  });

  const ancestorKeys = await ancestorsPromise;

  const familyLinks = $(".VITALS a[href*='/wiki/']");
  // Make array of wtids
  const peopleOnPage = familyLinks
    .map(function () {
      const link = $(this);
      const href = link.attr("href");
      if (href) {
        const wtid = href.split("/").pop();
        return wtid;
      }
    })
    .get();
  // Add the profile person
  peopleOnPage.push(profilePerson.Name);

  const ancestorsOnPage = peopleOnPage.filter((person) => {
    const personWithUnderscores = person.replace(/ /g, "_");
    const personWithSpaces = person.replace(/_/g, " ");
    return ancestorKeys.includes(personWithUnderscores) || ancestorKeys.includes(personWithSpaces);
  });

  // Highlight ancestors on the page
  ancestorsOnPage.forEach((ancestor) => {
    const element = $(
      `.VITALS a[href$="/wiki/${ancestor.replace(/ /g, "_")}"],
       .VITALS a[data-wtid="${ancestor.replace(/ /g, "_")}"],
       .VITALS a[href$="/wiki/${ancestor.replace(/_/g, " ")}"],
       .VITALS a[data-wtid="${ancestor.replace(/_/g, " ")}"]`
    );
    if (element.length && element.data("status") != 5) {
      addAncestorLabels(element);
    }
  });

  if (ancestorsOnPage.includes(profilePerson.Name)) {
    // Add ancestor labels for the parents of the profile person
    // a[arial-label="Father"], a[aria-label="Mother"]
    const fatherElement = $(`.VITALS a[aria-label="Father"]`);
    const motherElement = $(`.VITALS a[aria-label="Mother"]`);
    if (fatherElement.length && fatherElement.data("status") != 5) {
      addAncestorLabels(fatherElement);
    }
    if (motherElement.length && motherElement.data("status") != 5) {
      addAncestorLabels(motherElement);
    }
    if ($("#childrenList").length && $("#childrenList").find("a.ancestor").length == 0) {
      // Call WT+ API to get the children of the ancestor of the user
      // https://plus.wikitree.com/function/WTPath/Path.htm?WikiTreeID1=${profilePersonName}&WikiTreeID2=${user}&relatives=1
      // Fetch this, then find the a in the 2nd td of the third tr of the table (of the results)
      // This will be an ancestor of the user.

      const connectionName = await getAncestorConnection(profilePerson.Name, user);

      if (connectionName) {
        const connectionElement = $(
          `.VITALS a[href$="/wiki/${connectionName.replace(/ /g, "_")}"],
           .VITALS a[data-wtid="${connectionName.replace(/ /g, "_")}"],
           .VITALS a[href$="/wiki/${connectionName.replace(/_/g, " ")}"],
           .VITALS a[data-wtid="${connectionName.replace(/_/g, " ")}"]`
        );
        if (connectionElement.length) {
          addAncestorLabels(connectionElement);
        }
      }
    }

    // Highlight the ancestor child's parent (the right spouse of the profilePerson).
    if ($("#childrenList a.ancestor").length && $(".spouseDetails a.ancestor").length == 0) {
      const connectionElement = $("#childrenList a.ancestor");
      // Get spouse_x class of closest li
      const thisClass = connectionElement.closest("li").attr("class");
      // Find the spouse of the profile person with the same class
      // There may be more than one class. We need to find the one that starts with "spouse_" (if there is one).
      const spouseClass = thisClass?.split(" ").find((c) => c.startsWith("spouse_"));
      if (spouseClass) {
        const spouseA = $(`.spouseDetails.${spouseClass} span a.spouseLink`);
        if (spouseA.length) {
          addAncestorLabels(spouseA);
        }
      } else {
        // If there is no spouse class, find the first spouse link
        const spouseA = $(`a.spouseLink`);
        if (spouseA.length) {
          addAncestorLabels(spouseA);
        }
      }
    }
  } else if ($("#siblingList a.ancestor").length) {
    const closestLi = $("#siblingList a.ancestor").closest("li");
    const fatherId = closestLi.data("father");
    const motherId = closestLi.data("mother");
    const fatherElement = $(`.VITALS li[data-id="${fatherId}"] a`);
    const motherElement = $(`.VITALS li[data-id="${motherId}"] a`);
    if (fatherElement.length && fatherElement.data("status") != 5) {
      addAncestorLabels(fatherElement);
    }
    if (motherElement.length && motherElement.data("status") != 5) {
      addAncestorLabels(motherElement);
    }
  }

  return ancestorsOnPage.map((a) => a.Name); // Return the array of ancestor WT IDs
}

async function getAncestorConnection(ancestor, user) {
  const url = `https://plus.wikitree.com/function/WTPath/Path.htm?WikiTreeID1=${ancestor}&WikiTreeID2=${user}&relatives=1`;
  return fetch(url)
    .then((response) => response.text())
    .then((html) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const table = doc.querySelector("table");
      const rows = table.querySelectorAll("tr");
      const ancestorLink = rows[2].querySelector("td:nth-child(2) a");
      if (ancestorLink) {
        return ancestorLink.href.split("/").pop();
      }
    });
}

// element is a jQuery object
function addAncestorLabels(element) {
  element.addClass("ancestor");
  element.attr("title", "Ancestor");
}

function formatSpouses() {
  let vitalsP = $("#nVitals.vertical .VITALS span[itemprop='spouse']").closest(".VITALS");

  if (vitalsP.length) {
    let htmlContent = vitalsP.html();

    // Split by 'Husband of' or 'Wife of', keeping those parts
    const label = htmlContent.includes("Husband of") ? "Husband of" : "Wife of";
    let spouses = htmlContent.split(/(Husband of|Wife of)/).filter((s) => s.trim() !== "");
    // This is counting 'Husband of' or 'Wife of' as a spouse, so remove them.
    spouses = spouses.filter((s) => s !== "Husband of" && s !== "Wife of");

    //  console.log("Spouses:", spouses);
    // Clear and format the container
    vitalsP.empty().addClass("spouseDetails familyList");

    let spouseCounter = 0;

    // Process each spouse entry
    for (let i = 0; i < spouses.length; i++) {
      let label = spouses[i].trim(); // "Husband of" or "Wife of"
      let spouseDetails = spouses[i] ? spouses[i].trim() : ""; // The spouse's details

      if (spouseDetails) {
        let spouseMatch = spouseDetails.match(/<span itemprop="spouse".*?<\/span>/);
        // let marriageDetails = spouseDetails.replace(spouseMatch ? spouseMatch[0] : "", "").trim();

        // Create spouse container div
        let spouseDiv = $("<div class='aSpouse'></div>").addClass("spouse_" + (i + 1));

        // Create the spouse details grid
        let spouseSpan = $(
          "<span itemprop='spouse' itemscope itemtype='https://schema.org/Person' class='spouseEntry'></span>"
        ).html(spouseMatch ? spouseMatch[0] : "");

        let gender = label.includes("Husband") ? "Male" : "Female";
        let roleLabel = label.includes("Husband") ? "Husband" : "Wife";
        spouseSpan.attr("data-gender", gender);
        spouseSpan.attr("aria-label", roleLabel);

        const spouseLink = spouseSpan.find("a").attr("href").split("/").pop();
        const personData = getPersonByWtID(spouseLink);
        addDataToPerson(spouseDiv, personData);

        // Ensure the spouse data is correctly formatted
        if (personData) {
          let spouseDates = displayDates(personData);
          let idName = personData.Name.replace(/[.'"]/g, "");

          // Grid container for Name, Dates, and Relative Age
          let spouseGrid = $(`<div class='spouseGrid' data-gender='${personData.Gender}'></div>`);

          let spouseDateSpan = $("<span class='spouseDates bdDates' id='" + idName + "-bdDates'></span>").text(
            spouseDates
          );
          spouseGrid.append(spouseSpan).append(spouseDateSpan);
          spouseDiv.append(spouseGrid);
          // Add the marriage dates and map link from spouseData to spouseDiv. Use the marriageDetails field;
          if (spouseData) {
            const spouse = spouseData.spouses.find((s) => s.spouseWikiLink === spouseSpan.find("a").attr("href"));
            if (spouse) {
              // Use the marriageDetails field.
              let marriageDetailsSpan;
              if (spouse.marriageDetails) {
                const marriageDetails = spouse.marriageDetails;
                marriageDetailsSpan = $(`<span class='marriageDetails'>${marriageDetails}</span>`);
                spouseDiv.append(marriageDetailsSpan);
              }
              // Use the mapLink field.
              if (spouse.mapLink) {
                // Maplink example:
                /*
<a href="https://maps.google.com/maps?q=Launceston, Cornwall, England" data-bs-toggle="tooltip" data-bs-title="Marriage Location on Map" target="_map"><img src="/images/icons/icon-map-pin.svg" alt="map icon"></a>
                */
                const mapLink = $(
                  `<a href="${spouse.mapLink}" data-bs-toggle="tooltip" data-bs-title="Marriage Location on Map" target="_map"><img src="/images/icons/icon-map-pin.svg" alt="map icon"></a>`
                );
                marriageDetailsSpan.append(mapLink);
              }
            }
          }

          if (options.ageDifferences && isOK(personData?.["BirthDate"])) {
            const relAgeSpan = addRelativeAge(
              spouseSpan.find("a")[0],
              profPersonName,
              profileApproxBirthDate,
              personData["BirthDate"]
            );
            spouseGrid.append(relAgeSpan);
            spouseGrid.addClass("hasRelAge");
          }
        }

        vitalsP.append(spouseDiv);
      }
    }

    // Add "Spouse:" clickable button (only once)
    const spouseOrSpouses = spouseCounter > 1 ? "Spouses" : "Spouse";

    let spouseButton = $(
      `<a class='spouseText clickable' data-alt-text='${spouseOrSpouses}: ' data-original-text='${label}: ' data-this-text='${label}: ' data-replace-text='${spouseOrSpouses}: '>${label}: </a>`
    );

    vitalsP.prepend(spouseButton);

    const editButton = $(
      `<span class="EDIT" data-bs-toggle="tooltip" data-bs-title="Add/Edit Spouses"><a href="/index.php?title=Special:EditFamily&amp;u=${profilePerson.Id}&amp;who=spouse">add/edit spouses</a></span>`
    );
    vitalsP.append(editButton);
  }
}

/*
      $("#siblingsHeader").off("click");
      $("body").on("click", "#siblingsHeader", function () {
        siblingsHeader();
      });
*/

function makeVerticalFamLists() {
  if ($("body.profile").length && $("body[class*=page-Space_]").length == 0) {
    const pagePerson = getPerson(profilePerson.Id);
    profileApproxBirthDate = getApproxBirthDate(pagePerson);
    profPersonName = pagePerson?.FirstName || pagePerson?.BirthNamePrivate || "the person of the current profile";

    formatSpouses();

    setTimeout(function () {
      addHalfsStyle();
    }, 1000);

    fixAllPrivates();

    if ($("span.large:contains(Family Member)").length == 0) {
      reallyMakeVerticalFamLists();
      $(".familyList li").each(function () {
        if (
          $(this)
            .text()
            .match(/^,|^Sister|^Brother|^\sand\s/)
        ) {
          $(this).remove();
        }
      });
    }

    $("span#spousesUnknown").each(function () {
      if ($(this).text() == "") {
        $(this).remove();
      }
    });
  }
}

async function addHalfsStyle() {
  if ($("#nVitals span.half").length && $(".parent_1,.parent_2").length == 0) {
    $("#parentList li").each(function (index) {
      let p1id = "dummy";
      let p2id = "dummy";
      if (index == 0 && $(this).data("id") != undefined) {
        $(this).addClass("parent_1");
        p1id = $(this).data("id");
      }
      if (index == 1 && $(this).data("id") != undefined) {
        $(this).addClass("parent_2");
        p2id = $(this).data("id");
      }
      $("#siblingList li").each(function () {
        let father = $(this).data("father");
        let mother = $(this).data("mother");
        let thisLi = $(this);
        if (
          (father == p1id && p1id != undefined) ||
          (thisLi.attr("id") == "profilePerson" && window.BioPerson.Father != 0)
        ) {
          $(this).find("span[itemprop='sibling']").addClass("parent_1");
        }
        if (
          (mother == p2id && p2id != undefined) ||
          (thisLi.attr("id") == "profilePerson" && window.BioPerson.Mother != 0)
        ) {
          $(this).addClass("parent_2");
        }
      });
    });
  }
}

function addAriaLabel(pData, EL) {
  // console.log("pData:", pData);

  const el = $(EL); // Ensure el is a jQuery object
  let ariaLabel = "";

  // Determine the aria-label based on the closest element
  if (el.closest("#parentList").length) {
    ariaLabel = pData.Gender === "Male" ? "Father" : pData.Gender === "Female" ? "Mother" : "Parent";
  } else if (el.closest("#siblingList").length) {
    ariaLabel = pData.Gender === "Male" ? "Brother" : pData.Gender === "Female" ? "Sister" : "Sibling";
  } else if (el.closest("#spouseDetails").length) {
    ariaLabel = pData.Gender === "Male" ? "Husband" : pData.Gender === "Female" ? "Wife" : "Spouse";
  } else if (el.closest("#Children").length) {
    ariaLabel = pData.Gender === "Male" ? "Son" : pData.Gender === "Female" ? "Daughter" : "Child";
  }

  // Check if the gender is not "blank"
  if (pData?.DataStatus?.Gender !== "blank") {
    el.attr("aria-label", ariaLabel);
  }
}

function appendParentStatus(el, parentId, profilePersonId, status) {
  const STATUS_UNCERTAIN = 10;
  const STATUS_NON_BIOLOGICAL = 5;
  const statusText =
    status == STATUS_UNCERTAIN ? "[Uncertain]" : status == STATUS_NON_BIOLOGICAL ? "[Non-biological]" : null;

  if (statusText && profilePersonId == parentId) {
    el.find("span[itemprop='name']").after($("<span class='parentStatus'>").text(` ${statusText}`));
  }
}

function addDataToPerson(el, pData) {
  const profilePersonId = profilePerson.Id;
  if (pData) {
    let oGender = "";
    if (!(pData?.DataStatus?.Gender == "blank" || !pData.Gender)) {
      oGender = pData.Gender || "";
    }
    el.attr("data-gender", oGender);
    el.attr("data-id", pData.Id);
    el.attr("data-father", pData.Father);

    if (pData?.DataStatus) {
      const { Father: fatherStatus, Mother: motherStatus } = pData.DataStatus;

      if (fatherStatus) {
        el.attr("data-father-status", fatherStatus);
        appendParentStatus(el, pData.Father, profilePersonId, fatherStatus);
      }

      el.attr("data-mother", pData.Mother);

      if (motherStatus) {
        el.attr("data-mother-status", motherStatus);
        appendParentStatus(el, pData.Mother, profilePersonId, motherStatus);
      }
    }
  }
}

function changeFamilyHeaders(first = false) {
  const els = [".spouseText", "#siblingsHeader", "#parentsHeader", "#childrenHeader"];
  els.forEach(function (elo) {
    let el = $(elo);
    let tDataText = el.attr("data-this-text");
    let tDataReplace = el.attr("data-replace-text");
    el.text(tDataReplace);
    el.attr("data-this-text", tDataReplace);
    el.attr("data-replace-text", tDataText);
    el.addClass("clickable");
  });
  if (first == false) {
    let isOn = false;
    if ($("#parentsHeader").text().match("Parents: ")) {
      isOn = true;
    }
    getFeatureOptions("changeFamilyLists").then((optionsData) => {
      optionsData.changeHeaders = options.changeHeaders = isOn;
      const storageName = "changeFamilyLists_options";
      chrome.storage.sync.set({
        [storageName]: optionsData,
      });
    });
  }
}

async function spouseToSpouses() {
  if ($(".aSpouse").length > 1) {
    let spouseText;
    $(".aSpouse").each(function (index) {
      spouseText = $(this).find("a.spouseText");
      spouseText.addClass("clickable");
      if (index == 0) {
        if (spouseText.attr("data-alt-text") == "Spouse: ") {
          spouseText.attr("data-alt-text", "Spouses: ");
          spouseText.attr("data-replace-text", "Spouses: ");
        } else if (spouseText.text() == "Spouse: ") {
          spouseText.text("Spouses: ");
          spouseText.attr("data-this-text", "Spouses: ");
        }
      } else {
        spouseText.remove();
      }
      // $(this).appendTo($("#spouseDetails"));
    });
  }
}

function fixAllPrivates() {
  fixNakedPrivates();
  fixPrivates("Daughter", "children");
  fixPrivates("Son", "children");
  fixPrivates("Sister", "sibling");
  fixPrivates("Brother", "sibling");
  fixPrivates("Mother", "parent");
  fixPrivates("Father", "parent");

  $(".bdDates").each(function () {
    let oText = $(this).text().replace(/\s/g, "");
    if (oText == "(-)") {
      $(this).text("");
    }
  });
}

function fixNakedPrivates() {
  const tNodes = textNodesUnder(document.body);
  const rgx1 = /(mother)|(father)/g;
  const rgx2 = /(sister)|(brother)/g;
  const rgx3 = /(((Brother)|(Sister))\sof)\s(\[private.*)/g;
  const rgx4 = /((Brother)|(Sister))\sof/g;
  const rgx5 = /(((Husband)|(Wife))\sof)\s(\[private.*)/gm;
  const rgx6 = /((Husband)|(Wife))\sof/g;
  for (let n = 0; n < tNodes.length; n++) {
    let firstMatch = tNodes[n].textContent.match(rgx3);
    let ip;
    if (firstMatch != null) {
      let borsof = firstMatch[0].match(rgx4);
      if (borsof != null) {
        let borsofText = document.createTextNode(borsof);
        tNodes[n].parentNode.insertBefore(borsofText, tNodes[n]);
        let textB = "Siblings: ";
        let textA = borsof;
        let sibsHeader = $(
          `<span id="siblingsHeader" class="clickable" data-replace-text="${textB} " data-alt-text="${textA} " data-original-text="${textB} " data-this-text="${textA} ">${textA} </span>`
        );
        $(borsofText).replaceWith(sibsHeader);
        $("#siblingsHeader").on("click", function () {
          changeFamilyHeaders();
        });
      }
      ip = "sibling";
      let nSpan = createPrivateAndDates(tNodes[n], tNodes[n].nextSibling, ip);
      tNodes[n].parentNode.insertBefore(nSpan, tNodes[n]);
    }
    let firstMatch2 = tNodes[n].textContent.match(rgx5);
    if (firstMatch2 != null) {
      let husbandOrWifeOf = firstMatch2[0].match(rgx6);
      let privateText = firstMatch2[0].match(/private wife|husband/);
      let fullPrivateText;
      if (privateText) {
        fullPrivateText = "[" + privateText[0] + "]";
      } else {
        fullPrivateText = "[private spouse]";
      }
      const spouseText = $(
        `<a class="spouseText clickable" data-alt-text="Spouse: " data-original-text="${husbandOrWifeOf[0]} " data-this-text="${husbandOrWifeOf[0]} " data-replace-text="Spouse: ">${husbandOrWifeOf[0]} </a>`
      );

      if (tNodes[n].nextSibling.nextSibling.textContent.match(/^\]/)) {
        tNodes[n].parentNode.removeChild(tNodes[n].nextSibling.nextSibling);
      }

      const privateBit = $(
        `<span itemprop="spouse" itemtype="https://schema.org/Person" data-gender="Female" aria-label="${fullPrivateText}"><a class="spouseLink"><span itemprop="name"><strong>${fullPrivateText}</strong></span></a></span>"`
      );
      privateBit.append($(tNodes[n].nextSibling));

      $(tNodes[n].parentNode).append(spouseText, privateBit);
    }
    if (tNodes[n].textContent.match(/^\]?((,)|(\sand)).*\[pr/)) {
      let pMatch = tNodes[n].textContent.match(rgx1);
      let sMatch = tNodes[n].textContent.match(rgx2);
      if (pMatch != null) {
        ip = "parent";
      } else if (sMatch != null) {
        ip = "sibling";
      } else {
        ip = "child";
      }
      let nSpan = createPrivateAndDates(tNodes[n], tNodes[n].nextSibling, ip);
      if (tNodes[n].parentNode) {
        tNodes[n].parentNode.insertBefore(nSpan, tNodes[n]);
      }
    }
  }
}

function addParentStatusDataAttribute() {
  // Add parent status to parent links
  const pagePerson = getPerson(profilePerson.Id);
  const dataStatus = pagePerson?.DataStatus;
  if (pagePerson?.Father) {
    const fatherName = getPerson(pagePerson.Father)?.Name;
    const fatherLink = $(`.VITALS a[href$="${fatherName}"]`);

    const motherName = getPerson(pagePerson.Mother)?.Name;
    const motherLink = $(`.VITALS a[href$="${motherName}"]`);

    if (dataStatus) {
      const { Father: fatherStatus, Mother: motherStatus } = dataStatus;
      if (fatherStatus) {
        fatherLink.attr("data-status", fatherStatus);
      }
      if (motherStatus) {
        motherLink.attr("data-status", motherStatus);
      }
    }
  }
}

function reallyMakeVerticalFamLists() {
  const nVitals = $("#nVitals");
  const dparents = document.querySelectorAll('#nVitals span[itemprop="parent"]');
  const addSibling = $("a:contains('[add sibling]')");
  const addChild = $("a:contains('[add child]')");
  const motherQ = $("a:contains('[mother?]')");
  const fatherQ = $("a:contains('[father?]')");
  const childrenQ = $("a:contains('[children?]')");
  const spouseQ = $("a:contains('[add spouse?]'),a:contains('[spouse?]')");

  const noParentsPublic = " of [father unknown] and [mother unknown]";
  const noFatherPublic = / of \[father unknown\] and $/;
  const noMotherPublic = /and \[mother unknown\]/;

  let dparentsText;
  if (dparents) {
    dparentsText = $(dparents[0]).parent().text();
  }
  const childrenQSpan = $("<span id='childrenUnknownQ'></span>");
  if (childrenQ.length && childrenQSpan.length == 0) {
    childrenQ.after(childrenQSpan);
    $("#childrenUnknownQ").append(childrenQ);
  }

  dparents.forEach(function (aParent) {
    if (aParent.nextElementSibling) {
      let anIMG;
      if (aParent.nextElementSibling.tagName == "IMG") {
        anIMG = $(aParent.nextElementSibling);
      } else if ($(aParent.nextElementSibling).find("img")) {
        anIMG = $(aParent.nextElementSibling).find("img");
      }
      if (anIMG.attr("src")) {
        if (anIMG.attr("src").match("dna/DNA")) {
          if (!window.parentDNA) {
            window.parentDNA = [];
          }
          window.parentDNA.push({
            Name: $(aParent).find("span[itemprop='name']").text(),
            IMG: $(aParent.nextElementSibling),
          });
          aParent.setAttribute("data-dna", $(aParent).find("span[itemprop='name']").text());
        }
      }
    }
  });

  if (dparents.length > 0) {
    const ofNode2 = $("#parentsHeader")
      .parent()
      .contents()
      .filter(function () {
        return this.textContent.match(/(father)|(mother) unknown/);
      });
    list2ol(dparents, "parentList");
    if ($("#parentList li").length) {
      if ($("#parentList")[0].previousSibling) {
        if ($("#parentList")[0].previousSibling.textContent == "\nand\n") {
          $("#parentList")[0].previousSibling.remove();
        }
      }
      let pWord;
      if (ofNode2.length) {
        ofNode2.each(function () {
          if ($(this).text().match("mother")) {
            pWord = "mother";
          } else {
            pWord = "father";
          }
          const fUnknown = $("<li>[" + pWord + " unknown]</li>");
          if (pWord == "father") {
            fUnknown.prependTo($("#parentList"));
          } else {
            fUnknown.appendTo($("#parentList"));
          }
          $(this).remove();
        });
      }
    }
  } else {
    $("<ol id='parentList' class='nameList'></ol>").appendTo($("#Parents"));
    if ($("#parentList").length) {
      if ($("#parentList")[0].previousSibling.textContent == "\nand\n") {
        $("#parentList")[0].previousSibling.remove();
      }
      if ($("#parentList")[0].previousSibling.previousSibling.textContent == "\nand\n") {
        $("#parentList")[0].previousSibling.previousSibling.remove();
      }
    }
  }

  if ($("#Parents").length) {
    const parentsNodes = $("#Parents")[0].childNodes;
    parentsNodes.forEach(function (aNode) {
      if (aNode.textContent.trim() == noParentsPublic.trim()) {
        aNode.remove();
        $("<li id='fatherUnknown'>[father unknown]</li><li id='motherUnknown'>[mother unknown]</li>").appendTo(
          $("#parentList")
        );
      } else if (aNode.textContent.match(noFatherPublic)) {
        aNode.remove();
        $("<li id='fatherUnknown'>[father unknown]</li>").prependTo($("#parentList"));
      }
    });
    if (dparentsText.match(noMotherPublic)) {
      $("<li id='motherUnknown'>[mother unknown]</li>").appendTo($("#parentList"));
    }
  }

  let sibs = document.querySelectorAll('#nVitals span[itemprop="sibling"]');
  if (sibs.length > 0) {
    list2ol(sibs, "siblingList");
    sibs = document.querySelectorAll('#nVitals span[itemprop="sibling"]');
  } else {
    let siblingVITALS = nVitals.find(
      ".VITALS:contains(sibling),.VITALS:contains(Sibling),.VITALS:contains(brothers),.VITALS:contains(brother),.VITALS:contains(sister)"
    );
    siblingVITALS.attr("id", "Siblings");
    $("<ol id='siblingList' class='nameList'></ol>").appendTo($("#Siblings"));
  }
  // console.log("Siblings:", sibs);

  const noSiblingsPublic = "[brothers or sisters?]";
  if ($("#Siblings").length) {
    let sNodes = $("#Siblings")[0].childNodes;
    sNodes.forEach(function (aNode) {
      if (aNode.textContent == noSiblingsPublic && aNode.nodeType == 3) {
        aNode.remove();
        let sibsUnknown = $("<li id='siblingsUnknown'>[sibling(s) unknown]</li>");
        $("#siblingList").append(sibsUnknown);
        let sibWord;
        if ($("meta[content='male']").length) {
          sibWord = "Brother";
        } else if ($("meta[content='female']").length) {
          sibWord = "Sister";
        } else {
          sibWord = "Sibling";
        }
        if ($("#siblingsHeader").length == 0) {
          let sibHeader = $(
            `<span id="siblingsHeader" class="clickable" data-replace-text="Siblings: " data-this-text="${sibWord} of " data-alt-text="Siblings: " data-original-text="${sibWord} of ">${sibWord} of </span>`
          );
          $(sibHeader).prependTo($("#Siblings"));
          $("#siblingsHeader").on("click", function () {
            changeFamilyHeaders();
          });
        }
      }
    });
  }

  const kids = document.querySelectorAll('#nVitals span[itemprop="children"]');
  if (kids.length > 0) {
    list2ol(kids, "childrenList");
  }

  addHalfsStyle();
  setUpMarriedOrSpouse();
  prepareHeadingsForVertical();
  extraBitsForVerticalFamilyLists();
  //spouseToSpouses();

  if (addSibling.length) {
    let asib = $(addSibling);
    $("#siblingList").append($("<li id='addSibling' class='x-edit'></li>"));
    $("#addSibling").append(asib);
    if ($("li:contains('[siblings unknown]')").length) {
      $("li:contains('[siblings unknown]')").remove();
    }
  }

  if (spouseQ.length) {
    $(spouseQ).addClass("addSpouse");
    let noSpouseSpan = $("<span id='spousesUnknown'></span>");
    if ($("#spouseDetails").length == 0) {
      let spouseDetails = $(
        '<div class="VITALS familyList" id="spouseDetails" data-family-vitals="1" style="display: block;"></div>'
      );
      if ($("#Children").length) {
        spouseDetails.insertBefore($("#Children"));
      }
    }
    if ($("a.addSpouse").length == 0) {
      $(spouseQ).appendTo(noSpouseSpan);
      noSpouseSpan.appendTo($("#spouseDetails"));
    }
  }
  //$(".aSpouse").prependTo($("#spouseDetails"));
  if (addChild.length) {
    let ac = $(addChild);
    $("#childrenList").append($("<li id='addChild' class='x-edit'></li>"));
    $("#addChild").append(ac);
    if ($("li:contains('[children unknown]')").length) {
      $("li:contains('[children unknown]')").remove();
    }
  }
  if (motherQ.length) {
    let mq = $(motherQ);
    $("#parentList").append($("<li id='motherQ' class='x-edit'></li>"));
    $("#motherQ").append(mq);
    if ($("li:contains('[mother unknown]')").length) {
      $("li:contains('[mother unknown]')").remove();
    }
  }
  if (fatherQ.length) {
    let fq = $(fatherQ);
    $("#parentList").prepend($("<li id='fatherQ' class='x-edit'></li>"));
    $("#fatherQ").append(fq);
    if ($("li:contains('[father unknown]')").length) {
      $("li:contains('[father unknown]')").remove();
    }
  }

  if ($("#childrenList li").length) {
    let checkParent = "mother";
    const parentIDs = [];
    if ($(".aSpouse").length) {
      if ($(".aSpouse").data("gender") == "male") {
        checkParent = "father";
      }
    }
    $("#childrenList li").each(function () {
      const parentID = $(this).data(checkParent);
      if (!parentIDs.includes(parentID)) {
        parentIDs.push(parentID);
      }
    });
    if (parentIDs.length > 1 || $(".aSpouse").length > 1) {
      $(".aSpouse").each(function (index) {
        let spouseID = $(this).data("id");
        // let aSpouse = $(this);
        $("#childrenList li").each(function () {
          if ($(this).data("mother") == spouseID || $(this).data("father") == spouseID) {
            $(this).addClass("spouse_" + (parseInt(index) + 1));
            // aSpouse.addClass("spouse_" + (parseInt(index) + 1));
          }
        });
      });
    }
  }
}

function getApproxBirthDate(person) {
  let bDate = person?.BirthDate || "";
  if (isOK(bDate)) {
    bDate = getApproxDate(bDate);
    if (typeof bDate === "object" && bDate !== null) {
      bDate.Approx ||= person?.DataStatus?.BirthDate != "certain" && person?.DataStatus?.BirthDate != "";
    }
  }
  return bDate;
}

function findPerson(dWId) {
  const wtId = dWId.replaceAll(" ", "_");
  let dPeep = window.peopleByWtID.get(wtId);
  if (dPeep) {
    return dPeep;
  }

  const linkElement = $('ul.profile-tabs a[href*="Special:TrustedList"]');
  if (linkElement.length > 0) {
    for (const peep of window.people.values()) {
      if (peep.Id) {
        const href = linkElement.attr("href");
        const regex = /u=(\d+)/;
        const match = href.match(regex);

        if (match) {
          const uValue = match[1];
          if (uValue == peep.Id) {
            dPeep = peep;
            const changesTabElement = $('ul.profile-tabs a[href*="Special:NetworkFeed"]');
            const href2 = changesTabElement.attr("href");
            const regex2 = /who=(.+)/;
            const match2 = href2.match(regex2);
            if (match2) {
              dPeep.Name = match2[1];
              dPeep.FirstName = $("span[itemprop='givenName']").text();
              dPeep.LastNameAtBirth = $("span[itemprop='familyName']").text();
              dPeep.LastNameCurrent = $("a[title='Current Last Name']").text();
              dPeep.LastNameAtBirth = $("a[title='Last Name at Birth']").text();
              dPeep.BirthDate = $("time[itemprop='birthDate']").attr("datetime");
              dPeep.DeathDate = $("time[itemprop='deathDate']").attr("datetime");
              dPeep.Gender = "";
            }
            break;
          }
        }
      }
    }
  }
  return dPeep;
}

function list2ol(items, olid) {
  // console.log("list2ol", items, olid);
  const addAges = (options.parentAges && olid == "parentList") || (options.ageDifferences && olid != "parentList");
  const nList = document.createElement("ol");
  nList.id = olid;
  nList.className = "nameList";
  if (addAges) {
    nList.classList.add("hasRelAge");
  }

  items[0].parentNode.insertBefore(nList, items[0]);
  const pagePerson = getPerson(profilePerson.Id);
  let isPrivate = false;
  if (!pagePerson?.Name) {
    isPrivate = true;
  }
  let profileFirstName = null;
  let profileApproxBirthDate = null;
  if (addAges) {
    profileFirstName = pagePerson?.FirstName || pagePerson?.BirthNamePrivate || "this profile person";
    profileApproxBirthDate = getApproxBirthDate(pagePerson);
  }

  items.forEach(function (item) {
    var dHalf;
    let nLi = document.createElement("li");
    let dNext = item.nextSibling;
    if (dNext) {
      if (dNext.nodeType == 3) {
        if (dNext.textContent.match("private")) {
          let removedAnd = (dNext.textContent = dNext.textContent.replace(" and ", ""));
          let ip = olid.replace(/list/i, "");
          let nSpan = $("<span itemprop='" + ip + "' class='" + ip + "'>" + removedAnd + "</span>");
          nSpan.append($(dNext.nextSibling));
          let nLi2 = $("<li></li>");
          $(nLi2).append(nSpan);
          $(nList).append(nLi2);
        } else {
          item.parentNode.removeChild(item.nextSibling);
        }
      }
    }
    if (item.nextSibling != null) {
      if (item.nextSibling.textContent == "[half]") {
        dHalf = item.nextSibling.cloneNode(true);
        item.parentNode.removeChild(item.nextSibling);
        item.parentNode.removeChild(item.nextSibling);
      }
    }
    let oGender = gender(item.firstChild.textContent);
    if (item.getAttribute("data-private")) {
      if (oGender != null) {
        nLi.setAttribute("data-gender", oGender);
        if (olid == "parentList") {
          nLi.setAttribute("aria-label", oGender == "Male" ? "Father" : "Mother");
        }
        if (olid == "siblingList") {
          nLi.setAttribute("aria-label", oGender == "Male" ? "Brother" : oGender == "Female" ? "Sister" : "Sibling");
        }
        if (olid == "childrenList") {
          nLi.setAttribute("aria-label", oGender == "Male" ? "Son" : oGender == "Daughter" ? "Daughter" : "Child");
        }
      }
    }

    oGender = "";

    nLi.appendChild(item);
    if (typeof dHalf != "undefined") {
      dHalf.textContent = " [half]";
      dHalf.className = "half";
      nLi.appendChild(dHalf);
    }

    if (item.getAttribute("data-dna")) {
      window.parentDNA.forEach(function (anIMG) {
        if (anIMG.Name == item.textContent) {
          nLi.append(anIMG.IMG[0]);
        }
      });
    }
    nList.appendChild(nLi);

    let dLink = item.querySelector("a");
    if (dLink != "undefined" && dLink != null) {
      let dhref = dLink.href;
      dLink.href = dLink.href.replace(/\s|%20/g, "_");
      let dbits = dhref.split("wiki/");

      let dWId = decodeURIComponent(dbits[1].replace(/#.*/, ""));
      let dPeep = findPerson(dWId);
      if (dPeep && !isPrivate) {
        addDataToPerson($(dLink).closest("li"), dPeep);
        list2ol2(dPeep, profileFirstName, profileApproxBirthDate);
      }
    }
  });

  /*
  while (nList.nextSibling) {
    console.log(nList.nextSibling);
    nList.parentNode.removeChild(nList.nextSibling);
  }
    */

  window.inserted = false;
  if (!isPrivate && $("li#profilePerson").length == 0) {
    window.insertInterval = setInterval(insertInSibList, 2000);
  }
  window.triedInsertSib = 0;
}

function list2ol2(person, profPersonName, profileApproxBirthDate) {
  // console.log("list2ol2", person, profPersonName, profileApproxBirthDate);
  let pdata = person;
  let dob, dod, doby, dody;
  let dobStatus = "";
  let dodStatus = "";
  if (pdata != null && pdata != undefined) {
    if (typeof pdata?.["BirthDate"] != "undefined") {
      dob = pdata["BirthDate"];
      dobStatus = "";
      if (pdata.DataStatus) {
        dobStatus = status2symbol(pdata?.DataStatus?.BirthDate);
      }
    } else {
      dob = "";
    }
    if (typeof pdata["DeathDate"] != "undefined") {
      dod = pdata["DeathDate"];
      dodStatus = status2symbol(pdata["DataStatus"]["DeathDate"]);
    } else {
      dod = "";
    }

    if (isOK(dob)) {
      doby = dobStatus + dob.split("-")[0];
      if (doby.replace(/[~<>]/, "") == "0000") {
        doby = "   ";
      }
    } else {
      doby = " ";
      var disGender;
      const disID = htmlEntities(pdata["Name"]);

      if (disID) {
        const disLink = document.querySelector(`#nVitals a[href$="/wiki/${disID}"`);

        if (isOK(disLink)) {
          const disTitle = disLink.title;

          const regex1 = /(Daughter)|(Sister)|(Mother)|(Wife)/g;
          const female = disTitle.match(regex1);
          const regex2 = /(\bSon\b)|(\bBrother\b)|(\bFather\b)|(\bHusband\b)/g;
          const male = disTitle.match(regex2);
          if (female == null && male != null) {
            disGender = "male";
          } else if (female != null && male == null) {
            disGender = "female";
          } else {
            disGender = "";
          }

          let dLi = disLink.parentNode.parentNode;
          dLi.setAttribute("data-gender", disGender);

          const regex3 = /[0-9]{4}/g;
          const dobycheck = disTitle.match(regex3);
          if (dobycheck == null) {
            doby = " ";
          } else {
            doby = dobycheck[0];
            dody = "   ";
          }
        }
      }
    }
    if (isOK(dod)) {
      dody = dodStatus + dod.split("-")[0];
      if (dody.replace(/[~<>]/, "") == "0000") {
        dody = "   ";
      }
    } else {
      dody = " ";
    }
    if (isOK(doby)) {
      if (doby.trim() == "") {
        if (person.BirthDateDecade) {
          if (isOK(person.BirthDateDecade)) {
            doby = person.BirthDateDecade;
          }
        }
      }
    }
    if (isOK(dody)) {
      if (dody.trim() == "") {
        if (person.DeathDateDecade) {
          if (isOK(person.DeathDateDecade)) {
            dody = person.DeathDateDecade;
          }
        }
      }
    }
    let ddates = "";
    if (doby != " " || dody != " ") {
      ddates = "(" + doby + " - " + dody + ")";
    } else {
      ddates = "";
    }
    if (typeof ddates == "undefined") {
      ddates = "";
    }

    const datesSpan = document.createElement("span");
    datesSpan.className = "bdDates";
    datesSpan.setAttribute("data-birth-year", doby);
    datesSpan.setAttribute("data-death-year", dody);
    const ddn = document.createTextNode(" " + ddates);
    datesSpan.appendChild(ddn);
    const checkit = encodeURIComponent(pdata["Name"]).replaceAll(/%2C/g, ",");
    const ana = document.querySelector(`#nVitals a[href$="/wiki/${checkit}"`);
    if (ana) {
      if (profPersonName && profileApproxBirthDate != "" && isOK(pdata["BirthDate"])) {
        addRelativeAge(ana, profPersonName, profileApproxBirthDate, pdata["BirthDate"]);
      }
      ana.after(datesSpan);
      if (typeof pdata["Gender"] != "undefined") {
        if (pdata["Gender"] == "Male") {
          ana.parentNode.parentNode.setAttribute("data-gender", "male");
        } else if (pdata["Gender"] == "Female") {
          ana.parentNode.parentNode.setAttribute("data-gender", "female");
        }

        if (pdata["Gender"] == "" || pdata.DataStatus.Gender == "blank") {
          ana.parentNode.parentNode.setAttribute("data-gender", "");
        }
      }
    }
    // console.log(pdata, ana);

    addAriaLabel(pdata, ana);
  }
}

function addRelativeAge(ana, profPersonName, profileApproxBirthDate, relativesBirthDate) {
  const relType = ana.parentNode.getAttribute("itemprop");
  const pName = ana.querySelector("span[itemprop='name']").innerText;
  const ageAt = getAgeAt(profileApproxBirthDate, getApproxDate(relativesBirthDate), relType);
  const theYearStr = ageStr(ageAt);
  const ageSpan = document.createElement("span");
  ageSpan.classList.add("relAge");
  ageSpan.appendChild(
    document.createTextNode(ageAt.number == "?" ? "" : ` (${ageAt.approx}${ageAt.sign}${ageAt.number})`)
  );
  let titleText;
  if (relType == "parent") {
    titleText = `${pName} was ${theYearStr} when ${profPersonName} was born`;
  } else {
    let yearWords = "";
    if (theYearStr == 0) {
      yearWords = "in the same year as";
    } else {
      yearWords = `${theYearStr} year${Math.abs(ageAt.number) == 1 ? "" : "s"} ${
        ageAt.sign == "-" ? "before" : "after"
      }`;
    }
    titleText = `${pName} was born ${yearWords} ${profPersonName}`;
  }
  ageSpan.setAttribute("title", titleText);
  ana.after(ageSpan);
  return ageSpan;
}

function ageStr(a) {
  return `${a.approx == "" ? "" : "about "}${a.number}`;
}

function getWtId(link) {
  let wtId = "";
  let href = link.getAttribute("href");
  if (href !== null) {
    const id = href.split("wiki/")[1];
    if (id != "") {
      wtId = decodeURIComponent(id.replace(/#.*/, ""));
    }
  }
  return wtId;
}

function getAgeAt(profPersonBirthDate, relativesBirthDate, relation) {
  if (profPersonBirthDate == "0000-00-00") {
    return { approx: "", sign: "", number: "?" };
  }
  let approx = "";
  if (profPersonBirthDate.Approx == true || relativesBirthDate.Approx == true) {
    approx = "~";
  }
  const dt1 = relativesBirthDate.Date;
  const dt2 = profPersonBirthDate.Date;
  const showYearsSince = relation != "parent";
  let diff;
  let sign = "";
  if (showYearsSince) {
    // we'll always return a positive number
    const yearsSince = getAge(dt2, dt1);
    diff = yearsSince[0];
    if (diff > 0) {
      sign = "+";
    } else if (diff < 0) {
      sign = "-";
      diff = -diff;
    }
  } else {
    // parents should always be older than their child, so we assume positive,
    // but if it is not, then we'll just show it as is (i.e. we return a negative number).
    const ageAt = getAge(dt1, dt2);
    diff = ageAt[0];
  }
  return { approx: approx, sign: sign, number: diff };
}

function addRelativeAges(person) {
  // Either parents, or siblings and children, or all should get ages
  const profileApproxBirthDate = getApproxBirthDate(person);
  const profPersonName = person?.FirstName || person?.BirthNamePrivate || "the person of the current profile";
  let selector = "#nVitals a[href^='/wiki/']"; // assume everyone
  if (!options.parentAges) {
    // siblings and children only
    selector =
      "#nVitals span[itemprop='sibling'] a[href^='/wiki/'], #nVitals span[itemprop='children'] a[href^='/wiki/']";
  } else if (!options.ageDifferences) {
    // parents only
    selector = "#nVitals span[itemprop='parent'] a[href^='/wiki/']";
  }
  document.querySelectorAll(selector).forEach((ana) => {
    const wtId = getWtId(ana);
    if (wtId != "") {
      const relative = findPerson(wtId);
      const relativesBirthDate = relative ? relative?.["BirthDate"] : null;
      if (isOK(relativesBirthDate)) {
        addRelativeAge(ana, profPersonName, profileApproxBirthDate, relativesBirthDate);
      }
    }
  });
}

function textNodesUnder(el) {
  var n,
    a = [],
    walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
  while ((n = walk.nextNode())) a.push(n);
  return a;
}

async function addChildrenCount() {
  if ($("#childrenCount").length == 0) {
    const siblingLength = $("#nVitals .VITALS span[itemprop='sibling']").length;
    $("#Siblings").append($("<span id='siblingCount'>[" + siblingLength + "]</span>"));

    const childrenLength = $("#nVitals .VITALS span[itemprop='children']").length;
    $("#Children").append($("<span id='childrenCount'>[" + childrenLength + "]</span>"));
  }
}

// This is only called if we don't have vertical lists.
// Put each family list heading into a clickable familyListHeading span and
// add data attributes for the text replacement.
// This is similar to prepareHeadingsForVertical and we can probably create only one function,
// but then their calling locations should change since prepareHeadingsForVertical is only called
// after the lists have already been made vertical, so different searches would apply.
async function prepareHeadingsForNonVertical() {
  $(".VITALS").each(function () {
    let textNodes = textNodesUnder($(this)[0]);

    textNodes.forEach(function (aNode, index) {
      let n1 = aNode;
      let n2 = textNodes[index + 1] || { textContent: "" }; // Prevent errors if no next node
      let pNode = n1.parentNode;
      const regex = /(\bSon\b|\bDaughter\b|\bBrother\b|\bSister\b|\bHusband\b|\bWife\b|\bFather\b|\bMother\b)(\sof)?/;
      let ofMatch = n1.textContent.match("of");
      let regexMatch = n1.textContent.match(regex);
      let wrongMatch = false;

      if (regexMatch && !ofMatch && !/\bof\b/.test(n2.textContent)) {
        wrongMatch = true;
      }

      if (regexMatch && !wrongMatch) {
        // Create a new clickable span
        const clickable = $("<span class='clickable familyListHeading'></span>");
        clickable.text(regexMatch[0].replace(" of", "") + " of ");

        // Replace the text node with the clickable span (instead of appending/prepending)
        $(n1).replaceWith(clickable);

        // Handle the "of" cleanup in the next node
        if ([" of ", " of\n"].includes(n2.textContent)) {
          pNode.removeChild(n2);
        } else if (n2.textContent.match(" of ")) {
          n2.textContent = n2.textContent.replace(" of ", " ");
        }
      }
    });
  });

  // Assign headers and text replacements
  $(".familyListHeading").each(function () {
    const $this = $(this);
    const id = $this.parent().attr("id");
    let altText;
    let thisID;
    let thisClass;

    if (id == "Parents") {
      altText = "Parents: ";
      thisID = "parentsHeader";
    }
    if (id == "Siblings") {
      altText = "Siblings: ";
      thisID = "siblingsHeader";
    }
    if (id == "Spouses") {
      altText = "Spouse: ";
      thisClass = "spouseText";
    }
    if (id == "Children") {
      altText = "Children: ";
      thisID = "childrenHeader";
    }

    if (thisClass) {
      $this.addClass(thisClass);
    }
    if (thisID) {
      $this.prop("id", thisID);
    }

    $this
      .attr("data-original-text", $this.text())
      .attr("data-this-text", $this.text())
      .attr("data-replace-text", altText)
      .attr("data-alt-text", altText)
      .on("click", function () {
        changeFamilyHeaders();
      });
  });
}

function createPrivateAndDates(aNode, nextSib, ip) {
  let nSpan = document.createElement("span");
  nSpan.setAttribute("itemprop", ip);
  nSpan.setAttribute("data-private", "1");
  $(nSpan).addClass(ip);
  let nText = aNode.textContent.replace(/.*\[/, "[");
  nText = nText.replace(/((Brother)|(Sister))\sof\s/, "");
  nText = nText + "]";
  nText = nText.replace(/\s\]/, "]");
  nSpan.appendChild(document.createTextNode(nText));
  let dBDdates = aNode.nextSibling;
  if (dBDdates) {
    dBDdates.className = "bdDates";
    dBDdates.textContent = dBDdates.textContent.replace("unknown", " ");
    dBDdates.setAttribute("data-birth-year", "");
    dBDdates.setAttribute("data-death-year", "");
    nSpan.appendChild(aNode.nextSibling);
  }
  return nSpan;
}

function fixPrivates(thing1, thing2) {
  const ds = document.querySelectorAll(`#familyVitals .VITALS span[title^='${thing1}\\b']`);
  ds.forEach(function (aSpan) {
    $(aSpan).attr("itemprop", thing2);
    const oTextNodes = textNodesUnder(aSpan);
    oTextNodes.forEach(function (aTextNode) {
      if (aTextNode.textContent.match(/\[.+\s$/)) {
        aTextNode.textContent = aTextNode.textContent.replace(/\s$/, "]");
      }
      if (aTextNode.textContent == "]") {
        aSpan.removeChild(aTextNode);
      }
    });
    const aSmall = $(aSpan).find("small");
    $(aSpan).append(aSmall);
  });
}

function gender(drel) {
  const rgx1 = /(father)|(brother)|(son)/g;
  const rgx2 = /(mother)|(sister)|(daughter)/g;

  if (drel.match(rgx1) != null) {
    return "male";
  } else if (drel.match(rgx2) != null) {
    return "female";
  }

  const males = ["father", "brother", "son"];
  const females = ["mother", "sister", "daughter"];
  if (males.includes(drel)) {
    return "male";
  } else if (females.includes(drel)) {
    return "female";
  }
  return null;
}

function insertInSibList() {
  window.triedInsertSib++;
  if ($("li#profilePerson,span a.activeProfile").length) {
    clearInterval(window.insertInterval);
    return;
  }

  if (!window.people || window.inserted) return;

  //console.log(window.people);

  const pPerson = getPerson(profilePerson.Id);
  if (!pPerson) return;

  // Extract birth year from JSON data
  const getBirthYear = (person) => {
    if (person.BirthDate && person.BirthDate !== "0000-00-00") {
      return parseInt(person.BirthDate.split("-")[0]);
    } else if (person.BirthDateDecade) {
      return parseInt(person.BirthDateDecade.replace("s", "")) + 5; // Mid-decade assumption
    }
    return null;
  };

  const birthYear = getBirthYear(pPerson);
  const deathYear =
    pPerson.DeathDate && pPerson.DeathDate !== "0000-00-00"
      ? parseInt(pPerson.DeathDate.split("-")[0])
      : pPerson.DeathDateDecade
      ? parseInt(pPerson.DeathDateDecade.replace("s", "")) + 5
      : null;

  //console.log(`Profile Person: ${pPerson.Name}, Birth Year: ${birthYear}, Death Year: ${deathYear}`);

  // Create the profile person list item
  let inserter = $(`
      <span itemprop="sibling" itemtype="http://schema.org/Person" data-private="0">
        <a href="#n" class="activeProfile" data-wtid="${pPerson.Name}">${displayName(pPerson)[0]}</a>
        <span class="bdDates" data-birth-year="${birthYear || ""}" data-death-year="${deathYear || ""}">
          ${displayDates(pPerson)}
        </span>
      </span>
  `);

  const profilePersonLi = $("<li id='profilePerson'></li>");
  let elToFind = "#Siblings li";
  let closestEl = "li";
  if (options.verticalLists) {
    profilePersonLi.append(inserter);
    inserter = profilePersonLi;
  } else {
    elToFind = "#Siblings span[itemprop='sibling']";
    closestEl = "span[itemprop='sibling']";
  }

  // Retrieve and sort siblings from `window.people`
  let siblingList = [...window.people.values()]
    .filter((p) => p.Id !== pPerson.Id) // Exclude profile person
    .map((p) => ({
      element: $(`${elToFind} a[href$="${p.Name}"]`).closest(closestEl),
      birthYear: getBirthYear(p),
      id: p.Id,
    }))
    .filter((p) => p.element.length) // Only include existing elements
    .sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999)); // Sort by birth year (unknowns go last)

  // Insert profile person in correct chronological order
  let inserted = false;
  for (let i = 0; i < siblingList.length; i++) {
    if (birthYear !== null && birthYear < siblingList[i].birthYear) {
      inserter.insertBefore(siblingList[i].element);
      inserted = true;
      break;
    }
  }

  // If no earlier sibling was found, append to the end
  if (!inserted) {
    $("#siblingList").append(inserter);
  }

  // Add parent class if applicable
  if ($(".parent_1").length) $("#profilePerson span[itemprop='sibling']").addClass("parent_1");
  if ($(".parent_2").length) $("#profilePerson").addClass("parent_2");

  // Set gender attributes
  if (pPerson?.Gender) {
    let genderLabel = pPerson.Gender === "Male" ? "male" : pPerson.Gender === "Female" ? "female" : "";
    let ariaLabel = genderLabel ? `profile person (${genderLabel})` : "profile person";

    $("#profilePerson").attr("data-gender", genderLabel).attr("aria-label", ariaLabel);
  }

  // Move the "Add Sibling" link to the end
  $("#addSibling").appendTo($("#addSibling").parent());

  // Stop retrying after 9 attempts
  if (window.triedInsertSib > 9) {
    clearInterval(window.insertInterval);
    //console.log("Cleared interval after 9 tries");
  }
}

function setUpMarriedOrSpouse() {
  if ($("#nVitals .VITALS div.aSpouse").length) {
    let spousess;
    if ($(".aSpouse").length > 1) {
      spousess = "s";
    } else {
      spousess = "";
    }
    document.querySelectorAll("#nVitals .VITALS span[itemprop='spouse']").forEach(function (spouseElement) {
      let parentElement = spouseElement.parentElement;
      let spouseText = parentElement.firstChild.textContent.trim();
      let newAnchor = document.createElement("a");
      newAnchor.classList.add("spouseText");
      newAnchor.setAttribute("data-alt-text", "Spouse" + spousess + ": ");
      newAnchor.setAttribute("data-original-text", spouseText + " ");
      newAnchor.setAttribute("data-this-text", spouseText + " ");
      newAnchor.setAttribute("data-replace-text", "Spouse" + spousess + ": ");
      newAnchor.setAttribute("data-alt-text", "Spouse" + spousess + ": ");
      newAnchor.innerText = spouseText + " ";
      parentElement.insertBefore(newAnchor, spouseElement);
      parentElement.removeChild(parentElement.firstChild);
    });

    if ($(".spouseText").length == 0) {
      $(".aSpouse").each(function () {
        let spouseNode = $(this)
          .contents()
          .filter(function () {
            return this.textContent.match(/^(Husband)|(Wife) of(.*)/);
          });

        if (spouseNode.length) {
          let spouseTextParts = spouseNode[0].textContent.split("\n");
          let replaceText = "Spouse: ";
          let originalText = spouseTextParts[0];
          let spouseText = $(
            `<a class='spouseText' data-alt-text='Spouse: ' data-original-text='${spouseTextParts[0]}' data-replace='${replaceText}' data-text='${originalText} '>${originalText} </a>`
          );
          spouseNode.replaceWith(spouseText);
          spouseText.after($(document.createTextNode(spouseTextParts[1])));
        }
      });
    }

    if (options.agesAtMarriages) {
      addMarriageAges();
    }

    //$(".spouseText").eq(0).prependTo("#spouseDetails");
    $(".spouseText").on("click", function () {
      changeFamilyHeaders();
    });
    spouseToSpouses();
  }
}

function extraBitsForVerticalFamilyLists() {
  let noSiblingsPublic = "[brothers or sisters?]";
  let privateSibsUnknown = $("#nVitals #Siblings").find("a.BLANK");
  let noSpouseSpan = $("<span id='spousesUnknown'></span>");
  if (privateSibsUnknown.length) {
    let sibsUnknown = $("<span id='siblingsUnknown'></span>");
    sibsUnknown.append(privateSibsUnknown);
    const s = $("#nVitals #Siblings");
    sibsUnknown.appendTo(s);
    $("#nVitals > .sidebar-heading").prependTo("#nVitals"); // make sure the heading is still at the top
  } else if ($("#nVitals #Siblings").length) {
    let sNodes = $("#Siblings")[0].childNodes;
    sNodes.forEach(function (aNode) {
      if (aNode.textContent == noSiblingsPublic && aNode.nodeType == 3) {
        aNode.remove();
        let sibsUnknown = $("<li id='siblingsUnknown'>[sibling(s) unknown]</li>");
        if ($("#siblingList").length == 0) {
          sibsUnknown = $("<span id='siblingsUnknown'> [sibling(s) unknown]</span>");
          $("#Siblings").append(sibsUnknown);
        }

        $("#siblingList").append(sibsUnknown);
        let sibWord;
        if ($("meta[content='male']").length) {
          sibWord = "Brother ";
        } else if ($("meta[content='female']").length) {
          sibWord = "Sister ";
        } else {
          sibWord = "Sibling ";
        }

        if ($("#siblingsHeader").length == 0) {
          let sibHeader = $(
            '<span id="siblingsHeader" class="clickable" data-replace-text="' +
              sibWord +
              ' of" data-this-text="Siblings: " data-alt-text="Siblings: " data-original-text="' +
              sibWord +
              ' of">Siblings: </span>'
          );
          $(sibHeader).prependTo($("#Siblings"));
        }
      }
    });
  }

  let noChildrenPublic = "[children unknown]";
  let childrenVITALS = FAMILY_VITALS.find(".VITALS:contains(children)");
  let noChildrenVITALS = FAMILY_VITALS.find(".VITALS:contains('[children unknown]')");
  childrenVITALS.attr("id", "Children");
  if ($("#Children").length && noChildrenVITALS.length) {
    let noKids = childrenVITALS.contents().filter(function () {
      return this.textContent == noChildrenPublic;
    });
    let noKidsSpan = $("<span id='childrenUnknown'></span>");
    noKidsSpan.appendTo($("#Children"));
    $("#childrenUnknown").append($(noKids));
  }

  let noSpousePublic = "[spouse(s) unknown]";
  let noSpousePrivate = "[spouse?]";
  //let spouseVITALS = FAMILY_VITALS.find(".VITALS.spouseDetails");
  //spouseVITALS.addClass("aSpouse");
  if ($("#nVitals .aSpouse").length) {
    $("#nVitals .aSpouse").each(function () {
      let noSpouse = $(this)
        .contents()
        .filter(function () {
          return this.textContent == noSpousePublic;
        });
      if (noSpouse.length == 0) {
        noSpouse = $(this)
          .contents()
          .filter(function () {
            return this.textContent == noSpousePrivate;
          });
      }

      if (noSpouse.length) {
        noSpouseSpan.appendTo($(this));
        $("#spousesUnknown").append($(noSpouse));
        $("#spouseDetails").insertAfter($("#Siblings"));
        if ($("#spouseDetails").length == 0) {
          if ($("#Siblings").length == 0) {
            $("<div class='VITALS' id='spouseDetails'></div>").insertAfter($("#Parents"));
          } else {
            $("<div class='VITALS' id='spouseDetails'></div>").insertAfter($("#Siblings"));
          }
        }
      }
      //$(this).appendTo($("#spouseDetails"));
    });
  } else if (FAMILY_VITALS.find(".VITALS:contains([spouse(s) unknown])").length) {
    let noSpouse = FAMILY_VITALS.find(".VITALS:contains([spouse(s) unknown])")
      .contents()
      .filter(function () {
        return this.textContent == noSpousePublic;
      });
    let noSpouseSpan = $("<span id='spousesUnknown'></span>");
    noSpouseSpan.appendTo(FAMILY_VITALS.find(".VITALS:contains([spouse(s) unknown])"));
    $("#spousesUnknown").append($(noSpouse));
    if ($("#spouseDetails").length == 0) {
      let spouseDetails = $(
        '<div class="VITALS familyList" id="spouseDetails" data-family-vitals="1" style="display: block;"></div>'
      );
      if ($("#Siblings").length) {
        spouseDetails.insertAfter($("#Siblings"));
      } else if ($("#Parents").length) {
        spouseDetails.insertAfter($("#Parents"));
      }
    }
    noSpouseSpan.appendTo($("#spouseDetails"));
  } else if ($("a:contains([spouse?])").length) {
    noSpouseSpan = $("<span id='spousesUnknown'></span>");
    if ($("#spouseDetails").length == 0) {
      let spouseDetails = $(
        '<div class="VITALS familyList" id="spouseDetails" data-family-vitals="1" style="display: block;"></div>'
      );
      if ($("#Siblings").length) {
        spouseDetails.insertAfter($("#Siblings"));
      } else if ($("#Parents").length) {
        spouseDetails.insertAfter($("#Parents"));
      }
    }
    noSpouseSpan.appendTo($("#spouseDetails"));
    //$("a:contains([spouse?])").appendTo(noSpouseSpan);
  }
  $("#Children").insertAfter($("#spouseDetails"));
  $("span:contains(private son),span:contains(private father),span:contains(private brother)")
    .closest("li")
    .attr("data-gender", "male")
    .attr("aria-label", "male");
  $("span:contains(private daughter),span:contains(private sister),span:contains(private mother)")
    .closest("li")
    .attr("data-gender", "female")
    .attr("aria-label", "female");
}

function amaTimer() {
  window.runningAMA++;
  const pagePerson = getPerson(profilePerson.Id);
  if (pagePerson?.Spouses != undefined) {
    window.doneMarriageAges = true;
    const oSpouses = Object.entries(pagePerson.Spouses);
    oSpouses.forEach(function (spouseEntry) {
      const marData = spouseEntry[1];
      const spouse = getPerson(marData.Id);
      if (isOK(marData.MarriageDate)) {
        let profileMarriageAge;
        if (!window.excludeValues.includes(pagePerson.BirthDate)) {
          profileMarriageAge = getMarriageAge(pagePerson.BirthDate, marData.MarriageDate, pagePerson);
        }
        const spouseMarriageAge = getMarriageAge(spouse?.BirthDate, marData.MarriageDate, spouse);
        let profileAgeText = "";
        let spouseAgeText = "";
        if (profileMarriageAge) {
          profileAgeText = pagePerson.FirstName + " (" + profileMarriageAge + ")";
        }
        if (isOK(spouse?.BirthDate)) {
          spouseAgeText = spouse.FirstName + " (" + spouseMarriageAge + ")";
          if (profileMarriageAge) {
            spouseAgeText = "; " + spouseAgeText;
          }
        }
        const marriageDiv = $(`.spouseDetails a[href$="${spouse.Name.replaceAll(/\s/g, "_")}"]`).closest(".aSpouse");

        marriageDiv.append($("<span class='marriageAges'>" + profileAgeText + spouseAgeText + "</span>"));

        const marriageId = "marriage_" + spouseEntry[0];
        const marriageDetails = marriageDiv.find(".marriageDetails");
        // Perform the replacement
        marriageDetails.html(function (index, html) {
          return html.replace(
            "married",
            `<a href="https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=editspouse&s=${spouseEntry[0]}" target="_blank" title="Right click to edit marriage" class="clickable" id="${marriageId}">married</a>`
          );
        });

        // Now wrap the entire content in a single inline-block element due to the CSS grid
        marriageDetails.contents().wrapAll('<div style="inline-block"></div>');
        clearInterval(window.ama);
      }
    });
  }
  if (window.runningAMA > 10 || window.doneMarriageAges == true) {
    clearInterval(window.ama);
  }
}

async function addMarriageAges() {
  window.runningAMA = 0;
  if (window.doneMarriageAges == undefined) {
    window.ama = setInterval(amaTimer, 2000);
    window.doneMarriageAges = false;
  }
}

function getMarriageAge(d1, d2, mPerson) {
  const bDate = getApproxDate(d1);
  const mDate = getApproxDate(d2);
  let approx = "";

  if (
    bDate.Approx == true ||
    mDate.Approx == true ||
    (mPerson?.DataStatus?.BirthDate != "certain" && mPerson?.DataStatus?.BirthDate != "")
  ) {
    approx = "~";
  }
  const dt1 = bDate.Date;
  const dt2 = mDate.Date;
  const ageAtMarriage = getAge(dt1, dt2);
  return approx + ageAtMarriage[0];
}

function getApproxDate(theDate) {
  let approx = false;
  let aDate;

  // If the date is an object, it's already been processed
  if (typeof theDate === "object") {
    return theDate;
  }
  if (theDate.match(/0s$/) != null) {
    aDate = theDate.replace(/0s/, "5");
    approx = true;
  } else {
    const bits = theDate.split("-");
    if (theDate.match(/00-00$/) != null || !bits[1]) {
      aDate = bits[0] + "-07-02";
      approx = true;
    } else if (theDate.match(/-00$/) != null) {
      aDate = bits[0] + "-" + bits[1] + "-" + "16";
      approx = true;
    } else {
      aDate = theDate;
    }
  }
  return { Date: aDate, Approx: approx };
}
/**
 * Calculates the number of full years and days between two dates.
 *
 * @param {(string|Object)} start - The start date as a string in the format "YYYY-MM-DD" or an object with `year`, `month`, and `date` properties.
 * @param {string} [end=false] - The end date as a string in the format "YYYY-MM-DD". Defaults to `false` (i.e., the current date).
 * @returns {([number,number,number]|undefined)} An array of [fullYears,andDays,totalDays] or `undefined` if the input is invalid.
 */
export function getAge(start, end = false) {
  let start_day, start_month, start_year, end_day, end_month, end_year;
  if (typeof start === "object") {
    start_day = parseInt(start.start.date);
    start_month = parseInt(start.start.month);
    start_year = parseInt(start.start.year);
    end_day = parseInt(start.end.date);
    end_month = parseInt(start.end.month);
    end_year = parseInt(start.end.year);
  } else {
    const startSplit = start.split("-");
    start_day = parseInt(startSplit[2]);
    start_month = parseInt(startSplit[1]);
    start_year = parseInt(startSplit[0]);

    const endSplit = end.split("-");
    end_day = parseInt(endSplit[2]);
    end_month = parseInt(endSplit[1]);
    end_year = parseInt(endSplit[0]);
  }

  const month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (isLeapYear(start_year)) {
    month[1] = 29;
  }
  const firstMonthDays = month[start_month - 1] - start_day;

  let restOfYearDays = 0;
  for (let i = start_month; i < 12; i++) {
    restOfYearDays = restOfYearDays + month[i];
  }
  const firstYearDays = firstMonthDays + restOfYearDays;
  let fullYears = end_year - (start_year + 1);
  let lastYearMonthDays = 0;
  if (isLeapYear(end_year)) {
    month[1] = 29;
  } else {
    month[1] = 28;
  }
  for (let i = 0; i < end_month - 1; i++) {
    lastYearMonthDays = lastYearMonthDays + month[i];
  }
  let lastYearDaysTotal = 0;
  lastYearDaysTotal = end_day + lastYearMonthDays;
  let totalExtraDays = lastYearDaysTotal + firstYearDays;
  let andDays;
  if (totalExtraDays > 364) {
    fullYears++;
    let yearDays = 365;
    if (isLeapYear(start_year) && start_month < 3) {
      yearDays++;
    }
    if (isLeapYear(end_year) && end_month > 3) {
      yearDays++;
    }
    andDays = totalExtraDays - yearDays;
  } else {
    andDays = totalExtraDays;

    if (isLeapYear(start_year) && start_month < 3) {
      totalExtraDays--;
    }
    if (isLeapYear(end_year) && end_month > 3) {
      totalExtraDays--;
    }
  }
  const totalDays = Math.round(fullYears * 365.25) + andDays;
  return [fullYears, andDays, totalDays];
}

function isLeapYear(year) {
  return year % 100 === 0 ? year % 400 === 0 : year % 4 === 0;
}

const headingMap = {
  Parents: { "no-gender": "Child of: ", male: "Son of: ", female: "Daughter of: " },
  Siblings: { "no-gender": "Sibling of: ", male: "Brother of: ", female: "Sister of: " },
  Children: { "no-gender": "Parent of: ", male: "Father of: ", female: "Mother of: " },
};

function prepareHeadingsForVertical() {
  const gender = $("#nVitals #Parents").find('meta[itemprop="gender"]').attr("content") || "no-gender";
  const famVitals = $("#nVitals").find(".VITALS");
  if (famVitals.length) {
    famVitals.each(function () {
      const $this = $(this);
      const id = $this.attr("id");

      const h = headingMap[id];
      if (!h) return;

      const altText = `${id}: `;
      const spanId = `${id.toLowerCase()}Header`;

      // Extract the text before the first child element (e.g., "Son of", "Brother of")
      // We find all text nodes before the <ol> element, copy their text and then remove them
      let textContent = "";
      $(this)
        .contents()
        .each(function () {
          if (this.nodeType === 3) {
            textContent += this.nodeValue.trim() + " ";
            $(this).remove(); // Remove the original text node
          }
          if (this.nodeName.toLowerCase() === "ol") {
            return false; // Stop once we reach the <ol> element
          }
        });
      textContent = textContent.trim();

      if (textContent == "") {
        textContent = h[gender] || h["no-gender"];
      }

      // Create the span element
      const span = $("<span>")
        .prop("id", spanId)
        .addClass("clickable familyListHeading")
        .attr("data-original-text", textContent)
        .attr("data-this-text", textContent)
        .attr("data-replace-text", altText)
        .attr("data-alt-text", altText)
        .text(textContent)
        .on("click", function () {
          changeFamilyHeaders();
        });

      // Replace the text node with the new span
      $(this).prepend(span);
    });
  }
}

function status2symbol(ostatus) {
  switch (ostatus) {
    case "guess":
      return "~";
    case "abt":
      return "~";
    case "before":
      return "<";
    case "bef":
      return "<";
    case "after":
      return ">";
    case "aft":
      return ">";
    case "certain":
      return "";
    default:
      return "";
  }
}

function addParentStatus() {
  setTimeout(function () {
    const profileP = getPerson(profilePerson.Id);
    if (profileP) {
      if ($("#parentList li[data-gender='male'] a span:contains([uncertain])").length == 0) {
        if (profileP.DataStatus?.Father == "10") {
          $("#parentList li[data-gender='male'] a").append($("<span class='uncertain dataStatus'>[uncertain]</span>"));
        }
        if (profileP.DataStatus?.Father == "5") {
          $("#parentList li[data-gender='male'] a").append(
            $("<span class='non-biological dataStatus'>[non-biological]</span>")
          );
        }
      }

      if ($("#parentList li[data-gender='female'] a span:contains([uncertain])").length == 0) {
        if (profileP.DataStatus?.Mother == "10") {
          $("#parentList li[data-gender='female'] a").append(
            $("<span class='uncertain  dataStatus'>[uncertain]</span>")
          );
        }
        if (profileP.DataStatus?.Mother == "5") {
          $("#parentList li[data-gender='female'] a").append(
            $("<span class='non-biological  dataStatus'>[non-biological]</span>")
          );
        }
      }
    }
    addDNAstatusToChildren();
  }, 3000);
}

function addDNAstatusToChildren() {
  const parentId = profilePerson.Id;
  if (parentId) {
    $(
      `#childrenList li[data-father="${parentId}"][data-father-status="30"],#childrenList li[data-mother="${parentId}"][data-mother-status="30"]`
    ).append(
      $(
        '<img class="DNAConfirmed" src="/images/icons/dna/DNA-confirmed.gif" border="0" width="38" height="12" alt="DNA confirmed" title="Confirmed with DNA testing">'
      )
    );
  }
}
