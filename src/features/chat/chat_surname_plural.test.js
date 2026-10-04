import { singularSurname, singularSurnameRetryQuery } from "./chat_surname_plural";

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
