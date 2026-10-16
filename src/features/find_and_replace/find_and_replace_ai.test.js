jest.mock("../../core/options/options_storage", () => ({
  getFeatureOptions: jest.fn(async () => ({ aiProvider: "openai", openAIKey: "test-key" })),
}));

import { getFeatureOptions } from "../../core/options/options_storage";
import { askGenie, buildPrompt, canAskGenie, checkAnswer, parseAnswer } from "./find_and_replace_ai";

const ITALICS = {
  find: "(?<!\\*)\\*([^*\\s][^*\\n]*)\\*(?!\\*)",
  replace: "''$1''",
  mode: "regex",
  explanation: "Changes *words* to ''words''.",
  examples: [
    { before: "at *La Souche* near *Évreux*", after: "at ''La Souche'' near ''Évreux''" },
    { before: "5 * 3", after: "5 * 3" },
  ],
};
// The pattern Murray first tried: one match runs from the first * on a line to the last
const GREEDY = { ...ITALICS, find: "\\*((\\p{L}+).*)\\*" };

describe("reading the AI's answer", () => {
  test("plain JSON", () => {
    const answer = parseAnswer(JSON.stringify(ITALICS));
    expect(answer.search).toEqual({ find: ITALICS.find, replace: "''$1''", mode: "regex", matchCase: false, wholeWord: false });
    expect(answer.explanation).toBe(ITALICS.explanation);
    expect(answer.examples).toHaveLength(2);
  });

  test("in a code fence, with words around it", () => {
    const answer = parseAnswer("Here you are:\n```json\n" + JSON.stringify({ ...ITALICS, mode: "Regular expression" }) + "\n```\nHope it helps!");
    expect(answer.search.find).toBe(ITALICS.find);
    expect(answer.search.mode).toBe("regex");
    expect(parseAnswer(JSON.stringify({ find: "a", mode: "Wildcard" })).search.mode).toBe("wildcards");
    expect(parseAnswer(JSON.stringify({ find: "a", mode: "plain text" })).search.mode).toBe("text");
  });

  test("not JSON, or no find", () => {
    expect(parseAnswer("Sorry, I can't help with that.")).toBeNull();
    expect(parseAnswer("{ not json }")).toBeNull();
    expect(parseAnswer(JSON.stringify({ replace: "x" }))).toBeNull();
    expect(parseAnswer(JSON.stringify({ find: "", explanation: "Needs two searches." })).search.find).toBe("");
  });

  test("bad examples are dropped", () => {
    const answer = parseAnswer(JSON.stringify({ find: "a", examples: [{ before: "a" }, "b", { before: "a", after: "b" }] }));
    expect(answer.examples).toEqual([{ before: "a", after: "b" }]);
  });
});

describe("trying the answer", () => {
  test("a search that does what its examples say", () => {
    expect(checkAnswer(parseAnswer(JSON.stringify(ITALICS)))).toEqual([]);
  });

  test("a search that doesn't", () => {
    const problems = checkAnswer(parseAnswer(JSON.stringify(GREEDY)));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("''La Souche* near *Évreux''");
  });

  test("backslashes doubled once too often", () => {
    // As the AI wrote it for the • bullets: "^([ \\\\t]*)•[ \\\\t]?" in JSON, so [ \\t] in the regex
    const bullets = parseAnswer(String.raw`{"find": "^([ \\\\t]*)•[ \\\\t]?", "replace": "$1* ", "mode": "regex", "examples": [{"before": "• Census", "after": "* Census"}]}`);
    expect(bullets.search.find).toBe(String.raw`^([ \\t]*)•[ \\t]?`);
    const problems = checkAnswer(bullets);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^Find has \\\\ \(two backslashes\)/);
    // unless the user is looking for backslashes, or it's a plain text search
    expect(checkAnswer(bullets, { backslashes: true })).toEqual([]);
    expect(checkAnswer({ ...bullets, search: { ...bullets.search, find: "a\\\\b", mode: "text" }, examples: [] })).toEqual([]);
    // and in Replace with
    const newline = parseAnswer(String.raw`{"find": "<br>", "replace": "\\\\n", "mode": "regex", "examples": []}`);
    expect(checkAnswer(newline)[0]).toMatch(/^Replace with has/);
    expect(checkAnswer(parseAnswer(String.raw`{"find": "<br>", "replace": "\\n", "mode": "regex", "examples": []}`))).toEqual([]);
  });

  test("a pattern that doesn't work", () => {
    expect(checkAnswer(parseAnswer(JSON.stringify({ find: "(", mode: "regex", examples: [] })))[0]).toMatch(/^Find doesn't work as a regex search/);
  });
});

