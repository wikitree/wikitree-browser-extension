// Relationship details (2026-10-04): when two people are blood relatives, say how. The
// Relationship Finder (wwwWikiTree getRelationJSON) returns commonAncestors with
// path1Length/path2Length (counting the person: 2 = parent), yDNA/mtDNA flags and an html
// page ("Relationship Found … X is the third great grandnephew of Y", or "Direct
// Relationship Found" with numbered steps and no common ancestors). From that: who the
// common ancestors are and how far up, cousin degree, every route, and the DNA that
// relatives this close share.

const GENOME_CM = 6800; // (about: two copies of ~3400 cM of autosomes)

const ORDINALS = ["", "1st", "2nd", "3rd"];
export const ordinal = (n) => ORDINALS[n] || `${n}th`;
const REMOVED = ["", "once", "twice", "three times", "four times"];
const removedWord = (n) => REMOVED[n] || `${n} times`;

/** "parents", "grandparents", "great-grandparents", "2nd great-grandparents"… (noun: "parent", "grandmother"…). */
export function ancestorWord(generations, noun = "parents") {
  if (generations <= 1) return noun;
  if (generations === 2) return `grand${noun}`;
  if (generations === 3) return `great-grand${noun}`;
  return `${ordinal(generations - 2)} great-grand${noun}`;
}

/** What person 1 is to person 2, from each one's generations below the common ancestors. */
export function relationshipName(gens1, gens2, { half = false, gender1 = "" } = {}) {
  const g = String(gender1 || "").toLowerCase();
  const pick = (male, female, neutral) => (g === "male" ? male : g === "female" ? female : neutral);
  const pre = half ? "half-" : "";
  if (gens1 === 1 && gens2 === 1) return pre + pick("brother", "sister", "sibling");
  if (gens1 === 1) {
    // Person 1 is in the older line: uncle, great-uncle, 2nd great-uncle…
    const word = pick("uncle", "aunt", "aunt or uncle");
    const up = gens2 - 1;
    return up === 1 ? pre + word : up === 2 ? `great-${pre}${word}` : `${ordinal(up - 1)} great-${pre}${word}`;
  }
  if (gens2 === 1) {
    const word = pick("nephew", "niece", "niece or nephew");
    const down = gens1 - 1;
    return down === 1 ? pre + word : down === 2 ? `${pre}grand${word}` : down === 3 ? `great-${pre}grand${word}` : `${ordinal(down - 2)} great-${pre}grand${word}`;
  }
  const degree = Math.min(gens1, gens2) - 1;
  const removed = Math.abs(gens1 - gens2);
  return `${ordinal(degree)} ${pre}cousin${removed ? ` ${removedWord(removed)} removed` : ""}`;
}

// The chance that relatives share any DNA a test would detect, by meioses between them.
// AncestryDNA's published odds ("Should other family members get tested?"): 3rd cousins
// (8) 98%, 4th (10) 71%, 5th (12) 32%, 6th (14) 11%, 8th (18) under 1%; the removed
// cousins in between are estimated.
const DETECT = { 8: 98, 9: 90, 10: 71, 11: 50, 12: 32, 13: 19, 14: 11, 15: 7, 16: 4, 17: 2 };
export function detectChance(meioses) {
  if (meioses <= 7) return 100;
  return DETECT[meioses] ?? 1;
}

export const SHARED_CM_SOURCE = "Shared cM Project 4.0 (Blaine Bettinger, 2020), as in DNA Painter's tool: https://dnapainter.com/tools/sharedcmv4";
export const MATCH_ODDS_SOURCE = "AncestryDNA's published odds of a match (3rd cousins 98%, 4th 71%, 5th 32%, 6th 11%, 8th under 1%; relationships in between are estimated)";

