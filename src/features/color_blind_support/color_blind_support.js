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
  contrastRatio,
  hexToRgb,
  reachContrast,
  tintTowards,
  parseCssColor,
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

/** The contrast each role has to clear against whatever the page background turns out to be. */
const ROLE_MIN_CONTRAST = { newLink: 4.5, danger: 4.5, warning: 3, success: 3 };

/**
 * The page's effective background colour.
 *
 * Both palettes are measured against an assumed background - white, or Dark Mode's
 * #36393f - and that assumption is not safe. Custom Style has a Background color picker,
 * so a reader can set the page to anything without Dark Mode being involved at all, and
 * then the light palette is being painted on a dark page: measured, okabeIto's danger is
 * 1.05:1 on a #5a5a5a page. Invisible.
 *
 * Walks up from <body> because a page background is as often on <html>, and because
 * parseCssColor returns null for a transparent element rather than reporting black.
 *
 * @returns {number[]} rgb, defaulting to white when nothing sets a background.
 */
function pageBackground() {
  for (const element of [document.body, document.documentElement]) {
    const background = parseCssColor(getComputedStyle(element).backgroundColor);
    if (background) {
      return background;
    }
  }
  return [255, 255, 255];
}

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
 * The fallback the menu's "Open" entry starts with when nothing is running and no launch
 * default has been saved. Deuteranopia is the most common form of color blindness by a
 * distance, and it is the one the member who reported the red/green link problem has, so
 * it is the right first look at a page. The reader can change it in the options, and pick
 * any condition directly from the menu's submenu.
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
let familyGroupsTagged = false;

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
 * How visible each message box should be against the page it sits on.
 *
 * These are WikiTree's own numbers, measured: #ffcccc, #ffee99 and #e1f0b4 come out at
 * 1.42:1, 1.17:1 and 1.21:1 on a white page. Aiming at them means a custom palette
 * produces boxes with the same weight, and the same order - the error box the heaviest of
 * the three - as the ones WikiTree ships.
 *
 * A target, not an amount of mixing, and that distinction is the whole point. The previous
 * rule lightened every accent by a fixed 84%, which assumes the accent is dark. It is a
 * reasonable assumption for the presets and wrong for a reader who reads "Error color",
 * picks the pale red WikiTree already uses for the error box, and gets that pale red
 * lightened again into #fff7f7 - a 1.06:1 box, which is no box at all. Aimed at a ratio,
 * the same pick is already at 1.42:1 and is left exactly as it is.
 */
const BOX_TINT_TARGET = { danger: 1.42, warning: 1.17, success: 1.21 };

/** The light page every palette is picked against, and measured against. */
const WHITE = [255, 255, 255];

/**
 * The palette value that means "keep WikiTree's own colors".
 *
 * The shape cues are unaffected by it. Color and shape are separate jobs here: the palette
 * decides what things are colored, the cue options decide what shape they are, and a
 * reader who is happy with WikiTree's colors but wants the shapes should not have to give
 * up one to get the other.
 */
const NO_PALETTE = "none";

/**
 * Publish nothing, which is how "do nothing" is done.
 *
 * Every rule that reads one of these writes it as `var(--wbe-cb-thing, <WikiTree's own
 * value>)`, so removing the properties hands each element straight back to the color it
 * had. That matters most for the consumers this file cannot reach: Date Fixer, Text
 * Expander, Locations Helper and WikiTree+ read `--wbe-cb-danger` from their own
 * stylesheets, and no body class here could switch those off.
 *
 * Verified rather than assumed, because it looks like it should not work: the stylesheet
 * aliases `--wbe-cb-danger: var(--wbe-cb-danger-light)`, so the property is still declared
 * after the -light one is removed. An alias resolving to an unset property becomes the
 * guaranteed-invalid value, and `var()` treats that exactly as it treats an undeclared
 * property - the fallback is used. Checked in Chrome.
 *
 * The page-background probe still runs. It is not part of the palette: it publishes what
 * the background actually is, which is what the visited-link cue paints its off state in,
 * and that cue is a shape and stays available with no palette at all.
 *
 * @param {HTMLElement} root
 */
