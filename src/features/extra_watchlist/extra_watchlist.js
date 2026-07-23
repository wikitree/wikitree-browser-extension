/*
  Created By: Ian Beacall (Beacall-6)
  Extra Watchlist Feature – Two Tabs (Profiles & Spaces) with Sortable Columns
*/

import $ from "jquery";
import Cookies from "js-cookie";
import "jquery-ui/ui/widgets/draggable";
import "jquery-ui/ui/widgets/tabs"; // Ensure tabs widget is loaded
import "../../thirdparty/date.format.js";
import "./extra_watchlist.css";
import { isOK, htmlEntities, getUserWtId, getUserNumId, profilePerson, setHighestZIndex } from "../../core/common";
import { mainDomain } from "../../core/pageType";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";

const CryptoJS = require("crypto-js");

const ONE_HOUR = 60 * 60 * 1000; // ms
const browserAPI = typeof browser !== "undefined" ? browser : chrome;
const DATA_VERSION = "extraWatchlistVersion";
const WATCHLIST_IDS = "extraWatchlist";
const WATCHLIST_DATA = "extraWatchlistData";
const WATCHLIST_NOTES = "extraWatchlistNotes";

let ewData = [];
let loadedEwDataVersion = 0;
let md5AtLoad = "";
let peopleTable;
let spaceTable;
let isLoading = false;

const DEBUG_LOGGING = false;

function getWatchlistNotes() {
  try {
    const raw = localStorage.getItem(WATCHLIST_NOTES);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    console.warn("Failed to parse extra watchlist notes", e);
    return {};
  }
}

function saveWatchlistNotes(notes) {
  localStorage.setItem(WATCHLIST_NOTES, JSON.stringify(notes));
}

function getNoteForId(wtId) {
  const notes = getWatchlistNotes();
  return typeof notes[wtId] === "string" ? notes[wtId] : "";
}

function setNoteForId(wtId, noteText) {
  const notes = getWatchlistNotes();
  const clean = (noteText || "").trim();
  if (clean) {
    notes[wtId] = clean;
  } else {
    delete notes[wtId];
  }
  saveWatchlistNotes(notes);
}

function removeNoteForId(wtId) {
  const notes = getWatchlistNotes();
  if (Object.prototype.hasOwnProperty.call(notes, wtId)) {
    delete notes[wtId];
    saveWatchlistNotes(notes);
  }
}

function pruneNotesToCurrentIds(ids) {
  const notes = getWatchlistNotes();
  const valid = new Set(ids || []);
  let changed = false;
  Object.keys(notes).forEach((wtId) => {
    if (!valid.has(wtId)) {
      delete notes[wtId];
      changed = true;
    }
  });
  if (changed) {
    saveWatchlistNotes(notes);
  }
}

function profileNameCellHtml(row) {
  return `<span class='ew-name-wrap'><a href="https://${mainDomain}/wiki/${htmlEntities(row.wtId)}">${
    row.lName
  }</a></span>`;
}

// ---- Note column (inline editable, sortable) & suggestions ----------

const NOTE_AREA_MAX_PX = 200; // cap cell height; taller notes scroll internally

// Unique, trimmed note values across the whole watchlist, used to offer
// previous notes/project names as reusable suggestions.
function getUniqueNoteValues() {
  const notes = getWatchlistNotes();
  const seen = new Set();
  const values = [];
  Object.values(notes).forEach((v) => {
    const t = (typeof v === "string" ? v : "").trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      values.push(t);
    }
  });
  values.sort((a, b) => a.localeCompare(b));
  return values;
}

// The editable text box shown in each note cell. It's a textarea so long notes
// wrap onto multiple lines instead of being cut off; newlines are preserved.
function noteInputHtml(wtId) {
  const note = getNoteForId(wtId);
  // Keep content on the same line as the opening tag: HTML strips one leading
  // newline after <textarea>, which would corrupt notes that start with a break.
  return `<textarea class="ew-note-input" rows="1" data-id="${htmlEntities(
    wtId
  )}"  maxlength="5000" autocomplete="off">${htmlEntities(note)}</textarea>`;
}

// A DataTables column definition for the note. Bound to wtId so it survives
// API refetches (notes live in their own localStorage store). Display renders
// the textarea; sort/filter use the raw note text so the column is sortable and
// searchable.
function noteColumnDef(width) {
  return {
    title: "Note",
    data: "wtId",
    searchable: true,
    orderable: true,
    render: (data, type, row) => {
      if (type === "display") return noteInputHtml(data);
      return getNoteForId(data);
    },
    width,
    className: "ew-note-col",
  };
}

// Grow a note textarea to fit its content (up to a cap, then it scrolls).
function autoSizeNoteArea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, NOTE_AREA_MAX_PX) + "px";
}

// Size every note textarea inside a container (used after each table draw).
function autoSizeNoteAreasIn(root) {
  $(root)
    .find("textarea.ew-note-input")
    .each(function () {
      autoSizeNoteArea(this);
    });
}

// Return the DataTable a note field belongs to.
function tableForNoteField(field) {
  return $(field).closest("table").attr("id") === "touchedListSpaces" ? spaceTable : peopleTable;
}

