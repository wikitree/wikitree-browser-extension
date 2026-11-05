jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));

import { ChatIntent, routeChatPrompt } from "./chat_router";
import { createChatPeopleHandlers } from "./chat_people";

// Live C7, 2026-10-03: "my ancestors who lived past 90" fell to the AI, which
// asked the user to log in to the Apps server.
describe("ancestors by age at death", () => {
  test.each([
    ["my ancestors who lived past 90", { min: 91 }],
    ["my ancestors who lived to 90", { min: 90 }],
    ["which of my ancestors lived over 100?", { min: 101 }],
    ["my ancestors who died aged 90 or older", { min: 90 }],
    ["my ancestors who died under 5", { max: 4 }],
    ["my ancestors who died young", { max: 15 }],
    ["my ancestors who died aged 42", { min: 42, max: 42 }],
    ["Tabler-141's ancestors who lived past 90", { min: 91 }],
  ])("routes %s", (prompt, range) => {
    const routed = routeChatPrompt(prompt, {});
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routed.params.ageAtDeath).toEqual(range);
  });

  test.each([["my ancestors"], ["my ancestors born before 1800"], ["7 generations of my ancestors"]])(
    "no age filter: %s",
    (prompt) => {
      expect(routeChatPrompt(prompt, {}).params?.ageAtDeath).toBeUndefined();
    }
  );

  const people = {
    1: { Id: 1, Name: "Root-1", Father: 2, Mother: 3 },
    2: { Id: 2, Name: "Old-1", Father: 0, Mother: 0, BirthDate: "1800-05-01", DeathDate: "1895-01-01" },
    3: { Id: 3, Name: "Young-1", Father: 0, Mother: 0, BirthDate: "1810-01-01", DeathDate: "1850-01-01" },
  };

  const run = async (prompt, resolveConnectionTargetPerson) => {
    const handlers = createChatPeopleHandlers({
      ChatIntent,
      WBE_CHAT_APP_ID: "test",
      resolveConnectionTargetPerson,
      getLoggedInRootPerson: async () => ({ key: "1", wtId: "Root-1", displayName: "Root", subjectType: "user" }),
      getProfileSubjectRoot: () => null,
      formatSubjectLabel: () => "you (Root-1)",
      fetchPeoplePaged: async (appId, key, fields, options) =>
        options?.ancestors ? [null, null, { 2: people[2], 3: people[3] }] : [null, null, { 1: people[1] }],
      mapApiPersonToStandardRow: (profile, extra) => ({
        wtid: profile.Name,
        displayName: profile.Name,
        birth: profile.BirthDate,
        death: profile.DeathDate,
        ...extra,
      }),
      makeAncestorProfileTable: (title, rows) => ({ title, rows }),
      normalizeNumberForSort: (value) => Number(value) || 0,
      normalizeText: (value) => String(value || "").trim().toLowerCase(),
      computeAgeAtDeathYears: (birth, death) =>
        birth && death ? Number(death.slice(0, 4)) - Number(birth.slice(0, 4)) - 1 : null,
      getLastStructuredResult: () => null,
      getCurrentChatMode: () => "wt",
    });
    return handlers.tryHandleAncestorListPrompt(routeChatPrompt(prompt, {}).params, prompt);
  };

  test("keeps only those who lived past 90", async () => {
    const result = await run("my ancestors who lived past 90");
    expect(result.table.rows.map((row) => row.wtid)).toEqual(["Old-1"]);
  });

  test("none says how many had dates", async () => {
    const result = await run("my ancestors who lived past 100");
    expect(result).toMatch(/None of the 2 .* died aged 101 or older \(2 have both birth and death dates\)/);
  });

  test("named subject is resolved without the age words", async () => {
    const resolve = jest.fn(async () => ({ Id: 1, Name: "Tabler-141" }));
    await run("Tabler-141's ancestors who lived past 90", resolve);
    expect(resolve).toHaveBeenCalledWith("Tabler-141", expect.any(String));
  });
});
