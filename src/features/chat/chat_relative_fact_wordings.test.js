jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Weatherall-111" })) }));

import { buildAgeAtOwnerBirthAnswer, buildRelativeFactAnswer, parseRelativeAgePrompt, parseRelativeFactPrompt } from "./chat_relative_fact";
import { ChatIntent, routeChatPrompt } from "./chat_router";

// More ways of asking about a family member (user, 2026-10-10).
describe("relative fact wordings", () => {
  test.each([
    ["where was his father from?", { relationRaw: "father", fact: "birthPlace" }],
    ["where did his father come from", { relationRaw: "father", fact: "birthPlace" }],
    ["when did his mother pass away?", { relationRaw: "mother", fact: "death" }],
    ["when and where was his father born?", { relationRaw: "father", fact: "birth" }],
    ["what year was his father born?", { relationRaw: "father", fact: "birth" }],
    ["in what year did her mother die?", { relationRaw: "mother", fact: "death" }],
    ["which county was his dad born in?", { relationRaw: "father", fact: "birthPlace" }],
    ["when was his mum born?", { relationRaw: "mother", fact: "birth" }],
    ["where were his kids born", { relationRaw: "children", fact: "birthPlace" }],
    ["birthplace of his mother", { relationRaw: "mother", fact: "birthPlace" }],
    ["the date of death of her husband", { relationRaw: "husband", fact: "death" }],
    ["his mother's dates", { relationRaw: "mother", fact: "dates" }],
    ["her father's birth and death", { relationRaw: "father", fact: "dates" }],
    ["where was his paternal grandfather born?", { relationRaw: "grandfather", fact: "birthPlace", side: "Male" }],
    ["where were her maternal grandparents born", { relationRaw: "grandparents", fact: "birthPlace", side: "Female" }],
    ["where was his son John born?", { relationRaw: "son", fact: "birthPlace", named: "John" }],
    ["his daughter Mary's birthplace", { relationRaw: "daughter", fact: "birthPlace", named: "Mary" }],
    ["when was his eldest son born?", { relationRaw: "son", fact: "birth", rank: 1 }],
    ["where did her youngest sister die", { relationRaw: "sister", fact: "deathPlace", rank: "last" }],
    ["where was his first wife born", { relationRaw: "wife", fact: "birthPlace", ordinal: 1 }],
    ["where was his wife's father born?", { relationRaw: "father", fact: "birthPlace", via: "wife" }],
    ["when did her husband's mother die", { relationRaw: "mother", fact: "death", via: "husband" }],
  ])("%s", (prompt, expected) => {
    expect(parseRelativeFactPrompt(prompt)).toEqual({ owner: "", ...expected });
  });

  test.each([
    "where was his son john born", // a name must be capitalised
    "where was his paternal son born",
    "when was his eldest wife born",
    "where was his grandmother's father born", // two steps too far
    "where is his father buried", // not in the data
  ])("declines %s", (prompt) => {
    expect(parseRelativeFactPrompt(prompt)).toBeNull();
  });

  test("routes", () => {
    for (const prompt of ["where was his dad from?", "when was his eldest son born?", "where was his wife's father born?"]) {
      expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.RELATIVE_FACT);
    }
  });

  test("dates answer", () => {
    const nameOf = (p) => p.Name;
    expect(
      buildRelativeFactAnswer([{ Name: "A-1", BirthDate: "1850-00-00", BirthLocation: "Kent", DeathDate: "1900-00-00" }], "dates", nameOf)
    ).toMatch(/^A-1 was born .*1850.* in Kent and died .*1900.*\.$/);
    expect(buildRelativeFactAnswer([{ Name: "B-2" }], "dates", nameOf)).toBe("B-2: no dates recorded.");
  });

  test("a parent's age when the person was born", () => {
    expect(parseRelativeAgePrompt("how old was his mother when he was born?")).toEqual({
      owner: "",
      relationRaw: "mother",
      fact: "ageAtOwnerBirth",
    });
    expect(parseRelativeAgePrompt("how old was his dad when he died")).toMatchObject({ relationRaw: "father", fact: "ageAtDeath" });
    const nameOf = (p) => p.Name;
    expect(buildAgeAtOwnerBirthAnswer({ Name: "Kid-1", BirthDate: "1898-07-04" }, [{ Name: "Mum-1", BirthDate: "1870-09-01" }], nameOf)).toMatch(
      /^Mum-1 \(b\. .*1870.*\) was 27 when Kid-1 was born/
    );
  });
});