// Persist a note field's value and refresh the row's cached sort/search data.
function saveNoteField(field) {
  const table = tableForNoteField(field);
  if (!table) return;
  const $row = $(field).closest("tr");
  const rowData = table.row($row).data();
  const wtId = rowData ? rowData.wtId : $(field).attr("data-id");
  if (!wtId) return;
  const newVal = (field.value || "").trim();
  if (getNoteForId(wtId) === newVal) return; // nothing changed
  setNoteForId(wtId, field.value);
  table.row($row).invalidate("data");
}

// ---- Custom suggestions dropdown (datalist can't attach to a textarea) ------

let $noteSuggestBox = null;
let noteSuggestItems = [];
let noteSuggestActive = -1;
let noteSuggestTarget = null;
let noteDocListenerBound = false;

// Close the dropdown when the user presses down anywhere that isn't the
// dropdown itself or a note field. Capture phase so it runs before focus
// shifts. Clicking another note cell keeps it open (its focusin repositions).
function onNoteDocMouseDown(e) {
  if (!$noteSuggestBox || !$noteSuggestBox.is(":visible")) return;
  const t = e.target;
  if (t && t.closest && (t.closest("#ewNoteSuggestBox") || t.closest("textarea.ew-note-input"))) return;
  hideNoteSuggestions();
}

// common.js raises any clicked .wbe-popup to the top z-index. That fires on the
// same click that focuses a note cell, so it would otherwise leapfrog the popup
// above the dropdown. Re-raise the dropdown right after (this handler is bound
// after common.js's, so it runs second) to keep it on top. Only does the DOM
// scan while the dropdown is actually open, so ordinary clicks stay cheap.
function raiseNoteBoxAbovePopup() {
  if ($noteSuggestBox && $noteSuggestBox.is(":visible")) {
    setHighestZIndex($noteSuggestBox);
  }
}

function ensureNoteSuggestBox() {
  if (!$noteSuggestBox || $noteSuggestBox.parent().length === 0) {
    // Append INSIDE the watchlist popup, not <body>: as a child of the popup the
    // dropdown always paints above the popup's own content and rides along when
    // the popup is raised, so the popup can't cover it. The z-index handling
    // below is belt-and-suspenders on top of that.
    const host = document.getElementById("extraWatchlistWindow") || document.body;
    $noteSuggestBox = $("<div id='ewNoteSuggestBox' class='ew-note-suggest'></div>").appendTo(host);
    setHighestZIndex($noteSuggestBox);
    // mousedown (not click) so selection happens before the textarea blurs.
    $noteSuggestBox.on("mousedown", ".ew-note-suggest-item", function (e) {
      e.preventDefault();
      applyNoteSuggestion(Number($(this).attr("data-idx")));
    });
  }
  if (!noteDocListenerBound) {
    document.addEventListener("mousedown", onNoteDocMouseDown, true);
    // Bound after common.js's .wbe-popup click handler, so this runs second and
    // lifts the dropdown back above the just-raised popup.
    $(document).on("click.ewNoteRaise", "#extraWatchlistWindow", raiseNoteBoxAbovePopup);
    noteDocListenerBound = true;
  }
  return $noteSuggestBox;
}

function hideNoteSuggestions() {
  if ($noteSuggestBox) $noteSuggestBox.hide();
  noteSuggestItems = [];
  noteSuggestActive = -1;
  noteSuggestTarget = null;
}

function positionNoteSuggestBox(field) {
  const r = field.getBoundingClientRect();
  const width = Math.max(180, r.width);
  $noteSuggestBox.css({
    position: "fixed",
    top: Math.min(window.innerHeight - 30, r.bottom + 2),
    left: Math.max(6, Math.min(window.innerWidth - width - 6, r.left)),
    width,
  });
}

function showNoteSuggestions(field) {
  const val = (field.value || "").trim().toLowerCase();
  const matches = getUniqueNoteValues()
    .filter((v) => {
      const lv = v.toLowerCase();
      return lv !== val && (val === "" || lv.includes(val));
    })
    .slice(0, 8);
  if (matches.length === 0) {
    hideNoteSuggestions();
    return;
  }
  noteSuggestItems = matches;
  noteSuggestActive = -1;
  noteSuggestTarget = field;
  const $box = ensureNoteSuggestBox();
  $box.html(
    matches.map((m, i) => `<div class='ew-note-suggest-item' data-idx='${i}'>${htmlEntities(m)}</div>`).join("")
  );
  positionNoteSuggestBox(field);
  $box.show();
}

function moveNoteSuggestActive(dir) {
  if (!$noteSuggestBox || noteSuggestItems.length === 0) return;
  noteSuggestActive = (noteSuggestActive + dir + noteSuggestItems.length) % noteSuggestItems.length;
  $noteSuggestBox.find(".ew-note-suggest-item").removeClass("active").eq(noteSuggestActive).addClass("active");
}

function applyNoteSuggestion(idx) {
  const field = noteSuggestTarget;
  if (!field || idx < 0 || idx >= noteSuggestItems.length) return;
  field.value = noteSuggestItems[idx];
  autoSizeNoteArea(field);
  saveNoteField(field);
  hideNoteSuggestions();
  field.focus();
}

