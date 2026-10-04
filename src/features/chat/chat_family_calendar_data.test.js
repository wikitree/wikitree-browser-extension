import { parseFamilyCalendarPrompt, dateParts, dayOfYear, buildCalendarEvents, buildCalendarSummary, nextEvents } from "./chat_family_calendar_data";

const person = (name, birth, death, gender = "Male", extra = {}) => ({ id: name, name, wtid: `${name}-1`, birth, death, gender, ...extra });

function slots() {
  const s = new Array(8).fill(null);
  s[1] = person("Ann", "1950-10-03", "", "Female");
  s[2] = person("Bob", "1920-03-12", "1990-10-03", "Male", { deathLocation: "Leeds, England" });
  s[3] = person("Cat", "1925-00-00", "2000-03-20", "Female");
  s[4] = person("Dan", "1890-10-03", "1950-01-01");
  s[5] = person("Eve", "1895-03-12", "", "Female");
  s[6] = s[4]; // (pedigree collapse: counted once)
  return s;
}

describe("parseFamilyCalendarPrompt", () => {
  test.each([
    ["On this day in my family", { owner: "my", today: true }],
    ["On this day in this family", { owner: "", today: true }],
    ["on this day", { owner: "", today: true }],
    ["today in her family history", { owner: "her", today: true }],
    ["who in my family was born on this day?", { owner: "my", today: true, event: "birth" }],
    ["which of my ancestors died today", { owner: "my", today: true, event: "death" }],
    ["family birthdays", { owner: "", today: false }],
    ["my ancestors' birthdays", { owner: "my", today: false }],
    ["Cook-8721's family calendar", { owner: "Cook-8721", today: false }],
    ["who in my family was born in March", { owner: "my", month: 3, event: "birth" }],
    ["which of her ancestors died in May", { owner: "her", month: 5, event: "death" }],
  ])("%s", (prompt, expected) => {
    expect(parseFamilyCalendarPrompt(prompt)).toEqual(expect.objectContaining(expected));
  });
  test.each(["today", "calendar", "what happened today", "her birthday", "when is her birthday"])("not %s", (prompt) => {
    expect(parseFamilyCalendarPrompt(prompt)).toBeNull();
  });
});

describe("calendar events", () => {
  test("dateParts drops unknown months and days", () => {
    expect(dateParts("1850-03-12")).toEqual({ year: 1850, month: 3, day: 12 });
    expect(dateParts("1850-03-00")).toBeNull();
    expect(dateParts("1850-02-30")).toBeNull();
    expect(dateParts("")).toBeNull();
  });

  test("dayOfYear uses a leap year", () => {
    expect(dayOfYear(1, 1)).toBe(0);
    expect(dayOfYear(3, 1)).toBe(60);
    expect(dayOfYear(12, 31)).toBe(365);
  });

  test("events: full dates only, each person once, calendar order", () => {
    const events = buildCalendarEvents(slots());
    expect(events.map((e) => `${e.name} ${e.type} ${e.month}/${e.day}`)).toEqual([
      "Dan death 1/1",
      "Eve birth 3/12",
      "Bob birth 3/12",
      "Cat death 3/20",
      "Dan birth 10/3",
      "Ann birth 10/3",
      "Bob death 10/3",
    ]);
    expect(events.find((e) => e.name === "Bob" && e.type === "death")).toEqual(expect.objectContaining({ relation: "Father", place: "Leeds, England" }));
  });

  test("nextEvents wraps round the year", () => {
    const events = buildCalendarEvents(slots());
    expect(nextEvents(events, dayOfYear(11, 1)).map((e) => e.name)).toEqual(["Dan"]);
    expect(nextEvents(events, dayOfYear(3, 1)).map((e) => e.name)).toEqual(["Eve", "Bob"]);
  });
});

describe("calendar summary", () => {
  const events = buildCalendarEvents(slots());
  test("on this day", () => {
    const text = buildCalendarSummary(events, "Your", { today: true }, new Date(2026, 9, 3));
    expect(text).toContain("On this day, 3 October:");
    expect(text).toContain("• Dan, your grandfather, born in 1890");
    expect(text).toContain("• Bob, your father, died in 1990 (Leeds, England)");
    expect(text).toContain("Birthday twin: Dan (grandfather, 1890) shares Ann's birthday.");
  });
  test("nothing today: the next date", () => {
    const text = buildCalendarSummary(events, "Your", { today: true }, new Date(2026, 2, 1));
    expect(text).toContain("Nothing in your ancestors' dates falls on 1 March.");
    expect(text).toContain("Next up, 12 March: Eve, your grandmother, born in 1895; Bob, your father, born in 1920.");
  });
  test("a month", () => {
    const text = buildCalendarSummary(events, "Cook-8721's", { month: 3, event: "birth" });
    expect(text).toContain("2 of Cook-8721's ancestors were born in March:");
    expect(text).toContain("• 12 March: Bob, Cook-8721's father, born in 1920");
  });
  test("empty", () => {
    expect(buildCalendarSummary([], "Your")).toMatch(/calendar is empty/);
  });
});
