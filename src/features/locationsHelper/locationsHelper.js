/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { formISODate } from "../date_fixer/date_fixer";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
// import { australian_locations } from "./auto_bio/australian_locations";
import { normalizeLocation, initLocationTranslations } from "./location_helpers";
import {
  checkFamilyMatch,
  dbg1,
  dbg2,
  logIfChanged,
  normalise,
  retrieveFamilyBDLocations,
} from "./locations_common.js";
import {
  locationFields,
  initLocationSuggestions,
  getAugmentedSuggestions,
  formWTSuggestionElement,
} from "./location_suggestions";

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
// Natal
const nataliaStart = new Date("1839-01-01");
const natalColonyStart = new Date("1843-05-04");
const natalStart = new Date("1856-01-01");

const fieldSelectors = locationFields.map((f) => f.fieldId).join(",");
const locationFieldsMap = new Map(locationFields.map((f) => [f.name, f]));

// Ensure we only initialize observers and bindings once per page load
window.locationsHelperInitDone = window.locationsHelperInitDone || false;

shouldInitializeFeature("locationsHelper").then((result) => {
  dbg2("shouldInitializeFeature ->", result);
  if (result) {
    import("./locationsHelper.css");
    getFeatureOptions("locationsHelper").then((options) => {
      window.locationsHelperOptions = options;
      dbg2("feature options", options);

      waitForElements(fieldSelectors, 2000)
        .then((el) => {
          if (!el) return;
          if (options?.newLocations !== "no") {
            initLocationSuggestions(options?.newLocations);
            if (options?.newLocations === "only") {
              $(fieldSelectors).prop("disabled", false);
              return;
            }
          }
          attachInputListeners();
          // dbg2("binding focus on selectors", fieldSelectors, $(fieldSelectors).length);
          // $(fieldSelectors).on("focus", async function () {
          //   dbg2("focus on", this.id || this.name, "activeEl:", elInfo(document.activeElement));
          if (!window.locationsHelperInitDone) {
            dbg2("initializing locationsHelper on first focus");
            locationsHelper();

            /* ── lazy-load the huge translation table ───────────────────── */
            if (
              window.locationsHelperOptions?.nativeName && // option is ON
              !window.nativeMapsReady // not fetched yet
            ) {
              try {
                dbg2("initLocationTranslations starting (focus)");
                initLocationTranslations().then(() => {
                  // pulls file once
                  window.nativeMapsReady = true;
                  dbg2("translation maps ready");
                });
              } catch (err) {
                console.error("[locHelper] failed to load translations", err);
              }
            }
          }
          //   });
        })
        .catch((err) => {
          console.error("LocationSuggestions.", err.message);
        });
    });
  }
});

