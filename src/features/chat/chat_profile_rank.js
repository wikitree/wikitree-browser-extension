import { foldAccents } from "./chat_text_utils";
// The WikiTree name search also returns sound-alike surnames (Beacall -> Bickel,
// Buckel), in no particular order. Put the rows that match the name as typed
// first: exact surname, then exact first name. A name that matches only as a
// middle name (Brian George Beacall for "George"; his wife Yvonne Margaret for
// "married Margaret") ranks below one that matches as the first name. The order
// is otherwise kept.

const norm = (value) => foldAccents(value).trim();

const firstToken = (value) => norm(value).split(/\s+/)[0] || "";

function nameScore(row, firstName, lastName, spouseFirst) {
  let score = 0;
  if (lastName && [row?.lnab, row?.lastNameCurrent].some((value) => norm(value) === lastName)) score += 4;
  if (firstName && firstToken(row?.firstName) === firstName) score += 2;
  if (spouseFirst && firstToken(row?.matchedSpouse) === spouseFirst) score += 1;
  return score;
}

export function rankProfileRowsByName(rows = [], { firstName = "", lastName = "", spouseName = "" } = {}) {
  const wantedFirst = firstToken(firstName);
  const wantedLast = norm(lastName);
  const wantedSpouseFirst = firstToken(spouseName);
  if (!wantedFirst && !wantedLast && !wantedSpouseFirst) return rows;
  return rows
    .map((row, index) => ({ row, index, score: nameScore(row, wantedFirst, wantedLast, wantedSpouseFirst) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.row);
}
