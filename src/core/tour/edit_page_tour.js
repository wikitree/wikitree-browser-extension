// "Show me around" the edit page (2026-10-23): a demo of what WBE can do on a profile's edit page, started from
// the ▶ beside the sparkle at the top (common.js). It shows the features at work, not just their buttons: the
// Gold Standard Inspector and Genie answer, a place typed brings up Locations Helper's suggestions, Auto Bio and
// Auto Categories write, a citation is pasted and tidied, Find and Replace finds, the clipboard and Text Expander
// open, and Suggest explains the changes. A feature that's switched off is shown too, with a note saying how to
// turn it on. Everything goes back as it was at the end, or when the tour is stopped (edit_page_demo.js);
// nothing is saved.

import { startTour } from "./tour_ui";
import { bioText, keepEditPage, pageChanged, selectInBio, showInBio } from "./edit_page_demo";
import { switchBack, switchOnAndReload, switchedOnForTour } from "./tour_features";
import { IndexedDBHelper } from "../lib/indexedDBHelper";
import { getEnabledStateForAllFeatures, getFeatureOptions } from "../options/options_storage";

const EDITOR = "#wpTextbox1 + .CodeMirror, #wpTextbox1";
const PLACE = "#mBirthLocation";
const SUGGEST = "#wbe-suggest-summary-button";
const OFF_NOTE = " (It's switched off for you: turn it on in WBE's options.)";
const ON_FOR_TOUR_NOTE = " (You have it switched off: it's on just for this tour.)";
// The features the tour shows, switched on for it when they're off (tour_features.js).
export const TOUR_FEATURES = [
  "goldStandard",
  "chat",
  "locationsHelper",
  "editProfileRedesign",
  "autoBio",
  "autoCategories",
  "clipboardAndNotes",
  "familyDropdown",
  "wtplus",
  "findAndReplace",
  "editorExpander",
  "textExpander",
  "customChangeSummaryOptions",
  "usabilityTweaks",
  "saveButtonsStyleOptions",
  "showSearch",
  "shareableSources",
  "stickyToolbar",
  "dateFixer",
  "unnamedInfant",
  "bioCheck",
];
// Options the tour shows, set for it when they're off: {feature, option, value}, stored in feature + "_options".
export const TOUR_OPTIONS = [
  { feature: "locationsHelper", option: "newLocations", value: "augment", off: (value) => value === "no" },
  { feature: "usabilityTweaks", option: "addRemoveConnectLinks", value: true, off: (value) => !value },
  { feature: "unnamedInfant", option: "diedYoung", value: true, off: (value) => !value },
];
const CONNECT_LINK = ".container.edit--sidebar a[href*='WBEaction=Connect']";
// The Edit Family section, opened when it's folded (some keep it folded), before a step shows what's in it.
// (The tour folds it again at the end.)
const FAMILY_TOGGLE = "#toggleFamilyColumn";
const OPEN_FAMILY = {
  click: FAMILY_TOGGLE,
  when: () => Boolean(document.querySelector(`${FAMILY_TOGGLE} .plus`)),
  hold: 900,
};
const RESTORE_WAIT_MS = 20000;

const MENU = ".editToolbarDiv";
const menuButton = (text) => ({
  hover: "#editToolbarExt .editToolbarButton",
  text,
  open: MENU,
  hold: 1100,
  optional: true,
});

// The start of the birth place, as far as a few letters past its first comma: enough for suggestions.
export function placeStart(place = "") {
  const comma = place.indexOf(",");
  return comma < 0 ? place.slice(0, 6) : place.slice(0, comma + 5);
}

// Locations Helper's database of historical place names (2026-10-24): suggestions from it show when its
// "Use Experimental Location Suggestions" option isn't "No" (switched to "Augment existing" for the tour), from
// the countries loaded with the gear beside Country. The tour loads the profile's country if need be, and keeps it.
const LOCATION_OPTIONS = "locationsHelper_options"; // (TOUR_OPTIONS)
const LOCATION_GEAR = ".wbe-location-gear";
const LOCATION_POPUP = ".wbe-location-popup";
const LOCATION_LOAD_WAIT_MS = 120000;
// (the countries with data, as places name them: the gear window lists those there are)
const COUNTRY_NAMES = {
  australia: "AU",
  canada: "CA",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  "great britain": "GB",
  "united kingdom": "GB",
  uk: "GB",
  greece: "GR",
  ireland: "IE",
  netherlands: "NL",
  nederland: "NL",
  "new zealand": "NZ",
  poland: "PL",
  polska: "PL",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  "south africa": "ZA",
};

/** The country code of a place (its last part: "England" is GB), or null. */
export function placeCountry(place = "") {
  const name = place.split(",").pop().trim().toLowerCase();
  return COUNTRY_NAMES[name] || null;
}

// The gear window's row for the birthplace's country, when it has one (the countries there are those with data).
const countryRow = () => {
  const code = placeCountry(document.querySelector(PLACE)?.value);
  return code ? document.querySelector(`${LOCATION_POPUP} input[data-country="${code}"]`)?.closest("tr") : null;
};
const countryToLoad = () => Boolean(countryRow() && !countryRow().cells[3]?.textContent.includes("✅"));
const locationStatus = () => document.querySelector(`${LOCATION_POPUP} .wbe-loc-status`)?.textContent.trim() || "";

