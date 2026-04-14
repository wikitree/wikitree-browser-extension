import { createLastResultOperationHandler } from "./chat_last_result";

function createRows(count, overrides = {}) {
  return Array.from({ length: count }, (_, index) => ({
    displayName: `Person ${index + 1}`,
    wtid: `Person-${index + 1}`,
    firstName: `Person${index + 1}`,
    birthLocation: overrides.birthLocation || "Birkenhead, Cheshire, England",
    deathLocation: overrides.deathLocation || "",
    birth: `18${String(50 + index).padStart(2, "0")}-00-00`,
    death: "",
    surname: overrides.surname || "Roberts",
    gender: index % 2 === 0 ? "Male" : "Female",
    degrees: overrides.degrees ?? 5,
  }));
}

function createHandler(lastStructuredResult) {
  const openResultsTable = jest.fn();
  const setLastStructuredResult = jest.fn();
  return createLastResultOperationHandler({
    getLastStructuredResult: () => lastStructuredResult,
    setLastStructuredResult,
    openResultsTable,
    cloneResultWithRows: (result, title, rows) => ({ ...result, title, rows }),
    normalizeText: (value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    normalizeDateForSort: (value) => String(value || ""),
    normalizeNumberForSort: (value) => (Number.isFinite(Number(value)) ? Number(value) : Number.MAX_SAFE_INTEGER),
    normalizeSurname: (value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    extractCountryFromLocation: (value) =>
      String(value || "")
        .split(",")
        .pop()
        ?.trim() || "",
  });
}

function createHandlerWithSpy(lastStructuredResult) {
  const openResultsTable = jest.fn();
  const setLastStructuredResult = jest.fn();
  return {
    openResultsTable,
    setLastStructuredResult,
    handler: createLastResultOperationHandler({
      getLastStructuredResult: () => lastStructuredResult,
      setLastStructuredResult,
      openResultsTable,
      cloneResultWithRows: (result, title, rows) => ({ ...result, title, rows }),
      normalizeText: (value) =>
        String(value || "")
          .trim()
          .toLowerCase(),
      normalizeDateForSort: (value) => String(value || ""),
      normalizeNumberForSort: (value) => (Number.isFinite(Number(value)) ? Number(value) : Number.MAX_SAFE_INTEGER),
      normalizeSurname: (value) =>
        String(value || "")
          .trim()
          .toLowerCase(),
      extractCountryFromLocation: (value) =>
        String(value || "")
          .split(",")
          .pop()
          ?.trim() || "",
    }),
  };
}

function createStandardColumns() {
  return [
    { title: "WT ID", key: "wtid" },
    { title: "First Name", key: "firstName" },
    { title: "Last Name", key: "lnab" },
    { title: "°", key: "degrees" },
    { title: "Birth", key: "birth" },
    { title: "Death", key: "death" },
    { title: "Birth Location", key: "birthLocation" },
    { title: "Death Location", key: "deathLocation" },
  ];
}

describe("chat_last_result inline more", () => {
  test("supported filters open the table with a matching column filter", async () => {
    const rows = createRows(27);
    const resultSet = { title: "Descendants", rows, columns: createStandardColumns() };
    const { handler, openResultsTable, setLastStructuredResult } = createHandlerWithSpy(resultSet);

    const result = await handler({
      action: "filter",
      filter: { kind: "birthLocation", value: "Birkenhead" },
    });

    expect(setLastStructuredResult).toHaveBeenCalledWith(
      expect.objectContaining({
        columnFilterContext: {
          filters: [{ key: "birthLocation", value: "Birkenhead", label: "Birth Location" }],
        },
      })
    );
    expect(openResultsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        columnFilterContext: {
          filters: [{ key: "birthLocation", value: "Birkenhead", label: "Birth Location" }],
        },
      }),
      {
        initialColumnFilters: [{ key: "birthLocation", value: "Birkenhead", label: "Birth Location" }],
      }
    );
    expect(result).toEqual({
      message: 'I opened the current result set in a table with the Birth Location column filter set to "Birkenhead".',
    });
  });

  test("supported follow-up filters merge with existing column filters", async () => {
    const rows = createRows(27);
    const resultSet = {
      title: "Descendants",
      rows,
      columns: createStandardColumns(),
      columnFilterContext: {
        filters: [{ key: "birthLocation", value: "Iowa", label: "Birth Location" }],
      },
    };
    const { handler, openResultsTable, setLastStructuredResult } = createHandlerWithSpy(resultSet);

    const result = await handler({
      action: "filter",
      filter: { kind: "birthYearRange", start: 1940, end: 1950 },
    });

    const expectedFilters = [
      { key: "birthLocation", value: "Iowa", label: "Birth Location" },
      { key: "birth", value: "1940-1950", label: "Birth" },
    ];

    expect(setLastStructuredResult).toHaveBeenCalledWith(
      expect.objectContaining({
        columnFilterContext: { filters: expectedFilters },
      })
    );
    expect(openResultsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        columnFilterContext: { filters: expectedFilters },
      }),
      {
        initialColumnFilters: expectedFilters,
      }
    );
    expect(result).toEqual({
      message:
        'I opened the current result set in a table with column filters set to Birth Location = "Iowa" and Birth = "1940-1950".',
    });
  });

  test("unsupported filters still return inlineMore instead of literal trailing more text", async () => {
    const rows = createRows(27);
    const handler = createHandler({ title: "Descendants", rows, columns: createStandardColumns() });

    const result = await handler({
      action: "filter",
      filter: { kind: "country", value: "England" },
    });

    expect(result.message).toContain("Filtered the current result set down to 27 rows using country contains England.");
    expect(result.message).not.toContain("...and 15 more.");
    expect(result.inlineMore).toEqual({
      count: 15,
      text: expect.stringContaining("- Person 13 (Person-13) | degree 5 | born 1862-00-00 | Male"),
    });
  });

  test("countBy results return inlineMore for additional grouped rows", async () => {
    const rows = Array.from({ length: 15 }, (_, index) => ({
      displayName: `Person ${index + 1}`,
      wtid: `Person-${index + 1}`,
      surname: `Surname ${index + 1}`,
      birthLocation: "Birkenhead, Cheshire, England",
      deathLocation: "",
    }));
    const handler = createHandler({ title: "Descendants", rows });

    const result = await handler({
      action: "countBy",
      field: "surname",
    });

    expect(result.message).toContain("Grouped the current results by surname:");
    expect(result.message).not.toContain("...and 3 more.");
    expect(result.inlineMore).toEqual({
      count: 3,
      text: expect.stringContaining("- Surname 7: 1"),
    });
  });
});
