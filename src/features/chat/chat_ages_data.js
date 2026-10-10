// Lives & ages (2026-10-04, the "Wow!" visuals): every ancestor's age at death against
// the year they were born, and how old each father and mother was when the next
// ancestor was born. The fan chart's slots are the data (one getPeople call). Ages that
// can't be right (a mother of 9, a child born after its mother died) are flagged, so
// the chart is also a way to find mistakes in a tree.

import { dateParts, ageBetween } from "./chat_dates";
export { dateParts, ageBetween } from "./chat_dates";
import { generationOfSlot } from "./chat_fan_chart_data";
import { descendantWord, ancestorWord } from "./chat_kin_labels";
import { RELATIVE_OWNER } from "./chat_chart_owner";

const OWNER = String.raw`(${RELATIVE_OWNER}|my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z'_ -]*?-\d+['’]s)`;

const PATTERNS = [
  // "lives and ages", "my ancestors' ages chart", "age at death chart", "Beacall-11's lifespan statistics"
  {
    mode: "death",
    re: new RegExp(
      String.raw`^(?:(?:show|draw|make|open|give)(?:\s+me)?\s+)?(?:the\s+|an?\s+)?(?:${OWNER}\s+)?(?:(?:ancestors['’]?\s+)?(?:lives\s+and\s+ages|ages?\s+at\s+death|life\s+expectancy|longevity|lifespan\s+statistics|ages)(?:\s+(?:chart|graph|plot))?|(?:ancestors['’]?\s+)?ages?\s+(?:chart|graph|plot))$`,
      "i"
    ),
  },
  // ("how long did my ancestors live?" is the Lifespans welcome chip: it stays there)
  // "how old were my ancestors when they had children", "parents' ages chart", "how old were her parents when their children were born"
  { mode: "parent", re: new RegExp(String.raw`^how\s+old\s+were\s+${OWNER}\s+(?:ancestors|parents|forebears)\s+when\s+(?:they\s+had\s+(?:their\s+)?(?:children|kids|babies)|their\s+children\s+were\s+born)$`, "i") },
  {
    mode: "parent",
    re: new RegExp(String.raw`^(?:(?:show|draw|make|open)(?:\s+me)?\s+)?(?:the\s+)?(?:${OWNER}\s+)?(?:ancestors['’]?\s+)?(?:parents['’]?\s+ages?|ages?\s+at\s+(?:parenthood|first\s+child|childbirth))(?:\s+(?:chart|graph|plot))?$`, "i"),
  },
  // "who in my tree has impossible ages", "are there any age errors in his tree"
  { mode: "problems", re: new RegExp(String.raw`^(?:who|which\s+ancestors?)\s+(?:in\s+${OWNER}\s+(?:tree|family|ancestry)\s+)?(?:has|have)\s+(?:impossible|unlikely|wrong|odd|suspicious)\s+ages$`, "i") },
  { mode: "problems", re: new RegExp(String.raw`^(?:are\s+there\s+)?(?:any\s+)?(?:impossible|unlikely|suspicious)\s+ages\s+in\s+${OWNER}\s+(?:tree|family|ancestry)$`, "i") },
];

const SUBJECT_OWNER = { i: "my", we: "my", she: "her", he: "his", they: "their" };

function canonicalOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (!raw) return "";
  if (SUBJECT_OWNER[raw.toLowerCase()]) return SUBJECT_OWNER[raw.toLowerCase()];
  if (/^(?:my|our)$/i.test(raw)) return "my";
  if (/^this\s+(?:profile|person)$/i.test(raw)) return "";
  return raw;
}

