// The Family Explorer's "Galaxy" view (user, 2026-10-11: "Let's do all three"; "Let's do the Galaxy"):
// everyone loaded round one person as stars. The person is the bright star in the middle; each step
// away (parent, child, husband or wife) is one ring further out; ancestors rise above the disc and
// descendants sink below it, a generation a layer; each branch from the person (their father's side,
// their mother's, each husband or wife and child) is an arm of its own colour, twisted into a spiral.
// This file works out where everyone goes; chat_family_galaxy.js draws it and moves it.

import { stepWord } from "./chat_family_navigator_data";
import { fullName } from "./chat_chart_common";

export const GALAXY = {
  ring: 120, // between steps, out from the middle
  layer: 70, // between generations, up and down
  twist: 0.42, // radians the arms turn each step out (the spiral)
  maxSteps: 7,
  maxPeople: 1500,
  // The degrees control (user, 2026-10-18: "let people add or remove degrees"): as WikiTree counts them for CC7,
  // a parent, child, brother, sister, husband or wife one degree.
  minDegrees: 1,
  maxDegrees: 5,
  defaultDegrees: 3,
};

// Arm colours, bright on the dark sky; the first arms (usually father's and mother's sides) warm and rose.
export const GALAXY_HUES = ["#ffb347", "#ff6f91", "#9d8cff", "#4fd1c5", "#7ee081", "#5ab0ff", "#ffd166", "#f78fb3", "#63e6be", "#c0a7ff"];

/** Everyone's family links in `people` (Id → summary): Id → [{id, step: "parent"|"child"|"spouse"}]. */
function familyLinks(people) {
  const links = new Map();
  const add = (a, b, step) => {
    if (!people.has(a) || !people.has(b) || a === b) return;
    if (!links.has(a)) links.set(a, []);
    if (!links.get(a).some((link) => link.id === b)) links.get(a).push({ id: b, step });
  };
  people.forEach((person) => {
    [person.fatherId, person.motherId].forEach((parentId) => {
      if (!parentId) return;
      add(person.id, parentId, "parent");
      add(parentId, person.id, "child");
    });
    (person.spouses || []).forEach((spouse) => {
      add(person.id, spouse.id, "spouse");
      add(spouse.id, person.id, "spouse");
    });
  });
  // (parents first, then husbands and wives, then children, each in birth order: the arms come out in that order)
  const order = { parent: 0, spouse: 1, child: 2 };
  links.forEach((list) =>
    list.sort((a, b) => order[a.step] - order[b.step] || (people.get(a.id).birth || "9999").localeCompare(people.get(b.id).birth || "9999") || a.id - b.id)
  );
  return links;
}

// Everyone's degrees from focusId as WikiTree counts them (a brother or sister is one, not two through a parent).
function degreesFrom(links, focusId, most) {
  const degrees = new Map([[focusId, 0]]);
  const queue = [focusId];
  for (let at = 0; at < queue.length; at++) {
    const id = queue[at];
    const degree = degrees.get(id);
    if (degree >= most) continue;
    const near = links.get(id) || [];
    const siblings = near.filter((link) => link.step === "parent").flatMap((parent) => (links.get(parent.id) || []).filter((link) => link.step === "child"));
    [...near, ...siblings].forEach(({ id: next }) => {
      if (degrees.has(next)) return;
      degrees.set(next, degree + 1);
      queue.push(next);
    });
  }
  return degrees;
}

