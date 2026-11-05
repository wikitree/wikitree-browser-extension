import { lifeYearsText, matchPickerPeople, pickerFirstName, typedWikiTreeId, watchlistPickerPeople } from "./chat_who_picker";

const people = watchlistPickerPeople(
  [
    { Name: "Smith-1", RealName: "John Smith", BirthDate: "1850-03-01", DeathDate: "1912-00-00" },
    { profile: { Name: "Beacall-6", RealName: "Ian Beacall", BirthDate: "1970-00-00" } },
    { person: { Name: "Jones-5", RealName: "Mary (Smith) Jones", DeathDate: "1900-01-01" } },
    { Name: "Ångström-2", RealName: "Anders Ångström" },
    { Name: "Smithers-3", RealName: "Waylon Smithers" },
    { RealName: "no id" },
  ],
  (person) => person.RealName
);

describe("who picker (user, 2026-10-11)", () => {
  test("watchlist entries become people with years", () => {
    expect(people.map((p) => p.wtId)).toEqual(["Smith-1", "Beacall-6", "Jones-5", "Ångström-2", "Smithers-3"]);
    expect(people[0]).toMatchObject({ name: "John Smith", years: "1850–1912" });
    expect(people[1].years).toBe("b. 1970");
    expect(people[2].years).toBe("d. 1900");
    expect(lifeYearsText("0000-00-00", "")).toBe("");
  });
  test("every typed word starts a word of the name or ID", () => {
    expect(matchPickerPeople(people, "smi").map((p) => p.wtId)).toEqual(["Smith-1", "Jones-5", "Smithers-3"]);
    expect(matchPickerPeople(people, "john smi").map((p) => p.wtId)).toEqual(["Smith-1"]);
    expect(matchPickerPeople(people, "beacall-6").map((p) => p.wtId)).toEqual(["Beacall-6"]);
    expect(matchPickerPeople(people, "angst").map((p) => p.wtId)).toEqual(["Ångström-2"]);
    expect(matchPickerPeople(people, "ith")).toEqual([]);
    expect(matchPickerPeople(people, "  ")).toEqual([]);
  });
  test("a name starting with the text comes first", () => {
    expect(matchPickerPeople(people, "mary").map((p) => p.wtId)).toEqual(["Jones-5"]);
    expect(matchPickerPeople(people, "way").map((p) => p.wtId)).toEqual(["Smithers-3"]);
    expect(matchPickerPeople(people, "smith").map((p) => p.wtId)[0]).toBe("Smith-1");
  });
  test("at most eight", () => {
    const many = watchlistPickerPeople(Array.from({ length: 50 }, (_, i) => ({ Name: `Lee-${i + 1}`, RealName: `Ann Lee` })));
    expect(matchPickerPeople(many, "ann")).toHaveLength(8);
  });
  test("a typed WikiTree ID", () => {
    expect(typedWikiTreeId("beacall-6")).toBe("Beacall-6");
    expect(typedWikiTreeId(" Darwin-15 ")).toBe("Darwin-15");
    expect(typedWikiTreeId("Charles Darwin")).toBe("");
    expect(typedWikiTreeId("born 1850-1900")).toBe("");
  });
  test("first name for the hint", () => {
    expect(pickerFirstName({ name: "Cyrus Weatherall" })).toBe("Cyrus");
    expect(pickerFirstName({ name: "Darwin-15" })).toBe("");
  });
});
