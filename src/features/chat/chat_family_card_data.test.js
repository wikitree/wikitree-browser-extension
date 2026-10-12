import { ageAtDeath, cardDate, cardFacts } from "./chat_family_card_data";

const person = (id, extra = {}) => ({ id, wtid: `P-${id}`, name: `Person ${id}`, hidden: false, gender: "", birth: "", death: "", birthLocation: "", deathLocation: "", fatherId: 0, motherId: 0, spouses: [], ...extra });
const world = (...list) => new Map(list.map((entry) => [entry.id, entry]));

describe("cardDate", () => {
  test("as much of the date as is known", () => {
    expect(cardDate("1769-03-12")).toBe("12 March 1769");
    expect(cardDate("1769-03-00")).toBe("March 1769");
    expect(cardDate("1769-00-00")).toBe("1769");
    expect(cardDate("")).toBe("");
    expect(cardDate("0000-00-00")).toBe("");
  });
  test("the date's status", () => {
    expect(cardDate("1769-00-00", "guess")).toBe("about 1769");
    expect(cardDate("1844-05-01", "before")).toBe("before 1 May 1844");
    expect(cardDate("1844-00-00", "after")).toBe("after 1844");
    expect(cardDate("1844-00-00", "certain")).toBe("1844");
  });
});

describe("ageAtDeath", () => {
  test("exact when both dates are full", () => {
    expect(ageAtDeath({ birth: "1769-03-12", death: "1844-03-11" })).toEqual({ years: 74, about: false });
    expect(ageAtDeath({ birth: "1769-03-12", death: "1844-03-12" })).toEqual({ years: 75, about: false });
  });
  test("about when a date is a year or a guess", () => {
    expect(ageAtDeath({ birth: "1769-00-00", death: "1844-00-00" })).toEqual({ years: 75, about: true });
    expect(ageAtDeath({ birth: "1769-03-12", death: "1844-06-01", birthStatus: "guess" })).toEqual({ years: 75, about: true });
  });
  test("none without both dates, or when they can't be right", () => {
    expect(ageAtDeath({ birth: "1769-00-00" })).toBeNull();
    expect(ageAtDeath({ birth: "1869-00-00", death: "1844-00-00" })).toBeNull();
  });
});

describe("cardFacts", () => {
  // Henry (1) son of John (2) and Mary (3); married Sarah (4) in 1790 and later Ann (5); a full brother (6), a
  // half sister (7, John's by Kate 8), a private brother; children with Sarah (10, 11), one with Ann (12), one
  // whose mother isn't known (13), and a private one.
  const people = world(
    person(1, { birth: "1769-03-12", death: "1844-00-00", birthLocation: "Laurens County", deathLocation: "Georgia", fatherId: 2, motherId: 3, spouses: [{ id: 4, wtid: "P-4", married: "1790-06-00", place: "Laurens" }] }),
    person(2, { gender: "Male", birth: "1735" }),
    person(3, { gender: "Female", birth: "1740" }),
    person(4, { gender: "Female" }),
    person(5, { gender: "Female", spouses: [{ id: 1, wtid: "P-1", married: "1810-00-00" }] }),
    person(6, { fatherId: 2, motherId: 3, birth: "1771" }),
    person(7, { fatherId: 2, motherId: 8, birth: "1780" }),
    person(8, {}),
    person(9, { fatherId: 2, motherId: 3, hidden: true }),
    person(10, { fatherId: 1, motherId: 4, birth: "1795" }),
    person(11, { fatherId: 1, motherId: 4, birth: "1792" }),
    person(12, { fatherId: 1, motherId: 5, birth: "1812" }),
    person(13, { fatherId: 1, birth: "1800" }),
    person(14, { fatherId: 1, motherId: 4, hidden: true })
  );
  const facts = cardFacts(people, 1);

  test("born and died, and their age", () => {
    expect(facts.born).toEqual({ date: "12 March 1769", place: "Laurens County" });
    expect(facts.died).toEqual({ date: "1844", place: "Georgia" });
    expect(facts.age).toEqual({ years: 75, about: true });
  });
  test("parents", () => {
    expect(facts.parents.map((entry) => entry.id)).toEqual([2, 3]);
  });
  test("each marriage in order, with its children", () => {
    expect(facts.marriages.map((entry) => [entry.spouse.id, entry.married, entry.place, entry.children.map((child) => child.id)])).toEqual([
      [4, "June 1790", "Laurens", [11, 10]],
      [5, "1810", "", [12]],
    ]);
    expect(facts.children.map((child) => child.id)).toEqual([13]);
  });
  test("brothers and sisters, half ones marked; private ones only counted", () => {
    expect(facts.siblings.map((entry) => [entry.person.id, entry.half])).toEqual([
      [6, false],
      [7, true],
    ]);
    expect(facts.hidden).toEqual({ children: 0, siblings: 1 });
    expect(facts.marriages.map((entry) => entry.hidden)).toEqual([1, 0]);
  });
  test("a husband or wife not loaded yet is kept by their WikiTree ID", () => {
    const alone = cardFacts(world(person(1, { spouses: [{ id: 99, wtid: "Bennett-12", married: "" }] })), 1);
    expect(alone.marriages).toEqual([{ spouse: null, wtid: "Bennett-12", married: "", place: "", children: [], hidden: 0 }]);
  });
  test("nobody there", () => {
    expect(cardFacts(world(), 5)).toBeNull();
  });
});
