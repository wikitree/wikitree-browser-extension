/*
Created By: Ian Beacall (Beacall-6)

Scoring one Find Matches result against the profile being searched.

Adapted from the Duplicate Finder app.
*/

import {
  compactDateDisplay,
  compactDateIsAfterOrSamePartialYear,
  compactDateIsDecadeLike,
  compactDateIsDefinitelyAfter,
  compactDateIsEstimate,
  compactDatePrecision,
  compactDateYear,
  compactDatesRuleOutSamePerson,
} from "./match_dates";
import {
  foldText,
  hardRejectLocationCountryMismatch,
  hardRejectUsStateMismatch,
  nonContiguousUkBirthCounties,
  pairLocationSupport,
} from "./match_locations";
import { UK_BIRTH_COUNTY_NATION_ADJECTIVES, UNKNOWN_TOKENS } from "./match_location_data";

const DECADE_LIKE_DATE_MATCH_PENALTY = 6;
const WEIGHTED_PARTIAL_LOCATION_PENALTY = 8;
const FATHER_FIRST_NAME_CONFLICT_PENALTY = 34;
const FATHER_FIRST_NAME_CONFLICT_REDUCED_PENALTY = 10;

/** Below this many evidence points the Duplicate Finder drops the pair entirely. */
export const WEAK_EVIDENCE_POINTS = 6;

export function levelForScore(score) {
  if (score >= 100) return "Near-certain";
  if (score >= 90) return "Very strong";
  if (score >= 80) return "Strong";
  if (score >= 65) return "Possible";
  if (score > 0) return "Weak";
  return "Rejected";
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== "" && value != null))];
}

function normalizeKnownValue(value) {
  const normalized = foldText(value);
  return UNKNOWN_TOKENS.has(normalized) ? "" : normalized;
}

function parentRefForRole(person, role) {
  return (person.parentRefs || []).find((ref) => foldText(ref.role) === foldText(role)) || null;
}

function parentRefFieldConflicts(leftPerson, rightPerson, role, field) {
  const left = normalizeKnownValue((parentRefForRole(leftPerson, role) || {})[field]);
  const right = normalizeKnownValue((parentRefForRole(rightPerson, role) || {})[field]);
  return left !== "" && right !== "" && left !== right;
}

function parentFirstName(person, role) {
  return normalizeKnownValue((parentRefForRole(person, role) || {}).firstName);
}

function normalizeId(value) {
  const text = String(value ?? "").trim();
  return text === "" || text === "0" ? "" : text;
}

/* ---------------------------------------------------------------------- names ---- */

function firstNameKey(person) {
  return foldText(person.FirstName || person.RealName || "");
}

function middleNameKey(person) {
  return foldText(person.MiddleName || "");
}

function fullGivenNameKey(person) {
  return unique([firstNameKey(person), middleNameKey(person)])
    .join(" ")
    .trim();
}

/**
 * True when both sides name a middle name and they disagree. An initial counts as agreeing
 * with a name it starts, so "George W" and "George William" are not in conflict; a side with
 * no middle name at all is never in conflict, because absence is not evidence.
 */
export function middleNamesConflict(leftPerson, rightPerson) {
  const leftMiddle = middleNameKey(leftPerson);
  const rightMiddle = middleNameKey(rightPerson);
  if (leftMiddle === "" || rightMiddle === "" || leftMiddle === rightMiddle) {
    return false;
  }

  const leftCompact = leftMiddle.replace(/ /g, "");
  const rightCompact = rightMiddle.replace(/ /g, "");
  if (leftCompact === "" || rightCompact === "") {
    return false;
  }

  if (leftCompact.length === 1) return !rightCompact.startsWith(leftCompact);
  if (rightCompact.length === 1) return !leftCompact.startsWith(rightCompact);

  return leftCompact !== rightCompact;
}

function normalizedOtherLastNames(value) {
  return unique(
    String(value ?? "")
      .split(/\s*[,;]\s*/)
      .map((part) => foldText(part))
  );
}

/**
 * A married surname on one profile that the other records under Other Last Names. Weak on its
 * own but it explains an apparent surname conflict, so it both scores and softens.
 */
