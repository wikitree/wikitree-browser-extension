// What Genie understands with no AI key: patterns and examples, grouped. Shown
// in Genie ("What can I type?") and on the WikiTree Space page. Every example
// is checked by chat_no_ai_examples.test.js, so only wordings that work are listed.
// [brackets] in a pattern are the parts to replace.

export const NO_AI_EXAMPLE_SECTIONS = [
  {
    id: "search",
    title: "Search WikiTree",
    intro:
      "Search all of WikiTree (through WikiTree+) with a place, dates and a condition. Places can be countries, counties, states or towns. Dates can be years, ranges (1800-1850) or decades (1820s).",
    items: [
      { pattern: "[place] [decade or years]", examples: ["Devon 1820s"] },
      { pattern: "born / died before or after [year] in [place]", examples: ["born before 1750 in Devon", "died after 1900 in Liverpool"] },
      { pattern: "[place] profiles with no biography", examples: ["Cheshire profiles with no biography"] },
      { pattern: "[place] no birth or death date", examples: ["England no birth or death date"] },
      { pattern: "[place] [status] born in [decade]", examples: ["Shropshire unsourced born in 1820s"] },
      { pattern: "[place] [years] married but no children listed", examples: ["Staffordshire 1850-1900 married but no children listed"] },
      { pattern: "[place] [years] spousal age gaps over [number] years", examples: ["Lancashire 1800-1899 spousal age gaps over 20 years"] },
      { pattern: "[place] siblings born less than [number] months apart", examples: ["Flintshire siblings born less than 5 months apart"] },
      { pattern: "[place] [occupation or group]", examples: ["Yorkshire miners", "Chicago military"] },
      { pattern: "[surname] profiles", examples: ["Garver profiles", "profiles with last name Garver"] },
      {
        pattern: "WikiTree+ search text",
        examples: ["LastNameAtBirth=Garver"],
        note: "Anything you would type into WikiTree+'s own search box also works.",
      },
    ],
  },
  {
    id: "columns",
    title: "Extra columns",
    intro:
      "Add details to a results table: gender, privacy, living, created, last changed, research status, photo, managers, Trusted List, categories, templates, father status, mother status and more.",
    items: [
      { pattern: "[any list] with [detail] and [detail] columns", examples: ["Garver profiles with gender and privacy columns"] },
      { pattern: "add a [detail] column (to the last result)", examples: ["add a privacy column"], needsResult: true },
    ],
  },
  {
    id: "followups",
    title: "Working with a result",
    intro: "After a list of people, narrow it down, sort it, count it or save it.",
    needsResult: true,
    items: [
      { pattern: "only the [women / men]", examples: ["only the women"] },
      { pattern: "born in [decade or years]", examples: ["born in the 1850s"] },
      { pattern: "sort by [birth / death / name]", examples: ["sort by birth"] },
      { pattern: "count them by [country / surname / decade]", examples: ["count them by country"] },
      { pattern: "show them in a table", examples: ["show them in a table"] },
      { pattern: "export as [CSV / Excel / JSON]", examples: ["export as CSV"] },
    ],
  },
  {
    id: "charts",
    title: "Charts",
    intro:
      "Every chart works for you (\"my\"), the profile you're on (\"her\", \"his\", or no name) or anyone else (a WikiTree ID).",
    items: [
      { pattern: "fan chart", examples: ["fan chart", "Cook-8721 fan chart"] },
      { pattern: "Family Explorer", examples: ["Family Explorer"] },
      { pattern: "descendant chart", examples: ["descendant chart", "Cook-8721 descendants"] },
      { pattern: "family timeline / lifespans", examples: ["family timeline", "lifespans"] },
      { pattern: "ancestors in history", examples: ["What history did my ancestors live through?"] },
      { pattern: "lives and ages", examples: ["lives and ages"] },
      { pattern: "migration map", examples: ["map my ancestors", "where were my ancestors living in 1850?", "map her descendants"] },
      { pattern: "where your ancestors came from", examples: ["where did my ancestors come from?"] },
      { pattern: "names", examples: ["name cloud", "surname river"] },
      { pattern: "family calendar", examples: ["family calendar"] },
      { pattern: "tree overview", examples: ["tree overview", "Tell me about my tree"] },
    ],
  },
  {
    id: "family",
    title: "Family, relatives and ancestors",
    intro: "Family words work for you (\"my\"), the profile you're on (\"her\", \"his\") or anyone named by WikiTree ID.",
    items: [
      { pattern: "my [nth] cousins (born / died in [place])", examples: ["my 3rd cousins born in England", "my 2nd cousins once removed"] },
      { pattern: "[number] generations of my ancestors / descendants", examples: ["7 generations of my ancestors", "10 generations of my descendants"] },
      { pattern: "my ancestors who lived past / died under [age]", examples: ["my ancestors who lived past 90", "my ancestors who died under 5"] },
      { pattern: "brick walls", examples: ["brick walls", "my ancestors with a missing parent"] },
      { pattern: "my CC7", examples: ["my CC7"] },
      { pattern: "birthdays and anniversaries", examples: ["on this day in my family", "who in my family was born in March"] },
      { pattern: "about the profile you're on", examples: ["her children", "When did she marry?", "How old was he when his first child was born?"] },
      {
        pattern: "find [his / her] family on WikiTree",
        examples: ["find his family on WikiTree", "are her parents on WikiTree?"],
        note: "Reads the parents, wife or husband, children and brothers and sisters named in the biography, and searches WikiTree for each.",
      },
    ],
  },
  {
    id: "relationships",
    title: "Relationships and connections",
    intro: "Use WikiTree IDs (like Cook-8721) when a name is common.",
    items: [
      {
        pattern: "how am I related to [person]? / my connection to [person]",
        examples: [
          "how am I related to Cook-8721?",
          "how is Maloney-2332 related to McKusick-36?",
          "my connection to Cook-8721",
          "connection between Cook-8721 and Milliken-62",
        ],
        note: "Finds how two people are connected on WikiTree.",
      },
    ],
  },
  {
    id: "dna",
    title: "DNA",
    items: [
      { pattern: "DNA confirmed ancestors", examples: ["which of my ancestors are DNA confirmed?"] },
      { pattern: "Y-DNA and mtDNA lines", examples: ["Y & mt lines"] },
      { pattern: "X-DNA", examples: ["Who could I have inherited X-DNA from?"] },
      { pattern: "who could take a DNA test for [person]?", examples: ["who could take a DNA test for Cook-8721?"] },
    ],
  },
  {
    id: "health",
    title: "Your tree's health",
    intro: "Based on WikiTree's Gold Standard checklist.",
    items: [
      { pattern: "how complete is my tree?", examples: ["How complete is my tree?", "completeness heatmap"] },
      { pattern: "which of my ancestors need help?", examples: ["Which of my ancestors need help?"] },
    ],
  },
];

