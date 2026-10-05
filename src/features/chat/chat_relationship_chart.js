// The relationship chart (2026-10-04): how two blood relatives meet. The common
// ancestors at the top; a line of descent down each side to the two people; a "DNA
// ribbon" down each line that halves in width every generation (the share of the
// couple's DNA each person carries, on average); every parent link drawn by its status
// (DNA confirmed, confident, uncertain); and under the two people a bracket with the
// relationship, the shared cM relatives this close average and the chance of a match.
// Data comes from buildRelationshipLines / analyseRelationship (chat_relationship_data.js).

import $ from "jquery";
import { select } from "d3-selection";
import "d3-transition";
import { area, curveMonotoneY } from "d3-shape";
import { easeCubicOut } from "d3-ease";
import { LINK_STATUS } from "./chat_relationship_data";
import { chartPopupControls, centrePopup, chartLinkButtons, chartLinkClick, escapeText, injectChartStyles, photoUrl, profileUrl, raiseAboveOtherPopups, saveChart, toggleChartFullScreen, truncate } from "./chat_chart_common";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const WIDTH = 960;
const CARD_W = 224;
const CARD_H = 66;
const ROW_H = 112;
const TOP = 46;
const GAP = 178; // (each line's centre from the middle)
const RIBBON = 64; // (the ribbon's width where it carries all of the couple's DNA)
const ROW_MS = 420;
const PANEL_W = 250;
const GENDER = { Male: "#4f86d0", Female: "#e0709b", "": "#9aa3ad" };
const GOLD = "#e0a412";
const DNA = "#8e5bd6";
const LINK_STYLE = {
  30: { colour: "#2e9d57", width: 3.2, dash: null },
  20: { colour: "#7d8a96", width: 2.2, dash: null },
  10: { colour: "#d89a1c", width: 2.2, dash: "6 4" },
  5: { colour: "#c0504d", width: 2.2, dash: "2 3" },
  0: { colour: "#b9c0c8", width: 2, dash: null },
};
const linkStyle = (status) => LINK_STYLE[status] || LINK_STYLE[0];

const years = (p) => (p.birthYear || p.deathYear ? `${p.birthYear || "?"}–${p.deathYear || ""}` : "");
const percent = (share) => {
  const value = share * 100;
  return value >= 10 ? `${Math.round(value)}%` : value >= 1 ? `${Math.round(value * 10) / 10}%` : `${Math.round(value * 100) / 100}%`;
};

/**
 * lines: buildRelationshipLines. options: {title, relationship (the WikiTree sentence),
 * route (analyseRelationship's first route: couple, cm, chance), otherRoutes, links, rootKey}.
 */
