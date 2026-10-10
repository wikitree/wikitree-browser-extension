import { nextAnswerSubject, pickAnswerSubject, promptNamesSomeone, rewritePronounToSubject } from "./chat_person_memory";

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

// The profile person until the user names someone (user, 2026-10-10).
describe("nextAnswerSubject", () => {
  const john = { wtId: "Weatherall-113", displayName: "John Weatherall" };
  const flora = { wtId: "Hooper-4576", displayName: "Flora (Hooper) Weatherall" };

  test("an answer about a relative the question didn't name keeps the profile person", () => {
    expect(nextAnswerSubject(null, john, "where was his father born?")).toBeNull();
    expect(nextAnswerSubject(null, flora, "When did his wife die?")).toBeNull();
  });

  test("naming the person makes them the subject", () => {
    expect(nextAnswerSubject(null, john, "when was his son John born?")).toEqual(john);
    expect(nextAnswerSubject(null, lincoln, "where was Lincoln-103 born?")).toEqual(lincoln);
    expect(nextAnswerSubject(null, lincoln, "Where was Abraham born")).toEqual(lincoln);
  });

  test("a named subject stays until someone else is named", () => {
    expect(nextAnswerSubject(lincoln, flora, "when did his wife die?")).toEqual(lincoln);
    expect(nextAnswerSubject(lincoln, null, "his children")).toEqual(lincoln);
    expect(nextAnswerSubject(lincoln, null, "where was Cook-8720 born?")).toBeNull();
    expect(nextAnswerSubject(lincoln, john, "Where was John born?")).toEqual(john);
  });

  test("what counts as naming someone", () => {
    expect(promptNamesSomeone("Where was his father born?")).toBe(false);
    expect(promptNamesSomeone("I want his mother's dates")).toBe(false);
    expect(promptNamesSomeone("his son John's wife")).toBe(true);
    expect(promptNamesSomeone("smith-12's wife")).toBe(true);
    expect(promptNamesSomeone("Smith-12's wife")).toBe(true);
  });
});
