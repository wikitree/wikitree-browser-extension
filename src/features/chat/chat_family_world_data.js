// The family world (2026-10-03): the fractal tree's third version, "CC7-style"
// (user: "Everyone connected to the person (parents, siblings, spouses,
// children) can be seen by panning, zooming in or zooming out ... a way to see
// the whole of the big tree"). One generation per level (user: "the ones we
// should see at this level would be spouses and siblings. Zooming in ... should
// give you their children and their children's spouses (out: their parents and
// their parents' siblings)"). The view is a couple's circle with their children
// inside, each child with their spouse and children inside them, and so on down.
// A family tree can't nest upwards (everyone has two parents), so zooming out
// moves the root: when the couple's circle gets small, the view becomes both
// their parents' families side by side (user: "get both sets of parents as we
// zoom out from a couple"): his family, the couple, her family, with a
// placeholder in each family where they grew up; zooming out of either family
// gives its couple's two parents' families, and so on up (two families at every
// level). Placed so nothing on screen jumps; when a circle inside one of the
// families fills the view, it becomes the root (and zooming out goes back the
// way you came). Everything loads as you
// go: getPeople "nuclear" pages (CC-style: everyone within N steps; the user's
// suggestion) merged into one people map; each circle's share is frozen the
// first time it's laid out, so nothing moves when more arrives.

import { buildFractalLayout } from "./chat_fractal_tree_data";
import { getCountryFromLocation } from "./chat_place_country";

// getPeople nuclear depths: the first fetch around the person (CC3: ~3s, where CC4 took ~20s for an old colonial family), and each
// fetch around someone at the edge as you zoom (CC3 around them).
export const FAMILY_WORLD_NUCLEAR = { start: 3, expand: 3 };

// A placeholder's share of its family's circle (someone shown married into another family in view).
const GHOST_WEIGHT = 6;

const W_OWNER = String.raw`(my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z'_ -]*?-\d+['’]s)`;
const W_OWNER_AFTER = String.raw`(me|us|her|him|them|this\s+(?:profile|person)|[A-Z][A-Za-z'_ -]*?-\d+)`;
const W_LEAD = String.raw`(?:(?:show|draw|open|explore|make|build|give)(?:\s+me)?\s+)?`;
// (and plain "fractal" / "fractal tree": the family world is the fractal tree's newest version; "my ancestors as a
// fractal tree" still gets the ancestors-only one)
const W_VIEW = String.raw`(?:family\s+(?:world|explorer)|explorer|cc-?7\s+(?:tree|chart|view|world|map)|zoomable\s+cc-?7|fractal(?:\s+(?:tree|chart|view|world))?)`;
const WORLD_PATTERNS = [
  // "show my family world", "Cook-8721's CC7 tree", "family world"
  new RegExp(String.raw`^${W_LEAD}(?:an?\s+|the\s+)?(?:${W_OWNER}\s+)?${W_VIEW}$`, "i"),
  // "family world for Cook-8721", "show a CC7 view of her"
  new RegExp(String.raw`^${W_LEAD}(?:an?\s+|the\s+)?${W_VIEW}\s+(?:of|for|around)\s+${W_OWNER_AFTER}$`, "i"),
  // "show me everyone connected to her", "explore my whole family tree"
  new RegExp(String.raw`^(?:show|draw|explore)(?:\s+me)?\s+everyone\s+connected\s+to\s+${W_OWNER_AFTER}$`, "i"),
  new RegExp(String.raw`^(?:show|explore|zoom\s+around)(?:\s+me)?\s+${W_OWNER}\s+whole\s+(?:family\s+)?tree$`, "i"),
];

