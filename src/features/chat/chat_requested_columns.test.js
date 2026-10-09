import { readSearchSpecReply } from "./chat_search_spec";
import { addRequestedColumns, describeRequestedColumns, parseColumnRequest, requestedColumnFields } from "./chat_requested_columns";

// "Provide a list of profiles with last name Garver. Include a column with
// gender and one with Privacy level" was declined as unsupported (Discord, 2026-10-06).
test("a spec reply keeps known extra columns only", () => {
  const reply = readSearchSpecReply(
    '{"action":"search","understood":"Garvers","search":{"names":{"anyLastName":"Garver"},"columns":["gender","privacy","shoeSize","gender"]}}'
  );
  expect(reply.kind).toBe("search");
  expect(reply.columns).toEqual(["gender", "privacy"]);
});

test("fields to fetch", () => {
  expect(requestedColumnFields(["gender", "privacy", "fatherStatus", "motherStatus"])).toBe("Id,Name,Gender,Privacy,DataStatus");
  expect(describeRequestedColumns()).toMatch(/^gender \(male\/female\), privacy \(privacy level\), /);
});

test("addRequestedColumns fills rows by WikiTree ID", () => {
  const table = { columns: [{ key: "wtid" }], rows: [{ wtid: "Garver-1" }, { wtid: "Van Dyke-2" }, { wtid: "Nobody-9" }] };
  const people = {
    11: { Id: 11, Name: "Garver-1", Gender: "Female", Privacy: 60, Touched: "20240102030405", DataStatus: { Father: "30" } },
    12: { Id: 12, Name: "Van_Dyke-2", Gender: "Male", Privacy: 35, Managers: [{ Name: "Smith-5" }] },
  };
  const result = addRequestedColumns(table, ["gender", "privacy", "lastChanged", "fatherStatus", "managers", "nope"], people);
  expect(result.columns.map((column) => column.title)).toEqual([
    undefined,
    "Gender",
    "Privacy",
    "Last changed",
    "Father status",
    "Managers",
  ]);
  expect(result.rows[0]).toMatchObject({
    col_gender: "Female",
    col_privacy: "Open",
    col_lastChanged: "2024-01-02",
    col_fatherStatus: "DNA confirmed",
  });
  expect(result.rows[1]).toMatchObject({ col_privacy: "Private with public family tree", col_managers: "Smith-5" });
  expect(result.rows[2]).toEqual({ wtid: "Nobody-9" });
  expect(addRequestedColumns(table, [], people)).toBe(table);
  const privacy = result.columns.find((column) => column.key === "col_privacy");
  expect(privacy.render(result.rows[0])).toBe(
    '<span hidden>60 Open</span><img src="images/privacy_open.png" alt="Open" title="Open" width="16" height="16">'
  );
  expect(privacy.render(result.rows[2])).toBe("");
});

describe("parseColumnRequest", () => {
  test.each([
    ["add a privacy column", ["privacy"], ""],
    ["Add columns for gender and privacy level, please.", ["gender", "privacy"], ""],
    ["my cousins with gender and privacy columns", ["gender", "privacy"], "my cousins"],
    ["my 2nd cousins, with a column for managers", ["managers"], "my 2nd cousins"],
    ["profiles with last name Garver with a gender column", ["gender"], "profiles with last name Garver"],
    [
      'Provide a list of profiles with last name "Garver". Include a column with gender and one with Privacy level of profile.',
      ["gender", "privacy"],
      'Provide a list of profiles with last name "Garver"',
    ],
    ["show a birth date status column", ["birthDateStatus"], ""],
    ["his children with columns for father status and last edited", ["fatherStatus", "lastChanged"], "his children"],
  ])("%s", (prompt, keys, rest) => {
    expect(parseColumnRequest(prompt)).toEqual({ keys, rest });
  });
  test.each(["my cousins", "add a column", "sort the birth column", "add a shoe size column"])("declines %s", (prompt) => {
    expect(parseColumnRequest(prompt)).toBeNull();
  });
});

test("the Gender column is coloured by the row, and fills a missing row gender", () => {
  const table = { columns: [{ key: "wtid" }], rows: [{ wtid: "Doe-1" }, { wtid: "Doe-2", gender: "Female" }] };
  const people = [
    { Name: "Doe-1", Gender: "Male" },
    { Name: "Doe-2", Gender: "Female" },
  ];
  const result = addRequestedColumns(table, ["gender"], people);
  expect(result.columns.find((column) => column.key === "col_gender").cellClass).toBe("chat-gender-cell");
  expect(result.rows.map((row) => row.gender)).toEqual(["Male", "Female"]);
});
