import { buildTreeAppRecommendations } from "./chat_tree_apps";

export function createChatPeopleHandlers({
  ChatIntent,
  WBE_CHAT_APP_ID,
  resolveConnectionTargetPerson,
  getLoggedInRootPerson,
  getProfileSubjectRoot,
  getProfileRootPerson,
  promptRefersToUser,
  formatSubjectLabel,
  buildDisambiguationMessage,
  setPendingDisambiguationContext,
  fetchPeoplePaged,
  mapApiPersonToStandardRow,
  makeStandardProfileTable,
  makeAncestorProfileTable,
  makeAncestorAgeTable,
  withDerivedRowFields,
  normalizeText,
  normalizeNumberForSort,
  normalizeSurname,
  computeAgeAtDeathYears,
  isPartialDate,
  getCc7ProfilesForUser,
  getLastStructuredResult,
  getCurrentChatMode,
}) {
  function filterCachedKinRows({
    intent,
    rootKey,
    generation,
    includeUpTo,
    locationField = "AnyLocation",
    normalizedLocation = "",
    dateField = "",
    dateDirection = "",
    dateValue = "",
  }) {
    const lastStructuredResult = getLastStructuredResult();
    if (!lastStructuredResult?.rows?.length) {
      return null;
    }

    const meta = lastStructuredResult._chatMeta;
    if (!meta || meta.intent !== intent) {
      return null;
    }

    const currentMode = String(getCurrentChatMode?.() || "wt")
      .trim()
      .toLowerCase();
    const cachedMode = String(meta.mode || "")
      .trim()
      .toLowerCase();
    if (cachedMode && cachedMode !== currentMode) {
      return null;
    }

    if (String(meta.rootKey || "") !== String(rootKey || "")) {
      return null;
    }

    const cachedGeneration = Number(meta.generation);
    if (!Number.isFinite(cachedGeneration) || cachedGeneration < generation) {
      return null;
    }

    const cachedIncludeUpTo = Boolean(meta.includeUpTo);
    if (includeUpTo && !cachedIncludeUpTo) {
      return null;
    }

    if (normalizeText(meta.location || "")) {
      return null;
    }

    const cachedDateField = String(meta.dateField || "").trim();
    const cachedDateDirection = String(meta.dateDirection || "")
      .trim()
      .toLowerCase();
    const cachedDateValue = String(meta.dateValue || "").trim();
    const requestedDateField = String(dateField || "").trim();
    const requestedDateDirection = String(dateDirection || "")
      .trim()
      .toLowerCase();
    const requestedDateValue = String(dateValue || "").trim();
    if (cachedDateField || cachedDateDirection || cachedDateValue) {
      if (
        cachedDateField !== requestedDateField ||
        cachedDateDirection !== requestedDateDirection ||
        cachedDateValue !== requestedDateValue
      ) {
        return null;
      }
    }

    const totalCandidates = lastStructuredResult.rows.filter((row) => {
      const degree = Number(row?.degrees);
      if (!Number.isFinite(degree)) {
        return true;
      }
      if (includeUpTo) {
        return degree >= 1 && degree <= generation;
      }
      return degree === generation;
    });

    const filteredRows = totalCandidates.filter((row) => {
      if (!normalizedLocation) {
        return true;
      }

      const birthLocation = normalizeText(row?.birthLocation);
      const deathLocation = normalizeText(row?.deathLocation);
      if (locationField === "BirthLocation") {
        return birthLocation.includes(normalizedLocation);
      }
      if (locationField === "DeathLocation") {
        return deathLocation.includes(normalizedLocation);
      }
      return birthLocation.includes(normalizedLocation) || deathLocation.includes(normalizedLocation);
    });

    return {
      rows: filteredRows.map((row) => withDerivedRowFields(row)),
      totalCandidates: totalCandidates.length,
      missingLocationCount: normalizedLocation
        ? totalCandidates.filter((row) => {
            const hasBirth = !!normalizeText(row?.birthLocation);
            const hasDeath = !!normalizeText(row?.deathLocation);
            if (locationField === "BirthLocation") {
              return !hasBirth;
            }
            if (locationField === "DeathLocation") {
              return !hasDeath;
            }
            return !hasBirth && !hasDeath;
          }).length
        : 0,
    };
  }

  function sortKinRows(rows, includeUpTo) {
    return rows.slice().sort((left, right) => {
      if (includeUpTo) {
        const degreeDelta = normalizeNumberForSort(left.degrees) - normalizeNumberForSort(right.degrees);
        if (degreeDelta !== 0) {
          return degreeDelta;
        }
      }
      return normalizeText(left.displayName).localeCompare(normalizeText(right.displayName));
    });
  }

  function buildPersonPreviewLine(person) {
    return `- ${person.displayName} (${person.wtid})${person.birth ? ` [b. ${person.birth}]` : ""}${
      person.death ? ` [d. ${person.death}]` : ""
    }`;
  }

  function buildPeoplePreviewAndInlineMore(rows, previewLimit = 12) {
    const previewRows = rows.slice(0, previewLimit);
    const remainingRows = rows.slice(previewLimit);
    return {
      preview: previewRows.map((person) => buildPersonPreviewLine(person)).join("\n"),
      inlineMore: remainingRows.length
        ? {
            count: remainingRows.length,
            text: remainingRows.map((person) => buildPersonPreviewLine(person)).join("\n"),
          }
        : null,
    };
  }

  function buildKinListResult({
    rows,
    displayRelationshipLabel,
    subjectLabel,
    rootDisplayName,
    rootWtId,
    includeUpTo,
    tableFactory,
    treeAppKind,
    chatMeta,
  }) {
    const enrichedChatMeta = chatMeta
      ? {
          ...chatMeta,
          mode: String(chatMeta.mode || getCurrentChatMode?.() || "wt")
            .trim()
            .toLowerCase(),
        }
      : null;
    const { preview, inlineMore } = buildPeoplePreviewAndInlineMore(rows);
    const makeTable = typeof tableFactory === "function" ? tableFactory : makeStandardProfileTable;
    const hasDegreeValues = rows.some(
      (row) => row?.degrees !== "" && row?.degrees !== undefined && row?.degrees !== null
    );
    const defaultOrder =
      makeTable === makeAncestorProfileTable
        ? [[0, "asc"]]
        : hasDegreeValues
        ? [
            [6, "asc"],
            [0, "asc"],
          ]
        : [[0, "asc"]];
    const table = makeTable(`${displayRelationshipLabel} for ${rootDisplayName}`, rows, defaultOrder);
    const treeAppActions = buildTreeAppRecommendations(treeAppKind, rootWtId).map((recommendation) => ({
      label: recommendation.label,
      actionType: "external-link",
      url: recommendation.url,
      onClick: () => {
        window.open(recommendation.url, "_blank", "noopener,noreferrer");
      },
    }));
    const recommendationSuffix = treeAppActions.length ? "\nRecommended Tree Apps are available below." : "";

    if (enrichedChatMeta) {
      table._chatMeta = enrichedChatMeta;
    }

    return {
      message: `Here are ${displayRelationshipLabel} for ${subjectLabel} (${rows.length} found):\n${preview}`,
      inlineMore,
      trailingText: recommendationSuffix.trim(),
      table,
      actions: treeAppActions,
    };
  }

  function getLocationFieldLabel(locationField) {
    if (locationField === "BirthLocation") {
      return "birth location";
    }
    if (locationField === "DeathLocation") {
      return "death location";
    }
    return "birth or death location";
  }

  function getDateConstraintLabel(dateField = "", dateDirection = "", dateValue = "") {
    const value = String(dateValue || "").trim();
    if (!value) {
      return "";
    }

    const verb = dateField === "DeathDate" ? "died" : "born";
    const direction = String(dateDirection || "")
      .trim()
      .toLowerCase();
    if (direction === "before" || direction === "after") {
      return `${verb} ${direction} ${value}`;
    }

    return "";
  }

  function expandComparableDateRange(value) {
    const text = String(value || "").trim();
    if (!text || text === "0000-00-00" || text === "unknown") {
      return null;
    }

    const decadeMatch = text.match(/^(\d{4})s$/);
    if (decadeMatch) {
      const decade = Number(decadeMatch[1]);
      return {
        start: `${decade}-01-01`,
        end: `${decade + 9}-12-31`,
      };
    }

    const dayMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dayMatch) {
      const year = dayMatch[1];
      const month = dayMatch[2];
      const day = dayMatch[3];
      if (month === "00") {
        return { start: `${year}-01-01`, end: `${year}-12-31` };
      }
      if (day === "00") {
        return { start: `${year}-${month}-01`, end: `${year}-${month}-31` };
      }
      return { start: text, end: text };
    }

    const monthMatch = text.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
      return { start: `${monthMatch[1]}-${monthMatch[2]}-01`, end: `${monthMatch[1]}-${monthMatch[2]}-31` };
    }

    const yearMatch = text.match(/^(\d{4})$/);
    if (yearMatch) {
      return { start: `${yearMatch[1]}-01-01`, end: `${yearMatch[1]}-12-31` };
    }

    return null;
  }

  function matchesDateConstraint(value, dateDirection = "", dateValue = "") {
    if (!dateDirection || !dateValue) {
      return true;
    }

    const rowRange = expandComparableDateRange(value);
    const targetRange = expandComparableDateRange(dateValue);
    if (!rowRange || !targetRange) {
      return false;
    }

    if (dateDirection === "before") {
      return rowRange.end < targetRange.start;
    }
    if (dateDirection === "after") {
      return rowRange.start > targetRange.end;
    }

    return true;
  }

  function filterRowsByLocationAndDate(
    rows,
    { normalizedLocation = "", locationField = "AnyLocation", dateField = "", dateDirection = "", dateValue = "" } = {}
  ) {
    return (rows || []).filter((row) => {
      if (normalizedLocation) {
        const birthLocation = normalizeText(row?.birthLocation);
        const deathLocation = normalizeText(row?.deathLocation);
        if (locationField === "BirthLocation" && !birthLocation.includes(normalizedLocation)) {
          return false;
        }
        if (locationField === "DeathLocation" && !deathLocation.includes(normalizedLocation)) {
          return false;
        }
        if (
          locationField === "AnyLocation" &&
          !birthLocation.includes(normalizedLocation) &&
          !deathLocation.includes(normalizedLocation)
        ) {
          return false;
        }
      }

      if (dateField === "BirthDate") {
        return matchesDateConstraint(row?.birth, dateDirection, dateValue);
      }
      if (dateField === "DeathDate") {
        return matchesDateConstraint(row?.death, dateDirection, dateValue);
      }
      return true;
    });
  }

  function isEffectivelyBlankKinRow(row) {
    if (!row || typeof row !== "object") {
      return true;
    }

    return ![
      row.wtid,
      row.displayName,
      row.firstName,
      row.middleName,
      row.lnab,
      row.lastNameCurrent,
      row.birth,
      row.death,
      row.birthLocation,
      row.deathLocation,
      row.spouse,
    ].some((value) => String(value || "").trim());
  }

  function getLinkedAncestorLabel(profile, fallbackId = "") {
    if (!profile && !fallbackId) {
      return { name: "", wtid: "" };
    }

    const wtid = String(profile?.Name || "").trim();
    const isPrivatePlaceholder = Number(profile?.Id ?? fallbackId) < 0 && !wtid;
    const name =
      profile?.RealName ||
      profile?.Derived?.ShortName ||
      profile?.LongNamePrivate ||
      profile?.Derived?.LongNamePrivate ||
      profile?.BirthNamePrivate ||
      profile?.Derived?.BirthNamePrivate ||
      (isPrivatePlaceholder ? "Private" : wtid || String(fallbackId || ""));

    return {
      name: String(name || "").trim(),
      wtid,
    };
  }

  function getGenerationFromAhnen(ahnen) {
    const numericAhnen = Number(ahnen);
    if (!Number.isFinite(numericAhnen) || numericAhnen < 2) {
      return 0;
    }

    return Math.floor(Math.log2(numericAhnen));
  }

  function buildAncestorRowsFromPeopleMap(rootProfile, peopleMap = {}, generation = 1, includeUpTo = false) {
    const peopleById = { ...(peopleMap || {}) };
    const ahnenById = new Map();
    const queue = [];

    const fatherId = String(rootProfile?.Father ?? "").trim();
    const motherId = String(rootProfile?.Mother ?? "").trim();
    if (fatherId) {
      queue.push({ id: fatherId, ahnen: 2 });
    }
    if (motherId) {
      queue.push({ id: motherId, ahnen: 3 });
    }

    while (queue.length) {
      const current = queue.shift();
      const currentId = String(current?.id || "").trim();
      const currentAhnen = Number(current?.ahnen);
      if (!currentId || !Number.isFinite(currentAhnen) || ahnenById.has(currentId)) {
        continue;
      }

      ahnenById.set(currentId, currentAhnen);

      const profile = peopleById[currentId];
      if (!profile) {
        continue;
      }

      const nextFatherId = String(profile?.Father ?? "").trim();
      const nextMotherId = String(profile?.Mother ?? "").trim();
      if (nextFatherId) {
        queue.push({ id: nextFatherId, ahnen: currentAhnen * 2 });
      }
      if (nextMotherId) {
        queue.push({ id: nextMotherId, ahnen: currentAhnen * 2 + 1 });
      }
    }

    return Object.values(peopleById)
      .filter((profile) => {
        const id = String(profile?.Id ?? "").trim();
        const ahnen = ahnenById.get(id);
        const derivedGeneration = getGenerationFromAhnen(ahnen);
        if (!id || !ahnenById.has(id)) {
          return false;
        }
        if (includeUpTo) {
          return derivedGeneration >= 1 && derivedGeneration <= generation;
        }
        return derivedGeneration === generation;
      })
      .map((profile) => {
        const ahnen = ahnenById.get(String(profile?.Id ?? "")) ?? "";
        const derivedGeneration = getGenerationFromAhnen(ahnen);
        const row = mapApiPersonToStandardRow(profile, {
          degrees: derivedGeneration || "",
          surnamePreference: "birthFirst",
        });

        const parentFatherId = String(profile?.Father ?? "").trim();
        const parentMotherId = String(profile?.Mother ?? "").trim();
        const father = getLinkedAncestorLabel(peopleById[parentFatherId], parentFatherId);
        const mother = getLinkedAncestorLabel(peopleById[parentMotherId], parentMotherId);

        return {
          ...row,
          ahnen,
          fatherName: father.name,
          fatherWtid: father.wtid,
          motherName: mother.name,
          motherWtid: mother.wtid,
        };
      });
  }

  function extractNamedSubjectForAncestorPrompt(prompt) {
    const normalized = String(prompt || "").trim();
    if (!normalized) {
      return "";
    }

    const relationPattern =
      "(?:\\d+(?:st|nd|rd|th)?\\s+(?:g(?:reat)?\\s*)?g(?:rand)?\\s*-?\\s*parents?|\\d+\\s*x\\s*(?:g(?:reat)?\\s*)?g(?:rand)?\\s*-?\\s*parents?|\\d+\\s*x\\s*great\\s*-?\\s*grand\\s*-?\\s*parents?|\\d+\\s+generations?\\s+(?:of\\s+)?ancestors?|great\\s*-?\\s*grand\\s*-?\\s*parents?|grand\\s*-?\\s*parents?|ancestors?)";

    const forMatch = normalized.match(new RegExp(`\\bfor\\s+(.+?)\\s+${relationPattern}\\??$`, "i"));
    if (forMatch?.[1]) {
      return String(forMatch[1] || "")
        .trim()
        .replace(/^(?:the\\s+)?(?:profile\\s+person|current\\s+profile|this\\s+profile)\\s*/i, "")
        .replace(/'s$/i, "")
        .trim();
    }

    const possessiveMatch = normalized.match(new RegExp(`^\\s*(.+?)'s\\s+${relationPattern}\\??$`, "i"));
    if (possessiveMatch?.[1]) {
      return String(possessiveMatch[1] || "")
        .trim()
        .replace(/^\d+\s+generations?\s+of\s+/i, "")
        .replace(/^(?:the\\s+)?(?:profile\\s+person|current\\s+profile|this\\s+profile)\\s*/i, "")
        .trim();
    }

    const genericOfMatch = normalized.match(
      /^(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?ancestors?\s+(?:of|for)\s+(.+?)\??$/i
    );
    if (genericOfMatch?.[1]) {
      return String(genericOfMatch[1] || "")
        .trim()
        .replace(/^(?:the\s+)?(?:profile\s+person|current\s+profile|this\s+profile)\s*/i, "")
        .replace(/'s$/i, "")
        .trim();
    }

    return "";
  }

  function extractNamedSubjectForDescendantPrompt(prompt) {
    const normalized = String(prompt || "").trim();
    if (!normalized) {
      return "";
    }

    const relationPattern =
      "(?:\\d+\\s+generations?\\s+(?:of\\s+)?descendants?|\\d+(?:st|nd|rd|th)?\\s+great\\s*-?\\s*grand\\s*-?\\s*children?|\\d+\\s*x\\s*great\\s*-?\\s*grand\\s*-?\\s*children?|great\\s*-?\\s*grand\\s*-?\\s*children?|grand\\s*-?\\s*children?|children?|descendants?)";

    const forMatch = normalized.match(new RegExp(`\\bfor\\s+(.+?)\\s+${relationPattern}\\??$`, "i"));
    if (forMatch?.[1]) {
      return String(forMatch[1] || "")
        .trim()
        .replace(/^(?:the\\s+)?(?:profile\\s+person|current\\s+profile|this\\s+profile)\\s*/i, "")
        .replace(/'s$/i, "")
        .trim();
    }

    const possessiveMatch = normalized.match(new RegExp(`^\\s*(.+?)'s\\s+${relationPattern}\\??$`, "i"));
    if (possessiveMatch?.[1]) {
      return String(possessiveMatch[1] || "")
        .trim()
        .replace(/^(?:the\\s+)?(?:profile\\s+person|current\\s+profile|this\\s+profile)\\s*/i, "")
        .trim();
    }

    const genericOfMatch = normalized.match(
      /^(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?(?:descendants?|children?|grand\s*-?\s*children?|great\s*-?\s*grand\s*-?\s*children?)\s+(?:of|for)\s+(.+?)\??$/i
    );
    if (genericOfMatch?.[1]) {
      return String(genericOfMatch[1] || "")
        .trim()
        .replace(/^(?:the\s+)?(?:profile\s+person|current\s+profile|this\s+profile)\s*/i, "")
        .replace(/'s$/i, "")
        .trim();
    }

    return "";
  }

  async function resolveAncestorSubjectRoot(prompt) {
    const normalizedPrompt = String(prompt || "").trim();
    const asksForUser = /\b(my|me|mine|myself)\b/i.test(normalizedPrompt);
    const asksForProfile = /\b(profile\s+person|current\s+profile|this\s+profile)\b/i.test(normalizedPrompt);

    if (asksForUser) {
      const userRoot = await getLoggedInRootPerson();
      if (!userRoot) {
        return null;
      }
      return userRoot;
    }

    const namedSubject = extractNamedSubjectForAncestorPrompt(normalizedPrompt);
    if (namedSubject) {
      if (/^(?:his|her|their)$/i.test(namedSubject)) {
        const profileRoot = getProfileSubjectRoot();
        if (profileRoot) {
          return profileRoot;
        }
      }

      const resolved = await resolveConnectionTargetPerson(namedSubject, normalizedPrompt);
      if (!resolved?.Name && !resolved?.Id) {
        return {
          unresolvedName: namedSubject,
        };
      }

      return {
        key: resolved.Id || resolved.Name,
        wtId: resolved.Name,
        displayName: resolved.RealName || resolved?.Derived?.ShortName || resolved.Name,
        subjectType: "named",
      };
    }

    if (asksForProfile) {
      const profileRoot = getProfileSubjectRoot();
      if (profileRoot) {
        return profileRoot;
      }
    }

    const profileRoot = getProfileSubjectRoot();
    if (profileRoot) {
      return profileRoot;
    }

    return await getLoggedInRootPerson();
  }

  async function resolveDescendantSubjectRoot(prompt) {
    const normalizedPrompt = String(prompt || "").trim();
    const asksForUser = /\b(my|me|mine|myself)\b/i.test(normalizedPrompt);
    const asksForProfile = /\b(profile\s+person|current\s+profile|this\s+profile)\b/i.test(normalizedPrompt);

    if (asksForUser) {
      const userRoot = await getLoggedInRootPerson();
      if (!userRoot) {
        return null;
      }
      return userRoot;
    }

    const namedSubject = extractNamedSubjectForDescendantPrompt(normalizedPrompt);
    if (namedSubject) {
      if (/^(?:his|her|their)$/i.test(namedSubject)) {
        const profileRoot = getProfileSubjectRoot();
        if (profileRoot) {
          return profileRoot;
        }
      }

      const resolved = await resolveConnectionTargetPerson(namedSubject, normalizedPrompt);
      if (!resolved?.Name && !resolved?.Id) {
        return {
          unresolvedName: namedSubject,
        };
      }

      return {
        key: resolved.Id || resolved.Name,
        wtId: resolved.Name,
        displayName: resolved.RealName || resolved?.Derived?.ShortName || resolved.Name,
        subjectType: "named",
      };
    }

    if (asksForProfile) {
      const profileRoot = getProfileSubjectRoot();
      if (profileRoot) {
        return profileRoot;
      }
    }

    const profileRoot = getProfileSubjectRoot();
    if (profileRoot) {
      return profileRoot;
    }

    return await getLoggedInRootPerson();
  }

  async function tryHandleSpouseListPrompt(params, prompt = "") {
    const genderFilter = params?.gender || null;
    const relationshipLabel = String(params?.relationshipLabel || "spouses").trim();
    const targetName = String(params?.target || "").trim();

    if (!targetName) {
      return null;
    }

    const rootPerson = await resolveConnectionTargetPerson(targetName, prompt);
    if (!rootPerson?.Name && !rootPerson?.Id) {
      return `I couldn't identify which profile you meant by "${targetName}". Try a WikiTree ID like Name-123, or a more specific name.`;
    }

    const personKey = rootPerson.Id || rootPerson.Name;
    const personLabel = `${rootPerson.RealName || rootPerson?.Derived?.ShortName || rootPerson.Name} (${
      rootPerson.Name
    })`;

    try {
      const result = await WikiTreeAPI.getRelatives(
        WBE_CHAT_APP_ID,
        personKey,
        "Id,Name,RealName,Derived.ShortName,FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender",
        { getSpouses: 1 }
      );
      const [peopleResult] = result;

      if (!peopleResult?.person) {
        return `No spouse data available for ${personLabel}.`;
      }

      const rootProfile = peopleResult.person;
      const spousesData = Object.values(rootProfile.Spouses || {});

      if (!spousesData.length) {
        return `No spouses found for ${personLabel}.`;
      }

      let spouses = spousesData
        .map((spouse) => ({
          displayName: spouse.RealName || spouse?.Derived?.ShortName || spouse.Name,
          wtid: spouse.Name,
          firstName: spouse.FirstName || spouse.RealName || "",
          lnab: spouse.LastNameAtBirth || "",
          lastNameCurrent: spouse.LastNameCurrent || "",
          gender: spouse.Gender || "",
          birth: spouse.BirthDate && spouse.BirthDate !== "0000-00-00" ? spouse.BirthDate : "",
          death: spouse.DeathDate && spouse.DeathDate !== "0000-00-00" ? spouse.DeathDate : "",
          birthLocation: spouse.BirthLocation || "",
          deathLocation: spouse.DeathLocation || "",
          surname: spouse.LastNameAtBirth || spouse.LastNameCurrent || "",
        }))
        .sort((left, right) => normalizeText(left.displayName).localeCompare(normalizeText(right.displayName)));

      if (genderFilter) {
        spouses = spouses.filter((spouse) => {
          const gender = String(spouse.gender || "")
            .trim()
            .toLowerCase();
          if (genderFilter === "Female") {
            return gender === "female" || gender === "f" || gender === "woman";
          }
          if (genderFilter === "Male") {
            return gender === "male" || gender === "m" || gender === "man";
          }
          return true;
        });
      }

      if (!spouses.length) {
        return `No ${relationshipLabel} found for ${personLabel}.`;
      }

      const preview = spouses
        .slice(0, 12)
        .map(
          (person) =>
            `- ${person.displayName} (${person.wtid})${person.birth ? ` [b. ${person.birth}]` : ""}${
              person.death ? ` [d. ${person.death}]` : ""
            }`
        )
        .join("\n");
      const extra = spouses.length > 12 ? `\n...and ${spouses.length - 12} more.` : "";

      return {
        message: `Here are ${relationshipLabel} for ${personLabel} (${spouses.length} found):\n${preview}${extra}`,
        table: makeStandardProfileTable(`${relationshipLabel} for ${rootProfile.Name}`, spouses, [[0, "asc"]]),
      };
    } catch (error) {
      return `I couldn't list ${relationshipLabel} for ${personLabel}. Error: ${error?.message || "unknown error"}`;
    }
  }

  async function tryHandlePersonAgeAtDeathPrompt(params, prompt = "") {
    const targetName = String(params?.target || "").trim();
    if (!targetName) {
      return null;
    }

    let person = params?._resolvedPerson || null;
    if (!person) {
      person = await resolveConnectionTargetPerson(targetName, prompt, { allowDisambiguation: true });
    }
    if (person?._disambiguationNeeded) {
      setPendingDisambiguationContext({
        intent: ChatIntent.PERSON_AGE_AT_DEATH,
        params,
        prompt,
        candidates: person._candidates,
      });
      return buildDisambiguationMessage(person._candidates, targetName);
    }
    if (!person?.Name && !person?.Id) {
      return `I couldn't identify which profile you meant by "${targetName}". Try a WikiTree ID like Name-123, or a more specific name.`;
    }

    const displayName = person.RealName || person?.Derived?.ShortName || person.Name;
    const wtId = person.Name || "";
    const birthDate = person.BirthDate && person.BirthDate !== "0000-00-00" ? person.BirthDate : "";
    const deathDate = person.DeathDate && person.DeathDate !== "0000-00-00" ? person.DeathDate : "";

    if (!birthDate || !deathDate) {
      return `I found ${displayName} (${wtId}), but I need both birth and death dates to calculate age at death.`;
    }

    const ageAtDeath = computeAgeAtDeathYears(birthDate, deathDate);
    if (!Number.isFinite(ageAtDeath)) {
      return `I found ${displayName} (${wtId}), but the available dates are not precise enough to calculate age at death.`;
    }

    const approximate = isPartialDate(birthDate) || isPartialDate(deathDate);
    const pronoun = person.Gender === "Female" ? "she" : person.Gender === "Male" ? "he" : "they";
    const ageStr = approximate ? `approximately ${ageAtDeath}` : String(ageAtDeath);
    return `${displayName} (${wtId}) was ${ageStr} years old when ${pronoun} died.`;
  }

  async function tryHandleAncestorAverageAgePrompt(params, prompt = "") {
    const generation = Number(params?.generation);
    if (!Number.isFinite(generation) || generation < 1) {
      return null;
    }

    const relationshipLabel = String(params?.relationshipLabel || `${generation} generations back`).trim();
    const rootPerson = await resolveAncestorSubjectRoot(prompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123, or a more specific name.`;
    }
    if (!rootPerson) {
      return "I could not detect a profile person or your logged-in profile to use as the starting point.";
    }

    const subjectLabel = formatSubjectLabel(rootPerson);

    try {
      const [, , people] = await fetchPeoplePaged(
        WBE_CHAT_APP_ID,
        rootPerson.key,
        "Id,Name,RealName,Derived.ShortName,LastNameAtBirth,BirthDate,DeathDate,Meta",
        { ancestors: generation, minGeneration: generation, limit: 1000 }
      );

      const candidates = Object.values(people || {})
        .filter((profile) => {
          const degree = Number(profile?.Meta?.Degrees);
          return !Number.isFinite(degree) || degree === generation;
        })
        .map((profile) => {
          const birth = profile.BirthDate && profile.BirthDate !== "0000-00-00" ? profile.BirthDate : "";
          const death = profile.DeathDate && profile.DeathDate !== "0000-00-00" ? profile.DeathDate : "";
          return {
            displayName: profile.RealName || profile?.Derived?.ShortName || profile.Name,
            wtid: profile.Name,
            lnab: profile.LastNameAtBirth || "",
            birth,
            death,
            ageAtDeath: computeAgeAtDeathYears(birth, death),
          };
        });

      if (!candidates.length) {
        return `I found no ancestors for ${relationshipLabel} from ${subjectLabel}.`;
      }

      const withAges = candidates.filter((row) => Number.isFinite(row.ageAtDeath));
      if (!withAges.length) {
        return `I found ${candidates.length} ${relationshipLabel} profile${
          candidates.length === 1 ? "" : "s"
        } from ${subjectLabel}, but none had both usable birth and death dates.`;
      }

      const totalAge = withAges.reduce((sum, row) => sum + row.ageAtDeath, 0);
      const averageAge = totalAge / withAges.length;
      const roundedAverage = Math.round(averageAge * 10) / 10;

      const tableRows = withAges
        .slice()
        .sort(
          (left, right) =>
            right.ageAtDeath - left.ageAtDeath ||
            normalizeText(left.displayName).localeCompare(normalizeText(right.displayName))
        );

      return {
        message: `Average age at death for ${relationshipLabel} of ${subjectLabel} is ${roundedAverage} years (from ${withAges.length} of ${candidates.length} profiles with complete dates).`,
        table: makeAncestorAgeTable(`${relationshipLabel} age at death`, tableRows),
      };
    } catch (error) {
      return `I couldn't calculate average age at death for ${relationshipLabel}. Error: ${
        error?.message || "unknown error"
      }`;
    }
  }

  async function tryHandleAncestorListPrompt(params, prompt = "") {
    const generation = Number(params?.generation);
    if (!Number.isFinite(generation) || generation < 1) {
      return null;
    }

    const normalizedPrompt = String(prompt || "").toLowerCase();
    const location = String(params?.location || "").trim();
    const locationField = String(params?.locationField || "").trim() || "AnyLocation";
    const dateField = String(params?.dateField || "").trim();
    const dateDirection = String(params?.dateDirection || "")
      .trim()
      .toLowerCase();
    const dateValue = String(params?.dateValue || "").trim();
    const normalizedLocation = normalizeText(location);
    const usedDefaultGeneration = Boolean(params?.defaultGeneration);
    const includeUpTo =
      Boolean(params?.includeUpTo) ||
      /(?:\b\d+\s+generations?\b.*\bancestors?\b|\bancestors?\b.*\b\d+\s+generations?\b)/i.test(normalizedPrompt);
    const relationshipLabel = usedDefaultGeneration
      ? "ancestors"
      : includeUpTo
      ? `${generation} generations of ancestors`
      : String(params?.relationshipLabel || `${generation} generations back`).trim();
    const baseDisplayRelationshipLabel = usedDefaultGeneration
      ? `ancestors within ${generation} generations`
      : relationshipLabel;
    const locationPhrase = location
      ? locationField === "BirthLocation"
        ? `born in ${location}`
        : locationField === "DeathLocation"
        ? `died in ${location}`
        : `in ${location}`
      : "";
    const datePhrase = getDateConstraintLabel(dateField, dateDirection, dateValue);
    const filterPhrase = [locationPhrase, datePhrase].filter(Boolean).join(" ");
    const displayRelationshipLabel = filterPhrase
      ? `${baseDisplayRelationshipLabel} ${filterPhrase}`
      : baseDisplayRelationshipLabel;
    const rootPerson = await resolveAncestorSubjectRoot(prompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123, or a more specific name.`;
    }
    if (!rootPerson) {
      return "I could not detect a profile person or your logged-in profile to use as the starting point.";
    }

    const subjectLabel = formatSubjectLabel(rootPerson);

    const cachedAncestorRows = filterCachedKinRows({
      intent: ChatIntent.ANCESTOR_LIST,
      rootKey: rootPerson.key,
      generation,
      includeUpTo,
      locationField,
      normalizedLocation,
      dateField,
      dateDirection,
      dateValue,
    });

    if (cachedAncestorRows) {
      const ancestors = sortKinRows(
        filterRowsByLocationAndDate(cachedAncestorRows.rows, {
          normalizedLocation,
          locationField,
          dateField,
          dateDirection,
          dateValue,
        }),
        includeUpTo
      );
      const ancestorCacheMissingAhnens = ancestors.some(
        (row) => row?.ahnen === undefined || row?.fatherName === undefined || row?.motherName === undefined
      );

      if (ancestorCacheMissingAhnens) {
        console.debug("wbe: ancestor cache missing ahnen/parent data; bypassing cache", {
          prompt,
          rootKey: rootPerson.key,
          generation,
          includeUpTo,
          cachedRowCount: ancestors.length,
        });
      } else {
        if (!ancestors.length) {
          if (normalizedLocation && cachedAncestorRows.totalCandidates) {
            return `I searched ${
              cachedAncestorRows.totalCandidates
            } ${baseDisplayRelationshipLabel} for ${subjectLabel} from previously loaded data, but none matched ${locationPhrase}. ${
              cachedAncestorRows.missingLocationCount
            } had no ${getLocationFieldLabel(locationField)} in that data.`;
          }
          return `I found no ${displayRelationshipLabel} for ${subjectLabel} in previously loaded data.`;
        }

        return buildKinListResult({
          rows: ancestors,
          displayRelationshipLabel,
          subjectLabel,
          rootDisplayName: rootPerson.displayName,
          rootWtId: rootPerson.wtId,
          includeUpTo,
          tableFactory: makeAncestorProfileTable,
          treeAppKind: "ancestors",
          chatMeta: {
            intent: ChatIntent.ANCESTOR_LIST,
            rootKey: String(rootPerson.key || ""),
            generation,
            includeUpTo,
            location: location || "",
            locationField,
            dateField,
            dateDirection,
            dateValue,
          },
        });
      }
    }

    try {
      const collectedPeople = {};
      const [, , rootPeopleMap] = await fetchPeoplePaged(WBE_CHAT_APP_ID, rootPerson.key, "Id,Father,Mother", {
        limit: 1,
      });
      const rootProfile = Object.values(rootPeopleMap || {})[0] || null;
      const [, , peopleMap] = await fetchPeoplePaged(
        WBE_CHAT_APP_ID,
        rootPerson.key,
        "Id,Name,FirstName,MiddleName,RealName,Derived.ShortName,Derived.LongNamePrivate,Derived.BirthNamePrivate,LastNameAtBirth,LastNameCurrent,LastNameOther,Father,Mother,BirthDate,BirthDateDecade,DeathDate,DeathDateDecade,BirthLocation,DeathLocation,Gender,Meta",
        { ancestors: generation, minGeneration: includeUpTo ? 1 : generation, limit: 1000 }
      );

      Object.values(peopleMap || {}).forEach((profile) => {
        if (profile?.Id != null) collectedPeople[String(profile.Id)] = profile;
      });

      const allAncestors = rootProfile
        ? buildAncestorRowsFromPeopleMap(rootProfile, collectedPeople, generation, includeUpTo)
        : Object.values(collectedPeople)
            .filter((profile) => {
              const degree = Number(profile?.Meta?.Degrees);
              if (!Number.isFinite(degree)) {
                return true;
              }
              if (includeUpTo) {
                return degree >= 1 && degree <= generation;
              }
              return degree === generation;
            })
            .map((profile) =>
              mapApiPersonToStandardRow(profile, {
                degrees: Number.isFinite(Number(profile?.Meta?.Degrees)) ? Number(profile.Meta.Degrees) : "",
                surnamePreference: "birthFirst",
              })
            );

      const ancestors = filterRowsByLocationAndDate(allAncestors, {
        normalizedLocation,
        locationField,
        dateField,
        dateDirection,
        dateValue,
      });
      const sortedAncestors = sortKinRows(ancestors, includeUpTo);

      if (!sortedAncestors.length) {
        if (normalizedLocation && allAncestors.length) {
          const missingBirthLocationCount = allAncestors.filter(
            (person) => !normalizeText(person.birthLocation)
          ).length;
          const missingDeathLocationCount = allAncestors.filter(
            (person) => !normalizeText(person.deathLocation)
          ).length;
          const missingLocationCount =
            locationField === "BirthLocation"
              ? missingBirthLocationCount
              : locationField === "DeathLocation"
              ? missingDeathLocationCount
              : allAncestors.filter(
                  (person) => !normalizeText(person.birthLocation) && !normalizeText(person.deathLocation)
                ).length;

          return `I searched ${
            allAncestors.length
          } ${baseDisplayRelationshipLabel} for ${subjectLabel}, but none matched ${locationPhrase}. ${missingLocationCount} had no ${getLocationFieldLabel(
            locationField
          )} in accessible API data.`;
        }

        // Mirror of the descendants wording: state the fact rather than
        // echoing the request ("I found no 10 generations of ancestors...").
        const subjectVerb = rootPerson?.subjectType === "user" ? "have" : "has";
        if (includeUpTo) {
          return `${subjectLabel} ${subjectVerb} no parents recorded on WikiTree, so there are no ancestors to show.`;
        }
        return `${subjectLabel} ${subjectVerb} no ancestors recorded ${generation} generation${
          generation === 1 ? "" : "s"
        } back on WikiTree.`;
      }

      return buildKinListResult({
        rows: sortedAncestors,
        displayRelationshipLabel,
        subjectLabel,
        rootDisplayName: rootPerson.displayName,
        rootWtId: rootPerson.wtId,
        includeUpTo,
        tableFactory: makeAncestorProfileTable,
        treeAppKind: "ancestors",
        chatMeta: {
          intent: ChatIntent.ANCESTOR_LIST,
          rootKey: String(rootPerson.key || ""),
          generation,
          includeUpTo,
          location: location || "",
          locationField,
          dateField,
          dateDirection,
          dateValue,
        },
      });
    } catch (error) {
      return `I couldn't list ${relationshipLabel} for ${subjectLabel}. Error: ${error?.message || "unknown error"}`;
    }
  }

  async function tryHandleDescendantListPrompt(params, prompt = "") {
    const generation = Number(params?.generation);
    if (!Number.isFinite(generation) || generation < 1) {
      return null;
    }

    const normalizedPrompt = String(prompt || "").toLowerCase();
    const location = String(params?.location || "").trim();
    const locationField = String(params?.locationField || "").trim() || "AnyLocation";
    const dateField = String(params?.dateField || "").trim();
    const dateDirection = String(params?.dateDirection || "")
      .trim()
      .toLowerCase();
    const dateValue = String(params?.dateValue || "").trim();
    const normalizedLocation = normalizeText(location);
    const usedDefaultGeneration = Boolean(params?.defaultGeneration);
    const includeUpTo =
      Boolean(params?.includeUpTo) ||
      /(?:\b\d+\s+generations?\b.*\bdescendants?\b|\bdescendants?\b.*\b\d+\s+generations?\b)/i.test(normalizedPrompt);
    const relationshipLabel = usedDefaultGeneration
      ? "descendants"
      : includeUpTo
      ? `${generation} generations of descendants`
      : String(params?.relationshipLabel || `${generation} generations down`).trim();
    const baseDisplayRelationshipLabel = usedDefaultGeneration
      ? `descendants within ${generation} generations`
      : relationshipLabel;
    const locationPhrase = location
      ? locationField === "BirthLocation"
        ? `born in ${location}`
        : locationField === "DeathLocation"
        ? `died in ${location}`
        : `in ${location}`
      : "";
    const datePhrase = getDateConstraintLabel(dateField, dateDirection, dateValue);
    const filterPhrase = [locationPhrase, datePhrase].filter(Boolean).join(" ");
    const displayRelationshipLabel = filterPhrase
      ? `${baseDisplayRelationshipLabel} ${filterPhrase}`
      : baseDisplayRelationshipLabel;
    const rootPerson = await resolveDescendantSubjectRoot(prompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123, or a more specific name.`;
    }
    if (!rootPerson) {
      return "I could not detect a profile person or your logged-in profile to use as the starting point.";
    }

    const subjectLabel = formatSubjectLabel(rootPerson);

    const cachedDescendantRows = filterCachedKinRows({
      intent: ChatIntent.DESCENDANT_LIST,
      rootKey: rootPerson.key,
      generation,
      includeUpTo,
      locationField,
      normalizedLocation,
      dateField,
      dateDirection,
      dateValue,
    });

    if (cachedDescendantRows) {
      const descendants = sortKinRows(
        filterRowsByLocationAndDate(cachedDescendantRows.rows, {
          normalizedLocation,
          locationField,
          dateField,
          dateDirection,
          dateValue,
        }),
        includeUpTo
      );
      const cachedBlankRows = descendants.filter((row) => isEffectivelyBlankKinRow(row));
      if (cachedBlankRows.length) {
        console.debug("wbe: descendant cache contained blank rows; bypassing cache", {
          prompt,
          rootKey: rootPerson.key,
          generation,
          includeUpTo,
          cachedRowCount: descendants.length,
          cachedBlankRowCount: cachedBlankRows.length,
          cachedBlankRowSamples: cachedBlankRows.slice(0, 25),
        });
      } else {
        if (!descendants.length) {
          return `I found no ${displayRelationshipLabel} for ${subjectLabel} in previously loaded data.`;
        }

        return buildKinListResult({
          rows: descendants,
          displayRelationshipLabel,
          subjectLabel,
          rootDisplayName: rootPerson.displayName,
          rootWtId: rootPerson.wtId,
          includeUpTo,
          treeAppKind: "descendants",
          chatMeta: {
            intent: ChatIntent.DESCENDANT_LIST,
            rootKey: String(rootPerson.key || ""),
            generation,
            includeUpTo,
            location: location || "",
            locationField,
            dateField,
            dateDirection,
            dateValue,
          },
        });
      }
    }

    try {
      const collectedPeople = {};
      const [, , peopleMap] = await fetchPeoplePaged(
        WBE_CHAT_APP_ID,
        rootPerson.key,
        "Id,Name,FirstName,MiddleName,RealName,Derived.ShortName,Derived.LongNamePrivate,Derived.BirthNamePrivate,LastNameAtBirth,LastNameCurrent,LastNameOther,BirthDate,BirthDateDecade,DeathDate,DeathDateDecade,BirthLocation,DeathLocation,Gender,Meta",
        { descendants: generation, minGeneration: includeUpTo ? 1 : generation, limit: 1000 }
      );

      Object.values(peopleMap || {}).forEach((profile) => {
        const profileId = String(profile?.Id ?? "");
        const profileWtId = String(profile?.Name || "");
        if (
          profile?.Id != null &&
          profileId !== String(rootPerson.key) &&
          profileWtId !== String(rootPerson.wtId || "")
        ) {
          collectedPeople[profileId] = profile;
        }
      });

      const descendantProfiles = Object.values(collectedPeople).filter((profile) => {
        const degree = Number(profile?.Meta?.Degrees);
        if (!Number.isFinite(degree)) {
          return true;
        }
        if (includeUpTo) {
          return degree >= 1 && degree <= generation;
        }
        return degree === generation;
      });

      const descendants = descendantProfiles.map((profile) =>
        mapApiPersonToStandardRow(profile, {
          degrees: Number.isFinite(Number(profile?.Meta?.Degrees)) ? Number(profile.Meta.Degrees) : "",
          surnamePreference: "birthFirst",
        })
      );

      const blankRowSamples = descendantProfiles
        .map((profile, index) => ({
          raw: {
            Id: profile?.Id ?? "",
            Name: profile?.Name || "",
            FirstName: profile?.FirstName || "",
            RealName: profile?.RealName || "",
            ShortName: profile?.Derived?.ShortName || "",
            LongNamePrivate: profile?.LongNamePrivate || profile?.Derived?.LongNamePrivate || "",
            BirthNamePrivate: profile?.BirthNamePrivate || profile?.Derived?.BirthNamePrivate || "",
            LastNameAtBirth: profile?.LastNameAtBirth || "",
            LastNameCurrent: profile?.LastNameCurrent || "",
            BirthDate: profile?.BirthDate || "",
            BirthDateDecade: profile?.BirthDateDecade || "",
            DeathDate: profile?.DeathDate || "",
            DeathDateDecade: profile?.DeathDateDecade || "",
            BirthLocation: profile?.BirthLocation || "",
            DeathLocation: profile?.DeathLocation || "",
            Gender: profile?.Gender || "",
            Degrees: profile?.Meta?.Degrees ?? "",
          },
          row: descendants[index],
        }))
        .filter((entry) => isEffectivelyBlankKinRow(entry.row))
        .slice(0, 25);

      console.debug("wbe: descendant API result summary", {
        prompt,
        rootKey: rootPerson.key,
        rootWtId: rootPerson.wtId || "",
        generation,
        includeUpTo,
        rawReturnedCount: Object.keys(peopleMap || {}).length,
        collectedCount: Object.keys(collectedPeople).length,
        filteredCount: descendantProfiles.length,
        blankRowCount: blankRowSamples.length,
        blankRowSamples,
      });

      const sortedDescendants = sortKinRows(
        filterRowsByLocationAndDate(descendants, {
          normalizedLocation,
          locationField,
          dateField,
          dateDirection,
          dateValue,
        }),
        includeUpTo
      );

      if (!sortedDescendants.length) {
        // Say what is actually true rather than echoing the request back
        // ("I found no 10 generations of descendants..."). Three distinct cases:
        // descendants exist but a filter excluded them; the person has no
        // children at all; or nothing sits at one exact requested generation.
        const subjectVerb = rootPerson?.subjectType === "user" ? "have" : "has";
        if (descendants.length) {
          const count = descendants.length;
          return (
            `${subjectLabel} ${subjectVerb} ${count} recorded descendant${count === 1 ? "" : "s"}, ` +
            `but none matched the filters in your question.`
          );
        }
        if (includeUpTo) {
          return `${subjectLabel} ${subjectVerb} no children recorded on WikiTree, so there are no descendants to show.`;
        }
        return `${subjectLabel} ${subjectVerb} no descendants recorded ${generation} generation${
          generation === 1 ? "" : "s"
        } down on WikiTree.`;
      }

      return buildKinListResult({
        rows: sortedDescendants,
        displayRelationshipLabel,
        subjectLabel,
        rootDisplayName: rootPerson.displayName,
        rootWtId: rootPerson.wtId,
        includeUpTo,
        treeAppKind: "descendants",
        chatMeta: {
          intent: ChatIntent.DESCENDANT_LIST,
          rootKey: String(rootPerson.key || ""),
          generation,
          includeUpTo,
          location: location || "",
          locationField,
          dateField,
          dateDirection,
          dateValue,
        },
      });
    } catch (error) {
      return `I couldn't list ${relationshipLabel} for ${subjectLabel}. Error: ${error?.message || "unknown error"}`;
    }
  }

  async function tryHandleProfileFamilyConnectionPrompt(params) {
    const familyName = params?.familyName?.trim();
    if (!familyName) {
      return null;
    }

    const rootProfile = getProfileRootPerson();
    if (!rootProfile) {
      return "This query needs an open profile page so I can use the current profile person as the starting point.";
    }

    try {
      const cc7Profiles = await getCc7ProfilesForUser(rootProfile.key);
      const familyNeedle = normalizeSurname(familyName);
      const matches = cc7Profiles
        .filter((profile) => {
          const lastNameAtBirth = normalizeSurname(profile.LastNameAtBirth);
          const lastNameCurrent = normalizeSurname(profile.LastNameCurrent);
          return lastNameAtBirth === familyNeedle || lastNameCurrent === familyNeedle;
        })
        .map((profile) =>
          mapApiPersonToStandardRow(profile, {
            degrees: Number(profile.Degrees ?? Number.MAX_SAFE_INTEGER),
            surnamePreference: "currentFirst",
          })
        )
        .sort((left, right) => left.degrees - right.degrees || left.displayName.localeCompare(right.displayName));

      if (!matches.length) {
        return `I found no CC7 matches for the ${familyName} family from ${rootProfile.displayName} (${rootProfile.wtId}).`;
      }

      const closestDegree = matches[0].degrees;
      const closestMatches = matches.filter((person) => person.degrees === closestDegree);
      const preview = closestMatches
        .slice(0, 6)
        .map((person) => `${person.displayName} (${person.wtid})`)
        .join(", ");
      const extra = closestMatches.length > 6 ? `, and ${closestMatches.length - 6} more` : "";

      return {
        message: `The closest ${familyName} connection from ${rootProfile.displayName} (${
          rootProfile.wtId
        }) is degree ${closestDegree}. Closest match${
          closestMatches.length === 1 ? "" : "es"
        }: ${preview}${extra}. I found ${matches.length} total ${familyName} match${
          matches.length === 1 ? "" : "es"
        } in accessible CC7 data.`,
        table: makeStandardProfileTable(`${familyName} family matches from ${rootProfile.displayName}`, matches),
      };
    } catch (error) {
      return `I couldn't search CC7 for the ${familyName} family from ${rootProfile.displayName}. Error: ${
        error?.message || "unknown error"
      }`;
    }
  }

  return {
    tryHandleSpouseListPrompt,
    tryHandlePersonAgeAtDeathPrompt,
    tryHandleAncestorAverageAgePrompt,
    tryHandleAncestorListPrompt,
    tryHandleDescendantListPrompt,
    tryHandleProfileFamilyConnectionPrompt,
  };
}
