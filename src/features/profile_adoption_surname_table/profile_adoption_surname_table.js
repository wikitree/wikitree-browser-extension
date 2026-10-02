/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "datatables.net-dt/css/jquery.dataTables.css";
import "datatables.net";
import "./profile_adoption_surname_table.css";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { isSpecialProfileAdoptionsSurname, mainDomain } from "../../core/pageType";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { getWikiTreePage } from "../../core/API/wwwWikiTree";
import {
  PROFILE_ADOPTIONS_PAGE_SIZE,
  buildProfileAdoptionsParams,
  buildProfileAdoptionsPath,
  parseProfileAdoptionRows,
  formatDate,
  dateSortKey,
  compareBlanksLast,
  reversePlace,
  matchesTextFilter,
  matchesDateFilter,
} from "./profile_adoption_surname_table_utils";

const APP_ID = "WBE_profile_adoption_surname_table";
const TABLE_ID = "wbeProfileAdoptionTable";
const CHUNK_SIZE = 100;
const FIELDS = [
  "Id",
  "Name",
  "FirstName",
  "MiddleName",
  "LastNameAtBirth",
  "LastNameCurrent",
  "BirthDate",
  "BirthLocation",
  "DeathDate",
  "DeathLocation",
];
const REVERSE_PLACES_KEY = "profileAdoptionSurnameTableReversePlaces";
const SORT_TYPE = "wbe-blanks-last";

// Filter types: "check" (selected / not selected), "text", "date", "place".
const COLUMNS = [
  { key: "checked", title: "", filter: "check" },
  { key: "wtId", title: "WikiTree ID", filter: "text" },
  { key: "FirstName", title: "First Name", filter: "text" },
  { key: "MiddleName", title: "Middle Name", filter: "text" },
  { key: "LastNameAtBirth", title: "Last Name at Birth", filter: "text" },
  { key: "LastNameCurrent", title: "Current Last Name", filter: "text" },
  { key: "BirthDate", title: "Birth Date", filter: "date" },
  { key: "BirthLocation", title: "Birth Place", filter: "place" },
  { key: "DeathDate", title: "Death Date", filter: "date" },
  { key: "DeathLocation", title: "Death Place", filter: "place" },
];

const PLACEHOLDERS = {
  text: "e.g. john !smith",
  date: "e.g. >1800 <1900",
  place: "e.g. ohio !cleveland",
};

let reversePlaces = readReversePlaces();

shouldInitializeFeature("profileAdoptionSurnameTable").then((result) => {
  if (result && isSpecialProfileAdoptionsSurname) {
    addTableButton();
  }
});

function addTableButton() {
  const $form = $("#editform");
  if (!$form.find('input[name="idlist[]"]').length) return;

  const $button = $(
    `<button type="button" id="wbeProfileAdoptionTableButton" class="btn btn-secondary btn-sm">Show as sortable table</button>`
  ).attr(
    "title",
    `Show up to ${PROFILE_ADOPTIONS_PAGE_SIZE} profiles in a sortable, filterable table with names, dates and places`
  );
  $form.before($(`<div class="wbe-profile-adoption-button-row"></div>`).append($button));

  $button.on("click", () => {
    $button.closest(".wbe-profile-adoption-button-row").remove();
    initProfileAdoptionSurnameTable($form).catch((error) => console.error("Profile Adoption Surname Table:", error));
  });
}

async function initProfileAdoptionSurnameTable($form) {
  const $originalTable = $form.find("table").has('input[name="idlist[]"]').first();
  if (!$originalTable.length) return;

  const params = new URLSearchParams(window.location.search);
  const surname = params.get("s").trim();
  const start = Math.max(0, parseInt(params.get("start"), 10) || 0);

  const $status = $(`<div id="wbeProfileAdoptionStatus" class="wbe-profile-adoption-status"></div>`);
  $form.before($status);
  $status.text(`Loading up to ${PROFILE_ADOPTIONS_PAGE_SIZE} profiles for ${surname}…`);

  const pageRows = await getProfileAdoptionRows(surname, start, params);
  if (!pageRows.length) {
    $status.text(`No profiles found for ${surname}.`);
    return;
  }

  const rows = await addProfileData(pageRows, (done) =>
    $status.text(`Getting profile data… ${done} of ${pageRows.length}`)
  );

  $status.empty().append(buildSummary(surname, start, rows));
  buildTable($form, $originalTable, rows);
}

/**
 * The profiles on this page of Special:Adoptions, fetched with limit=1000 unless this page already is one.
 * Falls back to the rows on the current page if the fetch fails.
 */