// Shared cM Project 4.0, from DNA Painter's tool (2026-10-06): [average, low, high] cM;
// the range is the project's 99th-percentile range. These are measured among people who
// match, so a relationship that may not match at all has a range that starts at 0.
export const SHARED_CM_PROJECT = {
  Parent: [3485, 2376, 3720],
  Sibling: [2613, 1613, 3488],
  "Half Sibling": [1759, 1160, 2436],
  Grandparent: [1754, 984, 2462],
  "Aunt / Uncle": [1741, 1201, 2282],
  "Half Aunt / Uncle": [871, 492, 1315],
  "Great-Grandparent": [887, 485, 1486],
  "Great-Aunt / Uncle": [850, 330, 1467],
  "Half Great-Aunt / Uncle": [431, 184, 668],
  "Great-Great-Aunt / Uncle": [420, 186, 713],
  "Half GG-Aunt / Uncle": [208, 103, 284],
  "1C": [866, 396, 1397],
  "1C1R": [433, 102, 980],
  "1C2R": [221, 33, 471],
  "1C3R": [117, 25, 238],
  "2C": [229, 41, 592],
  "2C1R": [122, 14, 353],
  "2C2R": [71, 0, 244],
  "2C3R": [51, 0, 154],
  "3C": [73, 0, 234],
  "3C1R": [48, 0, 192],
  "3C2R": [36, 0, 166],
  "3C3R": [27, 0, 98],
  "4C": [35, 0, 139],
  "4C1R": [28, 0, 126],
  "4C2R": [22, 0, 93],
  "4C3R": [19, 0, 60],
  "5C": [25, 0, 117],
  "5C1R": [21, 0, 80],
  "5C2R": [18, 0, 65],
  "5C3R": [13, 0, 30],
  "6C": [18, 0, 71],
  "6C1R": [15, 0, 56],
  "6C2R": [13, 0, 45],
  "7C": [14, 0, 57],
  "7C1R": [12, 0, 50],
  "8C": [11, 0, 42],
  "Half 1C": [449, 156, 979],
  "Half 1C1R": [224, 62, 469],
  "Half 1C2R": [125, 16, 269],
  "Half 1C3R": [60, 0, 120],
  "Half 2C": [120, 10, 325],
  "Half 2C1R": [66, 0, 190],
  "Half 2C2R": [48, 0, 144],
  "Half 3C": [48, 0, 168],
  "Half 3C1R": [37, 0, 139],
  "Half 3C2R": [27, 0, 78],
};

/** For the AI: the whole table and its sources, so it quotes these figures (and can cite them). */
export function dnaReferenceForAi() {
  const rows = Object.entries(SHARED_CM_PROJECT).map(([label, [avg, low, high]]) => `${label}: ${avg} (${low}–${high})`);
  return [
    `SHARED DNA REFERENCE. Quote these figures and name their source; don't use other numbers or call them WikiTree's.`,
    `Average shared cM (99% range) by relationship, from the ${SHARED_CM_SOURCE}. They are measured among relatives who match; the project has no figures for ancestors beyond great-grandparents (nobody can test them) or for cousins beyond 8th.`,
    rows.join("; "),
    `Odds that relatives share enough DNA to match: ${MATCH_ODDS_SOURCE}.`,
    `An ancestor n generations back passes on about 6800 × 0.5^n cM on average (half each generation); far back, a person may carry none of that ancestor's DNA.`,
  ].join("\n");
}

/** The Shared cM Project row for a relationship → {label, avg, low, high}, or null when the project has none. */
export function sharedCmProject(gens1, gens2, { half = false } = {}) {
  let label = "";
  if (!gens2) {
    label = ["", "Parent", "Grandparent", "Great-Grandparent"][gens1] || "";
  } else if (gens1 === 1 && gens2 === 1) {
    label = "Sibling";
  } else if (gens1 === 1 || gens2 === 1) {
    label = ["", "Aunt / Uncle", "Great-Aunt / Uncle", "Great-Great-Aunt / Uncle"][Math.max(gens1, gens2) - 1] || "";
    if (half && label === "Great-Great-Aunt / Uncle") label = "GG-Aunt / Uncle";
  } else {
    const removed = Math.abs(gens1 - gens2);
    label = `${Math.min(gens1, gens2) - 1}C${removed ? `${removed}R` : ""}`;
  }
  const key = half && gens2 ? `Half ${label}` : label;
  const row = label && SHARED_CM_PROJECT[key];
  return row ? { label: key, avg: row[0], low: row[1], high: row[2] } : null;
}

