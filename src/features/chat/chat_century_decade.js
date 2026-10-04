// Decades and centuries in Genie prompts.
//
// WT+ decade words mean "alive at some point in the decade" (probed 2026-10-02:
// BirthLocation=Shropshire 1820s = 9,205, but only 2,858 were born then). Users
// who type "1820s" almost always mean "born in the 1820s", so a bare decade token
// in a WT+ query gains the WT+ helper's born-in-decade sql. The decade token stays
// as a cheap index prefilter: sql alone over a large set fails ("Too many profiles").
//
// "1800s" is ambiguous in English: the whole 19th century, or the decade
// 1800-1809. Genie asks, unless the wording already says which.

import { SQL_TEMPLATES } from "../wikitree_plus_helper/wikitree_plus_helper_sql";

const birthDecadeTemplate = SQL_TEMPLATES.find((template) => template.id === "birth-decade");

export function buildBirthDecadeSqlTerm(decadeStart) {
  return birthDecadeTemplate ? birthDecadeTemplate.buildSql(`${decadeStart}s`) : "";
}

function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
}

// Split on top-level OR (outside quotes), keeping each branch's text.
function splitTopLevelOr(queryText) {
  const branches = [];
  let current = "";
  let quote = "";
  const text = String(queryText || "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = "";
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (/^\sOR\s/.test(text.slice(i, i + 4))) {
      branches.push(current.trim());
      current = "";
      i += 3;
      continue;
    }
    current += ch;
  }
  branches.push(current.trim());
  return branches.filter(Boolean);
}

// Bare WT+ decade tokens ("1820s") gain the born-in-decade sql. A branch that
// already has its own birth-date sql keeps it unchanged.
export function addBirthDecadeSqlToDecadeTokens(queryText) {
  const text = String(queryText || "").trim();
  if (!/(?:^|\s)\d{3}0s(?=\s|$)/.test(text)) {
    return text;
  }
  return splitTopLevelOr(text)
    .map((branch) => {
      if (/\[Birth Date\]/i.test(branch)) return branch;
      const decades = Array.from(branch.matchAll(/(?:^|\s)(\d{3}0)s(?=\s|$)/g)).map((match) => match[1]);
      if (decades.length !== 1) return branch;
      const sqlTerm = buildBirthDecadeSqlTerm(decades[0]);
      return sqlTerm ? `${branch} ${sqlTerm}` : branch;
    })
    .join(" OR ");
}

const CENTURY_DECADE_RE = /\b(1\d)00(?:'?s)\b/i;

// Wording that already settles the meaning, rewritten to an explicit year range.
const DECADE_WORDING = [
  /\b(?:the\s+)?first\s+decade\s+of\s+the\s+(1\d)00'?s\b/i,
  /\b(?:the\s+)?decade\s+of\s+the\s+(1\d)00'?s\b/i,
  /\b(?:the\s+)?(1\d)00'?s\s+decade\b/i,
];
const CENTURY_WORDING = [/\b(?:the\s+)?(1\d)00'?s\s+century\b/i, /\b(?:the\s+)?whole\s+(?:of\s+the\s+)?(1\d)00'?s\b/i];

function centuryRange(prefix) {
  return `${prefix}00-${prefix}99`;
}

function decadeRange(prefix) {
  return `${prefix}00-${prefix}09`;
}

export function rewriteExplicitCenturyDecadeWording(prompt) {
  let text = String(prompt || "");
  for (const pattern of DECADE_WORDING) {
    text = text.replace(pattern, (whole, prefix) => decadeRange(prefix));
  }
  for (const pattern of CENTURY_WORDING) {
    text = text.replace(pattern, (whole, prefix) => centuryRange(prefix));
  }
  return text;
}

// Returns null when the prompt has no ambiguous "XX00s", otherwise the question
// and the two rewritten prompts to offer as buttons.
export function findAmbiguousCenturyDecade(prompt) {
  const text = String(prompt || "");
  // Raw WT+ syntax (field=value, sql=) is taken literally.
  if (/\b[A-Za-z]+=\S/.test(text)) return null;
  const match = text.match(CENTURY_DECADE_RE);
  if (!match) return null;
  const prefix = match[1];
  const centuryNumber = Number.parseInt(prefix, 10) + 1;
  // "born in the 1700s" → "born 1700-1799", not "born in the 1700-1799".
  const replaceWith = (range) =>
    text.replace(new RegExp(String.raw`(?:\b(?:in|during)\s+)?(?:\bthe\s+)?\b${match[0]}`, "i"), range);
  return {
    token: match[0],
    question: `By "${match[0]}" do you mean the whole ${ordinal(
      centuryNumber
    )} century or just the decade ${decadeRange(prefix).replace("-", "–")}?`,
    choices: [
      {
        label: `${ordinal(centuryNumber)} century (${centuryRange(prefix).replace("-", "–")})`,
        prompt: replaceWith(centuryRange(prefix)),
      },
      {
        label: `Decade ${decadeRange(prefix).replace("-", "–")}`,
        prompt: replaceWith(decadeRange(prefix)),
      },
    ],
  };
}
