// "Show me around" (2026-10-16): Genie plays its own demo, for new users and for demo videos made
// without a face or voice. Each step types a question into the box letter by letter, sends it, waits
// for the answer or chart, does a little on screen (hovers, clicks), then moves on by itself.
// The tour never changes anything: no groupings, saved settings or profile edits.
// This file is the plan and the runner; chat_tour_ui.js is the caption, pointer and events.

export const SHOW_ME_AROUND = "Show me around";

const TOUR_WORDS = String.raw`(?:show\s+me\s+around|(?:give\s+me|take\s+me\s+on)\s+(?:a|the)\s+tour|(?:take\s+)?(?:a|the)\s+tour|tour|demo|show\s+me\s+a\s+demo)`;
// The short tours, one feature each: the words for each ("show me around the Surname River", "search tour").
const TOUR_FEATURES = [
  ["river", String.raw`(?:the\s+)?surname\s+river`],
  ["explorer", String.raw`(?:the\s+)?family\s+explorer`],
  ["search", String.raw`(?:no[\s-]ai\s+)?search(?:es|ing)?`],
  ["edit", String.raw`(?:the\s+)?edit(?:ing)?\s+page|editing`],
  ["ai", String.raw`(?:with\s+)?(?:the\s+)?ai`],
  ["picker", String.raw`(?:the\s+)?(?:about\s+)?picker|choosing\s+(?:who|people|someone)|(?:the\s+)?about\s+(?:button|menu)`],
];

/**
 * Which tour a prompt asks for: "first" ("show me around", "give me a tour", "take the tour", "demo"),
 * "river", "explorer", "search", "edit", "ai" or "picker" ("show me around the Surname River", "tour of the edit page",
 * "search tour", "show me around with AI", "show me around the picker"), or null.
 */
export function tourFor(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/, "")
    .replace(/^please\s+/i, "")
    .replace(/,?\s+please$/i, "")
    .replace(/\s+/g, " ");
  if (new RegExp(`^${TOUR_WORDS}$`, "i").test(text)) return "first";
  const found = TOUR_FEATURES.find(([, words]) =>
    new RegExp(String.raw`^(?:${TOUR_WORDS}\s+(?:(?:of|around|for)\s+)?(?:${words})|(?:${words})\s+(?:tour|demo))$`, "i").test(text)
  );
  return found ? found[0] : null;
}

/** Whether a prompt asks for a tour (tourFor). */
export function isTourPrompt(prompt) {
  return Boolean(tourFor(prompt));
}

/**
 * Who the tour is about, from Genie's picker person ({wtId, name, isMe}): kind "me" (your own tree),
 * "profile" (the page's profile, asked about by first name, as the welcome buttons do) or "picked"
 * (someone chosen in the picker, asked about by WikiTree ID). null without a person.
 */
export function tourSubject(person, { onPageProfile = false } = {}) {
  if (!person?.wtId) return null;
  if (person.isMe) return { kind: "me", wtId: person.wtId, first: "you" };
  const first = String(person.name || person.wtId).trim().split(/\s+/)[0] || person.wtId;
  return { kind: onPageProfile ? "profile" : "picked", wtId: person.wtId, first };
}

const RIVER = "#wbe-surname-river-popup";
const EXPLORER = "#wbe-fractal-popup";
const FAN = "#wbe-fan-popup";
const RIVER_LEGEND = `${RIVER} .wbe-chart-legend span`;
const RIVER_BAND = `${RIVER} .wbe-chart-stage svg g[clip-path] path`;
const EXPLORER_VIEW = (key) => `${EXPLORER} [data-view="${key}"]`;
const PLAQUES_OFF = `${EXPLORER} [data-shape="plaques"][aria-pressed="false"]`; // (when another 3D shape was used last)
// A Family view card to move to (not the person in the middle, "↑ Parents", "+3 more" or a private one).
const FAMILY_CARD = `${EXPLORER} .wbe-nav-card:not(.wbe-nav-centre):not(.wbe-nav-up):not(.wbe-nav-more):not(.wbe-nav-nub):not(.wbe-nav-hidden)`;
const WELCOME_CHIP = ".chat-welcome-chips .chat-message-action";
const WHO_BUTTON = ".chat-who-button";
const WHO_ITEM = ".chat-who-menu:not([hidden]) .chat-who-item";
const WHAT_CAN_I_TYPE = "What can I type?";

