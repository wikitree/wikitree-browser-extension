jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));

import { ChatIntent, routeChatPrompt } from "./chat_router";
import { createChatPeopleHandlers } from "./chat_people";

// Live C3, 2026-10-03: "who are my brick walls?" had no answer, and Genie's own
// suggestion "Which of my ancestors have no parents?" failed too.
describe("ancestors with a missing parent", () => {
  test.each([
    ["Which of my ancestors have no parents?", "both"],
    ["my ancestors with a missing parent", "either"],
    ["my ancestors with no father", "father"],
    ["Benny's ancestors with no mother", "mother"],
  ])("routes %s", (prompt, missingParent) => {
    const routed = routeChatPrompt(prompt, {});
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routed.params.missingParent).toBe(missingParent);
  });

  const people = {
    1: { Id: 1, Name: "Root-1", Father: 2, Mother: 3 },
    2: { Id: 2, Name: "Dad-1", Father: 4, Mother: 0 },
    3: { Id: 3, Name: "Mum-1", Father: 0, Mother: 0 },
    4: { Id: 4, Name: "Grandad-1", Father: 6, Mother: 7 },
  };

  function makeHandler() {
    const handlers = createChatPeopleHandlers({
      ChatIntent,
      WBE_CHAT_APP_ID: "test",
      getLoggedInRootPerson: async () => ({ key: "1", wtId: "Root-1", displayName: "Root", subjectType: "user" }),
      getProfileSubjectRoot: () => null,
      formatSubjectLabel: () => "you (Root-1)",
      fetchPeoplePaged: async (appId, key, fields, options) =>
        options?.ancestors ? [null, null, { ...(options.minGeneration === 0 ? { 1: { ...people[1], Meta: { Degrees: 0 } } } : {}), 2: people[2], 3: people[3], 4: people[4] }] : [null, null, { 1: people[1] }],
      mapApiPersonToStandardRow: (profile, extra) => ({ wtid: profile.Name, displayName: profile.Name, ...extra }),
      makeStandardProfileTable: (title, rows) => ({ title, rows }),
      makeAncestorProfileTable: (title, rows) => ({ title, rows }),
      normalizeNumberForSort: (value) => (Number.isFinite(Number(value)) ? Number(value) : Number.MAX_SAFE_INTEGER),
      normalizeText: (value) => String(value || "").trim().toLowerCase(),
      getLastStructuredResult: () => null,
      getCurrentChatMode: () => "wt",
    });
    return handlers.tryHandleAncestorListPrompt;
  }

  test.each([["Tabler-141's brick walls"], ["Tabler-141's ancestors with a missing parent"]])(
    "named subject: %s",
    async (prompt) => {
      const resolveConnectionTargetPerson = jest.fn(async () => ({ Id: 1, Name: "Tabler-141" }));
      const handlers = createChatPeopleHandlers({
        ChatIntent,
        WBE_CHAT_APP_ID: "test",
        resolveConnectionTargetPerson,
        getLoggedInRootPerson: async () => null,
        getProfileSubjectRoot: () => ({ key: "99", wtId: "Page-1" }),
        formatSubjectLabel: (root) => root.wtId,
        fetchPeoplePaged: async (appId, key, fields, options) =>
          options?.ancestors ? [null, null, { ...(options.minGeneration === 0 ? { 1: { ...people[1], Meta: { Degrees: 0 } } } : {}), 2: people[2], 3: people[3] }] : [null, null, { 1: people[1] }],
        mapApiPersonToStandardRow: (profile, extra) => ({ wtid: profile.Name, displayName: profile.Name, ...extra }),
        makeAncestorProfileTable: (title, rows) => ({ title, rows }),
        normalizeNumberForSort: (value) => Number(value) || 0,
        normalizeText: (value) => String(value || "").trim().toLowerCase(),
        getLastStructuredResult: () => null,
        getCurrentChatMode: () => "wt",
      });
      await handlers.tryHandleAncestorListPrompt(routeChatPrompt(prompt, {}).params, prompt);
      expect(resolveConnectionTargetPerson).toHaveBeenCalledWith("Tabler-141", expect.any(String));
    }
  );

  const ids = (result) => result.table.rows.map((row) => row.wtid).sort();

  test("either parent missing", async () => {
    const run = makeHandler();
    const prompt = "my ancestors with a missing parent";
    const result = await run(routeChatPrompt(prompt, {}).params, prompt);
    expect(ids(result)).toEqual(["Dad-1", "Mum-1"]);
  });

  test("no parents at all", async () => {
    const run = makeHandler();
    const prompt = "my ancestors with no parents";
    const result = await run(routeChatPrompt(prompt, {}).params, prompt);
    expect(ids(result)).toEqual(["Mum-1"]);
  });

  test("none missing says so", async () => {
    const run = makeHandler();
    const prompt = "my ancestors with no father";
    const result = await run({ ...routeChatPrompt(prompt, {}).params, generation: 2, includeUpTo: false }, prompt);
    expect(result).toMatch(/have a father recorded/);
  });
});

test("a relation with no family word goes to the planner", () => {
  expect(routeChatPrompt("who are my best friends?", {}).intent).toBe(ChatIntent.FALLBACK_AI);
  expect(routeChatPrompt("who are my grandparents?", {}).intent).toBe(ChatIntent.RELATION_COUNT);
});

test.each([
  ["ancestors with a missing parent"],
  ["my ancestors with a missing parent"],
  ["Smith-123's ancestors with a missing parent"],
])("rewritten brick-wall form routes: %s", (prompt) => {
  const routed = routeChatPrompt(prompt, {});
  expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
  expect(routed.params.missingParent).toBe("either");
});

test.each([
  ["25 generations of Windsor-1's ancestors", 25],
  ["25 generations of Queen Elizabeth's ancestors", 25],
  ["7 generations of my ancestors", 7],
  ["40 generations of my ancestors", 25],
])("generation count: %s", (prompt, generation) => {
  const routed = routeChatPrompt(prompt, {});
  expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
  expect(routed.params.generation).toBe(generation);
});

test.each([
  ["brick walls"],
  ["who are my brick walls?"],
  ["Tabler-141's brick walls"],
  ["show his dead ends"],
])("brick walls route deterministically: %s", (prompt) => {
  const routed = routeChatPrompt(prompt, {});
  expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
  expect(routed.params.missingParent).toBe("either");
});
