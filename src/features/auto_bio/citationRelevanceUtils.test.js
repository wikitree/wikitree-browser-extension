import {
  citationCouldBeAboutEvent,
  couldHaveServedIn,
  citationGenderConflicts,
  citationMatchesEventYear,
  yearFromDate,
  yearsInCitation,
} from "./citationRelevanceUtils.js";

// Wood-24677: the death registration of William's wife Ann, which was being cited for his death.
const annsDeathRegistration = `'''Death Registration''':
"England & Wales General Register Office",
[https://www.gro.gov.uk/gro/content/certificates/indexes_search.asp?index=EW_Death&Year=1840&Range=0&Surname=WOOD&Age=49&AgeRange=0&Forename1=ANN&Gender=F&Quarter=J&District=STAFFORD%20UNION&Volume=17&Page=94 GRO Online Indexes - Death] (accessed 14 August 2026),
Wood, Ann (Age at death: 49).
''GRO Reference:'' 1840 Apr-May-Jun in Stafford Union Volume 17 Page 94.`;

const williamsDeathCertificate = `Twenty eighth January 1853, Infirmary, Stafford. William Wood, male, joiner.
Cause of death Morbus Cordis, certified.
''GRO Reference:'' 1853 Jan-Feb-Mar in Stafford Volume 06B Page 4.`;

describe("yearsInCitation", () => {
  test("ignores the year range of a database title", () => {
    expect(yearsInCitation('"Maryland, Births and Christenings, 1650-1995," index')).toEqual([]);
    expect(yearsInCitation("Marriages and Deaths, 1763 to 1820, Abstracted from Georgia Newspapers")).toEqual([]);
  });

  test("finds the years an event is dated to", () => {
    expect(yearsInCitation("William Wood burial (died in 1853 at age 69) on 31 Jan 1853")).toEqual([1853, 1853]);
  });

  test("ignores the date the citation was accessed", () => {
    // Otherwise a Find a Grave citation with no dates of its own is thrown out on the day it was read.
    expect(yearsInCitation("Find a Grave (www.findagrave.com/memorial/174497164 : accessed 2 May 2021)")).toEqual([]);
    expect(yearsInCitation("Ancestry.com Operations, Inc., 2010. Retrieved 28 December 2016")).toEqual([]);
  });

  test("returns nothing for a citation with no years", () => {
    expect(yearsInCitation("South Carolina Wills, Vol. RR, pp. 1-2.")).toEqual([]);
  });
});

describe("citationMatchesEventYear", () => {
  test("rejects a citation whose only year is another event", () => {
    expect(citationMatchesEventYear(annsDeathRegistration, 1853)).toBe(false);
  });

  test("keeps a citation for the right year", () => {
    expect(citationMatchesEventYear(williamsDeathCertificate, 1853)).toBe(true);
  });

  test("allows a year either side, for a burial early the next year", () => {
    expect(citationMatchesEventYear("Buried 3 Jan 1854.", 1853)).toBe(true);
    expect(citationMatchesEventYear("Buried 3 Jan 1860.", 1853)).toBe(false);
  });

  test("keeps a citation that names no year", () => {
    expect(citationMatchesEventYear("Find a Grave, memorial page, citing Forest Lawn Memorial Park.", 2016)).toBe(true);
  });

  test("keeps everything when the event year is unknown", () => {
    expect(citationMatchesEventYear(annsDeathRegistration, null)).toBe(true);
    expect(citationMatchesEventYear(annsDeathRegistration, "")).toBe(true);
  });
});

describe("citationGenderConflicts", () => {
  test("spots a woman's GRO index entry cited for a man", () => {
    expect(citationGenderConflicts(annsDeathRegistration, "Male")).toBe(true);
    expect(citationGenderConflicts(annsDeathRegistration, "Female")).toBe(false);
  });

  test("says nothing when the citation carries no sex", () => {
    expect(citationGenderConflicts(williamsDeathCertificate, "Male")).toBe(false);
  });

  test("says nothing when the profile has no gender", () => {
    expect(citationGenderConflicts(annsDeathRegistration, "")).toBe(false);
  });
});

