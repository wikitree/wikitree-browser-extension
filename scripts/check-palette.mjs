#!/usr/bin/env node
/*
Created By: Ian Beacall (Beacall-6)

Checks the preset palettes in the Color-Blind Support feature.

A palette meant to help color-blind readers has to clear two bars that pull against each
other, and it is easy to fix one and quietly break the other:

  1. Every color has to be readable where it is used. Measured on the TRUE color, not the
     simulated one. Dichromats' luminance perception is close to normal - what they lose
     is hue - so simulating first and measuring contrast after invents a loss the eye does
     not suffer, and pushes you towards a needlessly murky palette.

  2. The colors have to stay apart from each other, and from the page's ordinary link
     color, AFTER simulation. That is the part a person with normal color vision cannot
     check by looking.

Be careful about how much bar 2 proves. It catches colors that CONVERGE - that come out as
the same color once simulated. It does not, and cannot, answer "will these be hard to tell
apart". WikiTree's own red a.new against its own green links, the confusion this feature
was built for, is 91.8 dE apart under the deuteranopia matrix, and no readable red and
readable green pair comes within 14 dE of each other. The matrices model the loss of hue
but keep each color's luminance, so simulated reds and greens always separate numerically,
while a reader looking at a single link has no second link beside it to judge that
luminance against. That gap is what the shape cues exist to close, and it is why they are
not optional extras.

Both bars are checked on both backgrounds the extension has to work against: WikiTree's
white, and the #36393f of WBE's own Dark Mode.

The palettes are read out of the feature source rather than copied here, so this cannot
drift away from what actually ships.

Usage: node scripts/check-palette.mjs [--verbose]
*/

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(root, "src/features/color_blind_support/color_blind_support.js");

/** Where each color is used, which is what decides the contrast bar it has to clear. */
const ROLES = {
  newLink: { usedAs: "text", minContrast: 4.5 },
  danger: { usedAs: "text", minContrast: 4.5 },
  warning: { usedAs: "border", minContrast: 3 },
  success: { usedAs: "border", minContrast: 3 },
};

/**
 * The two backgrounds, each with the color ordinary links have on it. A new-page link that
 * matches the ordinary link color is the exact bug this feature exists to fix, so the
 * link color is checked as if it were a fifth member of the palette.
 */
const BACKGROUNDS = {
  light: { bg: "#ffffff", linkColor: "#008000", label: "WikiTree (white)" },
  dark: { bg: "#36393f", linkColor: "#ffee99", label: "WBE Dark Mode" },
};

// Same matrices the feature uses. Achromatopsia is not here for the same reason it is not
// there: it is done with the browser's grayscale(), on Rec.709 rather than Rec.601 luma.
const SIMULATIONS = {
  deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
  protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
  tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
};

/**
 * Which conditions each palette is actually for. Holding every palette to every condition
 * would be meaningless - the whole point of offering more than one is that a palette can
 * spend the red/green axis to buy separation elsewhere, or the other way round.
 *
 * highContrast targets none of them on purpose: it gives up on hue entirely and separates
 * by darkness and by the shape cues, so only its contrast is worth checking.
 *
 * A palette added without an entry here fails, rather than being waved through.
 */
const PALETTE_TARGETS = {
  okabeIto: ["deuteranopia", "protanopia", "tritanopia"],
  redGreen: ["deuteranopia", "protanopia"],
  tritan: ["tritanopia"],
  highContrast: [],
};

/**
 * The pairs that have to stay apart on color alone, because nothing else separates them.
 *
 * newLink against the ordinary link color is the bug this feature was built for. danger
 * against success is pass versus fail, the most costly confusion on the page.
 *
 * Every other pair - warning against danger, warning against success - is carried by the
 * border styles (solid, dashed, double) as well as by color, so those are reported and
 * not failed. That is the same reasoning that makes the shape cues non-optional.
 */
const CRITICAL_PAIRS = [
  ["newLink", "ordinaryLink"],
  ["danger", "success"],
];

/** Below this two colors read as the same color. CIE76 dE of about 25 is a clear step. */
const MIN_DISTANCE = 25;

/** Grayscale is the hardest case and no palette survives it, so it is reported, not failed. */
const GRAYSCALE_NOTE = 12;

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(value.substr(i, 2), 16));
}

function relativeLuminance([r, g, b]) {
  const [rl, gl, bl] = [r, g, b]
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)));
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(a, b) {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

function simulate([r, g, b], matrix) {
  return [
    matrix[0] * r + matrix[1] * g + matrix[2] * b,
    matrix[3] * r + matrix[4] * g + matrix[5] * b,
    matrix[6] * r + matrix[7] * g + matrix[8] * b,
  ].map((channel) => Math.max(0, Math.min(255, Math.round(channel))));
}

function grayscale(rgb) {
  const value = Math.round(relativeLuminance(rgb) * 255);
  return [value, value, value];
}

/** sRGB to CIE Lab, so that "how different are these" means something to an eye. */
function toLab([r, g, b]) {
  const linear = [r, g, b]
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)));
  const [x, y, z] = [
    (0.4124 * linear[0] + 0.3576 * linear[1] + 0.1805 * linear[2]) / 0.95047,
    0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2],
    (0.0193 * linear[0] + 0.1192 * linear[1] + 0.9505 * linear[2]) / 1.08883,
  ].map((channel) => (channel > 0.008856 ? Math.cbrt(channel) : 7.787 * channel + 16 / 116));
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function distance(a, b) {
  const [la, aa, ba] = toLab(a);
  const [lb, ab, bb] = toLab(b);
  return Math.sqrt((la - lb) ** 2 + (aa - ab) ** 2 + (ba - bb) ** 2);
}

