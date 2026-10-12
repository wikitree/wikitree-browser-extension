import {
  cemeteryFromFindAGrave,
  isFindAGraveWithoutImage,
  looksLikeCitationText,
  citationDedupeKey,
  collapseCitationWhitespace,
  decodeHtmlEntities,
} from "./citationTextUtils.js";

describe("decodeHtmlEntities", () => {
  test("puts back a literal greater-than sign", () => {
    expect(decodeHtmlEntities("Glossary of Medical Terms &gt; Morbus cordis")).toBe(
      "Glossary of Medical Terms > Morbus cordis"
    );
  });

  test("turns non-breaking spaces into ordinary spaces", () => {
    expect(decodeHtmlEntities("Ancestry.com].&nbsp;Gloucestershire, England")).toBe(
      "Ancestry.com]. Gloucestershire, England"
    );
    expect(decodeHtmlEntities("Ancestry.com]. Gloucestershire")).toBe("Ancestry.com]. Gloucestershire");
  });

  test("decodes ampersands last so escaped entities survive", () => {
    expect(decodeHtmlEntities("&amp;lt;ref&amp;gt;")).toBe("&lt;ref&gt;");
  });

  test("decodes numeric entities", () => {
    expect(decodeHtmlEntities("Charlton&#39;s will")).toBe("Charlton's will");
    expect(decodeHtmlEntities("Charlton&#x2019;s will")).toBe("Charlton’s will");
  });

  test("leaves escaped markup escaped, so it cannot become live markup", () => {
    // The round-trip cannot tell this from a "<" the HTML parser decoded, and it renders the same.
    // A lone ">" is not markup, so only the "<" has to stay escaped.
    expect(decodeHtmlEntities("The citation showed &lt;ref&gt; in the text")).toBe(
      "The citation showed &lt;ref> in the text"
    );
    expect(decodeHtmlEntities("&#60;ref&#62;")).toBe("&#60;ref>");
    expect(decodeHtmlEntities("&#x3C;ref>")).toBe("&#x3C;ref>");
  });

  test("leaves plain text alone", () => {
    const text = "Find a Grave, database and images, memorial page for Carrie Fisher";
    expect(decodeHtmlEntities(text)).toBe(text);
  });
});

describe("collapseCitationWhitespace", () => {
  test("joins a multi-line Sourcer citation onto one line", () => {
    const citation = `'''Baptism''':
"Staffordshire Baptisms",
Reference: D1399/6; Page: 96,
Robert Wood baptism on 19 Jan 1817.`;

    expect(collapseCitationWhitespace(citation)).toBe(
      `'''Baptism''': "Staffordshire Baptisms", Reference: D1399/6; Page: 96, Robert Wood baptism on 19 Jan 1817.`
    );
  });

  test("leaves a single-line citation untouched", () => {
    const citation = "Find a Grave, memorial page for Carrie Fisher.";
    expect(collapseCitationWhitespace(citation)).toBe(citation);
  });

  test("keeps the line breaks of a table", () => {
    const citation = '{| class="wikitable"\n|-\n| Name || Age\n|}';
    expect(collapseCitationWhitespace(citation)).toBe(citation);
  });

  test("keeps the line breaks of a nested list", () => {
    const citation = "Census household:\n* John Wood\n* James Wood";
    expect(collapseCitationWhitespace(citation)).toBe(citation);
  });
});

describe("citationDedupeKey", () => {
  test("matches two copies that differ only in whitespace and bullet", () => {
    const one = "* Gibson Jefferson McConnaughey, “Amelia county, Virginia”";
    const two = "Gibson Jefferson  McConnaughey,\n“Amelia county, Virginia” ";

    expect(citationDedupeKey(one)).toBe(citationDedupeKey(two));
  });

  test("keeps different citations apart", () => {
    expect(citationDedupeKey("Source A")).not.toBe(citationDedupeKey("Source B"));
  });
});

describe("looksLikeCitationText", () => {
  test("is true for citation wording and templates", () => {
    expect(
      looksLikeCitationText("database<br/>({{FindAGrave|248785034}} : accessed 22 September 2024)<br/>Memorial")
    ).toBe(true);
    expect(looksLikeCitationText("Find a Grave memorial")).toBe(true);
    expect(looksLikeCitationText("Burial record")).toBe(true);
  });
  test("is false for a cemetery name", () => {
    expect(looksLikeCitationText("Oak Hill Cemetery")).toBe(false);
    expect(looksLikeCitationText("Mauthausen Memorial")).toBe(false);
  });
});

describe("cemeteryFromFindAGrave", () => {
  test("is what the memorial cites, whatever the cemetery is called", () => {
    expect(
      cemeteryFromFindAGrave(
        'Memorial: "Find a Grave", database<br/>({{FindAGrave|248785034}} : accessed 22 September 2024)<br/>Memorial page for Alfred Algner (23 Jun 1908-11 Mar 1940), citing Mauthausen KZ, Mauthausen, Perg Bezirk, Upper Austria, Austria; Maintained by Martin Václavík (contributor 48392890).'
      )
    ).toBe("Mauthausen KZ, Mauthausen, Perg Bezirk, Upper Austria, Austria");
  });
  test("is empty for any other citation", () => {
    expect(cemeteryFromFindAGrave("FamilySearch, citing Burial, Ohio; Entry for A B")).toBe("");
    expect(cemeteryFromFindAGrave("")).toBe("");
  });
});

describe("isFindAGraveWithoutImage", () => {
  test("is true for a Find a Grave citation that says (no image) or (no photo)", () => {
    expect(isFindAGraveWithoutImage('Memorial: "Find a Grave", database (no image) Memorial page for A B')).toBe(true);
    expect(isFindAGraveWithoutImage("Find a Grave memorial {{FindAGrave|1}} (No Photo)")).toBe(true);
    expect(isFindAGraveWithoutImage("{{FindAGrave|1}} ( no photos )")).toBe(true);
  });
  test("is false otherwise", () => {
    expect(isFindAGraveWithoutImage('Memorial: "Find a Grave", database. Memorial page for A B')).toBe(false);
    expect(isFindAGraveWithoutImage("A record (no image) from FamilySearch")).toBe(false);
    expect(isFindAGraveWithoutImage("")).toBe(false);
  });
});
