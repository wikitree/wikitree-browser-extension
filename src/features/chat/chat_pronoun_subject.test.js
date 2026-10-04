import { pickAnswerSubject, rewritePronounToSubject } from "./chat_person_memory";

const lincoln = { wtId: "Lincoln-103", displayName: "Abraham" };

describe("pronouns follow the last answer's person", () => {
  test("an answer about one person sets the subject", () => {
    expect(pickAnswerSubject("Connection found: Abraham (Lincoln-103) is 21 steps away from you.")).toEqual(lincoln);
  });

  test("a list of people sets none", () => {
    expect(pickAnswerSubject("Here are 2: Hannah (Hutton-734), James (Cook-8720)")).toBeNull();
    expect(pickAnswerSubject("Abraham (Lincoln-103)", { rows: [{}, {}] })).toBeNull();
  });

  test("his wife after Lincoln → Lincoln-103's wife", () => {
    expect(rewritePronounToSubject("his wife's siblings", lincoln, "Male")).toEqual({
      changed: true,
      prompt: "Lincoln-103's wife's siblings",
    });
    expect(rewritePronounToSubject("how is his wife related to me?", lincoln, "Male").prompt).toBe(
      "how is Lincoln-103's wife related to me?"
    );
  });

  test("her husband after Lincoln stays with the profile person", () => {
    expect(rewritePronounToSubject("her husband's siblings' children", lincoln, "Male").changed).toBe(false);
  });

  test("unknown gender or no pronoun changes nothing", () => {
    expect(rewritePronounToSubject("his wife", lincoln, "").changed).toBe(false);
    expect(rewritePronounToSubject("Benny's wife", lincoln, "Male").changed).toBe(false);
    expect(rewritePronounToSubject("tell me about her", lincoln, "Female").changed).toBe(false);
  });
});
