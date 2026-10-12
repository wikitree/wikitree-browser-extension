import {
  pluralSurnameCandidates,
  pluralSurnameReading,
  singularSurname,
  singularSurnameRetryQuery,
  withSingularSurnames,
} from "./chat_surname_plural";

describe("singularSurname", () => {
  test.each([
    ["Alleys", "Alley"],
    ["Beacalls", "Beacall"],
    ["Joneses", "Jones"],
    ["Cooks", "Cook"],
    ["Bass", ""],
    ["Willis", ""],
    ["Cook", ""],
    ["Mas", ""],
  ])("%s → %s", (name, expected) => {
    expect(singularSurname(name)).toBe(expected);
  });
});

describe("singularSurnameRetryQuery", () => {
  test("rewrites only the surname term", () => {
    expect(singularSurnameRetryQuery("AllLastNames=Alleys DeathLocation=Motueka")).toEqual({
      query: "AllLastNames=Alley DeathLocation=Motueka",
      from: ["Alleys"],
      to: ["Alley"],
    });
  });
  test("keeps quotes", () => {
    expect(singularSurnameRetryQuery('LastNameAtBirth="Cooks" Location=Kent').query).toBe('LastNameAtBirth="Cook" Location=Kent');
  });
  test("null when nothing is plural", () => {
    expect(singularSurnameRetryQuery("AllLastNames=Cook DeathLocation=Motuekas")).toBeNull();
  });
});

// WikiTree+ counts probed 2026-10-12: [typed, singular]
describe("pluralSurnameReading", () => {
  test.each([
    ["Smiths", 31, 466090, "singular"],
    ["Beacalls", 0, 3000, "singular"],
    ["Browns", 57, 246312, "singular"],
    ["Halls", 937, 103899, "singular"],
    ["Hills", 6088, 87166, "offer"],
    ["Woods", 30247, 79340, "offer"],
    ["Owens", 22294, 21635, "typed"],
    ["Jones", 500000, 38, "typed"],
    ["Zzzs", 0, 0, "typed"],
    ["unknown counts", NaN, 466090, "typed"],
  ])("%s", (name, typed, singular, expected) => {
    expect(pluralSurnameReading(typed, singular)).toBe(expected);
  });
});

test("plural candidates and swapping just some of them", () => {
  const query = "AllLastNames=Smiths BirthLocation=Devon OR AllLastNames=Woods OR AllLastNames=Smith OR LastNameAtBirth=Willis";
  expect(pluralSurnameCandidates(query)).toEqual(["Smiths", "Woods"]);
  expect(withSingularSurnames(query, ["Smiths"])).toBe(
    "AllLastNames=Smith BirthLocation=Devon OR AllLastNames=Woods OR AllLastNames=Smith OR LastNameAtBirth=Willis"
  );
});
