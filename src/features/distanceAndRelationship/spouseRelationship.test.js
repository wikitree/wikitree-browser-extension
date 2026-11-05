/**
 * @jest-environment jsdom
 */
import { isUserSpouseOnPage, spouseWord, isSpouseWord, relationshipBoxText } from "./spouseRelationship";

function pageWithSpouses(hrefs) {
  document.body.innerHTML = `
    <div id="person">
      <h1 itemprop="name">Laura Harris</h1>
      <a href="/wiki/Tracy-4272">A parent</a>
      ${hrefs
        .map(
          (href) =>
            `<div class="spouse">Wife of <span itemprop="spouse" itemscope><a href="${href}"><span itemprop="name">Someone</span></a></span></div>`
        )
        .join("")}
    </div>`;
  return document;
}

describe("isUserSpouseOnPage", () => {
  test("finds the user among the spouse links", () => {
    expect(isUserSpouseOnPage(pageWithSpouses(["/wiki/Smith-1", "/wiki/Harris-55071"]), "Harris-55071")).toBe(true);
  });

  test("matches full URLs, spaces/underscores and case", () => {
    const doc = pageWithSpouses(["https://www.wikitree.com/wiki/De_La_Mare-12"]);
    expect(isUserSpouseOnPage(doc, "de la mare-12")).toBe(true);
  });

  test("does not match ids that only share a prefix", () => {
    expect(isUserSpouseOnPage(pageWithSpouses(["/wiki/Harris-550710"]), "Harris-55071")).toBe(false);
  });

  test("ignores non-spouse links to the user", () => {
    expect(isUserSpouseOnPage(pageWithSpouses([]), "Tracy-4272")).toBe(false);
  });

  test("no user id", () => {
    expect(isUserSpouseOnPage(pageWithSpouses(["/wiki/Harris-55071"]), "")).toBe(false);
  });
});

describe("spouseWord / isSpouseWord", () => {
  test("gender-aware word", () => {
    expect(spouseWord("Female")).toBe("wife");
    expect(spouseWord("Male")).toBe("husband");
    expect(spouseWord("")).toBe("spouse");
  });

  test("recognises stored spouse words", () => {
    expect(isSpouseWord("Wife")).toBe(true);
    expect(isSpouseWord("husband")).toBe(true);
    expect(isSpouseWord("1st cousin")).toBe(false);
  });
});

describe("relationshipBoxText", () => {
  test("spouse who is also a cousin (fresh lookup)", () => {
    expect(relationshipBoxText("half 12th cousin four times removed", "", "wife")).toEqual({
      main: "wife",
      also: "half 12th cousin four times removed",
    });
  });

  test("spouse who is also a cousin (cached record)", () => {
    expect(relationshipBoxText("wife", "12th cousin", "wife")).toEqual({ main: "wife", also: "12th cousin" });
  });

  test("old cached record without bloodRelationship", () => {
    expect(relationshipBoxText("12th cousin", undefined, "husband")).toEqual({ main: "husband", also: "12th cousin" });
  });

  test("spouse with no blood relationship", () => {
    expect(relationshipBoxText("", "", "wife")).toEqual({ main: "wife", also: "" });
  });

  test("not a spouse", () => {
    expect(relationshipBoxText("1st cousin", "", "")).toEqual({ main: "1st cousin", also: "" });
  });

  test("cached as spouse but no longer listed as one", () => {
    expect(relationshipBoxText("wife", "12th cousin", "")).toEqual({ main: "12th cousin", also: "" });
    expect(relationshipBoxText("wife", "", "")).toEqual({ main: "", also: "" });
  });
});
