// What Genie understands with no AI key: patterns and examples, grouped. Shown
// in Genie ("What can I type?") and on the WikiTree Space page. Every example
// is checked by chat_no_ai_examples.test.js, so only wordings that work are listed.
// [brackets] in a pattern are the parts to replace.

import { escapeText } from "./chat_text_utils";

export const NO_AI_EXAMPLE_SECTIONS = [
  {
    id: "search",
    title: "Search WikiTree",
    intro:
      "Search all of WikiTree (through WikiTree+) with a place, dates and a condition. Short searches work best: Genie reads every word, and if one doesn't fit it asks you to fill in the search form instead of guessing. Places can be countries, counties, states or towns. Dates can be years, ranges (1800-1850) or decades (1820s).",
    items: [
      { pattern: "[place] [decade or years]", examples: ["Devon 1820s"] },
      { pattern: "[surname] born / died in [place] before or after [year]", examples: ["Smith born in Kent before 1800"] },
      { pattern: "[place] births / deaths [years]", examples: ["Devon births post-1850"] },
      { pattern: "born in [place] died in [place] [years]", examples: ["born in Ohio died in Texas 1900-1950"] },
      { pattern: "Who was born / died in [place] in [year]?", examples: ["Who was born in Devon in 1820?", "Who else died in Motueka in 1898?"] },
      {
        pattern: "how many [search]?",
        examples: ["How many profiles have the surname Alley?", "How many people were born in Kent in 1820?"],
        note: "The search runs and says how many profiles it found.",
      },
      { pattern: "born / died before or after [year] in [place]", examples: ["born before 1750 in Devon", "died after 1900 in Liverpool"] },
      { pattern: "[place] profiles with no biography", examples: ["Cheshire profiles with no biography"] },
      {
        pattern: "[place] profiles with [status]",
        examples: ["Devon profiles with no sources", "Kent profiles without a father", "Lancashire profiles with no death date born before 1850"],
        note: "On its own, Genie first asks whether you meant born, married or died there, or a surname (Kent is both). With dates beside it, Genie searches the place and offers the surname as a button when WikiTree has people by that name.",
      },
      { pattern: "[surname] born [year] [place]", examples: ["Smith born 1850 Kent"] },
      { pattern: "the [surname]s of [place] / the [surname] family from [place]", examples: ["the Beacalls of Shropshire", "Smith family from Kent"] },
      { pattern: "[place] no birth or death date", examples: ["England no birth or death date"] },
      { pattern: "[search] with no birth date / no death date", examples: ["Edwards profiles with no birth date", "born in Devon with no death date"] },
      {
        pattern: "Category: [name] (with or without children / parents / a spouse, [status], born / died [place or years])",
        examples: ["Category: Mayflower Passengers no parents", "Who is in the Salem Witch Trials category?", "Category: Pennsylvania Quakers died before 1800"],
      },
      {
        pattern: "Category: [name] and its subcategories",
        examples: ["Category: Pennsylvania Quakers and its subcategories"],
        note: "The category and every category inside it.",
      },
      {
        pattern: "category word [word]",
        examples: ["category word Huguenot"],
        note: "Any category with that word in its name.",
      },
      {
        pattern: "[search] with a Research Status: gold standard / gold standard candidates / silver standard / help requested / sources to review / unfinished / no research status",
        examples: ["gold standard profiles in Devon", "profiles I manage with sources to review"],
        note: "The Research Status members set at the top of a profile.",
      },
      {
        pattern: "[search] with style issues",
        examples: ["profiles I manage with style issues"],
        note: "Biographies that WikiTree's Bio Check finds style problems in. \"No sources\" uses Bio Check too.",
      },
      { pattern: "[place] [status] born in [decade]", examples: ["Shropshire unsourced born in 1820s"] },
      { pattern: "[place] [years] married but no children listed", examples: ["Staffordshire 1850-1900 married but no children listed"] },
      { pattern: "[place] [years] spousal age gaps over [number] years", examples: ["Lancashire 1800-1899 spousal age gaps over 20 years"] },
      { pattern: "[place] siblings born less than [number] months apart", examples: ["Flintshire siblings born less than 5 months apart"] },
      { pattern: "[place] [occupation or group]", examples: ["Yorkshire miners", "Chicago military"] },
      { pattern: "[first name] [surname] [year] [place]", examples: ["Mary Smith 1820 Ohio"] },
      { pattern: "women / men who died in [place] [years]", examples: ["women who died in Texas 1900-1950"] },
      {
        pattern: "[place] [farmers / sailors / doctors / teachers / clergy] [years]",
        examples: ["Kent farmers 1850s"],
        note: "Matches WikiTree's category words for the job, such as Farmers, Yeomen and Husbandmen.",
      },
      {
        pattern: "[place] [twins / triplets / centenarians / convicts]",
        examples: ["twins born in Lancashire", "Devon centenarians"],
        note: "WikiTree has categories for these groups.",
      },
      {
        pattern: "[nationality] [occupation or emigrants] [years]",
        examples: ["Irish farmers 1850s"],
        note: "A nationality is read as born in that country (Irish = born in Ireland). About 60 nationalities are known.",
      },
      {
        pattern: "[surname] emigrated / emigrants to or from [place]",
        examples: ["Beacall emigrants to Australia", "Scottish emigrants to Canada", "Irish people who went to America", "people who left Ireland"],
        note: "\"Went to\", \"moved to\" and \"settled in\" work the same way, and \"left\" means from. To a place means died there and not born there; from a place means born there and not died there. With no place, \"Beacall emigrants\" looks in WikiTree's Emigrants category.",
      },
      {
        pattern: "[search] created in / before / after [year]",
        examples: ["Smith born in Ohio created in 2023 or 2024", "Garver born in Ohio created before 2012", "profiles in Kent created this year"],
        note: "When the profile was created on WikiTree (2008 on). Needs a name or place beside it.",
      },
      {
        pattern: "[surname] profiles",
        examples: ["Garver profiles", "profiles with last name Garver", "people with the surname Alley born in Nelson"],
        note: "A surname matches any last name, married names included; say \"with last name at birth Garver\" for the birth name only. A plural surname works too: Genie counts both spellings on WikiTree+, so \"the Smiths\" finds the Smith family.",
      },
      {
        pattern: "profiles I manage [with a condition or place]",
        examples: ["profiles I manage with no sources"],
        note: "Read from your watchlist when you're signed in to WikiTree Apps (the Apps button); otherwise from WikiTree+. Private profiles can only be shown when you're signed in to Apps. A big watchlist takes a minute or two to read the first time; Genie then keeps it for a few hours (\"refresh my watchlist\" reads it again).",
      },
      {
        pattern: "profiles I created / created by [WikiTree ID] [with a condition or place]",
        examples: ["How many profiles have I created?", "profiles I created in 2023"],
        note: "Searched on WikiTree+, so it covers public profiles. \"I\" is you when you're signed in to WikiTree.",
      },
      {
        pattern: "profiles managed by [project or WikiTree ID] [with a condition or place]",
        examples: ["profiles managed by the Mayflower Project with no sources"],
        note: "A project is searched as its account (the Mayflower Project is WikiTree-9).",
      },
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
      { pattern: "count them by [country / surname / decade / birth place]", examples: ["count them by country", "group them by birth place"] },
      { pattern: "the most common [first name / surname / birth place]", examples: ["What was the most common first name?"] },
      {
        pattern: "which of them [married / never married / had children / have no parents]?",
        examples: ["Which of them married?", "Which ones had children?"],
        note: "Looks up each person's family on WikiTree (up to 2,000 people). After a WikiTree+ search, \"how many have no sources?\" or \"which ones have no parents?\" asks WikiTree+ itself.",
      },
      { pattern: "which of them [died young / lived past 90 / died under 5]?", examples: ["Which of them died young?"], note: "Young means 15 or under." },
      { pattern: "show them in a table", examples: ["show them in a table"] },
      { pattern: "export as [CSV / Excel / JSON]", examples: ["export as CSV"] },
    ],
  },
  {
    id: "charts",
    title: "Charts",
    intro:
      "Every chart works for you (\"my\"), the profile you're on (\"her\", \"his\", or no name), a relative (\"his son John's\", \"my mother's\") or anyone else (a WikiTree ID).",
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
      { pattern: "count two names as one", examples: ["count Smith as Smit", "ungroup Smith", "show my name groupings"] },
      { pattern: "family calendar", examples: ["family calendar"] },
      { pattern: "tree overview", examples: ["tree overview", "Tell me about my tree"] },
      {
        pattern: "[my / his / her] [relative] [first name]'s [chart]",
        examples: ["his son John's lifespans", "my mother's fan chart", "her husband's tree overview"],
        note: "The name is only needed when there is more than one (two sons, say); Genie asks if it can't tell.",
      },
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
      { pattern: "did any of [my / his / her] children die young / emigrate?", examples: ["Did any of her children die young?", "Which of his children emigrated?", "Did any of my ancestors emigrate?"] },
      { pattern: "stepchildren; children after a husband or wife died", examples: ["Who were her stepchildren?", "Did she have any children after her first husband died?"] },
      { pattern: "brick walls", examples: ["brick walls", "my ancestors with a missing parent"] },
      { pattern: "my CC7", examples: ["my CC7"] },
      { pattern: "my / his / her CC7 born / died / in [place]", examples: ["his CC7 born in Ontario", "how many of my CC7 died in Kent"] },
      {
        pattern: "birthdays and anniversaries",
        examples: ["on this day in my family", "who in my family was born in March", "Who was born on this day?"],
        note: "WikiTree can't be searched by day and month, so \"who was born on this day?\" looks in the profile's family.",
      },
      {
        pattern: "who else is buried in [this / her] cemetery?",
        examples: ["Who else is buried in this cemetery?"],
        note: "Searches WikiTree+ for the profile's cemetery category.",
      },
      { pattern: "about the profile you're on", examples: ["her children", "When did she marry?", "How old was he when his first child was born?"] },
      {
        pattern: "when / where was [his / her] [relative] born / did they die",
        examples: [
          "Where was his father born?",
          "When did her mother pass away?",
          "Where was his son John born?",
          "When was her eldest daughter born?",
          "Where was his paternal grandfather born?",
          "Where was his wife's father from?",
          "his mother's dates",
          "How old was his mother when he was born?",
        ],
        note: "Also: dad, mum, kids; first / second wife; youngest brother; \"birthplace of her mother\".",
      },
      {
        pattern: "check for profiles / find [his / her] family on WikiTree",
        examples: ["check for profiles", "find his family on WikiTree", "are her parents on WikiTree?"],
        note: "Reads the parents, wife or husband, children and siblings named in the biography, searches WikiTree for each, and checks the profile for duplicates.",
      },
    ],
  },
  {
    id: "relationships",
    title: "Relationships and connections",
    intro: "Use WikiTree IDs (like Cook-8721) when a name is common, or add a birth year and place after the name.",
    items: [
      {
        pattern: "how am I related to [person]? / my connection to [person]",
        examples: [
          "how am I related to Cook-8721?",
          "how is Maloney-2332 related to McKusick-36?",
          "my connection to Cook-8721",
          "connection between Cook-8721 and Milliken-62",
          "connection to Bob Jones in Liverpool 1923",
          "relationship to Bob Jones (1923-1990)",
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
  {
    id: "wikitree",
    title: "Questions about WikiTree",
    intro: "Answers come from WikiTree's FAQ pages, short facts checked against its Help pages, and its Help search, each with a link. Genie shows the FAQ question it matched, so you can check it's the one you meant.",
    items: [
      { pattern: "what is [a WikiTree term]?", examples: ["What is a PPP?", "What does LNAB stand for?", "What is an orphan profile?"] },
      { pattern: "how do I [do something on WikiTree]?", examples: ["How do I merge two profiles?", "How do I add a source?"] },
      { pattern: "about WikiTree itself", examples: ["Who founded WikiTree?", "Is WikiTree free?", "What happens to my research when I die?"] },
      { pattern: "about Genie", examples: ["What is Genie?", "What is WBE?"] },
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

/** The "What can I type?" panel inside Genie: a collapsible section per topic; examples are buttons. */
export function noAiExamplesHtml() {
  const sections = NO_AI_EXAMPLE_SECTIONS.map((section) => {
    const rows = section.items
      .map((item) => {
        const needsResult = Boolean(section.needsResult || item.needsResult);
        const examples = item.examples
          .map(
            (example) =>
              `<button type="button" class="chat-message-action chat-example" data-prompt="${escapeText(example)}"${
                needsResult ? ' data-needs-result="1"' : ""
              }>${escapeText(example)}</button>`
          )
          .join("");
        return `<li><span class="chat-example-pattern">${escapeText(item.pattern)}</span>${
          item.note ? ` <span class="chat-ai-help-note">${escapeText(item.note)}</span>` : ""
        }<div class="chat-example-buttons">${examples}</div></li>`;
      })
      .join("");
    return `<details>
      <summary>${escapeText(section.title)}</summary>
      ${section.intro ? `<p>${escapeText(section.intro)}</p>` : ""}
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
