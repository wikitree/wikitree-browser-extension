import {
  buildCategoryChoicePrompt,
  buildPlaceCategoryQuery,
  orderCategoryNamesForChoice,
  parseCategoryChoice,
  parsePlaceCategoryQuery,
  pickPlaceCategory,
} from "./chat_place_category";

describe("place + topic category trees (live: Slave owners in Mississippi)", () => {
  const picker = [
    { category: "Adams County, Mississippi, Slave Owners" },
    { category: "Mississippi, Slave Owners" },
    { category: "United States of America, Slave Owners" },
  ];

  test("an exact Place, Topic category adds its tree to the AI's query with OR", () => {
    const query = 'Location=Mississippi CategoryWord="Slave Owners"';
    const parsed = parsePlaceCategoryQuery(query);
    expect(parsed).toMatchObject({ place: "Mississippi", topic: "Slave Owners", topics: ["Slave Owners"], baseTokens: [] });
    const name = pickPlaceCategory(picker, parsed.place, parsed.topic);
    expect(name).toBe("Mississippi, Slave Owners");
    expect(buildPlaceCategoryQuery(query, parsed.baseTokens, name)).toBe(
      'SubCat9="Mississippi, Slave Owners" OR Location=Mississippi CategoryWord="Slave Owners"'
    );
  });

  test("other terms go in both branches; CategoryFull underscores are read", () => {
    const query = "Location=Mississippi CategoryFull=Slave_Owners B1850";
    const parsed = parsePlaceCategoryQuery(query);
    expect(parsed).toMatchObject({ place: "Mississippi", topic: "Slave Owners", baseTokens: ["B1850"] });
    expect(buildPlaceCategoryQuery(query, parsed.baseTokens, "Mississippi, Slave Owners")).toBe(
      'B1850 SubCat9="Mississippi, Slave Owners" OR Location=Mississippi CategoryFull=Slave_Owners B1850'
    );
  });

  test("several category words are parsed (the caller keeps the AI's query)", () => {
    expect(parsePlaceCategoryQuery('Location=Tennessee CategoryWord="Civil War" CategoryWord=soldiers')).toMatchObject({
      place: "Tennessee",
      topics: ["Civil War", "soldiers"],
    });
  });

  test("declines other shapes", () => {
    expect(parsePlaceCategoryQuery('CategoryWord="Slave Owners"')).toBeNull();
    expect(parsePlaceCategoryQuery("Location=Mississippi Location=Alabama CategoryWord=Slave")).toBeNull();
    expect(parsePlaceCategoryQuery("Location=Mississippi CategoryWord=Slave OR Location=Alabama")).toBeNull();
    expect(parsePlaceCategoryQuery("Location=Mississippi CategoryFull=Mississippi__Slave_Owners")).toBeNull();
  });

  test("no exact Place, Topic category: nothing picked (London butchers, Natchez)", () => {
    expect(pickPlaceCategory([{ category: "Butchers' Company, City of London" }], "London", "Butchers")).toBe("");
    expect(pickPlaceCategory(picker, "Natchez", "Slave Owners")).toBe("");
    expect(pickPlaceCategory([], "Mississippi", "Slave Owners")).toBe("");
  });
  test("AI choice: the prompt lists the real categories; only a listed name is accepted", () => {
    const names = ["England, Potters", "Australia, Potters"];
    expect(buildCategoryChoicePrompt("Staffordshire potters", "Staffordshire", "Potters", names)).toContain("- England, Potters");
    expect(parseCategoryChoice('{"category":"england, potters"}', names)).toBe("England, Potters");
    expect(parseCategoryChoice('{"category":"United States, Potters"}', names)).toBe("");
    expect(parseCategoryChoice("not json", names)).toBe("");
  });

  test("broad categories survive the cap on the list the AI sees", () => {
    const regiments = Array.from({ length: 95 }, (_, i) => `${i + 1}th Regiment, Tennessee Infantry, United States Civil War`);
    const ordered = orderCategoryNamesForChoice([...regiments, "Tennessee, United States Civil War"]);
    expect(ordered).toHaveLength(80);
    expect(ordered[0]).toBe("Tennessee, United States Civil War");
  });

  test("a chosen broader tree keeps the location in its branch", () => {
    expect(buildPlaceCategoryQuery("Location=Staffordshire CategoryWord=Potters", ["Location=Staffordshire"], "England, Potters")).toBe(
      'Location=Staffordshire SubCat9="England, Potters" OR Location=Staffordshire CategoryWord=Potters'
    );
  });
});
