// A WikiTree name search returns private profiles as "Private" with no WikiTree
// ID. They made empty table rows (live, 2026-10-03), so they are dropped and counted.

jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/API/WikiTreeAPI", () => ({
  WikiTreeAPI: { searchPerson: jest.fn(), getProfile: jest.fn() },
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { createProfileSearchHandler } from "./chat_profile_search";

function makeHandler(people) {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => false),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({})),
    fetchSearchPersonPaged: jest.fn(async () => [0, []]),
    fetchPeoplePaged: jest.fn(async () => [null, null, people]),
    mapApiPersonToStandardRow: jest.fn((person) => ({
      wtid: person?.Name || "",
      displayName: `${person?.FirstName || ""} ${person?.LastNameAtBirth || ""}`.trim(),
      firstName: person?.FirstName || "",
      birth: person?.BirthDate || "",
    })),
    makeStandardProfileTable: jest.fn((title, rows) => ({ title, rows, columns: [{ key: "wtid" }] })),
    makeAncestorProfileTable: jest.fn((title, rows) => ({ title, rows, columns: [{ key: "wtid" }] })),
    normalizeText: (value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    normalizeKnownDate: jest.fn((value) => value),
    showChatShaky: jest.fn(),
    hideChatShaky: jest.fn(),
  });
}

test("private profiles are left out of name-search results and counted", async () => {
  WikiTreeAPI.searchPerson.mockResolvedValue([200, [{ Id: 1 }, { Id: 2 }, { Id: 3 }]]);
  const { tryHandleProfileSearchPrompt } = makeHandler({
    1: { Id: 1, Name: "Fry-10107", FirstName: "Stephen", LastNameAtBirth: "Fry", BirthDate: "1833-00-00" },
    2: { Id: -1, FirstName: "Private" },
    3: { Id: -2, FirstName: "Private" },
  });
  const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wt" }, "Stephen Fry");
  expect(result.table.rows.map((row) => row.wtid)).toEqual(["Fry-10107"]);
  expect(result.message).toContain("2 more profiles are private, so they aren't shown.");
});
