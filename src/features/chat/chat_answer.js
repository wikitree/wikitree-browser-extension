// Answers in words (2026-10-04, one box for searches and questions). The AI
// answers a question with the profile as context; this module tells it how to
// say it can't, how to suggest what Genie can do instead, and reads those parts
// back out of its reply. Questions it couldn't answer are kept in this browser
// only, so the user can see what people ask for and send it on if they wish.

// Capitalised words that start a sentence, not a name: "Where did Philip live?"
// once made Genie look for a person called "Where" and leave the page's Philip out
// of the AI's context (live, 2026-10-04).
const NOT_NAME_WORDS = new Set(
  "where what when who whom whose why how which did does do was were is are am has have had can could would should will shall may might must tell show find list give please the a an and or but if in on at of for from to with by about i my me we our you your it its this that these those there here".split(
    " "
  )
);

/** The names a request mentions, longest first, without leading sentence words. */
export function promptNameCandidates(text) {
  const runs = String(text || "").match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g) || [];
  const names = runs
    .map((run) => {
      const words = run.split(/\s+/);
      while (words.length && NOT_NAME_WORDS.has(words[0].toLowerCase())) words.shift();
      return words.join(" ");
    })
    .filter(Boolean);
  return [...new Set(names)].sort((a, b) => b.split(" ").length - a.split(" ").length);
}

const UNANSWERED_KEY = "museUnanswered";
const UNANSWERED_MAX = 100;

export const AI_ANSWER_FORMAT_RULES = [
  "How to reply:",
  "- Answer in plain words, briefly. Put any general background in its own short paragraph that starts \"General background:\".",
  "- Write only the finished answer: don't think aloud, ask yourself questions or correct yourself mid-answer.",
  "- If the request can't be answered from the WikiTree information above or from general knowledge (for example it needs records that aren't here, or asks you to change a profile), start your reply with [CANNOT], then say plainly in one or two sentences what's missing. Don't guess.",
  "- The information above is only part of what this chat can reach. When a question needs more of the family tree (all the ancestors or descendants, counts, how far back a tree goes), don't say a tool isn't available: say briefly that the request below will show it, and suggest it.",
  "- You may end with one line: SUGGEST: <request> | <request> | <request>. These are up to three short requests the user could type next that this chat can do: find profiles by name, place, date, category or template; show a person's relatives, ancestors, descendants, connections and relationship to someone; count a person's ancestors, how many generations back they go and the earliest born (\"how many ancestors does Smith-123 have\"); charts (fan chart, descendant chart, lifespans, family timeline, migration map, Family Explorer); a profile's sources, bio and possible problems. Write each as the user would type it, with the person's WikiTree ID, in forms like these: \"show Smith-123's parents\", \"how many ancestors does Smith-123 have\", \"Smith-123's fan chart\", \"Smith-123's family timeline\", \"show Smith-123's sources\", \"show Smith-123's bio\", \"my connection to Smith-123\". Leave the line out if nothing fits.",
].join("\n");

