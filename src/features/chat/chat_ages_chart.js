// The Lives & ages popup, drawn with d3 (2026-10-04). Every ancestor is a dot: born
// in year x, died aged y ("Age at death"), or a father or mother aged y when the next
// ancestor was born in year x ("Age at parenthood", where a line joins the two parents
// of each child). A line shows the average through the centuries. Dots rise into
// place left to right; ages that can't be right get a red ring.
// Data comes from chat_ages_data.js.

import { select } from "d3-selection";
import "d3-transition";
import { scaleLinear } from "d3-scale";
import { line as d3line, curveMonotoneX } from "d3-shape";
import { easeCubicOut } from "d3-ease";
import { ageTrend, deathAgeRows, parentAgeRows } from "./chat_ages_data";
import { createChartPopup, mountChartPopup, handleChartPopupButton, chartPopupControls, chartLinkButtons, chartLinkClick, escapeText, profileUrl, } from "./chat_chart_common";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const WIDTH = 940;
const HEIGHT = 520;
const MARGIN = { top: 24, right: 30, bottom: 44, left: 52 };
const COLOURS = { Male: "#3f7cc4", Female: "#d0578a", "": "#8a94a3", flag: "#d62828", trend: "#2b2b2b" };
const MODES = [
  { key: "death", label: "Age at death" },
  { key: "parent", label: "Age at parenthood" },
];

