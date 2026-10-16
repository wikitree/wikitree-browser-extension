import { fitSvgText } from "./chat_chart_common";
// User, 2026-10-17: "text overflowing the box" (the relationship chart's panel heading).
test("fitSvgText shortens until it fits", () => {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "text");
  node.textContent = "What came down from Joshua & Tabitha";
  node.getComputedTextLength = () => node.textContent.length * 7;
  fitSvgText({ node: () => node }, 100);
  expect(node.textContent).toBe("What came dow…");
  node.textContent = "short";
  fitSvgText({ node: () => node }, 100);
  expect(node.textContent).toBe("short");
});
