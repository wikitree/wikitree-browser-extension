import { buildFamilyMatrix, parseFamilyMatrixPrompt, loadFamilyMatrixPeople } from "./chat_family_matrix_data";
import { showFamilyMatrixPopup, familyRelationshipsSvg } from "./chat_family_matrix";
import { closeChartPopup } from "./chat_chart_common";

const p = (Id, Father = 0, Mother = 0) => ({ Id, Name: `Person-${Id}`, FirstName: `First${Id}`, LastNameAtBirth: "Family", Father, Mother, BirthDate: "1900-01-02", DeathDate: "1980-03-04" });
const people = { 1: p(1, 2, 3), 2: p(2, 10, 11), 3: p(3), 4: p(4, 2, 3), 5: p(5, 2, 9), 6: p(6, 1, 20), 7: p(7, 6, 21), 8: p(8, 4, 22), 9: p(9), 10: p(10), 11: p(11), 12: p(12, 10, 11), 13: p(13, 12, 23) };

afterEach(() => document.querySelectorAll('.wbe-chart-popup').forEach(closeChartPopup));

test("relationship groups include direct, collateral and half relatives without duplicates", () => {
  const matrix = buildFamilyMatrix(people, "Person-1");
  const ids = (label) => matrix.cards.find((card) => card.label.toLowerCase() === label.toLowerCase()).people.map((person) => person.id);
  expect(ids("parents")).toEqual([2, 3]);
  expect(ids("children")).toEqual([6]);
  expect(ids("grandchildren")).toEqual([7]);
  expect(ids("siblings")).toEqual([4]);
  expect(ids("half siblings")).toEqual([5]);
  expect(ids("nieces / nephews")).toEqual([8]);
  expect(ids("aunts / uncles")).toEqual([12]);
  expect(ids("1st cousins")).toEqual([13]);
  const all = matrix.cards.flatMap((card) => card.people.map((person) => person.id));
  expect(new Set(all).size).toBe(all.length);
});

test.each(["my family map", "his family matrix", "Person-1's family cards", "family dashboard"])("parses %s", (prompt) => {
  expect(parseFamilyMatrixPrompt(prompt)).not.toBeNull();
});

test("cards reveal full names and dates on hover, focus and click", () => {
  const popup = showFamilyMatrixPopup(buildFamilyMatrix(people, "Person-1"));
  const card = [...popup.querySelectorAll('[data-card]')].find((button) => button.textContent.includes("children"));
  card.dispatchEvent(new MouseEvent("mouseenter"));
  expect(popup.querySelector('.wbe-kin-list').textContent).toContain("First6 Family");
  expect(popup.querySelector('.wbe-kin-list').textContent).toContain("1900-01-02");
  card.click();
  expect(card.getAttribute("aria-pressed")).toBe("true");
  expect(popup.querySelector('.wbe-kin-list a').getAttribute('href')).toContain('Person-6');
});

test("loader requests ancestors and descendant branches within supported limits", async () => {
  const api = { getPeople: jest.fn(async () => ["", {}, people]) };
  await loadFamilyMatrixPeople(api, "test", "Person-1", 4, 5);
  expect(api.getPeople.mock.calls[0][3].ancestors).toBe(4);
  expect(api.getPeople.mock.calls[1][3].descendants).toBe(5);
  expect(api.getPeople.mock.calls[1][1].length).toBeLessThanOrEqual(100);
});


test("search finds people across cards before a card is selected", () => {
  const popup = showFamilyMatrixPopup(buildFamilyMatrix(people, "Person-1"));
  const search = popup.querySelector('input[type="search"]');
  search.value = "First7";
  search.dispatchEvent(new Event("input"));
  expect(popup.querySelector(".wbe-kin-list").textContent).toContain("First7 Family");
  expect(popup.querySelector(".wbe-kin-list").textContent).toContain("grandchildren");
});

test("the list shows Born/Died with place, using ? for what is missing", () => {
  const withPlaces = { ...people, 4: { ...people[4], BirthLocation: "Ohio, USA", DeathDate: "0000-00-00", DataStatus: { BirthDate: "before" } } };
  const popup = showFamilyMatrixPopup(buildFamilyMatrix(withPlaces, "Person-1"));
  const search = popup.querySelector('input[type="search"]');
  search.value = "First4";
  search.dispatchEvent(new Event("input"));
  const text = popup.querySelector(".wbe-kin-list li").innerHTML;
  expect(text).toContain('<span class="wbe-kin-event">Born</span> Bef. 1900-01-02 in Ohio, USA<br><span class="wbe-kin-event">Died</span> ? in ?');
});

