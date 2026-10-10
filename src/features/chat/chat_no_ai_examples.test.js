jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { createProfileSearchHandler } from "./chat_profile_search";
import { ChatIntent, routeChatPrompt } from "./chat_router";
import { classifyWtPrompt } from "./chat_search_mode";
import { NO_AI_EXAMPLE_SECTIONS, allNoAiExamples, isHelpPrompt, noAiExamplesHtml, noAiExamplesWikiText } from "./chat_no_ai_examples";
import { parseSearchSpecPrompt } from "./chat_spec_parser";
import { parseColumnRequest } from "./chat_requested_columns";
import { parseExportResultPrompt } from "./chat_router";


function makeHandler(overrides = {}) {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => false),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(),
    fetchPeoplePaged: jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Test-1",
          FirstName: "Test",
          LastNameAtBirth: "Example",
        },
      },
    ]),
    mapApiPersonToStandardRow: jest.fn((person, options = {}) => ({
      wtid: options.wtId || person?.Name || "",
      firstName: person?.FirstName || "",
      lnab: person?.LastNameAtBirth || "",
      lastNameCurrent: person?.LastNameCurrent || "",
      birth: "",
      death: "",
      birthLocation: person?.BirthLocation || "",
      deathLocation: person?.DeathLocation || "",
    })),
    makeStandardProfileTable: jest.fn((title, rows, defaultOrder = [[0, "asc"]]) => ({
      title,
      rows,
      defaultOrder,
      columns: [{ key: "wtid" }, { key: "firstName" }],
    })),
    makeAncestorProfileTable: jest.fn((title, rows, defaultOrder = [[0, "asc"]]) => ({
      title,
      rows,
      defaultOrder,
      columns: [{ key: "wtid" }, { key: "firstName" }],
    })),
    normalizeText: (value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    normalizeKnownDate: jest.fn((value) => value),
    showChatShaky: jest.fn(),
    hideChatShaky: jest.fn(),
    ...overrides,
  });
}

// Every example in the "What can I type?" list must work with no AI key: a
// chart or list the router handles itself, or a WikiTree+ search with the
// expected query.
const DETERMINISTIC = new Set(
  Object.values(ChatIntent).filter((v) => !["fallbackAi", "profileSearch", "lastResultOperation"].includes(v))
);

const WTPLUS_QUERIES = {
  "Devon 1820s": "Location=Devon",
  "Smith born in Kent before 1800": "LastNameAtBirth=Smith BirthLocation=Kent",
  "Devon births post-1850": "BirthLocation=Devon",
  "born in Ohio died in Texas 1900-1950": "BirthLocation=Ohio DeathLocation=Texas",
  "Who was born in Devon in 1820?": "BirthLocation=Devon B1820",
  "born before 1750 in Devon": "[Birth Date].AsNumber In 1..17499999",
  "died after 1900 in Liverpool": "[Death Date].AsNumber >= 19010000",
  "Cheshire profiles with no biography": "Suggestions=802",
  "England no birth or death date": 'Suggestions="131 132 133 134"',
  "Shropshire unsourced born in 1820s": "Unsourced Location=Shropshire",
  "Staffordshire 1850-1900 married but no children listed": "NoChildren",
  "Lancashire 1800-1899 spousal age gaps over 20 years": "[Spouses].[Birth Date]",
  "Flintshire siblings born less than 5 months apart": "[Siblings]",
  "Yorkshire miners": "CategoryWord=miner",
  "Chicago military": "CategoryWord=military",
  "Mary Smith 1820 Ohio": "FirstName=Mary BirthLocation=Ohio B1820",
  "women who died in Texas 1900-1950": "DeathLocation=Texas",
  "Kent farmers 1850s": "CategoryWord=Yeomen",
  "Irish farmers 1850s": "BirthLocation=Ireland",
  "twins born in Lancashire": "BirthLocation=Lancashire CategoryWord=Twins",
  "Devon centenarians": "Location=Devon CategoryWord=Centenarians",
  "profiles I manage with no sources": "Manager=User-1",
  "gold standard profiles in Devon": "Location=Devon ResearchGold",
  "profiles I manage with sources to review": "ResearchReview Manager=User-1",
  "profiles I manage with style issues": "bioCheckStyleIssues Manager=User-1",
  "Beacall emigrants to Australia": "DeathLocation=Australia NOT BirthLocation=Australia",
  "Scottish emigrants to Canada": "BirthLocation=Scotland DeathLocation=Canada",
  "Smith born in Ohio created in 2023 or 2024": "Created=Created_2024",
  "Garver born in Ohio created before 2012": "Created=Created_2011",
  "Garver profiles": "LastNameAtBirth=Garver",
  "profiles with last name Garver": "AllLastNames=Garver",
  "LastNameAtBirth=Garver": "LastNameAtBirth=Garver",
  // (these two ask born/married/died or surname first: the buttons' queries)
  "Devon profiles with no sources": "BirthLocation=Devon bioCheckUnsourced",
  "Kent profiles without a father": "AllLastNames=Kent NoFather",
  "Smith born 1850 Kent": "LastNameAtBirth=Smith BirthLocation=Kent B1850",
  "the Beacalls of Shropshire": "LastNameAtBirth=Beacalls Location=Shropshire",
  "Smith family from Kent": "LastNameAtBirth=Smith Location=Kent",
  "Irish people who went to America": "BirthLocation=Ireland DeathLocation=America",
  "people who left Ireland": "BirthLocation=Ireland NOT DeathLocation=Ireland",
  "profiles in Kent created this year": `Location=Kent Created=Created_${new Date().getFullYear()}`,
};