/** How the tours say whose: the prompts' "my" / "Johannes's" / "Smit-641's", and the captions' "your" / "Johannes's". */
function subjectWords(subject) {
  const me = subject.kind === "me";
  // ("the surnames", "the Family Explorer": the page's profile, as "the" means there)
  const chartWhose = me ? "my " : subject.kind === "profile" ? "the " : `${subject.wtId}'s `;
  return {
    whose: me ? "my" : subject.kind === "profile" ? `${subject.first}'s` : `${subject.wtId}'s`,
    chartWhose,
    riverWhose: me ? "my family's " : chartWhose,
    who: me ? "your" : `${subject.first}'s`,
  };
}

/**
 * The first tour's steps for a tourSubject (about two minutes). A step: {caption, needs? (a selector:
 * the step is left out without it), welcome? (Genie's welcome buttons again), point? (a selector to move
 * the pointer to; pointText: the one with that text), prompt?, waitFor? (a selector that appears when the
 * chart is drawn), settle? (ms for the chart's own animation), hold ("read": time to read Genie's answer,
 * or ms), followUp? (sent as a follow-up to the step before, not a new question), actions?, end?}.
 * An action: {caption?, hover|click (a selector) | key (a key name, pressed on the element `on`, `times`
 * times), pick?, text?, has?, sweep?, waitFor?, settle?, optional?, hold?}; one with no target is just a caption
 * and a hold. pick: "largest" or an index among the matches; text: the match with that text; has: the first
 * match containing it; sweep: where
 * (fractions of its width) a hover wanders to next. Without its target (or its waitFor) the step's later
 * actions are left out, as they build on it, unless it is optional.
 */
export function firstTourSteps(subject) {
  const { whose, chartWhose, riverWhose, who } = subjectWords(subject);
  return [
    {
      caption: `Ask Genie about anyone in the tree. Here: ${who} grandparents.`,
      prompt: `Who were ${whose} grandparents?`,
      hold: "read",
    },
    {
      caption: `The Family Explorer shows ${who} family in several ways.`,
      prompt: `Show ${chartWhose}Family Explorer`,
      waitFor: `${EXPLORER} [data-view="family"]`,
      settle: 1500,
      hold: 2000,
      actions: [
        { caption: "Family: cards round one person. Click anyone to move to them.", click: `${EXPLORER} [data-view="family"]`, hold: 4500 },
        { caption: "3D: a plaque for each ancestor, turning slowly.", click: `${EXPLORER} [data-view="3d"]`, waitFor: `${EXPLORER} .wbe-3d-canvas`, hold: 400 },
        // (when another 3D shape was used last)
        { click: `${EXPLORER} [data-shape="plaques"][aria-pressed="false"]`, optional: true },
        { hold: 5000 },
        { caption: "The arrow keys walk the tree: ↑ goes up to a parent.", key: "ArrowUp", on: `${EXPLORER} .wbe-3d`, times: 2, hold: 3500 },
      ],
    },
    {
      caption: "Genie draws the surnames flowing down through the ancestors, oldest generation on the left.",
      prompt: `How did ${riverWhose}surnames change over the generations?`,
      waitFor: `${RIVER} .wbe-chart-legend span`,
      settle: 2200,
      hold: 2500,
      actions: [
        { caption: "Hover over a band to see its numbers.", hover: `${RIVER} .wbe-chart-stage svg g[clip-path] path`, pick: "largest", sweep: [0.75, 0.3], hold: 2500 },
        { caption: "Click a name in the key for that surname's card.", click: `${RIVER} .wbe-chart-legend span`, pick: 1, hold: 5500 },
      ],
    },
    {
      caption: "Charts ▾ opens any other chart for the same person.",
      needs: `${RIVER} .wbe-chart-menu-button`,
      actions: [
        { click: `${RIVER} .wbe-chart-menu-button`, hold: 1500 },
        { click: `${RIVER} .wbe-chart-menu [role="menuitem"]`, text: "Fan", waitFor: `${FAN} .wbe-chart-root`, settle: 1500 },
        { caption: `The fan chart: ${who} ancestors, a ring for each generation.`, hold: 3500 },
      ],
    },
    {
      caption: "Full screen: any chart can fill the window.",
      needs: `${FAN} [data-act="full"]`,
      actions: [
        { click: `${FAN} [data-act="full"]`, hold: 4500 },
        { caption: "The same button (or Esc) brings it back.", click: `${FAN} [data-act="full"]`, hold: 2000 },
      ],
    },
    {
      caption: "No AI key needed for short searches: a surname, a place, a decade.",
      prompt: "Smiths born in Devon in the 1850s",
      hold: 6000,
    },
    {
      caption: 'That\'s the tour. Ask Genie anything, or click "What can I type?" for ideas.',
      welcome: true,
      point: ".chat-welcome-chips .chat-message-action",
      pointText: "What can I type?",
      hold: 6000,
      end: true,
    },
  ];
}

