// Downloads the WikiTree One Name Studies variants sheet and writes
// src/features/chat/chat_surname_variants_data.js, which Genie's surname river and
// name cloud use to count spellings of one surname together.
// Run before building a release (npm run download-surname-variants). If the sheet
// can't be read, the copy already in the repo is kept and the build carries on.

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SHEET_ID = "1VwYnlDVIw8MH4mKDQeRfJAW_2u2kSHyiGcQUw5yBepw";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
const OUT = new URL("../src/features/chat/chat_surname_variants_data.js", import.meta.url);
// Fewer groups than this means the sheet came back wrong (a sign-in page, an empty export).
const MIN_GROUPS = 50;
// Pivot-table totals that crept into the sheet.
const JUNK = new Set(["totaal resultaat", "grand total", "total"]);

const SPECIAL_LETTERS = { ł: "l", ø: "o", ß: "ss", æ: "ae", œ: "oe", đ: "d", ı: "i" };
// The same folding as foldName in chat_name_variants.js.
function foldName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[łøßæœđı]/g, (letter) => SPECIAL_LETTERS[letter])
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

// "Wiberg Wieberg Weberg" (spaces where commas were meant): every word capitalised and
// starting with the same letter. "Deblois Gregoire" and "van Blois" stay whole.
function splitSpacedList(piece) {
  const words = piece.split(/\s+/);
  if (words.length < 2) return [piece];
  const sameStart = words.every((word) => /^\p{Lu}/u.test(word) && foldName(word)[0] === foldName(words[0])[0]);
  return sameStart ? words : [piece];
}

export function variantGroups(csvText) {
  const groups = [];
  parseCsv(csvText)
    .slice(1)
    .forEach(([study = "", variants = ""]) => {
      const head = study.trim().replace(/--.*$/, "");
      const pieces = head ? [head] : [];
      variants.split(",").forEach((raw) => {
        const piece = raw.trim().replace(/\.+$/, "").trim();
        if (piece) pieces.push(...splitSpacedList(piece));
      });
      const seen = new Set();
      const names = pieces.filter((name) => {
        const folded = foldName(name);
        if (!folded || JUNK.has(folded) || seen.has(folded)) return false;
        seen.add(folded);
        return true;
      });
      if (names.length > 1) groups.push(names);
    });
  // Rows that share a spelling are one group.
  const merged = [];
  groups.forEach((group) => {
    const keys = new Set(group.map(foldName));
    const hits = merged.filter((other) => other.some((name) => keys.has(foldName(name))));
    hits.forEach((hit) => merged.splice(merged.indexOf(hit), 1));
    const seen = new Set();
    merged.push([...hits.flat(), ...group].filter((name) => !seen.has(foldName(name)) && seen.add(foldName(name))));
  });
  return merged.sort((a, b) => (foldName(a[0]) < foldName(b[0]) ? -1 : foldName(a[0]) > foldName(b[0]) ? 1 : 0));
}

function moduleText(groups) {
  return `// Surname variants from the WikiTree One Name Studies sheet (columns A and B):
// https://docs.google.com/spreadsheets/d/${SHEET_ID}
// Written by scripts/download-surname-variants.mjs (npm run download-surname-variants),
// which the release workflow runs before building. Don't edit by hand.
// Cleaned: rows sharing a name merged, spellings that differ only by accents kept once
// (chat_name_variants.js ignores accents anyway), notes and stray totals dropped.
// One group per string, spellings separated by "|", the study's name first.
export const SURNAME_VARIANT_GROUPS = [
${groups.map((group) => `  ${JSON.stringify(group.join("|"))},`).join("\n")}
];
`;
}

async function main() {
  let groups;
  try {
    const response = await fetch(CSV_URL, { redirect: "follow" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    groups = variantGroups(await response.text());
    if (groups.length < MIN_GROUPS) throw new Error(`only ${groups.length} groups`);
  } catch (error) {
    console.warn(`download-surname-variants: couldn't read the sheet (${error.message}); keeping the copy in the repo.`);
    return;
  }
  const text = moduleText(groups);
  const old = readFileSync(OUT, "utf8");
  if (old === text) {
    console.log(`download-surname-variants: ${groups.length} groups, unchanged.`);
    return;
  }
  writeFileSync(OUT, text);
  console.log(`download-surname-variants: ${groups.length} groups written.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
