import {
  asksWhetherPeopleHaveProfiles,
  buildFindRelativesAnswer,
  namedPeopleAsRelatives,
  parseFindNamedPeoplePrompt,
  relativeFromName,
  relativesFromAiJson,
  searchRelatives,
} from "./chat_bio_relatives";
import { plannedSearchAsNamedPeople, plannerDriftsToConnection } from "./chat_planner";

// Heard-171 (2026-10-31): her bio's "new adoptive parents were Jean Prévost and Françoise Lamontagne (aka
// Françoise Leblanc)" are Jean Provost (Provost-489) and Françoise Leblanc (Leblanc-147) on WikiTree.
const SUBJECT = { Id: 1, Name: "Heard-171", FirstName: "Marie", MiddleName: "Anne", LastNameAtBirth: "Heard", LastNameCurrent: "Prévost", Gender: "Female", BirthDate: "1681-00-00" };
const PROVOST = { Id: 9923720, Name: "Provost-489", FirstName: "Jean", LastNameAtBirth: "Provost", LastNameCurrent: "Provost", LastNameOther: "", RealName: "Jean", Gender: "Male", BirthDate: "1653-04-05", BirthLocation: "Rouen, Normandie, France" };
const LEBLANC = { Id: 1232587, Name: "Leblanc-147", FirstName: "Françoise", Nicknames: "Marie", LastNameAtBirth: "Leblanc", LastNameCurrent: "Leblanc", LastNameOther: "", RealName: "Françoise", Gender: "Female", BirthDate: "1662-01-18", BirthLocation: "Beauport, Canada, Nouvelle-France" };
const OTHER_JEAN = { Id: 5, Name: "Prévost-480", FirstName: "Jean", LastNameAtBirth: "Prévost", LastNameCurrent: "Prévost", Gender: "Male", BirthDate: "1661-03-18" };

const search = (relatives, subject = SUBJECT) =>
  searchRelatives({
    subject,
    relatives,
    searchPerson: async (params) => ({
      matches: params.FirstName === "Jean" ? [OTHER_JEAN, PROVOST] : params.LastName === "Leblanc" ? [LEBLANC] : [],
      total: 2,
    }),
    getPeople: async () => [],
    getSpouses: async (ids) => new Map(ids.map((id) => [id, id === PROVOST.Id ? [LEBLANC] : id === LEBLANC.Id ? [PROVOST] : []])),
  });

describe("parseFindNamedPeoplePrompt", () => {
  test.each([
    ["Please locate profiles of the couple Jean Prévost and Françoise Lamontagne on WikiTree.", ["Jean Prévost", "Françoise Lamontagne"], true],
    ["Do Jean Prévost and Françoise Lamontagne have WikiTree profiles?", ["Jean Prévost", "Françoise Lamontagne"], false],
    ["Are Jean Prévost and Françoise Lamontagne on WikiTree?", ["Jean Prévost", "Françoise Lamontagne"], false],
    ["Is there a profile for Sébastien Cholet dit Laviolette?", ["Sébastien Cholet dit Laviolette"], false],
    ["Find profiles for John Smith, Mary Jones and Ann Brown", ["John Smith", "Mary Jones", "Ann Brown"], false],
    ["Can you find the profiles of husband and wife John Smith and Mary Jones?", ["John Smith", "Mary Jones"], true],
  ])("%s", (prompt, names, couple) => {
    expect(parseFindNamedPeoplePrompt(prompt)).toEqual({ names, couple });
  });

  test.each([
    "Do his parents have profiles?",
    "Do any of the people in the bio have WikiTree profiles?",
    "Do those people have WikiTree profiles?",
    "Does Ann have a profile?", // one word: not a full name
    "find his family on WikiTree",
    "This profile mentions that Ann Heard's new adoptive parents were Jean Prévost and Françoise Lamontagne. Do those people have WikiTree profiles?",
  ])("not a named-people question: %s", (prompt) => {
    expect(parseFindNamedPeoplePrompt(prompt)).toBeNull();
  });
});

