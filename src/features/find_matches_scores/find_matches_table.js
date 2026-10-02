/*
Created By: Ian Beacall (Beacall-6)

The scored-matches table.

Kept apart from the fetching and scoring so the markup can be rendered in a test without an
API in the way — the sort order and the shared-relative marks are the parts of this feature
a person actually reads, and they are worth checking.
*/

import $ from "jquery";
import { toCompactDate } from "./match_dates";
import { foldText } from "./match_locations";
import { displayNameOf } from "./find_matches_profiles";

const PANEL_CLASS = "wbe-fms-panel";

/** Says where this block of the page came from, for anyone wondering why WikiTree grew a table. */
const FEATURE_TITLE = "WikiTree Browser Extension: Find Matches Scores";

export function mountPanel(block) {
  const panel = $("<div></div>").addClass(`${PANEL_CLASS} wbe`);
  panel.append(
    $("<p></p>")
      .addClass("wbe-fms-status")
      .attr("title", FEATURE_TITLE)
      .append($("<span></span>").addClass("wbe-fms-spinner"))
      .append(document.createTextNode(" Scoring these matches…"))
  );
  block.container.prepend(panel);
  return panel;
}

export function renderError(panel, message) {
  panel.empty().append($("<p></p>").addClass("wbe-fms-error").text(message));
}

/** How long the transient notice stays put. Long enough to read the sentence, not long enough to nag. */
const NOTICE_VISIBLE_MS = 6000;
const NOTICE_FADE_MS = 600;

/**
 * Say why there is no table, then get out of the way.
 *
 * A profile the API will not hand over is an ordinary occurrence rather than a fault, so this
 * explains itself once and then fades the whole panel out. Leaving a permanent red box on the
 * page would read as something being broken, when in fact WikiTree's own list below is intact
 * and nothing has been lost.
 */
export function renderTransientNotice(panel, message, { onRemoved } = {}) {
  panel.empty().append($("<p></p>").addClass("wbe-fms-notice").text(message));

  setTimeout(() => {
    panel.addClass("wbe-fms-fading");
    setTimeout(() => {
      panel.remove();
      if (onRemoved) {
        onRemoved();
      }
    }, NOTICE_FADE_MS);
  }, NOTICE_VISIBLE_MS);
}

/** The wording used when a searched-for profile cannot be fetched. */
export function profileFetchNotice() {
  return `${FEATURE_TITLE} could not fetch data for this profile (the API returns no details for private and living profiles).`;
}

export function renderTable(panel, anchor, scored, unscored = []) {
  panel.empty();

  const weakCount = scored.filter((entry) => isWeak(entry.result)).length;

  const header = $("<div></div>").addClass("wbe-fms-header");
  header.append(
    $("<h3></h3>")
      // On the heading rather than the panel: a title on the panel would follow the pointer
      // across every row of the table, since the rows carry no title of their own.
      .attr("title", FEATURE_TITLE)
      .append(document.createTextNode("Scored matches for "))
      .append(profileLink(anchor))
      .append(
        $("<span></span>")
          .addClass("wbe-fms-count")
          .text(`${scored.length} result${scored.length === 1 ? "" : "s"}`)
      )
  );
  panel.append(header);

  const table = $("<table></table>").addClass("wbe-fms-table");
  table.append(`<thead><tr>
      <th class="wbe-fms-sortable wbe-fms-sorted-desc" data-sort="score">Score</th>
      <th class="wbe-fms-sortable" data-sort="name">Profile</th>
      <th class="wbe-fms-sortable" data-sort="birth">Born</th>
      <th class="wbe-fms-sortable" data-sort="death">Died</th>
      <th>Parents</th>
      <th>Spouses</th>
      <th>Children</th>
      <th>Compare</th>
    </tr></thead>
    <tbody class="wbe-fms-anchor-body"></tbody>
    <tbody class="wbe-fms-body"></tbody>`);

  // The profile being matched against sits in its own tbody, so re-sorting the results
  // cannot carry it off down the table.
  table.find("tbody.wbe-fms-anchor-body").append(buildAnchorRow(anchor));

  const body = table.find("tbody.wbe-fms-body");
  scored.forEach((entry) => {
    body.append(buildRow(anchor, entry));
    body.append(buildDetailRow(entry));
  });

  // The table is wider than a phone. Let it scroll inside its own box rather than pushing
  // WikiTree's whole page sideways.
  panel.append($("<div></div>").addClass("wbe-fms-table-scroll").append(table));

  // Everything is shown to begin with. Whether the weak results are worth looking at depends
  // on the search, so it is a per-page decision rather than a saved preference.
  if (weakCount) {
    const toggle = $("<button></button>")
      .addClass("small wbe-fms-weak-toggle")
      .attr("type", "button")
      .text(weakToggleText(false, weakCount))
      .on("click", () => {
        const nowHidden = !table.hasClass("wbe-fms-hide-weak");
        table.toggleClass("wbe-fms-hide-weak", nowHidden);
        toggle.text(weakToggleText(nowHidden, weakCount));
      });

    header.append(toggle);
  }

  if (unscored.length) {
    panel.append(
      $("<p></p>")
        .addClass("wbe-fms-unscored")
        .text(
          `${unscored.length} result${unscored.length === 1 ? "" : "s"} could not be scored ` +
            `(${unscored.join(", ")}) — private profiles and merged-away IDs return no data. ` +
            `They are still in the list below.`
        )
    );
  }

  attachSorting(table);
}

