// The Family Explorer's "3D" view (see chat_print3d_data.js for the shapes): the person's ancestors as
// Plaques (a plaque with each person's name, years and birthplace, joined like a family tree, each
// generation's branches a quarter turn from the last), a Tornado (balls on struts, twisting up a generation
// a level) or a Fan tower (the fan chart as a stepped relief), or CC plaques (everyone within a few steps,
// on pages fanned round the person: chat_family_plaques_data.js), turning slowly on a turntable, with
// "Download for 3D printing". One canvas, drawn in 3D by hand (no 3D library).

import JSZip from "jszip";
import { color as d3color } from "d3-color";
import {
  DEFAULT_GENERATIONS,
  MAX_GENERATIONS,
  MIN_GENERATIONS,
  PART_COLOURS,
  PLAQUE,
  PRINT_PARTS,
  ancestorSlots,
  ancestorsLoaded,
  blockTop,
  discMesh,
  faceLight,
  facesCamera,
  fanTowerLayout,
  fitLabel,
  lineKey,
  orbitFrame,
  plaquesLayout,
  printModel,
  projectPoint,
  roomAt,
  stlFile,
  threeMfFiles,
  tornadoLayout,
  towerTriangles,
  triangleNormal,
} from "./chat_print3d_data";
import { generationOfSlot } from "./chat_fan_chart_data";
import { buildColouring } from "./chat_fan_chart";
import { ancestorWord } from "./chat_kin_labels";
import { bindCardPhoto, cardHeadHtml, familyFactsHtml, familyFetcher, showMoreInCard } from "./chat_family_card";
import { GALAXY_HUES, branchLabel } from "./chat_family_galaxy_data";
import { NEARBY, nearbyPlaquesLayout, plaqueNeighbour } from "./chat_family_plaques_data";
import { easeCubicInOut as ease } from "d3-ease";
import { addStyleOnce, downloadBlob, escapeText, fullName, lifeYears, onChartResume, photoUrl, siteUrl } from "./chat_chart_common";
import { reducedMotion } from "./chat_fractal_common";

const STYLE_ID = "wbe-3d-style";
const SHAPE_KEY = "wbe-explorer-3d-look"; // (was -shape, before Plaques, the shape it now opens on)
const SHAPES = ["plaques", "nearby", "tornado", "tower"];
// (Shift, Alt or Ctrl+drag moves it, Riël's idea; the arrow keys go round the family, like the Family view's: the user, 2026-10-15)
const HINTS = {
  ancestors: "Drag to turn · Shift+drag to move · scroll to zoom · click someone or use the arrow keys to see who they are",
  nearby: "Drag to turn · Shift+drag to move · scroll to zoom · click someone or use the arrow keys to go to them",
};
const SHAPE_NAMES = { plaques: "Plaques", nearby: "CC plaques", tornado: "Tornado", tower: "Fan tower" };
const GENERATIONS_KEY = "wbe-explorer-3d-generations";
const STEPS_KEY = "wbe-explorer-3d-steps";
const COLOUR_KEY = "wbe-explorer-3d-colour";
const TURN_SPEED = 0.12; // radians a second
const LABELS_MAX = 160;
const PRINTER_COLOURS = 5; // filaments most multi-colour printers take (Bambu AMS lite 4, Prusa MMU3 5)
// The fan chart's colourings (user, 2026-10-12: "the Fan Chart has all sorts of different highlighting
// options"), less those that need more fetched (completeness, DNA); the grandparents' lines first, the
// one that prints in five colours.
const COLOUR_MODES = [
  { key: "lines", label: "Grandparents' lines" },
  { key: "country", label: "Birth country" },
  { key: "century", label: "Birth year" },
  { key: "surname", label: "Surnames" },
  { key: "brickwalls", label: "Brick walls" },
  { key: "gender", label: "Fathers and mothers" },
  { key: "repeats", label: "Repeats" },
  { key: "xdna", label: "X-DNA" },
];
// CC plaques: everyone isn't an ancestor, so only the colourings that don't need the fan chart's numbering.
const NEARBY_MODES = [
  { key: "lines", label: "Branches" },
  { key: "country", label: "Birth country" },
  { key: "century", label: "Birth year" },
  { key: "surname", label: "Surnames" },
  { key: "gender", label: "Men and women" },
];
// (other: a gender marked not to show, green as on WikiTree: chat_gender_display.js)
const GENDER_COLOURS = { male: "#7fa7d9", female: "#e59ab8", other: "#8cc79a", unknown: "#c4c8ce" };
const FOCUS_RING = "#f0b400";
const BAR_COLOUR = [154, 143, 122]; // a family's bars and chords, which are no one person's

