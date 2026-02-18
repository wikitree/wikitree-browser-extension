/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { addDataMenuAttributes } from "../my_menu/my_menu";
import { isMainDomain, isPlusDomain } from "../../core/pageType";
import { profilePerson, getUserWtId } from "../../core/common";
import suggestionsData from "./suggestions.json";

import { esc, normalizeQuotes, collapseWs, maybeQuote, shortenPlaceholder } from "./wikitree_plus_helper_utils";
import { createFieldDefs } from "./wikitree_plus_helper_fields";
import { SQL_TEMPLATES } from "./wikitree_plus_helper_sql";
import { buildPlusUrl, populatePlusForm, extractSuggestionId } from "./wikitree_plus_helper_url";

import "./wikitree_plus_helper.css";

const FEATURE_ID = "wikitreePlusHelper";
const DB_NAME = "WTPlusQueryBuilder";
const DB_VERSION = 1;
const STORE_NAME = "savedQueries";
const STORAGE_KEY = "wbe_wtplus_saved_queries";

/* --------------------------
   IndexedDB Operations
--------------------------- */

let db = null;

function storageGet(key) {
  return new Promise((resolve, reject) => {
    if (!chrome?.storage?.local) {
      resolve(null);
      return;
    }
    chrome.storage.local.get(key, (result) => {
      const err = chrome.runtime?.lastError;
      if (err) {
        reject(err);
      } else {
        resolve(result[key]);
      }
    });
  });
}

