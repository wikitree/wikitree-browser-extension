import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { getProfilePersonInfo } from "../../core/common";
import { isLikelyMarriedNoChildrenPrompt } from "./chat_married_no_children_filter";
import { isLikelyParentAgeAtBirthPrompt } from "./chat_parent_age_filter";
import { isLikelySiblingBirthGapPrompt } from "./chat_sibling_birth_gap_filter";
import { isLikelySpousalAgeGapPrompt } from "./chat_spouse_age_gap_filter";
import { isLocationTopicCategoryPrompt } from "./chat_place_topic_category";

function extractNamesFromPrompt(prompt) {
  if (!prompt || typeof prompt !== "string") return [];
  const nameMatches = prompt.match(/\b[A-Z][a-zA-Z0-9_]*(?:['’]s)?\b/g) || [];
  const cleanedNames = nameMatches.map((name) => name.replace(/['’]s$/, "").trim());
  return Array.from(new Set(cleanedNames));
}

async function appendProfileContextForCandidates(conversationContext, prompt) {
  let nextContext = String(conversationContext || "");
  const nameCandidates = extractNamesFromPrompt(prompt);
  const profilePersonInfo = getProfilePersonInfo();
  const seenProfileKeys = new Set();

  async function appendProfileContext(profile, label = "") {
    if (!profile || typeof profile !== "object") {
      return;
    }

    const displayName = profile.displayName || profile.RealName || profile.Name || profile.FullName || "unknown";
    const profileKey = String(profile.Name || profile.Id || "").trim();
    nextContext += `\n\nContext on ${label || displayName}:\n${JSON.stringify(profile, null, 2)}`;

    if (!profileKey || seenProfileKeys.has(profileKey)) {
      return;
    }
    seenProfileKeys.add(profileKey);

    try {
      console.debug("wbe: explicit AI mode fetching profile context", { profileKey, displayName, label });
      const [fullProfile, status, pageName] = await WikiTreeAPI.getProfile(
        "Chat",
        profileKey,
        "Bio,Sources,Notes,Categories,Name,RealName,Id",
        {
          bioFormat: "wiki",
          resolveRedirect: 1,
        }
      );
      if (fullProfile) {
        const bio = fullProfile?.Bio || "";
        const sources = (Array.isArray(fullProfile?.Sources) ? fullProfile.Sources : [])
          .map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)))
          .join("\n");
        const notes = (Array.isArray(fullProfile?.Notes) ? fullProfile.Notes : [])
          .map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)))
          .join("\n");
        const categories = fullProfile?.Categories ? String(fullProfile.Categories) : "";
        const rawProfileJson = JSON.stringify(fullProfile, null, 2);
        nextContext += [
          `\n\nFull profile context for ${fullProfile.RealName || fullProfile.Name || displayName} (${
            pageName || profileKey
          }):`,
          bio ? `BIO:\n${bio}` : "",
          sources ? `SOURCES:\n${sources}` : "",
          notes ? `NOTES:\n${notes}` : "",
          categories ? `CATEGORIES:\n${categories}` : "",
          rawProfileJson ? `GETPROFILE_JSON:\n${rawProfileJson}` : "",
          status ? `PROFILE STATUS: ${status}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");
        console.debug("wbe: explicit AI mode included full profile context", {
          profileKey,
          pageName,
          bioLength: bio.length,
          sourcesLength: sources.length,
          notesLength: notes.length,
          categoriesLength: categories.length,
          rawProfileLength: rawProfileJson.length,
        });
      }
    } catch (error) {
      console.debug("wbe: explicit AI mode failed to fetch full profile context", {
        profileKey,
        error,
      });
      nextContext += `\n\nNote: failed to fetch full bio context for ${displayName} (${profileKey}).`;
    }
  }

  if (profilePersonInfo && !Array.isArray(profilePersonInfo)) {
    await appendProfileContext(profilePersonInfo, "current page profile");
  }

  for (const name of nameCandidates) {
    let profile = null;
    const needle = String(name || "").toLowerCase();
    if (Array.isArray(profilePersonInfo)) {
      profile = profilePersonInfo.find((person) => {
        const check = String(
          person?.displayName || person?.RealName || person?.Name || person?.FullName || ""
        ).toLowerCase();
        return check.includes(needle);
      });
    } else if (profilePersonInfo && typeof profilePersonInfo === "object") {
      const check = String(
        profilePersonInfo.displayName ||
          profilePersonInfo.RealName ||
          profilePersonInfo.Name ||
          profilePersonInfo.FullName ||
          ""
      ).toLowerCase();
      if (check.includes(needle)) {
        profile = profilePersonInfo;
      }
    }

    if (profile) {
      await appendProfileContext(profile);
    }
  }

  return nextContext;
}

function getVisibleSearchMode(chatPopupId) {
  const input = document.getElementById("wbe-chat-input");
  if (!input) {
    return null;
  }

  const popup = input.closest(`#${chatPopupId}`);
  if (!popup) {
    return null;
  }

  const controls = popup.querySelector("#wbe-chat-mode-controls");
  if (!controls) {
    return null;
  }

  const isVisible = !!(controls.offsetWidth || controls.offsetHeight || controls.getClientRects().length);
  if (!isVisible) {
    return null;
  }

  const checked = controls.querySelector('input[name="wbe-chat-mode"]:checked');
  return checked?.value || null;
}

function shouldUseExplicitSearchMode(prompt, mode) {
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt || !mode) {
    return false;
  }

  return ["wt", "wtplus", "ai"].includes(String(mode).trim().toLowerCase());
}

function isWtPlusOnlyPrompt(prompt) {
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt) {
    return false;
  }

  return [
    /(?:^|\b)category\s*[:\-]?/i,
    /\b.+?\s+category\b/i,
    /(?:^|\b)template\s*[:\-]?/i,
    /\bsuggestions?\s*=/i,
    /\bnotables\b/i,
    /\bsticker\b/i,
    /\bcategory\s+word\b/i,
    /\bcategoryfull\s*=|\bcategoryword\s*=|\btemplatetext\s*=|\btree\s*=|\bancestors\s*=|\bdescendants\s*=|\bcc7\s*=/i,
  ].some((pattern) => pattern.test(normalizedPrompt));
}

function isLikelyWtPlusFilterPrompt(prompt) {
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt) {
    return false;
  }

  if (isLikelyParentAgeAtBirthPrompt(normalizedPrompt)) {
    return true;
  }

  if (isLikelySpousalAgeGapPrompt(normalizedPrompt)) {
    return true;
  }

  if (isLikelyMarriedNoChildrenPrompt(normalizedPrompt)) {
    return true;
  }

  if (isLikelySiblingBirthGapPrompt(normalizedPrompt)) {
    return true;
  }

  // "<place> <topic>" (e.g. "Chicago military") expands to a Location +
  // CategoryWord OR query, which only WT+ can run.
  if (isLocationTopicCategoryPrompt(normalizedPrompt)) {
    return true;
  }

  // WT+ DNA and raw status/family magic tokens (mtDNA, Unsourced, NoFather, …)
  // only exist in the WT+ query language, so a prompt containing one — even
  // with just a surname ("Anderson mtDNA") — belongs in WT+, not person search.
  // (\bdna\b above can't match inside "mtDNA", so these need explicit tokens.)
  const hasWtPlusMagicToken =
    /\b(?:mt-?dna|y-?dna|au-?dna)\b/i.test(normalizedPrompt) ||
    /(?:^|\s)(?:Unsourced|Unconnected|Orphaned?|PPP|ProjectManaged|NeverEdited|GEDCOMJunk|SourceJunk|IsInWikiData|NoFather|NoMother|NoParents|NoSpouses|NoChildren|NoGender|pre1500)(?=\s|$)/i.test(
      normalizedPrompt
    );
  if (hasWtPlusMagicToken) {
    return true;
  }

  const hasAgeConstraint = /\bage\s*(?:=|is|of)?\s*\d{1,3}\b/i.test(normalizedPrompt);
  const hasYearConstraint =
    /\b(?:born|died|b\.|d\.)\s+(?:before|after|in|around)?\s*\d{4}\b|\b\d{4}\s*(?:birth|death)\b|\b(?:pre|post)[-\s]?\d{4}\b|\b(?:before|after)\s+\d{4}\b|\b(?:earlier|later)\s+than\s+\d{4}\b|\bprior\s+to\s+\d{4}\b|\b(?:birth|death)\s+year\b[^,]{0,40}\b\d{4}\b/i.test(
      normalizedPrompt
    );
  const hasConnectedFilter = /\bconnected\b|\bdna\b/i.test(normalizedPrompt);
  const hasExplicitLocationCue =
    /\b(?:in|from|at|near|around|location|place|town|city|county|state|country|region|village)\b/i.test(
      normalizedPrompt
    );
  const hasAggregateEventCue = /\b(?:births|deaths|burials|marriages)\b/i.test(normalizedPrompt);
  const hasRelationCountCue =
    /\b(?:more\s+than|over|under|less\s+than|fewer\s+than|exactly|at\s+least|at\s+most)\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s+(?:children|kids?|siblings?|marriages?)\b/i.test(
      normalizedPrompt
    );
  const hasMarriageTemporalCue =
    /\b(?:married|marriage(?:\s+date)?)\s+(?:before|after|between)\s+\d{4}\b/i.test(normalizedPrompt);
  const hasCommaScopedMarriageCue =
    /(?:^|,)\s*[^,]{2,40}\s*,\s*(?:married|marriage(?:\s+date)?)\s+(?:before|after|between)\b/i.test(
      normalizedPrompt
    );

  const hasTemporalConstraint = hasAgeConstraint || hasYearConstraint;

  // temporal + connected combination is a strong WT+ filter signal.
  if (hasTemporalConstraint && hasConnectedFilter) {
    return true;
  }

  // Comma-separated prompts like "more than six children, Cheshire, married after 1899"
  // are broad WT+ filters even though the location is implied rather than introduced by "in/from".
  if (hasRelationCountCue && hasMarriageTemporalCue && (hasExplicitLocationCue || hasCommaScopedMarriageCue)) {
    return true;
  }

  return (
    (hasTemporalConstraint && hasAggregateEventCue) ||
    (hasTemporalConstraint && hasExplicitLocationCue) ||
    (hasConnectedFilter && (hasAgeConstraint || hasExplicitLocationCue))
  );
}

function isLikelyRelationshipBioPrompt(prompt) {
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt) {
    return false;
  }

  const hasBioCue = /\b(?:bio|bios|biography|biographies)\b/i.test(normalizedPrompt);
  const hasRelationshipCue =
    /\b(?:husband|wife|spouse|parent|parents|father|mother|child|children|sibling|siblings|ancestor|ancestors|descendant|descendants)\b/i.test(
      normalizedPrompt
    );
  const hasPossessiveChain =
    /['’]s\s+(?:husband|wife|spouse|parent|parents|father|mother|child|children|sibling|siblings)\b/i.test(
      normalizedPrompt
    );

  return (hasBioCue && hasRelationshipCue) || (hasBioCue && hasPossessiveChain);
}

