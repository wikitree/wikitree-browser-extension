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

// Live C15, 2026-10-03: on Ellen (Cook) Alley's page, "her husband's siblings'
// children" read "her husband" as a name, and the chain followed only the
// first husband and the first sibling.
describe("relation chains through several people", () => {
  const family = {
    100: { Spouses: { a: { Name: "Burton-1", Gender: "Male" }, b: { Name: "Alley-1", Gender: "Male" } } },
    "Burton-1": { Siblings: { a: { Name: "Burton-2" } } },
    "Alley-1": { Siblings: { a: { Name: "Alley-2" }, b: { Name: "Alley-3" } } },
    "Burton-2": { Children: { a: { Name: "Burton-9" } } },
    "Alley-2": { Children: {} },
    "Alley-3": { Children: { a: { Name: "Alley-9" }, b: { Name: "Alley-8" } } },
  };
  const getRelatives = jest.fn(async (appId, key, fields, opts = {}) => {
    const person = family[String(key)] || {};
    if (opts.getSpouses) return [{ person: { Spouses: person.Spouses || {} } }];
    if (opts.getSiblings) return [{ person: { Siblings: person.Siblings || {} } }];
    if (opts.getChildren) return [{ person: { Children: person.Children || {} } }];
    return [{ person: {} }];
  });

  test("her husband's siblings' children covers both husbands and every sibling", async () => {
    const deps = makeDeps();
    deps.WikiTreeAPI.getRelatives = getRelatives;
    const handlers = createChatBioHandlers(deps);

    const result = await handlers.tryHandlePersonBioPrompt("her husband's siblings' children");
    const message = messageOf(result);

    expect(deps.resolveConnectionTargetPerson).toHaveBeenCalledWith("Dupont-1", expect.any(String));
    const listed = JSON.stringify(deps.showBioListPopup.mock.calls) + message;
    for (const child of ["Burton-9", "Alley-9", "Alley-8"]) expect(listed).toContain(child);
  });
});

describe("relation lists with a filter or details clause go to the router (D4/D5)", () => {
  test.each([
    "which of Cook-8721's children died young",
    "Cook-8721's children with their birth places",
    "where did Cook-8721's parents get married",
  ])(
    "%s",
    async (prompt) => {
      const deps = makeDeps();
      const handlers = createChatBioHandlers(deps);
      expect(await handlers.tryHandlePersonBioPrompt(prompt)).toBeNull();
      expect(deps.resolveConnectionTargetPerson).not.toHaveBeenCalled();
    }
  );

  test("a plain relation list is still handled", async () => {
    const deps = makeDeps();
    const handlers = createChatBioHandlers(deps);
    await handlers.tryHandlePersonBioPrompt("Marguerite's children");
    expect(deps.resolveConnectionTargetPerson).toHaveBeenCalledWith("Marguerite", expect.any(String));
  });
});

test("a question about the profile is not a bio request (D10)", async () => {
  const deps = makeDeps();
  const handlers = createChatBioHandlers(deps);
  expect(await handlers.tryHandlePersonBioPrompt("what sources does this profile have?")).toBeNull();
});

describe("one fact about a relative goes to the router (E6/E12)", () => {
  test.each(["what was her mother's maiden name", "when was Cook-8721's husband born", "Cook-8721's mother's maiden name"])(
    "%s",
    async (prompt) => {
      const deps = makeDeps();
      const handlers = createChatBioHandlers(deps);
      expect(await handlers.tryHandlePersonBioPrompt(prompt)).toBeNull();
    }
  );
});

describe("twins questions go to the router (E11)", () => {
  test.each(["were any of her children twins", "were any of Cook-8721's children twins", "did Cook-8721 have any twins"])(
    "%s",
    async (prompt) => {
      const deps = makeDeps();
      const handlers = createChatBioHandlers(deps);
      expect(await handlers.tryHandlePersonBioPrompt(prompt)).toBeNull();
    }
  );
});

test("which of her children had children goes to the router (E5)", async () => {
  const deps = makeDeps();
  const handlers = createChatBioHandlers(deps);
  expect(await handlers.tryHandlePersonBioPrompt("which of Cook-8721's children had children of their own")).toBeNull();
});

test("who was her father's father is the profile's chain, not a person named 'who was her father' (F3)", async () => {
  const deps = makeDeps();
  const handlers = createChatBioHandlers(deps);
  const result = await handlers.tryHandlePersonBioPrompt("who was her father's father?");
  expect(JSON.stringify(result || "")).not.toMatch(/who was/i);
  expect(deps.resolveConnectionTargetPerson).not.toHaveBeenCalledWith(expect.stringMatching(/who was/i), expect.anything());
});

describe("a question about a relative goes on to the AI (F4)", () => {
  test.each(["what did her husband do for a living?", "what was her father's occupation?", "where did his sons emigrate to?"])(
    "%s",
    async (prompt) => {
      const deps = makeDeps();
      const handlers = createChatBioHandlers(deps);
      expect(await handlers.tryHandlePersonBioPrompt(prompt)).toBeNull();
    }
  );
  test("a plain relation list is still handled", async () => {
    const deps = makeDeps();
    const handlers = createChatBioHandlers(deps);
    await handlers.tryHandlePersonBioPrompt("Marguerite's children");
    expect(deps.resolveConnectionTargetPerson).toHaveBeenCalled();
  });
});

describe("outlived questions go to the router (G9)", () => {
  test.each(["how many of her children died before her", "which of Cook-8721's children did she outlive", "which of Cook-8721's children outlived her"])(
    "%s",
    async (prompt) => {
      const deps = makeDeps();
      const handlers = createChatBioHandlers(deps);
      expect(await handlers.tryHandlePersonBioPrompt(prompt)).toBeNull();
    }
  );
});

