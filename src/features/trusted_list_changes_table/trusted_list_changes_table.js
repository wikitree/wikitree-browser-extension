/*
Created By: Ian Beacall (Beacall-6)

Trusted List Changes Table
--------------------------
Special:TrustedListChanges (after choosing Add / Remove someone / Remove yourself) lists every profile in a plain
two-column table, one checkbox per profile. This feature shows the same profiles in a DataTable with a column per
field, filters, Created and Edited dates from the API, and groups the profiles that each descendants/ancestors click
selects.

WikiTree's own table stays in the form, hidden. Its checkboxes are still the ones the form submits, and WikiTree's
own functions (checkAll, checkDescendants, hideOldAdditions, showAll) still act on them. Our table only mirrors them:
  - ticking a box in our table ticks the original;
  - the descendants/ancestors links run WikiTree's own checkDescendants / checkAncestorsAndSiblings in the page
    (trusted_list_changes_page.js: Chrome won't run a javascript: link that extension code clicks), which also
    returns the branch's page ids so the branch can be grouped;
  - Select all / Deselect all tick every enabled original, as WikiTree's checkAll / uncheckAll do;
  - rows that "Show only recent additions" hides (it hides the original <tr>) are filtered out of our table.
DataTables removes rows that are off the current page from the DOM, so its own checkboxes could never be the form's.
*/

import $ from "jquery";
import "datatables.net-dt/css/jquery.dataTables.css";
import "datatables.net";
import "./trusted_list_changes_table.css";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { getUserWtId } from "../../core/common";
import { kinshipValue, removedTokenToNumber } from "../../core/lib/kinship";

const APP_ID = "WBE_trusted_list_changes_table";
const API_BATCH = 100;
const PAGE_LENGTH_KEY = "wbeTrustedListChangesPageLength";
const CONNECTION_DB_NAME = "ConnectionFinderWTE";
const CONNECTION_STORE_NAME = "distance2";
const RELATIONSHIP_DB_NAME = "RelationshipFinderWTE";
const RELATIONSHIP_STORE_NAME = "relationship2";

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

// Column indexes
const COL = {
  check: 0,
  name: 1,
  id: 2,
  birth: 3,
  birthPlace: 4,
  distance: 5,
  relationship: 6,
  created: 7,
  edited: 8,
  info: 9,
  group: 10,
  branch: 11,
};
const DATE_COLUMNS = new Set([COL.birth, COL.created, COL.edited]);

let rows = [];
let table = null;
let originalTable = null;
let $wrap = null;
let groupSeq = 0;
let activeGroup = null; // group number shown on its own, or null
let lastClicked = null; // row index of the last checkbox ticked by hand, for shift-click ranges
let pageActionRunning = false;
let currentFilters = {}; // column index → lower-case filter text, read from the filter row by readFilters()

/* ------------------------------------------------------------------------- */
/*  Helpers                                                                  */
/* ------------------------------------------------------------------------- */