// The Date Fixer and Childless demos (2026-10-24): a death date two years after the birth, as if the person had
// died young, typed with the month in French for Date Fixer to put right, or in English for Childless alone.
const DEATH = "#mDeathDate";
const FRENCH_MARCH = "mars";
/** That death date for a birth date ("14 Mar 1802" for a birth in 1800), or null when the birth has no year. */
export function youngDeathDate(birth = "", french = false) {
  const year = birth.match(/\b(\d{4})\b/)?.[1];
  return year ? `14 ${french ? FRENCH_MARCH : "Mar"} ${Number(year) + 2}` : null;
}
const birthDate = () => document.querySelector("#mBirthDate")?.value || "";

// The suggestion the place demo chooses (2026-10-24): never one ending in Great Britain. For a place in Britain,
// WikiTree's name for the time: ending in England (or Scotland, Wales) before 1801, United Kingdom from then.
// vals: the suggestions' places, in order; year: the birth year. Resolves to an index, or -1 for none.
export function placeChoice(vals = [], year = null) {
  const fits = vals.map((val) => !/\bGreat Britain\s*$/i.test(val.trim()));
  const ofTheTime = vals.findIndex(
    (val, i) =>
      fits[i] && year && (year >= 1801 ? /United Kingdom\s*$/i : /(England|Scotland|Wales)\s*$/i).test(val.trim())
  );
  return ofTheTime >= 0 ? ofTheTime : fits.indexOf(true);
}
const PLACE_CHOSEN = "wbe-tour-place";

const FEATURE_WAIT_MS = 60000;
const CLIPBOARD_DB = "Clipboard"; // (clipboard_and_notes.js's database, and its store)

// Resolves when done() is true, or after a while (a minute).
async function until(done, ms = FEATURE_WAIT_MS) {
  const by = Date.now() + ms;
  while (!done() && Date.now() < by) await new Promise((resolve) => setTimeout(resolve, 200));
}

const GOLD = ".wbe-gold-standard-button";
const GENIE = "#wbe-genie-button";
const GENIE_CHIP = ".chat-edit-chips .chat-message-action";
const GENIE_ACTION = "#wbe-chat-popup .chat-message-action";
const INSERT = "Insert at cursor";
const PASTE_BOX = "dialog[open] textarea.srcPaste";
const FIND_REPLACE = "#wbeFindReplace";
const FAMILY_MENU = "#familyDropdown .custom-dropdown-toggle";
const CLIPPING = "#clipboard tr.wbe-tour-clipping"; // (the one the tour added)
const TEMPLATE_FILTER = "dialog[open] #flt1";
const RESEARCH_NOTE = "Estimated Date";
const PHRASE = "Bio improvement.";
const phrase = () =>
  [...document.querySelectorAll("#summaryOptionsContainer label")].some((el) => el.textContent.trim() === PHRASE);
const menuItem = (title) => `#editToolbarExt a.editToolbarClick[data-id="${title}"]`;
const shown = (selector) => Boolean(document.querySelector(selector)?.getClientRects().length);
const insertButton = () =>
  [...document.querySelectorAll(GENIE_ACTION)].some(
    (el) => el.textContent.trim() === INSERT && el.getClientRects().length
  );
const chip = (text) => [...document.querySelectorAll(GENIE_CHIP)].some((el) => el.textContent.trim() === text);

/**
 * A link to paste, as it might be copied from the site: a Find a Grave, Wikipedia or Wikidata link in the
 * profile's sources, else the Wikipedia page of the birthplace's town. (WT+'s rules make those into templates;
 * a FamilySearch link comes back as it went in, 2026-10-24.) Null when there's neither.
 */
export function sourceToPaste(bio = "", birthPlace = "") {
  const link = bio.match(
    /https:\/\/(?:www\.findagrave\.com\/memorial\/\d+|[a-z]+\.wikipedia\.org\/wiki\/|www\.wikidata\.org\/wiki\/Q)[^\s\]|<]*/
  );
  if (link) return link[0];
  const town = birthPlace.split(",")[0].trim();
  return town ? `https://en.wikipedia.org/wiki/${town.replace(/\s+/g, "_")}` : null;
}

