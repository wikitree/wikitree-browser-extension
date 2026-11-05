/* familyMatchUtils reaches core/common through dateUtils, which reads chrome.runtime at
import time, so the extension APIs have to exist before the module is loaded. */
let updateRelations;
let parseFamilyData;
let createFamilyNarrative;
let buildHouseholdTableFromHousehold;

beforeAll(async () => {
  const noop = () => {};
  global.chrome = {
    runtime: {
      getManifest: () => ({ name: "WBE (Debug)", version: "0" }),
      getURL: (path) => path,
      onMessage: { addListener: noop },
      sendMessage: noop,
      lastError: null,
    },
    storage: { sync: { get: noop, set: noop }, local: { get: noop, set: noop } },
  };
  ({ updateRelations, parseFamilyData, createFamilyNarrative } = await import("./familyMatchUtils.js"));
  ({ buildHouseholdTableFromHousehold } = await import("./censusTableUtils.js"));
});

/* Trosen-13: Norma is a two-year-old grandchild in her grandfather's household, and the
biography said she was living "with her wife, Augusta Tapel (54); their daughter, Martha". */
const trosen1920 = () => [
  { Name: "August Tapel", Relation: "Head", originalRelation: "Head", Gender: "Male", Age: "61" },
  { Name: "Augusta Tapel", Relation: "Wife", originalRelation: "Wife", Gender: "Female", Age: "54" },
  { Name: "Emil Trosin", Relation: "Son-in-law", originalRelation: "Son-in-law", Gender: "Male", Age: "27" },
  { Name: "Martha Trosin", Relation: "Daughter", originalRelation: "Daughter", Gender: "Female", Age: "33" },
  { Name: "Norma Trosin", Relation: "Self", originalRelation: "Grandchild", Gender: "Female", Age: "2" },
];

/* Wood-24677's father's household: the profile person is the head's son, which the table of
relations does know how to translate. */
const wood1871 = () => [
  { Name: "Thomas Winder", Relation: "Head", originalRelation: "Head", Gender: "Male", Age: "48" },
  { Name: "Mary Winder", Relation: "Wife", originalRelation: "Wife", Gender: "Female", Age: "46" },
  { Name: "John Winder", Relation: "Self", originalRelation: "Son", Gender: "Male", Age: "19" },
  { Name: "Frederick Winder", Relation: "Son", originalRelation: "Son", Gender: "Male", Age: "11" },
];

describe("updateRelations", () => {
  beforeEach(() => {
    window.profilePerson = { Gender: "Female", LastNameAtBirth: "Trosin", LastNameCurrent: "Trosen" };
  });

  afterEach(() => {
    delete window.profilePerson;
  });

  test("marks a relation it cannot translate as being to the head of the household", () => {
    const household = updateRelations(trosen1920());
    const byName = Object.fromEntries(household.map((person) => [person.Name, person]));

    expect(byName["Augusta Tapel"].RelationToHeadOnly).toBe(true);
    expect(byName["Martha Trosin"].RelationToHeadOnly).toBe(true);
    expect(byName["August Tapel"].RelationToHeadOnly).toBe(true);
    expect(byName["Emil Trosin"].RelationToHeadOnly).toBe(true);
  });

  test("leaves a translated relation unmarked", () => {
    window.profilePerson = { Gender: "Male", LastNameAtBirth: "Winder", LastNameCurrent: "Winder" };
    const household = updateRelations(wood1871());
    const byName = Object.fromEntries(household.map((person) => [person.Name, person]));

    expect(byName["Thomas Winder"].Relation).toBe("Father");
    expect(byName["Thomas Winder"].RelationToHeadOnly).toBe(false);
    expect(byName["Mary Winder"].Relation).toBe("Mother");
    expect(byName["Mary Winder"].RelationToHeadOnly).toBe(false);
    expect(byName["Frederick Winder"].Relation).toBe("Brother");
    expect(byName["Frederick Winder"].RelationToHeadOnly).toBe(false);
  });

  test("does not undo its own work when the household is passed through twice", () => {
    // Winder-432: two passes ran over the same household and the second read "Father" — which
    // the first had worked out — as though it were the census's own word for the head.
    window.profilePerson = { Gender: "Male", LastNameAtBirth: "Winder", LastNameCurrent: "Winder" };
    const household = updateRelations(updateRelations(wood1871()));
    const byName = Object.fromEntries(household.map((person) => [person.Name, person]));

    expect(byName["Thomas Winder"].Relation).toBe("Father");
    expect(byName["Thomas Winder"].RelationToHeadOnly).toBe(false);
    expect(byName["Mary Winder"].RelationToHeadOnly).toBe(false);
  });

  test("keeps the flag off the census table", () => {
    const household = updateRelations(trosen1920());

    expect(household.some((person) => person.RelationToHeadOnly === true)).toBe(true);
    expect(buildHouseholdTableFromHousehold(household)).not.toMatch("RelationToHeadOnly");
  });

  test("leaves the household alone when the profile person is the head", () => {
    window.profilePerson = { Gender: "Male", LastNameAtBirth: "Winder", LastNameCurrent: "Winder" };
    const household = updateRelations([
      { Name: "John Winder", Relation: "Self", originalRelation: "Head", Gender: "Male", Age: "29" },
      { Name: "Priscilla Winder", Relation: "Wife", originalRelation: "Wife", Gender: "Female", Age: "24" },
    ]);

    expect(household[1].Relation).toBe("Wife");
    expect(household[1].RelationToHeadOnly).not.toBe(true);
  });
});