function escapeHtml(text) {
  return String(text ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/** "26 Sep 1779", "Sep 1779", "1779", "abt 1779" → 17790926 / 17790900 / 17790000; "" → 0 */
function dateSortKey(text) {
  const t = (text || "").trim();
  const year = t.match(/\b(\d{3,4})\b/);
  if (!year) return 0;
  const month = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i);
  const day = t.match(/^(?:\D*?)\b(\d{1,2})\s+[a-z]/i);
  const m = month ? MONTHS[month[1].toLowerCase()] : 0;
  const d = day && month ? Number(day[1]) : 0;
  return Number(year[1]) * 10000 + m * 100 + d;
}

function formatIsoDateFromSortKey(sortKey) {
  if (!sortKey) return "";
  const year = Math.floor(sortKey / 10000);
  const month = Math.floor((sortKey % 10000) / 100);
  const day = sortKey % 100;
  if (!year) return "";
  if (!month) return `${year}`;
  const mm = String(month).padStart(2, "0");
  if (!day) return `${year}-${mm}`;
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function isoDateFromHumanDate(text) {
  const sort = dateSortKey(text);
  return { text: formatIsoDateFromSortKey(sort), sort };
}

/** API timestamp "20140128123456" → { text: "2014-01-28", sort: 20140128123456, title: "2014-01-28 12:34" } */
function apiTimestamp(value) {
  const m = String(value || "").match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?/);
  if (!m) return null;
  return {
    text: `${m[1]}-${m[2]}-${m[3]}`,
    title: m[4] ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5] || "00"}` : `${m[1]}-${m[2]}-${m[3]}`,
    sort: Number(String(value).slice(0, 14).padEnd(14, "0")),
  };
}

/** "Adderley-251" → "adderley-0000000251" so IDs sort by surname, then number */
function idSortKey(id) {
  const m = (id || "").match(/^(.*)-(\d+)$/);
  return m ? `${m[1].toLowerCase()}-${m[2].padStart(10, "0")}` : (id || "").toLowerCase();
}

/** "<1800", ">=1900", "1800-1850", "1850" against a date sort key (YYYYMMDD or YYYYMMDDhhmmss) */
function matchesDateFilter(filter, key) {
  const year = key ? Number(String(key).slice(0, 4)) : null;
  let m = filter.match(/^(<=?|>=?)\s*(\d{3,4})$/);
  if (m) {
    if (!year) return false;
    const y = Number(m[2]);
    return m[1] === "<" ? year < y : m[1] === "<=" ? year <= y : m[1] === ">" ? year > y : year >= y;
  }
  m = filter.match(/^(\d{3,4})\s*-\s*(\d{3,4})$/);
  if (m) return Boolean(year) && year >= Number(m[1]) && year <= Number(m[2]);
  return null; // not a date expression: fall back to text matching
}

/* ------------------------------------------------------------------------- */
/*  Reading WikiTree's table                                                 */
/* ------------------------------------------------------------------------- */

function findOriginalTable() {
  const firstCheck = document.querySelector("#editform input.networkItem[name='idlist[]']");
  return firstCheck ? firstCheck.closest("table") : null;
}

function spanText(cell, title) {
  return cell.querySelector(`span[title="${title}"]`)?.textContent.trim() || "";
}

function parseRow(tr, index) {
  const checkbox = tr.querySelector("input.networkItem");
  const cell = tr.querySelectorAll("td")[1];
  if (!checkbox || !cell) return null;

  const nameLink = cell.querySelector(":scope > a");
  const wtId = spanText(cell, "WikiTree ID").replace(/[()]/g, "");
  const birth = isoDateFromHumanDate(spanText(cell, "Birth date"));
  const descAnchor = cell.querySelector("a[href*='checkDescendants']");
  const ancAnchor = cell.querySelector("a[href*='checkAncestorsAndSiblings']");
  const relationship = cell.querySelector("a[href*='Special:Relationship']");
  const managerLink = cell.querySelector("a[href*='Special:TrustedList']");
  const privacy = cell.querySelector("span.privacy");

  // Badges other than the manager "M" (e.g. "ACTIVE: 4233" for a member's own profile)
  const badges = [...cell.querySelectorAll("span.badge")]
    .filter((b) => !managerLink?.contains(b))
    .map((b) => ({ text: b.textContent.trim(), title: b.getAttribute("data-bs-title") || "" }));

  const privacyTitle = privacy
    ? (privacy.getAttribute("data-bs-title") || privacy.title || "").replace(/^Privacy Level:\s*/, "")
    : "";

  return {
    index,
    tr,
    checkbox,
    name: nameLink?.textContent.trim() || wtId,
    href: nameLink?.getAttribute("href") || `/wiki/${wtId}`,
    wtId,
    birth: birth.text,
    birthSort: birth.sort,
    birthPlace: spanText(cell, "Birth location"),
    distance: null,
    relationship: "",
    relationshipSort: Number.MAX_SAFE_INTEGER,
    created: undefined, // undefined = loading, null = unavailable
    edited: undefined,
    managed: Boolean(managerLink),
    managerHref: managerLink?.getAttribute("href") || "",
    privacyClass: privacy ? privacy.className : "",
    privacyTitle,
    badges,
    relationshipHref: relationship?.getAttribute("href") || "",
    pageId: checkbox.value,
    userId: branchUserId(descAnchor) || branchUserId(ancAnchor),
    hasDesc: Boolean(descAnchor),
    hasAnc: Boolean(ancAnchor),
    group: "", // e.g. "Descendants of John Beacall (Beacall-50)"
    groupShort: "", // e.g. "↓ Beacall-50"
    groupSeq: 0,
  };
}

/** "javascript:checkDescendants(document.editform['idlist[]'], 33085151)" → "33085151" */
function branchUserId(anchor) {
  return (
    anchor?.getAttribute("href")?.match(/check(?:Descendants|AncestorsAndSiblings)\([^,]*,\s*(\d+)\s*\)/)?.[1] || ""
  );
}

/** The root person's branch links in the rows above the profiles ("Select all descendants or ancestors of …") */
function parseControls(tableEl) {
  const controls = { rootUserId: "", rootDesc: false, rootAnc: false, rootName: "" };
  tableEl.querySelectorAll("tr").forEach((tr) => {
    if (tr.querySelector("input.networkItem")) return;
    tr.querySelectorAll("a[href^='javascript:']").forEach((a) => {
      const href = a.getAttribute("href");
      if (href.includes("checkDescendants") && !controls.rootDesc) {
        controls.rootDesc = true;
        controls.rootUserId ||= branchUserId(a);
        const cellText = (a.closest("td")?.textContent || "").replace(/\s+/g, " ");
        controls.rootName = cellText.match(/\bof\s+(.+?)\s*$/)?.[1]?.trim() || "";
      } else if (href.includes("checkAncestorsAndSiblings") && !controls.rootAnc) {
        controls.rootAnc = true;
        controls.rootUserId ||= branchUserId(a);
      }
    });
  });
  return controls;
}

/* ------------------------------------------------------------------------- */
/*  Running WikiTree's own selection functions                               */
/* ------------------------------------------------------------------------- */

const PAGE_SCRIPT = "features/trusted_list_changes_table/trusted_list_changes_page.js";

/**
 * Run WikiTree's checkDescendants or checkAncestorsAndSiblings in the page (trusted_list_changes_page.js).
 * Resolves to { state, pageIds }: pageIds is the whole branch, whether or not it was ticked before.
 */
function runBranchInPage(op, userId) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    const finish = (state, pageIds = []) => {
      clearTimeout(timer);
      script.remove();
      resolve({ state, pageIds });
    };
    const timer = setTimeout(() => finish("timeout"), 10000);
    script.addEventListener("wbe-tlc-done", () => {
      const ids = script.getAttribute("data-ids");
      finish(script.getAttribute("data-state") || "error", ids ? ids.split(",") : []);
    });
    script.addEventListener("error", () => finish("error"));
    script.setAttribute("data-op", op);
    script.setAttribute("data-id", userId);
    script.src = chrome.runtime.getURL(PAGE_SCRIPT);
    (document.head || document.documentElement).appendChild(script);
  });
}

/** Tick (or untick) every profile that can be changed, as WikiTree's Select all / Deselect all do */
function setAll(checked) {
  rows.forEach((r) => {
    if (!r.checkbox.disabled) r.checkbox.checked = checked;
  });
  if (!checked) {
    // A fresh start: forget the groups too
    rows.forEach((r) => {
      if (r.groupSeq) {
        r.group = "";
        r.groupShort = "";
        r.groupSeq = 0;
        table.row(r.index).invalidate();
      }
    });
    activeGroup = null;
    setStatus("");
    table.draw(false);
  }
  refresh();
}

async function selectBranch(op, userId, label, shortLabel) {
  if (!userId || pageActionRunning) return;
  pageActionRunning = true;
  const before = rows.map((r) => r.checkbox.checked);
  let result;
  try {
    result = await runBranchInPage(op, userId);
  } finally {
    pageActionRunning = false;
  }
  const newly = rows.filter((r, i) => !before[i] && r.checkbox.checked);
  refresh();
  if (result.state !== "ok") {
    setStatus(
      `Couldn't run WikiTree's selection (${escapeHtml(result.state)}). Try “Show WikiTree's list” and its links.`
    );
    return;
  }
  const branchIds = new Set(result.pageIds);
  const branch = rows.filter((r) => branchIds.has(r.pageId));
  newly.forEach((r) => {
    if (!branchIds.has(r.pageId)) branch.push(r);
  });
  if (!branch.length) {
    setStatus(`No profiles found: ${escapeHtml(label)}.`);
    return;
  }
  groupSeq += 1;
  const seq = groupSeq;
  branch.forEach((r) => {
    r.group = label;
    r.groupShort = shortLabel;
    r.groupSeq = seq;
    table.row(r.index).invalidate();
  });
  activeGroup = null;
  table.draw(false);
  highlight(branch);
  const already = branch.filter((r) => r.checkbox.checked).length - newly.length;
  const cannot = branch.filter((r) => r.checkbox.disabled).length;
  let message = `${escapeHtml(label)}: ${branch.length} profile${branch.length === 1 ? "" : "s"}, ${
    newly.length
  } newly selected`;
  if (already > 0) message += `, ${already} already selected`;
  if (cannot > 0) message += `, ${cannot} can't be selected`;
  setStatus(`${message}.`, [
    { text: "Show this group", action: () => showGroup(seq, label) },
    { text: "Show all selected", action: showAllSelected },
    {
      text: "Undo",
      action: () => {
        newly.forEach((r) => {
          if (!r.checkbox.disabled) r.checkbox.checked = false;
        });
        branch.forEach((r) => {
          if (r.groupSeq === seq) {
            r.group = "";
            r.groupShort = "";
            r.groupSeq = 0;
            table.row(r.index).invalidate();
          }
        });
        if (activeGroup === seq) activeGroup = null;
        table.draw(false);
        refresh();
        setStatus(`Undone: ${escapeHtml(label)}.`);
      },
    },
  ]);
}

