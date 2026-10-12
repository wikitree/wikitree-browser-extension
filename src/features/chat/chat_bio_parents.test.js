// Biological parents (the user, 2026-10-13): adopted people usually have their adoptive parents as Father and Mother
// (marked non-biological) and their birth parents as BioFather and BioMother. The example is Luker-573.
import { connectionStepKind, connectionStepLabel, sharedParentIds } from "./chat_connection_common";
import { describeConnectionPath } from "./chat_relation_chain_text";
import { buildRelationshipLines, directLineDown, directXDnaSentence, xDnaPath } from "./chat_relationship_data";
import { buildFamilyWorldLayout, bioParentsChoice, bioParentsToCheck, bioParentsToFetch, createFamilyWorld, mergeWorldPeople, setBiologicalParents } from "./chat_family_world_data";
import { familyAround, navigatorLayout } from "./chat_family_navigator_data";
import { buildFanSlots, fanBirthParentChoices, isBirthParentSlot } from "./chat_fan_chart_data";
import { parentLinkStatus } from "./chat_dna_data";
import { treeFromAncestorSlots } from "./chat_fractal_tree_data";

const person = (Name, FirstName, Gender, extra = {}) => ({ Name, FirstName, LastNameAtBirth: Name.split("-")[0], Gender, ...extra });
const TERRY = person("Rockstrom-4", "Terry", "Male", { Father: 47530831, Mother: 47530877, BioFather: 16729283, BioMother: 16725056 });
const PATTY = person("Luker-573", "Patty", "Female", { Id: 16725056, Father: 16927680, Mother: 16927786, BioFather: 16740962, BioMother: 26124751 });
const RILEY = person("Luker-574", "Riley", "Male", { Id: 16740962 });
const JOHN = person("Simon-2960", "John", "Male", { Id: 16927680 });

describe("biological parents in connections", () => {
  test("the steps getConnections sends: shown in words, and the same kind of step", () => {
    expect(connectionStepLabel("bioparent")).toBe("biological parent");
    expect(connectionStepLabel("biosibling")).toBe("biological sibling");
    expect(connectionStepLabel("parent")).toBe("parent");
    expect(connectionStepKind("biochild")).toBe("child");
    expect(connectionStepKind("Spouse")).toBe("spouse");
  });

  test("a connection in words", () => {
    const path = [TERRY, { ...PATTY, pathType: "bioparent", pathStatus: 30 }, { ...RILEY, pathType: "bioparent", pathStatus: 30 }];
    expect(describeConnectionPath(path, "Terry (Rockstrom-4)", "Riley (Luker-574)")).toBe("Riley (Luker-574) is Terry (Rockstrom-4)'s biological mother's biological father.");
    expect(describeConnectionPath([PATTY, { ...JOHN, pathType: "parent", pathStatus: 5 }], "Patty (Luker-573)", "John (Simon-2960)")).toBe("John (Simon-2960) is Patty (Luker-573)'s father.");
  });

  test("siblings through a biological parent share that parent", () => {
    expect(sharedParentIds(PATTY, { Father: 99, Mother: 98, BioFather: 16740962 })).toEqual([16740962]);
    expect(sharedParentIds(PATTY, { Father: 16927680, Mother: 16927786 })).toEqual([16927680, 16927786]);
  });

  test("a line through biological parents can carry X-DNA", () => {
    const path = [TERRY, { ...PATTY, pathType: "bioparent", pathStatus: 30 }, { ...RILEY, pathType: "bioparent", pathStatus: 30 }];
    const down = directLineDown(path);
    expect(down.map((p) => p.wtid)).toEqual(["Luker-574", "Luker-573", "Rockstrom-4"]);
    expect(down.map((p) => p.status)).toEqual([0, 30, 30]);
    expect(directXDnaSentence(down)).toMatch(/X-DNA can come straight down from Riley Luker \(Luker-574\) to Terry Rockstrom \(Rockstrom-4\)/);
  });

  test("a non-biological link carries no DNA", () => {
    const down = directLineDown([PATTY, { ...JOHN, pathType: "parent", pathStatus: 5 }]);
    expect(down.map((p) => p.status)).toEqual([0, 5]);
    expect(directXDnaSentence(down)).toBe("");
    // Two lines down from a couple: one of them through an adoption.
    const path = [
      person("A-1", "Ann", "Female"),
      { ...person("B-1", "Bea", "Female"), pathType: "parent", pathStatus: 5 },
      { ...person("C-1", "Cy", "Male"), pathType: "parent", pathStatus: 30 },
      { ...person("D-1", "Di", "Female"), pathType: "child", pathStatus: 30 },
    ];
    const lines = buildRelationshipLines(path, { routes: [{ ancestors: [{ wtId: "C-1", name: "Cy C", gender: "male" }] }] });
    expect(lines.line1.map((p) => [p.wtid, p.status])).toEqual([["B-1", 30], ["A-1", 5]]);
    expect(xDnaPath(lines)).toEqual({ kind: "unknown" });
    const biological = path.map((p, i) => (i === 1 ? { ...p, pathType: "bioparent", pathStatus: 30 } : p));
    expect(xDnaPath(buildRelationshipLines(biological, { routes: [{ ancestors: [{ wtId: "C-1", name: "Cy C", gender: "male" }] }] })).kind).toBe("x");
  });
});

