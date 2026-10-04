jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })),
}));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));

import { ChatIntent, parseAncestorGenerationCountPrompt, routeChatPrompt } from "./chat_router";
import { createChatPeopleHandlers } from "./chat_people";

// Live C4, 2026-10-03: "how many of my 5th great-grandparents are known?" fell
// to the AI; "how many 5th great-grandparents do I have" counted "grandparents"
// of the page person.
describe("ancestor generation counts", () => {
  test.each([
    ["how many of my 5th great-grandparents are known?", 7, "my ancestors"],
    ["how many 5th great-grandparents do I have", 7, "my ancestors"],
    ["How many of my great-grandparents are on WikiTree?", 3, "my ancestors"],
    ["how many of my 3x great grandparents do I know", 5, "my ancestors"],
    ["how many of Tabler-141's grandparents are known", 2, "Tabler-141's ancestors"],
  ])("%s", (prompt, generation, subjectText) => {
    const routed = routeChatPrompt(prompt, {});
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routed.params).toMatchObject({ generation, countMode: true, subjectText });
  });

  test("declines other questions", () => {
    expect(parseAncestorGenerationCountPrompt("how many grandchildren do I have")).toBeNull();
    expect(parseAncestorGenerationCountPrompt("how many of my ancestors are known")).toBeNull();
  });

  test("'show my 5th great-grandparents' is an ancestor list, not a relation count", () => {
    expect(routeChatPrompt("show my 5th great-grandparents", {})).toMatchObject({
      intent: ChatIntent.ANCESTOR_LIST,
      params: { generation: 7 },
    });
  });

  const people = {
    1: { Id: 1, Name: "Root-1", Father: 2, Mother: 3 },
    2: { Id: 2, Name: "Dad-1", Father: 4, Mother: 0 },
    3: { Id: 3, Name: "Mum-1", Father: 0, Mother: 0 },
    4: { Id: 4, Name: "Grandad-1", Father: 0, Mother: 0 },
  };
  const run = async (prompt, params = routeChatPrompt(prompt, {}).params) => {
    const handlers = createChatPeopleHandlers({
      ChatIntent,
      WBE_CHAT_APP_ID: "test",
      getLoggedInRootPerson: async () => ({ key: "1", wtId: "Root-1", displayName: "Root", subjectType: "user" }),
      getProfileSubjectRoot: () => null,
      formatSubjectLabel: () => "you (Root-1)",
      fetchPeoplePaged: async (appId, key, fields, options) =>
        // Like the API, minGeneration drops the generations below it (live C4,
        // 2026-10-03: the walk from the root then never reached generation 7).
        options?.ancestors
          ? [null, null, Object.fromEntries([[1, 0], [2, 1], [3, 1], [4, 2]].filter(([, gen]) => gen >= (options.minGeneration ?? 1)).map(([id, gen]) => [id, { ...people[id], Meta: { Degrees: gen } }]))]
          : [null, null, { 1: people[1] }],
      mapApiPersonToStandardRow: (profile, extra) => ({ wtid: profile.Name, displayName: profile.Name, ...extra }),
      makeAncestorProfileTable: (title, rows) => ({ title, rows }),
      normalizeNumberForSort: (value) => Number(value) || 0,
      normalizeText: (value) => String(value || "").trim().toLowerCase(),
      computeAgeAtDeathYears: () => null,
      getLastStructuredResult: () => null,
      getCurrentChatMode: () => "wt",
    });
    return handlers.tryHandleAncestorListPrompt(params, prompt);
  };

  test("count mode reports known of possible", async () => {
    const result = await run("how many of my grandparents are known?");
    expect(result.message).toBe("1 of your 4 possible grandparents (25%) are on WikiTree.");
    expect(result.table.rows.map((row) => row.wtid)).toEqual(["Grandad-1"]);
  });

  test("a plain generation list carries the completeness note", async () => {
    const result = await run("show my grandparents", { generation: 2, relationshipLabel: "grandparents" });
    expect(result.message).toMatch(/^Here are grandparents for you \(Root-1\) \(1 found; 1 of your 4 possible grandparents \(25%\) are on WikiTree\):/);
  });

  // Live D13, 2026-10-03: private parents get per-response negative Ids. A root
  // fetched on its own said Father -1, but in the ancestors response -1 was
  // someone else, so the walk lost a branch (166 of 218 ancestors).
  test("private parents: the root comes from the ancestors response", async () => {
    const ancestorsResponse = {
      19: { Id: 19, Name: "Root-1", Father: -1, Mother: -2, Meta: { Degrees: 0 } },
      "-1": { Id: -1, Father: 5, Mother: 0, Meta: { Degrees: 1 } },
      "-2": { Id: -2, Father: 6, Mother: 0, Meta: { Degrees: 1 } },
      5: { Id: 5, Name: "Grandad-5", Father: 0, Mother: 0, Meta: { Degrees: 2 } },
      6: { Id: 6, Name: "Grandad-6", Father: 0, Mother: 0, Meta: { Degrees: 2 } },
    };
    const handlers = createChatPeopleHandlers({
      ChatIntent,
      WBE_CHAT_APP_ID: "test",
      getLoggedInRootPerson: async () => ({ key: "Root-1", wtId: "Root-1", displayName: "Root", subjectType: "user" }),
      getProfileSubjectRoot: () => null,
      formatSubjectLabel: () => "you (Root-1)",
      fetchPeoplePaged: async (appId, key, fields, options) =>
        options?.ancestors && options.minGeneration === 0
          ? [null, null, ancestorsResponse]
          : // A separate response numbers the private parents differently.
            [null, null, { 19: { Id: 19, Name: "Root-1", Father: -7, Mother: -8 } }],
      mapApiPersonToStandardRow: (profile, extra) => ({ wtid: profile.Name, displayName: profile.Name, ...extra }),
      makeAncestorProfileTable: (title, rows) => ({ title, rows }),
      normalizeNumberForSort: (value) => Number(value) || 0,
      normalizeText: (value) => String(value || "").trim().toLowerCase(),
      computeAgeAtDeathYears: () => null,
      getLastStructuredResult: () => null,
      getCurrentChatMode: () => "wt",
    });
    const prompt = "how many of my grandparents are known?";
    const result = await handlers.tryHandleAncestorListPrompt(routeChatPrompt(prompt, {}).params, prompt);
    expect(result.message).toBe("2 of your 4 possible grandparents (50%) are on WikiTree.");
  });
});

