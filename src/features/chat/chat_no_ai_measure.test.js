// No-AI corpus measure (opt-in): GENIE_MEASURE=1 npx jest chat_no_ai_measure
// (another corpus: GENIE_CORPUS=corpus-imagined.md GENIE_MEASURE_OUT=no-ai-measure-imagined.md, both in .chat-lab)
// Runs every prompt in .chat-lab/corpus.md (git-excluded; skipped when missing) with no AI key
// and writes .chat-lab/no-ai-measure.md: what each one did (a chart/list, a WT+ query, a person
// search, or declined). Misparses are judged by reading the queries; nothing is asserted.

jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  // most of the corpus was typed on Ellen's page
  getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721", FullName: "Ellen (Cook) Burton", Gender: "Female" })),
  getUserWtId: jest.fn(() => "User-1"),
}));

import fs from "fs";
import path from "path";
import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { findAmbiguousCenturyDecade, rewriteExplicitCenturyDecadeWording } from "./chat_century_decade";
import { createProfileSearchHandler } from "./chat_profile_search";
import { ChatIntent, routeChatPrompt } from "./chat_router";
import { isRouterCanonicalSearch } from "./chat_router_canonical";
import { classifyWtPrompt } from "./chat_search_mode";
import { parseSearchSpecPrompt } from "./chat_spec_parser";
import { parseWtPlusNarrowPrompt } from "./chat_wtplus_narrow";
import { answerWikiTreeHelpQuestion, helpSearchKeywords } from "./chat_wikitree_help";

const LAB = path.resolve(process.cwd(), ".chat-lab"); // (jest runs from the repo root)
const CORPUS = path.join(LAB, process.env.GENIE_CORPUS || "corpus.md");
const OUT = path.join(LAB, process.env.GENIE_MEASURE_OUT || "no-ai-measure.md");
const enabled = process.env.GENIE_MEASURE === "1" && fs.existsSync(CORPUS);

