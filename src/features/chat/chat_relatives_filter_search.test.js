// User, 2026-10-17: "Can you tell me which of my ancestors are members of the guitarists category?" with AI off:
// the router's reading runs as one WT+ search.
jest.mock("../../core/API/wtPlusAPI", () => ({ wtAPICatCIBSearch: jest.fn(), wtAPIProfileSearch: jest.fn() }));
jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721", FullName: "Ellen (Cook) Burton", Gender: "Female" })),
  getUserWtId: jest.fn(() => "Beacall-6"),
}));

import { parseCategoryPeriod } from "./chat_category_period";
import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { createProfileSearchHandler } from "./chat_profile_search";
import { ChatIntent, routeChatPrompt } from "./chat_router";

function makeHandler() {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => false),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(async () => [null, null, {}]),
    fetchPeoplePaged: jest.fn(async () => [null, null, { 1: { Id: 1, Name: "Test-1" } }]),
    mapApiPersonToStandardRow: jest.fn((person) => ({ wtid: person?.Name || "" })),
    makeStandardProfileTable: jest.fn((title, rows) => ({ title, rows, columns: [] })),
    makeAncestorProfileTable: jest.fn((title, rows) => ({ title, rows, columns: [] })),
    normalizeText: (value) => String(value || "").trim().toLowerCase(),
    normalizeKnownDate: jest.fn((value) => value),
    showChatShaky: jest.fn(),
    hideChatShaky: jest.fn(),
  });
}

beforeAll(() => {
  jest.spyOn(console, "debug").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

test.each([
  ["Can you tell me which of my ancestors are members of the guitarists category?", "Ancestors=Beacall-6 CategoryFull=Guitarists"],
  ["which of my descendants are in the Methodists category", "Descendants=Beacall-6 CategoryFull=Methodists"],
  ["anyone in my CC7 in the Mayflower Passengers category", "CC7=Beacall-6 CategoryFull=Mayflower_Passengers"],
  ["which of her ancestors are in the Methodists category", "Ancestors=Cook-8721 CategoryFull=Methodists"],
  ["my unsourced ancestors", "Ancestors=Beacall-6 Unsourced"],
  ["which of my ancestors need sources", "Ancestors=Beacall-6 Unsourced"],
  ["my unsourced female ancestors in the Methodists category", "Ancestors=Beacall-6 Unsourced female CategoryFull=Methodists"],
  ["notables in my ancestors", "Ancestors=Beacall-6 Notables"],
  ["which of my ancestors were called Mary", "Ancestors=Beacall-6 AllFirstNames=Mary"],
  ["my descendants with the surname Beacall", "Descendants=Beacall-6 AllLastNames=Beacall"],
  // (a place and a date too; no owner is the page person: imagined corpus AC4–AC6, 2026-10-18)
  ["my female ancestors born in Wales", "Ancestors=Beacall-6 female BirthLocation=Wales"],
  ["male descendants born after 1900", 'Descendants=Cook-8721 male sql="([Default].[Birth Date].AsNumber > 19009999)"'],
  ["my unsourced ancestors who died in Kent before 1850", 'Ancestors=Beacall-6 Unsourced DeathLocation=Kent sql="([Default].[Death Date].AsNumber In 1..18499999)"'],
  ["my female ancestors born between 1800 and 1850", 'Ancestors=Beacall-6 female sql="([Default].[Birth Date].AsNumber In 18000000..18509999)"'],
  ["notables in CC7", "CC7=Cook-8721 Notables"],
  ["how many of my ancestors are in the Methodists category", "Ancestors=Beacall-6 CategoryFull=Methodists"],
])("%s", async (prompt, query) => {
  const routed = routeChatPrompt(prompt);
  expect(routed.intent).toBe(ChatIntent.PROFILE_SEARCH);
  wtAPIProfileSearch.mockReset();
  wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "" } });
  await makeHandler().tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, routed.params.query);
  expect(wtAPIProfileSearch.mock.calls.map((call) => decodeURIComponent(call[1]))).toEqual([query]);
});

// A category on its own, typed (imagined corpus R1/R2, 2026-10-17)
test.each([
  // (the last call is the search; "Hopkins" could be a plural, so its counts are asked first)
  ["list members of Category:Guitarists", ["CategoryFull=Guitarists"]],
  ["Beacall in the Methodists category", ["CategoryFull=Methodists AllLastNames=Beacall"]],
  ["Hopkins in Category: Mayflower Passengers", ["CategoryFull=Mayflower_Passengers AllLastNames=Hopkins"]],
])("%s", async (prompt, queries) => {
  // (the category name is looked up on WT+; nothing found keeps it as typed)
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({}), text: async () => "" }));
  wtAPIProfileSearch.mockReset();
  wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "" } });
  await makeHandler().tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
  expect(wtAPIProfileSearch.mock.calls.map((call) => decodeURIComponent(call[1])).slice(-1)).toEqual(queries);
});