function highlight(list) {
  list.forEach((r) => (r.flash = true));
  syncVisible();
  setTimeout(() => {
    list.forEach((r) => (r.flash = false));
    syncVisible();
  }, 2500);
}

/* ------------------------------------------------------------------------- */
/*  Filters                                                                  */
/* ------------------------------------------------------------------------- */

function readFilters() {
  const values = {};
  $wrap.find(".wbe-tlc-filter").each(function () {
    const v = $(this).val();
    if (v) values[$(this).data("col")] = String(v).trim().toLowerCase();
  });
  currentFilters = values;
  return values;
}

function rowSearchText(row, col) {
  switch (col) {
    case COL.name:
      return row.name;
    case COL.id:
      return row.wtId;
    case COL.birth:
      return row.birth;
    case COL.birthPlace:
      return row.birthPlace;
    case COL.distance:
      return row.distance == null || Number(row.distance) <= 0 ? "" : `${row.distance}°`;
    case COL.relationship:
      return row.relationship || "";
    case COL.created:
      return row.created?.text || "";
    case COL.edited:
      return row.edited?.text || "";
    case COL.info:
      return infoText(row);
    case COL.group:
      return row.group;
    default:
      return "";
  }
}

function rowDateKey(row, col) {
  if (col === COL.birth) return row.birthSort;
  if (col === COL.created) return row.created?.sort || 0;
  if (col === COL.edited) return row.edited?.sort || 0;
  return 0;
}

