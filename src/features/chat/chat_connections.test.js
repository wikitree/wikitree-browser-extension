jest.mock("../../core/API/WikiTreeAPI", () => ({
  WikiTreeAPI: {
    getPerson: jest.fn(),
    searchPerson: jest.fn(),
    getConnections: jest.fn(),
  },
}));

jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/API/wwwWikiTree", () => ({
  getRelationJSON: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
}));

jest.mock("./ui", () => ({
  hideChatShaky: jest.fn(),
  showConnectionsPopup: jest.fn(),
}));

import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { createChatConnectionHandlers } from "./chat_connections";

function makeHandlers(overrides = {}) {
  return createChatConnectionHandlers({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    CHAT_LAST_CONNECTION_KEY: "wbe-last-connection",
    toggleConnectionsPopup: jest.fn(),
    tryAiDisambiguateConnectionTarget: jest.fn(async () => null),
    tryAiExpandConnectionTarget: jest.fn(async () => null),
    shouldOfferDisambiguation: jest.fn(() => false),
    resolveConnectionSourceRoot: jest.fn(),
    promptRefersToUser: jest.fn(() => false),
    getLastConnectionContext: jest.fn(() => null),
    setLastConnectionContext: jest.fn(),
    getLastConnectionCandidates: jest.fn(() => []),
    setLastConnectionCandidates: jest.fn(),
    setLastConnectionRankedMatches: jest.fn(),
    setLastConnectionPopupResult: jest.fn(),
    onResolvedPerson: jest.fn(),
    ...overrides,
  });
}

