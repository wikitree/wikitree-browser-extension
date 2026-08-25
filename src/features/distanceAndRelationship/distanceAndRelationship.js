/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { mainDomain, isProfileEdit, isProfilePage } from "../../core/pageType";
import { getProfilePersonInfo } from "../../core/common";
import { getObjectStores, distRelDbKeyFor, getUserWtId } from "../../core/common";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { getConnectionJSON, getRelationJSON } from "../../core/API/wwwWikiTree";
import { deriveRelationshipFromLegacyDoc } from "./legacyRelationshipParser";

export const CONNECTION_DB_NAME = "ConnectionFinderWTE";
export const CONNECTION_DB_VERSION = 2;
export const CONNECTION_STORE_NAME = "distance2";
export const RELATIONSHIP_DB_NAME = "RelationshipFinderWTE";
export const RELATIONSHIP_DB_VERSION = 2;
export const RELATIONSHIP_STORE_NAME = "relationship2";
let profilePerson;
let profileID;
let options = {};

// For testing: view a profile as if logged in as another member by adding URL parameters, e.g.
//   https://www.wikitree.com/wiki/Combs-1234?wbe_test_as=Combs-9000&wbe_test_as_name=Major
//   wbe_test_as       WT ID of the member to impersonate (or set the testAs constant below)
//   wbe_test_as_name  their colloquial (preferred first) name; fetched from the API if omitted
// While impersonating, cached distance/relationship records are neither read nor written.
const testAs = null;

function getTestAsParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    id: params.get("wbe_test_as") || testAs,
    name: params.get("wbe_test_as_name") || "",
  };
}

function isTestAsActive() {
  return Boolean(getTestAsParams().id);
}

function getEffectiveUserId() {
  return getTestAsParams().id || getUserWtId();
}

let testAsColloquialName = null;
async function getEffectiveUserColloquialName() {
  const { id, name } = getTestAsParams();
  if (!id) {
    return document.getElementById("userData")?.dataset?.mcolloquialname || "";
  }
  if (name) return name;
  if (testAsColloquialName == null) {
    try {
      const [person] = await WikiTreeAPI.getProfile(WBE_DIST_REL_APP_ID, id, "RealName,FirstName");
      testAsColloquialName = person?.RealName || person?.FirstName || "";
      console.log("[WBE dist-rel] test-as colloquial name from API:", testAsColloquialName);
    } catch (error) {
      console.log("[WBE dist-rel] could not fetch test-as colloquial name", error);
      testAsColloquialName = "";
    }
  }
  return testAsColloquialName;
}

// When true, manual click refreshes use the legacy getConnectionJSON/getRelationJSON endpoints
// instead of the WikiTreeAPI.getConnections path, and the result is stored with source:"legacy"
// so it is never silently overwritten by a stale API result.
// Set to false once the WikiTree getConnections path-computation bug is fixed.
const PREFER_LEGACY_ON_MANUAL_REFRESH = true;

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

  const userID = getEffectiveUserId();

  if (result && isProfilePage && profileID != userID && profileID != "") {
    import("./distanceAndRelationship.css");
    options = await getFeatureOptions("distanceAndRelationship");
    if (isTestAsActive()) {
      // Compute fresh as the impersonated user; skip the cache entirely.
      console.log("[WBE dist-rel] test-as mode active:", getTestAsParams());
      initDistanceAndRelationship(userID, profileID);
    } else {
      initDistanceAndRelationshipDBs(
        (event) => onDistancesSuccess(event, profileID, userID),
        (event) => onRelationsSuccess(event, profileID, userID)
      );
    }
    if (options.alignImageAndCopyButtonsToTop) {
      $("#person .page--title").removeClass("align-items-lg-center");
    }
  }
});

// Set when a fresh relationship computation has been kicked off, so the two
// parallel cache callbacks (distance and relationship) don't start duplicate fetches.
let relationshipFlowStarted = false;

