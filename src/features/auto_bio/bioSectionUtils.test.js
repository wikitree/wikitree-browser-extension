import { splitBioIntoSections } from "./bioSectionUtils.js";

function setBio(text) {
  document.body.innerHTML = '<textarea id="wpTextbox1"></textarea>';
  document.querySelector("#wpTextbox1").value = text;
}

describe("splitBioIntoSections", () => {
  test.each(["See also", "See Also", "SEE ALSO", "See  also"])(
    "files a '%s' heading under the See Also key",
    (heading) => {
      setBio(`== Biography ==\nText.\n== Sources ==\n<references />\n== ${heading} ==\n* [http://example.com Example]`);

      const sections = splitBioIntoSections();

      expect(sections["See Also"]).toBeTruthy();
      expect(sections["See Also"].text).toContain("* [http://example.com Example]");
    }
  );

  test("keeps a section with an unrecognised heading", () => {
    setBio("== Biography ==\nText.\n== Wife of Thomas Charlton ==\nThe DAR application gives her name.");

    const sections = splitBioIntoSections();

    expect(sections["Wife of Thomas Charlton"].text).toContain("The DAR application gives her name.");
  });

  test("keeps an Advance Directive section", () => {
    setBio("== Biography ==\nText.\n== Advance Directive ==\nWishes recorded here.");

    const sections = splitBioIntoSections();

    expect(sections["Advance Directive"].text).toContain("Wishes recorded here.");
  });
});
