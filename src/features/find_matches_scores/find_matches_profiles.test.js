/*
Created By: Ian Beacall (Beacall-6)

Run against a real getPeople response (nuclear:1 for Baxter-6788, Baxter-8158 and
Becker-3484, saved 2026-08-23), so the field shapes here are WikiTree's actual ones rather
than what the API documentation implies: Spouses arrives as an array, DeathDateDecade says
"unknown" rather than being empty, and an absent parent is the number 0.
*/

import people from "./__fixtures__/getpeople_baxter.json";
import { buildProfiles } from "./find_matches_profiles";
import { scorePair } from "./match_scoring";

const WANTED = ["Baxter-6788", "Baxter-8158", "Becker-3484"];

function load() {
  const raw = new Map(Object.entries(people).map(([id, person]) => [String(id), person]));
  return buildProfiles(raw, WANTED);
}

describe("buildProfiles", () => {
  test("keeps only the profiles asked for, not their relatives", () => {
    const profiles = load();
    expect([...profiles.keys()].sort()).toEqual(["baxter 6788", "baxter 8158", "becker 3484"]);
  });

  test("reads a year-only birth date and its decade", () => {
    const anchor = load().get("baxter 6788");
    expect(anchor.birthCompact).toBe("18340000");
    expect(anchor.deathCompact).toBe("");
  });

  test("treats an absent parent (Father: 0) as no parent", () => {
    const anchor = load().get("baxter 6788");
    expect(anchor.fatherId).toBe("");
    expect(anchor.parentRefs).toEqual([]);
  });

  test("reads parents that are present, with their names and LNABs", () => {
    const baxter8158 = load().get("baxter 8158");
    expect(baxter8158.parentRefs.map((ref) => ref.role).sort()).toEqual(["Father", "Mother"]);
    expect(baxter8158.parentRefs.find((ref) => ref.role === "Father").firstName).toBe("George");
  });

  test("reads spouses out of the array getPeople actually returns", () => {
    const anchor = load().get("baxter 6788");
    expect(anchor.spouses).toHaveLength(1);
    expect(anchor.spouses[0].wtId).toBe("Ritchie-3798");
    expect(anchor.spouses[0].marriageYear).toBe("1861");
  });

  test("finds children from the parent pointers on the children themselves", () => {
    const becker = load().get("becker 3484");
    expect(becker.children.length).toBe(6);
    expect(becker.children.map((child) => child.nameKey)).toContain("sophia");
    expect(becker.children.every((child) => child.birthYear)).toBe(true);
  });

  test("a profile with no children in the response gets an empty list, not undefined", () => {
    expect(load().get("baxter 6788").children).toEqual([]);
  });
});

describe("scoring the real response", () => {
  test("both Baxter-6788 candidates are rejected, as the page's results deserve", () => {
    const profiles = load();
    const anchor = profiles.get("baxter 6788");

    const baxter8158 = scorePair(anchor, profiles.get("baxter 8158"));
    expect(baxter8158.rejected).toBe(true);
    expect(baxter8158.score).toBe(0);

    const becker3484 = scorePair(anchor, profiles.get("becker 3484"));
    expect(becker3484.rejected).toBe(true);
    expect(becker3484.rejectReason).toBeTruthy();
  });

  test("every candidate carries a reason once scored", () => {
    const profiles = load();
    const anchor = profiles.get("baxter 6788");

    for (const wtId of ["baxter 8158", "becker 3484"]) {
      const result = scorePair(anchor, profiles.get(wtId));
      expect(result.reasons.length + result.warnings.length).toBeGreaterThan(0);
      expect(result.level).toBeTruthy();
    }
  });

  test("a profile scored against itself comes out near-certain", () => {
    const profiles = load();
    const becker = profiles.get("becker 3484");
    const result = scorePair(becker, becker);

    expect(result.rejected).toBe(false);
    expect(result.score).toBe(100);
    expect(result.level).toBe("Near-certain");
  });
});
