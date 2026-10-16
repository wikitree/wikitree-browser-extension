import { tryInsteadPrompts } from "./chat_try_instead";

describe("tryInsteadPrompts (shorter wordings for a question needing AI)", () => {
  test("the whole of it, without the lead-in", () => {
    expect(tryInsteadPrompts("Show me my relatives who died in Australia and were born in England")).toEqual([
      "my relatives who died in Australia and were born in England",
    ]);
  });
  test("the part it can read, clauses dropped from the end", () => {
    expect(tryInsteadPrompts("Are there any Beacalls born in Shropshire in the 1820s that married twice?")).toEqual([
      "Beacalls born in Shropshire in the 1820s",
    ]);
    expect(tryInsteadPrompts("Which Garvers were born in Kent, and what did they do for a living?")).toEqual(["Which Garvers were born in Kent"]);
  });
  test("nothing when no part is a search", () => {
    expect(tryInsteadPrompts("What was life like in Cornwall in the 1840s?")).toEqual([]);
    expect(tryInsteadPrompts("Who was the oldest person in my tree?")).toEqual([]);
    // (it doesn't guess which words to drop from the middle)
    expect(tryInsteadPrompts("Which of my relatives born in Ireland fought in WW1?")).toEqual([]);
  });
});
