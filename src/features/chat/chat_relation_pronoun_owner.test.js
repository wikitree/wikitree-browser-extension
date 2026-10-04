jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("relation questions with a pronoun owner or past tense (E1, E2)", () => {
  test.each([
    ["who were her grandparents?", { mode: "list", relationRaw: "grandparents", subjectName: "Cook-8721" }],
    ["her siblings", { mode: "list", relationRaw: "siblings", subjectName: "Cook-8721" }],
    ["who were Calvin-12's parents?", { mode: "list", relationRaw: "parents", subjectName: "Calvin-12" }],
    ["how many siblings did she have?", { mode: "count", relationRaw: "siblings", subjectName: "Cook-8721" }],
    ["how many aunts does she have?", { mode: "count", relationRaw: "aunts", subjectName: "Cook-8721" }],
  ])("%s", (prompt, params) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.RELATION_COUNT);
    expect(routed.params).toMatchObject(params);
  });

  test("routes that already took a form keep it", () => {
    expect(routeChatPrompt("list her children").intent).toBe(ChatIntent.DESCENDANT_LIST);
    expect(routeChatPrompt("how many grandchildren did she have?").intent).toBe(ChatIntent.DESCENDANT_LIST);
  });

  test("her husband → spouse list for the profile person", () => {
    const routed = routeChatPrompt("who was her husband?");
    expect(routed.intent).toBe(ChatIntent.SPOUSE_LIST);
    expect(routed.params).toMatchObject({ target: "Cook-8721", gender: "Male" });
  });

  test("non-relations still fall through", () => {
    expect(routeChatPrompt("what was her occupation?").intent).toBe(ChatIntent.FALLBACK_AI);
  });
});

test("how old was she when she died → the profile person (E3)", () => {
  const routed = routeChatPrompt("how old was she when she died?");
  expect(routed.intent).toBe(ChatIntent.PERSON_AGE_AT_DEATH);
  expect(routed.params).toEqual({ target: "Cook-8721" });
});

describe("pronoun owner with a relation chain (F3/F10)", () => {
  test.each([
    ["who was her father's father?", "father's father"],
    ["her father's father", "father's father"],
    ["who were her husband's parents?", "husband's parents"],
    ["who was Cook-8721's father's father?", "father's father"],
  ])("%s", (prompt, relationRaw) => {
    expect(routeChatPrompt(prompt)).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: { mode: "list", relationRaw, subjectMode: "named", subjectName: "Cook-8721" },
    });
  });
});

test("how many children did her parents have (F9)", () => {
  expect(routeChatPrompt("how many children did her parents have?")).toEqual({
    intent: ChatIntent.RELATION_COUNT,
    params: { mode: "count", relationRaw: "parents's children", subjectMode: "named", subjectName: "Cook-8721" },
  });
});

describe("a descendants count is the descendant list (E7)", () => {
  test.each([
    ["how many descendants does she have?", "Cook-8721's descendants"],
    ["how many descendants does Ellen have", "Ellen's descendants"],
    ["how many descendants do I have?", "my descendants"],
  ])("%s", (prompt, subjectText) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.DESCENDANT_LIST);
    expect(routed.params).toMatchObject({ relationshipLabel: "descendants", includeUpTo: true, subjectText });
  });
});

// H4 (live, 2026-10-03): nieces/nephews and plural possessives fell to the AI.
describe("nieces, nephews and plural possessives", () => {
  test.each([
    ["who were her nieces and nephews?", "siblings's children"],
    ["her nieces", "siblings's daughters"],
    ["list Ellen's nephews", "siblings's sons"],
    ["who were her siblings' children?", "siblings's children"],
  ])("%s", (prompt, relationRaw) => {
    expect(routeChatPrompt(prompt, {})).toMatchObject({ intent: ChatIntent.RELATION_COUNT, params: { mode: "list", relationRaw } });
  });

  test("grand-nieces are left alone", () => {
    expect(routeChatPrompt("who were her grand-nieces?", {}).params?.relationRaw || "").not.toMatch(/siblings/);
  });
});

