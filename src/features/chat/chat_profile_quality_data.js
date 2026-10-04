// Profile completeness (2026-10-04, the user: completeness means the Gold Standard, not how
// many ancestors are on WikiTree; see Help:Creating_Gold_Standard_Profiles). Each profile
// is scored on the required facts and relationships, the certainty status indicators
// for them (most of these are the DataStatus field), the "no more spouses" and "no more
// children" boxes, and inline source citations. Research status Gold Standard = 100%.

/** WikiTree's Research Status codes (getProfile.md). */
export const RESEARCH_STATUSES = {
  10: "Unfinished",
  20: "Help Requested",
  30: "Sources to Review",
  40: "Silver Standard",
  50: "Gold Standard Candidate",
  60: "Gold Standard",
};

/** The checklist, in the order a reader would fix them. */
export const QUALITY_ITEMS = [
  { key: "birthDate", label: "birth date" },
  { key: "birthDateStatus", label: "birth date status" },
  { key: "birthPlace", label: "birth place" },
  { key: "birthPlaceStatus", label: "birth place status" },
  { key: "father", label: "father" },
  { key: "fatherStatus", label: "father's relationship status" },
  { key: "mother", label: "mother" },
  { key: "motherStatus", label: "mother's relationship status" },
  { key: "marriages", label: "marriage date and place" },
  { key: "marriageStatus", label: "marriage date and place status" },
  { key: "noMoreSpouses", label: '"no more spouses" box' },
  { key: "noMoreChildren", label: '"no more children" box' },
  { key: "deathDate", label: "death date" },
  { key: "deathDateStatus", label: "death date status" },
  { key: "deathPlace", label: "death place" },
  { key: "deathPlaceStatus", label: "death place status" },
  { key: "sources", label: "inline source citations" },
];
const LABELS = Object.fromEntries(QUALITY_ITEMS.map((item) => [item.key, item.label]));

const hasDate = (value) => /^\d{4}/.test(String(value || "")) && !/^0000/.test(String(value));
const hasText = (value) => !!String(value || "").trim();
const statusSet = (value) => value !== undefined && value !== null && String(value) !== "" && String(value) !== "0";

/** How many <ref> citations a biography has. */
export function citationCount(bio) {
  return (String(bio || "").match(/<ref[\s>/]/gi) || []).length;
}

/**
 * The checklist for one getPeople person (fields DataStatus, Father, Mother, Spouses,
 * NoChildren, ResearchStatus, IsLiving and, for sources, Bio): {score 0–1, items:
 * {key: 0–1}, missing: [labels], researchStatus, gold}. Items that don't apply (death
 * facts for the living, marriages with no spouse, sources when the bio wasn't asked
 * for) are left out.
 */
export function profileQuality(person) {
  const status = person?.DataStatus || {};
  const items = {};
  const set = (key, value) => {
    items[key] = value === true ? 1 : value === false ? 0 : Math.max(0, Math.min(1, value));
  };
  set("birthDate", hasDate(person?.BirthDate));
  if (hasDate(person?.BirthDate)) set("birthDateStatus", statusSet(status.BirthDate));
  set("birthPlace", hasText(person?.BirthLocation));
  if (hasText(person?.BirthLocation)) set("birthPlaceStatus", statusSet(status.BirthLocation));
  set("father", Number(person?.Father) > 0);
  if (Number(person?.Father) > 0) set("fatherStatus", statusSet(status.Father));
  set("mother", Number(person?.Mother) > 0);
  if (Number(person?.Mother) > 0) set("motherStatus", statusSet(status.Mother));
  const spouses = Array.isArray(person?.Spouses) ? person.Spouses : Object.values(person?.Spouses || {});
  if (spouses.length) {
    const marriage = (spouse) => (hasDate(spouse?.MarriageDate || spouse?.marriage_date) ? 0.5 : 0) + (hasText(spouse?.MarriageLocation || spouse?.marriage_location) ? 0.5 : 0);
    // (getPeople's spouse DataStatus comes back blank; the real values are in data_status.)
    const marriageStatus = (spouse) => {
      const s = spouse?.DataStatus || {};
      const d = spouse?.data_status || {};
      return (statusSet(s.MarriageDate) || statusSet(d.marriage_date) ? 0.5 : 0) + (statusSet(s.MarriageLocation) || statusSet(d.marriage_location) ? 0.5 : 0);
    };
    set("marriages", spouses.reduce((sum, spouse) => sum + marriage(spouse), 0) / spouses.length);
    set("marriageStatus", spouses.reduce((sum, spouse) => sum + marriageStatus(spouse), 0) / spouses.length);
  }
  set("noMoreSpouses", String(status.Spouse || "") === "blank");
  set("noMoreChildren", Number(person?.NoChildren) === 1);
  if (Number(person?.IsLiving) !== 1) {
    set("deathDate", hasDate(person?.DeathDate));
    if (hasDate(person?.DeathDate)) set("deathDateStatus", statusSet(status.DeathDate));
    set("deathPlace", hasText(person?.DeathLocation));
    if (hasText(person?.DeathLocation)) set("deathPlaceStatus", statusSet(status.DeathLocation));
  }
  const bio = person?.Bio ?? person?.bio;
  if (bio !== undefined && bio !== null) {
    // Every required fact needs a citation: birth, parents, each marriage, death.
    const needed = 2 + spouses.length + (Number(person?.IsLiving) === 1 ? 0 : 1);
    set("sources", citationCount(bio) / needed);
  }
  const researchStatus = Number(person?.ResearchStatus) || 0;
  const gold = researchStatus === 60;
  const keys = Object.keys(items);
  const score = gold ? 1 : keys.length ? keys.reduce((sum, key) => sum + items[key], 0) / keys.length : 0;
  const missing = gold ? [] : QUALITY_ITEMS.filter((item) => item.key in items && items[item.key] < 1).map((item) => item.label);
  return { score, items, missing, researchStatus, gold };
}

