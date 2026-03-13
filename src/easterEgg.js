import { isProfilePage } from "./core/pageType";

const CONFIG_URL = "https://wikitreebee.com/easter-egg/config.json";
const CODE_URL = "https://wikitreebee.com/easter-egg/serve.php";
const CACHE_KEY = "easterEggConfig";
const EGG_ID = "wt-easter-egg";
const MODAL_ID = "wt-egg-modal";
const STYLES_ID = "wt-easter-egg-styles";
const DEBUG_PARAM = "wbeEggDebug";

function isDebugEnabled() {
  return true;
}

function eggLog(message, details) {
  if (!isDebugEnabled()) return;
  if (typeof details === "undefined") {
    console.log(`[WBE Easter Egg] ${message}`);
    return;
  }
  console.log(`[WBE Easter Egg] ${message}`, details);
}

function safeJsonParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function getEggConfig() {
  const cached = safeJsonParse(sessionStorage.getItem(CACHE_KEY));
  if (cached) {
    eggLog("Using cached config", cached);
    return cached;
  }

  try {
    const response = await fetch(CONFIG_URL);
    if (!response.ok) {
      eggLog("Config fetch failed", { status: response.status, statusText: response.statusText });
      return null;
    }

    const config = await response.json();
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(config));
    eggLog("Fetched config", config);
    return config;
  } catch {
    eggLog("Config fetch threw error");
    return null;
  }
}

function getNormalizedList(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => String(value || "").trim()).filter(Boolean);
}

function getProfileManagers() {
  const dataAside = document.querySelector("aside#Profile-Data");
  if (!dataAside) return [];

  const managerLabel = Array.from(dataAside.querySelectorAll("span")).find(
    (element) => (element.textContent || "").trim().toLowerCase() === "profile managers"
  );
  if (!managerLabel) return [];

  const row = managerLabel.closest("p");
  if (!row) return [];

  return Array.from(row.querySelectorAll('a[href^="/wiki/"]'))
    .map((link) => (link.textContent || "").trim())
    .filter(Boolean);
}

function getProfileCategories() {
  return Array.from(document.querySelectorAll('p#Categories a[href*="/wiki/Category:"]'))
    .map((link) => (link.textContent || "").trim())
    .filter(Boolean);
}

function findFirstMatch(candidates, selected) {
  const selectedSet = new Set(selected);
  return candidates.find((value) => selectedSet.has(value)) || "";
}

function pageMatchesConfig(config) {
  const managersOnPage = getProfileManagers();
  const categoriesOnPage = getProfileCategories();
  const watchedManagers = getNormalizedList(config.manager_projects);
  const watchedCategories = getNormalizedList(config.categories);

  const matchedManager = findFirstMatch(watchedManagers, managersOnPage);
  const matchedCategory = findFirstMatch(watchedCategories, categoriesOnPage);
  const hasManager = Boolean(matchedManager);
  const hasCategory = Boolean(matchedCategory);
  const mode = String(config.match_mode || "manager_or_category");

  if (mode === "manager_only") {
    const result = { mode, matchedManager, matchedCategory, matches: hasManager };
    eggLog("Match evaluation", {
      mode,
      managersOnPage,
      categoriesOnPage,
      watchedManagers,
      watchedCategories,
      result,
    });
    return result;
  }
  if (mode === "category_only") {
    const result = { mode, matchedManager, matchedCategory, matches: hasCategory };
    eggLog("Match evaluation", {
      mode,
      managersOnPage,
      categoriesOnPage,
      watchedManagers,
      watchedCategories,
      result,
    });
    return result;
  }
  if (mode === "manager_and_category") {
    const result = { mode, matchedManager, matchedCategory, matches: hasManager && hasCategory };
    eggLog("Match evaluation", {
      mode,
      managersOnPage,
      categoriesOnPage,
      watchedManagers,
      watchedCategories,
      result,
    });
    return result;
  }
  const result = { mode: "manager_or_category", matchedManager, matchedCategory, matches: hasManager || hasCategory };
  eggLog("Match evaluation", {
    mode: "manager_or_category",
    managersOnPage,
    categoriesOnPage,
    watchedManagers,
    watchedCategories,
    result,
  });
  return result;
}

