import { bindFractalSearch, saveFractalPng, switchFractalWhich } from "./chat_fractal_common";

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test.each([
  [1400, 2600],
  [1600, 3000],
])("search cycles and resets matches with renderer timings %i/%i", (flyDuration, pulseDuration) => {
  jest.useFakeTimers();
  const search = document.createElement("input");
  const state = { matches: [], matchIndex: -1, pulse: null };
  let nodes = [
    { index: 4, person: { name: "Alice Smith", lnab: "Smith", wtid: "Smith-4" } },
    { index: 9, person: { name: "Bob Smith", lnab: "Smith", wtid: "Smith-9" } },
  ];
  const flyTo = jest.fn();
  const requestDraw = jest.fn();
  bindFractalSearch(search, {
    state,
    getNodes: () => nodes,
    lineOf: (index) => [index],
    flyTo,
    requestDraw,
    flyDuration,
    pulseDuration,
  });
  const enter = (value) => {
    search.value = value;
    search.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", cancelable: true }));
  };
  enter(" SMITH ");
  expect(flyTo).toHaveBeenLastCalledWith(4, flyDuration);
  enter("smith");
  expect(flyTo).toHaveBeenLastCalledWith(9, flyDuration);
  expect(search.title).toBe("2 of 2 (Enter for the next)");
  enter("smith");
  expect(flyTo).toHaveBeenLastCalledWith(4, flyDuration);
  jest.advanceTimersByTime(pulseDuration - 1);
  expect(state.pulse).toEqual([4]);
  jest.advanceTimersByTime(1);
  expect(state.pulse).toBeNull();
  expect(requestDraw).toHaveBeenCalledTimes(1);
  enter("missing");
  expect(search.title).toBe("No one on the tree matches");
  expect(flyTo).toHaveBeenCalledTimes(3);
  nodes = [{ index: 12, person: { name: "Carol Jones", lnab: "Jones", wtid: "Jones-12" } }];
  enter("jones");
  expect(flyTo).toHaveBeenLastCalledWith(12, flyDuration);
  expect(search.style.borderColor).toBe("");
  enter("   ");
  expect(flyTo).toHaveBeenCalledTimes(4);
});

test.each([false, true])("switch restores the button after loading, failure=%s", async (fail) => {
  const button = document.createElement("button");
  button.textContent = "Ancestors";
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  let settle;
  const pending = new Promise((resolve, reject) => {
    settle = fail ? reject : resolve;
  });
  const done = switchFractalWhich(button, () => pending);
  expect(button.disabled).toBe(true);
  expect(button.textContent).toBe("Loading…");
  settle(fail ? new Error("Could not load") : undefined);
  await done;
  expect(button.disabled).toBe(false);
  expect(button.textContent).toBe("Ancestors");
  expect(warn).toHaveBeenCalledTimes(fail ? 1 : 0);
});

test("PNG export downloads the view and removes its temporary link", () => {
  const canvas = { toDataURL: jest.fn(() => "data:image/png;base64,test") };
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
    expect(this.download).toBe("fractal-tree-Smith-4.png");
    expect(this.href).toBe("data:image/png;base64,test");
    expect(this.isConnected).toBe(true);
  });
  saveFractalPng(canvas, { person: { wtid: "Smith-4" } }, document.createElement("button"));
  expect(canvas.toDataURL).toHaveBeenCalledWith("image/png");
  expect(click).toHaveBeenCalledTimes(1);
  expect(document.querySelector('a[download="fractal-tree-Smith-4.png"]')).toBeNull();
});

test("a cross-origin canvas error gives a recovery hint without downloading", () => {
  const canvas = {
    toDataURL: () => {
      throw new window.DOMException("Tainted canvas", "SecurityError");
    },
  };
  const button = document.createElement("button");
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click");
  saveFractalPng(canvas, {}, button);
  expect(button.title).toContain("Zoom away from photos and try again");
  expect(click).not.toHaveBeenCalled();
});
