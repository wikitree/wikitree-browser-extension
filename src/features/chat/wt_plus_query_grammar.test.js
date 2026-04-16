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
      query: "Suggestions=321 in Devon",
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
