export function createLastResultOperationHandler({
  getLastStructuredResult,
  openResultsTable,
  cloneResultWithRows,
  normalizeText,
  normalizeDateForSort,
  normalizeNumberForSort,
  normalizeSurname,
  extractCountryFromLocation,
}) {
  function getRowCountry(row) {
    return (
      row.country ||
      extractCountryFromLocation(row.birthLocation) ||
      extractCountryFromLocation(row.deathLocation) ||
      ""
    );
  }

  function summarizeStructuredRows(rows, maxToShow = 12) {
    const shown = rows.slice(0, maxToShow).map((row) => {
      const bits = [`${row.displayName || row.wtid || "Unknown"} (${row.wtid || "no-id"})`];
      if (row.degrees !== "" && row.degrees !== undefined) {
        bits.push(`degree ${row.degrees}`);
      }
      if (row.birth) {
        bits.push(`born ${row.birth}`);
      }
      if (row.surname) {
        bits.push(`surname ${row.surname}`);
      }
      if (row.gender) {
        bits.push(row.gender);
      }
      return `- ${bits.join(" | ")}`;
    });
    const extra = rows.length > maxToShow ? `\n...and ${rows.length - maxToShow} more.` : "";
    return `${shown.join("\n")}${extra}`;
  }

  function compareResultRows(left, right, field, direction) {
    let leftValue;
    let rightValue;

    if (field === "birth" || field === "death") {
      leftValue = normalizeDateForSort(left[field]);
      rightValue = normalizeDateForSort(right[field]);
    } else if (field === "degrees") {
      leftValue = normalizeNumberForSort(left[field]);
      rightValue = normalizeNumberForSort(right[field]);
    } else if (field === "country") {
      leftValue = normalizeText(getRowCountry(left));
      rightValue = normalizeText(getRowCountry(right));
    } else {
      leftValue = normalizeText(left[field]);
      rightValue = normalizeText(right[field]);
    }

    if (leftValue < rightValue) {
      return direction === "desc" ? 1 : -1;
    }
    if (leftValue > rightValue) {
      return direction === "desc" ? -1 : 1;
    }
    return normalizeText(left.displayName).localeCompare(normalizeText(right.displayName));
  }

  return async function tryHandleLastResultOperation(params) {
    if (!params?.action) {
      return null;
    }

    const lastStructuredResult = getLastStructuredResult();
    if (!lastStructuredResult?.rows?.length) {
      return "There is no structured result yet. Ask for a search or list first, then refine it.";
    }

    const baseResult = cloneResultWithRows(
      lastStructuredResult,
      lastStructuredResult.title || "Chat Results",
      lastStructuredResult.rows
    );

    if (params.action === "table") {
      openResultsTable(baseResult);
      return {
        message: `Opened the last result set in a table (${baseResult.rows.length} row${
          baseResult.rows.length === 1 ? "" : "s"
        }).`,
      };
    }

    if (params.action === "count") {
      return {
        message: `The current result set has ${baseResult.rows.length} row${baseResult.rows.length === 1 ? "" : "s"}.`,
      };
    }

    if (params.action === "countBy") {
      const buckets = new Map();
      baseResult.rows.forEach((row) => {
        let bucketValue = "Unknown";
        if (params.field === "country") {
          bucketValue = getRowCountry(row) || "Unknown";
        } else {
          bucketValue = row[params.field] || "Unknown";
        }
        buckets.set(bucketValue, (buckets.get(bucketValue) || 0) + 1);
      });

      const groupedRows = Array.from(buckets.entries())
        .map(([value, count]) => ({
          label: value,
          count,
        }))
        .sort(
          (left, right) =>
            right.count - left.count || normalizeText(left.label).localeCompare(normalizeText(right.label))
        );

      const summary = groupedRows
        .slice(0, 12)
        .map((row) => `- ${row.label}: ${row.count}`)
        .join("\n");

      return {
        message: `Grouped the current results by ${params.field}:\n${summary}${
          groupedRows.length > 12 ? `\n...and ${groupedRows.length - 12} more.` : ""
        }`,
        table: {
          title: `${baseResult.title} by ${params.field}`,
          defaultOrder: [[1, "desc"]],
          columns: [
            { title: params.field === "country" ? "Country" : "Value", key: "label" },
            { title: "Count", key: "count" },
          ],
          rows: groupedRows,
        },
      };
    }

    if (params.action === "sort") {
      const sortedRows = [...baseResult.rows].sort((left, right) =>
        compareResultRows(left, right, params.field, params.direction)
      );
      const sortedResult = cloneResultWithRows(baseResult, `${baseResult.title} sorted by ${params.field}`, sortedRows);
      return {
        message: `Sorted the current results by ${params.field} (${params.direction}).\n${summarizeStructuredRows(
          sortedRows
        )}`,
        table: sortedResult,
      };
    }

    if (params.action === "filter") {
      const filteredRows = baseResult.rows.filter((row) => {
        const value = normalizeText(params.filter?.value);
        if (!value) {
          return true;
        }

        if (params.filter.kind === "gender") {
          return normalizeText(row.gender) === normalizeText(params.filter.value);
        }
        if (params.filter.kind === "surname") {
          return normalizeSurname(row.surname) === normalizeSurname(params.filter.value);
        }
        if (params.filter.kind === "birthLocation") {
          return normalizeText(row.birthLocation).includes(value);
        }
        if (params.filter.kind === "deathLocation") {
          return normalizeText(row.deathLocation).includes(value);
        }
        if (params.filter.kind === "country") {
          return normalizeText(getRowCountry(row)).includes(value);
        }

        const haystack = [
          row.displayName,
          row.wtid,
          row.surname,
          row.birthLocation,
          row.deathLocation,
          row.gender,
          getRowCountry(row),
        ]
          .map((part) => normalizeText(part))
          .join(" ");
        return haystack.includes(value);
      });

      if (!filteredRows.length) {
        return "No rows matched that filter in the current result set.";
      }

      const filteredResult = cloneResultWithRows(baseResult, `${baseResult.title} filtered`, filteredRows);
      return {
        message: `Filtered the current result set down to ${filteredRows.length} row${
          filteredRows.length === 1 ? "" : "s"
        }.\n${summarizeStructuredRows(filteredRows)}`,
        table: filteredResult,
      };
    }

    return null;
  };
}
