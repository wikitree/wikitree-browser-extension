jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { createProfileSearchHandler } from "./chat_profile_search";

function makeHandler(overrides = {}) {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => true),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test-key", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(async () => [0, []]),
    fetchPeoplePaged: jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Shropshire-1",
          FirstName: "Alice",
          LastNameAtBirth: "Example",
          BirthLocation: "Shropshire, England",
          BirthDate: "1824-00-00",
        },
      },
    ]),
    mapApiPersonToStandardRow: jest.fn((person, options = {}) => ({
      wtid: options.wtId || person?.Name || "",
      firstName: person?.FirstName || "",
      lnab: person?.LastNameAtBirth || "",
      lastNameCurrent: person?.LastNameCurrent || "",
      birth: person?.BirthDate || "",
      death: person?.DeathDate || "",
      birthLocation: person?.BirthLocation || "",
      deathLocation: person?.DeathLocation || "",
    })),
    makeStandardProfileTable: jest.fn((title, rows, defaultOrder = [[0, "asc"]]) => ({
      title,
      rows,
      defaultOrder,
      columns: [{ key: "wtid" }, { key: "firstName" }],
    })),
    makeAncestorProfileTable: jest.fn((title, rows, defaultOrder = [[0, "asc"]]) => ({
      title,
      rows,
      defaultOrder,
      columns: [{ key: "wtid" }, { key: "firstName" }],
    })),
    normalizeText: (value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    normalizeKnownDate: jest.fn((value) => value),
    showChatShaky: jest.fn(),
    hideChatShaky: jest.fn(),
    ...overrides,
  });
}