// Wire up inline note editing + suggestions for a table's tbody. We use native
// addEventListener delegation (focusin/focusout/input bubble natively) rather
// than jQuery's delegated .on("focus"/"blur"): jQuery 3.7 routes those through
// a capture-phase simulation that doesn't fire reliably here, which would leave
// the suggestions dropdown from ever opening.
function bindNoteEditing($tbody) {
  const tbody = $tbody && $tbody[0];
  if (!tbody || tbody.__ewNoteBound) return;
  tbody.__ewNoteBound = true;
  const isNoteField = (el) => el && el.matches && el.matches("textarea.ew-note-input");

  tbody.addEventListener("focusin", (e) => {
    if (!isNoteField(e.target)) return;
    autoSizeNoteArea(e.target);
    showNoteSuggestions(e.target);
  });

  tbody.addEventListener("input", (e) => {
    if (!isNoteField(e.target)) return;
    autoSizeNoteArea(e.target);
    showNoteSuggestions(e.target);
  });

  tbody.addEventListener("keydown", (e) => {
    if (!isNoteField(e.target)) return;
    if (!$noteSuggestBox || !$noteSuggestBox.is(":visible") || noteSuggestItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveNoteSuggestActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveNoteSuggestActive(-1);
    } else if (e.key === "Enter" && noteSuggestActive >= 0) {
      e.preventDefault(); // pick highlighted suggestion instead of adding a newline
      applyNoteSuggestion(noteSuggestActive);
    } else if (e.key === "Escape" || e.key === "Tab") {
      hideNoteSuggestions();
    }
  });

  tbody.addEventListener("focusout", (e) => {
    if (!isNoteField(e.target)) return;
    saveNoteField(e.target);
    // NOTE: we deliberately do NOT hide the suggestions here. Something on the
    // host page briefly steals focus on left-click (a click-handler firing a
    // transient blur), which would make the dropdown flash and vanish. The
    // dropdown is closed instead by Escape/Tab, picking an item, or a mousedown
    // outside it (see onNoteDocMouseDown) — never by a blur.
    // A data refresh that arrived mid-edit was deferred; catch up now that the
    // field has lost focus.
    flushPendingNoteRedraws();
  });
}
// ====================================================================
// INITIALIZATION
// ====================================================================
shouldInitializeFeature("extraWatchlist").then((result) => {
  if (result && $("body.edit-family,body.edit-person").length === 0) {
    normalizeLocalStorage();
    extraWatchlist();
    setPlusButton();
    browserAPI.storage.onChanged.removeListener(storageChangeListener);
    browserAPI.storage.onChanged.addListener(storageChangeListener);
  }
});

// Normalize localStorage: replace "@" with commas and back up if needed.
const normalizeLocalStorage = () => {
  const extraWatchlist = localStorage.getItem(WATCHLIST_IDS);
  if (extraWatchlist && extraWatchlist.includes("@") && !extraWatchlist.includes(",")) {
    localStorage.setItem("extraWatchlistBackUp", extraWatchlist);
    localStorage.setItem(WATCHLIST_IDS, extraWatchlist.replace(/@/g, ","));
  }
  const version = localStorage.getItem(DATA_VERSION);
  if (!version) {
    const newVersion = Date.now();
    localStorage.setItem(DATA_VERSION, newVersion);
    browserAPI.storage.local.set({ [DATA_VERSION]: newVersion });
  }
};

// ====================================================================
// DATA STORAGE AND RETRIEVAL
// ====================================================================

// Returns id-list and set global md5AtLoad loadedEwDataVersion and ewData
function getFullWatchlist() {
  const ids = getWatchlistIds();
  const newVersion = Number(localStorage.getItem(DATA_VERSION));
  if (newVersion === loadedEwDataVersion) {
    if (DEBUG_LOGGING) console.log(`No need to load,  ids=${ids.length}`);
    return ids;
  }
  const ewd = localStorage.getItem(WATCHLIST_DATA) || JSON.stringify([]);
  md5AtLoad = CryptoJS.MD5(ewd).toString();
  ewData = JSON.parse(ewd);
  loadedEwDataVersion = newVersion;
  if (DEBUG_LOGGING) console.log(`Loaded ewData: v:${loadedEwDataVersion}, count=${ids.length}, size=${ewd.length}`);
  return ids;
}

function getWatchlistIds() {
  const ids = localStorage.getItem(WATCHLIST_IDS);
  return ids
    ? ids
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id !== "")
    : [];
}

function saveWatchList(ids) {
  let idArray = ids;
  if (typeof ids === "string") {
    idArray = ids
      .split(",")
      .map((id) => encodeURIComponent(decodeURIComponent(id.trim())))
      .filter((id) => id !== "");
  }
  const idString = idArray.sort().join(",");
  const dataIds = ewData.map((d) => d.wtId).sort();
  const dataIdsString = dataIds.join(",");
  if (DEBUG_LOGGING)
    console.log(`saveWatchList: v:${loadedEwDataVersion}, count=${idArray.length}, ${idString}`, dataIds);

  if (idString != dataIdsString) {
    if (DEBUG_LOGGING)
      console.log(
        `ewData out of sync: ids=${idArray.length} vs ewData=${ewData.length}, sizes: ${idString.length} va ${dataIdsString.length}, clearing ewData`
      );
    // const [a, b] = arrayDifferences(idArray, dataIds);
    // console.log("In ids and not in ewData", a);
    // console.log("In ewData and not in ids", b);
    ewData = [];
  }
  const jsonData = JSON.stringify(ewData);
  const newMd5 = CryptoJS.MD5(jsonData).toString();
  if (newMd5 === md5AtLoad && idString == dataIdsString) {
    // No changes, so no need to change anything
    if (DEBUG_LOGGING) console.log("No need to save");
    return;
  }

  md5AtLoad = newMd5;
  loadedEwDataVersion = Date.now();
  if (DEBUG_LOGGING)
    console.log(`Saving new ewData: v:${loadedEwDataVersion}, count=${idArray.length} size=${jsonData.length}`);
  localStorage.setItem(WATCHLIST_IDS, idString);
  localStorage.setItem(WATCHLIST_DATA, jsonData);
  pruneNotesToCurrentIds(idArray);
  localStorage.setItem(DATA_VERSION, loadedEwDataVersion);
  browserAPI.storage.local.set({ [DATA_VERSION]: loadedEwDataVersion });
}