// Among relatives who do match, by meioses, when the Shared cM Project has no row (it ends at 8th cousins).
const MATCHED_CM = { 8: 73, 9: 48, 10: 35, 11: 28, 12: 25, 13: 21 };
export const matchedCm = (meioses, expected) => (meioses <= 7 ? expected : MATCHED_CM[meioses] || 20);

const roundCm = (cm) => (cm >= 100 ? Math.round(cm / 10) * 10 : cm >= 10 ? Math.round(cm) : Math.round(cm * 10) / 10);

const ancestorName = (entry) => {
  const a = entry?.ancestor || {};
  return a.mDerived?.ShortName || a.displayName || [a.mFirstName, a.mLastNameAtBirth].filter(Boolean).join(" ") || a.mName || "";
};
const ancestorGender = (entry) => String(entry?.ancestor?.mDerived?.Gender || entry?.ancestor?.mGender || "").toLowerCase();

/**
 * json: getRelationJSON's reply. → {kind: "none"} | {kind: "direct", generations} |
 * {kind: "common", routes: [{gens1, gens2, ancestors: [{wtId, name, gender, yDNA, mtDNA}], couple, meioses, cm, chance}], cm}.
 * Routes are grouped by the two path lengths, nearest first; a route with a man and a woman
 * is a couple (a full relationship), one ancestor alone may be a half relationship.
 */
export function analyseRelationship(json) {
  const list = Array.isArray(json?.commonAncestors) ? json.commonAncestors : [];
  const html = String(json?.html || "");
  if (!list.length) {
    if (/Direct Relationship Found/i.test(html)) {
      const steps = (html.replace(/<[^>]+>/g, " ").match(/(?:^|\s)(\d+)\.\s/g) || []).map((s) => Number(s.trim().replace(".", "")));
      const generations = steps.length ? Math.max(...steps) : 0;
      if (generations > 0) {
        // An ancestor passes on half each generation. Nobody can test a distant ancestor, so
        // there are no match odds; the Shared cM Project stops at great-grandparents.
        const cm = roundCm(GENOME_CM * 0.5 ** generations);
        // "1. Murray is the son of A": person 1 is the descendant, so person 2 the ancestor.
        const firstStep = html.replace(/<[^>]+>/g, " ").match(/\b1\.\s([^.]*)/)?.[1] || "";
        const ancestorIs = /\b(?:son|daughter|child)\s+of\b/i.test(firstStep) ? 2 : /\b(?:father|mother|parent)\s+of\b/i.test(firstStep) ? 1 : 0;
        return { kind: "direct", generations, cm, scp: sharedCmProject(generations, 0), ancestorIs };
      }
    }
    return { kind: "none" };
  }
  const groups = new Map();
  for (const entry of list) {
    const gens1 = Number(entry.path1Length) - 1;
    const gens2 = Number(entry.path2Length) - 1;
    if (!(gens1 > 0 && gens2 > 0)) continue;
    const key = `${gens1}:${gens2}`;
    if (!groups.has(key)) groups.set(key, { gens1, gens2, ancestors: [] });
    groups.get(key).ancestors.push({
      wtId: entry.ancestor?.mName || "",
      name: ancestorName(entry),
      gender: ancestorGender(entry),
      yDNA: !!Number(entry.yDNA),
      mtDNA: !!Number(entry.mtDNA),
    });
  }
  const routes = [...groups.values()]
    .map((route) => {
      const men = route.ancestors.filter((a) => a.gender === "male").length;
      const women = route.ancestors.filter((a) => a.gender === "female").length;
      // Fathers first; two couples at the same distance (double cousins) count twice.
      route.ancestors.sort((a, b) => (a.gender === "male" ? 0 : 1) - (b.gender === "male" ? 0 : 1));
      const couples = Math.min(men, women);
      route.couple = couples > 0;
      const shares = Math.max(couples, 0) + (route.ancestors.length - 2 * couples) * 0.5; // (a lone ancestor: half)
      route.meioses = route.gens1 + route.gens2 + (route.couple ? 0 : 1);
      route.cm = roundCm(2 * shares * GENOME_CM * 0.5 ** (route.gens1 + route.gens2));
      route.chance = detectChance(route.meioses);
      route.matchedCm = roundCm(matchedCm(route.meioses, route.cm));
      route.scp = sharedCmProject(route.gens1, route.gens2, { half: !route.couple });
      return route;
    })
    .sort((a, b) => a.gens1 + a.gens2 - (b.gens1 + b.gens2) || a.gens1 - b.gens1);
  if (!routes.length) return { kind: "none" };
  return { kind: "common", routes, cm: roundCm(routes.reduce((sum, route) => sum + route.cm, 0)) };
}

