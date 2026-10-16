/*
Created By: Ian Beacall (Beacall-6)

Ask Genie: the user says in words what they want changed, and the AI writes the search. The AI only writes
it: the panel shows the matches, and nothing is replaced until the user says so. The AI also gives a few
examples of what its search does, and these are tried with the real search, so a search that doesn't do
what the AI says goes back to it once to be put right.

It uses the AI settings that Genie and Auto Bio share. Like Auto Bio, it doesn't follow Genie's "AI off"
switch, which is for trying Genie without AI (and, kept per site, hid Ask Genie on www, 2026-10-16).
*/

import { getFeatureOptions } from "../../core/options/options_storage";
import { aiConfigFor } from "../../core/options/shared_ai_options";
import { compileSearch, findMatches, replaceMatches } from "./find_and_replace_engine";

// (a backstop: background.js gives up at 4½ minutes and says why; 90 seconds cut off Ollama on the
// member's own computer, which can take minutes, 2026-10-16)
const ANSWER_TIMEOUT = 5 * 60 * 1000;
const MAX_SELECTED = 1000;

const getAiConfig = async () => aiConfigFor((await getFeatureOptions("chat")) || {});

/** Whether there's an AI to ask: a key in the shared AI settings. */
export async function canAskGenie() {
  try {
    return Boolean((await getAiConfig()).key);
  } catch (error) {
    return false;
  }
}

const MODE_WORDS = [
  [/^reg/i, "regex"],
  [/^wild/i, "wildcards"],
  [/^(text|plain)/i, "text"],
];

/**
 * The AI's answer: { search, explanation, examples }, or null if it can't be read. search is
 * { find, replace, mode, matchCase, wholeWord }; find is "" when the AI says it can't be done.
 */
