/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "jquery-ui/ui/widgets/dialog";
import "jquery-ui-dist/jquery-ui.css";
import { getProfilePersonInfo, getUserWtId } from "../../core/common";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { collectExcludedMatchIds, filterExcludedDuplicatePairs } from "./duplicates_page_state";

const PANEL_ID = "wbe-duplicates-panel";
const COMPARE_DIALOG_ID = "comparison-dialog";
const DATE_STATUS_LABEL = {
  before: "before",
  after: "after",
  guess: "about",
  certain: "",
  "": "",
};

shouldInitializeFeature("duplicates").then(async (result) => {
  if (!result) {
    return;
  }

  import("./duplicates.css");
  await init();
});

async function init() {
  const options = await getFeatureOptions("duplicates");
  const profile = getProfilePersonInfo();
  const wtId = profile?.Name || $("#pageData").attr("data-mnamedb");
  const currentUserWtId = getUserWtId() || "";

  if (!wtId) {
    return;
  }

  const privacyMatch = $("span.privacy[class*='privacy--']")
    .attr("class")
    ?.match(/privacy--(\d+)/);
  const privacyLevel = privacyMatch ? parseInt(privacyMatch[1], 10) : null;
  if (privacyLevel !== null && privacyLevel < 40) {
    return;
  }

  const panel = mountPanel();
  renderLoading(panel, wtId, options || {});

  try {
    const data = await fetchDuplicatesData(wtId, options?.includeResolvedDebug);
    renderData(panel, wtId, data, options || {}, currentUserWtId);
  } catch (error) {
    console.error("[duplicates] fetch error", error);
    renderError(panel, wtId, error?.message || "Failed to load duplicate data.", options || {});
  }
}

async function fetchDuplicatesData(wtId, includeResolved) {
  const response = await chrome.runtime.sendMessage({
    action: "duplicatesRead",
    requestedWikiTreeId: wtId,
    includeResolved: Boolean(includeResolved),
  });

  if (!response?.success) {
    throw new Error(response?.error || "Failed to load duplicate data.");
  }

  return response.data;
}

function mountPanel() {
  $(`#${PANEL_ID}`).remove();

  const panel = $("<div></div>").attr("id", PANEL_ID).addClass("wbe-duplicates-panel wbe");

  // Target: the .col-lg-8 inside section#Matches that contains the "Matches and Merges" heading.
  const matchesSection = $("section#Matches").first();
  if (matchesSection.length) {
    const matchesCol = matchesSection
      .find(".col-lg-8")
      .filter((_, el) => $(el).find("h2").text().toLowerCase().includes("matches and merges"))
      .first();

    if (matchesCol.length) {
      matchesCol.removeClass("col-lg-8");
      matchesCol.append(panel);
      return panel;
    }

    // Fallback: prepend to the section itself.
    matchesSection.prepend(panel);
    return panel;
  }

  let fallback = $("#wbe-duplicates-fallback");
  if (!fallback.length) {
    fallback = $("<section></section>")
      .attr("id", "wbe-duplicates-fallback")
      .addClass("wbe-duplicates-fallback")
      .append("<h2>Duplicates</h2>");

    const profileMain = $("main .x-profile-person").first();
    const contentMain = $("main .container").first();
    const bodyTarget = $("body");
    const mountTarget = profileMain.length ? profileMain : contentMain.length ? contentMain : bodyTarget;
    mountTarget.prepend(fallback);
  }

  fallback.append(panel);
  return panel;
}

function unmountPanel(panel) {
  if (!panel || !panel.length) {
    return;
  }

  const fallback = panel.closest("#wbe-duplicates-fallback");
  panel.remove();

  if (fallback.length && fallback.find(`#${PANEL_ID}`).length === 0) {
    fallback.remove();
  }
}

function renderLoading(panel, wtId, options) {
  panel.html(`
    <div class="wbe-duplicates-header">
      <h3 title="WBE Duplicates feature">Possible duplicates</h3>
    </div>
    <p class="wbe-duplicates-muted">Loading...</p>
  `);
  applyPanelCollapseState(panel, options?.startCollapsed);
}

function renderError(panel, wtId, message, options) {
  panel.html(`
    <div class="wbe-duplicates-header">
      <h3 title="WBE Duplicates feature">Possible duplicates</h3>
    </div>
    <p class="wbe-duplicates-muted">Could not load duplicate data for ${escapeHtml(wtId)}.</p>
    <p class="wbe-duplicates-error">${escapeHtml(message)}</p>
  `);
  applyPanelCollapseState(panel, options?.startCollapsed);
}