export function showRelationshipPopup(lines, options = {}) {
  $("#wbe-relationship-popup").remove();
  injectChartStyles();

  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup ui-draggable wbe-chart-popup";
  popup.id = "wbe-relationship-popup";
  popup.style.display = "flex";
  popup.innerHTML = `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-act="replay" title="Draw it again">Replay</button>
        ${chartLinkButtons(options.links)}
        ${chartPopupControls()}
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar"><span class="wbe-rel-note" style="opacity:.7"></span></div>
      <div class="wbe-chart-stage" style="overflow-y:auto"><div class="wbe-chart-tip"></div></div>
      <div class="wbe-chart-footer"><div class="wbe-chart-legend"></div></div>
    </div>`;
  popup.insertAdjacentHTML(
    "afterbegin",
    `<style>
      #wbe-relationship-popup .wbe-rel-card { cursor: pointer; }
      #wbe-relationship-popup .wbe-rel-card:hover rect.wbe-rel-box { stroke-width: 3px; filter: drop-shadow(0 3px 6px rgba(0,0,0,.18)); }
      #wbe-relationship-popup .wbe-rel-card:hover text.wbe-rel-name { fill: #0b5cad; text-decoration: underline; }
    </style>`
  );
  document.body.appendChild(popup);
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Relationship";
  const others = Number(options.otherRoutes) || 0;
  popup.querySelector(".wbe-rel-note").textContent =
    "The ribbon is the share of the common ancestors' DNA each person carries on average · hover a card for details · click to open the profile" +
    (others ? ` · related ${others === 1 ? "one other way" : `${others} other ways`} too (see the chat)` : "");
  const stage = popup.querySelector(".wbe-chart-stage");
  const tip = popup.querySelector(".wbe-chart-tip");
  const route = options.route || {};
  const couple = lines.ancestors.length > 1;
  const ancestorNames = lines.ancestors.map((a) => a.first || a.name).join(" & ");
  // The share of the common ancestors' DNA at generation k below them (a child of the couple: all of it).
  const share = (k) => (couple ? 0.5 ** (k - 1) : 0.5 ** k);
  let svg = null;

  function showTip(event, html) {
    const rect = stage.getBoundingClientRect();
    tip.innerHTML = html;
    tip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 300)}px`;
    tip.style.top = `${Math.min(event.clientY - rect.top + stage.scrollTop + 14, stage.scrollTop + rect.height - 140)}px`;
    tip.style.opacity = "1";
  }
  const hideTip = () => (tip.style.opacity = "0");

  function personTip(person, k) {
    const bits = [`<b>${escapeText(person.name)}</b>`];
    if (years(person)) bits.push(`<div style="opacity:.75">${escapeText(years(person))}${person.birthPlace ? ` · born ${escapeText(person.birthPlace)}` : ""}</div>`);
    if (k > 0) {
      bits.push(`<div>≈ ${percent(share(k))} of ${escapeText(ancestorNames)}'s DNA</div>`);
      bits.push(`<div style="color:${linkStyle(person.status).colour}">Link to parent: ${escapeText(LINK_STATUS[person.status] || "not marked")}</div>`);
    } else bits.push(`<div style="color:${GOLD}">Common ancestor</div>`);
    return bits.join("");
  }

  function render() {
    stage.querySelector("svg")?.remove();
    hideTip();
    const depth = Math.max(lines.line1.length, lines.line2.length);
    const rowY = (k) => TOP + k * ROW_H;
    const mid = WIDTH / 2;
    const cx = [mid - GAP, mid + GAP];
    const bottom1 = rowY(lines.line1.length) + CARD_H;
    const bottom2 = rowY(lines.line2.length) + CARD_H;
    const bracketY = Math.max(bottom1, bottom2) + 34;
    // The panel goes beside the shorter line's bracket when there's room, else under the summary.
    const shortSide = lines.line1.length < lines.line2.length ? 0 : lines.line1.length > lines.line2.length ? 1 : -1;
    const panelH = panelHeight();
    const panelTop = shortSide >= 0 ? (shortSide === 0 ? bottom1 : bottom2) + 30 : 0;
    const besideBracket = shortSide >= 0 && panelTop + panelH <= bracketY - 8;
    const height = bracketY + 150 + (besideBracket ? 0 : panelH + 24);

    svg = select(stage)
      .append("svg")
      .attr("viewBox", `0 0 ${WIDTH} ${height}`)
      .attr("width", "100%")
      .attr("font-family", FONT)
      .style("display", "block")
      .style("max-width", `${WIDTH * 1.25}px`)
      .style("margin", "0 auto");
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient").attr("id", "wbe-rel-ribbon").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 1);
    gradient.append("stop").attr("offset", "0%").attr("stop-color", GOLD).attr("stop-opacity", 0.55);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", DNA).attr("stop-opacity", 0.45);
    const clip = defs.append("clipPath").attr("id", "wbe-rel-clip").append("rect").attr("x", 0).attr("y", 0).attr("width", WIDTH).attr("height", 0).attr("data-h", height);

    // Generation bands with the decade each row was born in.
    const bands = svg.append("g");
    for (let k = 0; k <= depth; k += 1) {
      const people = k === 0 ? lines.ancestors : [lines.line1[k - 1], lines.line2[k - 1]].filter(Boolean);
      const born = people.map((p) => p.birthYear).filter(Boolean).sort((a, b) => a - b);
      const y = rowY(k) - (ROW_H - CARD_H) / 2;
      if (k % 2 === 0) bands.append("rect").attr("x", 0).attr("y", y).attr("width", WIDTH).attr("height", ROW_H).attr("fill", "rgba(47,111,179,.045)");
      if (born.length) {
        bands
          .append("text")
          .attr("x", 14)
          .attr("y", rowY(k) + CARD_H / 2 + 4)
          .attr("font-size", 13)
          .attr("font-weight", 600)
          .attr("fill", "#8a96a3")
          .text(`${Math.floor(born[Math.floor(born.length / 2)] / 10) * 10}s`);
      }
    }

    // The DNA ribbons: from under the couple down each line, halving every generation.
    const ribbons = svg.append("g").attr("clip-path", "url(#wbe-rel-clip)");
    const ribbonArea = area()
      .y((d) => d.y)
      .x0((d) => d.x - d.w / 2)
      .x1((d) => d.x + d.w / 2)
      .curve(curveMonotoneY);
    [lines.line1, lines.line2].forEach((line, side) => {
      const points = [{ x: mid, y: rowY(0) + CARD_H, w: RIBBON * (couple ? 1 : 0.5) }];
      line.forEach((person, index) => points.push({ x: cx[side], y: rowY(index + 1) + CARD_H / 2, w: Math.max(2, RIBBON * share(index + 1)) }));
      ribbons.append("path").attr("d", ribbonArea(points)).attr("fill", "url(#wbe-rel-ribbon)");
    });

    // Parent links, drawn by their status.
    const links = svg.append("g").attr("fill", "none").attr("stroke-linecap", "round");
    const linkAt = (k, path, status) => {
      const style = linkStyle(status);
      links
        .append("path")
        .attr("d", path)
        .attr("stroke", style.colour)
        .attr("stroke-width", style.width)
        .attr("stroke-dasharray", style.dash)
        .attr("data-row", k)
        .attr("opacity", 0);
    };
    const badges = svg.append("g");
    [lines.line1, lines.line2].forEach((line, side) => {
      line.forEach((person, index) => {
        const k = index + 1;
        const x = cx[side];
        const y1 = k === 1 ? rowY(0) + CARD_H : rowY(k - 1) + CARD_H;
        const y2 = rowY(k);
        const path = k === 1 ? `M${mid},${y1} C${mid},${(y1 + y2) / 2} ${x},${(y1 + y2) / 2} ${x},${y2}` : `M${x},${y1} L${x},${y2}`;
        linkAt(k, path, person.status);
        if (person.status === 30) {
          const bx = k === 1 ? (mid + x) / 2 : x;
          const by = (y1 + y2) / 2;
          const badge = badges.append("g").attr("transform", `translate(${bx},${by})`).attr("data-row", k).attr("opacity", 0);
          badge.append("rect").attr("x", -44).attr("y", -9).attr("width", 88).attr("height", 18).attr("rx", 9).attr("fill", "#e5f5ea").attr("stroke", "#2e9d57");
          badge.append("text").attr("text-anchor", "middle").attr("y", 4).attr("font-size", 10.5).attr("font-weight", 700).attr("fill", "#1f7a41").text("DNA confirmed");
        }
      });
    });

    // Cards.
    const cards = svg.append("g");
    const drawCard = (person, x, y, k, { ancestor = false, end = false } = {}) => {
      const g = cards
        .append("g")
        .attr("class", "wbe-rel-card")
        .attr("transform", `translate(${x - CARD_W / 2},${y})`)
        .attr("data-row", k)
        .attr("opacity", 0)
        .on("mousemove", (event) => showTip(event, personTip(person, k)))
        .on("mouseleave", hideTip)
        .on("click", () => person.wtid && window.open(profileUrl(person.wtid), "_blank", "noopener,noreferrer"));
      g.append("rect")
        .attr("class", "wbe-rel-box")
        .attr("width", CARD_W)
        .attr("height", CARD_H)
        .attr("rx", 10)
        .attr("fill", ancestor ? "#fff8e6" : "#ffffff")
        .attr("stroke", ancestor || end ? GOLD : GENDER[person.gender] || GENDER[""])
        .attr("stroke-width", ancestor || end ? 2.6 : 1.6);
      const avatarX = 30;
      const url = photoUrl(person, 75);
      g.append("circle").attr("cx", avatarX).attr("cy", CARD_H / 2).attr("r", 20).attr("fill", GENDER[person.gender] || GENDER[""]).attr("opacity", 0.22);
      if (url) {
        const clipId = `wbe-rel-photo-${String(person.wtid).replace(/[^A-Za-z0-9_-]/g, "")}-${k}`;
        defs.append("clipPath").attr("id", clipId).append("circle").attr("cx", avatarX).attr("cy", CARD_H / 2).attr("r", 20);
        g.append("image").attr("href", url).attr("x", avatarX - 20).attr("y", CARD_H / 2 - 20).attr("width", 40).attr("height", 40).attr("preserveAspectRatio", "xMidYMin slice").attr("clip-path", `url(#${clipId})`);
      } else {
        g.append("text")
          .attr("x", avatarX)
          .attr("y", CARD_H / 2 + 6)
          .attr("text-anchor", "middle")
          .attr("font-size", 16)
          .attr("font-weight", 700)
          .attr("fill", GENDER[person.gender] || "#6b7682")
          .text((person.first || person.name || "?").charAt(0));
      }
      g.append("text").attr("class", "wbe-rel-name").attr("x", 58).attr("y", 24).attr("font-size", 13).attr("font-weight", 700).attr("fill", "#1d2a36").text(truncate(person.name, 25));
      g.append("text").attr("x", 58).attr("y", 41).attr("font-size", 11.5).attr("fill", "#55606b").text(years(person));
      if (person.birthPlace) g.append("text").attr("x", 58).attr("y", 56).attr("font-size", 10).attr("fill", "#8a96a3").text(truncate(person.birthPlace, 30));
      return g;
    };
    const ancestorX = couple ? [mid - CARD_W / 2 - 8, mid + CARD_W / 2 + 8] : [mid];
    lines.ancestors.slice(0, 2).forEach((person, i) => drawCard(person, ancestorX[i], rowY(0), 0, { ancestor: true }));
    if (couple) cards.append("text").attr("x", mid).attr("y", rowY(0) + CARD_H / 2 + 6).attr("text-anchor", "middle").attr("font-size", 18).attr("fill", GOLD).attr("data-row", 0).attr("opacity", 0).text("♥");
    cards
      .append("text")
      .attr("x", mid)
      .attr("y", rowY(0) - 12)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .attr("letter-spacing", "0.08em")
      .attr("fill", GOLD)
      .attr("data-row", 0)
      .attr("opacity", 0)
      .text(couple ? "COMMON ANCESTORS" : "COMMON ANCESTOR");

    // Each line's share labels, on the outside of the cards.
    const shares = svg.append("g");
    [lines.line1, lines.line2].forEach((line, side) => {
      line.forEach((person, index) => {
        const k = index + 1;
        const x = side === 0 ? cx[0] - CARD_W / 2 - 12 : cx[1] + CARD_W / 2 + 12;
        const anchor = side === 0 ? "end" : "start";
        const g = shares.append("g").attr("data-row", k).attr("opacity", 0);
        g.append("text").attr("x", x).attr("y", rowY(k) + CARD_H / 2).attr("text-anchor", anchor).attr("font-size", 15).attr("font-weight", 800).attr("fill", DNA).text(`≈${percent(share(k))}`);
        g.append("text").attr("x", x).attr("y", rowY(k) + CARD_H / 2 + 14).attr("text-anchor", anchor).attr("font-size", 9.5).attr("fill", "#8a7aa8").text(truncate(`from ${ancestorNames}`, 24));
        drawCard(person, cx[side], rowY(k), k, { end: index === line.length - 1 });
      });
    });

    // The bracket joining the two people, and what it means.
    const endRow = depth + 1;
    const summary = svg.append("g").attr("data-row", endRow).attr("opacity", 0);
    summary
      .append("path")
      .attr("d", `M${cx[0]},${bottom1 + 4} L${cx[0]},${bracketY} L${cx[1]},${bracketY} L${cx[1]},${bottom2 + 4}`)
      .attr("fill", "none")
      .attr("stroke", GOLD)
      .attr("stroke-width", 2.4)
      .attr("stroke-dasharray", "1 5")
      .attr("stroke-linecap", "round");
    const boxW = 460;
    const boxY = bracketY + 12;
    summary.append("rect").attr("x", mid - boxW / 2).attr("y", boxY).attr("width", boxW).attr("height", 118).attr("rx", 12).attr("fill", "#ffffff").attr("stroke", GOLD).attr("stroke-width", 1.8);
    summary
      .append("text")
      .attr("x", mid)
      .attr("y", boxY + 26)
      .attr("text-anchor", "middle")
      .attr("font-size", 15)
      .attr("font-weight", 800)
      .attr("fill", "#1d2a36")
      .text(truncate(options.relationship || "Blood relatives", 62));
    if (route.cm) {
      summary
        .append("text")
        .attr("x", mid)
        .attr("y", boxY + 50)
        .attr("text-anchor", "middle")
        .attr("font-size", 13)
        .attr("fill", DNA)
        .attr("font-weight", 700)
        .text(route.chance >= 100 ? `Relatives this close share ≈ ${route.cm} cM of DNA on average` : `Those who match share ≈ ${route.matchedCm || route.cm} cM on average`);
    }
    const chance = Math.max(0, Math.min(100, Number(route.chance) || 0));
    const meterW = 300;
    const meterX = mid - meterW / 2;
    const meterY = boxY + 68;
    summary.append("text").attr("x", mid).attr("y", meterY - 4).attr("text-anchor", "middle").attr("font-size", 10.5).attr("fill", "#6b7682").text("Chance a DNA test would show a match");
    summary.append("rect").attr("x", meterX).attr("y", meterY + 2).attr("width", meterW).attr("height", 14).attr("rx", 7).attr("fill", "#eceef1");
    summary
      .append("rect")
      .attr("x", meterX)
      .attr("y", meterY + 2)
      .attr("height", 14)
      .attr("rx", 7)
      .attr("fill", chance >= 70 ? "#2e9d57" : chance >= 30 ? "#d89a1c" : "#c0504d")
      .attr("width", 0)
      .attr("data-w", (meterW * chance) / 100);
    summary
      .append("text")
      .attr("x", mid)
      .attr("y", meterY + 34)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("font-weight", 700)
      .attr("fill", "#1d2a36")
      .text(chance >= 100 ? "Almost certain" : chance <= 1 ? "Under 2%" : `About ${chance}%`);

    drawPanel(
      besideBracket ? (shortSide === 0 ? cx[0] - 14 - PANEL_W : cx[1] + 14) : mid - PANEL_W / 2,
      besideBracket ? panelTop : bracketY + 12 + 118 + 24,
      endRow
    );

    // Row by row from the top; the ribbon flows down with them.
    const total = (endRow + 1) * ROW_MS;
    clip.transition().duration(total).ease(easeCubicOut).attr("height", height);
    svg
      .selectAll("[data-row]")
      .transition()
      .delay(function () {
        return Number(this.getAttribute("data-row")) * ROW_MS;
      })
      .duration(ROW_MS)
      .attr("opacity", 1);
    summary
      .selectAll("[data-w]")
      .transition()
      .delay(endRow * ROW_MS + 200)
      .duration(900)
      .ease(easeCubicOut)
      .attr("width", function () {
        return this.getAttribute("data-w");
      });
    // (a hidden tab pauses the transitions, so draw the end state straight away)
    if (document.hidden) finishAnimations();

    const legend = popup.querySelector(".wbe-chart-legend");
    legend.innerHTML = [30, 20, 10, 0]
      .map((status) => {
        const style = linkStyle(status);
        const line = style.dash ? `background:repeating-linear-gradient(90deg,${style.colour} 0 5px,transparent 5px 9px)` : `background:${style.colour}`;
        return `<span class="wbe-chart-legend-item"><i style="${line};height:3px;width:18px;border-radius:2px"></i>${escapeText(LINK_STATUS[status] || "Not marked")}</span>`;
      })
      .concat(`<span class="wbe-chart-legend-item"><i style="background:linear-gradient(${GOLD},${DNA});opacity:.6"></i>Share of the common ancestors' DNA</span>`)
      .join("");
  }

  // How sure each line is (its links by status), and what came down to the two people.
  const statusOrder = [30, 20, 10, 5, 0];
  const lineName = (line) => `${line[line.length - 1]?.first || "Their"}'s line`;
  const endLines = () =>
    [lines.line1, lines.line2].map((line) => {
      const person = line[line.length - 1];
      const k = line.length;
      const pct = percent(share(k));
      const cm = k >= 2 ? ` (≈${Math.round((share(k) * 6800) / 10) * 10} cM)` : "";
      return `${person?.first || "?"}: ≈${pct} of their DNA${cm}`;
    });
  const dnaLines = () =>
    (route.ancestors || []).flatMap((a) => [
      a.yDNA ? `Y-DNA: ${String(a.name).split(" ")[0]}'s passes father to son down both lines` : "",
      a.mtDNA ? `mtDNA: ${String(a.name).split(" ")[0]}'s passes through the mothers on both lines` : "",
    ]).filter(Boolean);
  function panelHeight() {
    return 34 + 2 * 44 + 26 + 2 * 17 + dnaLines().length * 17 + 14;
  }
  function drawPanel(x, y, row) {
    const g = svg.append("g").attr("transform", `translate(${x},${y})`).attr("data-row", row).attr("opacity", 0);
    g.append("rect").attr("width", PANEL_W).attr("height", panelHeight()).attr("rx", 12).attr("fill", "#fbfaff").attr("stroke", "#d9d0ee");
    g.append("text").attr("x", 14).attr("y", 24).attr("font-size", 12.5).attr("font-weight", 800).attr("fill", "#1d2a36").text("How sure is each line?");
    let yy = 34;
    [lines.line1, lines.line2].forEach((line) => {
      const counts = statusOrder.map((status) => ({ status, n: line.filter((p) => (LINK_STATUS[p.status] ? p.status : 0) === status).length })).filter((c) => c.n);
      g.append("text").attr("x", 14).attr("y", yy + 12).attr("font-size", 11).attr("fill", "#55606b").text(`${lineName(line)}: ${line.length} ${line.length === 1 ? "link" : "links"}`);
      const barW = PANEL_W - 28;
      let bx = 14;
      counts.forEach((c) => {
        const w = (barW * c.n) / line.length;
        g.append("rect").attr("x", bx).attr("y", yy + 18).attr("width", Math.max(0, w - 2)).attr("height", 10).attr("rx", 3).attr("fill", linkStyle(c.status).colour);
        bx += w;
      });
      g.append("text")
        .attr("x", 14)
        .attr("y", yy + 40)
        .attr("font-size", 10)
        .attr("fill", "#8a96a3")
        .text(counts.map((c) => `${c.n} ${(LINK_STATUS[c.status] || "not marked").replace(/^(?!DNA)\w/, (ch) => ch.toLowerCase())}`).join(" · "));
      yy += 44;
    });
    g.append("text").attr("x", 14).attr("y", yy + 18).attr("font-size", 12.5).attr("font-weight", 800).attr("fill", "#1d2a36").text(truncate(`What came down from ${ancestorNames}`, 36));
    yy += 26;
    [...endLines(), ...dnaLines()].forEach((text) => {
      g.append("text").attr("x", 14).attr("y", yy + 12).attr("font-size", 10.5).attr("fill", DNA).text(truncate(text, 44));
      yy += 17;
    });
  }

  function finishAnimations() {
    if (!svg) return;
    svg.selectAll("*").interrupt();
    svg.select("#wbe-rel-clip rect").attr("height", function () {
      return this.getAttribute("data-h");
    });
    svg.selectAll("[data-row]").attr("opacity", 1);
    svg.selectAll("[data-w]").attr("width", function () {
      return this.getAttribute("data-w");
    });
  }

  render();
  centrePopup(popup);
  raiseAboveOtherPopups(popup);
  if ($.fn.draggable) $(popup).draggable({ handle: ".chat-popup-header" });
  popup.querySelector(".chat-popup-header").addEventListener("dblclick", (event) => {
    if (!event.target.closest("button")) toggleChartFullScreen(popup);
  });
  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.classList.contains("close-popup")) {
      popup._wbeLeaveFullScreen?.();
      popup.remove();
    } else if (button.dataset.link) chartLinkClick(popup, button, options.links, options.rootKey);
    else if (button.dataset.act === "replay") render();
    else if (button.dataset.act === "full") toggleChartFullScreen(popup);
    else if (button.dataset.act === "svg" || button.dataset.act === "png") {
      finishAnimations();
      saveChart(svg.node(), `relationship-${String(options.rootKey || "").replace(/[^A-Za-z0-9_-]/g, "")}`, button.dataset.act);
    }
  });
  return popup;
}