// The short tours (2026-10-16): one feature each, a clip each, about a minute. Later steps say what
// they need, so a chart that didn't open leaves them out rather than captioning nothing.

/** The Surname River: hover, Share, spellings grouped and not, another generation, a surname's card. */
export function riverTourSteps(subject) {
  const { riverWhose, who } = subjectWords(subject);
  const variants = `${RIVER} .wbe-chart-switch[data-act="variants"]`;
  const more = `${RIVER} [data-act="more"]:not([disabled])`;
  return [
    {
      caption: `The Surname River: the surnames in ${who} tree, flowing down the generations.`,
      prompt: `How did ${riverWhose}surnames change over the generations?`,
      waitFor: RIVER_LEGEND,
      settle: 2200,
      hold: 2500,
      actions: [
        { caption: "Each band is a surname, as wide as the number of ancestors who had it. Hover for its numbers.", hover: RIVER_BAND, pick: "largest", sweep: [0.75, 0.3], hold: 2500 },
        { caption: "Share (100%): each surname's part of its generation.", click: `${RIVER} .wbe-chart-mode[data-mode="share"]`, hold: 4000 },
        { click: `${RIVER} .wbe-chart-mode[data-mode="stream"]`, hold: 1500 },
      ],
    },
    {
      caption: "Spellings of one surname share a band. Switched off, each spelling has its own.",
      needs: variants,
      actions: [
        { click: variants, hold: 4500 },
        { caption: "On again: the spellings together.", click: variants, hold: 3500 },
      ],
    },
    {
      caption: "+ goes back another generation (− one fewer).",
      needs: more,
      actions: [{ click: more, waitFor: `${RIVER} [data-act="fewer"]:not([disabled])`, settle: 2200, hold: 2000 }],
    },
    {
      caption: "Click a name in the key for that surname's card.",
      needs: RIVER_LEGEND,
      actions: [{ click: RIVER_LEGEND, pick: 1, hold: 5500 }],
    },
    {
      caption: "That's the Surname River. Charts ▾ opens the other charts for the same person.",
      point: `${RIVER} .wbe-chart-menu-button`,
      hold: 5000,
      end: true,
    },
  ];
}