export function matchedOtherLastNameOverlaps(leftPerson, rightPerson) {
  const leftDisplay = String(leftPerson.LastNameCurrent ?? "").trim();
  const rightDisplay = String(rightPerson.LastNameCurrent ?? "").trim();
  const leftCurrent = foldText(leftDisplay);
  const rightCurrent = foldText(rightDisplay);
  const leftLnab = foldText(leftPerson.LastNameAtBirth);
  const rightLnab = foldText(rightPerson.LastNameAtBirth);

  if (leftCurrent === "" && rightCurrent === "") {
    return [];
  }

  const leftOther = new Set(normalizedOtherLastNames(leftPerson.LastNameOther));
  const rightOther = new Set(normalizedOtherLastNames(rightPerson.LastNameOther));
  const overlaps = [];

  if (leftCurrent !== "" && leftCurrent !== rightCurrent && leftCurrent !== leftLnab && rightOther.has(leftCurrent)) {
    overlaps.push(leftDisplay);
  }
  if (
    rightCurrent !== "" &&
    rightCurrent !== leftCurrent &&
    rightCurrent !== rightLnab &&
    leftOther.has(rightCurrent)
  ) {
    overlaps.push(rightDisplay);
  }

  return unique(overlaps);
}

/* ------------------------------------------------------------------- children ---- */

export function childOverlapNameKeys(leftChildren, rightChildren) {
  const usable = (children) =>
    new Set((children || []).map((child) => child.nameKey).filter((key) => key && !UNKNOWN_TOKENS.has(key)));
  const rightNames = usable(rightChildren);
  return [...usable(leftChildren)].filter((key) => rightNames.has(key));
}

/**
 * Children of the two profiles born within a year of each other but under different names.
 * One woman does not have a Mary and a Sarah eleven months apart, so this is the strongest
 * signal on the page that two similar profiles are two different people.
 */
export function childConflictCountSameEra(leftChildren, rightChildren, yearWindow = 1) {
  const dated = (children) =>
    (children || []).filter((child) => child.nameKey && !UNKNOWN_TOKENS.has(child.nameKey) && child.birthYear != null);

  const leftEntries = dated(leftChildren);
  const rightEntries = dated(rightChildren);
  if (!leftEntries.length || !rightEntries.length) {
    return 0;
  }

  let conflicts = 0;
  for (const left of leftEntries) {
    for (const right of rightEntries) {
      if (left.nameKey === right.nameKey) continue;
      if (Math.abs(Number(left.birthYear) - Number(right.birthYear)) <= yearWindow) {
        conflicts += 1;
        break;
      }
    }
  }

  return conflicts;
}

/* -------------------------------------------------------------------- spouses ---- */

function spouseIdSet(person) {
  return new Set((person.spouses || []).map((spouse) => normalizeId(spouse.id)).filter(Boolean));
}

export function pairHasNonOverlappingSpouseLinks(leftPerson, rightPerson) {
  const leftSpouses = spouseIdSet(leftPerson);
  const rightSpouses = spouseIdSet(rightPerson);
  if (!leftSpouses.size || !rightSpouses.size) {
    return false;
  }
  return ![...leftSpouses].some((id) => rightSpouses.has(id));
}

/* ------------------------------------------------------------------ penalties ---- */

function fatherFirstNameConflictPenalty(leftFatherName, rightFatherName, leftPerson, rightPerson, locationSupport) {
  if (leftFatherName === "" || rightFatherName === "" || leftFatherName === rightFatherName) {
    return [0, ""];
  }

  const birthDayExactMatch =
    compactDatePrecision(leftPerson.birthCompact) === "full" &&
    compactDatePrecision(rightPerson.birthCompact) === "full" &&
    leftPerson.birthCompact === rightPerson.birthCompact;

  if (birthDayExactMatch && locationSupport.birthStatus === "strong") {
    return [
      FATHER_FIRST_NAME_CONFLICT_REDUCED_PENALTY,
      "Fathers have different first names. Penalty reduced because the birth date and birth place both match exactly.",
    ];
  }

  return [FATHER_FIRST_NAME_CONFLICT_PENALTY, "Fathers have different first names."];
}

/**
 * The further apart two years are, the faster confidence should fall away.
 *
 * This is where a wide gap between estimated dates lands now that it no longer rejects the
 * pair: the curve is steep enough that ten years apart leaves a candidate at the bottom of
 * the table, but it is still on the table, with the gap named, for you to judge.
 */
