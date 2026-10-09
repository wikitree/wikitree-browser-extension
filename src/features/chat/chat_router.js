import { preferBracketedIds } from "./chat_family_circle_lookup";
import { ordinal } from "./chat_text_utils";
import { parseFamilyMatrixPrompt } from "./chat_family_matrix_data";
/*
Intent router for Chat feature.
This keeps prompt classification in one place so API adapters can be expanded
without growing chat.js into a single large file.
*/

import { parseCousinRelationRequest } from "./chat_cousin_helpers";
import { parseDuplicateCheckPrompt } from "./chat_duplicates";
import { parseBurialPrompt } from "./chat_burial";
import { parseFindRelativesPrompt } from "./chat_bio_relatives";
import { parseProfileFactPrompt } from "./chat_profile_facts";
import { parseDnaPrompt } from "./chat_dna";
import { parseFanChartPrompt, parseSurnameChartPrompt } from "./chat_fan_chart_data";
import { parseCompletenessPrompt } from "./chat_completeness_data";
import { parseDnaCarrierPrompt, parseDnaChartPrompt } from "./chat_dna_data";
import { parseFamilyCalendarPrompt } from "./chat_family_calendar_data";
import { parseAgesPrompt } from "./chat_ages_data";
import { parseTreeOverviewPrompt } from "./chat_tree_overview_data";
import { parseFractalTreePrompt } from "./chat_fractal_tree_data";
import { parseFamilyWorldPrompt } from "./chat_family_world_data";
import { parseChartShortcutPrompt } from "./chat_chart_shortcuts";
import { parseDescendantChartPrompt } from "./chat_descendant_chart_data";
import { parseFamilyTimelinePrompt } from "./chat_family_timeline_data";
import { parseLifeLinePrompt } from "./chat_life_line_data";
import { parseMigrationMapPrompt } from "./chat_migration_data";
import { parseLifespansPrompt } from "./chat_lifespans_data";
import { parseFamilySizePrompt } from "./chat_family_size_data";
import { parseHistoryPrompt } from "./chat_world_events_data";
import { parseNameCloudPrompt } from "./chat_name_cloud_data";
import { parseProfileSourcesPrompt } from "./chat_sources";
import { parseMarriagePrompt } from "./chat_marriage";
import { parseRelativeAgePrompt, parseRelativeFactPrompt } from "./chat_relative_fact";
import { parseTwinsPrompt } from "./chat_twins";
import { parseChildrenWithChildrenPrompt } from "./chat_children_with_children";
import { parseOutlivedPrompt } from "./chat_outlived";
import { parseRelativePickPrompt } from "./chat_relative_pick";
import { NIECE_NEPHEW_RE, nieceNephewToChain, rewriteInLawTerms } from "./chat_relation_chain_text";
import { parseChildPickPrompt } from "./chat_child_pick";
import { splitKinDetailsClause } from "./chat_kin_details";
import { splitKinOrderClause } from "./chat_kin_order";
import { splitKinFilterClause } from "./chat_kin_filter";
import { asksAboutRepeats, parseAncestorDepthOwner, parseAncestorSummaryOwner } from "./chat_ancestor_depth";
import { parseResultPickPrompt } from "./chat_result_pick";
import { isProfileNarrativePrompt } from "./chat_profile_narrative";

export const ChatIntent = {
  CC7_LOCATION_FILTER: "cc7LocationFilter",
  CC_SUMMARY: "ccSummary",
  WATCHLIST: "watchlist",
  RELATION_COUNT: "relationCount",
  CONNECTION_LOOKUP: "connectionLookup",
  PROFILE_FAMILY_CONNECTION: "profileFamilyConnection",
  ANCESTOR_AVG_AGE_AT_DEATH: "ancestorAvgAgeAtDeath",
  PERSON_AGE_AT_DEATH: "personAgeAtDeath",
  PERSON_AGE_AT_CHILD_BIRTH: "personAgeAtChildBirth",
  PROFILE_DUPLICATES: "profileDuplicates",
  PERSON_BURIAL: "personBurial",
  FIND_BIO_RELATIVES: "findBioRelatives",
  PROFILE_FACT: "profileFact",
  DNA: "dna",
  FAN_CHART: "fanChart",
  FRACTAL_TREE: "fractalTree",
  FAMILY_WORLD: "familyWorld",
  CHART_SHORTCUT: "chartShortcut",
  DESCENDANT_CHART: "descendantChart",
  FAMILY_TIMELINE: "familyTimeline",
  MIGRATION_MAP: "migrationMap",
  LIFESPANS: "lifespans",
  NAME_CLOUD: "nameCloud",
  FAMILY_CALENDAR: "familyCalendar",
  AGES_CHART: "agesChart",
  TREE_OVERVIEW: "treeOverview",
  FAMILY_MATRIX: "familyMatrix",
  PROFILE_SOURCES: "profileSources",
  PERSON_MARRIAGE: "personMarriage",
  RELATIVE_FACT: "relativeFact",
  CHILD_TWINS: "childTwins",
  CHILDREN_WITH_CHILDREN: "childrenWithChildren",
  CHILDREN_OUTLIVED: "childrenOutlived",
  ANCESTOR_LIST: "ancestorList",
  DESCENDANT_LIST: "descendantList",
  SPOUSE_LIST: "spouseList",
  PROFILE_SEARCH: "profileSearch",
  SPOUSE_BIO: "spouseBio",
  LAST_RESULT_OPERATION: "lastResultOperation",
  FALLBACK_AI: "fallbackAi",
};

const RESULT_FIELD_ALIASES = {
  name: "displayName",
  names: "displayName",
  firstname: "firstName",
  "first name": "firstName",
  givenname: "firstName",
  "given name": "firstName",
  forename: "firstName",
  "fore name": "firstName",
  "christian name": "firstName",
  surname: "surname",
  surnames: "surname",
  lnab: "lnab",
  "last name at birth": "lnab",
  "birth surname": "lnab",
  degree: "degrees",
  degrees: "degrees",
  removed: "removed",
  removal: "removed",
  removals: "removed",
  gender: "gender",
  birth: "birth",
  birthdate: "birth",
  "birth date": "birth",
  death: "death",
  deathdate: "death",
  "death date": "death",
  country: "country",
  countries: "country",
  location: "birthLocation",
  "birth location": "birthLocation",
  "death location": "deathLocation",
  decade: "birthDecade",
  decades: "birthDecade",
  "birth decade": "birthDecade",
  "decade of birth": "birthDecade",
  "death decade": "deathDecade",
  "decade of death": "deathDecade",
  century: "birthCentury",
  "birth century": "birthCentury",
};

import { getProfilePersonInfo } from "../../core/common";

// getPeople returns up to 25 generations of ancestors. A prompt with no number
// uses the default, which stays at 10 because deep trees page slowly.
const MAX_ANCESTOR_GENERATIONS = 25;
const DEFAULT_ANCESTOR_GENERATIONS = 10;

function withDateConstraint(base, dateField, dateDirection, dateValue) {
  if (!base || !dateField || !dateDirection || !dateValue) {
    return base;
  }

  return {
    ...base,
    dateField,
    dateDirection,
    dateValue: String(dateValue || "").trim(),
  };
}

// R6 (live, 2026-10-03): "how many of her children died before 1900?" went to
// the AI, which counted her husband as a child. The kin-place rule's date twin.
function matchKinDateClause(normalized, kinWords, parseBase) {
  const match = normalized.match(
    new RegExp(
      String.raw`^(?:(?:how\s+many|which|who)\s+of\s+|(?:list|show(?:\s+me)?)\s+)?(.*?\b(?:${kinWords}))\s+(?:(?:who|that)\s+)?(?:were\s+|was\s+)?(born|died)\s+(before|after)\s+(\d{4})$`,
      "i"
    )
  );
  if (!match) return null;
  const base = parseBase(match[1].trim());
  if (!base || base.dateField) return null;
  return withDateConstraint(base, /^died$/i.test(match[2]) ? "DeathDate" : "BirthDate", match[3].toLowerCase(), match[4]);
}

function parseCc7LocationPrompt(prompt) {
  const compactBorn = prompt.match(/^(?:my\s+)?cc(\d+)\s+born\s+in\s+(.+?)\??$/i);
  if (compactBorn?.[2]) {
    return { mode: "list", location: compactBorn[2].trim(), field: "BirthLocation", nuclear: Number(compactBorn[1]) };
  }

  const compactDied = prompt.match(/^(?:my\s+)?cc(\d+)\s+died\s+in\s+(.+?)\??$/i);
  if (compactDied?.[2]) {
    return { mode: "list", location: compactDied[2].trim(), field: "DeathLocation", nuclear: Number(compactDied[1]) };
  }

  const compactIn = prompt.match(/^(?:my\s+)?cc(\d+)\s+in\s+(.+?)\??$/i);
  if (compactIn?.[2]) {
    return { mode: "list", location: compactIn[2].trim(), field: "AnyLocation", nuclear: Number(compactIn[1]) };
  }

  const bornList = prompt.match(/(?:which|who)\s+of\s+my\s+cc(\d+)\s+(?:were|was|are|is)\s+born\s+in\s+(.+?)\??$/i);
  if (bornList?.[2]) {
    return { mode: "list", location: bornList[2].trim(), field: "BirthLocation", nuclear: Number(bornList[1]) };
  }

  const bornCount = prompt.match(/how\s+many\s+of\s+my\s+cc(\d+)\s+(?:were|was|are|is)\s+born\s+in\s+(.+?)\??$/i);
  if (bornCount?.[2]) {
    return { mode: "count", location: bornCount[2].trim(), field: "BirthLocation", nuclear: Number(bornCount[1]) };
  }

  const diedList = prompt.match(/(?:which|who)\s+of\s+my\s+cc(\d+)\s+(?:were|was|are|is)\s+died\s+in\s+(.+?)\??$/i);
  if (diedList?.[2]) {
    return { mode: "list", location: diedList[2].trim(), field: "DeathLocation", nuclear: Number(diedList[1]) };
  }

  const diedCount = prompt.match(/how\s+many\s+of\s+my\s+cc(\d+)\s+(?:were|was|are|is)\s+died\s+in\s+(.+?)\??$/i);
  if (diedCount?.[2]) {
    return { mode: "count", location: diedCount[2].trim(), field: "DeathLocation", nuclear: Number(diedCount[1]) };
  }

  // Fallback location query for CC7 when user doesn't specify born/died.
  const listMatch = prompt.match(/(?:which|who)\s+of\s+my\s+cc(\d+)\s+(?:were|was|are|is)\s+born\s+in\s+(.+?)\??$/i);
  if (listMatch?.[2]) {
    return { mode: "list", location: listMatch[2].trim(), field: "AnyLocation", nuclear: Number(listMatch[1]) };
  }

  const genericList = prompt.match(/(?:which|who)\s+of\s+my\s+cc(\d+)\s+.*\s+in\s+(.+?)\??$/i);
  if (genericList?.[2]) {
    return { mode: "list", location: genericList[2].trim(), field: "AnyLocation", nuclear: Number(genericList[1]) };
  }

  const countMatch = prompt.match(/how\s+many\s+of\s+my\s+cc(\d+)\s+.*\s+in\s+(.+?)\??$/i);
  if (countMatch?.[2]) {
    return { mode: "count", location: countMatch[2].trim(), field: "AnyLocation", nuclear: Number(countMatch[1]) };
  }

  return null;
}

const CC_FILTER_WORD_RE =
  /\b(?:in|from|born|died|who|with|without|notables?|famous|people|profiles|men|women|living|unsourced)\b/i;

