// Family size (2026-10-04, the "Wow!" visuals): how many children each ancestral couple
// had, generation by generation, and how many died young. The couples are the fan
// chart's Ahnentafel pairs (slots 2k and 2k+1 are the parents of slot k); their
// children come from getPeople with descendants: 1. The d3 drawing lives in
// chat_family_size_chart.js.

import { yearOf } from "./chat_chart_common";
import { generationOfSlot } from "./chat_fan_chart_data";
import { generationLabel } from "./chat_lifespans_data";

export const FAMILY_SIZE_GENERATIONS = 7; // (couples in rows 1–6: up to 63 families)
export const DIED_YOUNG_AGE = 5;

const OWNER = String.raw`(my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z' -]*?-\d+['’]s)`;
const LEAD = String.raw`(?:(?:show|draw|make|create|give|display|open|chart)(?:\s+me)?\s+)?`;
const PATTERNS = [
  // "family size", "my family sizes", "show Cook-8721's ancestral family sizes", "family size chart"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:${OWNER}\s+)?(?:ancestors?['’]?\s+|ancestral\s+)?family\s+sizes?(?:\s+(?:chart|over\s+time|by\s+generation))?$`, "i"),
  // "family sizes in my tree", "family size of her ancestors"
  new RegExp(String.raw`^${LEAD}(?:the\s+)?(?:average\s+)?family\s+sizes?\s+(?:in|of|among)\s+${OWNER}\s+(?:tree|ancestors|ancestry|family\s+tree)$`, "i"),
  // "how big were my ancestors' families", "how large were his ancestors' families"
  new RegExp(String.raw`^how\s+(?:big|large)\s+were\s+${OWNER}\s+ancestors['’]?\s+families$`, "i"),
  // "how many children did my ancestors have", "how many kids did her ancestors have"
  new RegExp(String.raw`^how\s+many\s+(?:children|kids)\s+did\s+${OWNER}\s+ancestors\s+have$`, "i"),
];

function canonicalOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (!raw) return "";
  if (/^(?:my|our)$/i.test(raw)) return "my";
  if (/^(?:her|his|their)$/i.test(raw)) return raw.toLowerCase();
  if (/^this\s+(?:profile|person)$/i.test(raw)) return "";
  return raw;
}

