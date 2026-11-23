import { baubleCount, drawTree, isSummerChristmas, litPattern, rowDescription } from "./christmas_tree_draw";

const row = (key, total, dark, label = `Degree ${key}`) => ({ key, label, total, dark, lit: total - dark });
const count = (svg, className) => (svg.match(new RegExp(`class="${className}"`, "g")) || []).length;

test("litPattern spreads the lit baubles along the row", () => {
  expect(litPattern(2, 4)).toEqual([false, true, false, true]);
  expect(litPattern(0, 3)).toEqual([false, false, false]);
  expect(litPattern(3, 3)).toEqual([true, true, true]);
  expect(litPattern(1, 5).filter(Boolean)).toHaveLength(1);
});

test("baubleCount: more room lower down, never more baubles than people", () => {
  expect(baubleCount(0, 7, 1000)).toBeLessThan(baubleCount(6, 7, 1000));
  expect(baubleCount(6, 7, 3)).toBe(3);
  expect(baubleCount(0, 7, 1)).toBe(1);
});

test("rowDescription", () => {
  expect(rowDescription(row("3", 412, 37), "relatives")).toBe("Degree 3: 412 relatives, 37 need help");
  expect(rowDescription(row("1", 5, 1), "relatives")).toBe("Degree 1: 5 relatives, 1 needs help");
  expect(rowDescription(row("1", 5, 0), "relatives")).toBe("Degree 1: 5 relatives, all lit");
});

describe("drawTree", () => {
  test("a tier per row, top first in the data, each clickable with its row key", () => {
    const svg = drawTree([row("1", 10, 0), row("2", 40, 40), row("3", 200, 100)], { noun: "relatives" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.match(/data-row="(\d)"/g)).toEqual(['data-row="3"', 'data-row="2"', 'data-row="1"']);
    expect(svg).toContain('aria-label="Degree 2: 40 relatives, 40 need help"');
  });

  test("lit and dark baubles follow each row", () => {
    const allLit = drawTree([row("1", 4, 0)]);
    expect(count(allLit, "ct-dark")).toBe(0);
    expect(count(allLit, "ct-lit")).toBe(baubleCount(0, 1, 4));
    const allDark = drawTree([row("1", 4, 4)]);
    expect(count(allDark, "ct-lit")).toBe(0);
    const someDark = drawTree([row("1", 1000, 1)]);
    expect(count(someDark, "ct-dark")).toBe(1);
  });

  test("the star", () => {
    expect(drawTree([row("1", 3, 0)], { starLit: true })).toContain("ct-star-lit");
    expect(drawTree([row("1", 3, 0)], { starLit: false })).not.toContain("ct-star-lit");
  });

  test("labels are escaped, and an empty list still draws", () => {
    expect(drawTree([row("1", 2, 1, `Degree <1> & "you"`)])).toContain("Degree &lt;1&gt; &amp; &quot;you&quot;");
    expect(drawTree([])).toContain("</svg>");
  });
});

test("a summer Christmas south of the equator: sun, sand, a surfing Santa and the reindeer resting; at home, an evening sleigh ride", () => {
  expect(isSummerChristmas("Australia/Sydney")).toBe(true);
  expect(isSummerChristmas("Australia/Perth")).toBe(true);
  expect(isSummerChristmas("Pacific/Auckland")).toBe(true);
  expect(isSummerChristmas("Africa/Johannesburg")).toBe(true);
  expect(isSummerChristmas("America/Sao_Paulo")).toBe(true);
  expect(isSummerChristmas("America/Argentina/Buenos_Aires")).toBe(true);
  expect(isSummerChristmas("America/Santiago")).toBe(true);
  expect(isSummerChristmas("Africa/Lagos")).toBe(false); // north of the equator
  expect(isSummerChristmas("America/Bogota")).toBe(false);
  expect(isSummerChristmas("Australia")).toBe(false); // only real zone names
  expect(isSummerChristmas("Europe/London")).toBe(false);
  expect(isSummerChristmas("America/New_York")).toBe(false);
  expect(isSummerChristmas("")).toBe(false);
  const rows = [row(1, 4, 1)];
  const summer = drawTree(rows, { summer: true });
  const winter = drawTree(rows);
  expect(summer).toContain("#f3d9a4"); // sand
  expect(summer).toContain('fill="#8b5a2b"'); // the reindeer, on their day off
  expect(winter).toContain('fill="#8b5a2b"'); // the reindeer, pulling the sleigh
  expect(winter).toContain('fill="#fff6d5"'); // the moon: they fly in the evening
  expect(summer).not.toContain('fill="#fff6d5"');
  expect(winter).not.toContain("#f3d9a4");
  expect(count(summer, "ct-lit") + count(summer, "ct-dark")).toBe(count(winter, "ct-lit") + count(winter, "ct-dark"));
});

test("rowDescription says one profile, not one profiles", () => {
  expect(rowDescription(row("early", 1, 1, "Before 1500"), "profiles")).toBe("Before 1500: 1 profile, 1 needs help");
  expect(rowDescription(row(1, 1, 0), "relatives")).toBe("Degree 1: 1 relative, all lit");
  expect(rowDescription(row(2, 3, 2), "relatives")).toBe("Degree 2: 3 relatives, 2 need help");
});
