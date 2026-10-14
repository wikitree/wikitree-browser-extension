import { parseConnectionTargetHints, withTypedTargetHints } from "./chat_connection_target_hints";

describe("parseConnectionTargetHints", () => {
  test.each([
    ["Bob Jones in Liverpool 1923", { name: "Bob Jones", birthYear: 1923, deathYear: null, place: "Liverpool", placeEvent: "" }],
    ["Bob Jones 1923 Liverpool", { name: "Bob Jones", birthYear: 1923, place: "Liverpool", placeEvent: "" }],
    ["Bob Jones 1923", { name: "Bob Jones", birthYear: 1923, deathYear: null, place: "" }],
    ["Bob Jones, Liverpool, 1923", { name: "Bob Jones", birthYear: 1923, place: "Liverpool" }],
    ["Bob Jones from Liverpool, Lancashire", { name: "Bob Jones", birthYear: null, place: "Liverpool, Lancashire" }],
    ["Bob Jones of Liverpool", { name: "Bob Jones", place: "Liverpool" }],
    ["Bob Jones born 1923", { name: "Bob Jones", birthYear: 1923 }],
    ["Bob Jones b. 1923", { name: "Bob Jones", birthYear: 1923 }],
    ["Bob Jones born about 1923 in Liverpool", { name: "Bob Jones", birthYear: 1923, place: "Liverpool", placeEvent: "birth" }],
    ["Bob Jones born in Liverpool in 1923", { name: "Bob Jones", birthYear: 1923, place: "Liverpool", placeEvent: "birth" }],
    ["Bob Jones died 1990", { name: "Bob Jones", birthYear: null, deathYear: 1990 }],
    ["Bob Jones d. 1990 in Liverpool", { name: "Bob Jones", deathYear: 1990, place: "Liverpool", placeEvent: "death" }],
    ["Bob Jones born 1923 died 1990 in Liverpool", { birthYear: 1923, deathYear: 1990, place: "Liverpool", placeEvent: "" }],
    ["Bob Jones died in Liverpool", { name: "Bob Jones", place: "Liverpool", placeEvent: "death" }],
    ["Bob Jones (1923-1990)", { name: "Bob Jones", birthYear: 1923, deathYear: 1990 }],
    ["Bob Jones 1923–1990 Liverpool", { name: "Bob Jones", birthYear: 1923, deathYear: 1990, place: "Liverpool" }],
    ["Bob Jones (1923-)", { name: "Bob Jones", birthYear: 1923, deathYear: null }],
    ["Bob Jones born 12 May 1923", { name: "Bob Jones", birthYear: 1923 }],
    ["Robert William Jones in Liverpool 1923?", { name: "Robert William Jones", birthYear: 1923, place: "Liverpool" }],
    ["Bob Jones, 1923, Liverpool, Lancashire, England", { name: "Bob Jones", birthYear: 1923, place: "Liverpool, Lancashire, England" }],
    ["Riël Smit 1950 Kaapstad", { name: "Riël Smit", birthYear: 1950, place: "Kaapstad" }],
  ])("%s", (target, expected) => {
    expect(parseConnectionTargetHints(target)).toMatchObject(expected);
  });

  test.each([
    "Bob Jones",
    "Riël Smit",
    "Jones-1923",
    "Catherine of Aragon",
    "John of Gaunt",
    "Bob Jones in the army",
    "Bob Jones in Liverpool in 1923 and 1950 again 7",
    "Bob Jones 1990-1923",
    "",
  ])("declines %p", (target) => {
    expect(parseConnectionTargetHints(target)).toBeNull();
  });
});

describe("withTypedTargetHints", () => {
  test("what was typed comes first", () => {
    const ai = { searchName: "Robert Jones", birthDate: "1925-03-01", birthLocation: "Wales" };
    expect(withTypedTargetHints(ai, { name: "Bob Jones", birthYear: 1923, deathYear: null, place: "Liverpool", placeEvent: "" })).toEqual({
      searchName: "Robert Jones",
      birthYear: 1923,
      birthLocation: "Liverpool",
      placeAnywhere: "Liverpool",
    });
  });

  test("an AI birth date in the typed year is kept; a death year means not living", () => {
    expect(withTypedTargetHints({ birthDate: "1923-03-01" }, { birthYear: 1923, deathYear: 1990, place: "Liverpool", placeEvent: "death" })).toEqual({
      birthDate: "1923-03-01",
      birthYear: 1923,
      deathDate: "1990",
      deathYear: 1990,
      isLiving: false,
      deathLocation: "Liverpool",
      placeAnywhere: "",
    });
  });

  test("no AI reading, no hints", () => {
    expect(withTypedTargetHints(null, { birthYear: 1923, deathYear: null, place: "" })).toEqual({ birthYear: 1923 });
    expect(withTypedTargetHints(null, null)).toBeNull();
  });
});