// H5 (live, 2026-10-03): the place was dropped from "how many of her
// grandchildren were born in New Zealand?".
describe("descendant lists keep a born/died-in place", () => {
  test.each([
    ["how many of her grandchildren were born in New Zealand?", 2, "New Zealand", "BirthLocation"],
    ["which of her children died in Motueka?", 1, "Motueka", "DeathLocation"],
    ["how many of Ellen's great-grandchildren were born in Nelson?", 3, "Nelson", "BirthLocation"],
    ["list her children born in Motueka", 1, "Motueka", "BirthLocation"],
  ])("%s", (prompt, generation, location, locationField) => {
    expect(routeChatPrompt(prompt, {})).toMatchObject({
      intent: ChatIntent.DESCENDANT_LIST,
      params: { generation, location, locationField },
    });
  });
});

// H9 (live, 2026-10-03): "show her family tree" was read as a table filter.
describe("family tree = ancestor list", () => {
  test.each([
    ["show her family tree", "her ancestors"],
    ["show my family tree", "my ancestors"],
    ["Ellen's pedigree", "Ellen's ancestors"],
    ["show me Lincoln-103's family tree", "Lincoln-103's ancestors"],
  ])("%s", (prompt, subjectText) => {
    expect(routeChatPrompt(prompt, {})).toMatchObject({ intent: ChatIntent.ANCESTOR_LIST, params: { subjectText } });
  });
});

// I3 (live, 2026-10-03): "what's the most common first name among her
// descendants?" — the AI declined.
describe("most common X among kin", () => {
  const { groupKinListResult } = require("./chat_group_rows");
  test.each([
    ["what's the most common first name among her descendants?", ChatIntent.DESCENDANT_LIST, "firstName"],
    ["most common surnames in my ancestors", ChatIntent.ANCESTOR_LIST, "lnab"],
    ["what are the most common birth places of Ellen's grandchildren?", ChatIntent.DESCENDANT_LIST, "birthLocation"],
  ])("%s", (prompt, intent, groupBy) => {
    expect(routeChatPrompt(prompt, {})).toMatchObject({ intent, params: { groupBy } });
  });

  test("a place search keeps its own route", () => {
    expect(routeChatPrompt("most common surnames in Shropshire before 1800", {}).params?.groupBy).toBeUndefined();
  });

  test("groups the list rows", () => {
    const result = groupKinListResult(
      { message: "Here are descendants…", table: { title: "Descendants", rows: [{ firstName: "John" }, { firstName: "Mary" }, { firstName: "John" }] } },
      "firstName"
    );
    expect(result.message).toMatch(/^3 profiles by first name \(2 groups\):\n- John: 2\n- Mary: 1/);
    expect(groupKinListResult("I found no descendants.", "firstName")).toBe("I found no descendants.");
  });
});

describe("K6 in-laws as chains", () => {
  const { rewriteInLawTerms } = require("./chat_relation_chain_text");
  const { routeChatPrompt } = require("./chat_router");
  test("rewrites", () => {
    expect(rewriteInLawTerms("who was her mother-in-law?")).toBe("who was her spouse's mother?");
    expect(rewriteInLawTerms("her parents in law")).toBe("her spouse's parents");
    expect(rewriteInLawTerms("list his sons-in-law")).toBe("list his children's husbands");
    expect(rewriteInLawTerms("her daughter-in-law")).toBe("her children's wives");
    expect(rewriteInLawTerms("her brother-in-law")).toBe("her brother-in-law");
  });
  test("routes as a relation chain", () => {
    const routed = routeChatPrompt("who was her father-in-law?");
    expect(routed.params.relationRaw).toBe("spouse's father");
  });
});

describe("L3 'how many / which of them …' reuse the local filters", () => {
  test.each([
    ["how many of them died before 1900?", { kind: "deathDate", direction: "before", value: "1900" }],
    ["which of them were born in Motueka?", { kind: "birthLocation", value: "Motueka" }],
    ["how many of them are women?", { kind: "gender", value: "Female" }],
  ])("%s", (prompt, filter) => {
    const routed = routeChatPrompt(prompt, { hasStructuredResult: true });
    expect(routed.intent).toBe(ChatIntent.LAST_RESULT_OPERATION);
    expect(routed.params.filter).toEqual(filter);
  });
  test("an unparsed remainder is not a text filter", () => {
    expect(routeChatPrompt("which of them had the most children?", { hasStructuredResult: true }).intent).not.toBe(
      ChatIntent.LAST_RESULT_OPERATION
    );
  });
});

