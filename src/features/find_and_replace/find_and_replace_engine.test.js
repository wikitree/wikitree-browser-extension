import { compileSearch, findMatches, replaceMatches, escapeWildcards } from "./find_and_replace_engine";

const found = (text, options) => findMatches(text, compileSearch(options)).map((m) => text.slice(m.start, m.end));
const replaced = (text, options, template) => {
  const search = compileSearch(options);
  return replaceMatches(text, findMatches(text, search), template, search).text;
};

describe("plain text", () => {
  test("finds the text as typed, ignoring case unless asked", () => {
    expect(found("Smith and SMITH. smith?", { find: "smith" })).toEqual(["Smith", "SMITH", "smith"]);
    expect(found("Smith and SMITH. smith?", { find: "smith", matchCase: true })).toEqual(["smith"]);
  });

  test("special characters are ordinary", () => {
    expect(found("[[Smith-1|John]] (b. 1850) a.b", { find: "[[Smith-1|" })).toEqual(["[[Smith-1|"]);
    expect(found("1850? 1850.", { find: "1850?" })).toEqual(["1850?"]);
  });

  test("whole words, in any script", () => {
    expect(found("Ann Anna Ann's Hann", { find: "ann", wholeWord: true })).toEqual(["Ann", "Ann"]);
    expect(found("René Renée René.", { find: "René", wholeWord: true })).toEqual(["René", "René"]);
    // Only checked at the ends that are part of a word
    expect(found("x[[Smith-1]]", { find: "[[Smith", wholeWord: true })).toEqual(["[[Smith"]);
  });

  test("the replacement is literal", () => {
    expect(replaced("John Smith", { find: "Smith" }, "$1 \\n Smyth")).toBe("John $1 \\n Smyth");
  });
});

describe("wildcards", () => {
  test("? is one character and # one digit", () => {
    expect(found("Smith Smyth Smooth", { find: "Sm?th", mode: "wildcards" })).toEqual(["Smith", "Smyth"]);
    expect(found("1799 1850 18th 1899", { find: "18##", mode: "wildcards" })).toEqual(["1850", "1899"]);
  });

  test("* at the start or end stays in the word", () => {
    expect(found("Smith, Smithson and Smithers.", { find: "Smith*", mode: "wildcards" })).toEqual([
      "Smith",
      "Smithson",
      "Smithers",
    ]);
    expect(found("Johnson and Jackson's son", { find: "*son", mode: "wildcards" })).toEqual(["Johnson", "Jackson", "son"]);
  });

  test("* in the middle takes as little as it can on one line", () => {
    expect(found("[[Smith-1|John]] and [[Jones-2|Mary]]", { find: "[[*]]", mode: "wildcards" })).toEqual([
      "[[Smith-1|John]]",
      "[[Jones-2|Mary]]",
    ]);
    expect(found("born in\nLondon in", { find: "born * in", mode: "wildcards" })).toEqual([]);
  });

  test("a backslash finds a wildcard symbol itself", () => {
    expect(found("Is it 1850? Or 1851", { find: "18##\\?", mode: "wildcards" })).toEqual(["1850?"]);
    expect(escapeWildcards("a*b?#\\")).toBe("a\\*b\\?\\#\\\\");
  });

  test("the same symbols in the replacement put back what was found, in order", () => {
    expect(replaced("in 1852 and 1799", { find: "18##", mode: "wildcards" }, "19##")).toBe("in 1952 and 1799");
    expect(replaced("[[Smith-12|John]]", { find: "[[Smith-*|*]]", mode: "wildcards" }, "[[Smyth-*|* Smyth]]")).toBe(
      "[[Smyth-12|John Smyth]]"
    );
    // More symbols than the search has are literal
    expect(replaced("abt 1850", { find: "abt ####", mode: "wildcards" }, "about ####?")).toBe("about 1850?");
  });

  test("whole words", () => {
    expect(found("Smithson Smith xSmyth Smyth", { find: "Sm?th", mode: "wildcards", wholeWord: true })).toEqual(["Smith", "Smyth"]);
    expect(found("1850 18500 a1850", { find: "18##", mode: "wildcards", wholeWord: true })).toEqual(["1850"]);
  });

  test("never makes empty matches", () => {
    expect(found("a b", { find: "*", mode: "wildcards" })).toEqual(["a", "b"]);
  });
});

describe("regular expressions", () => {
  test("uses JavaScript syntax with ^ and $ at each line", () => {
    expect(found("one\ntwo\nthree", { find: "^t\\w+$", mode: "regex" })).toEqual(["two", "three"]);
    expect(found("Émile Zoë", { find: "\\p{Lu}\\p{Ll}+", mode: "regex", matchCase: true })).toEqual(["Émile", "Zoë"]);
  });

  test("falls back to the older rules for patterns the u flag rejects", () => {
    expect(found("O'Neil", { find: "O\\'N", mode: "regex" })).toEqual(["O'N"]);
  });

  test("reports a broken pattern", () => {
    expect(compileSearch({ find: "(abc", mode: "regex" }).error).toMatch(/terminated group/);
  });

  test("replacement groups, escapes and empty matches", () => {
    const options = { find: "(\\w+), (\\w+)", mode: "regex" };
    expect(replaced("Smith, John", options, "$2 $1")).toBe("John Smith");
    expect(replaced("Smith, John", options, "\\2 \\1")).toBe("John Smith");
    expect(replaced("Smith, John", options, "$&$$\\n\\t")).toBe("Smith, John$\n\t");
    expect(replaced("Smith, John", { find: "(?<last>\\w+), (?<first>\\w+)", mode: "regex" }, "$<first> $<last>")).toBe(
      "John Smith"
    );
    expect(replaced("a\nb", { find: "^", mode: "regex" }, "* ")).toBe("* a\n* b");
    // A backslash before anything else is kept
    expect(replaced("a.b", { find: "\\.", mode: "regex" }, "\\.")).toBe("a\\.b");
  });

  test("whole words wrap the pattern", () => {
    expect(found("cat catalog cat", { find: "cat|dog", mode: "regex", wholeWord: true })).toEqual(["cat", "cat"]);
  });
});

test("nothing to find", () => {
  expect(compileSearch({ find: "" })).toBeNull();
  expect(findMatches("abc", null)).toEqual([]);
});
