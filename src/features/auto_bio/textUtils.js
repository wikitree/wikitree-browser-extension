/**
 * Text and string utilities for auto_bio
 */

/**
 * Capitalize the first letter of a string
 * @param {string} str - Input string
 * @returns {string} - String with first letter capitalized
 */
export function capitalizeFirstLetter(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
