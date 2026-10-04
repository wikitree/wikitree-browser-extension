// The ancestor lifespans popup, drawn with d3: every ancestor's life as a bar, a
// generation per band, under an area of how many were alive each year. Moving
// across it scrubs a year line that lights up who was alive then, and how old.
// Data comes from chat_lifespans_data.js. Since 2026-10-03 it is also the
// family timeline (its Close family view, rows from familyLifespanRows), as the
// user found the two charts "very very similar".

import $ from "jquery";
import { select, pointer } from "d3-selection";
import "d3-transition";
import { scaleLinear, scaleSequential } from "d3-scale";
import { area as d3area, curveMonotoneX } from "d3-shape";
import { interpolateRdYlGn, schemeTableau10 } from "d3-scale-chromatic";
import { easeCubicOut } from "d3-ease";
import { aliveByYear, generationLabel, lifespanStats } from "./chat_lifespans_data";
import { EVENT_KIND_COLOURS, aliveFor, eventYears, eventsForRows, livedThrough, rowCountries } from "./chat_world_events_data";
import {
  centrePopup,
  chartLinkButtons,
  chartLinkClick,
  escapeText,
  injectChartStyles,
  profileUrl,
  raiseAboveOtherPopups,
  saveChart,
  toggleChartFullScreen,
  truncate,
  yearOf,
} from "./chat_chart_common";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const LEFT = 190;
const RIGHT = 48;
const TOP = 30;
const AREA_H = 70;
const WIDTH = 960;
const GROUP_GAP = 18;
const LANE_H = 12; // one row of the history lane
const MODES = [
  { key: "age", label: "Age at death" },
  { key: "line", label: "Father's / mother's line" },
  { key: "century", label: "Century born" },
];
const FAMILY_MODES = [
  { key: "role", label: "Relationship" },
  { key: "age", label: "Age at death" },
  { key: "century", label: "Century born" },
];
const DESCENDANT_MODES = [
  { key: "branch", label: "Family branch" },
  { key: "age", label: "Age at death" },
  { key: "century", label: "Century born" },
];
const ROLE_COLOURS = { parent: "#8e6cc2", self: "#2f6fb3", spouse: "#d0577b", sibling: "#3f9d8f", child: "#e08a2e", grandchild: "#c2a23a" };
const ROLE_LEGEND = { parent: "parents", self: "", spouse: "spouses", sibling: "siblings", child: "children", grandchild: "grandchildren" };
/** The views offered by the switch at the top. */
export const LIFESPAN_VIEWS = [
  { key: "family", label: "Close family" },
  { key: "ancestors", label: "Ancestors" },
  { key: "descendants", label: "Descendants" },
];
const SIDE_COLOURS = { "": "#f2c14e", father: "#2f6fb3", mother: "#d0577b" };
const UNKNOWN = "#b9c0c8";
let ageScale = null; // (made on first use: the tests stub d3)
function ageColour(age) {
  ageScale = ageScale || scaleSequential(interpolateRdYlGn).domain([25, 90]).clamp(true);
  return ageScale(age);
}

/** Row height by generation: the deep generations are many, so their rows are thin and unlabelled. */
function rowHeight(generation) {
  if (generation <= 3) return 18;
  if (generation === 4) return 12;
  return 7;
}

const isRoot = (row) => (row.root === undefined ? row.generation === 0 : Boolean(row.root));

function fillFor(row, mode) {
  if (mode === "role") return ROLE_COLOURS[row.role] || UNKNOWN;
  if (mode === "branch") return row.branch >= 0 ? schemeTableau10[row.branch % 10] : SIDE_COLOURS[""];
  if (mode === "line") return SIDE_COLOURS[row.side] || UNKNOWN;
  if (mode === "century") return schemeTableau10[Math.floor(row.start / 100) % 10];
  if (Number.isFinite(row.age)) return ageColour(row.age);
  return isRoot(row) ? SIDE_COLOURS[""] : UNKNOWN;
}

