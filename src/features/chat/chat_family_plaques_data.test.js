import { nearbySteps, nearbyFamilies, nearbyPlaquesLayout, NEARBY, plaqueNeighbour } from "./chat_family_plaques_data";
import { PLAQUE } from "./chat_print3d_data";

// A made-up family, the same every time: four generations of ancestors from the person (born 1950), each couple
// with brothers and sisters for the line child, most of whom marry and have children down to about 2000; one
// marriage joins the father's side to the mother's, and one profile is hidden.
function family(seed = 7) {
  let state = seed;
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const people = new Map();
  let next = 1;
  const add = (gender, year, fatherId = 0, motherId = 0) => {
    const id = next++;
    people.set(id, { id, wtid: `P-${id}`, name: `Person ${id}`, lnab: `L${id % 9}`, gender, birth: `${year}-01-01`, death: "", living: false, birthLocation: "", birthCountry: "", fatherId, motherId, spouses: [] });
    return id;
  };
  const marry = (a, b) => {
    people.get(a).spouses.push({ id: b });
    people.get(b).spouses.push({ id: a });
  };
  const children = (fatherId, motherId, year, count, depth) => {
    const kids = [];
    for (let i = 0; i < count; i += 1) {
      const gender = random() < 0.5 ? "Male" : "Female";
      const kid = add(gender, year + i * 2, fatherId, motherId);
      kids.push(kid);
      if (depth > 0 && year + 25 < 1990 && random() < 0.8) {
        const spouse = add(gender === "Male" ? "Female" : "Male", year + i * 2);
        marry(kid, spouse);
        const [f, m] = gender === "Male" ? [kid, spouse] : [spouse, kid];
        children(f, m, year + 27, 1 + Math.floor(random() * 3), depth - 1);
      }
    }
    return kids;
  };
  // (up from the person: each couple's other children with their own families)
  const focus = add("Male", 1950);
  let level = [focus];
  for (let g = 1; g <= 4; g += 1) {
    const up = [];
    level.forEach((child) => {
      const year = Number(people.get(child).birth.slice(0, 4)) - 28;
      const father = add("Male", year);
      const mother = add("Female", year + 2);
      marry(father, mother);
      Object.assign(people.get(child), { fatherId: father, motherId: mother });
      children(father, mother, Number(people.get(child).birth.slice(0, 4)) + 2, 1 + Math.floor(random() * 3), 2);
      up.push(father, mother);
    });
    level = up;
  }
  // (the person's own wife and children)
  const wife = add("Female", 1952);
  marry(focus, wife);
  children(focus, wife, 1978, 3, 1);
  // (a marriage across: a cousin on the father's side marries one on the mother's)
  const father = people.get(people.get(focus).fatherId);
  const mother = people.get(people.get(focus).motherId);
  const cousinsOf = (parent) => [...people.values()].filter((p) => p.fatherId && [...people.values()].some((s) => s.id !== parent.id && s.fatherId === parent.fatherId && s.fatherId && p.fatherId === s.id) && !p.spouses.length);
  const [a] = cousinsOf(father);
  const [b] = cousinsOf(mother);
  if (a && b) marry(a.id, b.id);
  // (a hidden profile: a brother of the person's father)
  const hidden = add("Male", 1922, father.fatherId, father.motherId);
  Object.assign(people.get(hidden), { hidden: true, name: "Private" });
  return { people, focus };
}

describe("who is near", () => {
  test("a parent, brother or sister, husband or wife, or child is a step; hidden profiles aren't counted", () => {
    const { people, focus } = family();
    const steps = nearbySteps(people, focus, 3);
    const me = people.get(focus);
    const father = people.get(me.fatherId);
    expect(steps.get(me.fatherId)).toBe(1);
    expect(steps.get(me.spouses[0].id)).toBe(1);
    expect(steps.get(father.fatherId)).toBe(2);
    // (an uncle is a step past the father; a first cousin one more)
    const uncle = [...people.values()].find((p) => p.fatherId === father.fatherId && p.id !== father.id && !p.hidden);
    expect(steps.get(uncle.id)).toBe(2);
    const cousin = [...people.values()].find((p) => p.fatherId === uncle.id || p.motherId === uncle.id);
    if (cousin) expect(steps.get(cousin.id)).toBe(3);
    expect([...steps.keys()].some((id) => people.get(id).hidden)).toBe(false);
    expect(nearbySteps(people, focus, 1).size).toBeLessThan(steps.size);
  });

  test("families and generations", () => {
    const { people, focus } = family();
    const c = nearbyFamilies(people, focus, 2);
    const me = people.get(focus);
    expect(c.gen.get(focus)).toBe(0);
    expect(c.gen.get(me.fatherId)).toBe(1);
    const parents = c.families.find((f) => f.children.includes(focus));
    expect(parents.parents).toEqual([me.fatherId, me.motherId].sort((a, b) => a - b));
    // (the person's own marriage is a family too, with their children)
    expect(c.families.some((f) => f.parents.includes(focus) && f.children.length === 3)).toBe(true);
  });
});

