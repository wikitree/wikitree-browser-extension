jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => null) }));

import { parseExportResultPrompt } from "./chat_router";

// Live C33, 2026-10-03: "export these" re-ran the last search.
describe("export the current result", () => {
  test.each([
    ["export these", "csv"],
    ["Export these.", "csv"],
    ["download the results as excel", "xlsx"],
    ["save them as a spreadsheet", "xlsx"],
    ["export to JSON", "json"],
    ["export as wikitable", "wikitable"],
    ["please export the table as CSV file", "csv"],
  ])("%s → %s", (prompt, format) => {
    expect(parseExportResultPrompt(prompt)).toBe(format);
  });

  test.each(["export these to Australia", "emigrants who exported wool", "save the Beacalls"])("declines %s", (prompt) => {
    expect(parseExportResultPrompt(prompt)).toBeNull();
  });
});
