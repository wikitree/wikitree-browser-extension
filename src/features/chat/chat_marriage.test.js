jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { buildMarriageAnswer, buildMarriageTimingAnswer, parseMarriagePrompt, yearsBetween } from "./chat_marriage";
import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("parseMarriagePrompt", () => {
  test.each([
    ["when did her parents marry?", { target: "", parents: true }],
    ["where did Cook-8721's parents get married", { target: "Cook-8721", parents: true }],
    ["when were my parents married?", { target: "me", parents: true }],
    ["her parents' marriage date", { target: "", parents: true }],
    ["when did she marry?", { target: "", parents: false }],
    ["when and where did Ellen Cook get married", { target: "Ellen Cook", parents: false }],
    ["when was Cook-8721 married", { target: "Cook-8721", parents: false }],
    ["Ellen's marriages", { target: "Ellen", parents: false }],
  ])("%s", (prompt, expected) => {
    expect(parseMarriagePrompt(prompt)).toEqual(expected);
  });

  test("not a marriage question", () => {
    expect(parseMarriagePrompt("when did the war end")).toBeNull();
    expect(parseMarriagePrompt("George Beacall married Margaret")).toBeNull();
  });

  test("routes to PERSON_MARRIAGE", () => {
    expect(routeChatPrompt("when did her parents marry?").intent).toBe(ChatIntent.PERSON_MARRIAGE);
  });
});

describe("buildMarriageAnswer", () => {
  test("parents: date and place (Cook-8720 + Hutton-734, live 2026-10-03)", () => {
    expect(
      buildMarriageAnswer({
        personLabel: "James Cook (Cook-8720)",
        marriages: [
          { spouseLabel: "Hannah Hutton (Hutton-734)", date: "1827-00-00", location: "Binstead, Hampshire, England" },
        ],
        parents: true,
      })
    ).toBe("James Cook (Cook-8720) and Hannah Hutton (Hutton-734) married in 1827 in Binstead, Hampshire, England.");
  });

  test("parents not linked as spouses", () => {
    expect(
      buildMarriageAnswer({ personLabel: "A (A-1)", marriages: [], parents: true, otherParentLabel: "B (B-1)" })
    ).toMatch(/doesn't link A \(A-1\) and B \(B-1\)/);
  });

  test("a person's marriages, one undated", () => {
    const answer = buildMarriageAnswer({
      personLabel: "Ellen (Cook-8721)",
      marriages: [
        { spouseLabel: "William (Burton-13215)", date: "1850-00-00", location: "" },
        { spouseLabel: "Charles (Alley-2359)", date: "", location: "" },
      ],
    });
    expect(answer).toBe(
      "Ellen (Cook-8721) has 2 recorded marriages:\n- William (Burton-13215): married in 1850\n- Charles (Alley-2359): no marriage date or place recorded"
    );
  });
});

describe("marriage timing (G4/G6)", () => {
  test.each([
    ["how old was she when she married?", { target: "", parents: false, ask: "age" }],
    ["how old was she when she married her second husband?", { target: "", parents: false, ask: "age", ordinal: 2 }],
    ["how old was Ellen Cook when she got married", { target: "Ellen Cook", parents: false, ask: "age" }],
    ["at what age did Cook-8721 marry", { target: "Cook-8721", parents: false, ask: "age" }],
    ["how long were they married?", { target: "", parents: false, ask: "duration" }],
    ["how many years was she married to her first husband", { target: "", parents: false, ask: "duration", ordinal: 1 }],
  ])("%s", (prompt, expected) => {
    expect(parseMarriagePrompt(prompt)).toEqual(expected);
  });

  test("yearsBetween", () => {
    expect(yearsBetween("1832-06-10", "1852-06-09")).toEqual({ years: 19, approx: false });
    expect(yearsBetween("1832-06-10", "1852-00-00")).toEqual({ years: 20, approx: true });
    expect(yearsBetween("0000-00-00", "1852-00-00")).toBeNull();
  });

  const person = { label: "Ellen (Cook-8721)", gender: "Female", birth: "1832-06-10", death: "1898-01-01" };
  const marriages = [
    { spouseLabel: "William (Burton-13215)", date: "1850-07-01", spouseDeath: "1859-00-00", endDate: "" },
    { spouseLabel: "Charles (Alley-2359)", date: "1860-00-00", spouseDeath: "1880-05-05", endDate: "" },
  ];
  test("age, second husband", () => {
    expect(buildMarriageTimingAnswer({ person, marriages, ask: "age", ordinal: 2 })).toBe(
      "Ellen (Cook-8721) was about 28 when she married Charles (Alley-2359) (1860)."
    );
  });
  test("duration, all marriages", () => {
    const answer = buildMarriageTimingAnswer({ person, marriages, ask: "duration" });
    expect(answer).toMatch(/^- Ellen \(Cook-8721\) and William \(Burton-13215\) were married about 9 years .*until William \(Burton-13215\) died\)\.\n- .*Charles \(Alley-2359\) were married about 20 years/);
  });
  test("no such spouse", () => {
    expect(buildMarriageTimingAnswer({ person, marriages, ask: "age", ordinal: 3 })).toMatch(/has 2 recorded marriages, so there is no such spouse/);
  });
});

describe("widowhood (G8)", () => {
  test("parses", () => {
    expect(parseMarriagePrompt("how many years was she a widow?")).toEqual({ target: "", parents: false, ask: "widowed" });
    expect(parseMarriagePrompt("how long was Cook-8721 widowed")).toEqual({ target: "Cook-8721", parents: false, ask: "widowed" });
  });
  const person = { label: "Ellen (Cook-8721)", gender: "Female", birth: "1832-06-10", death: "1898-00-00" };
  test("two spells", () => {
    const marriages = [
      { spouseLabel: "William (Burton-13215)", date: "1850-07-01", spouseDeath: "1859-00-00", endDate: "" },
      { spouseLabel: "Charles (Alley-2359)", date: "1860-00-00", spouseDeath: "1880-00-00", endDate: "" },
    ];
    expect(buildMarriageTimingAnswer({ person, marriages, ask: "widowed" })).toBe(
      "Ellen (Cook-8721) was a widow for:\n- about 1 year after William (Burton-13215) died (1859 – 1860, until marrying Charles (Alley-2359))\n- about 18 years after Charles (Alley-2359) died (1880 – 1898, until Ellen's death)"
    );
  });
  test("spouse outlived her", () => {
    const marriages = [{ spouseLabel: "C (C-1)", date: "1860-00-00", spouseDeath: "1900-00-00", endDate: "" }];
    expect(buildMarriageTimingAnswer({ person, marriages, ask: "widowed" })).toBe(
      "Going by the recorded dates, Ellen (Cook-8721) wasn't left a widow."
    );
  });
});
