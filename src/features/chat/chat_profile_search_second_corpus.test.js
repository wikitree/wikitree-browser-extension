jest.mock("../../core/API/wtPlusAPI", () => ({
  wtAPICatCIBSearch: jest.fn(),
  wtAPIProfileSearch: jest.fn(),
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
  getUserWtId: jest.fn(() => "User-1"),
}));

import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { createProfileSearchHandler } from "./chat_profile_search";

function makeHandler(overrides = {}) {
  return createProfileSearchHandler({
    WBE_CHAT_APP_ID: "wbe-chat-test",
    hasAnyApiKey: jest.fn(() => true),
    getChatOptions: jest.fn(async () => ({ allowAiFallback: false })),
    getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test-key", model: "gpt-test" })),
    fetchSearchPersonPaged: jest.fn(async () => [0, []]),
    fetchPeoplePaged: jest.fn(async () => [
      null,
      null,
      {
        1: {
          Id: 1,
          Name: "Example-1",
          FirstName: "Alice",
          LastNameAtBirth: "Example",
          BirthLocation: "England",
          BirthDate: "1824-00-00",
        },
      },
    ]),
    mapApiPersonToStandardRow: jest.fn((person, options = {}) => ({
      wtid: options.wtId || person?.Name || "",
      firstName: person?.FirstName || "",
      lnab: person?.LastNameAtBirth || "",
      lastNameCurrent: person?.LastNameCurrent || "",
      birth: person?.BirthDate || "",
      death: person?.DeathDate || "",
      birthLocation: person?.BirthLocation || "",
      deathLocation: person?.DeathLocation || "",
    })),
    makeStandardProfileTable: jest.fn((title, rows, defaultOrder = [[0, "asc"]]) => ({
      title,
      rows,
      defaultOrder,
      columns: [{ key: "wtid" }, { key: "firstName" }],
    })),
    makeAncestorProfileTable: jest.fn((title, rows, defaultOrder = [[0, "asc"]]) => ({
      title,
      rows,
      defaultOrder,
      columns: [{ key: "wtid" }, { key: "firstName" }],
    })),
    normalizeText: (value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    normalizeKnownDate: jest.fn((value) => value),
    showChatShaky: jest.fn(),
    hideChatShaky: jest.fn(),
    ...overrides,
  });
}

async function runPrompt(prompt) {
  const { tryHandleProfileSearchPrompt } = makeHandler();
  const result = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, prompt);
  return result;
}

async function executedQueryFor(prompt) {
  await runPrompt(prompt);
  expect(wtAPIProfileSearch).toHaveBeenCalled();
  return decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
}

