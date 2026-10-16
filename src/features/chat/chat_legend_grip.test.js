/**
 * @jest-environment jsdom
 */
// User, 2026-10-17, on the surname river: "I'd like to just be able to make the key section taller."
import { clearChartHistory, createChartPopup } from "./chat_chart_common";

function pointer(target, type, clientY) {
  const event = new MouseEvent(type, { bubbles: true, clientY, button: 0 });
  target.dispatchEvent(event);
}

test("dragging the key's grip up makes the key taller; double-click resets", () => {
  clearChartHistory();
  document.body.innerHTML = "";
  const popup = createChartPopup({
    id: "wbe-origins-popup",
    html: `<div class="chat-popup-header"><strong class="wbe-chart-title">River</strong></div><div class="wbe-chart-footer"><div class="wbe-chart-legend"></div></div>`,
  });
  const grip = popup.querySelector(".wbe-chart-footer-grip");
  const legend = popup.querySelector(".wbe-chart-legend");
  legend.getBoundingClientRect = () => ({ height: 92 });
  Object.defineProperty(popup, "clientHeight", { value: 800 });
  pointer(grip, "pointerdown", 500);
  pointer(grip, "pointermove", 400);
  pointer(grip, "pointerup", 400);
  expect(popup.style.getPropertyValue("--wbe-legend-max")).toBe("192px");
  expect(popup.hasAttribute("data-legend-height")).toBe(true);

  // (the next chart opens with the same key height)
  const next = createChartPopup({ id: "wbe-name-cloud-popup", html: `<div class="chat-popup-header"><strong>Cloud</strong></div><div class="wbe-chart-footer"><div class="wbe-chart-legend"></div></div>` });
  expect(next.style.getPropertyValue("--wbe-legend-max")).toBe("192px");
  next.querySelector(".wbe-chart-footer-grip").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  expect(next.hasAttribute("data-legend-height")).toBe(false);
});
