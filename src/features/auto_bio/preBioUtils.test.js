import {
  findGenealogicallyDefinedLinePlacement,
  isGenealogicallyDefinedLink,
  sortStuffBeforeBioItems,
  splitStuffBeforeBioEntry,
} from "./preBioUtils.js";

describe("splitStuffBeforeBioEntry", () => {
  test("preserves the genealogically defined space link with bold markup intact", () => {
    const line = "'''[[Space:Genealogically Defined|Genealogically Defined]]'''";

    expect(splitStuffBeforeBioEntry(line)).toEqual({
      items: [line],
      consumeNextLine: false,
    });
  });
});

describe("sortStuffBeforeBioItems", () => {
  const genealogicallyDefined = "'''[[Space:Genealogically Defined|Genealogically Defined]]'''";
  const templatesObject = {
    templates: [
      { name: "ResearchNoteBox", group: "Research Note Box" },
      { name: "ProjectBox", type: "Project Box" },
    ],
  };

  test("places genealogically defined below categories and above templates", () => {
    const items = [
      "{{ProjectBox}}",
      genealogicallyDefined,
      "[[Category: England, Example]]",
      "{{ResearchNoteBox}}",
      "{{Easily Confused}}",
    ];

    expect(sortStuffBeforeBioItems(items, templatesObject)).toEqual([
      "[[Category: England, Example]]",
      genealogicallyDefined,
      "{{Easily Confused}}",
      "{{ResearchNoteBox}}",
      "{{ProjectBox}}",
    ]);
  });

  test("keeps category comments with categories ahead of genealogically defined", () => {
    const items = [genealogicallyDefined, "[[Category: England, Example]]", "<!--category note-->", "{{ProjectBox}}"];

    expect(sortStuffBeforeBioItems(items, templatesObject)).toEqual([
      "[[Category: England, Example]]",
      "<!--category note-->",
      genealogicallyDefined,
      "{{ProjectBox}}",
    ]);
  });
});

describe("isGenealogicallyDefinedLink", () => {
  test("matches the preserved genealogically defined link", () => {
    expect(isGenealogicallyDefinedLink("'''[[Space:Genealogically Defined|Genealogically Defined]]'''")).toBe(true);
  });
});

describe("findGenealogicallyDefinedLinePlacement", () => {
  const genealogicallyDefined = "'''[[Space:Genealogically Defined|Genealogically Defined]]'''";

  test("identifies the line when it appears before the biography heading", () => {
    const bioText = `[[Category: Example]]\n${genealogicallyDefined}\n== Biography ==\n{{Sticker}}`;

    expect(findGenealogicallyDefinedLinePlacement(bioText)).toEqual({
      line: genealogicallyDefined,
      beforeBiography: true,
    });
  });

  test("identifies the line when it appears after the biography heading", () => {
    const bioText = `[[Category: Example]]\n== Biography ==\n${genealogicallyDefined}\n{{Sticker}}`;

    expect(findGenealogicallyDefinedLinePlacement(bioText)).toEqual({
      line: genealogicallyDefined,
      beforeBiography: false,
    });
  });
});
