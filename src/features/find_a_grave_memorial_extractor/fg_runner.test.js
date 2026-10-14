import { BACKOFF_BASE_MS, BASE_INTERVAL_MS, MAX_CONSECUTIVE_FAILURES, RECOVERY_SUCCESSES } from "./fg_pacing";
import {
  createRunState,
  fetchDocument,
  fetchMemorialDetails,
  isListPage,
  isMemorialPage,
  loadListPages,
  readListRows,
} from "./fg_runner";

// Stand-ins for what Find a Grave sends back
const page = (html) => ({ ok: true, status: 200, headers: { get: () => null }, text: async () => html });
const failure = (status, retryAfter = null) => ({
  ok: false,
  status,
  headers: { get: (name) => (name === "Retry-After" ? retryAfter : null) },
  text: async () => "",
});

const listRow = (id) =>
  `<div class="memorial-item" id="sr-${id}"><a href="/memorial/${id}/x"><div class="memorial-item-pic"><img src="x.jpg"></div>` +
  `<h2 class="name-grave"><i>Name ${id}</i></h2><b class="birthDeathDates">1900 – 1950</b></a></div>`;
const listPage = (...ids) =>
  page(`<html><body><div class="memorial-list-data">${ids.map(listRow).join("")}</div></body></html>`);
const emptyListPage = () =>
  page('<html><body><div class="refineSearchForm"><h1>No matches found for</h1></div></body></html>');
const challengePage = () => page("<html><body><h1>Checking your browser before accessing the site</h1></body></html>");

const memorialPage = (givenNames, surname, gps) =>
  page(
    `<html><body><h1 id="bio-name">${givenNames} ${surname}</h1><span id="memNumberLabel">1</span>` +
      `<a id="gpsValue" href="${
        gps ? `http://maps.google.com/maps?q=${gps}&spn=1,1` : "/memorial/1/edit#gps-location"
      }">map</a>` +
      `<span id="plotValueLabel">B-1</span></body></html>`
  );

let fetchTimes;
const mockFetch = (responder) => {
  fetchTimes = [];
  global.fetch = jest.fn(async (url, options) => {
    fetchTimes.push(Date.now());
    return responder(url, options, fetchTimes.length);
  });
};

// Runs a promise while moving the fake clock along, so pauses and retries pass without waiting
async function finish(promise, ms = 600000) {
  let result;
  let done = false;
  promise.then((value) => {
    result = value;
    done = true;
  });
  await jest.advanceTimersByTimeAsync(ms);
  expect(done).toBe(true);
  return result;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete global.fetch;
});

