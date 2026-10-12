/** @jest-environment jsdom */
import { mountFamilyNavigator, stepWord } from "./chat_family_navigator";

// (every d3 package maps to one stub file in jest, so one mock serves all three: just enough pan-zoom for the view to mount)
jest.mock("d3-zoom", () => {
  const identity = { x: 0, y: 0, k: 1, translate: () => identity, scale: () => identity };
  const zoom = () => {
    const zoomer = () => {};
    ["scaleExtent", "filter", "on"].forEach((name) => {
      zoomer[name] = () => zoomer;
    });
    zoomer.transform = () => {};
    return zoomer;
  };
  const selection = { call: () => selection, on: () => selection, transition: () => selection, duration: () => selection, ease: () => selection, interrupt: () => selection };
  return { zoom, zoomIdentity: identity, select: () => selection, easeCubicInOut: (t) => t };
});

const P = (id, name, extra = {}) => ({ id, wtid: `W-${id}`, name, lnab: "W", gender: "", birth: "", fatherId: 0, motherId: 0, spouses: [], ...extra });

// Ted (1) and Flora (2); Ted's parents John (10) and Annie (11); older brother Will (3); younger Kate (4) and Sam (5); son Jack (6).
function world() {
  const people = [
    P(1, "Ted", { gender: "Male", birth: "1898-07-04", fatherId: 10, motherId: 11, spouses: [{ id: 2, wtid: "W-2", married: "1922-05-01" }] }),
    P(2, "Flora", { gender: "Female", birth: "1900-01-01", spouses: [{ id: 1, wtid: "W-1", married: "1922-05-01" }] }),
    P(3, "Will", { gender: "Male", birth: "1895-01-01", fatherId: 10, motherId: 11 }),
    P(4, "Kate", { gender: "Female", birth: "1902-01-01", fatherId: 10, motherId: 11 }),
    P(5, "Sam", { gender: "Male", birth: "1904-01-01", fatherId: 10, motherId: 11 }),
    P(6, "Jack", { gender: "Male", birth: "1924-01-01", fatherId: 1, motherId: 2 }),
    P(10, "John", { gender: "Male", birth: "1870-01-01" }),
    P(11, "Annie", { gender: "Female", birth: "1872-01-01" }),
  ];
  const ids = people.map((p) => p.id);
  return { focusId: 1, people: new Map(people.map((p) => [p.id, p])), tried: new Set(ids), parentsKnown: new Set(ids), childrenKnown: new Set(ids) };
}

describe("Family view keys", () => {
  let view;
  let root;
  beforeEach(() => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    view = mountFamilyNavigator(host, { world: world(), load: jest.fn().mockResolvedValue(), startId: 1 });
    root = host.querySelector(".wbe-nav");
  });
  afterEach(() => {
    view.destroy();
    document.body.innerHTML = "";
  });
  const press = (key, shiftKey = false) => root.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true }));

  test("arrows: brothers and sisters, parents, children; Shift+arrow the husband or wife (user: 'arrow buttons to also go to the wife')", () => {
    press("ArrowRight");
    expect(view.currentId()).toBe(4);
    press("ArrowLeft");
    expect(view.currentId()).toBe(1);
    press("ArrowLeft");
    expect(view.currentId()).toBe(3);
    view.centre(1);
    press("ArrowRight", true);
    expect(view.currentId()).toBe(2);
    // (Flora's husband is on her left; Shift+→ still finds him, there being no one on the right)
    press("ArrowRight", true);
    expect(view.currentId()).toBe(1);
    press("ArrowDown");
    expect(view.currentId()).toBe(6);
    press("ArrowUp");
    expect(view.currentId()).toBe(1);
  });
});

describe("Family view trail", () => {
  test("full names with birth years, and each step's relation (user: 'First names are not enough here')", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const view = mountFamilyNavigator(host, { world: world(), load: jest.fn().mockResolvedValue(), startId: 1 });
    [10, 1, 2, 6, 3].forEach((id) => view.centre(id));
    const trail = [...host.querySelector(".wbe-nav-trail").children].map((el) => el.textContent).join(" ");
    // (going back to someone moves them to the end)
    expect(trail).toBe("John W 1870 son › Ted W 1898 wife › Flora W 1900 son › Jack W 1924 › Will W 1895");
    view.destroy();
    document.body.innerHTML = "";
  });

  test("step words", () => {
    const people = world().people;
    expect(stepWord(people.get(3), people.get(4))).toBe("sister");
    expect(stepWord(people.get(1), people.get(11))).toBe("mother");
    expect(stepWord({ id: 7, fatherId: 10, motherId: 99 }, people.get(3))).toBe("half-brother");
    expect(stepWord(people.get(6), people.get(11), people)).toBe("grandmother");
    expect(stepWord(people.get(10), people.get(6), people)).toBe("grandson");
    expect(stepWord(people.get(6), people.get(3), people)).toBe("");
  });
});
