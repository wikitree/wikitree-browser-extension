import {
  anchorKey,
  applyInlineCitationAnchors,
  eventOfSentence,
  findInlineCitationAnchors,
} from "./inlineCitationUtils.js";

const AROLSEN =
  "Arolsen Archives: 1 Incarceration Documents / ALGNER ALFRED Freiburg im Breisgau 06/23/1908, Reference Code [https://collections.arolsen-archives.org/en/document/131531993 8114200]";
const DACHAU = `Record of Alfred Algner:
"Germany, Dachau Concentration Camp Records, 1945", database<br/>
({{Ancestry Record|1371|122163}} : accessed 22 September 2024)<br/>
Name: Alfred Algner; Birth Date: 23 Jun 1908; Arrival Date: 27 Sep 1937; Disposition Notes: transfered 27 Sep 1939 to Mauthausen.`;
const NATIONAL = `Record of Alfred Algner:
"Germany, Concentration Camp Records, 1937-1945", database with images<br/>
({{Ancestry Record|61764|415232}} : accessed 22 September 2024)<br/>
Name: Alfred Algner; Birth Date: 23 Jun 1908; Birth Place: Freiburg; ID number: 12767.`;
const FIND_A_GRAVE = `Memorial: "Find a Grave", database<br/>({{FindAGrave|248785034}} : accessed 22 September 2024)<br/>Memorial page for Alfred Algner (23 Jun 1908-11 Mar 1940), citing Mauthausen KZ.`;

const BIO = `== Biography ==
{{Holocaust Sticker|fate=victim}}
Alfred Algner, son of Reigner Algner and Emilia Tees (Kees?), was born on 23 June 1908, in Freiburg im Breisgau, Baden.<ref name=arolsen>${AROLSEN}</ref>

Alfred was imprisoned first at Dachau and then at Mauthausen.<ref>
${DACHAU}
</ref><ref>
${NATIONAL}
</ref>

Alfred was murdered at Mauthausen on 11 March 1940.<ref name=arolsen />
== Sources ==
<references />
See also:
* ${FIND_A_GRAVE}
`;

describe("eventOfSentence", () => {
  test.each([
    ["Alfred was born on 23 June 1908 in Freiburg.", "Birth"],
    ["Alfred was imprisoned first at Dachau and then at Mauthausen.", "Imprisonment"],
    ["Alfred was murdered at Mauthausen on 11 March 1940.", "Death"],
    ["He married Anna in 1930.", "Marriage"],
    ["He was baptized at St. Mary's.", "Baptism"],
    ["He worked as a baker.", null],
  ])("%s", (sentence, event) => {
    expect(eventOfSentence(sentence)).toBe(event);
  });

  test("the first event named wins", () => {
    expect(eventOfSentence("He was born in Ohio and died in Utah.")).toBe("Birth");
  });
});

describe("findInlineCitationAnchors", () => {
  const anchors = findInlineCitationAnchors(BIO);

  test("finds every ref in the body, including the one that points back at a named ref", () => {
    expect(anchors).toHaveLength(4);
    expect(anchors.map((anchor) => anchor.event)).toEqual(["Birth", "Imprisonment", "Imprisonment", "Death"]);
    expect(anchors[3]).toMatchObject({ key: "", refName: "arolsen" });
  });

  test("gives the sentence each ref follows, and the same id to refs that follow the same sentence", () => {
    expect(anchors[0].sentence).toBe(
      "Alfred Algner, son of Reigner Algner and Emilia Tees (Kees?), was born on 23 June 1908, in Freiburg im Breisgau, Baden."
    );
    expect(anchors[1].sentence).toBe("Alfred was imprisoned first at Dachau and then at Mauthausen.");
    expect(anchors[1].sentenceId).toBe(anchors[2].sentenceId);
    expect(anchors[1].sentenceId).not.toBe(anchors[0].sentenceId);
  });

  test("a ref in the middle of a sentence takes the whole sentence", () => {
    const [anchor] = findInlineCitationAnchors("He was born in Ohio<ref>A source.</ref> on 4 May 1900. He died later.");
    expect(anchor.sentence).toBe("He was born in Ohio on 4 May 1900.");
  });

  test("does not end a sentence at an abbreviation", () => {
    const [anchor] = findInlineCitationAnchors(
      "He was baptized at St. Mary's church in St. Louis.<ref>A source.</ref>"
    );
    expect(anchor.sentence).toBe("He was baptized at St. Mary's church in St. Louis.");
  });

  test("ignores the Sources section", () => {
    expect(
      findInlineCitationAnchors("== Biography ==\nHe was born.<ref>One.</ref>\n== Sources ==\n<ref>Two.</ref>")
    ).toHaveLength(1);
  });

  test("names in quotes or without them", () => {
    const found = findInlineCitationAnchors("He was born in Ohio.<ref name=\"a b\">X.</ref> He died.<ref name='c' />");
    expect(found.map((anchor) => anchor.refName)).toEqual(["a b", "c"]);
  });
});

