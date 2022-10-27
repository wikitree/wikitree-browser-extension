import $ from "jquery";

export let pageProfile = false;
export let pageHelp = false;
export let pageSpecial = false;
export let pageCategory = false;
export let pageTemplate = false;
export let pageSpace = false;
export let pageG2G = false;

if (
  window.location.pathname.match(/(\/wiki\/)\w[^:]*-[0-9]*/g) ||
  window.location.href.match(/\?title\=\w[^:]+-[0-9]+/g)
) {
  // Is a Profile Page
  pageProfile = true;
} else if (window.location.pathname.match(/(\/wiki\/)Help:*/g)) {
  // Is a Help Page
  pageHelp = true;
} else if (window.location.pathname.match(/(\/wiki\/)Special:*/g)) {
  // Is a Special Page
  pageSpecial = true;
} else if (window.location.pathname.match(/(\/wiki\/)Category:*/g)) {
  // Is a Category Page
  pageCategory = true;
} else if (window.location.pathname.match(/(\/wiki\/)Template:*/g)) {
  // Is a Template Page
  pageTemplate = true;
} else if (window.location.pathname.match(/(\/wiki\/)Space:*/g)) {
  // Is a Space Page
  pageSpace = true;
} else if (window.location.pathname.match(/\/g2g\//g)) {
  // Is a G2G page
  pageG2G = true;
}

// Add wte class to body to let WikiTree BEE know not to add the same functions
document.querySelector("body").classList.add("wte");

/**
 * Creates a new menu item in the Apps dropdown menu.
 *
 */
export function createTopMenuItem(options) {
  let title = options.title;
  let name = options.name;
  let id = options.id;
  let url = options.url;

  $("#wte-topMenu").append(`<li>
        <a id="${id}" class="pureCssMenui" title="${title}">${name}</a>
    </li>`);
}

// Add a link to the short list of links below the tabs
export function createProfileSubmenuLink(options) {
  $("ul.views.viewsm")
    .eq(0)
    .append(
      $(
        `<li class='viewsi'><a title='${options.title}' href='${options.url}' id='${options.id}'>${options.text}</a></li>`
      )
    );
  let links = $("ul.views.viewsm:first li");
  // Re-sort the links into alphabetical order
  links.sort(function (a, b) {
    return $(a).text().localeCompare($(b).text());
  });
  $("ul.views.viewsm").eq(0).append(links);
}

export function createTopMenu() {
  const newUL = $("<ul class='pureCssMenu' id='wte-topMenuUL'></ul>");
  $("ul.pureCssMenu").eq(0).after(newUL);
  newUL.append(`<li>
        <a class="pureCssMenui0">
            <span>App Features</span>
        </a>
        <ul class="pureCssMenum" id="wte-topMenu"></ul>
    </li>`);
}

// Used in familyTimeline, familyGroup, locationsHelper
export async function getRelatives(id, fields = "*") {
  try {
    const result = await $.ajax({
      url: "https://api.wikitree.com/api.php",
      crossDomain: true,
      xhrFields: { withCredentials: true },
      type: "POST",
      dataType: "json",
      data: {
        action: "getRelatives",
        keys: id,
        fields: fields,
        getParents: 1,
        getSiblings: 1,
        getSpouses: 1,
        getChildren: 1,
      },
    });
    return result[0].items[0].person;
  } catch (error) {
    console.error(error);
  }
}

// Used in familyTimeline, familyGroup, locationsHelper
// Make the family member arrays easier to handle
export function extractRelatives(rel, theRelation = false) {
  let people = [];
  if (typeof rel == undefined || rel == null) {
    return false;
  }
  const pKeys = Object.keys(rel);
  pKeys.forEach(function (pKey) {
    var aPerson = rel[pKey];
    if (theRelation != false) {
      aPerson.Relation = theRelation;
    }
    people.push(aPerson);
  });
  return people;
}

// Used in familyTimeline, familyGroup, locationsHelper
export function familyArray(person) {
  // This is a person from getRelatives()
  const rels = ["Parents", "Siblings", "Spouses", "Children"];
  let familyArr = [person];
  rels.forEach(function (rel) {
    const relation = rel.replace(/s$/, "").replace(/ren$/, "");
    familyArr = familyArr.concat(extractRelatives(person[rel], relation));
  });
  return familyArr;
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// Check that a value is OK
// Used in familyTimeline and familyGroup
export function isOK(thing) {
  const excludeValues = ["", null, "null", "0000-00-00", "unknown", "Unknown", "undefined", undefined, "0000", "0", 0];
  if (!excludeValues.includes(thing)) {
    if (isNumeric(thing)) {
      return true;
    } else {
      if ($.type(thing) === "string") {
        const nanMatch = thing.match(/NaN/);
        if (nanMatch == null) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }
  } else {
    return false;
  }
}

// Find good names to display (as the API doesn't return the same fields all profiles)
export function displayName(fPerson) {
  if (fPerson != undefined) {
    let fName1 = "";
    if (typeof fPerson["LongName"] != "undefined") {
      if (fPerson["LongName"] != "") {
        fName1 = fPerson["LongName"].replace(/\s\s/, " ");
      }
    }
    let fName2 = "";
    let fName4 = "";
    if (typeof fPerson["MiddleName"] != "undefined") {
      if (fPerson["MiddleName"] == "" && typeof fPerson["LongNamePrivate"] != "undefined") {
        if (fPerson["LongNamePrivate"] != "") {
          fName2 = fPerson["LongNamePrivate"].replace(/\s\s/, " ");
        }
      }
    } else {
      if (typeof fPerson["LongNamePrivate"] != "undefined") {
        if (fPerson["LongNamePrivate"] != "") {
          fName4 = fPerson["LongNamePrivate"].replace(/\s\s/, " ");
        }
      }
    }

    let fName3 = "";
    const checks = ["Prefix", "FirstName", "RealName", "MiddleName", "LastNameAtBirth", "LastNameCurrent", "Suffix"];
    checks.forEach(function (dCheck) {
      if (typeof fPerson["" + dCheck + ""] != "undefined") {
        if (fPerson["" + dCheck + ""] != "" && fPerson["" + dCheck + ""] != null) {
          if (dCheck == "LastNameAtBirth") {
            if (fPerson["LastNameAtBirth"] != fPerson.LastNameCurrent) {
              fName3 += "(" + fPerson["LastNameAtBirth"] + ") ";
            }
          } else if (dCheck == "RealName") {
            if (typeof fPerson["FirstName"] != "undefined") {
            } else {
              fName3 += fPerson["RealName"] + " ";
            }
          } else {
            fName3 += fPerson["" + dCheck + ""] + " ";
          }
        }
      }
    });

    const arr = [fName1, fName2, fName3, fName4];
    var longest = arr.reduce(function (a, b) {
      return a.length > b.length ? a : b;
    });

    const fName = longest;

    let sName;
    if (fPerson["ShortName"]) {
      sName = fPerson["ShortName"];
    } else {
      sName = fName;
    }
    // fName = full name; sName = short name
    return [fName.trim(), sName.trim()];
  }
}

// Replace certain characters with HTML entities
// Used in Family Timeline and My Menu
export function htmlEntities(str) {
  return String(str)
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;")
    .replaceAll(/"/g, "&quot;")
    .replaceAll(/'/g, "&apos;");
}

// Used in Random Profile and My Menu
export function getRandomProfile() {
  const randomProfileID = Math.floor(Math.random() * 36065988);
  // check if exists
  getPerson(randomProfileID)
    .then((person) => {
      // check to see if the profile is Open
      if (person.Privacy_IsOpen) {
        const link = `https://www.wikitree.com/wiki/${randomProfileID}`;
        window.location = link;
      } else {
        // If it isn't open, find a new profile
        getRandomProfile();
      }
    })
    .catch((reason) => {
      console.log(`getJSON request failed! ${reason}`);
      getRandomProfile();
    });
}

// Used in Draft List and My Menu
export async function showDraftList() {
  if (localStorage.drafts) {
    await updateDraftList();
  }
  $("#myDrafts").remove();
  $("body").append($("<div id='myDrafts'><h2>My Drafts</h2><x>x</x><table></table></div>"));
  $("#myDrafts").dblclick(function () {
    $(this).slideUp();
  });
  $("#myDrafts x").click(function () {
    $(this).parent().slideUp();
  });
  $("#myDrafts").draggable();

  if (localStorage.drafts != undefined && localStorage.drafts != "[]") {
    window.drafts = JSON.parse(localStorage.drafts);
    window.draftCalls = 0;
    window.tempDraftArr = [];
    window.drafts.forEach(function (draft, index) {
      const theWTID = draft[0];
      if (!isOK(theWTID)) {
        delete window.drafts[index];
        window.draftCalls++;
      } else {
        $.ajax({
          url: "https://www.wikitree.com/index.php?title=" + theWTID + "&displayDraft=1",
          type: "GET",
          dataType: "html", // added data type
          success: function (res) {
            window.draftCalls++;
            const dummy = $(res);
            const aWTID = dummy.find("a.pureCssMenui0 span.person").text();
            if (dummy.find("div.status:contains('You have an uncommitted')").length) {
              window.tempDraftArr.push(aWTID);
              const useLink = dummy.find("a:contains(Use the Draft)").attr("href");
              if (useLink != undefined) {
                const personID = useLink.match(/&u=[0-9]+/)[0].replace("&u=", "");
                const draftID = useLink.match(/&ud=[0-9]+/)[0].replace("&ud=", "");
                window.drafts.forEach(function (yDraft) {
                  if (yDraft[0] == aWTID) {
                    yDraft[3] = personID;
                    yDraft[4] = draftID;
                  }
                });
              }
            }
            if (window.draftCalls == window.drafts.length) {
              window.newDraftArr = [];
              window.drafts.forEach(function (aDraft) {
                if (window.tempDraftArr.includes(aDraft[0]) && isOK(aDraft[0])) {
                  window.newDraftArr.push(aDraft);
                }
              });

              newDraftArr.forEach(function (xDraft) {
                let dButtons = "<td></td><td></td>";
                if (xDraft[3] != undefined) {
                  dButtons =
                    "<td><a href='https://www.wikitree.com/index.php?title=Special:EditPerson&u=" +
                    xDraft[3] +
                    "&ud=" +
                    xDraft[4] +
                    "' class='small button'>USE</a></td><td><a href='https://www.wikitree.com/index.php?title=Special:EditPerson&u=" +
                    xDraft[3] +
                    "&dd=" +
                    xDraft[4] +
                    "' class='small button'>DISCARD</a></td>";
                }

                $("#myDrafts table").append(
                  $(
                    "<tr><td><a href='https://www.wikitree.com/index.php?title=" +
                      xDraft[0] +
                      "&displayDraft=1'>" +
                      xDraft[2] +
                      "</a></td>" +
                      dButtons +
                      "</tr>"
                  )
                );
              });
              $("#myDrafts").slideDown();
              if (newDraftArr.length == 0) {
                $("#myDrafts").append($("<p>No drafts!</p>"));
              }
              localStorage.setItem("drafts", JSON.stringify(newDraftArr));
            }
          },
          error: function (res) {},
        });
      }
    });
  } else {
    $("#myDrafts").append($("<p>No drafts!</p>"));
    $("#myDrafts").slideDown();
  }
}

// Used in saveDraftList (above)
export async function updateDraftList() {
  const profileWTID = $("a.pureCssMenui0 span.person").text();
  let addDraft = false;
  let timeNow = Date.now();
  let lastWeek = timeNow - 604800000;
  let isEditPage = false;
  let theName = $("h1")
    .text()
    .replace("Edit Profile of ", "")
    .replaceAll(/\//g, "")
    .replaceAll(/ID|LINK|URL/g, "");
  if ($("#draftStatus:contains(saved),#status:contains(Starting with previous)").length) {
    addDraft = true;
  } else if ($("body.page-Special_EditPerson").length) {
    isEditPage = true;
  }
  if (localStorage.drafts) {
    let draftsArr = [];
    let draftsArrIDs = [];
    let drafts = JSON.parse(localStorage.drafts);
    drafts.forEach(function (draft) {
      if (!draftsArrIDs.includes(draft[0])) {
        if ((addDraft == false || window.fullSave == true) && draft[0] == profileWTID && isEditPage == true) {
        } else {
          if (draft[1] > lastWeek) {
            draftsArr.push(draft);
            draftsArrIDs.push(draft[0]);
          }
        }
      }
    });

    if (!draftsArrIDs.includes(profileWTID) && addDraft == true) {
      draftsArr.push([profileWTID, timeNow, theName]);
    }

    localStorage.setItem("drafts", JSON.stringify(draftsArr));
  } else {
    if (addDraft == true && window.fullSave != true) {
      localStorage.setItem("drafts", JSON.stringify([[profileWTID, timeNow, theName]]));
    }
  }
  return true;
}
