jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: { getProfile: jest.fn(), searchPerson: jest.fn() } }));
jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Weatherall-111" })) }));

import { suggestionRunsLocally, tidySuggestion, topicSuggestions, vetSuggestions, workingSuggestion } from "./chat_suggestions";

// Live, 2026-10-08 (Weatherall-111's Ancestors tab): the AI's follow-ups included
// requests that went straight back to the AI, which then said it couldn't.
describe("AI follow-up suggestions", () => {
  test.each([
    ["show John Theodore Weatherall's (Weatherall-113) bio", "show Weatherall-113's bio"],
    ["ask about Annie Caroline Thomason (Thomason-1150)", "ask about Thomason-1150"],
    ["**Weatherall-111 fan chart**.", "Weatherall-111 fan chart"],
  ])("tidies %s", (raw, tidy) => expect(tidySuggestion(raw)).toBe(tidy));

  test.each([
    ["show Weatherall-111's ancestors", "show Weatherall-111's ancestors"],
    ["show Weatherall-111's family tree chart", "show Weatherall-111's family tree chart"],
    ["show John Theodore Weatherall's (Weatherall-113) bio", "show Weatherall-113's bio"],
    ["Weatherall-111's siblings", "show Weatherall-111's siblings"],
    ["Weatherall-111's sources", "show Weatherall-111's sources"],
    ["show Weatherall-113's parents", "show Weatherall-113's parents"],
    ["Weatherall-111 fan chart", "Weatherall-111 fan chart"],
    ["show Weatherall-111's family timeline", "show Weatherall-111's family timeline"],
    ["find Weatherall born in Texas", "find Weatherall born in Texas"],
    ["my connection to Weatherall-111", "my connection to Weatherall-111"],
  ])("keeps %s", (raw, working) => expect(workingSuggestion(raw)).toBe(working));

  test.each(["what was his occupation", "tell me more about his life", "view the pedigree on the Ancestors tab", "see his family tree chart beyond 5 generations"])(
    "drops %s",
    (raw) => expect(workingSuggestion(raw)).toBe("")
  );

  test("every topic request runs locally", () => {
    const questions = [
      "how many direct ancestors does he have?",
      "how many grandchildren?",
      "what sources prove this?",
      "how is he related to Darwin?",
      "where did they move?",
      "what war did he live through?",
      "who were his brothers?",
      "what was his job?",
    ];
    for (const question of questions) {
      for (const prompt of topicSuggestions(question, "Weatherall-111")) expect([prompt, suggestionRunsLocally(prompt)]).toEqual([prompt, true]);
    }
  });

  test("the screenshot's suggestions, vetted and topped up", () => {
    const question = "how many direct ancestors does he have? can you see beyond the chart displayed on this page?";
    expect(
      vetSuggestions(["show Weatherall-113's ancestors", "show Thomason-1150's ancestors", "show Weatherall-111's family timeline"], { question, id: "Weatherall-111" })
    ).toEqual(["show Weatherall-113's ancestors", "show Thomason-1150's ancestors", "show Weatherall-111's family timeline"]);
    expect(vetSuggestions(["what was his occupation", "see his pedigree beyond 5 generations"], { question, id: "Weatherall-111" })).toEqual([
      "how many ancestors does Weatherall-111 have",
      "Weatherall-111's fan chart",
    ]);
    expect(vetSuggestions(["what was his occupation"], { question, id: "Weatherall-111", want: 3 })).toHaveLength(3);
    expect(vetSuggestions(["what was his occupation"], { question, id: "" })).toEqual([]);
    // No repeats, with or without "show".
    expect(vetSuggestions(["Weatherall-111's fan chart", "show Weatherall-111's fan chart"], { question, id: "Weatherall-111", want: 1 })).toEqual([
      "Weatherall-111's fan chart",
    ]);
  });
});
