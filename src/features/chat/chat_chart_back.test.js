/**
 * @jest-environment jsdom
 */
import { clearChartHistory, closeChartPopup, createChartPopup, joinChartHistory, onChartResume } from "./chat_chart_common";

const open = (id, title) => createChartPopup({ id, html: `<div class="chat-popup-header"><strong class="wbe-chart-title">${title}</strong></div>` });
const nav = (popup, which) => popup.querySelector(`.wbe-chart-nav [data-nav="${which}"]`);

describe("chart Back and Forward", () => {
  beforeEach(() => {
    clearChartHistory();
    document.body.innerHTML = "";
  });

  test("a chart opened from another waits behind Back, whole, and Forward returns", () => {
    const fan = open("wbe-fan-popup", "Fan chart: Ian Beacall");
    expect(fan.querySelector(".wbe-chart-nav").hidden).toBe(true);
    fan.querySelector(".wbe-chart-title").dataset.state = "zoomed";
    const origins = open("wbe-origins-popup", "Ancestral origins: Ian Beacall");
    expect(fan.isConnected).toBe(false);
    expect(nav(origins, "back").hidden).toBe(false);
    expect(nav(origins, "back").title).toBe("Back to Fan chart: Ian Beacall");
    expect(nav(origins, "forward").hidden).toBe(true);

    nav(origins, "back").click();
    expect(fan.isConnected).toBe(true);
    expect(origins.isConnected).toBe(false);
    expect(fan.querySelector(".wbe-chart-title").dataset.state).toBe("zoomed");
    expect(nav(fan, "back").hidden).toBe(true);
    expect(nav(fan, "forward").title).toBe("Forward to Ancestral origins: Ian Beacall");

    nav(fan, "forward").click();
    expect(origins.isConnected).toBe(true);
    expect(fan.isConnected).toBe(false);
    expect(nav(origins, "back").hidden).toBe(false);
  });

  test("opening a new chart clears Forward; redrawing the same chart doesn't add a Back", () => {
    const fan = open("wbe-fan-popup", "Fan");
    const origins = open("wbe-origins-popup", "Origins");
    nav(origins, "back").click();
    const cloud = open("wbe-name-cloud-popup", "Names");
    expect(nav(cloud, "forward").hidden).toBe(true);
    expect(nav(cloud, "back").title).toBe("Back to Fan");
    const cloudAgain = open("wbe-name-cloud-popup", "Names, 8 generations");
    expect(cloud.isConnected).toBe(false);
    expect(nav(cloudAgain, "back").title).toBe("Back to Fan");
    expect(fan.isConnected).toBe(false);
  });

  test("× closes the chart and the ones waiting", () => {
    const close = jest.fn();
    const fan = open("wbe-fan-popup", "Fan");
    fan._wbeChartCleanup = close;
    const origins = open("wbe-origins-popup", "Origins");
    closeChartPopup(origins);
    expect(close).toHaveBeenCalled();
    const next = open("wbe-lifespans-popup", "Lifespans");
    expect(next.querySelector(".wbe-chart-nav").hidden).toBe(true);
  });

  test("a view's animation hears its chart come back", () => {
    const fan = open("wbe-fan-popup", "Fan");
    const canvas = fan.appendChild(document.createElement("canvas"));
    const resumed = jest.fn();
    const stop = onChartResume(canvas, resumed);
    const origins = open("wbe-origins-popup", "Origins");
    nav(origins, "back").click();
    expect(resumed).toHaveBeenCalledTimes(1);
    stop();
  });
});

test("the buttons name the chart they go to", () => {
  clearChartHistory();
  document.body.innerHTML = "";
  const fan = open("wbe-fan-popup", "Fan chart: Ian Beacall");
  const origins = open("wbe-origins-popup", "Ancestral origins: Ian Beacall");
  expect(nav(origins, "back").textContent).toBe("← Fan chart");
  nav(origins, "back").click();
  expect(nav(fan, "forward").textContent).toBe("Ancestral origins →");
});

// User, 2026-10-17: "I came here from the connections chart, but there's no back button."
test("the Connections Path waits behind Back too", () => {
  clearChartHistory();
  document.body.innerHTML = "";
  const connections = document.createElement("div");
  connections.id = "wbe-connections-popup";
  connections.innerHTML = `<div class="chat-popup-header"><strong>Connections Path</strong></div>`;
  connections._wbeCloseChart = jest.fn(() => connections.remove());
  document.body.appendChild(connections);
  joinChartHistory(connections);
  const relationship = open("wbe-relationship-popup", "Relationship: Ian Beacall and Mary Dixon");
  expect(connections.isConnected).toBe(false);
  expect(nav(relationship, "back").textContent).toBe("← Connections Path");
  nav(relationship, "back").click();
  expect(connections.isConnected).toBe(true);
  expect(nav(connections, "forward").hidden).toBe(false);
  closeChartPopup(connections);
  expect(connections._wbeCloseChart).toHaveBeenCalled();
});