function weakToggleText(hidden, weakCount) {
  return hidden ? `Show ${weakCount} unlikely match${weakCount === 1 ? "" : "es"}` : `Hide unlikely matches`;
}

export function isWeak(result) {
  return result.rejected || result.score < 65;
}

/**
 * The profile everything else is being compared with, laid out in the same columns so the
 * candidate rows below can be read straight up against it.
 *
 * Its relatives are listed plainly: marking them as shared would light up the whole row,
 * since the row is its own point of comparison.
 */
function buildAnchorRow(anchor) {
  // Deliberately not a .wbe-fms-row: that class means "a scored result" to the sorter, the
  // weak-match filter and the tests, and the anchor is none of those.
  const row = $("<tr></tr>")
    .addClass("wbe-fms-anchor-row")
    .attr("data-wt-id", anchor.Name || "");

  row.append(
    $("<td></td>")
      .addClass("wbe-fms-score-cell")
      .append($("<span></span>").addClass("wbe-fms-anchor-label").text("This profile"))
  );
  row.append($("<td></td>").append(profileLink(anchor)));
  row.append(dateCell(anchor.BirthDate, anchor.BirthDateDecade, anchor.BirthLocation, false));
  row.append(dateCell(anchor.DeathDate, anchor.DeathDateDecade, anchor.DeathLocation, false));
  row.append($("<td></td>").addClass("wbe-fms-people-cell").append(relationList(anchor.parentRefs, [])));
  row.append($("<td></td>").addClass("wbe-fms-people-cell").append(relationList(anchor.spouses, [])));
  row.append($("<td></td>").addClass("wbe-fms-people-cell").append(relationList(anchor.children, [])));
  row.append($("<td></td>").addClass("wbe-fms-compare-cell"));

  return row;
}

function buildRow(anchor, entry) {
  const { result, profile } = entry;
  const row = $("<tr></tr>")
    .addClass("wbe-fms-row")
    .toggleClass("wbe-fms-weak", isWeak(result))
    .attr("data-wt-id", profile.Name || "");

  row.append(
    $("<td></td>")
      .addClass("wbe-fms-score-cell")
      .attr("data-sort-value", result.rejected ? -1 : result.score)
      .append(
        $("<span></span>")
          .addClass(`wbe-fms-badge wbe-fms-badge-${levelClass(result.level)}`)
          .attr("title", result.level)
          .text(result.rejected ? "–" : result.score)
      )
      .append($("<span></span>").addClass("wbe-fms-level").text(result.level))
  );

  row.append(
    $("<td></td>")
      .attr("data-sort-value", foldText(displayNameOf(profile)))
      .append(profileLink(profile))
  );
  row.append(
    dateCell(profile.BirthDate, profile.BirthDateDecade, profile.BirthLocation, placeAgrees(result.birthLocationStatus))
  );
  row.append(
    dateCell(profile.DeathDate, profile.DeathDateDecade, profile.DeathLocation, placeAgrees(result.deathLocationStatus))
  );
  row.append(
    $("<td></td>").addClass("wbe-fms-people-cell").append(relationList(profile.parentRefs, anchor.parentRefs))
  );
  row.append($("<td></td>").addClass("wbe-fms-people-cell").append(relationList(profile.spouses, anchor.spouses)));
  row.append($("<td></td>").addClass("wbe-fms-people-cell").append(relationList(profile.children, anchor.children)));

  const compareCell = $("<td></td>").addClass("wbe-fms-compare-cell");
  if (entry.compareUrl) {
    compareCell.append($("<a></a>").attr("href", entry.compareUrl).attr("target", "_blank").text("compare"));
  }
  row.append(compareCell);

  row.on("click", (event) => {
    if ($(event.target).closest("a, button").length) {
      return;
    }
    row.toggleClass("wbe-fms-open");
    row.next(".wbe-fms-detail-row").toggleClass("wbe-fms-open");
  });

  return row;
}

/** Marks the birth or death place only when that place itself agreed, not the other one. */
function placeAgrees(status) {
  return status === "strong" || status === "partial";
}

function dateCell(date, decade, location, highlightPlace) {
  const cell = $("<td></td>").addClass("wbe-fms-date-cell");
  const compact = toCompactDate(date, decade);
  cell.attr("data-sort-value", compact || "99999999");
  cell.append($("<span></span>").addClass("wbe-fms-date").text(displayDate(date, decade)));
  if (location) {
    cell.append($("<span></span>").addClass("wbe-fms-place").text(location));
  }
  if (highlightPlace) {
    cell.addClass("wbe-fms-place-match");
  }
  return cell;
}

