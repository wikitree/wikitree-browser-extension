/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import Cookies from "js-cookie";
import { getConnectionJSON, getRelationJSON } from "../../core/API/wwwWikiTree";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { mainDomain } from "../../core/pageType";
import { getObjectStores, distRelDbKeyFor } from "../../core/common";

export const CONNECTION_DB_NAME = "ConnectionFinderWTE";
export const CONNECTION_DB_VERSION = 2;
export const CONNECTION_STORE_NAME = "distance2";
export const RELATIONSHIP_DB_NAME = "RelationshipFinderWTE";
export const RELATIONSHIP_DB_VERSION = 2;
export const RELATIONSHIP_STORE_NAME = "relationship2";

const fixOrdinalSuffix = (text) => {
  const pattern = /(\d+)(?:st|nd|rd|th)\b/g;
  return text.replace(pattern, (_, num) => {
    const numInt = parseInt(num, 10);
    let suffix = "th";

    if (![11, 12, 13].includes(numInt % 100)) {
      switch (numInt % 10) {
        case 1:
          suffix = "st";
          break;
        case 2:
          suffix = "nd";
          break;
        case 3:
          suffix = "rd";
          break;
      }
    }

    return num + suffix;
  });
};

const cleanCommonAncestors = (commonAncestors) => {
  if (!commonAncestors) return [];
  return commonAncestors.map((ancestor) => {
    const { mDerived, ...cleanedAncestor } = ancestor.ancestor;
    cleanedAncestor.mDerived = { LongNameWithDates: mDerived.LongNameWithDates };
    return {
      ...ancestor,
      ancestor: cleanedAncestor,
    };
  });
};

export function initDistanceAndRelationshipDBs(onDistanceSuccess, onRelationshipSuccess) {
  initDb(CONNECTION_DB_NAME, CONNECTION_DB_VERSION, CONNECTION_STORE_NAME, "distance", onDistanceSuccess);
  initDb(RELATIONSHIP_DB_NAME, RELATIONSHIP_DB_VERSION, RELATIONSHIP_STORE_NAME, "relationship", onRelationshipSuccess);

  function initDb(dbName, dbVersion, storeName, oldStoreName, onSuccess) {
    const dbOpenReq = window.indexedDB.open(dbName, dbVersion);
    dbOpenReq.onupgradeneeded = async (event) => {
      const db = event.target.result;
      const objStores = getObjectStores(db);
      switch (event.oldVersion) {
        case 0: // there is no old store
          db.createObjectStore(storeName, { keyPath: "theKey" });
          break;

        case 1:
          if (!objStores.includes(storeName)) {
            const newStore = db.createObjectStore(storeName, { keyPath: "theKey" });
            if (oldStoreName && objStores.includes(oldStoreName)) {
              console.log(`Converting '${oldStoreName}'`);

              const transaction = event.target.transaction;
              const oldObjectStore = transaction.objectStore(oldStoreName);

              // Open a cursor to iterate through the records in the old object store
              const cursorRequest = oldObjectStore.openCursor();

              cursorRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                  const record = cursor.value;
                  record.theKey = distRelDbKeyFor(record.id, record.userId);
                  const addReq = newStore.add(record);

                  addReq.onsuccess = () => {
                    cursor.continue(); // Move to the next record
                  };

                  addReq.onerror = (error) => {
                    console.log(`Failed to convert ${record.theKey}`, error);
                  };
                } else {
                  // We're done
                  db.deleteObjectStore(oldStoreName);
                }
              };

              cursorRequest.onerror = (error) => {
                console.log(`Could not open cursor on '${oldStoreName}'`, error);
              };
            }
          }
      }
    };
    dbOpenReq.onsuccess = onSuccess;
  }
}

shouldInitializeFeature("distanceAndRelationship").then((result) => {
  // define user and profile IDs
  const profileID = $("a.pureCssMenui0 span.person").text();
  const userID = Cookies.get("wikitree_wtb_UserName");
  if (result && $("body.profile").length && profileID != userID && profileID != "") {
    import("./distanceAndRelationship.css");
    initDistanceAndRelationshipDBs(
      (event) => onDistancesSuccess(event, profileID, userID),
      (event) => onRelationsSuccess(event, profileID, userID)
    );
  }
});

