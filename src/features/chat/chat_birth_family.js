// Birth (biological) family as WikiTree records it (Help:Biological_Parents): Father and Mother are the parents
// who raised someone (DataStatus "5" when they aren't the birth parents); BioFather and BioMother, when set, are
// the birth parents (negative Ids when private). Used for "Patty's biological parents/siblings/children".

const idOf = (value) => Number(value) || 0;
const statusOf = (person, field) => String(person?.DataStatus?.[field] ?? "");

/** {father, mother}: each birth parent's Id (0 when not known): BioFather/BioMother, else a Father/Mother not marked non-biological. */
export function birthParentIds(person) {
  const pick = (bio, raised) => idOf(person?.[bio]) || (statusOf(person, raised) === "5" ? 0 : idOf(person?.[raised]));
  return { father: pick("BioFather", "Father"), mother: pick("BioMother", "Mother") };
}

/** {father, mother}: birth parents recorded besides the parents who raised them (0 where there are none). */
export function separateBirthParentIds(person) {
  const apart = (bio, raised) => (idOf(person?.[bio]) && idOf(person?.[bio]) !== idOf(person?.[raised]) ? idOf(person[bio]) : 0);
  return { father: apart("BioFather", "Father"), mother: apart("BioMother", "Mother") };
}

/**
 * {father, mother}: each Father/Mother the person wasn't born to (marked non-biological, or a different
 * BioFather/BioMother), 0 where the link is a birth parent or there is none. An adoptee's Father and Mother
 * can be their adoptive parents (Help:Adoption).
 */
export function adoptiveParentIds(person) {
  const notBorn = (bio, raised) => {
    const raisedId = idOf(person?.[raised]);
    if (!raisedId) return 0;
    const bioId = idOf(person?.[bio]);
    return statusOf(person, raised) === "5" || (bioId && bioId !== raisedId) ? raisedId : 0;
  };
  return { father: notBorn("BioFather", "Father"), mother: notBorn("BioMother", "Mother") };
}

/** Ids among Father/Mother that the person wasn't born to (marked non-biological, or a different BioFather/BioMother). */
export function raisedNotBornToIds(person) {
  const { father, mother } = adoptiveParentIds(person);
  return [father, mother].filter(Boolean);
}

/** Whether `child` was born to the person with Id `parentId`. */
export function isBirthChildOf(child, parentId) {
  const parent = idOf(parentId);
  if (!parent) return false;
  const { father, mother } = birthParentIds(child);
  return father === parent || mother === parent;
}

/**
 * "biological parents", "birth mother", "bio siblings": the relation word asked for with "biological"
 * (or "birth", "bio") in front. Only parents, children and siblings have a birth version.
 */
export function asksForBirthRelation(text, relationPattern) {
  return new RegExp(`\\b(?:biological|birth|bio)\\s+(?:${relationPattern.source})`).test(String(text || "").toLowerCase());
}

/** "adoptive parents", "adopted mother": the parent word asked for with "adoptive" (or "adopted") in front. */
export function asksForAdoptiveRelation(text, relationPattern) {
  return new RegExp(`\\b(?:adoptive|adopted)\\s+(?:${relationPattern.source})`).test(String(text || "").toLowerCase());
}