describe("chat_connections target resolution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("prefers an exact current-surname match over variant-surname results for full names", async () => {
    const exactCurrentSurnameMatch = {
      Id: 101,
      Name: "Hutchison-99",
      RealName: "Marsha Hutchison",
      FirstName: "Marsha",
      LastNameAtBirth: "Smith",
      LastNameCurrent: "Hutchison",
      BirthDate: "1952-01-01",
    };
    const variantSurnameMatch = {
      Id: 202,
      Name: "Hutchinson-4141",
      RealName: "Marsha Hutchinson",
      FirstName: "Marsha",
      LastNameAtBirth: "Hutchinson",
      LastNameCurrent: "Hutchinson",
      BirthDate: "1950-01-01",
    };

    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, searchParams) => {
      if (searchParams.FirstName === "Marsha" && searchParams.LastName === "Hutchison" && searchParams.skipVariants) {
        return [0, [variantSurnameMatch]];
      }
      if (
        searchParams.FirstName === "Marsha" &&
        searchParams.LastNameCurrent === "Hutchison" &&
        searchParams.skipVariants
      ) {
        return [0, [exactCurrentSurnameMatch]];
      }
      if (searchParams.RealName === "Marsha Hutchison") {
        return [0, [variantSurnameMatch]];
      }
      return [0, []];
    });

    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => ({ searchName: "Marsha Hutchison" })),
    });

    const matched = await resolveConnectionTargetPerson(
      "Marsha Hutchison",
      "Connection between Marsha Hutchison and the Pope"
    );

    expect(matched?.Name).toBe("Hutchison-99");
    expect(WikiTreeAPI.searchPerson).toHaveBeenCalledWith(
      "Chat",
      expect.objectContaining({
        FirstName: "Marsha",
        LastNameCurrent: "Hutchison",
        skipVariants: 1,
      }),
      expect.any(String)
    );
  });

  test("returns no match when only variant-surname candidates exist for a full-name lookup", async () => {
    const variantSurnameMatch = {
      Id: 202,
      Name: "Hutchinson-4141",
      RealName: "Marsha Hutchinson",
      FirstName: "Marsha",
      LastNameAtBirth: "Hutchinson",
      LastNameCurrent: "Hutchinson",
      BirthDate: "1950-01-01",
    };

    WikiTreeAPI.searchPerson.mockResolvedValue([0, [variantSurnameMatch]]);

    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => ({ searchName: "Marsha Hutchison" })),
    });

    const matched = await resolveConnectionTargetPerson(
      "Marsha Hutchison",
      "Connection between Marsha Hutchison and the Pope"
    );

    expect(matched).toBeNull();
  });

  test("preserves a single sparse exact-match result for a likely private source profile", async () => {
    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, searchParams) => {
      if (searchParams.FirstName === "Marsha" && searchParams.LastName === "Hutchison" && searchParams.skipVariants) {
        return [0, [{ Id: 10878803, index: 0 }]];
      }
      return [0, []];
    });

    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => ({ searchName: "Marsha Hutchison" })),
    });

    const matched = await resolveConnectionTargetPerson(
      "Marsha Hutchison",
      "Connection between Marsha Hutchison and the Pope"
    );

    expect(matched).toMatchObject({ Id: 10878803 });
    expect(matched.Name).toBeUndefined();
  });

  test("accepts RealName-only exact matches for full-name source resolution", async () => {
    const tommyMatch = {
      Id: 25604382,
      Name: "Buch-358",
      RealName: "Tommy",
      LastNameAtBirth: "Buch",
      LastNameCurrent: "Buch",
    };

    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, searchParams) => {
      if (searchParams.FirstName === "Tommy" && searchParams.LastName === "Buch" && searchParams.skipVariants) {
        return [0, [tommyMatch]];
      }
      if (searchParams.FirstName === "Tommy" && searchParams.LastNameCurrent === "Buch" && searchParams.skipVariants) {
        return [0, [tommyMatch]];
      }
      return [0, []];
    });

    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => ({ none: true })),
    });

    const matched = await resolveConnectionTargetPerson("Tommy Buch", "Connection between Tommy Buch and the pope?");

    expect(matched?.Name).toBe("Buch-358");
  });

  test("uses explicit AI lookup fields when resolving a famous target", async () => {
    const tomCruiseMatch = {
      Id: 123456,
      Name: "Mapother-14",
      RealName: "Thomas Cruise Mapother",
      FirstName: "Thomas",
      LastNameAtBirth: "Mapother",
      LastNameCurrent: "Mapother",
      BirthDate: "1962-07-03",
    };

    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, searchParams) => {
      if (
        searchParams.FirstName === "Thomas" &&
        searchParams.LastName === "Mapother" &&
        searchParams.skipVariants &&
        searchParams.BirthDate === "1962-07-03"
      ) {
        return [0, [tomCruiseMatch]];
      }
      if (
        searchParams.FirstName === "Thomas" &&
        searchParams.LastNameCurrent === "Mapother" &&
        searchParams.skipVariants
      ) {
        return [0, [tomCruiseMatch]];
      }
      return [0, []];
    });

    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => ({
        FirstName: "Thomas",
        LastName: "Mapother",
        BirthDate: "1962-07-03",
        DeathDate: "",
        isLiving: true,
      })),
    });

    const matched = await resolveConnectionTargetPerson("Tom Cruise", "Connection between Tommy Buch and Tom Cruise?");

    expect(matched?.Name).toBe("Mapother-14");
    expect(WikiTreeAPI.searchPerson).toHaveBeenCalledWith(
      "Chat",
      expect.objectContaining({
        FirstName: "Thomas",
        LastName: "Mapother",
        BirthDate: "1962-07-03",
      }),
      expect.any(String)
    );
  });

  test("prefers a richer duplicate target match from an alias search lane", async () => {
    const fatherMatch = {
      Id: 15248075,
      Name: "Mapother-2",
      RealName: "Thomas",
      FirstName: "Thomas",
      LastNameAtBirth: "Mapother",
      LastNameCurrent: "Mapother",
      BirthDate: "1934-10-15",
      index: 2,
    };
    const sparseTomMatch = {
      Id: 8833301,
      Name: "Mapother-1",
      RealName: "Tom",
      LastNameAtBirth: "Mapother",
      LastNameCurrent: "Cruise",
      index: 3,
    };
    const richTomMatch = {
      Id: 8833301,
      Name: "Mapother-1",
      RealName: "Tom",
      FirstName: "Thomas",
      LastNameAtBirth: "Mapother",
      LastNameCurrent: "Cruise",
      index: 2,
    };

    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, searchParams) => {
      if (
        searchParams.FirstName === "Thomas" &&
        searchParams.LastName === "Mapother" &&
        searchParams.skipVariants &&
        searchParams.BirthDate === "1962-07-03"
      ) {
        return ["Birth dates after 1940 can only be searched within the Watchlists of logged-in members.", []];
      }
      if (searchParams.FirstName === "Thomas" && searchParams.LastName === "Mapother" && searchParams.skipVariants) {
        return [0, [fatherMatch, sparseTomMatch]];
      }
      if (searchParams.FirstName === "Tom" && searchParams.LastNameCurrent === "Cruise" && searchParams.skipVariants) {
        return [0, [richTomMatch]];
      }
      return [0, []];
    });

    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => ({
        FirstName: "Thomas",
        LastName: "Mapother",
        BirthDate: "1962-07-03",
        DeathDate: "",
        isLiving: true,
      })),
    });

    const matched = await resolveConnectionTargetPerson("Tom Cruise", "Connection between Tommy Buch and Tom Cruise?");

    expect(matched?.Name).toBe("Mapother-1");
    expect(matched?.FirstName).toBe("Thomas");
  });

  test("filters out deceased candidates when AI marks the target as living", async () => {
    const fatherMatch = {
      Id: 15248075,
      Name: "Mapother-2",
      RealName: "Thomas",
      FirstName: "Thomas",
      LastNameAtBirth: "Mapother",
      LastNameCurrent: "Mapother",
      DeathDate: "1984-01-09",
      index: 0,
    };
    const tomMatch = {
      Id: 8833301,
      Name: "Mapother-1",
      RealName: "Tom",
      FirstName: "Thomas",
      LastNameAtBirth: "Mapother",
      LastNameCurrent: "Cruise",
      index: 1,
    };

    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, searchParams) => {
      if (searchParams.FirstName === "Thomas" && searchParams.LastName === "Mapother" && searchParams.skipVariants) {
        return [0, [fatherMatch, tomMatch]];
      }
      return [0, []];
    });

    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => ({
        FirstName: "Thomas",
        LastName: "Mapother",
        BirthDate: "1962-07-03",
        DeathDate: "",
        isLiving: true,
      })),
    });

    const matched = await resolveConnectionTargetPerson("Tom Cruise", "Connection between Tommy Buch and Tom Cruise?");

    expect(matched?.Name).toBe("Mapother-1");
  });

  test("keeps a living alias match even when the AI expansion uses a different legal name", async () => {
    const fatherMatch = {
      Id: 15248075,
      Name: "Mapother-2",
      RealName: "Thomas",
      FirstName: "Thomas",
      MiddleName: "Cruise",
      LastNameAtBirth: "Mapother",
      LastNameCurrent: "Mapother",
      BirthDate: "1934-10-15",
      DeathDate: "1984-01-09",
      index: 0,
    };
    const tomMatch = {
      Id: 8833301,
      Name: "Mapother-1",
      RealName: "Tom",
      LastNameAtBirth: "Mapother",
      LastNameCurrent: "Cruise",
      index: 3,
    };
    const deceasedCruiseAliasMatch = {
      Id: 20066211,
      Name: "Cruise-225",
      RealName: "Tom",
      FirstName: "Thomas",
      LastNameAtBirth: "Cruise",
      LastNameCurrent: "Cruise",
      DeathDate: "1987-02-01",
      index: 0,
    };

    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, searchParams) => {
      if (searchParams.FirstName === "Thomas" && searchParams.LastName === "Mapother" && searchParams.skipVariants) {
        return [0, [fatherMatch, tomMatch]];
      }
      if (searchParams.FirstName === "Tom" && searchParams.LastNameCurrent === "Cruise" && searchParams.skipVariants) {
        return [0, [deceasedCruiseAliasMatch, tomMatch]];
      }
      return [0, []];
    });

    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => ({
        FirstName: "Thomas",
        LastName: "Mapother",
        BirthDate: "1962-07-03",
        DeathDate: "",
        isLiving: true,
      })),
    });

    const matched = await resolveConnectionTargetPerson("Tom Cruise", "Connection between Tommy Buch and Tom Cruise?");

    expect(matched?.Name).toBe("Mapother-1");
  });

  test("uses the deterministic current Pope alias before AI expansion", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-19T12:00:00Z"));

    const currentPopeMatch = {
      Id: 303,
      Name: "Prevost-1162",
      RealName: "Robert Francis Prevost",
      ShortName: "Pope Leo XIV Prevost",
      FirstName: "Robert",
      LastNameAtBirth: "Prevost",
      LastNameCurrent: "Prevost",
      BirthDate: "1955-09-14",
    };

    WikiTreeAPI.getPerson.mockResolvedValue({ _data: currentPopeMatch });

    const tryAiExpandConnectionTarget = jest.fn(async () => ({ searchName: "Pope Francis", birthDate: "1936-12-17" }));
    const { resolveConnectionTargetPerson } = makeHandlers({ tryAiExpandConnectionTarget });

    const matched = await resolveConnectionTargetPerson("the Pope", "Connection between Marsha Hutchison and the Pope");

    expect(matched?.Name).toBe("Prevost-1162");
    expect(matched?.Derived?.ShortName).toBe("Pope Leo XIV Prevost");
    expect(tryAiExpandConnectionTarget).not.toHaveBeenCalled();
    expect(WikiTreeAPI.getPerson).toHaveBeenCalledWith("Chat", "Prevost-1162", expect.any(String));

    jest.useRealTimers();
  });

  test("does not run getConnections for a named source without a stable WTID", async () => {
    WikiTreeAPI.getPerson.mockResolvedValue({
      _data: {
        Id: 46655760,
        Name: "Prevost-1162",
        RealName: "Pope Leo XIV",
        ShortName: "Pope Leo XIV Prevost",
      },
    });

    const { tryHandleConnectionPrompt } = makeHandlers({
      resolveConnectionSourceRoot: jest.fn(async () => ({
        key: 10878803,
        wtId: "",
        displayName: "Marsha Hutchison",
        subjectType: "named",
      })),
    });

    const result = await tryHandleConnectionPrompt("Connection between Marsha Hutchison and the Pope", "the Pope");

    expect(result).toContain('I found a possible source match for "Marsha Hutchison"');
    expect(result).toContain("Muse cannot compute the connection from it");
    expect(result).toContain("stable WikiTree ID");
    expect(WikiTreeAPI.getConnections).not.toHaveBeenCalled();
  });

  test("mentions private profiles when no target match is found", async () => {
    WikiTreeAPI.searchPerson.mockResolvedValue([0, []]);

    const { tryHandleConnectionPrompt } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => null),
    });

    const result = await tryHandleConnectionPrompt(
      "Connection between Marsha Hutchison and Unknown Example",
      "Unknown Example"
    );

    expect(result).toContain('I could not find a WikiTree profile match for "Unknown Example"');
    expect(result).toContain("Muse may not be able to compute the connection at all");
  });
});