describe("fetchDocument", () => {
  test("returns the parsed page", async () => {
    mockFetch(() => memorialPage("Ann", "Smith"));
    const result = await finish(fetchDocument("https://www.findagrave.com/memorial/1", createRunState()));
    expect(result.status).toBe("ok");
    expect(result.doc.querySelector("#bio-name").textContent).toBe("Ann Smith");
  });

  test("a page that is not there is 'missing', and is not tried again", async () => {
    mockFetch(() => failure(404));
    const result = await finish(fetchDocument("https://www.findagrave.com/memorial/1", createRunState()));
    expect(result.status).toBe("missing");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("waits as long as Retry-After says, then tries again, and slows the run", async () => {
    mockFetch((url, options, call) => (call === 1 ? failure(429, "7") : memorialPage("Ann", "Smith")));
    const state = createRunState();
    const promise = fetchDocument("https://www.findagrave.com/memorial/1", state);
    await jest.advanceTimersByTimeAsync(6900);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((await promise).status).toBe("ok");
    expect(state.intervalMs).toBe(BASE_INTERVAL_MS * 2);
  });

  test("a server that keeps failing is tried 3 times with growing waits, then 'failed'", async () => {
    mockFetch(() => failure(500));
    const state = createRunState();
    const promise = fetchDocument("https://www.findagrave.com/memorial/1", state);
    await jest.advanceTimersByTimeAsync(BACKOFF_BASE_MS - 1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(BACKOFF_BASE_MS * 2);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect((await promise).status).toBe("failed");
    expect(global.fetch).toHaveBeenCalledTimes(3); // no wait or fourth try after the last one
    expect(state.intervalMs).toBe(BASE_INTERVAL_MS * 8);
  });

  test("a network error is tried again", async () => {
    mockFetch((url, options, call) => {
      if (call === 1) throw new TypeError("network down");
      return memorialPage("Ann", "Smith");
    });
    const result = await finish(fetchDocument("https://www.findagrave.com/memorial/1", createRunState()));
    expect(result.status).toBe("ok");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("Stop ends a wait at once and does not try again", async () => {
    mockFetch(() => failure(429, "60"));
    const state = createRunState();
    const promise = fetchDocument("https://www.findagrave.com/memorial/1", state);
    await jest.advanceTimersByTimeAsync(1000);
    state.cancelled = true;
    state.controller.abort();
    await jest.advanceTimersByTimeAsync(0);
    expect((await promise).status).toBe("failed");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("fetchMemorialDetails", () => {
  const makeRows = (count) =>
    Array.from({ length: count }, (_, i) => ({
      memorialLink: `https://www.findagrave.com/memorial/${i + 1}`,
      givenNames: "List",
      surname: "Name",
      latitude: "",
      longitude: "",
    }));

  test("adds the details from each memorial page", async () => {
    mockFetch(() => memorialPage("Ann", "Smith", "36.5,-104.4"));
    const rows = makeRows(2);
    const progress = [];
    const result = await finish(fetchMemorialDetails(rows, createRunState(), (done) => progress.push(done)));
    expect(result).toEqual({ failedCount: 0, fetchedCount: 2 });
    expect(rows[0]).toMatchObject({
      givenNames: "Ann",
      surname: "Smith",
      latitude: "36.5",
      longitude: "-104.4",
      plot: "B-1",
    });
    expect(progress).toEqual([1, 2]);
  });

  test("starts one memorial at most once an interval, whatever the fetch took", async () => {
    mockFetch(() => memorialPage("Ann", "Smith"));
    await finish(fetchMemorialDetails(makeRows(4), createRunState(), () => {}));
    const gaps = fetchTimes.slice(1).map((time, i) => time - fetchTimes[i]);
    expect(gaps).toEqual([BASE_INTERVAL_MS, BASE_INTERVAL_MS, BASE_INTERVAL_MS]);
  });

  test("a memorial that fails keeps the list data and is counted", async () => {
    mockFetch((url) => (url.endsWith("/2") ? failure(500) : memorialPage("Ann", "Smith")));
    const rows = makeRows(3);
    const result = await finish(fetchMemorialDetails(rows, createRunState(), () => {}));
    expect(result).toEqual({ failedCount: 1, fetchedCount: 3 });
    expect(rows[1]).toMatchObject({ givenNames: "List", surname: "Name", latitude: "" });
    expect(rows[2].givenNames).toBe("Ann");
  });

  test("stops after several memorials in a row cannot be fetched", async () => {
    mockFetch(() => failure(503));
    const rows = makeRows(10);
    const state = createRunState();
    const result = await finish(fetchMemorialDetails(rows, state, () => {}));
    expect(state.stopReason).toBe("blocked");
    expect(result.fetchedCount).toBe(MAX_CONSECUTIVE_FAILURES);
    expect(global.fetch).toHaveBeenCalledTimes(MAX_CONSECUTIVE_FAILURES * 3); // 3 tries each, then no more
  });

  test("a success in between keeps the run going", async () => {
    // fail, fail, ok, fail, fail, ok ...: never 5 in a row
    mockFetch((url) => (Number(url.split("/").pop()) % 3 === 0 ? memorialPage("Ann", "Smith") : failure(503)));
    const state = createRunState();
    const result = await finish(fetchMemorialDetails(makeRows(9), state, () => {}));
    expect(state.stopReason).toBeNull();
    expect(result.fetchedCount).toBe(9);
    expect(result.failedCount).toBe(6);
  });

  test("memorials that are simply gone do not count towards being blocked", async () => {
    mockFetch(() => failure(404));
    const state = createRunState();
    const result = await finish(fetchMemorialDetails(makeRows(8), state, () => {}));
    expect(state.stopReason).toBeNull();
    expect(result).toEqual({ failedCount: 8, fetchedCount: 8 });
  });

  test("Stop ends the run and leaves the rest alone", async () => {
    mockFetch(() => memorialPage("Ann", "Smith"));
    const rows = makeRows(6);
    const state = createRunState();
    const promise = fetchMemorialDetails(rows, state, (done) => {
      if (done === 2) {
        state.cancelled = true;
        state.controller.abort();
      }
    });
    const result = await finish(promise);
    expect(result.fetchedCount).toBe(2);
    expect(rows[2].givenNames).toBe("List");
  });
});

describe("loadListPages", () => {
  const listUrl =
    "https://www.findagrave.com/cemetery/76795/memorial-search?cemeteryName=Fern+Hill&orderby=n&page=2#sr-9";

  test("reads each chosen page of the same list, in order", async () => {
    mockFetch((url) => {
      const pageNumber = Number(new URL(url).searchParams.get("page"));
      return listPage(`${pageNumber}1`, `${pageNumber}2`);
    });
    const progress = [];
    const result = await finish(
      loadListPages(listUrl, { from: 3, to: 5 }, createRunState(), (d, n) => progress.push([d, n]))
    );
    expect(result.rows.map((row) => row.memorialId)).toEqual(["31", "32", "41", "42", "51", "52"]);
    expect(result.failedPages).toEqual([]);
    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
    const urls = global.fetch.mock.calls.map(([url]) => new URL(url));
    expect(urls.map((url) => url.searchParams.get("page"))).toEqual(["3", "4", "5"]);
    expect(urls[0].searchParams.get("orderby")).toBe("n");
    expect(urls[0].searchParams.get("cemeteryName")).toBe("Fern Hill");
    expect(urls[0].hash).toBe("");
  });

  test("a memorial that turns up on two pages is kept once", async () => {
    mockFetch((url, options, call) => (call === 1 ? listPage("1", "2") : listPage("2", "3")));
    const result = await finish(loadListPages(listUrl, { from: 1, to: 2 }, createRunState(), () => {}));
    expect(result.rows.map((row) => row.memorialId)).toEqual(["1", "2", "3"]);
  });

  test("stops at the end of the list", async () => {
    mockFetch((url, options, call) => (call === 1 ? listPage("1") : emptyListPage()));
    const result = await finish(loadListPages(listUrl, { from: 1, to: 50 }, createRunState(), () => {}, 1));
    expect(result.rows).toHaveLength(1);
    expect(result.failedPages).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("a blank page before the end of the list is a failure, not the end", async () => {
    mockFetch((url) =>
      new URL(url).searchParams.get("page") === "2"
        ? emptyListPage()
        : listPage(`p${new URL(url).searchParams.get("page")}`)
    );
    const result = await finish(loadListPages(listUrl, { from: 1, to: 4 }, createRunState(), () => {}, 4));
    expect(result.failedPages).toEqual([2]);
    expect(result.rows.map((row) => row.memorialId)).toEqual(["p1", "p3", "p4"]);
  });

  test("a challenge page instead of a list page is a failure", async () => {
    mockFetch(() => challengePage());
    const state = createRunState();
    const result = await finish(loadListPages(listUrl, { from: 1, to: 20 }, state, () => {}, 20));
    expect(state.stopReason).toBe("blocked");
    expect(result.rows).toEqual([]);
    expect(result.failedPages).toHaveLength(MAX_CONSECUTIVE_FAILURES);
  });

  test("a page that cannot be loaded is reported and the others are still read", async () => {
    mockFetch((url) =>
      new URL(url).searchParams.get("page") === "2"
        ? failure(500)
        : listPage(`p${new URL(url).searchParams.get("page")}`)
    );
    const result = await finish(loadListPages(listUrl, { from: 1, to: 3 }, createRunState(), () => {}));
    expect(result.failedPages).toEqual([2]);
    expect(result.rows.map((row) => row.memorialId)).toEqual(["p1", "p3"]);
  });

  test("stops when Find a Grave stops answering", async () => {
    mockFetch(() => failure(503));
    const state = createRunState();
    const result = await finish(loadListPages(listUrl, { from: 1, to: 20 }, state, () => {}));
    expect(state.stopReason).toBe("blocked");
    expect(result.failedPages).toHaveLength(MAX_CONSECUTIVE_FAILURES);
  });
});

describe("refusals and look-alike pages", () => {
  const rows = (count) =>
    Array.from({ length: count }, (_, i) => ({
      memorialLink: `https://www.findagrave.com/memorial/${i + 1}`,
      latitude: "",
    }));

  test("a 403 is retried, slows the run and counts towards stopping", async () => {
    mockFetch(() => failure(403));
    const state = createRunState();
    const result = await finish(fetchMemorialDetails(rows(10), state, () => {}));
    expect(state.stopReason).toBe("blocked");
    expect(result.fetchedCount).toBe(MAX_CONSECUTIVE_FAILURES);
    expect(global.fetch).toHaveBeenCalledTimes(MAX_CONSECUTIVE_FAILURES * 3);
  });

  test("a 200 that is not a memorial page is a failure, not a memorial with no GPS", async () => {
    mockFetch(() => challengePage());
    const state = createRunState();
    const result = await finish(fetchMemorialDetails(rows(10), state, () => {}));
    expect(state.stopReason).toBe("blocked");
    expect(result.failedCount).toBe(MAX_CONSECUTIVE_FAILURES);
  });

  test("a memorial with an empty name is still a memorial page", async () => {
    mockFetch(() => page('<html><body><h1 id="bio-name"> </h1></body></html>'));
    const result = await finish(
      fetchDocument("https://www.findagrave.com/memorial/1", createRunState(), isMemorialPage)
    );
    expect(result.status).toBe("ok");
  });

  test("tells the two page kinds apart", () => {
    const parse = (html) => new DOMParser().parseFromString(html, "text/html");
    expect(isMemorialPage(parse('<h1 id="bio-name">A B</h1>'))).toBe(true);
    expect(isMemorialPage(parse("<h1>Just a moment</h1>"))).toBe(false);
    expect(isListPage(parse('<div class="refineSearchForm"></div>'))).toBe(true);
    expect(isListPage(parse('<div class="memorial-list-data"></div>'))).toBe(true);
    expect(isListPage(parse("<h1>Just a moment</h1>"))).toBe(false);
  });
});

describe("pace recovery", () => {
  test("a slowed run comes back to the normal pace after a run of good answers", async () => {
    mockFetch((url, options, call) => (call === 1 ? failure(503) : memorialPage("Ann", "Smith")));
    const state = createRunState();
    const memorials = Array.from({ length: RECOVERY_SUCCESSES + 2 }, (_, i) => ({
      memorialLink: `https://www.findagrave.com/memorial/${i + 1}`,
      latitude: "",
    }));
    await finish(fetchMemorialDetails(memorials, state, () => {}));
    expect(state.intervalMs).toBe(BASE_INTERVAL_MS);
  });

  test("a slowed run needs the full run of good answers before it speeds up", async () => {
    mockFetch((url, options, call) => (call === 1 ? failure(503) : memorialPage("Ann", "Smith")));
    const state = createRunState();
    const memorials = Array.from({ length: RECOVERY_SUCCESSES - 1 }, (_, i) => ({
      memorialLink: `https://www.findagrave.com/memorial/${i + 1}`,
      latitude: "",
    }));
    await finish(fetchMemorialDetails(memorials, state, () => {}));
    expect(state.intervalMs).toBe(BASE_INTERVAL_MS * 2); // 9 good answers after the slowdown is not enough yet
  });
});

describe("readListRows", () => {
  test("counts rows that cannot be read instead of hiding them", () => {
    const good = document.createElement("div");
    good.innerHTML = `<div class="memorial-item" id="sr-5"><a href="/memorial/5/x"></a><h2 class="name-grave"><i>Ann Smith</i></h2></div>`;
    const bad = {
      getAttribute() {
        throw new Error("unexpected markup");
      },
      querySelector() {
        throw new Error("unexpected markup");
      },
    };
    const doc = { querySelectorAll: () => [good.firstElementChild, bad] };
    const result = readListRows(doc);
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });
});
