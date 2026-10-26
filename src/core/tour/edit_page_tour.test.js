jest.mock("./tour_ui", () => ({ startTour: jest.fn() }));
jest.mock("./edit_page_demo", () => ({
  bioText: jest.fn(),
  keepEditPage: jest.fn(),
  pageChanged: jest.fn(),
  selectInBio: jest.fn(),
  showInBio: jest.fn(),
}));
jest.mock("../options/options_storage", () => ({
  getEnabledStateForAllFeatures: jest.fn(),
  getFeatureOptions: jest.fn(),
}));

jest.mock("./tour_features", () => ({
  switchBack: jest.fn(),
  switchOnAndReload: jest.fn(),
  switchedOnForTour: jest.fn(),
}));

import {
  clipTitle,
  clipToCopy,
  editPageTourSteps,
  pasteSpot,
  placeChoice,
  placeCountry,
  placeStart,
  sourceToPaste,
  TOUR_FEATURES,
  TOUR_OPTIONS,
  youngDeathDate,
} from "./edit_page_tour";

const fs = require("fs");
const path = require("path");

// (the menu's source, read as text: importing it pulls in every feature it calls)
const menuSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/core/editToolbar/editToolbarProfileOptions.js"),
  "utf8"
); // (jest runs from the repo root)

const allActions = (steps) => steps.flatMap((step) => step.actions || []);

test("every step says something, and the last one ends the tour", () => {
  const steps = editPageTourSteps();
  expect(steps.length).toBeGreaterThan(5);
  steps.forEach((step) => expect(step.caption).toMatch(/\w/));
  expect(steps.at(-1).end).toBe(true);
});

test("the menus the tour opens, and what it clicks in them, are on the edit menu", () => {
  const buttons = allActions(editPageTourSteps())
    .filter((action) => action.open && action.hover)
    .map((action) => action.text);
  expect(buttons.length).toBeGreaterThan(0);
  buttons.forEach((button) => expect(menuSource).toContain(`button: "${button}"`));
  allActions(editPageTourSteps())
    .filter((action) => action.open && action.click)
    .forEach((action) => expect(menuSource).toContain(`title: "${action.click.match(/data-id="([^"]+)"/)[1]}"`));
});

test("the page is put back before the last step", () => {
  const restore = jest.fn(async () => {});
  const steps = editPageTourSteps({ restore });
  const restoring = steps.at(-2).actions.find((action) => action.run);
  return restoring.run().then(() => expect(restore).toHaveBeenCalled());
});

test("the tour's runs call what the demo does", async () => {
  const demo = {
    goldStandard: jest.fn(async () => true),
    copyFromBio: jest.fn(async () => true),
    pasteIntoClipboard: jest.fn(async () => true),
    noteClipping: jest.fn(async () => true),
    placeCursor: jest.fn(async () => true),
    markClipping: jest.fn(async () => true),
    showPasted: jest.fn(async () => true),
    genie: jest.fn(async () => true),
    genieCursor: jest.fn(async () => true),
    tickCountry: jest.fn(async () => true),
    countryLoaded: jest.fn(async () => true),
    closeLocationData: jest.fn(async () => true),
    scrollPastToolbar: jest.fn(async () => true),
    choosePlace: jest.fn(async () => true),
    leaveDate: jest.fn(async () => true),
    youngDeath: jest.fn(async () => true),
    showChildless: jest.fn(async () => true),
    showBioCheck: jest.fn(async () => true),
    autoBio: jest.fn(async () => true),
    autoCategories: jest.fn(async () => true),
    pasteSource: jest.fn(async () => true),
    showResearchNote: jest.fn(async () => true),
    findAndReplace: jest.fn(async () => true),
    suggestButton: jest.fn(async () => true),
  };
  for (const action of allActions(editPageTourSteps(demo)).filter((action) => action.run)) await action.run();
  Object.values(demo).forEach((fn) => expect(fn).toHaveBeenCalledTimes(1));
});

test("a feature that's switched off says so, and one that's on doesn't", () => {
  const offCaption = (off) =>
    editPageTourSteps({}, new Set(off)).find((step) => /^Auto Bio/.test(step.caption)).caption;
  expect(offCaption(["autoBio"])).toMatch(/switched off for you/);
  expect(offCaption([])).not.toMatch(/switched off/);
});

test("Suggest isn't clicked when there's a draft (it would save it)", () => {
  const click = allActions(editPageTourSteps()).find((action) => action.click === "#wbe-suggest-summary-button");
  document.body.innerHTML = "";
  expect(click.when()).toBe(true);
  document.body.innerHTML = '<a class="deleteDraftButton"></a>';
  expect(click.when()).toBe(false);
});

