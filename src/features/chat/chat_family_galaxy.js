// The Family Explorer's "Galaxy" view (see chat_family_galaxy_data.js for who goes where): the family
// as stars on a dark sky, turning slowly. Drag to turn it, scroll to zoom, click a star to see who it
// is; "Centre here" moves the galaxy round them (and fetches their family). One canvas, drawn in 3D by
// hand (no 3D library).

import { galaxyLayout, galaxyRelation, branchLabel, isStar, GALAXY_HUES } from "./chat_family_galaxy_data";
import { familyLoaded } from "./chat_family_navigator_data";
import { bindCardPhoto, cardHeadHtml, familyFactsHtml, familyFetcher, showMoreInCard } from "./chat_family_card";
import { easeCubicInOut as ease } from "d3-ease";
import { addStyleOnce, escapeText, fullName, lifeYears, photoUrl, siteUrl } from "./chat_chart_common";
import { reducedMotion } from "./chat_fractal_common";

const STYLE_ID = "wbe-galaxy-style";
const MOVE_MS = 1300;
const ORBIT_SPEED = 0.05; // radians a second
const LABELS_MAX = 70;

const GALAXY_CSS = `
  .wbe-galaxy { position: absolute; inset: 0; overflow: hidden; outline: none; background: radial-gradient(ellipse at 50% 45%, #1b2350 0%, #0d1230 45%, #05060f 100%);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #e8ecff; }
  .wbe-galaxy canvas.wbe-galaxy-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: grab; }
  .wbe-galaxy canvas.wbe-galaxy-canvas:active { cursor: grabbing; }
  .wbe-galaxy-key { position: absolute; top: 10px; left: 12px; display: flex; flex-direction: column; gap: 3px; font-size: 12px; pointer-events: none; max-width: 40%; padding: 6px 9px; border-radius: 8px; background: rgba(8, 12, 36, 0.72); z-index: 1; }
  .wbe-galaxy-key span { display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #c9d0f0; }
  .wbe-galaxy-key .wbe-galaxy-key-note { margin-top: 4px; color: #8f98c4; }
  .wbe-galaxy-key i { flex: none; width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }
  .wbe-galaxy-hint { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); padding: 5px 14px; border-radius: 999px; background: rgba(20,26,60,.7); color: #c9d0f0; font-size: 12px; white-space: nowrap; pointer-events: none; }
  .wbe-galaxy-tip { position: absolute; pointer-events: none; padding: 4px 10px; border-radius: 8px; background: rgba(10,14,40,.88); border: 1px solid rgba(160,170,255,.35); font-size: 12.5px; white-space: nowrap; transform: translate(12px, -50%); }
  .wbe-galaxy-tip small { color: #aab3df; }
  .wbe-galaxy-card { position: absolute; right: 14px; bottom: 44px; width: 320px; max-width: calc(100% - 28px); max-height: calc(100% - 100px); overflow-y: auto; box-sizing: border-box; padding: 12px 14px; border-radius: 14px; background: rgba(14,19,50,.94); border: 1px solid rgba(160,170,255,.35); box-shadow: 0 10px 30px rgba(0,0,0,.5); }
  .wbe-galaxy-card[hidden] { display: none; }
  .wbe-galaxy-head { display: flex; gap: 12px; padding-right: 18px; }
  .wbe-galaxy-id { font-size: 11.5px; color: #8f98c4; margin-top: 1px; }
  .wbe-galaxy-facts { margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(160,170,255,.22); font-size: 12.5px; line-height: 1.4; color: #dfe4ff; }
  .wbe-galaxy-facts > div { margin: 0 0 5px; }
  /* Custom Style forces b, em, strong and i dark grey with !important; unreadable on this dark card. */
  .wbe-galaxy .wbe-galaxy-facts b:not(#none) { font-weight: 650; color: #ffd166 !important; margin-right: 4px; }
  .wbe-galaxy-facts small { color: #9aa4d6; font-size: 11.5px; }
  .wbe-galaxy-facts .wbe-galaxy-kids { margin: -2px 0 6px 12px; }
  .wbe-galaxy-facts .wbe-galaxy-loading { color: #9aa4d6; font-style: italic; }
  .wbe-galaxy-photo { flex: none; width: 64px; height: 64px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; background: #2a3270; font-weight: 600; font-size: 22px; }
  .wbe-galaxy-photo img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 20%; }
  .wbe-galaxy-card .wbe-galaxy-rel { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #ffd166; }
  .wbe-galaxy a.wbe-galaxy-name:not(#none), .wbe-galaxy a.wbe-galaxy-name:not(#none):visited { display: block; font-size: 16px; font-weight: 650; color: #fff !important; text-decoration: none; line-height: 1.2; }
  .wbe-galaxy a.wbe-galaxy-name:not(#none):hover { text-decoration: underline; }
  .wbe-galaxy-life { font-size: 12.5px; color: #c9d0f0; margin-top: 2px; }
  .wbe-galaxy-place { font-size: 12px; color: #9aa4d6; margin-top: 2px; }
  .wbe-galaxy-card button { margin-top: 8px; border: 1px solid #ffd166; background: transparent; color: #ffd166; border-radius: 999px; padding: 3px 12px; font: 600 12px system-ui, sans-serif; cursor: pointer; }
  .wbe-galaxy-card button:hover { background: rgba(255,209,102,.15); }
  .wbe-galaxy .wbe-galaxy-card button.wbe-galaxy-who:not(#none), .wbe-galaxy .wbe-galaxy-card a.wbe-galaxy-who:not(#none), .wbe-galaxy .wbe-galaxy-card a.wbe-galaxy-who:not(#none):visited { margin: 0; padding: 0; border: 0; border-radius: 0; background: none; font: inherit; font-weight: 600; color: #9fc3ff !important; text-decoration: none; cursor: pointer; }
  .wbe-galaxy .wbe-galaxy-card button.wbe-galaxy-who:not(#none) { text-decoration: underline dotted; text-underline-offset: 2px; }
  .wbe-galaxy .wbe-galaxy-card .wbe-galaxy-who:not(#none):hover { text-decoration: underline; background: none; }
  .wbe-galaxy .wbe-galaxy-card button.wbe-galaxy-close:not(#none) { position: absolute; top: 6px; right: 6px; margin: 0; padding: 0 7px; border: 0; border-radius: 999px; font-size: 17px; line-height: 1.3; color: #9aa4d6; background: none; }
  .wbe-galaxy-status { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); padding: 5px 14px; border-radius: 999px; background: rgba(20,26,60,.85); font-size: 12.5px; }
  .wbe-galaxy-status[hidden] { display: none; }
`;


