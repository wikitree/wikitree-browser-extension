import {
  canonicalizeWtPlusRawToken,
  isLikelySuggestionsPrompt,
  tokenizeWtPlusQuery,
  translateSuggestionsFreeTextToQuery,
  validateAndRepairWtPlusQuery,
} from "./wt_plus_query_grammar";

describe("wt_plus_query_grammar tokenization", () => {
  test("tokenizes while preserving quoted terms", () => {
    const tokens = tokenizeWtPlusQuery('LastNameAtBirth=Smith BirthLocation="New York" OR Open');
    expect(tokens).toEqual(["LastNameAtBirth=Smith", 'BirthLocation="New York"', "OR", "Open"]);
  });
});

describe("wt_plus_query_grammar raw token canonicalization", () => {
  const cases = [
    ["open", "Open"],
    ["unsourced", "Unsourced"],
    ["male", "male"],
    ["no gender", null],
    ["NoGender", "NoGender"],
    ["20cen", "20Cen"],
    ["age42", "age42"],
    ["LastEdit2020", "LastEdit2020"],
    ["tree123", "Tree123"],
    ["FGCEM999", "fgcem999"],
    ["err123", null], // ERRxxx is not valid in text search (srch1); use Suggestions=123 instead
    ["3star", "3stars"],
    ["Creator_smith-1", "Creator_smith-1"],
  ];

  for (const [input, expected] of cases) {
    test(`canonicalizes token ${input}`, () => {
      expect(canonicalizeWtPlusRawToken(input)).toBe(expected);
    });
  }
});

describe("wt_plus_query_grammar query validation and repair", () => {
  const validCases = [
    ["Open BirthLocation=Devon", "Open BirthLocation=Devon"],
    ["open birthlocation=Devon", "Open BirthLocation=Devon"],
    ["LastNameAtBirth=Smith OR Unsourced", "LastNameAtBirth=Smith OR Unsourced"],
    ["Notables CategoryWord=Notables", "Notables CategoryWord=Notables"],
    ["tree123", "Tree123"],
    ["20cen", "20Cen"],
    ["fgmem1234", "fgmem1234"],
    ["LastNameatBirth=Smith", "LastNameAtBirth=Smith"],
    ["Suggestions=123", "Suggestions=123"],
    ["Manager=Athey-67", "Manager=Athey-67"],
    ["BirthCountry=England DeathCountry=UnknownCountry", "BirthCountry=England DeathCountry=UnknownCountry"],
    ["Created=Creator_Trtnik-2", "Created=Creator_Trtnik-2"],
    ["Created=Created_2024", "Created=Created_2024"],
    ["heading=biography", "heading=biography"],
    ["Template=unsourced", "Template=unsourced"],
    ['Unsourced BirthLocation=\\"Shropshire, England\\" 1820s', 'Unsourced BirthLocation="Shropshire, England" 1820s'],
    ['sql="([Default].[Birth Date].AsNumber < 19000000)"', 'sql="([Default].[Birth Date].AsNumber < 19000000)"'],
    [
      "sql=\"([Templates].[Template text].AsString Like '*project_box*')\"",
      "sql=\"([Templates].[Template text].AsString Like '*project_box*')\"",
    ],
    ["sql=\"Not([Bio].[Headings].AsString Like '*B2*S2*')\"", "sql=\"Not([Bio].[Headings].AsString Like '*B2*S2*')\""],
    [
      "sql=\"([Bio].[Replicated DNA yHaplogroup].AsString Like '*R1b*')\"",
      "sql=\"([Bio].[Replicated DNA yHaplogroup].AsString Like '*R1b*')\"",
    ],
  ];

  for (const [input, expected] of validCases) {
    test(`accepts query: ${input}`, () => {
      const result = validateAndRepairWtPlusQuery(input);
      expect(result.isValid).toBe(true);
      expect(result.normalizedQuery).toBe(expected);
    });
  }

  const invalidCases = ["BadField=foo", "some-random-token", "LastNameAtBirth=", "sql="];

  for (const input of invalidCases) {
    test(`rejects query: ${input}`, () => {
      const result = validateAndRepairWtPlusQuery(input);
      expect(result.isValid).toBe(false);
      expect(result.normalizedQuery).toBe("");
    });
  }
});

