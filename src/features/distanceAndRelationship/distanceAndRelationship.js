/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { mainDomain, isProfileEdit, isProfilePage } from "../../core/pageType";
import { getProfilePersonInfo } from "../../core/common";
import { getObjectStores, distRelDbKeyFor, getUserWtId } from "../../core/common";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { getRelationJSON } from "../../core/API/wwwWikiTree";

export const CONNECTION_DB_NAME = "ConnectionFinderWTE";
export const CONNECTION_DB_VERSION = 2;
export const CONNECTION_STORE_NAME = "distance2";
export const RELATIONSHIP_DB_NAME = "RelationshipFinderWTE";
export const RELATIONSHIP_DB_VERSION = 2;
export const RELATIONSHIP_STORE_NAME = "relationship2";
let profilePerson;
let profileID;
let options = {};

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

const WBE_DIST_REL_APP_ID = "WBE_distance_and_relationship";
const DIST_REL_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const EN_DASH = "\u2013";

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
        addRelationshipText(getRelationReq.result.relationship, cleanCommonAncestors(sortedAncestors));
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
  // If the first common ancestor is a direct parent on both sides, render a short single-line label
  let cousinText;
  const firstIsDirectParent =
    Array.isArray(commonAncestors) &&
    commonAncestors.length > 0 &&
    Number(commonAncestors[0].path1Length) === 1 &&
    Number(commonAncestors[0].path2Length) === 1;

  if (firstIsDirectParent) {
    cousinText = $(
      `<div class='yourRelationshipText' title='Click to refresh' class='relationshipFinder'>Your ${oText}</div>`
    );
  } else {
    cousinText = $(
      `<div class='yourRelationshipText' title='Click to refresh' class='relationshipFinder'>Your ${oText}
      <ul class='yourCommonAncestor' style='white-space:nowrap'>${commonAncestorTextOut}</ul>
      </div>`
    );
  }
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
      // If this is a direct ancestor for both sides (parent), render a short label like "Your father" only.
      if (Number(commonAncestor.path1Length) === 1 && Number(commonAncestor.path2Length) === 1) {
        ancestorTextOut += `<li>Your ${myAncestorType}</li>`;
      } else {
        // Prefer explicit profile name when available: "is Ian's father" instead of "is his father"
        const profileFirstName = profilePerson?.FirstName || "";
        const profilePossessive = profileFirstName ? `${profileFirstName.replace(/'/g, "\\'")}'s` : possessiveAdj;
        ancestorTextOut += `<li>Your ${myAncestorType},
      <a href="https://${mainDomain}/wiki/${commonAncestor.ancestor.mName}">${commonAncestor.ancestor.mDerived.LongNameWithDates}</a>,
      is ${profilePossessive} ${thisAncestorType}.</li>`;
      }
      ancestorsAdded.push(commonAncestor.ancestor.mName);
    }
  });
  result.text = ancestorTextOut;
  result.count = ancestorsAdded.length;
  return result;
}

function sortCommonAncestorsByGender(commonAncestors) {
  if (!Array.isArray(commonAncestors)) return [];
  return [...commonAncestors].sort((a, b) => {
    const ga = (a?.ancestor?.mGender || "").toLowerCase();
    const gb = (b?.ancestor?.mGender || "").toLowerCase();
    const score = (g) => (g === "male" ? 0 : g === "female" ? 1 : 2);
    return score(ga) - score(gb);
  });
}

function cleanCommonAncestors(commonAncestors) {
  if (!Array.isArray(commonAncestors)) return [];
  return commonAncestors.map((ancestor) => {
    const { ancestor: anc = {}, ...rest } = ancestor || {};
    const mDerived = { LongNameWithDates: anc?.mDerived?.LongNameWithDates || longNameWithDatesFromPathPerson(anc) };
    return {
      ...rest,
      ancestor: {
        ...anc,
        mDerived,
      },
    };
  });
}

function fixOrdinalSuffix(s) {
  return s;
}

function normalizeDateRangeDashes(s) {
  if (!s || typeof s !== "string") return s;
  // Replace hyphen/minus/em/en dashes with a single en dash and trim whitespace around it
  return s.replace(/\s*[–—-]\s*/g, EN_DASH);
}

function isFiniteNumber(n) {
  return Number.isFinite(Number(n));
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
  if (stepsUp === 2) return `grand${base}`; // e.g. granduncle / grandaunt
  if (stepsUp === 3) return `great grand${base}`; // e.g. great granduncle
  return `${ordinal(stepsUp - 2)} great grand${base}`;
}

