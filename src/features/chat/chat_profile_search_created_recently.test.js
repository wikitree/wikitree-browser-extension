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
    fetchSearchPersonPaged: jest.fn(),
    fetchPeoplePaged: jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Recent-1",
          FirstName: "Recent",
          LastNameAtBirth: "Example",
          Created: "20260410",
        },
        2: {
          Id: 2,
          Name: "Old-1",
          FirstName: "Old",
          LastNameAtBirth: "Example",
          Created: "20260310",
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

describe("chat_profile_search created-recently WT+ route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 3, 15, 12, 0, 0)));
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        profiles: ["1", "2"],
        searchLog: "",
      },
    });
    delete window.callAiModel;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("uses Created-year WT+ narrowing and local Created-date filtering without requiring profiles wording", async () => {
    const fetchPeoplePaged = jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Recent-1",
          FirstName: "Recent",
          LastNameAtBirth: "Example",
          Created: "20260410112233",
        },
        2: {
          Id: 2,
          Name: "Old-1",
          FirstName: "Old",
          LastNameAtBirth: "Example",
          Created: "20260310112233",
        },
      },
    ]);
    const { tryHandleProfileSearchPrompt } = makeHandler({ fetchPeoplePaged });

    const result = await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "Devon added in the last 30 days"
    );

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);

    expect(executedQuery).toContain("Location=Devon");
    expect(executedQuery).toContain("Created=Created_2026");
    expect(executedQuery).toContain("([Bio].[Created Date].AsNumber In 20260317..20260415)");
    expect(fetchPeoplePaged.mock.calls[0][2]).toContain(",Created");
    expect(result.message).toContain("filtered by Created date between 2026-03-17 and 2026-04-15");
    expect(result.message).toContain("Found 1 profile created in the last 30 days");
    expect(result.table.rows).toEqual([
      {
        wtid: "Recent-1",
        firstName: "Recent",
        lnab: "Example",
        lastNameCurrent: "",
        birth: "",
        death: "",
        birthLocation: "",
        deathLocation: "",
        createdDate: "2026-04-10",
      },
    ]);
    expect(result.table.columns).toContainEqual({ title: "Created", key: "createdDate" });
  });

  test("parses spelled-out month counts into deterministic createdRecently search", async () => {
    const fetchPeoplePaged = jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Recent-1",
          FirstName: "Recent",
          LastNameAtBirth: "Example",
          Created: "20260410112233",
        },
        2: {
          Id: 2,
          Name: "Recent-2",
          FirstName: "Recent",
          LastNameAtBirth: "Example",
          Created: "20251101083000",
        },
      },
    ]);
    const { tryHandleProfileSearchPrompt } = makeHandler({ fetchPeoplePaged });

    const result = await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "Devon profiles created in the last six months"
    );

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);

    expect(executedQuery).toContain(
      'Location=Devon Created=Created_2025 sql="([Bio].[Created Date].AsNumber In 20251016..20260415)"'
    );
    expect(executedQuery).toContain(
      'Location=Devon Created=Created_2026 sql="([Bio].[Created Date].AsNumber In 20251016..20260415)"'
    );
    expect(result.message).toContain("filtered by Created date between 2025-10-16 and 2026-04-15");
    expect(result.message).toContain("Found 2 profiles created in the last 6 months");
  });

  test("can use AI to canonicalize broader recent-created phrasing into the custom route", async () => {
    window.callAiModel = jest.fn(async () =>
      JSON.stringify({
        understood: "Devon profiles created in the last six months",
        query: 'Location=Devon sql="([Bio].[Created Date].AsNumber In 20251016..20260415)"',
        routePrompt: "Devon created in the last 6 months",
      })
    );

    const fetchPeoplePaged = jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Recent-1",
          FirstName: "Recent",
          LastNameAtBirth: "Example",
          Created: "20260410112233",
        },
        2: {
          Id: 2,
          Name: "Old-1",
          FirstName: "Old",
          LastNameAtBirth: "Example",
          Created: "20250310112233",
        },
      },
    ]);

    const { tryHandleProfileSearchPrompt } = makeHandler({
      getChatOptions: jest.fn(async () => ({ allowAiFallback: true })),
      fetchPeoplePaged,
    });

    const result = await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "Devon profiles created over the past six months"
    );

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);

    expect(window.callAiModel).toHaveBeenCalled();
    expect(executedQuery).toContain(
      'Location=Devon Created=Created_2025 sql="([Bio].[Created Date].AsNumber In 20251016..20260415)"'
    );
    expect(executedQuery).toContain(
      'Location=Devon Created=Created_2026 sql="([Bio].[Created Date].AsNumber In 20251016..20260415)"'
    );
    expect(result.message).toContain("filtered by Created date between 2025-10-16 and 2026-04-15");
    expect(result.message).toContain("Found 1 profile created in the last 6 months");
  });
});
