// The family calendar popup, drawn with d3: the year as a clock face (1 January at
// the top, clockwise), every ancestor's birth and death a dot on its day, the
// oldest at the centre and the newest at the rim, like a tree's rings. A hand
// sweeps round the year as the dots appear and stops at today.
// Data comes from chat_family_calendar_data.js.

import { select } from "d3-selection";
import "d3-transition";
import { scaleLinear } from "d3-scale";
import { arc as d3arc } from "d3-shape";
import { easeCubicInOut } from "d3-ease";
import { MONTHS, dayOfYear } from "./chat_family_calendar_data";
import {
  createChartPopup,
  mountChartPopup,
  handleChartPopupButton,
  chartPopupControls,
  chartLinkButtons,
  chartLinkClick,
  escapeText,
  profileUrl,
  truncate,
} from "./chat_chart_common";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const INNER = 78;
const OUTER = 300;
const BAR_IN = OUTER + 14;
const BAR_MAX = 26;
const LABEL_R = BAR_IN + BAR_MAX + 22;
const SIZE = 2 * (LABEL_R + 26);
const DAYS = 366;
const GENERATION_COLOURS = ["#f2a541", "#2f6fb3", "#3a9fb7", "#2a9d8f", "#6a994e", "#bc6c25", "#9d4edd", "#d0577b", "#7f5539"];
const MODES = [
  { key: "both", label: "Births and deaths" },
  { key: "birth", label: "Births" },
  { key: "death", label: "Deaths" },
];

const angleOf = (doy) => (2 * Math.PI * (doy + 0.5)) / DAYS;
const xy = (angle, r) => [r * Math.sin(angle), -r * Math.cos(angle)];
const colourOf = (event) => GENERATION_COLOURS[Math.min(event.generation, GENERATION_COLOURS.length - 1)];
const lowerFirst = (text) => String(text || "").replace(/^\w/, (ch) => ch.toLowerCase());

