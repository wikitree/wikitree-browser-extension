/**
 * Helpers for recognising WikiTree stickers in wiki text.
 *
 * This module is deliberately free of side effects and of imports from common.js, so that it can
 * be used from the vendored AGC library (and from tests) without pulling in the extension's
 * start-up code. common.js re-exports everything here, so `../../core/common` remains a valid
 * import path for these helpers.
 */

/**
 * Stickers that serve the same purpose as {{Died Young}}. If a profile already has one of
 * these, we shouldn't add a Died Young sticker on top of it.
 */
export const diedYoungStickers = ["Died Young", "Stillborn"];

/**
 * Checks whether some text (a whole biography, or a single template) already contains a
 * Died Young sticker or one of its equivalents (see {@link diedYoungStickers}).
 *
 * @param {string} text - The text to search.
 * @returns {boolean} True if an equivalent sticker is present; otherwise, false.
 */
export function hasDiedYoungSticker(text) {
  if (typeof text != "string" || !text) return false;
  return diedYoungStickers.some((sticker) => {
    // WikiTree template names are tolerant of spaces/underscores and of the case of the first letter.
    const namePattern = sticker.replace(/\s+/g, "[\\s_]+");
    return new RegExp(`\\{\\{\\s*${namePattern}\\s*(\\||\\}\\})`, "i").test(text);
  });
}
