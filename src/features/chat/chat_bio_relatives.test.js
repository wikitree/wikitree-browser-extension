import {
  buildFindRelativesAnswer,
  buildRelativesAiPrompt,
  parseFindRelativesPrompt,
  readRelativesFromBio,
  relativesFromAiJson,
  scoreCandidate,
  searchRelatives,
  splitName,
  yearRangeFor,
  searchCounty,
  expectedParentsFor,
  expectedPartnerFor,
} from "./chat_bio_relatives";

// Trimmed from Densham-156 (2026-10-07), the profile in the member's question.
const BIO = `== Biography ==
Albert, son of John Densham & Mary (Singleton) Densham, was baptised on 25 April 1841 in Babington, Somerset, England.<ref>
{{Ancestry Sharing|68282778|7b22}} Albert Smith Densham baptism</ref>

In the 1841 census, Albert (age 2 months) was with his parents and siblings in Babington, Somerset, England.<ref>"1841 England Census"</ref>
{| border="1" cellpadding="4" width="100%"
|- bgcolor=#E1F0B4
| Name || Sex || Age || Occupation || Birth Place
|-
| John Densham || M || 40 || Gardener || Not in Somerset
|-
| Mary Densham || F || 40 ||  || Somerset, England
|-
| Elizah Densham || M || 8 ||  || Somerset, England
|-
| '''Albert Densham''' || '''M''' || '''2 Mo''' ||  || '''Somerset, England'''
|}

In the 1851 census, Albert (age 10) was with his parents in East Cranmore, Somerset, England.
{| border="1" cellpadding="4" width="100%"
|- bgcolor=#E1F0B4
| Name || Relation || Status || Sex || Age || Occupation || Birth Place
|-
| John Densham || Head || Married || M || 51 || Gardener || Exminster, Devon, England
|-
| Mary Densham || Wife || Married || F || 50 ||  || Winsham, Somerset, England
|-
| Elijah Densham || Son || Unmarried || M || 18 ||  || Babington, Somerset, England
|-
| '''Albert Smith Densham''' || '''Son''' ||  || '''M''' || '''10''' ||  || '''Babington, Somerset, England'''
|}

In the 1861 census, Albert (age 23) was a servant in Henbury.
{| border="1"
|-
| Name || Relation || Status || Sex || Age || Occupation || Birth Place
|-
| John Leander Harford || Head ||  || M || 75 ||  || Bristol
|-
| '''Albert Smith Densham''' || '''Servant''' || '''Unmarried''' || '''M''' || '''23''' || '''Footman''' || '''Babington'''
|}

Albert, son of John Smith Densham, married Agnes Lois Palmer on 17 July 1869 at Saint Marylebone.

In the 1881 census, Albert (age 40) was with his wife and children in Easton in Gordano, Somerset, England.
{| border="1"
|-
| Name || Relation || Status || Sex || Age || Occupation || Birth Place
|-
| '''Albert S. Densham''' || '''Head''' || '''Married''' || '''M''' || '''40''' || '''Postmaster''' || '''Newbury, Somerset, England'''
|-
| Agnes L. Densham || Wife || Married || F || 39 || Telegraphist || Bungay, Suffolk, England
|-
| Mildred A. Densham || Daughter ||  || F || 10 || Scholar || Pill, Somerset, England
|-
| Edith M. Densham || Daughter ||  || F || 8 || Scholar || Pill, Somerset, England
|}

In the 1891 census, Albert (age 50) was an innkeeper.
{| border="1"
|-
| Name || Relation || Status || Sex || Age || Occupation || Birth Place
|-
| '''Albert Smith Densham''' || '''Head''' || '''Married''' || '''M''' || '''50''' || '''Inn Keeper''' || '''Newbury, Somerset, England'''
|-
| Agnes Lois Densham || Wife || Married || F || 49 || Assistant in Bar || Bungay, Suffolk, England
|-
| Wildred Agnes Densham || Daughter ||  || F || 20 || School Teacher || Pill, Somerset, England
|-
| Edith May Densham || Daughter ||  || F || 18 || Bar Maid || Pill, Somerset, England
|}
== Sources ==
<references />`;

const ALBERT = { Id: 1, Name: "Densham-156", FirstName: "Albert", LastNameAtBirth: "Densham", Gender: "Male", BirthDate: "1841-04-25" };

const byRole = (relatives, role) => relatives.filter((r) => r.role === role);
const names = (list) => list.map((r) => r.given.join(" "));

