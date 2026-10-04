// Person lines in chat answers (live C2/D2, 2026-10-03: "Arthur Edmond (Bloomfield-1331) [b. 1880-00-00]").

/** "1835-00-00" → "1835", "1835-03-00" → "1835-03"; anything else unchanged. */
export function formatPreviewDate(value) {
  return String(value || "")
    .trim()
    .replace(/^(\d{4})-00-00$/, "$1")
    .replace(/^(\d{4}-\d{2})-00$/, "$1");
}

/** A first-name-only display name gains its surnames: "Ellen (Cook) Alley". */
export function formatPreviewName(person) {
  const name = String(person?.displayName || "").trim();
  const lnab = String(person?.lnab || "").trim();
  const current = String(person?.lastNameCurrent || "").trim();
  if (!name || !lnab || name === person?.wtid || /^private$/i.test(name)) return name;
  // "Arthur Edmond" (first and middle names) needs it too; "John Beacall" doesn't.
  const words = name.toLowerCase().split(/\s+/);
  if ([lnab, current].some((surname) => surname && words.includes(surname.toLowerCase()))) return name;
  return current && current !== lnab ? `${name} (${lnab}) ${current}` : `${name} ${lnab}`;
}