const joinNames = (names) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);
const possessive = (label) => (label === "you" ? "your" : `${label}'s`);
/** "4C1R" → "4th cousins once removed (4C1R)", "Great-Aunt / Uncle" → "great-aunts and uncles": the tool's labels in words. */
export function sharedCmWords(label) {
  const half = /^Half /.test(label);
  const base = label.replace(/^Half /, "");
  const cousin = base.match(/^(\d)C(?:(\d)R)?$/);
  let words;
  if (cousin) {
    words = `${half ? "half " : ""}${ordinal(Number(cousin[1]))} cousins${cousin[2] ? ` ${removedWord(Number(cousin[2]))} removed` : ""}`;
    return `${words} (${label})`;
  }
  const plain = {
    Parent: "a parent and child",
    Grandparent: "a grandparent and grandchild",
    "Great-Grandparent": "a great-grandparent and great-grandchild",
    Sibling: "siblings",
    "Aunt / Uncle": "aunts or uncles and their nieces or nephews",
    "Great-Aunt / Uncle": "great-aunts or great-uncles",
    "Great-Great-Aunt / Uncle": "2nd great-aunts or great-uncles",
    "GG-Aunt / Uncle": "2nd great-aunts or great-uncles",
  }[base];
  return `${half ? "half-" : ""}${plain || base}`;
}

const scpText = (scp) => `the Shared cM Project 4.0 average for ${sharedCmWords(scp.label)} is ${scp.avg} cM (range ${scp.low}–${scp.high} cM)`;

/**
 * The DNA sentences, with their sources: the Shared cM Project average and range where it
 * has the relationship, and AncestryDNA's odds of a match when not everyone matches.
 */
export function dnaSentence({ cm, chance, matchedCm: matched, scp }, extra = "") {
  const sources = [scp ? SHARED_CM_SOURCE : "", chance < 100 ? MATCH_ODDS_SOURCE : ""].filter(Boolean);
  const cite = sources.length ? `\nSources: ${sources.join("; ")}.` : "";
  if (chance >= 100) {
    if (scp) return `Almost all relatives this close share DNA: ${scpText(scp)}.${extra}${cite}`;
    return `Relatives this close share about ${cm} cM of DNA on average, and almost all share some.${extra}`;
  }
  const odds = chance <= 1 ? "Very few relatives this close (under 2%)" : `About ${chance}% of relatives this close`;
  const amount = scp ? `among those who do, ${scpText(scp)}` : `those who do share roughly ${matched || cm} cM (the Shared cM Project has no figures this far out)`;
  return `${odds} share DNA a test would detect; ${amount}.${extra}${cite}`;
}

const DIRECT_PAIRS = { Parent: "A parent and child", Grandparent: "A grandparent and grandchild", "Great-Grandparent": "A great-grandparent and great-grandchild" };

/**
 * A direct line: the Shared cM Project's figure up to great-grandparents; beyond that,
 * the halving per generation, and why nothing has been measured. ancestor/descendant:
 * labels ("you" or a first name) when the direction is known.
 */
