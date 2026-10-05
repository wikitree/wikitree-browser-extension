jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));
import { CHART_BAR_KEYS, CHART_SHORTCUTS, chartButtonPrompt, chartShortcutCanonicalPrompt, parseChartShortcutPrompt } from "./chat_chart_shortcuts";
import { routeChatPrompt, ChatIntent } from "./chat_router";

describe("parseChartShortcutPrompt", () => {
  test.each([
    ["Beacall-9 fractal", "explorer", "Beacall-9"],
    ["beacall-9 fractal", "explorer", "beacall-9"],
    ["Beacall-9 fan", "fan", "Beacall-9"],
    ["Beacall-9's fan chart", "fan", "Beacall-9"],
    ["Jefferson descendants", "descendants", "Jefferson"],
    ["Thomas Jefferson descendants", "descendants", "Thomas Jefferson"],
    ["Thomas Jefferson's descendants' map", "descmap", "Thomas Jefferson"],
    ["fan chart for Thomas Jefferson", "fan", "Thomas Jefferson"],
    ["timeline of Cook-8721", "timeline", "Cook-8721"],
    ["Cook-8721 in history", "history", "Cook-8721"],
    ["Cook-8721 X-DNA", "xdna", "Cook-8721"],
    ["Van Buren-12 explorer", "explorer", "Van Buren-12"],
    ["Show descendants", null, null],
    ["my fan chart", null, null],
    ["Who are Jefferson descendants", null, null],
    ["Map", null, null],
    ["Jefferson", null, null],
    ["Jefferson spouse", null, null],
  ])("%s", (prompt, chart, owner) => {
    const parsed = parseChartShortcutPrompt(prompt);
    expect(parsed ? [parsed.chart, parsed.owner] : [null, null]).toEqual([chart, owner]);
  });
});

describe("canonical prompts", () => {
  const intents = { fan: "FAN_CHART", explorer: "FAMILY_WORLD", descendants: "DESCENDANT_CHART", timeline: "FAMILY_TIMELINE", lifespans: "LIFESPANS", history: "LIFESPANS", map: "MIGRATION_MAP", descmap: "MIGRATION_MAP", calendar: "FAMILY_CALENDAR", names: "NAME_CLOUD", overview: "TREE_OVERVIEW", ages: "AGES_CHART", xdna: "FAN_CHART", dnalines: "FAN_CHART", dnaproof: "FAN_CHART", dnatesters: "DESCENDANT_CHART", ydnamap: "DNA" };
  test.each(CHART_SHORTCUTS.map((chart) => chart.key))("%s routes to its chart for the ID", (key) => {
    const routed = routeChatPrompt(chartShortcutCanonicalPrompt(key, "Beacall-9"));
    expect(routed.intent).toBe(ChatIntent[intents[key]]);
    expect(routed.params.owner).toBe("Beacall-9");
  });
  // IDs with underscores ("dit" names, Van_Buren) fell through to the AI: Murray's "Who could
  // test?" on Chicoine_dit_Henley-1 got a guess from the bio (2026-10-05).
  test.each(CHART_SHORTCUTS.flatMap((chart) => ["Chicoine_dit_Henley-1", "Van_Buren-1"].map((id) => [chart.key, id])))("%s routes for %s", (key, id) => {
    const routed = routeChatPrompt(chartShortcutCanonicalPrompt(key, id));
    expect(routed.intent).toBe(ChatIntent[intents[key]]);
    expect(routed.params.owner).toBe(id);
  });
  test("history and X-DNA keep their flags", () => {
    expect(routeChatPrompt(chartShortcutCanonicalPrompt("history", "Beacall-9")).params.history).toBe(true);
    expect(routeChatPrompt(chartShortcutCanonicalPrompt("xdna", "Beacall-9")).params.mode).toBe("xdna");
  });
});

describe("chart buttons", () => {
  test.each(CHART_BAR_KEYS)("%s button prompt parses back to its chart", (key) => {
    expect(parseChartShortcutPrompt(chartButtonPrompt(key, "Beacall-9"))).toEqual({ chart: key, owner: "Beacall-9" });
  });
  test.each(CHART_BAR_KEYS.filter((key) => key !== "ydnamap"))("%s button prompt routes to the shortcut", (key) => {
    expect(routeChatPrompt(chartButtonPrompt(key, "Beacall-9"))).toEqual({ intent: ChatIntent.CHART_SHORTCUT, params: { chart: key, owner: "Beacall-9" } });
  });
  test.each(CHART_BAR_KEYS)("%s button parses for an ID with underscores", (key) => {
    expect(parseChartShortcutPrompt(chartButtonPrompt(key, "Chicoine_dit_Henley-1"))).toEqual({ chart: key, owner: "Chicoine_dit_Henley-1" });
  });
  test("the Y-DNA map button goes straight to the DNA map", () => {
    expect(routeChatPrompt(chartButtonPrompt("ydnamap", "Beacall-9"))).toEqual({ intent: ChatIntent.DNA, params: { kind: "map", owner: "Beacall-9", dnaType: "yDNA" } });
  });
  test("a canonical prompt keeps its own chart route", () => {
    expect(routeChatPrompt("Beacall-9's fan chart").intent).toBe(ChatIntent.FAN_CHART);
  });
  test("the shortcut is routed", () => {
    expect(routeChatPrompt("Beacall-9 fractal")).toEqual({ intent: ChatIntent.CHART_SHORTCUT, params: { chart: "explorer", owner: "Beacall-9" } });
    expect(routeChatPrompt("Jefferson descendants").intent).toBe(ChatIntent.CHART_SHORTCUT);
  });
});
