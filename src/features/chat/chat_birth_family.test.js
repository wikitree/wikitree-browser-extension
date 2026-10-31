// Birth family answers (user, 2026-10-13: biological parents step 4). The example is Luker-573 (Patty), raised by
// John Simon and Ila Curry (marked non-biological), born to Riley Luker and Frances Johnson.
import { adoptiveParentIds, asksForAdoptiveRelation, asksForBirthRelation, birthParentIds, isBirthChildOf, separateBirthParentIds } from "./chat_birth_family";
import { createChatRelationHandlers } from "./chat_relations";

const person = (Id, Name, FirstName, Gender, extra = {}) => ({ Id, Name, FirstName, LastNameAtBirth: Name.split("-")[0], Gender, ...extra });
const PATTY = person(573, "Luker-573", "Patty", "Female", { Father: 2960, Mother: 3468, BioFather: 574, BioMother: 92386, DataStatus: { Father: "5", Mother: "5", BioFather: "30", BioMother: "30" } });
const JOHN = person(2960, "Simon-2960", "John", "Male");
const ILA = person(3468, "Curry-3468", "Ila", "Female");
const RILEY = person(574, "Luker-574", "Riley", "Male");
const FRANCES = person(92386, "Johnson-92386", "Frances", "Female");
const EARL = person(375, "Tyree-375", "Earl", "Male", { Father: 900, Mother: 92386 });
const RANDY = person(800, "LaPlante-800", "Randy", "Male", { Father: 2960, Mother: 3468 });
const TERRY = person(4, "Rockstrom-4", "Terry", "Male", { Father: 10, Mother: 11, BioFather: 12, BioMother: 573, DataStatus: { Father: "5", Mother: "5" } });
const ALL = [PATTY, JOHN, ILA, RILEY, FRANCES, EARL, RANDY, TERRY];

describe("birth parents from a profile", () => {
  test("BioFather/BioMother first; else Father/Mother unless marked non-biological", () => {
    expect(birthParentIds(PATTY)).toEqual({ father: 574, mother: 92386 });
    expect(birthParentIds(RANDY)).toEqual({ father: 2960, mother: 3468 });
    expect(birthParentIds({ Father: 1, Mother: 2, DataStatus: { Father: "5" } })).toEqual({ father: 0, mother: 2 });
    expect(separateBirthParentIds(PATTY)).toEqual({ father: 574, mother: 92386 });
    expect(separateBirthParentIds(RANDY)).toEqual({ father: 0, mother: 0 });
    expect(isBirthChildOf(EARL, 92386)).toBe(true);
    expect(isBirthChildOf(PATTY, 2960)).toBe(false);
    expect(isBirthChildOf(TERRY, 573)).toBe(true);
  });

  test("the words that ask for the birth family", () => {
    expect(asksForBirthRelation("biological parents", /parents?/)).toBe(true);
    expect(asksForBirthRelation("birth mother", /mothers?|moms?/)).toBe(true);
    expect(asksForBirthRelation("bio siblings", /siblings?|sibs?/)).toBe(true);
    expect(asksForBirthRelation("parents bios", /parents?/)).toBe(false);
    expect(asksForBirthRelation("parents", /parents?/)).toBe(false);
  });

  test("adoptive parents: Father/Mother marked non-biological or apart from BioFather/BioMother", () => {
    expect(adoptiveParentIds(PATTY)).toEqual({ father: 2960, mother: 3468 });
    expect(adoptiveParentIds(RANDY)).toEqual({ father: 0, mother: 0 });
    expect(adoptiveParentIds({ Father: 1, Mother: 2, BioMother: 3 })).toEqual({ father: 0, mother: 2 });
    expect(asksForAdoptiveRelation("adoptive parents", /parents?/)).toBe(true);
    expect(asksForAdoptiveRelation("adopted father", /fathers?|dads?/)).toBe(true);
    expect(asksForAdoptiveRelation("parents", /parents?/)).toBe(false);
  });
});

