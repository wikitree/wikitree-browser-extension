import { extractQueryCategoryTerms, matchQueryCategories, queryHasCategoryTerms } from "./chat_query_categories";

// Turnley-31's categories, from getPeople (live A15 "Chicago military", 2026-10-02).
const turnley = [
  "1st_Regiment_of_Infantry,_United_States_Army,_Mexican-American_War",
  "Aztec_Club_of_1847",
  "Highland_Park,_Illinois",
  "Rosehill_Cemetery_and_Mausoleum,_Chicago,_Illinois",
  "Union_Army,_United_States_Civil_War",
  "United_States_Military_Academy",
];

describe("query categories column", () => {
  test("reads Category and CategoryWord terms", () => {
    expect(extractQueryCategoryTerms('Location=Chicago CategoryWord=Military Category="Union Army, United States Civil War"')).toEqual({
      categories: ["Union Army, United States Civil War"],
      words: ["Military"],
      trees: [],
    });
    expect(queryHasCategoryTerms("Location=Chicago NoFather")).toBe(false);
  });

  test("shows the categories that matched", () => {
    expect(matchQueryCategories(turnley, "Location=Chicago CategoryWord=Military")).toEqual([
      "United_States_Military_Academy",
    ]);
    expect(
      matchQueryCategories(turnley, '(Category="Union Army, United States Civil War" OR CategoryWord=Army)')
    ).toEqual(["1st_Regiment_of_Infantry,_United_States_Army,_Mexican-American_War", "Union_Army,_United_States_Civil_War"]);
  });
  test("SubCat9 tree matches the category and its subcategories", () => {
    const query = 'SubCat9="Mississippi, Slave Owners"';
    expect(queryHasCategoryTerms(query)).toBe(true);
    expect(
      matchQueryCategories(
        ["Adams_County,_Mississippi,_Slave_Owners", "Mississippi,_Slave_Owners", "Virginia,_Slave_Owners", "Lloyds"],
        query
      )
    ).toEqual(["Adams_County,_Mississippi,_Slave_Owners", "Mississippi,_Slave_Owners"]);
  });
});