function storageSet(key, value) {
  return new Promise((resolve, reject) => {
    if (!chrome?.storage?.local) {
      resolve();
      return;
    }
    chrome.storage.local.set({ [key]: value }, () => {
      const err = chrome.runtime?.lastError;
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        objectStore.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

async function idbGetAllQueries() {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredQueries() {
  const store = await storageGet(STORAGE_KEY);
  if (store && Array.isArray(store.items)) {
    return store;
  }
  return { lastId: 0, items: [] };
}

async function setStoredQueries(store) {
  await storageSet(STORAGE_KEY, store);
}

async function migrateIdbToStorageIfNeeded(store) {
  if (store.items.length) return store;
  try {
    const idbItems = await idbGetAllQueries();
    if (!idbItems.length) return store;

    const normalized = idbItems.map((q) => ({
      ...q,
      id: Number(q.id) || 0,
    }));
    const lastId = normalized.reduce((maxId, q) => Math.max(maxId, q.id), 0);
    const nextStore = { lastId, items: normalized };
    await setStoredQueries(nextStore);
    return nextStore;
  } catch (err) {
    console.error("Failed to migrate saved queries from IndexedDB:", err);
    return store;
  }
}

async function saveQuery(name, state, queryString) {
  const store = await getStoredQueries();
  const id = store.lastId + 1;
  store.lastId = id;
  store.items.push({
    id,
    name: name || "Untitled Query",
    timestamp: Date.now(),
    state: JSON.parse(JSON.stringify(state)),
    query: queryString,
  });
  await setStoredQueries(store);
  return id;
}

async function getAllQueries() {
  let store = await getStoredQueries();
  store = await migrateIdbToStorageIfNeeded(store);
  const queries = [...store.items];
  queries.sort((a, b) => b.timestamp - a.timestamp);
  return queries;
}

async function deleteQuery(id) {
  const store = await getStoredQueries();
  const nextItems = store.items.filter((q) => String(q.id) !== String(id));
  store.items = nextItems;
  store.lastId = Math.max(0, ...nextItems.map((q) => Number(q.id) || 0));
  await setStoredQueries(store);
}

const MAGIC_WORDS_LIST = buildMagicWords();

function buildMagicWords() {
  const optgroups = [];

  const addGroup = (label, options) => {
    optgroups.push({
      label,
      options: options.map((o) => ({
        value: o.value,
        label: o.label || o.value,
        description: o.description || "",
      })),
    });
  };

  addGroup("Tree & Status", [
    { value: "connected", label: "connected (tree)", description: "Profiles connected to the global tree" },
    {
      value: "Unconnected",
      label: "Unconnected (magic word)",
      description: "Profiles not connected to the global tree",
    },
    { value: "unconnected", label: "unconnected (tree)", description: "Profiles not connected to the global tree" },
    { value: "unlinked", label: "unlinked (tree)", description: "Profiles not connected to any other profile" },
    { value: "PublicTree", label: "PublicTree", description: "Connected to global tree only with public relations" },
    { value: "PrivateTree", label: "PrivateTree", description: "Connected to global tree through private relations" },
    {
      value: "TreeXXX",
      label: "TreeXXX (replace XXX)",
      description: "Profiles in a specific branch. Replace XXX with tree ID",
    },
    { value: "Open", label: "Open", description: "Profiles with Open status" },
    { value: "Unsourced", label: "Unsourced", description: "Profiles with Unsourced status" },
    { value: "Orphan", label: "Orphan", description: "Profiles with no manager" },
    { value: "Notables", label: "Notables", description: "Profiles marked as Notable" },
  ]);

  addGroup("Gender", [
    { value: "male", label: "male", description: "Male profiles" },
    { value: "female", label: "female", description: "Female profiles" },
    { value: "NoGender", label: "NoGender", description: "Profiles with no gender specified" },
  ]);

  addGroup("Locations", [
    { value: "MissingLocation", label: "MissingLocation", description: "Profiles with missing location data" },
    { value: "UnknownCountry", label: "UnknownCountry", description: "Profiles with unknown country" },
    { value: "UnknownRegion", label: "UnknownRegion", description: "Profiles with unknown region" },
    {
      value: "UnofficialLocation",
      label: "UnofficialLocation",
      description: "Profiles with unofficial location names",
    },
  ]);

  addGroup("Dates (prefix)", [
    { value: "B0", label: "B0 (missing birth)", description: "Profiles missing birth date" },
    { value: "D0", label: "D0 (missing death)", description: "Profiles missing death date" },
    { value: "pre1500", label: "pre1500", description: "Profiles born before 1500" },
  ]);

  const centuries = [];
  for (let i = 0; i <= 21; i += 1) {
    const centuryName =
      i === 0
        ? "unknown"
        : i === 1
        ? "first"
        : i === 2
        ? "second"
        : i === 3
        ? "third"
        : i === 21
        ? "twenty first"
        : i === 20
        ? "twentieth"
        : `${i}th`;
    const desc =
      i === 0
        ? "Profiles with no birth date and date couldn't be estimated based on relatives"
        : `Profiles born in ${centuryName} century. For profiles without birthdate, estimation is made based on relatives.`;
    centuries.push({ value: `${i}cen`, label: `${i}cen`, description: desc });
  }
  centuries.reverse();
  addGroup("Centuries", centuries);

  const decades = [];
  for (let y = 0; y <= 2020; y += 10) {
    const endYear = y + 9;
    const desc =
      y >= 2010
        ? `Profiles with birth and death date that were alive between ${y} to ${endYear}. This includes all living people.`
        : `Profiles with birth and death date that were alive between ${y} to ${endYear}.`;
    decades.push({ value: `${y}s`, label: `${y}s`, description: desc });
  }
  decades.reverse();
  addGroup("Decades", decades);

  const ages = [];
  for (let a = 0; a <= 115; a += 1) {
    const desc =
      a === 0 ? "Profiles that were less than 1 year old" : `Profiles that were ${a} year${a === 1 ? "" : "s"} old`;
    ages.push({ value: `age${a}`, label: `age${a}`, description: desc });
  }
  addGroup("Ages", ages);

  addGroup("Relations", [
    { value: "NoFather", label: "NoFather", description: "Profiles with no father" },
    { value: "NoMother", label: "NoMother", description: "Profiles with no mother" },
    { value: "NoParents", label: "NoParents", description: "Profiles with no parents" },
    { value: "NoSpouses", label: "NoSpouses", description: "Profiles with no spouses" },
    { value: "NoChildren", label: "NoChildren", description: "Profiles with no children" },
    { value: "relation=father", label: "relation=father (replace)", description: "Replace results with their fathers" },
    { value: "relation=mother", label: "relation=mother (replace)", description: "Replace results with their mothers" },
    {
      value: "relation=parents",
      label: "relation=parents (replace)",
      description: "Replace results with their parents",
    },
    {
      value: "relation=spouses",
      label: "relation=spouses (replace)",
      description: "Replace results with their spouses",
    },
    {
      value: "relation=children",
      label: "relation=children (replace)",
      description: "Replace results with their children",
    },
    {
      value: "relation=siblings",
      label: "relation=siblings (replace)",
      description: "Replace results with their siblings",
    },
    {
      value: "relation=nuclear",
      label: "relation=nuclear (replace)",
      description: "Replace results with their nuclear family",
    },
    { value: "relation=addfather", label: "relation=addfather (add)", description: "Add fathers to results" },
    { value: "relation=addmother", label: "relation=addmother (add)", description: "Add mothers to results" },
    { value: "relation=addparents", label: "relation=addparents (add)", description: "Add parents to results" },
    { value: "relation=addspouses", label: "relation=addspouses (add)", description: "Add spouses to results" },
    { value: "relation=addchildren", label: "relation=addchildren (add)", description: "Add children to results" },
    { value: "relation=addsiblings", label: "relation=addsiblings (add)", description: "Add siblings to results" },
    { value: "relation=addnuclear", label: "relation=addnuclear (add)", description: "Add nuclear family to results" },
  ]);

  addGroup("DNA", [
    { value: "mtDNA", label: "mtDNA", description: "Profiles with mtDNA test replicated" },
    { value: "yDNA", label: "yDNA", description: "Profiles with yDNA test replicated" },
    { value: "auDNA", label: "auDNA", description: "Profiles with auDNA test replicated" },
    { value: "noGEDMatchID", label: "noGEDMatchID", description: "Profiles without GEDMatch ID" },
    { value: "noMitoyDNAID", label: "noMitoyDNAID", description: "Profiles without Mito or yDNA ID" },
  ]);

  addGroup("Privacy", [
    { value: "Private", label: "Private", description: "Private profiles" },
    { value: "PrivatePB", label: "PrivatePB", description: "Profiles private due to birth date" },
    { value: "PrivatePT", label: "PrivatePT", description: "Profiles private due to privacy toggle" },
    {
      value: "PrivatePBPT",
      label: "PrivatePBPT",
      description: "Profiles private due to both birth date and privacy toggle",
    },
    { value: "Public", label: "Public", description: "Public profiles" },
  ]);

  addGroup("Management", [
    { value: "Guest", label: "Guest", description: "Profiles that are Guests" },
    { value: "ProjectManaged", label: "ProjectManaged", description: "Profiles managed by any project" },
    { value: "PPP", label: "PPP", description: "Project Protected Profiles" },
    { value: "NeverEdited", label: "NeverEdited", description: "Profiles never edited after creation" },
    { value: "ApprovedMerge", label: "ApprovedMerge", description: "Profiles waiting to be merged" },
    { value: "PendingMerge", label: "PendingMerge", description: "Profiles waiting for merge approval" },
    { value: "UnmergedMatch", label: "UnmergedMatch", description: "Profiles with unmerged matches" },
    { value: "GEDCOMJunk", label: "GEDCOMJunk", description: "Profiles with captions considered GEDCOM Junk" },
    { value: "SourceJunk", label: "SourceJunk", description: "Profiles with undesired sources" },
    { value: "IsInWikiData", label: "IsInWikiData", description: "Profiles linked from WikiData" },
  ]);

  const lastEdits = [];
  for (let y = 2008; y <= 2026; y += 1) {
    lastEdits.push({
      value: `LastEdit${y}`,
      label: `LastEdit${y}`,
      description: `Profiles not edited since ${y}`,
    });
  }
  addGroup("Last Edit", lastEdits);

  addGroup("Find A Grave", [
    {
      value: "fgcem1234",
      label: "fgcem1234 (example)",
      description: "Find profiles linked to cemetery ID. Replace 1234 with cemetery ID",
    },
    {
      value: "fgmem1234",
      label: "fgmem1234 (example)",
      description: "Find profile linked to memorial ID. Replace 1234 with memorial ID",
    },
  ]);

  return optgroups;
}

// Build suggestions options from the imported JSON data
function buildSuggestionsOptions() {
  const options = [];
  // Group suggestions by category following the group order
  suggestionsData.group_order?.forEach((groupKey) => {
    const group = suggestionsData.groups?.[groupKey];
    if (!group) return;

    const groupLabel = group.title || groupKey;
    const optgroup = {
      label: groupLabel,
      options: [],
    };

    group.suggestion_ids?.forEach((dbeId) => {
      const suggestion = suggestionsData.suggestions?.[dbeId];
      if (suggestion) {
        optgroup.options.push({
          value: String(suggestion.code),
          label: `${suggestion.code} - ${suggestion.title}`,
        });
      }
    });

    if (optgroup.options.length > 0) {
      options.push(optgroup);
    }
  });

  return options;
}

// Initialize FIELD_DEFS dynamically using createFieldDefs
const FIELD_DEFS = createFieldDefs(MAGIC_WORDS_LIST, buildSuggestionsOptions, getUserWtId);

// SQL Wizard templates - organized by category with comprehensive WT+ SQL examples
// (Imported from wikitree_plus_helper_sql.js)

const GROUP_ORDER = [
  "Names",
  "Profile Status",
  "Dates",
  "Locations",
  "Location Table",
  "Categories and Templates",
  "Management",
  "Other",
  "Magic Words",
  "Suggestions",
];

const MULTI_GROUPS = new Set([
  "Names",
  "General",
  "Magic Words",
  "Dates",
  "Locations",
  "Location Table",
  "Categories and Templates",
  "Management",
  "Other",
]);

/* -------------------------
   Utility functions (imported from wikitree_plus_helper_utils.js)
   - esc(s)
   - normalizeQuotes(s)
   - collapseWs(s)
   - maybeQuote(val)
   - shortenPlaceholder(text)
--------------------------- */

/* URL Building (imported from wikitree_plus_helper_url.js) */

async function copyText(text) {
  const t = String(text ?? "");
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch (e) {
    const $ta = $("<textarea>").val(t).appendTo("body").select();
    document.execCommand("copy");
    $ta.remove();
    return true;
  }
}

function fieldById(id) {
  return FIELD_DEFS.find((f) => f.id === id) || FIELD_DEFS[0];
}

/* --------------------------
   State model
--------------------------- */

const state = {
  groups: [
    {
      rows: [{ not: false, fields: {}, multiFields: {}, sqlConditions: [] }],
    },
  ],
  selectedGroupIndex: 0,
  searchType: "text", // "text" or "suggestions"
};

function newRow() {
  return { not: false, fields: {}, multiFields: {}, sqlConditions: [] };
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* --------------------------
   Query build (OR of AND groups)
   Rule enforcement:
   - positive terms first
   - NOT terms at end of each OR group
   - sql="..." terms last in group
--------------------------- */

function fieldToTerm(fieldId, value) {
  const def = fieldById(fieldId);
  const rawVal = collapseWs(normalizeQuotes(value));

  if (!rawVal) return "";

  if (def.kind === "raw") {
    return rawVal;
  }

  if (def.kind === "prefix") {
    return `${def.prefix}${rawVal}`;
  }

  if (def.kind === "suffix") {
    let processedVal = rawVal;

    // Special handling for Decade: validate and clean up
    if (fieldId === "Decade") {
      // Strip trailing 's' if present
      processedVal = processedVal.replace(/s$/, "");

      // Parse as number
      const num = parseInt(processedVal, 10);
      if (!isNaN(num)) {
        // Round to nearest decade (divisible by 10)
        const rounded = Math.round(num / 10) * 10;
        processedVal = String(rounded);
      }
    }

    return `${processedVal}${def.suffix}`;
  }

  if (def.kind === "sql") {
    // user provides inside of sql="..."
    // normalize to sql="(...)"
    const trimmed = rawVal.trim();
    const isNot = /^NOT\s+/i.test(trimmed);
    const cleaned = trimmed.replace(/^NOT\s+/i, "");
    const inner = cleaned.replace(/^sql\s*=\s*/i, "").replace(/^["']|["']$/g, "");
    return `${isNot ? "NOT " : ""}sql="${inner}"`;
  }

  // index=value
  const idx = def.id;
  let finalVal = rawVal;

  // Special handling for CategoryFull: convert "Manchester, Lancashire" to "Manchester__Lancashire"
  if (idx === "CategoryFull") {
    finalVal = rawVal.replace(/[, ]/g, "_");
  }

  return `${idx}=${maybeQuote(finalVal)}`;
}

function rowToTerms(row) {
  const terms = [];
  Object.entries(row.fields || {}).forEach(([fieldId, value]) => {
    const term = fieldToTerm(fieldId, value);
    if (term) terms.push(term);
  });

  Object.values(row.multiFields || {}).forEach((entries) => {
    entries.forEach((entry) => {
      if (!entry?.fieldId) return;
      const term = fieldToTerm(entry.fieldId, entry.value);
      if (term) terms.push(term);
    });
  });

  (row.sqlConditions || []).forEach((val) => {
    const term = fieldToTerm("sql", val);
    if (term) terms.push(term);
  });

  return terms;
}

function buildQueryForSuggestions() {
  // For suggestions mode: build query using proper field formatting (just like text search)
  // and extract suggestion IDs for ErrorID
  const suggestionIds = [];
  const allTerms = [];

  // Get list of field IDs in Names group to handle them specially
  const nameFieldIds = FIELD_DEFS.filter((f) => f.group === "Names").map((f) => f.id);

  state.groups.forEach((g) => {
    const positives = [];
    const negatives = [];

    g.rows.forEach((row) => {
      // Check for Suggestions field(s) to extract ErrorID
      if (row.fields?.Suggestions) {
        const rawVal = collapseWs(normalizeQuotes(row.fields.Suggestions));
        if (rawVal) {
          suggestionIds.push(rawVal);
        }
      }
      Object.values(row.multiFields || {}).forEach((entries) => {
        entries.forEach((entry) => {
          if (entry?.fieldId === "Suggestions" && entry?.value) {
            const rawVal = collapseWs(normalizeQuotes(entry.value));
            if (rawVal) {
              suggestionIds.push(rawVal);
            }
          }
        });
      });

      // Process name fields - output just the value without field prefix
      Object.entries(row.fields || {}).forEach(([fieldId, value]) => {
        if (nameFieldIds.includes(fieldId) && value) {
          const rawVal = collapseWs(normalizeQuotes(value));
          if (rawVal) {
            if (row.not) {
              negatives.push(rawVal);
            } else {
              positives.push(rawVal);
            }
          }
        }
      });

      // Process name multiFields - output just the value without field prefix
      if (row.multiFields?.Names) {
        row.multiFields.Names.forEach((entry) => {
          if (entry?.fieldId && nameFieldIds.includes(entry.fieldId) && entry.value) {
            const rawVal = collapseWs(normalizeQuotes(entry.value));
            if (rawVal) {
              if (row.not) {
                negatives.push(rawVal);
              } else {
                positives.push(rawVal);
              }
            }
          }
        });
      }

      // Create a copy of the row without Suggestions fields and Name fields
      const rowWithoutSuggestionsAndNames = {
        not: row.not,
        fields: {},
        multiFields: {},
        sqlConditions: row.sqlConditions,
      };

      // Copy fields except Suggestions and Names
      Object.entries(row.fields || {}).forEach(([fieldId, value]) => {
        if (fieldId !== "Suggestions" && !nameFieldIds.includes(fieldId)) {
          rowWithoutSuggestionsAndNames.fields[fieldId] = value;
        }
      });

      // Copy multiFields except Suggestions and Names
      Object.entries(row.multiFields || {}).forEach(([groupName, entries]) => {
        if (groupName !== "Suggestions" && groupName !== "Names") {
          rowWithoutSuggestionsAndNames.multiFields[groupName] = entries.filter(
            (entry) => !nameFieldIds.includes(entry?.fieldId)
          );
        }
      });

      // Get all formatted terms for this row (excluding Suggestions and Names)
      const terms = rowToTerms(rowWithoutSuggestionsAndNames);

      // Apply NOT if needed
      terms.forEach((term) => {
        if (row.not) {
          negatives.push(term);
        } else {
          positives.push(term);
        }
      });
    });

    // Build the group string
    let groupStr = "";
    if (positives.length) groupStr += positives.join(" ");
    if (negatives.length) groupStr += (groupStr ? " " : "") + negatives.map((t) => `NOT ${t}`).join(" ");
    if (groupStr) allTerms.push(groupStr);
  });

  // Join groups with OR
  let query = allTerms.join(" OR ");

  const uniqueIds = [...new Set(suggestionIds.filter((id) => id))];
  const suggestionId = uniqueIds[0] || "";
  const infoMessage = uniqueIds.length > 1 ? "Suggestions search uses only the first selection as ErrorID." : "";

  return { query: query.trim(), warnings: [], onlySql: false, suggestionId, infoMessage };
}

function buildQuery() {
  // For suggestions mode, use simplified comma-separated format
  if (state.searchType === "suggestions") {
    return buildQueryForSuggestions();
  }

  // For text search mode, use field=value format
  const groups = state.groups
    .map((g) => {
      const positives = [];
      const negatives = [];
      const sqls = [];
      const suggestionPositives = [];
      const suggestionNegatives = [];
      const sqlNotWarnings = [];
      const magicWords = []; // Collect magic words separately

      g.rows.forEach((row) => {
        if (row.not && (row.sqlConditions || []).length) {
          sqlNotWarnings.push("sql");
        }

        // Process regular fields
        Object.entries(row.fields || {}).forEach(([fieldId, value]) => {
          const term = fieldToTerm(fieldId, value);
          if (!term) return;

          const isMagicWord = fieldId.startsWith("MagicWords_");

          if (fieldId === "sql") {
            sqls.push(term);
          } else if (fieldId === "Suggestions") {
            const rawVal = value.replace(/^"|"$/g, "");
            if (row.not) {
              suggestionNegatives.push(rawVal);
            } else {
              suggestionPositives.push(rawVal);
            }
          } else if (isMagicWord) {
            if (row.not) {
              magicWords.push(`NOT ${term}`);
            } else {
              magicWords.push(term);
            }
          } else if (row.not) {
            negatives.push(term);
          } else {
            positives.push(term);
          }
        });

        // Process multi-fields
        Object.values(row.multiFields || {}).forEach((entries) => {
          entries.forEach((entry) => {
            if (!entry?.fieldId) return;
            const term = fieldToTerm(entry.fieldId, entry.value);
            if (!term) return;

            const isMagicWord = entry.fieldId.startsWith("MagicWords_");

            if (entry.fieldId === "Suggestions") {
              const rawVal = entry.value.replace(/^"|"$/g, "");
              if (row.not) {
                suggestionNegatives.push(rawVal);
              } else {
                suggestionPositives.push(rawVal);
              }
            } else if (isMagicWord) {
              if (row.not) {
                magicWords.push(`NOT ${term}`);
              } else {
                magicWords.push(term);
              }
            } else if (row.not) {
              negatives.push(term);
            } else {
              positives.push(term);
            }
          });
        });

        // Process SQL conditions
        (row.sqlConditions || []).forEach((val) => {
          const term = fieldToTerm("sql", val);
          if (term) sqls.push(term);
        });
      });

      if (suggestionPositives.length > 0) {
        const uniq = [...new Set(suggestionPositives.filter((v) => v))];
        if (uniq.length === 1) {
          positives.push(`Suggestions=${uniq[0]}`);
        } else if (uniq.length > 1) {
          positives.push(`Suggestions="${uniq.join(" ")}"`);
        }
      }

      if (suggestionNegatives.length > 0) {
        const uniq = [...new Set(suggestionNegatives.filter((v) => v))];
        if (uniq.length === 1) {
          negatives.push(`Suggestions=${uniq[0]}`);
        } else if (uniq.length > 1) {
          negatives.push(`Suggestions="${uniq.join(" ")}"`);
        }
      }

      let s = "";
      if (positives.length) s += positives.join(" ");
      if (negatives.length) s += (s ? " " : "") + negatives.map((t) => `NOT ${t}`).join(" ");
      if (sqls.length) s += (s ? " " : "") + sqls.join(" ");
      if (magicWords.length) s += (s ? " " : "") + magicWords.join(" ");

      const hasNonSql = positives.length > 0 || negatives.length > 0 || magicWords.length > 0;
      const hasSql = sqls.length > 0;

      return { text: collapseWs(s), sqlNotWarnings, onlySql: hasSql && !hasNonSql };
    })
    .filter((x) => x.text);

  const query = groups.map((g) => g.text).join(" OR ");
  const warnings = groups.flatMap((g) => g.sqlNotWarnings || []);
  const onlySql = groups.length > 0 && groups.every((g) => g.onlySql);

  return { query, warnings, onlySql, suggestionId: "", infoMessage: "" };
}

/* --------------------------
   UI
--------------------------- */

function ensureModal() {
  if ($("#wbe-wtplus-orqb-modal").length) return;

  const html = `
    <div id="wbe-wtplus-orqb-modal" class="wbe-wtplus-orqb-modal" style="display:none;">
      <div class="wbe-wtplus-orqb-window">
        <div class="wbe-wtplus-orqb-header">
          <div class="wbe-wtplus-orqb-title">WikiTree+ Query Builder</div>
          <button type="button" class="wbe-wtplus-orqb-close" title="Close">×</button>
        </div>

        <div class="wbe-wtplus-orqb-search-type">
          <label style="font-weight: bold; margin-right: 12px;">Search Type:</label>
          <label style="margin-right: 16px;">
            <input type="radio" name="wbe-wtplus-search-type" value="text" checked> Search text
          </label>
          <label>
            <input type="radio" name="wbe-wtplus-search-type" value="suggestions"> Suggestions text search
          </label>
        </div>

        <div class="wbe-wtplus-orqb-body">
          <div class="wbe-wtplus-orqb-layout">
            <div class="wbe-wtplus-orqb-left">
              <div class="wbe-wtplus-orqb-subtitle">OR groups</div>
              <div id="wbe-wtplus-orqb-groups"></div>
              <div class="wbe-wtplus-orqb-group-actions">
                <button type="button" class="button small" id="wbe-wtplus-orqb-add-group">Add OR Group</button>
              </div>
            </div>

            <div class="wbe-wtplus-orqb-right">
              <div class="wbe-wtplus-orqb-subtitle">AND conditions</div>
              <div id="wbe-wtplus-orqb-rows"></div>

                <button type="button" class="button wbe-wtplus-orqb-open-primary" id="wbe-wtplus-orqb-open">Open in WT+</button>

              <div class="wbe-wtplus-orqb-row-actions">
                <div class="wbe-wtplus-orqb-row-actions-left">
                  <button type="button" class="button small" id="wbe-wtplus-orqb-add-row">Add AND Group</button>
                  <button type="button" class="button small" id="wbe-wtplus-orqb-dup-group">Duplicate Group</button>
                  <button type="button" class="button small" id="wbe-wtplus-orqb-del-group">Delete Group</button>
                </div>
                <div class="wbe-wtplus-orqb-row-actions-right">
                  <button type="button" class="button small" id="wbe-wtplus-orqb-saved">Saved Queries</button>
                  <button type="button" class="button small" id="wbe-wtplus-orqb-save">Save Query</button>
                  <button type="button" class="button small" id="wbe-wtplus-orqb-copy-q">Copy Query</button>
                  <button type="button" class="button small" id="wbe-wtplus-orqb-copy-u">Copy URL</button>
                </div>
              </div>

              <div class="wbe-wtplus-orqb-out">
                <label>Query</label>
                <textarea id="wbe-wtplus-orqb-query" rows="3" spellcheck="false"></textarea>

                <label>WT+ URL</label>
                <textarea id="wbe-wtplus-orqb-url" rows="3" spellcheck="false"></textarea>

                <div id="wbe-wtplus-orqb-status" class="wbe-wtplus-orqb-status"></div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  $("body").append(html);

  $("#wbe-wtplus-orqb-modal").on("click", function (e) {
    if (e.target.id === "wbe-wtplus-orqb-modal") closeModal();
  });
  $(".wbe-wtplus-orqb-close").on("click", closeModal);

  $("input[name='wbe-wtplus-search-type']").on("change", function () {
    state.searchType = $(this).val();
    updateOutput();
  });

  $("#wbe-wtplus-orqb-add-group").on("click", () => {
    state.groups.push({ rows: [newRow()] });
    state.selectedGroupIndex = state.groups.length - 1;
    renderAll();
  });

  $("#wbe-wtplus-orqb-add-row").on("click", () => {
    const g = state.groups[state.selectedGroupIndex];
    g.rows.push(newRow());
    renderAll();
  });

  $("#wbe-wtplus-orqb-dup-group").on("click", () => {
    const g = state.groups[state.selectedGroupIndex];
    state.groups.splice(state.selectedGroupIndex + 1, 0, clone(g));
    state.selectedGroupIndex += 1;
    renderAll();
  });

  $("#wbe-wtplus-orqb-del-group").on("click", () => {
    if (state.groups.length <= 1) return;
    state.groups.splice(state.selectedGroupIndex, 1);
    state.selectedGroupIndex = Math.max(0, state.selectedGroupIndex - 1);
    renderAll();
  });

  $("#wbe-wtplus-orqb-copy-q").on("click", async () => {
    const { query, onlySql } = buildQuery();
    if (onlySql) {
      setStatus("SQL-only searches need at least one non-SQL condition.", true);
      return;
    }
    await copyText(query);
    setStatus("Copied query.");
  });

  $("#wbe-wtplus-orqb-copy-u").on("click", async () => {
    const { query, onlySql, suggestionId } = buildQuery();
    if (onlySql) {
      setStatus("SQL-only searches need at least one non-SQL condition.", true);
      return;
    }
    await copyText(buildPlusUrl(query, state.searchType, false, suggestionId));
    setStatus("Copied URL.");
  });

  $("#wbe-wtplus-orqb-open").on("click", () => {
    const { query, onlySql, suggestionId } = buildQuery();
    if (onlySql) {
      setStatus("SQL-only searches need at least one non-SQL condition.", true);
      return;
    }
    if (query) {
      // Read the actual radio button selection at time of click
      const searchType = $("input[name='wbe-wtplus-search-type']:checked").val() || "text";
      if (isPlusDomain) {
        // On plus domain, navigate to the URL instead of trying to populate forms
        closeModal();
        const url = new URL("https://plus.wikitree.com/default.htm");
        if (searchType === "suggestions") {
          url.searchParams.set("report", "err6");
          if (suggestionId) {
            url.searchParams.set("ErrorID", suggestionId);
            if (query) {
              url.searchParams.set("Query", query);
            }
          } else if (query) {
            url.searchParams.set("Query", query);
          }
          url.searchParams.set("MaxErrors", "1000");
          // Use wbe=1 to signal auto-submit instead of render=1
          url.searchParams.set("wbe", "1");
        } else {
          url.searchParams.set("report", "srch1");
          url.searchParams.set("Query", query);
          url.searchParams.set("render", "1");
        }
        window.location.href = url.toString();
      } else {
        // Otherwise open in new window
        const u = buildPlusUrl(query, searchType, true, suggestionId); // include Render=1 for opening
        window.open(u, "_blank", "noopener,noreferrer");
      }
    }
  });

  $("#wbe-wtplus-orqb-save").on("click", async () => {
    const { query, onlySql } = buildQuery();
    if (onlySql) {
      setStatus("SQL-only searches need at least one non-SQL condition.", true);
      return;
    }
    if (!query.trim()) {
      setStatus("Nothing to save - build a query first.", true);
      return;
    }

    const name = await customPrompt("Enter a name for this query:", "My Query");
    if (name === null || !name.trim()) return; // User cancelled or empty

    try {
      await saveQuery(name.trim(), state, query);
      setStatus("Query saved!");
    } catch (err) {
      console.error("Error saving query:", err);
      setStatus("Failed to save query.", true);
    }
  });

  $("#wbe-wtplus-orqb-saved").on("click", async () => {
    try {
      await showSavedQueriesModal();
    } catch (err) {
      console.error("Error showing saved queries:", err);
      setStatus("Failed to open saved queries.", true);
    }
  });

  // Sync textareas when user manually edits them
  $("#wbe-wtplus-orqb-query").on("input", function () {
    const query = $(this).val();
    if (query.trim()) {
      $("#wbe-wtplus-orqb-url").val(buildPlusUrl(query, state.searchType, false, ""));
    } else {
      $("#wbe-wtplus-orqb-url").val("");
    }
  });

  $("#wbe-wtplus-orqb-url").on("input", function () {
    try {
      const urlStr = $(this).val();
      const url = new URL(urlStr);
      const query = url.searchParams.get("Query") || "";
      $("#wbe-wtplus-orqb-query").val(query);
    } catch (e) {
      // Invalid URL, ignore
    }
  });

  // SQL Wizard add/remove handlers (delegated)
  $(document).on("click", ".wbe-wtplus-orqb-add-sql", function () {
    const $row = $(this).closest(".wbe-wtplus-orqb-row");
    const gidx = state.selectedGroupIndex;
    const ridx = $("#wbe-wtplus-orqb-rows .wbe-wtplus-orqb-row").index($row);
    const row = state.groups[gidx]?.rows?.[ridx];
    if (!row) return;

    openSqlWizard("", function (newValue) {
      if (!row.sqlConditions) row.sqlConditions = [];
      if (newValue) row.sqlConditions.push(newValue);
      renderAll();
    });
  });

  $(document).on("click", ".wbe-wtplus-orqb-del-sql", function () {
    const $row = $(this).closest(".wbe-wtplus-orqb-row");
    const gidx = state.selectedGroupIndex;
    const ridx = $("#wbe-wtplus-orqb-rows .wbe-wtplus-orqb-row").index($row);
    const row = state.groups[gidx]?.rows?.[ridx];
    const idx = Number($(this).closest(".wbe-wtplus-orqb-sql-item").data("index"));
    if (row?.sqlConditions) {
      row.sqlConditions.splice(idx, 1);
      renderAll();
    }
  });
}

function setStatus(msg, isErr = false) {
  $("#wbe-wtplus-orqb-status")
    .text(msg || "")
    .toggleClass("wbe-wtplus-orqb-status--error", !!isErr);
}

function renderGroupsList() {
  const $wrap = $("#wbe-wtplus-orqb-groups");
  $wrap.empty();

  state.groups.forEach((g, idx) => {
    const isSel = idx === state.selectedGroupIndex;
    const label = `Group ${idx + 1}`;

    const $btn = $(`
      <button type="button" class="wbe-wtplus-orqb-group ${isSel ? "is-selected" : ""}">
        ${esc(label)}
      </button>
    `);

    $btn.on("click", () => {
      state.selectedGroupIndex = idx;
      renderAll();
    });

    $wrap.append($btn);
  });
}

function fieldsByGroup() {
  const groups = {};
  FIELD_DEFS.forEach((f) => {
    const grp = f.group || "Other";
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(f);
  });
  return groups;
}

function categorySelectsHtml(rowFields, rowMultiFields) {
  const groups = fieldsByGroup();
  const groupOrder = GROUP_ORDER;

  const renderMultiSelectGroup = (grpName, fieldId, labelText, selectClass) => {
    const field = groups[grpName][0];
    if (!field) return "";

    const entries = rowMultiFields?.[grpName]?.length ? rowMultiFields[grpName] : [{ fieldId, value: "" }];
    const opts = typeof field.options === "function" ? field.options() : field.options;

    const buildOptionsHtml = (options, currentValue) => {
      let htmlOptions = '<option value=""></option>';
      if (!options || !Array.isArray(options)) return htmlOptions;

      options.forEach((item) => {
        if (item.label && item.options) {
          const optgroupItems = item.options
            .map((o) => {
              const sel = String(o.value) === String(currentValue) ? " selected" : "";
              const title = o.description ? ` title="${esc(o.description)}"` : "";
              return `<option value="${esc(o.value)}"${sel}${title}>${esc(o.label)}</option>`;
            })
            .join("");
          htmlOptions += `<optgroup label="${esc(item.label)}">${optgroupItems}</optgroup>`;
        } else {
          const optVal = typeof item === "object" && item !== null ? item.value : item;
          const optLabel = typeof item === "object" && item !== null ? item.label : item;
          const optDesc = typeof item === "object" && item !== null ? item.description : "";
          const sel = String(optVal) === String(currentValue) ? " selected" : "";
          const title = optDesc ? ` title="${esc(optDesc)}"` : "";
          htmlOptions += `<option value="${esc(optVal)}"${sel}${title}>${esc(optLabel)}</option>`;
        }
      });

      return htmlOptions;
    };

    const entryHtml = entries
      .map((entry, idx) => {
        const selectId = `wbe-wtplus-${grpName.toLowerCase()}-${idx}`;
        const currentValue = entry?.value || "";
        const htmlOptions = buildOptionsHtml(opts, currentValue);

        const orLabel = idx > 0 ? '<span class="wbe-wtplus-orqb-or">OR</span>' : "";
        return `
          <div class="wbe-wtplus-orqb-multi-item" data-index="${idx}">
            ${orLabel}
            <select id="${selectId}" class="${selectClass}" data-index="${idx}" aria-label="${labelText}">
              ${htmlOptions}
            </select>
            <button type="button" class="button small wbe-wtplus-orqb-del-multi" title="Remove" ${
              !currentValue ? 'style="visibility: hidden;"' : ""
            }>×</button>
          </div>
        `;
      })
      .join("");

    return `
      <div class="wbe-wtplus-orqb-field-group wbe-wtplus-orqb-field-group--multi" data-group="${grpName}">
        <div class="wbe-wtplus-orqb-field-group-header">
          <label>${labelText}:</label>
        </div>
        <div class="wbe-wtplus-orqb-multi-list">
          ${entryHtml}
        </div>
      </div>
    `;
  };

  let html = "";
  groupOrder.forEach((grpName) => {
    if (!groups[grpName]) return;

    if (grpName === "Suggestions") {
      html += renderMultiSelectGroup("Suggestions", "Suggestions", "Suggestions", "wbe-wtplus-suggestions-select");
      return;
    }

    if (grpName === "Profile Status") {
      html += renderMultiSelectGroup(
        "Profile Status",
        "ProfileStatus",
        "Profile Status",
        "wbe-wtplus-profilestatus-select"
      );
      return;
    }

    if (MULTI_GROUPS.has(grpName)) {
      const entries = rowMultiFields?.[grpName]?.length ? rowMultiFields[grpName] : [{ fieldId: "", value: "" }];

      const entryHtml = entries
        .map((entry, idx) => {
          const opts = groups[grpName]
            .map((f) => {
              const sel = f.id === entry.fieldId ? " selected" : "";
              return `<option value="${esc(f.id)}"${sel}>${esc(f.label)}</option>`;
            })
            .join("");

          let inputHtml = "";
          if (entry.fieldId) {
            const def = fieldById(entry.fieldId);
            inputHtml = valueInputHtml(def, entry.value);
          } else {
            inputHtml = `<input class="wbe-wtplus-orqb-value" type="text" value="" disabled style="visibility:hidden;">`;
          }

          return `
            <div class="wbe-wtplus-orqb-multi-item" data-index="${idx}">
              <select class="wbe-wtplus-orqb-field-select" data-group="${esc(grpName)}" data-index="${idx}">
                <option value="">-</option>
                ${opts}
              </select>
              <div class="wbe-wtplus-orqb-field-input">
                <div class="wbe-wtplus-orqb-input-hint"></div>
                ${inputHtml}
              </div>
              ${
                entry.fieldId || entry.value
                  ? `<button type="button" class="button small wbe-wtplus-orqb-del-multi" title="Remove">×</button>`
                  : ""
              }
            </div>
          `;
        })
        .join("");

      html += `
        <div class="wbe-wtplus-orqb-field-group wbe-wtplus-orqb-field-group--multi" data-group="${esc(grpName)}">
          <div class="wbe-wtplus-orqb-field-group-header">
            <label>${esc(grpName)}:</label>
          </div>
          <div class="wbe-wtplus-orqb-multi-list">
            ${entryHtml}
          </div>
        </div>
      `;
    } else {
      // Find which field (if any) from this group is selected in rowFields
      let selectedFieldId = "";
      let selectedValue = "";
      Object.keys(rowFields || {}).forEach((fid) => {
        const def = fieldById(fid);
        if (def && def.group === grpName) {
          selectedFieldId = fid;
          selectedValue = rowFields[fid];
        }
      });

      const opts = groups[grpName]
        .map((f) => {
          const sel = f.id === selectedFieldId ? " selected" : "";
          return `<option value="${esc(f.id)}"${sel}>${esc(f.label)}</option>`;
        })
        .join("");

      // Generate the input HTML for the selected field
      let inputHtml = "";
      if (selectedFieldId) {
        const def = fieldById(selectedFieldId);
        inputHtml = valueInputHtml(def, selectedValue);
      } else {
        // No field selected - show hidden disabled input
        inputHtml = `<input class="wbe-wtplus-orqb-value" type="text" value="" disabled style="visibility:hidden;">`;
      }

      html += `
        <div class="wbe-wtplus-orqb-field-group">
          <label>${esc(grpName)}:</label>
          <select class="wbe-wtplus-orqb-field-select" data-group="${esc(grpName)}">
            <option value="">-</option>
            ${opts}
          </select>
          <div class="wbe-wtplus-orqb-field-input">
            <div class="wbe-wtplus-orqb-input-hint"></div>
            <div class="wbe-wtplus-orqb-input-hint"></div>
            ${inputHtml}
          </div>
        </div>
      `;
    }
  });

  return html;
}

function valueInputHtml(def, value) {
  const v = value ?? "";

  if (def.input === "select") {
    let opts = def.options || [];

    // If options is a function, call it to get the actual options
    if (typeof opts === "function") {
      opts = opts();
    }

    // Build HTML for optgroups or flat options
    let optionsHtml = "";
    opts.forEach((item) => {
      if (item.label && item.options) {
        // This is an optgroup
        const optgroupItems = item.options
          .map((o) => {
            const sel = String(o.value) === String(v) ? " selected" : "";
            const title = o.description ? ` title="${esc(o.description)}"` : "";
            return `<option value="${esc(o.value)}"${sel}${title}>${esc(o.label)}</option>`;
          })
          .join("");
        optionsHtml += `<optgroup label="${esc(item.label)}">${optgroupItems}</optgroup>`;
      } else {
        // Flat option (string or {value, label})
        const optVal = typeof item === "object" && item !== null ? item.value : item;
        const optLabel = typeof item === "object" && item !== null ? item.label : item;
        const optDesc = typeof item === "object" && item !== null ? item.description : "";
        const sel = String(optVal) === String(v) ? " selected" : "";
        const title = optDesc ? ` title="${esc(optDesc)}"` : "";
        optionsHtml += `<option value="${esc(optVal)}"${sel}${title}>${esc(optLabel)}</option>`;
      }
    });

    return `<select class="wbe-wtplus-orqb-value">${optionsHtml}</select>`;
  }

  if (def.input === "wizard") {
    return `<button type="button" class="button small wbe-wtplus-sql-wizard" data-value="${esc(
      v
    )}" title="Open SQL Wizard">SQL Wizard ${v ? "(configured)" : ""}</button>`;
  }

  // text - handle dynamic placeholders (functions)
  const placeholder = typeof def.placeholder === "function" ? def.placeholder() : def.placeholder || "";
  const shortPlaceholder = shortenPlaceholder(placeholder);
  const title = placeholder ? ` title="${esc(placeholder)}"` : "";
  const dataHint = placeholder ? ` data-hint="${esc(placeholder)}"` : "";
  const inputId = `wbe-wtplus-input-${def.id}-${Math.random().toString(36).substr(2, 9)}`;
  return `<input id="${inputId}" class="wbe-wtplus-orqb-value" type="text" value="${esc(v)}" placeholder="${esc(
    shortPlaceholder
  )}"${title}${dataHint}>`;
}

function renderRows() {
  const gidx = state.selectedGroupIndex;
  const g = state.groups[gidx];
  const $wrap = $("#wbe-wtplus-orqb-rows");

  $wrap.empty();
  g.rows.forEach((row, ridx) => {
    const $row = $(`
      <div class="wbe-wtplus-orqb-row">
        <label class="wbe-wtplus-orqb-not">
          <input type="checkbox" class="wbe-wtplus-orqb-notbox" ${row.not ? "checked" : ""}>
          NOT
        </label>

        <div class="wbe-wtplus-orqb-row-main">
          <div class="wbe-wtplus-orqb-field-container">
            ${categorySelectsHtml(row.fields || {}, row.multiFields || {})}
          </div>

          <div class="wbe-wtplus-orqb-sql-block">
            <div class="wbe-wtplus-orqb-sql-header">
              <span>SQL</span>
              <button type="button" class="button small wbe-wtplus-orqb-add-sql" title="Add SQL condition">SQL Wizard</button>
            </div>
            <div class="wbe-wtplus-orqb-sql-list">
              ${(row.sqlConditions || [])
                .map(
                  (val, idx) => `
                  <div class="wbe-wtplus-orqb-sql-item" data-index="${idx}">
                    <code>${esc(val)}</code>
                    ${
                      val
                        ? `<button type="button" class="button small wbe-wtplus-orqb-del-sql" title="Remove">×</button>`
                        : ""
                    }
                  </div>
                `
                )
                .join("")}
            </div>
          </div>
        </div>

        <button type="button" class="button small wbe-wtplus-orqb-del-row" title="Remove">×</button>
      </div>
    `);

    // Set default values for select inputs
    $row.find(".wbe-wtplus-orqb-field-select").each(function () {
      const $select = $(this);
      const fieldId = $select.val();
      const grpName = $select.data("group");
      const idx = $select.data("index");

      if (fieldId) {
        const def = fieldById(fieldId);
        const $group = $select.closest(".wbe-wtplus-orqb-multi-item, .wbe-wtplus-orqb-field-group");
        const $value = $group.find(".wbe-wtplus-orqb-value");

        if (def.input === "select" && !$value.val()) {
          const firstOpt = def.options?.[0];
          const defaultVal = typeof firstOpt === "object" && firstOpt !== null ? firstOpt.value : firstOpt || "";
          $value.val(defaultVal);

          if (MULTI_GROUPS.has(grpName) && idx !== undefined) {
            if (!row.multiFields) row.multiFields = {};
            if (!row.multiFields[grpName]) row.multiFields[grpName] = [];
            if (!row.multiFields[grpName][idx]) row.multiFields[grpName][idx] = { fieldId, value: "" };
            row.multiFields[grpName][idx].value = defaultVal;
          } else {
            if (!row.fields) row.fields = {};
            row.fields[fieldId] = defaultVal;
          }
        }
      }
    });

    $row.on("change", ".wbe-wtplus-orqb-notbox", function () {
      row.not = !!$(this).is(":checked");
      updateOutput();
    });

    $row.on("change", ".wbe-wtplus-suggestions-select", function () {
      const idx = Number($(this).data("index"));
      const val = $(this).val();
      if (!row.multiFields) row.multiFields = {};
      if (!row.multiFields.Suggestions) row.multiFields.Suggestions = [];
      if (!row.multiFields.Suggestions[idx]) {
        row.multiFields.Suggestions[idx] = { fieldId: "Suggestions", value: "" };
      }

      row.multiFields.Suggestions[idx].fieldId = "Suggestions";
      row.multiFields.Suggestions[idx].value = val;

      const lastIdx = row.multiFields.Suggestions.length - 1;
      if (idx === lastIdx && val) {
        row.multiFields.Suggestions.push({ fieldId: "Suggestions", value: "" });
      }

      updateOutput();
      renderAll();
    });

    $row.on("change", ".wbe-wtplus-profilestatus-select", function () {
      const idx = Number($(this).data("index"));
      const val = $(this).val();
      if (!row.multiFields) row.multiFields = {};
      if (!row.multiFields["Profile Status"]) row.multiFields["Profile Status"] = [];
      if (!row.multiFields["Profile Status"][idx]) {
        row.multiFields["Profile Status"][idx] = { fieldId: "ProfileStatus", value: "" };
      }

      row.multiFields["Profile Status"][idx].fieldId = "ProfileStatus";
      row.multiFields["Profile Status"][idx].value = val;

      const lastIdx = row.multiFields["Profile Status"].length - 1;
      if (idx === lastIdx && val) {
        row.multiFields["Profile Status"].push({ fieldId: "ProfileStatus", value: "" });
      }

      updateOutput();
      renderAll();
    });

    // Always show input hints when available
    const syncInputHints = ($scope) => {
      $scope.find(".wbe-wtplus-orqb-input-hint").each(function () {
        const $hint = $(this);
        const $input = $hint.closest(".wbe-wtplus-orqb-field-input").find(".wbe-wtplus-orqb-value[data-hint]");
        const hint = $input.attr("data-hint") || "";
        if (hint) {
          $hint.text(hint).show();
        } else {
          $hint.text("").hide();
        }
      });
    };
    syncInputHints($row);

    $row.on("change", ".wbe-wtplus-orqb-field-select", function () {
      const $select = $(this);
      const grpName = $select.data("group");
      const idx = $select.data("index");
      const newField = $select.val();

      if (MULTI_GROUPS.has(grpName) && idx !== undefined) {
        if (!row.multiFields) row.multiFields = {};
        if (!row.multiFields[grpName]) row.multiFields[grpName] = [];
        if (!row.multiFields[grpName][idx]) row.multiFields[grpName][idx] = { fieldId: "", value: "" };

        if (newField) {
          const nd = fieldById(newField);
          row.multiFields[grpName][idx].fieldId = newField;
          if (nd.input === "select") {
            const firstOpt = nd.options?.[0];
            const optVal = typeof firstOpt === "object" && firstOpt !== null ? firstOpt.value : firstOpt;
            row.multiFields[grpName][idx].value = optVal || "";
          } else {
            row.multiFields[grpName][idx].value = "";
          }
          // Auto-add another blank entry when the last entry is used
          if (idx === row.multiFields[grpName].length - 1) {
            row.multiFields[grpName].push({ fieldId: "", value: "" });
          }
        } else {
          row.multiFields[grpName][idx].fieldId = "";
          row.multiFields[grpName][idx].value = "";
        }

        renderAll();
        return;
      }

      if (!row.fields) row.fields = {};

      // Remove any previous field from this group
      Object.keys(row.fields).forEach((fid) => {
        if (fieldById(fid).group === grpName) {
          delete row.fields[fid];
        }
      });

      if (newField) {
        const nd = fieldById(newField);
        // Set default value for select inputs
        if (nd.input === "select") {
          const firstOpt = nd.options?.[0];
          const optVal = typeof firstOpt === "object" && firstOpt !== null ? firstOpt.value : firstOpt;
          row.fields[newField] = optVal || "";
        } else {
          row.fields[newField] = "";
        }
      }

      renderAll();
    });

    $row.on("input change", ".wbe-wtplus-orqb-value", function () {
      const $select = $(this)
        .closest(".wbe-wtplus-orqb-multi-item, .wbe-wtplus-orqb-field-group")
        .find(".wbe-wtplus-orqb-field-select");
      const fieldId = $select.val();
      const grpName = $select.data("group");
      const idx = $select.data("index");

      if (fieldId) {
        if (MULTI_GROUPS.has(grpName) && idx !== undefined) {
          if (!row.multiFields) row.multiFields = {};
          if (!row.multiFields[grpName]) row.multiFields[grpName] = [];
          if (!row.multiFields[grpName][idx]) row.multiFields[grpName][idx] = { fieldId, value: "" };
          row.multiFields[grpName][idx].value = $(this).val();
        } else {
          if (!row.fields) row.fields = {};
          row.fields[fieldId] = $(this).val();
        }
        updateOutput();
      }
    });

    $row.on("click", ".wbe-wtplus-orqb-del-multi", function () {
      const $item = $(this).closest(".wbe-wtplus-orqb-multi-item");
      const idx = Number($item.data("index"));
      const grpName = $(this).closest(".wbe-wtplus-orqb-field-group").data("group");
      if (row.multiFields?.[grpName]) {
        row.multiFields[grpName].splice(idx, 1);
        if (row.multiFields[grpName].length === 0) {
          let defaultFieldId = "";
          if (grpName === "Suggestions") defaultFieldId = "Suggestions";
          if (grpName === "Profile Status") defaultFieldId = "ProfileStatus";
          row.multiFields[grpName].push({ fieldId: defaultFieldId, value: "" });
        }
      }
      renderAll();
    });

    // SQL actions handled via delegated events

    $row.on("click", ".wbe-wtplus-orqb-del-row", function () {
      g.rows.splice(ridx, 1);
      if (g.rows.length === 0) g.rows.push(newRow());
      renderAll();
    });

    $wrap.append($row);
  });
}

function openSqlWizard(currentValue, callback) {
  const currentRaw = String(currentValue || "").trim();
  // Check for NOT prefix, not(...), or sql="Not(...)"
  const currentNot =
    /^NOT\s+/i.test(currentRaw) || /^not\(/i.test(currentRaw) || /^sql\s*=\s*["']\s*not\s*\(/i.test(currentRaw);
  let currentClean = currentRaw.replace(/^NOT\s+/i, "");
  // If wrapped in not(...), extract the inner content
  if (/^not\(/i.test(currentClean)) {
    currentClean = currentClean.replace(/^not\(/i, "").replace(/\)$/, "");
  }
  const manualSeed = currentClean
    .replace(/^sql\s*=\s*/i, "")
    .replace(/^["']|["']$/g, "")
    .replace(/^not\s*\(/i, "")
    .replace(/\)$/, "");

  // Group templates by category
  const byCategory = {};
  SQL_TEMPLATES.forEach((t) => {
    if (!byCategory[t.category]) byCategory[t.category] = [];
    byCategory[t.category].push(t);
  });
  const categories = Object.keys(byCategory).sort();

  // Create wizard modal with improved UX
  const wizardHtml = `
    <div id="wbe-wtplus-sql-wizard-modal" class="wbe-wtplus-modal" style="display: block; z-index: 9999999;">
      <div class="wbe-wtplus-modal-content wbe-wtplus-sql-wizard-content" style="max-width: 700px; max-height: 85vh;">
        <div class="wbe-wtplus-sql-wizard-header">
          <h2 style="margin: 0;">SQL Wizard</h2>
          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="font-size: 12px; color: #444; display: inline-flex; align-items: center; gap: 6px;">
              <input type="checkbox" id="wbe-wtplus-sql-not">
              NOT
            </label>
            <span class="wbe-wtplus-close" title="Close">&times;</span>
          </div>
        </div>
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">Choose a template, fill in parameters, and see SQL preview</p>
        
        <div id="wbe-wtplus-sql-templates" style="display: block;">
          <input type="text" id="wbe-wtplus-sql-search" placeholder="Search templates..." style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 12px; box-sizing: border-box;">
          <div id="wbe-wtplus-sql-templates-list" style="max-height: 400px; overflow-y: auto;">
            ${categories
              .map(
                (cat) => `
              <div class="wbe-wtplus-sql-category" data-category="${esc(cat)}">
                <h4 style="margin: 12px 0 6px 0; padding: 4px 0; border-bottom: 1px solid #ddd; color: #25422d; font-size: 12px; text-transform: uppercase;">${esc(
                  cat
                )}</h4>
                ${byCategory[cat]
                  .map(
                    (t) => `
                  <div class="wbe-wtplus-sql-template" data-template-id="${esc(
                    t.id
                  )}" style="margin: 6px 0; padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                    <div style="font-weight: 500; color: #25422d;">${esc(t.label)}</div>
                    <div style="font-size: 12px; color: #666;">${esc(t.description)}</div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            `
              )
              .join("")}
          </div>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd;">
            <a href="#" id="wbe-wtplus-sql-wizard-manual" style="color: #0066cc; text-decoration: none; font-size: 13px;">Or enter SQL manually →</a>
          </div>
        </div>
        
        <div id="wbe-wtplus-sql-inputs" style="display: none;">
          <div id="wbe-wtplus-sql-template-title" style="margin-bottom: 12px;"><strong></strong></div>
          <div id="wbe-wtplus-sql-input-fields" style="margin-bottom: 12px;"></div>
          <div style="background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 10px; margin-bottom: 12px;">
            <div style="font-size: 11px; color: #999; margin-bottom: 4px;">SQL Preview:</div>
            <div id="wbe-wtplus-sql-preview" style="font-family: monospace; font-size: 12px; color: #333; word-break: break-all; min-height: 30px;"><em>Fill in values to see preview</em></div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="button" id="wbe-wtplus-sql-generate" style="flex: 1;">Use This SQL</button>
            <button type="button" class="button" id="wbe-wtplus-sql-back" style="flex: 0;">Back</button>
          </div>
        </div>
        
        <div id="wbe-wtplus-sql-manual" style="display: none;">
          <h3 style="margin-top: 0;">Enter SQL manually</h3>
          <p style="font-size: 12px; color: #666; margin: 8px 0;">Paste your WT+ SQL condition. It will be wrapped in sql="..."</p>
          <textarea id="wbe-wtplus-sql-manual-input" style="width: 100%; height: 120px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; box-sizing: border-box;" placeholder="([Default].[First Name].AsString = '')">${esc(
            manualSeed
          )}</textarea>
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button type="button" class="button" id="wbe-wtplus-sql-manual-save" style="flex: 1;">Use This SQL</button>
            <button type="button" class="button" id="wbe-wtplus-sql-manual-back" style="flex: 0;">Back</button>
          </div>
        </div>
      </div>
    </div>
  `;

  $("body").append(wizardHtml);
  const $modal = $("#wbe-wtplus-sql-wizard-modal");
  const $content = $modal.find(".wbe-wtplus-sql-wizard-content");
  const $not = $modal.find("#wbe-wtplus-sql-not");
  if (currentNot) $not.prop("checked", true);
  const applyNot = (sql) => {
    if (!$not.is(":checked")) return sql;

    const sqlMatch = String(sql || "")
      .trim()
      .match(/^sql\s*=\s*(["'])([\s\S]*)\1$/i);
    if (sqlMatch) {
      const quote = sqlMatch[1];
      const inner = sqlMatch[2].trim();
      if (/^not\s*\(/i.test(inner)) {
        return `sql=${quote}${inner}${quote}`;
      }
      return `sql=${quote}Not (${inner})${quote}`;
    }

    return `not(${sql})`;
  };

  function closeWizard() {
    $modal.remove();
  }

  $modal.find(".wbe-wtplus-close").on("click", closeWizard);

  // Position and make draggable
  try {
    const top = Math.max(24, Math.round(window.innerHeight * 0.08));
    const left = Math.max(24, Math.round((window.innerWidth - $content.outerWidth()) / 2));
    $content.css({ top: `${top}px`, left: `${left}px`, transform: "none", position: "fixed" });
    $content.draggable({ handle: ".wbe-wtplus-sql-wizard-header", containment: "window" });
  } catch (e) {
    // draggable may not be available in all contexts
  }

  // Search templates
  let selectedTemplate = null;
  const $search = $modal.find("#wbe-wtplus-sql-search");
  const $templatesList = $modal.find("#wbe-wtplus-sql-templates-list");

  $search.on("keyup", function () {
    const query = $(this).val().toLowerCase();
    $templatesList.find(".wbe-wtplus-sql-template").each(function () {
      const $t = $(this);
      const label = $t.find("div:first").text().toLowerCase();
      const desc = $t.find("div:last").text().toLowerCase();
      const match = label.includes(query) || desc.includes(query) || query === "";
      $t.toggle(match);
    });
    $templatesList.find(".wbe-wtplus-sql-category").each(function () {
      const $cat = $(this);
      const visible = $cat.find(".wbe-wtplus-sql-template:visible").length > 0;
      $cat.toggle(visible);
    });
  });

  // Template selection
  $modal.on("click", ".wbe-wtplus-sql-template", function () {
    selectedTemplate = SQL_TEMPLATES.find((t) => t.id === $(this).data("template-id"));
    if (selectedTemplate) {
      $modal.find("#wbe-wtplus-sql-templates").hide();
      $modal.find("#wbe-wtplus-sql-template-title").find("strong").text(selectedTemplate.label);

      if (selectedTemplate.inputs.length === 0) {
        // No inputs needed, use immediately
        const sql = selectedTemplate.buildSql();
        callback(applyNot(sql));
        closeWizard();
      } else {
        // Show input form with preview
        const inputHtml = selectedTemplate.inputs
          .map(
            (inp, idx) => `
          <div style="margin: 10px 0;">
            <label style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 13px;">${esc(
              inp.label
            )}:</label>
            <input type="${esc(inp.type)}" class="wbe-wtplus-sql-input" data-index="${idx}" placeholder="${esc(
              shortenPlaceholder(inp.placeholder)
            )}" title="${esc(
              inp.placeholder || ""
            )}" style="padding: 6px; border: 1px solid #ccc; border-radius: 3px; width: 100%; box-sizing: border-box;">
          </div>
        `
          )
          .join("");
        $modal.find("#wbe-wtplus-sql-input-fields").html(inputHtml);
        $modal.find("#wbe-wtplus-sql-inputs").show();

        // Live preview
        function updatePreview() {
          const values = selectedTemplate.inputs.map((inp, idx) => {
            return $modal.find(`.wbe-wtplus-sql-input[data-index="${idx}"]`).val();
          });
          const sql = selectedTemplate.buildSql(...values);
          if (sql) {
            const previewSql = applyNot(sql);
            $modal.find("#wbe-wtplus-sql-preview").text(previewSql);
          } else {
            $modal
              .find("#wbe-wtplus-sql-preview")
              .html("<em style='color: #999;'>Fill in required fields to see preview</em>");
          }
        }
        $modal.on("input", ".wbe-wtplus-sql-input", updatePreview);
        $modal.on("change", "#wbe-wtplus-sql-not", updatePreview);
        updatePreview();
      }
    }
  });

  // Generate SQL
  $modal.find("#wbe-wtplus-sql-generate").on("click", function () {
    if (selectedTemplate) {
      const values = selectedTemplate.inputs.map((inp, idx) => {
        return $modal.find(`.wbe-wtplus-sql-input[data-index="${idx}"]`).val();
      });
      const sql = selectedTemplate.buildSql(...values);
      if (sql) {
        callback(applyNot(sql));
        closeWizard();
      } else {
        alert("Please fill in all required fields.");
      }
    }
  });

  // Back to templates
  $modal.find("#wbe-wtplus-sql-back").on("click", function () {
    selectedTemplate = null;
    $modal.find("#wbe-wtplus-sql-inputs").hide();
    $modal.find("#wbe-wtplus-sql-templates").show();
  });

  // Manual SQL entry
  $modal.find("#wbe-wtplus-sql-wizard-manual").on("click", function (e) {
    e.preventDefault();
    $modal.find("#wbe-wtplus-sql-templates").hide();
    $modal.find("#wbe-wtplus-sql-manual").show();
  });

  $modal.find("#wbe-wtplus-sql-manual-save").on("click", function () {
    const manualSql = $modal.find("#wbe-wtplus-sql-manual-input").val().trim();
    if (manualSql) {
      const cleaned = manualSql.replace(/^NOT\s+/i, "");
      const finalSql = $not.is(":checked") ? `NOT ${cleaned}` : cleaned;
      callback(finalSql);
      closeWizard();
    } else {
      alert("Please enter SQL");
    }
  });

  $modal.find("#wbe-wtplus-sql-manual-back").on("click", function () {
    $modal.find("#wbe-wtplus-sql-manual").hide();
    $modal.find("#wbe-wtplus-sql-templates").show();
  });
}

function updateOutput() {
  const { query, warnings, suggestionId, infoMessage } = buildQuery();

  $("#wbe-wtplus-orqb-query").val(query);

  // Only populate URL if query has content
  if (query.trim()) {
    $("#wbe-wtplus-orqb-url").val(buildPlusUrl(query, state.searchType, false, suggestionId));
  } else {
    $("#wbe-wtplus-orqb-url").val("");
  }

  if (warnings.length) {
    setStatus(`NOT on sql rows: put NOT inside SQL (not(...)).`, true);
  } else if (infoMessage) {
    setStatus(infoMessage);
  } else {
    setStatus("");
  }

  const hasQuery = !!query.trim();
  $("#wbe-wtplus-orqb-open").prop("disabled", !hasQuery);
}

function renderAll() {
  renderGroupsList();
  renderRows();
  updateOutput();
}

/* --------------------------
   Entry point (Find menu + fallback button)
--------------------------- */

function openModal() {
  ensureModal();

  renderAll();
  $("#wbe-wtplus-orqb-modal").show();
}

function closeModal() {
  $("#wbe-wtplus-orqb-modal").hide();
}

function customPrompt(message, defaultValue = "") {
  return new Promise((resolve) => {
    const modalHtml = `
      <div id="wbe-wtplus-prompt-modal" class="wbe-wtplus-modal" style="display: flex;">
        <div class="wbe-wtplus-modal-content" style="max-width: 500px;">
          <div class="wbe-wtplus-modal-header">
            <h2 style="margin: 0; font-size: 18px; color: #25422d;">${esc(message)}</h2>
            <span class="wbe-wtplus-close" title="Close">&times;</span>
          </div>
          <div style="margin: 16px 0;">
            <input type="text" id="wbe-wtplus-prompt-input" value="${esc(
              defaultValue
            )}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 14px;">
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" class="button" id="wbe-wtplus-prompt-cancel" style="padding: 8px 16px;">Cancel</button>
            <button type="button" class="button" id="wbe-wtplus-prompt-ok" style="padding: 8px 16px; background: #25422d; color: white;">OK</button>
          </div>
        </div>
      </div>
    `;

    $("body").append(modalHtml);
    const $modal = $("#wbe-wtplus-prompt-modal");
    const $input = $("#wbe-wtplus-prompt-input");

    // Focus and select input
    setTimeout(() => {
      $input.focus().select();
    }, 100);

    // Make draggable
    $modal.find(".wbe-wtplus-modal-content").draggable({ handle: ".wbe-wtplus-modal-header", containment: "window" });

    const cleanup = (value) => {
      $modal.remove();
      resolve(value);
    };

    $modal.on("click", ".wbe-wtplus-close", () => cleanup(null));
    $modal.on("click", "#wbe-wtplus-prompt-cancel", () => cleanup(null));
    $modal.on("click", "#wbe-wtplus-prompt-ok", () => cleanup($input.val()));

    // Handle Enter key
    $input.on("keydown", (e) => {
      if (e.key === "Enter") cleanup($input.val());
      if (e.key === "Escape") cleanup(null);
    });

    // Close on backdrop click
    $modal.on("click", (e) => {
      if (e.target.id === "wbe-wtplus-prompt-modal") cleanup(null);
    });
  });
}

function customConfirm(message) {
  return new Promise((resolve) => {
    const modalHtml = `
      <div id="wbe-wtplus-confirm-modal" class="wbe-wtplus-modal" style="display: flex;">
        <div class="wbe-wtplus-modal-content" style="max-width: 500px;">
          <div class="wbe-wtplus-modal-header">
            <h2 style="margin: 0; font-size: 18px; color: #25422d;">Confirm</h2>
            <span class="wbe-wtplus-close" title="Close">&times;</span>
          </div>
          <div style="margin: 16px 0; font-size: 14px; color: #333;">
            ${esc(message)}
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" class="button" id="wbe-wtplus-confirm-cancel" style="padding: 8px 16px;">Cancel</button>
            <button type="button" class="button" id="wbe-wtplus-confirm-ok" style="padding: 8px 16px; background: #d32f2f; color: white;">Delete</button>
          </div>
        </div>
      </div>
    `;

    $("body").append(modalHtml);
    const $modal = $("#wbe-wtplus-confirm-modal");

    // Make draggable
    $modal.find(".wbe-wtplus-modal-content").draggable({ handle: ".wbe-wtplus-modal-header", containment: "window" });

    const cleanup = (value) => {
      $modal.remove();
      resolve(value);
    };

    $modal.on("click", ".wbe-wtplus-close", () => cleanup(false));
    $modal.on("click", "#wbe-wtplus-confirm-cancel", () => cleanup(false));
    $modal.on("click", "#wbe-wtplus-confirm-ok", () => cleanup(true));

    // Close on backdrop click
    $modal.on("click", (e) => {
      if (e.target.id === "wbe-wtplus-confirm-modal") cleanup(false);
    });

    // Handle Escape key
    $(document).one("keydown.wbe-confirm", (e) => {
      if (e.key === "Escape") cleanup(false);
    });
  });
}

async function showSavedQueriesModal() {
  try {
    const queries = await getAllQueries();

    const modalHtml = `
      <div id="wbe-wtplus-saved-queries-modal" class="wbe-wtplus-modal" style="display: flex;">
        <div class="wbe-wtplus-modal-content" style="max-width: 700px; max-height: 85vh;">
          <div class="wbe-wtplus-modal-header">
            <h2 style="margin: 0; font-size: 18px; color: #25422d;">Saved Queries</h2>
            <span class="wbe-wtplus-close" title="Close">&times;</span>
          </div>
          <div id="wbe-wtplus-saved-queries-list" style="max-height: 500px; overflow-y: auto; margin-top: 12px;">
            ${
              queries.length === 0
                ? '<div style="text-align: center; color: #666; padding: 40px;">No saved queries yet. Save a query to see it here!</div>'
                : queries
                    .map((q) => {
                      const date = new Date(q.timestamp);
                      const dateStr = date.toLocaleDateString() + " " + date.toLocaleTimeString();
                      return `
                    <div class="wbe-wtplus-saved-query-item" data-id="${
                      q.id
                    }" style="border: 1px solid #ddd; border-radius: 4px; padding: 12px; margin-bottom: 8px; background: #f9f9f9;">
                      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <div style="flex: 1;">
                          <div style="font-weight: 500; color: #25422d; margin-bottom: 4px;">${esc(q.name)}</div>
                          <div style="font-size: 12px; color: #666;">${dateStr}</div>
                        </div>
                        <div style="display: flex; gap: 6px;">
                          <button type="button" class="button small wbe-wtplus-load-query" data-id="${
                            q.id
                          }" style="padding: 4px 8px;">Load</button>
                          <button type="button" class="button small wbe-wtplus-delete-query" data-id="${
                            q.id
                          }" style="padding: 4px 8px; background: #d32f2f; color: white;">Delete</button>
                        </div>
                      </div>
                      <div style="font-family: monospace; font-size: 11px; color: #333; background: white; padding: 8px; border-radius: 3px; max-height: 100px; overflow-y: auto; white-space: pre-wrap; word-break: break-all;">${esc(
                        q.query
                      )}</div>
                    </div>
                  `;
                    })
                    .join("")
            }
          </div>
        </div>
      </div>
    `;

    $("body").append(modalHtml);
    const $modal = $("#wbe-wtplus-saved-queries-modal");

    // Make draggable
    $modal.find(".wbe-wtplus-modal-content").draggable({ handle: ".wbe-wtplus-modal-header", containment: "window" });

    // Close button
    $modal.on("click", ".wbe-wtplus-close", function () {
      $modal.remove();
    });

    // Load query
    $modal.on("click", ".wbe-wtplus-load-query", async function () {
      const id = String($(this).data("id"));
      const queries = await getAllQueries();
      const query = queries.find((q) => String(q.id) === id);
      if (query) {
        loadQuery(query);
        $modal.remove();
      }
    });

    // Delete query
    $modal.on("click", ".wbe-wtplus-delete-query", async function () {
      const id = String($(this).data("id"));
      const confirmed = await customConfirm("Are you sure you want to delete this saved query?");
      if (confirmed) {
        try {
          await deleteQuery(id);
          // Refresh the list
          $modal.remove();
          await showSavedQueriesModal();
        } catch (err) {
          console.error("Error deleting query:", err);
          setStatus("Failed to delete query.", true);
        }
      }
    });
  } catch (err) {
    console.error("Error showing saved queries:", err);
    // If modal creation fails catastrophically, just log it
    // The click handler will catch and display most errors
  }
}

function loadQuery(savedQuery) {
  // Restore the state from the saved query
  state.groups = JSON.parse(JSON.stringify(savedQuery.state.groups)); // Deep clone
  state.searchType = savedQuery.state.searchType || "text";
  state.selectedGroupIndex = savedQuery.state.selectedGroupIndex || 0;

  // Update the radio buttons
  $(`input[name='wbe-wtplus-search-type'][value='${state.searchType}']`).prop("checked", true);

  // Re-render everything
  renderAll();
  setStatus(`Loaded: ${savedQuery.name}`);
}

function addLauncher() {
  if (isMainDomain) {
    addDataMenuAttributes();
    const $findMenu = $('div[data-menu="Find"] ul.dropdown-menu');
    if ($findMenu.length && !$findMenu.find("#wbe-wtplus-orqb-link").length) {
      $findMenu.append(`
        <li><a href="#" id="wbe-wtplus-orqb-link" class="dropdown-item wbe-feature" title="Build WikiTree+ queries visually">WT+ Query Builder</a></li>
      `);
      $findMenu.on("click", "#wbe-wtplus-orqb-link", function (e) {
        e.preventDefault();
        openModal();
      });
      return;
    }
  }

  // On plus.wikitree.com, add button after "Show result in new tab" checkbox
  if (isPlusDomain) {
    const $newTabCheckbox = $("#NewTab").closest(".checkbox");
    if ($newTabCheckbox.length && !$("#wbe-wtplus-orqb-plus-button").length) {
      $newTabCheckbox.after(`
        <div style="padding: 0px 15px; margin-top: 10px;">
          <button id="wbe-wtplus-orqb-plus-button" type="button" class="btn btn-primary" title="Build WikiTree+ queries visually">Query Builder (WBE)</button>
        </div>
      `);
      $("#wbe-wtplus-orqb-plus-button").on("click", openModal);
      return;
    }
  }

  // Fallback button (if plus domain button wasn't added)
  if (!$("#wbe-wtplus-orqb-fab").length) {
    $("body").append(`<button id="wbe-wtplus-orqb-fab" type="button" title="WT+ Query Builder">WT+</button>`);
    $("#wbe-wtplus-orqb-fab").on("click", openModal);
  }
}

/* --------------------------
   Init
--------------------------- */

shouldInitializeFeature(FEATURE_ID).then((enabled) => {
  if (!enabled) return;
  if (!(isMainDomain || isPlusDomain)) return;

  // Initialize IndexedDB
  initDB().catch((err) => console.error("Failed to initialize query database:", err));

  addLauncher();

  // Auto-submit handler for suggestions search from query builder
  if (isPlusDomain) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("wbe") === "1" && urlParams.get("report") === "err6") {
      // Wait for the page to be ready, then submit the form
      setTimeout(() => {
        const $form = $("#formSuggestionsAll");
        if ($form.length) {
          const $submitBtn = $form.find("button[type='submit']");
          if ($submitBtn.length) {
            $submitBtn.click();
          }
        }
      }, 500);
    }
  }
});