// A small steady wobble per person, so the arms look like star fields rather than ruled lines.
function wobble(id, salt) {
  const x = Math.sin(id * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

/**
 * Where everyone goes round `focusId`: {nodes: [{id, person, steps, gen, branch, parentId, step, x, y, z}],
 * edges: [{a, b, kind}], branches: [{index, id, person, word}]}. y is up (ancestors positive). A node's
 * parentId is the one it was reached from on the shortest way out (its arm), step how they're related.
 */
export function galaxyLayout(people, focusId, options = {}) {
  const { ring, layer, twist, maxPeople, degrees: degreeLimit } = { ...GALAXY, ...options };
  const focus = people.get(focusId);
  if (!focus) return { nodes: [], edges: [], branches: [] };
  const links = familyLinks(people);
  // (with a degrees limit, only those within it; the rings still go a parent, child, husband or wife at a time, so a
  // brother or sister is on the second, through a parent)
  const degrees = degreeLimit ? degreesFrom(links, focusId, degreeLimit) : null;
  const maxSteps = degreeLimit ? 2 * degreeLimit : options.maxSteps || GALAXY.maxSteps;

  // Out from the person a step at a time (the shortest way to each).
  const nodes = new Map();
  const add = (person, steps, gen, parentId, step) => {
    const node = { id: person.id, person, steps, gen, parentId, step, kids: [], branch: -1, x: 0, y: 0, z: 0 };
    nodes.set(person.id, node);
    return node;
  };
  const queue = [add(focus, 0, 0, 0, "")];
  for (let at = 0; at < queue.length && nodes.size < maxPeople; at++) {
    const node = queue[at];
    if (node.steps >= maxSteps) continue;
    for (const link of links.get(node.id) || []) {
      if (nodes.has(link.id) || nodes.size >= maxPeople || (degrees && !degrees.has(link.id))) continue;
      const person = people.get(link.id);
      if (person.hidden) continue;
      const gen = node.gen + (link.step === "parent" ? 1 : link.step === "child" ? -1 : 0);
      const next = add(person, node.steps + 1, gen, node.id, link.step);
      node.kids.push(next);
      queue.push(next);
    }
  }

  // Each node's share of the circle: its arm's share split among those reached through it, by how
  // many they lead to (a big branch gets a wide arm, a lone star still gets room).
  const weight = new Map();
  const weigh = (node) => {
    let total = 1;
    node.kids.forEach((kid) => {
      total += weigh(kid);
    });
    weight.set(node.id, total);
    return total;
  };
  const root = nodes.get(focusId);
  weigh(root);
  // (a gentle power: the biggest side doesn't swamp the rest, live on Weatherall-111)
  const share = (node) => Math.pow(weight.get(node.id), 0.55);
  const spread = (node, a0, a1) => {
    node.angle = (a0 + a1) / 2;
    const total = node.kids.reduce((sum, kid) => sum + share(kid), 0);
    let a = a0;
    node.kids.forEach((kid) => {
      const width = ((a1 - a0) * share(kid)) / total;
      spread(kid, a, a + width);
      a += width;
    });
  };
  // (the father's side starts at the top left, so the arms read round from there)
  spread(root, -Math.PI * 0.75, Math.PI * 1.25);

  // An arm is someone next to the person, except that a parent's side splits into their parents' sides
  // (each grandparent's line its own colour: seen live, one parent's side was most of the galaxy).
  const branches = [];
  const branchIndex = new Map();
  const armOf = (node) => {
    const path = [];
    for (let at = node; at && at.parentId; at = nodes.get(at.parentId)) path.unshift(at);
    const [first, second] = path;
    return first.step === "parent" && second?.step === "parent" ? second : first;
  };
  nodes.forEach((node) => {
    if (node === root) return;
    const arm = armOf(node);
    if (!branchIndex.has(arm.id)) {
      branchIndex.set(arm.id, branches.length);
      branches.push({ index: branches.length, id: arm.id, person: arm.person, word: stepWord(focus, arm.person, people) || arm.step });
    }
    node.branch = branchIndex.get(arm.id);
    const radius = node.steps * ring * (1 + wobble(node.id, 1) * 0.16);
    const angle = node.angle + node.steps * twist + wobble(node.id, 2) * 0.05;
    node.x = Math.cos(angle) * radius;
    node.z = Math.sin(angle) * radius;
    node.y = node.gen * layer + wobble(node.id, 3) * layer * 0.3;
  });

  const edges = [];
  nodes.forEach((node) => {
    if (node.parentId) edges.push({ a: node.parentId, b: node.id, kind: node.step });
  });
  // (husbands and wives both in view but reached other ways: a faint line between them too)
  nodes.forEach((node) =>
    (node.person.spouses || []).forEach((spouse) => {
      const other = nodes.get(spouse.id);
      if (other && node.id < other.id && other.parentId !== node.id && node.parentId !== other.id) edges.push({ a: node.id, b: other.id, kind: "marriage" });
    })
  );
  return { nodes: [...nodes.values()].map(({ kids, angle, ...node }) => node), edges, branches };
}

/** How someone in the galaxy is related to the person in the middle: "father", "first cousin", "father's sister's son". */
export function galaxyRelation(layout, people, id) {
  const byId = new Map(layout.nodes.map((node) => [node.id, node]));
  const words = [];
  let node = byId.get(id);
  while (node && node.parentId) {
    const from = people.get(node.parentId);
    words.unshift(stepWord(from, node.person, people) || node.step);
    node = byId.get(node.parentId);
  }
  if (!words.length) return "";
  // (the way out goes by parents, children and husbands or wives only: a brother is "father's son")
  const kind = (word) => (/father|mother|parent/.test(word) ? "P".repeat(/^grand/.test(word) ? 2 : 1) : /son|daughter|child/.test(word) ? "C".repeat(/^grand/.test(word) ? 2 : 1) : /husband|wife|spouse/.test(word) ? "W" : "?");
  const shape = words.map(kind).join("");
  const target = byId.get(id)?.person || {};
  const gender = String(target.gender || "").toLowerCase();
  const pick = (male, female, either) => (gender === "male" ? male : gender === "female" ? female : either);
  const focus = layout.nodes.find((node) => !node.parentId)?.person || {};
  const half = shape === "PC" && focus.fatherId && focus.motherId && target.fatherId && target.motherId && (focus.fatherId !== target.fatherId || focus.motherId !== target.motherId);
  const named = {
    PC: half ? pick("half-brother", "half-sister", "half-sibling") : pick("brother", "sister", "sibling"),
    PP: pick("grandfather", "grandmother", "grandparent"),
    PPP: pick("great-grandfather", "great-grandmother", "great-grandparent"),
    PPPP: pick("2nd great-grandfather", "2nd great-grandmother", "2nd great-grandparent"),
    PPC: pick("uncle", "aunt", "aunt or uncle"),
    PPPC: pick("great-uncle", "great-aunt", "great-aunt or uncle"),
    PCC: pick("nephew", "niece", "nephew or niece"),
    PCCC: pick("great-nephew", "great-niece", "great-nephew or niece"),
    PPCC: "first cousin",
    PPCCC: "first cousin once removed",
    PPPCC: "first cousin once removed",
    PPPCCC: "second cousin",
    CC: pick("grandson", "granddaughter", "grandchild"),
    CCC: pick("great-grandson", "great-granddaughter", "great-grandchild"),
    WP: pick("father-in-law", "mother-in-law", "parent-in-law"),
    WPC: pick("brother-in-law", "sister-in-law", "sibling-in-law"),
    PCW: pick("brother-in-law", "sister-in-law", "sibling-in-law"),
    CW: pick("son-in-law", "daughter-in-law", "child-in-law"),
    WC: pick("stepson", "stepdaughter", "stepchild"),
    PW: pick("stepfather", "stepmother", "step-parent"),
  };
  if (words.length === 1) return words[0];
  if (named[shape]) return named[shape];
  return words.map((word, i) => (i < words.length - 1 ? `${word}'s` : word)).join(" ");
}

/**
 * Whether someone is a star rather than a planet (user, 2026-10-11: "Most of these people are dead.
 * It's a nice image to have someone become a star"): WikiTree says they aren't living, or, where it
 * didn't say, they have a death date or were born over 110 years ago.
 */
export function isStar(person, thisYear = new Date().getFullYear()) {
  if (person.living === true) return false;
  if (person.living === false) return true;
  const born = parseInt(String(person.birth || "").slice(0, 4), 10);
  return Boolean(person.death) || (born > 0 && born < thisYear - 110);
}

/** "Ted Weatherall's father's side" for the key. */
export function branchLabel(branch, focus) {
  const who = fullName(branch.person);
  if (/^(grand)?(father|mother|parent)$/.test(branch.word)) return `${who} (${branch.word}'s side)`;
  return `${who} (${branch.word})`;
}
