jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { buildAgeComparisonAnswer, buildRelativeFactAnswer, parseRelativeFactPrompt, relationSelector } from "./chat_relative_fact";
import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("parseRelativeFactPrompt", () => {
  test.each([
    ["what was her mother's maiden name?", { owner: "", relationRaw: "mother", fact: "maidenName" }],
    ["What is Cook-8721's father's birth date", { owner: "Cook-8721", relationRaw: "father", fact: "birth" }],
    ["my mother's maiden name", { owner: "me", relationRaw: "mother", fact: "maidenName" }],
    ["when was her husband born?", { owner: "", relationRaw: "husband", fact: "birth" }],
    ["where did his father die", { owner: "", relationRaw: "father", fact: "deathPlace" }],
    ["when did Ellen Cook's children die", { owner: "Ellen Cook", relationRaw: "children", fact: "death" }],
    ["what were her sisters' birth places", { owner: "", relationRaw: "sisters", fact: "birthPlace" }],
  ])("%s", (prompt, expected) => {
    expect(parseRelativeFactPrompt(prompt)).toEqual(expected);
  });

  test.each(["what was her mother's favourite song", "her mother's children", "when was the old man's son born"])(
    "declines %s",
    (prompt) => {
      expect(parseRelativeFactPrompt(prompt)).toBeNull();
    }
  );
});

describe("relationSelector", () => {
  test("maps relation words to a list and gender", () => {
    expect(relationSelector("mother")).toEqual({ list: "Parents", gender: "Female" });
    expect(relationSelector("husband")).toEqual({ list: "Spouses", gender: "Male" });
    expect(relationSelector("children")).toEqual({ list: "Children", gender: "" });
    expect(relationSelector("sisters")).toEqual({ list: "Siblings", gender: "Female" });
  });
});

describe("buildRelativeFactAnswer", () => {
  const nameOf = (person) => `${person.RealName} (${person.Name})`;
  test("one person, maiden name", () => {
    expect(
      buildRelativeFactAnswer([{ RealName: "Hannah", Name: "Hutton-734", LastNameAtBirth: "Hutton" }], "maidenName", nameOf)
    ).toBe("Hannah (Hutton-734): last name at birth Hutton.");
  });
  test("a place reads as a sentence", () => {
    const martha = { RealName: "Martha", Name: "Teece-118", BirthLocation: "Wrockwardine, Shropshire", DeathLocation: "Birkenhead" };
    expect(buildRelativeFactAnswer([martha], "birthPlace", nameOf)).toBe("Martha (Teece-118) was born in Wrockwardine, Shropshire.");
    expect(buildRelativeFactAnswer([martha], "deathPlace", nameOf)).toBe("Martha (Teece-118) died in Birkenhead.");
    expect(buildRelativeFactAnswer([{ RealName: "B", Name: "B-2" }], "birthPlace", nameOf)).toBe("B (B-2): no birth place recorded.");
  });
  test("several people, birth, one missing", () => {
    const answer = buildRelativeFactAnswer(
      [
        { RealName: "A", Name: "A-1", BirthDate: "1850-03-17", BirthLocation: "Kent" },
        { RealName: "B", Name: "B-2", BirthDate: "0000-00-00" },
      ],
      "birth",
      nameOf
    );
    expect(answer).toMatch(/^- A \(A-1\) was born .*1850.* in Kent\n- B \(B-2\): no birth recorded$/);
  });
});

describe("routing", () => {
  test.each(["what was her mother's maiden name?", "when was her husband born?"])("%s", (prompt) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.RELATIVE_FACT);
  });
});

describe("the person's own fact (F1/F12)", () => {
  test.each([
    ["where was she born?", { owner: "", relationRaw: "self", fact: "birthPlace" }],
    ["when did Ellen Cook die", { owner: "Ellen Cook", relationRaw: "self", fact: "death" }],
    ["where did she die?", { owner: "", relationRaw: "self", fact: "deathPlace" }],
    ["when was Cook-8721 born", { owner: "Cook-8721", relationRaw: "self", fact: "birth" }],
    ["what was her maiden name?", { owner: "", relationRaw: "self", fact: "maidenName" }],
    ["Cook-8721's birth name", { owner: "Cook-8721", relationRaw: "self", fact: "maidenName" }],
    ["when was I born", { owner: "me", relationRaw: "self", fact: "birth" }],
  ])("%s", (prompt, expected) => {
    expect(parseRelativeFactPrompt(prompt)).toEqual(expected);
  });
  test.each(["when was the war born", "where did the people die"])("declines %s", (prompt) => {
    expect(parseRelativeFactPrompt(prompt)).toBeNull();
  });
  test("routes", () => {
    expect(routeChatPrompt("where was she born?").intent).toBe(ChatIntent.RELATIVE_FACT);
  });
});