async function getProfileAdoptionRows(surname, start, params) {
  if (parseInt(params.get("limit"), 10) === PROFILE_ADOPTIONS_PAGE_SIZE) {
    return uniqueRows(parseProfileAdoptionRows(document));
  }
  try {
    const html = await getWikiTreePage(
      "ProfileAdoptionSurnameTable",
      "index.php",
      buildProfileAdoptionsParams(surname, start)
    );
    const fetched = parseProfileAdoptionRows(new DOMParser().parseFromString(html, "text/html"));
    if (fetched.length) return uniqueRows(fetched);
  } catch (error) {
    console.error("Profile Adoption Surname Table: could not fetch the profile adoptions list", error);
  }
  return uniqueRows(parseProfileAdoptionRows(document));
}

function uniqueRows(rows) {
  const seen = new Set();
  return rows.filter((row) => !seen.has(row.value) && seen.add(row.value));
}

/**
 * Adds the API data to each row. Rows the API returns nothing for are kept (they can still be adopted)
 * and marked `missing`.
 */
async function addProfileData(rows, onProgress) {
  const byKey = {};
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    try {
      const [, resultByKey, people] = await WikiTreeAPI.getPeople(
        APP_ID,
        chunk.map((row) => row.wtId),
        FIELDS
      );
      const peopleList = Object.values(people || {});
      chunk.forEach((row) => {
        const id = resultByKey?.[row.wtId]?.Id;
        const person =
          (id && people?.[id]) || peopleList.find((p) => p.Name?.toLowerCase() === row.wtId.toLowerCase()) || null;
        if (person) byKey[row.wtId] = person;
      });
    } catch (error) {
      console.error("Profile Adoption Surname Table: getPeople failed", error);
    }
    onProgress(Math.min(i + CHUNK_SIZE, rows.length));
  }

  return rows.map((row) => {
    const person = byKey[row.wtId];
    return {
      ...row,
      checked: false,
      missing: !person,
      FirstName: person?.FirstName || "",
      MiddleName: person?.MiddleName || "",
      LastNameAtBirth: person?.LastNameAtBirth || "",
      LastNameCurrent: person?.LastNameCurrent || "",
      BirthDate: person?.BirthDate || "",
      BirthLocation: person?.BirthLocation || "",
      DeathDate: person?.DeathDate || "",
      DeathLocation: person?.DeathLocation || "",
    };
  });
}

function profileLink(wtId, text) {
  return $("<a>", { href: `https://${mainDomain}/wiki/${encodeURIComponent(wtId)}`, target: "_blank", text });
}

function buildSummary(surname, start, rows) {
  const $summary = $("<div>");
  const first = start + 1;
  const last = start + rows.length;
  $summary.append(
    $("<span>").text(`${rows.length} profile${rows.length === 1 ? "" : "s"} for ${surname} (${first}–${last}). `)
  );
  if (start > 0) {
    const previous = Math.max(0, start - PROFILE_ADOPTIONS_PAGE_SIZE);
    $summary.append(
      $("<a>", {
        href: buildProfileAdoptionsPath(surname, previous),
        class: "wbe-profile-adoption-page-link",
        text: `← Previous ${PROFILE_ADOPTIONS_PAGE_SIZE}`,
      })
    );
  }
  if (rows.length >= PROFILE_ADOPTIONS_PAGE_SIZE) {
    $summary.append(
      $("<a>", {
        href: buildProfileAdoptionsPath(surname, start + PROFILE_ADOPTIONS_PAGE_SIZE),
        class: "wbe-profile-adoption-page-link",
        text: `Next ${PROFILE_ADOPTIONS_PAGE_SIZE} →`,
      })
    );
  }

  const missing = rows.filter((row) => row.missing);
  if (missing.length) {
    const $missing = $(`<div class="wbe-profile-adoption-missing-note"></div>`).text(
      `No API data was returned for ${missing.length} profile${missing.length === 1 ? "" : "s"}: `
    );
    missing.forEach((row, index) => {
      if (index) $missing.append(", ");
      $missing.append(profileLink(row.wtId, row.wtId));
    });
    $summary.append($missing);
  }
  return $summary;
}

function placeText(place) {
  return reversePlaces ? reversePlace(place) : place || "";
}

function escapeHtml(text) {
  return $("<div>")
    .text(text ?? "")
    .html();
}

