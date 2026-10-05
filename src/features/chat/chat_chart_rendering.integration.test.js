// Run with jest.charts.config.js so these tests exercise the real D3 packages.
import $ from "jquery";
import { buildFanSlots } from "./chat_fan_chart_data";
import { showFanChartPopup } from "./chat_fan_chart";
import { buildTreeOverview } from "./chat_tree_overview_data";
import { showDescendantChartPopup } from "./chat_descendant_chart";
import { showAgesPopup } from "./chat_ages_chart";
import { showLifespansPopup } from "./chat_lifespans_chart";
import { buildLifespanRows } from "./chat_lifespans_data";
import { showFamilyCalendarPopup } from "./chat_family_calendar";
import { buildCalendarEvents } from "./chat_family_calendar_data";
import { showTreeOverviewPopup } from "./chat_tree_overview";

beforeEach(() => {
  $.fn.draggable = jest.fn(function () { return this; });
});
afterEach(() => {
  document.querySelectorAll(".wbe-chart-popup").forEach((popup) => {
    if (popup._wbeCloseChart) popup._wbeCloseChart();
    else { popup._wbeLeaveFullScreen?.(); popup.remove(); }
  });
});

function slots(withParents) {
  return buildFanSlots({
    1: { Id: 1, Name: "Root-1", FirstName: "William", Gender: "Male", Father: withParents ? 2 : 0 },
    ...(withParents ? { 2: { Id: 2, Name: "Father-1", FirstName: "John", Gender: "Male", BirthDate: "1850-01-02", DeathDate: "1920-01-02" } } : {}),
  }, "Root-1", 3);
}

test.each(["dnalines", "xdna", ""])("real fan renderer opens mode %s with ancestors", (mode) => {
  const popup = showFanChartPopup(slots(true), { mode });
  expect(popup.isConnected).toBe(true);
  expect(popup.querySelector("svg")).not.toBeNull();
  expect(popup.querySelectorAll("svg path").length).toBeGreaterThan(0);
});

test.each(["dnalines", "xdna"])("real DNA renderer opens mode %s without parents", (mode) => {
  const popup = showFanChartPopup(slots(false), { mode });
  expect(popup.isConnected).toBe(true);
  expect(popup.querySelector("svg")).not.toBeNull();
});

test.each([true, false])("real Overview renderer opens (ancestors: %s)", (withParents) => {
  showTreeOverviewPopup(buildTreeOverview(slots(withParents)));
  expect(document.getElementById("wbe-tree-overview-popup")).not.toBeNull();
  expect(document.querySelector('[data-panel="complete"]')).not.toBeNull();
});

test.each([
  ["Ages", (data) => showAgesPopup(data)],
  ["Lifespans", (data) => showLifespansPopup(buildLifespanRows(data).rows)],
  ["Calendar", (data) => showFamilyCalendarPopup(buildCalendarEvents(data))],
])("real %s renderer opens through the shared popup lifecycle", (label, render) => {
  const popup = render(slots(true));
  expect(popup.isConnected).toBe(true);
  expect(popup.querySelector("svg")).not.toBeNull();
  popup.querySelector(".close-popup").click();
  expect(popup.isConnected).toBe(false);
});

test("Overview renders descendants instead of empty ancestor panels", () => {
  const overview = buildTreeOverview(slots(false));
  overview.descendants = [{ name: "James", wtid: "Child-1", generation: 1, birth: "1870-01-02", lnab: "Harris" }];
  showTreeOverviewPopup(overview);
  const popup = document.getElementById("wbe-tree-overview-popup");
  expect(popup.textContent).toContain("overview shows descendants");
  expect(popup.textContent).toContain("Generation 1: 1");
  expect(popup.textContent).toContain("1870");
  expect(popup.textContent).not.toContain("How complete");
  expect(popup.textContent).not.toContain("Furthest back");
  expect(popup.querySelector('[data-panel="complete"]')).toBeNull();
});

test("root-only X-DNA chart uses a compact view and explains the maternal gap", () => {
  const popup = showFanChartPopup(slots(false), { mode: "xdna" });
  expect(popup.textContent).toContain("His X chromosome comes from his mother");
  expect(popup.textContent).not.toContain("of 14 ancestors");
  expect(popup.querySelector(".wbe-chart-bars").hidden).toBe(true);
  expect(popup.style.height).toBe("min(520px, 92vh)");
  expect(Number(popup.querySelector("svg").getAttribute("viewBox").split(" ")[2])).toBeLessThan(400);
});

test("a one-child descendant chart uses singular labels and larger names", () => {
  const popup = showDescendantChartPopup({ person: { id: 1, wtid: "Root-1", name: "Mary" }, depth: 0, children: [{ person: { id: 2, wtid: "Child-1", name: "John" }, depth: 1, children: [] }] });
  expect(popup.textContent).toContain("1 descendant");
  expect(popup.textContent).not.toContain("1 descendants");
  expect(popup.textContent).not.toContain("1 generations");
  const name = [...popup.querySelectorAll("svg text")].find((node) => node.textContent === "John");
  expect(Number(name.getAttribute("font-size"))).toBeGreaterThanOrEqual(24);
});
