// DNA questions (the user asked for them, 2026-10-03): a person's DNA tests and
// haplogroups (getDNATestsByTestTaker), tests connected to a profile
// (getConnectedDNATestsByProfile), and profiles connected to one of a taker's
// tests (getConnectedProfilesByDNATest). Kit numbers and usernames are shown: testers
// put them on WikiTree so matches can find them, and the API gives them to anyone (the
// user, 2026-10-07).

const OWNER = String.raw`(this\s+profile|this\s+person|her|his|their|she|he|they|my|me|I|[A-Z][A-Za-z'_ -]*?-\d+(?:['’]s)?|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}['’]s)`;
const TYPE = String.raw`(y[\s-]?dna|y[\s-]?chromosome|paternal|mt[\s-]?dna|mitochondrial|maternal|au[\s-]?dna|autosomal)`;

const PATTERNS = [
  // "what DNA tests has she taken", "has Whitten-1 taken a DNA test", "did I take a DNA test"
  { kind: "taker", re: new RegExp(String.raw`^(?:what|which)\s+dna\s+tests?\s+(?:has|have|did)\s+${OWNER}\s+(?:taken|take|done|do)$`, "i") },
  { kind: "taker", re: new RegExp(String.raw`^(?:has|have|did)\s+${OWNER}\s+(?:taken|take|done|do)\s+(?:a|any)\s+dna\s+tests?$`, "i") },
  { kind: "taker", re: new RegExp(String.raw`^(?:list|show(?:\s+me)?)\s+${OWNER}\s+dna\s+tests$`, "i") },
  // "what is my Y-DNA haplogroup", "what is her haplogroup", "what are Whitten-1's haplogroups"
  { kind: "haplogroup", re: new RegExp(String.raw`^what\s+(?:is|are|was)\s+${OWNER}\s+(?:${TYPE}\s+)?haplo(?:group)?s?$`, "i") },
  // "what DNA tests are connected to this profile", "are there any DNA tests connected to her"
  { kind: "connectedTests", re: new RegExp(String.raw`^(?:what|which)\s+dna\s+tests?\s+(?:are|is)\s+(?:connected|linked|attached)\s+to\s+${OWNER}(?:\s+profile)?$`, "i") },
  { kind: "connectedTests", re: new RegExp(String.raw`^(?:are|is)\s+there\s+(?:any\s+)?dna\s+tests?\s+(?:connected|linked|attached)\s+to\s+${OWNER}(?:\s+profile)?$`, "i") },
  { kind: "connectedTests", re: new RegExp(String.raw`^(?:has|is)\s+${OWNER}\s+(?:been\s+)?(?:dna[\s-]confirmed|confirmed\s+(?:by|with)\s+dna)$`, "i") },
  // "which profiles are connected to my yDNA test", "who is connected to Whitten-1's Y-DNA test"
  { kind: "connectedProfiles", re: new RegExp(String.raw`^(?:which|what)\s+profiles\s+(?:are|is)\s+(?:connected|linked)\s+to\s+${OWNER}\s+${TYPE}\s+(?:dna\s+)?test$`, "i") },
  { kind: "connectedProfiles", re: new RegExp(String.raw`^who\s+(?:is|are)\s+(?:connected|linked)\s+to\s+${OWNER}\s+${TYPE}\s+(?:dna\s+)?test$`, "i") },
  // "map of the profiles connected to my Y-DNA test", "Maloney-2332's Y-DNA match map",
  // "where are her mtDNA connections from", "map his Y-DNA connections"
  { kind: "map", re: new RegExp(String.raw`^(?:(?:show|draw|make|open|give)(?:\s+me)?\s+)?(?:an?\s+|the\s+)?map\s+(?:of\s+)?(?:the\s+)?(?:profiles|people|relatives)\s+(?:connected|linked)\s+to\s+${OWNER}\s+${TYPE}\s+(?:dna\s+)?test$`, "i") },
  { kind: "map", re: new RegExp(String.raw`^(?:(?:show|draw|open)(?:\s+me)?\s+)?(?:the\s+)?${OWNER}\s+${TYPE}\s+(?:dna\s+)?(?:test\s+)?(?:match(?:es)?|connections?|relatives)?\s*map$`, "i") },
  { kind: "map", re: new RegExp(String.raw`^where\s+(?:are|were|do|did)\s+${OWNER}\s+${TYPE}\s+(?:dna\s+)?(?:matches|connections|relatives)\s+(?:come\s+from|from|born|live)$`, "i") },
  { kind: "map", re: new RegExp(String.raw`^map\s+${OWNER}\s+${TYPE}\s+(?:dna\s+)?(?:matches|connections|relatives)$`, "i") },
];

/**
 * The test types a profile page's "DNA tested" box lists, from its links'
 * Special:DNATests t= slugs ("ftdna_ydna", "ancestry_audna"): a Set of yDNA/mtDNA/auDNA.
 */
