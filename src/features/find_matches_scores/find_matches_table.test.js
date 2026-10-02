/**
 * @jest-environment jsdom
 */
/*
Created By: Ian Beacall (Beacall-6)

Renders the table from the real Baxter getPeople response, so what is checked here is the
markup a person would actually be looking at on the page.
*/

import $ from "jquery";
import people from "./__fixtures__/getpeople_baxter.json";
import { buildProfiles } from "./find_matches_profiles";
import { mountPanel, profileFetchNotice, renderTable, renderTransientNotice } from "./find_matches_table";
import { scorePair } from "./match_scoring";

const WANTED = ["Baxter-6788", "Baxter-8158", "Becker-3484"];

function profiles() {
  return buildProfiles(new Map(Object.entries(people).map(([id, person]) => [String(id), person])), WANTED);
}

/**
 * Anchor plus three candidates: an obvious duplicate (the anchor's own record under a second
 * ID), and the two real results the page offered, which are both rejects.
 */
function scoredEntries(loaded) {
  const anchor = loaded.get("baxter 6788");
  const twin = { ...anchor, Id: 99999999, Name: "Baxter-9999" };

  return [
    { wtId: "Baxter-9999", compareUrl: "/compare-9999", profile: twin, result: scorePair(anchor, twin) },
    {
      wtId: "Baxter-8158",
      compareUrl: "/compare-8158",
      profile: loaded.get("baxter 8158"),
      result: scorePair(anchor, loaded.get("baxter 8158")),
    },
    {
      wtId: "Becker-3484",
      compareUrl: "",
      profile: loaded.get("becker 3484"),
      result: scorePair(anchor, loaded.get("becker 3484")),
    },
  ];
}

function render(unscored = []) {
  document.body.innerHTML = '<section id="Results"><div id="block"><ul></ul></div></section>';
  const loaded = profiles();
  const panel = mountPanel({ container: $("#block") });
  renderTable(panel, loaded.get("baxter 6788"), scoredEntries(loaded), unscored);
  return panel;
}

describe("renderTable", () => {
  test("puts the panel above WikiTree's own list without disturbing it", () => {
    render();
    expect($("#block").children().first().hasClass("wbe-fms-panel")).toBe(true);
    expect($("#block > ul").length).toBe(1);
  });

  test("shows a row per candidate, with a detail row for each", () => {
    render();
    expect($(".wbe-fms-row").length).toBe(3);
    expect($(".wbe-fms-detail-row").length).toBe(3);
  });

  test("the duplicate scores strongly and the rejects show a dash", () => {
    render();
    const badges = $(".wbe-fms-badge")
      .toArray()
      .map((badge) => $(badge).text());

    // 85, not 100: Baxter-6788 has a year-only birth, no death date and no parents, so even
    // its own twin only ever gathers eight points of evidence.
    expect(Number(badges[0])).toBe(85);
    expect($(".wbe-fms-level").first().text()).toBe("Strong");
    expect(badges.slice(1)).toEqual(["–", "–"]);
  });

  test("detail rows start closed and open when the row is clicked", () => {
    render();
    const row = $(".wbe-fms-row").first();
    expect(row.next(".wbe-fms-detail-row").hasClass("wbe-fms-open")).toBe(false);
    row.trigger("click");
    expect(row.next(".wbe-fms-detail-row").hasClass("wbe-fms-open")).toBe(true);
  });

  test("clicking a link inside a row does not toggle the detail row", () => {
    render();
    const row = $(".wbe-fms-row").first();
    row.find("a").first().trigger("click");
    expect(row.next(".wbe-fms-detail-row").hasClass("wbe-fms-open")).toBe(false);
  });

  test("a reject's reason is shown in its detail row", () => {
    render();
    const rejectRow = $('.wbe-fms-row[data-wt-id="Becker-3484"]');
    expect(rejectRow.next(".wbe-fms-detail-row").find(".wbe-fms-reject").text()).toBeTruthy();
  });

  test("a shared spouse is marked, an unshared one is not", () => {
    render();
    const duplicateRow = $('.wbe-fms-row[data-wt-id="Baxter-9999"]');
    expect(duplicateRow.find(".wbe-fms-relation.wbe-fms-shared-id").length).toBeGreaterThan(0);

    const beckerRow = $('.wbe-fms-row[data-wt-id="Becker-3484"]');
    expect(beckerRow.find(".wbe-fms-relation.wbe-fms-shared-id").length).toBe(0);
  });

  test("the compare link is carried over, and absent when WikiTree gave none", () => {
    render();
    expect($('.wbe-fms-row[data-wt-id="Baxter-8158"] .wbe-fms-compare-cell a').attr("href")).toBe("/compare-8158");
    expect($('.wbe-fms-row[data-wt-id="Becker-3484"] .wbe-fms-compare-cell a').length).toBe(0);
  });

  test("everything is shown up front, and the toggle hides the weak ones", () => {
    render();
    const table = $(".wbe-fms-table");
    expect(table.hasClass("wbe-fms-hide-weak")).toBe(false);
    expect($(".wbe-fms-weak-toggle").text()).toBe("Hide unlikely matches");

    $(".wbe-fms-weak-toggle").trigger("click");
    expect(table.hasClass("wbe-fms-hide-weak")).toBe(true);
    expect($(".wbe-fms-weak-toggle").text()).toMatch(/^Show 2 unlikely/);

    $(".wbe-fms-weak-toggle").trigger("click");
    expect(table.hasClass("wbe-fms-hide-weak")).toBe(false);
    expect($(".wbe-fms-weak-toggle").text()).toBe("Hide unlikely matches");
  });

  test("clicking a column header re-sorts and moves each detail row with its own row", () => {
    render();
    $('.wbe-fms-table th[data-sort="name"]').trigger("click");

    const rows = $(".wbe-fms-table tbody tr").toArray();
    rows.forEach((row, index) => {
      if ($(row).hasClass("wbe-fms-row")) {
        expect($(rows[index + 1]).hasClass("wbe-fms-detail-row")).toBe(true);
      }
    });

    const order = $(".wbe-fms-row")
      .toArray()
      .map((row) => $(row).attr("data-wt-id"));
    expect(order[0]).toBe("Becker-3484");
  });
});