function onRelationsSuccess(event, profileID, userID) {
  const db = event.target.result;
  const getRelationReq = db
    .transaction(RELATIONSHIP_STORE_NAME, "readonly")
    .objectStore(RELATIONSHIP_STORE_NAME)
    .get(distRelDbKeyFor(profileID, userID));
  getRelationReq.onsuccess = function () {
    if (getRelationReq.result != undefined) {
      if (getRelationReq.result.relationship != "") {
        if (
          $("#yourRelationshipText").length == 0 &&
          $(".ancestorTextText").length == 0 &&
          $("#ancestorListBox").length == 0
        ) {
          $("#yourRelationshipText").remove();
          addRelationshipText(
            getRelationReq.result.relationship,
            cleanCommonAncestors(getRelationReq.result.commonAncestors)
          );
        }
      }
    }
  };
  getRelationReq.onerror = (error) => {
    console.log("Error while retrieving relationship from DB", error);
  };
}

export async function getProfile(id, fields = "*", appId = "WBE") {
  try {
    const result = await $.ajax({
      url: "https://api.wikitree.com/api.php",
      crossDomain: true,
      xhrFields: { withCredentials: true },
      type: "POST",
      dataType: "json",
      data: {
        action: "getProfile",
        key: id,
        fields: fields,
        bioFormat: "text",
        resolveRedirect: 1,
        appId: appId || "WBE",
      },
    });
    return result[0].profile;
  } catch (error) {
    console.error(error);
  }
}

// Do it
function onDistancesSuccess(event, profileID, userID) {
  const db = event.target.result;
  const getDistanceReq = db
    .transaction(CONNECTION_STORE_NAME, "readonly")
    .objectStore(CONNECTION_STORE_NAME)
    .get(distRelDbKeyFor(profileID, userID));

  getDistanceReq.onsuccess = function () {
    if (getDistanceReq.result == undefined || getDistanceReq.result?.distance < 0) {
      initDistanceAndRelationship(userID, profileID);
    } else {
      if ($("#distanceFromYou").length == 0) {
        const profileName = $("h1 span[itemprop='name']").text();
        $("h1").append(
          $(
            `<span id='distanceFromYou' title='${profileName} is ${getDistanceReq.result.distance} degrees from you. \nClick to refresh.'>${getDistanceReq.result.distance}°</span>`
          )
        );
        // Add a big hover text thing
        $("#distanceFromYou")
          .on("mouseenter", function () {
            const offset = $(this).offset();
            const tooltip = $('<div id="distanceFromYouTooltip">Click to refresh</div>').css({
              top: offset.top + $(this).outerHeight() + 5,
              left: offset.left,
              position: "absolute",
            });
            $("body").append(tooltip);
          })
          .on("mouseleave", function () {
            $("#distanceFromYouTooltip").remove();
          });

        $("#distanceFromYou").on("click", function (e) {
          e.preventDefault();
          $("#distanceFromYouTooltip").remove();
          $(this).fadeOut("slow").remove();
          $("#yourRelationshipText").fadeOut("slow").remove();
          initDistanceAndRelationship(userID, profileID, true);
        });
      }

      // Add distance data to RF DB here
      const relationshipFinderDBOpenReq = window.indexedDB.open(RELATIONSHIP_DB_NAME, RELATIONSHIP_DB_VERSION);
      relationshipFinderDBOpenReq.onsuccess = (event) => {
        const relationshipFinderDB = event.target.result;
        const obj = {
          theKey: distRelDbKeyFor(profileID, userID),
          userId: userID,
          id: profileID,
          distance: getDistanceReq.result.distance,
        };
        addToDBAndClose(relationshipFinderDB, RELATIONSHIP_STORE_NAME, obj);
      };
    }
  };

  getDistanceReq.onerror = (error) => {
    console.log("Error while retrieving distance from DB", error);
  };
}

