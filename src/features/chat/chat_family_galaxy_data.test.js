import { isStar, galaxyLayout, galaxyRelation } from "./chat_family_galaxy_data";

const P = (id, name, extra = {}) => ({ id, wtid: `W-${id}`, name, lnab: "W", gender: "", birth: "", fatherId: 0, motherId: 0, spouses: [], ...extra });

// Ted (1) & Flora (2); Ted's parents John (10) & Annie (11); Ted's sister Kate (4) and her son Bob (5);
// Ted's son Jack (6) and grandson Tim (7); John's father George (20); Annie's brother Abe (12, father 21) and his son Cy (13).
function people() {
  const list = [
    P(1, "Ted", { gender: "Male", birth: "1898", fatherId: 10, motherId: 11, spouses: [{ id: 2 }] }),
    P(2, "Flora", { gender: "Female", spouses: [{ id: 1 }] }),
    P(4, "Kate", { gender: "Female", birth: "1900", fatherId: 10, motherId: 11 }),
    P(5, "Bob", { gender: "Male", motherId: 4 }),
    P(6, "Jack", { gender: "Male", fatherId: 1, motherId: 2 }),
    P(7, "Tim", { gender: "Male", fatherId: 6 }),
    P(10, "John", { gender: "Male", fatherId: 20 }),
    P(11, "Annie", { gender: "Female", fatherId: 21 }),
    P(12, "Abe", { gender: "Male", fatherId: 21 }),
    P(13, "Cy", { gender: "Male", fatherId: 12 }),
    P(20, "George", { gender: "Male" }),
    P(21, "Amos", { gender: "Male" }),
    P(30, "Private", { hidden: true, fatherId: 1, motherId: 2 }),
  ];
  return new Map(list.map((p) => [p.id, p]));
}

describe("Galaxy view: where the stars go (user, 2026-10-11: 'Let's do the Galaxy')", () => {
  test("the person in the middle, a ring a step, ancestors above and descendants below, an arm a branch", () => {
    const layout = galaxyLayout(people(), 1);
    const node = (id) => layout.nodes.find((n) => n.id === id);
    expect(node(1)).toMatchObject({ steps: 0, x: 0, y: 0, z: 0 });
    expect(node(10).steps).toBe(1);
    expect(node(5).steps).toBe(3); // (Ted → John → Kate → Bob)
    expect(node(20).y).toBeGreaterThan(node(10).y);
    expect(node(10).y).toBeGreaterThan(0);
    expect(node(7).y).toBeLessThan(node(6).y);
    expect(node(6).y).toBeLessThan(0);
    expect(Math.hypot(node(5).x, node(5).z)).toBeGreaterThan(Math.hypot(node(10).x, node(10).z));
    expect(node(30)).toBeUndefined(); // (private: not a star)
    // (a parent's side splits by grandparent: George's line and Amos's line are arms of their own)
    expect(layout.branches.map((b) => b.person.name)).toEqual(["John", "Annie", "Flora", "Jack", "George", "Amos"]);
    expect(node(20).branch).toBe(4);
    expect(node(13).branch).toBe(5);
    expect(node(5).branch).toBe(0); // (Kate's son, through John)
    expect(layout.edges.some((e) => e.a === 10 && e.b === 20)).toBe(true);
  });

  test("how each star is related to the one in the middle", () => {
    const all = people();
    const layout = galaxyLayout(all, 1);
    const rel = (id) => galaxyRelation(layout, all, id);
    expect(rel(10)).toBe("father");
    expect(rel(4)).toBe("sister");
    expect(rel(5)).toBe("nephew");
    expect(rel(20)).toBe("grandfather");
    expect(rel(12)).toBe("uncle");
    expect(rel(13)).toBe("first cousin");
    expect(rel(7)).toBe("grandson");
    expect(rel(1)).toBe("");
  });

  test("a degrees limit, counted as WikiTree does (user, 2026-10-18: 'Let's let people add or remove degrees')", () => {
    const ids = (degrees) => galaxyLayout(people(), 1, { degrees }).nodes.map((n) => n.id).sort((x, y) => x - y);
    // (a sister is one degree, not two through a parent)
    expect(ids(1)).toEqual([1, 2, 4, 6, 10, 11]);
    expect(ids(2)).toEqual([1, 2, 4, 5, 6, 7, 10, 11, 12, 20, 21]);
    expect(ids(3)).toContain(13);
    expect(galaxyLayout(people(), 1, { degrees: 2 }).nodes.find((n) => n.id === 5).steps).toBe(3); // (the ring still goes through John)
  });

  test("moving the middle to someone else", () => {
    const all = people();
    const layout = galaxyLayout(all, 13);
    expect(galaxyRelation(layout, all, 1)).toBe("first cousin");
    expect(galaxyRelation(layout, all, 11)).toBe("aunt");
  });
});

test("the dead are stars, the living planets (user: 'a nice image to have someone become a star')", () => {
  expect(isStar({ living: false }, 2026)).toBe(true);
  expect(isStar({ living: true, death: "1990-01-01" }, 2026)).toBe(false);
  expect(isStar({ living: null, death: "1990-01-01" }, 2026)).toBe(true);
  expect(isStar({ birth: "1890-01-01" }, 2026)).toBe(true);
  expect(isStar({ birth: "1950-01-01" }, 2026)).toBe(false);
});
