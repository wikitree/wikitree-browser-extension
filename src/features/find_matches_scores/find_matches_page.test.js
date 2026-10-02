/**
 * @jest-environment jsdom
 */
/*
Created By: Ian Beacall (Beacall-6)
*/

import fs from "fs";
import path from "path";
import { collectWtIds, readResultBlocks } from "./find_matches_page";

const fixture = fs.readFileSync(path.join(__dirname, "__fixtures__/find_matches_results.html"), "utf8");

beforeEach(() => {
  document.body.innerHTML = fixture;
});

describe("readResultBlocks", () => {
  test("finds one block per profile searched", () => {
    const blocks = readResultBlocks();
    expect(blocks.map((block) => block.anchorWtId)).toEqual(["Baxter-6788", "Smith-1"]);
  });

  test("reads candidate IDs out of the mono span, whitespace and all", () => {
    const [baxter] = readResultBlocks();
    expect(baxter.candidates.map((candidate) => candidate.wtId)).toEqual([
      "Baxter-8158",
      "Baxter-12812",
      "Becker-3484",
    ]);
  });

  test("keeps WikiTree's own compare link for each candidate", () => {
    const [baxter] = readResultBlocks();
    expect(baxter.candidates[0].compareUrl).toContain("user1_name=Baxter-6788");
    expect(baxter.candidates[0].compareUrl).toContain("user2_name=Baxter-8158");
  });

  test("does not mistake the anchor paragraph's ID for a candidate", () => {
    const [baxter] = readResultBlocks();
    expect(baxter.candidates.map((candidate) => candidate.wtId)).not.toContain("Baxter-6788");
  });

  test("ignores manager links when reading a candidate's ID", () => {
    const [baxter] = readResultBlocks();
    expect(baxter.candidates.map((candidate) => candidate.wtId)).not.toContain("Bishop-5680");
  });

  test("returns nothing on a page with no results section", () => {
    document.body.innerHTML = "<p>No matches found.</p>";
    expect(readResultBlocks()).toEqual([]);
  });
});

describe("collectWtIds", () => {
  test("gathers every anchor and candidate exactly once", () => {
    expect(collectWtIds(readResultBlocks()).sort()).toEqual(
      ["Baxter-12812", "Baxter-6788", "Baxter-8158", "Becker-3484", "Smith-1", "Smith-2"].sort()
    );
  });
});