export function allNoAiExamples() {
  return NO_AI_EXAMPLE_SECTIONS.flatMap((section) =>
    section.items.flatMap((item) =>
      item.examples.map((example) => ({ section: section.id, example, needsResult: Boolean(section.needsResult || item.needsResult) }))
    )
  );
}

/** "help", "what can I type?", "what can Genie do?": open the examples panel. */
export function isHelpPrompt(text) {
  return /^\s*(?:help|\?|what\s+can\s+i\s+(?:type|ask|say)(?:\s+here)?|what\s+can\s+(?:you|genie)\s+do)\s*[?.!]*\s*$/i.test(String(text || ""));
}

const escapeHtml = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The "What can I type?" panel inside Genie: a collapsible section per topic; examples are buttons. */
export function noAiExamplesHtml() {
  const sections = NO_AI_EXAMPLE_SECTIONS.map((section) => {
    const rows = section.items
      .map((item) => {
        const needsResult = Boolean(section.needsResult || item.needsResult);
        const examples = item.examples
          .map(
            (example) =>
              `<button type="button" class="chat-message-action chat-example" data-prompt="${escapeHtml(example)}"${
                needsResult ? ' data-needs-result="1"' : ""
              }>${escapeHtml(example)}</button>`
          )
          .join("");
        return `<li><span class="chat-example-pattern">${escapeHtml(item.pattern)}</span>${
          item.note ? ` <span class="chat-ai-help-note">${escapeHtml(item.note)}</span>` : ""
        }<div class="chat-example-buttons">${examples}</div></li>`;
      })
      .join("");
    return `<details>
      <summary>${escapeHtml(section.title)}</summary>
      ${section.intro ? `<p>${escapeHtml(section.intro)}</p>` : ""}
      <ul class="chat-example-list">${rows}</ul>
    </details>`;
  }).join("");
  return `<div class="chat-ai-help chat-examples-help" role="dialog" aria-labelledby="chat-examples-title">
    <button type="button" class="small chat-ai-help-close" aria-label="Close" title="Close">&times;</button>
    <h3 id="chat-examples-title">Genie Help</h3>
    <p>Genie searches WikiTree and draws charts of your family. Type a request in the box at the bottom, or pick a chart from the buttons.</p>
    <h4>What can I type?</h4>
    <p>These all work, with or without an AI key. Replace the parts in [brackets] with your own places, dates, names and WikiTree IDs. Click an example to try it.</p>
    ${sections}
    <h4>The buttons at the top</h4>
    <ul>
      <li><b>AI Off / On</b>: with an AI key, Genie also understands questions in your own words and can answer from biographies. Switch it off to see Genie as someone without a key does.</li>
      <li><b>Clear</b> starts a new conversation.</li>
    </ul>
    <div class="chat-ai-help-actions">
      <button type="button" class="small chat-help-ai-key">About AI keys</button>
    </div>
  </div>`;
}

/** WikiTree wiki markup for the Space page. */
export function noAiExamplesWikiText() {
  const lines = [
    "'''What you can type in Genie without an AI key.''' Replace the parts in [brackets]. Every example below is checked automatically, so they all work as written. With an AI key, Genie also understands requests worded in other ways.",
    "",
  ];
  NO_AI_EXAMPLE_SECTIONS.forEach((section) => {
    lines.push(`== ${section.title} ==`);
    if (section.intro) lines.push(section.intro, "");
    lines.push('{| class="wikitable"', "! What to type !! Examples");
    section.items.forEach((item) => {
      const examples = item.examples.map((example) => `<code>${example}</code>`).join("<br>");
      lines.push("|-", `| ${item.pattern.replace(/\[/g, "&#91;").replace(/\]/g, "&#93;")}${item.note ? `<br><small>${item.note}</small>` : ""} || ${examples}`);
    });
    lines.push("|}", "");
  });
  return lines.join("\n");
}
