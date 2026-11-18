#!/usr/bin/env node
// Checks that the WikiTree Tree Apps mobile app's stand-in for the extension APIs (src/platform/webview/shim.js)
// covers every chrome.* and browser.* API that src/ uses, and writes the list into dist-webview/webview.json.
// Runs after webpack in `npm run build-webview`, so a change that starts using a new API fails the build (and the
// pull request's test workflow) until the stand-in learns it.
//
// It runs the stand-in in a sandbox and looks each API up on the object it builds, so what's checked is what the
// stand-in really provides. Static scanning can't see calls made through an alias (`const area = chrome.storage.local;
// area.get(...)`); those still need the API the alias came from, which is checked.
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const srcDir = join(root, "src");
const shimFile = join(srcDir, "platform", "webview", "shim.js");
const webviewJson = join(root, "dist-webview", "webview.json");

const SKIP_DIRS = new Set(["node_modules", "__tests__", "__fixtures__", "testing"]);
const SKIP_PATHS = [join(srcDir, "platform", "webview") + sep];

function jsFilesIn(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !SKIP_PATHS.some((skip) => (full + sep).startsWith(skip))) out.push(...jsFilesIn(full));
    } else if (entry.isFile() && entry.name.endsWith(".js") && !entry.name.endsWith(".test.js")) {
      out.push(full);
    }
  }
  return out;
}

// Blanks out comments, keeping line breaks so line numbers still match. Rough (it doesn't parse strings), but a
// "//" inside a string only hides the rest of that one line.
function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(/(^|[^:\\"'`])\/\/.*$/gm, "$1");
}

// chrome.a, chrome.a.b, chrome.a.b.c (optional chaining allowed), but not something.chrome.a or something.browser.a
// (navigatorDetect.browser.name is WBE's own object).
const API_USE = /(?<![\w$.])(chrome|browser)\s*\??\.\s*([A-Za-z_$][\w$]*)(?:\s*\??\.\s*([A-Za-z_$][\w$]*))?(?:\s*\??\.\s*([A-Za-z_$][\w$]*))?/g;

function findApiUses() {
  const uses = new Map(); // "storage.sync.get" -> [ "src/...:12", ... ]
  for (const file of jsFilesIn(srcDir)) {
    const lines = withoutComments(readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, index) => {
      for (const match of line.matchAll(API_USE)) {
        const path = match.slice(2).filter(Boolean).join(".");
        const where = `${relative(root, file).split(sep).join("/")}:${index + 1}`;
        if (!uses.has(path)) uses.set(path, []);
        uses.get(path).push(where);
      }
    });
  }
  return uses;
}

function loadShim() {
  const context = {
    WBE_WEBVIEW: true,
    WBE_WEBVIEW_MANIFEST: { name: "WikiTree Browser Extension", version: "0", manifest_version: 3 },
    __webpack_public_path__: "",
    console,
    setTimeout,
    clearTimeout,
    URL,
    location: { href: "https://www.wikitree.com/wiki/Help:WikiTree_Browser_Extension" },
    document: { title: "" },
    navigator: {},
    localStorage: { length: 0, key: () => null, getItem: () => null, setItem() {}, removeItem() {} },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(readFileSync(shimFile, "utf8"), context, { filename: "shim.js" });
  if (!context.chrome || context.browser !== context.chrome) throw new Error("shim.js didn't define chrome and browser");
  return context.chrome;
}

// How much of the path the stand-in provides: the whole path, or the part up to a value that isn't an object
// (runtime.lastError.message stops at lastError, which is null except during a failed callback). null = missing.
function coveredPath(chrome, path) {
  const parts = path.split(".");
  let value = chrome;
  for (let i = 0; i < parts.length; i++) {
    if (value === null || value === undefined || (typeof value !== "object" && typeof value !== "function")) {
      return parts.slice(0, i).join(".");
    }
    if (!(parts[i] in value)) return null;
    value = value[parts[i]];
  }
  return path;
}

const chrome = loadShim();
const uses = findApiUses();
const covered = new Set();
const missing = [];
for (const [path, where] of [...uses].sort(([a], [b]) => a.localeCompare(b))) {
  const coveredAs = coveredPath(chrome, path);
  if (coveredAs === null) missing.push({ path, where });
  else covered.add(coveredAs);
}

if (missing.length) {
  console.error("check-webview-shim: the mobile app's stand-in (src/platform/webview/shim.js) doesn't cover:");
  for (const { path, where } of missing) {
    console.error(`  chrome.${path}  (${where.slice(0, 3).join(", ")}${where.length > 3 ? `, +${where.length - 3} more` : ""})`);
  }
  console.error("Add it to the stand-in (or, if it needs background.js, leave the feature out in the app build).");
  process.exit(1);
}

const apis = [...covered].sort();
if (existsSync(webviewJson)) {
  const json = JSON.parse(readFileSync(webviewJson, "utf8"));
  json.chromeApis = apis;
  writeFileSync(webviewJson, JSON.stringify(json, null, 2) + "\n");
}
console.log(`check-webview-shim: the stand-in covers all ${apis.length} chrome.* APIs used in src/.`);