function clearPalette(root) {
  PALETTE_PROPERTIES.forEach((property) => root.style.removeProperty(property));
  adaptToPageBackground();
}

/**
 * The links the visited-link cue applies to. This MUST stay in step with the selector the
 * visited rules use in color_blind_support.css - the stylesheet decides where the mark is
 * drawn, and this decides where its off-state colour gets measured. Out of step, the mark
 * is drawn in the wrong background colour and shows on links that were never visited.
 */
const VISITED_CUE_SELECTOR = ":is(.qa-q-item-title, table.table--data td, .body-text, #Categories) a";

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
 * A preset and a Custom palette are read in opposite directions, and this is the one
 * place that difference lives.
 *
 * A PRESET is a set of accents. Okabe-Ito's #B0003A was chosen to stay apart from the
 * others as ink, and painting it straight onto a message box would make a solid dark
 * block where WikiTree has a pale one. So the box tint is derived from it.
 *
 * A CUSTOM color is the box. The reader picked it under a label that names a message box,
 * looking at a page where that box is pale, so it is used exactly as picked and the INK is
 * what gets derived - darkened until it is readable as error text. This is the way round
 * that keeps the promise the label makes. It also fails better: darkening a pale color to
 * reach a contrast target always arrives, whereas lightening a pale one to make a tint
 * lands on the page and disappears.
 *
 * Whichever direction it came from, the text ON the box is computed from the box, never
 * assumed. That is what lets a Custom pick be honoured whatever it is: pick a pale pink and
 * the box is pale pink with dark text; pick a deep crimson and it is deep crimson with pale
 * text. The color is never overruled to keep the text readable - the text moves instead.
 *
 * The dark scheme is mixed towards the Dark Mode background rather than towards white: a
 * pale tint there would be a light box in a dark page, and - measured, not guessed - Dark
 * Mode's own #dedecb body text wins over ours on those boxes, which left pale text on a
 * pale background. Tinting towards the page keeps that combination readable however the
 * specificity falls.
 *
 * Both schemes are published at once; see the note above about Dark Mode's async init.
 *
 * @param {object} options
 */
function applyPalette(options) {
  const root = document.documentElement;

  if (options.paletteName === NO_PALETTE) {
    clearPalette(root);
    return;
  }

  const custom = options.paletteName === "custom";
  const palette = custom
    ? {
        newLink: options.newLinkColor,
        danger: options.dangerColor,
        warning: options.warningColor,
        success: options.successColor,
      }
    : PALETTES[options.paletteName] || PALETTES.okabeIto;

  const darkPalette = custom
    ? deriveDarkPalette(palette)
    : DARK_PALETTES[options.paletteName] || DARK_PALETTES.okabeIto;

  const darkBackground = hexToRgb(DARK_BACKGROUND);

  // The new-link color has no box anywhere. It is ink in both palettes and both lightings,
  // and is used exactly as it comes.
  root.style.setProperty("--wbe-cb-newlink-light", palette.newLink);
  root.style.setProperty("--wbe-cb-newlink-dark", darkPalette.newLink);

  /**
   * @param {string} suffix - "light" or "dark".
   * @param {string} role
   * @param {number[]} box - what the message box is filled with.
   * @param {number[]} ink - what is painted as text, and as a solid badge.
   */
  const publish = (suffix, role, box, ink) => {
    root.style.setProperty(`--wbe-cb-${role}-${suffix}`, rgbToHex(ink));
    root.style.setProperty(`--wbe-cb-${role}-bg-${suffix}`, rgbToHex(box));
    root.style.setProperty(`--wbe-cb-${role}-text-${suffix}`, readableTextColor(box));
    // Text for when the ink itself is the background. Nothing in this feature paints an
    // ink as a fill any more - the solid badges did, and were dropped - but the pairing is
    // published because any WBE feature that puts a role colour behind text needs it, and
    // it is not the same answer as -text and cannot be reused from it: -text is computed
    // for the box, so pairing it with the ink gives black on a dark green in the light
    // palette, and white on a bright mint in the dark one. Both unreadable, both shipped
    // before this existed.
    root.style.setProperty(`--wbe-cb-${role}-on-${suffix}`, readableTextColor(ink));
  };

  BOX_ROLES.forEach((role) => {
    const picked = hexToRgb(palette[role]);
    const darkAccent = hexToRgb(darkPalette[role]);
    if (!picked || !darkAccent) {
      // A custom color the picker somehow left unparseable: leave every property for the
      // role unset so the stylesheet's own fallbacks apply rather than writing "undefined".
      return;
    }
    const target = BOX_TINT_TARGET[role];
    const minRatio = ROLE_MIN_CONTRAST[role];

    // Light: the two directions. Custom hands back exactly what was picked and derives the
    // ink; a preset hands back its accent and derives the box.
    publish(
      "light",
      role,
      custom ? picked : tintTowards(picked, WHITE, target),
      custom ? reachContrast(picked, WHITE, minRatio) : picked
    );

    // Dark: the box is always tinted, because nothing here was picked against a dark page
    // and a color that is a box on white is a light block on #36393f. For a custom palette
    // the tint starts from what the reader picked, so their hue carries over rather than
    // being read off the lightened accent. The ink is the dark accent either way - for a
    // custom palette that is the pick raised until it is readable there.
    publish("dark", role, tintTowards(custom ? picked : darkAccent, darkBackground, target), darkAccent);
  });

  adaptToPageBackground();
}

