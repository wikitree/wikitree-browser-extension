import { nameVariants, parseDate, privateFactsFor, privateFactsFromPeople } from "./presentation_mode_facts";

// Shapes copied from real getPeople answers (logged in, and without the login), with made-up people.
const semiPrivateAuthed = {
  Id: 101,
  Name: "Example-6",
  FirstName: "Ian",
  MiddleName: "Christopher",
  MiddleInitial: "C.",
  RealName: "Ian",
  Nicknames: "",
  LastNameAtBirth: "Example",
  LastNameCurrent: "Example",
  LastNameOther: "",
  BirthDate: "1969-04-14",
  DeathDate: "0000-00-00",
  BirthLocation: "Birkenhead, Cheshire, England, United Kingdom",
  DeathLocation: "",
  Photo: "",
  Privacy: 35,
  bio: "== Biography ==\nSome text.",
};
const semiPrivateAnon = {
  Id: 101,
  Name: "Example-6",
  MiddleInitial: "C.",
  RealName: "Ian",
  LastNameAtBirth: "Example",
  LastNameCurrent: "Example",
  LastNameOther: "",
  BirthDateDecade: "1960s",
  Photo: "",
  Privacy: 35,
};
const unlistedAuthed = {
  Id: 102,
  Name: "Example-7",
  FirstName: "Frederick",
  MiddleName: "John",
  MiddleInitial: "J.",
  RealName: "Fred",
  LastNameAtBirth: "Example",
  LastNameCurrent: "Example",
  BirthDate: "1947-04-27",
  BirthLocation: "Birkenhead",
  Photo: "Example-7-1.jpg",
  Privacy: 10,
};
const openAuthed = { Id: 103, Name: "Open-1", FirstName: "Ann", LastNameAtBirth: "Open", BirthDate: "1800-01-02" };

describe("parseDate", () => {
  test("full, year-only and blank dates", () => {
    expect(parseDate("1969-04-14")).toEqual({ y: 1969, m: 4, d: 14 });
    expect(parseDate("1927-00-00")).toEqual({ y: 1927, m: 0, d: 0 });
    expect(parseDate("0000-00-00")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("nameVariants", () => {
  test("includes the usual ways of writing a name", () => {
    const variants = nameVariants({ ...unlistedAuthed, LastNameCurrent: "Smith" });
    expect(variants).toEqual(
      expect.arrayContaining([
        "Frederick Smith",
        "Frederick John Smith",
        "Frederick J. Smith",
        "Fred Smith",
        "Frederick (Example) Smith",
        "Smith, Frederick",
        "Frederick John",
      ])
    );
    // A single word is not a variant: it is far too likely to match someone else.
    expect(variants).not.toContain("Frederick");
  });
});

describe("privateFactsFor", () => {
  test("semi-private: only what the public view leaves out", () => {
    const facts = privateFactsFor(semiPrivateAuthed, semiPrivateAnon);
    expect(facts.hidden).toBe(false);
    expect(facts.tokens).toEqual(["Christopher"]);
    expect(facts.privateWords).toEqual(["christopher"]);
    expect(facts.phrases).toContain("Ian Christopher Example");
    expect(facts.phrases).not.toContain("Ian Example");
    expect(facts.phrases).not.toContain("Ian C. Example");
    expect(facts.dates).toEqual([{ y: 1969, m: 4, d: 14 }]);
    expect(facts.places).toEqual(["Birkenhead, Cheshire, England, United Kingdom"]);
    expect(facts.bioPrivate).toBe(true);
    expect(facts.publicName).toBe("Ian C. Example");
  });

  test("unlisted: the public placeholder (Id -1) means everything is private", () => {
    const facts = privateFactsFor(unlistedAuthed, { Id: -1, Privacy: 10 });
    expect(facts.hidden).toBe(true);
    expect(facts.name).toBe("Example-7");
    expect(facts.phrases).toEqual(
      expect.arrayContaining(["Frederick Example", "Fred Example", "Frederick John Example"])
    );
    expect(facts.tokens).toEqual(expect.arrayContaining(["Frederick", "John", "Fred", "Example"]));
    expect(facts.photo).toBe("Example-7-1.jpg");
    expect(facts.publicName).toBe("Private");
  });

  test("Public and Open profiles hide nothing, whatever the public view says", () => {
    expect(privateFactsFor({ ...unlistedAuthed, Privacy: 50 }, null)).toBeNull();
    expect(privateFactsFor({ ...semiPrivateAuthed, Privacy: 60 }, { Id: -1 })).toBeNull();
  });

  test("Private, with no public view sent: hides middle name, full dates, places, photo and biography", () => {
    const facts = privateFactsFor({ ...unlistedAuthed, Privacy: 20, bio: "Text" }, null);
    expect(facts.hidden).toBe(false);
    expect(facts.tokens).toEqual(["John"]);
    expect(facts.phrases).toContain("Frederick John Example");
    expect(facts.phrases).not.toContain("Fred Example");
    expect(facts.dates).toEqual([{ y: 1947, m: 4, d: 27 }]);
    expect(facts.places).toEqual(["Birkenhead"]);
    expect(facts.photo).toBe("Example-7-1.jpg");
    expect(facts.bioPrivate).toBe(true);
    expect(facts.publicName).toBe("Fred Example");
  });

  test("Private with Public Biography: the biography isn't hidden", () => {
    expect(privateFactsFor({ ...semiPrivateAuthed, Privacy: 30 }, semiPrivateAnon).bioPrivate).toBe(false);
    expect(privateFactsFor({ ...semiPrivateAuthed, Privacy: 40 }, null).bioPrivate).toBe(false);
  });

  test("nothing private gives null", () => {
    expect(privateFactsFor(openAuthed, { ...openAuthed })).toBeNull();
  });
});

describe("privateFactsFromPeople", () => {
  test("pairs people by Id and skips the public placeholders", () => {
    const facts = privateFactsFromPeople(
      { 101: semiPrivateAuthed, 102: unlistedAuthed, 103: openAuthed, 104: { ...openAuthed, Id: 104, Privacy: 50 } },
      { 101: semiPrivateAnon, "-1": { Id: -1 }, 103: { ...openAuthed } }
    );
    expect(facts.map((f) => [f.id, f.hidden])).toEqual([
      [101, false],
      [102, true],
    ]);
  });
});
