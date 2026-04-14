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

describe("chat_profile_search orphan manager phrasing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        profiles: ["1"],
        searchLog: "",
      },
    });
    delete window.callAiModel;
  });

  test("parses no manager as the Orphan token locally", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler();

    const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Denbighshire no manager");
    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);

    expect(executedQuery).toContain("Orphan");
    expect(executedQuery).toContain("Location=Denbighshire");
    expect(result.message).toContain("Orphan");
    expect(result.message).toContain("Location=Denbighshire");
  });

  test("coerces AI no-manager interpretations away from NOT ProjectManaged", async () => {
    window.callAiModel = jest.fn(async () =>
      JSON.stringify({
        understood: "profiles in Denbighshire with no manager between 1800 and 1810",
        query:
          'Location=Denbighshire NOT ProjectManaged 19Cen sql="([Default].[Birth Date].AsNumber In 18000101..18101231)"',
      })
    );

    const { tryHandleProfileSearchPrompt } = makeHandler({
      getChatOptions: jest.fn(async () => ({ allowAiFallback: true })),
    });

    const result = await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "Denbighshire no manager between 1800 and 1810"
    );

    const executedQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    expect(window.callAiModel).toHaveBeenCalled();
    expect(executedQuery).toContain("Orphan");
    expect(executedQuery).not.toContain("ProjectManaged");
    expect(result.message).toContain("Orphan");
    expect(result.message).not.toContain("ProjectManaged");
  });
});