/** {owner, ancestorPrompt, generations, familySize: true} or null. */
export function parseFamilySizePrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const re of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const owner = canonicalOwner(match[1]);
    const ancestorPrompt = !owner ? "this profile's ancestors" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors`;
    return { owner, ancestorPrompt, generations: FAMILY_SIZE_GENERATIONS, familySize: true };
  }
  return null;
}

const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const round1 = (value) => Math.round(value * 10) / 10;

/**
 * slots: from buildFanSlots. people: getPeople results (the ancestors' children among
 * them). → {rows: [{generation, label, couples, average, median, decade}], couples: [all]}.
 * A couple: {slot (the line child's slot), father, mother, children: [{id, wtid, name,
 * gender, birthYear, deathYear, diedYoung, onLine}], firstYear, lastYear}. Children are
 * those with both parents' ids (or the one known parent's, when the other isn't recorded).
 */
export function buildFamilySizes(slots, people) {
  const all = Object.values(people || {}).filter(Boolean);
  const maxGeneration = generationOfSlot(slots.length - 1);
  const rows = [];
  const couples = [];
  for (let generation = 1; generation < maxGeneration; generation += 1) {
    const row = { generation, label: generation === 1 ? "Parents" : generationLabel(generation), couples: [] };
    for (let slot = 2 ** (generation - 1); slot < 2 ** generation; slot += 1) {
      const child = slots[slot];
      if (!child) continue;
      const father = slots[slot * 2] || null;
      const mother = slots[slot * 2 + 1] || null;
      if (!father && !mother) continue;
      const fatherId = Number(father?.id) || 0;
      const motherId = Number(mother?.id) || 0;
      const matches = (person) =>
        (fatherId ? Number(person.Father) === fatherId : true) && (motherId ? Number(person.Mother) === motherId : true) && (fatherId || motherId);
      const byId = new Map();
      all.filter(matches).forEach((person) => byId.set(String(person.Id), person));
      // (the line child is always one of them, even if the API left them out)
      if (child.id && !byId.has(String(child.id))) byId.set(String(child.id), { Id: child.id, Name: child.wtid, RealName: child.name, Gender: child.gender, BirthDate: child.birth, DeathDate: child.death });
      const children = [...byId.values()]
        .map((person) => {
          const birthYear = yearOf(person.BirthDate) || 0;
          const deathYear = yearOf(person.DeathDate) || 0;
          return {
            id: person.Id,
            wtid: person.Name || "",
            name: person.RealName || person.FirstName || person?.Derived?.ShortName || person.Name || "Private",
            gender: person.Gender || "",
            birthYear,
            deathYear,
            diedYoung: !!(birthYear && deathYear && deathYear - birthYear < DIED_YOUNG_AGE),
            onLine: String(person.Id) === String(child.id),
          };
        })
        .sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999));
      const years = children.map((c) => c.birthYear).filter(Boolean);
      const couple = { slot, generation, father, mother, child, children, firstYear: years.length ? Math.min(...years) : 0, lastYear: years.length ? Math.max(...years) : 0 };
      row.couples.push(couple);
      couples.push(couple);
    }
    if (!row.couples.length) continue;
    const sizes = row.couples.map((couple) => couple.children.length);
    row.average = round1(sizes.reduce((sum, n) => sum + n, 0) / sizes.length);
    row.median = median(sizes);
    const years = row.couples.map((couple) => couple.firstYear).filter(Boolean);
    row.decade = years.length ? Math.floor(median(years) / 10) * 10 : 0;
    rows.push(row);
  }
  return { rows, couples };
}

const coupleName = (couple) => [couple.father?.name, couple.mother?.name].filter(Boolean).join(" and ") || "an unnamed couple";

/** The chat paragraph: the average, the trend, the biggest families and the children who died young. */
export function describeFamilySizes(data, ownerText) {
  const { rows, couples } = data || {};
  if (!couples?.length) return `${ownerText} ancestors' families aren't on WikiTree yet: no ancestral couples to count.`;
  const sizes = couples.map((couple) => couple.children.length);
  const total = sizes.reduce((sum, n) => sum + n, 0);
  const lines = [
    `${ownerText} ${couples.length} ancestral couples have ${total} children recorded on WikiTree: ${round1(total / couples.length)} a family on average (the median is ${median(sizes)}).`,
  ];
  const dated = rows.filter((row) => row.decade);
  if (dated.length >= 2) {
    const oldest = dated[dated.length - 1];
    const newest = dated[0];
    const trend = oldest.average > newest.average + 0.5 ? "Families shrank" : oldest.average + 0.5 < newest.average ? "Families grew" : "Family size held steady";
    lines.push(
      `${trend} over the generations: ${oldest.average} children for the ${oldest.label.toLowerCase()} (around the ${oldest.decade}s), ${newest.average} for the ${newest.label.toLowerCase()} (the ${newest.decade}s).`
    );
  }
  const biggest = [...couples].sort((a, b) => b.children.length - a.children.length || a.firstYear - b.firstYear).slice(0, 3);
  if (biggest[0]?.children.length > 1) {
    lines.push(
      `The biggest families: ${biggest
        .filter((couple) => couple.children.length > 1)
        .map((couple) => `${coupleName(couple)} (${couple.children.length}${couple.firstYear ? `, ${couple.firstYear === couple.lastYear ? couple.firstYear : `${couple.firstYear}–${couple.lastYear}`}` : ""})`)
        .join("; ")}.`
    );
  }
  const withDates = couples.flatMap((couple) => couple.children).filter((child) => child.birthYear && child.deathYear);
  const young = withDates.filter((child) => child.diedYoung);
  if (young.length) {
    lines.push(`${young.length} of the ${withDates.length} children with both dates died before the age of ${DIED_YOUNG_AGE} (${Math.round((100 * young.length) / withDates.length)}%).`);
  }
  const onlyOne = couples.filter((couple) => couple.children.length === 1).length;
  if (onlyOne) lines.push(`${onlyOne} ${onlyOne === 1 ? "couple has" : "couples have"} only the one child recorded: their other children may not be on WikiTree yet.`);
  return lines.join("\n");
}
