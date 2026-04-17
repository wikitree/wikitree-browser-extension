jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { wtAPICatCIBSearch } from "../../core/API/wtPlusAPI";
import { createProfileSearchHandler } from "./chat_profile_search";

function makeHandler(overrides = {}) {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => true),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: true })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test-key", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(),
    fetchPeoplePaged: jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Miner-1",
          FirstName: "Alice",
          LastNameAtBirth: "Miner",
          BirthLocation: "Yorkshire",
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

describe("chat_profile_search category tree expansion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        profiles: ["1"],
      },
    });

    global.fetch = jest.fn(async (url) => {
      const parsed = new URL(String(url));
      const categoryQuery = String(parsed.searchParams.get("query") || "");

      if (/England miners/i.test(categoryQuery)) {
        return {
          ok: true,
          json: async () => ({
            response: {
              categories: [{ Name: "England,_Miners" }, { Name: "England,_Coal_Miners" }],
            },
          }),
        };
      }

      if (/England, Coal Miners/i.test(categoryQuery)) {
        return {
          ok: true,
          json: async () => ({
            response: {
              categories: [{ Name: "England,_Tin_Miners" }],
            },
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({ response: { categories: [] } }),
      };
    });

    window.callAiModel = jest.fn(async (prompt) => {
      const text = String(prompt || "");
      if (text.includes("normalize a category text-search seed for WikiTree+ category-name search")) {
        return JSON.stringify({ categorySearchText: "England miners" });
      }
      return JSON.stringify({
        understood: "Yorkshire miners category search",
        query: 'Location=Yorkshire CategoryWord=Miners',
      });
    });
  });

  afterEach(() => {
    delete window.callAiModel;
  });

  test("expands category-word query into OR CategoryFull branches with preserved location scope", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler();

    const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Yorkshire Miners");

    expect(window.callAiModel).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalled();

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("Location=Yorkshire CategoryFull=England__Miners");
    expect(executedQuery).toContain("Location=Yorkshire CategoryFull=England__Coal_Miners");
    expect(executedQuery).toContain("Location=Yorkshire CategoryFull=England__Tin_Miners");
    expect(executedQuery).not.toContain("CategoryWord=Miners");

    expect(result.message).toContain("WT+ query");
  });

  test("prefers country-scoped category seeds for Staffordshire potters", async () => {
    wtAPICatCIBSearch.mockResolvedValue({
      response: {
        categories: [{ category: "Staffordshire", locationParent: "England", parent: "England" }],
      },
    });

    global.fetch = jest.fn(async (url) => {
      const parsed = new URL(String(url));
      const categoryQuery = String(parsed.searchParams.get("query") || "");

      if (/England, Potters/i.test(categoryQuery) || /England Potters/i.test(categoryQuery)) {
        return {
          ok: true,
          json: async () => ({
            response: {
              categories: [{ Name: "England,_Potters" }, { Name: "Potters,_St_Helens,_Lancashire_One_Place_Study" }],
            },
          }),
        };
      }

      if (/Potters/i.test(categoryQuery)) {
        return {
          ok: true,
          json: async () => ({
            response: {
              categories: [{ Name: "Australia,_Potters" }, { Name: "Germany,_Potters" }],
            },
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({ response: { categories: [] } }),
      };
    });

    window.callAiModel = jest.fn(async (prompt) => {
      const text = String(prompt || "");
      if (text.includes("normalize a category text-search seed for WikiTree+ category-name search")) {
        return JSON.stringify({ categorySearchText: "potters" });
      }
      return JSON.stringify({
        understood: "Staffordshire potters category search",
        query: "Location=Staffordshire CategoryWord=Potters",
      });
    });

    const { tryHandleProfileSearchPrompt } = makeHandler();
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Staffordshire potters");

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("Location=Staffordshire CategoryFull=England__Potters");
    expect(executedQuery).toContain("Location=Staffordshire CategoryFull=Potters__St_Helens__Lancashire_One_Place_Study");
    expect(executedQuery).not.toContain("Australia__Potters");
    expect(executedQuery).not.toContain("Germany__Potters");
  });
});