/* Wood-24677's 1871 household, as the old biography listed it. The census records each person's
relation to the head, Thomas Winder; the profile person is his son John. */
const wood1871List = `: Thomas Winder    Head        M    48    Cordwainer & publican    Wombwell, Yorkshire, England
: Mary Winder    Wife        F    46    Cordwainer wife    Darfield, Yorkshire, England
: Sarah Ann Winder    Daughter        F    22    Cordwainer daughter    Wombwell, Yorkshire, England
: John Hargate Winder    Son        M    19    Laborer at coal mine    Wombwell, Yorkshire, England
: Joseph Hargate    Nephew        M    22    Laborer at coal mine    Sheffield, Yorkshire, England
: Lucy Ann Hargate    Niece        F    20    Steelmetters daur    Sheffield, Yorkshire, England`;

describe("a household read from the old biography", () => {
  beforeEach(() => {
    window.profilePerson = {
      Gender: "Male",
      LastNameAtBirth: "Winder",
      LastNameCurrent: "Winder",
      NameVariants: ["John Hargate Winder", "John Winder", "John"],
      /* John's own son Joe, born thirty years after the census: near enough in name to be
      mistaken for the head's nephew Joseph, and the reason the surname has to agree. */
      Children: {
        1: {
          FirstName: "Joe",
          LastNameAtBirth: "Winder",
          LastNameCurrent: "Winder",
          Gender: "Male",
          BirthDate: "1882-00-00",
        },
      },
    };
    window.sectionsObject = { "Research Notes": { subsections: { NeedsProfiles: [] } } };
  });

  afterEach(() => {
    delete window.profilePerson;
    delete window.sectionsObject;
  });

  test("keeps the head's nephew a nephew instead of making him a son", () => {
    const household = parseFamilyData(wood1871List, { format: "list", year: "1871" });
    household.forEach((person) => {
      if (person.Name === "John Hargate Winder") {
        person.Relation = "Self";
      }
    });

    const byName = Object.fromEntries(updateRelations(household).map((person) => [person.Name, person]));

    expect(byName["Joseph Hargate"].Relation).toBe("Nephew");
    expect(byName["Joseph Hargate"].RelationToHeadOnly).toBe(true);
    expect(byName["Lucy Ann Hargate"].Relation).toBe("Niece");
    expect(byName["Lucy Ann Hargate"].RelationToHeadOnly).toBe(true);
  });

  test("still works out the relations it can", () => {
    const household = parseFamilyData(wood1871List, { format: "list", year: "1871" });
    household.forEach((person) => {
      if (person.Name === "John Hargate Winder") {
        person.Relation = "Self";
      }
    });

    const byName = Object.fromEntries(updateRelations(household).map((person) => [person.Name, person]));

    expect(byName["Thomas Winder"].Relation).toBe("Father");
    expect(byName["Thomas Winder"].RelationToHeadOnly).toBe(false);
    expect(byName["Mary Winder"].Relation).toBe("Mother");
    expect(byName["Sarah Ann Winder"].Relation).toBe("Sister");
    expect(byName["Sarah Ann Winder"].RelationToHeadOnly).toBe(false);
  });
});

describe("createFamilyNarrative wording", () => {
  beforeEach(() => {
    window.profilePerson = {
      Gender: "Male",
      LastNameAtBirth: "Winder",
      LastNameCurrent: "Winder",
      Pronouns: { possessiveAdjective: "his", subject: "he" },
    };
  });

  afterEach(() => {
    delete window.profilePerson;
  });

  const self = { Name: "John Winder", Relation: "Self", Age: "19" };

  test("joins two people with 'and', not with ', and'", () => {
    const narrative = createFamilyNarrative([
      self,
      { Name: "Joseph Hargate", Relation: "Nephew", Age: "22", RelationToHeadOnly: true },
      { Name: "Lucy Ann Hargate", Relation: "Niece", Age: "20", RelationToHeadOnly: true },
    ]);

    expect(narrative).toContain("Joseph Hargate (22, nephew) and Lucy Ann Hargate (20, niece)");
    expect(narrative).not.toContain(", and Lucy Ann");
  });

  test("keeps the comma in a list of three", () => {
    const narrative = createFamilyNarrative([
      self,
      { Name: "Sarah Ann Winder", Relation: "Sister", Age: "22" },
      { Name: "William Winder", Relation: "Brother", Age: "21" },
      { Name: "Herbert Winder", Relation: "Brother", Age: "9" },
    ]);

    expect(narrative).toContain("William (21), and Herbert (9)");
  });

  test("does not double the space before a child's age", () => {
    const narrative = createFamilyNarrative([
      self,
      { Name: "Mary Winder", Relation: "Daughter", Age: "1" },
      { Name: "John B Winder", Relation: "Son", Age: "0" },
    ]);

    expect(narrative).not.toMatch(/ {2}/);
    expect(narrative).toContain("Mary (1) and John B (0)");
  });
});
