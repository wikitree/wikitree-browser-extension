export function createChatRelationHandlers({
  WikiTreeAPI,
  WBE_CHAT_APP_ID,
  RELATION_PERSON_FIELDS,
  getChatAiConfig,
  parsePlannerJson,
  normalizeText,
  promptRefersToUser,
  resolveConnectionTargetPerson,
  getUserWtId,
  getUserNumId,
  getLoggedInRootPerson,
  makeStandardProfileTable,
  showBioListPopup,
  handleOpenFromBioList,
  fetchPeoplePaged,
  fetchProfilesForIds,
  fetchChildrenIdsForId,
  fetchSiblingIdsForId,
  findParentProfileIdsFromDOM,
  isAppsLoginButtonPresent,
}) {
  function parseRelationType(rawRelation) {
    const value = normalizeText(rawRelation)
      .replace(/[^a-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const specs = [
      {
        pattern: /grand\s*aunts?/,
        key: "grandaunts",
        singular: "grandaunt",
        plural: "grandaunts",
        group: "grandparentSiblings",
        gender: "Female",
      },
      {
        pattern: /grand\s*uncles?/,
        key: "granduncles",
        singular: "granduncle",
        plural: "granduncles",
        group: "grandparentSiblings",
        gender: "Male",
      },
      {
        pattern: /grand\s*mothers?/,
        key: "grandmothers",
        singular: "grandmother",
        plural: "grandmothers",
        group: "grandparents",
        gender: "Female",
      },
      {
        pattern: /grand\s*fathers?/,
        key: "grandfathers",
        singular: "grandfather",
        plural: "grandfathers",
        group: "grandparents",
        gender: "Male",
      },
      {
        pattern: /grand\s*parents?/,
        key: "grandparents",
        singular: "grandparent",
        plural: "grandparents",
        group: "grandparents",
        gender: null,
      },
      { pattern: /aunts?/, key: "aunts", singular: "aunt", plural: "aunts", group: "parentSiblings", gender: "Female" },
      {
        pattern: /uncles?/,
        key: "uncles",
        singular: "uncle",
        plural: "uncles",
        group: "parentSiblings",
        gender: "Male",
      },
      {
        pattern: /mothers?|moms?/,
        key: "mothers",
        singular: "mother",
        plural: "mothers",
        group: "parents",
        gender: "Female",
      },
      {
        pattern: /fathers?|dads?/,
        key: "fathers",
        singular: "father",
        plural: "fathers",
        group: "parents",
        gender: "Male",
      },
      { pattern: /parents?/, key: "parents", singular: "parent", plural: "parents", group: "parents", gender: null },
      {
        pattern: /daughters?/,
        key: "daughters",
        singular: "daughter",
        plural: "daughters",
        group: "children",
        gender: "Female",
      },
      { pattern: /sons?/, key: "sons", singular: "son", plural: "sons", group: "children", gender: "Male" },
      {
        pattern: /children|kids?/,
        key: "children",
        singular: "child",
        plural: "children",
        group: "children",
        gender: null,
      },
      { pattern: /wives|wife/, key: "wives", singular: "wife", plural: "wives", group: "spouses", gender: "Female" },
      {
        pattern: /husbands?|husband/,
        key: "husbands",
        singular: "husband",
        plural: "husbands",
        group: "spouses",
        gender: "Male",
      },
      {
        pattern: /spouses?|partners?/,
        key: "spouses",
        singular: "spouse",
        plural: "spouses",
        group: "spouses",
        gender: null,
      },
      {
        pattern: /sisters?/,
        key: "sisters",
        singular: "sister",
        plural: "sisters",
        group: "siblings",
        gender: "Female",
      },
      {
        pattern: /brothers?/,
        key: "brothers",
        singular: "brother",
        plural: "brothers",
        group: "siblings",
        gender: "Male",
      },
      {
        pattern: /siblings?|sibs?/,
        key: "siblings",
        singular: "sibling",
        plural: "siblings",
        group: "siblings",
        gender: null,
      },
    ];

    return specs.find((spec) => spec.pattern.test(value)) || null;
  }

  function normalizeRelationChainText(rawRelation) {
    return String(rawRelation || "")
      .replace(/[’`]/g, "'")
      .replace(/[?.!]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function splitRelationChainSegments(rawRelation) {
    const normalized = normalizeRelationChainText(rawRelation);
    if (!normalized) {
      return [];
    }

    const possessiveSegments = normalized
      .split(/\s*'s\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);
    if (possessiveSegments.length > 1) {
      return possessiveSegments;
    }

    const ofSegments = normalized
      .split(/\s+of\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);
    if (ofSegments.length > 1) {
      return ofSegments.reverse();
    }

    return [normalized];
  }

  function parseRelationChainLocally(rawRelation) {
    const segments = splitRelationChainSegments(rawRelation);
    if (!segments.length) {
      return [];
    }

    const steps = [];
    for (const segment of segments) {
      const spec = parseRelationType(segment);
      if (!spec) {
        return [];
      }
      steps.push(spec);
    }

    return steps;
  }

  async function tryAiParseRelationChain(rawRelation) {
    const normalized = normalizeRelationChainText(rawRelation);
    if (!normalized || (!normalized.includes("'") && !/\bof\b/i.test(normalized))) {
      return [];
    }

    const { provider, key, model } = await getChatAiConfig();
    if (!key) {
      return [];
    }

    const prompt = [
      "You parse family relation chains for a genealogy tool.",
      'Return JSON only: {"steps":["mother","sister","husband"]}.',
      "Allowed step words: mother, father, parent, sister, brother, sibling, daughter, son, child, wife, husband, spouse,",
      "aunt, uncle, grandaunt, granduncle, grandmother, grandfather, grandparent.",
      "Do not include any words other than allowed step words.",
      `Relation text: ${normalized}`,
    ].join("\n");

    const response = await chrome.runtime.sendMessage({
      action: "chatWithAI",
      prompt,
      provider,
      key,
      model,
      pageContext: {
        url: window.location.href,
        title: document.title,
      },
    });

    if (!response?.success || !response.response) {
      return [];
    }

    const parsed = parsePlannerJson(response.response);
    const rawSteps = Array.isArray(parsed?.steps) ? parsed.steps : [];
    if (!rawSteps.length) {
      return [];
    }

    const steps = [];
    for (const rawStep of rawSteps) {
      const spec = parseRelationType(rawStep);
      if (!spec) {
        return [];
      }
      steps.push(spec);
    }

    return steps;
  }

  async function resolveRelationChain(rawRelation) {
    const localSteps = parseRelationChainLocally(rawRelation);
    if (localSteps.length) {
      return localSteps;
    }

    const aiSteps = await tryAiParseRelationChain(rawRelation);
    if (aiSteps.length) {
      return aiSteps;
    }

    const single = parseRelationType(rawRelation);
    return single ? [single] : [];
  }

  function relationMatchesGender(person, expectedGender) {
    if (!expectedGender) {
      return true;
    }
    return normalizeText(person?.Gender) === normalizeText(expectedGender);
  }

  function uniquePeopleById(people) {
    const deduped = new Map();
    (people || []).forEach((person) => {
      const key = String(person?.Name || person?.Id || "").trim();
      if (!key) {
        return;
      }
      if (!deduped.has(key)) {
        deduped.set(key, person);
      }
    });
    return Array.from(deduped.values());
  }

  function toDisplayName(person) {
    const fallbackSurname = String(person?.LastNameCurrent || person?.LastNameAtBirth || "").trim();
    let preferred = String(person?.RealName || person?.Derived?.ShortName || "").trim();
    if (preferred) {
      if (!/\s/.test(preferred) && fallbackSurname) {
        preferred = `${preferred} ${fallbackSurname}`;
      }
      return preferred;
    }

    const composed = String([person?.FirstName || "", fallbackSurname].filter(Boolean).join(" ")).trim();
    return composed || person?.Name || `ID ${person?.Id || "unknown"}`;
  }

  function formatRelationPreviewLine(person) {
    const details = [];
    if (person?.BirthDate && person.BirthDate !== "0000-00-00") {
      details.push(`b. ${person.BirthDate}`);
    }
    if (person?.DeathDate && person.DeathDate !== "0000-00-00") {
      details.push(`d. ${person.DeathDate}`);
    }

    const detailSuffix = details.length ? ` - ${details.join(", ")}` : "";
    return `- ${toDisplayName(person)} (${person?.Name || person?.Id || "unknown"})${detailSuffix}`;
  }

  function toRelationTableRows(people = []) {
    return people.map((person) => ({
      displayName: toDisplayName(person),
      wtid: person?.Name || "",
      firstName: person?.FirstName || "",
      lnab: person?.LastNameAtBirth || "",
      lastNameCurrent: person?.LastNameCurrent || "",
      degrees: "",
      gender: person?.Gender || "",
      birth: person?.BirthDate && person.BirthDate !== "0000-00-00" ? person.BirthDate : "",
      death: person?.DeathDate && person.DeathDate !== "0000-00-00" ? person.DeathDate : "",
      birthLocation: person?.BirthLocation || "",
      deathLocation: person?.DeathLocation || "",
      surname: person?.LastNameAtBirth || person?.LastNameCurrent || "",
    }));
  }

  async function fetchParentIds(personKey) {
    try {
      const relatives = await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, personKey, "Id,Name,RealName", {
        getParents: 1,
      });
      const [peopleResult] = relatives || [];
      const profile = peopleResult?.person || {};
      const parentsObj = profile?.Parents || {};
      const parentNames = Object.values(parentsObj || [])
        .map((p) => p?.Name || (p?.Id ? String(p.Id) : null))
        .filter(Boolean);
      if (parentNames.length) return parentNames;
    } catch (error) {
      /* ignore getRelatives errors and fall back */
    }

    try {
      const person = await WikiTreeAPI.getPerson("Chat", personKey, "Id,Name,Father,Mother");
      const parents = [person?.Father, person?.Mother].filter((id) => Number(id) > 0);
      if (parents.length) return parents;
    } catch (error) {
      /* ignore */
    }

    try {
      const domParents = findParentProfileIdsFromDOM();
      if (domParents && domParents.length) {
        const numericIds = [];
        for (const wtid of domParents) {
          try {
            const [p] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, wtid, "Id,Name", { resolveRedirect: 1 });
            if (p && Number(p.Id) > 0) numericIds.push(Number(p.Id));
          } catch (error) {
            /* ignore individual failures */
          }
        }
        if (numericIds.length) return numericIds;
        return domParents;
      }
    } catch (error) {
      /* ignore DOM fallback errors */
    }

    return [];
  }

  async function fetchGrandparentIds(personKey) {
    const parentIds = await fetchParentIds(personKey);
    if (!parentIds.length) {
      return [];
    }

    const [, , parentPeople] = await fetchPeoplePaged("Chat", parentIds, "Id,Father,Mother", {});
    const grandparentIds = new Set();
    Object.values(parentPeople || {}).forEach((parent) => {
      if (Number(parent?.Father) > 0) {
        grandparentIds.add(Number(parent.Father));
      }
      if (Number(parent?.Mother) > 0) {
        grandparentIds.add(Number(parent.Mother));
      }
    });
    return Array.from(grandparentIds);
  }

  async function fetchAncestorIdsForGeneration(personKey, generation) {
    const targetGeneration = Number(generation);
    if (!personKey || !Number.isFinite(targetGeneration) || targetGeneration < 1) {
      return [];
    }

    try {
      const [, , peopleMap] = await fetchPeoplePaged(WBE_CHAT_APP_ID, personKey, "Id,Meta", {
        ancestors: targetGeneration,
        minGeneration: targetGeneration,
        limit: 64,
      });

      const ids = Object.values(peopleMap || {})
        .map((profile) => Number(profile?.Id))
        .filter((id) => Number.isFinite(id) && id > 0);
      return Array.from(new Set(ids));
    } catch (error) {
      return [];
    }
  }

  async function fetchSiblingsForIds(personIds = []) {
    const relatives = [];
    const uniqueIds = Array.from(new Set((personIds || []).map((id) => Number(id)).filter((id) => id > 0)));

    for (const id of uniqueIds) {
      const [entry] = await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, id, `${RELATION_PERSON_FIELDS},Siblings`, {
        getSiblings: 1,
      });

      const person = entry?.person;
      Object.values(person?.Siblings || {}).forEach((sibling) => {
        if (!sibling || Number(sibling.Id) === Number(person?.Id || id)) {
          return;
        }
        relatives.push(sibling);
      });
    }

    return relatives;
  }

  async function collectUserAncestorSiblingRelations(relationSpec, userKey = "") {
    const resolvedUserKey = userKey || getUserWtId() || getUserNumId();
    if (!resolvedUserKey) {
      return [];
    }

    if (relationSpec.group === "parentSiblings") {
      let parentIds = await fetchParentIds(resolvedUserKey);
      if (!parentIds.length) {
        parentIds = await fetchAncestorIdsForGeneration(resolvedUserKey, 1);
      }
      if (!parentIds.length) {
        return [];
      }
      return await fetchSiblingsForIds(parentIds);
    }

    if (relationSpec.group === "grandparentSiblings") {
      let grandparentIds = await fetchGrandparentIds(resolvedUserKey);
      if (!grandparentIds.length) {
        grandparentIds = await fetchAncestorIdsForGeneration(resolvedUserKey, 2);
      }
      if (!grandparentIds.length) {
        return [];
      }
      return await fetchSiblingsForIds(grandparentIds);
    }

    return [];
  }

  async function collectAncestorSiblingRelationsForPerson(personKey, relationSpec) {
    if (relationSpec.group === "parentSiblings") {
      const parentIds = await fetchParentIds(personKey);
      if (!parentIds.length) {
        return [];
      }
      return await fetchSiblingsForIds(parentIds);
    }

    if (relationSpec.group === "grandparentSiblings") {
      const grandparentIds = await fetchGrandparentIds(personKey);
      if (!grandparentIds.length) {
        return [];
      }
      return await fetchSiblingsForIds(grandparentIds);
    }

    return [];
  }

  async function collectRelationPeople(personKey, relationSpec) {
    if (relationSpec.group === "siblings") {
      const [entry] = await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, personKey, `${RELATION_PERSON_FIELDS},Siblings`, {
        getSiblings: 1,
      });
      const siblings = Object.values(entry?.person?.Siblings || {});
      if (siblings && siblings.length) return siblings;
      try {
        const domIds = await fetchSiblingIdsForId(personKey);
        if (domIds && domIds.length) {
          const profiles = await fetchProfilesForIds(domIds, RELATION_PERSON_FIELDS, { resolveRedirect: 1 });
          return profiles.filter(Boolean);
        }
      } catch (error) {
        /* ignore fallback errors */
      }
      return [];
    }

    if (relationSpec.group === "children") {
      const [entry] = await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, personKey, `${RELATION_PERSON_FIELDS},Children`, {
        getChildren: 1,
      });
      const children = Object.values(entry?.person?.Children || {});
      if (children && children.length) return children;
      try {
        const domIds = await fetchChildrenIdsForId(personKey);
        if (domIds && domIds.length) {
          const profiles = await fetchProfilesForIds(domIds, RELATION_PERSON_FIELDS, { resolveRedirect: 1 });
          return profiles.filter(Boolean);
        }
      } catch (error) {
        /* ignore fallback errors */
      }
      return [];
    }

    if (relationSpec.group === "spouses") {
      const [entry] = await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, personKey, `${RELATION_PERSON_FIELDS},Spouses`, {
        getSpouses: 1,
      });
      return Object.values(entry?.person?.Spouses || {});
    }

    if (relationSpec.group === "parents") {
      const parentIds = await fetchParentIds(personKey);
      if (!parentIds.length) {
        return [];
      }
      const [, , peopleMap] = await fetchPeoplePaged("Chat", parentIds, RELATION_PERSON_FIELDS, {});
      return Object.values(peopleMap || {});
    }

    if (relationSpec.group === "grandparents") {
      const grandparentIds = await fetchGrandparentIds(personKey);
      if (!grandparentIds.length) {
        return [];
      }
      const [, , peopleMap] = await fetchPeoplePaged("Chat", grandparentIds, RELATION_PERSON_FIELDS, {});
      return Object.values(peopleMap || {});
    }

    if (relationSpec.group === "parentSiblings" || relationSpec.group === "grandparentSiblings") {
      return await collectAncestorSiblingRelationsForPerson(personKey, relationSpec);
    }

    return [];
  }

  async function collectRelationChainPeople(subjectKey, relationSteps = []) {
    const steps = Array.isArray(relationSteps) ? relationSteps : [];
    if (!subjectKey || !steps.length) {
      return [];
    }

    let currentKeys = [subjectKey];
    let currentPeople = [];

    for (const step of steps) {
      const nextPeople = [];

      for (const key of currentKeys) {
        const relatives = await collectRelationPeople(key, step);
        const filtered = uniquePeopleById(relatives).filter((person) => relationMatchesGender(person, step.gender));
        nextPeople.push(...filtered);
      }

      currentPeople = uniquePeopleById(nextPeople);
      currentKeys = currentPeople
        .map((person) => person?.Name || person?.Id)
        .filter((key) => String(key || "").trim().length > 0);

      if (!currentKeys.length) {
        break;
      }
    }

    return currentPeople;
  }

  async function tryHandleRelationCountPrompt(params, prompt = "") {
    const relationRaw = String(params?.relationRaw || "").trim();
    if (!relationRaw) {
      return null;
    }
    const mode = params?.mode === "list" ? "list" : "count";
    const forceUserSubject = promptRefersToUser(prompt);

    const relationSteps = await resolveRelationChain(relationRaw);
    if (!relationSteps.length) {
      return `I couldn't match "${relationRaw}" to a supported relation type yet. Try siblings, parents, children, spouses, aunts, uncles, grandparents, granduncles, or grandaunts.`;
    }
    const relationSpec = relationSteps[relationSteps.length - 1];

    let subject = null;
    if (!forceUserSubject && params?.subjectMode === "named") {
      const subjectName = String(params?.subjectName || "").trim();
      if (!subjectName) {
        return "I couldn't tell which person you meant. Could you include a name or WikiTree ID?";
      }
      const resolved = await resolveConnectionTargetPerson(subjectName, prompt);
      if (!resolved?.Name && !resolved?.Id) {
        return `I couldn't identify which profile you meant by "${subjectName}". Try a WikiTree ID like Name-123, or a more specific name.`;
      }
      subject = {
        key: resolved.Id || resolved.Name,
        label: `${resolved.RealName || resolved?.Derived?.ShortName || resolved.Name} (${
          resolved.Name || resolved.Id
        })`,
        isUser: false,
      };
    } else {
      const directUserWtId = String(getUserWtId() || "").trim();
      const directUserNumId = getUserNumId();
      const directUserKey = directUserWtId || directUserNumId;

      if (!directUserKey) {
        return "I could not detect your logged-in WikiTree ID. Please make sure you are logged in on WikiTree.";
      }

      const me = await getLoggedInRootPerson();
      const userKeys = Array.from(
        new Set(
          [directUserNumId, directUserWtId, me?.key, me?.wtId, me?.Id, me?.Name]
            .map((value) => String(value || "").trim())
            .filter(Boolean)
        )
      );
      subject = {
        key: directUserKey,
        label: "you",
        isUser: true,
        wtId: directUserWtId || String(me?.wtId || ""),
        userKeys,
      };
    }

    try {
      let relatives = [];
      const isSingleStep = relationSteps.length === 1;

      if (subject.isUser && isSingleStep && ["parentSiblings", "grandparentSiblings"].includes(relationSpec.group)) {
        const candidateKeys =
          Array.isArray(subject.userKeys) && subject.userKeys.length ? subject.userKeys : [subject.key];
        for (const candidateKey of candidateKeys) {
          relatives = await collectUserAncestorSiblingRelations(relationSpec, candidateKey);
          if (relatives.length) {
            break;
          }
        }
      }

      if (!relatives.length && isSingleStep) {
        relatives = await collectRelationPeople(subject.key, relationSpec);
      }

      if (!relatives.length && !isSingleStep) {
        relatives = await collectRelationChainPeople(subject.key, relationSteps);
      }

      relatives = uniquePeopleById(relatives).filter((person) => relationMatchesGender(person, relationSpec.gender));

      const count = relatives.length;
      const noun = count === 1 ? relationSpec.singular : relationSpec.plural;
      if (!count) {
        const appsLoginHint =
          subject.isUser && isAppsLoginButtonPresent()
            ? " If you see the Apps Login button, click it and try again so Chat can use full app-server access."
            : "";

        if (mode === "list") {
          return subject.isUser
            ? `I couldn't find any ${noun} in currently accessible family data yet. Try asking about a specific person (for example: "Who are the granduncles of Name-123?").${appsLoginHint}`
            : `I couldn't find any ${noun} for ${subject.label} in currently accessible family data yet.${appsLoginHint}`;
        }
        return subject.isUser
          ? `I found 0 ${noun} in currently accessible family data.${appsLoginHint}`
          : `I found 0 ${noun} for ${subject.label} in currently accessible family data.${appsLoginHint}`;
      }

      if (mode === "list") {
        const wantsBio = /\bbio(?:s|graphy|graphies)?\b/i.test(prompt || relationRaw);
        const lines = relatives
          .slice(0, 20)
          .map((person) => formatRelationPreviewLine(person))
          .join("\n");
        const extra = relatives.length > 20 ? `\n...and ${relatives.length - 20} more.` : "";
        if (wantsBio) {
          const entries = relatives.map((person) => ({
            wtid: person?.Name || person?.Id || "",
            displayName: toDisplayName(person),
          }));
          showBioListPopup(
            subject.isUser ? `Your ${noun} bios` : `${noun} bios for ${subject.label}`,
            entries.slice(0, 50),
            handleOpenFromBioList
          );
          return {
            message: subject.isUser ? `Opened bios for your ${noun}.` : `Opened bios for ${noun} of ${subject.label}.`,
          };
        }

        return {
          message: subject.isUser
            ? `Here are your ${noun} (${count} found):\n${lines}${extra}`
            : `Here are ${noun} for ${subject.label} (${count} found):\n${lines}${extra}`,
          table: makeStandardProfileTable(
            subject.isUser ? `Your ${noun}` : `${noun} for ${subject.label}`,
            toRelationTableRows(relatives),
            [[1, "asc"]]
          ),
        };
      }

      const sample = relatives
        .slice(0, 6)
        .map((person) => toDisplayName(person))
        .join(", ");
      const suffix = count > 6 ? ", ..." : "";
      return {
        message: subject.isUser
          ? `You have ${count} ${noun} in currently accessible data. ${sample}${suffix}`
          : `${subject.label} has ${count} ${noun} in currently accessible data. ${sample}${suffix}`,
        table: makeStandardProfileTable(
          subject.isUser ? `Your ${noun}` : `${noun} for ${subject.label}`,
          toRelationTableRows(relatives),
          [[1, "asc"]]
        ),
      };
    } catch (error) {
      return `I could not calculate ${relationSpec.plural}. Error: ${error?.message || "unknown error"}`;
    }
  }

  return {
    tryHandleRelationCountPrompt,
  };
}
