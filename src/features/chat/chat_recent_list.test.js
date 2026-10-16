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
