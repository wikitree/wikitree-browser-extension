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
  function extractYear(value) {
    const match = String(value || "")
      .trim()
      .match(/^(\d{4})/);
    const year = Number(match?.[1]);
    return Number.isFinite(year) && year > 0 ? year : null;
  }

  function describeFilter(filter) {
    const kind = String(filter?.kind || "text");
    const rawValue = String(filter?.value || "").trim();
    const value = rawValue || "(empty)";

    if (kind === "gender") {
      return `gender is ${value}`;
    }
    if (kind === "surname") {
      return `surname is ${value}`;
    }
    if (kind === "birthLocation") {
      return `birth location contains ${value}`;
    }
    if (kind === "deathLocation") {
      return `death location contains ${value}`;
    }
    if (kind === "country") {
      return `country contains ${value}`;
    }
    if (kind === "name") {
      return `name matches ${value}`;
    }
    if (kind === "birthDate") {
      const direction = String(filter?.direction || "before").toLowerCase() === "after" ? "after" : "before";
      return `birth date is ${direction} ${value}`;
    }
    if (kind === "deathDate") {
      const direction = String(filter?.direction || "before").toLowerCase() === "after" ? "after" : "before";
      return `death date is ${direction} ${value}`;
    }
    return `text contains ${value}`;
  }

  function describeFilterForTitle(filter) {
    const kind = String(filter?.kind || "text");
    const value = String(filter?.value || "").trim() || "(empty)";

    if (kind === "gender") {
      return `gender=${value}`;
    }
    if (kind === "surname") {
      return `surname=${value}`;
    }
    if (kind === "birthLocation") {
      return `birth location=${value}`;
    }
    if (kind === "deathLocation") {
      return `death location=${value}`;
    }
    if (kind === "country") {
      return `country=${value}`;
    }
    if (kind === "name") {
      return `name=${value}`;
    }
    if (kind === "birthDate") {
      const direction = String(filter?.direction || "before").toLowerCase() === "after" ? "after" : "before";
      return `birth ${direction} ${value}`;
    }
    if (kind === "deathDate") {
      const direction = String(filter?.direction || "before").toLowerCase() === "after" ? "after" : "before";
      return `death ${direction} ${value}`;
    }
    return `contains=${value}`;
  }

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

  function resolveEffectiveFilter(filter, lastStructuredResult) {
    const nextFilter = {
      ...(filter || {}),
      kind: String(filter?.kind || "text"),
      value: String(filter?.value || "").trim(),
      operator: String(filter?.operator || "and").toLowerCase(),
    };

    if (
      nextFilter.operator === "or" &&
      nextFilter.kind === "text" &&
      String(lastStructuredResult?.filterContext?.kind || "")
    ) {
      nextFilter.kind = String(lastStructuredResult.filterContext.kind);
    }

    return nextFilter;
  }

  function rowMatchesFilter(row, filter) {
    const value = normalizeText(filter?.value);
    if (!value) {
      return true;
    }

    if (filter.kind === "gender") {
      return normalizeText(row.gender) === normalizeText(filter.value);
    }
    if (filter.kind === "surname") {
      return normalizeSurname(row.surname) === normalizeSurname(filter.value);
    }
    if (filter.kind === "birthLocation") {
      return normalizeText(row.birthLocation).includes(value);
    }
    if (filter.kind === "deathLocation") {
      return normalizeText(row.deathLocation).includes(value);
    }
    if (filter.kind === "country") {
      return normalizeText(getRowCountry(row)).includes(value);
    }
    if (filter.kind === "birthDate" || filter.kind === "deathDate") {
      const filterYear = extractYear(filter.value);
      if (!filterYear) {
        return true;
      }

      const rowDate = filter.kind === "birthDate" ? row.birth : row.death;
      const rowYear = extractYear(rowDate);
      if (!rowYear) {
        return false;
      }

      const direction = String(filter.direction || "before").toLowerCase();
      return direction === "after" ? rowYear > filterYear : rowYear < filterYear;
    }
    if (filter.kind === "name") {
      const nameFields = [row.firstName, row.middleName, row.lnab, row.lastNameCurrent, row.lastNameOther, row.surname]
        .map((part) => normalizeText(part))
        .filter(Boolean);

      if (!nameFields.length) {
        return false;
      }

      if (!value.includes(" ")) {
        return nameFields.some((fieldValue) => fieldValue.split(" ").includes(value));
      }

      return nameFields.some((fieldValue) => fieldValue === value || fieldValue.includes(value));
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

    // For countBy/filter/sort, operate on person rows — not on a previously-grouped summary.
    // If the current result was produced by countBy, it has a sourceResult with the real rows.
    const dataSource = lastStructuredResult.sourceResult || lastStructuredResult;
    const dataResult =
      dataSource === lastStructuredResult
        ? baseResult
        : cloneResultWithRows(dataSource, dataSource.title || "Chat Results", dataSource.rows);

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
      dataResult.rows.forEach((row) => {
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
          title: `${dataResult.title} by ${params.field}`,
          defaultOrder: [[1, "desc"]],
          sourceResult: dataSource,
          columns: [
            { title: params.field === "country" ? "Country" : "Value", key: "label" },
            { title: "Count", key: "count" },
          ],
          rows: groupedRows,
        },
      };
    }

    if (params.action === "sort") {
      const sortedRows = [...dataResult.rows].sort((left, right) =>
        compareResultRows(left, right, params.field, params.direction)
      );
      const sortedResult = cloneResultWithRows(dataResult, `${dataResult.title} sorted by ${params.field}`, sortedRows);
      return {
        message: `Sorted the current results by ${params.field} (${params.direction}).\n${summarizeStructuredRows(
          sortedRows
        )}`,
        table: sortedResult,
      };
    }

    if (params.action === "filter") {
      const effectiveFilter = resolveEffectiveFilter(params.filter, lastStructuredResult);
      const filterSummary = describeFilter(effectiveFilter);
      const filterTitle = describeFilterForTitle(effectiveFilter);
      const isOrFilter = effectiveFilter.operator === "or";

      const filterBaseResult =
        isOrFilter && lastStructuredResult?.filterContext?.baseResult
          ? cloneResultWithRows(
              lastStructuredResult.filterContext.baseResult,
              lastStructuredResult.filterContext.baseResult.title || "Chat Results",
              lastStructuredResult.filterContext.baseResult.rows || []
            )
          : dataResult;

      const directMatches = filterBaseResult.rows.filter((row) => rowMatchesFilter(row, effectiveFilter));
      let filteredRows = directMatches;

      if (isOrFilter) {
        const byKey = new Map();
        const getKey = (row) => String(row?.wtid || row?.WTID || row?.Id || row?.id || row?.displayName || "").trim();
        const priorRows = Array.isArray(lastStructuredResult?.rows) ? lastStructuredResult.rows : [];
        priorRows.forEach((row) => {
          const key = getKey(row);
          if (key) byKey.set(key, row);
        });
        directMatches.forEach((row) => {
          const key = getKey(row);
          if (key && !byKey.has(key)) byKey.set(key, row);
        });
        filteredRows = Array.from(byKey.values());
      }

      if (!filteredRows.length) {
        return `No rows matched this filter in the current result set: ${filterSummary}.`;
      }

      const filteredResult = cloneResultWithRows(
        dataResult,
        `${dataResult.title} filtered (${filterTitle})`,
        filteredRows
      );
      filteredResult.filterContext = {
        kind: effectiveFilter.kind,
        value: String(effectiveFilter.value || ""),
        operator: isOrFilter ? "or" : "and",
        baseResult:
          lastStructuredResult?.filterContext?.baseResult ||
          cloneResultWithRows(dataResult, dataResult.title || "Chat Results", dataResult.rows),
      };

      return {
        message: `${isOrFilter ? "Expanded" : "Filtered"} the current result set ${isOrFilter ? "to" : "down to"} ${
          filteredRows.length
        } row${filteredRows.length === 1 ? "" : "s"} using ${filterSummary}.\n${summarizeStructuredRows(filteredRows)}`,
        table: filteredResult,
      };
    }

    return null;
  };
}