// The surname to find: the Last Name at Birth (the page's own data), else the last word of its heading.
function surname() {
  const name = document.querySelector("#pageData")?.getAttribute("data-mlastnameatbirth")?.trim();
  if (name) return name;
  return (document.querySelector("h1")?.textContent.trim().split(/\s+/).pop() || "").replace(/[^\p{L}'-]/gu, "");
}

// The Biography section of the text: from its heading to the next top-level heading (all of it when none).
function biographySection(bio) {
  const start = Math.max(0, bio.search(/^==\s*Biography\s*==/m));
  const next = bio.slice(start + 2).search(/^==[^=]/m);
  return { start, end: next < 0 ? bio.length : start + 2 + next };
}

/**
 * The citation to copy into the clipboard: a source in the Sources list, the birth or baptism record's when
 * there is one. {from, to, text}, the citation without its bullet, or null.
 */
export function clipToCopy(bio = "") {
  const heading = bio.search(/^==\s*Sources\s*==/m);
  if (heading < 0) return null;
  const sources = [];
  let offset = heading;
  for (const line of bio.slice(heading).split("\n")) {
    const citation = line.match(/^\*\s*(.*\S)/);
    if (citation && !citation[1].startsWith("<")) {
      const from = offset + line.indexOf(citation[1]);
      sources.push({ from, to: from + citation[1].length, text: citation[1] });
    }
    offset += line.length + 1;
  }
  return sources.find((source) => /birth|christen|baptism/i.test(source.text)) || sources[0] || null;
}

/**
 * Where to paste the citation later: the end of the first sentence in the Biography with no citation yet
 * (a paragraph ending in a full stop, not a list, heading, table or template). Null when there's none.
 */
export function pasteSpot(bio = "", clip = "") {
  const { start, end } = biographySection(bio);
  let offset = start;
  for (const line of bio.slice(start, end).split("\n")) {
    const text = line.trimEnd();
    if (/\.$/.test(text) && !/^[*#:;={|[]/.test(text) && !text.includes("<ref") && !(clip && text.includes(clip))) {
      return offset + text.length;
    }
    offset += line.length + 1;
  }
  return null;
}

// The events a citation can be for, in the order they're looked for ("Births and Christenings" records are
// christenings).
const CLIP_EVENTS = [
  [/christen/i, "Christening"],
  [/baptis|baptiz/i, "Baptism"],
  [/marriage/i, "Marriage"],
  [/burial/i, "Burial"],
  [/death/i, "Death"],
  [/census/i, "Census"],
  [/birth/i, "Birth"],
];

/**
 * A title for the clipping: the profile's ID and what the citation is for ("Wedgwood-25 Christening"), else
 * the record's name (its first quoted part), else its start.
 */
export function clipTitle(clip = "", id = "") {
  const text = clip.replace(/<[^>]*>/g, "").trim();
  const event = CLIP_EVENTS.find(([pattern]) => pattern.test(text))?.[1];
  if (id && event) return `${id} ${event}`;
  const quoted = text.match(/["“]([^"”]{4,60}?)[,"”]/);
  return quoted ? quoted[1].trim() : text.slice(0, 40).trim();
}
const profileId = () => document.querySelector("#pageData")?.getAttribute("data-mnamedb")?.trim() || "";

const hasDraft = () => Boolean(document.querySelector(".deleteDraftButton"));
const placeField = () => document.querySelector(PLACE);

/**
 * The steps, in page order. demo: what the tour does on the page ({goldStandard, genie, autoBio, autoCategories,
 * pasteSource, showResearchNote, findAndReplace, suggestButton, restore}, each async); off: the ids of the features switched
 * off, whose captions say so; onForTour: those of them switched on just for the tour (all, or none when the page
 * had changes a reload would have lost).
 */
export function editPageTourSteps(demo = {}, off = new Set(), onForTour = new Set()) {
  // (feature: an id, or several: the feature and its options, when an option is switched on for the tour too)
  const note = (feature, caption) => {
    const ids = [].concat(feature);
    if (ids.some((id) => onForTour.has(id))) return caption + ON_FOR_TOUR_NOTE;
    return off.has(ids[0]) ? caption + OFF_NOTE : caption;
  };
  const offShown = TOUR_FEATURES.filter((id) => off.has(id) && !onForTour.has(id)).length;
  const intro = onForTour.size
    ? " Features you have switched off are on just for the tour, and go off again at the end."
    : offShown
    ? " (Some features it shows are switched off for you. Save your changes and start the tour again to see them at work too.)"
    : "";
  const run = (name) => async () => demo[name] ? demo[name]() : false;
  // (a step with feature: left out when that feature is off and couldn't be switched on, as it can't be shown)
  const working = (id) => !off.has(id) || onForTour.has(id);
  const steps = [
    {
      caption:
        "A quick demo of what the WikiTree Browser Extension can do on this page. The tour changes things to show you, then puts everything back. Nothing is saved." +
        intro,
      point: ".ebWBE .showWBEFeatures",
      hold: 600,
    },
    {
      caption: note(
        "showSearch",
        "Show Search keeps WikiTree's search bar open at the top of every page, ready for a name."
      ),
      needs: "#searchBar.showSearch",
      point: "#searchBar",
      hold: 600,
    },
    {
      caption: note(
        "goldStandard",
        "The Gold Standard Inspector checks the profile against WikiTree's Gold Standard and lists what's still needed."
      ),
      actions: [
        { click: GOLD, when: () => shown(GOLD) },
        { run: run("goldStandard"), hold: 5000 },
        { click: ".wbe-gold-standard-close", optional: true, hold: 300 },
      ],
    },
    {
      caption: note(
        "chat",
        "Genie answers questions about the family. On this page it also writes for the biography: here, the birth and parents, from the form."
      ),
      actions: [
        { click: GENIE, when: () => shown(GENIE), waitFor: GENIE_CHIP, settle: 600 },
        { run: run("genie"), when: () => !shown(GENIE) },
        { click: GENIE_CHIP, text: "Add birth", when: () => chip("Add birth"), hold: 300 },
        { click: GENIE_CHIP, text: "What's missing?", when: () => !chip("Add birth"), hold: 300 },
        { click: "#wbe-chat-send", waitFor: "#wbe-chat-send:not(:disabled)", settle: 500, hold: 5500 },
        {
          caption:
            "Insert at cursor puts it into the biography where the cursor is: here, at the start of the Biography.",
          run: run("genieCursor"),
          when: insertButton,
          hold: 900,
        },
        { click: GENIE_ACTION, text: INSERT, pick: 999, when: insertButton, hold: 3500 },
        { click: "#wbe-chat-popup .close-popup", optional: true, hold: 300 },
      ],
    },
    {
      caption: note(
        LOCATION_OPTIONS,
        "Locations Helper can also suggest places from a database of historical place names that WikiTree members are building. The gear beside Country manages it: each country's places are loaded once, and kept."
      ),
      needs: LOCATION_GEAR,
      actions: [
        { click: LOCATION_GEAR, waitFor: `${LOCATION_POPUP} tbody tr`, settle: 800, hold: 2500 },
        {
          caption: "This profile's country isn't loaded yet, so the tour loads it now. That takes a moment, once only.",
          run: run("tickCountry"),
          when: countryToLoad,
          hold: 600,
        },
        {
          click: `${LOCATION_POPUP} .wbe-loc-load`,
          when: () => Boolean(document.querySelector(`${LOCATION_POPUP} tbody input:checked`)),
          hold: 300,
        },
        { run: run("countryLoaded"), hold: 1500 },
        { run: run("closeLocationData"), hold: 300 },
      ],
    },
    {
      caption: note(
        "locationsHelper",
        "Locations Helper: as you type a place, suggestions in green are where the family lived; red ones didn't exist at the time."
      ),
      needs: PLACE,
      actions: [
        {
          type: () => placeStart(placeField()?.value),
          into: PLACE,
          when: () => Boolean(placeField()?.value),
          hold: 3500,
        },
        {
          caption: "The ones from the database come first, with the years each name was used.",
          hover: ".autocomplete-suggestion.wbe-injected-suggestion",
          optional: true,
          hold: 3000,
        },
        { run: run("choosePlace"), optional: true },
        {
          caption: "Choosing one fills in the place.",
          click: `.autocomplete-suggestion.${PLACE_CHOSEN}`,
          optional: true,
          hold: 900,
        },
      ],
    },
    {
      caption: note(
        "editProfileRedesign",
        "The Edit Family section folds away when you don't need it, to leave more room for the biography."
      ),
      needs: FAMILY_TOGGLE,
      actions: [OPEN_FAMILY, { click: FAMILY_TOGGLE, hold: 2200 }, { click: FAMILY_TOGGLE, hold: 600 }],
    },
    {
      caption: note(
        "editProfileRedesign",
        "So does the column beside the edit box, giving the biography the whole width. (With the enhanced editor on, it switches to the plain box while the column is folded.)"
      ),
      needs: "#toggleTipsColumn",
      actions: [
        { click: "#toggleTipsColumn", hold: 2500 },
        { click: "#toggleTipsColumn", hold: 900 },
      ],
    },
    {
      caption: note(
        "usabilityTweaks_options",
        "Each relative's Add/Remove/Replace link becomes Replace (or Add), Connect and Remove, each going straight to that choice. Connect links a profile that's already on WikiTree, by its ID."
      ),
      needs: CONNECT_LINK,
      actions: [OPEN_FAMILY, { hover: CONNECT_LINK, hold: 600 }],
    },
    {
      caption: note(
        "autoBio",
        "Auto Bio writes a biography from the profile's data and sources, as a first draft to edit."
      ),
      actions: [{ run: run("autoBio"), point: EDITOR, hold: 4500 }],
    },
    {
      caption: note(
        "autoCategories",
        "Auto Categories adds categories from the profile's places, dates and family, at the top of the text."
      ),
      actions: [{ run: run("autoCategories"), point: EDITOR, hold: 3500 }],
    },
    {
      caption: note(
        "clipboardAndNotes",
        "The clipboard keeps text you'll want again. Here, a citation is copied from the sources…"
      ),
      needs: ".aClipboardButton",
      actions: [
        { run: run("copyFromBio"), point: EDITOR, hold: 2500 },
        {
          caption: "…pasted into the clipboard as a reference, given a title, and added.",
          click: ".aClipboardButton",
          waitFor: "#clipboard #clippingBox",
          settle: 400,
        },
        { run: run("pasteIntoClipboard"), point: "#clipboard #clippingBox", hold: 1200 },
        {
          type: () => clipTitle(demo.clip?.() || "", profileId()),
          into: "#clipboard #thingTitle",
          optional: true,
          hold: 600,
        },
        { click: "#addClipping", hold: 300 },
        { run: run("noteClipping"), point: CLIPPING, hold: 2500 },
        { click: "#clipboard h1 x", optional: true, hold: 300 },
      ],
    },
    {
      caption: note(
        "familyDropdown",
        "The family menu lists the profile's relatives: choose one to copy a link to them, ready to paste into the biography."
      ),
      needs: FAMILY_MENU,
      actions: [
        { click: FAMILY_MENU, waitFor: "#familyDropdown .custom-dropdown-menu li", settle: 300 },
        { hover: "#familyDropdown .custom-dropdown-menu li", hold: 3000 },
        { click: FAMILY_MENU, optional: true, hold: 300 },
      ],
    },
    {
      caption: note(
        "shareableSources",
        "Shareable Sources: choose a relative in the family menu and their sources show here, each ready to add to this profile's sources or as an inline citation."
      ),
      feature: "shareableSources",
      needs: FAMILY_MENU,
      actions: [
        { click: FAMILY_MENU, waitFor: "#familyDropdown .custom-dropdown-menu li[data-id]", settle: 300 },
        { click: "#familyDropdown .custom-dropdown-menu li[data-id]", waitFor: "div.referenceBox", settle: 400 },
        { hover: "div.referenceBox button.inline", optional: true, hold: 4000 },
        { click: "div.referenceBox x", optional: true, hold: 300 },
      ],
    },
    {
      caption:
        "Paste sources, in the Sources menu: paste a link copied from Find a Grave, Wikipedia, Wikidata and more, and it becomes a WikiTree citation.",
      needs: menuItem("Paste sources"),
      actions: [
        menuButton("Sources"),
        { click: menuItem("Paste sources"), open: MENU, waitFor: PASTE_BOX, settle: 400 },
        { run: run("pasteSource"), optional: true, hold: 4500 },
        { click: 'dialog[open] button.dlgClick[data-id="0"]', optional: true, hold: 300 },
      ],
    },
    {
      caption:
        "The Templates menu finds research note boxes, stickers and project boxes, asks for their details, and puts them in the right place.",
      needs: menuItem("Add Research Note Box"),
      actions: [
        menuButton("Templates"),
        { click: menuItem("Add Research Note Box"), open: MENU, waitFor: TEMPLATE_FILTER, settle: 400 },
        { type: RESEARCH_NOTE, into: TEMPLATE_FILTER, hold: 1200 },
        { click: "dialog[open] tr.trSelect", has: RESEARCH_NOTE, hold: 800 },
        {
          caption: "Its details go in a form, and it's added to the biography, at the top where it belongs.",
          click: 'dialog[open] button[data-op="onDlgSelectTemplateBtn"][data-id="1"]',
          waitFor: 'dialog[open] button[data-op="onDlgEditTemplateBtn"]',
          settle: 400,
          hold: 1500,
        },
        { type: "birth", into: "dialog[open] input.dlgPaste", optional: true, hold: 1200 },
        { click: 'dialog[open] button[data-op="onDlgEditTemplateBtn"][data-id="1"]', hold: 400 },
        { run: run("showResearchNote"), point: EDITOR, hold: 3000 },
      ],
    },
    {
      caption: note(
        "findAndReplace",
        "Find and Replace finds words, wildcards or patterns in the biography, and replaces them one at a time or all at once."
      ),
      actions: [
        {
          click: "#findReplaceButton",
          when: () => shown("#findReplaceButton"),
          waitFor: `${FIND_REPLACE} .wbe-fr-find`,
        },
        { run: run("findAndReplace"), when: () => !shown(FIND_REPLACE) },
        { type: surname, into: `${FIND_REPLACE} .wbe-fr-find`, hold: 1500 },
        { click: `${FIND_REPLACE} .wbe-fr-next`, hold: 1200 },
        { click: `${FIND_REPLACE} .wbe-fr-next`, hold: 1500 },
        { click: `${FIND_REPLACE} .wbe-fr-close`, optional: true, hold: 300 },
      ],
    },
    {
      caption: "The edit box can grow to nearly full screen, for long biographies and tables.",
      needs: "#expandTextareaButton",
      actions: [
        { click: "#expandTextareaButton", hold: 2500 },
        { click: "#expandTextareaButton", hold: 600 },
      ],
    },
    {
      caption: note(
        "stickyToolbar",
        "Sticky Toolbar keeps the editing buttons in sight as you scroll down a long biography."
      ),
      feature: "stickyToolbar",
      needs: "#toolbar.sticky",
      actions: [{ run: run("scrollPastToolbar"), point: "#toolbar", hold: 3000 }],
    },
    {
      caption: note(
        "clipboardAndNotes",
        "Later, back in the biography: click where the citation is needed, after a sentence with no source yet…"
      ),
      needs: ".aClipboardButton",
      actions: [
        { run: run("placeCursor"), point: EDITOR, hold: 2500 },
        {
          caption: "…open the clipboard and click the citation: it goes in where you clicked.",
          click: ".aClipboardButton",
          waitFor: "#clipboard .clippingCell",
          settle: 400,
        },
        { run: run("markClipping"), point: CLIPPING, hold: 1500 },
        { click: `${CLIPPING} .clippingCell`, hold: 300 },
        { run: run("showPasted"), point: EDITOR, hold: 3500 },
      ],
    },
    {
      caption: note(
        "textExpander",
        "Text Expander: your own abbreviations, typed in the edit box, turn into the full text. Here's where you set them."
      ),
      needs: "#textExpanderButton",
      actions: [
        { click: "#textExpanderButton", waitFor: "#textExpanderDialog", settle: 400, hold: 3500 },
        { click: "#textExpanderDialog .close-popup", optional: true, hold: 300 },
      ],
    },
    {
      caption: note(
        "dateFixer",
        "Date Fixer tidies dates as you leave the field. Say a death date is typed with the month in French…"
      ),
      feature: "dateFixer",
      needs: DEATH,
      actions: [
        { type: () => youngDeathDate(birthDate(), true), into: DEATH, hold: 900 },
        { caption: "…it becomes a date WikiTree understands.", run: run("leaveDate"), hold: 3000 },
      ],
    },
    {
      caption: note(
        ["unnamedInfant", "unnamedInfant_options"],
        "Childless: when a child died young (here, as if this person had died at two), it ticks No spouses and No children as you go to save, and can add a Died Young sticker."
      ),
      feature: "unnamedInfant",
      needs: DEATH,
      actions: [
        { run: run("youngDeath") },
        { hover: "#wpSave", hold: 1500 },
        OPEN_FAMILY,
        { run: run("showChildless"), point: "input[name='mNoChildren']", hold: 3000 },
      ],
    },
    {
      caption: note(
        "bioCheck",
        "Bio Check checks the biography's sources and style each time you go to save, and says here what needs attention."
      ),
      feature: "bioCheck",
      // (its report, there from the start: missing when Bio Check couldn't load its data, as on staging)
      needs: "#bioCheckResultsContainer",
      actions: [
        { hover: "#wpSave", hold: 800 },
        { run: run("showBioCheck"), point: "#bioCheckResultsContainer", hold: 4000 },
      ],
    },
    {
      caption: note(
        "saveButtonsStyleOptions",
        "Save Buttons Style turns the Compare and Return links under the save buttons into buttons, in the sizes you choose."
      ),
      needs: "#saveButtons a.btn.button",
      point: "#saveButtons",
      hold: 600,
    },
    {
      caption: note(
        "customChangeSummaryOptions",
        "Phrases you use often for the change explanation are a tick away (you can add your own)."
      ),
      actions: [{ click: "#summaryOptionsContainer label", text: PHRASE, when: phrase, hold: 2500 }],
    },
    {
      caption: note(
        "customChangeSummaryOptions",
        "When you've finished, Suggest writes the change explanation from what you've changed. With an AI key, AI words it."
      ),
      needs: "#wpSummary",
      actions: [
        { run: run("suggestButton") },
        // (With a draft, Suggest saves it before comparing: the tour mustn't.)
        {
          click: SUGGEST,
          when: () => !hasDraft(),
          waitFor: `${SUGGEST}:not([aria-busy])`,
          settle: 300,
          hold: 6000,
        },
      ],
    },
    {
      caption: "Now everything goes back as it was. Nothing was saved.",
      actions: [{ run: run("restore"), hold: 800 }],
    },
    {
      caption:
        "To see everything WBE adds to a page, click the sparkle: it outlines them all. Switch features on and off in WBE's options.",
      point: ".ebWBE .showWBEFeatures",
      hold: 1500,
      end: true,
    },
  ];
  return steps.filter((step) => !step.feature || working(step.feature));
}

// What the tour does on the page, and putting it back: a feature still writing when the tour is stopped
// finishes first, so what it writes doesn't land after the page is put back.
function pageDemo(restorePage) {
  const running = new Set();
  let addedButton = null;
  // The clipboard demo: the citation copied, the clippings there before it was added, its key, and where
  // it was pasted.
  let clip = null;
  let keysBefore = null;
  let clipKey = null;
  let pastedAt = null;
  const clippings = async () => {
    const db = new IndexedDBHelper(CLIPBOARD_DB, 1);
    await db.openDB((upgrading) => IndexedDBHelper.createObjectStore(upgrading, CLIPBOARD_DB, { autoIncrement: true }));
    return db;
  };
  const markClipping = async () => {
    await until(() => document.querySelector(`#clipboard tr[data-key="${clipKey}"]`), 5000);
    const row = document.querySelector(`#clipboard tr[data-key="${clipKey}"]`);
    row?.classList.add("wbe-tour-clipping");
    row?.scrollIntoView({ block: "nearest" });
    return Boolean(row);
  };
  const track = (work) => async () => {
    const promise = work();
    running.add(promise);
    try {
      return await promise;
    } finally {
      running.delete(promise);
    }
  };
  return {
    clip: () => clip,
    copyFromBio: track(async () => {
      const found = clipToCopy((await bioText()) || "");
      if (!found) return false;
      clip = `<ref>${found.text}</ref>`; // (pasted into the clipboard as a reference, to go after a sentence)
      return selectInBio(found.from, found.to);
    }),
    pasteIntoClipboard: track(async () => {
      const box = document.querySelector("#clipboard #clippingBox");
      if (!box || !clip) return false;
      keysBefore = new Set(await (await clippings()).getAllKeys(CLIPBOARD_DB));
      box.value = clip;
      box.dispatchEvent(new Event("input", { bubbles: true }));
      // (The group box starts as the group open last: no group, so the clipping isn't filed in one of theirs.)
      const group = document.querySelector("#clipboard #groupInput");
      if (group) group.value = "";
      return true;
    }),
    noteClipping: track(async () => {
      const added = () =>
        [...document.querySelectorAll("#clipboard tr[data-key]")].find(
          (row) => row.getAttribute("data-original") === clip && !keysBefore?.has(Number(row.getAttribute("data-key")))
        );
      await until(added, 5000);
      clipKey = added()?.getAttribute("data-key") ?? null;
      return clipKey !== null && markClipping();
    }),
    placeCursor: track(async () => {
      pastedAt = clip ? pasteSpot((await bioText()) || "", clip) : null;
      return pastedAt !== null && selectInBio(pastedAt);
    }),
    markClipping: track(async () => clipKey !== null && markClipping()),
    showPasted: track(async () => {
      const pasted = async () => ((await bioText()) || "").slice(pastedAt, pastedAt + clip.length) === clip;
      for (let tries = 0; tries < 20 && !(await pasted()); tries++) await new Promise((r) => setTimeout(r, 150));
      return selectInBio(pastedAt, pastedAt + clip.length);
    }),
    autoBio: track(async () => {
      const module = await import(/* webpackChunkName: "auto-bio" */ "../../features/auto_bio/auto_bio");
      // (Switched off, Auto Bio didn't start up: it needs its options, and its styles for its notes.)
      if (!window.autoBioOptions) {
        window.autoBioOptions = await getFeatureOptions("autoBio");
        import("../../features/auto_bio/auto_bio.css");
      }
      const before = window.autoBio_lastGenerated;
      await module.generateBio();
      // (generateBio can resolve before it has written: it's done when its tree has gone and there's a new draft)
      await until(
        () =>
          !document.querySelector("#working.autoBioWorking") &&
          (window.autoBio_lastGenerated !== before || document.getElementById("errorDiv"))
      );
      await showInBio(/^==\s*Biography\s*==/m);
    }),
    autoCategories: track(async () => {
      const module = await import(
        /* webpackChunkName: "auto-categories" */ "../../features/auto_categories/auto_categories"
      );
      await module.addAutoCategories();
      await showInBio();
    }),
    goldStandard: track(async () => {
      if (!shown(".wbe-gold-standard-overlay")) {
        // (Switched off, there's no button: the inspector opens as its button would open it.)
        const module = await import("../../features/gold_standard/gold_standard");
        const id = document.querySelector("#pageData")?.getAttribute("data-mnamedb")?.trim();
        if (!id || !module.openInspector) return false;
        module.openInspector(id);
      }
      await until(() => !document.querySelector(".wbe-gold-standard-content [role='status']"), 30000);
      return true;
    }),
    genie: track(async () => {
      const module = await import(/* webpackChunkName: "muse" */ "../../features/chat/chat");
      module.openChatPopup();
      await until(() => document.querySelector(GENIE_CHIP), 15000);
      return Boolean(document.querySelector(GENIE_CHIP));
    }),
    // (just the profile's country ticked: rows needing an update come ticked, and would load too)
    tickCountry: track(async () => {
      const row = countryRow();
      if (!row) return false;
      document.querySelectorAll(`${LOCATION_POPUP} tbody input[type=checkbox]`).forEach((box) => {
        box.checked = row.contains(box);
      });
      return true;
    }),
    // (resolves when the country has loaded and the window shows it, or straight away when nothing's loading)
    countryLoaded: track(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await until(() => !countryToLoad() || /fail/i.test(locationStatus()), LOCATION_LOAD_WAIT_MS);
      await until(() => /^Select countries/.test(locationStatus()) || /fail/i.test(locationStatus()), 15000);
      return true;
    }),
    closeLocationData: track(async () => {
      const popup = document.querySelector(LOCATION_POPUP);
      if (popup) popup.style.display = "none";
      return true;
    }),
    // (the cursor where Genie's text goes in: the start of the Biography, under its heading)
    genieCursor: track(async () => {
      const heading = ((await bioText()) || "").match(/^==\s*Biography\s*==[^\n]*\n/m);
      return selectInBio(heading ? heading.index + heading[0].length : 0);
    }),
    // (marks the suggestion to choose: placeChoice)
    choosePlace: track(async () => {
      const shownSuggestions = [...document.querySelectorAll(".autocomplete-suggestion")].filter(
        (el) => el.getClientRects().length
      );
      const year = Number(birthDate().match(/\b(\d{4})\b/)?.[1]) || null;
      const chosen =
        shownSuggestions[
          placeChoice(
            shownSuggestions.map((el) => el.getAttribute("data-val") || el.textContent),
            year
          )
        ];
      chosen?.classList.add(PLACE_CHOSEN);
      return Boolean(chosen);
    }),
    // (scrolled so the edit box's top is well above the window: the toolbar stays at the top, stuck)
    scrollPastToolbar: track(async () => {
      // (the one showing: with the enhanced editor on, the box is hidden, at the top)
      const editor = [...document.querySelectorAll(EDITOR)].find((el) => el.getClientRects().length);
      if (!editor) return false;
      window.scrollBy({ top: editor.getBoundingClientRect().top + 250, behavior: "smooth" });
      await new Promise((resolve) => setTimeout(resolve, 700));
      return true;
    }),
    // (as leaving the field would: Date Fixer answers its change event)
    leaveDate: track(async () => {
      const field = document.querySelector(DEATH);
      if (!field) return false;
      field.dispatchEvent(new Event("change", { bubbles: true }));
      field.blur();
      return true;
    }),
    // (the young death date, in English, unless Date Fixer has just put one in)
    youngDeath: track(async () => {
      const field = document.querySelector(DEATH);
      const date = youngDeathDate(birthDate());
      if (!field || !date) return false;
      if (!/\b14 Mar(?:ch)? \d{4}|\d{4}-03-14/.test(field.value)) {
        field.value = date;
        field.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return true;
    }),
    showChildless: track(async () => {
      await until(() => document.querySelector("input[name='mNoChildren']")?.checked, 3000);
      document.querySelector("input[name='mNoChildren']")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return true;
    }),
    showBioCheck: track(async () => {
      await until(() => shown("#bioCheckResultsContainer"), 3000);
      return shown("#bioCheckResultsContainer");
    }),
    pasteSource: track(async () => {
      const box = document.querySelector(PASTE_BOX);
      const sample = sourceToPaste((await bioText()) || "", document.querySelector(PLACE)?.value || "");
      if (!box || !sample) return false;
      // (As a paste would: the text shows in the box, and WT+ reads it from the paste event.)
      box.value = sample;
      const data = new window.DataTransfer();
      data.setData("text/plain", sample);
      box.dispatchEvent(new window.ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
      return true;
    }),
    showResearchNote: track(async () => {
      await showInBio(new RegExp(`\\{\\{\\s*${RESEARCH_NOTE}`, "i"));
      return true;
    }),
    findAndReplace: track(async () => {
      const { openFindAndReplace } = await import("../../features/find_and_replace/find_and_replace_loader");
      await openFindAndReplace();
      await until(() => shown(`${FIND_REPLACE} .wbe-fr-find`), 10000);
      return shown(`${FIND_REPLACE} .wbe-fr-find`);
    }),
    suggestButton: track(async () => {
      if (document.querySelector(SUGGEST)) return true;
      const { addChangeExplanationButton } = await import(
        "../../features/custom_change_summary_options/change_explanation_button"
      );
      addedButton = addChangeExplanationButton(document, { page: "profile" });
      return Boolean(addedButton);
    }),
    async restore() {
      await Promise.race([
        Promise.allSettled([...running]),
        new Promise((resolve) => setTimeout(resolve, RESTORE_WAIT_MS)),
      ]);
      await restorePage();
      if (keysBefore) {
        // (Only the clipping the tour added: one that wasn't there before, with its text.)
        const db = await clippings();
        for (const key of await db.getAllKeys(CLIPBOARD_DB)) {
          if (!keysBefore.has(key) && (await db.getData(CLIPBOARD_DB, key))?.text === clip) {
            await db.deleteItem(CLIPBOARD_DB, key);
          }
        }
        keysBefore = null;
      }
      if (addedButton) {
        document.getElementById("wbe-suggest-summary-status")?.remove();
        addedButton.remove();
        addedButton = null;
      }
    },
  };
}

/** Plays the tour (from the top of the page, as the steps go down it). */
/**
 * Starts the tour. Features it shows that are switched off are switched on first, and the page reloads to run
 * them (the tour starts again by itself, resumeEditPageTour); unless the page has changes the reload would lose,
 * when they're shown switched off.
 */
export async function startEditPageTour() {
  const [enabled, ...options] = await Promise.all([
    getEnabledStateForAllFeatures(),
    ...TOUR_OPTIONS.map(({ feature }) => getFeatureOptions(feature)),
  ]);
  const settings = {};
  TOUR_OPTIONS.forEach(({ feature, option, value, off }, i) => {
    const key = `${feature}_options`;
    if (off(options[i]?.[option])) settings[key] = { ...(settings[key] || options[i]), [option]: value };
  });
  if (!(await pageChanged()) && (await switchOnAndReload(TOUR_FEATURES, enabled, undefined, settings))) {
    return "reloading";
  }
  return runEditPageTour(enabled);
}

// After the reload for the tour (common.js): the page's features have had a moment to start.
export async function resumeEditPageTour() {
  return runEditPageTour(await getEnabledStateForAllFeatures());
}

async function runEditPageTour(enabled) {
  const [restorePage, forTour] = await Promise.all([keepEditPage(), switchedOnForTour()]);
  const onForTour = new Set(forTour.ids);
  const off = new Set([...Object.keys(enabled).filter((id) => !enabled[id]), ...onForTour]);
  const demo = pageDemo(restorePage);
  return startTour({
    steps: editPageTourSteps(demo, off, onForTour),
    label: "Tour of the edit page",
    page: true,
    // (WT+'s dialogs are modal: the caption and pointer go into the open one, or they'd be behind it)
    host: () => document.querySelector("dialog[open]") || document.body,
    ended: async () => {
      forTour.stop();
      try {
        await demo.restore();
      } finally {
        if (onForTour.size) await switchBack();
      }
    },
  });
}