test("the place typed is the start of the birth place, a few letters past its first comma", () => {
  expect(placeStart("Shrewsbury, Shropshire, England")).toBe("Shrewsbury, Shr");
  expect(placeStart("Paris")).toBe("Paris");
  expect(placeStart("")).toBe("");
});

test("the source pasted is a link from the profile's sources, else the birthplace's Wikipedia page", () => {
  const familySearch = "FamilySearch (https://familysearch.org/ark:/61903/1:1:N2WS-HS4 : 2018), Francis Wedgwood.";
  expect(sourceToPaste(`* ${familySearch}\n* https://www.findagrave.com/memorial/12345/francis-wedgwood\n`)).toBe(
    "https://www.findagrave.com/memorial/12345/francis-wedgwood"
  );
  expect(sourceToPaste(familySearch, "Tarrant Gunville, Dorset, England")).toBe(
    "https://en.wikipedia.org/wiki/Tarrant_Gunville"
  );
  expect(sourceToPaste(familySearch, "")).toBeNull();
});

test("Suggest comes last, after everything it explains", () => {
  const steps = editPageTourSteps();
  const suggest = steps.findIndex((step) => /^When you've finished, Suggest/.test(step.caption));
  expect(suggest).toBe(steps.length - 3);
});

const BIO = [
  "[[Category: Barlaston, Staffordshire]]",
  "== Biography ==",
  "Francis Wedgwood was born in 1800 in Tarrant Gunville.",
  "",
  "Francis married Frances Mosley in 1832 in Rolleston. Their children were:",
  "* Godfrey Wedgwood (1833-1905).",
  "",
  "== Sources ==",
  "<references />",
  "* Josiah C. Wedgwood, A History of the Wedgwood Family (1908).",
  '* "England Births and Christenings, 1538-1975," database, FamilySearch, Francis Wedgewood, 1801.',
].join("\n");

test("the clipboard demo copies the birth record's citation, and pastes it after the first sentence without one", () => {
  const clip = clipToCopy(BIO);
  expect(clip.text).toBe(
    '"England Births and Christenings, 1538-1975," database, FamilySearch, Francis Wedgewood, 1801.'
  );
  expect(BIO.slice(clip.from, clip.to)).toBe(clip.text);
  const ref = `<ref>${clip.text}</ref>`;
  expect(BIO.slice(0, pasteSpot(BIO, ref)).endsWith("in Tarrant Gunville.")).toBe(true);
  expect(clipTitle(ref, "Wedgwood-25")).toBe("Wedgwood-25 Christening");
  expect(clipTitle(ref)).toBe("England Births and Christenings"); // (no ID)
  expect(clipTitle("<ref>Burial record, St Mary's.</ref>", "Wedgwood-25")).toBe("Wedgwood-25 Burial");
  expect(clipToCopy("== Biography ==\nText.\n== Sources ==\n<references />\n* Only one.").text).toBe("Only one.");
  expect(clipToCopy("== Biography ==\nNo sources.")).toBeNull();
  expect(pasteSpot("== Biography ==\n* A list.\n== Sources ==\nA sentence.")).toBeNull();
});

test("a feature switched on for the tour says so, and the intro says they go off again", () => {
  const steps = editPageTourSteps({}, new Set(["autoBio"]), new Set(["autoBio"]));
  expect(steps[0].caption).toMatch(/on just for the tour/);
  expect(steps.map((step) => step.caption).join(" ")).toMatch(/it's on just for this tour/);
  expect(steps.map((step) => step.caption).join(" ")).not.toMatch(/turn it on in WBE's options/);
});

test("when they couldn't be switched on, the intro says how to see them", () => {
  expect(editPageTourSteps({}, new Set(["autoBio"]))[0].caption).toMatch(/Save your changes/);
  expect(editPageTourSteps()[0].caption).not.toMatch(/Save your changes|just for the tour/);
});

test("the features switched on for the tour are real feature ids", () => {
  const ids = TOUR_FEATURES.map((id) => id);
  const sources = fs
    .readdirSync(path.resolve(process.cwd(), "src/features"), { recursive: true })
    .filter((file) => /_options\.js$/.test(file))
    .map((file) => fs.readFileSync(path.resolve(process.cwd(), "src/features", file), "utf8"))
    .join("\n"); // (register_feature_options.js too: Bio Check and Sticky Toolbar are registered there)
  ids.forEach((id) => expect(sources).toContain(`id: "${id}"`));
});

test("a birthplace's country is its last part, with England and the rest as the United Kingdom", () => {
  expect(placeCountry("Tarrant Gunville, Dorset, England")).toBe("GB");
  expect(placeCountry("Dublin, Ireland")).toBe("IE");
  expect(placeCountry("Boston, Suffolk, Massachusetts, United States")).toBe("US");
  expect(placeCountry("Amsterdam, Noord-Holland, Nederland")).toBe("NL");
  expect(placeCountry("Somewhere, Atlantis")).toBe(null);
  expect(placeCountry("")).toBe(null);
});

test("the place database is only loaded when its country isn't, and says so when it's on just for the tour", () => {
  const steps = editPageTourSteps({}, new Set(["locationsHelper_options"]), new Set(["locationsHelper_options"]));
  const database = steps.find((step) => step.needs === ".wbe-location-gear");
  expect(database.caption).toMatch(/database of historical place names.*on just for this tour/);
  const load = database.actions.find((action) => /wbe-loc-load/.test(action.click || ""));
  document.body.innerHTML =
    '<div class="wbe-location-popup"><table><tbody><tr><td><input type="checkbox" data-country="GB"></td></tr></tbody></table></div>';
  expect(load.when()).toBe(false);
  document.querySelector("input").checked = true;
  expect(load.when()).toBe(true);
});

test("the options set for the tour are real options of those features", () => {
  TOUR_OPTIONS.forEach(({ feature, option, value, off }) => {
    const dir = fs
      .readdirSync(path.resolve(process.cwd(), "src/features"), { recursive: true })
      .filter((file) => /_options\.js$/.test(file))
      .map((file) => fs.readFileSync(path.resolve(process.cwd(), "src/features", file), "utf8"))
      .find((source) => source.includes(`id: "${feature}"`));
    expect(dir).toContain(`id: "${option}"`);
    expect(off(value)).toBe(false);
  });
});

test("the pretend death date is two years after the birth, in French for Date Fixer to put right", () => {
  expect(youngDeathDate("12 Dec 1800")).toBe("14 Mar 1802");
  expect(youngDeathDate("1800-12-12", true)).toBe("14 mars 1802");
  expect(youngDeathDate("")).toBe(null);
});

test("a feature that can't be shown switched off is left out, unless it's on for the tour", () => {
  const dateStep = (off, onForTour) =>
    editPageTourSteps({}, new Set(off), new Set(onForTour)).some((step) => /^Date Fixer/.test(step.caption));
  expect(dateStep([], [])).toBe(true);
  expect(dateStep(["dateFixer"], [])).toBe(false);
  expect(dateStep(["dateFixer"], ["dateFixer"])).toBe(true);
});

test("Childless says it's on for the tour when only its Died Young option is", () => {
  const caption = editPageTourSteps({}, new Set(["unnamedInfant_options"]), new Set(["unnamedInfant_options"])).find(
    (step) => /^Childless/.test(step.caption)
  ).caption;
  expect(caption).toMatch(/on just for this tour/);
});

test("the place chosen is named as WikiTree names it for the time, never Great Britain", () => {
  const vals = [
    "Tarrant Gunville, Dorset, England, Great Britain",
    "Tarrant Gunville, Dorset, England, United Kingdom",
    "Tarrant Gunville, Dorset, England",
  ];
  expect(placeChoice(vals, 1800)).toBe(2);
  expect(placeChoice(vals, 1830)).toBe(1);
  expect(placeChoice(["Paris, France"], 1800)).toBe(0);
  expect(placeChoice(["Bath, Somerset, England, Great Britain"], 1800)).toBe(-1);
});

test("Edit Family is open for the steps about what's in it, even when it's kept folded", () => {
  // (the toggle as the redesign draws it: .plus while folded, each click switches)
  const page = (folded) => {
    document.body.innerHTML = `<a id="toggleFamilyColumn"><span class="icon--toggler ${
      folded ? "plus" : "minus"
    }"></span></a>`;
    const span = document.querySelector("#toggleFamilyColumn span");
    document.getElementById("toggleFamilyColumn").addEventListener("click", () => {
      span.classList.toggle("plus");
      span.classList.toggle("minus");
    });
    return () => span.classList.contains("plus");
  };
  // (the step's clicks, as the tour does them: those whose when() is false left out)
  const play = (step, isFolded) => {
    const seen = [];
    for (const action of step.actions.filter((action) => action.click === "#toggleFamilyColumn")) {
      if (action.when && !action.when()) continue;
      document.querySelector(action.click).click();
      seen.push(isFolded());
    }
    return seen;
  };
  const steps = editPageTourSteps();
  const foldStep = steps.find((step) => /^The Edit Family section folds/.test(step.caption));
  const connectStep = steps.find((step) => /Connect links a profile/.test(step.caption));
  const childlessStep = steps.find((step) => /^Childless/.test(step.caption));
  for (const folded of [false, true]) {
    const isFolded = page(folded);
    expect(play(foldStep, isFolded)).toEqual(folded ? [false, true, false] : [true, false]);
  }
  for (const step of [connectStep, childlessStep]) {
    const isFolded = page(true);
    play(step, isFolded);
    expect(isFolded()).toBe(false);
    page(false);
    expect(play(step, () => false)).toEqual([]);
  }
});