describe("chat second-set prompt corpus (deterministic WT+ parses)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({
      response: {
        profiles: ["1"],
        searchLog: "Result: 1\r\n",
      },
    });
  });

  test("born before 1750 in Devon", async () => {
    const executedQuery = await executedQueryFor("born before 1750 in Devon");
    expect(executedQuery).toMatch(/\[Default\]\.\[Birth Date\]\.AsNumber < 1750/);
    expect(executedQuery).toMatch(/(?:Birth)?Location=Devon/);
  });

  test("died after 1900 in Liverpool", async () => {
    const executedQuery = await executedQueryFor("died after 1900 in Liverpool");
    expect(executedQuery).toMatch(/\[Default\]\.\[Death Date\]\.AsNumber > 1900/);
    expect(executedQuery).toMatch(/(?:Death)?Location=Liverpool/);
  });

  test("noun form: death after 1900 Liverpool, England", async () => {
    const executedQuery = await executedQueryFor("death after 1900 Liverpool, England");
    expect(executedQuery).toMatch(/\[Default\]\.\[Death Date\]\.AsNumber > 1900/);
    expect(executedQuery).not.toContain("LastNameAtBirth=death");
    expect(executedQuery).toMatch(/Location=/);
  });

  test("noun form: birth before 1850 in Devon", async () => {
    const executedQuery = await executedQueryFor("birth before 1850 in Devon");
    expect(executedQuery).toMatch(/\[Default\]\.\[Birth Date\]\.AsNumber < 1850/);
    expect(executedQuery).not.toContain("LastNameAtBirth=birth");
  });

  test("died between 1900 and 1910 is a death range, not birth", async () => {
    const executedQuery = await executedQueryFor("died between 1900 and 1910 in Liverpool");
    expect(executedQuery).toMatch(/\[Default\]\.\[Death Date\]\.AsNumber In 19000000\.\./);
    expect(executedQuery).not.toContain("20Cen");
  });

  test("Shropshire unsourced born in 1820s", async () => {
    const executedQuery = await executedQueryFor("Shropshire unsourced born in 1820s");
    expect(executedQuery).toContain("Unsourced");
    expect(executedQuery).toContain("1820s");
    expect(executedQuery).toContain("Shropshire");
    expect(executedQuery).not.toContain("19Cen");
  });

  test("20th century more than 6 children and married in Cheshire", async () => {
    const executedQuery = await executedQueryFor("20th century more than 6 children and married in Cheshire");
    expect(executedQuery).toContain("MarriageLocation=Cheshire");
    expect(executedQuery).toContain("[Children].[User ID].LineCount > 6");
    expect(executedQuery).toMatch(/20Cen|\[Marriage\]\.\[Marriage Date\]\.AsNumber In 19000101\.\.19991231/);
  });

  test("19th century Cheshire, exactly one marriage", async () => {
    const executedQuery = await executedQueryFor("19th century Cheshire, exactly one marriage");
    expect(executedQuery).toContain("[Marriage].[Marriage Location].LineCount = 1");
    expect(executedQuery).toContain("Cheshire");
    expect(executedQuery).toMatch(/19Cen|18000101\.\.18991231/);
  });

  test("19th century Cheshire, England, exactly one marriage keeps the place whole", async () => {
    const executedQuery = await executedQueryFor("19th century Cheshire, England, exactly one marriage");
    expect(executedQuery).toContain('Location="Cheshire, England"');
    expect(executedQuery).not.toContain("LastNameAtBirth=Cheshire");
    expect(executedQuery).toContain("[Marriage].[Marriage Location].LineCount = 1");
    expect(executedQuery).toMatch(/19Cen|18000101\.\.18991231/);
  });

  test("unsourced Shropshire, England born in 1820s keeps lead keywords out of the place", async () => {
    const executedQuery = await executedQueryFor("unsourced Shropshire, England born in 1820s");
    expect(executedQuery).toContain("Unsourced");
    expect(executedQuery).toContain('Location="Shropshire, England"');
    expect(executedQuery).toContain("1820s");
  });

  test("profiles from Hampshire, England with birth year earlier than 1800", async () => {
    const executedQuery = await executedQueryFor("profiles from Hampshire, England with birth year earlier than 1800");
    expect(executedQuery).toContain('Location="Hampshire, England"');
    expect(executedQuery).toMatch(/\[Default\]\.\[Birth Date\]\.AsNumber < 1800/);
    expect(executedQuery).not.toMatch(/with|earlier|than/i);
  });

  test("a place-only prompt asks which life-event scope instead of running a vague Location= query", async () => {
    // "profiles from Hampshire, England" has no other scope, so Muse asks
    // born/married/died up front rather than running the (huge, vague) query.
    const result = await runPrompt("profiles from Hampshire, England");
    expect(wtAPIProfileSearch).not.toHaveBeenCalled();
    expect(result.message).toMatch(/birth, marriage, or death place/i);
    expect((result.actions || []).map((a) => a.wtPlusQuery)).toEqual(
      expect.arrayContaining([
        'BirthLocation="Hampshire, England"',
        'DeathLocation="Hampshire, England"',
        'Location="Hampshire, England"',
      ])
    );
  });

  test("profiles from Hampshire, England with birth year 17th century", async () => {
    const executedQuery = await executedQueryFor("profiles from Hampshire, England with birth year 17th century");
    expect(executedQuery).toContain("17Cen");
    expect(executedQuery).toContain('Location="Hampshire, England"');
    expect(executedQuery).not.toMatch(/LastNameAtBirth=birth|Location=year/);
  });

  test("profiles from Hampshire, England with death year 18th century", async () => {
    const executedQuery = await executedQueryFor("profiles from Hampshire, England with death year 18th century");
    expect(executedQuery).toContain('Location="Hampshire, England"');
    expect(executedQuery).toMatch(/\[Default\]\.\[Death Date\]\.AsNumber In 17000101\.\.17991231/);
    expect(executedQuery).not.toMatch(/LastNameAtBirth=death|Location=year/);
  });

  test("profiles from Kent with death year later than 1850", async () => {
    const executedQuery = await executedQueryFor("profiles from Kent with death year later than 1850");
    expect(executedQuery).toContain("Location=Kent");
    expect(executedQuery).toMatch(/\[Default\]\.\[Death Date\]\.AsNumber > 1850/);
  });

  test("born earlier than 1750 in Devon", async () => {
    const executedQuery = await executedQueryFor("born earlier than 1750 in Devon");
    expect(executedQuery).toMatch(/\[Default\]\.\[Birth Date\]\.AsNumber < 1750/);
    expect(executedQuery).toMatch(/(?:Birth)?Location=Devon/);
  });

  test("place + topic expands to a Location + CategoryWord OR query", async () => {
    const executedQuery = await executedQueryFor("Yorkshire mining");
    expect(executedQuery).toContain("Location=Yorkshire CategoryWord=mining");
    expect(executedQuery).toContain("Location=Yorkshire CategoryWord=colliery");
    expect(executedQuery).toMatch(/\bOR\b/);
    expect(executedQuery).not.toMatch(/LastNameAtBirth=mining/);
  });

  test("'in <project> but missing project box' resolves to Manager=<project> Suggestions=931", async () => {
    const executedQuery = await executedQueryFor("Profiles in England project but missing project box in bio");
    expect(executedQuery).toContain("Suggestions=931");
    expect(executedQuery).toMatch(/Manager=/);
    // The whole sentence must not leak into a Location value (the old malformed
    // parse that tripped the suspicious-query gate).
    expect(executedQuery).not.toMatch(/Location="[^"]*\bmissing\b/);
  });

  test("a bare natural-language suggestion runs as Suggestions=NNN without a bogus Location", async () => {
    const executedQuery = await executedQueryFor("empty biography");
    expect(executedQuery).toBe("Suggestions=802");
  });

  test("a place-scoped natural-language suggestion keeps only the real location", async () => {
    const executedQuery = await executedQueryFor("Yorkshire gedcom junk");
    expect(executedQuery).toContain("Suggestions=853");
    expect(executedQuery).toContain("Location=Yorkshire");
    expect(executedQuery).not.toMatch(/Location="[^"]*\bjunk\b/i);
  });

  test("surname + DNA magic token becomes a WT+ query, not a person search", async () => {
    const executedQuery = await executedQueryFor("Anderson mtDNA");
    expect(executedQuery).toContain("mtDNA");
    expect(executedQuery).toMatch(/(?:AllLastNames|LastNameAtBirth)=Anderson/);
    expect(executedQuery).not.toContain("Location=mtDNA");
  });

  test("military falls back to the CategoryWord OR expansion when AI is unavailable", async () => {
    // No AI (allowAiFallback: false) — the AI-first military tree path can't run,
    // so the deterministic Location + CategoryWord expansion must execute rather
    // than the broken "LastNameAtBirth=Chicago Location=military" group parse.
    const executedQuery = await executedQueryFor("Chicago military");
    expect(executedQuery).toContain("Location=Chicago CategoryWord=military");
    expect(executedQuery).toContain("Location=Chicago CategoryWord=army");
    expect(executedQuery).toContain("Location=Chicago CategoryWord=navy");
    expect(executedQuery).toMatch(/\bOR\b/);
    expect(executedQuery).not.toContain("LastNameAtBirth=Chicago");
    expect(executedQuery).not.toContain("Location=military");
  });

  test("England suggestions 678", async () => {
    const executedQuery = await executedQueryFor("England suggestions 678");
    expect(executedQuery).toContain("Suggestions=678");
    expect(executedQuery).toContain("Location=England");
  });

  test("Brown created after 2024-01-01", async () => {
    const executedQuery = await executedQueryFor("Brown created after 2024-01-01");
    expect(executedQuery).toMatch(/Brown/);
    expect(executedQuery).toMatch(/Created/i);
    expect(executedQuery).toMatch(/2024/);
  });

  test("template text contains Kentucky", async () => {
    const executedQuery = await executedQueryFor("template text contains Kentucky");
    expect(executedQuery).toMatch(/\[Templates\]\.\[Template text\]\.AsString Like '\*Kentucky\*'|TemplateText=Kentucky/);
  });

  test("managed only by England project", async () => {
    const executedQuery = await executedQueryFor("managed only by England project");
    expect(executedQuery).toMatch(/Manager=/);
    expect(executedQuery).toMatch(/All Managers/);
  });

  test("England ProjectManaged or PPP", async () => {
    const executedQuery = await executedQueryFor("England ProjectManaged or PPP");
    const branches = executedQuery.split(/\s+OR\s+/i);
    expect(branches).toHaveLength(2);
    expect(branches[0]).toContain("Location=England");
    expect(branches[1]).toContain("Location=England");
    expect(executedQuery).toContain("ProjectManaged");
    expect(executedQuery).toContain("PPP");
  });

  test("Dickin 19th century and female retries the ambiguous token as a surname on zero results", async () => {
    // First run guesses Location=Dickin and finds nothing; the deterministic
    // retry must swap the lone token to a surname scope.
    wtAPIProfileSearch
      .mockResolvedValueOnce({ response: { found: 0, profiles: [], searchLog: "Result: 0\r\n" } })
      .mockResolvedValueOnce({ response: { found: 1, profiles: ["1"], searchLog: "Result: 1\r\n" } });

    await runPrompt("Dickin 19th century and female");

    expect(wtAPIProfileSearch).toHaveBeenCalledTimes(2);
    const firstQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[0][1]);
    const retryQuery = decodeURIComponent(wtAPIProfileSearch.mock.calls[1][1]);
    expect(firstQuery).toContain("Location=Dickin");
    expect(retryQuery).toContain("AllLastNames=Dickin");
    expect(retryQuery).toMatch(/19Cen|18000101\.\.18991231/);
    expect(retryQuery).toContain("female");
  });

  test("Manchester age 42 and connected", async () => {
    const executedQuery = await executedQueryFor("Manchester age 42 and connected");
    expect(executedQuery).toContain("Location=Manchester");
    expect(executedQuery).toContain("age42");
    expect(executedQuery).toContain("connected");
  });

  test("Illinois Find a Grave cem 105308", async () => {
    const executedQuery = await executedQueryFor("Illinois Find a Grave cem 105308");
    expect(executedQuery).toContain("Location=Illinois");
    expect(executedQuery).toContain("fgcem105308");
  });

  test("a bare Location= scope offers life-event refinements, and a surname reading only when ambiguous", async () => {
    const labelsFor = async (prompt) => {
      jest.clearAllMocks();
      wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "Result: 1\r\n" } });
      const result = await runPrompt(prompt);
      return (result.actions || []).map((action) => action.label);
    };

    const kent = await labelsFor("Kent no manager");
    expect(kent).toEqual(expect.arrayContaining(["Born in Kent", "Married in Kent", "Died in Kent"]));
    // "Kent" is a county AND a surname, so the surname reading is offered.
    expect(kent).toContain("Surname Kent");

    // "-shire" and known countries can only be places — no surname button.
    const denbighshire = await labelsFor("Denbighshire no manager");
    expect(denbighshire).toEqual(expect.arrayContaining(["Born in Denbighshire", "Died in Denbighshire"]));
    expect(denbighshire).not.toContain("Surname Denbighshire");
    expect(await labelsFor("Scotland no manager")).not.toContain("Surname Scotland");
  });

  test("choosing 'Any place' still surfaces scope refinements when it is too many / zero", async () => {
    // The user accepted the vague scope via the "Any place" button, which
    // re-runs Location=Kent directly (fromScopeChoice). Those result branches
    // used to return before the refinement buttons were attached.
    const { reRunSavedWtPlusQuery } = makeHandler();

    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({
      response: { found: 99999, profiles: [] },
      searchLog: "Result: 99999 Maximum number of profiles\r\n",
    });
    const tooMany = await reRunSavedWtPlusQuery("Orphan Location=Kent", "text");
    expect((tooMany.actions || []).map((a) => a.label)).toEqual(
      expect.arrayContaining(["Born in Kent", "Died in Kent", "Surname Kent"])
    );

    jest.clearAllMocks();
    wtAPIProfileSearch.mockResolvedValue({ response: { found: 0, profiles: [] }, searchLog: "Result: 0\r\n" });
    const zero = await reRunSavedWtPlusQuery("Orphan Location=Kent", "text");
    expect((zero.actions || []).map((a) => a.label)).toEqual(expect.arrayContaining(["Born in Kent", "Surname Kent"]));
  });

  test("plain-English orphan phrasing parses to the Orphan token (offered on each scope choice), never leaking 'manager'", async () => {
    // Regression: "Denbighshire no manager" produced no WT+ query at all and
    // fell through to person search. Now it parses to Orphan + place and asks
    // which life-event scope. "manager" must never leak into the query.
    for (const prompt of [
      "Denbighshire no manager",
      "Denbighshire with no managers",
      "Denbighshire without a manager",
      "unmanaged profiles in Denbighshire",
      "orphaned profiles in Denbighshire",
    ]) {
      jest.clearAllMocks();
      wtAPIProfileSearch.mockResolvedValue({ response: { profiles: ["1"], searchLog: "Result: 1\r\n" } });
      const result = await runPrompt(prompt);
      expect(wtAPIProfileSearch).not.toHaveBeenCalled();
      const actionQueries = (result.actions || []).map((a) => a.wtPlusQuery);
      expect(actionQueries.length).toBeGreaterThan(0);
      for (const q of actionQueries) {
        expect(q).toContain("Orphan");
        expect(q).toMatch(/Denbighshire/);
        expect(q).not.toMatch(/manager/i);
      }
    }
  });
});
