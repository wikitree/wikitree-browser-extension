import { ancestorHeading, createRelationshipView } from "./relationship_views";
import { enhanceRelationshipResults } from "./relationship_results";

const fixture = `<div id="imageContainer"><h3>A and B are cousins</h3>
<p class="my-3"><a href="/wiki/Start-1">A</a> and <a href="/wiki/Other-2">B</a> are descendants of <a href="/wiki/Common-3">Common</a>.</p>
<p class="mb-3"><span class="ancestor_1">1. A is the child of [<a href="/wiki/Help:Privacy">private</a> parent]</span><br>
<span class="ancestor_2">2. Private is the child of <a href="/wiki/Common-3">Common</a><a href="/wiki/Help:Confident" title="Confident relationship"><span class="icon--confident"></span></a></span><br>This makes Common the grandparent of A.</p>
<p class="mb-3"><span class="ancestor_1">1. B is the child of <a href="/wiki/Common-3">Common</a></span><br>This makes Common the parent of B.</p></div>`;
const options = {
  layout: "sideBySide",
  sharedAncestorBox: true,
  explainGenerations: true,
  highlightLineage: true,
  showStatus: true,
  copyReport: true,
};
const settle = async () => {
  for (let i = 0; i < 12; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach(() => {
  document.body.innerHTML = fixture;
});

test("builds descending trails with endpoints, private people and existing statuses", () => {
  createRelationshipView(document.querySelector("#imageContainer"), options);
  const columns = document.querySelectorAll(".wbe-relationship-column");
  expect(columns).toHaveLength(2);
  expect(columns[0].querySelector(".wbe-relationship-generation").textContent).toBe("1");
  expect(columns[0].querySelector("li").textContent).not.toContain("Common");
  expect(columns[0].textContent).toContain("[private parent]");
  expect(columns[0].querySelector("li:last-child .wbe-relationship-path-person").textContent).toBe("A");
  expect(columns[0].querySelector(".wbe-relationship-status")).toBeNull();
  const icon = columns[0].querySelector(".wbe-relationship-status-icon");
  expect(icon.querySelector(".icon--confident")).not.toBeNull();
  expect(icon.getAttribute("href")).toBe("/wiki/Help:Confident");
  expect(icon.getAttribute("aria-label")).toBe("Confident relationship");
  expect(columns[1].querySelector(".wbe-relationship-status")).toBeNull();
  expect(document.querySelector(".wbe-relationship-generations").textContent).toContain("2 generations from A");
  expect(document.querySelector(".wbe-relationship-shared a").textContent).toBe("Common");
});

test("offers only Original and Side by side and preserves the source trails when switching", () => {
  createRelationshipView(document.querySelector("#imageContainer"), options);
  const select = document.querySelector('[aria-label="Relationship result layout"]');
  expect([...select.options].map((option) => option.value)).toEqual(["original", "sideBySide"]);
  select.value = "original";
  select.dispatchEvent(new Event("change"));
  expect(document.querySelector(".wbe-relationship-columns")).toBeNull();
  expect([...document.querySelectorAll("p.mb-3")].every((p) => !p.hidden)).toBe(true);
  select.value = "sideBySide";
  select.dispatchEvent(new Event("change"));
  expect(document.querySelectorAll(".wbe-relationship-column")).toHaveLength(2);
  expect(document.querySelectorAll(".ancestor_1")).toHaveLength(2);
  expect(document.querySelectorAll(".wbe-relationship-tools")).toHaveLength(1);
});

test("late spouse enrichment refreshes comparison views without duplicating UI or API requests", async () => {
  document.body.innerHTML = fixture.replace(
    '[<a href="/wiki/Help:Privacy">private</a> parent]',
    '<a href="/wiki/Parent-6">Parent</a>'
  );
  const api = jest.fn(async (keys) => [
    "",
    {},
    keys[0] === "Parent-6"
      ? { 6: { Id: 6, Name: "Parent-6", Spouses: [{ Id: 4 }] }, 3: { Id: 3, Name: "Common-3" } }
      : { 4: { Id: 4, Name: "Spouse-4", FirstName: "Partner" } },
  ]);
  const observer = enhanceRelationshipResults(document, { ...options, addSpouses: true }, api);
  await settle();
  expect(document.querySelectorAll(".wbe-relationship-tools")).toHaveLength(1);
  expect(document.querySelectorAll(".wbe-relationship-columns .wbe-relationship-spouse-person")).toHaveLength(1);
  expect(api).toHaveBeenCalledTimes(2);
  observer.disconnect();
});

test("copy fallback includes profile URLs and both trails", async () => {
  const writeText = jest.fn(async () => {});
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  createRelationshipView(document.querySelector("#imageContainer"), options);
  document.querySelector("button").click();
  await settle();
  expect(writeText.mock.calls[0][0]).toContain("http://localhost/wiki/Start-1");
  expect(writeText.mock.calls[0][0]).toContain("A is the child of");
  expect(writeText.mock.calls[0][0]).toContain("B is the child of");
  expect(document.querySelector('[role="status"]').textContent).toContain("copied");
});

test("unsupported markup is preserved", () => {
  document.body.innerHTML = '<div id="imageContainer"><p>No relationship found</p></div>';
  expect(createRelationshipView(document.querySelector("#imageContainer"), options)).toBeNull();
  expect(document.querySelector("#imageContainer").textContent).toBe("No relationship found");
});

test("refreshes added rows and rebuilds after source paragraphs are replaced", async () => {
  const observer = enhanceRelationshipResults(document, options, jest.fn());
  const source = document.querySelector("p.mb-3");
  source.insertAdjacentHTML(
    "beforeend",
    '<span class="ancestor_3">3. Common is the child of <a href="/wiki/Elder-5">Elder</a></span>'
  );
  await settle();
  expect(document.querySelectorAll(".wbe-relationship-column")[0].querySelectorAll("li")).toHaveLength(3);
  const fresh = document.createElement("div");
  fresh.innerHTML = fixture;
  document.querySelectorAll("p.mb-3").forEach((paragraph) => paragraph.remove());
  [...fresh.querySelectorAll("p.mb-3")].forEach((paragraph) =>
    document.querySelector("#imageContainer").append(paragraph)
  );
  await settle();
  expect(document.querySelectorAll(".wbe-relationship-tools")).toHaveLength(1);
  expect(document.querySelectorAll(".wbe-relationship-column")[0].querySelectorAll("li")).toHaveLength(2);
  observer.disconnect();
});

test("colours the path person by the original son/daughter relationship and separates spouses", () => {
  document.body.innerHTML = fixture
    .replace("2. Private is the child", "2. Private is the daughter")
    .replace(
      '[<a href="/wiki/Help:Privacy">private</a> parent]',
      '<a href="/wiki/Parent-6">Parent</a><span class="wbe-relationship-spouses"> and <a href="/wiki/Spouse-7" data-wbe-gender="Male">Partner</a></span>'
    );
  createRelationshipView(document.querySelector("#imageContainer"), options);
  const first = document.querySelector(".wbe-relationship-column li");
  expect(first.querySelector(".wbe-relationship-path-person").classList.contains("background--gender-female")).toBe(
    true
  );
  expect(first.querySelector(".wbe-relationship-path-person").textContent).toBe("Parent");
  expect(first.querySelector(".wbe-relationship-spouse-person").classList.contains("background--gender-male")).toBe(
    true
  );
  expect(first.querySelector(".wbe-relationship-person").getAttribute("aria-label")).toContain("daughter of Common");
  expect(document.querySelector(".wbe-relationship-arrow")).toBeNull();
  expect(document.querySelector(".wbe-relationship-column li:last-child .wbe-relationship-connection")).toBeNull();
  expect(first.querySelector(".wbe-relationship-spouse-label").textContent).toBe("=");
  expect(first.querySelector(".wbe-relationship-spouse-label").getAttribute("aria-label")).toBe("Spouse");
  expect(document.querySelector(".wbe-relationship-columns").textContent).not.toContain("generations above");
  expect(document.querySelector(".wbe-relationship-columns").textContent).not.toContain("Lineage");
});

test("names the shared ancestors by their relationship to each person", () => {
  expect(ancestorHeading("Ian Beacall", 7, true)).toBe("Ian Beacall’s 5th great grandparents");
  expect(ancestorHeading("Ann Beacall (bef.1825-)", 2, true)).toBe("Ann Beacall’s grandparents");
  expect(ancestorHeading("Person", 1, false)).toBe("Person’s parent");
  expect(ancestorHeading("Person", 3, true)).toBe("Person’s great grandparents");
  expect(ancestorHeading("Person", 13, true)).toBe("Person’s 11th great grandparents");
});

test("shows short ancestor summaries, path headings and bold shared ancestors", () => {
  createRelationshipView(document.querySelector("#imageContainer"), options);
  const summaries = document.querySelectorAll(".wbe-relationship-shared .wbe-relationship-summary");
  expect([...summaries].map((node) => node.textContent)).toEqual(["A’s grandparent.", "B’s parent."]);
  expect([...document.querySelectorAll(".wbe-relationship-column h4")].map((node) => node.textContent)).toEqual([
    "Path to A",
    "Path to B",
  ]);
  expect(document.querySelector(".wbe-relationship-shared a").classList.contains("wbe-relationship-direct")).toBe(true);
});

test("gender colours apply in Original and can be disabled in both views", () => {
  document.body.innerHTML = fixture
    .replace("2. Private is the child", "2. Private is the daughter")
    .replace('[<a href="/wiki/Help:Privacy">private</a> parent]', '<a href="/wiki/Parent-6">Parent</a>');
  createRelationshipView(document.querySelector("#imageContainer"), {
    ...options,
    layout: "original",
    genderColors: true,
  });
  expect(
    document.querySelector('.ancestor_1 a[href="/wiki/Parent-6"]').classList.contains("background--gender-female")
  ).toBe(true);
  document.body.innerHTML = fixture;
  createRelationshipView(document.querySelector("#imageContainer"), { ...options, genderColors: false });
  expect(document.querySelector('[class*="background--gender-"]')).toBeNull();
});

test("uses once removed and singular generation for a one-generation difference", () => {
  document.body.innerHTML = fixture;
  const second = document.querySelectorAll("p.mb-3")[1];
  second.insertAdjacentHTML(
    "beforeend",
    '<span class="ancestor_2">2. Common is the child of <a href="/wiki/Elder-5">Elder</a></span><span class="ancestor_3">3. Elder is the child of <a href="/wiki/Oldest-6">Oldest</a></span>'
  );
  createRelationshipView(document.querySelector("#imageContainer"), options);
  const text = document.querySelector(".wbe-relationship-generations").textContent;
  expect(text).toContain("“Once removed” means the paths differ by 1 generation.");
  expect(text).not.toContain("trails");
  expect(text).not.toContain("1 generations");
});

test("generation explanation describes both shared ancestors", () => {
  document.body.innerHTML = fixture.replace("Common</a>.", 'Common</a> and <a href="/wiki/Partner-7">Partner</a>.');
  createRelationshipView(document.querySelector("#imageContainer"), options);
  expect(document.querySelector(".wbe-relationship-generations").textContent).toContain("to the shared ancestors;");
});

test("shared ancestors use API gender colours when enabled", () => {
  document.body.innerHTML = fixture.replace(
    'href="/wiki/Common-3">Common</a>.',
    'href="/wiki/Common-3" data-wbe-gender="Female">Common</a> and <a href="/wiki/Partner-7" data-wbe-gender="Male">Partner</a>.'
  );
  createRelationshipView(document.querySelector("#imageContainer"), { ...options, genderColors: true });
  const links = document.querySelectorAll(".wbe-relationship-shared a");
  expect(links[0].classList.contains("background--gender-female")).toBe(true);
  expect(links[1].classList.contains("background--gender-male")).toBe(true);
  const select = document.querySelector('[aria-label="Relationship result layout"]');
  select.value = "original";
  select.dispatchEvent(new Event("change"));
  const original = document.querySelectorAll("p.my-3 a");
  expect(original[2].classList.contains("background--gender-female")).toBe(true);
  expect(original[3].classList.contains("background--gender-male")).toBe(true);
});

test("supports the supplied direct relationship with a single path and Original switch", () => {
  const fs = require("fs");
  document.body.innerHTML = fs.readFileSync(require.resolve("./direct_relationship.fixture.html"), "utf8");
  createRelationshipView(document.querySelector("#imageContainer"), options);
  const select = document.querySelector('[aria-label="Relationship result layout"]');
  expect([...select.options].map((option) => option.textContent)).toEqual(["Original", "Path"]);
  expect(document.querySelectorAll(".wbe-relationship-column")).toHaveLength(1);
  expect(document.querySelectorAll(".wbe-relationship-column li")).toHaveLength(10);
  expect(document.querySelector(".wbe-relationship-shared h4").textContent).toBe("Ancestor");
  expect(document.querySelector(".wbe-relationship-shared a").getAttribute("href")).toBe("/wiki/Beacall-385");
  expect(
    document
      .querySelector(".wbe-relationship-column li:last-child .wbe-relationship-path-person a")
      .getAttribute("href")
  ).toBe("/wiki/Beacall-6");
  expect(document.querySelector(".wbe-relationship-generations").textContent).not.toContain("removed");
  select.value = "original";
  select.dispatchEvent(new Event("change"));
  expect(document.querySelector(".ancestor_1").parentElement.hidden).toBe(false);
  expect(document.querySelector(".wbe-relationship-columns")).toBeNull();
});

test("uses grandfather or grandmother for a single ancestor with known gender", () => {
  expect(ancestorHeading("Ian", 10, false, "Male")).toBe("Ian’s 8th great grandfather");
  expect(ancestorHeading("Ann", 2, false, "Female")).toBe("Ann’s grandmother");
  expect(ancestorHeading("Ann", 1, false, "Female")).toBe("Ann’s mother");
  expect(ancestorHeading("Ann", 2, true, "Male")).toBe("Ann’s grandparents");
});
