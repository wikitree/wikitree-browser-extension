jest.mock("../../core/API/WikiTreeAPI", () => ({
  WikiTreeAPI: {
    getPerson: jest.fn(),
    getAncestors: jest.fn(),
    searchPerson: jest.fn(),
    getConnections: jest.fn(),
    getPeople: jest.fn(),
  },
}));

jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/API/wwwWikiTree", () => ({
  getRelationJSON: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
}));

jest.mock("./ui", () => ({
  hideChatShaky: jest.fn(),
  showConnectionsPopup: jest.fn(),
  setConnectionsRelationshipFinder: jest.fn(),
}));


import { buildDisambiguationMessage, resolveDisambiguationReply } from "./chat_disambiguation";
import { plainMoreText } from "./chat_more_text";

const lukers = Array.from({ length: 30 }, (_, i) => ({ Name: `Luker-${i + 1}`, RealName: "William Luker", BirthDate: `${1780 + i}-01-01` }));

test("every namesake is listed: 20 shown, the rest behind 'N more' (the user, 2026-10-15)", () => {
  const message = buildDisambiguationMessage(lukers, "William Luker");
  expect(message).toContain('I found 30 people named "William Luker"');
  expect(message).toContain("10 more");
  expect(plainMoreText(message)).toContain("30. Luker-30 - William Luker (b. 1809)");
  expect(plainMoreText(message)).toContain("Luker-30");
});

test("a short list is shown whole, as before", () => {
  const message = buildDisambiguationMessage(lukers.slice(0, 3), "William Luker");
  expect(message).toContain("several people");
  expect(message).not.toContain("more");
});

test("a number past 8 picks that person", () => {
  expect(resolveDisambiguationReply("25", lukers)?.Name).toBe("Luker-25");
});

// "how is Roosevelt-1 related to Theodore Roosevelt": "Roosevelt-26 - Theodore", and "Choose 7." with nothing after it (2026-10-18)
test("choices give full names, and say so for a private profile sent without one", () => {
  const message = buildDisambiguationMessage(
    [{ Name: "Roosevelt-18", RealName: "Theodore", LastNameAtBirth: "Roosevelt", BirthDate: "1858-10-27" }, { Id: 9 }],
    "Theodore Roosevelt"
  );
  expect(message).toContain("1. Roosevelt-18 - Theodore Roosevelt (b. 1858)");
  expect(message).toContain("2. a private profile");
});
