/**
 * @jest-environment jsdom
 */
import { createChartPopup, placeNewChart } from "./chat_chart_common";

const chart = (id) => {
  const popup = document.createElement("div");
  popup.id = id;
  popup.className = "wbe-popup chat-popup wbe-chart-popup";
  document.body.appendChild(popup);
  return popup;
};

describe("one chart window at a time", () => {
  beforeEach(() => (document.body.innerHTML = ""));

  test("a new chart closes the open one and takes its place and size", () => {
    const first = chart("wbe-fan-popup");
    placeNewChart(first);
    Object.assign(first.style, { left: "40px", top: "60px", width: "700px", height: "500px" });
    first.classList.add("wbe-chart-small");
    const second = chart("wbe-name-cloud-popup");
    placeNewChart(second);
    expect(document.querySelectorAll(".wbe-chart-popup")).toHaveLength(1);
    expect(first.isConnected).toBe(false);
    expect(second.style).toMatchObject({ left: "40px", top: "60px", width: "700px", height: "500px" });
    expect(second.classList.contains("wbe-chart-small")).toBe(true);
  });

  test("redrawing the same chart keeps its place too", () => {
    const first = createChartPopup({ id: "wbe-lifespans-popup", html: "<div></div>" });
    Object.assign(first.style, { left: "12px", top: "34px" });
    const again = createChartPopup({ id: "wbe-lifespans-popup", html: "<div></div>" });
    expect(document.querySelectorAll("#wbe-lifespans-popup")).toHaveLength(1);
    expect(again.style).toMatchObject({ left: "12px", top: "34px" });
  });

  test("other popups (Genie, results) stay open", () => {
    const genie = document.createElement("div");
    genie.className = "wbe-popup chat-popup";
    document.body.appendChild(genie);
    placeNewChart(chart("wbe-fan-popup"));
    expect(genie.isConnected).toBe(true);
  });
});
