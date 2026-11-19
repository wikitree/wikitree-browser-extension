/*
A stand-in for the chrome.* extension APIs WBE uses, for the WikiTree Tree Apps mobile app build (webpack.webview.js).
The app (Android WebView, iOS WKWebView) has no extension runtime: it injects WBE's files into wikitree.com pages
and installs a native "host" object, window.__wbeHost, before they run:

  window.__wbeHost = {
    platform: "android" | "ios" | "test",
    base: "https://www.wikitree.com/__wbe/",   // where the dist-webview files are served; ends with "/"
    send(json) {},                             // the app receives a JSON string: { id, method, args }
    // set here, called by the app:
    reply(id, error, resultJson) {},           // the answer to send(); error is null or a string
    event(json) {},                            // { type: "storageChanged", area, changes } or { type: "message", message }
  };

Host methods called here (the app side matches this list):
  storage.get    { area: "sync" | "local", keys: null | string | string[] }  -> items object
  storage.set    { area, items }                                            -> null
  storage.remove { area, keys }                                             -> null
  storage.clear  { area }                                                   -> null
  openOptions    {}                                                         -> null
  openUrl        { url }                                                    -> null
  net.fetch      { url, method, headers, body }   -> { status, statusText, body }
                 Only for the AI providers' API hosts (ai_requests.js). The app makes the request itself, so there
                 are no CORS limits, and asks the member before anything first goes to a provider. A network
                 failure, a host that isn't allowed or a refusal comes back as an error.

storage.get never receives the default-values form ({ key: default }): that is handled here. The app sends
storageChanged only to the *other* web views; a page's own writes fire chrome.storage.onChanged here.

With no window.__wbeHost (a desktop browser, for testing), a test host keeps storage in localStorage under "wbe:",
and other tabs' writes arrive through the window "storage" event.

Each bundle (wbe-early.js, wbe-webview.js, wbe-options.js) starts with this file, so it may run twice in one page:
the second run reuses the first one's chrome object, so listeners aren't split between two copies.

Plain script, no imports: scripts/check-webview-shim.mjs runs it in a sandbox to check it covers every chrome.* API
that src/ uses.
*/
(function () {
  if (!(typeof WBE_WEBVIEW !== "undefined" && WBE_WEBVIEW)) return;

  const g = globalThis;
  const DEFAULT_BASE = "https://www.wikitree.com/__wbe/";
  const NOT_AVAILABLE = "Not available in the WikiTree app";
  const HOST_TIMEOUT_MS = 30000;
  // (ai_requests.js gives up on an AI after 4½ minutes; this is a little longer, so its message is the one shown)
  const AI_FETCH_TIMEOUT_MS = 285000;

  if (!g.__wbeHost) g.__wbeHost = createTestHost();
  const host = g.__wbeHost;
  const base = String(host.base || DEFAULT_BASE).replace(/\/?$/, "/");

  // Images, fonts and CSS that webpack emits are loaded from the app's base URL (each bundle has its own runtime).
  __webpack_public_path__ = base; // eslint-disable-line no-undef

  if (g.__wbeShim) {
    g.chrome = g.browser = g.__wbeShim;
    return;
  }

  g.wbeIsWebviewApp = true;

  // ---- talking to the host ----

  let nextId = 1;
  const pending = new Map();

  function callHost(method, args, timeoutMs = HOST_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`The WikiTree app didn't answer ${method}`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      try {
        host.send(JSON.stringify({ id, method, args: args || {} }));
      } catch (error) {
        clearTimeout(timer);
        pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  host.reply = function (id, error, resultJson) {
    const call = pending.get(id);
    if (!call) return;
    pending.delete(id);
    clearTimeout(call.timer);
    if (error) {
      call.reject(new Error(String(error)));
      return;
    }
    try {
      call.resolve(resultJson === undefined || resultJson === null || resultJson === "" ? null : JSON.parse(resultJson));
    } catch (parseError) {
      call.reject(parseError);
    }
  };

  host.event = function (json) {
    let event;
    try {
      event = typeof json === "string" ? JSON.parse(json) : json;
    } catch (error) {
      console.warn("WBE: the WikiTree app sent an event that isn't JSON", error);
      return;
    }
    if (event?.type === "storageChanged" && event.changes && Object.keys(event.changes).length) {
      storageChanged.dispatch(event.changes, event.area);
    } else if (event?.type === "message") {
      dispatchMessage(event.message, { id: runtime.id, origin: "app" });
    }
  };

  // ---- shared helpers ----

  let lastError = null;

  // Calls back the chrome way: runtime.lastError is set only while the callback runs.
  function callBack(callback, error, ...results) {
    lastError = error ? { message: error.message || String(error) } : null;
    try {
      callback(...results);
    } catch (callbackError) {
      console.error(callbackError);
    } finally {
      lastError = null;
    }
  }

  // Chrome's "promise or callback" form: with a callback, the promise's answer goes to it and nothing is returned.
  function promiseOrCallback(promise, callback) {
    if (typeof callback !== "function") return promise;
    promise.then(
      (result) => callBack(callback, null, result),
      (error) => callBack(callback, error)
    );
    return undefined;
  }

  function createEvent() {
    const listeners = [];
    return {
      addListener(listener) {
        if (typeof listener === "function" && !listeners.includes(listener)) listeners.push(listener);
      },
      removeListener(listener) {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      },
      hasListener(listener) {
        return listeners.includes(listener);
      },
      hasListeners() {
        return listeners.length > 0;
      },
      dispatch(...args) {
        for (const listener of [...listeners]) {
          try {
            listener(...args);
          } catch (error) {
            console.error(error);
          }
        }
      },
      listeners,
    };
  }

  function noOpEvent() {
    return { addListener() {}, removeListener() {}, hasListener: () => false, hasListeners: () => false };
  }

  const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // ---- chrome.storage ----

  const storageChanged = createEvent();

  function storageArea(area) {
    // A chain, so this page's writes reach the host (and fire onChanged) in the order they were made.
    let queue = Promise.resolve();
    const inOrder = (work) => {
      const result = queue.then(work, work);
      queue = result.catch(() => {});
      return result;
    };

    const read = (keys) => callHost("storage.get", { area, keys }).then((items) => items || {});

    function get(keys, callback) {
      if (typeof keys === "function") {
        callback = keys;
        keys = null;
      }
      let promise;
      if (keys === undefined || keys === null) {
        promise = inOrder(() => read(null));
      } else if (typeof keys === "string" || Array.isArray(keys)) {
        promise = inOrder(() => read(keys));
      } else if (typeof keys === "object") {
        // the default-values form: { key: valueIfMissing }
        const defaults = keys;
        promise = inOrder(() =>
          read(Object.keys(defaults)).then((items) => {
            const result = {};
            for (const key of Object.keys(defaults)) result[key] = key in items ? items[key] : clone(defaults[key]);
            return result;
          })
        );
      } else {
        promise = Promise.reject(new Error("storage.get: keys must be null, a string, an array or an object"));
      }
      return promiseOrCallback(promise, callback);
    }

    function set(items, callback) {
      const values = clone(items || {});
      const promise = inOrder(async () => {
        const keys = Object.keys(values);
        if (!keys.length) return undefined;
        const before = await read(keys);
        await callHost("storage.set", { area, items: values });
        const changes = {};
        for (const key of keys) {
          if (key in before && same(before[key], values[key])) continue;
          changes[key] = key in before ? { oldValue: before[key], newValue: values[key] } : { newValue: values[key] };
        }
        if (Object.keys(changes).length) storageChanged.dispatch(changes, area);
        return undefined;
      });
      return promiseOrCallback(promise, callback);
    }

    function remove(keys, callback) {
      const list = [].concat(keys ?? []);
      const promise = inOrder(async () => {
        if (!list.length) return undefined;
        const before = await read(list);
        await callHost("storage.remove", { area, keys: list });
        const changes = {};
        for (const key of Object.keys(before)) changes[key] = { oldValue: before[key] };
        if (Object.keys(changes).length) storageChanged.dispatch(changes, area);
        return undefined;
      });
      return promiseOrCallback(promise, callback);
    }

    function clear(callback) {
      const promise = inOrder(async () => {
        const before = await read(null);
        await callHost("storage.clear", { area });
        const changes = {};
        for (const key of Object.keys(before)) changes[key] = { oldValue: before[key] };
        if (Object.keys(changes).length) storageChanged.dispatch(changes, area);
        return undefined;
      });
      return promiseOrCallback(promise, callback);
    }

    function getBytesInUse(keys, callback) {
      if (typeof keys === "function") {
        callback = keys;
        keys = null;
      }
      const promise = inOrder(() => read(keys ?? null)).then((items) =>
        Object.entries(items).reduce((total, [key, value]) => total + key.length + JSON.stringify(value).length, 0)
      );
      return promiseOrCallback(promise, callback);
    }

    return { get, set, remove, clear, getBytesInUse, onChanged: noOpEvent() };
  }

  const storage = {
    sync: storageArea("sync"),
    local: storageArea("local"),
    onChanged: {
      addListener: storageChanged.addListener,
      removeListener: storageChanged.removeListener,
      hasListener: storageChanged.hasListener,
      hasListeners: storageChanged.hasListeners,
    },
  };

  // ---- chrome.runtime ----

  const messageListeners = createEvent();

  // Sends a message to this page's runtime.onMessage listeners (from the app, or chrome.tabs.sendMessage), with
  // the sendResponse / return true pattern and Firefox's promise-returning listeners. Resolves with the first
  // response, or undefined when no listener answers.
  function dispatchMessage(message, sender) {
    return new Promise((resolve) => {
      let answered = false;
      let waiting = 0;
      const answer = (response) => {
        if (answered) return;
        answered = true;
        resolve(response);
      };
      for (const listener of [...messageListeners.listeners]) {
        let result;
        try {
          result = listener(message, sender, answer);
        } catch (error) {
          console.error(error);
          continue;
        }
        if (result === true) {
          waiting++;
        } else if (result && typeof result.then === "function") {
          waiting++;
          result.then(answer, (error) => console.error(error));
        }
      }
      if (!waiting) setTimeout(() => answer(undefined), 0);
    });
  }

  async function handleRuntimeMessage(message) {
    switch (message?.action) {
      case "copyToClipboard":
        try {
          await navigator.clipboard.writeText(String(message.text ?? ""));
          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      case "readFromClipboard":
        try {
          return { success: true, text: await navigator.clipboard.readText() };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      case "openWbeOptions":
        await callHost("openOptions", {});
        return undefined;
      // The AI requests, which the extensions' background.js answers: here ai_requests.js runs in the page
      // (content_entry.js sets g.__wbeAi) and sends its requests through the app (hostFetch).
      case "improveBioWithAI":
      case "chatWithAI": {
        const ai = g.__wbeAi;
        if (!ai) throw new Error(NOT_AVAILABLE);
        const handle = message.action === "chatWithAI" ? ai.handleChatWithAIRequest : ai.handleAIRequest;
        return new Promise((resolve) => handle(message, resolve, { tab: thisTab() }));
      }
      default:
        throw new Error(NOT_AVAILABLE);
    }
  }

  // fetch() for ai_requests.js, through the app (net.fetch above). Answers a Response, as fetch does.
  g.__wbeHostFetch = async function hostFetch(url, init = {}) {
    const headers = {};
    new Headers(init.headers || {}).forEach((value, name) => (headers[name] = value));
    const result = await callHost(
      "net.fetch",
      { url: new URL(String(url), location.href).href, method: init.method || "GET", headers, body: init.body ?? null },
      AI_FETCH_TIMEOUT_MS
    );
    return new Response(result?.body ?? "", { status: result?.status || 500, statusText: result?.statusText || "" });
  };

  const manifest = typeof WBE_WEBVIEW_MANIFEST !== "undefined" ? WBE_WEBVIEW_MANIFEST : {};

  const runtime = {
    id: "wbe-webview",
    get lastError() {
      return lastError;
    },
    getURL(path) {
      return base + String(path ?? "").replace(/^\/+/, "");
    },
    getManifest() {
      return {
        name: manifest.name || "WikiTree Browser Extension",
        version: manifest.version || "0",
        manifest_version: 3,
      };
    },
    // runtime.sendMessage(message, callback?) — also (extensionId, message, options?, callback?)
    sendMessage(...args) {
      const callback = typeof args[args.length - 1] === "function" ? args.pop() : undefined;
      if (typeof args[0] === "string" && args.length > 1) args.shift();
      return promiseOrCallback(handleRuntimeMessage(args[0]), callback);
    },
    openOptionsPage(callback) {
      return promiseOrCallback(
        callHost("openOptions", {}).then(() => undefined),
        callback
      );
    },
    onMessage: {
      addListener: messageListeners.addListener,
      removeListener: messageListeners.removeListener,
      hasListener: messageListeners.hasListener,
      hasListeners: messageListeners.hasListeners,
    },
    onInstalled: noOpEvent(),
  };

  // ---- chrome.tabs ----

  const thisTab = () => ({ id: 0, index: 0, active: true, highlighted: true, url: location.href, title: document.title });

  const tabs = {
    query(queryInfo, callback) {
      return promiseOrCallback(Promise.resolve([thisTab()]), callback);
    },
    // (tabId, message, options?, callback?): goes to this page's runtime.onMessage listeners
    sendMessage(tabId, message, ...rest) {
      const callback = typeof rest[rest.length - 1] === "function" ? rest.pop() : undefined;
      const sender = { id: runtime.id, url: location.href };
      return promiseOrCallback(dispatchMessage(message, sender), callback);
    },
    create(createProperties, callback) {
      const url = String(createProperties?.url ?? "");
      const promise = callHost("openUrl", { url: new URL(url, location.href).href }).then(() => ({ ...thisTab(), url }));
      return promiseOrCallback(promise, callback);
    },
  };

  // ---- chrome.permissions: the optional hosts (Ollama, localhost) aren't offered in the app ----

  const permissions = {
    contains(request, callback) {
      return promiseOrCallback(Promise.resolve(false), callback);
    },
    request(request, callback) {
      return promiseOrCallback(Promise.resolve(false), callback);
    },
    onAdded: noOpEvent(),
    onRemoved: noOpEvent(),
  };

  // ---- chrome.contextMenus: there's no right-click menu in the app ----

  const contextMenus = {
    create() {},
    update() {},
    remove() {},
    removeAll() {},
    onClicked: noOpEvent(),
  };

  const chrome = { storage, runtime, tabs, permissions, contextMenus };
  Object.defineProperty(g, "__wbeShim", { value: chrome, configurable: true, writable: false });
  g.chrome = g.browser = chrome;

  // ---- the test host, used when the app hasn't installed one ----

  function createTestHost() {
    const PREFIX = "wbe:";
    const testHost = { platform: "test", base: DEFAULT_BASE };
    const storageKey = (area, key) => `${PREFIX}${area}:${key}`;
    const readItem = (area, key) => {
      const raw = localStorage.getItem(storageKey(area, key));
      return raw === null ? undefined : JSON.parse(raw);
    };
    const keysIn = (area) => {
      const keys = [];
      const prefix = `${PREFIX}${area}:`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) keys.push(key.slice(prefix.length));
      }
      return keys;
    };
    const methods = {
      "storage.get"({ area, keys }) {
        const list = keys === null || keys === undefined ? keysIn(area) : [].concat(keys);
        const items = {};
        for (const key of list) {
          const value = readItem(area, key);
          if (value !== undefined) items[key] = value;
        }
        return items;
      },
      "storage.set"({ area, items }) {
        for (const [key, value] of Object.entries(items)) localStorage.setItem(storageKey(area, key), JSON.stringify(value));
        return null;
      },
      "storage.remove"({ area, keys }) {
        for (const key of [].concat(keys)) localStorage.removeItem(storageKey(area, key));
        return null;
      },
      "storage.clear"({ area }) {
        for (const key of keysIn(area)) localStorage.removeItem(storageKey(area, key));
        return null;
      },
      openOptions() {
        window.open(testHost.base + "options.html", "_blank");
        return null;
      },
      openUrl({ url }) {
        window.open(url, "_blank");
        return null;
      },
    };
    testHost.send = function (json) {
      const { id, method, args } = JSON.parse(json);
      setTimeout(() => {
        try {
          if (!methods[method]) throw new Error(`Unknown host method ${method}`);
          testHost.reply(id, null, JSON.stringify(methods[method](args) ?? null));
        } catch (error) {
          testHost.reply(id, String(error?.message || error), null);
        }
      }, 0);
    };
    // Another tab's write (the options page, say) is this tab's storageChanged event, as the app would send it.
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("storage", (event) => {
        const match = event.key?.match(/^wbe:(sync|local):(.*)$/s);
        if (!match || typeof testHost.event !== "function") return;
        const change = {};
        if (event.oldValue !== null) change.oldValue = JSON.parse(event.oldValue);
        if (event.newValue !== null) change.newValue = JSON.parse(event.newValue);
        testHost.event({ type: "storageChanged", area: match[1], changes: { [match[2]]: change } });
      });
    }
    return testHost;
  }
})();