/** {owner, ancestorPrompt, mode: "death" | "parent" | "problems", generations} or null. */
export function parseAgesPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const { mode, re } of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const owner = canonicalOwner(match[1]);
    const ancestorPrompt = !owner ? "this profile's ancestors" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors`;
    return { owner, ancestorPrompt, mode, generations: 10 };
  }
  return null;
}

function relationOf(slot) {
  return slot === 1 ? "" : ancestorWord(generationOfSlot(slot), slot % 2 === 0 ? "Male" : "Female");
}

/** One row per ancestor with a birth and death date: {slot, generation, name, wtid, gender, born, age, approx, relation, flag}. */
export function deathAgeRows(slots) {
  const rows = [];
  (slots || []).forEach((person, slot) => {
    if (!person || slot < 1) return;
    const span = ageBetween(person.birth, person.death);
    if (!span) return;
    const gender = person.generation !== undefined || slot === 1 ? person.gender : slot % 2 === 0 ? "Male" : "Female";
    let flag = "";
    if (span.age < 0) flag = "Died before they were born: one of the dates is wrong";
    else if (span.age > 105) flag = `Aged ${span.age}: very unlikely, so check the dates`;
    rows.push({ slot, generation: person.generation ?? generationOfSlot(slot), name: person.name, wtid: person.wtid, gender, born: dateParts(person.birth).year, age: span.age, approx: span.approx, relation: person.generation !== undefined ? descendantWord(person.generation, person.gender) : relationOf(slot), flag });
  });
  return rows;
}

/**
 * One row per father or mother whose age at the birth of the next ancestor is known:
 * {slot, generation, name, wtid, role, childName, childWtid, born (the child's birth year), age, approx, relation, flag}.
 */
export function parentAgeRows(slots) {
  const rows = [];
  (slots || []).forEach((person, slot) => {
    if (!person) return;
    if (person.children) {
      if (!["Male", "Female"].includes(person.gender)) return;
      person.children.forEach((child) => {
        const pair = [null, child];
        pair[person.gender === "Male" ? 2 : 3] = { ...person, children: undefined };
        parentAgeRows(pair).forEach((row) => rows.push({ ...row, slot, generation: person.generation, relation: descendantWord(person.generation, person.gender) }));
      });
      return;
    }
    if (slot < 2) return;
    const child = slots[Math.floor(slot / 2)];
    if (!child) return;
    const span = ageBetween(person.birth, child.birth);
    if (!span) return;
    const role = slot % 2 === 0 ? "father" : "mother";
    let flag = "";
    if (span.age < (role === "mother" ? 12 : 13)) flag = `A ${role} aged ${span.age}: check the dates or the parent`;
    else if (role === "mother" && span.age > 52) flag = `A mother aged ${span.age}: unlikely, so check the dates or the parent`;
    else if (role === "father" && span.age > 80) flag = `A father aged ${span.age}: unlikely, so check the dates or the parent`;
    // A mother can't give birth after she died; a father can die before the birth, but not by more than about a year.
    const died = dateParts(person.death);
    const childBorn = dateParts(child.birth);
    if (!flag && died && childBorn) {
      const gap = childBorn.year - died.year;
      if (role === "mother" && gap > 0) flag = `Born ${gap} year${gap === 1 ? "" : "s"} after the mother died`;
      if (role === "father" && gap > 1) flag = `Born ${gap} years after the father died`;
    }
    rows.push({
      slot,
      generation: generationOfSlot(slot),
      name: person.name,
      wtid: person.wtid,
      role,
      childName: child.name,
      childWtid: child.wtid,
      born: childBorn.year,
      age: span.age,
      approx: span.approx,
      relation: relationOf(slot),
      flag,
    });
  });
  return rows;
}

/** Average of numbers (null for none), to one decimal place. */
function mean(values) {
  return values.length ? Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10 : null;
}

/** The trend: the average age per bin of birth years, [{year (mid-bin), age, count}]. */
export function ageTrend(rows, binYears = 25) {
  const bins = new Map();
  rows.forEach((row) => {
    if (row.flag) return;
    const start = Math.floor(row.born / binYears) * binYears;
    if (!bins.has(start)) bins.set(start, []);
    bins.get(start).push(row.age);
  });
  return [...bins.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, ages]) => ({ year: start + binYears / 2, age: mean(ages), count: ages.length }));
}

function personText(row) {
  return `${row.name} (${row.wtid})${row.relation ? `, ${row.relation.toLowerCase()}` : ""}`;
}

/** Average lifespan by century (birth), for people who lived past childhood and everyone. */
export function centuryAverages(rows) {
  const byCentury = new Map();
  rows.forEach((row) => {
    if (row.flag) return;
    const century = Math.floor(row.born / 100) * 100;
    if (!byCentury.has(century)) byCentury.set(century, []);
    byCentury.get(century).push(row.age);
  });
  return [...byCentury.entries()].sort((a, b) => a[0] - b[0]).map(([century, ages]) => ({ century, average: mean(ages), count: ages.length }));
}

/** The chat message for the chart. */
export function buildAgesSummary(slots, ownerText, mode = "death", scope = "ancestors") {
  const deaths = deathAgeRows(slots).filter((row) => row.slot > 1 || row.age >= 0);
  const parents = parentAgeRows(slots);
  const problems = [...deaths, ...parents].filter((row) => row.flag);
  const lines = [];
  if (mode === "problems") {
    if (!problems.length) return `I checked ${deaths.length + parents.length} ages in ${ownerText} ${scope} and none looks impossible.`;
    lines.push(`${problems.length} age${problems.length === 1 ? "" : "s"} in ${ownerText} ${scope} look wrong:`);
    problems.slice(0, 15).forEach((row) => lines.push(`- ${personText(row)}: ${row.flag}`));
    lines.push("The chart marks them with red rings.");
    return lines.join("\n");
  }
  if (mode === "parent") {
    const mothers = parents.filter((row) => row.role === "mother" && !row.flag);
    const fathers = parents.filter((row) => row.role === "father" && !row.flag);
    if (!mothers.length && !fathers.length) return `${ownerText} ${scope} don't have enough birth dates to work out parents' ages.`;
    lines.push(`How old ${ownerText === "Your" ? "your" : ownerText} ${scope} were when the next ${scope === "descendants" ? "descendant" : "ancestor"} was born:`);
    if (mothers.length) lines.push(`- Mothers: average ${mean(mothers.map((r) => r.age))} (${mothers.length}), youngest ${Math.min(...mothers.map((r) => r.age))}, oldest ${Math.max(...mothers.map((r) => r.age))}`);
    if (fathers.length) lines.push(`- Fathers: average ${mean(fathers.map((r) => r.age))} (${fathers.length}), youngest ${Math.min(...fathers.map((r) => r.age))}, oldest ${Math.max(...fathers.map((r) => r.age))}`);
    const oldestFather = fathers.slice().sort((a, b) => b.age - a.age)[0];
    if (oldestFather && oldestFather.age >= 50) lines.push(`${oldestFather.name} (${oldestFather.wtid}) was ${oldestFather.age} when ${oldestFather.childName} was born.`);
  } else {
    if (!deaths.length) return `${ownerText} ${scope} don't have enough birth and death dates to chart their ages.`;
    const good = deaths.filter((row) => !row.flag && row.slot > 1);
    const longest = good.slice().sort((a, b) => b.age - a.age)[0];
    const shortest = good.slice().sort((a, b) => a.age - b.age)[0];
    lines.push(`${ownerText} ${good.length} ${scope} with birth and death dates lived to ${mean(good.map((r) => r.age))} on average.`);
    const centuries = centuryAverages(good).filter((c) => c.count >= 2);
    if (centuries.length >= 2) lines.push(`By century of birth: ${centuries.map((c) => `${c.century}s ${c.average} (${c.count})`).join(", ")}.`);
    if (longest) lines.push(`Longest life: ${personText(longest)}, ${longest.age}.`);
    if (shortest && shortest !== longest) lines.push(`Shortest: ${personText(shortest)}, ${shortest.age}.`);
  }
  if (problems.length) lines.push(`${problems.length} age${problems.length === 1 ? " looks" : "s look"} wrong (red rings): ask "who in ${ownerText === "Your" ? "my" : ownerText} tree has impossible ages" for the list.`);
  return lines.join("\n");
}
