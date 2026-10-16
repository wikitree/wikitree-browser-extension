import { compileSearch, findMatches, replaceMatches } from "./find_and_replace_engine";
import {
  READY_MADE,
  cleanSearch,
  withSearch,
  withoutSearch,
  hasSearch,
  sortedSearches,
  freeName,
  sameSearch,
  renamedSearch,
} from "./find_and_replace_saved";

const readyMade = (name) => READY_MADE.flatMap((group) => group.searches).find((search) => search.name.startsWith(name));
const run = (search, text) => {
  const compiled = compileSearch(search);
  return replaceMatches(text, findMatches(text, compiled), search.replace, compiled).text;
};

describe("ready-made searches", () => {
  test("all of them work", () => {
    READY_MADE.flatMap((group) => group.searches).forEach((search) => {
      expect(compileSearch(search).error).toBeUndefined();
      expect(cleanSearch(search)).toBeTruthy();
    });
  });

  test("bold", () => {
    expect(run(readyMade("**Bold**"), "He was **La Souche Caplan** and **Zoë**.")).toBe("He was '''La Souche Caplan''' and '''Zoë'''.");
  });

  test("italics: each one on its own, leaving bold, lists and sums alone", () => {
    const search = readyMade("*Italics*");
    expect(run(search, "He farmed at *La Souche Caplan* near *Évreux*.")).toBe("He farmed at ''La Souche Caplan'' near ''Évreux''.");
    expect(run(search, "* a list item with *Zoë* in it")).toBe("* a list item with ''Zoë'' in it");
    expect(run(search, "**Bold** stays")).toBe("**Bold** stays");
    expect(run(search, "5 * 3 = 15")).toBe("5 * 3 = 15");
  });

  test("bold then italics", () => {
    const text = "**Early life** and *one* or *two* words";
    expect(run(readyMade("*Italics*"), run(readyMade("**Bold**"), text))).toBe("'''Early life''' and ''one'' or ''two'' words");
  });

  test("headings", () => {
    const text = "## Early Life\n### School ###\n#### Deeper\n# One\n##Not a heading";
    expect(run(readyMade("## Heading"), text)).toBe("== Early Life ==\n### School ###\n#### Deeper\n# One\n##Not a heading");
    expect(run(readyMade("### Heading"), text)).toBe("## Early Life\n=== School ===\n#### Deeper\n# One\n##Not a heading");
  });

  test("lists", () => {
    expect(run(readyMade("- List item"), "- One\n  - Two\n• Three\nA - B\n-1")).toBe("* One\n* Two\n* Three\nA - B\n-1");
    expect(run(readyMade("1. List item"), "1. One\n2) Two\n10. Ten\nIn 1852. Born")).toBe("# One\n# Two\n# Ten\nIn 1852. Born");
  });

  test("links", () => {
    expect(run(readyMade("[Text](link)"), "See [Paris](https://en.wikipedia.org/wiki/Paris_(Texas)) and [[Smith-1|John]].")).toBe(
      "See [https://en.wikipedia.org/wiki/Paris_(Texas) Paris] and [[Smith-1|John]]."
    );
    expect(run(readyMade("[Text](link)"), "See [FamilySearch](https://www.familysearch.org/ark:/61903/1:1:XYZ).")).toBe(
      "See [https://www.familysearch.org/ark:/61903/1:1:XYZ FamilySearch]."
    );
  });

  test("tidying", () => {
    expect(run(readyMade("Spaces at the ends"), "One  \nTwo\t\nThree")).toBe("One\nTwo\nThree");
    expect(run(readyMade("Double spaces"), "One  two   three\n  indented  ")).toBe("One two three\n  indented  ");
  });
});

describe("the user's saved searches", () => {
  const one = { name: "Bold", find: "a", replace: "b", mode: "regex", matchCase: true, wholeWord: false };

  test("only what's needed is kept", () => {
    expect(cleanSearch({ ...one, extra: 1, mode: "nonsense" })).toEqual({ ...one, mode: "text" });
    expect(cleanSearch({ name: "  ", find: "a" })).toBeNull();
    expect(cleanSearch({ name: "x", find: "" })).toBeNull();
  });

  test("a name used again replaces the search, ignoring case", () => {
    const list = withSearch([one], { ...one, name: "bold", find: "c" });
    expect(list).toHaveLength(1);
    expect(list[0].find).toBe("c");
    expect(withSearch(list, { ...one, name: "Other" })).toHaveLength(2);
    expect(hasSearch(list, "BOLD")).toBe(true);
    expect(withoutSearch(list, "BOLD")).toEqual([]);
  });

  test("a free name for a new search", () => {
    expect(freeName([one], "Italics")).toBe("Italics");
    expect(freeName([one], "bold")).toBe("bold (2)");
    expect(freeName([one, { ...one, name: "Bold (2)" }], "Bold")).toBe("Bold (3)");
  });

  test("the same search under any name", () => {
    expect(sameSearch([one], { ...one, name: "Other", extra: 1 })).toBe(one);
    expect(sameSearch([one], { ...one, replace: "c" })).toBeUndefined();
    expect(sameSearch([one], { ...one, matchCase: false })).toBeUndefined();
    expect(sameSearch([one], { find: "" })).toBeUndefined();
  });

  test("renaming", () => {
    const two = { ...one, name: "Two", find: "z" };
    expect(renamedSearch([one, two], "bold", "Heavy")).toEqual([two, { ...one, name: "Heavy" }]);
    // to a name another search has: it takes that one's place
    expect(renamedSearch([one, two], "Bold", "two")).toEqual([{ ...one, name: "two" }]);
    expect(renamedSearch([one], "Bold", "BOLD")).toEqual([{ ...one, name: "BOLD" }]);
    expect(renamedSearch([one], "Gone", "New")).toEqual([one]);
  });

  test("shown by name", () => {
    const list = [{ ...one, name: "b" }, { ...one, name: "A 10" }, { ...one, name: "A 9" }];
    expect(sortedSearches(list).map((s) => s.name)).toEqual(["A 9", "A 10", "b"]);
  });
});