function parseCcSummaryPrompt(prompt) {
  const normalized = String(prompt || "").trim();

  const summaryMatch = normalized.match(/^\s*(?:show|list|what(?:'s|\s+is)|give\s+me)?\s*(?:my\s+)?cc(\d+)\s*\??\s*$/i);
  if (summaryMatch?.[1]) {
    return {
      mode: "summary",
      nuclear: Number(summaryMatch[1]),
    };
  }

  const possessiveMatch = normalized.match(
    /^\s*(?:show|list|what(?:'s|\s+is)|give\s+me)?\s*(.+?)'s\s+cc(\d+)\s*\??\s*$/i
  );
  // "notables in Cook-8721's CC7" is a filtered search, not a summary (live
  // C29, 2026-10-03: it built the whole CC7 and froze the tab).
  if (possessiveMatch?.[2] && !CC_FILTER_WORD_RE.test(possessiveMatch[1])) {
    return {
      mode: "summary",
      nuclear: Number(possessiveMatch[2]),
    };
  }

  const forMatch = normalized.match(
    /^\s*(?:show|list|what(?:'s|\s+is)|give\s+me)?\s*cc(\d+)\s+(?:for|of)\s+.+?\??\s*$/i
  );
  if (forMatch?.[1]) {
    return {
      mode: "summary",
      nuclear: Number(forMatch[1]),
    };
  }

  return null;
}

export function parseWatchlistFilterPrompt(text) {
  const match = String(text || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .match(
      /^(?:(?:show|list|find|get)\s+(?:me\s+)?)?(?:(?:the|all)\s+)?(?:(?:people|profiles|persons|ones)\s+(?:on|in|from)\s+my\s+watch\s*list|my\s+watch\s*list(?:ed)?(?:\s+(?:people|profiles|persons|entries))?|watch\s*listed\s+(?:people|profiles))\s+(?:(?:who|that)\s+(?:were\s+)?)?(.+)$/i
    );
  if (!match) return null;
  const rest = match[1].trim();
  const placeDate = rest.match(/^(born|died)\s+in\s+(.+?)(?:\s+(before|after)\s+(\d{4}))?$/i);
  if (placeDate) {
    return {
      event: placeDate[1].toLowerCase() === "born" ? "birth" : "death",
      location: placeDate[2].trim(),
      ...(placeDate[3] ? { dateDirection: placeDate[3].toLowerCase(), year: Number(placeDate[4]) } : {}),
    };
  }
  const dateOnly = rest.match(/^(born|died)\s+(before|after)\s+(\d{4})$/i);
  if (dateOnly) {
    return {
      event: dateOnly[1].toLowerCase() === "born" ? "birth" : "death",
      dateDirection: dateOnly[2].toLowerCase(),
      year: Number(dateOnly[3]),
    };
  }
  return null;
}

function parseWatchlistPrompt(prompt) {
  const normalized = String(prompt || "").trim();
  const normalizedClean = normalized.replace(/[.!?]+$/g, "").trim();
  if (!normalized) {
    return null;
  }

  // "my watchlist profiles that died in Kent" / "people on my watchlist born
  // before 1800" (live C8, 2026-10-03: went to searchPerson, which can't).
  const filtered = parseWatchlistFilterPrompt(normalizedClean);
  if (filtered) {
    return { mode: "list", limit: null, filter: filtered };
  }

  const isWatchlistPrompt =
    /^\s*(?:my\s+)?watch\s*list\s*$/i.test(normalizedClean) ||
    /^\s*(?:show|list|open|get)\s+(?:me\s+)?(?:my\s+)?watch\s*list(?:\s+.*)?\s*$/i.test(normalizedClean);

  if (!isWatchlistPrompt) {
    return null;
  }

  const limitMatch = normalizedClean.match(/\b(?:first|top)\s+(\d{1,5})\b/i);
  const parsedLimit = Number(limitMatch?.[1]);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(50000, Math.trunc(parsedLimit))) : null;

  return {
    mode: "list",
    limit,
  };
}

const RELATION_WORDS_RE =
  /^(?:grand\s*aunts?|grand\s*uncles?|grand\s*mothers?|grand\s*fathers?|grand\s*parents?|aunts?|uncles?|mothers?|moms?|fathers?|dads?|parents?|daughters?|sons?|children|kids?|wives|wife|husbands?|spouses?|brothers?|sisters?|siblings?)$/i;

// E1/E2 (live, 2026-10-03): "who were her grandparents?", "how many siblings
// did she have?" fell to the AI. Tried only after the family routes, so forms
// they already take ("list her children") keep their route. A his/her/she owner
// is the profile person; spouse words keep SPOUSE_LIST.
function pronounOwnerToProfile(owner) {
  const name = getProfilePersonInfo()?.Name || "";
  return /^(?:she|he|they|her|him|them|his|their)$/i.test(owner) && name ? name : owner;
}

function parseLateRelationPrompt(prompt) {
  const normalized = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  const isPlainRelation = (text) =>
    (RELATION_WORDS_RE.test(String(text).trim()) || Boolean(parseCousinRelationRequest(text))) &&
    !/^(?:wives|wife|husbands?|spouses?)$/i.test(String(text).trim());
  const profileName = getProfilePersonInfo()?.Name || "";
  const pronounOwnerMatch = normalized.match(
    /^(?:(?:who|what)\s+(?:are|were|was|is)\s+|list\s+|show(?:\s+me)?\s+|tell\s+me\s+)?(?:his|her|their)\s+(.+)$/i
  );
  if (pronounOwnerMatch?.[1] && isPlainRelation(pronounOwnerMatch[1]) && profileName) {
    return { mode: "list", relationRaw: pronounOwnerMatch[1].trim(), subjectMode: "named", subjectName: profileName };
  }
  const pastPossessiveMatch = normalized.match(/^(?:who|what)\s+(?:were|was|is)\s+(.+?)['’]s\s+(.+)$/i);
  if (pastPossessiveMatch?.[1] && pastPossessiveMatch?.[2] && isPlainRelation(pastPossessiveMatch[2])) {
    return {
      mode: "list",
      relationRaw: pastPossessiveMatch[2].trim(),
      subjectMode: "named",
      subjectName: pastPossessiveMatch[1].trim(),
    };
  }
  const pastCountMatch = normalized.match(/^how\s+many\s+(.+?)\s+did\s+(.+?)\s+have$/i);
  if (pastCountMatch?.[1] && pastCountMatch?.[2]) {
    const owner = pastCountMatch[2].trim();
    if (/^i$/i.test(owner)) return { mode: "count", relationRaw: pastCountMatch[1].trim(), subjectMode: "user" };
    // F9, "how many children did her parents have?": the profile's chain.
    const ownerChain = owner.match(/^(?:his|her|their)\s+([A-Za-z ]+)$/i);
    if (ownerChain && profileName && RELATION_WORDS_RE.test(ownerChain[1].trim())) {
      return {
        mode: "count",
        relationRaw: `${ownerChain[1].trim()}'s ${pastCountMatch[1].trim()}`,
        subjectMode: "named",
        subjectName: profileName,
      };
    }
    return {
      mode: "count",
      relationRaw: pastCountMatch[1].trim(),
      subjectMode: "named",
      subjectName: pronounOwnerToProfile(owner),
    };
  }
  return null;
}

function parseRelationPrompt(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized) {
    return null;
  }

  const withCousinParams = (baseParams, parsed) => {
    if (!parsed) {
      return baseParams;
    }

    return {
      ...baseParams,
      relationRaw: parsed.relationLabel,
      ...(Number.isFinite(Number(parsed.cousinDegree)) ? { cousinDegree: Number(parsed.cousinDegree) } : {}),
      ...(Number.isFinite(Number(parsed.removed)) ? { removed: Number(parsed.removed) } : {}),
      ...(parsed.allCousins ? { allCousins: true, maxAncestorGeneration: parsed.maxAncestorGeneration } : {}),
      location: parsed.location,
      locationField: parsed.locationField,
    };
  };

  const RELATION_WORD_REGEX = RELATION_WORDS_RE;

  const isSupportedBareRelationPhrase = (text) => {
    const cleaned = String(text || "")
      .trim()
      .replace(/[.!?]+$/g, "")
      .trim();
    if (!cleaned) {
      return false;
    }
    if (parseCousinRelationRequest(cleaned)) {
      return true;
    }
    return RELATION_WORD_REGEX.test(cleaned);
  };

  const withRelationExtras = (baseParams) => {
    const relationRaw = String(baseParams?.relationRaw || "").trim();
    if (!relationRaw) {
      return baseParams;
    }

    const cousinParsed = parseCousinRelationRequest(relationRaw);
    if (!cousinParsed) {
      return baseParams;
    }

    return withCousinParams(baseParams, cousinParsed);
  };

  // Ancestor generations belong to the ancestor list (getPeople, 2^g slots); the
  // relation path collapsed "5th great-grandparents" to "grandparents".
  if (/\bgreat[\s-]*grand[\s-]*parents?\b|\d+\s*x\s*great/i.test(normalized)) {
    return null;
  }

  const meMatch = normalized.match(/^how\s+many\s+(.+?)\s+do\s+i\s+have\??$/i);
  if (meMatch?.[1]) {
    return withRelationExtras({
      mode: "count",
      relationRaw: meMatch[1].trim(),
      subjectMode: "user",
    });
  }

  const namedMatch = normalized.match(/^how\s+many\s+(.+?)\s+does\s+(.+?)\s+have\??$/i);
  if (namedMatch?.[1] && namedMatch?.[2]) {
    return withRelationExtras({
      mode: "count",
      relationRaw: namedMatch[1].trim(),
      subjectMode: "named",
      subjectName: pronounOwnerToProfile(namedMatch[2].trim()),
    });
  }

  const listMyMatch = normalized.match(/^(?:who\s+are|list|show(?:\s+me)?|give\s+me)\s+my\s+(.+?)\??$/i);
  if (listMyMatch?.[1]) {
    return withRelationExtras({
      mode: "list",
      relationRaw: listMyMatch[1].trim(),
      subjectMode: "user",
    });
  }

  const bareMyCousinMatch = normalized.match(/^my\s+(.+?)\??$/i);
  if (bareMyCousinMatch?.[1]) {
    const parsed = parseCousinRelationRequest(bareMyCousinMatch[1]);
    if (parsed) {
      return withCousinParams(
        {
          mode: "list",
          subjectMode: "user",
        },
        parsed
      );
    }
  }

  // "Who were Philip's first cousins?" looked for a person called "Who were
  // Philip" (live, 2026-10-04): drop the question lead-in, as for siblings.
  const cousinPrompt = normalized.replace(
    /^(?:(?:who|what)\s+(?:are|were|was|is)\s+(?:the\s+)?|list\s+|show(?:\s+me)?\s+|tell\s+me\s+(?:about\s+)?)/i,
    ""
  );
  const barePossessiveCousinMatch =
    cousinPrompt.match(/^(.+?)['’]s\s+(.+?)\??$/i) || cousinPrompt.match(/^(his|her|their)\s+(.+?)\??$/i);
  if (barePossessiveCousinMatch?.[1] && barePossessiveCousinMatch?.[2]) {
    const parsed = parseCousinRelationRequest(barePossessiveCousinMatch[2]);
    const cousinOwner = pronounOwnerToProfile(barePossessiveCousinMatch[1].trim());
    if (parsed && cousinOwner && !/^(?:his|her|their)$/i.test(cousinOwner)) {
      return withCousinParams(
        {
          mode: "list",
          subjectMode: "named",
          subjectName: cousinOwner,
        },
        parsed
      );
    }
  }

  // Bare possessive relation chains with no leading verb:
  // "Sarah's father's wife's siblings' bios". Requires at least two relation
  // segments so single-relation possessives ("Sarah's wife") keep their
  // dedicated routes (SPOUSE_LIST etc.).
  // F3 (live, 2026-10-03): "who was her father's father?" — a question prefix
  // and a his/her/their owner; the owner is the profile person.
  // H4 (live, 2026-10-03): "her siblings' children" — a plural possessive is
  // read as "siblings's" so the chain splits.
  const chainPrompt = normalized
    .replace(/^(?:(?:who|what)\s+(?:are|were|was|is)\s+(?:the\s+)?|list\s+|show(?:\s+me)?\s+|tell\s+me\s+)/i, "")
    .replace(/s['’](?=\s)/g, "s's")
    .replace(NIECE_NEPHEW_RE, nieceNephewToChain);
  const pronounChain = chainPrompt.match(/^(?:his|her|their)\s+([A-Za-z ]+?)['’]s\s+(.+?)\??$/i);
  const pronounChainProfile = getProfilePersonInfo()?.Name || "";
  const barePossessiveChainMatch =
    pronounChain && pronounChainProfile && RELATION_WORD_REGEX.test(pronounChain[1].trim())
      ? [chainPrompt, pronounChainProfile, `${pronounChain[1].trim()}'s ${pronounChain[2]}`]
      : chainPrompt.match(/^(.+?)['’]s\s+(.+?)\??$/i);
  if (barePossessiveChainMatch?.[1] && barePossessiveChainMatch?.[2]) {
    const chainSubject = barePossessiveChainMatch[1].trim();
    const chainTail = barePossessiveChainMatch[2]
      .replace(/[?.!]+$/g, "")
      .replace(/\s*\b(?:bios?|biograph(?:y|ies))\b\s*$/i, "")
      .replace(/['’]s?\s*$/, "")
      .trim();
    const chainSegments = chainTail
      .replace(/[’`]/g, "'")
      .split(/\s*'s\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);
    const chainSubjectIsRelation = RELATION_WORD_REGEX.test(chainSubject);
    if (
      chainSegments.length &&
      chainSegments.every((segment) => RELATION_WORD_REGEX.test(segment)) &&
      (chainSegments.length >= 2 || chainSubjectIsRelation)
    ) {
      // A relation word in the subject slot ("father's wife's siblings")
      // refers to the profile being viewed (or the logged-in user): keep the
      // word as the first chain step and leave the subject contextual.
      if (chainSubjectIsRelation) {
        return {
          mode: "list",
          relationRaw: `${chainSubject}'s ${chainTail}`,
          subjectMode: "contextual",
        };
      }
      return {
        mode: "list",
        relationRaw: chainTail,
        subjectMode: "named",
        subjectName: chainSubject,
      };
    }
  }

  if (isSupportedBareRelationPhrase(normalized)) {
    const parsed = parseCousinRelationRequest(normalized);
    if (parsed) {
      return withCousinParams(
        {
          mode: "list",
          subjectMode: "contextual",
        },
        parsed
      );
    }

    return {
      mode: "list",
      relationRaw: normalized.replace(/[.!?]+$/g, "").trim(),
      subjectMode: "contextual",
    };
  }

  const listNamedMatch = normalized.match(/^(?:who\s+are|list|show)\s+(.+?)\s+of\s+(.+?)\??$/i);
  if (listNamedMatch?.[1] && listNamedMatch?.[2]) {
    return withRelationExtras({
      mode: "list",
      relationRaw: listNamedMatch[1].trim(),
      subjectMode: "named",
      subjectName: listNamedMatch[2].trim(),
    });
  }

  const listPossessiveMatch = normalized.match(/^(?:who\s+are|list|show)\s+(.+?)\s+for\s+(.+?)\??$/i);
  if (listPossessiveMatch?.[1] && listPossessiveMatch?.[2]) {
    return withRelationExtras({
      mode: "list",
      relationRaw: listPossessiveMatch[1].trim(),
      subjectMode: "named",
      subjectName: listPossessiveMatch[2].trim(),
    });
  }

  // Possessive: "Who are Nathan's children?" / "Show Nathan's parents" / "List Mary's siblings"
  const genitivePossessiveMatch = normalized.match(/^(?:who\s+are|what\s+are|list|show)\s+(.+?)'s\s+(.+?)\??$/i);
  if (genitivePossessiveMatch?.[1] && genitivePossessiveMatch?.[2]) {
    return withRelationExtras({
      mode: "list",
      relationRaw: genitivePossessiveMatch[2].trim(),
      subjectMode: "named",
      subjectName: genitivePossessiveMatch[1].trim(),
    });
  }

  return null;
}

function isSelfReferenceEndpoint(value) {
  return /^(?:me|myself|i|my|mine)$/i.test(
    String(value || "")
      .trim()
      .replace(/[?.!]+$/, "")
  );
}

function cleanConnectionEndpoint(value) {
  return String(value || "")
    .trim()
    .replace(/[?.!]+$/, "")
    .replace(/^(?:the\s+)?(?:profile\s+person|current\s+profile|this\s+profile)\b/i, "")
    .trim();
}

/**
 * Parse a connection/distance prompt into its two endpoints.
 * Returns { source, target } where an empty source means "the user (or
 * current page profile)", or null when the prompt is not a connection
 * lookup. Both-named forms ("connection between A and B",
 * "Philip's connection to Jefferson") fill both fields; self references
 * ("between X and me") are normalized to an empty source.
 */
export function extractConnectionEndpoints(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized) return null;

  // Strip interrogative/imperative lead-ins so possessive patterns don't
  // capture "What" from "What is Philip's connection to Jefferson?".
  const lead = normalized
    .replace(/^\s*(?:please\s+)?(?:what(?:['’]s|\s+is)|show(?:\s+me)?|tell\s+me|find|give\s+me)\s+/i, "")
    .replace(/^\s*the\s+/i, "");

  // "how am I related to Harold?", "how is Maloney-2332 related to McKusick-36?",
  // "how are Philip and Jefferson related?": needed AI to read (2026-10-06).
  // A person's relatives ("Calvin's children") are left to the AI; only a name or ID is read here.
  const relatedQuestion = normalized.replace(/[?.!]+$/, "").trim();
  const isRelativesPhrase = /['’]s\s+\S/.test(relatedQuestion);
  const howAmIMatch = isRelativesPhrase
    ? null
    : relatedQuestion.match(/^(?:how\s+)?(?:am\s+i|are\s+we)\s+(?:related|connected)\s+to\s+(.+)$/i);
  if (howAmIMatch?.[1] && !/^(?:any(?:one|body)|someone|somebody)\b/i.test(howAmIMatch[1])) {
    return { source: "", target: cleanConnectionEndpoint(howAmIMatch[1]) };
  }
  const howIsMatch = isRelativesPhrase ? null : relatedQuestion.match(/^how\s+(?:is|was)\s+(.+?)\s+(?:related|connected)\s+to\s+(.+)$/i);
  if (howIsMatch?.[1] && howIsMatch?.[2]) {
    const source = cleanConnectionEndpoint(howIsMatch[1]);
    const target = cleanConnectionEndpoint(howIsMatch[2]);
    if (isSelfReferenceEndpoint(target)) return { source: "", target: source };
    return { source: isSelfReferenceEndpoint(source) ? "" : source, target };
  }
  const howAreMatch = isRelativesPhrase ? null : relatedQuestion.match(/^how\s+(?:are|were)\s+(.+?)\s+and\s+(.+?)\s+(?:related|connected)$/i);
  if (howAreMatch?.[1] && howAreMatch?.[2]) {
    const source = cleanConnectionEndpoint(howAreMatch[1]);
    const target = cleanConnectionEndpoint(howAreMatch[2]);
    if (isSelfReferenceEndpoint(target)) return { source: "", target: source };
    return { source: isSelfReferenceEndpoint(source) ? "" : source, target };
  }

  const possessiveToMeMatch = lead.match(
    /^\s*(.+?)['’]s\s+(?:(?:connection|relationship)(?:\s+or\s+distance)?|distance(?:\s+or\s+connection)?)\s+to\s+me\??\s*$/i
  );
  if (possessiveToMeMatch?.[1]) {
    return { source: "", target: cleanConnectionEndpoint(possessiveToMeMatch[1]) };
  }

  const possessiveToNamedMatch = lead.match(
    /^\s*(.+?)['’]s\s+(?:(?:connection|relationship)(?:\s+or\s+distance)?|distance(?:\s+or\s+connection)?)\s+to\s+(.+?)\??\s*$/i
  );
  if (possessiveToNamedMatch?.[1] && possessiveToNamedMatch?.[2]) {
    const source = cleanConnectionEndpoint(possessiveToNamedMatch[1]);
    const target = cleanConnectionEndpoint(possessiveToNamedMatch[2]);
    if (isSelfReferenceEndpoint(target)) {
      return { source: "", target: source };
    }
    return { source, target };
  }

  const fromMeMatch = normalized.match(
    /(?:what(?:'s|\s+is)\s+)?(?:the\s+)?(?:connection|distance)(?:\s+or\s+connection|\s+or\s+distance)?\s+from\s+me\s+to\s+(.+?)\??$/i
  );
  if (fromMeMatch?.[1]) {
    return { source: "", target: cleanConnectionEndpoint(fromMeMatch[1]) };
  }

  const betweenMeMatch = normalized.match(
    /(?:what(?:'s|\s+is)\s+)?(?:the\s+)?(?:connection|distance|relationship)(?:\s+or\s+connection|\s+or\s+distance)?\s+between\s+me\s+and\s+(.+?)\??$/i
  );
  if (betweenMeMatch?.[1]) {
    return { source: "", target: cleanConnectionEndpoint(betweenMeMatch[1]) };
  }

  const fromAnyMatch = normalized.match(
    /(?:what(?:'s|\s+is)\s+)?(?:the\s+)?(?:connection|distance)(?:\s+or\s+connection|\s+or\s+distance)?\s+from\s+(.+?)\s+to\s+(.+?)\??$/i
  );
  if (fromAnyMatch?.[1] && fromAnyMatch?.[2]) {
    const source = cleanConnectionEndpoint(fromAnyMatch[1]);
    const target = cleanConnectionEndpoint(fromAnyMatch[2]);
    if (isSelfReferenceEndpoint(target)) {
      return { source: "", target: source };
    }
    return { source: isSelfReferenceEndpoint(source) ? "" : source, target };
  }

  const betweenAnyMatch = normalized.match(
    /(?:what(?:'s|\s+is)\s+)?(?:the\s+)?(?:connection|distance|relationship)(?:\s+or\s+connection|\s+or\s+distance)?\s+between\s+(.+?)\s+and\s+(.+?)\??$/i
  );
  if (betweenAnyMatch?.[1] && betweenAnyMatch?.[2]) {
    const source = cleanConnectionEndpoint(betweenAnyMatch[1]);
    const target = cleanConnectionEndpoint(betweenAnyMatch[2]);
    if (isSelfReferenceEndpoint(target)) {
      return { source: "", target: source };
    }
    return { source: isSelfReferenceEndpoint(source) ? "" : source, target };
  }

  const toMatch = normalized.match(
    /(?:what(?:'s|\s+is)\s+)?(?:my\s+)?(?:(?:connection|relationship)(?:\s+or\s+distance)?|distance(?:\s+or\s+connection)?)\s+to\s+(.+?)\??$/i
  );
  if (toMatch?.[1]) {
    const target = cleanConnectionEndpoint(toMatch[1]);
    // "connection to me" on a profile: from me to the profile person (user, 2026-10-03).
    return { source: "", target: isSelfReferenceEndpoint(target) ? "this profile" : target };
  }

  return null;
}

/** "this profile", "her", "him"…: the connection target is the page's profile person. */
export function isPageProfileTarget(value) {
  return /^(?:this\s+(?:profile|person)|the\s+profile(?:\s+person)?|her|him|them|this\s+(?:man|woman))$/i.test(
    String(value || "")
      .trim()
      .replace(/[?.!]+$/, "")
  );
}

export function extractConnectionTarget(prompt) {
  return extractConnectionEndpoints(prompt)?.target || "";
}

export function extractConnectionSourceName(prompt) {
  return extractConnectionEndpoints(prompt)?.source || "";
}

// Additional utility helpers (moved from chat.js)
export function normalizePersonText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function splitPersonName(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/[?.!]+$/, "");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  };
}

export function normalizeConnectionTargetForSearch(value) {
  return String(value || "")
    .trim()
    .replace(/[?.!]+$/, "")
    // "show John Theodore Weatherall" was the target of "show John Theodore Weatherall's bio" (live, 2026-10-08).
    .replace(/^(?:please\s+)?(?:show|open|read|display|get|find|give|fetch|pull\s+up|look\s+up)(?:\s+me)?\s+(?:the\s+)?/i, "")
    .replace(/\b(?:the\s+)?(?:actor|actress|singer|musician|writer|poet|politician|comedian|mp|sir|dame)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isConnectionCorrectionPrompt(prompt) {
  return /^(?:he\s*'?s\s+not|she\s*'?s\s+not|that\s*'?s\s+not|not\s+him|not\s+her|wrong\s+person|not\s+the\s+right\s+person)/i.test(
    String(prompt || "").trim()
  );
}

export function extractCorrectionTarget(prompt) {
  const normalized = String(prompt || "").trim();
  const match = normalized.match(/(?:not|wrong\s+person\s*[:,]?)(?:\s+the\s+)?\s+(.+?)\??$/i);
  if (!match?.[1]) return "";
  return normalizeConnectionTargetForSearch(match[1]);
}

// "Thomas Beacall (Beacall-13)": the ID in brackets decides who is meant. Name
// search on the rest found someone else, even Prince Philip (live, 2026-10-04).
export function embeddedWikiTreeId(value) {
  const text = String(value || "");
  const id = text.match(/\(([^()]+)\)\s*$/)?.[1]?.trim() || "";
  if (isWikiTreeId(id)) return id;
  // "show Weatherall-113": an ID after a command word.
  const last = normalizeConnectionTargetForSearch(text);
  return /\s/.test(last) || !isWikiTreeId(last) ? "" : last;
}

// Surnames can hold hyphens and accents: Schleswig-Holstein-Sonderburg-Glücksburg-1.
export function isWikiTreeId(value) {
  return /^\p{L}[\p{L}\p{M}0-9_'-]*-\d+$/u.test(String(value || "").trim().normalize("NFC"));
}

export function extractWikiTreeIdFromHref(href) {
  const value = String(href || "").trim();
  if (!value) return "";
  try {
    const resolved = new URL(value, window.location.origin);
    const match = resolved.pathname.match(/\/wiki\/([^/?#]+)/i);
    const wikiId = decodeURIComponent(match?.[1] || "").trim();
    return isWikiTreeId(wikiId) ? wikiId : "";
  } catch (error) {
    return "";
  }
}

export function extractYearFromDate(value) {
  const match = String(value || "").match(/^(\d{4})/);
  if (!match || match[1] === "0000") return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

export function scorePageContextCandidate(target, targetParts, candidate) {
  const normalizedTarget = normalizePersonText(target);
  if (!normalizedTarget) return 0;

  const targetFirst = normalizePersonText(targetParts.firstName);
  const targetLast = normalizePersonText(targetParts.lastName);
  const name = normalizePersonText(candidate.displayName);
  const title = normalizePersonText(candidate.title);
  const wtId = normalizePersonText(candidate.wtId || "");
  const haystacks = [name, title, wtId].filter(Boolean);
  let score = 0;

  haystacks.forEach((haystack) => {
    if (haystack === normalizedTarget) score = Math.max(score, 500);
    else if (haystack.startsWith(`${normalizedTarget} `) || haystack.endsWith(` ${normalizedTarget}`))
      score = Math.max(score, 360);
    else if (haystack.includes(normalizedTarget)) score = Math.max(score, 240);
  });

  if (targetFirst && targetLast) {
    const firstMatches = haystacks.some(
      (haystack) => haystack.startsWith(`${targetFirst} `) || haystack.includes(` ${targetFirst} `)
    );
    const lastMatches = haystacks.some(
      (haystack) =>
        haystack.endsWith(` ${targetLast}`) || haystack.includes(` ${targetLast} `) || haystack === targetLast
    );
    if (firstMatches) score += 80;
    if (lastMatches) score += 140;
  }

  return score;
}

export function findPageContextPersonCandidate(target) {
  const cleanedTarget = normalizeConnectionTargetForSearch(target);
  const normalizedTarget = normalizePersonText(cleanedTarget);
  if (!normalizedTarget) return null;

  const targetParts = splitPersonName(cleanedTarget);
  const deduped = new Map();

  const profilePerson = getProfilePersonInfo();
  if (profilePerson?.Name) {
    const profileCandidate = {
      wtId: profilePerson.Name,
      displayName:
        profilePerson.FullName || `${profilePerson.FirstName || ""} ${profilePerson.LastNameAtBirth || ""}`.trim(),
      title: document.title || "",
    };
    const score = scorePageContextCandidate(cleanedTarget, targetParts, profileCandidate);
    // A shared surname alone (140) isn't the profile person: "Captain James
    // Cook" on Ellen Cook's page became Ellen (live F8, 2026-10-03). First and
    // last name together score 220.
    if (score >= 200) deduped.set(profileCandidate.wtId, { ...profileCandidate, score });
  }

  // Genie's own answers are not page context: a connection path to Lincoln-103
  // links his grandfather Abraham (Lincoln-229), and the repeat question
  // found him instead (live, 2026-10-03).
  document.querySelectorAll('a[href*="/wiki/"]').forEach((anchor) => {
    if (anchor.closest?.("#wbe-chat-popup, .wbe-popup")) return;
    const wtId = extractWikiTreeIdFromHref(anchor.getAttribute("href") || anchor.href || "");
    if (!wtId) return;
    const candidate = {
      wtId,
      displayName: String(anchor.textContent || "").trim(),
      title: String(anchor.getAttribute("title") || "").trim(),
    };
    const score = scorePageContextCandidate(cleanedTarget, targetParts, candidate);
    if (score < 320) return;
    const existing = deduped.get(wtId);
    if (!existing || score > existing.score) deduped.set(wtId, { ...candidate, score });
  });

  const ranked = Array.from(deduped.values()).sort((l, r) => r.score - l.score);
  return ranked[0] || null;
}

export function mergeConnectionMatches(matchLists) {
  const mergeNonEmptyFields = (existing = {}, incoming = {}) => {
    const merged = { ...existing };

    Object.entries(incoming || {}).forEach(([key, value]) => {
      if (key === "Derived" && value && typeof value === "object") {
        const derived = { ...(existing?.Derived || {}) };
        Object.entries(value).forEach(([derivedKey, derivedValue]) => {
          if (derivedValue !== undefined && derivedValue !== null && derivedValue !== "") {
            derived[derivedKey] = derivedValue;
          }
        });
        if (Object.keys(derived).length) {
          merged.Derived = derived;
        }
        return;
      }

      if (value !== undefined && value !== null && value !== "") {
        merged[key] = value;
      }
    });

    const existingIndex = Number(existing?.index);
    const incomingIndex = Number(incoming?.index);
    if (Number.isFinite(existingIndex)) {
      merged.index = existingIndex;
    } else if (Number.isFinite(incomingIndex)) {
      merged.index = incomingIndex;
    }

    return merged;
  };

  const merged = new Map();
  (matchLists || []).forEach((list) => {
    (list || []).forEach((match) => {
      const key = String(match?.Name || match?.Id || "").trim();
      if (!key) return;
      const existing = merged.get(key);
      merged.set(key, existing ? mergeNonEmptyFields(existing, match) : match);
    });
  });
  return Array.from(merged.values());
}

export function rankConnectionMatches(target, matches, targetParts = {}) {
  if (!Array.isArray(matches) || !matches.length) return [];
  const normalizedTarget = normalizePersonText(target);
  const normalizedFirst = normalizePersonText(targetParts.firstName);
  const normalizedLast = normalizePersonText(targetParts.lastName);
  const ranked = matches.map((match) => {
    const name = match?.Name || "";
    const realName = match?.RealName || match?.Derived?.ShortName || "";
    const lastCurrent = match?.LastNameCurrent || "";
    const lastBirth = match?.LastNameAtBirth || "";
    const profileFirst = match?.FirstName || "";
    const realNameFirstToken = String(realName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0];
    let score = 0;

    if (normalizePersonText(name) === normalizedTarget) score += 100;
    if (normalizePersonText(realName) === normalizedTarget) score += 120;
    if (
      normalizePersonText(realName).includes(normalizedTarget) ||
      normalizedTarget.includes(normalizePersonText(realName))
    )
      score += 35;

    if (normalizedLast) {
      if (normalizePersonText(lastCurrent) === normalizedLast || normalizePersonText(lastBirth) === normalizedLast)
        score += 140;
      else score -= 120;
    }

    if (normalizedFirst) {
      if (
        normalizePersonText(profileFirst) === normalizedFirst ||
        normalizePersonText(realNameFirstToken) === normalizedFirst
      )
        score += 80;
      else if (normalizePersonText(realName).startsWith(`${normalizedFirst} `)) score += 40;
    }

    if (name) score += 5;
    const idx = Number(match?.index);
    if (Number.isFinite(idx)) score += Math.max(0, 25 - idx);
    return { match, score };
  });
  ranked.sort((l, r) => r.score - l.score);
  return ranked;
}

export function shouldUseAiForConnectionDisambiguation(targetParts, rankedMatches) {
  if (!rankedMatches.length) return false;
  if (rankedMatches.length === 1) return false;
  const top = rankedMatches[0];
  const second = rankedMatches[1];
  if (!top?.match || !second?.match) return false;
  const closeScore = Math.abs((top.score || 0) - (second.score || 0)) < 45;
  const topBirthYear = extractYearFromDate(top.match.BirthDate);
  const secondBirthYear = extractYearFromDate(second.match.BirthDate);
  const highlyDifferentEra =
    Number.isFinite(topBirthYear) && Number.isFinite(secondBirthYear) && Math.abs(topBirthYear - secondBirthYear) > 80;
  const hasFullNameTarget = Boolean(targetParts.firstName && targetParts.lastName);
  return hasFullNameTarget && (closeScore || highlyDifferentEra);
}

export function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getCommonAliasExpansion(target) {
  const normalized = String(target || "")
    .trim()
    .toLowerCase();
  const currentDate = new Date().toISOString().slice(0, 10);
  const aliases = {
    qe2: { searchName: "Elizabeth Windsor", birthYear: 1926 },
    "queen elizabeth ii": { searchName: "Elizabeth Windsor", birthYear: 1926 },
    "queen elizabeth 2": { searchName: "Elizabeth Windsor", birthYear: 1926 },
    jfk: { searchName: "John F Kennedy", birthYear: 1917 },
    "john f. kennedy": { searchName: "John Fitzgerald Kennedy", birthYear: 1917 },
    mlk: { searchName: "Martin Luther King Jr", birthYear: 1929 },
    "martin luther king": { searchName: "Martin Luther King Jr", birthYear: 1929 },
    "pope leo xiv": { wtId: "Prevost-1162", searchName: "Robert Francis Prevost", birthDate: "1955-09-14" },
    "leo xiv": { wtId: "Prevost-1162", searchName: "Robert Francis Prevost", birthDate: "1955-09-14" },
    "prince philip": {
      wtId: "Schleswig-Holstein-Sonderburg-Glücksburg-1",
      searchName: "Philip Mountbatten",
      birthDate: "1921-06-10",
    },
    "duke of edinburgh": {
      wtId: "Schleswig-Holstein-Sonderburg-Glücksburg-1",
      searchName: "Philip Mountbatten",
      birthDate: "1921-06-10",
    },
  };
  if (normalized === "the pope" || normalized === "pope") {
    if (currentDate >= "2025-05-08") {
      return { wtId: "Prevost-1162", searchName: "Robert Francis Prevost", birthDate: "1955-09-14" };
    }

    if (currentDate >= "2013-03-13") {
      return { searchName: "Jorge Mario Bergoglio", birthDate: "1936-12-17" };
    }
  }
  return aliases[normalized] || null;
}

function parseProfileSearchPrompt(prompt) {
  const directSearch = prompt.match(/^(?:search\s+for|find|look\s+up)\s+(.+?)\??$/i);
  if (directSearch?.[1]) {
    return directSearch[1].trim();
  }

  const whoIs = prompt.match(/^who\s+is\s+(.+?)\??$/i);
  if (whoIs?.[1]) {
    return whoIs[1].trim();
  }

  return "";
}

function parseProfileFamilyConnectionPrompt(prompt) {
  const match = prompt.match(
    /(?:find\s+)?(?:the\s+)?closest\s+connection\s+between\s+(the\s+)?(profile\s+person|current\s+profile|this\s+profile)\s+and\s+(?:the\s+)?(.+?)(?:\s+family)?\??$/i
  );
  if (!match?.[3]) {
    return null;
  }

  return {
    familyName: match[3].trim(),
    root: "profile",
  };
}

// D13 "average lifespan of my ancestors": the planner turned it into one
// generation (3x great-grandparents, live 2026-10-03). Lifespan words count, and
// plain "ancestors" means every generation.
const AVERAGE_AGE_RE =
  /\b(?:average|mean)\s+(?:age\s+(?:at|of)\s+death|life\s*span|life\s+expectancy|length\s+of\s+life|age\s+when\s+they\s+died)\b|\bhow\s+long\s+did\s+.+?\s+live\s+on\s+average\b|\bon\s+average,?\s+how\s+long\s+did\s+.+?\s+live\b/i;

function parseAncestorAverageAgePrompt(prompt) {
  const normalized = String(prompt || "")
    .trim()
    .replace(/\s+live\s+on\s+average(\??)$/i, "$1")
    .replace(/\s+live(\??)$/i, "$1");
  if (!AVERAGE_AGE_RE.test(String(prompt || ""))) {
    return null;
  }

  if (/(?:of|for)?\s*(?:my|our|his|her|their|[A-Z][A-Za-z'_ -]*-\d+['’]s)?\s*(?:direct\s+)?ancestors?\??$/i.test(normalized)) {
    return {
      generation: MAX_ANCESTOR_GENERATIONS,
      includeUpTo: true,
      relationshipLabel: "ancestors",
    };
  }

  const gxMatch = normalized.match(
    /(?:for\s+)?(?:my|the|our|his|her|their)?\s*(\d+)\s*x\s*(?:g(?:reat)?\s*)?g(?:rand)?\s*-?\s*parents?\??$/i
  );
  if (gxMatch?.[1]) {
    const greatCount = Number(gxMatch[1]);
    if (Number.isFinite(greatCount) && greatCount >= 0) {
      return {
        generation: greatCount + 2,
        relationshipLabel: `${greatCount}x great-grandparents`,
      };
    }
  }

  const explicitGreatMatch = normalized.match(
    /(?:for\s+)?(?:my|the|our|his|her|their)?\s*(\d+)\s*x\s*great\s*-?\s*grand\s*-?\s*parents?\??$/i
  );
  if (explicitGreatMatch?.[1]) {
    const greatCount = Number(explicitGreatMatch[1]);
    if (Number.isFinite(greatCount) && greatCount >= 0) {
      return {
        generation: greatCount + 2,
        relationshipLabel: `${greatCount}x great-grandparents`,
      };
    }
  }

  if (/(?:for\s+)?(?:my|the|our|his|her|their)?\s*great\s*-?\s*grand\s*-?\s*parents?\??$/i.test(normalized)) {
    return {
      generation: 3,
      relationshipLabel: "great-grandparents",
    };
  }

  if (/(?:for\s+)?(?:my|the|our|his|her|their)?\s*grand\s*-?\s*parents?\??$/i.test(normalized)) {
    return {
      generation: 2,
      relationshipLabel: "grandparents",
    };
  }

  return null;
}

// "how old was she when her first child was born?" / "how old was Ellen when
// she had her last baby?" (live C14, 2026-10-03: WT+ said it couldn't).
export const PRONOUN_TARGET_RE = /^(?:he|she|they|him|her|them|this\s+person|the\s+profile\s+person|this\s+profile)$/i;

function parsePersonAgeAtChildBirthPrompt(prompt) {
  const normalized = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  const match =
    normalized.match(
      /^how\s+old\s+was\s+(.+?)\s+when\s+(?:(?:his|her|their|([^\s']+-\d+)'s)\s+)?(first|eldest|oldest|last|youngest)\s+(child|baby|son|daughter)\s+was\s+born$/i
    ) ||
    normalized.match(
      /^how\s+old\s+was\s+(.+?)\s+when\s+(?:he|she|they)\s+had\s+(?:(?:his|her|their)\s+)?()(first|last)\s+(child|baby|son|daughter)$/i
    ) ||
    normalized.match(
      /^(?:what\s+was\s+)?(.+?)(?:'s)?\s+age\s+(?:at|when)\s+(?:(?:his|her|their)\s+)?()(first|last)\s+(child|baby|son|daughter)(?:'s\s+birth|\s+was\s+born)?$/i
    );
  if (!match?.[1]) return null;
  // A follow-up rewrite turns "her first child" into "Cook-8721's first child".
  const target = PRONOUN_TARGET_RE.test(match[1].trim()) && match[2] ? match[2] : match[1].trim();
  const which = /^(?:last|youngest)$/i.test(match[3]) ? "last" : "first";
  const childWord = match[4].toLowerCase();
  const childGender = childWord === "son" ? "Male" : childWord === "daughter" ? "Female" : "";
  return { target, which, childGender };
}

// E3 (live, 2026-10-03): "how old was she when she died?" asked who "she" was.
function parsePersonAgeAtDeathPrompt(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized) {
    return null;
  }

  const howOldMatch = normalized.match(/^how\s+old\s+was\s+(.+?)\s+when\s+(?:he|she|they)\s+died\??$/i);
  if (howOldMatch?.[1]) {
    return { target: pronounOwnerToProfile(howOldMatch[1].trim()) };
  }

  const ageWhenDiedMatch = normalized.match(/^how\s+old\s+was\s+(.+?)\s+when\s+died\??$/i);
  if (ageWhenDiedMatch?.[1]) {
    return { target: pronounOwnerToProfile(ageWhenDiedMatch[1].trim()) };
  }

  const whatAgeMatch = normalized.match(
    /^(?:what\s+age|what\s+was\s+the\s+age)\s+(?:did|was)\s+(.+?)\s+(?:die|at\s+death)\??$/i
  );
  if (whatAgeMatch?.[1]) {
    return { target: pronounOwnerToProfile(whatAgeMatch[1].trim()) };
  }

  return null;
}

// "brick walls" is a genealogy term: ancestors with a missing parent. Bare =
// the profile person's, "my" = the user's, "Smith-123's" = that person's.
function parseBrickWallPrompt(prompt) {
  const match = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .match(/^(?:(?:show|list|find|who\s+are|what\s+are)\s+)?(?:(?:the|all)\s+)?(.*?)\s*\b(?:brick[\s-]*walls?|dead[\s-]*ends?)$/i);
  if (!match) return null;
  const base = parseAncestorListPrompt(`${match[1].trim()} ancestors`.trim());
  return base ? { ...base, missingParent: "either" } : null;
}

// Age-at-death suffix on a kin list. "past/over/older than 90" = 91+, "to 90" /
// "90 or more" / "90+" = 90+, "under/younger than 5" / "before age 5" = 0-4,
// "died aged 42" = 42.
export function parseAgeAtDeathSuffix(text) {
  const match = String(text || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .match(
      /^(.*?\b(?:ancestors?|descendants?|children|kids|sons|daughters|(?:great-)*grand(?:children|sons|daughters)))\s+(?:who\s+)?(?:(?:lived|died|were)\s+)?(aged\s+|at\s+(?=\d))?(?:(past|beyond|over|above|older\s+than|more\s+than)|(to|to\s+at\s+least|at\s+least)|(under|below|younger\s+than|less\s+than|before\s+(?:the\s+)?age(?:\s+of)?)|(young|as\s+(?:children|infants|babies)))?\s*(?:age\s+|the\s+age\s+of\s+)?(\d{1,3})?(\s*\+|\s+or\s+(?:more|older|over))?(?:\s+years?(?:\s+old)?)?$/i
    );
  if (!match) return null;
  const [, subject, aged, over, atLeast, under, young, numText, plus] = match;
  const rest = subject.replace(/^(?:which|who)\s+of\s+/i, "");
  const n = Number(numText);
  if (young && !numText) return { rest, range: { max: 15 } };
  if (!numText || !Number.isFinite(n) || n > 125) return null;
  if (under) return { rest, range: { max: n - 1 } };
  if (plus || atLeast) return { rest, range: { min: n } };
  if (over) return { rest, range: { min: n + 1 } };
  if (aged) return { rest, range: { min: n, max: n } };
  return null;
}

function parseAncestorListPrompt(prompt) {
  const normalized = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .trim();
  const defaultAncestorGeneration = DEFAULT_ANCESTOR_GENERATIONS;

  // O10 (live, 2026-10-03): "how many of my ancestors died in Wales?" got an AI
  // hedge; "my ancestors born in Shropshire" already worked. Same rule as the
  // descendants' H5 kinPlaceMatch.
  const ancestorPlaceMatch = normalized.match(
    /^(?:(?:how\s+many|which|who)\s+of\s+|(?:list|show(?:\s+me)?)\s+)?(.*?\b(?:ancestors|grandparents))\s+(?:(?:who|that)\s+)?(?:were\s+|was\s+)?(born|died)\s+in\s+(.+)$/i
  );
  if (ancestorPlaceMatch && !/\b(?:before|after|between)\s+\d{3,4}\b/i.test(ancestorPlaceMatch[3])) {
    const base = parseAncestorListPrompt(ancestorPlaceMatch[1].trim());
    if (base && !base.location) {
      return {
        ...base,
        location: ancestorPlaceMatch[3].trim(),
        locationField: /^died$/i.test(ancestorPlaceMatch[2]) ? "DeathLocation" : "BirthLocation",
      };
    }
  }

  const ancestorDate = matchKinDateClause(normalized, "ancestors|grandparents", parseAncestorListPrompt);
  if (ancestorDate) return ancestorDate;

  // "which of my ancestors have no parents" / "my ancestors with no father" /
  // "my ancestors with a missing parent". The planner rewrites "brick walls" to the last.
  const missingParentMatch = normalized.match(
    /^(?:(?:which|who)\s+of\s+)?(.*?\bancestors?)\s+(?:who\s+)?(?:have|has|with|are\s+missing)\s+(no|a\s+missing|an?\s+unknown|missing)\s+(parents?|fathers?|mothers?)$/i
  );
  if (missingParentMatch?.[1]) {
    const base = parseAncestorListPrompt(missingParentMatch[1].trim());
    if (base) {
      const parentWord = missingParentMatch[3].toLowerCase();
      const missingParent = /^father/.test(parentWord)
        ? "father"
        : /^mother/.test(parentWord)
        ? "mother"
        : /^no$/i.test(missingParentMatch[2]) && parentWord === "parents"
        ? "both"
        : "either";
      return { ...base, missingParent };
    }
  }

  // "my ancestors who lived past 90" / "ancestors who died under 5" (C7).
  const ageAtDeath = parseAgeAtDeathSuffix(normalized);
  if (ageAtDeath) {
    const base = parseAncestorListPrompt(ageAtDeath.rest);
    if (base) return { ...base, ageAtDeath: ageAtDeath.range };
  }

  const bornInBeforeMatch = normalized.match(
    /^(.*?\bancestors?)\s+born\s+in\s+(.+?)\s+before\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i
  );
  if (bornInBeforeMatch?.[1] && bornInBeforeMatch?.[2] && bornInBeforeMatch?.[3]) {
    const base = parseAncestorListPrompt(bornInBeforeMatch[1].trim());
    if (base) {
      return withDateConstraint(
        {
          ...base,
          location: bornInBeforeMatch[2].trim(),
          locationField: "BirthLocation",
        },
        "BirthDate",
        "before",
        bornInBeforeMatch[3]
      );
    }
  }

  const bornInAfterMatch = normalized.match(
    /^(.*?\bancestors?)\s+born\s+in\s+(.+?)\s+after\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i
  );
  if (bornInAfterMatch?.[1] && bornInAfterMatch?.[2] && bornInAfterMatch?.[3]) {
    const base = parseAncestorListPrompt(bornInAfterMatch[1].trim());
    if (base) {
      return withDateConstraint(
        {
          ...base,
          location: bornInAfterMatch[2].trim(),
          locationField: "BirthLocation",
        },
        "BirthDate",
        "after",
        bornInAfterMatch[3]
      );
    }
  }

  const diedInBeforeMatch = normalized.match(
    /^(.*?\bancestors?)\s+died\s+in\s+(.+?)\s+before\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i
  );
  if (diedInBeforeMatch?.[1] && diedInBeforeMatch?.[2] && diedInBeforeMatch?.[3]) {
    const base = parseAncestorListPrompt(diedInBeforeMatch[1].trim());
    if (base) {
      return withDateConstraint(
        {
          ...base,
          location: diedInBeforeMatch[2].trim(),
          locationField: "DeathLocation",
        },
        "DeathDate",
        "before",
        diedInBeforeMatch[3]
      );
    }
  }

  const diedInAfterMatch = normalized.match(
    /^(.*?\bancestors?)\s+died\s+in\s+(.+?)\s+after\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i
  );
  if (diedInAfterMatch?.[1] && diedInAfterMatch?.[2] && diedInAfterMatch?.[3]) {
    const base = parseAncestorListPrompt(diedInAfterMatch[1].trim());
    if (base) {
      return withDateConstraint(
        {
          ...base,
          location: diedInAfterMatch[2].trim(),
          locationField: "DeathLocation",
        },
        "DeathDate",
        "after",
        diedInAfterMatch[3]
      );
    }
  }

  const bornBeforeMatch = normalized.match(/^(.*?\bancestors?)\s+born\s+before\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i);
  if (bornBeforeMatch?.[1] && bornBeforeMatch?.[2]) {
    const base = parseAncestorListPrompt(bornBeforeMatch[1].trim());
    if (base) {
      return withDateConstraint(base, "BirthDate", "before", bornBeforeMatch[2]);
    }
  }

  const bornAfterMatch = normalized.match(/^(.*?\bancestors?)\s+born\s+after\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i);
  if (bornAfterMatch?.[1] && bornAfterMatch?.[2]) {
    const base = parseAncestorListPrompt(bornAfterMatch[1].trim());
    if (base) {
      return withDateConstraint(base, "BirthDate", "after", bornAfterMatch[2]);
    }
  }

  const diedBeforeMatch = normalized.match(/^(.*?\bancestors?)\s+died\s+before\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i);
  if (diedBeforeMatch?.[1] && diedBeforeMatch?.[2]) {
    const base = parseAncestorListPrompt(diedBeforeMatch[1].trim());
    if (base) {
      return withDateConstraint(base, "DeathDate", "before", diedBeforeMatch[2]);
    }
  }

  const diedAfterMatch = normalized.match(/^(.*?\bancestors?)\s+died\s+after\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i);
  if (diedAfterMatch?.[1] && diedAfterMatch?.[2]) {
    const base = parseAncestorListPrompt(diedAfterMatch[1].trim());
    if (base) {
      return withDateConstraint(base, "DeathDate", "after", diedAfterMatch[2]);
    }
  }

  const bornInMatch = normalized.match(/^(.*?\bancestors?)\s+born\s+in\s+(.+?)\??$/i);
  if (bornInMatch?.[1] && bornInMatch?.[2]) {
    const base = parseAncestorListPrompt(bornInMatch[1].trim());
    if (base) {
      return {
        ...base,
        location: bornInMatch[2].trim(),
        locationField: "BirthLocation",
      };
    }
  }

  const diedInMatch = normalized.match(/^(.*?\bancestors?)\s+died\s+in\s+(.+?)\??$/i);
  if (diedInMatch?.[1] && diedInMatch?.[2]) {
    const base = parseAncestorListPrompt(diedInMatch[1].trim());
    if (base) {
      return {
        ...base,
        location: diedInMatch[2].trim(),
        locationField: "DeathLocation",
      };
    }
  }

  const genericInMatch = normalized.match(/^(.*?\bancestors?)\s+in\s+(.+?)\??$/i);
  if (genericInMatch?.[1] && genericInMatch?.[2]) {
    const base = parseAncestorListPrompt(genericInMatch[1].trim());
    if (base) {
      return {
        ...base,
        location: genericInMatch[2].trim(),
        locationField: "AnyLocation",
      };
    }
  }

  const ancestorsGenerationsMatch = normalized.match(
    /(?:show|list|display|give\s+me)?\s*(\d+)\s+generations?\s+(?:of\s+)?(?:my|the|our|his|her|their|[^\s']+(?:\s+[^\s']+)?'s)?\s*ancestors?\b/i
  );
  if (ancestorsGenerationsMatch?.[1]) {
    const generation = Math.min(Number(ancestorsGenerationsMatch[1]), MAX_ANCESTOR_GENERATIONS);
    if (Number.isFinite(generation) && generation >= 1) {
      return {
        generation,
        relationshipLabel: `${generation} generations of ancestors`,
        includeUpTo: true,
      };
    }
  }

  const trailingAncestorsGenerationsMatch = normalized.match(
    /(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?(?:.+?'s\s+|ancestors?\s+(?:of|for)\s+.+?\s+|my\s+|our\s+|his\s+|her\s+|their\s+)?ancestors?\s+(\d+)\s+generations?\b/i
  );
  if (trailingAncestorsGenerationsMatch?.[1]) {
    const generation = Math.min(Number(trailingAncestorsGenerationsMatch[1]), MAX_ANCESTOR_GENERATIONS);
    if (Number.isFinite(generation) && generation >= 1) {
      return {
        generation,
        relationshipLabel: `${generation} generations of ancestors`,
        includeUpTo: true,
      };
    }
  }

  const genericAncestorPrompt =
    /^\s*(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?(?:my|our|his|her|their)?\s*ancestors?\??\s*$/i.test(
      normalized
    ) ||
    /^\s*(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?ancestors?\s+(?:of|for)\s+.+?\??\s*$/i.test(normalized) ||
    /^\s*.+?'s\s+ancestors?\??\s*$/i.test(normalized) ||
    /^\s*(?:the\s+)?(?:profile\s+person|current\s+profile|this\s+profile)'?s?\s+ancestors?\??\s*$/i.test(normalized);

  if (genericAncestorPrompt) {
    return {
      generation: defaultAncestorGeneration,
      relationshipLabel: "ancestors",
      includeUpTo: true,
      defaultGeneration: true,
    };
  }

  // N1 (live, 2026-10-03): "who were her great-grandparents?" went to WT+ and was declined.
  if (
    !/(?:\blist\b|\bwho\s+are\b|\bshow\b)/i.test(normalized) &&
    !/^\s*(?:who\s+were\s+)?(?:my|his|her|their)\s+(?:\d+(?:st|nd|rd|th)?\s+|\d+\s*x\s*)?(?:great\s*-?\s*)+grand\s*-?\s*parents\??\s*$/i.test(normalized)
  ) {
    return null;
  }
  if (!/(?:grand\s*-?\s*parents?|g\s*grand\s*-?\s*parents?|great\s*-?\s*grand\s*-?\s*parents?)/i.test(normalized)) {
    return null;
  }

  const ordinalGreatMatch = normalized.match(/(\d+)(?:st|nd|rd|th)?\s+great\s*-?\s*grand\s*-?\s*parents?/i);
  if (ordinalGreatMatch?.[1]) {
    const greatCount = Number(ordinalGreatMatch[1]);
    if (Number.isFinite(greatCount) && greatCount >= 1) {
      return {
        generation: greatCount + 2,
        relationshipLabel: `${ordinal(greatCount)} great-grandparents`,
      };
    }
  }

  const xGreatMatch = normalized.match(/(\d+)\s*x\s*great\s*-?\s*grand\s*-?\s*parents?/i);
  if (xGreatMatch?.[1]) {
    const greatCount = Number(xGreatMatch[1]);
    if (Number.isFinite(greatCount) && greatCount >= 1) {
      return {
        generation: greatCount + 2,
        relationshipLabel: `${greatCount}x great-grandparents`,
      };
    }
  }

  const greatRun = normalized.match(/\b((?:great\s*-?\s*)+)grand\s*-?\s*parents?\b/i);
  if (greatRun) {
    // "great great grandparents" is one generation further back per "great".
    const greats = (greatRun[1].match(/great/gi) || []).length;
    return {
      generation: greats + 2,
      relationshipLabel: greats === 1 ? "great-grandparents" : `${greats}x great-grandparents`,
    };
  }

  if (/\bgrand\s*-?\s*parents?\b/i.test(normalized)) {
    return {
      generation: 2,
      relationshipLabel: "grandparents",
    };
  }

  return null;
}

function parseDescendantListPrompt(prompt) {
  const normalized = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .trim();
  const defaultDescendantGeneration = 10;
  if (/\bliving\b/i.test(normalized)) {
    const rest = normalized.replace(/\bliving\s+/i, "").replace(/^(?:who|which)(?:\s+(?:are|is))?\s+/i, "");
    const base = parseDescendantListPrompt(rest);
    if (base) return { ...base, livingOnly: true };
  }


  // H5 (live, 2026-10-03): "how many of her grandchildren were born in New
  // Zealand?" listed every grandchild; the place was dropped.
  const kinPlaceMatch = normalized.match(
    /^(?:(?:how\s+many|which|who)\s+of\s+|(?:list|show(?:\s+me)?)\s+)?(.*?\b(?:children|grandchildren|great[\s-]*(?:great[\s-]*)*grandchildren|descendants))\s+(?:(?:who|that)\s+)?(?:were\s+|was\s+)?(born|died)\s+in\s+(.+)$/i
  );
  if (kinPlaceMatch && !/\b(?:before|after|between)\s+\d{3,4}\b/i.test(kinPlaceMatch[3])) {
    const base = parseDescendantListPrompt(kinPlaceMatch[1].trim());
    if (base && !base.location) {
      return {
        ...base,
        location: kinPlaceMatch[3].trim(),
        locationField: /^died$/i.test(kinPlaceMatch[2]) ? "DeathLocation" : "BirthLocation",
      };
    }
  }

  const kinDate = matchKinDateClause(
    normalized,
    String.raw`children|grandchildren|great[\s-]*(?:great[\s-]*)*grandchildren|descendants`,
    parseDescendantListPrompt
  );
  if (kinDate) return kinDate;

  // D5, "which of her children died young?"
  const ageAtDeath = parseAgeAtDeathSuffix(normalized);
  if (ageAtDeath) {
    const base = parseDescendantListPrompt(ageAtDeath.rest);
    if (base) return { ...base, ageAtDeath: ageAtDeath.range };
  }

  const bornInBeforeMatch = normalized.match(
    /^(.*?\bdescendants?)\s+born\s+in\s+(.+?)\s+before\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i
  );
  if (bornInBeforeMatch?.[1] && bornInBeforeMatch?.[2] && bornInBeforeMatch?.[3]) {
    const base = parseDescendantListPrompt(bornInBeforeMatch[1].trim());
    if (base) {
      return withDateConstraint(
        {
          ...base,
          location: bornInBeforeMatch[2].trim(),
          locationField: "BirthLocation",
        },
        "BirthDate",
        "before",
        bornInBeforeMatch[3]
      );
    }
  }

  const bornInAfterMatch = normalized.match(
    /^(.*?\bdescendants?)\s+born\s+in\s+(.+?)\s+after\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i
  );
  if (bornInAfterMatch?.[1] && bornInAfterMatch?.[2] && bornInAfterMatch?.[3]) {
    const base = parseDescendantListPrompt(bornInAfterMatch[1].trim());
    if (base) {
      return withDateConstraint(
        {
          ...base,
          location: bornInAfterMatch[2].trim(),
          locationField: "BirthLocation",
        },
        "BirthDate",
        "after",
        bornInAfterMatch[3]
      );
    }
  }

  const diedInBeforeMatch = normalized.match(
    /^(.*?\bdescendants?)\s+died\s+in\s+(.+?)\s+before\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i
  );
  if (diedInBeforeMatch?.[1] && diedInBeforeMatch?.[2] && diedInBeforeMatch?.[3]) {
    const base = parseDescendantListPrompt(diedInBeforeMatch[1].trim());
    if (base) {
      return withDateConstraint(
        {
          ...base,
          location: diedInBeforeMatch[2].trim(),
          locationField: "DeathLocation",
        },
        "DeathDate",
        "before",
        diedInBeforeMatch[3]
      );
    }
  }

  const diedInAfterMatch = normalized.match(
    /^(.*?\bdescendants?)\s+died\s+in\s+(.+?)\s+after\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i
  );
  if (diedInAfterMatch?.[1] && diedInAfterMatch?.[2] && diedInAfterMatch?.[3]) {
    const base = parseDescendantListPrompt(diedInAfterMatch[1].trim());
    if (base) {
      return withDateConstraint(
        {
          ...base,
          location: diedInAfterMatch[2].trim(),
          locationField: "DeathLocation",
        },
        "DeathDate",
        "after",
        diedInAfterMatch[3]
      );
    }
  }

  const bornBeforeMatch = normalized.match(/^(.*?\bdescendants?)\s+born\s+before\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i);
  if (bornBeforeMatch?.[1] && bornBeforeMatch?.[2]) {
    const base = parseDescendantListPrompt(bornBeforeMatch[1].trim());
    if (base) {
      return withDateConstraint(base, "BirthDate", "before", bornBeforeMatch[2]);
    }
  }

  const bornAfterMatch = normalized.match(/^(.*?\bdescendants?)\s+born\s+after\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i);
  if (bornAfterMatch?.[1] && bornAfterMatch?.[2]) {
    const base = parseDescendantListPrompt(bornAfterMatch[1].trim());
    if (base) {
      return withDateConstraint(base, "BirthDate", "after", bornAfterMatch[2]);
    }
  }

  const diedBeforeMatch = normalized.match(/^(.*?\bdescendants?)\s+died\s+before\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i);
  if (diedBeforeMatch?.[1] && diedBeforeMatch?.[2]) {
    const base = parseDescendantListPrompt(diedBeforeMatch[1].trim());
    if (base) {
      return withDateConstraint(base, "DeathDate", "before", diedBeforeMatch[2]);
    }
  }

  const diedAfterMatch = normalized.match(/^(.*?\bdescendants?)\s+died\s+after\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i);
  if (diedAfterMatch?.[1] && diedAfterMatch?.[2]) {
    const base = parseDescendantListPrompt(diedAfterMatch[1].trim());
    if (base) {
      return withDateConstraint(base, "DeathDate", "after", diedAfterMatch[2]);
    }
  }

  const bornInMatch = normalized.match(/^(.*?\bdescendants?)\s+born\s+in\s+(.+?)\??$/i);
  if (bornInMatch?.[1] && bornInMatch?.[2]) {
    const base = parseDescendantListPrompt(bornInMatch[1].trim());
    if (base) {
      return {
        ...base,
        location: bornInMatch[2].trim(),
        locationField: "BirthLocation",
      };
    }
  }

  const diedInMatch = normalized.match(/^(.*?\bdescendants?)\s+died\s+in\s+(.+?)\??$/i);
  if (diedInMatch?.[1] && diedInMatch?.[2]) {
    const base = parseDescendantListPrompt(diedInMatch[1].trim());
    if (base) {
      return {
        ...base,
        location: diedInMatch[2].trim(),
        locationField: "DeathLocation",
      };
    }
  }

  const genericInMatch = normalized.match(/^(.*?\bdescendants?)\s+in\s+(.+?)\??$/i);
  if (genericInMatch?.[1] && genericInMatch?.[2]) {
    const base = parseDescendantListPrompt(genericInMatch[1].trim());
    if (base) {
      return {
        ...base,
        location: genericInMatch[2].trim(),
        locationField: "AnyLocation",
      };
    }
  }

  const ordinalGreatGrandchildrenMatch = normalized.match(
    /(\d+)(?:st|nd|rd|th)?\s+great\s*-?\s*grand\s*-?\s*children?/i
  );
  if (ordinalGreatGrandchildrenMatch?.[1]) {
    const greatCount = Number(ordinalGreatGrandchildrenMatch[1]);
    if (Number.isFinite(greatCount) && greatCount >= 1) {
      return {
        generation: greatCount + 2,
        relationshipLabel: `${ordinal(greatCount)} great-grandchildren`,
      };
    }
  }

  const xGreatGrandchildrenMatch = normalized.match(/(\d+)\s*x\s*great\s*-?\s*grand\s*-?\s*children?/i);
  if (xGreatGrandchildrenMatch?.[1]) {
    const greatCount = Number(xGreatGrandchildrenMatch[1]);
    if (Number.isFinite(greatCount) && greatCount >= 1) {
      return {
        generation: greatCount + 2,
        relationshipLabel: `${greatCount}x great-grandchildren`,
      };
    }
  }

  const namedDescendantsGenerationsMatch = normalized.match(
    /(?:show|list|display|give\s+me)?\s*(\d+)\s+generations?\s+of\s+.+?'s\s+descendants?\b/i
  );
  if (namedDescendantsGenerationsMatch?.[1]) {
    const generation = Number(namedDescendantsGenerationsMatch[1]);
    if (Number.isFinite(generation) && generation >= 1) {
      return {
        generation,
        relationshipLabel: `${generation} generations of descendants`,
        includeUpTo: true,
      };
    }
  }

  const descendantsGenerationsMatch = normalized.match(
    /(?:show|list|display|give\s+me)?\s*(\d+)\s+generations?\s+(?:of\s+)?(?:my|the|our|his|her|their)?\s*descendants?\b/i
  );
  if (descendantsGenerationsMatch?.[1]) {
    const generation = Number(descendantsGenerationsMatch[1]);
    if (Number.isFinite(generation) && generation >= 1) {
      return {
        generation,
        relationshipLabel: `${generation} generations of descendants`,
        includeUpTo: true,
      };
    }
  }

  const trailingDescendantsGenerationsMatch = normalized.match(
    /(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?(?:.+?'s\s+|descendants?\s+(?:of|for)\s+.+?\s+|my\s+|our\s+|his\s+|her\s+|their\s+)?descendants?\s+(\d+)\s+generations?\b/i
  );
  if (trailingDescendantsGenerationsMatch?.[1]) {
    const generation = Number(trailingDescendantsGenerationsMatch[1]);
    if (Number.isFinite(generation) && generation >= 1) {
      return {
        generation,
        relationshipLabel: `${generation} generations of descendants`,
        includeUpTo: true,
      };
    }
  }

  if (/\bgreat\s*-?\s*grand\s*-?\s*children?\b/i.test(normalized)) {
    return {
      generation: 3,
      relationshipLabel: "great-grandchildren",
    };
  }

  if (/\bgrand\s*-?\s*children?\b/i.test(normalized)) {
    return {
      generation: 2,
      relationshipLabel: "grandchildren",
    };
  }

  if (/\bchildren?\b/i.test(normalized)) {
    const childPrompt =
      /^\s*(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?(?:my|our|his|her|their)?\s*children?\??\s*$/i.test(
        normalized
      ) ||
      /^\s*(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?children?\s+(?:of|for)\s+.+?\??\s*$/i.test(
        normalized
      ) ||
      /^\s*.+?'s\s+children?\??\s*$/i.test(normalized) ||
      /^\s*(?:the\s+)?(?:profile\s+person|current\s+profile|this\s+profile)'?s?\s+children?\??\s*$/i.test(normalized);

    if (childPrompt) {
      return {
        generation: 1,
        relationshipLabel: "children",
      };
    }
  }

  const genericDescendantPrompt =
    /^\s*(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?(?:my|our|his|her|their)?\s*descendants?\??\s*$/i.test(
      normalized
    ) ||
    /^\s*(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?descendants?\s+(?:of|for)\s+.+?\??\s*$/i.test(
      normalized
    ) ||
    /^\s*.+?'s\s+descendants?\??\s*$/i.test(normalized) ||
    /^\s*(?:the\s+)?(?:profile\s+person|current\s+profile|this\s+profile)'?s?\s+descendants?\??\s*$/i.test(normalized);

  if (genericDescendantPrompt) {
    return {
      generation: defaultDescendantGeneration,
      relationshipLabel: "descendants",
      includeUpTo: true,
      defaultGeneration: true,
    };
  }

  return null;
}

function normalizeFieldName(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase();
  return RESULT_FIELD_ALIASES[key] || "";
}

/**
 * Try to parse a natural-language phrase as a compound AND filter.
 * Recognises combinations of gender, century, decade, year-range, and WT+ Ncen tokens.
 * Returns { action:"filter", filters:[...] } with 2+ items, or null.
 */
function parseCompoundLastResultFilter(promptText) {
  let remaining = String(promptText || "")
    .replace(/^(?:and\s+|only\s+|just\s+|show\s+(?:only\s+)?|filter\s+(?:to\s+|for\s+)?(?:only\s+)?)/i, "")
    .replace(/\?+$/, "")
    .trim();

  const filters = [];

  // Gender
  const genderRx = /\b(females?|women|males?|men)\b/i;
  const genderM = remaining.match(genderRx);
  if (genderM) {
    filters.push({ kind: "gender", value: /female|women/i.test(genderM[1]) ? "Female" : "Male" });
    remaining = remaining.replace(genderM[0], "").trim().replace(/\s+/g, " ");
  }

  // Ordinal century: "19th century"
  const cenRx = /\b(?:born\s+)?(?:in\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\s+century\b/i;
  const cenM = remaining.match(cenRx);
  if (cenM) {
    const n = Number(cenM[1]);
    if (Number.isFinite(n) && n >= 1 && n <= 22) {
      filters.push({ kind: "birthYearRange", start: (n - 1) * 100, end: (n - 1) * 100 + 99 });
      remaining = remaining.replace(cenM[0], "").trim().replace(/\s+/g, " ");
    }
  }

  // WT+ NCen token: "19Cen" / "19cen"
  if (!cenM) {
    const wtCenM = remaining.match(/\b(\d{1,2})[Cc]en\b/);
    if (wtCenM) {
      const n = Number(wtCenM[1]);
      if (Number.isFinite(n) && n >= 1 && n <= 22) {
        filters.push({ kind: "birthYearRange", start: (n - 1) * 100, end: (n - 1) * 100 + 99 });
        remaining = remaining.replace(wtCenM[0], "").trim().replace(/\s+/g, " ");
      }
    }
  }

  // Decade: "1850s"
  const decadeM = remaining.match(/\b(\d{4})s\b/);
  if (decadeM && !cenM) {
    const d = Number(decadeM[1]);
    if (Number.isFinite(d)) {
      filters.push({ kind: "birthYearRange", start: d, end: d + 9 });
      remaining = remaining.replace(decadeM[0], "").trim().replace(/\s+/g, " ");
    }
  }

  // Year range: "1800-1900" / "1800 to 1900"
  if (!cenM && !decadeM) {
    const rangeM = remaining.match(/\b(?:born\s+)?(?:between\s+)?(\d{4})\s*(?:[-\u2013]|to|and)\s*(\d{4})\b/i);
    if (rangeM) {
      filters.push({ kind: "birthYearRange", start: Number(rangeM[1]), end: Number(rangeM[2]) });
      remaining = remaining.replace(rangeM[0], "").trim().replace(/\s+/g, " ");
    }
  }

  // Strip dangling connectors
  remaining = remaining
    .replace(/^(?:and|,)\s*/i, "")
    .replace(/\s*(?:and|,)$/i, "")
    .trim();

  if (filters.length >= 2 && !remaining) {
    return { action: "filter", filters };
  }
  // Single filter from compound parse (e.g. only a century token with no other qualifiers)
  if (filters.length === 1 && !remaining) {
    return { action: "filter", filter: filters[0] };
  }
  return null;
}

function parseLastResultPrompt(prompt, options = {}) {
  const allowConversationalFollowups = Boolean(options?.allowConversationalFollowups);
  const normalizedPrompt = String(prompt || "").trim();
  const connectiveNormalizedPrompt = allowConversationalFollowups
    ? normalizedPrompt.replace(/^(?:and|also|plus|then)\s+/i, "").trim()
    : normalizedPrompt;
  const promptForMatch = connectiveNormalizedPrompt || normalizedPrompt;
  if (!normalizedPrompt) {
    return null;
  }

  // L3 (live, 2026-10-03): "how many of them died before 1900?" after "only the
  // women" went back to WT+ and lost the local filter. "how many / which / who of
  // them …" is the same filter as "only those who …"; only a structured filter
  // counts (a free-text one would be a guess).
  if (allowConversationalFollowups) {
    const resultPick = parseResultPickPrompt(promptForMatch);
    if (resultPick) return resultPick;
    const ofThem = promptForMatch.match(
      /^(?:how\s+many|which(?:\s+ones)?|who)\s+(?:of\s+(?:them|those|these)|among\s+them)\s+(?:(?:were|are|was)\s+)?(.+?)\??$/i
    );
    if (ofThem?.[1]) {
      for (const lead of ["only those", "only the"]) {
        const inner = parseLastResultPrompt(`${lead} ${ofThem[1]}`, options);
        const filters = inner?.filters || (inner?.filter ? [inner.filter] : []);
        if (inner?.action === "filter" && filters.length && filters.every((filter) => filter.kind !== "text")) return inner;
      }
    }
  }

  // Try compound filter parse first (e.g. "19th century female", "male 1800-1900").
  // This runs before any individual-pattern checks so combinations are handled in one step.
  const compoundFilter = parseCompoundLastResultFilter(promptForMatch);
  if (compoundFilter) {
    return compoundFilter;
  }

  if (allowConversationalFollowups) {
    const orNameFilterMatch = normalizedPrompt.match(/^or\s+(?:name\s*(?:is|=)?|named?\s+|called\s+)(.+?)\??$/i);
    if (orNameFilterMatch?.[1]) {
      return {
        action: "filter",
        filter: {
          kind: "name",
          value: orNameFilterMatch[1].trim(),
          operator: "or",
        },
      };
    }

    const orFollowupMatch = normalizedPrompt.match(/^or\s+(.+?)\??$/i);
    if (orFollowupMatch?.[1]) {
      return {
        action: "filter",
        filter: {
          kind: "text",
          value: orFollowupMatch[1].trim(),
          operator: "or",
        },
      };
    }
  }

  const tableMatch = promptForMatch.match(
    /^(?:show|open)(?:\s+(?:that|the|last|latest|results?))?(?:\s+in)?\s+a?\s*table\??$/i
  );
  if (tableMatch) {
    return { action: "table" };
  }

  if (
    /^(?:can\s+you\s+)?(?:count\s+(?:them|results?)|how\s+many\s+(?:are\s+there|results?\s+are\s+there|of\s+them\s+are\s+there))\??$/i.test(
      promptForMatch
    )
  ) {
    return { action: "count" };
  }

  const countByMatch = promptForMatch.match(
    /^(?:can\s+you\s+)?(?:count|group)\s+(?:them|the\s+results|results)?\s*by\s+(.+?)\??$/i
  );
  if (countByMatch?.[1]) {
    const field = normalizeFieldName(countByMatch[1]);
    if (field) {
      return { action: "countBy", field };
    }
  }

  const sortMatch = promptForMatch.match(
    /^(?:can\s+you\s+)?(?:sort|order)\s+(?:them|the\s+results|results)?\s*by\s+(.+?)(?:\s+(ascending|descending|asc|desc))?\??$/i
  );
  if (sortMatch?.[1]) {
    const field = normalizeFieldName(sortMatch[1]);
    if (field) {
      return {
        action: "sort",
        field,
        direction: /desc/i.test(sortMatch[2] || "") ? "desc" : "asc",
      };
    }
  }

  const genderMatch = promptForMatch.match(
    /^(?:(show|list|keep|filter(?:\s+(?:to|for))?)\s+)?(?:(only|just)\s+)?(?:the\s+)?(females|female|women|males|male|men|girls|boys|daughters|sons|ladies)(\s+only)?\??$/i
  );
  // "only the women", "just the men", "women only"; a bare "women" is not a filter.
  // M2 (live, 2026-10-03): "only the girls" on her grandchildren was a text filter.
  if (genderMatch?.[3] && (genderMatch[1] || genderMatch[2] || genderMatch[4])) {
    return {
      action: "filter",
      filter: {
        kind: "gender",
        value: /female|women|girls|daughters|ladies/i.test(genderMatch[3]) ? "Female" : "Male",
      },
    };
  }

  const surnameMatch = promptForMatch.match(
    /^(?:show|list|keep|filter(?:\s+(?:to|for))?)\s+(?:only\s+)?(?:the\s+)?(.+?)\s+family\??$/i
  );
  if (surnameMatch?.[1]) {
    return {
      action: "filter",
      filter: {
        kind: "surname",
        value: surnameMatch[1].trim(),
      },
    };
  }

  const bornInMatch = promptForMatch.match(
    /^(?:show|list|keep|filter(?:\s+(?:to|for))?)\s+(?:only\s+)?(?:people\s+)?born\s+in\s+(.+?)\??$/i
  );
  if (bornInMatch?.[1]) {
    const bornInValue = bornInMatch[1].trim();
    const exactYearBorn = bornInValue.match(/^(\d{4})$/);
    const decadeBorn = bornInValue.match(/^(\d{3}0)s$/);
    if (exactYearBorn) {
      return {
        action: "filter",
        filter: { kind: "birthYearRange", start: Number(exactYearBorn[1]), end: Number(exactYearBorn[1]) },
      };
    }
    if (decadeBorn) {
      return {
        action: "filter",
        filter: { kind: "birthYearRange", start: Number(decadeBorn[1]), end: Number(decadeBorn[1]) + 9 },
      };
    }
    return { action: "filter", filter: { kind: "birthLocation", value: bornInValue } };
  }

  if (allowConversationalFollowups) {
    const followupBornInMatch = promptForMatch.match(/^(?:only\s+)?(?:those|them|people)?\s*born\s+in\s+(.+?)\??$/i);
    if (followupBornInMatch?.[1]) {
      const bornVal = followupBornInMatch[1].trim();
      const exactYear = bornVal.match(/^(\d{4})$/);
      const decadeVal = bornVal.match(/^(\d{3}0)s$/);
      if (exactYear) {
        return {
          action: "filter",
          filter: { kind: "birthYearRange", start: Number(exactYear[1]), end: Number(exactYear[1]) },
        };
      }
      if (decadeVal) {
        return {
          action: "filter",
          filter: { kind: "birthYearRange", start: Number(decadeVal[1]), end: Number(decadeVal[1]) + 9 },
        };
      }
      return { action: "filter", filter: { kind: "birthLocation", value: bornVal } };
    }
  }

  const bornBeforeAfterMatch = promptForMatch.match(
    /^(?:show|list|keep|filter(?:\s+(?:to|for))?)?\s*(?:only\s+)?(?:those|them|people)?\s*born\s+(before|after)\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i
  );
  if (bornBeforeAfterMatch?.[1] && bornBeforeAfterMatch?.[2]) {
    return {
      action: "filter",
      filter: {
        kind: "birthDate",
        direction: String(bornBeforeAfterMatch[1]).toLowerCase(),
        value: bornBeforeAfterMatch[2].trim(),
      },
    };
  }

  // "born in the 19th century" / "19th century" / "the 19th century" / "in the 19th century"
  const centuryMatch = promptForMatch.match(
    /^(?:(?:show|list|keep|filter(?:\s+(?:to|for))?)\s+(?:only\s+)?(?:people\s+)?)?(?:born\s+)?(?:in\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\s+century\??$/i
  );
  if (centuryMatch?.[1]) {
    const n = Number(centuryMatch[1]);
    if (Number.isFinite(n) && n >= 1 && n <= 22) {
      return { action: "filter", filter: { kind: "birthYearRange", start: (n - 1) * 100, end: (n - 1) * 100 + 99 } };
    }
  }

  // "1800-1900" / "1800 to 1900" / "born 1800-1900" / "born between 1800 and 1900"
  const yearRangeMatch = promptForMatch.match(
    /^(?:(?:show|list|keep|filter(?:\s+(?:to|for))?)\s+(?:only\s+)?(?:people\s+)?)?(?:born\s+)?(?:between\s+)?(\d{4})\s*(?:[-\u2013]|to|and)\s*(\d{4})\??$/i
  );
  if (yearRangeMatch?.[1] && yearRangeMatch?.[2]) {
    return {
      action: "filter",
      filter: { kind: "birthYearRange", start: Number(yearRangeMatch[1]), end: Number(yearRangeMatch[2]) },
    };
  }

  if (allowConversationalFollowups) {
    // "the 19th century?" / "19th century?"
    const followupCenturyMatch = promptForMatch.match(/^(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\s+century\??$/i);
    if (followupCenturyMatch?.[1]) {
      const n = Number(followupCenturyMatch[1]);
      if (Number.isFinite(n) && n >= 1 && n <= 22) {
        return { action: "filter", filter: { kind: "birthYearRange", start: (n - 1) * 100, end: (n - 1) * 100 + 99 } };
      }
    }
    // "1800-1900" / "born between 1800 and 1900" conversational
    const followupYearRangeMatch = promptForMatch.match(
      /^(?:born\s+)?(?:between\s+)?(\d{4})\s*(?:[-\u2013]|to|and)\s*(\d{4})\??$/i
    );
    if (followupYearRangeMatch?.[1] && followupYearRangeMatch?.[2]) {
      return {
        action: "filter",
        filter: {
          kind: "birthYearRange",
          start: Number(followupYearRangeMatch[1]),
          end: Number(followupYearRangeMatch[2]),
        },
      };
    }
  }

  const diedInMatch = promptForMatch.match(
    /^(?:show|list|keep|filter(?:\s+(?:to|for))?)\s+(?:only\s+)?(?:people\s+)?died\s+in\s+(.+?)\??$/i
  );
  if (diedInMatch?.[1]) {
    return {
      action: "filter",
      filter: {
        kind: "deathLocation",
        value: diedInMatch[1].trim(),
      },
    };
  }

  if (allowConversationalFollowups) {
    const followupDiedInMatch = promptForMatch.match(/^(?:only\s+)?(?:those|them|people)?\s*died\s+in\s+(.+?)\??$/i);
    if (followupDiedInMatch?.[1]) {
      return {
        action: "filter",
        filter: {
          kind: "deathLocation",
          value: followupDiedInMatch[1].trim(),
        },
      };
    }
  }

  const diedBeforeAfterMatch = promptForMatch.match(
    /^(?:show|list|keep|filter(?:\s+(?:to|for))?)?\s*(?:only\s+)?(?:those|them|people)?\s*died\s+(before|after)\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\??$/i
  );
  if (diedBeforeAfterMatch?.[1] && diedBeforeAfterMatch?.[2]) {
    return {
      action: "filter",
      filter: {
        kind: "deathDate",
        direction: String(diedBeforeAfterMatch[1]).toLowerCase(),
        value: diedBeforeAfterMatch[2].trim(),
      },
    };
  }

  if (allowConversationalFollowups) {
    const followupFromMatch = promptForMatch.match(
      /^(?:only\s+)?(?:those|them|people)?\s*(?:who\s+are\s+|who\s+were\s+|that\s+are\s+|that\s+were\s+)?from\s+(.+?)\??$/i
    );
    if (followupFromMatch?.[1]) {
      return {
        action: "filter",
        filter: {
          // In conversational follow-ups, "from X" is interpreted as birthplace unless explicit death wording is used.
          kind: "birthLocation",
          value: followupFromMatch[1].trim(),
        },
      };
    }
  }

  if (allowConversationalFollowups) {
    const followupInMatch = promptForMatch.match(/^(?:only\s+)?(?:those|them|people)?\s*in\s+(.+?)\??$/i);
    if (followupInMatch?.[1]) {
      const inVal = followupInMatch[1].trim();
      const exactYearIn = inVal.match(/^(\d{4})$/);
      const decadeIn = inVal.match(/^(\d{3}0)s$/);
      if (exactYearIn) {
        return {
          action: "filter",
          filter: { kind: "birthYearRange", start: Number(exactYearIn[1]), end: Number(exactYearIn[1]) },
        };
      }
      if (decadeIn) {
        return {
          action: "filter",
          filter: { kind: "birthYearRange", start: Number(decadeIn[1]), end: Number(decadeIn[1]) + 9 },
        };
      }
      return { action: "filter", filter: { kind: "text", value: inVal } };
    }
  }

  if (allowConversationalFollowups) {
    // Bare location refinement: "Cheshire, England" after a results table
    // narrows the results to that place. The comma requirement keeps bare
    // person-name follow-ups ("George Beacall") out of this rule, and the
    // keyword check keeps new-search prompts ("London, England unsourced")
    // out of it.
    const bareLocationMatch = promptForMatch.match(
      /^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'\- ]*(?:,\s*[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'\- ]*)+)[?.!]*$/
    );
    if (bareLocationMatch?.[1]) {
      const searchKeywordRegex =
        /\b(?:and|or|not|only|unsourced|unconnected|connected|orphaned|born|died|birth|death|married|marriage|century|decade|suggestions?|managed|managers?|project|ppp|templates?|categor(?:y|ies)|profiles?|bios?|sort|count|show|list|keep|filter|open|table|female|male|women|men|children|kids)\b/i;
      if (!searchKeywordRegex.test(bareLocationMatch[1])) {
        return {
          action: "filter",
          filter: {
            kind: "text",
            value: bareLocationMatch[1].trim(),
          },
        };
      }
    }
  }

  const countryMatch = promptForMatch.match(
    /^(?:show|list|keep|filter(?:\s+(?:to|for))?)\s+(?:only\s+)?(?:people\s+)?in\s+(.+?)\??$/i
  );
  if (countryMatch?.[1]) {
    return {
      action: "filter",
      filter: {
        kind: "country",
        value: countryMatch[1].trim(),
      },
    };
  }

  const nameFilterMatch = promptForMatch.match(
    /^(?:show|list|keep|filter(?:\s+(?:to|for))?)?\s*(?:only\s+)?(?:those|them|people)?\s*(?:name\s*(?:is|=)?|named?|called)\s+(.+?)\??$/i
  );
  if (nameFilterMatch?.[1]) {
    return {
      action: "filter",
      filter: {
        kind: "name",
        value: nameFilterMatch[1].trim(),
      },
    };
  }

  // Conversational catch-all: "Only George?", "Only those named George?", "Only Jones?"
  // Must come after all specific location/gender/born-in patterns so those take priority.
  if (allowConversationalFollowups) {
    const followupTextMatch = promptForMatch.match(
      /^only\s+(?:(?:those|them|people)\s+)?(?:named?\s+|called\s+)?(.+?)\??$/i
    );
    if (followupTextMatch?.[1]) {
      return {
        action: "filter",
        filter: {
          kind: "text",
          value: followupTextMatch[1].trim(),
        },
      };
    }
  }

  const textFilterMatch = promptForMatch.match(/^(?:show|list|keep|filter(?:\s+(?:to|for))?)\s+(?:only\s+)?(.+?)\??$/i);
  if (textFilterMatch?.[1]) {
    return {
      action: "filter",
      filter: {
        kind: "text",
        value: textFilterMatch[1].trim(),
      },
    };
  }

  return null;
}

const SPOUSE_ORDINALS = { first: 1, "1st": 1, second: 2, "2nd": 2, third: 3, "3rd": 3, fourth: 4, "4th": 4, last: "last" };

function parseSpousePrompt(prompt) {
  // Live D1, 2026-10-03: "who was Ellen's husband?" searched for "who was Ellen".
  const normalized = String(prompt || "")
    .trim()
    .replace(/^(?:who|what)\s+(?:was|were|is|are)\s+(?:the\s+names?\s+of\s+)?/i, "")
    .replace(/^(?:tell\s+me|show\s+me|list)\s+/i, "");
  if (!normalized) {
    return null;
  }

  // "Ellen's first husband", "her second wife", "his last spouse": one spouse, by marriage order.
  const ordinalMatch = normalized.match(
    /^\s*(.+?)(?:'s|’s)?\s+(first|1st|second|2nd|third|3rd|fourth|4th|last)\s+(wife|husband|spouse)\??$/i
  );
  if (ordinalMatch?.[1]) {
    const rawTarget = ordinalMatch[1].trim();
    const isPronoun = /^(?:her|his|their|this\s+person|the\s+profile\s+person)$/i.test(rawTarget);
    const target = isPronoun ? getProfilePersonInfo()?.Name || "" : rawTarget.replace(/(?:'s|’s)$/, "");
    if (!target || (!isPronoun && !/(?:'s|’s)\s/.test(ordinalMatch[0]) && !/-\d+$/.test(target))) return null;
    const word = ordinalMatch[3].toLowerCase();
    return {
      gender: word === "wife" ? "Female" : word === "husband" ? "Male" : null,
      target,
      relationshipLabel: word === "wife" ? "wives" : word === "husband" ? "husbands" : "spouses",
      ordinal: SPOUSE_ORDINALS[ordinalMatch[2].toLowerCase()],
    };
  }

  // Pattern: "wives/husbands/spouses of X" or "all wives of X" or "X's wives/husbands/spouses"
  const wifeMatch = normalized.match(/^\s*(?:all\s+)?(?:wives|wife|spouses|spouse)\.?\s+of\s+(.+?)\??$/i);
  if (wifeMatch?.[1]) {
    return {
      gender: "Female",
      target: wifeMatch[1].trim(),
      relationshipLabel: "wives",
    };
  }

  const husbandMatch = normalized.match(/^\s*(?:all\s+)?(?:husbands|husband)\.?\s+of\s+(.+?)\??$/i);
  if (husbandMatch?.[1]) {
    return {
      gender: "Male",
      target: husbandMatch[1].trim(),
      relationshipLabel: "husbands",
    };
  }

  const spouseMatch = normalized.match(/^\s*(?:all\s+)?spouses\.?\s+of\s+(.+?)\??$/i);
  if (spouseMatch?.[1]) {
    return {
      gender: null,
      target: spouseMatch[1].trim(),
      relationshipLabel: "spouses",
    };
  }

  // "her husband", "his wives" (E12 neighbour, 2026-10-03: fell to the AI).
  const pronounSpouseMatch = normalized.match(/^\s*(?:her|his|their)\s+(wives|wife|husbands|husband|spouses|spouse)\??$/i);
  if (pronounSpouseMatch?.[1] && getProfilePersonInfo()?.Name) {
    const word = pronounSpouseMatch[1].toLowerCase();
    return {
      gender: /^wi/.test(word) ? "Female" : /^husband/.test(word) ? "Male" : null,
      target: getProfilePersonInfo().Name,
      relationshipLabel: /^wi/.test(word) ? "wives" : /^husband/.test(word) ? "husbands" : "spouses",
    };
  }

  // Possessive forms: "X's wife", "X's husband", "X's spouse"
  const possessiveMatch = normalized.match(/^\s*(.+?)'s\s+(?:wives|wife|husbands|husband|spouses|spouse)\??$/i);
  if (possessiveMatch?.[1]) {
    return {
      gender: null,
      target: possessiveMatch[1].trim(),
      relationshipLabel: "spouses",
    };
  }

  return null;
}

// Words that are never a person's name or a relation. When the router's parse
// puts them there ("show 10 generations of descendants" → subject
// "descendants"; "his father's wife's siblings" → subject "his father"), it has
// misread the prompt, so let the AI planner read it instead. Variant testing,
// 2026-10-02: the AI interprets, the code executes.
const NOT_A_SUBJECT_RE =
  /^(?:his|her|their|its|my|me|this|that)\b|\b(?:descendants?|ancestors?|generations?|cousins?|cc\d+|profiles?|for\s+me|of\s+mine)\b/i;
const NOT_A_RELATION_RE = /\b(?:who|were|was|from|generations?|cc\d+|profiles?|people)\b/i;
// "who are my brick walls?" parsed as a relation "brick walls" (live C3,
// 2026-10-03); with no family word it is not a relation, so the planner gets it.
const KIN_WORD_RE =
  /(?:parent|father|mother|dad|mum|mom|son|daughter|child|kid|sibling|brother|sister|spouse|husband|wife|wives|partner|aunt|uncle|niece|nephew|cousin|grand|great|step|half|in-law|relative|family|kin|ancestor|descendant)/i;

// A list intent ("Calvin's children") inside a connection question ("how am
// I connected to Calvin's children?") is a misread (live, 2026-10-03).
const CONNECTION_QUESTION_RE = /\b(?:related|connected)\s+(?:to|with)\b|\bconnection\s+(?:to|between|with)\b/i;
const LIST_INTENTS = new Set([
  ChatIntent.RELATION_COUNT,
  ChatIntent.DESCENDANT_LIST,
  ChatIntent.ANCESTOR_LIST,
  ChatIntent.SPOUSE_LIST,
]);

// "am I related to anyone famous?" → WT+ Notables in the CC7 (Cook-8721: 12,
// live 2026-10-03). "famous ancestors" → Notables among the ancestors. Returns
// the canonical query chat_profile_search parses, or null.
const FAMOUS_RE = String.raw`(?:famous|notable|well[- ]known|celebrated)`;
export function parseNotableRelativesPrompt(text) {
  const t = String(text || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/^(?:please\s+)?(?:(?:show|list|find|tell)\s+(?:me\s+)?)?/i, "");
  const root = (subject) =>
    !subject || /^(?:i|me|my|we|us|our)$/i.test(subject) ? "my" : /^[A-Z][A-Za-z'_ -]*-\d+$/.test(subject) ? `${subject}'s` : "";
  const scope = (word) => (/ancestor/i.test(word || "") ? "ancestors" : "CC7");
  let m = t.match(
    new RegExp(String.raw`^(?:am\s+(i)|are\s+(we)|is\s+(\S+))\s+(?:related|connected)\s+to\s+(?:any(?:one|body)|someone|somebody|any\s+(?:people|person))\s+${FAMOUS_RE}$`, "i")
  );
  if (m) {
    const r = root(m[1] || m[2] || m[3]);
    return r ? `notables in ${r} CC7` : null;
  }
  m = t.match(
    new RegExp(String.raw`^(?:do\s+(i|we)|does\s+(\S+))\s+have\s+(?:any\s+)?${FAMOUS_RE}\s+(relatives|cousins|kin|family|ancestors)$`, "i")
  );
  if (m) {
    const r = root(m[1] || m[2]);
    return r ? `notables in ${r} ${scope(m[3])}` : null;
  }
  m = t.match(
    new RegExp(String.raw`^(?:(my|our)|(\S+?)['’]s)\s+${FAMOUS_RE}\s+(relatives|cousins|kin|family|ancestors)$`, "i")
  );
  if (m) {
    const r = root(m[1] || m[2]);
    return r ? `notables in ${r} ${scope(m[3])}` : null;
  }
  m = t.match(
    new RegExp(String.raw`^(?:notables|${FAMOUS_RE}\s+(?:people|profiles|persons|relatives))\s+(?:in|among)\s+(?:(my)|(\S+?)['’]s)\s+(cc7|family|tree|ancestors)$`, "i")
  );
  if (m) {
    const r = root(m[1] || m[2]);
    return r ? `notables in ${r} ${scope(m[3])}` : null;
  }
  return null;
}

// "my DNA-confirmed relationships" → relatives whose father or mother link is
// marked "Confirmed with DNA" (Cook-8721's CC7: 13; live 2026-10-03).
export function parseDnaConfirmedPrompt(text) {
  const m = String(text || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/^(?:please\s+)?(?:(?:show|list|find|which\s+are|what\s+are)\s+(?:me\s+)?)?/i, "")
    .match(
      /^(?:(my|our)|([A-Z][A-Za-z'_ -]*-\d+)['’]s)\s+(?:dna[- ](?:confirmed|verified|proven))\s+(relationships?|relatives|links|connections|parents|ancestors|lines)$/i
    );
  if (!m) return null;
  const root = m[1] ? "my" : `${m[2]}'s`;
  return `dna-confirmed in ${root} ${/ancestor|parent|line/i.test(m[3]) ? "ancestors" : "CC7"}`;
}

// "export these" (C33) re-ran the last search (live, 2026-10-03). Returns the
// export format for a request to export the current result, or null.
export function parseExportResultPrompt(text) {
  const m = String(text || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .match(
      /^(?:please\s+)?(?:can\s+you\s+)?(?:export|download|save)(?:\s+(?:these|this|them|it|all(?:\s+of\s+them)?|the\s+(?:results?|table|list|rows)|results?))?(?:\s+(?:as|to|in)\s+(?:an?\s+)?(csv|xlsx|excel|spreadsheet|json|wikitable|wiki\s+table)(?:\s+file)?)?$/i
    );
  if (!m) return null;
  const format = String(m[1] || "csv").toLowerCase();
  if (/excel|spreadsheet|xlsx/.test(format)) return "xlsx";
  if (/wiki/.test(format)) return "wikitable";
  return format;
}

// "how many of my 5th great-grandparents are known?" (C4): the relation-count
// path read it as "grandparents" of the page person (live, 2026-10-03). Returns
// an ANCESTOR_LIST params object for one generation, counted against 2^g.
const GRANDPARENT_GENERATION_RE = String.raw`(?:(?:\d+(?:st|nd|rd|th)?|\d+\s*x)\s+)?(?:great[\s-]*)*grand[\s-]*parents?`;
export function parseAncestorGenerationCountPrompt(text) {
  const t = String(text || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  const m =
    t.match(
      new RegExp(
        String.raw`^how\s+many\s+(?:of\s+)?(my|our|[A-Z][A-Za-z'_ -]*-\d+['’]s)\s+(${GRANDPARENT_GENERATION_RE})(?:\s+(?:are|have\s+been)\s+(?:known|recorded|identified|found|on\s+wikitree)|\s+do\s+(?:i|we)\s+(?:have|know))?$`,
        "i"
      )
    ) ||
    t.match(new RegExp(String.raw`^how\s+many\s+()(${GRANDPARENT_GENERATION_RE})\s+do\s+(?:i|we)\s+(?:have|know)$`, "i"));
  if (!m) return null;
  const owner = !m[1] || /^(?:my|our)$/i.test(m[1]) ? "my" : m[1];
  const parsed = parseAncestorListPrompt(`show ${owner} ${m[2]}`);
  if (!parsed?.generation || parsed.includeUpTo) return null;
  return { ...parsed, countMode: true, subjectText: `${owner} ancestors` };
}

// C5 "where were my ancestors born?" (counts by country) and C6 "which of my
// ancestors emigrated?" (born and died in different countries). Both fell to
// the AI (live, 2026-10-03).
const ANCESTOR_OWNER_RE = String.raw`(my|our|his|her|their|[A-Z][A-Za-z'_ -]*-\d+['’]s)`;
export function parseAncestorPlacePrompt(text) {
  const t = String(text || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  const build = (owner, extra) => {
    const who = /^our$/i.test(owner) ? "my" : owner;
    const base = parseAncestorListPrompt(`${who} ancestors`);
    // Every known ancestor, not the 10-generation list default.
    return base
      ? { ...base, generation: MAX_ANCESTOR_GENERATIONS, ...extra, subjectText: `${who} ancestors` }
      : null;
  };
  let m = t.match(
    new RegExp(
      String.raw`^(?:where\s+(?:were|was)\s+${ANCESTOR_OWNER_RE}\s+ancestors\s+(born|from)|where\s+did\s+${ANCESTOR_OWNER_RE}\s+ancestors\s+(come\s+from|die|live)|(?:which|what)\s+countries\s+(?:were|did)\s+${ANCESTOR_OWNER_RE}\s+ancestors\s+(born\s+in|come\s+from|die\s+in))$`,
      "i"
    )
  );
  if (m) {
    const owner = m[1] || m[3] || m[5];
    const verb = m[2] || m[4] || m[6];
    return build(owner, { placeSummary: /die/i.test(verb) ? "death" : "birth" });
  }
  m = t.match(
    new RegExp(
      String.raw`^(?:(?:which|who)\s+of\s+${ANCESTOR_OWNER_RE}\s+ancestors\s+(?:emigrated|immigrated|migrated|moved\s+(?:abroad|overseas|to\s+another\s+country))|${ANCESTOR_OWNER_RE}\s+(?:emigrant|immigrant)\s+ancestors|${ANCESTOR_OWNER_RE}\s+ancestors\s+who\s+(?:emigrated|immigrated))$`,
      "i"
    )
  );
  if (m) return build(m[1] || m[2] || m[3], { emigrated: true });
  return null;
}

// C9 "my most recent ancestor born in Germany" (fell to the AI, 2026-10-03):
// the place-filtered ancestor list, then one row picked by the handler.
// S10: "how far back does her tree go?" — the full ancestor list, then its depth.
export function parseAncestorDepthPrompt(text) {
  const owner = parseAncestorDepthOwner(text);
  const base = owner ? parseAncestorListPrompt(`${owner} ancestors`) : null;
  return base ? { ...base, generation: MAX_ANCESTOR_GENERATIONS, includeUpTo: true, pick: "depth", subjectText: `${owner} ancestors` } : null;
}

// "how many direct ancestors does he have?", with or without "what is the
// earliest birthdate" and "how many generations back": the count, the depth
// and the earliest-born ancestor in one answer (live, 2026-10-08).
export function parseAncestorSummaryPrompt(text) {
  const owner = parseAncestorSummaryOwner(text);
  const base = owner ? parseAncestorListPrompt(`${owner} ancestors`) : null;
  return base ? { ...base, generation: MAX_ANCESTOR_GENERATIONS, includeUpTo: true, pick: "summary", subjectText: `${owner} ancestors`, ...(asksAboutRepeats(text) ? { repeats: true } : {}) } : null;
}

export function parseAncestorPickPrompt(text) {
  const m = String(text || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .match(
      new RegExp(
        String.raw`^(?:(?:who\s+(?:is|was)|show(?:\s+me)?|find)\s+)?${ANCESTOR_OWNER_RE}\s+(most\s+recent|latest|nearest|closest|youngest|earliest|oldest|most\s+distant|furthest)\s+(?:known\s+)?ancestor(?:\s+(?:who\s+was\s+|that\s+was\s+)?(born\s+in|from|who\s+died\s+in|died\s+in)\s+(.+))?$`,
        "i"
      )
    );
  if (!m) return null;
  const owner = /^our$/i.test(m[1]) ? "my" : m[1];
  const base = parseAncestorListPrompt(`${owner} ancestors`);
  if (!base) return null;
  // O6 (live, 2026-10-03): "who is my earliest known ancestor?" (no place) became
  // a name search; the AI then hedged.
  if (!m[4]) {
    return { ...base, generation: MAX_ANCESTOR_GENERATIONS, pick: /recent|latest|nearest|closest|youngest/i.test(m[2]) ? "recent" : "earliest", subjectText: `${owner} ancestors` };
  }
  return {
    ...base,
    generation: MAX_ANCESTOR_GENERATIONS,
    location: m[4].trim(),
    locationField: /died/i.test(m[3]) ? "DeathLocation" : "BirthLocation",
    pick: /recent|latest|nearest|closest|youngest/i.test(m[2]) ? "recent" : "earliest",
    subjectText: `${owner} ancestors`,
  };
}

// D7 "who in my tree lived the longest?" (a failed name search, 2026-10-03):
// the ancestor list, then the longest life picked by the handler. "My tree" is
// taken as direct ancestors, and the answer says so.
export function parseLongestLivedPrompt(text) {
  const t = String(text || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  const LIVED = String.raw`(?:lived\s+(?:the\s+)?longest|lived\s+to\s+the\s+greatest\s+age|died\s+(?:the\s+)?oldest|reached\s+the\s+greatest\s+age|had\s+the\s+longest\s+life)`;
  const SCOPE = String.raw`(?:(?:family\s+)?tree|family|ancestors|ancestry)`;
  const patterns = [
    // "who in my tree lived the longest", "which of my ancestors lived longest"
    new RegExp(String.raw`^(?:who|which(?:\s+(?:person|one|ancestor))?)\s+(?:in|of|among)\s+${ANCESTOR_OWNER_RE}\s+(${SCOPE})\s+${LIVED}$`, "i"),
    // "my longest-lived ancestor", "who is the longest lived person in my tree"
    new RegExp(String.raw`^(?:(?:who\s+(?:is|was)|show(?:\s+me)?|find)\s+)?${ANCESTOR_OWNER_RE}\s+()longest[\s-]+lived\s+(?:known\s+)?ancestor$`, "i"),
    new RegExp(String.raw`^(?:who\s+(?:is|was)\s+)?the\s+(?:longest[\s-]+lived|oldest)\s+(?:person|ancestor|one)\s+(?:in|of|among)\s+${ANCESTOR_OWNER_RE}\s+(${SCOPE})$`, "i"),
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (!m) continue;
    const owner = /^our$/i.test(m[1]) ? "my" : m[1];
    const base = parseAncestorListPrompt(`${owner} ancestors`);
    if (!base) return null;
    return {
      ...base,
      generation: MAX_ANCESTOR_GENERATIONS,
      pick: "longest",
      treeTakenAsAncestors: /tree|family/i.test(m[2] || ""),
      subjectText: `${owner} ancestors`,
    };
  }
  return null;
}

export function declineMisreadRoute(routed, prompt = "") {
  const intent = routed?.intent;
  const params = routed?.params || {};
  const misread =
    (LIST_INTENTS.has(intent) && CONNECTION_QUESTION_RE.test(String(prompt || ""))) ||
    (intent === ChatIntent.RELATION_COUNT &&
      ((params.subjectMode === "named" && NOT_A_SUBJECT_RE.test(String(params.subjectName || ""))) ||
        NOT_A_RELATION_RE.test(String(params.relationRaw || "")) ||
        (params.relationRaw && !KIN_WORD_RE.test(String(params.relationRaw))))) ||
    (intent === ChatIntent.PROFILE_SEARCH &&
      /\bcc\d+\b/i.test(String(params.query || "")) &&
      !/^(?:notables|dna-confirmed) in /i.test(String(params.query || ""))) ||
    (intent === ChatIntent.SPOUSE_LIST && /\b(?:siblings?|bios?|brothers?|sisters?|children)\b/i.test(String(params.target || "")));
  return misread ? { intent: ChatIntent.FALLBACK_AI, params: {} } : routed;
}

const KIN_DETAIL_INTENTS = new Set([
  ChatIntent.ANCESTOR_LIST,
  ChatIntent.DESCENDANT_LIST,
  ChatIntent.SPOUSE_LIST,
  ChatIntent.RELATION_COUNT,
]);

// H9 (live, 2026-10-03): "show her family tree" was read as a table filter.
// A family tree / pedigree is the ancestor list (its table opens the tree app).
export function parseFamilyTreePrompt(prompt) {
  const match = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .match(
      /^(?:(?:show|display|view|open|give)(?:\s+me)?\s+)?(her|his|their|my|our|[A-Z][A-Za-z'_ -]*?-\d+['’]s|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.]*){0,3}['’]s)\s+(?:family\s+tree|pedigree(?:\s+chart)?|ancestry|tree)$/i
    );
  if (!match) return null;
  const owner = /^our$/i.test(match[1]) ? "my" : match[1];
  const base = parseAncestorListPrompt(`${owner} ancestors`);
  return base ? { ...base, subjectText: base.subjectText || `${owner} ancestors` } : null;
}

// I3 (live, 2026-10-03): "what's the most common first name among her
// descendants?" — the AI declined. The kin list runs, then its rows are grouped.
const KIN_GROUP_FIELDS = [
  { field: "firstName", re: /^(?:first|given|christian)\s+names?$/i },
  { field: "lnab", re: /^(?:sur|last|family)\s*names?$/i },
  { field: "birthLocation", re: /^(?:birth\s*places?|places?\s+of\s+birth)$/i },
  { field: "country", re: /^(?:countries|countries\s+of\s+birth|birth\s+countries)$/i },
];
export function parseKinGroupPrompt(prompt) {
  const match = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .match(
      /^(?:(?:what|which)(?:['’]s|\s+is|\s+are|\s+was|\s+were)\s+)?(?:the\s+)?most\s+(?:common|popular|frequent)\s+(.+?)\s+(?:among|in|of|for|amongst)\s+(.+)$/i
    );
  if (!match) return null;
  const groupBy = KIN_GROUP_FIELDS.find((entry) => entry.re.test(match[1].trim()))?.field;
  if (!groupBy) return null;
  const kinText = match[2].trim();
  if (/\bancestors?\b/i.test(kinText)) {
    const base = parseAncestorListPrompt(kinText);
    return base ? { intent: ChatIntent.ANCESTOR_LIST, params: { ...base, subjectText: base.subjectText || kinText, groupBy } } : null;
  }
  if (/\b(?:descendants?|children|grandchildren|great[\s-]*grandchildren)\b/i.test(kinText)) {
    const base = parseDescendantListPrompt(kinText);
    return base ? { intent: ChatIntent.DESCENDANT_LIST, params: { ...base, subjectText: base.subjectText || kinText, groupBy } } : null;
  }
  return null;
}

// Kin words a misspelling is mended to ("his agrandparents", live 2026-10-08).
const KIN_SPELLINGS = [
  "parents", "grandparents", "grandfathers", "grandmothers", "grandfather", "grandmother", "grandchildren",
  "grandsons", "granddaughters", "siblings", "brothers", "sisters", "children", "daughters", "cousins",
  "nieces", "nephews", "uncles", "aunts", "husbands", "spouses", "ancestors", "descendants", "father", "mother",
  "brother", "sister", "daughter", "cousin", "niece", "nephew", "uncle", "husband", "spouse",
];

function withinOneEdit(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/**
 * "How about his agrandparents?" → "his grandparents?": a follow-up lead-in is
 * dropped, and a kin word one typo away (after his/her/their/my or 's) is mended.
 */
export function tidyKinFollowUp(prompt) {
  let text = String(prompt || "").replace(
    /\b(his|her|their|my|[\w-]+['’]s)\s+([a-z]{6,})\b/gi,
    (whole, owner, word) => {
      const lower = word.toLowerCase();
      if (KIN_SPELLINGS.includes(lower) || KIN_SPELLINGS.includes(`${lower}s`) || /^(?:great|step|half)/.test(lower)) return whole;
      // A changed first letter is another word ("pieces", not "nieces").
      const fixed = KIN_SPELLINGS.find((kin) => (lower[0] === kin[0] || lower.slice(1) === kin) && withinOneEdit(lower, kin));
      return fixed ? `${owner} ${fixed}` : whole;
    }
  );
  const lead = text.match(/^\s*(?:(?:and|so|ok(?:ay)?|then)[,\s]+)?(?:(?:how|what)\s+about\s+)?(?=(?:his|her|their|my)\s)/i);
  if (lead && lead[0].trim()) {
    const rest = text.slice(lead[0].length);
    const kin = rest.match(/^(?:his|her|their|my)\s+(?:(?:great|step|half|maternal|paternal|other)[\s-]*)*([a-z-]+?)['’]?s?\b/i)?.[1];
    if (kin && KIN_SPELLINGS.some((word) => word.replace(/s$/, "") === kin.toLowerCase().replace(/s$/, "") || word === `${kin.toLowerCase()}ren`)) text = rest;
  }
  return text;
}

export function routeChatPrompt(prompt, options = {}) {
  prompt = tidyKinFollowUp(preferBracketedIds(prompt));
  // "show his family tree chart" was a text filter of the last result (live,
  // 2026-10-08): a family tree or pedigree chart is the fan chart.
  prompt = String(prompt || "").replace(/\b(?:family[\s-]+tree|pedigree|ancestor|ancestry)\s+(?:chart|diagram)\b/gi, "fan chart");
  // J4 (live, 2026-10-03): "her parents' other children" are her siblings.
  prompt = rewriteInLawTerms(prompt).replace(/\bparents['’](?:s)?\s+other\s+(children|kids|sons|daughters)\b/i, (_, noun) =>
    /^sons$/i.test(noun) ? "brothers" : /^daughters$/i.test(noun) ? "sisters" : "siblings"
  );
  // S7 (live, 2026-10-03): "list her children with their spouses" was a text
  // filter ("no structured result"); "her children's spouses" works (H6).
  prompt = prompt.replace(
    /^((?:list|show(?:\s+me)?|who\s+(?:are|were))\s+)?((?:my|his|her|their|[A-Z][A-Za-z' -]*?['’]s)\s+(?:children|sons|daughters|siblings|brothers|sisters|grandchildren))\s+(?:with|and)\s+their\s+(spouses|husbands|wives|partners)([.!?]*)$/i,
    (_, lead, kin, spouses, end) => `${lead || ""}${kin}'${/s$/i.test(kin) ? "" : "s"} ${/^partners$/i.test(spouses) ? "spouses" : spouses}${end}`
  );
  // Profile facts are exact phrasings; "how many contributions does X have" mustn't become a relation count.
  // The fractal tree comes first: it takes "visualize my ancestors" (2026-10-03, the user prefers it to a fan chart).
  // The family world (the CC7-style fractal tree) before the CC7 list parsers: "show my CC7 tree".
  const familyWorld = parseFamilyWorldPrompt(prompt);
  if (familyWorld) return { intent: ChatIntent.FAMILY_WORLD, params: familyWorld };
  const fractalTree = parseFractalTreePrompt(prompt);
  if (fractalTree) return { intent: ChatIntent.FRACTAL_TREE, params: fractalTree };
  const completeness = parseCompletenessPrompt(prompt);
  if (completeness) return { intent: ChatIntent.FAN_CHART, params: completeness };
  const dnaChart = parseDnaChartPrompt(prompt);
  if (dnaChart) return { intent: ChatIntent.FAN_CHART, params: dnaChart };
  const dnaCarriers = parseDnaCarrierPrompt(prompt);
  if (dnaCarriers) return { intent: ChatIntent.DESCENDANT_CHART, params: dnaCarriers };
  const agesChart = parseAgesPrompt(prompt);
  if (agesChart) return { intent: ChatIntent.AGES_CHART, params: agesChart };
  const surnameChart = parseSurnameChartPrompt(prompt);
  if (surnameChart) return { intent: ChatIntent.FAN_CHART, params: surnameChart };
  const fanChart = parseFanChartPrompt(prompt);
  if (fanChart) return { intent: ChatIntent.FAN_CHART, params: fanChart };
  const descendantChart = parseDescendantChartPrompt(prompt);
  if (descendantChart) return { intent: ChatIntent.DESCENDANT_CHART, params: descendantChart };
  const lifeLine = parseLifeLinePrompt(prompt);
  if (lifeLine) return { intent: ChatIntent.FAMILY_TIMELINE, params: lifeLine };
  const familyTimeline = parseFamilyTimelinePrompt(prompt);
  if (familyTimeline) return { intent: ChatIntent.FAMILY_TIMELINE, params: familyTimeline };
  const migrationMap = parseMigrationMapPrompt(prompt);
  if (migrationMap) return { intent: ChatIntent.MIGRATION_MAP, params: migrationMap };
  const history = parseHistoryPrompt(prompt);
  if (history) return { intent: ChatIntent.LIFESPANS, params: history };
  const lifespans = parseLifespansPrompt(prompt);
  if (lifespans) return { intent: ChatIntent.LIFESPANS, params: lifespans };
  const nameCloud = parseNameCloudPrompt(prompt);
  if (nameCloud) return { intent: ChatIntent.NAME_CLOUD, params: nameCloud };
  // (family size shares the name cloud's handler: both are ancestor-slot charts)
  const familySize = parseFamilySizePrompt(prompt);
  if (familySize) return { intent: ChatIntent.NAME_CLOUD, params: familySize };
  const matrix = parseFamilyMatrixPrompt(prompt);
  if (matrix) return { intent: ChatIntent.FAMILY_MATRIX, params: matrix };
  const treeOverview = parseTreeOverviewPrompt(prompt);
  if (treeOverview) return { intent: ChatIntent.TREE_OVERVIEW, params: treeOverview };
  const familyCalendar = parseFamilyCalendarPrompt(prompt);
  if (familyCalendar) return { intent: ChatIntent.FAMILY_CALENDAR, params: familyCalendar };
  const dna = parseDnaPrompt(prompt);
  if (dna) return { intent: ChatIntent.DNA, params: dna };
  const earlyProfileFact = parseProfileFactPrompt(prompt);
  if (earlyProfileFact) return { intent: ChatIntent.PROFILE_FACT, params: earlyProfileFact };
  const treeDepth = parseAncestorDepthPrompt(prompt);
  if (treeDepth) return { intent: ChatIntent.ANCESTOR_LIST, params: treeDepth };
  const familyTree = parseFamilyTreePrompt(prompt);
  if (familyTree) return { intent: ChatIntent.ANCESTOR_LIST, params: familyTree };
  const kinGroup = parseKinGroupPrompt(prompt);
  if (kinGroup) return kinGroup;
  // "list her siblings in birth order": route the list, keep the order.
  const kinOrder = splitKinOrderClause(prompt);
  if (kinOrder) {
    const routed = routeChatPrompt(kinOrder.basePrompt, options);
    if (KIN_DETAIL_INTENTS.has(routed.intent)) {
      return { ...routed, params: { ...routed.params, order: kinOrder.order } };
    }
  }
  // "list her children with their birth places": route the list, keep the details.
  const kinDetails = splitKinDetailsClause(prompt);
  if (kinDetails) {
    const routed = declineMisreadRoute(routeChatPromptUnchecked(kinDetails.basePrompt, options), kinDetails.basePrompt);
    if (KIN_DETAIL_INTENTS.has(routed.intent)) {
      return { ...routed, params: { ...routed.params, details: kinDetails.details } };
    }
  }
  const routed = descendantCountRoute(declineMisreadRoute(routeChatPromptUnchecked(prompt, options), prompt));
  // "how many of her siblings were born in England?": the relation, then a filter.
  if (
    routed.intent === ChatIntent.FALLBACK_AI ||
    (routed.intent === ChatIntent.RELATION_COUNT && /\b(?:born|died)\b/i.test(routed.params?.relationRaw || ""))
  ) {
    const kinFilter = splitKinFilterClause(prompt);
    const base = kinFilter ? declineMisreadRoute(routeChatPromptUnchecked(kinFilter.basePrompt, options), kinFilter.basePrompt) : null;
    // Cousins take a place through the planner and their own handler.
    if (base?.intent === ChatIntent.RELATION_COUNT && !/\b(?:born|died|cousins?)\b/i.test(base.params?.relationRaw || "")) {
      return { ...base, params: { ...base.params, mode: kinFilter.mode, filter: kinFilter.filter } };
    }
  }
  // "Beacall-9 fractal", "Jefferson descendants": a person and a chart (chat_chart_shortcuts.js).
  // Last, so it only takes what nothing else understood ("Beacall-9's fan chart" has its own parser).
  if (routed.intent === ChatIntent.FALLBACK_AI && !routed.params?.profileNarrative) {
    const chartShortcut = parseChartShortcutPrompt(prompt);
    if (chartShortcut) return { intent: ChatIntent.CHART_SHORTCUT, params: chartShortcut };
  }
  return routed;
}

// "how many descendants does she have?": the relation counter has no
// descendants relation, so this is the descendant list for that subject (live
// E7, 2026-10-03: the AI guessed from the bio).
function descendantCountRoute(routed) {
  if (routed?.intent !== ChatIntent.RELATION_COUNT || !/^descendants?$/i.test(routed.params?.relationRaw || "")) {
    return routed;
  }
  const { subjectMode, subjectName } = routed.params;
  if (subjectMode !== "user" && !subjectName) return routed;
  const subjectText = subjectMode === "user" ? "my descendants" : `${subjectName}'s descendants`;
  const base = parseDescendantListPrompt(subjectText);
  return base ? { intent: ChatIntent.DESCENDANT_LIST, params: { ...base, subjectText } } : routed;
}

function routeChatPromptUnchecked(prompt, options = {}) {
  if (/\bliving\b/i.test(String(prompt || ""))) {
    const livingDescendants = parseDescendantListPrompt(prompt);
    if (livingDescendants?.livingOnly) return { intent: ChatIntent.DESCENDANT_LIST, params: livingDescendants };
  }
  const hasStructuredResult = Boolean(options?.hasStructuredResult);
  // Before the narrative check: "...can you see beyond the chart on this page?"
  // read as a question about the profile text (live, 2026-10-08).
  const ancestorSummary = /\bancestors?\b/i.test(String(prompt || "")) ? parseAncestorSummaryPrompt(prompt) : null;
  if (ancestorSummary) return { intent: ChatIntent.ANCESTOR_LIST, params: ancestorSummary };
  if (isProfileNarrativePrompt(prompt)) {
    return { intent: ChatIntent.FALLBACK_AI, params: { profileNarrative: true } };
  }
  const cc7Parsed = parseCc7LocationPrompt(prompt);
  if (cc7Parsed) {
    return {
      intent: ChatIntent.CC7_LOCATION_FILTER,
      params: cc7Parsed,
    };
  }

  const ccSummary = parseCcSummaryPrompt(prompt);
  if (ccSummary) {
    return {
      intent: ChatIntent.CC_SUMMARY,
      params: ccSummary,
    };
  }

  const notableRelatives = parseNotableRelativesPrompt(prompt) || parseDnaConfirmedPrompt(prompt);
  if (notableRelatives) {
    return {
      intent: ChatIntent.PROFILE_SEARCH,
      params: { query: notableRelatives },
    };
  }

  const watchlistPrompt = parseWatchlistPrompt(prompt);
  if (watchlistPrompt) {
    return {
      intent: ChatIntent.WATCHLIST,
      params: watchlistPrompt,
    };
  }

  const generationCount =
    parseAncestorGenerationCountPrompt(prompt) ||
    parseAncestorPlacePrompt(prompt) ||
    parseAncestorPickPrompt(prompt) ||
    parseAncestorDepthPrompt(prompt) ||
    parseLongestLivedPrompt(prompt) ||
    parseAncestorSummaryPrompt(prompt);
  if (generationCount) {
    return {
      intent: ChatIntent.ANCESTOR_LIST,
      params: generationCount,
    };
  }

  const brickWalls = parseBrickWallPrompt(prompt);
  if (brickWalls) {
    return {
      intent: ChatIntent.ANCESTOR_LIST,
      params: brickWalls,
    };
  }

  // "list my ancestors born in Wales" was a relation called "ancestors born in
  // Wales"; with "who died in" it was declined (O10 follow-up, 2026-10-03).
  const ancestorsInPlace = /\b(?:born|died)\s+in\b/i.test(prompt) ? parseAncestorListPrompt(prompt) : null;
  if (ancestorsInPlace?.location) {
    return { intent: ChatIntent.ANCESTOR_LIST, params: ancestorsInPlace };
  }

  // "show Weatherall-111's sources" was a relation called "sources" (live, 2026-10-08).
  const earlySources = /\b(?:sources?|citations?|references?)\b/i.test(prompt) ? parseProfileSourcesPrompt(prompt) : null;
  if (earlySources) return { intent: ChatIntent.PROFILE_SOURCES, params: earlySources };

  const relationQuery = parseRelationPrompt(prompt);
  // "show Weatherall-111's family tree chart" was a relation called "family
  // tree chart" (live, 2026-10-08); a chart word makes it the chart.
  if (relationQuery && /\b(?:chart|tree|map|timeline|cloud|fan|explorer|fractal|sunburst|overview|dashboard|calendar|lifespans?|pedigree|matrix)\b/i.test(relationQuery.relationRaw || "")) {
    const chartShortcut = parseChartShortcutPrompt(prompt);
    if (chartShortcut) return { intent: ChatIntent.CHART_SHORTCUT, params: chartShortcut };
  }
  // "show Weatherall-111's ancestors" (a suggested follow-up, live 2026-10-08)
  // was a relation called "ancestors", which the relation handler can't walk.
  if (relationQuery && /^(?:(?:all|direct|known|recorded)\s+)*ancestors$/i.test(relationQuery.relationRaw || "")) {
    const named = relationQuery.subjectMode === "named" && relationQuery.subjectName;
    const owner = named ? `${relationQuery.subjectName}'s` : relationQuery.subjectMode === "user" ? "my" : "their";
    const base = parseAncestorListPrompt(`${owner} ancestors`);
    if (base) {
      return {
        intent: ChatIntent.ANCESTOR_LIST,
        params:
          relationQuery.mode === "count"
            ? { ...base, generation: MAX_ANCESTOR_GENERATIONS, includeUpTo: true, pick: "summary", subjectText: `${owner} ancestors` }
            : { ...base, subjectText: `${owner} ancestors` },
      };
    }
  }
  if (relationQuery) {
    return {
      intent: ChatIntent.RELATION_COUNT,
      params: relationQuery,
    };
  }

  const connectionEndpoints = extractConnectionEndpoints(prompt);
  if (connectionEndpoints?.target) {
    return {
      intent: ChatIntent.CONNECTION_LOOKUP,
      params: { target: connectionEndpoints.target, source: connectionEndpoints.source || "" },
    };
  }

  const ancestorAverageAge = parseAncestorAverageAgePrompt(prompt);
  if (ancestorAverageAge) {
    return {
      intent: ChatIntent.ANCESTOR_AVG_AGE_AT_DEATH,
      params: ancestorAverageAge,
    };
  }

  // "how old was her second husband when he died?": the relative list, not a name search.
  const relativeAge = parseRelativeAgePrompt(prompt);
  if (relativeAge) {
    return { intent: ChatIntent.RELATIVE_FACT, params: relativeAge };
  }

  const personAgeAtDeath = parsePersonAgeAtDeathPrompt(prompt);
  if (personAgeAtDeath) {
    return {
      intent: ChatIntent.PERSON_AGE_AT_DEATH,
      params: personAgeAtDeath,
    };
  }

  // "which of her siblings died first?" reads the relative list (RELATIVE_FACT).
  const relativePick = parseRelativePickPrompt(prompt);
  if (relativePick) {
    return { intent: ChatIntent.RELATIVE_FACT, params: { ...relativePick, fact: "pick" } };
  }

  const outlived = parseOutlivedPrompt(prompt);
  if (outlived) {
    return { intent: ChatIntent.CHILDREN_OUTLIVED, params: outlived };
  }

  const childrenWithChildren = parseChildrenWithChildrenPrompt(prompt);
  if (childrenWithChildren) {
    return { intent: ChatIntent.CHILDREN_WITH_CHILDREN, params: childrenWithChildren };
  }

  const twins = parseTwinsPrompt(prompt);
  if (twins) {
    return { intent: ChatIntent.CHILD_TWINS, params: twins };
  }

  const relativeFact = parseRelativeFactPrompt(prompt);
  if (relativeFact) {
    return { intent: ChatIntent.RELATIVE_FACT, params: relativeFact };
  }

  const bioRelatives = parseFindRelativesPrompt(prompt);
  if (bioRelatives) {
    return { intent: ChatIntent.FIND_BIO_RELATIVES, params: bioRelatives };
  }

  const marriage = parseMarriagePrompt(prompt);
  if (marriage) {
    return { intent: ChatIntent.PERSON_MARRIAGE, params: marriage };
  }

  const sources = parseProfileSourcesPrompt(prompt);
  if (sources) {
    return { intent: ChatIntent.PROFILE_SOURCES, params: sources };
  }

  const profileFact = parseProfileFactPrompt(prompt);
  if (profileFact) {
    return { intent: ChatIntent.PROFILE_FACT, params: profileFact };
  }

  const burial = parseBurialPrompt(prompt);
  if (burial) {
    return { intent: ChatIntent.PERSON_BURIAL, params: burial };
  }

  const duplicateCheck = parseDuplicateCheckPrompt(prompt);
  if (duplicateCheck) {
    return { intent: ChatIntent.PROFILE_DUPLICATES, params: duplicateCheck };
  }

  const ageAtChildBirth = parsePersonAgeAtChildBirthPrompt(prompt);
  if (ageAtChildBirth) {
    return {
      intent: ChatIntent.PERSON_AGE_AT_CHILD_BIRTH,
      params: ageAtChildBirth,
    };
  }

  const ancestorList = parseAncestorListPrompt(prompt);
  if (ancestorList) {
    return {
      intent: ChatIntent.ANCESTOR_LIST,
      params: ancestorList,
    };
  }

  const childPick = parseChildPickPrompt(prompt);
  if (childPick) {
    return { intent: ChatIntent.DESCENDANT_LIST, params: childPick };
  }

  const descendantList = parseDescendantListPrompt(prompt);
  if (descendantList) {
    return {
      intent: ChatIntent.DESCENDANT_LIST,
      params: descendantList,
    };
  }

  const spouseList = parseSpousePrompt(prompt);
  if (spouseList) {
    return {
      intent: ChatIntent.SPOUSE_LIST,
      params: spouseList,
    };
  }

  const profileFamilyConnection = parseProfileFamilyConnectionPrompt(prompt);
  if (profileFamilyConnection) {
    return {
      intent: ChatIntent.PROFILE_FAMILY_CONNECTION,
      params: profileFamilyConnection,
    };
  }

  const lateRelation = parseLateRelationPrompt(prompt);
  if (lateRelation) {
    return { intent: ChatIntent.RELATION_COUNT, params: lateRelation };
  }

  if (hasStructuredResult) {
    const conversationalLastResultPrompt = parseLastResultPrompt(prompt, {
      allowConversationalFollowups: true,
    });
    if (conversationalLastResultPrompt) {
      return {
        intent: ChatIntent.LAST_RESULT_OPERATION,
        params: conversationalLastResultPrompt,
      };
    }
  }

  const profileQuery = parseProfileSearchPrompt(prompt);
  if (profileQuery) {
    return {
      intent: ChatIntent.PROFILE_SEARCH,
      params: { query: profileQuery },
    };
  }

  const lastResultPrompt = parseLastResultPrompt(prompt, {
    allowConversationalFollowups: hasStructuredResult,
  });
  if (lastResultPrompt) {
    return {
      intent: ChatIntent.LAST_RESULT_OPERATION,
      params: lastResultPrompt,
    };
  }

  return {
    intent: ChatIntent.FALLBACK_AI,
    params: {},
  };
}
