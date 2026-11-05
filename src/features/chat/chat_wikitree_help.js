// WikiTree help questions without AI (no-AI group 4, 2026-10-14): "what is a PPP?", "how do I
// merge two profiles?", "why can't I edit this profile?". Code can't understand a question, so it
// looks things up: first Genie's checked glossary by the exact term ("what is a PPP?"), then the
// questions on WikiTree's FAQ pages (what members ask in G2G) by their words. The reply quotes
// the question it matched, so a wrong match shows. Nothing close: WikiTree's Help page search,
// sent the key words only (it ranks a whole question badly: "what is a PPP" put Host a Zoom Party
// first, "PPP" alone puts Help:Project_Protection first).

import { WIKITREE_GLOSSARY } from "./chat_wikitree_glossary";

const WIKI = "https://www.wikitree.com/wiki/";

// The English FAQ pages (Special:SearchPages for "FAQ", 2026-10-14): 134 questions.
export const HELP_FAQ_PAGES = [
  "FAQ",
  "Sources_FAQ",
  "Trusted_List_FAQ",
  "Matching_and_Merging_FAQ",
  "Deletion_FAQ",
  "Photos_FAQ",
  "DNA_FAQ",
  "GDPR_FAQ",
  "Project_FAQ",
  "Style_FAQ",
  "Widget_FAQ",
];

const clean = (text) => String(text || "").replace(/\s+/g, " ").trim();
const parseHtml = (html) => new DOMParser().parseFromString(String(html || ""), "text/html");
// (a link on a www.wikitree.com page, made absolute)
const wikiUrl = (link) => `${WIKI}${link.getAttribute("href").slice("/wiki/".length)}`;
// ("how many have no sources?" asks for a count, not for help with sources)
const COUNT_QUESTION = /^\s*how\s+many\b/i;

/* ---------- words ---------- */

const STOP = new Set(
  `a an the i me my mine myself you your yours we our us they them their it its is are was were be been being am
  do does did done doing can could should would will shall may might must how what why when where who whom which
  whose if to of in on for at by with from into onto about as and or but so than then this that these those there
  here some any anyone someone something anything ever just please tell explain know need want help way two both
  get got wo wikitree wt wiki ok okay he she him her his hers people person many much see find use make have take give
  look show address`.split(/\s+/)
);

// A few plain swaps so the same thing asked in other words still meets the FAQ's word.
const SWAPS = {
  remove: "delete",
  erase: "delete",
  vanish: "disappear",
  vanished: "disappear",
  wife: "spouse",
  wives: "spouse",
  husband: "spouse",
  husbands: "spouse",
  partner: "spouse",
  partners: "spouse",
  kids: "child",
  children: "child",
  surname: "last name",
  surnames: "last name",
  picture: "photo",
  pictures: "photo",
  upload: "add",
  uploaded: "add",
  uploading: "add",
  reference: "source",
  references: "sources",
  second: "another",
  founder: "founded",
  owner: "owns",
  no: "not",
  never: "not",
};

