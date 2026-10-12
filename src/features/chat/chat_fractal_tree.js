// The fractal tree popup (OneZoom-style, "but for families"). Each person is a
// circle holding a small tree of their children; zooming into anyone opens up
// their family, generation after generation. Drawn on a canvas in screen space
// (positions are computed in doubles and never passed through a canvas
// transform), so ten generations deep still draws sharp. d3-zoom moves the
// camera; click a circle to fly into it, Shift/⌘/Ctrl-click opens the profile.

import {
  injectFractalStyles,
  reducedMotion,
  wrapText,
  bindFractalSearch,
  saveFractalPng,
  switchFractalWhich,
} from "./chat_fractal_common";
import { select } from "d3-selection";
import "d3-transition";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import { interpolateRgb } from "d3-interpolate";
import { easeCubicInOut } from "d3-ease";
import { buildFractalLayout, graftBranch, hasFrontier, NESTED_GEOMETRY } from "./chat_fractal_tree_data";
import { createChartPopup, mountChartPopup, closeChartPopup, chartLinkButtons, chartLinkClick, escapeText, fullName, lifeYears as years, photoUrl, profileUrl, siteUrl, toggleChartFullScreen, yearOf } from "./chat_chart_common";
import { showSpiralTreePopup } from "./chat_fractal_spiral";
import { mountFamilyNavigator } from "./chat_family_navigator";
import { mountFamilyGalaxy } from "./chat_family_galaxy";
import { mountFamily3d } from "./chat_family_3d";
import { moreTextToHtml, textWithMoreLink } from "./chat_more_text";

export { photoUrl };

const LAYOUT_KEY = "wbe-fractal-layout";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
// Light, garden colours (user, 2026-10-11: "The colours are dark and not beautiful at all"): pale
// circles with dark names, brown branches. In the colour modes a circle is a pale tint of its colour.
// Second round (user, 2026-10-11: "I don't like the colours at all"): one quiet palette for every mode,
// on the warm ivory of the Family view: birth years run from old-photo terracotta and gold through sage
// to slate blue, surnames and countries get muted colours, and edges are a soft shade, not the full colour.
const PLAIN_EDGE = "#b9c6a5";
const BRANCH = "rgba(122,94,64,.5)";
const YEAR_STOPS = ["#a8643f", "#c98b4f", "#d9b26a", "#a9b77e", "#6f9c8f", "#5b7c9e"];
const QUIET_COLOURS = ["#5b7c9e", "#c98b4f", "#6f9c8f", "#c46b6b", "#8c79b0", "#b9a04a", "#5f9fae", "#b07a92", "#7d9a5d", "#9b7b5c"];
const EDGE_MAX = 2.5;
const INK = "#22303a";
const LEAF_PLAIN = "#9cc47f";
const FOCUS_RING = "#f0b400";
const UNKNOWN = "#c9c9c9";
const HIGHLIGHT = "#e0533d";
const MIN_DRAW = 1.2; // screen radius below which a circle isn't drawn
const MIN_INSIDE = 9; // screen radius a circle needs before its family is drawn inside it
const EXPAND_AT = 110; // screen radius at which someone at the edge of what's loaded loads their next generations
const MAX_LOADING = 2; // branches fetched at once
const EXPAND_RETRY_MS = 4000; // wait before fetching a branch again after it failed
const EXPAND_TRIES = 3; // then leave it
// Inside the circle being looked at, each circle shows who it is, big enough to read (user, 2026-10-11:
// "We can't even see any of the family members' names"): their photo, name, years and how many children,
// in place of their own family, which shows once it's zoomed into. One too small for that gets a label beside it.
const LABEL_MIN = 7;
const CARD_MIN = 18;
const CARD_MAX_FAMILY = 90; // (from here their family is drawn inside, with their name below it; a leaf stays a card)
const HINT_KEY = "wbe-explorer-hint-seen";
// The Explorer's views of the same family (user, 2026-10-11: "Let's do all three"); the last one used opens next time.
const VIEW_KEY = "wbe-explorer-view";
const EXPLORER_VIEWS = [
  { key: "tree", label: "Branches", title: "Each family a branch: click a family to see their children, zoom out for the parents" },
  { key: "family", label: "Family", title: "One person with their parents, brothers and sisters, husband or wife and children: click anyone to move to them" },
  { key: "galaxy", label: "Galaxy", title: "Everyone loaded as stars round one person: ancestors above, descendants below, each branch its own colour" },
  { key: "3d", label: "3D", title: "The ancestors as a 3D model to turn round, a Tornado or a Fan tower, and download for 3D printing" },
];
// "1 child", "3 children", "1 descendant".
const counted = (count, plural) => `${count} ${count === 1 ? plural.replace(/ren$|s$/, "") : plural}`;
const tints = new Map();