describe("age comparison (G3)", () => {
  test.each([
    ["was she older than her husband?", { owner: "", relationRaw: "husband", fact: "older" }],
    ["was Cook-8721 younger than her husband", { owner: "Cook-8721", relationRaw: "husband", fact: "younger" }],
  ])("%s", (prompt, expected) => {
    expect(parseRelativeFactPrompt(prompt)).toEqual(expected);
  });
  test("answers per husband", () => {
    const labelOf = (person) => person.Name;
    const answer = buildAgeComparisonAnswer(
      { Name: "Cook-8721", BirthDate: "1832-06-10" },
      [
        { Name: "Burton-13215", BirthDate: "1829-00-00" },
        { Name: "Alley-2359", BirthDate: "1831-00-00" },
      ],
      "older",
      labelOf
    );
    expect(answer).toBe(
      "Cook-8721 was born 1832-06-10.\n- No — Burton-13215 (b. 1829) was older by about 3 years\n- No — Alley-2359 (b. 1831) was older by about 1 year"
    );
  });
});

// Live, 2026-10-03: "when did her husband die?" answered "William (Burton-13215)
// was died 1859-02-27…".
describe("death wording and full names", () => {
  test("died, not 'was died'; ShortName over RealName", () => {
    const { relativeNameOf } = require("./chat_people");
    const answer = buildRelativeFactAnswer(
      [{ Name: "Burton-13215", RealName: "William", ShortName: "William Burton", DeathDate: "1859-02-27", DeathLocation: "Wairau river, New Zealand" }],
      "death",
      relativeNameOf
    );
    expect(answer).toBe("William Burton (Burton-13215) died 1859-02-27 in Wairau river, New Zealand.");
  });
});

// H1 (live, 2026-10-03): "what was her husband's name?" went to the AI.
describe("a relative's name (H1)", () => {
  test.each([
    ["what was her husband's name?", { owner: "", relationRaw: "husband", fact: "name" }],
    ["what were her children's names?", { owner: "", relationRaw: "children", fact: "name" }],
    ["what is my father's name", { owner: "me", relationRaw: "father", fact: "name" }],
  ])("%s", (prompt, expected) => {
    expect(parseRelativeFactPrompt(prompt)).toEqual(expected);
  });

  test("lists the labels", () => {
    const labelOf = (person) => `${person.ShortName} (${person.Name})`;
    const people = [
      { Name: "Burton-13215", ShortName: "William Burton" },
      { Name: "Alley-2359", ShortName: "Charles Alley" },
    ];
    expect(buildRelativeFactAnswer(people.slice(0, 1), "name", labelOf)).toBe("William Burton (Burton-13215).");
    expect(buildRelativeFactAnswer(people, "name", labelOf)).toBe("- William Burton (Burton-13215)\n- Charles Alley (Alley-2359)");
  });
});

describe("N4 grandparents' facts", () => {
  const { parseRelativeFactPrompt, relationSelector } = require("./chat_relative_fact");
  test("parses", () => {
    expect(parseRelativeFactPrompt("where were her grandparents born?")).toEqual({ owner: "", relationRaw: "grandparents", fact: "birthPlace" });
    expect(parseRelativeFactPrompt("when did his grandfather die?")).toEqual({ owner: "", relationRaw: "grandfather", fact: "death" });
  });
  test("selects parents twice", () => {
    expect(relationSelector("grandmother")).toEqual({ list: "Parents", gender: "Female", grand: true });
    expect(relationSelector("grandparents")).toEqual({ list: "Parents", gender: "", grand: true });
  });
});

describe("relative age at death and age gap (S1, S9)", () => {
  const { parseRelativeAgePrompt, buildRelativeAgeAtDeathAnswer, buildAgeGapAnswer } = require("./chat_relative_fact");
  const labelOf = (person) => `${person.RealName} (${person.Name})`;

  test.each([
    ["how old was her second husband when he died?", { owner: "", relationRaw: "husband", fact: "ageAtDeath", ordinal: 2 }],
    ["how old was her mother when she died?", { owner: "", relationRaw: "mother", fact: "ageAtDeath" }],
    ["at what age did Cook-8721's father die?", { owner: "Cook-8721", relationRaw: "father", fact: "ageAtDeath" }],
    ["what was the age gap between her and her first husband?", { owner: "", relationRaw: "husband", fact: "ageGap", ordinal: 1 }],
    ["the age difference between Ellen and her last husband", { owner: "Ellen", relationRaw: "husband", fact: "ageGap", ordinal: "last" }],
  ])("%s", (prompt, params) => expect(parseRelativeAgePrompt(prompt)).toEqual(params));

  test.each(["how old was she when she died?", "how old was her second son when he died?", "what was the age gap between her children?"])(
    "declines %s",
    (prompt) => expect(parseRelativeAgePrompt(prompt)).toBeNull()
  );

  test("answers", () => {
    const charles = { Name: "Alley-2359", RealName: "Charles", BirthDate: "1831-00-00", DeathDate: "1880-10-08" };
    expect(buildRelativeAgeAtDeathAnswer([charles], labelOf)).toMatch(/^Charles \(Alley-2359\) died aged about 49 \(1831–/);
    const ellen = { Name: "Cook-8721", RealName: "Ellen", BirthDate: "1832-00-00" };
    const william = { Name: "Burton-13215", RealName: "William", BirthDate: "1829-00-00" };
    expect(buildAgeGapAnswer(ellen, [william], labelOf)).toBe(
      "William (Burton-13215) (b. 1829) was about 3 years older than Ellen (Cook-8721) (b. 1832)."
    );
  });
});