describe("the people asked about, as the biography knows them", () => {
  const bioRelatives = relativesFromAiJson(
    {
      relatives: [
        { role: "father", name: "Jean Prévost" },
        { role: "mother", name: "Françoise Lamontagne", birthSurname: "Leblanc" },
        { role: "spouse", name: "Sébastien Cholet", gender: "Male" },
      ],
    },
    SUBJECT
  );

  test("names the bio gives are its father and mother, with each other as partner", () => {
    const people = namedPeopleAsRelatives(["Jean Prévost", "Françoise Lamontagne"], bioRelatives);
    expect(people.map((person) => person.role)).toEqual(["father", "mother"]);
    expect(people[1].surnames).toEqual(["Leblanc", "Lamontagne"]);
    expect(people.every((person) => person.asked && !person.partnerKey)).toBe(true);
  });

  test("one the bio gives under another surname is the only one there with that first name", () => {
    const read = relativesFromAiJson({ relatives: [{ role: "father", name: "Jean Prévost" }, { role: "mother", name: "Françoise Leblanc" }] }, SUBJECT);
    const people = namedPeopleAsRelatives(["Jean Prévost", "Françoise Lamontagne"], read);
    expect(people.map((person) => [person.role, person.surnames])).toEqual([
      ["father", ["Prévost"]],
      ["mother", ["Leblanc", "Heard", "Lamontagne"]],
    ]);
    // (two Françoises in the bio: neither is assumed)
    const two = relativesFromAiJson({ relatives: [{ role: "mother", name: "Françoise Leblanc" }, { role: "child", name: "Françoise Cholet" }] }, SUBJECT);
    expect(namedPeopleAsRelatives(["Françoise Lamontagne"], two)[0].role).toBe("other");
  });

  test("names the bio doesn't give are searched by name, paired when asked as a couple", () => {
    const people = namedPeopleAsRelatives(["John Smith", "Mary Jones"], bioRelatives, { couple: true });
    expect(people.map((person) => [person.role, person.surnames, person.partnerKey])).toEqual([
      ["other", ["Smith"], "asked couple"],
      ["other", ["Jones"], "asked couple"],
    ]);
    expect(namedPeopleAsRelatives(["John Smith", "Mary Jones"], bioRelatives)[0].partnerKey).toBeUndefined();
  });

  test("a woman's children are searched with her husband's surname, not her maiden name", () => {
    const relatives = relativesFromAiJson(
      { relatives: [{ role: "spouse", name: "Sébastien Cholet", gender: "Male" }, { role: "child", name: "Joseph", birthYear: 1713 }] },
      SUBJECT
    );
    expect(relatives.find((person) => person.role === "child").surnames).toEqual(["Cholet"]);
    // "Cholet dit Laviolette": his surname at birth, as the AI gave it
    const dit = relativesFromAiJson(
      {
        relatives: [
          { role: "spouse", name: "Sébastien Cholet dit Laviolette", birthSurname: "Cholet", gender: "Male" },
          { role: "child", name: "Joseph Laviolette", birthYear: 1713 },
        ],
      },
      SUBJECT
    );
    expect(dit.find((person) => person.role === "child").surnames).toEqual(["Cholet", "Laviolette"]);
  });
});

describe("a couple found married to each other on WikiTree", () => {
  test("Jean Provost and Françoise Leblanc vouch for the bio's Jean Prévost and Françoise Lamontagne", async () => {
    const relatives = relativesFromAiJson(
      { relatives: [{ role: "father", name: "Jean Prévost" }, { role: "mother", name: "Françoise Lamontagne", birthSurname: "Leblanc", birthPlace: "Montreal" }] },
      SUBJECT
    );
    const results = await search(namedPeopleAsRelatives(["Jean Prévost", "Françoise Lamontagne"], relatives));
    const [father, mother] = results.map((entry) => entry.candidates[0]);
    expect([father.profile.Name, father.score]).toEqual(["Provost-489", 75]);
    expect(father.reasons[0]).toBe("Married to Françoise Leblanc (Leblanc-147), who fits the biography's mother, Françoise (Leblanc) Lamontagne");
    expect([mother.profile.Name, mother.score]).toEqual(["Leblanc-147", 75]);
    // (the other Jean, married to no Françoise, stays where his name puts him)
    expect(results[0].candidates.find((c) => c.profile.Name === "Prévost-480").score).toBeLessThan(75);

    const answer = buildFindRelativesAnswer({
      subjectLabel: "Marie Anne Heard (Heard-171)",
      results,
      readBy: "read by AI",
      askedNames: ["Jean Prévost", "Françoise Lamontagne"],
    });
    expect(answer.message).toContain("I searched WikiTree for Jean Prévost and Françoise Lamontagne, with what Marie Anne Heard (Heard-171)'s biography says about them (read by AI).");
    expect(answer.message).toContain("**Found as a couple:** Jean Provost (Provost-489) and Françoise Leblanc (Leblanc-147) are married to each other on WikiTree.");
    expect(answer.message).not.toContain("Others named in the biography");
  });

  test("with no profile to read, two asked about as a couple are each other's partner", async () => {
    const people = [relativeFromName("Jean Prévost", { partnerKey: "c" }), relativeFromName("Françoise Leblanc", { partnerKey: "c" })];
    const results = await search(people, { Id: 0 });
    expect(results.map((entry) => [entry.candidates[0].profile.Name, entry.candidates[0].score])).toEqual([
      ["Provost-489", 75],
      ["Leblanc-147", 75],
    ]);
    const answer = buildFindRelativesAnswer({ subjectLabel: "", results, readBy: "", askedNames: ["Jean Prévost", "Françoise Leblanc"] });
    expect(answer.message.split("\n")[0]).toBe("I searched WikiTree for Jean Prévost and Françoise Leblanc.");
    expect(answer.message).toContain("**Found as a couple:**");
  });
});

