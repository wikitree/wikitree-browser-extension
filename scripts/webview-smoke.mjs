#!/usr/bin/env node
// A desktop smoke test of the WikiTree Tree Apps mobile app build (npm run build-webview), with no app.
//
// It opens Chrome (or Playwright's Chromium) with its own persistent profile, so no installed extension runs, and
// does what the app will do:
// - answers https://www.wikitree.com/__wbe/** from dist-webview/, as Android's WebViewAssetLoader will;
// - injects wbe-early.js and wbe-webview.js into every wikitree.com page at document start;
// - leaves the page's Content Security Policy on (bypassCSP: false), to show whether it blocks anything.
// No window.__wbeHost is installed, so the stand-in uses its test host (storage in localStorage under "wbe:").
//
// For each page it reports console errors, failed requests to the base URL, CSP violations and whether WBE's UI
// appeared, and saves a screenshot in dist-webview/smoke/. Then it turns on Dark Mode in options.html (same origin,
// so same localStorage), reloads the profile, and checks it took effect.
//
//   node scripts/webview-smoke.mjs --login          opens WikiTree's login page; log in yourself, then close the window
//   node scripts/webview-smoke.mjs                  runs the checks (edit pages need the login)
//   options: --profile <WikiTreeID>  (default: the logged-in member, else Churchill-4)
//            --chromium              use Playwright's own Chromium instead of the installed Chrome
//            --headless
//
// It never fills in a login form and never saves an edit page.
import { chromium } from "playwright";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const distDir = join(root, "dist-webview");
const smokeDir = join(distDir, "smoke");
const profileDir = join(root, "node_modules", ".cache", "wbe-webview-smoke-profile");
const SITE = "https://www.wikitree.com";
const BASE = `${SITE}/__wbe/`;
const LOGIN_URL = `${SITE}/index.php?title=Special:Userlogin`;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const TYPES = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function launch() {
  mkdirSync(profileDir, { recursive: true });
  return chromium.launchPersistentContext(profileDir, {
    channel: flag("--chromium") ? undefined : "chrome",
    headless: flag("--headless"),
    bypassCSP: false,
    viewport: { width: 412, height: 915 }, // a typical Android phone
    deviceScaleFactor: 2,
    isMobile: false, // (Chrome's desktop channel can't emulate isMobile; the width is what WBE's layout sees)
    args: ["--disable-extensions"],
  });
}

if (flag("--login")) {
  const context = await launch();
  const page = context.pages()[0] || (await context.newPage());
  await page.goto(LOGIN_URL);
  console.log("Log in to WikiTree in the browser window, then close the window.");
  // (closing the last window doesn't quit Chrome on a Mac, so wait for the windows, then close the browser, which
  // also saves the login cookies to the profile)
  await new Promise((resolve) => {
    const check = () => context.pages().length === 0 && resolve();
    context.on("page", (opened) => opened.on("close", check));
    for (const open of context.pages()) open.on("close", check);
    context.on("close", resolve);
  });
  await context.close().catch(() => {});
  process.exit(0);
}

if (!existsSync(join(distDir, "wbe-webview.js"))) {
  console.error("dist-webview/wbe-webview.js is missing: run npm run build-webview first.");
  process.exit(1);
}

// What the app injects at document start: the early part everywhere, the main bundle (which waits for the page and
// stays out of frames itself). Not into the WBE pages served from the base URL: options.html loads its own bundle.
const early = readFileSync(join(distDir, "wbe-early.js"), "utf8");
const main = readFileSync(join(distDir, "wbe-webview.js"), "utf8");
const injected = `
(() => {
  if (!/(^|\\.)wikitree\\.com$/.test(location.hostname) || location.pathname.startsWith("/__wbe/")) return;
  window.__wbeSmoke = { csp: [] };
  document.addEventListener("securitypolicyviolation", (e) => {
    window.__wbeSmoke.csp.push({ directive: e.violatedDirective, blocked: e.blockedURI, source: e.sourceFile, line: e.lineNumber });
  }, true);
  // (separate, as the app injects them: one failing mustn't stop the other)
  try {
    ${early}
  } catch (error) {
    console.error("wbe-early.js threw", error);
  }
  try {
    ${main}
  } catch (error) {
    console.error("wbe-webview.js threw", error);
  }
})();`;

const context = await launch();
mkdirSync(smokeDir, { recursive: true });

await context.route(`${BASE}**`, async (route) => {
  const path = decodeURIComponent(new URL(route.request().url()).pathname.slice("/__wbe/".length)) || "options.html";
  const file = normalize(join(distDir, path));
  if (!file.startsWith(distDir + sep) || !existsSync(file)) {
    await route.fulfill({ status: 404, body: "not in dist-webview" });
    return;
  }
  await route.fulfill({
    status: 200,
    body: readFileSync(file),
    headers: { "content-type": TYPES[extname(file)] || "application/octet-stream" },
  });
});
await context.addInitScript(injected);

const page = context.pages()[0] || (await context.newPage());
let log = [];
page.on("console", (message) => {
  if (message.type() === "error" || /Content Security Policy/i.test(message.text())) {
    log.push({ kind: message.type(), text: message.text().slice(0, 400) });
  }
});
page.on("pageerror", (error) => log.push({ kind: "pageerror", text: String(error).slice(0, 400) }));
page.on("requestfailed", (request) => {
  if (request.url().startsWith(BASE)) log.push({ kind: "requestfailed", text: `${request.url()} ${request.failure()?.errorText}` });
});
page.on("response", (response) => {
  if (response.url().startsWith(BASE) && response.status() >= 400) {
    log.push({ kind: "http", text: `${response.status()} ${response.url()}` });
  }
});

