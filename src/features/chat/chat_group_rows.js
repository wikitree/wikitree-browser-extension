// C17/C18, "most common surnames in Shropshire before 1800" / "Beacall births by
// decade": WT+ can't aggregate, so the search spec names a groupBy and code counts
// the result rows once the search has run.

import { getCountryFromLocation } from "./chat_place_country";

export const GROUP_BY_FIELDS = {
  lnab: "surname at birth",
  firstName: "first name",
  birthDecade: "birth decade",
  deathDecade: "death decade",
  birthCentury: "birth century",
  country: "country",
  birthLocation: "birth place",
  deathLocation: "death place",
  gender: "gender",
};
const CHRONOLOGICAL = new Set(["birthDecade", "deathDecade", "birthCentury"]);

function yearOf(value) {
  const match = String(value || "").match(/^(\d{3,4})/);
  return match ? Number(match[1]) : null;
}

/** The bucket a row falls in, or "" when it has no value for that field. */
export function groupValue(row, field) {
  if (field === "birthDecade" || field === "deathDecade") {
    const year = yearOf(field === "birthDecade" ? row.birth : row.death);
    return year === null ? "" : `${Math.floor(year / 10) * 10}s`;
  }
  if (field === "birthCentury") {
    const year = yearOf(row.birth);
    return year === null ? "" : `${Math.floor(year / 100) * 100}s`;
  }
  if (field === "country") {
    return row.country || getCountryFromLocation(row.birthLocation) || getCountryFromLocation(row.deathLocation) || "";
  }
  if (field === "lnab") return String(row.lnab || row.surname || "").trim();
  return String(row[field] || "").trim();
}

/** [{label, count}]: dates in time order, everything else most common first; unknowns last. */
export function groupRows(rows, field) {
  const buckets = new Map();
  let unknown = 0;
  for (const row of rows || []) {
    const value = groupValue(row, field);
    if (!value) {
      unknown += 1;
      continue;
    }
    buckets.set(value, (buckets.get(value) || 0) + 1);
  }
  const groups = [...buckets.entries()].map(([label, count]) => ({ label, count }));
  groups.sort(
    CHRONOLOGICAL.has(field)
      ? (a, b) => parseInt(a.label, 10) - parseInt(b.label, 10)
      : (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );
  return { groups, unknown };
}

/** A grouped answer and table over a person-row result (kept as sourceResult for follow-ups). */
export function buildGroupedResult(sourceTable, field, maxLines = 15) {
  const rows = sourceTable?.rows || [];
  const label = GROUP_BY_FIELDS[field] || field;
  const { groups, unknown } = groupRows(rows, field);
  const lines = groups.slice(0, maxLines).map((group) => `- ${group.label}: ${group.count.toLocaleString()}`);
  const more = groups.length > maxLines ? `\n…and ${groups.length - maxLines} more in the table.` : "";
  const unknownLine = unknown ? `\n${unknown.toLocaleString()} with no ${label} recorded.` : "";
  return {
    message: `${rows.length.toLocaleString()} profiles by ${label} (${groups.length} ${
      groups.length === 1 ? "group" : "groups"
    }):\n${lines.join("\n")}${more}${unknownLine}`,
    table: {
      title: `${sourceTable?.title || "Results"} by ${label}`,
      defaultOrder: CHRONOLOGICAL.has(field) ? [[0, "asc"]] : [[1, "desc"]],
      sourceResult: sourceTable,
      columns: [
        { title: label.charAt(0).toUpperCase() + label.slice(1), key: "label" },
        { title: "Count", key: "count" },
      ],
      rows: groups,
    },
  };
}

// I3: "most common first name among her descendants" — the kin list's rows
// grouped. A result without a table (an error or "none found") passes through.
export function groupKinListResult(result, field) {
  if (!field || !result || typeof result !== "object" || !Array.isArray(result.table?.rows) || !result.table.rows.length) {
    return result;
  }
  return buildGroupedResult(result.table, field);
}

