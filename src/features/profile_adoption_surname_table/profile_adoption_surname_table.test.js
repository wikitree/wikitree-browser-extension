import $ from "jquery";

jest.mock("../../core/options/options_storage", () => ({
  shouldInitializeFeature: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("../../core/pageType", () => ({ isSpecialProfileAdoptionsSurname: true, mainDomain: "www.wikitree.com" }));

const mockFetchedPage = `<html><body><form id="editform"><table><tbody>
${[1, 2, 3, 4]
  .map(
    (n) => `<tr><td><input id="check_${n}" type="checkbox" name="idlist[]" value="${900 + n}"></td>
<td><a href="/wiki/Buch-${n}">Person ${n}</a><span class="small">x</span></td></tr>`
  )
  .join("")}
</tbody></table></form></body></html>`;

const mockPeople = {
  1: {
    Id: 1,
    Name: "Buch-1",
    FirstName: "Amanda",
    MiddleName: "Louisa",
    LastNameAtBirth: "Buch",
    LastNameCurrent: "Hornberger",
    BirthDate: "1848-12-31",
    BirthLocation: "Warwick Township, Lancaster County, Pennsylvania, United States",
    DeathDate: "1917-11-13",
    DeathLocation: "",
  },
  2: {
    Id: 2,
    Name: "Buch-2",
    FirstName: "Isaac",
    MiddleName: "",
    LastNameAtBirth: "Buch",
    LastNameCurrent: "Buch",
    BirthDate: "1826-07-18",
    BirthLocation: "Tromsø, Troms, Norway",
    DeathDate: "1907-07-20",
    DeathLocation: "",
  },
  3: {
    Id: 3,
    Name: "Buch-3",
    FirstName: "Daniel",
    MiddleName: "",
    LastNameAtBirth: "Buch",
    LastNameCurrent: "Buch",
    BirthDate: "1630-00-00",
    BirthLocation: "Holy Roman Empire",
    DeathDate: "1690-00-00",
    DeathLocation: "",
  },
};

jest.mock("../../core/API/wwwWikiTree", () => ({ getWikiTreePage: jest.fn(() => Promise.resolve(mockFetchedPage)) }));
jest.mock("../../core/API/WikiTreeAPI", () => ({
  WikiTreeAPI: {
    getPeople: jest.fn(() =>
      Promise.resolve([
        "",
        { "Buch-1": { Id: 1 }, "Buch-2": { Id: 2 }, "Buch-3": { Id: 3 }, "Buch-4": { status: "no" } },
        mockPeople,
      ])
    ),
  },
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const visibleIds = () =>
  $("#wbeProfileAdoptionTable tbody tr td.wbe-profile-adoption-wtId")
    .map((i, td) => td.textContent)
    .get();

beforeAll(async () => {
  window.history.pushState({}, "", "/index.php?title=Special:Adoptions&order=&s=BUCH");
  document.body.innerHTML = `<form id="editform" method="post" action="/wiki/Special:Adoptions">
    <input type="hidden" name="action" value="adopt">
    <table><tbody><tr><td><input type="checkbox" name="idlist[]" value="901"></td><td><a href="/wiki/Buch-1">P</a></td></tr></tbody></table>
    <input type="submit" value="Adopt"></form>`;
  require("./profile_adoption_surname_table");
  for (let i = 0; i < 10; i++) await flush();
});

it("waits for the button before loading anything", async () => {
  const { getWikiTreePage } = require("../../core/API/wwwWikiTree");
  expect(getWikiTreePage).not.toHaveBeenCalled();
  expect($("#wbeProfileAdoptionTable").length).toBe(0);
  $("#wbeProfileAdoptionTableButton").trigger("click");
  for (let i = 0; i < 10; i++) await flush();
  expect($("#wbeProfileAdoptionTableButton").length).toBe(0);
});

it("fetches the 1000-row page and the API data", () => {
  const { getWikiTreePage } = require("../../core/API/wwwWikiTree");
  expect(getWikiTreePage.mock.calls[0][2]).toBe("title=Special%3AAdoptions&limit=1000&start=0&order=&s=BUCH");
  const { WikiTreeAPI } = require("../../core/API/WikiTreeAPI");
  expect(WikiTreeAPI.getPeople.mock.calls[0][1]).toEqual(["Buch-1", "Buch-2", "Buch-3", "Buch-4"]);
});

it("replaces the original table", () => {
  expect($("#editform table").length).toBe(1);
  expect($("#wbeProfileAdoptionTable").length).toBe(1);
  expect($('#editform input[type=checkbox][name="idlist[]"]').length).toBe(0);
  expect(visibleIds().sort()).toEqual(["Buch-1", "Buch-2", "Buch-3", "Buch-4"]);
});

it("notes profiles without API data", () => {
  expect($(".wbe-profile-adoption-missing-note").text()).toContain("1 profile: Buch-4");
  expect($(".wbe-profile-adoption-row-missing .wbe-profile-adoption-missing").text()).toBe("Person 4");
});

function setFilter(column, value) {
  $(`.wbe-profile-adoption-filter[data-column=${column}]`).val(value);
  $("#wbeProfileAdoptionTable").DataTable().draw();
}

it("filters dates and names", () => {
  setFilter(6, ">1800 <1840");
  expect(visibleIds()).toEqual(["Buch-2"]);
  setFilter(6, "!1826");
  expect(visibleIds().sort()).toEqual(["Buch-1", "Buch-3", "Buch-4"]);
  setFilter(6, "");
  setFilter(2, "!amanda !isaac");
  expect(visibleIds().sort()).toEqual(["Buch-3", "Buch-4"]);
  setFilter(2, "");
});

it("reverses places and sorts by them", () => {
  const table = $("#wbeProfileAdoptionTable").DataTable();
  $("#wbeProfileAdoptionReversePlaces").trigger("click");
  expect(
    $("#wbeProfileAdoptionTable td.wbe-profile-adoption-BirthLocation")
      .map((i, td) => td.textContent)
      .get()
  ).toContain("United States, Pennsylvania, Lancaster County, Warwick Township");
  table.order([7, "asc"]).draw();
  expect(visibleIds()).toEqual(["Buch-3", "Buch-2", "Buch-1", "Buch-4"]);
  setFilter(7, '"lancaster county, pennsylvania"');
  expect(visibleIds()).toEqual(["Buch-1"]);
  setFilter(7, "");
  $("#wbeProfileAdoptionReversePlaces").trigger("click");
  table.order([7, "asc"]).draw();
  expect(visibleIds()).toEqual(["Buch-3", "Buch-2", "Buch-1", "Buch-4"]);
  table.order([7, "desc"]).draw();
  expect(visibleIds()[0]).toBe("Buch-1");
});

it("keeps blank cells at the bottom in both directions", () => {
  const table = $("#wbeProfileAdoptionTable").DataTable();
  table.order([8, "asc"]).draw();
  expect(visibleIds()).toEqual(["Buch-3", "Buch-2", "Buch-1", "Buch-4"]);
  table.order([8, "desc"]).draw();
  expect(visibleIds()).toEqual(["Buch-1", "Buch-2", "Buch-3", "Buch-4"]);
  table.order([3, "desc"]).draw();
  expect(visibleIds()[0]).toBe("Buch-1");
  table.order([3, "asc"]).draw();
  expect(visibleIds()[0]).toBe("Buch-1");
});

it("select-all only selects filtered rows, and every selected row is submitted", () => {
  const table = $("#wbeProfileAdoptionTable").DataTable();
  setFilter(4, "=buch");
  setFilter(5, "hornberger");
  $("#wbeProfileAdoptionSelectAll").prop("checked", true).trigger("change");
  expect($("#wbeProfileAdoptionSelectedCount").text()).toBe("1 selected");
  setFilter(5, "");
  setFilter(4, "");
  // Put Buch-3 on another page, then tick it there.
  table.page.len(1).order([1, "asc"]).draw();
  table.page(2).draw(false);
  $("#wbeProfileAdoptionTable tbody .wbe-profile-adoption-check").prop("checked", true).trigger("change");
  table.page(0).draw(false);
  expect($("#wbeProfileAdoptionSelectedCount").text()).toBe("2 selected");

  setFilter(0, "checked");
  table.page.len(100).draw();
  expect(visibleIds()).toEqual(["Buch-1", "Buch-3"]);

  const form = document.getElementById("editform");
  form.addEventListener("submit", (event) => event.preventDefault());
  $(form).trigger("submit");
  const posted = new FormData(form).getAll("idlist[]");
  expect(posted.sort()).toEqual(["901", "903"]);
  expect(new FormData(form).get("action")).toBe("adopt");
});
