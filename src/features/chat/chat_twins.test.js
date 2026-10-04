jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { buildTwinsAnswer, parseTwinsPrompt } from "./chat_twins";
import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("parseTwinsPrompt", () => {
  test.each([
    ["did she have any twins?", { target: "" }],
    ["does Cook-8721 have twins", { target: "Cook-8721" }],
    ["did I have twins", { target: "me" }],
    ["were any of her children twins?", { target: "" }],
    ["are there any triplets among Ellen Cook's children", { target: "Ellen Cook" }],
  ])("%s", (prompt, expected) => {
    expect(parseTwinsPrompt(prompt)).toEqual(expected);
  });
  test.each(["did she have any children", "twins born in Kent", "did the man have twins"])("declines %s", (prompt) => {
    expect(parseTwinsPrompt(prompt)).toBeNull();
  });
  test("routes", () => {
    expect(routeChatPrompt("did she have any twins?").intent).toBe(ChatIntent.CHILD_TWINS);
  });
});

describe("buildTwinsAnswer", () => {
  const nameOf = (person) => person.Name;
  test("twins by shared full date", () => {
    const answer = buildTwinsAnswer(
      "Ellen",
      [
        { Name: "A-1", BirthDate: "1860-05-02" },
        { Name: "A-2", BirthDate: "1860-05-02" },
        { Name: "A-3", BirthDate: "1862-01-01" },
      ],
      nameOf
    );
    expect(answer).toMatch(/^Yes\. Ellen has children sharing a birth date:\n- Twins born .*1860.*: A-1, A-2$/);
  });
  test("no twins, with a same-year caveat and an undated child", () => {
    const answer = buildTwinsAnswer(
      "Ellen",
      [
        { Name: "A-1", BirthDate: "1860-00-00" },
        { Name: "A-2", BirthDate: "1860-07-09" },
        { Name: "A-3", BirthDate: "0000-00-00" },
      ],
      nameOf
    );
    expect(answer).toBe(
      "No twins found: none of Ellen's 3 recorded children share a full birth date. A-1 and A-2 were both born in 1860, but without full dates I can't tell if they were twins. 1 child has no birth date."
    );
  });
  test("no children", () => {
    expect(buildTwinsAnswer("Ellen", [], nameOf)).toBe("WikiTree has no children recorded for Ellen.");
  });
});
