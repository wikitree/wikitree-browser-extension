// The Family Explorer's 3D view (chat_family_3d.js) and its "Download for 3D printing": a person's
// ancestors as a Tornado (balls on struts, twisting up a generation a level) or a Fan tower (the fan
// chart as a stepped relief). Everything here is pure: where everyone goes, closed meshes, and the
// STL and 3MF files. Units are millimetres with z up, so what's on screen is what prints.

import { generationOfSlot } from "./chat_fan_chart_data";

export const MIN_GENERATIONS = 3;
export const MAX_GENERATIONS = 8;
export const DEFAULT_GENERATIONS = 6;

// Five colours at most, so a 4- or 5-filament printer can print it in colour: the person, with the base,
// in ivory, and each grandparent's line in its own colour; a parent takes their father's line's colour.
export const PRINT_PARTS = [
  { key: "root", name: "Start person and base", colour: "#efe6d2" },
  { key: "line4", name: "Father's father's line", colour: "#3d6fb6" },
  { key: "line5", name: "Father's mother's line", colour: "#3f9a6e" },
  { key: "line6", name: "Mother's father's line", colour: "#d9822b" },
  { key: "line7", name: "Mother's mother's line", colour: "#a0518f" },
];
export const PART_COLOURS = Object.fromEntries(PRINT_PARTS.map((part) => [part.key, part.colour]));

/** Which colour an Ahnentafel slot is: "root", or "line4" … "line7" (the grandparent it goes back to). */
export function lineKey(slot) {
  const generation = generationOfSlot(slot);
  if (generation === 0) return "root";
  if (generation === 1) return slot === 2 ? "line4" : "line6";
  return `line${slot >> (generation - 2)}`;
}

/**
 * Whether to treat someone as living when printing: WikiTree says so; or, when it doesn't say, born
 * within 100 years with no death date. A profile WikiTree won't show counts as living too.
 */
export function treatAsLiving(person, thisYear = new Date().getFullYear()) {
  if (!person || person.hidden) return true;
  if (person.living === true) return true;
  if (person.living === false || person.death) return false;
  const born = parseInt(String(person.birth || "").slice(0, 4), 10);
  return born > thisYear - 100;
}

/** slots[1 … 2^(generations+1)-1] from the Explorer's people (by fatherId/motherId); null where nobody's known. */
export function ancestorSlots(people, rootId, generations) {
  const slots = new Array(2 ** (generations + 1)).fill(null);
  slots[1] = people.get(rootId) || null;
  for (let slot = 1; slot < slots.length / 2; slot += 1) {
    const person = slots[slot];
    if (!person) continue;
    slots[slot * 2] = people.get(person.fatherId) || null;
    slots[slot * 2 + 1] = people.get(person.motherId) || null;
  }
  return slots;
}

/** Whether everyone up to the top generation has their recorded parents loaded. */
export function ancestorsLoaded(people, slots) {
  for (let slot = 1; slot < slots.length / 2; slot += 1) {
    const person = slots[slot];
    if (person && [person.fatherId, person.motherId].some((id) => id > 0 && !people.has(id))) return false;
  }
  return true;
}

// ── Tornado ────────────────────────────────────────────────────────────────

// (each generation a ring 9 mm further out, turned a little more; a level rises at least as far as its
// struts lean out, so no strut leans more than 45° and it prints without supports)
const TORNADO = { spread: 9, twist: 0.45, minRise: 12, base: 3, sink: 0.4 };

export function tornadoBallRadius(generation) {
  if (generation === 0) return 6;
  const spacing = (2 * Math.PI * TORNADO.spread * generation) / 2 ** generation;
  return Math.max(1.5, Math.min(5.4 - 0.45 * generation, 0.45 * spacing));
}

export function tornadoStrutRadius(generation) {
  return Math.max(0.9, 0.24 * tornadoBallRadius(generation));
}

function slotAngle(slot, twist) {
  const generation = generationOfSlot(slot);
  return (2 * Math.PI * (slot - 2 ** generation + 0.5)) / 2 ** generation + twist * generation;
}

