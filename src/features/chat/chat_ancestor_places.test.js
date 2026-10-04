jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })),
}));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));

import { ChatIntent, parseAncestorPlacePrompt, routeChatPrompt } from "./chat_router";
import { createChatPeopleHandlers } from "./chat_people";
import { getCountryFromLocation } from "./chat_place_country";

// Live C5/C6, 2026-10-03: both fell to the AI.
describe("ancestor places", () => {
  test.each([
    ["where were my ancestors born?", { placeSummary: "birth", subjectText: "my ancestors" }],
    ["Where did my ancestors come from", { placeSummary: "birth", subjectText: "my ancestors" }],
    ["where did Tabler-141's ancestors die?", { placeSummary: "death", subjectText: "Tabler-141's ancestors" }],
    ["which countries were my ancestors born in?", { placeSummary: "birth" }],
    ["which of my ancestors emigrated?", { emigrated: true, subjectText: "my ancestors" }],
    ["my immigrant ancestors", { emigrated: true }],
    ["her ancestors who emigrated", { emigrated: true, subjectText: "her ancestors" }],
  ])("%s", (prompt, expected) => {
    const routed = routeChatPrompt(prompt, {});
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routed.params).toMatchObject(expected);
  });

  test("declines unrelated", () => {
    expect(parseAncestorPlacePrompt("my ancestors born in Ireland")).toBeNull();
    expect(parseAncestorPlacePrompt("where was Ellen born?")).toBeNull();
  });

  test.each([
    ["Wem, Shropshire, England", "England"],
    ["Edinburgh, Scotland, United Kingdom", "Scotland"],
    ["Boston, Massachusetts, USA", "United States"],
    ["London, United Kingdom", "United Kingdom"],
    ["", ""],
  ])("country of %s", (location, country) => {
    expect(getCountryFromLocation(location)).toBe(country);
  });

  const people = {
    1: { Id: 1, Name: "Root-1", Father: 2, Mother: 3 },
    2: { Id: 2, Name: "Dad-1", Father: 4, Mother: 0, BirthLocation: "Wem, Shropshire, England", DeathLocation: "Sydney, New South Wales, Australia" },
    3: { Id: 3, Name: "Mum-1", Father: 0, Mother: 0, BirthLocation: "Cardiff, Wales", DeathLocation: "Cardiff, Wales" },
    4: { Id: 4, Name: "Grandad-1", Father: 0, Mother: 0, BirthLocation: "Shrewsbury, Shropshire, England, United Kingdom" },
  };
  const run = async (prompt) => {
    const handlers = createChatPeopleHandlers({
      ChatIntent,
      WBE_CHAT_APP_ID: "test",
      getLoggedInRootPerson: async () => ({ key: "1", wtId: "Root-1", displayName: "Root", subjectType: "user" }),
      getProfileSubjectRoot: () => null,
      formatSubjectLabel: () => "you (Root-1)",
      fetchPeoplePaged: async (appId, key, fields, options) =>
        options?.ancestors ? [null, null, { ...(options.minGeneration === 0 ? { 1: { ...people[1], Meta: { Degrees: 0 } } } : {}), 2: people[2], 3: people[3], 4: people[4] }] : [null, null, { 1: people[1] }],
      mapApiPersonToStandardRow: (profile, extra) => ({
        wtid: profile.Name,
        displayName: profile.Name,
        birthLocation: profile.BirthLocation || "",
        deathLocation: profile.DeathLocation || "",
        ...extra,
      }),
      makeAncestorProfileTable: (title, rows) => ({ title, rows }),
      normalizeNumberForSort: (value) => Number(value) || 0,
      normalizeText: (value) => String(value || "").trim().toLowerCase(),
      computeAgeAtDeathYears: () => null,
      getLastStructuredResult: () => null,
      getCurrentChatMode: () => "wt",
    });
    return handlers.tryHandleAncestorListPrompt(routeChatPrompt(prompt, {}).params, prompt);
  };

  test("birth countries with counts", async () => {
    const result = await run("where were my ancestors born?");
    expect(result.message).toMatch(/^Your 3 ancestors within 25 generations were born in: England 2, Wales 1\.$/);
    expect(result.table.rows).toHaveLength(3);
  });

  test("birth countries over two generations offer the origins chart", async () => {
    people[2].Meta = { Degrees: 1 };
    people[3].Meta = { Degrees: 1 };
    people[4].Meta = { Degrees: 2 };
    try {
      const result = await run("where were my ancestors born?");
      expect(result.message).toMatch(/^Your 3 ancestors within 25 generations were born in: England 2, Wales 1\.$/);
      expect(result.actions.map((action) => action.label)).toEqual(["Origins chart", "Migration map", "Fan chart"]);
    } finally {
      [2, 3, 4].forEach((id) => delete people[id].Meta);
    }
  });

  test("emigrants", async () => {
    const result = await run("which of my ancestors emigrated?");
    expect(result.message).toMatch(/^1 of your 3 ancestors within 25 generations were born in one country and died in another \(2 have both places recorded\):\n- Dad-1 \(Dad-1\): England → Australia$/);
  });
});

