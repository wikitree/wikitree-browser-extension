/*
Created By: Ian Beacall (Beacall-6)

The warning has to fire on colors that are genuinely wrong and stay quiet on the shipped
defaults. The most important test here is the negative one: it pins the fact that the
convergence check does NOT flag red against green, so that nobody raises the threshold to
make it, which would make it warn about nearly every pair including the good ones. See the
note at the top of color_blind_support_options_ui.js for why.
*/

import { watchCustomPalette } from "./color_blind_support_options_ui";

const DEFAULTS = {
  paletteName: "custom",
  newLinkColor: "#0072b2",
  dangerColor: "#b0003a",
  warningColor: "#c68900",
  successColor: "#007a5e",
};

function buildOptionsPage(values = {}) {
  const palette = { ...DEFAULTS, ...values };
  document.body.innerHTML = "<div id='paletteGroup'></div>";
  const group = document.getElementById("paletteGroup");

  const select = document.createElement("select");
  select.id = "colorBlindSupport_paletteName";
  ["okabeIto", "custom"].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.selected = value === palette.paletteName;
    select.appendChild(option);
  });
  group.appendChild(select);

  ["newLinkColor", "dangerColor", "warningColor", "successColor"].forEach((id) => {
    const input = document.createElement("input");
    input.type = "color";
    input.id = `colorBlindSupport_${id}`;
    input.value = palette[id];
    group.appendChild(input);
  });
  return select;
}

// Each note now sits under the color picker it is about, so there is no single warning
// element any more. These read the set of them.
const notes = () => [...document.querySelectorAll(".cb-palette-note")];
const warning = () => notes()[0] ?? null;
const warningText = () =>
  notes()
    .map((note) => note.textContent)
    .join(" ");
/** The note attached to one picker, which is what "under the right option" means. */
const noteFor = (optionId) => document.getElementById(`colorBlindSupport_${optionId}_note`)?.textContent ?? "";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test("says nothing about the shipped defaults", () => {
  buildOptionsPage();
  watchCustomPalette();

  expect(warning()).toBeNull();
});

test("warns when the new-link color is the red that started this", () => {
  // WikiTree's own a.new red, chosen by hand on the options page.
  buildOptionsPage({ newLinkColor: "#ff0000" });
  watchCustomPalette();

  expect(noteFor("newLinkColor")).toMatch(/At 4\.0:1 against your page this is faint as text/);
});

test("does not claim red and green converge, because with these matrices they do not", () => {
  // This is the pair the whole feature exists for, and the check still says nothing about
  // it: simulated red and simulated green are 91.8 dE apart, because the matrices drop
  // hue but keep luminance. Pinned here so that nobody "fixes" the threshold to make this
  // warn - it would then warn about almost every pair, including the good ones.
  buildOptionsPage({ newLinkColor: "#d40000", dangerColor: "#b0003a" });
  watchCustomPalette();

  expect(warningText()).not.toMatch(/Looks the same/);
});

test("warns when two colors really do converge", () => {
  // Two blues a deuteranope sees as one color, which is the degenerate case arithmetic
  // can catch.
  buildOptionsPage({ dangerColor: "#0072b2", successColor: "#0073b0" });
  watchCustomPalette();

  expect(noteFor("dangerColor")).toMatch(/Looks the same as success color/);
});