/** Splits an AI reply into {text, cannot, suggestions}. */
export function parseAiAnswer(reply) {
  let text = String(reply || "").trim();
  let cannot = false;
  if (/^\[CANNOT\]/i.test(text)) {
    cannot = true;
    text = text.replace(/^\[CANNOT\]\s*/i, "");
  }
  let suggestions = [];
  // The AI sometimes runs the SUGGEST line on after its answer ("Hello! How can I
  // help? SUGGEST: ..."), so split it onto its own line first (live, 2026-10-04).
  text = text.replace(/([.!?])[ \t]+(\**SUGGEST\**\s*:)/i, "$1\n$2");
  const lines = text.split("\n");
  const index = lines.findIndex((line) => /^\s*\**SUGGEST\**\s*:/i.test(line));
  if (index >= 0) {
    suggestions = lines[index]
      .replace(/^\s*\**SUGGEST\**\s*:\s*\**\s*/i, "")
      .split("|")
      .map((item) => item.trim().replace(/^["'“]|["'”]$/g, ""))
      .filter((item) => item && item.length <= 90);
    lines.splice(index, 1);
    text = lines.join("\n").trim();
  }
  // ([CANNOT] can turn up later on when the AI leads in with a sentence)
  if (!cannot && /\[CANNOT\]/i.test(text)) {
    cannot = true;
    text = text.replace(/\s*\[CANNOT\]\s*/gi, " ").trim();
  }
  return { text, cannot, suggestions: [...new Set(suggestions)].slice(0, 3) };
}

/** Buttons that send each suggestion as if typed. */
export function suggestionActions(suggestions) {
  return (suggestions || []).map((prompt) => ({ label: prompt, actionType: "send-prompt", prompt, newSearch: true }));
}

function storage() {
  return typeof chrome !== "undefined" && chrome?.storage?.local ? chrome.storage.local : null;
}

/** Keeps a question Genie couldn't answer (this browser only). */
export function recordUnanswered(question, reason = "") {
  const area = storage();
  const text = String(question || "").trim();
  if (!area || !text) return;
  try {
    area.get([UNANSWERED_KEY], (stored) => {
      const list = Array.isArray(stored?.[UNANSWERED_KEY]) ? stored[UNANSWERED_KEY] : [];
      list.push({ question: text.slice(0, 300), reason: String(reason || "").slice(0, 200), at: new Date().toISOString().slice(0, 10) });
      area.set({ [UNANSWERED_KEY]: list.slice(-UNANSWERED_MAX) });
    });
  } catch (error) {
    // (storage gone: nothing to keep)
  }
}

/** The kept questions, oldest first. */
export function loadUnanswered() {
  return new Promise((resolve) => {
    const area = storage();
    if (!area) return resolve([]);
    try {
      area.get([UNANSWERED_KEY], (stored) => resolve(Array.isArray(stored?.[UNANSWERED_KEY]) ? stored[UNANSWERED_KEY] : []));
    } catch (error) {
      resolve([]);
    }
  });
}

export function clearUnanswered() {
  try {
    storage()?.remove?.([UNANSWERED_KEY]);
  } catch (error) {
    // (nothing to clear)
  }
}

/** "what couldn't you answer?", "questions you couldn't answer", "unanswered questions". */
export function parseUnansweredPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  return (
    /^(?:show\s+(?:me\s+)?)?(?:the\s+|my\s+)?unanswered\s+questions$/i.test(text) ||
    /^(?:show\s+(?:me\s+)?)?(?:the\s+)?(?:questions|things)\s+(?:you|muse)\s+(?:couldn['’]?t|could\s+not|can['’]?t|didn['’]?t)\s+answer$/i.test(text) ||
    /^what\s+(?:questions\s+)?(?:couldn['’]?t|could\s+not|can['’]?t)\s+(?:you|muse)\s+answer$/i.test(text)
  );
}

/** The chat message listing them. */
export function unansweredMessage(list) {
  if (!list.length) return "There are no questions I couldn't answer yet.";
  const lines = list
    .slice()
    .reverse()
    .map((item) => `- ${item.question} (${item.at}${item.reason ? `: ${item.reason}` : ""})`);
  return `Questions I couldn't answer (${list.length}, newest first). They're kept only in this browser; use Copy to send them on.\n${lines.join("\n")}`;
}

// The extension's own instructions (the user, 2026-10-04). "How to Set" comes first: where
// the key goes in the options, then "See below" leads into "How to Get".
export const AI_KEY_HELP_URL = "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension#How_to_Set_an_AI_API_Key";

/** What Genie says to a question that needs AI when there's no key: plain words and how to get one. */
export function needsAiKeyMessage({ withForm = false } = {}) {
  return {
    text: [
      "We need AI to respond to this. Add an AI API key in Genie's options. The link below shows how to get one and where to put it.",
      withForm
        ? "Without one, you can search WikiTree by filling in the boxes below, or pick a chart at the top."
        : "Without one, Genie can still find people by name, place or date and show the charts at the top.",
    ].join("\n"),
    actions: [{ label: "How to get and add an AI API key", actionType: "external-link", url: AI_KEY_HELP_URL }],
  };
}
