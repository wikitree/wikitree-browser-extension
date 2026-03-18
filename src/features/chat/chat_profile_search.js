import { wtAPICatCIBSearch, wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { dataTables, dataTablesLoad } from "../../core/API/wtPlusData";
import { getProfilePersonInfo, getUserWtId } from "../../core/common";
import { extractSuggestionId } from "../wikitree_plus_helper/wikitree_plus_helper_url";
import {
  WT_PLUS_ALLOWED_FIELDS,
  canonicalizeWtPlusRawToken as grammarCanonicalizeWtPlusRawToken,
  isLikelySuggestionsPrompt,
  translateSuggestionsFreeTextToQuery,
  validateAndRepairWtPlusQuery,
} from "./wt_plus_query_grammar";

export function createProfileSearchHandler({
  WBE_CHAT_APP_ID,
  hasAnyApiKey,
  getChatOptions,
  getChatAiConfig,
  fetchSearchPersonPaged,
  fetchPeoplePaged,
  mapApiPersonToStandardRow,
  makeStandardProfileTable,
  makeAncestorProfileTable,
  normalizeText,
  normalizeKnownDate,
  showChatShaky,
  hideChatShaky,
}) {
  const WT_PLUS_MAX_PROFILES = 20000;
  const WT_PLUS_GET_PEOPLE_CHUNK = 1000;
  const WT_ANCESTOR_GRAPH_GENERATIONS = 10;
  const WT_PLUS_FIELD_NAMES = new Set(WT_PLUS_ALLOWED_FIELDS);
  const WT_PLUS_STATUS_TOKENS = new Set(["Open", "Unsourced", "Unconnected", "Orphan"]);
  let wtPlusTemplateCatalogPromise = null;
  const wtPlusParseTelemetry = {
    parsedLocal: 0,
    parsedAi: 0,
    parsedSuggestions: 0,
    parseRejected: 0,
    queryRan: 0,
    queryZeroResults: 0,
  };

  function recordWtPlusParseTelemetry(eventName) {
    if (!eventName || !Object.prototype.hasOwnProperty.call(wtPlusParseTelemetry, eventName)) return;
    wtPlusParseTelemetry[eventName] += 1;
    const total = wtPlusParseTelemetry.queryRan + wtPlusParseTelemetry.parseRejected + wtPlusParseTelemetry.parsedAi;
    if (total > 0 && total % 20 === 0) {
      console.info("wbe: WT+ parse telemetry", { ...wtPlusParseTelemetry });
    }
  }

  function normalizeWtPlusCategoryText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/[,:;]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function scoreWtPlusCategoryCandidate(requestedCategory, candidate) {
    const requested = normalizeWtPlusCategoryText(requestedCategory);
    const actual = normalizeWtPlusCategoryText(candidate?.category || "");
    if (!requested || !actual) return -1;

    if (requested === actual) {
      return 1000;
    }

    let score = 0;
    if (actual.startsWith(requested) || requested.startsWith(actual)) score += 250;
    if (actual.includes(requested) || requested.includes(actual)) score += 150;

    const requestedTokens = new Set(requested.split(/\s+/).filter(Boolean));
    const actualTokens = new Set(actual.split(/\s+/).filter(Boolean));
    let overlap = 0;
    requestedTokens.forEach((token) => {
      if (actualTokens.has(token)) overlap += 1;
    });
    score += overlap * 40;
    score -= Math.abs(actual.length - requested.length);
    if (candidate?.topLevel) score -= 30;
    return score;
  }

  async function resolveWtPlusCategoryName(categoryText) {
    const requested = stripSurroundingQuotes(categoryText);
    if (!requested) return null;

    try {
      const response = await wtAPICatCIBSearch("ChatWTPlusCategory", "category", requested);
      const categories = Array.isArray(response?.response?.categories) ? response.response.categories : [];
      if (!categories.length) {
        return null;
      }

      const exact = categories.find(
        (entry) => normalizeWtPlusCategoryText(entry?.category || "") === normalizeWtPlusCategoryText(requested)
      );
      if (exact?.category) {
        return {
          requested,
          category: exact.category,
          exact: true,
        };
      }

      const ranked = categories
        .map((entry) => ({ entry, score: scoreWtPlusCategoryCandidate(requested, entry) }))
        .sort((left, right) => right.score - left.score);

      const best = ranked[0];
      if (best?.entry?.category && best.score >= 120) {
        return {
          requested,
          category: best.entry.category,
          exact: false,
        };
      }
    } catch (error) {
      console.info("wbe: category validation failed", { categoryText: requested, error });
    }

    return null;
  }

  function stripSurroundingQuotes(value) {
    if (value == null) return "";
    return String(value)
      .trim()
      .replace(/^["“”'‘’\s\[]+|["“”'‘’\s\]]+$/g, "")
      .trim();
  }

  function quoteWtPlusValue(value) {
    const text = stripSurroundingQuotes(value);
    if (!text) return "";
    return /\s|,/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
  }

  function escapeWtPlusSqlLiteral(value, withUnderscores = false) {
    const normalized = stripSurroundingQuotes(value);
    if (!normalized) return "";
    const squashed = withUnderscores ? normalized.replace(/\s+/g, "_") : normalized;
    return squashed.replace(/'/g, "''");
  }

  async function ensureWtPlusTemplateCatalogLoaded() {
    if (!wtPlusTemplateCatalogPromise) {
      wtPlusTemplateCatalogPromise = dataTablesLoad("ChatWTPlus").catch((error) => {
        console.info("wbe: failed to load WT+ template catalog", { error });
        return null;
      });
    }
    return wtPlusTemplateCatalogPromise;
  }

  function findCanonicalWtPlusTemplateName(templateText) {
    const needle = stripSurroundingQuotes(templateText).toLowerCase().replace(/\s+/g, " ").trim();
    if (!needle) return null;

    const templates = Array.isArray(dataTables.templates) ? dataTables.templates : [];
    if (!templates.length) return null;

    const normalize = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    const exact = templates.find((entry) => normalize(entry?.name) === needle);
    if (exact?.name) return exact.name;

    const exactWithoutTemplateWord = templates.find(
      (entry) => normalize(entry?.name).replace(/\s+template$/i, "") === needle.replace(/\s+template$/i, "")
    );
    if (exactWithoutTemplateWord?.name) return exactWithoutTemplateWord.name;

    const startsWith = templates.find((entry) => normalize(entry?.name).startsWith(needle));
    if (startsWith?.name) return startsWith.name;

    const contains = templates.find((entry) => normalize(entry?.name).includes(needle));
    if (contains?.name) return contains.name;

    return null;
  }

  async function canonicalizeWtPlusTemplateTerms(queryText) {
    const text = String(queryText || "").trim();
    if (!/\bTemplateText=/.test(text)) return text;

    await ensureWtPlusTemplateCatalogLoaded();

    return text.replace(/TemplateText=((?:"[^"]*")|(?:'[^']*')|[^\s]+)/g, (full, rawValue) => {
      const templateValue = stripSurroundingQuotes(rawValue);
      const canonical = findCanonicalWtPlusTemplateName(templateValue);
      return canonical ? `TemplateText=${quoteWtPlusValue(canonical)}` : full;
    });
  }

  async function canonicalizeWtPlusCategoryTerms(queryText) {
    const text = String(queryText || "").trim();
    if (!/\bCategoryFull=/.test(text)) {
      return { query: text, categoryMatches: [] };
    }

    const categoryMatches = [];
    let nextQuery = text;
    const categoryRegex = /CategoryFull=((?:"[^"]*")|(?:'[^']*')|[^\s]+)/g;
    const matches = Array.from(text.matchAll(categoryRegex));

    for (const match of matches) {
      const rawValue = match[1];
      const requestedCategory = stripSurroundingQuotes(rawValue);
      const resolved = await resolveWtPlusCategoryName(requestedCategory);
      if (!resolved?.category) continue;

      categoryMatches.push(resolved);
      nextQuery = nextQuery.replace(match[0], `CategoryFull=${quoteWtPlusValue(resolved.category)}`);
    }

    return {
      query: nextQuery,
      categoryMatches,
    };
  }

  function canonicalizeWtPlusRawToken(token) {
    return grammarCanonicalizeWtPlusRawToken(token);
  }

  function normalizeWtPlusFieldTerm(fieldName, value) {
    const field = String(fieldName || "").trim();
    if (!WT_PLUS_FIELD_NAMES.has(field)) {
      return null;
    }

    if (field.toLowerCase() === "sql") {
      const inner = String(value || "")
        .trim()
        .replace(/^sql\s*=\s*/i, "")
        .replace(/^"|"$/g, "")
        .replace(/^'|'$/g, "");
      return inner ? `sql="${inner.replace(/"/g, "'")}"` : null;
    }

    const quotedValue = quoteWtPlusValue(value);
    if (!quotedValue) {
      return null;
    }

    return `${field}=${quotedValue}`;
  }

  function normalizeWtPlusQueryString(queryText) {
    const text = String(queryText || "").trim();
    if (!text) return null;

    const repaired = validateAndRepairWtPlusQuery(text);
    if (!repaired?.isValid) {
      recordWtPlusParseTelemetry("parseRejected");
      return null;
    }

    return repaired.normalizedQuery || null;
  }

  function normalizeWtPlusBoundaryDate(rawValue, direction) {
    const text = String(rawValue || "").trim();
    if (!text) return "";

    if (/^\d{4}$/.test(text)) {
      return direction === "after" ? `${text}9999` : `${text}0000`;
    }

    if (/^\d{4}-\d{2}$/.test(text)) {
      return `${text.replace(/-/g, "")}00`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text.replace(/-/g, "");
    }

    return text.replace(/[^0-9]/g, "").slice(0, 8);
  }

  function buildWtPlusSqlTerm(expression) {
    const inner = String(expression || "").trim();
    if (!inner) return null;
    return `sql="${inner.replace(/"/g, "'")}"`;
  }

  function cleanWtPlusGroupRemainder(text) {
    return String(text || "")
      .replace(
        /\b(?:people|profiles?|show|find|list|get|look(?:\s+up)?|search(?:\s+for)?|with|who|that|are|is|me|for)\b/gi,
        " "
      )
      .replace(/[,:;]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function parseNaturalLanguageWtPlusGroup(groupText) {
    let working = String(groupText || "").trim();
    if (!working) return null;

    const terms = [];
    const sqlTerms = [];
    const understood = [];
    const addTerm = (term, summary) => {
      if (!term) return;
      terms.push(term);
      if (summary) understood.push(summary);
    };
    const addSqlTerm = (term, summary) => {
      if (!term) return;
      sqlTerms.push(term);
      if (summary) understood.push(summary);
    };
    const consume = (regex, handler) => {
      const match = working.match(regex);
      if (!match) return false;
      handler(match);
      working = working
        .replace(match[0], " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      return true;
    };

    consume(/\bliving\s+notables?\s+project\b/i, () => {
      addTerm(normalizeWtPlusFieldTerm("CategoryFull", "Living Notables Project"), "living notables project");
    });
    consume(/\bnotables?\s+project\b/i, () => {
      addTerm(normalizeWtPlusFieldTerm("CategoryFull", "Notables Project"), "notables project");
    });
    consume(/\bnotables?\s+sticker\b/i, () => {
      addTerm(normalizeWtPlusFieldTerm("TemplateText", "Notables Sticker"), "notables sticker");
    });
    consume(/\bnotables?\b/i, () => {
      addTerm(normalizeWtPlusFieldTerm("CategoryWord", "Notables"), "notables");
    });

    consume(/\b(open|unsourced|unconnected|orphan)\b/i, (match) => {
      const status = `${match[1].slice(0, 1).toUpperCase()}${match[1].slice(1).toLowerCase()}`;
      addTerm(status, `${status.toLowerCase()} profiles`);
    });

    consume(/\b(public\s+tree|private\s+tree|connected|unlinked|private|public)\b/i, (match) => {
      const map = {
        "public tree": "PublicTree",
        "private tree": "PrivateTree",
        connected: "connected",
        unlinked: "unlinked",
        private: "Private",
        public: "Public",
      };
      const key = String(match[1] || "").toLowerCase();
      const token = map[key];
      addTerm(token, token);
    });

    consume(/\b(?:male|female|no\s+gender)\b/i, (match) => {
      const key = String(match[0] || "").toLowerCase();
      const token = key.includes("no") ? "NoGender" : key;
      addTerm(token, token.toLowerCase());
    });

    consume(
      /\b(?:project\s+managed|guest|ppp|never\s+edited|approved\s+merge|pending\s+merge|unmerged\s+match|gedcom\s+junk|source\s+junk|wikidata)\b/i,
      (match) => {
        const map = {
          "project managed": "ProjectManaged",
          guest: "Guest",
          ppp: "PPP",
          "never edited": "NeverEdited",
          "approved merge": "ApprovedMerge",
          "pending merge": "PendingMerge",
          "unmerged match": "UnmergedMatch",
          "gedcom junk": "GEDCOMJunk",
          "source junk": "SourceJunk",
          wikidata: "IsInWikiData",
        };
        const key = String(match[0] || "").toLowerCase();
        const token = map[key];
        addTerm(token, token);
      }
    );

    consume(/\b(?:mt\s*dna|y\s*dna|au\s*dna)\b/i, (match) => {
      const key = String(match[0] || "")
        .toLowerCase()
        .replace(/\s+/g, "");
      const token = key === "mtdna" ? "mtDNA" : key === "ydna" ? "yDNA" : "auDNA";
      addTerm(token, token);
    });

    consume(/\b(?:no\s+father|without\s+father)\b/i, () => {
      addTerm("NoFather", "no father");
    });
    consume(/\b(?:no\s+mother|without\s+mother)\b/i, () => {
      addTerm("NoMother", "no mother");
    });
    consume(/\b(?:no\s+parents|without\s+parents)\b/i, () => {
      addTerm("NoParents", "no parents");
    });
    consume(/\b(?:no\s+spouses?|without\s+spouses?)\b/i, () => {
      addTerm("NoSpouses", "no spouses");
    });
    consume(/\b(?:no\s+children|without\s+children)\b/i, () => {
      addTerm("NoChildren", "no children");
    });

    consume(/\bpublic\s+(?:and\s+open\s+)?profiles?\b/i, () => {
      addSqlTerm(buildWtPlusSqlTerm("([Default].[Privacy].AsNumber > 40)"), "public and open profiles");
    });

    consume(/\bprivate\s+profiles?\b/i, () => {
      addSqlTerm(buildWtPlusSqlTerm("([Default].[Privacy].AsNumber < 50)"), "private profiles");
    });

    consume(
      /\b(?:in\s+)?category\s*[:=]?\s*(?!born\b|died\b|married\b|with\b|ancestors?\b|descendants?\b|cc7\b|in\s+tree\b)(.+)$/i,
      (match) => {
        const category = stripSurroundingQuotes(match[1]);
        addTerm(normalizeWtPlusFieldTerm("CategoryFull", category), `category ${category}`);
      }
    );
    consume(/\bcategory\s+word\s*[:=]?\s*(.+)$/i, (match) => {
      const categoryWord = stripSurroundingQuotes(match[1]);
      addTerm(normalizeWtPlusFieldTerm("CategoryWord", categoryWord), `category word ${categoryWord}`);
    });
    consume(/\btemplate\s*[:=]?\s*(.+)$/i, (match) => {
      const template = stripSurroundingQuotes(match[1]);
      addTerm(normalizeWtPlusFieldTerm("TemplateText", template), `template ${template}`);
    });

    consume(/\bborn\s+before\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\b/i, (match) => {
      const boundary = normalizeWtPlusBoundaryDate(match[1], "before");
      addSqlTerm(buildWtPlusSqlTerm(`([Default].[Birth Date].AsNumber < ${boundary})`), `born before ${match[1]}`);
    });
    consume(/\bborn\s+after\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\b/i, (match) => {
      const boundary = normalizeWtPlusBoundaryDate(match[1], "after");
      addSqlTerm(buildWtPlusSqlTerm(`([Default].[Birth Date].AsNumber > ${boundary})`), `born after ${match[1]}`);
    });
    consume(/\bdied\s+before\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\b/i, (match) => {
      const boundary = normalizeWtPlusBoundaryDate(match[1], "before");
      addSqlTerm(buildWtPlusSqlTerm(`([Default].[Death Date].AsNumber < ${boundary})`), `died before ${match[1]}`);
    });
    consume(/\bdied\s+after\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\b/i, (match) => {
      const boundary = normalizeWtPlusBoundaryDate(match[1], "after");
      addSqlTerm(buildWtPlusSqlTerm(`([Default].[Death Date].AsNumber > ${boundary})`), `died after ${match[1]}`);
    });

    consume(/\blived\s+over\s+(\d{1,3})\s+years?\b/i, (match) => {
      const years = Number.parseInt(match[1], 10);
      if (Number.isFinite(years)) {
        addSqlTerm(buildWtPlusSqlTerm(`([Default].[Death Age].AsNumber > ${years})`), `lived over ${years} years`);
      }
    });

    consume(/\b(?:birth\s+without\s+day|born\s+without\s+day)\b/i, () => {
      addSqlTerm(buildWtPlusSqlTerm("([Default].[Birth Date].AsString Like '*00')"), "birth without day");
    });

    consume(/\b(?:birth\s+year\s+only|born\s+year\s+only)\b/i, () => {
      addSqlTerm(buildWtPlusSqlTerm("([Default].[Birth Date].AsString Like '*0000')"), "birth year only");
    });

    consume(/\b(?:no\s+first\s+name|missing\s+first\s+name)\b/i, () => {
      addSqlTerm(buildWtPlusSqlTerm("([Default].[First Name].AsString = '')"), "no first name");
    });

    consume(/\b(?:more\s+than|over)\s+(\d+)\s+children\b/i, (match) => {
      const n = Number.parseInt(match[1], 10);
      if (Number.isFinite(n)) {
        addSqlTerm(buildWtPlusSqlTerm(`([Children].[User ID].LineCount > ${n})`), `more than ${n} children`);
      }
    });

    consume(/\b(?:more\s+than|over)\s+(\d+)\s+siblings\b/i, (match) => {
      const n = Number.parseInt(match[1], 10);
      if (Number.isFinite(n)) {
        addSqlTerm(buildWtPlusSqlTerm(`([Siblings].[User ID].LineCount > ${n})`), `more than ${n} siblings`);
      }
    });

    consume(/\b(?:more\s+than|over)\s+(\d+)\s+marriages\b/i, (match) => {
      const n = Number.parseInt(match[1], 10);
      if (Number.isFinite(n)) {
        addSqlTerm(buildWtPlusSqlTerm(`([Marriage].[Marriage Date].LineCount > ${n})`), `more than ${n} marriages`);
      }
    });

    consume(/\b(?:exactly\s+one|single)\s+marriage\b/i, () => {
      addSqlTerm(buildWtPlusSqlTerm("([Marriage].[Marriage Location].LineCount = 1)"), "exactly one marriage");
    });

    consume(/\b(?:no\s+categor(?:y|ies)|without\s+categor(?:y|ies))\b/i, () => {
      addSqlTerm(buildWtPlusSqlTerm("([Categories].[Category].LineCount = 0)"), "no categories");
    });

    consume(/\b(?:imported\s+from\s+gedcom|from\s+gedcom)\b/i, () => {
      addSqlTerm(buildWtPlusSqlTerm("([Bio].[GED File].AsString <> '')"), "imported from GEDCOM");
    });

    consume(/\bcreated\s+after\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\b/i, (match) => {
      const boundary = normalizeWtPlusBoundaryDate(match[1], "after");
      addSqlTerm(buildWtPlusSqlTerm(`([Bio].[Created Date].AsNumber > ${boundary})`), `created after ${match[1]}`);
    });

    consume(/\bcreated\s+before\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\b/i, (match) => {
      const boundary = normalizeWtPlusBoundaryDate(match[1], "before");
      addSqlTerm(buildWtPlusSqlTerm(`([Bio].[Created Date].AsNumber < ${boundary})`), `created before ${match[1]}`);
    });

    consume(
      /\bedited\s+between\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\s+(?:and|to)\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\b/i,
      (match) => {
        const start = normalizeWtPlusBoundaryDate(match[1], "before");
        const end = normalizeWtPlusBoundaryDate(match[2], "after");
        addSqlTerm(
          buildWtPlusSqlTerm(`([Bio].[LastEdit Date].AsNumber In ${start}..${end})`),
          `edited between ${match[1]} and ${match[2]}`
        );
      }
    );

    consume(/\bcreated\s+in\s+(\d{4})\b/i, (match) => {
      addSqlTerm(buildWtPlusSqlTerm(`([Bio].[Created Year].AsNumber = ${match[1]})`), `created in ${match[1]}`);
    });

    consume(/\b(?:many|more\s+than|over)\s+(\d+)\s+errors?\b/i, (match) => {
      const n = Number.parseInt(match[1], 10);
      if (Number.isFinite(n)) {
        addSqlTerm(buildWtPlusSqlTerm(`([Default].[Nr of errors].AsNumber > ${n})`), `more than ${n} errors`);
      }
    });

    consume(/\bmultiple\s+managers\b/i, () => {
      addSqlTerm(buildWtPlusSqlTerm("([Manager].[ManagerWikitreeId].LineCount > 1)"), "multiple managers");
    });

    consume(/\bmissing\s+sources?\s+after\s+biograph(?:y|ies)\b/i, () => {
      addSqlTerm(
        buildWtPlusSqlTerm("Not([Bio].[Headings].AsString Like '*B2*S2*')"),
        "missing sources after biography"
      );
    });

    consume(/\bmissing\s+category\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const category = escapeWtPlusSqlLiteral(match[1], true);
      if (category) {
        addSqlTerm(
          buildWtPlusSqlTerm(`Not ([Default].[All Categories].AsString Like '*${category}*')`),
          `missing category ${stripSurroundingQuotes(match[1])}`
        );
      }
    });

    consume(/\btemplate\s+name\s+(.+?)\s+with\s+text\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const templateName = escapeWtPlusSqlLiteral(match[1], true);
      const templateText = escapeWtPlusSqlLiteral(match[2], true);
      if (templateName && templateText) {
        addSqlTerm(
          buildWtPlusSqlTerm(
            `([Templates].[Template name].AsString = '${templateName}') And ([Templates].[Template text].AsString Like '*${templateText}*')`
          ),
          `template ${stripSurroundingQuotes(match[1])} with text ${stripSurroundingQuotes(match[2])}`
        );
      }
    });

    consume(/\btemplate\s+text\s+contains\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const templateText = escapeWtPlusSqlLiteral(match[1], true);
      if (templateText) {
        addSqlTerm(
          buildWtPlusSqlTerm(`([Templates].[Template text].AsString Like '*${templateText}*')`),
          `template text contains ${stripSurroundingQuotes(match[1])}`
        );
      }
    });

    consume(/\bmanaged\s+only\s+by\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const managerId = escapeWtPlusSqlLiteral(match[1], true);
      if (managerId) {
        addSqlTerm(
          buildWtPlusSqlTerm(`([Default].[All Managers].AsString = '${managerId}')`),
          `managed only by ${stripSurroundingQuotes(match[1])}`
        );
      }
    });

    consume(/\bmtdna\s+haplogroup\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = escapeWtPlusSqlLiteral(match[1], true);
      if (value) {
        addSqlTerm(
          buildWtPlusSqlTerm(`([Bio].[Replicated DNA mtHaplogroup].AsString Like '*${value}*')`),
          `mtDNA haplogroup ${stripSurroundingQuotes(match[1])}`
        );
      }
    });

    consume(/\bydna\s+haplogroup\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = escapeWtPlusSqlLiteral(match[1], true);
      if (value) {
        addSqlTerm(
          buildWtPlusSqlTerm(`([Bio].[Replicated DNA yHaplogroup].AsString Like '*${value}*')`),
          `yDNA haplogroup ${stripSurroundingQuotes(match[1])}`
        );
      }
    });

    consume(/\bgedmatch\s+id\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = escapeWtPlusSqlLiteral(match[1], true);
      if (value) {
        addSqlTerm(
          buildWtPlusSqlTerm(`([Bio].[Replicated DNA GedMatchID].AsString Like '*${value}*')`),
          `GedMatch ID ${stripSurroundingQuotes(match[1])}`
        );
      }
    });

    consume(/\bmitoydna\s+id\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = escapeWtPlusSqlLiteral(match[1], true);
      if (value) {
        addSqlTerm(
          buildWtPlusSqlTerm(`([Bio].[Replicated DNA mitoyDNAID].AsString Like '*${value}*')`),
          `mitoyDNA ID ${stripSurroundingQuotes(match[1])}`
        );
      }
    });

    consume(/\baudna\s+lnabs\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = escapeWtPlusSqlLiteral(match[1], true);
      if (value) {
        addSqlTerm(
          buildWtPlusSqlTerm(`([bio].[replicated audna lnabs].asstring like '*${value}*')`),
          `auDNA lnabs ${stripSurroundingQuotes(match[1])}`
        );
      }
    });

    consume(
      /\bmarriage\s+date\s+between\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\s+(?:and|to)\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\b/i,
      (match) => {
        const from = normalizeWtPlusBoundaryDate(match[1], "before");
        const to = normalizeWtPlusBoundaryDate(match[2], "after");
        addSqlTerm(
          buildWtPlusSqlTerm(`([Marriage].[Marriage Date] in ${from}..${to})`),
          `marriage date between ${match[1]} and ${match[2]}`
        );
      }
    );

    consume(/\bmarriage\s+date\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const pattern = stripSurroundingQuotes(match[1]).replace(/-/g, "").replace(/\s+/g, "");
      if (pattern) {
        addSqlTerm(
          buildWtPlusSqlTerm(`([Marriage].[Marriage Date].AsString Like '${pattern}')`),
          `marriage date ${stripSurroundingQuotes(match[1])}`
        );
      }
    });

    consume(/\bmarriage\s+location\s+contains\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = escapeWtPlusSqlLiteral(match[1], true);
      if (value) {
        addSqlTerm(
          buildWtPlusSqlTerm(`([Marriage].[Marriage Location].AsString like '*${value}*')`),
          `marriage location contains ${stripSurroundingQuotes(match[1])}`
        );
      }
    });

    consume(/\bwith\s+heading\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const heading = escapeWtPlusSqlLiteral(match[1], true);
      if (heading) {
        addSqlTerm(
          buildWtPlusSqlTerm(`([Bio].[Headings].AsString Like '*${heading}*')`),
          `with heading ${stripSurroundingQuotes(match[1])}`
        );
      }
    });

    consume(/\bborn\s+in\s+(\d{4})s\b/i, (match) => {
      addTerm(`${match[1]}s`, `born in ${match[1]}s`);
    });
    consume(/\bborn\s+in\s+(\d{1,2})(?:st|nd|rd|th)?\s+century\b/i, (match) => {
      const n = Number.parseInt(match[1], 10);
      if (Number.isFinite(n) && n >= 0 && n <= 21) {
        addTerm(`${n}Cen`, `born in ${n} century`);
      }
    });
    consume(/\b(?:age|aged)\s*(\d{1,3})\b/i, (match) => {
      const n = Number.parseInt(match[1], 10);
      if (Number.isFinite(n)) {
        addTerm(`age${n}`, `age ${n}`);
      }
    });
    consume(/\bborn\s+in\s+(\d{4})\b/i, (match) => {
      addTerm(`B${match[1]}`, `born in ${match[1]}`);
    });
    consume(/\bdied\s+in\s+(\d{4})\b/i, (match) => {
      addTerm(`D${match[1]}`, `died in ${match[1]}`);
    });

    consume(/\bborn\s+in\s+(.+?)(?=$|\b(?:and|or|before|after)\b)/i, (match) => {
      const value = stripSurroundingQuotes(match[1]);
      if (value && !/^\d{4}s?$/i.test(value)) {
        addTerm(normalizeWtPlusFieldTerm("BirthLocation", value), `born in ${value}`);
      }
    });
    consume(/\bdied\s+in\s+(.+?)(?=$|\b(?:and|or|before|after)\b)/i, (match) => {
      const value = stripSurroundingQuotes(match[1]);
      if (value && !/^\d{4}$/i.test(value)) {
        addTerm(normalizeWtPlusFieldTerm("DeathLocation", value), `died in ${value}`);
      }
    });
    consume(/\bmarried\s+in\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = stripSurroundingQuotes(match[1]);
      addTerm(normalizeWtPlusFieldTerm("MarriageLocation", value), `married in ${value}`);
    });

    consume(/\bwith\s+first\s+name\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = stripSurroundingQuotes(match[1]);
      addTerm(normalizeWtPlusFieldTerm("FirstName", value), `first name ${value}`);
    });
    consume(/\bcurrent\s+last\s+name\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = escapeWtPlusSqlLiteral(match[1], true);
      if (value) {
        addSqlTerm(
          buildWtPlusSqlTerm(`([Default].[Current Last Name].AsString = '${value.toLowerCase()}')`),
          `current last name ${stripSurroundingQuotes(match[1])}`
        );
      }
    });
    consume(/\bwith\s+(?:last\s+name\s+at\s+birth|lnab|surname|last\s+name)\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = stripSurroundingQuotes(match[1]);
      addTerm(normalizeWtPlusFieldTerm("LastNameAtBirth", value), `last name ${value}`);
    });
    consume(/\bwith\s+any\s+last\s+name\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = stripSurroundingQuotes(match[1]);
      addTerm(normalizeWtPlusFieldTerm("AllLastNames", value), `any last name ${value}`);
    });
    consume(/\b(?:profile\s+id|wikitree\s+id|wtid|id)\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = stripSurroundingQuotes(match[1]);
      addTerm(normalizeWtPlusFieldTerm("WikiTreeID", value), `WikiTree ID ${value}`);
    });

    consume(/^ancestors\s+of\s+(.+)$/i, (match) => {
      const value = resolveWtPlusContextFieldValue("Ancestors", match[1]);
      addTerm(normalizeWtPlusFieldTerm("Ancestors", value), `ancestors of ${value}`);
    });
    consume(/\bancestors\b/i, () => {
      const root = getDefaultWtPlusRoot();
      if (root?.wtId) {
        addTerm(normalizeWtPlusFieldTerm("Ancestors", root.wtId), `ancestors of ${root.displayName}`);
      }
    });
    consume(/^descendants\s+of\s+(.+)$/i, (match) => {
      const value = resolveWtPlusContextFieldValue("Descendants", match[1]);
      addTerm(normalizeWtPlusFieldTerm("Descendants", value), `descendants of ${value}`);
    });
    consume(/\bdescendants\b/i, () => {
      const root = getDefaultWtPlusRoot();
      if (root?.wtId) {
        addTerm(normalizeWtPlusFieldTerm("Descendants", root.wtId), `descendants of ${root.displayName}`);
      }
    });
    consume(/^cc7\s+(?:of\s+)?(.+)$/i, (match) => {
      const value = resolveWtPlusContextFieldValue("CC7", match[1]);
      addTerm(normalizeWtPlusFieldTerm("CC7", value), `cc7 of ${value}`);
    });
    consume(/\bin\s+tree\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = stripSurroundingQuotes(match[1]);
      if (/^\d+$/.test(value)) {
        addTerm(`Tree${value}`, `tree ${value}`);
      } else {
        addTerm(normalizeWtPlusFieldTerm("Tree", value), `tree ${value}`);
      }
    });
    consume(/\b(?:find\s*a\s*grave\s+cemetery|fg\s*cemetery)\s*(\d+)\b/i, (match) => {
      addTerm(`fgcem${match[1]}`, `find a grave cemetery ${match[1]}`);
    });
    consume(/\b(?:find\s*a\s*grave\s+memorial|fg\s*memorial)\s*(\d+)\b/i, (match) => {
      addTerm(`fgmem${match[1]}`, `find a grave memorial ${match[1]}`);
    });
    consume(/\b(?:in|from)\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = stripSurroundingQuotes(match[1]);
      if (value) {
        addTerm(normalizeWtPlusFieldTerm("Location", value), `location ${value}`);
      }
    });
    consume(/\bdeath\s+country\s+(.+?)(?=$|\b(?:and|or)\b)/i, (match) => {
      const value = escapeWtPlusSqlLiteral(match[1], true);
      if (value) {
        addSqlTerm(
          buildWtPlusSqlTerm(`([Default].[Death Location Country].AsString = '${value.toLowerCase()}')`),
          `death country ${stripSurroundingQuotes(match[1])}`
        );
      }
    });

    consume(/\bunrecognized\s+death\s+locations?\b/i, () => {
      addSqlTerm(
        buildWtPlusSqlTerm("(Trim([Default].[Death Location Country, Region, City].AsString) = '')"),
        "unrecognized death locations"
      );
    });

    let remainder = cleanWtPlusGroupRemainder(working);
    if (remainder) {
      const tokens = remainder.split(/\s+/).filter(Boolean);
      if (tokens.length === 1) {
        const token = stripSurroundingQuotes(tokens[0]);
        if (token && !/^(?:in|from)$/i.test(token)) {
          addTerm(normalizeWtPlusFieldTerm("LastNameAtBirth", token), `last name ${token}`);
        }
      } else if (tokens.length >= 2) {
        if (/^(?:in|from)$/i.test(tokens[0])) {
          const possibleLocation = stripSurroundingQuotes(tokens.slice(1).join(" "));
          if (possibleLocation) {
            addTerm(normalizeWtPlusFieldTerm("Location", possibleLocation), `location ${possibleLocation}`);
          }
        } else {
          const possibleSurname = stripSurroundingQuotes(tokens.shift());
          const possibleLocation = stripSurroundingQuotes(tokens.join(" "));
          if (possibleSurname) {
            addTerm(normalizeWtPlusFieldTerm("LastNameAtBirth", possibleSurname), `last name ${possibleSurname}`);
          }
          if (possibleLocation) {
            addTerm(normalizeWtPlusFieldTerm("Location", possibleLocation), `location ${possibleLocation}`);
          }
        }
      }
    }

    const allTerms = [...terms, ...sqlTerms].filter(Boolean);
    if (!allTerms.length) {
      return null;
    }

    return {
      query: allTerms.join(" "),
      understood: understood.join(", "),
    };
  }

  function parseCombinedNaturalLanguageWtPlusQuery(queryText) {
    const text = String(queryText || "").trim();
    if (!text) return null;
    if (!/\s+OR\s+/i.test(text)) return null;

    const groups = text
      .split(/\s+OR\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);
    if (!groups.length) return null;

    const parsedGroups = groups.map((group) => parseNaturalLanguageWtPlusGroup(group));
    if (parsedGroups.some((group) => !group?.query)) {
      return null;
    }

    const query = parsedGroups.map((group) => group.query).join(" OR ");
    const understood = parsedGroups
      .map((group) => group.understood)
      .filter(Boolean)
      .join(" OR ");

    return {
      query,
      title: `WT+ search: ${understood || text}`,
      description: understood || text,
      understood: understood || text,
    };
  }

  function getSelectedChatMode() {
    return document.querySelector('input[name="wbe-chat-mode"]:checked')?.value || null;
  }

  function isNonPersonPageName(value) {
    const name = String(value || "").trim();
    return !name || name.includes(":");
  }

  function getCurrentProfileWtPlusRoot() {
    const profile = getProfilePersonInfo();
    if (!profile || Array.isArray(profile)) {
      return null;
    }

    const wtId = String(profile?.Name || profile?.wtid || "").trim();
    const displayName = String(profile?.displayName || profile?.RealName || profile?.FullName || wtId || "").trim();
    if (!wtId || isNonPersonPageName(wtId)) {
      return null;
    }

    return { wtId, displayName };
  }

  function getDefaultWtPlusRoot() {
    const profileRoot = getCurrentProfileWtPlusRoot();
    if (profileRoot?.wtId) {
      return profileRoot;
    }

    const userWtId = String(getUserWtId() || "").trim();
    if (!userWtId) {
      return null;
    }

    return {
      wtId: userWtId,
      displayName: userWtId,
    };
  }

  function resolveWtPlusSubjectRoot(rawSubject) {
    const subject = stripSurroundingQuotes(rawSubject);
    if (!subject) {
      return null;
    }

    if (/^(?:his|her|their|the\s*profile\s*person|current\s*profile|this\s*profile|profile\s*person)$/i.test(subject)) {
      return getCurrentProfileWtPlusRoot();
    }

    if (/^(?:logged\s*in\s*user|current\s*user|me|myself)$/i.test(subject)) {
      return getDefaultWtPlusRoot();
    }

    return {
      wtId: subject,
      displayName: subject,
    };
  }

  function resolveWtPlusContextFieldValue(fieldName, rawValue) {
    const field = String(fieldName || "").trim();
    const value = stripSurroundingQuotes(rawValue);
    if (!value) {
      return "";
    }

    if (["Ancestors", "Descendants", "CC7"].includes(field)) {
      const resolved = resolveWtPlusSubjectRoot(value) || getDefaultWtPlusRoot();
      return String(resolved?.wtId || value).trim();
    }

    return value;
  }

  function resolveWtPlusContextPlaceholders(queryText) {
    const text = String(queryText || "").trim();
    if (!text) {
      return text;
    }

    return text.replace(
      /\b(Ancestors|Descendants|CC7)=((?:"[^"]*")|(?:'[^']*')|[^\s]+)/gi,
      (full, fieldName, rawValue) => {
        const resolvedValue = resolveWtPlusContextFieldValue(fieldName, rawValue);
        const normalizedTerm = normalizeWtPlusFieldTerm(fieldName, resolvedValue);
        return normalizedTerm || full;
      }
    );
  }

  function inferWtPlusFamilyFieldFromRawQuery(rawQuery) {
    const normalizedText = String(rawQuery || "")
      .trim()
      .replace(/^\s*(?:search(?:\s+for)?|find|show|list|get|look(?:\s+up)?)\s+/i, "")
      .replace(/^\s*(?:me\s+)?/i, "")
      .replace(/[.!?]+$/g, "")
      .trim();
    if (!normalizedText) {
      return null;
    }

    const bareAncestorMatch = normalizedText.match(/^ancestors\b/i);
    if (bareAncestorMatch) {
      const root = getDefaultWtPlusRoot();
      if (root?.wtId) {
        return { fieldName: "Ancestors", wtId: root.wtId, displayName: root.displayName };
      }
    }

    const bareDescendantMatch = normalizedText.match(/^descendants\b/i);
    if (bareDescendantMatch) {
      const root = getDefaultWtPlusRoot();
      if (root?.wtId) {
        return { fieldName: "Descendants", wtId: root.wtId, displayName: root.displayName };
      }
    }

    const ancestorOfMatch = normalizedText.match(
      /^ancestors\s+of\s+(.+?)(?=\s+(?:born|died|married|in|before|after)\b|$)/i
    );
    if (ancestorOfMatch?.[1]) {
      const root = resolveWtPlusSubjectRoot(ancestorOfMatch[1]);
      if (root?.wtId) {
        return { fieldName: "Ancestors", wtId: root.wtId, displayName: root.displayName };
      }
    }

    const descendantOfMatch = normalizedText.match(
      /^descendants\s+of\s+(.+?)(?=\s+(?:born|died|married|in|before|after)\b|$)/i
    );
    if (descendantOfMatch?.[1]) {
      const root = resolveWtPlusSubjectRoot(descendantOfMatch[1]);
      if (root?.wtId) {
        return { fieldName: "Descendants", wtId: root.wtId, displayName: root.displayName };
      }
    }

    const possessiveAncestorMatch = normalizedText.match(/^(.+?)'s\s+ancestors\b/i);
    if (possessiveAncestorMatch?.[1]) {
      const root = resolveWtPlusSubjectRoot(possessiveAncestorMatch[1]);
      if (root?.wtId) {
        return { fieldName: "Ancestors", wtId: root.wtId, displayName: root.displayName };
      }
    }

    const possessiveDescendantMatch = normalizedText.match(/^(.+?)'s\s+descendants\b/i);
    if (possessiveDescendantMatch?.[1]) {
      const root = resolveWtPlusSubjectRoot(possessiveDescendantMatch[1]);
      if (root?.wtId) {
        return { fieldName: "Descendants", wtId: root.wtId, displayName: root.displayName };
      }
    }

    return null;
  }

  function ensureWtPlusFamilyField(rawQuery, queryText) {
    const normalizedQuery = String(queryText || "").trim();
    if (!normalizedQuery) {
      return normalizedQuery;
    }
    if (/\b(?:Ancestors|Descendants)=/i.test(normalizedQuery)) {
      return normalizedQuery;
    }

    const inferredFamilyField = inferWtPlusFamilyFieldFromRawQuery(rawQuery);
    if (!inferredFamilyField?.fieldName || !inferredFamilyField?.wtId) {
      return normalizedQuery;
    }

    const familyTerm = normalizeWtPlusFieldTerm(inferredFamilyField.fieldName, inferredFamilyField.wtId);
    return familyTerm ? `${familyTerm} ${normalizedQuery}`.trim() : normalizedQuery;
  }

  function parseExplicitWtPlusQuery(queryText) {
    const text = String(queryText || "").trim();
    if (!text) return null;

    const normalizedWholeQuery = normalizeWtPlusQueryString(text);
    if (normalizedWholeQuery) {
      return {
        query: normalizedWholeQuery,
        title: `WT+ search: ${text}`,
        description: text,
      };
    }

    const fieldRegex = /([A-Za-z_]+)=((?:"[^"]*")|(?:'[^']*')|[^\s]+)/g;
    const matches = Array.from(text.matchAll(fieldRegex));
    if (!matches.length) {
      return null;
    }

    const terms = [];
    let stripped = text;
    let hasSuggestionsField = false;
    for (const match of matches) {
      const fieldName = String(match[1] || "").trim();
      const rawValue = String(match[2] || "").trim();
      if (!WT_PLUS_FIELD_NAMES.has(fieldName)) {
        return null;
      }
      const quotedValue = quoteWtPlusValue(rawValue);
      if (!quotedValue) {
        return null;
      }
      if (fieldName === "Suggestions") {
        hasSuggestionsField = true;
      }
      terms.push(`${fieldName}=${quotedValue}`);
      stripped = stripped.replace(match[0], " ");
    }

    const yearTokens = text.match(/\b(?:B\d{4}|D\d{4}|\d{4}s)\b/g) || [];
    let remainder = stripped
      .replace(/\b(?:OR|NOT)\b/gi, " ")
      .replace(/\b(?:B\d{4}|D\d{4}|\d{4}s)\b/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (remainder) {
      if (hasSuggestionsField) {
        terms.push(remainder);
      } else {
        return null;
      }
    }

    return {
      query: [...terms, ...yearTokens].join(" ").trim(),
      title: `WT+ search: ${text}`,
      description: text,
    };
  }

  function parseNaturalLanguageWtPlusQuery(queryText) {
    const text = String(queryText || "").trim();
    if (!text) return null;

    const normalizedText = text
      .replace(/^\s*(?:search(?:\s+for)?|find|show|list|get|look(?:\s+up)?)\s+/i, "")
      .replace(/^\s*(?:me\s+)?/i, "")
      .trim();

    if (isLikelySuggestionsPrompt(normalizedText)) {
      const suggestionParse = translateSuggestionsFreeTextToQuery(normalizedText);
      if (suggestionParse?.query) {
        const hasSuggestionContextTerms =
          !!suggestionParse.suggestionId &&
          !!String(suggestionParse.query)
            .replace(/(?:^|\s)Suggestions=\d+\b/i, " ")
            .replace(/\s{2,}/g, " ")
            .trim();
        const suggestionSearchType = hasSuggestionContextTerms ? "text" : "suggestions";
        return {
          query: suggestionParse.query,
          title: `WT+ Suggestions: ${suggestionParse.understood || suggestionParse.query}`,
          description: suggestionParse.understood || suggestionParse.query,
          searchType: suggestionSearchType,
          suggestionId: suggestionParse.suggestionId || "",
          suggestionOptions: suggestionParse.options || {},
        };
      }
    }

    let match = normalizedText.match(
      /^(?:profiles?|people)\s+(?:in\s+)?category\s*[:=]?\s*(?!born\b|died\b|married\b|with\b|ancestors?\b|descendants?\b|cc7\b|in\s+tree\b)(.+)$/i
    );
    if (match?.[1]) {
      const category = stripSurroundingQuotes(match[1]);
      if (category) {
        return {
          query: `CategoryFull=${quoteWtPlusValue(category)}`,
          title: `WT+ Category: ${category}`,
          description: `CategoryFull=${category}`,
        };
      }
    }

    match = normalizedText.match(
      /^(?:in\s+)?category\s*[:=]?\s*(?!born\b|died\b|married\b|with\b|ancestors?\b|descendants?\b|cc7\b|in\s+tree\b)(.+)$/i
    );
    if (match?.[1]) {
      const category = stripSurroundingQuotes(match[1]);
      if (category) {
        return {
          query: `CategoryFull=${quoteWtPlusValue(category)}`,
          title: `WT+ Category: ${category}`,
          description: `CategoryFull=${category}`,
        };
      }
    }

    match = normalizedText.match(/^(?:profiles?|people)\s+(?:with\s+)?category\s+word\s*[:=]?\s*(.+)$/i);
    if (match?.[1]) {
      const categoryWord = stripSurroundingQuotes(match[1]);
      if (categoryWord) {
        return {
          query: `CategoryWord=${quoteWtPlusValue(categoryWord)}`,
          title: `WT+ Category Word: ${categoryWord}`,
          description: `CategoryWord=${categoryWord}`,
        };
      }
    }

    match = normalizedText.match(/^(?:with\s+)?category\s+word\s*[:=]?\s*(.+)$/i);
    if (match?.[1]) {
      const categoryWord = stripSurroundingQuotes(match[1]);
      if (categoryWord) {
        return {
          query: `CategoryWord=${quoteWtPlusValue(categoryWord)}`,
          title: `WT+ Category Word: ${categoryWord}`,
          description: `CategoryWord=${categoryWord}`,
        };
      }
    }

    match = normalizedText.match(/^(?:profiles?|people)\s+(?:with\s+)?template\s*[:=]?\s*(.+)$/i);
    if (match?.[1]) {
      const templateText = stripSurroundingQuotes(match[1]);
      if (templateText) {
        return {
          query: `TemplateText=${quoteWtPlusValue(templateText)}`,
          title: `WT+ Template: ${templateText}`,
          description: `TemplateText=${templateText}`,
        };
      }
    }

    match = normalizedText.match(/^(?:with\s+)?template\s*[:=]?\s*(.+)$/i);
    if (match?.[1]) {
      const templateText = stripSurroundingQuotes(match[1]);
      if (templateText) {
        return {
          query: `TemplateText=${quoteWtPlusValue(templateText)}`,
          title: `WT+ Template: ${templateText}`,
          description: `TemplateText=${templateText}`,
        };
      }
    }

    match = normalizedText.match(/^(?:living\s+)?notables?\s+project$/i);
    if (match) {
      const category = /^living/i.test(normalizedText) ? "Living Notables Project" : "Notables Project";
      return {
        query: `CategoryFull=${quoteWtPlusValue(category)}`,
        title: `WT+ Category: ${category}`,
        description: `CategoryFull=${category}`,
      };
    }

    match = normalizedText.match(/^notables?\s+sticker$/i);
    if (match) {
      return {
        query: `TemplateText=${quoteWtPlusValue("Notables Sticker")}`,
        title: "WT+ Template: Notables Sticker",
        description: "TemplateText=Notables Sticker",
      };
    }

    match = normalizedText.match(/^notables?$/i);
    if (match) {
      return {
        query: `CategoryWord=${quoteWtPlusValue("Notables")}`,
        title: "WT+ Category Word: Notables",
        description: "CategoryWord=Notables",
      };
    }

    match = normalizedText.match(
      /^(?:(?:profiles?|people)\s+)?(?:with\s+)?(?:profile\s+)?status\s*[:=]?\s*(open|unsourced|unconnected|orphan)$/i
    );
    if (match?.[1]) {
      const status = `${match[1].slice(0, 1).toUpperCase()}${match[1].slice(1).toLowerCase()}`;
      return {
        query: status,
        title: `WT+ Profile Status: ${status}`,
        description: status,
      };
    }

    match = normalizedText.match(/^(open|unsourced|unconnected|orphan)\s+profiles?$/i);
    if (match?.[1]) {
      const status = `${match[1].slice(0, 1).toUpperCase()}${match[1].slice(1).toLowerCase()}`;
      return {
        query: status,
        title: `WT+ Profile Status: ${status}`,
        description: status,
      };
    }

    match = normalizedText.match(/^(?:profiles?|people)\s+born\s+in\s+(\d{4})$/i);
    if (match?.[1]) {
      return {
        query: `B${match[1]}`,
        title: `WT+ Birth Year: ${match[1]}`,
        description: `B${match[1]}`,
      };
    }

    match = normalizedText.match(/^(?:profiles?|people)\s+died\s+in\s+(\d{4})$/i);
    if (match?.[1]) {
      return {
        query: `D${match[1]}`,
        title: `WT+ Death Year: ${match[1]}`,
        description: `D${match[1]}`,
      };
    }

    match = normalizedText.match(/^(?:profiles?|people)\s+born\s+in\s+(\d{4})s$/i);
    if (match?.[1]) {
      return {
        query: `${match[1]}s`,
        title: `WT+ Birth Decade: ${match[1]}s`,
        description: `${match[1]}s`,
      };
    }

    match = normalizedText.match(/^(?:profiles?\s+)?born\s+in\s+(\d{4})$/i);
    if (match?.[1]) {
      return {
        query: `B${match[1]}`,
        title: `WT+ Birth Year: ${match[1]}`,
        description: `B${match[1]}`,
      };
    }

    match = text.match(/^(?:profiles?\s+)?died\s+in\s+(\d{4})$/i);
    if (match?.[1]) {
      return {
        query: `D${match[1]}`,
        title: `WT+ Death Year: ${match[1]}`,
        description: `D${match[1]}`,
      };
    }

    match = text.match(/^(?:profiles?\s+)?born\s+in\s+(\d{4})s$/i);
    if (match?.[1]) {
      return {
        query: `${match[1]}s`,
        title: `WT+ Birth Decade: ${match[1]}s`,
        description: `${match[1]}s`,
      };
    }

    match = normalizedText.match(/^(?:profiles?|people)\s+born\s+in\s+(.+)$/i);
    if (match?.[1]) {
      const location = stripSurroundingQuotes(match[1]);
      if (location && !/^\d{4}s?$/i.test(location)) {
        return {
          query: `BirthLocation=${quoteWtPlusValue(location)}`,
          title: `WT+ Birth Location: ${location}`,
          description: `BirthLocation=${location}`,
        };
      }
    }

    match = normalizedText.match(/^(?:profiles?|people)\s+died\s+in\s+(.+)$/i);
    if (match?.[1]) {
      const location = stripSurroundingQuotes(match[1]);
      if (location && !/^\d{4}$/i.test(location)) {
        return {
          query: `DeathLocation=${quoteWtPlusValue(location)}`,
          title: `WT+ Death Location: ${location}`,
          description: `DeathLocation=${location}`,
        };
      }
    }

    match = normalizedText.match(/^(?:profiles?|people)\s+married\s+in\s+(.+)$/i);
    if (match?.[1]) {
      const location = stripSurroundingQuotes(match[1]);
      if (location) {
        return {
          query: `MarriageLocation=${quoteWtPlusValue(location)}`,
          title: `WT+ Marriage Location: ${location}`,
          description: `MarriageLocation=${location}`,
        };
      }
    }

    match = normalizedText.match(/^(?:profiles?|people)\s+(?:from|in)\s+(.+)$/i);
    if (match?.[1]) {
      const location = stripSurroundingQuotes(match[1]);
      if (location) {
        return {
          query: `Location=${quoteWtPlusValue(location)}`,
          title: `WT+ Location: ${location}`,
          description: `Location=${location}`,
        };
      }
    }

    match = normalizedText.match(/^(?:profiles?|people)\s+with\s+first\s+name\s+(.+)$/i);
    if (match?.[1]) {
      const firstName = stripSurroundingQuotes(match[1]);
      if (firstName) {
        return {
          query: `FirstName=${quoteWtPlusValue(firstName)}`,
          title: `WT+ First Name: ${firstName}`,
          description: `FirstName=${firstName}`,
        };
      }
    }

    match = normalizedText.match(
      /^(?:profiles?|people)\s+with\s+(?:last\s+name\s+at\s+birth|lnab|surname|last\s+name)\s+(.+)$/i
    );
    if (match?.[1]) {
      const lastName = stripSurroundingQuotes(match[1]);
      if (lastName) {
        return {
          query: `LastNameAtBirth=${quoteWtPlusValue(lastName)}`,
          title: `WT+ LNAB: ${lastName}`,
          description: `LastNameAtBirth=${lastName}`,
        };
      }
    }

    match = normalizedText.match(/^(?:profiles?|people)\s+with\s+any\s+last\s+name\s+(.+)$/i);
    if (match?.[1]) {
      const lastName = stripSurroundingQuotes(match[1]);
      if (lastName) {
        return {
          query: `AllLastNames=${quoteWtPlusValue(lastName)}`,
          title: `WT+ Any Last Name: ${lastName}`,
          description: `AllLastNames=${lastName}`,
        };
      }
    }

    match = normalizedText.match(/^(?:profile\s+)?(?:wikitree\s+id|wtid|id)\s+(.+)$/i);
    if (match?.[1]) {
      const wtId = stripSurroundingQuotes(match[1]);
      if (wtId) {
        return {
          query: `WikiTreeID=${quoteWtPlusValue(wtId)}`,
          title: `WT+ WikiTree ID: ${wtId}`,
          description: `WikiTreeID=${wtId}`,
        };
      }
    }

    match = normalizedText.match(/^(?:profiles?|people)\s+in\s+tree\s+(.+)$/i);
    if (match?.[1]) {
      const tree = stripSurroundingQuotes(match[1]);
      if (tree) {
        return {
          query: `Tree=${quoteWtPlusValue(tree)}`,
          title: `WT+ Tree: ${tree}`,
          description: `Tree=${tree}`,
        };
      }
    }

    if (/^ancestors$/i.test(normalizedText)) {
      const ancestorRoot = getDefaultWtPlusRoot();
      if (ancestorRoot?.wtId) {
        return {
          query: `Ancestors=${quoteWtPlusValue(ancestorRoot.wtId)}`,
          title: `WT+ Ancestors: ${ancestorRoot.displayName}`,
          description: `Ancestors=${ancestorRoot.wtId}`,
        };
      }
    }

    match = normalizedText.match(/^ancestors\s+of\s+(.+)$/i);
    if (match?.[1]) {
      const ancestorRoot = resolveWtPlusSubjectRoot(match[1]);
      if (ancestorRoot?.wtId) {
        return {
          query: `Ancestors=${quoteWtPlusValue(ancestorRoot.wtId)}`,
          title: `WT+ Ancestors: ${ancestorRoot.displayName}`,
          description: `Ancestors=${ancestorRoot.wtId}`,
        };
      }
    }

    match = normalizedText.match(/^(.+?)'s\s+ancestors$/i);
    if (match?.[1]) {
      const ancestorRoot = resolveWtPlusSubjectRoot(match[1]);
      if (ancestorRoot?.wtId) {
        return {
          query: `Ancestors=${quoteWtPlusValue(ancestorRoot.wtId)}`,
          title: `WT+ Ancestors: ${ancestorRoot.displayName}`,
          description: `Ancestors=${ancestorRoot.wtId}`,
        };
      }
    }

    if (/^descendants$/i.test(normalizedText)) {
      const descendantRoot = getDefaultWtPlusRoot();
      if (descendantRoot?.wtId) {
        return {
          query: `Descendants=${quoteWtPlusValue(descendantRoot.wtId)}`,
          title: `WT+ Descendants: ${descendantRoot.displayName}`,
          description: `Descendants=${descendantRoot.wtId}`,
        };
      }
    }

    match = normalizedText.match(/^descendants\s+of\s+(.+)$/i);
    if (match?.[1]) {
      const descendantRoot = resolveWtPlusSubjectRoot(match[1]);
      if (descendantRoot?.wtId) {
        return {
          query: `Descendants=${quoteWtPlusValue(descendantRoot.wtId)}`,
          title: `WT+ Descendants: ${descendantRoot.displayName}`,
          description: `Descendants=${descendantRoot.wtId}`,
        };
      }
    }

    match = normalizedText.match(/^(.+?)'s\s+descendants$/i);
    if (match?.[1]) {
      const descendantRoot = resolveWtPlusSubjectRoot(match[1]);
      if (descendantRoot?.wtId) {
        return {
          query: `Descendants=${quoteWtPlusValue(descendantRoot.wtId)}`,
          title: `WT+ Descendants: ${descendantRoot.displayName}`,
          description: `Descendants=${descendantRoot.wtId}`,
        };
      }
    }

    const groupedQuery = parseNaturalLanguageWtPlusGroup(normalizedText);
    if (groupedQuery?.query) {
      return {
        query: groupedQuery.query,
        title: `WT+ search: ${groupedQuery.understood || normalizedText}`,
        description: groupedQuery.understood || normalizedText,
        understood: groupedQuery.understood || normalizedText,
      };
    }

    match = normalizedText.match(/^cc7\s+(?:of\s+)?(.+)$/i);
    if (match?.[1]) {
      const cc7Root = stripSurroundingQuotes(match[1]);
      if (cc7Root) {
        return {
          query: `CC7=${quoteWtPlusValue(cc7Root)}`,
          title: `WT+ CC7: ${cc7Root}`,
          description: `CC7=${cc7Root}`,
        };
      }
    }

    return null;
  }

  async function callAiParseWtPlusQuery(rawQuery) {
    try {
      const options = await getChatOptions();
      if (!options?.allowAiFallback) return null;

      const { provider, key, model } = await getChatAiConfig();
      if (!key) return null;

      const system = [
        "You translate plain-English genealogy searches into WikiTree+ profile-search queries.",
        "Return JSON only and nothing else.",
        'Format: {"understood":"short summary","query":"WT+ query string"}',
        "Allowed field=value fields:",
        "WikiTreeID, LastNameAtBirth, AllLastNames, FirstName, Location, BirthLocation, MarriageLocation, DeathLocation, birthcountry, birthregion, deathcountry, deathregion, marriagecountry, marriageregion, CategoryFull, CategoryWord, TemplateText, Tree, Ancestors, Descendants, CC7, Creator_, changesmonth, created, Suggestions, sql.",
        "Allowed raw tokens:",
        "Open, Unsourced, Unconnected, Orphan, Notables, connected, unlinked, PublicTree, PrivateTree, male, female, NoGender, B0, D0, pre1500, NoFather, NoMother, NoParents, NoSpouses, NoChildren, mtDNA, yDNA, auDNA, noGEDMatchID, noMitoyDNAID, Private, Public, ProjectManaged, PPP, NeverEdited, ApprovedMerge, PendingMerge, UnmergedMatch, GEDCOMJunk, SourceJunk, IsInWikiData, relation=father/mother/parents/spouses/children/siblings/nuclear/addfather/addmother/addparents/addspouses/addchildren/addsiblings/addnuclear, B1850, D1912, 1850s, 20Cen, age42, LastEdit2020, Tree123, fgcem1234, fgmem5678, ERR123.",
        "OR and NOT operators are allowed between terms.",
        "Only use those allowed fields and tokens.",
        "Use sql= for filters that are not easily represented as simple field=value, including date boundaries, line counts, and heading/category checks.",
        "Quote values that contain spaces or commas.",
        'If the request mentions "ancestors" or "descendants", preserve that in the query with Ancestors=<WikiTreeID> or Descendants=<WikiTreeID> and do not drop the family-root part.',
        'For bare prompts like "Ancestors ..." or "Descendants ...", assume the current profile person if available; otherwise use the logged-in user as the family root.',
        'Treat "Notables" primarily as a category/template concept, such as CategoryFull="Notables Project", CategoryFull="Living Notables Project", CategoryWord=Notables, or TemplateText="Notables Sticker", not as a raw status token.',
        "If the prompt is ambiguous, choose the most likely WT+ interpretation and summarize it in understood.",
        "Examples:",
        '{"understood":"unsourced profiles born in Devon","query":"Unsourced BirthLocation="Devon, England""}',
        '{"understood":"people in category Puritan Great Migration","query":"CategoryFull="Puritan Great Migration""}',
        '{"understood":"notables born in Liverpool","query":"CategoryWord=Notables BirthLocation=Liverpool"}',
        '{"understood":"Charles Darwin descendants","query":"Descendants=Darwin-15"}',
        '{"understood":"current profile descendants born in Newfoundland before 1900","query":"Descendants=CurrentProfile BirthLocation=Newfoundland sql="([Default].[Birth Date].AsNumber < 19000000)""}',
        '{"understood":"Smith in Liverpool born before 1800","query":"LastNameAtBirth=Smith Location=Liverpool sql="([Default].[Birth Date].AsNumber < 18000000)""}',
      ].join("\n");
      const user = `Translate this into a WT+ query: "${String(rawQuery || "").trim()}"`;
      const prompt = `${system}\n\n${user}`;

      console.debug("wbe: callAiParseWtPlusQuery outbound prompt", { rawQuery, prompt });

      let aiResult = null;
      if (typeof window.callAiModel === "function") {
        aiResult = await window.callAiModel(prompt);
      } else {
        const payload = {
          action: "chatWithAI",
          provider,
          key,
          model,
          prompt,
          includeApiDocContext: false,
        };

        const sendToBg = (pl) =>
          new Promise((resolve) => {
            try {
              chrome.runtime.sendMessage(pl, (resp) => {
                if (chrome.runtime.lastError) {
                  resolve({ success: false, error: chrome.runtime.lastError.message });
                  return;
                }
                resolve(resp || { success: false, error: "no-response" });
              });
            } catch (error) {
              resolve({ success: false, error: String(error?.message || error) });
            }
          });

        const resp = await sendToBg(payload);
        if (!resp?.success || typeof resp.response !== "string") {
          console.info("wbe: callAiParseWtPlusQuery background call failed", { error: resp?.error || "no-response" });
          return null;
        }
        aiResult = resp.response;
      }

      if (!aiResult) return null;

      const txt = String(aiResult || "");
      const jsonMatch = txt.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : txt;
      let parsed = null;
      try {
        parsed = JSON.parse(jsonText);
      } catch (error) {
        console.info("wbe: callAiParseWtPlusQuery JSON parse failed", { error, text: jsonText });
        return null;
      }

      const completedQuery = ensureWtPlusFamilyField(rawQuery, parsed?.query || "");
      const normalizedQuery = normalizeWtPlusQueryString(completedQuery || "");
      if (!normalizedQuery) {
        console.info("wbe: callAiParseWtPlusQuery returned invalid query", { parsed });
        return null;
      }

      return {
        query: normalizedQuery,
        understood: String(parsed?.understood || rawQuery || "").trim(),
        title: `WT+ search: ${String(parsed?.understood || rawQuery || normalizedQuery).trim()}`,
      };
    } catch (error) {
      console.info("wbe: callAiParseWtPlusQuery failed", { error });
      return null;
    }
  }

  function shouldPreferAiWtPlusQuery(queryText) {
    const text = String(queryText || "").trim();
    if (!text) {
      return false;
    }

    const hasFamilyRoot = /\b(?:ancestors|descendants)\b/i.test(text);
    const hasBoundaryDate = /\b(?:before|after)\s+\d{4}(?:-\d{2}(?:-\d{2})?)?\b/i.test(text);
    const hasLocationOrLifeEvent = /\b(?:born|died|married)\b/i.test(text);
    const hasCategoryConcept = /\b(?:category|notables?|template|sticker)\b/i.test(text);
    return (
      (hasFamilyRoot && hasBoundaryDate && hasLocationOrLifeEvent) || (hasCategoryConcept && hasLocationOrLifeEvent)
    );
  }

  function extractInlineSuggestionIdFromWtPlusTextQuery(queryText) {
    return extractSuggestionId(queryText);
  }

  async function runWtPlusProfileQuery(wtPlusQuery, title, interpretation = null, runOptions = {}) {
    const templateCanonicalQuery = await canonicalizeWtPlusTemplateTerms(wtPlusQuery);
    const contextCanonicalQuery = resolveWtPlusContextPlaceholders(templateCanonicalQuery);
    const { query: canonicalQuery, categoryMatches } = await canonicalizeWtPlusCategoryTerms(contextCanonicalQuery);
    const suggestionId = runOptions?.suggestionId || "";
    const suggestionOptions = runOptions?.suggestionOptions || {};
    const isSuggestionsSearch = runOptions?.searchType === "suggestions";

    if (isSuggestionsSearch) {
      recordWtPlusParseTelemetry("queryRan");
      return {
        message: `WT+ Suggestions queries are opened directly in WT+ (no JSON API result set available in chat). Query: ${canonicalQuery}`,
        actions: [
          {
            label: "Open in WT+",
            actionType: "wtplus-open",
            wtPlusQuery: canonicalQuery,
            wtPlusSearchType: "suggestions",
            wtPlusSuggestionId: suggestionId || "",
            wtPlusSuggestionOptions: suggestionOptions,
          },
        ],
      };
    }

    const encodedQuery = encodeURIComponent(canonicalQuery);
    console.debug("wbe: WT+ direct query", {
      wtPlusQuery,
      canonicalQuery,
      categoryMatches,
      encodedQuery,
      title,
      interpretation,
    });

    showChatShaky(`Running WT+ query: ${canonicalQuery}`);
    try {
      recordWtPlusParseTelemetry("queryRan");
      const response = await wtAPIProfileSearch("ChatWTPlus", encodedQuery, { maxProfiles: WT_PLUS_MAX_PROFILES });
      const profiles = response?.response?.profiles || [];
      if (!profiles.length) {
        recordWtPlusParseTelemetry("queryZeroResults");
        hideChatShaky();
        return `I couldn't find any profiles for WT+ query: ${canonicalQuery}`;
      }

      const uniqueIds = [...new Set(profiles.map((value) => String(value)))];
      showChatShaky(`Fetching ${uniqueIds.length} WT+ matches...`);
      const fields =
        "FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,RealName,Derived.ShortName,Derived.LongNamePrivate,Derived.BirthNamePrivate,Father,Mother,BirthDate,BirthDateDecade,BirthLocation,DeathDate,DeathDateDecade,DeathLocation,Gender,Id,Name";
      const [, , peopleById] = await fetchPeoplePaged(WBE_CHAT_APP_ID, uniqueIds, fields, {
        resolveRedirect: 1,
        limit: WT_PLUS_GET_PEOPLE_CHUNK,
      });

      const people = uniqueIds.map((key) => peopleById?.[String(key)]).filter(Boolean);
      const ancestorRootWtId = extractWtPlusAncestorsRoot(canonicalQuery);
      const rows = ancestorRootWtId
        ? await buildWtPlusAncestorRows(ancestorRootWtId, uniqueIds, fields)
        : people.map((person) => mapApiPersonToStandardRow(person, { wtId: person?.Name }));
      const tableFactory = ancestorRootWtId ? makeAncestorProfileTable : makeStandardProfileTable;
      const table = tableFactory(title || `WT+ search: ${wtPlusQuery}`, rows, [[0, "asc"]]);
      if (!ancestorRootWtId) {
        table.columns = (table.columns || []).filter(
          (column) => !["degrees", "spouse", "spouseList"].includes(column.key)
        );
      }
      hideChatShaky();

      const categoryNote = (categoryMatches || [])
        .filter((match) => match?.category && match.requested && match.category !== match.requested)
        .map((match) => `used closest category "${match.category}" for "${match.requested}"`)
        .join("; ");
      const inlineSuggestionId = extractInlineSuggestionIdFromWtPlusTextQuery(canonicalQuery);
      const actions = [
        {
          label: "Open in WT+",
          actionType: "wtplus-open",
          wtPlusQuery: canonicalQuery,
          wtPlusSearchType: "text",
          wtPlusSuggestionId: suggestionId || "",
          wtPlusSuggestionOptions: suggestionOptions,
        },
      ];
      if (inlineSuggestionId) {
        actions.push({
          label: "Open Suggestions Search in WT+",
          actionType: "wtplus-open",
          wtPlusQuery: canonicalQuery,
          wtPlusSearchType: "suggestions",
          wtPlusSuggestionId: inlineSuggestionId,
          wtPlusSuggestionOptions: suggestionOptions,
        });
      }
      return {
        message: interpretation?.understood
          ? `AI interpreted this as "${interpretation.understood}" and ran WT+ query: ${canonicalQuery}. Found ${
              rows.length
            } profile${rows.length === 1 ? "" : "s"}.${categoryNote ? ` Also ${categoryNote}.` : ""}`
          : `Found ${rows.length} profile${rows.length === 1 ? "" : "s"} for WT+ query: ${canonicalQuery}${
              categoryNote ? `. Also ${categoryNote}.` : ""
            }`,
        actions,
        table,
        autoOpen: true,
      };
    } catch (error) {
      hideChatShaky();
      return `I couldn't complete the WT+ query "${canonicalQuery}". Error: ${error?.message || error}`;
    }
  }

  function extractWtPlusAncestorsRoot(query) {
    const normalizedQuery = normalizeWtPlusQueryString(query);
    if (!normalizedQuery) {
      return "";
    }

    const ancestorTerms = Array.from(
      normalizedQuery.matchAll(/(?:^|\s)Ancestors=((?:"[^"]+")|(?:'[^']+')|(?:[^\s]+))/gi)
    );
    if (ancestorTerms.length !== 1) {
      return "";
    }

    const nonAncestorText = normalizedQuery.replace(ancestorTerms[0][0], " ").trim();
    if (nonAncestorText) {
      return "";
    }

    return stripSurroundingQuotes(ancestorTerms[0][1]);
  }

  function getGenerationFromAhnen(ahnen) {
    const numericAhnen = Number(ahnen);
    if (!Number.isFinite(numericAhnen) || numericAhnen < 2) {
      return 0;
    }

    return Math.floor(Math.log2(numericAhnen));
  }

  function buildAncestorRowsFromPeopleMap(rootProfile, peopleMap = {}, includedIds = null) {
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
        if (!id || !ahnenById.has(id)) {
          return false;
        }
        if (includedIds && !includedIds.has(id)) {
          return false;
        }
        return true;
      })
      .map((profile) => {
        const ahnen = ahnenById.get(String(profile?.Id ?? "")) ?? "";
        const derivedGeneration = getGenerationFromAhnen(ahnen);
        return {
          ...mapApiPersonToStandardRow(profile, {
            wtId: profile?.Name,
            degrees: derivedGeneration || "",
            surnamePreference: "birthFirst",
          }),
          ahnen,
        };
      })
      .sort((left, right) => Number(left?.ahnen || 0) - Number(right?.ahnen || 0));
  }

  async function buildWtPlusAncestorRows(rootWtId, matchedIds, fields) {
    const includedIds = new Set((matchedIds || []).map((value) => String(value || "").trim()).filter(Boolean));
    if (!includedIds.size) {
      return [];
    }

    const [, , rootPeopleMap] = await fetchPeoplePaged(WBE_CHAT_APP_ID, rootWtId, "Id,Name,Father,Mother", {
      resolveRedirect: 1,
      limit: 1,
    });
    const rootProfile = Object.values(rootPeopleMap || {})[0] || null;
    if (!rootProfile) {
      return [];
    }

    const [, , ancestorPeopleMap] = await fetchPeoplePaged(WBE_CHAT_APP_ID, rootProfile.Name || rootWtId, fields, {
      ancestors: WT_ANCESTOR_GRAPH_GENERATIONS,
      minGeneration: 1,
      resolveRedirect: 1,
      limit: 1000,
    });

    return buildAncestorRowsFromPeopleMap(rootProfile, ancestorPeopleMap || {}, includedIds);
  }

  function sanitizeAiParse(aiParse) {
    if (!aiParse || typeof aiParse !== "object") return {};
    const allowed = new Set([
      "BirthDateStart",
      "BirthDateEnd",
      "DeathDateStart",
      "DeathDateEnd",
      "BirthLocation",
      "DeathLocation",
      "fatherFirstName",
      "fatherLastName",
      "motherFirstName",
      "motherLastName",
      "spouseQuery",
      "skipVariants",
      "watchlist",
      "FirstName",
      "LastName",
      "RealName",
      "noVariants",
      "bornBefore",
      "bornAfter",
      "diedBefore",
      "diedAfter",
    ]);
    const out = {};
    for (const k of Object.keys(aiParse)) {
      if (!allowed.has(k)) continue;
      const v = aiParse[k];
      if (v === undefined || v === null) continue;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
    }
    return out;
  }

  function parseKeyValueParams(s) {
    const out = {};
    if (!s || typeof s !== "string") return out;
    const re = /([A-Za-z]+)=((?:"[^"]*")|(?:'[^']*')|[^\s]+)/g;
    let m;
    while ((m = re.exec(s))) {
      const k = m[1];
      let v = m[2];
      if (!v) continue;
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[k] = v;
    }
    return out;
  }

  function normalizeDateToIsoStart(input) {
    if (!input) return null;
    const s = String(input || "").trim();
    const yMatch = s.match(/^(\d{4})$/);
    if (yMatch) return `${yMatch[1]}-01-01`;
    const mMatch = s.match(/^(\d{4})-(\d{2})$/);
    if (mMatch) return `${mMatch[1]}-${mMatch[2]}-01`;
    const dMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dMatch) return `${dMatch[1]}-${dMatch[2]}-${dMatch[3]}`;
    return null;
  }

  function normalizeDateToIsoEnd(input) {
    if (!input) return null;
    const s = String(input || "").trim();
    const yMatch = s.match(/^(\d{4})$/);
    if (yMatch) return `${yMatch[1]}-12-31`;
    const mMatch = s.match(/^(\d{4})-(\d{2})$/);
    if (mMatch) {
      const year = Number(mMatch[1]);
      const month = Number(mMatch[2]);
      const last = new Date(year, month, 0).getDate();
      return `${mMatch[1]}-${mMatch[2]}-${String(last).padStart(2, "0")}`;
    }
    const dMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dMatch) return `${dMatch[1]}-${dMatch[2]}-${dMatch[3]}`;
    return null;
  }

  function parseSearchModifiers(query) {
    const orig = String(query || "").trim();
    let working = orig;
    const modifiers = {
      noVariants: false,
      useWatchlist: false,
      bornBefore: null,
      bornAfter: null,
      diedBefore: null,
      diedAfter: null,
      bornRange: null,
      diedRange: null,
    };

    const quoteMatch = working.match(/"([^"]+)"/);
    if (quoteMatch) {
      modifiers.noVariants = true;
      working = working.replace(quoteMatch[0], quoteMatch[1]);
    }

    if (/\bsearch\s+watchlist\b/i.test(working)) {
      modifiers.useWatchlist = true;
      working = working.replace(/\bsearch\s+watchlist\b/i, "");
    }

    if (/\bno\s+variants\b/i.test(working)) {
      modifiers.noVariants = true;
      working = working.replace(/\bno\s+variants\b/i, "");
    }

    const dateTokenRegex = /(born|b|died|d)\s*[:=]?\s*([^,;]+)/gi;
    let dtMatch;
    while ((dtMatch = dateTokenRegex.exec(working))) {
      const key = (dtMatch[1] || "").toLowerCase();
      const raw = (dtMatch[2] || "").trim();
      working = working.replace(dtMatch[0], "");

      const rangeMatch = raw.match(/^(\d{4}(?:-\d{2}(?:-\d{2})?)?)\s*[\-–]\s*(\d{4}(?:-\d{2}(?:-\d{2})?)?)$/);
      if (rangeMatch) {
        const start = normalizeDateToIsoStart(rangeMatch[1]);
        const end = normalizeDateToIsoEnd(rangeMatch[2]);
        if (key.startsWith("b")) modifiers.bornRange = { start, end };
        else modifiers.diedRange = { start, end };
        continue;
      }

      const compMatch = raw.match(/^([<>]|bef|aft|before|after)\s*(\d{4}(?:-\d{2}(?:-\d{2})?)?)$/i);
      if (compMatch) {
        const op = compMatch[1].toLowerCase();
        const date = compMatch[2];
        if (key.startsWith("b")) {
          if (op === "<" || /^bef/i.test(op) || /^before/i.test(op))
            modifiers.bornBefore = normalizeDateToIsoStart(date);
          else modifiers.bornAfter = normalizeDateToIsoEnd(date);
        } else {
          if (op === "<" || /^bef/i.test(op) || /^before/i.test(op))
            modifiers.diedBefore = normalizeDateToIsoStart(date);
          else modifiers.diedAfter = normalizeDateToIsoEnd(date);
        }
        continue;
      }

      const singleMatch = raw.match(/^(\d{4}(?:-\d{2}(?:-\d{2})?)?)$/);
      if (singleMatch) {
        const sd = singleMatch[1];
        if (key.startsWith("b")) {
          modifiers.bornAfter = normalizeDateToIsoStart(sd);
          modifiers.bornBefore = normalizeDateToIsoEnd(sd);
        } else {
          modifiers.diedAfter = normalizeDateToIsoStart(sd);
          modifiers.diedBefore = normalizeDateToIsoEnd(sd);
        }
      }
    }

    const parentRegex = /(father|dad|fatherFirstName|fatherFirst|fatherLast|fatherLastName)\s*[:=]?\s*([A-Za-z'\-]+)/i;
    const motherRegex = /(mother|mum|motherFirstName|motherFirst|motherLast|motherLastName)\s*[:=]?\s*([A-Za-z'\-]+)/i;
    const pMatch = working.match(parentRegex);
    if (pMatch) {
      const pKey = (pMatch[1] || "").toLowerCase();
      const pVal = (pMatch[2] || "").trim();
      if (/last/i.test(pKey)) modifiers.fatherLastName = pVal;
      else modifiers.fatherFirstName = pVal;
      working = working.replace(pMatch[0], "");
    }
    const mMatch2 = working.match(motherRegex);
    if (mMatch2) {
      const mKey = (mMatch2[1] || "").toLowerCase();
      const mVal = (mMatch2[2] || "").trim();
      if (/last/i.test(mKey)) modifiers.motherLastName = mVal;
      else modifiers.motherFirstName = mVal;
      working = working.replace(mMatch2[0], "");
    }

    const freeRange = working.match(/(\d{4}(?:-\d{2}(?:-\d{2})?)?)\s*[\-–]\s*(\d{4}(?:-\d{2}(?:-\d{2})?)?)/);
    if (freeRange) {
      const start = normalizeDateToIsoStart(freeRange[1]);
      const end = normalizeDateToIsoEnd(freeRange[2]);
      modifiers.bornRange = { start, end };
      working = working.replace(freeRange[0], "");
    }

    return { mainQuery: working.trim(), modifiers };
  }

  async function callAiParseQuery(rawQuery) {
    try {
      const options = await getChatOptions();
      if (!options?.allowAiFallback) return null;

      const { provider, key, model } = await getChatAiConfig();
      if (!key) return null;

      const system =
        "You are a parser that converts a user's short search query into a JSON object with the following optional keys: FirstName, LastName, RealName, BirthDateStart, BirthDateEnd, DeathDateStart, DeathDateEnd, BirthLocation, DeathLocation, fatherFirstName, fatherLastName, motherFirstName, motherLastName, spouseQuery, skipVariants (true/false), watchlist (true/false). Only output valid JSON and nothing else.";
      const user = `Parse this search query into JSON: "${String(rawQuery || "").trim()}"`;

      let aiResult = null;
      if (typeof window.callAiModel === "function") {
        aiResult = await window.callAiModel(`${system}\n\n${user}`);
      } else {
        const payload = {
          action: "chatWithAI",
          provider,
          key,
          model,
          prompt: `${system}\n\n${user}`,
          includeApiDocContext: false,
        };

        const sendToBg = (pl) =>
          new Promise((resolve) => {
            try {
              chrome.runtime.sendMessage(pl, (resp) => {
                if (chrome.runtime.lastError) {
                  resolve({ success: false, error: chrome.runtime.lastError.message });
                  return;
                }
                resolve(resp || { success: false, error: "no-response" });
              });
            } catch (e) {
              resolve({ success: false, error: String(e?.message || e) });
            }
          });

        let attempts = 0;
        const maxAttempts = 3;
        let lastErr = null;
        while (attempts < maxAttempts) {
          attempts += 1;
          const resp = await sendToBg(payload);
          if (resp && resp.success && typeof resp.response === "string") {
            aiResult = resp.response;
            break;
          }
          lastErr = resp?.error || `no response (attempt ${attempts})`;
          await new Promise((resolve) => setTimeout(resolve, 250 * attempts));
        }
        if (!aiResult) {
          console.info("wbe: callAiParseQuery background call failed", { error: lastErr });
          return null;
        }
      }

      if (!aiResult) return null;

      const txt = String(aiResult || "");
      const jsonMatch = txt.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : txt;
      try {
        return JSON.parse(jsonText);
      } catch (error) {
        console.info("wbe: callAiParseQuery JSON parse failed", { err: error, text: jsonText });
        return null;
      }
    } catch (error) {
      console.info("wbe: callAiParseQuery failed", { e: error });
      return null;
    }
  }

  return async function tryHandleProfileSearchPrompt(params, originalPrompt) {
    const rawQuery = String(originalPrompt || params?.query || "").trim();
    if (!rawQuery) return null;
    let sanitizedQuery = rawQuery;
    const noVariantsRegex = /\b(no[-\s]?variants|skip[-\s]?variants)\b/gi;
    const hadExplicitNoVariants = noVariantsRegex.test(sanitizedQuery);
    if (hadExplicitNoVariants)
      sanitizedQuery = sanitizedQuery
        .replace(noVariantsRegex, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    const query = sanitizedQuery;

    try {
      let mainQuery = query;
      let spouseQuery = null;
      const spouseMatch = query.match(/^(.*?)\s*(?:,|-)??\s*(?:spouse|wife|husband|married to)\s*[:\-]?\s*(.+)$/i);
      if (spouseMatch) {
        mainQuery = (spouseMatch[1] || "").trim() || query;
        spouseQuery = (spouseMatch[2] || "").trim();
      }

      console.debug("wbe: tryHandleProfileSearchPrompt initial", {
        query,
        spouseMatch,
        mainQueryBeforeNormalize: mainQuery,
        spouseQuery,
      });

      try {
        if (/^\s*(?:search:?|find|look(?:\s+up)?)\b/i.test(rawQuery) && /\bcategory\b/i.test(rawQuery)) {
          console.debug("wbe: explicit search+category detected — preserving rawQuery for category detection", {
            rawQuery,
          });
          mainQuery = rawQuery;
        }
      } catch (error) {
        /* ignore */
      }

      mainQuery = String(mainQuery || "")
        .replace(/^\s*(?:search:?|find|look(?:\s+up)?)\s+/i, "")
        .trim();

      console.debug("wbe: tryHandleProfileSearchPrompt after strip command", { mainQuery });

      try {
        const mqTokens = (mainQuery || "").split(/\s+/).filter(Boolean);
        if (mqTokens.length === 1) {
          const originalTokens = String(query || "")
            .replace(/^\s*(?:search:?|find|look(?:\s+up)?)\s+/i, "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);
          if (originalTokens.length >= 2) {
            mainQuery = `${originalTokens[0]} ${originalTokens[1]}`;
          }
        }
      } catch (error) {
        /* ignore tokenization errors */
      }

      console.debug("wbe: tryHandleProfileSearchPrompt after recovery", { mainQuery });

      const chatMode = String(params?.chatModeOverride || getSelectedChatMode() || "")
        .trim()
        .toLowerCase();
      if (chatMode === "wtplus") {
        const explicitWtPlusQuery =
          parseExplicitWtPlusQuery(mainQuery) ||
          parseExplicitWtPlusQuery(rawQuery.replace(/^\s*(?:search:?|find|look(?:\s+up)?)\s+/i, ""));
        const preferAiWtPlusQuery = !explicitWtPlusQuery && shouldPreferAiWtPlusQuery(mainQuery);
        const localWtPlusQuery =
          parseNaturalLanguageWtPlusQuery(mainQuery) || parseCombinedNaturalLanguageWtPlusQuery(mainQuery);
        const wtPlusQuery = preferAiWtPlusQuery ? explicitWtPlusQuery : explicitWtPlusQuery || localWtPlusQuery;

        if (wtPlusQuery?.query) {
          if (wtPlusQuery.searchType === "suggestions") {
            recordWtPlusParseTelemetry("parsedSuggestions");
          } else {
            recordWtPlusParseTelemetry("parsedLocal");
          }
          return await runWtPlusProfileQuery(wtPlusQuery.query, wtPlusQuery.title, null, {
            searchType: wtPlusQuery.searchType,
            suggestionId: wtPlusQuery.suggestionId,
            suggestionOptions: wtPlusQuery.suggestionOptions,
          });
        }

        showChatShaky("Asking AI to interpret this as a WT+ query...");
        const aiWtPlusQuery = await callAiParseWtPlusQuery(rawQuery);
        hideChatShaky();
        if (aiWtPlusQuery?.query) {
          recordWtPlusParseTelemetry("parsedAi");
          return await runWtPlusProfileQuery(aiWtPlusQuery.query, aiWtPlusQuery.title, aiWtPlusQuery);
        }

        if (preferAiWtPlusQuery && localWtPlusQuery?.query) {
          return await runWtPlusProfileQuery(localWtPlusQuery.query, localWtPlusQuery.title, localWtPlusQuery);
        }
      }

      let kvParams = {};
      if (/\w+=/.test(mainQuery)) {
        kvParams = parseKeyValueParams(mainQuery);
        if (kvParams.FirstName || kvParams.LastName) {
          mainQuery = `${kvParams.FirstName || ""} ${kvParams.LastName || ""}`.trim();
        } else if (kvParams.RealName) {
          mainQuery = kvParams.RealName;
        }
        if (kvParams.Spouse) spouseQuery = spouseQuery || kvParams.Spouse;
        console.debug("wbe: tryHandleProfileSearchPrompt parsed key=val params", kvParams);
      }

      const quoteRegex = /(?:("[^"]+")|('[^']+')|[“”][^“”]+[“”]|[‘’][^‘’]+[‘’])/;
      const hadQuotedPhrase = quoteRegex.test(String(rawQuery || "")) || quoteRegex.test(mainQuery);

      const parsed = parseSearchModifiers(mainQuery);
      if (hadQuotedPhrase || hadExplicitNoVariants) {
        parsed.modifiers = parsed.modifiers || {};
        parsed.modifiers.noVariants = true;
      }
      console.debug("wbe: tryHandleProfileSearchPrompt parsed modifiers", { parsed });

      let categoryName = null;
      try {
        const detectCategoryName = (raw) => {
          if (!raw) return null;
          const stripQuotes = (s) => (s || "").replace(/^["“”'‘’\s\[]+|["“”'‘’\s\]]+$/g, "").trim();
          const rRaw = String(raw).trim();
          const r = stripQuotes(rRaw);
          let m = r.match(/^Category:\s*(.+)$/i);
          if (m) return stripQuotes(m[1]);
          m = r.match(/^(.+?)\s+category\s*$/i);
          if (m) return stripQuotes(m[1]);
          m = r.match(/\bcategory\s*[:\-]?\s*(.+)$/i);
          if (m) return stripQuotes(m[1]);
          m = rRaw.match(/['"“”'‘’]([^'"“”'‘’]+)['"“”'‘’]\s+category/i);
          if (m) return stripQuotes(m[1]);
          return null;
        };

        const detRaw = detectCategoryName(rawQuery);
        const detMain = detectCategoryName(mainQuery);
        const detQuery = detectCategoryName(query);
        categoryName = detRaw || detMain || detQuery;
        console.debug("wbe: detectCategoryName result", {
          rawQuery,
          mainQuery,
          query,
          detRaw,
          detMain,
          detQuery,
          categoryName,
        });
        if (categoryName && chatMode !== "wt") {
          showChatShaky(`Looking up category "${categoryName}" via WT+...`);
          try {
            let chosenCategory = stripSurroundingQuotes(categoryName);
            chosenCategory = String(chosenCategory || "")
              .replace(/^\s*Search\s+[:\-]?\s*/i, "")
              .trim();

            let catVal = chosenCategory.replace(/,\s+/g, "__");
            catVal = catVal.replace(/\s+/g, "_");

            const qb = `CategoryFull=${catVal}`;
            const encodedQ = encodeURIComponent(qb);
            const debugUrl = `https://plus.wikitree.com/function/WTWebProfileSearch/apiWBE_ChatCategory.json?Query=${encodedQ}&MaxProfiles=${WT_PLUS_MAX_PROFILES}&Format=JSON`;
            console.debug("wbe: WT+ deterministic CategoryFull", { chosenCategory, catVal, qb, encodedQ, debugUrl });

            const resp = await wtAPIProfileSearch("ChatCategory", encodedQ, { maxProfiles: WT_PLUS_MAX_PROFILES });
            const profiles = resp?.response?.profiles || [];
            if (!profiles.length) {
              console.debug("wbe: wtAPIProfileSearch returned no profiles", { qb, resp });
              hideChatShaky();
              return `I couldn't find any profiles for Category:${chosenCategory} via WT+.`;
            }

            const uniqueIds = [...new Set(profiles.map((p) => String(p)))];

            showChatShaky(`Fetching ${uniqueIds.length} profiles...`);
            const fields =
              "FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,RealName,BirthDate,BirthLocation,DeathDate,DeathLocation,Gender,Id,Name";
            const [, , peopleById] = await fetchPeoplePaged(WBE_CHAT_APP_ID, uniqueIds, fields, {
              resolveRedirect: 1,
              limit: WT_PLUS_GET_PEOPLE_CHUNK,
            });

            const people = uniqueIds.map((k) => peopleById?.[String(k)]).filter(Boolean);
            const rows = people.map((p) => mapApiPersonToStandardRow(p, { wtId: p?.Name }));

            const table = makeStandardProfileTable(`Category: ${chosenCategory}`, rows, [[0, "asc"]]);
            table.columns = (table.columns || []).filter((c) => !["degrees", "spouse", "spouseList"].includes(c.key));
            hideChatShaky();
            return {
              message: `Found ${rows.length} profiles in Category:${chosenCategory}`,
              table,
            };
          } catch (error) {
            hideChatShaky();
            console.debug("wbe: category search failed", error);
            return `I couldn't complete the category lookup for "${categoryName}". Error: ${error?.message || error}`;
          }
        } else if (categoryName && chatMode === "wt") {
          console.debug("wbe: category detected but chat mode is 'wt' — skipping WT+ flow", { categoryName });
        }
      } catch (error) {
        console.debug("wbe: category detection error", error);
      }
      if (!categoryName) {
        console.debug("wbe: no category detected; continuing main handlers", { rawQuery, mainQuery, query, parsed });
      }
      const modifiers = parsed.modifiers || {};

      function stripSurroundingQuotes(s) {
        if (!s && s !== "") return s;
        let str = String(s).trim();
        const m = str.match(/^["“”'‘’]?([\s\S]*?)["“”'‘’]?$/);
        if (m) return m[1].trim();
        return str;
      }

      function stripDateQualifiersFromText(s) {
        if (!s) return s;
        let out = String(s);
        const dateTokenRegexLocal = /(\b(?:born|b|died|d)\b)\s*[:=]?\s*([^,;]+)/gi;
        out = out.replace(dateTokenRegexLocal, "");
        out = out.replace(/(\d{4}(?:-\d{2}(?:-\d{2})?)?)\s*[\-–]\s*(\d{4}(?:-\d{2}(?:-\d{2})?)?)/g, "");
        out = out.replace(/\b(no[-\s]?variants|skip[-\s]?variants)\b/gi, "");
        out = out.replace(/\bsearch\s+watchlist\b/gi, "");
        return out.trim();
      }

      if (kvParams && Object.keys(kvParams).length) {
        try {
          if (kvParams.FirstName) modifiers.firstName = kvParams.FirstName;
          if (kvParams.LastName) modifiers.lastName = kvParams.LastName;
          if (kvParams.RealName) modifiers.realName = kvParams.RealName;
          if (kvParams.skipVariants === "1" || kvParams.skipVariants === "true") modifiers.noVariants = true;
          if (kvParams.watchlist === "1" || kvParams.watchlist === "true") modifiers.useWatchlist = true;
          if (kvParams.Spouse) spouseQuery = spouseQuery || kvParams.Spouse;
        } catch (error) {
          /* ignore */
        }
      }

      try {
        const hasKey = await hasAnyApiKey();
        const options = await getChatOptions();
        console.debug("wbe: AI parse gate", {
          hasKey,
          allowAiFallback: options?.allowAiFallback,
          forceAiParse: options?.forceAiParse,
        });
        if ((hasKey && options?.allowAiFallback) || options?.forceAiParse) {
          showChatShaky("Asking AI to parse search query...");
          console.debug("wbe: calling callAiParseQuery for", query);
          const aiParseRaw = await callAiParseQuery(query);
          console.debug("wbe: aiParseRaw", aiParseRaw);
          const aiParse = sanitizeAiParse(aiParseRaw);
          if (aiParse && typeof aiParse === "object" && Object.keys(aiParse).length) {
            Object.keys(aiParse).forEach((k) => {
              try {
                const v = aiParse[k];
                if (v === undefined || v === null || v === "") return;
                if (k === "BirthDateStart") modifiers.bornAfter = v;
                else if (k === "BirthDateEnd") modifiers.bornBefore = v;
                else if (k === "DeathDateStart") modifiers.diedAfter = v;
                else if (k === "DeathDateEnd") modifiers.diedBefore = v;
                else if (k === "BirthLocation") modifiers.birthLocation = v;
                else if (k === "DeathLocation") modifiers.deathLocation = v;
                else if (k === "fatherFirstName") modifiers.fatherFirstName = v;
                else if (k === "fatherLastName") modifiers.fatherLastName = v;
                else if (k === "motherFirstName") modifiers.motherFirstName = v;
                else if (k === "motherLastName") modifiers.motherLastName = v;
                else if (k === "spouseQuery") spouseQuery = spouseQuery || v;
                else if (k === "skipVariants" || k === "noVariants") {
                  if (v) modifiers.noVariants = true;
                } else if (k === "watchlist") modifiers.useWatchlist = !!v;
                else if (k === "FirstName") modifiers.firstName = v;
                else if (k === "LastName") modifiers.lastName = v;
                else if (k === "RealName") modifiers.realName = v;
              } catch (error) {
                /* ignore malformed fields */
              }
            });
          }
          hideChatShaky();
        }
      } catch (error) {
        /* ignore AI parse errors */
      }

      const hasDateModifiers = Boolean(
        modifiers?.bornBefore ||
          modifiers?.bornAfter ||
          modifiers?.diedBefore ||
          modifiers?.diedAfter ||
          modifiers?.bornRange ||
          modifiers?.diedRange
      );
      const effectiveMainQuery =
        hasDateModifiers || modifiers?.noVariants || hadExplicitNoVariants
          ? stripDateQualifiersFromText(mainQuery) || mainQuery
          : mainQuery;

      let exactMatchQuery = null;
      const apiParams = { maxProfiles: 10000 };
      if (modifiers?.noVariants) {
        apiParams.skipVariants = 1;
        const uq = stripSurroundingQuotes(effectiveMainQuery) || "";
        exactMatchQuery = uq || exactMatchQuery;
        const uqTokens = (uq || "").trim().split(/\s+/).filter(Boolean);
        if (uqTokens.length === 1) {
          apiParams.LastName = uqTokens[0];
        } else if (uqTokens.length >= 2) {
          apiParams.FirstName = uqTokens[0];
          apiParams.LastName = uqTokens[uqTokens.length - 1];
        }
      }
      if (hadQuotedPhrase) {
        try {
          function extractQuotedSubstring(s) {
            if (!s) return null;
            const rx = /(?:"([^"]+)")|(?:'([^']+)')|(?:[“”]([^“”]+)[“”])|(?:[‘’]([^‘’]+)[‘’])/;
            const m = String(s).match(rx);
            if (!m) return null;
            return m[1] || m[2] || m[3] || m[4] || null;
          }

          const quotedInner =
            extractQuotedSubstring(rawQuery) ||
            extractQuotedSubstring(effectiveMainQuery) ||
            stripSurroundingQuotes(effectiveMainQuery);
          const qt = (quotedInner || "")
            .trim()
            .replace(/[?!.]+$/g, "")
            .split(/\s+/)
            .filter(Boolean);
          if (qt.length >= 1) {
            if (qt.length === 1) {
              if (!apiParams.LastName) apiParams.LastName = qt[0];
            } else {
              if (!apiParams.FirstName) apiParams.FirstName = qt[0];
              if (!apiParams.LastName) apiParams.LastName = qt[qt.length - 1];
            }
            if (quotedInner) {
              exactMatchQuery = quotedInner;
              const qi = String(quotedInner || "").trim();
              const qiTokens = (qi || "").split(/\s+/).filter(Boolean);
              if (qiTokens.length === 1) {
                if (!apiParams.LastName) apiParams.LastName = qiTokens[0];
              } else if (qiTokens.length >= 2) {
                if (!apiParams.FirstName) apiParams.FirstName = qiTokens[0];
                if (!apiParams.LastName) apiParams.LastName = qiTokens[qiTokens.length - 1];
              }
            }
            apiParams.skipVariants = 1;
          }
        } catch (error) {
          /* ignore quoted-splitting errors */
        }
      }
      if (modifiers?.useWatchlist) {
        apiParams.watchlist = 1;
      }

      if (modifiers?.fatherFirstName) apiParams.fatherFirstName = modifiers.fatherFirstName;
      if (modifiers?.fatherLastName) apiParams.fatherLastName = modifiers.fatherLastName;
      if (modifiers?.motherFirstName) apiParams.motherFirstName = modifiers.motherFirstName;
      if (modifiers?.motherLastName) apiParams.motherLastName = modifiers.motherLastName;

      const unquotedMain = stripSurroundingQuotes(effectiveMainQuery);
      if (hadQuotedPhrase) mainQuery = unquotedMain;
      if (!exactMatchQuery) exactMatchQuery = unquotedMain;
      const qTokens = (unquotedMain || "").trim().split(/\s+/).filter(Boolean);
      if (qTokens.length === 2) {
        if (!apiParams.FirstName && !modifiers?.lastName) apiParams.FirstName = qTokens[0];
        if (!apiParams.LastName) apiParams.LastName = qTokens[1];
      }

      const searchParams = {};
      if (apiParams.FirstName) searchParams.FirstName = apiParams.FirstName;
      if (apiParams.LastName) searchParams.LastName = apiParams.LastName;
      if (modifiers?.firstName) searchParams.FirstName = modifiers.firstName;
      if (modifiers?.lastName) searchParams.LastName = modifiers.lastName;
      if (apiParams.skipVariants) searchParams.skipVariants = 1;
      if (apiParams.watchlist) searchParams.watchlist = 1;
      if (apiParams.fatherFirstName) searchParams.fatherFirstName = apiParams.fatherFirstName;
      if (apiParams.fatherLastName) searchParams.fatherLastName = apiParams.fatherLastName;
      if (apiParams.motherFirstName) searchParams.motherFirstName = apiParams.motherFirstName;
      if (apiParams.motherLastName) searchParams.motherLastName = apiParams.motherLastName;
      if (modifiers?.birthLocation) searchParams.BirthLocation = modifiers.birthLocation;
      if (modifiers?.deathLocation) searchParams.DeathLocation = modifiers.deathLocation;

      const cleanedForName = hasDateModifiers
        ? stripDateQualifiersFromText(unquotedMain) || unquotedMain
        : unquotedMain;
      console.debug("wbe: effective name for API", { cleanedForName, hasDateModifiers });
      const cleanedTokens = (cleanedForName || "").trim().split(/\s+/).filter(Boolean);
      if (cleanedTokens.length >= 2) {
        if (!searchParams.FirstName && !modifiers?.lastName) searchParams.FirstName = cleanedTokens[0];
        if (!searchParams.LastName) searchParams.LastName = cleanedTokens[cleanedTokens.length - 1];
      }
      if (!searchParams.FirstName && !searchParams.LastName && unquotedMain) {
        const tokens = String(unquotedMain || "")
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        if (tokens.length === 1) {
          searchParams.LastName = tokens[0];
        } else if (tokens.length >= 2) {
          searchParams.FirstName = tokens[0];
          searchParams.LastName = tokens[tokens.length - 1];
        }
      }

      try {
        console.debug("wbe: computed modifiers & apiParams", { modifiers, apiParams });
      } catch (error) {
        /* ignore logging errors */
      }

      if (modifiers?.noVariants) {
        console.debug("wbe: forcing skipVariants due to noVariants", { mainQuery });
        searchParams.skipVariants = 1;
        if (!searchParams.FirstName && !searchParams.LastName && unquotedMain) {
          const tokens = String(unquotedMain || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);
          if (tokens.length === 1) searchParams.LastName = tokens[0];
          else if (tokens.length >= 2) {
            searchParams.FirstName = tokens[0];
            searchParams.LastName = tokens[tokens.length - 1];
          }
        }
      }

      console.debug("wbe: searchPerson call", { mainQuery, searchParams });
      const needPaging =
        modifiers?.bornBefore ||
        modifiers?.bornAfter ||
        modifiers?.diedBefore ||
        modifiers?.diedAfter ||
        modifiers?.bornRange ||
        modifiers?.diedRange ||
        Boolean(spouseQuery);

      let profileIds = [];
      if (needPaging) {
        const [status, matches] = await fetchSearchPersonPaged("Chat", searchParams, "Id,Name", {
          limit: 100,
          max: 2000,
        });
        const ids = (Array.isArray(matches) ? matches : [])
          .map((m) => (m?.Id ? m.Id : m?.Name ? m.Name : null))
          .filter(Boolean);
        profileIds = ids.slice(0, 10000);
        console.debug("wbe: paged searchPerson result", {
          status,
          profileIdsSample: profileIds.slice(0, 50),
          totalMatches: profileIds.length,
        });
      } else {
        const [spStatus, spMatches] = await WikiTreeAPI.searchPerson("Chat", searchParams, "Id,Name", { limit: 100 });
        profileIds = (Array.isArray(spMatches) ? spMatches : [])
          .map((m) => {
            if (!m) return null;
            if (typeof m === "number") return m;
            if (m.Id) return m.Id;
            if (m.Name) return m.Name;
            return null;
          })
          .filter(Boolean)
          .slice(0, 10000);
        console.debug("wbe: searchPerson result", {
          spStatus,
          profileIdsSample: profileIds.slice(0, 50),
          totalMatches: profileIds.length,
        });
      }

      if (!profileIds.length) {
        return `I couldn't find profile matches for "${query}".`;
      }

      const [, , people] = await fetchPeoplePaged(
        WBE_CHAT_APP_ID,
        profileIds,
        "Id,Name,FirstName,MiddleName,RealName,Derived.ShortName,BirthDate,DeathDate,BirthLocation,DeathLocation,LastNameAtBirth,LastNameCurrent,Gender",
        {}
      );
      const peopleCount = Object.keys(people || {}).length;
      console.debug("wbe: fetchPeoplePaged result", {
        profileIdsCount: (profileIds || []).length,
        peopleCount,
        sample: Object.values(people || {})
          .slice(0, 10)
          .map((p) => ({ Id: p?.Id, Name: p?.Name, RealName: p?.RealName })),
      });

      let matchedPeople = Object.values(people || {});

      if (modifiers) {
        matchedPeople = matchedPeople.filter((p) => {
          try {
            const birth = normalizeKnownDate(p.BirthDate) || "";
            const death = normalizeKnownDate(p.DeathDate) || "";

            if (modifiers.bornRange) {
              if (!birth) return false;
              if (birth < modifiers.bornRange.start || birth > modifiers.bornRange.end) return false;
            }
            if (modifiers.diedRange) {
              if (!death) return false;
              if (death < modifiers.diedRange.start || death > modifiers.diedRange.end) return false;
            }
            if (modifiers.bornBefore && birth && birth >= modifiers.bornBefore) return false;
            if (modifiers.bornAfter && birth && birth <= modifiers.bornAfter) return false;
            if (modifiers.diedBefore && death && death >= modifiers.diedBefore) return false;
            if (modifiers.diedAfter && death && death <= modifiers.diedAfter) return false;

            if (modifiers.noVariants && (exactMatchQuery || mainQuery)) {
              const q = normalizeText(String(exactMatchQuery || mainQuery || "").trim());
              const candidates = new Set();
              if (p.RealName) candidates.add(normalizeText(String(p.RealName)));
              if (p.Derived && p.Derived.ShortName) candidates.add(normalizeText(String(p.Derived.ShortName)));
              if (p.FirstName) {
                const ln = p.LastNameCurrent || p.LastNameAtBirth || "";
                if (ln) candidates.add(normalizeText(`${p.FirstName} ${ln}`));
              }
              if (p.Name) {
                const nameFromWtid = String(p.Name)
                  .replace(/-/g, " ")
                  .replace(/\s+\d+$/g, "");
                if (nameFromWtid) candidates.add(normalizeText(nameFromWtid));
              }
              if (p.LastNameCurrent) candidates.add(normalizeText(String(p.LastNameCurrent)));
              if (p.LastNameAtBirth) candidates.add(normalizeText(String(p.LastNameAtBirth)));

              if (![...candidates].some((c) => c === q)) return false;
            }

            return true;
          } catch (error) {
            return true;
          }
        });
      }
      const mappedRows = matchedPeople.map((person) =>
        mapApiPersonToStandardRow(person, {
          surnamePreference: "birthFirst",
        })
      );
      console.debug("wbe: mappedRows sample", {
        mappedCount: mappedRows.length,
        sample: mappedRows
          .slice(0, 10)
          .map((r) => ({ displayName: r.displayName, wtid: r.wtid, birth: r.birth, death: r.death })),
      });

      let finalRows = mappedRows;
      if (spouseQuery) {
        showChatShaky(`Checking spouses for \"${spouseQuery}\"...`);
        const normSpouse = normalizeText(spouseQuery);
        const spouseTokens = (normSpouse || "").split(/\s+/).filter(Boolean);
        const spouseHadQuoted = quoteRegex.test(String(spouseQuery || ""));
        console.debug("wbe: tryHandleProfileSearchPrompt spouse filter", {
          mainQuery,
          spouseQuery,
          normSpouse,
          spouseTokens,
          profileIdsSample: profileIds.slice(0, 50),
          matchedPeopleCount: matchedPeople.length,
        });

        const matches = [];
        const keys = matchedPeople.map((p) => p?.Name || p?.Id).filter(Boolean);
        const CHUNK = 30;
        for (let k = 0; k < keys.length; k += CHUNK) {
          const chunkKeys = keys.slice(k, k + CHUNK);
          try {
            const [, resultByKey, peopleData] = await WikiTreeAPI.getPeople(
              WBE_CHAT_APP_ID,
              chunkKeys,
              "Spouses,Name,RealName,Id,FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,LastNameOther",
              { getSpouses: 1, resolveRedirect: 1 }
            );

            for (let ci = 0; ci < chunkKeys.length; ci++) {
              const key = chunkKeys[ci];
              const origIdx = matchedPeople.findIndex((p) => (p?.Name || p?.Id) === key);
              if (origIdx === -1) continue;
              const apiPerson = WikiTreeAPI.lookupProfile(key, resultByKey, peopleData);
              const spousesObj = apiPerson?.Spouses || {};
              const spouses = Object.values(spousesObj || []);

              let found = null;
              for (const s of spouses) {
                const firstNameParts = [s?.RealName, s?.FirstName, s?.MiddleName, s?.Name]
                  .filter(Boolean)
                  .map((v) => normalizeText(String(v)));
                const lastNameParts = [s?.LastNameAtBirth, s?.LastNameCurrent, s?.LastNameOther, s?.Name]
                  .filter(Boolean)
                  .map((v) => normalizeText(String(v)));

                let isMatch = false;
                if (spouseTokens.length >= 2) {
                  const lastQuery = spouseTokens[spouseTokens.length - 1];
                  const firstQuery = spouseTokens.slice(0, spouseTokens.length - 1).join(" ");
                  const firstNorm = normalizeText(firstQuery);
                  const lastNorm = normalizeText(lastQuery);

                  const firstMatch = firstNameParts.some((n) => n.includes(firstNorm));
                  const lastMatch = lastNameParts.some((n) => n.includes(lastNorm));
                  if (firstMatch && lastMatch) isMatch = true;
                }

                const candidates = [];
                if (s?.RealName) candidates.push(String(s.RealName));
                if (s?.Name) candidates.push(String(s.Name).replace(/[-_]/g, " "));
                if (s?.FirstName || s?.LastNameCurrent)
                  candidates.push([s.FirstName || "", s.LastNameCurrent || ""].join(" ").trim());
                if (s?.MiddleName) candidates.push(String(s.MiddleName));
                if (s?.LastNameCurrent) candidates.push(String(s.LastNameCurrent));
                if (s?.LastNameAtBirth) candidates.push(String(s.LastNameAtBirth));
                if (s?.LastNameOther) candidates.push(String(s.LastNameOther));

                const candNormalized = candidates.filter(Boolean).map((c) => normalizeText(c));

                if (!isMatch) {
                  if (spouseHadQuoted) {
                    if (candNormalized.includes(normSpouse)) isMatch = true;
                    if (!isMatch) {
                      for (const tok of candNormalized) {
                        const tokParts = tok.split(/\s+/).filter(Boolean);
                        if (tokParts.includes(normSpouse)) {
                          isMatch = true;
                          break;
                        }
                      }
                    }
                  } else {
                    if (candNormalized.some((c) => c.includes(normSpouse))) isMatch = true;
                    if (
                      !isMatch &&
                      spouseTokens.length &&
                      spouseTokens.every((t) => candNormalized.some((c) => c.includes(t)))
                    )
                      isMatch = true;
                  }
                }

                if (isMatch) {
                  found = s;
                  break;
                }
              }

              if (found) {
                const spouseEntry = {
                  wtid: found?.Name || "",
                  firstName: found?.FirstName || found?.RealName || "",
                  lnab: found?.LastNameAtBirth || found?.LastNameCurrent || found?.LastNameOther || "",
                  display: found?.RealName || found?.Name || "",
                };
                matches.push({ row: mappedRows[origIdx], spouseName: found.RealName || found.Name || "", spouseEntry });
              }
            }
          } catch (error) {
            console.debug("wbe: getPeople chunk failed", error);
          }
        }
        hideChatShaky();

        if (!matches.length) {
          return `I found no profile matches for "${mainQuery}" with a spouse matching "${spouseQuery}".`;
        }

        finalRows = matches.map((m) => {
          const base = { ...m.row, matchedSpouse: m.spouseName, spouse: m.spouseName || m.row?.spouse || "" };
          if (m.spouseEntry) {
            base.spouseList = [m.spouseEntry];
          }
          return base;
        });
      }

      const previewLimit = 10;
      const previewRows = finalRows.slice(0, previewLimit);
      const remainingRows = finalRows.slice(previewLimit);

      const formatLocation = (row) => {
        const parts = [];
        if (row.birthLocation) parts.push(row.birthLocation);
        if (row.deathLocation) parts.push(`died: ${row.deathLocation}`);
        return parts.length ? ` - ${parts.join(" | ")}` : "";
      };

      const previewLines = previewRows.map((person) => {
        const birth = person.birth || "?";
        const death = person.death || "?";
        const spouseSuffix = person.matchedSpouse ? ` — spouse: ${person.matchedSpouse}` : "";
        return `- ${person.displayName} (${person.wtid}) [${birth} - ${death}]${formatLocation(person)}${spouseSuffix}`;
      });

      const inlineMore = remainingRows.length
        ? {
            count: remainingRows.length,
            text: remainingRows
              .map((person) => {
                const birth = person.birth || "?";
                const death = person.death || "?";
                const spouseSuffix = person.matchedSpouse ? ` — spouse: ${person.matchedSpouse}` : "";
                return `- ${person.displayName} (${person.wtid}) [${birth} - ${death}]${formatLocation(
                  person
                )}${spouseSuffix}`;
              })
              .join("\n"),
          }
        : null;

      const beforeCount = (finalRows || []).length;
      finalRows = (finalRows || []).filter((r) => {
        try {
          return Boolean(r && (r.wtid || r.displayName || r.firstName || r.lastNameCurrent));
        } catch (error) {
          return false;
        }
      });
      const removed = beforeCount - finalRows.length;
      if (removed) console.debug("wbe: removed empty rows before rendering table", { beforeCount, removed });

      const table = makeStandardProfileTable(`Profile search: ${query}`, finalRows, [[0, "asc"]]);
      table.columns = (table.columns || []).filter((c) => !["degrees", "spouse", "spouseList"].includes(c.key));
      if (!spouseQuery) {
        table.columns = (table.columns || []).filter((c) => c.key !== "spouse");
      }

      return {
        message: `Here are profile matches for "${query}":\n${previewLines.join("\n")}`,
        inlineMore,
        table,
      };
    } catch (error) {
      return `I couldn't complete that search for \"${query}\". Error: ${error?.message || "unknown error"}`;
    }
  };
}
