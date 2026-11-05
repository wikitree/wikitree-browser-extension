jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { wtAPICatCIBSearch, wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { createProfileSearchHandler } from "./chat_profile_search";

function makeHandler(overrides = {}) {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => true),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test-key", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(async () => [0, []]),
    fetchPeoplePaged: jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Beacall-1",
          FirstName: "Alice",
          LastNameAtBirth: "Beacall",
          BirthDate: "1824-00-00",
        },
      },
    ]),
    mapApiPersonToStandardRow: jest.fn((person, options = {}) => ({
      wtid: options.wtId || person?.Name || "",
      firstName: person?.FirstName || "",
      lnab: person?.LastNameAtBirth || "",
      lastNameCurrent: person?.LastNameCurrent || "",
      birth: person?.BirthDate || "",
      death: person?.DeathDate || "",
      birthLocation: person?.BirthLocation || "",
      deathLocation: person?.DeathLocation || "",
    })),
    makeStandardProfileTable: jest.fn((title, rows, defaultOrder = [[0, "asc"]]) => ({
      title,
      rows,
      defaultOrder,
      columns: [{ key: "wtid" }, { key: "firstName" }],
    })),
    makeAncestorProfileTable: jest.fn((title, rows, defaultOrder = [[0, "asc"]]) => ({
      title,
      rows,
      defaultOrder,
      columns: [{ key: "wtid" }, { key: "firstName" }],
    })),
    normalizeText: (value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    normalizeKnownDate: jest.fn((value) => value),
    showChatShaky: jest.fn(),
    hideChatShaky: jest.fn(),
    ...overrides,
  });
}

async function executedQueryFor(prompt) {
  const { tryHandleProfileSearchPrompt } = makeHandler();
  await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
  expect(wtAPIProfileSearch).toHaveBeenCalled();
  return decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
}

describe("chat_profile_search deterministic parent-presence and child-count rules", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        profiles: ["1"],
        searchLog: "Result: 1\r\n",
      },
    });
  });

  test("parses 'with a mother but no father' into NoFather NOT NoMother", async () => {
    const executedQuery = await executedQueryFor("Beacall with a mother but no father");

    expect(executedQuery).toContain("NoFather");
    expect(executedQuery).toContain("NOT NoMother");
    expect(executedQuery).toMatch(/LastNameAtBirth=Beacall|AllLastNames=Beacall/);
    expect(executedQuery).not.toMatch(/(?<!NOT )NoMother/);
  });

  test("parses inverted 'no father but has a mother' the same way", async () => {
    const executedQuery = await executedQueryFor("Beacall no father but has a mother");

    expect(executedQuery).toContain("NoFather");
    expect(executedQuery).toContain("NOT NoMother");
  });

  test("parses 'with a father but no mother' into NoMother NOT NoFather", async () => {
    const executedQuery = await executedQueryFor("Beacall with a father but no mother");

    expect(executedQuery).toContain("NoMother");
    expect(executedQuery).toContain("NOT NoFather");
  });

  test("plain 'no father' still emits just NoFather", async () => {
    const executedQuery = await executedQueryFor("Beacall no father");

    expect(executedQuery).toContain("NoFather");
    expect(executedQuery).not.toContain("NOT");
    expect(executedQuery).not.toContain("NoMother");
  });

  test("parses 'exactly 4 children' into a LineCount equality", async () => {
    const executedQuery = await executedQueryFor("Beacall exactly 4 children");

    expect(executedQuery).toContain("[Children].[User ID].LineCount = 4");
    expect(executedQuery).not.toContain("LineCount > 4");
  });

  test("parses word-number 'exactly one child count' phrasing", async () => {
    const executedQuery = await executedQueryFor("Shropshire exactly two kids");

    expect(executedQuery).toContain("[Children].[User ID].LineCount = 2");
    expect(executedQuery).toContain("Location=Shropshire");
  });
});

// A WT+ user (2026-10-12): "What is the syntax for finding profiles in a specific category who have children?
// I found NoChildren, but didn't see anything for with children." It's NOT NoChildren; Genie searched for a
// category called "Rodeo Cowboys with children".
// The category catalogue (wtCatCIBSearch), as it answered live on 2026-10-12: it has these names and no
// "Rodeo Cowboys".
const CATALOGUE = [
  "Rodeo Professionals",
  "Mayflower Passengers",
  "Orphan Train Riders",
  "British Army, World War II",
  "Irish Quakers",
  "Killed in Action",
  "Salem Witch Trials",
  "Pennsylvania Quakers",
];
function catalogueSearch(caller, type, query) {
  const words = String(query).toLowerCase();
  const categories = CATALOGUE.filter((name) => name.toLowerCase().includes(words)).map((category) => ({ category }));
  return Promise.resolve({ response: categories.length ? { found: categories.length, categories } : { found: 0 } });
}