export function dnaTypesFromTestSlugs(slugs) {
  const types = new Set();
  (slugs || []).forEach((slug) => {
    const suffix = String(slug || "").toLowerCase().split("_").pop();
    if (suffix === "ydna") types.add("yDNA");
    else if (suffix === "mtdna") types.add("mtDNA");
    else if (suffix === "audna") types.add("auDNA");
  });
  return types;
}

function ownerKey(text) {
  const raw = String(text || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (/^(?:my|me|I)$/i.test(raw)) return "me";
  if (/-\d+$/.test(raw)) return raw;
  // A name ("Murray's Y-DNA test", live 2026-10-04): the handler finds the profile.
  if (/['’]s$/.test(String(text || "").trim()) && !/^(?:this\s+profile|this\s+person)$/i.test(raw)) return raw;
  return "";
}

function dnaType(text) {
  if (!text) return "";
  if (/^(?:y|paternal)/i.test(text)) return "yDNA";
  if (/^(?:mt|mito|maternal)/i.test(text)) return "mtDNA";
  return "auDNA";
}

/** {kind, owner, dnaType?} or null. owner "" is the page profile, "me" the user, else a WikiTree ID. */
export function parseDnaPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const { kind, re } of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const params = { kind, owner: ownerKey(match[1]) };
    const type = dnaType(match[2]);
    if (type) params.dnaType = type;
    if ((kind === "connectedProfiles" || kind === "map") && !type) return null;
    return params;
  }
  return null;
}

const TYPE_LABELS = { yDNA: "Y-DNA", mtDNA: "mtDNA", auDNA: "autosomal DNA" };

// The IDs a tester gave WikiTree, in the API's field order.
const ID_FIELDS = [
  ["ancestry", "Ancestry username"],
  ["ftdna", "FTDNA kit"],
  ["gedmatch", "GEDmatch"],
  ["mitoydna", "mitoYDNA"],
  ["yourDNAportal", "YourDNAportal"],
  ["ysearch", "Ysearch"],
  ["mitosearch", "Mitosearch"],
];

/** "GEDmatch AS8991331", "Ancestry username ciwhitten": the IDs a tester gave WikiTree. */
export function testerIds(test) {
  return ID_FIELDS.map(([field, label]) => [label, String(test?.[field] || "").trim()])
    .filter(([, value]) => value)
    .map(([label, value]) => `${label} ${value}`);
}

function testLine(test, { withTaker = false } = {}) {
  const parts = [`${test.dna_name || test.dna_slug || "DNA test"} (${TYPE_LABELS[test.dna_type] || test.dna_type || "?"})`];
  if (test.haplo) parts.push(`Y haplogroup ${test.haplo}`);
  if (test.haplom) parts.push(`mt haplogroup ${test.haplom}`);
  if (Number(test.markers) > 0) parts.push(`${test.markers} markers`);
  if (test.mttype) parts.push(`mtDNA test ${test.mttype}`);
  parts.push(...testerIds(test));
  if (withTaker && test.taker?.Name) parts.push(`taken by ${test.taker.Name}`);
  return `- ${parts.join(", ")}`;
}

/** tests: dnaTests from getDNATestsByTestTaker. */
export function buildDnaTakerAnswer(tests, label) {
  if (!tests?.length) return `${label} has no DNA tests recorded on WikiTree.`;
  return `${label} has ${tests.length} DNA test${tests.length === 1 ? "" : "s"} recorded on WikiTree:\n${tests.map((test) => testLine(test)).join("\n")}`;
}

/** Haplogroups across a taker's tests; dnaType narrows to Y or mt. */
export function buildHaplogroupAnswer(tests, label, dnaTypeWanted = "") {
  const ys = [...new Set((tests || []).map((test) => test.haplo).filter(Boolean))];
  const mts = [...new Set((tests || []).map((test) => test.haplom).filter(Boolean))];
  const lines = [];
  if (dnaTypeWanted !== "mtDNA" && ys.length) lines.push(`Y-DNA haplogroup: ${ys.join(", ")}`);
  if (dnaTypeWanted !== "yDNA" && mts.length) lines.push(`mtDNA haplogroup: ${mts.join(", ")}`);
  if (!lines.length) {
    const what = dnaTypeWanted === "yDNA" ? "a Y-DNA haplogroup" : dnaTypeWanted === "mtDNA" ? "an mtDNA haplogroup" : "a haplogroup";
    return tests?.length
      ? `${label}'s ${tests.length} DNA test${tests.length === 1 ? "" : "s"} on WikiTree don't give ${what}.`
      : `${label} has no DNA tests recorded on WikiTree, so there's no haplogroup to report.`;
  }
  // Several tests can report slightly different depths of the same haplogroup.
  const note = ys.length > 1 || mts.length > 1 ? " (different tests report them to different depths)" : "";
  return `${label}${note}:\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

/** tests: dnaTests from getConnectedDNATestsByProfile (each with a taker), grouped by DNA type then test. */
export function buildConnectedTestsAnswer(tests, label) {
  if (!tests?.length) return `No DNA tests are connected to ${label} on WikiTree.`;
  const takers = new Set(tests.map((test) => test.taker?.Name).filter(Boolean));
  const lines = [];
  for (const type of ["yDNA", "mtDNA", "auDNA"]) {
    const ofType = tests.filter((test) => test.dna_type === type);
    if (!ofType.length) continue;
    const byTest = new Map();
    ofType.forEach((test) => {
      const name = test.dna_name || test.dna_slug || "DNA test";
      if (!byTest.has(name)) byTest.set(name, []);
      if (test.taker?.Name) {
        const ids = testerIds(test);
        byTest.get(name).push(ids.length ? `${test.taker.Name} (${ids.join(", ")})` : test.taker.Name);
      }
    });
    lines.push(`${TYPE_LABELS[type]} (${ofType.length}):`);
    byTest.forEach((names, name) => lines.push(`- ${name}: ${[...new Set(names)].join(", ") || "taker not given"}`));
  }
  const head = `${tests.length} DNA test${tests.length === 1 ? " is" : "s are"} connected to ${label}${
    takers.size ? `, from ${takers.size} test-taker${takers.size === 1 ? "" : "s"}` : ""
  }:`;
  return `${head}\n${lines.join("\n")}`;
}

/** The taker's first test of the wanted type (yDNA, mtDNA or auDNA). */
export function pickTakerTest(tests, dnaTypeWanted) {
  return (tests || []).find((test) => test.dna_type === dnaTypeWanted) || null;
}

/** No test to map: say so and offer who could take one. */
export function buildNoDnaMapTestAnswer(label, dnaTypeWanted) {
  const typeWord = TYPE_LABELS[dnaTypeWanted] || "DNA";
  const prompt = `who could take a DNA test for ${label}`;
  return {
    message: `${label} has no ${typeWord} test recorded on WikiTree, and none is connected to the profile, so there's nothing to map yet. A living carrier of the line could take one.`,
    actions: [{ label: prompt, actionType: "send-prompt", prompt, newSearch: true }],
  };
}