function onRelationsSuccess(event, profileID, userID) {
  const db = event.target.result;
  getDistRelCacheRecord(db, RELATIONSHIP_STORE_NAME, profileID, userID, (relationRecord) => {
    if (relationRecord != undefined) {
      if ($(".yourRelationshipText").length < 2) {
        const sortedAncestors = sortCommonAncestorsByCouple(relationRecord.commonAncestors);
        addRelationshipText(relationRecord.relationship, cleanCommonAncestors(sortedAncestors));
      }
    } else {
      // A distance record can exist without a relationship record (e.g. after a failed
      // or interrupted write), and the distance path never refetches while its cache is
      // fresh - so the relationship (text, and the record the ancestor badges rely on)
      // would stay missing until the distance cache goes stale. Fetch it directly,
      // after a short delay so a full init started by the distance path wins.
      setTimeout(() => {
        if (!relationshipFlowStarted) {
          console.log("[WBE dist-rel] no cached relationship record; fetching relationship directly");
          doRelationshipText(userID, profileID);
        }
      }, 500);
    }
  });
}

// Do it
function onDistancesSuccess(event, profileID, userID) {
  const db = event.target.result;
  getDistRelCacheRecord(db, CONNECTION_STORE_NAME, profileID, userID, (distanceRecord) => {
    if (distanceRecord == undefined || distanceRecord?.distance < 0) {
      initDistanceAndRelationship(userID, profileID);
    } else {
      const profileName = profilePerson.FirstName;
      $("#person h1").append(
        $(
          `<span class='distanceFromYou' title='${profileName} is ${distanceRecord.distance} degrees from you. \nClick to refresh.'>${distanceRecord.distance}°</span>`
        )
      );
      attachDistanceHandlers(userID, profileID);

      if (isCacheRefreshDue(distanceRecord)) {
        console.log("Distance/relationship cache is stale, refreshing in background");
        initDistanceAndRelationship(userID, profileID, false, false);
      }
    }
  });
}

function normalizeWtIdForLookup(wtId) {
  return String(wtId || "")
    .trim()
    .toLowerCase();
}

