// Country of a WikiTree place string, for "where were my ancestors born?" (C5)
// and "which of my ancestors emigrated?" (C6). The last comma part is the
// country, except that "…, England, United Kingdom" counts as England.
const UK_NATIONS = new Set(["england", "scotland", "wales", "northern ireland", "ireland"]);
const UK_NAMES = new Set(["united kingdom", "uk", "great britain", "britain"]);
const ALIASES = {
  usa: "United States",
  us: "United States",
  "u.s.a.": "United States",
  "united states of america": "United States",
  "british america": "United States",
  "british colonial america": "United States",
  deutschland: "Germany",
  "holy roman empire": "Germany",
  nederland: "Netherlands",
  "the netherlands": "Netherlands",
  éire: "Ireland",
};

export function getCountryFromLocation(location) {
  const parts = String(location || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return "";
  let last = parts[parts.length - 1].replace(/\.$/, "");
  if (UK_NAMES.has(last.toLowerCase()) && parts.length > 1 && UK_NATIONS.has(parts[parts.length - 2].toLowerCase())) {
    last = parts[parts.length - 2];
  }
  return ALIASES[last.toLowerCase()] || last;
}

// "England 80, Wales 10, unknown 30" for rows' birth (or death) places.
export function summarizeCountries(rows, field = "birthLocation") {
  const counts = new Map();
  let unknown = 0;
  for (const row of rows || []) {
    const country = getCountryFromLocation(row?.[field]);
    if (!country) {
      unknown += 1;
      continue;
    }
    counts.set(country, (counts.get(country) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return { sorted, unknown };
}

// Born in one country and died in another (both known).
export function isEmigrantRow(row) {
  const born = getCountryFromLocation(row?.birthLocation);
  const died = getCountryFromLocation(row?.deathLocation);
  return Boolean(born && died && born.toLowerCase() !== died.toLowerCase());
}