describe("parseFindRelativesPrompt", () => {
  test.each([
    ["find his family on WikiTree", { target: "", roles: [] }],
    ["Are any of her relatives already on WikiTree?", { target: "", roles: [] }],
    ["which of his relatives are on WikiTree?", { target: "", roles: [] }],
    ["search WikiTree for her relatives", { target: "", roles: [] }],
    ["are her parents on WikiTree?", { target: "", roles: ["father", "mother"] }],
    ["find his children on WikiTree", { target: "", roles: ["child"] }],
    ["find Densham-156's family on WikiTree", { target: "Densham-156", roles: [] }],
    ["find the people named in his biography", { target: "", roles: [] }],
    // No owner named: the page profile (Cassidy-5079), never the user.
    ["Are any relatives on WikiTree?", { target: "", roles: [] }],
    ["Are there any relatives on WikiTree?", { target: "", roles: [] }],
    ["any family members already on WikiTree?", { target: "", roles: [] }],
    ["are the parents on WikiTree?", { target: "", roles: ["father", "mother"] }],
    ["find relatives on WikiTree", { target: "", roles: [] }],
    ["search WikiTree for any siblings", { target: "", roles: ["sibling"] }],
    // The people in the bio, asked about as a group (the user, 2026-10-07).
    ["Do any of the people in the bio have WT profiles?", { target: "", roles: [] }],
    ["Are any of the people mentioned in the biography on WikiTree?", { target: "", roles: [] }],
    ["Does anyone in the bio have a profile?", { target: "", roles: [] }],
    ["Is anyone named in his biography already on WikiTree?", { target: "", roles: [] }],
    ["Which people in the bio are on WikiTree?", { target: "", roles: [] }],
    ["Who in the biography is on WT?", { target: "", roles: [] }],
    ["Check the people mentioned in the bio", { target: "", roles: [] }],
    ["Have any of the family members in the bio got profiles?", { target: "", roles: [] }],
    ["Search WikiTree for the people in Philip's bio", { target: "Philip", roles: [] }],
    ["Do any people in Beacall-491's biography exist on WikiTree?", { target: "Beacall-491", roles: [] }],
    // The short form in the Help.
    ["check for profiles", { target: "", roles: [] }],
    ["Check the bio for WikiTree profiles", { target: "", roles: [] }],
    ["search for profiles in his biography", { target: "", roles: [] }],
    ["check Beacall-491's bio for profiles", { target: "Beacall-491", roles: [] }],
    // Any word order: a bio word, a people word and a profile/WikiTree word.
    ["Are the bio people on WikiTree?", { target: "", roles: [] }],
    ["Do the names in the bio match any profiles?", { target: "", roles: [] }],
    ["How many of the people in the bio have profiles?", { target: "", roles: [] }],
    ["Profiles for the people in the bio?", { target: "", roles: [] }],
    ["Could you please check if the bio people have profiles", { target: "", roles: [] }],
    ["Tell me which of the bio's relatives have WikiTree profiles", { target: "", roles: [] }],
    ["Are the children in the bio on WikiTree?", { target: "", roles: ["child"] }],
    ["Do the parents named in Beacall-491's bio have profiles?", { target: "Beacall-491", roles: ["father", "mother"] }],
    ["Do the people in Philip Beacall's bio have profiles?", { target: "Philip Beacall", roles: [] }],
    ["Are Philip's bio people on WikiTree?", { target: "Philip", roles: [] }],
  ])("%s", (prompt, expected) => {
    expect(parseFindRelativesPrompt(prompt)).toEqual(expected);
  });

  test.each(["her children", "find his parents", "how many relatives does he have", "find my family on wikitree in kent", "are my relatives on WikiTree?", "are any of my relatives on WikiTree?", "find relatives", "What's in the bio?", "Who is in the bio?", "Show me the bio", "Is the WT+ page up?", "check for duplicates", "check for profiles of Smith in Kent",
    "Create profiles for the people in the bio", "Link the people in the bio to their profiles", "Which people in the bio were born in Kent?",
    "Do the people in my bio have profiles?", "Who wrote the bio on this profile?", "Is the bio on WikiTree?", "Does anyone in the bio have a duplicate profile?",
    "Are the sources in the bio on WikiTree?", "What does the profile text say about his family?", "Is anyone in the census in the bio on WikiTree?"])(
    "not: %s",
    (prompt) => expect(parseFindRelativesPrompt(prompt)).toBeNull()
  );
});

describe("reading the biography without AI", () => {
  const relatives = readRelativesFromBio(BIO, ALBERT);

  test("parents from 'son of A & B' and the census, with the mother's maiden name", () => {
    const [father] = byRole(relatives, "father");
    const [mother] = byRole(relatives, "mother");
    expect(father.given).toEqual(["John", "Smith"]); // fullest name, from the marriage record
    expect(father.birthYear).toBe(1801); // 1841 age 40, 1851 age 51 → about 1800.5
    expect(father.birthPlace).toBe("Exminster, Devon, England"); // not "Not in Somerset"
    expect(mother.birthSurname).toBe("Singleton");
    expect(mother.surnames).toEqual(["Singleton", "Densham"]);
  });

  test("the wife from 'married X' and the census, searched by both surnames", () => {
    const spouses = byRole(relatives, "spouse");
    expect(names(spouses)).toEqual(["Agnes Lois"]);
    expect(spouses[0].surnames).toEqual(["Palmer", "Densham"]);
    expect(spouses[0].birthPlace).toBe("Bungay, Suffolk, England");
  });

  test("children merge across censuses; a one-letter misreading keeps both spellings", () => {
    const children = byRole(relatives, "child");
    expect(names(children).sort()).toEqual(["Edith May", "Wildred Agnes"]);
    expect(children.find((c) => c.given[0] === "Wildred").firstNames).toEqual(["Wildred", "Mildred"]);
    expect(children.every((c) => c.gender === "Female" && c.surnames[0] === "Densham")).toBe(true);
  });

  test("siblings from the 1841 table (no relationship column) and the 1851 table", () => {
    const siblings = byRole(relatives, "sibling");
    expect(siblings).toHaveLength(1); // Elizah (1841) and Elijah (1851) are one man
    expect(siblings[0].firstNames).toEqual(["Elizah", "Elijah"]);
    expect(siblings[0].birthYear).toBe(1833);
  });

  test("servants and employers are not relatives", () => {
    expect(relatives.some((r) => r.given.includes("Leander"))).toBe(false);
  });
});

