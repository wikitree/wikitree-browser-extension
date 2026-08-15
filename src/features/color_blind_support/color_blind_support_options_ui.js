/*
Created By: Ian Beacall (Beacall-6)

Checks a custom palette on the options page and says so when it will not work.

The presets are checked before they ship, by scripts/check-palette.mjs. Custom colors are
not checked by anything, and they are the easiest way to end up worse off than with no
feature at all: a color-blind reader has no way to see that the two colors they have just
chosen are the same color to them, which is the exact problem this feature exists to
solve. Picking colors is also the one part of this that a reader cannot self-check by
looking, so it is the part that has to be checked for them.

Two things are tested:

  - readable where it is used, measured on the true color against the page background -
    the reader's own, when Custom Style is setting one
  - not simply the same color as something else once simulated

Be clear about what that second one is and is not. It catches a pair that converges - two
colors that end up the same after simulation. It does NOT answer "will these be hard to
tell apart", and no arithmetic here could.

Measured, because it is worth knowing: WikiTree's own red a.new against its own green
links - the exact confusion this whole feature was built for - comes out 91.8 dE apart
under the deuteranopia matrix. Searching the space of readable reds against readable
greens does not turn up a single pair within 14 dE. The reason is that these matrices
model the loss of hue but keep each color's luminance, so a simulated red and a simulated
green always separate numerically. A reader looking at one link in a paragraph has no
second link beside it to compare that lightness against, which is the whole difficulty and
is not something a distance between two swatches can express.

So the honest division of labour is: this file catches the mistakes arithmetic can catch,
the simulator answers "can I tell these apart" by showing the user, and the shape cues are
what actually guarantee the answer either way. The warning says so.

Everything here is advisory. Nothing is blocked or silently corrected: it is the user's
palette, and there are reasons to want a color that scores badly.
*/

import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import { contrastRatio, hexToRgb } from "../../core/lib/colorUtils";
import { CONDITIONS, perceptualDistance, simulateColor } from "../../core/lib/colorVision";

const FEATURE_ID = "colorBlindSupport";

/** Matches ROLES in scripts/check-palette.mjs: 4.5:1 where a color is painted as text. */
const ROLES = {
  newLinkColor: { label: "New/unknown link color", minContrast: 4.5 },
  dangerColor: { label: "Error color", minContrast: 4.5 },
  warningColor: { label: "Warning color", minContrast: 3 },
  successColor: { label: "Success color", minContrast: 3 },
};

const WHITE = [255, 255, 255];
/** WikiTree's ordinary link color, which is what a new-page link has to look unlike. */
const ORDINARY_LINK = [0, 128, 0];

/**
 * Custom Style's own settings, when that feature is switched on.
 *
 * It has 24 colour pickers, two of which decide whether the checks here mean anything:
 * "Link color" replaces the colour a new-page link has to look unlike, and "Background
 * color" replaces the one everything is measured against. Checking against WikiTree's
 * defaults while the reader is looking at their own colours is checking the wrong page.
 *
 * Custom Style's own contrast logic cannot cover this: it asks whether text is readable
 * on its own background, one element at a time. Whether two separate colours stay
 * distinguishable - let alone distinguishable to a colour-blind reader - is not a
 * question it is shaped to ask.
 */
let customStyle = null;

/**
 * Below this, two colors are the same color rather than merely similar. Deliberately low:
 * see the note at the top about what this check can and cannot tell you. A higher bar
 * here would produce confident warnings about pairs it has no basis to judge.
 */
const SAME_COLOR = 12;

const PAIRS = [
  { a: "newLinkColor", b: null, against: ordinaryLinkColor, describe: "an ordinary link" },
  { a: "dangerColor", b: "successColor", describe: null },
];

function inputFor(optionId) {
  return document.getElementById(`${FEATURE_ID}_${optionId}`);
}

/** The link colour a new-page link is competing with on this reader's pages. */
function ordinaryLinkColor() {
  return (customStyle && hexToRgb(customStyle.link_color)) || ORDINARY_LINK;
}

/** The background everything is measured against on this reader's pages. */
function pageBackground() {
  return (customStyle && hexToRgb(customStyle["all_background-color"])) || WHITE;
}