function renderData(panel, wtId, payload, options, currentUserWtId) {
  const excludedMatchIds = collectExcludedMatchIds();
  const normalized = normalizePayload(wtId, payload, excludedMatchIds);

  if (!normalized.lookupAvailable) {
    panel.html(`
      <div class="wbe-duplicates-header">
        <h3 title="WBE Duplicates feature">Possible duplicates</h3>
      </div>
      <p class="wbe-duplicates-muted">No duplicate lookup is available yet for this profile.</p>
    `);
    applyPanelCollapseState(panel, options?.startCollapsed);
    return;
  }

  const hasAnyDuplicates = normalized.pairs.length > 0 || normalized.hiddenResolvedPairCount > 0;
  if (!hasAnyDuplicates) {
    unmountPanel(panel);
    return;
  }

  const heading = normalized.pairs.length === 1 ? "Possible duplicate" : "Possible duplicates";

  panel.html(`
    <div class="wbe-duplicates-header">
      <h3 title="WBE Duplicates feature">${heading}</h3>
    </div>
    <div id="wbe-duplicates-content"></div>
  `);

  applyPanelCollapseState(panel, options?.startCollapsed);

  renderDuplicateFinderTable(panel, wtId, normalized, options, currentUserWtId);
}

function applyPanelCollapseState(panel, startCollapsed) {
  const header = panel.find(".wbe-duplicates-header").first();
  if (!header.length) {
    return;
  }

  let button = header.find(".wbe-duplicates-collapse-toggle");
  if (!button.length) {
    button = $("<button type='button' class='small wbe-duplicates-collapse-toggle'></button>");
    header.append(button);
  }

  const setCollapsedState = (collapsed, animate = false) => {
    const isCollapsed = Boolean(collapsed);
    const body = panel.children().not(".wbe-duplicates-header");
    panel.toggleClass("wbe-duplicates-collapsed", isCollapsed);

    if (animate) {
      if (isCollapsed) {
        body.stop(true, true).slideUp(180);
      } else {
        body.stop(true, true).slideDown(180);
      }
    } else {
      body.toggle(!isCollapsed);
    }

    button.html(
      `<span class="wbe-duplicates-toggle-icon" aria-hidden="true">${isCollapsed ? "&#9656;" : "&#9662;"}</span>`
    );
    button.attr("aria-expanded", String(!isCollapsed));
    button.attr("aria-label", isCollapsed ? "Expand duplicates panel" : "Collapse duplicates panel");
    button.attr("title", isCollapsed ? "Expand duplicates panel" : "Collapse duplicates panel");
  };

  setCollapsedState(Boolean(startCollapsed));

  button.off("click").on("click", async () => {
    const nextCollapsed = !panel.hasClass("wbe-duplicates-collapsed");
    setCollapsedState(nextCollapsed, true);
    try {
      await updateFeatureOption("duplicates", "startCollapsed", nextCollapsed);
    } catch (error) {
      console.error("[duplicates] failed to save collapsed state", error);
    }
  });
}

async function updateFeatureOption(featureName, optionName, optionValue) {
  const optionsData = await getFeatureOptions(featureName);
  const nextOptions = { ...(optionsData || {}), [optionName]: optionValue };
  const storageName = featureName + "_options";
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [storageName]: nextOptions }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

function normalizePayload(wtId, payload, excludedMatchIds = new Set()) {
  const groups = Array.isArray(payload?.groups) ? payload.groups : [];
  const selectedGroup =
    groups.find((group) => {
      const requested = (group?.requested_wikitree_id || "").toLowerCase();
      return requested === String(wtId).toLowerCase();
    }) ||
    groups[0] ||
    {};

  const requestedId = payload?.requested_wikitree_id || selectedGroup?.requested_wikitree_id || wtId;
  const anchorId = selectedGroup?.anchor_wikitree_id || payload?.anchor_wikitree_id || "";
  const isAnchorProfile = Boolean(selectedGroup?.is_anchor_profile);
  const allProfiles = dedupeProfiles([
    ...(Array.isArray(selectedGroup?.visible_profiles) ? selectedGroup.visible_profiles : []),
    selectedGroup?.current_profile,
    selectedGroup?.anchor_profile,
  ]);

  let pairs = Array.isArray(selectedGroup?.visible_pairs) ? selectedGroup.visible_pairs : [];
  if (!isAnchorProfile && anchorId) {
    pairs = pairs.filter((pair) => {
      const p1 = String(pair?.person1 || "").toLowerCase();
      const p2 = String(pair?.person2 || "").toLowerCase();
      const req = String(requestedId).toLowerCase();
      const anchor = String(anchorId).toLowerCase();
      return (p1 === req && p2 === anchor) || (p1 === anchor && p2 === req);
    });
  }

  pairs = filterExcludedDuplicatePairs(pairs, excludedMatchIds);

  const hasVisibleMatches = Boolean(payload?.has_visible_matches || selectedGroup?.has_visible_match || pairs.length);

  return {
    requestedId,
    anchorId,
    isAnchorProfile,
    actions: selectedGroup?.actions || {},
    currentProfile: selectedGroup?.current_profile || null,
    anchorProfile: selectedGroup?.anchor_profile || null,
    profiles: allProfiles,
    pairs,
    hiddenResolvedPairCount: selectedGroup?.hidden_resolved_pair_count || 0,
    lookupAvailable: payload?.lookup_available !== false,
    hasVisibleMatches,
    groupId: selectedGroup?.group_id || selectedGroup?.match_id || "",
  };
}

