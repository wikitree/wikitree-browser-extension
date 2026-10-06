import { accessedDate, expandTemplateCitation, isBareTemplateSource } from "./templateCitationUtils.js";

const date = new Date(2026, 7, 24);

describe("accessedDate", () => {
  test("is day, short month and year", () => {
    expect(accessedDate(date)).toBe("24 Aug 2026");
    expect(accessedDate(new Date(2026, 0, 5))).toBe("5 Jan 2026");
  });
});

describe("expandTemplateCitation", () => {
  test("expands a FamilySearch template", () => {
    expect(expandTemplateCitation("{{FamilySearch|LRM9-TM4}}", "Firman Joseph Robinson", date)).toBe(
      "'''Family Tree''': database, FamilySearch (http://familysearch.org/ : accessed 24 Aug 2026), entry for Firman Joseph Robinson ({{FamilySearch|LRM9-TM4}}); contributed by various users."
    );
  });

  test("expands an Ancestry Tree template", () => {
    expect(expandTemplateCitation("* {{Ancestry Tree|16950920|441412214}}", "Firman Joseph Robinson", date)).toBe(
      "'''Family Tree''': database, Ancestry (https://www.ancestry.com/ : accessed 24 Aug 2026), entry for Firman Joseph Robinson {{Ancestry Tree|16950920|441412214}}."
    );
  });

  test("leaves a source that has anything else in it alone", () => {
    const text = "Birth record, {{FamilySearch|LRM9-TM4}}, page 3";
    expect(expandTemplateCitation(text, "X Y", date)).toBe(text);
    const full =
      "'''Family Tree''': database, FamilySearch (...), entry for X ({{FamilySearch|LRM9-TM4}}); contributed by various users.";
    expect(expandTemplateCitation(full, "X Y", date)).toBe(full);
  });

  test("leaves out the name when there isn't one", () => {
    expect(expandTemplateCitation("{{FamilySearch|LRM9-TM4}}", "", date)).toContain(
      "), entry ({{FamilySearch|LRM9-TM4}})"
    );
  });
});

describe("isBareTemplateSource", () => {
  test("is true only for a source that is just the template", () => {
    expect(isBareTemplateSource("{{FamilySearch|LRM9-TM4}}")).toBe(true);
    expect(isBareTemplateSource("{{Ancestry Tree|1|2}}.")).toBe(true);
    expect(isBareTemplateSource("See {{FamilySearch|LRM9-TM4}}")).toBe(false);
  });
});