/** A soft round glow in `colour`, drawn once and stamped for each star. */
function glowSprite(colour) {
  const size = 64;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = size;
  const g = sprite.getContext("2d");
  const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.18, colour);
  gradient.addColorStop(0.45, `${colour}55`);
  gradient.addColorStop(1, `${colour}00`);
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  return sprite;
}

/**
 * A star in `colour` for someone who has died: a white-hot core, a coloured halo and four faint rays
 * (two long, two short, turned by `variant`). The core fills the middle 40px of 96.
 */
function starSprite(colour, variant = 0) {
  const size = 96;
  const c = size / 2;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = size;
  const g = sprite.getContext("2d");
  g.translate(c, c);
  g.rotate((variant * Math.PI) / 7);
  [
    [c, 1.4, 0.5],
    [c * 0.6, 1, 0.3],
  ].forEach(([length, width, alpha], i) => {
    [0, Math.PI / 2].forEach((turn) => {
      g.save();
      g.rotate(turn + (i * Math.PI) / 4);
      const ray = g.createLinearGradient(-length, 0, length, 0);
      ray.addColorStop(0, `${colour}00`);
      ray.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
      ray.addColorStop(1, `${colour}00`);
      g.fillStyle = ray;
      g.fillRect(-length, -width, length * 2, width * 2);
      g.restore();
    });
  });
  const halo = g.createRadialGradient(0, 0, 0, 0, 0, 20);
  halo.addColorStop(0, "#ffffff");
  halo.addColorStop(0.3, "#ffffff");
  halo.addColorStop(0.55, colour);
  halo.addColorStop(1, `${colour}00`);
  g.fillStyle = halo;
  g.beginPath();
  g.arc(0, 0, 20, 0, Math.PI * 2);
  g.fill();
  return sprite;
}