function renderDuplicateFinderTable(panel, wtId, normalized, options, currentUserWtId) {
  const content = panel.find("#wbe-duplicates-content");
  const card = $("<div></div>").addClass("wbe-duplicates-card wbe-duplicates-finder-card");
  const controls = $("<div></div>").addClass("wbe-duplicates-actions-row");
  const isMultiMatch = normalized.pairs.length > 1;

  if (isMultiMatch) {
    controls.append(
      $("<button></button>")
        .addClass("small")
        .text("Open all profiles")
        .on("click", () => openAllPairProfiles(normalized))
    );
  }

  if (normalized.hiddenResolvedPairCount > 0) {
    const moreLabel =
      normalized.hiddenResolvedPairCount === 1
        ? "See the extra possible duplicate"
        : `See ${normalized.hiddenResolvedPairCount} more possible duplicates`;
    controls.append(
      $("<button></button>")
        .addClass("small")
        .text(moreLabel)
        .on("click", async function () {
          const button = $(this);
          button.prop("disabled", true).text("Loading more...");
          try {
            const data = await fetchDuplicatesData(wtId, true);
            renderData(panel, wtId, data, { ...options, includeResolvedDebug: true }, currentUserWtId);
          } catch (error) {
            console.error("[duplicates] failed to load resolved duplicates", error);
            button.prop("disabled", false).text(moreLabel);
          }
        })
    );
  }

  if (controls.children().length) {
    card.append(controls);
  }

  if (!normalized.pairs.length) {
    card.append("<p class='wbe-duplicates-muted'>No visible pairs to display for this scope.</p>");
    content.append(card);
    return;
  }

  const table = $(`
    <table class="wbe-duplicates-table wbe-duplicates-matrix-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>First name(s)</th>
          <th>Last</th>
          <th>Current</th>
          <th>Birth date</th>
          <th>Death date</th>
          <th>Birth location</th>
          <th>Death location</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `);

  const PAIR_FIELDS = [
    (p) => {
      const firstName = p?.first_name || p?.firstName || p?.FirstName || "";
      const middleName = p?.middle_name || p?.middleName || p?.MiddleName || "";
      return [firstName, middleName]
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .join(" ");
    },
    (p) => p?.last_name_at_birth || p?.LastNameAtBirth || "",
    (p) => p?.last_name_current || p?.LastNameCurrent || "",
    (p) => displayDate(p?.birth_date_display || p?.BirthDate || ""),
    (p) => displayDate(p?.death_date_display || p?.DeathDate || ""),
    (p) => p?.birth_location || p?.BirthLocation || "",
    (p) => p?.death_location || p?.DeathLocation || "",
  ];

  const originalAnchorId = isMultiMatch ? findLowestNumberedPairId(normalized.pairs) : "";
  const orderedPairs =
    isMultiMatch && originalAnchorId
      ? [...normalized.pairs].sort((a, b) => {
          const aHasAnchor = a?.person1 === originalAnchorId || a?.person2 === originalAnchorId;
          const bHasAnchor = b?.person1 === originalAnchorId || b?.person2 === originalAnchorId;
          if (aHasAnchor === bHasAnchor) {
            return 0;
          }
          return aHasAnchor ? -1 : 1;
        })
      : normalized.pairs;

  let hasRenderedRequestedRow = false;
  orderedPairs.forEach((pair) => {
    const p1 = pair?.person1 || "";
    const p2 = pair?.person2 || "";
    const score = pair?.score ?? "-";
    const level = pair?.level || "";
    const warnings = Array.isArray(pair?.warnings) ? pair.warnings : [];
    const pairProfiles = getPairProfiles(normalized, pair, originalAnchorId);

    const rowA = $("<tr></tr>").addClass("wbe-row-primary");
    const rowB = $("<tr></tr>").addClass("wbe-row-secondary");
    const rowAId = String(profileId(pairProfiles[0]) || "").toLowerCase();
    const anchorIdForStyling = String(originalAnchorId || normalized.anchorId || "").toLowerCase();
    if (rowAId && anchorIdForStyling && rowAId === anchorIdForStyling) {
      rowA.addClass("wbe-row-anchor");
    }

    if (pairProfiles[0]) rowA.append(`<td>${profileLink(pairProfiles[0])}</td>`);
    if (pairProfiles[1]) rowB.append(`<td>${profileLink(pairProfiles[1])}</td>`);

    PAIR_FIELDS.forEach((getter) => {
      const valA = pairProfiles[0] ? getter(pairProfiles[0]) : "";
      const valB = pairProfiles[1] ? getter(pairProfiles[1]) : "";
      if (pairProfiles[0]) rowA.append(buildMatchCell(valA, valB));
      if (pairProfiles[1]) rowB.append(buildMatchCell(valB, valA));
    });

    if (pairProfiles[0] && (!isMultiMatch || !hasRenderedRequestedRow)) {
      table.find("tbody").append(rowA);
      hasRenderedRequestedRow = true;
    }
    if (pairProfiles[1]) table.find("tbody").append(rowB);

    const actionRow = $("<tr></tr>").addClass("wbe-duplicates-pair-action-row");
    const actionCell = $("<td colspan='8'></td>");
    const leftMeta = $("<div></div>").addClass("wbe-duplicates-pair-meta");
    leftMeta.append(`<span>Score <strong>${escapeHtml(String(score))}</strong></span>`);
    leftMeta.append(`<span>Strength <strong>${escapeHtml(level)}</strong></span>`);
    if (warnings.length) {
      leftMeta.append(`<span>Warnings <strong>${escapeHtml(warnings.join("; "))}</strong></span>`);
    }

    const actions = $("<div></div>").addClass("wbe-duplicates-row-actions");
    actions.append(
      $("<button></button>")
        .addClass("small")
        .text("Open")
        .on("click", () => openPairProfiles(pairProfiles))
    );
    actions.append(
      $("<button></button>")
        .addClass("small")
        .text("Compare")
        .on("click", () => showComparisonDialog(p1, p2))
    );
    actions.append(
      $("<button></button>")
        .addClass("small")
        .text("Compare → Merge")
        .on("click", () => window.open(makeMergeUrl(p1, p2), "_blank"))
    );

    if (normalized.actions?.can_set_status && options?.enableSetStatus) {
      actions.append(
        $("<button></button>")
          .addClass("small")
          .text("Set Status")
          .on("click", () =>
            window.open(makeDuplicatesStatusUrl(pair, currentUserWtId), "_blank", "noopener,noreferrer")
          )
      );
    }

    actionCell.append($("<div class='wbe-duplicates-pair-action-wrap'></div>").append(leftMeta).append(actions));
    actionRow.append(actionCell);
    table.find("tbody").append(actionRow);
  });

  card.append(table);
  content.append(card);
}