function makeHandlers(overrides = {}) {
  const byId = new Map(ALL.map((p) => [p.Id, p]));
  const deps = {
    WikiTreeAPI: { getRelatives: jest.fn(async () => [{ person: {} }]) },
    WBE_CHAT_APP_ID: "wbe-chat-test",
    RELATION_PERSON_FIELDS: "Id,Name,FirstName,LastNameAtBirth,Gender",
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "", model: "" })),
    parsePlannerJson: jest.fn(),
    normalizeText: (value) => String(value || "").trim().toLowerCase(),
    promptRefersToUser: jest.fn(() => false),
    resolveConnectionTargetPerson: jest.fn(async (name) => (/terry/i.test(name) ? TERRY : PATTY)),
    getUserWtId: jest.fn(() => "User-1"),
    getUserNumId: jest.fn(() => 1),
    getLoggedInRootPerson: jest.fn(async () => ({ key: 1, wtId: "User-1" })),
    getProfileSubjectRoot: jest.fn(() => null),
    makeStandardProfileTable: jest.fn((title, rows) => ({ title, rows })),
    showBioListPopup: jest.fn(),
    handleOpenFromBioList: jest.fn(),
    fetchPeoplePaged: jest.fn(async (_appId, keys, _fields, options = {}) => {
      const wanted = (Array.isArray(keys) ? keys : [keys]).map((key) => byId.get(Number(key)) || ALL.find((p) => p.Name === key)).filter(Boolean);
      const found = options.descendants ? [...wanted, ...ALL.filter((p) => wanted.some((w) => [p.Father, p.Mother, p.BioFather, p.BioMother].includes(w.Id)))] : wanted;
      return [null, null, Object.fromEntries(found.map((p) => [p.Id, p]))];
    }),
    fetchProfilesForIds: jest.fn(async () => []),
    fetchChildrenIdsForId: jest.fn(async () => []),
    fetchSiblingIdsForId: jest.fn(async () => []),
    fetchParentIds: jest.fn(async (key) => (Number(key) === 573 ? [2960, 3468] : [])),
    isLoggedOutOfAppsServer: jest.fn(() => Promise.resolve(false)),
    ...overrides,
  };
  return { handlers: createChatRelationHandlers(deps), deps };
}

const ask = (relationRaw, subjectName = "Patty") =>
  makeHandlers().handlers.tryHandleRelationCountPrompt({ mode: "list", relationRaw, subjectMode: "named", subjectName }, `${subjectName}'s ${relationRaw}`);
const names = (result) => result.table.rows.map((row) => JSON.stringify(row)).join(" ");

describe("birth family answers", () => {
  test("biological parents are the birth parents", async () => {
    const result = await ask("biological parents");
    expect(result.message).toMatch(/biological parents/);
    expect(names(result)).toMatch(/Luker-574/);
    expect(names(result)).toMatch(/Johnson-92386/);
    expect(names(result)).not.toMatch(/Simon-2960/);
  });

  test("a birth mother; bio siblings are the birth parents' other children, not the adoptive family's", async () => {
    expect(names(await ask("birth mother"))).toMatch(/Johnson-92386/);
    const siblings = names(await ask("bio siblings"));
    expect(siblings).toMatch(/Tyree-375/);
    expect(siblings).not.toMatch(/LaPlante-800|Luker-573/);
  });

  test("biological children include a child raised by others", async () => {
    expect(names(await ask("biological children"))).toMatch(/Rockstrom-4/);
  });

  test("plain parents are the parents who raised them, with the birth parents named", async () => {
    const result = await ask("parents");
    expect(names(result)).toMatch(/Simon-2960/);
    expect(result.message).toMatch(/WikiTree also records a biological father Riley .*\(Luker-574\) and biological mother Frances .*\(Johnson-92386\)\./);
    const father = await ask("father");
    expect(father.message).toMatch(/biological father Riley/);
    expect(father.message).not.toMatch(/biological mother/);
  });

  test("plain siblings point to the birth siblings left out", async () => {
    const result = await ask("siblings");
    const text = typeof result === "string" ? result : result.message;
    expect(text).toMatch(/WikiTree also records 1 biological sibling through their birth parents: Earl .*\(Tyree-375\)\. Ask for "biological siblings"/);
    const sisters = await ask("sisters");
    expect(typeof sisters === "string" ? sisters : sisters.message).not.toMatch(/biological/);
  });
});

