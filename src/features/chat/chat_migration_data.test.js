import {
  placeRegion,
  buildMigration,
  buildMigrationSummary,
  buildMigrationYearSummary,
  parseMigrationMapPrompt,
  buildDescendantMigration,
  buildDescendantMigrationSummary,
  isSamePlaceVaguer,
} from "./chat_migration_data";

describe("placeRegion", () => {
  test.each([
    ["Wem, Shropshire, England", "England", "England"],
    ["Edinburgh, Scotland, United Kingdom", "Scotland", "Scotland"],
    ["Boston, Suffolk, Massachusetts, United States", "Massachusetts", "United States"],
    ["Plymouth, Plymouth Colony", "Massachusetts", "United States"],
    ["Jamestown, Colony of Virginia", "Virginia", "United States"],
    ["Toronto, Ontario, Canada", "Ontario", "Canada"],
    ["Hobart, Tasmania, Australia", "Tasmania", "Australia"],
    ["Nelson, New Zealand", "New Zealand", "New Zealand"],
    ["Bonn, Germany", "Germany", "Germany"],
  ])("%s", (location, key, country) => {
    expect(placeRegion(location)).toEqual({ key, country });
  });

  test("Victoria, British Columbia stays in Canada; empty is null", () => {
    expect(placeRegion("Victoria, British Columbia, Canada")).toEqual({ key: "British Columbia", country: "Canada" });
    expect(placeRegion("")).toBeNull();
  });
});

describe("buildMigration", () => {
  const p = (name, birthLocation, birth = "") => ({ name, wtid: `${name}-1`, birthLocation, birth });
  const slots = [];
  slots[1] = p("Root", "Nelson, New Zealand", "1900-01-01");
  slots[2] = p("Dad", "Cork, Ireland", "1870");
  slots[3] = p("Mum", "Nelson, New Zealand", "1875");
  slots[4] = p("Grandad", "Cork, Ireland");
  slots[5] = p("Grandma", "Kent, England");
  slots[6] = p("Other", "Kent, England");
  slots[7] = p("Unknown", "");

  test("places, moves and summary", () => {
    const migration = buildMigration(slots);
    expect(migration.places.map((place) => [place.key, place.count])).toEqual([
      ["England", 2],
      ["Ireland", 2],
      ["New Zealand", 2],
    ]);
    expect(migration.unplaced).toBe(1);
    expect(migration.moves).toBe(3);
    // (each place's earliest birth, for the year slider; England has no dated births)
    expect(Object.fromEntries(migration.places.map((place) => [place.key, place.firstYear]))).toEqual({ England: null, Ireland: 1870, "New Zealand": 1875 });
    expect(migration.flows.map((flow) => `${flow.from}→${flow.to}:${flow.count}:${flow.firstYear}`)).toEqual([
      "England→Ireland:1:1870",
      "England→New Zealand:1:1875",
      "Ireland→New Zealand:1:1900",
    ]);
    expect(buildMigrationSummary(migration, "Root's")).toBe(
      "Root's map shows 3 moves between 3 places (a parent born in one place, their child in another). The biggest: England → Ireland (1). The earliest: England → Ireland, by 1870."
    );
  });
});

describe("a vaguer birthplace is not a move", () => {
  test("isSamePlaceVaguer", () => {
    expect(isSamePlaceVaguer("England", "Worcester, Worcestershire, England")).toBe(true);
    expect(isSamePlaceVaguer("Shrewsbury, Shropshire, England", "Shropshire, England")).toBe(true);
    expect(isSamePlaceVaguer("England, United Kingdom", "Worcester, Worcestershire, England, United Kingdom")).toBe(true);
    expect(isSamePlaceVaguer("Wem, Shropshire, England", "Hodnet, Shropshire, England")).toBe(false);
    expect(isSamePlaceVaguer("Kent, England", "Cork, Ireland")).toBe(false);
    expect(isSamePlaceVaguer("", "Kent, England")).toBe(false);
  });

  test("the map leaves out a move from a county to a town in it", () => {
    const slots = [];
    slots[1] = { name: "Philip", birthLocation: "Worcester, Worcestershire, England", birth: "1823" };
    slots[2] = { name: "John", birthLocation: "England", birth: "1790" };
    slots[3] = { name: "Elizabeth", birthLocation: "Wem, Shropshire, England", birth: "1798" };
    const pointFor = (location) =>
      ({ "Worcester, Worcestershire, England": { name: "Worcester", point: [-2.2, 52.2] }, "Wem, Shropshire, England": { name: "Wem", point: [-2.7, 52.9] } })[location] || null;
    const migration = buildMigration(slots, pointFor);
    expect(migration.flows.map((flow) => `${flow.from}→${flow.to}`)).toEqual(["Wem→Worcester"]);
    expect(migration.moves).toBe(1);
  });
});