async function visit(name, url, wait = 6000) {
  log = [];
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(wait);
  const state = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    wbeLoaded: document.documentElement.hasAttribute("data-wbe-content-loaded"),
    webviewApp: window.wbeIsWebviewApp === true,
    host: window.__wbeHost?.platform,
    buttonContainer: document.querySelectorAll(".wbe-button-container, .wbe-button-container2").length,
    editToolbarExt: document.querySelectorAll("#editToolbarExt").length,
    wbeElements: document.querySelectorAll("[class*='wbe'], [id*='wbe']").length,
    darkMode: document.body?.classList.contains("darkMode") || false,
    csp: window.__wbeSmoke?.csp || [],
    loggedIn: Boolean(document.querySelector("a[href*='Special:Userlogout'], a[href*='Special:UserLogout']")),
  }));
  const screenshot = join(smokeDir, `${name}.png`);
  await page.screenshot({ path: screenshot });
  const result = { name, status: response?.status(), ...state, problems: log, screenshot: `dist-webview/smoke/${name}.png` };
  const ok = state.wbeLoaded && (state.buttonContainer || state.editToolbarExt || state.wbeElements);
  console.log(
    `${ok ? "OK  " : "FAIL"} ${name}: HTTP ${result.status}, WBE ${state.wbeLoaded ? "loaded" : "NOT loaded"}, ` +
      `${state.wbeElements} WBE elements, toolbar ${state.editToolbarExt}, buttons ${state.buttonContainer}, ` +
      `${log.length} problem(s), ${state.csp.length} CSP violation(s)`
  );
  for (const problem of log) console.log(`       ${problem.kind}: ${problem.text}`);
  for (const violation of state.csp) console.log(`       CSP ${violation.directive}: ${violation.blocked}`);
  return result;
}


// options.html fills its checkboxes from storage after it loads: wait until Dark Mode's matches what's saved.
async function darkModeToggleReady() {
  await page.waitForSelector("#toggle_darkMode", { state: "attached", timeout: 20000 });
  await page.waitForFunction(
    () => document.getElementById("toggle_darkMode").checked === (localStorage.getItem("wbe:sync:darkMode") === "true"),
    null,
    { timeout: 10000 }
  );
  await page.waitForTimeout(500);
}

const results = [];

// The logged-in member's ID, from the page's own links
await page.goto(`${SITE}/wiki/Special:MyPage`, { waitUntil: "domcontentloaded" }).catch(() => {});
const myId = /\/wiki\/([A-Z][^/?#:]*-\d+)$/.exec(page.url())?.[1];
const profileId = option("--profile") || myId || "Churchill-4";
console.log(myId ? `Logged in as ${myId}.` : "Not logged in: edit pages will be skipped (run with --login first).");

results.push(await visit("profile", `${SITE}/wiki/${profileId}`));

if (myId) {
  const links = await page.evaluate(() => ({
    edit: document.querySelector("a[href*='Special:EditPerson']")?.href,
    add: document.querySelector("a[href*='Special:EditFamily']")?.href,
  }));
  if (links.edit) results.push(await visit("edit", links.edit));
  else console.log("SKIP edit: no Edit link on the profile");
  if (links.add) results.push(await visit("add-person", links.add));
  else console.log("SKIP add-person: no Add Person link on the profile");
}

// Options page: same origin as the profile, so the test host's localStorage is shared. Turn Dark Mode on.
log = [];
await page.goto(`${BASE}options.html`, { waitUntil: "domcontentloaded" });
await darkModeToggleReady();
const optionsState = await page.evaluate(() => ({
  features: document.querySelectorAll(".section.feature").length,
  hasGenie: Boolean(document.getElementById("chat")),
  hasDuplicates: Boolean(document.getElementById("duplicates")),
  hasGoldStandard: Boolean(document.getElementById("goldStandard")),
  aiButtons: document.querySelectorAll(".ai-settings-button").length,
  darkModeWasOn: document.getElementById("toggle_darkMode").checked,
}));
await page.screenshot({ path: join(smokeDir, "options.png") });
if (!optionsState.darkModeWasOn) await page.locator("label[for='toggle_darkMode']").click();
await page.waitForTimeout(1000);
const saved = await page.evaluate(() => localStorage.getItem("wbe:sync:darkMode"));
console.log(
  `${optionsState.features > 0 && !optionsState.hasGenie ? "OK  " : "FAIL"} options: ${optionsState.features} features, ` +
    `Genie ${optionsState.hasGenie ? "shown" : "hidden"}, Duplicates ${optionsState.hasDuplicates ? "shown" : "hidden"}, ` +
    `Gold Standard ${optionsState.hasGoldStandard ? "shown" : "hidden"}, ${optionsState.aiButtons} AI Settings buttons, ` +
    `darkMode saved as ${saved}, ${log.length} problem(s)`
);
for (const problem of log) console.log(`       ${problem.kind}: ${problem.text}`);
results.push({ name: "options", ...optionsState, darkModeSaved: saved, problems: log });

const dark = await visit("profile-dark", `${SITE}/wiki/${profileId}`);
console.log(`${dark.darkMode ? "OK  " : "FAIL"} the Dark Mode setting from options.html ${dark.darkMode ? "took effect" : "did NOT take effect"}`);
results.push(dark);

// Leave the profile as it was: Dark Mode back off
await page.goto(`${BASE}options.html`, { waitUntil: "domcontentloaded" });
await darkModeToggleReady();
if (!optionsState.darkModeWasOn && (await page.evaluate(() => document.getElementById("toggle_darkMode").checked))) {
  await page.locator("label[for='toggle_darkMode']").click();
  await page.waitForTimeout(500);
}

writeFileSync(join(smokeDir, "report.json"), JSON.stringify(results, null, 2) + "\n");
console.log("Report: dist-webview/smoke/report.json");
await context.close();