export function directDnaSentence({ generations, cm, scp }, ancestor = "", descendant = "") {
  if (scp) return `${DIRECT_PAIRS[scp.label]} share on average ${scp.avg} cM (range ${scp.low}–${scp.high} cM) in the Shared cM Project 4.0.\nSources: ${SHARED_CM_SOURCE}.`;
  const a = ancestor && ancestor !== "you" ? ancestor : "the ancestor";
  const d = descendant || "the descendant";
  const dOwn = d === "you" ? "your" : d === "the descendant" ? "the descendant's" : `${d}'s`;
  const be = d === "you" ? "are" : "is";
  return [
    `${d === "you" ? "You" : d.charAt(0).toUpperCase() + d.slice(1)} ${be} ${generations} generations below ${a}. Each generation passes on half, so on average that is about ${cm} cM, but inheritance is random: ${dOwn} DNA may include none of ${a === "the ancestor" ? "the ancestor's" : `${a}'s`}.`,
    `Nobody can test someone ${generations} generations back, so there are no measured figures: the Shared cM Project 4.0 (DNA Painter: https://dnapainter.com/tools/sharedcmv4) stops at great-grandparents. DNA evidence for this line comes from matches with ${a === "the ancestor" ? "the ancestor's" : `${a}'s`} other descendants.`,
  ].join("\n");
}

/**
 * The chat lines under the connection answer. label1/label2: "you" or a name (person 1 is
 * the one asked from); gender1 picks uncle/aunt words for other routes.
 */
export function describeRelationship(analysis, label1, label2, { gender1 = "" } = {}) {
  if (!analysis || analysis.kind === "none") return "";
  if (analysis.kind === "direct") {
    if (analysis.ancestorIs === 2) return directDnaSentence(analysis, label2, label1);
    if (analysis.ancestorIs === 1) return directDnaSentence(analysis, label1, label2);
    return directDnaSentence(analysis);
  }
  const lines = [];
  const [first, ...others] = analysis.routes;
  const who = (route) => joinNames(route.ancestors.map((a) => (a.wtId ? `${a.name} (${a.wtId})` : a.name)));
  const noun = (route) => (route.ancestors.length > 1 ? "parents" : route.ancestors[0].gender === "male" ? "father" : route.ancestors[0].gender === "female" ? "mother" : "parent");
  const both = (route) => `${possessive(label1)} ${ancestorWord(route.gens1, noun(route))} and ${possessive(label2)} ${ancestorWord(route.gens2, noun(route))}`;
  const many = first.ancestors.length > 1;
  lines.push(`${many ? "The common ancestors are" : "The common ancestor is"} ${who(first)}: ${both(first)}.`);
  if (!first.couple) {
    lines.push(`Only one of the couple is on WikiTree here, so this may be a half relationship (descended from different spouses).`);
  }
  if (others.length) {
    const shown = others.slice(0, 3);
    lines.push(
      `${label1 === "you" ? "You're" : `${label1} and ${label2} are`} also related ${others.length === 1 ? "another way" : `${others.length} more ways`}: ${shown
        .map((route) => `through ${who(route)} (${both(route)}), ${relationshipName(route.gens1, route.gens2, { half: !route.couple, gender1 })}`)
        .join("; ")}${others.length > shown.length ? "; and more" : ""}.`
    );
  }
  const extra = !others.length ? "" : first.chance >= 100 ? ` Counting every route, expect about ${analysis.cm} cM.` : " Being related more than one way raises the odds.";
  const dnaLines = dnaSentence(first, extra).split("\n");
  lines.push(dnaLines[0]);
  for (const route of analysis.routes.slice(0, 2)) {
    for (const a of route.ancestors) {
      const first = String(a.name).split(" ")[0] || a.name;
      if (a.yDNA) lines.push(`Both lines from ${first} run father to son, so men on both sides carry ${first}'s Y-DNA: a Y-DNA test could confirm it.`);
      if (a.mtDNA) lines.push(`Both lines from ${first} run through mothers, so both carry ${first}'s mitochondrial DNA: an mtDNA test could confirm it.`);
    }
  }
  lines.push(...dnaLines.slice(1));
  return lines.join("\n");
}

// Parent-link status (DataStatus Father/Mother, getConnections pathStatus).
export const LINK_STATUS = { 30: "DNA confirmed", 20: "Confident", 10: "Uncertain", 5: "Non-biological" };

