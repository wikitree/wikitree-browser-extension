/*
Created By: Ian Beacall (Beacall-6)

Color vision deficiency simulation, shared between the Color-Blind Support feature (which
turns these into SVG filters to recolor a whole page) and its options page (which uses
them to check that two colors a user has picked will still look different to the reader
they are picking them for).

Note that scripts/check-palette.mjs deliberately keeps its own copy of the matrices rather
than importing this file: it runs under plain node, where this package's .js files are
CommonJS and these ESM exports are not loadable. If you change a matrix here, change it
there too - the script's job is to be the thing that catches that.
*/

/**
 * The widely used linear approximations (Wickline / Viénot), as 3x3 row-major matrices.
 *
 * There is no achromatopsia entry. Complete achromatopsia is rod monochromacy and no
 * 3x3 matrix models it honestly; the feature uses the browser's own grayscale() for that,
 * which at least uses the right (Rec.709) luminance model for sRGB. See the note in
 * color_blind_support.js.
 */
export const CONDITIONS = {
  deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
  protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
  tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
};

/**
 * Show a color as a reader with the given condition sees it.
 *
 * @param {number[]} rgb
 * @param {string} condition - a key of CONDITIONS.
 * @returns {number[]}
 */
export function simulateColor(rgb, condition) {
  const matrix = CONDITIONS[condition];
  if (!matrix) {
    return rgb;
  }
  return [0, 3, 6].map((row) =>
    Math.max(0, Math.min(255, Math.round(matrix[row] * rgb[0] + matrix[row + 1] * rgb[1] + matrix[row + 2] * rgb[2])))
  );
}

/**
 * The same matrix as the 20-value string an SVG feColorMatrix wants.
 *
 * @param {string} condition - a key of CONDITIONS.
 * @returns {string}
 */
export function svgMatrixValues(condition) {
  const matrix = CONDITIONS[condition];
  return [
    matrix.slice(0, 3).join(" ") + " 0 0",
    matrix.slice(3, 6).join(" ") + " 0 0",
    matrix.slice(6, 9).join(" ") + " 0 0",
    "0 0 0 1 0",
  ].join("  ");
}

/**
 * sRGB to CIE Lab.
 *
 * @param {number[]} rgb
 * @returns {number[]} [L, a, b]
 */
export function toLab(rgb) {
  const linear = rgb
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)));
  const [x, y, z] = [
    (0.4124 * linear[0] + 0.3576 * linear[1] + 0.1805 * linear[2]) / 0.95047,
    0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2],
    (0.0193 * linear[0] + 0.1192 * linear[1] + 0.9505 * linear[2]) / 1.08883,
  ].map((channel) => (channel > 0.008856 ? Math.cbrt(channel) : 7.787 * channel + 16 / 116));
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/**
 * How different two colors look, as CIE76 dE. Around 25 is a clear step; below about 10
 * most people would call them the same color.
 *
 * Euclidean distance in RGB - which is what colorDistance in colorUtils does, for the
 * different job of "is this the same color as that" - would answer this question badly:
 * it weights the channels as the file format happens to store them, not as an eye sees
 * them.
 *
 * @param {number[]} rgb1
 * @param {number[]} rgb2
 * @returns {number}
 */
export function perceptualDistance(rgb1, rgb2) {
  const [l1, a1, b1] = toLab(rgb1);
  const [l2, a2, b2] = toLab(rgb2);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}
