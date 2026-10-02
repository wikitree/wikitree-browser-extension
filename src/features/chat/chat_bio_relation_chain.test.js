import { createChatBioHandlers } from "./chat_bio";

function makeDeps(overrides = {}) {
  const WikiTreeAPI = {
    getPerson: jest.fn(async (appId, key) => ({ Id: Number(key) || 100, Name: "Dupont-1", Father: 11, Mother: 12 })),
    getProfile: jest.fn(async (appId, key) => [
      { Id: 1, Name: String(key), RealName: `Real ${key}`, Bio: "Some bio text." },
    ]),
    getRelatives: jest.fn(async (appId, key, fields, opts = {}) => {
      if (opts.getSpouses) {
        return [
          {
            person: {
              Spouses: {
                a: { Name: "Henry-8762", RealName: "Marie", Gender: "Female" },
              },
            },
          },
        ];
      }
      if (opts.getSiblings) {
        return [
          {
            person: {
              Siblings: {
                a: { Name: "Henry-100" },
                b: { Name: "Henry-101" },
              },
            },
          },
        ];
      }
      return [{ person: {} }];
    }),
    getPeople: jest.fn(async () => [null, {}, {}]),
    lookupProfile: jest.fn(),
  };

  return {
    WBE_CHAT_APP_ID: "wbe-chat-test",
    CHAT_LAST_BIO_KEY: "wbe-last-bio",
    wtAPIProfileSearch: jest.fn(),
    WikiTreeAPI,
    getProfilePersonInfo: jest.fn(() => null),
    getProfileRootPerson: jest.fn(() => ({ Name: "Dupont-1" })),
    setHighestZIndex: jest.fn(),
    escapeHtml: (value) => String(value),
    setPopupPositionAndSize: jest.fn(),
    showChatShaky: jest.fn(),
    hideChatShaky: jest.fn(),
    sanitizeHtmlForPopup: (value) => String(value),
    extractProfileBios: jest.fn(() => ({ wikiBio: "Some bio text.", htmlBio: "" })),
    showBioListPopup: jest.fn(),
    showTiledBioPopups: jest.fn(async () => {}),
    addBioButton: jest.fn(),
    appendMessage: jest.fn(),
    resolveToWTID: jest.fn(async (id) => String(id)),
    fetchProfilesForIds: jest.fn(async (ids) =>
      ids.map((id) => ({ Id: id, Name: String(id), RealName: `Real ${id}`, Bio: "Some bio text." }))
    ),
    fetchPeoplePaged: jest.fn(async (appId, ids) => {
      const byKey = {};
      (ids || []).forEach((id) => {
        byKey[String(id)] = { Id: id, Name: String(id), RealName: `Real ${id}`, Bio: "Some bio text." };
      });
      return [null, {}, byKey];
    }),
    mapApiPersonToStandardRow: jest.fn(() => ({})),
    makeStandardProfileTable: jest.fn(() => ({ columns: [] })),
    resolveConnectionTargetPerson: jest.fn(async (target) =>
      /^(Dupont-1|Marguerite)$/i.test(String(target).trim()) ? { Id: 100, Name: "Dupont-1", RealName: "Root" } : null
    ),
    hasAnyApiKey: jest.fn(() => false),
    buildRecentConversationForAi: jest.fn(() => ""),
    getLastStructuredResult: jest.fn(() => null),
    getLastConnectionCandidates: jest.fn(() => []),
    findSpouseProfileIdsFromDOM: jest.fn(() => []),
    findChildrenProfileIdsFromDOM: jest.fn(() => []),
    findSiblingProfileIdsFromDOM: jest.fn(() => []),
    findParentProfileIdsFromDOM: jest.fn(() => []),
    setLastBioPopupState: jest.fn(),
    ...overrides,
  };
}

function messageOf(result) {
  return typeof result === "string" ? result : String(result?.message || "");
}

