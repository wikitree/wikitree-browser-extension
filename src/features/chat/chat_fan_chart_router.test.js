jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));
import { routeChatPrompt, ChatIntent } from "./chat_router";
import { isWtPlusOnlyPrompt } from "./chat_search_mode";

describe("fan chart routing", () => {
  test.each(["show me my fan chart", "draw a fan chart of her ancestors", "fan chart for Cook-8721 with 8 generations"])(
    "%s routes to the fan chart",
    (prompt) => {
      expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.FAN_CHART);
      expect(isWtPlusOnlyPrompt(prompt)).toBe(false);
    }
  );

  test("a plain ancestor list stays a list", () => {
    expect(routeChatPrompt("show me my ancestors").intent).not.toBe(ChatIntent.FAN_CHART);
  });
});

describe("family world routing", () => {
  test.each(["show my family world", "show Cook-8721's CC7 tree", "show me everyone connected to her", "explore my whole family tree", "fractal", "show me my fractal tree"])("%s routes to the family world", (prompt) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.FAMILY_WORLD);
    expect(isWtPlusOnlyPrompt(prompt)).toBe(false);
  });
  test.each(["show my cc7", "notables in my CC7"])("%s does not", (prompt) => expect(routeChatPrompt(prompt).intent).not.toBe(ChatIntent.FAMILY_WORLD));
});

describe("fractal tree routing", () => {
  test.each(["draw a fractal chart of her ancestors", "fractal tree for Cook-8721 with 9 generations", "visualize my ancestors", "show my descendants as a fractal tree"])(
    "%s routes to the fractal tree",
    (prompt) => {
      expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.FRACTAL_TREE);
      expect(isWtPlusOnlyPrompt(prompt)).toBe(false);
    }
  );

  test.each(["show me my ancestors", "show my family tree"])("%s is not the fractal tree", (prompt) => {
    expect(routeChatPrompt(prompt).intent).not.toBe(ChatIntent.FRACTAL_TREE);
  });
});

describe("descendant chart routing", () => {
  test.each(["show me my descendant chart", "visualize her descendants", "draw a descendant sunburst for Cook-8721", "sunburst", "descendant chart"])("%s routes to the descendant chart", (prompt) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.DESCENDANT_CHART);
    expect(isWtPlusOnlyPrompt(prompt)).toBe(false);
  });

  test("a plain descendant list stays a list", () => {
    expect(routeChatPrompt("show me her descendants").intent).not.toBe(ChatIntent.DESCENDANT_CHART);
  });
});

describe("family timeline routing", () => {
  test.each([
    ["show me her family timeline", ""],
    ["family timeline for Cook-8721", "Cook-8721"],
    ["show a timeline of my family", "me"],
    ["who in her family was alive when", ""],
  ])("%s", (prompt, owner) => {
    expect(routeChatPrompt(prompt)).toEqual({ intent: ChatIntent.FAMILY_TIMELINE, params: { owner } });
  });

  test("a plain timeline stays narrative", () => {
    expect(routeChatPrompt("give me a timeline")?.intent).not.toBe(ChatIntent.FAMILY_TIMELINE);
  });
});

describe("welcome chip prompts route to the charts", () => {
  test.each([
    ["Fan chart", "FAN_CHART"],
    ["Show my fan chart", "FAN_CHART"],
    ["Family Explorer", "FAMILY_WORLD"],
    ["Show my Family Explorer", "FAMILY_WORLD"],
    ["Descendant chart", "DESCENDANT_CHART"],
    ["Family timeline", "FAMILY_TIMELINE"],
    // (the Family Explorer is the fractal tree's newest version)
    ["Show a fractal tree", "FAMILY_WORLD"],
    ["Show my fractal tree", "FAMILY_WORLD"],
    ["Show a descendant chart", "DESCENDANT_CHART"],
    ["Show my descendant chart", "DESCENDANT_CHART"],
    ["Show the family timeline", "FAMILY_TIMELINE"],
    ["Show my family timeline", "FAMILY_TIMELINE"],
    ["Map this person's ancestors", "MIGRATION_MAP"],
    ["Map my ancestors", "MIGRATION_MAP"],
    ["Lifespans", "LIFESPANS"],
    ["How long did my ancestors live?", "LIFESPANS"],
    ["Surnames", "FAN_CHART"],
    ["What surnames are in my tree?", "FAN_CHART"],
    ["Name cloud", "NAME_CLOUD"],
    ["How complete is my tree?", "FAN_CHART"],
    ["X-DNA chart", "FAN_CHART"],
    ["Ancestors in history", "LIFESPANS"],
    ["What history did my ancestors live through?", "LIFESPANS"],
    ["Who could I have inherited X-DNA from?", "FAN_CHART"],
  ])("%s", (prompt, intent) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent[intent]);
  });
});