function renderCell(column) {
  return (data, type, row) => {
    switch (column.key) {
      case "checked":
        if (type !== "display") return row.checked ? 1 : 0;
        return `<input type="checkbox" class="form-check-input wbe-profile-adoption-check" value="${escapeHtml(
          row.value
        )}"${row.checked ? " checked" : ""}>`;
      case "wtId":
        if (type !== "display") return row.wtId;
        return profileLink(row.wtId, row.wtId).prop("outerHTML");
      case "FirstName":
        if (row.missing) {
          // Without API data, show the name from the Special:Adoptions page so the row still says who it is.
          if (type !== "display") return row.displayName;
          return `<span class="wbe-profile-adoption-missing" title="${escapeHtml(row.summary)}">${escapeHtml(
            row.displayName
          )}</span>`;
        }
        return type === "display" ? escapeHtml(row.FirstName) : row.FirstName;
      case "BirthDate":
      case "DeathDate":
        if (type === "sort" || type === "type") return dateSortKey(row[column.key]) || "";
        return formatDate(row[column.key]);
      case "BirthLocation":
      case "DeathLocation":
        return type === "display" ? escapeHtml(placeText(row[column.key])) : placeText(row[column.key]);
      default:
        return type === "display" ? escapeHtml(row[column.key]) : row[column.key];
    }
  };
}

function buildFilterCell(column, index) {
  const $th = $("<th>");
  if (column.filter === "check") {
    $th.append(
      $(`<select class="wbe-profile-adoption-filter" title="Show selected or unselected profiles">
        <option value="">All</option>
        <option value="checked">Selected</option>
        <option value="unchecked">Not selected</option>
      </select>`).attr("data-column", index)
    );
  } else {
    $th.append(
      $("<input>", {
        type: "search",
        class: "wbe-profile-adoption-filter",
        placeholder: PLACEHOLDERS[column.filter],
        "data-column": index,
        "aria-label": `Filter ${column.title}`,
      })
    );
  }
  return $th;
}

function buildTable($form, $originalTable, rows) {
  const $headRow = $("<tr>");
  const $filterRow = $(`<tr class="wbe-profile-adoption-filters">`);
  COLUMNS.forEach((column, index) => {
    const $th = $("<th>").text(column.title);
    if (column.filter === "check") {
      $th.append(
        $(`<input type="checkbox" id="wbeProfileAdoptionSelectAll" title="Select all profiles shown by the filters">`)
      );
    }
    $headRow.append($th);
    $filterRow.append(buildFilterCell(column, index));
  });

  const $toolbar = $(`<div class="wbe-profile-adoption-toolbar"></div>`).append(
    $(`<button type="button" class="btn btn-secondary btn-sm" id="wbeProfileAdoptionReversePlaces"></button>`),
    $(
      `<button type="button" class="btn btn-secondary btn-sm" id="wbeProfileAdoptionClearFilters">Clear filters</button>`
    ),
    $(
      `<button type="button" class="btn btn-secondary btn-sm" id="wbeProfileAdoptionFilterHelpButton">Filter help</button>`
    ),
    $(`<span id="wbeProfileAdoptionSelectedCount" class="wbe-profile-adoption-selected-count"></span>`),
    $(`<div id="wbeProfileAdoptionFilterHelp" class="wbe-profile-adoption-filter-help">
      <p><b>Names and places:</b> <code>john</code> contains "john"; <code>!john</code> doesn't contain "john";
      <code>"new york"</code> contains the phrase; <code>=john</code> is exactly "john";
      <code>=</code> is empty; <code>!</code> is not empty. Separate several terms with spaces; all must match.</p>
      <p><b>Dates:</b> <code>1850</code> in 1850 (also <code>1850-03</code>, <code>Mar 1850</code>, <code>5 Mar 1850</code>);
      <code>&gt;1850</code>, <code>&lt;1900</code>, <code>&gt;=</code>, <code>&lt;=</code> after / before;
      <code>&gt;1800 &lt;1900</code> or <code>1800-1900</code> for a range; <code>!1850</code> not in 1850;
      <code>=</code> no date; <code>!</code> has a date.</p>
      <p>Places can be shown town first or country first; either order matches the place filters.</p>
    </div>`)
  );

  const $table = $(`<table id="${TABLE_ID}" class="display compact"></table>`).append(
    $("<thead>").append($headRow, $filterRow),
    $("<tbody>")
  );
  const $wrapper = $(`<div class="wbe-profile-adoption-table-wrapper"></div>`).append($toolbar, $table);

  // The original checkboxes go with the original table; ours are submitted as hidden inputs (see below).
  $originalTable.replaceWith($wrapper);

  // Empty cells sort to the bottom in both directions.
  $.fn.dataTable.ext.type.order[`${SORT_TYPE}-asc`] = (a, b) => compareBlanksLast(a, b, "asc");
  $.fn.dataTable.ext.type.order[`${SORT_TYPE}-desc`] = (a, b) => compareBlanksLast(a, b, "desc");

  const table = $table.DataTable({
    data: rows,
    columns: COLUMNS.map((column) => ({
      data: null,
      render: renderCell(column),
      orderable: column.filter !== "check",
      type: SORT_TYPE,
      className: `wbe-profile-adoption-${column.key}`,
    })),
    order: [], // the order of the Special:Adoptions page until a column is clicked
    orderCellsTop: true,
    autoWidth: false,
    pageLength: 100,
    lengthMenu: [
      [25, 50, 100, 250, 500, -1],
      [25, 50, 100, 250, 500, "All"],
    ],
    dom: "lipt",
    language: { info: "Showing _START_ to _END_ of _TOTAL_ profiles", infoFiltered: "(filtered from _MAX_)" },
    createdRow: (tr, row) => {
      if (row.missing) tr.classList.add("wbe-profile-adoption-row-missing");
    },
  });

  addColumnFilters(table);
  addSelection($form, table, rows);
  addPlaceToggle(table);

  $("#wbeProfileAdoptionClearFilters").on("click", () => {
    $table.find(".wbe-profile-adoption-filter").val("");
    table.draw();
  });
  $("#wbeProfileAdoptionFilterHelpButton").on("click", () => $("#wbeProfileAdoptionFilterHelp").slideToggle(150));
}

