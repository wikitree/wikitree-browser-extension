// The 3D view's "CC plaques" (user, 2026-10-12: "Could it be more of a CC7 thing? getPeople with
// Nuclear:5, for example?"; "wire it in as Plaques: CC or something similar"): a plaque for everyone within N
// steps of the person, the way getPeople's nuclear=N counts them (a parent, brother or sister, husband or wife,
// or child is a step), joined like a family tree. Everyone is split into branches, each drawn as a tidy
// family-tree chart on an upright page of its own, and the pages fan out round the person like the pages of an
// opened book. Chosen from four designs measured on two real CC5 sets (.chat-lab/ccplaques: no plaques
// overlap, no rod goes through a plaque, no family is broken). Everything here is pure: who is in it, and
// where everyone and every rod goes. Units are millimetres with z up, like chat_print3d_data.js.

import { PLAQUE } from "./chat_print3d_data";
import { galaxyLayout, galaxyRelation } from "./chat_family_galaxy_data";

export const NEARBY = { minSteps: 1, maxSteps: 5, defaultSteps: 3, trunk: 2 };
// (a generation a level: a plaque and a stem above and below it, where the bars go)
const LEVEL = PLAQUE.height + 2 * PLAQUE.stem;
const SIZES = { w: PLAQUE.width, h: PLAQUE.height, focusW: PLAQUE.rootWidth, focusH: PLAQUE.rootHeight, stem: PLAQUE.stem, gap: PLAQUE.gap };

/** Each person's parents, children, husbands and wives and brothers and sisters among `people` (hidden profiles left out). */
function closeFamily(people) {
  const near = new Map();
  const add = (a, b) => {
    if (a === b || !people.has(a) || !people.has(b) || people.get(a).hidden || people.get(b).hidden) return;
    if (!near.has(a)) near.set(a, new Set());
    near.get(a).add(b);
  };
  const children = new Map();
  people.forEach((person) => {
    [person.fatherId, person.motherId].forEach((parentId) => {
      if (!parentId) return;
      add(person.id, parentId);
      add(parentId, person.id);
      if (!children.has(parentId)) children.set(parentId, []);
      children.get(parentId).push(person.id);
    });
    (person.spouses || []).forEach((spouse) => {
      add(person.id, spouse.id);
      add(spouse.id, person.id);
    });
  });
  // (a brother or sister is one step, as getPeople counts them, half ones too)
  children.forEach((kids) => kids.forEach((a) => kids.forEach((b) => add(a, b))));
  return near;
}

/** Who is within `steps` of focusId: Map id → steps. */
export function nearbySteps(people, focusId, steps) {
  const found = new Map();
  const focus = people.get(focusId);
  if (!focus || focus.hidden) return found;
  const near = closeFamily(people);
  found.set(focusId, 0);
  const queue = [focusId];
  for (let at = 0; at < queue.length; at += 1) {
    const id = queue[at];
    if (found.get(id) >= steps) continue;
    (near.get(id) || []).forEach((other) => {
      if (found.has(other)) return;
      found.set(other, found.get(id) + 1);
      queue.push(other);
    });
  }
  return found;
}

/**
 * The families the layout reads: {people (Map), focusId, gen (Map: parents +1, children −1, husbands and wives
 * 0, from the first way reached), families: [{key, parents, children}], loose}. Someone within the steps only
 * through a brother or sister whose parents aren't here can't be joined to the rest on a plaque: they're left
 * out and counted in `loose`.
 */
export function nearbyFamilies(people, focusId, steps) {
  const within = nearbySteps(people, focusId, steps);
  const links = new Map();
  const add = (a, b, step) => {
    if (!within.has(a) || !within.has(b) || a === b) return;
    if (!links.has(a)) links.set(a, []);
    if (!links.get(a).some((link) => link.id === b)) links.get(a).push({ id: b, step });
  };
  within.forEach((count, id) => {
    const person = people.get(id);
    [person.fatherId, person.motherId].forEach((parentId) => {
      if (!parentId) return;
      add(id, parentId, "parent");
      add(parentId, id, "child");
    });
    (person.spouses || []).forEach((spouse) => {
      add(id, spouse.id, "spouse");
      add(spouse.id, id, "spouse");
    });
  });
  const gen = new Map([[focusId, 0]]);
  const queue = within.has(focusId) ? [focusId] : [];
  for (let at = 0; at < queue.length; at += 1) {
    const id = queue[at];
    (links.get(id) || []).forEach((link) => {
      if (gen.has(link.id)) return;
      gen.set(link.id, gen.get(id) + (link.step === "parent" ? 1 : link.step === "child" ? -1 : 0));
      queue.push(link.id);
    });
  }
  const placed = new Map([...within.keys()].filter((id) => gen.has(id)).map((id) => [id, people.get(id)]));
  // Families: each set of parents here with their children here; and couples with no children here.
  const byKey = new Map();
  placed.forEach((person) => {
    const parents = [person.fatherId, person.motherId].filter((id) => placed.has(id)).sort((a, b) => a - b);
    if (!parents.length) return;
    const key = parents.join("+");
    if (!byKey.has(key)) byKey.set(key, { key, parents, children: [] });
    byKey.get(key).children.push(person.id);
  });
  placed.forEach((person) =>
    (person.spouses || []).forEach((spouse) => {
      if (!placed.has(spouse.id)) return;
      const parents = [person.id, spouse.id].sort((a, b) => a - b);
      const key = parents.join("+");
      if (!byKey.has(key)) byKey.set(key, { key, parents, children: [] });
    })
  );
  const born = (id) => placed.get(id).birth || "9999";
  byKey.forEach((family) => family.children.sort((a, b) => born(a).localeCompare(born(b)) || a - b));
  return { people: placed, focusId, gen, families: [...byKey.values()], loose: within.size - placed.size };
}

/**
 * The CC plaques round focusId: {plaques: [{id, person, generation, x, y, z (the middle), w, h, t, branch}],
 * links: [{from, to, r, id (whose post it is; 0 for a bar or chord)}], base: {r, h}, size: {width, depth,
 * height, reach, middle: [x, y]}, order: [null, focus, …everyone else] (the view's slots), branches, relation(id), loose}.
 * The person is on the upright through the middle, standing on a post from the base.
 */