function rowPassesFilters(row, values) {
  // Hidden by WikiTree's "Show only recent additions"
  if (row.tr.style.display === "none") return false;
  if (activeGroup !== null && row.groupSeq !== activeGroup) return false;
  for (const [colText, value] of Object.entries(values)) {
    const col = Number(colText);
    if (col === COL.check) {
      if (value === "selected" && !row.checkbox.checked) return false;
      if (value === "unselected" && row.checkbox.checked) return false;
      if (value === "selectable" && row.checkbox.disabled) return false;
      continue;
    }
    // "!text" excludes; "=" alone means empty
    const negate = value.startsWith("!");
    const term = negate ? value.slice(1) : value;
    if (!term) continue;
    let match;
    if (term === "=") {
      match = !rowSearchText(row, col);
    } else if (DATE_COLUMNS.has(col)) {
      match = matchesDateFilter(term, rowDateKey(row, col));
      if (match === null) match = rowSearchText(row, col).toLowerCase().includes(term);
    } else {
      match = rowSearchText(row, col).toLowerCase().includes(term);
    }
    if (match === negate) return false;
  }
  return true;
}

function installSearch(tableEl) {
  $.fn.dataTable.ext.search.push((settings, _searchData, dataIndex, rowData) => {
    if (settings.nTable !== tableEl) return true;
    return rowPassesFilters(rowData || rows[dataIndex], currentFilters);
  });
}

/* ------------------------------------------------------------------------- */
/*  Rendering                                                                */
/* ------------------------------------------------------------------------- */

function infoText(row) {
  const parts = [];
  if (row.managed) parts.push("Managed by you");
  if (row.privacyTitle) parts.push(row.privacyTitle);
  row.badges.forEach((b) => parts.push(b.text));
  return parts.join(" · ");
}

function renderInfo(row) {
  let html = "";
  if (row.managed) {
    html += `<a href="${escapeHtml(
      row.managerHref
    )}" target="_blank" title="Managed by you; go to privacy controls"><span class="badge green new">M</span></a> `;
  }
  if (row.privacyClass) {
    html += `<span class="${escapeHtml(row.privacyClass)}" title="Privacy: ${escapeHtml(row.privacyTitle)}"></span> `;
  }
  row.badges.forEach((b) => {
    html += `<span class="badge" title="${escapeHtml(b.title)}">${escapeHtml(b.text)}</span> `;
  });
  return html;
}

function renderDateCell(value) {
  if (value === undefined) return `<span class="wbe-tlc-loading" title="Loading">…</span>`;
  if (value === null) return "";
  return `<span title="${escapeHtml(value.title)}">${escapeHtml(value.text)}</span>`;
}

function columns() {
  const plain = (fn) => (data, type, row) => type === "display" ? escapeHtml(fn(row)) : fn(row);
  return [
    {
      title: "",
      orderable: false,
      className: "wbe-tlc-check-cell",
      render: (data, type, row) =>
        type === "display"
          ? `<input type="checkbox" class="wbe-tlc-check form-check-input" data-index="${row.index}">`
          : "",
    },
    {
      title: "Name",
      render: (data, type, row) =>
        type === "display" ? `<a href="${escapeHtml(row.href)}" target="_blank">${escapeHtml(row.name)}</a>` : row.name,
    },
    {
      title: "WT ID",
      render: (data, type, row) =>
        type === "sort" || type === "type" ? idSortKey(row.wtId) : type === "display" ? escapeHtml(row.wtId) : row.wtId,
    },
    {
      title: "Birth",
      className: "wbe-tlc-date",
      render: (data, type, row) =>
        type === "sort" || type === "type" ? row.birthSort : type === "display" ? escapeHtml(row.birth) : row.birth,
    },
    { title: "Birth place", className: "wbe-tlc-place", render: plain((r) => r.birthPlace) },
    {
      title: "°",
      className: "wbe-tlc-date wbe-tlc-distance",
      render: (data, type, row) => {
        const distance =
          Number.isFinite(Number(row.distance)) && Number(row.distance) > 0 ? Number(row.distance) : null;
        if (type === "sort" || type === "type") return distance == null ? 1e9 : distance;
        if (type === "display") return distance == null ? "" : `${distance}\u00B0`;
        return distance == null ? "" : `${distance}\u00B0`;
      },
    },
    {
      title: "Rel.",
      className: "wbe-tlc-relationship",
      render: (data, type, row) =>
        type === "sort" || type === "type"
          ? Number.isFinite(row.relationshipSort)
            ? row.relationshipSort
            : Number.MAX_SAFE_INTEGER
          : escapeHtml(row.relationship),
    },
    {
      title: "Created",
      className: "wbe-tlc-date",
      render: (data, type, row) =>
        type === "sort" || type === "type"
          ? row.created?.sort || 0
          : type === "display"
          ? renderDateCell(row.created)
          : row.created?.text || "",
    },
    {
      title: "Edited",
      className: "wbe-tlc-date",
      render: (data, type, row) =>
        type === "sort" || type === "type"
          ? row.edited?.sort || 0
          : type === "display"
          ? renderDateCell(row.edited)
          : row.edited?.text || "",
    },
    {
      title: "Info",
      className: "wbe-tlc-info",
      render: (data, type, row) => (type === "display" ? renderInfo(row) : infoText(row)),
    },
    {
      title: "Group",
      className: "wbe-tlc-group",
      // Newest group first when sorted ascending; profiles in no group last
      render: (data, type, row) =>
        type === "sort" || type === "type"
          ? row.groupSeq
            ? 1e9 - row.groupSeq
            : 2e9
          : type === "display"
          ? row.groupSeq
            ? `<span title="${escapeHtml(row.group)}">${escapeHtml(row.groupShort)}</span>`
            : ""
          : `${row.group} ${row.groupShort}`,
    },
    {
      title: "Select",
      orderable: false,
      className: "wbe-tlc-branch-cell",
      render: (data, type, row) => {
        if (type !== "display") return "";
        let html = "";
        if (row.userId && row.hasDesc) {
          html += `<a href="#" class="wbe-tlc-branch" data-index="${
            row.index
          }" data-dir="desc" title="Select ${escapeHtml(row.wtId)} and all their descendants">descendants</a>`;
        }
        if (row.userId && row.hasAnc) {
          html += `${html ? " · " : ""}<a href="#" class="wbe-tlc-branch" data-index="${
            row.index
          }" data-dir="anc" title="Select ${escapeHtml(row.wtId)} and all their ancestors and siblings">ancestors</a>`;
        }
        if (row.relationshipHref) {
          html += ` <a href="${escapeHtml(
            row.relationshipHref
          )}" target="_blank" title="Find Relationship"><span class="icon--relationship"></span></a>`;
        }
        return html;
      },
    },
  ];
}