// Wait for any of the elements with the given IDs to appear in the DOM
function waitForElements(selectors, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    // 1. Immediate check for any of the fields
    const foundEls = document.querySelectorAll(selectors);
    if (foundEls.length > 0) {
      if (window.locationsHelperOptions?.newLocations !== "no") {
        foundEls.forEach((el) => {
          $(el).prop("disabled", true);
        });
      }

      resolve(foundEls);
      return;
    }

    // 2. Set up timeout
    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout after ${timeoutMs}ms: no location fields found`));
    }, timeoutMs);

    // 3. Observe until found
    const observer = new MutationObserver(() => {
      const els = document.querySelectorAll(selectors);

      if (els.length > 0) {
        clearTimeout(timer);
        observer.disconnect();

        if (window.locationsHelperOptions?.newLocations !== "no") {
          // Disable the location inputs until we are ready to intervene in the autocompletes
          console.log("Disablle location inputs");
          els.forEach((el) => {
            $(el).prop("disabled", true);
          });
        }

        resolve(els);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

function highlightSearchWords(theLocationText, dText, innerBit) {
  // Split on commas and spaces, but keep hyphenated words together
  const theLocationTextMatch = theLocationText
    ?.trim()
    .split(/[,\s]+/)
    .filter((word) => word.length > 0);

  dbg2("highlightSearchWords", {
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
        const wordRegex = new RegExp(`(${escapedWord})(?![^<]*>)`, "gi");
        textContent = textContent.replace(wordRegex, '<span class="autocomplete-suggestion-term">$1</span>');
      }
    });

    // Set the highlighted HTML
    innerBit.html(textContent);
  }
}

/**
 * Update the suggestion node to have corrected text and dates
 * @param {*} added_node A <div class="autocomplete-suggestion">...</div> element representing a suggestion
 *            This div typcally has the following form:
 *              <div class="autocomplete-suggestion" data-val="Hagerstown, Maryland">
 *                <img src="/images/icons/map.gif">
 *                <span>
 *                  <span class="autocomplete-suggestion-term">Hagerstown,</span> Maryland
 *                </span>
 *                (1762 - 1776)
 *              </div>
 * @param {*} userInput The text that the user has typed into the location field
 * @param {*} dText The full suggested name. If it is a WT suggestion, it may contain dates at the end.
 *                  If it is a WBE suggestion, it will not contain the dates. If it does contain dates,
 *                  these dates should be used in the suggestion, otherwise the dates (if any) after the span
 *                  in the div should be used
 */
function fixText(added_node, userInput, dText) {
  const before = dText;

  // Normalize dText: authoritative source for text and authoratitive for dates if it has any
  const { cleanText: cleanTextFromDText, datePart: dateFromDText } = stripLocationDates(dText);

  logIfChanged("fixText: stripped dates", before, cleanTextFromDText);

  const $node = $(added_node);

  const innerBit = $node.find("span:first");
  if (innerBit.length === 0) {
    console.error("fixText: 'span:first' not found");
    return;
  }

  // Normalize span text (may already contain dates)
  const spanText = innerBit.text();

  const { cleanText: cleanSpanText, datePart: dateFromSpan } = stripLocationDates(spanText);

  // Update span text to date-free version
  innerBit.text(cleanTextFromDText);

  // Remove any trailing date text nodes in the DOM
  const trailingTextNodes = $node.contents().filter(function () {
    return this.nodeType === Node.TEXT_NODE && this.textContent.trim().length > 0;
  });
  trailingTextNodes.remove();

  // Decide which date to render (dText wins)
  const finalDatePart = dateFromDText || dateFromSpan;
  if (finalDatePart) {
    $node.append(" " + finalDatePart);
  }

  $node.attr("data-val", cleanTextFromDText.trim());
  highlightSearchWords(userInput, cleanTextFromDText, innerBit);
}

/**
 * Helper: remove trailing parenthetical segments that look like date ranges or single years.
 * Examples to remove:
 *   Bromborough, Cheshire, England (1837 - 1974)
 *   Bromborough, Cheshire, England ( - 1974)
 *   Bromborough, Cheshire, England (1837 - )
 *   Bromborough, Cheshire, England (c. 1837)
 * Keeps other parenthetical content without digits (rare) intact.
 *
 * @param {*} raw
 * @returns { cleanText: string, datePart: string }
 */
function stripLocationDates(raw) {
  if (!raw) return { cleanText: "", datePart: "" };

  let s = raw;
  let removed;

  const dateParenRegex = /\s*\(([^)]*\d{3,4}[^)]*)\)\s*$/; // capture inner content

  // Iterate in case of multiple trailing date parens accidentally present, bbut only
  // return the first date removed
  while (true) {
    const m = s.match(dateParenRegex);
    if (!m) break;

    if (!removed) {
      removed = m[0].trim();
    }
    s = s.replace(dateParenRegex, "");
  }

  s = s
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/,\s*,/g, ", ")
    .replace(/,\s*$/g, "");

  return {
    cleanText: s.trim(),
    datePart: removed,
  };
}

function attachInputListeners() {
  for (const f of locationFields) {
    const input = document.querySelector(f.fieldId);
    if (!input) continue;

    f.latestInput = null;
    f.inputRevision = 0;

    input.addEventListener("input", (e) => {
      const val = e.target.value;
      f.latestInput = {
        input: val,
        normalised: normalise(val),
      };
      ++f.inputRevision;
    });
  }
}

function getState(container) {
  if (!container.__wbeState) {
    container.__wbeState = {
      injecting: false,
      fieldName: null, // permanent association
      renderRevision: null, // number
    };
  }
  return container.__wbeState;
}

function containsTermsInOrder(haystack, terms) {
  let pos = 0;

  for (const term of terms) {
    const idx = haystack.indexOf(term, pos);
    if (idx === -1) return false;
    pos = idx + term.length;
  }

  return true;
}

async function locationsHelper() {
  dbg2("locationsHelper init");
  // Prevent multiple observers and duplicate init
  if (window.locationsHelperInitDone) {
    dbg2("locationsHelper already initialized; skipping");
    return;
  }
  if (!window.USstates) {
    dbg2("loading USstates.json");
    try {
      window.USstates = await import("./USstates.json");
      dbg2("USstates loaded", !!window.USstates);
    } catch (e) {
      console.error("[locHelper] failed to load USstates.json", e);
    }
  }

  retrieveFamilyBDLocations();

  function summariseMutationNodes(nodes) {
    return Array.from(nodes || []).map((node) => ({
      nodeType: node.nodeType,
      nodeName: node.nodeName,
      className: node.nodeType === Node.ELEMENT_NODE ? node.className : null,
      textSample: (node.textContent || "").slice(0, 100),
    }));
  }

  const observer2 = new MutationObserver((mutations) => {
    const container = mutations[0].target;

    //----- debugging-----------
    dbg1(`${mutations.length} mutation groups detected`);
    const mut = mutations.map((m) => ({
      type: m.type,
      target: m.target?.nodeName,
      addedNodes: summariseMutationNodes(m.addedNodes),
      removedNodes: summariseMutationNodes(m.removedNodes),
    }));
    // (we log the above below)
    //----- end debugging-----------

    const state = getState(container);
    mut.state = state;
    dbg1("===> mutations", mut);

    if (state.injecting) {
      dbg1("mutation ignored (self-injection)");
      return;
    }

    // Find first suggestion with terms (needed either to resolve input field -> suggestions container
    // association or to validate freshness)
    // const suggestionEl = Array.from(container.querySelectorAll(".autocomplete-suggestion")).find((el) =>
    //   el.querySelector(".autocomplete-suggestion-term")
    // );
    const qsa = container.querySelectorAll(".autocomplete-suggestion");
    const arr = Array.from(qsa);
    const suggestionEl = arr.find((el) => el.querySelector(".autocomplete-suggestion-term"));

    const normalisedTerms = suggestionEl
      ? Array.from(suggestionEl.querySelectorAll(".autocomplete-suggestion-term"))
          .map((el) => normalise(el.textContent))
          .filter(Boolean)
      : [];

    let field = state.fieldName ? locationFieldsMap.get(state.fieldName) : null;
    if (!field) {
      if (!normalisedTerms.length) {
        dbg1("mutation ignored (could not associate container with input since no term span found");
        return false;
      }
      // Resolve owning field once
      // Find the field matching these rendered terms
      field = locationFields.find(
        (f) => f.latestInput && containsTermsInOrder(f.latestInput.normalised, normalisedTerms)
      );

      if (!field) {
        dbg1("mutation ignored (can't find field for rendered terms)", normalisedTerms);
        return;
      }

      state.fieldName = field.name;
      // state.renderRevision = field.inputRevision;
    }

    // Reset container render revision if user has typed since last snapshot
    if (state.renderRevision !== field.inputRevision) {
      state.renderRevision = field.inputRevision;
    }

    // Prevent reinjection
    if (container.querySelector(".wbe-injected-suggestion")) {
      dbg1("injection already done; skipping");
      return;
    }

    // Validate freshness
    const term = field.latestInput.input;
    if (
      field.inputRevision !== state.renderRevision ||
      (normalisedTerms.length && !containsTermsInOrder(field.latestInput.normalised, normalisedTerms))
    ) {
      dbg1("mutation ignored (stale render vs input)", {
        fieldName: field.name,
        fieldLatestInput: field.latestInput,
        normalisedTerms: normalisedTerms,
        revisionFieldInput: field.inputRevision,
        revisionStateRender: state.renderRevision,
      });
      return;
    }

    prepareAndInject(container, field, state, term, mutations);
  });

  async function prepareAndInject(container, locationField, state, term, mutations) {
    let userInput = locationField.latestInput.input;
    if (term !== userInput) {
      dbg1(`stale term (${term}) vs input (${userInput}) - ignoring`);
      return; // stale by the time we started
    }

    let suggestions = [];
    if (window.locationsHelperOptions?.newLocations !== "no") {
      const date = formISODate(document.querySelector(locationField.dateId)?.value);
      const countries = $(`#${locationField.fieldId.slice(1)}_cntry`)?.val() || [];

      suggestions = await getAugmentedSuggestions(userInput, date, countries);
    }

    if (window.locationsHelperOptions?.addUSCounty) {
      if (!window.UScounties) {
        try {
          dbg2("loading UScounties.json + alaska_endings.json");
          window.UScounties = await import("./UScounties.json");
          window.alaskaEndings = await import("./alaska_endings.json");
          dbg2("UScounties loaded", !!window.UScounties, "alaska_endings loaded", !!window.alaskaEndings);
        } catch (e) {
          console.error("[locHelper] failed to load US counties data", e);
        }
      }
    }

    // Re-check staleness after await
    userInput = locationField.latestInput.input;
    if (term !== userInput) return;

    state.injecting = true;
    dbg1(`suggestions prepared, injecting`, {
      injecting: state.injecting,
      latestInput: userInput,
    });

    try {
      // Optional cleanup: only if the site doesn't fully clear
      // container.querySelectorAll(".wbe-injected-suggestion").forEach((n) => n.remove());

      if (suggestions.length) injectAugmentedSuggestions(container, suggestions);
      applySuggestionCorrections(container, locationField, userInput, mutations, suggestions);
    } finally {
      state.injecting = false;
      dbg1(`injection done`, {
        injecting: state.injecting,
        latestInput: userInput,
      });
    }
  }

  // Helper to attach observer to any suggestion containers not yet observed
  const observedSuggestions = new WeakSet();
  function attachObserverToSuggestions() {
    let cnt = 0;
    let added = 0;
    document.querySelectorAll(".autocomplete-suggestions").forEach((el) => {
      ++cnt;
      if (!observedSuggestions.has(el)) {
        observer2.observe(el, { childList: true, subtree: false });
        observedSuggestions.add(el);
        ++added;
      }
    });
    if (added > 0) {
      // We are now ready to intervene in autocompletes, so enable the inputs
      if (window.locationsHelperOptions?.newLocations !== "no") {
        $(fieldSelectors).prop("disabled", false);
      }
      dbg1(`attachObserverToSuggestions: ${cnt} containers found, attached observers to ${added}`);
    }
  }

  setTimeout(function () {
    attachObserverToSuggestions();
    // Also poll briefly for late-created containers
    let pollCount = 0;
    const poll = setInterval(function () {
      attachObserverToSuggestions();
      pollCount++;
      if (pollCount > 10) clearInterval(poll); // stop after ~10s
    }, 1000);

    // Mark init complete once we've attached observers
    window.locationsHelperInitDone = true;
  }, 3000);
}

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate(); // month is 1-based
}