function addRelationshipText(oText, commonAncestors) {
  const commonAncestorTextResult = commonAncestorText(commonAncestors);
  let commonAncestorTextOut = commonAncestorTextResult.text;
  if (!oText) return;
  const cousinText = $(
    `<div id='yourRelationshipText' title='Click to refresh' class='relationshipFinder'>Your ${oText}
    <ul id='yourCommonAncestor' style='white-space:nowrap'>${commonAncestorTextOut}</ul>
    </div>`
  );
  $("h1").after(cousinText);
  if (cousinText.next("span.large").length > 0) {
    cousinText.after($("<br>"));
  }
  $("#yourRelationshipText").on("click", function (e) {
    e.stopPropagation();
    let id1 = Cookies.get("wikitree_wtb_UserName");
    let id2 = $("a.pureCssMenui0 span.person").text();
    initDistanceAndRelationship(id1, id2, true);
  });
  if (commonAncestorTextResult.count > 2) {
    $("#yourRelationshipText").append($("<button class='small' id='showMoreAncestors'>More</button>"));
    $("#showMoreAncestors").on("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $("#yourCommonAncestor li:nth-child(n+3)").toggle();
    });
  }
}

function commonAncestorText(commonAncestors) {
  let result = {};
  let ancestorTextOut = "";
  const profileGender = $("body").find("meta[itemprop='gender']").attr("content");
  let possessiveAdj = "their";
  if (profileGender == "male") {
    possessiveAdj = "his";
  }
  if (profileGender == "female") {
    possessiveAdj = "her";
  }
  let ancestorsAdded = [];
  commonAncestors.forEach(function (commonAncestor) {
    const myAncestorType = ancestorType(commonAncestor.path1Length - 1, commonAncestor.ancestor.mGender).toLowerCase();
    const thisAncestorType = ancestorType(
      commonAncestor.path2Length - 1,
      commonAncestor.ancestor.mGender
    ).toLowerCase();
    if (!ancestorsAdded.includes(commonAncestor.ancestor.mName)) {
      ancestorTextOut += `<li>Your ${myAncestorType}, 
      <a href="https://${mainDomain}/wiki/${commonAncestor.ancestor.mName}">${commonAncestor.ancestor.mDerived.LongNameWithDates}</a>, 
      is ${possessiveAdj} ${thisAncestorType}.</li>`;
      ancestorsAdded.push(commonAncestor.ancestor.mName);
    }
  });
  result.text = ancestorTextOut;
  result.count = ancestorsAdded.length;
  return result;
}