function yearGapPenalty(leftCompact, rightCompact, label) {
  const leftYear = compactDateYear(leftCompact);
  const rightYear = compactDateYear(rightCompact);
  if (leftYear === "" || rightYear === "") {
    return [0, ""];
  }

  const yearGap = Math.abs(Number(leftYear) - Number(rightYear));
  if (yearGap === 0) {
    return [0, ""];
  }

  const eitherIsEstimate = compactDateIsEstimate(leftCompact) || compactDateIsEstimate(rightCompact);

  // An estimate being out by a few years is ordinary, so its curve is the gentler one. Two
  // record-derived dates drifting apart is far more telling.
  const rawPenalty = eitherIsEstimate ? 2 + Math.trunc(1.45 ** yearGap * 1.5) : 4 + Math.trunc(1.65 ** yearGap * 2.5);
  const penaltyCap = eitherIsEstimate ? 45 : 60;

  // A gentle tail past the cap, so a forty-year gap still ranks below a twelve-year one
  // instead of tying with it.
  const tail = Math.min(15, Math.floor(yearGap / 5));

  return [
    Math.min(penaltyCap, rawPenalty) + tail,
    `${label} dates are ${yearGap} year${yearGap === 1 ? "" : "s"} apart (${leftYear} vs ${rightYear})` +
      (eitherIsEstimate ? ", but at least one is only a year or a decade, so it may be an estimate." : "."),
  ];
}

function parentIdAndMotherLnabConflictPenalty(leftPerson, rightPerson, leftFatherName, rightFatherName) {
  let penalty = 0;
  const warnings = [];

  const leftFatherId = normalizeId(leftPerson.fatherId);
  const rightFatherId = normalizeId(rightPerson.fatherId);
  const leftMotherId = normalizeId(leftPerson.motherId);
  const rightMotherId = normalizeId(rightPerson.motherId);

  const fatherIdsConflict = leftFatherId !== "" && rightFatherId !== "" && leftFatherId !== rightFatherId;
  const motherIdsConflict = leftMotherId !== "" && rightMotherId !== "" && leftMotherId !== rightMotherId;

  if (fatherIdsConflict) {
    if (leftFatherName !== "" && leftFatherName === rightFatherName) {
      // Same-named fathers on different profiles are often themselves duplicates.
      penalty += 6;
      warnings.push("Fathers are different profiles, though they share a first name.");
    } else {
      penalty += 12;
      warnings.push("Fathers are different profiles.");
    }
  }

  const motherNameConflict = parentRefFieldConflicts(leftPerson, rightPerson, "Mother", "firstName");
  const motherLnabConflict = parentRefFieldConflicts(leftPerson, rightPerson, "Mother", "lnab");
  if (motherIdsConflict && motherLnabConflict) {
    penalty += 26;
    warnings.push("Mothers are different profiles with different last names at birth.");
  } else if (motherIdsConflict && motherNameConflict) {
    penalty += 18;
    warnings.push("Mothers are different profiles with different first names.");
  } else if (motherIdsConflict) {
    penalty += 10;
    warnings.push("Mothers are different profiles.");
  }

  if (fatherIdsConflict && motherIdsConflict) {
    penalty += 8;
    warnings.push("Both parents are different profiles.");
  }

  return [Math.min(penalty, 50), warnings];
}

function decadeLikeDateMatchPenalty(leftPerson, rightPerson) {
  let penalty = 0;
  const warnings = [];

  for (const [label, field] of [
    ["Birth", "birthCompact"],
    ["Death", "deathCompact"],
  ]) {
    const leftValue = leftPerson[field];
    const rightValue = rightPerson[field];
    if (!leftValue || !rightValue) continue;

    const leftYear = compactDateYear(leftValue);
    if (leftYear === "" || leftYear !== compactDateYear(rightValue)) continue;

    if (compactDateIsDecadeLike(leftValue) || compactDateIsDecadeLike(rightValue)) {
      penalty += DECADE_LIKE_DATE_MATCH_PENALTY;
      warnings.push(
        `${label} dates only agree to the decade (${compactDateDisplay(leftValue)} vs ${compactDateDisplay(
          rightValue
        )}).`
      );
    }
  }

  return [penalty, warnings];
}

function partialLocationWarning(label, leftValue, rightValue, status) {
  const leftText = String(leftValue ?? "").trim();
  const rightText = String(rightValue ?? "").trim();
  if (leftText === "" || rightText === "" || status !== "partial") {
    return "";
  }
  return `${label} places overlap only partially (${leftText} vs ${rightText}).`;
}