/** The Family Explorer: Branches (coloured by country), Family (a click moves), Galaxy, 3D (keys, Tornado). */
export function explorerTourSteps(subject) {
  const { chartWhose, who } = subjectWords(subject);
  const open = EXPLORER_VIEW("family");
  return [
    {
      caption: `The Family Explorer: ${who} family in four views.`,
      prompt: `Show ${chartWhose}Family Explorer`,
      waitFor: open,
      settle: 1500,
      hold: 1500,
      actions: [
        { caption: "Trees: each family a tree, with the children budding off it.", click: EXPLORER_VIEW("tree"), hold: 4500 },
        { caption: "Colour it by birth country (or birth year, or surname).", click: `${EXPLORER} .wbe-chart-mode[data-mode="country"]`, optional: true, hold: 4500 },
      ],
    },
    {
      caption: "Family: one person with their parents, brothers and sisters, husband or wife, and children.",
      needs: open,
      actions: [
        { click: EXPLORER_VIEW("family"), hold: 4000 },
        { caption: "Click anyone to move to them.", click: FAMILY_CARD, pick: "largest", hold: 4500 },
      ],
    },
    {
      caption: "Galaxy: everyone loaded, as stars round one person: ancestors above, descendants below.",
      needs: open,
      actions: [{ click: EXPLORER_VIEW("galaxy"), hold: 5500 }],
    },
    {
      caption: "3D: a plaque for each ancestor, turning slowly.",
      needs: open,
      actions: [
        { click: EXPLORER_VIEW("3d"), waitFor: `${EXPLORER} .wbe-3d-canvas`, hold: 400 },
        { click: PLAQUES_OFF, optional: true },
        { hold: 4500 },
        { caption: "The arrow keys walk the tree: ↑ goes up to a parent.", key: "ArrowUp", on: `${EXPLORER} .wbe-3d`, times: 2, hold: 3000 },
        { caption: "Tornado: the ancestors twisting up, a generation a level.", click: `${EXPLORER} [data-shape="tornado"]`, hold: 5500 },
      ],
    },
    {
      caption: "That's the Family Explorer. The search box finds anyone on the tree.",
      point: `${EXPLORER} .wbe-fractal-search`,
      hold: 5000,
      end: true,
    },
  ];
}

/** Searches that need no AI key: a surname, profiles that need work, a category, a count; then the list. */
export function searchTourSteps() {
  return [
    {
      caption: "With no AI key, Genie understands short searches of all of WikiTree: a surname, a place, a date.",
      prompt: "Smith born in Kent before 1800",
      hold: 6000,
    },
    { caption: "Profiles that need work: unsourced, no biography, no parents…", prompt: "Shropshire unsourced born in 1820s", hold: 6000 },
    { caption: "A category, with conditions.", prompt: "Category: Mayflower Passengers no parents", hold: 6000 },
    { caption: "Or just how many.", prompt: "How many people were born in Rutland in 1820?", hold: "read" },
    {
      caption: `That's searching. "${WHAT_CAN_I_TYPE}" lists every kind of search Genie understands.`,
      welcome: true,
      actions: [{ click: WELCOME_CHIP, text: WHAT_CAN_I_TYPE, hold: 7000 }],
      end: true,
    },
  ];
}

/**
 * On a profile's edit page: the Gold Standard checklist (with where the form and biography differ), then the
 * birth and a sibling list written from the form (shown, not inserted).
 */
export function editTourSteps() {
  return [
    {
      caption: "On the edit page, Genie checks the profile against the Gold Standard, and the form against the biography.",
      prompt: "What's missing?",
      hold: "read",
    },
    {
      caption: "It writes the birth and parents from the form. Nothing goes into the biography until you press Insert.",
      needs: '#editToolbarExt a.editToolbarClick[data-id="Birth and Parent Details"]',
      prompt: "Add birth",
      hold: "read",
    },
    {
      caption: "Or a list from the family: here, the brothers and sisters.",
      needs: '#editToolbarExt a.editToolbarClick[data-id="Sibling List"]',
      prompt: "Add siblings",
      hold: "read",
    },
    {
      caption: 'That\'s Genie on the edit page. After you edit, "Change explanation" writes one from what you changed.',
      welcome: true,
      point: ".chat-edit-chips .chat-message-action",
      pointText: "Change explanation",
      hold: 6000,
      end: true,
    },
  ];
}