function getDistRelCacheRecord(db, storeName, profileID, userID, onRecord) {
  const transaction = db.transaction(storeName, "readonly");
  const objectStore = transaction.objectStore(storeName);
  const exactKey = distRelDbKeyFor(profileID, userID);
  const getReq = objectStore.get(exactKey);

  getReq.onsuccess = () => {
    if (getReq.result != undefined) {
      onRecord(getReq.result);
      return;
    }

    // If exact key misses, fall back to matching by profile ID. This keeps cached values visible
    // when a user ID is temporarily unavailable (for example, apps-server auth/session mismatch).
    const profileIdNorm = String(profileID || "").trim();
    const userIdNorm = normalizeWtIdForLookup(userID);
    let latestAnyUserMatch;
    let latestSameUserMatch;
    const cursorReq = objectStore.openCursor();

    cursorReq.onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor) {
        onRecord(latestSameUserMatch || latestAnyUserMatch);
        return;
      }

      const value = cursor.value;
      if (String(value?.id || "").trim() === profileIdNorm) {
        const currentUpdatedAt = Number(value?.updatedAt || 0);

        if (!latestAnyUserMatch || currentUpdatedAt > Number(latestAnyUserMatch?.updatedAt || 0)) {
          latestAnyUserMatch = value;
        }

        if (userIdNorm) {
          const valueUserIdNorm = normalizeWtIdForLookup(value?.userId);
          if (valueUserIdNorm && valueUserIdNorm === userIdNorm) {
            if (!latestSameUserMatch || currentUpdatedAt > Number(latestSameUserMatch?.updatedAt || 0)) {
              latestSameUserMatch = value;
            }
          }
        }
      }

      cursor.continue();
    };

    cursorReq.onerror = (error) => {
      console.log(`Error while scanning ${storeName} DB for fallback cache record`, error);
      onRecord(undefined);
    };
  };

  getReq.onerror = (error) => {
    console.log(`Error while retrieving ${storeName} from DB`, error);
    onRecord(undefined);
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
      <ul class='yourCommonAncestor'>${commonAncestorTextOut}</ul>
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
    let id1 = getEffectiveUserId();
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

// Common ancestors usually come in couples. Keep each couple together (ancestors the
// same number of steps from both people) rather than listing all the men and then all
// the women, and put the father before the mother within each couple.
function sortCommonAncestorsByCouple(commonAncestors) {
  if (!Array.isArray(commonAncestors)) return [];
  const genderScore = (entry) => {
    const gender = (entry?.ancestor?.mGender || "").toLowerCase();
    return gender === "male" ? 0 : gender === "female" ? 1 : 2;
  };
  const pathLengths = (entry) => [Number(entry?.path1Length) || 0, Number(entry?.path2Length) || 0];
  const coupleKey = (entry) => pathLengths(entry).join("|");

  const couples = new Map();
  commonAncestors.forEach((entry) => {
    const key = coupleKey(entry);
    if (!couples.has(key)) {
      couples.set(key, { total: pathLengths(entry).reduce((sum, n) => sum + n, 0), entries: [] });
    }
    couples.get(key).entries.push(entry);
  });

  // Closest couple first; sort is stable, so equally distant couples keep their original order.
  return [...couples.values()]
    .sort((a, b) => a.total - b.total)
    .flatMap((couple) => [...couple.entries].sort((a, b) => genderScore(a) - genderScore(b)));
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

function estimateDistanceFromRelationship(relationshipText) {
  const rel = String(relationshipText || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!rel) return null;

  if (rel === "self") return 0;
  if (/\bsibling\b|\bbrother\b|\bsister\b/.test(rel)) return 1;

  // Cousins: 1st cousin => 4, 2nd cousin => 6, etc. + removed count.
  const cousinMatch = rel.match(/^(\d+)(?:st|nd|rd|th)? cousin(?: (once|twice|\d+ times) removed)?$/);
  if (cousinMatch) {
    const n = Number(cousinMatch[1]);
    let removed = 0;
    const rem = cousinMatch[2] || "";
    if (rem === "once") removed = 1;
    else if (rem === "twice") removed = 2;
    else {
      const m = rem.match(/(\d+) times/);
      if (m) removed = Number(m[1]);
    }
    return 2 * (n + 1) + removed;
  }
  if (/^cousin(?: (once|twice|\d+ times) removed)?$/.test(rel)) {
    const remMatch = rel.match(/(once|twice|\d+ times) removed/);
    if (!remMatch) return 4;
    if (remMatch[1] === "once") return 5;
    if (remMatch[1] === "twice") return 6;
    const m = remMatch[1].match(/(\d+) times/);
    return 4 + (m ? Number(m[1]) : 0);
  }

  const hasGrand = /\bgrand/.test(rel);
  const greatCount = (rel.match(/\bgreat\b/g) || []).length;
  const ordinalGreat = rel.match(/^(\d+)(?:st|nd|rd|th)? great\b/);
  const extraGreat = ordinalGreat ? Math.max(Number(ordinalGreat[1]) - 1, 0) : 0;
  const totalGreat = greatCount + extraGreat;

  // direct ancestor/descendant families
  if (/\bfather\b|\bmother\b|\bparent\b|\bson\b|\bdaughter\b|\bchild\b/.test(rel)) {
    // parent/child = 1; grand* = 2; each great adds 1.
    if (!hasGrand) return 1;
    return 2 + totalGreat;
  }

  // avuncular families
  if (/\buncle\b|\baunt\b|\bnephew\b|\bniece\b/.test(rel)) {
    // uncle/nephew = 2; grand* = 3; each great adds 1.
    if (!hasGrand) return 2;
    return 3 + totalGreat;
  }

  return null;
}

function isUpPathType(pathType) {
  // Accept both string pathType values (e.g. 'parent') and numeric codes (e.g. 1)
  if (pathType === null || pathType === undefined) return false;
  // Numeric codes returned by newer API variants
  if (typeof pathType === "number" || String(pathType).match(/^\d+$/)) {
    const n = Number(pathType);
    // 1 -> up/parent (heuristic mapping)
    return n === 1;
  }
  const s = String(pathType || "").toLowerCase();
  // Match exact tokens or substrings like 'bioparent' or 'adoptive parent'
  return s.includes("parent") || s.includes("father") || s.includes("mother");
}

function isDownPathType(pathType) {
  // Accept both string pathType values (e.g. 'child') and numeric codes (e.g. 2)
  if (pathType === null || pathType === undefined) return false;
  if (typeof pathType === "number" || String(pathType).match(/^\d+$/)) {
    const n = Number(pathType);
    // 2 -> down/child (heuristic mapping)
    return n === 2;
  }
  const s = String(pathType || "").toLowerCase();
  return s.includes("child") || s.includes("son") || s.includes("daughter");
}

function removedText(removed) {
  if (removed === 1) return " once removed";
  if (removed === 2) return " twice removed";
  return ` ${removed} times removed`;
}

function yearFromDate(value) {
  const text = String(value || "").trim();
  if (!text || text === "0000-00-00") return "";
  const match = text.match(/^(\d{4})/);
  if (!match) return "";
  return match[1] === "0000" ? "" : match[1];
}

function yearFromDecade(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/^(\d{3})0s$/);
  return match ? `${match[1]}0` : "";
}

function certaintyPrefixFromDataStatus(pathPerson, fieldName) {
  const status = String(pathPerson?.DataStatus?.[fieldName] || "")
    .trim()
    .toLowerCase();
  if (status === "guess") return "abt. ";
  if (status === "before") return "bef. ";
  if (status === "after") return "aft. ";
  return "";
}

function longNameWithDatesFromPathPerson(pathPerson) {
  const firstName = pathPerson.FirstName || "";
  const lastName = pathPerson.LastNameCurrent || pathPerson.LastNameAtBirth || "";
  const baseName = [firstName, lastName].filter(Boolean).join(" ").trim() || pathPerson.Name || "Unknown";
  const birthYear = yearFromDate(pathPerson.BirthDate) || yearFromDecade(pathPerson.BirthDateDecade) || "?";
  const deathYear = yearFromDate(pathPerson.DeathDate) || yearFromDecade(pathPerson.DeathDateDecade) || "?";
  const birthPrefix = birthYear !== "?" ? certaintyPrefixFromDataStatus(pathPerson, "BirthDate") : "";
  const deathPrefix = deathYear !== "?" ? certaintyPrefixFromDataStatus(pathPerson, "DeathDate") : "";
  return `${baseName} (${birthPrefix}${birthYear}${EN_DASH}${deathPrefix}${deathYear})`;
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

function pathTypeToken(node) {
  return String(node?.pathType || "")
    .trim()
    .toLowerCase();
}

function pathStatusToken(node) {
  const status = node?.pathStatus;
  return Number.isFinite(Number(status)) ? Number(status) : String(status || "");
}

function pathsMatchExceptAncestor(firstPath, secondPath, ancestorIndex) {
  if (!Array.isArray(firstPath) || !Array.isArray(secondPath)) return false;
  if (firstPath.length !== secondPath.length) return false;
  if (ancestorIndex < 0 || ancestorIndex >= firstPath.length) return false;

  for (let index = 0; index < firstPath.length; index++) {
    if (index === ancestorIndex) continue;

    const a = firstPath[index] || {};
    const b = secondPath[index] || {};

    if (Number(a?.Id) !== Number(b?.Id)) {
      return false;
    }

    if (pathTypeToken(a) !== pathTypeToken(b)) {
      return false;
    }

    if (pathStatusToken(a) !== pathStatusToken(b)) {
      return false;
    }
  }

  return true;
}

async function getOtherMostRecentCommonAncestor(userID, profileID, firstData, firstPathAnalysis) {
  const ignoredAncestorId = Number(firstPathAnalysis?.ancestorNode?.Id);
  if (!Number.isFinite(ignoredAncestorId) || ignoredAncestorId <= 0) {
    return null;
  }

  try {
    const secondData = await WikiTreeAPI.getConnections(
      WBE_DIST_REL_APP_ID,
      [userID, profileID],
      "Id,Name,Gender,FirstName,LastNameCurrent,LastNameAtBirth,BirthDate,DeathDate,BirthDateDecade,DeathDateDecade,DataStatus",
      { relation: 2, ignoreIds: [ignoredAncestorId] }
    );
    console.log("[WBE dist-rel] getConnections (relation=2, ignoreIds) response:", {
      ignoredAncestorId,
      secondData,
    });

    if (!Array.isArray(secondData?.path) || secondData.path.length === 0) {
      return null;
    }

    const secondPathAnalysis = analyzeAncestorPath(secondData.path);

    const samePathShape =
      secondPathAnalysis.upSteps === firstPathAnalysis.upSteps &&
      secondPathAnalysis.downSteps === firstPathAnalysis.downSteps &&
      secondPathAnalysis.ancestorIndex === firstPathAnalysis.ancestorIndex;
    if (!samePathShape) {
      return null;
    }

    if (!pathsMatchExceptAncestor(firstData.path, secondData.path, firstPathAnalysis.ancestorIndex)) {
      return null;
    }

    const secondAncestor = secondPathAnalysis.ancestorNode;
    if (!secondAncestor?.Name) {
      return null;
    }

    if (Number(secondAncestor?.Id) === ignoredAncestorId) {
      return null;
    }

    return secondAncestor;
  } catch (error) {
    console.log("Could not retrieve second MRCA using ignoreIds", error);
    return null;
  }
}

async function augmentWithOtherParentCommonAncestor(userID, profileID, data, pathAnalysis, commonAncestors) {
  if (!(pathAnalysis.upSteps >= 1 && pathAnalysis.downSteps >= 1)) {
    return commonAncestors;
  }

  let nextAncestors = commonAncestors;

  if (pathAnalysis.downSteps === 1) {
    try {
      const relatives = await WikiTreeAPI.getRelatives(
        WBE_DIST_REL_APP_ID,
        [profileID],
        "Id,Name,Gender,FirstName,LastNameCurrent,LastNameAtBirth,BirthDate,DeathDate,BirthDateDecade,DeathDateDecade,DataStatus",
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
    const otherMrca = await getOtherMostRecentCommonAncestor(userID, profileID, data, pathAnalysis);
    if (otherMrca) {
      const otherMrcaEntry = asCommonAncestorEntry(otherMrca, pathAnalysis.upSteps, pathAnalysis.downSteps);
      if (otherMrcaEntry) {
        const alreadyIncluded = nextAncestors.some(
          (ancestor) => String(ancestor?.ancestor?.mName || "") === String(otherMrcaEntry.ancestor.mName)
        );
        if (!alreadyIncluded) {
          return [...nextAncestors, otherMrcaEntry];
        }
      }
    }
  }

  return nextAncestors;
}

function isCacheRefreshDue(cacheRecord) {
  // Never silently overwrite a result that was obtained via the legacy endpoint;
  // the user explicitly chose that result with a manual refresh.
  if (cacheRecord?.source === "legacy") return false;
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

function doRelationshipText(userID, profileID, source = "api") {
  relationshipFlowStarted = true;
  // When source is "legacy", skip the getConnections API entirely and let the
  // legacy getRelationJSON fallback handle the full response.
  const connectionPromise =
    source === "legacy"
      ? Promise.resolve(null)
      : WikiTreeAPI.getConnections(
          WBE_DIST_REL_APP_ID,
          [userID, profileID],
          "Id,Name,Gender,FirstName,LastNameCurrent,LastNameAtBirth,BirthDate,DeathDate,BirthDateDecade,DeathDateDecade,DataStatus",
          { relation: 2 }
        );
  connectionPromise
    .then(async function (data) {
      console.log("[WBE dist-rel] getConnections (relation=2) response:", data);
      try {
        if (data && Array.isArray(data.path)) {
          console.log(
            "[WBE dist-rel] raw path types:",
            data.path.map((n) => ({ Id: n.Id, Name: n.Name, pathType: n.pathType }))
          );
        }
      } catch (e) {
        console.log("[WBE dist-rel] error logging raw path types:", e);
      }
      let relationshipText = "";
      let commonAncestors = [];

      if (data && Array.isArray(data.path) && data.path.length > 0) {
        // If path entries are present but the per-node pathType is missing for
        // simple two-node paths, attempt to infer parent/child direction from
        // the API (this avoids incorrectly treating the relation as 'self').
        if (Array.isArray(data.path) && data.path.length === 2 && !data.path[1].pathType) {
          try {
            const pivot = data.path[1]; // index 1 is the profile in getConnections(user, profile)
            // Ask the API for relatives of the profile to determine if the
            // first node (user) is a parent or child.
            const rels = await WikiTreeAPI.getRelatives(
              WBE_DIST_REL_APP_ID,
              [pivot.Name || pivot.Id || profileID],
              "Id,Name,Gender",
              { getParents: true, getChildren: true }
            );
            const person = rels?.[0]?.person || {};
            const parents = person?.Parents ? Object.values(person.Parents).map((p) => Number(p.Id)) : [];
            const children = person?.Children ? Object.values(person.Children).map((c) => Number(c.Id)) : [];
            const otherId = Number(data.path[0].Id);
            if (parents.includes(otherId)) {
              // Other is a parent of pivot -> pivot is child of other
              data.path[1].pathType = "child";
            } else if (children.includes(otherId)) {
              // Other is a child of pivot -> pivot is parent of other
              data.path[1].pathType = "parent";
            }
          } catch (err) {
            console.log("Could not infer missing pathType for two-node path", err);
          }
        }

        const pathAnalysis = analyzeAncestorPath(data.path);
        relationshipText = relationshipFromPathAnalysis(pathAnalysis, profilePerson.Gender);
        commonAncestors = commonAncestorsFromPath(data.path, pathAnalysis);
        commonAncestors = await augmentWithOtherParentCommonAncestor(
          userID,
          profileID,
          data,
          pathAnalysis,
          commonAncestors
        );
        commonAncestors = sortCommonAncestorsByCouple(commonAncestors);
        addRelationshipText(relationshipText, cleanCommonAncestors(commonAncestors));
      } else {
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
              const derivedRelationship = deriveRelationshipFromLegacyDoc(doc, {
                profilePerson,
                profileID,
                userWtIdRaw: getEffectiveUserId(),
                userColloquialNameRaw: await getEffectiveUserColloquialName(),
                legacyCommonAncestors: legacy.commonAncestors,
              });

              if (derivedRelationship) {
                let relationshipParts = derivedRelationship.split(" ");
                relationshipParts[0] = ordinalWordToNumberAndSuffix(relationshipParts[0]);
                relationshipText = fixOrdinalSuffix(relationshipParts.join(" "));
                console.log("[WBE dist-rel] derived relationshipText from legacy:", relationshipText);

                // If modern distance was not available (privacy/no path), estimate from relationship label.
                if (!Number.isFinite(window.distance) || window.distance <= 0) {
                  const estimatedDistance = estimateDistanceFromRelationship(relationshipText);
                  if (Number.isFinite(estimatedDistance) && estimatedDistance > 0) {
                    window.distance = estimatedDistance;
                    console.log("[WBE dist-rel] estimated distance from legacy relationship:", {
                      relationshipText,
                      estimatedDistance,
                    });

                    $(".distanceFromYou").remove();
                    const profileName = profilePerson?.FirstName || "Profile";
                    $("#person h1").append(
                      $(
                        `<span class='distanceFromYou' title='${profileName} is ${window.distance} degrees from you.'>${window.distance}°</span>`
                      )
                    );
                    attachDistanceHandlers(userID, profileID);

                    if (!isTestAsActive()) {
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
                    }
                  }
                }
              }
            }

            if (Array.isArray(legacy.commonAncestors) && legacy.commonAncestors.length > 0) {
              console.log("[WBE dist-rel] legacy commonAncestors raw:", legacy.commonAncestors);
              commonAncestors = legacy.commonAncestors.map((ca) => ({
                ...ca,
                path1Length: reducePathLength(Number(ca.path1Length) || 0),
                path2Length: reducePathLength(Number(ca.path2Length) || 0),
                ancestor: {
                  ...ca.ancestor,
                  mDerived: {
                    LongNameWithDates: normalizeDateRangeDashes(ca?.ancestor?.mDerived?.LongNameWithDates || ""),
                  },
                },
              }));
              commonAncestors = sortCommonAncestorsByCouple(commonAncestors);
              console.log("[WBE dist-rel] legacy commonAncestors normalized:", commonAncestors);
            }

            addRelationshipText(relationshipText, cleanCommonAncestors(commonAncestors));
          }
        } catch (err) {
          console.log("[WBE dist-rel] legacy fallback error:", err);
        }
      }

      if (!isTestAsActive()) {
        initRelationshipDB((event) => {
          const relationshipFinderDB = event.target.result;
          const obj = {
            theKey: distRelDbKeyFor(profileID, userID),
            userId: userID,
            id: profileID,
            distance: window.distance,
            relationship: relationshipText,
            commonAncestors: cleanCommonAncestors(commonAncestors),
            source,
            updatedAt: Date.now(),
          };
          addToDBAndClose(relationshipFinderDB, RELATIONSHIP_STORE_NAME, obj);
        });
      }
    })
    .catch((error) => {
      console.log("Error while retrieving relationship from getConnections", error);
    });
}

const reducePathLength = (len) => {
  if (len > 0) return len - 1;
  return len;
};

async function addDistance(data, source = "api") {
  const profileID = profilePerson.Name;
  const userID = getEffectiveUserId();

  const pathLength = Number(data?.pathLength);
  if (Number.isFinite(pathLength) && pathLength > 0) {
    window.distance = pathLength - 1;
  } else if (Array.isArray(data?.path) && data.path.length > 0) {
    window.distance = data.path.length - 1;
  } else {
    window.distance = -1;
  }

  // Privacy-blocked or otherwise unavailable distance results should not clobber
  // existing cached values (or remove currently rendered UI).
  if (!(window.distance > 0)) {
    console.log("[WBE dist-rel] Distance unavailable; preserving existing cache/UI", {
      profileID,
      userID,
      status: data?.status,
      pathLength: data?.pathLength,
      pathSize: Array.isArray(data?.path) ? data.path.length : null,
    });
    return;
  }

  $(".distanceFromYou").remove();
  $("#distanceFromYouTooltip").remove();

  const profileName = profilePerson.FirstName;
  $("#person h1").append(
    $(
      `<span class='distanceFromYou' title='${profileName} is ${window.distance} degrees from you.'>${window.distance}°</span>`
    )
  );
  attachDistanceHandlers(userID, profileID);

  if (isTestAsActive()) return;

  initDistanceDB((event) => {
    const connectionFinderDB = event.target.result;
    const obj = {
      theKey: distRelDbKeyFor(profileID, userID),
      userId: userID,
      id: profileID,
      distance: window.distance,
      source,
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
      source,
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

async function getDistance(source = "api") {
  const id2 = profileID;
  const id1 = getEffectiveUserId();

  const hasUsablePath = (result) => {
    const pathLength = Number(result?.pathLength);
    return (Number.isFinite(pathLength) && pathLength > 0) || (Array.isArray(result?.path) && result.path.length > 0);
  };

  let data;
  if (source !== "legacy") {
    try {
      data = await WikiTreeAPI.getConnections(WBE_DIST_REL_APP_ID, [id1, id2], "Id,Name,Gender", { relation: 0 });
      console.log("[WBE dist-rel] getConnections (relation=0) response:", data);
    } catch (error) {
      console.log("[WBE dist-rel] getConnections (relation=0) error; trying legacy getConnectionJSON", error);
    }
  }

  if (!hasUsablePath(data)) {
    try {
      const legacyData = await getConnectionJSON("DistanceAndRelationship_Distance", id1, id2);
      console.log("[WBE dist-rel] getConnectionJSON fallback response:", legacyData);
      if (hasUsablePath(legacyData)) {
        data = legacyData;
      }
    } catch (error) {
      console.log("[WBE dist-rel] getConnectionJSON fallback error:", error);
    }
  }

  addDistance(data || {}, source);
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
  relationshipFlowStarted = true;
  if (clearExisting) {
    $(".distanceFromYou").fadeOut().remove();
    $(".yourRelationshipText").fadeOut().remove();
  }
  if (clicked == true) {
    const source = PREFER_LEGACY_ON_MANUAL_REFRESH ? "legacy" : "api";
    getDistance(source);
    doRelationshipText(userID, profileID, source);
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