/** How far up generation g + 1 sits above generation g: at least the furthest a strut between them leans out. */
function tornadoRise(generation) {
  const inner = TORNADO.spread * generation;
  const outer = TORNADO.spread * (generation + 1);
  const turn = TORNADO.twist + Math.PI / 2 ** (generation + 1);
  const lean = generation === 0 ? outer : Math.sqrt(inner * inner + outer * outer - 2 * inner * outer * Math.cos(turn));
  return Math.max(TORNADO.minRise, lean);
}

/**
 * The Tornado: {balls: [{slot, generation, person, key, x, y, z, r}], struts: [{slot, key, from, to, r}],
 * base: {r, h}, size: {width, height}}. A strut runs from someone's child up to them and has their colour.
 */
export function tornadoLayout(slots, generations) {
  const rootRadius = tornadoBallRadius(0);
  const levels = [TORNADO.base - TORNADO.sink + rootRadius * Math.SQRT2];
  for (let g = 1; g <= generations; g += 1) levels.push(levels[g - 1] + tornadoRise(g - 1));
  const balls = [];
  const bySlot = new Map();
  for (let slot = 1; slot < 2 ** (generations + 1) && slot < slots.length; slot += 1) {
    const person = slots[slot];
    if (!person) continue;
    const generation = generationOfSlot(slot);
    const angle = slotAngle(slot, TORNADO.twist);
    const radius = TORNADO.spread * generation;
    const ball = { slot, generation, person, key: lineKey(slot), x: radius * Math.cos(angle), y: radius * Math.sin(angle), z: levels[generation], r: tornadoBallRadius(generation) };
    balls.push(ball);
    bySlot.set(slot, ball);
  }
  const struts = balls
    .filter((ball) => ball.slot > 1 && bySlot.has(Math.floor(ball.slot / 2)))
    .map((ball) => {
      const child = bySlot.get(Math.floor(ball.slot / 2));
      return { slot: ball.slot, key: ball.key, from: [child.x, child.y, child.z], to: [ball.x, ball.y, ball.z], r: tornadoStrutRadius(ball.generation) };
    });
  const deepest = balls.reduce((most, ball) => Math.max(most, ball.generation), 0);
  const reach = balls.reduce((most, ball) => Math.max(most, Math.hypot(ball.x, ball.y) + ball.r), rootRadius);
  const top = balls.reduce((most, ball) => Math.max(most, ball.z + ball.r), 0);
  return {
    balls,
    struts,
    base: { r: Math.max(20, 0.55 * TORNADO.spread * deepest), h: TORNADO.base },
    size: { width: 2 * reach, height: top },
  };
}

// ── Fan tower ──────────────────────────────────────────────────────────────

// (the fan chart's rings, all the way round; the person in the middle is the highest step and each
// generation out a step lower, so nothing overhangs; a gap round each block shows where one ends)
const TOWER = { rootRadius: 11, step: 5.5, gap: 0.8, base: 3, margin: 3 };

export function towerRingWidth(generation) {
  if (generation <= 2) return 10;
  if (generation <= 4) return 8;
  if (generation <= 6) return 6.5;
  return 5.5;
}

export function towerRingInner(generation) {
  let radius = generation > 0 ? TOWER.rootRadius : 0;
  for (let g = 1; g < generation; g += 1) radius += towerRingWidth(g);
  return radius;
}

/**
 * The Fan tower: {blocks: [{slot, generation, person, key, a0, a1, r0, r1, z0, z1}], base: {r, h}, size}.
 * Angles go anticlockwise from the +x axis, the father's side first; missing ancestors leave a gap.
 */
export function fanTowerLayout(slots, generations) {
  const blocks = [];
  const half = TOWER.gap / 2;
  for (let slot = 1; slot < 2 ** (generations + 1) && slot < slots.length; slot += 1) {
    const person = slots[slot];
    if (!person) continue;
    const generation = generationOfSlot(slot);
    const top = TOWER.base + TOWER.step * (generations + 1 - generation);
    if (generation === 0) {
      blocks.push({ slot, generation, person, key: "root", a0: 0, a1: 2 * Math.PI, r0: 0, r1: TOWER.rootRadius - half, z0: TOWER.base, z1: top });
      continue;
    }
    const r0 = towerRingInner(generation) + half;
    const r1 = towerRingInner(generation) + towerRingWidth(generation) - half;
    const span = (2 * Math.PI) / 2 ** generation;
    const index = slot - 2 ** generation;
    const trim = half / ((r0 + r1) / 2);
    // (the father's side on the left, seen from the front)
    const start = Math.PI / 2 + index * span;
    blocks.push({ slot, generation, person, key: lineKey(slot), a0: start + trim, a1: start + span - trim, r0, r1, z0: TOWER.base, z1: top });
  }
  const deepest = blocks.reduce((most, block) => Math.max(most, block.generation), 0);
  const outer = towerRingInner(deepest) + (deepest ? towerRingWidth(deepest) : TOWER.rootRadius);
  const r = outer + TOWER.margin;
  return { blocks, base: { r, h: TOWER.base }, size: { width: 2 * r, height: TOWER.base + TOWER.step * (generations + 1) } };
}

