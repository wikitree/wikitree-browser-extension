import { buildFamilyMatrix, loadFamilyMatrixPeople } from "./chat_family_matrix_data";
import { showFamilyMatrixPopup } from "./chat_family_matrix";
import { descendantWord } from "./chat_kin_labels";
import { getGenerationFromAhnen } from "./chat_ahnentafel";
import { getLocationFieldLabel } from "./chat_place_text";
import { buildTreeAppRecommendations } from "./chat_tree_apps";
import { getCountryFromLocation, isEmigrantRow, summarizeCountries } from "./chat_place_country";
import { describeDuplicate, findDuplicates, readDuplicateFinder, runDuplicateCheck } from "./chat_duplicates";
import { buildBurialAnswer } from "./chat_burial";
import {
  CANDIDATE_FIELDS,
  RELATIVE_SPOUSE_FIELDS,
  spousesOf,
  buildFindRelativesAnswer,
  duplicateLines,
  buildRelativesAiPrompt,
  readRelativesFromBio,
  relativesFromAiJson,
  searchRelatives,
} from "./chat_bio_relatives";
import { getWikiTreePage } from "../../core/API/wwwWikiTree";
import { birthPlaceFromBio, birthYearFromBio, readPageAttached, readPageBio } from "./chat_bio_page";
import { buildCompletenessGrid, buildCompletenessSummary, describeBranchCompleteness } from "./chat_completeness_data";
import { showCompletenessHeatmapPopup } from "./chat_completeness_heatmap";
import { buildNeedsHelpAnswer, buildQualitySummary } from "./chat_profile_quality_data";
import { buildDnaCarrierSummary, buildDnaLinesSummary, buildParentStatusSummary, buildXDnaSummary, furthestLineAncestors, lineSharersGenerations, lineSharersHeading } from "./chat_dna_data";
import { buildHistorySummary, buildPersonHistorySummary, placeRegions, rowCountries } from "./chat_world_events_data";
import { buildFanSlots, buildFanChartSummary, buildSurnameSummary, fanChartStats, generationOfSlot, FAN_CHART_DEFAULT_GENERATIONS, FAN_CHART_MAX_GENERATIONS } from "./chat_fan_chart_data";
import { showFanChartPopup } from "./chat_fan_chart";
import { buildLifeLine, buildLifeLineSummary } from "./chat_life_line_data";
import { showLifeLinePopup } from "./chat_life_line";
import { buildFamilySizes, describeFamilySizes, FAMILY_SIZE_GENERATIONS } from "./chat_family_size_data";
import { showFamilySizePopup } from "./chat_family_size_chart";
import { showFamilyWorldPopup, showFractalTreePopup } from "./chat_fractal_tree";
import {
  buildFamilyWorldLayout,
  buildFamilyWorldSummary,
  climbFamilyScene,
  createFamilyWorld,
  mergeWorldPeople,
  normaliseFamilyScene,
  rerootFamilyScene,
  startFamilyScene,
  FAMILY_WORLD_NUCLEAR,
} from "./chat_family_world_data";
import { fullName } from "./chat_chart_common";
import { buildFractalTreeSummary, markFrontier, treeFromAncestorSlots, FRACTAL_TREE_DEFAULT_GENERATIONS, FRACTAL_TREE_EXPAND_GENERATIONS } from "./chat_fractal_tree_data";
import { buildDescendantTree, buildDescendantChartSummary, DESCENDANT_CHART_DEFAULT_GENERATIONS, buildForest } from "./chat_descendant_chart_data";
import { showDescendantChartPopup } from "./chat_descendant_chart";
import { tableFromLifespanRows, tableFromPeople, tableFromSlots, tableFromTree } from "./chat_chart_table";
import { buildFamilyTimelineRows, buildFamilyTimelineSummary, familyLifespanRows } from "./chat_family_timeline_data";
import { buildOriginsSeries, buildSurnameRiver, describeOriginsShift, describeSurnameRiver } from "./chat_origins_data";
import { showOriginsPopup } from "./chat_origins_chart";
import { buildMigration, buildMigrationSummary, buildMigrationYearSummary, buildDescendantMigration, buildDescendantMigrationSummary } from "./chat_migration_data";
import { showMigrationMapPopup } from "./chat_migration_map";
import { loadGeocodeCache } from "./chat_geocode";
import { showLifespansPopup } from "./chat_lifespans_chart";
import { showNameCloudPopup } from "./chat_name_cloud";
import { buildNameCloud, buildNameCloudSummary, NAME_CLOUD_GENERATIONS } from "./chat_name_cloud_data";
import { showFamilyCalendarPopup } from "./chat_family_calendar";
import { showAgesPopup } from "./chat_ages_chart";
import { deathAgeRows, parentAgeRows, buildAgesSummary } from "./chat_ages_data";
import { buildCalendarEvents, buildCalendarSummary, FAMILY_CALENDAR_GENERATIONS } from "./chat_family_calendar_data";
import { showTreeOverviewPopup } from "./chat_tree_overview";
import { buildTreeOverview, buildTreeOverviewSummary, TREE_OVERVIEW_GENERATIONS } from "./chat_tree_overview_data";
import { buildDescendantLifespanRows, buildLifespanRows, buildLifespansSummary, LIFESPANS_GENERATIONS } from "./chat_lifespans_data";

const MIGRATION_MAP_GENERATIONS = 10;
// An ancestor list this deep or shallower opens the fan chart; a deeper one shows its table.
const LIST_FAN_CHART_GENERATIONS = 8;
import { buildProfileFactAnswer, PROFILE_FACT_FIELDS } from "./chat_profile_facts";
import {
  buildConnectedProfilesAnswer,
  buildConnectedTestsAnswer,
  buildDnaTakerAnswer,
  buildHaplogroupAnswer,
  pickTakerTest,
  buildNoDnaMapTestAnswer,
  buildDnaMapSummary,
} from "./chat_dna";
import { buildSourcesAnswer } from "./chat_sources";
import { buildMarriageAnswer, buildMarriageTimingAnswer } from "./chat_marriage";
import {
  buildAgeComparisonAnswer,
  buildAgeGapAnswer,
  buildRelativeAgeAtDeathAnswer,
  buildRelativeFactAnswer,
  relationSelector,
} from "./chat_relative_fact";
import { descendantCountMessage, pickSpouseByOrdinal, relationshipListLead } from "./chat_relation_chain_text";
import { buildAncestorDepthMessage, buildAncestorSummaryMessage } from "./chat_ancestor_depth";
import { buildTwinsAnswer } from "./chat_twins";
import { sortByBirth } from "./chat_kin_order";
import { buildChildrenMarriedAnswer, buildChildrenWithChildrenAnswer } from "./chat_children_with_children";
import { buildOutlivedAnswer } from "./chat_outlived";
import { buildRelativePickAnswer } from "./chat_relative_pick";
import { buildChildPickAnswer } from "./chat_child_pick";
import { formatKinPlaceDetails } from "./chat_kin_details";
import { formatPreviewDate, formatPreviewName } from "./chat_preview_format";

const QUALITY_FIELDS = "NoChildren,ResearchStatus,Spouses,IsLiving,Bio";
const FAN_CHART_FIELDS = "Id,Name,RealName,FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,Gender,BirthDate,DeathDate,BirthLocation,DeathLocation,Father,Mother,Photo,PhotoData,DataStatus";

export { formatPreviewDate, formatPreviewName };
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { checkProfileInApi, describeUnloadedProfile, isSamePerson } from "./chat_profile_availability";

// "William Burton (Burton-13215)": RealName alone is the first name (live,
// 2026-10-03: "William (Burton-13215) was died…"). Derived.ShortName comes back
// as ShortName.
export function relativeNameOf(person) {
  const name = person?.ShortName || person?.Derived?.ShortName || person?.RealName || person?.Name || "Unknown";
  return `${name} (${person?.Name || person?.Id})`;
}