export function parseAnswer(text) {
  const raw = String(text || "").replace(/```(?:json)?/gi, "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end < start) return null;
  let data;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch (error) {
    return null;
  }
  if (!data || typeof data !== "object" || typeof data.find !== "string") return null;
  const mode = MODE_WORDS.find(([pattern]) => pattern.test(String(data.mode || "")))?.[1] || "regex";
  return {
    search: {
      find: data.find,
      replace: typeof data.replace === "string" ? data.replace : "",
      mode,
      matchCase: data.matchCase === true,
      wholeWord: data.wholeWord === true,
    },
    explanation: typeof data.explanation === "string" ? data.explanation.trim() : "",
    examples: (Array.isArray(data.examples) ? data.examples : [])
      .filter((example) => typeof example?.before === "string" && typeof example?.after === "string")
      .slice(0, 6),
  };
}

/** What Replace all would make of the text. */
export function replaceAllIn(text, search) {
  const compiled = compileSearch(search);
  if (!compiled || compiled.error) return text;
  return replaceMatches(text, findMatches(text, compiled), search.replace, compiled).text;
}

// Two backslashes stand for a backslash, which wiki text hardly ever has. More often the AI has doubled
// them once too often for the JSON, so [ \t] has become [ \\t]: a space, a backslash or the letter t.
const DOUBLED_BACKSLASH = /\\\\/;

/**
 * Where the search doesn't work, or doesn't do what the AI's examples say: [] if it does. backslashes is
 * true when the user's request or selection has a backslash, so the search may well look for one.
 */
export function checkAnswer({ search, examples }, { backslashes = false } = {}) {
  const compiled = compileSearch(search);
  if (compiled?.error) return [`Find doesn't work as a ${search.mode} search: ${compiled.error}.`];
  const problems = [];
  if (search.mode !== "text" && !backslashes) {
    [
      ["Find", search.find],
      ["Replace with", search.replace],
    ]
      .filter(([, value]) => DOUBLED_BACKSLASH.test(value))
      .forEach(([field]) =>
        problems.push(
          String.raw`${field} has \\ (two backslashes), which stands for a backslash character, and the user's text has none. In the JSON, the regex [ \t] is written "[ \\t]", not "[ \\\\t]".`
        )
      );
  }
  return problems.concat(
    examples
      .map(({ before, after }) => ({ before, after, got: replaceAllIn(before, search) }))
      .filter(({ after, got }) => got !== after)
      .map(({ before, after, got }) => `With ${JSON.stringify(before)}, Replace all gives ${JSON.stringify(got)}, not ${JSON.stringify(after)}.`)
  );
}

const RULES = String.raw`How the panel searches:
- Mode "text" finds exactly the text in Find. Nothing in it is special.
- Mode "wildcards": in Find, ? is any one character, # is any one digit, and * is any characters on one line (a * at the start or end of Find stays inside the word). In Replace with, the same symbols put back what they found, in order. A backslash makes the next character ordinary.
- Mode "regex": a JavaScript regular expression, written without slashes or flags. The flags g, m and u are always on (so ^ and $ match at the start and end of each line, and \p{L} works), and i is on unless matchCase is true. A . doesn't match a line break: use [\s\S] for that. \s does match line breaks, so use [ \t] for spaces within a line. \w and \b only know A-Z, 0-9 and _, so use \p{L} for letters that might have accents. In Replace with: $1 or \1 for a group, $<name> for a named group, $& for the whole match, $$ for a dollar sign, \n for a new line and \t for a tab.
- matchCase true tells upper and lower case apart (otherwise they count as the same). wholeWord true skips matches that are part of a longer word.
- Replace all changes every match in the whole text at once.

WikiTree markup: ''italics'', '''bold''', == Heading == (=== Subheading ===), * list item (** for an item in a list within a list), # numbered item, [https://example.com link text], [[Smith-1|John Smith]] links to a profile, <ref>...</ref> holds a source, {{Template}} is a template.

Use the simplest mode that does the job, and make the search change only what the user asked about.

Reply with JSON only, in this form:
{"find": "...", "replace": "...", "mode": "text" or "wildcards" or "regex", "matchCase": false, "wholeWord": false, "explanation": "...", "examples": [{"before": "...", "after": "..."}]}
- explanation: one or two short sentences, in plain words for someone who doesn't know regular expressions, saying what the search finds and what it changes it to.
- examples: 2 to 4 short pieces of text, each with what it becomes after Replace all. Include one that the search should leave alone (with after the same as before).
- In JSON each backslash is written twice, not four times: the regex \*(\p{L}+)\* is "\\*(\\p{L}+)\\*".
- Only if no single search can do what the user wants, set find to "" and say why in explanation, in plain words, and that the change will have to be made by hand. WikiTree's edit box has no sort or other tools, so don't suggest any, or scripts or programming. Each request is answered on its own, so don't offer to do more.`;

function describeCurrent({ find, replace, mode, matchCase, wholeWord }) {
  const extras = [matchCase && "match case", wholeWord && "whole words"].filter(Boolean);
  return [`Find: ${find}`, `Replace with: ${replace}`, `Mode: ${mode}${extras.length ? ` (${extras.join(", ")})` : ""}`].join("\n");
}

/**
 * The prompt for the AI. selected is text the user has selected in the edit box, current the search in
 * the panel (or null), and retry { answer, problems } when the last answer didn't work.
 */
export function buildPrompt({ request, selected = "", current = null, retry = null }) {
  const parts = [
    "You write searches for Find and Replace, a panel in the WikiTree Browser Extension that edits the wiki text of a WikiTree profile or free-space page.",
    `What the user wants: ${request}`,
  ];
  if (selected) parts.push(`The user has selected this text in the edit box:\n"""\n${selected.slice(0, MAX_SELECTED)}\n"""`);
  if (current?.find) parts.push(`The panel holds this search, which the user may want changed:\n${describeCurrent(current)}`);
  parts.push(RULES);
  if (retry) {
    const { search, explanation, examples } = retry.answer;
    parts.push(
      `Your last answer was:\n${JSON.stringify({ ...search, explanation, examples })}\n` +
        `When the extension tried it:\n${retry.problems.map((problem) => `- ${problem}`).join("\n")}\n` +
        "Put it right and reply with the whole JSON again. If an example was wrong rather than the search, correct the example."
    );
  }
  return parts.join("\n\n");
}

function withTimeout(promise) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error("Genie took too long to answer. Try again in a moment.")), ANSWER_TIMEOUT);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function ask({ provider, key, model }, prompt) {
  const response = await withTimeout(chrome.runtime.sendMessage({ action: "chatWithAI", provider, key, model, prompt }));
  if (!response?.success) throw new Error(`Genie couldn't answer${response?.error ? `: ${response.error}` : "."}`);
  const answer = parseAnswer(response.response);
  if (!answer) throw new Error("Genie's answer couldn't be read. Try asking again, perhaps in other words.");
  return answer;
}

/**
 * Asks the AI for a search that does what the user describes. Resolves to { search, explanation, problems },
 * where problems says where the search still doesn't do what the AI said it would ([] if it does).
 */
export async function askGenie({ request, selected = "", current = null }) {
  const config = await getAiConfig();
  if (!config?.key) throw new Error("Ask Genie needs an AI key. Add one in the WBE options, under Genie's AI Assistance.");
  const backslashes = /\\/.test(request + selected);
  let answer = await ask(config, buildPrompt({ request, selected, current }));
  let problems = answer.search.find ? checkAnswer(answer, { backslashes }) : [];
  if (problems.length) {
    try {
      const second = await ask(config, buildPrompt({ request, selected, current, retry: { answer, problems } }));
      const secondProblems = second.search.find ? checkAnswer(second, { backslashes }) : [];
      // (an answer that now says it can't be done doesn't replace a search that nearly works)
      if (second.search.find && secondProblems.length <= problems.length) {
        answer = second;
        problems = secondProblems;
      }
    } catch (error) {
      // The first answer will do, with its problems
    }
  }
  return { search: answer.search, explanation: answer.explanation, problems };
}