function getPairProfiles(normalized, pair, preferredOriginalId = "") {
  const byId = new Map();
  normalized.profiles.forEach((profile) => {
    byId.set(String(profileId(profile)).toLowerCase(), profile);
  });

  const p1 = byId.get(String(pair?.person1 || "").toLowerCase());
  const p2 = byId.get(String(pair?.person2 || "").toLowerCase());
  const preferred = String(preferredOriginalId || "").toLowerCase();
  if (preferred) {
    if (String(pair?.person1 || "").toLowerCase() === preferred) {
      return [p1, p2];
    }
    if (String(pair?.person2 || "").toLowerCase() === preferred) {
      return [p2, p1];
    }
  }

  const requested = String(normalized.requestedId || "").toLowerCase();

  if (String(pair?.person1 || "").toLowerCase() === requested) {
    return [p1, p2];
  }
  if (String(pair?.person2 || "").toLowerCase() === requested) {
    return [p2, p1];
  }
  return [p1, p2];
}

function findLowestNumberedPairId(pairs) {
  const ids = new Set();
  (pairs || []).forEach((pair) => {
    if (pair?.person1) {
      ids.add(String(pair.person1));
    }
    if (pair?.person2) {
      ids.add(String(pair.person2));
    }
  });

  let bestId = "";
  let bestNum = Number.POSITIVE_INFINITY;
  ids.forEach((id) => {
    const num = extractNumericSuffix(id);
    if (num === null) {
      return;
    }
    if (num < bestNum) {
      bestNum = num;
      bestId = id;
    }
  });

  if (bestId) {
    return bestId;
  }

  return Array.from(ids).sort((a, b) => a.localeCompare(b))[0] || "";
}