/** slots: from buildFanSlots. options: {title, links, mode, rootKey}. */
export function showAgesPopup(slots, options = {}) {
  const data = { death: deathAgeRows(slots), parent: parentAgeRows(slots) };
  const state = { mode: MODES.some((m) => m.key === options.mode) ? options.mode : "death", flagsOnly: options.mode === "problems" };
  if (options.mode === "problems") state.mode = data.death.some((row) => row.flag) || !data.parent.some((row) => row.flag) ? "death" : "parent";

  const popup = createChartPopup({
    id: "wbe-ages-popup",
    html: `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-act="replay" title="Draw the dots again">Replay</button>
        ${chartLinkButtons(options.links)}
        ${chartPopupControls()}
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        ${MODES.map((m) => `<button type="button" class="wbe-chart-mode" data-mode="${m.key}">${m.label}</button>`).join("")}
        <button type="button" class="wbe-chart-mode" data-act="flags" title="Show only the ages that look wrong">Check these</button>
        <span class="wbe-chart-spacer"></span>
        <span style="opacity:.65">Hover a dot for the person · click to open their profile</span>
      </div>
      <div class="wbe-chart-stage"><div class="wbe-chart-tip"></div></div>
      <div class="wbe-chart-footer"><div class="wbe-chart-stats"></div><div class="wbe-chart-legend"></div></div>
    </div>`,
  });
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Lives & ages";

  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");
  const svg = select(stage)
    .append("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("font-family", FONT)
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");
  svg.append("rect").attr("width", WIDTH).attr("height", HEIGHT).attr("fill", "#ffffff");
  const g = svg.append("g");

  function rowsNow() {
    const rows = data[state.mode];
    return state.flagsOnly ? rows.filter((row) => row.flag) : rows;
  }

  function showTip(event, row) {
    const rect = stage.getBoundingClientRect();
    const what =
      state.mode === "death"
        ? `Born ${row.born}, died aged ${row.approx ? "about " : ""}${row.age}`
        : `${row.role === "father" ? "Father" : "Mother"} of ${escapeText(row.childName)}: aged ${row.approx ? "about " : ""}${row.age} when ${row.role === "father" ? "his" : "her"} child was born in ${row.born}`;
    tip.innerHTML = `${row.relation ? `<div class="wbe-chart-tip-rel">${escapeText(row.relation)}</div>` : ""}<b>${escapeText(row.name)}</b> <span style="opacity:.7">(${escapeText(row.wtid)})</span>
      <div>${what}</div>
      ${row.flag ? `<div style="color:${COLOURS.flag};font-weight:600;margin-top:3px">${escapeText(row.flag)}</div>` : ""}
      <div class="wbe-chart-tip-hint">Click to open the profile</div>`;
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
    tip.style.top = `${Math.min(event.clientY - rect.top + 14, rect.height - 120)}px`;
    tip.style.opacity = "1";
  }

  function draw({ animate = true } = {}) {
    g.selectAll("*").remove();
    popup.querySelectorAll(".wbe-chart-mode[data-mode]").forEach((b) => b.classList.toggle("active", b.dataset.mode === state.mode));
    popup.querySelector('[data-act="flags"]').classList.toggle("active", state.flagsOnly);
    const all = data[state.mode];
    const rows = rowsNow();
    const flagged = all.filter((row) => row.flag).length;
    popup.querySelector('[data-act="flags"]').textContent = `Check these (${flagged})`;
    popup.querySelector('[data-act="flags"]').disabled = !flagged;

    const years = all.map((row) => row.born);
    const minYear = years.length ? Math.floor((Math.min(...years) - 5) / 10) * 10 : 1700;
    const maxYear = years.length ? Math.ceil((Math.max(...years) + 5) / 10) * 10 : 2000;
    const maxAge = Math.max(state.mode === "death" ? 100 : 60, ...all.filter((row) => !row.flag).map((row) => row.age + 5));
    const minAge = Math.min(0, ...all.map((row) => row.age));
    const x = scaleLinear().domain([minYear, maxYear]).range([MARGIN.left, WIDTH - MARGIN.right]);
    const y = scaleLinear()
      .domain([minAge, Math.min(maxAge, 125)])
      .range([HEIGHT - MARGIN.bottom, MARGIN.top])
      .clamp(true);

    // The usual range for having children, behind everything.
    if (state.mode === "parent") {
      g.append("rect")
        .attr("x", MARGIN.left)
        .attr("width", WIDTH - MARGIN.left - MARGIN.right)
        .attr("y", y(45))
        .attr("height", y(18) - y(45))
        .attr("fill", "#eef6ee");
      g.append("text")
        .attr("x", WIDTH - MARGIN.right - 6)
        .attr("y", y(45) + 14)
        .attr("text-anchor", "end")
        .attr("font-size", 11)
        .attr("fill", "#6a8f6a")
        .text("Usual ages for having children (18–45)");
    }

    // Grid and axes.
    const grid = g.append("g").attr("font-size", 11).attr("fill", "#6b7480");
    for (let age = Math.ceil(minAge / 10) * 10; age <= y.domain()[1]; age += 10) {
      grid.append("line").attr("x1", MARGIN.left).attr("x2", WIDTH - MARGIN.right).attr("y1", y(age)).attr("y2", y(age)).attr("stroke", age === 0 ? "#9aa3ad" : "#e6e9ed");
      grid.append("text").attr("x", MARGIN.left - 8).attr("y", y(age)).attr("dy", "0.35em").attr("text-anchor", "end").text(age);
    }
    const step = maxYear - minYear > 300 ? 50 : 25;
    for (let year = Math.ceil(minYear / step) * step; year <= maxYear; year += step) {
      grid.append("line").attr("x1", x(year)).attr("x2", x(year)).attr("y1", MARGIN.top).attr("y2", HEIGHT - MARGIN.bottom).attr("stroke", "#f0f2f5");
      grid.append("text").attr("x", x(year)).attr("y", HEIGHT - MARGIN.bottom + 18).attr("text-anchor", "middle").text(year);
    }
    grid
      .append("text")
      .attr("transform", `translate(14,${(MARGIN.top + HEIGHT - MARGIN.bottom) / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .text(state.mode === "death" ? "Age at death" : "Parent's age at the birth");
    grid
      .append("text")
      .attr("x", (MARGIN.left + WIDTH - MARGIN.right) / 2)
      .attr("y", HEIGHT - 6)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .text(state.mode === "death" ? "Year of birth" : "Year the child was born");

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const sweep = animate && !reduce ? 1800 : 0;
    const delayOf = (row) => (sweep * (row.born - minYear)) / Math.max(1, maxYear - minYear);

    // Parent mode: a line joins the father and mother of each child, showing their age gap.
    if (state.mode === "parent" && !state.flagsOnly) {
      const byChild = new Map();
      rows.forEach((row) => {
        if (!byChild.has(row.childWtid)) byChild.set(row.childWtid, []);
        byChild.get(row.childWtid).push(row);
      });
      const pairs = [...byChild.values()].filter((pair) => pair.length === 2);
      g.append("g")
        .selectAll("line")
        .data(pairs)
        .join("line")
        .attr("x1", (pair) => x(pair[0].born))
        .attr("x2", (pair) => x(pair[1].born))
        .attr("y1", (pair) => y(pair[0].age))
        .attr("y2", (pair) => y(pair[1].age))
        .attr("stroke", "#c3c9d1")
        .attr("stroke-width", 1.2)
        .attr("opacity", sweep ? 0 : 1)
        .transition()
        .delay((pair) => delayOf(pair[0]) + 500)
        .duration(sweep ? 300 : 0)
        .attr("opacity", 1);
    }

    // The average through the centuries.
    const trend = state.flagsOnly ? [] : ageTrend(rows).filter((point) => point.count >= 2);
    if (trend.length >= 2) {
      const path = g
        .append("path")
        .attr("d", d3line()
          .x((point) => x(point.year))
          .y((point) => y(point.age))
          .curve(curveMonotoneX)(trend))
        .attr("fill", "none")
        .attr("stroke", COLOURS.trend)
        .attr("stroke-width", 2.5)
        .attr("stroke-linecap", "round")
        .attr("opacity", 0.75);
      if (sweep) {
        const length = path.node().getTotalLength?.() || 0;
        path
          .attr("stroke-dasharray", `${length} ${length}`)
          .attr("stroke-dashoffset", length)
          .transition()
          .delay(sweep * 0.4)
          .duration(sweep)
          .ease(easeCubicOut)
          .attr("stroke-dashoffset", 0);
      }
      const last = trend[trend.length - 1];
      g.append("text")
        .attr("x", Math.min(x(last.year) + 6, WIDTH - MARGIN.right - 50))
        .attr("y", y(last.age) - 8)
        .attr("font-size", 11)
        .attr("font-weight", 600)
        .attr("fill", COLOURS.trend)
        .text(`Average ${Math.round(last.age)}`);
    }

    // The dots, rising into place left to right.
    g.append("g")
      .selectAll("circle")
      .data(rows)
      .join("circle")
      .attr("cx", (row) => x(row.born))
      .attr("cy", sweep ? y(Math.max(0, minAge)) : (row) => y(row.age))
      .attr("r", (row) => (row.flag ? 6.5 : 5.5))
      .attr("fill", (row) => COLOURS[row.role ? (row.role === "father" ? "Male" : "Female") : row.gender || ""] || COLOURS[""])
      .attr("fill-opacity", (row) => (row.approx ? 0.55 : 0.9))
      .attr("stroke", (row) => (row.flag ? COLOURS.flag : "#ffffff"))
      .attr("stroke-width", (row) => (row.flag ? 2.5 : 1.2))
      .attr("opacity", sweep ? 0 : 1)
      .style("cursor", "pointer")
      .on("mousemove", (event, row) => showTip(event, row))
      .on("mouseleave", () => {
        tip.style.opacity = "0";
      })
      .on("click", (event, row) => row.wtid && window.open(profileUrl(row.wtid), "_blank"))
      .transition()
      .delay(delayOf)
      .duration(sweep ? 650 : 0)
      .ease(easeCubicOut)
      .attr("opacity", 1)
      .attr("cy", (row) => y(row.age));

    drawFooter(rows, flagged);
  }

  function drawFooter(rows, flagged) {
    const good = rows.filter((row) => !row.flag);
    const average = good.length ? Math.round(good.reduce((sum, row) => sum + row.age, 0) / good.length) : 0;
    popup.querySelector(".wbe-chart-stats").innerHTML = state.flagsOnly
      ? `<strong>${flagged}</strong>ages to check`
      : `<strong>${average}</strong>${state.mode === "death" ? "average age at death" : "average age of a parent"} · ${good.length} people`;
    const parts =
      state.mode === "death"
        ? [
            { colour: COLOURS.Male, label: "Men" },
            { colour: COLOURS.Female, label: "Women" },
          ]
        : [
            { colour: COLOURS.Male, label: "Fathers" },
            { colour: COLOURS.Female, label: "Mothers" },
          ];
    popup.querySelector(".wbe-chart-legend").innerHTML = [
      ...parts.map((part) => `<span><i style="background:${part.colour}"></i>${part.label}</span>`),
      `<span><i style="background:${COLOURS.trend};height:3px"></i>Average by quarter-century</span>`,
      `<span><i style="background:#fff;border:2px solid ${COLOURS.flag}"></i>Looks wrong (${flagged})</span>`,
      `<span style="opacity:.75">Paler dots: dates only to the year</span>`,
    ].join("");
  }

  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (
      handleChartPopupButton(popup, button, {
        svg: svg.node(),
        fileBase: `lives-and-ages-${String(slots[1]?.wtid || "chart").replace(/[^A-Za-z0-9_-]/g, "")}`,
      })
    )
      return;
    if (button.dataset.link) chartLinkClick(popup, button, options.links, slots[1]?.wtid || options.rootKey);
    else if (button.dataset.mode) {
      state.mode = button.dataset.mode;
      draw();
    } else if (button.dataset.act === "flags") {
      state.flagsOnly = !state.flagsOnly;
      draw({ animate: false });
    } else if (button.dataset.act === "replay") draw();
  });

  draw();
  mountChartPopup(popup, () => {
    svg.interrupt();
    svg.selectAll("*").interrupt();
  });
  return popup;
}