/** The birth-year colour at `t` (0 the oldest, 1 the newest) along YEAR_STOPS. */
function yearColour(t) {
  const at = Math.max(0, Math.min(1, t)) * (YEAR_STOPS.length - 1);
  const i = Math.min(YEAR_STOPS.length - 2, Math.floor(at));
  const hex = (c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
  const [a, b] = [hex(YEAR_STOPS[i]), hex(YEAR_STOPS[i + 1])];
  return `#${a.map((v, k) => Math.round(v + (b[k] - v) * (at - i)).toString(16).padStart(2, "0")).join("")}`;
}

/** `colour` mixed into white: 0 is white, 1 the colour itself. */
function tint(colour, amount) {
  const key = `${colour}|${amount}`;
  if (!tints.has(key)) tints.set(key, interpolateRgb("#ffffff", colour)(amount));
  return tints.get(key);
}
const MODES = [
  { key: "plain", label: "Plain" },
  { key: "century", label: "Birth year" },
  { key: "country", label: "Birth country" },
  { key: "surname", label: "Surname" },
];

/** {fill(person), key(person), legend:[{key,label,colour}]} for rings and leaves. */
function buildColouring(nodes, mode, palette = {}) {
  const people = nodes.map((node) => node.person);
  if (mode === "century") {
    const found = people.map((person) => yearOf(person.birth)).filter(Boolean);
    const min = found.length ? Math.min(...found) : 1800;
    const max = found.length ? Math.max(...found) : 1950;
    const scale = (year) => yearColour((year - min) / Math.max(1, max - min));
    const buckets = [];
    for (let start = Math.floor(min / 25) * 25; start <= max; start += 25) buckets.push(start);
    return {
      fill: (person) => (yearOf(person.birth) ? scale(yearOf(person.birth)) : UNKNOWN),
      key: (person) => (yearOf(person.birth) ? String(Math.floor(yearOf(person.birth) / 25) * 25) : "?"),
      legend: [
        ...buckets.map((start) => ({ key: String(start), label: `${start}–${start + 24}`, colour: scale(Math.min(Math.max(start + 12, min), max)) })),
        { key: "?", label: "No birth year", colour: UNKNOWN },
      ],
    };
  }
  if (mode === "country" || mode === "surname") {
    // Every surname (or country) keeps its own colour for as long as the popup is open: the most
    // common ones get the clearest colours, and any others golden-angle hues as they appear.
    const valueOf = mode === "country" ? (person) => person.birthCountry || "" : (person) => person.lnab || "";
    const colours = palette[mode] || (palette[mode] = new Map());
    const colourOf = (value) => {
      if (!colours.has(value)) {
        const i = colours.size;
        colours.set(value, i < QUIET_COLOURS.length ? QUIET_COLOURS[i] : `hsl(${Math.round((i * 137.508) % 360)}, 32%, 56%)`);
      }
      return colours.get(value);
    };
    const counts = new Map();
    people.forEach((person) => {
      const value = valueOf(person);
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    });
    [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).forEach(([value]) => colourOf(value));
    return {
      fill: (person) => {
        const value = valueOf(person);
        return value ? colourOf(value) : UNKNOWN;
      },
      key: (person) => valueOf(person) || "?",
      // The key lists what's in view (the circles drawn last), commonest first.
      legendFor: (shown) => {
        const inView = new Map();
        let unknown = 0;
        shown.forEach((node) => {
          const value = valueOf(node.person);
          if (value) inView.set(value, (inView.get(value) || 0) + 1);
          else unknown += 1;
        });
        const ranked = [...inView.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        const listed = ranked.slice(0, 9);
        const listedKeys = new Set(listed.map(([value]) => value));
        const rest = ranked.length - listed.length;
        return [
          ...listed.map(([value, count]) => ({ key: value, label: `${value} (${count})`, colour: colourOf(value) })),
          // ("N more" opens the names it holds)
          ...(rest
            ? [{ key: "Other", label: textWithMoreLink("", `${rest} more`, "", ranked.slice(listed.length).map(([value, count]) => `${value} (${count})`).join(", ")), colour: "#a0a0a0", match: (person) => valueOf(person) && !listedKeys.has(valueOf(person)) }]
            : []),
          ...(unknown ? [{ key: "?", label: mode === "country" ? "No birthplace" : "No surname", colour: UNKNOWN }] : []),
        ];
      },
    };
  }
  return {
    fill: () => LEAF_PLAIN,
    key: () => "plain",
    legend: [{ key: "plain", label: "No children recorded (a leaf)", colour: LEAF_PLAIN }],
  };
}

function savedLayout() {
  try {
    return localStorage.getItem(LAYOUT_KEY) === "spiral" ? "spiral" : "nested";
  } catch (error) {
    return "nested";
  }
}

/**
 * tree: {person, children, depth}. options: {title, which: "descendants"|"ancestors",
 * layout: "nested" (the default: families inside circles) | "spiral"}. The header
 * button switches layouts, and the choice is remembered for next time.
 */
export function showFractalTreePopup(tree, options = {}) {
  const layout = options.layout || savedLayout();
  const onSwitchLayout = () => {
    const next = layout === "spiral" ? "nested" : "spiral";
    try {
      localStorage.setItem(LAYOUT_KEY, next);
    } catch (error) {
      // Storage may be blocked; the switch still works for this popup.
    }
    // (the ancestors as last loaded with birth parents switched)
    showFractalTreePopup(options.biological?.tree || tree, { ...options, layout: next });
  };
  if (layout === "spiral") return showSpiralTreePopup(tree, { ...options, onSwitchLayout });
  return showNestedTreePopup(tree, { ...options, onSwitchLayout });
}

/**
 * The family world (the fractal tree's CC7-style version); see chat_family_world_data.js. world: {build() → {nodes},
 * expand(request) → Promise, stats() → html, climb(fromCouple) → {status, root, back, ids}, reroot(root, anchorUid, nodes, how) → bool,
 * normalise() → {scale, x, y}, home()}.
 * options: {title}.
 */
export function showFamilyWorldPopup(world, options = {}) {
  return showNestedTreePopup(null, { ...options, which: "descendants", world });
}

function showNestedTreePopup(tree, options = {}) {
  injectFractalStyles();
  const which = options.which === "ancestors" ? "ancestors" : "descendants";
  const childWord = which === "ancestors" ? "parents" : "children";
  // options.world: the family world, whose root moves as you zoom (see showFamilyWorldPopup).
  const world = options.world || null;
  const buildLayout = () => (world ? world.build() : { nodes: buildFractalLayout(tree).nodes });
  let { nodes } = buildLayout();
  // (everything below starts from the first circle: with none, say so rather than "o[n].parent" (live, 2026-10-12))
  if (!nodes.length) throw new Error("WikiTree sent no one to show");
  let roots = nodes.filter((node) => node.parent === -1);
  const state = {
    mode: nodes.some((node) => yearOf(node.person.birth)) ? "century" : "plain",
    transform: zoomIdentity,
    hover: -1,
    focus: 0,
    fitted: 0,
    loading: 0,
    loadingKeys: new Set(),
    doneKeys: new Set(),
    failedKeys: new Map(), // key → {count, at}
    fittedFill: 0.92,
    pulse: null,
    matches: [],
    matchIndex: -1,
  };
  const photos = new Map();

  const popup = createChartPopup({
    id: "wbe-fractal-popup",
    html: `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-act="out" title="${world ? "Up a generation: the parents' family" : "Zoom out to the parent's circle"}">${world ? "↑ Parents" : "Out"}</button>
        <button type="button" class="small" data-act="reset" title="${world ? "Back to where you started" : "Back to the whole tree"}">${
          world ? (options.homeName ? `Back to ${escapeText(options.homeName)}` : "Back to the start") : "Whole tree"
        }</button>
        ${options.onSwitchWhich ? `<button type="button" class="small" data-act="which" title="Turn the tree round: this person's ${which === "ancestors" ? "descendants" : "ancestors"}">${which === "ancestors" ? "Descendants" : "Ancestors"}</button>` : ""}
        ${options.onSwitchLayout ? `<button type="button" class="small" data-act="layout" title="Switch to the spiral layout: siblings bud off curling stems">Spiral</button>` : ""}
        ${chartLinkButtons(options.links)}
        <button type="button" class="small" data-act="full" title="Full screen (or double-click the title bar; Esc to leave)">Full screen</button>
        <button type="button" class="small" data-act="png" title="Save the current view as PNG">PNG</button>
        <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        ${
          world?.raw
            ? `<div class="wbe-explorer-views" role="group" aria-label="View">${EXPLORER_VIEWS.map(
                (view) => `<button type="button" data-view="${view.key}" aria-pressed="${view.key === "tree"}" title="${escapeText(view.title)}">${view.label}</button>`
              ).join("")}</div>`
            : ""
        }
        ${
          world?.setBiological || options.biological
            ? `<label class="wbe-explorer-bio" hidden><input type="checkbox"> <span></span></label>`
            : ""
        }
        ${MODES.map((m) => `<button type="button" class="wbe-chart-mode" data-mode="${m.key}">${m.label}</button>`).join("")}
        <span class="wbe-chart-spacer"></span>
        <input type="search" class="wbe-fractal-search" placeholder="Find someone on the tree…" aria-label="Find someone on the tree">
      </div>
      <div class="wbe-fractal-crumbs"></div>
      <div class="wbe-chart-stage"><div class="wbe-chart-tip"></div></div>
      <div class="wbe-chart-footer">
        <div class="wbe-chart-stats"></div>
        <div class="wbe-chart-legend"></div>
      </div>
    </div>`,
  });
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Branches";

  // Someone's biological parents (BioFather, BioMother), switched one person at a time (the user, 2026-10-13: "the
  // switches should probably be on individuals"): the switch is for whoever the view is on, when they have any.
  const bioToggle = popup.querySelector(".wbe-explorer-bio");
  // (an ancestors chart without a family world, options.biological {shown, reload}: the person in the circle looked at)
  function plainBioChoice(person) {
    if (!person || person.hidden || !(person.bioFatherId || person.bioMotherId)) return null;
    const name = [person.name, person.lnab].filter(Boolean).join(" ") || person.wtid;
    return { id: Number(person.id), name, on: options.biological.shown.has(Number(person.id)) };
  }
  function currentBioChoice() {
    if (!world) return plainBioChoice(currentNode()?.person);
    // (in the tree, of a couple, the one with birth parents recorded: Patty Luker, not Pat Rockstrom who married her)
    const node = explorerView ? null : currentNode();
    const couple = node?.kind === "family" && Array.isArray(node.person?.couple) ? node.person.couple.filter(Boolean) : [];
    // (in a view with someone picked, theirs when they have any: Patty Luker in Terry's 3D view)
    const picked = explorerView?.api.selectedId?.() || 0;
    if (picked && world.bioChoice(picked)) return world.bioChoice(picked);
    const id = explorerView ? explorerView.api.currentId() : couple.map((member) => member.id).find((memberId) => world.bioChoice(memberId)) || treePersonId();
    return world.bioChoice(id);
  }
  function updateBioToggle() {
    if (!bioToggle) return;
    const choice = currentBioChoice();
    bioToggle.hidden = !choice;
    if (!choice) return;
    bioToggle.dataset.id = choice.id;
    bioToggle.querySelector("input").checked = choice.on;
    bioToggle.querySelector("span").textContent = `${choice.name}'s biological parents`;
    bioToggle.title = choice.on
      ? `Showing ${choice.name} with their biological parents. Untick for the parents who raised them.`
      : `Show ${choice.name} with their biological parents (on WikiTree as BioFather and BioMother) instead of the parents who raised them.`;
  }
  // The ancestors chart is loaded again with the choice (getPeople "ancestors" sends both lines), then flies to them.
  async function reloadWithBirthParents(id, on) {
    const { shown } = options.biological;
    const input = bioToggle.querySelector("input");
    if (on) shown.add(id);
    else shown.delete(id);
    input.disabled = true;
    try {
      const next = await options.biological.reload();
      if (!next?.person || !popup.isConnected) return;
      tree = next;
      options.biological.tree = next;
      state.doneKeys.clear();
      state.failedKeys.clear();
      relayout();
      const at = nodes.findIndex((node) => Number(node.person?.id) === id);
      flyTo(Math.max(0, at), reducedMotion() ? 0 : 700);
    } catch (error) {
      console.warn("wbe: Branches biological parents failed", error);
      if (on) shown.delete(id);
      else shown.add(id);
    } finally {
      input.disabled = false;
      updateBioToggle();
    }
  }
  bioToggle?.querySelector("input").addEventListener("change", (event) => {
    const id = Number(bioToggle.dataset.id);
    if (!world) return void reloadWithBirthParents(id, event.target.checked);
    world.setBiological(id, event.target.checked);
    if (!explorerView) return flyHome(reducedMotion() ? 0 : 700, id);
    // (the other views start again on them; the tree too, when it's next shown)
    state.restartTree = true;
    switchView(explorerView.name, false, id);
  });

  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");
  const crumbs = popup.querySelector(".wbe-fractal-crumbs");
  // Going up, always in view (user, 2026-10-11: "you also need to show how to zoom out and what the
  // zooming out should show"): "↑ Up to John Weatherall & Annie Thomason".
  const upButton = world ? document.createElement("button") : null;
  if (upButton) {
    upButton.type = "button";
    upButton.className = "wbe-fractal-up";
    upButton.dataset.act = "out";
    upButton.hidden = true;
    stage.appendChild(upButton);
  }
  // One line for a first visit, until the first click.
  let hint = null;
  if (world) {
    let seen = false;
    try {
      seen = Boolean(localStorage.getItem(HINT_KEY));
    } catch (error) {
      // (storage blocked: show it)
    }
    if (!seen) {
      hint = document.createElement("div");
      hint.className = "wbe-fractal-hint";
      hint.textContent = "Click a family to see their children. ↑ at the top goes back up to their parents.";
      stage.appendChild(hint);
    }
  }
  function dismissHint() {
    if (!hint) return;
    const shown = hint;
    hint = null;
    shown.classList.add("wbe-fractal-hint-gone");
    setTimeout(() => shown.remove(), 500);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch (error) {
      // (storage blocked: it shows again next time)
    }
  }
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const palette = {};
  let colouring = buildColouring(nodes, state.mode, palette);
  let width = 0;
  let height = 0;
  let frame = 0;
  const retryTimers = new Set();

  function resize() {
    const rect = stage.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const sized = Math.round(rect.width) !== Math.round(width) || Math.round(rect.height) !== Math.round(height);
    width = Math.max(rect.width, 50);
    height = Math.max(rect.height, 50);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    // The popup can settle its size after opening; keep the circle we flew to filling the view.
    if (sized && state.fitted >= 0 && nodes[state.fitted]) {
      canvasSelection.interrupt("fly");
      canvasSelection.call(zoomer.transform, fitNode(nodes[state.fitted], state.fittedFill));
    }
    draw();
  }

  function requestDraw() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      draw();
    });
  }

  /** A zoom transform that fits a node's circle in the view. */
  function fitNode(node, fill = 0.92) {
    const k = (Math.min(width, height) * fill) / (node.r * 2);
    return zoomIdentity.translate(width / 2 - node.x * k, height / 2 - node.y * k).scale(k);
  }

  function screenOf(node) {
    const t = state.transform;
    return { x: t.x + node.x * t.k, y: t.y + node.y * t.k, r: node.r * t.k };
  }

  function photoFor(person) {
    const url = photoUrl(person);
    if (!url) return null;
    let entry = photos.get(url);
    if (!entry) {
      const image = new Image();
      entry = { image, ready: false };
      image.onload = () => {
        entry.ready = true;
        requestDraw();
      };
      image.onerror = () => {
        // The sized thumbnail may not exist for small originals; fall back to the API's 75px one.
        const fallback = person.photoData?.url ? siteUrl(person.photoData.url) : "";
        if (fallback && image.src !== fallback) image.src = fallback;
      };
      image.src = url;
      photos.set(url, entry);
    }
    return entry.ready ? entry.image : null;
  }

  function onScreen(s) {
    return s.x + s.r >= 0 && s.x - s.r <= width && s.y + s.r >= 0 && s.y - s.r <= height;
  }

  function lit(node) {
    return !state.pulse || state.pulse.has(node.index);
  }

  function drawText(lines, x, y, size, colour, weight = 600) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, index) => {
      const lineSize = index === 0 ? size : size * 0.8;
      ctx.font = `${index === 0 ? weight : 400} ${lineSize}px ${FONT}`;
      ctx.fillStyle = colour;
      ctx.fillText(line, x, y + (index - (lines.length - 1) / 2) * size * 1.2);
    });
  }

  // Glass-bubble shading (user, 2026-10-11: "Still not pretty"): lighter towards the top left, deeper at
  // the rim, a soft shadow under the bigger circles and a small highlight. Fills the current path.
  function glassFill(s, colour, amount) {
    const shade = ctx.createRadialGradient(s.x - s.r * 0.35, s.y - s.r * 0.4, s.r * 0.05, s.x, s.y, s.r);
    shade.addColorStop(0, tint(colour, amount * 0.35));
    shade.addColorStop(0.65, tint(colour, amount));
    shade.addColorStop(1, tint(colour, Math.min(1, amount * 1.7 + 0.06)));
    ctx.save();
    if (s.r > 12) {
      ctx.shadowColor = "rgba(60,40,10,.18)";
      ctx.shadowBlur = Math.min(18, s.r * 0.08);
      ctx.shadowOffsetY = s.r * 0.02;
    }
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.restore();
    if (s.r > 20) {
      ctx.save();
      ctx.globalAlpha *= 0.35;
      ctx.beginPath();
      ctx.ellipse(s.x - s.r * 0.3, s.y - s.r * 0.55, s.r * 0.28, s.r * 0.13, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.restore();
    }
  }

  function drawLeaf(node, s, label) {
    // A round leaf pointing back down towards the fork, like OneZoom's.
    const point = Math.PI / 2 + node.angle; // the fork lies below and towards the centre
    const tipX = s.x + Math.cos(point) * s.r * 1.35;
    const tipY = s.y + Math.sin(point) * s.r * 1.35;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.arc(s.x, s.y, s.r, point + 0.7, point - 0.7 + Math.PI * 2);
    ctx.closePath();
    ctx.globalAlpha = lit(node) ? 1 : 0.25;
    const colour = state.mode === "plain" ? LEAF_PLAIN : colouring.fill(node.person);
    glassFill(s, colour, 0.4);
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.arc(s.x, s.y, s.r, point + 0.7, point - 0.7 + Math.PI * 2);
    ctx.closePath();
    ctx.lineWidth = Math.max(0.5, Math.min(EDGE_MAX, s.r * 0.05));
    ctx.strokeStyle = state.hover === node.index ? HIGHLIGHT : tint(colour, 0.8);
    ctx.stroke();
    const person = node.person;
    if (label === "card") return drawCard(node, s);
    if (label) return;
    if (s.r > 14) {
      const lines = wrapText(fullName(person), s.r > 45 ? 16 : 11, s.r > 30 ? 2 : 1);
      if (s.r > 34) {
        const life = years(person);
        if (life) lines.push(life);
      }
      const photo = person.photoData && s.r > 60;
      if (s.r > 80 && person.birthLocation) lines.push(...wrapText(person.birthLocation, 22, photo ? 1 : 2));
      // (the photo above, the words below it)
      if (photo) drawPortrait(person, s.x, s.y - s.r * 0.4, s.r * 0.26);
      drawText(lines, s.x, photo ? s.y + s.r * 0.3 : s.y, s.r * (photo ? 0.16 : 0.24), INK);
    }
  }

  /** Draws a person's circle and, once it is big enough, their family inside it. */
  function drawNode(node, s) {
    if (s.r < MIN_DRAW || !onScreen(s)) return;
    if (s.r >= 6) state.drawn?.push(node);
    state.shapes?.push(s);
    const label = labelStyle(node, s);
    if (label === "beside") state.labels?.push({ node, s });
    if (node.kind === "ghost" && !node.children.length) return drawGhost(node, s, label);
    if (node.leaf) {
      drawLeaf(node, s, label);
      if (node.focus) drawFocusRing(s);
      return;
    }
    const g = NESTED_GEOMETRY;
    ctx.globalAlpha = lit(node) ? 1 : 0.3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    // (alternate shades, so a circle stands out from the one it's in)
    glassFill(s, state.mode === "plain" ? PLAIN_EDGE : colouring.fill(node.person), node.depth % 2 ? 0.13 : 0.21);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(0.6, Math.min(EDGE_MAX, s.r * 0.02));
    ctx.strokeStyle = state.hover === node.index ? HIGHLIGHT : state.mode === "plain" ? PLAIN_EDGE : tint(colouring.fill(node.person), 0.7);
    // (a placeholder holding their other families: dashed, like the empty ones)
    if (node.kind === "ghost") ctx.setLineDash([Math.max(3, s.r * 0.05), Math.max(3, s.r * 0.04)]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (node.focus) drawFocusRing(s);
    if (label === "card") return drawCard(node, s);

    const inside = s.r >= MIN_INSIDE;
    if (inside) {
      // Trunk and branches to each child.
      const forkX = s.x;
      const forkY = s.y + g.fork * s.r;
      const kids = node.children.map((i) => nodes[i]);
      const total = node.weight - 1 || 1;
      ctx.strokeStyle = BRANCH;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(0.6, s.r * 0.03);
      // (a band only holds families side by side: no trunk)
      const band = node.kind === "band";
      if (!band && (kids.length || node.more)) {
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + g.trunkBase * s.r);
        ctx.lineTo(forkX, forkY);
        ctx.stroke();
      }
      kids.forEach((kid) => {
        if (band) return;
        const k = screenOf(kid);
        // Branches end at the foot of the child's circle (or the stalk of a leaf).
        const dx = forkX - k.x;
        const dy = forkY - k.y;
        const length = Math.hypot(dx, dy) || 1;
        const endX = k.x + (dx / length) * k.r;
        const endY = k.y + (dy / length) * k.r;
        ctx.lineWidth = Math.max(0.5, s.r * 0.025 * Math.sqrt(kid.weight / total) + s.r * 0.006);
        ctx.beginPath();
        ctx.moveTo(forkX, forkY);
        ctx.quadraticCurveTo(forkX + (endX - forkX) * 0.15, forkY - Math.abs(endY - forkY) * 0.6, endX, endY);
        ctx.stroke();
      });
      kids.forEach((kid) => drawNode(kid, screenOf(kid)));
      if (node.more && !node.children.length) drawMore(node, s, forkX, forkY);
      else if (world && node.expand && s.r >= EXPAND_AT) expandBranch(node);
    }

    // The person's name in the lower band (or centred while the circle is small), unless it has a label beside it.
    ctx.globalAlpha = lit(node) ? 1 : 0.3;
    if (s.r > 12 && !label) {
      const person = node.person;
      const textY = inside ? s.y + s.r * 0.62 : s.y;
      // Inside a circle the name is small beside the family above it, but never below about 10px.
      let size = inside ? Math.max(s.r * 0.085, Math.min(10.5, s.r * 0.15)) : s.r * 0.26;
      // Wrap to the width of the circle low down, where the text sits (about a radius across), so it stays inside.
      const fit = Math.max(8, Math.floor((s.r * (inside ? 1.0 : 1.5)) / (size * 0.55)));
      // A couple's names break at the "&"; a family shows when they married.
      const lines =
        node.kind === "band"
          ? ["The parents of", ...person.couple.split(" & ").flatMap((part, i) => wrapText(i ? `& ${part}` : part, inside ? Math.min(fit, 30) : 14, 1))]
          : node.kind === "family"
          ? fullName(person)
              .split(" & ")
              .flatMap((part, i) => wrapText(i ? `& ${part}` : part, inside ? Math.min(fit, 30) : 14, 1))
          : wrapText(fullName(person), inside ? Math.min(fit, 30) : 12, 2);
      const life = node.kind === "family" ? (yearOf(person.married) ? `m. ${yearOf(person.married)}` : "") : years(person);
      if (life && (inside ? s.r > 70 : s.r > 24)) lines.push(life);
      const spouse = node.kind === "ghost" && s.r > 40 ? ghostSpouse(node) : null;
      if (spouse) lines.push(...wrapText(`married ${fullName(spouse)} →`, inside ? Math.min(fit, 30) : 14, 2));
      if (inside && s.r > 260) {
        if (person.birthLocation) lines.push(...wrapText(person.birthLocation, Math.min(fit, 40), 1));
        const partial = hasFrontier(node.source);
        if (node.kind !== "band" && (node.children.length || !partial)) {
          lines.push(...wrapText(`${counted(node.children.length, childWord)} · ${partial ? "at least " : ""}${counted(node.weight - 1, which)}${partial ? " so far" : " in all"}`, fit, 2));
        }
      }
      // Keep the whole block in the band between the family above and the circle's foot.
      // (but no smaller than 9px: small circles have few lines anyway)
      if (inside) size = Math.max(Math.min(size, (s.r * 0.44) / (lines.length * 1.2)), Math.min(size, 9));
      // Portraits: a couple shows both of them (user, 2026-10-03: one photo for both "seems
      // wrong"), side by side, with initials for whoever has no photo; nothing when neither has one.
      const sitters = inside && s.r > 200 ? (node.kind === "family" && person.couple?.[1] ? person.couple : [person]) : [];
      const photo = sitters.some((sitter) => sitter?.photoData);
      if (photo) {
        const pr = s.r * 0.1;
        const py = s.y + s.r * 0.34;
        sitters.forEach((sitter, i) => {
          const px = sitters.length === 2 ? s.x + (i ? 1 : -1) * pr * 0.92 : s.x;
          drawPortrait(sitter, px, py, pr);
        });
      }
      drawText(lines, s.x, photo ? textY + s.r * 0.08 : textY, size, INK);
    }
  }

  /** One round portrait: their photo, or their initials on a plain disc. */
  function drawPortrait(sitter, px, py, pr) {
    const image = sitter?.photoData ? photoFor(sitter) : null;
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fillStyle = "#93a985";
    ctx.fill();
    if (image) {
      // (filling the circle without squashing: centred across, from the top, where the face usually is)
      ctx.clip();
      const w = image.naturalWidth || 1;
      const h = image.naturalHeight || 1;
      const k = (pr * 2) / Math.min(w, h);
      ctx.drawImage(image, px - (w * k) / 2, py - pr, w * k, h * k);
    } else if (!sitter?.photoData) {
      const initials = [sitter?.name, sitter?.lnab]
        .map((part) => String(part || "").trim().charAt(0))
        .join("")
        .toUpperCase();
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.font = `600 ${Math.round(pr * 0.7)}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials || "?", px, py + pr * 0.04);
    }
    ctx.restore();
    const ring = Math.max(1, pr * 0.08);
    ctx.lineWidth = ring;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.stroke();
    // (and a faint edge, so it shows on a pale circle)
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,.18)";
    ctx.beginPath();
    ctx.arc(px, py, pr + ring / 2 + 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  /** Someone whose family isn't loaded yet: a dashed bud above the fork, and a fetch once it's big enough. */
  function drawMore(node, s, forkX, forkY) {
    const budY = forkY - s.r * 0.42;
    const budR = s.r * 0.26;
    ctx.save();
    ctx.setLineDash([Math.max(2, budR * 0.12), Math.max(2, budR * 0.1)]);
    ctx.lineWidth = Math.max(0.6, s.r * 0.012);
    ctx.strokeStyle = "rgba(80,100,60,.45)";
    ctx.beginPath();
    ctx.arc(forkX, budY, budR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(forkX, forkY);
    ctx.lineTo(forkX, budY + budR);
    ctx.stroke();
    ctx.restore();
    if (budR > 14) {
      const text = state.loadingKeys.has(expandKey(node)) ? "Loading…" : which === "ancestors" ? "More ancestors" : "More family?";
      drawText([text], forkX, budY, Math.min(14, budR * 0.24), "rgba(34,48,58,.6)", 500);
    }
    if (s.r >= EXPAND_AT) expandBranch(node);
  }

  function expandKey(node) {
    return node.expand ? `${node.expand.mode}:${node.expand.id}` : node.source;
  }

  /** Fetches what lies beyond `node` (the next generations, or in the family world everyone near them) and grows it in place. */
  function expandBranch(node, urgent = false) {
    const key = expandKey(node);
    // (zooming out waits on its loads, so they go ahead of the others)
    if (state.loadingKeys.has(key) || state.doneKeys.has(key) || state.loading >= MAX_LOADING + (urgent ? 4 : 0)) return;
    const failed = state.failedKeys.get(key);
    if (failed && (failed.count >= EXPAND_TRIES || Date.now() - failed.at < EXPAND_RETRY_MS)) return;
    let job;
    if (world) {
      if (!node.expand) return;
      job = world.expand(node.expand);
    } else {
      const source = node.source;
      if (!options.onExpand || !source.more) return;
      job = Promise.resolve(options.onExpand(source.person))
        .then((branch) => graftBranch(source, branch))
        .catch((error) => {
          source.more = false;
          throw error;
        });
    }
    state.loadingKeys.add(key);
    state.loading += 1;
    // A failed fetch (WikiTree's bot check, a dropped connection) isn't the end: it's tried again a little later.
    let ok = true;
    Promise.resolve(job)
      .catch((error) => {
        ok = false;
        const before = state.failedKeys.get(key);
        state.failedKeys.set(key, { count: (before?.count || 0) + 1, at: Date.now() });
        console.warn("wbe: fractal tree branch failed", error);
      })
      .finally(() => {
        state.loadingKeys.delete(key);
        if (ok) state.doneKeys.add(key);
        state.loading -= 1;
        if (!popup.isConnected) return;
        relayout();
        climbWhenLoaded();
        if (!ok) {
          const timer = setTimeout(() => {
            retryTimers.delete(timer);
            if (popup.isConnected) draw();
          }, EXPAND_RETRY_MS + 50);
          retryTimers.add(timer);
        }
      });
  }

  /** Lays the tree out again after a branch grew. Existing circles keep their places, so the view doesn't move. */
  function relayout() {
    const keyOf = (node) => (node ? node.uid ?? node.source : null);
    const fittedSource = keyOf(nodes[state.fitted]);
    const focusSource = keyOf(nodes[state.focus]);
    ({ nodes } = buildLayout());
    // (no one left in the view's circle, say placeholders a later fetch replaced: back to the start)
    if (!nodes.length && world) {
      world.home();
      ({ nodes } = buildLayout());
    }
    roots = nodes.filter((node) => node.parent === -1);
    const indexOf = (key) => (key ? nodes.findIndex((node) => keyOf(node) === key) : -1);
    state.fitted = indexOf(fittedSource);
    state.focus = Math.max(0, indexOf(focusSource));
    state.hover = -1;
    state.labelBoxes = [];
    state.query = null;
    state.matches = [];
    state.crumbIndex = null;
    colouring = buildColouring(nodes, state.mode, palette);
    drawFooter();
    state.legendStale = true; // again once the new layout is drawn
    state.climbHints = null;
    updateCrumbs(focusedNode().index);
    updateUpButton();
    requestDraw();
    // More may have loaded at the edge, or a fast zoom may have gone past more than one generation.
    if (world && !state.settling && (state.rerootDepth || 0) < 30) {
      state.rerootDepth = (state.rerootDepth || 0) + 1;
      checkReroot();
      state.rerootDepth -= 1;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    if (!nodes.length) return;
    ctx.globalAlpha = 1;
    state.drawn = [];
    state.labels = [];
    state.shapes = [];
    roots.forEach((root) => drawNode(root, screenOf(root)));
    ctx.globalAlpha = 1;
    if (state.legendStale) {
      state.legendStale = false;
      drawFooter();
    }
    if (world) {
      drawGhostLinks();
      drawClimbHints();
    }
    drawLabels();
  }

  /**
   * How a circle inside the one being looked at says who it is: "card" (their photo and name in it), "beside"
   * (too small: a label next to it), or "" (big enough for its own family and name, or not in that circle).
   */
  function labelStyle(node, s) {
    if (node.parent < 0 || node.kind === "band" || s.r < LABEL_MIN || (!node.leaf && s.r >= CARD_MAX_FAMILY)) return "";
    const around = screenOf(nodes[node.parent]).r;
    // (a card in every circle that's open, its family drawn; labels beside only in the one being looked at)
    // A card too small for the first name has a label beside it instead (user, 2026-10-11: "Geor…", "Jos…").
    if (s.r >= CARD_MIN && nameFits(node, s)) return around >= CARD_MAX_FAMILY ? "card" : "";
    return around >= Math.min(width, height) * 0.3 || (s.r >= CARD_MIN && around >= CARD_MAX_FAMILY) ? "beside" : "";
  }

  /** Whether a card's first line (the first name, at the card's size) fits across the circle. */
  function nameFits(node, s) {
    const person = node.person;
    const blood = node.kind === "family" && person.couple?.[0] ? person.couple[0] : person;
    const given = String(blood.name || "").trim() || fullName(blood);
    ctx.font = `600 ${cardTextSize(s)}px ${FONT}`;
    return ctx.measureText(given).width <= s.r * 1.6;
  }

  const cardTextSize = (s) => Math.max(10, Math.min(20, s.r * 0.24));

  /** How many children someone has here (through each of their families). */
  function childCount(node) {
    if (node.leaf) return 0;
    return node.families ? node.children.reduce((sum, i) => sum + nodes[i].children.length, 0) : node.children.length;
  }

  /**
   * A circle as a card: their photo at the top, then as many of these as fit, each fitted to the circle's
   * width there: first name, surname, "& their husband or wife", years, "3 children".
   */
  function drawCard(node, s) {
    const person = node.person;
    const blood = node.kind === "family" && person.couple?.[0] ? person.couple[0] : person;
    const partner = node.kind === "family" ? person.couple?.[1] : node.kind === "ghost" ? ghostSpouse(node) : null;
    const size = cardTextSize(s);
    const lineHeight = size * 1.18;
    const photo = Boolean(blood.photoData) && s.r >= 26;
    if (photo) drawPortrait(blood, s.x, s.y - s.r * 0.42, s.r * 0.34);
    const top = photo ? s.y - s.r * 0.02 : s.y - s.r * 0.72;
    const bottom = s.y + s.r * (photo ? 0.84 : 0.72);
    const room = Math.max(1, Math.floor((bottom - top) / lineHeight));
    const given = String(blood.name || "").trim();
    const surname = String(blood.lnab || "").trim();
    const count = childCount(node);
    const wanted = [
      { key: "name", text: given || fullName(blood), bold: true, rank: 1 },
      { key: "surname", text: surname && !given.toLowerCase().split(/\s+/).includes(surname.toLowerCase()) ? surname : "", rank: 4 },
      { key: "partner", text: partner ? `& ${String(partner.name || "").trim() || fullName(partner)}` : "", rank: 3 },
      { key: "life", text: years(blood), quiet: true, rank: 2 },
      { key: "kids", text: count ? `${count} ${count === 1 ? "child" : "children"}` : "", quiet: true, rank: 5 },
      { key: "place", text: s.r >= 80 ? blood.birthLocation || "" : "", quiet: true, rank: 6 },
    ].filter((line) => line.text);
    const keep = new Set([...wanted].sort((a, b) => a.rank - b.rank).slice(0, room).map((line) => line.key));
    const lines = wanted.filter((line) => keep.has(line.key));
    const first = (top + bottom) / 2 - ((lines.length - 1) * lineHeight) / 2;
    ctx.save();
    ctx.globalAlpha = lit(node) ? 1 : 0.3;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, i) => {
      const y = first + i * lineHeight;
      const dy = Math.min(Math.abs(y - s.y) + lineHeight / 2, s.r * 0.98);
      const across = 2 * Math.sqrt(s.r * s.r - dy * dy) * 0.9;
      const font = `${line.bold ? 600 : 400} ${line.quiet ? size * 0.86 : size}px ${FONT}`;
      ctx.font = font;
      ctx.fillStyle = line.quiet ? "#4f5d66" : INK;
      ctx.fillText(fitWidth(line.text, font, Math.max(across, size * 2)), s.x, y);
    });
    ctx.restore();
  }

  /** A label's words: "Ted Weatherall", "& Mary Smith", "1898–1998", and whose photo goes beside them. */
  function labelText(node) {
    const person = node.person;
    const [name, partner] = fullName(person).split(" & ");
    const blood = node.kind === "family" && person.couple?.[0] ? person.couple[0] : person;
    const spouse = node.kind === "ghost" ? ghostSpouse(node) : null;
    return {
      name,
      first: String(name || "").split(/\s+/)[0],
      partner: partner ? `& ${partner}` : spouse ? `married ${fullName(spouse)}` : "",
      life: years(blood),
      // (a leaf has its photo inside it)
      sitter: blood.photoData && !(node.leaf && node.kind !== "ghost") ? blood : null,
    };
  }

  function fitWidth(text, font, max) {
    ctx.font = font;
    if (ctx.measureText(text).width <= max) return text;
    let cut = text;
    while (cut.length > 1 && ctx.measureText(`${cut}…`).width > max) cut = cut.slice(0, -1);
    return `${cut.trimEnd()}…`;
  }

  /** Where a label would go, below its circle or above it, and its lines fitted to width. */
  function labelBox(attempt, s) {
    const max = Math.max(130, Math.min(180, s.r * 3.4));
    const lines = attempt.lines.map((line) => ({ ...line, text: fitWidth(line.text, line.font, max) }));
    const textWidth = Math.max(
      ...lines.map((line) => {
        ctx.font = line.font;
        return ctx.measureText(line.text).width;
      })
    );
    const textHeight = lines.length * 14;
    const avatar = attempt.sitter ? Math.min(34, Math.max(24, textHeight)) : 0;
    const w = Math.ceil(textWidth + 14 + (avatar ? avatar + 6 : 0));
    const h = Math.max(textHeight, avatar) + 8;
    const x0 = s.x - w / 2;
    const y0 = attempt.below ? s.y + s.r + 4 : s.y - s.r - 4 - h;
    return { x0, y0, x1: x0 + w, y1: y0 + h, lines, avatar, sitter: attempt.sitter };
  }

  /**
   * The labels, biggest circle (and the person the world is about) first, each below its circle or else above
   * it, or else just the first name; one that would cover another label or circle is left out (hover shows it).
   */
  function drawLabels() {
    state.labelBoxes = [];
    const labels = (state.labels || []).sort((a, b) => Number(b.node.focus) - Number(a.node.focus) || b.s.r - a.s.r);
    if (!labels.length) return;
    const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    // Every circle drawn, not only the labelled ones (user's screenshot: "Elizabeth Ware" over James Ware's
    // family; "Someone's hidden"), except the ones the labelled circle sits inside.
    const touches = (box, c) => Math.hypot(c.x - Math.max(box.x0, Math.min(c.x, box.x1)), c.y - Math.max(box.y0, Math.min(c.y, box.y1))) < c.r;
    const holds = (c, s) => c !== s && Math.hypot(c.x - s.x, c.y - s.y) < c.r;
    const free = (box, s) =>
      box.x0 >= 2 &&
      box.y0 >= 2 &&
      box.x1 <= width - 2 &&
      box.y1 <= height - 2 &&
      !state.labelBoxes.some((other) => overlaps(box, other)) &&
      !(state.shapes || []).some((c) => c !== s && !holds(c, s) && touches(box, c));
    labels.forEach(({ node, s }) => {
      const text = labelText(node);
      const full = [
        { text: text.name, font: `600 12px ${FONT}`, colour: INK },
        text.partner && { text: text.partner, font: `400 11px ${FONT}`, colour: INK },
        text.life && { text: text.life, font: `400 10.5px ${FONT}`, colour: "#5d6a72" },
      ].filter(Boolean);
      const short = [{ text: text.first || text.name, font: `600 12px ${FONT}`, colour: INK }];
      const attempts = [
        { lines: full, sitter: text.sitter, below: true },
        { lines: full, sitter: text.sitter, below: false },
        { lines: short, sitter: null, below: true },
        { lines: short, sitter: null, below: false },
      ];
      for (const attempt of attempts) {
        const box = labelBox(attempt, s);
        if (!free(box, s)) continue;
        paintLabel(node, box);
        state.labelBoxes.push({ x0: box.x0, y0: box.y0, x1: box.x1, y1: box.y1, index: node.index });
        break;
      }
    });
  }

  function paintLabel(node, box) {
    const { x0, y0, x1, y1, lines, avatar, sitter } = box;
    const hovered = state.hover === node.index;
    ctx.save();
    ctx.globalAlpha = lit(node) ? 1 : 0.35;
    ctx.shadowColor = "rgba(0,0,0,.16)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 8);
    else ctx.rect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = "rgba(255,255,255,.96)";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = hovered || node.focus ? 2 : 1;
    ctx.strokeStyle = hovered ? HIGHLIGHT : node.focus ? FOCUS_RING : state.mode === "plain" ? PLAIN_EDGE : colouring.fill(node.person);
    ctx.stroke();
    let textX = (x0 + x1) / 2;
    ctx.textAlign = "center";
    if (avatar) {
      drawPortrait(sitter, x0 + 5 + avatar / 2, (y0 + y1) / 2, avatar / 2);
      textX = x0 + 5 + avatar + 6;
      ctx.textAlign = "left";
    }
    ctx.textBaseline = "middle";
    const top = (y0 + y1) / 2 - ((lines.length - 1) * 14) / 2;
    lines.forEach((line, i) => {
      ctx.font = line.font;
      ctx.fillStyle = line.colour;
      ctx.fillText(line.text, textX, top + i * 14);
    });
    ctx.restore();
  }

  /** The person the family world is about: a gold ring, so they can be found again. */
  function drawFocusRing(s) {
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(1.5, s.r * 0.06);
    ctx.strokeStyle = FOCUS_RING;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r + ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  /** While the family world's root circle is small: under it, what zooming out will show. */
  function drawClimbHints() {
    const root = nodes[0];
    const s = screenOf(root);
    if (!root || s.r > Math.min(width, height) * 0.42 || s.r < 20 || s.y + s.r + 28 > height) return;
    if (!state.climbHints) {
      const step = root.kind === "band" ? null : world.climb();
      state.climbHints = !step
        ? "Zoom out of either family for its parents"
        : step.status === "none"
        ? "No parents recorded above this family"
        : step.back
        ? "Zoom out to go back up"
        : "Zoom out for both sets of parents";
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `400 12px ${FONT}`;
    ctx.fillStyle = "#777";
    ctx.fillText(state.climbHints, s.x, s.y + s.r + 10);
  }

  /** The circle a placeholder stands in for (someone shown in their spouse's family), by index. */
  function ghostTarget(node) {
    if (node._target === undefined) node._target = nodes.findIndex((other) => other.uid === node.ghostOf);
    return node._target;
  }

  /** Who a placeholder married: the other half of the couple's circle it stands for. */
  function ghostSpouse(node) {
    const target = nodes[ghostTarget(node)];
    return (target?.person.couple || []).find((person) => person && person.id !== node.person.id) || null;
  }

  /** Someone who married into another family in view: a dashed circle in their own family. */
  function drawGhost(node, s, label) {
    ctx.save();
    ctx.globalAlpha = lit(node) ? 1 : 0.3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.fill();
    ctx.setLineDash([Math.max(3, s.r * 0.14), Math.max(3, s.r * 0.1)]);
    ctx.lineWidth = Math.max(1, s.r * 0.05);
    ctx.strokeStyle = state.hover === node.index ? HIGHLIGHT : state.mode === "plain" ? PLAIN_EDGE : colouring.fill(node.person);
    ctx.stroke();
    ctx.restore();
    if (label === "card") return drawCard(node, s);
    if (s.r > 10 && !label) {
      const lines = wrapText(fullName(node.person), s.r > 45 ? 16 : 11, s.r > 30 ? 2 : 1);
      const life = years(node.person);
      if (s.r > 30 && life) lines.push(life);
      const spouse = s.r > 24 ? ghostSpouse(node) : null;
      if (spouse) lines.push(...wrapText(`married ${fullName(spouse)} →`, s.r > 45 ? 18 : 13, 2));
      drawText(lines, s.x, s.y, s.r * 0.2, INK);
    }
  }

  /** Dotted lines from each placeholder to the couple's circle it stands for. */
  function drawGhostLinks() {
    (state.drawn || []).forEach((node) => {
      if (node.kind !== "ghost") return;
      const target = nodes[ghostTarget(node)];
      if (!target) return;
      const a = screenOf(node);
      const b = screenOf(target);
      if (b.r < 2) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const startX = a.x + (dx / d) * a.r;
      const startY = a.y + (dy / d) * a.r;
      const endX = b.x - (dx / d) * b.r;
      const endY = b.y - (dy / d) * b.r;
      ctx.save();
      ctx.globalAlpha = lit(node) || lit(target) ? 0.9 : 0.3;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = FOCUS_RING;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo((startX + endX) / 2, Math.min(startY, endY) - d * 0.2, endX, endY);
      ctx.stroke();
      ctx.restore();
    });
  }

  /** The smallest drawn circle under the pointer. */
  function nodeAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const label = (state.labelBoxes || []).find((box) => px >= box.x0 && px <= box.x1 && py >= box.y0 && py <= box.y1);
    if (label && nodes[label.index]) return nodes[label.index];
    let found = null;
    const visit = (node) => {
      const s = screenOf(node);
      if (s.r < Math.max(MIN_DRAW, 3)) return;
      const dx = px - s.x;
      const dy = py - s.y;
      const reach = node.leaf ? s.r * 1.2 : s.r;
      if (dx * dx + dy * dy > reach * reach) return;
      found = node;
      // (a card hides the family inside it)
      if (!node.leaf && s.r >= MIN_INSIDE && labelStyle(node, s) !== "card") node.children.forEach((i) => visit(nodes[i]));
    };
    roots.forEach(visit);
    return found;
  }

  function lineOf(index) {
    const set = new Set();
    for (let i = index; i >= 0 && nodes[i]; i = nodes[i].parent) set.add(i);
    return set;
  }

  /** The deepest circle that holds the middle of the view and fills most of it. */
  function focusedNode() {
    let found = nodes[0];
    const visit = (node) => {
      const s = screenOf(node);
      const dx = width / 2 - s.x;
      const dy = height / 2 - s.y;
      if (dx * dx + dy * dy > s.r * s.r || s.r < Math.min(width, height) * 0.3) return;
      found = node;
      node.children.forEach((i) => visit(nodes[i]));
    };
    roots.forEach(visit);
    return found;
  }

  /** The person in the middle of the view (or the nearest one around them), for the chart links. */
  function focusedPersonKey() {
    let node = focusedNode();
    while (node && !node.person?.wtid) node = nodes[node.parent];
    return node?.person?.wtid || options.linkKey || "";
  }

  function showTip(event, node) {
    const rect = stage.getBoundingClientRect();
    const person = node.person;
    const born = [person.birth, person.birthLocation].filter(Boolean).join(", ");
    const died = person.death || "";
    const count = node.children.length;
    const target = node.kind === "ghost" ? nodes[ghostTarget(node)] : null;
    const family = world
      ? target
        ? `Married into another family here: the dotted line leads to ${fullName(target.person)}. Click to go there.`
        : node.kind === "band"
        ? `${count} families, side by side.`
        : node.more && !count
        ? "Their family isn't loaded yet: zoom in to load it."
        : node.families
        ? `${count} families: one circle for each partner.`
        : count
        ? `${count} ${count === 1 ? "child" : "children"}.`
        : "No children recorded."
      : node.more
      ? `More ${which} beyond this point: zoom in to load them.`
      : node.leaf
      ? which === "ancestors"
        ? "No parents recorded yet."
        : "No children recorded."
      : `${counted(node.children.length, childWord)}; ${counted(node.weight - 1, which)} in all.`;
    const heading = node.kind === "family" ? "Family" : node.kind === "band" ? "Families" : world ? "" : `Generation ${node.depth}`;
    tip.innerHTML = `${heading ? `<div class="wbe-chart-tip-rel">${heading}</div>` : ""}
      <b>${escapeText(fullName(person))}</b>${person.wtid ? ` <span style="opacity:.7">(${escapeText(person.wtid)})</span>` : ""}
      ${born ? `<div>Born: ${escapeText(born)}</div>` : ""}${died ? `<div>Died: ${escapeText(died)}</div>` : ""}
      <div>${escapeText(family)}</div>
      <div class="wbe-chart-tip-hint">${node.leaf ? "" : "Click to zoom in · "}${node.kind === "band" ? "" : "Shift-click to open the profile"}</div>`;
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
    tip.style.top = `${Math.min(event.clientY - rect.top + 14, rect.height - 120)}px`;
    tip.style.opacity = "1";
  }

  function updateCrumbs(index) {
    if (index === state.crumbIndex) return;
    state.crumbIndex = index;
    updateBioToggle();
    const trail = [...lineOf(index)].reverse();
    crumbs.innerHTML = "";
    trail.forEach((i, position) => {
      if (position) crumbs.appendChild(document.createTextNode(" › "));
      const button = document.createElement("button");
      button.type = "button";
      button.className = "wbe-chart-crumb";
      button.textContent = fullName(nodes[i].person);
      button.disabled = i === index;
      button.addEventListener("click", () => flyTo(i));
      crumbs.appendChild(button);
    });
  }

  const zoomer = d3zoom()
    // The family world's units shrink and grow as its root moves (they're reset when a gesture ends).
    .scaleExtent(world ? [1e-12, 1e15] : [0.05, 1e9])
    .on("zoom", (event) => {
      // Which way the view is going: the family world's root climbs only going out and comes down only going in
      // (right after a climb, the family holding the old root can already fill the view).
      const change = event.transform.k / state.transform.k;
      if (!state.settling && Math.abs(change - 1) > 1e-3) state.zoomDir = change < 1 ? -1 : 1;
      state.transform = event.transform;
      const source = event.sourceEvent;
      if (source) {
        state.fitted = -1; // the user has moved the view themselves
        state.fitAfterClimb = false;
        state.pendingClimb = false;
      }
      if (source && Number.isFinite(source.clientX)) {
        const rect = canvas.getBoundingClientRect();
        state.pointer = { x: source.clientX - rect.left, y: source.clientY - rect.top };
      } else if (!source) state.pointer = null;
      tip.style.opacity = "0";
      if (world) checkReroot();
      requestDraw();
    })
    .on("start", () => (state.climbedUp = false))
    .on("end", () => {
      if (world) settleWorld();
      if (colouring.legendFor) {
        state.legendStale = true;
        requestDraw();
      }
      state.focus = focusedNode().index;
      updateCrumbs(state.focus);
      updateUpButton();
    });
  const canvasSelection = select(canvas);
  canvasSelection.call(zoomer).on("dblclick.zoom", null);

  /**
   * The family world moves its root as you zoom: out past a small root circle, back
   * the way you came or up to both sets of parents of its couple (of the family
   * you're zooming out of, when it holds two), loading them first if need be;
   * in, to a couple's circle that fills the view. The circle you were looking at
   * keeps its place, so the view doesn't jump.
   */
  function checkReroot() {
    if (state.holdReroot || !nodes.length) return;
    const half = Math.min(width, height) / 2;
    const root = nodes[0];
    const s = screenOf(root);
    if (s.r < half * 0.5) {
      if (state.zoomDir > 0) return;
      // One generation up per gesture: a fast zoom would otherwise chain climbs (and pick each side blind).
      if (state.climbedUp) return;
      const choice = root.kind === "band" ? familyOutOf(root) : null;
      let from = choice?.family || null;
      let step = world.climb(from?.couple);
      // Not pointing at either: when his family has no parents on record, go up hers.
      if (step.status === "none" && choice && !choice.under && choice.other) {
        from = choice.other;
        step = world.climb(from.couple);
      }
      if (step.status === "ready" && !step.back) state.climbedUp = true;
      if (step.status === "ready") return reroot(step.root, from && !step.back ? from.uid : root.uid, step.back ? "back" : "up");
      if (step.status === "load") step.ids.forEach((id) => expandBranch({ expand: { mode: "ancestors", id } }, true));
      return;
    }
    if (state.zoomDir < 0) return;
    let target = null;
    const visit = (node) => {
      const t = screenOf(node);
      const dx = width / 2 - t.x;
      const dy = height / 2 - t.y;
      if (t.r < half * 0.9 || dx * dx + dy * dy > t.r * t.r) return;
      // (the families either side of a couple stay in their band: you look into them without the view changing)
      if (node !== root && node.couple && !node.side) target = node;
      node.children.forEach((i) => visit(nodes[i]));
    };
    visit(root);
    if (target) reroot(target.couple, target.uid, "down");
  }

  /**
   * Of the two families side by side in `band` (his, hers), the one being zoomed out of ({family, under, other}):
   * the one under the pointer, or else his (after a climb the pointer sits on the couple in the middle, so the surname line
   * carries on rather than a near guess between the two).
   */
  function familyOutOf(band) {
    const families = band.children.map((i) => nodes[i]).filter((node) => node.side);
    const point = state.pointer || { x: width / 2, y: height / 2 };
    const under = families.find((node) => {
      const t = screenOf(node);
      return Math.hypot(point.x - t.x, point.y - t.y) <= t.r;
    });
    const family = under || families[0];
    return family ? { family, under: Boolean(under), other: families.find((node) => node !== family) || null } : null;
  }

  function reroot(root, anchorUid, how) {
    if (!world.reroot(root, anchorUid, nodes, how)) return;
    relayout();
    if (state.fitAfterClimb && how !== "down") {
      state.fitAfterClimb = false;
      setTimeout(() => popup.isConnected && flyTo(0, 700), 0);
    }
  }

  /** After a gesture: back to plain units (the root circle radius 1), with the zoom changed to match. */
  function settleWorld() {
    if (state.settling) return;
    const { scale, x, y } = world.normalise();
    if (scale === 1 && !x && !y) return;
    const t = state.transform;
    state.settling = true;
    relayout();
    canvasSelection.call(zoomer.transform, zoomIdentity.translate(t.x + x * t.k, t.y + y * t.k).scale(t.k * scale));
    state.settling = false;
  }

  /**
   * The family world's start: the person themselves (their family filling the view, or among their brothers
   * and sisters when they have none), inside their parents' circle. (User, 2026-10-11: it opened on the parents.)
   */
  // (to `personId`'s parents' family, or the person the Explorer is about)
  function flyHome(duration = 1000, personId = 0) {
    canvasSelection.interrupt("fly");
    world.home(personId || undefined);
    relayout();
    state.holdReroot = true;
    canvasSelection.call(zoomer.transform, fitNode(nodes[0], 0.15));
    const at = personId ? nodes.findIndex((node) => node.depth > 0 && node.person?.id === personId) : -1;
    flyTo(Math.max(0, at >= 0 ? at : nodes.findIndex((node) => node.focus)), duration)
      ?.on("end.hold", () => (state.holdReroot = false))
      .on("interrupt.hold", () => (state.holdReroot = false));
  }

  function flyTo(index, duration = 1200) {
    const node = nodes[index];
    if (!node) return;
    // A leaf has nothing inside, so show it with its siblings around it.
    state.fitted = index;
    state.fittedFill = node.leaf && node.parent >= 0 ? 0.45 : 0.92;
    const target = fitNode(node, state.fittedFill);
    return canvasSelection.transition("fly").duration(reducedMotion() ? 0 : duration).ease(easeCubicInOut).call(zoomer.transform, target);
  }

  canvas.addEventListener("mousemove", (event) => {
    const node = nodeAt(event.clientX, event.clientY);
    const index = node ? node.index : -1;
    if (index !== state.hover) {
      state.hover = index;
      canvas.style.cursor = node ? "pointer" : "grab";
      requestDraw();
    }
    if (node) showTip(event, node);
    else tip.style.opacity = "0";
  });
  canvas.addEventListener("mouseleave", () => {
    state.hover = -1;
    tip.style.opacity = "0";
    requestDraw();
  });
  /** Up one circle: from someone to their parents' family (past a circle that only holds someone's families). */
  function upIndex() {
    const current = currentNode();
    let up = current?.parent ?? -1;
    if (up >= 0 && nodes[up].families && nodes[up].parent >= 0) up = nodes[up].parent;
    return up;
  }

  /** After "Up" asked for the family above to load: once nothing is loading, go up to it. */
  function climbWhenLoaded() {
    if (!state.pendingClimb || state.loading) return;
    state.pendingClimb = false;
    goUp(true);
  }

  function goUp(retry = false) {
    if (!retry) state.climbTries = 0;
    dismissHint();
    const up = upIndex();
    if (up >= 0) {
      flyTo(up, 900);
      return;
    }
    // At the top of what's laid out, with the family above already loaded: move up to it and fit it (zooming out
    // until a climb happened could climb twice: live on Weatherall-111, "Up" went from Ted to his great-grandparents).
    const root = nodes[0];
    if (root && world) {
      state.pointer = null;
      const choice = root.kind === "band" ? familyOutOf(root) : null;
      let from = choice?.family || null;
      let step = world.climb(from?.couple);
      if (step.status === "none" && choice?.other) {
        from = choice.other;
        step = world.climb(from.couple);
      }
      if (step.status === "ready") {
        canvasSelection.interrupt("fly");
        state.holdReroot = true;
        state.fitAfterClimb = false;
        reroot(step.root, from && !step.back ? from.uid : root.uid, step.back ? "back" : "up");
        const release = () => (state.holdReroot = false);
        const flight = flyTo(0, 900);
        if (flight) flight.on("end.hold", release).on("interrupt.hold", release);
        else release();
        return;
      }
      if (step.status === "none") return;
      // Not loaded yet: load it, then climb once it's in (zooming out and waiting climbed when the user next moved,
      // and left the view half-size meanwhile: live on Weatherall-111).
      if (step.status === "load" && (state.climbTries || 0) < 2) {
        state.climbTries = (state.climbTries || 0) + 1;
        state.pendingClimb = true;
        step.ids.forEach((id) => expandBranch({ expand: { mode: "ancestors", id } }, true));
        if (!state.loading) climbWhenLoaded();
        return;
      }
    }
    // Otherwise: step back about a generation around the middle of the view (the root moves up on the way),
    // then settle on the family it climbs to (after it loads, if need be).
    state.fitAfterClimb = true;
    const t = state.transform;
    state.fitted = -1;
    state.pointer = null;
    const k = t.k / 2.5;
    const cx = (width / 2 - t.x) / t.k;
    const cy = (height / 2 - t.y) / t.k;
    const target = zoomIdentity.translate(width / 2 - cx * k, height / 2 - cy * k).scale(k);
    canvasSelection.transition("fly").duration(reducedMotion() ? 0 : 800).ease(easeCubicInOut).call(zoomer.transform, target);
  }

  /** What going up shows: the circle around this one, or the family the view's root climbs to. */
  function upText() {
    const up = upIndex();
    if (up >= 0) {
      const node = nodes[up];
      return node.kind === "band" ? `both sets of parents of ${node.person.couple}` : fullName(node.person);
    }
    const root = nodes[0];
    if (!root) return "";
    const choice = root.kind === "band" ? familyOutOf(root) : null;
    let step = world.climb(choice?.family?.couple);
    if (step.status === "none" && choice?.other) step = world.climb(choice.other.couple);
    if (step.status === "none") return null;
    return step.status === "ready" ? world.describe?.(step.root) || "" : "";
  }

  function updateUpButton() {
    if (!upButton) return;
    const text = upText();
    upButton.hidden = text === null;
    if (text === null) return;
    upButton.textContent = text ? `↑ Up to ${text}` : "↑ Up a generation";
    upButton.title = "Zoom out to the parents' family (or scroll out)";
    popup.querySelector('[data-act="out"]')?.setAttribute("title", upButton.textContent);
  }

  /** The circle being looked at: the one flown to, or else the one filling the view. */
  function currentNode() {
    return state.fitted >= 0 && nodes[state.fitted] ? nodes[state.fitted] : focusedNode();
  }

  /**
   * One level at a time (user, 2026-10-11: a click jumped two generations): of the circles between the
   * one being looked at (or the nearest circle around it) and the one clicked, the first.
   */
  function oneLevelToward(node) {
    const current = currentNode();
    if (!current) return node;
    const around = lineOf(current.index);
    let step = node.index;
    for (let i = node.index; i >= 0; i = nodes[i].parent) {
      if (around.has(i)) break;
      step = i;
    }
    return nodes[step] || node;
  }

  canvas.addEventListener("click", (event) => {
    dismissHint();
    const node = nodeAt(event.clientX, event.clientY);
    if (!node) return;
    if ((event.shiftKey || event.metaKey || event.ctrlKey) && node.person?.wtid) {
      window.open(profileUrl(node.person.wtid), "_blank", "noopener,noreferrer");
      return;
    }
    if (node.kind === "ghost" && ghostTarget(node) >= 0) return flyTo(ghostTarget(node));
    flyTo(oneLevelToward(node).index);
  });

  const search = popup.querySelector(".wbe-fractal-search");
  // In the Family and Galaxy views, Enter finds someone among everyone loaded and moves to them.
  const viewSearch = { query: "", ids: [], at: -1 };
  search.addEventListener("keydown", (event) => {
    if (!explorerView || event.key !== "Enter") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const query = search.value.trim().toLowerCase();
    if (!query) return;
    if (viewSearch.query !== query) {
      viewSearch.query = query;
      viewSearch.ids = [...world.raw.people.values()]
        .filter((person) => !person.hidden && `${person.name} ${person.lnab} ${person.wtid}`.toLowerCase().includes(query))
        .map((person) => person.id);
      viewSearch.at = -1;
    }
    if (!viewSearch.ids.length) {
      search.title = "No one loaded matches";
      search.style.borderColor = "#e0533d";
      return;
    }
    search.style.borderColor = "";
    viewSearch.at = (viewSearch.at + 1) % viewSearch.ids.length;
    search.title = `${viewSearch.at + 1} of ${viewSearch.ids.length} (Enter for the next)`;
    explorerView.api.centre(viewSearch.ids[viewSearch.at]);
  });
  bindFractalSearch(search, {
    state,
    getNodes: () => nodes,
    lineOf,
    flyTo,
    requestDraw,
    flyDuration: 1600,
    pulseDuration: 3000,
  });

  function drawFooter() {
    updateBioToggle();
    const leaves = nodes.filter((node) => node.leaf).length;
    const deepest = nodes.reduce((max, node) => Math.max(max, node.depth), 0);
    const partial = world || hasFrontier(tree);
    // While lines go beyond what's loaded there's no grand total (ancestors can run to millions).
    popup.querySelector(".wbe-chart-stats").innerHTML = world
      ? world.stats()
      : partial
      ? `<strong>${(nodes.length - 1).toLocaleString()}+</strong>${which} loaded · ${deepest} generations so far · zoom in for more`
      : `<strong>${(nodes.length - 1).toLocaleString()}</strong>${which} · ${deepest} generations · ${leaves} leaves`;
    const legend = popup.querySelector(".wbe-chart-legend");
    legend.innerHTML = "";
    const items = colouring.legendFor ? colouring.legendFor(state.drawn || nodes) : colouring.legend;
    legend.title = colouring.legendFor ? "In view now (the key changes as you zoom)" : "";
    items.forEach((item) => {
      const span = document.createElement("span");
      span.innerHTML = `<i style="background:${item.colour}"></i>${moreTextToHtml(item.label)}`;
      span.addEventListener("mouseenter", () => {
        const matches = nodes.filter((node) =>
          item.key === "plain" ? node.leaf : item.match ? item.match(node.person) : colouring.key(node.person) === item.key
        );
        // Keep the circles that lead to a match lit too, so the matches can be seen inside them.
        state.pulse = new Set();
        matches.forEach((node) => lineOf(node.index).forEach((i) => state.pulse.add(i)));
        requestDraw();
      });
      span.addEventListener("mouseleave", () => {
        state.pulse = null;
        requestDraw();
      });
      legend.appendChild(span);
    });
    popup.querySelectorAll(".wbe-chart-mode").forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
  }

  /** The person the tree is showing, for the other views to start from. */
  function treePersonId() {
    const raw = world.raw;
    const node = currentNode();
    if (!node || node.focus || node.kind === "band") return raw.focusId;
    const person = node.person || {};
    if (node.kind === "family" && Array.isArray(person.couple)) {
      // (of the couple, the one whose parents are here: the relative, not the one who married in)
      const blood = person.couple.find((member) => member && raw.people.has(raw.people.get(member.id)?.fatherId || raw.people.get(member.id)?.motherId));
      return (blood || person.couple[0] || person).id || raw.focusId;
    }
    return person.id || raw.focusId;
  }

  let explorerView = null; // {name, host, api} while the Family or Galaxy view is showing
  // (again: the same view built afresh, starting on that person; for the "Biological parents" option)
  function switchView(name, remember = true, again = 0) {
    const showing = explorerView?.name || "tree";
    if (!world?.raw || (name === showing && !again)) return;
    const startId = again || (explorerView ? explorerView.api.currentId() : treePersonId());
    if (explorerView) {
      explorerView.api.destroy();
      explorerView.host.remove();
      explorerView = null;
    }
    popup.classList.toggle("wbe-explorer-alt", name !== "tree");
    popup.classList.toggle("wbe-explorer-galaxy", name === "galaxy");
    popup.classList.toggle("wbe-explorer-3d", name === "3d");
    popup.querySelectorAll("[data-view]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.view === name)));
    if (name === "tree" && state.restartTree) {
      // (round whoever the other view is on now, not the one switched: live, Terry's view after Patty's switch)
      state.restartTree = false;
      flyHome(0, startId);
      resize();
    } else if (name === "tree") {
      // (the other view may have loaded more people)
      relayout();
      resize();
    } else {
      const host = document.createElement("div");
      host.className = "wbe-explorer-host";
      stage.appendChild(host);
      const refreshStats = () => {
        popup.querySelector(".wbe-chart-stats").innerHTML = world.stats();
        updateBioToggle();
      };
      const mount = name === "galaxy" ? mountFamilyGalaxy : name === "3d" ? mountFamily3d : mountFamilyNavigator;
      // (the 3D view fetches ancestors further back; a prompt can name its shape: "my fan tower")
      const mounted = mount(host, { world: world.raw, load: world.load, loadAncestors: world.loadAncestors, loadNearby: world.loadNearby, shape: options.shape, startId, onCentre: refreshStats, onSelect: updateBioToggle });
      explorerView = { name, host, api: mounted };
      // (a view can report its centre while mounting, before it's explorerView: the switch then named the tree's person)
      updateBioToggle();
    }
    if (!remember) return;
    try {
      localStorage.setItem(VIEW_KEY, name);
    } catch (error) {
      // (storage blocked: the tree opens next time)
    }
  }

  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.classList.contains("wbe-chart-crumb")) return;
    const act = button.dataset.act;
    if (button.classList.contains("close-popup")) {
      closeChartPopup(popup);
    } else if (button.dataset.link) {
      chartLinkClick(popup, button, options.links, focusedPersonKey());
    } else if (button.dataset.view) {
      switchView(button.dataset.view);
    } else if (button.dataset.mode) {
      state.mode = button.dataset.mode;
      colouring = buildColouring(nodes, state.mode, palette);
      drawFooter();
      requestDraw();
    } else if (act === "layout") options.onSwitchLayout?.();
    else if (act === "which") {
      switchFractalWhich(button, () => options.onSwitchWhich?.());
    }
    else if (act === "reset" && explorerView) explorerView.api.home();
    else if (act === "reset") (world ? flyHome(1000) : flyTo(0, 1000));
    else if (act === "out" && explorerView) explorerView.api.up();
    else if (act === "out" && world) goUp();
    else if (act === "out") {
      const parent = nodes[focusedNode().index]?.parent ?? -1;
      flyTo(parent >= 0 ? parent : 0, 900);
    } else if (act === "full") {
      toggleChartFullScreen(popup);
    } else if (act === "png" && explorerView?.api.canvas) {
      saveFractalPng(explorerView.api.canvas, tree, button);
    } else if (act === "png") {
      saveFractalPng(canvas, tree, button);
    }
  });

  mountChartPopup(popup, () => {
    cancelAnimationFrame(frame);
    retryTimers.forEach(clearTimeout);
    retryTimers.clear();
    clearTimeout(state.pulseTimer);
    canvasSelection.interrupt("fly");
    canvasSelection.on(".zoom", null);
    explorerView?.api.destroy();
  }, {
    stage,
    resize: () => {
      resize();
      explorerView?.api.resize();
    },
  });
  resize();
  drawFooter();
  updateCrumbs(0);
  if (world) {
    flyHome(reducedMotion() ? 0 : 1000);
    // (the Family view first, the easiest to read (user, 2026-10-11: "I might want to change the default
    // explorer view to Family"); after that, whichever view was used last)
    // (a view the prompt named comes first: "my galaxy")
    let saved = options.view || "family";
    try {
      if (!options.view) saved = localStorage.getItem(VIEW_KEY) || "family";
    } catch (error) {
      // (storage blocked: the Family view)
    }
    if (EXPLORER_VIEWS.some((view) => view.key === saved)) switchView(saved, false);
  } else if (nodes.length && !reducedMotion()) {
    // Open from a distance and glide in to the whole tree.
    canvasSelection.call(zoomer.transform, fitNode(nodes[0], 0.15));
    flyTo(0, 1000);
  }
  return popup;
}
