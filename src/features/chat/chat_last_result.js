export function createLastResultOperationHandler({
  getLastStructuredResult,
  setLastStructuredResult,
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
    if (kind === "birthYearRange") {
      return `birth year ${filter.start ?? "?"}–${filter.end ?? "?"}`;
    }
    if (kind === "deathYearRange") {
      return `death year ${filter.start ?? "?"}–${filter.end ?? "?"}`;
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
    if (kind === "birthYearRange") {
      return `birth ${filter.start ?? "?"}-${filter.end ?? "?"}`;
    }
    if (kind === "deathYearRange") {
      return `death ${filter.start ?? "?"}-${filter.end ?? "?"}`;
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

  function buildPreviewAndInlineMore(lines, maxToShow = 12) {
    const shown = (lines || []).slice(0, maxToShow);
    const remaining = (lines || []).slice(maxToShow);
    return {
      preview: shown.join("\n"),
      inlineMore: remaining.length
        ? {
            count: remaining.length,
            text: remaining.join("\n"),
          }
        : null,
    };
  }

  function summarizeStructuredRows(rows, maxToShow = 12) {
    const lines = rows.map((row) => {
      const bits = [`${row.displayName || row.wtid || "Unknown"} (${row.wtid || "no-id"})`];
      if (row.degrees !== "" && row.degrees !== undefined) {
        bits.push(`degree ${row.degrees}`);
      }
      if (row.removed !== "" && row.removed !== undefined) {
        bits.push(`removed ${row.removed}`);
      }
      if (row.birth) {
        bits.push(`born ${row.birth}`);
      }
      if (row.gender) {
        bits.push(row.gender);
      }
      return `- ${bits.join(" | ")}`;
    });
    return buildPreviewAndInlineMore(lines, maxToShow);
  }

  function resolveColumnFilterRequest(result, filter) {
    const columnKeys = new Set(
      (result?.columns || []).map((column) => String(column?.key || "").trim()).filter(Boolean)
    );
    const filterKind = String(filter?.kind || "").trim();
    const rawValue = String(filter?.value || "").trim();

    if (!filterKind || !result?.columns?.length) {
      return null;
    }

    if (columnKeys.has(filterKind) && rawValue) {
      const matchingColumn = result.columns.find((column) => String(column?.key || "").trim() === filterKind);
      return {
        key: filterKind,
        value: rawValue,
        label: String(matchingColumn?.title || filterKind),
      };
    }

    if ((filterKind === "birthDate" || filterKind === "deathDate") && rawValue) {
      const key = filterKind === "birthDate" ? "birth" : "death";
      if (!columnKeys.has(key)) {
        return null;
      }
      const matchingColumn = result.columns.find((column) => String(column?.key || "").trim() === key);
      const direction = String(filter?.direction || "before").toLowerCase() === "after" ? ">" : "<";
      return {
        key,
        value: `${direction} ${rawValue}`,
        label: String(matchingColumn?.title || key),
      };
    }

    if (filterKind === "birthYearRange" || filterKind === "deathYearRange") {
      const key = filterKind === "birthYearRange" ? "birth" : "death";
      if (!columnKeys.has(key)) {
        return null;
      }
      const start = String(filter?.start ?? "").trim();
      const end = String(filter?.end ?? "").trim();
      if (!start && !end) {
        return null;
      }
      const matchingColumn = result.columns.find((column) => String(column?.key || "").trim() === key);
      return {
        key,
        value: `${start}-${end}`.replace(/^-|-$/g, ""),
        label: String(matchingColumn?.title || key),
      };
    }

    return null;
  }

  function buildColumnFilterMessage(filterRequests) {
    if (!filterRequests.length) {
      return "I opened the current result set in a table.";
    }

    if (filterRequests.length === 1) {
      const filter = filterRequests[0];
      return `I opened the current result set in a table with the ${filter.label} column filter set to "${filter.value}".`;
    }

    const summary = filterRequests.map((filter) => `${filter.label} = "${filter.value}"`).join(" and ");
    return `I opened the current result set in a table with column filters set to ${summary}.`;
  }

  function getStoredColumnFilters(result) {
    return Array.isArray(result?.columnFilterContext?.filters)
      ? result.columnFilterContext.filters.filter(
          (filter) => String(filter?.key || "").trim() && String(filter?.value || "").trim()
        )
      : [];
  }

  function mergeColumnFilters(existingFilters = [], incomingFilters = []) {
    const merged = new Map();

    [...existingFilters, ...incomingFilters].forEach((filter) => {
      const key = String(filter?.key || "").trim();
      const value = String(filter?.value || "").trim();
      if (!key || !value) {
        return;
      }

      merged.set(key, {
        key,
        value,
        label: String(filter?.label || key),
      });
    });

    return Array.from(merged.values());
  }

  function openTableWithMergedColumnFilters(result, incomingFilters = []) {
    const mergedFilters = mergeColumnFilters(getStoredColumnFilters(result), incomingFilters);
    const nextResult = cloneResultWithRows(result, result?.title || "Chat Results", result?.rows || []);
    nextResult.columnFilterContext = { filters: mergedFilters };
    if (typeof setLastStructuredResult === "function") {
      setLastStructuredResult(nextResult);
    }
    openResultsTable(nextResult, { initialColumnFilters: mergedFilters });
    return mergedFilters;
  }

  function compareResultRows(left, right, field, direction) {
    let leftValue;
    let rightValue;

    if (field === "birth" || field === "death") {
      leftValue = normalizeDateForSort(left[field]);
      rightValue = normalizeDateForSort(right[field]);
    } else if (field === "degrees" || field === "removed") {
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
    // Year-range filters don't use a value field — handle before the empty-value guard.
    if (filter.kind === "birthYearRange" || filter.kind === "deathYearRange") {
      const rowDate = filter.kind === "birthYearRange" ? row.birth : row.death;
      const rowYear = extractYear(rowDate);
      if (!rowYear) return false;
      const start = Number(filter.start);
      const end = Number(filter.end);
      return (!Number.isFinite(start) || rowYear >= start) && (!Number.isFinite(end) || rowYear <= end);
    }
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
      row.birth,
      row.death,
      row.birthLocation,
      row.deathLocation,
      row.gender,
      row.removed,
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
      openResultsTable(baseResult, { initialColumnFilters: getStoredColumnFilters(baseResult) });
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

      const summary = groupedRows.map((row) => `- ${row.label}: ${row.count}`);
      const { preview, inlineMore } = buildPreviewAndInlineMore(summary, 12);

      return {
        message: `Grouped the current results by ${params.field}:\n${preview}`,
        inlineMore,
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
      const { preview, inlineMore } = summarizeStructuredRows(sortedRows);
      return {
        message: `Sorted the current results by ${params.field} (${params.direction}).\n${preview}`,
        inlineMore,
        table: sortedResult,
      };
    }

    if (params.action === "filter") {
      // Support multi-filter (compound AND) via params.filters array.
      const filtersArray =
        Array.isArray(params.filters) && params.filters.length >= 2
          ? params.filters.map((f) => resolveEffectiveFilter(f, lastStructuredResult))
          : null;
      const effectiveFilter = filtersArray ? null : resolveEffectiveFilter(params.filter, lastStructuredResult);

      if (filtersArray) {
        const columnFilters = filtersArray.map((filter) => resolveColumnFilterRequest(dataResult, filter));
        const allColumnFiltersSupported = columnFilters.length > 0 && columnFilters.every(Boolean);
        if (allColumnFiltersSupported) {
          const mergedFilters = openTableWithMergedColumnFilters(dataResult, columnFilters);
          return {
            message: buildColumnFilterMessage(mergedFilters),
          };
        }
      } else if (effectiveFilter?.operator !== "or") {
        const columnFilter = resolveColumnFilterRequest(dataResult, effectiveFilter);
        if (columnFilter) {
          const mergedFilters = openTableWithMergedColumnFilters(dataResult, [columnFilter]);
          return {
            message: buildColumnFilterMessage(mergedFilters),
          };
        }
      }

      if (filtersArray) {
        const filterSummary = filtersArray.map((f) => describeFilter(f)).join(" and ");
        const filterTitle = filtersArray.map((f) => describeFilterForTitle(f)).join("+");
        const filteredRows = dataResult.rows.filter((row) => filtersArray.every((f) => rowMatchesFilter(row, f)));
        if (!filteredRows.length) {
          return `No rows matched this filter in the current result set: ${filterSummary}.`;
        }
        const filteredResult = cloneResultWithRows(
          dataResult,
          `${dataResult.title} filtered (${filterTitle})`,
          filteredRows
        );
        const { preview, inlineMore } = summarizeStructuredRows(filteredRows);
        return {
          message: `Filtered the current result set down to ${filteredRows.length} row${
            filteredRows.length === 1 ? "" : "s"
          } using ${filterSummary}.\n${preview}`,
          inlineMore,
          table: filteredResult,
        };
      }

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
      const { preview, inlineMore } = summarizeStructuredRows(filteredRows);

      return {
        message: `${isOrFilter ? "Expanded" : "Filtered"} the current result set ${isOrFilter ? "to" : "down to"} ${
          filteredRows.length
        } row${filteredRows.length === 1 ? "" : "s"} using ${filterSummary}.\n${preview}`,
        inlineMore,
        table: filteredResult,
      };
    }

    return null;
  };
}
