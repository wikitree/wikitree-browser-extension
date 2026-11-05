/*
Legacy Special:Relationship HTML parsing for the Distance and Relationship feature.
Pure DOM/string logic (no jQuery, no module state) so it can be unit tested.
*/

export function normalizeForMatch(s) {
  if (!s || typeof s !== "string") return "";
  return s
    .replace(/\[private\]/gi, "")
    .replace(/[()\.,;:\"\[\]<>\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function nameVariantsForProfile(profilePerson, profileID) {
  const variants = new Set();
  if (profilePerson) {
    if (profilePerson.FirstName) variants.add(normalizeForMatch(profilePerson.FirstName));
    if (profilePerson.LastNameCurrent) variants.add(normalizeForMatch(profilePerson.LastNameCurrent));
    if (profilePerson.LastNameAtBirth) variants.add(normalizeForMatch(profilePerson.LastNameAtBirth));
    if (profilePerson.Name) variants.add(normalizeForMatch(profilePerson.Name));
    const full = [profilePerson.FirstName, profilePerson.LastNameCurrent].filter(Boolean).join(" ");
    if (full) variants.add(normalizeForMatch(full));
  }
  if (profileID) variants.add(normalizeForMatch(String(profileID)));
  return [...variants].filter(Boolean);
}

export function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function phraseMatchesAnyVariant(phrase, variants) {
  const p = normalizeForMatch(phrase);
  if (!p || !Array.isArray(variants) || variants.length === 0) return false;
  return variants.some((variant) => {
    const v = normalizeForMatch(variant);
    if (!v) return false;
    return p === v || p.startsWith(`${v} `) || p.endsWith(` ${v}`) || p.includes(` ${v} `);
  });
}

export function invertRelationshipForProfile(relationship, profileGender) {
  const rel = String(relationship || "")
    .trim()
    .toLowerCase();
  if (!rel) return rel;

  const asParent = profileGender === "Male" ? "father" : profileGender === "Female" ? "mother" : "parent";
  const asChild = profileGender === "Male" ? "son" : profileGender === "Female" ? "daughter" : "child";
  const asAuntUncle = profileGender === "Male" ? "uncle" : profileGender === "Female" ? "aunt" : "aunt or uncle";
  const asNieceNephew = profileGender === "Male" ? "nephew" : profileGender === "Female" ? "niece" : "niece or nephew";

  const replacements = [
    [
      /(^|\s)grandson$/i,
      `$1${profileGender === "Male" ? "grandfather" : profileGender === "Female" ? "grandmother" : "grandparent"}`,
    ],
    [
      /(^|\s)granddaughter$/i,
      `$1${profileGender === "Male" ? "grandfather" : profileGender === "Female" ? "grandmother" : "grandparent"}`,
    ],
    [
      /(^|\s)grandchild$/i,
      `$1${profileGender === "Male" ? "grandfather" : profileGender === "Female" ? "grandmother" : "grandparent"}`,
    ],
    [
      /(^|\s)grandfather$/i,
      `$1${profileGender === "Male" ? "grandson" : profileGender === "Female" ? "granddaughter" : "grandchild"}`,
    ],
    [
      /(^|\s)grandmother$/i,
      `$1${profileGender === "Male" ? "grandson" : profileGender === "Female" ? "granddaughter" : "grandchild"}`,
    ],
    [
      /(^|\s)grandparent$/i,
      `$1${profileGender === "Male" ? "grandson" : profileGender === "Female" ? "granddaughter" : "grandchild"}`,
    ],
    [/(^|\s)son$/i, `$1${asParent}`],
    [/(^|\s)daughter$/i, `$1${asParent}`],
    [/(^|\s)child$/i, `$1${asParent}`],
    [/(^|\s)father$/i, `$1${asChild}`],
    [/(^|\s)mother$/i, `$1${asChild}`],
    [/(^|\s)parent$/i, `$1${asChild}`],
    [
      /(^|\s)grandnephew$/i,
      `$1${
        profileGender === "Male" ? "granduncle" : profileGender === "Female" ? "grandaunt" : "granduncle or grandaunt"
      }`,
    ],
    [
      /(^|\s)grandniece$/i,
      `$1${
        profileGender === "Male" ? "granduncle" : profileGender === "Female" ? "grandaunt" : "granduncle or grandaunt"
      }`,
    ],
    [/(^|\s)nephew$/i, `$1${asAuntUncle}`],
    [/(^|\s)niece$/i, `$1${asAuntUncle}`],
    [
      /(^|\s)granduncle$/i,
      `$1${
        profileGender === "Male"
          ? "grandnephew"
          : profileGender === "Female"
          ? "grandniece"
          : "grandniece or grandnephew"
      }`,
    ],
    [
      /(^|\s)grandaunt$/i,
      `$1${
        profileGender === "Male"
          ? "grandnephew"
          : profileGender === "Female"
          ? "grandniece"
          : "grandniece or grandnephew"
      }`,
    ],
    [/(^|\s)uncle$/i, `$1${asNieceNephew}`],
    [/(^|\s)aunt$/i, `$1${asNieceNephew}`],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(rel)) {
      return rel.replace(pattern, replacement).trim();
    }
  }

  return rel;
}

export function orientLegacyRelationshipToProfile(
  relationship,
  firstPText,
  userColloq,
  profileGender,
  profileVariants = []
) {
  const rel = String(relationship || "").trim();
  const text = String(firstPText || "")
    .replace(/\s+/g, " ")
    .trim();
  const user = String(userColloq || "").trim();
  if (!rel || !text || !user) return rel;

  const userEsc = escapeRegExp(user);
  const profileIsSubject = phraseMatchesAnyVariant(text.replace(/\s+(?:is|are)\s+[\s\S]*$/i, ""), profileVariants);
  const userIsSubject = new RegExp(`^${userEsc}\\b\\s+(?:is|are)\\b`, "i").test(text);
  const userIsObject =
    new RegExp(`\\b(?:of\\s+${userEsc}\\b|${userEsc}'s\\b|${userEsc}’s\\b)`, "i").test(text) ||
    new RegExp(`\\band\\s+${userEsc}\\b\\s+(?:are|is)\\b`, "i").test(text);

  if (profileIsSubject && userIsObject) {
    return rel;
  }

  if (userIsSubject && !userIsObject) {
    return invertRelationshipForProfile(rel, profileGender);
  }

  return rel;
}

export function normalizeLegacyRelationLabel(rel) {
  return String(rel || "")
    .replace(/\.$/, "")
    .replace(/^\s*the\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Derive the relationship (from the profile's perspective) from a parsed
 * legacy Special:Relationship HTML document.
 *
 * @param {Document} doc parsed legacy HTML
 * @param {Object} context
 * @param {Object} context.profilePerson person info for the viewed profile
 * @param {string} context.profileID WT ID of the viewed profile
 * @param {string} context.userWtIdRaw WT ID of the logged-in user
 * @param {string} context.userColloquialNameRaw colloquial name of the logged-in user
 * @param {Array} context.legacyCommonAncestors legacy.commonAncestors from the endpoint
 * @returns {string} derived relationship label (may be empty)
 */
export function deriveRelationshipFromLegacyDoc(doc, context = {}) {
  const {
    profilePerson,
    profileID,
    userWtIdRaw,
    userColloquialNameRaw,
    legacyCommonAncestors: rawCommonAncestors,
  } = context;

  const firstP = doc.querySelector("h3");
  const firstPText = firstP ? firstP.textContent.replace(/[\t\n]/g, " ").trim() : "";
  console.log("[WBE dist-rel] legacy firstPText:", firstPText);

  let derivedRelationship = "";
  let relationshipAlreadyOriented = false;
  const legacyCommonAncestors = Array.isArray(rawCommonAncestors) ? rawCommonAncestors : [];
  const allParaText = Array.from(doc.querySelectorAll("p"))
    .map((p) => p.textContent.replace(/[\t\n ]+/g, " ").trim())
    .join(" \n ");

  // Prefer the headline relation when available (e.g. "X and Ian are siblings").
  // This is often the direct relationship between profile and user.
  if (firstPText.includes("is the")) {
    derivedRelationship = firstPText.split("is the ")[1].split(" of")[0];
  } else if (firstPText.includes(" are ")) {
    derivedRelationship = firstPText
      .split("are ")[1]
      .replace(/cousins/, "cousin")
      .replace(/siblings/, "sibling");
  }

  // Deterministic orientation for explicit sentence headlines:
  // "X is the <rel> of Y".
  // If X is the logged-in user, invert to profile perspective.
  // If Y is the logged-in user, keep relation as-is.
  try {
    const sentenceMatch = firstPText.match(/^(.+?)\s+is\s+the\s+([a-z0-9\-\s]+?)\s+of\s+(.+)$/i);
    if (sentenceMatch) {
      const subject = normalizeForMatch(sentenceMatch[1]);
      const rel = normalizeLegacyRelationLabel(sentenceMatch[2]);
      const object = normalizeForMatch(sentenceMatch[3]);
      const userColloq = normalizeForMatch(userColloquialNameRaw || "");
      const userWtId = normalizeForMatch(userWtIdRaw || "");
      const profileVariants = nameVariantsForProfile(profilePerson, profileID);

      const partMatchesUser = (part) =>
        (userColloq && phraseMatchesAnyVariant(part, [userColloq])) ||
        (userWtId && phraseMatchesAnyVariant(part, [userWtId]));
      const partMatchesProfile = (part) => phraseMatchesAnyVariant(part, profileVariants);

      const subjectIsUser = partMatchesUser(subject);
      const objectIsUser = partMatchesUser(object);
      const subjectIsProfile = partMatchesProfile(subject);
      const objectIsProfile = partMatchesProfile(object);

      if (rel && ((subjectIsUser && !objectIsUser) || objectIsProfile)) {
        derivedRelationship = invertRelationshipForProfile(rel, profilePerson?.Gender);
        relationshipAlreadyOriented = true;
        console.log("[WBE dist-rel] explicit sentence orientation -> user is subject (inverted):", {
          firstPText,
          derivedRelationship,
        });
      } else if (rel && ((objectIsUser && !subjectIsUser) || subjectIsProfile)) {
        derivedRelationship = rel;
        relationshipAlreadyOriented = true;
        console.log("[WBE dist-rel] explicit sentence orientation -> user is object (kept):", {
          firstPText,
          derivedRelationship,
        });
      }
    }
  } catch (e) {
    console.log("[WBE dist-rel] explicit sentence orientation parse error", e);
  }

  // Safety rule for generic heading-only h3 values like "Grandson":
  // when h3 has no names/grammar, prefer explicit "This makes ... the <rel> of ..." relation.
  if (!derivedRelationship && firstPText && /^[A-Za-z ]+$/.test(firstPText) && !/\b(is|are)\b/i.test(firstPText)) {
    const makesRel = allParaText.match(/This makes\s+(.+?)\s+the\s+([A-Za-z ]+?)\s+of\s+(.+?)\./i);
    if (makesRel && makesRel[2]) {
      const makesSubject = normalizeForMatch(makesRel[1]);
      const makesObject = normalizeForMatch(makesRel[3]);
      const makesRelationship = normalizeLegacyRelationLabel(makesRel[2]);
      const userColloq = normalizeForMatch(userColloquialNameRaw || "");
      const userWtId = normalizeForMatch(userWtIdRaw || "");
      const profileVariants = nameVariantsForProfile(profilePerson, profileID);
      const subjectIsProfile = phraseMatchesAnyVariant(makesSubject, profileVariants);
      const objectIsProfile = phraseMatchesAnyVariant(makesObject, profileVariants);
      const subjectIsUser =
        (userColloq && phraseMatchesAnyVariant(makesSubject, [userColloq])) ||
        (userWtId && phraseMatchesAnyVariant(makesSubject, [userWtId]));

      // If the logged-in user is the subject in "This makes ...",
      // invert to profile perspective.
      if ((subjectIsUser && !subjectIsProfile) || objectIsProfile) {
        derivedRelationship = invertRelationshipForProfile(makesRelationship, profilePerson?.Gender);
      } else {
        derivedRelationship = makesRelationship;
      }
      relationshipAlreadyOriented = true;

      console.log("[WBE dist-rel] generic h3 -> using 'This makes' relation:", {
        firstPText,
        makesSubject,
        derivedRelationship,
      });
    }
  }

  if (legacyCommonAncestors.length === 0) {
    const bold = doc.querySelector("b");
    const boldParentHTML = bold?.parentElement?.innerHTML || "";
    const lastLink = decodeURIComponent(
      doc.querySelector("#imageContainer > p > span:last-of-type a")?.href || ""
    ).replaceAll(" ", "_");
    const profileFirstName = profilePerson?.FirstName || "";

    if (!derivedRelationship) {
      derivedRelationship = (bold?.textContent || "").trim();
    }
    if (
      !derivedRelationship &&
      boldParentHTML.includes(profileFirstName) &&
      profileID &&
      !lastLink.includes(profileID)
    ) {
      derivedRelationship = firstPText.replace("(DNA Confirmed)", "").replace("(Confident)", "").trim().toLowerCase();
    }
  } else {
    if (!derivedRelationship && firstPText.includes("is the")) {
      derivedRelationship = firstPText.split("is the ")[1].split(" of")[0];
    } else if (!derivedRelationship && firstPText.includes(" are ")) {
      derivedRelationship = firstPText
        .split("are ")[1]
        .replace(/cousins/, "cousin")
        .replace(/siblings/, "sibling");
    } else if (!derivedRelationship && firstPText.includes(" is ")) {
      derivedRelationship = firstPText.split(" is ")[1].trim();
    }

    const userFirstName =
      doc
        .querySelector(`span.ancestor_1`)
        ?.textContent.replace(/[\t\n ]+/g, " ")
        .trim()
        .split(" ")[1] || "";

    if (userFirstName && firstPText.includes(`${userFirstName}'s`)) {
      derivedRelationship = firstPText.split(`${userFirstName}'s`)[1].trim();
    }
  }

  // Orient relation from profile perspective using user first name from #userData.
  try {
    const userColloq = String(userColloquialNameRaw || "").trim();
    if (!relationshipAlreadyOriented) {
      derivedRelationship = orientLegacyRelationshipToProfile(
        derivedRelationship,
        firstPText,
        userColloq,
        profilePerson?.Gender,
        nameVariantsForProfile(profilePerson, profileID)
      );
    }
  } catch (e) {
    console.log("[WBE dist-rel] legacy orientation parse error", e);
  }

  // Minimal legacy override:
  // If the sentence is "X is the daughter/son/child of <link>" and that link
  // points to the current user, then the profile relationship should be
  // daughter/son/child from the viewer's perspective.
  // Skipped when the relationship was already deterministically oriented above:
  // these are last-resort heuristics and must not clobber an explicit result.
  try {
    const userWtId = String(userWtIdRaw || "").toLowerCase();
    const userColloq = String(userColloquialNameRaw || "")
      .trim()
      .toLowerCase();
    const h3Html = firstP?.innerHTML || "";
    const parentRelMatch = relationshipAlreadyOriented
      ? null
      : h3Html.match(/is\s+(?:the\s+)?([a-z0-9\-\s]+?)\s+of\s+<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/i);
    if (parentRelMatch) {
      const rel = normalizeLegacyRelationLabel(parentRelMatch[1]);
      const href = decodeURIComponent(parentRelMatch[2] || "");
      const linkText = String(parentRelMatch[3] || "")
        .trim()
        .toLowerCase();
      const hrefWtId = (href.split("/").pop() || "").replace(/[?#].*$/, "").toLowerCase();
      // The WT ID in the link is decisive: relatives often share the user's
      // first name, so only compare names when the link has no usable WT ID.
      const linkIsUser = hrefWtId ? userWtId && hrefWtId === userWtId : userColloq && linkText === userColloq;
      if (rel && linkIsUser) {
        derivedRelationship = rel;
        console.log("[WBE dist-rel] legacy parent-link override:", {
          userWtId,
          hrefWtId,
          linkText,
          derivedRelationship,
        });
      }
    }
  } catch (e) {
    console.log("[WBE dist-rel] legacy parent-link override parse error", e);
  }

  // Private-profile variant:
  // relation often appears in span.ancestor_1 like:
  // "[Private] is the daughter of <a href='/wiki/Person-123'>Test Person</a>"
  // If that linked WTID is the logged-in user, relation is taken from that phrase.
  // Only valid for single-step paths: in longer paths ancestor_1 relates the
  // user to their parent, not the profile to the user. Also skipped when the
  // relationship was already deterministically oriented above.
  try {
    const userWtId = String(userWtIdRaw || "").toLowerCase();
    const singleStepPath = !doc.querySelector("span.ancestor_2");
    const anc1Html =
      relationshipAlreadyOriented || !singleStepPath ? "" : doc.querySelector("span.ancestor_1")?.innerHTML || "";
    const relLinkMatch = anc1Html.match(
      /is\s+(?:the\s+)?([a-z0-9\-\s]+?)\s+of\s+<a[^>]*href=["'][^"']*\/wiki\/([^"'\/?#]+)[^"']*["'][^>]*>([^<]*)<\/a>/i
    );
    if (relLinkMatch) {
      const rel = normalizeLegacyRelationLabel(relLinkMatch[1]);
      const hrefWtId = String(relLinkMatch[2] || "").toLowerCase();
      const linkText = String(relLinkMatch[3] || "")
        .trim()
        .toLowerCase();
      // The linked WT ID is decisive; a name match alone is not enough because
      // relatives often share the user's first name (e.g. father named after son).
      if (rel && userWtId && hrefWtId === userWtId) {
        derivedRelationship = rel;
        console.log("[WBE dist-rel] legacy ancestor_1 user-link override:", {
          userWtId,
          hrefWtId,
          linkText,
          derivedRelationship,
        });
      }
    }
  } catch (e) {
    console.log("[WBE dist-rel] legacy ancestor_1 user-link override parse error", e);
  }

  // Minimal no-link override:
  // If ancestor_1 says "<user first name> is the son/daughter/child of ..."
  // then the relationship shown should be from the profile to the user,
  // i.e. father/mother/parent (based on profile gender).
  try {
    const headlineIsSiblingOrCousin = /\bare\s+(siblings?|cousins?)\b/i.test(firstPText);
    const headlineIsDirectParentChild = /\bis\s+the\s+(son|daughter|child|father|mother|parent)\b/i.test(firstPText);
    const userColloq = String(userColloquialNameRaw || "")
      .trim()
      .toLowerCase();
    const ancestorLine =
      doc
        .querySelector("span.ancestor_1")
        ?.textContent.replace(/[\t\n ]+/g, " ")
        .trim() || "";
    const m = relationshipAlreadyOriented
      ? null
      : ancestorLine.match(/^(.+?)\s+is\s+the\s+(daughter|son|child)\s+of\b/i);
    if (m && userColloq) {
      const subject = String(m[1] || "")
        .replace(/^\d+\.\s*/, "")
        .trim()
        .toLowerCase();
      const sentenceRel = String(m[2] || "").toLowerCase();
      if (
        !headlineIsSiblingOrCousin &&
        headlineIsDirectParentChild &&
        subject === userColloq &&
        /^(daughter|son|child)$/i.test(sentenceRel)
      ) {
        derivedRelationship =
          profilePerson?.Gender === "Male" ? "father" : profilePerson?.Gender === "Female" ? "mother" : "parent";
        console.log("[WBE dist-rel] legacy user-subject override:", {
          userColloq,
          ancestorLine,
          derivedRelationship,
        });
      }
    }
  } catch (e) {
    console.log("[WBE dist-rel] legacy user-subject override parse error", e);
  }

  return derivedRelationship;
}