describe("results that could not be scored", () => {
  test("says so, and names them, rather than quietly showing fewer rows", () => {
    document.body.innerHTML = '<section id="Results"><div id="block"><ul></ul></div></section>';
    const loaded = profiles();
    const panel = mountPanel({ container: $("#block") });
    renderTable(panel, loaded.get("baxter 6788"), scoredEntries(loaded), ["Baxter-291"]);

    expect($(".wbe-fms-unscored").text()).toContain("Baxter-291");
    expect($(".wbe-fms-unscored").text()).toMatch(/1 result could not be scored/);
  });

  test("says nothing when everything scored", () => {
    render();
    expect($(".wbe-fms-unscored").length).toBe(0);
  });
});

describe("the original profile's row", () => {
  test("sits at the top of the table, in the same columns as the results", () => {
    render();
    const anchorRow = $(".wbe-fms-anchor-row");
    expect(anchorRow.length).toBe(1);
    expect(anchorRow.attr("data-wt-id")).toBe("Baxter-6788");
    expect(anchorRow.children("td").length).toBe($(".wbe-fms-row").first().children("td").length);
    expect(anchorRow.closest("tbody").is($(".wbe-fms-table tbody").first())).toBe(true);
  });

  test("is labelled rather than scored", () => {
    render();
    const anchorRow = $(".wbe-fms-anchor-row");
    expect(anchorRow.find(".wbe-fms-anchor-label").text()).toBe("This profile");
    expect(anchorRow.find(".wbe-fms-badge").length).toBe(0);
  });

  test("shows the original's own dates, places and family", () => {
    render();
    const anchorRow = $(".wbe-fms-anchor-row");
    expect(anchorRow.find(".wbe-fms-date").first().text()).toBe("1834");
    expect(anchorRow.find(".wbe-fms-place").first().text()).toBe("Scotland, United Kingdom");
    expect(anchorRow.find(".wbe-fms-relation").text()).toContain("Agnes Ritchie");
  });

  test("does not mark its own relatives as shared", () => {
    render();
    expect($(".wbe-fms-anchor-row .wbe-fms-shared-id").length).toBe(0);
    expect($(".wbe-fms-anchor-row .wbe-fms-shared-name").length).toBe(0);
  });

  test("is not counted as a result, and is not hidden with the weak ones", () => {
    render();
    $(".wbe-fms-weak-toggle").trigger("click");
    expect($(".wbe-fms-row").length).toBe(3);
    expect($(".wbe-fms-anchor-row").hasClass("wbe-fms-weak")).toBe(false);
  });

  test("stays put when the results are re-sorted", () => {
    render();
    $('.wbe-fms-table th[data-sort="name"]').trigger("click");
    expect($(".wbe-fms-table tbody").first().find("tr").first().hasClass("wbe-fms-anchor-row")).toBe(true);

    $('.wbe-fms-table th[data-sort="score"]').trigger("click");
    expect($(".wbe-fms-table tbody").first().find("tr").first().hasClass("wbe-fms-anchor-row")).toBe(true);
  });
});

describe("a profile that could not be fetched", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '<section id="Results"><div id="block"><ul><li>original list</li></ul></div></section>';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("says what happened, naming the extension and the reason", () => {
    const panel = mountPanel({ container: $("#block") });
    renderTransientNotice(panel, profileFetchNotice());

    expect($(".wbe-fms-notice").text()).toBe(
      "WikiTree Browser Extension: Find Matches Scores could not fetch data for this profile " +
        "(the API returns no details for private and living profiles)."
    );
  });

  test("is not styled as an error", () => {
    const panel = mountPanel({ container: $("#block") });
    renderTransientNotice(panel, profileFetchNotice());

    expect($(".wbe-fms-error").length).toBe(0);
  });

  test("takes the whole panel away once it has been read, leaving WikiTree's list alone", () => {
    const panel = mountPanel({ container: $("#block") });
    renderTransientNotice(panel, profileFetchNotice());

    expect($(".wbe-fms-panel").length).toBe(1);

    jest.advanceTimersByTime(6000);
    expect($(".wbe-fms-panel").hasClass("wbe-fms-fading")).toBe(true);

    jest.advanceTimersByTime(600);
    expect($(".wbe-fms-panel").length).toBe(0);
    expect($("#block > ul li").text()).toBe("original list");
  });

  test("reports when it has gone, for anything waiting on it", () => {
    const onRemoved = jest.fn();
    const panel = mountPanel({ container: $("#block") });
    renderTransientNotice(panel, profileFetchNotice(), { onRemoved });

    expect(onRemoved).not.toHaveBeenCalled();
    jest.advanceTimersByTime(6600);
    expect(onRemoved).toHaveBeenCalledTimes(1);
  });
});
