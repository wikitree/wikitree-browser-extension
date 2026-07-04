jest.mock("../../core/API/WikiTreeAPI", () => ({
  WikiTreeAPI: {
    getPerson: jest.fn(),
    getAncestors: jest.fn(),
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
import { createChatConnectionHandlers, looksLikePersonNameForSearch } from "./chat_connections";

const JEFFERSON = {
  Id: 900,
  Name: "Jefferson-1",
  RealName: "Thomas Jefferson",
  FirstName: "Thomas",
  LastNameAtBirth: "Jefferson",
  BirthDate: "1743-04-13",
};

function makeHandlers(overrides = {}) {
  return createChatConnectionHandlers({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    CHAT_LAST_CONNECTION_KEY: "wbe-last-connection",
    toggleConnectionsPopup: jest.fn(),
    tryAiDisambiguateConnectionTarget: jest.fn(async () => null),
    tryAiExpandConnectionTarget: jest.fn(async () => null),
    shouldOfferDisambiguation: jest.fn(() => false),
    resolveConnectionSourceRoot: jest.fn(),
    resolveAliasToRememberedPerson: jest.fn(() => null),
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

describe("chat_connections two-endpoint lookups", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    WikiTreeAPI.getAncestors.mockResolvedValue([]);
  });

  test("passes the routed source override through to source resolution and getConnections", async () => {
    const resolveConnectionSourceRoot = jest.fn(async () => ({
      key: 500,
      wtId: "Beacall-5",
      displayName: "Philip Beacall",
      subjectType: "named",
    }));

    WikiTreeAPI.searchPerson.mockResolvedValue([0, [JEFFERSON]]);
    WikiTreeAPI.getConnections.mockResolvedValue({
      pathLength: 12,
      path: [900, 500],
      people: {},
    });

    const { tryHandleConnectionPrompt } = makeHandlers({ resolveConnectionSourceRoot });

    const result = await tryHandleConnectionPrompt("Philip's connection to Jefferson", "Jefferson", {
      sourceOverride: "Philip",
    });

    expect(resolveConnectionSourceRoot).toHaveBeenCalledWith("Philip's connection to Jefferson", "Jefferson-1", "Philip");
    expect(WikiTreeAPI.getConnections).toHaveBeenCalled();
    expect(WikiTreeAPI.getConnections.mock.calls[0][1]).toEqual(["Beacall-5", "Jefferson-1"]);
    expect(String(result?.message || result)).toBeTruthy();
  });

  test("resolves a remembered first name with one getPerson and no searchPerson fan-out", async () => {
    const resolveAliasToRememberedPerson = jest.fn(() => ({ wtId: "Jones-12", displayName: "Sarah Jones" }));
    WikiTreeAPI.getPerson.mockResolvedValue({
      Id: 12,
      Name: "Jones-12",
      RealName: "Sarah Jones",
      FirstName: "Sarah",
      LastNameAtBirth: "Jones",
    });

    const { resolveConnectionTargetPerson } = makeHandlers({ resolveAliasToRememberedPerson });

    const matched = await resolveConnectionTargetPerson("Sarah", "my connection to Sarah");

    expect(resolveAliasToRememberedPerson).toHaveBeenCalledWith("Sarah");
    expect(matched?.Name).toBe("Jones-12");
    expect(WikiTreeAPI.searchPerson).not.toHaveBeenCalled();
  });

  test("rejects mis-extracted relation words without calling searchPerson", async () => {
    const { resolveConnectionTargetPerson } = makeHandlers();

    const matched = await resolveConnectionTargetPerson("siblings", "some prompt");

    expect(matched).toBeNull();
    expect(WikiTreeAPI.searchPerson).not.toHaveBeenCalled();
    expect(WikiTreeAPI.getPerson).not.toHaveBeenCalled();
  });
});

describe("famous-person date-aware resolution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    WikiTreeAPI.getAncestors.mockResolvedValue([]);
  });

  test("prefers the BirthDateDecade candidate matching the AI-known birth year of a living famous person", async () => {
    const famousFry = {
      Id: 1,
      Name: "Fry-100",
      RealName: "Stephen Fry",
      FirstName: "Stephen",
      LastNameAtBirth: "Fry",
      BirthDateDecade: "1950s",
    };
    const victorianFry = {
      Id: 2,
      Name: "Fry-200",
      RealName: "Stephen Fry",
      FirstName: "Stephen",
      LastNameAtBirth: "Fry",
      BirthDate: "1857-02-02",
      DeathDate: "1901-03-03",
    };
    WikiTreeAPI.searchPerson.mockResolvedValue([0, [victorianFry, famousFry]]);

    const tryAiExpandConnectionTarget = jest.fn(async () => ({
      FirstName: "Stephen",
      LastName: "Fry",
      BirthDate: "1957-08-24",
      DeathDate: "",
      isLiving: true,
    }));

    const { resolveConnectionTargetPerson } = makeHandlers({ tryAiExpandConnectionTarget });

    const matched = await resolveConnectionTargetPerson("Stephen Fry", "connection between Murray Maloney and Stephen Fry");

    expect(matched?.Name).toBe("Fry-100");
  });

  test("notability evidence separates the famous match from same-decade namesakes", async () => {
    const famousFry = {
      Id: 1,
      Name: "Fry-2606",
      RealName: "Stephen",
      FirstName: "Stephen",
      MiddleInitial: "J.",
      LastNameAtBirth: "Fry",
      BirthDateDecade: "1950s",
      IsLiving: 1,
      Templates: [{ name: "England", params: [] }, { name: "Living Notables", params: [] }, { name: "Wikidata", params: {} }],
      Managers: [
        { Id: "46785626", Name: "WikiTree-139" },
        { Id: "1779768", Name: "Haywood-41" },
      ],
    };
    const ordinaryFry = {
      Id: 2,
      Name: "Fry-9000",
      RealName: "Stephen Fry",
      FirstName: "Stephen",
      LastNameAtBirth: "Fry",
      BirthDateDecade: "1950s",
      IsLiving: 1,
      Templates: [],
      Managers: [{ Id: "3", Name: "Smith-12" }],
    };
    WikiTreeAPI.searchPerson.mockResolvedValue([0, [ordinaryFry, famousFry]]);

    const tryAiExpandConnectionTarget = jest.fn(async () => ({
      FirstName: "Stephen",
      LastName: "Fry",
      MiddleName: "John",
      BirthDate: "1957-08-24",
      DeathDate: "",
      isLiving: true,
    }));

    const { resolveConnectionTargetPerson } = makeHandlers({ tryAiExpandConnectionTarget });

    const matched = await resolveConnectionTargetPerson(
      "Stephen Fry",
      "connection between Murray Maloney and Stephen Fry"
    );

    expect(matched?.Name).toBe("Fry-2606");
  });

  test("finds the living famous person even when every other search returns only dead namesakes", async () => {
    const famousFry = {
      Id: 1,
      Name: "Fry-2606",
      RealName: "Stephen",
      FirstName: "Stephen",
      LastNameAtBirth: "Fry",
      BirthDateDecade: "1950s",
      IsLiving: 1,
      Templates: [{ name: "Living Notables", params: [] }],
      Managers: [{ Id: "46785626", Name: "WikiTree-139" }],
    };
    const deadFrys = Array.from({ length: 8 }, (_, index) => ({
      Id: 100 + index,
      Name: `Fry-${6000 + index}`,
      RealName: "Stephen",
      FirstName: "Stephen",
      LastNameAtBirth: "Fry",
      BirthDate: `${1667 + index * 20}-01-01`,
      DeathDate: `${1740 + index * 20}-01-01`,
    }));

    // Only the isLiving=1 searches surface the famous profile; everything
    // else returns the oldest dead namesakes (birth-ascending sort).
    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, params) => {
      if (params?.isLiving === 1) {
        return [0, [famousFry]];
      }
      return [0, deadFrys];
    });

    const tryAiExpandConnectionTarget = jest.fn(async () => ({
      FirstName: "Stephen",
      LastName: "Fry",
      BirthDate: "1957-08-24",
      DeathDate: "",
      isLiving: true,
    }));

    const { resolveConnectionTargetPerson } = makeHandlers({ tryAiExpandConnectionTarget });

    const matched = await resolveConnectionTargetPerson(
      "Stephen Fry",
      "connection between Murray Maloney and Stephen Fry"
    );

    expect(matched?.Name).toBe("Fry-2606");
    const livingCalls = WikiTreeAPI.searchPerson.mock.calls.filter(([, params]) => params?.isLiving === 1);
    expect(livingCalls.length).toBeGreaterThanOrEqual(2);
    expect(livingCalls.some(([, params]) => params?.skipVariants === 1 && params?.lastNameMatch === "strict")).toBe(
      true
    );
    // The plain lane mirrors the verified manual API call exactly.
    expect(
      livingCalls.some(
        ([, params]) => !params?.skipVariants && !params?.lastNameMatch && params?.limit === 100 && !params?.Gender
      )
    ).toBe(true);
  });

  test("living namesakes enter the candidate pool even when the AI expansion fails", async () => {
    const famousFry = {
      Id: 1,
      Name: "Fry-2606",
      RealName: "Stephen",
      FirstName: "Stephen",
      LastNameAtBirth: "Fry",
      BirthDateDecade: "1950s",
      IsLiving: 1,
    };
    const deadFry = {
      Id: 2,
      Name: "Fry-6502",
      RealName: "Stephen",
      FirstName: "Stephen",
      LastNameAtBirth: "Fry",
      BirthDate: "1667-01-01",
      DeathDate: "1748-01-01",
    };

    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, params) => {
      if (params?.isLiving === 1) {
        return [0, [famousFry]];
      }
      return [0, [deadFry]];
    });

    let capturedCandidates = [];
    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => null),
      setLastConnectionCandidates: jest.fn((value) => {
        capturedCandidates = value || [];
      }),
    });

    await resolveConnectionTargetPerson("Stephen Fry", "connection between Murray Maloney and Stephen Fry");

    const livingCall = WikiTreeAPI.searchPerson.mock.calls.find(([, params]) => params?.isLiving === 1);
    expect(livingCall).toBeTruthy();
    expect(livingCall[1]).toEqual({ FirstName: "Stephen", LastName: "Fry", isLiving: 1, limit: 100 });
    expect(capturedCandidates.map((candidate) => candidate.Name)).toContain("Fry-2606");
  });

  test("passes isLiving=1 to hinted searches when AI says the person is living", async () => {
    WikiTreeAPI.searchPerson.mockResolvedValue([
      0,
      [
        {
          Id: 1,
          Name: "Fry-2606",
          RealName: "Stephen",
          FirstName: "Stephen",
          LastNameAtBirth: "Fry",
          BirthDateDecade: "1950s",
          IsLiving: 1,
        },
      ],
    ]);

    const tryAiExpandConnectionTarget = jest.fn(async () => ({
      FirstName: "Stephen",
      LastName: "Fry",
      BirthDate: "1957-08-24",
      DeathDate: "",
      isLiving: true,
    }));

    const { resolveConnectionTargetPerson } = makeHandlers({ tryAiExpandConnectionTarget });

    await resolveConnectionTargetPerson("Stephen Fry", "connection between Murray Maloney and Stephen Fry");

    const hintedCall = WikiTreeAPI.searchPerson.mock.calls.find(([, params]) => params?.isLiving === 1);
    expect(hintedCall).toBeTruthy();
  });

  test("offers a candidate choice when scores are too close to call", async () => {
    const candidateA = {
      Id: 1,
      Name: "Fry-100",
      RealName: "Stephen Fry",
      FirstName: "Stephen",
      LastNameAtBirth: "Fry",
    };
    const candidateB = {
      Id: 2,
      Name: "Fry-200",
      RealName: "Stephen Fry",
      FirstName: "Stephen",
      LastNameAtBirth: "Fry",
    };
    WikiTreeAPI.searchPerson.mockResolvedValue([0, [candidateA, candidateB]]);

    const setPendingDisambiguationContext = jest.fn();
    const buildDisambiguationMessage = jest.fn(() => "Which Stephen Fry did you mean? 1) ... 2) ...");

    let lastCandidates = [];
    const { tryHandleConnectionPrompt } = makeHandlers({
      shouldOfferDisambiguation: jest.fn(() => true),
      setPendingDisambiguationContext,
      buildDisambiguationMessage,
      setLastConnectionCandidates: jest.fn((value) => {
        lastCandidates = value || [];
      }),
      getLastConnectionCandidates: jest.fn(() => lastCandidates),
      resolveConnectionSourceRoot: jest.fn(async () => ({ key: 500, wtId: "Maloney-1", subjectType: "named" })),
    });

    const result = await tryHandleConnectionPrompt(
      "connection between Murray Maloney and Stephen Fry",
      "Stephen Fry",
      { sourceOverride: "Murray Maloney" }
    );

    expect(result).toContain("Which Stephen Fry did you mean?");
    expect(setPendingDisambiguationContext).toHaveBeenCalledTimes(1);
    const pendingContext = setPendingDisambiguationContext.mock.calls[0][0];
    expect(pendingContext.params).toEqual({ target: "Stephen Fry", source: "Murray Maloney" });
    expect(pendingContext.candidates.length).toBeGreaterThan(1);
    expect(WikiTreeAPI.getConnections).not.toHaveBeenCalled();
  });
});

describe("looksLikePersonNameForSearch", () => {
  test("accepts plain and multi-part names", () => {
    expect(looksLikePersonNameForSearch("Sarah")).toBe(true);
    expect(looksLikePersonNameForSearch("Murray Maloney")).toBe(true);
    expect(looksLikePersonNameForSearch("Catherine of Aragon")).toBe(true);
  });

  test("rejects query and relation words at the edges", () => {
    expect(looksLikePersonNameForSearch("connection")).toBe(false);
    expect(looksLikePersonNameForSearch("his siblings")).toBe(false);
    expect(looksLikePersonNameForSearch("the connection")).toBe(false);
    expect(looksLikePersonNameForSearch("")).toBe(false);
  });
});
