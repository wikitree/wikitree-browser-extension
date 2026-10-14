/*
Page ranges for the Find a Grave Memorial Extractor. A cemetery list is read one page (20 memorials) at a time, so a
run can cover any range of pages. Pure helpers, so they can be tested without a browser.
*/

export const ROWS_PER_PAGE = 20; // memorials on one list page
export const MAX_MEMORIALS_PER_RUN = 1000; // a longer run would take too long, and is hard on Find a Grave
export const MAX_PAGES_PER_RUN = MAX_MEMORIALS_PER_RUN / ROWS_PER_PAGE;
export const MAX_LIST_PAGE = 500; // Find a Grave lists nothing after page 500 (10,000 memorials), whatever the total

export function formatNumber(number) {
  return Number(number).toLocaleString("en-US");
}

// The furthest page that can be read for a list with this many pages
export function lastReadablePage(totalPages) {
  return Math.max(1, Math.min(totalPages, MAX_LIST_PAGE));
}

// The pages to read when the user has not chosen: all of them if they fit in one run, otherwise the first run's worth
export function defaultRange(totalPages) {
  return { from: 1, to: Math.min(lastReadablePage(totalPages), MAX_PAGES_PER_RUN) };
}

// The range to suggest after a run that ended on page `previousTo`: the next run's worth
export function nextRange(previousTo, totalPages) {
  const last = lastReadablePage(totalPages);
  if (!previousTo || previousTo >= last) return defaultRange(totalPages);
  const from = previousTo + 1;
  return { from, to: Math.min(last, from + MAX_PAGES_PER_RUN - 1) };
}

// Checks a range typed by the user. Returns { ok: true, from, to } or { ok: false, error }.
export function validatePageRange(fromText, toText, totalPages) {
  const last = lastReadablePage(totalPages);
  const from = Number(fromText);
  const to = Number(toText);

  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    String(fromText).trim() === "" ||
    String(toText).trim() === ""
  ) {
    return { ok: false, error: "Enter whole page numbers in both boxes." };
  }
  if (from < 1 || to < 1) return { ok: false, error: "Page numbers start at 1." };
  if (from > to) return { ok: false, error: "The first page must not be after the last page." };
  if (to > last) {
    return {
      ok: false,
      error:
        totalPages > MAX_LIST_PAGE
          ? `Find a Grave lists nothing after page ${MAX_LIST_PAGE}. Choose pages up to ${MAX_LIST_PAGE}, or narrow the list with filters.`
          : `This list has only ${formatNumber(totalPages)} pages.`,
    };
  }
  if (to - from + 1 > MAX_PAGES_PER_RUN) {
    return {
      ok: false,
      error: `Please choose ${MAX_PAGES_PER_RUN} pages (${formatNumber(
        MAX_MEMORIALS_PER_RUN
      )} memorials) or fewer at a time.`,
    };
  }
  return { ok: true, from, to };
}

// The address of one page of the list the user is looking at, keeping its filters and sort order
export function buildPageUrl(href, page) {
  const url = new URL(href);
  url.hash = "";
  url.searchParams.set("page", String(page));
  return url.toString();
}

// The same list with the page number removed, to tell whether two addresses are the same list
export function listKey(href) {
  const url = new URL(href);
  url.hash = "";
  url.searchParams.delete("page");
  return url.toString();
}

// Added to the file name when only some pages were read
export function pageFilenameSuffix(from, to, totalPages) {
  return from === 1 && to >= totalPages ? "" : `_pages_${from}-${to}`;
}
