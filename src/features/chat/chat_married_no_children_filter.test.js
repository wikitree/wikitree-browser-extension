import { isLikelyMarriedNoChildrenPrompt, parseMarriedNoChildrenPrompt } from "./chat_married_no_children_filter";

describe("chat_married_no_children_filter prompt parsing", () => {
  test("parses married but no children prompt with range scope", () => {
    const result = parseMarriedNoChildrenPrompt("Staffordshire 1850-1900 married but no children listed");

    expect(result).toEqual({
      locationText: "Staffordshire",
      startYear: 1850,
      endYear: 1900,
      yearLabel: "1850-1900",
      understood: "Staffordshire 1850-1900 profiles married but with no children listed",
    });
  });

  test("detects married but no children phrasing", () => {
    expect(isLikelyMarriedNoChildrenPrompt("Staffordshire 1850-1900 married but no children listed")).toBe(true);
    expect(isLikelyMarriedNoChildrenPrompt("Lancashire 1800s Large spousal age gaps (> 20 years)")).toBe(false);
  });
});