describe("parseMigrationMapPrompt", () => {
  test.each([
    ["show me my migration map", "my"],
    ["migration map", ""],
    ["Cook-8721's ancestor map", "Cook-8721"],
    ["map my ancestors", "my"],
    ["show her ancestors on a map", "her"],
    ["how did my ancestors migrate?", "my"],
    ["a map of his ancestors' migrations", "his"],
  ])("%s", (prompt, owner) => {
    expect(parseMigrationMapPrompt(prompt)?.owner).toBe(owner);
  });

  test.each(["where did my ancestors come from?", "show me a map", "my ancestors born in Ireland"])("declines %s", (prompt) => {
    expect(parseMigrationMapPrompt(prompt)).toBeNull();
  });
});

describe("the map at a year", () => {
  test.each([
    ["where were my ancestors living in 1850?", "my", 1850],
    ["where did her ancestors live in 1800", "her", 1800],
    ["map Cook-8721's ancestors in 1750", "Cook-8721", 1750],
    ["show my ancestors on a map in 1900", "my", 1900],
  ])("%s", (prompt, owner, year) => {
    expect(parseMigrationMapPrompt(prompt)).toEqual(expect.objectContaining({ owner, year }));
  });

  test("who was alive, and where they were born and died", () => {
    const p = (id, birth, death, birthLocation, deathLocation) => ({ id, name: id, wtid: `${id}-1`, birth, death, birthLocation, deathLocation });
    const slots = [null, p("Root", "1900", "", "Nelson, New Zealand", "")];
    slots[2] = p("Dad", "1840", "1910", "Cork, Ireland", "Nelson, New Zealand");
    slots[3] = p("Mum", "1845", "", "Kent, England", "");
    slots[4] = p("Grandad", "1800", "1849", "Cork, Ireland", "Cork, Ireland");
    slots[5] = p("Grandma", "1790", "", "Kent, England", "");
    const text = buildMigrationYearSummary(slots, 1850, "Your");
    expect(text).toContain("In 1850, 3 of your ancestors were alive.");
    expect(text).toContain("They were born in England (2), Ireland (1).");
    expect(text).toContain("They would die in New Zealand (1).");
    expect(buildMigrationYearSummary(slots, 1700, "Your")).toMatch(/^None of your ancestors/);
  });
});

describe("descendants on the map", () => {
  test.each([
    ["map her descendants", "her"],
    ["where did his descendants go?", "his"],
    ["descendants map", ""],
    ["Cook-8721's descendant map", "Cook-8721"],
    ["show my descendants on a map", "my"],
  ])("%s", (prompt, owner) => {
    expect(parseMigrationMapPrompt(prompt)).toEqual(expect.objectContaining({ owner, descendants: true }));
  });
  test("where were her descendants born isn't the map", () => {
    expect(parseMigrationMapPrompt("where were her descendants born")).toBeNull();
  });

  const node = (name, birthLocation, birth, depth, children = []) => ({ person: { name, wtid: `${name}-1`, birthLocation, birth }, depth, children });
  const tree = node("Root", "Cork, Ireland", "1820", 0, [
    node("Son", "Cork, Ireland", "1850", 1, [node("Grandson", "Nelson, New Zealand", "1880", 2), node("Granddaughter", "", "1882", 2, [node("Great", "Ohio, USA", "1910", 3)])]),
    node("Daughter", "Kent, England", "1852", 1),
  ]);

  test("moves down the tree; a gap passes on the parent's place", () => {
    const migration = buildDescendantMigration(tree);
    expect(migration.flows.map((flow) => `${flow.from}→${flow.to}:${flow.firstYear}`)).toEqual(["Ireland→England:1852", "Ireland→New Zealand:1880", "Ireland→Ohio:1910"]);
    expect(migration.unplaced).toBe(1);
    expect(migration.places.find((place) => place.key === "Ireland").count).toBe(2);
    const text = buildDescendantMigrationSummary(migration, "Root's");
    expect(text).toContain("Root's descendants were born in 4 places: Ireland (2), England (1), New Zealand (1), Ohio (1).");
    expect(text).toContain("The first: Ireland → England, by 1852.");
    expect(text).toContain("The newest place for Root's family: Ohio, from 1910.");
  });
});
