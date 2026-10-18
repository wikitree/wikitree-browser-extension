import { mountRecentList } from "./chat_recent_list";

function makeStore(items) {
  let list = items.slice();
  return {
    list: () => list,
    load: () => Promise.resolve(list),
    remove: (text) => (list = list.filter((item) => item !== text)),
    clear: () => (list = []),
  };
}

function key(target, name) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
}

describe("mountRecentList", () => {
  let container;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(() => container.remove());

  test("filters as you type and Enter puts the chosen question in the box", async () => {
    const onChoose = jest.fn();
    const recent = mountRecentList({ container, store: makeStore(["Ted's fan chart", "my watchlist", "Mary's fan chart"]), onChoose });
    await recent.open();
    const filter = container.querySelector(".chat-recent-filter");
    expect(container.querySelectorAll(".chat-recent-item")).toHaveLength(3);
    filter.value = "fan";
    filter.dispatchEvent(new Event("input"));
    expect(container.querySelectorAll(".chat-recent-item")).toHaveLength(2);
    key(filter, "ArrowDown");
    key(filter, "Enter");
    expect(onChoose).toHaveBeenCalledWith("Mary's fan chart");
    expect(recent.isOpen()).toBe(false);
  });

  test("Escape closes only the list", async () => {
    const outer = jest.fn();
    container.addEventListener("keydown", outer);
    const recent = mountRecentList({ container, store: makeStore(["a"]), onChoose: jest.fn() });
    await recent.open();
    key(container.querySelector(".chat-recent-filter"), "Escape");
    expect(recent.isOpen()).toBe(false);
    expect(outer).not.toHaveBeenCalled();
  });

  test("× removes one; Clear needs a second click", async () => {
    const store = makeStore(["a", "b"]);
    const recent = mountRecentList({ container, store, onChoose: jest.fn() });
    await recent.open();
    container.querySelector('.chat-recent-remove[data-index="0"]').click();
    expect(store.list()).toEqual(["b"]);
    const clear = container.querySelector(".chat-recent-clear");
    clear.click();
    expect(store.list()).toEqual(["b"]);
    clear.click();
    expect(store.list()).toEqual([]);
    expect(container.querySelector(".chat-recent-empty").textContent).toMatch(/Nothing yet/);
  });
});


// "Most used" and pinned favourites (the user, 2026-10-18)
describe("Most used and pins", () => {
  let container;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(() => container.remove());

  function statsStore() {
    const list = ["c", "b", "a"];
    const uses = { a: 5, b: 2, c: 1 };
    let pinned = [];
    return {
      list: () => list,
      load: () => Promise.resolve(list),
      mostUsed: () => [...list].sort((x, y) => uses[y] - uses[x]),
      uses: (text) => uses[text] || 1,
      pinned: () => pinned,
      isPinned: (text) => pinned.includes(text),
      togglePin: (text) => (pinned = pinned.includes(text) ? pinned.filter((item) => item !== text) : [...pinned, text]),
      remove: () => {},
      clear: () => {},
    };
  }
  const texts = () => [...container.querySelectorAll(".chat-recent-text")].map((el) => el.textContent);

  test("Most used orders by count and shows it; ☆ pins to the top of both", async () => {
    const recent = mountRecentList({ container, store: statsStore(), onChoose: jest.fn() });
    await recent.open();
    expect(texts()).toEqual(["c", "b", "a"]);
    container.querySelector('.chat-recent-view[data-view="most"]').click();
    expect(texts()).toEqual(["a", "b", "c"]);
    expect(container.querySelector(".chat-recent-uses").textContent).toBe("5×");
    expect(container.querySelector(".chat-recent-uses").title).toBe("Asked 5 times");
    container.querySelector('.chat-recent-pin[data-index="2"]').click();
    expect(texts()).toEqual(["c", "a", "b"]);
    expect(container.querySelector('.chat-recent-pin[data-index="0"]').getAttribute("aria-pressed")).toBe("true");
    container.querySelector('.chat-recent-view[data-view="recent"]').click();
    expect(texts()).toEqual(["c", "b", "a"]);
    expect(container.querySelector(".chat-recent-uses")).toBeNull();
  });
});