export function nearbyPlaquesLayout(people, focusId, steps) {
  const c = nearbyFamilies(people, focusId, steps);
  if (!c.people.size) return { plaques: [], links: [], base: { r: 20, h: PLAQUE.base }, size: { width: 100, depth: 100, height: 100, reach: 50 }, order: [null], branches: [], relation: () => "", loose: c.loose };
  const raw = layoutCC(c, { PLAQUE: SIZES, LEVEL });
  // (the lowest plaque stands a stem above the base)
  const lowest = Math.min(...raw.plaques.map((plaque) => plaque.z - plaque.h / 2));
  const lift = PLAQUE.base + PLAQUE.stem - lowest;
  // Branches (each grandparent's side, each husband or wife, child and brother or sister) and how everyone is related, as in the Galaxy.
  const galaxy = galaxyLayout(c.people, focusId, { maxSteps: 4 * NEARBY.maxSteps, maxPeople: c.people.size + 1 });
  const branchOf = new Map(galaxy.nodes.map((node) => [node.id, node.branch]));
  const plaques = raw.plaques.map((plaque) => ({
    id: plaque.id,
    person: c.people.get(plaque.id),
    generation: c.gen.get(plaque.id) || 0,
    x: plaque.x,
    y: plaque.y,
    z: plaque.z + lift,
    w: plaque.w,
    h: plaque.h,
    t: PLAQUE.thick,
    branch: branchOf.has(plaque.id) ? branchOf.get(plaque.id) : -1,
  }));
  const focus = plaques.find((plaque) => plaque.id === focusId);
  const links = raw.links.map((link) => ({ from: [link.a[0], link.a[1], link.a[2] + lift], to: [link.b[0], link.b[1], link.b[2] + lift], r: PLAQUE.post, id: link.id || 0 }));
  links.push({ from: [0, 0, PLAQUE.base - 0.5], to: [0, 0, focus.z - focus.h / 2], r: NEARBY.trunk, id: 0 });
  const reach = plaques.reduce((most, plaque) => Math.max(most, Math.hypot(plaque.x, plaque.y) + plaque.w / 2), 0);
  const xs = plaques.flatMap((plaque) => [plaque.x - plaque.w / 2, plaque.x + plaque.w / 2]);
  const ys = plaques.flatMap((plaque) => [plaque.y - plaque.w / 2, plaque.y + plaque.w / 2]);
  const height = plaques.reduce((most, plaque) => Math.max(most, plaque.z + plaque.h / 2), 0);
  // (the person first, then the rest nearest first: the view numbers them like slots)
  const steps0 = nearbySteps(people, focusId, steps);
  const others = plaques.filter((plaque) => plaque.id !== focusId).sort((a, b) => steps0.get(a.id) - steps0.get(b.id) || a.id - b.id);
  return {
    plaques,
    links,
    base: { r: 30, h: PLAQUE.base },
    // (the middle of it all from above: the pages fan out one way, so the camera turns round this, not the person)
    size: { width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...ys) - Math.min(...ys), height, reach, middle: [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2] },
    order: [null, focus.person, ...others.map((plaque) => plaque.person)],
    branches: galaxy.branches,
    relation: (id) => galaxyRelation(galaxy, c.people, id),
    loose: c.loose,
  };
}

