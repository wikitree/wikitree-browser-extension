import {
  generationalSuffixesConflict,
  isInitialFor,
  matchesNameOrInitial,
  namesMatchByFirstAndLast,
  possessiveName,
  withoutGenerationalSuffix,
} from "./nameUtils.js";

describe("namesMatchByFirstAndLast", () => {
  test("matches names with accents removed", () => {
    expect(namesMatchByFirstAndLast("José García", "Jose Garcia")).toBe(true);
  });

  test("matches letters that do not decompose under unicode normalization", () => {
    expect(namesMatchByFirstAndLast("Søren Kierkegaard", "Soren Kierkegaard")).toBe(true);
  });

  test("uses only the first given name when multiple are present", () => {
    expect(namesMatchByFirstAndLast("Mary Ann Smith", "Mary Smith")).toBe(true);
  });

  test("allows conservative fuzzy matching on the first name", () => {
    expect(namesMatchByFirstAndLast("Gerrit van Dijk", "Gert van Dijk")).toBe(true);
  });

  test("does not match when surnames differ", () => {
    expect(namesMatchByFirstAndLast("Jose Garcia", "Jose Martinez")).toBe(false);
  });

  test("does not over-match nearby first names", () => {
    expect(namesMatchByFirstAndLast("John Smith", "Joan Smith")).toBe(false);
  });
});

describe("generational suffixes", () => {
  test("strips a suffix so a citation name can match a stored name", () => {
    expect(withoutGenerationalSuffix("Garry V McBride III")).toBe("Garry V McBride");
    expect(withoutGenerationalSuffix("Gary V McBride, Jr.")).toBe("Gary V McBride");
    expect(withoutGenerationalSuffix("Deedra Ella McBride")).toBe("Deedra Ella McBride");
  });

  test("does not mistake a trailing middle initial for a suffix", () => {
    expect(withoutGenerationalSuffix("Garry V McBride")).toBe("Garry V McBride");
  });

  test("treats two different stated suffixes as different people", () => {
    expect(generationalSuffixesConflict("John Smith Jr", "John Smith Sr")).toBe(true);
    expect(generationalSuffixesConflict("Garry V McBride III", "Garry V McBride, Jr.")).toBe(true);
    expect(generationalSuffixesConflict("John Smith Junior", "John Smith Jr.")).toBe(false);
  });

  test("says nothing when only one name carries a suffix", () => {
    expect(generationalSuffixesConflict("John Smith Jr", "John Smith")).toBe(false);
    expect(generationalSuffixesConflict("John Smith", "John Smith")).toBe(false);
  });
});

describe("possessiveName", () => {
  test("names the person for a sentence that opens a paragraph", () => {
    expect(possessiveName("Garry")).toBe("Garry's");
  });

  test("still adds 's to a name ending in s", () => {
    expect(possessiveName("James")).toBe("James's");
  });

  test("leaves a name that already ends in an apostrophe alone", () => {
    expect(possessiveName("Jones'")).toBe("Jones'");
  });

  test("gives nothing back when there is no name to use", () => {
    expect(possessiveName("")).toBe("");
    expect(possessiveName(undefined)).toBe("");
  });
});

describe("isInitialFor", () => {
  test("reads an initial as standing for the name", () => {
    // Coombes-890: a marriage index recording "C F Coombes" is Charles Francis Coombes.
    expect(isInitialFor("C", "Charles")).toBe(true);
    expect(isInitialFor("Charles", "C")).toBe(true);
    expect(isInitialFor("C.", "Charles")).toBe(true);
  });

  test("does not match a different letter", () => {
    expect(isInitialFor("J", "Charles")).toBe(false);
  });

  test("needs one side to actually be an initial", () => {
    expect(isInitialFor("Charles", "Clara")).toBe(false);
    expect(isInitialFor("", "Charles")).toBe(false);
  });
});

describe("namesMatchByFirstAndLast with initials", () => {
  test("matches a name written with initials to the full name", () => {
    expect(namesMatchByFirstAndLast("C F Coombes", "Charles Francis Coombes")).toBe(true);
  });

  test("still needs the surname to agree", () => {
    expect(namesMatchByFirstAndLast("C F Dyer", "Charles Francis Coombes")).toBe(false);
  });
});

describe("matchesNameOrInitial", () => {
  test("finds the profile person behind an initial", () => {
    expect(matchesNameOrInitial("C", ["Charles", "Charlie", "Chas"])).toBe(true);
    expect(matchesNameOrInitial("Ida", ["Charles", "Charlie"])).toBe(false);
  });
});

describe("namesMatchByFirstAndLast across a married name", () => {
  test("matches a birth-surname record to a married WikiTree name", () => {
    // Coombes-890: the marriage index says "Ida Dyer"; WikiTree has "Ida Elisabeth (Dyer) Coombes".
    expect(namesMatchByFirstAndLast("Ida Dyer", "Ida Elisabeth (Dyer) Coombes")).toBe(true);
    expect(namesMatchByFirstAndLast("Ida Elisabeth (Dyer) Coombes", "Ida Dyer")).toBe(true);
  });

  test("does not guess at an unbracketed middle name", () => {
    /* WikiTree always brackets a birth surname that differs, so "Ida Dyer Coombes" carries no
    such promise and a middle name must not be read as a surname. */
    expect(namesMatchByFirstAndLast("Ida Dyer", "Ida Dyer Coombes")).toBe(false);
  });

  test("still matches on the married surname", () => {
    expect(namesMatchByFirstAndLast("Ida Coombes", "Ida Elisabeth (Dyer) Coombes")).toBe(true);
  });

  test("does not match a different woman", () => {
    expect(namesMatchByFirstAndLast("Sarah Dyer", "Ida Elisabeth (Dyer) Coombes")).toBe(false);
    expect(namesMatchByFirstAndLast("Ida Smith", "Ida Elisabeth (Dyer) Coombes")).toBe(false);
  });

  test("does not treat a middle name as a surname", () => {
    expect(namesMatchByFirstAndLast("Charles Francis", "Charles Francis Coombes")).toBe(false);
  });
});
