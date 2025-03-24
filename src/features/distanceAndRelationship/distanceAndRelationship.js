/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { getConnectionJSON, getRelationJSON } from "../../core/API/wwwWikiTree";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { mainDomain, isProfileEdit } from "../../core/pageType";
import { getProfilePersonInfo } from "../../core/common";
import { getObjectStores, distRelDbKeyFor, getUserWtId } from "../../core/common";

export const CONNECTION_DB_NAME = "ConnectionFinderWTE";
export const CONNECTION_DB_VERSION = 2;
export const CONNECTION_STORE_NAME = "distance2";
export const RELATIONSHIP_DB_NAME = "RelationshipFinderWTE";
export const RELATIONSHIP_DB_VERSION = 2;
export const RELATIONSHIP_STORE_NAME = "relationship2";
let profilePerson;
let profileID;

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

export function initDistanceDB(onDistanceSuccess) {
  initDb(CONNECTION_DB_NAME, CONNECTION_DB_VERSION, CONNECTION_STORE_NAME, "distance", onDistanceSuccess);
}
export function initRelationshipDB(onRelationshipSuccess) {
  initDb(RELATIONSHIP_DB_NAME, RELATIONSHIP_DB_VERSION, RELATIONSHIP_STORE_NAME, "relationship", onRelationshipSuccess);
}
export function initDistanceAndRelationshipDBs(onDistanceSuccess, onRelationshipSuccess) {
  initDistanceDB(onDistanceSuccess);
  initRelationshipDB(onRelationshipSuccess);
}

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
              console.log(`Could not open cursor on '.${dbName}.${oldStoreName}'`, error);
            };
          }
        }
    }
  };

  dbOpenReq.onsuccess = (event) => {
    const db = event.target.result;

    // Handle the version change event - this is triggered when another thread opened the
    // database with a new (higher) version number and executed their onupgradeneeded event
    db.onversionchange = () => {
      console.warn(`Database version change detected. Closing database ${dbName}.`);
      db.close(); // Close the database to allow the upgrade
      alert(`The IndexedDB database ${dbName} had a version change. Please refresh this page.`);
    };

    onSuccess(event);
  };

  dbOpenReq.onerror = (event) => {
    console.error(`Error opening IndexedDB ${dbName}.${storeName}:`, event.target.error);
  };

  dbOpenReq.onblocked = () => {
    console.warn(`IndexedDB database ${dbName}.${storeName} upgrade blocked by another open connection.`);
    alert(`Please close other WikiTree tabs, or restart your browser to allow the database ${dbName} to be upgraded.`);
  };
}

shouldInitializeFeature("distanceAndRelationship").then((result) => {
  if (isProfileEdit) {
    storeProfileIfCreated(); // First, check if the profile was just created and store it
    return;
  }
  profilePerson = getProfilePersonInfo();
  profileID = profilePerson?.Name;
  if (checkProfileCreationTime(profileID)) {
    // Profile was created less than 30 minutes ago, do not initialize feature
    console.log("Profile was created less than 30 minutes ago, not initializing feature");
    return;
  }

  const userID = getUserWtId();

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
      if ($(".yourRelationshipText").length < 2) {
        addRelationshipText(
          getRelationReq.result.relationship,
          cleanCommonAncestors(getRelationReq.result.commonAncestors)
        );
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
      const profileName = profilePerson.FirstName;
      $("#person h1").append(
        $(
          `<span class='distanceFromYou' title='${profileName} is ${getDistanceReq.result.distance} degrees from you. \nClick to refresh.'>${getDistanceReq.result.distance}°</span>`
        )
      );
      // Add a big hover text thing
      $(".distanceFromYou")
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

      $(".distanceFromYou").on("click", function (e) {
        e.preventDefault();
        $("#distanceFromYouTooltip").remove();
        $(this).fadeOut("slow").remove();
        $(".yourRelationshipText").fadeOut("slow").remove();
        initDistanceAndRelationship(userID, profileID, true);
      });
    }
  };

  getDistanceReq.onerror = (error) => {
    console.log("Error while retrieving distance from DB", error);
  };
}

