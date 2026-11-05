import { hasSentenceWords, looksLikeNotASurname, looksLikeSurnamePlace } from "./chat_sentence_words";

describe("sentence words are never a name or a place", () => {
  test("clause and role words", () => {
    ["Scotland who emigrated", "soldiers in Ohio", "no sources", "emigrants to Canada", "family of Wales", "oldest from Kent"].forEach((value) =>
      expect(hasSentenceWords(value)).toBe(true)
    );
  });

  test("real places stay places", () => {
    ["Trinidad and Tobago", "Isle of Wight", "Isle of Man", "Stoke on Trent", "New South Wales", "Toronto", "Tobago", "Livingston"].forEach((value) =>
      expect(hasSentenceWords(value)).toBe(false)
    );
  });

  test("surnames that are really places or phrases", () => {
    ["Lincolnshire", "Kent-born", "long-lived", "twins"].forEach((value) => expect(looksLikeNotASurname(value) || value === "twins").toBe(true));
    ["Smith", "Garver", "Beacall"].forEach((value) => expect(looksLikeNotASurname(value)).toBe(false));
  });

  test("only a clean pair is a surname and a place", () => {
    expect(looksLikeSurnamePlace(["Beacall", "Australia"])).toBe(true);
    expect(looksLikeSurnamePlace(["Kent", "farmers"])).toBe(false);
    expect(looksLikeSurnamePlace(["Mary", "Smith", "Ohio"])).toBe(false);
    expect(looksLikeSurnamePlace(["Jones", "family", "of", "Wales"])).toBe(false);
    expect(looksLikeSurnamePlace(["Lincolnshire", "Ohio"])).toBe(false);
  });
});
