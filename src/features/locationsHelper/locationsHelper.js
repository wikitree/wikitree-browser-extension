/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { familyArray } from "../../core/common";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { formISODate } from "../date_fixer/date_fixer";
import { isSpaceEdit, isNewSpace, isImagePage, isAddUnrelatedPerson } from "../../core/pageType";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
// import { australian_locations } from "./auto_bio/australian_locations";
import { profilePerson } from "../../core/common";
import { normalizeLocation, initLocationTranslations } from "./location_helpers";

const WBE_LOC_HELPER_APP_ID = "WBE_locations_helper";

/* ── logging helpers (silenced) ────────────────────────────────────────── */
function dbg() {}
function logIfChanged() {}
function elInfo(el) {
  if (!el) return "null";
  return `${el.tagName || ""}#${el.id || ""}.${(el.className || "").toString()}`;
}
/* ─────────────────────────────────────────────────────────────────────── */

//Cape
const vocEnd = new Date("1795-09-17");
const bataviaStart = new Date("1803-02-21");
const capeColonyStart = new Date("1806-01-19");
const colonyEnd = new Date("1910-05-31");
const newSAStart = new Date("1994-04-27");
// Transvaal
const tRepStart = new Date("1844-04-09");
const boerRepStart = new Date("1852-01-17");
const boerColonyStart = new Date("1902-05-31");
// Free State
const fsColonyStart = new Date("1900-10-06");
const nataliaStart = new Date("1839-01-01");
const natalColonyStart = new Date("1843-05-04");
const natalStart = new Date("1856-01-01");

// Ensure we only initialize observers and bindings once per page load
window.locationsHelperInitDone = window.locationsHelperInitDone || false;