function addRelationshipText(oText, commonAncestors) {
  $(".yourRelationshipText")?.remove();
  if (!oText) return;
  const commonAncestorTextResult = commonAncestorText(commonAncestors);
  let commonAncestorTextOut = commonAncestorTextResult.text;
  const cousinText = $(
    `<div class='yourRelationshipText' title='Click to refresh' class='relationshipFinder'>Your ${oText}
    <ul class='yourCommonAncestor' style='white-space:nowrap'>${commonAncestorTextOut}</ul>
    </div>`
  );
  $("h1[itemprop='name']").after(cousinText);
  if (cousinText.next("span.large").length > 0) {
    cousinText.after($("<br>"));
  }
  $(".yourRelationshipText").on("click", function (e) {
    e.stopPropagation();
    let id1 = getUserWtId();
    let id2 = profilePerson.Name;
    initDistanceAndRelationship(id1, id2, true);
  });
  if (commonAncestorTextResult.count > 2) {
    $(".yourRelationshipText").append($("<button class='btn btn-pill-sm showMoreAncestors'>More</button>"));
    $(".showMoreAncestors").on("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $(this).text(function (_, text) {
        return text === "More" ? "Less" : "More";
      });
      $(".yourCommonAncestor li:nth-child(n+3)").toggle();
    });
  }
}

