import {
  DEFAULT_ALL_COUSIN_ANCESTOR_GENERATION,
  MAX_COUSIN_ANCESTOR_GENERATION,
  MAX_SUPPORTED_COUSIN_DEGREE,
  formatCousinLabel,
  formatCousinRelationshipLabel,
  parseCousinRelationRequest,
  selectPeopleAtMinimalSharedGeneration,
} from "./chat_cousin_helpers";

const MAX_COUSIN_REMOVED = 3;

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
  getProfileSubjectRoot,
  makeStandardProfileTable,
  makeCousinProfileTable = makeStandardProfileTable,
  showBioListPopup,
  handleOpenFromBioList,
  fetchPeoplePaged,
  fetchProfilesForIds,
  fetchChildrenIdsForId,
  fetchSiblingIdsForId,
  fetchParentIds,
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

  function getPrivateLongName(person) {
    return String(
      person?.LongNamePrivate ||
        person?.Derived?.LongNamePrivate ||
        person?.BirthNamePrivate ||
        person?.Derived?.BirthNamePrivate ||
        ""
    ).trim();
  }

  function isPrivatePlaceholder(person) {
    return Number(person?.Id) < 0 && !String(person?.Name || "").trim();
  }

  function getRelationFirstName(person) {
    const firstName = String(person?.FirstName || "").trim();
    if (firstName) {
      return firstName;
    }

    const realName = String(person?.RealName || person?.Derived?.ShortName || "").trim();
    if (realName) {
      return realName;
    }

    const privateLongName = getPrivateLongName(person);
    if (privateLongName) {
      return privateLongName;
    }

    return isPrivatePlaceholder(person) ? "Private" : "";
  }

  function toDisplayName(person) {
    const fallbackSurname = String(person?.LastNameCurrent || person?.LastNameAtBirth || "").trim();
    let preferred = String(person?.RealName || person?.Derived?.ShortName || getPrivateLongName(person) || "").trim();
    if (preferred) {
      if (!/\s/.test(preferred) && fallbackSurname) {
        preferred = `${preferred} ${fallbackSurname}`;
      }
      return preferred;
    }

    if (isPrivatePlaceholder(person)) {
      return "Private";
    }

    const composed = String([person?.FirstName || "", fallbackSurname].filter(Boolean).join(" ")).trim();
    return composed || person?.Name || `ID ${person?.Id || "unknown"}`;
  }

  function formatRelationPreviewLine(person) {
    const details = [];
    if (Number.isFinite(Number(person?.removed))) {
      details.push(`${Number(person.removed)} removed`);
    }
    if (person?.BirthDate && person.BirthDate !== "0000-00-00") {
      details.push(`b. ${person.BirthDate}`);
    }
    if (person?.DeathDate && person.DeathDate !== "0000-00-00") {
      details.push(`d. ${person.DeathDate}`);
    }

    const detailSuffix = details.length ? ` - ${details.join(", ")}` : "";
    return `- ${toDisplayName(person)} (${person?.Name || person?.Id || "unknown"})${detailSuffix}`;
  }

  function compareRelationText(left, right) {
    return normalizeText(left).localeCompare(normalizeText(right), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  function sortCousinsForDisplay(people = []) {
    return people.slice().sort((left, right) => {
      const leftDegree = getCousinDegree(left);
      const rightDegree = getCousinDegree(right);
      const normalizedLeftDegree = Number.isFinite(leftDegree) ? leftDegree : Number.MAX_SAFE_INTEGER;
      const normalizedRightDegree = Number.isFinite(rightDegree) ? rightDegree : Number.MAX_SAFE_INTEGER;
      if (normalizedLeftDegree !== normalizedRightDegree) {
        return normalizedLeftDegree - normalizedRightDegree;
      }

      const leftRemoved = Number.isFinite(Number(left?.removed)) ? Number(left.removed) : Number.MAX_SAFE_INTEGER;
      const rightRemoved = Number.isFinite(Number(right?.removed)) ? Number(right.removed) : Number.MAX_SAFE_INTEGER;
      if (leftRemoved !== rightRemoved) {
        return leftRemoved - rightRemoved;
      }

      const surnameDelta = compareRelationText(
        left?.LastNameAtBirth || left?.LastNameCurrent,
        right?.LastNameAtBirth || right?.LastNameCurrent
      );
      if (surnameDelta !== 0) {
        return surnameDelta;
      }

      const firstNameDelta = compareRelationText(
        getRelationFirstName(left) || toDisplayName(left),
        getRelationFirstName(right) || toDisplayName(right)
      );
      if (firstNameDelta !== 0) {
        return firstNameDelta;
      }

      const displayNameDelta = compareRelationText(toDisplayName(left), toDisplayName(right));
      if (displayNameDelta !== 0) {
        return displayNameDelta;
      }

      return compareRelationText(left?.Name || left?.Id || "", right?.Name || right?.Id || "");
    });
  }

  function formatCousinPreviewLine(person) {
    const details = [];
    if (person?.BirthDate && person.BirthDate !== "0000-00-00") {
      details.push(`b. ${person.BirthDate}`);
    }
    if (person?.DeathDate && person.DeathDate !== "0000-00-00") {
      details.push(`d. ${person.DeathDate}`);
    }

    const cousinOrdinal = formatCousinOrdinal(getCousinDegree(person));
    const removedValue = Number(person?.removed);
    const removedLabel = Number.isFinite(removedValue) ? `${removedValue} removed` : null;
    const relationLabel = [cousinOrdinal ? `${cousinOrdinal} cousin` : "cousin", removedLabel]
      .filter(Boolean)
      .join(", ");
    const detailSuffix = details.length ? ` - ${details.join(", ")}` : "";

    return `- ${relationLabel}: ${toDisplayName(person)} (${person?.Name || person?.Id || "unknown"})${detailSuffix}`;
  }

  function buildRelationPreviewAndInlineMore(people, previewLimit = 20) {
    const previewPeople = people.slice(0, previewLimit);
    const remainingPeople = people.slice(previewLimit);
    return {
      preview: previewPeople.map((person) => formatRelationPreviewLine(person)).join("\n"),
      inlineMore: remainingPeople.length
        ? {
            count: remainingPeople.length,
            text: remainingPeople.map((person) => formatRelationPreviewLine(person)).join("\n"),
          }
        : null,
    };
  }

  function buildCousinPreviewAndInlineMore(people, previewLimit = 20) {
    const previewPeople = people.slice(0, previewLimit);
    const remainingPeople = people.slice(previewLimit);
    return {
      preview: previewPeople.map((person) => formatCousinPreviewLine(person)).join("\n"),
      inlineMore: remainingPeople.length
        ? {
            count: remainingPeople.length,
            text: remainingPeople.map((person) => formatCousinPreviewLine(person)).join("\n"),
          }
        : null,
    };
  }

  function getCousinDegree(person) {
    const directDegree = Number(person?.cousinDegree);
    if (Number.isFinite(directDegree) && directDegree >= 1) {
      return directDegree;
    }

    const descendantGeneration = Number(person?.Meta?.Degrees);
    const removed = Number(person?.removed);
    if (!Number.isFinite(descendantGeneration) || descendantGeneration < 2) {
      return null;
    }

    const safeRemoved = Number.isFinite(removed) && removed >= 0 ? removed : 0;
    const derivedDegree = descendantGeneration - safeRemoved - 1;
    return Number.isFinite(derivedDegree) && derivedDegree >= 1 ? derivedDegree : null;
  }

  function formatCousinOrdinal(degree) {
    const numericDegree = Number(degree);
    if (!Number.isFinite(numericDegree) || numericDegree < 1) {
      return "";
    }

    return formatCousinLabel(numericDegree, false).replace(/\s+cousin$/i, "");
  }

  function toRelationTableRows(people = [], options = {}) {
    const includeCousinOrdinal = !!options.includeCousinOrdinal;
    return people.map((person) => ({
      displayName: toDisplayName(person),
      wtid: person?.Name || "",
      firstName: getRelationFirstName(person),
      lnab: person?.LastNameAtBirth || "",
      lastNameCurrent: person?.LastNameCurrent || "",
      ...(includeCousinOrdinal ? { cousinOrdinal: formatCousinOrdinal(getCousinDegree(person)) } : {}),
      degrees: "",
      removed: person?.removed ?? "",
      gender: person?.Gender || "",
      birth: person?.BirthDate && person.BirthDate !== "0000-00-00" ? person.BirthDate : "",
      death: person?.DeathDate && person.DeathDate !== "0000-00-00" ? person.DeathDate : "",
      birthLocation: person?.BirthLocation || "",
      deathLocation: person?.DeathLocation || "",
      surname: person?.LastNameAtBirth || person?.LastNameCurrent || "",
    }));
  }

  function getLocationFieldLabel(locationField = "AnyLocation") {
    if (locationField === "BirthLocation") {
      return "birth location";
    }
    if (locationField === "DeathLocation") {
      return "death location";
    }
    return "birth or death location";
  }

  function filterPeopleByLocation(people = [], location = "", locationField = "AnyLocation") {
    const normalizedLocation = normalizeText(location);
    if (!normalizedLocation) {
      return uniquePeopleById(people);
    }

    return uniquePeopleById(people).filter((person) => {
      const birthLocation = normalizeText(person?.BirthLocation || "");
      const deathLocation = normalizeText(person?.DeathLocation || "");
      if (locationField === "BirthLocation") {
        return birthLocation.includes(normalizedLocation);
      }
      if (locationField === "DeathLocation") {
        return deathLocation.includes(normalizedLocation);
      }
      return birthLocation.includes(normalizedLocation) || deathLocation.includes(normalizedLocation);
    });
  }

  function getCousinExcludedKeys(subject) {
    return Array.isArray(subject?.userKeys) && subject.userKeys.length
      ? subject.userKeys
      : [subject?.key, subject?.wtId];
  }

  async function collectCousinGenerationBuckets(
    subject,
    maxAncestorGeneration = MAX_COUSIN_ANCESTOR_GENERATION,
    maxRemoved = MAX_COUSIN_REMOVED
  ) {
    const maxGeneration = Number(maxAncestorGeneration);
    if (!Number.isFinite(maxGeneration) || maxGeneration < 2) {
      return [];
    }
    const parsedMaxRemoved = Number(maxRemoved);
    const safeMaxRemoved = Number.isFinite(parsedMaxRemoved) && parsedMaxRemoved >= 0 ? parsedMaxRemoved : 0;

    const subjectKey = subject?.key;
    if (!subjectKey) {
      return [];
    }

    const [, , ancestorPeopleMap] = await fetchPeoplePaged(WBE_CHAT_APP_ID, subjectKey, "Id,Name,Meta", {
      ancestors: maxGeneration,
      minGeneration: 1,
      limit: 1000,
    });

    const ancestorsByGeneration = new Map();
    Object.values(ancestorPeopleMap || {}).forEach((profile) => {
      const generation = Number(profile?.Meta?.Degrees);
      const ancestorId = Number(profile?.Id);
      if (!Number.isFinite(generation) || generation < 2 || generation > maxGeneration) {
        return;
      }
      if (!Number.isFinite(ancestorId) || ancestorId <= 0) {
        return;
      }
      const bucket = ancestorsByGeneration.get(generation) || [];
      bucket.push(ancestorId);
      ancestorsByGeneration.set(generation, bucket);
    });

    const generationBuckets = [];
    for (let generation = 2; generation <= maxGeneration; generation += 1) {
      const ancestorIds = Array.from(new Set(ancestorsByGeneration.get(generation) || [])).filter((id) => id > 0);
      if (!ancestorIds.length) {
        continue;
      }

      const [, , descendantPeopleMap] = await fetchPeoplePaged(
        WBE_CHAT_APP_ID,
        ancestorIds,
        `${RELATION_PERSON_FIELDS},Meta`,
        {
          descendants: Math.min(MAX_COUSIN_ANCESTOR_GENERATION, generation + safeMaxRemoved),
          minGeneration: generation,
          limit: 100,
        }
      );

      generationBuckets.push({
        generation,
        people: Object.values(descendantPeopleMap || {}),
      });
    }

    return generationBuckets;
  }

  async function collectNthCousins(subject, cousinDegree, maxRemoved = MAX_COUSIN_REMOVED) {
    const degree = Number(cousinDegree);
    if (!Number.isFinite(degree) || degree < 1) {
      return [];
    }

    const parsedMaxRemoved = Number(maxRemoved);
    const safeMaxRemoved = Number.isFinite(parsedMaxRemoved) && parsedMaxRemoved >= 0 ? parsedMaxRemoved : 0;

    const sharedAncestorGeneration = degree + 1;
    if (sharedAncestorGeneration > MAX_COUSIN_ANCESTOR_GENERATION) {
      throw new Error(
        "getPeople currently supports cousin degrees up to 9 generations through ancestor/descendant expansion"
      );
    }

    const generationBuckets = await collectCousinGenerationBuckets(subject, sharedAncestorGeneration, safeMaxRemoved);
    const excludedKeys = getCousinExcludedKeys(subject);

    return uniquePeopleById(
      selectPeopleAtMinimalSharedGeneration(generationBuckets, sharedAncestorGeneration, excludedKeys, safeMaxRemoved)
    );
  }

  async function collectExactNthCousins(subject, cousinDegree, removedCount) {
    const degree = Number(cousinDegree);
    const removed = Number(removedCount);
    if (!Number.isFinite(degree) || degree < 1 || !Number.isFinite(removed) || removed < 0) {
      return [];
    }

    const sharedAncestorGeneration = degree + 1;
    const maxSubjectAncestorGeneration = sharedAncestorGeneration + removed;
    if (maxSubjectAncestorGeneration > MAX_COUSIN_ANCESTOR_GENERATION) {
      throw new Error(
        "getPeople currently supports cousin relationships up to 9 generations through ancestor/descendant expansion"
      );
    }

    const subjectKey = subject?.key;
    if (!subjectKey) {
      return [];
    }

    const [, , ancestorPeopleMap] = await fetchPeoplePaged(WBE_CHAT_APP_ID, subjectKey, "Id,Name,Meta", {
      ancestors: maxSubjectAncestorGeneration,
      minGeneration: 1,
      limit: 1000,
    });

    const ancestorsByGeneration = new Map();
    Object.values(ancestorPeopleMap || {}).forEach((profile) => {
      const generation = Number(profile?.Meta?.Degrees);
      const ancestorId = Number(profile?.Id);
      if (
        !Number.isFinite(generation) ||
        generation < sharedAncestorGeneration ||
        generation > maxSubjectAncestorGeneration
      ) {
        return;
      }
      if (!Number.isFinite(ancestorId) || ancestorId <= 0) {
        return;
      }
      const bucket = ancestorsByGeneration.get(generation) || [];
      bucket.push(ancestorId);
      ancestorsByGeneration.set(generation, bucket);
    });

    const excludedKeys = new Set(
      getCousinExcludedKeys(subject)
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    );
    const bestByKey = new Map();
    const searchPlans = [
      {
        ancestorGeneration: sharedAncestorGeneration,
        descendantGeneration: sharedAncestorGeneration + removed,
      },
    ];

    if (removed > 0) {
      searchPlans.push({
        ancestorGeneration: sharedAncestorGeneration + removed,
        descendantGeneration: sharedAncestorGeneration,
      });
    }

    for (const plan of searchPlans) {
      const ancestorIds = Array.from(new Set(ancestorsByGeneration.get(plan.ancestorGeneration) || [])).filter(
        (id) => id > 0
      );
      if (!ancestorIds.length) {
        continue;
      }

      const [, , descendantPeopleMap] = await fetchPeoplePaged(
        WBE_CHAT_APP_ID,
        ancestorIds,
        `${RELATION_PERSON_FIELDS},Meta`,
        {
          descendants: plan.descendantGeneration,
          minGeneration: plan.descendantGeneration,
          limit: 100,
        }
      );

      Object.values(descendantPeopleMap || {}).forEach((person) => {
        const key = String(person?.Name || person?.Id || "").trim();
        if (!key || excludedKeys.has(key)) {
          return;
        }

        const descendantGeneration = Number(person?.Meta?.Degrees);
        if (!Number.isFinite(descendantGeneration) || descendantGeneration !== plan.descendantGeneration) {
          return;
        }

        const candidateDegree = Math.min(plan.ancestorGeneration, descendantGeneration) - 1;
        const candidateRemoved = Math.abs(plan.ancestorGeneration - descendantGeneration);
        if (candidateDegree !== degree || candidateRemoved !== removed) {
          return;
        }

        const previous = bestByKey.get(key);
        if (!previous || plan.ancestorGeneration < previous.ancestorGeneration) {
          bestByKey.set(key, {
            ancestorGeneration: plan.ancestorGeneration,
            person: {
              ...person,
              cousinDegree: degree,
              removed: candidateRemoved,
            },
          });
        }
      });
    }

    return Array.from(bestByKey.values()).map((entry) => entry.person);
  }

  async function collectAllCousins(subject, maxAncestorGeneration = DEFAULT_ALL_COUSIN_ANCESTOR_GENERATION) {
    const requestedGeneration = Number(maxAncestorGeneration);
    const safeAncestorGeneration =
      Number.isFinite(requestedGeneration) && requestedGeneration >= 2
        ? Math.min(requestedGeneration, MAX_COUSIN_ANCESTOR_GENERATION)
        : DEFAULT_ALL_COUSIN_ANCESTOR_GENERATION;
    const generationBuckets = await collectCousinGenerationBuckets(subject, maxAncestorGeneration);
    const excludedKeys = getCousinExcludedKeys(subject);
    const cousins = [];

    for (
      let sharedAncestorGeneration = 2;
      sharedAncestorGeneration <= safeAncestorGeneration;
      sharedAncestorGeneration += 1
    ) {
      cousins.push(
        ...selectPeopleAtMinimalSharedGeneration(
          generationBuckets,
          sharedAncestorGeneration,
          excludedKeys,
          MAX_COUSIN_REMOVED
        )
      );
    }

    return uniquePeopleById(cousins);
  }

  async function tryHandleCousinPrompt(params, prompt = "", mode = "list", forceUserSubject = false) {
    const wantsAllCousins = !!params?.allCousins;
    const cousinDegree = Number(params?.cousinDegree);
    if (!wantsAllCousins && (!Number.isFinite(cousinDegree) || cousinDegree < 1)) {
      return null;
    }
    const requestedRemoved = Number(params?.removed);
    const hasExactRemoved = !wantsAllCousins && Number.isFinite(requestedRemoved) && requestedRemoved >= 1;

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
        userKeys: Array.from(
          new Set([resolved.Id, resolved.Name].map((value) => String(value || "").trim()).filter(Boolean))
        ),
      };
    } else {
      const profileRoot =
        !forceUserSubject && typeof getProfileSubjectRoot === "function" ? getProfileSubjectRoot() : null;
      if (profileRoot?.key) {
        subject = {
          key: profileRoot.key,
          label: `${profileRoot.displayName || profileRoot.wtId || profileRoot.key}${
            profileRoot.wtId ? ` (${profileRoot.wtId})` : ""
          }`,
          isUser: false,
          wtId: String(profileRoot.wtId || ""),
          userKeys: Array.from(
            new Set([profileRoot.key, profileRoot.wtId].map((value) => String(value || "").trim()).filter(Boolean))
          ),
          subjectType: "profile",
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
    }

    const maxAncestorGeneration = wantsAllCousins
      ? Math.min(
          Number.isFinite(Number(params?.maxAncestorGeneration))
            ? Number(params.maxAncestorGeneration)
            : DEFAULT_ALL_COUSIN_ANCESTOR_GENERATION,
          MAX_COUSIN_ANCESTOR_GENERATION
        )
      : null;
    const maxCousinDegree = wantsAllCousins ? Math.max(1, maxAncestorGeneration - 1) : null;
    const relationLabel = wantsAllCousins
      ? "cousins"
      : hasExactRemoved
      ? formatCousinRelationshipLabel(cousinDegree, requestedRemoved, true)
      : formatCousinLabel(cousinDegree, true);
    const resultLabel = wantsAllCousins
      ? `cousins (through ${formatCousinLabel(maxCousinDegree, true)} and up to ${MAX_COUSIN_REMOVED} removed)`
      : hasExactRemoved
      ? relationLabel
      : `${relationLabel} (and up to ${MAX_COUSIN_REMOVED} removed)`;
    const location = String(params?.location || "").trim();
    const locationField = String(params?.locationField || "").trim() || "AnyLocation";
    const locationPhrase = location
      ? locationField === "BirthLocation"
        ? `born in ${location}`
        : locationField === "DeathLocation"
        ? `died in ${location}`
        : `in ${location}`
      : "";

    try {
      const allCousins = wantsAllCousins
        ? await collectAllCousins(subject, maxAncestorGeneration)
        : hasExactRemoved
        ? await collectExactNthCousins(subject, cousinDegree, requestedRemoved)
        : await collectNthCousins(subject, cousinDegree, MAX_COUSIN_REMOVED);
      const removedMatchedCousins = hasExactRemoved
        ? allCousins.filter((person) => Number(person?.removed) === requestedRemoved)
        : allCousins;
      const cousins = sortCousinsForDisplay(filterPeopleByLocation(removedMatchedCousins, location, locationField));
      const cousinRows = toRelationTableRows(cousins, { includeCousinOrdinal: true });

      if (!cousins.length) {
        const appsLoginHint =
          subject.isUser && isAppsLoginButtonPresent()
            ? " If you see the Apps Login button, click it and try again so Chat can use full app-server access."
            : "";
        if (location && removedMatchedCousins.length) {
          const missingLocationCount = removedMatchedCousins.filter((person) => {
            const birth = normalizeText(person?.BirthLocation || "");
            const death = normalizeText(person?.DeathLocation || "");
            if (locationField === "BirthLocation") {
              return !birth;
            }
            if (locationField === "DeathLocation") {
              return !death;
            }
            return !birth && !death;
          }).length;
          return `I searched ${removedMatchedCousins.length} ${resultLabel} for ${
            subject.label
          }, but none matched ${locationPhrase}. ${missingLocationCount} had no ${getLocationFieldLabel(
            locationField
          )} in accessible API data.${appsLoginHint}`;
        }
        return subject.isUser
          ? `I couldn't find any ${resultLabel} in currently accessible family data yet.${appsLoginHint}`
          : `I couldn't find any ${resultLabel} for ${subject.label} in currently accessible family data yet.${appsLoginHint}`;
      }

      if (mode === "count") {
        const sample = cousins
          .slice(0, 6)
          .map((person) => toDisplayName(person))
          .join(", ");
        const suffix = cousins.length > 6 ? ", ..." : "";
        return {
          message: subject.isUser
            ? `You have ${cousins.length} ${resultLabel}${
                locationPhrase ? ` ${locationPhrase}` : ""
              } in currently accessible data. ${sample}${suffix}`
            : `${subject.label} has ${cousins.length} ${resultLabel}${
                locationPhrase ? ` ${locationPhrase}` : ""
              } in currently accessible data. ${sample}${suffix}`,
          table: makeCousinProfileTable(
            subject.isUser ? `Your ${resultLabel}` : `${resultLabel} for ${subject.label}`,
            cousinRows
          ),
        };
      }

      const { preview, inlineMore } = buildCousinPreviewAndInlineMore(cousins);

      return {
        message: subject.isUser
          ? `Here are your ${resultLabel}${locationPhrase ? ` ${locationPhrase}` : ""} (${
              cousins.length
            } found):\n${preview}`
          : `Here are ${resultLabel}${locationPhrase ? ` ${locationPhrase}` : ""} for ${subject.label} (${
              cousins.length
            } found):\n${preview}`,
        inlineMore,
        table: makeCousinProfileTable(
          subject.isUser ? `Your ${resultLabel}` : `${resultLabel} for ${subject.label}`,
          cousinRows
        ),
      };
    } catch (error) {
      return `I could not calculate ${relationLabel}. Error: ${error?.message || "unknown error"}`;
    }
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

    const parsedCousin =
      Number.isFinite(Number(params?.cousinDegree)) || params?.allCousins
        ? {
            ...(Number.isFinite(Number(params?.cousinDegree)) ? { cousinDegree: Number(params.cousinDegree) } : {}),
            ...(Number.isFinite(Number(params?.removed)) ? { removed: Number(params.removed) } : {}),
            ...(params?.allCousins
              ? {
                  allCousins: true,
                  maxAncestorGeneration: Number(params?.maxAncestorGeneration),
                }
              : {}),
            relationLabel: relationRaw,
            location: String(params?.location || "").trim(),
            locationField: String(params?.locationField || "").trim(),
          }
        : parseCousinRelationRequest(relationRaw);
    if (parsedCousin?.cousinDegree || parsedCousin?.allCousins) {
      return await tryHandleCousinPrompt(
        {
          ...params,
          cousinDegree: parsedCousin.cousinDegree,
          ...(Number.isFinite(Number(parsedCousin.removed)) ? { removed: Number(parsedCousin.removed) } : {}),
          ...(parsedCousin.allCousins
            ? {
                allCousins: true,
                maxAncestorGeneration: parsedCousin.maxAncestorGeneration,
              }
            : {}),
          relationRaw: parsedCousin.relationLabel || relationRaw,
          location: parsedCousin.location || params?.location || "",
          locationField: parsedCousin.locationField || params?.locationField || "",
        },
        prompt,
        mode,
        forceUserSubject
      );
    }

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
      const profileRoot =
        !forceUserSubject && typeof getProfileSubjectRoot === "function" ? getProfileSubjectRoot() : null;
      if (profileRoot?.key) {
        subject = {
          key: profileRoot.key,
          label: `${profileRoot.displayName || profileRoot.wtId || profileRoot.key}${
            profileRoot.wtId ? ` (${profileRoot.wtId})` : ""
          }`,
          isUser: false,
          wtId: String(profileRoot.wtId || ""),
          userKeys: Array.from(
            new Set([profileRoot.key, profileRoot.wtId].map((value) => String(value || "").trim()).filter(Boolean))
          ),
          subjectType: "profile",
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
        const { preview, inlineMore } = buildRelationPreviewAndInlineMore(relatives);
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
            ? `Here are your ${noun} (${count} found):\n${preview}`
            : `Here are ${noun} for ${subject.label} (${count} found):\n${preview}`,
          inlineMore,
          table: makeStandardProfileTable(
            subject.isUser ? `Your ${noun}` : `${noun} for ${subject.label}`,
            toRelationTableRows(relatives),
            [[0, "asc"]]
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
          [[0, "asc"]]
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
