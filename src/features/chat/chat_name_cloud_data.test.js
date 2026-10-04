import { parseNameCloudPrompt, buildNameCloud, buildNameCloudSummary, firstNameOf } from "./chat_name_cloud_data";

const p = (id, name, lnab, gender, birth) => ({ id, wtid: `${lnab}-${id}`, name, lnab, gender, birth });

function slots() {
  const s = new Array(16).fill(null);
  s[1] = p(1, "Root", "Smith", "Male", "1950-01-01");
  s[2] = p(2, "William", "Smith", "Male", "1920-01-01");
  s[3] = p(3, "Mary", "Jones", "Female", "1922-01-01");
  s[4] = p(4, "William", "Smith", "Male", "1890-01-01");
  s[5] = p(5, "Mary Ann", "Brown", "Female", "1892-01-01");
  s[6] = p(6, "John", "Jones", "Male", "1895-01-01");
  s[8] = p(8, "William", "Smith", "Male", "1860-01-01");
  s[12] = p(4, "William", "Smith", "Male", "1890-01-01"); // pedigree collapse: counted once
  s[13] = p(13, "Sir John", "Hill", "Male", "");
  return s;
}

describe("parseNameCloudPrompt", () => {
  test.each([
    ["name cloud", ""],
    ["show my ancestors' name cloud", "my"],
    ["Cook-8721's name cloud", "Cook-8721"],
    ["What are the most common names in my family tree?", "my"],
    ["most popular first names among her ancestors", "her"],
    ["what names run in my family", "my"],
    ["name cloud of his ancestors", "his"],
  ])("%s", (prompt, owner) => expect(parseNameCloudPrompt(prompt)).toEqual(expect.objectContaining({ owner })));
  test.each(["what is my name", "most common surnames in Ohio", "names"])("not %s", (prompt) => expect(parseNameCloudPrompt(prompt)).toBeNull());
});

describe("name cloud data", () => {
  test("firstNameOf skips titles and nicknames", () => {
    expect(firstNameOf({ name: "Sir John" })).toBe("John");
    expect(firstNameOf({ name: '"Jack" J. Kennedy' })).toBe("Kennedy");
    expect(firstNameOf({ name: "Mary Ann" })).toBe("Mary");
  });

  test("counts each ancestor once, with people, mean year and gender", () => {
    const first = buildNameCloud(slots(), "first");
    expect(first.map((word) => [word.text, word.count])).toEqual([["William", 3], ["John", 2], ["Mary", 2]]);
    expect(first[0]).toEqual(expect.objectContaining({ meanYear: 1890, gender: "Male" }));
    expect(first[0].people.map((person) => person.generation)).toEqual([1, 2, 3]);
    const surnames = buildNameCloud(slots(), "surname");
    expect(surnames[0]).toEqual(expect.objectContaining({ text: "Smith", count: 3 }));
  });

  test("summary", () => {
    const text = buildNameCloudSummary(slots(), "Your");
    expect(text).toMatch(/commonest first names among your ancestors: men William \(3\), John \(2\); women Mary \(2\)\./);
    expect(text).toMatch(/"William" ran through 3 generations\./);
    expect(text).toMatch(/4 surnames in all/);
  });
});

describe("surname river prompts", () => {
  test.each([
    ["surname river", ""],
    ["show my surname river", "my"],
    ["Cook-8721's surnames streamgraph", "Cook-8721"],
    ["my ancestors' surname river", "my"],
    ["surnames by generation", ""],
    ["her ancestors' surnames by generation", "her"],
    ["How did the surnames change over the generations?", ""],
    ["how have my family's surnames changed through the generations", "my"],
  ])("%s", (prompt, owner) => {
    expect(parseNameCloudPrompt(prompt)).toMatchObject({ owner, river: true });
  });
  test("the name cloud prompts stay clouds", () => {
    expect(parseNameCloudPrompt("name cloud").river).toBeUndefined();
    expect(parseNameCloudPrompt("my surnames")).toBeNull();
  });
});