const CSS = `
  .wbe-3d { position: absolute; inset: 0; overflow: hidden; outline: none; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #2b2f36; background: #efebe3; }
  .wbe-3d canvas.wbe-3d-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: grab; }
  .wbe-3d canvas.wbe-3d-canvas:active { cursor: grabbing; }
  .wbe-3d-bar { position: absolute; top: 10px; left: 12px; right: 12px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; z-index: 2; pointer-events: none; }
  .wbe-3d-bar > * { pointer-events: auto; }
  .wbe-3d-seg[hidden] { display: none; }
  .wbe-3d-seg { display: inline-flex; align-items: center; border: 1px solid #cdc3ab; border-radius: 999px; overflow: hidden; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .wbe-3d button:not(#none) { border: 0; margin: 0; background: transparent; padding: 4px 12px; font: 600 12.5px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #4a4030 !important; cursor: pointer; line-height: 1.4; }
  .wbe-3d .wbe-3d-seg button + button:not(#none) { border-left: 1px solid #e6dbbd; }
  .wbe-3d .wbe-3d-seg button:not(#none):hover { background: #fff6dc; }
  .wbe-3d .wbe-3d-seg button[aria-pressed="true"]:not(#none) { background: #3c4a5c; color: #fff !important; }
  .wbe-3d .wbe-3d-seg button:disabled { opacity: .4; cursor: default; }
  .wbe-3d-colour { padding: 0 4px 0 12px; font-size: 12.5px; color: #4a4030; gap: 4px; }
  .wbe-3d-colour select:not(#none) { border: 0; background: transparent; font: 600 12.5px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #4a4030 !important; padding: 4px 2px; cursor: pointer; }
  .wbe-3d-gens { padding: 0 6px; font-size: 12.5px; white-space: nowrap; color: #4a4030; }
  .wbe-3d-menu { position: absolute; top: 46px; left: 12px; width: 300px; max-width: calc(100% - 24px); padding: 12px 14px; border-radius: 12px; background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,.18); z-index: 3; font-size: 13px; }
  .wbe-3d-menu[hidden] { display: none; }
  .wbe-3d-menu strong { display: block; margin-bottom: 6px; font-size: 14px; }
  .wbe-3d-menu label { display: flex; gap: 6px; align-items: center; margin: 6px 0 10px; cursor: pointer; }
  .wbe-3d-menu .wbe-3d-get { display: flex; flex-direction: column; gap: 6px; }
  .wbe-3d .wbe-3d-menu .wbe-3d-get button:not(#none) { text-align: left; border: 1px solid #cdc3ab; border-radius: 10px; padding: 6px 10px; background: #fbf8f1; }
  .wbe-3d .wbe-3d-menu .wbe-3d-get button:not(#none):hover { background: #fff3d1; }
  .wbe-3d-menu .wbe-3d-get small { display: block; font-weight: 400; color: #6b6458; }
  .wbe-3d-menu p { margin: 10px 0 0; color: #6b6458; font-size: 12px; line-height: 1.4; }
  .wbe-3d-menu p.wbe-3d-colours:empty { display: none; }
  .wbe-3d-key { position: absolute; left: 12px; bottom: 12px; display: flex; flex-direction: column; gap: 3px; padding: 7px 10px; border-radius: 10px; background: rgba(255,255,255,.82); font-size: 12px; pointer-events: none; max-width: 42%; }
  .wbe-3d-key b { font-size: 12.5px; margin-bottom: 2px; }
  .wbe-3d-key span { display: flex; gap: 6px; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .wbe-3d-key i { flex: none; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(0,0,0,.15); }
  .wbe-3d-key small { color: #6b6458; margin-top: 2px; }
  .wbe-3d-hint { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); width: max-content; max-width: calc(100% - 24px); box-sizing: border-box; padding: 4px 14px; border-radius: 999px; background: rgba(255,255,255,.75); color: #5a5246; font-size: 12px; text-align: center; pointer-events: none; }
  .wbe-3d-status { position: absolute; top: 50px; left: 50%; transform: translateX(-50%); padding: 5px 14px; border-radius: 999px; background: rgba(60,74,92,.9); color: #fff; font-size: 12.5px; z-index: 2; }
  .wbe-3d-status[hidden], .wbe-3d-tip[hidden], .wbe-3d-card[hidden] { display: none; }
  .wbe-3d-tip { position: absolute; pointer-events: none; padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,.95); border: 1px solid #d8cfb8; box-shadow: 0 3px 10px rgba(0,0,0,.12); font-size: 12.5px; white-space: nowrap; transform: translate(14px, -50%); z-index: 2; }
  .wbe-3d-tip small { color: #6b6458; }
  .wbe-3d-card { position: absolute; right: 14px; bottom: 44px; width: 320px; max-width: calc(100% - 28px); max-height: calc(100% - 100px); overflow-y: auto; box-sizing: border-box; padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,.97); border: 1px solid #ddd3bb; box-shadow: 0 10px 30px rgba(0,0,0,.15); z-index: 2; }
  .wbe-3d-head { display: flex; gap: 12px; padding-right: 18px; }
  .wbe-3d-id { font-size: 11.5px; color: #8a8273; margin-top: 1px; }
  .wbe-3d-facts { margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee5cf; font-size: 12.5px; line-height: 1.4; color: #2b2f36; }
  .wbe-3d-facts > div { margin: 0 0 5px; }
  .wbe-3d .wbe-3d-facts b:not(#none) { font-weight: 650; color: #8a6a12 !important; margin-right: 4px; }
  .wbe-3d-facts small { color: #6b6458; font-size: 11.5px; }
  .wbe-3d-facts .wbe-3d-kids { margin: -2px 0 6px 12px; }
  .wbe-3d-facts .wbe-3d-loading { color: #6b6458; font-style: italic; }
  .wbe-3d-photo { flex: none; width: 64px; height: 64px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; background: #e8e0cc; font-weight: 600; font-size: 22px; color: #5a5246; }
  .wbe-3d-photo img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 20%; }
  .wbe-3d-rel { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #8a6a12; }
  .wbe-3d a.wbe-3d-name:not(#none), .wbe-3d a.wbe-3d-name:not(#none):visited { display: block; font-size: 16px; font-weight: 650; color: #1f2a3a !important; text-decoration: none; line-height: 1.2; }
  .wbe-3d a.wbe-3d-name:not(#none):hover { text-decoration: underline; }
  .wbe-3d-life { font-size: 12.5px; color: #4a4f58; margin-top: 2px; }
  .wbe-3d-place { font-size: 12px; color: #6b6458; margin-top: 2px; }
  .wbe-3d .wbe-3d-card button:not(#none) { margin-top: 8px; border: 1px solid #b88a00; color: #8a6a12 !important; border-radius: 999px; padding: 3px 12px; }
  .wbe-3d .wbe-3d-card button:not(#none):hover { background: #fff3d1; }
  .wbe-3d .wbe-3d-card button.wbe-3d-who:not(#none), .wbe-3d .wbe-3d-card a.wbe-3d-who:not(#none), .wbe-3d .wbe-3d-card a.wbe-3d-who:not(#none):visited { margin: 0; padding: 0; border: 0; border-radius: 0; background: none; font: inherit; font-weight: 600; color: #1f4f8a !important; text-decoration: none; cursor: pointer; }
  .wbe-3d .wbe-3d-card button.wbe-3d-who:not(#none) { text-decoration: underline dotted; text-underline-offset: 2px; }
  .wbe-3d .wbe-3d-card .wbe-3d-who:not(#none):hover { text-decoration: underline; background: none; }
  .wbe-3d .wbe-3d-card button.wbe-3d-close:not(#none) { position: absolute; top: 6px; right: 6px; margin: 0; padding: 0 7px; border: 0; border-radius: 999px; font-size: 17px; line-height: 1.3; color: #8a8273 !important; background: none; }
`;

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t);
const css = ([r, g, b]) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
const remembered = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (error) {
    return fallback;
  }
};
const remember = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch (error) {
    // (storage blocked: the default next time)
  }
};

/** A shiny ball in `colour`, drawn once and stamped for each ancestor. */
function ballSprite(colour) {
  const size = 128;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = size;
  const g = sprite.getContext("2d");
  const base = rgb(colour);
  const gradient = g.createRadialGradient(size * 0.36, size * 0.32, size * 0.02, size * 0.5, size * 0.5, size * 0.5);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.14, css(mix(base, [255, 255, 255], 0.35)));
  gradient.addColorStop(0.55, colour);
  gradient.addColorStop(1, css(mix(base, [0, 0, 0], 0.55)));
  g.fillStyle = gradient;
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  g.fill();
  return sprite;
}

/** "Great-grandmother · father's side" for slot `slot`. */
function relationOf(slot, person) {
  const generation = generationOfSlot(slot);
  if (!generation) return "";
  const word = ancestorWord(generation, person?.gender);
  if (generation === 1) return word;
  return `${word} · ${slot >> (generation - 1) === 2 ? "father's" : "mother's"} side`;
}

/**
 * Mounts the view in `host`. options: {world, load(id), loadAncestors(id, generations) → Promise,
 * loadNearby(id, steps) → Promise (everyone within `steps`; 1 for a card's family), startId,
 * onCentre(person), shape}. Returns {centre(id), up(), home(), resize(), destroy(), currentId(), canvas}.
 */