// The Family Explorer's "Biological parents" option.
describe("biological parents in the Family Explorer", () => {
  // getPeople-shaped: Patty (1) raised by John (2) & Ila (3), born to Riley (4) & Frances (5); Frances's
  // son Tim (6); Patty's son Terry (7) by Pat (10), raised by Carl (8) & Rose (9).
  const raw = (Id, Name, Gender, extra = {}) => ({ Id, Name, RealName: Name.split("-")[0], LastNameAtBirth: "X", Gender, Meta: { Degrees: 1 }, ...extra });
  const adopted = { Father: "5", Mother: "5" };
  const sent = {
    1: raw(1, "Patty-1", "Female", { Father: 2, Mother: 3, BioFather: 4, BioMother: 5, DataStatus: adopted, Meta: { Degrees: 0 }, Spouses: [{ Id: 10, Name: "Pat-10" }] }),
    2: raw(2, "John-2", "Male", { Spouses: [{ Id: 3, Name: "Ila-3" }] }),
    3: raw(3, "Ila-3", "Female", { Spouses: [{ Id: 2, Name: "John-2" }] }),
    5: raw(5, "Frances-5", "Female"),
    6: raw(6, "Tim-6", "Male", { Mother: 5 }),
    7: raw(7, "Terry-7", "Male", { Father: 8, Mother: 9, BioFather: 10, BioMother: 1, DataStatus: adopted }),
    8: raw(8, "Carl-8", "Male", { Spouses: [{ Id: 9, Name: "Rose-9" }] }),
    9: raw(9, "Rose-9", "Female", { Spouses: [{ Id: 8, Name: "Carl-8" }] }),
    10: raw(10, "Pat-10", "Male", { Spouses: [{ Id: 1, Name: "Patty-1" }] }),
  };
  const load = (key = "Patty-1") => {
    const world = createFamilyWorld(key);
    mergeWorldPeople(world, sent, { root: key, nuclear: 3 });
    mergeWorldPeople(world, { 4: raw(4, "Riley-4", "Male") }, { root: key });
    return world;
  };
  const parentsOf = (world, id) => [world.people.get(id).fatherId, world.people.get(id).motherId];

  test("as WikiTree shows them until someone is switched", () => {
    const world = load();
    expect(world.people.get(1)).toMatchObject({ fatherId: 2, motherId: 3, bioFatherId: 4, bioMotherId: 5, nonBioFather: true });
    expect(buildFamilyWorldLayout(world).nodes[0].couple).toEqual({ a: 2, b: 3 });
    expect(bioParentsChoice(world, 1)).toEqual({ id: 1, name: "Patty X", on: false });
    expect(bioParentsChoice(world, 2)).toBeNull();
  });

  test("the birth father the nuclear fetch left out is fetched, once", () => {
    const world = createFamilyWorld("Patty-1");
    mergeWorldPeople(world, sent, { root: "Patty-1", nuclear: 3 });
    expect(bioParentsToFetch(world)).toEqual([4]);
    expect(bioParentsToFetch(world)).toEqual([]);
  });

  test("a nuclear fetch that sends BioFather as null (live, Luker-573) doesn't lose him", () => {
    const world = load();
    setBiologicalParents(world, 1, true);
    mergeWorldPeople(world, { 1: { ...sent[1], BioFather: null } }, { root: "Patty-1", nuclear: 2 });
    expect(parentsOf(world, 1)).toEqual([4, 5]);
    // Those it may have happened to are read again by key, once: here Patty, with no BioFather yet.
    const fresh = createFamilyWorld("Patty-1");
    mergeWorldPeople(fresh, { ...sent, 1: { ...sent[1], BioFather: null } }, { root: "Patty-1", nuclear: 3 });
    expect(bioParentsToCheck(fresh)).toEqual([1]);
    expect(bioParentsToCheck(fresh)).toEqual([]);
  });

  test("Patty switched: in her birth parents' family, with her half-brother", () => {
    const world = load();
    setBiologicalParents(world, 1, true);
    expect(parentsOf(world, 1)).toEqual([4, 5]);
    expect(bioParentsChoice(world, 1).on).toBe(true);
    expect(buildFamilyWorldLayout(world).nodes[0].couple).toEqual({ a: 4, b: 5 });
    const around = familyAround(world.people, 1);
    expect([around.father?.id, around.mother?.id]).toEqual([4, 5]);
    expect(around.older.concat(around.younger).map((sibling) => sibling.person.id)).toEqual([6]);
    expect(navigatorLayout(around).cards.filter((card) => card.y < 0 && card.size === "l").map((card) => card.role)).toEqual(["Biological father", "Biological mother"]);
    // (Terry isn't switched: still with the parents who raised him)
    expect(parentsOf(world, 7)).toEqual([8, 9]);
    // (and a later fetch keeps the choice)
    mergeWorldPeople(world, { 1: sent[1] }, { root: "Patty-1" });
    expect(parentsOf(world, 1)).toEqual([4, 5]);
    setBiologicalParents(world, 1, false);
    expect(parentsOf(world, 1)).toEqual([2, 3]);
  });

  test("Terry and Patty each have their own switch (the user: Rockstrom-4)", () => {
    const world = load("Terry-7");
    expect(buildFamilyWorldLayout(world).nodes[0].couple).toEqual({ a: 8, b: 9 });
    setBiologicalParents(world, 7, true);
    expect(parentsOf(world, 7)).toEqual([10, 1]);
    // His birth mother with the parents who raised her, until she's switched too.
    expect(buildFamilyWorldLayout(world).nodes[0].couple).toEqual({ a: 10, b: 1 });
    expect(parentsOf(world, 1)).toEqual([2, 3]);
    expect(familyAround(world.people, 7).grandparents.mother.map((p) => p?.id)).toEqual([2, 3]);
    setBiologicalParents(world, 1, true);
    expect(familyAround(world.people, 7).grandparents.mother.map((p) => p?.id)).toEqual([4, 5]);
    expect(parentsOf(world, 7)).toEqual([10, 1]);
  });

  test("one birth parent recorded: the non-biological parent on the other side goes", () => {
    const world = createFamilyWorld("A-1");
    mergeWorldPeople(world, { 1: raw(1, "A-1", "Male", { Father: 2, Mother: 3, BioMother: 5, DataStatus: adopted, Meta: { Degrees: 0 } }) }, { root: "A-1" });
    setBiologicalParents(world, 1, true);
    expect(parentsOf(world, 1)).toEqual([0, 5]);
    // (a stepfather's adoption: the mother is his birth mother, so she stays)
    const step = createFamilyWorld("B-1");
    mergeWorldPeople(step, { 1: raw(1, "B-1", "Male", { Father: 2, Mother: 3, BioFather: 4, DataStatus: { Father: "5", Mother: "30" }, Meta: { Degrees: 0 } }) }, { root: "B-1" });
    setBiologicalParents(step, 1, true);
    expect(parentsOf(step, 1)).toEqual([4, 3]);
  });
});

