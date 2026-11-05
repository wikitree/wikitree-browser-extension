jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { ChatIntent, routeChatPrompt } from "./chat_router";
import { ageAtDeath, buildResultPickAnswer, parseResultPickPrompt } from "./chat_result_pick";

const rows = [
  { displayName: "Fanny Alley", wtid: "Alley-2360", birth: "1861-05-20", death: "1865-05-27" },
  { displayName: "Henry Alley", wtid: "Alley-2361", birth: "1863-05-11", death: "1865-06-16" },
  { displayName: "Rose Alley", wtid: "Alley-3097", birth: "1865-06-23", death: "1950" },
  { displayName: "Amy Alley", wtid: "Alley-3099", birth: "1876", death: "" },
];

describe("L4 picks from the current result", () => {
  test.each([
    ["who among them lived longest?", "longest"],
    ["which of them lived the longest", "longest"],
    ["who died youngest?", "shortest"],
    ["who of them was born first?", "bornFirst"],
    ["which one died last?", "diedLast"],
  ])("%s", (prompt, pick) => {
    expect(parseResultPickPrompt(prompt)).toEqual({ action: "pick", pick });
    const routed = routeChatPrompt(prompt, { hasStructuredResult: true });
    expect(routed.intent).toBe(ChatIntent.LAST_RESULT_OPERATION);
    expect(routed.params.pick).toBe(pick);
  });
  test("ages use full dates when both are known", () => {
    expect(ageAtDeath("1861-05-20", "1865-05-27")).toEqual({ years: 4, exact: true });
    expect(ageAtDeath("1863-05-11", "1865-05-10")).toEqual({ years: 1, exact: true });
    expect(ageAtDeath("1865-06-23", "1950")).toEqual({ years: 85, exact: false });
  });
  test("longest names the person, with the undated left out", () => {
    expect(buildResultPickAnswer(rows, "longest")).toBe(
      "Rose Alley (Alley-3097), about 85 years (1865-06-23–1950) lived longest (of the 3 of 4 with both a birth and a death date)."
    );
  });
  test("born last uses the birth date", () => {
    expect(buildResultPickAnswer(rows, "bornLast")).toMatch(/^Amy Alley \(Alley-3099\) \(1876\) was born last\.$/);
  });
});

describe("L10 the oldest / youngest", () => {
  test("routes to a pick, not a text filter", () => {
    const routed = routeChatPrompt("show the oldest one", { hasStructuredResult: true });
    expect(routed.params).toEqual({ action: "pick", pick: "oldest" });
    expect(parseResultPickPrompt("who was the youngest of them?")).toEqual({ action: "pick", pick: "youngest" });
  });
  test("answers both readings", () => {
    const answer = buildResultPickAnswer(rows, "oldest");
    expect(answer).toMatch(/^"Oldest" can mean two things:\n- Fanny Alley .* was born first\.\n- Rose Alley .* lived longest/);
  });
});