function addColumnFilters(table) {
  const $filters = $(table.table().header()).find(".wbe-profile-adoption-filter");

  $.fn.dataTable.ext.search.push((settings, searchData, dataIndex, row) => {
    if (settings.nTable.id !== TABLE_ID) return true;
    return $filters.toArray().every((input) => {
      const filter = input.value.trim();
      if (!filter) return true;
      const column = COLUMNS[input.dataset.column];
      switch (column.filter) {
        case "check":
          return filter === "checked" ? row.checked : !row.checked;
        case "date":
          return matchesDateFilter(row[column.key], filter);
        case "place":
          return matchesTextFilter([row[column.key], reversePlace(row[column.key])], filter);
        default:
          return matchesTextFilter(
            column.key === "FirstName" && row.missing ? row.displayName : row[column.key],
            filter
          );
      }
    });
  });

  let timer;
  $filters.on("input change", () => {
    clearTimeout(timer);
    timer = setTimeout(() => table.draw(), 200);
  });
  // Keep clicks and keys in the filter row from reaching the column sorting.
  $filters.on("click keydown", (event) => event.stopPropagation());
}

function addSelection($form, table, rows) {
  const $tbody = $(table.table().body());
  const $selectAll = $("#wbeProfileAdoptionSelectAll");

  // DataTables only keeps the current page in the document, so the table's checkboxes have no name and
  // aren't submitted. Every selected profile is in the form as a hidden idlist[] input instead.
  const $hiddenIds = $(`<div class="wbe-profile-adoption-hidden-ids"></div>`).appendTo($form);

  const updateCount = () => {
    const selected = rows.filter((row) => row.checked);
    const count = selected.length;
    $hiddenIds
      .empty()
      .append(selected.map((row) => $("<input>", { type: "hidden", name: "idlist[]", value: row.value })));
    $("#wbeProfileAdoptionSelectedCount").text(count ? `${count} selected` : "");
    const shown = table.rows({ search: "applied" }).data().toArray();
    $selectAll.prop("checked", shown.length > 0 && shown.every((row) => row.checked));
  };

  $tbody.on("change", ".wbe-profile-adoption-check", function () {
    table.row($(this).closest("tr")).data().checked = this.checked;
    updateCount();
  });

  $selectAll.on("click", (event) => event.stopPropagation());
  $selectAll.on("change", function () {
    const checked = this.checked;
    const shown = table.rows({ search: "applied" });
    shown.data().each((row) => (row.checked = checked));
    $(shown.nodes()).find(".wbe-profile-adoption-check").prop("checked", checked);
    updateCount();
  });

  table.on("draw", updateCount);
  updateCount();
}

function addPlaceToggle(table) {
  const $button = $("#wbeProfileAdoptionReversePlaces");
  const label = () =>
    $button.text(
      reversePlaces ? "Places: Country → Town (click to reverse)" : "Places: Town → Country (click to reverse)"
    );
  label();
  $button.on("click", () => {
    reversePlaces = !reversePlaces;
    saveReversePlaces(reversePlaces);
    label();
    table.rows().invalidate("data").draw(false);
  });
}

function readReversePlaces() {
  try {
    return localStorage.getItem(REVERSE_PLACES_KEY) === "1";
  } catch (error) {
    return false;
  }
}

function saveReversePlaces(value) {
  try {
    localStorage.setItem(REVERSE_PLACES_KEY, value ? "1" : "0");
  } catch (error) {
    // Only a convenience; the toggle still works for this visit.
  }
}
