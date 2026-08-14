/*
Shared colour maths.

These started life as private methods on the CustomStyle class in
features/custom_style/custom_style.js. They were pulled out when a second feature
(Color-Blind Support) needed the same contrast checks, so that both features agree
on what "readable" means rather than each carrying its own copy.

RGB is represented throughout as a plain [r, g, b] array of 0-255 numbers, which is
what hexToRgb returns.
*/

/**
 * Parse a CSS hex colour into [r, g, b].
 *
 * @param {string} hex - "#rrggbb" or "rrggbb".
 * @returns {number[]|null} [r, g, b], or null if the string is not a 6-digit hex colour.
 */
export function hexToRgb(hex) {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
}

/**
 * Format [r, g, b] as an uppercase "#RRGGBB" string.
 *
 * @param {number[]} rgb
 * @returns {string}
 */
export function rgbToHex(rgb) {
  return "#" + ((1 << 24) | (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]).toString(16).slice(1).toUpperCase();
}

/**
 * Parse an rgb()/rgba() string as produced by getComputedStyle into [r, g, b].
 * Fully transparent colours return null, so callers walking up the DOM for an
 * effective background keep looking rather than stopping at a see-through element.
 *
 * @param {string} color
 * @returns {number[]|null}
 */
export function parseCssColor(color) {
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(color || "");
  if (!match) {
    return null;
  }
  if (match[4] !== undefined && parseFloat(match[4]) === 0) {
    return null;
  }
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

/**
 * Perceived-brightness test (the classic 299/587/114 weighting), used to decide
 * whether black or white text sits better on a colour. This is not the same as the
 * WCAG relative luminance used by contrastRatio, and deliberately so: it matches
 * what Custom Style has always done.
 *
 * @param {number[]} rgb
 * @returns {boolean} true when the colour is light enough to want dark text.
 */
export function isLight(rgb) {
  const brightness = Math.round((parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000);
  return brightness > 155;
}

/**
 * WCAG 2.x contrast ratio between two colours, from 1 (identical) to 21
 * (black on white). 4.5 is the AA threshold for body text.
 *
 * @param {number[]} rgb1
 * @param {number[]} rgb2
 * @returns {number}
 */
export function contrastRatio(rgb1, rgb2) {
  const luminance = (rgb) => {
    let a = rgb.map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  let l1 = luminance(rgb1) + 0.05;
  let l2 = luminance(rgb2) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

/**
 * Straight-line distance in RGB space. Crude as a measure of perceived difference,
 * but adequate for "are these two colours effectively the same".
 *
 * @param {number[]} rgb1
 * @param {number[]} rgb2
 * @returns {number}
 */
export function colorDistance(rgb1, rgb2) {
  return Math.sqrt((rgb1[0] - rgb2[0]) ** 2 + (rgb1[1] - rgb2[1]) ** 2 + (rgb1[2] - rgb2[2]) ** 2);
}

/**
 * Darken a colour by a percentage of each channel.
 *
 * @param {number[]} rgb
 * @param {number} percent - 0-100.
 * @returns {number[]}
 */
export function darkenColor(rgb, percent) {
  return rgb.map((value) => Math.round(value * (1 - percent / 100)));
}

/**
 * Mix a colour towards white. Used to derive the pale banner backgrounds that go
 * with a chosen accent colour, in the spirit of WikiTree's own #e1f0b4 / #ffee99.
 *
 * @param {number[]} rgb
 * @param {number} percent - 0-100; 100 is white.
 * @returns {number[]}
 */
export function lightenColor(rgb, percent) {
  return rgb.map((value) => Math.round(value + (255 - value) * (percent / 100)));
}

/**
 * Pick black or white, whichever is more readable on the given background.
 *
 * @param {number[]} backgroundRgb
 * @returns {string} "#000000" or "#ffffff".
 */
export function readableTextColor(backgroundRgb) {
  return isLight(backgroundRgb) ? "#000000" : "#ffffff";
}
