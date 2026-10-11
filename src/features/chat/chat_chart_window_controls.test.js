/** @jest-environment jsdom */
import { chartPopupControls, useWikiTreeButtons } from "./chat_chart_common";

function chartPopup() {
  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup wbe-chart-popup";
  popup.innerHTML = `<div class="chat-popup-header"><strong>Fan chart</strong><div class="chat-popup-controls">
    <button type="button" class="small" data-act="reset">Reset</button>${chartPopupControls()}</div></div><div class="chat-popup-body"></div>`;
  document.body.appendChild(popup);
  return popup;
}

describe("chart window controls (user, 2026-10-11: no one pressed Full screen)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("a size button beside Full screen, which is an icon, not a WikiTree text button", () => {
    const popup = chartPopup();
    useWikiTreeButtons(popup);
    const full = popup.querySelector('[data-act="full"]');
    const size = popup.querySelector(".wbe-chart-size");
    expect(size).not.toBeNull();
    expect(size.nextElementSibling).toBe(full);
    expect(full.classList.contains("btn")).toBe(false);
    expect(full.title).toMatch(/\bF\b/);
    expect(popup.querySelector('[data-act="reset"]').classList.contains("btn")).toBe(true);
    useWikiTreeButtons(popup);
    expect(popup.querySelectorAll(".wbe-chart-size")).toHaveLength(1);
  });

  test("the size button makes the window smaller and back, and the chart never sees the click", () => {
    const popup = chartPopup();
    useWikiTreeButtons(popup);
    const chartClick = jest.fn();
    popup.addEventListener("click", chartClick);
    const size = popup.querySelector(".wbe-chart-size");
    size.click();
    expect(popup.classList.contains("wbe-chart-small")).toBe(true);
    expect(size.title).toBe("Larger window");
    size.click();
    expect(popup.classList.contains("wbe-chart-small")).toBe(false);
    expect(chartClick).not.toHaveBeenCalled();
  });
});
