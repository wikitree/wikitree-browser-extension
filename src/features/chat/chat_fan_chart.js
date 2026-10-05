// The fan chart popup, drawn with d3. Data comes from chat_fan_chart_data.js.
// Arcs sweep out a generation at a time; hovering a person lights their line
// back to the root; the legend highlights its matches; double-click re-centres
// on an ancestor (through options.onRecenter); wheel/drag zooms and pans.

import $ from "jquery";
import { select } from "d3-selection";
import "d3-transition";
import { arc as d3arc } from "d3-shape";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import { scaleSequential } from "d3-scale";
import { interpolateSpectral, interpolateYlGn, schemeTableau10 } from "d3-scale-chromatic";
import { interpolate } from "d3-interpolate";
import { easeCubicOut, easeBackOut } from "d3-ease";
import { hsl } from "d3-color";
import { generationOfSlot, fanChartStats, fanChartCountries, fanChartRepeats, fanChartSurnames, yearOf } from "./chat_fan_chart_data";
import { buildOriginsSeries } from "./chat_origins_data";
import { showOriginsPopup } from "./chat_origins_chart";
import { buildMigration } from "./chat_migration_data";
import { showMigrationMapPopup } from "./chat_migration_map";
import { PARENT_STATUSES, autosomalShare, dnaLineAncestors, dnaLineCarrierNote, dnaLineOf, lineTestSummary, parentLinkStatus, parentStatusCounts, percentText, xDnaShares } from "./chat_dna_data";
import { researchStatusLabel } from "./chat_profile_quality_data";
import { chartPopupControls, centrePopup, chartLinkButtons, chartLinkClick, escapeText, injectChartStyles, lifeYears as years, profileUrl, raiseAboveOtherPopups, saveChart, toggleChartFullScreen, textColourFor, truncate } from "./chat_chart_common";

const ROOT_RADIUS = 58;
// The − / + generation buttons (user, 2026-10-04: "maybe we could have more?").
export const FAN_GENERATIONS_MIN = 3;
export const FAN_GENERATIONS_MAX = 12;
// A label shows once it would be at least this many pixels high on screen, so
// zooming in brings out the outer generations' names.
const MIN_SCREEN_FONT = 6;
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const UNKNOWN_FILL = "#d9d9d9";
const MISSING_STROKE = "#b0b0b0";
const MODES = [
  { key: "lineage", label: "Lineage" },
  { key: "country", label: "Birth country" },
  { key: "century", label: "Birth year" },
  { key: "surname", label: "Surnames" },
  { key: "brickwalls", label: "Brick walls" },
  { key: "gender", label: "Gender" },
  { key: "repeats", label: "Repeats" },
  { key: "xdna", label: "X-DNA" },
  { key: "dnaproof", label: "DNA confirmed" },
  { key: "dnalines", label: "Y & mt lines" },
  { key: "completeness", label: "Completeness" },
];
const REPEAT_COLOURS = ["#d62f6b", "#2a8f6a", "#7b4fd6", "#e07b00", "#1f77b4", "#b8860b", "#c2185b", "#00838f", "#6d4c41", "#558b2f"];
let chartCounter = 0;

function ringWidth(generation) {
  if (generation <= 3) return 70;
  if (generation === 4) return 64;
  if (generation === 5) return 56;
  if (generation <= 7) return 48;
  return 30;
}

function ringInner(generation) {
  let radius = ROOT_RADIUS;
  for (let g = 1; g < generation; g += 1) radius += ringWidth(g);
  return radius;
}

export function relationWord(slot) {
  const generation = generationOfSlot(slot);
  const male = slot % 2 === 0;
  if (generation === 0) return "";
  if (generation === 1) return male ? "Father" : "Mother";
  if (generation === 2) return male ? "Grandfather" : "Grandmother";
  if (generation === 3) return male ? "Great-grandfather" : "Great-grandmother";
  return `${generation - 2}x great-grand${male ? "father" : "mother"}`;
}

