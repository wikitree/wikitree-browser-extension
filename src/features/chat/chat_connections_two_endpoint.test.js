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
