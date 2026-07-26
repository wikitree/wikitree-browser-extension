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
