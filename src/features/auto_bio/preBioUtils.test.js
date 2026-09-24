import {
  extractPreBioNotes,
  findGenealogicallyDefinedLinePlacement,
  findTemplateDefinition,
  findTemplatesToKeepByName,
  getOneNameStudyCategories,
  getPreBioTextLines,
  isPreBioNoteLine,
  removeNotesBeforeBio,
  isGenealogicallyDefinedLink,
  sortStuffBeforeBioItems,
  splitStuffBeforeBioEntry,
  templateNameKey,
  withCanonicalTemplateName,
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

describe("findTemplatesToKeepByName", () => {
  const notability =
    '{{Notability\n|location=California\n|theme=Film\n|text=Carrie Fisher was best known for her portrayal of "Princess Leia Organa".}}';

  test("finds a multi-line Notability template", () => {
    const bioText = `== Biography ==\n${notability}\n\nCarrie Frances Fisher was born...`;

    expect(findTemplatesToKeepByName(bioText)).toEqual([notability]);
  });

  test("ignores other templates", () => {
    const bioText = "== Biography ==\n{{Died Young}}\n{{Notables Sticker|category=Actors}}";

    expect(findTemplatesToKeepByName(bioText)).toEqual([]);
  });

  test("returns each matching template once", () => {
    const bioText = "{{Notability}}\n== Biography ==\n{{Notability}}";

    expect(findTemplatesToKeepByName(bioText)).toEqual(["{{Notability}}"]);
  });

  test("returns an empty array for an empty bio", () => {
    expect(findTemplatesToKeepByName("")).toEqual([]);
  });
});

describe("getPreBioTextLines", () => {
  // Winder-432 has " [[Category: Darfield, Yorkshire]][[Category: Wombwell, Yorkshire]]".
  test("does not treat a line of several categories as text", () => {
    const bioText =
      "[[Category:Shoemakers]] [[Category: England, Publicans]]\n" +
      " [[Category: Darfield, Yorkshire]][[Category: Wombwell, Yorkshire]]\n" +
      "== Biography ==\nHe was born.";

    expect(getPreBioTextLines(bioText)).toEqual([]);
  });

  test("still keeps real text before the biography", () => {
    const bioText = "[[Category:Shoemakers]]\nThis profile needs work.\n== Biography ==\nHe was born.";

    expect(getPreBioTextLines(bioText)).toEqual(["This profile needs work."]);
  });

  test("keeps a category line with its comment out of the text", () => {
    const bioText = "[[Category:Featured]]<!--Star Wars-->\n== Biography ==\nShe was born.";

    expect(getPreBioTextLines(bioText)).toEqual([]);
  });
});

describe("isPreBioNoteLine", () => {
  test.each([
    ":'''Note 1:''' Savage gives Job Cole two additional sons.",
    "'''Note:''' Something worth recording.",
    "'''Notes'''",
    "*'''Note 2:''' Another one.",
  ])("matches %s", (line) => {
    expect(isPreBioNoteLine(line)).toBe(true);
  });

  test.each([
    "'''Notable''' people are not notes.",
    "{{Puritan Great Migration|GMB|1|424}}",
    "This profile needs disambiguating.",
    "",
  ])("does not match %s", (line) => {
    expect(isPreBioNoteLine(line)).toBe(false);
  });
});

describe("extractPreBioNotes", () => {
  test("separates note lines from everything else", () => {
    const lines = [
      "{{Puritan Great Migration|GMB|1|424}}",
      "",
      ":'''Note 1:''' Savage gives Job Cole two additional sons.<ref name=GMB>The Great Migration Begins.</ref>",
      ":'''Note 2:''' Zaccheus Cole of St. Olave made bequests.<ref name=GMB />",
      "",
    ];

    expect(extractPreBioNotes(lines)).toEqual({
      notes: [
        ":'''Note 1:''' Savage gives Job Cole two additional sons.<ref name=GMB>The Great Migration Begins.</ref>",
        ":'''Note 2:''' Zaccheus Cole of St. Olave made bequests.<ref name=GMB />",
      ],
      remaining: ["{{Puritan Great Migration|GMB|1|424}}", "", ""],
    });
  });

  test("takes indented continuation lines with the note", () => {
    const lines = [":'''Note:''' The first line.", ":and the rest of it.", "Not part of the note."];

    expect(extractPreBioNotes(lines)).toEqual({
      notes: [":'''Note:''' The first line.", ":and the rest of it."],
      remaining: ["Not part of the note."],
    });
  });

  test("leaves indented lines alone when there is no note above them", () => {
    const lines = [":Just an indented line.", "'''Notable''' is not a note."];

    expect(extractPreBioNotes(lines)).toEqual({ notes: [], remaining: lines });
  });
});

describe("getPreBioTextLines", () => {
  test("drops templates and categories but keeps other text", () => {
    const bioText = [
      "[[Category: Example]]",
      "{{Puritan Great Migration|GMB|1|424}}",
      "",
      ":'''Note 1:''' Savage gives Job Cole two additional sons.",
      "== Biography ==",
      "Job was born in England.",
    ].join("\n");

    expect(getPreBioTextLines(bioText)).toEqual(["", ":'''Note 1:''' Savage gives Job Cole two additional sons."]);
  });

  test("drops multi-line templates", () => {
    const bioText = ["{{Uncertain Existence", "|reason=No sources", "}}", "Some text.", "== Biography =="].join("\n");

    expect(getPreBioTextLines(bioText)).toEqual(["Some text."]);
  });

  test("returns nothing when there is no biography heading", () => {
    expect(getPreBioTextLines("Just some text.")).toEqual([]);
  });
});

describe("removeNotesBeforeBio", () => {
  test("takes out the notes above the heading and leaves the rest of the bio alone", () => {
    const bioText = [
      "{{Puritan Great Migration|GMB|1|424}}",
      "",
      ":'''Note 1:''' Savage gives Job Cole two additional sons.<ref name=GMB>The Great Migration Begins.</ref>",
      ":'''Note 2:''' Zaccheus Cole made bequests.<ref name=GMB />",
      "",
      "== Biography ==",
      "Job was born in England.<ref>A source.</ref>",
    ].join("\n");

    expect(removeNotesBeforeBio(bioText)).toBe(
      [
        "{{Puritan Great Migration|GMB|1|424}}",
        "",
        "",
        "== Biography ==",
        "Job was born in England.<ref>A source.</ref>",
      ].join("\n")
    );
  });

  test("leaves the bio untouched when there are no notes above the heading", () => {
    const bioText = "[[Category: Example]]\n== Biography ==\nJob was born in England.";

    expect(removeNotesBeforeBio(bioText)).toBe(bioText);
  });

  test("leaves the bio untouched when there is no biography heading", () => {
    const bioText = ":'''Note 1:''' A note with no heading below it.";

    expect(removeNotesBeforeBio(bioText)).toBe(bioText);
  });
});

describe("getOneNameStudyCategories", () => {
  test("turns the deprecated template into its category", () => {
    expect(getOneNameStudyCategories("{{One Name Study|name=Greer}}\n== Biography ==")).toEqual([
      "[[Category: Greer Name Study]]",
    ]);
  });

  test("handles spacing, case, underscores and multi-word names", () => {
    expect(getOneNameStudyCategories("{{ one_name_study | name = De la Mare }}")).toEqual([
      "[[Category: De la Mare Name Study]]",
    ]);
  });

  test("skips a study whose category is already there", () => {
    expect(
      getOneNameStudyCategories("[[Category: Greer Name Study]]\n{{One Name Study|name=Greer}}")
    ).toEqual([]);
  });

  test("skips a study that already has a located category", () => {
    expect(
      getOneNameStudyCategories("[[category: United States, Greer Name Study ]]\n{{One Name Study|name=Greer}}")
    ).toEqual([]);
  });

  test("doesn't treat a different study's category as a match", () => {
    expect(
      getOneNameStudyCategories("[[Category: McGreer Name Study]]\n{{One Name Study|name=Greer}}")
    ).toEqual(["[[Category: Greer Name Study]]"]);
  });

  test("returns one category per study", () => {
    expect(
      getOneNameStudyCategories("{{One Name Study|name=Greer}}\n{{One Name Study|name=Greer}}\n{{One Name Study|name=Brodie}}")
    ).toEqual(["[[Category: Greer Name Study]]", "[[Category: Brodie Name Study]]"]);
  });
});

describe("template names written without spaces", () => {
  const templates = [
    { name: "One Place Study", type: "Sticker", group: "Study" },
    { name: "Research Note Box", type: "Research Note Box", group: "Research Note Box" },
  ];

  test("templateNameKey ignores spaces, underscores and case", () => {
    expect(templateNameKey("OnePlaceStudy")).toBe(templateNameKey("One Place Study"));
    expect(templateNameKey("one_place_study")).toBe(templateNameKey("One Place Study"));
  });

  test("findTemplateDefinition finds the documented template", () => {
    expect(findTemplateDefinition("{{OnePlaceStudy|place=Solum, Telemark, Norway}}", templates)?.name).toBe(
      "One Place Study"
    );
    expect(findTemplateDefinition("{{OnePlace}}", templates)).toBeUndefined();
  });

  test("withCanonicalTemplateName fixes the name and keeps the parameters", () => {
    expect(withCanonicalTemplateName("{{OnePlaceStudy|place=Solum, Telemark, Norway}}", "One Place Study")).toBe(
      "{{One Place Study|place=Solum, Telemark, Norway}}"
    );
    expect(
      withCanonicalTemplateName(
        "{{OnePlaceStudy\n|place=Solum, Telemark, Norway\n|category=Grimholt, Solum, Telemark, Norway\n}}",
        "One Place Study"
      )
    ).toBe("{{One Place Study\n|place=Solum, Telemark, Norway\n|category=Grimholt, Solum, Telemark, Norway\n}}");
    expect(withCanonicalTemplateName("{{notability}}", "Notability")).toBe("{{Notability}}");
  });

  test("findTemplatesToKeepByName matches a lower-case name", () => {
    expect(findTemplatesToKeepByName("== Biography ==\n{{notability|theme=Film}}")).toEqual([
      "{{Notability|theme=Film}}",
    ]);
  });

  test("sortStuffBeforeBioItems keeps a box written without spaces", () => {
    expect(
      sortStuffBeforeBioItems(["{{ResearchNoteBox|status=Unconfirmed}}", "{{EasilyConfused|name=Greer}}"], {
        templates,
      })
    ).toEqual(["{{Easily Confused|name=Greer}}", "{{Research Note Box|status=Unconfirmed}}"]);
  });

  test("getOneNameStudyCategories handles {{OneNameStudy}}", () => {
    expect(getOneNameStudyCategories("{{OneNameStudy|name=Greer}}")).toEqual(["[[Category: Greer Name Study]]"]);
  });
});
