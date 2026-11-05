// Haunted Tree's Export buttons. Excel, CSV and the wikitable are one table: the haunted, closest first, then anyone
// laid to rest who isn't in a group any more, with a column for each group. JSON keeps the scan's own shape, with the
// laid to rest in a list of their own. Groups a scan didn't look for (it was made before they were added) are left
// out, as the popup leaves them empty.
import { GROUPS, groupsFor, groupsNotLookedFor, sortPeople, summarize } from "./haunted_tree_data";

const idOf = (person) => String(person.Id);

export const profileUrl = (name) => `https://www.wikitree.com/wiki/${encodeURIComponent(name)}`;

/** { groups, cc7, hasRested, people }: each person with their current groups and whether they've been laid to rest. */
function exportData(record, source) {
  const notLookedFor = groupsNotLookedFor(record, source);
  const keys = groupsFor(source).filter((key) => !notLookedFor.includes(key));
  const rested = record.laidToRest || [];
  const restedIds = new Set(rested.map(idOf));
  const haunted = sortPeople(record.people);
  const hauntedIds = new Set(haunted.map(idOf));
  // Their saved groups are the ones they were in, so the group columns are left empty
  const restedOnly = sortPeople(rested.filter((person) => !hauntedIds.has(idOf(person)))).map((person) => ({
    ...person,
    groups: [],
  }));
  return {
    groups: GROUPS.filter((group) => keys.includes(group.key)),
    cc7: source === "cc7",
    hasRested: restedIds.size > 0,
    people: [...haunted, ...restedOnly].map((person) => ({ ...person, laidToRest: restedIds.has(idOf(person)) })),
  };
}

/** The table for Excel and CSV: { headers, rows }. Degrees stay numbers, so a spreadsheet sorts them as numbers. */
export function spreadsheetTable(record, source) {
  const { groups, cc7, hasRested, people } = exportData(record, source);
  const yes = (value) => (value ? "Yes" : "");
  const headers = [
    "WikiTree ID",
    "Name",
    "Years",
    ...(cc7 ? ["Degrees"] : []),
    ...groups.map((group) => group.title),
    ...(hasRested ? ["Laid to rest"] : []),
    "Profile",
  ];
  const rows = people.map((person) => [
    person.Name,
    person.LongName || person.Name,
    person.years || "",
    ...(cc7 ? [person.Degrees ?? ""] : []),
    ...groups.map((group) => yes(person.groups.includes(group.key))),
    ...(hasRested ? [yes(person.laidToRest)] : []),
    profileUrl(person.Name),
  ]);
  return { headers, rows };
}

/** With a byte-order mark, so that Excel reads the names as UTF-8. */
export function toCsv(record, source) {
  const { headers, rows } = spreadsheetTable(record, source);
  const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return "﻿" + [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

/** A workbook for XLSX.writeFile, made with the xlsx module (loaded only when it's wanted). */
export function toWorkbook(XLSX, record, source) {
  const { headers, rows } = spreadsheetTable(record, source);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // The WikiTree IDs and the Profile column link to the profiles
  const profileColumn = headers.length - 1;
  rows.forEach((row, index) => {
    for (const column of [0, profileColumn]) {
      sheet[XLSX.utils.encode_cell({ r: index + 1, c: column })].l = { Target: row[profileColumn] };
    }
  });
  const widths = { "WikiTree ID": 18, Name: 32, Years: 12, Degrees: 9, Profile: 42 };
  sheet["!cols"] = headers.map((header) => ({ wch: widths[header] || Math.max(10, header.length + 2) }));
  sheet["!autofilter"] = { ref: sheet["!ref"] };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Haunted Tree");
  return book;
}

/** The scan with its score, and the people as the popup lists them. */
export function toJson(record, source) {
  const { groups, cc7 } = exportData(record, source);
  const keys = groups.map((group) => group.key);
  const { haunted, percent } = summarize(record.people, record.total);
  const person = (groupsKey) => (p) => ({
    wikiTreeId: p.Name,
    id: p.Id,
    name: p.LongName || p.Name,
    years: p.years || "",
    ...(cc7 ? { degrees: p.Degrees ?? null } : {}),
    [groupsKey]: p.groups.filter((key) => keys.includes(key)),
    profile: profileUrl(p.Name),
  });
  const json = {
    list: source,
    season: record.season,
    scannedAt: new Date(record.scannedAt).toISOString(),
    checkedAt: new Date(record.checkedAt || record.scannedAt).toISOString(),
    total: record.total,
    haunted,
    percentHaunted: Number(percent),
    groups: groups.map(({ key, icon, title, meaning, scored }) => ({ key, icon, title, meaning, scored })),
    people: sortPeople(record.people).map(person("groups")),
    // The groups they were in
    laidToRest: sortPeople(record.laidToRest || []).map(person("was")),
  };
  return JSON.stringify(json, null, 2);
}

/** A sortable wikitable to paste into a WikiTree page, with a tick in each group a person is in. */
export function toWikitable(record, source) {
  const { groups, cc7, hasRested, people } = exportData(record, source);
  const tick = (value) => (value ? "✓" : "");
  const headers = [
    "Profile",
    "Years",
    ...(cc7 ? ["Degrees"] : []),
    ...groups.map((group) => group.title),
    ...(hasRested ? ["Laid to rest"] : []),
  ];
  const lines = ['{| class="wikitable sortable"', "|-", `! ${headers.join(" !! ")}`];
  for (const person of people) {
    const name = String(person.LongName || person.Name).replace(/\|/g, "&#124;");
    const cells = [
      `[[${person.Name}|${name}]]`,
      person.years || "",
      ...(cc7 ? [person.Degrees ?? ""] : []),
      ...groups.map((group) => tick(person.groups.includes(group.key))),
      ...(hasRested ? [tick(person.laidToRest)] : []),
    ];
    lines.push("|-", `| ${cells.join(" || ")}`);
  }
  lines.push("|}");
  return lines.join("\n");
}

/** "haunted-tree-cc7-2026-10-22.csv", dated by the last time the profiles were read. */
export function exportFileName(record, source, extension) {
  const date = new Date(record.checkedAt || record.scannedAt);
  const pad = (n) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `haunted-tree-${source}-${day}.${extension}`;
}
