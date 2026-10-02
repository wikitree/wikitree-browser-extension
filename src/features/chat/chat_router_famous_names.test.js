jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));


import { getCommonAliasExpansion, isWikiTreeId } from "./chat_router";

describe("famous names (live corpus B8, 2026-10-02)", () => {
  test("Prince Philip resolves to his WikiTree profile", () => {
    expect(getCommonAliasExpansion("Prince Philip")?.wtId).toBe("Schleswig-Holstein-Sonderburg-Glücksburg-1");
    expect(getCommonAliasExpansion("Philip")).toBeNull();
  });

  test("IDs with hyphenated or accented surnames are WikiTree IDs", () => {
    expect(isWikiTreeId("Schleswig-Holstein-Sonderburg-Glücksburg-1")).toBe(true);
    expect(isWikiTreeId("Mountbatten-Windsor-9")).toBe(true);
    expect(isWikiTreeId("O'Brien-12")).toBe(true);
    expect(isWikiTreeId("Beacall-6")).toBe(true);
    expect(isWikiTreeId("Philip")).toBe(false);
    expect(isWikiTreeId("born 1850-1900")).toBe(false);
    expect(isWikiTreeId("Category:Chicago-1")).toBe(false);
  });
});
