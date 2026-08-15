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
import {
  hexToRgb,
  lightenColor,
  mixColors,
  raiseContrast,
  readableTextColor,
  rgbToHex,
} from "../../core/lib/colorUtils";
import { CONDITIONS, svgMatrixValues } from "../../core/lib/colorVision";

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
 * The same palettes for WBE's Dark Mode, whose background is #36393f.
 *
 * These are not a nicety. The colors above were darkened until they were readable on
 * white, which is exactly the wrong direction for a dark page: okabeIto's danger scores
 * 1.60:1 on #36393f and highContrast's newLink 1.03:1, which is invisible. Every value
 * here is the light palette's hue lightened back up until it clears the same bar against
 * #36393f, so the two schemes read as one palette in two lightings.
 *
 * There is a second job specific to Dark Mode. It recolors every ordinary link to
 * #ffee99, so newLink has to stay clear of a pale yellow rather than of WikiTree's green
 * - a different constraint that lands the blues brighter than a straight lightening would.
 *
 * highContrast goes to near-whites here. On a dark background that is what high contrast
 * means, and the preset was never separating its colors by hue anyway; the border styles
 * carry it, as its own note above says.
 *
 * scripts/check-palette.mjs checks both tables. Run it after touching either.
 */
const DARK_PALETTES = {
  okabeIto: { newLink: "#14ABFF", danger: "#FF85AD", warning: "#FFB000", success: "#00D6A5" },
  redGreen: { newLink: "#14ABFF", danger: "#FFADC8", warning: "#C99A2C", success: "#1F8FFF" },
  tritan: { newLink: "#F6886F", danger: "#FFB8BE", warning: "#E26F28", success: "#00D6A5" },
  highContrast: { newLink: "#DBE2F0", danger: "#F1E2DA", warning: "#FDFFCC", success: "#CCFFFF" },
};

/** WBE Dark Mode's page background, which the dark palette is measured against. */
const DARK_BACKGROUND = "#36393f";

/**
 * The conditions the simulator can show, taken from core/lib/colorVision.js so that this
 * feature and its options page - which uses the same matrices to warn about a custom
 * color pair that would converge - cannot drift apart. They are applied with
 * color-interpolation-filters="sRGB" so that the result matches what the familiar online
 * simulators show.
 *
 * Achromatopsia has no entry there because it needs no matrix: it is handled with the
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
const SIMULATION_MATRICES = Object.fromEntries(
  Object.keys(CONDITIONS).map((condition) => [condition, svgMatrixValues(condition)])
);

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
 * What the context menu item starts with when nothing is running yet. Deuteranopia is
 * the most common form of color blindness by a distance, and it is the one the member
 * who reported the red/green link problem has, so it is the right first look at a page.
 */
const MENU_LAUNCH_MODE = "deuteranopia";

/**
 * Shared state. The page-load path, the context menu item and the corner control all act
 * on the same feature rather than each reading storage and building their own idea of it.
 */
let featureOptions = null;
let featureEnabled = false;
let stylesLoaded = false;
let privacyDotsTagged = false;

/**
 * The stylesheet is needed by the corner control as well as by the cues, so the simulator
 * pulls it in even when the rest of the feature is off. That is safe: every rule in it is
 * behind a body.wbe-cb* class, and those are only added when the support is on.
 */
function loadStyles() {
  if (!stylesLoaded) {
    stylesLoaded = true;
    import("./color_blind_support.css");
  }
}

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

/** The three roles that get a box background and a text color as well as an accent. */
const BOX_ROLES = ["danger", "warning", "success"];

/**
 * Work out the custom palette's Dark Mode counterpart.
 *
 * A user picking colors is looking at WikiTree's white page, so their choices are nearly
 * always too dark for Dark Mode's #36393f - the presets had exactly this problem before
 * DARK_PALETTES existed. Each color is lightened along its own hue until it clears the
 * bar for the job it does, so a custom palette follows the user's hues into Dark Mode
 * rather than being abandoned there.
 *
 * @param {object} palette
 * @returns {object}
 */