/** Events into lanes so none overlap: each gets .lane. → the number of lanes (at most 3; the rest are dropped). */
export function laneEvents(events, xOf, minGap = 4) {
  const ends = [];
  const placed = [];
  events.forEach((event) => {
    const x0 = xOf(event.start) - (event.start === event.end ? 4 : 0);
    const x1 = Math.max(xOf(event.end), xOf(event.start) + 8);
    const lane = ends.findIndex((end) => end + minGap <= x0);
    if (lane >= 0) ends[lane] = x1;
    else if (ends.length < 3) ends.push(x1);
    else return;
    placed.push({ ...event, lane: lane >= 0 ? lane : ends.length - 1 });
  });
  return { placed, lanes: ends.length };
}

/**
 * rows/undated: from buildLifespanRows (or familyLifespanRows: rows with .group
 * and .root). options: {title, links, focusEventId (an event to mark), history
 * (false to leave it out), view ("ancestors"/"family"), onView(view, position)
 * for the switch, position ({left, top}: where the last view was), peopleWord}.
 */
export function showLifespansPopup(rows, options = {}) {
  $("#wbe-lifespans-popup").remove();
  injectChartStyles();
  const family = options.view === "family";
  const descendants = options.view === "descendants";
  const modes = family ? FAMILY_MODES : descendants ? DESCENDANT_MODES : MODES;
  const state = { mode: modes[0].key };
  const word = options.peopleWord || (family ? "relative" : descendants ? "descendant" : "ancestor");
  const words = (count) => `${word}${count === 1 ? "" : "s"}`;
  const root = rows.find(isRoot) || null;
  const ancestors = rows.filter((row) => !isRoot(row));
  const stats = lifespanStats(rows);

  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup ui-draggable wbe-chart-popup";
  popup.id = "wbe-lifespans-popup";
  popup.style.display = "flex";
  popup.innerHTML = `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        ${chartLinkButtons(options.links)}
        <button type="button" class="small" data-act="full" title="Full screen (or double-click the title bar; Esc to leave)">Full screen</button>
        <button type="button" class="small" data-act="svg" title="Save as SVG">SVG</button>
        <button type="button" class="small" data-act="png" title="Save as PNG">PNG</button>
        <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        ${
          options.onView
            ? `<span class="wbe-chart-views">${LIFESPAN_VIEWS.map(
                (v) => `<button type="button" class="wbe-chart-mode wbe-chart-view${v.key === (options.view || "ancestors") ? " active" : ""}" data-view="${v.key}">${v.label}</button>`
              ).join("")}</span><span style="opacity:.35;margin:0 4px">|</span>`
            : ""
        }
        ${modes.map((m) => `<button type="button" class="wbe-chart-mode" data-mode="${m.key}">${m.label}</button>`).join("")}
        <span class="wbe-chart-spacer"></span>
        <span style="opacity:.65">Move across to see who was alive · click a bar to open the profile</span>
      </div>
      <div class="wbe-chart-stage" style="overflow-y:auto"><div class="wbe-chart-tip"></div></div>
      <div class="wbe-chart-footer"><div class="wbe-chart-legend"></div><div class="wbe-chart-centuries"></div></div>
    </div>`;
  document.body.appendChild(popup);
  centrePopup(popup);
  if (options.position?.left) Object.assign(popup.style, { left: options.position.left, top: options.position.top });
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Lifespans";

  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");

  // Vertical layout: the history lane, the alive-area, then a band per generation.
  const first = Math.min(...rows.map((row) => row.start));
  const last = Math.max(...rows.map((row) => row.end));
  const x = scaleLinear()
    .domain([Math.floor((first - 5) / 10) * 10, Math.ceil((last + 5) / 10) * 10])
    .range([LEFT, WIDTH - RIGHT]);
  const countries = rowCountries(rows);
  // (events running past either end are clipped to the chart's years; .full keeps the real ones)
  const [firstYear, lastYear] = x.domain();
  const spanEvents = eventsForRows(rows, firstYear, lastYear).map((event) => ({ ...event, start: Math.max(event.start, firstYear), end: Math.min(event.end, lastYear - 1), full: event }));
  const history = options.history === false ? { placed: [], lanes: 0 } : laneEvents(spanEvents, x);
  const focusEvent = history.placed.find((event) => event.id === options.focusEventId) || null;
  const laneTop = TOP + 4;
  const areaTop = laneTop + (history.lanes ? history.lanes * LANE_H + 8 : 0);
  let y = areaTop + AREA_H + 22;
  const groups = [];
  let lastGeneration = null;
  const placed = rows.map((row) => {
    if (row.generation !== lastGeneration) {
      if (lastGeneration !== null) y += GROUP_GAP;
      groups.push({ generation: row.generation, label: row.group !== undefined ? row.group : generationLabel(row.generation), role: row.role, y, count: 0 });
      lastGeneration = row.generation;
    }
    groups[groups.length - 1].count += 1;
    const h = family ? 18 : rowHeight(row.generation);
    const item = { row, y, h };
    y += h;
    return item;
  });
  const height = y + 30;

  const svg = select(stage)
    .append("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("font-family", FONT)
    .attr("viewBox", `0 0 ${WIDTH} ${height}`)
    .style("height", "auto")
    .style("cursor", "crosshair");
  const g = svg.append("g");
  const defs = svg.append("defs");
  const fade = defs.append("linearGradient").attr("id", "wbe-ls-fade").attr("x1", "0").attr("x2", "1");
  fade.append("stop").attr("offset", "0%").attr("stop-color", "#fff").attr("stop-opacity", 0);
  fade.append("stop").attr("offset", "100%").attr("stop-color", "#fff").attr("stop-opacity", 0.95);

  // Century grid and axis.
  const ticks = x.ticks(Math.min(14, Math.round((x.domain()[1] - x.domain()[0]) / 20)));
  ticks.forEach((year) => {
    g.append("line").attr("x1", x(year)).attr("x2", x(year)).attr("y1", TOP - 6).attr("y2", height - 20).attr("stroke", "#000").attr("stroke-opacity", year % 100 === 0 ? 0.13 : 0.06);
    g.append("text").attr("x", x(year)).attr("y", TOP - 12).attr("text-anchor", "middle").attr("font-size", 10.5).attr("fill", "#6b7785").text(year);
  });

  // How many ancestors were alive each year.
  const series = aliveByYear(ancestors);
  const peak = Math.max(1, ...series.map((point) => point.count));
  const ay = scaleLinear().domain([0, peak]).range([areaTop + AREA_H, areaTop + 8]);
  const areaPath = d3area()
    .x((d) => x(d.year))
    .y0(areaTop + AREA_H)
    .y1((d) => ay(d.count))
    .curve(curveMonotoneX);
  const areaGradient = defs.append("linearGradient").attr("id", "wbe-ls-area").attr("x1", "0").attr("x2", "0").attr("y1", "0").attr("y2", "1");
  areaGradient.append("stop").attr("offset", "0%").attr("stop-color", "#2f6fb3").attr("stop-opacity", 0.55);
  areaGradient.append("stop").attr("offset", "100%").attr("stop-color", "#2f6fb3").attr("stop-opacity", 0.08);
  g.append("text").attr("x", 8).attr("y", areaTop + 14).attr("font-size", 9.5).attr("font-weight", 700).attr("letter-spacing", "0.06em").attr("fill", "#2f6fb3").text(`${word.toUpperCase()}S ALIVE`);
  if (stats.peak) {
    g.append("text").attr("x", 8).attr("y", areaTop + 30).attr("font-size", 11).attr("fill", "#4a5562").text(`Peak: ${stats.peak.count} in ${stats.peak.year}`);
  }
  g.append("path")
    .datum(series)
    .attr("fill", "url(#wbe-ls-area)")
    .attr("stroke", "#2f6fb3")
    .attr("stroke-width", 1.2)
    .attr("d", areaPath)
    .attr("opacity", 0)
    .transition()
    .duration(900)
    .attr("opacity", 1);
  g.append("line").attr("x1", LEFT).attr("x2", WIDTH - RIGHT).attr("y1", areaTop + AREA_H).attr("y2", areaTop + AREA_H).attr("stroke", "#000").attr("stroke-opacity", 0.15);

  // History: the events of the countries they were born in (and the world's), in lanes
  // above the alive-area. Hovering one shades its years and lights who lived through it.
  const eventBand = g.insert("rect", ":first-child").attr("y", laneTop).attr("height", height - 20 - laneTop).attr("fill", "#000").attr("fill-opacity", 0).attr("pointer-events", "none");
  function shadeEvent(event, opacity = 0.06) {
    if (!event) return eventBand.attr("fill-opacity", 0);
    const x0 = x(event.start);
    eventBand
      .attr("x", x0)
      .attr("width", Math.max(2, x(event.end + 1) - x0))
      .attr("fill", EVENT_KIND_COLOURS[event.kind])
      .attr("fill-opacity", opacity);
  }
  if (history.lanes) {
    g.append("text").attr("x", 8).attr("y", laneTop + 9).attr("font-size", 9.5).attr("font-weight", 700).attr("letter-spacing", "0.06em").attr("fill", "#8a6d3b").text("IN HISTORY");
    const marks = g
      .append("g")
      .attr("class", "wbe-ls-history")
      .selectAll("g")
      .data(history.placed.map((event) => ({ historyEvent: event })))
      .join("g")
      .attr("transform", (d) => `translate(0,${laneTop + d.historyEvent.lane * LANE_H})`)
      .style("cursor", "help");
    marks
      .filter((d) => d.historyEvent.start !== d.historyEvent.end)
      .append("rect")
      .attr("x", (d) => x(d.historyEvent.start))
      .attr("y", 1)
      .attr("height", LANE_H - 4)
      .attr("rx", (LANE_H - 4) / 2)
      .attr("width", (d) => Math.max(8, x(d.historyEvent.end + 1) - x(d.historyEvent.start)))
      .attr("fill", (d) => EVENT_KIND_COLOURS[d.historyEvent.kind])
      .attr("fill-opacity", (d) => (d.historyEvent.approx ? 0.45 : 0.85));
    marks
      .filter((d) => d.historyEvent.start === d.historyEvent.end)
      .append("path")
      .attr("d", (d) => {
        const cx = x(d.historyEvent.start + 0.5);
        const cy = (LANE_H - 2) / 2;
        return `M${cx},${cy - 5}L${cx + 5},${cy}L${cx},${cy + 5}L${cx - 5},${cy}Z`;
      })
      .attr("fill", (d) => EVENT_KIND_COLOURS[d.historyEvent.kind]);
    marks.attr("opacity", 0).transition().delay((d, i) => 300 + i * 25).duration(300).attr("opacity", 1);
    if (focusEvent) {
      shadeEvent(focusEvent, 0.1);
      marks.filter((d) => d.historyEvent === focusEvent).append("rect")
        .attr("x", x(focusEvent.start) - 3)
        .attr("y", -2)
        .attr("width", Math.max(14, x(focusEvent.end + 1) - x(focusEvent.start) + 6))
        .attr("height", LANE_H + 2)
        .attr("rx", 5)
        .attr("fill", "none")
        .attr("stroke", EVENT_KIND_COLOURS[focusEvent.kind])
        .attr("stroke-width", 1.5);
    }
  }

  // The root's birth: a dashed line through every generation.
  let rootLabel = null; // [left, right] of its label
  if (root) {
    g.append("line")
      .attr("x1", x(root.start))
      .attr("x2", x(root.start))
      .attr("y1", areaTop)
      .attr("y2", height - 20)
      .attr("stroke", "#f2a900")
      .attr("stroke-width", 1.3)
      .attr("stroke-dasharray", "4 3");
    const late = x(root.start) > WIDTH - RIGHT - 150; // (keep the label inside the chart)
    const rootText = `${truncate(root.name, 24)} born ${root.start}`;
    const rootLabelX = x(root.start) + (late ? -4 : 4);
    rootLabel = late ? [rootLabelX - rootText.length * 5.6, rootLabelX] : [rootLabelX, rootLabelX + rootText.length * 5.6];
    g.append("text")
      .attr("x", rootLabelX)
      .attr("text-anchor", late ? "end" : "start")
      .attr("y", height - 8)
      .attr("font-size", 10)
      .attr("fill", "#a37200")
      .text(rootText);
  }

  // The focused event's name at the foot of its shaded band (unless it would hit the root's label).
  if (focusEvent) {
    const text = `${truncate(focusEvent.label, 32)} (${eventYears(focusEvent.full)})`;
    const width = text.length * 5.6;
    const atEnd = x(focusEvent.start) + width > WIDTH - RIGHT; // (right-align it near the edge)
    const labelX = atEnd ? x(focusEvent.end + 1) : x(focusEvent.start) + 3;
    const [a, b] = atEnd ? [labelX - width, labelX] : [labelX, labelX + width];
    const clash = rootLabel && rootLabel[0] - 8 < b && rootLabel[1] + 8 > a;
    if (!clash) {
      g.append("text")
        .attr("x", labelX)
        .attr("text-anchor", atEnd ? "end" : "start")
        .attr("y", height - 8)
        .attr("font-size", 10)
        .attr("font-weight", 600)
        .attr("fill", EVENT_KIND_COLOURS[focusEvent.kind])
        .text(text);
    }
  }

  // Generation labels.
  groups.forEach((group) => {
    const label = group.label;
    if (!label) return;
    g.append("text")
      .attr("x", 8)
      .attr("y", group.y - 5)
      .attr("font-size", 9.5)
      .attr("font-weight", 700)
      .attr("letter-spacing", "0.06em")
      .attr("fill", family ? ROLE_COLOURS[group.role] || "#6b7785" : "#6b7785")
      .text(`${label.toUpperCase()} · ${group.count}`);
  });

  // Rows.
  const rowG = g
    .append("g")
    .selectAll("g")
    .data(placed)
    .join("g")
    .attr("transform", (d) => `translate(0,${d.y})`)
    .style("cursor", "pointer")
    .on("click", (event, d) => d.row.wtid && window.open(profileUrl(d.row.wtid), "_blank", "noopener,noreferrer"));
  rowG
    .filter((d) => d.h >= 12)
    .append("text")
    .attr("x", LEFT - 8)
    .attr("y", (d) => d.h / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .attr("font-size", (d) => (d.h >= 18 ? 11.5 : 9.5))
    .attr("font-weight", (d) => (isRoot(d.row) ? 700 : 500))
    .attr("fill", "#2b2f36")
    .text((d) => truncate(`${d.row.name}${d.row.lnab && !d.row.name.includes(d.row.lnab) ? ` ${d.row.lnab}` : ""}`, d.h >= 18 ? 28 : 34));

  const barY = (d) => (d.h >= 12 ? 3 : 1);
  const barH = (d) => d.h - 2 * barY(d);
  const bars = rowG
    .append("rect")
    .attr("x", (d) => x(d.row.start))
    .attr("y", barY)
    .attr("height", barH)
    .attr("rx", (d) => barH(d) / 2)
    .attr("fill", (d) => fillFor(d.row, state.mode))
    .attr("stroke", (d) => (isRoot(d.row) ? "#f2a900" : "none"))
    .attr("stroke-width", 2)
    .attr("width", 0);
  bars
    .transition()
    .delay((d) => 150 + d.row.generation * 160 + (d.row.slot % 16) * 12)
    .duration(700)
    .ease(easeCubicOut)
    .attr("width", (d) => Math.max(3, x(d.row.end) - x(d.row.start)));
  // A fading tail where the death year is unknown.
  rowG
    .filter((d) => !d.row.endKnown && !d.row.living)
    .append("rect")
    .attr("x", (d) => x(d.row.start) + Math.max(3, x(d.row.end) - x(d.row.start)) * 0.45)
    .attr("y", barY)
    .attr("height", barH)
    .attr("width", (d) => Math.max(2, x(d.row.end) - x(d.row.start)) * 0.55)
    .attr("fill", "url(#wbe-ls-fade)")
    .attr("pointer-events", "none")
    .attr("opacity", 0)
    .transition()
    .delay(900)
    .attr("opacity", 1);
  // Age at the end of the wider bars.
  rowG
    .filter((d) => d.h >= 12 && Number.isFinite(d.row.age))
    .append("text")
    .attr("x", (d) => x(d.row.end) + 4)
    .attr("y", (d) => d.h / 2)
    .attr("dy", "0.35em")
    .attr("font-size", 9.5)
    .attr("fill", "#6b7785")
    .attr("opacity", 0)
    .text((d) => d.row.age)
    .transition()
    .delay((d) => 800 + d.row.generation * 160)
    .duration(300)
    .attr("opacity", 1);

  // Life events on the person's own bar (from the family timeline): marriages, children born, parents died.
  const rootItem = family ? placed.find(({ row }) => isRoot(row)) : null;
  if (rootItem) {
    const events = [];
    placed.forEach(({ row }) => {
      if (row.role === "spouse" && yearOf(row.marriage)) events.push({ year: yearOf(row.marriage), kind: "marriage", text: `Married ${row.name}${row.marriagePlace ? ` in ${row.marriagePlace}` : ""}` });
      if (row.role === "child") events.push({ year: row.start, kind: "child", text: `${row.relation} ${row.name} born` });
      if (row.role === "parent" && row.endKnown) events.push({ year: row.end, kind: "death", text: `${row.relation} ${row.name} died` });
    });
    g.append("g")
      .attr("transform", `translate(0,${rootItem.y})`)
      .selectAll("path")
      .data(events.map((lifeEvent) => ({ lifeEvent })))
      .join("path")
      .attr("transform", (d) => `translate(${x(d.lifeEvent.year)},${rootItem.h / 2})`)
      .attr("d", (d) =>
        d.lifeEvent.kind === "marriage" ? "M0,-6L6,0L0,6L-6,0Z" : d.lifeEvent.kind === "child" ? "M-4,0a4,4 0 1,0 8,0a4,4 0 1,0 -8,0" : "M-1.2,-6h2.4v3.6h3.6v2.4h-3.6v6h-2.4v-6h-3.6v-2.4h3.6z"
      )
      .attr("fill", (d) => (d.lifeEvent.kind === "marriage" ? "#d0577b" : d.lifeEvent.kind === "child" ? "#fff" : "#2b2f36"))
      .attr("stroke", (d) => (d.lifeEvent.kind === "child" ? "#e08a2e" : "#fff"))
      .attr("stroke-width", 1.5)
      .style("cursor", "help")
      .attr("opacity", 0)
      .transition()
      .delay(900)
      .duration(400)
      .attr("opacity", 1);
  }

  // The scrubber.
  const scrub = g.append("g").attr("pointer-events", "none").attr("opacity", 0);
  const scrubLine = scrub.append("line").attr("y1", TOP - 6).attr("y2", height - 20).attr("stroke", "#2f6fb3").attr("stroke-width", 1.5);
  const scrubPill = scrub.append("rect").attr("y", TOP - 25).attr("width", 40).attr("height", 18).attr("rx", 9).attr("fill", "#2f6fb3");
  const scrubYear = scrub.append("text").attr("y", TOP - 12).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).attr("fill", "#fff");
  const scrubDot = scrub.append("circle").attr("r", 4).attr("fill", "#2f6fb3").attr("stroke", "#fff").attr("stroke-width", 1.5);

  function showTipHtml(event, html) {
    const rect = stage.getBoundingClientRect();
    tip.innerHTML = html;
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
    tip.style.top = `${Math.min(event.clientY - rect.top + stage.scrollTop + 14, stage.scrollTop + rect.height - 150)}px`;
    tip.style.opacity = "1";
  }

  // "Lived through: the Great Famine (aged 12), …" from their own country's events.
  function historyNote(row) {
    if (!history.lanes) return "";
    const seen = livedThrough(row, countries).filter((entry) => entry.event.kind !== "record" && history.placed.some((item) => item.id === entry.event.id));
    if (!seen.length) return "";
    const shown = seen.slice(0, 4).map((entry) => `${entry.event.label.replace(/^The\b/, "the")} (${entry.age ? `aged ${entry.age}` : "born during it"})`);
    return `<div class="wbe-chart-tip-history">Lived through ${escapeText(shown.join(", "))}${seen.length > 4 ? ` and ${seen.length - 4} more` : ""}</div>`;
  }

  const lowerFirst = (text) => String(text || "").replace(/^\w/, (ch) => ch.toLowerCase());
  const lifeText = (row) =>
    row.living ? `${row.start} – living` : `${row.start} – ${row.endKnown ? row.end : "?"}${Number.isFinite(row.age) ? ` · died aged ${row.age}` : ""}`;

  svg.on("mousemove", (event) => {
    const [mx] = pointer(event, svg.node());
    if (mx < LEFT) {
      scrub.attr("opacity", 0);
      bars.attr("fill-opacity", 1);
      tip.style.opacity = "0";
      return;
    }
    const year = Math.round(x.invert(mx));
    const alive = placed.filter(({ row }) => row.start <= year && year <= row.end);
    const aliveSet = new Set(alive);
    scrub.attr("opacity", 1);
    scrubLine.attr("x1", x(year)).attr("x2", x(year));
    scrubYear.attr("x", x(year)).text(year);
    scrubPill.attr("x", x(year) - 20);
    const point = series.find((p) => p.year === year);
    scrubDot.attr("cx", x(year)).attr("cy", ay(point?.count || 0)).attr("opacity", point ? 1 : 0);
    bars.attr("fill-opacity", (d) => (aliveSet.has(d) ? 1 : 0.22));

    const lifeEvent = event.target?.__data__?.lifeEvent || null;
    if (lifeEvent) {
      showTipHtml(event, `<div class="wbe-chart-tip-rel">${lifeEvent.year}</div><b>${escapeText(lifeEvent.text)}</b>`);
      return;
    }
    const historyEvent = event.target?.__data__?.historyEvent || null;
    if (historyEvent) {
      const alive = aliveFor(historyEvent.full, rows);
      const aliveRows = new Set(alive.map((entry) => entry.row));
      bars.attr("fill-opacity", (d) => (aliveRows.has(d.row) ? 1 : 0.18));
      shadeEvent(historyEvent);
      showTipHtml(
        event,
        `<div class="wbe-chart-tip-rel">${escapeText(eventYears(historyEvent.full))}</div><b>${escapeText(historyEvent.label)}</b>
        <div>${alive.length ? `${alive.length} of these ${words(2)} alive` : `None of these ${words(2)} alive (with known dates)`}</div>
        ${alive
          .slice(0, 6)
          .map((entry) => `<div>${escapeText(entry.row.name)} <span style="opacity:.6">${escapeText(lowerFirst(entry.row.relation))}</span>: ${entry.age ? `aged ${entry.age}` : "born during it"}</div>`)
          .join("")}${alive.length > 6 ? `<div>…and ${alive.length - 6} more</div>` : ""}`
      );
      return;
    }
    shadeEvent(focusEvent, 0.1);
    const hovered = event.target?.__data__?.row ? event.target.__data__ : null;
    if (hovered) {
      const row = hovered.row;
      showTipHtml(
        event,
        `<div class="wbe-chart-tip-rel">${escapeText(row.relation || "")}</div><b>${escapeText(row.name)}</b>
        <div>${escapeText(lifeText(row))}</div>
        ${row.birthLocation ? `<div style="opacity:.75">Born in ${escapeText(row.birthLocation)}</div>` : ""}
        ${row.start <= year && year <= row.end ? `<div>In ${year}: aged ${year - row.start}${row.endKnown || row.living ? "" : "?"}</div>` : ""}
        ${historyNote(row)}
        <div class="wbe-chart-tip-hint">Click to open the profile</div>`
      );
      return;
    }
    const counted = alive.filter(({ row }) => !isRoot(row));
    const now = history.placed.filter((item) => item.start <= year && year <= item.end);
    const lines = counted
      .slice(0, 12)
      .map(({ row }) => `<div>${escapeText(row.name)} <span style="opacity:.6">${escapeText(lowerFirst(row.relation))}</span>: ${year - row.start}${row.endKnown ? "" : "?"}</div>`)
      .join("");
    showTipHtml(
      event,
      `<div class="wbe-chart-tip-rel">In ${year}</div><b>${counted.length} ${words(counted.length)} alive</b>${lines}${
        counted.length > 12 ? `<div>…and ${counted.length - 12} more</div>` : ""
      }${now.map((item) => `<div class="wbe-chart-tip-history" style="color:${EVENT_KIND_COLOURS[item.kind]}">◆ ${escapeText(item.label)}</div>`).join("")}`
    );
  });
  svg.on("mouseleave", () => {
    shadeEvent(focusEvent, 0.1);
    scrub.attr("opacity", 0);
    bars.attr("fill-opacity", 1);
    tip.style.opacity = "0";
  });

  // Legend for the colour mode, and the average age by century as little bars.
  const legend = popup.querySelector(".wbe-chart-legend");
  function drawLegend() {
    legend.innerHTML = "";
    const add = (colour, label) => {
      const span = document.createElement("span");
      span.innerHTML = `<i style="background:${colour}"></i>`;
      span.appendChild(document.createTextNode(label));
      legend.appendChild(span);
    };
    if (state.mode === "age") {
      [30, 45, 60, 75, 90].forEach((age) => add(ageColour(age), age === 90 ? "90+" : `${age}`));
      add(UNKNOWN, "death year unknown");
    } else if (state.mode === "branch") {
      const shown = new Map();
      rows.forEach((row) => row.branch >= 0 && !shown.has(row.branch) && shown.set(row.branch, row.branchName));
      [...shown].slice(0, 12).forEach(([branch, name]) => add(schemeTableau10[branch % 10], `${name}'s line`));
    } else if (state.mode === "role") {
      Object.entries(ROLE_LEGEND).forEach(([role, label]) => label && rows.some((row) => row.role === role) && add(ROLE_COLOURS[role], label));
    } else if (state.mode === "line") {
      add(SIDE_COLOURS.father, "father's line");
      add(SIDE_COLOURS.mother, "mother's line");
    } else {
      [...new Set(rows.map((row) => Math.floor(row.start / 100) * 100))].sort().forEach((century) => add(schemeTableau10[(century / 100) % 10], `${century}s`));
    }
    if (options.undated) {
      const span = document.createElement("span");
      span.style.opacity = "0.7";
      span.textContent = `${options.undated} not shown (no birth year)`;
      legend.appendChild(span);
    }
    popup.querySelectorAll(".wbe-chart-mode[data-mode]").forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
  }
  drawLegend();

  const centuries = popup.querySelector(".wbe-chart-centuries");
  if (stats.byCentury.length) {
    centuries.className = "wbe-chart-stats";
    centuries.innerHTML = `<div style="font-size:11px;opacity:.7;margin-bottom:2px">Average age at death, by century born</div>
      <div class="wbe-chart-bars" style="height:46px;gap:6px">${stats.byCentury
        .map(
          (c) =>
            `<div title="${c.century}s: ${c.average} (${c.count} ${c.count === 1 ? "person" : "people"})" style="width:34px;background:none;display:flex;flex-direction:column;justify-content:flex-end;align-items:center">
              <span style="font-size:10px;font-weight:700">${c.average}</span>
              <b style="position:static;display:block;width:22px;height:${Math.round((c.average / 100) * 26)}px;background:${ageColour(c.average)}"></b>
              <span style="font-size:9.5px;opacity:.7">${c.century}s</span>
            </div>`
        )
        .join("")}</div>`;
  }

  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.classList.contains("close-popup")) {
      popup._wbeLeaveFullScreen?.();
      popup.remove();
    } else if (button.dataset.view) {
      if (button.dataset.view !== (options.view || "ancestors")) options.onView?.(button.dataset.view, { left: popup.style.left, top: popup.style.top });
    } else if (button.dataset.link) chartLinkClick(popup, button, options.links, root?.wtid);
    else if (button.dataset.mode) {
      state.mode = button.dataset.mode;
      bars.transition("fill").duration(400).attr("fill", (d) => fillFor(d.row, state.mode)); // (named: it mustn't stop the bars growing)
      drawLegend();
    } else if (button.dataset.act === "full") toggleChartFullScreen(popup);
    else if (button.dataset.act === "svg" || button.dataset.act === "png") {
      saveChart(svg.node(), `lifespans-${(root?.wtid || "chart").replace(/[^A-Za-z0-9_-]/g, "")}`, button.dataset.act);
    }
  });

  raiseAboveOtherPopups(popup);
  $(popup).draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
  return popup;
}