function profileLink(profile) {
  const wtId = profileId(profile);
  const url = profile?.profile_url || makeProfileUrl(wtId);
  if (!wtId) {
    return "";
  }
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(wtId)}</a>`;
}

function displayDate(value) {
  if (!value || value === "0000-00-00" || value === "0") {
    return "";
  }
  return value;
}

/**
 * Builds a <td> for a pair row with match highlighting.
 * - Full cell highlight when values are identical.
 * - Partial highlight (wrapping matching comma-parts in a span) when the values
 *   differ but share common comma-separated segments (e.g. "South Africa").
 */
function buildMatchCell(thisVal, otherVal) {
  const td = $("<td></td>");

  if (!thisVal) {
    return td;
  }

  if (thisVal === otherVal) {
    td.addClass("wbe-cell-match");
    td.text(thisVal);
    return td;
  }

  // Partial matching: compare comma-separated parts
  if (otherVal) {
    const thisParts = thisVal.split(/,\s*/);
    const otherSet = new Set(otherVal.split(/,\s*/).map((s) => s.trim().toLowerCase()));
    const hasAnyMatch = thisParts.some((part) => otherSet.has(part.trim().toLowerCase()));

    if (hasAnyMatch) {
      thisParts.forEach((part, i) => {
        if (i > 0) {
          td.append(document.createTextNode(", "));
        }
        const trimmed = part.trim();
        if (otherSet.has(trimmed.toLowerCase())) {
          td.append($("<span></span>").addClass("wbe-part-match").text(trimmed));
        } else {
          td.append(document.createTextNode(trimmed));
        }
      });
      return td;
    }
  }

  td.text(thisVal);
  return td;
}

function openPairProfiles(pairProfiles) {
  pairProfiles.forEach((profile) => {
    if (!profile) {
      return;
    }
    const url = profile?.profile_url || makeProfileUrl(profileId(profile));
    if (url) {
      window.open(url, "_blank");
    }
  });
}

function openAllPairProfiles(normalized) {
  const seen = new Set();
  normalized.pairs.forEach((pair) => {
    const pairProfiles = getPairProfiles(normalized, pair);
    pairProfiles.forEach((profile) => {
      if (!profile) {
        return;
      }
      const url = profile?.profile_url || makeProfileUrl(profileId(profile));
      if (!url || seen.has(url)) {
        return;
      }
      seen.add(url);
      window.open(url, "_blank");
    });
  });
}

async function showComparisonDialog(person1Id, person2Id) {
  const dialog = ensureComparisonDialogShell(person1Id, person2Id);
  const status = dialog.find("#comparison-dialog-status");
  const content = dialog.find("#comparison-dialog-content");

  status.attr("data-tone", "").text("Loading profile data...");
  content.html("");

  try {
    const response = await chrome.runtime.sendMessage({
      action: "duplicatesCompareProfiles",
      ids: [person1Id, person2Id],
    });

    if (!response?.success) {
      throw new Error(response?.error || "Failed to compare profiles.");
    }

    const profileA = response?.data?.profiles?.[person1Id] || null;
    const profileB = response?.data?.profiles?.[person2Id] || null;
    if (!profileA || !profileB) {
      throw new Error("Comparison data was incomplete.");
    }

    status.attr("data-tone", "ok").text("Loaded.");
    const people = response?.data?.people || {};
    content.append(buildComparisonTable(profileA, profileB, person1Id, person2Id, people));
  } catch (error) {
    status.attr("data-tone", "error").text(error?.message || "Could not load comparison.");
  }

  const targetWidth = Math.min(1240, window.innerWidth - 60);
  dialog.dialog({
    title: `Compare ${person1Id} vs ${person2Id}`,
    width: targetWidth,
    minWidth: 760,
    modal: false,
    resizable: true,
    draggable: true,
    close: function () {
      $(this).dialog("destroy").remove();
    },
  });
}

function ensureComparisonDialogShell(person1Id, person2Id) {
  $(`#${COMPARE_DIALOG_ID}`).dialog("destroy").remove();
  const shell = $(`
    <div id="${COMPARE_DIALOG_ID}" class="comparison-dialog-shell">
      <div id="comparison-dialog-status" aria-live="polite"></div>
      <div id="comparison-dialog-content"></div>
      <div class="comparison-dialog-footer">
        <button type="button" id="comparison-dialog-close-inline" class="button-secondary">Close</button>
        <button type="button" id="comparison-dialog-recenter" class="button-secondary">Recenter</button>
      </div>
    </div>
  `);

  shell.on("click", "#comparison-dialog-close-inline", function () {
    shell.dialog("close");
  });

  shell.on("click", "#comparison-dialog-recenter", function () {
    shell.parent().css({
      top: `${Math.max(40, window.scrollY + 60)}px`,
      left: `${Math.max(20, (window.innerWidth - shell.parent().outerWidth()) / 2)}px`,
    });
  });

  return shell;
}

