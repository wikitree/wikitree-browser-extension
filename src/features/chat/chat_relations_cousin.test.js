import { createChatRelationHandlers } from "./chat_relations";

function makeHandlers(fetchPeoplePaged, options = {}) {
  return createChatRelationHandlers({
    WikiTreeAPI: {},
    WBE_CHAT_APP_ID: "wbe-chat-test",
    RELATION_PERSON_FIELDS:
      "Id,Name,FirstName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender,Derived.ShortName",
    getChatAiConfig: jest.fn(),
    parsePlannerJson: jest.fn(),
    normalizeText: (value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    promptRefersToUser: jest.fn(() => false),
    resolveConnectionTargetPerson: jest.fn(),
    getUserWtId: jest.fn(() => "User-1"),
    getUserNumId: jest.fn(() => 1),
    getLoggedInRootPerson: jest.fn(async () => ({ key: 1, wtId: "User-1" })),
    getProfileSubjectRoot: jest.fn(() => options.profileRoot || null),
    makeStandardProfileTable: jest.fn((title, rows) => ({ title, rows })),
    showBioListPopup: jest.fn(),
    handleOpenFromBioList: jest.fn(),
    fetchPeoplePaged,
    fetchProfilesForIds: jest.fn(),
    fetchChildrenIdsForId: jest.fn(),
    fetchSiblingIdsForId: jest.fn(),
    fetchParentIds: jest.fn(),
    isAppsLoginButtonPresent: jest.fn(() => false),
  });
}

describe("chat_relations cousin handling", () => {
  test("returns only nth cousins whose minimal shared ancestor depth matches the requested degree", async () => {
    const fetchPeoplePaged = jest.fn(async (_appId, _keys, _fields, options) => {
      if (options?.ancestors === 4) {
        return [
          null,
          null,
          {
            10: { Id: 10, Name: "Parent-1", Meta: { Degrees: 1 } },
            20: { Id: 20, Name: "Grandparent-1", Meta: { Degrees: 2 } },
            30: { Id: 30, Name: "GreatGrandparent-1", Meta: { Degrees: 3 } },
            40: { Id: 40, Name: "SharedAncestor-1", Meta: { Degrees: 4 } },
          },
        ];
      }

      const keys = Array.isArray(_keys) ? _keys : [_keys];
      if (options?.descendants === 7 && options?.minGeneration === 4 && keys.includes(10)) {
        return [
          null,
          null,
          {
            8: {
              Id: 8,
              Name: "NieceBranch-1",
              FirstName: "NieceBranch",
              LastNameAtBirth: "Tester",
              BirthLocation: "England",
              Meta: { Degrees: 4 },
            },
          },
        ];
      }

      if (options?.descendants === 7 && options?.minGeneration === 4 && keys.includes(20)) {
        return [
          null,
          null,
          {
            3: {
              Id: 3,
              Name: "FirstCousin-1",
              FirstName: "First",
              LastNameAtBirth: "Cousin",
              BirthLocation: "England",
              Meta: { Degrees: 4 },
            },
          },
        ];
      }

      if (options?.descendants === 7 && options?.minGeneration === 4 && keys.includes(30)) {
        return [
          null,
          null,
          {
            4: {
              Id: 4,
              Name: "SecondCousin-1",
              FirstName: "Second",
              LastNameAtBirth: "Cousin",
              BirthLocation: "England",
              Meta: { Degrees: 4 },
            },
          },
        ];
      }

      if (options?.descendants === 7 && options?.minGeneration === 4 && keys.includes(40)) {
        return [
          null,
          null,
          {
            1: { Id: 1, Name: "User-1", FirstName: "User", LastNameAtBirth: "Tester", Meta: { Degrees: 4 } },
            5: {
              Id: 5,
              Name: "ThirdCousin-1",
              FirstName: "Third",
              LastNameAtBirth: "Cousin",
              BirthLocation: "England",
              Meta: { Degrees: 4 },
            },
            6: {
              Id: 6,
              Name: "ThirdCousin-2",
              FirstName: "Another",
              LastNameAtBirth: "Cousin",
              BirthLocation: "Scotland",
              Meta: { Degrees: 4 },
            },
            7: {
              Id: 7,
              Name: "ThirdCousinOnceRemoved-1",
              FirstName: "Removed",
              LastNameAtBirth: "Cousin",
              BirthLocation: "England",
              Meta: { Degrees: 5 },
            },
          },
        ];
      }

      return [null, null, {}];
    });

    const { tryHandleRelationCountPrompt } = makeHandlers(fetchPeoplePaged);
    const result = await tryHandleRelationCountPrompt(
      {
        mode: "list",
        relationRaw: "3rd cousins",
        subjectMode: "user",
        cousinDegree: 3,
        location: "England",
        locationField: "BirthLocation",
      },
      "my third cousins born in England"
    );

    expect(fetchPeoplePaged).toHaveBeenCalledTimes(4);
    expect(result.table.rows).toEqual([
      {
        displayName: "Third Cousin",
        wtid: "ThirdCousin-1",
        firstName: "Third",
        lnab: "Cousin",
        lastNameCurrent: "",
        cousinOrdinal: "3rd",
        degrees: "",
        removed: 0,
        gender: "",
        birth: "",
        death: "",
        birthLocation: "England",
        deathLocation: "",
        surname: "Cousin",
      },
      {
        displayName: "Removed Cousin",
        wtid: "ThirdCousinOnceRemoved-1",
        firstName: "Removed",
        lnab: "Cousin",
        lastNameCurrent: "",
        cousinOrdinal: "3rd",
        degrees: "",
        removed: 1,
        gender: "",
        birth: "",
        death: "",
        birthLocation: "England",
        deathLocation: "",
        surname: "Cousin",
      },
    ]);
    expect(result.message).toContain("Here are your 3rd cousins (and up to 3 removed) born in England (2 found)");
  });

  test("returns inlineMore for cousin lists longer than the preview limit", async () => {
    const fetchPeoplePaged = jest.fn(async (_appId, _keys, _fields, options) => {
      if (options?.ancestors === 4) {
        return [
          null,
          null,
          {
            40: { Id: 40, Name: "SharedAncestor-1", Meta: { Degrees: 4 } },
          },
        ];
      }

      if (options?.descendants === 7 && options?.minGeneration === 4) {
        const descendants = {};
        for (let i = 1; i <= 21; i += 1) {
          descendants[100 + i] = {
            Id: 100 + i,
            Name: `Cousin-${i}`,
            FirstName: `Person${i}`,
            LastNameAtBirth: "Tester",
            Meta: { Degrees: 4 },
          };
        }

        return [null, null, descendants];
      }

      return [null, null, {}];
    });

    const { tryHandleRelationCountPrompt } = makeHandlers(fetchPeoplePaged);
    const result = await tryHandleRelationCountPrompt(
      {
        mode: "list",
        relationRaw: "3rd cousins",
        subjectMode: "user",
        cousinDegree: 3,
      },
      "my 3rd cousins"
    );

    expect(result.message).toContain("Here are your 3rd cousins (and up to 3 removed) (21 found)");
    expect(result.message).not.toContain("...and 1 more.");
    expect(result.inlineMore).toEqual({
      count: 1,
      text: "- 3rd cousin, 0 removed: Person21 Tester (Cousin-21)",
    });
  });

  test("sorts cousin previews and rows by ordinal, removed, and name", async () => {
    const fetchPeoplePaged = jest.fn(async (_appId, _keys, _fields, options) => {
      if (options?.ancestors === 5) {
        return [
          null,
          null,
          {
            20: { Id: 20, Name: "Grandparent-1", Meta: { Degrees: 2 } },
            40: { Id: 40, Name: "SharedAncestor-1", Meta: { Degrees: 4 } },
          },
        ];
      }

      const keyList = Array.isArray(_keys) ? _keys : [_keys];
      if (options?.descendants === 5 && options?.minGeneration === 2 && keyList.includes(20)) {
        return [
          null,
          null,
          {
            4: {
              Id: 4,
              Name: "Zulu-4",
              FirstName: "Zelda",
              LastNameAtBirth: "Zulu",
              Meta: { Degrees: 2 },
            },
            3: {
              Id: 3,
              Name: "Able-3",
              FirstName: "Alice",
              LastNameAtBirth: "Able",
              Meta: { Degrees: 2 },
            },
          },
        ];
      }

      if (options?.descendants === 7 && options?.minGeneration === 4 && keyList.includes(40)) {
        return [
          null,
          null,
          {
            7: {
              Id: 7,
              Name: "Baker-7",
              FirstName: "Bea",
              LastNameAtBirth: "Baker",
              Meta: { Degrees: 5 },
            },
            6: {
              Id: 6,
              Name: "Able-6",
              FirstName: "Aaron",
              LastNameAtBirth: "Able",
              Meta: { Degrees: 4 },
            },
          },
        ];
      }

      return [null, null, {}];
    });

    const { tryHandleRelationCountPrompt } = makeHandlers(fetchPeoplePaged);
    const result = await tryHandleRelationCountPrompt(
      {
        mode: "list",
        relationRaw: "cousins",
        subjectMode: "user",
        allCousins: true,
        maxAncestorGeneration: 5,
      },
      "my cousins"
    );

    expect(result.message).toContain(
      [
        "- 1st cousin, 0 removed: Alice Able (Able-3)",
        "- 1st cousin, 0 removed: Zelda Zulu (Zulu-4)",
        "- 3rd cousin, 0 removed: Aaron Able (Able-6)",
        "- 3rd cousin, 1 removed: Bea Baker (Baker-7)",
      ].join("\n")
    );
    expect(result.table.rows.map((row) => row.wtid)).toEqual(["Able-3", "Zulu-4", "Able-6", "Baker-7"]);
  });

  test("uses Private or RealName when FirstName is unavailable", async () => {
    const fetchPeoplePaged = jest.fn(async (_appId, _keys, _fields, options) => {
      if (options?.ancestors === 4) {
        return [
          null,
          null,
          {
            40: { Id: 40, Name: "SharedAncestor-1", Meta: { Degrees: 4 } },
          },
        ];
      }

      return [
        null,
        null,
        {
          "-12": {
            Id: -12,
            Name: "",
            FirstName: "",
            RealName: "",
            LastNameAtBirth: "",
            BirthLocation: "England",
            Meta: { Degrees: 4 },
          },
          9: {
            Id: 9,
            Name: "SemiPrivate-1",
            FirstName: "",
            RealName: "Mary Ann Smith",
            LastNameAtBirth: "Smith",
            BirthLocation: "England",
            Meta: { Degrees: 5 },
          },
        },
      ];
    });

    const { tryHandleRelationCountPrompt } = makeHandlers(fetchPeoplePaged);
    const result = await tryHandleRelationCountPrompt(
      {
        mode: "list",
        relationRaw: "3rd cousins",
        subjectMode: "user",
        cousinDegree: 3,
      },
      "my 3rd cousins"
    );

    expect(result.table.rows).toHaveLength(2);
    expect(result.table.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          wtid: "",
          firstName: "Private",
          cousinOrdinal: "3rd",
          displayName: "Private",
        }),
        expect.objectContaining({
          wtid: "SemiPrivate-1",
          firstName: "Mary Ann Smith",
          cousinOrdinal: "3rd",
          displayName: "Mary Ann Smith",
        }),
      ])
    );
    expect(result.table.title).toBe("Your 3rd cousins (and up to 3 removed)");
  });

  test("uses the profile person for bare cousin prompts when a profile is open", async () => {
    const fetchPeoplePaged = jest.fn(async (_appId, keys, _fields, options) => {
      if (options?.ancestors === 4) {
        expect(keys).toBe("Profile-9");
        return [
          null,
          null,
          {
            40: { Id: 40, Name: "SharedAncestor-1", Meta: { Degrees: 4 } },
          },
        ];
      }

      return [
        null,
        null,
        {
          5: {
            Id: 5,
            Name: "ThirdCousin-1",
            FirstName: "Third",
            LastNameAtBirth: "Cousin",
            BirthLocation: "England",
            Meta: { Degrees: 4 },
          },
        },
      ];
    });

    const { tryHandleRelationCountPrompt } = makeHandlers(fetchPeoplePaged, {
      profileRoot: { key: "Profile-9", wtId: "Profile-9", displayName: "Profile Person" },
    });
    const result = await tryHandleRelationCountPrompt(
      {
        mode: "list",
        relationRaw: "3rd cousins",
        subjectMode: "contextual",
        cousinDegree: 3,
      },
      "third cousins"
    );

    expect(result.table.title).toBe("3rd cousins (and up to 3 removed) for Profile Person (Profile-9)");
    expect(fetchPeoplePaged).toHaveBeenCalled();
  });

  test("collects all supported cousins for my plain cousin prompts with location filtering", async () => {
    const fetchPeoplePaged = jest.fn(async (_appId, keys, _fields, options) => {
      if (options?.ancestors === 5) {
        expect(keys).toBe("User-1");
        return [
          null,
          null,
          {
            20: { Id: 20, Name: "Grandparent-1", Meta: { Degrees: 2 } },
            30: { Id: 30, Name: "GreatGrandparent-1", Meta: { Degrees: 3 } },
            40: { Id: 40, Name: "SharedAncestor-1", Meta: { Degrees: 4 } },
          },
        ];
      }

      const keyList = Array.isArray(keys) ? keys : [keys];
      if (options?.descendants === 5 && options?.minGeneration === 2 && keyList.includes(20)) {
        return [
          null,
          null,
          {
            3: {
              Id: 3,
              Name: "FirstCousin-1",
              FirstName: "First",
              LastNameAtBirth: "Cousin",
              BirthLocation: "England",
              Meta: { Degrees: 2 },
            },
          },
        ];
      }

      if (options?.descendants === 6 && options?.minGeneration === 3 && keyList.includes(30)) {
        return [
          null,
          null,
          {
            4: {
              Id: 4,
              Name: "SecondCousin-1",
              FirstName: "Second",
              LastNameAtBirth: "Cousin",
              BirthLocation: "Scotland",
              Meta: { Degrees: 3 },
            },
          },
        ];
      }

      if (options?.descendants === 7 && options?.minGeneration === 4 && keyList.includes(40)) {
        return [
          null,
          null,
          {
            1: { Id: 1, Name: "User-1", FirstName: "User", LastNameAtBirth: "Tester", Meta: { Degrees: 4 } },
            5: {
              Id: 5,
              Name: "ThirdCousin-1",
              FirstName: "Third",
              LastNameAtBirth: "Cousin",
              BirthLocation: "England",
              Meta: { Degrees: 4 },
            },
            7: {
              Id: 7,
              Name: "ThirdCousinOnceRemoved-1",
              FirstName: "Removed",
              LastNameAtBirth: "Cousin",
              BirthLocation: "England",
              Meta: { Degrees: 5 },
            },
          },
        ];
      }

      return [null, null, {}];
    });

    const { tryHandleRelationCountPrompt } = makeHandlers(fetchPeoplePaged);
    const result = await tryHandleRelationCountPrompt(
      {
        mode: "list",
        relationRaw: "cousins",
        subjectMode: "user",
        allCousins: true,
        maxAncestorGeneration: 5,
        location: "England",
        locationField: "BirthLocation",
      },
      "my cousins born in England"
    );

    expect(fetchPeoplePaged).toHaveBeenCalledTimes(4);
    expect(result.table.rows).toEqual([
      {
        displayName: "First Cousin",
        wtid: "FirstCousin-1",
        firstName: "First",
        lnab: "Cousin",
        lastNameCurrent: "",
        cousinOrdinal: "1st",
        degrees: "",
        removed: 0,
        gender: "",
        birth: "",
        death: "",
        birthLocation: "England",
        deathLocation: "",
        surname: "Cousin",
      },
      {
        displayName: "Third Cousin",
        wtid: "ThirdCousin-1",
        firstName: "Third",
        lnab: "Cousin",
        lastNameCurrent: "",
        cousinOrdinal: "3rd",
        degrees: "",
        removed: 0,
        gender: "",
        birth: "",
        death: "",
        birthLocation: "England",
        deathLocation: "",
        surname: "Cousin",
      },
      {
        displayName: "Removed Cousin",
        wtid: "ThirdCousinOnceRemoved-1",
        firstName: "Removed",
        lnab: "Cousin",
        lastNameCurrent: "",
        cousinOrdinal: "3rd",
        degrees: "",
        removed: 1,
        gender: "",
        birth: "",
        death: "",
        birthLocation: "England",
        deathLocation: "",
        surname: "Cousin",
      },
    ]);
    expect(result.message).toContain(
      "Here are your cousins (through 4th cousins and up to 3 removed) born in England (3 found)"
    );
  });

  test("honors an explicit upper bound for all-cousins prompts", async () => {
    const fetchPeoplePaged = jest.fn(async (_appId, keys, _fields, options) => {
      if (options?.ancestors === 7) {
        expect(keys).toBe("User-1");
        return [
          null,
          null,
          {
            70: { Id: 70, Name: "SharedAncestor-6", Meta: { Degrees: 7 } },
          },
        ];
      }

      const keyList = Array.isArray(keys) ? keys : [keys];
      if (options?.descendants === 10 && options?.minGeneration === 7 && keyList.includes(70)) {
        return [
          null,
          null,
          {
            16: {
              Id: 16,
              Name: "SixthCousin-1",
              FirstName: "Sixth",
              LastNameAtBirth: "Cousin",
              BirthLocation: "England",
              Meta: { Degrees: 7 },
            },
            17: {
              Id: 17,
              Name: "SixthCousinOnceRemoved-1",
              FirstName: "Removed",
              LastNameAtBirth: "Cousin",
              BirthLocation: "England",
              Meta: { Degrees: 8 },
            },
          },
        ];
      }

      return [null, null, {}];
    });

    const { tryHandleRelationCountPrompt } = makeHandlers(fetchPeoplePaged);
    const result = await tryHandleRelationCountPrompt(
      {
        mode: "list",
        relationRaw: "cousins",
        subjectMode: "user",
        allCousins: true,
        maxAncestorGeneration: 7,
        location: "England",
        locationField: "BirthLocation",
      },
      "my cousins up to 6th cousins born in England"
    );

    expect(fetchPeoplePaged).toHaveBeenCalledTimes(2);
    expect(result.table.rows).toEqual([
      {
        displayName: "Sixth Cousin",
        wtid: "SixthCousin-1",
        firstName: "Sixth",
        lnab: "Cousin",
        lastNameCurrent: "",
        cousinOrdinal: "6th",
        degrees: "",
        removed: 0,
        gender: "",
        birth: "",
        death: "",
        birthLocation: "England",
        deathLocation: "",
        surname: "Cousin",
      },
      {
        displayName: "Removed Cousin",
        wtid: "SixthCousinOnceRemoved-1",
        firstName: "Removed",
        lnab: "Cousin",
        lastNameCurrent: "",
        cousinOrdinal: "6th",
        degrees: "",
        removed: 1,
        gender: "",
        birth: "",
        death: "",
        birthLocation: "England",
        deathLocation: "",
        surname: "Cousin",
      },
    ]);
    expect(result.message).toContain(
      "Here are your cousins (through 6th cousins and up to 3 removed) born in England (2 found)"
    );
  });
});
