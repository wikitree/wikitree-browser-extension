/**
 * The chrome.* stand-in for the WikiTree Tree Apps mobile app build (shim.js), run against a fake native host.
 */

const BASE = "https://www.wikitree.com/__wbe/";

// A host like the app's: storage in memory, answers on a later tick, records every call.
function fakeHost({ fail = {} } = {}) {
  const stores = { sync: {}, local: {} };
  const calls = [];
  const host = {
    platform: "test",
    base: BASE,
    stores,
    calls,
    send(json) {
      const { id, method, args } = JSON.parse(json);
      calls.push({ method, args });
      setTimeout(() => {
        if (fail[method]) {
          host.reply(id, fail[method], null);
          return;
        }
        const store = stores[args.area];
        let result = null;
        if (method === "storage.get") {
          const keys = args.keys === null ? Object.keys(store) : [].concat(args.keys);
          result = {};
          for (const key of keys) if (key in store) result[key] = store[key];
        } else if (method === "storage.set") {
          Object.assign(store, args.items);
        } else if (method === "storage.remove") {
          for (const key of args.keys) delete store[key];
        } else if (method === "storage.clear") {
          for (const key of Object.keys(store)) delete store[key];
        }
        host.reply(id, null, JSON.stringify(result));
      }, 0);
    },
  };
  return host;
}