/** {owner, subjectPrompt} for the family world, or null. */
export function parseFamilyWorldPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const re of WORLD_PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const raw = String(match[1] || "")
      .trim()
      .replace(/['’]s$/i, "");
    const owner = /^(?:my|our|me|us)$/i.test(raw)
      ? "my"
      : /^her$/i.test(raw)
      ? "her"
      : /^(?:his|him)$/i.test(raw)
      ? "his"
      : /^(?:their|them)$/i.test(raw)
      ? "their"
      : /^this\s+(?:profile|person)$/i.test(raw) || !raw
      ? ""
      : raw;
    const subjectPrompt = !owner ? "this profile's ancestors" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors`;
    return { owner, subjectPrompt };
  }
  return null;
}

const MAX_ROWS = 40;

function cleanDate(value) {
  const text = String(value || "");
  return text && !/^0000/.test(text) ? text : "";
}

/** The chart's person summary (the same shape as the fan and descendant charts'). */
export function summarizeWorldPerson(person) {
  return {
    id: Number(person.Id),
    wtid: person.Name || "",
    // (only an Id comes for a profile you may not see: "Private", counted for a note in chat)
    name: person.RealName || person?.Derived?.ShortName || person.FirstName || person.Name || "Private",
    hidden: !(person.RealName || person?.Derived?.ShortName || person.FirstName || person.Name),
    lnab: person.LastNameAtBirth || "",
    gender: person.Gender || "",
    birth: cleanDate(person.BirthDate),
    death: cleanDate(person.DeathDate),
    birthLocation: person.BirthLocation || "",
    birthCountry: getCountryFromLocation(person.BirthLocation || "") || "",
    photo: person.Photo || "",
    photoData: person.PhotoData || null,
    fatherId: Number(person.Father) || 0,
    motherId: Number(person.Mother) || 0,
    spouses: (Array.isArray(person.Spouses) ? person.Spouses : Object.values(person.Spouses || {}))
      .filter((spouse) => spouse && Number(spouse.Id))
      .map((spouse) => ({ id: Number(spouse.Id), wtid: spouse.Name || "", married: cleanDate(spouse.MarriageDate || spouse.marriage_date) })),
  };
}

/** A new, empty world around `focusKey` (an Id or WikiTree ID). */
export function createFamilyWorld(focusKey) {
  return {
    focusKey: String(focusKey),
    focusId: 0,
    people: new Map(), // Id → summary
    childrenKnown: new Set(), // Ids whose children are all loaded
    parentsKnown: new Set(), // Ids whose parents were asked for
    weights: new Map(), // frozen layout shares, by node key
    tried: new Set(), // Ids fetched around (what didn't come then isn't coming)
    scene: null, // the view's root couple {a, b} and its scale and offset (see startFamilyScene)
  };
}

function findPerson(world, key) {
  const text = String(key || "");
  if (world.people.has(Number(text))) return world.people.get(Number(text));
  for (const person of world.people.values()) if (person.wtid === text) return person;
  return null;
}

function childrenIndex(world) {
  const index = new Map();
  world.people.forEach((person) => {
    [person.fatherId, person.motherId].forEach((parentId) => {
      if (!parentId) return;
      if (!index.has(parentId)) index.set(parentId, []);
      index.get(parentId).push(person);
    });
  });
  index.forEach((list) => list.sort((a, b) => (a.birth || "9999").localeCompare(b.birth || "9999") || a.id - b.id));
  return index;
}

// Profiles the viewer may not see (private, or the API login missing) come with
// a negative Id numbered per response (-1, -2 …), and the response's Father,
// Mother and Spouses refer to them by it. Family Explorer used to drop them, so a
// grandfather showed without his wife or children (user, 2026-10-04). Each
// response's negative Ids are renumbered to ones not used before, so two
// fetches' "-1"s stay different people.
function withUniqueHiddenIds(world, people) {
  const list = Object.values(people || {}).filter((person) => person && Number(person.Id));
  const renumber = new Map();
  list.forEach((person) => {
    const id = Number(person.Id);
    if (id < 0 && !renumber.has(id)) {
      world.nextHiddenId = (world.nextHiddenId || 0) - 1;
      renumber.set(id, world.nextHiddenId);
    }
  });
  if (!renumber.size) return list;
  const map = (value) => (Number(value) < 0 && renumber.has(Number(value)) ? renumber.get(Number(value)) : value);
  return list.map((person) => ({
    ...person,
    Id: map(person.Id),
    Father: map(person.Father),
    Mother: map(person.Mother),
    Spouses: (Array.isArray(person.Spouses) ? person.Spouses : Object.values(person.Spouses || {})).map((spouse) => (spouse ? { ...spouse, Id: map(spouse.Id) } : spouse)),
  }));
}

// Hidden people are known only by their visible parents: "Private", child of 123.
const visibleParentsKey = (fatherId, motherId) => [fatherId, motherId].filter((id) => Number(id) > 0).sort().join("|");

// A newer fetch that brings a visible parent's hidden children brings all of
// them, so the older placeholders for that parent go.
function replaceCoveredHidden(world, incoming) {
  const covered = new Set(
    incoming.filter((person) => Number(person.Id) < 0).map((person) => visibleParentsKey(Number(person.Father) || 0, Number(person.Mother) || 0)).filter(Boolean)
  );
  if (!covered.size) return;
  [...world.people.values()].forEach((person) => {
    if (person.id < 0 && covered.has(visibleParentsKey(person.fatherId, person.motherId))) world.people.delete(person.id);
  });
}

// A hidden placeholder nobody links to any more (its children were replaced) goes too.
function dropUnlinkedHidden(world) {
  for (let changed = true; changed; ) {
    changed = false;
    const linked = new Set();
    world.people.forEach((person) => {
      [person.fatherId, person.motherId].forEach((id) => id < 0 && linked.add(id));
      (person.spouses || []).forEach((spouse) => spouse.id < 0 && linked.add(spouse.id));
    });
    [...world.people.values()].forEach((person) => {
      if (person.id < 0 && !visibleParentsKey(person.fatherId, person.motherId) && !linked.has(person.id)) {
        world.people.delete(person.id);
        changed = true;
      }
    });
  }
}

/**
 * Adds a getPeople result to the world and records what is now known.
 * nuclear N → everyone fewer than N steps from the root (Meta.Degrees) has all
 * their parents, siblings, spouses and children loaded. Or, for the plain
 * kinds of fetch:
 * descendants N → the children of everyone fewer than N generations below the
 * root; ancestors N → the parents of everyone fewer than N generations above
 * it; siblings → the children of those ancestors (each line person's siblings).
 */
export function mergeWorldPeople(world, people, { root, nuclear = 0, ancestors = 0, descendants = 0, siblings = false } = {}) {
  const incoming = withUniqueHiddenIds(world, people);
  replaceCoveredHidden(world, incoming);
  incoming.forEach((person) => {
    const id = Number(person.Id);
    world.people.set(id, summarizeWorldPerson(person));
    const degrees = Number(person.Meta?.Degrees);
    // (nothing more can be fetched around a profile WikiTree won't show)
    if (id < 0 || (nuclear > 0 && Number.isFinite(degrees) && degrees < nuclear)) {
      world.childrenKnown.add(id);
      world.parentsKnown.add(id);
      if (id < 0) world.tried.add(id);
    }
  });
  dropUnlinkedHidden(world);
  const rootPerson = findPerson(world, root ?? world.focusKey);
  if (!world.focusId) {
    const focus = findPerson(world, world.focusKey);
    if (focus) world.focusId = focus.id;
  }
  if (!rootPerson) return world;
  world.tried.add(rootPerson.id);
  if (descendants > 0) {
    const kids = childrenIndex(world);
    let level = [rootPerson];
    for (let depth = 0; depth < descendants && level.length; depth += 1) {
      const next = [];
      level.forEach((person) => {
        world.childrenKnown.add(person.id);
        next.push(...(kids.get(person.id) || []));
      });
      level = next;
    }
  }
  if (ancestors > 0) {
    let level = [rootPerson];
    for (let generation = 0; generation < ancestors && level.length; generation += 1) {
      const next = [];
      level.forEach((person) => {
        world.parentsKnown.add(person.id);
        [person.fatherId, person.motherId].forEach((parentId) => {
          const parent = world.people.get(parentId);
          if (!parent) return;
          if (siblings) world.childrenKnown.add(parent.id);
          next.push(parent);
        });
      });
      level = next;
    }
  }
  return world;
}

/** Ahnentafel slots of the focus person's line: slot 1 is the focus; 2s and 2s+1 are the parents of s. */
function lineSlots(world) {
  const slots = new Map();
  const focus = world.people.get(world.focusId);
  if (!focus) return slots;
  slots.set(1, focus);
  let level = [1];
  for (let row = 1; row < MAX_ROWS && level.length; row += 1) {
    const next = [];
    level.forEach((slot) => {
      const person = slots.get(slot);
      [
        [person.fatherId, slot * 2],
        [person.motherId, slot * 2 + 1],
      ].forEach(([parentId, parentSlot]) => {
        const parent = world.people.get(parentId);
        if (!parent) return;
        slots.set(parentSlot, parent);
        next.push(parentSlot);
      });
    });
    level = next;
  }
  return slots;
}

const marriageKey = (x, y) => `m${Math.min(x, y)}-${Math.max(x, y)}`;
const otherParent = (child, parentId) => (child.fatherId === parentId ? child.motherId : child.fatherId) || 0;

/** Everyone someone has had children with or married: other parent Id → true (0 for "not recorded"). */
function partnersOf(world, kids, personId) {
  const person = world.people.get(personId);
  const partners = new Set((person?.spouses || []).map((spouse) => spouse.id));
  (kids.get(personId) || []).forEach((child) => {
    const other = otherParent(child, personId);
    if (other) partners.add(other);
  });
  return partners;
}

/**
 * The children of x and y together. With only one partner on record, children
 * whose other parent isn't recorded count as that couple's (it's both ways round,
 * so the couple's circle holds the same children whichever family it's seen from).
 */
function jointKids(world, kids, x, y) {
  const found = new Map();
  const add = (list) => list.forEach((child) => found.set(child.id, child));
  if (x && y) {
    add((kids.get(x) || []).filter((child) => otherParent(child, x) === y));
    [
      [x, y],
      [y, x],
    ].forEach(([one, two]) => {
      const partners = partnersOf(world, kids, one);
      if (partners.size === 1 && partners.has(two)) add((kids.get(one) || []).filter((child) => !otherParent(child, one)));
    });
  } else {
    const one = x || y;
    if (partnersOf(world, kids, one).size !== 1) add((kids.get(one) || []).filter((child) => !otherParent(child, one)));
  }
  return [...found.values()].sort((a, b) => (a.birth || "9999").localeCompare(b.birth || "9999") || a.id - b.id);
}

/** Someone's families: [{other, kids}], one per partner (and one for children whose other parent isn't recorded). */
function familiesOf(world, kids, personId) {
  const families = [...partnersOf(world, kids, personId)].map((other) => ({ other, kids: jointKids(world, kids, personId, other) }));
  const unknown = jointKids(world, kids, personId, 0);
  if (unknown.length) families.push({ other: 0, kids: unknown });
  return families;
}

/** A couple's names, the first one's details (birth, place, profile) and when they married. */
function pairSummary(first, second, secondId = 0) {
  const married = (first.spouses || []).find((spouse) => spouse.id === (second?.id || secondId));
  const secondName = second ? `${second.name} ${second.lnab}`.trim() : married?.wtid ? married.wtid.replace(/-\d+$/, "").replace(/_/g, " ") : "";
  return {
    ...first,
    name: secondName ? `${`${first.name} ${first.lnab}`.trim()} & ${secondName}` : first.name,
    married: married?.married || "",
    couple: [first, second || null],
  };
}

/** {a, b} with the father first (a is the left half of the couple's circle, b the right). */
function orderCouple(world, x, y) {
  const one = world.people.get(x);
  const two = world.people.get(y);
  return one?.gender === "Female" || two?.gender === "Male" ? { a: y || 0, b: x || 0 } : { a: x || 0, b: y || 0 };
}

/** The couple whose children's circle holds `personId` (their parents), or null. */
function parentCouple(world, kids, personId) {
  const person = world.people.get(personId);
  if (!person || (!person.fatherId && !person.motherId)) return null;
  const parentId = person.fatherId || person.motherId;
  const family = familiesOf(world, kids, parentId).find((entry) => entry.kids.some((child) => child.id === personId));
  return family ? orderCouple(world, parentId, family.other) : orderCouple(world, person.fatherId, person.motherId);
}

/** The first view: the person among their brothers and sisters, inside their parents' circle. */
export function startFamilyScene(world) {
  const kids = childrenIndex(world);
  const root = parentCouple(world, kids, world.focusId) || { a: world.focusId, b: 0, solo: true };
  world.scene = { root, scale: 1, x: 0, y: 0, trail: [] };
  return world.scene;
}

/** One person's parents' family: {status: "ready", family} | {status: "load", id} | {status: "none"}. */
function parentsStep(world, kids, personId) {
  const person = world.people.get(personId);
  if (!person || !world.parentsKnown.has(personId)) return world.tried.has(personId) ? { status: "none" } : { status: "load", id: personId };
  const parents = [person.fatherId, person.motherId].filter((id) => id && world.people.has(id)); // (private or missing ones aren't there)
  if (!parents.length) return { status: "none" };
  // Their brothers and sisters come with a fetch around a parent; after one, take what there is.
  if (!parents.some((id) => world.childrenKnown.has(id) || world.tried.has(id))) return { status: "load", id: parents[0] };
  return { status: "ready", family: parentCouple(world, kids, personId) };
}

/**
 * Zooming out: back up the way you came down, or else to both sets of parents of
 * one couple (user: "Zooming out of any of those should give you their parents and
 * their parents' siblings"): their two parents' families side by side. On a root
 * that already holds two families, `from` is the one you're zooming out of.
 * Someone with no parents on record keeps their own family beside the other's.
 * → {status: "ready", root, back} | {status: "load", ids} (fetch around them first) | {status: "none"}.
 */
export function climbFamilyScene(world, from = null) {
  const scene = world.scene || startFamilyScene(world);
  if (scene.trail?.length) return { status: "ready", root: scene.trail[scene.trail.length - 1], back: true };
  const root = scene.root;
  const couple = root.band ? from || root.band[0] : root.solo ? null : root;
  if (!couple) return { status: "none" };
  const kids = childrenIndex(world);
  const steps = [couple.a, couple.b].filter(Boolean).map((id) => parentsStep(world, kids, id));
  const ids = steps.filter((step) => step.status === "load").map((step) => step.id);
  if (ids.length) return { status: "load", ids: [...new Set(ids)] };
  const band = [];
  steps.forEach((step) => {
    if (step.status === "ready" && !band.some((entry) => marriageKey(entry.a, entry.b) === marriageKey(step.family.a, step.family.b))) band.push(step.family);
  });
  if (!band.length) return { status: "none" };
  if (band.length === 1) {
    // Only one of them has parents on record: just that family.
    return { status: "ready", root: band[0] };
  }
  return { status: "ready", root: { band, from: { a: couple.a, b: couple.b } } };
}

/**
 * Moves the view's root to `root`, placed so the circle `anchorUid` (on screen in
 * `previousNodes`, in world units) stays exactly where it is: nothing jumps. When
 * that circle isn't in the new view (a band of families moving up), the biggest of
 * the old root's circles that is stays put instead.
 * how: "down" (remembered, for the way back), "back" (going back up it) or "up".
 */
export function rerootFamilyScene(world, root, anchorUid, previousNodes, how = "down") {
  const old = world.scene;
  const trail = old?.trail || [];
  world.scene = { root, scale: 1, x: 0, y: 0, trail: [] };
  const layout = buildFamilyWorldLayout(world).nodes;
  const oldRoot = previousNodes[0];
  const inside = oldRoot ? oldRoot.children.map((i) => previousNodes[i]).sort((p, q) => q.r - p.r) : [];
  let before = null;
  let after = null;
  for (const uid of [anchorUid, ...inside.map((node) => node.uid)]) {
    before = previousNodes.find((node) => node.uid === uid);
    after = layout.find((node) => node.uid === uid);
    if (before && after) break;
  }
  if (!before || !after) {
    world.scene = old;
    return false;
  }
  const scale = before.r / after.r;
  const nextTrail = how === "down" ? [...trail, old.root] : how === "back" ? trail.slice(0, -1) : [];
  world.scene = { root, scale, x: before.x - after.x * scale, y: before.y - after.y * scale, trail: nextTrail };
  return true;
}

/** Resets the view's offset and scale to plain units; returns the old ones (the renderer folds them into its zoom). */
export function normaliseFamilyScene(world) {
  const { scale, x, y } = world.scene;
  world.scene = { ...world.scene, scale: 1, x: 0, y: 0 };
  return { scale, x, y };
}

/**
 * Lays the view out: the root couple's circle (radius 1 before the view's scale and
 * offset) with their children inside, each child with their spouse and their own
 * children inside, and so on down; someone with children by more than one partner
 * holds a circle per family.
 * nodes: the fractal layout's nodes (root first) plus kind ("family" | "person"), uid
 * (stable: a couple's key or the person's), couple {a, b} (the left and right halves:
 * whose parents zooming out leads to; null on a circle that holds families), families
 * (it holds one circle per family), focus
 * on the person the world is about, and expand {mode, id} where more can load.
 */
export function buildFamilyWorldLayout(world) {
  const nodes = [];
  if (!world.scene) startFamilyScene(world);
  const { root, scale, x: offsetX, y: offsetY } = world.scene;
  const kids = childrenIndex(world);
  const known = (id) => !id || world.childrenKnown.has(id);
  const seen = new Set();

  // In a band, the couple you zoomed out from stands between their two families; in each family a
  // placeholder marks where they grew up.
  const visitors = new Map(); // Id → the couple's key
  if (root.band) [root.from.a, root.from.b].filter(Boolean).forEach((id) => visitors.set(id, marriageKey(root.from.a, root.from.b)));

  const childSlot = (child, depth) => {
    if (depth === 2 && visitors.has(child.id)) {
      // (holding any other families they had: Susannah Hanks's second marriage)
      const key = visitors.get(child.id);
      const others = familiesOf(world, kids, child.id).filter((family) => marriageKey(child.id, family.other) !== key);
      return {
        person: child,
        kind: "ghost",
        uid: `g${child.id}`,
        couple: null,
        ghostOf: key,
        families: others.length > 0,
        depth,
        more: false,
        children: others.map((family) => familySlot(child, family, depth)),
      };
    }
    const families = depth > 40 || seen.has(child.id) ? [] : familiesOf(world, kids, child.id);
    seen.add(child.id);
    const more = !known(child.id);
    const expand = more ? { mode: "descendants", id: child.id } : null;
    if (families.length <= 1) {
      const family = families[0];
      if (!family?.other) {
        return {
          person: child,
          kind: "person",
          uid: `p${child.id}`,
          couple: orderCouple(world, child.id, 0),
          depth,
          more,
          expand,
          children: (family?.kids || []).map((kid) => childSlot(kid, depth + 1)),
        };
      }
      return {
        person: pairSummary(child, world.people.get(family.other), family.other),
        kind: "family",
        uid: marriageKey(child.id, family.other),
        couple: orderCouple(world, child.id, family.other),
        depth,
        more,
        expand,
        children: family.kids.map((kid) => childSlot(kid, depth + 1)),
      };
    }
    return {
      person: child,
      kind: "person",
      uid: `p${child.id}`,
      families: true,
      depth,
      more,
      expand,
      children: families.map((family) => familySlot(child, family, depth)),
    };
  };
  // One of someone's families, inside their circle.
  const familySlot = (child, family, depth) => ({
    person: family.other ? pairSummary(child, world.people.get(family.other), family.other) : child,
    kind: family.other ? "family" : "person",
    uid: family.other ? marriageKey(child.id, family.other) : `u${child.id}`,
    couple: orderCouple(world, child.id, family.other),
    depth,
    more: false,
    children: family.kids.map((kid) => childSlot(kid, depth + 1)),
  });

  // A couple's family: the couple with their children inside.
  const coupleTree = (couple, depth, side = false) => {
    const father = world.people.get(couple.a);
    const mother = world.people.get(couple.b);
    const first = father || mother;
    if (!first) return null;
    const both = couple.a && couple.b;
    const none = !known(couple.a) && !known(couple.b);
    return {
      person: both ? pairSummary(first, father ? mother : father, father ? couple.b : couple.a) : first,
      kind: "family",
      // The same key the circle has as someone's child (see childSlot), so moving the root can find it.
      uid: both ? marriageKey(couple.a, couple.b) : familiesOf(world, kids, first.id).length > 1 ? `u${first.id}` : `p${first.id}`,
      couple: { a: couple.a, b: couple.b },
      side,
      depth,
      more: none,
      expand: none ? { mode: "descendants", id: first.id } : null,
      children: jointKids(world, kids, couple.a, couple.b).map((kid) => childSlot(kid, depth + 1)),
    };
  };

  let tree;
  if (root.solo) {
    const person = world.people.get(root.a);
    if (!person) return { nodes, links: [] };
    tree = { person: { ...person, name: `${person.name}'s family`, lnab: "" }, kind: "family", uid: `s${person.id}`, couple: null, depth: 0, more: false, children: [childSlot(person, 1)] };
  } else if (root.band) {
    // His family, the couple, her family.
    const [his, hers] = root.band.map((couple) => coupleTree(couple, 1, true));
    const middle = coupleTree(root.from, 1);
    const families = [his, middle, hers].filter(Boolean);
    if (!his || !hers) return { nodes, links: [] };
    const from = [root.from.a, root.from.b].map((id) => world.people.get(id)).filter(Boolean);
    const names = from.map((person) => `${person.name} ${person.lnab}`.trim()).join(" & ");
    tree = { person: { name: `The parents of ${names}`, couple: names, lnab: "", id: 0 }, kind: "band", uid: `b${marriageKey(root.from.a, root.from.b)}`, couple: null, depth: 0, more: false, children: families };
  } else {
    tree = coupleTree(root, 0);
    if (!tree) return { nodes, links: [] };
  }

  // Freeze each circle's share of its parent's the first time it's laid out, so nothing moves when more loads.
  const weigh = (node) => {
    node.children.forEach(weigh);
    // (a placeholder gets room for a small family, so it can be seen and read)
    node.weight = Math.max(node.kind === "ghost" ? GHOST_WEIGHT : 0, 1 + node.children.reduce((sum, child) => sum + child.weight, 0));
  };
  weigh(tree);
  const share = (node) =>
    node.children.forEach((child) => {
      if (!world.weights.has(child.uid)) world.weights.set(child.uid, child.weight);
      child.layoutWeight = world.weights.get(child.uid);
      share(child);
    });
  share(tree);

  const used = new Map();
  buildFractalLayout(tree).nodes.forEach((node) => {
    const source = node.source;
    // A cousin marriage can bring someone in twice; keep their keys apart.
    const count = used.get(source.uid) || 0;
    used.set(source.uid, count + 1);
    nodes.push({
      ...node,
      x: offsetX + node.x * scale,
      y: offsetY + node.y * scale,
      r: node.r * scale,
      uid: count ? `${source.uid}#${count}` : source.uid,
      kind: source.kind,
      couple: source.couple || null,
      families: Boolean(source.families),
      expand: source.expand || null,
      ghostOf: source.ghostOf || null,
      side: Boolean(source.side),
      focus: source.depth > 0 && source.person?.id === world.focusId,
      leaf: node.parent === -1 ? false : node.leaf,
    });
  });
  return { nodes, links: [] };
}

