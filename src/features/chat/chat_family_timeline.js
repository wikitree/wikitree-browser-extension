// The family timeline popup, drawn with d3: one bar per life, grouped by
// relation. Hovering scrubs a year line that shows everyone's age in that year;
// history bands give context (regional ones only when the family has places
// there). Data comes from chat_family_timeline_data.js.

import { select, pointer } from "d3-selection";
import "d3-transition";
import { scaleLinear } from "d3-scale";
import { easeCubicOut } from "d3-ease";
import { aliveIn, rowSpan } from "./chat_family_timeline_data";
import { createChartPopup, mountChartPopup, handleChartPopupButton, chartPopupControls, chartLinkButtons, chartLinkClick, escapeText, profileUrl, truncate, yearOf } from "./chat_chart_common";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const ROW_H = 24;
const GROUP_GAP = 16;
const LEFT = 200;
const RIGHT = 64;
const TOP = 34;
const WIDTH = 960;
const ROLE_COLOURS = {
  parent: "#8e6cc2",
  self: "#2f6fb3",
  spouse: "#d0577b",
  sibling: "#3f9d8f",
  child: "#e08a2e",
  grandchild: "#c2a23a",
};
const GROUP_LABELS = { parent: "Parents", self: "", spouse: "Spouses", sibling: "Siblings", child: "Children", grandchild: "Grandchildren" };

// Context bands. "where" limits a band to families with a place matching it.
const HISTORY = [
  { start: 1845, end: 1852, label: "Great Famine", where: /\bIreland\b/i },
  { start: 1853, end: 1856, label: "Crimean War", where: /\b(?:England|Scotland|Wales|France|Russia|Turkey)\b/i },
  { start: 1861, end: 1865, label: "US Civil War", where: /\b(?:USA|United States|America)\b|,\s*[A-Z][a-z]+,\s*USA?\b/i },
  { start: 1899, end: 1902, label: "Boer War", where: /\b(?:South Africa|England|Scotland|Wales|Australia|New Zealand|Canada)\b/i },
  { start: 1914, end: 1918, label: "First World War" },
  { start: 1918, end: 1920, label: "1918 flu" },
  { start: 1929, end: 1939, label: "Great Depression" },
  { start: 1939, end: 1945, label: "Second World War" },
];

function historyFor(rows, first, last) {
  const places = rows.map((row) => `${row.birthLocation} ${row.deathLocation}`).join(" | ");
  return HISTORY.filter((band) => band.end >= first && band.start <= last && (!band.where || band.where.test(places)));
}

