import { needsAiKeyMessage, parseAiAnswer, promptNameCandidates, parseUnansweredPrompt, suggestionActions, unansweredMessage } from "./chat_answer";

describe("AI answers in words", () => {
  test("a plain answer passes through", () => {
    expect(parseAiAnswer("General background: Liverpool in the 1850s was a busy port.")).toEqual({
      text: "General background: Liverpool in the 1850s was a busy port.",
      cannot: false,
      suggestions: [],
    });
  });

  test("[CANNOT] and SUGGEST are read out of the reply", () => {
    const reply = "[CANNOT] His profile doesn't say where he is buried.\nSUGGEST: Beacall-6's sources | Family Explorer for Beacall-6";
    expect(parseAiAnswer(reply)).toEqual({
      text: "His profile doesn't say where he is buried.",
      cannot: true,
      suggestions: ["Beacall-6's sources", "Family Explorer for Beacall-6"],
    });
  });

  test("bold SUGGEST, quotes, duplicates, at most three", () => {
    const parsed = parseAiAnswer('Answer.\n**SUGGEST:** "a" | b | b | c | d');
    expect(parsed.suggestions).toEqual(["a", "b", "c"]);
    expect(parsed.text).toBe("Answer.");
    expect(suggestionActions(["a"])).toEqual([{ label: "a", actionType: "send-prompt", prompt: "a", newSearch: true }]);
  });

  test("the unanswered list command", () => {
    expect(parseUnansweredPrompt("Unanswered questions")).toBe(true);
    expect(parseUnansweredPrompt("What couldn't you answer?")).toBe(true);
    expect(parseUnansweredPrompt("questions you couldn't answer")).toBe(true);
    expect(parseUnansweredPrompt("What was Liverpool like then?")).toBe(false);
    expect(unansweredMessage([])).toMatch(/no questions/);
    expect(unansweredMessage([{ question: "Q1", at: "2026-10-04", reason: "" }, { question: "Q2", at: "2026-10-04", reason: "no AI key" }])).toMatch(/- Q2 \(2026-10-04: no AI key\)\n- Q1/);
  });
});

describe("needsAiKeyMessage", () => {
  test("says the question needs a key and links to where to get one", () => {
    const { text, actions } = needsAiKeyMessage();
    expect(text.split("\n")[0]).toBe("We need AI to respond to this. Add an AI API key in Genie's options. The link below shows how to get one and where to put it.");
    expect(needsAiKeyMessage({ withForm: true }).text).toMatch(/filling in the boxes below/);
    expect(actions).toEqual([
      { label: "How to get and add an AI API key", actionType: "external-link", url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension#How_to_Set_an_AI_API_Key" },
    ]);
  });
});

test("a SUGGEST line run on after the answer is still read out", () => {
  expect(parseAiAnswer("Hello! How can I help with WikiTree? SUGGEST: show Philip Beacall's relatives | find profiles by name")).toEqual({
    text: "Hello! How can I help with WikiTree?",
    cannot: false,
    suggestions: ["show Philip Beacall's relatives", "find profiles by name"],
  });
});

describe("names in a request", () => {
  test("a question word that starts the sentence is not a name", () => {
    expect(promptNameCandidates("Where did Philip live?")).toEqual(["Philip"]);
    expect(promptNameCandidates("Did Philip Beacall move to Birkenhead?")).toEqual(["Philip Beacall", "Birkenhead"]);
    expect(promptNameCandidates("Why did Philip move to Birkenhead?")).toEqual(["Philip", "Birkenhead"]);
  });

  test("longer names come first and repeats are dropped", () => {
    expect(promptNameCandidates("Was Martha Teece the wife of Philip? Martha Teece")).toEqual(["Martha Teece", "Philip"]);
    expect(promptNameCandidates("what is a gedcom?")).toEqual([]);
  });
});