export function createChatPeopleHandlers({
  ChatIntent,
  getProfilePersonInfo = () => null,
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
  getUserNumId = () => null,
  notify = () => {}, // (text) → a passing note in the chat (not saved)
  getChatAiConfig = async () => ({ key: "" }),
  parsePlannerJson = () => null,
}) {
  /**
   * "I couldn't load X" said why: not in the API yet (a new profile), private to the user, or
   * just failed. `subject` is a root person or a key.
   */
  async function cantLoad(subject, what = "", { privateHint = "", assumePrivate = false } = {}) {
    const key = typeof subject === "object" ? subject?.key || subject?.wtId : subject;
    const label = (typeof subject === "object" ? formatSubjectLabel(subject) : "") || String(key || "this profile");
    let status = await checkProfileInApi(key, { appId: WBE_CHAT_APP_ID });
    // (assumePrivate: anything but "missing" reads as private, so the reply doesn't go to the AI)
    if (assumePrivate && status !== "missing") status = "hidden";
    let apiLoggedIn = null;
    if (status === "hidden") {
      try {
        apiLoggedIn = await WikiTreeAPI.isLoggedIntoAPI(getUserNumId(), WBE_CHAT_APP_ID);
      } catch (error) {
        // (unknown: say nothing about logging in)
      }
    }
    let isPagePerson = false;
    try {
      isPagePerson = isSamePerson(subject, getProfileRootPerson?.());
    } catch (error) {
      // (no page person)
    }
    return describeUnloadedProfile({ label, what, status, isPagePerson, apiLoggedIn, privateHint });
  }

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

    if (normalizeText(meta.location || "") || meta.missingParent || meta.ageAtDeath) {
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

  // Live C2, 2026-10-03: lines read "Ellen (Cook-8721) [b. 1835-00-00]".
  function buildPersonPreviewLine(person, details = []) {
    const birth = formatPreviewDate(person.birth);
    const death = formatPreviewDate(person.death);
    return `- ${formatPreviewName(person)} (${person.wtid})${birth ? ` [b. ${birth}]` : ""}${
      death ? ` [d. ${death}]` : ""
    }${formatKinPlaceDetails(person, details)}`;
  }

  function buildPeoplePreviewAndInlineMore(rows, previewLimit = 12, details = []) {
    const previewRows = rows.slice(0, previewLimit);
    const remainingRows = rows.slice(previewLimit);
    return {
      preview: previewRows.map((person) => buildPersonPreviewLine(person, details)).join("\n"),
      inlineMore: remainingRows.length
        ? {
            count: remainingRows.length,
            text: remainingRows.map((person) => buildPersonPreviewLine(person, details)).join("\n"),
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
    completenessNote = "",
    details = [],
    order = "",
  }) {
    const enrichedChatMeta = chatMeta
      ? {
          ...chatMeta,
          mode: String(chatMeta.mode || getCurrentChatMode?.() || "wt")
            .trim()
            .toLowerCase(),
        }
      : null;
    const { preview, inlineMore } = buildPeoplePreviewAndInlineMore(order ? sortByBirth(rows, order) : rows, 12, details);
    const makeTable = typeof tableFactory === "function" ? tableFactory : makeStandardProfileTable;
    const hasDegreeValues = rows.some(
      (row) => row?.degrees !== "" && row?.degrees !== undefined && row?.degrees !== null
    );
    const defaultOrder =
      makeTable === makeAncestorProfileTable
        ? [[0, "asc"]]
        : hasDegreeValues
        ? [
            [5, "asc"],
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

    if (enrichedChatMeta) {
      table._chatMeta = enrichedChatMeta;
    }

    // Chart launch behavior is separate from the external Tree App recommendations.
    // Genie charts are already available in the chart bar.
    const charts = treeAppKind === "ancestors" || treeAppKind === "descendants" ? visualActions(rootWtId, treeAppKind) : [];
    // Brick walls ("…with no father recorded") show best on the fan chart's Brick walls colouring, which opens itself.
    if (treeAppKind === "ancestors" && enrichedChatMeta?.missingParent && rootWtId) {
      charts[0] = VISUALS.fan(rootWtId, "brickwalls", "Brick walls fan chart");
      if (rows.length) setTimeout(() => charts[0].onClick(), 0);
    }
    // A plain list ("show her ancestors") opens its chart too; a filtered one ("…born in Ohio") just offers it.
    const plainList =
      enrichedChatMeta && !enrichedChatMeta.location && !enrichedChatMeta.dateField && !enrichedChatMeta.missingParent && !enrichedChatMeta.ageAtDeath;
    // …unless the list goes deeper than 8 generations: then the table shows it
    // all (user, 2026-10-09: "show details beyond 8 generations … not a fan
    // chart, but a table"; "8 generations and below should show the chart").
    const deepest = Math.max(0, ...rows.map((row) => Number(row?.degrees) || 0));
    const beyondChart = treeAppKind === "ancestors" && deepest > LIST_FAN_CHART_GENERATIONS;
    if (treeAppKind === "ancestors" && !enrichedChatMeta?.missingParent && deepest > FAN_CHART_DEFAULT_GENERATIONS && !beyondChart) {
      charts[0] = VISUALS.fan(rootWtId, "", "Fan chart", deepest);
    }
    const chartOpens = Boolean(charts.length && plainList && rows.length >= 2 && !beyondChart);
    if (chartOpens) setTimeout(() => charts[0].onClick(), 0);
    return {
      // (the chart opens instead of the table; the Table button shows it)
      chartOpened: chartOpens || Boolean(treeAppKind === "ancestors" && enrichedChatMeta?.missingParent && rootWtId && rows.length),
      message: `${relationshipListLead(displayRelationshipLabel, rows.length)} for ${subjectLabel} (${rows.length} found${
        completenessNote ? `; ${completenessNote.replace(/\.$/, "")}` : ""
      }):\n${preview}`,
      inlineMore,
      table,
      // Genie's charts and the Tree Apps, shown as two labelled groups.
      actions: [...charts, ...treeAppActions],
    };
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

  // "brick walls": ancestors whose father, mother, both or either is not on WikiTree.
  function filterRowsByMissingParent(rows, missingParent) {
    if (!missingParent) return rows;
    return rows.filter((row) => {
      const noFather = !row.hasFather;
      const noMother = !row.hasMother;
      if (missingParent === "father") return noFather;
      if (missingParent === "mother") return noMother;
      if (missingParent === "both") return noFather && noMother;
      return noFather || noMother;
    });
  }

  // "ancestors who lived past 90": {min: 91}; unknown ages never match.
  // C5 "where were my ancestors born?" → countries with counts; C6 "which of my
  // ancestors emigrated?" → born in one country, died in another.
  function buildAncestorPlaceAnswer(rows, params, { subjectLabel, rootPerson, label }) {
    const owner = rootPerson?.subjectType === "user" ? "your" : `${subjectLabel}'s`;
    const Owner = owner.charAt(0).toUpperCase() + owner.slice(1);
    if (!rows.length) return `I found no ${label} for ${subjectLabel} on WikiTree.`;
    const tableTitle = (what) => `${label} ${what} for ${rootPerson.displayName}`;
    if (params?.emigrated) {
      const emigrants = rows.filter(isEmigrantRow).map((row) => ({
        ...row,
        birthCountry: getCountryFromLocation(row.birthLocation),
        deathCountry: getCountryFromLocation(row.deathLocation),
      }));
      const withBoth = rows.filter(
        (row) => getCountryFromLocation(row.birthLocation) && getCountryFromLocation(row.deathLocation)
      ).length;
      if (!emigrants.length) {
        return `None of ${owner} ${rows.length} ${label} were born and died in different countries (${withBoth} have both places recorded).`;
      }
      const preview = emigrants
        .slice(0, 10)
        .map((row) => `- ${row.displayName || row.wtid} (${row.wtid}): ${row.birthCountry} → ${row.deathCountry}`)
        .join("\n");
      return {
        message: `${emigrants.length} of ${owner} ${rows.length} ${label} were born in one country and died in another (${withBoth} have both places recorded):\n${preview}${
          emigrants.length > 10 ? `\n…and ${emigrants.length - 10} more in the table.` : ""
        }`,
        table: makeAncestorProfileTable(tableTitle("who emigrated"), emigrants, [[0, "asc"]]),
      };
    }
    const field = params?.placeSummary === "death" ? "deathLocation" : "birthLocation";
    const verb = field === "deathLocation" ? "died" : "were born";
    const { sorted, unknown } = summarizeCountries(rows, field);
    if (!sorted.length) return `None of ${owner} ${rows.length} ${label} have a ${field === "deathLocation" ? "death" : "birth"} place recorded.`;
    const list = sorted.map(([country, count]) => `${country} ${count}`).join(", ");
    // The origins streamgraph, when the places span generations.
    const series = buildOriginsSeries(rows, { field });
    const placeWord = field === "deathLocation" ? "death" : "birth";
    const showChart = series && series.generations.length >= 2;
    const shift = showChart ? describeOriginsShift(series) : "";
    const openOrigins = () =>
      showOriginsPopup(series, {
        title: `${placeWord === "death" ? "Where they died" : "Ancestral origins"}: ${rootPerson.displayName}`,
        placeWord,
        fileBase: `origins-${String(rootPerson.wtId || rootPerson.key || "").replace(/[^A-Za-z0-9_-]/g, "")}`,
      });
    // Where they came from is the origins chart's question: it opens, with the map beside it.
    if (showChart) setTimeout(openOrigins, 0);
    const key = rootPerson?.wtId || rootPerson?.key;
    return {
      message: `${Owner} ${rows.length} ${label} ${verb} in: ${list}${unknown ? `; ${unknown} unknown` : ""}.${shift ? ` ${shift}` : ""}`,
      table: makeAncestorProfileTable(tableTitle(`by ${placeWord} country`), rows, [[0, "asc"]]),
      actions: [
        ...(showChart ? [{ label: placeWord === "death" ? "Death places chart" : "Origins chart", onClick: openOrigins }] : []),
        ...(key ? [VISUALS.map(key), VISUALS.fan(key)] : []),
      ],
    };
  }

  // "show his ancestors" lists 10 generations unless asked for more (up to 25):
  // say so, and offer the rest when the tree reaches the limit (2026-10-08).
  function withDefaultGenerationNote(result, { usedDefaultGeneration, rows, generation, rootWtId, isUser }) {
    if (!usedDefaultGeneration || !result || typeof result !== "object" || !rows?.length) return result;
    const deepest = Math.max(...rows.map((row) => Number(row?.degrees) || 0));
    const more = deepest >= generation && generation < 25;
    const note = more
      ? `This shows ${generation} generations, the usual number. ${isUser ? "Your" : "The"} tree goes further back: up to 25 generations can be shown.`
      : `That's every ancestor on WikiTree: ${isUser ? "your" : "the"} tree goes back ${deepest} generation${deepest === 1 ? "" : "s"}.`;
    const moreAction =
      more && rootWtId
        ? [{ label: "Show 25 generations", actionType: "send-prompt", prompt: `25 generations of ${isUser ? "my" : `${rootWtId}'s`} ancestors`, newSearch: true }]
        : [];
    return {
      ...result,
      trailingText: [note, result.trailingText].filter(Boolean).join("\n"),
      actions: [...moreAction, ...(result.actions || [])],
    };
  }

  // C9: "most recent" = nearest generation, then latest birth; "earliest" =
  // earliest dated birth, else the most distant generation.
  function buildAncestorPickAnswer(rows, pick, { subjectLabel, rootPerson, locationPhrase, total, treeTakenAsAncestors, askedRepeats }) {
    if (pick === "depth") {
      const owner = rootPerson?.subjectType === "user" ? "Your" : `${subjectLabel}'s`;
      return {
        message: buildAncestorDepthMessage(rows, owner, 25),
        table: makeAncestorProfileTable(`ancestors for ${rootPerson.displayName}`, rows, [[0, "asc"]]),
        actions: visualActions(rootPerson?.wtId || rootPerson?.key, "ancestors"),
      };
    }
    if (pick === "summary") {
      const isUser = rootPerson?.subjectType === "user";
      return {
        message: buildAncestorSummaryMessage(rows, {
          subject: isUser ? "You have" : `${subjectLabel} has`,
          ownerText: isUser ? "Your" : `${subjectLabel}'s`,
          maxGeneration: 25,
          formatDate: formatPreviewDate,
          askedRepeats,
        }),
        table: makeAncestorProfileTable(`ancestors for ${rootPerson.displayName}`, rows, [[0, "asc"]]),
        actions: visualActions(rootPerson?.wtId || rootPerson?.key, "ancestors"),
      };
    }
    if (pick === "longest") {
      return buildLongestLivedAnswer(rows, { subjectLabel, rootPerson, locationPhrase, treeTakenAsAncestors });
    }
    const year = (row) => {
      const match = String(row?.birth || "").match(/\b(\d{4})\b/);
      return match && match[1] !== "0000" ? Number(match[1]) : null;
    };
    const generationOf = (row) => Number(row?.degrees) || 0;
    const sorted = [...rows].sort((a, b) => {
      if (pick === "recent") return generationOf(a) - generationOf(b) || (year(b) ?? -Infinity) - (year(a) ?? -Infinity);
      const ya = year(a);
      const yb = year(b);
      if (ya !== null && yb !== null) return ya - yb;
      if (ya !== null || yb !== null) return ya !== null ? -1 : 1;
      return generationOf(b) - generationOf(a);
    });
    const chosen = sorted[0];
    const owner = rootPerson?.subjectType === "user" ? "Your" : `${subjectLabel}'s`;
    const which = pick === "recent" ? "most recent" : "earliest";
    const gen = generationOf(chosen);
    const genText = gen ? ` (${gen} generation${gen === 1 ? "" : "s"} back)` : "";
    const born = chosen.birth ? `, born ${chosen.birth}` : "";
    const place = chosen.birthLocation ? ` in ${chosen.birthLocation}` : "";
    return {
      message: `${owner} ${which} ancestor${locationPhrase ? ` ${locationPhrase}` : ""} is ${chosen.displayName || chosen.wtid} (${chosen.wtid})${born}${place}${genText}. ${locationPhrase ? `${rows.length} of ${total} ancestors match` : `${total} ancestors checked`}; all are in the table.`,
      table: makeAncestorProfileTable(`ancestors${locationPhrase ? ` ${locationPhrase}` : ""} for ${rootPerson.displayName}`, sorted, [[0, "asc"]]),
    };
  }

  // D7: the longest life among the ancestors with both dates; ties keep the
  // nearest generation first.
  function buildLongestLivedAnswer(rows, { subjectLabel, rootPerson, locationPhrase, treeTakenAsAncestors }) {
    const isUser = rootPerson?.subjectType === "user";
    const owner = isUser ? "Your" : `${subjectLabel}'s`;
    const aged = rows
      .map((row) => ({ ...row, ageAtDeath: computeAgeAtDeathYears(row.birth, row.death) }))
      .filter((row) => Number.isFinite(row.ageAtDeath))
      .sort((a, b) => b.ageAtDeath - a.ageAtDeath || (Number(a.degrees) || 0) - (Number(b.degrees) || 0));
    const scopeNote = treeTakenAsAncestors
      ? ` I took "${isUser ? "your" : "the"} tree" as ${isUser ? "your" : `${subjectLabel}'s`} direct ancestors.`
      : "";
    const where = locationPhrase ? ` ${locationPhrase}` : "";
    if (!aged.length) {
      return `None of the ${rows.length} ancestors${where} for ${subjectLabel} have both a birth and a death date, so I can't say who lived longest.${scopeNote}`;
    }
    const top = aged[0];
    const dates = [formatPreviewDate(top.birth), formatPreviewDate(top.death)].filter(Boolean).join("–");
    const gen = Number(top.degrees) || 0;
    const genText = gen ? `, ${gen} generation${gen === 1 ? "" : "s"} back` : "";
    const ties = aged.filter((row) => row.ageAtDeath === top.ageAtDeath).length;
    const tieText = ties > 1 ? ` ${ties - 1} other${ties === 2 ? "" : "s"} also reached ${top.ageAtDeath}.` : "";
    return {
      message: `${owner} longest-lived ancestor${where} is ${formatPreviewName(top)} (${top.wtid}), who died aged about ${top.ageAtDeath} (${dates}${genText}).${tieText} ${aged.length} of ${rows.length} ancestors have both dates; they are all in the table.${scopeNote}`,
      table: makeAncestorProfileTable(
        `ancestors by age at death for ${rootPerson.displayName}`,
        aged,
        [[0, "asc"]]
      ),
    };
  }

  function filterRowsByAgeAtDeath(rows, range) {
    if (!range) return rows;
    return rows.filter((row) => {
      const age = computeAgeAtDeathYears(row.birth, row.death);
      if (!Number.isFinite(age)) return false;
      if (Number.isFinite(range.min) && age < range.min) return false;
      if (Number.isFinite(range.max) && age > range.max) return false;
      return true;
    });
  }

  function getAgeAtDeathPhrase(range) {
    if (!range) return "";
    const { min, max } = range;
    if (Number.isFinite(min) && min === max) return `who died aged ${min}`;
    if (Number.isFinite(min) && Number.isFinite(max)) return `who died aged ${min}-${max}`;
    if (Number.isFinite(min)) return `who died aged ${min} or older`;
    if (Number.isFinite(max)) return `who died under ${max + 1}`;
    return "";
  }

  function getMissingParentPhrase(missingParent) {
    if (missingParent === "father") return "with no father recorded";
    if (missingParent === "mother") return "with no mother recorded";
    if (missingParent === "both") return "with no parents recorded";
    if (missingParent === "either") return "with a parent missing";
    return "";
  }

  function getLinkedAncestorLabel(profile, fallbackId = "") {
    if (!profile && (!fallbackId || fallbackId === "0")) {
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

  // The root in an ancestors response fetched with minGeneration 0.
  function findAncestorRootProfile(peopleMap, rootKey) {
    const profiles = Object.values(peopleMap || {});
    const key = String(rootKey || "").trim();
    return (
      profiles.find((profile) => Number(profile?.Meta?.Degrees) === 0) ||
      profiles.find((profile) => profile?.Name === key || String(profile?.Id) === key) ||
      null
    );
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
          // The links, by page Id, for counting repeated ancestors.
          profileId: String(profile?.Id ?? ""),
          fatherId: parentFatherId,
          motherId: parentMotherId,
          hasFather: Boolean(parentFatherId && parentFatherId !== "0"),
          hasMother: Boolean(parentMotherId && parentMotherId !== "0"),
          fatherName: father.name,
          fatherWtid: father.wtid,
          motherName: mother.name,
          motherWtid: mother.wtid,
        };
      });
  }

  function extractNamedSubjectForAncestorPrompt(prompt) {
    // P8 (live, 2026-10-03): "who were James Cook's grandchildren?" kept "who were"
    // in the name and fell back to the profile person's grandchildren.
    const normalized = String(prompt || "")
      .trim()
      .replace(/^(?:(?:who|what)\s+(?:are|were|is|was)\s+(?:the\s+)?|show(?:\s+me)?\s+|list\s+|display\s+|give\s+me\s+)(?=\S.*['’]s\s)/i, "");
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
    // P8 (live, 2026-10-03): "who were James Cook's grandchildren?" kept "who were"
    // in the name and fell back to the profile person's grandchildren.
    const normalized = String(prompt || "")
      .trim()
      .replace(/^(?:(?:who|what)\s+(?:are|were|is|was)\s+(?:the\s+)?|show(?:\s+me)?\s+|list\s+|display\s+|give\s+me\s+)(?=\S.*['’]s\s)/i, "");
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

    // "this profile's ancestors" (the chart parsers' phrase) is the page person, not a name to look up.
    if (asksForProfile) {
      const profileRoot = getProfileSubjectRoot();
      if (profileRoot) {
        return profileRoot;
      }
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

    // "this profile's ancestors" (the chart parsers' phrase) is the page person, not a name to look up.
    if (asksForProfile) {
      const profileRoot = getProfileSubjectRoot();
      if (profileRoot) {
        return profileRoot;
      }
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
          marriageDate: knownMarriageDate(spouse),
          marriageLocation: spouse.marriage_location || spouse.MarriageLocation || "",
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

      if (params?.ordinal) {
        return buildOrdinalSpouseAnswer(spouses, params.ordinal, relationshipLabel, personLabel);
      }

      const preview = (params?.order ? sortByBirth(spouses, params.order) : spouses)
        .slice(0, 12)
        .map((person) => buildPersonPreviewLine(person, params?.details || []))
        .join("\n");
      const extra = spouses.length > 12 ? `\n...and ${spouses.length - 12} more.` : "";

      return {
        message: `Here are ${relationshipLabel} for ${personLabel} (${spouses.length} found):\n${preview}${extra}`,
        table: makeStandardProfileTable(`${relationshipLabel} for ${rootProfile.Name}`, spouses, [[0, "asc"]]),
        actions: visualActions(rootProfile.Name, "family"),
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
    const pronoun = person.Gender === "Female" ? "she" : person.Gender === "Male" ? "he" : "";
    const ageStr = approximate ? `approximately ${ageAtDeath}` : String(ageAtDeath);
    // No gender loaded: "when they died" reads as someone else (live E3).
    return `${displayName} (${wtId}) was ${ageStr} years old ${pronoun ? `when ${pronoun} died` : "at death"}.`;
  }

  // Age at the birth of the first/last child, from the person's own Children.
  async function tryHandlePersonAgeAtChildBirthPrompt(params, prompt = "") {
    const targetName = String(params?.target || "").trim();
    if (!targetName) return null;
    let key = "";
    if (/^(?:he|she|they|him|her|them|this\s+person|the\s+profile\s+person|this\s+profile)$/i.test(targetName)) {
      key = getProfileSubjectRoot()?.wtId || getProfileSubjectRoot()?.key || "";
      if (!key) return "Open a profile page first, or name the person (for example Smith-123).";
    } else {
      const person = await resolveConnectionTargetPerson(targetName, prompt);
      key = person?.Name || person?.Id || "";
      if (!key) {
        return `I couldn't identify which profile you meant by "${targetName}". Try a WikiTree ID like Name-123, or a more specific name.`;
      }
    }

    const response = await WikiTreeAPI.getPerson(
      WBE_CHAT_APP_ID,
      key,
      "Id,Name,RealName,Derived.ShortName,Gender,BirthDate,Children"
    );
    const person = response?._data || response || {};
    const displayName = person.RealName || person?.Derived?.ShortName || person.Name || String(key);
    const wtId = person.Name || String(key);
    const pronoun = person.Gender === "Female" ? "she" : person.Gender === "Male" ? "he" : "they";
    const known = (value) => (value && value !== "0000-00-00" ? value : "");
    const childNoun = params.childGender === "Male" ? "son" : params.childGender === "Female" ? "daughter" : "child";
    // getPerson wraps each child in a Person; the fields live on _data.
    const children = Object.values(person.Children || {})
      .map((child) => child?._data || child)
      .filter((child) => !params.childGender || child.Gender === params.childGender)
      .filter((child) => known(child.BirthDate))
      .sort((a, b) => String(a.BirthDate).localeCompare(String(b.BirthDate)));
    if (!children.length) {
      return `${displayName} (${wtId}) has no ${childNoun} with a birth date on WikiTree.`;
    }
    const birthDate = known(person.BirthDate);
    if (!birthDate) {
      return `${displayName} (${wtId}) has no birth date on WikiTree, so I can't work out ${
        pronoun === "they" ? "their" : pronoun === "she" ? "her" : "his"
      } age.`;
    }
    const child = params.which === "last" ? children[children.length - 1] : children[0];
    const childName = child.RealName || child.Name;
    const childLabel = `${params.which === "last" ? "last" : "first"} ${childNoun}`;
    const birthYear = Number(birthDate.slice(0, 4));
    const childYear = Number(String(child.BirthDate).slice(0, 4));
    // A year-only date can't say whether the birthday had passed.
    const age = isPartialDate(birthDate) || isPartialDate(child.BirthDate)
      ? `${childYear - birthYear - 1} or ${childYear - birthYear}`
      : String(computeAgeAtDeathYears(birthDate, child.BirthDate));
    const tied = children.filter((c) => c.BirthDate === child.BirthDate).length > 1 ? " (one of twins or more)" : "";
    return `${displayName} (${wtId}) was ${age} when ${pronoun === "they" ? "their" : pronoun === "she" ? "her" : "his"} ${childLabel}, ${childName} (${child.Name}), was born (${child.BirthDate})${tied}.`;
  }

  async function tryHandlePersonBurialPrompt(params, prompt = "") {
    const targetName = String(params?.target || "").trim();
    let key = "";
    if (!targetName) {
      key = getProfileSubjectRoot()?.wtId || getProfileSubjectRoot()?.key || "";
      if (!key) return "Open a profile page first, or name the person (for example Smith-123).";
    } else {
      const found = await resolveConnectionTargetPerson(targetName, prompt);
      key = found?.Name || found?.Id || "";
      if (!key) {
        return `I couldn't identify which profile you meant by "${targetName}". Try a WikiTree ID like Name-123, or a more specific name.`;
      }
    }
    const [, , people] = await WikiTreeAPI.getPeople(
      WBE_CHAT_APP_ID,
      [key],
      "Id,Name,RealName,Gender,DeathDate,DeathLocation,Categories,Bio"
    );
    const person = Object.values(people || {}).find((entry) => entry?.Name);
    if (!person) return cantLoad(key);
    return buildBurialAnswer(person);
  }

  // "Find his family on WikiTree": relatives named in the biography, searched for one by one.
  async function tryHandleFindBioRelativesPrompt(params, prompt = "") {
    const targetName = String(params?.target || "").trim();
    let key = "";
    if (!targetName) {
      key = getProfileSubjectRoot()?.wtId || getProfileSubjectRoot()?.key || "";
      if (!key) return "Open a profile page first, or name the person (for example Smith-123).";
    } else {
      const found = await resolveConnectionTargetPerson(targetName, prompt);
      key = found?.Name || found?.Id || "";
      if (!key) {
        return `I couldn't identify which profile you meant by "${targetName}". Try a WikiTree ID like Name-123, or a more specific name.`;
      }
    }
    let [profile] =
      (await WikiTreeAPI.getProfile(
        WBE_CHAT_APP_ID,
        key,
        "Id,Name,FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,RealName,Gender,BirthDate,Bio",
        { bioFormat: "wiki", resolveRedirect: 1 }
      ).catch(() => [])) || [];
    // Not in the API yet (a new profile, or the staging server): this page has the biography
    // and the family already connected, which is all this needs (the user, 2026-10-07).
    let pageAttached = null;
    if (!profile?.Name && !targetName) {
      const page = getProfilePersonInfo();
      const pageBio = page?.Name ? readPageBio(document) : "";
      if (pageBio) {
        const year = Number(page.BirthYear) || birthYearFromBio(pageBio);
        profile = {
          Id: page.Id,
          Name: page.Name,
          FirstName: page.FirstName || String(page.FullName || "").split(" ")[0],
          LastNameAtBirth: page.LastNameAtBirth || "",
          RealName: page.FirstName || "",
          Gender: page.Gender || "",
          BirthDate: year ? String(year) : "",
          Bio: pageBio,
        };
        pageAttached = readPageAttached(document, page.Name);
      }
    }
    if (!profile?.Name) return cantLoad(key);
    // The profile person's own duplicates, alongside (the user, 2026-10-07).
    const pagePerson = pageAttached
      ? {
          Id: profile.Id,
          Name: profile.Name,
          FirstName: profile.FirstName,
          RealName: profile.FirstName,
          LastNameAtBirth: profile.LastNameAtBirth,
          Gender: profile.Gender,
          BirthDate: profile.BirthDate ? `${profile.BirthDate}-00-00` : "",
          BirthLocation: birthPlaceFromBio(profile.Bio),
        }
      : null;
    // The Duplicate Finder's scored pairs when it has looked at this profile; otherwise (a new
    // profile, or staging) Find Matches, scored here.
    const duplicatesPromise = (async () => {
      const finder = pagePerson ? null : await readDuplicateFinder(profile.Name);
      if (finder?.lookupAvailable) return finder;
      const found = await findDuplicates(
        WBE_CHAT_APP_ID,
        { Id: profile.Id, Name: profile.Name, RealName: profile.RealName || profile.FirstName },
        (url) => {
          const [path, query = ""] = url.split("?");
          return getWikiTreePage("Chat", path, query);
        },
        { pagePerson }
      );
      return { ...found, likely: (found.likely || []).map(describeDuplicate) };
    })().catch((error) => {
      console.warn("wbe: duplicate check failed", error);
      return null;
    });
    const subjectLabel = `${profile.RealName || profile.FirstName || profile.Name} (${profile.Name})`;
    const bio = profile.Bio || profile.bio || ""; // the API returns "bio"
    if (!bio.replace(/\[\[Category:[^\]]*\]\]|==[^=]+==|<references\s*\/>/g, "").trim()) {
      return `${subjectLabel} has no biography, so there are no relatives to read from it.`;
    }

    let relatives = [];
    let readBy = "read from its census tables and text";
    const { provider, key: aiKey, model } = await getChatAiConfig();
    if (aiKey) {
      notify("Reading the biography for relatives…");
      try {
        const response = await chrome.runtime.sendMessage({
          action: "chatWithAI",
          prompt: buildRelativesAiPrompt(bio, profile),
          provider,
          key: aiKey,
          model,
          pageContext: { url: window.location.href, title: document.title },
        });
        if (response?.success && response.response) {
          relatives = relativesFromAiJson(parsePlannerJson(response.response), profile);
          if (relatives.length) readBy = "read by AI";
        }
      } catch (error) {
        console.warn("wbe: AI couldn't read the biography; reading it by code", error);
      }
    }
    if (!relatives.length) relatives = readRelativesFromBio(bio, profile);
    const roles = Array.isArray(params?.roles) ? params.roles : [];
    if (roles.length) relatives = relatives.filter((relative) => roles.includes(relative.role));
    if (!relatives.length) {
      // (not "I couldn't…": that hands the question to the AI, or with AI off hides this behind "We need AI")
      const duplicates = await duplicatesPromise;
      return [
        `No ${roles.length ? "such relatives" : "relatives"} found in ${subjectLabel}'s biography. Genie looks for "son of …", "daughter of …", "married …" and census household tables${
          aiKey ? "" : "; with an AI key Genie can read biographies written in other ways"
        }.`,
        ...duplicateLines(duplicates, subjectLabel),
      ].join("\n");
    }
    relatives = relatives.slice(0, 40);

    let attached = pageAttached;
    if (!attached) {
      const [entry] =
        (await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, profile.Id, "Id,Name,FirstName,Gender,BirthDate", {
          getParents: 1,
          getSpouses: 1,
          getChildren: 1,
          getSiblings: 1,
        })) || [];
      const person = entry?.person || {};
      attached = [
        ...Object.values(person.Parents || {}).map((p) => ({ role: p.Gender === "Female" ? "mother" : "father", profile: p })),
        ...Object.values(person.Spouses || {}).map((p) => ({ role: "spouse", profile: p })),
        ...Object.values(person.Children || {}).map((p) => ({ role: "child", profile: p })),
        ...Object.values(person.Siblings || {}).map((p) => ({ role: "sibling", profile: p })),
      ];
    }

    notify(`Searching WikiTree for ${relatives.length} relative${relatives.length === 1 ? "" : "s"}…`);
    const results = await searchRelatives({
      subject: profile,
      relatives,
      attached,
      searchPerson: async (searchParams) => {
        const [, matches, total] = await WikiTreeAPI.searchPerson(WBE_CHAT_APP_ID, searchParams, CANDIDATE_FIELDS);
        return { matches, total };
      },
      getPeople: async (ids) =>
        Object.values(
          (await WikiTreeAPI.getPeople(WBE_CHAT_APP_ID, ids, "Id,Name,FirstName,MiddleName,Nicknames,LastNameAtBirth,RealName"))?.[2] || {}
        ),
      getProfiles: async (ids) =>
        Object.values((await WikiTreeAPI.getPeople(WBE_CHAT_APP_ID, ids, CANDIDATE_FIELDS))?.[2] || {}),
      getSpouses: async (ids) => {
        const items = (await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, ids, RELATIVE_SPOUSE_FIELDS, { getSpouses: 1 })) || [];
        return new Map(items.map((item) => [Number(item?.person?.Id), spousesOf(item?.person)]).filter(([id]) => id));
      },
    });
    const duplicates = await duplicatesPromise;
    const answer = buildFindRelativesAnswer({ subjectLabel, results, readBy, duplicates });
    if (pageAttached) answer.message += "\n(Read from this page: the profile isn't in WikiTree's API yet.)";
    return answer;
  }

  async function tryHandlePersonMarriagePrompt(params, prompt = "") {
    const targetName = String(params?.target || "").trim();
    let key = "";
    if (targetName === "me") {
      const userRoot = await getLoggedInRootPerson();
      key = userRoot?.wtId || userRoot?.key || "";
      if (!key) return "I couldn't tell who you are on WikiTree. Log in, or name the person (for example Smith-123).";
    } else if (!targetName) {
      key = getProfileSubjectRoot()?.wtId || getProfileSubjectRoot()?.key || "";
      if (!key) return "Open a profile page first, or name the person (for example Smith-123).";
    } else {
      const found = await resolveConnectionTargetPerson(targetName, prompt);
      key = found?.Name || found?.Id || "";
      if (!key) {
        return `I couldn't identify which profile you meant by "${targetName}". Try a WikiTree ID like Name-123, or a more specific name.`;
      }
    }
    const nameOf = relativeNameOf;
    const spousesOf = async (personKey) => {
      const [entry] = (await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, personKey, "Id,Name,RealName,Derived.ShortName,Gender", {
        getSpouses: 1,
      })) || [];
      return entry?.person ? { person: entry.person, spouses: Object.values(entry.person.Spouses || {}) } : null;
    };
    const asMarriage = (spouse) => ({
      spouseLabel: nameOf(spouse),
      date: spouse?.marriage_date || "",
      location: spouse?.marriage_location || "",
    });

    if (params?.ask) {
      const [entry] = (await WikiTreeAPI.getRelatives(
        WBE_CHAT_APP_ID,
        key,
        "Id,Name,RealName,Derived.ShortName,Gender,BirthDate,DeathDate",
        { getSpouses: 1 }
      )) || [];
      if (!entry?.person) return cantLoad(key);
      const marriages = Object.values(entry.person.Spouses || {})
        .map((spouse) => ({ ...asMarriage(spouse), spouseDeath: spouse?.DeathDate || "", endDate: spouse?.marriage_end_date || "" }))
        .sort((a, b) => String(a.date || "9999").localeCompare(String(b.date || "9999")));
      return buildMarriageTimingAnswer({
        person: {
          label: nameOf(entry.person),
          gender: entry.person.Gender,
          birth: entry.person.BirthDate,
          death: entry.person.DeathDate,
        },
        marriages,
        ask: params.ask,
        ordinal: params.ordinal || 0,
      });
    }

    if (params?.parents) {
      const response = await WikiTreeAPI.getPerson(WBE_CHAT_APP_ID, key, "Id,Name,RealName,Derived.ShortName,Father,Mother");
      const child = response?._data || response || {};
      const fatherId = Number(child.Father) || 0;
      const motherId = Number(child.Mother) || 0;
      if (!fatherId || !motherId) {
        return `${nameOf(child)} doesn't have both parents on WikiTree, so there is no parents' marriage to look up.`;
      }
      const father = await spousesOf(fatherId);
      if (!father) return `I couldn't load ${nameOf(child)}'s father from WikiTree.`;
      const withMother = father.spouses.filter((spouse) => Number(spouse?.Id) === motherId);
      const [motherEntry] = await WikiTreeAPI.getPeople(WBE_CHAT_APP_ID, [motherId], "Id,Name,RealName,Derived.ShortName").then(
        ([, , people]) => [Object.values(people || {})[0]]
      );
      return buildMarriageAnswer({
        personLabel: nameOf(father.person),
        marriages: withMother.map(asMarriage),
        parents: true,
        otherParentLabel: nameOf(motherEntry || { Id: motherId }),
      });
    }

    const subject = await spousesOf(key);
    if (!subject) return cantLoad(key);
    const marriages = subject.spouses
      .map(asMarriage)
      .sort((a, b) => String(a.date || "9999").localeCompare(String(b.date || "9999")));
    return buildMarriageAnswer({ personLabel: nameOf(subject.person), marriages });
  }

  async function tryHandleTwinsPrompt(params, prompt = "") {
    return tryHandleRelativeFactPrompt({ owner: params?.target || "", relationRaw: "children", fact: "twins" }, prompt);
  }

  /** {key} for "" (page profile), "me" (the user) or a name/ID; else {error}. */
  async function resolveOwnerKey(ownerName, prompt) {
    if (ownerName === "me") {
      const userRoot = await getLoggedInRootPerson();
      const key = userRoot?.wtId || userRoot?.key || "";
      return key ? { key } : { error: "I couldn't tell who you are on WikiTree. Log in, or name the person (for example Smith-123)." };
    }
    if (!ownerName) {
      const key = getProfileSubjectRoot()?.wtId || getProfileSubjectRoot()?.key || "";
      return key ? { key } : { error: "Open a profile page first, or name the person (for example Smith-123)." };
    }
    const found = await resolveConnectionTargetPerson(ownerName, prompt);
    const key = found?.Name || found?.Id || "";
    return key
      ? { key }
      : {
          error: `I couldn't identify which profile you meant by "${ownerName}". Try a WikiTree ID like Name-123, or a more specific name.`,
        };
  }

  async function tryHandleProfileFactPrompt(params, prompt = "") {
    const { key, error } = await resolveOwnerKey(String(params?.owner || "").trim(), prompt);
    if (error) return error;
    const [profile] = (await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, key, PROFILE_FACT_FIELDS, { resolveRedirect: 1 })) || [];
    if (!profile?.Name) return cantLoad(key);
    // Creator is a person Id: getPeople reads it as one (a numeric getProfile key is a page Id).
    let creatorLabel = "";
    if (params?.fact === "created" && Number(profile.Creator) > 0) {
      const [, , people] = (await WikiTreeAPI.getPeople(WBE_CHAT_APP_ID, [String(profile.Creator)], "Id,Name,RealName")) || [];
      const creator = Object.values(people || {}).find((entry) => entry?.Name);
      if (creator) creatorLabel = `${creator.RealName || creator.Name} (${creator.Name})`;
    }
    return buildProfileFactAnswer(profile, params?.fact, `${profile.RealName || profile.Name} (${profile.Name})`, { creatorLabel });
  }

  // Fan chart (2026-10-03): ancestors drawn with d3 in a popup; the reply sums it up.
  // quality: also the Gold Standard checklist fields (biographies included, so heavier).
  async function loadFanSlots(key, generations = FAN_CHART_DEFAULT_GENERATIONS, { quality = false } = {}) {
    const [, , people] = await fetchPeoplePaged(WBE_CHAT_APP_ID, key, quality ? `${FAN_CHART_FIELDS},${QUALITY_FIELDS}` : FAN_CHART_FIELDS, {
      ancestors: generations,
      minGeneration: 0,
      limit: 1000,
    });
    return buildFanSlots(people, key, generations);
  }

  function openFanChart(slots, generations = FAN_CHART_DEFAULT_GENERATIONS, mode = "") {
    noteHiddenProfiles(slots.filter((person) => person?.hidden).length);
    const titleFor = (person) => `Fan chart: ${person?.name || person?.wtid || ""}${person?.wtid ? ` (${person.wtid})` : ""}`;
    return showFanChartPopup(slots, {
      title: titleFor(slots[1]),
      mode,
      links: chartLinks("explorer", "descendants", "lifespans", "names", "calendar", "timeline"),
      loadDnaTests: async (wtid) => {
        const [result] = (await WikiTreeAPI.postToAPI({ appId: WBE_CHAT_APP_ID, action: "getConnectedDNATestsByProfile", key: wtid })) || [];
        return result?.dnaTests || [];
      },
      onRecenter: async (wtid, wanted = generations, { quality = false } = {}) => {
        const next = await loadFanSlots(wtid, wanted, { quality });
        return { slots: next, title: titleFor(next[1]) };
      },
    });
  }

  // Completeness heatmap (2026-10-04): a row per generation, a column per branch.
  function openCompletenessHeatmap(slots) {
    const person = slots[1] || {};
    return showCompletenessHeatmapPopup(slots, {
      title: `Completeness heatmap: ${person.name || person.wtid || ""}${person.wtid ? ` (${person.wtid})` : ""}`,
      rootKey: person.wtid,
      links: chartLinks("overview", "fan", "explorer"),
      onOpenBranch: async (wtid) => {
        const branchSlots = await loadFanSlots(wtid, FAN_CHART_MAX_GENERATIONS);
        if (branchSlots[1]) openFanChart(branchSlots, FAN_CHART_MAX_GENERATIONS, "brickwalls");
      },
    });
  }

  async function tryHandleFanChartPrompt(params, prompt = "") {
    const rootPerson = await resolveAncestorSubjectRoot(params?.ancestorPrompt || prompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123.`;
    }
    if (!rootPerson) return "I could not detect a profile person or your logged-in profile to draw a fan chart for.";
    const generations = Number(params?.generations) || FAN_CHART_DEFAULT_GENERATIONS;
    try {
      // Completeness means the Gold Standard checklist too (the user, 2026-10-04), so load its fields.
      const slots = await loadFanSlots(rootPerson.key, generations, { quality: !!params?.completeness });
      if (!slots[1]) return cantLoad(rootPerson, "ancestors");
      const owner = rootPerson?.subjectType === "user" ? "Your" : `${formatSubjectLabel(rootPerson)}'s`;
      if (params?.mode === "dnalines" && !slots[1].fatherId && !slots[1].motherId) {
        const tree = await loadDescendantTree(rootPerson.key, generations);
        if (!tree) return cantLoad(rootPerson, "descendants");
        const openCarriers = () => openDescendantChart(tree, "dnacarriers");
        openCarriers();
        return {
          message: `${formatSubjectLabel(rootPerson)} has no parents attached on WikiTree, so this chart shows DNA inheritance through children and descendants.\n${buildDnaCarrierSummary(tree, owner, generations)}`,
          actions: [{ label: "Open DNA carriers chart", onClick: openCarriers }, VISUALS.explorer(rootPerson.key)],
          chartOpened: true,
        };
      }
      const hasAncestors = fanChartStats(slots).found > 0;
      // DNA views still show the root and inheritance gaps without recorded ancestors.
      const canOpenChart = hasAncestors || ["dnalines", "xdna"].includes(params?.mode);
      const open = () => openFanChart(slots, generations, params?.mode || "");
      const openHeatmap = () => openCompletenessHeatmap(slots);
      if (canOpenChart) (params?.heatmap ? openHeatmap : open)();
      const key = slots[1].wtid || rootPerson.key;
      if (params?.completeness) {
        const branches = hasAncestors ? describeBranchCompleteness(buildCompletenessGrid(slots)) : "";
        const summary = buildCompletenessSummary(slots, owner);
        const seen = new Set();
        const ancestors = slots
          .map((person, slot) => (slot > 1 && person && !seen.has(person.id) && seen.add(person.id) ? { ...person, generation: generationOfSlot(slot) } : null))
          .filter(Boolean);
        const quality = buildQualitySummary(ancestors, owner);
        if (params?.help) {
          // "Which of my ancestors need help?": the list, then the overall picture's first line.
          const help = buildNeedsHelpAnswer(ancestors, owner);
          return {
            message: [help || `I couldn't check ${owner === "Your" ? "your" : owner} ancestors' profiles.`, quality.split("\n")[0]].filter(Boolean).join("\n"),
            actions: hasAncestors ? [{ label: "Open fan chart", onClick: open }, { label: "Completeness heatmap", onClick: openHeatmap }, VISUALS.overview(key)] : [],
            table: tableFromSlots(`${owner} ancestors`, slots),
            chartOpened: hasAncestors,
          };
        }
        return {
          message: [
            quality,
            quality ? "Ancestors found on WikiTree:" : "",
            params?.heatmap ? summary.replace(/ The fan chart marks them all\.$/m, " The heatmap shows where.") : summary,
            branches,
          ]
            .filter(Boolean)
            .join("\n"),
          actions: hasAncestors
            ? [
                params?.heatmap ? { label: "Open heatmap", onClick: openHeatmap } : { label: "Open fan chart", onClick: open },
                params?.heatmap ? { label: "Brick walls fan chart", onClick: () => openFanChart(slots, generations, "brickwalls") } : { label: "Completeness heatmap", onClick: openHeatmap },
                VISUALS.overview(key),
              ]
            : [],
          table: tableFromSlots(`${owner} ancestors`, slots),
          chartOpened: hasAncestors,
        };
      }
      return {
        message: params?.completeness
          ? buildCompletenessSummary(slots, owner)
          : params?.mode === "dnaproof"
          ? buildParentStatusSummary(slots, owner)
          : params?.mode === "dnalines"
          ? buildDnaLinesSummary(slots, owner, { chartOpened: canOpenChart })
          : params?.dna
          ? buildXDnaSummary(slots, owner, { chartOpened: canOpenChart })
          : params?.mode === "surname"
          ? buildSurnameSummary(slots, owner)
          : canOpenChart
          ? buildFanChartSummary(slots, owner)
          : `${owner} tree has no parents recorded on WikiTree yet.`,
        actions: canOpenChart ? [{ label: "Open fan chart", onClick: open }, VISUALS.explorer(key), VISUALS.lifespans(key), VISUALS.map(key)] : [],
        table: tableFromSlots(`${owner} ancestors`, slots),
        chartOpened: canOpenChart,
      };
    } catch (error) {
      return `The fan chart failed to load (${error?.message || error}).`;
    }
  }

  // Fractal tree (2026-10-03): a OneZoom-style zoomable family tree (the user's
  // model: onezoom.org, "but for families"). Descendants by default; ancestors on request.
  async function loadFractalTree(key, which, generations) {
    const tree = which === "ancestors" ? treeFromAncestorSlots(await loadFanSlots(key, generations)) : await loadDescendantTree(key, generations);
    // People at the edge of what's loaded may have more; the popup loads them as you zoom in.
    if (tree?.person) markFrontier(tree, which, generations);
    return tree;
  }

  function openFractalTree(tree, which) {
    const person = tree?.person || {};
    const noun = which === "ancestors" ? "ancestors" : "descendants";
    const other = which === "ancestors" ? "descendants" : "ancestors";
    return showFractalTreePopup(tree, {
      which,
      title: `Fractal tree of ${fullName(person)}'s ${noun}${person.wtid ? ` (${person.wtid})` : ""}`,
      // Zooming into someone at the edge of what's loaded fetches the next generations of their branch.
      onExpand: (branchPerson) => loadFractalTree(branchPerson.wtid || branchPerson.id, which, FRACTAL_TREE_EXPAND_GENERATIONS[which]),
      // The header button turns the tree round: the same person's ancestors ⇄ descendants.
      onSwitchWhich: person.wtid
        ? async () => {
            const flipped = await loadFractalTree(person.wtid, other, FRACTAL_TREE_DEFAULT_GENERATIONS[other]);
            if (flipped?.person) openFractalTree(flipped, other);
          }
        : null,
    });
  }

  /** A "Fractal tree" button for ancestor and descendant answers. */
  function fractalTreeAction(key, which = "descendants") {
    return {
      label: "Fractal tree",
      onClick: async () => {
        try {
          const tree = await loadFractalTree(key, which, FRACTAL_TREE_DEFAULT_GENERATIONS[which]);
          if (tree) openFractalTree(tree, which);
        } catch (error) {
          console.warn("wbe: fractal tree failed", error);
        }
      },
    };
  }

  async function tryHandleFractalTreePrompt(params, prompt = "") {
    const which = params?.which === "ancestors" ? "ancestors" : "descendants";
    const subjectPrompt = params?.subjectPrompt || prompt;
    const rootPerson = which === "ancestors" ? await resolveAncestorSubjectRoot(subjectPrompt) : await resolveDescendantSubjectRoot(subjectPrompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123.`;
    }
    if (!rootPerson) return "I could not detect a profile person or your logged-in profile to draw a fractal tree for.";
    const generations = Number(params?.generations) || FRACTAL_TREE_DEFAULT_GENERATIONS[which];
    try {
      const tree = await loadFractalTree(rootPerson.key, which, generations);
      if (!tree?.person) return `I couldn't load ${formatSubjectLabel(rootPerson)}'s ${which} from WikiTree.`;
      const owner = rootPerson?.subjectType === "user" ? "Your" : `${formatSubjectLabel(rootPerson)}'s`;
      const hasBranches = tree.children.length > 0;
      const open = () => openFractalTree(tree, which);
      if (hasBranches) open();
      return {
        message: buildFractalTreeSummary(tree, owner, which),
        actions: hasBranches ? [{ label: "Open fractal tree", onClick: open }] : [],
        table: tableFromTree(`${owner} ${which}`, tree, which),
        chartOpened: hasBranches,
      };
    } catch (error) {
      return `The fractal tree failed to load (${error?.message || error}).`;
    }
  }

  // Family world (2026-10-03): the fractal tree's CC7-style version: the person
  // among their brothers and sisters, descendants nested inside; zooming out
  // brings both sets of parents' families; getPeople "nuclear" around whoever you zoom to.
  const FAMILY_WORLD_FIELDS = `${FAN_CHART_FIELDS},Spouses,Meta`;

  async function loadFamilyWorld(key) {
    const world = createFamilyWorld(key);
    const fetchAround = async (root, nuclear) => {
      const [, , people] = await fetchPeoplePaged(WBE_CHAT_APP_ID, root, FAMILY_WORLD_FIELDS, { nuclear, limit: 1000 });
      mergeWorldPeople(world, people, { root, nuclear });
      // Hidden profiles found while zooming get the same note as at the start, once.
      if (world.noteHiddenOnce) world.noteHiddenOnce();
    };
    // A nuclear getPeople leaves out the starting person (Degrees 0), so fetch them alongside (live, 2026-10-03).
    // (Later expansions start from someone already loaded.)
    const [, [, , self]] = await Promise.all([fetchAround(key, FAMILY_WORLD_NUCLEAR.start), fetchPeoplePaged(WBE_CHAT_APP_ID, key, FAMILY_WORLD_FIELDS)]);
    mergeWorldPeople(world, self, { root: key, nuclear: FAMILY_WORLD_NUCLEAR.start });
    world.fetchAround = fetchAround;
    return world;
  }

  function openFamilyWorld(world) {
    const focus = world.people.get(world.focusId) || {};
    const hiddenCount = () => [...world.people.values()].filter((person) => person?.hidden).length;
    let noted = hiddenCount() > 0;
    noteHiddenProfiles(hiddenCount());
    world.noteHiddenOnce = () => {
      if (noted || !hiddenCount()) return;
      noted = true;
      noteHiddenProfiles(hiddenCount());
    };
    return showFamilyWorldPopup(
      {
        build: () => buildFamilyWorldLayout(world),
        // (only a fetch that worked counts as tried: one that failed, say on WikiTree's bot check, is tried again)
        // (after three failures it counts as tried too, so zooming out can go on without them)
        expand: (request) =>
          world.fetchAround(request.id, FAMILY_WORLD_NUCLEAR.expand).then(
            () => world.tried.add(request.id),
            (error) => {
              world.failedFetches = world.failedFetches || new Map();
              const count = (world.failedFetches.get(request.id) || 0) + 1;
              world.failedFetches.set(request.id, count);
              if (count >= 3) world.tried.add(request.id);
              throw error;
            }
          ),
        climb: (from) => climbFamilyScene(world, from),
        reroot: (root, anchorUid, nodes, how) => rerootFamilyScene(world, root, anchorUid, nodes, how),
        normalise: () => normaliseFamilyScene(world),
        home: () => startFamilyScene(world),
        stats: () =>
          `<strong>${world.people.size.toLocaleString()}</strong>people loaded so far · zoom into anyone for their children · zoom out for both sets of parents`,
      },
      {
        title: `Family Explorer: ${fullName(focus)}${focus.wtid ? ` (${focus.wtid})` : ""}`,
        links: chartLinks("fan", "descendants", "timeline"),
        linkKey: focus.wtid || "",
      }
    );
  }

  async function tryHandleFamilyWorldPrompt(params, prompt = "") {
    const rootPerson = await resolveAncestorSubjectRoot(params?.subjectPrompt || prompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123.`;
    }
    if (!rootPerson) return "I could not detect a profile person or your logged-in profile to explore the family of.";
    try {
      const world = await loadFamilyWorld(rootPerson.key);
      if (!world.focusId) return cantLoad(rootPerson, "family");
      const owner = rootPerson?.subjectType === "user" ? "Your" : `${formatSubjectLabel(rootPerson)}'s`;
      const open = () => openFamilyWorld(world);
      open();
      return {
        message: buildFamilyWorldSummary(world, owner),
        actions: [{ label: "Open Family Explorer", onClick: open }],
        table: tableFromPeople(`${owner} family (Family Explorer)`, world.people.values()),
        chartOpened: true,
      };
    } catch (error) {
      return `The Family Explorer failed to load (${error?.message || error}).`;
    }
  }

  // Migration map (2026-10-03): the fan chart's ancestors (10 generations) on a
  // world map; an arc per parent → child born in different places.
  // Descendants on the map (2026-10-03): where a family spread to.
  async function openDescendantMap(key, generations = DESCENDANT_CHART_DEFAULT_GENERATIONS) {
    const tree = await loadDescendantTree(key, generations);
    if (!tree) return null;
    // (towns looked up before name the places in the summary)
    await loadGeocodeCache();
    const migration = buildDescendantMigration(tree);
    const person = tree.person || {};
    const opened = migration.places.length > 0 && tree.children.length > 0;
    if (opened) {
      await showMigrationMapPopup(migration, {
        title: `Descendants' map: ${person.name || person.wtid} (${person.wtid})`,
        fileBase: `descendant-map-${String(person.wtid || "").replace(/[^A-Za-z0-9_-]/g, "")}`,
        arcHint: "Parent → child born in a new place",
        peopleWord: "descendant",
      });
    }
    return { tree, migration, opened };
  }

  async function tryHandleDescendantMapPrompt(params, prompt = "") {
    const rootPerson = await resolveDescendantSubjectRoot(params?.descendantPrompt || prompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123.`;
    }
    if (!rootPerson) return "I could not detect a profile person or your logged-in profile to map the descendants of.";
    try {
      const shown = await openDescendantMap(rootPerson.key);
      if (!shown) return cantLoad(rootPerson, "descendants");
      if (!shown.tree.children.length) return `${formatSubjectLabel(rootPerson)} has no descendants recorded on WikiTree.`;
      const owner = rootPerson?.subjectType === "user" ? "Your" : `${formatSubjectLabel(rootPerson)}'s`;
      const key = shown.tree.person?.wtid || rootPerson.key;
      return {
        message: buildDescendantMigrationSummary(shown.migration, owner),
        actions: [VISUALS.descmap(key, "Open descendants' map"), VISUALS.descendants(key), VISUALS.explorer(key)],
        table: tableFromTree(`${owner} descendants`, shown.tree),
        chartOpened: shown.opened,
      };
    } catch (error) {
      return `The descendants' map failed to load (${error?.message || error}).`;
    }
  }

  async function tryHandleMigrationMapPrompt(params, prompt = "") {
    if (params?.descendants) return tryHandleDescendantMapPrompt(params, prompt);
    const rootPerson = await resolveAncestorSubjectRoot(params?.ancestorPrompt || prompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123.`;
    }
    if (!rootPerson) return "I could not detect a profile person or your logged-in profile to map the ancestors of.";
    try {
      const slots = await loadFanSlots(rootPerson.key, MIGRATION_MAP_GENERATIONS);
      if (!slots[1]) return cantLoad(rootPerson, "ancestors");
      const owner = rootPerson?.subjectType === "user" ? "Your" : `${formatSubjectLabel(rootPerson)}'s`;
      await loadGeocodeCache();
      const migration = buildMigration(slots);
      const label = `${slots[1].name || slots[1].wtid} (${slots[1].wtid})`;
      const open = () =>
        showMigrationMapPopup(migration, {
          title: `Migration map: ${label}`,
          fileBase: `migration-map-${String(slots[1].wtid || "").replace(/[^A-Za-z0-9_-]/g, "")}`,
          year: Number(params?.year) || 0,
        });
      const canMap = migration.places.length > 0;
      if (canMap) void open().catch((error) => console.warn("wbe: migration map failed", error));
      return {
        message: params?.year ? buildMigrationYearSummary(slots, Number(params.year), owner) : buildMigrationSummary(migration, owner),
        actions: canMap ? [{ label: "Open migration map", onClick: () => void open() }, VISUALS.lifespans(slots[1].wtid), VISUALS.fan(slots[1].wtid, "country", "Birth countries fan chart")] : [],
        table: tableFromSlots(`${owner} ancestors`, slots),
        chartOpened: canMap,
      };
    } catch (error) {
      return `The migration map failed to load (${error?.message || error}).`;
    }
  }

  // Lifespans (2026-10-03): every ancestor's life as a bar, with how many were alive each year.
  // The family timeline is its "family" view (user: the two were "very very similar"),
  // with a switch at the top between the two. extra: {view, position, focusEventId,
  // familyTimeline (an already loaded {rows, label})}.
  async function openLifespans(key, extra = {}) {
    const view = ["family", "descendants"].includes(extra.view) ? extra.view : "ancestors";
    const onView = async (next, position) => {
      try {
        const shown = await openLifespans(key, { view: next, position });
        if (shown && !shown.opened) notify(next === "family" ? "No close family with birth years to show." : next === "descendants" ? "No descendants with birth years to show." : "Too few ancestors with birth years to show.");
      } catch (error) {
        notify(`Lifespans couldn't load (${error?.message || error}).`);
      }
    };
    const common = { view, onView, position: extra.position, focusEventId: extra.focusEventId || "" };
    if (view === "family") {
      const loaded = extra.familyTimeline || (await loadFamilyTimeline(key));
      if (!loaded) return null;
      if (!extra.position) noteHiddenProfiles(loaded.rows.filter((row) => row.hidden).length);
      const { rows, undated } = familyLifespanRows(loaded.rows);
      const table = tableFromLifespanRows(`Close family of ${loaded.label}`, loaded.rows);
      if (rows.filter((row) => !row.root).length < 1) return { rows, undated, table, opened: false };
      showLifespansPopup(rows, { ...common, title: `Lifespans: ${loaded.label}`, undated, links: chartLinks("explorer", "fan", "descendants") });
      return { rows, undated, table, opened: true };
    }
    if (view === "descendants") {
      const tree = await loadDescendantTree(key);
      if (!tree) return null;
      if (!extra.position) noteHiddenProfiles(countHidden(tree));
      const { rows, undated } = buildDescendantLifespanRows(tree);
      const person = tree.person;
      const table = tableFromTree(`Descendants of ${person.name || person.wtid}${person.wtid ? ` (${person.wtid})` : ""}`, tree);
      if (rows.filter((row) => row.generation > 0).length < 1) return { rows, undated, table, opened: false };
      showLifespansPopup(rows, {
        ...common,
        title: `Lifespans: ${person.name || person.wtid}${person.wtid ? ` (${person.wtid})` : ""}`,
        undated,
        links: chartLinks("descendants", "descmap", "explorer"),
      });
      return { rows, undated, table, opened: true };
    }
    const slots = await loadFanSlots(key, LIFESPANS_GENERATIONS);
    if (!slots[1]) return null;
    if (!slots[1].fatherId && !slots[1].motherId) {
      const descendants = await openLifespans(key, { ...extra, view: "descendants" });
      return descendants ? { ...descendants, autoDescendants: true } : null;
    }
    if (!extra.position) noteHiddenProfiles(slots.filter((person) => person?.hidden).length);
    const { rows, undated } = buildLifespanRows(slots);
    const table = tableFromSlots(`Ancestors of ${slots[1].name || slots[1].wtid} (${slots[1].wtid})`, slots);
    if (rows.filter((row) => row.generation > 0).length < 1) return { rows, undated, table, opened: false };
    showLifespansPopup(rows, {
      ...common,
      title: `Lifespans: ${slots[1].name || slots[1].wtid} (${slots[1].wtid})`,
      undated,
      links: chartLinks("overview", "fan", "explorer", "calendar"),
    });
    return { rows, undated, table, opened: true };
  }

  // Name cloud (2026-10-03): ancestors' first names and surnames, sized by count.
  async function openNameCloud(key) {
    const slots = await loadFanSlots(key, NAME_CLOUD_GENERATIONS);
    if (!slots[1]) return null;
    let names = slots;
    let scope = "ancestors";
    if (!slots[1].fatherId && !slots[1].motherId) {
      scope = "descendants";
      names = [null, slots[1]];
      const tree = await loadDescendantTree(key, NAME_CLOUD_GENERATIONS);
      const visit = (node) => {
        if (node.depth > 0) names.push({ ...node.person, generation: node.depth });
        node.children.forEach(visit);
      };
      if (tree) visit(tree);
    }
    const clouds = { first: buildNameCloud(names, "first"), surname: buildNameCloud(names, "surname") };
    const opened = clouds.first.length + clouds.surname.length > 0;
    if (opened) {
      showNameCloudPopup(clouds, {
        title: `Name cloud: ${scope} of ${slots[1].name || slots[1].wtid} (${slots[1].wtid})`,
        scope,
        rootKey: slots[1].wtid,
        links: chartLinks("overview", "fan", "lifespans", "explorer"),
        ...(scope === "ancestors" ? { onRiver: () => showSurnameRiver(slots) } : {}),
      });
    }
    return { slots, names, scope, opened };
  }

  // Family size (2026-10-04): each ancestral couple's children, generation by generation.
  async function openFamilySize(key) {
    const slots = await loadFanSlots(key, FAMILY_SIZE_GENERATIONS);
    if (!slots[1]) return null;
    // The parents' children: getPeople with descendants: 1 on every ancestor who is someone's parent.
    const parentIds = [...new Set(slots.slice(2).filter(Boolean).map((person) => person.id).filter(Boolean))];
    const [, , people] = parentIds.length
      ? await fetchPeoplePaged(WBE_CHAT_APP_ID, parentIds, "Id,Name,RealName,FirstName,Gender,BirthDate,DeathDate,Father,Mother", { descendants: 1, limit: 100 })
      : [null, null, {}];
    const data = buildFamilySizes(slots, people);
    const opened = data.couples.length >= 1;
    if (opened) {
      showFamilySizePopup(data, {
        title: `Family size: ${slots[1].name || slots[1].wtid} (${slots[1].wtid})`,
        rootKey: slots[1].wtid,
        links: chartLinks("lifespans", "fan", "overview", "explorer"),
      });
    }
    return { slots, data, opened };
  }

  // Surname river (2026-10-04): ancestors' surnames by generation, as a streamgraph.
  function showSurnameRiver(slots, generations = NAME_CLOUD_GENERATIONS) {
    const series = buildSurnameRiver(slots);
    if (!series || series.generations.length < 2) return null;
    showOriginsPopup(series, {
      kind: "surname",
      title: `Surname river: ${slots[1].name || slots[1].wtid} (${slots[1].wtid})`,
      fileBase: `surname-river-${String(slots[1].wtid || "").replace(/[^A-Za-z0-9_-]/g, "")}`,
      // More or fewer generations: reload the ancestors and redraw.
      generations,
      minGenerations: 3,
      maxGenerations: FAN_CHART_MAX_GENERATIONS,
      onGenerations: async (wanted) => {
        const more = await loadFanSlots(slots[1].wtid || slots[1].id, wanted);
        if (more[1]) showSurnameRiver(more, wanted);
      },
    });
    return series;
  }

  async function openSurnameRiver(key) {
    const slots = await loadFanSlots(key, NAME_CLOUD_GENERATIONS);
    if (!slots[1]) return null;
    return { slots, series: showSurnameRiver(slots) };
  }

  async function tryHandleNameCloudPrompt(params, prompt = "") {
    const rootPerson = await resolveAncestorSubjectRoot(params?.ancestorPrompt || prompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123.`;
    }
    if (!rootPerson) return "I could not detect a profile person or your logged-in profile to gather the names of.";
    if (params?.familySize) {
      try {
        const shown = await openFamilySize(rootPerson.key);
        if (!shown) return cantLoad(rootPerson, "ancestors");
        const owner = rootPerson?.subjectType === "user" ? "Your" : `${formatSubjectLabel(rootPerson)}'s`;
        const key = shown.slots[1].wtid || rootPerson.key;
        return {
          message: describeFamilySizes(shown.data, owner),
          actions: [VISUALS.familysize(key, shown.opened ? "Open family size chart" : "Family size"), VISUALS.lifespans(key), VISUALS.fan(key)],
          table: tableFromSlots(`${owner} ancestors`, shown.slots),
          chartOpened: shown.opened,
        };
      } catch (error) {
        return `The family size chart failed to load (${error?.message || error}).`;
      }
    }
    if (params?.river) {
      try {
        const shown = await openSurnameRiver(rootPerson.key);
        if (!shown) return cantLoad(rootPerson, "ancestors");
        const owner = rootPerson?.subjectType === "user" ? "Your" : `${formatSubjectLabel(rootPerson)}'s`;
        const key = shown.slots[1].wtid || rootPerson.key;
        const message = shown.series
          ? describeSurnameRiver(shown.series, owner)
          : `${owner} ancestors' surnames don't span enough generations on WikiTree for a river yet.`;
        return {
          message,
          actions: [
            ...(shown.series ? [chartAction("Open surname river", () => showSurnameRiver(shown.slots))] : []),
            VISUALS.names(key),
            VISUALS.fan(key, "surname", "Surnames fan chart"),
          ],
          table: tableFromSlots(`${owner} ancestors`, shown.slots),
          chartOpened: !!shown.series,
        };
      } catch (error) {
        return `The surname river failed to load (${error?.message || error}).`;
      }
    }
    try {
      const shown = await openNameCloud(rootPerson.key);
      if (!shown) return cantLoad(rootPerson, "ancestors");
      const owner = rootPerson?.subjectType === "user" ? "Your" : `${formatSubjectLabel(rootPerson)}'s`;
      const key = shown.slots[1].wtid || rootPerson.key;
      return {
        message: `${shown.scope === "descendants" ? `${owner} profile has no parents attached, so I used descendants for the name cloud.\n` : ""}${!shown.opened && shown.scope === "descendants" ? "No descendants with usable names were found on WikiTree, so there is no name cloud to show." : buildNameCloudSummary(shown.names, owner, shown.scope)}`,
        actions: [...(shown.opened ? [VISUALS.names(key, "Open name cloud")] : []), ...(shown.scope === "descendants" ? [VISUALS.descendants(key), VISUALS.explorer(key)] : [VISUALS.fan(key, "surname", "Surnames fan chart"), VISUALS.lifespans(key)])],
        chartOpened: shown.opened,
      };
    } catch (error) {
      return `The name cloud failed to load (${error?.message || error}).`;
    }
  }

  // Family calendar (2026-10-03): ancestors' births and deaths on one year, with today marked.
  async function openFamilyCalendar(key, focusMonth = 0) {
    const slots = await loadFanSlots(key, FAMILY_CALENDAR_GENERATIONS);
    if (!slots[1]) return null;
    const [tree, relatives] = await Promise.all([
      loadDescendantTree(key, FAMILY_CALENDAR_GENERATIONS),
      typeof WikiTreeAPI.getRelatives === "function"
        ? WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, key, FAN_CHART_FIELDS, { getSiblings: 1, getSpouses: 1 })
        : Promise.resolve([]),
    ]);
    const family = slots.slice();
    const visit = (node) => {
      if (node.depth > 0) family.push({ ...node.person, generation: node.depth, relation: descendantWord(node.depth, node.person.gender) });
      node.children.forEach(visit);
    };
    if (tree) visit(tree);
    const person = relatives?.[0]?.person;
    for (const [group, relation] of [["Siblings", "Sibling"], ["Spouses", "Spouse"]]) {
      Object.values(person?.[group] || {}).forEach((relative) => {
        const summary = buildFanSlots({ [relative.Id]: relative }, relative.Id || relative.Name, 0)[1];
        if (summary) family.push({ ...summary, generation: 1, relation });
      });
    }
    const events = buildCalendarEvents(family);
    const opened = events.length > 0;
    if (opened) {
      showFamilyCalendarPopup(events, {
        title: `Family calendar: ${slots[1].name || slots[1].wtid} (${slots[1].wtid})`,
        rootKey: slots[1].wtid,
        focusMonth,
        links: chartLinks("overview", "fan", "lifespans", "timeline"),
      });
    }
    return { slots, events, opened };
  }

  async function tryHandleFamilyMatrixPrompt(params, prompt = "") {
    const root = await resolveAncestorSubjectRoot(params?.ancestorPrompt || prompt);
    if (!root || root.unresolvedName) return "I couldn't identify that profile. Try a WikiTree ID for the Relationship Chart.";
    const load = async (ancestors = 4, descendants = 5, progress) => {
      const people = await loadFamilyMatrixPeople(WikiTreeAPI, WBE_CHAT_APP_ID, root.key, ancestors, descendants, progress);
      const matrix = buildFamilyMatrix(people, root.key, ancestors, descendants);
      if (!matrix) throw new Error("WikiTree returned no starting profile");
      showFamilyMatrixPopup(matrix, { reload: load });
      return matrix;
    };
    try {
      const matrix = await load();
      return { message: `Relationship Chart for ${formatSubjectLabel(root)}: ${matrix.total} relatives in ${matrix.cards.length} relationship groups. Hover a card for people and dates, or click to keep the list open.`, chartOpened: true, actions: [{ label: "Open Relationship Chart", onClick: () => load() }] };
    } catch (error) { return `The Relationship Chart couldn't load (${error.message || error}).`; }
  }

  // Tree overview (2026-10-03): a dashboard of the ancestors, each panel opening its chart.
  async function openTreeOverview(key) {
    const slots = await loadFanSlots(key, TREE_OVERVIEW_GENERATIONS);
    if (!slots[1]) return null;
    const overview = buildTreeOverview(slots);
    if (!slots[1].fatherId && !slots[1].motherId) {
      overview.descendants = [];
      const tree = await loadDescendantTree(key, TREE_OVERVIEW_GENERATIONS);
      const seen = new Set();
      const visit = (node) => {
        const id = node.person.id || node.person.wtid;
        if (node.depth > 0 && !seen.has(id)) {
          seen.add(id);
          overview.descendants.push({ ...node.person, generation: node.depth });
        }
        node.children.forEach(visit);
      };
      if (tree) visit(tree);
    }
    const wtid = slots[1].wtid || key;
    const opened = true;
    if (opened) {
      const run = (action) => () => action.onClick();
      showTreeOverviewPopup(overview, {
        title: `Tree overview: ${slots[1].name || wtid} (${wtid})`,
        open: {
          familymap: run(chartAction("Relationship Chart", async () => {
            const result = await tryHandleFamilyMatrixPrompt({ ancestorPrompt: `${wtid}'s ancestors` });
            if (typeof result === "string") notify(result);
            return result;
          })),
          descendants: run(VISUALS.descendants(wtid)),
          descmap: run(VISUALS.descmap(wtid)),
          desclives: run(VISUALS.desclives(wtid)),
          fan: run(VISUALS.fan(wtid)),
          brickwalls: run(VISUALS.fan(wtid, "brickwalls", "Brick walls fan chart")),
          repeats: run(VISUALS.fan(wtid, "repeats", "Repeated ancestors")),
          map: run(VISUALS.map(wtid)),
          names: run(VISUALS.names(wtid)),
          lifespans: run(VISUALS.lifespans(wtid)),
          calendar: run(VISUALS.calendar(wtid)),
          explorer: run(VISUALS.explorer(wtid)),
        },
      });
    }
    return { slots, overview, opened };
  }

  async function tryHandleTreeOverviewPrompt(params, prompt = "") {
    const rootPerson = await resolveAncestorSubjectRoot(params?.ancestorPrompt || prompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123.`;
    }
    if (!rootPerson) return "I could not detect a profile person or your logged-in profile to sum up the tree of.";
    try {
      // Asked about the ancestors (not for the dashboard) and the tree goes past
      // the overview's 8 generations: all 25 in a table, the overview a button
      // away (user, 2026-10-09).
      if (!params?.explicit) {
        const slots = await loadFanSlots(rootPerson.key, TREE_OVERVIEW_GENERATIONS);
        if (slots[1] && fanChartStats(slots).deepest >= TREE_OVERVIEW_GENERATIONS) {
          const key = slots[1].wtid || rootPerson.wtId || rootPerson.key;
          const summary = await tryHandleAncestorListPrompt(
            { generation: 25, relationshipLabel: "ancestors", includeUpTo: true, pick: "summary", subjectText: `${key}'s ancestors` },
            `how many ancestors does ${key} have`
          );
          if (summary && typeof summary === "object") {
            return { ...summary, actions: [VISUALS.overview(key, "Tree overview"), ...(summary.actions || [])] };
          }
        }
      }
      const shown = await openTreeOverview(rootPerson.key);
      if (!shown) return cantLoad(rootPerson, "ancestors");
      const owner = rootPerson?.subjectType === "user" ? "Your" : `${formatSubjectLabel(rootPerson)}'s`;
      const key = shown.slots[1].wtid || rootPerson.key;
      return {
        message: shown.overview.descendants ? `${formatSubjectLabel(rootPerson)} has no parents attached on WikiTree. The overview shows ${shown.overview.descendants.length} descendants found within ${TREE_OVERVIEW_GENERATIONS} generations.` : buildTreeOverviewSummary(shown.overview, owner),
        actions: [
          // The overview stops at 8 generations; the count goes to 25.
          ...(!shown.overview.descendants && shown.overview.stats.deepest >= TREE_OVERVIEW_GENERATIONS
            ? [{ label: "Count all generations", actionType: "send-prompt", prompt: `how many ancestors does ${key} have`, newSearch: true }]
            : []),
          ...(shown.opened ? [VISUALS.overview(key, "Open tree overview"), ...visualActions(key, shown.overview.descendants ? "descendants" : "ancestors")] : [VISUALS.explorer(key)]),
        ],
        ...(!shown.overview.descendants ? { table: tableFromSlots(`${owner} ancestors`, shown.slots) } : {}),
        chartOpened: shown.opened,
      };
    } catch (error) {
      return `The tree overview failed to load (${error?.message || error}).`;
    }
  }

  // Lives & ages (2026-10-04): ages at death and at parenthood from the fan chart's slots.
  async function tryHandleAgesPrompt(params, prompt = "") {
    const rootPerson = await resolveAncestorSubjectRoot(params?.ancestorPrompt || prompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123.`;
    }
    if (!rootPerson) return "I could not detect a profile person or your logged-in profile to chart the ages of.";
    try {
      const slots = await loadFanSlots(rootPerson.key, Number(params?.generations) || 10);
      if (!slots[1]) return cantLoad(rootPerson, "ancestors");
      const owner = rootPerson?.subjectType === "user" ? "Your" : `${formatSubjectLabel(rootPerson)}'s`;
      const key = slots[1].wtid || rootPerson.key;
      let ages = slots;
      let scope = "ancestors";
      if (!slots[1].fatherId && !slots[1].motherId) {
        scope = "descendants";
        ages = [null];
        const tree = await loadDescendantTree(rootPerson.key, Number(params?.generations) || 10);
        const visit = (node) => {
          ages.push({ ...node.person, generation: node.depth, children: node.children.map((child) => child.person) });
          node.children.forEach(visit);
        };
        if (tree) visit(tree);
      }
      const hasAges = deathAgeRows(ages).length > 0 || parentAgeRows(ages).length > 0;
      const prefix = scope === "descendants" ? `${formatSubjectLabel(rootPerson)} has no parents attached on WikiTree, so I used descendants for ages.\n` : "";
      if (!hasAges) return {
        message: `${prefix}There aren't enough birth or death dates to chart ${scope}' ages.`,
        actions: [VISUALS.explorer(key), VISUALS.descendants(key)],
        chartOpened: false,
      };
      const open = () =>
        showAgesPopup(ages, {
          title: `Lives & ages (${scope}): ${slots[1].name || key} (${key})`,
          mode: params?.mode || "death",
          links: chartLinks("fan", "lifespans", "overview"),
          rootKey: key,
        });
      noteHiddenProfiles(slots.filter((person) => person?.hidden).length);
      open();
      return {
        message: prefix + buildAgesSummary(ages, owner, params?.mode || "death", scope),
        actions: [{ label: "Open Lives & ages", onClick: open }, VISUALS.fan(key), VISUALS.lifespans(key)],
        ...(scope === "ancestors" ? { table: tableFromSlots(`${owner} ancestors`, slots) } : {}),
        chartOpened: true,
      };
    } catch (error) {
      return `The Lives & ages chart failed to load (${error?.message || error}).`;
    }
  }

  async function tryHandleFamilyCalendarPrompt(params, prompt = "") {
    const rootPerson = await resolveAncestorSubjectRoot(params?.ancestorPrompt || prompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123.`;
    }
    if (!rootPerson) return "I could not detect a profile person or your logged-in profile to make a family calendar for.";
    try {
      const shown = await openFamilyCalendar(rootPerson.key, Number(params?.month) || 0);
      if (!shown) return cantLoad(rootPerson, "ancestors");
      const owner = rootPerson?.subjectType === "user" ? "Your" : `${formatSubjectLabel(rootPerson)}'s`;
      const key = shown.slots[1].wtid || rootPerson.key;
      const root = shown.slots[1];
      const noParentsAttached = !root.fatherId && !root.motherId;
      const emptyMessage = `${rootPerson.subjectType === "user" ? "You have" : `${formatSubjectLabel(rootPerson)} has`} no parents attached on WikiTree, and no full birth or death dates to show, so the calendar is empty.`;
      return {
        message: !shown.events.length && noParentsAttached ? emptyMessage : buildCalendarSummary(shown.events, owner, { ...params, scope: "family" }),
        actions: [VISUALS.calendar(key, shown.opened ? "Open family calendar" : "Family calendar"), VISUALS.fan(key), VISUALS.lifespans(key)],

        chartOpened: shown.opened,
      };
    } catch (error) {
      return `The family calendar failed to load (${error?.message || error}).`;
    }
  }

  async function tryHandleLifespansPrompt(params, prompt = "") {
    const rootPerson = await resolveAncestorSubjectRoot(params?.ancestorPrompt || prompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123.`;
    }
    if (!rootPerson) return "I could not detect a profile person or your logged-in profile to chart the ancestors of.";
    try {
      if (params?.personal) {
        // One person's history (2026-10-04): their life line, with the world below it.
        const shown = await openLifeLine(rootPerson.key);
        if (shown?.line) {
          const { line } = shown;
          const extraRegions = shown.family.rows.filter((row) => row.role === "spouse" && row.marriagePlace).flatMap((row) => placeRegions(row.marriagePlace));
          const row = { ...line.self, start: line.start, end: line.end, endKnown: line.endKnown, living: line.living, extraRegions };
          const key = line.self.wtid || rootPerson.key;
          return {
            message: buildPersonHistorySummary(row, formatSubjectLabel(rootPerson), [], "The life line shows them under the family events: hover one for their age."),
            actions: [VISUALS.lifeline(key, "Open life line"), VISUALS.lifespans(key), VISUALS.timeline(key)],
            table: tableFromLifespanRows(`Close family of ${shown.family.label}`, shown.family.rows),
            chartOpened: true,
          };
        }
      }
      if (params?.history && !params?.personal) {
        const slots = await loadFanSlots(rootPerson.key, LIFESPANS_GENERATIONS);
        if (slots[1] && !slots[1].fatherId && !slots[1].motherId) {
          const tree = await loadDescendantTree(rootPerson.key);
          const { rows, undated } = tree ? buildDescendantLifespanRows(tree) : buildLifespanRows(slots);
          const self = rows.find((row) => row.generation === 0);
          const label = formatSubjectLabel(rootPerson);
          if (!self) return { message: `${label} has no birth year recorded on WikiTree, so there isn't a dated life to place in history yet.`, chartOpened: false, actions: [VISUALS.explorer(rootPerson.key)] };
          const open = () => showLifespansPopup(rows, {
            title: `In history: ${label}`,
            view: tree?.children.length ? "descendants" : "ancestors",
            undated,
            focusEventId: params.eventId || "",
            links: chartLinks("explorer", "descendants"),
          });
          open();
          return {
            message: buildPersonHistorySummary(self, label, rowCountries(rows)),
            actions: [{ label: "Open history chart", onClick: open }, VISUALS.explorer(rootPerson.key)],
            chartOpened: true,
          };
        }
      }
      const defaultShown = params?.view === "descendants" ? null : await openLifespans(rootPerson.key, { focusEventId: params?.eventId });
      if (params?.view === "descendants" || defaultShown?.autoDescendants) {
        const shown = defaultShown || await openLifespans(rootPerson.key, { view: "descendants" });
        if (!shown) return cantLoad(rootPerson, "descendants");
        const owner = rootPerson?.subjectType === "user" ? "Your" : `${formatSubjectLabel(rootPerson)}'s`;
        const key = shown.rows.find((row) => row.generation === 0)?.wtid || rootPerson.key;
        const dated = shown.rows.filter((row) => row.generation > 0);
        const generations = new Set(dated.map((row) => row.generation)).size;
        const message = dated.length
          ? `${owner} descendants' lifespans: ${dated.length} ${dated.length === 1 ? "person" : "people"} with a birth year over ${generations} generation${generations === 1 ? "" : "s"}, born ${Math.min(...dated.map((row) => row.start))}–${Math.max(...dated.map((row) => row.start))}${shown.undated ? ` (${shown.undated} without a birth year aren't shown)` : ""}.`
          : `None of ${owner.replace(/^Your$/, "your")} descendants on WikiTree has a birth year to chart.`;
        return {
          message: `${shown.autoDescendants ? `${formatSubjectLabel(rootPerson)} has no parents attached on WikiTree, so I used descendants.\n` : ""}${message}`,
          actions: shown.opened ? [VISUALS.desclives(key, "Open lifespans"), VISUALS.descendants(key), VISUALS.descmap(key)] : [VISUALS.descendants(key)],
          ...(!shown.autoDescendants && shown.opened ? { table: shown.table } : {}),
          chartOpened: shown.opened,
        };
      }
      const shown = defaultShown;
      if (!shown) return cantLoad(rootPerson, "ancestors");
      const owner = rootPerson?.subjectType === "user" ? "Your" : `${formatSubjectLabel(rootPerson)}'s`;
      const key = shown.rows.find((row) => row.generation === 0)?.wtid || rootPerson.key;
      return {
        message: params?.personal
          ? buildPersonHistorySummary(shown.rows.find((row) => row.generation === 0), formatSubjectLabel(rootPerson), rowCountries(shown.rows))
          : params?.history
          ? buildHistorySummary(shown.rows, owner, rowCountries(shown.rows), params.eventId || "")
          : buildLifespansSummary(shown.rows, owner, shown.undated),
        actions: shown.opened
          ? [VISUALS.lifespans(key, "Open lifespans"), VISUALS.fan(key), VISUALS.timeline(key)]
          : [VISUALS.fan(key), VISUALS.explorer(key)],
        table: shown.table,
        chartOpened: shown.opened,
      };
    } catch (error) {
      return `The lifespans chart failed to load (${error?.message || error}).`;
    }
  }

  // Descendant sunburst (2026-10-03): getPeople descendants (≤ 10 generations) drawn with d3.
  async function loadDescendantTree(key, generations = DESCENDANT_CHART_DEFAULT_GENERATIONS) {
    const [, , people] = await fetchPeoplePaged(WBE_CHAT_APP_ID, key, `${FAN_CHART_FIELDS},IsLiving`, {
      descendants: generations,
      minGeneration: 0,
      limit: 1000,
    });
    const tree = buildDescendantTree(people, key, generations);
    if (tree || !people || !Object.keys(people).length) return tree;
    // (the start came back masked: look them up on their own)
    const [, , alone] = (await WikiTreeAPI.getPeople(WBE_CHAT_APP_ID, [String(key)], `${FAN_CHART_FIELDS},IsLiving`)) || [];
    const rootProfile = Object.values(alone || {}).find((person) => person?.Name);
    return rootProfile ? buildDescendantTree(people, key, generations, rootProfile) : null;
  }

  // Profiles the API sent without a name (user, 2026-10-03: "I'M LOGGED IN AND THOSE are my
  // grandparents"). Being logged in to www.wikitree.com doesn't log you in to api.wikitree.com:
  // that's the separate Apps Login. Says which it is, once per chart.
  async function noteHiddenProfiles(count) {
    if (!count) return;
    let loggedIn = null;
    try {
      loggedIn = await WikiTreeAPI.isLoggedIntoAPI(getUserNumId(), WBE_CHAT_APP_ID);
    } catch (error) {
      // (unknown: say nothing about logging in)
    }
    const people = `${count} profile${count === 1 ? "" : "s"}`;
    if (loggedIn === false) {
      notify(`${people} show as "Private" because the WikiTree API doesn't know you're logged in (it has its own login). Use the green Apps button below, then open the chart again.`);
    } else if (loggedIn) notify(`${people} show as "Private": their privacy settings hide them from you.`);
  }

  function countHidden(node) {
    return (node?.children || []).reduce((sum, child) => sum + (child.person?.hidden ? 1 : 0) + countHidden(child), 0);
  }

  function openDescendantChart(tree, mode = "") {
    const person = tree?.person || {};
    noteHiddenProfiles(countHidden(tree));
    return showDescendantChartPopup(tree, {
      title: `Descendants: ${person.name || person.wtid}${person.wtid ? ` (${person.wtid})` : ""}`,
      mode,
      links: chartLinks("fan", "explorer", "descmap", "desclives", "timeline"),
    });
  }

  /** A "Descendant chart" button for descendant answers. */
  function descendantChartAction(key) {
    return {
      label: "Descendant chart",
      onClick: async () => {
        try {
          const tree = await loadDescendantTree(key);
          if (!tree) return null;
          return openDescendantChart(tree);
        } catch (error) {
          console.warn("wbe: descendant chart failed", error);
        }
      },
    };
  }

  /** The DNA tests connected to a person (getConnectedDNATestsByProfile), remembered per person. */
  const connectedTestsCache = new Map();
  function connectedTests(wtid) {
    if (!connectedTestsCache.has(wtid)) {
      connectedTestsCache.set(
        wtid,
        WikiTreeAPI.postToAPI({ appId: WBE_CHAT_APP_ID, action: "getConnectedDNATestsByProfile", key: wtid })
          .then(([result] = []) => result?.dnaTests || [])
          .catch(() => [])
      );
    }
    return connectedTestsCache.get(wtid);
  }

  /** The takers of tests connected to a person, of the type their line passes on (Y for a man, mt for a woman). */
  async function lineTesters(person) {
    const type = person?.gender === "Male" ? "yDNA" : person?.gender === "Female" ? "mtDNA" : "";
    if (!type || !person?.wtid) return [];
    const tests = await connectedTests(person.wtid);
    return [...new Set(tests.filter((test) => test.dna_type === type).map((test) => test.taker?.Name).filter(Boolean))];
  }

  /**
   * The other test-takers connected to the profile (its "DNA Connections"), so "who could test"
   * doesn't read as if no one has (Murray, Chicoine_dit_Henley-1, 2026-10-05: 15 autosomal).
   */
  async function otherTestersNote(person) {
    if (!person?.wtid) return "";
    const lineType = person.gender === "Male" ? "yDNA" : person.gender === "Female" ? "mtDNA" : "";
    const takers = new Map();
    for (const test of await connectedTests(person.wtid)) {
      const name = test.taker?.Name;
      if (name && test.dna_type !== lineType) takers.set(name, [...(takers.get(name) || []), test.dna_type]);
    }
    if (!takers.size) return "";
    const names = [...takers.keys()];
    const shown = names.slice(0, 8).join(", ") + (names.length > 8 ? `, and ${names.length - 8} more` : "");
    const autosomalOnly = [...takers.values()].every((types) => types.every((type) => type === "auDNA"));
    return `${names.length} other DNA test-taker${names.length === 1 ? " is" : "s are"} already connected to the profile${
      autosomalOnly ? " by autosomal tests" : ""
    } (its DNA Connections): ${shown}. Autosomal matches can help confirm relationships, but don't follow a single line.`;
  }

  /**
   * A living person's "who could test": the carriers of each of their lines, found from the
   * line's furthest ancestor (Murray Maloney-2332 → William Moloney-741 and Dotsa). Null if
   * no line ancestor is visible.
   */
  async function lineSharersAnswer(rootPerson) {
    const slots = await loadFanSlots(rootPerson.key, 10);
    const root = slots?.[1];
    if (!root) return null;
    const furthest = furthestLineAncestors(slots);
    const sections = [];
    const actions = [];
    let firstOpen = null;
    for (const line of ["y", "mt"]) {
      const entry = furthest[line];
      if (!entry) continue;
      const generations = lineSharersGenerations(entry);
      const tree = await loadDescendantTree(entry.person.wtid, generations);
      if (!tree) continue;
      const testers = await lineTesters(tree.person);
      sections.push(`${lineSharersHeading(root, line, entry)}\n${buildDnaCarrierSummary(tree, "", generations, testers, { brief: true })}`);
      const open = () => openDescendantChart(tree, "dnacarriers");
      firstOpen = firstOpen || open;
      actions.push({ label: `Open ${line === "y" ? "Y-DNA" : "mtDNA"} carriers chart`, onClick: open });
    }
    if (!sections.length) return null;
    firstOpen();
    sections.push("A test only proves a line if each parent-child link on it is right: the DNA confirmed chart shows which are already confirmed.");
    return { message: sections.join("\n\n"), actions, chartOpened: true };
  }

  async function tryHandleDescendantChartPrompt(params, prompt = "") {
    const rootPerson = await resolveDescendantSubjectRoot(params?.descendantPrompt || prompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123.`;
    }
    if (!rootPerson) return "I could not detect a profile person or your logged-in profile to draw a descendant chart for.";
    const generations = Number(params?.generations) || DESCENDANT_CHART_DEFAULT_GENERATIONS;
    try {
      const tree = await loadDescendantTree(rootPerson.key, generations);
      if (params?.mode === "dnacarriers" && (!tree || tree.person?.living)) {
        const shared = await lineSharersAnswer(rootPerson);
        if (shared) return shared;
      }
      if (!tree && params?.mode === "dnacarriers") {
        // A living tester's profile is private to the API (Maloney-2332, live 2026-10-04), and
        // "I couldn't…" would hand the question to the AI, which listed testers instead.
        // A brand-new profile isn't in the API yet either (Paddy, Horkan-26, 2026-10-05).
        return cantLoad(rootPerson, "descendants", {
          assumePrivate: true,
          privateHint: "Ask this about an ancestor instead: the people who carry an ancestor's Y-DNA or mtDNA are the ones who could test for that line.",
        });
      }
      if (!tree) return cantLoad(rootPerson, "descendants");
      const owner = rootPerson?.subjectType === "user" ? "Your" : `${formatSubjectLabel(rootPerson)}'s`;
      const hasDescendants = tree.children.length > 0;
      const open = () => openDescendantChart(tree, params?.mode || "");
      if (hasDescendants) open();
      return {
        message:
          params?.mode === "dnacarriers"
            ? [buildDnaCarrierSummary(tree, owner, generations, await lineTesters(tree.person)), await otherTestersNote(tree.person)].filter(Boolean).join("\n")
            : buildDescendantChartSummary(tree, owner, generations),
        actions: hasDescendants
          ? [{ label: "Open descendant chart", onClick: open }, VISUALS.descmap(tree.person?.wtid || rootPerson.key), VISUALS.explorer(tree.person?.wtid || rootPerson.key)]
          : [],
        table: tableFromTree(`${owner} descendants`, tree),
        chartOpened: hasDescendants,
      };
    } catch (error) {
      return `The descendant chart failed to load (${error?.message || error}).`;
    }
  }

  // Family timeline (2026-10-03): getRelatives for the immediate family, then
  // the children's children; lifespans drawn with d3.
  /** {rows, label} for the family timeline: parents, siblings, spouses, children and grandchildren (two getRelatives calls). */
  async function loadFamilyTimeline(key) {
    const fields = `${FAN_CHART_FIELDS},IsLiving`;
    const [entry] =
      (await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, key, `${fields},marriage_date,marriage_location`, { getParents: 1, getSiblings: 1, getSpouses: 1, getChildren: 1 })) || [];
    if (!entry?.person) return null;
    const childIds = Object.values(entry.person.Children || {}).map((child) => child.Id);
    const grandchildEntries = childIds.length ? (await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, childIds, fields, { getChildren: 1 })) || [] : [];
    const person = entry.person;
    return { rows: buildFamilyTimelineRows(entry, grandchildEntries), label: `${person.RealName || person.Name} (${person.Name})` };
  }

  // Chart buttons for answers (user, 2026-10-03: "the wow things to be the thing that
  // pops up at the appropriate time … make sure there are plenty of links to the wow things").
  // Each loads its own data when clicked, so an answer can offer several at no cost.
  function chartAction(label, open) {
    return {
      label,
      onClick: async () => {
        try {
          const shown = await open();
          if (shown === null || shown?.opened === false) notify(`${label} has no usable data to chart for this profile.`);
        } catch (error) {
          console.warn(`wbe: ${label} failed`, error);
          notify(`${label} couldn't load (${error?.message || error}).`);
        }
      },
    };
  }

  const CHART_MAKERS = {
    // mode: the fan chart's first colouring ("brickwalls" for brick-wall questions).
    // generations: more than the default, for a list that reaches further (up to 8).
    fan: (key, mode = "", label = "Fan chart", generations = "") =>
      chartAction(label, async () => {
        const depth = Math.min(FAN_CHART_MAX_GENERATIONS, Number(generations) || FAN_CHART_DEFAULT_GENERATIONS);
        const slots = await loadFanSlots(key, depth);
        if (!slots[1]) return null;
        return openFanChart(slots, depth, mode);
      }),
    explorer: (key) =>
      chartAction("Family Explorer", async () => {
        const world = await loadFamilyWorld(key);
        if (!world.focusId) throw new Error(`WikiTree returned no profile for ${key}`);
        openFamilyWorld(world);
      }),
    map: (key) =>
      chartAction("Migration map", async () => {
        const slots = await loadFanSlots(key, MIGRATION_MAP_GENERATIONS);
        const migration = buildMigration(slots);
        if (slots[1] && migration.places.length) {
          await showMigrationMapPopup(migration, {
            title: `Migration map: ${slots[1].name || slots[1].wtid} (${slots[1].wtid})`,
            fileBase: `migration-map-${String(slots[1].wtid || "").replace(/[^A-Za-z0-9_-]/g, "")}`,
          });
          return { opened: true };
        }
        return { opened: false };
      }),
    // (the family timeline is now Lifespans' Close family view; saved "timeline" buttons open it)
    timeline: (key) => chartAction("Family lifespans", () => openLifespans(key, { view: "family" })),
    lifespans: (key, label = "Lifespans") => chartAction(label, () => openLifespans(key)),
    lifeline: (key, label = "Life line") => chartAction(label, () => openLifeLine(key)),
    familysize: (key, label = "Family size") => chartAction(label, () => openFamilySize(key)),
    desclives: (key, label = "Descendants' lifespans") => chartAction(label, () => openLifespans(key, { view: "descendants" })),
    names: (key, label = "Name cloud") => chartAction(label, () => openNameCloud(key)),
    calendar: (key, label = "Family calendar") => chartAction(label, () => openFamilyCalendar(key)),
    overview: (key, label = "Tree overview") => chartAction(label, () => openTreeOverview(key)),
    descmap: (key, label = "Descendants' map") => chartAction(label, () => openDescendantMap(key)),
    descendants: (key) =>
      chartAction("Descendant chart", async () => {
        const tree = await loadDescendantTree(key);
        if (!tree) return null;
        return openDescendantChart(tree);
      }),
  };

  // Header buttons that jump from one chart to another for the person at its centre.
  const CHART_LINKS = {
    fan: ["Fan", "This person's ancestors as a fan chart"],
    explorer: ["Explorer", "Family Explorer: zoom in for children, out for parents"],
    descendants: ["Descendants", "This person's descendants as a sunburst"],
    timeline: ["Family", "Lifespans of this person's close family: parents, spouses, siblings, children"],
    lifespans: ["Lifespans", "Every ancestor's life as a bar, and how many were alive each year"],
    lifeline: ["Life line", "This person's life on one line: family events and the history around them"],
    familysize: ["Family size", "How many children each ancestral couple had, generation by generation"],
    desclives: ["Lifespans", "Every descendant's life as a bar, generation by generation"],
    names: ["Names", "The first names and surnames among these ancestors, as a cloud"],
    calendar: ["Calendar", "Ancestors' birthdays and death days round the year, with today marked"],
    overview: ["Overview", "A dashboard of these ancestors: completeness, origins, surnames, lifespans"],
    descmap: ["Map", "Where these descendants were born, on a world map"],
  };
  function chartLinks(...names) {
    return names.map((name) => ({ label: CHART_LINKS[name][0], title: CHART_LINKS[name][1], open: (key) => VISUALS[name](key).onClick() }));
  }

  // Each button records which chart it opens, for whom, so chat history can rebuild it after a reload.
  const VISUALS = Object.fromEntries(
    Object.entries(CHART_MAKERS).map(([name, make]) => [
      name,
      (key, ...args) => ({ ...make(key, ...args), actionType: "chart", chart: name, chartKey: key, chartArgs: args.map((arg) => String(arg ?? "")) }),
    ])
  );

  /** Rebuilds a saved chart button ({chart, chartKey, chartArgs}), or null. */
  function rebuildChartAction(entry) {
    const make = VISUALS[entry?.chart];
    if (!make || !entry.chartKey) return null;
    const action = make(entry.chartKey, ...(Array.isArray(entry.chartArgs) ? entry.chartArgs : []));
    return entry.label ? { ...action, label: entry.label } : action;
  }

  /** The chart buttons that suit an answer about `kind` ("ancestors", "descendants", "family"), the first one leading. */
  function visualActions(key, kind) {
    if (!key) return [];
    const order = {
      ancestors: ["fan", "explorer", "map", "lifespans", "names", "calendar", "timeline"],
      descendants: ["descendants", "explorer", "descmap", "desclives", "timeline"],
      family: ["timeline", "explorer", "fan", "descendants"],
    }[kind];
    return (order || []).map((name) => VISUALS[name](key));
  }

  /** Adds family chart buttons to an answer (string or {message}), keeping any actions it already has. */
  function withFamilyVisuals(answer, key) {
    const charts = visualActions(key, "family");
    if (!answer || !charts.length) return answer;
    const result = typeof answer === "string" ? { message: answer } : answer;
    if (typeof result !== "object" || !result.message) return answer;
    const own = Array.isArray(result.actions) ? result.actions : result.action ? [result.action] : [];
    const { action, ...rest } = result;
    return { ...rest, actions: [...own, ...charts] };
  }

  // Life line (2026-10-04): one person's life on a single line, from the same close-family load.
  async function openLifeLine(key, loaded = null) {
    const family = loaded || (await loadFamilyTimeline(key));
    if (!family) return null;
    const line = buildLifeLine(family.rows);
    if (line) {
      showLifeLinePopup(line, { title: `Life line: ${family.label}`, links: chartLinks("timeline", "lifespans", "fan", "explorer") });
    }
    return { line, family };
  }

  async function tryHandleFamilyTimelinePrompt(params, prompt = "") {
    const { key, error } = await resolveOwnerKey(String(params?.owner || "").trim(), prompt);
    if (error) return error;
    if (params?.lifeLine) {
      try {
        const shown = await openLifeLine(key);
        if (!shown) return cantLoad(key);
        return {
          message: buildLifeLineSummary(shown.line, shown.family.label),
          actions: shown.line ? [VISUALS.lifeline(key, "Open life line"), VISUALS.timeline(key), VISUALS.lifespans(key)] : [VISUALS.timeline(key)],
          table: tableFromLifespanRows(`Close family of ${shown.family.label}`, shown.family.rows),
          chartOpened: !!shown.line,
        };
      } catch (err) {
        return `The life line failed to load (${err?.message || err}).`;
      }
    }
    try {
      const loaded = await loadFamilyTimeline(key);
      if (!loaded) return cantLoad(key);
      const { rows, label } = loaded;
      const owner = params?.owner === "me" ? "Your" : `${label}'s`;
      const hasRows = rows.some((row) => row.role !== "self" && row.birth);
      const open = () => openLifespans(key, { view: "family", familyTimeline: loaded });
      if (hasRows) await open();
      return {
        message: buildFamilyTimelineSummary(rows, owner),
        actions: hasRows ? [{ label: "Open family lifespans", onClick: open }] : [],
        table: tableFromLifespanRows(`${owner} close family`, rows),
        chartOpened: hasRows,
      };
    } catch (err) {
      return `The family timeline failed to load (${err?.message || err}).`;
    }
  }

  async function tryHandleDnaPrompt(params, prompt = "") {
    const { key, error } = await resolveOwnerKey(String(params?.owner || "").trim(), prompt);
    if (error) return error;
    const call = async (postData) => {
      const [result] = (await WikiTreeAPI.postToAPI({ appId: WBE_CHAT_APP_ID, ...postData })) || [];
      if (result?.status && result.status !== 0 && result.status !== "0") throw new Error(String(result.status));
      return result || {};
    };
    try {
      const label = key;
      if (params?.kind === "connectedTests") {
        const result = await call({ action: "getConnectedDNATestsByProfile", key });
        return buildConnectedTestsAnswer(result.dnaTests || [], label);
      }
      const taken = await call({ action: "getDNATestsByTestTaker", key });
      const tests = taken.dnaTests || [];
      if (params?.kind === "haplogroup") return buildHaplogroupAnswer(tests, label, params?.dnaType || "");
      if (params?.kind === "connectedProfiles") {
        const test = pickTakerTest(tests, params?.dnaType);
        if (!test) return `${label} has no ${params?.dnaType || "DNA"} test recorded on WikiTree.`;
        const result = await call({ action: "getConnectedProfilesByDNATest", key, dna_id: test.dna_id });
        return buildConnectedProfilesAnswer(result.connections || [], label, test);
      }
      if (params?.kind === "map") {
        // The profiles connected to one test, on the world map by birthplace (2026-10-04).
        let test = pickTakerTest(tests, params?.dnaType);
        let takerKey = key;
        if (!test) {
          // Not a tester: use a test of that type connected to this profile (an ancestor of
          // a tester, say), so the chart-bar button works along a tested line.
          const connected = await call({ action: "getConnectedDNATestsByProfile", key });
          test = pickTakerTest(connected.dnaTests || [], params?.dnaType);
          takerKey = test?.taker?.Name || "";
        }
        if (!test || !takerKey) return buildNoDnaMapTestAnswer(label, params?.dnaType || "");
        const result = await call({ action: "getConnectedProfilesByDNATest", key: takerKey, dna_id: test.dna_id });
        const ids = (result.connections || []).map((connection) => connection.Id).filter(Boolean);
        const [, , found] = ids.length
          ? await fetchPeoplePaged(WBE_CHAT_APP_ID, ids, "Id,Name,RealName,FirstName,LastNameAtBirth,Gender,BirthDate,DeathDate,BirthLocation,Father,Mother", { limit: 100 })
          : [null, null, {}];
        // (parent → child within the set, so the map shows the family's moves)
        const forest = buildForest(found, label);
        const people = [];
        const collect = (node) => node.children.forEach((child) => people.push(child.person) && collect(child));
        collect(forest);
        await loadGeocodeCache();
        const migration = buildDescendantMigration(forest);
        const message = buildDnaMapSummary(people, takerKey, test, migration);
        if (!migration.places.length) return message;
        const testWord = test.dna_type === "yDNA" ? "Y-DNA" : test.dna_type === "mtDNA" ? "mtDNA" : "DNA";
        const open = () =>
          showMigrationMapPopup(migration, {
            title: `${testWord} map: profiles connected to ${takerKey}'s test`,
            fileBase: `dna-map-${String(key).replace(/[^A-Za-z0-9_-]/g, "")}`,
            peopleWord: "connected profile",
            arcHint: "Parent → child born in a new place",
          });
        open();
        return { message, actions: [{ label: "Open the map", onClick: open }], chartOpened: true };
      }
      return buildDnaTakerAnswer(tests, label);
    } catch (err) {
      return /limit/i.test(err?.message || "")
        ? "WikiTree's API says its request limit was exceeded. Please try again in a little while."
        : `I couldn't get DNA information for ${key}: ${err?.message || err}`;
    }
  }

  async function tryHandleChildrenWithChildrenPrompt(params, prompt = "") {
    const { key, error } = await resolveOwnerKey(String(params?.target || "").trim(), prompt);
    if (error) return error;
    const nameOf = relativeNameOf;
    const [entry] = (await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, key, "Id,Name,RealName,Derived.ShortName,BirthDate,Gender", { getChildren: 1 })) || [];
    const owner = entry?.person;
    if (!owner) return cantLoad(key);
    const children = Object.values(owner.Children || {})
      .filter((child) => !params?.gender || child?.Gender === params.gender)
      .sort((a, b) =>
      String(a?.BirthDate || "9999").localeCompare(String(b?.BirthDate || "9999"))
    );
    const married = params?.kind === "spouses";
    const list = married ? "Spouses" : "Children";
    const grandItems = children.length
      ? await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, children.map((child) => child.Id), "Id,Name", { [`get${list}`]: 1 })
      : [];
    const countById = new Map(
      (grandItems || []).map((item) => [Number(item?.person?.Id), Object.keys(item?.person?.[list] || {}).length])
    );
    if (married) {
      const rows = children.map((child) => ({ label: nameOf(child), spouseCount: countById.get(Number(child.Id)) || 0 }));
      return withFamilyVisuals(buildChildrenMarriedAnswer(nameOf(owner), rows, { without: Boolean(params?.without) }), owner.Name);
    }
    const rows = children.map((child) => ({ label: nameOf(child), childCount: countById.get(Number(child.Id)) || 0 }));
    return withFamilyVisuals(buildChildrenWithChildrenAnswer(nameOf(owner), rows, { without: Boolean(params?.without) }), owner.Name);
  }

  async function tryHandleOutlivedPrompt(params, prompt = "") {
    const { key, error } = await resolveOwnerKey(String(params?.target || "").trim(), prompt);
    if (error) return error;
    const nameOf = relativeNameOf;
    const [entry] = (await WikiTreeAPI.getRelatives(
      WBE_CHAT_APP_ID,
      key,
      "Id,Name,RealName,Derived.ShortName,BirthDate,DeathDate,IsLiving",
      { getChildren: 1 }
    )) || [];
    const owner = entry?.person;
    if (!owner) return cantLoad(key);
    const children = Object.values(owner.Children || {})
      .sort((a, b) => String(a?.BirthDate || "9999").localeCompare(String(b?.BirthDate || "9999")))
      .map((child) => ({ label: nameOf(child), death: child?.DeathDate || "", living: Number(child?.IsLiving) === 1 }));
    return withFamilyVisuals(
      buildOutlivedAnswer({
        parent: { label: nameOf(owner), death: owner.DeathDate || "" },
        children,
        mode: params?.mode === "after" ? "after" : "before",
      }),
      owner.Name
    );
  }

  async function tryHandleRelativeFactPrompt(params, prompt = "") {
    const { key, error } = await resolveOwnerKey(String(params?.owner || "").trim(), prompt);
    if (error) return error;
    const nameOf = relativeNameOf;
    if (params?.relationRaw === "self") {
      const [, , people] = await WikiTreeAPI.getPeople(
        WBE_CHAT_APP_ID,
        [key],
        "Id,Name,RealName,Derived.ShortName,LastNameAtBirth,BirthDate,BirthLocation,DeathDate,DeathLocation"
      );
      const person = Object.values(people || {}).find((entry) => entry?.Name);
      if (!person) return cantLoad(key);
      return buildRelativeFactAnswer([person], params?.fact, nameOf);
    }
    const { list, gender, grand } = relationSelector(params?.relationRaw);
    const relativeFields = `Id,Name,RealName,Derived.ShortName,Gender,LastNameAtBirth,BirthDate,BirthLocation,DeathDate,DeathLocation${
      list === "Spouses" ? ",marriage_date" : ""
    }`;
    const [entry] = (await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, key, relativeFields, { [`get${list}`]: 1 })) || [];
    const owner = entry?.person;
    if (!owner) return cantLoad(key);
    let relatives = Object.values(owner[list] || {});
    if (grand) {
      // Two steps along the same list: children's children, parents' parents (N4).
      const stepIds = relatives.map((relative) => relative?.Id).filter(Boolean);
      const grandItems = stepIds.length
        ? (await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, stepIds, relativeFields, { [`get${list}`]: 1 })) || []
        : [];
      const byId = new Map();
      grandItems.forEach((item) =>
        Object.values(item?.person?.[list] || {}).forEach((grandRelative) => byId.set(String(grandRelative?.Id), grandRelative))
      );
      relatives = [...byId.values()];
    }
    let people = relatives.filter((person) => !gender || person?.Gender === gender);
    if (params?.ordinal && list === "Spouses") people = pickSpouseByOrdinal(people, params.ordinal);
    if (params?.fact === "ageAtDeath" || params?.fact === "ageGap") {
      if (!people.length) return `WikiTree has no ${params?.ordinal ? "such " : ""}${String(params?.relationRaw || "relative")} recorded for ${nameOf(owner)}.`;
      return params.fact === "ageAtDeath" ? buildRelativeAgeAtDeathAnswer(people, nameOf) : buildAgeGapAnswer(owner, people, nameOf);
    }
    if (params?.fact === "twins") return buildTwinsAnswer(nameOf(owner), people, nameOf);
    if (params?.fact === "older" || params?.fact === "younger") {
      return buildAgeComparisonAnswer(owner, people, params.fact, nameOf);
    }
    if (params?.pick) {
      return buildRelativePickAnswer({
        ownerLabel: nameOf(owner),
        relationRaw: params.relationRaw,
        people,
        pick: params.pick,
        labelOf: nameOf,
      });
    }
    if (!people.length) {
      return `WikiTree has no ${String(params?.relationRaw || "relative")} recorded for ${nameOf(owner)}.`;
    }
    if (params?.fact === "name") {
      const relationWord = String(params?.relationRaw || "relative");
      const answer = buildRelativeFactAnswer(people, "name", nameOf);
      return withFamilyVisuals(
        people.length === 1 ? `${nameOf(owner)}'s ${relationWord}: ${answer}` : `${nameOf(owner)}'s ${relationWord}:\n${answer}`,
        owner.Name
      );
    }
    return buildRelativeFactAnswer(people, params?.fact, nameOf);
  }

  async function tryHandleProfileSourcesPrompt(params, prompt = "") {
    const targetName = String(params?.target || "").trim();
    let key = "";
    if (!targetName) {
      key = getProfileSubjectRoot()?.wtId || getProfileSubjectRoot()?.key || "";
      if (!key) return "Open a profile page first, or name the person (for example Smith-123).";
    } else {
      const found = await resolveConnectionTargetPerson(targetName, prompt);
      key = found?.Name || found?.Id || "";
      if (!key) {
        return `I couldn't identify which profile you meant by "${targetName}". Try a WikiTree ID like Name-123, or a more specific name.`;
      }
    }
    const [profile] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, key, "Id,Name,RealName,Bio", {
      bioFormat: "wiki",
      resolveRedirect: 1,
    });
    if (!profile?.Name) return cantLoad(key);
    return buildSourcesAnswer({
      label: `${profile.RealName || profile.Name} (${profile.Name})`,
      bio: profile.Bio || profile.bio || "", // the API returns "bio"
      countOnly: Boolean(params?.countOnly),
    });
  }

  async function tryHandleProfileDuplicatesPrompt(params, prompt = "") {
    const targetName = String(params?.target || "").trim();
    let key = "";
    if (!targetName) {
      key = getProfileSubjectRoot()?.wtId || getProfileSubjectRoot()?.key || "";
      if (!key) return "Open a profile page first, or name the person (for example Smith-123).";
    } else {
      const found = await resolveConnectionTargetPerson(targetName, prompt);
      key = found?.Name || found?.Id || "";
      if (!key) {
        return `I couldn't identify which profile you meant by "${targetName}". Try a WikiTree ID like Name-123, or a more specific name.`;
      }
    }
    const response = await WikiTreeAPI.getPerson(WBE_CHAT_APP_ID, key, "Id,Name,RealName,LastNameAtBirth");
    const person = response?._data || response || {};
    if (!person.Id || !person.Name) {
      return cantLoad(key);
    }
    try {
      // WikiTree pages go through wwwWikiTree (right domain, appId), not a bare fetch.
      return await runDuplicateCheck(WBE_CHAT_APP_ID, person, (url) => {
        const [path, query = ""] = url.split("?");
        return getWikiTreePage("Chat", path, query);
      });
    } catch (error) {
      console.error("wbe: duplicate check failed", error);
      return `The duplicate check failed (${error?.message || error}).`;
    }
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
        { ancestors: generation, minGeneration: params?.includeUpTo ? 1 : generation, limit: 1000 }
      );

      const candidates = Object.values(people || {})
        .filter((profile) => {
          const degree = Number(profile?.Meta?.Degrees);
          if (!Number.isFinite(degree)) return true;
          return params?.includeUpTo ? degree >= 1 && degree <= generation : degree === generation;
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
        actions: [VISUALS.lifespans(rootPerson.wtId || rootPerson.key, "Lifespans chart"), VISUALS.fan(rootPerson.wtId || rootPerson.key)],
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
    const missingParent = String(params?.missingParent || "").trim();
    const missingParentPhrase = getMissingParentPhrase(missingParent);
    const ageAtDeath = params?.ageAtDeath || null;
    const ageAtDeathPhrase = getAgeAtDeathPhrase(ageAtDeath);
    const filterPhrase = [locationPhrase, datePhrase, missingParentPhrase, ageAtDeathPhrase].filter(Boolean).join(" ")
      // "children who died before 1900", not "children died before 1900" (live R6 recheck).
      .replace(/^died\b/, "who died");
    const displayRelationshipLabel = filterPhrase
      ? `${baseDisplayRelationshipLabel} ${filterPhrase}`
      : baseDisplayRelationshipLabel;
    // "Tabler-141's brick walls" / "Tabler-141's ancestors with a missing parent"
    // → "Tabler-141's ancestors", so the subject is found.
    const subjectPrompt = missingParent
      ? String(prompt || "")
          .trim()
          .replace(/[.!?]+$/g, "")
          .replace(/\b(?:brick[\s-]*walls?|dead[\s-]*ends?)$/i, "ancestors")
          .replace(
            /\s+(?:who\s+)?(?:have|has|with|are\s+missing)\s+(?:no|a\s+missing|an?\s+unknown|missing)\s+(?:parents?|fathers?|mothers?)$/i,
            ""
          )
          .replace(/^(?:(?:which|who)\s+of|(?:who|what)\s+are|show|list|find)\s+(?:(?:the|all)\s+)?/i, "")
      : ageAtDeath
      ? String(prompt || "")
          .trim()
          .replace(/(\bancestors?)\b.*$/i, "$1")
          .replace(/^(?:which|who)\s+of\s+/i, "")
      : prompt;
    const rootPerson = await resolveAncestorSubjectRoot(params?.subjectText || subjectPrompt);
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

    const wantsPlaceAnswer = Boolean(params?.placeSummary || params?.emigrated);
    if (cachedAncestorRows && !wantsPlaceAnswer && !params?.pick && !params?.countMode) {
      const ancestors = sortKinRows(
        filterRowsByAgeAtDeath(
          filterRowsByMissingParent(
            filterRowsByLocationAndDate(cachedAncestorRows.rows, {
              normalizedLocation,
              locationField,
              dateField,
              dateDirection,
              dateValue,
            }),
            missingParent
          ),
          ageAtDeath
        ),
        includeUpTo
      );
      const ancestorCacheMissingAhnens = cachedAncestorRows.rows.some(
        (row) =>
          row?.ahnen === undefined ||
          row?.fatherName === undefined ||
          row?.motherName === undefined ||
          (missingParent && row?.hasFather === undefined)
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

        const cachedResult = buildKinListResult({
          details: params?.details || [],
          order: params?.order || "",
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
            missingParent,
            ageAtDeath,
            locationField,
            dateField,
            dateDirection,
            dateValue,
          },
        });
        return withDefaultGenerationNote(cachedResult, {
          usedDefaultGeneration: usedDefaultGeneration && !filterPhrase && !params?.details?.length,
          rows: ancestors,
          generation,
          rootWtId: rootPerson.wtId,
          isUser: rootPerson?.subjectType === "user",
        });
      }
    }

    try {
      const collectedPeople = {};
      const [, , peopleMap] = await fetchPeoplePaged(
        WBE_CHAT_APP_ID,
        rootPerson.key,
        "Id,Name,FirstName,MiddleName,RealName,Derived.ShortName,Derived.LongNamePrivate,Derived.BirthNamePrivate,LastNameAtBirth,LastNameCurrent,LastNameOther,Father,Mother,BirthDate,BirthDateDecade,DeathDate,DeathDateDecade,BirthLocation,DeathLocation,Gender,Meta",
        // Every generation: the ahnen walk from the root needs the people in
        // between (live C4, 2026-10-03: generation 7 alone found nobody). The
        // root comes in the same response: private parents get per-response
        // negative Ids, so a separately fetched root's Father -1 named someone
        // else (live D13, 2026-10-03: 166 of 218 ancestors).
        { ancestors: generation, minGeneration: 0, limit: 1000 }
      );
      const rootProfile = findAncestorRootProfile(peopleMap, rootPerson.key);

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

      if (wantsPlaceAnswer) {
        return buildAncestorPlaceAnswer(allAncestors, params, {
          subjectLabel,
          rootPerson,
          label: baseDisplayRelationshipLabel,
        });
      }

      const ancestors = filterRowsByAgeAtDeath(
        filterRowsByMissingParent(
          filterRowsByLocationAndDate(allAncestors, {
            normalizedLocation,
            locationField,
            dateField,
            dateDirection,
            dateValue,
          }),
          missingParent
        ),
        ageAtDeath
      );
      const sortedAncestors = sortKinRows(ancestors, includeUpTo);

      if (!sortedAncestors.length) {
        if (missingParent && allAncestors.length) {
          const recorded =
            missingParent === "father"
              ? "a father"
              : missingParent === "mother"
              ? "a mother"
              : missingParent === "both"
              ? "at least one parent"
              : "both parents";
          return `All ${allAncestors.length} ${baseDisplayRelationshipLabel} for ${subjectLabel} have ${recorded} recorded.`;
        }
        if (ageAtDeath && allAncestors.length) {
          const withAges = allAncestors.filter((row) =>
            Number.isFinite(computeAgeAtDeathYears(row.birth, row.death))
          ).length;
          return `None of the ${allAncestors.length} ${baseDisplayRelationshipLabel} for ${subjectLabel} ${ageAtDeathPhrase.replace(
            /^who /,
            ""
          )} (${withAges} have both birth and death dates).`;
        }
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

      if (params?.pick) {
        return buildAncestorPickAnswer(sortedAncestors, params.pick, {
          subjectLabel,
          rootPerson,
          locationPhrase,
          total: allAncestors.length,
          treeTakenAsAncestors: Boolean(params?.treeTakenAsAncestors),
          askedRepeats: Boolean(params?.repeats),
        });
      }

      // One generation has 2^g slots, so say how complete it is (C4).
      const possible = 2 ** generation;
      const showCompleteness = !includeUpTo && !filterPhrase && generation >= 2 && generation <= 20;
      const owner = rootPerson?.subjectType === "user" ? "your" : `${subjectLabel}'s`;
      const completeness = showCompleteness
        ? `${sortedAncestors.length} of ${owner} ${possible.toLocaleString()} possible ${baseDisplayRelationshipLabel} (${Math.round(
            (100 * sortedAncestors.length) / possible
          )}%) are on WikiTree.`
        : "";
      if (completeness && params?.countMode) {
        const listResult = buildKinListResult({
          details: params?.details || [],
          order: params?.order || "",
          rows: sortedAncestors,
          displayRelationshipLabel,
          subjectLabel,
          rootDisplayName: rootPerson.displayName,
          rootWtId: rootPerson.wtId,
          includeUpTo,
          tableFactory: makeAncestorProfileTable,
          treeAppKind: "ancestors",
        });
        return { ...listResult, message: completeness, inlineMore: null };
      }

      const listResult = buildKinListResult({
        details: params?.details || [],
        order: params?.order || "",
        rows: sortedAncestors,
        completenessNote: completeness,
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
          missingParent,
          ageAtDeath,
          locationField,
          dateField,
          dateDirection,
          dateValue,
        },
      });
      return withDefaultGenerationNote(listResult, {
        usedDefaultGeneration: usedDefaultGeneration && !filterPhrase && !params?.details?.length,
        rows: sortedAncestors,
        generation,
        rootWtId: rootPerson.wtId,
        isUser: rootPerson?.subjectType === "user",
      });
    } catch (error) {
      console.warn("wbe: ancestor fetch failed", { generation, key: rootPerson?.key, error: error?.message || error });
      // Elaine (2.19.0.8, 2026-10-09): a 25-generation question came back as the
      // 8-generation tree overview, most likely because this fetch failed and
      // the AI picked something else. Try 10 generations before giving up.
      if (generation > 10 && !params?.shortenedFrom) {
        const shorter = await tryHandleAncestorListPrompt({ ...params, generation: 10, shortenedFrom: generation }, prompt);
        if (shorter && typeof shorter === "object") {
          const note = `WikiTree didn't return all ${generation} generations this time, so this covers 10. Try again for more.`;
          return { ...shorter, message: [shorter.message, note].filter(Boolean).join("\n") };
        }
        if (typeof shorter === "string" && !/^I couldn't list\b/.test(shorter)) return shorter;
      }
      return `I couldn't list ${relationshipLabel} for ${subjectLabel}. Error: ${error?.message || "unknown error"}`;
    }
  }

  async function tryHandleDescendantListPrompt(params, prompt = "") {
    const generation = Number(params?.generation);
    if (!Number.isFinite(generation) || generation < 1) {
      return null;
    }

    const livingOnly = Boolean(params?.livingOnly) || /\bliving\b/i.test(prompt);
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
    const ageAtDeath = params?.ageAtDeath || null;
    const ageAtDeathPhrase = getAgeAtDeathPhrase(ageAtDeath);
    const filterPhrase = [livingOnly ? "marked living on WikiTree" : "", locationPhrase, datePhrase, ageAtDeathPhrase].filter(Boolean).join(" ")
      // "children who died before 1900", not "children died before 1900" (live R6 recheck).
      .replace(/^died\b/, "who died");
    const displayRelationshipLabel = filterPhrase
      ? `${baseDisplayRelationshipLabel} ${filterPhrase}`
      : baseDisplayRelationshipLabel;
    const rootPerson = await resolveDescendantSubjectRoot(params?.subjectText || prompt);
    if (rootPerson?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${rootPerson.unresolvedName}". Try a WikiTree ID like Name-123, or a more specific name.`;
    }
    if (!rootPerson) {
      return "I could not detect a profile person or your logged-in profile to use as the starting point.";
    }

    const subjectLabel = formatSubjectLabel(rootPerson);
    // "How many descendants…?": the count by generation leads, the table follows.
    const subjectVerbForCount = rootPerson?.subjectType === "user" ? "have" : "has";
    const withDescendantCount = (result, rows) =>
      (params?.countMode || /^\s*how\s+many\b/i.test(String(prompt || ""))) && !filterPhrase && result && typeof result === "object"
        ? {
            ...result,
            message: descendantCountMessage(rows, subjectLabel, subjectVerbForCount, includeUpTo ? generation : 0),
            inlineMore: null,
          }
        : result;

    const cachedDescendantRows = livingOnly ? null : filterCachedKinRows({
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
        filterRowsByAgeAtDeath(
          filterRowsByLocationAndDate(cachedDescendantRows.rows, {
            normalizedLocation,
            locationField,
            dateField,
            dateDirection,
            dateValue,
          }),
          ageAtDeath
        ),
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

        if (params?.childPick) return buildChildPickAnswer(descendants, params.childPick, subjectLabel);
        return withDescendantCount(buildKinListResult({
          details: params?.details || [],
          order: params?.order || "",
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
            ageAtDeath,
          },
        }), descendants);
      }
    }

    try {
      const collectedPeople = {};
      const [, , peopleMap] = await fetchPeoplePaged(
        WBE_CHAT_APP_ID,
        rootPerson.key,
        "Id,Name,FirstName,MiddleName,RealName,Derived.ShortName,Derived.LongNamePrivate,Derived.BirthNamePrivate,LastNameAtBirth,LastNameCurrent,LastNameOther,BirthDate,BirthDateDecade,DeathDate,DeathDateDecade,BirthLocation,DeathLocation,Gender,IsLiving,Meta",
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

      const descendants = descendantProfiles.filter((profile) => !livingOnly || Number(profile.IsLiving) === 1).map((profile) =>
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
        filterRowsByAgeAtDeath(
          filterRowsByLocationAndDate(descendants, {
            normalizedLocation,
            locationField,
            dateField,
            dateDirection,
            dateValue,
          }),
          ageAtDeath
        ),
        includeUpTo
      );

      if (!sortedDescendants.length && livingOnly) {
        return `No descendants of ${subjectLabel} within ${generation} generations are marked living in the WikiTree profiles available to you. Private profiles may hide their living status.`;
      }
      if (!sortedDescendants.length) {
        // Say what is actually true rather than echoing the request back
        // ("I found no 10 generations of descendants..."). Three distinct cases:
        // descendants exist but a filter excluded them; the person has no
        // children at all; or nothing sits at one exact requested generation.
        const subjectVerb = rootPerson?.subjectType === "user" ? "have" : "has";
        if (ageAtDeath && descendants.length && !normalizedLocation && !dateField) {
          const withAges = descendants.filter((row) => Number.isFinite(computeAgeAtDeathYears(row.birth, row.death)))
            .length;
          return `None of the ${descendants.length} ${baseDisplayRelationshipLabel} for ${subjectLabel} ${ageAtDeathPhrase.replace(
            /^who /,
            ""
          )} (${withAges} have both birth and death dates).`;
        }
        if (descendants.length) {
          const count = descendants.length;
          // "None of the 7 children for Ellen were born in Nelson." (live R4 recheck)
          const what = filterPhrase.replace(/^who /, "").replace(/^born\b/, "were born").replace(/^in\b/, "were in");
          if (what) return `None of the ${count} ${baseDisplayRelationshipLabel} for ${subjectLabel} ${what}.`;
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

      if (params?.childPick) return buildChildPickAnswer(sortedDescendants, params.childPick, subjectLabel);
      return withDescendantCount(buildKinListResult({
        details: params?.details || [],
        order: params?.order || "",
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
          ageAtDeath,
        },
      }), sortedDescendants);
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
    familyVisualActions: (key) => visualActions(key, "family"),
    rebuildChartAction,
    personVisualActions: (key) => (key ? [VISUALS.explorer(key), VISUALS.fan(key)] : []),
    tryHandleSpouseListPrompt,
    tryHandlePersonAgeAtDeathPrompt,
    tryHandlePersonAgeAtChildBirthPrompt,
    tryHandleProfileDuplicatesPrompt,
    tryHandlePersonBurialPrompt,
    tryHandleFindBioRelativesPrompt,
    tryHandleProfileFactPrompt,
    tryHandleDnaPrompt,
    tryHandleFanChartPrompt,
    tryHandleFractalTreePrompt,
    tryHandleFamilyWorldPrompt,
    tryHandleDescendantChartPrompt,
    tryHandleFamilyTimelinePrompt,
    tryHandleMigrationMapPrompt,
    tryHandleLifespansPrompt,
    tryHandleNameCloudPrompt,
    tryHandleFamilyCalendarPrompt,
    tryHandleAgesPrompt,
    tryHandleTreeOverviewPrompt,
    tryHandleFamilyMatrixPrompt,
    tryHandleProfileSourcesPrompt,
    tryHandlePersonMarriagePrompt,
    tryHandleRelativeFactPrompt,
    tryHandleTwinsPrompt,
    tryHandleChildrenWithChildrenPrompt,
    tryHandleOutlivedPrompt,
    tryHandleAncestorAverageAgePrompt,
    tryHandleAncestorListPrompt,
    tryHandleDescendantListPrompt,
    tryHandleProfileFamilyConnectionPrompt,
  };
}

function knownMarriageDate(spouse) {
  const value = String(spouse?.marriage_date || spouse?.MarriageDate || "").trim();
  return value && !/^0000/.test(value) ? value : "";
}

const ORDINAL_WORDS = { 1: "first", 2: "second", 3: "third", 4: "fourth", last: "last" };

/**
 * "Ellen's first husband": spouses in marriage order (birth order when no marriage
 * date), and a warning when missing dates make the order a guess.
 */
export function buildOrdinalSpouseAnswer(spouses, ordinal, relationshipLabel, personLabel) {
  const singular = { wives: "wife", husbands: "husband" }[relationshipLabel] || "spouse";
  const word = ORDINAL_WORDS[ordinal] || String(ordinal);
  const sortKey = (spouse) => spouse.marriageDate || spouse.birth || "9999";
  const ordered = [...spouses].sort((a, b) => String(sortKey(a)).localeCompare(String(sortKey(b))));
  const pick = ordinal === "last" ? ordered[ordered.length - 1] : ordered[Number(ordinal) - 1];
  if (!pick) {
    return `${personLabel} has ${ordered.length} ${ordered.length === 1 ? singular : relationshipLabel} on WikiTree, so there is no ${word} one.`;
  }
  const name = formatPreviewName(pick);
  const married = pick.marriageDate
    ? `, married ${formatPreviewDate(pick.marriageDate)}${pick.marriageLocation ? ` in ${pick.marriageLocation}` : ""}`
    : "";
  if (ordered.length === 1) {
    return `${personLabel} has only one ${singular} on WikiTree: ${name} (${pick.wtid})${married}.`;
  }
  const undated = ordered.filter((spouse) => !spouse.marriageDate).length;
  const caveat = undated
    ? ` ${undated} of the ${ordered.length} marriages ${undated === 1 ? "has" : "have"} no date, so the order uses birth dates where needed and may be wrong.`
    : "";
  const all = ordered
    .map((spouse) => `- ${formatPreviewName(spouse)} (${spouse.wtid})${spouse.marriageDate ? ` [m. ${formatPreviewDate(spouse.marriageDate)}]` : ""}`)
    .join("\n");
  return `${personLabel}'s ${word} ${singular} was ${name} (${pick.wtid})${married}.${caveat}\nAll ${ordered.length} in marriage order:\n${all}`;
}
