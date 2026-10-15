import { RANGE_PANEL_ID, askForPageRange } from "./fg_range_panel";

let anchor;

beforeEach(() => {
  document.body.innerHTML = '<div id="holder"><button id="go" type="button">Extract to CSV</button></div>';
  anchor = document.getElementById("go");
});

const open = (overrides = {}) =>
  askForPageRange({
    anchor,
    recordCount: 27562,
    totalPages: 1379,
    suggested: { from: 1, to: 50 },
    ...overrides,
  });
const panel = () => document.getElementById(RANGE_PANEL_ID);
const inputs = () => panel().querySelectorAll("input");
const buttons = () => panel().querySelectorAll("button");
const startButton = () => [...buttons()].find((b) => /Extract these pages/.test(b.textContent));
const cancelButton = () => [...buttons()].find((b) => b.textContent === "Cancel");
const type = (input, value) => {
  input.value = value;
};
const key = (target, name) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));
const error = () => panel().querySelector(".wbe-fg-range-error").textContent;

describe("range panel", () => {
  test("sits after the button's container, filled with the suggestion", () => {
    open();
    expect(panel().previousElementSibling.id).toBe("holder");
    expect([...inputs()].map((input) => input.value)).toEqual(["1", "50"]);
    expect(panel().textContent).toContain("up to 500");
  });

  test("explains the limits for a very long list, and the Z-A tip", () => {
    open();
    expect(panel().textContent).toContain("This list has 27,562 memorials on 1,379 pages");
    expect(panel().textContent).toContain("only lists the first 500 pages");
    expect(panel().textContent).toContain("Name (Z-A)");
  });

  test("leaves out the 500-page note for a list that is not that long", () => {
    open({ recordCount: 6539, totalPages: 327 });
    expect(panel().textContent).toContain("6,539 memorials on 327 pages");
    expect(panel().textContent).not.toContain("only lists the first 500 pages");
  });

  test("resolves with the chosen range and removes itself", async () => {
    const result = open();
    type(inputs()[0], "51");
    type(inputs()[1], "100");
    startButton().click();
    expect(await result).toEqual({ from: 51, to: 100 });
    expect(panel()).toBeNull();
  });

  test.each([
    ["0", "5", /start at 1/],
    ["9", "3", /must not be after/],
    ["1", "51", /50 pages/],
    ["", "5", /whole page numbers/],
    ["1", "", /whole page numbers/],
    ["490", "510", /nothing after page 500/],
  ])("%s to %s shows an error and stays open", (from, to, message) => {
    open();
    type(inputs()[0], from);
    type(inputs()[1], to);
    startButton().click();
    expect(error()).toMatch(message);
    expect(panel()).not.toBeNull();
  });

  test("Cancel resolves with null", async () => {
    const result = open();
    cancelButton().click();
    expect(await result).toBeNull();
    expect(panel()).toBeNull();
  });

  test("Escape resolves with null", async () => {
    const result = open();
    key(inputs()[0], "Escape");
    expect(await result).toBeNull();
  });

  test("Enter in a page box submits", async () => {
    const result = open();
    type(inputs()[1], "5");
    key(inputs()[1], "Enter");
    expect(await result).toEqual({ from: 1, to: 5 });
  });

  test("Enter on the Cancel button does not submit", async () => {
    const result = open();
    const settled = jest.fn();
    result.then(settled);
    key(cancelButton(), "Enter");
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    expect(error()).toBe("");
    expect(panel()).not.toBeNull();
  });

  test("opening it again replaces the old one", () => {
    open();
    open();
    expect(document.querySelectorAll(`#${RANGE_PANEL_ID}`)).toHaveLength(1);
  });
});
