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
    WikiTreeAPI.getAncestors.mockResolvedValue([]);
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

  test("does not prefer contextual surname matches when the expanded full name already appears in the target", async () => {
    const contextualCureMatch = {
      Id: 15644409,
      Name: "Cure-53",
      RealName: "Robert",
      FirstName: "Robert",
      LastNameAtBirth: "Cure",
      LastNameCurrent: "Cure",
      BirthDate: "1823-01-01",
      DeathDate: "1878-09-28",
      Gender: "Male",
      index: 0,
    };
    const robertSmithMatch = {
      Id: 501,
      Name: "Smith-5001",
      RealName: "Robert",
      FirstName: "Robert",
      LastNameAtBirth: "Smith",
      LastNameCurrent: "Smith",
      Gender: "Male",
      index: 8,
    };

    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, searchParams) => {
      if (
        searchParams.FirstName === "Robert" &&
        searchParams.LastName === "Cure" &&
        searchParams.skipVariants &&
        searchParams.lastNameMatch === "strict"
      ) {
        return [0, [contextualCureMatch]];
      }
      if (searchParams.FirstName === "Robert" && searchParams.LastNameCurrent === "Cure" && searchParams.skipVariants) {
        return [0, [contextualCureMatch]];
      }
      if (
        searchParams.FirstName === "Robert" &&
        searchParams.LastName === "Smith" &&
        searchParams.skipVariants &&
        searchParams.lastNameMatch === "strict"
      ) {
        return [0, [robertSmithMatch]];
      }
      if (
        searchParams.FirstName === "Robert" &&
        searchParams.LastNameCurrent === "Smith" &&
        searchParams.skipVariants
      ) {
        return [0, [robertSmithMatch]];
      }
      if (searchParams.RealName === "Robert Smith" && searchParams.limit === 40) {
        return [0, [robertSmithMatch]];
      }
      if (searchParams.RealName === "Robert Smith of the Cure" && searchParams.limit === 40) {
        return [0, []];
      }
      if (searchParams.FirstName === "Robert" && searchParams.LastName === "Cure" && searchParams.limit === 40) {
        return [0, [contextualCureMatch]];
      }
      return [0, []];
    });

    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => ({
        FirstName: "Robert",
        LastName: "Smith",
        BirthDate: "1959-04-21",
        DeathDate: "",
        Gender: "Male",
        isLiving: true,
      })),
    });

    const matched = await resolveConnectionTargetPerson(
      "Robert Smith of the Cure",
      "My connection to Robert Smith of the Cure"
    );

    expect(matched?.Name).toBe("Smith-5001");
  });

  test("prefers the ancestor-geo match when public exact-name candidates omit birth location", async () => {
    const wrongRobertSmithMatch = {
      Id: 701,
      Name: "Smith-153778",
      RealName: "Robert Smith",
      FirstName: "Robert",
      LastNameAtBirth: "Smith",
      LastNameCurrent: "Smith",
      BirthDate: "1959-04-21",
      Gender: "Male",
      index: 0,
    };
    const correctRobertSmithMatch = {
      Id: 702,
      Name: "Smith-183792",
      RealName: "Robert Smith",
      FirstName: "Robert",
      LastNameAtBirth: "Smith",
      LastNameCurrent: "Smith",
      BirthDate: "1959-04-21",
      Gender: "Male",
      index: 7,
    };

    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, searchParams) => {
      if (
        searchParams.FirstName === "Robert" &&
        searchParams.LastName === "Cure" &&
        searchParams.skipVariants &&
        searchParams.lastNameMatch === "strict"
      ) {
        return [0, []];
      }
      if (searchParams.FirstName === "Robert" && searchParams.LastNameCurrent === "Cure" && searchParams.skipVariants) {
        return [0, []];
      }
      if (
        searchParams.FirstName === "Robert" &&
        searchParams.LastName === "Smith" &&
        searchParams.skipVariants &&
        searchParams.lastNameMatch === "strict"
      ) {
        return [0, [wrongRobertSmithMatch, correctRobertSmithMatch]];
      }
      if (
        searchParams.FirstName === "Robert" &&
        searchParams.LastNameCurrent === "Smith" &&
        searchParams.skipVariants
      ) {
        return [0, [wrongRobertSmithMatch, correctRobertSmithMatch]];
      }
      if (searchParams.RealName === "Robert Smith" && searchParams.limit === 40) {
        return [0, [wrongRobertSmithMatch, correctRobertSmithMatch]];
      }
      if (searchParams.RealName === "Robert Smith of the Cure" && searchParams.limit === 40) {
        return [0, []];
      }
      if (searchParams.FirstName === "Robert" && searchParams.LastName === "Cure" && searchParams.limit === 40) {
        return [0, []];
      }
      return [0, []];
    });

    WikiTreeAPI.getAncestors.mockImplementation(async (_appId, key) => {
      if (key === "Smith-153778") {
        return [
          {
            Id: 701,
            Name: "Smith-153778",
            Father: 1701,
            Mother: 1702,
          },
          {
            Id: 1701,
            Name: "Smith-153779",
            BirthLocation: "Meadow Township, Johnston, North Carolina, United States",
            DeathLocation: "Smithfield, Johnston, North Carolina, United States",
            Father: 1703,
            Mother: 1704,
          },
          {
            Id: 1702,
            Name: "Smith-155779",
            BirthLocation: "Meadow Township, Johnston, North Carolina, United States",
            DeathLocation: "Smithfield Township, Johnston, North Carolina, United States",
            Father: 1705,
            Mother: 1706,
          },
          {
            Id: 1703,
            Name: "Smith-153780",
            BirthLocation: "Johnston County, North Carolina, United States",
            DeathLocation: "Johnston County, North Carolina, United States",
            Father: 0,
            Mother: 0,
          },
        ];
      }
      if (key === "Smith-183792") {
        return [
          {
            Id: 702,
            Name: "Smith-183792",
            Father: 2701,
            Mother: -1,
          },
          {
            Id: 2701,
            Name: "Smith-181568",
            BirthLocation: "",
            DeathLocation: "Crawley, West Sussex, England, United Kingdom",
            Father: 0,
            Mother: 0,
          },
          {
            Id: -1,
            Father: -2,
            Mother: -3,
          },
          {
            Id: -2,
            Father: 2702,
            Mother: 2703,
          },
          {
            Id: -3,
            Father: 2704,
            Mother: 2705,
          },
          {
            Id: 2702,
            Name: "Emmott-50",
            BirthLocation: "Bermondsey, Surrey, England, United Kingdom",
            DeathLocation: "",
            Father: 0,
            Mother: 0,
          },
          {
            Id: 2703,
            Name: "Osborn-5177",
            BirthLocation: "Bradford, Yorkshire, England, United Kingdom",
            DeathLocation: "",
            Father: 0,
            Mother: 0,
          },
          {
            Id: 2704,
            Name: "Gelder-90",
            BirthLocation: "Bradford, Yorkshire, England, United Kingdom",
            DeathLocation: "",
            Father: 0,
            Mother: 0,
          },
          {
            Id: 2705,
            Name: "Price-18149",
            BirthLocation: "Roundhay, Yorkshire, England, United Kingdom",
            DeathLocation: "",
            Father: 0,
            Mother: 0,
          },
        ];
      }
      return [];
    });

    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => ({
        FirstName: "Robert",
        LastName: "Smith",
        BirthDate: "1959-04-21",
        DeathDate: "",
        BirthLocation: "Blackpool, Lancashire, England",
        Gender: "Male",
        isLiving: true,
      })),
    });

    const matched = await resolveConnectionTargetPerson(
      "Robert Smith of the Cure",
      "My connection to Robert Smith of the Cure"
    );

    expect(matched?.Name).toBe("Smith-183792");
  });

  test("searches deeper exact lanes for likely living targets and prefers plausible modern matches", async () => {
    const historicalStephen = {
      Id: 44378737,
      Name: "Fry-11320",
      RealName: "Stephen",
      FirstName: "Stephen",
      LastNameAtBirth: "Fry",
      LastNameCurrent: "Fry",
      BirthDate: "1695-06-19",
      DeathDate: "0000-00-00",
      index: 1,
    };
    const livingStephen = {
      Id: 11512457,
      Name: "Fry-2606",
      RealName: "Stephen",
      LastNameAtBirth: "Fry",
      LastNameCurrent: "Fry",
      index: 32,
    };

    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, searchParams) => {
      if (
        searchParams.FirstName === "Stephen" &&
        searchParams.LastName === "Fry" &&
        searchParams.skipVariants &&
        searchParams.limit === 100
      ) {
        return [0, [historicalStephen, livingStephen]];
      }
      if (
        searchParams.FirstName === "Stephen" &&
        searchParams.LastNameCurrent === "Fry" &&
        searchParams.skipVariants &&
        searchParams.limit === 100
      ) {
        return [0, [historicalStephen, livingStephen]];
      }
      if (searchParams.RealName === "Stephen Fry" && searchParams.limit === 40) {
        return [0, [historicalStephen]];
      }
      return [0, []];
    });

    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => ({
        FirstName: "Stephen",
        LastName: "Fry",
        BirthDate: "1957-08-24",
        DeathDate: "",
        isLiving: true,
      })),
    });

    const matched = await resolveConnectionTargetPerson("Stephen Fry", "Connection between me and Stephen Fry.");

    expect(matched?.Name).toBe("Fry-2606");
    expect(WikiTreeAPI.searchPerson).toHaveBeenCalledWith(
      "Chat",
      expect.objectContaining({
        FirstName: "Stephen",
        LastName: "Fry",
        limit: 100,
      }),
      expect.any(String)
    );
  });

  test("does not run duplicate unsorted exact-name lanes when AI expansion matches the original name", async () => {
    const livingStephen = {
      Id: 11512457,
      Name: "Fry-2606",
      RealName: "Stephen",
      LastNameAtBirth: "Fry",
      LastNameCurrent: "Fry",
      Gender: "Male",
      index: 31,
    };
    const wrongStephenExact = {
      Id: 7906084,
      Name: "Fry-1714",
      RealName: "Stephen",
      LastNameAtBirth: "Fry",
      LastNameCurrent: "Fry",
      Gender: "Male",
      index: 33,
    };
    const wrongStephenRelaxed = {
      Id: 7906084,
      Name: "Fry-1714",
      RealName: "Stephen",
      FirstName: "Stephen",
      LastNameAtBirth: "Fry",
      LastNameCurrent: "Fry",
      Gender: "Male",
      index: 1,
    };

    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, searchParams) => {
      if (
        searchParams.FirstName === "Stephen" &&
        searchParams.LastName === "Fry" &&
        searchParams.skipVariants &&
        searchParams.lastNameMatch === "strict" &&
        searchParams.limit === 100 &&
        searchParams.sort === "birth"
      ) {
        return [0, [livingStephen, wrongStephenExact]];
      }
      if (
        searchParams.FirstName === "Stephen" &&
        searchParams.LastNameCurrent === "Fry" &&
        searchParams.skipVariants &&
        searchParams.limit === 100 &&
        searchParams.sort === "birth"
      ) {
        return [0, [livingStephen, wrongStephenExact]];
      }
      if (
        searchParams.FirstName === "Stephen" &&
        searchParams.LastName === "Fry" &&
        searchParams.limit === 40 &&
        searchParams.sort === "birth"
      ) {
        return [0, [wrongStephenRelaxed]];
      }
      if (searchParams.RealName === "Stephen Fry" && searchParams.limit === 40) {
        return [0, [wrongStephenRelaxed]];
      }
      throw new Error(`Unexpected search params: ${JSON.stringify(searchParams)}`);
    });

    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => ({
        FirstName: "Stephen",
        LastName: "Fry",
        BirthDate: "1957-08-24",
        DeathDate: "",
        isLiving: true,
      })),
    });

    const matched = await resolveConnectionTargetPerson("Stephen Fry", "Connection between me and Stephen Fry.");

    expect(matched?.Name).toBe("Fry-2606");
    expect(
      WikiTreeAPI.searchPerson.mock.calls.some(
        ([, params]) =>
          params.FirstName === "Stephen" &&
          params.LastName === "Fry" &&
          params.skipVariants === 1 &&
          params.lastNameMatch === "strict" &&
          params.limit === 100 &&
          !Object.prototype.hasOwnProperty.call(params, "sort")
      )
    ).toBe(false);
  });

  test("treats an AI wtId as a bonus only when it matches a real candidate", async () => {
    const wrongStephen = {
      Id: 7906084,
      Name: "Fry-1714",
      RealName: "Stephen",
      LastNameAtBirth: "Fry",
      LastNameCurrent: "Fry",
      Gender: "Male",
      index: 12,
    };
    const livingStephen = {
      Id: 11512457,
      Name: "Fry-2606",
      RealName: "Stephen",
      LastNameAtBirth: "Fry",
      LastNameCurrent: "Fry",
      Gender: "Male",
      index: 31,
    };

    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, searchParams) => {
      if (
        searchParams.FirstName === "Stephen" &&
        searchParams.LastName === "Fry" &&
        searchParams.skipVariants &&
        searchParams.lastNameMatch === "strict" &&
        searchParams.limit === 100 &&
        searchParams.sort === "birth"
      ) {
        return [0, [wrongStephen, livingStephen]];
      }
      if (
        searchParams.FirstName === "Stephen" &&
        searchParams.LastNameCurrent === "Fry" &&
        searchParams.skipVariants &&
        searchParams.limit === 100 &&
        searchParams.sort === "birth"
      ) {
        return [0, [wrongStephen, livingStephen]];
      }
      if (
        searchParams.FirstName === "Stephen" &&
        searchParams.LastName === "Fry" &&
        searchParams.limit === 40 &&
        searchParams.sort === "birth"
      ) {
        return [0, [wrongStephen]];
      }
      if (searchParams.RealName === "Stephen Fry" && searchParams.limit === 40) {
        return [0, [wrongStephen]];
      }
      throw new Error(`Unexpected search params: ${JSON.stringify(searchParams)}`);
    });

    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => ({
        FirstName: "Stephen",
        LastName: "Fry",
        BirthDate: "1957-08-24",
        DeathDate: "",
        isLiving: true,
        wtId: "Fry-2606",
      })),
    });

    const matched = await resolveConnectionTargetPerson("Stephen Fry", "Connection between me and Stephen Fry.");

    expect(matched?.Name).toBe("Fry-2606");
    expect(WikiTreeAPI.getPerson).not.toHaveBeenCalledWith("Chat", "Fry-2606", expect.any(String));
  });

  test("uses optional AI location, gender, and parent-name hints in exact search lanes", async () => {
    const hintedMatch = {
      Id: 404,
      Name: "Example-404",
      RealName: "Alex Example",
      FirstName: "Alex",
      LastNameAtBirth: "Example",
      LastNameCurrent: "Example",
      BirthLocation: "Blackpool, Lancashire, England",
      Gender: "Female",
      index: 0,
    };

    WikiTreeAPI.searchPerson.mockImplementation(async (_appId, searchParams) => {
      if (
        searchParams.FirstName === "Alex" &&
        searchParams.LastName === "Example" &&
        searchParams.skipVariants &&
        searchParams.lastNameMatch === "strict" &&
        searchParams.limit === 100 &&
        searchParams.sort === "birth" &&
        searchParams.BirthLocation === "Blackpool, Lancashire, England" &&
        searchParams.Gender === "Female" &&
        searchParams.fatherFirstName === "John" &&
        searchParams.motherFirstName === "Mary"
      ) {
        return [0, [hintedMatch]];
      }
      if (
        searchParams.FirstName === "Alex" &&
        searchParams.LastNameCurrent === "Example" &&
        searchParams.skipVariants &&
        searchParams.limit === 100 &&
        searchParams.sort === "birth" &&
        searchParams.BirthLocation === "Blackpool, Lancashire, England" &&
        searchParams.Gender === "Female" &&
        searchParams.fatherFirstName === "John" &&
        searchParams.motherFirstName === "Mary"
      ) {
        return [0, [hintedMatch]];
      }
      if (searchParams.RealName === "Alex Example" && searchParams.limit === 40) {
        return [0, []];
      }
      if (searchParams.FirstName === "Alex" && searchParams.LastName === "Example" && searchParams.limit === 40) {
        return [0, []];
      }
      if (
        searchParams.FirstName === "Alex" &&
        searchParams.LastName === "Example" &&
        searchParams.skipVariants &&
        searchParams.limit === 100 &&
        searchParams.sort === "birth"
      ) {
        return [0, []];
      }
      if (
        searchParams.FirstName === "Alex" &&
        searchParams.LastNameCurrent === "Example" &&
        searchParams.skipVariants &&
        searchParams.limit === 100 &&
        searchParams.sort === "birth"
      ) {
        return [0, []];
      }
      throw new Error(`Unexpected search params: ${JSON.stringify(searchParams)}`);
    });

    const { resolveConnectionTargetPerson } = makeHandlers({
      tryAiExpandConnectionTarget: jest.fn(async () => ({
        FirstName: "Alex",
        LastName: "Example",
        BirthLocation: "Blackpool, Lancashire, England",
        Gender: "Female",
        fatherFirstName: "John",
        motherFirstName: "Mary",
        isLiving: true,
      })),
    });

    const matched = await resolveConnectionTargetPerson("Alex Example", "Connection between me and Alex Example.");

    expect(matched?.Name).toBe("Example-404");
    expect(WikiTreeAPI.searchPerson).toHaveBeenCalledWith(
      "Chat",
      expect.objectContaining({
        FirstName: "Alex",
        LastName: "Example",
        BirthLocation: "Blackpool, Lancashire, England",
        Gender: "Female",
        fatherFirstName: "John",
        motherFirstName: "Mary",
      }),
      expect.any(String)
    );
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