function buildComparisonTable(profileA, profileB, person1Id, person2Id, people = {}) {
  const table = $("<table class='comparison-table'></table>");
  table.append(`
    <thead>
      <tr>
        <th aria-hidden="true"></th>
        <th>${buildProfileHeading(profileA, person1Id)}</th>
        <th>${buildProfileHeading(profileB, person2Id)}</th>
      </tr>
    </thead>
    <tbody></tbody>
  `);

  const tbody = table.find("tbody");
  tbody.append("<tr class='comparison-section-row'><th colspan='3'>Name</th></tr>");

  appendComparisonRow(tbody, "Prefix", profileA?.Prefix, profileB?.Prefix);
  appendComparisonRow(tbody, "First name", profileA?.FirstName, profileB?.FirstName);
  appendComparisonRow(tbody, "Middle name", profileA?.MiddleName, profileB?.MiddleName);
  appendComparisonRow(tbody, "Last name at birth", profileA?.LastNameAtBirth, profileB?.LastNameAtBirth);
  appendComparisonRow(tbody, "Current last name", profileA?.LastNameCurrent, profileB?.LastNameCurrent);
  appendComparisonRow(tbody, "Suffix", profileA?.Suffix, profileB?.Suffix);
  appendComparisonRow(tbody, "Nickname", profileA?.Nicknames, profileB?.Nicknames);
  appendComparisonRow(tbody, "Gender", profileA?.Gender, profileB?.Gender);

  tbody.append("<tr class='comparison-section-row'><th colspan='3'>Vital records</th></tr>");

  appendComparisonRow(
    tbody,
    "Birth date",
    formatDateWithStatus(profileA, "BirthDate"),
    formatDateWithStatus(profileB, "BirthDate")
  );
  appendComparisonRow(tbody, "Birth location", profileA?.BirthLocation, profileB?.BirthLocation);
  appendComparisonRow(
    tbody,
    "Death date",
    formatDateWithStatus(profileA, "DeathDate"),
    formatDateWithStatus(profileB, "DeathDate")
  );
  appendComparisonRow(tbody, "Death location", profileA?.DeathLocation, profileB?.DeathLocation);

  tbody.append("<tr class='comparison-section-row'><th colspan='3'>Family</th></tr>");

  appendComparisonRow(
    tbody,
    "Father",
    resolveRelativeName(profileA?.Father, people),
    resolveRelativeName(profileB?.Father, people),
    true
  );
  appendComparisonRow(
    tbody,
    "Mother",
    resolveRelativeName(profileA?.Mother, people),
    resolveRelativeName(profileB?.Mother, people),
    true
  );
  appendComparisonRow(
    tbody,
    "Siblings",
    resolveRelativeList(profileA?.Siblings, people),
    resolveRelativeList(profileB?.Siblings, people),
    true
  );
  appendComparisonRow(
    tbody,
    "Spouses",
    resolveRelativeList(profileA?.Spouses, people),
    resolveRelativeList(profileB?.Spouses, people),
    true
  );
  appendComparisonRow(
    tbody,
    "Children",
    resolveRelativeList(profileA?.Children, people),
    resolveRelativeList(profileB?.Children, people),
    true
  );

  tbody.append("<tr class='comparison-section-row'><th colspan='3'>Profile details</th></tr>");

  appendComparisonRow(tbody, "Privacy", displayPrivacy(profileA?.Privacy), displayPrivacy(profileB?.Privacy), true);
  appendComparisonRow(tbody, "Biography", buildBioHtml(profileA?.bioHTML), buildBioHtml(profileB?.bioHTML), true);
  appendComparisonRow(tbody, "Manager", displayManagers(profileA?.Managers), displayManagers(profileB?.Managers), true);
  appendComparisonRow(tbody, "Connected", String(profileA?.Connected ?? ""), String(profileB?.Connected ?? ""));
  appendComparisonRow(tbody, "Created", compactStamp(profileA?.Created), compactStamp(profileB?.Created));
  appendComparisonRow(tbody, "Touched", compactStamp(profileA?.Touched), compactStamp(profileB?.Touched));

  const rawGrid = $("<div class='comparison-raw-grid'></div>");
  rawGrid.append(buildRawDetails(person1Id, profileA));
  rawGrid.append(buildRawDetails(person2Id, profileB));

  const wrap = $("<div></div>");
  wrap.append(table);
  wrap.append(rawGrid);
  return wrap;
}

function appendComparisonRow(tbody, label, aValue, bValue, rawHtml = false) {
  const aText = String(rawHtml ? stripHtml(aValue) : aValue ?? "").trim();
  const bText = String(rawHtml ? stripHtml(bValue) : bValue ?? "").trim();
  const matchClass = aText && bText && aText === bText ? "match-highlight" : "";

  const row = $("<tr></tr>");
  row.append(`<th class='comparison-field-name'>${escapeHtml(label)}</th>`);

  if (rawHtml) {
    row.append(`<td class='${matchClass}'>${aValue || "<span class='comparison-empty'>&nbsp;</span>"}</td>`);
    row.append(`<td class='${matchClass}'>${bValue || "<span class='comparison-empty'>&nbsp;</span>"}</td>`);
  } else {
    row.append(
      `<td class='${matchClass}'>${escapeHtml(aValue || "") || "<span class='comparison-empty'>&nbsp;</span>"}</td>`
    );
    row.append(
      `<td class='${matchClass}'>${escapeHtml(bValue || "") || "<span class='comparison-empty'>&nbsp;</span>"}</td>`
    );
  }

  tbody.append(row);
}

function buildProfileHeading(profile, wtId) {
  const fullName = `${profile?.FirstName || ""} ${profile?.LastNameAtBirth || profile?.LastNameCurrent || ""}`.trim();
  const url = makeProfileUrl(wtId);
  return `<div class='comparison-profile-heading'><a href='${escapeHtml(
    url
  )}' target='_blank' rel='noreferrer noopener'>${escapeHtml(
    wtId
  )}</a><div class='comparison-profile-name'>${escapeHtml(fullName)}</div></div>`;
}

