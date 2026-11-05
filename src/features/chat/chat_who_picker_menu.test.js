/** @jest-environment jsdom */
import $ from "jquery";
import { createWhoPicker } from "./chat_who_picker";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function makePicker(overrides = {}) {
  const options = {
    chosen: () => ({ wtId: "Weatherall-111", name: "Ted Weatherall" }),
    fixedPeople: () => [
      { wtId: "Weatherall-111", name: "Ted Weatherall", note: "this profile" },
      { wtId: "Beacall-6", name: "You", isMe: true },
    ],
    familyPeople: async () => [{ wtId: "Weatherall-50", name: "Robert Weatherall", note: "father" }],
    pagePeople: () => [
      { wtId: "Weatherall-50", name: "Robert Weatherall", note: "on this page" },
      { wtId: "Smith-9", name: "Ann Smith", note: "on this page" },
    ],
    loadWatchlist: jest.fn(async () => ({
      people: Array.from({ length: 60 }, (_, i) => ({ wtId: `Zed-${i + 1}`, name: `Zed Person ${String(i + 1).padStart(2, "0")}` })),
    })),
    onChoose: jest.fn(),
    ...overrides,
  };
  const picker = createWhoPicker($, options);
  document.body.appendChild(picker.$root[0]);
  return { picker, options, $root: picker.$root };
}

const names = ($root) => $root.find(".chat-who-item").map((_, el) => el.textContent).get();

describe("who picker list (user, 2026-10-11)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("the profile, you, the profile's family, other people on the page, and 'Your watchlist'", async () => {
    const { $root, options } = makePicker();
    $root.find(".chat-who-button").trigger("click");
    await flush();
    const shown = names($root);
    expect(shown[0]).toMatch(/Ted Weatherall/);
    expect(shown[1]).toMatch(/You/);
    expect(shown[2]).toMatch(/Robert Weatherall.*father/);
    expect(shown.filter((text) => /Robert Weatherall/.test(text))).toHaveLength(1); // (not again as "on this page")
    expect(shown[3]).toMatch(/Ann Smith.*on this page/);
    expect(shown.at(-1)).toMatch(/Your watchlist ▸/);
    expect(options.loadWatchlist).not.toHaveBeenCalled(); // (read only when asked for)
  });

  test("'Your watchlist' reads it and shows the first 50; typing searches it; Back returns", async () => {
    const { $root, options } = makePicker();
    $root.find(".chat-who-button").trigger("click");
    await flush();
    const $watch = $root.find(".chat-who-item").filter((_, el) => /Your watchlist/.test(el.textContent));
    $watch.trigger("mousedown");
    await flush();
    expect(options.loadWatchlist).toHaveBeenCalledTimes(1);
    expect($root.find(".chat-who-menu").prop("hidden")).toBe(false);
    let shown = names($root);
    expect(shown[0]).toMatch(/Back/);
    expect(shown).toHaveLength(51);
    expect($root.find(".chat-who-status").text()).toMatch(/first 50 of 60/);
    $root.find(".chat-who-input").val("person 59").trigger("input");
    shown = names($root);
    expect(shown.slice(1)).toEqual([expect.stringMatching(/Zed Person 59/)]);
    $root.find(".chat-who-item").first().trigger("mousedown");
    expect(names($root).at(-1)).toMatch(/Your watchlist ▸.*60 people/);
  });

  test("choosing someone from the watchlist", async () => {
    const { $root, options } = makePicker();
    $root.find(".chat-who-button").trigger("click");
    await flush();
    $root.find(".chat-who-item").filter((_, el) => /Your watchlist/.test(el.textContent)).trigger("mousedown");
    await flush();
    $root.find(".chat-who-item").eq(1).trigger("mousedown");
    expect(options.onChoose).toHaveBeenCalledWith(expect.objectContaining({ wtId: "Zed-1" }));
    expect($root.find(".chat-who-menu").prop("hidden")).toBe(true);
  });
});

describe("pickerFullName", () => {
  const { pickerFullName } = require("./chat_who_picker");
  test.each([
    ["Eliza", "Shields-3749", "Eliza Shields"],
    ["Mary Ann", "Mc_Donald-12", "Mary Ann Mc Donald"],
    ["Marie Bernadette (McKelvey) Beacall", "McKelvey-563", "Marie Bernadette (McKelvey) Beacall"],
    ["Ronald McKelvey", "McKelvey-564", "Ronald McKelvey"],
    ["Beacall-6", "Beacall-6", "Beacall-6"],
    ["", "Rice-11692", "Rice-11692"],
  ])("%s, %s → %s", (name, wtId, expected) => {
    expect(pickerFullName(name, wtId)).toBe(expected);
  });
});