describe("tryHandlePersonBioPrompt relation chains", () => {
  test("bare relation subject anchors to the open profile: father's wife's siblings bios", async () => {
    const deps = makeDeps();
    const handlers = createChatBioHandlers(deps);

    const result = await handlers.tryHandlePersonBioPrompt("father's wife's siblings bios");
    const message = messageOf(result);

    // Anchored to the profile person, not searched as a person called "father".
    expect(deps.resolveConnectionTargetPerson).toHaveBeenCalledWith("Dupont-1", expect.any(String));
    // The father hop picked the father (11), not parents[0] by luck.
    expect(deps.WikiTreeAPI.getPerson).toHaveBeenCalledWith("Chat", 100, "Id,Name,Father,Mother");
    const spouseHop = deps.WikiTreeAPI.getRelatives.mock.calls.find(([, , , opts]) => opts?.getSpouses);
    expect(String(spouseHop?.[1])).toBe("11");
    // The final "siblings" step actually ran on the wife's profile.
    const siblingCall = deps.WikiTreeAPI.getRelatives.mock.calls.find(([, , , opts]) => opts?.getSiblings);
    expect(String(siblingCall?.[1])).toBe("Henry-8762");
    expect(message).not.toMatch(/^Biography for/);
    expect(message).toMatch(/2/);
  });

  test("named chain keeps the final siblings step: Marguerite's father's wife's siblings bios", async () => {
    const deps = makeDeps();
    const handlers = createChatBioHandlers(deps);

    const result = await handlers.tryHandlePersonBioPrompt("Marguerite's father's wife's siblings bios");
    const message = messageOf(result);

    expect(deps.resolveConnectionTargetPerson).toHaveBeenCalledWith("Marguerite", expect.any(String));
    const siblingCall = deps.WikiTreeAPI.getRelatives.mock.calls.find(([, , , opts]) => opts?.getSiblings);
    expect(String(siblingCall?.[1])).toBe("Henry-8762");
    // Regression: this used to fall back to the wife's own bio.
    expect(message).not.toMatch(/^Biography for/);
    expect(message).toMatch(/2/);
  });

  test("gendered spouse selection: Marguerite's mother's husband's bio picks the male spouse", async () => {
    const deps = makeDeps();
    deps.WikiTreeAPI.getRelatives = jest.fn(async (appId, key, fields, opts = {}) => {
      if (opts.getSpouses) {
        return [
          {
            person: {
              Spouses: {
                a: { Name: "X-2", RealName: "Second Wife", Gender: "Female" },
                b: { Name: "Dupont-0", RealName: "Dad", Gender: "Male" },
              },
            },
          },
        ];
      }
      return [{ person: {} }];
    });
    const handlers = createChatBioHandlers(deps);

    const result = await handlers.tryHandlePersonBioPrompt("Marguerite's mother's husband's bio");
    const message = messageOf(result);

    // Mother hop used the specific Mother id (12).
    const spouseHop = deps.WikiTreeAPI.getRelatives.mock.calls.find(([, , , opts]) => opts?.getSpouses);
    expect(String(spouseHop?.[1])).toBe("12");
    // Final "husband" relation filtered to the male spouse only.
    expect(message).toMatch(/Dupont-0|Dad/);
    expect(message).not.toMatch(/X-2|Second Wife/);
  });

  test("unknown final relation after hops does not degrade to a self bio", async () => {
    const deps = makeDeps();
    const handlers = createChatBioHandlers(deps);

    const result = await handlers.tryHandlePersonBioPrompt("Marguerite's father's shoemaker bios");
    const message = messageOf(result);

    expect(message).toMatch(/didn't understand the final relation "shoemaker"/);
    expect(message).not.toMatch(/^Biography for/);
  });

  test("bare relation with self bio: father's bio opens the profile person's father", async () => {
    const deps = makeDeps();
    const handlers = createChatBioHandlers(deps);

    const result = await handlers.tryHandlePersonBioPrompt("father's bio");
    const message = messageOf(result);

    expect(deps.resolveConnectionTargetPerson).toHaveBeenCalledWith("Dupont-1", expect.any(String));
    expect(deps.WikiTreeAPI.getPerson).toHaveBeenCalledWith("Chat", 100, "Id,Name,Father,Mother");
    expect(message).toMatch(/^Biography for 11:/);
  });
  test("mother hop unwraps the Person object getPerson returns (live: Ellen's mother's siblings)", async () => {
    const deps = makeDeps();
    // The real WikiTreeAPI.getPerson returns a Person wrapper with the row in ._data.
    deps.WikiTreeAPI.getPerson = jest.fn(async (appId, key) => ({
      _data: { Id: Number(key) || 100, Name: "Dupont-1", Father: 11, Mother: 12 },
    }));
    const baseGetRelatives = deps.WikiTreeAPI.getRelatives;
    deps.WikiTreeAPI.getRelatives = jest.fn(async (appId, key, fields, opts = {}) => {
      // The generic parent lookup lists the father first.
      if (opts.getParents) return [{ person: { Parents: { 11: { Name: "Dad-11" }, 12: { Name: "Mum-12" } } } }];
      return baseGetRelatives(appId, key, fields, opts);
    });
    const handlers = createChatBioHandlers(deps);

    await handlers.tryHandlePersonBioPrompt("Marguerite's mother's siblings");

    // The numeric person Id is turned into a WikiTree ID before later steps.
    expect(deps.resolveToWTID).toHaveBeenCalledWith("12");
    const siblingCall = deps.WikiTreeAPI.getRelatives.mock.calls.find(([, , , opts]) => opts?.getSiblings);
    expect(String(siblingCall?.[1])).toBe("12");
  });
  function withFatherSpouses(deps, spouses) {
    deps.WikiTreeAPI.getPerson = jest.fn(async () => ({ _data: { Id: 100, Name: "Dupont-1", Father: 11, Mother: 12 } }));
    const baseGetRelatives = deps.WikiTreeAPI.getRelatives;
    deps.WikiTreeAPI.getRelatives = jest.fn(async (appId, key, fields, opts = {}) => {
      if (opts.getSpouses && String(key) === "11") return [{ person: { Spouses: spouses } }];
      return baseGetRelatives(appId, key, fields, opts);
    });
  }

  test("stepmother skips the mother: father's other wife (live: Ellen's stepmother)", async () => {
    const deps = makeDeps();
    withFatherSpouses(deps, {
      12: { Id: 12, Name: "Mum-12", RealName: "Hannah", Gender: "Female" },
      13: { Id: 13, Name: "Step-13", RealName: "Lona", Gender: "Female" },
    });
    const handlers = createChatBioHandlers(deps);

    const message = messageOf(await handlers.tryHandlePersonBioPrompt("Marguerite's step-mother"));

    expect(message).toMatch(/Lona/);
    expect(message).not.toMatch(/Hannah/);
  });

  test("stepmother when the father's only wife is the mother says none, not the mother", async () => {
    const deps = makeDeps();
    withFatherSpouses(deps, { 12: { Id: 12, Name: "Mum-12", RealName: "Hannah", Gender: "Female" } });
    const handlers = createChatBioHandlers(deps);

    const message = messageOf(await handlers.tryHandlePersonBioPrompt("Marguerite's stepmother"));

    expect(message).toMatch(/no stepmother/);
    expect(message).not.toMatch(/Hannah/);
  });

  test("stepmother as a hop: Marguerite's stepmother's siblings", async () => {
    const deps = makeDeps();
    withFatherSpouses(deps, {
      12: { Id: 12, Name: "Mum-12", RealName: "Hannah", Gender: "Female" },
      13: { Id: 13, Name: "Step-13", RealName: "Lona", Gender: "Female" },
    });
    const handlers = createChatBioHandlers(deps);

    await handlers.tryHandlePersonBioPrompt("Marguerite's stepmother's siblings");

    const siblingCall = deps.WikiTreeAPI.getRelatives.mock.calls.find(([, , , opts]) => opts?.getSiblings);
    expect(String(siblingCall?.[1])).toBe("Step-13");
  });
});