/* --------------------------------------------------------------- hard rejects ---- */

/**
 * The reason two profiles cannot be the same person, or null. Chronology first, then place:
 * a birth after the other's death is decisive in a way a place disagreement never is.
 */
export function hardRejectReason(leftPerson, rightPerson) {
  const leftGender = foldText(leftPerson.Gender);
  const rightGender = foldText(rightPerson.Gender);
  if (leftGender !== "" && rightGender !== "" && leftGender !== rightGender) {
    return `Genders differ (${leftPerson.Gender} vs ${rightPerson.Gender}).`;
  }

  if (middleNamesConflict(leftPerson, rightPerson)) {
    return `Middle names conflict (${leftPerson.MiddleName} vs ${rightPerson.MiddleName}).`;
  }

  if (compactDateIsAfterOrSamePartialYear(leftPerson.birthCompact, rightPerson.deathCompact)) {
    return `Born after the other profile died (${compactDateDisplay(
      leftPerson.birthCompact
    )} vs died ${compactDateDisplay(rightPerson.deathCompact)}).`;
  }
  if (compactDateIsAfterOrSamePartialYear(rightPerson.birthCompact, leftPerson.deathCompact)) {
    return `Died before the other profile was born (died ${compactDateDisplay(
      leftPerson.deathCompact
    )} vs born ${compactDateDisplay(rightPerson.birthCompact)}).`;
  }

  // Only recorded dates can rule a pair out. A gap between estimates is scored down instead,
  // by yearGapPenalty, so the pair still appears with the gap spelled out.
  if (compactDatesRuleOutSamePerson(leftPerson.birthCompact, rightPerson.birthCompact)) {
    return `Recorded birth dates are too far apart for one person (${compactDateDisplay(
      leftPerson.birthCompact
    )} vs ${compactDateDisplay(rightPerson.birthCompact)}).`;
  }
  if (compactDatesRuleOutSamePerson(leftPerson.deathCompact, rightPerson.deathCompact)) {
    return `Recorded death dates are too far apart for one person (${compactDateDisplay(
      leftPerson.deathCompact
    )} vs ${compactDateDisplay(rightPerson.deathCompact)}).`;
  }

  for (const child of leftPerson.children || []) {
    if (compactDateIsDefinitelyAfter(child.birthCompact, rightPerson.deathCompact)) {
      return `A child was born after the other profile died (${compactDateDisplay(
        child.birthCompact
      )} vs died ${compactDateDisplay(rightPerson.deathCompact)}).`;
    }
  }
  for (const child of rightPerson.children || []) {
    if (compactDateIsDefinitelyAfter(child.birthCompact, leftPerson.deathCompact)) {
      return `A child was born after the other profile died (${compactDateDisplay(
        child.birthCompact
      )} vs died ${compactDateDisplay(leftPerson.deathCompact)}).`;
    }
  }

  // Two families whose children were born in the same years under entirely different names
  // are two families. But siblings a year apart are ordinary, so this can only be read as a
  // conflict when the two child lists have no name in common at all — otherwise a real
  // duplicate rejects itself on its own children.
  if (
    childOverlapNameKeys(leftPerson.children, rightPerson.children).length === 0 &&
    childConflictCountSameEra(leftPerson.children, rightPerson.children, 1) > 0
  ) {
    return "Both profiles have children born in the same years, and none of them share a name.";
  }

  const birthCountryMismatch = hardRejectLocationCountryMismatch(leftPerson.BirthLocation, rightPerson.BirthLocation);
  if (birthCountryMismatch) {
    return `Born in different countries (${birthCountryMismatch[0]} vs ${birthCountryMismatch[1]}).`;
  }

  const deathCountryMismatch = hardRejectLocationCountryMismatch(leftPerson.DeathLocation, rightPerson.DeathLocation);
  if (deathCountryMismatch) {
    return `Died in different countries (${deathCountryMismatch[0]} vs ${deathCountryMismatch[1]}).`;
  }

  const birthStateMismatch = hardRejectUsStateMismatch(leftPerson.BirthLocation, rightPerson.BirthLocation);
  if (birthStateMismatch) {
    return `Born in different US states (${birthStateMismatch[0]} vs ${birthStateMismatch[1]}).`;
  }

  const deathStateMismatch = hardRejectUsStateMismatch(leftPerson.DeathLocation, rightPerson.DeathLocation);
  if (deathStateMismatch) {
    return `Died in different US states (${deathStateMismatch[0]} vs ${deathStateMismatch[1]}).`;
  }

  return null;
}