/** Bring the checkboxes on the current page of our table into line with WikiTree's */
function syncVisible() {
  if (!table) return;
  table.rows({ page: "current" }).every(function () {
    const row = this.data();
    const node = this.node();
    if (!node) return;
    const cb = node.querySelector("input.wbe-tlc-check");
    if (cb) {
      cb.checked = row.checkbox.checked;
      cb.disabled = row.checkbox.disabled;
    }
    node.classList.toggle("wbe-tlc-selected", row.checkbox.checked);
    node.classList.toggle("wbe-tlc-disabled", row.checkbox.disabled);
    node.classList.toggle("wbe-tlc-flash", Boolean(row.flash));
  });
}

function updateCount() {
  if (!table) return;
  const selected = rows.filter((r) => r.checkbox.checked).length;
  const shown = table.rows({ search: "applied" }).count();
  const hiddenByWikiTree = rows.filter((r) => r.tr.style.display === "none").length;
  let text = `<strong>${selected}</strong> of ${rows.length} selected · ${shown} shown`;
  if (hiddenByWikiTree) text += ` · ${hiddenByWikiTree} hidden by “Show only recent additions”`;
  $wrap.find(".wbe-tlc-count").html(text);
}

/** After WikiTree changed the checkboxes: redraw if a filter depends on them, else just resync */
function refresh() {
  if (!table) return;
  if (currentFilters[COL.check]) table.draw(false);
  else syncVisible();
  updateCount();
}

/** view: the message describes a filtered view ("Showing only …"), so clearing the filters clears it */
function setStatus(html, buttons = [], { view = false } = {}) {
  const $status = $wrap.find(".wbe-tlc-status").empty().data("view", view);
  if (!html) return;
  $status.append($("<span>").html(html));
  buttons.forEach((b) => {
    $("<button type='button' class='btn btn-sm btn-secondary'>").text(b.text).on("click", b.action).appendTo($status);
  });
  $("<button type='button' class='wbe-tlc-status-close' title='Close'>×</button>")
    .on("click", () => setStatus(""))
    .appendTo($status);
}

function showGroup(seq, label) {
  activeGroup = seq;
  table.draw();
  updateCount();
  setStatus(`Showing only: ${escapeHtml(label)}.`, [{ text: "Show everything", action: clearGroup }], { view: true });
}

function clearGroup() {
  activeGroup = null;
  table.draw(false);
  updateCount();
  setStatus("");
}

function showAllSelected() {
  activeGroup = null;
  $wrap.find(".wbe-tlc-filter[data-col='0']").val("selected");
  readFilters();
  table.draw();
  updateCount();
  setStatus(
    "Showing selected profiles.",
    [
      {
        text: "Show everything",
        action: () => {
          $wrap.find(".wbe-tlc-filter[data-col='0']").val("");
          readFilters();
          clearGroup();
        },
      },
    ],
    { view: true }
  );
}

function setShownRows(checked) {
  table.rows({ search: "applied" }).every(function () {
    const row = this.data();
    if (!row.checkbox.disabled) row.checkbox.checked = checked;
  });
  refresh();
}

/* ------------------------------------------------------------------------- */
/*  Building the UI                                                          */
/* ------------------------------------------------------------------------- */

