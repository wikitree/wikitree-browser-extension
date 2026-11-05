import { estimateChildListDate, joinChildBits } from "./childListUtils.js";

describe("estimateChildListDate", () => {
  test("places undated children a generation after birth, so censuses of childhood come first", () => {
    // Garry V McBride: born 1912, censuses in 1915 and 1930, died 1952.
    expect(estimateChildListDate({ BirthDate: "1912-00-00", DeathDate: "1952-10-22" })).toBe("1937-00-00");
  });

  test("never sorts the children after the death", () => {
    expect(estimateChildListDate({ BirthDate: "1912-00-00", DeathDate: "1935-01-01" })).toBe("1935-00-00");
  });

  test("falls back to the death year when the birth year is unknown", () => {
    expect(estimateChildListDate({ DeathDate: "1952-10-22" })).toBe("1952-00-00");
  });

  test("gives an all-zero date when nothing is known", () => {
    expect(estimateChildListDate({})).toBe("0000-00-00");
    expect(estimateChildListDate()).toBe("0000-00-00");
  });
});

describe("joinChildBits", () => {
  test("drops empty dates and status instead of leaving stray spaces", () => {
    expect(joinChildBits("Deedra Ella McBride", "", "")).toBe("Deedra Ella McBride");
  });

  test("keeps the spacing when dates and status are present", () => {
    expect(joinChildBits("[[McBride-1|Peter McBride]]", "(1940–2001)", " [uncertain]")).toBe(
      "[[McBride-1|Peter McBride]] (1940–2001) [uncertain]"
    );
  });
});