// ── Plaques ────────────────────────────────────────────────────────────────

// (user, 2026-10-12: "plates with people's details on them, connected like a regular family tree, but 3d
// because you can have various branches"; "I mean plaques": a plaque for each person, joined to their
// parents the way a family tree is drawn, a post up to a crossbar and a post up to each parent; each
// generation's crossbar turns a quarter turn from the last, so the branches go off every way)
export const PLAQUE = { width: 40, height: 15, thick: 2.4, rootWidth: 50, rootHeight: 19, gap: 8, row: 34, stem: 12, post: 1.3, base: 3, maxGenerations: 7 };

/** Half the distance between the father and mother of someone in generation `generation` - 1, and which way. */
export function plaqueSplit(generation, generations) {
  const rank = Math.floor((generations - generation) / 2);
  if (generation % 2) return { axis: 0, half: ((PLAQUE.width + PLAQUE.gap) / 2) * 2 ** rank };
  return { axis: 1, half: (PLAQUE.row / 2) * 2 ** rank };
}

/**
 * The plaques: {plaques: [{slot, generation, person, key, x, y, z (the middle), w, h, t}], links: [{slot,
 * key, from, to, r}], base: {r, h}, size: {width, depth, height}}. Fathers go left (−x) or to the front
 * (−y), mothers right or to the back; a link has the colour of the person it holds up (the post above
 * someone is theirs, the crossbar half and post up to a parent the parent's).
 */
export function plaquesLayout(slots, generations) {
  const plaques = [];
  const bySlot = new Map();
  const bottom = [PLAQUE.base + PLAQUE.stem];
  for (let g = 1; g <= generations; g += 1) bottom.push(bottom[g - 1] + (g === 1 ? PLAQUE.rootHeight : PLAQUE.height) + 2 * PLAQUE.stem);
  for (let slot = 1; slot < 2 ** (generations + 1) && slot < slots.length; slot += 1) {
    const person = slots[slot];
    if (!person) continue;
    const generation = generationOfSlot(slot);
    const [w, h] = generation ? [PLAQUE.width, PLAQUE.height] : [PLAQUE.rootWidth, PLAQUE.rootHeight];
    // (from the slot alone, step by step up from the start person: a father a half-split one way, a mother the other)
    const place = [0, 0];
    for (let g = 1; g <= generation; g += 1) {
      const { axis, half } = plaqueSplit(g, generations);
      place[axis] += (slot >> (generation - g)) % 2 ? half : -half;
    }
    const plaque = { slot, generation, person, key: lineKey(slot), x: place[0], y: place[1], z: bottom[generation] + h / 2, w, h, t: PLAQUE.thick };
    plaques.push(plaque);
    bySlot.set(slot, plaque);
  }
  // (the person it starts from stands on a post from the base)
  const links = bySlot.has(1) ? [{ slot: 1, key: "root", from: [0, 0, PLAQUE.base - 0.5], to: [0, 0, bottom[0]], r: PLAQUE.post * 1.4 }] : [];
  plaques
    .filter((plaque) => plaque.generation < generations)
    .forEach((child) => {
      const parents = [bySlot.get(child.slot * 2), bySlot.get(child.slot * 2 + 1)].filter(Boolean);
      if (!parents.length) return;
      const top = child.z + child.h / 2;
      const bar = top + PLAQUE.stem;
      links.push({ slot: child.slot, key: child.key, from: [child.x, child.y, top], to: [child.x, child.y, bar], r: PLAQUE.post });
      parents.forEach((parent) => {
        links.push({ slot: parent.slot, key: parent.key, from: [child.x, child.y, bar], to: [parent.x, parent.y, bar], r: PLAQUE.post });
        links.push({ slot: parent.slot, key: parent.key, from: [parent.x, parent.y, bar], to: [parent.x, parent.y, parent.z - parent.h / 2], r: PLAQUE.post });
      });
    });
  const extent = (axis, size) => plaques.reduce((most, plaque) => Math.max(most, Math.abs(axis ? plaque.y : plaque.x) + size(plaque)), 0);
  const width = 2 * extent(0, (plaque) => plaque.w / 2);
  const depth = 2 * extent(1, (plaque) => plaque.t / 2);
  const height = plaques.reduce((most, plaque) => Math.max(most, plaque.z + plaque.h / 2), 0);
  return {
    plaques,
    links,
    base: { r: Math.max(PLAQUE.rootWidth / 2 + 8, 0.22 * Math.max(width, depth)), h: PLAQUE.base },
    size: { width, depth, height },
  };
}

