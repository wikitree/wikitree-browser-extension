import $ from "jquery";

export function createChatCcHandlers({
  WikiTreeAPI,
  WBE_CHAT_APP_ID,
  CC7_CACHE_MS,
  formatSubjectLabel,
  resolveCc7SubjectRoot,
  mapApiPersonToStandardRow,
  makeStandardProfileTable,
  makeWatchlistTable,
  normalizeText,
}) {
  let cc7Cache = {
    rootKey: null,
    nuclear: 7,
    fetchedAt: 0,
    profiles: [],
  };

  function normalizeCcNuclear(value, fallback = 7) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return Math.max(1, Math.min(10, Math.trunc(numeric)));
  }

  async function fetchCcProfilesFromApi(userNumId, nuclear = 7) {
    const allProfiles = [];
    const limit = 1000;
    let start = 0;
    let getMore = true;
    const normalizedNuclear = normalizeCcNuclear(nuclear, 7);

    while (getMore) {
      const options = { nuclear: normalizedNuclear, start, limit };
      const [status, , people] = await WikiTreeAPI.getPeople(
        WBE_CHAT_APP_ID,
        userNumId,
        "Id,Name,FirstName,MiddleName,BirthLocation,DeathLocation,RealName,Derived.ShortName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,Gender,Meta",
        options
      );

      if (status == null) {
        throw new Error(`No status returned from getPeople while fetching CC${normalizedNuclear}.`);
      }

      getMore = status.startsWith("Maximum number of profiles");
      if (!getMore && status !== "") {
        throw new Error(`Unexpected getPeople status: ${status}`);
      }

      const pageProfiles = Object.values(people || {}).map((entry) => {
        const profile = { ...entry };
        profile.Degrees = entry?.Meta?.Degrees;
        delete profile.Meta;
        return profile;
      });

      allProfiles.push(...pageProfiles);

      if (!people || pageProfiles.length === 0) {
        getMore = false;
      } else {
        start += limit;
      }
    }

    return allProfiles;
  }

  async function getCcProfilesForUser(userNumId, nuclear = 7) {
    const normalizedNuclear = normalizeCcNuclear(nuclear, 7);
    const now = Date.now();
    if (
      cc7Cache.rootKey === userNumId &&
      cc7Cache.nuclear === normalizedNuclear &&
      now - cc7Cache.fetchedAt < CC7_CACHE_MS &&
      cc7Cache.profiles.length
    ) {
      return cc7Cache.profiles;
    }

    const profiles = await fetchCcProfilesFromApi(userNumId, normalizedNuclear);
    cc7Cache = {
      rootKey: userNumId,
      nuclear: normalizedNuclear,
      fetchedAt: now,
      profiles,
    };
    return profiles;
  }

  async function getCc7ProfilesForUser(userNumId) {
    return await getCcProfilesForUser(userNumId, 7);
  }

  function getCc7RowsFromPage() {
    return $("table tr[data-wtid]").toArray();
  }

  function getPersonNameFromRow(row, fallbackWtId) {
    const $row = $(row);
    const $firstProfileLink = $row.find('a[href*="/wiki/"]').first();
    if ($firstProfileLink.length && $firstProfileLink.text().trim()) {
      return $firstProfileLink.text().trim();
    }
    return fallbackWtId;
  }

  function getBirthLocationFromRow(row) {
    const $row = $(row);
    const $birthCell = $row.find("td.birthLocation").first();
    if ($birthCell.length && $birthCell.text()) {
      return $birthCell.text().trim();
    }

    const dataAttr = $row.attr("data-birth-location-small2big");
    return dataAttr ? dataAttr.trim() : "";
  }

  async function tryHandleCc7LocationPrompt(parsed, prompt = "") {
    if (!parsed?.location) {
      return null;
    }

    const nuclear = normalizeCcNuclear(parsed?.nuclear, 7);
    const ccLabel = `CC${nuclear}`;

    const subjectRoot = await resolveCc7SubjectRoot(prompt);
    if (subjectRoot?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${subjectRoot.unresolvedName}". Try a WikiTree ID like Name-123, or a more specific name.`;
    }
    if (!subjectRoot?.key) {
      return "I could not detect a profile person or your logged-in profile to use as the CC7 starting point.";
    }

    const subjectLabel = formatSubjectLabel(subjectRoot);

    let matches = [];
    let dataSource = "API";

    try {
      const cc7Profiles = await getCcProfilesForUser(subjectRoot.key, nuclear);
      const needle = parsed.location.toLowerCase();
      matches = cc7Profiles
        .filter((profile) => {
          const birth = (profile.BirthLocation || "").toLowerCase();
          const death = (profile.DeathLocation || "").toLowerCase();
          if (parsed.field === "BirthLocation") {
            return birth.includes(needle);
          }
          if (parsed.field === "DeathLocation") {
            return death.includes(needle);
          }
          return birth.includes(needle) || death.includes(needle);
        })
        .map((profile) => ({
          wtid: profile.Name,
          name: profile.RealName || profile?.Derived?.ShortName || profile.Name,
          firstName: profile.FirstName || "",
          lnab: profile.LastNameAtBirth || "",
          lastNameCurrent: profile.LastNameCurrent || "",
          birthLocation: profile.BirthLocation || "",
          deathLocation: profile.DeathLocation || "",
          degrees: profile.Degrees,
          gender: profile.Gender || "",
          surname: profile.LastNameCurrent || profile.LastNameAtBirth || "",
          birth: profile.BirthDate || "",
          death: profile.DeathDate || "",
        }));
    } catch (error) {
      if (nuclear !== 7) {
        return `I could not fetch ${ccLabel} from the API for ${subjectLabel}. Error: ${
          error?.message || "unknown error"
        }`;
      }

      const rows = getCc7RowsFromPage();
      if (!rows.length) {
        return `I could not fetch ${ccLabel} from the API, and no CC7 table is available on this page. Error: ${
          error?.message || "unknown error"
        }`;
      }

      dataSource = "current table view";
      const needle = parsed.location.toLowerCase();
      rows.forEach((row) => {
        const wtid = (row.getAttribute("data-wtid") || "").trim();
        const birthLocation = getBirthLocationFromRow(row);
        if (!birthLocation || !birthLocation.toLowerCase().includes(needle)) {
          if (parsed.field === "BirthLocation") {
            return;
          }

          const deathCell = row.querySelector("td.deathLocation");
          const deathLocation = deathCell?.textContent?.trim() || "";
          if (!deathLocation.toLowerCase().includes(needle)) {
            return;
          }
        }

        matches.push({
          wtid,
          name: getPersonNameFromRow(row, wtid),
          firstName: "",
          lnab: "",
          lastNameCurrent: "",
          birthLocation,
          deathLocation: row.querySelector("td.deathLocation")?.textContent?.trim() || "",
          degrees: "",
          gender: "",
          surname: "",
          birth: "",
          death: "",
        });
      });
    }

    if (parsed.mode === "count") {
      const countFieldLabel =
        parsed.field === "DeathLocation" ? "died in" : parsed.field === "BirthLocation" ? "born in" : "in";
      return {
        message: `I found ${matches.length} ${ccLabel} profile${matches.length === 1 ? "" : "s"} ${countFieldLabel} ${
          parsed.location
        } for ${subjectLabel} (from ${dataSource}).`,
        table: matches.length
          ? makeStandardProfileTable(
              `${ccLabel} profiles in ${parsed.location} for ${subjectRoot.displayName}`,
              matches.map((person) => ({
                displayName: person.name,
                wtid: person.wtid,
                firstName: person.firstName || "",
                lnab: person.lnab || "",
                lastNameCurrent: person.lastNameCurrent || "",
                degrees: person.degrees ?? "",
                gender: person.gender || "",
                birth: person.birth || "",
                death: person.death || "",
                birthLocation: person.birthLocation,
                deathLocation: person.deathLocation,
                surname: person.surname || "",
              }))
            )
          : null,
      };
    }

    if (!matches.length) {
      return `I found no ${ccLabel} profiles in ${parsed.location} for ${subjectLabel} (from ${dataSource}).`;
    }

    const maxToShow = 25;
    const shown = matches.slice(0, maxToShow);
    const lines = shown.map(
      (person) =>
        `- ${person.name} (${person.wtid})${
          person.degrees !== undefined && person.degrees !== "" ? `, degree ${person.degrees}` : ""
        } - ${person.birthLocation}${person.deathLocation ? ` | died: ${person.deathLocation}` : ""}`
    );
    const extra = matches.length > maxToShow ? `\n...and ${matches.length - maxToShow} more.` : "";
    const fieldLabel =
      parsed.field === "DeathLocation" ? "died in" : parsed.field === "BirthLocation" ? "born in" : "in";

    return {
      message: `Here are the ${ccLabel} profiles ${fieldLabel} ${
        parsed.location
      } for ${subjectLabel} (from ${dataSource}):\n${lines.join("\n")}${extra}`,
      table: makeStandardProfileTable(
        `${ccLabel} profiles ${fieldLabel} ${parsed.location} for ${subjectRoot.displayName}`,
        matches.map((person) => ({
          displayName: person.name,
          wtid: person.wtid,
          firstName: person.firstName || "",
          lnab: person.lnab || "",
          lastNameCurrent: person.lastNameCurrent || "",
          degrees: person.degrees ?? "",
          gender: person.gender || "",
          birth: person.birth || "",
          death: person.death || "",
          birthLocation: person.birthLocation,
          deathLocation: person.deathLocation,
          surname: person.surname || "",
        }))
      ),
    };
  }

  async function tryHandleCcSummaryPrompt(params, prompt = "") {
    const nuclear = normalizeCcNuclear(params?.nuclear, 7);
    const ccLabel = `CC${nuclear}`;

    const subjectRoot = await resolveCc7SubjectRoot(prompt);
    if (subjectRoot?.unresolvedName) {
      return `I couldn't identify which profile you meant by "${subjectRoot.unresolvedName}". Try a WikiTree ID like Name-123, or a more specific name.`;
    }
    if (!subjectRoot?.key) {
      return "I could not detect a profile person or your logged-in profile to use as the CC starting point.";
    }

    const subjectLabel = formatSubjectLabel(subjectRoot);

    try {
      const profiles = await getCcProfilesForUser(subjectRoot.key, nuclear);
      if (!profiles.length) {
        return `I found no profiles in ${ccLabel} for ${subjectLabel}.`;
      }

      const rows = profiles
        .map((profile) =>
          mapApiPersonToStandardRow(profile, {
            degrees: Number(profile.Degrees ?? Number.MAX_SAFE_INTEGER),
            surnamePreference: "currentFirst",
          })
        )
        .sort(
          (left, right) =>
            left.degrees - right.degrees ||
            normalizeText(left.displayName).localeCompare(normalizeText(right.displayName))
        );

      const preview = rows
        .slice(0, 15)
        .map((person) => `- ${person.displayName} (${person.wtid}), degree ${person.degrees}`)
        .join("\n");
      const extra = rows.length > 15 ? `\n...and ${rows.length - 15} more.` : "";

      return {
        message: `${subjectLabel === "you" ? "Your" : `${subjectLabel}'s`} ${ccLabel} includes ${rows.length} profile${
          rows.length === 1 ? "" : "s"
        }.\n${preview}${extra}`,
        table: makeStandardProfileTable(`${ccLabel} for ${subjectRoot.displayName}`, rows, [[4, "asc"]]),
      };
    } catch (error) {
      return `I couldn't fetch ${ccLabel} for ${subjectLabel}. Error: ${error?.message || "unknown error"}`;
    }
  }

  async function tryHandleWatchlistPrompt(params = {}) {
    const hasExplicitLimit =
      params && params.limit !== undefined && params.limit !== null && String(params.limit).trim() !== "";
    const requestedLimitRaw = hasExplicitLimit ? Number(params.limit) : NaN;
    const requestedLimit =
      hasExplicitLimit && Number.isFinite(requestedLimitRaw)
        ? Math.max(1, Math.min(50000, Math.trunc(requestedLimitRaw)))
        : null;
    const pageSize = 1000;
    const maxRowsToFetch = requestedLimit ?? 50000;

    try {
      const allEntries = [];
      let offset = 0;
      let watchlistCount = null;

      while (allEntries.length < maxRowsToFetch) {
        const pageLimit = Math.min(pageSize, maxRowsToFetch - allEntries.length);
        const [watchlist, totalCount, status] = await WikiTreeAPI.getWatchlist(
          WBE_CHAT_APP_ID,
          "Id,Name,FirstName,RealName,Derived.ShortName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender",
          {
            limit: pageLimit,
            offset,
            getPerson: 1,
            getSpace: 0,
            order: "page_touched",
          }
        );

        if (status && status !== 0 && status !== "") {
          return `I couldn't load your watchlist. API status: ${status}`;
        }

        const pageEntries = Array.isArray(watchlist) ? watchlist : [];
        if (watchlistCount == null && Number.isFinite(Number(totalCount))) {
          watchlistCount = Number(totalCount);
        }

        if (!pageEntries.length) {
          break;
        }

        allEntries.push(...pageEntries);
        offset += pageEntries.length;

        if (watchlistCount != null && offset >= watchlistCount) {
          break;
        }
        if (pageEntries.length < pageLimit) {
          break;
        }
      }

      const entries = allEntries;
      if (!entries.length) {
        return "I couldn't find any person profiles on your watchlist. If you're not logged in, please sign in and try again.";
      }

      const rows = entries
        .map((entry) => {
          const profile = entry?.profile || entry?.person || entry || {};
          const wtId = String(profile.Name || profile.name || "").trim();
          if (!wtId) {
            return null;
          }

          return mapApiPersonToStandardRow(profile, {
            wtid: wtId,
            displayName: profile.RealName || profile?.Derived?.ShortName || wtId,
            surnamePreference: "currentFirst",
          });
        })
        .filter(Boolean);

      if (!rows.length) {
        return "I found watchlist entries, but none had usable profile identifiers to display.";
      }

      const knownTotal = Number.isFinite(Number(watchlistCount)) ? Number(watchlistCount) : rows.length;
      const previewRows = rows.slice(0, 12);
      const remainingRows = rows.slice(12);
      const preview = previewRows.map((person) => `- ${person.displayName} (${person.wtid})`).join("\n");
      const inlineMore = remainingRows.length
        ? {
            count: remainingRows.length,
            text: remainingRows.map((person) => `- ${person.displayName} (${person.wtid})`).join("\n"),
          }
        : null;

      const limitNote =
        requestedLimit != null && rows.length < knownTotal
          ? ` Showing first ${rows.length} as requested.`
          : requestedLimit == null && rows.length < knownTotal
          ? ` Loaded ${rows.length} of ${knownTotal}.`
          : "";

      return {
        message: `Here ${rows.length === 1 ? "is" : "are"} ${rows.length} profile${
          rows.length === 1 ? "" : "s"
        } from your watchlist (${knownTotal} total).${limitNote}\n${preview}`,
        inlineMore,
        table: makeWatchlistTable("Your watchlist", rows, [[0, "asc"]]),
      };
    } catch (error) {
      return `I couldn't load your watchlist. Error: ${error?.message || "unknown error"}`;
    }
  }

  return {
    getCc7ProfilesForUser,
    tryHandleCc7LocationPrompt,
    tryHandleCcSummaryPrompt,
    tryHandleWatchlistPrompt,
  };
}
