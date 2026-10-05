// "Summarize this page" on a Free Space Page got "Please paste the FSP text"
// (Murray, 2026-10-05): the AI was sent only the URL. Genie can see the page it
// sits on, so this reads the page's own text for the AI, like a browser
// assistant. getProfile has no bio for Space pages (yet), none for Help:,
// Project: and other pages, and none for a profile whose privacy hides it, so
// the DOM is the source there.

// What the extension (and WikiTree's own controls) add to the content. None of
// it is page text.
const CLUTTER_SELECTOR = [
  "script",
  "style",
  "noscript",
  "button",
  "input",
  "select",
  "textarea",
  "#toc",
  ".toc",
  ".editsection",
  ".mw-editsection",
  ".toggleOverflowButton",
  ".scissors",
  ".copy--buttons",
  ".filter-row",
  ".sortArrow",
  ".sorttable_sortarrow",
  "[id^='wbe-']",
  "[class^='wbe-']",
  "[class*=' wbe-']",
  "[hidden]",
  // Below the content in the logged-out layout (2026-10-05): comments,
  // memories, ads and the manager/dates footnote (read separately).
  "#Collaboration",
  "#Memories",
  "#comments",
  "aside",
  ".ad",
].join(",");

const CONTENT_SELECTORS = [".x-content", ".page--content", "#content", "main"];
const BLOCK_TAGS = new Set([
  "P",
  "DIV",
  "SECTION",
  "ARTICLE",
  "BLOCKQUOTE",
  "PRE",
  "UL",
  "OL",
  "DL",
  "DT",
  "DD",
  "BR",
  "HR",
  "FIGURE",
  "FIGCAPTION",
  "CENTER",
]);
// Big tables are what make pages long; they shrink first when over budget.
const TABLE_ROW_STEPS = [40, 15, 5];
export const PAGE_TEXT_BUDGET = 16000;

// Questions about the page itself: summaries, what it says, what's on it.
// Kept to forms that name the page, so "add this page to my watchlist" or a
// connection question still go to their own tools.
const PAGE = String.raw`(?:this|the|current|the\s+current)\s+(?:(?:free[\s-]?space|space|category|help|project|wiki)\s+)?(?:page|fsp|article)`;
const PAGE_QUESTION_RE = new RegExp(
  String.raw`^(?:please\s+)?(?:can\s+you\s+|could\s+you\s+)?(?:` +
    String.raw`(?:summari[sz]e|sum\s+up|describe|explain|outline|analy[sz]e|review|proofread|critique|translate|simplify)\s+${PAGE}\b` +
    String.raw`|(?:give\s+me\s+|write\s+|make\s+)?(?:a\s+|an\s+)?(?:short\s+|brief\s+|quick\s+)?(?:summary|overview|tl;?dr|outline|precis|synopsis|timeline)\s+(?:of|for)\s+${PAGE}\b` +
    String.raw`|tl;?dr\b` +
    String.raw`|(?:what|who)(?:['’]s|\s+is)\s+${PAGE}\s+about\b` +
    String.raw`|what\s+(?:does|do)\s+${PAGE}\s+(?:say|tell|cover|contain|mention|show|list)\b` +
    String.raw`|what(?:['’]s|\s+is)\s+(?:on|in)\s+${PAGE}\b` +
    String.raw`|(?:according\s+to|based\s+on|from)\s+${PAGE}\b` +
    String.raw`|.*\b(?:on|in|from)\s+${PAGE}\s*\??$` +
    String.raw`)`,
  "i"
);

export function isCurrentPagePrompt(text) {
  const prompt = String(text || "").trim();
  if (!prompt || /\b(?:watch\s*list|watchlist|connect(?:ed|ion)?|related|relationship)\b/i.test(prompt)) return false;
  return PAGE_QUESTION_RE.test(prompt);
}

// The page's namespace and name, from the URL (content scripts can't read
// WikiTree's wg* globals). "Space:Test_page-1" → { namespace: "Space", … }.
export function getCurrentPageInfo(doc = document, loc = window.location) {
  let pageName = "";
  try {
    const path = decodeURIComponent(String(loc?.pathname || ""));
    pageName = (path.match(/^\/wiki\/(.+)$/) || [])[1] || "";
    if (!pageName) pageName = new URLSearchParams(String(loc?.search || "")).get("title") || "";
  } catch (e) {
    pageName = "";
  }
  pageName = pageName.replace(/\s+/g, "_");
  const namespace = pageName.includes(":") ? pageName.split(":")[0] : "";
  const heading = doc?.querySelector("h1.x-heading-title, h1");
  const title = cleanText(heading?.textContent || "") || cleanText(doc?.title || "").replace(/\s*\|\s*WikiTree.*$/i, "");
  return {
    pageName,
    namespace,
    title,
    // Person profiles have no namespace (Smith-123); getProfile covers them.
    isPersonProfile: !namespace && /-\d+$/.test(pageName),
  };
}