describe("migration map routing", () => {
  test.each(["show me my migration map", "map my ancestors", "show her ancestors on a map", "how did my ancestors migrate?"])("%s", (prompt) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.MIGRATION_MAP);
    expect(isWtPlusOnlyPrompt(prompt)).toBe(false);
  });

  test("where did my ancestors come from? stays the birthplace summary", () => {
    expect(routeChatPrompt("where did my ancestors come from?").intent).toBe(ChatIntent.ANCESTOR_LIST);
  });
});

describe("short chart names", () => {
  test.each([
    ["fan chart", ChatIntent.FAN_CHART],
    ["fan", ChatIntent.FAN_CHART],
    ["ancestor sunburst", ChatIntent.FAN_CHART],
    ["family timeline", ChatIntent.FAMILY_TIMELINE],
    ["migration map", ChatIntent.MIGRATION_MAP],
    ["fractal", ChatIntent.FAMILY_WORLD],
  ])("%s opens its chart", (prompt, intent) => expect(routeChatPrompt(prompt).intent).toBe(intent));
});

describe("lifespans routing", () => {
  test.each(["lifespans", "show my ancestors' lifespans", "How long did my ancestors live?", "lifespan chart for Cook-8721's ancestors", "Lifespans"])("%s", (prompt) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.LIFESPANS);
  });
  test.each(["how long did she live", "how long did my father live"])("%s is not", (prompt) => {
    expect(routeChatPrompt(prompt).intent).not.toBe(ChatIntent.LIFESPANS);
  });
});

describe("surname fan chart routing", () => {
  test.each(["What surnames are in my tree?", "my ancestral surnames", "surnames", "show Cook-8721's surname chart", "which surnames did her ancestors have", "what are my family surnames"])("%s", (prompt) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.FAN_CHART);
    expect(routed.params.mode).toBe("surname");
  });
  test.each(["my surname", "fan chart"])("%s is not the surname chart", (prompt) => {
    expect(routeChatPrompt(prompt).params?.mode).not.toBe("surname");
  });
});

describe("name cloud routing", () => {
  test.each(["name cloud", "What are the most common names in my family tree?", "show Cook-8721's name cloud", "what names run in my family"])("%s", (prompt) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.NAME_CLOUD);
  });
});

describe("plain family prompts open the family timeline", () => {
  test.each([
    ["show her family", ""],
    ["Show me his family", ""],
    ["tell me about her family", ""],
    ["who is in her family?", ""],
    ["her immediate family", ""],
    ["show my family", "me"],
    ["family of Windsor-1", "Windsor-1"],
    ["show Windsor-1's family", "Windsor-1"],
  ])("%s", (prompt, owner) => {
    expect(routeChatPrompt(prompt)).toEqual({ intent: ChatIntent.FAMILY_TIMELINE, params: { owner } });
  });
  test("the Smith family is still a surname filter", () => {
    expect(routeChatPrompt("show the Smith family").intent).toBe(ChatIntent.LAST_RESULT_OPERATION);
  });
});

describe("completeness routing", () => {
  test.each([
    ["How complete is my tree?", "completeness"],
    ["where are my brick walls", "brickwalls"],
    ["pedigree completeness", "completeness"],
    ["Which of my ancestors need help?", "completeness"],
  ])("%s", (prompt, mode) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.FAN_CHART);
    expect(routed.params).toEqual(expect.objectContaining({ mode, completeness: true }));
  });
});

describe("family calendar routing", () => {
  test.each(["On this day in my family", "On this day in this family", "family birthdays", "who in my family was born in March"])("%s", (prompt) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.FAMILY_CALENDAR);
  });
});

describe("the migration map at a year", () => {
  test.each(["where were my ancestors living in 1850?", "show my ancestors on a map in 1750"])("%s", (prompt) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.MIGRATION_MAP);
    expect(routed.params.year).toBeGreaterThan(1700);
  });
});

describe("tree overview routing", () => {
  test.each(["Tell me about my tree", "Tree overview", "my tree stats", "tell me about Cook-8721's ancestors"])("%s", (prompt) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.TREE_OVERVIEW);
  });
});

describe("life line routing (2026-10-04)", () => {
  test.each(["show my lifeline", "Beacall-11's life line", "put his life on one line"])("%s", (prompt) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.FAMILY_TIMELINE);
    expect(routed.params).toEqual(expect.objectContaining({ lifeLine: true }));
  });
  test("a person's history stays with lifespans (it opens the life line itself)", () => {
    expect(routeChatPrompt("what history did Beacall-11 live through")).toEqual(expect.objectContaining({ intent: ChatIntent.LIFESPANS }));
  });
});

describe("family size routing (2026-10-04)", () => {
  test.each(["family sizes in my tree", "How big were my ancestors' families?", "how many children did Cook-8721's ancestors have", "show Cook-8721's ancestral family sizes"])(
    "%s",
    (prompt) => {
      const routed = routeChatPrompt(prompt);
      expect(routed.intent).toBe(ChatIntent.NAME_CLOUD);
      expect(routed.params).toEqual(expect.objectContaining({ familySize: true }));
      expect(isWtPlusOnlyPrompt(prompt)).toBe(false);
    }
  );
});
