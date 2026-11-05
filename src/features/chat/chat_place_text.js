// WT+ Location= matches text inside the profile's place, and most English places
// are written "Cornwall, England" with no country after it: "Cornwall, England,
// United Kingdom" found 117 unsourced orphans where "Cornwall, England" found
// 1,107 (live D12, 2026-10-03). The shorter text matches both spellings.
export function trimUkCountrySuffix(location) {
  const text = String(location || "").trim();
  const trimmed = text.replace(/,\s*(?:United\s+Kingdom|UK|U\.K\.|Great\s+Britain)\s*$/i, "").trim();
  return trimmed || text;
}

/** Human-readable name for an API location field, including the combined scope. */
export function getLocationFieldLabel(locationField) {
  if (locationField === "BirthLocation") {
    return "birth location";
  }
  if (locationField === "DeathLocation") {
    return "death location";
  }
  return "birth or death location";
}
