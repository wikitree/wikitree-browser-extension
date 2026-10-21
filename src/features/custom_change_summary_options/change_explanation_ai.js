/*
Created By: Ian Beacall (Beacall-6)

The change explanation in the AI's words (2026-10-21). Code finds exactly what changed (the form's
fields with their old and new values, the text's changed words); the AI only puts that into one line.
It gets the changes, not the whole page. Without an AI key, or if the AI fails, the explanation is the
one worked out by code (change_explanation.js).

It uses WBE's shared AI Settings, like the other features that use AI; the "Let AI word the suggestion"
option turns it off.
*/

import { diffLines, diffWordsWithSpace } from "diff";
import { getFeatureOptions } from "../../core/options/options_storage";
import { aiConfigFor } from "../../core/options/shared_ai_options";
import { explainChanges, fitSummary, formChangeDetail, pageChanges, SUMMARY_MAX, summaryMax } from "./change_explanation";
import { draftChanges } from "./change_explanation_draft";

// (background.js gives up at 4½ minutes; Ollama on the member's own computer can take minutes)
const ANSWER_TIMEOUT = 5 * 60 * 1000;
const MAX_DIFF = 6000;

/** The shared AI settings: { provider, key, model }; key is "" when there's no AI. */
export async function changeExplanationAiConfig() {
  try {
    return aiConfigFor((await getFeatureOptions("chat")) || {});
  } catch (error) {
    return { key: "" };
  }
}

/**
 * The text's changes, for the AI: each changed stretch with [-removed-] and {+added+} words, the
 * unchanged lines left out. Cut at max characters.
 */
export function textDiffForAi(before, after, max = MAX_DIFF) {
  const parts = diffLines(String(before || ""), String(after || ""));
  const blocks = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.added && !part.removed) continue;
    const next = parts[i + 1];
    if (part.removed && next?.added) {
      // A changed stretch: the words that changed within it.
      const words = diffWordsWithSpace(part.value, next.value)
        .map((word) => (word.added ? `{+${word.value}+}` : word.removed ? `[-${word.value}-]` : word.value))
        .join("");
      blocks.push(words.trim());
      i++;
    } else {
      blocks.push(part.added ? `{+${part.value.trim()}+}` : `[-${part.value.trim()}-]`);
    }
  }
  const text = blocks.filter(Boolean).join("\n…\n");
  return text.length > max ? `${text.slice(0, max)}\n(more changes not shown)` : text;
}

const PAGE_WORDS = {
  profile: (name) => (name ? `the WikiTree profile of ${name}` : "a WikiTree profile"),
  space: (name) => (name ? `the WikiTree free-space page "${name}"` : "a WikiTree free-space page"),
  category: (name) => (name ? `the WikiTree category page "${name}"` : "a WikiTree category page"),
};

/** What the page is about, from its title: the person's name, or the page's name. */
export function pageSubject(doc = document) {
  const title = String(doc.title || "").replace(/\s+-\s+WikiTree.*$/i, "").trim();
  const name = title.match(/^Edit(?:ing)? Profile of (.+)$/i)?.[1] || title.match(/^Editing (.+)$/i)?.[1] || title;
  return name.trim();
}

/** The request to the AI. */
export function changeExplanationPrompt({ page = "profile", name = "", formChanges = [], textDiff = "", plain = "", max = SUMMARY_MAX }) {
  const lines = [
    `Write the change explanation (the edit summary other members see in the history) for an edit to ${(PAGE_WORDS[page] || PAGE_WORDS.profile)(name)}.`,
    "",
    "Rules:",
    `- One line of plain text, at most ${max} characters. No quotation marks around it, no wiki markup, no "I".`,
    '- Say what was done, in the past tense, most important first, as specifically as the space allows. For example: "Added 1881 census for Leeds; corrected birth year to 1852."',
    "- Describe only the changes below. Don't guess why they were made, and don't mention anything that isn't there.",
    "- Name the sources, places, dates, people, sections and categories that the changes show.",
    "- Reply with the change explanation only.",
  ];
  if (formChanges.length) lines.push("", "Changed in the form:", ...formChanges.map((change) => `- ${change}`));
  if (textDiff) lines.push("", "Changed in the text ([-removed-] {+added+}; unchanged lines left out):", textDiff);
  if (plain) lines.push("", `A plain summary worked out by code (its counts are right): ${plain}`);
  return lines.join("\n");
}

/** The AI's answer as a change explanation: its first line, without quotes, labels or markup. "" if none. */
export function cleanAiAnswer(answer, max = SUMMARY_MAX) {
  const line =
    String(answer || "")
      .replace(/```[a-z]*\n?|```/gi, "")
      .split(/\r?\n/)
      .map((text) => text.trim())
      .find(Boolean) || "";
  const text = line
    .replace(/^(?:change\s+explanation|edit\s+summary|summary)\s*:\s*/i, "")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text ? fitSummary(text, max) : "";
}

function withTimeout(promise) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error("the AI took too long to answer")), ANSWER_TIMEOUT);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const sendToBackground = (message) => chrome.runtime.sendMessage(message);

/** Asks the AI (the shared settings: { provider, key, model }) to word the explanation. */
export async function aiChangeExplanation(config, prompt, { max = SUMMARY_MAX, send = sendToBackground } = {}) {
  const { provider, key, model } = config;
  const response = await withTimeout(send({ action: "chatWithAI", provider, key, model, prompt }));
  if (!response?.success) throw new Error(response?.error ? String(response.error) : "the AI didn't answer");
  const text = cleanAiAnswer(response.response, max);
  if (!text) throw new Error("the AI's answer was empty");
  return text;
}

// The changes to explain: against the saved profile when there's a draft (the page may have loaded it),
// otherwise since the page loaded. If the draft can't be compared, the second, and why.
async function editChanges({ live, doc, page, onDraft, getDraftChanges }) {
  try {
    const draft = await getDraftChanges(doc, { onDraft });
    if (draft) return { changes: draft, fromDraft: true };
  } catch (error) {
    return { changes: pageChanges(live, doc, { page }), fromDraft: false, draftError: error?.message || String(error) };
  }
  return { changes: pageChanges(live, doc, { page }), fromDraft: false };
}

/**
 * The change explanation for this edit: { text, plain, byAi, aiError, fromDraft, draftError }. text is
 * "" when nothing has changed. fromDraft: compared with the saved profile through the draft (onDraft is
 * called first). With useAi and an AI key, the AI words it (onAi is called before it's asked); if the AI
 * fails, text is the plain one and aiError says why.
 */
export async function suggestChangeExplanation({
  live,
  doc = document,
  page = "profile",
  useAi = true,
  onAi,
  onDraft,
  getConfig = changeExplanationAiConfig,
  send,
  getDraftChanges = draftChanges,
}) {
  const { changes, ...source } = await editChanges({ live, doc, page, onDraft, getDraftChanges });
  const plain = explainChanges(changes, { page });
  const result = { text: plain, plain, byAi: false, ...source };
  if (!plain || !useAi) return result;
  const config = await getConfig();
  if (!config?.key) return result;
  const max = summaryMax(doc.getElementById("wpSummary"));
  const prompt = changeExplanationPrompt({
    page,
    name: pageSubject(doc),
    formChanges: changes.form.map(formChangeDetail),
    textDiff: textDiffForAi(changes.before, changes.after),
    plain,
    max,
  });
  onAi?.();
  try {
    return { ...result, text: await aiChangeExplanation(config, prompt, { max, send }), byAi: true };
  } catch (error) {
    return { ...result, aiError: error?.message || String(error) };
  }
}