describe("plannerDriftsToConnection (Heard-171, 2026-10-31)", () => {
  test.each([
    ["Please locate profiles of Jean Prévost and Françoise Lamontagne on WikiTree.", true],
    ["Find the profile of Jean Prévost", true],
    ["How is Jean Prévost related to Heard-171?", false],
    ["Find my connection to Jean Prévost", false],
    ["and to Charles Darwin?", false],
  ])("%s", (prompt, drifts) => {
    expect(plannerDriftsToConnection(prompt, { intent: "connectionLookup", params: { target: "Heard-171" } })).toBe(drifts);
  });
  test("other intents are left alone", () => {
    expect(plannerDriftsToConnection("Find the profile of Jean Prévost", { intent: "profileSearch" })).toBe(false);
  });
});

describe("plannedSearchAsNamedPeople (live, Heard-171, 2026-10-31)", () => {
  const PROMPT =
    "This profile mentions that Ann Heard's new adoptive parents were Jean Prévost and Françoise Lamontagne. Do those people have WikiTree profiles?";
  const search = (query) => ({ intent: "profileSearch", params: { query } });
  test("the planner's search for two full names is those people's own check", () => {
    expect(plannedSearchAsNamedPeople(PROMPT, search("Jean Prévost or Françoise Lamontagne"))).toEqual({
      names: ["Jean Prévost", "Françoise Lamontagne"],
      couple: true,
    });
    expect(plannedSearchAsNamedPeople("Do John Smith and Mary Jones have profiles?", search("John Smith and Mary Jones"))).toEqual({
      names: ["John Smith", "Mary Jones"],
      couple: false,
    });
  });
  test.each([
    [PROMPT, search("Jean Prévost")], // one person: the search is right
    ["Smiths born in Devon in the 1850s", search("Smith Devon 1850s")],
    ["Who were John Smith and Mary Jones?", search("John Smith and Mary Jones")], // not about profiles
    [PROMPT, { intent: "connectionLookup", params: { target: "Jean Prévost" } }],
  ])("left alone: %s → %j", (prompt, planned) => {
    expect(plannedSearchAsNamedPeople(prompt, planned)).toBeNull();
  });
});

describe("asksWhetherPeopleHaveProfiles", () => {
  test.each([
    ["This profile mentions that Ann Heard's new adoptive parents were Jean Prévost and Françoise Lamontagne. Do those people have WikiTree profiles?", true],
    ["In the profile of Heard-171, it mentions that her adoptive parents were Jean Prévost and Françoise Lamontagne. Please locate profiles of Jean Prévost and Françoise Lamontagne on WikiTree.", true],
    ["Do those people have WikiTree profiles?", true],
    ["Are they on WikiTree?", true],
    ["Does Jean Prévost have a profile?", true],
    ["Find profiles of Smiths born in Devon in the 1850s", false],
    ["Do any Smiths born in Devon have profiles?", false],
    ["Smiths born in Devon in the 1850s", false],
    ["What was Montreal like in 1700?", false],
  ])("%s", (prompt, expected) => {
    expect(asksWhetherPeopleHaveProfiles(prompt)).toBe(expected);
  });
});