describe("citationCouldBeAboutEvent", () => {
  test("turns down the wife's death registration", () => {
    expect(citationCouldBeAboutEvent(annsDeathRegistration, { eventYear: 1853, gender: "Male" })).toBe(false);
  });

  test("accepts the man's own death certificate", () => {
    expect(citationCouldBeAboutEvent(williamsDeathCertificate, { eventYear: 1853, gender: "Male" })).toBe(true);
  });

  // Charlton-598: three citations about his wife and step-daughter were cited for his death.
  test.each([
    ["''The Georgia Gazette'', Savannah, GA, 7 Nov 1793: “Charleton, Mrs. __, widow Dr. Charleton of SC.”", 1793],
    ["''The Georgia Gazette'', 17 Apr 1794: “Charleton, Mrs. Ann Hunt; widow; James Montfort, ltrs. admr.”", 1794],
    ["''The Georgia Republican'', 28 Apr 1824: “Montfort, Mrs. Lucy Kennon, d. 4-28-1824.”", 1824],
  ])("turns down a citation dated %#", (citation) => {
    expect(citationCouldBeAboutEvent(citation, { eventYear: 1789, gender: "Male" })).toBe(false);
  });

  test("keeps a Find a Grave citation whose only date is when it was read", () => {
    const findAGrave =
      "Find a Grave, database and images (https://www.findagrave.com/memorial/174497164 : accessed 2 May 2021), " +
      "memorial page for Carrie Fisher, citing Forest Lawn Memorial Park.";
    expect(citationCouldBeAboutEvent(findAGrave, { eventYear: 2016, gender: "Female" })).toBe(true);
  });

  test("still turns down the wife's registration when an accessed date is present", () => {
    expect(citationCouldBeAboutEvent(annsDeathRegistration, { eventYear: 1853, gender: "Male" })).toBe(false);
  });

  test("accepts a Find a Grave citation for the year of death", () => {
    const findAGrave =
      "Find a Grave, database and images, memorial page for Carrie Fisher (21 Oct 1956–27 Dec 2016), citing Forest Lawn.";
    expect(citationCouldBeAboutEvent(findAGrave, { eventYear: 2016, gender: "Female" })).toBe(true);
  });
});

describe("yearFromDate", () => {
  test.each([
    ["1853-01-28", 1853],
    ["1789", 1789],
    ["0000-00-00", null],
    ["", null],
    [undefined, null],
  ])("reads %s as %s", (date, expected) => {
    expect(yearFromDate(date)).toBe(expected);
  });
});

describe("yearsInCitation keeps real dates near the noise it removes", () => {
  test("takes out the accessed year but not the event year after it", () => {
    expect(yearsInCitation("Death Certificate. Accessed 2021. He died 28 January 1853.")).toEqual([1853]);
  });

  test("takes out the publisher year but not the event year", () => {
    expect(
      yearsInCitation("Provo, UT: Ancestry.com Operations, Inc., 2010. William Wood burial on 31 Jan 1853.")
    ).toEqual([1853]);
  });
});

describe("couldHaveServedIn", () => {
  test("turns down a service record for a man of 62", () => {
    // Winder-432, born 1852, was given his son Harry's First World War papers.
    expect(couldHaveServedIn(1852, 1914)).toBe(false);
  });

  test("accepts a man of serving age", () => {
    expect(couldHaveServedIn(1886, 1914)).toBe(true); // Harry, 28
    expect(couldHaveServedIn(1899, 1914)).toBe(true); // 15, enlisted late in the war
    expect(couldHaveServedIn(1860, 1914)).toBe(true); // 54, old but not impossible
  });

  test("turns down a child", () => {
    expect(couldHaveServedIn(1910, 1914)).toBe(false);
  });

  test("says nothing when a year is unknown", () => {
    expect(couldHaveServedIn(null, 1914)).toBe(true);
    expect(couldHaveServedIn(1852, null)).toBe(true);
    expect(couldHaveServedIn("", "")).toBe(true);
  });
});
