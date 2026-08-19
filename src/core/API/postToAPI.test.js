import { WikiTreeAPI } from "./WikiTreeAPI";

/**
 * api.wikitree.com sits behind AWS WAF. An unchallenged request comes back as
 * 202 with an empty body and an x-amzn-waf-action header rather than an error
 * status, so response.ok is true and the old `response.json()` call surfaced it
 * as an opaque "JSON.parse: unexpected end of data" SyntaxError.
 */
function fakeResponse({ status = 200, ok = true, headers = {}, body = "" }) {
  const lowerCased = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status,
    ok,
    statusText: "",
    headers: { get: (name) => lowerCased[name.toLowerCase()] ?? null },
    text: async () => body,
  };
}

describe("WikiTreeAPI.postToAPI", () => {
  afterEach(() => {
    delete global.fetch;
  });

  it("parses a normal JSON response", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      fakeResponse({
        body: JSON.stringify([{ status: "", people: { 19076274: { Id: 19076274, Name: "Beacall-6" } } }]),
      })
    );

    const result = await WikiTreeAPI.postToAPI({ action: "getPeople", appId: "test" });
    expect(result[0].people["19076274"].Name).toBe("Beacall-6");
  });

  it("throws a recognisable error on a WAF challenge instead of a JSON parse error", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      fakeResponse({
        status: 202,
        headers: { "x-amzn-waf-action": "challenge" },
        body: "",
      })
    );

    const error = await WikiTreeAPI.postToAPI({ action: "getPeople", appId: "test" }).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(SyntaxError);
    expect(error.message).toMatch(/WAF challenge/);
    expect(WikiTreeAPI.isLikelyAppsServerAccessError(error)).toBe(true);
  });

  it("treats a captcha action as a challenge too", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(fakeResponse({ status: 202, headers: { "x-amzn-waf-action": "CAPTCHA" }, body: "" }));

    const error = await WikiTreeAPI.postToAPI({ action: "getPeople", appId: "test" }).catch((e) => e);
    expect(error.message).toMatch(/captcha/);
    expect(WikiTreeAPI.isLikelyAppsServerAccessError(error)).toBe(true);
  });

  it("does not treat a non-challenge waf header as a failure", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      fakeResponse({
        headers: { "x-amzn-waf-action": "allow" },
        body: JSON.stringify([{ status: "" }]),
      })
    );

    await expect(WikiTreeAPI.postToAPI({ action: "getPeople", appId: "test" })).resolves.toEqual([{ status: "" }]);
  });

  it("reports an empty body without a waf header as an empty API response", async () => {
    global.fetch = jest.fn().mockResolvedValue(fakeResponse({ body: "" }));

    const error = await WikiTreeAPI.postToAPI({ action: "getPeople", appId: "test" }).catch((e) => e);
    expect(error).not.toBeInstanceOf(SyntaxError);
    expect(error.message).toMatch(/Empty API response/);
    expect(WikiTreeAPI.isLikelyAppsServerAccessError(error)).toBe(true);
  });

  it("still throws on a non-ok status", async () => {
    global.fetch = jest.fn().mockResolvedValue(fakeResponse({ status: 403, ok: false }));

    const error = await WikiTreeAPI.postToAPI({ action: "getPeople", appId: "test" }).catch((e) => e);
    expect(error.message).toMatch(/HTTP error! Status: 403/);
    expect(WikiTreeAPI.isLikelyAppsServerAccessError(error)).toBe(true);
  });
});

/**
 * The API occasionally answers a good request with a 5xx. Those are transient, so postToAPI
 * retries them with a backoff rather than surfacing them as an Auto Bio bug report.
 */
describe("WikiTreeAPI.postToAPI retries", () => {
  afterEach(() => {
    delete global.fetch;
    jest.useRealTimers();
  });

  function jsonResponse(payload) {
    return fakeResponse({ body: JSON.stringify(payload) });
  }

  it("retries a 500 and returns the result of the successful attempt", async () => {
    jest.useFakeTimers();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(fakeResponse({ status: 500, ok: false, body: "Internal Server Error" }))
      .mockResolvedValueOnce(jsonResponse([{ status: "", people: {} }]));

    const promise = WikiTreeAPI.postToAPI({ action: "getPeople", appId: "test" });
    await jest.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toEqual([{ status: "", people: {} }]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("gives up after three attempts on a persistent 500", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue(fakeResponse({ status: 500, ok: false, body: "" }));

    const promise = WikiTreeAPI.postToAPI({ action: "getPeople", appId: "test" }).catch((e) => e);
    await jest.advanceTimersByTimeAsync(5000);

    const error = await promise;
    expect(error.message).toMatch(/HTTP error! Status: 500/);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it.each([403, 401, 404])("does not retry a %i, which is a real answer", async (status) => {
    global.fetch = jest.fn().mockResolvedValue(fakeResponse({ status, ok: false, body: "" }));

    await WikiTreeAPI.postToAPI({ action: "getPeople", appId: "test" }).catch((e) => e);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry an abort", async () => {
    const aborted = new Error("The operation was aborted.");
    aborted.name = "AbortError";
    global.fetch = jest.fn().mockRejectedValue(aborted);

    const error = await WikiTreeAPI.postToAPI({ action: "getPeople", appId: "test" }).catch((e) => e);
    expect(error.name).toBe("AbortError");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("names the failing call and quotes the response body, so a bug report is diagnosable", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue(
      fakeResponse({
        status: 500,
        ok: false,
        body: "Fatal error: Allowed memory size of 134217728 bytes exhausted",
      })
    );

    const promise = WikiTreeAPI.postToAPI({
      action: "getPeople",
      appId: "test",
      keys: "Beacall-6,Beacall-7",
    }).catch((e) => e);
    await jest.advanceTimersByTimeAsync(5000);

    const error = await promise;
    expect(error.message).toMatch(/action getPeople/);
    expect(error.message).toMatch(/keys Beacall-6,Beacall-7/);
    expect(error.message).toMatch(/Allowed memory size/);
    expect(error.status).toBe(500);
  });

  it("truncates a huge key list instead of pasting it all into the error", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue(fakeResponse({ status: 503, ok: false, body: "" }));

    const keys = Array.from({ length: 500 }, (_, i) => `Beacall-${i}`).join(",");
    const promise = WikiTreeAPI.postToAPI({ action: "getPeople", appId: "test", keys }).catch((e) => e);
    await jest.advanceTimersByTimeAsync(5000);

    const error = await promise;
    expect(error.message).toMatch(/…/);
    expect(error.message.length).toBeLessThan(400);
  });
});