/** rows: from buildFamilyTimelineRows. options: {title}. */
export function showFamilyTimelinePopup(rows, options = {}) {
  const now = new Date().getFullYear();
  const placed = rows.map((row) => ({ row, span: rowSpan(row, now) })).filter(({ span }) => span);
  const undated = rows.filter((row) => !rowSpan(row, now));

  const popup = createChartPopup({
    id: "wbe-family-timeline-popup",
    html: `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-act="history" title="Show or hide history bands">History</button>
        ${chartLinkButtons(options.links)}
        ${chartPopupControls()}
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        <span style="opacity:.65">Move across the chart to see who was alive, and how old · click a bar to open the profile</span>
      </div>
      <div class="wbe-chart-stage" style="overflow-y:auto"><div class="wbe-chart-tip"></div></div>
      <div class="wbe-chart-footer"><div class="wbe-chart-legend"></div></div>
    </div>`,
  });
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Family timeline";

  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");

  // Vertical layout: groups in role order, a gap between groups.
  let y = TOP;
  let lastRole = null;
  const groups = [];
  placed.forEach((item) => {
    if (item.row.role !== lastRole) {
      if (lastRole !== null) y += GROUP_GAP;
      groups.push({ role: item.row.role, y });
      lastRole = item.row.role;
    }
    item.y = y;
    y += ROW_H;
  });
  const height = y + 40;
  const first = Math.min(...placed.map(({ span }) => span.start));
  const last = Math.max(...placed.map(({ span }) => span.end));
  const x = scaleLinear()
    .domain([Math.floor((first - 3) / 10) * 10, Math.ceil((last + 3) / 10) * 10])
    .range([LEFT, WIDTH - RIGHT]);

  const svg = select(stage)
    .append("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("font-family", FONT)
    .attr("viewBox", `0 0 ${WIDTH} ${height}`)
    .style("height", "auto")
    .style("cursor", "crosshair");
  const root = svg.append("g");
  const defs = svg.append("defs");

  // Fading ends for unknown death dates.
  Object.entries(ROLE_COLOURS).forEach(([role, colour]) => {
    const gradient = defs.append("linearGradient").attr("id", `wbe-tl-fade-${role}`).attr("x1", "0").attr("x2", "1");
    gradient.append("stop").attr("offset", "55%").attr("stop-color", colour).attr("stop-opacity", 1);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", colour).attr("stop-opacity", 0);
  });

  // History bands.
  const bands = root.append("g").attr("class", "wbe-tl-history");
  historyFor(rows, first, last).forEach((band, index) => {
    const g = bands.append("g");
    g.append("rect")
      .attr("x", x(band.start))
      .attr("y", TOP - 6)
      .attr("width", Math.max(2, x(band.end) - x(band.start)))
      .attr("height", height - TOP - 18)
      .attr("fill", "#7f8c9a")
      .attr("fill-opacity", 0.09);
    g.append("text")
      .attr("x", x(band.start) + 3)
      .attr("y", height - 6 - (index % 3) * 10)
      .attr("font-size", 9.5)
      .attr("fill", "#6b7785")
      .text(band.label);
  });

  // Decade grid and axis.
  const ticks = x.ticks(Math.min(14, Math.round((x.domain()[1] - x.domain()[0]) / 10)));
  const grid = root.append("g");
  ticks.forEach((year) => {
    grid.append("line").attr("x1", x(year)).attr("x2", x(year)).attr("y1", TOP - 8).attr("y2", height - 24).attr("stroke", "#000").attr("stroke-opacity", 0.07);
    grid.append("text").attr("x", x(year)).attr("y", TOP - 14).attr("text-anchor", "middle").attr("font-size", 10.5).attr("fill", "#6b7785").text(year);
  });

  // Group labels.
  groups.forEach((group) => {
    if (!GROUP_LABELS[group.role]) return;
    root.append("text").attr("x", 8).attr("y", group.y - 3).attr("font-size", 9.5).attr("font-weight", 700).attr("letter-spacing", "0.06em").attr("fill", ROLE_COLOURS[group.role]).text(GROUP_LABELS[group.role].toUpperCase());
  });

  // Rows.
  const rowG = root
    .append("g")
    .selectAll("g")
    .data(placed)
    .join("g")
    .attr("transform", (d) => `translate(0,${d.y})`)
    .style("cursor", "pointer")
    .on("click", (event, d) => d.row.wtid && window.open(profileUrl(d.row.wtid), "_blank", "noopener,noreferrer"));
  rowG.append("title").text((d) => [d.row.relation, d.row.wtid, d.row.birthLocation && `Born in ${d.row.birthLocation}`].filter(Boolean).join(" · "));

  rowG
    .append("text")
    .attr("x", LEFT - 10)
    .attr("y", ROW_H / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .attr("font-size", (d) => (d.row.role === "self" ? 12.5 : 11.5))
    .attr("font-weight", (d) => (d.row.role === "self" ? 700 : 500))
    .attr("fill", "#2b2f36")
    .text((d) => truncate(`${d.row.name}${d.row.lnab && !d.row.name.includes(d.row.lnab) ? ` ${d.row.lnab}` : ""}`, 26));

  const bars = rowG
    .append("rect")
    .attr("class", "wbe-tl-bar")
    .attr("x", (d) => x(d.span.start))
    .attr("y", 5)
    .attr("height", ROW_H - 10)
    .attr("rx", (ROW_H - 10) / 2)
    .attr("fill", (d) => (d.span.endKnown || d.span.living ? ROLE_COLOURS[d.row.role] : `url(#wbe-tl-fade-${d.row.role})`))
    .attr("stroke", (d) => (d.row.role === "self" ? "#f2c14e" : "none"))
    .attr("stroke-width", 2)
    .attr("width", 0);
  bars
    .transition()
    .delay((d, i) => 120 + i * 45)
    .duration(700)
    .ease(easeCubicOut)
    .attr("width", (d) => Math.max(4, x(d.span.end) - x(d.span.start)));

  // Years at each end of the bar.
  rowG
    .append("text")
    .attr("class", "wbe-tl-years")
    .attr("x", (d) => x(d.span.end) + 5)
    .attr("y", ROW_H / 2)
    .attr("dy", "0.35em")
    .attr("font-size", 10)
    .attr("fill", "#6b7785")
    .attr("opacity", 0)
    .text((d) => {
      if (d.span.living) return `${d.span.start}– living`;
      return `${d.span.start}–${d.span.endKnown ? d.span.end : "?"}`;
    })
    .transition()
    .delay((d, i) => 600 + i * 45)
    .duration(300)
    .attr("opacity", 1);

  // Life events on the person's own bar: marriages, children born, parents died.
  const selfItem = placed.find(({ row }) => row.role === "self");
  if (selfItem) {
    const events = [];
    placed.forEach(({ row }) => {
      if (row.role === "spouse" && yearOf(row.marriage)) events.push({ year: yearOf(row.marriage), kind: "marriage", text: `Married ${row.name}${row.marriagePlace ? ` in ${row.marriagePlace}` : ""}` });
      if (row.role === "child" && yearOf(row.birth)) events.push({ year: yearOf(row.birth), kind: "child", text: `${row.relation} ${row.name} born` });
      if (row.role === "parent" && yearOf(row.death)) events.push({ year: yearOf(row.death), kind: "death", text: `${row.relation} ${row.name} died` });
    });
    const eventG = root.append("g").attr("transform", `translate(0,${selfItem.y})`);
    eventG
      .selectAll("path")
      .data(events)
      .join("path")
      .attr("transform", (d) => `translate(${x(d.year)},${ROW_H / 2})`)
      .attr("d", (d) => (d.kind === "marriage" ? "M0,-6L6,0L0,6L-6,0Z" : d.kind === "child" ? "M-4,0a4,4 0 1,0 8,0a4,4 0 1,0 -8,0" : "M-1.2,-6h2.4v3.6h3.6v2.4h-3.6v6h-2.4v-6h-3.6v-2.4h3.6z"))
      .attr("fill", (d) => (d.kind === "marriage" ? "#d0577b" : d.kind === "child" ? "#fff" : "#2b2f36"))
      .attr("stroke", (d) => (d.kind === "child" ? "#e08a2e" : "#fff"))
      .attr("stroke-width", 1.5)
      .attr("opacity", 0)
      .style("cursor", "help")
      .on("mousemove", (event, d) => {
        event.stopPropagation();
        showTipHtml(event, `<b>${d.year}</b><div>${escapeText(d.text)}</div>`);
      })
      .transition()
      .delay(900)
      .duration(400)
      .attr("opacity", 1);
  }

  // The scrubber: a year line, an age bubble on every bar alive that year.
  const scrub = root.append("g").attr("pointer-events", "none").attr("opacity", 0);
  const scrubLine = scrub.append("line").attr("y1", TOP - 8).attr("y2", height - 24).attr("stroke", "#2f6fb3").attr("stroke-width", 1.5);
  const scrubPill = scrub.append("rect").attr("y", TOP - 27).attr("width", 40).attr("height", 18).attr("rx", 9).attr("fill", "#2f6fb3");
  const scrubYear = scrub.append("text").attr("y", TOP - 14).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).attr("fill", "#fff");
  const ageLayer = scrub.append("g");

  function showTipHtml(event, html) {
    const rect = stage.getBoundingClientRect();
    tip.innerHTML = html;
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 290)}px`;
    tip.style.top = `${Math.min(event.clientY - rect.top + stage.scrollTop + 14, stage.scrollTop + rect.height - 140)}px`;
    tip.style.opacity = "1";
  }

  svg.on("mousemove", (event) => {
    const [mx] = pointer(event, svg.node());
    if (mx < LEFT) return;
    const year = Math.round(x.invert(mx));
    const alive = aliveIn(rows, year, now);
    const aliveIds = new Set(alive.map(({ row }) => row.id));
    scrub.attr("opacity", 1);
    scrubLine.attr("x1", x(year)).attr("x2", x(year));
    scrubYear.attr("x", x(year)).text(year);
    scrubPill.attr("x", x(year) - 20);
    bars.attr("fill-opacity", (d) => (aliveIds.has(d.row.id) ? 1 : 0.25));
    const bubbles = ageLayer.selectAll("g").data(
      placed.filter(({ row }) => aliveIds.has(row.id)),
      (d) => d.row.id
    );
    const entered = bubbles.enter().append("g");
    entered.append("circle").attr("r", 9).attr("fill", "#fff").attr("stroke", "#2f6fb3").attr("stroke-width", 1.5);
    entered.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").attr("font-size", 9.5).attr("font-weight", 700).attr("fill", "#2f6fb3");
    bubbles.exit().remove();
    entered
      .merge(bubbles)
      .attr("transform", (d) => `translate(${x(year)},${d.y + ROW_H / 2})`)
      .select("text")
      .text((d) => year - d.span.start);
    const lines = alive
      .slice(0, 14)
      .map(({ row, age, approximate }) => `<div>${escapeText(row.name)}${row.relation ? ` <span style="opacity:.6">${escapeText(row.relation.replace(/^\w+/, (word) => word.toLowerCase()))}</span>` : ""}: ${approximate ? "~" : ""}${age}</div>`)
      .join("");
    showTipHtml(event, `<div class="wbe-chart-tip-rel">In ${year}</div>${lines || "<div>Nobody here was alive.</div>"}${alive.length > 14 ? `<div>…and ${alive.length - 14} more</div>` : ""}`);
  });
  svg.on("mouseleave", () => {
    scrub.attr("opacity", 0);
    bars.attr("fill-opacity", 1);
    tip.style.opacity = "0";
  });

  const legend = popup.querySelector(".wbe-chart-legend");
  Object.entries(GROUP_LABELS).forEach(([role, label]) => {
    if (!placed.some(({ row }) => row.role === role)) return;
    const span = document.createElement("span");
    span.innerHTML = `<i style="background:${ROLE_COLOURS[role]}"></i>`;
    span.appendChild(document.createTextNode(label || selfItem?.row.name || "Self"));
    legend.appendChild(span);
  });
  [
    ["◆", "#d0577b", "marriage"],
    ["○", "#e08a2e", "child born"],
    ["✚", "#2b2f36", "parent died"],
  ].forEach(([glyph, colour, label]) => {
    const span = document.createElement("span");
    span.innerHTML = `<b style="color:${colour}">${glyph}</b>`;
    span.appendChild(document.createTextNode(label));
    legend.appendChild(span);
  });
  if (undated.length) {
    const span = document.createElement("span");
    span.style.opacity = "0.7";
    span.textContent = `Not shown (no birth year): ${undated.map((row) => row.name).join(", ")}`;
    legend.appendChild(span);
  }

  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (
      handleChartPopupButton(popup, button, {
        svg: svg.node(),
        fileBase: `family-timeline-${(selfItem?.row.wtid || "chart").replace(/[^A-Za-z0-9_-]/g, "")}`,
      })
    )
      return;
    if (button.dataset.link) chartLinkClick(popup, button, options.links, selfItem?.row.wtid);
    else if (button.dataset.act === "history") bands.attr("display", bands.attr("display") === "none" ? null : "none");
  });

  mountChartPopup(popup, () => {
    svg.interrupt();
    svg.selectAll("*").interrupt();
  });
  return popup;
}
