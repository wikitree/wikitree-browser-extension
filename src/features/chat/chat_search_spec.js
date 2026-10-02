// The AI describes WHAT the user wants as a fixed JSON "search spec"; this module
// turns the spec into WT+ syntax. The model is good at understanding English and
// unreliable at a quirky query language (sql parentheses, NOT placement, decade
// meaning, bare tokens vs field=value), so all syntax lives here, under test.
//
// Date facts (probed on plus.wikitree.com, 2026-10-02):
// - [X Date].AsNumber is yyyymmdd; unknown month/day are 00; a missing date is 0,
//   so "before" ranges start at 1 or they include every undated profile.
// - WT+ decade words (1820s) mean "alive in the decade"; run-time code adds the
//   born-in-decade sql (chat_century_decade.js).

import { SQL_TEMPLATES } from "../wikitree_plus_helper/wikitree_plus_helper_sql";

const templateSql = (id, ...args) => SQL_TEMPLATES.find((template) => template.id === id)?.buildSql(...args) || "";

// Spec flag → WT+ term, with the meaning the AI sees in its instructions.
export const SEARCH_SPEC_FLAGS = {
  Unsourced: { term: "Unsourced", meaning: "no sources (bio check)" },
  Unconnected: { term: "Unconnected", meaning: "not connected to the main tree" },
  Connected: { term: "connected", meaning: "connected to the main tree" },
  Orphan: { term: "Orphan", meaning: "no profile manager" },
  ProjectManaged: { term: "ProjectManaged", meaning: "managed by a project account" },
  PPP: { term: "PPP", meaning: "project-protected profile" },
  NoFather: { term: "NoFather", meaning: "no father linked" },
  NoMother: { term: "NoMother", meaning: "no mother linked" },
  NoParents: { term: "NoParents", meaning: "no parents linked" },
  HasFather: { term: "NoFather", negate: true, meaning: "has a father linked" },
  HasMother: { term: "NoMother", negate: true, meaning: "has a mother linked" },
  NoSpouses: { term: "NoSpouses", meaning: "no spouses linked" },
  NoChildren: { term: "NoChildren", meaning: "no children linked" },
  YDNA: { term: "yDNA", meaning: "has a Y-DNA test connection" },
  MtDNA: { term: "mtDNA", meaning: "has an mtDNA test connection" },
  AuDNA: { term: "auDNA", meaning: "has an autosomal DNA test connection" },
  Open: { term: "Open", meaning: "open privacy" },
  NeverEdited: { term: "NeverEdited", meaning: "never edited since creation" },
  GedcomJunk: { term: "GEDCOMJunk", meaning: "GEDCOM import leftovers in the bio" },
  SourceJunk: { term: "SourceJunk", meaning: "junk in sources" },
  InWikidata: { term: "IsInWikiData", meaning: "linked to Wikidata" },
  PendingMerge: { term: "PendingMerge", meaning: "has a pending merge" },
  UnmergedMatch: { term: "UnmergedMatch", meaning: "has an unmerged match" },
};

const NAME_FIELDS = {
  lastNameAtBirth: "LastNameAtBirth",
  currentLastName: "CurrentLastName",
  anyLastName: "AllLastNames",
  firstName: "FirstName",
};
const PLACE_FIELDS = { birth: "BirthLocation", death: "DeathLocation", marriage: "MarriageLocation", any: "Location" };
const DATE_FIELDS = {
  birth: "[Default].[Birth Date].AsNumber",
  death: "[Default].[Death Date].AsNumber",
  marriage: "[Marriage].[Marriage Date].AsNumber",
};
const COUNT_FIELDS = {
  children: "[Children].[User ID].LineCount",
  siblings: "[Siblings].[User ID].LineCount",
  marriages: "[Marriage].[Marriage Date].LineCount",
};

