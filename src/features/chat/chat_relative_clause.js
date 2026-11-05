// "Frederick Beacall mother Mary Ann", "Philip Beacall son Thomas Henry": a person to search for, and
// relatives' names to check on the results (chat_profile_search.js), with or without AI (the user,
// 2026-10-21: Mary Ann is her first name, her surname unknown). searchPerson isn't given them: its
// motherFirstName "Mary Ann" found 0 of the 56 Frederick Beacalls (live, 2026-10-21).

const RELATION_WORDS = {
  mother: "mother",
  mum: "mother",
  mom: "mother",
  father: "father",
  dad: "father",
  son: "son",
  daughter: "daughter",
  child: "child",
  sons: "son",
  daughters: "daughter",
  children: "child",
  kids: "child",
};
const NAME_STOP_WORD =
  /^(?:born|died|b|d|in|from|of|and|or|with|who|whose|before|after|between|circa|abt|about|the|a|an|but|no|not|nor|without|unknown|missing|known|listed|recorded|any|has|have|had|is|was|are|were|living|alive|dead|deceased|only|also|both|his|her|their|mother|mum|mom|father|dad|parent|parents|son|sons|daughter|daughters|child|children|kids|spouse|wife|husband|married|under|over|aged|age|older|younger|than|when|at|to|on|for|same)$/i;
// ("with no father but a mother" is about having one, not a name)
const PERSON_ENDS_WITH_PRESENCE_WORD = /\b(?:no|not|without|has|have|had|a|an)$/i;
const LEAD = String.raw`(?:(?:with|whose|and|who\s+had|had)\s+)?(?:(?:a|an|his|her|their)\s+)?`;
// ("mother's name Mary Ann", "son named George", "father: John")
const POSSESSIVE_NAME = String.raw`(?:['’]s\s+(?:first\s+)?name)?`;
const NAMED = String.raw`(?:(?:was|is|were|are|named|called)\s+)?(?:[:=]\s*)?`;
// "son of John" / "daughter of Mary" name a parent; "mother Mary Ann" too; "son of Philip and Martha"
// and "parents Philip and Martha" name both.
const PARENT_CLAUSE = new RegExp(
  String.raw`^(.+?)\s*,?\s+${LEAD}(?:(mother|mum|mom|father|dad|parents)${POSSESSIVE_NAME}\s*[:=]?\s+${NAMED}|(son|daughter|child)\s+of\s+)(.+)$`,
  "i"
);
// "son George", "with a daughter named Emily", "father of Albert", "mother of a son called Robert",
// "children George and Emily", "sons Robert, William and Alfred", "father of Robert and Jane"
const CHILD_CLAUSE = new RegExp(
  String.raw`^(.+?)\s*,?\s+${LEAD}(?:(sons|daughters|children|kids|son|daughter|child)${POSSESSIVE_NAME}\s*[:=]?\s+(?!of\b)${NAMED}|(?:father|mother|parent|dad|mum|mom)\s+of\s+(?:(?:a|an)\s+)?(?:(son|daughter|child)\s+(?:(?:named|called)\s+)?)?)(.+)$`,
  "i"
);