// The fan chart and the ancestors Branches chart: the same choice, one person at a time.
describe("biological parents in the fan and ancestor charts", () => {
  // getPeople "ancestors"-shaped (live, Rockstrom-4: both lines come, with DataStatus.BioFather/BioMother).
  const raw = (Id, Name, RealName, Gender, extra = {}) => ({ Id, Name, RealName, LastNameAtBirth: Name.split("-")[0], Gender, ...extra });
  const adopted = { Father: "5", Mother: "5", BioFather: "30", BioMother: "30" };
  const sent = {
    // (names as PersonName writes them: "Terry (Rockstrom) Warner")
    7: raw(7, "Rockstrom-4", "Terry", "Male", { FirstName: "Terry", LastNameCurrent: "Warner", Father: 8, Mother: 9, BioFather: 10, BioMother: 1, DataStatus: adopted }),
    8: raw(8, "Warner-16701", "Bernard", "Male"),
    9: raw(9, "Mathis-4737", "Ruby", "Female"),
    10: raw(10, "Rockstrom-3", "Pat", "Male", { Father: 11, DataStatus: { Father: "20" } }),
    11: raw(11, "Rockstrom-5", "Carl", "Male"),
    1: raw(1, "Luker-573", "Patty", "Female", { Father: 2, Mother: 3, BioFather: 4, BioMother: 5, DataStatus: adopted }),
    2: raw(2, "Simon-2960", "John", "Male"),
    3: raw(3, "Curry-3468", "Ila", "Female"),
    4: raw(4, "Luker-574", "Riley", "Male"),
    5: raw(5, "Johnson-92386", "Frances", "Female"),
  };
  const ids = (slots, from, to) => slots.slice(from, to + 1).map((person) => person?.id || 0);

  test("as WikiTree shows them until someone is switched", () => {
    const slots = buildFanSlots(sent, "Rockstrom-4", 3);
    expect(ids(slots, 2, 3)).toEqual([8, 9]);
    expect(parentLinkStatus(slots, 2)).toBe("nonbio");
    expect(fanBirthParentChoices(slots)).toEqual([{ id: 7, name: "Terry (Rockstrom) Warner", on: false }]);
    // (semi-private, logged out: no FirstName, so PersonName starts from RealName)
    const semiPrivate = buildFanSlots({ ...sent, 7: { ...sent[7], FirstName: undefined } }, "Rockstrom-4", 1);
    expect(semiPrivate[1].fullName).toBe("Terry (Rockstrom) Warner");
  });

  test("Terry switched: his birth parents and their parents, Patty still with the parents who raised her", () => {
    const slots = buildFanSlots(sent, "Rockstrom-4", 3, { bioShown: [7] });
    expect(ids(slots, 2, 7)).toEqual([10, 1, 11, 0, 2, 3]);
    expect([isBirthParentSlot(slots, 2), isBirthParentSlot(slots, 3), isBirthParentSlot(slots, 6)]).toEqual([true, true, false]);
    // (how sure the birth links are, for the DNA modes)
    expect([parentLinkStatus(slots, 2), parentLinkStatus(slots, 4), parentLinkStatus(slots, 6)]).toEqual(["dna", "confident", "nonbio"]);
    expect(fanBirthParentChoices(slots)).toEqual([
      { id: 7, name: "Terry (Rockstrom) Warner", on: true },
      { id: 1, name: "Patty Luker", on: false },
    ]);
    expect(treeFromAncestorSlots(slots).children.map((node) => node.person.id)).toEqual([10, 1]);
  });

  test("Patty switched too: Riley and Frances in her slots", () => {
    const slots = buildFanSlots(sent, "Rockstrom-4", 3, { bioShown: new Set([7, 1]) });
    expect(ids(slots, 6, 7)).toEqual([4, 5]);
    expect(isBirthParentSlot(slots, 7)).toBe(true);
    expect(parentLinkStatus(slots, 6)).toBe("dna");
  });

  test("one birth parent recorded: the non-biological parent on the other side is left out", () => {
    const one = { ...sent, 7: { ...sent[7], BioFather: null } };
    const slots = buildFanSlots(one, "Rockstrom-4", 2, { bioShown: [7] });
    expect(ids(slots, 2, 3)).toEqual([0, 1]);
  });
});