describe("reading the biography with AI", () => {
  test("the prompt drops share tokens and names the subject", () => {
    const prompt = buildRelativesAiPrompt(BIO, ALBERT);
    expect(prompt).toContain("Densham-156");
    expect(prompt).not.toContain("7b22");
  });

  test("the AI's JSON is checked: unknown roles and nameless entries are dropped", () => {
    const relatives = relativesFromAiJson(
      {
        relatives: [
          { role: "spouse", name: "Agnes Lois Palmer", birthSurname: "Palmer", birthYear: 1842, birthPlace: "Bungay, Suffolk, England", gender: "Female" },
          { role: "child", name: "Mildred Agnes Densham", birthYear: "1871" },
          { role: "servant", name: "William George Pomery" },
          { role: "child", name: "" },
          { role: "sibling", name: "Theophilus Densham", birthYear: 99999 },
        ],
      },
      ALBERT
    );
    expect(relatives.map((r) => [r.role, r.given.join(" "), r.birthYear])).toEqual([
      ["spouse", "Agnes Lois", 1842],
      ["child", "Mildred Agnes", 1871],
      ["sibling", "Theophilus", 0],
    ]);
    expect(relativesFromAiJson(null, ALBERT)).toEqual([]);
  });
});

test("splitName reads maiden names in brackets or after née", () => {
  expect(splitName("Mary (Singleton) Densham")).toEqual({ given: ["Mary"], surname: "Densham", birthSurname: "Singleton" });
  expect(splitName("Agnes Densham née Palmer")).toEqual({ given: ["Agnes"], surname: "Densham", birthSurname: "Palmer" });
});

