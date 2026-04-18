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
import { makeStandardProfileTable } from "./tables";

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
        query: "Location=Yorkshire CategoryWord=Miners",
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
    expect(executedQuery).not.toContain("Location=Yorkshire CategoryFull=Miners");
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
    expect(executedQuery).toContain(
      "Location=Staffordshire CategoryFull=Potters__St_Helens__Lancashire_One_Place_Study"
    );
    expect(executedQuery).not.toContain("Australia__Potters");
    expect(executedQuery).not.toContain("Germany__Potters");
  });

  test("matches fetched person categories to the expanded military WT+ categories", async () => {
    wtAPICatCIBSearch.mockResolvedValue({
      response: {
        categories: [{ category: "Yorkshire", locationParent: "England", parent: "England" }],
      },
    });

    global.fetch = jest.fn(async (url) => {
      const parsed = new URL(String(url));
      const categoryQuery = String(parsed.searchParams.get("query") || "");

      if (/British Armed Forces/i.test(categoryQuery) || /England, Armed Forces/i.test(categoryQuery)) {
        return {
          ok: true,
          json: async () => ({
            response: {
              categories: [
                {
                  Name: "British_Armed_Forces",
                  Children: "British_Army\r\nBritish_Army,_World_War_II\r\nBritish_Royal_Navy\r\nRoyal_Air_Force",
                },
                { Name: "British_Armed_Forces,_Millward_Name_Study", Children: "" },
              ],
            },
          }),
        };
      }

      if (/Armed Forces/i.test(categoryQuery)) {
        return {
          ok: true,
          json: async () => ({
            response: {
              categories: [{ Name: "Denmark,_Armed_Forces" }, { Name: "Egyptian_Armed_Forces" }],
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
        return JSON.stringify({ categorySearchText: "military" });
      }
      return JSON.stringify({
        understood: "Yorkshire military category search",
        query: "Location=Yorkshire CategoryWord=military",
      });
    });

    const fetchPeoplePaged = jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Soldier-1",
          FirstName: "Alice",
          LastNameAtBirth: "Soldier",
          BirthLocation: "Yorkshire",
          Categories: ["British Armed Forces", "British Army, World War II", "Some Other Category"],
        },
      },
    ]);

    const { tryHandleProfileSearchPrompt } = makeHandler({
      fetchPeoplePaged,
      makeStandardProfileTable,
    });
    const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Yorkshire military");

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain("Location=Yorkshire CategoryFull=British_Armed_Forces");
    expect(executedQuery).toContain("Location=Yorkshire CategoryFull=British_Army");
    expect(executedQuery).toContain("Location=Yorkshire CategoryFull=British_Army__World_War_II");
    expect(executedQuery).toContain("Location=Yorkshire CategoryFull=British_Royal_Navy");
    expect(executedQuery).toContain("Location=Yorkshire CategoryFull=Royal_Air_Force");
    expect(executedQuery).not.toContain("Location=Yorkshire CategoryFull=England__Armed_Forces");
    expect(executedQuery).not.toContain("Denmark__Armed_Forces");
    expect(executedQuery).not.toContain("Egyptian_Armed_Forces");
    expect(executedQuery).not.toContain("Millward_Name_Study");
    expect(fetchPeoplePaged.mock.calls[0][2]).toContain("Categories");
    expect(result.table.columns.some((column) => column.key === "categoryDisplay")).toBe(true);
    expect(result.table.rows[0].categoryDisplay).toBe("British Army, World War II");
    expect(result.table.rows[0].categoryPageName).toBe("British_Army,_World_War_II");
  });

  test("broadens US city military searches to a United States Armed Forces root before falling back", async () => {
    wtAPICatCIBSearch.mockImplementation(async (_callerId, cibType, query) => {
      if (cibType !== "location") {
        return { response: { categories: [] } };
      }

      if (/new orleans/i.test(String(query || ""))) {
        return {
          response: {
            categories: [
              {
                category: "New Orleans, Louisiana",
                parent: "Orleans Parish, Louisiana",
                gParent: "Louisiana",
              },
            ],
          },
        };
      }

      if (/louisiana/i.test(String(query || ""))) {
        return {
          response: {
            categories: [
              {
                category: "Louisiana",
                parent: "United States of America",
              },
            ],
          },
        };
      }

      return { response: { categories: [] } };
    });

    global.fetch = jest.fn(async (url) => {
      const parsed = new URL(String(url));
      const categoryQuery = String(parsed.searchParams.get("query") || "");

      if (/United States Armed Forces/i.test(categoryQuery) || /American Armed Forces/i.test(categoryQuery)) {
        return {
          ok: true,
          json: async () => ({
            response: {
              categories: [
                {
                  Name: "United_States_Armed_Forces",
                  Children: "United_States_Army\r\nUnited_States_Navy\r\nUnited_States_Marine_Corps",
                },
              ],
            },
          }),
        };
      }

      if (/Armed Forces/i.test(categoryQuery)) {
        return {
          ok: true,
          json: async () => ({
            response: {
              categories: [
                { Name: "Greek_Armed_Forces", Children: "" },
                { Name: "Wounded_in_Action,_Greece", Children: "" },
              ],
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
        return JSON.stringify({ categorySearchText: "military" });
      }
      return JSON.stringify({
        understood: "New Orleans military category search",
        query: 'Location="New Orleans" CategoryWord=Military',
      });
    });

    const { tryHandleProfileSearchPrompt } = makeHandler();
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "New Orleans military");

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain('Location="New Orleans" CategoryFull=United_States_Armed_Forces');
    expect(executedQuery).toContain('Location="New Orleans" CategoryFull=United_States_Army');
    expect(executedQuery).toContain('Location="New Orleans" CategoryFull=United_States_Navy');
    expect(executedQuery).not.toContain("Greek_Armed_Forces");
    expect(executedQuery).not.toContain("Wounded_in_Action__Greece");
  });
});