/** "Father's mother's father" for the first few generations. */
export function lineWords(slot) {
  const steps = [];
  for (let s = slot; s > 1; s = Math.floor(s / 2)) steps.unshift(s % 2 === 0 ? "father" : "mother");
  if (steps.length < 2 || steps.length > 5) return "";
  const text = steps.join("'s ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * A colour for each repeated ancestor: one per place two lines meet; their own
 * ancestors (who repeat because they do) take the colour of the meeting below them.
 */
export function repeatColours(slots, repeats = fanChartRepeats(slots)) {
  const colours = new Map();
  repeats.groups.filter((group) => group.start).forEach((group, index) => colours.set(group, REPEAT_COLOURS[index % REPEAT_COLOURS.length]));
  repeats.groups
    .filter((group) => !group.start)
    .forEach((group) => {
      for (let slot = Math.floor(group.slots[0] / 2); slot >= 1; slot = Math.floor(slot / 2)) {
        const below = repeats.bySlot.get(slot);
        if (below?.start) {
          colours.set(group, colours.get(below));
          return;
        }
      }
      colours.set(group, REPEAT_COLOURS[0]);
    });
  return colours;
}

const DNA_LINE_COLOURS = { y: "#8fb4e0", yTested: "#1f4e8c", mt: "#f2b3cb", mtTested: "#b0185a", other: "#eceef1" };

// Completeness mode: each profile's Gold Standard checklist score (chat_profile_quality_data).
export const COMPLETENESS_BANDS = [
  { key: "q100", min: 0.999, label: "Complete (100%)" },
  { key: "q90", min: 0.9, label: "90–99%" },
  { key: "q75", min: 0.75, label: "75–89%" },
  { key: "q50", min: 0.5, label: "50–74%" },
  { key: "q0", min: 0, label: "Under 50%" },
];
const COMPLETENESS_COLOURS = { q100: interpolateYlGn(0.95), q90: interpolateYlGn(0.75), q75: interpolateYlGn(0.55), q50: interpolateYlGn(0.35), q0: "#f2c4b8", unchecked: "#eceef1" };

export function completenessBand(person) {
  if (!person?.quality) return "unchecked";
  return COMPLETENESS_BANDS.find((band) => person.quality.score >= band.min).key;
}

/** Fill and legend key for each mode. extra.lineTests: Map wtid → connected DNA tests (DNA lines mode). */
export function buildColouring(slots, mode, maxGeneration, extra = {}) {
  if (mode === "completeness") {
    const counts = new Map();
    slots.forEach((person, slot) => {
      if (person && slot >= 2) counts.set(completenessBand(person), (counts.get(completenessBand(person)) || 0) + 1);
    });
    const help = slots.filter((person, slot) => slot >= 2 && [10, 20, 30].includes(person?.quality?.researchStatus)).length;
    return {
      fill: (person) => COMPLETENESS_COLOURS[completenessBand(person)],
      key: (person) => completenessBand(person),
      legend: [
        ...COMPLETENESS_BANDS.map((band) => ({ key: band.key, label: `${band.label} (${counts.get(band.key) || 0})`, colour: COMPLETENESS_COLOURS[band.key] })),
        ...(extra.qualityPending
          ? [{ key: "pending", label: "Checking profiles…", colour: "#ffffff" }]
          : counts.get("unchecked")
          ? [{ key: "unchecked", label: `Not checked (${counts.get("unchecked")})`, colour: COMPLETENESS_COLOURS.unchecked }]
          : []),
        ...(help ? [{ key: "help", label: `${help} marked Unfinished, Help Requested or Sources to Review (see the tips)`, colour: "#ffffff" }] : []),
      ],
    };
  }
  if (mode === "dnalines") {
    // Y-DNA down the fathers' line, mtDNA down the mothers' line, darker where tests are connected.
    const lineTests = extra.lineTests || new Map();
    const keyOf = (slot) => {
      const line = dnaLineOf(slot);
      if (!line) return "other";
      const tests = lineTests.get(slots[slot]?.wtid);
      return lineTestSummary(tests, line).count ? `${line}Tested` : line;
    };
    const counts = new Map();
    slots.forEach((person, slot) => {
      if (person && slot >= 2) counts.set(keyOf(slot), (counts.get(keyOf(slot)) || 0) + 1);
    });
    const labels = {
      y: `Y-DNA line: ${dnaLineCarrierNote(slots[1], "y")}`,
      yTested: "Y-DNA tests connected",
      mt: `mtDNA line: ${dnaLineCarrierNote(slots[1], "mt")}`,
      mtTested: "mtDNA tests connected",
      other: "Not on either line",
    };
    return {
      fill: (person, slot) => DNA_LINE_COLOURS[keyOf(slot)],
      key: (person, slot) => keyOf(slot),
      legend: [
        ...Object.keys(labels)
          .filter((key) => counts.get(key) || key === "y" || key === "mt")
          .map((key) => ({ key, label: `${labels[key]} (${counts.get(key) || 0})`, colour: DNA_LINE_COLOURS[key] })),
        ...(extra.lineTestsPending ? [{ key: "pending", label: "Checking WikiTree for connected tests…", colour: "#ffffff" }] : []),
      ],
    };
  }
  if (mode === "country") {
    const countries = fanChartCountries(slots);
    const top = countries.slice(0, 9).map(([country]) => country);
    const colourOf = new Map(top.map((country, index) => [country, schemeTableau10[index]]));
    const otherCount = countries.slice(9).reduce((sum, [, count]) => sum + count, 0);
    return {
      fill: (person) => (person.birthCountry ? colourOf.get(person.birthCountry) || "#9c9c9c" : UNKNOWN_FILL),
      key: (person) => (person.birthCountry ? (colourOf.has(person.birthCountry) ? person.birthCountry : "Other") : "Unknown"),
      legend: [
        ...countries.slice(0, 9).map(([country, count]) => ({ key: country, label: `${country} (${count})`, colour: colourOf.get(country) })),
        ...(otherCount ? [{ key: "Other", label: `Other (${otherCount})`, colour: "#9c9c9c" }] : []),
        { key: "Unknown", label: "No birthplace", colour: UNKNOWN_FILL },
      ],
    };
  }
  if (mode === "surname") {
    // The ten commonest surnames get colours; following one shows how it came down its line.
    const surnames = fanChartSurnames(slots);
    const top = surnames.slice(0, 10).map(([surname]) => surname);
    const colourOf = new Map(top.map((surname, index) => [surname, schemeTableau10[index]]));
    const otherCount = surnames.slice(10).reduce((sum, [, count]) => sum + count, 0);
    const OTHER = "#c4c8ce";
    return {
      fill: (person) => (person.lnab ? colourOf.get(person.lnab) || OTHER : UNKNOWN_FILL),
      key: (person) => (person.lnab ? (colourOf.has(person.lnab) ? person.lnab : "Other") : "Unknown"),
      legend: [
        ...surnames.slice(0, 10).map(([surname, count]) => ({ key: surname, label: `${surname} (${count})`, colour: colourOf.get(surname) })),
        ...(otherCount ? [{ key: "Other", label: `${surnames.length - top.length} other surnames (${otherCount})`, colour: OTHER }] : []),
        { key: "Unknown", label: "No surname", colour: UNKNOWN_FILL },
      ],
    };
  }
  if (mode === "century") {
    const yearsFound = slots.map((person, slot) => (slot > 1 && person ? yearOf(person.birth) : null)).filter(Boolean);
    const min = yearsFound.length ? Math.min(...yearsFound) : 1700;
    const max = yearsFound.length ? Math.max(...yearsFound) : 1900;
    const scale = scaleSequential(interpolateSpectral).domain([min, Math.max(max, min + 1)]);
    const bucket = (year) => `${Math.floor(year / 50) * 50}s`;
    const buckets = [];
    for (let start = Math.floor(min / 50) * 50; start <= max; start += 50) buckets.push(start);
    return {
      fill: (person) => (yearOf(person.birth) ? scale(yearOf(person.birth)) : UNKNOWN_FILL),
      key: (person) => (yearOf(person.birth) ? bucket(yearOf(person.birth)) : "Unknown"),
      legend: [
        ...buckets.map((start) => ({ key: `${start}s`, label: `${start}–${start + 49}`, colour: scale(Math.min(Math.max(start + 25, min), max)) })),
        { key: "Unknown", label: "No birth year", colour: UNKNOWN_FILL },
      ],
    };
  }
  if (mode === "brickwalls") {
    const state = (person, slot) => {
      if (generationOfSlot(slot) >= maxGeneration) return "beyond";
      const parents = (slots[slot * 2] ? 1 : 0) + (slots[slot * 2 + 1] ? 1 : 0);
      return parents === 2 ? "both" : parents === 1 ? "one" : "none";
    };
    const colours = { both: "#4caf7a", one: "#f0b429", none: "#e0533d", beyond: "#c9ccd1" };
    const counts = { both: 0, one: 0, none: 0 };
    slots.forEach((person, slot) => {
      if (!person || slot === 1) return;
      const s = state(person, slot);
      if (counts[s] !== undefined) counts[s] += 1;
    });
    return {
      fill: (person, slot) => colours[state(person, slot)],
      key: (person, slot) => state(person, slot),
      legend: [
        { key: "both", label: `Both parents (${counts.both})`, colour: colours.both },
        { key: "one", label: `One parent (${counts.one})`, colour: colours.one },
        { key: "none", label: `Brick wall: no parents (${counts.none})`, colour: colours.none },
        { key: "beyond", label: "Beyond the chart", colour: colours.beyond },
      ],
    };
  }
  if (mode === "repeats") {
    const repeats = fanChartRepeats(slots);
    const colours = repeatColours(slots, repeats);
    const ONCE = "#e3e5e9";
    const starts = repeats.groups.filter((group) => group.start);
    return {
      fill: (person, slot) => {
        const group = repeats.bySlot.get(slot);
        if (!group) return ONCE;
        return group.start ? colours.get(group) : hsl(colours.get(group)).brighter(0.9).formatHex();
      },
      key: (person, slot) => {
        const group = repeats.bySlot.get(slot);
        return group ? (group.start ? group.wtid : "inherited") : "once";
      },
      legend: [
        ...starts.slice(0, 12).map((group) => ({ key: group.wtid, label: `${group.name} ×${group.slots.length}`, colour: colours.get(group) })),
        ...(repeats.groups.length > starts.length ? [{ key: "inherited", label: "Their ancestors (repeat with them)", colour: "#cfd3da" }] : []),
        { key: "once", label: starts.length ? "Appears once" : "No one appears twice in this chart", colour: ONCE },
      ],
    };
  }
  if (mode === "xdna") {
    // Who could have passed X-DNA down: a man's X comes only from his mother.
    const shares = xDnaShares(slots);
    const NONE = "#e3e5e9";
    const bands = [
      { key: "x50", min: 0.5, label: "50% or more", colour: "#6a1b9a" },
      { key: "x25", min: 0.25, label: "25%", colour: "#8e44c4" },
      { key: "x12", min: 0.125, label: "12.5%", colour: "#b07be0" },
      { key: "x6", min: 0.0625, label: "6.25%", colour: "#cba6ef" },
      { key: "xless", min: 1e-9, label: "Less", colour: "#e2d0f7" },
    ];
    const band = (slot) => (shares && shares[slot] ? bands.find((b) => shares[slot] >= b.min) : null);
    const counts = new Map();
    slots.forEach((person, slot) => {
      if (!person || slot < 2) return;
      const b = band(slot);
      counts.set(b ? b.key : "none", (counts.get(b ? b.key : "none") || 0) + 1);
    });
    return {
      fill: (person, slot) => band(slot)?.colour || NONE,
      key: (person, slot) => band(slot)?.key || "none",
      legend: shares
        ? [
            ...bands.filter((b) => counts.get(b.key)).map((b) => ({ key: b.key, label: `X-DNA ${b.label} (${counts.get(b.key)})`, colour: b.colour })),
            { key: "none", label: `No X-DNA path (${counts.get("none") || 0})`, colour: NONE },
          ]
        : [{ key: "none", label: "No gender recorded for the centre person", colour: NONE }],
    };
  }
  if (mode === "dnaproof") {
    // Each ancestor coloured by how sure the link to their child is (2026-10-04).
    const counts = parentStatusCounts(slots);
    const colourOf = Object.fromEntries(PARENT_STATUSES.map((status) => [status.key, status.colour]));
    return {
      fill: (person, slot) => colourOf[parentLinkStatus(slots, slot)] || colourOf.unmarked,
      key: (person, slot) => parentLinkStatus(slots, slot) || "unmarked",
      legend: PARENT_STATUSES.filter((status) => counts[status.key] || status.key === "dna").map((status) => ({
        key: status.key,
        label: `${status.label} (${counts[status.key]})`,
        colour: status.colour,
      })),
    };
  }
  if (mode === "gender") {
    return {
      fill: (person, slot) => (slot % 2 === 0 ? "#7fa7d9" : "#e59ab8"),
      key: (person, slot) => (slot % 2 === 0 ? "male" : "female"),
      legend: [
        { key: "male", label: "Fathers", colour: "#7fa7d9" },
        { key: "female", label: "Mothers", colour: "#e59ab8" },
      ],
    };
  }
  // Lineage: each grandparent's line gets a hue that lightens outwards.
  const hues = { 4: 212, 5: 158, 6: 28, 7: 290 };
  const lineOf = (slot) => {
    const generation = generationOfSlot(slot);
    if (generation < 2) return slot === 2 ? 2 : 3;
    return Math.floor(slot / 2 ** (generation - 2));
  };
  const fillOf = (slot) => {
    const generation = generationOfSlot(slot);
    if (generation === 1) return hsl(slot === 2 ? 200 : 330, 0.45, 0.42).formatHex();
    return hsl(hues[lineOf(slot)], 0.55, Math.min(0.36 + generation * 0.055, 0.86)).formatHex();
  };
  const names = { 4: "Father's father", 5: "Father's mother", 6: "Mother's father", 7: "Mother's mother" };
  return {
    fill: (person, slot) => fillOf(slot),
    key: (person, slot) => (generationOfSlot(slot) < 2 ? `p${slot}` : String(lineOf(slot))),
    legend: Object.entries(names).map(([line, label]) => ({
      key: line,
      label: slots[Number(line)] ? `${label}: ${slots[Number(line)].name}` : `${label} line`,
      colour: hsl(hues[line], 0.55, 0.5).formatHex(),
    })),
  };
}

/**
 * slots: from buildFanSlots. options: {title, onRecenter(wtid, generations) → Promise<{slots, title}>}.
 * The − / + buttons reload the same person with a generation fewer or more
 * (FAN_GENERATIONS_MIN…FAN_GENERATIONS_MAX) through onRecenter.
 */
export function showFanChartPopup(slots, options = {}) {
  chartCounter += 1;
  const uid = `wbe-fan-${chartCounter}`;
  $("#wbe-fan-popup").remove();
  injectChartStyles();

  const state = {
    slots,
    title: options.title || "Fan chart",
    mode: MODES.some((m) => m.key === options.mode) ? options.mode : fanChartCountries(slots).length >= 2 ? "country" : "lineage",
    shape: "fan",
    highlight: null,
    history: [],
    zoomK: 1,
    lineTests: new Map(),
    lineTestsPending: false,
    qualityPending: false,
    qualityTried: new Set(),
  };

  // Completeness mode needs the checklist fields (DataStatus, Bio, …), so the chart's
  // slots are fetched again with them the first time it's chosen.
  const wantsQuality = () => state.mode === "completeness";
  const recenterOptions = () => ({ quality: wantsQuality() });
  async function loadQuality() {
    if (state.qualityPending || typeof options.onRecenter !== "function") return;
    if (!state.slots.some((person, slot) => slot >= 1 && person && !person.quality)) return;
    const wtid = state.slots[1]?.wtid;
    const tried = `${wtid}|${state.slots.length}`; // (one try per chart, so hidden profiles can't loop it)
    if (!wtid || state.qualityTried.has(tried)) return;
    state.qualityTried.add(tried);
    state.qualityPending = true;
    try {
      const next = await options.onRecenter(wtid, generationOfSlot(state.slots.length - 1), { quality: true });
      if (next?.slots?.[1]?.wtid === state.slots[1]?.wtid) state.slots = next.slots;
    } catch (error) {
      console.warn("wbe: fan chart completeness failed", error);
    }
    state.qualityPending = false;
    if (popup.isConnected && wantsQuality()) render({ animate: false });
  }

  // DNA lines mode: the tests connected to each ancestor on the Y and mt lines, fetched
  // one at a time (a few calls per chart) and kept for the life of the popup.
  async function loadLineTests() {
    if (state.lineTestsPending || typeof options.loadDnaTests !== "function") return;
    const wanted = dnaLineAncestors(state.slots).filter(({ person }) => !state.lineTests.has(person.wtid));
    if (!wanted.length) return;
    state.lineTestsPending = true;
    for (const { person } of wanted) {
      if (!popup.isConnected) return;
      try {
        state.lineTests.set(person.wtid, (await options.loadDnaTests(person.wtid)) || []);
      } catch (error) {
        state.lineTests.set(person.wtid, []);
      }
    }
    state.lineTestsPending = false;
    if (popup.isConnected && state.mode === "dnalines") render({ animate: false });
  }

  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup ui-draggable wbe-chart-popup";
  popup.id = "wbe-fan-popup";
  popup.style.display = "flex";
  popup.innerHTML = `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-act="back" title="Back to the previous person" hidden>Back</button>
        <button type="button" class="small" data-act="shape" title="Switch between a half-fan and a full circle">Circle</button>
        <button type="button" class="small" data-act="origins" title="Birth countries by generation, as a streamgraph">Origins</button>
        <button type="button" class="small" data-act="map" title="These ancestors' moves on a world map">Map</button>
        ${chartLinkButtons(options.links)}
        <button type="button" class="small" data-act="reset" title="Reset zoom">Reset</button>
        ${chartPopupControls()}
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        ${MODES.map((m) => `<button type="button" class="wbe-chart-mode" data-mode="${m.key}">${m.label}</button>`).join("")}
        <span class="wbe-chart-spacer"></span>
        <span style="opacity:.65">Hover to trace a line · click to open · double-click to re-centre · scroll to zoom</span>
        <span class="wbe-fan-gens" title="Generations shown">
          <button type="button" class="wbe-chart-mode" data-act="fewer" title="One generation fewer">−</button>
          <span class="wbe-fan-gens-label"></span>
          <button type="button" class="wbe-chart-mode" data-act="more" title="One more generation (loads them from WikiTree)">+</button>
        </span>
        <button type="button" class="wbe-chart-mode" data-act="zoomin" title="Zoom in (or scroll / pinch): small names appear as they get big enough to read">Zoom +</button>
        <button type="button" class="wbe-chart-mode" data-act="zoomout" title="Zoom out">Zoom −</button>
      </div>
      <div class="wbe-chart-stage"><div class="wbe-chart-tip"></div></div>
      <div class="wbe-chart-footer">
        <div class="wbe-chart-stats"></div>
        <div class="wbe-chart-bars" title="How full each generation is"></div>
        <div class="wbe-chart-legend"></div>
      </div>
    </div>`;
  document.body.appendChild(popup);
  centrePopup(popup);

  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");
  const svg = select(stage).append("svg").attr("xmlns", "http://www.w3.org/2000/svg").attr("font-family", FONT);
  const defs = svg.append("defs");
  const viewport = svg.append("g");
  const chart = viewport.append("g");
  const zoomer = d3zoom()
    .scaleExtent([0.3, 40])
    .on("zoom", (event) => {
      viewport.attr("transform", event.transform);
      if (Math.abs(event.transform.k - state.zoomK) / state.zoomK > 0.04) {
        state.zoomK = event.transform.k;
        showReadableLabels();
      }
    });

  // Labels too small to read at this zoom stay hidden (each knows the zoom it needs).
  function showReadableLabels() {
    chart.selectAll("g.wbe-chart-label[data-need-k]").attr("display", function () {
      return state.zoomK >= Number(this.dataset.needK) ? null : "none";
    });
  }
  svg.call(zoomer).on("dblclick.zoom", null);

  function angles() {
    return state.shape === "fan" ? [-Math.PI * 0.66, Math.PI * 0.66] : [-Math.PI, Math.PI];
  }

  function slotGeometry(slot) {
    const generation = generationOfSlot(slot);
    const [start, end] = angles();
    const span = (end - start) / 2 ** generation;
    const index = slot - 2 ** generation;
    return {
      generation,
      startAngle: start + index * span,
      endAngle: start + (index + 1) * span,
      innerRadius: ringInner(generation),
      outerRadius: ringInner(generation) + ringWidth(generation) - 1.5,
    };
  }

  function fitViewBox() {
    const maxGeneration = fanChartStats(state.slots).found === 0 ? 1 : generationOfSlot(state.slots.length - 1);
    const radius = ringInner(maxGeneration) + ringWidth(maxGeneration) + 12;
    const top = -radius;
    const bottom = state.shape === "fan" ? Math.max(radius * 0.52, ROOT_RADIUS + 20) : radius;
    svg.attr("viewBox", `${-radius} ${top} ${radius * 2} ${bottom - top}`);
  }

  function lineageOf(slot) {
    const set = new Set();
    for (let s = slot; s >= 1; s = Math.floor(s / 2)) set.add(s);
    return set;
  }

  function showTip(event, slot) {
    const person = state.slots[slot];
    const rect = stage.getBoundingClientRect();
    let html;
    if (person) {
      const born = [person.birth, person.birthLocation].filter(Boolean).join(", ");
      const died = [person.death, person.deathLocation].filter(Boolean).join(", ");
      const line = lineWords(slot);
      html = `<div class="wbe-chart-tip-rel">${escapeText(relationWord(slot) || "Root")}${line ? ` · ${escapeText(line)}` : ""}</div>
        <b>${escapeText(person.name || person.wtid)}</b> <span style="opacity:.7">(${escapeText(person.wtid)})</span>
        ${born ? `<div>Born: ${escapeText(born)}</div>` : ""}${died ? `<div>Died: ${escapeText(died)}</div>` : ""}
        ${repeatNote(slot)}${qualityNote(person)}${dnaNote(slot)}
        <div class="wbe-chart-tip-hint">Click to open${slot > 1 && options.onRecenter ? " · double-click to re-centre here" : ""}</div>`;
    } else {
      const child = state.slots[Math.floor(slot / 2)];
      html = `<div class="wbe-chart-tip-rel">Missing</div><b>${slot % 2 === 0 ? "Father" : "Mother"} of ${escapeText(child?.name || "?")}</b>
        <div>Not recorded on WikiTree yet: a research opportunity.</div>${
          state.mode === "xdna" && xDnaShares(state.slots)?.[slot] ? `<div class="wbe-chart-tip-dna">Could have passed down ~${percentText(xDnaShares(state.slots)[slot])} of the X-DNA</div>` : ""
        }`;
    }
    tip.innerHTML = html;
    const x = event.clientX - rect.left + 14;
    const y = event.clientY - rect.top + 14;
    tip.style.left = `${Math.min(x, rect.width - 290)}px`;
    tip.style.top = `${Math.min(y, rect.height - 110)}px`;
    tip.style.opacity = "1";
  }

  function dnaNote(slot) {
    if (slot < 2) return "";
    const parts = [`Expected DNA shared: ~${percentText(autosomalShare(state.slots, slot))}`];
    if (state.mode === "xdna") {
      const shares = xDnaShares(state.slots);
      if (shares) parts.push(shares[slot] ? `X-DNA: ~${percentText(shares[slot])}` : "No X-DNA down this line");
    }
    if (state.mode === "dnalines") {
      const line = dnaLineOf(slot);
      if (line) {
        const summary = lineTestSummary(state.lineTests.get(state.slots[slot]?.wtid), line);
        const kind = line === "y" ? "Y-DNA" : "mtDNA";
        parts.push(`On the ${kind} line`);
        if (summary.count) {
          parts.push(
            `${summary.count} ${kind} test${summary.count === 1 ? "" : "s"} connected${summary.haplogroups.length ? `, haplogroup ${summary.haplogroups.join(" / ")}` : ""}${
              summary.takers.length ? `, taken by ${summary.takers.slice(0, 3).join(", ")}${summary.takers.length > 3 ? "…" : ""}` : ""
            }`
          );
        } else if (state.lineTests.has(state.slots[slot]?.wtid)) parts.push(`No ${kind} test connected yet`);
      }
    }
    if (state.mode === "dnaproof") {
      const status = PARENT_STATUSES.find((s) => s.key === parentLinkStatus(state.slots, slot));
      const child = state.slots[Math.floor(slot / 2)];
      if (status) parts.push(`${slot % 2 === 0 ? "Father" : "Mother"} of ${child?.name || "?"}: ${status.label.toLowerCase()}`);
    }
    return `<div class="wbe-chart-tip-dna">${escapeText(parts.join(" · "))}</div>`;
  }

  function qualityNote(person) {
    const quality = person?.quality;
    if (!wantsQuality() || !quality) return "";
    const status = researchStatusLabel(quality.researchStatus);
    const missing = quality.missing.length ? `Missing: ${quality.missing.slice(0, 5).join(", ")}${quality.missing.length > 5 ? ` and ${quality.missing.length - 5} more` : ""}` : "";
    return `<div class="wbe-chart-tip-quality"><b>Profile completeness: ${Math.round(100 * quality.score)}%</b>${status ? ` · Research status: ${escapeText(status)}` : ""}${
      missing ? `<div>${escapeText(missing)}</div>` : ""
    }</div>`;
  }

  function repeatNote(slot) {
    const group = state.repeats?.bySlot.get(slot);
    if (!group) return "";
    const others = group.slots.filter((s) => s !== slot).map((s) => relationWord(s));
    return `<div class="wbe-chart-tip-repeat">Appears ${group.slots.length} times in this chart: also ${escapeText(others.join(", "))}</div>`;
  }

  // A named transition on fill-opacity, so hovering never interrupts the entrance
  // sweep (which animates "d" and opacity on the default transition).
  function applyHighlight() {
    const { highlight } = state;
    const lit = (d) => {
      if (!highlight) return true;
      if (highlight.type === "line") return highlight.slots.has(d.slot);
      return Boolean(d.person) && highlight.match(d);
    };
    chart
      .selectAll("path.wbe-chart-arc")
      .transition("hl")
      .duration(160)
      .attr("fill-opacity", (d) => (lit(d) ? 1 : 0.18))
      .attr("stroke-opacity", (d) => (lit(d) ? 1 : 0.3))
      .attr("stroke-width", (d) => (highlight?.type === "line" && lit(d) && d.person ? Math.max(2.5, d.baseWidth) : d.baseWidth));
    chart
      .selectAll("g.wbe-chart-badge")
      .transition("hl")
      .duration(160)
      .attr("opacity", (d) => (lit(d) ? 1 : 0.25));
    chart
      .selectAll("g.wbe-chart-label")
      .transition("hl")
      .duration(160)
      .attr("fill-opacity", (d) => (lit(d) ? 1 : 0.7));
    // Dimmed arcs are nearly white, so their names turn dark grey rather than fading away
    // (user, 2026-10-04: "the readable labels are important"). The texts share their group's datum.
    chart
      .selectAll("g.wbe-chart-label text")
      .attr("fill", (d) => (!d || lit(d) ? textColourFor(d?.fill) : "#4a5059"));
  }

  function render({ animate = true } = {}) {
    const maxGeneration = generationOfSlot(state.slots.length - 1);
    if (state.mode === "dnalines") loadLineTests(); // (marks itself pending before its first await)
    if (wantsQuality()) loadQuality(); // (likewise)
    const colouring = buildColouring(state.slots, state.mode, maxGeneration, {
      lineTests: state.lineTests,
      lineTestsPending: state.lineTestsPending,
      qualityPending: state.qualityPending,
    });
    popup.querySelector(".wbe-chart-title").textContent = state.title;
    popup.querySelectorAll(".wbe-chart-mode").forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
    popup.querySelector('[data-act="back"]').hidden = !state.history.length;
    popup.querySelector('[data-act="shape"]').textContent = state.shape === "fan" ? "Circle" : "Fan";
    const shownGenerations = generationOfSlot(state.slots.length - 1);
    popup.querySelector(".wbe-fan-gens-label").textContent = `${shownGenerations} generations`;
    popup.querySelector(".wbe-fan-gens").hidden = typeof options.onRecenter !== "function";
    popup.querySelector('[data-act="fewer"]').disabled = shownGenerations <= FAN_GENERATIONS_MIN;
    popup.querySelector('[data-act="more"]').disabled = shownGenerations >= FAN_GENERATIONS_MAX;
    fitViewBox();
    chart.selectAll("*").remove();
    defs.selectAll("*").remove();

    // Filled slots, plus a dashed outline where a recorded person's parent is missing.
    const data = [];
    for (let slot = 2; slot < state.slots.length; slot += 1) {
      const person = state.slots[slot];
      if (person) data.push({ slot, person, ...slotGeometry(slot) });
      else if (state.slots[Math.floor(slot / 2)]) data.push({ slot, person: null, ...slotGeometry(slot) });
    }
    const repeats = fanChartRepeats(state.slots);
    const colours = repeatColours(state.slots, repeats);
    state.repeats = repeats;
    const xShares = state.mode === "xdna" ? xDnaShares(state.slots) : null;
    data.forEach((d) => {
      d.fill = d.person ? colouring.fill(d.person, d.slot) : "none";
      d.key = d.person ? colouring.key(d.person, d.slot) : null;
      d.repeat = repeats.bySlot.get(d.slot) || null;
      // Where two lines meet, the ancestor gets an outline in their colour (and a badge).
      d.meets = Boolean(d.repeat?.start && !repeats.bySlot.has(Math.floor(d.slot / 2)));
      // X-DNA mode: a missing ancestor on an X path is a research target, outlined in purple.
      const xGap = !d.person && Boolean(xShares?.[d.slot]);
      d.stroke = d.person ? (d.meets ? colours.get(d.repeat) : "#ffffff") : xGap ? "#8e44c4" : MISSING_STROKE;
      d.baseWidth = d.meets || xGap ? 2 + Number(d.meets) : 1;
    });

    const arcGen = d3arc().cornerRadius(3).padAngle(0.004);
    const arcs = chart
      .selectAll("path.wbe-chart-arc")
      .data(data)
      .join("path")
      .attr("class", "wbe-chart-arc")
      .attr("fill", (d) => d.fill)
      .attr("stroke", (d) => d.stroke)
      .attr("stroke-width", (d) => d.baseWidth)
      .attr("stroke-dasharray", (d) => (d.person ? null : "4 3"))
      .style("cursor", (d) => (d.person ? "pointer" : "help"))
      .on("mousemove", (event, d) => showTip(event, d.slot))
      .on("mouseenter", (event, d) => {
        // Someone who appears more than once: every line down from each of their places.
        const slots = new Set();
        (d.repeat?.slots || [d.slot]).forEach((slot) => lineageOf(slot).forEach((s) => slots.add(s)));
        state.highlight = { type: "line", slots };
        applyHighlight();
        drawRepeatLinks(d.repeat, colours.get(d.repeat));
      })
      .on("mouseleave", () => {
        tip.style.opacity = "0";
        state.highlight = null;
        applyHighlight();
        drawRepeatLinks(null);
      })
      .on("click", (event, d) => {
        if (!d.person?.wtid || event.detail > 1) return;
        const url = profileUrl(d.person.wtid);
        // Wait out a possible double-click before opening.
        clearTimeout(state.clickTimer);
        state.clickTimer = setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), 260);
      })
      .on("dblclick", async (event, d) => {
        clearTimeout(state.clickTimer);
        if (!d.person?.wtid || typeof options.onRecenter !== "function") return;
        tip.style.opacity = "0";
        popup.querySelector(".wbe-chart-title").textContent = `Loading ${d.person.name || d.person.wtid}…`;
        try {
          const next = await options.onRecenter(d.person.wtid, generationOfSlot(state.slots.length - 1), recenterOptions());
          if (next?.slots) {
            state.history.push({ slots: state.slots, title: state.title });
            state.slots = next.slots;
            state.title = next.title || state.title;
            svg.transition().duration(300).call(zoomer.transform, zoomIdentity);
            render();
          }
        } catch (error) {
          popup.querySelector(".wbe-chart-title").textContent = `${state.title} (couldn't load: ${error?.message || error})`;
        }
      });

    if (animate) {
      arcs
        .attr("d", (d) => arcGen({ ...d, outerRadius: d.innerRadius + 0.5, startAngle: (d.startAngle + d.endAngle) / 2, endAngle: (d.startAngle + d.endAngle) / 2 }))
        .attr("opacity", 0)
        .transition()
        .delay((d) => 120 + d.generation * 170 + (d.slot - 2 ** d.generation) * (220 / 2 ** d.generation))
        .duration(650)
        .ease(easeCubicOut)
        .attr("opacity", 1)
        .attrTween("d", (d) => {
          const mid = (d.startAngle + d.endAngle) / 2;
          const from = { innerRadius: d.innerRadius, outerRadius: d.innerRadius + 0.5, startAngle: mid, endAngle: mid };
          const to = { innerRadius: d.innerRadius, outerRadius: d.outerRadius, startAngle: d.startAngle, endAngle: d.endAngle };
          const lerp = interpolate(from, to);
          return (t) => arcGen(lerp(t));
        });
    } else {
      arcs.attr("d", (d) => arcGen(d));
    }

    drawLabels(data.filter((d) => d.person), animate);
    drawBadges(data.filter((d) => d.meets), animate);
    if (state.mode === "brickwalls" && state.shape === "fan") drawRingPercents(animate);
    chart.append("g").attr("class", "wbe-chart-links").attr("pointer-events", "none");
    drawRoot(animate);
    drawFooter(colouring);
  }

  function drawLabels(data, animate) {
    const labels = chart
      .selectAll("g.wbe-chart-label")
      .data(data)
      .join("g")
      .attr("class", "wbe-chart-label")
      .attr("pointer-events", "none");
    labels.each(function (d) {
      const g = select(this);
      const thickness = d.outerRadius - d.innerRadius;
      const midRadius = (d.innerRadius + d.outerRadius) / 2;
      const sweep = d.endAngle - d.startAngle;
      const arcLength = sweep * midRadius;
      const fill = textColourFor(d.fill);
      const name = d.person.name || d.person.wtid;
      const lnab = d.person.lnab && !name.includes(d.person.lnab) ? ` ${d.person.lnab}` : "";
      const yearText = years(d.person);
      if (arcLength > thickness * 1.25) {
        // Wide arc: text follows the curve. Lower half (circle mode) runs the other way so it isn't upside down.
        const mid = (d.startAngle + d.endAngle) / 2;
        const flip = Math.cos(mid) < -0.05;
        const lines = [`${name}${lnab}`, yearText].filter(Boolean);
        const fontSize = Math.min(13, Math.max(8.5, thickness / 5));
        lines.forEach((line, index) => {
          const offset = (index - (lines.length - 1) / 2) * (fontSize + 2);
          const r = midRadius + (flip ? offset : -offset);
          const id = `${uid}-p${d.slot}-${index}`;
          const a0 = d.startAngle - Math.PI / 2;
          const a1 = d.endAngle - Math.PI / 2;
          const pathD = flip
            ? `M ${r * Math.cos(a1)} ${r * Math.sin(a1)} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 0 ${r * Math.cos(a0)} ${r * Math.sin(a0)}`
            : `M ${r * Math.cos(a0)} ${r * Math.sin(a0)} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)}`;
          defs.append("path").attr("id", id).attr("d", pathD);
          const maxChars = Math.floor((sweep * r - 8) / (fontSize * (index === 0 ? 0.56 : 0.5)));
          g.append("text")
            .attr("fill", fill)
            .attr("font-size", index === 0 ? fontSize : fontSize - 1.5)
            .attr("font-weight", index === 0 ? 600 : 400)
            .attr("dy", "0.35em")
            .append("textPath")
            .attr("href", `#${id}`)
            .attr("startOffset", "50%")
            .attr("text-anchor", "middle")
            .text(truncate(line, maxChars));
        });
      } else if (arcLength > 0.3) {
        // Narrow arc: text runs along the radius. One too thin to read now
        // shows when zoomed in far enough (showReadableLabels).
        const mid = (d.startAngle + d.endAngle) / 2;
        const degrees = (mid * 180) / Math.PI;
        const leftSide = mid < 0;
        const fontSize = arcLength >= 7 ? Math.min(11, Math.max(MIN_SCREEN_FONT, arcLength * 0.62)) : arcLength * 0.62;
        if (fontSize < MIN_SCREEN_FONT) {
          g.attr("data-need-k", (MIN_SCREEN_FONT / fontSize).toFixed(2)).attr("display", state.zoomK >= MIN_SCREEN_FONT / fontSize ? null : "none");
        }
        const twoLines = arcLength > fontSize * 2.6 && yearText;
        const maxChars = Math.floor((thickness - 6) / (fontSize * 0.55));
        const rotate = leftSide ? degrees + 90 : degrees - 90;
        const x = midRadius * Math.sin(mid);
        const y = -midRadius * Math.cos(mid);
        const text = g
          .append("text")
          .attr("transform", `translate(${x},${y}) rotate(${rotate})`)
          .attr("text-anchor", "middle")
          .attr("fill", fill)
          .attr("font-size", fontSize);
        text
          .append("tspan")
          .attr("x", 0)
          .attr("dy", twoLines ? "-0.25em" : "0.35em")
          .attr("font-weight", 600)
          .text(truncate(name, maxChars));
        if (twoLines) text.append("tspan").attr("x", 0).attr("dy", "1.1em").attr("font-size", fontSize - 1).text(yearText);
      }
    });
    if (animate) {
      labels
        .attr("opacity", 0)
        .transition()
        .delay((d) => 520 + d.generation * 170)
        .duration(400)
        .attr("opacity", 1);
    }
  }

  function centroidOf(slot) {
    const g = slotGeometry(slot);
    const angle = (g.startAngle + g.endAngle) / 2;
    const r = (g.innerRadius + g.outerRadius) / 2;
    return [r * Math.sin(angle), -r * Math.cos(angle)];
  }

  /** "×2" on each place where two lines meet in the same ancestor. */
  function drawBadges(data, animate) {
    const badges = chart
      .selectAll("g.wbe-chart-badge")
      .data(data.filter((d) => (d.endAngle - d.startAngle) * d.innerRadius > 30)) // (narrow ones keep just the outline: a badge would cover the name)
      .join("g")
      .attr("class", "wbe-chart-badge")
      .attr("pointer-events", "none")
      .attr("transform", (d) => {
        const angle = (d.startAngle + d.endAngle) / 2;
        const r = d.outerRadius - 9;
        return `translate(${r * Math.sin(angle)},${-r * Math.cos(angle)})`;
      });
    badges.append("circle").attr("r", 8).attr("fill", (d) => d.stroke).attr("stroke", "#fff").attr("stroke-width", 1.5);
    badges
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#fff")
      .attr("font-size", 8.5)
      .attr("font-weight", 700)
      .text((d) => `×${d.repeat.slots.length}`);
    if (animate) badges.attr("opacity", 0).transition().delay((d) => 700 + d.generation * 170).duration(400).attr("opacity", 1);
  }

  /** Brick walls: how full each ring is, written just past the fan's left end (green when complete). */
  function drawRingPercents(animate) {
    const [start] = angles();
    const rows = fanChartStats(state.slots).rows.filter((row) => ringWidth(row.generation) >= 30);
    const layer = chart.append("g").attr("class", "wbe-chart-ring-percents").attr("pointer-events", "none");
    rows.forEach((row) => {
      const percent = Math.round((100 * row.found) / row.possible);
      const r = ringInner(row.generation) + ringWidth(row.generation) / 2;
      const angle = start - 15 / r;
      const text = layer
        .append("text")
        .attr("x", r * Math.sin(angle))
        .attr("y", -r * Math.cos(angle))
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", row.generation <= 5 ? 11 : 9.5)
        .attr("font-weight", 700)
        .attr("fill", percent === 100 ? "#2e8b57" : percent >= 50 ? "#b7791f" : "#c0392b")
        .text(`${percent}%`);
      text.append("title").text(`${row.found} of ${row.possible}`);
      if (animate) text.attr("opacity", 0).transition().delay(300 + row.generation * 170).duration(400).attr("opacity", 1);
    });
  }

  /** Curves joining every place a repeated ancestor appears. */
  function drawRepeatLinks(group, colour) {
    const layer = chart.select("g.wbe-chart-links");
    layer.selectAll("*").remove();
    if (!group) return;
    const points = group.slots.map(centroidOf);
    for (let i = 1; i < points.length; i += 1) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      // Bowed towards the middle, so the curve crosses the chart rather than hugging a ring.
      const path = layer
        .append("path")
        .attr("d", `M ${x0} ${y0} Q ${(x0 + x1) * 0.2} ${(y0 + y1) * 0.2} ${x1} ${y1}`)
        .attr("fill", "none")
        .attr("stroke", colour || "#d62f6b")
        .attr("stroke-width", 2.5)
        .attr("stroke-linecap", "round")
        .attr("stroke-dasharray", "6 4");
      if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        path.attr("stroke-dashoffset", 40).transition().duration(900).ease(easeCubicOut).attr("stroke-dashoffset", 0);
      }
    }
    points.forEach(([x, y]) => layer.append("circle").attr("cx", x).attr("cy", y).attr("r", 4).attr("fill", colour || "#d62f6b").attr("stroke", "#fff"));
  }

  function drawRoot(animate) {
    const root = state.slots[1];
    const g = chart.append("g").attr("class", "wbe-chart-root").style("cursor", "pointer");
    const circle = g
      .append("circle")
      .attr("r", animate ? 0 : ROOT_RADIUS - 2)
      .attr("fill", "#2f6fb3")
      .attr("stroke", "#fff")
      .attr("stroke-width", 3);
    if (animate) circle.transition().duration(600).ease(easeBackOut.overshoot(2)).attr("r", ROOT_RADIUS - 2);
    const name = root?.name || root?.wtid || "";
    g.append("text").attr("text-anchor", "middle").attr("dy", "-0.2em").attr("fill", "#fff").attr("font-size", 13).attr("font-weight", 700).text(truncate(name, 13));
    g.append("text").attr("text-anchor", "middle").attr("dy", "1.2em").attr("fill", "#dce9ff").attr("font-size", 10.5).text(years(root));
    g.on("mousemove", (event) => showTip(event, 1))
      .on("mouseleave", () => {
        tip.style.opacity = "0";
      })
      .on("click", () => root?.wtid && window.open(profileUrl(root.wtid), "_blank", "noopener,noreferrer"));
  }

  function drawFooter(colouring) {
    const stats = fanChartStats(state.slots);
    const noParents = !state.slots[1]?.fatherId && !state.slots[1]?.motherId && stats.found === 0;
    popup.style.height = noParents ? "min(520px, 92vh)" : "";
    popup.style.width = noParents ? "min(740px, 96vw)" : "";
    if (noParents) {
      popup.querySelector(".wbe-fan-gens").hidden = true;
      popup.querySelector(".wbe-chart-stats").textContent = state.mode === "xdna"
        ? state.slots[1]?.gender === "Male"
          ? "No parents are attached. His X chromosome comes from his mother; attach her profile to trace that line."
          : "No parents are attached. Attach parent profiles to trace X-DNA inheritance."
        : "No parents are attached on WikiTree yet.";
      popup.querySelector(".wbe-chart-bars").innerHTML = "";
      popup.querySelector(".wbe-chart-bars").hidden = true;
      popup.querySelector(".wbe-chart-legend").innerHTML = "";
      return;
    }
    popup.querySelector(".wbe-chart-bars").hidden = false;
    const percent = stats.possible ? Math.round((stats.found / stats.possible) * 100) : 0;
    const meets = (state.repeats?.groups || []).filter((group) => group.start).length;
    popup.querySelector(".wbe-chart-stats").innerHTML =
      `<strong>${stats.found.toLocaleString()}</strong>of ${stats.possible.toLocaleString()} ancestors · ${percent}%` +
      (meets ? `<div class="wbe-chart-repeats" title="Pedigree collapse: cousins who married. Try the Repeats colours.">${meets} ${meets === 1 ? "ancestor appears" : "ancestors appear"} more than once · ${state.repeats.people.toLocaleString()} different people</div>` : "");
    popup.querySelector(".wbe-chart-bars").innerHTML = stats.rows
      .map((row) => `<div title="Generation ${row.generation}: ${row.found} of ${row.possible}"><b style="height:${Math.round((row.found / row.possible) * 100)}%"></b></div>`)
      .join("");
    const legend = popup.querySelector(".wbe-chart-legend");
    legend.innerHTML = "";
    colouring.legend.forEach((item) => {
      const span = document.createElement("span");
      span.innerHTML = `<i style="background:${item.colour}"></i>`;
      span.appendChild(document.createTextNode(item.label));
      span.addEventListener("mouseenter", () => {
        state.highlight = { type: "key", match: (d) => d.key === item.key };
        applyHighlight();
      });
      span.addEventListener("mouseleave", () => {
        state.highlight = null;
        applyHighlight();
      });
      legend.appendChild(span);
    });
  }

  function fileBase() {
    return `fan-chart-${(state.slots[1]?.wtid || "chart").replace(/[^A-Za-z0-9_-]/g, "")}`;
  }

  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.classList.contains("close-popup")) {
      popup._wbeLeaveFullScreen?.();
      popup.remove();
    } else if (button.dataset.link) {
      chartLinkClick(popup, button, options.links, state.slots[1]?.wtid); // (the person now at the centre)
    } else if (button.dataset.mode) {
      state.mode = button.dataset.mode;
      render({ animate: false });
      // A soft colour cross-fade instead of the full sweep.
      chart.selectAll("path.wbe-chart-arc").attr("opacity", 0.4).transition().duration(350).attr("opacity", 1);
    } else if (button.dataset.act === "back") {
      const previous = state.history.pop();
      if (!previous) return;
      state.slots = previous.slots;
      state.title = previous.title;
      svg.call(zoomer.transform, zoomIdentity);
      render();
    } else if (button.dataset.act === "shape") {
      state.shape = state.shape === "fan" ? "circle" : "fan";
      svg.call(zoomer.transform, zoomIdentity);
      render();
    } else if (button.dataset.act === "origins") {
      popup._wbeLeaveFullScreen?.(); // (a full-screen chart would hide the new one)
      const rows = state.slots
        .map((person, slot) => (person && slot > 1 ? { degrees: generationOfSlot(slot), birthLocation: person.birthLocation, birth: person.birth } : null))
        .filter(Boolean);
      const series = buildOriginsSeries(rows);
      if (series) {
        showOriginsPopup(series, {
          title: `Ancestral origins: ${state.slots[1]?.name || ""} (${state.slots[1]?.wtid || ""})`,
          fileBase: fileBase().replace(/^fan-chart/, "origins"),
        });
      } else button.title = "No birthplaces recorded in this chart";
    } else if (button.dataset.act === "map") {
      popup._wbeLeaveFullScreen?.();
      const migration = buildMigration(state.slots);
      if (migration.places.length) {
        void showMigrationMapPopup(migration, {
          title: `Migration map: ${state.slots[1]?.name || ""} (${state.slots[1]?.wtid || ""})`,
          fileBase: fileBase().replace(/^fan-chart/, "migration-map"),
        }).catch((error) => console.warn("wbe: migration map failed", error));
      } else button.title = "No birthplaces recorded in this chart";
    } else if (button.dataset.act === "reset") svg.transition().duration(400).call(zoomer.transform, zoomIdentity);
    else if (button.dataset.act === "zoomin" || button.dataset.act === "zoomout") {
      svg.transition("zoom").duration(300).call(zoomer.scaleBy, button.dataset.act === "zoomin" ? 1.6 : 1 / 1.6);
    } else if (button.dataset.act === "fewer" || button.dataset.act === "more") void changeGenerations(button.dataset.act === "more" ? 1 : -1);
    else if (button.dataset.act === "full") toggleChartFullScreen(popup);
    else if (button.dataset.act === "svg" || button.dataset.act === "png") saveChart(svg.node(), fileBase(), button.dataset.act);
  });

  // − / +: the same person with a generation fewer (no fetch: the slots are cut)
  // or more (fetched), keeping the zoom.
  async function changeGenerations(step) {
    const current = generationOfSlot(state.slots.length - 1);
    const wanted = Math.min(FAN_GENERATIONS_MAX, Math.max(FAN_GENERATIONS_MIN, current + step));
    if (wanted === current) return;
    if (wanted < current) {
      state.slots = state.slots.slice(0, 2 ** (wanted + 1));
      render({ animate: false });
      return;
    }
    const wtid = state.slots[1]?.wtid;
    if (!wtid || typeof options.onRecenter !== "function") return;
    const label = popup.querySelector(".wbe-fan-gens-label");
    label.textContent = `Loading ${wanted} generations…`;
    popup.querySelectorAll('[data-act="fewer"], [data-act="more"]').forEach((button) => (button.disabled = true));
    try {
      const next = await options.onRecenter(wtid, wanted, recenterOptions());
      if (next?.slots?.[1]) state.slots = next.slots;
    } catch (error) {
      console.warn("wbe: more fan chart generations failed", error);
    }
    render({ animate: false });
  }

  raiseAboveOtherPopups(popup);
  $(popup).draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
  render();
  return popup;
}

