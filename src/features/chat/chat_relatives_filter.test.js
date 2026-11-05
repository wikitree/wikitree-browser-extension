// User, 2026-10-17: "Can you tell me which of my ancestors are members of the guitarists category?"
import { cleanCategoryName, parseRelativesFilterPrompt, relativesFilterQuery } from "./chat_relatives_filter";

const mine = (scope, category = "Guitarists", filters = [], more = {}) => ({ filters, firstName: "", lastName: "", category, birthPlace: "", deathPlace: "", date: null, owner: "my", scope, ...more });

describe("a category or filter among someone's relatives", () => {
  test.each([
    ["Can you tell me which of my ancestors are members of the guitarists category?", mine("ancestors")],
    ["which of my ancestors are in the Guitarists category", mine("ancestors")],
    ["who of my ancestors is in the Guitarists category", mine("ancestors")],
    ["my ancestors in the Guitarists category", mine("ancestors")],
    ["my ancestors in category Guitarists", mine("ancestors")],
    ["any of my ancestors in the Guitarists category?", mine("ancestors")],
    ["are any of my ancestors in the Guitarists category?", mine("ancestors")],
    ["do I have any ancestors in the Guitarists category?", mine("ancestors")],
    ["which of my ancestors are members of Category: Guitarists", mine("ancestors")],
    ["my ancestors in [[Category:Guitarists]]", mine("ancestors")],
    ["which of my ancestors belong to the Guitarists category", mine("ancestors")],
    ["my ancestors categorised as Guitarists", mine("ancestors")],
    ["ancestors of mine in the Guitarists category", mine("ancestors")],
    ["is anyone in my family tree in the Guitarists category", mine("cc7")],
    // (2026-10-18: a place after the category is read too)
    ["my ancestors in category Guitarists born in Kent", mine("ancestors", "Guitarists", [], { birthPlace: "Kent" })],
    ["my ancestors with no sources in the Guitarists category born in Kent", mine("ancestors", "Guitarists", ["unsourced"], { birthPlace: "Kent" })],
    ["which of my descendants are in the Guitarists category", mine("descendants")],
    ["who among my descendants is in the Guitarists category", mine("descendants")],
    ["which of my relatives are in the Guitarists category", mine("cc7")],
    ["anyone in my CC7 in the Guitarists category", mine("cc7")],
    ["my cc7 in category Guitarists", mine("cc7")],
    ["my ancestors in the Mayflower Passengers category", mine("ancestors", "Mayflower Passengers")],
    ["my ancestors in the category Wem, Shropshire", mine("ancestors", "Wem, Shropshire")],
    ["which of her ancestors are in the Methodists category", mine("ancestors", "Methodists", [], { owner: "her" })],
    ["my unsourced ancestors in the Guitarists category", mine("ancestors", "Guitarists", ["unsourced"])],
    ["my female ancestors in the Methodists category", mine("ancestors", "Methodists", ["female"])],
    ["which of Cook-8721's ancestors are in the Methodists category", mine("ancestors", "Methodists", [], { owner: "Cook-8721" })],
  ])("%s", (prompt, expected) => {
    expect(parseRelativesFilterPrompt(prompt)).toEqual(expected);
  });

  test.each([
    // (no relatives, or a word it doesn't know: other readers or the AI)
    "who is in the Guitarists category",
    "people in the Guitarists category born in Liverpool",
    "which of Ellen's ancestors are in the Methodists category",
    "my ancestors and my cousins in the Guitarists category",
    "which of my ancestors were guitarists",
  ])("not this: %s", (prompt) => {
    expect(parseRelativesFilterPrompt(prompt)).toBeNull();
  });

  test.each([
    ["my unsourced ancestors", "ancestors", ["unsourced"]],
    ["my ancestors with no sources", "ancestors", ["unsourced"]],
    ["which of my ancestors need sources", "ancestors", ["unsourced"]],
    ["which of my ancestors still need sources?", "ancestors", ["unsourced"]],
    ["my ancestors without any sources", "ancestors", ["unsourced"]],
    ["my descendants that have no sources", "descendants", ["unsourced"]],
    ["my famous relatives", "cc7", ["notables"]],
    ["notables in my ancestors", "ancestors", ["notables"]],
    ["which of my ancestors are notable", "ancestors", ["notables"]],
    ["my male ancestors", "ancestors", ["male"]],
    ["the women in my family", "cc7", ["female"]],
    ["my unsourced female ancestors", "ancestors", ["unsourced", "female"]],
  ])("%s", (prompt, scope, filters) => {
    expect(parseRelativesFilterPrompt(prompt)).toEqual(mine(scope, "", filters));
  });

  test.each([
    ["my ancestors named John", { firstName: "John" }],
    ["which of my ancestors were called mary", { firstName: "Mary" }],
    ["my ancestors with the first name Thomas", { firstName: "Thomas" }],
    ["my ancestors with the surname Smith", { lastName: "Smith" }],
    ["which of my ancestors had the surname Beacall", { lastName: "Beacall" }],
    ["my female ancestors named Mary with the surname Smith", { firstName: "Mary", lastName: "Smith", filters: ["female"] }],
    ["my ancestors named John Smith", null],
  ])("names: %s", (prompt, names) => {
    const { filters = [], ...rest } = names || {};
    expect(parseRelativesFilterPrompt(prompt)).toEqual(names && mine("ancestors", "", filters, rest));
  });

  test.each([
    "my ancestors",
    "my male and female ancestors",
    "my female ancestors born in my village",
    "my female ancestors born in the Kent ancestors",
    "am I related to anyone famous",
    "my sources",
    "my Kent ancestors",
    "my Smith ancestors",
  ])("no filter read: %s", (prompt) => {
    expect(parseRelativesFilterPrompt(prompt)).toBeNull();
  });

  // Imagined corpus AC4–AC6 (2026-10-18): a place and a date with the filters
  test.each([
    ["my female ancestors born in Wales", { filters: ["female"], birthPlace: "Wales", date: null, owner: "my", scope: "ancestors" }],
    ["women among my ancestors born in Ireland", { filters: ["female"], birthPlace: "Ireland", owner: "my" }],
    ["male descendants born after 1900", { filters: ["male"], date: { event: "born", direction: "after", value: "1900" }, owner: "", scope: "descendants" }],
    ["my female ancestors born in the 1850s", { birthPlace: "", date: { event: "born", direction: "between", value: "1850-1859" } }],
    [
      "which of my ancestors in the Methodists category died in Wales before 1850",
      { category: "Methodists", deathPlace: "Wales", date: { event: "died", direction: "before", value: "1850" } },
    ],
    ["my ancestors called Mary born in Kent", { firstName: "Mary", birthPlace: "Kent" }],
  ])("place and date: %s", (prompt, expected) => {
    expect(parseRelativesFilterPrompt(prompt)).toMatchObject(expected);
  });

  test("names and the canonical form", () => {
    expect(
      relativesFilterQuery({ filters: ["female"], birthPlace: "Wales", date: { event: "born", direction: "before", value: "1900" }, owner: "", scope: "ancestors" })
    ).toBe("female birthplace Wales born before 1900 in ancestors");
    expect(cleanCategoryName("the guitarists")).toBe("Guitarists");
    expect(cleanCategoryName("Category: Births_in_Wem")).toBe("Births in Wem");
    expect(cleanCategoryName("Wem___Shropshire")).toBe("Wem, Shropshire");
    expect(parseRelativesFilterPrompt("my ancestors in the Fellows_of_the_Royal_Society category")).toMatchObject({ category: "Fellows of the Royal Society", scope: "ancestors" });
    expect(relativesFilterQuery(mine("ancestors"))).toBe("category Guitarists in my ancestors");
    expect(relativesFilterQuery({ category: "Methodists", owner: "Cook-8721", scope: "cc7" })).toBe("category Methodists in Cook-8721's CC7");
    expect(relativesFilterQuery({ filters: ["unsourced", "female"], category: "Methodists", owner: "my", scope: "ancestors" })).toBe(
      "unsourced female category Methodists in my ancestors"
    );
  });
});
