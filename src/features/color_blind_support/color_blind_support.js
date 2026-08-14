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
 *
 * Achromatopsia has no entry here because it needs no matrix: it is handled with the
 * browser's own filter: grayscale(1). That is deliberate, and not just convenience. The
 * matrix usually published for achromatopsia uses the Rec.601 luma coefficients
 * (0.299/0.587/0.114), a legacy television standard, where grayscale() uses Rec.709
 * (0.2126/0.7152/0.0722), the right luminance model for sRGB. The two disagree, and not
 * subtly: WikiTree's green links and its red a.new links come out 38 levels apart under
 * grayscale() and 1 level apart under the Rec.601 matrix.
 *
 * Worth being honest about what that mode is, though. Complete achromatopsia is rod
 * monochromacy, and rods peak around 498nm, so true rod luminance weights the channels
 * differently again from either standard. No greyscale conversion is a faithful model of
 * it. What this mode reliably answers is "what survives when hue is gone", which is the
 * question worth asking, and it doubles as a black-and-white print check.
 */
const SIMULATION_MATRICES = {
  deuteranopia: "0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0",
  protanopia: "0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0",
  tritanopia: "0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0",
};

const SIMULATION_LABELS = {
  off: "off",
  achromatopsia: "Achromatopsia",
  deuteranopia: "Deuteranopia",
  protanopia: "Protanopia",
  tritanopia: "Tritanopia",
};

/**
 * The modes offered in the corner picker, in the order the options dropdown lists them.
 * Every entry is a condition, so that the list reads as a set of readers rather than a
 * set of image effects. "off" is a stop on the list, not an exit from it: comparing a
 * page against its real colors is half of checking it.
 */
const SIMULATION_ORDER = ["off", "achromatopsia", "deuteranopia", "protanopia", "tritanopia"];

/**
 * Guard against a stored value that is no longer offered, rather than leaving the picker
 * showing nothing and the page unfiltered.
 *
 * @param {string} mode
 * @returns {string}
 */
function normalizeMode(mode) {
  if (mode === "grayscale") {
    return "achromatopsia";
  }
  return SIMULATION_ORDER.includes(mode) ? mode : "off";
}

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
 * Every custom property applyPalette sets, so that turning the support off again can
 * remove exactly what was added and no more.
 */
const PALETTE_PROPERTIES = [
  "--wbe-cb-newlink",
  ...["danger", "warning", "success"].flatMap((role) => [
    `--wbe-cb-${role}`,
    `--wbe-cb-${role}-bg`,
    `--wbe-cb-${role}-text`,
  ]),
];

/**
 * The <body> classes the cue choices translate to, so that the stylesheet can stay
 * static.
 *
 * @param {object} options
 * @returns {string[]}
 */
function cueClassesFor(options) {
  const classes = ["wbe-cb", `wbe-cb-newlink-${options.newLinkCue}`, `wbe-cb-privacy-${options.privacyCue}`];

  classes.push(`wbe-cb-gender-${options.genderCue}`);
  if (options.statusCue) {
    classes.push("wbe-cb-status");
  }

  return classes;
}

/**
 * Turn the remediation itself on or off, live, without touching the simulation.
 *
 * This is what makes the corner control a comparison tool rather than just a filter:
 * with a deficiency simulated, switching the support off shows the problem and switching
 * it back on shows the fix. Nothing else demonstrates as quickly why any of this matters.
 *
 * Removing the custom properties is what un-does the colors in WBE's other features too,
 * since those read them as var(--wbe-cb-danger, red) and fall back to their original
 * value the moment the property is gone.
 *
 * @param {boolean} on
 * @param {object} options
 */