describe("relative fact handler extras", () => {
  const people = {
    // Weatherall-111's family
    1: { Id: 1, Name: "Weatherall-111", BirthDate: "1898-07-04" },
    2: { Id: 2, Name: "Dad-2", Gender: "Male", BirthDate: "1860-00-00", BirthLocation: "Leeds" },
    3: { Id: 3, Name: "Mum-3", Gender: "Female", BirthDate: "1870-09-01", BirthLocation: "York" },
    4: { Id: 4, Name: "Son-4", FirstName: "John", Gender: "Male", BirthDate: "1925-00-00", BirthLocation: "Hull" },
    5: { Id: 5, Name: "Son-5", FirstName: "Peter", Gender: "Male", BirthDate: "1920-00-00", BirthLocation: "Bath" },
    6: { Id: 6, Name: "Wife-6", Gender: "Female" },
    7: { Id: 7, Name: "InLaw-7", Gender: "Male", BirthLocation: "Kent" },
    8: { Id: 8, Name: "PGF-8", Gender: "Male", BirthLocation: "Ripon" },
    9: { Id: 9, Name: "MGF-9", Gender: "Male", BirthLocation: "Selby" },
  };
  const links = { 1: { Parents: [2, 3], Children: [4, 5], Spouses: [6] }, 6: { Parents: [7] }, 2: { Parents: [8] }, 3: { Parents: [9] } };
  const getRelatives = jest.fn(async (_app, keys, _fields, options) => {
    const list = Object.keys(options)[0].replace(/^get/, "");
    const ids = (Array.isArray(keys) ? keys : [keys]).map((key) => (key === "Weatherall-111" ? 1 : Number(key)));
    return ids.map((id) => ({
      person: { ...people[id], [list]: Object.fromEntries((links[id]?.[list] || []).map((rid) => [rid, people[rid]])) },
    }));
  });
  let handlers;
  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: { getRelatives } }));
    const { createChatPeopleHandlers } = require("./chat_people");
    const { ChatIntent: Intents } = require("./chat_router");
    handlers = createChatPeopleHandlers({
      ChatIntent: Intents,
      WBE_CHAT_APP_ID: "test",
      getProfileSubjectRoot: () => ({ key: "Weatherall-111", wtId: "Weatherall-111" }),
      getLoggedInRootPerson: async () => null,
    });
  });
  const ask = (prompt) => handlers.tryHandleRelativeFactPrompt(routeChatPrompt(prompt).params, prompt);

  test("named, eldest, in-law, paternal side, age at birth", async () => {
    expect(await ask("where was his son John born?")).toMatch(/Son-4.*born in Hull/);
    expect(await ask("where was his son Fred born?")).toMatch(/no son called Fred/);
    expect(await ask("where was his eldest son born?")).toMatch(/Son-5.*born in Bath/);
    expect(await ask("where was his youngest son born?")).toMatch(/Son-4.*born in Hull/);
    expect(await ask("where was his wife's father born?")).toMatch(/InLaw-7.*born in Kent/);
    expect(await ask("where was his paternal grandfather born?")).toMatch(/PGF-8.*Ripon/);
    expect(await ask("where was his paternal grandfather born?")).not.toMatch(/MGF-9/);
    expect(await ask("how old was his mother when he was born?")).toMatch(/Mum-3.*was 27 when/);
  });
});