/**
 * Pull a palette table out of the feature source. Deliberately strict: a parse that finds
 * nothing is a failure, not an empty pass, or this check would silently stop checking.
 */
function readPalettes(source, constantName) {
  const block = new RegExp(`const ${constantName} = \\{([\\s\\S]*?)\\n\\};`).exec(source);
  if (!block) {
    return null;
  }
  const palettes = {};
  const entry = /(\w+):\s*\{([^}]*)\}/g;
  let match;
  while ((match = entry.exec(block[1])) !== null) {
    const colors = {};
    const pair = /(\w+):\s*"(#[0-9a-fA-F]{6})"/g;
    let color;
    while ((color = pair.exec(match[2])) !== null) {
      colors[color[1]] = color[2];
    }
    palettes[match[1]] = colors;
  }
  return Object.keys(palettes).length ? palettes : null;
}

const verbose = process.argv.includes("--verbose");
const source = readFileSync(SOURCE, "utf8");
const failures = [];
const notes = [];

/**
 * @param {string} scheme - a key of BACKGROUNDS
 * @param {object} palettes - palette name to {role: hex}
 */
function checkPalettes(scheme, palettes) {
  const { bg, linkColor, label } = BACKGROUNDS[scheme];
  const background = hexToRgb(bg);

  Object.entries(palettes).forEach(([name, colors]) => {
    const missing = Object.keys(ROLES).filter((role) => !colors[role]);
    if (missing.length) {
      failures.push(`${label} / ${name}: no color for ${missing.join(", ")}`);
      return;
    }

    // 1. Readable where it is used.
    Object.entries(ROLES).forEach(([role, { usedAs, minContrast }]) => {
      const ratio = contrastRatio(hexToRgb(colors[role]), background);
      if (ratio < minContrast) {
        failures.push(
          `${label} / ${name} / ${role} ${colors[role]}: ${ratio.toFixed(2)}:1 against ${bg}, ` +
            `needs ${minContrast}:1 as ${usedAs}`
        );
      } else if (verbose) {
        console.log(`  ok   ${name}/${role} ${colors[role]} ${ratio.toFixed(2)}:1 (${usedAs})`);
      }
    });

    // 2. Still telling each other apart with the color vision this palette is for.
    const targets = PALETTE_TARGETS[name];
    if (!targets) {
      failures.push(`${label} / ${name}: no entry in PALETTE_TARGETS - which conditions is it for?`);
      return;
    }

    const members = { ...colors, ordinaryLink: linkColor };
    targets.forEach((condition) => {
      const seen = Object.fromEntries(
        Object.entries(members).map(([role, hex]) => [role, simulate(hexToRgb(hex), SIMULATIONS[condition])])
      );

      CRITICAL_PAIRS.forEach(([a, b]) => {
        const apart = distance(seen[a], seen[b]);
        if (apart < MIN_DISTANCE) {
          failures.push(
            `${label} / ${name}: ${a} and ${b} are ${apart.toFixed(1)} apart under ` +
              `${condition} (need ${MIN_DISTANCE})`
          );
        } else if (verbose) {
          console.log(`  ok   ${name} ${a}/${b} ${apart.toFixed(1)} under ${condition}`);
        }
      });

      // The rest of the pairs are carried by their border styles too, so a collision is
      // worth knowing about but is not a failure.
      ["warning"].forEach((role) => {
        ["danger", "success"].forEach((other) => {
          const apart = distance(seen[role], seen[other]);
          if (apart < MIN_DISTANCE) {
            notes.push(`${label} / ${name}: ${role} and ${other} are ${apart.toFixed(1)} apart under ${condition}`);
          }
        });
      });
    });

    // 3. Grayscale, reported only. Any two colors dark enough to read on white sit in a
    // narrow luminance band, so they converge - which is why the shape cues are not
    // optional extras, and why this is a note rather than a failure.
    const gray = Object.fromEntries(Object.entries(members).map(([role, hex]) => [role, grayscale(hexToRgb(hex))]));
    CRITICAL_PAIRS.forEach(([a, b]) => {
      const apart = distance(gray[a], gray[b]);
      if (apart < GRAYSCALE_NOTE) {
        notes.push(`${label} / ${name}: ${a} and ${b} are ${apart.toFixed(1)} apart in grayscale`);
      }
    });
  });
}

const light = readPalettes(source, "PALETTES");
if (!light) {
  console.error("check-palette: could not find PALETTES in", SOURCE);
  process.exit(2);
}
checkPalettes("light", light);

const dark = readPalettes(source, "DARK_PALETTES");
if (dark) {
  checkPalettes("dark", dark);
} else {
  notes.push("No DARK_PALETTES found: Dark Mode is using the light palette on a #36393f background.");
}

const paletteCount = Object.keys(light).length + (dark ? Object.keys(dark).length : 0);

if (notes.length) {
  console.log("\nNotes (carried by the shape cues, not failures):");
  notes.forEach((note) => console.log("  - " + note));
}

if (failures.length) {
  console.error(`\ncheck-palette: ${failures.length} problem(s) in ${paletteCount} palette(s):\n`);
  failures.forEach((failure) => console.error("  x " + failure));
  console.error("");
  process.exit(1);
}

console.log(`\ncheck-palette: ${paletteCount} palette(s) checked, all readable and all distinguishable.`);