/**
 * A small planet in `colour` (user: "Not ball-y... planet-y"): soft cloud bands, lit from the top left
 * with a dark night side, and a thin glowing atmosphere round the edge. `variant` tilts and spaces the bands.
 */
function planetSprite(colour, variant = 0) {
  const size = 96;
  const c = size / 2;
  const radius = c - 4;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = size;
  const g = sprite.getContext("2d");
  g.save();
  g.beginPath();
  g.arc(c, c, radius, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = colour;
  g.fillRect(0, 0, size, size);
  // Cloud bands, tilted a little.
  g.translate(c, c);
  g.rotate(-0.35 + variant * 0.3);
  const bands = 5 + (variant % 3);
  for (let i = 0; i < bands; i++) {
    const y = -radius + ((i + 0.5) * radius * 2) / bands + Math.sin(i * 2.3 + variant) * 3;
    g.fillStyle = i % 2 ? "rgba(255,255,255,0.16)" : "rgba(0,0,30,0.14)";
    g.fillRect(-radius * 1.5, y - radius / bands / 1.6, radius * 3, (radius * 2) / bands / 1.3);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  // Day and night: bright at the top left, dark round the far side.
  const light = g.createRadialGradient(c - radius * 0.45, c - radius * 0.45, radius * 0.05, c - radius * 0.1, c - radius * 0.1, radius * 1.35);
  light.addColorStop(0, "rgba(255,255,255,0.55)");
  light.addColorStop(0.25, "rgba(255,255,255,0.08)");
  light.addColorStop(0.62, "rgba(0,0,20,0.15)");
  light.addColorStop(1, "rgba(0,0,20,0.92)");
  g.fillStyle = light;
  g.fillRect(0, 0, size, size);
  g.restore();
  // The atmosphere: a thin glow on the lit edge.
  g.beginPath();
  g.arc(c, c, radius + 1, Math.PI * 0.75, Math.PI * 1.85);
  g.strokeStyle = colour;
  g.globalAlpha = 0.55;
  g.lineWidth = 2.5;
  g.stroke();
  return sprite;
}

/**
 * Mounts the view in `host`. options: {world (people, focusId, …), load(id) → Promise, loadNearby(id, steps) →
 * Promise (1: someone's family, for their card), startId, onCentre(person)}.
 * Returns {centre(id), up(), home(), resize(), destroy(), currentId(), canvas}.
 */
export function mountFamilyGalaxy(host, options) {
  addStyleOnce(STYLE_ID, GALAXY_CSS);
  const world = options.world;
  const people = world.people;
  const root = document.createElement("div");
  root.className = "wbe-galaxy";
  root.tabIndex = 0;
  root.innerHTML = `
    <canvas class="wbe-galaxy-canvas" aria-label="The family as a galaxy of stars"></canvas>
    <div class="wbe-galaxy-key"></div>
    <div class="wbe-galaxy-status" hidden></div>
    <div class="wbe-galaxy-tip" hidden></div>
    <div class="wbe-galaxy-card" hidden></div>
    <div class="wbe-galaxy-hint">Drag to turn · scroll to zoom · click a star to see who it is · ancestors above, descendants below</div>`;
  host.appendChild(root);
  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const keyEl = root.querySelector(".wbe-galaxy-key");
  const statusEl = root.querySelector(".wbe-galaxy-status");
  const tipEl = root.querySelector(".wbe-galaxy-tip");
  const cardEl = root.querySelector(".wbe-galaxy-card");
  const sprites = GALAXY_HUES.map(glowSprite);
  const focusSprite = glowSprite("#ffd166");
  // (three planets a colour, so the same arm isn't all one stamp)
  const planets = GALAXY_HUES.map((colour) => [0, 1, 2].map((variant) => planetSprite(colour, variant)));
  const focusPlanet = planetSprite("#ffd166", 1);
  const stars = GALAXY_HUES.map((colour) => [0, 1, 2].map((variant) => starSprite(colour, variant)));
  const focusStar = starSprite("#ffd166", 1);
  const photos = new Map();

  let width = 0;
  let height = 0;
  let ratio = 1;
  let current = 0;
  let layout = { nodes: [], edges: [], branches: [] };
  let byId = new Map();
  let shown = []; // [{node, x, y, z, from, alpha}] the stars as drawn (positions move between layouts)
  let moveStart = 0;
  let selected = 0;
  let hovered = 0;
  let frame = 0;
  let destroyed = false;
  // (the card fetches someone's family when it isn't all here, and shows it when it comes; centre() fetches the middle one's)
  const family = familyFetcher(world, options.loadNearby && ((id) => options.loadNearby(id, 1)), (id) => !destroyed && selected === id && renderCard());
  let loadToken = 0;
  let lastTime = 0;
  let idleSince = 0;
  const camera = { yaw: -0.6, pitch: 0.42, distance: 1100, target: { x: 0, y: 0, z: 0 }, fly: null };
  const motion = !reducedMotion();
  // A fixed sky of faint stars behind everything.
  const sky = Array.from({ length: 260 }, (_, i) => ({ x: Math.abs(Math.sin(i * 91.7)) % 1, y: Math.abs(Math.sin(i * 47.3 + 1)) % 1, r: 0.4 + (Math.abs(Math.sin(i * 13.1)) % 1) * 1.1, phase: i }));

  function measure() {
    const rect = root.getBoundingClientRect();
    width = Math.max(rect.width, 50);
    height = Math.max(rect.height, 50);
    ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }

  function photoFor(person) {
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

  /** Screen place of a point: {sx, sy, scale, depth}. */
  function project(x, y, z) {
    const t = camera.target;
    const dx = x - t.x;
    const dy = y - t.y;
    const dz = z - t.z;
    const cy = Math.cos(camera.yaw);
    const sy = Math.sin(camera.yaw);
    const x1 = dx * cy - dz * sy;
    const z1 = dx * sy + dz * cy;
    const cp = Math.cos(camera.pitch);
    const sp = Math.sin(camera.pitch);
    const y2 = dy * cp - z1 * sp;
    const z2 = dy * sp + z1 * cp;
    const depth = camera.distance + z2;
    const scale = depth > 40 ? (Math.min(width, height) * 1.05) / depth : 0;
    return { sx: width / 2 + x1 * scale, sy: height / 2 - y2 * scale, scale, depth };
  }

  function setStatus(text) {
    statusEl.hidden = !text;
    statusEl.textContent = text || "";
  }

  function drawKey() {
    keyEl.innerHTML = "";
    const focus = people.get(current);
    layout.branches.slice(0, GALAXY_HUES.length).forEach((branch) => {
      const span = document.createElement("span");
      const colour = GALAXY_HUES[branch.index % GALAXY_HUES.length];
      span.innerHTML = `<i style="background:${colour};color:${colour}"></i>`;
      span.appendChild(document.createTextNode(branchLabel(branch, focus)));
      keyEl.appendChild(span);
    });
    const note = document.createElement("span");
    note.className = "wbe-galaxy-key-note";
    note.textContent = "★ died · ● living";
    keyEl.appendChild(note);
  }

  /** Shows id's card (user, 2026-10-12: "Richer card for Galaxy, please"), fetching their family if it isn't all here. */
  function showCard(id) {
    selected = id;
    renderCard();
    if (byId.has(id) && id !== current) family.ensure(byId.get(id).person);
  }

  function renderCard() {
    const id = selected;
    const node = byId.get(id);
    if (!node) {
      cardEl.hidden = true;
      return;
    }
    const person = node.person;
    const relation = id === current ? "In the middle" : galaxyRelation(layout, people, id);
    const facts = familyFactsHtml(people, id, { prefix: "wbe-galaxy", pickOf: (other) => (byId.has(other.id) ? String(other.id) : ""), pickTitle: "Show their star", loading: family.loading(id) });
    cardEl.innerHTML = `
      <button type="button" class="wbe-galaxy-close" data-close title="Close" aria-label="Close">×</button>
      ${cardHeadHtml(person, { prefix: "wbe-galaxy", relation, action: id === current ? "" : `<button type="button" data-centre="${id}">Centre here</button>` })}
      ${facts}`;
    bindCardPhoto(cardEl, person);
    cardEl.hidden = false;
  }

  /** Picks someone out: their card, and the camera a little toward their star so it comes forward. */
  function pick(id) {
    const star = shown.find((entry) => entry.node.id === id);
    showCard(id);
    if (star) camera.fly = { from: { ...camera.target }, to: { x: star.x * 0.5, y: star.y * 0.5, z: star.z * 0.5 }, start: performance.now() };
  }

  /** Lays the galaxy out round `id` and moves the stars there. */
  function relayout(id) {
    const previous = new Map(shown.map((star) => [star.node.id, star]));
    layout = galaxyLayout(people, id);
    byId = new Map(layout.nodes.map((node) => [node.id, node]));
    // (stars already shown glide from where they are; new ones come out of the one they hang from)
    shown = layout.nodes.map((node) => {
      const before = previous.get(node.id) || previous.get(node.parentId);
      const from = before ? { x: before.x, y: before.y, z: before.z } : { x: 0, y: 0, z: 0 };
      return { node, from, x: from.x, y: from.y, z: from.z, alpha: previous.has(node.id) ? 1 : 0 };
    });
    moveStart = performance.now();
    drawKey();
  }

  async function centre(id) {
    const person = people.get(id);
    if (!person || person.hidden || destroyed) return;
    current = id;
    relayout(id);
    camera.fly = { from: { ...camera.target }, to: { x: 0, y: 0, z: 0 }, start: performance.now() };
    showCard(id);
    options.onCentre?.(person);
    if (familyLoaded(world, id)) {
      setStatus("");
      return;
    }
    const token = ++loadToken;
    setStatus(`Finding ${String(person.name || "").trim() || fullName(person)}'s family…`);
    try {
      await options.load(id);
    } catch (error) {
      if (token === loadToken) setStatus("WikiTree didn't answer. Try Centre here again.");
      return;
    }
    if (token !== loadToken || current !== id || destroyed) return;
    setStatus("");
    relayout(id);
    showCard(selected && byId.has(selected) ? selected : id);
    options.onCentre?.(person);
  }

  function draw(time) {
    // (measured at mount the stage can still be unsized, so it opened as a tiny cluster: live, 2026-10-11)
    if (Math.abs(root.clientWidth - width) > 1 || Math.abs(root.clientHeight - height) > 1) {
      if (root.clientWidth > 50 && root.clientHeight > 50) measure();
    }
    frame = 0;
    if (destroyed) return;
    const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0;
    lastTime = time;
    if (motion && !dragging && time - idleSince > 3500) camera.yaw += ORBIT_SPEED * dt;
    if (camera.fly) {
      const t = motion ? Math.min(1, (time - camera.fly.start) / 900) : 1;
      const k = ease(t);
      ["x", "y", "z"].forEach((axis) => {
        camera.target[axis] = camera.fly.from[axis] + (camera.fly.to[axis] - camera.fly.from[axis]) * k;
      });
      if (t >= 1) camera.fly = null;
    }
    const move = motion ? ease(Math.min(1, (time - moveStart) / MOVE_MS)) : 1;
    shown.forEach((star) => {
      star.x = star.from.x + (star.node.x - star.from.x) * move;
      star.y = star.from.y + (star.node.y - star.from.y) * move;
      star.z = star.from.z + (star.node.z - star.from.z) * move;
      star.alpha = Math.max(star.alpha, move);
    });

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    // The sky.
    sky.forEach((s) => {
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(time / 900 + s.phase);
      ctx.fillStyle = "#cfd6ff";
      ctx.fillRect(s.x * width, s.y * height, s.r, s.r);
    });
    ctx.globalAlpha = 1;

    const placed = new Map();
    shown.forEach((star) => placed.set(star.node.id, { star, ...project(star.x, star.y, star.z) }));

    // The lines of the constellation (the line to the selected one and back to the middle, gold).
    const lit = new Set();
    for (let at = byId.get(hovered || selected); at; at = byId.get(at.parentId)) lit.add(at.id);
    layout.edges.forEach((edge) => {
      const a = placed.get(edge.a);
      const b = placed.get(edge.b);
      if (!a || !b || !a.scale || !b.scale) return;
      const onPath = lit.has(edge.a) && lit.has(edge.b) && edge.kind !== "marriage";
      const hue = GALAXY_HUES[Math.max(0, b.star.node.branch) % GALAXY_HUES.length];
      ctx.strokeStyle = onPath ? "#ffd166" : hue;
      ctx.globalAlpha = (onPath ? 0.95 : edge.kind === "marriage" ? 0.1 : 0.16) * Math.min(a.star.alpha, b.star.alpha);
      ctx.lineWidth = onPath ? 2 : 1;
      ctx.setLineDash(edge.kind === "marriage" ? [3, 4] : []);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // The stars, far ones first.
    const order = [...placed.values()].filter((p) => p.scale).sort((a, b) => b.depth - a.depth);
    order.forEach((p) => {
      const node = p.star.node;
      const isFocus = node.id === current;
      // (bigger: user, 2026-10-11, "I'd just like them to be a bit bigger")
      const base = isFocus ? 30 : Math.max(8, 21 - node.steps * 1.8);
      p.r = base * p.scale;
      const size = p.r * (lit.has(node.id) ? 3.4 : 2.8);
      ctx.globalAlpha = p.star.alpha * Math.max(0.35, Math.min(1, 1.6 - p.depth / camera.distance));
      const hue = Math.max(0, node.branch) % sprites.length;
      ctx.drawImage(isFocus ? focusSprite : sprites[hue], p.sx - size / 2, p.sy - size / 2, size, size);
      // A planet for everyone (user: "most of the nodes are not even balls - they're just where the lines
      // meet"; then "planet-y"), never under 5px in radius; a photo covers it when near enough.
      const photoR = p.r * 0.62;
      const ballR = Math.max(6, p.r * 0.72);
      ctx.globalAlpha = Math.min(1, p.star.alpha * Math.max(0.6, Math.min(1, 1.8 - p.depth / camera.distance)));
      // (the sprite has a 4px margin in 96 for the atmosphere)
      if (isStar(node.person)) {
        // (the dead are stars, the living planets; the star's core, 20 of its 96px, about the planet's size)
        const starR = ballR * 1.1 * (48 / 20);
        ctx.drawImage(isFocus ? focusStar : stars[hue][node.id % 3], p.sx - starR, p.sy - starR, starR * 2, starR * 2);
      } else {
        const planetR = ballR * (48 / 44);
        ctx.drawImage(isFocus ? focusPlanet : planets[hue][node.id % 3], p.sx - planetR, p.sy - planetR, planetR * 2, planetR * 2);
      }
      if (photoR > 9 && node.person.photoData) {
        const image = photoFor(node.person);
        if (image) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, photoR, 0, Math.PI * 2);
          ctx.clip();
          const side = Math.min(image.naturalWidth, image.naturalHeight);
          ctx.drawImage(image, (image.naturalWidth - side) / 2, 0, side, side, p.sx - photoR, p.sy - photoR, photoR * 2, photoR * 2);
          ctx.restore();
        }
      }
      if (isFocus || node.id === selected) {
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time / 400);
        ctx.strokeStyle = "#ffd166";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(photoR, p.r * 0.5) + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Names: the nearest and biggest first, none on top of another.
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const boxes = [];
    let labels = 0;
    [...order]
      .sort((a, b) => (b.star.node.id === current) - (a.star.node.id === current) || b.r - a.r)
      .forEach((p) => {
        if (labels >= LABELS_MAX || p.star.alpha < 0.6) return;
        const node = p.star.node;
        const important = node.id === current || lit.has(node.id);
        if (!important && p.r < 4.2) return;
        const font = Math.max(10.5, Math.min(15, 8 + p.r * 0.45));
        ctx.font = `${important ? 650 : 500} ${font}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
        const text = String(node.person.name || "").trim().split(/\s+/)[0] + (node.person.lnab ? ` ${node.person.lnab}` : "");
        const w = ctx.measureText(text).width;
        const y = p.sy + Math.max(photoRadius(p), p.r * 0.6) + 5;
        const box = { x0: p.sx - w / 2 - 3, x1: p.sx + w / 2 + 3, y0: y - 1, y1: y + font + 2 };
        if (boxes.some((b) => b.x0 < box.x1 && box.x0 < b.x1 && b.y0 < box.y1 && box.y0 < b.y1)) return;
        boxes.push(box);
        labels += 1;
        ctx.fillStyle = "rgba(5,6,20,.55)";
        ctx.fillText(text, p.sx + 1, y + 1);
        ctx.fillStyle = important ? "#fff3cf" : "#dfe4ff";
        ctx.fillText(text, p.sx, y);
      });
    lastPlaced = order;
    frame = requestAnimationFrame(draw);
  }
  const photoRadius = (p) => (p.r * 0.62 > 9 ? p.r * 0.62 : 0);
  let lastPlaced = [];

  function starAt(x, y) {
    let best = null;
    let bestDistance = Infinity;
    lastPlaced.forEach((p) => {
      const distance = Math.hypot(p.sx - x, p.sy - y);
      // (generous: the stars are small and moving)
      if (distance < Math.max(14, p.r) && distance < bestDistance) {
        best = p;
        bestDistance = distance;
      }
    });
    return best;
  }

  // Drag to turn, scroll to zoom, click a star.
  let dragging = null;
  canvas.addEventListener("pointerdown", (event) => {
    dragging = { x: event.clientX, y: event.clientY, yaw: camera.yaw, pitch: camera.pitch, moved: false };
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    if (dragging) {
      const dx = event.clientX - dragging.x;
      const dy = event.clientY - dragging.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true;
      camera.yaw = dragging.yaw + dx * 0.006;
      camera.pitch = Math.max(-1.3, Math.min(1.3, dragging.pitch + dy * 0.005));
      idleSince = performance.now();
      return;
    }
    // (the slow turn waits while the pointer is over the galaxy, so a star stays put to be clicked)
    idleSince = performance.now();
    const hit = starAt(event.clientX - rect.left, event.clientY - rect.top);
    hovered = hit ? hit.star.node.id : 0;
    tipEl.hidden = !hit;
    if (hit) {
      const person = hit.star.node.person;
      const relation = hit.star.node.id === current ? "" : galaxyRelation(layout, people, hit.star.node.id);
      tipEl.innerHTML = `${escapeText(fullName(person))} ${lifeYears(person) ? `<small>${escapeText(lifeYears(person))}</small>` : ""}${relation ? `<br><small>${escapeText(relation)}</small>` : ""}`;
      tipEl.style.left = `${hit.sx}px`;
      tipEl.style.top = `${hit.sy}px`;
    }
    canvas.style.cursor = hit ? "pointer" : "";
  });
  canvas.addEventListener("pointerup", (event) => {
    const drag = dragging;
    dragging = null;
    idleSince = performance.now();
    if (drag?.moved) return;
    const rect = canvas.getBoundingClientRect();
    const hit = starAt(event.clientX - rect.left, event.clientY - rect.top);
    if (!hit) {
      showCard(current);
      return;
    }
    pick(hit.star.node.id);
  });
  canvas.addEventListener("pointerleave", () => {
    hovered = 0;
    tipEl.hidden = true;
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      camera.distance = Math.max(250, Math.min(4200, camera.distance * Math.exp(event.deltaY * 0.0012)));
      idleSince = performance.now();
    },
    { passive: false }
  );
  canvas.addEventListener("dblclick", (event) => {
    const rect = canvas.getBoundingClientRect();
    const hit = starAt(event.clientX - rect.left, event.clientY - rect.top);
    if (hit && hit.star.node.id !== current) centre(hit.star.node.id);
  });
  cardEl.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.centre) centre(Number(button.dataset.centre));
    else if (button.dataset.pick) pick(Number(button.dataset.pick));
    else if (button.dataset.more) showMoreInCard(button);
    else if (button.hasAttribute("data-close")) {
      cardEl.hidden = true;
      selected = 0;
    }
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !cardEl.hidden && selected !== current) {
      event.stopPropagation();
      showCard(current);
    }
  });

  function resize() {
    measure();
  }

  measure();
  // (it opens from further out and drifts in)
  if (motion) camera.distance = 1900;
  centre(options.startId && people.has(options.startId) ? options.startId : world.focusId);
  if (motion) {
    const start = performance.now();
    const settle = (time) => {
      if (destroyed) return;
      const t = Math.min(1, (time - start) / 1600);
      camera.distance = 1900 - (1900 - 1100) * ease(t);
      if (t < 1) requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
  }
  frame = requestAnimationFrame(draw);
  root.focus({ preventScroll: true });

  return {
    canvas,
    centre: (id) => centre(id),
    up: () => {
      const person = people.get(current);
      const parentId = [person?.fatherId, person?.motherId].find((pid) => people.has(pid) && !people.get(pid).hidden);
      if (parentId) centre(parentId);
      else setStatus("No parents recorded on WikiTree.");
    },
    home: () => centre(world.focusId),
    resize,
    currentId: () => current,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      root.remove();
    },
  };
}