function setSupport(on, options) {
  if (on) {
    applyPalette(options);
    document.body.classList.add(...cueClassesFor(options));
  } else {
    PALETTE_PROPERTIES.forEach((property) => document.documentElement.style.removeProperty(property));
    document.body.classList.remove(...cueClassesFor(options));
  }
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
 * Define every simulation filter once, up front, so that switching between them later
 * is only a change of one CSS property.
 *
 * The <svg> hangs off <html> rather than <body> so that the filter definitions are not
 * themselves filtered by the filter they define.
 */
function ensureFilterDefs() {
  if (document.getElementById("wbeColorBlindFilters")) {
    return;
  }
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("id", "wbeColorBlindFilters");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("style", "position:absolute");

  Object.entries(SIMULATION_MATRICES).forEach(([mode, matrix]) => {
    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", `wbe-cb-${mode}`);
    filter.setAttribute("color-interpolation-filters", "sRGB");

    const feColorMatrix = document.createElementNS(svgNS, "feColorMatrix");
    feColorMatrix.setAttribute("type", "matrix");
    feColorMatrix.setAttribute("values", matrix);

    filter.appendChild(feColorMatrix);
    svg.appendChild(filter);
  });

  document.documentElement.appendChild(svg);
}

/**
 * Turn the whole page the color a reader with the given condition would see.
 *
 * The filter goes on <body> rather than <html>: either one creates a containing block
 * for fixed-position descendants, but putting it on <body> at least leaves the scrolling
 * root alone. Anything position: fixed inside the page will scroll with the content
 * while this is on, which is why the picker says so and why this is a checking tool
 * rather than something to browse with.
 *
 * @param {string} mode - a key of SIMULATION_ORDER.
 */
function setSimulation(mode) {
  if (mode === "off") {
    document.body.style.filter = "";
    document.body.classList.remove("wbe-cb-simulating");
    return;
  }
  if (mode === "achromatopsia") {
    // The browser's own greyscale, not a matrix of ours - see SIMULATION_MATRICES.
    document.body.style.filter = "grayscale(1)";
  } else if (SIMULATION_MATRICES[mode]) {
    ensureFilterDefs();
    document.body.style.filter = `url(#wbe-cb-${mode})`;
  } else {
    return;
  }
  document.body.classList.add("wbe-cb-simulating");
}

/**
 * Remember the mode, so that a check carries from page to page. Walking a run of pages
 * is the whole point of the simulator, and having it snap back on every navigation
 * would make that unusable.
 *
 * @param {string} mode
 */
function persistSimulation(mode) {
  getFeatureOptions("colorBlindSupport").then((options) => {
    options.simulate = mode;
    chrome.storage.sync.set({ colorBlindSupport_options: options });
  });
}

function applySimulator(options) {
  const mode = normalizeMode(options.simulate);
  if (mode === "off") {
    return;
  }
  setSimulation(mode);
  addSimulatorPicker(mode, options);
}

/**
 * The corner control: a reminder that the page is not really this color, and the
 * quickest way to compare readers, and to compare the page with and without the help.
 *
 * Two independent things, because they are independent questions. The checkbox is
 * whether WBE is helping; the select is whose eyes you are looking through. The
 * interesting combination is a deficiency selected with the support switched off - that
 * is the page as the person who reported this actually sees it - and then switching the
 * support back on.
 *
 * A native <select> rather than a click-to-cycle button: with five modes, cycling means
 * up to four clicks to reach the one you want and no way to see what the choices are;
 * a select is one click, self-describing, and keyboard-operable for free. Sitting at the
 * bottom of the viewport, browsers open it upwards on their own.
 *
 * The whole thing hangs off <html> rather than <body> for two reasons: outside the
 * filtered element it keeps its real colors, and it keeps a working position: fixed,
 * which anything inside the filter has lost.
 *
 * @param {string} mode
 * @param {object} options
 */
function addSimulatorPicker(mode, options) {
  const badge = document.createElement("div");
  badge.id = "wbeColorBlindSimulatorBadge";

  const supportToggle = document.createElement("input");
  supportToggle.type = "checkbox";
  supportToggle.id = "wbeColorBlindSupportToggle";
  supportToggle.checked = true;

  const supportLabel = document.createElement("label");
  supportLabel.setAttribute("for", "wbeColorBlindSupportToggle");
  supportLabel.textContent = "Support";
  supportLabel.title =
    "Uncheck to see this page as WikiTree styles it, without any of Color-Blind Support's " +
    "colors or cues. Leave it unchecked and close this control to turn the whole feature off.";

  const label = document.createElement("label");
  label.setAttribute("for", "wbeColorBlindSimulatorSelect");
  label.textContent = "Seeing as:";

  const select = document.createElement("select");
  select.id = "wbeColorBlindSimulatorSelect";
  select.title =
    "WBE Color-Blind Support is showing this page as a color-blind reader sees it. " +
    "Choose a different condition, or Normal to see the real colors.";
  SIMULATION_ORDER.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value === "off" ? "Normal (off)" : SIMULATION_LABELS[value];
    option.selected = value === mode;
    select.appendChild(option);
  });
  select.addEventListener("change", () => {
    setSimulation(select.value);
    persistSimulation(select.value);
  });

  const close = document.createElement("button");
  close.type = "button";
  close.className = "wbe-cb-badge-close";
  close.textContent = "×";

  // What the close button does depends on the checkbox, so say which it will be. With
  // the support on it is a plain dismiss; with it off it commits the decision.
  const describeClose = () => {
    if (supportToggle.checked) {
      close.title = "Hide this control and stay in the current mode";
      close.setAttribute("aria-label", "Hide the color-blindness simulator control");
    } else {
      close.title = "Close and turn Color-Blind Support off in your settings";
      close.setAttribute("aria-label", "Close and turn Color-Blind Support off");
    }
  };
  describeClose();

  supportToggle.addEventListener("change", () => {
    setSupport(supportToggle.checked, options);
    describeClose();
  });

  // Closing with the support switched off is a decision rather than a peek - you have
  // just spent a moment looking at the page without the help and chosen to leave it that
  // way - so it is saved. Doing anything else leaves the feature enabled but doing
  // nothing, which is indistinguishable from it having quietly broken.
  close.addEventListener("click", () => {
    if (!supportToggle.checked) {
      disableFeature();
    }
    badge.remove();
  });

  badge.append(supportToggle, supportLabel, label, select, close);
  document.documentElement.appendChild(badge);
}

/**
 * Switch the whole feature off in the options, as if its checkbox there had been
 * unticked.
 *
 * The simulation is reset at the same time. Otherwise turning the feature back on later
 * would land the reader on a page filtered to somebody else's color vision with no
 * explanation, which is an alarming way to be welcomed back.
 */
function disableFeature() {
  getFeatureOptions("colorBlindSupport").then((options) => {
    options.simulate = "off";
    chrome.storage.sync.set({ colorBlindSupport: false, colorBlindSupport_options: options });
  });
}

shouldInitializeFeature("colorBlindSupport").then((result) => {
  if (result) {
    getFeatureOptions("colorBlindSupport").then((options) => {
      import("./color_blind_support.css");
      setSupport(true, options);
      tagPrivacyDots(options);
      applySimulator(options);
    });
  }
});