/* ------------------------------------------------------------------- scoring ---- */

function datePoints(leftValue, rightValue) {
  const leftDate = String(leftValue ?? "");
  const rightDate = String(rightValue ?? "");
  const leftYear = compactDateYear(leftDate);
  const rightYear = compactDateYear(rightDate);

  if (leftYear === "" || leftYear !== rightYear) {
    return 0;
  }
  if (compactDateIsDecadeLike(leftDate) || compactDateIsDecadeLike(rightDate)) {
    return 0;
  }

  let points = 1;
  const leftPrecision = compactDatePrecision(leftDate);
  const rightPrecision = compactDatePrecision(rightDate);
  const bothAtLeastMonth =
    ["year_month", "full"].includes(leftPrecision) && ["year_month", "full"].includes(rightPrecision);

  if (bothAtLeastMonth && leftDate.slice(0, 6) === rightDate.slice(0, 6)) {
    points += 2;
    if (leftPrecision === "full" && rightPrecision === "full" && leftDate.slice(0, 8) === rightDate.slice(0, 8)) {
      points += 2;
    }
  }

  return points;
}

/**
 * How closely two given names agree. The Duplicate Finder gets an exact match for free from
 * the SQL block that produced the pair; this page hands us "Georg" against "George" and
 * "Geo." against both, so near matches earn partial credit here rather than nothing.
 */
function firstNameAgreement(leftPerson, rightPerson) {
  const leftKey = firstNameKey(leftPerson);
  const rightKey = firstNameKey(rightPerson);
  if (leftKey === "" || rightKey === "") {
    return { points: 0, reason: "", warning: "" };
  }

  const leftFullGiven = fullGivenNameKey(leftPerson);
  const rightFullGiven = fullGivenNameKey(rightPerson);
  if (
    leftFullGiven !== "" &&
    leftFullGiven === rightFullGiven &&
    middleNameKey(leftPerson) !== "" &&
    middleNameKey(rightPerson) !== ""
  ) {
    return { points: 3, reason: "First and middle names match.", warning: "" };
  }

  if (leftKey === rightKey) {
    return { points: 2, reason: "First names match.", warning: "" };
  }

  const shorter = leftKey.length <= rightKey.length ? leftKey : rightKey;
  const longer = leftKey.length <= rightKey.length ? rightKey : leftKey;
  if (shorter.length >= 3 && longer.startsWith(shorter)) {
    return {
      points: 1,
      reason: `First names are variants of each other (${leftPerson.FirstName} / ${rightPerson.FirstName}).`,
      warning: "",
    };
  }
  if (shorter.length === 1 && longer.startsWith(shorter)) {
    return { points: 1, reason: "One first name is an initial of the other.", warning: "" };
  }

  return {
    points: 0,
    reason: "",
    warning: `First names differ (${leftPerson.FirstName} vs ${rightPerson.FirstName}).`,
  };
}

/**
 * Surname agreement across last name at birth, current last name, and the crossover between
 * them — a woman recorded under her married name on one profile and her maiden name on the
 * other is the single commonest reason a real duplicate looks unrelated.
 */
function surnameAgreement(leftPerson, rightPerson) {
  const leftLnab = foldText(leftPerson.LastNameAtBirth);
  const rightLnab = foldText(rightPerson.LastNameAtBirth);
  const leftCurrent = foldText(leftPerson.LastNameCurrent);
  const rightCurrent = foldText(rightPerson.LastNameCurrent);

  let points = 0;
  const reasons = [];
  const warnings = [];

  if (leftLnab !== "" && leftLnab === rightLnab) {
    points += 2;
    reasons.push("Last names at birth match.");
  }
  if (leftCurrent !== "" && leftCurrent === rightCurrent) {
    points += 2;
    reasons.push("Current last names match.");
  }

  const crossover = (leftLnab !== "" && leftLnab === rightCurrent) || (rightLnab !== "" && rightLnab === leftCurrent);
  if (points === 0 && crossover) {
    points += 2;
    reasons.push("One profile's last name at birth is the other's current last name.");
  }

  // The app rejects here. We penalise, so the result still appears with its reason.
  if (points === 0 && leftLnab !== "" && rightLnab !== "" && leftLnab !== rightLnab) {
    warnings.push(`Last names at birth differ (${leftPerson.LastNameAtBirth} vs ${rightPerson.LastNameAtBirth}).`);
  }

  return { points, reasons, warnings, hasSurnameEvidence: points > 0 };
}

