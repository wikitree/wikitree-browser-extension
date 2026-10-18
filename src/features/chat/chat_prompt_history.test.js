import {
  addPromptToHistory,
  caretOnFirstLine,
  countPromptUse,
  mostUsedPrompts,
  pinnedFirst,
  promptStatsStorageKey,
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

// "Most used" and pinned favourites (the user, 2026-10-18)
describe("use counts", () => {
  test("counts by question, any case or spacing, keeping the latest wording", () => {
    let uses = countPromptUse({}, "my fan chart", 1);
    uses = countPromptUse(uses, "My  fan chart", 2);
    expect(uses["my fan chart"]).toEqual({ text: "My  fan chart", uses: 2, last: 2 });
  });
  test("drops the least used past the limit", () => {
    let uses = {};
    ["a", "a", "b", "c"].forEach((text, index) => (uses = countPromptUse(uses, text, index, 2)));
    expect(Object.keys(uses).sort()).toEqual(["a", "c"]);
  });
  test("most used first; ties and uncounted ones keep the newest-first order", () => {
    let uses = {};
    ["b", "c", "c", "gone", "gone", "gone"].forEach((text, index) => (uses = countPromptUse(uses, text, index)));
    expect(mostUsedPrompts(["a", "b", "c"], uses)).toEqual(["gone", "c", "a", "b"]);
  });
  test("pinned first", () => {
    expect(pinnedFirst(["a", "b", "c"], ["c", "z"])).toEqual(["c", "z", "a", "b"]);
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

describe("the store's counts and pins", () => {
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

  test("counts each ask, pins, and keeps pins through Clear", async () => {
    stored[promptHistoryStorageKey("x")] = ["old one"];
    const store = createPromptHistoryStore(() => "x");
    await store.load();
    store.add("my fan chart");
    store.add("my watchlist");
    store.add("my fan chart");
    expect(store.list()).toEqual(["my fan chart", "my watchlist", "old one"]);
    expect(store.mostUsed()).toEqual(["my fan chart", "my watchlist", "old one"]);
    expect(store.uses("my fan chart")).toBe(2);
    expect(store.uses("old one")).toBe(1);
    store.togglePin("old one");
    expect(store.isPinned("Old One")).toBe(true);
    expect(stored[promptStatsStorageKey("x")].pinned).toEqual(["old one"]);
    store.clear();
    expect(store.list()).toEqual([]);
    expect(store.pinned()).toEqual(["old one"]);
    store.togglePin("old one");
    expect(store.pinned()).toEqual([]);
  });

  test("remove takes the count and the pin too", async () => {
    const store = createPromptHistoryStore(() => "x");
    await store.load();
    store.add("a");
    store.add("a");
    store.togglePin("a");
    store.remove("a");
    expect(store.list()).toEqual([]);
    expect(store.pinned()).toEqual([]);
    expect(stored[promptStatsStorageKey("x")].uses).toEqual({});
  });

  test("counts and pins saved earlier are loaded, adding to any counted before the read finished", async () => {
    stored[promptHistoryStorageKey("x")] = ["a"];
    stored[promptStatsStorageKey("x")] = { uses: { a: { text: "a", uses: 3, last: 1 } }, pinned: ["fav"] };
    const store = createPromptHistoryStore(() => "x");
    store.add("a");
    await store.load();
    expect(store.uses("a")).toBe(4);
    expect(store.pinned()).toEqual(["fav"]);
  });
});