// Check if ewData contains all and only the ids in ids
function watchlistInSync(ids) {
  let inSync = false;
  const dataIds = ewData.map((d) => d.wtId).sort();
  if (ids.length == dataIds.length) {
    const idsString = ids.sort().join(",");
    const dataIdsString = dataIds.join(",");
    if (idsString == dataIdsString) {
      inSync = true;
    }
  }
  // if (!inSync) {
  //   const [a, b] = arrayDifferences(ids, dataIds);
  //   console.log(`saveWatchList nrIds=${ids.length}, nrDataIds=${dataIds.length}`);
  //   console.log("In ids but not in ewData", a);
  //   console.log("In ewData but not in ids", b);
  // }
  return inSync;
}

function arrayDifferences(a, b) {
  // Elements in 'a' not in 'b'
  const aNotInB = a.filter((element) => !b.includes(element));

  // Elements in 'b' not in 'a'
  const bNotInA = b.filter((element) => !a.includes(element));

  return [aNotInB, bNotInA];
}

// ====================================================================
// UTILITY FUNCTIONS
// ====================================================================

// Returns the current ID from the URL (if a space) or from the profile.
const getThisID = () =>
  encodeURIComponent(
    decodeURIComponent(window.location.href.split(/[?#]/)[0].match(/Space(:|%3A).*$/)?.[0] || profilePerson?.Name)
  );

// Returns a formatted date string "YYYY-MM-DD_HHMM".
const strDate = () => {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
};

// Show a blank rather than "unknown"/"unknowns" for missing birth/death years.
// "living" and real years pass through unchanged.
function cleanYear(v) {
  const s = v == null ? "" : String(v).trim();
  return /^unknowns?$/i.test(s) ? "" : s;
}

function formDate(input) {
  const pt = isOK(input) ? input : input !== "" ? input : false;
  let ptOut = "";
  if (pt) {
    const ptY = pt.substr(0, 4);
    const ptm = pt.substr(4, 2);
    const ptd = pt.substr(6, 2);
    const ptH = pt.substr(8, 2);
    const pti = pt.substr(10, 2);
    const pts = pt.substr(12, 2);
    const tDate = new Date(`${ptY}-${ptm}-${ptd} ${ptH}:${pti}:${pts}`);
    ptOut = "" + tDate.format("Y-m-d");
  }
  return ptOut;
}

// ====================================================================
// API CALL FUNCTIONS
// ====================================================================

const WBE_EW_APP_ID = "WBE_extra_watchlist";

const FIELDS =
  "BirthDate,BirthDateDecade,DeathDate,DeathDateDecade,Derived.LongName,Derived.LongNamePrivate,Derived.ShortName," +
  "FirstName,Id,IsLiving,IsSpace,LastNameAtBirth,Name,PageId,RealName,Title,Touched";

function extractPerson(data) {
  let bYear = data?.BirthDate?.substr(0, 4) || "";
  if (!isOK(bYear)) {
    bYear = data?.BirthDateDecade || "";
  }

  let dYear = data?.DeathDate?.substr(0, 4) || "";
  if (!isOK(dYear)) dYear = data?.DeathDateDecade || "";
  if ((cleanYear(dYear) === "" || dYear == "") && data.IsLiving === 1) dYear = "living";

  return {
    type: "p",
    bYear: cleanYear(bYear),
    dYear: cleanYear(dYear),
    lName: isOK(data.LongNamePrivate) ? data.LongNamePrivate : isOK(data.ShortName) ? data.ShortName : "Private",
    wtId: data.Name ? encodeURIComponent(decodeURIComponent(data.Name.replaceAll(" ", "_"))) : "",
    numId: data.Id,
    touched: data.Touched || "",
  };
}

function extractFSP(theData) {
  const data = theData?.profile;
  // console.log(theData);
  // console.log("extractFSP", data);
  return {
    type: "s",
    lName: data?.Title?.Text || theData?.page_name?.replace(/Space:/, "").replace(/_/g, " ") || "",
    wtId: data?.Title?.PrefixedURL
      ? encodeURIComponent(decodeURIComponent(data?.Title?.PrefixedURL))
      : encodeURIComponent(decodeURIComponent(theData?.page_name)) || "",
    numId: data?.PageId || theData?.Profile?.Id || 0,
    touched: data?.Touched || "",
  };
}

// ====================================================================
// WATCHLIST MANAGEMENT
// ====================================================================

const doExtraWatchlist = () => {
  // Prevent overlapping calls
  if (isLoading) {
    if (DEBUG_LOGGING) console.log("Data fetch already in progress, skipping new fetch");
    return;
  }
  isLoading = true;

  const userWtId = getUserWtId();
  if (userWtId) {
    window.userName = userWtId;
    window.userID = getUserNumId();
    const ids = getFullWatchlist();
    setEmptyMessages();
    if (ids.length > 0) {
      if (ewData.length && Date.now() - loadedEwDataVersion < ONE_HOUR && watchlistInSync(ids)) {
        redrawPeopleTable();
        redrawSpaceTable();
        isLoading = false;
      } else {
        const spacePages = ids.filter((x) => x.match("^Space%3A"));
        const personPages = ids.filter((x) => !x.match("^Space%3A")).map((id) => decodeURIComponent(id));
        ewData = [];
        const errors = [];

        // Function to process person pages in chunks of 1000
        const handlePersonPages = () => {
          const personPromises = [];
          while (personPages.length) {
            const keys = personPages.splice(0, 1000);
            personPromises.push(
              WikiTreeAPI.getPeople(WBE_EW_APP_ID, keys, FIELDS).then(([status, , people]) => {
                if (status !== "") errors.push(status);
                const extractedData = Object.keys(people).map((aKey) => extractPerson(people[aKey]));
                ewData.push(...extractedData);
                redrawPeopleTable();
              })
            );
          }
          return Promise.all(personPromises);
        };

        // Function to process space pages
        const handleSpacePages = () => {
          // console.log("spacePages", spacePages);
          const spacePromises = spacePages.map(async (aKey) => {
            //  console.log("aKey", aKey);
            const [profile, status, page_name] = await WikiTreeAPI.getProfile(
              WBE_EW_APP_ID,
              decodeURIComponent(aKey),
              FIELDS
            );
            if (status != 0) errors.push(status);
            //  console.log("fsp", { profile, status, page_name });
            const fspData = extractFSP({ profile, status, page_name });
            ewData.push(fspData);
          });
          return Promise.all(spacePromises);
        };

        // Execute both sets of promises and then update the watchlist display
        Promise.all([handlePersonPages(), handleSpacePages()])
          .then(() => {
            redrawSpaceTable();
            let newIds = ids;
            if (errors.length > 0) {
              console.error("Errors while fetching extra watchlist profiles", errors);
            } else {
              newIds = ewData.map((d) => d.wtId);
            }
            saveWatchList(newIds);
            isLoading = false;
          })
          .catch((err) => {
            console.error("Error retrieving extra watchlist items:", err);
            isLoading = false;
          });
      }
    } else {
      isLoading = false;
    }
  }
  if (Cookies.get("wikidb_wtb__session")) {
    $("#mloginForm").hide();
  }
};

// Debounced storage change listener to avoid rapid-fire triggers.
// We only debounce events we are interested in, others we ignore
let debounceTimer = null;
function storageChangeListener(changes, namespace) {
  if (namespace === "local" && changes[DATA_VERSION]) {
    if (DEBUG_LOGGING) console.log("Extra Watchlist Change Notification");
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const newVersion = Number(changes[DATA_VERSION].newValue);
      if (DEBUG_LOGGING)
        console.log(`Storage change. Current version: ${loadedEwDataVersion} New version: ${newVersion}`);
      if (newVersion !== loadedEwDataVersion) {
        if ($("#extraWatchlistWindow").length) {
          doExtraWatchlist();
        } else {
          getFullWatchlist();
        }
        setPlusButton();
      }
      debounceTimer = null;
    }, 300);
  }
}

function setEmptyMessages() {
  peopleTable.settings()[0].oLanguage.sEmptyTable = "You have no person profiles in your Extra Watchlist.";
  spaceTable.settings()[0].oLanguage.sEmptyTable = "You have no space pages in your Extra Watchlist.";
}

// ====================================================================
// POPUP & INTERACTION
// ====================================================================

const extraWatchlist = async () => {
  setPlusButton();
  const $plusButton = $("#addToExtraWatchlistButton");

  $("#extraWatchlistButton").on("click", (e) => {
    e.preventDefault();
    const $popup = $("#extraWatchlistWindow");
    if ($popup.length === 0) {
      createWatchlistPopup(e.pageY).then(() => {
        try {
          // Elevate above any existing .wbe-popup (cheat sheet, notes, etc.)
          import("../../core/common").then(
            (m) => m.setHighestZIndex && m.setHighestZIndex(document.getElementById("extraWatchlistWindow"))
          );
        } catch {}
      });
    } else {
      // If already visible, bring to front instead of immediately closing unless modifier (Shift) pressed
      if ($popup.is(":visible") && !e.shiftKey) {
        try {
          import("../../core/common").then((m) => m.setHighestZIndex && m.setHighestZIndex($popup.get(0)));
        } catch {}
      } else {
        closeWatchlistPopup($popup);
      }
    }
  });

  // Toggle the current profile in the watchlist.
  $plusButton.on("click", (e) => {
    e.preventDefault();
    const currentID = getThisID();
    let list = getWatchlistIds();
    if (list.includes(currentID)) {
      // The profile is already on the watchlist, remove it.
      list = list.filter((id) => id !== currentID);
      ewData = ewData.filter((d) => d.wtId != currentID);
      removeNoteForId(currentID);
      if ($("#extraWatchlistWindow").is(":visible")) {
        const htmlIds = htmlEntities(currentID);
        let row = peopleTable.row($(`#touchedListPersons tbody tr[data-id="${htmlIds}"]`));
        if (row.length == 0) {
          row = spaceTable.row($(`#touchedListSpaces tbody tr[data-id="${htmlIds}"]`));
        }
        row.remove().draw();
      }
      saveWatchList(list);
      setPlusButton();
    } else {
      // The profile is not on the watchlist, add it.
      list.push(currentID);
      //console.log(currentID);
      // console.log(decodeURIComponent(currentID));
      WikiTreeAPI.getProfile(WBE_EW_APP_ID, decodeURIComponent(currentID), FIELDS).then(
        ([profile, status, page_name]) => {
          const visible = $("#extraWatchlistWindow").is(":visible");
          if (profile?.IsSpace) {
            const record = extractFSP({ profile, status, page_name });
            ewData.push(record);
            if (visible) spaceTable.row.add(record).draw(false);
          } else {
            const record = extractPerson(profile);
            ewData.push(record);
            if (visible) peopleTable.row.add(record).draw(false);
          }
          saveWatchList(list);
          setPlusButton();
        }
      );
    }
  });
};

// Creates the popup with two tabs: Profiles (default) and Spaces.
const createWatchlistPopup = async (mouseY) => {
  // Create at document root (body) with position:fixed so it is not trapped inside a lower z-index stacking context
  // (previously it was inserted inside the page layout, making it impossible to rise above the cheat sheet which sits at body level).
  const $popup = $("<div id='extraWatchlistWindow' class='ui-widget-content wbe-popup'></div>");
  // Hotkey-triggered synthetic clicks may not supply a real pageY; fall back near the triggering button or a default offset.
  let safeMouseY = typeof mouseY === "number" && mouseY > 0 ? mouseY : null;
  if (!safeMouseY) {
    const btn = document.getElementById("extraWatchlistButton");
    if (btn) {
      const rect = btn.getBoundingClientRect();
      safeMouseY = (window.scrollY || window.pageYOffset || 0) + rect.bottom + 5;
    } else {
      safeMouseY = (window.scrollY || window.pageYOffset || 0) + 100; // generic fallback
    }
  }
  const viewportTop = safeMouseY - (window.scrollY || window.pageYOffset || 0) + 10; // convert to viewport
  $popup.appendTo("body").css({
    position: "fixed",
    top: Math.max(10, viewportTop),
    left: "10px",
  });
  // Raise immediately so first render is on top (after moving to body)
  try {
    import("../../core/common").then((m) => m.setHighestZIndex && m.setHighestZIndex($popup.get(0)));
  } catch {}
  // Sticky header for controls.
  const $header = $("<div id='extraWatchlistHeader'></div>").css({
    position: "sticky",
    top: "0",
    background: "#fff",
    zIndex: 1000,
    padding: "10px",
    borderBottom: "1px solid #ccc",
  });
  // Make entire popup draggable by header when jQuery UI is available
  try {
    if ($.fn.draggable) {
      $popup.draggable({
        handle: "#extraWatchlistHeader",
        start: () => {
          try {
            import("../../core/common").then((m) => m.setHighestZIndex && m.setHighestZIndex($popup.get(0)));
          } catch {}
        },
      });
    }
  } catch {}
  $header.append("<button id='closeWatchlistWindow' class='small close-popup'>&times;</button>");
  $header.append(
    `<div id="importExportButtons">
       <a id='importExtraWatchlist' class='importExport btn-pill-sm small button'>import</a>
       <a id='exportExtraWatchlist' class='importExport btn-pill-sm small button'>export</a>
     </div>`
  );
  $popup.prepend($header);

  const $tabs = $(`
    <div id="extraWatchlistTabs">
      <ul>
        <li><a href="#tabs-persons">Profiles</a></li>
        <li><a href="#tabs-spaces">Spaces</a></li>
      </ul>
      <div id="tabs-persons">
        <table id="touchedListPersons" class="all">
          <thead></thead>
          <tbody></tbody>
          <tfoot>
          </tfoot>
        </table>
      </div>
      <div id="tabs-spaces">
        <table id="touchedListSpaces" class="all">
          <thead></thead>
          <tbody></tbody>
          <tfoot>
          </tfoot>
        </table>
      </div>
    </div>
  `);

  $popup.append($tabs);

  // Initialize the tabs widget (by default the first tab is the active one).
  $tabs.tabs({
    activate: (event, ui) => {
      const dTable = ui.newPanel.find("#touchedListSpaces").length ? spaceTable : peopleTable;
      dTable.columns.adjust().draw();
    },
  });

  const options = await getFeatureOptions("extraWatchlist");
  let personSortOrder = [];
  let spaceSortOrder = [];
  switch (options.sortBy) {
    case "ID":
      personSortOrder = [0, "asc"];
      spaceSortOrder = [0, "asc"];
      break;

    case "Name":
      personSortOrder = [1, "asc"];
      spaceSortOrder = [0, "asc"];
      break;

    case "Changed":
      personSortOrder = [5, "desc"];
      spaceSortOrder = [2, "desc"];
      break;

    default:
      break;
  }

  peopleTable = $("#touchedListPersons").DataTable({
    data: ewData.filter((d) => d.type == "p"),
    columns: [
      { title: "ID", data: "wtId", render: (data, type, row) => decodeURIComponent(data), width: "18%" },
      {
        title: "Name",
        data: "lName",
        render: (data, type, row) => {
          if (type === "display") {
            return profileNameCellHtml(row);
          }
          return data;
        },
        width: "30%",
      },
      { title: "Birth", data: "bYear", render: (data) => cleanYear(data), width: "5%" },
      { title: "Death", data: "dYear", render: (data) => cleanYear(data), width: "5%" },
      noteColumnDef("24%"),
      {
        title: "Changed",
        data: "touched",
        render: (data, type, row) => {
          if (type === "display" || type === "filter") {
            return formDate(data);
          }
          return data;
        },
        width: "9%",
      },
      {
        title: "",
        data: "numId",
        searchable: false,
        orderable: false,
        render: (data, type, row) => {
          if (type === "display") {
            return `<a href="https://${mainDomain}/index.php?title=Special:NetworkFeed&who=${data}" title='See recent changes'>Changes</a>`;
          }
          return data;
        },
        width: "8%",
      },
      {
        title: "",
        data: "wtId",
        searchable: false,
        orderable: false,
        render: (data, type, row) => {
          if (type === "display") {
            return `<span class='removeFromExtraWatchlist' data-id="${htmlEntities(data)}">&times;</span>`;
          }
          return data;
        },
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).attr("title", "Remove from your Extra Watchlist");
        },
        width: "3%",
        className: "dt-center",
      },
    ],
    createdRow: function (row, data, dataIndex) {
      const $row = $(row);
      $row.attr("data-id", htmlEntities(data.wtId));
    },
    language: {
      emptyTable: "No records found. Please wait while we fetch the data...",
    },
    order: personSortOrder,
    scrollY: 500,
    scrollCollapse: true, // Allow the table to reduce in height if the data is smaller
    deferRender: true,
    scroller: true,
    paging: false,
    searching: true, // Enable the search box
    searchDelay: 400, // Debounce user input - only start search/filter after 400ms of no typing
    autoWidth: false,
    drawCallback: function () {
      autoSizeNoteAreasIn(this.api().table().body());
    },
  });

  const $peopleBody = $("#touchedListPersons tbody");
  $peopleBody.off("click.ewRemove").on("click.ewRemove", "span.removeFromExtraWatchlist", function (e) {
    e.preventDefault();
    e.stopPropagation();
    const $row = $(this).closest("tr");
    const rowData = peopleTable.row($row).data();
    if (!rowData) return;

    ewData = ewData.filter((d) => d.wtId !== rowData.wtId);
    removeNoteForId(rowData.wtId);
    const ids = ewData.map((d) => d.wtId);
    peopleTable.row($row).remove().draw();

    saveWatchList(ids);
    setPlusButton();
  });

  bindNoteEditing($peopleBody);

  spaceTable = $("#touchedListSpaces").DataTable({
    data: ewData.filter((d) => d.type == "s"),
    columns: [
      {
        title: "Name",
        data: "lName",
        render: (data, type, row) => {
          if (type === "display") {
            return `<a href="https://${mainDomain}/wiki/${htmlEntities(
              row.wtId.replace(/^Space%3[Aa]/, "Space:")
            )}">${data}</a>`;
          }
          return data;
        },
        width: "58%",
      },
      noteColumnDef("22%"),
      {
        title: "Changed",
        data: "touched",
        render: (data, type, row) => {
          if (type === "display" || type === "filter") {
            return formDate(data);
          }
          return data;
        },
        width: "9%",
      },
      {
        title: "",
        data: "numId",
        searchable: false,
        orderable: false,
        render: (data, type, row) => {
          if (type === "display" && data) {
            return `<a href="https://${mainDomain}/index.php?title=Special:NetworkFeed&space=${data}" title='See recent changes'>Changes</a>`;
          }
          return "";
        },
        width: "8%",
      },
      {
        title: "",
        data: "wtId",
        searchable: false,
        orderable: false,
        render: (data, type, row) => {
          if (type === "display") {
            return `<span class='removeFromExtraWatchlist' data-id="${htmlEntities(data)}">&times;</span>`;
          }
          return data;
        },
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).attr("title", "Remove from your Extra Watchlist");
        },
        width: "3%",
        className: "dt-center",
      },
    ],
    createdRow: function (row, data, dataIndex) {
      const $row = $(row);
      $row.attr("data-id", htmlEntities(data.wtId));
      $row
        .find("span.removeFromExtraWatchlist")
        .off("click")
        .on("click", function () {
          const rowId = htmlEntities(data.wtId);

          // Remove from ewData
          ewData = ewData.filter((d) => htmlEntities(d.wtId) !== rowId);
          removeNoteForId(data.wtId);
          const ids = ewData.map((d) => d.wtId);

          // Remove the row from the DataTable
          spaceTable
            .row($row) // Reference the row
            .remove() // Remove it
            .draw(); // Redraw the table

          saveWatchList(ids);
          setPlusButton();
        });
    },
    order: spaceSortOrder,
    scrollY: 500,
    scrollCollapse: true, // Allow the table to reduce in height if the data is smaller
    deferRender: true,
    scroller: true,
    paging: false,
    searching: true, // Enable the search box
    searchDelay: 400, // Debounce user input - only start search/filter after 400ms of no typing
    autoWidth: false,
    drawCallback: function () {
      autoSizeNoteAreasIn(this.api().table().body());
    },
  });

  bindNoteEditing($("#touchedListSpaces tbody"));

  // $popup.append('<p id="ewlEmpty">Empty?</p>');

  $("#closeWatchlistWindow").on("click", () => closeWatchlistPopup($popup));

  // Setup export functionality.
  $("#exportExtraWatchlist")
    .off()
    .on("click", function (e) {
      e.preventDefault();

      const ewText = localStorage.getItem(WATCHLIST_IDS)?.replace(/@/g, ",") || "";
      const dStr = strDate();
      const blob = new Blob([ewText], { type: "text/plain" });

      // For Safari: use FileReader to create a data URI
      if (
        typeof window.navigator !== "undefined" &&
        window.navigator.userAgent.includes("Safari") &&
        !window.navigator.userAgent.includes("Chrome")
      ) {
        const reader = new FileReader();
        reader.onloadend = function () {
          const tempLink = document.createElement("a");
          tempLink.href = reader.result;
          tempLink.download = `extraWatchlist_${dStr}.txt`;
          document.body.appendChild(tempLink);
          tempLink.click();
          document.body.removeChild(tempLink);
        };
        reader.readAsDataURL(blob);
      } else {
        // Other browsers: use Blob URL
        const blobUrl = window.URL.createObjectURL(blob);
        const tempLink = document.createElement("a");
        tempLink.href = blobUrl;
        tempLink.download = `extraWatchlist_${dStr}.txt`;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        window.URL.revokeObjectURL(blobUrl); // cleanup
      }
    });

  // Setup import functionality.
  $("#importExtraWatchlist")
    .off()
    .on("click", (e) => {
      e.preventDefault();
      const fileChooser = document.createElement("input");
      fileChooser.type = "file";
      fileChooser.addEventListener("change", () => {
        const file = fileChooser.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          let textData = ev.target.result.replace(/@/g, ",");
          textData = textData.replace(/,+\s*$/, "");
          saveWatchList(textData);
          $popup.remove();
          $("#extraWatchlistButton").trigger("click");
        };
        reader.onerror = (err) => console.error("Error reading file:", err);
        reader.readAsText(file);
      });
      fileChooser.click();
    });

  setTimeout(() => {
    setHighestZIndex($popup);
    // Size note textareas once the popup is actually visible (scrollHeight is 0
    // while it's display:none, which would leave them collapsed).
    $popup.slideDown(400, () => autoSizeNoteAreasIn("#extraWatchlistWindow"));
  }, 1000);

  $popup.draggable({
    containment: "document",
    handle: "#extraWatchlistHeader",
    cursor: "move",
  });

  $popup.on("dblclick", () => closeWatchlistPopup($popup));
  doExtraWatchlist();
};