const COMMAND_WORD = /^(?:who|what|which|whose|how|when|where|why|did|does|do|show|find|list|search|tell|give|get|bio|biography|write|make|draw|chart|map)$/i;
// (a name, or a WikiTree ID such as Beacall-10)
const isPersonStart = (word) => !COMMAND_WORD.test(word || "") && (isNameWord(word) || /^\p{L}[\p{L}'’ -]*-\d+$/u.test(word || ""));
export const isNameWord = (word) => /^[\p{L}'’.-]+$/u.test(word || "") && !NAME_STOP_WORD.test(word);

// A name (up to 4 words) from the start of the text; with list, more joined by commas or "and"
// ("George and Emily", "Robert, William and Alfred"). The rest goes back to the search.
function takeNames(text, { list = false, max = 8 } = {}) {
  const tokens = String(text || "")
    .replace(/,/g, " , ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const names = [];
  for (;;) {
    const words = [];
    while (words.length < 4 && isNameWord(tokens[0])) words.push(tokens.shift());
    if (!words.length) break;
    names.push(words.join(" "));
    if (!list || names.length >= max) break;
    // (", and Emily", ", Emily", "and Emily"; not "and his wife" or ", born 1880")
    const gap = tokens[0] === "," && /^and$/i.test(tokens[1] || "") ? 2 : tokens[0] === "," || /^and$/i.test(tokens[0] || "") ? 1 : 0;
    if (!gap || !isNameWord(tokens[gap])) break;
    tokens.splice(0, gap);
  }
  const rest = tokens
    .join(" ")
    .replace(/\s+,/g, ",")
    .replace(/^,\s*/, "");
  return { names, rest };
}

function splitWith(regex, text, relationOf, { list = false, max } = {}) {
  const match = String(text || "")
    .trim()
    .match(regex);
  if (!match) return null;
  const { names, rest } = takeNames(match[4], { list, max });
  const person = match[1]
    .trim()
    .replace(/['’]s$/i, "")
    .replace(/(?:\s*,)?\s+(?:and|with|whose)$/i, "");
  if (!names.length || !person || PERSON_ENDS_WITH_PRESENCE_WORD.test(person)) return null;
  // A question or command isn't a person: "Who is the mother of Philip Beacall?", "Is Philip Beacall
  // the father of Jane?", "bio for Philip Beacall son of Philip".
  const personWords = person.split(/\s+/);
  if (!isPersonStart(personWords[0]) || NAME_STOP_WORD.test(personWords[personWords.length - 1])) return null;
  const role = relationOf(match);
  return { mainQuery: [person, rest].filter(Boolean).join(" "), filters: names.map((name) => ({ role, name })) };
}

/** One parent clause, perhaps naming both: { mainQuery, parentFilters: [{ role: "mother"|"father"|"either", name }] }, or null. */
export function splitParentClause(query) {
  const both = (m) => Boolean(m[3]) || /^parents?$/i.test(m[2] || "");
  const match = String(query || "")
    .trim()
    .match(PARENT_CLAUSE);
  const split = splitWith(PARENT_CLAUSE, query, (m) => (both(m) ? "either" : RELATION_WORDS[m[2].toLowerCase()]), {
    list: Boolean(match && both(match)),
    max: 2,
  });
  return split && { mainQuery: split.mainQuery, parentFilters: split.filters };
}

/** One child clause, perhaps naming several: { mainQuery, childFilters: [{ role: "son"|"daughter"|"child", name }] }, or null. */
export function splitChildClause(query) {
  const split = splitWith(CHILD_CLAUSE, query, (m) => RELATION_WORDS[String(m[2] || m[3] || "child").toLowerCase()], {
    list: true,
  });
  return split && { mainQuery: split.mainQuery, childFilters: split.filters };
}

/**
 * Every relative clause, children first ("father of George mother Mary": the parent reader would stop at
 * "father of"): { mainQuery, relatives: [{ role, name }] } with roles mother/father/either/son/daughter/child.
 */
export function splitRelativeClauses(query) {
  let mainQuery = String(query || "").trim();
  const relatives = [];
  for (let clauses = 0; clauses < 6; clauses += 1) {
    const child = splitChildClause(mainQuery);
    const parent = child ? null : splitParentClause(mainQuery);
    if (!child && !parent) break;
    mainQuery = (child || parent).mainQuery;
    relatives.push(...(child ? child.childFilters : parent.parentFilters));
  }
  return { mainQuery, relatives };
}

export const PARENT_ROLES = ["mother", "father", "either"];

const PLURAL_ROLES = { son: "sons", daughter: "daughters", child: "children", either: "parents" };
const listOfNames = (names) => (names.length < 2 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

/** "a mother named Mary Ann and children named George and Emily" */
export function describeRelatives(relatives) {
  const groups = [];
  for (const { role, name } of relatives) {
    const group = groups.find((g) => g.role === role);
    if (group) group.names.push(name);
    else groups.push({ role, names: [name] });
  }
  return listOfNames(
    groups.map(({ role, names }) =>
      names.length > 1 && PLURAL_ROLES[role]
        ? `${PLURAL_ROLES[role]} named ${listOfNames(names)}`
        : names.map((name) => `a ${role === "either" ? "parent" : role} named ${name}`).join(" and ")
    )
  );
}

// "Frederick Beacall mother Mary Ann", "… married Sarah son George": a name, with relatives
// (and perhaps a spouse) to check, so the person search's to run (null when it isn't that).
export function nameWithRelatives(prompt) {
  const { mainQuery, relatives } = splitRelativeClauses(String(prompt || "").replace(/[.?!]+$/, ""));
  if (!relatives.length) return null;
  const spouse = mainQuery.match(
    /^(.+?)\s*,?\s+(?:married(?:\s+to)?|wed|whose\s+(?:wife|husband|spouse)\s+(?:was|is))\s+([\p{L}'’.-]+(?:\s+[\p{L}'’.-]+){0,3})$/iu
  );
  return {
    name: spouse ? spouse[1].replace(/\s+(?:and|with)$/i, "") : mainQuery,
    relatives,
    spouse: spouse ? spouse[2] : "",
  };
}

/**
 * Every word of the name is one of the relative's names ("Mary Ann" = First Mary, Middle Ann; "Maryann").
 * A final e doesn't count: the two Frederick Beacalls with a mother "Mary Ann" have "Mary Anne" (live, 2026-10-21).
 */
export function matchRelativeByName(person, name, { normalizeText } = {}) {
  const normalize =
    normalizeText ||
    ((value) =>
      String(value || "")
        .trim()
        .toLowerCase());
  const words = (value) =>
    normalize(String(value || ""))
      .replace(/['’.]/g, "")
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((word) => (word.length > 3 ? word.replace(/e$/, "") : word));
  const wanted = words(name);
  if (!person || !wanted.length) return false;
  const names = [
    person.FirstName,
    person.MiddleName,
    person.RealName,
    person.Nicknames,
    person.LastNameAtBirth,
    person.LastNameCurrent,
    person.LastNameOther,
  ];
  const have = new Set(names.flatMap(words));
  const joined = wanted.join("");
  return wanted.every((word) => have.has(word)) || (wanted.length > 1 && (have.has(joined) || have.has(`${joined}e`)));
}