function loadShim(host) {
  delete globalThis.__wbeShim;
  delete globalThis.chrome;
  delete globalThis.browser;
  delete globalThis.wbeIsWebviewApp;
  if (host) globalThis.__wbeHost = host;
  else delete globalThis.__wbeHost;
  jest.isolateModules(() => require("./shim"));
  return globalThis.chrome;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

beforeAll(() => {
  globalThis.WBE_WEBVIEW = true;
  globalThis.WBE_WEBVIEW_MANIFEST = { name: "WikiTree Browser Extension", version: "2.20.2.6", manifest_version: 3 };
  globalThis.__webpack_public_path__ = "";
});

afterAll(() => {
  delete globalThis.WBE_WEBVIEW;
  delete globalThis.WBE_WEBVIEW_MANIFEST;
  delete globalThis.__wbeHost;
  delete globalThis.__wbeShim;
  delete globalThis.chrome;
  delete globalThis.browser;
});

describe("webview stand-in", () => {
  test("defines chrome and browser as the same object, and marks the app", () => {
    const chrome = loadShim(fakeHost());
    expect(globalThis.browser).toBe(chrome);
    expect(globalThis.wbeIsWebviewApp).toBe(true);
  });

  test("a second copy (another bundle on the page) reuses the first one", () => {
    const host = fakeHost();
    const first = loadShim(host);
    jest.isolateModules(() => require("./shim"));
    expect(globalThis.chrome).toBe(first);
  });

  test("storage.sync set and get, with callbacks and promises", async () => {
    const chrome = loadShim(fakeHost());
    await chrome.storage.sync.set({ a: 1, b: { c: 2 } });
    expect(await chrome.storage.sync.get("a")).toEqual({ a: 1 });
    expect(await chrome.storage.sync.get(["a", "b", "missing"])).toEqual({ a: 1, b: { c: 2 } });
    expect(await chrome.storage.sync.get(null)).toEqual({ a: 1, b: { c: 2 } });
    const viaCallback = await new Promise((resolve) => chrome.storage.sync.get("b", resolve));
    expect(viaCallback).toEqual({ b: { c: 2 } });
    expect(chrome.storage.sync.get("b", () => {})).toBeUndefined();
  });

  test("get with default values is handled here; the host only gets the keys", async () => {
    const host = fakeHost();
    const chrome = loadShim(host);
    host.stores.sync.present = "saved";
    expect(await chrome.storage.sync.get({ present: "default", absent: [1] })).toEqual({ present: "saved", absent: [1] });
    expect(host.calls.find((call) => call.method === "storage.get").args).toEqual({
      area: "sync",
      keys: ["present", "absent"],
    });
  });

  test("local and sync are separate", async () => {
    const chrome = loadShim(fakeHost());
    await chrome.storage.local.set({ k: "local" });
    expect(await chrome.storage.sync.get("k")).toEqual({});
    expect(await chrome.storage.local.get("k")).toEqual({ k: "local" });
  });

  test("this page's writes fire onChanged with old and new values, and not for unchanged values", async () => {
    const chrome = loadShim(fakeHost());
    const events = [];
    const listener = (changes, area) => events.push({ changes, area });
    chrome.storage.onChanged.addListener(listener);
    expect(chrome.storage.onChanged.hasListener(listener)).toBe(true);

    await chrome.storage.sync.set({ x: 1 });
    await chrome.storage.sync.set({ x: 2, y: 3 });
    await chrome.storage.sync.set({ x: 2 });
    await chrome.storage.sync.remove("y");
    await chrome.storage.sync.clear();

    expect(events).toEqual([
      { area: "sync", changes: { x: { newValue: 1 } } },
      { area: "sync", changes: { x: { oldValue: 1, newValue: 2 }, y: { newValue: 3 } } },
      { area: "sync", changes: { y: { oldValue: 3 } } },
      { area: "sync", changes: { x: { oldValue: 2 } } },
    ]);

    chrome.storage.onChanged.removeListener(listener);
    await chrome.storage.sync.set({ z: 1 });
    expect(events).toHaveLength(4);
  });

  test("the host's storageChanged events (other web views) fire onChanged", () => {
    const host = fakeHost();
    const chrome = loadShim(host);
    const listener = jest.fn();
    chrome.storage.onChanged.addListener(listener);
    host.event(JSON.stringify({ type: "storageChanged", area: "sync", changes: { darkMode: { newValue: true } } }));
    expect(listener).toHaveBeenCalledWith({ darkMode: { newValue: true } }, "sync");
  });

  test("a failed host call sets runtime.lastError only during the callback, and rejects the promise", async () => {
    const chrome = loadShim(fakeHost({ fail: { "storage.get": "disk full" } }));
    const seen = await new Promise((resolve) =>
      chrome.storage.sync.get("a", (items) => resolve({ items, error: chrome.runtime.lastError?.message }))
    );
    expect(seen).toEqual({ items: undefined, error: "disk full" });
    expect(chrome.runtime.lastError).toBeNull();
    await expect(chrome.storage.sync.get("a")).rejects.toThrow("disk full");
  });

  test("runtime.getURL, getManifest and id", () => {
    const chrome = loadShim(fakeHost());
    expect(chrome.runtime.getURL("images/x.png")).toBe(BASE + "images/x.png");
    expect(chrome.runtime.getURL("/options.html")).toBe(BASE + "options.html");
    expect(chrome.runtime.getManifest()).toEqual({
      name: "WikiTree Browser Extension",
      version: "2.20.2.6",
      manifest_version: 3,
    });
    expect(chrome.runtime.id).toBe("wbe-webview");
  });

  test("runtime.sendMessage: background-only actions fail at once, never hang", async () => {
    const chrome = loadShim(fakeHost());
    const error = await new Promise((resolve) =>
      chrome.runtime.sendMessage({ action: "chatWithAI", prompt: "hi" }, () => resolve(chrome.runtime.lastError?.message))
    );
    expect(error).toBe("Not available in the WikiTree app");
    await expect(chrome.runtime.sendMessage({ action: "duplicatesRead" })).rejects.toThrow(
      "Not available in the WikiTree app"
    );
  });

  test("runtime.sendMessage: openWbeOptions asks the host", async () => {
    const host = fakeHost();
    const chrome = loadShim(host);
    await chrome.runtime.sendMessage({ action: "openWbeOptions" });
    expect(host.calls.map((call) => call.method)).toEqual(["openOptions"]);
  });

  test("runtime.sendMessage: the clipboard is handled in the page", async () => {
    const chrome = loadShim(fakeHost());
    const writeText = jest.fn(() => Promise.resolve());
    const readText = jest.fn(() => Promise.resolve("copied"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText, readText }, configurable: true });
    expect(await chrome.runtime.sendMessage({ action: "copyToClipboard", text: "[[Example-1]]" })).toEqual({
      success: true,
    });
    expect(writeText).toHaveBeenCalledWith("[[Example-1]]");
    expect(await chrome.runtime.sendMessage({ action: "readFromClipboard" })).toEqual({ success: true, text: "copied" });
    delete navigator.clipboard;
  });

  test("tabs.sendMessage and the host's message events reach onMessage listeners, with sendResponse", async () => {
    const host = fakeHost();
    const chrome = loadShim(host);
    const received = [];
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      received.push(message);
      if (message.action === "later") {
        setTimeout(() => sendResponse({ done: true }), 1);
        return true;
      }
      if (message.action === "now") sendResponse({ now: true });
      return undefined;
    });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    expect(tab.id).toBe(0);
    expect(await chrome.tabs.sendMessage(tab.id, { action: "later" })).toEqual({ done: true });
    const now = await new Promise((resolve) => chrome.tabs.sendMessage(0, { action: "now" }, resolve));
    expect(now).toEqual({ now: true });
    expect(await chrome.tabs.sendMessage(0, { action: "nobody" })).toBeUndefined();

    host.event({ type: "message", message: { action: "showNotes" } });
    expect(received.map((message) => message.action)).toEqual(["later", "now", "nobody", "showNotes"]);
  });

  test("tabs.create opens the URL through the host", async () => {
    const host = fakeHost();
    const chrome = loadShim(host);
    await chrome.tabs.create({ url: "https://www.wikitree.com/wiki/Example-1" });
    expect(host.calls).toEqual([{ method: "openUrl", args: { url: "https://www.wikitree.com/wiki/Example-1" } }]);
  });

  test("permissions are never granted, and contextMenus are no-ops", async () => {
    const chrome = loadShim(fakeHost());
    expect(await chrome.permissions.contains({ origins: ["http://localhost/*"] })).toBe(false);
    expect(await new Promise((resolve) => chrome.permissions.request({ origins: [] }, resolve))).toBe(false);
    expect(() => chrome.permissions.onAdded.addListener(() => {})).not.toThrow();
    expect(() => chrome.contextMenus.create({ id: "x", title: "X" })).not.toThrow();
  });

  test("with no app host, a test host keeps storage in localStorage under wbe:", async () => {
    localStorage.clear();
    const chrome = loadShim(null);
    expect(globalThis.__wbeHost.platform).toBe("test");
    expect(chrome.runtime.getURL("x.js")).toBe(BASE + "x.js");
    await chrome.storage.sync.set({ darkMode: true });
    expect(localStorage.getItem("wbe:sync:darkMode")).toBe("true");
    expect(await chrome.storage.sync.get("darkMode")).toEqual({ darkMode: true });
    await chrome.storage.sync.clear();
    expect(localStorage.length).toBe(0);
  });

  test("a host call that is never answered rejects in the end instead of hanging", async () => {
    jest.useFakeTimers();
    try {
      const chrome = loadShim({ platform: "test", base: BASE, send() {} });
      const result = chrome.storage.local.get("a");
      await jest.advanceTimersByTimeAsync(30001);
      await expect(result).rejects.toThrow("didn't answer storage.get");
    } finally {
      jest.useRealTimers();
    }
  });
});
