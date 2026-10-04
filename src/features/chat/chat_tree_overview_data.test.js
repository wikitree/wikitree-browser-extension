import { parseTreeOverviewPrompt, generationInterval, buildTreeOverview, buildTreeOverviewSummary } from "./chat_tree_overview_data";

const person = (id, birth, death, gender, extra = {}) => ({ id, name: id, wtid: `${id}-1`, birth, death, gender, lnab: extra.lnab || id, birthCountry: extra.country || "", birthLocation: extra.place || "" });

function slots() {
  const s = new Array(8).fill(null);
  s[1] = person("Ann", "1950-10-03", "", "Female", { lnab: "Cook" });
  s[2] = person("Bob", "1920-03-12", "1990-10-03", "Male", { lnab: "Cook", country: "England" });
  s[3] = person("Cat", "1925-05-01", "2000-03-20", "Female", { lnab: "Hall", country: "Ireland" });
  s[4] = person("Dan", "1890-10-03", "1950-01-01", "Male", { lnab: "Cook", country: "England", place: "Leeds, England" });
  s[5] = person("Eve", "1895-03-12", "1980-02-02", "Female", { lnab: "Wood", country: "England" });
  s[6] = person("Fred", "1880", "1960", "Male", { lnab: "Hall", country: "Ireland" });
  return s;
}

describe("parseTreeOverviewPrompt", () => {
  test.each([
    ["Tell me about my tree", "my"],
    ["tell me about her ancestors", "her"],
    ["summarise my ancestry", "my"],
    ["analyze Cook-8721's family tree", "Cook-8721"],
    ["my tree stats", "my"],
    ["family tree statistics", ""],
    ["tree overview", ""],
    ["Tree overview", ""],
    ["overview of my tree", "my"],
    ["give me a summary of his family tree", "his"],
  ])("%s", (prompt, owner) => {
    expect(parseTreeOverviewPrompt(prompt)).toEqual(expect.objectContaining({ owner }));
  });
  test.each(["tell me about her", "my tree", "show my ancestors", "tell me about my family"])("not %s", (prompt) => {
    expect(parseTreeOverviewPrompt(prompt)).toBeNull();
  });
});

describe("tree overview data", () => {
  test("generation interval: parents' ages at the line child's birth", () => {
    const interval = generationInterval(slots());
    // Bob 30, Cat 25 (Ann); Dan 30, Eve 25 (Bob); Fred 45 (Cat)
    expect(interval).toEqual(expect.objectContaining({ father: 35, mother: 25, overall: 31, count: 5 }));
    expect(interval.youngest).toEqual(expect.objectContaining({ name: "Cat", age: 25 }));
    expect(interval.oldest).toEqual(expect.objectContaining({ name: "Fred", age: 45, relation: "Grandfather" }));
  });

  test("overview and summary", () => {
    const overview = buildTreeOverview(slots());
    expect(overview.stats.found).toBe(5);
    expect(overview.earliest).toEqual(expect.objectContaining({ name: "Fred", year: 1880 }));
    expect(overview.months.find((m) => m.name === "March").count).toBe(2);
    const text = buildTreeOverviewSummary(overview, "Your");
    expect(text).toContain("Your tree: 5 ancestors over 2 generations (83% of the 6 possible), back 2 generations.");
    expect(text).toContain("The earliest-born: Fred, grandfather, born 1880.");
    expect(text).toContain("Origins: England 60%, Ireland 40%.");
    expect(text).toContain("Most common surnames: Cook (2), Hall (2), Wood (1).");
    expect(text).toContain("A generation lasted 31 years on average (fathers 35, mothers 25).");
  });

  test("an empty tree", () => {
    const s = new Array(4).fill(null);
    s[1] = person("Ann", "1950", "", "Female");
    expect(buildTreeOverviewSummary(buildTreeOverview(s), "Your")).toMatch(/no parents recorded/);
  });
});
