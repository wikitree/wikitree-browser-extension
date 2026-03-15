import { escapeHtml } from "../../core/lib/diff_utils";

const CHAT_RESULTS_TABLE_ID = "wbe-chat-results-table";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function buildResultsTableHtml(result) {
  const headers = result.columns
    .map((column) => {
      const headerClass = column?.cellClass ? ` class="${escapeHtml(column.cellClass)}"` : "";
      return `<th${headerClass}>${escapeHtml(column.title)}</th>`;
    })
    .join("");
  const rows = result.rows
    .map((row) => {
      const normalizedGender = normalizeText(row?.gender);
      let rowClass = "background--gender-no-gender";
      if (normalizedGender === "male") {
        rowClass = "background--gender-male";
      } else if (normalizedGender === "female") {
        rowClass = "background--gender-female";
      }

      const cells = result.columns
        .map((column) => {
          const rawValue = typeof column.render === "function" ? column.render(row) : row?.[column.key];
          const cellValue =
            rawValue == null || rawValue === ""
              ? ""
              : typeof column.render === "function"
              ? rawValue
              : escapeHtml(rawValue);
          const cellClass = column?.cellClass ? ` class="${escapeHtml(column.cellClass)}"` : "";
          return `<td${cellClass}>${cellValue}</td>`;
        })
        .join("");
      return `<tr class="${rowClass}">${cells}</tr>`;
    })
    .join("");

  return `
    <table id="${CHAT_RESULTS_TABLE_ID}" class="display chat-results-table">
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export default {
  buildResultsTableHtml,
};

export function makeProfileLink(wtId, label) {
  if (!wtId) {
    return escapeHtml(label || "");
  }
  const href = `https://www.wikitree.com/wiki/${encodeURIComponent(wtId)}`;
  const text = escapeHtml(label || wtId);
  return `<a class="chat-results-link" href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
}

export function extractCountryFromLocation(location) {
  const parts = String(location || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

export function withDerivedRowFields(row) {
  return {
    ...row,
    country:
      row.country ||
      extractCountryFromLocation(row.birthLocation) ||
      extractCountryFromLocation(row.deathLocation) ||
      "",
  };
}

export function cloneResultWithRows(result, title, rows, defaultOrder = result?.defaultOrder || []) {
  return {
    ...result,
    title,
    defaultOrder,
    rows: rows.map((row) => withDerivedRowFields(row)),
  };
}

export function makeStandardProfileTable(title, rows, defaultOrder = [[2, "asc"]]) {
  return {
    title,
    defaultOrder,
    columns: [
      {
        title: "WT ID",
        key: "wtid",
        render: (row) => makeProfileLink(row.wtid, row.wtid),
      },
      { title: "First Name", key: "firstName" },
      { title: "LNAB", key: "lnab", cellClass: "nowrap-cell" },
      { title: "Current Last", key: "lastNameCurrent", cellClass: "nowrap-cell" },
      { title: "°", key: "degrees" },
      { title: "Birth", key: "birth", cellClass: "chat-date-cell" },
      { title: "Death", key: "death", cellClass: "chat-date-cell" },
      { title: "Birth Location", key: "birthLocation" },
      { title: "Death Location", key: "deathLocation" },
    ],
    rows: rows.map((row) => withDerivedRowFields(row)),
  };
}

export function makeWatchlistTable(title, rows, defaultOrder = [[0, "asc"]]) {
  return {
    title,
    defaultOrder,
    columns: [
      {
        title: "WT ID",
        key: "wtid",
        render: (row) => makeProfileLink(row.wtid, row.wtid),
      },
      { title: "First Name", key: "firstName" },
      { title: "LNAB", key: "lnab", cellClass: "nowrap-cell" },
      { title: "Current Last", key: "lastNameCurrent", cellClass: "nowrap-cell" },
      { title: "Birth", key: "birth", cellClass: "chat-date-cell" },
      { title: "Death", key: "death", cellClass: "chat-date-cell" },
      { title: "Birth Location", key: "birthLocation" },
      { title: "Death Location", key: "deathLocation" },
    ],
    rows: rows.map((row) => withDerivedRowFields(row)),
  };
}

export function makeAncestorAgeTable(title, rows) {
  return {
    title,
    defaultOrder: [[5, "desc"]],
    columns: [
      {
        title: "WT ID",
        key: "wtid",
        render: (row) => makeProfileLink(row.wtid, row.wtid),
      },
      {
        title: "Name",
        key: "displayName",
        render: (row) => makeProfileLink(row.wtid, row.displayName),
      },
      { title: "Birth", key: "birth", cellClass: "chat-date-cell" },
      { title: "Death", key: "death", cellClass: "chat-date-cell" },
      { title: "LNAB", key: "lnab" },
      { title: "Age At Death", key: "ageAtDeath" },
    ],
    rows,
  };
}