// The layout's promises, measured as the design bench measured them.
function check(layout) {
  const { plaques, links } = layout;
  const problems = [];
  // (plaques turn to face the viewer, so each sweeps an upright cylinder: none on the same level may come within 4 mm)
  plaques.forEach((a, i) =>
    plaques.slice(i + 1).forEach((b) => {
      if (Math.abs(a.z - b.z) >= (a.h + b.h) / 2) return;
      if (Math.hypot(a.x - b.x, a.y - b.y) < (a.w + b.w) / 2 + 4) problems.push(`overlap ${a.id} ${b.id}`);
    })
  );
  // (no rod passes through a plaque other than at its own ends)
  const inside = (p, q, slack) => Math.hypot(p[0] - q.x, p[1] - q.y) <= q.w / 2 + slack && Math.abs(p[2] - q.z) <= q.h / 2 + slack;
  links.forEach((link) => {
    const length = Math.hypot(...link.to.map((v, k) => v - link.from[k]));
    const n = Math.max(1, Math.ceil(length));
    plaques.forEach((q) => {
      if (inside(link.from, q, 1) || inside(link.to, q, 1)) return;
      for (let i = 0; i <= n; i += 1) {
        const p = link.from.map((v, k) => v + ((link.to[k] - v) * i) / n);
        if (inside(p, q, -0.5)) {
          problems.push(`rod through ${q.id}`);
          return;
        }
      }
    });
  });
  return problems;
}

describe("the CC plaques", () => {
  test.each([2, 3, 4])("%i steps: everyone placed, nothing overlapping, no rod through a plaque", (steps) => {
    const { people, focus } = family();
    const layout = nearbyPlaquesLayout(people, focus, steps);
    const c = nearbyFamilies(people, focus, steps);
    expect(layout.plaques).toHaveLength(c.people.size);
    expect(check(layout)).toEqual([]);
  });

  test("the person stands in the middle on a post from the base; the view's order starts with them", () => {
    const { people, focus } = family();
    const layout = nearbyPlaquesLayout(people, focus, 3);
    const me = layout.plaques.find((plaque) => plaque.id === focus);
    expect(Math.hypot(me.x, me.y)).toBeLessThan(1e-9);
    expect(me.w).toBe(PLAQUE.rootWidth);
    expect(layout.order[1].id).toBe(focus);
    expect(layout.order).toHaveLength(layout.plaques.length + 1);
    const lowest = Math.min(...layout.plaques.map((plaque) => plaque.z - plaque.h / 2));
    expect(lowest).toBeCloseTo(PLAQUE.base + PLAQUE.stem);
    expect(layout.links.some((link) => link.r === NEARBY.trunk && link.to[2] === me.z - me.h / 2)).toBe(true);
    // (ancestors above, descendants below)
    const father = layout.plaques.find((plaque) => plaque.id === people.get(focus).fatherId);
    const child = layout.plaques.find((plaque) => plaque.person.fatherId === focus);
    expect(father.z).toBeGreaterThan(me.z);
    expect(child.z).toBeLessThan(me.z);
  });

  test("every family is joined up: its members' plaques meet one set of rods", () => {
    const { people, focus } = family();
    const layout = nearbyPlaquesLayout(people, focus, 3);
    const c = nearbyFamilies(people, focus, 3);
    const at = new Map(layout.plaques.map((plaque) => [plaque.id, plaque]));
    // (join rods that touch end to end, and plaques to rods that end on them)
    const parent = new Map();
    const find = (k) => (parent.get(k) === k || !parent.has(k) ? (parent.set(k, k), k) : (parent.set(k, find(parent.get(k))), parent.get(k)));
    const union = (a, b) => parent.set(find(a), find(b));
    const point = (p) => p.map((v) => Math.round(v * 2) / 2).join(",");
    layout.links.forEach((link) => union(point(link.from), point(link.to)));
    layout.links.forEach((link, i) => {
      // (a rod ending part-way along another, as a post meets a bar)
      layout.links.forEach((other, j) => {
        if (i === j) return;
        [link.from, link.to].forEach((p) => {
          const d = other.to.map((v, k) => v - other.from[k]);
          const length = Math.hypot(...d);
          if (!length) return;
          const t = d.reduce((s, v, k) => s + v * (p[k] - other.from[k]), 0) / (length * length);
          if (t < 0 || t > 1) return;
          const near = Math.hypot(...p.map((v, k) => v - (other.from[k] + d[k] * t)));
          if (near < 0.5) union(point(p), point(other.from));
        });
      });
      at.forEach((q) => [link.from, link.to].forEach((p) => Math.hypot(p[0] - q.x, p[1] - q.y) < 0.5 && Math.abs(Math.abs(p[2] - q.z) - q.h / 2) < 0.5 && union(`p${q.id}`, point(p))));
    });
    const broken = c.families.filter((f) => new Set([...f.parents, ...f.children].map((id) => find(`p${id}`))).size > 1);
    expect(broken.map((f) => f.key)).toEqual([]);
  });

  test("relations and branches come from the Galaxy's", () => {
    const { people, focus } = family();
    const layout = nearbyPlaquesLayout(people, focus, 2);
    expect(layout.relation(people.get(focus).fatherId)).toBe("father");
    expect(layout.branches.length).toBeGreaterThan(2);
    expect(layout.plaques.filter((plaque) => plaque.id !== focus).every((plaque) => plaque.branch >= 0)).toBe(true);
  });
});