function deriveDarkPalette(palette) {
  const background = hexToRgb(DARK_BACKGROUND);
  const derived = {};
  Object.entries(palette).forEach(([role, hex]) => {
    const rgb = hexToRgb(hex);
    // 4.5:1 for the two that are painted as text, 3:1 for the two that are only ever a
    // border or the seed for a background - the same split the presets were built to.
    const minRatio = role === "newLink" || role === "danger" ? 4.5 : 3;
    derived[role] = rgb ? rgbToHex(raiseContrast(rgb, background, minRatio)) : hex;
  });
  return derived;
}

/**
 * Publish the chosen palette on <html> as custom properties, in both lightings, and
 * derive a box background and a readable foreground for each color.
 *
 * Both schemes are published at once and the stylesheet picks between them off
 * body.darkMode, rather than this function reading that class and publishing one. Dark
 * Mode adds the class from its own async init, which can land either side of this one -
 * so anything decided here would be a coin toss. Leaving the choice to the cascade also
 * means a reader on "system" Dark Mode who changes their OS setting gets the right
 * palette immediately, with nothing here to notice or listen for.
 *
 * The light backgrounds stand in for WikiTree's own #e1f0b4 and #ffee99 box tints and are
 * mixed towards white. The dark ones are mixed towards the Dark Mode background instead:
 * a pale tint there would be a light box in a dark page, and - measured, not guessed -
 * Dark Mode's own #dedecb body text wins over ours on those boxes, which left pale text
 * on a pale background. Tinting towards the page keeps that combination readable however
 * the specificity falls.
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

  const darkPalette =
    options.paletteName === "custom"
      ? deriveDarkPalette(palette)
      : DARK_PALETTES[options.paletteName] || DARK_PALETTES.okabeIto;

  const root = document.documentElement;
  const darkBackground = hexToRgb(DARK_BACKGROUND);

  [
    { suffix: "light", colors: palette, tint: (rgb) => lightenColor(rgb, 84) },
    // 78% of the way to the page background: enough of the hue survives to tell the boxes
    // apart, without becoming a block of color in a dark page.
    { suffix: "dark", colors: darkPalette, tint: (rgb) => mixColors(rgb, darkBackground, 78) },
  ].forEach(({ suffix, colors, tint }) => {
    root.style.setProperty(`--wbe-cb-newlink-${suffix}`, colors.newLink);

    BOX_ROLES.forEach((role) => {
      const hex = colors[role];
      root.style.setProperty(`--wbe-cb-${role}-${suffix}`, hex);

      const rgb = hexToRgb(hex);
      if (!rgb) {
        // A custom color the picker somehow left unparseable: leave the -bg properties
        // unset so the stylesheet's own fallbacks apply rather than writing "undefined".
        return;
      }
      const background = tint(rgb);
      root.style.setProperty(`--wbe-cb-${role}-bg-${suffix}`, rgbToHex(background));
      root.style.setProperty(`--wbe-cb-${role}-text-${suffix}`, readableTextColor(background));

      // Text for when the accent itself is the background, which is what small solid
      // elements like badges do. This is not the same answer as -text and cannot be
      // reused from it: -text is computed for the pale tint, so pairing it with the
      // accent gives black on a dark green in the light palette, and white on a bright
      // mint in the dark one. Both are unreadable, and both shipped before this existed.
      root.style.setProperty(`--wbe-cb-${role}-on-${suffix}`, readableTextColor(rgb));
    });
  });
}

/**
 * Every custom property applyPalette sets, so that turning the support off again can
 * remove exactly what was added and no more.
 */