shouldInitializeFeature("locationsHelper").then((result) => {
  dbg("shouldInitializeFeature ->", result);
  if (result) {
    import("./locationsHelper.css");
    getFeatureOptions("locationsHelper").then((options) => {
      window.locationsHelperOptions = options;
      dbg("feature options", options);
    });

    const focusSelectors =
      "#mBirthLocation,#mDeathLocation,#Email[name='mMarriageLocation'],#mLocation,#photo_location";
    dbg("binding focus on selectors", focusSelectors, $(focusSelectors).length);
    $(focusSelectors).on("focus", async function () {
      dbg("focus on", this.id || this.name, "activeEl:", elInfo(document.activeElement));
      if (!window.locationsHelperInitDone) {
        dbg("initializing locationsHelper on first focus");
        locationsHelper();

        /* ── lazy-load the huge translation table ───────────────────── */
        if (
          window.locationsHelperOptions?.nativeName && // option is ON
          !window.nativeMapsReady // not fetched yet
        ) {
          try {
            dbg("initLocationTranslations starting (focus)");
            await initLocationTranslations(); // pulls file once
            window.nativeMapsReady = true;
            dbg("translation maps ready");
          } catch (err) {
            console.error("[locHelper] failed to load translations", err);
          }
        }
      }
    });

    setTimeout(function () {
      dbg("delayed marriage location focus binding");
      $("#mMarriageLocation").on("focus", async function () {
        dbg("focus on #mMarriageLocation");
        if (!window.locationsHelperInitDone) {
          locationsHelper();
        }

        if (window.locationsHelperOptions?.nativeName && !window.nativeMapsReady) {
          try {
            dbg("initLocationTranslations starting (marriage)");
            await initLocationTranslations();
            window.nativeMapsReady = true;
            dbg("translation maps ready");
          } catch (err) {
            console.error("[locHelper] failed to load translations", err);
          }
        }
      });
    }, 5000);
  }
});

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  let costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0) costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function similarity(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  var longer = s1;
  var shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

// Normalize a location string so family matching is resilient to common variants
const US_STATE_ABBR_MAP = {
  al: "alabama",
  ak: "alaska",
  az: "arizona",
  ar: "arkansas",
  ca: "california",
  co: "colorado",
  ct: "connecticut",
  de: "delaware",
  fl: "florida",
  ga: "georgia",
  hi: "hawaii",
  id: "idaho",
  il: "illinois",
  in: "indiana",
  ia: "iowa",
  ks: "kansas",
  ky: "kentucky",
  la: "louisiana",
  me: "maine",
  md: "maryland",
  ma: "massachusetts",
  mi: "michigan",
  mn: "minnesota",
  ms: "mississippi",
  mo: "missouri",
  mt: "montana",
  ne: "nebraska",
  nv: "nevada",
  nh: "new hampshire",
  nj: "new jersey",
  nm: "new mexico",
  ny: "new york",
  nc: "north carolina",
  nd: "north dakota",
  oh: "ohio",
  ok: "oklahoma",
  or: "oregon",
  pa: "pennsylvania",
  ri: "rhode island",
  sc: "south carolina",
  sd: "south dakota",
  tn: "tennessee",
  tx: "texas",
  ut: "utah",
  vt: "vermont",
  va: "virginia",
  wa: "washington",
  wv: "west virginia",
  wi: "wisconsin",
  wy: "wyoming",
  dc: "district of columbia",
};

function normalizeForFamilyMatch(str) {
  if (!str) return "";
  let s = (str.split("(")[0] || str) // drop anything in parentheses like dates
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove diacritics

  // Normalize United States variants
  s = s.replace(/\bunited states of america\b/g, "united states");
  s = s.replace(/\busa\b/g, "united states");
  s = s.replace(/\bu\.?s\.?a\.?\b/g, "united states");
  s = s.replace(/\bu\.?s\.?\b/g, "united states");

  // Remove administrative suffix tokens that differ by option or region
  s = s.replace(/\b(county|parish|borough|census area|regional municipality|municipality)\b/g, "");

  // Cleanup punctuation and whitespace around commas
  s = s.replace(/\s*,\s*/g, ", ");
  s = s.replace(/\s{2,}/g, " ").trim();

  // Collapse duplicate commas possibly created by token removal
  s = s.replace(/,\s*,/g, ", ");
  // Trim trailing commas
  s = s.replace(/,\s*$/g, "");

  // Normalize US state abbreviations to full names for better matching
  // Only do this confidently when it's clearly a US location (contains 'united states')
  const parts = s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const hasUS = parts.some((p) => p === "united states");
  if (parts.length) {
    const newParts = parts.map((p, idx) => {
      const token = p.replace(/\./g, "");
      const abbr = token.toLowerCase();
      if (US_STATE_ABBR_MAP[abbr] && (hasUS || idx >= parts.length - 2)) {
        return US_STATE_ABBR_MAP[abbr];
      }
      return p;
    });
    s = newParts.join(", ");
  }
  return s;
}

function highlightSearchWords(activeEl, dText, innerBit) {
  const theLocation = $("#" + activeEl.id);
  const theLocationText = theLocation.val();

  // Split on commas and spaces, but keep hyphenated words together
  const theLocationTextMatch = theLocationText
    ?.trim()
    .split(/[,\s]+/)
    .filter((word) => word.length > 0);

  dbg("highlightSearchWords", {
    inputField: activeEl.id,
    inputText: theLocationText,
    words: theLocationTextMatch,
    dTextSnippet: (dText || "").slice(0, 120),
  });

  if (theLocationTextMatch && theLocationTextMatch.length > 0) {
    let textContent = innerBit.text();

    theLocationTextMatch.forEach(function (aWord) {
      // Skip very short words to avoid issues with common words like "et", "de", etc.
      if (aWord.length >= 2) {
        // Escape special regex characters in the word
        const escapedWord = aWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Use word boundaries to match whole words only (case insensitive)
        const wordRegex = new RegExp(`\\b(${escapedWord})\\b`, "gi");
        textContent = textContent.replace(wordRegex, '<span class="autocomplete-suggestion-term">$1</span>');
      }
    });

    // Set the highlighted HTML
    innerBit.html(textContent);
  }
}

function fixText(added_node, activeEl, dText, innerBit, innerBitText) {
  const before = dText;
  // Strip any trailing parenthetical date ranges e.g. (1837 - 1900), ( - 1974), (c. 1810- ), (bef. 1700 - aft. 1750)
  // Do an aggressive pass first (legacy behaviour) then a focused cleanup.
  dText = dText.replace(/\(.*\d{3,4}.*\)/, ""); // legacy (greedy) removal – keeps prior behaviour
  dText = stripLocationDates(dText); // modern precise cleanup
  logIfChanged("fixText: stripped dates", before, dText);

  if (innerBitText) {
    dbg("fixText: overriding innerBit text", innerBitText);
    innerBit.text(innerBitText);
  } else {
    const datesMatch = innerBit.text().match(/\(.*\d{3,4}.*\)/g);
    if (datesMatch) {
      innerBit.text(dText + " " + datesMatch[0]);
    } else {
      innerBit.text(dText);
    }
  }

  $(added_node).find(".autocomplete-suggestion").attr("data-val", dText.trim());
  highlightSearchWords(activeEl, dText, innerBit);
}

// Helper: remove trailing parenthetical segments that look like date ranges or single years.
// Examples to remove:
//   Bromborough, Cheshire, England (1837 - 1974)
//   Bromborough, Cheshire, England ( - 1974)
//   Bromborough, Cheshire, England (1837 - )
//   Bromborough, Cheshire, England (c. 1837)
// Keeps other parenthetical content without digits (rare) intact.
function stripLocationDates(raw) {
  if (!raw) return "";
  let s = raw;
  // Iterate in case of multiple trailing date parens accidentally present
  let changed = false;
  const dateParenRegex = /\s*\((?:[^)]*\d{3,4}[^)]*)\)\s*$/; // any trailing (...) containing a 3-4 digit number
  while (dateParenRegex.test(s)) {
    s = s.replace(dateParenRegex, "");
    changed = true;
  }
  if (changed) {
    s = s
      .replace(/\s{2,}/g, " ")
      .trim()
      .replace(/,\s*,/g, ", ")
      .replace(/,\s*$/g, "");
  }
  return s.trim();
}

