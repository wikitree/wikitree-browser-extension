import { buildChildbirthDeathRows, parseDiedInChildbirthPrompt } from "./chat_childbirth_death";
import { compileSearchSpec } from "./chat_search_spec";

// Live C19, 2026-10-03: the spec said WT+ can't tell a childbirth death.
describe("parseDiedInChildbirthPrompt", () => {
  test.each([
    ["women who died in childbirth in Cheshire", "Cheshire", null],
    ["Cheshire women who died in childbirth", "Cheshire", null],
    ["find mothers who died giving birth in Lancashire 1800-1850", "Lancashire", 1800],
    ["Cheshire 1800-1850 women who died in childbirth", "Cheshire", 1800],
    ["deaths in childbirth in Kent", "Kent", null],
    ["childbirth deaths in Devon", "Devon", null],
  ])("%s", (prompt, location, startYear) => {
    const parsed = parseDiedInChildbirthPrompt(prompt);
    expect(parsed.locationText).toBe(location);
    expect(parsed.startYear).toBe(startYear);
  });

  test.each(["women who died in childbirth", "women born in Cheshire", "died in Cheshire"])("not this: %s", (prompt) => {
    expect(parseDiedInChildbirthPrompt(prompt)).toBeNull();
  });

  test("the spec special compiles to a prompt the parser reads", () => {
    const { routePrompt, errors } = compileSearchSpec({
      places: [{ text: "Cheshire" }],
      special: { type: "diedInChildbirth" },
    });
    expect(errors).toEqual([]);
    expect(parseDiedInChildbirthPrompt(routePrompt).locationText).toBe("Cheshire");
  });
});

describe("buildChildbirthDeathRows", () => {
  const mapRow = (person) => ({ wtid: person.Name, death: person.DeathDate });
  const mothers = {
    1: { Id: 1, Name: "Mum-1", DeathDate: "1850-03-10" },
    2: { Id: 2, Name: "Mum-2", DeathDate: "1850-05-20" },
  };

  test("one row per mother within six weeks; later deaths dropped", () => {
    const rows = buildChildbirthDeathRows(
      [
        { Name: "Kid-1", RealName: "Ann", LastNameAtBirth: "Kid", BirthDate: "1850-03-08", Mother: 1 },
        { Name: "Kid-2", RealName: "Bob", LastNameAtBirth: "Kid", BirthDate: "1850-03-08", Mother: 1 },
        { Name: "Kid-3", RealName: "Cy", LastNameAtBirth: "Kid", BirthDate: "1850-03-01", Mother: 2 },
      ],
      mothers,
      mapRow
    );
    expect(rows).toEqual([
      {
        wtid: "Mum-1",
        death: "1850-03-10",
        childbirthChild: "Ann Kid (Kid-1); Bob Kid (Kid-2)",
        childBirthDate: "1850-03-08",
        daysAfterBirth: "2",
      },
    ]);
  });
});