function hasMinimumWtSearchIdentifiers(prompt) {
  /**
   * Check if a query has the minimum identifiers needed for WT API search.
   * WT search requires either:
   * 1. A surname (recognizable name, 2+ letters, capitalized)
   * 2. A WT ID (WikiTree ID format)
   * 3. A numeric ID (bare digits)
   *
   * If NONE are present, the query cannot be resolved by WT API directly.
   * Temporal filters like "born before 1650" without a surname are meaningless
   * to WT search, so they should route to WT+ instead.
   */
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt) {
    return false;
  }

  // Check for WT ID (format: Letter+Number+Letter+Number, or just ID= syntax)
  if (/\b(?:wtid|wikitree\s+id|profile\s+id|id)\s*[=:]?\s*([A-Z]\d+[A-Z]\d+)/i.test(normalizedPrompt)) {
    return true;
  }

  // Check for bare numeric ID (e.g., just a number like "12345")
  if (/\b\d{5,}\b/.test(normalizedPrompt)) {
    return true;
  }

  // Check for recognizable surnames/names (capitalized words, 2+ letters, not common words)
  const commonWords = new Set([
    "the",
    "and",
    "or",
    "born",
    "died",
    "from",
    "with",
    "have",
    "who",
    "was",
    "are",
    "been",
    "been",
    "has",
    "had",
    "his",
    "her",
    "but",
    "not",
    "all",
    "one",
    "two",
    "three",
    "more",
    "some",
    "any",
    "only",
    "very",
    "no",
    "yes",
    "this",
    "that",
    "what",
    "when",
    "where",
    "why",
    "how",
    "which",
    "in",
    "at",
    "by",
    "to",
    "of",
    "for",
    "before",
    "after",
    "between",
    "during",
    "around",
    "near",
    "devon",
    "england",
    "london",
    "unknown",
  ]);

  // Extract capitalized words (potential surnames)
  const capitalizedWords = (normalizedPrompt.match(/\b[A-Z][a-z]{1,}\b/g) || [])
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 2 && !commonWords.has(w));

  // If we found at least one recognizable surname/name, it's valid for WT search
  if (capitalizedWords.length > 0) {
    return true;
  }

  // No identifiers found
  return false;
}

function getEffectiveExplicitMode(prompt, selectedMode) {
  const normalizedMode = String(selectedMode || "")
    .trim()
    .toLowerCase();
  if (normalizedMode === "wt" && isWtPlusOnlyPrompt(prompt)) {
    return "wtplus";
  }

  return normalizedMode;
}