// WikiTree's Father and Mother can be the adoptive parents (user, 2026-10-31).
describe("adoptive parent answers", () => {
  test("adoptive parents are the Father/Mother she wasn't born to", async () => {
    const result = await ask("adoptive parents");
    expect(result.message).toMatch(/adoptive parents/);
    expect(names(result)).toMatch(/Simon-2960/);
    expect(names(result)).toMatch(/Curry-3468/);
    expect(names(result)).not.toMatch(/Luker-574|Johnson-92386/);
    const father = names(await ask("adopted father"));
    expect(father).toMatch(/Simon-2960/);
    expect(father).not.toMatch(/Curry-3468/);
  });

  test("linked parents who are birth parents: a failure the AI takes on (it reads the biography)", async () => {
    const { handlers } = makeHandlers({ resolveConnectionTargetPerson: jest.fn(async () => RANDY) });
    const result = await handlers.tryHandleRelationCountPrompt({ mode: "list", relationRaw: "adoptive parents", subjectMode: "named", subjectName: "Randy" }, "Randy's adoptive parents");
    expect(result).toMatch(/^I couldn't find adoptive parents linked to .*on WikiTree: the linked parents aren't marked non-biological/);
  });

  test("an adoptive parent's relatives aren't walked", async () => {
    expect(await ask("adoptive father's siblings")).toMatch(/^I couldn't follow an adoptive parent's relatives/);
  });
});

test("a birth parent masked in the descendants response (-4) still finds their children", async () => {
  // As live for Luker-573: Riley Luker comes back as -4, and Patty's and his other children's BioFather is -4.
  const mask = (person) => ({ ...person, BioFather: person.BioFather === 574 ? -4 : person.BioFather, Father: person.Father === 574 ? -4 : person.Father });
  const ANTHONY = person(601, "Luker-601", "Anthony", "Male", { Father: 999, Mother: 998, BioFather: 574, DataStatus: { Father: "5" } });
  const PRIVATE = { Id: -5, BioFather: 574, Father: 999, Mother: 998 };
  const fetchPeoplePaged = jest.fn(async (_appId, keys, _fields, options = {}) => {
    const asked = (Array.isArray(keys) ? keys : [keys]).map(String);
    if (options.descendants) {
      const found = [PATTY, ANTHONY, PRIVATE, EARL, FRANCES, { Id: -4, Father: 1, Mother: 2 }].map(mask);
      return [null, null, Object.fromEntries(found.map((p) => [p.Id, p]))];
    }
    const found = ALL.filter((p) => asked.includes(String(p.Id)) || asked.includes(p.Name));
    return [null, null, Object.fromEntries(found.map((p) => [p.Id, p]))];
  });
  const { handlers } = makeHandlers({ fetchPeoplePaged });
  const result = await handlers.tryHandleRelationCountPrompt({ mode: "list", relationRaw: "biological siblings", subjectMode: "named", subjectName: "Patty" }, "Patty's biological siblings");
  expect(result.message).toMatch(/3 biological siblings/);
  expect(names(result)).toMatch(/Luker-601/);
  expect(names(result)).toMatch(/Tyree-375/);
  expect(names(result)).not.toMatch(/Luker-573/);
});

describe("DNA lines follow birth parents", () => {
  const { raisedNotBornToIds } = require("./chat_birth_family");
  const { dnaCarrierKind, dnaCarriers } = require("./chat_dna_data");
  const { buildDescendantTree } = require("./chat_descendant_chart_data");
  test("raisedNotBornToIds", () => {
    expect(raisedNotBornToIds(PATTY)).toEqual([2960, 3468]);
    expect(raisedNotBornToIds(RANDY)).toEqual([]);
    expect(raisedNotBornToIds({ Father: 5, BioFather: 6, Mother: 7 })).toEqual([5]);
  });
  test("an adopted son doesn't carry his adoptive father's Y-DNA", () => {
    const dad = { id: 1, sex: "Male" };
    expect(dnaCarrierKind([dad, { id: 2, sex: "Male", notBornTo: [] }])).toBe("y");
    expect(dnaCarrierKind([dad, { id: 2, sex: "Male", notBornTo: [1] }])).toBe("");
  });
  test("descendant tree carriers skip the adopted line", () => {
    const people = {
      1: { Id: 1, Name: "A-1", FirstName: "Al", Gender: "Male" },
      2: { Id: 2, Name: "A-2", FirstName: "Bo", Gender: "Male", Father: 1 },
      3: { Id: 3, Name: "A-3", FirstName: "Cy", Gender: "Male", Father: 1, DataStatus: { Father: "5" } },
      4: { Id: 4, Name: "A-4", FirstName: "Di", Gender: "Male", Father: 3 },
    };
    const carriers = dnaCarriers(buildDescendantTree(people, "A-1")).map((c) => c.person.wtid);
    expect(carriers).toEqual(["A-2"]);
  });
});