describe("a category with or without children", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "Result: 1\r\n" } });
    wtAPICatCIBSearch.mockImplementation(catalogueSearch);
  });
  test.each([
    ["Category: Rodeo Professionals with children", "CategoryFull=Rodeo_Professionals NOT NoChildren"],
    ["profiles in Category: Rodeo Professionals who have children", "CategoryFull=Rodeo_Professionals NOT NoChildren"],
    ["Category: Rodeo Professionals without children", "CategoryFull=Rodeo_Professionals NoChildren"],
    ["Category: Rodeo Professionals NOT NoChildren", "CategoryFull=Rodeo_Professionals NOT NoChildren"],
    ["Category: Rodeo Professionals", "CategoryFull=Rodeo_Professionals"],
    // the search reader's own words for the other flags
    ["Category: Rodeo Professionals without a father", "CategoryFull=Rodeo_Professionals NoFather"],
    ["Category: Rodeo Professionals unsourced with no spouse", "CategoryFull=Rodeo_Professionals Unsourced NoSpouses"],
    ["Category: Orphan Train Riders", "CategoryFull=Orphan_Train_Riders"],
    // WT+ stores the name with _ for spaces and __ for ", "; the quoted name with spaces finds nobody
    // (CategoryFull="Mayflower Passengers" 0, CategoryFull=Mayflower_Passengers 104; live 2026-10-12).
    ["Category: Mayflower Passengers no parents", "CategoryFull=Mayflower_Passengers NoParents"],
    ["Category: British Army, World War II with children", "CategoryFull=British_Army__World_War_II NOT NoChildren"],
    ["Category: Mayflower Passengers who have children?", "CategoryFull=Mayflower_Passengers NOT NoChildren"],
    // no category has the name: every category containing it
    ["Category: Rodeo Cowboys with no spouse", 'CategoryWord="Rodeo Cowboys" NoSpouses'],
    // the name before "category"
    ["Mayflower Passengers category", "CategoryFull=Mayflower_Passengers"],
    ["profiles in the Irish Quakers category", "CategoryFull=Irish_Quakers"],
    ["Rodeo Professionals category without a spouse", "CategoryFull=Rodeo_Professionals NoSpouses"],
    // asked as a question
    ["Who is in the Salem Witch Trials category?", "CategoryFull=Salem_Witch_Trials"],
    ["how many people are in the Irish Quakers category", "CategoryFull=Irish_Quakers"],
    // the general reader had these first: FirstName=Category Location=Action; Location="Category Pennsylvania Quakers"
    ["Category: Killed in Action", "CategoryFull=Killed_in_Action"],
    ["profiles in Category: Pennsylvania Quakers died before 1800", 'CategoryFull=Pennsylvania_Quakers sql="([Default].[Death Date].AsNumber In 1..17999999)"'],
    ["profiles in Category: Pennsylvania Quakers born in Ohio", "CategoryFull=Pennsylvania_Quakers BirthLocation=Ohio"],
  ])("%s", async (prompt, query) => {
    expect(await executedQueryFor(prompt)).toBe(query);
  });

  // Words before "Category:" are part of the search; it ran CategoryFull=Irish_Quakers? (every category starting
  // with the name, and no "unsourced"; sweep 2026-10-12).
  test("doesn't drop the words before the category", async () => {
    const { tryHandleProfileSearchPrompt } = makeHandler({ hasAnyApiKey: jest.fn(() => false) });
    await tryHandleProfileSearchPrompt(
      { chatModeOverride: "wtplus" },
      "What's the syntax for finding unsourced profiles in Category: Irish Quakers?"
    );
    const sent = wtAPIProfileSearch.mock.calls.map((call) => decodeURIComponent(call[1]));
    expect(sent.filter((query) => /\?|^CategoryFull=Irish_Quakers$/.test(query))).toEqual([]);
  });
  // "Category: Ohio, United States Civil War and its subcategories" ran CategoryWord="Ohio, United States Civil War
  // and its subcategories" (0). WT+'s SubCat9 is the category and its subcategories (8,149; live, 2026-10-12).
  test.each([
    ["Category: Ohio, United States Civil War and its subcategories", 'SubCat9="Ohio, United States Civil War"'],
    ["Category: Ohio, United States Civil War including subcategories", 'SubCat9="Ohio, United States Civil War"'],
    ["Category: Ohio, United States Civil War (including subcategories)", 'SubCat9="Ohio, United States Civil War"'],
    ["profiles in Category: Ohio, United States Civil War and subcategories", 'SubCat9="Ohio, United States Civil War"'],
    ["Ohio, United States Civil War category and its subcategories", 'SubCat9="Ohio, United States Civil War"'],
    ["Category: Mayflower Passengers and its subcategories with children", 'SubCat9="Mayflower Passengers" NOT NoChildren'],
  ])("%s", async (prompt, query) => {
    expect(await executedQueryFor(prompt)).toBe(query);
  });

  // Anything else about subcategories isn't read, and the words never become part of a category's name.
  test.each([
    "Category: Ohio, United States Civil War but not its subcategories",
    "Category: Ohio, United States Civil War not including subcategories",
    "Category: Ohio, United States Civil War and its subcategories born in Ohio",
  ])("%s", async (prompt) => {
    const { tryHandleProfileSearchPrompt } = makeHandler({ hasAnyApiKey: jest.fn(() => false) });
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
    const sent = wtAPIProfileSearch.mock.calls.map((call) => decodeURIComponent(call[1]));
    expect(sent.filter((query) => /subcategor/i.test(query))).toEqual([]);
  });

});