function doRelationshipText(userID, profileID) {
  getRelationJSON("DistanceAndRelationship_Relationship", userID, profileID).then(function (data) {
    console.log(data);
    if (data) {
      var out = "";
      var aRelationship = true;
      let dummy = $("<html></html>");
      dummy.append($(data.html));
      if (dummy.find("h1").length) {
        if (dummy.find("h1").eq(0).text() == "No Relationship Found") {
          aRelationship = false;
          console.log("No Relationship Found");
        }
      }
      if (dummy.find("h2").length && aRelationship == true) {
        let oh2 = dummy
          .find("h2")
          .eq(0)
          .text()
          .replaceAll(/[\t\n]/g, "");
        out = dummy.find("b").text();
        const outOuterHTML = dummy.find("b")[0].outerHTML;
        let secondName = dummy.find("b").parent().html().split(outOuterHTML)[1];
        let lastLink = dummy.find("#imageContainer > p > span:last-of-type a").attr("href");
        const userFirstName = dummy.find(`p a[href$='${userID}']`).eq(0).text().split(" ")[0];
        const profileFirstName = $("h1 span[itemprop='name']").text().split(" ")[0];
        if (data.commonAncestors.length == 0) {
          out = dummy.find("b").text();
          if (secondName.match(profileFirstName) && lastLink.match(profileID) == null) {
            out = dummy.find("h2").text().replace("(DNA Confirmed)", "").trim();
          }
        } else {
          const profileGender = $("body").find("meta[itemprop='gender']").attr("content");
          if (oh2.match("is the")) {
            out = oh2.split("is the ")[1].split(" of")[0];
          } else if (oh2.match(" are ")) {
            out = oh2
              .split("are ")[1]
              .replace(/cousins/, "cousin")
              .replace(/siblings/, "sibling");
          }
          if (out.match(/nephew|niece/)) {
            if (out.match(/(nephew|niece) or (nephew|niece)/)) {
              out = out.replace(/nephew/, "uncle");
              out = out.replace(/niece/, "aunt");
            } else {
              if (profileGender == "male") {
                out = out.replace(/nephew|niece/, "uncle");
              } else if (profileGender == "female") {
                out = out.replace(/nephew|niece/, "aunt");
              } else {
                out = out.replace(/nephew|niece/, "uncle or aunt");
              }
            }
          }
          if (
            dummy
              .find("h2")
              .eq(0)
              .text()
              .match(userFirstName + "'s")
          ) {
            out = dummy
              .find("h2")
              .eq(0)
              .text()
              .split(userFirstName + "'s")[1]
              .trim();
          }
        }
        let outSplit = out.split(" ");
        outSplit[0] = ordinalWordToNumberAndSuffix(outSplit[0]);
        out = outSplit.join(" ");
        out = fixOrdinalSuffix(out);
        console.log(out);
        if (
          $("#yourRelationshipText").length == 0 &&
          $(".ancestorTextText").length == 0 &&
          $("#ancestorListBox").length == 0
        ) {
          $("#yourRelationshipText").remove();
          addRelationshipText(out, cleanCommonAncestors(data.commonAncestors));
        }
      }

      const relationshipFinderDBOpenReq = window.indexedDB.open(RELATIONSHIP_DB_NAME, RELATIONSHIP_DB_VERSION);
      relationshipFinderDBOpenReq.onsuccess = (event) => {
        const relationshipFinderDB = event.target.result;
        const obj = {
          theKey: distRelDbKeyFor(profileID, userID),
          userId: userID,
          id: profileID,
          distance: window.distance,
          relationship: out,
          commonAncestors: cleanCommonAncestors(data.commonAncestors),
        };
        addToDBAndClose(relationshipFinderDB, RELATIONSHIP_STORE_NAME, obj);
      };
    }
  });
}

async function addDistance(data) {
  const profileID = $("a.pureCssMenui0 span.person").text();
  const userID = Cookies.get("wikitree_wtb_UserName");

  if ($("#degreesFromYou").length == 0) {
    window.distance = data.path.length - 1;
    const profileName = $("h1 span[itemprop='name']").text();
    if (window.distance > 0 && $("#degreesFromYou").length == 0) {
      $("h1").append(
        $(
          `<span id='distanceFromYou' title='${profileName} is ${window.distance} degrees from you.'>${window.distance}°</span>`
        )
      );
    }
    const connectionFinderDBOpenReq = window.indexedDB.open(CONNECTION_DB_NAME, CONNECTION_DB_VERSION);
    connectionFinderDBOpenReq.onsuccess = function (event) {
      const connectionFinderDB = event.target.result;
      const obj = {
        theKey: distRelDbKeyFor(profileID, userID),
        userId: userID,
        id: profileID,
        distance: window.distance,
      };
      addToDBAndClose(connectionFinderDB, CONNECTION_STORE_NAME, obj);
    };
    connectionFinderDBOpenReq.onerror = function (error) {
      console.log("Error while recording distance", error);
    };
    // Add distance data to RF DB here
    const relationshipFinderDBOpenReq = window.indexedDB.open(RELATIONSHIP_DB_NAME, RELATIONSHIP_DB_VERSION);
    relationshipFinderDBOpenReq.onsuccess = function (event) {
      const relationshipFinderDB = event.target.result;
      const obj = {
        theKey: distRelDbKeyFor(profileID, userID),
        userId: userID,
        id: profileID,
        distance: window.distance,
      };
      addToDBAndClose(relationshipFinderDB, RELATIONSHIP_STORE_NAME, obj);
    };
  }
}