test("loading more generations keeps a full-screen chart full screen, with working buttons", async () => {
  const reload = jest.fn(async () => showFamilyMatrixPopup(buildFamilyMatrix(people, "Person-1"), { reload }));
  const popup = showFamilyMatrixPopup(buildFamilyMatrix(people, "Person-1"), { reload });
  popup.querySelector('[data-act="full"]').click();
  expect(popup.classList.contains("wbe-chart-full")).toBe(true);
  popup.querySelector('[data-act="load"]').click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const after = document.getElementById("wbe-family-matrix-popup");
  expect(reload).toHaveBeenCalledTimes(1);
  expect(after).toBe(popup);
  expect(after.classList.contains("wbe-chart-full")).toBe(true);
  after.querySelector('[data-act="load"]').click(); // one handler, not two
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(reload).toHaveBeenCalledTimes(2);
  after.querySelector('[data-act="full"]').click();
  expect(after.classList.contains("wbe-chart-full")).toBe(false);
});

test("root-only and descendant-only trees remain usable", () => {
  expect(buildFamilyMatrix({ 1: p(1) }, "Person-1").total).toBe(0);
  const matrix = buildFamilyMatrix({ 1: p(1), 6: p(6, 1) }, "Person-1");
  expect(matrix.cards.map((card) => card.label)).toEqual(["children"]);
});

test("loader paginates related profiles and merges repeated seed profiles", async () => {
  const page = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [i + 100, p(i + 100)]));
  const api = { getPeople: jest.fn(async (_app, _keys, _fields, options) =>
    options.ancestors && !options.start ? ["", {}, { 1: p(1), ...page }] : ["", {}, { 1: p(1) }]) };
  const result = await loadFamilyMatrixPeople(api, "test", "Person-1", 4, 5);
  expect(api.getPeople.mock.calls[1][3].start).toBe(1000);
  expect(Object.keys(result)).toHaveLength(1001);
});


test("relationships align by generation and branch instead of wrapping as tiles", () => {
  const popup = showFamilyMatrixPopup(buildFamilyMatrix(people, "Person-1"));
  const rows = [...popup.querySelectorAll("tbody tr")];
  const same = rows.find((row) => row.dataset.generation === "0");
  expect(same.children[0].textContent).not.toContain("focus person");
  expect(same.children[1].textContent).toContain("siblings");
  expect(same.children[2].textContent).toContain("1st cousins");
  const below = rows.find((row) => row.dataset.generation === "-1");
  expect(below.children[0].textContent).toContain("children");
  expect(below.children[1].textContent).toContain("nieces / nephews");
  expect(parseFamilyMatrixPrompt("my family relationships").owner).toBe("my");
});


test("people appear in a floating hover list and stay accessible while entering it", () => {
  jest.useFakeTimers();
  const popup = showFamilyMatrixPopup(buildFamilyMatrix(people, "Person-1"));
  const card = popup.querySelector('[data-card]');
  const list = popup.querySelector('.wbe-kin-list');
  expect(list.hidden).toBe(true);
  card.dispatchEvent(new MouseEvent("mouseenter"));
  expect(list.hidden).toBe(false);
  expect(list.style.left).toMatch(/px$/);
  card.dispatchEvent(new MouseEvent("mouseleave"));
  list.dispatchEvent(new MouseEvent("mouseenter"));
  jest.advanceTimersByTime(200);
  expect(list.hidden).toBe(false);
  list.dispatchEvent(new MouseEvent("mouseleave"));
  jest.advanceTimersByTime(200);
  expect(list.hidden).toBe(true);
  card.click();
  card.dispatchEvent(new MouseEvent("mouseleave"));
  jest.advanceTimersByTime(200);
  expect(list.hidden).toBe(false);
  jest.useRealTimers();
});


test("exports contain portable SVG cards and labels, excluding transient hover lists", () => {
  const popup = showFamilyMatrixPopup(buildFamilyMatrix(people, "Person-1"));
  const table = popup.querySelector("table");
  table.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 700 });
  const svg = familyRelationshipsSvg(popup, "Relationship Chart: First1 Family");
  expect(svg.getAttribute("viewBox")).toBe("0 0 632 780");
  expect(svg.textContent).toContain("grandchildren");
  expect(svg.textContent).toContain("First1 Family");
  expect(svg.querySelector("foreignObject")).toBeNull();
  expect(popup.querySelector('[data-act="svg"]')).not.toBeNull();
  expect(popup.querySelector('[data-act="png"]')).not.toBeNull();
});
