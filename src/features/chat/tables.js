import { escapeHtml } from "../../core/lib/diff_utils";

const CHAT_RESULTS_TABLE_ID = "wbe-chat-results-table";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function buildResultsTableHtml(result, opts = {}) {
  const tableId = (opts && opts.tableId) || CHAT_RESULTS_TABLE_ID;
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
    <table id="${tableId}" class="display chat-results-table">
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

export function makeStandardProfileTable(title, rows, defaultOrder = [[3, "asc"]]) {
  const baseColumns = [
    {
      title: "WT ID",
      key: "wtid",
      render: (row) => makeProfileLink(row.wtid, row.wtid),
    },
    { title: "First Name", key: "firstName" },
    { title: "Middle Name", key: "middleName" },
    { title: "LNAB", key: "lnab", cellClass: "nowrap-cell" },
    { title: "Current Last", key: "lastNameCurrent", cellClass: "nowrap-cell" },
    {
      title: "Spouse",
      key: "spouse",
      render: (row) => {
        try {
          const list = row?.spouseList || [];
          if (Array.isArray(list) && list.length) {
            return list
              .map((s) => {
                const label = [s.firstName || s.display || "", s.lnab || ""].filter(Boolean).join(" ");
                return makeProfileLink(s.wtid, label || s.wtid || "");
              })
              .join(", ");
          }
          return escapeHtml(row?.spouse || "");
        } catch (e) {
          return escapeHtml(row?.spouse || "");
        }
      },
    },
    { title: "°", key: "degrees" },
    { title: "Birth", key: "birth", cellClass: "chat-date-cell" },
    { title: "Death", key: "death", cellClass: "chat-date-cell" },
    { title: "Birth Location", key: "birthLocation" },
    { title: "Death Location", key: "deathLocation" },
  ];

  const optionalColumnKeys = new Set(["middleName", "spouse"]);
  const columns = baseColumns.filter((column) => {
    if (!optionalColumnKeys.has(column.key)) {
      return true;
    }

    return rows.some((row) => {
      if (column.key === "spouse") {
        return (Array.isArray(row?.spouseList) && row.spouseList.length) || String(row?.spouse || "").trim();
      }
      return String(row?.[column.key] || "").trim();
    });
  });

  const indexMap = new Map();
  baseColumns.forEach((column, index) => {
    const newIndex = columns.findIndex((entry) => entry.key === column.key);
    if (newIndex >= 0) {
      indexMap.set(index, newIndex);
    }
  });

  const normalizedOrder = (defaultOrder || [])
    .map(([index, direction]) => {
      const mappedIndex = indexMap.get(index);
      return mappedIndex == null ? null : [mappedIndex, direction];
    })
    .filter(Boolean);

  return {
    title,
    defaultOrder: normalizedOrder.length ? normalizedOrder : [[0, "asc"]],
    columns,
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