/** "Elizabeth's family world starts with 497 people: … zoom out for both sets of parents …" */
export function buildFamilyWorldSummary(world, ownerText) {
  const focus = world.people.get(world.focusId);
  if (!focus) return `${ownerText} Family Explorer couldn't be loaded.`;
  const slots = lineSlots(world);
  const up = slots.size ? Math.floor(Math.log2(Math.max(...slots.keys()))) : 0;
  const kids = childrenIndex(world);
  const siblings = new Set();
  [focus.fatherId, focus.motherId].filter(Boolean).forEach((id) => (kids.get(id) || []).forEach((child) => child.id !== focus.id && siblings.add(child.id)));
  const pronoun = focus.gender === "Female" ? "her" : focus.gender === "Male" ? "his" : "their";
  const among = siblings.size ? `${focus.name} among ${pronoun} ${siblings.size === 1 ? "brother or sister" : `${siblings.size} brothers and sisters`}, with their husbands and wives` : `${focus.name} and ${pronoun} family`;
  return `${ownerText} Family Explorer starts with ${world.people.size.toLocaleString()} people (${up} generation${up === 1 ? "" : "s"} of ancestors so far). It opens on ${among}. Zoom into anyone for their children; zoom out for both sets of parents, with their brothers and sisters. More loads as you go.`;
}
