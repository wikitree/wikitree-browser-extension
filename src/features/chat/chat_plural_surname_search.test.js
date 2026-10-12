jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { createProfileSearchHandler, wtPlusLogCounts } from "./chat_profile_search";
import { ChatIntent, routeChatPrompt } from "./chat_router";
import { classifyWtPrompt } from "./chat_search_mode";

function makeHandler(overrides = {}) {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => false),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(),
    fetchPeoplePaged: jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Test-1",
          FirstName: "Test",
          LastNameAtBirth: "Example",
        },
      },
    ]),
    mapApiPersonToStandardRow: jest.fn((person, options = {}) => ({
      wtid: options.wtId || person?.Name || "",
      firstName: person?.FirstName || "",
      lnab: person?.LastNameAtBirth || "",
      lastNameCurrent: person?.LastNameCurrent || "",
      birth: "",
      death: "",
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

// "Smiths born in Devon in the 1850s": Smiths is a surname for 31 profiles, Smith for 466,090, so
// it's the Smith family; Woods (30,247) and Wood (79,340) are both real names (2026-10-12).
const COUNTS = { smiths: 31, smith: 466090, woods: 30247, wood: 79340, jones: 500000, jone: 38 };

function mockWtPlus() {
  wtAPIProfileSearch.mockImplementation(async (caller, encoded, params) => {
    const query = decodeURIComponent(encoded);
    const count = query.match(/^AllLastNames=(\w+)$/);
    if (params?.maxProfiles === 1 && count) {
      return { response: { profiles: [], searchLog: `AllLastNames=${count[1]}: ${COUNTS[count[1].toLowerCase()] ?? 0}\nResult: ${COUNTS[count[1].toLowerCase()] ?? 0}` } };
    }
    return { response: { profiles: ["1"], searchLog: "Result: 1" } };
  });
}

const searches = () =>
  wtAPIProfileSearch.mock.calls.filter((call) => call[2]?.maxProfiles !== 1).map((call) => decodeURIComponent(call[1]));

async function ask(prompt) {
  jest.clearAllMocks();
  mockWtPlus();
  return makeHandler().tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
}

describe("a surname that could be a plural", () => {
  test("Smiths: the Smith family, with a button back", async () => {
    const result = await ask("Smiths born in Devon in the 1850s");
    expect(searches().join(" ;; ")).toContain("AllLastNames=Smith BirthLocation=Devon");
    expect(searches().join(" ;; ")).not.toContain("Smiths");
    expect(result.message).toContain('I read "Smiths" as the Smith family: WikiTree+ has 31 profiles with the surname Smiths and 466,090 with Smith.');
    expect(result.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Search Smiths instead", actionType: "fetch-wtplus-results" })])
    );
  });

  test("Woods: kept, with Wood offered", async () => {
    const result = await ask("Woods born in Devon in the 1850s");
    expect(searches().join(" ;; ")).toContain("AllLastNames=Woods BirthLocation=Devon");
    expect(result.message || "").not.toContain("I read");
    const offer = result.actions.find((action) => action.label === "Search Wood instead");
    expect(offer.wtPlusQuery).toContain("AllLastNames=Wood ");
  });

  test("Jones: kept, nothing offered", async () => {
    const result = await ask("Jones born in Devon in the 1850s");
    expect(searches().join(" ;; ")).toContain("AllLastNames=Jones BirthLocation=Devon");
    expect((result.actions || []).map((action) => action.label)).not.toContain("Search Jone instead");
  });

  test("one person's name isn't a family", async () => {
    await ask("Mary Woods 1820 Ohio");
    expect(wtAPIProfileSearch.mock.calls.filter((call) => call[2]?.maxProfiles === 1)).toHaveLength(0);
  });

  test("the counts are asked once per page", async () => {
    const handler = makeHandler();
    jest.clearAllMocks();
    mockWtPlus();
    await handler.tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Smiths born in Devon in the 1850s");
    await handler.tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Smiths born in Kent in the 1850s");
    expect(wtAPIProfileSearch.mock.calls.filter((call) => call[2]?.maxProfiles === 1)).toHaveLength(2);
  });
});

// "the Smiths" was AllLastNames=the Location=Smiths (refused as malformed); "Smith family" was a person
// search for someone called "Smith family" (2026-10-12).
describe("a surname named as a family", () => {
  const mode = (prompt) =>
    classifyWtPrompt({
      prompt,
      getChatAiConfig: async () => ({ key: "" }),
      isUnclaimed: (text) =>
        [ChatIntent.FALLBACK_AI, ChatIntent.PROFILE_SEARCH].includes(routeChatPrompt(text, { hasStructuredResult: false })?.intent),
    });

  test.each([
    ["the Smiths", "AllLastNames=Smith"],
    ["the Smith family", "AllLastNames=Smith"],
    ["Beacall family", "AllLastNames=Beacall"],
    ["the Joneses", "AllLastNames=Jones"],
  ])("%s", async (prompt, expected) => {
    expect(await mode(prompt)).toBe("wtplus");
    COUNTS.joneses = 0;
    COUNTS.beacall = 544;
    await ask(prompt);
    expect(searches()).toEqual([expected]);
  });

  test.each(["Martha Teece", "the Netherlands", "John Smiths"])("not a family: %s", async (prompt) => {
    expect(await mode(prompt)).not.toBe("wtplus");
  });
});

describe("wtPlusLogCounts", () => {
  test("Result, else Cached, else the too-many total", () => {
    expect(wtPlusLogCounts("AllLastNames=Smiths: 31\nResult: 31")).toMatchObject({ count: 31, result: 31, hasTooMany: false });
    expect(wtPlusLogCounts("Cached: 12")).toMatchObject({ count: 12, cached: 12 });
    expect(wtPlusLogCounts("Too many profiles!!! 466090")).toMatchObject({ count: 466090, tooMany: 466090, hasTooMany: true });
    expect(wtPlusLogCounts("Too many profiles!!!").hasTooMany).toBe(true);
    expect(wtPlusLogCounts("").count).toBeNaN();
  });
});
