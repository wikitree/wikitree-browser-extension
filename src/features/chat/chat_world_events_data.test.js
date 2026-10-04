jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));
import { WORLD_EVENTS, eventsForRows, placeCountry, placeRegions, aliveFor, buildHistorySummary, buildPersonHistorySummary, eventsForSpan, eventYears, findEvent, livedThrough, parseHistoryPrompt, rowCountries } from "./chat_world_events_data";
import { laneEvents } from "./chat_lifespans_chart";
import { routeChatPrompt, ChatIntent } from "./chat_router";
import { isWtPlusOnlyPrompt } from "./chat_search_mode";

const row = (name, start, end, birthLocation, extra = {}) => ({
  slot: 2,
  generation: 2,
  name,
  relation: "Grandfather",
  start,
  end,
  endKnown: true,
  living: false,
  birthLocation,
  ...extra,
});

describe("WORLD_EVENTS", () => {
  test("every event is well formed and ids are unique", () => {
    const ids = new Set();
    WORLD_EVENTS.forEach((event) => {
      expect(event.start).toBeLessThanOrEqual(event.end);
      expect(event.regions.length).toBeGreaterThan(0);
      expect(ids.has(event.id)).toBe(false);
      ids.add(event.id);
      if (event.match) expect(() => new RegExp(event.match)).not.toThrow();
    });
  });
});

describe("parseHistoryPrompt", () => {
  test.each([
    ["what was happening when my ancestors were alive?", "my", ""],
    ["What history did my ancestors live through?", "my", ""],
    ["what wars did her ancestors live through", "her", ""],
    ["Cook-8721's ancestors in history", "Cook-8721", ""],
    ["Ancestors in history", "", ""],
    ["historical events in my ancestors' lives", "my", ""],
    ["which of my ancestors lived through the Great Famine?", "my", "great-famine"],
    ["who in my family was alive during the Civil War", "my", "us-civil-war"],
    ["were any of my ancestors alive during WW1", "my", "ww1"],
    ["which of her ancestors survived the 1918 flu", "her", "flu-1918"],
  ])("%s", (prompt, owner, eventId) => {
    const params = parseHistoryPrompt(prompt);
    expect(params).toMatchObject({ owner, history: true });
    expect(params.eventId || "").toBe(eventId);
  });

  test("an event that isn't in the list declines", () => {
    expect(parseHistoryPrompt("which of my ancestors lived through the Battle of Hastings")).toBeNull();
  });

  test("routes to the lifespans chart, not a WT+ search", () => {
    expect(routeChatPrompt("which of my ancestors lived through the Great Famine?").intent).toBe(ChatIntent.LIFESPANS);
    expect(isWtPlusOnlyPrompt("What history did my ancestors live through?")).toBe(false);
  });

  test("findEvent", () => {
    expect(findEvent("the Second World War").id).toBe("ww2");
    expect(findEvent("WWII").id).toBe("ww2");
    expect(findEvent("the potato famine").id).toBe("great-famine");
    expect(findEvent("the moon")).toBeNull();
  });
});

describe("matching events to people", () => {
  test("eventsForSpan keeps the tree's countries and the world's", () => {
    const ids = eventsForSpan(1840, 1870, ["Ireland"]).map((event) => event.id);
    expect(ids).toContain("great-famine");
    expect(ids).not.toContain("us-civil-war");
    expect(eventsForSpan(1840, 1870, ["United States"]).map((event) => event.id)).toContain("us-civil-war");
    expect(eventsForSpan(1910, 1920, []).map((event) => event.id)).toContain("ww1");
  });

  test("livedThrough gives ages, from the person's own country", () => {
    const seen = livedThrough(row("Pat", 1830, 1890, "Cork, Ireland"));
    const famine = seen.find((entry) => entry.event.id === "great-famine");
    expect(famine.age).toBe(15);
    expect(seen.some((entry) => entry.event.id === "us-civil-war")).toBe(false);
  });

  test("rowCountries, most first", () => {
    expect(rowCountries([row("a", 1, 2, "Cork, Ireland"), row("b", 1, 2, "Boston, Massachusetts, USA"), row("c", 1, 2, "Dublin, Ireland")])).toEqual(["Ireland", "United States"]);
  });

  test("aliveFor: oldest first, and born during it", () => {
    const famine = WORLD_EVENTS.find((event) => event.id === "great-famine");
    const alive = aliveFor(famine, [row("Young", 1848, 1900, ""), row("Old", 1800, 1860, ""), row("Late", 1860, 1920, "")]);
    expect(alive.map((entry) => [entry.row.name, entry.age])).toEqual([
      ["Old", 45],
      ["Young", 0],
    ]);
  });

  test("eventYears", () => {
    expect(eventYears(WORLD_EVENTS.find((event) => event.id === "titanic"))).toBe("1912");
    expect(eventYears(WORLD_EVENTS.find((event) => event.id === "clearances"))).toBe("c. 1750–1860");
  });
});