describe("wt_plus_query_grammar suggestions free text", () => {
  test("detects suggestions prompts", () => {
    expect(isLikelySuggestionsPrompt("suggestions 123 in devon")).toBe(true);
    expect(isLikelySuggestionsPrompt("error id 456 show hidden")).toBe(true);
    expect(isLikelySuggestionsPrompt("profiles managed by england project with no project box")).toBe(true);
    expect(isLikelySuggestionsPrompt("show me gedcom junk profiles")).toBe(true);
    expect(isLikelySuggestionsPrompt("born in devon")).toBe(false);
  });

  test("translates suggestions free text", () => {
    const result = translateSuggestionsFreeTextToQuery(
      "search suggestions 321 show hidden hide active max errors 200 in Devon"
    );
    expect(result).toEqual({
      searchType: "suggestions",
      suggestionId: "321",
      query: "Suggestions=321 Location=Devon",
      options: {
        showHidden: true,
        hideActive: true,
        maxErrors: "200",
      },
      understood: "suggestion 321 with in Devon",
    });
  });

  test("returns null for empty suggestions parse", () => {
    const result = translateSuggestionsFreeTextToQuery(" ");
    expect(result).toBeNull();
  });

  test("maps project managed without project box phrasing to Suggestions=931", () => {
    const result = translateSuggestionsFreeTextToQuery(
      "profiles managed by england project but missing project box in bio"
    );
    expect(result).not.toBeNull();
    expect(result.searchType).toBe("suggestions");
    expect(result.suggestionId).toBe("931");
    expect(result.query.startsWith("Suggestions=931")).toBe(true);
  });

  test("maps empty biography phrasing to Suggestions=802", () => {
    const result = translateSuggestionsFreeTextToQuery("find profiles with no biography");
    expect(result).not.toBeNull();
    expect(result.searchType).toBe("suggestions");
    expect(result.suggestionId).toBe("802");
    expect(result.query.startsWith("Suggestions=802")).toBe(true);
  });

  test("does not leak the matched suggestion phrase into a Location scope", () => {
    // The words that matched the suggestion title must be consumed, not left
    // behind as a bogus Location="empty biography".
    const bare = translateSuggestionsFreeTextToQuery("empty biography");
    expect(bare.query).toBe("Suggestions=802");
    expect(bare.query).not.toMatch(/Location=/i);

    const gedcom = translateSuggestionsFreeTextToQuery("gedcom junk");
    expect(gedcom.query).toBe("Suggestions=853");

    const image = translateSuggestionsFreeTextToQuery("missing image");
    expect(image.query).toBe("Suggestions=971");
  });

  test("keeps a real location alongside a natural-language suggestion phrase", () => {
    const result = translateSuggestionsFreeTextToQuery("England profiles with no biography");
    expect(result.query).toContain("Suggestions=802");
    expect(result.query).toContain("Location=England");
    expect(result.query).not.toMatch(/Location="[^"]*\bbiography\b/i);
  });

  test("strips trailing intensifier fillers ('at all', 'whatsoever') from the location", () => {
    const atAll = translateSuggestionsFreeTextToQuery("Cheshire no biography at all");
    expect(atAll.query).toContain("Suggestions=802");
    expect(atAll.query).toContain("Location=Cheshire");
    expect(atAll.query).not.toMatch(/Location="[^"]*\b(?:at|all)\b/i);

    const whatsoever = translateSuggestionsFreeTextToQuery("England profiles with no biography whatsoever");
    expect(whatsoever.query).toContain("Location=England");
    expect(whatsoever.query).not.toMatch(/whatsoever/i);
  });

  test("maps 'no birth or death date' to the No-Dates suggestion group, not a FindAGrave date code", () => {
    // Regression: the keyword matcher used to grab a single FindAGrave code
    // (573) and leak the unmatched word "death" into Location="England death".
    const result = translateSuggestionsFreeTextToQuery("England no birth or death date");
    expect(result).not.toBeNull();
    expect(result.suggestionId).toBe("131 132 133 134");
    // Multi-code values must be quoted so the query tokenizer keeps them together.
    expect(result.query).toContain('Suggestions="131 132 133 134"');
    expect(result.query).toContain("Location=England");
    expect(result.query).not.toMatch(/death/i);
    expect(result.query).not.toContain("573");
  });

  test("maps a bare 'no dates' phrase to the No-Dates suggestion group without leaking 'dates'", () => {
    const result = translateSuggestionsFreeTextToQuery("profiles in Devon with no dates");
    expect(result.suggestionId).toBe("131 132 133 134");
    expect(result.query).toContain("Location=Devon");
    expect(result.query).not.toMatch(/Location="[^"]*\bdates?\b/i);
  });

  test("maps almost empty biography phrasing to Suggestions=803", () => {
    const result = translateSuggestionsFreeTextToQuery("show short biographies");
    expect(result).not.toBeNull();
    expect(result.searchType).toBe("suggestions");
    expect(result.suggestionId).toBe("803");
    expect(result.query.startsWith("Suggestions=803")).toBe(true);
  });

  test("maps GEDCOM junk phrasing to Suggestions=853", () => {
    const result = translateSuggestionsFreeTextToQuery("find unclean gedcom profiles");
    expect(result).not.toBeNull();
    expect(result.searchType).toBe("suggestions");
    expect(result.suggestionId).toBe("853");
    expect(result.query.startsWith("Suggestions=853")).toBe(true);
  });

  test("maps unconnected empty public profile phrasing to Suggestions=901", () => {
    const result = translateSuggestionsFreeTextToQuery("show unconnected empty public profiles");
    expect(result).not.toBeNull();
    expect(result.searchType).toBe("suggestions");
    expect(result.suggestionId).toBe("901");
    expect(result.query.startsWith("Suggestions=901")).toBe(true);
  });

  test("maps unconnected empty open profile phrasing to Suggestions=902", () => {
    const result = translateSuggestionsFreeTextToQuery("find empty unconnected open profile");
    expect(result).not.toBeNull();
    expect(result.searchType).toBe("suggestions");
    expect(result.suggestionId).toBe("902");
    expect(result.query.startsWith("Suggestions=902")).toBe(true);
  });

  test("maps missing gender phrasing to Suggestions=509", () => {
    const result = translateSuggestionsFreeTextToQuery("profiles with missing gender");
    expect(result).not.toBeNull();
    expect(result.searchType).toBe("suggestions");
    expect(result.suggestionId).toBe("509");
    expect(result.query.startsWith("Suggestions=509")).toBe(true);
  });

  test("maps uncleaned after merge phrasing to Suggestions=811", () => {
    const result = translateSuggestionsFreeTextToQuery("show profiles with merge cleanup needed");
    expect(result).not.toBeNull();
    expect(result.searchType).toBe("suggestions");
    expect(result.suggestionId).toBe("811");
    expect(result.query.startsWith("Suggestions=811")).toBe(true);
  });

  test("maps duplicate lines phrasing to Suggestions=831", () => {
    const result = translateSuggestionsFreeTextToQuery("biographies with duplicate lines");
    expect(result).not.toBeNull();
    expect(result.searchType).toBe("suggestions");
    expect(result.suggestionId).toBe("831");
    expect(result.query.startsWith("Suggestions=831")).toBe(true);
  });
});
