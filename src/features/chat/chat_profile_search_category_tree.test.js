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

  // Place + category word: a category tree is OR'd onto the AI's query, never
  // put in its place (chat_place_category.js; live probes 2026-10-03).
  function mockPicker(byQuery) {
    wtAPICatCIBSearch.mockImplementation(async (caller, cib, query) => ({
      response: { categories: (byQuery[String(query)] || []).map((category) => ({ category })) },
    }));
  }

  function mockAi(spec, choice) {
    window.callAiModel = jest.fn(async (prompt) => {
      const text = String(prompt || "");
      if (text.includes("Pick the WikiTree category tree")) return JSON.stringify({ category: choice });
      if (text.includes("normalize a category text-search seed")) return JSON.stringify({ categorySearchText: "x" });
      return JSON.stringify(spec);
    });
  }

  const blindSeedCalls = () =>
    window.callAiModel.mock.calls.filter(([prompt]) => String(prompt).includes("normalize a category text-search seed"));

  test("AI-chosen country tree is added with OR and the location kept: Yorkshire miners", async () => {
    mockPicker({ Miners: ["Miners, Shorney Name Study", "England, Miners"] });
    mockAi({ understood: "Yorkshire miners", query: "Location=Yorkshire CategoryWord=Miners" }, "England, Miners");

    const { tryHandleProfileSearchPrompt } = makeHandler();
    const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Yorkshire Miners");

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain('Location=Yorkshire SubCat9="England, Miners"');
    expect(executedQuery).toContain("Location=Yorkshire CategoryWord=Miners");
    expect(executedQuery).toMatch(/ OR /);
    expect(blindSeedCalls()).toHaveLength(0);
    expect(result.message).toContain("WT+ query");
  });

  test("the AI can only add a tree from the picker list: Staffordshire potters", async () => {
    mockPicker({ Potters: ["Australia, Potters", "England, Potters", "Potters, St Helens, Lancashire One Place Study"] });
    mockAi({ understood: "Staffordshire potters", query: "Location=Staffordshire CategoryWord=Potters" }, "England, Potters");

    const { tryHandleProfileSearchPrompt } = makeHandler();
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Staffordshire potters");

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain('Location=Staffordshire SubCat9="England, Potters"');
    expect(executedQuery).toContain("Location=Staffordshire CategoryWord=Potters");
    expect(executedQuery).not.toContain("Australia");
  });

  test("an exact Place, Topic tree needs no location and no AI choice: Mississippi slave owners", async () => {
    mockPicker({ "Mississippi Slave Owners": ["Adams County, Mississippi, Slave Owners", "Mississippi, Slave Owners"] });
    mockAi({ understood: "slave owners", query: 'Location=Mississippi CategoryWord="Slave Owners"' }, "");

    const { tryHandleProfileSearchPrompt } = makeHandler();
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Slave owners in Mississippi");

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toContain('SubCat9="Mississippi, Slave Owners"');
    expect(executedQuery).toContain('Location=Mississippi CategoryWord="Slave Owners"');
    expect(executedQuery).not.toContain('Location=Mississippi SubCat9');
    const choiceCalls = window.callAiModel.mock.calls.filter(([prompt]) => String(prompt).includes("Pick the WikiTree category tree"));
    expect(choiceCalls).toHaveLength(0);
  });

  test("no tree chosen: the AI's query runs unchanged (London butchers)", async () => {
    mockPicker({ "London Butchers": ["Butchers' Company, City of London"], Butchers: ["England, Butchers"] });
    mockAi({ understood: "London butchers", query: "Location=London CategoryWord=Butchers" }, "");

    const { tryHandleProfileSearchPrompt } = makeHandler();
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "butchers in London");

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(executedQuery).toBe("Location=London CategoryWord=Butchers");
    expect(blindSeedCalls()).toHaveLength(0);
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