// ── The layout ("pages", ported from .chat-lab/ccplaques/designs/pages/layout.mjs) ─────────────────────
//
// 1. A spanning tree from the focus over people and families (who reached whom first).
// 2. Pages. The focus sits on the axis. Each close relative starts a spine page: father, mother, groups of
//    siblings, each spouse, groups of children. A page is a 2D chart laid out along it (x = distance from the
//    axis, generations as rows): descendant blocks are tidy trees (Reingold-Tilford / Walker style: couples
//    together, parents centred over their children); an ancestor family puts the parents over the sibling group and
//    carries on along the page through the outer parent, while the inner parent's family tries the other way.
//    Whatever won't fit (an ancestry that would collide, a spouse's family pushed too far along, a branch that would
//    make the page too wide) is cut off onto a page of its own, hung at the distance from the axis where it joins
//    (an empty slot is left on the parent page), running outwards or back inwards, whichever reaches less far.
// 3. Page angles. Every pair of pages needs an angle that keeps their plaques on the same level apart. Pages go
//    round in a ring, each spine page with its cut-offs either side; the side and order of the cut-offs is chosen
//    by local search to keep the chords between pages short. If the ring needs more than a full turn, the page
//    setting the hungriest angle on the deciding chain moves outwards (cut-off pages before spine pages); then
//    the order is improved once more. Spare angle opens the fan to at least half a turn; the rest stays as one
//    open gap, so pages keep their angles when more people are added (the father's page is always at 90 degrees).
// 4. Rods. A family's bar lies along its page in the gap below the parents (posts down from the parents, up from
//    the children); members on other pages join by chords at the bar's height; the focus's own families meet at a
//    hub on the axis. A post that would rise past a plaque (a parent two levels up) jogs aside first. Heights within
//    each gap are chosen so different families' bars never cross or run along each other.
//
// layoutCC(c, {PLAQUE: {w, h, focusW, focusH, stem, gap}, LEVEL, tune}) → {plaques: [{id, x, y, z, w, h}],
// links: [{a, b, family, id?}]}, the person at the origin and z = generation × LEVEL.
export function layoutCC(c, opts) {
  const { PLAQUE, LEVEL } = opts;
  const W = PLAQUE.w;
  const GAP = PLAQUE.gap;
  const SLOT = W + GAP;
  const P = {
    WMAX: 720, // widest page (mm along the page)
    SMALL: 4, // a block this small may stretch a page by SLACK
    SLACK: SLOT * 2,
    SMALLCUT: 6, // a family bringing this few people stays on its page even if it has to go further along
    TOL: SLOT * 1.5, // how far along a family may be pushed before it gets a page of its own
    INLIM: 200, // how far a spine page may run back inwards of its first person
    inward: true, // cut-off pages may run back inwards from where they join
    R0: 64, // spine pages start this far out
    RMIN: 32, // nothing nearer the axis than this
    RIN_CUT: 300, // cut-off pages keep at least this far out
    CLEAR: 6, // between plaques on neighbouring pages (the bench wants 4)
    MINSEP: 0.03, // smallest angle between neighbouring pages (radians)
    PASSES: 3, // local search passes over the ring order
    ROUNDS: 2, // order the ring, push pages out, order again
    OVER: 1e5, // cost per radian of overrunning a full turn, while ordering
    STEP: 24, // how far a crowded page is pushed out at a time
    MAXPUSH: 600, // single-page pushes before every page is pushed together
    KEEPSPINE: true, // push cut-off pages out before spine pages
    FILL: 0.5, // the fan covers at least this share of a turn
    INSPARE: 0.25, // share of spare angle given inside a spine page's cluster
    ...(opts.tune || {}),
  };
  const F = c.focusId;
  const G = (id) => c.gen.get(id) ?? 0;
  const wid = (id) => (id === F ? PLAQUE.focusW : W);
  const hgt = (id) => (id === F ? PLAQUE.focusH : PLAQUE.h);
  const born = (id) => c.people.get(id)?.birth || "9999";

  // ── families ────────────────────────────────────────────────────────────────────────────────────
  const famByKey = new Map(c.families.map((f) => [f.key, f]));
  const birthOf = new Map();
  const marrOf = new Map();
  c.families.forEach((f) => {
    f.children.forEach((ch) => birthOf.set(ch, f));
    f.parents.forEach((p) => {
      if (!marrOf.has(p)) marrOf.set(p, []);
      marrOf.get(p).push(f);
    });
  });
  const firstBorn = (f) => (f.children.length ? born(f.children[0]) : "9998");
  marrOf.forEach((list) => list.sort((a, b) => firstBorn(a).localeCompare(firstBorn(b)) || (a.key < b.key ? -1 : 1)));

  // ── spanning tree (breadth first from the focus) ──────────────────────────────────────────────────
  const viaFam = new Map([[F, null]]);
  const viaPer = new Map();
  const tfams = new Map(); // person → families reached through them
  const tmem = new Map(); // family key → members reached through it
  const queue = [F];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    const list = [];
    [birthOf.get(p), ...(marrOf.get(p) || [])].forEach((f) => {
      if (!f || viaPer.has(f.key)) return;
      viaPer.set(f.key, p);
      list.push(f);
      const mem = [];
      [...f.parents, ...f.children].forEach((m) => {
        if (m === p || viaFam.has(m)) return;
        viaFam.set(m, f.key);
        mem.push(m);
        queue.push(m);
      });
      tmem.set(f.key, mem);
    });
    tfams.set(p, list);
  }
  const isUp = (f, p) => f.children.includes(p); // a family reached through one of its children
  const upOf = (p) => (tfams.get(p) || []).find((f) => isUp(f, p));
  const downsOf = (p) => (tfams.get(p) || []).filter((f) => !isUp(f, p));
  // (size of everything reached through a person: to choose which parent carries on along the page)
  const reach = new Map();
  for (let i = queue.length - 1; i >= 0; i--) {
    const p = queue[i];
    let n = 1;
    (tfams.get(p) || []).forEach((f) => tmem.get(f.key).forEach((m) => (n += reach.get(m) || 1)));
    reach.set(p, n);
  }

  // ── blocks: rigid sets of items {id, x, g, w} (id null for an empty slot) with a contour per level ──
  const contour = (items) => {
    const lo = new Map();
    const hi = new Map();
    items.forEach((it) => {
      const a = it.x - it.w / 2;
      const b = it.x + it.w / 2;
      if (!lo.has(it.g) || a < lo.get(it.g)) lo.set(it.g, a);
      if (!hi.has(it.g) || b > hi.get(it.g)) hi.set(it.g, b);
    });
    return { lo, hi };
  };
  const shiftItems = (items, dx) => items.forEach((it) => (it.x += dx));
  // how far right B (contour) must sit so it clears A (contour)
  const clearOf = (A, B, gap) => {
    let dx = -Infinity;
    A.hi.forEach((b, g) => {
      if (B.lo.has(g)) dx = Math.max(dx, b - B.lo.get(g) + gap);
    });
    return dx;
  };
  const spanOf = (items) => {
    let a = Infinity;
    let b = -Infinity;
    items.forEach((it) => {
      a = Math.min(a, it.x - it.w / 2);
      b = Math.max(b, it.x + it.w / 2);
    });
    return b - a;
  };

  // A row of blocks packed left to right; each block's root at block.rootX. Returns {items, roots: [x], pend, cuts}
  const packRow = (blocks, sep = GAP) => {
    const items = [];
    const roots = [];
    let acc = null;
    blocks.forEach((b) => {
      let dx = 0;
      if (acc) {
        dx = clearOf(acc, contour(b.items), sep);
        if (!Number.isFinite(dx)) dx = 0;
        dx = Math.max(dx, roots[roots.length - 1] + SLOT);
        shiftItems(b.items, dx);
      }
      roots.push(dx);
      items.push(...b.items);
      acc = contour(items);
    });
    return { items, roots, pend: blocks.flatMap((b) => b.pend), cuts: blocks.flatMap((b) => b.cuts) };
  };

  // Descendant block of p: p, spouses, children's blocks below (tidy tree), p at x = 0. Children in `cut` become
  // empty slots (their own pages). pend: spouses whose own families still need placing.
  const dblock = (p, cut) => {
    const g = G(p);
    const me = { id: p, x: 0, g, w: wid(p) };
    const items = [me];
    const pend = [];
    const cuts = [];
    let right = 0;
    let left = 0;
    const groups = [];
    downsOf(p).forEach((f, i) => {
      const mem = tmem.get(f.key);
      const sp = mem.filter((m) => f.parents.includes(m));
      const kids = mem.filter((m) => f.children.includes(m));
      let sx = null;
      const side = i % 2 === 0 ? 1 : -1;
      if (sp.length) {
        sx = side > 0 ? (right += SLOT) : (left -= SLOT);
        items.push({ id: sp[0], x: sx, g: G(sp[0]), w: W });
        pend.push([sp[0], side]);
      }
      if (kids.length) {
        const blocks = kids.map((k) => {
          if (cut && cut.has(k)) {
            const slot = { id: null, ref: k, x: 0, g: G(k), w: W };
            return { items: [slot], pend: [], cuts: [{ kind: "D", person: k, slot }] };
          }
          return dblock(k, cut);
        });
        const row = packRow(blocks);
        const mid = (row.roots[0] + row.roots[row.roots.length - 1]) / 2;
        const want = sx === null ? 0 : sx / 2;
        shiftItems(row.items, want - mid);
        groups.push({ row, side });
      }
    });
    // groups: right-side ones pushed right of what's placed, left-side ones pushed left
    const placed = [];
    groups.forEach(({ row, side }) => {
      if (placed.length) {
        const A = contour(placed);
        const C = contour(row.items);
        if (side > 0) {
          const dx = clearOf(A, C, GAP);
          if (dx > 0) shiftItems(row.items, dx);
        } else {
          const dx = clearOf(C, A, GAP);
          if (dx > 0) shiftItems(row.items, -dx);
        }
      }
      placed.push(...row.items);
      items.push(...row.items);
      pend.push(...row.pend);
      cuts.push(...row.cuts);
    });
    return { items, pend, cuts };
  };

  const dwidth = new Map();
  const dwidthOf = (p) => {
    if (!dwidth.has(p)) dwidth.set(p, spanOf(dblock(p, null).items));
    return dwidth.get(p);
  };
  // descendant block cut down to fit the widest page
  const dblockFit = (p, wmax = P.WMAX) => {
    const cut = new Set();
    for (;;) {
      const b = dblock(p, cut);
      if (spanOf(b.items) <= wmax) return b;
      // cut the widest branch still in the block
      let best = null;
      let bw = -1;
      b.items.forEach((it) => {
        if (it.id === null || it.id === p || cut.has(it.id)) return;
        const f = famByKey.get(viaFam.get(it.id));
        if (!f || !f.children.includes(it.id)) return; // only children's branches
        const w = dwidthOf(it.id);
        if (w > bw) {
          bw = w;
          best = it.id;
        }
      });
      if (best === null) return b;
      cut.add(best);
    }
  };

  // ── pages ─────────────────────────────────────────────────────────────────────────────────────────
  const pages = [];
  const newPage = (kind, parent, anchor) => {
    const pg = { id: pages.length, kind, parent, anchor, rows: new Map(), items: [], slot: new Map(), lo: Infinity, hi: -Infinity, pend: [], cuts: [], kids: [] };
    pages.push(pg);
    if (parent) parent.kids.push(pg);
    return pg;
  };
  // smallest move from dx in direction dir (+1 outwards, -1 inwards) that lets the items fit among what's there
  const fitShift = (pg, items, dx, dir = 1) => {
    for (let guard = 0; guard < 500; guard++) {
      let need = dx;
      items.forEach((it) => {
        const row = pg.rows.get(it.g);
        if (!row) return;
        const lo = it.x + dx - it.w / 2;
        const hi = it.x + dx + it.w / 2;
        row.forEach(([a, b]) => {
          if (a < hi + GAP - 1e-6 && b > lo - GAP + 1e-6) need = dir > 0 ? Math.max(need, dx + (b + GAP - lo)) : Math.min(need, dx - (hi + GAP - a));
        });
      });
      if (Math.abs(need - dx) < 1e-9) return dx;
      dx = need;
    }
    return dx;
  };
  const extentWith = (pg, items, dx) => {
    let lo = pg.lo;
    let hi = pg.hi;
    items.forEach((it) => {
      lo = Math.min(lo, it.x + dx - it.w / 2);
      hi = Math.max(hi, it.x + dx + it.w / 2);
    });
    return hi - lo;
  };
  const commit = (pg, items, dx) => {
    items.forEach((it) => {
      it.x += dx;
      if (!pg.rows.has(it.g)) pg.rows.set(it.g, []);
      pg.rows.get(it.g).push([it.x - it.w / 2, it.x + it.w / 2]);
      pg.items.push(it);
      pg.slot.set(it.id === null ? `s${it.ref}` : it.id, it);
      pg.lo = Math.min(pg.lo, it.x - it.w / 2);
      pg.hi = Math.max(pg.hi, it.x + it.w / 2);
    });
  };
  const place = (pg, block, dx) => {
    commit(pg, block.items, dx);
    pg.pend.push(...block.pend);
    pg.cuts.push(...block.cuts);
  };
  const mirror = (block, dir) => {
    if (dir > 0) return block;
    block.items.forEach((it) => (it.x = -it.x));
    block.pend = block.pend.map(([id, side]) => [id, -side]);
    if (block.roots) block.roots = block.roots.map((x) => -x);
    return block;
  };
  const snapshot = (pg) => ({ rows: new Map([...pg.rows].map(([g, r]) => [g, r.slice()])), n: pg.items.length, pend: pg.pend.length, cuts: pg.cuts.length, lo: pg.lo, hi: pg.hi });
  const restore = (pg, s) => {
    pg.rows = s.rows;
    pg.items.splice(s.n).forEach((it) => pg.slot.delete(it.id === null ? `s${it.ref}` : it.id));
    pg.pend.length = s.pend;
    pg.cuts.length = s.cuts;
    pg.lo = s.lo;
    pg.hi = s.hi;
  };
  const xOf = (pg, id) => (pg.slot.get(id) || pg.slot.get(`s${id}`)).x;
  const emptySlot = (pg, ref, g, want, dir) => {
    const s = { id: null, ref, x: 0, g, w: W };
    commit(pg, [s], fitShift(pg, [s], want, dir));
    return s;
  };
  const tooWide = (pg) => pg.hi - pg.lo > P.WMAX + (pg.items.length - (pg.mark || 0) <= P.SMALL ? P.SLACK : 0) || (pg.spine && pg.lo < -P.INLIM);

  // parents of an ancestor family: [inner, outer]; the outer one's family carries on along the page
  const orderParents = (pars) => {
    if (pars.length < 2) return pars;
    const [a, b] = pars;
    const ga = c.people.get(a)?.gender;
    return ga === "Female" ? [b, a] : [a, b]; // father on the inside
  };

  // A down family reached through q (already on the page): spouse beside q (on the dir side), children below.
  const attachDown = (pg, q, f, strict, dir) => {
    const xq = xOf(pg, q);
    const mem = tmem.get(f.key);
    const sp = mem.filter((m) => f.parents.includes(m));
    const kids = mem.filter((m) => f.children.includes(m));
    let xs = xq;
    if (sp.length) {
      const it = { id: sp[0], x: xq + dir * SLOT, g: G(sp[0]), w: W };
      const dx = fitShift(pg, [it], 0, dir);
      if (strict && Math.abs(dx) > P.TOL) return false;
      commit(pg, [it], dx);
      pg.pend.push([sp[0], dir]);
      xs = it.x;
    }
    if (kids.length) {
      const row = mirror(packRow(kids.map((k) => dblockFit(k))), dir);
      const mid = (row.roots[0] + row.roots[row.roots.length - 1]) / 2;
      const want = (xq + xs) / 2 - mid;
      const dx = fitShift(pg, row.items, want, dir);
      if (strict && Math.abs(dx - want) > P.TOL) return false;
      place(pg, row, dx);
    }
    return !strict || !tooWide(pg);
  };

  // An ancestor family reached through v (already on the page, maybe as an empty slot): v's brothers and sisters
  // beside v on the dir side, the parents centred above them, then the outer parent's own family further on.
  // The inner parent's family would have to come back across: it tries the other way, or gets a page of its own.
  const placeUp = (pg, v, f, strict, dir) => {
    const xv = xOf(pg, v);
    const mem = tmem.get(f.key);
    const sibs = mem.filter((m) => f.children.includes(m));
    const pars = orderParents(mem.filter((m) => f.parents.includes(m)));
    let last = xv;
    for (const s of sibs) {
      const b = mirror(dblockFit(s), dir);
      const want = last + dir * SLOT;
      const dx = fitShift(pg, b.items, want, dir);
      if (strict && Math.abs(dx - want) > P.TOL) return false;
      if (extentWith(pg, b.items, dx) > P.WMAX + (b.items.length <= P.SMALL ? P.SLACK : 0)) {
        const slot = emptySlot(pg, s, G(s), want, dir);
        if (strict && Math.abs(slot.x - want) > P.TOL) return false;
        pg.cuts.push({ kind: "D", person: s, slot });
        last = slot.x;
      } else {
        place(pg, b, dx);
        last = dx;
      }
    }
    if (!pars.length) return true;
    const mid = (xv + last) / 2;
    const row = pars.length === 2 ? [{ id: pars[0], x: mid - (dir * SLOT) / 2, g: G(pars[0]), w: W }, { id: pars[1], x: mid + (dir * SLOT) / 2, g: G(pars[1]), w: W }] : [{ id: pars[0], x: mid, g: G(pars[0]), w: W }];
    const dx = fitShift(pg, row, 0, dir);
    if (strict && Math.abs(dx) > P.TOL) return false;
    commit(pg, row, dx);
    if (strict && tooWide(pg)) return false;
    const outer = pars[pars.length - 1];
    const inner = pars.length === 2 ? pars[0] : null;
    downsOf(outer).forEach((g2) => tryDown(pg, outer, g2, [dir]));
    const up2 = upOf(outer);
    if (up2) tryUp(pg, outer, up2, [dir]);
    if (inner !== null) {
      downsOf(inner).forEach((g2) => tryDown(pg, inner, g2, [-dir]));
      const up1 = upOf(inner);
      if (up1) tryUp(pg, inner, up1, [-dir]);
    }
    return true;
  };
  // size of what a cut would move to a new page
  const cutSize = (f, v) => tmem.get(f.key).reduce((n, m) => n + (reach.get(m) || 1), 0);
  const attempt = (pg, fn) => {
    const s = snapshot(pg);
    const mark = pg.mark;
    pg.mark = pg.items.length;
    const ok = fn();
    pg.mark = mark;
    if (!ok) restore(pg, s);
    return ok;
  };
  const tryUp = (pg, v, f, dirs) => {
    for (const dir of dirs) if (attempt(pg, () => placeUp(pg, v, f, true, dir) && !tooWide(pg))) return true;
    // a small family stays on the page even if it has to go further along
    if (cutSize(f, v) <= P.SMALLCUT && attempt(pg, () => placeUp(pg, v, f, false, dirs[0]) && pg.hi - pg.lo <= P.WMAX + P.SLACK && !(pg.spine && pg.lo < -P.INLIM))) return true;
    pg.cuts.push({ kind: "U", person: v, fam: f });
    return false;
  };
  const tryDown = (pg, q, f, dirs) => {
    for (const dir of dirs) if (attempt(pg, () => attachDown(pg, q, f, true, dir))) return true;
    if (cutSize(f, q) <= P.SMALLCUT && attempt(pg, () => attachDown(pg, q, f, false, dirs[0]) && pg.hi - pg.lo <= P.WMAX + P.SLACK && !(pg.spine && pg.lo < -P.INLIM))) return true;
    pg.cuts.push({ kind: "M", person: q, fam: f });
    return false;
  };
  // spouses placed in descendant blocks: their own parents' families (and other marriages), on their side
  const settle = (pg) => {
    for (let i = 0; i < pg.pend.length; i++) {
      const [s, side] = pg.pend[i];
      downsOf(s).forEach((f) => tryDown(pg, s, f, [side, -side]));
      const up = upOf(s);
      if (up) tryUp(pg, s, up, [side]);
    }
  };

  // spine pages
  const spine = [];
  const fam0 = upOf(F);
  const mem0 = fam0 ? tmem.get(fam0.key) : [];
  const parents0 = orderParents(mem0.filter((m) => fam0.parents.includes(m)));
  const sibs0 = fam0 ? mem0.filter((m) => fam0.children.includes(m)) : [];
  const uPage = (v, role) => {
    const pg = newPage("U", null, null);
    pg.role = role;
    pg.spine = true;
    commit(pg, [{ id: v, x: 0, g: G(v), w: wid(v) }], 0);
    downsOf(v).forEach((f) => tryDown(pg, v, f, [1]));
    const up = upOf(v);
    if (up) placeUp(pg, v, up, false, 1);
    return pg;
  };
  const groupPages = (roots, role) => {
    const out = [];
    let pg = null;
    let last = 0;
    roots.forEach((r) => {
      const b = dblockFit(r);
      if (pg) {
        const dx = fitShift(pg, b.items, last + SLOT);
        if (extentWith(pg, b.items, dx) <= P.WMAX) {
          place(pg, b, dx);
          last = dx;
          return;
        }
      }
      pg = newPage("D", null, null);
      pg.role = role;
      out.push(pg);
      place(pg, b, 0);
      last = 0;
    });
    return out;
  };
  parents0.forEach((p, i) => spine.push(uPage(p, i === 0 && parents0.length === 2 ? "father" : "mother")));
  spine.push(...groupPages(sibs0, "sibling"));
  downsOf(F).forEach((f) => {
    const mem = tmem.get(f.key);
    mem.filter((m) => f.parents.includes(m)).forEach((s) => spine.push(uPage(s, "spouse")));
    spine.push(...groupPages(mem.filter((m) => f.children.includes(m)), "child"));
  });

  // settle spouses, then build cut-off pages breadth first. A cut-off page hangs at its anchor's distance from the
  // spine and may run outwards or back inwards from there: whichever keeps it nearer the middle.
  const realSpan = (pg) => {
    let lo = Infinity;
    let hi = -Infinity;
    pg.items.forEach((it) => {
      if (it.id === null) return;
      lo = Math.min(lo, it.x);
      hi = Math.max(hi, it.x);
    });
    return [lo, hi];
  };
  const buildCut = (pg, cu, dir) => {
    const anchor = cu.kind === "D" ? cu.slot.x : xOf(pg, cu.person);
    const child = { id: -1, kind: cu.kind, parent: pg, anchor, rows: new Map(), items: [], slot: new Map(), lo: Infinity, hi: -Infinity, pend: [], cuts: [], kids: [], cut: cu, dir };
    if (cu.kind === "D") place(child, mirror(dblockFit(cu.person), dir), 0);
    else {
      commit(child, [{ id: null, ref: cu.person, x: 0, g: G(cu.person), w: W }], 0);
      if (cu.kind === "U") placeUp(child, cu.person, cu.fam, false, dir);
      else attachDown(child, cu.person, cu.fam, false, dir);
    }
    settle(child);
    const est = pg.est + anchor;
    const [lo, hi] = realSpan(child);
    const push = Math.max(0, Math.max(P.RMIN + W / 2, P.RIN_CUT) - (est + lo));
    child.score = est + hi + push * 2;
    return child;
  };
  pages.forEach((pg) => (pg.est = P.R0 - Math.min(0, realSpan(pg)[0])));
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i];
    if (!pg.parent) settle(pg);
    pg.cuts.forEach((cu) => {
      const a = buildCut(pg, cu, 1);
      const b = P.inward ? buildCut(pg, cu, -1) : null;
      const child = b && b.score < a.score ? b : a;
      child.id = pages.length;
      child.est = pg.est + child.anchor;
      pages.push(child);
      pg.kids.push(child);
    });
  }

  // ── angles ──────────────────────────────────────────────────────────────────────────────────────────
  // page offsets (distance from the axis of x = 0)
  const minRad = (pg) => {
    let need = -Infinity;
    pg.items.forEach((it) => {
      if (it.id === null) return;
      const rmin = it.g === 0 ? (PLAQUE.focusW + it.w) / 2 + P.CLEAR + 1 : P.RMIN;
      need = Math.max(need, rmin - it.x);
    });
    return need;
  };
  const push = new Array(pages.length).fill(0);
  const baseOf = new Map();
  pages.forEach((pg) => baseOf.set(pg, pg.parent ? baseOf.get(pg.parent) + pg.anchor : P.R0));
  const floor = pages.map(minRad);
  const offsetOf = (pg) => Math.max(baseOf.get(pg) + push[pg.id], floor[pg.id], pg.parent ? P.RIN_CUT - realSpan(pg)[0] : -Infinity);
  // radii of each page's plaques per level, sorted
  const radii = (pg) => {
    const m = new Map();
    pg.items.forEach((it) => {
      if (it.id === null) return;
      if (!m.has(it.g)) m.set(it.g, []);
      m.get(it.g).push([pg.offset + it.x, it.w]);
    });
    m.forEach((list) => list.sort((a, b) => a[0] - b[0]));
    return m;
  };
  // smallest angle between two pages that keeps every pair of plaques on the same level apart
  const need = (A, B) => {
    let best = 0;
    A.forEach((la, g) => {
      const lb = B.get(g);
      if (!lb) return;
      let j0 = 0;
      for (const [ra, wa] of la) {
        while (j0 < lb.length && lb[j0][0] < ra - 60) j0++;
        for (let j = j0; j < lb.length && lb[j][0] < ra + 60; j++) {
          const [rb, wb] = lb[j];
          const D = (wa + wb) / 2 + P.CLEAR;
          if (Math.abs(ra - rb) >= D) continue;
          const cos = (ra * ra + rb * rb - D * D) / (2 * ra * rb);
          const ang = cos <= -1 ? 10 : Math.acos(cos);
          if (ang > best) best = ang;
        }
      }
    });
    return best;
  };
  const N = pages.length;
  pages.forEach((pg) => (pg.offset = offsetOf(pg)));
  const Rp = pages.map(radii);
  const req = pages.map(() => new Array(N).fill(0));
  const setReq = (a) => {
    for (let b = 0; b < N; b++) if (b !== a) req[a][b] = req[b][a] = need(Rp[a], Rp[b]);
  };
  for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) req[a][b] = req[b][a] = need(Rp[a], Rp[b]);
  const rin = (k) => {
    let m = Infinity;
    Rp[k].forEach((list) => (m = Math.min(m, list[0][0])));
    return m;
  };
  // pages round the ring in the given order, each as early as all the earlier ones allow
  const solve = (ord) => {
    const n = ord.length;
    const th = new Array(n).fill(0);
    const pred = new Array(n).fill(-1);
    for (let j = 1; j < n; j++) {
      let t = th[j - 1] + P.MINSEP;
      let pj = j - 1;
      const rj = req[ord[j]];
      for (let i = 0; i < j; i++) {
        const v = th[i] + rj[ord[i]];
        if (v > t) {
          t = v;
          pj = i;
        }
      }
      th[j] = t;
      pred[j] = pj;
    }
    let total = n > 1 ? th[n - 1] + P.MINSEP : 0;
    let wi = n - 1;
    let wj = 0;
    for (let i = 0; i < n; i++) {
      const ri = req[ord[i]];
      for (let j = 0; j < i; j++) {
        const v = th[i] - th[j] + ri[ord[j]];
        if (v > total) {
          total = v;
          wi = i;
          wj = j;
        }
      }
    }
    return { th, pred, total, wi, wj };
  };

  // Ring order: each spine page with its cut-offs either side of it. Which side and how near each cut-off goes
  // is chosen to keep the chords between pages short (a cut-off joins its parent page at a given distance from the
  // axis, so the chord is about 2 r sin(angle / 2)).
  const weightOf = new Map();
  const subWeight = (pg) => {
    if (!weightOf.has(pg)) weightOf.set(pg, pg.items.length + pg.kids.reduce((s2, k) => s2 + subWeight(k), 0));
    return weightOf.get(pg);
  };
  const kidsL = new Map();
  const kidsR = new Map();
  pages.forEach((pg) => {
    const L = [];
    const Rt = [];
    [...pg.kids].sort((a, b) => subWeight(a) - subWeight(b) || a.anchor - b.anchor).forEach((k, i) => (i % 2 ? L : Rt).push(k));
    kidsL.set(pg, L);
    kidsR.set(pg, Rt);
  });
  const flat = (pg, out) => {
    const L = kidsL.get(pg);
    for (let i = L.length - 1; i >= 0; i--) flat(L[i], out);
    out.push(pg.id);
    kidsR.get(pg).forEach((k) => flat(k, out));
    return out;
  };
  const orderNow = () => {
    const out = [];
    spine.forEach((pg) => flat(pg, out));
    return out;
  };
  const chordR = pages.map((pg) => (pg.parent ? Math.max(P.RMIN, pg.parent.offset + pg.anchor) : 0));
  const pos = new Array(N).fill(0);
  const costOf = (ord) => {
    const s = solve(ord);
    ord.forEach((id, i) => (pos[id] = s.th[i]));
    let cst = Math.max(0, s.total - 2 * Math.PI) * P.OVER;
    pages.forEach((pg) => {
      if (!pg.parent) return;
      const d = Math.abs(pos[pg.id] - pos[pg.parent.id]);
      cst += 2 * chordR[pg.id] * Math.sin(Math.min(d, Math.PI) / 2);
    });
    return cst;
  };
  let best = Infinity;
  let evals = 0;
  const optimise = () => {
    best = costOf(orderNow());
    for (let pass = 0; pass < P.PASSES; pass++) {
      let improved = false;
      pages.forEach((pg) => {
        if (pg.kids.length < 2) return;
        const L = kidsL.get(pg);
        const Rt = kidsR.get(pg);
        [...pg.kids].forEach((k) => {
          const from = L.includes(k) ? L : Rt;
          const fi = from.indexOf(k);
          from.splice(fi, 1);
          let bestAt = [from, fi];
          for (const list of [L, Rt])
            for (let at2 = 0; at2 <= list.length; at2++) {
              if (list === from && at2 === fi) continue;
              list.splice(at2, 0, k);
              evals++;
              const v = costOf(orderNow());
              list.splice(at2, 1);
              if (v < best - 1e-6) {
                best = v;
                bestAt = [list, at2];
                improved = true;
              }
            }
          bestAt[0].splice(bestAt[1], 0, k);
        });
      });
      if (!improved) break;
    }
  };

  // If the ring overruns a full turn, push out the page that sets the hungriest angle on the chain that decides
  // the total (a cut-off page rather than a spine page), and try again; if that runs out, move every page out.
  const repush = (pg) => {
    pg.offset = offsetOf(pg);
    Rp[pg.id] = radii(pg);
    setReq(pg.id);
    chordR[pg.id] = pg.parent ? Math.max(P.RMIN, pg.parent.offset + pg.anchor) : 0;
    pg.kids.forEach((k) => (chordR[k.id] = Math.max(P.RMIN, pg.offset + k.anchor)));
  };
  let iters = 0;
  const pushOut = (ord) => {
    const ring = ord.map((id) => pages[id]);
    let sol = solve(ord);
    let it = 0;
    while (sol.total > 2 * Math.PI && it++ < P.MAXPUSH) {
      let worst = { v: req[ord[sol.wj]][ord[sol.wi]], a: sol.wj, b: sol.wi };
      for (let k = sol.wi; k > sol.wj && sol.pred[k] >= 0; k = sol.pred[k]) {
        const p0 = sol.pred[k];
        const v = req[ord[p0]][ord[k]];
        if (v > worst.v) worst = { v, a: p0, b: k };
      }
      const pa = ring[worst.a];
      const pb = ring[worst.b];
      const pick = P.KEEPSPINE && !pa.parent !== !pb.parent ? (pa.parent ? worst.a : worst.b) : rin(ord[worst.a]) <= rin(ord[worst.b]) ? worst.a : worst.b;
      push[ord[pick]] += P.STEP;
      repush(ring[pick]);
      sol = solve(ord);
    }
    iters += it;
    for (let guard = 0; sol.total > 2 * Math.PI && guard < 1000; guard++) {
      pages.forEach((pg) => (push[pg.id] += P.STEP));
      pages.forEach((pg) => {
        pg.offset = offsetOf(pg);
        Rp[pg.id] = radii(pg);
      });
      pages.forEach((pg) => {
        setReq(pg.id);
        chordR[pg.id] = pg.parent ? Math.max(P.RMIN, pg.parent.offset + pg.anchor) : 0;
      });
      sol = solve(ord);
    }
    return sol;
  };
  optimise();
  pushOut(orderNow());
  for (let round = 1; round < P.ROUNDS; round++) {
    optimise();
    pushOut(orderNow());
  }
  const ring = orderNow().map((id) => pages[id]);
  const ord = ring.map((pg) => pg.id);
  const n = ring.length;
  const sol = solve(ord);
  // spare angle: enough is shared out between the pages (more after bigger pages, little inside a spine page's
  // cluster) for the fan to cover FILL of a turn; the rest is left as one open gap after the last page
  const rootOf = (pg) => (pg.parent ? rootOf(pg.parent) : pg);
  const share = Math.max(0, P.FILL * 2 * Math.PI - sol.total);
  const weight = ring.map((pg, j) => (j === n - 1 ? 0 : (1 + Math.sqrt(pg.items.length)) * (rootOf(pg) === rootOf(ring[j + 1]) ? P.INSPARE : 1)));
  const wsum = weight.reduce((a, b) => a + b, 0) || 1;
  const theta = [];
  let add = 0;
  for (let j = 0; j < n; j++) {
    theta.push(sol.th[j] + add);
    add += (share * weight[j]) / wsum;
  }
  // turn the ring so the father's page (or the first) sits at a fixed angle
  const ref = ring.findIndex((pg) => pg.role === "father");
  const rot = Math.PI / 2 - theta[Math.max(0, ref)];
  const angleOf = new Map(ring.map((pg, i) => [pg, theta[i] + rot]));

  // ── positions ───────────────────────────────────────────────────────────────────────────────────────
  const at = new Map();
  const pageOf = new Map();
  at.set(F, { id: F, x: 0, y: 0, z: 0, w: wid(F), h: hgt(F) });
  pages.forEach((pg) => {
    const th = angleOf.get(pg);
    pg.theta = th;
    pg.items.forEach((it) => {
      if (it.id === null) return;
      const r = pg.offset + it.x;
      at.set(it.id, { id: it.id, x: r * Math.cos(th), y: r * Math.sin(th), z: G(it.id) * LEVEL, w: wid(it.id), h: hgt(it.id) });
      pageOf.set(it.id, pg);
    });
  });
  // (anyone missed, which shouldn't happen: park them far out)
  c.people.forEach((p, id) => {
    if (!at.has(id)) at.set(id, { id, x: 5000 + id * 50, y: 0, z: G(id) * LEVEL, w: W, h: PLAQUE.h });
  });

  const links = route(c, at, pageOf, F, { PLAQUE, LEVEL, G });
  return { plaques: [...at.values()], links };
}