function displayDate(date, decade) {
  const text = String(date || "").trim();
  if (text === "" || text === "0000-00-00") {
    // An unknown decade comes back as the literal string "unknown", which is not a date.
    const decadeText = String(decade || "").trim();
    return /^\d{4}s$/.test(decadeText) ? decadeText : "–";
  }
  return text.replace(/-00-00$/, "").replace(/-00$/, "");
}

/**
 * Names of relatives, marking the ones the anchor profile also has. The mark is what makes a
 * genuine duplicate obvious at a glance: same wife, same three children, different profile.
 */
function relationList(entries, anchorEntries) {
  const fragment = $(document.createDocumentFragment());
  if (!entries || !entries.length) {
    return fragment;
  }

  const anchorIds = new Set((anchorEntries || []).map((entry) => foldText(entry.wtId)).filter(Boolean));
  const anchorNames = new Set(
    (anchorEntries || []).map((entry) => foldText(entry.displayName || entry.firstName)).filter(Boolean)
  );

  entries.forEach((entry) => {
    const name = entry.displayName || entry.firstName || entry.wtId || "";
    if (!name) {
      return;
    }

    const sharedId = entry.wtId && anchorIds.has(foldText(entry.wtId));
    const sharedName = !sharedId && anchorNames.has(foldText(name));
    const item = $("<span></span>")
      .addClass("wbe-fms-relation")
      .addClass(sharedId ? "wbe-fms-shared-id" : sharedName ? "wbe-fms-shared-name" : "");

    item.append(entry.wtId ? profileAnchor(entry.wtId, name) : document.createTextNode(name));
    fragment.append(item);
  });

  return fragment;
}

/** A link to a profile. Built as an element rather than markup, so names escape themselves. */
function profileAnchor(wtId, text) {
  return $("<a></a>")
    .attr("href", `/wiki/${encodeURIComponent(wtId)}`)
    .attr("target", "_blank")
    .text(text);
}

function buildDetailRow(entry) {
  const { result } = entry;
  const row = $("<tr></tr>").addClass("wbe-fms-detail-row");
  const cell = $("<td colspan='8'></td>");

  if (result.rejectReason) {
    cell.append($("<p></p>").addClass("wbe-fms-reject").text(result.rejectReason));
  }

  cell.append(evidenceList("Matching", result.reasons, "wbe-fms-for"));
  cell.append(
    evidenceList(
      "Against",
      result.warnings.filter((warning) => warning !== result.rejectReason),
      "wbe-fms-against"
    )
  );

  return row.append(cell);
}

function evidenceList(title, items, className) {
  if (!items || !items.length) {
    return $();
  }

  const wrapper = $("<div></div>").addClass(`wbe-fms-evidence ${className}`);
  wrapper.append($("<h4></h4>").text(title));
  const list = $("<ul></ul>");
  items.forEach((item) => list.append($("<li></li>").text(item)));
  return wrapper.append(list);
}

function levelClass(level) {
  return foldText(level).replace(/ /g, "-");
}

function profileLink(profile) {
  const wtId = profile.Name || "";
  return $(document.createDocumentFragment())
    .append(profileAnchor(wtId, displayNameOf(profile) || wtId))
    .append(document.createTextNode(" "))
    .append($("<span></span>").addClass("mono small").text(wtId));
}

/* ---------------------------------------------------------------------- sorting UI ---- */

function attachSorting(table) {
  table.find("th.wbe-fms-sortable").on("click", function () {
    const header = $(this);
    const ascending = !header.hasClass("wbe-fms-sorted-asc");

    table.find("th").removeClass("wbe-fms-sorted-asc wbe-fms-sorted-desc");
    header.addClass(ascending ? "wbe-fms-sorted-asc" : "wbe-fms-sorted-desc");

    // Only the results move. The anchor row lives in its own tbody above.
    const body = table.find("tbody.wbe-fms-body");
    const pairs = body
      .find("tr.wbe-fms-row")
      .toArray()
      .map((row) => ({ row, detail: $(row).next(".wbe-fms-detail-row")[0] }));

    const columnIndex = header.index();
    pairs.sort((left, right) => {
      const leftValue = $(left.row).children().eq(columnIndex).attr("data-sort-value") ?? "";
      const rightValue = $(right.row).children().eq(columnIndex).attr("data-sort-value") ?? "";
      const bothNumeric = !Number.isNaN(Number(leftValue)) && !Number.isNaN(Number(rightValue));
      const comparison = bothNumeric
        ? Number(leftValue) - Number(rightValue)
        : String(leftValue).localeCompare(String(rightValue));
      return ascending ? comparison : -comparison;
    });

    pairs.forEach(({ row, detail }) => {
      body.append(row);
      if (detail) {
        body.append(detail);
      }
    });
  });

  // Rows are built in score order already; this just shows which column that was.
  table.find('th[data-sort="score"]').addClass("wbe-fms-sorted-desc");
}