describe("chat_profile_search query guards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        profiles: ["1"],
        searchLog: "Result: 1\r\n",
      },
    });
  });

  test("a bare year range is a birth range, not part of the place (Stevenson 1850-1899 Scotland)", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler({ getChatAiConfig: jest.fn(async () => ({})) });

    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Stevenson 1850-1899 Scotland");

    expect(wtAPIProfileSearch).toHaveBeenCalled();
    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("LastNameAtBirth=Stevenson");
    expect(executedQuery).toContain("Location=Scotland");
    expect(executedQuery).toContain("In 18500000..18999999");
    expect(executedQuery).not.toContain("19Cen");
  });

  test("a parse with words of the sentence in a name or place isn't run on WT+ (no key)", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler({ getChatAiConfig: jest.fn(async () => ({})) });
    const garbage = [
      "women named Stevenson born in Scotland 1850-1899 who emigrated",
      "most common surnames in Shropshire",
      // ("twins born in Lancashire" now reads as BirthLocation + CategoryWord=Twins; test below)
      "Irish farmers born in Kent",
      "Ohio 1850s no sources women",
      "born in Dublin to Irish parents",
      "Kent-born people",
      // (no-AI corpus measure, 2026-10-10: a lowercase word in a name/place beside a capitalised one, a place twice, marks in a name)
      "uncertain fathers in Cheshire",
      "Kentucky in the template",
      "people who died in the 1918 flu in Kent",
      "unbelegte Profile in Bayern",
      "people with the surname Alley born in Nelson",
      "profiles in Shropshire with no birth place",
      "…",
      "(count)",
    ];
    for (const prompt of garbage) {
      wtAPIProfileSearch.mockClear();
      const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
      if (wtAPIProfileSearch.mock.calls.length) throw new Error(`ran: ${prompt} -> ${decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1])}`);
      expect(result).toBeTruthy(); // (Genie answers, with the form or the "needs AI" message, but runs nothing)
    }
  });

  test("occupations, a bare year after two names, and emigrants to a place run (no key)", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler({ getChatAiConfig: jest.fn(async () => ({})) });
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Kent farmers 1850s");
    let sent = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(sent).toContain("CategoryWord=Yeomen");
    expect(sent).toContain("Location=Kent");
    wtAPIProfileSearch.mockClear();
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Mary Smith 1820 Ohio");
    sent = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(sent).toContain("FirstName=Mary");
    expect(sent).toContain("BirthLocation=Ohio");
    wtAPIProfileSearch.mockClear();
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Beacall emigrants to Australia");
    sent = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(sent).toContain("DeathLocation=Australia");
    expect(sent).toContain("NOT BirthLocation=Australia");
  });

  test("real places with 'and' or 'of' are still searched (Trinidad and Tobago, Isle of Wight)", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler({ getChatAiConfig: jest.fn(async () => ({})) });
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Smith born in Trinidad and Tobago before 1900");
    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(1);
    expect(decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1])).toContain('BirthLocation="Trinidad and Tobago"');
    for (const [prompt, expected] of [
      ["O'Brien born in Cork", "LastNameAtBirth=O'Brien"],
      ["born before 1750 in devon", "BirthLocation=devon"],
    ]) {
      wtAPIProfileSearch.mockClear();
      await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
      expect(decodeURIComponent(wtAPIProfileSearch.mock.calls[0]?.[1] || "")).toContain(expected);
    }
  });

  test("a plural surname that finds nothing is retried singular (no key)", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler({ getChatAiConfig: jest.fn(async () => ({})) });
    wtAPIProfileSearch
      .mockResolvedValueOnce({ response: { profiles: [], searchLog: "" } })
      .mockResolvedValueOnce({ response: { profiles: ["1"], searchLog: "" } });
    const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Alleys who died in Motueka");
    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(2);
    expect(decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1])).toContain("LastNameAtBirth=Alleys");
    expect(decodeURIComponent(wtAPIProfileSearch.mock.calls[1][1])).toContain("LastNameAtBirth=Alley DeathLocation=Motueka");
    expect(result.message).toContain("Nothing was found for Alleys, so I searched for Alley.");
  });

  test("the reader's CategoryWord runs as is: no category-tree expansion (Beacall emigrants, no key)", async () => {
    // live 2026-10-10: wtCatSearch returned every "X Emigrants to Y" tree; the OR query was 205,000 characters
    const categories = Array.from({ length: 3000 }, (_, i) => ({ Name: `Place${i}__Emigrants` }));
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => categories }));
    try {
      const { tryHandleProfileSearchPrompt } = makeHandler({ getChatAiConfig: jest.fn(async () => ({})) });
      await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Beacall emigrants");
      expect(global.fetch).not.toHaveBeenCalled();
      expect(wtAPIProfileSearch).toHaveBeenCalledTimes(1);
      const sent = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
      expect(sent).toContain("CategoryWord=Emigrants");
      expect(sent).not.toContain(" OR ");
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("twins born in Lancashire runs (no key)", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler({ getChatAiConfig: jest.fn(async () => ({})) });
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "twins born in Lancashire");
    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(1);
    expect(decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1])).toBe("BirthLocation=Lancashire CategoryWord=Twins");
  });

  test("created years run as one Created_ token per year (no key)", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler({ getChatAiConfig: jest.fn(async () => ({})) });
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Smith born in Ohio created in 2023 or 2024");
    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(1);
    const sent = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(sent).toContain("Created_2023");
    expect(sent).toContain("Created_2024");
    expect(sent).toContain("BirthLocation=Ohio");
  });

  test("a bare 'created in 2023' has a base term (Created_2023)", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler({ getChatAiConfig: jest.fn(async () => ({})) });
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "profiles created in 2023");
    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(1);
    expect(decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1])).toContain("Created=Created_2023");
  });

  test("blocks a saved WT+ re-run containing an unknown field without calling the API", async () => {
    const { reRunSavedWtPlusQuery } = makeHandler();

    const result = await reRunSavedWtPlusQuery("BogusField=Value Location=Shropshire");

    expect(wtAPIProfileSearch).not.toHaveBeenCalled();
    const message = typeof result === "string" ? result : result?.message;
    expect(message).toMatch(/couldn't complete the WT\+ query/i);
    expect(message).toContain("BogusField=Value");
  });

  test("blocks a saved WT+ re-run containing an unknown raw token without calling the API", async () => {
    const { reRunSavedWtPlusQuery } = makeHandler();

    const result = await reRunSavedWtPlusQuery("Location=Shropshire FrobnicateToken");

    expect(wtAPIProfileSearch).not.toHaveBeenCalled();
    const message = typeof result === "string" ? result : result?.message;
    expect(message).toMatch(/couldn't complete the WT\+ query/i);
    expect(message).toContain("FrobnicateToken");
  });

  test("coerces unknown plain words to Location instead of refusing (England Suggestions=678)", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler();

    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "England Suggestions=678");

    expect(wtAPIProfileSearch).toHaveBeenCalled();
    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("Suggestions=678");
    expect(executedQuery).toContain("Location=England");
  });

  test("coerces plain words on saved re-runs too", async () => {
    const { reRunSavedWtPlusQuery } = makeHandler();

    await reRunSavedWtPlusQuery("England Suggestions=678");

    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(1);
    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("Suggestions=678");
    expect(executedQuery).toContain("Location=England");
  });

  test("valid saved WT+ queries pass through the gate unchanged", async () => {
    const { reRunSavedWtPlusQuery } = makeHandler();

    const savedQuery = 'Unsourced BirthLocation="Shropshire, England" 1820s';
    const result = await reRunSavedWtPlusQuery(savedQuery);

    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(1);
    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("Unsourced");
    expect(executedQuery).toContain('BirthLocation="Shropshire, England"');
    expect(executedQuery).toContain("1820s");
    expect(result.table.rows).toHaveLength(1);
  });

  test("valid saved WT+ sql query passes through the gate", async () => {
    const { reRunSavedWtPlusQuery } = makeHandler();

    await reRunSavedWtPlusQuery(
      "MarriageLocation=Cheshire sql=\"([Children].[User ID].LineCount > 6) And ([Marriage].[Marriage Date].AsNumber In 19000000..19999999)\""
    );

    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(1);
    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("MarriageLocation=Cheshire");
    expect(executedQuery).toContain("[Children].[User ID].LineCount > 6");
  });

  test("deterministic prompt executes the same query with the gate in place", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler();

    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Cheshire marriages with over 6 kids");

    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(1);
    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("MarriageLocation=Cheshire");
    expect(executedQuery).toContain("[Children].[User ID].LineCount > 6");
  });

  test("does not synthesize junk names from non-name prompts in WT mode", async () => {
    const fetchSearchPersonPaged = jest.fn(async () => [0, []]);
    window.callAiModel = jest.fn(async () => JSON.stringify({}));

    const { tryHandleProfileSearchPrompt } = makeHandler({
      fetchSearchPersonPaged,
      getChatOptions: jest.fn(async () => ({ allowAiFallback: true })),
    });

    try {
      const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wt" }, "interesting people please");

      expect(fetchSearchPersonPaged).not.toHaveBeenCalled();
      const message = typeof result === "string" ? result : result?.message;
      expect(message).toMatch(/couldn't work out a concrete person search/i);
    } finally {
      delete window.callAiModel;
    }
  });

  test("a pronoun is never a surname: 'who are my brick walls?' runs no WT+ query", async () => {
    const fetchSearchPersonPaged = jest.fn(async () => [0, []]);
    window.callAiModel = jest.fn(async () => JSON.stringify({}));
    const { tryHandleProfileSearchPrompt } = makeHandler({
      fetchSearchPersonPaged,
      getChatOptions: jest.fn(async () => ({ allowAiFallback: true })),
    });
    try {
      const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wt" }, "who are my brick walls?");
      expect(wtAPIProfileSearch).not.toHaveBeenCalled();
      const message = typeof result === "string" ? result : result?.message;
      expect(message).toMatch(/couldn't work out a concrete person search/i);
    } finally {
      delete window.callAiModel;
    }
  });

  test("nameless place+date prompt in WT mode falls back to the deterministic WT+ query", async () => {
    const fetchSearchPersonPaged = jest.fn(async () => [0, []]);
    const { tryHandleProfileSearchPrompt } = makeHandler({ fetchSearchPersonPaged });

    const result = await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wt" },
      "profiles from Hampshire, England with birth year earlier than 1800"
    );

    expect(fetchSearchPersonPaged).not.toHaveBeenCalled();
    expect(wtAPIProfileSearch).toHaveBeenCalled();
    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain('Location="Hampshire, England"');
    expect(executedQuery).toMatch(/\[Default\]\.\[Birth Date\]\.AsNumber In 1\.\.17999999/);
    expect(result?.switchToMode).toBe("wtplus");
  });

  test("still infers names from a plain two-token name prompt in WT mode", async () => {
    const fetchSearchPersonPaged = jest.fn(async () => [
      0,
      [
        {
          Id: 1,
          Name: "Beacall-1",
        },
      ],
    ]);

    const { tryHandleProfileSearchPrompt } = makeHandler({
      fetchSearchPersonPaged,
      getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    });

    await tryHandleProfileSearchPrompt({ chatModeOverride: "wt" }, "George Beacall born before 1850");

    expect(fetchSearchPersonPaged).toHaveBeenCalled();
    const searchParams = fetchSearchPersonPaged.mock.calls[0][1];
    expect(searchParams.FirstName).toBe("George");
    expect(searchParams.LastName).toBe("Beacall");
  });
});

// Live, 2026-10-04: "Beacall-10" was searched for as a surname and found nothing.
test("a bare WikiTree ID fetches that profile instead of searching for it as a name", async () => {
  const fetchSearchPersonPaged = jest.fn(async () => [0, []]);
  const fetchPeoplePaged = jest.fn(async () => [
    null,
    null,
    { 5: { Id: 5, Name: "Beacall-10", FirstName: "Philip", LastNameAtBirth: "Beacall", BirthDate: "1859-00-00" } },
  ]);
  const { tryHandleProfileSearchPrompt } = makeHandler({
    fetchSearchPersonPaged,
    fetchPeoplePaged,
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "", model: "" })),
  });
  const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wt" }, "Beacall-10");
  expect(fetchSearchPersonPaged).not.toHaveBeenCalled();
  expect(fetchPeoplePaged.mock.calls[0][1]).toEqual(["Beacall-10"]);
  expect(JSON.stringify(result)).toContain("Beacall-10");
  expect(JSON.stringify(result)).not.toMatch(/couldn't find/i);
});
