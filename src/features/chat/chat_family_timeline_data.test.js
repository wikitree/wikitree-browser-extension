import { parseFamilyTimelinePrompt, buildFamilyTimelineRows, rowSpan, aliveIn, buildFamilyTimelineSummary, familyLifespanRows } from "./chat_family_timeline_data";
import { isProfileNarrativePrompt } from "./chat_profile_narrative";

describe("parseFamilyTimelinePrompt", () => {
  test.each([
    ["family timeline", ""],
    ["show me her family timeline", ""],
    ["show me my family timeline", "me"],
    ["draw Cook-8721's family lifespan chart", "Cook-8721"],
    ["show a family timeline for Cook-8721", "Cook-8721"],
    ["show a timeline of her family", ""],
    ["timeline of my family", "me"],
    ["who in her family was alive when", ""],
  ])("%s", (prompt, owner) => {
    expect(parseFamilyTimelinePrompt(prompt)).toEqual({ owner });
  });

  test.each(["give me a timeline", "write a timeline of her life", "family tree", "show the Smith family"])("declines %s", (prompt) => {
    expect(parseFamilyTimelinePrompt(prompt)).toBeNull();
  });

  test("a timeline of her family is not the AI life narrative", () => {
    expect(isProfileNarrativePrompt("show a timeline of her family")).toBe(false);
  });
});

const entry = {
  person: {
    Id: 1,
    Name: "Cook-8721",
    RealName: "Ellen",
    Gender: "Female",
    BirthDate: "1832-01-01",
    DeathDate: "1898-05-01",
    Parents: { 2: { Id: 2, Name: "Cook-1", RealName: "John", Gender: "Male", BirthDate: "1800-00-00", DeathDate: "1870-00-00" } },
    Spouses: { 3: { Id: 3, Name: "Alley-1", RealName: "Charles", Gender: "Male", BirthDate: "1829-00-00", DeathDate: "1878-00-00", marriage_date: "1852-03-04" } },
    Siblings: { 4: { Id: 4, Name: "Cook-2", RealName: "Mary", Gender: "Female", BirthDate: "1835-00-00", DeathDate: "0000-00-00" } },
    Children: { 5: { Id: 5, Name: "Alley-2", RealName: "Ann", Gender: "Female", BirthDate: "1853-00-00", DeathDate: "1930-00-00" } },
  },
};
const grandchildEntries = [{ person: { Id: 5, Name: "Alley-2", Children: { 6: { Id: 6, Name: "Smith-1", RealName: "Tom", Gender: "Male", BirthDate: "1875-00-00" } } } }];

describe("buildFamilyTimelineRows", () => {
  const rows = buildFamilyTimelineRows(entry, grandchildEntries);
  test("orders by role and labels relations", () => {
    expect(rows.map((row) => [row.name, row.relation])).toEqual([
      ["John", "Father"],
      ["Ellen", ""],
      ["Charles", "Husband"],
      ["Mary", "Sister"],
      ["Ann", "Daughter"],
      ["Tom", "Grandson (via Ann)"],
    ]);
    expect(rows[2].marriage).toBe("1852-03-04");
  });

  test("spans and who was alive", () => {
    expect(rowSpan(rows[1])).toEqual({ start: 1832, end: 1898, endKnown: true });
    expect(rowSpan(rows[3], 2026)).toEqual({ start: 1835, end: 1905, endKnown: false });
    expect(aliveIn(rows, 1860, 2026).map(({ row, age }) => `${row.name} ${age}`)).toEqual(["John 60", "Ellen 28", "Charles 31", "Mary 25", "Ann 7"]);
  });

  test("as Lifespans rows: grouped, the person as root", () => {
    const { rows: lives, undated } = familyLifespanRows(rows, 2026);
    expect(undated).toBe(0);
    expect(lives.map((row) => `${row.name} ${row.group || "-"} ${row.root ? "root" : ""}`.trim())).toEqual([
      "John Parents",
      "Ellen - root",
      "Charles Spouses",
      "Mary Siblings",
      "Ann Children",
      "Tom Grandchildren",
    ]);
    expect(lives[1]).toMatchObject({ start: 1832, end: 1898, endKnown: true, age: 66, generation: 0 });
    expect(lives[3]).toMatchObject({ start: 1835, end: 1905, endKnown: false, age: null });
  });

  test("summary", () => {
    expect(buildFamilyTimelineSummary(rows, "Ellen's")).toBe(
      "Ellen's family timeline shows 6 people from 1800 to 1945. Ellen shared the most years with Charles (husband): 46."
    );
  });
});
