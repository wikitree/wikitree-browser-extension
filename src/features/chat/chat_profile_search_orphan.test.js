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

  test("parses no manager as the Orphan token locally and asks which place scope", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler();

    // "Denbighshire no manager" is place-only (Orphan + bare Location=), so Muse
    // asks born/married/died up front instead of running the vague query.
    const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Denbighshire no manager");

    expect(wtAPIProfileSearch).not.toHaveBeenCalled();
    expect(result.message).toMatch(/birth, marriage, or death place/i);
    const actionQueries = (result.actions || []).map((a) => a.wtPlusQuery);
    // The Orphan token parsed correctly and rides along on each scope choice.
    expect(actionQueries).toEqual(
      expect.arrayContaining([
        "Orphan BirthLocation=Denbighshire",
        "Orphan DeathLocation=Denbighshire",
        "Orphan Location=Denbighshire", // the "Any place" option
      ])
    );
    // Unambiguous place: no surname reading offered.
    expect((result.actions || []).map((a) => a.label)).not.toContain("Surname Denbighshire");
  });

  test("asks AI what an ambiguous single word could mean and builds those scope buttons", async () => {
    window.callAiModel = jest.fn(async () =>
      JSON.stringify([
        { kind: "place", label: "Kent, England (county)", location: "Kent, England, United Kingdom" },
        { kind: "surname", label: "Surname Kent", surname: "Kent" },
        { kind: "place", label: "Kent, Ohio, USA", location: "Kent, Ohio, United States" },
      ])
    );

    const { tryHandleProfileSearchPrompt } = makeHandler({
      getChatOptions: jest.fn(async () => ({ allowAiFallback: true })),
    });

    const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Kent no manager");

    expect(window.callAiModel).toHaveBeenCalled();
    expect(wtAPIProfileSearch).not.toHaveBeenCalled();
    expect(result.message).toMatch(/could mean a few different things/i);

    const byLabel = Object.fromEntries((result.actions || []).map((a) => [a.label, a.wtPlusQuery]));
    expect(byLabel["Kent, England (county)"]).toBe('Orphan Location="Kent, England, United Kingdom"');
    expect(byLabel["Surname Kent"]).toBe("Orphan AllLastNames=Kent");
    expect(byLabel["Kent, Ohio, USA"]).toBe('Orphan Location="Kent, Ohio, United States"');
    // The catch-all keeps the original broad term available.
    expect(byLabel["Any place named Kent"]).toBe("Orphan Location=Kent");
    // Every button re-runs a saved WT+ query in chat.
    expect((result.actions || []).every((a) => a.actionType === "fetch-wtplus-results")).toBe(true);
  });

  test("falls back to born/married/died buttons when AI is unavailable", async () => {
    // allowAiFallback stays false (default handler), so no AI round-trip.
    const { tryHandleProfileSearchPrompt } = makeHandler();

    const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Kent no manager");

    expect(result.message).toMatch(/birth, marriage, or death place/i);
    const labels = (result.actions || []).map((a) => a.label);
    expect(labels).toEqual(expect.arrayContaining(["Born in Kent", "Died in Kent", "Surname Kent"]));
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
