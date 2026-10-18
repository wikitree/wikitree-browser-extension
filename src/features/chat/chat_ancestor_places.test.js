jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })),
}));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));

import { ChatIntent, parseAncestorPlacePrompt, routeChatPrompt } from "./chat_router";
import { createChatPeopleHandlers } from "./chat_people";
import { getCountryFromLocation } from "./chat_place_country";
import { sortByBirth } from "./chat_kin_order";

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
    // (2026-10-17: where to, as where they died)
    ["which of my ancestors emigrated to America", { emigrated: true, emigratedTo: "America", subjectText: "my ancestors" }],
    ["my ancestors who moved to Australia", { emigrated: true, emigratedTo: "Australia" }],
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
    2: { Id: 2, Name: "Dad-1", Father: 4, Mother: 0, BirthDate: "1820-05-01", BirthLocation: "Wem, Shropshire, England", DeathLocation: "Sydney, New South Wales, Australia", DeathDate: "1890-00-00" },
    3: { Id: 3, Name: "Mum-1", Father: 0, Mother: 0, BirthDate: "1825", BirthLocation: "Cardiff, Wales", DeathLocation: "Cardiff, Wales", DeathDate: "0000-00-00" },
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
        birth: profile.BirthDate || "",
        death: profile.DeathDate || "",
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

  test("no death date", async () => {
    const result = await run("which of my ancestors have no death date");
    expect(result.table.rows.map((row) => row.wtid)).toEqual(["Mum-1", "Grandad-1"]);
    expect(JSON.stringify(result)).toMatch(/with no death date/);
  });

  test("alive in a year: both dates known", async () => {
    const result = await run("which of my ancestors were alive in 1850");
    expect(result.table.rows.map((row) => row.wtid)).toEqual(["Dad-1"]);
    expect(JSON.stringify(result)).toMatch(/alive in 1850/);
  });

  test("emigrants to a place", async () => {
    expect((await run("which of my ancestors emigrated to Australia")).message).toMatch(
      /^1 of your 3 ancestors within 25 generations were born in another country and died in Australia /
    );
    expect(await run("which of my ancestors emigrated to Canada")).toMatch(/^None of your 3 ancestors within 25 generations were born in another country and died in Canada/);
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
    // (imagined AB5, 2026-10-18)
    ["what percentage of my ancestors were born in Germany", /^67%: 2 of your 3 ancestors within 10 generations on WikiTree were born in Germany\.$/],
    ["what proportion of my ancestors were born in Wales?", /^33%: 1 of your 3 ancestors/],
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

// Imagined corpus S9/S10 (2026-10-17)
describe("lived in, died before an age, my own chains", () => {
  test.each([
    ["which of my ancestors died before 30", ChatIntent.ANCESTOR_LIST, { ageAtDeath: { max: 29 } }],
    ["my ancestors who died after 90", ChatIntent.ANCESTOR_LIST, { ageAtDeath: { min: 91 } }],
    ["which of my descendants live in Canada", ChatIntent.DESCENDANT_LIST, { location: "Canada", locationField: "AnyLocation" }],
    ["my ancestors who lived in Kent", ChatIntent.ANCESTOR_LIST, { location: "Kent", locationField: "AnyLocation" }],
    ["which of my ancestors have no parents on WikiTree", ChatIntent.ANCESTOR_LIST, { missingParent: "both" }],
    // (X3: my own chain, as "show my mother's mother" already was)
    ["my mother's mother's mother", ChatIntent.RELATION_COUNT, { mode: "list", relationRaw: "mother's mother's mother", subjectMode: "user" }],
    ["who was my father's mother?", ChatIntent.RELATION_COUNT, { mode: "list", relationRaw: "father's mother", subjectMode: "user" }],
  ])("%s", (prompt, intent, params) => {
    expect(routeChatPrompt(prompt, {})).toMatchObject({ intent, params });
  });

  test("a year is not an age", () => {
    expect(routeChatPrompt("my ancestors who died before 1700", {}).params).not.toHaveProperty("ageAtDeath");
  });
});

// Imagined corpus (2026-10-18): decades, centuries and spans, alone or after a place.
describe("born in the 1700s", () => {
  const between = (field, value) => ({ dateField: field, dateDirection: "between", dateValue: value });
  test.each([
    ["my ancestors born in the 1700s", ChatIntent.ANCESTOR_LIST, between("BirthDate", "1700-1799")],
    ["my ancestors born in the 19th century", ChatIntent.ANCESTOR_LIST, between("BirthDate", "1800-1899")],
    ["my ancestors born between 1800 and 1850", ChatIntent.ANCESTOR_LIST, between("BirthDate", "1800-1850")],
    ["which of my ancestors died in the 1850s", ChatIntent.ANCESTOR_LIST, between("DeathDate", "1850-1859")],
    ["my grandchildren born in the 1990s", ChatIntent.DESCENDANT_LIST, between("BirthDate", "1990-1999")],
    [
      "my ancestors born in Shropshire in the 1700s",
      ChatIntent.ANCESTOR_LIST,
      { location: "Shropshire", locationField: "BirthLocation", ...between("BirthDate", "1700-1799") },
    ],
    // (Genie asks what "the 1700s" means, then resends "born 1700-1799")
    ["my ancestors born 1700-1799", ChatIntent.ANCESTOR_LIST, between("BirthDate", "1700-1799")],
    ["which of my ancestors died 1800–1850", ChatIntent.ANCESTOR_LIST, between("DeathDate", "1800-1850")],
    ["which of my ancestors have no death date", ChatIntent.ANCESTOR_LIST, { dateField: "DeathDate", dateDirection: "missing" }],
    ["my ancestors missing a date of birth", ChatIntent.ANCESTOR_LIST, { dateField: "BirthDate", dateDirection: "missing" }],
    ["which of my ancestors were alive in 1800", ChatIntent.ANCESTOR_LIST, { dateDirection: "alive", dateValue: "1800" }],
    ["my grandchildren living in 1990", ChatIntent.DESCENDANT_LIST, { dateDirection: "alive", dateValue: "1990" }],
    ["her children with no birth date", ChatIntent.DESCENDANT_LIST, { dateField: "BirthDate", dateDirection: "missing" }],
    ["my ancestors born from 1800 to 1850", ChatIntent.ANCESTOR_LIST, between("BirthDate", "1800-1850")],
    [
      "my ancestors born in Shropshire 1700-1799",
      ChatIntent.ANCESTOR_LIST,
      { location: "Shropshire", locationField: "BirthLocation", ...between("BirthDate", "1700-1799") },
    ],
    // (2026-10-18: the date first, then the place; "from" is the birth place)
    [
      "my ancestors born before 1700 in England",
      ChatIntent.ANCESTOR_LIST,
      { location: "England", locationField: "BirthLocation", dateField: "BirthDate", dateDirection: "before", dateValue: "1700" },
    ],
    ["her children born in 1850 in Kent", ChatIntent.DESCENDANT_LIST, { location: "Kent", ...between("BirthDate", "1850-1850") }],
    ["my ancestors from Ireland", ChatIntent.ANCESTOR_LIST, { location: "Ireland", locationField: "BirthLocation" }],
    ["my Irish ancestors", ChatIntent.ANCESTOR_LIST, { location: "Ireland", locationField: "BirthLocation" }],
    ["which of her Welsh-born grandchildren", ChatIntent.DESCENDANT_LIST, { location: "Wales", locationField: "BirthLocation" }],
    ["which of my ancestors came from Yorkshire", ChatIntent.ANCESTOR_LIST, { location: "Yorkshire", locationField: "BirthLocation" }],
    [
      "which of my ancestors died in Wales before 1800",
      ChatIntent.ANCESTOR_LIST,
      { location: "Wales", locationField: "DeathLocation", dateField: "DeathDate", dateDirection: "before", dateValue: "1800" },
    ],
  ])("%s", (prompt, intent, params) => {
    expect(routeChatPrompt(prompt, {})).toMatchObject({ intent, params });
  });

  test("having a date is not a filter", () => {
    expect(routeChatPrompt("which of my ancestors have a death date", {})?.params || {}).not.toHaveProperty("dateDirection");
  });

  test("the place is never a date", () => {
    expect(routeChatPrompt("my ancestors born in Kent in the 1700s", {}).params.location).toBe("Kent");
    expect(routeChatPrompt("my grandchildren born in 1990-1999", {}).params).not.toHaveProperty("location");
  });
});

// Imagined corpus AA–AB (2026-10-18): other ways to ask for the same lists.
describe("count, any, by generation, furthest back, most of", () => {
  const same = (prompt, base) => {
    const routed = routeChatPrompt(prompt, {});
    const expected = routeChatPrompt(base, {});
    expect(routed.intent).toBe(expected.intent);
    expect(routed.params).toEqual(expected.params);
  };
  test.each([
    ["count my descendants", "how many descendants do I have"],
    ["count Cook-8721's children", "how many children does Cook-8721 have"],
    ["did she have any sisters", "how many sisters did she have"],
    ["do I have any cousins", "how many cousins do I have"],
    ["who is the furthest back ancestor I have", "who is my furthest ancestor"],
    ["where were most of my ancestors born", "where were my ancestors born"],
  ])("%s", same);

  test("by generation", () => {
    expect(routeChatPrompt("list my ancestors by generation", {}).params).toMatchObject({ order: "generation" });
    expect(routeChatPrompt("my ancestors generation by generation", {}).params).toMatchObject({ order: "generation" });
  });

  test("sorted by generation, then Ahnentafel number", () => {
    const rows = [{ degrees: 2, ahnen: 5 }, { degrees: 1, ahnen: 3 }, { degrees: 2, ahnen: 4 }, {}, { degrees: 1, ahnen: 2 }];
    expect(sortByBirth(rows, "generation").map((row) => row.ahnen)).toEqual([2, 3, 4, 5, undefined]);
  });
});