function stripSurroundingQuotes(value) {
  return String(value || "")
    .trim()
    .replace(/^['"\s]+|['"\s]+$/g, "")
    .trim();
}

function quoteWtPlusValue(value) {
  const text = stripSurroundingQuotes(value);
  if (!text) return "";
  return /\s|,/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
}

function extractWtPlusFieldValue(queryText, fieldName) {
  const escapedField = String(fieldName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escapedField}=((?:"[^"]*")|(?:'[^']*')|(?:[^\\s]+))`, "i");
  const match = String(queryText || "").match(re);
  return stripSurroundingQuotes(match?.[1] || "");
}

function tokenizeWtPlusQueryUnits(query) {
  const rawTokens = String(query || "").match(/[A-Za-z][\w]*="[^"]*"|\S+/g) || [];
  const units = [];
  for (let index = 0; index < rawTokens.length; index += 1) {
    if (/^NOT$/i.test(rawTokens[index]) && rawTokens[index + 1]) {
      units.push(`NOT ${rawTokens[index + 1]}`);
      index += 1;
    } else {
      units.push(rawTokens[index]);
    }
  }
  return units;
}

function classifyWtPlusQueryUnit(unit) {
  const term = String(unit || "").trim();
  const fieldMatch = term.match(/^([A-Za-z][\w]*)=/);
  if (fieldMatch) {
    const value = term
      .slice(fieldMatch[0].length)
      .replace(/^"|"$/g, "")
      .trim();
    return { type: "field", field: fieldMatch[1].toLowerCase(), value };
  }
  if (/^\d{1,2}Cen$/i.test(term)) return { type: "century" };
  if (/^\d{4}s$/i.test(term)) return { type: "decade" };
  if (/^B\d{4}$/i.test(term)) return { type: "birthYear" };
  if (/^D\d{4}$/i.test(term)) return { type: "deathYear" };
  return { type: "raw" };
}

/**
 * Merge a parsed refinement ("Unconnected", 'Location="Cheshire, England"')
 * into the previous WT+ query for Continue-mode follow-ups.
 *
 * - Same field, more specific value ("Cheshire" -> "Cheshire, England"):
 *   replace the old term.
 * - Same field, unrelated value (Location=Cheshire vs Location=Devon): the
 *   prompt is a new search, not a refinement — return "" so normal routing
 *   runs.
 * - Same-kind date scope (19Cen -> 20Cen): replace (an adjustment).
 * - sql= terms: combine into one expression with And.
 * - Anything new: append.
 *
 * Returns "" when the merge is declined or adds nothing.
 */
export function mergeWtPlusRefinementIntoQuery(previousWtPlusQuery, refinementQuery) {
  const previous = String(previousWtPlusQuery || "").trim();
  const refinement = String(refinementQuery || "").trim();
  if (!previous || !refinement) return "";
  // OR groups need branch-aware merging; decline rather than corrupt them.
  if (/\bOR\b/.test(previous) || /\bOR\b/.test(refinement)) return "";

  const merged = tokenizeWtPlusQueryUnits(previous);
  let changed = false;
  for (const unit of tokenizeWtPlusQueryUnits(refinement)) {
    const cls = classifyWtPlusQueryUnit(unit);

    if (cls.type === "field" && cls.field === "sql") {
      const index = merged.findIndex((existing) => /^sql="/i.test(existing));
      if (index >= 0) {
        const previousSql = merged[index].replace(/^sql="/i, "").replace(/"$/, "");
        const nextSql = unit.replace(/^sql="/i, "").replace(/"$/, "");
        if (previousSql !== nextSql) {
          merged[index] = `sql="${previousSql} And ${nextSql}"`;
          changed = true;
        }
      } else {
        merged.push(unit);
        changed = true;
      }
      continue;
    }

    if (cls.type === "field") {
      const index = merged.findIndex((existing) => {
        const existingCls = classifyWtPlusQueryUnit(existing);
        return existingCls.type === "field" && existingCls.field === cls.field;
      });
      if (index >= 0) {
        const oldValue = classifyWtPlusQueryUnit(merged[index]).value.toLowerCase();
        const newValue = cls.value.toLowerCase();
        if (newValue === oldValue) continue;
        if (newValue.includes(oldValue)) {
          merged[index] = unit;
          changed = true;
          continue;
        }
        if (oldValue.includes(newValue)) continue;
        return "";
      }
      merged.push(unit);
      changed = true;
      continue;
    }

    if (["century", "decade", "birthYear", "deathYear"].includes(cls.type)) {
      const index = merged.findIndex((existing) => classifyWtPlusQueryUnit(existing).type === cls.type);
      if (index >= 0) {
        if (merged[index].toLowerCase() !== unit.toLowerCase()) {
          merged[index] = unit;
          changed = true;
        }
        continue;
      }
      merged.push(unit);
      changed = true;
      continue;
    }

    if (!merged.some((existing) => existing.toLowerCase() === unit.toLowerCase())) {
      merged.push(unit);
      changed = true;
    }
  }

  if (!changed) return "";
  // WT+ rejects queries that start with sql=; keep sql terms at the end.
  const sqlUnits = merged.filter((unit) => /^sql="/i.test(unit));
  const plainUnits = merged.filter((unit) => !/^sql="/i.test(unit));
  return [...plainUnits, ...sqlUnits].join(" ").trim();
}

/**
 * Continue-mode helper for bare date-boundary follow-ups ("After 1920?",
 * "before 1850", "between 1900 and 1910", "1820s", "19th century").
 *
 * A bare boundary is ambiguous on its own (after what — birth or death?), so we
 * resolve it against the date field the PREVIOUS query already constrained. If
 * the previous query filtered death dates, "After 1920?" tightens that death
 * bound in place; if it filtered birth dates, it tightens the birth bound. When
 * the previous query has no date context, or has both birth and death dates, we
 * decline (return "") so normal routing runs and we never guess wrong.
 */
export function buildContextualDateFollowupQuery(previousWtPlusQuery, prompt) {
  const previous = String(previousWtPlusQuery || "").trim();
  const text = String(prompt || "")
    .trim()
    .replace(/[?.!]+$/g, "")
    .replace(/^(?:and|also|then|plus|but)\s+/i, "")
    .trim();
  if (!previous || !text) return "";
  // OR groups need branch-aware merging; decline rather than corrupt them.
  if (/\bOR\b/.test(previous)) return "";

  const eventCue = text.match(/\b(born|birth|died|death)\b/i);
  let op = "";
  let yearA = 0;
  let yearB = 0;
  let match;
  // The phrase must be essentially JUST a date boundary (optional born/died
  // cue), so richer prompts like "died after 1920 in Yorkshire" fall through.
  if ((match = text.match(/^(?:(?:born|birth|died|death)\s+)?(?:before|earlier\s+than|prior\s+to)\s+(\d{4})$/i))) {
    op = "before";
    yearA = Number.parseInt(match[1], 10);
  } else if ((match = text.match(/^(?:(?:born|birth|died|death)\s+)?(?:after|later\s+than|since)\s+(\d{4})$/i))) {
    op = "after";
    yearA = Number.parseInt(match[1], 10);
  } else if (
    (match = text.match(/^(?:(?:born|birth|died|death)\s+)?between\s+(\d{4})\s+(?:and|to)\s+(\d{4})$/i))
  ) {
    op = "between";
    yearA = Number.parseInt(match[1], 10);
    yearB = Number.parseInt(match[2], 10);
  } else if ((match = text.match(/^(?:(?:born|birth|died|death)\s+)?(?:in\s+)?(?:the\s+)?(\d{4})s$/i))) {
    op = "decade";
    yearA = Number.parseInt(match[1], 10);
  } else if (
    (match = text.match(/^(?:(?:born|birth|died|death)\s+)?(?:in\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\s+century$/i))
  ) {
    op = "century";
    yearA = Number.parseInt(match[1], 10);
  } else {
    return "";
  }
  if (!Number.isFinite(yearA)) return "";

  const hasDeathContext = /\[Death Date\]/i.test(previous) || /\bD\d{4}\b/.test(previous);
  const hasBirthContext = /\[Birth Date\]/i.test(previous) || /\bB\d{4}\b/.test(previous);
  let field = "";
  if (/\b(?:died|death)\b/i.test(eventCue?.[0] || "")) field = "Death Date";
  else if (/\b(?:born|birth)\b/i.test(eventCue?.[0] || "")) field = "Birth Date";
  else if (hasDeathContext && !hasBirthContext) field = "Death Date";
  else if (hasBirthContext && !hasDeathContext) field = "Birth Date";
  else return ""; // no date context, or ambiguous birth+death — don't guess.

  const startEdge = (year) => `${year}0000`;
  const endEdge = (year) => `${year}9999`;
  let expr = "";
  if (op === "before") expr = `([Default].[${field}].AsNumber < ${startEdge(yearA)})`;
  else if (op === "after") expr = `([Default].[${field}].AsNumber > ${endEdge(yearA)})`;
  else if (op === "between") {
    const lo = Math.min(yearA, yearB);
    const hi = Math.max(yearA, yearB);
    expr = `([Default].[${field}].AsNumber In ${startEdge(lo)}..${endEdge(hi)})`;
  } else if (op === "decade") {
    expr = `([Default].[${field}].AsNumber In ${startEdge(yearA)}..${endEdge(yearA + 9)})`;
  } else if (op === "century") {
    const start = (yearA - 1) * 100;
    expr = `([Default].[${field}].AsNumber In ${startEdge(String(start).padStart(4, "0"))}..${endEdge(
      String(start + 99).padStart(4, "0")
    )})`;
  }
  if (!expr) return "";

  // Replace an existing comparison on the same field in place; otherwise fold
  // the new expression into the sql= term (or add one).
  const fieldExprRe = new RegExp(`\\(\\[Default\\]\\.\\[${field}\\]\\.AsNumber[^)]*\\)`, "i");
  let result;
  if (fieldExprRe.test(previous)) {
    result = previous.replace(fieldExprRe, expr);
  } else if (/sql="/i.test(previous)) {
    result = previous.replace(/sql="([\s\S]*)"/i, (whole, inner) => `sql="${inner.trim()} And ${expr}"`);
  } else {
    result = `${previous} sql="${expr}"`;
  }
  result = result.trim();
  return result === previous ? "" : result;
}

function buildWtPlusOrFollowupBranch(prompt, previousWtPlusQuery) {
  const normalizedPrompt = String(prompt || "").trim();
  const previousQuery = String(previousWtPlusQuery || "").trim();
  if (!normalizedPrompt || !previousQuery) {
    return "";
  }

  const orBody = normalizedPrompt
    .replace(/^or\b[\s,:-]*/i, "")
    .replace(/[?.!]+$/g, "")
    .trim();
  if (!orBody) {
    return "";
  }

  const birthLocation = extractWtPlusFieldValue(previousQuery, "BirthLocation");
  const deathLocation = extractWtPlusFieldValue(previousQuery, "DeathLocation");
  const hasBirthYearContext = /\bB\d{4}\b/i.test(previousQuery) || Boolean(birthLocation);
  const hasDeathYearContext = /\bD\d{4}\b/i.test(previousQuery) || Boolean(deathLocation);

  const yearOnlyMatch = orBody.match(/^(\d{4})$/);
  if (yearOnlyMatch?.[1]) {
    const year = yearOnlyMatch[1];
    if (hasBirthYearContext && !hasDeathYearContext) {
      return [birthLocation ? `BirthLocation=${quoteWtPlusValue(birthLocation)}` : "", `B${year}`]
        .filter(Boolean)
        .join(" ");
    }
    if (hasDeathYearContext && !hasBirthYearContext) {
      return [deathLocation ? `DeathLocation=${quoteWtPlusValue(deathLocation)}` : "", `D${year}`]
        .filter(Boolean)
        .join(" ");
    }
    // If ambiguous, default to birth-year interpretation.
    return [birthLocation ? `BirthLocation=${quoteWtPlusValue(birthLocation)}` : "", `B${year}`]
      .filter(Boolean)
      .join(" ");
  }

  const inYearOnlyMatch = orBody.match(/^in\s+(\d{4})$/i);
  if (inYearOnlyMatch?.[1]) {
    const year = inYearOnlyMatch[1];
    if (hasBirthYearContext && !hasDeathYearContext) {
      return [birthLocation ? `BirthLocation=${quoteWtPlusValue(birthLocation)}` : "", `B${year}`]
        .filter(Boolean)
        .join(" ");
    }
    if (hasDeathYearContext && !hasBirthYearContext) {
      return [deathLocation ? `DeathLocation=${quoteWtPlusValue(deathLocation)}` : "", `D${year}`]
        .filter(Boolean)
        .join(" ");
    }
    return [birthLocation ? `BirthLocation=${quoteWtPlusValue(birthLocation)}` : "", `B${year}`]
      .filter(Boolean)
      .join(" ");
  }

  const bornInYearMatch = orBody.match(/^born\s+in\s+(\d{4})$/i);
  if (bornInYearMatch?.[1]) {
    const year = bornInYearMatch[1];
    return [birthLocation ? `BirthLocation=${quoteWtPlusValue(birthLocation)}` : "", `B${year}`]
      .filter(Boolean)
      .join(" ");
  }

  const diedInYearMatch = orBody.match(/^died\s+in\s+(\d{4})$/i);
  if (diedInYearMatch?.[1]) {
    const year = diedInYearMatch[1];
    return [deathLocation ? `DeathLocation=${quoteWtPlusValue(deathLocation)}` : "", `D${year}`]
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function mergeStructuredRows(baseResult, additiveResult, mergedTitle) {
  const baseRows = Array.isArray(baseResult?.rows) ? baseResult.rows : [];
  const extraRows = Array.isArray(additiveResult?.rows) ? additiveResult.rows : [];

  const mergedByKey = new Map();
  const makeKey = (row) => String(row?.wtid || row?.WTID || row?.Id || row?.id || row?.displayName || "").trim();

  baseRows.forEach((row) => {
    const key = makeKey(row);
    if (!key) return;
    mergedByKey.set(key, row);
  });

  extraRows.forEach((row) => {
    const key = makeKey(row);
    if (!key) return;
    if (!mergedByKey.has(key)) {
      mergedByKey.set(key, row);
    }
  });

  return {
    ...baseResult,
    title: mergedTitle || baseResult?.title || "Chat Results",
    rows: Array.from(mergedByKey.values()),
  };
}

function shouldTryAiFollowupIntentInWtPlus(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized) {
    return false;
  }

  // Obvious continuation/refinement phrasing.
  if (/^(?:and|also|then|plus|but)\b/i.test(normalized)) {
    return true;
  }
  if (/^(?:only|just|filter|count|group|sort|order|keep|show|list|exclude|without|not)\b/i.test(normalized)) {
    return true;
  }

  // Reference to existing result set.
  if (/\b(?:them|those|these|results?|current\s+result\s+set)\b/i.test(normalized)) {
    return true;
  }

  // Short, context-dependent follow-ups are usually refinements.
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return tokens.length <= 7;
}

function isLikelyPersonCentricPrompt(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized) {
    return false;
  }

  if (/\b[A-Za-z][A-Za-z0-9_]+-\d+\b/.test(normalized)) {
    return true;
  }

  if (
    /\b(my|me|ancestors?|descendants?|children|parents?|siblings?|spouses?|husband|wife|connection|relationship|cc\d+)\b/i.test(
      normalized
    )
  ) {
    return true;
  }

  if (/^(?:who\s+is|find|look\s+up|search\s+for)\s+/i.test(normalized)) {
    return true;
  }

  return false;
}

function extractPersonListCommandPrompt(prompt) {
  const text = String(prompt || "").trim();
  if (!text) {
    return null;
  }

  const match = text.match(
    /^\s*(?:person\s+list|people\s+list|candidate\s+list)(?:\s+(ai|wikidata|hybrid))?\s*[:\-]\s*([\s\S]+)$/i
  );
  if (!match?.[2]) {
    return null;
  }

  const promptText = String(match[2] || "").trim();
  if (!promptText) {
    return null;
  }

  return {
    strategy: String(match[1] || "ai")
      .trim()
      .toLowerCase(),
    prompt: promptText,
  };
}

async function shouldAutoRouteWtPromptToWtPlus({ prompt, getChatAiConfig, buildRecentUserMessagesForAi }) {
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt) {
    return false;
  }

  if (isWtPlusOnlyPrompt(normalizedPrompt)) {
    return true;
  }

  if (isLikelyWtPlusFilterPrompt(normalizedPrompt)) {
    return true;
  }

  if (isLikelyPersonCentricPrompt(normalizedPrompt)) {
    return false;
  }

  let provider = "";
  let key = "";
  let model = "";
  try {
    const aiConfig = (await getChatAiConfig()) || {};
    provider = aiConfig.provider || "";
    key = aiConfig.key || "";
    model = aiConfig.model || "";
  } catch (error) {
    console.debug("wbe: WT/WT+ auto-route classifier config unavailable", {
      error: String(error?.message || error),
    });
    return false;
  }
  if (!key) {
    return false;
  }

  const recentUserMessages = buildRecentUserMessagesForAi?.(3) || "";
  const classifierPrompt = [
    "Classify whether this WikiTree chat request should run in WT mode or WT+ mode.",
    'Return STRICT JSON only: {"targetMode":"wt"|"wtplus","confidence":0..1,"reason":"..."}.',
    "Use wtplus when the query is broad/filter-like (locations, categories, templates, stickers, status slices, date+place constraints) and does not identify a specific person.",
    "Also use wtplus for kinship anomaly filters such as siblings born within X months of each other, parent age at a child's birth, large spouse age gaps, or married-but-no-children slices.",
    "Use wt when the query is about a specific person, relationship, CC/ancestor/descendant list, or profile lookup.",
    recentUserMessages ? `Recent user messages:\n${recentUserMessages}` : "",
    `Request: ${normalizedPrompt}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await chrome.runtime.sendMessage({
      action: "chatWithAI",
      prompt: classifierPrompt,
      provider,
      key,
      model,
      includeApiDocContext: false,
      pageContext: {
        url: window.location.href,
        title: document.title,
      },
    });

    if (!response?.success || !response?.response) {
      return false;
    }

    const raw = String(response.response || "").trim();
    const jsonTextMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonTextMatch ? jsonTextMatch[0] : raw);
    const targetMode = String(parsed?.targetMode || "")
      .trim()
      .toLowerCase();
    const confidence = Number(parsed?.confidence);

    return targetMode === "wtplus" && Number.isFinite(confidence) && confidence >= 0.55;
  } catch (error) {
    console.debug("wbe: ai WT/WT+ classifier failed", error);
    return false;
  }
}

export async function handleExplicitSearchMode({
  prompt,
  chatPopupId,
  hasStructuredResult,
  getLastStructuredResult,
  ChatIntent,
  routeChatPrompt,
  buildRecentConversationForAi,
  buildRecentUserMessagesForAi,
  getChatAiConfig,
  appendMessage,
  tryHandleProfileSearchPrompt,
  handleChatResult,
  extractFollowupTableFilterText,
  openResultsTable,
  tryHandleAiPlannedIntent,
  setExplicitMode,
  continueQueryContext,
  translateWtPlusRefinementTerms,
  reRunSavedWtPlusQuery,
  getLastExecutedWtPlusQuery,
}) {
  console.debug("wbe: checking chat mode for prompt", { prompt });
  const selectedMode = getVisibleSearchMode(chatPopupId);
  const mode = getEffectiveExplicitMode(prompt, selectedMode);
  console.debug("wbe: mode detection", { selectedMode, mode, prompt: prompt.substring(0, 60) });
  if (!mode || !shouldUseExplicitSearchMode(prompt, mode)) {
    return { handled: false, prompt };
  }

  const forcedPersonListCommand = extractPersonListCommandPrompt(prompt);
  if (forcedPersonListCommand?.prompt) {
    try {
      const searchResult = await tryHandleProfileSearchPrompt(
        {
          chatModeOverride: "ai",
          forceAiCandidateDiscovery: true,
          aiCandidateDiscoveryStrategy: forcedPersonListCommand.strategy || "ai",
        },
        forcedPersonListCommand.prompt
      );
      if (searchResult) {
        await handleChatResult(typeof searchResult === "string" ? { message: searchResult } : searchResult);
        return { handled: true, prompt: forcedPersonListCommand.prompt };
      }

      appendMessage(
        "assistant",
        "Person list completed, but no displayable result was returned. Please try again with a smaller count or narrower criteria."
      );
      return { handled: true, prompt: forcedPersonListCommand.prompt };
    } catch (forcedListErr) {
      console.debug("wbe: forced person list pipeline failed", forcedListErr);
      appendMessage(
        "assistant",
        "I couldn't complete the Person list request. Try a narrower criteria phrase after 'Person list:'."
      );
      return { handled: true, prompt: forcedPersonListCommand.prompt };
    }
  }

  if (mode === "ai") {
    const { provider, key, model } = await getChatAiConfig();
    if (!key) {
      appendMessage("assistant", "No API key configured for AI chat.");
      return { handled: true, prompt };
    }

    let conversationContext = buildRecentConversationForAi();
    const recentUserMessages = buildRecentUserMessagesForAi?.(4) || "";
    conversationContext = await appendProfileContextForCandidates(conversationContext, prompt);

    const aiPrompt = [
      "You are assisting inside the WikiTree Browser Extension chat.",
      recentUserMessages ? `Recent user messages:\n${recentUserMessages}` : "",
      conversationContext ? `Recent conversation:\n${conversationContext}` : "",
      `Current user request: ${prompt}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    console.debug("wbe: explicit AI mode outbound prompt", {
      prompt,
      aiPrompt,
      hasProfileBio: aiPrompt.includes("BIO:"),
      promptLength: aiPrompt.length,
    });

    const response = await chrome.runtime.sendMessage({
      action: "chatWithAI",
      prompt: aiPrompt,
      provider,
      key,
      model,
      includeApiDocContext: true,
      apiDocUserQuery: prompt,
      apiDocMaxChars: 4500,
      pageContext: {
        url: window.location.href,
        title: document.title,
      },
    });

    if (response?.success) {
      appendMessage("assistant", response.response || "No response text returned.");
    } else {
      appendMessage("assistant", `Error: ${response?.error || "AI request failed."}`);
    }
    return { handled: true, prompt };
  }

  if (mode === "wt" || mode === "wtplus") {
    const normalizedPrompt = String(prompt || "")
      .replace(/^\s*search[:\s]+/i, "")
      .trim();
    let shouldSkipFinalSearch = false;
    // The previous WT+ query for Continue-mode merging. Prefer the loaded
    // result's query; fall back to the last executed query so refinements
    // still work after a "too many profiles" run that produced no table.
    const structuredResultForQuery =
      hasStructuredResult && typeof getLastStructuredResult === "function" ? getLastStructuredResult() : null;
    const previousWtPlusQueryForMerge =
      String(structuredResultForQuery?.wtPlusQuery || "").trim() ||
      String((typeof getLastExecutedWtPlusQuery === "function" && getLastExecutedWtPlusQuery()) || "").trim();
    if (mode === "wtplus" && hasStructuredResult) {
      const structuredResult = typeof getLastStructuredResult === "function" ? getLastStructuredResult() : null;
      const previousWtPlusQuery = String(structuredResult?.wtPlusQuery || "").trim();
      if (/^or\b/i.test(normalizedPrompt) && previousWtPlusQuery) {
        const additiveBranch = buildWtPlusOrFollowupBranch(normalizedPrompt, previousWtPlusQuery);
        if (additiveBranch) {
          try {
            const additiveResult = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, additiveBranch);
            if (additiveResult?.table?.rows?.length) {
              const mergedTable = mergeStructuredRows(
                structuredResult,
                {
                  ...additiveResult.table,
                  wtPlusQuery: `${previousWtPlusQuery} OR ${additiveBranch}`,
                },
                `${structuredResult?.title || "WT+ results"} OR ${additiveBranch}`
              );
              mergedTable.wtPlusQuery = `${previousWtPlusQuery} OR ${additiveBranch}`;
              mergedTable.wtPlusSearchType = "text";

              await handleChatResult({
                message: `Added OR branch "${additiveBranch}" and merged results: ${
                  structuredResult?.rows?.length || 0
                } + ${additiveResult.table.rows.length} -> ${mergedTable.rows.length} unique rows.`,
                table: mergedTable,
                actions: [
                  {
                    label: "Open in WT+",
                    actionType: "wtplus-open",
                    wtPlusQuery: mergedTable.wtPlusQuery,
                    wtPlusSearchType: "text",
                  },
                ],
                autoOpen: true,
              });
              return { handled: true, prompt: normalizedPrompt };
            }
          } catch (orBranchErr) {
            console.debug("wbe: wtplus OR follow-up merge failed", orBranchErr);
          }
        }
      }
    }

    const followupRoute =
      typeof routeChatPrompt === "function"
        ? routeChatPrompt(normalizedPrompt, { hasStructuredResult: Boolean(hasStructuredResult) })
        : null;
    if (hasStructuredResult && followupRoute?.intent === ChatIntent?.LAST_RESULT_OPERATION) {
      // Let the main deterministic router execute this so conversational
      // follow-ups like "And died in Yorkshire?" refine the current
      // in-chat result set instead of launching a fresh global search.
      return { handled: false, prompt: normalizedPrompt };
    }

    // "Continue" radio: build on the previous WT+ query. A follow-up that
    // parses to WT+ terms ("unconnected", "Cheshire, England", "born after
    // 1850") is merged into the last executed query and re-run server-side.
    // Conflicting terms (a different place or surname) mean the user started
    // a new search, so the merge declines and normal routing takes over.
    // This runs in the visible "Search" (wt) mode as well as auto-routed
    // "wtplus" mode. The UI has no separate WT+ radio, so after a WT+ result
    // the follow-up arrives in "wt" mode; gating on "wtplus" alone silently
    // disabled every Continue follow-up.
    if (
      (mode === "wt" || mode === "wtplus") &&
      continueQueryContext &&
      previousWtPlusQueryForMerge &&
      !/^or\b/i.test(normalizedPrompt) &&
      (!followupRoute ||
        [ChatIntent?.PROFILE_SEARCH, ChatIntent?.FALLBACK_AI, ChatIntent?.LAST_RESULT_OPERATION].includes(
          followupRoute.intent
        )) &&
      typeof translateWtPlusRefinementTerms === "function" &&
      typeof reRunSavedWtPlusQuery === "function"
    ) {
      // A bare date boundary ("After 1920?") is resolved against the previous
      // query's own date field before the generic term parser sees it, since
      // that parser can't tell whether "after" means birth or death.
      const contextualDateQuery = buildContextualDateFollowupQuery(previousWtPlusQueryForMerge, normalizedPrompt);
      const refinement = contextualDateQuery ? null : translateWtPlusRefinementTerms(normalizedPrompt);
      // A refinement that introduces a person name (FirstName/LastName/…) is a
      // fresh person search, not a narrowing of the previous filter. In the
      // default Search mode, let those fall through to normal routing rather
      // than silently folding a name into the prior location/date query.
      const refinementIntroducesName = /\b(?:FirstName|LastName|LastNameAtBirth|AllLastNames)=/i.test(
        refinement?.query || ""
      );
      const refinementLabel = contextualDateQuery
        ? normalizedPrompt.replace(/[?.!]+$/g, "").trim()
        : refinement?.query || "";
      const mergedQuery = contextualDateQuery
        ? contextualDateQuery
        : refinement?.query && !refinementIntroducesName
          ? mergeWtPlusRefinementIntoQuery(previousWtPlusQueryForMerge, refinement.query)
          : "";
      if (mergedQuery) {
        try {
          const mergedResult = await reRunSavedWtPlusQuery(mergedQuery, "text");
          if (mergedResult) {
            const base = typeof mergedResult === "string" ? { message: mergedResult } : mergedResult;
            await handleChatResult({
              ...base,
              message: `Continuing the previous search with "${refinementLabel}". ${base.message || ""}`.trim(),
            });
            return { handled: true, prompt: normalizedPrompt };
          }
        } catch (continueMergeErr) {
          console.debug("wbe: wtplus continue-mode merge failed", continueMergeErr);
        }
      }
    }

    if (mode === "wt") {
      console.debug("wbe: entering wt mode block", { normalizedPrompt: normalizedPrompt.substring(0, 60) });
      const routed =
        typeof routeChatPrompt === "function"
          ? routeChatPrompt(normalizedPrompt, { hasStructuredResult: Boolean(hasStructuredResult) })
          : null;
      console.debug("wbe: wt mode routing decision", { intent: routed?.intent, hasStructuredResult });
      const deterministicWtIntentSet = new Set([
        ChatIntent?.CC7_LOCATION_FILTER,
        ChatIntent?.CC_SUMMARY,
        ChatIntent?.RELATION_COUNT,
        ChatIntent?.CONNECTION_LOOKUP,
        ChatIntent?.PROFILE_FAMILY_CONNECTION,
        ChatIntent?.ANCESTOR_AVG_AGE_AT_DEATH,
        ChatIntent?.PERSON_AGE_AT_DEATH,
        ChatIntent?.ANCESTOR_LIST,
        ChatIntent?.DESCENDANT_LIST,
        ChatIntent?.SPOUSE_LIST,
        ChatIntent?.SPOUSE_BIO,
        ChatIntent?.LAST_RESULT_OPERATION,
      ]);

      if (deterministicWtIntentSet.has(routed?.intent)) {
        console.debug("wbe: explicit wt mode deferring deterministic intent to main flow", {
          intent: routed?.intent,
          prompt: normalizedPrompt.substring(0, 60),
        });
        return { handled: false, prompt: normalizedPrompt };
      }

      // Relationship-bio prompts (for example "Rebecca's husband's parents' bios")
      // are better handled by dedicated bio/relationship handlers in main flow.
      if (isLikelyRelationshipBioPrompt(normalizedPrompt)) {
        if (typeof tryHandleAiPlannedIntent === "function") {
          try {
            const aiPlannedResult = await tryHandleAiPlannedIntent(normalizedPrompt);
            if (aiPlannedResult) {
              await handleChatResult(
                typeof aiPlannedResult === "string" ? { message: aiPlannedResult } : aiPlannedResult
              );
              return { handled: true, prompt: normalizedPrompt };
            }
          } catch (aiPlanErr) {
            console.debug("wbe: relationship-bio AI planner attempt failed", aiPlanErr);
          }
        }
        console.debug("wbe: explicit wt mode deferring relationship-bio prompt to main flow", {
          prompt: normalizedPrompt.substring(0, 60),
        });
        return { handled: false, prompt: normalizedPrompt };
      }

      // Do not execute explicit WT search when prompt is clearly WT+-only.
      // Let the main router run once so we avoid double-rendering during auto-route.
      if (isWtPlusOnlyPrompt(normalizedPrompt)) {
        console.debug("wbe: explicit wt mode deferring WT+-only prompt to main flow", {
          prompt: normalizedPrompt.substring(0, 60),
        });
        return { handled: false, prompt: normalizedPrompt };
      }

      // When in WT mode and query looks like a filter prompt (age + location/connected),
      // handle it directly via WT+ profile search so AI can interpret and transform to WT+ syntax.
      if (isLikelyWtPlusFilterPrompt(normalizedPrompt)) {
        console.debug("wbe: explicit wt mode detected filter-like prompt, routing to WT+ with AI interpretation", {
          prompt: normalizedPrompt.substring(0, 60),
        });
        const filterSearchResult = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, normalizedPrompt);
        if (filterSearchResult) {
          await handleChatResult(
            typeof filterSearchResult === "string" ? { message: filterSearchResult } : filterSearchResult
          );
          return { handled: true, prompt: normalizedPrompt };
        }
        return { handled: false, prompt: normalizedPrompt };
      }

      // If in WT mode but query lacks minimum identifiers (name/WT ID/numeric ID),
      // it cannot be resolved by WT API. Route to WT+ or local filter depending on
      // whether the current result set came from WT+.
      if (mode === "wt" && !hasMinimumWtSearchIdentifiers(normalizedPrompt)) {
        console.debug("wbe: explicit wt mode but query lacks minimum identifiers, routing to WT+", {
          prompt: normalizedPrompt.substring(0, 60),
        });
        const noIdStructuredResult = typeof getLastStructuredResult === "function" ? getLastStructuredResult() : null;
        const noIdPreviousWtPlusQuery = String(noIdStructuredResult?.wtPlusQuery || "").trim();
        const noIdCleanedPrompt = normalizedPrompt.replace(/^(?:and|also|plus|then)\s+/i, "").trim();
        // If previous result was from WT+, refine it (prepend previous query if no base term).
        // Otherwise fall through to AI planner so natural follow-ups filter the in-memory result.
        if (noIdPreviousWtPlusQuery) {
          const noIdPromptHasBaseTerm =
            /\b[A-Za-z_]+=/.test(noIdCleanedPrompt) ||
            /\b(?!(?:\d{1,2}[Cc]en|\d{4}s|B\d{4}|D\d{4}|pre1500|NoFather|NoMother|NoParents|NoSpouses|NoChildren|NoGender|mtDNA|yDNA|auDNA|PPP|ProjectManaged|NeverEdited|GEDCOMJunk|SourceJunk|IsInWikiData|male|female|and|or|not)\b)[A-Z][A-Za-z]{2,}/.test(
              noIdCleanedPrompt
            );
          const noIdEffectivePrompt = noIdPromptHasBaseTerm
            ? noIdCleanedPrompt
            : `${noIdPreviousWtPlusQuery} ${noIdCleanedPrompt}`;
          const noIdentifierSearchResult = await tryHandleProfileSearchPrompt(
            { chatModeOverride: "wtplus" },
            noIdEffectivePrompt
          );
          if (noIdentifierSearchResult) {
            await handleChatResult(
              typeof noIdentifierSearchResult === "string"
                ? { message: noIdentifierSearchResult }
                : noIdentifierSearchResult
            );
            return { handled: true, prompt: normalizedPrompt };
          }
        }
        // No previous WT+ result — fall through so AI planner can handle as local filter.
      }

      // If the prompt contains WT+ magic tokens or natural temporal phrases (ordinal
      // centuries like "19th century", year ranges like "1800-1900"), treat it as a
      // WT+ search rather than letting the AI planner misread it as a last-result filter.
      // ONLY route to WT+ if the current result was itself from WT+ (so we can refine it)
      // or the prompt has its own base term. For non-WT+ results (ancestor lists etc.)
      // fall through so the AI planner can handle it as a local birthYearRange filter.
      const wtMagicOrTemporalRegex =
        /\b(?:\d{1,2}[Cc]en|\d{4}s|B\d{4}|D\d{4}|pre1500|NoFather|NoMother|NoParents|NoSpouses|NoChildren|NoGender|mtDNA|yDNA|auDNA|PPP|ProjectManaged|NeverEdited|GEDCOMJunk|SourceJunk|IsInWikiData|fg(?:cem|mem)\d+)\b|\b\d{1,2}(?:st|nd|rd|th)\s+century\b|\b\d{4}\s*[-\u2013]\s*\d{4}\b|\bfind\s+a\s+grave\s+(?:cemetery|cem)\s+\d+\b|\bfg\s+(?:cemetery|cem)\s+\d+\b/i;
      if (hasStructuredResult && wtMagicOrTemporalRegex.test(normalizedPrompt)) {
        const structuredResultForWt = typeof getLastStructuredResult === "function" ? getLastStructuredResult() : null;
        const previousWtPlusQueryForWt = String(structuredResultForWt?.wtPlusQuery || "").trim();
        if (previousWtPlusQueryForWt) {
          const wtPromptHasBaseTerm =
            /\b[A-Za-z_]+=/.test(normalizedPrompt) ||
            /\b(?!(?:\d{1,2}[Cc]en|\d{4}s|B\d{4}|D\d{4}|pre1500|NoFather|NoMother|NoParents|NoSpouses|NoChildren|NoGender|mtDNA|yDNA|auDNA|PPP|ProjectManaged|NeverEdited|GEDCOMJunk|SourceJunk|IsInWikiData|male|female|and|or|not)\b)[A-Z][A-Za-z]{2,}/.test(
              normalizedPrompt
            );
          const wtEffectivePrompt = wtPromptHasBaseTerm
            ? normalizedPrompt
            : `${previousWtPlusQueryForWt} ${normalizedPrompt}`;
          console.debug("wbe: wt mode detected WT+ magic tokens with WT+ result, routing as fresh WT+ search", {
            prompt: normalizedPrompt.substring(0, 60),
            wtEffectivePrompt: wtEffectivePrompt.substring(0, 80),
          });
          const freshWtPlusResult = await tryHandleProfileSearchPrompt(
            { chatModeOverride: "wtplus" },
            wtEffectivePrompt
          );
          if (freshWtPlusResult) {
            await handleChatResult(
              typeof freshWtPlusResult === "string" ? { message: freshWtPlusResult } : freshWtPlusResult
            );
            return { handled: true, prompt: normalizedPrompt };
          }
        }
        // No previous WT+ result — fall through to AI planner for local filter.
      }

      // When a structured result exists, try the AI planner before falling
      // back to profile search. Natural language follow-ups like "Can you
      // count them by country?" or "Only the women" map cleanly to
      // LAST_RESULT_OPERATION via the AI planner (which already has
      // structured result context), rather than being misrouted as profile searches.
      if (hasStructuredResult && typeof tryHandleAiPlannedIntent === "function") {
        try {
          const aiPlannedResult = await tryHandleAiPlannedIntent(normalizedPrompt);
          if (aiPlannedResult) {
            await handleChatResult(
              typeof aiPlannedResult === "string" ? { message: aiPlannedResult } : aiPlannedResult
            );
            return { handled: true, prompt: normalizedPrompt };
          }
        } catch (aiPlanErr) {
          console.debug("wbe: wt mode AI planner attempt failed", aiPlanErr);
        }
      }

      const shouldSwitchToWtPlus = await shouldAutoRouteWtPromptToWtPlus({
        prompt: normalizedPrompt,
        getChatAiConfig,
        buildRecentUserMessagesForAi,
      });

      if (shouldSwitchToWtPlus) {
        console.debug("wbe: auto-routing WT query to WT+ (in wt block)", { prompt: normalizedPrompt.substring(0, 60) });
        const wtPlusResult = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, normalizedPrompt);
        if (wtPlusResult) {
          await handleChatResult(typeof wtPlusResult === "string" ? { message: wtPlusResult } : wtPlusResult);
          return { handled: true, prompt: normalizedPrompt };
        }
        shouldSkipFinalSearch = true;
        return { handled: false, prompt: normalizedPrompt };
      }
    }

    if (mode === "wtplus" && hasStructuredResult && typeof tryHandleAiPlannedIntent === "function") {
      // If the prompt contains WT+ magic tokens or natural temporal phrases, bypass
      // the AI planner (which would misread them as last-result filter terms).
      // Only route to WT+ if the result was itself from WT+; for non-WT+ results
      // fall through so the AI planner can apply a local birthYearRange filter.
      const hasMagicOrTemporal =
        /\b(?:\d{1,2}[Cc]en|\d{4}s|B\d{4}|D\d{4}|pre1500|NoFather|NoMother|NoParents|NoSpouses|NoChildren|NoGender|mtDNA|yDNA|auDNA|PPP|ProjectManaged|NeverEdited|GEDCOMJunk|SourceJunk|IsInWikiData|fg(?:cem|mem)\d+)\b|\b\d{1,2}(?:st|nd|rd|th)\s+century\b|\b\d{4}\s*[-\u2013]\s*\d{4}\b|\bfind\s+a\s+grave\s+(?:cemetery|cem)\s+\d+\b|\bfg\s+(?:cemetery|cem)\s+\d+\b/i.test(
          normalizedPrompt
        );
      if (hasMagicOrTemporal) {
        const structuredResult = typeof getLastStructuredResult === "function" ? getLastStructuredResult() : null;
        const previousWtPlusQuery = String(structuredResult?.wtPlusQuery || "").trim();
        if (previousWtPlusQuery) {
          const promptHasBaseTerm =
            /\b[A-Za-z_]+=/.test(normalizedPrompt) ||
            /\b(?!(?:\d{1,2}[Cc]en|\d{4}s|B\d{4}|D\d{4}|pre1500|NoFather|NoMother|NoParents|NoSpouses|NoChildren|NoGender|mtDNA|yDNA|auDNA|PPP|ProjectManaged|NeverEdited|GEDCOMJunk|SourceJunk|IsInWikiData|male|female|and|or|not)\b)[A-Z][A-Za-z]{2,}/.test(
              normalizedPrompt
            );
          const effectivePrompt = promptHasBaseTerm ? normalizedPrompt : `${previousWtPlusQuery} ${normalizedPrompt}`;
          console.debug("wbe: wtplus mode detected WT+ magic tokens with WT+ result, routing as fresh WT+ search", {
            prompt: normalizedPrompt.substring(0, 60),
            effectivePrompt: effectivePrompt.substring(0, 80),
          });
          const magicResult = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, effectivePrompt);
          if (magicResult) {
            await handleChatResult(typeof magicResult === "string" ? { message: magicResult } : magicResult);
            return { handled: true, prompt: normalizedPrompt };
          }
        }
        // No previous WT+ result — fall through to AI planner for local filter.
      }
      if (shouldTryAiFollowupIntentInWtPlus(normalizedPrompt)) {
        try {
          const aiPlannedResult = await tryHandleAiPlannedIntent(normalizedPrompt);
          if (aiPlannedResult) {
            await handleChatResult(
              typeof aiPlannedResult === "string" ? { message: aiPlannedResult } : aiPlannedResult
            );
            return { handled: true, prompt: normalizedPrompt };
          }
        } catch (aiPlanErr) {
          console.debug("wbe: wtplus mode AI planner attempt failed", aiPlanErr);
        }
      }
    }

    try {
      if (shouldSkipFinalSearch) {
        console.debug("wbe: skipping final search (flag set)", { mode, prompt: normalizedPrompt.substring(0, 60) });
        return { handled: false, prompt: normalizedPrompt };
      }

      console.debug("wbe: executing final search in handleExplicitSearchMode", {
        mode,
        prompt: normalizedPrompt.substring(0, 60),
        shouldSkipFinalSearch,
      });
      const searchResult = await tryHandleProfileSearchPrompt({ chatModeOverride: mode }, normalizedPrompt);
      const followupFilterText =
        typeof extractFollowupTableFilterText === "function" ? extractFollowupTableFilterText(normalizedPrompt) : "";
      const structuredResult = typeof getLastStructuredResult === "function" ? getLastStructuredResult() : null;
      const hasStructuredRows = Boolean(structuredResult?.rows?.length);
      const isNoProfileMatchMessage =
        typeof searchResult === "string" && /couldn't\s+find\s+profile\s+matches/i.test(searchResult);

      if (isNoProfileMatchMessage && hasStructuredRows && followupFilterText) {
        if (typeof openResultsTable === "function") {
          openResultsTable(structuredResult, { initialSearch: followupFilterText });
        }
        await handleChatResult({
          message: `I treated that as a follow-up on the current result set and opened the table filtered for \"${followupFilterText}\".`,
        });
        return { handled: true, prompt: normalizedPrompt };
      }

      if (searchResult) {
        if (typeof searchResult === "string") {
          await handleChatResult({ message: searchResult });
        } else {
          await handleChatResult(searchResult);
        }
        console.debug("wbe: explicit mode handled final search result", {
          mode,
          prompt: normalizedPrompt.substring(0, 60),
        });
        return { handled: true, prompt: normalizedPrompt };
      }
    } catch (wtErr) {
      console.debug("wbe: wt search handler failed", wtErr);
    }
    console.debug("wbe: explicit mode final search returned no result", {
      mode,
      prompt: normalizedPrompt.substring(0, 60),
    });
    return { handled: false, prompt: normalizedPrompt };
  }

  return { handled: false, prompt };
}
