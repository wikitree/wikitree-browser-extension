import { addBirthParentRow, birthParentRowHtml, birthParentSwitchesHtml, wireBirthParentRow } from "./chat_chart_common";

// The "Biological parents" switches the fan chart had, shared with Lifespans and the other ancestor charts
// (Patty LaPlante, 2026-10-19). Terry Rockstrom's birth mother is Patty, who has birth parents of her own.
describe("biological parents switches", () => {
  const choices = [
    { id: 1, name: "Terry Rockstrom", on: true },
    { id: 2, name: "Patty Luker", on: false },
  ];

  test("one switch per person, ticked when shown with their birth parents", () => {
    const html = birthParentSwitchesHtml(choices);
    expect(html).toContain("Biological parents:");
    expect(html).toMatch(/data-bio="1" checked> Terry Rockstrom/);
    expect(html).toMatch(/data-bio="2"> Patty Luker/);
  });

  test("a hidden row for nobody", () => {
    expect(birthParentSwitchesHtml([])).toBe("");
    expect(birthParentRowHtml({ choices: [] })).toContain("hidden");
    expect(birthParentRowHtml({ choices })).not.toContain("hidden");
  });

  test("ticking reports the person and the new state", () => {
    const popup = document.createElement("div");
    popup.innerHTML = birthParentRowHtml({ choices });
    const changes = [];
    wireBirthParentRow(popup, { onChange: (id, on) => changes.push([id, on]) });
    const patty = popup.querySelector('[data-bio="2"]');
    patty.checked = true;
    patty.dispatchEvent(new Event("change", { bubbles: true }));
    expect(changes).toEqual([[2, true]]);
  });

  test("any chart gets the row under its first toolbar, once, and only when someone has birth parents", () => {
    const popup = document.createElement("div");
    popup.innerHTML = `<div class="chat-popup-header"></div><div class="wbe-chart-toolbar" id="first"></div><div class="wbe-chart-toolbar"></div>`;
    const changes = [];
    addBirthParentRow(popup, { choices: [], onChange: () => {} });
    expect(popup.querySelector(".wbe-chart-bio")).toBeNull();
    addBirthParentRow(popup, { choices, onChange: (id, on) => changes.push([id, on]) });
    addBirthParentRow(popup, { choices, onChange: () => {} });
    expect(popup.querySelectorAll(".wbe-chart-bio")).toHaveLength(1);
    expect(popup.querySelector("#first").nextElementSibling.classList.contains("wbe-chart-bio")).toBe(true);
    const terry = popup.querySelector('[data-bio="1"]');
    terry.checked = false;
    terry.dispatchEvent(new Event("change", { bubbles: true }));
    expect(changes).toEqual([[1, false]]);
  });
});
