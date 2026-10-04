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
    isLoggedOutOfAppsServer: jest.fn(() => Promise.resolve(false)),
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

  test("an ordinal spouse follows marriage order, and the label names the chain (live Beacall-385, 2026-10-02)", async () => {
    // George (Beacall-385): Dicken-246 m. 1667 (no siblings), Dicken-247 m. 1683.
    const GEORGE = { Id: 385, Name: "Beacall-385", RealName: "George", Gender: "Male" };
    const FIRST = { Id: 246, Name: "Dicken-246", Gender: "Female", marriage_date: "1667-01-30" };
    const SECOND = { Id: 247, Name: "Dicken-247", Gender: "Female", marriage_date: "1683-01-16" };
    const SUSANNA = { Id: 253, Name: "Dicken-253", FirstName: "Susanna", Gender: "Female" };
    const WikiTreeAPI = {
      getRelatives: jest.fn(async (_appId, personKey, _fields, options) => {
        if (options?.getSpouses && String(personKey) === "385") {
          return [{ person: { ...GEORGE, Spouses: { 247: SECOND, 246: FIRST } } }];
        }
        if (options?.getSiblings && String(personKey) === "Dicken-247") {
          return [{ person: { ...SECOND, Siblings: { 253: SUSANNA } } }];
        }
        return [{ person: {} }];
      }),
    };
    const { handlers, deps } = makeHandlers({
      WikiTreeAPI,
      resolveConnectionTargetPerson: jest.fn(async () => GEORGE),
    });

    const result = await handlers.tryHandleRelationCountPrompt(
      { mode: "list", relationRaw: "Beacall-385's second wife's siblings" },
      "Beacall-385's second wife's siblings bios"
    );

    const [title, entries] = deps.showBioListPopup.mock.calls[0];
    expect(entries.map((entry) => entry.wtid)).toEqual(["Dicken-253"]);
    expect(title).toBe("sibling bios for George (Beacall-385)'s second wife");
    expect(result.message).toBe("Opened bios for sibling of George (Beacall-385)'s second wife.");
  });
});

describe("a relative named as a connection target (live, 2026-10-03)", () => {
  test("Sarah's father resolves to one person through the family links", async () => {
    const { handlers, deps } = makeHandlers();
    const result = await handlers.resolveRelativeTargetPeople("Sarah's father", "how is Sarah's father related to me?");
    expect(deps.resolveConnectionTargetPerson).toHaveBeenCalledWith("Sarah", "how is Sarah's father related to me?");
    expect(result.people.map((person) => person.Name)).toEqual(["Bob-1"]);
    expect(result.label).toBe("Sarah Jones (Sarah-1)'s father");
  });

  test("a chain gives every person at its end", async () => {
    const { handlers } = makeHandlers();
    const result = await handlers.resolveRelativeTargetPeople("Sarah's father's wife's siblings");
    expect(result.people.map((person) => person.Name).sort()).toEqual(["Dave-1", "Eve-1"]);
  });

  test("my father is the user's father", async () => {
    const { handlers, deps } = makeHandlers({
      fetchParentIds: jest.fn(async (key) => (String(key) === "User-1" || String(key) === "1" ? [200] : [])),
    });
    const result = await handlers.resolveRelativeTargetPeople("my father");
    expect(deps.resolveConnectionTargetPerson).not.toHaveBeenCalled();
    expect(result.label).toBe("your father");
    expect(result.people.map((person) => person.Name)).toEqual(["Bob-1"]);
  });

  test.each(["Stephen Fry", "Fry-2606", "Calvin", "the Pope"])("%s is a person, not a relative", async (target) => {
    const { handlers } = makeHandlers();
    await expect(handlers.resolveRelativeTargetPeople(target)).resolves.toBeNull();
  });
});

