import * as XLSX from "xlsx";
import { exportFileName, spreadsheetTable, toCsv, toJson, toWikitable, toWorkbook } from "./haunted_tree_export";

const slim = (Id, Name, LongName, groups, Degrees = null, years = "") => ({ Id, Name, LongName, years, Degrees, groups });

// A CC7 scan as haunted_tree.js saves it
const cc7Record = () => ({
  season: 2026,
  scannedAt: new Date(2026, 9, 20, 10).getTime(),
  checkedAt: new Date(2026, 9, 22, 9).getTime(),
  looksFor: ["undead", "ghost", "skeleton", "headless", "halloween"],
  total: 200,
  people: [
    slim(3, "Brown-7", "Mary Brown", ["headless"], 4, "1850–?"),
    slim(1, "Smith-1", 'John "Jack" Smith', ["undead", "skeleton"], 2, "1800–?"),
    slim(4, "Oak-2", "Wilma Oak", ["halloween"], 3, "1901–1980"),
  ],
  laidToRest: [slim(9, "Ash-5", "Ann Ash", ["ghost"], 5), slim(4, "Oak-2", "Wilma Oak", ["undead", "halloween"], 3)],
});

describe("spreadsheetTable", () => {
  test("a CC7: degrees, a column for each group, then Laid to rest and the profile link", () => {
    const { headers, rows } = spreadsheetTable(cc7Record(), "cc7");
    expect(headers).toEqual([
      "WikiTree ID",
      "Name",
      "Years",
      "Degrees",
      "The Undead",
      "Ghosts",
      "Skeletons in the closet",
      "Headless Horsemen",
      "Halloween folk",
      "Laid to rest",
      "Profile",
    ]);
    // Closest first; the laid to rest who are in no group now come last, with their group columns empty
    expect(rows.map((row) => row[0])).toEqual(["Smith-1", "Oak-2", "Brown-7", "Ash-5"]);
    expect(rows[0]).toEqual([
      "Smith-1",
      'John "Jack" Smith',
      "1800–?",
      2,
      "Yes",
      "",
      "Yes",
      "",
      "",
      "",
      "https://www.wikitree.com/wiki/Smith-1",
    ]);
    // Still Halloween folk, and laid to rest as one of the Undead
    expect(rows[1].slice(4, 10)).toEqual(["", "", "", "", "Yes", "Yes"]);
    expect(rows[3].slice(3, 10)).toEqual([5, "", "", "", "", "", "Yes"]);
  });

  test("a watchlist has no degrees, but has Lone wolves", () => {
    const record = { ...cc7Record(), looksFor: undefined, laidToRest: [] };
    record.looksFor = ["undead", "ghost", "skeleton", "headless", "lonewolf", "halloween"];
    const { headers } = spreadsheetTable(record, "watchlist");
    expect(headers).not.toContain("Degrees");
    expect(headers).toContain("Lone wolves");
    expect(headers).not.toContain("Laid to rest");
  });

  test("a group the scan didn't look for gets no column", () => {
    const record = { ...cc7Record(), looksFor: undefined }; // made before Lone wolves were added
    expect(spreadsheetTable(record, "watchlist").headers).not.toContain("Lone wolves");
  });
});

describe("toCsv", () => {
  test("quoted cells, doubled quotes and a byte-order mark for Excel", () => {
    const csv = toCsv(cc7Record(), "cc7");
    expect(csv.startsWith('﻿"WikiTree ID","Name","Years","Degrees",')).toBe(true);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(5);
    expect(lines[1]).toBe(
      '"Smith-1","John ""Jack"" Smith","1800–?","2","Yes","","Yes","","","","https://www.wikitree.com/wiki/Smith-1"'
    );
  });
});

describe("toWorkbook", () => {
  test("one sheet, with the IDs linked to the profiles, read back as the same table", () => {
    const book = toWorkbook(XLSX, cc7Record(), "cc7");
    expect(book.SheetNames).toEqual(["Haunted Tree"]);
    const sheet = book.Sheets["Haunted Tree"];
    expect(sheet.A2.l.Target).toBe("https://www.wikitree.com/wiki/Smith-1");
    expect(sheet.D2).toMatchObject({ t: "n", v: 2 });
    expect(sheet["!autofilter"].ref).toBe("A1:K5");

    const written = XLSX.read(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
    const rows = XLSX.utils.sheet_to_json(written.Sheets["Haunted Tree"], { header: 1, defval: "" });
    expect(rows).toEqual([spreadsheetTable(cc7Record(), "cc7").headers, ...spreadsheetTable(cc7Record(), "cc7").rows]);
  });
});

describe("toJson", () => {
  test("the score and the scan's details, with the laid to rest on their own", () => {
    const json = JSON.parse(toJson(cc7Record(), "cc7"));
    expect(json).toMatchObject({
      list: "cc7",
      season: 2026,
      total: 200,
      haunted: 2, // Halloween folk aren't counted
      percentHaunted: 1,
    });
    expect(json.groups.map((group) => group.key)).toEqual(["undead", "ghost", "skeleton", "headless", "halloween"]);
    expect(json.people[0]).toEqual({
      wikiTreeId: "Smith-1",
      id: 1,
      name: 'John "Jack" Smith',
      years: "1800–?",
      degrees: 2,
      groups: ["undead", "skeleton"],
      profile: "https://www.wikitree.com/wiki/Smith-1",
    });
    expect(json.laidToRest.map((person) => [person.wikiTreeId, person.was])).toEqual([
      ["Oak-2", ["undead", "halloween"]],
      ["Ash-5", ["ghost"]],
    ]);
  });

  test("a watchlist has no degrees", () => {
    const json = JSON.parse(toJson({ ...cc7Record(), looksFor: undefined }, "watchlist"));
    expect(json.people[0]).not.toHaveProperty("degrees");
  });
});

describe("toWikitable", () => {
  test("linked names, ticks, and a sortable table", () => {
    const lines = toWikitable(cc7Record(), "cc7").split("\n");
    expect(lines.slice(0, 3)).toEqual([
      '{| class="wikitable sortable"',
      "|-",
      "! Profile !! Years !! Degrees !! The Undead !! Ghosts !! Skeletons in the closet !! Headless Horsemen !! " +
        "Halloween folk !! Laid to rest",
    ]);
    expect(lines[4]).toBe('| [[Smith-1|John "Jack" Smith]] || 1800–? || 2 || ✓ ||  || ✓ ||  ||  || ');
    expect(lines[lines.length - 1]).toBe("|}");
    expect(lines.filter((line) => line === "|-")).toHaveLength(5);
  });

  test("a pipe in a name doesn't break the link", () => {
    const record = { ...cc7Record(), people: [slim(1, "Smith-1", "A|B", ["headless"], 1)], laidToRest: [] };
    expect(toWikitable(record, "cc7")).toContain("[[Smith-1|A&#124;B]]");
  });
});

test("exportFileName is dated by the last re-check", () => {
  expect(exportFileName(cc7Record(), "cc7", "csv")).toBe("haunted-tree-cc7-2026-10-22.csv");
  expect(exportFileName({ scannedAt: new Date(2026, 9, 1).getTime() }, "watchlist", "wikitable.txt")).toBe(
    "haunted-tree-watchlist-2026-10-01.wikitable.txt"
  );
});
