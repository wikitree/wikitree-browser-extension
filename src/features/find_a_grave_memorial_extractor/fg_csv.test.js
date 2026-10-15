import { buildCsv, escapeCsvField, neutralizeFormula } from "./fg_csv";

const row = {
  memorialId: "24170759",
  surname: "Casados",
  maidenName: "Gonzales",
  givenNames: "Amalia",
  birthDate: "23 Feb 1928",
  deathDate: "24 Apr 1979",
  latitude: "36.9050917",
  longitude: "-104.4237222",
  plot: "B-163",
  hasPhoto: "Y",
  hasGravePhoto: "N",
  memorialLink: "https://www.findagrave.com/memorial/24170759/amalia-casados",
  wikiTreeIDs: ["Gonzales-1234"],
};

describe("escapeCsvField", () => {
  test("quotes only when needed and doubles quotes", () => {
    expect(escapeCsvField("plain")).toBe("plain");
    expect(escapeCsvField("a,b")).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField("two\nlines")).toBe('"two\nlines"');
    expect(escapeCsvField(undefined)).toBe("");
    expect(escapeCsvField(null)).toBe("");
  });
});

describe("buildCsv", () => {
  test("genealogy columns, with a BOM and CRLF line ends", () => {
    const lines = buildCsv([row]).replace("\uFEFF", "").split("\r\n");
    expect(buildCsv([row]).charCodeAt(0)).toBe(0xfeff);
    expect(lines[0]).toBe(
      "Memorial ID,Surname,Maiden Name,Given Names,WikiTree ID,Birth Date,Death Date,Latitude,Longitude,Plot"
    );
    expect(lines[1]).toBe(
      "24170759,Casados,Gonzales,Amalia,Gonzales-1234,23 Feb 1928,24 Apr 1979,36.9050917,-104.4237222,B-163"
    );
  });

  test("several WikiTree IDs share one cell", () => {
    const line = buildCsv([{ ...row, wikiTreeIDs: ["A-1", "B-2"] }]).split("\r\n")[1];
    expect(line).toContain(",A-1;B-2,");
  });

  test("no WikiTree profile and no coordinates give empty cells", () => {
    const line = buildCsv([{ ...row, wikiTreeIDs: [], latitude: "", longitude: "", plot: "" }]).split("\r\n")[1];
    expect(line).toBe("24170759,Casados,Gonzales,Amalia,,23 Feb 1928,24 Apr 1979,,,");
  });

  test("a name with a comma is quoted", () => {
    const line = buildCsv([{ ...row, givenNames: "Mary, Ann" }]).split("\r\n")[1];
    expect(line).toContain('"Mary, Ann"');
  });

  test("original columns keep the earlier layout", () => {
    const lines = buildCsv([{ ...row, birthDate: "" }], "original")
      .replace("\uFEFF", "")
      .split("\r\n");
    expect(lines[0]).toBe("FG ID,Name,Birth Date,Death Date,Has Photo,Has Grave Photo,Memorial Link,WikiTree Link");
    expect(lines[1]).toBe(
      "24170759,Amalia (Gonzales) Casados,unknown,24 Apr 1979,Y,N,https://www.findagrave.com/memorial/24170759/amalia-casados,https://www.wikitree.com/wiki/Gonzales-1234"
    );
  });

  test("original name is the name as Find a Grave shows it, with nickname and suffix", () => {
    const line = buildCsv([{ ...row, displayName: "Dr. Amalia “Mollie” (Gonzales) Casados Jr." }], "original").split(
      "\r\n"
    )[1];
    expect(line).toContain(",Dr. Amalia “Mollie” (Gonzales) Casados Jr.,");
  });

  test("unknown column set falls back to genealogy", () => {
    expect(buildCsv([], "nope").replace("\uFEFF", "")).toMatch(/^Memorial ID,Surname/);
  });
});

describe("formula neutralizing", () => {
  test("a leading = + - @ tab or return gets an apostrophe", () => {
    expect(neutralizeFormula('=HYPERLINK("http://x","y")')).toBe('\'=HYPERLINK("http://x","y")');
    expect(neutralizeFormula("+1")).toBe("'+1");
    expect(neutralizeFormula("-")).toBe("'-");
    expect(neutralizeFormula("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(neutralizeFormula("\tx")).toBe("'\tx");
  });

  test("ordinary text and blanks are untouched", () => {
    expect(neutralizeFormula("Smith")).toBe("Smith");
    expect(neutralizeFormula("3/57/1/9th")).toBe("3/57/1/9th");
    expect(neutralizeFormula("")).toBe("");
    expect(neutralizeFormula(undefined)).toBe("");
  });

  test("buildCsv neutralizes text columns but keeps negative longitudes", () => {
    const line = buildCsv([{ ...row, plot: "=1+1", givenNames: "@x" }]).split("\r\n")[1];
    expect(line).toContain(",'@x,");
    expect(line).toContain("'=1+1");
    expect(line).toContain("-104.4237222");
    expect(line).not.toContain("'-104");
  });
});
