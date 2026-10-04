/** @jest-environment jsdom */
import { chartLinkButtons, chartLinkClick } from "./chat_chart_common";

describe("chart cross-links", () => {
  test("renders one escaped button per link", () => {
    const html = chartLinkButtons([{ label: "Fan", title: 'A "fan" chart' }, { label: "Explorer" }]);
    expect(html).toContain('data-link="0"');
    expect(html).toContain('data-link="1"');
    expect(html).toContain("A &quot;fan&quot; chart");
    expect(chartLinkButtons(undefined)).toBe("");
  });

  test("a click leaves full screen and opens the link for the person at the centre", async () => {
    const open = jest.fn();
    const popup = { _wbeLeaveFullScreen: jest.fn() };
    const button = { dataset: { link: "0" } };
    expect(chartLinkClick(popup, button, [{ label: "Fan", open }], "Windsor-1")).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(popup._wbeLeaveFullScreen).toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith("Windsor-1");
    expect(chartLinkClick(popup, button, [{ label: "Fan", open }], "")).toBe(false);
  });
});