describe("buildHistorySummary", () => {
  const rows = [
    row("Pat Murphy", 1830, 1890, "Cork, Ireland"),
    row("Mary Walsh", 1835, 1900, "Galway, Ireland", { relation: "Grandmother" }),
    row("John Smith", 1838, 1920, "Ohio, USA", { relation: "Great-grandfather", generation: 3 }),
  ];

  test("an overview of what they lived through", () => {
    const text = buildHistorySummary(rows, "Your", ["Ireland", "United States"]);
    expect(text).toMatch(/^Your ancestors lived from 1830 to 1920, mostly in Ireland, United States/);
    // (only those born or died where it happened count: John Smith of Ohio doesn't)
    expect(text).toMatch(/1845–1852, the Great Famine in Ireland: 2 alive, among them Pat Murphy \(your grandfather, aged 15\)/);
    expect(text).toMatch(/For the records: .*1864, civil registration of all births begins in Ireland/i);
  });

  test("one event: those born there lead", () => {
    const text = buildHistorySummary(rows, "Your", ["Ireland", "United States"], "great-famine");
    expect(text).toMatch(/^3 of your ancestors with known dates were alive during the Great Famine in Ireland \(1845–1852\):/);
    expect(text).toMatch(/• Pat Murphy \(your grandfather, aged 15\), born in Cork, Ireland/);
    expect(text).not.toMatch(/• John Smith/);
    expect(text).toMatch(/\(1 more was alive then but born and died elsewhere\.\)/);
  });

  test("nobody alive", () => {
    expect(buildHistorySummary(rows, "Cook-8721's", [], "ww2")).toMatch(/^None of Cook-8721's ancestors with known dates were alive during the Second World War/);
  });
});

describe("laneEvents", () => {
  test("overlapping events take new lanes, at most three", () => {
    const events = [
      { id: "a", start: 0, end: 10 },
      { id: "b", start: 5, end: 15 },
      { id: "c", start: 6, end: 16 },
      { id: "d", start: 7, end: 17 },
      { id: "e", start: 30, end: 30 },
    ];
    const { placed, lanes } = laneEvents(events, (year) => year * 10);
    expect(lanes).toBe(3);
    expect(placed.map((event) => `${event.id}${event.lane}`)).toEqual(["a0", "b1", "c2", "e0"]);
  });
});

describe("one person's life in history", () => {
  test("the prompts", () => {
    expect(parseHistoryPrompt("What was happening in the world during Philip's life?")).toEqual({
      owner: "Philip",
      ancestorPrompt: "Philip's ancestors",
      history: true,
      personal: true,
    });
    expect(parseHistoryPrompt("what history did he live through")).toMatchObject({ owner: "", personal: true });
    expect(parseHistoryPrompt("world events in Cook-8721's lifetime")).toMatchObject({ owner: "Cook-8721", personal: true });
    expect(parseHistoryPrompt("what was happening during my life")).toMatchObject({ owner: "my", personal: true });
    // the ancestors' forms are unchanged
    expect(parseHistoryPrompt("what history did my ancestors live through")?.personal).toBeUndefined();
  });

  test("events with his age, his country's included", () => {
    const philip = { ...row("Philip", 1823, 1889, "Worcester, Worcestershire, England"), generation: 0 };
    const text = buildPersonHistorySummary(philip, "Philip (Beacall-11)");
    expect(text.split("\n")[0]).toBe("Philip (Beacall-11) (1823–1889, born in Worcester, Worcestershire, England) lived through:");
    expect(text).toMatch(/aged \d+\)/);
    expect(text).not.toMatch(/assumes about 60 years/);
    expect(buildPersonHistorySummary({ ...philip, endKnown: false, end: 1883 }, "Philip")).toMatch(/assumes about 60 years/);
    expect(buildPersonHistorySummary({ start: 0 }, "Nobody")).toMatch(/no birth year/);
  });
});

describe("places and relevance (2026-10-04)", () => {
  test("provinces, states and counties give their country", () => {
    expect(placeRegions("Halifax, Nova Scotia")).toEqual(expect.arrayContaining(["Canada", "Nova Scotia"]));
    expect(placeRegions("Barachois, Gaspé, Québec")).toEqual(expect.arrayContaining(["Canada", "Quebec"]));
    expect(placeCountry("Ellsworth, Maine")).toBe("United States");
    expect(placeCountry("Ombersley, Worcestershire")).toBe("England");
    expect(placeCountry("Bathurst, Gloucester, New Brunswick, Canada")).toBe("Canada");
  });
  test("the Highlands are their own region", () => {
    expect(placeRegions("Portree, Isle of Skye, Inverness-shire, Scotland")).toContain("Scottish Highlands");
    expect(placeRegions("Glasgow, Lanarkshire, Scotland")).not.toContain("Scottish Highlands");
  });
  test("an event counts only when someone alive then was from there", () => {
    const ids = (rows) => eventsForRows(rows, 1600, 2000).map((event) => event.id);
    // A Scot of the 1600s doesn't bring the Clearances to an English family of the 1800s.
    const mixed = [row("Old Scot", 1620, 1680, "Inverness, Inverness-shire, Scotland"), row("Philip", 1823, 1889, "Worcester, Worcestershire, England")];
    expect(ids(mixed)).not.toContain("clearances");
    expect(ids(mixed)).toContain("poor-law-1834");
    expect(ids([row("Highlander", 1790, 1850, "Lairg, Sutherland, Scotland")])).toContain("clearances");
    // Died there counts too.
    expect(ids([{ ...row("Emigrant", 1800, 1860, "Cork, Ireland"), deathLocation: "Saint John, New Brunswick" }])).toEqual(expect.arrayContaining(["great-famine", "miramichi-fire"]));
  });
});
