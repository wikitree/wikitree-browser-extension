// Accents, hyphens and other alphabets in IDs and names ("Lefèvre-123's fan chart", "Saint-Pierre-12",
// "Hélène's mother"): most of the router's patterns are ASCII ([A-Z][a-z]…), so a third of the tested
// prompts fell to "We need AI" for them (Anne, on her French grandfather, 2026-10-12). Rather than widen
// every pattern, the router sees plain stand-ins ("Wbeidaa-123", "Wbewaa") and the originals go back into
// what it returns.
const MASK_ID_RE = /(^|[^\p{L}\p{M}'_-])([\p{L}\p{M}'_]+(?:-[\p{L}\p{M}'_]+)*-\d+)/gu;
const MASK_WORD_RE = /[\p{L}\p{M}]+/gu;
const NON_ASCII_RE = /[^\x00-\x7F]/;

export function maskAccentedTokens(prompt) {
  const text = String(prompt ?? "").normalize("NFC");
  const originals = new Map();
  let count = 0;
  const code = () => {
    const n = count++;
    return String.fromCharCode(97 + Math.floor(n / 26) % 26) + String.fromCharCode(97 + (n % 26));
  };
  let masked = text.replace(MASK_ID_RE, (all, before, id) => {
    const surname = id.replace(/-\d+$/, "");
    if (!NON_ASCII_RE.test(surname) && !surname.includes("-")) return all;
    const key = `wbeid${code()}`;
    originals.set(key, surname);
    return `${before}${key[0].toUpperCase()}${key.slice(1)}${id.slice(surname.length)}`;
  });
  masked = masked.replace(MASK_WORD_RE, (word) => {
    if (!NON_ASCII_RE.test(word)) return word;
    const key = `wbew${code()}`;
    originals.set(key, word);
    return /^\p{Lu}/u.test(word) ? key[0].toUpperCase() + key.slice(1) : key;
  });
  if (!originals.size) return { text, restore: null };
  const restoreString = (value) => value.replace(/wbe(?:id|w)[a-z]{2}/gi, (key) => originals.get(key.toLowerCase()) ?? key);
  const restore = (value) => {
    if (typeof value === "string") return restoreString(value);
    if (Array.isArray(value)) return value.map(restore);
    if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restore(item)]));
    }
    return value;
  };
  return { text: masked, restore };
}

/** fn's answer for the prompt, read with its accented words masked and put back afterwards. */
export function withAccentsMasked(prompt, fn) {
  const { text, restore } = maskAccentedTokens(prompt);
  return restore ? restore(fn(text)) : fn(prompt);
}
