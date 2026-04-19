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
          Name: "Example-1",
          FirstName: "Alice",
          LastNameAtBirth: "Example",
          Spouses: {
            2: {
              Id: 2,
              Name: "Partner-2",
              FirstName: "Bob",
              LastNameAtBirth: "Partner",
              MarriageDate: "1920-05-20",
              MarriageLocation: "Cheshire, England",
            },
          },
        },
      },
    ]),
    mapApiPersonToStandardRow: jest.fn((person, options = {}) => {
      const spouses = Object.values(person?.Spouses || {});
      return {
        wtid: options.wtId || person?.Name || "",
        firstName: person?.FirstName || "",
        lnab: person?.LastNameAtBirth || "",
        lastNameCurrent: person?.LastNameCurrent || "",
        spouse: spouses.map((s) => [s?.FirstName || "", s?.LastNameAtBirth || ""].join(" ").trim()).join(", "),
        spouseList: spouses.map((s) => ({
          wtid: s?.Name || "",
          firstName: s?.FirstName || "",
          lnab: s?.LastNameAtBirth || "",
          marriageDate: s?.MarriageDate || "",
          marriageLocation: s?.MarriageLocation || "",
        })),
        marriageDate: spouses.map((s) => s?.MarriageDate || "").filter(Boolean).join("; "),
        marriageLocation: spouses.map((s) => s?.MarriageLocation || "").filter(Boolean).join("; "),
        birth: person?.BirthDate || "",
        death: person?.DeathDate || "",
        birthLocation: person?.BirthLocation || "",
        deathLocation: person?.DeathLocation || "",
      };
    }),
    makeStandardProfileTable: jest.fn((title, rows, defaultOrder = [[0, "asc"]]) => ({
      title,
      rows,
      defaultOrder,
      columns: [
        { key: "wtid" },
        { key: "spouse" },
        { key: "marriageDate" },
        { key: "marriageLocation" },
        { key: "degrees" },
      ],
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

describe("chat_profile_search marriage-details columns", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        profiles: ["1"],
        searchLog: "Result: 1\r\n",
      },
    });
    delete window.callAiModel;
  });

  test("keeps spouse and marriage columns for marriage-focused WT+ queries", async () => {
    const fetchPeoplePaged = jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Example-1",
          FirstName: "Alice",
          LastNameAtBirth: "Example",
          Spouses: {
            2: {
              Id: 2,
              Name: "Partner-2",
              FirstName: "Bob",
              LastNameAtBirth: "Partner",
              MarriageDate: "1920-05-20",
              MarriageLocation: "Cheshire, England",
            },
          },
        },
      },
    ]);
    const { tryHandleProfileSearchPrompt } = makeHandler({ fetchPeoplePaged });

    const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "profiles married in Cheshire");

    expect(fetchPeoplePaged.mock.calls[0][2]).toContain(",Spouses");
    expect(fetchPeoplePaged.mock.calls[0][3]).toMatchObject({ getSpouses: 1 });
    expect(result.table.columns.some((column) => column.key === "spouse")).toBe(true);
    expect(result.table.columns.some((column) => column.key === "marriageDate")).toBe(true);
    expect(result.table.columns.some((column) => column.key === "marriageLocation")).toBe(true);
    expect(result.table.columns.some((column) => column.key === "degrees")).toBe(false);
  });
});
