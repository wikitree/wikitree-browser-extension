import {
  biographyPartOfBio,
  censusNarrativeFromBioSentence,
  findCensusSentenceInBio,
  stripRefs,
  tidyCensusResidence,
} from "./censusNarrativeUtils.js";

// Wood-24677, whose census sentences Auto Bio replaced with worse ones.
const woodBio = `== Biography ==
{{England Sticker|Gloucestershire}}
William was born on 13 February 1787 and baptised in Cirencester.<ref>'''Baptism''': Cirencester.</ref>

William's wife died in 1840 at the age of 49.<ref>Death of Ann.</ref> In 1841 William lived with his children on Sash Street in Stafford and worked as a painter.<ref name="fortyone">"'''England and Wales Census, 1841'''," database with images, FamilySearch.</ref> He was said to be a joiner later in 1841, when his daughter, Betsey, married.<ref>Marriage of Betsey.</ref> At the time of the 1851 census William lived on Foregate, Stafford. He worked as a joiner and his sons, John and James, were lodgers.<ref>'''1851 Census''': William Watwood (67), widowed, Joiner.</ref>

== Sources ==
<references />
* In 1841 this citation should never be mistaken for a sentence about William.`;

const names = ["William", "Will", "Bill"];

describe("stripRefs", () => {
  test("removes refs and self-closing refs", () => {
    expect(stripRefs('He died.<ref name="death">A citation.</ref> He was buried.<ref name="death"/>')).toBe(
      "He died. He was buried."
    );
  });

  test("removes a ref that runs over several lines", () => {
    expect(stripRefs("He died.<ref>'''Death''':\nline two.</ref>")).toBe("He died.");
  });
});

describe("biographyPartOfBio", () => {
  test("stops at the Sources heading", () => {
    expect(biographyPartOfBio(woodBio)).not.toMatch("this citation should never be mistaken");
    expect(biographyPartOfBio(woodBio)).toMatch("Sash Street");
  });
});

describe("findCensusSentenceInBio", () => {
  test("finds the sentence written about the 1841 census", () => {
    expect(findCensusSentenceInBio(woodBio, { year: 1841, names })).toBe(
      "In 1841 William lived with his children on Sash Street in Stafford and worked as a painter."
    );
  });

  test("finds the sentence written about the 1851 census", () => {
    expect(findCensusSentenceInBio(woodBio, { year: 1851, names })).toBe(
      "At the time of the 1851 census William lived on Foregate, Stafford."
    );
  });

  test("does not take a sentence that only mentions the year in passing", () => {
    const bio = "== Biography ==\nHe was said to be a joiner later in 1841, when his daughter, Betsey, married.";
    expect(findCensusSentenceInBio(bio, { year: 1841, names })).toBe("");
  });

  test("takes a Sourcer census sentence too", () => {
    /* Coombes-890 had "In the 1920 census, Charlie (age 44) was the married head of household in
    Baron, Adair, Oklahoma" and got "In 1920, Charlie F (44), married head of household in Baron,
    Adair, Oklahoma" instead. This is only consulted when there is no household to describe, so
    any sentence already written beats rearranging the citation. */
    const bio = "== Biography ==\nIn the 1851 census, William Wood (64) was living in Stafford with his sons.";
    expect(findCensusSentenceInBio(bio, { year: 1851, names })).toBe(
      "In the 1851 census, William Wood (64) was living in Stafford with his sons."
    );
  });

  test("does not take a sentence about somebody else", () => {
    const bio = "== Biography ==\nIn 1851 Ann was living in Stone with her mother.";
    expect(findCensusSentenceInBio(bio, { year: 1851, names })).toBe("");
  });

  test("ignores list items and table rows", () => {
    const bio = "== Biography ==\n* In 1851 William was in Stafford.\n| In 1851 William was in Stafford.";
    expect(findCensusSentenceInBio(bio, { year: 1851, names })).toBe("");
  });

  test("returns nothing without a year or names", () => {
    expect(findCensusSentenceInBio(woodBio, { year: "", names })).toBe("");
    expect(findCensusSentenceInBio(woodBio, { year: 1841, names: [] })).toBe("");
    expect(findCensusSentenceInBio("", { year: 1841, names })).toBe("");
  });
});

describe("censusNarrativeFromBioSentence", () => {
  test.each([
    [
      "At the time of the 1851 census William lived on Foregate, Stafford.",
      "In 1851, William lived on Foregate, Stafford.",
    ],
    [
      "In 1841 William lived with his children on Sash Street in Stafford.",
      "In 1841, William lived with his children on Sash Street in Stafford.",
    ],
    ["In the 1851 census, William was living in Stafford.", "In 1851, William was living in Stafford."],
    ["In the '''1851''' census William was living in Stafford.", "In 1851, William was living in Stafford."],
  ])("rewrites %s", (sentence, expected) => {
    expect(censusNarrativeFromBioSentence(sentence)).toBe(expected);
  });

  test("leaves a sentence that is already in the right form", () => {
    const sentence = "In 1851, William was living in Stafford.";
    expect(censusNarrativeFromBioSentence(sentence)).toBe(sentence);
  });
});

describe("findCensusSentenceInBio with awkward names", () => {
  test("treats a full stop in a name variant as a full stop", () => {
    const bio = "== Biography ==\nIn 1851 Jane was living in Stafford.";
    expect(findCensusSentenceInBio(bio, { year: 1851, names: ["J."] })).toBe("");
    expect(findCensusSentenceInBio(bio, { year: 1851, names: ["Jane"] })).toBe("In 1851 Jane was living in Stafford.");
  });
});

describe("tidyCensusResidence", () => {
  // Winder-432 produced "was living in England. Born with his wife, Priscilla (24)".
  test("stops at the end of the sentence, before the birthplace", () => {
    expect(tidyCensusResidence("Barnsley registration district in England. Born in Wombwell, Yorkshire")).toBe(
      "Barnsley registration district"
    );
  });

  test("drops a country that only repeats the district", () => {
    expect(tidyCensusResidence("Barnsley registration district in England")).toBe("Barnsley registration district");
    expect(tidyCensusResidence("Wombwell, Yorkshire in England.")).toBe("Wombwell, Yorkshire");
  });

  test("leaves a residence that is already clean", () => {
    expect(
      tidyCensusResidence("household of Thomas Winder (38) on Well Lane, Wombwell in Barnsley registration district")
    ).toBe("household of Thomas Winder (38) on Well Lane, Wombwell in Barnsley registration district");
    expect(tidyCensusResidence("91, Broomhill, Wombwell")).toBe("91, Broomhill, Wombwell");
  });

  test("copes with nothing", () => {
    expect(tidyCensusResidence("")).toBe("");
    expect(tidyCensusResidence(undefined)).toBe("");
  });
});

describe("the Coombes-890 census sentence", () => {
  const coombesBio = `== Biography ==
Charles was born to Edward Coombes and Mary Gilman in 1876.
In the 1920 census, Charlie (age 44) was the married head of household in Baron, Adair, Oklahoma.<ref>'''1920 Census'''</ref>
== Sources ==`;

  test("is found and put into Auto Bio's form", () => {
    const sentence = findCensusSentenceInBio(coombesBio, { year: 1920, names: ["Charles", "Charlie", "Chas"] });

    expect(sentence).toBe(
      "In the 1920 census, Charlie (age 44) was the married head of household in Baron, Adair, Oklahoma."
    );
    expect(censusNarrativeFromBioSentence(sentence, 1920)).toBe(
      "In 1920, Charlie (age 44) was the married head of household in Baron, Adair, Oklahoma."
    );
  });
});
