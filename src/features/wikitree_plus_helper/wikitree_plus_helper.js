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
      })),
    });
  };

  addGroup("Tree & Status", [
    { value: "connected", label: "connected (tree)" },
    { value: "Unconnected", label: "Unconnected (magic word)" },
    { value: "unconnected", label: "unconnected (tree)" },
    { value: "unlinked", label: "unlinked (tree)" },
    { value: "PublicTree", label: "PublicTree" },
    { value: "PrivateTree", label: "PrivateTree" },
    { value: "TreeXXX", label: "TreeXXX (replace XXX)" },
    { value: "Open", label: "Open" },
    { value: "Unsourced", label: "Unsourced" },
    { value: "Orphan", label: "Orphan" },
    { value: "Notables", label: "Notables" },
  ]);

  addGroup("Gender", [
    { value: "male", label: "male" },
    { value: "female", label: "female" },
    { value: "NoGender", label: "NoGender" },
  ]);

  addGroup("Locations", [
    { value: "MissingLocation", label: "MissingLocation" },
    { value: "UnknownCountry", label: "UnknownCountry" },
    { value: "UnknownRegion", label: "UnknownRegion" },
    { value: "UnofficialLocation", label: "UnofficialLocation" },
  ]);

  addGroup("Dates (prefix)", [
    { value: "B0", label: "B0 (missing birth)" },
    { value: "D0", label: "D0 (missing death)" },
    { value: "pre1500", label: "pre1500" },
  ]);

  const centuries = [];
  for (let i = 0; i <= 21; i += 1) {
    centuries.push({ value: `${i}cen`, label: `${i}cen` });
  }
  addGroup("Centuries", centuries);

  const decades = [];
  for (let y = 0; y <= 2020; y += 10) {
    decades.push({ value: `${y}s`, label: `${y}s` });
  }
  addGroup("Decades", decades);

  const ages = [];
  for (let a = 0; a <= 115; a += 1) {
    ages.push({ value: `age${a}`, label: `age${a}` });
  }
  addGroup("Ages", ages);

  addGroup("Relations", [
    { value: "NoFather", label: "NoFather" },
    { value: "NoMother", label: "NoMother" },
    { value: "NoParents", label: "NoParents" },
    { value: "NoSpouses", label: "NoSpouses" },
    { value: "NoChildren", label: "NoChildren" },
  ]);

  addGroup("DNA", [
    { value: "mtDNA", label: "mtDNA" },
    { value: "yDNA", label: "yDNA" },
    { value: "auDNA", label: "auDNA" },
    { value: "noGEDMatchID", label: "noGEDMatchID" },
    { value: "noMitoyDNAID", label: "noMitoyDNAID" },
  ]);

  addGroup("Privacy", [
    { value: "Private", label: "Private" },
    { value: "PrivatePB", label: "PrivatePB" },
    { value: "PrivatePT", label: "PrivatePT" },
    { value: "PrivatePBPT", label: "PrivatePBPT" },
    { value: "Public", label: "Public" },
  ]);

  addGroup("Management", [
    { value: "Guest", label: "Guest" },
    { value: "ProjectManaged", label: "ProjectManaged" },
    { value: "PPP", label: "PPP" },
    { value: "NeverEdited", label: "NeverEdited" },
    { value: "ApprovedMerge", label: "ApprovedMerge" },
    { value: "PendingMerge", label: "PendingMerge" },
    { value: "UnmergedMatch", label: "UnmergedMatch" },
    { value: "GEDCOMJunk", label: "GEDCOMJunk" },
    { value: "SourceJunk", label: "SourceJunk" },
    { value: "IsInWikiData", label: "IsInWikiData" },
  ]);

  const lastEdits = [];
  for (let y = 2008; y <= 2016; y += 1) {
    lastEdits.push({ value: `LastEdit${y}`, label: `LastEdit${y}` });
  }
  addGroup("Last Edit", lastEdits);

  addGroup("Find A Grave", [
    { value: "fgcem1234", label: "fgcem1234 (example)" },
    { value: "fgmem1234", label: "fgmem1234 (example)" },
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
  "General",
  "Dates",
  "Locations",
  "Location Table",
  "Categories, Templates, Suggestions",
  "Management",
  "Other",
];

const MULTI_GROUPS = new Set(GROUP_ORDER);

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
  // For suggestions mode: extract just values, space-separated
  // Format: Query=value1 value2 value3 OR suggestions=XXX for ErrorID
  const values = [];
  let suggestionId = null;

  state.groups.forEach((g) => {
    g.rows.forEach((row) => {
      // Extract values from regular fields
      Object.entries(row.fields || {}).forEach(([fieldId, value]) => {
        const rawVal = collapseWs(normalizeQuotes(value));
        if (rawVal && fieldId !== "sql") {
          // Special handling for Suggestions field - format for ErrorID extraction
          if (fieldId === "Suggestions") {
            suggestionId = rawVal;
          } else {
            values.push(rawVal);
          }
        }
      });

      // Extract values from multi-fields
      Object.values(row.multiFields || {}).forEach((entries) => {
        entries.forEach((entry) => {
          if (entry?.value && entry?.fieldId) {
            const rawVal = collapseWs(normalizeQuotes(entry.value));
            if (rawVal) {
              // Special handling for Suggestions field
              if (entry.fieldId === "Suggestions") {
                suggestionId = rawVal;
              } else {
                values.push(rawVal);
              }
            }
          }
        });
      });
    });
  });

  // If there's a suggestion ID, format it for extractSuggestionId to recognize
  let query = values.join(" ");
  if (suggestionId) {
    query = `suggestions=${suggestionId} ${query}`.trim();
  }

  return { query, warnings: [], onlySql: false };
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
      const sqlNotWarnings = [];

      g.rows.forEach((row) => {
        const terms = rowToTerms(row);

        if (row.not && (row.sqlConditions || []).length) {
          sqlNotWarnings.push("sql");
        }

        terms.forEach((term) => {
          // Check if term is SQL (starts with sql=)
          if (term.startsWith("sql=") || term.startsWith("NOT sql=")) {
            sqls.push(term);
          } else if (row.not) {
            negatives.push(term);
          } else {
            positives.push(term);
          }
        });
      });

      let s = "";
      if (positives.length) s += positives.join(" ");
      if (negatives.length) s += (s ? " " : "") + negatives.map((t) => `NOT ${t}`).join(" ");
      if (sqls.length) s += (s ? " " : "") + sqls.join(" ");

      const hasNonSql = positives.length > 0 || negatives.length > 0;
      const hasSql = sqls.length > 0;

      return { text: collapseWs(s), sqlNotWarnings, onlySql: hasSql && !hasNonSql };
    })
    .filter((x) => x.text);

  const query = groups.map((g) => g.text).join(" OR ");
  const warnings = groups.flatMap((g) => g.sqlNotWarnings || []);
  const onlySql = groups.length > 0 && groups.every((g) => g.onlySql);

  return { query, warnings, onlySql };
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
                <button type="button" class="button small" id="wbe-wtplus-orqb-add-group">Add OR group</button>
              </div>
            </div>

            <div class="wbe-wtplus-orqb-right">
              <div class="wbe-wtplus-orqb-subtitle">AND conditions</div>
              <div id="wbe-wtplus-orqb-rows"></div>

                <button type="button" class="button wbe-wtplus-orqb-open-primary" id="wbe-wtplus-orqb-open">Open in WT+</button>

              <div class="wbe-wtplus-orqb-row-actions">
                <div class="wbe-wtplus-orqb-row-actions-left">
                  <button type="button" class="button small" id="wbe-wtplus-orqb-add-row">Add condition</button>
                  <button type="button" class="button small" id="wbe-wtplus-orqb-dup-group">Duplicate group</button>
                  <button type="button" class="button small" id="wbe-wtplus-orqb-del-group">Delete group</button>
                </div>
                <div class="wbe-wtplus-orqb-row-actions-right">
                  <button type="button" class="button small" id="wbe-wtplus-orqb-saved">Saved Queries</button>
                  <button type="button" class="button small" id="wbe-wtplus-orqb-save">Save Query</button>
                  <button type="button" class="button small" id="wbe-wtplus-orqb-copy-q">Copy query</button>
                  <button type="button" class="button small" id="wbe-wtplus-orqb-copy-u">Copy URL</button>
                </div>
              </div>

              <div class="wbe-wtplus-orqb-out">
                <label>Query</label>
                <textarea id="wbe-wtplus-orqb-query" rows="3" spellcheck="false"></textarea>

                <label>WT+ URL</label>
                <textarea id="wbe-wtplus-orqb-url" rows="3" spellcheck="false" readonly></textarea>

                <div id="wbe-wtplus-orqb-status" class="wbe-wtplus-orqb-status"></div>
              </div>

              <div class="wbe-wtplus-orqb-note">
                Notes:
                <ul>
                  <li>Inside each OR group, NOT terms are placed at the end automatically.</li>
                  <li>SQL terms are placed last in the group.</li>
                  <li>If you tick NOT on an sql="..." row, you must put the NOT inside the SQL (not(...)).</li>
                </ul>
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
    const { query, onlySql } = buildQuery();
    if (onlySql) {
      setStatus("SQL-only searches need at least one non-SQL condition.", true);
      return;
    }
    await copyText(buildPlusUrl(query, state.searchType));
    setStatus("Copied URL.");
  });

  $("#wbe-wtplus-orqb-open").on("click", () => {
    const { query, onlySql } = buildQuery();
    if (onlySql) {
      setStatus("SQL-only searches need at least one non-SQL condition.", true);
      return;
    }
    if (query) {
      // Read the actual radio button selection at time of click
      const searchType = $("input[name='wbe-wtplus-search-type']:checked").val() || "text";
      if (isPlusDomain) {
        closeModal();
        // Populate and submit the correct form based on search type
        if (searchType === "suggestions") {
          // Suggestions search - populate #formSuggestionsAll and submit it
          const $form = $("#formSuggestionsAll");
          if ($form.length) {
            const suggestionId = extractSuggestionId(query);
            const cleanedQuery = query.replace(/(?:suggestions?|errorid)=\d+\s*/gi, "").trim();
            $form.find("textarea[name='Query']").val(suggestionId ? cleanedQuery : query);
            if (suggestionId) {
              $form.find("input[name='ErrorID']").val(suggestionId);
            }
            $form.find("input[name='MaxErrors']").val("1000");
            // Click the submit button in this form
            $form.find("button[type='submit']").click();
          }
        } else {
          // Text search - populate #formSearchText and submit it
          const $form = $("#formSearchText");
          if ($form.length) {
            $form.find("textarea[name='Query']").val(query);
            $form.find("input[name='MaxProfiles']").val("500");
            $form.find("select[name='Format']").val("");
            // Click the submit button in this form
            $form.find("button[type='submit']").click();
          }
        }
      } else {
        // Otherwise open in new window
        const u = buildPlusUrl(query, searchType, true); // include Render=1 for opening
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

  let html = "";
  groupOrder.forEach((grpName) => {
    if (!groups[grpName]) return;

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
            return `<option value="${esc(o.value)}"${sel}>${esc(o.label)}</option>`;
          })
          .join("");
        optionsHtml += `<optgroup label="${esc(item.label)}">${optgroupItems}</optgroup>`;
      } else {
        // Flat option (string or {value, label})
        const optVal = typeof item === "object" && item !== null ? item.value : item;
        const optLabel = typeof item === "object" && item !== null ? item.label : item;
        const sel = String(optVal) === String(v) ? " selected" : "";
        optionsHtml += `<option value="${esc(optVal)}"${sel}>${esc(optLabel)}</option>`;
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
  return `<input class="wbe-wtplus-orqb-value" type="text" value="${esc(v)}" placeholder="${esc(
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
          const defaultVal = def.options?.[0] || "";
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
          row.multiFields[grpName][idx].value = nd.input === "select" ? nd.options?.[0] || "" : "";
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
          row.fields[newField] = nd.options?.[0] || "";
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
          row.multiFields[grpName].push({ fieldId: "", value: "" });
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
  const { query, warnings } = buildQuery();

  $("#wbe-wtplus-orqb-query").val(query);

  // Only populate URL if query has content
  if (query.trim()) {
    $("#wbe-wtplus-orqb-url").val(buildPlusUrl(query, state.searchType));
  } else {
    $("#wbe-wtplus-orqb-url").val("");
  }

  if (warnings.length) {
    setStatus(`NOT on sql rows: put NOT inside SQL (not(...)).`, true);
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
});