function rollForEgg(percentage) {
  const value = Number(percentage);
  if (!Number.isFinite(value)) {
    eggLog("Roll skipped due to invalid percentage", { percentage });
    return false;
  }
  const clamped = Math.max(0, Math.min(100, value));
  const roll = Math.random() * 100;
  const passed = roll < clamped;
  eggLog("Roll result", { percentage: value, clamped, roll, passed });
  return passed;
}

async function fetchEggCode({ pageUrl, matchMode, matchedManager, matchedCategory }) {
  const params = new URLSearchParams({ page: pageUrl });
  if (matchMode) params.set("match_mode", matchMode);
  if (matchedManager) params.set("matched_manager", matchedManager);
  if (matchedCategory) params.set("matched_category", matchedCategory);

  try {
    const response = await fetch(`${CODE_URL}?${params.toString()}`);
    if (!response.ok) {
      eggLog("Code fetch failed", { status: response.status, statusText: response.statusText });
      return null;
    }

    const payload = await response.json();
    const code = String(payload?.code || "").trim();
    eggLog("Code fetch response", payload);
    return code || null;
  } catch {
    eggLog("Code fetch threw error");
    return null;
  }
}

function ensureEggStyles() {
  if (document.getElementById(STYLES_ID)) return;

  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = `
    #${EGG_ID} {
      cursor: pointer;
      vertical-align: middle;
      margin: 0 2px;
      display: inline-block;
      animation: wtEggPulse 2.8s ease-in-out infinite;
    }

    @keyframes wtEggPulse {
      0%, 100% { transform: translateY(0) scale(1); opacity: 0.82; }
      45% { transform: translateY(-0.7px) scale(1.03); opacity: 0.97; }
    }
  `;
  document.head.append(style);
}

function buildEggSvg() {
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  const defs = document.createElementNS(svgNs, "defs");
  const gradient = document.createElementNS(svgNs, "linearGradient");
  const stopA = document.createElementNS(svgNs, "stop");
  const stopB = document.createElementNS(svgNs, "stop");
  const baseEgg = document.createElementNS(svgNs, "ellipse");
  const stripeEgg = document.createElementNS(svgNs, "ellipse");

  const gradientId = `wtEggStripe-${Math.random().toString(36).slice(2, 8)}`;

  svg.setAttribute("id", EGG_ID);
  svg.setAttribute("xmlns", svgNs);
  svg.setAttribute("viewBox", "0 0 24 30");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "22");
  svg.setAttribute("title", "Something hidden here...");
  svg.setAttribute("aria-label", "Hidden Easter egg");

  gradient.setAttribute("id", gradientId);
  gradient.setAttribute("x1", "0");
  gradient.setAttribute("y1", "0");
  gradient.setAttribute("x2", "0");
  gradient.setAttribute("y2", "1");

  stopA.setAttribute("offset", "40%");
  stopA.setAttribute("stop-color", "#e87c3e");
  stopB.setAttribute("offset", "60%");
  stopB.setAttribute("stop-color", "transparent");

  baseEgg.setAttribute("cx", "12");
  baseEgg.setAttribute("cy", "16");
  baseEgg.setAttribute("rx", "10");
  baseEgg.setAttribute("ry", "13");
  baseEgg.setAttribute("fill", "#f4c542");
  baseEgg.setAttribute("stroke", "#cc9900");
  baseEgg.setAttribute("stroke-width", "1.2");

  stripeEgg.setAttribute("cx", "12");
  stripeEgg.setAttribute("cy", "16");
  stripeEgg.setAttribute("rx", "10");
  stripeEgg.setAttribute("ry", "13");
  stripeEgg.setAttribute("fill", `url(#${gradientId})`);
  stripeEgg.setAttribute("opacity", "0.5");

  gradient.append(stopA, stopB);
  defs.append(gradient);
  svg.append(defs, baseEgg, stripeEgg);
  return svg;
}