test("says a pale color will make a faint box, and where it gets darkened instead", () => {
  buildOptionsPage({ dangerColor: "#ffff00" });
  watchCustomPalette();

  // The box keeps the color, so the note is about what that box will look like...
  expect(noteFor("dangerColor")).toMatch(/very close to your page color, so the message box will be hard to make out/);
  // ...and the places the same color is painted as text get a darkened one, which is worth
  // saying plainly rather than leaving the reader to meet a color they did not choose.
  expect(noteFor("dangerColor")).toMatch(/Used as text it is darkened to #\w{6}, which reaches the 4.5:1/);
});

test("says nothing about WikiTree's own box color, which is a reasonable thing to pick", () => {
  // Picking the pale yellow WikiTree already uses for the warning box is the obvious move
  // when the option is called "Warning color", and it is a fine answer: at 1.17:1 it is
  // the ratio the tint would have been aimed at anyway. An earlier version lightened it
  // again to 1.03:1 and then warned about the box it had just ruined.
  buildOptionsPage({ warningColor: "#ffee99" });
  watchCustomPalette();

  expect(noteFor("warningColor")).toBe("");
});

test("warns when a color would make a message box the reader cannot see", () => {
  // Paler than any box WikiTree ships. A tint is never more visible than the color it is
  // made from, so no target can rescue this one.
  buildOptionsPage({ warningColor: "#fffdf5" });
  watchCustomPalette();

  expect(noteFor("warningColor")).toMatch(/the message box will be hard to make out/);
  // And says nothing about reading it as text: nothing paints this color as text, so a
  // note about that would be about a pixel that does not exist.
  expect(noteFor("warningColor")).not.toMatch(/Used as text/);
});

test("says nothing at all while a preset is selected", () => {
  buildOptionsPage({ paletteName: "okabeIto", newLinkColor: "#ff0000" });
  watchCustomPalette();

  expect(warning()).toBeNull();
});

test("says nothing while the palette is set to do nothing", () => {
  // Nothing is painted from these colors in that state, so measuring them would be a note
  // about a setting the reader has already turned off.
  const select = buildOptionsPage({ newLinkColor: "#ff0000" });
  const option = document.createElement("option");
  option.value = "none";
  select.appendChild(option);
  select.value = "none";
  watchCustomPalette();

  expect(warning()).toBeNull();
});

test("appears and clears as the colors are changed", () => {
  buildOptionsPage();
  watchCustomPalette();
  expect(warning()).toBeNull();

  const input = document.getElementById("colorBlindSupport_newLinkColor");
  input.value = "#ff0000";
  input.dispatchEvent(new Event("change", { bubbles: true }));
  expect(warning()).not.toBeNull();

  input.value = "#0072b2";
  input.dispatchEvent(new Event("change", { bubbles: true }));
  expect(warning()).toBeNull();
});

test("catches a bad palette that was already saved, once the inputs are filled in", () => {
  // restore_options fills the inputs from storage after this module has run, so the
  // first pass sees empty values and a second pass has to catch up.
  const select = buildOptionsPage({ paletteName: "okabeIto" });
  watchCustomPalette();
  expect(warning()).toBeNull();

  select.value = "custom";
  document.getElementById("colorBlindSupport_newLinkColor").value = "#ffff00";
  jest.advanceTimersByTime(500);

  expect(warningText()).toMatch(/against your page/);
});

describe("with Custom Style setting the reader's own colours", () => {
  function withCustomStyle(options) {
    jest.resetModules();
    jest.doMock("../../core/options/options_storage", () => ({
      checkIfFeatureEnabled: () => Promise.resolve(Boolean(options)),
      getFeatureOptions: () => Promise.resolve(options),
    }));
    return import("./color_blind_support_options_ui");
  }

  /** The Custom Style read is a three-link promise chain; let all of it settle. */
  async function settle() {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
  }

  test("compares the new-link colour against the reader's link colour, not WikiTree's green", async () => {
    // The reader has set their links to the same blue as the okabeIto new-link colour.
    // Against WikiTree's #008000 that pair looks fine, which is why the hardcoded
    // reference was the wrong thing to check.
    buildOptionsPage({ newLinkColor: "#0072b2" });
    const { watchCustomPalette } = await withCustomStyle({
      link_color: "#0072b2",
      "all_background-color": "#ffffff",
    });

    watchCustomPalette();
    await settle();

    expect(noteFor("newLinkColor")).toMatch(/Looks the same as an ordinary link/);
  });

  test("measures contrast against the reader's background, not white", async () => {
    // #0072B2 is a comfortable 5.19:1 on white and 1.6:1 on this reader's dark page.
    buildOptionsPage({ newLinkColor: "#0072b2" });
    const { watchCustomPalette } = await withCustomStyle({
      link_color: "#ffee99",
      "all_background-color": "#222222",
    });

    watchCustomPalette();
    await settle();

    // 3.1:1 is the ratio against this reader's #222222. Measured against white it is
    // 5.19:1, which is over the bar and would have produced no note at all - so the
    // number being here, and being this one, is the whole assertion.
    expect(noteFor("newLinkColor")).toMatch(/At 3\.1:1 against your page/);
  });

  test("leaves the box-tint check alone on a dark page, where a different color is used", async () => {
    // #262626 is 1.03:1 against this reader's page, so the check would fire on sight. It
    // must not: on a dark page applyPalette paints the DARK palette, which for a custom
    // one is this color raised until it is readable there - so the color being measured is
    // not the color the reader is going to get, and a note about it would be about a box
    // that never appears.
    buildOptionsPage({ warningColor: "#262626" });
    const { watchCustomPalette } = await withCustomStyle({ "all_background-color": "#222222" });

    watchCustomPalette();
    await settle();

    expect(noteFor("warningColor")).not.toMatch(/The message box/);
  });

  test("falls back to WikiTree's own colours when Custom Style is switched off", async () => {
    buildOptionsPage({ newLinkColor: "#0072b2" });
    const { watchCustomPalette } = await withCustomStyle(null);

    watchCustomPalette();
    await settle();

    expect(warning()).toBeNull();
  });
});
