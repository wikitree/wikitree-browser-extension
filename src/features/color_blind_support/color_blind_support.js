/*
Created By: Ian Beacall (Beacall-6)

WikiTree uses color on its own to carry meaning in several places: links to pages that
do not exist yet are red where every other link is green, boxes are green for "here is
something" and orange for "pay attention", privacy levels are a row of yellows, and
gender is a pale pink/blue/green background. None of those distinctions survive
red-green color blindness, which is the most common kind.

This feature does two things about that. It swaps the colors for a palette whose members
stay distinguishable, and - more importantly - it adds a second, non-color channel:
border styles, a marker on new links, the privacy level as a number. Color-blindness
comes in enough varieties that no single palette works for everyone, so the shape cues
are what actually make the page readable; the palette is the polish.

The colors are published as CSS custom properties on <html> so that WBE's own features
can pick them up too - see the var(--wbe-cb-*, <original>) fallbacks scattered through
the other features' stylesheets. The fallback is always the color that was there before,
so nothing changes when this feature is off.
*/

import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { hexToRgb, lightenColor, readableTextColor, rgbToHex } from "../../core/lib/colorUtils";

/**
 * Preset palettes.
 *
 * okabeIto starts from the Okabe-Ito qualitative palette, the usual reference for
 * color-blind-safe design. redGreen leans on the blue/yellow axis, which deuteranopes
 * and protanopes retain; tritan leans on red/green, which tritanopes retain; and
 * highContrast gives up on hue separation entirely to maximise darkness against a light
 * background, for readers better served by contrast than by color.
 *
 * These are not the textbook hexes. They were darkened until each cleared WCAG on white
 * for the job it actually does - 4.5:1 for newLink and danger, which get painted as
 * text, 3:1 for warning and success, which are only ever borders or the seed for a pale
 * background. Okabe-Ito's own #E69F00 is 2.3:1, so it could not be used as-is. Note
 * that the danger colors are a crimson rather than the obvious vermillion: darkening a
 * vermillion enough to be readable walks it straight into the warning amber, and the
 * two have to stay apart.
 *
 * Two things these palettes deliberately do NOT solve, because no choice of hue can:
 *
 *   - In pure grayscale, any two colors dark enough to read on white sit in a narrow
 *     luminance band, so newLink and WikiTree's green links converge. The dotted
 *     underline and the "?" are what separate them, which is the whole reason the cues
 *     are not optional extras.
 *   - highContrast's danger, warning and success are three dark colors by design, and
 *     converge under simulation. The border styles carry that preset.
 *
 * If you change a value here, re-check it: contrast against white on the true color
 * (dichromats' luminance perception is near-normal, so simulating first and measuring
 * contrast after invents a loss the eye does not suffer), and hue separation on the
 * simulated color.
 */
const PALETTES = {
  okabeIto: { newLink: "#0072B2", danger: "#B0003A", warning: "#C68900", success: "#007A5E" },
  redGreen: { newLink: "#0072B2", danger: "#B0003A", warning: "#B78D2A", success: "#004488" },
  tritan: { newLink: "#CC3311", danger: "#99000D", warning: "#D9661F", success: "#007A5E" },
  highContrast: { newLink: "#0000CC", danger: "#A00000", warning: "#6B4B00", success: "#005544" },
};

/**
 * Color matrices for the simulator. These are the widely used linear approximations
 * (Wickline / Viénot), applied with color-interpolation-filters="sRGB" so that the
 * result matches what the familiar online simulators show.
 */
const SIMULATION_MATRICES = {
  deuteranopia: "0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0",
  protanopia: "0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0",
  tritanopia: "0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0",
  achromatopsia: "0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0",
};

const SIMULATION_LABELS = {
  grayscale: "Grayscale",
  deuteranopia: "Deuteranopia",
  protanopia: "Protanopia",
  tritanopia: "Tritanopia",
  achromatopsia: "Achromatopsia",
};

/**
 * Resolve the chosen palette to its four colors, publish them on <html> as custom
 * properties, and derive a pale background and a readable foreground for each.
 *
 * The pale backgrounds stand in for WikiTree's own #e1f0b4 and #ffee99 box tints. They
 * are mixed towards white rather than picked by hand so that a custom accent color
 * always gets a background that goes with it.
 *
 * @param {object} options
 */
function applyPalette(options) {
  const palette =
    options.paletteName === "custom"
      ? {
          newLink: options.newLinkColor,
          danger: options.dangerColor,
          warning: options.warningColor,
          success: options.successColor,
        }
      : PALETTES[options.paletteName] || PALETTES.okabeIto;

  const root = document.documentElement;
  root.style.setProperty("--wbe-cb-newlink", palette.newLink);

  ["danger", "warning", "success"].forEach((role) => {
    const hex = palette[role];
    root.style.setProperty(`--wbe-cb-${role}`, hex);

    const rgb = hexToRgb(hex);
    if (!rgb) {
      // A custom color the picker somehow left unparseable: leave the -bg properties
      // unset so the stylesheet's own fallbacks apply rather than writing "undefined".
      return;
    }
    // 84% towards white lands close to the lightness of WikiTree's existing box tints,
    // which keeps the boxes looking like WikiTree rather than like a warning banner.
    const background = lightenColor(rgb, 84);
    root.style.setProperty(`--wbe-cb-${role}-bg`, rgbToHex(background));
    root.style.setProperty(`--wbe-cb-${role}-text`, readableTextColor(background));
  });
}

