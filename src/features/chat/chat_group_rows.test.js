import { buildGroupedResult, groupRows, groupValue } from "./chat_group_rows";
import { compileSearchSpec } from "./chat_search_spec";
import { ChatIntent, routeChatPrompt } from "./chat_router";

jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

// C17/C18, 2026-10-03: the spec said "WikiTree+ cannot rank or aggregate".
const rows = [
  { lnab: "Beacall", birth: "1832-05-01", birthLocation: "Wem, Shropshire, England" },
  { lnab: "Beacall", birth: "1838", birthLocation: "Sydney, New South Wales, Australia" },
  { lnab: "Dickin", birth: "1790s", birthLocation: "" },
  { lnab: "", birth: "", birthLocation: "Wem, Shropshire, England" },
];

describe("groupRows", () => {
  test("surnames, most common first, blanks counted apart", () => {
    expect(groupRows(rows, "lnab")).toEqual({
      groups: [
        { label: "Beacall", count: 2 },
        { label: "Dickin", count: 1 },
      ],
      unknown: 1,
    });
  });

  test("decades in time order, including decade-only dates", () => {
    expect(groupRows(rows, "birthDecade").groups).toEqual([
      { label: "1790s", count: 1 },
      { label: "1830s", count: 2 },
    ]);
  });

  test("country from the birth place", () => {
    expect(groupValue(rows[1], "country")).toBe("Australia");
  });

  test("grouped table keeps the person rows as its source", () => {
    const source = { title: "WT+ search", rows };
    const result = buildGroupedResult(source, "lnab");
    expect(result.message).toBe("4 profiles by surname at birth (2 groups):\n- Beacall: 2\n- Dickin: 1\n1 with no surname at birth recorded.");
    expect(result.table.sourceResult).toBe(source);
    expect(result.table.rows).toHaveLength(2);
  });
});

describe("spec groupBy", () => {
  test("is allowed and leaves the query alone", () => {
    expect(
      compileSearchSpec({ places: [{ text: "Shropshire" }], dates: [{ event: "birth", to: 1799 }], groupBy: "lnab" })
    ).toEqual({ query: 'Location=Shropshire sql="([Default].[Birth Date].AsNumber In 1..17999999)"', routePrompt: "", errors: [] });
  });

  test("an unknown groupBy is an error", () => {
    expect(compileSearchSpec({ places: [{ text: "Kent" }], groupBy: "occupation" }).errors).toContain(
      "unknown groupBy: occupation"
    );
  });
});

test("'group them by decade' is a countBy follow-up", () => {
  expect(routeChatPrompt("group them by decade", { hasStructuredResult: true })).toMatchObject({
    intent: ChatIntent.LAST_RESULT_OPERATION,
    params: { action: "countBy", field: "birthDecade" },
  });
});