function buildRawDetails(wtId, raw) {
  return $(`
    <details class='comparison-raw-block'>
      <summary>${escapeHtml(wtId)} raw API data</summary>
      <pre>${escapeHtml(JSON.stringify(raw, null, 2))}</pre>
    </details>
  `);
}

function formatDateWithStatus(profile, dateKey) {
  const raw = profile?.[dateKey];
  if (!raw || raw === "0000-00-00" || raw === "0") {
    return "";
  }

  const statusKey = profile?.DataStatus?.[dateKey] || "";
  const statusLabel = DATE_STATUS_LABEL[statusKey] || "";
  if (!statusLabel) {
    return raw;
  }
  return `${statusLabel} ${raw}`;
}

function resolveRelativeName(id, people) {
  if (!id || id === 0 || id === "0") {
    return "";
  }
  const person = people?.[String(id)];
  if (!person) {
    return escapeHtml(String(id));
  }
  const parts = [
    person.Prefix,
    person.FirstName,
    person.MiddleName,
    person.LastNameAtBirth || person.LastNameCurrent,
    person.Suffix,
  ];
  const name = parts.filter(Boolean).join(" ").trim() || person.Name || String(id);
  const wtId = person.Name;
  if (wtId) {
    return `<a href="${escapeHtml(makeProfileUrl(wtId))}" target="_blank" rel="noreferrer noopener">${escapeHtml(
      name
    )}</a>`;
  }
  return escapeHtml(name);
}

function resolveRelativeList(value, people) {
  const entries = Array.isArray(value) ? value : typeof value === "object" && value ? Object.values(value) : [];
  if (!entries.length) {
    return "";
  }
  return entries
    .map((entry) => {
      const id = entry?.Id ?? entry?.id;
      if (id != null) {
        return resolveRelativeName(id, people);
      }
      const wtId = entry?.Name || "";
      return wtId
        ? `<a href="${escapeHtml(makeProfileUrl(wtId))}" target="_blank" rel="noreferrer noopener">${escapeHtml(
            wtId
          )}</a>`
        : escapeHtml(JSON.stringify(entry));
    })
    .join(", ");
}

function displayRelative(value) {
  if (!value || value === 0 || value === "0") {
    return "";
  }
  return String(value);
}

function displayRelativeList(value) {
  if (
    !value ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && !Object.keys(value).length)
  ) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((entry) => entry?.Name || entry?.Id || JSON.stringify(entry)).join(", ");
  }

  if (typeof value === "object") {
    return Object.values(value)
      .map((entry) => entry?.Name || entry?.Id || JSON.stringify(entry))
      .join(", ");
  }

  return String(value);
}

function displayManagers(managers) {
  if (!Array.isArray(managers) || managers.length === 0) {
    return "<span class='comparison-empty'>&nbsp;</span>";
  }
  return `<div class='comparison-manager-list'>${managers
    .map((manager) => {
      const id = manager?.Name || "";
      return `<div><a href='${escapeHtml(makeProfileUrl(id))}' target='_blank' rel='noreferrer noopener'>${escapeHtml(
        id
      )}</a></div>`;
    })
    .join("")}</div>`;
}

function displayPrivacy(privacyValue) {
  const value = Number(privacyValue || 0);
  if (!value) {
    return "<span class='comparison-empty'>&nbsp;</span>";
  }
  const label = value >= 60 ? "Open" : `Privacy ${value}`;
  return `<span class='comparison-privacy'><span class='comparison-privacy-badge comparison-privacy-badge--${escapeHtml(
    String(value)
  )}' aria-hidden='true'></span><span class='comparison-privacy-label'>${escapeHtml(label)}</span></span>`;
}

function buildBioHtml(rawBioHtml) {
  if (!rawBioHtml) {
    return "<span class='comparison-empty'>&nbsp;</span>";
  }
  return `<div class='comparison-biography'>${decodeHtmlEntities(rawBioHtml)}</div>`;
}

function compactStamp(value) {
  const text = String(value || "");
  if (!/^\d{14}$/.test(text)) {
    return text;
  }
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function decodeHtmlEntities(input) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(input || "");
  return textarea.value;
}