// A full redraw recreates every row, which destroys a note textarea that's
// being edited (blurs it, closes the suggestions dropdown, drops unsaved text).
// So while a note field is focused we defer the redraw and flush it on blur.
// Note: columns.adjust() only re-measures widths — it does NOT recreate rows —
// so it's safe to call during editing (and we no longer chain .draw() to it).
let pendingPeopleRedraw = false;
let pendingSpaceRedraw = false;

function isEditingNote() {
  const el = document.activeElement;
  return !!(el && el.classList && el.classList.contains("ew-note-input"));
}

function flushPendingNoteRedraws() {
  if (pendingPeopleRedraw) redrawPeopleTable();
  if (pendingSpaceRedraw) redrawSpaceTable();
}

function redrawPeopleTable() {
  if (isEditingNote()) {
    pendingPeopleRedraw = true;
    return;
  }
  pendingPeopleRedraw = false;
  peopleTable.clear(); // Clear existing data
  peopleTable.rows.add(ewData.filter((d) => d.type == "p")); // Add new/updated data
  peopleTable.draw();
  setTimeout(() => {
    peopleTable.columns.adjust();
  }, 1000);
}

function redrawSpaceTable() {
  if (isEditingNote()) {
    pendingSpaceRedraw = true;
    return;
  }
  pendingSpaceRedraw = false;
  spaceTable.clear(); // Clear existing data
  spaceTable.rows.add(ewData.filter((d) => d.type == "s")); // Add new/updated data
  spaceTable.draw();
  setTimeout(() => {
    spaceTable.columns.adjust();
  }, 1000);
}