function buildToolbar(controls) {
  const $bar = $("<div class='wbe-tlc-toolbar'>");
  const button = (text, title, action) =>
    $("<button type='button' class='btn btn-utility btn-sm'>").text(text).attr("title", title).on("click", action);

  $bar.append(button("Select all", "Select every profile, shown or not", () => setAll(true)));
  $bar.append(button("Deselect all", "Deselect every profile, shown or not", () => setAll(false)));
  $bar.append(button("Select shown", "Select every profile that the filters show", () => setShownRows(true)));
  $bar.append(button("Deselect shown", "Deselect every profile that the filters show", () => setShownRows(false)));
  $bar.append(button("Show selected", "Show only the selected profiles", showAllSelected));
  $bar.append(
    button("Clear filters", "Clear all column filters", () => {
      $wrap.find(".wbe-tlc-filter").val("");
      readFilters();
      activeGroup = null;
      table.search("").draw();
      updateCount();
      if ($wrap.find(".wbe-tlc-status").data("view")) setStatus("");
    })
  );

  if (controls.rootUserId && (controls.rootDesc || controls.rootAnc)) {
    const who = controls.rootName || "the root person";
    const $root = $("<span class='wbe-tlc-root'>").text("Select ");
    if (controls.rootDesc) {
      $root.append(
        button("descendants", `Select all descendants of ${who}`, () =>
          selectBranch("desc", controls.rootUserId, `Descendants of ${who}`, `↓ ${who}`)
        )
      );
    }
    if (controls.rootDesc && controls.rootAnc) $root.append(" or ");
    if (controls.rootAnc) {
      $root.append(
        button("ancestors and siblings", `Select all ancestors and siblings of ${who}`, () =>
          selectBranch("anc", controls.rootUserId, `Ancestors & siblings of ${who}`, `↑ ${who}`)
        )
      );
    }
    $root.append(document.createTextNode(` of ${who}`));
    $bar.append($root);
  }

  $bar.append(
    $("<a href='#' class='wbe-tlc-toggle'>Show WikiTree's list</a>").on("click", (e) => {
      e.preventDefault();
      const showingOriginal = $(originalTable).is(":visible");
      $(originalTable).toggle(!showingOriginal);
      $wrap.find(".wbe-tlc-main").toggle(showingOriginal);
      $(e.currentTarget).text(showingOriginal ? "Show WikiTree's list" : "Show the table");
      if (showingOriginal) {
        table.draw(false);
        updateCount();
      }
    })
  );
  return $bar;
}

function buildFilterRow() {
  const $row = $("<tr class='wbe-tlc-filters'>");
  columns().forEach((col, i) => {
    const $th = $("<th>");
    if (i === COL.check) {
      $th.append(
        $(`<select class='wbe-tlc-filter' data-col='${i}' title='Filter by selection'>`).append(
          "<option value=''>All</option><option value='selected'>Selected</option><option value='unselected'>Not selected</option><option value='selectable'>Selectable</option>"
        )
      );
    } else if (i !== COL.branch) {
      const tip = DATE_COLUMNS.has(i)
        ? "Text, or a year range: <1800, >1900, 1800-1850. ! excludes, = finds empty cells."
        : "Filter. Start with ! to exclude; = finds empty cells.";
      $th.append(
        $(`<input type='text' class='wbe-tlc-filter' data-col='${i}'>`).attr("title", tip).attr("placeholder", "Filter")
      );
    }
    $row.append($th);
  });
  return $row;
}

function savedPageLength() {
  try {
    const n = Number(localStorage.getItem(PAGE_LENGTH_KEY));
    return n ? n : 100;
  } catch {
    return 100;
  }
}

function buildTable(controls) {
  $wrap = $("<div id='wbeTrustedListTable' class='wbe-tlc'>");
  $wrap.append(buildToolbar(controls));
  $wrap.append("<div class='wbe-tlc-count'></div><div class='wbe-tlc-status'></div>");
  const $main = $("<div class='wbe-tlc-main'>").appendTo($wrap);
  const $table = $("<table class='wbe-tlc-table display compact'><thead></thead></table>").appendTo($main);
  $(originalTable).before($wrap);

  const tableEl = $table.get(0);
  installSearch(tableEl);

  table = $table.DataTable({
    data: rows,
    columns: columns(),
    order: [], // keep WikiTree's order (by surname) until a header is clicked
    deferRender: true,
    autoWidth: false,
    orderCellsTop: true,
    pageLength: savedPageLength(),
    lengthMenu: [
      [25, 50, 100, 250, 500, -1],
      [25, 50, 100, 250, 500, "All"],
    ],
    dom: '<"wbe-tlc-controls"lfip><"wbe-tlc-scroll"t><"wbe-tlc-controls"ip>',
    language: { search: "Search all:", info: "_START_–_END_ of _TOTAL_", infoFiltered: "(filtered from _MAX_)" },
    createdRow: (tr, row) => {
      tr.dataset.index = row.index;
    },
    drawCallback: () => {
      syncVisible();
    },
  });

  // Filter row under the header (orderCellsTop keeps sorting on the title row)
  $table.find("thead").append(buildFilterRow());

  table.on("length.dt", (e, settings, len) => {
    try {
      localStorage.setItem(PAGE_LENGTH_KEY, String(len));
    } catch {
      /* storage blocked: keep the default next time */
    }
  });
  table.on("draw.dt", updateCount);

  // Our controls sit inside WikiTree's form: Enter in a filter must not submit it
  $wrap.on("keydown", "input", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });
  let filterTimer = null;
  $wrap.on("input change", ".wbe-tlc-filter", () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      readFilters();
      table.draw();
    }, 200);
  });

  $table.on("click", "input.wbe-tlc-check", (e) => {
    const index = Number(e.currentTarget.dataset.index);
    const checked = e.currentTarget.checked;
    const targets = [rows[index]];
    if (e.shiftKey && lastClicked !== null && lastClicked !== index) {
      // Shift-click: the same state for every shown row between the last click and this one
      const order = table.rows({ search: "applied", order: "applied" }).indexes().toArray();
      const a = order.indexOf(lastClicked);
      const b = order.indexOf(index);
      if (a !== -1 && b !== -1) {
        order.slice(Math.min(a, b), Math.max(a, b) + 1).forEach((i) => targets.push(rows[i]));
      }
    }
    targets.forEach((r) => {
      if (!r.checkbox.disabled) r.checkbox.checked = checked;
    });
    lastClicked = index;
    refresh();
  });

  $table.on("click", "a.wbe-tlc-branch", (e) => {
    e.preventDefault();
    const row = rows[Number(e.currentTarget.dataset.index)];
    if (e.currentTarget.dataset.dir === "desc") {
      selectBranch("desc", row.userId, `Descendants of ${row.name} (${row.wtId})`, `↓ ${row.wtId}`);
    } else {
      selectBranch("anc", row.userId, `Ancestors & siblings of ${row.name} (${row.wtId})`, `↑ ${row.wtId}`);
    }
  });

  return tableEl;
}