async function locationsHelper() {
  dbg("locationsHelper init");
  // Prevent multiple observers and duplicate init
  if (window.locationsHelperInitDone) {
    dbg("locationsHelper already initialized; skipping");
    return;
  }
  if (!window.USstates) {
    dbg("loading USstates.json");
    try {
      window.USstates = await import("./USstates.json");
      dbg("USstates loaded", !!window.USstates);
    } catch (e) {
      console.error("[locHelper] failed to load USstates.json", e);
    }
  }

  let theID;
  if (!(isSpaceEdit || isNewSpace || isAddUnrelatedPerson || isImagePage)) {
    theID = profilePerson.Id;
  }
  dbg("profilePerson Id check", { theID, isSpaceEdit, isNewSpace, isAddUnrelatedPerson, isImagePage });

  if (theID) {
    WikiTreeAPI.getRelatives(WBE_LOC_HELPER_APP_ID, theID, "*", {
      getParents: 1,
      getSiblings: 1,
      getSpouses: 1,
      getChildren: 1,
    }).then((items) => {
      const thisFamily = familyArray(items[0].person);
      window.bdLocations = [];
      thisFamily.forEach(function (aPe) {
        if (aPe.BirthLocation) {
          window.bdLocations.push(aPe.BirthLocation);
        }
        if (aPe.DeathLocation) {
          window.bdLocations.push(aPe.DeathLocation);
        }
      });
      dbg("bdLocations built", { count: window.bdLocations.length, sample: window.bdLocations.slice(0, 5) });
    });
  } else {
    dbg("No profilePerson Id; skipping bdLocations");
  }

  const observer2 = new MutationObserver(function (mutations_list) {
    mutations_list.forEach(function (mutation) {
      mutation.addedNodes.forEach(async function (added_node) {
        try {
          dbg("MutationObserver added node", {
            nodeType: added_node.nodeType,
            className: added_node.className,
            textSample: (added_node.textContent || "").slice(0, 120),
          });
          // Only act on actual suggestion elements
          if (
            added_node.nodeType === 1 &&
            added_node.classList &&
            added_node.classList.contains("autocomplete-suggestion")
          ) {
            // Avoid reprocessing when we move the node within its container
            if ($(added_node).data("locHelperProcessed")) {
              dbg("skip already processed suggestion");
              return;
            }
            $(added_node).data("locHelperProcessed", true);
            let activeEl = document.activeElement;
            let whichLocation = "";
            if (activeEl?.id == "mBirthLocation") {
              whichLocation = "Birth";
            } else if (activeEl?.id == "mDeathLocation") {
              whichLocation = "Death";
            } else if (
              activeEl?.name == "mMarriageLocation" ||
              activeEl?.id == "Email" ||
              activeEl?.id == "mMarriageLocation"
            ) {
              whichLocation = "Marriage";
            } else if (activeEl?.id == "mLocation") {
              whichLocation = "spaceLocation";
            } else if (activeEl?.id == "photo_location") {
              whichLocation = "photoLocation";
            }
            dbg("Handling autocomplete-suggestions for", { activeEl: elInfo(activeEl), whichLocation });

            let dText = added_node.textContent || "";
            dbg("raw suggestion text", dText.slice(0, 200));

            // Always ensure the value that will be inserted (data-val) is date-free
            const baseStrippedVal = stripLocationDates(dText.replace(/\(.*\d{3,4}.*\)/, ""));
            $(added_node).attr("data-val", baseStrippedVal.trim());
            dbg("sanitized base data-val", { original: dText.slice(0, 120), dataVal: baseStrippedVal });

            dbg("options at runtime", window.locationsHelperOptions);
            if (window.locationsHelperOptions?.nativeName) {
              const before = dText;
              dbg("Normalizing location text for native names");
              dText = normalizeLocation(dText);
              logIfChanged("normalizeLocation", before, dText);
              const innerBitNorm = $(added_node).find("span:first");
              if (innerBitNorm.length === 0) {
                dbg("normalize: innerBit 'span:first' not found");
              }
              fixText(added_node, activeEl, dText, innerBitNorm);
            }

            let currentBirthYearMatch = null;
            let currentDeathYearMatch = null;
            let currentMarriageYearMatch = null;
            let locationYearMatch = null;
            if ($("#mBirthDate").length)
              currentBirthYearMatch = $("#mBirthDate")
                .val()
                .match(/[0-9]{3,4}/);
            if ($("#mDeathDate").length)
              currentDeathYearMatch = $("#mDeathDate")
                .val()
                .match(/[0-9]{3,4}/);
            if ($("#mMarriageDate").length)
              currentMarriageYearMatch = $("#mMarriageDate")
                .val()
                .match(/[0-9]{3,4}/);
            if ($("#mStartDate").length)
              locationYearMatch = $("#mStartDate")
                .val()
                .match(/[0-9]{3,4}/);
            if ($("#photo_date").length)
              locationYearMatch = $("#photo_date")
                .val()
                .match(/[0-9]{3,4}/);

            dbg("year matches", {
              birth: currentBirthYearMatch?.[0],
              death: currentDeathYearMatch?.[0],
              marriage: currentMarriageYearMatch?.[0],
              location: locationYearMatch?.[0],
            });

            let startYear = "";
            let endYear = "";
            let goodDate = true; // default: keep when no dates
            let familyLoc = false;
            let familyLoc2 = false;
            let myYear = "";
            if (currentBirthYearMatch != null && whichLocation == "Birth") {
              myYear = currentBirthYearMatch[0];
            } else if (currentDeathYearMatch != null && whichLocation == "Death") {
              myYear = currentDeathYearMatch[0];
            } else if (currentMarriageYearMatch != null && whichLocation == "Marriage") {
              myYear = currentMarriageYearMatch[0];
            } else if (
              locationYearMatch != null &&
              (whichLocation == "spaceLocation" || whichLocation == "photoLocation")
            ) {
              myYear = locationYearMatch[0];
            }
            // Parse a year range like "(1801 - 1974)" or "( - 1974)" or "(1794 - )"
            const yearRange = (dText || "").match(/\((?:[^0-9]*)(\d{3,4})?\s*-\s*(\d{0,4})?[^)]*\)/);
            if (yearRange) {
              startYear = yearRange[1] || "";
              endYear = yearRange[2] || "";
              if (myYear) {
                const my = parseInt(myYear, 10);
                const s = startYear ? parseInt(startYear, 10) : null;
                const e = endYear ? parseInt(endYear, 10) : null;
                // Mark wrong only when input year is before start OR after end
                if (s !== null && my < s) goodDate = false;
                if (e !== null && my > e) goodDate = false;
              } else {
                goodDate = true; // no input year -> keep
              }
            } else {
              goodDate = true; // no suggestion date -> keep
            }
            dbg("date window eval", { startYear, endYear, myYear, goodDate });

            if (window.locationsHelperOptions?.correctLocations || window.locationsHelperOptions?.addUSCounty) {
              const innerBit = $(added_node).find("span:first");
              dbg("innerBit 'span:first' count", innerBit.length);

              let theDateStr = "";
              if (whichLocation == "Birth") theDateStr = $("#mBirthDate").val();
              else if (whichLocation == "Death") theDateStr = $("#mDeathDate").val();
              else if (whichLocation == "Marriage") theDateStr = $("#mMarriageDate").val();
              else if (whichLocation == "spaceLocation") theDateStr = $("#mStartDate").val();
              else if (whichLocation == "photoLocation") theDateStr = $("#photo_date").val();

              const theDate = new Date(formISODate(theDateStr));
              dbg("parsed date", {
                whichLocation,
                theDateStr,
                iso: formISODate(theDateStr),
                theDate: isNaN(+theDate) ? null : theDate.toISOString(),
              });

              let innerBitText = "";
              if (window.locationsHelperOptions?.correctLocations && goodDate) {
                const beforeAll = dText;

                // Brisbane
                dText = dText.replace("Brisbane City, Queensland, Australia", "Brisbane, Queensland, Australia");

                if (dText.match(/Auschwitz-Birkenau/)) {
                  dText =
                    "Konzentrationslager Auschwitz-Birkenau, Bielitz, Oberschlesien, Preußen, Deutsches Reich (1941 - 1945)";
                } else if (dText.match(/Auschwitz, Auschwitz/)) {
                  dText =
                    "Konzentrationslager Auschwitz, Bielitz, Oberschlesien, Preußen, Deutsches Reich (1941 - 1945)";
                }

                // Canadian districts
                if (dText.match(/Canada/)) {
                  const regionalDistricts = [
                    "Greater Vancouver Regional District",
                    "Fraser Valley Regional District",
                    "Capital Regional District",
                    "Metro Vancouver Regional District",
                    "Squamish-Lillooet Regional District",
                    "Central Okanagan Regional District",
                    "Thompson-Nicola Regional District",
                    "Cariboo Regional District",
                    "Bulkley-Nechako Regional District",
                    "Peace River Regional District",
                    "Kitimat-Stikine Regional District",
                    "Northern Rockies Regional Municipality",
                    "Columbia-Shuswap Regional District",
                    "Okanagan-Similkameen Regional District",
                    "North Okanagan Regional District",
                    "Kootenay Boundary Regional District",
                    "Central Kootenay Regional District",
                    "East Kootenay Regional District",
                    "Mount Waddington Regional District",
                    "Comox Valley Regional District",
                    "Cowichan Valley Regional District",
                    "Alberni-Clayoquot Regional District",
                    "Strathcona Regional District",
                    "Sunshine Coast Regional District",
                    "Powell River Regional District",
                  ];
                  regionalDistricts.forEach(function (aDistrict) {
                    dText = dText.replace(aDistrict + ", ", "");
                  });
                }

                // Germany country names
                if (myYear < 1806) {
                  dText = dText
                    .replace("Deutsches Reich", "Heiliges Römisches Reich")
                    .replace("Deutschland", "Heiliges Römisches Reich");
                } else if (myYear < 1815) {
                  dText = dText
                    .replace(", Heiliges Römisches Reich", "")
                    .replace(", Deutschland", "")
                    .replace(", Deutscher Bund", "")
                    .replace(", Deutsches Reich", "");
                } else if (myYear < 1866) {
                  dText = dText.replace("Deutsches Reich", "Deutscher Bund").replace("Deutschland", "Deutscher Bund");
                } else if (myYear < 1871) {
                  dText = dText.replace(", Deutsches Reich", "").replace("Deutschland", "");
                } else if (myYear < 1945) {
                  dText = dText.replace("Deutschland", "Deutsches Reich");
                } else if (myYear > 1949) {
                  dText = dText.replace("Deutsches Reich", "Deutschland").replace("Deutscher Bund", "Deutschland");
                }

                // Wallenhorst
                if (dText.match(/Wallenhorst/)) {
                  const wallenhorstHistory = [
                    {
                      startDate: null,
                      endDate: "1802-01-01",
                      location: "Wallenhorst, Iburg, Osnabrück, Heiliges Römisches Reich",
                    },
                    {
                      startDate: "1802-01-01",
                      endDate: "1807-01-01",
                      location: "Wallenhorst, Iburg, Osnabrück, Hannover, Heiliges Römisches Reich",
                    },
                    {
                      startDate: "1807-01-01",
                      endDate: "1811-01-01",
                      location: "Wallenhorst, Engter, Osnabrück, Weser, Westphalen, Rheinbund",
                    },
                    {
                      startDate: "1811-01-01",
                      endDate: "1814-01-01",
                      location: "Wallenhorst, Wallenhorst, Osnabrück-Land, Osnabrück, Ober-Ems, Frankreich",
                    },
                    {
                      startDate: "1814-01-01",
                      endDate: "1817-01-01",
                      location: "Wallenhorst, Osnabrück, Hannover, Deutscher Bund",
                    },
                    {
                      startDate: "1817-01-01",
                      endDate: "1867-01-01",
                      location: "Wallenhorst, Osnabrück, Hannover, Deutscher Bund",
                    },
                    {
                      startDate: "1867-01-01",
                      endDate: "1871-01-01",
                      location: "Wallenhorst, Osnabrück, Hannover, Preußen, Norddeutscher Bund",
                    },
                    {
                      startDate: "1871-01-01",
                      endDate: "1945-01-01",
                      location: "Wallenhorst, Osnabrück, Hannover, Preußen, Deutsches Reich",
                    },
                    {
                      startDate: "1945-01-01",
                      endDate: "1946-10-31",
                      location: "Wallenhorst, Osnabrück, Hannover, Britische Besatzungszone",
                    },
                    {
                      startDate: "1946-11-01",
                      endDate: "1978-01-31",
                      location: "Wallenhorst, Osnabrück, Niedersachsen, Deutschland",
                    },
                    {
                      startDate: "1978-02-01",
                      endDate: "2005-01-01",
                      location: "Wallenhorst, Osnabrück, Weser-Ems, Niedersachsen, Deutschland",
                    },
                    {
                      startDate: "2005-01-01",
                      endDate: null,
                      location: "Wallenhorst, Osnabrück, Niedersachsen, Deutschland",
                    },
                  ];
                  const record = findLocationByDate(theDate, wallenhorstHistory);
                  dbg("Wallenhorst record", record);
                  addNewSuggestion(added_node, "Wallenhorst", record.location, record);
                }

                // Massachusetts (and other pre-1776 states)
                const lastPart = dText.split("(")[0].trim().split(",").pop();
                const lastPartMatch = lastPart?.match(/[A-z]+/g);
                if (lastPartMatch != null) {
                  lastPartMatch.forEach(function (aWord) {
                    if (window.USstates[aWord] != undefined) {
                      const thisState = window.USstates[aWord];
                      if (thisState.former_name_date_established != undefined) {
                        if (thisState.former_name_date_established <= myYear && thisState.admissionDate >= myYear) {
                          if (myYear >= 1776 && thisState.postRevolutionName) {
                            dText = dText.replace(lastPart, " " + aWord);
                            innerBitText =
                              dText + " (" + "1776-07-04" + " - " + thisState.admissionDate.match(/\d{4}/) + ")";
                          } else {
                            dText = dText.replace(lastPart, " " + thisState.former_name).replace(/ \(.+\)/, "");
                            innerBitText =
                              dText +
                              " (" +
                              thisState.former_name_date_established +
                              " - " +
                              thisState.admissionDate.match(/\d{4}/) +
                              ")";
                          }
                          dbg("US pre-statehood adjustment", { aWord, myYear, dText, innerBitText });
                          fixText(added_node, activeEl, dText, innerBit, innerBitText);
                        }
                      }
                    }
                  });
                }

                // Alpharetta
                if (dText.match(/Alpharetta/)) {
                  const alpharettaHistory = [
                    {
                      startDate: "1831-12-03",
                      endDate: null,
                      location: "Alpharetta, Forsyth County, Georgia, United States",
                    },
                  ];
                  const record = findLocationByDate(theDate, alpharettaHistory);
                  dbg("Alpharetta record", record);
                  addNewSuggestion(added_node, "Alpharetta", record.location, record);
                }

                // Appleton
                if (dText.match(/Appleton/)) {
                  const appletonHistory = [
                    {
                      startDate: null,
                      endDate: "1763-12-31",
                      variant: "Hull and Appleton",
                      location: "Hull and Appleton, Great Budworth, Cheshire, England",
                    },
                    {
                      startDate: "1764-01-01",
                      endDate: "1800-12-31",
                      location: "Appleton, Great Budworth, Cheshire, England",
                    },
                    {
                      startDate: "1801-01-01",
                      endDate: "1836-12-31",
                      location: "Appleton, Great Budworth, Cheshire, England, United Kingdom",
                    },
                    {
                      startDate: "1837-01-01",
                      endDate: "1974-03-31",
                      location: "Appleton, Runcorn, Cheshire, England, United Kingdom",
                    },
                    {
                      startDate: "1974-04-01",
                      endDate: null,
                      location: "Appleton, Warrington, Cheshire, England, United Kingdom",
                    },
                  ];
                  const record = findLocationByDate(theDate, appletonHistory);
                  dbg("Appleton record", record);
                  const villages = [
                    "Appleton Cross",
                    "Appleton Thorn",
                    "Broomfield",
                    "The Cobbs",
                    "Dudlows Green",
                    "Hillcliffe",
                    "Lumb Brook",
                    "Wrights Green",
                  ];
                  addNewSuggestion(added_node, "Appleton", record.location, record, villages);
                }

                // County Durham
                const beforeDurham = dText;
                dText = dText.replace("Durham, England", "County Durham, England");
                logIfChanged("Durham replacement", beforeDurham, dText);

                // Ferintosh
                if (dText.match(/Ferintosh/)) {
                  const ferintoshHistory = [
                    { startDate: null, endDate: "1800-12-31", location: "Ferintosh, Nairn, Scotland" },
                    {
                      startDate: "1801-01-01",
                      endDate: "1891-01-01",
                      location: "Ferintosh, Nairn, Scotland, United Kingdom",
                    },
                    {
                      startDate: "1891-01-01",
                      endDate: null,
                      location: "Ferintosh, Ross and Cromarty, Scotland, United Kingdom",
                    },
                  ];
                  const record = findLocationByDate(theDate, ferintoshHistory);
                  dbg("Ferintosh record", record);
                  const villages = [
                    "Alcag",
                    "Mulchaich",
                    "Urquhart",
                    "Dunvornie",
                    "Easter Kinkell",
                    "Smithfield",
                    "Logie Wester",
                  ];
                  addNewSuggestion(added_node, "Ferintosh", record.location, record, villages);
                }

                // Steyning
                if (dText.match(/Steyning/)) {
                  if ($(added_node).parent().find(".Steyning").length == 0) {
                    dbg("Adding custom Steyning suggestion");
                    const newSuggestion = document.createElement("div");
                    newSuggestion.className = "autocomplete-suggestion-container";
                    newSuggestion.classList.add("Steyning");
                    newSuggestion.innerHTML =
                      '<div class="autocomplete-suggestion" data-val="Steyning, Stogursey, Somerset, England"><div class="autocomplete-suggestion-head"><span class="autocomplete-suggestion-term">Steyning</span>, Stogursey, Somerset, England</div></div>';
                    $(newSuggestion).insertBefore($(added_node));
                  } else {
                    dbg("Steyning suggestion already present");
                  }
                }

                // South Africa baseline replacements
                const beforeSA = dText;
                dText = dText
                  .replace("Cape Colony, South Africa", "Cape Colony")
                  .replace("Cape of Good Hope, South Africa", "Cabo de Goede Hoop")
                  .replace("Orange River Colony, South Africa", "Oranje Unie");
                logIfChanged("South Africa base replacements", beforeSA, dText);

                // Cape
                const beforeCape = dText;
                if (theDate >= capeColonyStart && theDate < colonyEnd) {
                  dText = dText
                    .replace("Cape Province, South Africa", "Cape Colony")
                    .replace("Cape, Cape Colony", "Cape Colony");
                } else if (
                  (myYear != "" && theDate < vocEnd) ||
                  (theDate >= bataviaStart && theDate < capeColonyStart)
                ) {
                  dText = dText
                    .replace("Cape Province, South Africa", "Cabo de Goede Hoop")
                    .replace("Dutch Cape Colony", "Cabo de Goede Hoop")
                    .replace("Cape Colony", "Cabo de Goede Hoop")
                    .replace("Cape, Cape Colony", "Cabo de Goede Hoop");
                  if (theDate < vocEnd) dText = dText.replace("Cape Town, Cabo de Goede Hoop", "de Caep de Goede Hoop");
                } else if (theDate >= vocEnd && theDate < bataviaStart) {
                  dText = dText
                    .replace("Cape Province, South Africa", "Cape of Good Hope Colony")
                    .replace("Dutch Cape Colony", "Cape of Good Hope Colony")
                    .replace("Cape of Good Hope", "Cape of Good Hope Colony")
                    .replace("Cabo de Goede Hoop", "Cape of Good Hope Colony")
                    .replace("Cape Colony", "Cape of Good Hope Colony");
                } else if (theDate >= colonyEnd && theDate < newSAStart) {
                  dText = dText
                    .replace("Cabo de Goede Hoop", "Cape Province, South Africa")
                    .replace("Cape Colony", "Cape Province, South Africa");
                } else if (theDate >= newSAStart) {
                  dText = dText
                    .replace("Cabo de Goede Hoop", "Western Cape, South Africa")
                    .replace("Cape Colony", "Western Cape, South Africa")
                    .replace("Cape Province, South Africa", "Western Cape, South Africa");
                }
                logIfChanged("Cape timeline replacement", beforeCape, dText);

                // Transvaal
                const beforeTransvaal = dText;
                if (theDate >= tRepStart && theDate < boerRepStart) {
                  dText = dText
                    .replace("Transvaal, South Africa", "Transvaal Republic")
                    .replace("Tshwane, Gauteng, South Africa", "Transvaal Republic");
                } else if (theDate >= boerRepStart && theDate < boerColonyStart) {
                  dText = dText
                    .replace("Transvaal, South Africa", "Zuid-Afrikaansche Republic")
                    .replace("Tshwane, Gauteng, South Africa", "Zuid-Afrikaansche Republic");
                } else if (theDate >= boerColonyStart && theDate < colonyEnd) {
                  dText = dText
                    .replace("Transvaal, South Africa", "Transvaal Colony")
                    .replace("Tshwane, Gauteng, South Africa", "Transvaal Colony");
                }
                logIfChanged("Transvaal timeline replacement", beforeTransvaal, dText);

                // Orange Free State
                const beforeOFS = dText;
                if (myYear != "" && theDate < boerRepStart) {
                  dText = dText
                    .replace("Orange Free State, South Africa", "Transoranje")
                    .replace("Oranje Unie", "Transoranje");
                } else if (theDate >= boerRepStart && theDate <= fsColonyStart) {
                  dText = dText
                    .replace("Orange Free State, South Africa", "Oranje Vrijstaat")
                    .replace("Oranje Unie", "Oranje Vrijstaat");
                } else if (theDate >= fsColonyStart && theDate < boerColonyStart) {
                  dText = dText
                    .replace("Orange Free State, South Africa", "Oranjerivierkolonie")
                    .replace("Oranje Unie", "Oranjerivierkolonie");
                } else if (theDate >= boerColonyStart && theDate < colonyEnd) {
                  dText = dText.replace("Orange Free State, South Africa", "Oranje Unie");
                } else if (theDate >= newSAStart) {
                  dText = dText.replace("Orange Free State, South Africa", "Free State, South Africa");
                }
                logIfChanged("Orange Free State replacement", beforeOFS, dText);

                // Natal
                const beforeNatal = dText;
                if (myYear != "" && theDate < nataliaStart) {
                  dText = dText.replace("Natal, South Africa", "Zululand");
                } else if (theDate >= nataliaStart && theDate < natalColonyStart) {
                  dText = dText.replace("Natal, South Africa", "Natalia Republic");
                } else if (theDate >= natalColonyStart && theDate < natalStart) {
                  dText = dText.replace("Natal, South Africa", "Natal Colony");
                } else if (theDate >= natalStart && theDate < colonyEnd) {
                  dText = dText.replace("Natal, South Africa", "Natal");
                }
                logIfChanged("Natal replacement", beforeNatal, dText);

                logIfChanged("correctLocations net change", beforeAll, dText);
              }

              if (window.locationsHelperOptions?.addUSCounty) {
                // US counties
                if (dText.match(/United States/)) {
                  const stateMatch = dText.match(/([^,]+), ([^,]+), United States/);
                  dbg("US county parse", { dTextSnippet: dText.slice(0, 160), stateMatch });
                  if (stateMatch != null) {
                    const countyName = stateMatch[1].trim();
                    const stateName = stateMatch[2].trim();
                    if (!window.UScounties) {
                      try {
                        dbg("loading UScounties.json + alaska_endings.json");
                        window.UScounties = await import("./UScounties.json");
                        window.alaskaEndings = await import("./alaska_endings.json");
                        dbg("UScounties loaded", !!window.UScounties, "alaska_endings loaded", !!window.alaskaEndings);
                      } catch (e) {
                        console.error("[locHelper] failed to load US counties data", e);
                      }
                    }

                    if (window.UScounties[stateName] != undefined) {
                      const thisStateCounties = window.UScounties[stateName];
                      if (thisStateCounties.includes(countyName)) {
                        if (stateName == "Alaska") {
                          const alaskaKeys = Object.keys(window.alaskaEndings);
                          alaskaKeys.forEach(function (aKey) {
                            if (window.alaskaEndings[aKey]?.includes(countyName)) {
                              const before = dText;
                              dText = dText.replace(countyName, countyName + " " + aKey);
                              innerBitText = innerBit.text().replace(countyName, countyName + " " + aKey);
                              logIfChanged("Alaska borough/census-area suffix", before, dText);
                            }
                          });
                        } else if (stateName == "Louisiana") {
                          if (window.UScounties["Louisiana"].includes(countyName)) {
                            const before = dText;
                            dText = dText.replace(countyName + ", " + stateName, countyName + " Parish, " + stateName);
                            innerBitText = innerBit
                              .text()
                              .replace(countyName + ", " + stateName, countyName + " Parish, " + stateName);
                            logIfChanged("Louisiana Parish name", before, dText);
                          }
                        } else {
                          const before = dText;
                          dText = dText.replace(countyName + ", " + stateName, countyName + " County, " + stateName);
                          innerBitText = innerBit
                            .text()
                            .replace(countyName + ", " + stateName, countyName + " County, " + stateName);
                          logIfChanged("US County suffix", before, dText);
                        }
                      } else {
                        dbg("County name not in state's list", { countyName, stateName });
                      }
                    } else {
                      dbg("State not found in UScounties", stateName);
                    }
                  }
                }
              }

              fixText(added_node, activeEl, dText, innerBit, innerBitText);
            }

            if (window.bdLocations) {
              const sugNorm = normalizeForFamilyMatch(dText);
              window.bdLocations.forEach(function (aLoc) {
                const famNorm = normalizeForFamilyMatch(aLoc);
                const sim = similarity(famNorm, sugNorm);
                if (famNorm === sugNorm || sim > 0.92) familyLoc = true;
                if (famNorm === sugNorm || sim > 0.98) familyLoc2 = true;
              });
            }
            dbg("family location flags", { familyLoc, familyLoc2 });

            const $container = $(added_node).closest(".autocomplete-suggestions");
            if ($container.length) {
              // Always highlight the typed text in the suggestion text
              const $inner = $(added_node).find("span:first");
              if ($inner.length) {
                highlightSearchWords(activeEl, dText, $inner);
              }

              if (goodDate === true) {
                $(added_node).addClass("rightPeriod");
                if (familyLoc2 === true) {
                  $(added_node).addClass("familyLoc2").prependTo($container);
                  dbg("classified as rightPeriod + familyLoc2 (prepended within container)");
                } else if (familyLoc === true) {
                  $(added_node).addClass("familyLoc1").prependTo($container);
                  dbg("classified as rightPeriod + familyLoc1 (prepended within container)");
                } else {
                  dbg("classified as rightPeriod");
                }
              } else {
                $(added_node).addClass("wrongPeriod").appendTo($container);
                dbg("classified as wrongPeriod (appended within container)");
              }
            } else {
              dbg("no .autocomplete-suggestions container found for suggestion; skipping reorder");
            }
          }
        } catch (err) {
          console.error("[locHelper] observer handler error", err);
        }
      });
    });
  });

  // Helper to attach observer to any suggestion containers not yet observed
  const observedSuggestions = new WeakSet();
  function attachObserverToSuggestions() {
    const $list = $(".autocomplete-suggestions");
    dbg("attachObserverToSuggestions: containers found:", $list.length);
    $list.each(function () {
      const el = $(this)[0];
      if (!observedSuggestions.has(el)) {
        observer2.observe(el, { subtree: false, childList: true });
        observedSuggestions.add(el);
        dbg("observer attached to", el);
      }
    });
  }

  setTimeout(function () {
    attachObserverToSuggestions();
    // Also poll briefly for late-created containers
    let pollCount = 0;
    const poll = setInterval(function () {
      attachObserverToSuggestions();
      pollCount++;
      if (pollCount > 20) clearInterval(poll); // stop after ~20s
    }, 1000);
    // Intercept selection (mousedown) to guarantee sanitized insertion even if another script sets value first
    $(document)
      .off("mousedown.locationsHelper", ".autocomplete-suggestion")
      .on("mousedown.locationsHelper", ".autocomplete-suggestion", function () {
        const val = $(this).attr("data-val") || "";
        const clean = stripLocationDates(val);
        if (clean !== val) {
          $(this).attr("data-val", clean);
          dbg("mousedown sanitize data-val", { before: val, after: clean });
        }
        // Also proactively update the active input (plugin may set after event; use microtask)
        const activeEl = document.activeElement;
        if (activeEl && /Location|photo_location|Email/.test(activeEl.id || activeEl.name || "")) {
          queueMicrotask(() => {
            const before = activeEl.value;
            const after = stripLocationDates(before);
            if (after !== before) {
              activeEl.value = after;
              dbg("microtask sanitize input value", { before, after });
            }
          });
        }
      });
    // Mark init complete once we've attached observers
    window.locationsHelperInitDone = true;
  }, 3000);
}