function getCandidateParagraphs() {
  const selectors = [
    "#bioText p",
    ".x-profile-biography p",
    ".WikiTree-Profile p",
    "#Biography p",
    "#view-container p",
    "main p",
  ];

  const allParagraphs = Array.from(document.querySelectorAll(selectors.join(",")))
    .filter((paragraph) => paragraph && !paragraph.closest("#" + MODAL_ID))
    .filter((paragraph) => !paragraph.closest("aside, nav, footer, #comments, .comment, .x-sidebar"))
    .filter((paragraph) => (paragraph.textContent || "").trim().split(/\s+/).length > 6);

  if (!allParagraphs.length) {
    return [];
  }

  // Hide in later narrative paragraphs so discovery feels organic and less immediate.
  const laterStartIndex = Math.floor(allParagraphs.length * 0.55);
  const laterParagraphs = allParagraphs.slice(laterStartIndex);
  return laterParagraphs.length ? laterParagraphs : allParagraphs;
}

function hideEggInPage() {
  if (document.getElementById(EGG_ID)) {
    eggLog("Egg already exists on page");
    return true;
  }

  const paragraphs = getCandidateParagraphs();
  eggLog("Candidate paragraph count", { count: paragraphs.length });
  if (!paragraphs.length) {
    eggLog("No candidate paragraphs found for egg placement");
    return false;
  }

  const target = paragraphs[Math.floor(Math.random() * paragraphs.length)];
  const textNodes = Array.from(target.childNodes).filter(
    (node) => node.nodeType === Node.TEXT_NODE && (node.textContent || "").trim().length > 16
  );
  if (!textNodes.length) {
    // Fallback: append egg to end of paragraph when direct text nodes are fragmented by markup.
    target.append(document.createTextNode(" "));
    target.append(buildEggSvg());
    eggLog("Egg inserted with fallback append", { paragraphText: (target.textContent || "").slice(0, 140) });
    return true;
  }

  const chosenText = textNodes[Math.floor(Math.random() * textNodes.length)];
  const text = chosenText.textContent || "";
  const words = text.match(/\S+/g) || [];
  if (words.length < 3) {
    eggLog("Chosen text node had too few words", { text });
    return false;
  }

  const insertAtWordIndex = Math.max(1, Math.floor(Math.random() * (words.length - 1)));
  let runningWordCount = 0;
  let splitOffset = text.length;
  const matcher = /\S+/g;
  let found;
  while ((found = matcher.exec(text))) {
    runningWordCount += 1;
    if (runningWordCount === insertAtWordIndex) {
      splitOffset = found.index + found[0].length;
      break;
    }
  }

  const before = text.slice(0, splitOffset);
  const after = text.slice(splitOffset);

  const fragment = document.createDocumentFragment();
  fragment.append(document.createTextNode(before));
  fragment.append(document.createTextNode(" "));
  fragment.append(buildEggSvg());
  fragment.append(document.createTextNode(after.startsWith(" ") ? "" : " "));
  fragment.append(document.createTextNode(after));

  chosenText.parentNode?.insertBefore(fragment, chosenText);
  chosenText.remove();
  eggLog("Egg inserted", { paragraphText: (target.textContent || "").slice(0, 140) });
  return true;
}

function closeEggModal() {
  document.getElementById(MODAL_ID)?.remove();
}

function appendTextWithLinks(element, text) {
  const value = String(text || "");
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const exactUrlPattern = /^https?:\/\/[^\s]+$/;
  const parts = value.split(urlPattern);

  parts.forEach((part) => {
    if (!part) return;

    if (exactUrlPattern.test(part)) {
      const link = document.createElement("a");
      link.href = part;
      link.textContent = part;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      element.append(link);
      return;
    }

    element.append(document.createTextNode(part));
  });
}