// "profiles in any category with the word Huguenot" ran CategoryWord="with the word Huguenot" Location=any (0;
// CategoryWord=Huguenot is 12,431): the look-ahead that stops "category with …" being a name gave way to \s*.
// These shapes aren't read without AI; "category word X" and "Category: X" are (sweep, 2026-10-12).
describe("a category described rather than named", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "Result: 1\r\n" } });
    // (real names start Married and Descendants; live catalogue, 2026-10-12)
    wtAPICatCIBSearch.mockImplementation((caller, type, query) => {
      const words = String(query).toLowerCase();
      const categories = ["Married Successive Siblings", "Descendants of Early Postmasters", "Huguenots"]
        .filter((name) => name.toLowerCase().includes(words))
        .map((category) => ({ category }));
      return Promise.resolve({ response: categories.length ? { found: categories.length, categories } : { found: 0 } });
    });
  });
  test.each([
    "profiles in any category with the word Huguenot",
    "people in any category containing the word Huguenot",
    "profiles in a category with Huguenot in its name",
    "profiles in any Huguenot category",
    "profiles in category word Huguenot",
  ])("%s isn't searched", async (prompt) => {
    const { tryHandleProfileSearchPrompt } = makeHandler({ hasAnyApiKey: jest.fn(() => false) });
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
    const searches = wtAPIProfileSearch.mock.calls.filter((call) => call[2]?.maxProfiles !== 1);
    expect(searches.map((call) => decodeURIComponent(call[1]))).toEqual([]);
  });
  test.each([
    ["category word Huguenot", "CategoryWord=Huguenot"],
    ["profiles with category word Huguenot", "CategoryWord=Huguenot"],
    ["unsourced profiles with no category died in Kent", 'Unsourced DeathLocation=Kent sql="([Categories].[Category].LineCount = 0)"'],
    ["profiles in category Huguenots", "CategoryFull=Huguenots"],
    ["profiles in category Married Successive Siblings", "CategoryFull=Married_Successive_Siblings"],
    ["Category: Descendants of Early Postmasters", "CategoryFull=Descendants_of_Early_Postmasters"],
  ])("%s", async (prompt, query) => {
    expect(await executedQueryFor(prompt)).toBe(query);
  });
});


// "Williams born in Pennsylvania with no death date" ran Location="Williams in Pennsylvania" Suggestions=576: the
// words before the suggestion's own went out as one place, and 576 is "FindAGrave - Empty death date", only the
// profiles whose memorial has one (10, where D0 finds 666; sweep, 2026-10-12). No birth/death date is B0/D0, and
// a search before a suggestion is read as any search is.
describe("a missing date or a Data Doctor suggestion, with a search before it", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "Result: 1\r\n" } });
  });
  test.each([
    ["Williams born in Pennsylvania with no death date", "AllLastNames=Williams BirthLocation=Pennsylvania D0"],
    ["Edwards profiles with no birth date", "AllLastNames=Edwards B0"],
    ["Smith profiles missing a birth date", "AllLastNames=Smith B0"],
    ["profiles born in Devon with no death date", "BirthLocation=Devon D0"],
    ["English profiles with no birth date", "BirthLocation=England B0"],
    ["profiles in Cheshire with an empty biography", "Location=Cheshire Suggestions=802"],
    ["Find a Grave profiles in Devon with an empty birth date", "Location=Devon Suggestions=573"],
    ["FindAGrave empty death date in Kent", "Location=Kent Suggestions=576"],
  ])("%s", async (prompt, query) => {
    const { tryHandleProfileSearchPrompt } = makeHandler();
    await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
    // (the search, not a count: "Williams" and "Edwards" are first counted against "William" and "Edward")
    const searches = wtAPIProfileSearch.mock.calls.filter((call) => call[2]?.maxProfiles !== 1);
    expect(searches.map((call) => decodeURIComponent(call[1]))).toEqual([query]);
  });
});