/**
 * Score one candidate against the anchor profile.
 *
 * Returns `{ score, level, points, reasons, warnings, rejected, rejectReason, locationSupport }`.
 * `score` is 0..100; `rejected` results always score 0 and carry `rejectReason`.
 */
export function scorePair(anchor, candidate) {
  const locationSupport = pairLocationSupport(anchor, candidate);
  const reasons = [...locationSupport.reasons];
  const warnings = [...locationSupport.warnings];

  const rejectReason = hardRejectReason(anchor, candidate);
  if (rejectReason) {
    return {
      score: 0,
      level: levelForScore(0),
      points: 0,
      reasons: unique(reasons),
      warnings: unique([rejectReason, ...warnings]),
      rejected: true,
      rejectReason,
      locationSupport: locationSupport.locationSupport,
      birthLocationStatus: locationSupport.birthStatus,
      deathLocationStatus: locationSupport.deathStatus,
      matchedLocationParts: locationSupport.matchedLocationParts,
    };
  }

  let points = 0;
  points += datePoints(anchor.birthCompact, candidate.birthCompact);
  points += datePoints(anchor.deathCompact, candidate.deathCompact);

  const nameAgreement = firstNameAgreement(anchor, candidate);
  points += nameAgreement.points;
  if (nameAgreement.reason) reasons.push(nameAgreement.reason);
  if (nameAgreement.warning) warnings.push(nameAgreement.warning);

  const surname = surnameAgreement(anchor, candidate);
  points += surname.points;
  reasons.push(...surname.reasons);
  warnings.push(...surname.warnings);

  if (locationSupport.birthStatus === "strong") points += 1;
  if (locationSupport.deathStatus === "strong") points += 1;

  const anchorFatherName = parentFirstName(anchor, "Father");
  const candidateFatherName = parentFirstName(candidate, "Father");
  const anchorMotherName = parentFirstName(anchor, "Mother");
  const candidateMotherName = parentFirstName(candidate, "Mother");

  const anchorFatherId = normalizeId(anchor.fatherId);
  const candidateFatherId = normalizeId(candidate.fatherId);
  if (anchorFatherId !== "" && anchorFatherId === candidateFatherId) {
    points += 1;
    reasons.push("Both profiles have the same father.");
  } else if (anchorFatherName !== "" && anchorFatherName === candidateFatherName) {
    points += 1;
    reasons.push("Fathers share a first name.");
  }

  const anchorMotherId = normalizeId(anchor.motherId);
  const candidateMotherId = normalizeId(candidate.motherId);
  if (anchorMotherId !== "" && anchorMotherId === candidateMotherId) {
    points += 1;
    reasons.push("Both profiles have the same mother.");
  } else if (anchorMotherName !== "" && anchorMotherName === candidateMotherName) {
    points += 1;
    reasons.push("Mothers share a first name.");
  }

  const overlappingChildren = childOverlapNameKeys(anchor.children, candidate.children);
  if (overlappingChildren.length) {
    points += 2;
    reasons.push(`Children share first names: ${overlappingChildren.join(", ")}.`);
  }

  const otherLastNameOverlaps = matchedOtherLastNameOverlaps(anchor, candidate);
  if (otherLastNameOverlaps.length) {
    points += 1;
    reasons.push(
      `A married surname appears in the other profile's other last names: ${otherLastNameOverlaps.join(", ")}.`
    );
  }

  let score = Math.max(0, Math.min(100, 45 + points * 5));

  const birthPartialWarning = partialLocationWarning(
    "Birth",
    anchor.BirthLocation,
    candidate.BirthLocation,
    locationSupport.birthStatus
  );
  const deathPartialWarning = partialLocationWarning(
    "Death",
    anchor.DeathLocation,
    candidate.DeathLocation,
    locationSupport.deathStatus
  );
  if (birthPartialWarning) {
    score -= WEIGHTED_PARTIAL_LOCATION_PENALTY;
    warnings.push(birthPartialWarning);
  }
  if (deathPartialWarning) {
    score -= WEIGHTED_PARTIAL_LOCATION_PENALTY;
    warnings.push(deathPartialWarning);
  }

  if (["none", "unknown"].includes(locationSupport.locationSupport)) {
    score -= 8;
    warnings.push("No place evidence supports this match.");
  }

  // The app rejects on this; here it is a penalty, since people did move counties.
  const distantCounties = nonContiguousUkBirthCounties(anchor.BirthLocation, candidate.BirthLocation);
  if (distantCounties) {
    const [nation, anchorCounty, candidateCounty] = distantCounties;
    score -= 18;
    warnings.push(
      `Born in ${UK_BIRTH_COUNTY_NATION_ADJECTIVES[nation] || nation} counties that do not border each other ` +
        `(${anchorCounty} vs ${candidateCounty}).`
    );
  }

  // Different exact death dates, when both are known, all but settle it.
  if (
    compactDatePrecision(anchor.deathCompact) === "full" &&
    compactDatePrecision(candidate.deathCompact) === "full" &&
    anchor.deathCompact !== candidate.deathCompact
  ) {
    score -= 20;
    warnings.push(
      `Exact death dates conflict (${compactDateDisplay(anchor.deathCompact)} vs ${compactDateDisplay(
        candidate.deathCompact
      )}).`
    );
  }

  const leftCurrent = foldText(anchor.LastNameCurrent);
  const rightCurrent = foldText(candidate.LastNameCurrent);
  const leftLnab = foldText(anchor.LastNameAtBirth);
  const rightLnab = foldText(candidate.LastNameAtBirth);
  const marriedNameConflict =
    leftCurrent !== "" &&
    rightCurrent !== "" &&
    leftCurrent !== rightCurrent &&
    leftCurrent !== leftLnab &&
    rightCurrent !== rightLnab;

  if (marriedNameConflict) {
    if (otherLastNameOverlaps.length) {
      score -= 16;
      warnings.push("Current last names differ, though one appears in the other's other last names.");
    } else {
      score -= 24;
      warnings.push(
        `Current last names are different married surnames (${anchor.LastNameCurrent} vs ${candidate.LastNameCurrent}).`
      );
    }
  }

  if (!surname.hasSurnameEvidence && surname.warnings.length) {
    score -= 20;
  }

  if (nameAgreement.points === 0 && nameAgreement.warning) {
    score -= 20;
  }

  const [fatherConflictPenalty, fatherConflictWarning] = fatherFirstNameConflictPenalty(
    anchorFatherName,
    candidateFatherName,
    anchor,
    candidate,
    locationSupport
  );
  if (fatherConflictPenalty > 0) {
    score -= fatherConflictPenalty;
    warnings.push(fatherConflictWarning);
  }

  const [parentIdPenalty, parentIdWarnings] = parentIdAndMotherLnabConflictPenalty(
    anchor,
    candidate,
    anchorFatherName,
    candidateFatherName
  );
  if (parentIdPenalty > 0) {
    score -= parentIdPenalty;
    warnings.push(...parentIdWarnings);
  }

  for (const [leftCompact, rightCompact, label] of [
    [anchor.birthCompact, candidate.birthCompact, "Birth"],
    [anchor.deathCompact, candidate.deathCompact, "Death"],
  ]) {
    const [gapPenalty, gapWarning] = yearGapPenalty(leftCompact, rightCompact, label);
    if (gapPenalty > 0) {
      score -= gapPenalty;
      warnings.push(gapWarning);
    }
  }

  const [decadePenalty, decadeWarnings] = decadeLikeDateMatchPenalty(anchor, candidate);
  if (decadePenalty > 0) {
    score -= decadePenalty;
    warnings.push(...decadeWarnings);
  }

  if (pairHasNonOverlappingSpouseLinks(anchor, candidate)) {
    score -= 24;
    warnings.push(
      "Different spouses are listed, though both marriages could be real if they happened at different times."
    );
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    level: levelForScore(score),
    points,
    reasons: unique(reasons),
    warnings: unique(warnings),
    rejected: false,
    rejectReason: null,
    weakEvidence: points <= WEAK_EVIDENCE_POINTS,
    locationSupport: locationSupport.locationSupport,
    birthLocationStatus: locationSupport.birthStatus,
    deathLocationStatus: locationSupport.deathStatus,
    matchedLocationParts: locationSupport.matchedLocationParts,
  };
}