function closeWatchlistPopup($popup) {
  hideNoteSuggestions();
  if (noteDocListenerBound) {
    document.removeEventListener("mousedown", onNoteDocMouseDown, true);
    $(document).off("click.ewNoteRaise");
    noteDocListenerBound = false;
  }
  $("#ewNoteSuggestBox").remove();
  $noteSuggestBox = null;
  $popup.slideUp("swing");
  $popup.remove();
}

// ====================================================================
// BUTTON STATE UPDATE
// ====================================================================
const setPlusButton = () => {
  const id = getThisID();
  if (!id) return;
  const thisID = id.toString();
  const ids = getWatchlistIds();
  if (ids.includes(thisID)) {
    const title = "On your Extra Watchlist (click to remove)";
    $("#addToExtraWatchlistButton")
      .addClass("onList") //.attr("title", "On your Extra Watchlist (click to remove)");
      .attr("data-bs-title", title)
      .attr(`data-tooltip`, title);
  } else {
    const title = "Add to your Extra Watchlist";
    $("#addToExtraWatchlistButton")
      .removeClass("onList") //.attr("title", "Add to your Extra Watchlist");
      .attr("data-bs-title", title)
      .attr(`data-tooltip`, title);
  }
};

// Make every link in the popup open in a new tab

$(document).on("click", "#extraWatchlistWindow a[href*='wiki']", function (e) {
  e.preventDefault();
  const href = $(this).attr("href");
  window.open(href, "_blank");
});