/** WikiTree's own buttons and "Show only recent additions" change the original table: follow them */
function watchOriginal() {
  let timer = null;
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      table.draw(false);
      updateCount();
    }, 60);
  };
  new MutationObserver(later).observe(originalTable, {
    attributes: true,
    attributeFilter: ["style", "disabled"],
    subtree: true,
  });

  // checkAll/uncheckAll/checkDescendants set .checked, which no observer sees. Any WikiTree javascript: link
  // that's clicked outside our table (e.g. if the original list is shown) is followed by a resync.
  document.getElementById("editform")?.addEventListener("click", (e) => {
    const a = e.target.closest?.("a[href^='javascript:']");
    if (!a || $wrap.get(0).contains(a)) return;
    [50, 300, 1000].forEach((ms) => setTimeout(refresh, ms));
  });
  // Typing in the original list (if shown) or anything else that changes a checkbox
  originalTable.addEventListener("change", refresh);
}

/* ------------------------------------------------------------------------- */
/*  Created / Edited dates from the API                                      */
/* ------------------------------------------------------------------------- */

async function loadDates() {
  const byId = new Map(rows.map((r) => [r.wtId, r]));
  const ids = [...byId.keys()].filter(Boolean);
  const batches = [];
  for (let i = 0; i < ids.length; i += API_BATCH) batches.push(ids.slice(i, i + API_BATCH));

  let done = 0;
  const showProgress = () => {
    $wrap.find(".wbe-tlc-progress").remove();
    if (done < ids.length) {
      $wrap
        .find(".wbe-tlc-count")
        .after(`<div class='wbe-tlc-progress'>Loading Created and Edited dates: ${done} of ${ids.length}…</div>`);
    }
  };
  showProgress();

  const runBatch = async (keys) => {
    let resultByKey = {};
    let people = {};
    try {
      [, resultByKey, people] = await WikiTreeAPI.getPeople(APP_ID, keys, ["Id", "Name", "Created", "Touched"]);
    } catch (error) {
      console.error("Trusted List Changes Table: getPeople failed", error);
    }
    keys.forEach((key) => {
      const row = byId.get(key);
      const person = people?.[resultByKey?.[key]?.Id] || Object.values(people || {}).find((p) => p.Name === key);
      row.created = apiTimestamp(person?.Created);
      row.edited = apiTimestamp(person?.Touched);
      table.row(row.index).invalidate();
    });
    done += keys.length;
    showProgress();
    table.draw(false);
  };

  // Two requests at a time
  let next = 0;
  const worker = async () => {
    while (next < batches.length) {
      const batch = batches[next++];
      await runBatch(batch);
    }
  };
  await Promise.all([worker(), worker()]);
}

/* ------------------------------------------------------------------------- */
/*  Distance / Relationship from feature cache                               */
/* ------------------------------------------------------------------------- */

function normalizeWtIdForLookup(wtId) {
  return String(wtId || "")
    .trim()
    .toLowerCase();
}

function openExistingDatabaseIfPresent(dbName) {
  if (!window.indexedDB) return Promise.resolve(null);
  const openDb = () =>
    new Promise((resolve) => {
      const request = indexedDB.open(dbName);
      let didNotExist = false;

      request.onupgradeneeded = (event) => {
        didNotExist = true;
        event.target.transaction?.abort();
      };
      request.onerror = (event) => {
        event.preventDefault?.();
        if (!didNotExist) {
          console.warn(`Trusted List Changes Table: could not open ${dbName}`, request.error);
        }
        resolve(null);
      };
      request.onsuccess = () => resolve(request.result);
    });

  if (typeof indexedDB.databases !== "function") return openDb();
  return indexedDB
    .databases()
    .then((databases) => {
      if (!databases.some((database) => database.name === dbName)) return null;
      return openDb();
    })
    .catch(() => openDb());
}

function readAllRecords(db, storeName) {
  return new Promise((resolve) => {
    if (!db || !db.objectStoreNames.contains(storeName)) {
      resolve([]);
      return;
    }
    const req = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
    req.onerror = () => resolve([]);
  });
}

function latestRecordsByProfile(records, userId) {
  const byAny = new Map();
  const byUser = new Map();
  const userNorm = normalizeWtIdForLookup(userId);

  records.forEach((record) => {
    const profileId = String(record?.id || "").trim();
    if (!profileId) return;
    const updatedAt = Number(record?.updatedAt || 0);
    const existingAny = byAny.get(profileId);
    if (!existingAny || updatedAt > Number(existingAny?.updatedAt || 0)) {
      byAny.set(profileId, record);
    }
    const recordUserNorm = normalizeWtIdForLookup(record?.userId);
    if (!userNorm || !recordUserNorm || recordUserNorm !== userNorm) return;
    const existingUser = byUser.get(profileId);
    if (!existingUser || updatedAt > Number(existingUser?.updatedAt || 0)) {
      byUser.set(profileId, record);
    }
  });

  const out = new Map();
  byAny.forEach((value, key) => {
    out.set(key, byUser.get(key) || value);
  });
  byUser.forEach((value, key) => {
    out.set(key, value);
  });
  return out;
}