function currentPalette() {
  const palette = {};
  Object.keys(ROLES).forEach((optionId) => {
    const input = inputFor(optionId);
    palette[optionId] = input ? hexToRgb(input.value) : null;
  });
  return palette;
}

/**
 * @returns {string[]} one plain-language line per problem, empty when there are none.
 */
function findProblems() {
  const palette = currentPalette();
  const problems = [];

  Object.entries(ROLES).forEach(([optionId, { label, minContrast }]) => {
    const rgb = palette[optionId];
    if (!rgb) {
      return;
    }
    const ratio = contrastRatio(rgb, pageBackground());
    if (ratio < minContrast) {
      const against = customStyle ? "against your Custom Style background" : "against the page";
      problems.push(
        `${label} is ${ratio.toFixed(1)}:1 ${against}, below the ${minContrast}:1 it needs. ` +
          `Choose a shade with more contrast.`
      );
    }
  });

  PAIRS.forEach(({ a, b, against, describe }) => {
    const first = palette[a];
    const second = b ? palette[b] : against();
    if (!first || !second) {
      return;
    }
    const clashes = Object.keys(CONDITIONS).filter(
      (condition) => perceptualDistance(simulateColor(first, condition), simulateColor(second, condition)) < SAME_COLOR
    );
    if (!clashes.length) {
      return;
    }
    const what = describe || ROLES[b].label.toLowerCase();
    problems.push(
      `${ROLES[a].label} and ${what} come out as the same color with ${clashes.join(", ")}. ` +
        `That is the problem this feature is meant to fix, so it is worth changing one of them.`
    );
  });

  return problems;
}

/**
 * Show or clear the warning. It goes after the palette select rather than after any one
 * picker, because most of what it reports is about a pair of colors and belongs to the
 * palette as a whole.
 */
function render() {
  const anchor = inputFor("paletteName");
  if (!anchor) {
    return;
  }

  let warning = document.getElementById("colorBlindSupportPaletteWarning");
  const custom = anchor.value === "custom";
  const problems = custom ? findProblems() : [];

  if (!problems.length) {
    warning?.remove();
    return;
  }

  if (!warning) {
    warning = document.createElement("div");
    warning.id = "colorBlindSupportPaletteWarning";
    warning.className = "cb-palette-warning";
    // Announced rather than only shown: a reader using a screen reader is exactly as
    // entitled to know their palette will not work.
    warning.setAttribute("role", "status");
    anchor.closest("div")?.appendChild(warning);
  }

  warning.textContent = "";
  const heading = document.createElement("strong");
  heading.textContent = problems.length === 1 ? "One problem with these colors:" : "Problems with these colors:";
  warning.appendChild(heading);

  const list = document.createElement("ul");
  problems.forEach((problem) => {
    const item = document.createElement("li");
    item.textContent = problem;
    list.appendChild(item);
  });
  warning.appendChild(list);

  // These checks catch what arithmetic can catch. Whether two colors are hard to tell
  // apart - the actual question - is one only looking can answer, so say where to look.
  const footnote = document.createElement("p");
  footnote.className = "cb-palette-warning-footnote";
  footnote.textContent =
    "These are the problems that can be measured. To see whether your colors are actually " +
    "easy to tell apart, set the Simulator below and look at a page.";
  warning.appendChild(footnote);
}

/**
 * Delegated, so it does not matter whether this runs before or after the options page has
 * built its inputs or filled them in from storage.
 */
export function watchCustomPalette() {
  // Read Custom Style once. If it is off, or unreadable, the WikiTree defaults stand.
  checkIfFeatureEnabled("customStyle")
    .then((enabled) => (enabled ? getFeatureOptions("customStyle") : null))
    .then((options) => {
      customStyle = options;
      render();
    })
    .catch(() => {});

  const watched = new Set([...Object.keys(ROLES), "paletteName"].map((optionId) => `${FEATURE_ID}_${optionId}`));

  ["change", "input"].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      if (watched.has(event.target?.id)) {
        render();
      }
    });
  });

  // And once at the start, for a palette that was already saved in a bad state.
  render();
  // restore_options fills the inputs from storage asynchronously, so the first render can
  // land on empty values. This second pass catches that without needing a hook into it.
  setTimeout(render, 500);
}
