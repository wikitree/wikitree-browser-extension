import { familyAround, familyLoaded, navigatorLayout, layoutBounds } from "./chat_family_navigator_data";

const P = (id, name, extra = {}) => ({ id, wtid: `W-${id}`, name, lnab: "W", gender: "", birth: "", fatherId: 0, motherId: 0, spouses: [], ...extra });

// Ted (1) and Flora (2); Ted's parents John (10) and Annie (11); John's parents (20, 21); Annie's father (22).
// Brothers and sisters: Will (3, older), Kate (4, younger), Half-brother Sam (5, John's by another wife).
// Children: with Flora, Jack (6) and Rose (7); Mo (8) with no other parent recorded. Jack's children: 30–35.
function world() {
  const people = [
    P(1, "Ted", { gender: "Male", birth: "1898-07-04", fatherId: 10, motherId: 11, spouses: [{ id: 2, wtid: "W-2", married: "1922-05-01" }] }),
    P(2, "Flora", { gender: "Female", birth: "1900-01-01" }),
    P(3, "Will", { gender: "Male", birth: "1895-01-01", fatherId: 10, motherId: 11 }),
    P(4, "Kate", { gender: "Female", birth: "1902-01-01", fatherId: 10, motherId: 11 }),
    P(5, "Sam", { gender: "Male", birth: "1910-01-01", fatherId: 10, motherId: 99 }),
    P(6, "Jack", { gender: "Male", birth: "1924-01-01", fatherId: 1, motherId: 2 }),
    P(7, "Rose", { gender: "Female", birth: "1926-01-01", fatherId: 1, motherId: 2 }),
    P(8, "Mo", { birth: "1930-01-01", fatherId: 1 }),
    P(10, "John", { gender: "Male", birth: "1870-01-01", fatherId: 20, motherId: 21 }),
    P(11, "Annie", { gender: "Female", birth: "1872-01-01", fatherId: 22 }),
    P(20, "George", { gender: "Male" }),
    P(21, "Martha", { gender: "Female" }),
    P(22, "Abel", { gender: "Male" }),
    ...[30, 31, 32, 33, 34, 35].map((id, i) => P(id, `Kid${i + 1}`, { birth: `195${i}-01-01`, fatherId: 6 })),
  ];
  return new Map(people.map((p) => [p.id, p]));
}

const roles = (layout) => Object.fromEntries(layout.cards.filter((card) => card.person).map((card) => [card.person.name, card.role]));
const cardOf = (layout, name) => layout.cards.find((card) => card.person?.name === name);
const overlaps = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;