function stripHtml(input) {
  return String(input || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function showSetStatusDialog(normalized, pair, currentUserWtId, actionRow) {
  const matchId = pair?.resolve_match_id || pair?.pair_id || `pair_${pair?.person1 || ""}__${pair?.person2 || ""}`;

  $("#wbe-resolve-dialog").dialog("destroy").remove();

  const dlg = $(`
    <div id="wbe-resolve-dialog" title="Resolve match">
      <form id="wbe-resolve-form">
        <input type="hidden" id="wbe-resolve-match-id" name="match_id" value="${escapeHtml(matchId)}">
        <label>
          <span>Status</span>
          <select id="wbe-resolve-status" name="status">
            <option value="">— Select a status —</option>
            <option value="not_a_match">Not a match</option>
            <option value="unsure">Unsure</option>
            <option value="merge_request_issued">Merge proposed</option>
            <option value="merged">Merged</option>
          </select>
        </label>
        <label>
          <span>Notes</span>
          <textarea id="wbe-resolve-notes" name="notes" rows="5" placeholder="Optional notes"></textarea>
        </label>
      </form>
    </div>
  `);

  dlg.dialog({
    modal: true,
    width: 520,
    resizable: false,
    buttons: {
      Save: function () {
        const status = dlg.find("#wbe-resolve-status").val();
        if (!status) {
          dlg.find("#wbe-resolve-status").focus();
          return;
        }
        const note = dlg.find("#wbe-resolve-notes").val() || "";
        dlg.dialog("close");
        actionRow.addClass("wbe-duplicates-row-pending");
        chrome.runtime
          .sendMessage({
            action: "duplicatesSetStatus",
            matchId,
            status,
            clientWtId: currentUserWtId,
            note,
          })
          .then((response) => {
            if (!response?.success) {
              const errorCode = String(response?.data?.error_code || "");
              const statusCode = Number(response?.status || 0);
              if (errorCode === "AS_NO_SECRET" || statusCode === 503) {
                const statusUrl = makeDuplicatesStatusUrl(pair);
                actionRow.removeClass("wbe-duplicates-row-pending");
                window.open(statusUrl, "_blank", "noopener,noreferrer");
                const infoDlg = $(
                  "<div title='Open Duplicate Finder'>Arborists status updates are unavailable in WBE right now. Duplicate Finder has been opened to complete Set Status there.</div>"
                );
                infoDlg.dialog({
                  modal: true,
                  buttons: {
                    OK: function () {
                      $(this).dialog("close");
                    },
                  },
                  close: function () {
                    $(this).dialog("destroy").remove();
                  },
                });
                return;
              }
              const statusSuffix = response?.status ? ` (HTTP ${response.status})` : "";
              throw new Error(`${response?.error || "Set Status failed."}${statusSuffix}`);
            }
            actionRow.removeClass("wbe-duplicates-row-pending").addClass("wbe-duplicates-row-success");
          })
          .catch((error) => {
            actionRow.removeClass("wbe-duplicates-row-pending").addClass("wbe-duplicates-row-error");
            const errDlg = $(
              `<div title="Set Status error">${escapeHtml(error?.message || "Set Status failed.")}</div>`
            );
            errDlg.dialog({
              modal: true,
              buttons: {
                OK: function () {
                  $(this).dialog("close");
                },
              },
              close: function () {
                $(this).dialog("destroy").remove();
              },
            });
          });
      },
      Cancel: function () {
        $(this).dialog("close");
      },
    },
    close: function () {
      $(this).dialog("destroy").remove();
    },
  });
}

function profileId(profile) {
  return profile?.wikitree_id || profile?.profile_id || profile?.sort_id || "";
}

function dedupeProfiles(profiles) {
  const seen = new Set();
  return profiles.filter((profile) => {
    if (!profile) {
      return false;
    }
    const key = String(profileId(profile)).toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function makeProfileUrl(wtId) {
  if (!wtId) {
    return "";
  }
  return `https://www.wikitree.com/wiki/${encodeURIComponent(wtId)}`;
}

function makeDuplicatesStatusUrl(pair, currentUserWtId) {
  const url = new URL("https://apps.wikitree.com/apps/beacall6/duplicates/");
  const resolveMatchId = String(pair?.resolve_match_id || "").trim();
  if (resolveMatchId) {
    url.searchParams.set("match_id", resolveMatchId);
  } else {
    const person1 = String(pair?.person1 || "").trim();
    const person2 = String(pair?.person2 || "").trim();
    if (person1) {
      url.searchParams.set("wt1", person1);
    }
    if (person2) {
      url.searchParams.set("wt2", person2);
    }
  }
  const wtId = String(currentUserWtId || "").trim();
  if (wtId) {
    url.searchParams.set("client_wt_id", wtId);
  }
  url.searchParams.set("open_status", "1");
  return url.toString();
}

function extractNumericSuffix(wtId) {
  const m = String(wtId || "").match(/-(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

function makeMergeUrl(person1, person2) {
  // Lower numeric suffix = anchor = user2, per API convention
  const num1 = extractNumericSuffix(person1);
  const num2 = extractNumericSuffix(person2);
  let user1, user2;
  if (num1 !== null && num2 !== null && num1 !== num2) {
    if (num1 < num2) {
      user2 = person1;
      user1 = person2;
    } else {
      user1 = person1;
      user2 = person2;
    }
  } else {
    user1 = person1;
    user2 = person2;
  }
  return `https://www.wikitree.com/index.php?title=Special:MergePerson&user1_name=${encodeURIComponent(
    user1
  )}&user2_name=${encodeURIComponent(user2)}&action=compare`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
