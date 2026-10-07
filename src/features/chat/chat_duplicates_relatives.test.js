/**
 * @jest-environment jsdom
 */
// "Any relatives on WikiTree?" also checks the profile person for duplicates (the user, 2026-10-07).
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: { getPeople: jest.fn() } }));
const { WikiTreeAPI } = require("../../core/API/WikiTreeAPI");
const { findDuplicates, describeDuplicate } = require("./chat_duplicates");
const { buildFindRelativesAnswer, duplicateLines } = require("./chat_bio_relatives");

const li = (id) => `<li><span class="mono small">${id}</span> <a href="/wiki/${id}">x</a></li>`;
const PAGE = `<html><body><section id="Results"><div><p>Possible matches for <span class="mono small">Beacall-491</span></p><ul>${li("Beacall-11")}</ul></div></section></body></html>`;
const PHILIP_11 = {
  Id: 11,
  Name: "Beacall-11",
  FirstName: "Philip",
  RealName: "Philip",
  LastNameAtBirth: "Beacall",
  Gender: "Male",
  BirthDate: "1823-00-00",
  DeathDate: "1889-01-07",
  BirthLocation: "Worcester, Worcestershire, England",
};

test("a profile the API doesn't have yet is compared using what the page says (Beacall-491 on staging)", async () => {
  WikiTreeAPI.getPeople.mockResolvedValue([null, null, { 11: PHILIP_11 }]);
  const pagePerson = {
    Id: 51277082,
    Name: "Beacall-491",
    FirstName: "Philip",
    RealName: "Philip",
    LastNameAtBirth: "Beacall",
    Gender: "Male",
    BirthDate: "1823-00-00",
    BirthLocation: "Worcester, Worcestershire, England",
  };
  const person = { Id: 51277082, Name: "Beacall-491", RealName: "Philip" };
  const found = await findDuplicates("app", person, async () => PAGE, { pagePerson });
  expect(found.total).toBe(1);
  expect(found.likely.map((entry) => entry.wtId)).toEqual(["Beacall-11"]);
  // Without the page's person there's nothing to compare against.
  const without = await findDuplicates("app", person, async () => PAGE);
  expect(without.noAnchor).toBe(true);
  expect(duplicateLines(without, "Philip (Beacall-491)")).toEqual([]);

  const duplicates = { ...found, likely: found.likely.map(describeDuplicate) };
  const { message } = buildFindRelativesAnswer({ subjectLabel: "Philip (Beacall-491)", results: [], readBy: "read from its text", duplicates });
  expect(message).toContain("**Philip may have a duplicate on WikiTree:**");
  expect(message).toMatch(/\*\*Possible duplicate \(\d+%\):\*\* Beacall-11 Philip Beacall, 1823–1889/);
});

test("the other outcomes: none likely, none listed, not logged in", () => {
  expect(duplicateLines({ total: 4, likely: [] }, "Philip (Beacall-491)")).toEqual([
    "",
    "No likely duplicates of Philip: none of the 4 profiles Find Matches lists scores 65% or more.",
  ]);
  expect(duplicateLines({ total: 0, likely: [] }, "Philip (Beacall-491)")).toEqual(["", "Find Matches lists no possible duplicates of Philip."]);
  expect(duplicateLines({ loginNeeded: true }, "Philip (Beacall-491)")).toEqual(["", "To check for duplicates of Philip too, log in to WikiTree."]);
});

test("the Duplicate Finder's pairs for this profile, in the shape the Duplicates panel reads", () => {
  const { duplicatesFromFinder } = require("./chat_duplicates");
  const payload = {
    groups: [
      {
        requested_wikitree_id: "Beacall-491",
        anchor_wikitree_id: "Beacall-11",
        current_profile: { wikitree_id: "Beacall-491", first_name: "Philip", last_name_at_birth: "Beacall" },
        anchor_profile: { wikitree_id: "Beacall-11", first_name: "Philip", last_name_at_birth: "Beacall", birth_date_display: "1823-00-00", death_date_display: "1889-01-07" },
        visible_pairs: [
          { person1: "Beacall-11", person2: "Beacall-491", score: 92, level: "strong", warnings: [] },
          { person1: "Beacall-11", person2: "Beacall-999", score: 70, level: "medium" },
        ],
      },
    ],
  };
  const found = duplicatesFromFinder("Beacall-491", payload);
  expect(found).toMatchObject({ source: "finder", lookupAvailable: true, total: 1 });
  expect(found.likely[0]).toMatchObject({ wtId: "Beacall-11", name: "Philip Beacall", span: "1823–1889", score: 92, percent: false });
  const lines = duplicateLines(found, "Philip (Beacall-491)").join("\n");
  expect(lines).toContain("**Philip may have a duplicate on WikiTree (from the Duplicate Finder):**");
  expect(lines).toContain("**Possible duplicate:** Beacall-11 Philip Beacall, 1823–1889\n- ✓ Duplicate Finder score 92 (strong)");
  expect(duplicateLines(duplicatesFromFinder("Beacall-491", { groups: [{ requested_wikitree_id: "Beacall-491", visible_pairs: [] }] }), "Philip (Beacall-491)")).toEqual([
    "",
    "The Duplicate Finder lists no possible duplicates of Philip.",
  ]);
  // No lookup for a new profile: the caller falls back to Find Matches.
  expect(duplicatesFromFinder("Beacall-491", { lookup_available: false, groups: [] }).lookupAvailable).toBe(false);
});

describe("runDuplicateCheck: Duplicate Finder first (the user, 2026-10-07)", () => {
  const { runDuplicateCheck } = require("./chat_duplicates");
  const person = { Id: 491, Name: "Beacall-491", RealName: "Philip" };
  const finder = (likely) => async () => ({ source: "finder", lookupAvailable: true, total: likely.length, likely });
  const noFindMatches = jest.fn(async () => "<html><body>No results</body></html>");

  test("answers from the Finder's pairs without loading Find Matches", async () => {
    const fetchText = jest.fn();
    const answer = await runDuplicateCheck("app", person, fetchText, {
      readFinder: finder([{ wtId: "Beacall-11", name: "Philip Beacall", span: "1823–1880", score: 92, why: "Duplicate Finder score 92 (high)", warn: "" }]),
    });
    expect(fetchText).not.toHaveBeenCalled();
    expect(answer).toBe(
      "The Duplicate Finder lists 1 possible duplicate of Philip (Beacall-491):\n" +
        "- Philip Beacall (Beacall-11) 1823–1880: Duplicate Finder score 92 (high).\n" +
        "Find Matches: http://localhost/index.php?title=Special:FindMatches&action=find&u=491"
    );
  });

  test("Finder lists none: says so, then Find Matches", async () => {
    const answer = await runDuplicateCheck("app", person, noFindMatches, { readFinder: finder([]) });
    expect(answer).toMatch(/^The Duplicate Finder lists no possible duplicates of Philip \(Beacall-491\)\.\nWikiTree's Find Matches finds no possible duplicates/);
  });

  test("Finder unavailable (a new profile): Find Matches only", async () => {
    const answer = await runDuplicateCheck("app", person, noFindMatches, { readFinder: async () => null });
    expect(answer).toMatch(/^WikiTree's Find Matches finds no possible duplicates of Philip \(Beacall-491\)/);
  });
});