/**
 * Put the cue choices on <body> as classes, so the stylesheet can stay static.
 *
 * @param {object} options
 */
function applyCueClasses(options) {
  const classes = ["wbe-cb", `wbe-cb-newlink-${options.newLinkCue}`, `wbe-cb-privacy-${options.privacyCue}`];

  classes.push(`wbe-cb-gender-${options.genderCue}`);
  if (options.statusCue) {
    classes.push("wbe-cb-status");
  }

  document.body.classList.add(...classes);
}

/**
 * Copy each privacy dot's level onto a data attribute so that CSS can print it.
 *
 * WikiTree writes the level into the class name in two shapes: privacy--50 on profiles
 * and lists, and privacy-50 (plus the words public/semiprivate/private) on forms. Both
 * are handled; the worded form has no number to show, so it is left alone.
 *
 * @param {object} options
 */
function tagPrivacyDots(options) {
  if (options.privacyCue === "none") {
    return;
  }

  const tag = (dot) => {
    const match = /(?:^|\s)privacy--?(\d{2})(?:\s|$)/.exec(dot.className || "");
    if (!match) {
      return;
    }
    const level = match[1];
    dot.setAttribute("data-wbe-privacy", level);

    // The 15px dots have no room for a numeral next to them without colliding with the
    // text they sit in, so those get the level in a tooltip instead. Only add one when
    // WikiTree has not already put something more useful there.
    if (dot.classList.contains("privacy--sm") && !dot.title) {
      dot.title = `Privacy level ${level}`;
    }
  };

  document.querySelectorAll(".privacy").forEach(tag);

  // Watchlists, CC7 tables and several WBE features build their rows after load, so a
  // one-off pass would miss most of the dots on exactly the pages with the most of them.
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }
        if (node.classList.contains("privacy")) {
          tag(node);
        }
        node.querySelectorAll?.(".privacy").forEach(tag);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Turn the whole page the color a reader with the chosen condition would see.
 *
 * The filter goes on <body> rather than <html>: either one creates a containing block
 * for fixed-position descendants, but putting it on <body> at least leaves the
 * scrolling root alone. Anything position: fixed inside the page will scroll with the
 * content while this is on, which is why the badge says so and why this is a checking
 * tool rather than something to browse with.
 *
 * @param {object} options
 */
function applySimulator(options) {
  const mode = options.simulate;
  if (!mode || mode === "off") {
    return;
  }

  if (mode === "grayscale") {
    document.body.style.filter = "grayscale(1)";
  } else {
    const matrix = SIMULATION_MATRICES[mode];
    if (!matrix) {
      return;
    }
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("id", "wbeColorBlindFilters");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");

    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", `wbe-cb-${mode}`);
    filter.setAttribute("color-interpolation-filters", "sRGB");

    const feColorMatrix = document.createElementNS(svgNS, "feColorMatrix");
    feColorMatrix.setAttribute("type", "matrix");
    feColorMatrix.setAttribute("values", matrix);

    filter.appendChild(feColorMatrix);
    svg.appendChild(filter);
    // Outside <body> so the filter definition is not itself filtered.
    document.documentElement.appendChild(svg);

    document.body.style.filter = `url(#wbe-cb-${mode})`;
  }

  document.body.classList.add("wbe-cb-simulating");
  addSimulatorBadge(mode);
}

/**
 * A corner reminder that the page is not really this color. Without it the first
 * reaction to a simulated page is to assume WikiTree or the extension has broken.
 *
 * It hangs off <html> rather than <body> for two reasons: outside the filtered element
 * it keeps its real colors, and it keeps a working position: fixed, which anything
 * inside the filter has lost. It is still drawn in plain black and white so that it
 * survives being screenshotted alongside a simulated page.
 *
 * @param {string} mode
 */
function addSimulatorBadge(mode) {
  const badge = document.createElement("div");
  badge.id = "wbeColorBlindSimulatorBadge";
  badge.textContent = `Simulating: ${SIMULATION_LABELS[mode] || mode}`;
  badge.title =
    "WBE Color-Blind Support is simulating a color vision deficiency. " +
    "Turn it off in the extension's options. Click to dismiss this reminder.";
  badge.addEventListener("click", () => badge.remove());
  document.documentElement.appendChild(badge);
}

shouldInitializeFeature("colorBlindSupport").then((result) => {
  if (result) {
    getFeatureOptions("colorBlindSupport").then((options) => {
      import("./color_blind_support.css");
      applyPalette(options);
      applyCueClasses(options);
      tagPrivacyDots(options);
      applySimulator(options);
    });
  }
});