/** "Gold Standard", "Silver Standard", … or "" for no status. */
export function researchStatusLabel(code) {
  return RESEARCH_STATUSES[Number(code)] || "";
}

/**
 * The chat paragraph over some profiles' quality ([{person: slot summary with .quality}]):
 * the average, how many are complete, research statuses, and the commonest gaps.
 */
export function buildQualitySummary(people, ownerText) {
  const scored = (people || []).filter((p) => p?.quality);
  if (!scored.length) return "";
  const average = Math.round((100 * scored.reduce((sum, p) => sum + p.quality.score, 0)) / scored.length);
  const complete = scored.filter((p) => p.quality.score >= 0.999).length;
  const lines = [
    `Profile completeness, against the Gold Standard checklist (facts, their status indicators, relationships, "no more" boxes and citations): ${ownerText} ${scored.length} ancestors' profiles average ${average}%${
      complete ? `, and ${complete} ${complete === 1 ? "meets" : "meet"} it all` : ""
    }.`,
  ];
  const byStatus = new Map();
  scored.forEach((p) => {
    const label = researchStatusLabel(p.quality.researchStatus);
    if (label) byStatus.set(label, (byStatus.get(label) || 0) + 1);
  });
  if (byStatus.size) {
    const order = Object.values(RESEARCH_STATUSES).reverse();
    lines.push(`Research status: ${order.filter((label) => byStatus.has(label)).map((label) => `${byStatus.get(label)} ${label}`).join(", ")}.`);
  } else lines.push("None has a Research Status set yet.");
  const gaps = new Map();
  scored.forEach((p) =>
    Object.entries(p.quality.items).forEach(([key, value]) => {
      if (value < 1 && !p.quality.gold) gaps.set(key, (gaps.get(key) || 0) + 1);
    })
  );
  const commonest = [...gaps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (commonest.length) lines.push(`The commonest gaps: ${commonest.map(([key, count]) => `${LABELS[key]} (${count})`).join(", ")}.`);
  const nearest = scored
    .filter((p) => p.quality.score < 0.999 && p.quality.score >= 0.75)
    .sort((a, b) => b.quality.score - a.quality.score)
    .slice(0, 3);
  if (nearest.length) {
    lines.push(
      `Nearly there: ${nearest.map((p) => `${p.name || p.wtid} (${p.wtid}), ${Math.round(100 * p.quality.score)}%, needs ${p.quality.missing.slice(0, 2).join(" and ")}`).join("; ")}.`
    );
  }
  return lines.join("\n");
}

const HELP_STATUSES = [20, 30, 10]; // Help Requested, Sources to Review, Unfinished

/**
 * "Which of my ancestors need help?": the profiles marked Help Requested, Sources to
 * Review or Unfinished, then the least complete of the rest (nearer generations first
 * on a tie) with what each is missing. people: [{name, wtid, quality, generation?}].
 */
export function buildNeedsHelpAnswer(people, ownerText, { limit = 8 } = {}) {
  const scored = (people || []).filter((p) => p?.quality && !p.quality.gold);
  if (!scored.length) return "";
  const describe = (p) => {
    const missing = p.quality.missing.slice(0, 3).join(", ");
    return `${p.name || p.wtid} (${p.wtid}), ${Math.round(100 * p.quality.score)}%${missing ? `: needs ${missing}${p.quality.missing.length > 3 ? ` and ${p.quality.missing.length - 3} more` : ""}` : ""}`;
  };
  const lines = [];
  const flagged = HELP_STATUSES.flatMap((code) => scored.filter((p) => p.quality.researchStatus === code));
  if (flagged.length) {
    lines.push(`Marked as needing work (Research Status), ${flagged.length}:`);
    flagged.slice(0, limit).forEach((p) => lines.push(`- ${researchStatusLabel(p.quality.researchStatus)}: ${describe(p)}`));
  } else lines.push(`None of ${ownerText === "Your" ? "your" : ownerText} ancestors' profiles is marked Help Requested, Sources to Review or Unfinished.`);
  const flaggedIds = new Set(flagged.map((p) => p.wtid));
  const weakest = scored
    .filter((p) => !flaggedIds.has(p.wtid) && p.quality.score < 0.999)
    .sort((a, b) => a.quality.score - b.quality.score || (a.generation || 0) - (b.generation || 0))
    .slice(0, limit);
  if (weakest.length) {
    lines.push(`The least complete against the Gold Standard checklist:`);
    weakest.forEach((p) => lines.push(`- ${describe(p)}`));
  }
  return lines.join("\n");
}