describe("count and empty-list wording (live F9/E1, 2026-10-03)", () => {
  test("a plural chain owner takes 'have'", async () => {
    const { handlers } = makeHandlers({
      fetchChildrenIdsForId: jest.fn(async (key) => (/^(?:200|Bob-1)$/.test(String(key)) ? [400] : /^(?:201|Ann-1)$/.test(String(key)) ? [401] : [])),
      fetchProfilesForIds: jest.fn(async (ids) => [DAVE, EVE].filter((p) => ids.map(String).includes(String(p.Id)))),
    });
    const result = await handlers.tryHandleRelationCountPrompt(
      { mode: "count", relationRaw: "parents's children", subjectMode: "named", subjectName: "Sarah" },
      "how many children did Sarah's parents have"
    );
    expect(result.message).toMatch(/'s parents have \d+ children/);
  });

  test("no relatives for a found person is a fact, not a failure", async () => {
    const { handlers } = makeHandlers({ fetchParentIds: jest.fn(async () => []) });
    const result = await handlers.tryHandleRelationCountPrompt(
      { mode: "list", relationRaw: "grandparents", subjectMode: "named", subjectName: "Sarah" },
      "who were Sarah's grandparents"
    );
    const message = typeof result === "string" ? result : result.message;
    expect(message).toMatch(/^No grandparents are recorded for Sarah/);
  });

  test("none of your own relatives found: the Apps login hint comes when the API says you aren't logged in to it", async () => {
    const ask = async (loggedOut) => {
      const { handlers, deps } = makeHandlers({
        promptRefersToUser: jest.fn(() => true),
        fetchParentIds: jest.fn(async () => []),
        isLoggedOutOfAppsServer: jest.fn(() => Promise.resolve(loggedOut)),
      });
      const result = await handlers.tryHandleRelationCountPrompt(
        { mode: "list", relationRaw: "grandparents", subjectMode: "user" },
        "who are my grandparents"
      );
      expect(deps.isLoggedOutOfAppsServer).toHaveBeenCalled();
      return typeof result === "string" ? result : result.message;
    };
    expect(await ask(true)).toContain("Click the green Apps button below");
    expect(await ask(false)).not.toContain("green Apps button");
  });
});

describe("nieces and nephews are the siblings' children (live H4, 2026-10-03)", () => {
  const withFamily = () =>
    makeHandlers({
      fetchSiblingIdsForId: jest.fn(async (key) => (/^(?:100|Sarah-1)$/.test(String(key)) ? [200] : [])),
      fetchChildrenIdsForId: jest.fn(async (key) => (/^(?:200|Bob-1)$/.test(String(key)) ? [400, 401] : [])),
      fetchProfilesForIds: jest.fn(async (ids) => [BOB, DAVE, EVE].filter((p) => ids.map(String).includes(String(p.Id)))),
    });

  test.each([
    ["nieces and nephews", ["Dave-1", "Eve-1"]],
    ["siblings' children", ["Dave-1", "Eve-1"]],
    ["nieces", ["Eve-1"]],
    ["nephews", ["Dave-1"]],
  ])("%s", async (relationRaw, expected) => {
    const { handlers } = withFamily();
    const result = await handlers.resolveRelativeTargetPeople(`Sarah's ${relationRaw}`);
    expect(result.people.map((person) => person.Name).sort()).toEqual(expected);
  });

  test("a one-step family list carries chart buttons for that person; a chain does not", async () => {
    const familyVisuals = jest.fn((key) => [{ label: `Family timeline ${key}` }]);
    const { handlers } = makeHandlers({ familyVisuals });

    const parents = await handlers.tryHandleRelationCountPrompt(
      { mode: "list", relationRaw: "parents", subjectMode: "named", subjectName: "Sarah" },
      "Sarah's parents"
    );
    expect(familyVisuals).toHaveBeenCalledWith("Sarah-1");
    expect(parents.actions.map((action) => action.label)).toEqual(["Family timeline Sarah-1"]);

    const chained = await handlers.tryHandleRelationCountPrompt(
      { mode: "list", relationRaw: "father's wife's siblings", subjectMode: "named", subjectName: "Sarah" },
      "Sarah's father's wife's siblings"
    );
    expect(chained.actions).toEqual([]);
  });
});