async function wtPlusQuery(prompt) {
  const target = await classifyWtPrompt({
    prompt,
    getChatAiConfig: async () => ({ key: "" }),
    isUnclaimed: (text) =>
      [ChatIntent.FALLBACK_AI, ChatIntent.PROFILE_SEARCH].includes(
        routeChatPrompt(text, { hasStructuredResult: false })?.intent
      ),
  });
  // (these look like questions about your own family to the router; chat_search_mode runs the reader for them with no key)
  const readerFirst = /\bemigrants\b/i.test(prompt) && Boolean(parseSearchSpecPrompt(prompt));
  if (target !== "wtplus" && !readerFirst) return `(${target})`;
  jest.clearAllMocks();
  wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "" } });
  const result = await makeHandler().tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
  if (!wtAPIProfileSearch.mock.calls.length) return (result?.actions || []).map((action) => action.wtPlusQuery).join(" ;; ");
  return wtAPIProfileSearch.mock.calls.map((call) => decodeURIComponent(call[1])).join(" ;; ");
}

const bySection = (id) => allNoAiExamples().filter((e) => e.section === id).map((e) => e.example);

describe("no-AI examples", () => {
  test.each(bySection("search"))("search: %s", async (prompt) => {
    expect(WTPLUS_QUERIES[prompt]).toBeTruthy();
    expect(await wtPlusQuery(prompt)).toContain(WTPLUS_QUERIES[prompt]);
  });

  test("columns", () => {
    expect(parseColumnRequest("Garver profiles with gender and privacy columns")).toEqual({
      keys: ["gender", "privacy"],
      rest: "Garver profiles",
    });
    expect(parseColumnRequest("add a privacy column")).toEqual({ keys: ["privacy"], rest: "" });
    expect(bySection("columns")).toEqual(["Garver profiles with gender and privacy columns", "add a privacy column"]);
  });

  test.each(bySection("followups"))("follow-up: %s", (prompt) => {
    if (/^export\b/.test(prompt)) {
      expect(parseExportResultPrompt(prompt)).toBeTruthy();
      return;
    }
    expect(routeChatPrompt(prompt, { hasStructuredResult: true })?.intent).toBe(ChatIntent.LAST_RESULT_OPERATION);
  });

  const handledByRouter = allNoAiExamples()
    .filter((e) => !["search", "columns", "followups"].includes(e.section))
    .map((e) => [e.section, e.example]);
  test.each(handledByRouter)("%s: %s", (section, prompt) => {
    expect(DETERMINISTIC.has(routeChatPrompt(prompt, { hasStructuredResult: false })?.intent)).toBe(true);
  });

  test("wiki text has a table per section and escapes brackets", () => {
    const text = noAiExamplesWikiText();
    expect(text.match(/^== /gm)).toHaveLength(NO_AI_EXAMPLE_SECTIONS.length);
    expect(text).toContain("&#91;place&#93;");
    expect(text).not.toMatch(/^\| .*\[place\]/m);
  });

  test("panel: a collapsed section per topic, every example a button", () => {
    document.body.innerHTML = noAiExamplesHtml();
    expect(document.querySelectorAll("details:not([open])")).toHaveLength(NO_AI_EXAMPLE_SECTIONS.length);
    const buttons = [...document.querySelectorAll("button.chat-example")];
    expect(buttons.map((b) => b.dataset.prompt)).toEqual(allNoAiExamples().map((e) => e.example));
    expect(buttons.filter((b) => b.dataset.needsResult).map((b) => b.dataset.prompt)).toEqual(
      allNoAiExamples().filter((e) => e.needsResult).map((e) => e.example)
    );
  });
});

test.each(["help", "Help", "?", "What can I type?", "what can I ask here", "what can Genie do?"])("help prompt: %s", (prompt) => {
  expect(isHelpPrompt(prompt)).toBe(true);
});
test.each(["Help profiles", "profiles with last name Help", "Help-1", "help me find my grandfather", "Help:WikiTree_Plus", "what can I do about brick walls?"])("not a help prompt: %s", (prompt) => {
  expect(isHelpPrompt(prompt)).toBe(false);
});
