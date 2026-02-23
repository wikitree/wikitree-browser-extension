/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { mainDomain, isProfileEdit, isProfilePage } from "../../core/pageType";
import { getProfilePersonInfo } from "../../core/common";
import { getObjectStores, distRelDbKeyFor, getUserWtId } from "../../core/common";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";

export const CONNECTION_DB_NAME = "ConnectionFinderWTE";
export const CONNECTION_DB_VERSION = 2;
export const CONNECTION_STORE_NAME = "distance2";
export const RELATIONSHIP_DB_NAME = "RelationshipFinderWTE";
export const RELATIONSHIP_DB_VERSION = 2;
export const RELATIONSHIP_STORE_NAME = "relationship2";
let profilePerson;
let profileID;
let options = {};

const WBE_DIST_REL_APP_ID = "WBE_distance_and_relationship";
const DIST_REL_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const EN_DASH = "\u2013";

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
    cleanedAncestor.mDerived = { LongNameWithDates: normalizeDateRangeDashes(mDerived.LongNameWithDates) };
    return {
      ...ancestor,
      ancestor: cleanedAncestor,
    };
  });
};

const normalizeDateRangeDashes = (text) => {
  if (!text) return text;
  return text.replace(/(?<=\()([^()]*?)(\d{3,4}s?|unknown|\?)-(\d{3,4}s?|unknown|\?)([^()]*)?(?=\))/gi, (_match, pre, left, right, post = "") => {
    return `${pre || ""}${left}${EN_DASH}${right}${post || ""}`;
  });
};

