/*
Created By: Ian Beacall (Beacall-6)

The anchor and most candidates here are the real Baxter-6788 search that prompted this
feature, so the expectations describe results you can go and look at.
*/

import { toCompactDate } from "./match_dates";
import {
  childConflictCountSameEra,
  hardRejectReason,
  levelForScore,
  middleNamesConflict,
  scorePair,
} from "./match_scoring";

function person(fields) {
  const {
    BirthDate = "",
    DeathDate = "",
    BirthDateDecade = "",
    DeathDateDecade = "",
    children = [],
    spouses = [],
    parentRefs = [],
    ...rest
  } = fields;

  return {
    FirstName: "",
    MiddleName: "",
    LastNameAtBirth: "",
    LastNameCurrent: "",
    LastNameOther: "",
    Gender: "",
    BirthLocation: "",
    DeathLocation: "",
    fatherId: "",
    motherId: "",
    ...rest,
    parentRefs,
    spouses,
    children,
    birthCompact: toCompactDate(BirthDate, BirthDateDecade),
    deathCompact: toCompactDate(DeathDate, DeathDateDecade),
  };
}

/** Baxter-6788, the profile the Find Matches page was searching for. */
const georgeBaxter = person({
  Name: "Baxter-6788",
  FirstName: "George",
  LastNameAtBirth: "Baxter",
  LastNameCurrent: "Baxter",
  Gender: "Male",
  BirthDate: "1834-00-00",
  BirthLocation: "Scotland, United Kingdom",
});

describe("toCompactDate", () => {
  test("keeps a full date and a year-only date apart", () => {
    expect(toCompactDate("1839-06-17", "1830s")).toBe("18390617");
    expect(toCompactDate("1834-00-00", "1830s")).toBe("18340000");
  });

  test("falls back to the decade when there is no date at all", () => {
    expect(toCompactDate("0000-00-00", "1830s")).toBe("1830s");
    expect(toCompactDate("", "")).toBe("");
  });
});

describe("hard rejects", () => {
  test("a candidate born after the anchor died is rejected", () => {
    const anchor = person({
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      BirthDate: "1800-00-00",
      DeathDate: "1850-03-04",
    });
    const candidate = person({ FirstName: "George", LastNameAtBirth: "Baxter", BirthDate: "1860-00-00" });

    expect(hardRejectReason(anchor, candidate)).toMatch(/died before the other profile was born/i);
    expect(scorePair(anchor, candidate).score).toBe(0);
  });

  test("two recorded dates far apart still rule a pair out", () => {
    const anchor = person({ FirstName: "George", LastNameAtBirth: "Baxter", BirthDate: "1834-06-17" });
    const candidate = person({ FirstName: "George", LastNameAtBirth: "Baxter", BirthDate: "1834-11-02" });

    expect(hardRejectReason(anchor, candidate)).toMatch(/Recorded birth dates are too far apart/);
  });

  test("two month-precision dates five years apart rule a pair out", () => {
    const anchor = person({ FirstName: "George", LastNameAtBirth: "Baxter", BirthDate: "1834-06-00" });
    const candidate = person({ FirstName: "George", LastNameAtBirth: "Baxter", BirthDate: "1839-06-00" });

    expect(hardRejectReason(anchor, candidate)).toMatch(/Recorded birth dates are too far apart/);
  });

  test("Scotland against Nova Scotia is rejected on country once the dates agree", () => {
    const candidate = person({
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      Gender: "Male",
      BirthDate: "1834-00-00",
      BirthLocation: "River Philip, Cumberland, Nova Scotia",
    });

    expect(scorePair(georgeBaxter, candidate).rejectReason).toMatch(/different countries/i);
  });

  test("Becker-4248 of Saratov is rejected on both country and birth gap", () => {
    const candidate = person({
      Name: "Becker-4248",
      FirstName: "Georg",
      MiddleName: "Konrad",
      LastNameAtBirth: "Becker",
      Gender: "Male",
      BirthDate: "1843-00-00",
      BirthLocation: "Grimm, Saratov, Russia",
    });

    const result = scorePair(georgeBaxter, candidate);
    expect(result.rejected).toBe(true);
    expect(result.score).toBe(0);
  });

  test("two US states apart is a reject", () => {
    const anchor = person({
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      BirthDate: "1833-00-00",
      BirthLocation: "Lexington, Virginia, United States",
    });
    const candidate = person({
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      BirthDate: "1833-00-00",
      BirthLocation: "Masonville, Delaware County, New York, United States",
    });

    expect(hardRejectReason(anchor, candidate)).toMatch(/different US states/);
  });

  test("children of different names born in the same year is a reject", () => {
    const anchor = person({
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      BirthDate: "1834-00-00",
      children: [{ nameKey: "mary", birthYear: 1861, birthCompact: "18610000" }],
    });
    const candidate = person({
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      BirthDate: "1834-00-00",
      children: [{ nameKey: "sarah", birthYear: 1861, birthCompact: "18610000" }],
    });

    expect(childConflictCountSameEra(anchor.children, candidate.children)).toBe(1);
    expect(hardRejectReason(anchor, candidate)).toMatch(/none of them share a name/);
  });

  test("genders differing is a reject", () => {
    const anchor = person({ FirstName: "George", LastNameAtBirth: "Baxter", Gender: "Male", BirthDate: "1834-00-00" });
    const candidate = person({
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      Gender: "Female",
      BirthDate: "1834-00-00",
    });

    expect(hardRejectReason(anchor, candidate)).toMatch(/Genders differ/);
  });
});