// "1940s" after a category: born, died or alive then? (imagined R2, 2026-10-18)
test("a category and a decade asks which", async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({}), text: async () => "" }));
  wtAPIProfileSearch.mockReset();
  const result = await makeHandler().tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Guitarists category 1940s");
  expect(wtAPIProfileSearch).not.toHaveBeenCalled();
  expect(result.message).toMatch(/born, when they died, or when they were alive/);
  expect(result.actions.map((action) => action.prompt || action.wtPlusQuery)).toEqual([
    "Category: Guitarists born in the 1940s",
    "Category: Guitarists died in the 1940s",
    "CategoryFull=Guitarists 1940s",
  ]);
});

// "Alive in the 1940s" had gone out as born in the 1940s: the gate adds "born in it" to bare decade words (2026-10-18)
test("Alive in the decade keeps WT+'s own meaning", async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({}), text: async () => "" }));
  const handler = makeHandler();
  const result = await handler.tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Guitarists category 1940s");
  const alive = result.actions[2];
  expect(alive.wtPlusDecadeMeansAlive).toBe(true);
  wtAPIProfileSearch.mockReset();
  await handler.reRunSavedWtPlusQuery(alive.wtPlusQuery, "text", "", {}, { decadeMeansAlive: true });
  const sent = wtAPIProfileSearch.mock.calls.map((call) => decodeURIComponent(call[1]));
  expect(sent.length).toBeGreaterThan(0);
  expect(sent.join(" ")).not.toMatch(/Birth Date/);
  wtAPIProfileSearch.mockReset();
  await handler.reRunSavedWtPlusQuery(alive.wtPlusQuery, "text", "", {});
  expect(wtAPIProfileSearch.mock.calls.map((call) => decodeURIComponent(call[1])).join(" ")).toMatch(/Birth Date/);
});

test.each([
  ["Guitarists category 1940s", { category: "Guitarists", period: "1940s", decade: true }],
  ["Category: Mayflower Passengers in the 1620s", { category: "Mayflower Passengers", period: "1620s", decade: true }],
  ["Guitarists category in 1945", { category: "Guitarists", period: "1945", decade: false }],
  ["Guitarists category 1800s", null],
  ["Guitarists category born 1940", null],
])("category and period: %s", (prompt, expected) => {
  expect(parseCategoryPeriod(prompt)).toEqual(expected);
});

// Imagined corpus, 2026-10-17: sentences about relatives became WT+ places (19Cen Ancestors=… Location=my,
// MarriageLocation=cousin Location="my tree") or a person search (FirstName=my LastName=line). They decline.
test.each(["my ancestors born between 1800 and 1850", "cousin marriages in my tree", "my paternal line", "my mother's mother's mother"])(
  "no junk search: %s",
  async (prompt) => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({}), text: async () => "" }));
    wtAPIProfileSearch.mockReset();
    const result = await makeHandler().tryHandleProfileSearchPrompt({ chatModeOverride: "wt" }, prompt);
    expect(wtAPIProfileSearch).not.toHaveBeenCalled();
    expect(global.fetch.mock.calls.filter(([, options]) => /searchPerson/.test(String(options?.body || "")))).toEqual([]);
    expect(result).toMatch(/couldn't work out/);
  }
);

// Murray, 2026-10-18: WT+ answered 429 with its "Blocked request" page (an IP range blocked for AI bot traffic)
// and Genie said only "Error:".
test.each([
  [Object.assign(new Error(""), { status: 429, blocked: true, ip: "192.0.2.7" }), /blocked the request: your internet address \(192\.0\.2\.7\).*Trtnik-2/],
  [Object.assign(new Error("Too Many Requests"), { status: 429, blocked: false, ip: "" }), /too many requests\)\. Wait a minute/],
  [new TypeError("Load failed"), /isn't responding just now/],
  [Object.assign(new Error("Service Unavailable"), { status: 503 }), /isn't responding just now/],
])("WT+ refused: %s", async (error, message) => {
  wtAPIProfileSearch.mockReset();
  wtAPIProfileSearch.mockRejectedValue(error);
  const result = await makeHandler().tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, "Notables Descendants=Olivier-995");
  const text = typeof result === "string" ? result : result?.message || "";
  expect(text).toMatch(/^I couldn't complete the WT\+ query/);
  expect(text).toMatch(message);
});
