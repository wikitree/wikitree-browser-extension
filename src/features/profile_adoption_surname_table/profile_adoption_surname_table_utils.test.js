import {
  buildProfileAdoptionsPath,
  parseProfileAdoptionRows,
  formatDate,
  dateSortKey,
  compareBlanksLast,
  reversePlace,
  matchesTextFilter,
  matchesDateFilter,
  parseFilterDate,
} from "./profile_adoption_surname_table_utils";

describe("buildProfileAdoptionsPath", () => {
  it("builds the paged surname URL", () => {
    expect(buildProfileAdoptionsPath("BUCH", 1000)).toBe(
      "/index.php?title=Special%3AAdoptions&limit=1000&start=1000&order=&s=BUCH"
    );
  });
});

describe("parseProfileAdoptionRows", () => {
  it("reads checkbox values and profile links", () => {
    document.body.innerHTML = `<form id="editform"><table><tbody>
      <tr><td><input id="check_532596" type="checkbox" name="idlist[]" value="515831"></td>
      <td><a href="/wiki/Buch-3">Amanda Louisa (Buch) Hornberger</a>
      <span class="small">31 Dec 1848 Warwick Township -
       13 Nov 1917
      </span></td></tr>
      <tr><td><input id="check_2" type="checkbox" name="idlist[]" value="2"></td>
      <td><a href="/wiki/O%27Buch-1">X</a></td></tr>
    </tbody></table></form>`;
    expect(parseProfileAdoptionRows(document)).toEqual([
      {
        value: "515831",
        checkboxId: "check_532596",
        wtId: "Buch-3",
        displayName: "Amanda Louisa (Buch) Hornberger",
        summary: "31 Dec 1848 Warwick Township - 13 Nov 1917",
      },
      { value: "2", checkboxId: "check_2", wtId: "O'Buch-1", displayName: "X", summary: "" },
    ]);
  });
});

describe("dates", () => {
  it("formats partial dates", () => {
    expect(formatDate("1848-12-31")).toBe("31 Dec 1848");
    expect(formatDate("1653-00-00")).toBe("1653");
    expect(formatDate("1681-10-00")).toBe("Oct 1681");
    expect(formatDate("0000-00-00")).toBe("");
    expect(formatDate(undefined)).toBe("");
  });
  it("sorts undated first", () => {
    expect(dateSortKey("0000-00-00")).toBe(0);
    expect(dateSortKey("1653-00-00")).toBeLessThan(dateSortKey("1653-01-01"));
  });
  it("parses filter dates", () => {
    expect(parseFilterDate("1850")).toEqual({ value: 18500000, precision: 1 });
    expect(parseFilterDate("Mar 1850")).toEqual({ value: 18500300, precision: 2 });
    expect(parseFilterDate("5 March 1850")).toEqual({ value: 18500305, precision: 3 });
    expect(parseFilterDate("1850-03-05")).toEqual({ value: 18500305, precision: 3 });
    expect(parseFilterDate("Buch")).toBeNull();
  });
});

describe("matchesDateFilter", () => {
  const d = "1848-12-31";
  it.each([
    ["", true],
    ["1848", true],
    ["1849", false],
    [">1847", true],
    [">1848", false],
    [">=1848", true],
    ["<1849", true],
    ["<1848", false],
    [">1800 <1900", true],
    [">1800 <1840", false],
    ["!1848", false],
    ["!1850", true],
    ["!>1900", true],
    ["1800-1900", true],
    ["1900-1800", true],
    ["1849-1900", false],
    ["Dec 1848", true],
    ["1848-11", false],
    [">1848-11", true],
    ["Dec", true],
    ["!Dec", false],
    ["=", false],
    ["!", true],
  ])("%s -> %s", (filter, expected) => {
    expect(matchesDateFilter(d, filter)).toBe(expected);
  });
  it("handles undated rows", () => {
    expect(matchesDateFilter("0000-00-00", ">1800")).toBe(false);
    expect(matchesDateFilter("0000-00-00", "!1800")).toBe(true);
    expect(matchesDateFilter("0000-00-00", "=")).toBe(true);
    expect(matchesDateFilter("0000-00-00", "!")).toBe(false);
  });
  it("compares at the filter's precision", () => {
    expect(matchesDateFilter("1653-00-00", "1653")).toBe(true);
    expect(matchesDateFilter("1653-00-00", ">1652")).toBe(true);
  });
});

describe("matchesTextFilter", () => {
  it.each([
    ["", true],
    ["amanda", true],
    ["AMANDA louisa", true],
    ["amanda !louisa", false],
    ["!isaac", true],
    ['"louisa amanda"', false],
    ['"amanda louisa"', true],
    ['!"amanda louisa"', false],
    ["=amanda", false],
    ["=amanda louisa", false],
    ['="amanda louisa"', true],
    ["!", true],
    ["=", false],
  ])("%s -> %s", (filter, expected) => {
    expect(matchesTextFilter("Amanda Louisa", filter)).toBe(expected);
  });
  it("ignores accents", () => {
    expect(matchesTextFilter("Böschweiler", "boschweiler")).toBe(true);
  });
  it("handles empty cells", () => {
    expect(matchesTextFilter("", "=")).toBe(true);
    expect(matchesTextFilter("", "!")).toBe(false);
    expect(matchesTextFilter("", "!x")).toBe(true);
  });
  it("matches a place in either order", () => {
    const place = "Warwick Township, Lancaster County, Pennsylvania";
    const texts = [place, reversePlace(place)];
    expect(matchesTextFilter(texts, '"pennsylvania, lancaster"')).toBe(true);
    expect(matchesTextFilter(texts, '"lancaster county, pennsylvania"')).toBe(true);
    expect(matchesTextFilter(texts, "!pennsylvania")).toBe(false);
  });
});

describe("reversePlace", () => {
  it("reverses comma separated parts", () => {
    expect(reversePlace("Tromsø, Troms, Norway")).toBe("Norway, Troms, Tromsø");
    expect(reversePlace(" Russia")).toBe("Russia");
    expect(reversePlace("")).toBe("");
  });
});

describe("compareBlanksLast", () => {
  const sorted = (values, direction) => [...values].sort((a, b) => compareBlanksLast(a, b, direction));
  it("keeps blanks last in both directions", () => {
    expect(sorted(["", "b", null, "A", "c"], "asc")).toEqual(["A", "b", "c", "", null]);
    expect(sorted(["", "b", null, "A", "c"], "desc")).toEqual(["c", "b", "A", "", null]);
    expect(sorted(["", 18481231, 16300000], "asc")).toEqual([16300000, 18481231, ""]);
    expect(sorted(["", 18481231, 16300000], "desc")).toEqual([18481231, 16300000, ""]);
  });
  it("sorts numbers inside text numerically", () => {
    expect(sorted(["Buch-17", "Buch-3"], "asc")).toEqual(["Buch-3", "Buch-17"]);
  });
});