export function quoteWtPlusSpecValue(value) {
  const text = String(value || "")
    .replace(/["]/g, "")
    .trim();
  return /[\s,]/.test(text) ? `"${text}"` : text;
}

const sqlTerm = (expressions) => `sql="${expressions.map((expression) => `(${expression})`).join(" And ")}"`;
const asYear = (value) => (Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null);

// One date constraint → WT+ terms. Birth dates get cheap index tokens when they
// fit (19Cen, 1820s, B1820) because sql over a big set fails ("Too many profiles").
function compileDate({ event = "birth", from, to } = {}, errors) {
  const field = DATE_FIELDS[event];
  const start = asYear(from);
  const end = asYear(to);
  if (!field || (start === null && end === null) || (start !== null && end !== null && start > end)) {
    errors.push(`bad date: ${JSON.stringify({ event, from, to })}`);
    return { terms: [], sql: [] };
  }
  if (start !== null && end !== null) {
    if (event === "birth" && start % 100 === 0 && end === start + 99) {
      return { terms: [`${start / 100 + 1}Cen`], sql: [] };
    }
    if (event === "birth" && start % 10 === 0 && end === start + 9) {
      return { terms: [`${start}s`], sql: [] };
    }
    if (event === "birth" && start === end) {
      return { terms: [`B${start}`], sql: [] };
    }
    if (event === "death" && start === end) {
      return { terms: [`D${start}`], sql: [] };
    }
    const sameCentury = Math.floor(start / 100) === Math.floor(end / 100);
    return {
      terms: event === "birth" && sameCentury ? [`${Math.floor(start / 100) + 1}Cen`] : [],
      sql: [`${field} In ${start}0000..${end}9999`],
    };
  }
  if (start !== null) {
    return { terms: [], sql: [`${field} >= ${start}0000`] };
  }
  return { terms: [], sql: [`${field} In 1..${end}9999`] };
}

function compileCount(kind, { min, max, exact } = {}, errors) {
  const field = COUNT_FIELDS[kind];
  if (!field) {
    errors.push(`unknown count: ${kind}`);
    return [];
  }
  if (Number.isInteger(exact)) return [`${field} = ${exact}`];
  const parts = [];
  if (Number.isInteger(min)) parts.push(`${field} >= ${min}`);
  if (Number.isInteger(max)) parts.push(`${field} <= ${max}`);
  if (!parts.length) errors.push(`bad count for ${kind}`);
  return parts;
}

// Special searches run as extension routes; the spec compiles to the canonical
// prompt those routes parse.
function compileSpecialRoute(special, scopeText, errors) {
  const scope = scopeText ? `${scopeText} ` : "";
  switch (special?.type) {
    case "spousalAgeGap":
      return `${scope}large spousal age gaps (> ${Number(special.minYears) || 20} years)`;
    case "parentAgeAtBirth": {
      const parts = [];
      if (Number.isFinite(Number(special.underAge))) parts.push(`under ${Number(special.underAge)}`);
      if (Number.isFinite(Number(special.overAge))) parts.push(`over ${Number(special.overAge)}`);
      return parts.length ? `${scope}when parent was ${parts.join(" or ")}` : "";
    }
    case "siblingBirthGap":
      return `${scope}siblings with implausibly close birth dates (< ${Number(special.maxMonths) || 5} months apart)`;
    case "marriedNoChildren":
      return `${scope}married but no children listed`;
    case "createdRecently":
      return `${scope}profiles added in the last ${Number(special.days) || 30} days`;
    default:
      errors.push(`unknown special search: ${special?.type}`);
      return "";
  }
}

function compileTreeRoot(value, context) {
  const text = String(value || "").trim();
  if (/^(?:me|user|myself)$/i.test(text)) return context.userWtId || "";
  if (/^(?:current|this|profile|current\s*profile)$/i.test(text)) return context.currentProfileWtId || "";
  return /^[A-Za-z' -]+-\d+$/.test(text) ? text.replace(/\s+/g, "_") : "";
}

// An alternative adds to the shared spec: lists are appended, objects merged.
function mergeAlternative(base, alternative) {
  const merged = { ...base };
  for (const [key, value] of Object.entries(alternative || {})) {
    if (Array.isArray(value)) merged[key] = [...(base[key] || []), ...value];
    else if (value && typeof value === "object") merged[key] = { ...(base[key] || {}), ...value };
    else merged[key] = value;
  }
  return merged;
}

// Returns { query, routePrompt, errors }. errors non-empty = don't run it.
// "anyOf" alternatives become WT+ OR branches; WT+ has no grouping, so each
// branch repeats the shared part.
export function compileSearchSpec(search = {}, context = {}) {
  const { anyOf, ...shared } = search || {};
  if (Array.isArray(anyOf) && anyOf.length) {
    const branches = anyOf.map((alternative) =>
      compileSingleSearchSpec(mergeAlternative(shared, alternative), context)
    );
    const errors = [...new Set(branches.flatMap((branch) => branch.errors))];
    if (branches.some((branch) => branch.routePrompt)) errors.push("special searches can't be combined with anyOf");
    return { query: branches.map((branch) => branch.query).join(" OR "), routePrompt: "", errors };
  }
  return compileSingleSearchSpec(shared, context);
}

function compileSingleSearchSpec(search, context) {
  const errors = [];
  const terms = [];
  const negatedTerms = [];
  const sql = [];

  for (const [key, field] of Object.entries(NAME_FIELDS)) {
    if (search.names?.[key]) terms.push(`${field}=${quoteWtPlusSpecValue(search.names[key])}`);
  }
  for (const place of search.places || []) {
    const field = PLACE_FIELDS[place?.event || "any"];
    if (!field || !place?.text) {
      errors.push(`bad place: ${JSON.stringify(place)}`);
      continue;
    }
    terms.push(`${field}=${quoteWtPlusSpecValue(place.text)}`);
  }
  for (const date of search.dates || []) {
    const compiled = compileDate(date, errors);
    terms.push(...compiled.terms);
    sql.push(...compiled.sql);
  }
  for (const event of search.missingDates || []) {
    if (event === "birth") terms.push("B0");
    else if (event === "death") terms.push("D0");
    else errors.push(`bad missingDates entry: ${event}`);
  }
  if (search.gender) {
    const gender = { male: "male", female: "female", unknown: "NoGender" }[search.gender];
    if (gender) terms.push(gender);
    else errors.push(`bad gender: ${search.gender}`);
  }
  for (const flag of search.flags || []) {
    const definition = SEARCH_SPEC_FLAGS[flag];
    if (!definition) {
      errors.push(`unknown flag: ${flag}`);
      continue;
    }
    (definition.negate ? negatedTerms : terms).push(definition.term);
  }
  for (const [kind, constraint] of Object.entries(search.counts || {})) {
    sql.push(...compileCount(kind, constraint, errors));
  }
  const suggestionCodes = (search.suggestions || []).map(Number).filter((code) => Number.isInteger(code) && code > 0);
  if (suggestionCodes.length) {
    terms.push(
      suggestionCodes.length === 1 ? `Suggestions=${suggestionCodes[0]}` : `Suggestions="${suggestionCodes.join(" ")}"`
    );
  }
  for (const category of search.categories || []) {
    if (!category?.name) continue;
    const field = category.match === "word" ? "CategoryWord" : "CategoryFull";
    terms.push(`${field}=${quoteWtPlusSpecValue(category.name)}`);
  }
  if (search.templateText) terms.push(`TemplateText=${quoteWtPlusSpecValue(search.templateText)}`);
  if (search.manager) terms.push(`Manager=${quoteWtPlusSpecValue(search.manager)}`);
  if (search.managedOnlyBy) {
    // Manager= narrows; the canonicalizer resolves project names to IDs.
    terms.push(`Manager=${quoteWtPlusSpecValue(search.managedOnlyBy)}`);
    const managedOnly = templateSql("managed-only-by", search.managedOnlyBy);
    if (managedOnly) terms.push(managedOnly);
  }
  if (search.haplogroup?.y) {
    terms.push("yDNA", templateSql("y-haplogroup", search.haplogroup.y));
  }
  if (search.haplogroup?.mt) {
    terms.push("mtDNA", templateSql("mt-haplogroup", search.haplogroup.mt));
  }
  if (Number.isInteger(search.deathAge)) terms.push(`age${search.deathAge}`);
  if (Number.isInteger(search.findAGraveCemetery)) terms.push(`fgcem${search.findAGraveCemetery}`);
  for (const [key, field] of [
    ["ancestorsOf", "Ancestors"],
    ["descendantsOf", "Descendants"],
    ["cc7Of", "CC7"],
  ]) {
    if (!search.tree?.[key]) continue;
    const root = compileTreeRoot(search.tree[key], context);
    if (root) terms.push(`${field}=${root}`);
    else errors.push(`unknown tree root: ${search.tree[key]}`);
  }

  const scopeQuery = [...terms.filter(Boolean), ...(sql.length ? [sqlTerm(sql)] : [])].join(" ");
  if (search.special) {
    // The routes parse "<place> <from>-<to> …", so give them that scope text.
    const place = (search.places || [])[0]?.text || "";
    const birth = (search.dates || []).find((date) => (date?.event || "birth") === "birth");
    const years = birth && asYear(birth.from) && asYear(birth.to) ? `${birth.from}-${birth.to}` : "";
    const routePrompt = compileSpecialRoute(search.special, [place, years].filter(Boolean).join(" "), errors);
    return { query: scopeQuery, routePrompt, errors };
  }
  if (!scopeQuery) errors.push("empty search");
  const query = [scopeQuery, ...negatedTerms.map((term) => `NOT ${term}`)].filter(Boolean).join(" ");
  return { query, routePrompt: "", errors };
}

// ---------------------------------------------------------------------------
// What the AI is told. It fills the spec; it never writes WT+ syntax.

const SPEC_EXAMPLES = [
  [
    "Shropshire unsourced born in 1820s",
    {
      action: "search",
      understood: "Unsourced profiles in Shropshire, born 1820-1829",
      assumptions: ["Shropshire could be any life event, so I matched birth, marriage or death place"],
      search: {
        places: [{ text: "Shropshire", event: "any" }],
        dates: [{ event: "birth", from: 1820, to: 1829 }],
        flags: ["Unsourced"],
      },
    },
  ],
  [
    "Devon births, post-1850",
    {
      action: "search",
      understood: "Profiles born in Devon in 1851 or later",
      search: { places: [{ text: "Devon", event: "birth" }], dates: [{ event: "birth", from: 1851 }] },
    },
  ],
  [
    "Dickin 19th century and female",
    {
      action: "search",
      understood: "Women with the surname Dickin born 1800-1899",
      assumptions: ["Dickin read as a surname"],
      search: { names: { anyLastName: "Dickin" }, dates: [{ event: "birth", from: 1800, to: 1899 }], gender: "female" },
    },
  ],
  [
    "Cheshire marriages with over 6 kids in the 20th century",
    {
      action: "search",
      understood: "People married in Cheshire 1900-1999 with more than 6 children",
      search: {
        places: [{ text: "Cheshire", event: "marriage" }],
        dates: [{ event: "marriage", from: 1900, to: 1999 }],
        counts: { children: { min: 7 } },
      },
    },
  ],
  [
    "Beacall no father but has a mother",
    {
      action: "search",
      understood: "Beacall profiles with a mother but no father",
      search: { names: { anyLastName: "Beacall" }, flags: ["NoFather", "HasMother"] },
    },
  ],
  [
    "England ProjectManaged or PPP",
    {
      action: "search",
      understood: "England profiles that are project-managed or project-protected",
      search: { places: [{ text: "England" }], anyOf: [{ flags: ["ProjectManaged"] }, { flags: ["PPP"] }] },
    },
  ],
  [
    "Lancashire 1800-1899 large spousal age gaps (> 20 years)",
    {
      action: "search",
      understood: "Lancashire couples born 1800-1899 more than 20 years apart in age",
      search: {
        places: [{ text: "Lancashire" }],
        dates: [{ event: "birth", from: 1800, to: 1899 }],
        special: { type: "spousalAgeGap", minYears: 20 },
      },
    },
  ],
  [
    "Lancashire 1800s miners",
    {
      action: "clarify",
      understood: "Lancashire miners, but the period is unclear",
      question: 'By "1800s" do you mean the whole 19th century or just 1800-1809?',
      options: [
        { label: "19th century (1800–1899)", prompt: "Lancashire 1800-1899 miners" },
        { label: "Decade 1800–1809", prompt: "Lancashire 1800-1809 miners" },
      ],
    },
  ],
  [
    "living people in Kent",
    {
      action: "unsupported",
      understood: "Living people in Kent",
      reason: "WikiTree+ doesn't index whether a person is living, so I can't filter on it.",
    },
  ],
];

function describeFlags() {
  return Object.entries(SEARCH_SPEC_FLAGS)
    .map(([flag, { meaning }]) => `${flag} (${meaning})`)
    .join("; ");
}

export function buildSearchSpecInstructions({
  today = "",
  userWtId = "",
  currentProfileWtId = "",
  suggestionCatalog = "",
} = {}) {
  return [
    "You read genealogy search requests for WikiTree and say precisely what the user is asking for, as JSON.",
    "You do NOT write any query language. Code turns your JSON into the search, so only use the fields below.",
    "Reply with one JSON object and nothing else.",
    "",
    "Reply shapes:",
    '{"action":"search","understood":"...","assumptions":["..."],"search":{...}}',
    '{"action":"clarify","understood":"...","question":"...","options":[{"label":"...","prompt":"the full request, reworded so it is no longer ambiguous"}]}',
    '{"action":"unsupported","understood":"...","reason":"one sentence the user will read"}',
    "",
    "search fields (all optional; everything inside one search must ALL be true):",
    '- names: {"lastNameAtBirth","currentLastName","anyLastName","firstName"}. Use anyLastName for a plain surname.',
    '- places: [{"text":"Place, Country","event":"birth|death|marriage|any"}]. "born in X" / "X births" = birth; "died in X" / "X deaths" = death; "married in X" / "X marriages" = marriage; a bare place = any.',
    '- dates: [{"event":"birth|death|marriage","from":YEAR,"to":YEAR}] — whole years, both inclusive, either may be left out.',
    '- missingDates: ["birth","death"] — the date is blank.',
    '- gender: "male|female|unknown".',
    `- flags: [${Object.keys(SEARCH_SPEC_FLAGS).join(", ")}]. Meanings: ${describeFlags()}.`,
    '- counts: {"children"|"siblings"|"marriages": {"min":N,"max":N,"exact":N}}.',
    "- suggestions: [WikiTree data-quality suggestion codes].",
    '- categories: [{"name":"...","match":"full|word"}] — full = exact category name, word = any category containing the word.',
    '- templateText: "text found inside templates on the profile".',
    '- manager: "manager WikiTree ID or project name"; managedOnlyBy: same, when it must be the ONLY manager.',
    '- haplogroup: {"y":"R-M269"} or {"mt":"H1a"}.',
    "- deathAge: N (died aged N). findAGraveCemetery: N (Find a Grave cemetery ID).",
    '- tree: {"ancestorsOf"|"descendantsOf"|"cc7Of": "me" | "current" | a WikiTree ID like "Darwin-15"}.',
    '- special: one of {"type":"spousalAgeGap","minYears":N} | {"type":"parentAgeAtBirth","underAge":N,"overAge":N} | {"type":"siblingBirthGap","maxMonths":N} | {"type":"marriedNoChildren"} | {"type":"createdRecently","days":N}. Put the place and birth years in places/dates as usual.',
    '- anyOf: [ {partial search}, ... ] — for "X or Y": each alternative is added to the rest of the search.',
    "",
    "How to read requests:",
    "- Ask (clarify) only when the readings would give clearly different results and nothing in the request picks one. Never ask about how a place is written (county vs any place of that name, with or without the country): a place's text already matches every place containing it. Never ask whether a bare place means birth, marriage or death: use event any.",
    "- A decade (1820s, the 1820s) means born 1820-1829.",
    '- "1800s", "1700s" etc. are ambiguous (whole century or first decade): reply clarify, unless the rest of the request settles it.',
    '- "19th century" = 1800-1899. "after 1850" / "post-1850" = from 1851. "before 1750" / "earlier than 1750" = to 1749. "between 1800 and 1850" = 1800-1850.',
    "- A year range with no event word is a birth range.",
    '- "age 42", "aged 42", "died at 42" = deathAge 42. Searches cannot find people by their current age, so never offer that reading.',
    "- A capitalised word that is not a well-known place is probably a surname: use anyLastName and say so in assumptions.",
    '- "no manager" / "orphaned" = Orphan. "England project" etc. is a manager.',
    '- "no birth or death date" = suggestions [131,132,133,134]. "no biography" = 802.',
    "- Occupations or groups (miners, soldiers) are category words; use anyOf when several words fit.",
    "- If a request needs something no field can express, reply unsupported and say what can't be done. Never drop part of a request silently; if you ignore a word, list it in assumptions.",
    "- understood is a plain-English restatement the user will see. assumptions are the choices you made.",
    "",
    "Context:",
    today ? `- Today is ${today}.` : "",
    userWtId ? `- The user is ${userWtId} ("me", "my").` : "- The user is not logged in.",
    currentProfileWtId ? `- The profile being viewed is ${currentProfileWtId} ("this person", "current").` : "",
    "",
    "Examples (request => reply):",
    ...SPEC_EXAMPLES.map(([request, reply]) => `${request} => ${JSON.stringify(reply)}`),
    ...(suggestionCatalog ? ["", "Data-quality suggestion codes:", suggestionCatalog] : []),
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");
}

// Reads the AI reply. kind: search | clarify | unsupported | legacy (old {query}) | invalid.
export function readSearchSpecReply(text) {
  const raw = String(text || "");
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { kind: "invalid", error: "reply was not JSON" };
  }
  const understood = String(parsed?.understood || "").trim();
  const assumptions = (Array.isArray(parsed?.assumptions) ? parsed.assumptions : []).map(String).filter(Boolean);
  if (parsed?.action === "clarify") {
    const options = (Array.isArray(parsed.options) ? parsed.options : []).filter(
      (option) => option?.label && option?.prompt
    );
    return options.length >= 2 && parsed.question
      ? { kind: "clarify", understood, question: String(parsed.question), options }
      : { kind: "invalid", error: "clarify needs a question and at least two options with label and prompt" };
  }
  if (parsed?.action === "unsupported") {
    return { kind: "unsupported", understood, reason: String(parsed.reason || "").trim() };
  }
  if (parsed?.search && typeof parsed.search === "object") {
    return { kind: "search", understood, assumptions, search: parsed.search };
  }
  if (typeof parsed?.query === "string") {
    return { kind: "legacy", understood, parsed };
  }
  return { kind: "invalid", error: "no action, search or query in the reply" };
}