describe("M2 girls/boys/sons/daughters as gender filters", () => {
  test.each([
    ["only the girls", "Female"],
    ["just the boys", "Male"],
    ["only the daughters", "Female"],
    ["sons only", "Male"],
  ])("%s", (prompt, value) => {
    expect(routeChatPrompt(prompt, { hasStructuredResult: true }).params.filter).toEqual({ kind: "gender", value });
  });
});

describe("N1 great-grandparents without list/show", () => {
  test.each([
    ["who were her great-grandparents?", 3],
    ["her great grandparents", 3],
    ["who were my great great grandparents?", 4],
    ["list her great-great-grandparents", 4],
  ])("%s", (prompt, generation) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routed.params.generation).toBe(generation);
  });
  test("plain grandparents keep the relation route", () => {
    expect(routeChatPrompt("who were her grandparents?").intent).toBe(ChatIntent.RELATION_COUNT);
  });
});

describe("O10 ancestors born/died in a place", () => {
  test.each([
    ["how many of my ancestors died in Wales?", "Wales", "DeathLocation", 10],
    ["how many of her ancestors were born in England?", "England", "BirthLocation", 10],
    ["how many of my great-grandparents were born in Shropshire?", "Shropshire", "BirthLocation", 3],
  ])("%s", (prompt, location, locationField, generation) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routed.params).toEqual(expect.objectContaining({ location, locationField, generation }));
  });
});

describe("O6 earliest known ancestor without a place", () => {
  test.each([
    ["who is my earliest known ancestor?", "earliest"],
    ["her oldest ancestor", "earliest"],
    ["my most recent ancestor", "recent"],
  ])("%s", (prompt, pick) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routed.params.pick).toBe(pick);
    expect(routed.params.location).toBeUndefined();
  });
});

describe("O10 list/show forms", () => {
  test.each(["list my ancestors who died in Wales", "list my ancestors born in Wales", "show my ancestors who died in Wales"])("%s", (prompt) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routed.params.location).toBe("Wales");
  });
});

describe("P5 'the relationship between X and Y' is a connection", () => {
  test("named source and target", () => {
    expect(routeChatPrompt("what is the relationship between Ellen and Amy Alley?")).toEqual({
      intent: ChatIntent.CONNECTION_LOOKUP,
      params: { target: "Amy Alley", source: "Ellen" },
    });
  });
});

describe("kin lists with a before/after year (R6)", () => {
  test.each([
    ["how many of her children died before 1900?", ChatIntent.DESCENDANT_LIST, { generation: 1, dateField: "DeathDate", dateDirection: "before", dateValue: "1900" }],
    ["her children who were born after 1860", ChatIntent.DESCENDANT_LIST, { generation: 1, dateField: "BirthDate", dateDirection: "after", dateValue: "1860" }],
    ["list her grandchildren born before 1880", ChatIntent.DESCENDANT_LIST, { generation: 2, dateField: "BirthDate", dateDirection: "before", dateValue: "1880" }],
    ["which of my ancestors were born after 1800?", ChatIntent.ANCESTOR_LIST, { dateField: "BirthDate", dateDirection: "after", dateValue: "1800" }],
  ])("%s", (prompt, intent, params) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(intent);
    expect(routed.params).toMatchObject(params);
  });
});

test("S1: a relative's age at death is RELATIVE_FACT, not a name search", () => {
  expect(routeChatPrompt("how old was her second husband when he died?")).toEqual({
    intent: ChatIntent.RELATIVE_FACT,
    params: { owner: "", relationRaw: "husband", fact: "ageAtDeath", ordinal: 2 },
  });
  expect(routeChatPrompt("how old was Charles Alley when he died?").intent).toBe(ChatIntent.PERSON_AGE_AT_DEATH);
});

test("S7: 'her children with their spouses' is the children's spouses chain", () => {
  expect(routeChatPrompt("list her children with their spouses")).toEqual(routeChatPrompt("list her children's spouses"));
  expect(routeChatPrompt("list her children with their spouses").params).toMatchObject({ relationRaw: "children's spouses" });
});