describe("Family view: who is round someone (user, 2026-10-11: 'Let's do all three')", () => {
  test("parents, grandparents, brothers and sisters (older and younger, half), husband or wife with their children", () => {
    const family = familyAround(world(), 1);
    expect(family.father.name).toBe("John");
    expect(family.mother.name).toBe("Annie");
    expect(family.grandparents.father.map((p) => p?.name)).toEqual(["George", "Martha"]);
    expect(family.grandparents.mother.map((p) => p?.name)).toEqual(["Abel", undefined]);
    expect(family.older.map((s) => s.person.name)).toEqual(["Will"]);
    expect(family.younger.map((s) => [s.person.name, s.half])).toEqual([
      ["Kate", false],
      ["Sam", true],
    ]);
    expect(family.spouses.map((s) => [s.person.name, s.children.map((c) => c.name)])).toEqual([["Flora", ["Jack", "Rose"]]]);
    expect(family.unpartnered.map((c) => c.name)).toEqual(["Mo"]);
    expect(family.grandchildren.get(6)).toHaveLength(6);
  });

  test("a husband or wife not loaded yet is shown by their ID", () => {
    const people = world();
    people.get(1).spouses.push({ id: 77, wtid: "Smith-5", married: "" });
    const family = familyAround(people, 1);
    expect(family.spouses.find((s) => s.person.id === 77).person).toMatchObject({ stub: true, name: "Smith-5" });
  });

  test("the layout: grandparents above parents above the person; children below; nothing overlaps", () => {
    const layout = navigatorLayout(familyAround(world(), 1));
    const ted = cardOf(layout, "Ted");
    expect(ted).toMatchObject({ centre: true, size: "xl", x: 0, y: 0 });
    expect(roles(layout)).toMatchObject({ John: "Father", Annie: "Mother", George: "Grandfather", Flora: "Wife", Will: "Brother", Kate: "Sister", Sam: "Half-brother", Jack: "Son", Rose: "Daughter", Mo: "Child", Kid1: "Grandchild" });
    expect(cardOf(layout, "George").y).toBeLessThan(cardOf(layout, "John").y);
    expect(cardOf(layout, "John").y).toBeLessThan(ted.y);
    expect(cardOf(layout, "Jack").y).toBeGreaterThan(ted.y);
    expect(cardOf(layout, "John").x).toBeLessThan(0);
    expect(cardOf(layout, "Annie").x).toBeGreaterThan(0);
    expect(cardOf(layout, "Will").x).toBeLessThan(0);
    expect(cardOf(layout, "Flora").x).toBeGreaterThan(0);
    expect(cardOf(layout, "Kate").x).toBeGreaterThan(cardOf(layout, "Flora").x);
    for (let i = 0; i < layout.cards.length; i += 1) {
      for (let j = i + 1; j < layout.cards.length; j += 1) {
        expect([layout.cards[i].key, layout.cards[j].key, overlaps(layout.cards[i], layout.cards[j])]).toEqual([layout.cards[i].key, layout.cards[j].key, false]);
      }
    }
    expect(layoutBounds(layout).y0).toBeLessThan(-300);
  });

  test("grandchildren listed under their parent: three, then '+3 more'", () => {
    const layout = navigatorLayout(familyAround(world(), 1));
    const chips = layout.cards.filter((card) => card.size === "chip");
    expect(chips.filter((card) => card.person).map((card) => card.person.name)).toEqual(["Kid1", "Kid2", "Kid3"]);
    expect(chips.find((card) => card.more)).toMatchObject({ more: 3, moreOf: expect.objectContaining({ name: "Jack" }) });
  });

  test("lines: the person's line from their parents' ring; a half-brother's from his father alone; the children from the marriage", () => {
    const layout = navigatorLayout(familyAround(world(), 1));
    const ring = layout.rings.find((r) => r.key === "parents");
    const link = (key) => layout.links.find((l) => l.key === key);
    expect(link("d-p1")).toMatchObject({ x1: ring.x, y1: ring.y });
    expect(link("d-p5")).toMatchObject({ x1: cardOf(layout, "John").x });
    const marriage = layout.rings.find((r) => r.key === "m-p2");
    expect(marriage.year).toBe(1922);
    expect(link("d-p6")).toMatchObject({ x1: marriage.x, y1: marriage.y });
    expect(link("d-p8").x1).toBe(0); // (Mo: from Ted himself)
  });

  test("a second wife goes on the left, her children under her", () => {
    const people = world();
    people.get(1).spouses.push({ id: 40, wtid: "W-40", married: "1950-01-01" });
    people.set(40, P(40, "Edna", { gender: "Female" }));
    people.set(41, P(41, "Lou", { birth: "1952-01-01", fatherId: 1, motherId: 40 }));
    const layout = navigatorLayout(familyAround(people, 1));
    expect(cardOf(layout, "Edna").x).toBeLessThan(0);
    expect(cardOf(layout, "Will").x).toBeLessThan(cardOf(layout, "Edna").x);
    expect(cardOf(layout, "Lou").x).toBeLessThan(cardOf(layout, "Jack").x);
  });

  test("many brothers and sisters go in two rows, oldest at the far left, each with its line", () => {
    const people = world();
    [50, 51, 52, 53, 54, 55].forEach((id, i) => people.set(id, P(id, `Sib${i + 1}`, { birth: `${i < 2 ? 1890 + i : 1904 + i}-01-01`, fatherId: 10, motherId: 11 })));
    const layout = navigatorLayout(familyAround(people, 1));
    const siblings = layout.cards.filter((card) => /^(Will|Kate|Sam|Sib\d)$/.test(card.person?.name || ""));
    expect(siblings).toHaveLength(9);
    expect(new Set(siblings.map((card) => card.y)).size).toBe(2);
    expect(cardOf(layout, "Sib1").x).toBe(Math.min(...siblings.map((card) => card.x)));
    expect(cardOf(layout, "Sib1").y).toBeLessThan(cardOf(layout, "Sib2").y);
    layout.cards.forEach((a, i) => layout.cards.slice(i + 1).forEach((b) => expect([a.person?.name, b.person?.name, overlaps(a, b)]).toEqual([a.person?.name, b.person?.name, false])));
    siblings.forEach((card) => expect(layout.links.some((link) => link.key === `d-${card.key}`)).toBe(true));
    // (full ones hang from one level bar by straight drops, not curves bunched from the parents; Sam is a half-brother)
    const bus = layout.links.find((link) => link.key === "bus-siblings");
    expect(bus.y1).toBe(bus.y2);
    siblings
      .filter((card) => card.person.name !== "Sam")
      .forEach((card) => expect(layout.links.find((link) => link.key === `d-${card.key}`)).toMatchObject({ kind: "line", y1: bus.y1 }));
    expect(layout.links.find((link) => link.key === `d-${cardOf(layout, "Sam").key}`).kind).toBe("curve");
    const box = layoutBounds(layout);
    expect(box.x1 - box.x0).toBeLessThan(1900);
  });

  test("moving to someone else: Jack's parents are Ted and Flora", () => {
    const layout = navigatorLayout(familyAround(world(), 6));
    expect(roles(layout)).toMatchObject({ Ted: "Father", Flora: "Mother", John: "Grandfather", Rose: "Sister", Mo: "Half-sibling", Kid1: "Child" });
  });

  test("whether someone's family needs fetching", () => {
    const people = world();
    const known = (ids) => new Set(ids);
    const w = { people, tried: new Set(), parentsKnown: known([1, 10, 11]), childrenKnown: known([1, 6, 7, 8]) };
    expect(familyLoaded(w, 1)).toBe(true);
    expect(familyLoaded(w, 10)).toBe(false); // (John's parents' parents and his children's children: not asked for)
    w.tried.add(10);
    expect(familyLoaded(w, 10)).toBe(true);
    w.childrenKnown.delete(6);
    expect(familyLoaded(w, 1)).toBe(false);
  });
});
