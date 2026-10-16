import {
  addPromptToHistory,
  caretOnFirstLine,
  caretOnLastLine,
  createHistoryStepper,
  createPromptHistoryStore,
  filterPromptHistory,
  promptHistoryStorageKey,
} from "./chat_prompt_history";

describe("addPromptToHistory", () => {
  test("puts the newest first and moves a repeat to the top", () => {
    let list = [];
    list = addPromptToHistory(list, "Ted's fan chart");
    list = addPromptToHistory(list, "my watchlist");
    list = addPromptToHistory(list, "  ted's  FAN chart ");
    expect(list).toEqual(["ted's  FAN chart", "my watchlist"]);
  });

  test("ignores blanks and keeps at most the limit", () => {
    expect(addPromptToHistory(["a"], "   ")).toEqual(["a"]);
    expect(addPromptToHistory(["b", "c", "d"], "a", 3)).toEqual(["a", "b", "c"]);
  });
});

describe("filterPromptHistory", () => {
  const list = ["Smiths born in Kent in the 1850s", "Ted's fan chart", "Mary Smith's fan chart"];

  test("every word, anywhere, any case", () => {
    expect(filterPromptHistory(list, "fan smith")).toEqual(["Mary Smith's fan chart"]);
    expect(filterPromptHistory(list, "KENT")).toEqual(["Smiths born in Kent in the 1850s"]);
  });

  test("nothing typed: everything", () => {
    expect(filterPromptHistory(list, " ")).toEqual(list);
  });
});

describe("createHistoryStepper", () => {
  test("steps back, forward, and gives back what was half-typed", () => {
    const list = ["newest", "middle", "oldest"];
    const stepper = createHistoryStepper(() => list);
    expect(stepper.newer()).toBeNull();
    expect(stepper.older("half")).toBe("newest");
    expect(stepper.older("newest")).toBe("middle");
    expect(stepper.older("middle")).toBe("oldest");
    expect(stepper.older("oldest")).toBeNull();
    expect(stepper.newer()).toBe("middle");
    expect(stepper.newer()).toBe("newest");
    expect(stepper.newer()).toBe("half");
    expect(stepper.active).toBe(false);
  });

  test("Escape gives back the draft", () => {
    const stepper = createHistoryStepper(() => ["a", "b"]);
    stepper.older("draft");
    stepper.older("a");
    expect(stepper.cancel()).toBe("draft");
    expect(stepper.active).toBe(false);
    expect(stepper.cancel()).toBeNull();
  });

  test("an empty history goes nowhere", () => {
    const stepper = createHistoryStepper(() => []);
    expect(stepper.older("x")).toBeNull();
    expect(stepper.active).toBe(false);
  });
});

describe("caret lines", () => {
  test("first and last line", () => {
    expect(caretOnFirstLine("one line", 3, 3)).toBe(true);
    expect(caretOnFirstLine("one\ntwo", 5, 5)).toBe(false);
    expect(caretOnFirstLine("one", 0, 2)).toBe(false);
    expect(caretOnLastLine("one\ntwo", 5, 5)).toBe(true);
    expect(caretOnLastLine("one\ntwo", 1, 1)).toBe(false);
  });
});

describe("createPromptHistoryStore", () => {
  let stored;
  beforeEach(() => {
    stored = {};
    global.chrome = {
      runtime: {},
      storage: {
        local: {
          get: jest.fn((keys, callback) => callback(Object.fromEntries(keys.map((key) => [key, stored[key]])))),
          set: jest.fn((values) => Object.assign(stored, values)),
        },
      },
    };
  });
  afterEach(() => {
    delete global.chrome;
  });

  test("keeps each user's questions apart", async () => {
    const store = createPromptHistoryStore(() => "Beacall-6");
    await store.load();
    store.add("my fan chart");
    expect(stored[promptHistoryStorageKey("Beacall-6")]).toEqual(["my fan chart"]);
    expect(promptHistoryStorageKey("")).toBe("wbeGeniePromptHistory:anonymous");
  });

  test("loads saved questions, keeping any asked before the read finished on top", async () => {
    stored[promptHistoryStorageKey("Beacall-6")] = ["older one", "my fan chart"];
    const store = createPromptHistoryStore(() => "Beacall-6");
    store.add("my fan chart");
    await store.load();
    expect(store.list()).toEqual(["my fan chart", "older one"]);
  });

  test("remove and clear", async () => {
    stored[promptHistoryStorageKey("x")] = ["a", "b"];
    const store = createPromptHistoryStore(() => "x");
    await store.load();
    store.remove("a");
    expect(store.list()).toEqual(["b"]);
    store.clear();
    expect(stored[promptHistoryStorageKey("x")]).toEqual([]);
  });
});