/** events: from buildCalendarEvents. options: {title, links, rootKey, now, focusMonth}. */
export function showFamilyCalendarPopup(events, options = {}) {
  const now = options.now || new Date();
  const todayDoy = dayOfYear(now.getMonth() + 1, now.getDate());
  const state = { mode: "both", hoverMonth: 0 };
  const root = events.find((event) => event.generation === 0) || null;

  const popup = createChartPopup({
    id: "wbe-family-calendar-popup",
    html: `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-act="replay" title="Sweep through the year again">Replay</button>
        ${chartLinkButtons(options.links)}
        ${chartPopupControls()}
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        ${MODES.map((m) => `<button type="button" class="wbe-chart-mode" data-mode="${m.key}">${m.label}</button>`).join("")}
        <span class="wbe-chart-spacer"></span>
        <span style="opacity:.65">Oldest at the centre · ● born · ○ died · hover a month or a dot · click to open</span>
      </div>
      <div class="wbe-chart-stage"><div class="wbe-chart-tip"></div></div>
      <div class="wbe-chart-footer"><div class="wbe-chart-legend"></div></div>
    </div>`,
  });
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Family calendar";

  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");
  const svg = select(stage)
    .append("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("font-family", FONT)
    .attr("viewBox", `${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`)
    .style("height", "100%");
  const g = svg.append("g");

  const years = events.map((event) => event.year);
  const minYear = years.length ? Math.min(...years) : 1800;
  const maxYear = years.length ? Math.max(...years) : 2000;
  const r = scaleLinear()
    .domain([Math.floor(minYear / 50) * 50, Math.max(Math.ceil((maxYear + 1) / 10) * 10, Math.floor(minYear / 50) * 50 + 50)])
    .range([INNER + 8, OUTER - 6]);

  // Month wedges, alternately shaded; hovering one lights its dots.
  const monthStart = MONTHS.map((_, index) => dayOfYear(index + 1, 1));
  const monthArc = d3arc();
  const wedges = g
    .append("g")
    .selectAll("path")
    .data(MONTHS.map((name, index) => ({ name, month: index + 1, start: monthStart[index], end: index === 11 ? DAYS : monthStart[index + 1] })))
    .join("path")
    .attr("d", (d) => monthArc({ innerRadius: INNER, outerRadius: OUTER, startAngle: (2 * Math.PI * d.start) / DAYS, endAngle: (2 * Math.PI * d.end) / DAYS }))
    .attr("class", "wbe-cal-wedge")
    .attr("fill", (d) => (d.month % 2 ? "#f4f6f9" : "#e9edf2"))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .on("mouseenter", (event, d) => {
      state.hoverMonth = d.month;
      applyHighlight();
    })
    .on("mouseleave", () => {
      state.hoverMonth = 0;
      applyHighlight();
    });

  // Year rings (every 50 or 100 years), labelled up the 12 o'clock line.
  const [d0, d1] = r.domain();
  const step = d1 - d0 > 300 ? 100 : 50;
  const ringLayer = g.append("g").attr("pointer-events", "none");
  for (let year = d0; year <= d1 - step / 3; year += step) {
    ringLayer.append("circle").attr("class", "wbe-cal-ring").attr("r", r(year)).attr("fill", "none").attr("stroke", "#c9d1db").attr("stroke-dasharray", "2 3");
    ringLayer
      .append("text")
      .attr("x", 3)
      .attr("y", -r(year) - 2)
      .attr("font-size", 9)
      .attr("fill", "#8a94a3")
      .text(year);
  }

  // Births per month, as bars round the rim, with the month names outside.
  const barLayer = g.append("g").attr("pointer-events", "none");
  const labelLayer = g.append("g").attr("pointer-events", "none");
  MONTHS.forEach((name, index) => {
    const mid = (2 * Math.PI * (monthStart[index] + (index === 11 ? DAYS : monthStart[index + 1])) * 0.5) / DAYS;
    const [lx, ly] = xy(mid, LABEL_R);
    labelLayer
      .append("text")
      .attr("x", lx)
      .attr("y", ly)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .attr("class", "wbe-cal-month")
      .attr("fill", "#4a5463")
      .text(name.slice(0, 3));
    labelLayer
      .append("text")
      .attr("class", "wbe-cal-count")
      .attr("data-month", index + 1)
      .attr("x", lx)
      .attr("y", ly)
      .attr("text-anchor", "middle")
      .attr("dy", "1.45em")
      .attr("font-size", 9.5)
      .attr("fill", "#8a94a3");
  });
  function drawBars() {
    barLayer.selectAll("*").remove();
    const shown = visibleEvents();
    const counts = MONTHS.map((_, index) => shown.filter((event) => event.month === index + 1).length);
    const max = Math.max(1, ...counts);
    labelLayer.selectAll(".wbe-cal-count").text(function () {
      const count = counts[Number(this.getAttribute("data-month")) - 1];
      return count ? String(count) : "";
    });
    counts.forEach((count, index) => {
      if (!count) return;
      const start = (2 * Math.PI * monthStart[index]) / DAYS;
      const end = (2 * Math.PI * (index === 11 ? DAYS : monthStart[index + 1])) / DAYS;
      barLayer
        .append("path")
        .attr("d", monthArc({ innerRadius: BAR_IN, outerRadius: BAR_IN + 3 + (BAR_MAX * count) / max, startAngle: start + 0.012, endAngle: end - 0.012, cornerRadius: 2 }))
        .attr("fill", state.mode === "death" ? "#8a94a3" : "#7fa7d6")
        .append("title")
        .text(`${MONTHS[index]}: ${count}`);
    });
  }

  // Today: a gold line and label at today's angle.
  const todayAngle = angleOf(todayDoy);
  const todayLayer = g.append("g").attr("pointer-events", "none");
  const [tx1, ty1] = xy(todayAngle, INNER - 4);
  const [tx2, ty2] = xy(todayAngle, OUTER + 8);
  todayLayer.append("line").attr("x1", tx1).attr("y1", ty1).attr("x2", tx2).attr("y2", ty2).attr("stroke", "#e0a100").attr("stroke-width", 2.5).attr("stroke-linecap", "round");
  const [tlx, tly] = xy(todayAngle, OUTER + 2);
  todayLayer
    .append("text")
    .attr("x", tlx)
    .attr("y", tly)
    .attr("dx", Math.sin(todayAngle) >= 0 ? 6 : -6)
    .attr("text-anchor", Math.sin(todayAngle) >= 0 ? "start" : "end")
    .attr("font-size", 10.5)
    .attr("font-weight", 700)
    .attr("fill", "#b37f00")
    .text("Today");

  // The dots. Same-day events at the same year would sit on each other, so nudge them out.
  const placedAt = new Map();
  events.forEach((event) => {
    const key = `${event.doy}:${Math.round(r(event.year))}`;
    const n = placedAt.get(key) || 0;
    placedAt.set(key, n + 1);
    event.angle = angleOf(event.doy);
    event.radius = r(event.year) + n * 6;
    [event.x, event.y] = xy(event.angle, event.radius);
    event.today = event.doy === todayDoy;
  });
  const dotLayer = g.append("g");
  const dots = dotLayer
    .selectAll("circle")
    .data(events)
    .join("circle")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", (d) => (d.today ? 7 : d.generation <= 2 ? 5.5 : 4.2))
    .attr("fill", (d) => (d.type === "birth" ? colourOf(d) : "#fff"))
    .attr("stroke", (d) => (d.type === "birth" ? "#fff" : colourOf(d)))
    .attr("stroke-width", (d) => (d.type === "birth" ? 1 : 2))
    .style("cursor", (d) => (d.wtid ? "pointer" : "default"))
    .on("mousemove", (event, d) => showTip(event, d))
    .on("mouseenter", (event, d) => {
      state.hoverDay = d.doy;
      applyHighlight();
    })
    .on("mouseleave", () => {
      state.hoverDay = null;
      tip.style.opacity = "0";
      applyHighlight();
    })
    .on("click", (event, d) => d.wtid && window.open(profileUrl(d.wtid), "_blank", "noopener,noreferrer"));
  // Today's events pulse gently.
  dots.filter((d) => d.today).classed("wbe-cal-today", true);

  // Centre: who, and what's shown.
  const centre = g.append("g").attr("pointer-events", "none");
  centre.append("circle").attr("r", INNER - 6).attr("fill", "#2f6fb3");
  const centreTop = centre.append("text").attr("text-anchor", "middle").attr("dy", "-0.5em").attr("font-size", 12.5).attr("font-weight", 700).attr("fill", "#fff");
  const centreMid = centre.append("text").attr("text-anchor", "middle").attr("dy", "0.9em").attr("font-size", 10.5).attr("fill", "#dce9ff");
  const centreLow = centre.append("text").attr("text-anchor", "middle").attr("dy", "2.2em").attr("font-size", 10.5).attr("fill", "#dce9ff");

  function visibleEvents() {
    return state.mode === "both" ? events : events.filter((event) => event.type === state.mode);
  }

  function setCentre() {
    const shown = visibleEvents();
    if (state.hoverMonth) {
      const inMonth = shown.filter((event) => event.month === state.hoverMonth);
      centreTop.text(MONTHS[state.hoverMonth - 1]);
      centreMid.text(`${inMonth.filter((e) => e.type === "birth").length} born`);
      centreLow.text(`${inMonth.filter((e) => e.type === "death").length} died`);
      return;
    }
    centreTop.text(truncate(root?.name || options.rootKey || "", 14));
    centreMid.text(`${shown.filter((e) => e.type === "birth").length} birthdays`);
    centreLow.text(`${shown.filter((e) => e.type === "death").length} deaths`);
  }

  function applyHighlight() {
    const shown = new Set(visibleEvents());
    dots
      .attr("display", (d) => (shown.has(d) ? null : "none"))
      .attr("opacity", (d) => {
        if (state.hoverMonth) return d.month === state.hoverMonth ? 1 : 0.12;
        if (state.hoverDay !== null && state.hoverDay !== undefined) return d.doy === state.hoverDay ? 1 : 0.25;
        return 1;
      });
    wedges.attr("fill", (d) => (d.month === state.hoverMonth ? "#dbe7f5" : d.month % 2 ? "#f4f6f9" : "#e9edf2"));
    setCentre();
  }

  function showTip(event, d) {
    const rect = stage.getBoundingClientRect();
    const sameDay = events.filter((other) => other !== d && other.doy === d.doy);
    const verb = d.type === "birth" ? "Born" : "Died";
    tip.innerHTML = `${d.relation ? `<div class="wbe-chart-tip-rel">${escapeText(d.relation)}</div>` : ""}<b>${escapeText(d.name)}</b>
      <div>${verb} ${d.day} ${MONTHS[d.month - 1]} ${d.year}</div>
      ${d.place ? `<div style="opacity:.8">${escapeText(d.place)}</div>` : ""}
      ${
        sameDay.length
          ? `<div style="margin-top:4px;opacity:.85">Same day: ${sameDay
              .slice(0, 4)
              .map((other) => `${escapeText(other.name)} (${other.type === "birth" ? "b." : "d."} ${other.year})`)
              .join(", ")}${sameDay.length > 4 ? "…" : ""}</div>`
          : ""
      }`;
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
    tip.style.top = `${Math.min(event.clientY - rect.top + 14, rect.height - 120)}px`;
    tip.style.opacity = "1";
  }

  function drawLegend() {
    const legend = popup.querySelector(".wbe-chart-legend");
    const generations = [...new Set(events.map((event) => event.generation))].sort((a, b) => a - b);
    legend.innerHTML = generations
      .map((generation) => {
        const sample = events.find((event) => event.generation === generation);
        const label = generation === 0 ? sample?.name || "Root" : generation === 1 ? "Parents" : generation === 2 ? "Grandparents" : generation === 3 ? "Great-grandparents" : `${generation - 2}x great-grandparents`;
        return `<span><i style="background:${GENERATION_COLOURS[Math.min(generation, GENERATION_COLOURS.length - 1)]}"></i>${escapeText(label)}</span>`;
      })
      .join("");
  }

  // The sweep: a hand goes round the year once, dots appearing as it passes, and stops at today.
  const hand = g.append("line").attr("stroke", "#2f6fb3").attr("stroke-width", 2).attr("stroke-linecap", "round").attr("pointer-events", "none").attr("opacity", 0);
  function sweep() {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const total = reduce ? 0 : 2200;
    const end = 2 * Math.PI + todayAngle;
    dots.interrupt().attr("opacity", 0);
    dots
      .transition()
      .delay((d) => (total * d.angle) / (2 * Math.PI))
      .duration(reduce ? 0 : 300)
      .attr("opacity", 1)
      .on("end", (d, i, nodes) => i === nodes.length - 1 && applyHighlight());
    if (reduce) {
      hand.attr("opacity", 0);
      return;
    }
    hand
      .interrupt()
      .attr("opacity", 0.85)
      .transition()
      .duration(total + (total * todayAngle) / (2 * Math.PI))
      .ease(easeCubicInOut)
      .attrTween("x2", () => (t) => xy(t * end, OUTER + 8)[0])
      .attrTween("y2", () => (t) => xy(t * end, OUTER + 8)[1])
      .transition()
      .duration(500)
      .attr("opacity", 0);
  }

  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (
      handleChartPopupButton(popup, button, {
        svg: svg.node(),
        fileBase: `family-calendar-${String(root?.wtid || options.rootKey || "chart").replace(/[^A-Za-z0-9_-]/g, "")}`,
      })
    )
      return;
    if (button.dataset.link) chartLinkClick(popup, button, options.links, root?.wtid || options.rootKey);
    else if (button.dataset.mode) {
      state.mode = button.dataset.mode;
      popup.querySelectorAll(".wbe-chart-mode").forEach((b) => b.classList.toggle("active", b.dataset.mode === state.mode));
      drawBars();
      applyHighlight();
    } else if (button.dataset.act === "replay") sweep();
  });

  popup.querySelectorAll(".wbe-chart-mode").forEach((b) => b.classList.toggle("active", b.dataset.mode === state.mode));
  hand.attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", -(OUTER + 8));
  drawBars();
  drawLegend();
  if (options.focusMonth) state.hoverMonth = options.focusMonth;
  applyHighlight();
  sweep();
  mountChartPopup(popup, () => {
    svg.interrupt();
    svg.selectAll("*").interrupt();
  });
  return popup;
}