const chartPerson = (p) => {
  const first = String(p?.RealName || p?.FirstName || "").trim();
  const lnab = String(p?.LastNameAtBirth || "").trim();
  const current = String(p?.LastNameCurrent || "").trim();
  const surname = lnab && current && current !== lnab ? `(${lnab}) ${current}` : lnab || current;
  const year = (value) => {
    const match = String(value || "").match(/^(\d{4})/);
    return match && match[1] !== "0000" ? Number(match[1]) : 0;
  };
  return {
    id: p?.Id,
    wtid: p?.Name || "",
    first: first || p?.Name || "Private",
    name: [first, surname, String(p?.Suffix || "").trim()].filter(Boolean).join(" ") || p?.Name || "Private",
    gender: p?.Gender || "",
    birthYear: year(p?.BirthDate),
    deathYear: year(p?.DeathDate),
    birthPlace: String(p?.BirthLocation || "").trim(),
    photo: p?.Photo || "",
    photoData: p?.PhotoData || null,
    status: 0,
  };
};

/**
 * path: getConnections relation=2 (up through the common ancestor, then down). analysis:
 * analyseRelationship (for the ancestor's spouse). → {ancestors: [person], line1, line2}
 * with each line running from the common ancestors' child down to the person (line1
 * ends with person 1), each person's `status` the link to the parent above; or null when
 * the path isn't a blood line (a spouse step, or no way up and down).
 */
export function buildRelationshipLines(path, analysis) {
  const steps = Array.isArray(path) ? path : [];
  if (steps.length < 2 || steps.slice(1).some((p) => !["parent", "child", "sibling"].includes(p?.pathType))) return null;
  const types = steps.map((p) => p?.pathType || "");
  const people = steps.map(chartPerson);
  // Each link's status sits on the upper person of a climb and the lower one of a descent.
  for (let i = 1; i < steps.length; i += 1) {
    const status = Number(steps[i].pathStatus) || 0;
    if (types[i] === "parent") people[i - 1].status = status;
    else if (types[i] === "child") people[i].status = status;
  }
  const route = analysis?.routes?.[0];
  const routeAncestors = (route?.ancestors || []).map((a) => ({ wtid: a.wtId, name: a.name, first: String(a.name).split(" ")[0], gender: a.gender === "male" ? "Male" : a.gender === "female" ? "Female" : "", birthYear: 0, deathYear: 0, status: 0 }));
  const siblingAt = types.indexOf("sibling");
  let apex = -1;
  let line1;
  let line2;
  let ancestors;
  if (siblingAt > 0) {
    // The connection finder's sibling step: the parents aren't on the path.
    if (types.slice(1, siblingAt).some((t) => t !== "parent") || types.slice(siblingAt + 1).some((t) => t !== "child")) return null;
    line1 = people.slice(0, siblingAt).reverse();
    line2 = people.slice(siblingAt);
    ancestors = routeAncestors;
  } else {
    for (let i = 1; i < steps.length && types[i] === "parent"; i += 1) apex = i;
    if (apex < 1 || apex === steps.length - 1 || types.slice(apex + 1).some((t) => t !== "child")) return null;
    line1 = people.slice(0, apex).reverse();
    line2 = people.slice(apex + 1);
    const top = people[apex];
    const spouse = routeAncestors.filter((a) => a.wtid && a.wtid !== top.wtid);
    ancestors = routeAncestors.some((a) => a.wtid === top.wtid) ? [top, ...spouse] : [top];
    ancestors.sort((a, b) => (a.gender === "Male" ? 0 : 1) - (b.gender === "Male" ? 0 : 1));
  }
  if (!ancestors.length || !line1.length || !line2.length) return null;
  return { ancestors, line1, line2 };
}

// X-DNA (Murray, 2026-10-07: "if the path between two people is an xDNA path, it should be
// noted, highlighted even. Finding xDNA match is not easy"). X passes from a mother to every
// child and from a father to his daughters only, so a line carries it unless it has a
// father-to-son link.
const isMale = (person) => /^m/i.test(String(person?.gender || ""));
const isFemale = (person) => /^f/i.test(String(person?.gender || ""));

/** A line from the top down: {ok: true} | {ok: false, father, son} | {ok: null} (a gender missing). */
function xDnaDownLine(line) {
  let unknown = false;
  for (let i = 0; i + 1 < line.length; i += 1) {
    const [parent, child] = [line[i], line[i + 1]];
    if (isMale(parent) && isMale(child)) return { ok: false, father: parent, son: child };
    if (!isFemale(parent) && !isFemale(child) && !(isMale(parent) && isMale(child))) unknown = true;
  }
  return { ok: unknown ? null : true };
}