function cleanText(text) {
  return String(text || "")
    .replace(/[   ]/g, " ")
    .replace(/[▲▼↑↓⇅]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function tableToText(table, maxRows) {
  const rows = Array.from(table.querySelectorAll("tr")).filter((row) => row.closest("table") === table);
  const lines = [];
  for (const row of rows.slice(0, maxRows)) {
    const cells = Array.from(row.children)
      .filter((cell) => /^T[HD]$/.test(cell.tagName))
      .map((cell) => cleanText(nodeToText(cell, maxRows).replace(/\n+/g, " ")));
    if (cells.some(Boolean)) lines.push(`| ${cells.join(" | ")} |`);
  }
  if (rows.length > maxRows) lines.push(`(…table continues: ${rows.length - maxRows} more rows not shown)`);
  return `\n${lines.join("\n")}\n`;
}

function nodeToText(node, maxRows = TABLE_ROW_STEPS[0]) {
  if (node.nodeType === 3) return node.nodeValue.replace(/\s+/g, " ");
  if (node.nodeType !== 1) return "";
  const tag = node.tagName;
  if (tag === "TABLE") return tableToText(node, maxRows);
  if (/^H[1-6]$/.test(tag)) {
    const level = Number(tag[1]);
    return `\n\n${"#".repeat(Math.min(level, 4))} ${cleanText(node.textContent)}\n`;
  }
  let inner = "";
  for (const child of node.childNodes) inner += nodeToText(child, maxRows);
  if (tag === "LI") return `\n- ${inner.trim()}`;
  if (tag === "IMG") {
    const alt = cleanText(node.getAttribute("alt"));
    return alt ? ` [image: ${alt}] ` : "";
  }
  if (BLOCK_TAGS.has(tag)) return `\n${inner}\n`;
  return inner;
}

function tidyLines(text) {
  return String(text || "")
    .split("\n")
    .map((line) => cleanText(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// The visible text of the page's main content, minus extension clutter, with
// headings, lists and tables kept readable and the whole capped at `maxChars`:
// tables shrink first, then the middle goes, keeping the end (the sources).
export function extractPageText(doc = document, { maxChars = PAGE_TEXT_BUDGET } = {}) {
  const root = CONTENT_SELECTORS.map((selector) => doc?.querySelector(selector)).find(Boolean);
  if (!root) return { text: "", truncated: false, length: 0 };
  const clone = root.cloneNode(true);
  clone.querySelectorAll(CLUTTER_SELECTOR).forEach((el) => el.remove());
  let full = "";
  for (const maxRows of TABLE_ROW_STEPS) {
    full = tidyLines(nodeToText(clone, maxRows));
    if (full.length <= maxChars) return { text: full, truncated: false, length: full.length };
  }
  const tailChars = Math.floor(maxChars * 0.2);
  const headChars = maxChars - tailChars - 60;
  const head = full.slice(0, headChars);
  const tail = full.slice(-tailChars);
  const headCut = head.lastIndexOf("\n") > headChars * 0.8 ? head.slice(0, head.lastIndexOf("\n")) : head;
  const tailCut = tail.indexOf("\n") >= 0 && tail.indexOf("\n") < tailChars * 0.2 ? tail.slice(tail.indexOf("\n") + 1) : tail;
  return { text: `${headCut}\n\n(…part of the page not shown…)\n\n${tailCut}`, truncated: true, length: full.length };
}

// The sidebar's manager, dates and similar facts ("Who manages this page?").
export function extractPageAuditText(doc = document) {
  const aside = doc?.querySelector("aside.x-audit, aside.footnote");
  if (!aside) return "";
  const clone = aside.cloneNode(true);
  clone.querySelectorAll(CLUTTER_SELECTOR).forEach((el) => el.remove());
  return tidyLines(nodeToText(clone)).slice(0, 1500);
}

// The block the general AI fallback adds to its prompt. Empty when the page has
// no content, and on person profiles unless `includePersonProfile` (their data
// comes from getProfile, which only lacks the bio when privacy hides it).
export function buildCurrentPageContextForAi(doc = document, loc = window.location, { includePersonProfile = false } = {}) {
  const info = getCurrentPageInfo(doc, loc);
  if (info.isPersonProfile && !includePersonProfile) return "";
  const { text, truncated, length } = extractPageText(doc);
  if (!text) return "";
  const audit = extractPageAuditText(doc);
  return [
    `CURRENT PAGE (the page the user is looking at; you can see its text below, so never ask them to paste it):`,
    `Title: ${info.title || info.pageName}`,
    info.pageName ? `Page: ${info.pageName}${info.namespace ? ` (${info.namespace} page)` : ""}` : "",
    loc?.href ? `URL: ${loc.href}` : "",
    audit ? `Page details:\n${audit}` : "",
    `PAGE TEXT${truncated ? ` (shortened from ${length} characters: big tables trimmed and a middle part left out; say so if the answer may be in the part not shown)` : ""}:`,
    text,
    `END OF PAGE TEXT. "This page" in the user's request means this page. Answer questions about it from this text, and say when the text doesn't cover something.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// Pages with text worth asking about (the user, 2026-10-05: "be aware of context and provide
// appropriate buttons"). Special: pages (edit, search, watchlist) and person profiles aren't.
const CONTENT_NAMESPACES = new Set(["space", "help", "project", "category", "template"]);

export function isContentPage(info) {
  return Boolean(info && !info.isPersonProfile && CONTENT_NAMESPACES.has(String(info.namespace || "").toLowerCase()));
}

/**
 * The welcome buttons for the page itself, first in the list on a content page. Empty
 * elsewhere, and without AI (reading a page needs it). Each is a prompt
 * isCurrentPagePrompt accepts.
 */
export function currentPageChipPrompts(info, { ai = true } = {}) {
  if (!ai || !isContentPage(info)) return [];
  const prompts = ["Summarize this page", "Who is mentioned on this page?"];
  // (a timeline only fits pages about people and places, not Help or templates)
  if (/^(?:space|project|category)$/i.test(info.namespace)) prompts.push("Make a timeline of this page");
  return prompts;
}

// The profile's "DNA Connections" box (section#DNA-Connections): who has tested, how much DNA
// they'd likely share, and their tests. Murray (2026-10-05) asked about testers on
// Chicoine_dit_Henley-1 and the AI, seeing only the bio, said none were identified.
const DNA_LIST_TYPES = { "dna-au": "Autosomal", "dna-y": "Y-DNA", "dna-mt": "mtDNA", "dna-x": "X-DNA" };

export function extractDnaConnectionsText(doc = document) {
  const section = doc?.querySelector("section#DNA-Connections, #DNA-Connections");
  if (!section) return "";
  const heading = cleanText(section.querySelector("h2, h3")?.textContent || "DNA Connections");
  const lines = [heading];
  section.querySelectorAll("ul").forEach((list) => {
    const typeClass = Array.from(list.classList).find((name) => DNA_LIST_TYPES[name]);
    const items = Array.from(list.querySelectorAll(":scope > li"));
    if (!items.length) return;
    lines.push(`${typeClass ? DNA_LIST_TYPES[typeClass] : "DNA"} test-takers:`);
    items.forEach((item) => {
      const link = Array.from(item.querySelectorAll("a[href*='/wiki/']")).find((a) => /\/wiki\/[^:/]+-\d+$/.test(a.getAttribute("href") || ""));
      const id = (String(link?.getAttribute("href") || "").match(/\/wiki\/([^:/]+-\d+)$/) || [])[1] || "";
      const text = cleanText(item.textContent.replace(/\s+/g, " ")).replace(/\s+([:,])/g, "$1");
      lines.push(`- ${text}${id ? ` [${decodeURIComponent(id)}]` : ""}`);
    });
  });
  return lines.length > 1 ? lines.join("\n").slice(0, 4000) : "";
}

export function isDnaPrompt(text) {
  const prompt = String(text || "");
  return (
    /\b(?:dna|y-?dna|mt-?dna|autosomal|haplogroup|tested|testers?|test-takers?|testing)\b/i.test(prompt) ||
    /\b(?:could|can|should|might)\s+(?:take\s+an?\s+)?test\b|\btests?\s+for\b/i.test(prompt)
  );
}