/** connections: [{Id, PageId, Name}] from getConnectedProfilesByDNATest. */
export function buildConnectedProfilesAnswer(connections, label, test) {
  const testName = `${test?.dna_name || "DNA test"} (${TYPE_LABELS[test?.dna_type] || test?.dna_type || "?"})`;
  if (!connections?.length) return `No profiles are connected to ${label}'s ${testName} on WikiTree.`;
  const shown = connections.slice(0, 25).map((connection) => `- ${connection.Name}`);
  const more = connections.length > 25 ? `\n…and ${connections.length - 25} more.` : "";
  return `${connections.length} profile${connections.length === 1 ? " is" : "s are"} connected to ${label}'s ${testName}:\n${shown.join("\n")}${more}`;
}

/**
 * The chat message for the map of profiles connected to a test. people: summarized
 * profiles ({name, lnab, birth, birthLocation}); migration: from buildDescendantMigration.
 */
export function buildDnaMapSummary(people, label, test, migration) {
  const testName = `${test?.dna_name || "DNA test"} (${TYPE_LABELS[test?.dna_type] || test?.dna_type || "?"})`;
  if (!people?.length) return `No profiles are connected to ${label}'s ${testName} on WikiTree.`;
  const lines = [`${people.length} profile${people.length === 1 ? " is" : "s are"} connected to ${label}'s ${testName}.`];
  const places = migration?.places || [];
  if (places.length) {
    lines.push(
      `Born in ${places.length} place${places.length === 1 ? "" : "s"}${migration.unplaced ? ` (${migration.unplaced} with no birthplace)` : ""}: ${places
        .slice(0, 6)
        .map((place) => `${place.key} (${place.count})`)
        .join(", ")}${places.length > 6 ? "…" : ""}.`
    );
  }
  const surnames = new Map();
  people.forEach((person) => person.lnab && surnames.set(person.lnab, (surnames.get(person.lnab) || 0) + 1));
  const topSurnames = [...surnames.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (topSurnames.length) lines.push(`Surnames: ${topSurnames.map(([name, count]) => `${name} (${count})`).join(", ")}.`);
  const dated = people.filter((person) => /^\d{4}/.test(String(person.birth || "")) && !/^0000/.test(person.birth)).sort((a, b) => String(a.birth).localeCompare(String(b.birth)));
  if (dated.length) {
    const first = dated[0];
    lines.push(`Earliest: ${first.name} (${first.wtid}), born ${String(first.birth).slice(0, 4)}${first.birthLocation ? ` in ${first.birthLocation}` : ""}.`);
  }
  return lines.join("\n");
}