const PALETTE_PROPERTIES = ["light", "dark"].flatMap((suffix) => [
  `--wbe-cb-newlink-${suffix}`,
  ...BOX_ROLES.flatMap((role) => [
    `--wbe-cb-${role}-${suffix}`,
    `--wbe-cb-${role}-bg-${suffix}`,
    `--wbe-cb-${role}-text-${suffix}`,
    `--wbe-cb-${role}-on-${suffix}`,
  ]),
]);

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
    loadStyles();
    applyPalette(options);
    document.body.classList.add(...cueClassesFor(options));
    // Ticking the checkbox has to bring the privacy numbers with it, so the tagging pass
    // belongs here rather than at startup: switching the support on mid-page is otherwise
    // the one route that leaves the dots unlabelled.
    tagPrivacyDots(options);
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
  if (options.privacyCue === "none" || privacyDotsTagged) {
    return;
  }
  privacyDotsTagged = true;

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
 * The obvious fix for that does not work, and the way it fails is worth knowing about
 * before trying it. A fixed full-viewport overlay with backdrop-filter: url(#...) filters
 * the page without becoming a containing block, and in Chromium it works perfectly -
 * measured: the sticky header stays put and the colors are transformed. Firefox reports
 * CSS.supports("backdrop-filter", "url(#f)") === true and then paints nothing at all. So
 * there is no way to tell the two apart before committing to it, and the failure is a
 * simulator that quietly shows an unfiltered page while the control claims a condition -
 * which is worse than a sticky header that scrolls. Do not swap this over.
 *
 * @param {string} mode - a key of SIMULATION_ORDER.
 */
function setSimulation(mode) {
  if (mode === "off") {
    document.body.style.filter = "";
    return;
  }
  if (mode === "achromatopsia") {
    // The browser's own greyscale, not a matrix of ours - see SIMULATION_MATRICES.
    document.body.style.filter = "grayscale(1)";
  } else if (SIMULATION_MATRICES[mode]) {
    ensureFilterDefs();
    document.body.style.filter = `url(#wbe-cb-${mode})`;
  }
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
    featureOptions = options;
    chrome.storage.sync.set({ colorBlindSupport_options: options });
  });
}

/**
 * Start, or switch, the simulation on this page and show the control that goes with it.
 *
 * @param {string} mode
 */
function showSimulator(mode) {
  loadStyles();
  setSimulation(mode);
  // Rebuilt rather than updated: the control holds no state of its own worth keeping,
  // and this way a second launch from the context menu brings it back if it was closed.
  document.getElementById("wbeColorBlindSimulatorBadge")?.remove();
  addSimulatorPicker(mode);
}

function applySimulator(options) {
  const mode = normalizeMode(options.simulate);
  if (mode === "off") {
    return;
  }
  showSimulator(mode);
}

/**
 * The context menu item.
 *
 * Deliberately independent of whether the feature itself is switched on. The simulator is
 * a checking tool - the cheap way to find out which distinctions on a page survive - and
 * making people first enable a remediation feature they may not need for themselves would
 * put that behind a door most reviewers would never open. What they get is the simulation
 * and the control; the remediation stays off until its checkbox says otherwise.
 *
 * Launching while a simulation is already running re-shows the control rather than
 * changing the mode, since that is the only way back to it once it has been closed.
 */