// P8 (live, 2026-10-03): "who were James Cook's grandchildren?" kept "who were"
// in the name, failed to resolve it, and listed the page person's grandchildren.
describe("named subject behind a question lead", () => {
  test.each([
    ["who were James Cook's grandchildren?", "tryHandleDescendantListPrompt", { generation: 2, relationshipLabel: "grandchildren" }],
    ["who were James Cook's grandparents?", "tryHandleAncestorListPrompt", { generation: 2, relationshipLabel: "grandparents" }],
  ])("%s", async (prompt, handlerName, params) => {
    const resolveConnectionTargetPerson = jest.fn(async () => null);
    const handlers = createChatPeopleHandlers({
      ChatIntent,
      WBE_CHAT_APP_ID: "test",
      getLoggedInRootPerson: async () => null,
      getProfileSubjectRoot: () => ({ key: "9", wtId: "Cook-8721", displayName: "Ellen", subjectType: "profile" }),
      resolveConnectionTargetPerson,
      formatSubjectLabel: () => "x",
      normalizeText: (value) => String(value || "").trim().toLowerCase(),
      getLastStructuredResult: () => null,
      getCurrentChatMode: () => "wt",
    });
    const result = await handlers[handlerName](params, prompt);
    expect(resolveConnectionTargetPerson).toHaveBeenCalledWith("James Cook", expect.any(String));
    expect(String(result)).toMatch(/James Cook/);
  });
});