test("which of her siblings died first goes to the router (G2)", async () => {
  const deps = makeDeps();
  const handlers = createChatBioHandlers(deps);
  expect(await handlers.tryHandlePersonBioPrompt("which of Cook-8721's siblings died first")).toBeNull();
});

test("who was Ellen's first husband goes to the router (D1)", async () => {
  const deps = makeDeps();
  const handlers = createChatBioHandlers(deps);
  expect(await handlers.tryHandlePersonBioPrompt("who was Ellen's first husband?")).toBeNull();
  expect(deps.resolveConnectionTargetPerson).not.toHaveBeenCalled();
});

// J1 (live, 2026-10-03): "how do I add a photo to a profile?" showed the bio
// of the first spouse link on the page.
describe("a help question is not a bio request", () => {
  test("no target, no relation, no bio word", async () => {
    document.body.innerHTML = '<a class="spouseLink" href="/wiki/Burton-13215">William Henry Burton</a>';
    const deps = makeDeps();
    const handlers = createChatBioHandlers(deps);
    const result = await handlers.tryHandlePersonBioPrompt("how do I add a photo to a profile?");
    expect(result).toBeNull();
    expect(deps.WikiTreeAPI.getProfile).not.toHaveBeenCalled();
    document.body.innerHTML = "";
  });
});

// P6 (live, 2026-10-03): "show Hannah Hutton's children" looked up "show Hannah Hutton".
describe("a list request is not a bio request", () => {
  test.each(["show Hannah Hutton's children", "list Charles Alley's siblings", "how many children did Charles Alley have?"])("%s", async (prompt) => {
    const deps = makeDeps();
    const handlers = createChatBioHandlers(deps);
    expect(await handlers.tryHandlePersonBioPrompt(prompt)).toBeNull();
  });
});

describe("relationshipListLead", () => {
  const { relationshipListLead } = require("./chat_relation_chain_text");
  test("a singular label gets 'the' and agrees with the count", () => {
    expect(relationshipListLead("grandfather", 1)).toBe("Here is the grandfather");
    expect(relationshipListLead("grandfather", 2)).toBe("Here are the grandfathers");
    expect(relationshipListLead("children", 11)).toBe("Here are children");
    expect(relationshipListLead("grandparents", 1)).toBe("Here are grandparents");
  });
});

describe("describeConnectionPath", () => {
  const { describeConnectionPath } = require("./chat_relation_chain_text");
  const martha = { Name: "Teece-118", Gender: "Female" };

  test("a spouse is named as one", () => {
    const path = [martha, { Name: "Beacall-11", Gender: "Male", pathType: "spouse" }];
    expect(describeConnectionPath(path, "Martha (Teece-118)", "Philip (Beacall-11)")).toBe(
      "Philip (Beacall-11) is Martha (Teece-118)'s husband."
    );
  });

  test("a short chain reads as relatives of relatives, and for you", () => {
    const path = [martha, { Gender: "Male", pathType: "spouse" }, { Gender: "Female", pathType: "child" }];
    expect(describeConnectionPath(path, "Martha (Teece-118)", "Jane (Beacall-20)")).toBe(
      "Jane (Beacall-20) is Martha (Teece-118)'s husband's daughter."
    );
    expect(describeConnectionPath(path, "you", "Jane (Beacall-20)")).toBe("Jane (Beacall-20) is your husband's daughter.");
  });

  test("WikiTree's relationship name leads, with the path in brackets", () => {
    const thomas = { Name: "Beacall-13", Gender: "Male" };
    const path = [thomas, { Gender: "Female", pathType: "child" }, { Gender: "Male", pathType: "child" }];
    expect(describeConnectionPath(path, "Thomas (Beacall-13)", "Philip (Beacall-11)", 3, "Grandson")).toBe(
      "Philip (Beacall-11) is Thomas (Beacall-13)'s grandson (his daughter's son)."
    );
    expect(describeConnectionPath(path, "you", "Philip (Beacall-11)", 3, "Grandson")).toBe(
      "Philip (Beacall-11) is your grandson (your daughter's son)."
    );
  });

  test("long paths and unknown steps are left to the step count", () => {
    const step = { Gender: "Male", pathType: "father" };
    expect(describeConnectionPath([martha, step, step, step, step], "M", "X")).toBe("");
    expect(describeConnectionPath([martha, { Gender: "Male" }], "M", "X")).toBe("");
    expect(describeConnectionPath([martha], "M", "X")).toBe("");
  });
});

describe("descendantCountMessage", () => {
  const { descendantCountMessage, descendantGenerationWord } = require("./chat_relation_chain_text");
  test("generation words", () => {
    expect([1, 2, 3, 5].map((degree) => descendantGenerationWord(degree))).toEqual([
      "children",
      "grandchildren",
      "great-grandchildren",
      "3x great-grandchildren",
    ]);
    expect(descendantGenerationWord(2, 1)).toBe("grandchild");
  });

  test("the count leads, generation by generation", () => {
    const rows = [1, 1, 2, 2, 2, 3].map((degrees) => ({ degrees }));
    expect(descendantCountMessage(rows, "Philip (Beacall-11)", "has", 10)).toBe(
      "Philip (Beacall-11) has 6 descendants on WikiTree within 10 generations: 2 children, 3 grandchildren, 1 great-grandchild."
    );
    expect(descendantCountMessage([{ degrees: 1 }], "You", "have")).toBe("You have 1 descendant on WikiTree.");
  });
});
