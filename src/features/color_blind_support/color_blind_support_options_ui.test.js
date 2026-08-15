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

const warning = () => document.getElementById("colorBlindSupportPaletteWarning");
const warningText = () => warning()?.textContent ?? "";

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

  expect(warningText()).toMatch(/New\/unknown link color is 4\.0:1 against the page/);
});

test("does not claim red and green converge, because with these matrices they do not", () => {
  // This is the pair the whole feature exists for, and the check still says nothing about
  // it: simulated red and simulated green are 91.8 dE apart, because the matrices drop
  // hue but keep luminance. Pinned here so that nobody "fixes" the threshold to make this
  // warn - it would then warn about almost every pair, including the good ones.
  buildOptionsPage({ newLinkColor: "#d40000", dangerColor: "#b0003a" });
  watchCustomPalette();

  expect(warningText()).not.toMatch(/same color/);
});

test("warns when two colors really do converge", () => {
  // Two blues a deuteranope sees as one color, which is the degenerate case arithmetic
  // can catch.
  buildOptionsPage({ dangerColor: "#0072b2", successColor: "#0073b0" });
  watchCustomPalette();

  expect(warningText()).toMatch(/Error color and success color come out as the same color/);
});

test("warns when a color is too pale to read on the page", () => {
  buildOptionsPage({ dangerColor: "#ffff00" });
  watchCustomPalette();

  expect(warningText()).toMatch(/Error color is 1\.1:1 against the page/);
});

test("says nothing at all while a preset is selected", () => {
  buildOptionsPage({ paletteName: "okabeIto", newLinkColor: "#ff0000" });
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

  expect(warningText()).toMatch(/against the page/);
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

    expect(warningText()).toMatch(/New\/unknown link color and an ordinary link come out as the same color/);
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

    expect(warningText()).toMatch(/against your Custom Style background/);
  });

  test("falls back to WikiTree's own colours when Custom Style is switched off", async () => {
    buildOptionsPage({ newLinkColor: "#0072b2" });
    const { watchCustomPalette } = await withCustomStyle(null);

    watchCustomPalette();
    await settle();

    expect(warning()).toBeNull();
  });
});