function nieceNephewType(stepsDown, gender) {
  const base = gender === "Male" ? "nephew" : gender === "Female" ? "niece" : "niece or nephew";
  if (stepsDown <= 1) return base;
  if (stepsDown === 2) return `grand${base}`; // e.g. grandnephew / grandniece
  if (stepsDown === 3) return `great grand${base}`;
  return `${ordinal(stepsDown - 2)} great grand${base}`;
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
    return auntUncleType(Math.max(upSteps - 1, 0), profileGender);
  }
  if (upSteps === 1 && downSteps >= 2) {
    return nieceNephewType(Math.max(downSteps - 1, 0), profileGender);
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

function synthesizeCommonAncestorsFromLegacyDoc(doc) {
  if (!doc) return [];
  const results = [];

  // Look for paragraphs that say "This makes X the father/mother/... of Y." or similar
  const paras = Array.from(doc.querySelectorAll("p"));
  const re = /This makes\s+(.+?)\s+the\s+([a-zA-Z ]+?)\s+of\s+([\s\S]+?)\./i;

  paras.forEach((p) => {
    const txt = p.textContent.replace(/\s+/g, " ").trim();
    const m = txt.match(re);
    if (m) {
      const ancestorLabel = m[1].trim();
      const rel = m[2].trim().toLowerCase();
      const subjectName = m[3].trim();

      // Try to find an option or link that contains the ancestor label to get an Id/Name
      let id = 0;
      let slug = ancestorLabel;
      const opt = Array.from(doc.querySelectorAll("select#trailSelection option, option")).find(
        (o) => o.textContent && o.textContent.includes(ancestorLabel)
      );
      if (opt && opt.value) id = Number(opt.value) || 0;
      const link = Array.from(p.querySelectorAll("a")).find(
        (a) => a.textContent && a.textContent.includes(ancestorLabel)
      );
      if (link && link.getAttribute("href")) {
        const href = link.getAttribute("href");
        const parts = href.split("/");
        const possible = parts.pop() || parts.pop();
        if (possible) slug = possible;
      }

      const role = rel.includes("father") || rel.includes("mother") || rel.includes("parent") ? "parent" : rel;

      const person = {
        Id: id,
        Name: slug || ancestorLabel,
        FirstName: ancestorLabel,
        LastNameCurrent: "",
        LastNameAtBirth: "",
        Gender:
          role === "parent" && /father/i.test(rel) ? "Male" : role === "parent" && /mother/i.test(rel) ? "Female" : "",
        BirthDateDecade: "?",
        DeathDateDecade: "?",
      };

      // Heuristic: set both sides to 1 (parent) so commonAncestorText renders "Your father" etc.
      const entry = asCommonAncestorEntry(person, 1, 1);
      if (entry) results.push(entry);
    }
  });

  return results;
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
      console.log("[WBE dist-rel] getRelatives (getParents) response for profile", profileID, relatives);

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
      console.log("[WBE dist-rel] getRelatives (getSpouses) response for pivot", pivotAncestorName, relatives);

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
      console.log("[WBE dist-rel] getConnections (relation=2) response:", data);
      let relationshipText = "";
      let commonAncestors = [];

      if (data && Array.isArray(data.path) && data.path.length > 0) {
        const pathAnalysis = analyzeAncestorPath(data.path);
        relationshipText = relationshipFromPathAnalysis(pathAnalysis, profilePerson.Gender);
        commonAncestors = commonAncestorsFromPath(data.path, pathAnalysis);
        commonAncestors = await augmentWithOtherParentCommonAncestor(userID, profileID, pathAnalysis, commonAncestors);
        commonAncestors = sortCommonAncestorsByGender(commonAncestors);
        addRelationshipText(relationshipText, cleanCommonAncestors(commonAncestors));
      } else {
        // No modern path returned — try legacy fallback (HTML/JSON Relationship endpoint).
        console.log("[WBE dist-rel] No path from getConnections; invoking legacy fallback");
        try {
          const legacy = await getRelationJSON("DistanceAndRelationship_Relationship", userID, profileID);
          console.log("[WBE dist-rel] getRelationJSON fallback response:", legacy);
          if (legacy) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(legacy.html || "", "text/html");

            const h2Element = doc.querySelector("h2");
            const noRelationship = h2Element && h2Element.textContent.trim() === "No Relationship Found";
            console.log("[WBE dist-rel] legacy html noRelationship:", noRelationship);

            if (!noRelationship) {
              const firstP = doc.querySelector("h3");
              const firstPText = firstP ? firstP.textContent.replace(/\s+/g, " ").trim() : "";
              console.log("[WBE dist-rel] legacy firstPText:", firstPText);

              let derivedRelationship = "";

              // Try to extract relationship phrases robustly. Examples:
              // "[Private] is Ian's niece" -> "niece"
              // "X is the 2nd great grand uncle of Y" -> "2nd great grand uncle"
              // "X and Y are cousins" -> "cousin"
              // First, try simple markers
              if (firstPText.includes("is the")) {
                derivedRelationship = firstPText.split("is the ")[1].split(" of")[0];
              } else if (firstPText.includes(" are ")) {
                derivedRelationship = firstPText
                  .split("are ")[1]
                  .replace(/cousins/, "cousin")
                  .replace(/siblings/, "sibling");
              } else if (firstPText.includes(" is ")) {
                derivedRelationship = firstPText.split(" is ")[1].trim();
              }

              // If above heuristics didn't yield a clean relation, try regex to find relationship keywords
              if (!derivedRelationship) {
                const relRegex =
                  /((?:\d+(?:st|nd|rd|th)|first|second|third|\w+)?\s*(?:great\s+){0,2}(?:grand\s*)?(?:uncle|aunt|nephew|niece|cousin|sibling|brother|sister|father|mother|grandfather|grandmother))/i;
                const m = firstPText.match(relRegex);
                if (m) derivedRelationship = m[1];
              }

              // Normalize possessives like "Ian's niece" -> "niece"
              if (derivedRelationship) {
                const possessiveMatch = derivedRelationship.match(/(?:[A-Za-z0-9_]+(?:'s|’s)\s+)?(.+)/);
                if (possessiveMatch && possessiveMatch[1]) {
                  derivedRelationship = possessiveMatch[1].trim();
                }

                // Determine whether the legacy sentence names the user as subject or object.
                const userDataEl = document.getElementById("userData");
                const userColloq = (userDataEl && userDataEl.dataset && userDataEl.dataset.mcolloquialname) || "";
                const splitMatch = firstPText.match(/\s+(is|are)\s+/i);
                let subject = "";
                let predicate = firstPText;
                if (splitMatch) {
                  const parts = firstPText.split(new RegExp("\\s+(?:is|are)\\s+", "i"));
                  subject = (parts[0] || "").trim();
                  predicate = (parts.slice(1).join(" ") || "").trim();
                }
                const predicateHasUser = userColloq && predicate.toLowerCase().includes(userColloq.toLowerCase());
                const subjectHasUser = userColloq && subject.toLowerCase().includes(userColloq.toLowerCase());
                console.log("[WBE dist-rel] legacy parse debug:", {
                  userColloq,
                  subject,
                  predicate,
                  subjectHasUser,
                  predicateHasUser,
                  profileGender: profilePerson?.Gender,
                });

                // Only invert nephew/niece -> aunt/uncle when the user is the subject ("Ian is Mary's nephew")
                if (/nephew|niece/.test(derivedRelationship)) {
                  if (subjectHasUser) {
                    const auntUncle =
                      profilePerson.Gender === "Male"
                        ? "uncle"
                        : profilePerson.Gender === "Female"
                        ? "aunt"
                        : "uncle or aunt";
                    if (/(nephew|niece) or (nephew|niece)/.test(derivedRelationship)) {
                      derivedRelationship = derivedRelationship
                        .replace(/nephew/, auntUncle)
                        .replace(/niece/, auntUncle);
                    } else {
                      derivedRelationship = derivedRelationship.replace(/nephew|niece/, auntUncle);
                    }
                  } else {
                    // predicateHasUser or neither -> leave niece/nephew as-is (profile is niece/nephew)
                  }
                }

                let relationshipParts = derivedRelationship.split(" ");
                relationshipParts[0] = ordinalWordToNumberAndSuffix(relationshipParts[0]);
                relationshipText = fixOrdinalSuffix(relationshipParts.join(" "));
                console.log("[WBE dist-rel] derived relationshipText from legacy:", relationshipText);
              }
            }

            // If legacy returned commonAncestors, normalize and use them
            if (Array.isArray(legacy.commonAncestors) && legacy.commonAncestors.length > 0) {
              console.log("[WBE dist-rel] legacy commonAncestors raw:", legacy.commonAncestors);
              console.log("[WBE dist-rel] legacy commonAncestors count:", legacy.commonAncestors.length);
              commonAncestors = legacy.commonAncestors.map((ca) => {
                const rawP1 = Number(ca.path1Length);
                const rawP2 = Number(ca.path2Length);
                const normP1 = reducePathLength(isFiniteNumber(rawP1) ? rawP1 : 0);
                const normP2 = reducePathLength(isFiniteNumber(rawP2) ? rawP2 : 0);
                const mapped = {
                  ...ca,
                  rawPath1Length: rawP1,
                  rawPath2Length: rawP2,
                  path1Length: normP1,
                  path2Length: normP2,
                  ancestor: {
                    ...ca.ancestor,
                    mDerived: {
                      LongNameWithDates: normalizeDateRangeDashes(ca.ancestor.mDerived.LongNameWithDates),
                    },
                  },
                };

                // Emit mapping diagnostics to help debug parent/grandparent off-by-one
                try {
                  const myAncestorType = ancestorType(mapped.path1Length - 1, mapped.ancestor.mGender);
                  const thisAncestorType = ancestorType(mapped.path2Length - 1, mapped.ancestor.mGender);
                  console.log("[WBE dist-rel] legacy CA mapping:", {
                    name: mapped.ancestor.mName,
                    rawP1,
                    rawP2,
                    normP1,
                    normP2,
                    myAncestorType,
                    thisAncestorType,
                  });
                } catch (e) {
                  console.log("[WBE dist-rel] error computing CA mapping types", e, ca);
                }

                return mapped;
              });
              console.log("[WBE dist-rel] legacy commonAncestors normalized:", commonAncestors);
              commonAncestors = sortCommonAncestorsByGender(commonAncestors);
            }

            // If there were no structured commonAncestors, try to synthesize them
            if ((!Array.isArray(legacy.commonAncestors) || legacy.commonAncestors.length === 0) && doc) {
              const synthesized = synthesizeCommonAncestorsFromLegacyDoc(doc);
              if (synthesized && synthesized.length > 0) {
                console.log("[WBE dist-rel] synthesized commonAncestors from legacy HTML:", synthesized);
                // Synthesized entries are already in the 'upSteps/downSteps' convention
                commonAncestors = synthesized.map((ca) => ({
                  ...ca,
                  path1Length: Number(ca.path1Length || 1),
                  path2Length: Number(ca.path2Length || 1),
                  ancestor: {
                    ...ca.ancestor,
                    mDerived: {
                      LongNameWithDates: normalizeDateRangeDashes(ca.ancestor.mDerived.LongNameWithDates),
                    },
                  },
                }));
                commonAncestors = sortCommonAncestorsByGender(commonAncestors);

                // If we don't yet have an overall relationshipText, derive one from the synthesized ancestor
                if (!relationshipText && Array.isArray(commonAncestors) && commonAncestors.length > 0) {
                  try {
                    const first = commonAncestors[0];
                    relationshipText =
                      ancestorType(first.path1Length - 1, first.ancestor.mGender)?.toLowerCase() || "relative";
                    console.log("[WBE dist-rel] synthesized derived relationshipText:", relationshipText);

                    // If distance isn't set by getConnections, synthesize a sensible distance (parent => 1)
                    if (!Number.isFinite(window.distance) || window.distance <= 0) {
                      const guessedDistance = Math.max((first.path1Length || 1) - 1, 1);
                      window.distance = guessedDistance;
                      // Render distance badge
                      $(".distanceFromYou").remove();
                      if (window.distance > 0) {
                        const profileName = profilePerson?.FirstName || "Profile";
                        $("#person h1").append(
                          $(
                            `<span class='distanceFromYou' title='${profileName} is ${window.distance} degrees from you.'>${window.distance}°</span>`
                          )
                        );
                        attachDistanceHandlers(userID, profileID);
                      }
                    }
                  } catch (e) {
                    console.log("[WBE dist-rel] error deriving relationshipText from synthesized CA", e);
                  }
                }
              }
            }

            // Always attempt to display the derived relationshipText even if no commonAncestors
            addRelationshipText(relationshipText, cleanCommonAncestors(commonAncestors));
          }
        } catch (err) {
          console.log("[WBE dist-rel] legacy fallback error:", err);
        }
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
  const data = await WikiTreeAPI.getConnections(WBE_DIST_REL_APP_ID, [id1, id2], "Id,Name,Gender", { relation: 0 });
  console.log("[WBE dist-rel] getConnections (relation=0) response:", data);
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
        console.log("[WBE dist-rel] getProfile response:", person);
        // If getProfile returned an empty object (often due to privacy),
        // proceed anyway so the relationship flow (which includes a legacy
        // fallback) can attempt to determine relationships.
        if (!person || Object.keys(person).length === 0) {
          console.log("[WBE dist-rel] getProfile empty — proceeding to relationship flow (legacy fallback enabled)");
          getDistance();
          doRelationshipText(userID, profileID);
          return;
        }

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
