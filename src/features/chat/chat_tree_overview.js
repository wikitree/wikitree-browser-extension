// The tree overview popup: a dashboard of panels, each a small picture of one side
// of the ancestors, with a button to its full chart. Plain HTML (bars grow in with
// CSS), styled in chat.css (.wbe-overview-*). Data from chat_tree_overview_data.js.

import $ from "jquery";
import { centrePopup, escapeText, injectChartStyles, profileUrl, raiseAboveOtherPopups, toggleChartFullScreen } from "./chat_chart_common";
import { generationLabel } from "./chat_lifespans_data";

const PCT_COLOUR = (percent) => (percent >= 100 ? "#3f9b6b" : percent >= 50 ? "#e0a100" : "#d9573f");
const COUNTRY_COLOURS = ["#2f6fb3", "#d0577b", "#2a9d8f", "#e0a100", "#7b4fd6", "#bc6c25", "#6a994e", "#8a94a3"];

function link(person, text) {
  if (!person?.wtid) return escapeText(text);
  return `<a href="${escapeText(profileUrl(person.wtid))}" target="_blank" rel="noopener noreferrer">${escapeText(text)}</a>`;
}

function panel(key, title, body, button) {
  return `<section class="wbe-overview-panel" data-panel="${key}">
    <h4>${escapeText(title)}</h4>
    <div class="wbe-overview-body">${body}</div>
    ${button ? `<button type="button" class="small wbe-overview-open" data-open="${button.chart}" title="${escapeText(button.title || "")}">${escapeText(button.label)} →</button>` : ""}
  </section>`;
}

function columns(items, max, { colour, label, value, title }) {
  return `<div class="wbe-overview-cols">${items
    .map(
      (item) => `<div class="wbe-overview-col" title="${escapeText(title(item))}">
        <span class="wbe-overview-col-value">${escapeText(value(item))}</span>
        <b data-h="${max ? Math.max(2, Math.round((100 * item.count) / max)) : 0}" style="background:${colour(item)}"></b>
        <span class="wbe-overview-col-label">${escapeText(label(item))}</span>
      </div>`
    )
    .join("")}</div>`;
}

/**
 * overview: from buildTreeOverview. options: {title, ownerText, open: {fan, brickwalls,
 * map, names, lifespans, calendar, repeats, explorer}} (each a function).
 */