const sortCommonAncestorsByGender = (commonAncestors) => {
  if (!Array.isArray(commonAncestors)) return [];

  const genderRank = (gender) => {
    if (gender === "Male") return 0;
    if (gender === "Female") return 1;
    return 2;
  };

  return [...commonAncestors].sort((left, right) => {
    const rankDiff =
      genderRank(left?.ancestor?.mGender || left?.ancestor?.Gender) -
      genderRank(right?.ancestor?.mGender || right?.ancestor?.Gender);

    if (rankDiff !== 0) return rankDiff;

    const leftName = String(left?.ancestor?.mName || "");
    const rightName = String(right?.ancestor?.mName || "");
    return leftName.localeCompare(rightName);
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

shouldInitializeFeature("distanceAndRelationship").then(async (result) => {
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

  if (result && isProfilePage && profileID != userID && profileID != "") {
    import("./distanceAndRelationship.css");
    options = await getFeatureOptions("distanceAndRelationship");
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
        const sortedAncestors = sortCommonAncestorsByGender(getRelationReq.result.commonAncestors);
        addRelationshipText(
          getRelationReq.result.relationship,
          cleanCommonAncestors(sortedAncestors)
        );
      }
    }
  };
  getRelationReq.onerror = (error) => {
    console.log("Error while retrieving relationship from DB", error);
  };
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
      attachDistanceHandlers(userID, profileID);

      if (isCacheRefreshDue(getDistanceReq.result)) {
        console.log("Distance/relationship cache is stale, refreshing in background");
        initDistanceAndRelationship(userID, profileID, false, false);
      }
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
  if (options.relationshipBoxPosition == "below") {
    if ($("#person [id='Death']").length > 0) {
      $("#person [id='Death']").first().after(cousinText);
    } else if ($("#person [id='Birth']").length > 0) {
      $("#person [id='Birth']").first().after(cousinText);
    } else if ($("#person h1[itemprop='name']").length > 0) {
      $("#person h1[itemprop='name']").first().after(cousinText);
    }
  } else {
    $("#person h1[itemprop='name']").after(cousinText);
  }

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

function isUpPathType(pathType) {
  return ["parent", "father", "mother"].includes((pathType || "").toLowerCase());
}

function isDownPathType(pathType) {
  return ["child", "son", "daughter"].includes((pathType || "").toLowerCase());
}

function removedText(removed) {
  if (removed === 1) return " once removed";
  if (removed === 2) return " twice removed";
  return ` ${removed} times removed`;
}

function longNameWithDatesFromPathPerson(pathPerson) {
  const firstName = pathPerson.FirstName || "";
  const lastName = pathPerson.LastNameCurrent || pathPerson.LastNameAtBirth || "";
  const baseName = [firstName, lastName].filter(Boolean).join(" ").trim() || pathPerson.Name || "Unknown";
  const birthDecade = pathPerson.BirthDateDecade || "?";
  const deathDecade = pathPerson.DeathDateDecade || "?";
  return `${baseName} (${birthDecade}${EN_DASH}${deathDecade})`;
}

function descendantType(stepsDown, gender) {
  const childType = gender === "Male" ? "son" : gender === "Female" ? "daughter" : "child";
  if (stepsDown <= 1) return childType;
  if (stepsDown === 2) return `grand${childType}`;
  if (stepsDown === 3) return `great grand${childType}`;
  return `${ordinal(stepsDown - 2)} great grand${childType}`;
}

function auntUncleType(stepsUp, gender) {
  const base = gender === "Male" ? "uncle" : gender === "Female" ? "aunt" : "aunt or uncle";
  if (stepsUp <= 1) return base;
  if (stepsUp === 2) return `grand ${base}`;
  if (stepsUp === 3) return `great grand ${base}`;
  return `${ordinal(stepsUp - 3)} great grand ${base}`;
}

function nieceNephewType(stepsDown, gender) {
  const base = gender === "Male" ? "nephew" : gender === "Female" ? "niece" : "niece or nephew";
  if (stepsDown <= 1) return base;
  if (stepsDown === 2) return `grand ${base}`;
  if (stepsDown === 3) return `great grand ${base}`;
  return `${ordinal(stepsDown - 3)} great grand ${base}`;
}

function analyzeAncestorPath(path) {
  let upSteps = 0;
  for (let index = 1; index < path.length; index++) {
    if (isUpPathType(path[index]?.pathType)) {
      upSteps++;
    } else {
      break;
    }
  }

  const ancestorIndex = upSteps;
  let downSteps = 0;
  for (let index = ancestorIndex + 1; index < path.length; index++) {
    if (isDownPathType(path[index]?.pathType)) {
      downSteps++;
    }
  }

  return {
    upSteps,
    downSteps,
    ancestorIndex,
    ancestorNode: path[ancestorIndex],
  };
}

function relationshipFromPathAnalysis(pathAnalysis, profileGender) {
  const { upSteps, downSteps } = pathAnalysis;

  if (upSteps === 0 && downSteps === 0) return "self";
  if (downSteps === 0) return ancestorType(Math.max(upSteps - 1, 0), profileGender)?.toLowerCase() || "relative";
  if (upSteps === 0) return descendantType(downSteps, profileGender);

  if (upSteps === 1 && downSteps === 1) {
    return profileGender === "Male" ? "brother" : profileGender === "Female" ? "sister" : "sibling";
  }
  if (upSteps >= 2 && downSteps === 1) {
    return auntUncleType(upSteps, profileGender);
  }
  if (upSteps === 1 && downSteps >= 2) {
    return nieceNephewType(downSteps, profileGender);
  }

  const cousinNumber = Math.min(upSteps, downSteps) - 1;
  let relationship = cousinNumber > 0 ? `${ordinal(cousinNumber)} cousin` : "cousin";
  const removed = Math.abs(upSteps - downSteps);
  if (removed > 0) {
    relationship += removedText(removed);
  }
  return relationship;
}

function asCommonAncestorEntry(person, path1Length, path2Length) {
  if (!person || !person.Name) return null;
  return {
    ancestor_id: person.Id,
    path1Length,
    path2Length,
    ancestor: {
      mId: person.Id,
      mName: person.Name,
      mFirstName: person.FirstName || "",
      mLastNameCurrent: person.LastNameCurrent || "",
      mLastNameAtBirth: person.LastNameAtBirth || "",
      mGender: person.Gender || "",
      mDerived: {
        LongNameWithDates: longNameWithDatesFromPathPerson(person),
      },
    },
  };
}

function commonAncestorsFromPath(path, pathAnalysis) {
  const ancestor = pathAnalysis.ancestorNode;
  const entry = asCommonAncestorEntry(ancestor, pathAnalysis.upSteps, pathAnalysis.downSteps);
  return entry ? [entry] : [];
}

async function augmentWithOtherParentCommonAncestor(userID, profileID, pathAnalysis, commonAncestors) {
  if (!(pathAnalysis.upSteps >= 1 && pathAnalysis.downSteps >= 1)) {
    return commonAncestors;
  }

  let nextAncestors = commonAncestors;

  if (pathAnalysis.downSteps === 1) {
    try {
      const relatives = await WikiTreeAPI.getRelatives(
        WBE_DIST_REL_APP_ID,
        [profileID],
        "Id,Name,Gender,FirstName,LastNameCurrent,LastNameAtBirth,BirthDateDecade,DeathDateDecade",
        { getParents: true }
      );

      const person = relatives?.[0]?.person;
      const parents = person?.Parents ? Object.values(person.Parents) : [];
      const directAncestorId = Number(pathAnalysis.ancestorNode?.Id);
      const otherParent = parents.find((parent) => Number(parent?.Id) !== directAncestorId && parent?.Name);

      const otherParentEntry = asCommonAncestorEntry(otherParent, pathAnalysis.upSteps, pathAnalysis.downSteps);
      if (otherParentEntry) {
        const alreadyIncluded = nextAncestors.some(
          (ancestor) => String(ancestor?.ancestor?.mName || "") === String(otherParentEntry.ancestor.mName)
        );
        if (!alreadyIncluded) {
          nextAncestors = [...nextAncestors, otherParentEntry];
        }
      }
    } catch (error) {
      console.log("Could not retrieve second parent for common ancestor display", error);
    }
  }

  if (nextAncestors.length < 2) {
    try {
      const pivotAncestorName = pathAnalysis.ancestorNode?.Name;
      if (!pivotAncestorName) return nextAncestors;

      const relatives = await WikiTreeAPI.getRelatives(
        WBE_DIST_REL_APP_ID,
        [pivotAncestorName],
        "Id,Name,Gender,FirstName,LastNameCurrent,LastNameAtBirth,BirthDateDecade,DeathDateDecade",
        { getSpouses: true }
      );

      const pivotPerson = relatives?.[0]?.person;
      const spouses = pivotPerson?.Spouses ? Object.values(pivotPerson.Spouses).filter((spouse) => spouse?.Name) : [];
      if (spouses.length === 0) return nextAncestors;

      const pivotGender = pathAnalysis.ancestorNode?.Gender;
      let spouse = spouses[0];
      if (pivotGender) {
        const oppositeGenderSpouse = spouses.find((candidate) => candidate?.Gender && candidate.Gender !== pivotGender);
        if (oppositeGenderSpouse) {
          spouse = oppositeGenderSpouse;
        }
      }

      const spouseEntry = asCommonAncestorEntry(spouse, pathAnalysis.upSteps, pathAnalysis.downSteps);
      if (!spouseEntry) return nextAncestors;

      const alreadyIncluded = nextAncestors.some(
        (ancestor) => String(ancestor?.ancestor?.mName || "") === String(spouseEntry.ancestor.mName)
      );
      return alreadyIncluded ? nextAncestors : [...nextAncestors, spouseEntry];
    } catch (error) {
      console.log("Could not retrieve spouse for second common ancestor display", error);
    }
  }

  return nextAncestors;
}

function isCacheRefreshDue(cacheRecord) {
  const updatedAt = Number(cacheRecord?.updatedAt || 0);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
    return true;
  }
  return Date.now() - updatedAt >= DIST_REL_REFRESH_INTERVAL_MS;
}

function attachDistanceHandlers(userID, profileID) {
  $(".distanceFromYou")
    .off("mouseenter.distRel mouseleave.distRel click.distRel")
    .on("mouseenter.distRel", function () {
      const offset = $(this).offset();
      const tooltip = $('<div id="distanceFromYouTooltip">Click to refresh</div>').css({
        top: offset.top + $(this).outerHeight() + 5,
        left: offset.left,
        position: "absolute",
      });
      $("body").append(tooltip);
    })
    .on("mouseleave.distRel", function () {
      $("#distanceFromYouTooltip").remove();
    })
    .on("click.distRel", function (e) {
      e.preventDefault();
      $("#distanceFromYouTooltip").remove();
      $(this).fadeOut("slow").remove();
      $(".yourRelationshipText").fadeOut("slow").remove();
      initDistanceAndRelationship(userID, profileID, true);
    });
}

function doRelationshipText(userID, profileID) {
  WikiTreeAPI.getConnections(
    WBE_DIST_REL_APP_ID,
    [userID, profileID],
    "Id,Name,Gender,FirstName,LastNameCurrent,LastNameAtBirth,BirthDateDecade,DeathDateDecade",
    { relation: 2 }
  )
    .then(async function (data) {
      let relationshipText = "";
      let commonAncestors = [];

      if (data && Array.isArray(data.path) && data.path.length > 0) {
        const pathAnalysis = analyzeAncestorPath(data.path);
        relationshipText = relationshipFromPathAnalysis(pathAnalysis, profilePerson.Gender);
        commonAncestors = commonAncestorsFromPath(data.path, pathAnalysis);
        commonAncestors = await augmentWithOtherParentCommonAncestor(userID, profileID, pathAnalysis, commonAncestors);
        commonAncestors = sortCommonAncestorsByGender(commonAncestors);
        addRelationshipText(relationshipText, cleanCommonAncestors(commonAncestors));
      }

      initRelationshipDB((event) => {
        const relationshipFinderDB = event.target.result;
        const obj = {
          theKey: distRelDbKeyFor(profileID, userID),
          userId: userID,
          id: profileID,
          distance: window.distance,
          relationship: relationshipText,
          commonAncestors: cleanCommonAncestors(commonAncestors),
          updatedAt: Date.now(),
        };
        addToDBAndClose(relationshipFinderDB, RELATIONSHIP_STORE_NAME, obj);
      });
    })
    .catch((error) => {
      console.log("Error while retrieving relationship from getConnections", error);
    });
}

const reducePathLength = (len) => {
  if (len > 0) return len - 1;
  return len;
};

async function addDistance(data) {
  const profileID = profilePerson.Name;
  const userID = getUserWtId();

  const pathLength = Number(data?.pathLength);
  if (Number.isFinite(pathLength) && pathLength > 0) {
    window.distance = pathLength - 1;
  } else if (Array.isArray(data?.path) && data.path.length > 0) {
    window.distance = data.path.length - 1;
  } else {
    window.distance = -1;
  }

  $(".distanceFromYou").remove();
  $("#distanceFromYouTooltip").remove();

  const profileName = profilePerson.FirstName;
  if (window.distance > 0) {
    $("#person h1").append(
      $(
        `<span class='distanceFromYou' title='${profileName} is ${window.distance} degrees from you.'>${window.distance}°</span>`
      )
    );
    attachDistanceHandlers(userID, profileID);
  }

  initDistanceDB((event) => {
    const connectionFinderDB = event.target.result;
    const obj = {
      theKey: distRelDbKeyFor(profileID, userID),
      userId: userID,
      id: profileID,
      distance: window.distance,
      updatedAt: Date.now(),
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
      updatedAt: Date.now(),
    };
    addToDBAndClose(relationshipFinderDB, RELATIONSHIP_STORE_NAME, obj);
  });
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
  const data = await WikiTreeAPI.getConnections(
    WBE_DIST_REL_APP_ID,
    [id1, id2],
    "Id,Name,Gender",
    { relation: 0 }
  );
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
  if (generation >= 0) {
    if (gender == "Female") {
      relType = "Mother";
    } else if (gender == "Male") {
      relType = "Father";
    } else {
      relType = "Parent";
    }
  }
  if (generation >= 1) {
    relType = "Grand" + relType.toLowerCase();
  }
  if (generation >= 2) {
    relType = "Great " + relType.toLowerCase();
  }
  if (generation >= 3) {
    relType = ordinal(generation - 1) + " " + relType;
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

function initDistanceAndRelationship(userID, profileID, clicked = false, clearExisting = true) {
  if (clearExisting) {
    $(".distanceFromYou").fadeOut().remove();
    $(".yourRelationshipText").fadeOut().remove();
  }
  if (clicked == true) {
    getDistance();
    doRelationshipText(userID, profileID);
  } else {
    WikiTreeAPI.getProfile(WBE_DIST_REL_APP_ID, profileID, "Privacy,Connected")
      .then(([person]) => {
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
