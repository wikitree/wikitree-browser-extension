import $ from "jquery";
import { createChartPopup, mountChartPopup, closeChartPopup, toggleChartFullScreen } from "./chat_chart_common";

const html =
  '<div class="chat-popup-header"><strong class="wbe-chart-title"></strong></div><div class="chat-popup-body"></div>';

afterEach(() => {
  document.querySelectorAll(".wbe-chart-popup").forEach(closeChartPopup);
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test("replacing a fullscreen chart releases its resources once", () => {
  const previous = createChartPopup({ id: "test-chart", html });
  const cleanup = jest.fn();
  mountChartPopup(previous, cleanup);
  toggleChartFullScreen(previous);
  const removeListener = jest.spyOn(document, "removeEventListener");
  const next = createChartPopup({ id: "test-chart", html });
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(previous.isConnected).toBe(false);
  expect(previous.classList.contains("wbe-chart-full")).toBe(false);
  expect(removeListener).toHaveBeenCalledWith("keydown", expect.any(Function), true);
  expect(removeListener).toHaveBeenCalledWith("fullscreenchange", expect.any(Function));
  expect(document.getElementById("test-chart")).toBe(next);
  closeChartPopup(previous);
  expect(cleanup).toHaveBeenCalledTimes(1);
});

test("close destroys the drag widget and removes the popup", () => {
  const original = $.fn.draggable;
  const draggable = jest.fn(function (options) {
    if (options === "destroy") this.removeData("ui-draggable");
    else this.data("ui-draggable", {});
    return this;
  });
  $.fn.draggable = draggable;
  try {
    const popup = createChartPopup({ id: "test-chart", html });
    mountChartPopup(popup, jest.fn());
    expect(draggable).toHaveBeenCalledWith({ handle: ".chat-popup-header", containment: "window", scroll: false });
    closeChartPopup(popup);
    expect(draggable).toHaveBeenLastCalledWith("destroy");
    expect(popup.isConnected).toBe(false);
  } finally {
    $.fn.draggable = original;
  }
});

test("a renderer cleanup error still removes the popup", () => {
  const popup = createChartPopup({ id: "test-chart", html });
  mountChartPopup(popup, () => {
    throw new Error("cleanup failed");
  });
  expect(() => closeChartPopup(popup)).toThrow("cleanup failed");
  expect(popup.isConnected).toBe(false);
});

test("replacement disconnects resize observation and cancels renderer work", () => {
  jest.useFakeTimers();
  const original = window.ResizeObserver;
  const disconnect = jest.fn();
  const observe = jest.fn();
  window.ResizeObserver = jest.fn(() => ({ observe, disconnect }));
  try {
    const popup = createChartPopup({ id: "test-chart", html });
    const work = jest.fn();
    const timer = setTimeout(work, 3000);
    const frame = requestAnimationFrame(work);
    const resize = jest.fn();
    mountChartPopup(
      popup,
      () => {
        clearTimeout(timer);
        cancelAnimationFrame(frame);
      },
      { stage: popup.querySelector(".chat-popup-body"), resize }
    );
    expect(observe).toHaveBeenCalledWith(popup.querySelector(".chat-popup-body"));
    expect(window.ResizeObserver).toHaveBeenCalledWith(resize);
    createChartPopup({ id: "test-chart", html });
    expect(disconnect).toHaveBeenCalledTimes(1);
    jest.runAllTimers();
    expect(work).not.toHaveBeenCalled();
  } finally {
    window.ResizeObserver = original;
  }
});