// Live C9, 2026-10-03: fell to the AI.
describe("ancestor pick", () => {
  test.each([
    ["my most recent ancestor born in Germany", { pick: "recent", location: "Germany", locationField: "BirthLocation" }],
    ["who was my earliest ancestor from Wales?", { pick: "earliest", location: "Wales", locationField: "BirthLocation" }],
    ["Tabler-141's nearest ancestor who died in Ohio", { pick: "recent", location: "Ohio", locationField: "DeathLocation", subjectText: "Tabler-141's ancestors" }],
  ])("%s", (prompt, expected) => {
    expect(routeChatPrompt(prompt, {})).toMatchObject({ intent: ChatIntent.ANCESTOR_LIST, params: { generation: 25, ...expected } });
  });

  const people = {
    1: { Id: 1, Name: "Root-1", Father: 2, Mother: 3 },
    2: { Id: 2, Name: "Dad-1", Father: 4, Mother: 0, BirthDate: "1850-01-01", BirthLocation: "Bonn, Germany" },
    3: { Id: 3, Name: "Mum-1", Father: 0, Mother: 0, BirthDate: "1855-01-01", BirthLocation: "Cardiff, Wales" },
    4: { Id: 4, Name: "Grandad-1", Father: 0, Mother: 0, BirthDate: "1820-01-01", BirthLocation: "Köln, Preußen, Germany" },
  };
  test.each([
    ["my most recent ancestor born in Germany", /^Your most recent ancestor born in Germany is Dad-1 \(Dad-1\), born 1850-01-01 in Bonn, Germany \(1 generation back\)\. 2 of 3 ancestors match/],
    ["my earliest ancestor born in Germany", /^Your earliest ancestor born in Germany is Grandad-1 \(Grandad-1\), born 1820-01-01/],
  ])("%s", async (prompt, expected) => {
    const handlers = createChatPeopleHandlers({
      ChatIntent,
      WBE_CHAT_APP_ID: "test",
      getLoggedInRootPerson: async () => ({ key: "1", wtId: "Root-1", displayName: "Root", subjectType: "user" }),
      getProfileSubjectRoot: () => null,
      formatSubjectLabel: () => "you (Root-1)",
      fetchPeoplePaged: async (appId, key, fields, options) =>
        options?.ancestors ? [null, null, { ...(options.minGeneration === 0 ? { 1: { ...people[1], Meta: { Degrees: 0 } } } : {}), 2: people[2], 3: people[3], 4: people[4] }] : [null, null, { 1: people[1] }],
      mapApiPersonToStandardRow: (profile, extra) => ({
        wtid: profile.Name,
        displayName: profile.Name,
        birth: profile.BirthDate || "",
        birthLocation: profile.BirthLocation || "",
        deathLocation: "",
        ...extra,
      }),
      makeAncestorProfileTable: (title, rows) => ({ title, rows }),
      normalizeNumberForSort: (value) => Number(value) || 0,
      normalizeText: (value) => String(value || "").trim().toLowerCase(),
      computeAgeAtDeathYears: () => null,
      getLastStructuredResult: () => null,
      getCurrentChatMode: () => "wt",
    });
    const result = await handlers.tryHandleAncestorListPrompt(routeChatPrompt(prompt, {}).params, prompt);
    expect(result.message).toMatch(expected);
  });
});