function parsePartialDateToRange(str, isStart) {
  if (!str) return null;

  const parts = str.split("-").map(Number);

  // YYYY
  if (parts.length === 1) {
    const y = parts[0];
    return {
      start: new Date(y, 0, 1),
      end: new Date(y, 11, 31),
    };
  }

  // YYYY-MM
  if (parts.length === 2) {
    const [y, m] = parts;
    return {
      start: new Date(y, m - 1, 1),
      end: new Date(y, m - 1, lastDayOfMonth(y, m)),
    };
  }

  // YYYY-MM-DD
  if (parts.length === 3) {
    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d);
    return { start: date, end: date };
  }

  return null;
}

function applySuggestionCorrections(container, locationField, userInput, mutations_list, augmentedSuggestions) {
  const dateFieldId = locationField.dateId;
  const whichLocation = locationField.name;

  // Input date (can be YYYY, YYYY-MM, YYYY-MM-DD)
  const theDateStr = $(dateFieldId).val() || "";
  const isoInputDate = formISODate(theDateStr);
  const inputRange = parsePartialDateToRange(isoInputDate);
  const myYear = inputRange ? inputRange.start.getFullYear() : null;

  // console.log("applyCorrections. familiy bd locations", window.normalisedBDLocations);
  const suggestionsToProcess = [];
  mutations_list.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1 && node.classList?.contains("autocomplete-suggestion")) {
        suggestionsToProcess.push({ source: "wt", node: node });
      }
    });
  });

  // Also include augmented suggestions that were just injected
  augmentedSuggestions.forEach((sug) => {
    sug.source = "aug";
    suggestionsToProcess.push(sug);
  });

  suggestionsToProcess.forEach(async function (suggestion) {
    const added_node = suggestion.node;
    const isWTSuggestion = suggestion.source === "wt";
    try {
      dbg2("MutationObserver added node", {
        nodeType: added_node.nodeType,
        className: added_node.className,
        textSample: (added_node.textContent || "").slice(0, 100),
      });

      // Avoid reprocessing when we move the node within its container
      if ($(added_node).data("locHelperProcessed")) {
        dbg2("skip already processed suggestion");
        return;
      }
      $(added_node).data("locHelperProcessed", true);
      dbg2("Handling autocomplete-suggestions for", { locationField, whichLocation });

      let dText = (isWTSuggestion ? added_node.textContent : added_node.getAttribute("data-val")) || "";
      dbg2("raw suggestion text", dText.slice(0, 200));

      // ---------------------------------------------------------------------
      // Use native names for countries
      // ---------------------------------------------------------------------

      dbg2("options at runtime", window.locationsHelperOptions);
      if (isWTSuggestion && window.locationsHelperOptions?.nativeName) {
        dText = changeToNativeNames(userInput, dText, added_node);
      }

      // ---------------------------------------------------------------------
      // Check if date window matches input date
      // ---------------------------------------------------------------------

      let dateIsGood = true; // default: keep when no dates

      if (!inputRange) {
        dateIsGood = true; // no usable input date
        dbg2("date window eval - no useable input date");
      } else if (!isWTSuggestion) {
        dateIsGood = suggestion.dt === 1;
      } else {
        // Match ranges like:
        // (1801 - 1974)
        // (1801-03 - 1974-11-02)
        // ( - 1974)
        // (1794 - )
        const yearRangeMatch = (dText || "").match(
          /\(\s*([0-9]{4}(?:-[0-9]{2})?(?:-[0-9]{2})?)?\s*-\s*([0-9]{4}(?:-[0-9]{2})?(?:-[0-9]{2})?)?\s*\)/
        );

        if (!yearRangeMatch) {
          dateIsGood = true; // no suggestion range
          dbg2("date window eval - no suggestion range");
        } else {
          const startStr = yearRangeMatch[1] || "";
          const endStr = yearRangeMatch[2] || "";
          const rangeStart = startStr ? parsePartialDateToRange(startStr).start : null;
          const rangeEnd = endStr ? parsePartialDateToRange(endStr).end : null;

          // Check overlap
          if (rangeStart && inputRange.end < rangeStart) dateIsGood = false;
          if (rangeEnd && inputRange.start > rangeEnd) dateIsGood = false;
          dbg2("date window eval", { rangeStart, rangeEnd, inputRange, goodDate: dateIsGood });
        }
      }

      // ---------------------------------------------------------------------
      // Name corrections for time period
      // ---------------------------------------------------------------------

      if (
        isWTSuggestion &&
        (window.locationsHelperOptions?.correctLocations || window.locationsHelperOptions?.addUSCounty)
      ) {
        dText = correctLocation(isoInputDate, dateIsGood, myYear, userInput, dText, added_node);
      }

      // ---------------------------------------------------------------------
      // Colour-code family-related locations
      // ---------------------------------------------------------------------

      const { familyLoc, familyLoc2 } = checkFamilyMatch(dText);
      dbg2("family location flags", { familyLoc, familyLoc2 });

      const $container = $(container);
      if (dateIsGood === true) {
        $(added_node).addClass("rightPeriod");
        if (familyLoc2 === true) {
          $(added_node).addClass("familyLoc2").prependTo($container);
          dbg2("classified as rightPeriod + familyLoc2 (prepended within container)");
        } else if (familyLoc === true) {
          $(added_node).addClass("familyLoc1");
          // Find the last familyLoc2 or the beginning of the container to keep levels separate
          const $lastFamilyLoc2 = $container.find(".familyLoc2:last");
          if ($lastFamilyLoc2.length) {
            $(added_node).insertAfter($lastFamilyLoc2);
          } else {
            $(added_node).prependTo($container);
          }
          dbg2("classified as rightPeriod + familyLoc1 (prepended or inserted after level2)");
        } else {
          dbg2("classified as rightPeriod");
        }
      } else {
        $(added_node).addClass("wrongPeriod").appendTo($container);
        dbg2("classified as wrongPeriod (appended within container)");
      }
    } catch (err) {
      console.error("[locHelper] observer handler error", err);
    }
  });
}