describe("plaqueNeighbour: arrow keys on the plaques (the user, 2026-10-15)", () => {
  // Dad (1) and Mum (2) with three children, oldest first: Ann (3), Bob (4), Cat (5); Bob married Dee (6), with Eve (7).
  const person = (id, birth, fatherId = 0, motherId = 0, spouses = []) => ({ id, birth, fatherId, motherId, spouses: spouses.map((spouseId) => ({ id: spouseId })) });
  const people = new Map(
    [person(1, "1920", 0, 0, [2]), person(2, "1922", 0, 0, [1]), person(3, "1945", 1, 2), person(4, "1947", 1, 2, [6]), person(5, "1950", 1, 2), person(6, "1948", 0, 0, [4]), person(7, "1975", 4, 6)].map((p) => [p.id, p])
  );
  // Bob is slot 1, then the rest in any order
  const slots = [null, people.get(4), people.get(1), people.get(2), people.get(3), people.get(5), people.get(6), people.get(7)];
  const slotOfId = new Map(slots.map((p, slot) => [p?.id, slot]));
  const go = (fromId, direction, extra = {}) => slots[plaqueNeighbour({ people, slots, slotOfId, from: slotOfId.get(fromId), direction, ...extra })]?.id || 0;

  test("up to the father first, down to a child", () => {
    expect(go(4, "up")).toBe(1);
    expect(go(1, "down")).toBe(4); // the middle child
    expect(go(1, "down", { cameFrom: slotOfId.get(5) })).toBe(5); // back where ↑ came from
    expect(go(7, "down")).toBe(0);
  });

  test("left and right go through the brothers and sisters by birth; Shift to the husband or wife", () => {
    expect(go(4, "left")).toBe(3);
    expect(go(4, "right")).toBe(5);
    expect(go(5, "right")).toBe(0);
    expect(go(4, "spouse-right")).toBe(6);
    expect(go(6, "spouse-left")).toBe(4);
    expect(go(3, "spouse-right")).toBe(0);
  });

  test("only people on the model", () => {
    const fewer = new Map([...slotOfId].filter(([id]) => id !== 3));
    expect(plaqueNeighbour({ people, slots, slotOfId: fewer, from: 1, direction: "left" })).toBe(0);
  });

  test("ancestor plaques go by slot", () => {
    const ancestors = [null, "me", "dad", "mum", null, "gran"];
    const step = (from, direction) => plaqueNeighbour({ people, slots: ancestors, slotOfId, from, direction, ancestors: true });
    expect(step(1, "up")).toBe(2);
    expect(step(2, "up")).toBe(5); // no grandfather: the grandmother
    expect(step(3, "down")).toBe(1);
    expect(step(2, "right")).toBe(3);
    expect(step(1, "left")).toBe(0);
  });
});