function commonAncestorText(commonAncestors) {
  let result = {};
  let ancestorTextOut = "";
  const profileGender = profilePerson.Gender;
  let possessiveAdj = "their";
  if (profileGender == "Male") {
    possessiveAdj = "his";
  }
  if (profileGender == "Female") {
    possessiveAdj = "her";
  }
  let ancestorsAdded = [];
  commonAncestors.forEach(function (commonAncestor) {
    const myAncestorType = ancestorType(commonAncestor.path1Length - 1, commonAncestor.ancestor.mGender)?.toLowerCase();
    const thisAncestorType = ancestorType(
      commonAncestor.path2Length - 1,
      commonAncestor.ancestor.mGender
    )?.toLowerCase();
    if (myAncestorType && thisAncestorType && !ancestorsAdded.includes(commonAncestor.ancestor.mName)) {
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
    if (data) {
      let relationshipText = "";
      let hasRelationship = true;

      // Parse the returned HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.html, "text/html");

      // Check for "No Relationship Found"
      const h2Element = doc.querySelector("h2");
      if (h2Element && h2Element.textContent.trim() === "No Relationship Found") {
        hasRelationship = false;
        console.log("No Relationship Found");
      }

      if (hasRelationship) {
        const firstP = doc.querySelector("h3");
        if (firstP) {
          const firstPText = firstP.textContent.replace(/[\t\n]/g, " ").trim();
          const lastLink = decodeURIComponent(
            doc.querySelector("#imageContainer > p > span:last-of-type a")?.href || ""
          ).replaceAll(" ", "_");
          const profileFirstName = profilePerson.FirstName;

          if (data.commonAncestors.length === 0) {
            const bold = doc.querySelector("b");
            const boldParentHTML = bold?.parentElement.innerHTML || "";
            relationshipText = bold?.textContent || "";
            if (boldParentHTML.includes(profileFirstName) && !lastLink.includes(profileID)) {
              relationshipText = firstPText
                .replace("(DNA Confirmed)", "")
                .replace("(Confident)", "")
                .trim()
                .toLowerCase();
            }
          } else {
            const profileGender = document.querySelector("meta[itemprop='gender']")?.content || "";

            if (firstPText.includes("is the")) {
              relationshipText = firstPText.split("is the ")[1].split(" of")[0];
            } else if (firstPText.includes(" are ")) {
              relationshipText = firstPText
                .split("are ")[1]
                .replace(/cousins/, "cousin")
                .replace(/siblings/, "sibling");
            }

            if (/nephew|niece/.test(relationshipText)) {
              if (/(nephew|niece) or (nephew|niece)/.test(relationshipText)) {
                relationshipText = relationshipText.replace(/nephew/, "uncle").replace(/niece/, "aunt");
              } else {
                relationshipText =
                  profileGender === "Male"
                    ? relationshipText.replace(/nephew|niece/, "uncle")
                    : profileGender === "Female"
                    ? relationshipText.replace(/nephew|niece/, "aunt")
                    : relationshipText.replace(/nephew|niece/, "uncle or aunt");
              }
            }

            const userFirstName =
              doc
                .querySelector(`span.ancestor_1`)
                ?.textContent.replace(/[\t\n ]+/g, " ")
                .trim()
                .split(" ")[1] || "";

            if (firstPText.includes(`${userFirstName}'s`)) {
              relationshipText = firstPText.split(`${userFirstName}'s`)[1].trim();
            }
          }

          // Convert ordinal words to numbers
          let relationshipParts = relationshipText.split(" ");
          relationshipParts[0] = ordinalWordToNumberAndSuffix(relationshipParts[0]);
          relationshipText = fixOrdinalSuffix(relationshipParts.join(" "));
          console.log(relationshipText);

          // Insert relationship text
          addRelationshipText(relationshipText, cleanCommonAncestors(data.commonAncestors));
        }
      }

      // Save to the database
      initRelationshipDB((event) => {
        const relationshipFinderDB = event.target.result;
        const obj = {
          theKey: distRelDbKeyFor(profileID, userID),
          userId: userID,
          id: profileID,
          distance: window.distance,
          relationship: relationshipText,
          commonAncestors: cleanCommonAncestors(data.commonAncestors),
        };
        addToDBAndClose(relationshipFinderDB, RELATIONSHIP_STORE_NAME, obj);
      });
    }
  });
}

async function addDistance(data) {
  const profileID = profilePerson.Name;
  const userID = getUserWtId();

  if ($(".distanceFromYou").length < 2) {
    window.distance = data.path.length - 1;
    const profileName = profilePerson.FirstName;
    if (window.distance > 0) {
      $("#person h1").append(
        $(
          `<span class='distanceFromYou' title='${profileName} is ${window.distance} degrees from you.'>${window.distance}°</span>`
        )
      );
    }
    initDistanceDB((event) => {
      const connectionFinderDB = event.target.result;
      const obj = {
        theKey: distRelDbKeyFor(profileID, userID),
        userId: userID,
        id: profileID,
        distance: window.distance,
      };
      addToDBAndClose(connectionFinderDB, CONNECTION_STORE_NAME, obj);
    });

    // Add distance data to RF DB here
    initRelationshipDB((event) => {
      const relationshipFinderDB = event.target.result;
      const obj = {
        theKey: distRelDbKeyFor(profileID, userID),
        userId: userID,
        id: profileID,
        distance: window.distance,
      };
      addToDBAndClose(relationshipFinderDB, RELATIONSHIP_STORE_NAME, obj);
    });
  }
}

function storeProfileIfCreated() {
  setTimeout(() => {
    // Step 1: Check if the element exists and contains the text "Successfully Created"
    const profileElement = $(".larger")
      .filter(function () {
        return $(this).text().includes("Successfully Created");
      })
      .find("a[href*='wiki']");

    if (profileElement.length) {
      // Step 2: Extract the WT ID
      const wtId = profileElement.attr("href").split("/").pop();

      // Step 3: Store the WT ID with the current timestamp in localStorage
      const now = new Date().getTime();
      let recentlyCreatedProfiles = JSON.parse(localStorage.getItem("recentlyCreatedProfiles")) || {};

      recentlyCreatedProfiles[wtId] = now;
      localStorage.setItem("recentlyCreatedProfiles", JSON.stringify(recentlyCreatedProfiles));

      // Step 4: Log the stored profile
      console.log(`Profile ${wtId} successfully created at ${new Date(now).toLocaleString()}`);
      console.log("Recently created profiles:", recentlyCreatedProfiles);
    }
  }, 2000);
}

function checkProfileCreationTime(wtId) {
  let recentlyCreatedProfiles = JSON.parse(localStorage.getItem("recentlyCreatedProfiles")) || {};
  const now = new Date().getTime();
  const thirtyMinutes = 30 * 60 * 1000;

  if (recentlyCreatedProfiles[wtId]) {
    const recentlyCreatedTime = recentlyCreatedProfiles[wtId];

    if (now - recentlyCreatedTime < thirtyMinutes) {
      // Profile was created less than 30 minutes ago
      return true;
    } else {
      // More than 30 minutes have passed, remove the key
      delete recentlyCreatedProfiles[wtId];
      localStorage.setItem("recentlyCreatedProfiles", JSON.stringify(recentlyCreatedProfiles));
    }
  }

  return false; // Profile was not created within the last 30 minutes
}

async function getDistance() {
  const id2 = profileID;
  const id1 = getUserWtId();
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
  $(".distanceFromYou").fadeOut().remove();
  $(".yourRelationshipText").fadeOut().remove();
  if (clicked == true) {
    getDistance();
    doRelationshipText(userID, profileID);
  } else {
    getProfile(profileID, undefined, "WBE_distanceAndRelationship")
      .then((person) => {
        if (person.Privacy > 29 && person.Connected == 1) {
          getDistance();
          doRelationshipText(userID, profileID);
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
