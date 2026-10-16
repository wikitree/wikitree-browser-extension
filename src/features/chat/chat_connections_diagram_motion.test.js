jest.mock("../../core/common", () => ({ setHighestZIndex: jest.fn() }));
import $ from "jquery";
import { showConnectionsPopup, darkenHexColour, connectionsDiagramStepMs, shortConnectionPlace } from "./ui";

beforeAll(() => {
  $.fn.draggable = function () {
    return this;
  };
});

describe("connections diagram motion", () => {
  test("darkenHexColour", () => {
    expect(darkenHexColour("#90EE90")).toBe("#4f834f");
    expect(darkenHexColour("#fe9")).toBe("#8c8354");
    expect(darkenHexColour("not a colour")).toBe("#999");
  });

  test("the drawing pace keeps long paths under ~4s", () => {
    expect(connectionsDiagramStepMs(5)).toBe(220);
    expect(connectionsDiagramStepMs(40)).toBe(100);
    expect(connectionsDiagramStepMs(500)).toBe(60);
  });

  test("diagram: coloured animated links, end cards, hover, replay", () => {
    jest.useFakeTimers();
    const path = [
      { Id: 1, Name: "A-1", FirstName: "Ann", LastNameAtBirth: "A", Gender: "Female" },
      { Id: 2, Name: "B-1", FirstName: "Bob", LastNameAtBirth: "B", Gender: "Male", pathType: "father" },
      { Id: 3, Name: "C-1", FirstName: "Cat", LastNameAtBirth: "C", Gender: "Female", pathType: "spouse" },
    ];
    showConnectionsPopup([{ path }]);
    // (the chart opens first: user, 2026-10-11)
    expect(document.querySelector("#wbe-conn-table-view").style.display).toBe("none");
    expect(document.querySelector("#wbe-conn-view-toggle").textContent).toBe("Table");
    const scroll = document.querySelector(".conn-diag-scroll");
    expect(scroll.classList.contains("conn-diag-scroll--animate")).toBe(true);
    const links = document.querySelectorAll(".conn-diag-link");
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("stroke")).toBe("#4f834f");
    expect(links[1].getAttribute("marker-end")).toMatch(/^url\(#conn-arr-[0-9a-f]{6}\)$/);
    expect(document.querySelector(`#${links[1].getAttribute("marker-end").slice(5, -1)}`)).not.toBeNull();
    expect(document.querySelector(".conn-diag-card--start").dataset.cardIndex).toBe("0");
    expect(document.querySelector(".conn-diag-card--end").dataset.cardIndex).toBe("2");

    document.querySelector('.conn-diag-card[data-card-index="1"]').dispatchEvent(new Event("mouseenter"));
    expect([...links].every((link) => link.classList.contains("is-hot"))).toBe(true);

    jest.advanceTimersByTime(5000);
    expect(scroll.classList.contains("conn-diag-scroll--animate")).toBe(false);
    expect(document.querySelector("#wbe-conn-replay").hidden).toBe(false);
    document.querySelector("#wbe-conn-replay").click();
    expect(document.querySelector(".conn-diag-scroll").classList.contains("conn-diag-scroll--animate")).toBe(true);
    jest.useRealTimers();
  });
});

describe("table rows link to diagram cards", () => {
  test("clicking a row opens the diagram and pulses that card", () => {
    jest.useFakeTimers();
    const path = [
      { Id: 1, Name: "A-1", FirstName: "Ann", LastNameAtBirth: "A", Gender: "Female" },
      { Id: 2, Name: "B-1", FirstName: "Bob", LastNameAtBirth: "B", Gender: "Male", pathType: "father" },
    ];
    showConnectionsPopup([{ path }]);
    document.querySelector("#wbe-conn-view-toggle").click();
    expect(document.querySelector("#wbe-conn-view-toggle").textContent).toBe("Chart");
    document.querySelector('tr[data-row-index="1"] td.connections-step-cell').click();
    expect(document.querySelector("#wbe-conn-diagram-view").style.display).toBe("");
    expect(document.querySelector("#wbe-conn-table-view").style.display).toBe("none");
    expect(document.querySelector("#wbe-conn-view-toggle").textContent).toBe("Table");
    const card = document.querySelector('.conn-diag-card[data-card-index="1"]');
    expect(card.classList.contains("is-pulse")).toBe(true);
    jest.advanceTimersByTime(2000);
    expect(card.classList.contains("is-pulse")).toBe(false);
    jest.useRealTimers();
  });
});

describe("shortConnectionPlace", () => {
  test.each([
    ["Kensington, London, England", "Kensington, England"],
    ["Ohio, USA", "Ohio, USA"],
    ["", ""],
    [" Paris , , France ", "Paris, France"],
  ])("%s", (place, expected) => {
    expect(shortConnectionPlace(place)).toBe(expected);
  });
});

describe("connections path relationship", () => {
  const path = [
    { Id: 1, Name: "Dixon-1", FirstName: "Tabitha", LastNameAtBirth: "Parker", LastNameCurrent: "Dixon", Gender: "Female" },
    { Id: 2, Name: "Dixon-2", FirstName: "Tom", LastNameAtBirth: "Dixon", Gender: "Male", pathType: "son" },
    { Id: 3, Name: "Dixon-3", FirstName: "Jim", LastNameAtBirth: "Dixon", Gender: "Male", pathType: "son" },
  ];

  test("a blood line says how they're related; a marriage doesn't", async () => {
    const { connectionsPathRelationshipText } = await import("./ui");
    const up = [
      { ...path[2], pathType: undefined },
      { ...path[1], pathType: "father" },
      { ...path[0], pathType: "mother" },
    ];
    expect(connectionsPathRelationshipText(up)).toMatch(/^Tabitha \(Parker\) Dixon is Jim Dixon's grandmother\.$/);
    expect(connectionsPathRelationshipText([path[0], { ...path[1], pathType: "spouse" }])).toBe("");
  });

  test("the Relationship button shows the finder's answer", async () => {
    const { setConnectionsRelationshipFinder } = await import("./ui");
    const finder = jest.fn().mockResolvedValue("They share Ann (A-1).");
    setConnectionsRelationshipFinder(finder);
    showConnectionsPopup([{ path }]);
    const popup = document.querySelector("#wbe-conn-relationship").closest("div[id], .chat-popup") || document;
    const button = document.querySelector("#wbe-conn-relationship");
    expect(button.hidden).toBe(false);
    button.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(finder).toHaveBeenCalledWith(path[0], path[2]);
    expect(popup.querySelector(".connections-relationship").textContent).toBe("They share Ann (A-1).");
    setConnectionsRelationshipFinder(null);
  });
});
