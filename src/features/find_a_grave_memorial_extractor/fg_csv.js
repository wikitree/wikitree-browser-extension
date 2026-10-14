/*
CSV output for the Find a Grave Memorial Extractor.
*/

const WIKITREE_URL = "https://www.wikitree.com/wiki/";

// Each column: its header and how to read its value from an extracted row.
// row.wikiTreeIDs is an array of WikiTree IDs (empty when no profile is linked).
export const COLUMN_SETS = {
  genealogy: [
    { header: "Memorial ID", value: (r) => r.memorialId },
    { header: "Surname", value: (r) => r.surname },
    { header: "Maiden Name", value: (r) => r.maidenName },
    { header: "Given Names", value: (r) => r.givenNames },
    { header: "WikiTree ID", value: (r) => (r.wikiTreeIDs || []).join(";") },
    { header: "Birth Date", value: (r) => r.birthDate },
    { header: "Death Date", value: (r) => r.deathDate },
    { header: "Latitude", value: (r) => r.latitude, numeric: true },
    { header: "Longitude", value: (r) => r.longitude, numeric: true },
    { header: "Plot", value: (r) => r.plot },
  ],
  // The columns the extractor produced before the genealogy set was added
  original: [
    { header: "FG ID", value: (r) => r.memorialId },
    { header: "Name", value: (r) => originalName(r) },
    { header: "Birth Date", value: (r) => r.birthDate || "unknown" },
    { header: "Death Date", value: (r) => r.deathDate || "unknown" },
    { header: "Has Photo", value: (r) => r.hasPhoto },
    { header: "Has Grave Photo", value: (r) => r.hasGravePhoto },
    { header: "Memorial Link", value: (r) => r.memorialLink },
    { header: "WikiTree Link", value: (r) => (r.wikiTreeIDs || []).map((id) => WIKITREE_URL + id).join(", ") },
  ],
};

function originalName(row) {
  if (row.displayName) return row.displayName;
  const maiden = row.maidenName ? `(${row.maidenName})` : "";
  return [row.givenNames, maiden, row.surname].filter((part) => part).join(" ");
}

// Spreadsheets run a cell that starts with = + - @ (or a tab or return) as a formula, and Find a Grave text can be
// edited by anyone, so such a value gets a leading apostrophe. Numeric columns (negative longitudes) are left alone.
export function neutralizeFormula(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

// RFC 4180: quote a field containing a comma, a quote or a line break, doubling any quotes inside it
export function escapeCsvField(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// A leading byte order mark makes Excel read the file as UTF-8, so accented names survive
export function buildCsv(rows, columnSet = "genealogy") {
  const columns = COLUMN_SETS[columnSet] || COLUMN_SETS.genealogy;
  const lines = [columns.map((column) => escapeCsvField(column.header)).join(",")];
  rows.forEach((row) => {
    lines.push(
      columns
        .map((column) => escapeCsvField(column.numeric ? column.value(row) : neutralizeFormula(column.value(row))))
        .join(",")
    );
  });
  return "\uFEFF" + lines.join("\r\n");
}
