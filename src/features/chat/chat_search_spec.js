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
import { GROUP_BY_FIELDS } from "./chat_group_rows";

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
  Notables: { term: "Notables", meaning: "notable / famous people (Notables Project)" },
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
// [Father Status]/[Mother Status] hold the edit-form relationship status
// (codes as in change_family_lists.js; Cheshire uncertain fathers: 595, live 2026-10-03).
const PARENT_STATUS_FIELDS = { father: "[Default].[Father Status].AsNumber", mother: "[Default].[Mother Status].AsNumber" };
const PARENT_STATUS_CODES = { nonBiological: 5, uncertain: 10, certain: 20, dnaConfirmed: 30 };
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

// WT+ ageN is exact only, so a range compares the yyyymmdd numbers: a
// difference >= 1000000 means 100+ years. Birth must be a full year (> 1e7) or
// the difference is the death date itself (Devon 100+: 1283 → 252; live, 2026-10-03).
function compileDeathAgeRange({ min, max } = {}, errors) {
  const diff = "[Default].[Death Date].AsNumber - [Default].[Birth Date].AsNumber";
  const parts = [];
  if (Number.isInteger(min) && min > 0) parts.push(`${diff} >= ${min * 10000}`);
  if (Number.isInteger(max) && max >= 0) parts.push(`${diff} < ${(max + 1) * 10000}`, `${DATE_FIELDS.death} > 0`);
  if (!parts.length) {
    errors.push("bad deathAge range");
    return [];
  }
  return [`${DATE_FIELDS.birth} > 10000000`, ...parts];
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
    case "diedInChildbirth":
      return `${scope}women who died in childbirth`;
    case "createdRecently":
      return `${scope}profiles added in the last ${Number(special.days) || 30} days`;
    default:
      errors.push(`unknown special search: ${special?.type}`);
      return "";
  }
}