/**
 * Make the palette fit the background the page actually has, rather than the one it was
 * measured against.
 *
 * Two things happen here, and they are separate. First, a dark page gets the dark palette
 * even when Dark Mode is not what made it dark - Custom Style's Background color picker
 * does the same thing with no class to key off. Second, whichever palette that lands on
 * is checked against the real background and lightened where it falls short, because a
 * reader is free to choose a mid grey that suits neither table.
 *
 * Only the accent colours are adjusted. The tints and their text colours are derived from
 * each other, so they stay readable wherever they are painted.
 */
function adaptToPageBackground() {
  const background = pageBackground();
  const root = document.documentElement;

  // Dark enough that the light palette would be painted on a dark page.
  const isDarkPage = contrastRatio(background, [255, 255, 255]) > contrastRatio(background, [0, 0, 0]);
  document.body.classList.toggle("wbe-cb-dark-page", isDarkPage);

  // The visited-link cue needs the real background, not an assumed white: its off state
  // is a mark painted the same colour as the page, and `transparent` will not do - see
  // the visited-links section of the README. Published here rather than with the palette
  // because this is the only place that measures what the background actually is.
  root.style.setProperty("--wbe-cb-page-bg", rgbToHex(background));

  const suffix = isDarkPage ? "dark" : "light";
  ["newLink", ...BOX_ROLES].forEach((role) => {
    const property = role === "newLink" ? `--wbe-cb-newlink-${suffix}` : `--wbe-cb-${role}-${suffix}`;
    const current = hexToRgb(root.style.getPropertyValue(property).trim());
    if (!current) {
      return;
    }
    const minRatio = ROLE_MIN_CONTRAST[role];
    if (contrastRatio(current, background) >= minRatio) {
      return;
    }
    // On a dark page the fix is to lighten; on a light one there is nothing useful to do,
    // since these are already as dark as they can be without becoming black, and a reader
    // who has chosen an unusual light background is not being made unreadable by it.
    if (isDarkPage) {
      root.style.setProperty(property, rgbToHex(raiseContrast(current, background, minRatio)));
    }
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
  const classes = [
    "wbe-cb",
    `wbe-cb-newlink-${options.newLinkCue}`,
    `wbe-cb-privacy-${options.privacyCue}`,
    // Options saved before this cue existed have no familyCue; pattern is its default.
    `wbe-cb-family-${options.familyCue || "pattern"}`,
    // Likewise visitedCue, whose default is off - it marks every visited link on the
    // page, which is a bigger change than the other cues and wants to be asked for.
    `wbe-cb-visited-${options.visitedCue || "none"}`,
    // And badgeCue. "both" is its default because that is what the badges did before the
    // option existed: the fill was recoloured whenever the feature was on, and the border
    // came with the status cue.
    `wbe-cb-badges-${options.badgeCue || "both"}`,
  ];

  // Gates every rule that paints a palette color. Removing the custom properties alone is
  // not enough: each of those rules falls back to WikiTree's own value and would repaint
  // it with !important, which would then win over a color the reader had set in Custom
  // Style. With the palette off, the rules must not match at all.
  if (options.paletteName !== NO_PALETTE) {
    classes.push("wbe-cb-palette");
  }

  classes.push(`wbe-cb-gender-${options.genderCue}`);
  if (options.statusCue) {
    classes.push("wbe-cb-status");
  }
  // The recolour of new/unknown links is separate from the shape cue on them, so that a
  // reader who sets their own link colours can keep the shape and drop the colour. It
  // defaults on, and options saved before it existed have no value for it.
  if (options.newLinkRecolor !== false) {
    classes.push("wbe-cb-newlink-recolor");
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
    tagFamilyGroups(options);
    markLocalBackgrounds(options);
  } else {
    PALETTE_PROPERTIES.forEach((property) => document.documentElement.style.removeProperty(property));
    document.body.classList.remove(...cueClassesFor(options));
  }
}

/**
 * The visited-link mark hides its off state by painting itself the colour of the page.
 * That assumes the link sits on the page's own background, and plenty do not: WikiTree
 * gives the profile's Categories box a pale green of its own (measured: rgb(225,240,180)
 * against a white body), and the stickers inside a biography have their own fills too. On
 * those, an off state painted page-white draws a visible white line under every link the
 * reader has NOT visited - the exact opposite of what the cue is for.
 *
 * So the background is measured where the link actually is. For each link the cue applies
 * to, walk up to the nearest ancestor that paints something, and publish that colour as
 * --wbe-cb-local-bg on that ancestor; the property inherits, so one write covers every
 * link inside it. Custom Style and Dark Mode need no special handling here - this reads
 * computed style, so whatever they have painted by then is what gets measured, including
 * on boxes neither of them knows about.
 *
 * @param {object} options
 */
function markLocalBackgrounds(options) {
  if ((options.visitedCue || "none") === "none") {
    return;
  }

  const seen = new Set();
  document.querySelectorAll(VISITED_CUE_SELECTOR).forEach((link) => {
    for (let element = link.parentElement; element; element = element.parentElement) {
      const background = parseCssColor(getComputedStyle(element).backgroundColor);
      if (!background) {
        continue;
      }
      if (!seen.has(element)) {
        seen.add(element);
        element.style.setProperty("--wbe-cb-local-bg", rgbToHex(background));
      }
      return;
    }
  });
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
 * Copy the family group number onto a data attribute so that CSS can print it.
 *
 * Change Family Lists puts spouse_1 ... spouse_51 on the people in a blended family and
 * gives each a colour down the right hand edge, which is how a reader sees which children
 * go with which parent. Fifty-one colours means no two can be far apart, and none of it
 * survives grayscale - it is the clearest case in this whole feature of colour carrying
 * something entirely on its own.
 *
 * The classes are added and removed as that feature redraws its lists - it strips every
 * spouse_ class before reassigning them - so this watches the class attribute as well as
 * added nodes, and clears the attribute again when the class goes.
 *
 * @param {object} options
 */
function tagFamilyGroups(options) {
  if (options.familyCue === "none" || familyGroupsTagged) {
    return;
  }
  familyGroupsTagged = true;

  const tag = (element) => {
    // SVG elements have an object here rather than a string, hence the typeof check.
    const names = typeof element.className === "string" ? element.className : "";
    const match = /(?:^|\s)spouse_(\d+)(?:\s|$)/.exec(names);
    if (match) {
      element.setAttribute("data-wbe-family", match[1]);
    } else if (element.hasAttribute("data-wbe-family")) {
      element.removeAttribute("data-wbe-family");
    }
  };

  /**
   * The other half of the connection, and a different shape of problem.
   *
   * Siblings are joined to parents rather than to spouses, and the two lines are marked
   * separately: parent_1 (the father's line) goes on the sibling's <li>, parent_2 (the
   * mother's) on the span[itemprop='sibling'] inside it. Both together is a full sibling,
   * one alone is a half sibling on that side. Reading them off two elements and writing
   * one combined value onto the row keeps the marker in one place, and in a sensible
   * order - taking them where they fall would print the mother's line before the father's.
   *
   * Marked only when the list actually mixes: if every sibling shares both parents there
   * is no distinction to point at, and numbering all of them "1,2" would be noise.
   */
  const tagSiblings = (list) => {
    const seen = new Set();
    list.querySelectorAll("li").forEach((row) => {
      const inner = row.querySelector("span[itemprop='sibling']");
      const names = [row, inner]
        .map((element) => (element && typeof element.className === "string" ? element.className : ""))
        .join(" ");
      const lines = ["1", "2"].filter((line) =>
        new RegExp(`(?:^|\\s)parent_${line}(?:_pid[^\\s]*)?(?=\\s|$)`).test(names)
      );
      // On the inner span rather than the row when there is one: the row's content is
      // laid out as a block, so a marker on the row drops onto a line of its own instead
      // of sitting after the name.
      const target = inner || row;
      [row, inner].forEach((element) => element?.removeAttribute("data-wbe-parents"));
      if (lines.length) {
        target.setAttribute("data-wbe-parents", lines.join(","));
        seen.add(lines.join(","));
      }
    });
    list.classList.toggle("wbe-cb-mixed-parents", seen.size > 1);
  };

  const tagWithin = (root) => {
    if (root.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    tag(root);
    root.querySelectorAll?.('[class*="spouse_"]').forEach(tag);

    const siblings = root.closest?.("#siblingList") || root.querySelector?.("#siblingList");
    if (siblings) {
      tagSiblings(siblings);
    }
  };

  tagWithin(document.body);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") {
        tag(mutation.target);
        return;
      }
      mutation.addedNodes.forEach(tagWithin);
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
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
 * The plain "Open" entry, with no mode, re-shows a running simulation rather than changing
 * it - that is the only way back to the control once it has been closed - or starts on the
 * saved launch default. A specific condition chosen from the submenu overrides whatever is
 * running: the reader asked to see that one.
 *
 * @param {string} [requestedMode] - a condition picked from the submenu, or nothing for the
 *   default "Open" entry.
 */
function launchSimulatorFromMenu(requestedMode) {
  const running = normalizeMode(featureOptions.simulate);
  const picked = normalizeMode(requestedMode);
  const mode =
    requestedMode && picked !== "off" ? picked : running === "off" ? menuLaunchMode() : running;
  showSimulator(mode);
  if (mode !== running) {
    persistSimulation(mode);
  }
}

/**
 * The condition the menu's "Open" entry starts with, from the saved options. Guarded so a
 * value that is missing, invalid or "off" falls back to the sensible first look rather than
 * opening the simulator showing the page's real colors, which is no simulation at all.
 *
 * @returns {string}
 */
function menuLaunchMode() {
  const saved = normalizeMode(featureOptions.menuLaunchMode);
  return saved === "off" ? MENU_LAUNCH_MODE : saved;
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
    // Custom Style and Dark Mode inject their <style> from their own async init, which can
    // land after this one. The first measurement above may therefore have read WikiTree's
    // white before the reader's own background was applied, so take it again once things
    // have settled. Cheap, and it is the difference between fitting the page and guessing.
    setTimeout(() => {
      adaptToPageBackground();
      // The per-box backgrounds need the same second look, and for the same reason: the
      // first pass may have measured WikiTree's own colours before Custom Style repainted
      // them.
      markLocalBackgrounds(options);
    }, 1200);
  } else if (normalizeMode(options.simulate) !== "off") {
    // A simulation started from the context menu with the feature switched off. It carries
    // from page to page like any other, because checking one page at a time is not how
    // anyone reviews a site - but it brings only the filter and the control, no cues.
    applySimulator(options);
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "showColorBlindSimulator") {
    featureReady.then(() => launchSimulatorFromMenu(request.mode));
  }
});
