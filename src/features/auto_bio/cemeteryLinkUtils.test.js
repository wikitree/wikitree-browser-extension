import { findCemeteryLink, linkCemetery } from "./cemeteryLinkUtils.js";
import { clearWikiLinks, configureWikiLinks, limitRepeatedLinks } from "./narrativePlaceUtils.js";

const OLD_BIO = `== Biography ==
See also:
* Monumental inscription. United States of America. [[Space:Fairmont_Cemetery_Raton_NM_USA|Fairmont Cemetery]], Raton, Colfax, New Mexico. 1928.
* Honeyfield, Harold R. ''[[Space:Fairmont_Cemetery_Raton_Colfax_Co_New_Mexico|Fairmont Cemetery, Raton, Colfax Co., New Mexico : a listing of burials as of Aug. 2007]]'' (H.R. Honeyfield 2007)`;
const CEMETERY = "Fairmont Cemetery, Raton, New Mexico, USA (plot: (old plat) Row P, Block 28)";

describe("findCemeteryLink", () => {
  test("uses a space link in the old bio whose text is the cemetery's name", () => {
    expect(findCemeteryLink(CEMETERY, { oldBio: OLD_BIO })).toEqual({
      kind: "space",
      title: "Fairmont_Cemetery_Raton_NM_USA",
    });
  });
  test("does not take the link to a book about the cemetery", () => {
    const bookOnly = OLD_BIO.split("\n").slice(0, 2).concat(OLD_BIO.split("\n")[3]).join("\n");
    expect(findCemeteryLink(CEMETERY, { oldBio: bookOnly })).toBeNull();
  });
  test("else the cemetery's category", () => {
    const categories = ["[[Category: Raton, New Mexico]]", "[[Category: Fairmont Cemetery, Raton, New Mexico]]"];
    expect(findCemeteryLink(CEMETERY, { oldBio: "", categories })).toEqual({
      kind: "category",
      title: "Fairmont Cemetery, Raton, New Mexico",
    });
  });
  test("else nothing", () => {
    expect(findCemeteryLink(CEMETERY, { oldBio: "", categories: ["[[Category: Raton, New Mexico]]"] })).toBeNull();
    expect(findCemeteryLink("", { oldBio: OLD_BIO })).toBeNull();
  });
});

describe("linkCemetery", () => {
  beforeEach(() => {
    clearWikiLinks();
    configureWikiLinks({ language: "en" });
  });
  test("links only the cemetery's name", () => {
    expect(linkCemetery(CEMETERY, { oldBio: OLD_BIO })).toBe(
      "[[Space:Fairmont_Cemetery_Raton_NM_USA|Fairmont Cemetery]], Raton, New Mexico, USA (plot: (old plat) Row P, Block 28)"
    );
  });
  test("keeps a plot that follows the name directly", () => {
    expect(linkCemetery("Fairmont Cemetery (plot: 5-6-4)", { oldBio: OLD_BIO })).toBe(
      "[[Space:Fairmont_Cemetery_Raton_NM_USA|Fairmont Cemetery]] (plot: 5-6-4)"
    );
  });
  test("is left as it is when there is no link, and is linked only once with the See also line left alone", () => {
    expect(linkCemetery("Oak Hill Cemetery, Ohio", { oldBio: OLD_BIO })).toBe("Oak Hill Cemetery, Ohio");
    const text = `He was buried in ${linkCemetery(CEMETERY, { oldBio: OLD_BIO })}. ${linkCemetery(CEMETERY, {
      oldBio: OLD_BIO,
    })}\n== Sources ==\n${OLD_BIO}`;
    expect(limitRepeatedLinks(text)).toContain(". Fairmont Cemetery, Raton");
    expect(limitRepeatedLinks(text)).toContain(
      "[[Space:Fairmont_Cemetery_Raton_NM_USA|Fairmont Cemetery]], Raton, Colfax"
    );
  });
});