describe("the prompt", () => {
  test("has the request, the selection and the panel's search", () => {
    const prompt = buildPrompt({
      request: "change *text* to ''text''",
      selected: "*La Souche Caplan*",
      current: { find: "\\*(.*)\\*", replace: "''$1''", mode: "regex", matchCase: true, wholeWord: false },
    });
    expect(prompt).toContain("What the user wants: change *text* to ''text''");
    expect(prompt).toContain('"""\n*La Souche Caplan*\n"""');
    expect(prompt).toContain("Find: \\*(.*)\\*\nReplace with: ''$1''\nMode: regex (match case)");
    expect(prompt).toContain("\\p{L}");
    expect(prompt).not.toContain("Your last answer");
  });

  test("says what went wrong last time", () => {
    const answer = parseAnswer(JSON.stringify(GREEDY));
    const prompt = buildPrompt({ request: "italics", retry: { answer, problems: checkAnswer(answer) } });
    expect(prompt).toContain("Your last answer was:");
    expect(prompt).toContain("Replace all gives");
  });
});

describe("asking", () => {
  let replies;
  beforeEach(() => {
    replies = [];
    global.chrome = {
      runtime: { sendMessage: jest.fn(async () => replies.shift()) },
    };
  });

  test("with an AI key", async () => {
    expect(await canAskGenie()).toBe(true);
    getFeatureOptions.mockResolvedValueOnce({});
    expect(await canAskGenie()).toBe(false);
    // Ollama on this computer needs no key
    getFeatureOptions.mockResolvedValueOnce({ aiProvider: "ollama" });
    expect(await canAskGenie()).toBe(true);
  });

  test("Genie's AI off switch is Genie's own", async () => {
    localStorage.setItem("wbe-genie-ai-paused", "1");
    try {
      expect(await canAskGenie()).toBe(true);
      replies.push({ success: true, response: JSON.stringify(ITALICS) });
      expect((await askGenie({ request: "italics" })).search.find).toBe(ITALICS.find);
    } finally {
      localStorage.removeItem("wbe-genie-ai-paused");
    }
  });

  test("a good answer is used as it is", async () => {
    replies.push({ success: true, response: JSON.stringify(ITALICS) });
    const result = await askGenie({ request: "italics" });
    expect(result.search.find).toBe(ITALICS.find);
    expect(result.problems).toEqual([]);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    expect(chrome.runtime.sendMessage.mock.calls[0][0]).toMatchObject({ action: "chatWithAI", provider: "openai", key: "test-key" });
  });

  test("a wrong answer goes back once, and the better one is used", async () => {
    replies.push({ success: true, response: JSON.stringify(GREEDY) }, { success: true, response: JSON.stringify(ITALICS) });
    const result = await askGenie({ request: "italics" });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
    expect(chrome.runtime.sendMessage.mock.calls[1][0].prompt).toContain("Your last answer was:");
    expect(result.search.find).toBe(ITALICS.find);
    expect(result.problems).toEqual([]);
  });

  test("doubled backslashes go back too, unless the user asked about backslashes", async () => {
    const doubled = { find: "^([ \\\\t]*)•", replace: "$1* ", mode: "regex", examples: [] };
    const fixed = { ...doubled, find: "^([ \\t]*)•" };
    replies.push({ success: true, response: JSON.stringify(doubled) }, { success: true, response: JSON.stringify(fixed) });
    const result = await askGenie({ request: "• to *" });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
    expect(result.search.find).toBe("^([ \\t]*)•");
    expect(result.problems).toEqual([]);

    replies.push({ success: true, response: JSON.stringify(doubled) });
    expect((await askGenie({ request: "find \\t", selected: "" })).problems).toEqual([]);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
  });

  test("still wrong after that: the problems come back with it", async () => {
    replies.push({ success: true, response: JSON.stringify(GREEDY) }, { success: true, response: JSON.stringify(GREEDY) });
    const result = await askGenie({ request: "italics" });
    expect(result.search.find).toBe(GREEDY.find);
    expect(result.problems).toHaveLength(1);
  });

  test("the AI fails, or answers in words", async () => {
    replies.push({ success: false, error: "Invalid API key" });
    await expect(askGenie({ request: "x" })).rejects.toThrow("Genie couldn't answer: Invalid API key");
    replies.push({ success: true, response: "I would use a regular expression." });
    await expect(askGenie({ request: "x" })).rejects.toThrow("couldn't be read");
  });
});