/**
 * With an AI key (2026-10-16, the user: "Shouldn't we show things that use AI?"): a question about someone's life
 * and times, a follow-up to it, a famous person found by name, a long search in plain English, and the AI switch. The
 * captions say what kind of answer comes, never its words: AI answers differ from run to run.
 */
export function aiTourSteps(subject) {
  const me = subject.kind === "me";
  const name = me ? "" : subject.kind === "profile" ? subject.first : subject.wtId;
  return [
    // (questions only the AI answers: "who were his great-grandparents?" is a list Genie's own code makes, user 2026-10-16)
    {
      caption: "With an AI key, ask Genie about someone's life and times, in your own words.",
      prompt: me ? "What was daily life like where my ancestors lived?" : `What was daily life like where ${name} lived?`,
      hold: "read",
    },
    {
      caption: "Ask a follow-up: Genie remembers who you were talking about.",
      prompt: "What big events would the family have lived through?",
      followUp: true,
      hold: "read",
    },
    {
      caption: "Name someone famous: the AI finds their profile.",
      prompt: me ? "How am I related to Charles Darwin?" : `How is ${name} related to Charles Darwin?`,
      hold: "read",
    },
    {
      caption: "Longer searches in plain English: AI turns them into a WikiTree+ search.",
      prompt: "Anyone named Pretorius who was born at the Cape before 1800",
      hold: "read",
    },
    {
      caption: "AI is optional. This switch turns it off, so you can see Genie as someone without a key.",
      point: "#wbe-genie-ai-toggle",
      hold: 6000,
      end: true,
    },
  ];
}

/**
 * The "About ▾" picker above the box (user, 2026-10-16: "the user asks about themself or one of the other
 * people on the page or someone from their watchlist"): someone from the page (the father), then you (your
 * fan chart), then someone from your watchlist (with both years: not a living person), then back to this
 * profile. Whoever was chosen before the tour is chosen again after it (chat.js).
 */
export function pickerTourSteps(subject) {
  const { who } = subjectWords(subject);
  const open = { click: WHO_BUTTON, waitFor: WHO_ITEM, hold: 1400 };
  return [
    {
      caption: `Genie answers about whoever is chosen here. Pick anyone on the page: here, ${who} father.`,
      point: WHO_BUTTON,
      hold: 1500,
      actions: [open, { click: WHO_ITEM, has: "· father", hold: 900 }],
    },
    { caption: "Now a question without a name is about him.", prompt: "Who were his parents?", hold: "read" },
    {
      caption: `Or ${who} mother.`,
      actions: [open, { click: WHO_ITEM, has: "· mother", hold: 900 }],
    },
    { caption: "Then ask about her.", prompt: "Where was she born?", hold: "read" },
    {
      caption: "Choose this profile again to come back to it.",
      actions: [open, { click: WHO_ITEM, has: "this profile", hold: 2500 }],
    },
    { caption: "Questions with “my” or “I” are about you.", prompt: "My connection to Tom Cruise", hold: "read" },
    { caption: "Or how you're related to anyone, by WikiTree ID.", prompt: "My relationship to Beacall-123", hold: "read", end: true },
  ];
}

/**
 * The tours by tourFor's name: steps(subject), whether it needs a person (a profile, someone picked, or
 * you), whether it runs only on a profile's edit page, and whether it needs AI (a key, switched on).
 */
export const TOURS = {
  first: { steps: firstTourSteps, person: true },
  river: { steps: riverTourSteps, person: true },
  explorer: { steps: explorerTourSteps, person: true },
  search: { steps: searchTourSteps },
  edit: { steps: editTourSteps, editPage: true },
  ai: { steps: aiTourSteps, person: true, ai: true },
  picker: { steps: pickerTourSteps, person: true },
};