function changeToNativeNames(userInput, before, added_node) {
  dbg2("Normalizing location text for native names");
  const dText = normalizeLocation(before);
  if (dText === before.trim()) return before;

  logIfChanged("normalizeLocation", before, dText);
  const innerBitNorm = $(added_node).find("span:first");
  if (innerBitNorm.length === 0) {
    dbg2("normalize: innerBit 'span:first' not found");
  }
  fixText(added_node, userInput, dText, innerBitNorm);
  return dText;
}

function correctLocation(isoInputDate, isGoodDate, myYear, userInput, dText, added_node) {
  const theDate = new Date(isoInputDate);

  let innerBitText = "";
  if (window.locationsHelperOptions?.correctLocations && isGoodDate) {
    const beforeAll = dText;

    // Brisbane
    dText = dText.replace("Brisbane City, Queensland, Australia", "Brisbane, Queensland, Australia");

    if (dText.match(/Auschwitz-Birkenau/)) {
      dText = "Konzentrationslager Auschwitz-Birkenau, Bielitz, Oberschlesien, Preußen, Deutsches Reich (1941 - 1945)";
    } else if (dText.match(/Auschwitz, Auschwitz/)) {
      dText = "Konzentrationslager Auschwitz, Bielitz, Oberschlesien, Preußen, Deutsches Reich (1941 - 1945)";
    }

    // Remove Canadian districts
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
      dbg2("Wallenhorst record", record);
      addNewSuggestion(added_node, userInput, "Wallenhorst", record);
    }

    // Massachusetts (and other pre-1776 states)
    const lastPart = dText.split("(")[0].trim().split(",").pop();
    const lastPartMatch = lastPart?.match(/[A-z]+/g);
    if (lastPartMatch != null) {
      lastPartMatch.forEach(function (aWord) {
        if (window.USstates[aWord] != undefined) {
          const thisState = window.USstates[aWord];
          if (thisState.former_name_date_established != undefined) {
            const establishedYear = Number(thisState.former_name_date_established.slice(0, 4));
            const admissionYear = Number(thisState.admissionDate.slice(0, 4));
            if (establishedYear <= myYear && admissionYear >= myYear) {
              const { cleanText: x, datePart: y } = stripLocationDates(dText);
              dText = x;
              // if (thisState.former_name_date_established <= myYear && thisState.admissionDate >= myYear) {
              if (myYear >= 1776 && thisState.postRevolutionName) {
                dText =
                  dText.replace(lastPart, " " + aWord) +
                  " (" +
                  "1776-07-04" +
                  " - " +
                  thisState.admissionDate.match(/\d{4}/) +
                  ")";
              } else {
                dText =
                  dText.replace(lastPart, " " + thisState.former_name) +
                  " (" +
                  thisState.former_name_date_established +
                  " - " +
                  thisState.admissionDate.match(/\d{4}/) +
                  ")";
              }
              dbg2("US pre-statehood adjustment", { aWord, myYear, dText, innerBitText });
              fixText(added_node, userInput, dText);
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
      dbg2("Alpharetta record", record);
      addNewSuggestion(added_node, userInput, "Alpharetta", record);
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
      dbg2("Appleton record", record);
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
      addNewSuggestion(added_node, userInput, "Appleton", record, villages);
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
      dbg2("Ferintosh record", record);
      const villages = ["Alcag", "Mulchaich", "Urquhart", "Dunvornie", "Easter Kinkell", "Smithfield", "Logie Wester"];
      addNewSuggestion(added_node, userInput, "Ferintosh", record, villages);
    }

    // Steyning
    if (dText.match(/Steyning/)) {
      if ($(added_node).parent().find(".Steyning").length == 0) {
        dbg2("Adding custom Steyning suggestion");
        addNewSuggestion(added_node, userInput, "Steyning", {
          location: "Steyning, Stogursey, Somerset, England",
        });
      } else {
        dbg2("Steyning suggestion already present");
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
      dText = dText.replace("Cape Province, South Africa", "Cape Colony").replace("Cape, Cape Colony", "Cape Colony");
    } else if ((myYear != "" && theDate < vocEnd) || (theDate >= bataviaStart && theDate < capeColonyStart)) {
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
      dText = dText.replace("Orange Free State, South Africa", "Transoranje").replace("Oranje Unie", "Transoranje");
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
      const parts = dText
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const hasUS = (parts[parts.length - 1] || "").toLowerCase().startsWith("united states");
      // Expect at least <city>, <county>, <state>, United States
      if (hasUS && parts.length >= 3) {
        const stateName = parts[parts.length - 2];
        const countyName = parts[parts.length - 3];
        dbg2("US county parse", { parts, countyName, stateName });

        if (window.UScounties[stateName] != undefined) {
          const thisStateCounties = window.UScounties[stateName];
          if (thisStateCounties.includes(countyName)) {
            if (stateName == "Alaska") {
              const alaskaKeys = Object.keys(window.alaskaEndings);
              alaskaKeys.forEach(function (aKey) {
                if (window.alaskaEndings[aKey]?.includes(countyName)) {
                  const before = dText;
                  parts[parts.length - 3] = countyName + " " + aKey;
                  dText = parts.join(", ");
                  logIfChanged("Alaska borough/census-area suffix", before, dText);
                }
              });
            } else if (stateName == "Louisiana") {
              const before = dText;
              parts[parts.length - 3] = countyName + " Parish";
              dText = parts.join(", ");
              logIfChanged("Louisiana Parish name", before, dText);
            } else {
              const before = dText;
              parts[parts.length - 3] = countyName + " County";
              dText = parts.join(", ");
              logIfChanged("US County suffix", before, dText);
            }
          } else {
            dbg2("County name not in state's list", { countyName, stateName });
          }
        } else {
          dbg2("State not found in UScounties", stateName);
        }
      }
    }
  }

  fixText(added_node, userInput, dText);
  return dText;
}

function injectAugmentedSuggestions(container, suggestions) {
  const frag = document.createDocumentFragment();

  for (const item of suggestions) {
    item.node.classList.add("wbe-injected-suggestion");
    frag.appendChild(item.node);
  }

  container.prepend(frag);
}

function findLocationByDate(dateObj, locationHistory) {
  dbg2("findLocationByDate", {
    date: isNaN(+dateObj) ? null : dateObj.toISOString(),
    records: locationHistory?.length,
  });
  for (let record of locationHistory) {
    const startDate = record.startDate ? new Date(record.startDate) : null;
    const endDate = record.endDate ? new Date(record.endDate) : null;
    if ((!startDate || dateObj >= startDate) && (!endDate || dateObj < endDate)) {
      dbg2("findLocationByDate -> match", record);
      return record;
    }
  }
  dbg2("findLocationByDate -> no match");
  return null;
}

function addNewSuggestion(added_node, userInput, term, record, villages = []) {
  dbg2("addNewSuggestion", { term, location, hasRecord: !!record, villagesCount: villages.length });
  if (!record) return;
  if ($(".autocomplete-suggestion." + term).length) return;

  const item = {
    o: "",
    p: "",
    s: record.startDate || "",
    e: record.endDate || "",
    normalisedPath: "",
    normalisedOrigin: "",
    a: [],
  };
  for (let i = 0; i < villages.length + 1; i++) {
    let villageBit = "";
    if (i > 0) {
      villageBit = villages[i - 1] + ", ";
    }
    item.p = villageBit + record.location;
    item.normalisedPath = normalise(item.p);
    const newSuggestion = formWTSuggestionElement(item, userInput);
    $(newSuggestion.node).addClass(term).insertBefore($(added_node));
  }
}
