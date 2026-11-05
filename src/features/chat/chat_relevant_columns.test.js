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
import { makeStandardProfileTable } from "./tables";

function makeHandler(overrides = {}) {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => true),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test-key", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(async () => [0, []]),
    fetchPeoplePaged: jest.fn(async () => [null, null, {}]),
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
    makeStandardProfileTable,
    makeAncestorProfileTable: jest.fn((title, rows, defaultOrder = [[0, "asc"]]) => ({
      title,
      rows,
      defaultOrder,
      columns: [{ key: "wtid" }],
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

describe("query-relevant result columns", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        profiles: ["1"],
        searchLog: "Result: 1\r\n",
      },
    });
  });

  test("age queries add a computed Age column", async () => {
    const fetchPeoplePaged = jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Smith-1",
          FirstName: "Alice",
          LastNameAtBirth: "Smith",
          BirthDate: "1900-03-10",
          DeathDate: "1942-06-01",
          BirthLocation: "Manchester, England",
        },
      },
    ]);
    const { tryHandleProfileSearchPrompt } = makeHandler({ fetchPeoplePaged });

    const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Manchester age 42 and connected");

    expect(result.table.rows[0].ageAtDeath).toBe("42");
    expect(result.table.columns.some((column) => column.key === "ageAtDeath")).toBe(true);
  });

  test("parent-presence queries add Father and Mother columns with resolved mother", async () => {
    const fetchPeoplePaged = jest.fn(async (_appId, keys) => {
      const wanted = (Array.isArray(keys) ? keys : [keys]).map(String);
      if (wanted.includes("1")) {
        return [
          null,
          null,
          {
            1: {
              Id: 1,
              Name: "Beacall-1",
              FirstName: "Alice",
              LastNameAtBirth: "Beacall",
              Father: 0,
              Mother: 55,
              BirthDate: "1850-00-00",
            },
          },
        ];
      }
      if (wanted.includes("55")) {
        return [
          null,
          null,
          {
            55: {
              Id: 55,
              Name: "Jones-55",
              FirstName: "Mary",
              LastNameAtBirth: "Jones",
            },
          },
        ];
      }
      return [null, null, {}];
    });
    const { tryHandleProfileSearchPrompt } = makeHandler({ fetchPeoplePaged });

    const result = await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "Beacall with a mother but no father"
    );

    const row = result.table.rows[0];
    expect(row.mother).toBe("Mary Jones");
    expect(row.motherWtid).toBe("Jones-55");
    expect(row.father).toBe("");
    expect(row.fatherWtid).toBe("");
    const columnKeys = result.table.columns.map((column) => column.key);
    expect(columnKeys).toContain("father");
    expect(columnKeys).toContain("mother");
  });

  test("manager queries request TrustedList and mark managers (M) vs trusted (T)", async () => {
    const fetchPeoplePaged = jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Smith-1",
          FirstName: "Alice",
          LastNameAtBirth: "Smith",
          BirthLocation: "England",
          TrustedList: [
            { Id: 78, Name: "Trusted-78", IsManager: 0 },
            { Id: 77, Name: "Manager-77", IsManager: 1 },
          ],
        },
      },
    ]);
    const { tryHandleProfileSearchPrompt } = makeHandler({ fetchPeoplePaged });

    const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "England ProjectManaged or PPP");

    expect(fetchPeoplePaged.mock.calls[0][2]).toContain("TrustedList");
    const row = result.table.rows[0];
    // Managers sort ahead of trusted-only entries.
    expect(row.managerList).toEqual([
      { wtid: "Manager-77", role: "M" },
      { wtid: "Trusted-78", role: "T" },
    ]);
    expect(result.table.columns.some((column) => column.key === "managerList")).toBe(true);
  });

  test("falls back to Managers when TrustedList is not returned", async () => {
    const fetchPeoplePaged = jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Smith-1",
          FirstName: "Alice",
          LastNameAtBirth: "Smith",
          BirthLocation: "England",
          Managers: [{ Id: 77, Name: "Manager-77" }],
        },
      },
    ]);
    const { tryHandleProfileSearchPrompt } = makeHandler({ fetchPeoplePaged });

    const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "England ProjectManaged or PPP");

    expect(result.table.rows[0].managerList).toEqual([{ wtid: "Manager-77", role: "M" }]);
  });
});

describe("makeStandardProfileTable forced columns", () => {
  test("forced blank Father column stays visible; renders resolved mother as a link", () => {
    const rows = [
      { wtid: "Beacall-1", firstName: "Alice", lnab: "Beacall", father: "", fatherWtid: "", mother: "Mary Jones", motherWtid: "Jones-55" },
    ];
    const table = makeStandardProfileTable("Test", rows, [[0, "asc"]], { forceColumnKeys: ["father", "mother"] });

    const fatherColumn = table.columns.find((column) => column.key === "father");
    const motherColumn = table.columns.find((column) => column.key === "mother");
    expect(fatherColumn).toBeTruthy();
    expect(motherColumn).toBeTruthy();
    expect(fatherColumn.render(table.rows[0])).toBe("");
    expect(motherColumn.render(table.rows[0])).toContain("Jones-55");
    expect(motherColumn.render(table.rows[0])).toContain("Mary Jones");
  });

  test("optional columns stay hidden when not forced and rows are blank", () => {
    const rows = [{ wtid: "Smith-1", firstName: "Alice", lnab: "Smith" }];
    const table = makeStandardProfileTable("Test", rows);

    const columnKeys = table.columns.map((column) => column.key);
    expect(columnKeys).not.toContain("father");
    expect(columnKeys).not.toContain("mother");
    expect(columnKeys).not.toContain("ageAtDeath");
    expect(columnKeys).not.toContain("managerList");
  });

  test("manager column renders WT ID links with role suffix", () => {
    const rows = [
      {
        wtid: "Smith-1",
        firstName: "Alice",
        lnab: "Smith",
        managerList: [{ wtid: "Manager-77", role: "M" }],
      },
    ];
    const table = makeStandardProfileTable("Test", rows);

    const managerColumn = table.columns.find((column) => column.key === "managerList");
    expect(managerColumn).toBeTruthy();
    const rendered = managerColumn.render(table.rows[0]);
    expect(rendered).toContain("Manager-77");
    expect(rendered).toContain("(M)");
  });
});
