import { privateFamilyMemberFromListItem } from "./privateFamilyUtils.js";

/* The family list on the edit page (Fisher-6309) shows living relatives without a link, as
"private daughter (1990s - unknown)". The API does not return them either. */
describe("privateFamilyMemberFromListItem", () => {
  test("reads a private daughter", () => {
    const member = privateFamilyMemberFromListItem("private daughter (1990s - unknown)", "Children", 0);

    expect(member).toMatchObject({
      Gender: "Female",
      Privacy: 20,
      IsPrivate: true,
      BirthDateDecade: "1990s",
      OtherParentUnknown: true,
    });
    expect(member.Privacy).toBeLessThan(30);
  });

  test("reads a private brother and sister", () => {
    expect(privateFamilyMemberFromListItem("private brother (1950s - unknown)", "Siblings", 0).Gender).toBe("Male");
    expect(privateFamilyMemberFromListItem("private sister (1960s - unknown)", "Siblings", 1).Gender).toBe("Female");
  });

  test("reads a private spouse with no relation word", () => {
    const member = privateFamilyMemberFromListItem("private (1940s - unknown)", "Spouses", 0);

    expect(member.Gender).toBe("");
    expect(member.marriage_date).toBe("0000-00-00");
    expect(member.OtherParentUnknown).toBeUndefined();
  });

  test("reads the bracketed form used on the profile page", () => {
    expect(privateFamilyMemberFromListItem("[private husband (1940s - unknown)]", "Spouses", 0).Gender).toBe("Male");
  });

  test("gives each private relative an id of their own", () => {
    const first = privateFamilyMemberFromListItem("private son (1980s - unknown)", "Children", 0);
    const second = privateFamilyMemberFromListItem("private son (1980s - unknown)", "Children", 1);

    expect(first.Id).not.toBe(second.Id);
    // Never matches a relative whose Father/Mother is missing or 0.
    expect(first.Id).toBeLessThan(0);
  });

  test("ignores a family member who is not private", () => {
    expect(privateFamilyMemberFromListItem("Ann (Bailey) Wood Bailey-17812", "Spouses", 0)).toBeNull();
    expect(privateFamilyMemberFromListItem("", "Children", 0)).toBeNull();
  });

  test("copes with a private relative with no dates", () => {
    const member = privateFamilyMemberFromListItem("private daughter", "Children", 0);

    expect(member.Gender).toBe("Female");
    expect(member.BirthDateDecade).toBeUndefined();
  });
});