function getModalText(config) {
  return {
    title: String(config?.modal_title || "").trim() || "You found an Easter egg!",
    intro: String(config?.modal_intro || "").trim() || "Your unique code is:",
    note: String(config?.modal_note || "").trim() || "Write it down - this code is yours. Happy Easter!",
    closeText: String(config?.modal_close_text || "").trim() || "Close",
  };
}

function showEggModal(code, config) {
  eggLog("Opening egg modal", { code, config });
  closeEggModal();
  const modalText = getModalText(config);

  const backdrop = document.createElement("div");
  backdrop.id = MODAL_ID;
  backdrop.setAttribute(
    "style",
    "position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;"
  );

  const panel = document.createElement("div");
  panel.setAttribute(
    "style",
    "background:#fff;border-radius:12px;padding:32px 40px;max-width:420px;width:100%;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.3);"
  );

  const icon = document.createElement("div");
  icon.textContent = "🥚";
  icon.style.fontSize = "60px";

  const heading = document.createElement("h2");
  heading.setAttribute("style", "color:#7b3f00;margin:12px 0 6px;");
  appendTextWithLinks(heading, modalText.title);

  const intro = document.createElement("p");
  intro.setAttribute("style", "color:#555;margin:0 0 16px;");
  appendTextWithLinks(intro, modalText.intro);

  const value = document.createElement("p");
  value.textContent = code;
  value.setAttribute("style", "font-size:22px;font-weight:bold;letter-spacing:1px;color:#a0522d;margin:0;");

  const note = document.createElement("p");
  note.setAttribute("style", "font-size:13px;color:#888;margin:12px 0 20px;");
  appendTextWithLinks(note, modalText.note);

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = modalText.closeText;
  close.setAttribute(
    "style",
    "padding:9px 24px;background:#7b3f00;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px;"
  );
  close.addEventListener("click", closeEggModal);

  panel.append(icon, heading, intro, value, note, close);
  backdrop.append(panel);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeEggModal();
  });

  document.body.append(backdrop);
}

function attachEggHandler(code, config) {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(`#${EGG_ID}`)) {
      showEggModal(code, config);
    }
  });
}

function isInActiveWindow(config) {
  const now = new Date();
  const start = new Date(config.start);
  const end = new Date(config.end);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    eggLog("Invalid date window in config", { start: config.start, end: config.end });
    return false;
  }

  const active = now >= start && now <= end;
  eggLog("Date window check", { now: now.toISOString(), start: start.toISOString(), end: end.toISOString(), active });
  return active;
}

async function initEasterEgg() {
  eggLog("Init start", { href: window.location.href });
  if (!isProfilePage) {
    eggLog("Exit: not a profile page");
    return;
  }
  if (!window.location.hostname.endsWith("wikitree.com")) {
    eggLog("Exit: unsupported hostname", window.location.hostname);
    return;
  }

  const config = await getEggConfig();
  if (!config?.active) {
    eggLog("Exit: config missing or inactive", config);
    return;
  }
  if (!isInActiveWindow(config)) {
    eggLog("Exit: outside active date window");
    return;
  }

  const match = pageMatchesConfig(config);
  if (!match.matches) {
    eggLog("Exit: page did not match manager/category rules", match);
    return;
  }
  if (!rollForEgg(config.percentage)) {
    eggLog("Exit: roll did not pass");
    return;
  }

  const code = await fetchEggCode({
    pageUrl: window.location.href,
    matchMode: match.mode,
    matchedManager: match.matchedManager,
    matchedCategory: match.matchedCategory,
  });
  if (!code) {
    eggLog("Exit: no code returned from server");
    return;
  }

  ensureEggStyles();
  if (!hideEggInPage()) {
    eggLog("Exit: could not place egg in page");
    return;
  }

  attachEggHandler(code, config);
  eggLog("Init complete: egg ready");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEasterEgg, { once: true });
} else {
  initEasterEgg();
}