describe("middle names", () => {
  test("an initial agrees with the name it starts", () => {
    expect(middleNamesConflict(person({ MiddleName: "W" }), person({ MiddleName: "William" }))).toBe(false);
  });

  test("two different middle names conflict", () => {
    expect(middleNamesConflict(person({ MiddleName: "Nathan" }), person({ MiddleName: "Addison" }))).toBe(true);
  });

  test("a missing middle name is never a conflict", () => {
    expect(middleNamesConflict(person({ MiddleName: "" }), person({ MiddleName: "Addison" }))).toBe(false);
  });
});

describe("scoring", () => {
  test("an exact lifespan, place and parent match scores near-certain", () => {
    const anchor = person({
      FirstName: "George",
      MiddleName: "William",
      LastNameAtBirth: "Baxter",
      LastNameCurrent: "Baxter",
      Gender: "Male",
      BirthDate: "1835-10-19",
      DeathDate: "1914-01-26",
      BirthLocation: "Madison, Kentucky, United States",
      DeathLocation: "Madison, Kentucky, United States",
      fatherId: "111",
      motherId: "222",
    });
    const candidate = person({ ...anchor, Name: "Baxter-9554" });

    const result = scorePair(anchor, candidate);
    expect(result.score).toBe(100);
    expect(levelForScore(result.score)).toBe("Near-certain");
    expect(result.reasons).toEqual(
      expect.arrayContaining(["First and middle names match.", "Last names at birth match."])
    );
  });

  test("a shared year and surname but nothing else stays low", () => {
    const candidate = person({
      Name: "Baxter-13093",
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      Gender: "Male",
      BirthDate: "1834-00-00",
    });

    const result = scorePair(georgeBaxter, candidate);
    expect(result.rejected).toBe(false);
    expect(result.score).toBeLessThan(80);
    expect(result.warnings).toEqual(expect.arrayContaining(["No place evidence supports this match."]));
  });

  test("a matching birth year beats a birth year four years out", () => {
    const near = person({
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      Gender: "Male",
      BirthDate: "1834-00-00",
      BirthLocation: "Scotland, United Kingdom",
    });
    const far = person({
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      Gender: "Male",
      BirthDate: "1838-00-00",
      BirthLocation: "Scotland, United Kingdom",
    });

    expect(scorePair(georgeBaxter, near).score).toBeGreaterThan(scorePair(georgeBaxter, far).score);
  });

  test("a decade-only date agreement earns no date points and takes a penalty", () => {
    const anchor = person({
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      BirthDateDecade: "1830s",
      BirthLocation: "Scotland, United Kingdom",
    });
    const candidate = person({
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      BirthDateDecade: "1830s",
      BirthLocation: "Scotland, United Kingdom",
    });

    const result = scorePair(anchor, candidate);
    expect(result.warnings.some((warning) => warning.includes("only agree to the decade"))).toBe(true);
  });

  test("a different surname is penalised, not rejected", () => {
    const sameSurname = person({
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      Gender: "Male",
      BirthDate: "1834-00-00",
      BirthLocation: "Scotland, United Kingdom",
    });
    const otherSurname = person({
      ...sameSurname,
      Name: "Blaxter-38",
      LastNameAtBirth: "Blaxter",
      LastNameCurrent: "",
    });

    const result = scorePair(georgeBaxter, otherSurname);
    expect(result.rejected).toBe(false);
    expect(result.warnings.some((warning) => warning.includes("Last names at birth differ"))).toBe(true);
    expect(result.score).toBeLessThan(scorePair(georgeBaxter, sameSurname).score);
  });

  test("Georg counts as a variant of George rather than a mismatch", () => {
    const candidate = person({
      FirstName: "Georg",
      LastNameAtBirth: "Baxter",
      Gender: "Male",
      BirthDate: "1834-00-00",
      BirthLocation: "Scotland, United Kingdom",
    });

    const result = scorePair(georgeBaxter, candidate);
    expect(result.reasons.some((reason) => reason.includes("variants of each other"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("First names differ"))).toBe(false);
  });

  test("a maiden-name to married-name crossover still counts as surname evidence", () => {
    const anchor = person({
      FirstName: "Mary",
      LastNameAtBirth: "Smith",
      LastNameCurrent: "Smith",
      Gender: "Female",
      BirthDate: "1840-05-02",
      BirthLocation: "Norwich, Norfolk, England",
    });
    const candidate = person({
      FirstName: "Mary",
      LastNameAtBirth: "Smith",
      LastNameCurrent: "Jones",
      Gender: "Female",
      BirthDate: "1840-05-02",
      BirthLocation: "Norwich, Norfolk, England",
    });

    const result = scorePair(anchor, candidate);
    expect(result.reasons).toEqual(expect.arrayContaining(["Last names at birth match."]));
    expect(result.score).toBeGreaterThan(80);
  });

  test("conflicting parent profiles pull a strong match down", () => {
    const base = {
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      Gender: "Male",
      BirthDate: "1834-06-01",
      BirthLocation: "Melrose, Roxburghshire, Scotland",
    };
    const agreeing = scorePair(
      person({ ...base, fatherId: "1", motherId: "2" }),
      person({ ...base, fatherId: "1", motherId: "2" })
    );
    const conflicting = scorePair(
      person({
        ...base,
        fatherId: "1",
        motherId: "2",
        parentRefs: [
          { role: "Father", firstName: "John", lnab: "Baxter" },
          { role: "Mother", firstName: "Ann", lnab: "Hume" },
        ],
      }),
      person({
        ...base,
        fatherId: "3",
        motherId: "4",
        parentRefs: [
          { role: "Father", firstName: "Thomas", lnab: "Baxter" },
          { role: "Mother", firstName: "Jane", lnab: "Scott" },
        ],
      })
    );

    expect(conflicting.score).toBeLessThan(agreeing.score);
    expect(conflicting.warnings.some((warning) => warning.includes("Fathers have different first names"))).toBe(true);
  });

  test("non-adjacent English birth counties are penalised but still shown", () => {
    const anchor = person({
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      Gender: "Male",
      BirthDate: "1834-00-00",
      BirthLocation: "Watchfield, Berkshire, England",
    });
    const candidate = person({
      FirstName: "George",
      LastNameAtBirth: "Baxter",
      Gender: "Male",
      BirthDate: "1834-00-00",
      BirthLocation: "Ravenstone, Leicestershire, England, United Kingdom",
    });

    const result = scorePair(anchor, candidate);
    expect(result.rejected).toBe(false);
    expect(result.warnings.some((warning) => warning.includes("do not border each other"))).toBe(true);
  });

  test("every score lands inside 0..100", () => {
    const candidates = [
      person({ FirstName: "George", LastNameAtBirth: "Baxter", Gender: "Male", BirthDate: "1834-00-00" }),
      person({ FirstName: "", LastNameAtBirth: "", Gender: "" }),
      person({
        FirstName: "George",
        MiddleName: "Nathan",
        LastNameAtBirth: "Baxter",
        BirthDate: "1844-10-12",
        DeathDate: "1930-12-24",
      }),
    ];

    for (const candidate of candidates) {
      const { score } = scorePair(georgeBaxter, candidate);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe("estimated dates are scored down, not rejected", () => {
  const baseline = { FirstName: "George", LastNameAtBirth: "Baxter", LastNameCurrent: "Baxter", Gender: "Male" };

  test("a decade between two year-only birth dates is not a reject", () => {
    const anchor = person({ ...baseline, BirthDate: "1750-00-00" });
    const candidate = person({ ...baseline, BirthDate: "1760-00-00" });

    expect(hardRejectReason(anchor, candidate)).toBeNull();

    const result = scorePair(anchor, candidate);
    expect(result.rejected).toBe(false);
    expect(result.score).toBeGreaterThan(0);
  });

  test("it scores low enough to sit at the bottom of the table", () => {
    const anchor = person({ ...baseline, BirthDate: "1750-00-00" });
    const candidate = person({ ...baseline, BirthDate: "1760-00-00" });

    expect(scorePair(anchor, candidate).score).toBeLessThan(50);
  });

  test("the warning names the gap and says the dates may be estimates", () => {
    const anchor = person({ ...baseline, BirthDate: "1750-00-00" });
    const candidate = person({ ...baseline, BirthDate: "1760-00-00" });

    const warning = scorePair(anchor, candidate).warnings.find((text) => text.startsWith("Birth dates are"));
    expect(warning).toBe(
      "Birth dates are 10 years apart (1750 vs 1760), but at least one is only a year or a decade, so it may be an estimate."
    );
  });

  test("a year-only date against a full date is still treated as an estimate", () => {
    const anchor = person({ ...baseline, BirthDate: "1750-00-00" });
    const candidate = person({ ...baseline, BirthDate: "1762-03-14" });

    expect(hardRejectReason(anchor, candidate)).toBeNull();
  });

  test("a decade date never rules a pair out, however wide the gap", () => {
    const anchor = person({ ...baseline, BirthDateDecade: "1750s" });
    const candidate = person({ ...baseline, BirthDate: "1799-04-02" });

    expect(hardRejectReason(anchor, candidate)).toBeNull();
  });

  test("wider gaps still rank below narrower ones", () => {
    const anchor = person({ ...baseline, BirthDate: "1750-00-00" });
    const near = person({ ...baseline, BirthDate: "1756-00-00" });
    const far = person({ ...baseline, BirthDate: "1790-00-00" });
    const further = person({ ...baseline, BirthDate: "1820-00-00" });

    const scores = [near, far, further].map((candidate) => scorePair(anchor, candidate).score);
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeGreaterThan(scores[2]);
  });

  test("a gap between estimated death dates is penalised too", () => {
    const anchor = person({ ...baseline, BirthDate: "1750-00-00", DeathDate: "1800-00-00" });
    const candidate = person({ ...baseline, BirthDate: "1750-00-00", DeathDate: "1815-00-00" });

    const result = scorePair(anchor, candidate);
    expect(result.rejected).toBe(false);
    expect(result.warnings.some((text) => text.startsWith("Death dates are 15 years apart"))).toBe(true);
  });
});