export function compileTreeRoot(value, context) {
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

// "Who else is buried in this cemetery?": the AI says sameCemeteryAs, and code
// reads that person's categories (live C13, 2026-10-03: Cook-8721 is in
// "Motueka Cemetery, Motueka, Tasman").
const CEMETERY_CATEGORY_RE =
  /\b(?:cemetery|cemeteries|churchyard|graveyard|burial|burying|mausoleum|memorial\s+(?:park|gardens?)|necropolis|crematorium|kirkyard|friedhof|cimeti[eè]re|begraafplaats|kerkhof|cementerio|cimitero)\b/i;

export function pickCemeteryCategories(categories) {
  return [
    ...new Set(
      (categories || [])
        .map((category) => String(category || "").replace(/_/g, " ").trim())
        .filter((category) => CEMETERY_CATEGORY_RE.test(category))
    ),
  ];
}

// Replaces sameCemeteryAs with exact category terms (OR'd when there are several).
export function applySameCemetery(search, cemeteryCategories) {
  const { sameCemeteryAs, ...rest } = search || {};
  const names = cemeteryCategories || [];
  if (names.length === 1) return { ...rest, categories: [...(rest.categories || []), { name: names[0], match: "full" }] };
  return { ...rest, anyOf: names.map((name) => ({ categories: [{ name, match: "full" }] })) };
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
  if (search.groupBy !== undefined && !GROUP_BY_FIELDS[search.groupBy]) errors.push(`unknown groupBy: ${search.groupBy}`);
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
  // "emigrated to Australia": died there, NOT born there (WT+ keeps people
  // with no birth place; Beacalls 19 → 6, 3 of them blank; live, 2026-10-03).
  for (const place of search.notPlaces || []) {
    const field = PLACE_FIELDS[place?.event || "any"];
    if (!field || !place?.text) {
      errors.push(`bad notPlaces entry: ${JSON.stringify(place)}`);
      continue;
    }
    negatedTerms.push(`${field}=${quoteWtPlusSpecValue(place.text)}`);
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
  // D6, "Shropshire with no birth place": the AI picked an unrelated suggestion
  // code (live, 2026-10-03, 0 found); the blank field itself is 2,031 of 57,770.
  for (const event of search.missingPlaces || []) {
    if (event === "birth") sql.push("[Default].[Birth Location] = ''");
    else if (event === "death") sql.push("[Default].[Death Location] = ''");
    else errors.push(`bad missingPlaces entry: ${event}`);
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
  for (const entry of search.parentStatus || []) {
    const field = PARENT_STATUS_FIELDS[entry?.parent];
    const code = PARENT_STATUS_CODES[entry?.status];
    if (!field || !code) {
      errors.push(`bad parentStatus entry: ${JSON.stringify(entry)}`);
      continue;
    }
    sql.push(`${field} = ${code}`);
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
  else if (search.deathAge) sql.push(...compileDeathAgeRange(search.deathAge, errors));
  if (Number.isInteger(search.findAGraveCemetery)) terms.push(`fgcem${search.findAGraveCemetery}`);
  if (search.sameCemeteryAs) errors.push("sameCemeteryAs was not resolved to a cemetery category");
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
    "WWI soldiers from Cheshire",
    {
      action: "search",
      understood: "People in World War I categories with a Cheshire place",
      assumptions: ["World War I categories cover soldiers, sailors and nurses; Cheshire matched any life event"],
      search: { places: [{ text: "Cheshire", event: "any" }], categories: [{ name: "World War I", match: "word" }] },
    },
  ],
  [
    "Beacalls who emigrated to Australia",
    {
      action: "search",
      understood: "Beacalls who died in Australia but were not born there",
      assumptions: ["Emigrated = died in Australia, born elsewhere; people with no birth place recorded are included"],
      search: {
        names: { anyLastName: "Beacall" },
        places: [{ text: "Australia", event: "death" }],
        notPlaces: [{ text: "Australia", event: "birth" }],
      },
    },
  ],
  [
    "who else is buried in this cemetery?",
    {
      action: "search",
      understood: "People buried in the same cemetery as the current profile",
      assumptions: [],
      search: { sameCemeteryAs: "current" },
    },
  ],
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
    "most common surnames in Shropshire before 1800",
    {
      action: "search",
      understood: "Profiles in Shropshire born before 1800, counted by surname at birth",
      search: { places: [{ text: "Shropshire" }], dates: [{ event: "birth", to: 1799 }], groupBy: "lnab" },
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
    '- notPlaces: same shape as places; the place must NOT match. "emigrated to X" / "immigrants to X" = places [{X, death}] + notPlaces [{X, birth}]; "emigrated from X" = places [{X, birth}] + notPlaces [{X, death}]. Say in assumptions that people with no birth (or death) place are included.',
    '- dates: [{"event":"birth|death|marriage","from":YEAR,"to":YEAR}] — whole years, both inclusive, either may be left out.',
    '- missingDates: ["birth","death"] — the date is blank.',
    '- missingPlaces: ["birth","death"] — the place is blank ("no birth place", "missing death location"). A place in the same request is then event "any".',
    '- gender: "male|female|unknown".',
    `- flags: [${Object.keys(SEARCH_SPEC_FLAGS).join(", ")}]. Meanings: ${describeFlags()}.`,
    '- counts: {"children"|"siblings"|"marriages": {"min":N,"max":N,"exact":N}}.',
    "- suggestions: [WikiTree data-quality suggestion codes].",
    '- categories: [{"name":"...","match":"full|word"}] — full = exact category name, word = any category containing the word.',
    '- templateText: "text found inside templates on the profile".',
    '- manager: "manager WikiTree ID or project name"; managedOnlyBy: same, when it must be the ONLY manager.',
    '- haplogroup: {"y":"R-M269"} or {"mt":"H1a"}.',
    '- deathAge: N (died aged exactly N), or {min, max} for a range ("lived past 90" = {min: 91}, "died under 5" = {max: 4}). findAGraveCemetery: N (Find a Grave cemetery ID).',
    '- parentStatus: [{"parent":"father"|"mother","status":"uncertain"|"nonBiological"|"certain"|"dnaConfirmed"}] — the relationship status set on the profile ("uncertain fathers" = father uncertain; "DNA-confirmed mothers" = mother dnaConfirmed).',
    '- "Oldest people" / "longest-lived" = deathAge {min: 100} (results can not be sorted, so a high minimum age stands in for "oldest").',
    `- groupBy: one of ${Object.keys(GROUP_BY_FIELDS).join(", ")} — code runs the search, then counts the results in groups. "most common surnames in X" = groupBy lnab; "X births by decade" = groupBy birthDecade; "how many per country" = groupBy country. Never reply unsupported just because a request counts, ranks or groups results.`,
    '- sameCemeteryAs: "me" | "current" | a WikiTree ID — buried in the same cemetery as that person (code looks up the cemetery).',
    '- tree: {"ancestorsOf"|"descendantsOf"|"cc7Of": "me" | "current" | a WikiTree ID like "Darwin-15"}.',
    '- special: one of {"type":"spousalAgeGap","minYears":N} | {"type":"parentAgeAtBirth","underAge":N,"overAge":N} | {"type":"siblingBirthGap","maxMonths":N} | {"type":"marriedNoChildren"} | {"type":"diedInChildbirth"} (mothers who died within weeks of a child’s birth; the place is the child’s birth place) | {"type":"createdRecently","days":N}. Put the place and birth years in places/dates as usual.',
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
    // D11 "Beacalls born in Australia": AllLastNames=Beacalls found 0 (live, 2026-10-03).
    '- A plural surname means people of that name: "Beacalls" → "Beacall", "the Joneses" → "Jones", "Smiths" → "Smith". Never search for the plural form.',
    // L8 "Cooks born in Shropshire 1800-1899" became CategoryFull=England__Cooks
    // (0 found; live, 2026-10-03), though "Cooks born in Kent in the 1830s" was a surname.
    '- A capitalised plural that is also a job ("Cooks", "Bakers", "Taylors", "Smiths", "Carpenters") opening the prompt is a surname. Read it as an occupation only when the user says so ("who were cooks", "worked as a baker", "cooks by trade") or writes it in lowercase mid-sentence.',
    '- "no manager" / "orphaned" = Orphan. "England project" etc. is a manager.',
    '- "no birth or death date" = suggestions [131,132,133,134]. "no biography" = 802.',
    // "WWI soldiers from Cheshire": "World War I" + "Soldiers" = 1, "World War I" alone = 339
    // (Civil War 9,312 vs 40; live, 2026-10-03). War categories name the unit, not "soldiers".
    '- A war is ONE category word: "World War I", "World War II", "Civil War", "Boer War", "Korean War". Never add a role word (soldiers, veterans, servicemen, military) as another category word: war categories name the unit and the war, so the role word removes almost everyone.',
    // WT+ counts, 2026-10-03: Twins 36,431 (Lancashire births 378), Centenarians 10,658,
    // Emigrants 21,649, Immigrants 42,762, Influenza 569, Convicts 5,105, Executed 548;
    // Pandemic 3,477 (D1918 2,063); no Childbirth or Drowned categories.
    "- Occupations or groups (miners, soldiers) are category words; use anyOf when several words fit, including the common synonyms WikiTree categories use (doctors: Doctors, Physicians, Surgeons; sailors: Mariners, Sailors, Seamen; farmers: Farmers, Yeomen, Husbandmen; teachers: Teachers, Schoolmasters, Schoolmistresses; clergy: Clergy, Ministers, Priests, Vicars). WikiTree also categorises twins/triplets (\"Twins\", \"Triplets\"), centenarians, convicts, emigrants/immigrants, executed people and influenza (flu) deaths, so those are category words too, never unsupported. The 1918 flu: anyOf category words \"Pandemic\" and \"Influenza\", with death dates 1918-1920.",
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