// ── Meshes ─────────────────────────────────────────────────────────────────
// A mesh is {vertices: [[x, y, z]…], triangles: [[a, b, c]…]}, closed, each triangle anticlockwise seen
// from outside (so its normal points out).

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a) => {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};

export function triangleNormal(a, b, c) {
  return unit(cross(sub(b, a), sub(c, a)));
}

/**
 * A solid of revolution round the axis from `origin` along `axis`: profile is [[radius, height]…] from
 * one end to the other; a point with radius 0 is a single tip (so a profile that starts and ends at 0 is closed).
 */
export function latheMesh(origin, axis, profile, segments) {
  const w = unit(axis);
  const helper = Math.abs(w[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = unit(cross(helper, w));
  const v = cross(w, u);
  const vertices = [];
  const rings = profile.map(([radius, height]) => {
    const centre = [origin[0] + w[0] * height, origin[1] + w[1] * height, origin[2] + w[2] * height];
    if (radius === 0) {
      vertices.push(centre);
      return [vertices.length - 1];
    }
    const ring = [];
    for (let j = 0; j < segments; j += 1) {
      const angle = (2 * Math.PI * j) / segments;
      const [c, s] = [Math.cos(angle) * radius, Math.sin(angle) * radius];
      vertices.push([centre[0] + u[0] * c + v[0] * s, centre[1] + u[1] * c + v[1] * s, centre[2] + u[2] * c + v[2] * s]);
      ring.push(vertices.length - 1);
    }
    return ring;
  });
  const triangles = [];
  for (let i = 0; i + 1 < rings.length; i += 1) {
    const [low, high] = [rings[i], rings[i + 1]];
    for (let j = 0; j < segments; j += 1) {
      const k = (j + 1) % segments;
      const [a, b] = [low[low.length === 1 ? 0 : j], low[low.length === 1 ? 0 : k]];
      const [c, d] = [high[high.length === 1 ? 0 : k], high[high.length === 1 ? 0 : j]];
      if (a !== b) triangles.push([a, b, c]);
      if (c !== d) triangles.push([a, c, d]);
    }
  }
  return { vertices, triangles };
}

/** A ball with a 45° cone under it (a drop), so it prints without supports. */
export function dropMesh(centre, radius, segments = 20, rings = 8) {
  const profile = [[0, -radius * Math.SQRT2]];
  for (let i = 0; i < rings; i += 1) {
    const angle = -Math.PI / 4 + ((3 * Math.PI) / 4) * (i / rings);
    profile.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  profile.push([0, radius]);
  return latheMesh(centre, [0, 0, 1], profile, segments);
}

export function cylinderMesh(from, to, radius, segments = 10) {
  const length = Math.hypot(...sub(to, from));
  return latheMesh(from, sub(to, from), [[0, 0], [radius, 0], [radius, length], [0, length]], segments);
}

export function discMesh(radius, z0, z1, segments = 72) {
  return latheMesh([0, 0, z0], [0, 0, 1], [[0, 0], [radius, 0], [radius, z1 - z0], [0, z1 - z0]], segments);
}

/** One block of the Fan tower: a slice of a ring, from angle a0 to a1, radius r0 to r1, height z0 to z1. */
export function sectorMesh({ a0, a1, r0, r1, z0, z1 }, step = Math.PI / 36) {
  if (r0 <= 0 && a1 - a0 >= 2 * Math.PI - 1e-9) return discMesh(r1, z0, z1, Math.round((2 * Math.PI) / step));
  const pieces = Math.max(1, Math.ceil((a1 - a0) / step));
  const vertices = [];
  const at = [];
  for (let j = 0; j <= pieces; j += 1) {
    const angle = a0 + ((a1 - a0) * j) / pieces;
    const [c, s] = [Math.cos(angle), Math.sin(angle)];
    const base = vertices.length;
    vertices.push([r0 * c, r0 * s, z0], [r1 * c, r1 * s, z0], [r0 * c, r0 * s, z1], [r1 * c, r1 * s, z1]);
    at.push({ ib: base, ob: base + 1, it: base + 2, ot: base + 3 });
  }
  const triangles = [];
  for (let j = 0; j < pieces; j += 1) {
    const [p, q] = [at[j], at[j + 1]];
    triangles.push([p.it, p.ot, q.ot], [p.it, q.ot, q.it]); // top
    triangles.push([p.ib, q.ib, q.ob], [p.ib, q.ob, p.ob]); // bottom
    triangles.push([p.ob, q.ob, q.ot], [p.ob, q.ot, p.ot]); // outside
    triangles.push([p.ib, p.it, q.it], [p.ib, q.it, q.ib]); // inside
  }
  const [first, last] = [at[0], at[pieces]];
  triangles.push([first.ib, first.ot, first.it], [first.ib, first.ob, first.ot]);
  triangles.push([last.ib, last.it, last.ot], [last.ib, last.ot, last.ob]);
  return { vertices, triangles };
}

/** A box from corner [x0, y0, z0] to [x1, y1, z1]. */
export function boxMesh([x0, y0, z0], [x1, y1, z1]) {
  const vertices = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ];
  const triangles = [
    [0, 2, 1], [0, 3, 2], // bottom
    [4, 5, 6], [4, 6, 7], // top
    [0, 1, 5], [0, 5, 4], // front (−y)
    [2, 3, 7], [2, 7, 6], // back
    [1, 2, 6], [1, 6, 5], // right
    [3, 0, 4], [3, 4, 7], // left
  ];
  return { vertices, triangles };
}

export function mergeMeshes(meshes) {
  const merged = { vertices: [], triangles: [] };
  meshes.forEach((mesh) => {
    const offset = merged.vertices.length;
    mesh.vertices.forEach((vertex) => merged.vertices.push(vertex));
    mesh.triangles.forEach(([a, b, c]) => merged.triangles.push([a + offset, b + offset, c + offset]));
  });
  return merged;
}

/** The volume a closed, outward-wound mesh holds (negative if it's wound inside out). */
export function meshVolume(mesh) {
  return mesh.triangles.reduce((total, [a, b, c]) => total + dot(mesh.vertices[a], cross(mesh.vertices[b], mesh.vertices[c])) / 6, 0);
}

/** Whether every edge is in exactly two triangles, once each way (so the mesh is closed and wound one way). */
export function isClosedMesh(mesh) {
  const edges = new Map();
  mesh.triangles.forEach(([a, b, c]) => {
    [
      [a, b],
      [b, c],
      [c, a],
    ].forEach(([from, to]) => edges.set(`${from}>${to}`, (edges.get(`${from}>${to}`) || 0) + 1));
  });
  return [...edges].every(([edge, count]) => {
    const [from, to] = edge.split(">");
    return count === 1 && edges.get(`${to}>${from}`) === 1;
  });
}

// ── Seeing it ──────────────────────────────────────────────────────────────

/** The camera, circling `target`: yaw turns round the upright, pitch looks down from above. */
export function orbitFrame({ yaw, pitch, distance, target }) {
  const back = [Math.cos(pitch) * Math.cos(yaw), Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch)];
  const right = [-Math.sin(yaw), Math.cos(yaw), 0];
  const up = [-Math.sin(pitch) * Math.cos(yaw), -Math.sin(pitch) * Math.sin(yaw), Math.cos(pitch)];
  const eye = [target[0] + back[0] * distance, target[1] + back[1] * distance, target[2] + back[2] * distance];
  return { back, right, up, eye, target, distance };
}

/** Where a point lands on a width × height screen: {x, y, scale (pixels a millimetre there), depth}. */
export function projectPoint(frame, point, width, height, focal = Math.min(width, height) * 1.6) {
  const v = sub(point, frame.target);
  const depth = frame.distance - dot(v, frame.back);
  const scale = depth > 1 ? focal / depth : 0;
  return { x: width / 2 + dot(v, frame.right) * scale, y: height / 2 - dot(v, frame.up) * scale, scale, depth };
}

/** How lit a face is (0.42 in shade to 1 facing the light), lit from over the viewer's left shoulder. */
export function faceLight(frame, normal) {
  const light = unit([
    -0.45 * frame.right[0] + 0.7 * frame.up[0] + 0.55 * frame.back[0],
    -0.45 * frame.right[1] + 0.7 * frame.up[1] + 0.55 * frame.back[1],
    -0.45 * frame.right[2] + 0.7 * frame.up[2] + 0.55 * frame.back[2],
  ]);
  return 0.42 + 0.58 * Math.max(0, dot(normal, light));
}

/** Whether a face points toward the camera. */
export function facesCamera(frame, point, normal) {
  return dot(normal, sub(frame.eye, point)) > 0;
}

/** The Fan tower's triangles for the screen: [{slot, key, points: [a, b, c], normal, centre}], the base's with slot 0. */
export function towerTriangles(layout, step = Math.PI / 24) {
  const triangles = [];
  const add = (mesh, slot, key) =>
    mesh.triangles.forEach(([a, b, c]) => {
      const points = [mesh.vertices[a], mesh.vertices[b], mesh.vertices[c]];
      const centre = [0, 1, 2].map((k) => (points[0][k] + points[1][k] + points[2][k]) / 3);
      triangles.push({ slot, key, points, normal: triangleNormal(...points), centre });
    });
  add(discMesh(layout.base.r, 0, layout.base.h, 96), 0, "root");
  layout.blocks.forEach((block) => add(sectorMesh(block, step), block.slot, block.key));
  return triangles;
}

/** A block's top: its outline as points round it, and its middle, where its name goes. */
export function blockTop(block, step = Math.PI / 24) {
  const pieces = Math.max(2, Math.ceil((block.a1 - block.a0) / step));
  const at = (radius, angle) => [radius * Math.cos(angle), radius * Math.sin(angle), block.z1];
  const outer = [];
  const inner = [];
  for (let j = 0; j <= pieces; j += 1) {
    const angle = block.a0 + ((block.a1 - block.a0) * j) / pieces;
    outer.push(at(block.r1, angle));
    if (block.r0 > 0) inner.unshift(at(block.r0, angle));
  }
  const middle = (block.a0 + block.a1) / 2;
  return { outline: [...outer, ...inner], centre: block.r0 > 0 ? at((block.r0 + block.r1) / 2, middle) : [0, 0, block.z1] };
}

/** How much room a flat shape on screen (points [{x, y}…]) has across and down through the point x, y. */
export function roomAt(points, x, y) {
  const through = (across) => {
    const hits = [];
    points.forEach((p, i) => {
      const q = points[(i + 1) % points.length];
      const [pa, qa, pb, qb, line] = across ? [p.y, q.y, p.x, q.x, y] : [p.x, q.x, p.y, q.y, x];
      if ((pa <= line && qa > line) || (qa <= line && pa > line)) hits.push(pb + ((line - pa) / (qa - pa)) * (qb - pb));
    });
    hits.sort((a, b) => a - b);
    const at = across ? x : y;
    for (let i = 0; i + 1 < hits.length; i += 2) if (hits[i] <= at && at <= hits[i + 1]) return hits[i + 1] - hits[i];
    return 0;
  };
  return { w: through(true), h: through(false) };
}

const YEARS_SIZE = 0.82; // the years' size beside the name's
const LINE_HEIGHT = 1.15;

/**
 * The biggest way a name (and, when it fits, the years under it) goes in `room` ({w, h} in pixels):
 * {font, lines: [{text, size}], width, height}, or null if it can't be read there. measure(text) is the
 * text's width at 100px. The name splits over two lines (first names, then the surname) when that's bigger.
 */
export function fitLabel(name, years, room, measure, { maxFont = 14, minFont = 8.5 } = {}) {
  const cut = name.lastIndexOf(" ");
  const nameLines = [[{ text: name, size: 1 }]];
  if (cut > 0) nameLines.push([{ text: name.slice(0, cut), size: 1 }, { text: name.slice(cut + 1), size: 1 }]);
  const options = [];
  nameLines.forEach((lines) => {
    options.push(lines);
    if (years) options.push([...lines, { text: years, size: YEARS_SIZE }]);
  });
  let best = null;
  options.forEach((lines) => {
    const wide = Math.max(...lines.map((line) => (measure(line.text) * line.size) / 100));
    const tall = lines.reduce((total, line) => total + line.size * LINE_HEIGHT, 0);
    const font = Math.min(maxFont, (room.w - 6) / wide, (room.h - 2) / tall);
    if (!(font >= minFont)) return;
    // (the years are worth a little less room; a name on one line reads better than on two)
    const score = font + (lines.some((line) => line.text === years && line.size < 1) ? 2 : 0) - (lines.filter((line) => line.size === 1).length - 1) * 0.5;
    if (!best || score > best.score) best = { score, font, lines, width: wide * font, height: tall * font };
  });
  if (!best) return null;
  const { font, lines, width, height } = best;
  return { font, lines, width, height };
}

// ── The print ──────────────────────────────────────────────────────────────

/**
 * The model to print, one mesh per colour (only the colours used): {parts: [{colour, name, mesh}], size}.
 * shape "tornado", "tower" or "plaques"; colourOf(slot) gives each person's colour (their grandparent's line unless
 * the view is coloured another way) and nameOf(colour) the part's name; the base is the start person's
 * ivory. leaveOutLiving: living people other than the person it starts from aren't printed (in the
 * Tornado a small joint keeps the struts above them up).
 */
export function printModel(slots, { shape = "tornado", generations = DEFAULT_GENERATIONS, leaveOutLiving = true, colourOf = (slot) => PART_COLOURS[lineKey(slot)], nameOf = partName } = {}) {
  const meshes = new Map([[PART_COLOURS.root, []]]);
  const add = (colour, mesh) => {
    const key = colour.toLowerCase();
    if (!meshes.has(key)) meshes.set(key, []);
    meshes.get(key).push(mesh);
  };
  const leftOut = (item) => leaveOutLiving && item.slot > 1 && treatAsLiving(item.person);
  let size;
  if (shape === "plaques") {
    // (the plaques face the front; names aren't printed, so they are blank to write on)
    const layout = plaquesLayout(slots, generations);
    add(PART_COLOURS.root, discMesh(layout.base.r, 0, layout.base.h));
    layout.plaques.forEach((plaque) => {
      if (leftOut(plaque)) {
        add(colourOf(plaque.slot), dropMesh([plaque.x, plaque.y, plaque.z - plaque.h / 2], PLAQUE.post * 1.6, 14, 6));
        return;
      }
      add(colourOf(plaque.slot), boxMesh([plaque.x - plaque.w / 2, plaque.y - plaque.t / 2, plaque.z - plaque.h / 2], [plaque.x + plaque.w / 2, plaque.y + plaque.t / 2, plaque.z + plaque.h / 2]));
    });
    layout.links.forEach((link) => add(colourOf(link.slot), cylinderMesh(link.from, link.to, link.r, 8)));
    size = layout.size;
  } else if (shape === "tower") {
    const layout = fanTowerLayout(slots, generations);
    add(PART_COLOURS.root, discMesh(layout.base.r, 0, layout.base.h));
    layout.blocks.filter((block) => !leftOut(block)).forEach((block) => add(colourOf(block.slot), sectorMesh(block)));
    size = layout.size;
  } else {
    const layout = tornadoLayout(slots, generations);
    add(PART_COLOURS.root, discMesh(layout.base.r, 0, layout.base.h));
    layout.balls.forEach((ball) => {
      const radius = leftOut(ball) ? tornadoStrutRadius(ball.generation) * 1.3 : ball.r;
      add(colourOf(ball.slot), dropMesh([ball.x, ball.y, ball.z], radius, radius > 3 ? 24 : 14, radius > 3 ? 10 : 6));
    });
    // (a strut, the colour of the person it holds up, stops where its rim meets the child's ball, so two colours hardly overlap)
    const bySlot = new Map(layout.balls.map((ball) => [ball.slot, ball]));
    layout.struts.forEach((strut) => {
      const child = bySlot.get(Math.floor(strut.slot / 2));
      const childRadius = leftOut(child) ? tornadoStrutRadius(child.generation) * 1.3 : child.r;
      const along = unit(sub(strut.to, strut.from));
      const skip = Math.sqrt(Math.max(0, childRadius * childRadius - strut.r * strut.r));
      const from = [strut.from[0] + along[0] * skip, strut.from[1] + along[1] * skip, strut.from[2] + along[2] * skip];
      add(colourOf(strut.slot), cylinderMesh(from, strut.to, strut.r));
    });
    size = layout.size;
  }
  const parts = [...meshes].filter(([, list]) => list.length).map(([colour, list]) => ({ colour, name: nameOf(colour), mesh: mergeMeshes(list) }));
  return { parts, size };
}

/** A print colour's name: the line it is, or "Base and start person". */
function partName(colour) {
  return PRINT_PARTS.find((part) => part.colour === colour.toLowerCase())?.name || colour;
}

// ── Files ──────────────────────────────────────────────────────────────────

/** A binary STL of all the parts (one colour). */
export function stlFile(parts, title = "") {
  const count = parts.reduce((total, part) => total + part.mesh.triangles.length, 0);
  const buffer = new ArrayBuffer(84 + count * 50);
  const view = new DataView(buffer);
  // (plain ASCII, and never starting with "solid", which tells some programs the file is text)
  const header = `WikiTree ${String(title).replace(/[^\x20-\x7e]/g, "?")}`.slice(0, 80);
  for (let i = 0; i < header.length; i += 1) view.setUint8(i, header.charCodeAt(i));
  view.setUint32(80, count, true);
  let at = 84;
  const put = (values) =>
    values.forEach((value) => {
      view.setFloat32(at, value, true);
      at += 4;
    });
  parts.forEach(({ mesh }) => {
    mesh.triangles.forEach(([a, b, c]) => {
      const [p, q, r] = [mesh.vertices[a], mesh.vertices[b], mesh.vertices[c]];
      put(triangleNormal(p, q, r));
      put(p);
      put(q);
      put(r);
      view.setUint16(at, 0, true);
      at += 2;
    });
  });
  return buffer;
}

const number = (value) => String(Math.round(value * 1000) / 1000);
const xmlText = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The files of a 3MF package, by path: one mesh object per colour, each with its colour, gathered as the
 * parts of a single object so a slicer loads it as one model and can give each part its own filament.
 */
export function threeMfFiles(parts, title = "") {
  const materials = parts.map((part) => `<base name="${xmlText(part.name)}" displaycolor="${part.colour.toUpperCase()}FF"/>`).join("");
  const objects = parts
    .map((part, index) => {
      const vertices = part.mesh.vertices.map(([x, y, z]) => `<vertex x="${number(x)}" y="${number(y)}" z="${number(z)}"/>`).join("");
      const triangles = part.mesh.triangles.map(([a, b, c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`).join("");
      return `<object id="${index + 2}" type="model" name="${xmlText(part.name)}" pid="1" pindex="${index}"><mesh><vertices>${vertices}</vertices><triangles>${triangles}</triangles></mesh></object>`;
    })
    .join("");
  const whole = parts.length + 2;
  const components = parts.map((part, index) => `<component objectid="${index + 2}"/>`).join("");
  const model =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">` +
    `<metadata name="Title">${xmlText(title)}</metadata><metadata name="Application">WikiTree Browser Extension</metadata>` +
    `<resources><basematerials id="1">${materials}</basematerials>${objects}` +
    `<object id="${whole}" type="model" name="${xmlText(title)}"><components>${components}</components></object></resources>` +
    `<build><item objectid="${whole}"/></build></model>`;
  return {
    "[Content_Types].xml":
      `<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`,
    "_rels/.rels":
      `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`,
    "3D/3dmodel.model": model,
  };
}
