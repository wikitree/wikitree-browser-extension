/**
 * @jest-environment jsdom
 */
import { buildDuplicateAnswer, parseDuplicateCheckPrompt, readFindMatchesHtml } from "./chat_duplicates";

jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));
const { routeChatPrompt, ChatIntent } = require("./chat_router");

// Live C12, 2026-10-03.
describe("parseDuplicateCheckPrompt", () => {
  test.each([
    ["does this person have duplicates?", ""],
    ["Does she have any possible duplicates", ""],
    ["are there any duplicates of Cook-8721?", "Cook-8721"],
    ["is this profile a duplicate?", ""],
    ["find possible matches for Ellen Cook", "Ellen Cook"],
    ["check this profile for duplicates", ""],
    ["duplicates of Beacall-6", "Beacall-6"],
    ["any duplicates?", ""],
  ])("%s", (prompt, target) => {
    expect(parseDuplicateCheckPrompt(prompt)).toEqual({ target });
  });

  test.each(["find matches for people born in Kent", "check this profile", "Beacalls in Shropshire", "does she have children?"])(
    "not a duplicate check: %s",
    (prompt) => {
      expect(parseDuplicateCheckPrompt(prompt)).toBeNull();
    }
  );

  test("routes to PROFILE_DUPLICATES", () => {
    expect(routeChatPrompt("does this person have duplicates?")).toMatchObject({
      intent: ChatIntent.PROFILE_DUPLICATES,
      params: { target: "" },
    });
  });
});

describe("readFindMatchesHtml", () => {
  test("reads the first block of a fetched page", () => {
    const li = (id) =>
      `<li><span class="mono small">${id}</span> <a href="/wiki/${id}">x</a> ` +
      `<a href="/index.php?title=Special:MergePerson&amp;person2_name=${id}">compare</a></li>`;
    const html =
      `<html><body><section id="Results"><div><p>Possible matches for <span class="mono small">Cook-8721</span></p>` +
      `<ul>${li("Cook-8721")}${li("Cook-44926")}${li("Ching-103")}</ul></div></section></body></html>`;
    const block = readFindMatchesHtml(html);
    expect(block.anchorWtId).toBe("Cook-8721");
    expect(block.candidates.map((c) => c.wtId)).toEqual(["Cook-44926", "Ching-103"]);
    expect(block.candidates[0].compareUrl).toContain("Special:MergePerson");
  });

  test("a page with no results gives null", () => {
    expect(readFindMatchesHtml("<html><body><p>No matches</p></body></html>")).toBeNull();
  });
});

describe("buildDuplicateAnswer", () => {
  const entry = (wtId, score, extra = {}) => ({
    wtId,
    compareUrl: `/index.php?title=Special:MergePerson&person1_name=Cook-8721&person2_name=${wtId}`,
    profile: { RealName: "Ellen", LastNameAtBirth: "Cook", BirthDate: "1832-00-00", DeathDate: "1898-01-26" },
    result: { score, rejected: false, reasons: ["Both profiles have the same father."], warnings: [], ...extra },
  });

  test("lists likely duplicates with evidence and compare links", () => {
    const text = buildDuplicateAnswer({
      subjectLabel: "Ellen Alley (Cook-8721)",
      total: 3,
      scored: [entry("Cook-1", 90), entry("Cook-2", 50), entry("Cook-3", 0, { rejected: true })],
      unscored: [],
      pageUrl: "https://staging.wikitree.com/x",
      origin: "https://staging.wikitree.com",
    });
    expect(text).toMatch(/^1 of the 3 profiles Find Matches lists for Ellen Alley \(Cook-8721\) looks like a possible duplicate:/);
    expect(text).toContain("- Ellen Cook (Cook-1) (1832–1898): 90%. Both profiles have the same father.");
    expect(text).toContain("Compare: https://staging.wikitree.com/index.php?title=Special:MergePerson");
    expect(text).not.toContain("Cook-2");
  });

  test("says so when nothing scores high enough", () => {
    const text = buildDuplicateAnswer({
      subjectLabel: "X (X-1)",
      total: 2,
      scored: [entry("Cook-2", 50)],
      unscored: ["Cook-9"],
      pageUrl: "u",
    });
    expect(text).toMatch(/^None of the 2 profiles Find Matches lists for X \(X-1\) look like a duplicate/);
    expect(text).toContain("1 could not be scored (private or merged away): Cook-9.");
  });

  test("no candidates", () => {
    expect(buildDuplicateAnswer({ subjectLabel: "X (X-1)", total: 0, scored: [], unscored: [], pageUrl: "u" })).toMatch(
      /finds no possible duplicates/
    );
  });
});
