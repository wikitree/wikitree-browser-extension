// Relationship details (2026-10-04): when two people are blood relatives, say how. The
// Relationship Finder (wwwWikiTree getRelationJSON) returns commonAncestors with
// path1Length/path2Length (counting the person: 2 = parent), yDNA/mtDNA flags and an html
// page ("Relationship Found … X is the third great grandnephew of Y", or "Direct
// Relationship Found" with numbered steps and no common ancestors). From that: who the
// common ancestors are and how far up, cousin degree, every route, and the DNA that
// relatives this close share. No kit numbers or test-company names, ever.

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

// The chance that relatives share any DNA a test would detect, by meioses between them
// (3rd cousins = 8: ~98%; 4th = 10: ~71%; 5th = 12: ~32%; 6th = 14: ~11%; 7th = 16: ~4%).
const DETECT = { 8: 98, 9: 90, 10: 71, 11: 50, 12: 32, 13: 19, 14: 11, 15: 7, 16: 4, 17: 2 };
export function detectChance(meioses) {
  if (meioses <= 7) return 100;
  return DETECT[meioses] ?? 1;
}

// Among relatives who do match, by meioses (Shared cM Project averages: 3rd cousins 73,
// 3C1R 48, 4C 35, 4C1R 28, 5C 25, 5C1R and further about 20). Closer than that nearly all
// match, so the plain average holds.
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
        // (an ancestor passes on half each generation; detection odds like a cousin one meiosis further)
        const cm = roundCm(GENOME_CM * 0.5 ** generations);
        return { kind: "direct", generations, cm, chance: detectChance(generations + 1), matchedCm: roundCm(matchedCm(generations + 1, cm)) };
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
      return route;
    })
    .sort((a, b) => a.gens1 + a.gens2 - (b.gens1 + b.gens2) || a.gens1 - b.gens1);
  if (!routes.length) return { kind: "none" };
  return { kind: "common", routes, cm: roundCm(routes.reduce((sum, route) => sum + route.cm, 0)) };
}

const joinNames = (names) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);
const possessive = (label) => (label === "you" ? "your" : `${label}'s`);
/** The DNA sentence: the plain average when nearly all match, else the odds and what matches share. */
export function dnaSentence({ cm, chance, matchedCm: matched }) {
  if (chance >= 100) return `Relatives this close share about ${cm} cM of DNA on average, and almost all share some.`;
  const odds = chance <= 1 ? "Very few relatives this close (under 2%)" : `About ${chance}% of relatives this close`;
  return `${odds} share DNA a test would detect; those who do share about ${matched || cm} cM on average.`;
}

/**
 * The chat lines under the connection answer. label1/label2: "you" or a name (person 1 is
 * the one asked from); gender1 picks uncle/aunt words for other routes.
 */
export function describeRelationship(analysis, label1, label2, { gender1 = "" } = {}) {
  if (!analysis || analysis.kind === "none") return "";
  if (analysis.kind === "direct") {
    return dnaSentence(analysis);
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
  const cmLine = dnaSentence(first);
  const extra = !others.length ? "" : first.chance >= 100 ? ` Counting every route, expect about ${analysis.cm} cM.` : " Being related more than one way raises the odds.";
  lines.push(cmLine + extra);
  for (const route of analysis.routes.slice(0, 2)) {
    for (const a of route.ancestors) {
      const first = String(a.name).split(" ")[0] || a.name;
      if (a.yDNA) lines.push(`Both lines from ${first} run father to son, so men on both sides carry ${first}'s Y-DNA: a Y-DNA test could confirm it.`);
      if (a.mtDNA) lines.push(`Both lines from ${first} run through mothers, so both carry ${first}'s mitochondrial DNA: an mtDNA test could confirm it.`);
    }
  }
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
