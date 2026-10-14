import { biographyText, firstDate, formBioDifferences, formBioDifferencesMessage } from "./chat_edit_consistency";

const DENNIS = { firstNames: ["Dennis"], gender: "Male", name: "Dennis Nothstein" };
const BIO = `{{Unsourced}}
== Biography ==
'''Dennis Nothstein''' was born on 24 May 1844 in Carbon, Pennsylvania, United States, son of [[Nothstein-50|Daniel Nothstein]] (1812–~1890) and [[Zeigler-508|Anna Zeigler]] (1814–1880).<ref>Birth record</ref>

Dennis died on 8 December 1908 in Allentown, Lehigh, Pennsylvania, aged 64.<ref name="Death_1">Grave</ref>

== Research Notes ==
Some say Dennis was born in 1843 in Ohio.
== Sources ==
<references />`;
const FORM = { BirthDate: "24 May 1844", BirthLocation: "Carbon, Pennsylvania, United States", DeathDate: "8 Dec 1908", DeathLocation: "Allentown, Lehigh, Pennsylvania, United States" };

describe("firstDate", () => {
  test.each([
    ["24 May 1844", { year: 1844, month: 5, day: 24 }],
    ["on the 24th of May, 1844", { year: 1844, month: 5, day: 24 }],
    ["May 24, 1844", { year: 1844, month: 5, day: 24 }],
    ["Dec 1908", { year: 1908, month: 12 }],
    ["1844-05-24", { year: 1844, month: 5, day: 24 }],
    ["about 1844", { year: 1844 }],
    ["no date here", null],
  ])("%s", (text, date) => {
    expect(firstDate(text)).toEqual(date);
  });
});

test("biographyText: only the Biography section, without markup", () => {
  const text = biographyText(BIO);
  expect(text).toMatch(/^Dennis Nothstein was born on 24 May 1844 in Carbon, Pennsylvania, United States, son of Daniel Nothstein/);
  expect(text).not.toMatch(/Ohio|ref|Unsourced|Birth record/);
});

describe("formBioDifferences", () => {
  test("agreeing form and biography: nothing to say", () => {
    expect(formBioDifferences(FORM, BIO, DENNIS)).toEqual([]);
  });

  test("a different year, day and place", () => {
    const differences = formBioDifferences({ ...FORM, BirthDate: "24 May 1845", DeathDate: "9 Dec 1908", DeathLocation: "Reading, Berks, Pennsylvania" }, BIO, DENNIS);
    expect(differences.map((d) => d.text)).toEqual([
      "Birth year: the form says 24 May 1845, the biography says 24 May 1844.",
      "Death day: the form says 9 December 1908, the biography says 8 December 1908.",
      "Death place: the form says Reading, Berks, Pennsylvania, the biography says Allentown, Lehigh, Pennsylvania.",
    ]);
  });

  test("a parent's dates and a relative's death aren't his", () => {
    const bio = "== Biography ==\nDennis was born in 1844, son of Daniel Nothstein (1812–1890). Dennis's wife died in 1900. After his father died in 1890, Dennis moved to Allentown.";
    expect(formBioDifferences({ BirthDate: "1844", DeathDate: "" }, bio, DENNIS)).toEqual([]);
  });

  test("by pronoun", () => {
    const bio = "== Biography ==\nDennis Nothstein was born in 1844. He died in 1910 in Allentown.";
    expect(formBioDifferences({ BirthDate: "1844", DeathDate: "1908", DeathLocation: "Allentown, Pennsylvania" }, bio, DENNIS).map((d) => d.text)).toEqual([
      "Death year: the form says 1908, the biography says 1910.",
    ]);
  });

  test("one side has it, the other doesn't", () => {
    const bio = "== Biography ==\nDennis Nothstein was born in 1844 in Carbon, Pennsylvania.";
    const differences = formBioDifferences({ BirthDate: "", BirthLocation: "", DeathDate: "8 Dec 1908", DeathLocation: "" }, bio, DENNIS);
    expect(differences.map((d) => d.text)).toEqual([
      "The biography gives a birth date (1844), but the form's birth date is empty.",
      "The biography gives a birth place (Carbon, Pennsylvania), but the form's birth place is empty.",
      "The form has death details, but the biography doesn't say when or where Dennis Nothstein died.",
    ]);
    expect(formBioDifferencesMessage(differences)).toMatch(/\(To write it from the form: "add death"\.\)$/);
    const buried = formBioDifferences({ BirthDate: "1844" }, "== Biography ==\nDennis was born in 1844. He was buried in Allentown.", DENNIS);
    expect(buried.map((d) => d.text)).toEqual(["The biography mentions a burial, but the form's death date and place are empty."]);
  });

  test("county words and extra parts don't count as different places", () => {
    const bio = "== Biography ==\nDennis was born in Carbon County, Pennsylvania in 1844.";
    expect(formBioDifferences({ BirthDate: "1844", BirthLocation: "Carbon, Pennsylvania, United States" }, bio, DENNIS)).toEqual([]);
  });
});

import { editPagePerson, isFormBioCheckPrompt } from "./chat_edit_consistency";

test.each(["Check the bio against the form", "compare the form and the biography", "Does the bio match the form?", "do the form and bio agree?", "check for conflicts", "check dates"])(
  "check prompt: %s",
  (prompt) => {
    expect(isFormBioCheckPrompt(prompt, { onEditPage: true })).toBe(true);
    expect(isFormBioCheckPrompt(prompt)).toBe(false);
  }
);

test("the edit page's person: first, preferred and nicknames, and gender", () => {
  document.body.innerHTML = '<div id="pageData" data-mgender="Male"></div><input id="mFirstName" value="Dennis"><input id="mRealName" value="Dennis"><input id="mNicknames" value="Denny">';
  expect(editPagePerson(document, "Dennis Nothstein")).toEqual({ firstNames: ["Dennis", "Denny"], gender: "Male", name: "Dennis Nothstein" });
});
