jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: { getPerson: jest.fn() } }));

import { ChatIntent, routeChatPrompt } from "./chat_router";
import { createChatPeopleHandlers } from "./chat_people";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";

// Live C14, 2026-10-03: WT+ said it couldn't search for this.
describe("age at a child's birth", () => {
  test.each([
    ["how old was she when her first child was born?", { target: "she", which: "first", childGender: "" }],
    ["How old was Ellen when she had her last baby?", { target: "Ellen", which: "last", childGender: "" }],
    ["how old was Smith-12 when his eldest son was born", { target: "Smith-12", which: "first", childGender: "Male" }],
    ["how old was she when Cook-8721's first child was born?", { target: "Cook-8721", which: "first", childGender: "" }],
    ["her age at her first child's birth", { target: "her", which: "first", childGender: "" }],
  ])("routes %s", (prompt, params) => {
    const routed = routeChatPrompt(prompt, {});
    expect(routed.intent).toBe(ChatIntent.PERSON_AGE_AT_CHILD_BIRTH);
    expect(routed.params).toEqual(params);
  });

  const ellen = {
    Name: "Cook-8721",
    RealName: "Ellen",
    Gender: "Female",
    BirthDate: "1832-00-00",
    Children: {
      1: { Name: "Burton-10394", RealName: "Christina", Gender: "Female", BirthDate: "1851-03-17" },
      2: { Name: "Alley-3099", RealName: "Amy", Gender: "Female", BirthDate: "1876-00-00" },
      3: { Name: "Burton-14410", RealName: "George", Gender: "Male", BirthDate: "1852-00-00" },
      4: { Name: "X-1", RealName: "Nodate", Gender: "Male", BirthDate: "0000-00-00" },
    },
  };
  const make = (person) => {
    WikiTreeAPI.getPerson.mockImplementation(async () => person);
    return createChatPeopleHandlers({
      ChatIntent,
      WBE_CHAT_APP_ID: "test",
      getProfileSubjectRoot: () => ({ key: "7708071", wtId: "Cook-8721" }),
      resolveConnectionTargetPerson: jest.fn(async () => ({ Name: "Cook-8721" })),
      isPartialDate: (d) => /-00/.test(d),
      computeAgeAtDeathYears: (b, d) => Number(d.slice(0, 4)) - Number(b.slice(0, 4)),
    }).tryHandlePersonAgeAtChildBirthPrompt;
  };

  const run = (prompt, person = ellen) => make(person)(routeChatPrompt(prompt, {}).params, prompt);

  test("first child, year-only birth gives two ages", async () => {
    expect(await run("how old was she when her first child was born?")).toBe(
      "Ellen (Cook-8721) was 18 or 19 when her first child, Christina (Burton-10394), was born (1851-03-17)."
    );
  });

  test("last child", async () => {
    expect(await run("how old was she when her last child was born?")).toMatch(/43 or 44 when her last child, Amy/);
  });

  test("first son", async () => {
    expect(await run("how old was she when her first son was born?")).toMatch(/first son, George \(Burton-14410\)/);
  });

  // Live G5, 2026-10-03: WikiTreeAPI.getPerson wraps the person and each child in a Person ({_data}).
  test("reads children wrapped as Person objects", async () => {
    const wrap = (data) => ({ _data: data });
    const children = Object.fromEntries(Object.entries(ellen.Children).map(([k, c]) => [k, wrap(c)]));
    expect(await run("how old was she when her first child was born?", wrap({ ...ellen, Children: children }))).toMatch(
      /18 or 19 when her first child, Christina/
    );
  });

  test("no birth date", async () => {
    expect(await run("how old was she when her first child was born?", { ...ellen, BirthDate: "0000-00-00" })).toMatch(
      /has no birth date on WikiTree/
    );
  });
});