describe("applyInlineCitationAnchors", () => {
  const life = { birthYear: 1908, deathYear: 1940 };
  const references = () => [
    { Text: AROLSEN, RefName: "arolsen", "Record Type": [] },
    { Text: DACHAU.replace(/<br\/>/g, "<br>"), RefName: "", "Record Type": [] },
    { Text: NATIONAL.replace(/<br\/>/g, "<br>"), RefName: "", "Record Type": [] },
    { Text: FIND_A_GRAVE, RefName: "", "Record Type": ["Burial", "Death"] },
  ];
  const anchors = findInlineCitationAnchors(BIO);

  test("an untyped citation gets the type of the sentences it followed, by its text or its name", () => {
    const refs = references();
    applyInlineCitationAnchors(refs, anchors, life);
    expect(refs[0]["Record Type"]).toEqual(["Birth", "Death"]);
  });

  test("a birth citation with no year in its wording is given the birth year, so it is used for the birth", () => {
    const refs = references();
    applyInlineCitationAnchors(refs, anchors, life);
    expect(refs[0].Year).toBe("1908");
    const dated = [{ Text: AROLSEN, RefName: "arolsen", Year: "1909", "Record Type": [] }];
    applyInlineCitationAnchors(dated, anchors, life);
    expect(dated[0].Year).toBe("1909");
  });

  test("Find a Grave is not the death source when another source was cited for the death", () => {
    const refs = references();
    applyInlineCitationAnchors(refs, anchors, life);
    expect(refs[3]["Record Type"]).toEqual(["Burial"]);
  });

  test("a memorial that was only a death source becomes a burial source", () => {
    const refs = references();
    refs[3]["Record Type"] = ["Death"];
    applyInlineCitationAnchors(refs, anchors, life);
    expect(refs[3]["Record Type"]).toEqual(["Burial"]);
  });

  test("Find a Grave stays the death source when nothing else was cited for it", () => {
    const refs = references();
    const noDeathRef = anchors.filter((anchor) => anchor.event !== "Death");
    applyInlineCitationAnchors(refs, noDeathRef, life);
    expect(refs[3]["Record Type"]).toEqual(["Burial", "Death"]);
  });

  test("a sentence Auto Bio cannot write is kept with its citations, dated by them", () => {
    const refs = references();
    const result = applyInlineCitationAnchors(refs, anchors, life);
    expect(result.sentences).toEqual([
      {
        id: anchors[1].sentenceId,
        sentence: "Alfred was imprisoned first at Dachau and then at Mauthausen.",
        event: "Imprisonment",
        year: 1937,
      },
    ]);
    expect(refs[1].AnchorId).toBe(anchors[1].sentenceId);
    expect(refs[2].AnchorId).toBe(anchors[1].sentenceId);
    expect(refs[0].AnchorId).toBeUndefined();
  });

  test("keeps the way the death was put", () => {
    expect(applyInlineCitationAnchors(references(), anchors, life).deathVerb).toBe("was murdered");
    const plain = findInlineCitationAnchors("He died in Ohio on 4 May 1900.<ref>A source.</ref>");
    expect(applyInlineCitationAnchors([{ Text: "A source.", "Record Type": [] }], plain, {}).deathVerb).toBe("");
  });

  test("a citation that already has a type keeps it, and its sentence is not carried", () => {
    const refs = [{ Text: "A prison record.", RefName: "", "Record Type": ["Prison"] }];
    const found = findInlineCitationAnchors("He was imprisoned in Ohio.<ref>A prison record.</ref>");
    const result = applyInlineCitationAnchors(refs, found, {});
    expect(refs[0]["Record Type"]).toEqual(["Prison"]);
    expect(result.sentences).toEqual([]);
  });

  test("anchorKey is the same however the citation was read", () => {
    expect(anchorKey("A<br/>B &gt; C")).toBe(anchorKey("A<br>B > C"));
  });
});