export function showTreeOverviewPopup(overview, options = {}) {
  $("#wbe-tree-overview-popup").remove();
  injectChartStyles();
  const { stats, percent, countries, surnames, lifespans, months, datedBirths, interval, repeats, people, earliest, root } = overview;
  const panels = [];

  // Completeness.
  panels.push(
    panel(
      "complete",
      "How complete",
      `<div class="wbe-overview-big">${percent}%<small>${stats.found} of ${stats.possible} ancestors · ${stats.rows.length} generations</small></div>
      ${columns(
        stats.rows.map((row) => ({ ...row, percent: Math.round((100 * row.found) / row.possible), count: Math.round((100 * row.found) / row.possible) })),
        100,
        {
          colour: (row) => PCT_COLOUR(row.percent),
          label: (row) => String(row.generation),
          value: (row) => `${row.percent}%`,
          title: (row) => `${generationLabel(row.generation)}: ${row.found} of ${row.possible}`,
        }
      )}`,
      { chart: "brickwalls", label: "Brick walls", title: "The fan chart coloured by missing parents" }
    )
  );

  // Origins.
  if (countries.length) {
    const total = countries.reduce((sum, [, count]) => sum + count, 0);
    panels.push(
      panel(
        "origins",
        "Where they were born",
        `<div class="wbe-overview-bars">${countries
          .slice(0, 6)
          .map(
            ([country, count], index) => `<div class="wbe-overview-bar" title="${escapeText(`${country}: ${count}`)}">
              <span>${escapeText(country)}</span><b data-w="${Math.round((100 * count) / countries[0][1])}" style="background:${COUNTRY_COLOURS[index]}"></b><em>${Math.round((100 * count) / total)}%</em>
            </div>`
          )
          .join("")}</div>`,
        { chart: "map", label: "Migration map", title: "Their moves on a world map" }
      )
    );
  }

  // Surnames.
  if (surnames.length) {
    const top = surnames.slice(0, 14);
    const max = top[0][1];
    panels.push(
      panel(
        "surnames",
        `Surnames (${surnames.length})`,
        `<div class="wbe-overview-words">${top
          .map(([surname, count]) => `<span style="font-size:${(11 + (11 * count) / max).toFixed(1)}px" title="${count}">${escapeText(surname)}</span>`)
          .join(" ")}</div>`,
        { chart: "names", label: "Name cloud", title: "First names and surnames as a cloud" }
      )
    );
  }

  // Lifespans.
  if (lifespans.average) {
    panels.push(
      panel(
        "lifespans",
        "How long they lived",
        `<div class="wbe-overview-big">${lifespans.average}<small>years on average · ${lifespans.counted} with both dates</small></div>
        ${
          lifespans.byCentury.length > 1
            ? columns(
                lifespans.byCentury.map((c) => ({ ...c, count: c.average })),
                90,
                { colour: () => "#2a9d8f", label: (c) => `${String(c.century).slice(0, 2)}00s`, value: (c) => String(c.average), title: (c) => `Born in the ${c.century}s: ${c.average} (${c.count})` }
              )
            : ""
        }
        ${lifespans.longest ? `<div class="wbe-overview-note">Longest-lived: ${link(lifespans.longest, lifespans.longest.name)}, ${lifespans.longest.age}</div>` : ""}`,
        { chart: "lifespans", label: "Lifespans", title: "Every ancestor's life as a bar" }
      )
    );
  }

  // Birth months.
  if (datedBirths >= 6) {
    const max = Math.max(...months.map((m) => m.count));
    panels.push(
      panel(
        "months",
        "Birthdays round the year",
        columns(months, max, { colour: (m) => (m.count === max ? "#d0577b" : "#9fb7d6"), label: (m) => m.name[0], value: (m) => (m.count ? String(m.count) : ""), title: (m) => `${m.name}: ${m.count}` }),
        { chart: "calendar", label: "Family calendar", title: "Births and deaths round the year, with today marked" }
      )
    );
  }

  // Generations.
  if (interval.overall) {
    panels.push(
      panel(
        "generations",
        "A generation",
        `<div class="wbe-overview-big">${interval.overall}<small>years, parent to child</small></div>
        <div class="wbe-overview-pair"><span><b style="color:#2f6fb3">${interval.father ?? "–"}</b> fathers</span><span><b style="color:#d0577b">${interval.mother ?? "–"}</b> mothers</span></div>
        ${interval.youngest ? `<div class="wbe-overview-note">Youngest parent: ${link(interval.youngest, interval.youngest.name)}, ${interval.youngest.age}</div>` : ""}
        ${interval.oldest ? `<div class="wbe-overview-note">Oldest parent: ${link(interval.oldest, interval.oldest.name)}, ${interval.oldest.age}</div>` : ""}`,
        { chart: "fan", label: "Fan chart", title: "All the ancestors as a fan chart" }
      )
    );
  }

  // Earliest + pedigree collapse.
  panels.push(
    panel(
      "earliest",
      "Furthest back",
      `${
        earliest
          ? `<div class="wbe-overview-big">${earliest.year}<small>${link(earliest, earliest.name)}, ${escapeText(earliest.relation.toLowerCase())}${earliest.place ? `<br>${escapeText(earliest.place)}` : ""}</small></div>`
          : `<div class="wbe-overview-note">No birth years recorded.</div>`
      }
      <div class="wbe-overview-note">${people} different people${repeats ? ` · <b>${repeats}</b> ancestor${repeats === 1 ? " appears" : "s appear"} more than once` : ""}</div>`,
      repeats ? { chart: "repeats", label: "Repeated ancestors", title: "The fan chart's Repeats colouring: where lines meet" } : { chart: "explorer", label: "Family Explorer", title: "Zoom in for children, out for parents" }
    )
  );

  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup ui-draggable wbe-chart-popup";
  popup.id = "wbe-tree-overview-popup";
  popup.style.display = "flex";
  popup.innerHTML = `
    <div class="chat-popup-header ui-draggable-handle">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-open="fan" title="All the ancestors as a fan chart">Fan</button>
        <button type="button" class="small" data-open="explorer" title="Family Explorer">Explorer</button>
        <button type="button" class="small" data-act="full" title="Full screen (or double-click the title bar; Esc to leave)">Full screen</button>
        <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
      </div>
    </div>
    <div class="chat-popup-body" style="overflow:auto;padding:10px 12px;display:block">
      <div class="wbe-overview-root">${root ? link(root, root.name || root.wtid) : ""}</div>
      <div class="wbe-overview-grid">${panels.join("")}</div>
    </div>`;
  document.body.appendChild(popup);
  centrePopup(popup);
  popup.querySelector(".wbe-chart-title").textContent = options.title || "Tree overview";

  // Grow the bars in, one panel after another.
  const grow = () =>
    popup.querySelectorAll(".wbe-overview-panel").forEach((section, index) => {
      section.style.setProperty("--d", `${index * 90}ms`);
      section.querySelectorAll("b[data-h]").forEach((bar) => {
        bar.style.height = `${bar.dataset.h}%`;
      });
      section.querySelectorAll("b[data-w]").forEach((bar) => {
        bar.style.width = `${bar.dataset.w}%`;
      });
    });
  requestAnimationFrame(() => requestAnimationFrame(grow));

  popup.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.classList.contains("close-popup")) {
      popup._wbeLeaveFullScreen?.();
      popup.remove();
    } else if (button.dataset.open) {
      popup._wbeLeaveFullScreen?.();
      options.open?.[button.dataset.open]?.();
    } else if (button.dataset.act === "full") toggleChartFullScreen(popup);
  });

  raiseAboveOtherPopups(popup);
  $(popup).draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
  return popup;
}
