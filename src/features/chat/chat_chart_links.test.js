/** @jest-environment jsdom */
import { chartLinkButtons, chartLinkClick, chartMenuGroups, setChartMenuHandler } from "./chat_chart_common";

describe("chart cross-links", () => {
  afterEach(() => {
    setChartMenuHandler(null);
    document.body.innerHTML = "";
  });

  test("one Charts menu button in place of the links", () => {
    const html = chartLinkButtons([{ key: "fan", label: "Fan" }, { key: "explorer", label: "Explorer" }]);
    expect(html).toContain('data-link="menu"');
    expect(html).toContain("Charts ▾");
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(chartLinkButtons(undefined)).toBe("");
  });

  test("the menu lists every chart through Genie, and this chart's extra links directly", () => {
    const lifeline = { key: "lifeline", label: "Life line", open: jest.fn() };
    const groups = chartMenuGroups([lifeline], { viaGenie: true });
    expect(groups.map((group) => group.label)).toEqual(["Ancestors", "Descendants", "Family", "DNA"]);
    const family = groups.find((group) => group.label === "Family").items;
    expect(family.find((item) => item.key === "familymap").viaGenie).toBe(true);
    expect(family.find((item) => item.key === "lifeline").link).toBe(lifeline);
    // (no link to Family sizes or Descendants' lifespans from this chart: not listed)
    expect(groups.flatMap((group) => group.items).some((item) => item.key === "desclives" || item.key === "familysize")).toBe(false);
  });

  test("without Genie's box, only the charts this one links to", () => {
    const groups = chartMenuGroups([{ key: "fan", label: "Fan", open: jest.fn() }], { viaGenie: false });
    expect(groups.flatMap((group) => group.items).map((item) => item.key)).toEqual(["fan"]);
  });

  test("the menu opens in the chart window and a choice runs through Genie for the person at the centre", async () => {
    const handler = jest.fn(() => true);
    setChartMenuHandler(handler);
    const popup = document.createElement("div");
    popup._wbeLeaveFullScreen = jest.fn();
    popup.innerHTML = chartLinkButtons([{ key: "fan", label: "Fan", open: jest.fn() }]);
    document.body.appendChild(popup);
    const button = popup.querySelector("button");
    expect(chartLinkClick(popup, button, [{ key: "fan", label: "Fan", open: jest.fn() }], "Windsor-1")).toBe(true);
    const menu = popup.querySelector(".wbe-chart-menu");
    expect(menu).not.toBeNull();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    [...menu.querySelectorAll("button")].find((item) => item.textContent === "Explorer").click();
    await Promise.resolve();
    await Promise.resolve();
    expect(popup.querySelector(".wbe-chart-menu")).toBeNull();
    expect(popup._wbeLeaveFullScreen).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith("explorer", "Windsor-1");
  });

  test("an old numbered link still opens directly", async () => {
    const open = jest.fn();
    const popup = { _wbeLeaveFullScreen: jest.fn() };
    const button = { dataset: { link: "0" } };
    expect(chartLinkClick(popup, button, [{ label: "Fan", open }], "Windsor-1")).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(open).toHaveBeenCalledWith("Windsor-1");
    expect(chartLinkClick(popup, button, [{ label: "Fan", open }], "")).toBe(false);
  });
});