// ── rods ──────────────────────────────────────────────────────────────────────────────────────────────
function route(c, at, pageOf, F, { PLAQUE, LEVEL, G }) {
  const links = [];
  const plan = []; // per bar: {f, top, segs: [[xy, xy]], ends: [{id, xy} | {xy, jog}]}
  // plaques by level, to keep posts that rise past a level (a parent two levels up) clear of them
  const byLevel = new Map();
  at.forEach((q) => {
    const g = Math.round(q.z / LEVEL);
    if (!byLevel.has(g)) byLevel.set(g, []);
    byLevel.get(g).push(q);
  });
  const blocked = (p, g0, g1) => {
    for (let g = g0; g <= g1; g++) for (const q of byLevel.get(g) || []) if (Math.hypot(p[0] - q.x, p[1] - q.y) < q.w / 2 + 2) return true;
    return false;
  };
  // where a member's post rises to a bar under parents at level `top`: its own spot, or (if a plaque on a level in
  // between is in the way) a spot nearby, reached by a short jog in the gap just above the member
  const postPoint = (f, id, top) => {
    const q = at.get(id);
    const g = G(id);
    const xy = [q.x, q.y];
    if (g >= top - 1 || !blocked(xy, g + 1, top - 1)) return { xy };
    const r = Math.hypot(q.x, q.y);
    const u = r > 0.01 ? [q.x / r, q.y / r] : [1, 0];
    const t = [-u[1], u[0]];
    for (let d = 2; d <= 240; d += 2)
      for (const [a, b] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
        const p = [q.x + u[0] * a + t[0] * b, q.y + u[1] * a + t[1] * b];
        if (Math.hypot(p[0], p[1]) > 1 && !blocked(p, g + 1, top - 1)) {
          const jog = { f, top: g + 1, segs: [[xy, p]], ends: [{ id, xy }] };
          plan.push(jog);
          return { xy: p, jog };
        }
      }
    return { xy };
  };
  const onLine = (p, th) => Math.abs(p[0] * Math.sin(th) - p[1] * Math.cos(th)) < 0.01 && p[0] * Math.cos(th) + p[1] * Math.sin(th) > -0.01;
  c.families.forEach((f) => {
    const members = [...f.parents, ...f.children].filter((id) => at.has(id));
    if (members.length < 2) return;
    const parents = f.parents.filter((id) => at.has(id));
    const top = Math.max(...parents.map((id) => G(id)));
    const segs = []; // horizontal pieces in top view: [[x,y],[x,y]]
    const ends = []; // where each member's post meets the bar
    const pts = new Map(members.map((id) => [id, postPoint(f, id, top)]));
    pts.forEach((pt, id) => ends.push(pt.jog ? { xy: pt.xy, jog: pt.jog } : { id, xy: pt.xy }));
    // a member whose post point is off the line its bar runs along joins it by a chord at the bar's height
    const join = (th, p) => {
      const r = Math.hypot(p[0], p[1]);
      const foot = [Math.cos(th) * r, Math.sin(th) * r];
      if (Math.hypot(foot[0] - p[0], foot[1] - p[1]) > 0.01) segs.push([foot, p]);
    };
    if (members.includes(F)) {
      // hub on the axis; one spoke per page out to the farthest member on it
      const far = new Map();
      members.forEach((id) => {
        if (id === F) return;
        const pg = pageOf.get(id);
        const p = pts.get(id).xy;
        const r = Math.hypot(p[0], p[1]);
        if (!far.has(pg) || far.get(pg) < r) far.set(pg, r);
        if (!onLine(p, pg.theta)) join(pg.theta, p);
      });
      far.forEach((r, pg) => segs.push([[0, 0], [Math.cos(pg.theta) * r, Math.sin(pg.theta) * r]]));
    } else {
      // home page: the one holding most members
      const count = new Map();
      members.forEach((id) => count.set(pageOf.get(id), (count.get(pageOf.get(id)) || 0) + 1));
      let home = null;
      let best = -1;
      parents.concat(members).forEach((id) => {
        const pg = pageOf.get(id);
        if (count.get(pg) > best) {
          best = count.get(pg);
          home = pg;
        }
      });
      const th = home.theta;
      let rlo = Infinity;
      let rhi = -Infinity;
      members.forEach((id) => {
        const p = pts.get(id).xy;
        const r = Math.hypot(p[0], p[1]);
        rlo = Math.min(rlo, r);
        rhi = Math.max(rhi, r);
        if (!onLine(p, th)) join(th, p);
      });
      if (rhi - rlo > 0.01) segs.push([[Math.cos(th) * rlo, Math.sin(th) * rlo], [Math.cos(th) * rhi, Math.sin(th) * rhi]]);
    }
    plan.push({ f, top, segs, ends });
  });

  // bar heights: within each gap, different families' bars mustn't cross or run along each other
  const cross = (a, b, c2, d) => {
    const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c2) * o(a, b, d) < 0 && o(c2, d, a) * o(c2, d, b) < 0;
  };
  const along = (P, Q) => {
    const d = [P[1][0] - P[0][0], P[1][1] - P[0][1]];
    const L = Math.hypot(d[0], d[1]);
    if (L < 0.01) return false;
    const off = (p) => Math.abs((p[0] - P[0][0]) * d[1] - (p[1] - P[0][1]) * d[0]) / L;
    if (off(Q[0]) > 1 || off(Q[1]) > 1) return false;
    const t = (p) => ((p[0] - P[0][0]) * d[0] + (p[1] - P[0][1]) * d[1]) / L;
    const [q0, q1] = [t(Q[0]), t(Q[1])].sort((a, b) => a - b);
    return Math.min(L, q1) - Math.max(0, q0) > 0.5;
  };
  const shareEnd = (P, Q) => [P[0], P[1]].some((p) => [Q[0], Q[1]].some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.5));
  const clash = (A, B) => A.segs.some((P) => B.segs.some((Q) => cross(P[0], P[1], Q[0], Q[1]) || along(P, Q) || along(Q, P) || shareEnd(P, Q)));
  const byGap = new Map();
  plan.forEach((pl) => {
    if (!byGap.has(pl.top)) byGap.set(pl.top, []);
    byGap.get(pl.top).push(pl);
  });
  byGap.forEach((list, top) => {
    const zTop = top * LEVEL;
    const hiZ = Math.floor(zTop - PLAQUE.focusH / 2 - 2);
    const loZ = Math.ceil(zTop - LEVEL + PLAQUE.focusH / 2 + 2);
    const mid = Math.round(zTop - LEVEL / 2);
    const cands = [];
    for (let k = 0; k <= 40; k++) {
      [mid + k, mid - k].forEach((z) => {
        if (z >= loZ && z <= hiZ && !cands.includes(z)) cands.push(z);
      });
    }
    // prefer heights 3 mm apart first, then the rest
    const pref = [...cands.filter((z) => (z - mid) % 3 === 0), ...cands.filter((z) => (z - mid) % 3 !== 0)];
    const used = new Map();
    // longest bars first (they're the hardest to fit)
    const len = (pl) => pl.segs.reduce((s, [a, b]) => s + Math.hypot(a[0] - b[0], a[1] - b[1]), 0);
    [...list].sort((a, b) => len(b) - len(a)).forEach((pl) => {
      let z = pref.find((zz) => !(used.get(zz) || []).some((o) => clash(pl, o)));
      if (z === undefined) z = mid;
      pl.z = z;
      if (!used.has(z)) used.set(z, []);
      used.get(z).push(pl);
    });
  });

  // build the rods
  plan.forEach((pl) => {
    const { f, z } = pl;
    const key = f.key;
    pl.segs.forEach(([a, b]) => {
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.01) links.push({ a: [a[0], a[1], z], b: [b[0], b[1], z], family: key });
    });
    pl.ends.forEach((e) => {
      if (e.jog) {
        links.push({ a: [e.xy[0], e.xy[1], e.jog.z], b: [e.xy[0], e.xy[1], z], family: key });
        return;
      }
      const q = at.get(e.id);
      const edge = z > q.z ? q.z + q.h / 2 : q.z - q.h / 2;
      links.push({ a: [q.x, q.y, edge], b: [q.x, q.y, z], family: key, id: e.id });
    });
  });
  return links;
}
