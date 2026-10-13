import { cardList, familyFactsHtml, familyFetcher, showMoreInCard } from "./chat_family_card";

const person = (id, extra = {}) => ({ id, wtid: `P-${id}`, name: `Person ${id}`, hidden: false, gender: "", birth: "", death: "", birthLocation: "", deathLocation: "", fatherId: 0, motherId: 0, spouses: [], ...extra });
const world = (...list) => new Map(list.map((entry) => [entry.id, entry]));

test("cardList", () => {
  expect(cardList(["A"])).toBe("A");
  expect(cardList(["A", "B", "C"])).toBe("A, B and C");
  expect(cardList(["A", "B", "C", "D"], 2)).toBe("A, B and 2 more");
  expect(cardList(["A", "B", "C"], 2)).toBe("A, B and C"); // (never "and 1 more")
  expect(cardList([])).toBe("");
});

test("cardList's 'and N more' shows the others when clicked", () => {
  const div = document.createElement("div");
  div.innerHTML = cardList(["A", "B", "C", "D", "E"], 2, "x");
  const visible = () => [...div.childNodes].filter((node) => !node.hidden).map((node) => node.textContent).join("");
  expect(visible()).toBe("A, B and 3 more");
  const button = div.querySelector("button[data-more]");
  expect(button.className).toBe("x-who");
  showMoreInCard(button);
  expect(visible()).toBe("A, B, C, D and E");
  expect(div.querySelector("button")).toBeNull();
});

describe("familyFactsHtml", () => {
  const people = world(
    person(1, { birth: "1769-03-12", birthLocation: "Laurens", death: "1844-00-00", fatherId: 2, motherId: 3, spouses: [{ id: 4, married: "1790-00-00", place: "Laurens" }] }),
    person(2, { birth: "1735-00-00" }),
    person(3),
    person(4),
    person(5, { fatherId: 1, motherId: 4 }),
    person(6, { fatherId: 1, motherId: 4, hidden: true })
  );
  const html = familyFactsHtml(people, 1, { prefix: "x", pickOf: (other) => (other.id === 2 ? "slot-2" : ""), pickTitle: "Show them" });

  test("the facts in order, in the view's classes", () => {
    const text = html.replace(/<[^>]+>/g, "");
    expect(text).toBe("Born12 March 1769 in LaurensDied1844, aged about 75ParentsPerson 2 (1735–) and Person 3MarriedPerson 4 in 1790 in LaurensChildPerson 5 (and 1 private)");
    expect(html).toMatch(/^<div class="x-facts">/);
    expect(html).toContain('<div class="x-kids">');
  });
  test("someone in the view picks them out; anyone else links to their profile", () => {
    expect(html).toContain('<button type="button" class="x-who" data-pick="slot-2" title="Show them">Person 2</button>');
    expect(html).toMatch(/<a class="x-who" href="[^"]*P-3"[^>]*>Person 3<\/a>/);
  });
  test("while fetching, and with nothing to say", () => {
    expect(familyFactsHtml(people, 1, { prefix: "x", loading: true })).toContain('<div class="x-loading">Finding their family…</div>');
    expect(familyFactsHtml(world(person(9)), 9, { prefix: "x" })).toBe("");
    expect(familyFactsHtml(world(), 9, { prefix: "x" })).toBe("");
  });
});

describe("familyFetcher", () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  test("fetches someone's family once, saying when it starts and ends", async () => {
    const load = jest.fn(() => Promise.resolve());
    const done = jest.fn();
    const fetcher = familyFetcher({ childrenKnown: new Set(), parentsKnown: new Set() }, load, done);
    fetcher.ensure(person(1));
    expect(fetcher.loading(1)).toBe(true);
    fetcher.ensure(person(1));
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
    expect(fetcher.loading(1)).toBe(false);
    expect(done).toHaveBeenCalledTimes(2);
  });
  test("not when their family is known, they're private, or there's no way to fetch", async () => {
    const load = jest.fn(() => Promise.resolve());
    const fetcher = familyFetcher({ childrenKnown: new Set([1]), parentsKnown: new Set([1]) }, load, () => {});
    fetcher.ensure(person(1));
    fetcher.ensure(person(2, { hidden: true }));
    fetcher.ensure(person(-3));
    familyFetcher({}, null, () => {}).ensure(person(4));
    await flush();
    expect(load).not.toHaveBeenCalled();
  });
  test("a failed fetch can be tried again", async () => {
    const load = jest.fn(() => Promise.reject(new Error("no")));
    const fetcher = familyFetcher({}, load, () => {});
    fetcher.ensure(person(1));
    await flush();
    fetcher.ensure(person(1));
    await flush();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
