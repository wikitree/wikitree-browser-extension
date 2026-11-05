import {
  BASE_INTERVAL_MS,
  BACKOFF_BASE_MS,
  JITTER_MS,
  MAX_INTERVAL_MS,
  MAX_WAIT_MS,
  RECOVERY_SUCCESSES,
  backoffMs,
  isRetryableStatus,
  nextStartTime,
  parseRetryAfter,
  sleep,
  recoveredInterval,
  slowedInterval,
} from "./fg_pacing";

describe("parseRetryAfter", () => {
  test("seconds become milliseconds", () => {
    expect(parseRetryAfter("7")).toBe(7000);
    expect(parseRetryAfter(" 2.5 ")).toBe(2500);
    expect(parseRetryAfter("0")).toBe(0);
  });

  test("a date is the time from now", () => {
    const now = Date.parse("2026-10-14T12:00:00Z");
    expect(parseRetryAfter("Wed, 14 Oct 2026 12:00:30 GMT", now)).toBe(30000);
    expect(parseRetryAfter("Wed, 14 Oct 2026 11:00:00 GMT", now)).toBe(0); // already past
  });

  test("never more than the maximum wait", () => {
    expect(parseRetryAfter("99999")).toBe(MAX_WAIT_MS);
  });

  test("missing or unusable gives null", () => {
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter(undefined)).toBeNull();
    expect(parseRetryAfter("")).toBeNull();
    expect(parseRetryAfter("soon")).toBeNull();
  });
});

describe("backoffMs", () => {
  test("doubles with each try, and is capped", () => {
    expect(backoffMs(1)).toBe(BACKOFF_BASE_MS);
    expect(backoffMs(2)).toBe(BACKOFF_BASE_MS * 2);
    expect(backoffMs(3)).toBe(BACKOFF_BASE_MS * 4);
    expect(backoffMs(30)).toBe(MAX_WAIT_MS);
  });

  test("what the server asked for wins", () => {
    expect(backoffMs(1, 12000)).toBe(12000);
    expect(backoffMs(3, 0)).toBe(0);
  });

  test("does not depend on how fast the run is going", () => {
    expect(backoffMs(1)).toBe(5000);
  });
});

describe("slowedInterval", () => {
  test("halves the pace, up to a limit", () => {
    expect(slowedInterval(BASE_INTERVAL_MS)).toBe(2 * BASE_INTERVAL_MS);
    expect(slowedInterval(4000)).toBe(8000);
    expect(slowedInterval(MAX_INTERVAL_MS)).toBe(MAX_INTERVAL_MS);
  });
});

describe("nextStartTime", () => {
  test("paces from the start of the last request, not its end", () => {
    // a request started at 0 and took 400 ms: the next starts at the interval, so only 600 ms more to wait
    expect(nextStartTime(0, 400, 1000, 0)).toBe(1000);
    expect(nextStartTime(0, 400, 1000, 1)).toBe(1000 + JITTER_MS);
  });

  test("a slow response means no extra wait", () => {
    expect(nextStartTime(0, 5000, 1000, 0.5)).toBe(5000);
  });
});

describe("sleep", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("resolves after the time", async () => {
    const done = jest.fn();
    sleep(1000).then(done);
    await jest.advanceTimersByTimeAsync(999);
    expect(done).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalled();
  });

  test("ends at once when aborted, using one timer", async () => {
    const controller = new AbortController();
    const done = jest.fn();
    sleep(60000, controller.signal).then(done);
    expect(jest.getTimerCount()).toBe(1);
    controller.abort();
    await jest.advanceTimersByTimeAsync(0);
    expect(done).toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test("returns straight away for no wait or an already aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    await sleep(60000, controller.signal);
    await sleep(0);
    await sleep(-5);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe("isRetryableStatus", () => {
  test("rate limits, refusals and server errors are 'not now'", () => {
    [401, 403, 408, 429, 500, 502, 503, 504].forEach((status) => expect(isRetryableStatus(status)).toBe(true));
  });

  test("a page that is not there is not retried", () => {
    [400, 404, 410].forEach((status) => expect(isRetryableStatus(status)).toBe(false));
  });
});

describe("recoveredInterval", () => {
  test("comes back one step, never below the normal pace", () => {
    expect(recoveredInterval(8000)).toBe(4000);
    expect(recoveredInterval(2000)).toBe(BASE_INTERVAL_MS);
    expect(recoveredInterval(BASE_INTERVAL_MS)).toBe(BASE_INTERVAL_MS);
    expect(RECOVERY_SUCCESSES).toBe(10);
  });
});
