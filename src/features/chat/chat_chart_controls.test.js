import { chartPopupControls, handleChartPopupButton } from "./chat_chart_common";

describe("shared chart controls", () => {
  let popup;

  beforeEach(() => {
    popup = document.createElement("div");
    popup.innerHTML = chartPopupControls() + '<button data-act="replay">Replay</button>';
    document.body.appendChild(popup);
  });

  afterEach(() => {
    popup._wbeLeaveFullScreen?.();
    popup.remove();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const button = (popup, action) => popup.querySelector(`[data-act="${action}"]`);

  test("full screen toggles and closing leaves it before removing the popup", () => {
    const options = { svg: null, fileBase: "test" };
    expect(handleChartPopupButton(popup, button(popup, "full"), options)).toBe(true);
    expect(popup.classList.contains("wbe-chart-full")).toBe(true);
    handleChartPopupButton(popup, button(popup, "full"), options);
    expect(popup.classList.contains("wbe-chart-full")).toBe(false);
    handleChartPopupButton(popup, button(popup, "full"), options);
    const leave = jest.spyOn(popup, "_wbeLeaveFullScreen");
    expect(handleChartPopupButton(popup, popup.querySelector(".close-popup"), options)).toBe(true);
    expect(leave).toHaveBeenCalledTimes(1);
    expect(popup.isConnected).toBe(false);
    expect(popup.classList.contains("wbe-chart-full")).toBe(false);
  });

  test("chart-specific controls remain available to the caller", () => {
    expect(handleChartPopupButton(popup, button(popup, "replay"), { svg: null, fileBase: "test" })).toBe(false);
    expect(popup.isConnected).toBe(true);
  });

  test("SVG export uses the chart filename and preserves the displayed zoom", () => {
    jest.useFakeTimers();
    const createObjectURL = jest.fn(() => "blob:chart");
    const revokeObjectURL = jest.fn();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      expect(this.download).toBe("ages-Cook-1.svg");
      expect(this.getAttribute("href")).toBe("blob:chart");
    });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.innerHTML = '<g transform="translate(20,30)"><circle r="10" /></g>';
    try {
      expect(handleChartPopupButton(popup, button(popup, "svg"), { svg, fileBase: "ages-Cook-1" })).toBe(true);
      expect(click).toHaveBeenCalledTimes(1);
      expect(createObjectURL.mock.calls[0][0].type).toBe("image/svg+xml");
      expect(svg.querySelector("g").getAttribute("transform")).toBe("translate(20,30)");
      jest.runAllTimers();
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:chart");
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });
});
