// E4/E10, "who was her youngest child?" / "her first child": the child list,
// ordered by birth date, then one child picked (live, 2026-10-03: the AI asked
// which person "her" meant).

import { formatPreviewDate, formatPreviewName } from "./chat_preview_format";

const ORDER_WORDS = {
  youngest: "last",
  last: "last",
  "last-born": "last",
  lastborn: "last",
  eldest: 1,
  oldest: 1,
  first: 1,
  "first-born": 1,
  firstborn: 1,
  "1st": 1,
  second: 2,
  "2nd": 2,
  third: 3,
  "3rd": 3,
  fourth: 4,
  "4th": 4,
  fifth: 5,
  "5th": 5,
};

const OWNER = String.raw`(her|his|their|my|[A-Z][A-Za-z'_ -]*?-\d+(?:'s|’s)|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.()]*){0,3}(?:'s|’s))`;
const CHILD_PICK_RE = new RegExp(
  String.raw`^(?:(?:who|which)\s+(?:is|was)\s+|show(?:\s+me)?\s+|tell\s+me\s+)?${OWNER}\s+(youngest|last(?:-?born)?|eldest|oldest|first(?:-?born)?|1st|second|2nd|third|3rd|fourth|4th|fifth|5th)\s+((?:grand)?(?:child|kid|son|daughter)|baby)$`,
  "i"
);

/** Descendant-list params plus childPick, or null. */
export function parseChildPickPrompt(prompt) {
  const match = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .match(CHILD_PICK_RE);
  if (!match) return null;
  const owner = match[1].replace(/(?:'s|’s)$/, "");
  const orderWord = match[2].toLowerCase();
  const order = ORDER_WORDS[orderWord] ?? ORDER_WORDS[orderWord.replace(/-/g, "")];
  if (order === undefined) return null;
  const noun = match[3].toLowerCase();
  // H10 (live, 2026-10-03): "who was her eldest grandchild?" — generation 2.
  const grand = /^grand/.test(noun);
  const kin = grand ? "grandchildren" : "children";
  const base = noun.replace(/^grand/, "");
  return {
    generation: grand ? 2 : 1,
    relationshipLabel: kin,
    subjectText: /^(?:her|his|their|my)$/i.test(owner) ? `${owner} ${kin}` : `${owner}'s ${kin}`,
    childPick: {
      order,
      gender: base === "son" ? "Male" : base === "daughter" ? "Female" : "",
      label: `${orderWord} ${noun}`,
      ...(grand ? { grand: true } : {}),
    },
  };
}

function birthKey(row) {
  const match = String(row?.birth || "").match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match || match[1] === "0000") return null;
  return `${match[1]}-${match[2] || "00"}-${match[3] || "00"}`;
}

/**
 * {chosen, dated, undated, tied}: chosen is null when there is no such child.
 * tied = another child shares the chosen one's (possibly year-only) birth date.
 */
export function pickChild(rows, { order, gender = "" }) {
  const pool = (rows || []).filter((row) => !gender || String(row?.gender || "") === gender);
  const dated = pool.filter((row) => birthKey(row)).sort((a, b) => birthKey(a).localeCompare(birthKey(b)));
  const undated = pool.length - dated.length;
  const index = order === "last" ? dated.length - 1 : Number(order) - 1;
  const chosen = index >= 0 && index < dated.length ? dated[index] : null;
  const key = chosen ? birthKey(chosen) : "";
  const yearOnly = (value) => /-00-00$/.test(value);
  const tied =
    Boolean(chosen) &&
    dated.some((row) => {
      if (row === chosen) return false;
      const other = birthKey(row);
      return other === key || (other.slice(0, 4) === key.slice(0, 4) && (yearOnly(key) || yearOnly(other)));
    });
  return { chosen, dated: dated.length, undated, tied };
}

function plural(count, noun) {
  if (count === 1) return `1 ${noun}`;
  return `${count} ${/child$/.test(noun) ? `${noun}ren` : `${noun}s`}`;
}

export function buildChildPickAnswer(rows, childPick, subjectLabel) {
  const { chosen, dated, undated, tied } = pickChild(rows, childPick);
  const noun = `${childPick.grand ? "grand" : ""}${
    childPick.gender === "Male" ? "son" : childPick.gender === "Female" ? "daughter" : "child"
  }`;
  const undatedNote = undated
    ? ` ${plural(undated, noun)} ${undated === 1 ? "has" : "have"} no birth date, so ${
        undated === 1 ? "isn't" : "aren't"
      } counted.`
    : "";
  if (!chosen) {
    return `${subjectLabel} has ${plural(dated, noun)} with a birth date, so there is no ${childPick.label}.${undatedNote}`;
  }
  const place = chosen.birthLocation ? ` in ${chosen.birthLocation}` : "";
  const tieNote = tied ? ` Another ${noun} was born the same year, so the order between them isn't certain.` : "";
  return `${subjectLabel}'s ${childPick.label} is ${formatPreviewName(chosen)} (${chosen.wtid}), born ${formatPreviewDate(
    chosen.birth
  )}${place}.${tieNote}${undatedNote}`;
}