function findLocationByDate(dateObj, locationHistory) {
  dbg("findLocationByDate", { date: isNaN(+dateObj) ? null : dateObj.toISOString(), records: locationHistory?.length });
  for (let record of locationHistory) {
    const startDate = record.startDate ? new Date(record.startDate) : null;
    const endDate = record.endDate ? new Date(record.endDate) : null;
    if ((!startDate || dateObj >= startDate) && (!endDate || dateObj < endDate)) {
      dbg("findLocationByDate -> match", record);
      return record;
    }
  }
  dbg("findLocationByDate -> no match");
  return null;
}

function addNewSuggestion(added_node, term, location, record, villages = []) {
  dbg("addNewSuggestion", { term, location, hasRecord: !!record, villagesCount: villages.length });
  if ($(".autocomplete-suggestion-container." + term).length == 0) {
    for (let i = 0; i < villages.length + 1; i++) {
      let villageBit = "";
      if (i > 0) {
        villageBit = villages[i - 1] + ", ";
      }
      const newSuggestion = document.createElement("div");
      let aRegex = new RegExp("^" + term, "g");
      if (record && record.variant) {
        aRegex = new RegExp("^" + record.variant, "g");
      }
      const endBit = location.replace(aRegex, "");
      const theDates = record ? " (" + (record.startDate || "") + " - " + (record.endDate || "") + ")" : "";
      newSuggestion.className = "autocomplete-suggestion-container";
      newSuggestion.classList.add(term);
      const villageLocation = villageBit + location;
      const cleanVal = stripLocationDates(villageLocation);
      newSuggestion.innerHTML = `
  <span class="autocomplete-suggestion-maplink"><a target="_new" href="https://maps.google.com?q=${villageLocation}"><img src="/images/icons/map.gif"></a></span>
  <div class="autocomplete-suggestion" data-val="${cleanVal}">
  <div class="autocomplete-suggestion-head">${villageBit}<span class="autocomplete-suggestion-term">${term}</span>${endBit} ${theDates}</div></div>`;
      $(newSuggestion).insertBefore($(added_node));
    }
  } else {
    dbg("addNewSuggestion skipped: container already exists for", term);
  }
}

// Make fixText tolerant of both wrapped and unwrapped suggestion nodes
// by setting data-val on the added node if it is itself a suggestion.
// (Placed after function declarations for clarity during maintenance.)
const originalFixText = fixText;
fixText = function (added_node, activeEl, dText, innerBit, innerBitText) {
  originalFixText(added_node, activeEl, dText, innerBit, innerBitText);
  try {
    if (
      added_node &&
      added_node.nodeType === 1 &&
      added_node.classList &&
      added_node.classList.contains("autocomplete-suggestion")
    ) {
      const cleanVal = stripLocationDates((dText || "").trim());
      $(added_node).attr("data-val", cleanVal);
    }
    $(added_node)
      .find(".autocomplete-suggestion")
      .each(function () {
        const before = $(this).attr("data-val") || "";
        const after = stripLocationDates(before);
        if (after !== before) {
          $(this).attr("data-val", after);
          dbg("post-fixText sanitize nested suggestion", { before, after });
        }
      });
  } catch (e) {
    // non-fatal
  }
};