describe("scoreCandidate", () => {
  const arthur = { role: "child", given: ["Arthur", "John"], surnames: ["Densham"], birthYear: 1876, birthPlace: "Pill, Somerset, England", gender: "Male" };
  const profile = (extra) => ({ Id: 5, Name: "Densham-110", FirstName: "Arthur", MiddleName: "John", LastNameAtBirth: "Densham", Gender: "Male", ...extra });

  test("name, year and place agree: likely", () => {
    const result = scoreCandidate(arthur, profile({ BirthDate: "1876-03-01", BirthLocation: "Pill, Somerset, England" }));
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  test("another country rules a candidate out; another county counts against it", () => {
    expect(scoreCandidate(arthur, profile({ BirthDate: "1876", BirthLocation: "Ohio, United States" })).score).toBe(0);
    const lewisham = scoreCandidate(arthur, profile({ BirthDate: "1873-02-25", BirthLocation: "Lewisham, Kent, England" }));
    expect(lewisham.score).toBeLessThan(55); // below "possible"
    expect(lewisham.conflicts).toContain("Born in Lewisham, Kent, England (biography: Pill, Somerset, England)");
  });

  test("a different surname is not a match; a spelling variant scores low", () => {
    expect(scoreCandidate(arthur, profile({ LastNameAtBirth: "Simpson" })).score).toBe(0);
    expect(scoreCandidate(arthur, profile({ LastNameAtBirth: "Denham", BirthDate: "1876" })).score).toBeLessThan(
      scoreCandidate(arthur, profile({ BirthDate: "1876" })).score
    );
  });

  test("the candidate's parents on WikiTree count for or against", () => {
    const parentsById = new Map([
      [10, { Id: 10, Name: "Densham-9", FirstName: "Albert", LastNameAtBirth: "Densham" }],
      [11, { Id: 11, Name: "Higbee-64", FirstName: "Mary", LastNameAtBirth: "Higbee" }],
    ]);
    const expectedParents = [
      { role: "father", given: ["Albert"], surnames: ["Densham"] },
      { role: "mother", given: ["Agnes"], surnames: ["Palmer", "Densham"] },
    ];
    const base = scoreCandidate(arthur, profile({ BirthDate: "1876" })).score;
    const withFather = scoreCandidate(arthur, profile({ BirthDate: "1876", Father: 10 }), { expectedParents, parentsById });
    expect(withFather.score).toBe(base + 15);
    expect(withFather.reasons).toContain("Father is Albert Densham (Densham-9), as in the biography");
    const wrongMother = scoreCandidate(arthur, profile({ BirthDate: "1876", Mother: 11 }), { expectedParents, parentsById });
    expect(wrongMother.score).toBeLessThan(base);
  });

  test("a wife found by her married name but born with another surname counts against", () => {
    const agnes = { role: "spouse", given: ["Agnes"], surnames: ["Palmer", "Densham"], birthSurname: "Palmer", birthYear: 1842 };
    const silburn = scoreCandidate(agnes, { FirstName: "Agnes", LastNameAtBirth: "Silburn", LastNameCurrent: "Densham", BirthDate: "1842" });
    const palmer = scoreCandidate(agnes, { FirstName: "Agnes", LastNameAtBirth: "Palmer", LastNameCurrent: "Densham", BirthDate: "1842" });
    expect(silburn.score).toBeLessThan(palmer.score);
  });
});

describe("searchRelatives and the answer", () => {
  const relatives = [
    { role: "child", given: ["Edith", "May"], firstNames: ["Edith"], surnames: ["Densham"], birthYear: 1873, birthPlace: "Pill, Somerset, England", gender: "Female" },
    { role: "child", given: ["Ella"], firstNames: ["Ella"], surnames: ["Densham"], birthYear: 1881, birthPlace: "Pill, Somerset, England", gender: "Female" },
    { role: "sibling", given: ["Theophilus"], firstNames: ["Theophilus"], surnames: ["Densham"], birthYear: 1843, birthPlace: "", gender: "Male" },
  ];

  test("searches each relative not already attached, and scores what comes back", async () => {
    const searchPerson = jest.fn(async (params) =>
      params.FirstName === "Edith"
        ? [
            { Id: 20, Name: "Densham-200", FirstName: "Edith", MiddleName: "May", LastNameAtBirth: "Densham", Gender: "Female", BirthDate: "1873-05-01", BirthLocation: "Pill, Somerset, England" },
            { Id: 1, Name: "Densham-156", FirstName: "Edith" }, // the subject never matches
          ]
        : []
    );
    const getPeople = jest.fn(async () => []);
    const attached = [{ role: "sibling", profile: { Id: 30, Name: "Densham-300", FirstName: "Theophilus", BirthDate: "1843" } }];
    const results = await searchRelatives({ subject: ALBERT, relatives, attached, searchPerson, getPeople });
    // One family search (Densham, Somerset, 1870–1884), then one by name for each; Theophilus is already attached.
    expect(searchPerson.mock.calls.map(([params]) => params)).toEqual([
      { LastName: "Densham", BirthLocation: "Somerset", BirthDate: "1877", dateSpread: 7, limit: 200 },
      { FirstName: "Edith", LastName: "Densham", limit: 50, BirthDate: "1873", dateSpread: 5 },
      { FirstName: "Ella", LastName: "Densham", limit: 50, BirthDate: "1881", dateSpread: 5 },
    ]);
    expect(results[0].candidates.map((c) => c.profile.Name)).toEqual(["Densham-200"]);

    const { message, table, autoOpen } = buildFindRelativesAnswer({ subjectLabel: "Albert (Densham-156)", results, readBy: "read by AI" });
    expect(message).toContain("names 3 relatives (read by AI)");
    // One match: the details in the chat, no popup table.
    expect(message).toContain(
      "**May already be on WikiTree (1):**\n\n**Daughter Edith May Densham**\nBiography: born about 1873, Pill, Somerset, England\n\n" +
        "**Likely match (95%):** Densham-200 Edith May Densham, 1873–\n- ✓ Same middle name (May)\n- ✓ Born 1873\n- ✓ Born in Pill, Somerset, England"
    );
    expect(message).toContain("**Already connected (1):** Brother Theophilus, b. about 1843 (Densham-300)");
    expect(message).toContain("**No good match, so probably not on WikiTree yet (1):** Daughter Ella, b. about 1881");
    expect(message).toContain("check the profiles before adding a relationship");
    expect(table).toBeUndefined();
    expect(autoOpen).toBeUndefined();
  });
});

test("a name stops at a full stop unless it follows an initial (Densham-1, Densham-110)", () => {
  const bio = "Mary was the daughter of Benjamin Densham and Rose Alice Emmerson. Mary's sister was Daisy. Arthur, son of Edward Densham and Eliza Doudney. He married Eleanor A. Turner in 1900.";
  const relatives = readRelativesFromBio(bio, ALBERT);
  expect(relatives.map((r) => [r.role, [...r.given, r.surname].join(" ")])).toEqual([
    ["father", "Benjamin Densham"],
    ["mother", "Rose Alice Emmerson"],
    ["father", "Edward Densham"],
    ["mother", "Eliza Doudney"],
    ["spouse", "Eleanor A Turner"],
  ]);
  expect(relatives.find((r) => r.role === "spouse").gender).toBe("Female"); // Albert is male
});

test("a relative with no birth year is searched within a window from the subject's birth", async () => {
  expect(yearRangeFor("child", 1841)).toEqual([1856, 1891]);
  expect(yearRangeFor("spouse", 0)).toBeNull();
  const searchPerson = jest.fn(async () => [{ Id: 9, Name: "Turner-9", FirstName: "Eleanor", LastNameAtBirth: "Turner", BirthDate: "1700" }]);
  const [result] = await searchRelatives({
    subject: ALBERT,
    relatives: [{ role: "spouse", given: ["Eleanor"], surnames: ["Turner"], birthYear: 0, birthPlace: "", gender: "Female" }],
    searchPerson,
    getPeople: async () => [],
  });
  expect(searchPerson.mock.calls[0][0]).toMatchObject({ BirthDate: "1844", dateSpread: 18 });
  expect(result.candidates).toEqual([]); // born 1700: outside the window
});

test("a mother already married on WikiTree to someone else is not her (Singleton-3809)", () => {
  const mary = { role: "mother", given: ["Mary"], surnames: ["Singleton", "Densham"], birthSurname: "Singleton", birthYear: 1801, birthPlace: "Winsham, Somerset, England", gender: "Female" };
  const candidate = { Id: 7, Name: "Singleton-3809", FirstName: "Mary", MiddleName: "Polly", LastNameAtBirth: "Singleton", BirthDate: "1798" };
  const expectedPartner = { role: "father", given: ["John"], surnames: ["Densham"] };
  const before = scoreCandidate(mary, candidate, { expectedPartner }).score;
  const mcnutt = new Map([[7, [{ Id: 8, Name: "McNutt-1076", FirstName: "Alexander", LastNameAtBirth: "McNutt" }]]]);
  const after = scoreCandidate(mary, candidate, { expectedPartner, spousesById: mcnutt });
  expect(before).toBe(45); // 55 until a missing birthplace counted against her
  expect(after.score).toBe(before - 25);
  expect(after.conflicts).toContain("Married to Alexander McNutt (McNutt-1076)");
  const densham = new Map([[7, [{ Id: 9, Name: "Densham-9", FirstName: "John", LastNameAtBirth: "Densham" }]]]);
  expect(scoreCandidate(mary, candidate, { expectedPartner, spousesById: densham }).score).toBe(before + 25);
});

test("searchCounty takes the county from a bio's birthplace", () => {
  expect(searchCounty("Bradford, Wiltshire")).toBe("Wiltshire");
  expect(searchCounty("Pill, Somerset, England")).toBe("Somerset");
  expect(searchCounty("Penselwood Somerset England")).toBe("Somerset");
  expect(searchCounty("Not in Somerset")).toBe("");
  expect(searchCounty("England")).toBe("");
});

test("few API calls: the county narrows only a crowded search; other spellings only while nothing fits", async () => {
  const mary = { role: "child", given: ["Mary"], firstNames: ["Mary", "Marie"], surnames: ["Smith"], birthYear: 1851, birthPlace: "Bradford, Wiltshire", gender: "Female" };
  const crowded = jest.fn(async (params) =>
    params.BirthLocation
      ? { matches: [{ Id: 3, Name: "Smith-3", FirstName: "Mary", LastNameAtBirth: "Smith", BirthDate: "1851", BirthLocation: "Bradford-on-Avon, Wiltshire, England" }], total: 1 }
      : { matches: [], total: 400 }
  );
  const [result] = await searchRelatives({ subject: ALBERT, relatives: [mary], searchPerson: crowded, getPeople: async () => [] });
  const byName = (fn) => fn.mock.calls.map(([params]) => params).filter((params) => params.FirstName);
  expect(byName(crowded).map((params) => params.BirthLocation || "")).toEqual(["", "Wiltshire"]); // Marie never needed
  expect(result.candidates[0].profile.Name).toBe("Smith-3");

  const quiet = jest.fn(async () => ({ matches: [], total: 0 }));
  await searchRelatives({ subject: ALBERT, relatives: [mary], searchPerson: quiet, getPeople: async () => [] });
  expect(byName(quiet).map((params) => [params.FirstName, params.BirthLocation || ""])).toEqual([
    ["Mary", ""],
    ["Marie", ""],
  ]);
});

test("census spellings, abbreviations and pet names still match, for less", () => {
  const child = (name) => ({ role: "child", given: [name], surnames: ["Wright"], birthYear: 1851 });
  const profile = (first) => ({ FirstName: first, LastNameAtBirth: "Wright", BirthDate: "1851" });
  const exact = scoreCandidate(child("Frederick"), profile("Frederick")).score;
  expect(scoreCandidate(child("Fredric"), profile("Frederick")).score).toBe(exact - 10);
  expect(scoreCandidate(child("Cealia"), profile("Celia")).reasons).toContain("Named Celia (biography: Cealia)");
  expect(scoreCandidate(child("Chas"), profile("Charles")).score).toBe(exact); // an abbreviation is the name
  expect(scoreCandidate(child("Betsy"), profile("Elizabeth")).score).toBe(exact - 10);
  expect(scoreCandidate(child("Jane"), profile("June")).score).toBe(0); // short names must be exact
  expect(scoreCandidate(child("Mary"), profile("Martha")).score).toBe(0);
  expect(scoreCandidate(child("Ann"), profile("Anne")).score).toBeGreaterThan(0);
  expect(scoreCandidate(child("Catherine"), profile("Kathleen")).score).toBe(0);
  const placed = { ...child("Mary"), birthPlace: "Bradford, Wiltshire" };
  expect(scoreCandidate(placed, profile("Mary"))).toMatchObject({ score: exact - 10, conflicts: ["No birthplace on WikiTree to compare"] });
});

test("a parents' marriage is not the subject's, and a father never merges with the mother", () => {
  const bio = [
    "He was the son of Joseph Thornhill and Rebecca (Catley) Thornhill.",
    "* (Joseph married Rebecca Catley on 26 November 1835 at Gainsborough.)",
    "William (age 26), son of Joseph Thornhill, married Eliza Dennis (age 23) on 25 September 1871.",
  ].join("\n");
  const relatives = readRelativesFromBio(bio, { FirstName: "William", LastNameAtBirth: "Thornhill", Gender: "Male" });
  const brief = relatives.map((r) => `${r.role} ${r.firstNames[0]} ${r.surnames[0]}`);
  expect(brief).toEqual(expect.arrayContaining(["father Joseph Thornhill", "mother Rebecca Catley", "spouse Eliza Dennis"]));
  expect(brief).not.toContain("spouse Rebecca Catley");

  const ricketts = readRelativesFromBio("Henry, child of Henry William Ricketts & Henrietta Ricketts, was born in 1887.", { FirstName: "Henry", LastNameAtBirth: "Ricketts", Gender: "Male" });
  expect(ricketts.map((r) => `${r.role} ${r.firstNames.join("/")}`)).toEqual(["father Henry", "mother Henrietta"]);
});

test("another UK nation counts against a candidate as much as another county", () => {
  const husband = { role: "spouse", given: ["Thomas"], surnames: ["Matthew"], birthYear: 1851, birthPlace: "Whitchurch, Hampshire, England", gender: "Male" };
  const at = (place) => scoreCandidate(husband, { FirstName: "Thomas", LastNameAtBirth: "Matthew", Gender: "Male", BirthDate: "1851", BirthLocation: place }).score;
  expect(at("Markinch, Fife, Scotland")).toBeLessThanOrEqual(at("Leeds, Yorkshire, England"));
  expect(at("Markinch, Fife, Scotland")).toBeLessThan(55);
});

test("parents and partners on WikiTree are matched despite spelling (Kathryn for Catherine, Barbara for Barbray)", () => {
  const father = { role: "father", given: ["Ignatius"], firstNames: ["Ignatius"], surnames: ["Schmitzer"], gender: "Male" };
  const candidate = { Id: 2, Name: "Schmitzer-2", FirstName: "Ignatius", LastNameAtBirth: "Schmitzer", Gender: "Male" };
  const expectedPartner = { given: ["Catherine"], firstNames: ["Catherine"], surnames: ["Schiller"] };
  const spousesById = new Map([[2, [{ Id: 5, Name: "Schiller-5", FirstName: "Kathryn", LastNameAtBirth: "Schiller" }]]]);
  expect(scoreCandidate(father, candidate, { expectedPartner, spousesById }).reasons).toContain("Married to Kathryn Schiller (Schiller-5), as in the biography");

  const brother = { role: "sibling", given: ["William"], surnames: ["Huskey"], birthYear: 1854, gender: "Male" };
  const william = { Id: 42, Name: "Huskey-42", FirstName: "William", LastNameAtBirth: "Huskey", Gender: "Male", BirthDate: "1854", Mother: 1 };
  const parentsById = new Map([[1, { Id: 1, Name: "Emert-1", FirstName: "Barbara", LastNameAtBirth: "Emert", LastNameCurrent: "Huskey" }]]);
  const expectedParents = [
    { role: "mother", given: ["Barbray"], surnames: ["Huskey"] },
    { role: "mother", given: ["Barbara"], surnames: ["Huskey"] },
  ];
  expect(scoreCandidate(brother, william, { expectedParents, parentsById }).reasons).toContain("Mother is Barbara Emert (Emert-1), as in the biography");
  expect(scoreCandidate(brother, william, { expectedParents: [{ role: "mother", given: ["Martha"], surnames: ["Huskey"] }], parentsById }).conflicts).toContain("Mother is Barbara Emert (Emert-1) (biography: Martha Huskey)");
});

test("a child's marriage and a second household in the census are not the subject's family (Schmitzer-4)", () => {
  const bio = [
    "Frank (age 26), son of Ignatus Schmitzer & Catherine Schiller, married Katherine Zimmerman (21) on 14 April 1926.",
    "Frank's daughter Mildred Schmitzer married Wayne Rose on 31 March 1951.",
    "In the 1950 census, Frank (age 50) was the married head of household.",
    '{| border="1" cellpadding="4"',
    "|- bgcolor=#E1F0B4",
    "| Name || Sex || Age || Status || Relation",
    "|-",
    "| Joseph Amato || M || 37 || Married || Head",
    "|-",
    "| '''Frank J. Schmitzer''' || '''M''' || '''50''' || '''Married''' || '''Head'''",
    "|-",
    "| Madge T Amato || F || 35 || Married || Wife",
    "|-",
    "| Katherine M Schmitzer || F || 45 || Married || Wife",
    "|-",
    "| Virginia Kay Amato || F || 2 || Never married || Daughter",
    "|-",
    "| Mildred P Schmitzer || F || 19 || Never married || Daughter",
    "|}",
  ].join("\n");
  const names = readRelativesFromBio(bio, { FirstName: "Frank", LastNameAtBirth: "Schmitzer", Gender: "Male" }).map((r) => r.firstNames[0]);
  expect(names).toEqual(expect.arrayContaining(["Ignatus", "Catherine", "Katherine", "Mildred"]));
  expect(names.filter((name) => ["Wayne", "Joseph", "Madge", "Virginia"].includes(name))).toEqual([]);
});

test("a father's wife on WikiTree must have the bio mother's maiden name (Black-4008)", () => {
  const father = { role: "father", given: ["Alexander"], surnames: ["Black"], gender: "Male" };
  const candidate = { Id: 59, Name: "Black-59", FirstName: "Alexander", LastNameAtBirth: "Black", Gender: "Male" };
  const expectedPartner = { role: "mother", given: ["Elizabeth"], surnames: ["Clements", "Black"] };
  const married = (wife) => scoreCandidate(father, candidate, { expectedPartner, spousesById: new Map([[59, [wife]]]) });
  expect(married({ Id: 1, Name: "Mitchell-57312", FirstName: "Elizabeth", LastNameAtBirth: "Mitchell", LastNameCurrent: "Black" }).conflicts).toContain("Married to Elizabeth Mitchell (Mitchell-57312)");
  expect(married({ Id: 2, Name: "Clements-1472", FirstName: "Elizabeth", LastNameAtBirth: "Clements", LastNameCurrent: "Black" }).reasons).toContain("Married to Elizabeth Clements (Clements-1472), as in the biography");
});

test("a child whose WikiTree father is another profile of the same name is someone else's (Cassidy-3844)", () => {
  const subject = { Id: 5079, Name: "Cassidy-5079", FirstName: "John", LastNameAtBirth: "Cassidy", Gender: "Male", BirthDate: "1896" };
  const daughter = { role: "child", given: ["Mary"], surnames: ["Cassidy"], birthYear: 1924, gender: "Female" };
  const expectedParents = expectedParentsFor(daughter, subject, [daughter]);
  const mary = (fatherId) => ({ Id: 1, Name: "Cassidy-3844", FirstName: "Mary", LastNameAtBirth: "Cassidy", Gender: "Female", BirthDate: "1924", Father: fatherId });
  const parentsById = new Map([
    [3843, { Id: 3843, Name: "Cassidy-3843", FirstName: "John", LastNameAtBirth: "Cassidy" }],
    [5079, { Id: 5079, Name: "Cassidy-5079", FirstName: "John", LastNameAtBirth: "Cassidy" }],
  ]);
  const other = scoreCandidate(daughter, mary(3843), { expectedParents, parentsById });
  const own = scoreCandidate(daughter, mary(5079), { expectedParents, parentsById });
  expect(other.conflicts).toContain("Father is John Cassidy (Cassidy-3843), not Cassidy-5079");
  expect(own.score - other.score).toBe(25);
});

test("a wife with no maiden name in the bio is unlikely to have been born with her married surname (Cassidy-804)", () => {
  const wife = { role: "spouse", given: ["Mary"], surnames: ["Cassidy"], birthYear: 1897, gender: "Female" };
  const born = (lnab) => scoreCandidate(wife, { FirstName: "Mary", LastNameAtBirth: lnab, LastNameCurrent: "Cassidy", Gender: "Female", BirthDate: "1898" });
  expect(born("Cassidy").conflicts).toContain("Surname at birth Cassidy, which is her married name");
  expect(born("Hegarty").score - born("Cassidy").score).toBe(20);
  // A husband born with his own surname is normal.
  const husband = { role: "spouse", given: ["John"], surnames: ["Cassidy"], birthYear: 1896, gender: "Male" };
  expect(scoreCandidate(husband, { FirstName: "John", LastNameAtBirth: "Cassidy", Gender: "Male", BirthDate: "1896" }).conflicts).toEqual([]);
});

test("three or more matches: a one-line summary each, and the details in a table of the matches only", () => {
  const relative = (role, name, year, gender) => ({ role, given: [name], surnames: ["Cassidy"], birthYear: year, birthPlace: "Pennsylvania", gender });
  const candidate = (wtid, name, score) => ({ profile: { Name: wtid, FirstName: name, LastNameAtBirth: "Cassidy", BirthDate: "1921" }, score, reasons: ["born 1921"], conflicts: [] });
  const results = [
    { relative: relative("child", "Mary", 1924, "Female"), candidates: [candidate("Cassidy-3844", "Mary", 70), candidate("Cassidy-2478", "Mary", 55)] },
    { relative: relative("child", "John", 1917, "Male"), candidates: [candidate("Cassidy-4076", "John", 80)] },
    { relative: relative("child", "Francis", 1929, "Male"), candidates: [] },
    { relative: relative("child", "Joseph", 1922, "Male"), candidates: [], attached: { profile: { Name: "Cassidy-5078" } } },
  ];
  const { message, table, autoOpen } = buildFindRelativesAnswer({ subjectLabel: "John (Cassidy-5079)", results, readBy: "code" });
  expect(message).toContain("- Son John, b. about 1917: Cassidy-4076 (80%)\n- Daughter Mary, b. about 1924: Cassidy-3844 (70%), Cassidy-2478 (55%)");
  expect(message).toContain("The table compares each one with the biography.");
  expect(autoOpen).toBe(true);
  expect(table.rows.map((row) => row.wtid)).toEqual(["Cassidy-4076", "Cassidy-3844", "Cassidy-2478"]);
});

// Sarah Farrar (2026-10-07): "She is the daughter of [[Farrar-661|Perrin Farrar]]" gave
// no relatives: one parent alone was dropped, and the link's ID wasn't used.
test("one parent with the family surname is the father, and a link gives his profile", async () => {
  const sarah = { Id: 1, Name: "Farrar-9999", FirstName: "Sarah", LastNameAtBirth: "Farrar", Gender: "Female", BirthDate: "1855-00-00" };
  const relatives = readRelativesFromBio("== Biography ==\nShe is the daughter of [[Farrar-661|Perrin Farrar]].", sarah);
  expect(relatives).toHaveLength(1);
  expect(relatives[0]).toMatchObject({ role: "father", given: ["Perrin"], surname: "Farrar", gender: "Male", linkedId: "Farrar-661" });
  // A lone parent with another surname is still left out (it could be either parent).
  expect(readRelativesFromBio("She is the daughter of Ann Smith.", sarah)).toEqual([]);

  const perrin = { Id: 6728546, Name: "Farrar-661", FirstName: "Perrin", LastNameAtBirth: "Farrar", Gender: "Male", BirthDate: "" };
  const getProfiles = jest.fn(async (ids) => (ids.includes("Farrar-661") ? [perrin] : []));
  const [result] = await searchRelatives({ subject: sarah, relatives, searchPerson: async () => ({ matches: [], total: 0 }), getPeople: async () => [], getProfiles });
  expect(getProfiles).toHaveBeenCalledWith(["Farrar-661"]);
  expect(result.candidates[0].profile.Name).toBe("Farrar-661");
  expect(result.candidates[0].score).toBeGreaterThanOrEqual(75);
  expect(result.candidates[0].reasons[0]).toBe("The biography links to this profile");

  // Linked and already connected: "Already connected", not searched for.
  const [connected] = await searchRelatives({
    subject: sarah,
    relatives,
    attached: [{ role: "father", profile: { Id: 6728546, Name: "Farrar-661", FirstName: "Perrin", BirthDate: "" } }],
    searchPerson: async () => ({ matches: [], total: 0 }),
    getPeople: async () => [],
    getProfiles,
  });
  expect(connected.attached.profile.Name).toBe("Farrar-661");
});

// Cassidy-5148 (2026-10-07): "His wife was Bridget Christine McNulty" wasn't read, so the
// census's "Bridget Cassidy" was searched for and Bryce-1298 offered, married to another Edward.
test("'His wife was …' gives her birth surname, and a wife married to another profile is doubted", async () => {
  const edward = { Id: 5148, Name: "Cassidy-5148", FirstName: "Edward", MiddleName: "John", LastNameAtBirth: "Cassidy", Gender: "Male", BirthDate: "1884-00-00" };
  const bio = `Edward was born in 1884 in Ireland.

His wife was Bridget Christine McNulty.

{| border="1"
|-
| Name || Sex || Race || Age || Status || Relation || Occupation || Birth Place
|-
| Edward J Cassidy || M || White || 35 || Married || Head || Policeman || Ireland
|-
| Bridget Cassidy || F || White || 27 || Married || Wife || || Ireland
|}`;
  const wife = readRelativesFromBio(bio, edward).find((person) => person.role === "spouse");
  expect(wife).toMatchObject({ given: ["Bridget", "Christine"], birthSurname: "McNulty", gender: "Female" });
  expect(wife.surnames[0]).toBe("McNulty");
  // "Her husband was" with the subject's own surname is a married name, not a birth name.
  const ann = { ...edward, FirstName: "Ann", MiddleName: "", Gender: "Female" };
  const husband = readRelativesFromBio("Her husband was John Cassidy.", ann).find((person) => person.role === "spouse");
  expect(husband).toMatchObject({ given: ["John"], surname: "Cassidy", gender: "Male" });
  expect(husband.birthSurname || "").toBe("");

  const bridget = { Id: 1298, Name: "Bryce-1298", FirstName: "Bridget", LastNameAtBirth: "Bryce", LastNameCurrent: "Cassidy", Gender: "Female", BirthDate: "1889-00-00" };
  const relative = { role: "spouse", given: ["Bridget"], surname: "Cassidy", surnames: ["Cassidy"], gender: "Female", birthYear: 1893 };
  const expectedPartner = expectedPartnerFor(relative, edward, [relative]);
  const otherEdward = { Id: 3578, Name: "Cassidy-3578", FirstName: "Edward", MiddleName: "Francis", LastNameAtBirth: "Cassidy" };
  const scored = scoreCandidate(relative, bridget, { expectedPartner, spousesById: new Map([[1298, [otherEdward]]]) });
  expect(scored.conflicts).toContain("Married to Edward Francis Cassidy (Cassidy-3578), not Cassidy-5148");
  expect(scored.reasons.join(" ")).not.toMatch(/as in the biography/);
  const himself = scoreCandidate(relative, bridget, { expectedPartner, spousesById: new Map([[1298, [{ ...otherEdward, Id: 5148, Name: "Cassidy-5148", MiddleName: "John" }]]]) });
  expect(himself.reasons).toContain("Married to Edward John Cassidy (Cassidy-5148), as in the biography");
  expect(himself.score).toBeGreaterThan(scored.score + 30);
});

// Beacall-491 (staging, 2026-10-07): a copy of Philip Beacall (Beacall-11). The children all have
// Beacall-11 as their father; and only Beacall-20, not Beacall-149, is the linked profile.
test("relatives whose father is another profile of the same name point to a possible duplicate", async () => {
  const philip = { Id: 491, Name: "Beacall-491", FirstName: "Philip", LastNameAtBirth: "Beacall", Gender: "Male", BirthDate: "1823" };
  const relatives = readRelativesFromBio(
    "== Biography ==\nTheir children were...\n# [[Beacall-20|John Fabian (Beacall) Lacon]] (~1856 - >1939)\n# Jane Beacall (~1865 - )\n",
    philip
  );
  expect(relatives.map((r) => r.given[0])).toEqual(["John", "Jane"]);
  const other = { Id: 11, Name: "Beacall-11", FirstName: "Philip", LastNameAtBirth: "Beacall", Gender: "Male" };
  const john = { Id: 20, Name: "Beacall-20", FirstName: "John", MiddleName: "Fabian", LastNameAtBirth: "Beacall", Gender: "Male", BirthDate: "1856-00-00", Father: 11 };
  const johnRobert = { Id: 149, Name: "Beacall-149", FirstName: "John", MiddleName: "Robert", LastNameAtBirth: "Beacall", Gender: "Male", BirthDate: "1859-00-00" };
  const jane = { Id: 22, Name: "Beacall-22", FirstName: "Jane", LastNameAtBirth: "Beacall", Gender: "Female", BirthDate: "1864-00-00", Father: 11 };
  const results = await searchRelatives({
    subject: philip,
    relatives,
    searchPerson: async ({ FirstName }) => ({ matches: FirstName === "John" ? [john, johnRobert] : [jane], total: 2 }),
    getPeople: async () => [other],
    getProfiles: async () => [john],
  });
  const johnResult = results.find((r) => r.relative.given[0] === "John");
  const robert = johnResult.candidates.find((c) => c.profile.Name === "Beacall-149");
  expect(robert?.reasons || []).not.toContain("The biography links to this profile");
  const { message } = buildFindRelativesAnswer({ subjectLabel: "Philip (Beacall-491)", results, readBy: "read from its text" });
  expect(message).toContain("**2 of them are already in the family of Philip Beacall (Beacall-11).** If that's the same person, Beacall-491 may be a duplicate of Beacall-11");
});
