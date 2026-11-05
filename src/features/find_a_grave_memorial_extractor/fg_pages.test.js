import {
  MAX_LIST_PAGE,
  MAX_PAGES_PER_RUN,
  buildPageUrl,
  defaultRange,
  formatNumber,
  lastReadablePage,
  listKey,
  nextRange,
  pageFilenameSuffix,
  validatePageRange,
} from "./fg_pages";

describe("limits", () => {
  test("a run is 50 pages of 20 memorials", () => {
    expect(MAX_PAGES_PER_RUN).toBe(50);
  });

  test("the last readable page is capped at 500", () => {
    expect(lastReadablePage(1379)).toBe(500);
    expect(lastReadablePage(3)).toBe(3);
    expect(lastReadablePage(0)).toBe(1);
  });
});

describe("defaultRange and nextRange", () => {
  test("a short list is read whole", () => {
    expect(defaultRange(3)).toEqual({ from: 1, to: 3 });
    expect(defaultRange(50)).toEqual({ from: 1, to: 50 });
  });

  test("a long list starts with the first run's worth", () => {
    expect(defaultRange(1379)).toEqual({ from: 1, to: 50 });
  });

  test("the next run follows the last", () => {
    expect(nextRange(50, 1379)).toEqual({ from: 51, to: 100 });
    expect(nextRange(480, 1379)).toEqual({ from: 481, to: 500 });
  });

  test("after the last page it starts over", () => {
    expect(nextRange(500, 1379)).toEqual({ from: 1, to: 50 });
    expect(nextRange(undefined, 1379)).toEqual({ from: 1, to: 50 });
  });
});

describe("validatePageRange", () => {
  test("accepts a good range, including text from input boxes", () => {
    expect(validatePageRange("4", "7", 1379)).toEqual({ ok: true, from: 4, to: 7 });
    expect(validatePageRange(1, 50, 1379)).toEqual({ ok: true, from: 1, to: 50 });
    expect(validatePageRange("500", "500", 1379)).toEqual({ ok: true, from: 500, to: 500 });
  });

  test("rejects missing or non-whole numbers", () => {
    expect(validatePageRange("", "5", 100).ok).toBe(false);
    expect(validatePageRange("1", "", 100).ok).toBe(false);
    expect(validatePageRange("a", "5", 100).ok).toBe(false);
    expect(validatePageRange("1.5", "5", 100).ok).toBe(false);
  });

  test("rejects pages below 1 and a first page after the last", () => {
    expect(validatePageRange("0", "5", 100).error).toMatch(/start at 1/);
    expect(validatePageRange("9", "3", 100).error).toMatch(/must not be after/);
  });

  test("rejects pages past Find a Grave's limit, and past the end of a short list", () => {
    expect(validatePageRange("490", "510", 1379).error).toMatch(/nothing after page 500/);
    expect(validatePageRange("1", "9", 3).error).toMatch(/only 3 pages/);
  });

  test("rejects more than a run's worth", () => {
    expect(validatePageRange("1", "51", 1379).error).toMatch(/50 pages/);
    expect(validatePageRange("51", "100", 1379).ok).toBe(true);
  });
});

describe("buildPageUrl and listKey", () => {
  const href =
    "https://www.findagrave.com/cemetery/76795/memorial-search?cemeteryName=Fern+Hill+Cemetery&orderby=n&page=2#sr-123";

  test("replaces the page and keeps the filters and sort order", () => {
    expect(buildPageUrl(href, 7)).toBe(
      "https://www.findagrave.com/cemetery/76795/memorial-search?cemeteryName=Fern+Hill+Cemetery&orderby=n&page=7"
    );
  });

  test("adds a page when there is none", () => {
    expect(buildPageUrl("https://www.findagrave.com/cemetery/76795/memorial-search", 3)).toBe(
      "https://www.findagrave.com/cemetery/76795/memorial-search?page=3"
    );
  });

  test("listKey ignores the page and the hash", () => {
    expect(listKey(href)).toBe(listKey(buildPageUrl(href, 40)));
    expect(listKey(href)).not.toBe(listKey(href.replace("orderby=n", "orderby=d")));
  });
});

describe("pageFilenameSuffix", () => {
  test("nothing for the whole list, the range otherwise", () => {
    expect(pageFilenameSuffix(1, 3, 3)).toBe("");
    expect(pageFilenameSuffix(1, 50, 1379)).toBe("_pages_1-50");
    expect(pageFilenameSuffix(51, 100, 1379)).toBe("_pages_51-100");
    expect(pageFilenameSuffix(2, 3, 3)).toBe("_pages_2-3");
  });
});

describe("formatNumber", () => {
  test("adds thousands separators", () => {
    expect(formatNumber(27562)).toBe("27,562");
    expect(MAX_LIST_PAGE).toBe(500);
  });
});
