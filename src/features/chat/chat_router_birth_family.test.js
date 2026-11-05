// "biological parents", "birth mother", "bio siblings" route to relation answers without AI (2026-10-13).
jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn() }));
import { routeChatPrompt } from "./chat_router";

describe("routing birth-family prompts", () => {
  const route = (prompt) => routeChatPrompt(prompt);
  test.each([
    ["Luker-573's biological parents", "biological parents", "named", "Luker-573"],
    ["Patty Luker's birth mother", "birth mother", "named", "Patty Luker"],
    ["who are Patty's bio siblings?", "bio siblings", "named", "Patty"],
    ["biological parents of Luker-573", "biological parents", "named", "Luker-573"],
    ["Patty's biological mother's father", "biological mother's father", "named", "Patty"],
  ])("%s", (prompt, relationRaw, subjectMode, subjectName) => {
    expect(route(prompt)).toEqual({ intent: "relationCount", params: { mode: "list", relationRaw, subjectMode, subjectName } });
  });
  test("my biological father", () => {
    expect(route("my biological father")).toEqual({ intent: "relationCount", params: { mode: "list", relationRaw: "biological father", subjectMode: "user" } });
  });
  test("bio and birth on their own are not relations", () => {
    expect(route("Patty's birth certificate").intent).toBe("fallbackAi");
    expect(route("Patty's bio").intent).toBe("fallbackAi");
  });
});