function corpusPrompts() {
  const out = [];
  let section = "";
  for (const line of fs.readFileSync(CORPUS, "utf8").split("\n")) {
    if (line.startsWith("## ")) section = line.slice(3).replace(/^Group\s+/, "").split(/\s[—(]/)[0].trim();
    if (!line.startsWith("| ")) continue;
    const cells = line.split("|").map((c) => c.trim());
    const id = cells[1];
    const text = cells[2] || "";
    if (!id || id === "#" || /^-+$/.test(id) || !text || /^Prompts?$/.test(text)) continue;
    for (const variant of text.split(" / ")) {
      const prompt = variant.replace(/[`*]/g, "").replace(/^["']|["']$/g, "").trim();
      if (prompt && prompt.length < 160) out.push({ section, id, prompt });
    }
  }
  return out;
}

function makeHandler() {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => false),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(async () => [null, null, {}]),
    fetchPeoplePaged: jest.fn(async () => [null, null, { 1: { Id: 1, Name: "Test-1" } }]),
    mapApiPersonToStandardRow: jest.fn((person) => ({ wtid: person?.Name || "" })),
    makeStandardProfileTable: jest.fn((title, rows) => ({ title, rows, columns: [] })),
    makeAncestorProfileTable: jest.fn((title, rows) => ({ title, rows, columns: [] })),
    normalizeText: (value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    normalizeKnownDate: jest.fn((value) => value),
    showChatShaky: jest.fn(),
    hideChatShaky: jest.fn(),
  });
}

const PASS_THROUGH = [ChatIntent.FALLBACK_AI, ChatIntent.PROFILE_SEARCH];

// sections L and M are follow-ups typed with a result table open
const FOLLOW_UP_SECTIONS = new Set(["L", "M"]);

async function measure(rawPrompt, section) {
  // (chat.js asks whether "the 1800s" is the century or the decade first; measured: the century button)
  const prompt = rewriteExplicitCenturyDecadeWording(rawPrompt);
  const centuryDecade = findAmbiguousCenturyDecade(prompt);
  if (centuryDecade) {
    const chosen = await measure(centuryDecade.choices[0].prompt, section);
    return { ...chosen, detail: `asks ${centuryDecade.token}: "${centuryDecade.choices[0].prompt}" → ${chosen.detail}` };
  }
  const hasStructuredResult = FOLLOW_UP_SECTIONS.has(section);
  // (chat.js narrows the WT+ search behind the table before routing: L1 is one)
  const narrow = section === "L" ? parseWtPlusNarrowPrompt(prompt) : null;
  if (narrow) return { outcome: "router", detail: `narrow WT+ (${narrow.flag})` };
  const routed = routeChatPrompt(prompt, { hasStructuredResult });
  const intent = routed?.intent;
  // (chat.js runs the router's canonical WT+ query itself: "category Guitarists in my ancestors")
  if (intent === ChatIntent.PROFILE_SEARCH && isRouterCanonicalSearch(routed.params?.query)) {
    return runOnWtPlus(routed.params.query, `router → ${routed.params.query} → `);
  }
  if (intent && !PASS_THROUGH.includes(intent) && (hasStructuredResult || intent !== ChatIntent.LAST_RESULT_OPERATION)) {
    return { outcome: "router", detail: intent };
  }
  const target = await classifyWtPrompt({
    prompt,
    getChatAiConfig: async () => ({ key: "" }),
    isUnclaimed: (text) => PASS_THROUGH.includes(routeChatPrompt(text, { hasStructuredResult: false })?.intent),
  });
  if (target === "needsAi") {
    // chat.js tries WikiTree's help before saying it needs AI (no FAQ pages here: the glossary only,
    // and the key words the Help search would get)
    const help = await answerWikiTreeHelpQuestion(prompt, { fetchPage: async () => "" });
    if (help) return { outcome: "help", detail: `${help.source}: ${help.text.split("\n")[0].slice(0, 90)}` };
    const keywords = helpSearchKeywords(prompt);
    if (keywords) return { outcome: "help", detail: `FAQ pages or Help search: "${keywords}"` };
    return { outcome: "declined", detail: "needs AI (question)" };
  }
  // chat_search_mode runs a prompt the reader parses on WT+ first when there is no key
  const reader = parseSearchSpecPrompt(prompt);
  if (target !== "wtplus" && !reader) return { outcome: "person", detail: `person search (${target})` };
  return runOnWtPlus(prompt, "", reader ? "ran (reader)" : "ran");
}

async function runOnWtPlus(prompt, detailPrefix, ranOutcome = "ran") {
  jest.clearAllMocks();
  wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "" } });
  let result;
  try {
    result = await makeHandler().tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
  } catch (error) {
    return { outcome: "error", detail: String(error?.message || error).slice(0, 120) };
  }
  const queries = wtAPIProfileSearch.mock.calls.map((call) => decodeURIComponent(call[1]));
  if (queries.length) return { outcome: ranOutcome, detail: detailPrefix + queries.join(" ;; ") };
  const text = typeof result === "string" ? result : result?.text || result?.message || result?.type || "";
  return { outcome: "declined", detail: String(text).replace(/\s+/g, " ").slice(0, 120) || "(nothing ran)" };
}

(enabled ? test : test.skip)(
  "no-AI corpus measure",
  async () => {
    jest.spyOn(console, "debug").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const rows = [];
    for (const item of corpusPrompts()) rows.push({ ...item, ...(await measure(item.prompt, item.section)) });
    const counts = {};
    for (const row of rows) counts[row.outcome] = (counts[row.outcome] || 0) + 1;
    const esc = (s) => String(s).replace(/\|/g, "\\|");
    const lines = [
      `# No-AI corpus measure (${new Date().toISOString().slice(0, 10)})`,
      "",
      `${rows.length} prompts: ` + Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · "),
      "",
      "| Sec | # | Prompt | Outcome | Detail |",
      "|---|---|---|---|---|",
      ...rows.map((r) => `| ${esc(r.section)} | ${r.id} | ${esc(r.prompt)} | ${r.outcome} | ${esc(r.detail)} |`),
    ];
    fs.writeFileSync(OUT, lines.join("\n") + "\n");
  },
  300000
);
