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
import { contrastRatio, hexToRgb, reachContrast, rgbToHex } from "../../core/lib/colorUtils";
import { CONDITIONS, perceptualDistance, simulateColor } from "../../core/lib/colorVision";

const FEATURE_ID = "colorBlindSupport";

/**
 * What each color is used for, which is what decides how to check it.
 *
 * Two different jobs, and a color can have both:
 *
 *   - `ink`, with the ratio it needs: the color as picked, painted straight onto the page.
 *     Matches ROLES in scripts/check-palette.mjs - 4.5:1 as text, 3:1 as a solid fill.
 *   - `box`: the color seeds a message-box tint. The tint is derived, not picked, so what
 *     matters is not whether the accent is readable but whether the tint it produces is
 *     still visible against the page.
 *
 * The warning color is the case that shows why both are needed. It is painted nowhere -
 * nothing reads `--wbe-cb-warning` - so it has no ink check at all, and checking it as
 * text would be a note about a pixel that does not exist. But it does fill the warning
 * box, and a pale pick makes that box vanish. One check would have said nothing; the
 * other would have said the wrong thing.
 *
 * The success color is now in the same position. Its ink was checked at 3:1 because the
 * solid green badge was painted from it; those badges are left alone now - Content Rank
 * and PPP both label themselves in text - so nothing reads `--wbe-cb-success` either, and
 * a note about how it reads as a fill would be a note about a fill that no longer exists.
 */
const ROLES = {
  newLinkColor: { label: "New/unknown link color", ink: 4.5, inkAs: "as text", box: false },
  dangerColor: { label: "Error color", ink: 4.5, inkAs: "as text", box: true },
  warningColor: { label: "Warning color", ink: null, inkAs: null, box: true },
  successColor: { label: "Success color", ink: null, inkAs: null, box: true },
};

/**
 * How close to the page a message box may be before it stops reading as a box.
 *
 * A custom color is used as the box exactly as picked, so this is measured on the pick
 * itself - there is no derivation in between to reason about. 1.12:1 sits just under
 * WikiTree's palest box, #ffee99 at 1.17:1 on white.
 */
const BOX_MIN = 1.12;

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
 * What is worth telling the reader about each color, keyed by the option it belongs to.
 *
 * Notes, not warnings. Nothing here is wrong exactly - it is the reader's palette and
 * there are reasons to want a color that measures badly - so each line states what was
 * measured and leaves the decision alone. No instruction to go and pick something else.
 *
 * @returns {Map<string, string[]>}
 */
function findNotes() {
  const palette = currentPalette();
  const notes = new Map();
  const add = (optionId, line) => notes.set(optionId, [...(notes.get(optionId) || []), line]);

  const background = pageBackground();
  // On a dark page applyPalette tints towards the page rather than towards white, and
  // adapts the accents on top of that. The arithmetic below is the light-page one, so it
  // would be describing a box the reader is not going to get.
  const lightPage = contrastRatio(background, WHITE) < contrastRatio(background, [0, 0, 0]);

  Object.entries(ROLES).forEach(([optionId, { ink, inkAs, box }]) => {
    const rgb = palette[optionId];
    if (!rgb) {
      return;
    }

    const ratio = contrastRatio(rgb, background);

    if (!box) {
      // No box to fill, so the color is painted as picked and nothing rescues it.
      if (ink && ratio < ink) {
        add(
          optionId,
          `At ${ratio.toFixed(1)}:1 against your page this is faint ${inkAs}; ${ink}:1 or more is clearer.`
        );
      }
      return;
    }

    // A box role. The color fills the message box exactly as picked, so the only thing
    // that can go wrong is picking one the page swallows.
    if (lightPage && ratio < BOX_MIN) {
      add(
        optionId,
        `At ${ratio.toFixed(2)}:1 this is very close to your page color, so the message box will be hard to ` +
          `make out. WikiTree's own boxes sit between 1.17:1 and 1.42:1.`
      );
    }

    // Not a problem, and not phrased as one: where the same color is painted as text or as
    // a badge it cannot be this pale, so it is darkened for those and the box is left
    // alone. Worth saying because the reader would otherwise meet a color they did not
    // choose and have no way to find out where it came from.
    if (ink && lightPage && ratio < ink) {
      const derived = rgbToHex(reachContrast(rgb, background, ink));
      add(
        optionId,
        `Used ${inkAs} it is darkened to ${derived}, which reaches the ${ink}:1 it needs there. The message ` +
          `box keeps the color exactly as you picked it.`
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
    add(a, `Looks the same as ${what} with ${clashes.join(", ")}.`);
  });

  return notes;
}

/**
 * Put each note under the color picker it is about, rather than collecting them into one
 * block by the palette select. A note about the error color belongs next to the error
 * color: that is where the reader is looking when they change it, and it stops four
 * separate observations reading as a list of faults.
 */
function render() {
  const anchor = inputFor("paletteName");
  if (!anchor) {
    return;
  }

  const notes = anchor.value === "custom" ? findNotes() : new Map();

  Object.keys(ROLES).forEach((optionId) => {
    const input = inputFor(optionId);
    const id = `${FEATURE_ID}_${optionId}_note`;
    document.getElementById(id)?.remove();

    const lines = notes.get(optionId);
    if (!input || !lines) {
      return;
    }

    const note = document.createElement("p");
    note.id = id;
    note.className = "cb-palette-note";
    // Announced as well as shown: a reader using a screen reader is exactly as entitled to
    // know what their palette measures.
    note.setAttribute("role", "status");
    note.textContent = lines.join(" ");
    input.closest("div")?.appendChild(note);
  });

  // One quiet line, once, and only when there is something to qualify. Arithmetic catches
  // what arithmetic can catch; whether two colors are actually hard to tell apart is a
  // question only looking answers.
  const footnoteId = `${FEATURE_ID}_paletteFootnote`;
  document.getElementById(footnoteId)?.remove();
  if (notes.size) {
    const footnote = document.createElement("p");
    footnote.id = footnoteId;
    footnote.className = "cb-palette-note cb-palette-note--footnote";
    footnote.textContent = "These are the measurable checks. The Simulator below shows how the colors actually look.";
    anchor.closest("div")?.appendChild(footnote);
  }
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