export function mountFamily3d(host, options) {
  addStyleOnce(STYLE_ID, CSS);
  const world = options.world;
  const people = world.people;
  const root = document.createElement("div");
  root.className = "wbe-3d";
  root.tabIndex = 0;
  root.innerHTML = `
    <canvas class="wbe-3d-canvas" aria-label="The ancestors as a 3D model"></canvas>
    <div class="wbe-3d-bar">
      <span class="wbe-3d-seg" role="group" aria-label="Shape">
        <button type="button" data-shape="plaques" title="A plaque for each ancestor, joined like a family tree, the branches going off every way">Ancestor plaques</button>
        <button type="button" data-shape="nearby" title="A plaque for everyone within a few steps (a parent, child, sibling, husband or wife is a step), joined like a family tree, each branch on a page of its own">CC plaques</button>
        <button type="button" data-shape="tornado" title="Ancestors as balls on struts, twisting up a generation a level">Tornado</button>
        <button type="button" data-shape="tower" title="The fan chart as a stepped tower: the person in the middle, each generation a step lower and further out">Fan tower</button>
      </span>
      <span class="wbe-3d-seg" role="group" aria-label="Generations">
        <button type="button" data-gens="-1" title="Fewer generations">−</button>
        <span class="wbe-3d-gens"></span>
        <button type="button" data-gens="1" title="More generations">+</button>
      </span>
      <label class="wbe-3d-seg wbe-3d-colour">Colour <select aria-label="Colour by">${COLOUR_MODES.map((mode) => `<option value="${mode.key}">${mode.label}</option>`).join("")}</select></label>
      <span class="wbe-3d-seg wbe-3d-turn"><button type="button" data-act3d="turn" aria-pressed="true" title="Turn the model slowly. It stops as soon as you click, drag or scroll it">Turn</button></span>
      <span class="wbe-3d-seg wbe-3d-print"><button type="button" data-act3d="menu" aria-expanded="false">Download for 3D printing ▾</button></span>
    </div>
    <div class="wbe-3d-menu" hidden>
      <strong>Download for 3D printing</strong>
      <label><input type="checkbox" class="wbe-3d-living" checked> Leave out living people</label>
      <div class="wbe-3d-get">
        <button type="button" data-format="3mf">3MF, in colour<small>In the colours showing, a part for each, to give each its own filament</small></button>
        <button type="button" data-format="stl">STL, one colour<small>For any slicer or printer</small></button>
      </div>
      <p class="wbe-3d-colours"></p>
      <p class="wbe-3d-size"></p>
    </div>
    <div class="wbe-3d-status" hidden></div>
    <div class="wbe-3d-key"></div>
    <div class="wbe-3d-tip" hidden></div>
    <div class="wbe-3d-card" hidden></div>
    <div class="wbe-3d-hint">${HINTS.ancestors}</div>`;
  host.appendChild(root);
  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const $ = (selector) => root.querySelector(selector);
  const [keyEl, statusEl, tipEl, cardEl, menuEl] = [".wbe-3d-key", ".wbe-3d-status", ".wbe-3d-tip", ".wbe-3d-card", ".wbe-3d-menu"].map($);
  const sprites = new Map(); // colour → a ball in it
  const spriteFor = (colour) => {
    if (!sprites.has(colour)) sprites.set(colour, ballSprite(colour));
    return sprites.get(colour);
  };
  const motion = !reducedMotion();

  let width = 0;
  let height = 0;
  let ratio = 1;
  let shape = options.shape || remembered(SHAPE_KEY, "plaques");
  if (!SHAPES.includes(shape)) shape = "plaques";
  // (each shape remembers its own; Plaques open on 4, 31 plaques big enough to read, and stop at 7)
  const mostGenerations = () => (shape === "plaques" ? PLAQUE.maxGenerations : MAX_GENERATIONS);
  const generationsFor = () => {
    const fallback = shape === "plaques" ? 4 : DEFAULT_GENERATIONS;
    return Math.max(MIN_GENERATIONS, Math.min(mostGenerations(), Number(remembered(`${GENERATIONS_KEY}-${shape}`, fallback)) || fallback));
  };
  let generations = generationsFor();
  // (CC plaques: how many steps out, as getPeople's nuclear counts them)
  let steps = Math.max(NEARBY.minSteps, Math.min(NEARBY.maxSteps, Number(remembered(STEPS_KEY, NEARBY.defaultSteps)) || NEARBY.defaultSteps));
  let current = 0;
  let slots = [];
  let tornado = null;
  let tower = null;
  let plaques = null;
  let nearby = null; // the CC plaques, each plaque and post with its slot (its place in nearby.order)
  const photos = new Map(); // photo URL → {image, ready}
  let towerTris = [];
  let baseTris = [];
  let tops = new Map(); // slot → the outline of their block's top and its middle (the Fan tower's names)
  let mode = remembered(COLOUR_KEY, "lines");
  if (!COLOUR_MODES.some((entry) => entry.key === mode)) mode = "lines";
  const modesFor = () => (shape === "nearby" ? NEARBY_MODES : COLOUR_MODES);
  // (one remembered for all; a shape without it shows its first)
  const shownMode = () => (modesFor().some((entry) => entry.key === mode) ? mode : "lines");
  let colours = new Map(); // slot → "#rrggbb"
  let shades = new Map(); // slot → [r, g, b]
  let legend = [];
  const IVORY = PART_COLOURS.root;
  const widths = new Map(); // text → its width at 100px, for fitting names
  let selected = 0; // a slot
  let cameFrom = 0; // the slot ↑ left, for ↓ to go back to
  let hovered = 0;
  let frame = 0;
  let destroyed = false;
  let loadToken = 0;
  let lastTime = 0;
  // (it turns slowly until someone clicks, drags or scrolls it, then stays still until Turn is pressed: the user,
  // 2026-10-13, "it soon starts moving again")
  let turning = motion;
  let placed = []; // what was drawn, for hovering and clicking
  const fetched = new Set();
  // (the card fetches someone's family when it isn't all here, and shows it when it comes)
  const family = familyFetcher(world, options.loadNearby && ((id) => options.loadNearby(id, 1)), (id) => !destroyed && slots[selected]?.id === id && renderCard());
  let slotOfId = new Map(); // Id → their (first) slot, for the card's names
  const camera = { yaw: -2.2, pitch: 0.3, zoom: 1, distance: 300, target: [0, 0, 50], fit: null, close: false };

  function measure() {
    const rect = root.getBoundingClientRect();
    width = Math.max(rect.width, 50);
    height = Math.max(rect.height, 50);
    ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }

  function setStatus(text) {
    statusEl.hidden = !text;
    statusEl.textContent = text || "";
  }

  function size() {
    return { plaques, nearby, tornado, tower }[shape]?.size || { width: 100, height: 100 };
  }

  /** Moves the camera to take in the whole model. */
  function fitCamera(instant = false) {
    const { width: across, depth = across, height: tall, middle = [0, 0] } = size();
    camera.close = false;
    // (CC plaques fan out one way from the person: it turns round their middle, kept in view whichever way it faces)
    const widest = shape === "nearby" ? Math.hypot(across, depth) * 0.8 : across;
    const to = {
      distance: Math.max(widest, tall) * { plaques: 2.05, nearby: 2.05, tower: 2.1, tornado: 2.25 }[shape],
      target: [...middle, tall * { plaques: 0.56, nearby: 0.5, tower: 0.25, tornado: 0.47 }[shape]],
      pitch: { plaques: 0.38, nearby: 0.45, tower: 0.62, tornado: 0.3 }[shape],
      zoom: 1,
    };
    glideTo(to, instant);
  }

  /** Moves the camera to `to` ({distance, target, pitch, zoom}), smoothly unless `instant`. */
  function glideTo(to, instant = false) {
    if (instant || !motion) {
      Object.assign(camera, { distance: to.distance, target: to.target, pitch: to.pitch, zoom: to.zoom ?? camera.zoom, fit: null });
      return;
    }
    camera.fit = { from: { distance: camera.distance, target: [...camera.target], pitch: camera.pitch, zoom: camera.zoom }, to, start: performance.now() };
  }

  function rebuild() {
    cameFrom = 0;
    if (shape === "nearby") {
      // (everyone numbered like slots, the person 1 and the rest nearest first, so picking and colouring work the same)
      const layout = nearbyPlaquesLayout(people, current, steps);
      const slotOf = new Map(layout.order.map((person, slot) => [person?.id, slot]));
      nearby = {
        ...layout,
        plaques: layout.plaques.map((plaque) => ({ ...plaque, slot: slotOf.get(plaque.id) })),
        links: layout.links.map((link) => ({ ...link, slot: (link.id && slotOf.get(link.id)) || 0 })),
      };
      slots = layout.order;
    } else {
      slots = ancestorSlots(people, current, generations);
      tornado = tornadoLayout(slots, generations);
      tower = fanTowerLayout(slots, generations);
      plaques = plaquesLayout(slots, generations);
    }
    slotOfId = new Map();
    slots.forEach((person, slot) => person && !slotOfId.has(person.id) && slotOfId.set(person.id, slot));
    towerTris = [];
    baseTris = [];
    tops = new Map();
    if (shape === "tower") {
      // (the base is the floor: drawn first, under everything, or its long thin triangles cut into the walls)
      towerTriangles(tower).forEach((triangle) => (triangle.slot ? towerTris : baseTris).push(triangle));
      tower.blocks.forEach((block) => tops.set(block.slot, blockTop(block)));
    } else {
      const base = discMesh({ plaques, nearby, tornado }[shape].base.r, 0, PLAQUE.base, 72);
      base.triangles.forEach(([a, b, c]) => {
        const points = [base.vertices[a], base.vertices[b], base.vertices[c]];
        baseTris.push({ slot: 0, key: "root", points, normal: triangleNormal(...points), centre: [0, 1, 2].map((k) => (points[0][k] + points[1][k] + points[2][k]) / 3) });
      });
    }
    colourAll();
    drawBar();
    drawKey();
  }

  /** Everyone's colour in the colouring chosen; the person it starts from is always ivory. */
  function colourAll() {
    let colourOf;
    const mode = shownMode();
    if (shape === "nearby" && mode === "lines") {
      // (each branch off the person in its own colour, as in the Galaxy: their father's side, each child, …)
      const branchOf = new Map(nearby.plaques.map((plaque) => [plaque.slot, plaque.branch]));
      colourOf = (slot) => (branchOf.get(slot) >= 0 ? GALAXY_HUES[branchOf.get(slot) % GALAXY_HUES.length] : IVORY);
      legend = nearby.branches.map((branch) => ({ colour: GALAXY_HUES[branch.index % GALAXY_HUES.length], label: branchLabel(branch, slots[1]) }));
    } else if (shape === "nearby" && mode === "gender") {
      const kind = (person) => (/^m/i.test(person.gender) ? "male" : /^f/i.test(person.gender) ? "female" : person.sex ? "other" : "unknown");
      colourOf = (slot) => GENDER_COLOURS[kind(slots[slot])];
      const counts = slots.reduce((all, person, slot) => (person && slot > 1 ? { ...all, [kind(person)]: (all[kind(person)] || 0) + 1 } : all), {});
      legend = [
        { colour: GENDER_COLOURS.male, label: `Men (${counts.male || 0})` },
        { colour: GENDER_COLOURS.female, label: `Women (${counts.female || 0})` },
        ...(counts.other ? [{ colour: GENDER_COLOURS.other, label: `Gender not shown (${counts.other})` }] : []),
        ...(counts.unknown ? [{ colour: GENDER_COLOURS.unknown, label: `Not known (${counts.unknown})` }] : []),
      ];
    } else if (mode === "lines") {
      colourOf = (slot) => PART_COLOURS[lineKey(slot)];
      legend = PRINT_PARTS.filter((part) => part.key !== "root")
        .filter((part) => slots[Number(part.key.slice(4))] || (part.key === "line4" && slots[2]) || (part.key === "line6" && slots[3]))
        .map((part) => {
          const grandparent = slots[Number(part.key.slice(4))];
          return { colour: part.colour, label: grandparent ? `${fullName(grandparent)}'s line` : part.name };
        });
    } else {
      const colouring = buildColouring(slots, mode, generations);
      const hex = (value) => d3color(value)?.formatHex() || "#9c9c9c";
      colourOf = (slot) => hex(colouring.fill(slots[slot], slot));
      legend = colouring.legend.map((item) => ({ colour: hex(item.colour), label: item.label }));
    }
    colours = new Map();
    slots.forEach((person, slot) => {
      if (person && slot >= 1) colours.set(slot, slot === 1 ? IVORY : colourOf(slot));
    });
    shades = new Map([...colours].map(([slot, colour]) => [slot, rgb(colour)]));
  }

  function drawBar() {
    root.querySelectorAll("[data-shape]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.shape === shape)));
    const near = shape === "nearby";
    $(".wbe-3d-gens").textContent = near ? `${steps} step${steps === 1 ? "" : "s"} (CC${steps})` : `${generations} generations`;
    $('[data-gens="-1"]').disabled = near ? steps <= NEARBY.minSteps : generations <= MIN_GENERATIONS;
    $('[data-gens="1"]').disabled = near ? steps >= NEARBY.maxSteps : generations >= mostGenerations();
    $('[data-gens="-1"]').title = near ? "Fewer steps" : "Fewer generations";
    $('[data-gens="1"]').title = near ? "More steps (a parent, child, sibling, husband or wife is a step)" : "More generations";
    const select = $(".wbe-3d-colour select");
    if (select.dataset.shape !== (near ? "nearby" : "")) {
      select.innerHTML = modesFor()
        .map((entry) => `<option value="${entry.key}">${entry.label}</option>`)
        .join("");
      select.dataset.shape = near ? "nearby" : "";
    }
    select.value = shownMode();
    // (CC plaques aren't made to print yet)
    $(".wbe-3d-print").hidden = near;
    if (near) menuEl.hidden = true;
    $(".wbe-3d-hint").textContent = near ? HINTS.nearby : HINTS.ancestors;
    if (near) return;
    const used = new Set([IVORY, ...colours.values()]).size;
    $(".wbe-3d-colours").textContent =
      used > PRINTER_COLOURS ? `These colours need ${used} filaments; most colour printers take ${PRINTER_COLOURS} or fewer. "Grandparents' lines" prints in ${PRINTER_COLOURS}.` : "";
    const { width: across, depth = across, height: tall } = size();
    $(".wbe-3d-size").textContent =
      `About ${Math.round(across)} × ${Math.round(depth)} mm across and ${Math.round(tall)} mm high. ` +
      {
        plaques: "The plaques face the front and are left blank, to write or stick names on; the crossbars need supports (let your slicer add tree supports).",
        tower: "Nothing overhangs, so it prints without supports.",
        tornado: "No strut leans more than 45°, so it prints without supports.",
      }[shape] +
      " Scale it in your slicer to suit your printer.";
  }

  function drawKey() {
    const person = people.get(current);
    if (shape === "nearby") {
      keyEl.innerHTML = `<b>Everyone within ${steps} step${steps === 1 ? "" : "s"} of ${escapeText(fullName(person || {}))}</b>`;
      legend.slice(0, 12).forEach((item) => {
        const span = document.createElement("span");
        span.innerHTML = `<i style="background:${item.colour}"></i>`;
        span.appendChild(document.createTextNode(item.label));
        keyEl.appendChild(span);
      });
      const note = document.createElement("small");
      const count = Math.max(0, nearby.plaques.length - 1);
      // (someone reached only through a brother or sister whose parents aren't here has nothing to hang from)
      note.textContent = `${count.toLocaleString()} ${count === 1 ? "person" : "people"}${legend.length > 12 ? ` · ${legend.length - 12} more branches` : ""}${nearby.loose ? ` · ${nearby.loose} left out, joined only by a sibling whose parents aren't here` : ""}`;
      keyEl.appendChild(note);
      return;
    }
    const found = slots.filter((entry, slot) => slot > 1 && entry).length;
    const possible = 2 ** (generations + 1) - 2;
    keyEl.innerHTML = `<b>Ancestors of ${escapeText(fullName(person || {}))}</b>`;
    const swatch = (colour, text) => {
      const span = document.createElement("span");
      span.innerHTML = `<i style="background:${colour}"></i>`;
      span.appendChild(document.createTextNode(text));
      keyEl.appendChild(span);
    };
    legend.slice(0, 12).forEach((item) => swatch(item.colour, item.label));
    const note = document.createElement("small");
    note.textContent = `${found} of ${possible} ancestors found in ${generations} generations`;
    keyEl.appendChild(note);
  }

  /** "Great-grandmother · father's side", or for CC plaques "first cousin". */
  function relationFor(slot, person) {
    if (shape === "nearby") {
      if (slot === 1) return "";
      const words = nearby.relation(person.id);
      return words ? words[0].toUpperCase() + words.slice(1) : "";
    }
    return slot === 1 ? "" : relationOf(slot, person);
  }

  /** Shows slot's card (user, 2026-10-12: "Can you add much more information in these cards?"), fetching their family if it isn't all here. */
  function showCard(slot) {
    selected = slot;
    renderCard();
    family.ensure(slots[slot]);
    // (the Explorer's biological-parents switch follows who is picked: Patty Luker in Terry's view, the user, 2026-10-13)
    options.onSelect?.();
  }

  function renderCard() {
    const person = slots[selected];
    if (!person) {
      cardEl.hidden = true;
      return;
    }
    const relation = relationFor(selected, person);
    const facts = familyFactsHtml(people, person.id, { prefix: "wbe-3d", pickOf: (other) => slotOfId.get(other.id) || "", pickTitle: "Show them on the model", loading: family.loading(person.id) });
    cardEl.innerHTML = `
      <button type="button" class="wbe-3d-close" data-act3d="close" title="Close" aria-label="Close">×</button>
      ${cardHeadHtml(person, {
        prefix: "wbe-3d",
        relation,
        action: selected === 1 || person.hidden ? "" : `<button type="button" data-start="${person.id}">${shape === "nearby" ? "Start from them" : "Show their ancestors"}</button>`,
      })}
      ${facts}`;
    bindCardPhoto(cardEl, person);
    cardEl.hidden = false;
  }

  /** Builds the model from `id` (up, or all round for CC plaques), fetching who isn't loaded yet. */
  async function centre(id) {
    const person = people.get(id);
    if (!person || person.hidden || destroyed) return;
    current = id;
    rebuild();
    fitCamera();
    showCard(1);
    options.onCentre?.(person);
    const near = shape === "nearby";
    // (CC plaques: fetched round them at least this many steps out already)
    const wanted = near ? `near|${id}|${steps}` : `${id}|${generations}`;
    const done = near ? [...fetched].some((key) => key.startsWith(`near|${id}|`) && Number(key.split("|")[2]) >= steps) : fetched.has(wanted) || ancestorsLoaded(people, slots);
    const load = near ? options.loadNearby : options.loadAncestors;
    if (!load || done) {
      setStatus("");
      return;
    }
    const token = ++loadToken;
    setStatus(near ? `Finding everyone within ${steps} step${steps === 1 ? "" : "s"} of ${fullName(person)}…${steps >= 4 ? " (this can take a minute)" : ""}` : `Finding ${fullName(person)}'s ancestors…`);
    try {
      await load(id, near ? steps : generations);
      fetched.add(wanted);
    } catch (error) {
      if (token === loadToken) setStatus(`WikiTree didn't answer. Change the ${near ? "steps" : "generations"} to try again.`);
      return;
    }
    if (token !== loadToken || current !== id || destroyed) return;
    setStatus("");
    rebuild();
    fitCamera();
    showCard(selected && slots[selected] ? selected : 1);
    options.onCentre?.(person);
  }

  function setShape(next) {
    if (next === shape) return;
    const wasNearby = shape === "nearby" || next === "nearby";
    shape = next;
    remember(SHAPE_KEY, shape);
    const wanted = generationsFor();
    if (wanted !== generations || wasNearby) {
      generations = wanted;
      centre(current);
      return;
    }
    rebuild();
    fitCamera();
  }

  function setGenerations(step) {
    if (shape === "nearby") {
      const more = Math.max(NEARBY.minSteps, Math.min(NEARBY.maxSteps, steps + step));
      if (more === steps) return;
      steps = more;
      remember(STEPS_KEY, steps);
      centre(current);
      return;
    }
    const next = Math.max(MIN_GENERATIONS, Math.min(mostGenerations(), generations + step));
    if (next === generations) return;
    generations = next;
    remember(`${GENERATIONS_KEY}-${shape}`, generations);
    centre(current);
  }

  async function download(format) {
    if (shape === "nearby") return;
    const leaveOutLiving = $(".wbe-3d-living").checked;
    const person = people.get(current) || {};
    const title = `${SHAPE_NAMES[shape]} of ${fullName(person)}'s ancestors, ${generations} generations`;
    const name = `${SHAPE_NAMES[shape].toLowerCase().replace(/ /g, "-")}-${String(person.wtid || "family").replace(/[^A-Za-z0-9_-]/g, "")}-${generations}-generations`;
    const names = new Map(legend.map((item) => [item.colour, item.label.replace(/\s*\(\d+\)$/, "")]));
    names.set(IVORY, "Base and start person");
    const { parts } = printModel(slots, { shape, generations, leaveOutLiving, colourOf: (slot) => colours.get(slot) || IVORY, nameOf: (colour) => names.get(colour) || colour });
    if (format === "stl") {
      downloadBlob(`${name}.stl`, new Blob([stlFile(parts, title)], { type: "model/stl" }));
      return;
    }
    const zip = new JSZip();
    Object.entries(threeMfFiles(parts, title)).forEach(([path, text]) => zip.file(path, text));
    const blob = await zip.generateAsync({ type: "blob", mimeType: "model/3mf", compression: "DEFLATE" });
    downloadBlob(`${name}.3mf`, blob);
  }

  function frameNow() {
    return orbitFrame({ yaw: camera.yaw, pitch: camera.pitch, distance: camera.distance * camera.zoom, target: camera.target });
  }

  function paintBackground() {
    const sky = ctx.createRadialGradient(width / 2, height * 0.38, 0, width / 2, height * 0.45, Math.max(width, height) * 0.75);
    sky.addColorStop(0, "#ffffff");
    sky.addColorStop(0.55, "#f1eee8");
    sky.addColorStop(1, "#d8d2c6");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
  }

  /** A soft shadow on the floor round the base. */
  function paintShadow(view, radius) {
    [
      [1.2, 0.05],
      [1.08, 0.07],
    ].forEach(([grow, alpha]) => {
      ctx.beginPath();
      for (let i = 0; i <= 48; i += 1) {
        const angle = (i / 48) * Math.PI * 2;
        const p = projectPoint(view, [radius * grow * Math.cos(angle), radius * grow * Math.sin(angle), 0], width, height);
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      }
      ctx.fillStyle = `rgba(60,45,20,${alpha})`;
      ctx.fill();
    });
  }

  function faceColour(light, slot) {
    let colour = mix(shades.get(slot) || rgb(IVORY), [0, 0, 0], 1 - light);
    if (slot && slot === selected) colour = mix(colour, rgb(FOCUS_RING), 0.45);
    else if (slot && slot === hovered) colour = mix(colour, [255, 255, 255], 0.3);
    return css(colour);
  }

  function paintTriangles(view, triangles) {
    const drawn = [];
    triangles.forEach((triangle) => {
      if (!facesCamera(view, triangle.centre, triangle.normal)) return;
      const points = triangle.points.map((point) => projectPoint(view, point, width, height));
      drawn.push({ triangle, points, depth: projectPoint(view, triangle.centre, width, height).depth });
    });
    drawn.sort((a, b) => b.depth - a.depth);
    drawn.forEach(({ triangle, points }) => {
      const fill = faceColour(faceLight(view, triangle.normal), triangle.slot);
      ctx.fillStyle = fill;
      ctx.strokeStyle = fill;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    return drawn;
  }

  /** A rod from a to b (projected), in slot's colour, shaded so it reads as round. */
  function paintRod(slot, a, b, radius) {
    const w = Math.max(1, radius * (a.scale + b.scale));
    const colour = shades.get(slot) || (slot ? rgb(IVORY) : BAR_COLOUR);
    const lit = slot === selected ? mix(colour, rgb(FOCUS_RING), 0.5) : colour;
    ctx.lineCap = "round";
    ctx.strokeStyle = css(mix(lit, [0, 0, 0], 0.35));
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    if (w < 2) return;
    // (a lighter stripe down one side)
    ctx.strokeStyle = css(mix(lit, [255, 255, 255], 0.2));
    ctx.lineWidth = w * 0.4;
    ctx.beginPath();
    ctx.moveTo(a.x - w * 0.15, a.y - w * 0.12);
    ctx.lineTo(b.x - w * 0.15, b.y - w * 0.12);
    ctx.stroke();
  }

  /** Someone's photo once it has loaded (from WikiTree itself, so the PNG can still be saved). */
  function photoFor(person) {
    if (!person.photoData) return null;
    const url = photoUrl(person, 150);
    if (!url) return null;
    let entry = photos.get(url);
    if (!entry) {
      const image = new Image();
      entry = { image, ready: false };
      image.onload = () => {
        entry.ready = true;
      };
      image.onerror = () => {
        const fallback = person.photoData?.url ? siteUrl(person.photoData.url) : "";
        if (fallback && image.src !== fallback) image.src = fallback;
      };
      image.src = url;
      photos.set(url, entry);
    }
    return entry.ready ? entry.image : null;
  }

  /** A text's width at 100px in `weight`, measured once. */
  function widthAt(text, weight) {
    const key = `${weight}|${text}`;
    if (!widths.has(key)) {
      ctx.font = `${weight} 100px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
      widths.set(key, ctx.measureText(text).width);
    }
    return widths.get(key);
  }

  /** `text` cut short with "…" to fit `room` at `size` (both in the plaque's units). */
  function shorten(text, weight, size, room) {
    if ((widthAt(text, weight) * size) / 100 <= room) return text;
    let cut = text;
    while (cut.length > 1 && (widthAt(`${cut}…`, weight) * size) / 100 > room) cut = cut.slice(0, -1);
    return `${cut.trimEnd()}…`;
  }

  /**
   * The Plaques (user, 2026-10-12: "plates with people's details on them, connected like a regular family
   * tree"): the rods, then each plaque turned to face the camera round the upright (so it stays standing
   * and can be read from anywhere), its top showing as a slab's from above. Returns the plaques drawn,
   * nearest last, for hovering and clicking.
   */
  function paintPlaques(view, model) {
    paintTriangles(view, baseTris);
    const items = [];
    const flat = Math.hypot(view.back[0], view.back[1]) || 1;
    const toward = [view.back[0] / flat, view.back[1] / flat];
    model.links.forEach((link) => {
      const a = projectPoint(view, link.from, width, height);
      const b = projectPoint(view, link.to, width, height);
      if (!a.scale || !b.scale) return;
      items.push({ kind: "link", link, a, b, depth: (a.depth + b.depth) / 2 + 1.5 });
    });
    model.plaques.forEach((plaque) => {
      const at = (u, v, w) => projectPoint(view, [plaque.x + view.right[0] * u + toward[0] * w, plaque.y + view.right[1] * u + toward[1] * w, plaque.z + v], width, height);
      const [across, up, thick] = [plaque.w / 2, plaque.h / 2, plaque.t / 2];
      const corners = [at(-across, up, thick), at(across, up, thick), at(across, -up, thick), at(-across, -up, thick)];
      if (corners.some((corner) => !corner.scale)) return;
      items.push({ kind: "plaque", plaque, corners, back: [at(-across, up, -thick), at(across, up, -thick)], depth: projectPoint(view, [plaque.x, plaque.y, plaque.z], width, height).depth });
    });
    items.sort((x, y) => y.depth - x.depth);
    const drawn = [];
    items.forEach((item) => {
      if (item.kind === "link") {
        paintRod(item.link.slot, item.a, item.b, item.link.r);
        return;
      }
      paintPlaque(item);
      drawn.push({ slot: item.plaque.slot, points: item.corners });
    });
    return drawn;
  }

  /** One plaque: drawn in its own units (10 to the millimetre), mapped onto its corners on the screen. */
  function paintPlaque({ plaque, corners, back }) {
    const { slot, person } = plaque;
    const colour = shades.get(slot) || rgb(IVORY);
    const [tl, tr, , bl] = corners;
    if (back[0].y < tl.y - 0.5) {
      ctx.fillStyle = css(mix(colour, [0, 0, 0], 0.3));
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(back[1].x, back[1].y);
      ctx.lineTo(back[0].x, back[0].y);
      ctx.closePath();
      ctx.fill();
    }
    const [W, H] = [plaque.w * 10, plaque.h * 10];
    const px = Math.hypot(tr.x - tl.x, tr.y - tl.y) / W; // screen pixels to a unit
    if (px * W < 12) {
      // (too small to read: a patch of its colour, quicker with hundreds)
      ctx.fillStyle = slot === selected ? FOCUS_RING : css(mix(colour, [255, 255, 255], 0.35));
      ctx.beginPath();
      corners.forEach((corner, i) => (i ? ctx.lineTo(corner.x, corner.y) : ctx.moveTo(corner.x, corner.y)));
      ctx.closePath();
      ctx.fill();
      return;
    }
    ctx.save();
    ctx.setTransform((ratio * (tr.x - tl.x)) / W, (ratio * (tr.y - tl.y)) / W, (ratio * (bl.x - tl.x)) / H, (ratio * (bl.y - tl.y)) / H, ratio * tl.x, ratio * tl.y);
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 14);
    ctx.fillStyle = css(mix(colour, [255, 255, 255], slot === hovered ? 0.9 : 0.8));
    ctx.fill();
    ctx.save();
    ctx.clip();
    const image = px * H > 34 ? photoFor(person) : null;
    const inset = 12;
    if (image) {
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      ctx.drawImage(image, (image.naturalWidth - side) / 2, 0, side, side, inset, inset, H - inset * 2, H - inset * 2);
    } else {
      ctx.fillStyle = css(colour);
      ctx.fillRect(0, 0, 22, H);
    }
    ctx.restore();
    ctx.lineWidth = slot === selected ? 16 : 8;
    ctx.strokeStyle = slot === selected ? FOCUS_RING : css(mix(colour, [0, 0, 0], 0.15));
    ctx.stroke();
    // (as much as can be read at this size: the name, then the years, then where they were born)
    const left = image ? H : 34;
    const room = W - left - 16;
    const root = slot === 1;
    const lines = [];
    const name = fullName(person);
    const nameSize = Math.min(root ? 60 : 50, (room * 100) / widthAt(name, 650));
    const cut = name.lastIndexOf(" ");
    if (nameSize >= 36 || cut < 0) lines.push({ text: shorten(name, 650, Math.max(nameSize, 36), room), weight: 650, size: Math.max(nameSize, 36), colour: "#1b2029" });
    else {
      const [first, last] = [name.slice(0, cut), name.slice(cut + 1)];
      const size = Math.max(32, Math.min(46, (room * 100) / Math.max(widthAt(first, 650), widthAt(last, 650))));
      lines.push({ text: shorten(first, 650, size, room), weight: 650, size, colour: "#1b2029" }, { text: shorten(last, 650, size, room), weight: 650, size, colour: "#1b2029" });
    }
    const years = lifeYears(person);
    if (years) lines.push({ text: shorten(years, 450, 38, room), weight: 450, size: 38, colour: "#39414d" });
    const place = person.birthLocation || person.birthCountry || "";
    if (place) lines.push({ text: shorten(place, 400, 31, room), weight: 400, size: 31, colour: "#5f584c", place: true });
    // (what doesn't fit, or would be too small to read, is left off: the birthplace first)
    const tall = () => lines.reduce((total, line) => total + line.size * 1.16, 0);
    while (lines.length > 1 && (tall() > H - 18 || lines[lines.length - 1].size * px < 6)) lines.pop();
    if (lines[0].size * px >= 5.5) {
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      let y = (H - tall()) / 2;
      lines.forEach((line) => {
        ctx.font = `${line.weight} ${line.size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = line.colour;
        ctx.fillText(line.text, left, y + (line.size * 1.16) / 2);
        y += line.size * 1.16;
      });
    }
    ctx.restore();
  }

  function paintTornado(view) {
    paintTriangles(view, baseTris);
    const items = [];
    const balls = [];
    tornado.balls.forEach((ball) => {
      const p = projectPoint(view, [ball.x, ball.y, ball.z], width, height);
      if (!p.scale) return;
      const item = { kind: "ball", ball, p, depth: p.depth, r: ball.r * p.scale };
      items.push(item);
      balls.push(item);
    });
    tornado.struts.forEach((strut) => {
      const a = projectPoint(view, strut.from, width, height);
      const b = projectPoint(view, strut.to, width, height);
      if (!a.scale || !b.scale) return;
      items.push({ kind: "strut", strut, a, b, depth: (a.depth + b.depth) / 2 + strut.r });
    });
    items.sort((x, y) => y.depth - x.depth);
    items.forEach((item) => {
      if (item.kind === "strut") {
        paintRod(item.strut.slot, item.a, item.b, item.strut.r);
        return;
      }
      const { ball, p, r } = item;
      ctx.drawImage(spriteFor(colours.get(ball.slot) || IVORY), p.x - r, p.y - r, r * 2, r * 2);
      if (ball.slot === 1 || ball.slot === selected || ball.slot === hovered) {
        ctx.strokeStyle = ball.slot === hovered && ball.slot !== selected && ball.slot !== 1 ? "rgba(60,74,92,.7)" : FOCUS_RING;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    return balls;
  }

  const textWidth = (text) => widthAt(text, 600);

  /**
   * Names, with their years where there's room (user, 2026-10-12: "Can we not add more names to this?",
   * "Maybe dates, too?"): the start person, the one picked and the nearer generations first, none on top of
   * another. A label with `room` goes inside it (a block's top), as big as fits; one without goes under its ball.
   */
  function paintLabels(candidates) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const boxes = [];
    let count = 0;
    candidates
      .sort((a, b) => b.priority - a.priority || a.depth - b.depth)
      .forEach((label) => {
        if (count >= LABELS_MAX) return;
        const name = fullName(label.person);
        const years = lifeYears(label.person);
        const layout = fitLabel(name, years, label.room, textWidth, { maxFont: label.maxFont, minFont: label.minFont });
        if (!layout) return;
        const top = label.y - (label.room.below ? 0 : layout.height / 2);
        const box = { x0: label.x - layout.width / 2 - 3, x1: label.x + layout.width / 2 + 3, y0: top - 1, y1: top + layout.height + 1 };
        if (boxes.some((b) => b.x0 < box.x1 && box.x0 < b.x1 && b.y0 < box.y1 && box.y0 < b.y1)) return;
        boxes.push(box);
        count += 1;
        const important = label.slot === 1 || label.slot === selected || label.slot === hovered;
        let y = top;
        layout.lines.forEach((line) => {
          const font = layout.font * line.size;
          const isYears = line.size < 1;
          ctx.font = `${isYears ? 450 : important ? 700 : 600} ${font}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
          const middle = y + (font * 1.15) / 2;
          ctx.lineJoin = "round";
          ctx.lineWidth = Math.max(2.5, font * 0.28);
          ctx.strokeStyle = "rgba(255,255,255,.9)";
          ctx.strokeText(line.text, label.x, middle);
          ctx.fillStyle = isYears ? "#3e4652" : important ? "#11161d" : "#1f2630";
          ctx.fillText(line.text, label.x, middle);
          y += font * 1.15;
        });
      });
  }

  function draw(time) {
    // (waiting behind a chart's Back button: stop until it comes back)
    if (!root.isConnected) {
      frame = 0;
      return;
    }
    // (measured at mount the stage can still be unsized: see the Galaxy)
    if (Math.abs(root.clientWidth - width) > 1 || Math.abs(root.clientHeight - height) > 1) {
      if (root.clientWidth > 50 && root.clientHeight > 50) measure();
    }
    frame = 0;
    if (destroyed) return;
    const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0;
    lastTime = time;
    // (hovering doesn't pause it: moving the mouse out across the model stopped it, the user, 2026-10-13)
    if (turning && !dragging) camera.yaw += TURN_SPEED * dt;
    if (camera.fit) {
      const k = ease(Math.min(1, (time - camera.fit.start) / 900));
      const { from, to } = camera.fit;
      camera.distance = from.distance + (to.distance - from.distance) * k;
      camera.pitch = from.pitch + (to.pitch - from.pitch) * k;
      camera.target = from.target.map((value, i) => value + (to.target[i] - value) * k);
      if (to.zoom !== undefined) camera.zoom = from.zoom + (to.zoom - from.zoom) * k;
      if (k >= 1) camera.fit = null;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    paintBackground();
    const view = frameNow();
    const labels = [];
    const board = { plaques, nearby }[shape];
    if (board) {
      paintShadow(view, board.base.r);
      placed = paintPlaques(view, board);
    } else if (shape === "tower" && tower) {
      paintShadow(view, tower.base.r);
      // (the base first and on its own: its long thin triangles sort in front of the walls otherwise)
      paintTriangles(view, baseTris);
      const drawn = paintTriangles(view, towerTris);
      placed = drawn.filter((entry) => entry.triangle.slot).map((entry) => ({ slot: entry.triangle.slot, points: entry.points }));
      // (every block whose top has room for a name, and isn't hidden behind another: zoom in for more)
      tower.blocks.forEach((block) => {
        const top = tops.get(block.slot);
        const p = projectPoint(view, top.centre, width, height);
        if (!p.scale || p.x < 0 || p.x > width || p.y < 0 || p.y > height) return;
        const room = roomAt(top.outline.map((point) => projectPoint(view, point, width, height)), p.x, p.y);
        if (room.w < 22 || room.h < 9 || slotAt(p.x, p.y) !== block.slot) return;
        labels.push({ ...p, room, maxFont: block.generation ? 14 : 16, minFont: 8.5, slot: block.slot, person: block.person, priority: priorityOf(block.slot, block.generation) });
      });
    } else if (tornado) {
      paintShadow(view, tornado.base.r);
      const balls = paintTornado(view);
      placed = balls.map((item) => ({ slot: item.ball.slot, x: item.p.x, y: item.p.y, r: item.r, depth: item.depth }));
      // (under each ball big enough to see, and not behind another; bigger balls, bigger names, and their years)
      balls.forEach((item) => {
        const { ball } = item;
        const important = ball.slot === 1 || ball.slot === selected || ball.slot === hovered;
        if ((item.r < 3.5 && !important) || slotAt(item.p.x, item.p.y) !== ball.slot) return;
        const font = Math.max(10, Math.min(14, 8 + item.r * 0.5));
        const room = { w: 260, h: (item.r >= 5 || important ? 2.2 : 1.2) * font, below: true };
        labels.push({ x: item.p.x, y: item.p.y + item.r + 3, depth: item.depth, room, maxFont: font, minFont: 9.5, slot: ball.slot, person: ball.person, priority: priorityOf(ball.slot, ball.generation) });
      });
    }
    paintLabels(labels);
    frame = requestAnimationFrame(draw);
  }

  function priorityOf(slot, generation) {
    return (slot === 1) * 30 + (slot === selected) * 20 + (slot === hovered) * 25 - generation;
  }

  function slotAt(x, y) {
    if (shape !== "tornado") {
      // (a triangle of the tower or a plaque's corners; the nearest drawn last)
      for (let i = placed.length - 1; i >= 0; i -= 1) {
        const { points } = placed[i];
        const sides = points.map((p, k) => {
          const q = points[(k + 1) % points.length];
          return (q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x);
        });
        if (sides.every((side) => side >= 0) || sides.every((side) => side <= 0)) return placed[i].slot;
      }
      return 0;
    }
    let best = null;
    placed.forEach((item) => {
      const distance = Math.hypot(item.x - x, item.y - y);
      if (distance > Math.max(8, item.r + 2)) return;
      if (!best || item.depth < best.depth) best = item;
    });
    return best ? best.slot : 0;
  }

  /**
   * CC plaques: clicking someone too small to read brings them close and turns round them; clicking the
   * background goes back out to everyone.
   */
  function goTo(slot) {
    const plaque = slot && nearby.plaques.find((entry) => entry.slot === slot);
    if (!plaque) {
      if (camera.close) fitCamera();
      camera.close = false;
      return;
    }
    const focal = Math.min(width, height) * 1.6;
    const shown = (plaque.w * focal) / (camera.distance * camera.zoom);
    if (shown >= 110) return;
    camera.close = true;
    glideTo({ distance: (plaque.w * focal) / 170, target: [plaque.x, plaque.y, plaque.z], pitch: camera.pitch, zoom: 1 });
  }

  /** CC plaques: brings slot's plaque to the middle, close enough to read, for the arrow keys. */
  function follow(slot) {
    const plaque = nearby?.plaques.find((entry) => entry.slot === slot);
    if (!plaque) return;
    const focal = Math.min(width, height) * 1.6;
    const readable = (plaque.w * focal) / (camera.distance * camera.zoom) >= 110;
    camera.close = true;
    const target = [plaque.x, plaque.y, plaque.z];
    glideTo(readable ? { distance: camera.distance, target, pitch: camera.pitch, zoom: camera.zoom } : { distance: (plaque.w * focal) / 170, target, pitch: camera.pitch, zoom: 1 });
  }

  // Drag to turn (Shift, Alt or Ctrl+drag to move), scroll to zoom, click someone.
  let dragging = null;
  const turnButton = $(".wbe-3d-turn button");
  const setTurning = (on) => {
    turning = Boolean(on) && motion;
    turnButton.setAttribute("aria-pressed", String(turning));
  };
  $(".wbe-3d-turn").hidden = !motion;
  setTurning(turning);
  canvas.addEventListener("pointerdown", (event) => {
    setTurning(false);
    dragging = { x: event.clientX, y: event.clientY, yaw: camera.yaw, pitch: camera.pitch, moved: false, pan: event.shiftKey || event.altKey || event.ctrlKey, target: [...camera.target] };
    canvas.setPointerCapture?.(event.pointerId);
    menuEl.hidden = true;
  });
  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    if (dragging) {
      const dx = event.clientX - dragging.x;
      const dy = event.clientY - dragging.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true;
      camera.fit = null;
      if (dragging.pan) {
        // (the model follows the pointer: millimetres a pixel where the camera is looking)
        const { right, up } = frameNow();
        const perPixel = (camera.distance * camera.zoom) / (Math.min(width, height) * 1.6);
        camera.target = dragging.target.map((value, i) => value - (right[i] * dx - up[i] * dy) * perPixel);
        // (clicking the background goes back to everyone)
        camera.close = true;
        return;
      }
      camera.yaw = dragging.yaw - dx * 0.007;
      camera.pitch = Math.max(0.05, Math.min(1.4, dragging.pitch + dy * 0.005));
      return;
    }
    const slot = slotAt(event.clientX - rect.left, event.clientY - rect.top);
    hovered = slot;
    const person = slots[slot];
    tipEl.hidden = !person;
    if (person) {
      const relation = slot === 1 ? "" : relationFor(slot, person);
      tipEl.innerHTML = `${escapeText(fullName(person))} ${lifeYears(person) ? `<small>${escapeText(lifeYears(person))}</small>` : ""}${relation ? `<br><small>${escapeText(relation)}</small>` : ""}`;
      tipEl.style.left = `${event.clientX - rect.left}px`;
      tipEl.style.top = `${event.clientY - rect.top}px`;
    }
    canvas.style.cursor = person ? "pointer" : "";
  });
  canvas.addEventListener("pointerup", (event) => {
    const drag = dragging;
    dragging = null;
    if (drag?.moved) return;
    const rect = canvas.getBoundingClientRect();
    const slot = slotAt(event.clientX - rect.left, event.clientY - rect.top);
    showCard(slot || 1);
    if (shape === "nearby") goTo(slot);
  });
  // (Ctrl+click is a right click on a Mac: no menu while moving it)
  canvas.addEventListener("contextmenu", (event) => {
    if (event.ctrlKey) event.preventDefault();
  });
  canvas.addEventListener("pointerleave", () => {
    hovered = 0;
    tipEl.hidden = true;
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      // (CC plaques can be hundreds across: zoom right in on someone)
      camera.zoom = Math.max(shape === "nearby" ? 0.04 : 0.3, Math.min(3, camera.zoom * Math.exp(event.deltaY * 0.0012)));
      camera.fit = null;
      setTurning(false);
    },
    { passive: false }
  );
  canvas.addEventListener("dblclick", (event) => {
    const rect = canvas.getBoundingClientRect();
    const slot = slotAt(event.clientX - rect.left, event.clientY - rect.top);
    if (slot > 1 && slots[slot]) centre(slots[slot].id);
  });
  root.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.shape) setShape(button.dataset.shape);
    else if (button.dataset.gens) setGenerations(Number(button.dataset.gens));
    else if (button.dataset.act3d === "turn") setTurning(!turning);
    else if (button.dataset.act3d === "menu") {
      menuEl.hidden = !menuEl.hidden;
      button.setAttribute("aria-expanded", String(!menuEl.hidden));
    } else if (button.dataset.format) {
      button.disabled = true;
      Promise.resolve(download(button.dataset.format))
        .catch((error) => setStatus(`The download failed (${error?.message || error}).`))
        .finally(() => {
          button.disabled = false;
        });
    } else if (button.dataset.start) centre(Number(button.dataset.start));
    else if (button.dataset.pick) showCard(Number(button.dataset.pick));
    else if (button.dataset.more) showMoreInCard(button);
    else if (button.dataset.act3d === "close") {
      cardEl.hidden = true;
      selected = 0;
      options.onSelect?.();
    }
  });
  $(".wbe-3d-colour select").addEventListener("change", (event) => {
    mode = event.target.value;
    remember(COLOUR_KEY, mode);
    colourAll();
    drawBar();
    drawKey();
  });
  root.addEventListener("keydown", (event) => {
    const direction = event.shiftKey
      ? { ArrowLeft: "spouse-left", ArrowRight: "spouse-right" }[event.key]
      : { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }[event.key];
    if (direction && !event.altKey && !event.metaKey && !event.ctrlKey && !event.target.closest?.("select, input, textarea")) {
      event.preventDefault();
      const from = slots[selected] ? selected : 1;
      const slot = plaqueNeighbour({ people, slots, slotOfId, from, direction, cameFrom, ancestors: shape !== "nearby" });
      if (!slot) return;
      cameFrom = direction === "up" ? from : 0;
      setTurning(false);
      showCard(slot);
      if (shape === "nearby") follow(slot);
      return;
    }
    if (event.key !== "Escape") return;
    if (!menuEl.hidden) {
      event.stopPropagation();
      menuEl.hidden = true;
    } else if (!cardEl.hidden && selected !== 1) {
      event.stopPropagation();
      showCard(1);
    }
  });

  measure();
  const start = options.startId && people.has(options.startId) && !people.get(options.startId).hidden ? options.startId : world.focusId;
  current = start;
  rebuild();
  fitCamera(true);
  // (it opens from further out and drifts in)
  if (motion) camera.zoom = 1.5;
  centre(start);
  if (motion) {
    const opened = performance.now();
    const settle = (time) => {
      if (destroyed) return;
      const t = Math.min(1, (time - opened) / 1400);
      camera.zoom = 1.5 - 0.5 * ease(t);
      if (t < 1) requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
  }
  frame = requestAnimationFrame(draw);
  const stopResume = onChartResume(root, () => {
    if (!destroyed && !frame) frame = requestAnimationFrame(draw);
  });
  root.focus({ preventScroll: true });

  return {
    canvas,
    centre: (id) => centre(id),
    up: () => {
      const person = people.get(current);
      const parentId = [person?.fatherId, person?.motherId].find((id) => people.has(id) && !people.get(id).hidden);
      if (parentId) centre(parentId);
      else setStatus("No parents recorded on WikiTree.");
    },
    home: () => {
      camera.zoom = 1;
      centre(world.focusId);
    },
    resize: measure,
    currentId: () => current,
    selectedId: () => Number(slots[selected]?.id) || 0,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      stopResume();
      root.remove();
    },
  };
}