/**
 * Whether X-DNA can come down to both people. lines: buildRelationshipLines (each line from
 * the common ancestors' child down). → {kind: "x", sources: [ancestor]} (the ancestors whose
 * X can reach both), {kind: "blocked", father, son}, or {kind: "unknown"}.
 */
export function xDnaPath(lines) {
  if (!lines?.ancestors?.length || !lines.line1?.length || !lines.line2?.length) return { kind: "unknown" };
  const downs = [lines.line1, lines.line2].map(xDnaDownLine);
  const blocked = downs.find((down) => down.ok === false);
  if (blocked) return { kind: "blocked", father: blocked.father, son: blocked.son };
  if (downs.some((down) => down.ok === null)) return { kind: "unknown" };
  const tops = [lines.line1[0], lines.line2[0]];
  // A mother passes X to every child; a father only to daughters.
  const sources = lines.ancestors.filter((a) => isFemale(a) || (isMale(a) && tops.every(isFemale)));
  if (sources.length) return { kind: "x", sources };
  if (lines.ancestors.some((a) => !isFemale(a) && !isMale(a)) || tops.some((p) => !isFemale(p) && !isMale(p))) return { kind: "unknown" };
  const father = lines.ancestors.find(isMale);
  return { kind: "blocked", father, son: tops.find(isMale) };
}

/**
 * A direct line from getConnections (all "parent" steps or all "child" steps) as people from
 * the ancestor down, or null.
 */
export function directLineDown(path) {
  const steps = Array.isArray(path) ? path : [];
  if (steps.length < 2) return null;
  const types = steps.slice(1).map((p) => p?.pathType);
  const people = steps.map(chartPerson);
  if (types.every((t) => t === "parent")) return people.reverse();
  if (types.every((t) => t === "child")) return people;
  return null;
}

/** The highlighted X-DNA line for the chat, or "" when X-DNA can't come down both lines. */
export function xDnaSentence(lines, label1, label2) {
  const xdna = xDnaPath(lines);
  if (xdna.kind !== "x") return "";
  const names = joinNames(xdna.sources.map((a) => (a.wtid ? `${a.name} (${a.wtid})` : a.name)));
  const pair = label1 === "you" ? `you and ${label2}` : `${label1} and ${label2}`;
  return `**X-DNA path:** X-DNA can come down both lines from ${names} to ${pair}: there's no father-to-son link on either line. An X-DNA match could support this relationship.`;
}

/** The same for a direct line (ancestor first), or "". */
export function directXDnaSentence(lineDown) {
  if (!Array.isArray(lineDown) || lineDown.length < 2 || xDnaDownLine(lineDown).ok !== true) return "";
  const [top, bottom] = [lineDown[0], lineDown[lineDown.length - 1]];
  const who = (p) => (p.wtid ? `${p.name} (${p.wtid})` : p.name);
  return `**X-DNA path:** X-DNA can come straight down from ${who(top)} to ${who(bottom)}: there's no father-to-son link on the line.`;
}

/** "how am I related to X?", "what's my relationship to X": the relationship leads the answer ("connected" asks for the path). */
export function asksForRelationship(prompt) {
  const text = String(prompt || "");
  return /\b(?:related|relationship|relation|kin)\b/i.test(text) && !/\bconnect(?:ed|ion|ions)?\b/i.test(text);
}

/** The first line when the relationship leads: WikiTree's sentence, or "Harold is your 4th cousin once removed." */
export function relationshipLead(relationshipText, targetLabel, sourceLabel = "you") {
  const text = String(relationshipText || "").trim().replace(/\.$/, "");
  if (!text || /^No relationship found$/i.test(text)) return "";
  if (/\s(?:is|are|was|were)\s/i.test(text)) return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
  const owner = sourceLabel === "you" ? "your" : `${sourceLabel}'s`;
  return `${targetLabel} is ${owner} ${text.toLowerCase()}.`;
}
