// Shared owner normalization for chart prompts. Family timeline uses a different
// subject convention and keeps its own parser.

export function canonicalChartOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (!raw) return "";
  if (/^(?:my|our)$/i.test(raw)) return "my";
  if (/^(?:her|his|their)$/i.test(raw)) return raw.toLowerCase();
  if (/^this\s+(?:profile|person)$/i.test(raw)) return "";
  return raw;
}

export function canonicalChartObjectOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (!raw) return "";
  if (/^(?:my|our|me)$/i.test(raw)) return "my";
  if (/^(?:her)$/i.test(raw)) return "her";
  if (/^(?:his|him)$/i.test(raw)) return "his";
  if (/^(?:their|them)$/i.test(raw)) return "their";
  if (/^this\s+(?:profile|person)$/i.test(raw)) return "";
  return raw;
}
