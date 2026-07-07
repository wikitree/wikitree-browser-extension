jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { buildContextualDateFollowupQuery, mergeWtPlusRefinementIntoQuery } from "./chat_search_mode";
import { createProfileSearchHandler } from "./chat_profile_search";

const PREVIOUS = '19Cen Location=Cheshire sql="([Marriage].[Marriage Location].LineCount = 1)"';

describe("mergeWtPlusRefinementIntoQuery", () => {
  test("appends a new raw token, keeping sql last", () => {
    expect(mergeWtPlusRefinementIntoQuery(PREVIOUS, "Unconnected")).toBe(
      '19Cen Location=Cheshire Unconnected sql="([Marriage].[Marriage Location].LineCount = 1)"'
    );
  });

  test("replaces a location with a more specific one", () => {
    expect(mergeWtPlusRefinementIntoQuery(PREVIOUS, 'Location="Cheshire, England"')).toBe(
      '19Cen Location="Cheshire, England" sql="([Marriage].[Marriage Location].LineCount = 1)"'
    );
  });

  test("declines when the same field has an unrelated value (a new search)", () => {
    expect(mergeWtPlusRefinementIntoQuery(PREVIOUS, "Location=Devon")).toBe("");
  });

  test("combines sql expressions with And", () => {
    expect(mergeWtPlusRefinementIntoQuery(PREVIOUS, 'sql="([Default].[Birth Date].AsNumber > 18500000)"')).toBe(
      '19Cen Location=Cheshire sql="([Marriage].[Marriage Location].LineCount = 1) And ([Default].[Birth Date].AsNumber > 18500000)"'
    );
  });

  test("returns empty when nothing changes", () => {
    expect(mergeWtPlusRefinementIntoQuery(PREVIOUS, "Location=Cheshire 19Cen")).toBe("");
  });

  test("declines OR queries rather than corrupting branches", () => {
    expect(mergeWtPlusRefinementIntoQuery("Location=Cheshire OR Location=Devon", "Unconnected")).toBe("");
    expect(mergeWtPlusRefinementIntoQuery(PREVIOUS, "Unsourced OR Unconnected")).toBe("");
  });

  test("adjusts a same-kind date scope", () => {
    expect(mergeWtPlusRefinementIntoQuery("19Cen Location=Cheshire", "20Cen")).toBe("20Cen Location=Cheshire");
  });

  test("keeps a less specific repeat of the existing location", () => {
    expect(mergeWtPlusRefinementIntoQuery('Location="Cheshire, England" Unsourced', "Location=Cheshire")).toBe("");
  });
});

describe("buildContextualDateFollowupQuery", () => {
  const DEATH_PREVIOUS = 'Location="Liverpool, England" sql="([Default].[Death Date].AsNumber > 19009999)"';
  const BIRTH_PREVIOUS = 'Location=Devon sql="([Default].[Birth Date].AsNumber < 18500000)"';

  test('"After 1920?" tightens the previous death bound in place', () => {
    expect(buildContextualDateFollowupQuery(DEATH_PREVIOUS, "After 1920?")).toBe(
      'Location="Liverpool, England" sql="([Default].[Death Date].AsNumber > 19209999)"'
    );
  });

  test('"before 1930" flips the death comparison against the death context', () => {
    expect(buildContextualDateFollowupQuery(DEATH_PREVIOUS, "before 1930")).toBe(
      'Location="Liverpool, England" sql="([Default].[Death Date].AsNumber < 19300000)"'
    );
  });

  test("a bare boundary follows the birth context when that is what the previous query used", () => {
    expect(buildContextualDateFollowupQuery(BIRTH_PREVIOUS, "after 1820")).toBe(
      'Location=Devon sql="([Default].[Birth Date].AsNumber > 18209999)"'
    );
  });

  test('"between 1900 and 1910" builds an In range on the death field', () => {
    expect(buildContextualDateFollowupQuery(DEATH_PREVIOUS, "between 1900 and 1910")).toBe(
      'Location="Liverpool, England" sql="([Default].[Death Date].AsNumber In 19000000..19109999)"'
    );
  });

  test("an explicit born cue overrides the death context", () => {
    expect(buildContextualDateFollowupQuery(DEATH_PREVIOUS, "born before 1880")).toBe(
      'Location="Liverpool, England" sql="([Default].[Death Date].AsNumber > 19009999) And ([Default].[Birth Date].AsNumber < 18800000)"'
    );
  });

  test("declines when the previous query has no date context", () => {
    expect(buildContextualDateFollowupQuery("Location=Cheshire", "after 1920")).toBe("");
  });

  test("declines when the previous query has both birth and death dates and no cue", () => {
    const both =
      'Location=Kent sql="([Default].[Birth Date].AsNumber > 18000000) And ([Default].[Death Date].AsNumber < 18800000)"';
    expect(buildContextualDateFollowupQuery(both, "after 1850")).toBe("");
  });

  test("declines a richer prompt that is not just a boundary", () => {
    expect(buildContextualDateFollowupQuery(DEATH_PREVIOUS, "died after 1920 in Yorkshire")).toBe("");
  });

  test("declines OR previous queries", () => {
    expect(buildContextualDateFollowupQuery("Location=A OR Location=B", "after 1920")).toBe("");
  });
});

describe("translateWtPlusRefinementTerms", () => {
  function makeHandler() {
    return createProfileSearchHandler({
      WBE_CHAT_APP_ID: "wbe-chat-test",
      hasAnyApiKey: jest.fn(() => false),
      getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
      getChatAiConfig: jest.fn(async () => ({ provider: "", key: "", model: "" })),
      fetchSearchPersonPaged: jest.fn(async () => [0, []]),
      fetchPeoplePaged: jest.fn(async () => [null, null, {}]),
      mapApiPersonToStandardRow: jest.fn(() => ({})),
      makeStandardProfileTable: jest.fn(() => ({ columns: [] })),
      makeAncestorProfileTable: jest.fn(() => ({ columns: [] })),
      normalizeText: (value) =>
        String(value || "")
          .trim()
          .toLowerCase(),
      normalizeKnownDate: jest.fn((value) => value),
      showChatShaky: jest.fn(),
      hideChatShaky: jest.fn(),
    });
  }

  test("translates a bare status word", () => {
    const { translateWtPlusRefinementTerms } = makeHandler();
    expect(translateWtPlusRefinementTerms("unconnected")?.query).toMatch(/^Unconnected$/i);
  });

  test("translates a comma place to a quoted Location term", () => {
    const { translateWtPlusRefinementTerms } = makeHandler();
    expect(translateWtPlusRefinementTerms("Cheshire, England")?.query).toContain('Location="Cheshire, England"');
  });

  test("translates a date fragment", () => {
    const { translateWtPlusRefinementTerms } = makeHandler();
    const query = String(translateWtPlusRefinementTerms("born after 1850")?.query || "");
    expect(query).toMatch(/1850/);
  });

  test("returns null for empty input", () => {
    const { translateWtPlusRefinementTerms } = makeHandler();
    expect(translateWtPlusRefinementTerms("")).toBeNull();
  });
});
