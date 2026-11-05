import { spell, useBritishSpelling } from "./spellingUtils.js";

describe("useBritishSpelling", () => {
  test("follows the profile's country before the editor's browser", () => {
    // Wood-24677, written by an editor whose browser is set to American English.
    expect(useBritishSpelling(["Cirencester, Gloucestershire, England"], "en-US")).toBe(true);
    // Fisher-6309, written by an editor in the UK.
    expect(useBritishSpelling(["Beverly Hills, Los Angeles, California, United States"], "en-GB")).toBe(false);
  });

  test("trusts the birth place over the death place", () => {
    expect(useBritishSpelling(["Stafford, Staffordshire, England", "Boston, Massachusetts, United States"], "")).toBe(
      true
    );
    expect(useBritishSpelling(["Boston, Massachusetts, United States", "Stafford, Staffordshire, England"], "")).toBe(
      false
    );
  });

  test("does not read New England as England", () => {
    expect(useBritishSpelling(["Hartford, New England"], "en-US")).toBe(false);
    // New England is itself a place in the United States, whatever the editor's browser says.
    expect(useBritishSpelling(["Hartford, New England"], "en-GB")).toBe(false);
    expect(useBritishSpelling(["Boston, New England", "Stafford, England"], "")).toBe(false);
  });

  test("reads a colonial American place as American", () => {
    // Charlton-598 was born in "Frederick County, Province of Maryland".
    expect(useBritishSpelling(["Frederick County, Province of Maryland"], "en-GB")).toBe(false);
  });

  test("falls back to the editor's browser when no place says", () => {
    expect(useBritishSpelling([], "en-GB")).toBe(true);
    expect(useBritishSpelling(["Frederick County"], "en-AU")).toBe(true);
    expect(useBritishSpelling([undefined, ""], "en-US")).toBe(false);
  });
});

describe("spell", () => {
  afterEach(() => {
    delete window.profilePerson;
  });

  test("writes baptised on an English profile", () => {
    window.profilePerson = { BirthLocation: "Cirencester, Gloucestershire, England" };
    expect(spell("baptized")).toBe("baptised");
    expect(spell("Baptized")).toBe("Baptised");
  });

  test("writes baptized on a profile in the United States", () => {
    window.profilePerson = { BirthLocation: "Beverly Hills, Los Angeles, California, United States" };
    expect(spell("baptized")).toBe("baptized");
  });
});
