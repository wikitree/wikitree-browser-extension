// Small text helpers the Genie files share (2026-10-09), instead of each keeping its own copy.

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th", 11 → "11th", 22 → "22nd". */
export function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
}

/** The suffix alone: "st", "nd", "rd" or "th". */
export function ordinalSuffix(n) {
  return ordinal(n).slice(String(n).length);
}

/** Lowercase, with accents removed: "Zoë" → "zoe". */
export function foldAccents(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** foldAccents, then every run of anything but letters and digits becomes one space: "St. John's" → "st john s". */
export function plainWords(value) {
  return foldAccents(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * "a", "a and b", "a, b, and c" (the Oxford comma: the user, 2026-10-12). With max, the first few and a
 * count: "a, b, c, and 4 more".
 */
export function joinWithAnd(items, { max = Infinity } = {}) {
  const list = (items || []).filter((item) => item !== undefined && item !== null && item !== "");
  if (list.length > max) {
    const shown = list.slice(0, Math.max(1, max));
    return `${shown.join(", ")}${shown.length > 1 ? "," : ""} and ${list.length - shown.length} more`;
  }
  if (list.length <= 2) return list.join(" and ");
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

/** The year of a WikiTree date ("1788-01-00" → 1788), or null when there is none ("0000-00-00"). */
export function yearOf(value) {
  const match = String(value || "").match(/^(\d{4})/);
  return match && match[1] !== "0000" ? Number(match[1]) : null;
}

/** "George Hightower": RealName is the first name only, so add the surname at birth unless it's already there. */
export function fullName(person) {
  const name = String(person?.name || "").trim();
  const surname = String(person?.lnab || "").trim();
  if (!name) return surname || person?.wtid || "";
  if (!surname || name.toLowerCase().split(/\s+/).includes(surname.toLowerCase())) return name;
  return `${name} ${surname}`;
}
