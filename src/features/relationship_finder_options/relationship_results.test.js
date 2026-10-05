import { enhanceRelationshipResults, isRelationshipPage } from "./relationship_results";

const settle = async () => {
  for (let i = 0; i < 12; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};
const result = `<div id="imageContainer"><p><span class="ancestor_1">1. Child is the son of <a href="/wiki/Parent-1">Parent</a><a href="/wiki/Help:Confident">Confident</a></span><br><span class="ancestor_2">2. [Private] is the child of [<a href="/wiki/Help:Privacy">private</a> father]</span></p></div>`;

test("limits the feature to Relationship Finder URLs", () => {
  expect(isRelationshipPage({ pathname: "/wiki/Special:Relationship" })).toBe(true);
  expect(isRelationshipPage({ pathname: "/index.php", search: "?title=Special%3ARelationship" })).toBe(true);
  expect(isRelationshipPage({ pathname: "/wiki/Special:Connection" })).toBe(false);
});

test("enhances delayed results, resolves spouse IDs, and does not duplicate additions", async () => {
  document.body.innerHTML = "";
  const api = jest.fn(async (keys) => [
    "",
    {},
    keys[0] === "Parent-1"
      ? { 1: { Id: 1, Name: "Parent-1", Spouses: [{ Id: 2 }, { Id: -3 }] } }
      : { 2: { Id: 2, Name: "Spouse-2", FirstName: "Other", LastNameAtBirth: "Family", BirthDate: "1900-00-00" } },
  ]);
  const observer = enhanceRelationshipResults(document, { noIndentation: true, addSpouses: true }, api);
  document.body.innerHTML = result;
  await settle();
  expect(document.querySelector("#imageContainer").classList.contains("wbe-relationship-flat")).toBe(true);
  expect(document.querySelector(".wbe-relationship-spouses a").textContent).toBe("Other Family (1900-)");
  expect(document.querySelector(".wbe-relationship-spouses").textContent).toBe(" and Other Family (1900-)");
  expect(document.querySelectorAll(".wbe-relationship-spouses")).toHaveLength(1);
  expect(api.mock.calls[1][0]).toEqual([2]);
  document.body.insertAdjacentHTML("beforeend", "<p>Unrelated update</p>");
  await settle();
  expect(api).toHaveBeenCalledTimes(2);
  document.body.innerHTML = result;
  await settle();
  expect(document.querySelectorAll(".wbe-relationship-spouses")).toHaveLength(1);
  expect(api).toHaveBeenCalledTimes(2);
  observer.disconnect();
});

test("options operate independently and API failure preserves original output", async () => {
  document.body.innerHTML = result;
  const api = jest.fn();
  let observer = enhanceRelationshipResults(document, { noIndentation: true, addSpouses: false }, api);
  await settle();
  expect(api).not.toHaveBeenCalled();
  observer.disconnect();
  document.body.innerHTML = result;
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  observer = enhanceRelationshipResults(document, { noIndentation: false, addSpouses: true }, async () => {
    throw new Error("Offline");
  });
  await settle();
  expect(document.querySelector(".wbe-relationship-flat")).toBeNull();
  expect(document.querySelector(".ancestor_1").textContent).toContain("Child is the son of");
  observer.disconnect();
  warn.mockRestore();
});

test("only includes the spouse who is the next child’s other parent", async () => {
  document.body.innerHTML = `<div id="imageContainer"><p><span class="ancestor_1">1. Ian is the son of <a href="/wiki/Thomas-1">Thomas</a></span><br><span class="ancestor_2">2. Thomas is the son of <a href="/wiki/Richard-2">Richard</a></span></p></div>`;
  const api = jest.fn(async (keys) => [
    "",
    {},
    keys.includes("Richard-2")
      ? {
          1: { Id: 1, Name: "Thomas-1", Father: 2, Mother: 4 },
          2: { Id: 2, Name: "Richard-2", Spouses: [{ Id: 3 }, { Id: 4 }] },
        }
      : {
          3: { Id: 3, Name: "Eleanor-3", FirstName: "Eleanor" },
          4: { Id: 4, Name: "Elizabeth-4", FirstName: "Elizabeth" },
        },
  ]);
  const observer = enhanceRelationshipResults(document, { addSpouses: true }, api);
  await settle();
  expect(api.mock.calls[0][1]).toContain("Mother,Father");
  const spouseLinks = document.querySelectorAll(".ancestor_2 .wbe-relationship-spouses a");
  expect(spouseLinks).toHaveLength(1);
  expect(spouseLinks[0].textContent).toBe("Elizabeth");
  observer.disconnect();
});