function launchSimulatorFromMenu() {
  const running = normalizeMode(featureOptions.simulate);
  const mode = running === "off" ? MENU_LAUNCH_MODE : running;
  showSimulator(mode);
  if (mode !== running) {
    persistSimulation(mode);
  }
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
 */
function addSimulatorPicker(mode) {
  const options = featureOptions;
  const badge = document.createElement("div");
  badge.id = "wbeColorBlindSimulatorBadge";

  const supportToggle = document.createElement("input");
  supportToggle.type = "checkbox";
  supportToggle.id = "wbeColorBlindSupportToggle";
  // Starts wherever the feature itself stands, so the box always says what is true. It is
  // unchecked for a simulation started from the context menu with the feature switched off.
  supportToggle.checked = featureEnabled;

  const supportLabel = document.createElement("label");
  supportLabel.setAttribute("for", "wbeColorBlindSupportToggle");
  supportLabel.textContent = "Support";
  supportLabel.title =
    "Whether Color-Blind Support's colors and cues are applied to this page. Change it to " +
    "compare the page with and without them; close this control to keep the change.";

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

  // What the close button does depends on the checkbox, so say which it will be. Left as
  // it was found it is a plain dismiss; changed, it commits the change.
  const describeClose = () => {
    if (supportToggle.checked === featureEnabled) {
      close.title = "Hide this control and stay in the current mode";
      close.setAttribute("aria-label", "Hide the color-blindness simulator control");
    } else if (supportToggle.checked) {
      close.title = "Close and turn Color-Blind Support on in your settings";
      close.setAttribute("aria-label", "Close and turn Color-Blind Support on");
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

  // The saved state can also change from another tab, in which case the storage listener
  // below moves the checkbox for us and the close button's promise has to be redescribed.
  supportToggle.addEventListener("wbe-cb-refresh", describeClose);

  // Moving the checkbox and then closing is a decision rather than a peek - you have just
  // spent a moment looking at the page the other way and chosen to leave it like that - so
  // it is saved. Anything else would leave the feature switched on but doing nothing, or a
  // fix you had just seen working quietly thrown away.
  close.addEventListener("click", () => {
    if (supportToggle.checked !== featureEnabled) {
      saveFeatureEnabled(supportToggle.checked);
    }
    badge.remove();
  });

  badge.append(supportToggle, supportLabel, label, select, close);
  document.documentElement.appendChild(badge);
}

/**
 * Switch the whole feature on or off in the options, as if its checkbox there had been
 * ticked or unticked.
 *
 * Switching it off ends the simulation as well, on this page and in the stored options.
 * A feature that is off has no business filtering pages, and once its control is gone
 * there would be nothing left on screen to switch the filter back off with.
 *
 * @param {boolean} on
 */
function saveFeatureEnabled(on) {
  featureEnabled = on;
  const options = { ...featureOptions };
  if (!on) {
    options.simulate = "off";
    setSimulation("off");
  }
  featureOptions = options;
  chrome.storage.sync.set({ colorBlindSupport: on, colorBlindSupport_options: options });
}

/**
 * Keep this tab's idea of whether the feature is on in step with what is actually saved.
 *
 * Every other WBE feature reads its settings once and waits for a reload, and this one
 * does too for the colors and cues - repainting a page mid-read would be worse than
 * leaving it. What is tracked here is only the enabled flag, because the corner control
 * writes it and a stale copy does real damage rather than merely looking out of date:
 * switch the feature off from the control in one tab, and a second tab still holding
 * `featureEnabled === true` would treat its own ticked checkbox as unchanged, then write
 * `true` straight back when its control was closed. The decision would be silently undone
 * by a tab the reader had forgotten about.
 *
 * The checkbox on screen is corrected too, so it never claims a state that is not saved.
 */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes.colorBlindSupport) {
    return;
  }
  featureEnabled = Boolean(changes.colorBlindSupport.newValue);

  const toggle = document.getElementById("wbeColorBlindSupportToggle");
  if (toggle && toggle.checked !== featureEnabled) {
    toggle.checked = featureEnabled;
    setSupport(featureEnabled, featureOptions);
    toggle.dispatchEvent(new Event("wbe-cb-refresh"));
  }
});

// Read once, up front, whatever is going to happen: the context menu can ask for the
// simulator at any moment, and it needs the same options and the same idea of whether the
// feature is on as the page-load path has.
const featureReady = Promise.all([
  shouldInitializeFeature("colorBlindSupport"),
  getFeatureOptions("colorBlindSupport"),
]).then(([enabled, options]) => {
  featureEnabled = Boolean(enabled);
  featureOptions = options;

  if (featureEnabled) {
    setSupport(true, options);
    applySimulator(options);
  } else if (normalizeMode(options.simulate) !== "off") {
    // A simulation started from the context menu with the feature switched off. It carries
    // from page to page like any other, because checking one page at a time is not how
    // anyone reviews a site - but it brings only the filter and the control, no cues.
    applySimulator(options);
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "showColorBlindSimulator") {
    featureReady.then(launchSimulatorFromMenu);
  }
});
