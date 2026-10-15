import { foldName, groupNameSpellings, isCustomGroup, mergeNames, nameKeyFor, parseNameGroupingPrompt, setCustomNameGroups, setMainName, spellingsText, surnameGroupKey, ungroupNames } from "./chat_name_variants";

describe("name variants", () => {
  test("foldName drops accents and special letters", () => {
    expect(foldName(" José ")).toBe("jose");
    expect(foldName("Łukasz Østergård")).toBe("lukasz ostergard");
    expect(foldName("Strauß")).toBe("strauss");
  });
  test("One Name Study spellings share a key; others keep their own", () => {
    expect(surnameGroupKey("Bezuidenhout")).toBe(surnameGroupKey("Besuijdenhoudt"));
    expect(surnameGroupKey("Bezuidenhout")).toBe(surnameGroupKey("Besúidenhoúd"));
    expect(surnameGroupKey("Abbott")).toBe(surnameGroupKey("Abbot"));
    expect(surnameGroupKey("van Blois")).toBe(surnameGroupKey("Blois"));
    expect(surnameGroupKey("Wieberg")).toBe(surnameGroupKey("Wiborg"));
    expect(surnameGroupKey("Abbott")).not.toBe(surnameGroupKey("Smith"));
    expect(surnameGroupKey("Smith")).toBe("smith");
  });
  test("groups label with the commonest spelling", () => {
    const groups = groupNameSpellings(["Jose", "José", "José", "Ann"]);
    expect(groups.labelOf("Jose")).toBe("José");
    expect(groups.labelOf("Ann")).toBe("Ann");
    expect([...groups.spellings.keys()]).toEqual(["José"]);
    expect(spellingsText(groups.spellings.get("José"))).toBe("José (2), Jose");
  });
});

describe("your own groupings", () => {
  beforeEach(() => setCustomNameGroups(null));
  afterAll(() => setCustomNameGroups(null));

  test("merging Smith and Smit counts them as one surname, and says it was you", async () => {
    expect(nameKeyFor("surname")("Smith")).not.toBe(nameKeyFor("surname")("Smit"));
    await mergeNames("surname", "Smith", "Smit");
    expect(nameKeyFor("surname")("Smith")).toBe(nameKeyFor("surname")("Smit"));
    expect(isCustomGroup(["Smith", "Smit"], "surname")).toBe(true);
    expect(isCustomGroup(["Abbott", "Abbot"], "surname")).toBe(false);
    // Surnames only: first names keep their own groups.
    expect(nameKeyFor("first")("Smith")).not.toBe(nameKeyFor("first")("Smit"));
  });

  test("a merge joins whole groups", async () => {
    await mergeNames("surname", "Kool", "Smith");
    const key = nameKeyFor("surname");
    expect(key("Cole")).toBe(key("Smith"));
  });

  test("ungroup drops your merge", async () => {
    await mergeNames("surname", "Smith", "Smit");
    await ungroupNames("surname", ["Smit", "Smith"]);
    expect(nameKeyFor("surname")("Smith")).not.toBe(nameKeyFor("surname")("Smit"));
  });

  test("ungroup splits a study or accent group, and a later merge joins it again", async () => {
    await ungroupNames("surname", ["Kool", "Cole"]);
    expect(nameKeyFor("surname")("Kool")).not.toBe(nameKeyFor("surname")("Cole"));
    await ungroupNames("first", ["José", "Jose"]);
    expect(nameKeyFor("first")("José")).not.toBe(nameKeyFor("first")("Jose"));
    await mergeNames("surname", "Cole", "Kool");
    expect(nameKeyFor("surname")("Kool")).toBe(nameKeyFor("surname")("Cole"));
  });
});

describe("parseNameGroupingPrompt", () => {
  test.each([
    ["count Smith as Smit", { action: "merge", kind: "surname", names: ["Smith", "Smit"], main: "Smit" }],
    ["Group Smith with Smit please", { action: "merge", kind: "surname", names: ["Smith", "Smit"], main: "Smit" }],
    ["treat Smith and Smit as the same surname", { action: "merge", kind: "surname", names: ["Smith", "Smit"] }],
    ["count Jan and Johannes as the same first name", { action: "merge", kind: "first", names: ["Jan", "Johannes"] }],
    ["Smith is the same surname as Smit", { action: "merge", kind: "surname", names: ["Smith", "Smit"], main: "Smit" }],
    ["count van der Merwe as Vandermerwe", { action: "merge", kind: "surname", names: ["van der Merwe", "Vandermerwe"], main: "Vandermerwe" }],
    ["count smith and smit as one name", { action: "merge", kind: "surname", names: ["smith", "smit"] }],
    ["ungroup Smith", { action: "ungroup", kind: "surname", names: ["Smith"] }],
    ["separate Cole from Kool", { action: "ungroup", kind: "surname", names: ["Cole", "Kool"] }],
    ["count José separately", { action: "ungroup", kind: "surname", names: ["José"] }],
    ["stop grouping Smith and Smit", { action: "ungroup", kind: "surname", names: ["Smith", "Smit"] }],
    ["show my name groupings", { action: "list" }],
  ])("%s", (prompt, expected) => {
    expect(parseNameGroupingPrompt(prompt)).toEqual(expected);
  });
  test.each(["count births as deaths", "group my ancestors by decade", "count Smith as Smith", "who was Smith", "count the Smiths in my tree", "group Smith with Smit and Brown and Jones and Lee and Kool"])("declines %s", (prompt) => {
    expect(parseNameGroupingPrompt(prompt)).toBeNull();
  });
});

describe("the main spelling", () => {
  beforeEach(() => setCustomNameGroups(null));
  afterAll(() => setCustomNameGroups(null));
  const names = ["Smith", "Smith", "Smith", "Smit"];

  test("the name dropped onto is shown, even when it's the rarer one", async () => {
    await mergeNames("surname", "Smit", "Smith");
    const groups = groupNameSpellings(names, nameKeyFor("surname"), "surname");
    expect(groups.labelOf("Smith")).toBe("Smit");
    expect(groups.spellings.get("Smit")).toEqual([["Smit", 1], ["Smith", 3]]);
  });
  test("dropping the other way shows the other", async () => {
    await mergeNames("surname", "Smith", "Smit");
    expect(groupNameSpellings(names, nameKeyFor("surname"), "surname").labelOf("Smit")).toBe("Smith");
  });
  test("no main chosen: the commonest", async () => {
    await mergeNames("surname", "Smit", "Smith", null);
    expect(groupNameSpellings(names, nameKeyFor("surname"), "surname").labelOf("Smit")).toBe("Smith");
  });
  test("Show as changes a study group's name, and the last choice wins", async () => {
    await setMainName("surname", "Cole");
    const groups = () => groupNameSpellings(["Kool", "Kool", "Cole"], nameKeyFor("surname"), "surname");
    expect(groups().labelOf("Kool")).toBe("Cole");
    await setMainName("surname", "Kool");
    expect(groups().labelOf("Cole")).toBe("Kool");
  });
});