function abbreviateRelationship(text) {
  const relationSuffix = {
    father: "F",
    mother: "M",
    parent: "P",
    son: "S",
    daughter: "D",
    aunt: "A",
    uncle: "U",
  };

  return String(text || "")
    .replace(
      /\b(half\s+)?(?:(\d+)(?:st|nd|rd|th)\s+)?cousin(?:\s+(once|twice|thrice|\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:times?\s+)?removed)?\b/gi,
      (_match, halfPrefix = "", cousinDegree = "", removedCount = "") => {
        const half = halfPrefix ? "half " : "";
        const degree = cousinDegree ? Number(cousinDegree) : null;
        const removed = removedCount ? removedTokenToNumber(removedCount) : null;
        const cousinCore = degree && degree > 1 ? `${degree}C` : "C";
        return `${half}${cousinCore}${removed ? `${removed}R` : ""}`;
      }
    )
    .replace(
      /\b(\d+)(?:st|nd|rd|th)\s+great[\s-]*grand[\s-]*(father|mother|parent|son|daughter|aunt|uncle)\b/gi,
      (_m, n, rel) => {
        return `${Number(n)}GG${relationSuffix[String(rel).toLowerCase()] || ""}`;
      }
    )
    .replace(/\bgreat[\s-]*grand[\s-]*(father|mother|parent|son|daughter|aunt|uncle)\b/gi, (_m, rel) => {
      return `GG${relationSuffix[String(rel).toLowerCase()] || ""}`;
    })
    .replace(/\bgrand[\s-]*(father|mother|parent|son|daughter|aunt|uncle)\b/gi, (_m, rel) => {
      return `G${relationSuffix[String(rel).toLowerCase()] || ""}`;
    });
}

function relationshipLabel(record) {
  const relationship = String(record?.relationship || "").trim();
  const bloodRelationship = String(record?.bloodRelationship || "").trim();

  const sortSource = relationship || bloodRelationship;
  const sort = kinshipValue(sortSource);

  if (relationship && bloodRelationship && relationship.toLowerCase() !== bloodRelationship.toLowerCase()) {
    return {
      display: `${abbreviateRelationship(relationship)} (also ${abbreviateRelationship(bloodRelationship)})`,
      sort,
    };
  }
  return {
    display: abbreviateRelationship(sortSource),
    sort,
  };
}

async function loadDistanceAndRelationship() {
  const userId = getUserWtId();
  const [distanceDb, relationshipDb] = await Promise.all([
    openExistingDatabaseIfPresent(CONNECTION_DB_NAME),
    openExistingDatabaseIfPresent(RELATIONSHIP_DB_NAME),
  ]);
  if (!distanceDb && !relationshipDb) {
    rows.forEach((row) => {
      row.distance = null;
      row.relationship = "";
      row.relationshipSort = Number.MAX_SAFE_INTEGER;
      table.row(row.index).invalidate();
    });
    table.draw(false);
    return;
  }

  const [distanceRecords, relationshipRecords] = await Promise.all([
    readAllRecords(distanceDb, CONNECTION_STORE_NAME),
    readAllRecords(relationshipDb, RELATIONSHIP_STORE_NAME),
  ]);

  distanceDb?.close?.();
  relationshipDb?.close?.();

  const latestDistance = latestRecordsByProfile(distanceRecords, userId);
  const latestRelationship = latestRecordsByProfile(relationshipRecords, userId);

  rows.forEach((row) => {
    const distanceRecord = latestDistance.get(row.wtId);
    const relationshipRecord = latestRelationship.get(row.wtId);
    const distanceValue = Number(distanceRecord?.distance ?? relationshipRecord?.distance);
    row.distance = Number.isFinite(distanceValue) && distanceValue > 0 ? distanceValue : null;
    const relationship = relationshipLabel(relationshipRecord);
    row.relationship = relationship.display;
    row.relationshipSort = relationship.sort;
    table.row(row.index).invalidate();
  });

  table.draw(false);
}

/* ------------------------------------------------------------------------- */
/*  Start                                                                    */
/* ------------------------------------------------------------------------- */

/** Build the table (once). Called by the bootstrap when "Show as table" is clicked, or on load if always shown. */
export function showTrustedListTable() {
  if (document.getElementById("wbeTrustedListTable")) return;
  originalTable = findOriginalTable();
  if (!originalTable) return;

  rows = [...originalTable.querySelectorAll("tr")]
    .filter((tr) => tr.querySelector("input.networkItem"))
    .map((tr, i) => parseRow(tr, i))
    .filter(Boolean)
    .map((row, i) => ({ ...row, index: i }));
  if (!rows.length) return;

  const controls = parseControls(originalTable);
  buildTable(controls);
  $(originalTable).hide();
  watchOriginal();
  updateCount();
  loadDates();
  loadDistanceAndRelationship();
}
