// dateUtils reaches into the extension core, which needs the browser extension API.
jest.mock("../../core/common", () => ({ isOK: (value) => !!value }));
jest.mock("../change_family_lists/change_family_lists_age", () => ({ getAge: () => "" }));

import { accessedDate, expandTemplateCitation, treeProfileOfSource } from "./templateCitationUtils.js";

const date = new Date(2026, 7, 24);
const FS =
  "'''Family Tree''': database, FamilySearch (http://familysearch.org/ : accessed 24 Aug 2026), entry for Firman Joseph Robinson ({{FamilySearch|LCJ1-DY7}}); contributed by various users.";
const ANC =
  "'''Family Tree''': database, Ancestry (https://www.ancestry.com/ : accessed 24 Aug 2026), entry for Firman Joseph Robinson {{Ancestry Tree|16950920|441412223}}.";

describe("accessedDate", () => {
  test("is day, short month and year", () => {
    expect(accessedDate(date)).toBe("24 Aug 2026");
    expect(accessedDate(new Date(2026, 0, 5))).toBe("5 Jan 2026");
  });
});

describe("treeProfileOfSource", () => {
  test.each([
    ["{{FamilySearch|LCJ1-DY7}}", { familySearch: "LCJ1-DY7" }],
    ["* {{FamilySearch|LCJ1-DY7}}.", { familySearch: "LCJ1-DY7" }],
    ["https://www.familysearch.org/en/tree/person/LCJ1-DY7", { familySearch: "LCJ1-DY7" }],
    ["familysearch.org/en/tree/person/LCJ1-DY7".replace(/^/, "https://"), { familySearch: "LCJ1-DY7" }],
    ["https://www.familysearch.org/tree/person/details/LCJ1-DY7", { familySearch: "LCJ1-DY7" }],
    ["[https://www.familysearch.org/en/tree/person/details/LCJ1-DY7 FamilySearch tree]", { familySearch: "LCJ1-DY7" }],
    ["https://ancestors.familysearch.org/en/LCJ1-DY7/firman-joseph-robinson-1901-1970", { familySearch: "LCJ1-DY7" }],
    ["{{Ancestry Tree|16950920|441412223}}", { ancestryTree: "16950920", ancestryPerson: "441412223" }],
    [
      "https://www.ancestry.com/family-tree/person/tree/16950920/person/441412223/facts",
      { ancestryTree: "16950920", ancestryPerson: "441412223" },
    ],
    [
      "https://www.ancestry.co.uk/family-tree/person/tree/16950920/person/441412223",
      { ancestryTree: "16950920", ancestryPerson: "441412223" },
    ],
  ])("%s", (text, expected) => {
    expect(treeProfileOfSource(text)).toEqual(expected);
  });

  test.each([
    "Birth record, {{FamilySearch|LCJ1-DY7}}, page 3",
    "See https://www.familysearch.org/en/tree/person/LCJ1-DY7 for the tree",
    "https://www.familysearch.org/ark:/61903/1:1:ABCD-123",
    "https://www.example.com/tree/person/LCJ1-DY7",
    "",
  ])("is not a tree profile: %s", (text) => {
    expect(treeProfileOfSource(text)).toBeNull();
  });
});

describe("expandTemplateCitation", () => {
  const name = "Firman Joseph Robinson";

  test("a FamilySearch template or link becomes the citation, with the template", () => {
    expect(expandTemplateCitation("{{FamilySearch|LCJ1-DY7}}", name, date)).toBe(FS);
    expect(expandTemplateCitation("https://www.familysearch.org/en/tree/person/LCJ1-DY7", name, date)).toBe(FS);
  });

  test("an Ancestry template or link becomes the citation, with the template", () => {
    expect(expandTemplateCitation("* {{Ancestry Tree|16950920|441412223}}", name, date)).toBe(ANC);
    expect(
      expandTemplateCitation(
        "https://www.ancestry.com/family-tree/person/tree/16950920/person/441412223/facts",
        name,
        date
      )
    ).toBe(ANC);
  });

  test("leaves anything else, including a full citation, alone", () => {
    expect(expandTemplateCitation(FS, name, date)).toBe(FS);
    const other = "Birth record, {{FamilySearch|LCJ1-DY7}}, page 3";
    expect(expandTemplateCitation(other, name, date)).toBe(other);
  });

  test("leaves out the name when there isn't one", () => {
    expect(expandTemplateCitation("{{FamilySearch|LCJ1-DY7}}", "", date)).toContain(
      "), entry ({{FamilySearch|LCJ1-DY7}})"
    );
  });
});
