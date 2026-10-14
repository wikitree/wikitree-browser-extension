import {
  addCategoryToText,
  categorySearchPrompt,
  categorySuggestionsMessage,
  contextWords,
  existingCategories,
  isCategorySuggestPrompt,
  parseCategorySearches,
  pickCategory,
} from "./chat_edit_categories";

describe("isCategorySuggestPrompt", () => {
  test.each([
    "suggest categories",
    "Suggest some more categories for this profile",
    "find categories",
    "category suggestions",
    "What categories should I add?",
    "which other categories fit?",
    "recommend categories for this bio",
  ])("matches %s on the edit page", (prompt) => {
    expect(isCategorySuggestPrompt(prompt, { onEditPage: true })).toBe(true);
  });

  test.each(["add categories", "auto categories", "suggest categories for Smith-1", "find Devon categories", "what categories is Smith-1 in?"])(
    "declines %s",
    (prompt) => {
      expect(isCategorySuggestPrompt(prompt, { onEditPage: true })).toBe(false);
    }
  );

  test("only on the edit page", () => {
    expect(isCategorySuggestPrompt("suggest categories")).toBe(false);
  });
});

test("existingCategories reads category links, ignoring case, underscores and sort keys", () => {
  const found = existingCategories("[[Category: Oak_Hill Cemetery, Atmore, Alabama]]\n[[category:Farmers|Smith]]");
  expect([...found]).toEqual(["oak hill cemetery, atmore, alabama", "farmers"]);
});

test("categorySearchPrompt includes the form facts and the biography", () => {
  const text = categorySearchPrompt("== Biography ==\nJohn was a farmer.", { "Birth place": "Devon, England", "Death place": "" });
  expect(text).toContain("Birth place: Devon, England");
  expect(text).not.toContain("Death place");
  expect(text).toContain("John was a farmer.");
});

describe("parseCategorySearches", () => {
  test("reads the JSON list, tidies it and drops repeats", () => {
    const response = 'Here you go:\n```json\n[{"search":"Category: Farmers","type":"category","why":"farmer"},{"search":"Oak Hill Cemetery Atmore","type":"Cemetery"},{"search":"farmers","type":"category"},{"search":"x"},{"search":"Devon","type":"county"}]\n```';
    expect(parseCategorySearches(response)).toEqual([
      { search: "Farmers", type: "category", why: "farmer" },
      { search: "Oak Hill Cemetery Atmore", type: "cemetery", why: "" },
      { search: "Devon", type: "category", why: "" },
    ]);
  });

  test("keeps at most eight", () => {
    const list = Array.from({ length: 12 }, (_, i) => ({ search: `Place number ${i}` }));
    expect(parseCategorySearches(JSON.stringify(list))).toHaveLength(8);
  });

  test.each(["", "No categories.", "[not json]", '{"search":"Farmers"}'])("declines %p", (response) => {
    expect(parseCategorySearches(response)).toBeNull();
  });

  test("an empty list is an answer", () => {
    expect(parseCategorySearches("[]")).toEqual([]);
  });
});

describe("pickCategory", () => {
  const cemeteries = [
    { category: "Oak Hill Cemetery, Birmingham, Alabama", name: "Oak Hill Cemetery", location: "Birmingham, Alabama" },
    { category: "Oak Hill Cemetery, Atmore, Alabama", name: "Oak Hill Cemetery", location: "Atmore, Alabama", parent: "Escambia County, Alabama, Cemeteries" },
  ];

  test("prefers the one matching more of the search", () => {
    expect(pickCategory("Oak Hill Cemetery Atmore Alabama", cemeteries)).toBe("Oak Hill Cemetery, Atmore, Alabama");
  });

  test("leaves out categories already on the profile", () => {
    const existing = existingCategories("[[Category: Oak Hill Cemetery, Atmore, Alabama]]");
    expect(pickCategory("Oak Hill Cemetery Atmore Alabama", cemeteries, existing)).toBe("Oak Hill Cemetery, Birmingham, Alabama");
  });

  test("with the profile's words, a category's other words must be on the profile", () => {
    const farmers = [{ category: "Arkansas Farmers" }, { category: "England, Farmers" }, { category: "Adair County, Iowa, Farmers" }];
    const devon = contextWords("He was a farmer.", "Devon, England");
    expect(pickCategory("Farmers", farmers, new Set(), devon)).toBe("England, Farmers");
    expect(pickCategory("Farmers", [...farmers, { category: "Farmers" }], new Set(), devon)).toBe("Farmers");
    expect(pickCategory("Farmers", farmers.slice(0, 1), new Set(), devon)).toBeNull();
    expect(pickCategory("Oak Hill Cemetery Atmore", cemeteries, new Set(), contextWords("Atmore, Escambia, Alabama"))).toBe("Oak Hill Cemetery, Atmore, Alabama");
  });

  test("leaves out top-level categories and weak matches", () => {
    expect(pickCategory("Farmers", [{ category: "Farmers", topLevel: true }])).toBeNull();
    expect(pickCategory("Royal Navy sailors HMS Victory", [{ category: "Sailors" }])).toBeNull();
    expect(pickCategory("Farmers", [])).toBeNull();
  });
});

describe("addCategoryToText", () => {
  test("goes after the categories at the top", () => {
    const text = "[[Category: Farmers]]\n[[Category: Devon, England]]\n{{Unsourced}}\n== Biography ==\nText";
    const result = addCategoryToText(text, "Oak Hill Cemetery, Atmore, Alabama");
    expect(result.text).toBe(
      "[[Category: Farmers]]\n[[Category: Devon, England]]\n[[Category: Oak Hill Cemetery, Atmore, Alabama]]\n{{Unsourced}}\n== Biography ==\nText"
    );
    expect(result.at).toBe(text.indexOf("{{"));
  });

  test("goes first when there are none", () => {
    expect(addCategoryToText("== Biography ==\nText", "Farmers")).toEqual({
      text: "[[Category: Farmers]]\n== Biography ==\nText",
      at: 0,
      added: "[[Category: Farmers]]\n",
    });
  });

  test("a category further down doesn't count as the top", () => {
    expect(addCategoryToText("== Biography ==\n[[Category: Farmers]]", "Sailors").text).toBe("[[Category: Sailors]]\n== Biography ==\n[[Category: Farmers]]");
  });

  test("a text that is only categories", () => {
    expect(addCategoryToText("[[Category: Farmers]]", "Sailors").text).toBe("[[Category: Farmers]]\n[[Category: Sailors]]\n");
  });

  test("unchanged when it's already there", () => {
    expect(addCategoryToText("[[Category: Farmers]]\nText", "farmers")).toEqual({ text: "[[Category: Farmers]]\nText", at: -1, added: "" });
  });
});

test("categorySuggestionsMessage", () => {
  expect(categorySuggestionsMessage([])).toMatch(/found none/);
  expect(categorySuggestionsMessage([{ category: "Farmers", why: "a farmer" }])).toContain("- Farmers (a farmer)");
});
