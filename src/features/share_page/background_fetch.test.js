/**
 * Tests for the background script's "sharePageFetchImage" message. It fetches pictures for the content script and
 * ignores the browser's cross-origin rules, so what matters most is that it refuses everything that is not a picture
 * on wikitree.com.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import vm from "vm";

// background.js registers its listeners on load, so run it with a stand-in for the extension API that remembers the
// onMessage listener and accepts any other call.
function loadBackground(fetchImpl) {
  const listeners = [];
  const stub = (path) =>
    new Proxy(function () {}, {
      get(target, prop) {
        if (prop === "then" || typeof prop === "symbol") return undefined;
        if (prop === "addListener") {
          return (listener) => {
            if (path === "chrome.runtime.onMessage") listeners.push(listener);
          };
        }
        return stub(`${path}.${String(prop)}`);
      },
      apply: () => stub(`${path}()`),
    });
  const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
  const context = {
    chrome: stub("chrome"),
    browser: stub("browser"),
    fetch: fetchImpl,
    console: quiet,
    URL,
    URLSearchParams,
    btoa,
    atob,
    setTimeout,
    clearTimeout,
    Promise,
    Uint8Array,
  };
  vm.runInNewContext(readFileSync(resolve("public/background.js"), "utf8"), context);
  // Other features add their own onMessage listeners to the same script, so offer the message to each one:
  // the one that handles it answers later, so it returns true to keep the channel open.
  return (message) =>
    new Promise((resolve) => {
      const keptOpen = listeners.map((listener) => listener(message, {}, resolve)).some((kept) => kept === true);
      expect(keptOpen).toBe(true);
    });
}

const PNG_BYTES = [137, 80, 78, 71, 13, 10, 26, 10];
const picture = (overrides = {}) => ({
  ok: true,
  url: "https://apps.wikitree.com/pix/a.png",
  headers: { get: () => "image/png" },
  arrayBuffer: () => Promise.resolve(new Uint8Array(PNG_BYTES).buffer),
  ...overrides,
});

describe("background: sharePageFetchImage", () => {
  test("fetches a picture on apps.wikitree.com, with an appId, and returns it as base64", async () => {
    const fetchImpl = jest.fn(() => Promise.resolve(picture()));
    const send = loadBackground(fetchImpl);
    const reply = await send({ action: "sharePageFetchImage", url: "https://apps.wikitree.com/pix/a.png" });
    expect(reply).toEqual({ success: true, type: "image/png", base64: btoa(String.fromCharCode(...PNG_BYTES)) });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://apps.wikitree.com/pix/a.png?appId=WBE_sharePage");
  });

  test("does not add an appId for other WikiTree hosts", async () => {
    const fetchImpl = jest.fn(() => Promise.resolve(picture({ url: "https://www.wikitree.com/photo.php/4/49/x.jpg" })));
    const send = loadBackground(fetchImpl);
    const reply = await send({ action: "sharePageFetchImage", url: "https://www.wikitree.com/photo.php/4/49/x.jpg" });
    expect(reply.success).toBe(true);
    expect(fetchImpl.mock.calls[0][0]).toBe("https://www.wikitree.com/photo.php/4/49/x.jpg");
  });

  test.each([
    "https://evil.example/x.png",
    "https://wikitree.com.evil.example/x.png",
    "https://evilwikitree.com/x.png",
    "http://www.wikitree.com/x.png",
    "ftp://www.wikitree.com/x.png",
    "file:///etc/passwd",
    "not an address",
    "",
  ])("refuses %j without fetching anything", async (url) => {
    const fetchImpl = jest.fn();
    const send = loadBackground(fetchImpl);
    const reply = await send({ action: "sharePageFetchImage", url });
    expect(reply.success).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("refuses something that is not a picture", async () => {
    const send = loadBackground(() => Promise.resolve(picture({ headers: { get: () => "text/html; charset=utf-8" } })));
    const reply = await send({ action: "sharePageFetchImage", url: "https://apps.wikitree.com/page" });
    expect(reply.success).toBe(false);
  });

  test("refuses an error response", async () => {
    const send = loadBackground(() => Promise.resolve(picture({ ok: false })));
    const reply = await send({ action: "sharePageFetchImage", url: "https://apps.wikitree.com/pix/a.png" });
    expect(reply.success).toBe(false);
  });

  test("refuses a picture that redirected to another site", async () => {
    const send = loadBackground(() => Promise.resolve(picture({ url: "https://evil.example/x.png" })));
    const reply = await send({ action: "sharePageFetchImage", url: "https://apps.wikitree.com/pix/a.png" });
    expect(reply.success).toBe(false);
  });

  test("refuses a picture over 3 MB", async () => {
    const big = () => Promise.resolve(new ArrayBuffer(3 * 1024 * 1024 + 1));
    const send = loadBackground(() => Promise.resolve(picture({ arrayBuffer: big })));
    const reply = await send({ action: "sharePageFetchImage", url: "https://apps.wikitree.com/pix/a.png" });
    expect(reply).toEqual({ success: false, error: "The picture is too large." });
  });

  test("reports a failed request instead of leaving the caller waiting", async () => {
    const send = loadBackground(() => Promise.reject(new Error("network down")));
    const reply = await send({ action: "sharePageFetchImage", url: "https://apps.wikitree.com/pix/a.png" });
    expect(reply).toEqual({ success: false, error: "network down" });
  });
});
