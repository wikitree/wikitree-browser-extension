import { createChatRelationHandlers } from "./chat_relations";

const SARAH = { Id: 100, Name: "Sarah-1", RealName: "Sarah Jones", FirstName: "Sarah", Gender: "Female" };
const BOB = { Id: 200, Name: "Bob-1", FirstName: "Bob", LastNameAtBirth: "Jones", Gender: "Male" };
const ANN = { Id: 201, Name: "Ann-1", FirstName: "Ann", LastNameAtBirth: "Smith", Gender: "Female" };
const CAROL = { Id: 300, Name: "Carol-1", FirstName: "Carol", LastNameAtBirth: "Brown", Gender: "Female" };
const DAVE = { Id: 400, Name: "Dave-1", FirstName: "Dave", LastNameAtBirth: "Brown", Gender: "Male" };
const EVE = { Id: 401, Name: "Eve-1", FirstName: "Eve", LastNameAtBirth: "Brown", Gender: "Female" };

function makeHandlers(overrides = {}) {
  const WikiTreeAPI = {
    getRelatives: jest.fn(async (_appId, personKey, _fields, options) => {
      if (options?.getSpouses && String(personKey) === "Bob-1") {
        return [{ person: { ...BOB, Spouses: { 300: CAROL } } }];
      }
      if (options?.getSiblings && String(personKey) === "Carol-1") {
        return [{ person: { ...CAROL, Siblings: { 400: DAVE, 401: EVE } } }];
      }
      return [{ person: {} }];
    }),
  };

  const deps = {
    WikiTreeAPI,
    WBE_CHAT_APP_ID: "wbe-chat-test",
    RELATION_PERSON_FIELDS:
      "Id,Name,FirstName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender,Derived.ShortName",
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "", model: "" })),
    parsePlannerJson: jest.fn(),
    normalizeText: (value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    promptRefersToUser: jest.fn(() => false),
    resolveConnectionTargetPerson: jest.fn(async () => SARAH),
    getUserWtId: jest.fn(() => "User-1"),
    getUserNumId: jest.fn(() => 1),
    getLoggedInRootPerson: jest.fn(async () => ({ key: 1, wtId: "User-1" })),
    getProfileSubjectRoot: jest.fn(() => null),
    makeStandardProfileTable: jest.fn((title, rows) => ({ title, rows })),
    showBioListPopup: jest.fn(),
    handleOpenFromBioList: jest.fn(),
    fetchPeoplePaged: jest.fn(async (_appId, keys) => {
      const wanted = (Array.isArray(keys) ? keys : [keys]).map(String);
      const all = { 200: BOB, 201: ANN };
      const result = {};
      Object.entries(all).forEach(([id, person]) => {
        if (wanted.includes(String(id))) {
          result[id] = person;
        }
      });
      return [null, null, result];
    }),
    fetchProfilesForIds: jest.fn(async () => []),
    fetchChildrenIdsForId: jest.fn(async () => []),
    fetchSiblingIdsForId: jest.fn(async () => []),
    fetchParentIds: jest.fn(async (key) => (String(key) === "100" ? [200, 201] : [])),
    isAppsLoginButtonPresent: jest.fn(() => false),
    ...overrides,
  };

  return { handlers: createChatRelationHandlers(deps), deps };
}

describe("chat_relations name-rooted chains", () => {
  test("walks Sarah's father's wife's siblings and opens bios", async () => {
    const { handlers, deps } = makeHandlers();

    const result = await handlers.tryHandleRelationCountPrompt(
      {
        mode: "list",
        relationRaw: "father's wife's siblings",
        subjectMode: "named",
        subjectName: "Sarah",
      },
      "Sarah's father's wife's siblings' bios"
    );

    expect(deps.resolveConnectionTargetPerson).toHaveBeenCalledWith("Sarah", expect.any(String));
    expect(deps.showBioListPopup).toHaveBeenCalledTimes(1);
    const [title, entries] = deps.showBioListPopup.mock.calls[0];
    expect(title).toMatch(/siblings bios/i);
    expect(entries.map((entry) => entry.wtid).sort()).toEqual(["Dave-1", "Eve-1"]);
    expect(String(result?.message || "")).toMatch(/Opened bios/i);
  });

  test("recovers a leading name left inside relationRaw by the planner", async () => {
    const { handlers, deps } = makeHandlers();

    const result = await handlers.tryHandleRelationCountPrompt(
      {
        mode: "list",
        relationRaw: "Sarah's father's wife's siblings",
        subjectMode: "user",
      },
      "show me Sarah's father's wife's siblings"
    );

    expect(deps.resolveConnectionTargetPerson).toHaveBeenCalledWith("Sarah", expect.any(String));
    expect(result?.table?.rows?.length ?? (result?.message ? 1 : 0)).toBeTruthy();
  });

  test("strips a trailing bios token from the chain text", async () => {
    const { handlers, deps } = makeHandlers();

    await handlers.tryHandleRelationCountPrompt(
      {
        mode: "list",
        relationRaw: "father's wife's siblings' bios",
        subjectMode: "named",
        subjectName: "Sarah",
      },
      "Sarah's father's wife's siblings' bios"
    );

    // The chain still walks correctly: bios popup fired with Carol's siblings.
    expect(deps.showBioListPopup).toHaveBeenCalledTimes(1);
    const [, entries] = deps.showBioListPopup.mock.calls[0];
    expect(entries.map((entry) => entry.wtid).sort()).toEqual(["Dave-1", "Eve-1"]);
  });
});