function stem(word) {
  let w = word;
  if (w.length > 4 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 6 && w.endsWith("ion")) w = w.slice(0, -3);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

/** The plain words of a question, before stemming: contractions opened, little words dropped. */
export function helpWords(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\be-mail/g, "email")
    .replace(/\b(?:can't|cannot)\b/g, "can not")
    .replace(/n't\b/g, " not")
    .replace(/'(?:s|re|ve|m|d|ll)\b/g, "")
    .split(/[^a-z0-9]+/)
    .flatMap((word) => (SWAPS[word] ? SWAPS[word].split(" ") : [word]))
    .filter((word) => word.length > 1 && !STOP.has(word));
}

const helpTokens = (text) => [...new Set(helpWords(text).map(stem))];

/* ---------- the glossary, by exact term ---------- */

const normaliseTerm = (text) =>
  clean(String(text || "").toLowerCase().replace(/^wt$/, "wikitree").replace(/[‘’“”"'{}]/g, "").replace(/-/g, " "))
    .replace(/\s+(?:on|in)\s+wikitree$/, "")
    .replace(/s$/, "");

const GLOSSARY_BY_TERM = new Map();
for (const entry of WIKITREE_GLOSSARY) for (const term of entry.terms) GLOSSARY_BY_TERM.set(normaliseTerm(term), entry);

const ARTICLE = String.raw`(?:(?:a|an|the)\s+)?`;
const TERM_QUESTION = new RegExp(
  String.raw`^(?:what(?:'s|\s+is|\s+are)\s+${ARTICLE}(.+?)|what\s+does\s+${ARTICLE}(.+?)\s+(?:mean|stand\s+for)|what\s+do\s+you\s+mean\s+by\s+${ARTICLE}(.+?)|(?:define|meaning\s+of)\s+${ARTICLE}(.+?))\s*\??$`,
  "i"
);

/** The glossary entry for "what is a PPP?" / "what does 'Unsourced' mean?", by the exact term only. */
export function glossaryEntryForPrompt(prompt) {
  const match = clean(prompt).replace(/[‘’]/g, "'").match(TERM_QUESTION);
  if (!match) return null;
  const term = normaliseTerm(match[1] || match[2] || match[3] || match[4]);
  return GLOSSARY_BY_TERM.get(term) || null;
}

/* ---------- the FAQ pages ---------- */

/** The questions on one FAQ page: {page, question, url (to the question), answer: [lines], links}. */
export function parseFaqPage(html, page) {
  const doc = parseHtml(html);
  const root = doc.querySelector(".body-text") || doc.body;
  const entries = [];
  for (const heading of root.querySelectorAll("h2, h3")) {
    const question = clean(heading.querySelector(".mw-headline")?.textContent);
    if (!/\?$/.test(question) || !heading.id) continue;
    const answer = [];
    const links = [];
    for (let node = heading.nextElementSibling; node && !/^H[1-3]$/.test(node.tagName); node = node.nextElementSibling) {
      if (node.tagName === "P") answer.push(clean(node.textContent));
      else if (node.tagName === "UL" || node.tagName === "OL") answer.push(...[...node.children].map((li) => `• ${clean(li.textContent)}`));
      else continue;
      for (const link of node.querySelectorAll("a[href^='/wiki/']")) {
        const url = wikiUrl(link);
        if (!links.some((seen) => seen.url === url)) links.push({ title: clean(link.textContent), url });
      }
    }
    entries.push({ page, question, url: `${WIKI}Help:${page}#${heading.id}`, answer: answer.filter((line) => line && line !== "•"), links });
  }
  return entries;
}

// "wikitree" is a stop word (most questions are about it), so a glossary question about WikiTree
// itself ("Who founded WikiTree?") must be asked about it too: "who founded it?" isn't.
// "WT" is WikiTree too; "WT+" and "WikiTree+" are the search engine.
const NAMES_WIKITREE = /\b(?:wikitree|wt)\b(?!\s*(?:\+|plus\b))/i;

/** Whether a prompt names WikiTree (or WT) itself: "Owner of WikiTree", "is WT free?". */
export const namesWikiTree = (text) => NAMES_WIKITREE.test(String(text || ""));

/** The prompt without a closing "on WikiTree" / "in WT", which adds nothing to a search. */
export const withoutOnWikiTree = (text) => String(text || "").replace(/\s+(?:on|in|at)\s+(?:wikitree|wt)(?:\.com)?\s*[?!.]*\s*$/i, "");

/**
 * The index the questions are matched against: the FAQ questions plus the glossary's own
 * "how do I" questions. idf weights, so a rare word (unmerge, GEDCOM) counts for more than profile.
 */
export function buildHelpIndex(faqEntries) {
  const entries = [
    ...WIKITREE_GLOSSARY.flatMap((glossary) =>
      (glossary.questions || []).map((question) => ({ question, glossary, namesWikiTree: NAMES_WIKITREE.test(question) }))
    ),
    ...(faqEntries || []),
  ].map((entry) => ({ ...entry, tokens: helpTokens(entry.question) }));
  const df = new Map();
  for (const entry of entries) for (const token of entry.tokens) df.set(token, (df.get(token) || 0) + 1);
  const total = entries.length;
  const idf = (token) => Math.log(1 + total / (df.get(token) || 1));
  return { entries, idf, known: (token) => df.has(token) };
}

const MIN_COVER = 0.6; // of the asker's words (the ones the FAQ uses), by weight
const MIN_SCORE = 0.6;
// Close enough to quote the FAQ's answer; below it, the questions are listed as ones that may help
// ("what is the best DNA test?" is near "What happened to DNA test information?" but isn't it).
const ANSWER_SCORE = 0.92;

// How well an FAQ question covers the asker's words, leaning on the asker's side (F2): "how do I
// add someone to the trusted list?" is closer to "Who can add and remove people from a Trusted
// List?" than to "What are Trusted Lists?".
function scoreEntry(tokens, entry, idf) {
  const sum = (list) => list.reduce((total, token) => total + idf(token), 0);
  const sharedTokens = tokens.filter((token) => entry.tokens.includes(token));
  const shared = sum(sharedTokens);
  if (!shared) return { count: 0, cover: 0, back: 0, score: 0 };
  const cover = shared / sum(tokens);
  const back = shared / sum(entry.tokens);
  return { count: sharedTokens.length, cover, back, score: (5 * cover * back) / (4 * back + cover) };
}

/** The FAQ (or glossary) question closest to the prompt, and up to two others nearly as close; null when none is close. */
export function matchHelpQuestion(prompt, index) {
  if (!index?.entries?.length) return null;
  const words = helpTokens(prompt);
  // Words no FAQ question uses ("grandfather", "by mistake") don't count against a match, but
  // they mustn't be most of the question: "what was the weather like in 1850?" isn't about "like".
  const tokens = words.filter(index.known);
  if (!tokens.length || tokens.length * 2 < words.length) return null;
  // Two shared words, unless the question is one word the FAQ knows ("how do I unmerge?"); then
  // that word must be most of the FAQ question ("who can see my profile?" isn't "How do I merge two profiles?").
  const oneWord = tokens.length === 1 && words.length === 1;
  const namesWikiTree = NAMES_WIKITREE.test(prompt);
  const scored = index.entries
    .filter((entry) => namesWikiTree || !entry.namesWikiTree)
    .map((entry) => ({ entry, ...scoreEntry(tokens, entry, index.idf) }))
    .filter((hit) => (oneWord ? hit.back >= 0.5 : hit.count >= 2) && hit.cover >= MIN_COVER && hit.score >= MIN_SCORE)
    // (a tie goes to Genie's own checked answer, then to the FAQ's order)
    .sort((a, b) => b.score - a.score || Boolean(b.entry.glossary) - Boolean(a.entry.glossary));
  if (!scored.length) return null;
  const [best, ...rest] = scored;
  const others = rest.filter((hit) => hit.score >= best.score - 0.15 && hit.entry.question !== best.entry.question).slice(0, 2);
  return { entry: best.entry, score: best.score, confident: best.score >= ANSWER_SCORE, others: others.map((hit) => hit.entry) };
}

/* ---------- WikiTree's Help page search ---------- */

// Words that make a question about WikiTree itself, so only those go to the Help search.
const WIKITREE_WORDS = new Set(
  `profile merge unmerge duplicate match source unsourced citation cite reference biography bio sticker template
  category privacy private trusted watchlist manager ppp gedcom gedcompare dna project g2g lnab badge connection
  connected unconnected orphan orphaned adopt edit photo account password email honor certified certification
  widget style rule`
    .split(/\s+/)
    .map(stem)
);
// Family words are about WikiTree only in a how-to: "how do I add a child?", not "how many children did she have?".
const FAMILY_WORDS = new Set("spouse parent child sibling relationship name".split(" ").map(stem));
const HOW_TO = /^\s*(?:how\s+(?:do|can|should|would)\s+(?:i|you|we|one)|can\s+(?:i|you|we)|where\s+(?:do|can)\s+(?:i|you|we)|is\s+it\s+possible)\b/i;

/** The key words to send to the Help search ("how do I merge two profiles?" → "merge profiles"), or "" when none are WikiTree words. */
export function helpSearchKeywords(prompt) {
  if (COUNT_QUESTION.test(prompt)) return "";
  const words = helpWords(prompt).filter((word) => word !== "not");
  const stems = words.map(stem);
  // ("profile" alone is too broad to search for: "who can see my profile?")
  const aboutWikiTree =
    stems.some((word) => WIKITREE_WORDS.has(word) && word !== stem("profile")) || (HOW_TO.test(prompt) && stems.some((word) => FAMILY_WORDS.has(word)));
  return aboutWikiTree ? words.slice(0, 4).join(" ") : "";
}

export const helpSearchQuery = (keywords) => `title=Special%3ASearchPages&keywords=${encodeURIComponent(keywords)}&pageSearch=`;

/** The English results of Special:SearchPages: [{title, url, summary}]. */
export function parseHelpSearchResults(html) {
  const list = parseHtml(html).getElementById("lang_En")?.nextElementSibling;
  if (!list || list.tagName !== "UL") return [];
  return [...list.children]
    .map((item) => {
      const link = item.querySelector("a[href^='/wiki/']");
      if (!link) return null;
      const title = clean(link.textContent);
      const text = clean(item.textContent);
      return { title, url: wikiUrl(link), summary: clean(text.startsWith(title) ? text.slice(title.length) : text) };
    })
    .filter(Boolean);
}

/* ---------- the replies ---------- */

const MAX_ANSWER_CHARS = 700;

function shortAnswer(lines) {
  const kept = [];
  let length = 0;
  for (const line of lines) {
    if (length + line.length > MAX_ANSWER_CHARS) {
      const room = MAX_ANSWER_CHARS - length;
      const cut = line.slice(0, room).replace(/[^.!?]*$/, "");
      if (cut.length > 40) kept.push(cut);
      kept.push("…");
      break;
    }
    kept.push(line);
    length += line.length;
  }
  return kept.join("\n");
}

export function glossaryReply(entry) {
  return `${entry.text}\n${entry.url}`;
}

const entryUrl = (entry) => (entry.glossary ? entry.glossary.url : entry.url);
const questionLines = (entries) => entries.flatMap((entry) => [`• ${entry.question}`, entryUrl(entry)]);

export function faqReply({ entry, others = [], confident = true }) {
  if (!confident) {
    return ["WikiTree's FAQ has questions that may help:", ...questionLines([entry, ...others])].join("\n");
  }
  if (entry.glossary) return glossaryReply(entry.glossary);
  const lines = [`WikiTree's FAQ: **${entry.question}**`, shortAnswer(entry.answer)];
  // (an answer that is only a pointer, "See Help:Email_Addresses.", gets the page's link too)
  if (entry.answer.join(" ").length < 200) lines.push(...entry.links.slice(0, 2).map((link) => link.url));
  lines.push(entry.url);
  if (others.length) lines.push("Other FAQ questions that may help:", ...questionLines(others));
  return lines.filter(Boolean).join("\n");
}

export function helpSearchReply(keywords, results) {
  const lines = [`WikiTree's Help pages for "${keywords}":`];
  for (const result of results.slice(0, 4)) {
    lines.push(`• **${result.title}**${result.summary ? `: ${result.summary}` : ""}`, result.url);
  }
  return lines.join("\n");
}

/* ---------- putting it together ---------- */

let faqIndexPromise = null;

async function loadHelpIndex(fetchPage) {
  if (!faqIndexPromise) {
    faqIndexPromise = Promise.allSettled(HELP_FAQ_PAGES.map((page) => fetchPage(`/wiki/Help:${page}`, ""))).then((pages) => {
      const entries = pages.flatMap((page, i) => (page.status === "fulfilled" ? parseFaqPage(page.value, HELP_FAQ_PAGES[i]) : []));
      // (none came back: try again next time)
      if (!entries.length) faqIndexPromise = null;
      return buildHelpIndex(entries);
    });
  }
  return faqIndexPromise;
}

/** For tests: forget the fetched FAQ pages. */
export function resetHelpIndex() {
  faqIndexPromise = null;
}

/**
 * A reply to a question about WikiTree itself, or null (not one, or nothing found).
 * fetchPage(path, query) returns a www.wikitree.com page's HTML.
 * {text, source: "glossary" | "faq" | "faq-list" (questions that may help) | "search"}
 */
export async function answerWikiTreeHelpQuestion(prompt, { fetchPage }) {
  if (COUNT_QUESTION.test(prompt)) return null;
  const glossary = glossaryEntryForPrompt(prompt);
  if (glossary) return { text: glossaryReply(glossary), source: "glossary" };

  const index = await loadHelpIndex(fetchPage);
  const match = matchHelpQuestion(prompt, index);
  if (match) return { text: faqReply(match), source: match.confident ? "faq" : "faq-list" };

  const keywords = helpSearchKeywords(prompt);
  if (!keywords) return null;
  const results = parseHelpSearchResults(await fetchPage("/index.php", helpSearchQuery(keywords)));
  return results.length ? { text: helpSearchReply(keywords, results), source: "search" } : null;
}