async function getDistance() {
  const id1 = Cookies.get("wikitree_wtb_UserName");
  const id2 = $("a.pureCssMenui0 span.person").text();
  const data = await getConnectionJSON("DistanceAndRelationship_Distance", id1, id2);
  addDistance(data);
}

export function ordinal(i) {
  var j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) {
    return i + "st";
  }
  if (j == 2 && k != 12) {
    return i + "nd";
  }
  if (j == 3 && k != 13) {
    return i + "rd";
  }
  return i + "th";
}

export function ancestorType(generation, gender) {
  let relType;
  if (generation > 0 || generation == 0) {
    if (gender == "Female") {
      relType = "Mother";
    } else if (gender == "Male") {
      relType = "Father";
    } else {
      relType = "Parent";
    }
  }
  if (generation > 1) {
    relType = "Grand" + relType.toLowerCase();
  }
  if (generation > 2) {
    relType = "Great-" + relType.toLowerCase();
  }
  if (generation > 3) {
    relType = ordinal(generation - 2) + " " + relType;
  }
  return relType;
}

export function ordinalWordToNumberAndSuffix(word) {
  const ordinalsMap = {
    first: "1st",
    second: "2nd",
    third: "3rd",
    fourth: "4th",
    fifth: "5th",
    sixth: "6th",
    seventh: "7th",
    eighth: "8th",
    ninth: "9th",
    tenth: "10th",
    eleventh: "11th",
    twelfth: "12th",
    thirteenth: "13th",
    fourteenth: "14th",
    fifteenth: "15th",
    sixteenth: "16th",
    seventeenth: "17th",
    eighteenth: "18th",
    nineteenth: "19th",
    twentieth: "20th",
    "twenty-first": "21st",
    "twenty-second": "22nd",
    "twenty-third": "23rd",
    "twenty-fourth": "24th",
    "twenty-fifth": "25th",
    "twenty-sixth": "26th",
    "twenty-seventh": "27th",
    "twenty-eighth": "28th",
    "twenty-ninth": "29th",
    thirtieth: "30th",
    "thirty-first": "31st",
    "thirty-second": "32nd",
    "thirty-third": "33rd",
    "thirty-fourth": "34th",
    "thirty-fifth": "35th",
    "thirty-sixth": "36th",
    "thirty-seventh": "37th",
    "thirty-eighth": "38th",
    "thirty-ninth": "39th",
    fortieth: "40th",
    "forty-first": "41st",
    "forty-second": "42nd",
    "forty-third": "43rd",
    "forty-fourth": "44th",
    "forty-fifth": "45th",
    "forty-sixth": "46th",
    "forty-seventh": "47th",
    "forty-eighth": "48th",
    "forty-ninth": "49th",
    fiftieth: "50th",
    "fifty-first": "51st",
    "fifty-second": "52nd",
    "fifty-third": "53rd",
    "fifty-fourth": "54th",
    "fifty-fifth": "55th",
    "fifty-sixth": "56th",
    "fifty-seventh": "57th",
    "fifty-eighth": "58th",
    "fifty-ninth": "59th",
    sixtieth: "60th",
    "sixty-first": "61st",
    "sixty-second": "62nd",
    "sixty-third": "63rd",
  };

  return ordinalsMap[word] || word;
}

function initDistanceAndRelationship(userID, profileID, clicked = false) {
  $("#distanceFromYou").fadeOut().remove();
  $("#yourRelationshipText").fadeOut().remove();
  if (clicked == true) {
    getDistance();
    doRelationshipText(userID, profileID);
  } else {
    getProfile(profileID, undefined, "WBE_distanceAndRelationship")
      .then((person) => {
        if (person.Privacy > 29 && person.Connected == 1) {
          getDistance();
          if ($("#yourRelationshipText").length == 0) {
            doRelationshipText(userID, profileID);
          }
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }
}

function addToDBAndClose(db, objStore, obj) {
  const putRequest = db.transaction(objStore, "readwrite").objectStore(objStore).put(obj);
  putRequest.onsuccess = () => {
    db.close();
  };
}
