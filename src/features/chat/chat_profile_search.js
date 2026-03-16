import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";

export function createProfileSearchHandler({
  WBE_CHAT_APP_ID,
  hasAnyApiKey,
  getChatOptions,
  getChatAiConfig,
  fetchSearchPersonPaged,
  fetchPeoplePaged,
  mapApiPersonToStandardRow,
  makeStandardProfileTable,
  normalizeText,
  normalizeKnownDate,
  showChatShaky,
  hideChatShaky,
}) {
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
        const chatMode = document.getElementById("wbe-chat-mode")?.value || null;
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
            const debugUrl = `https://plus.wikitree.com/function/WTWebProfileSearch/apiWBE_ChatCategory.json?Query=${encodedQ}&MaxProfiles=500&Format=JSON`;
            console.debug("wbe: WT+ deterministic CategoryFull", { chosenCategory, catVal, qb, encodedQ, debugUrl });

            const resp = await wtAPIProfileSearch("ChatCategory", encodedQ, { maxProfiles: 500 });
            const profiles = resp?.response?.profiles || [];
            if (!profiles.length) {
              console.debug("wbe: wtAPIProfileSearch returned no profiles", { qb, resp });
              hideChatShaky();
              return `I couldn't find any profiles for Category:${chosenCategory} via WT+.`;
            }

            const uniqueIds = [...new Set(profiles.map((p) => String(p)))].slice(0, 200);

            showChatShaky(`Fetching ${uniqueIds.length} profiles...`);
            const fields =
              "FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,RealName,BirthDate,BirthLocation,DeathDate,DeathLocation,Gender,Id,Name";
            const [, resultByKey, peopleData] = await WikiTreeAPI.getPeople(WBE_CHAT_APP_ID, uniqueIds, fields, {
              resolveRedirect: 1,
            });

            const people = uniqueIds.map((k) => WikiTreeAPI.lookupProfile(k, resultByKey, peopleData)).filter(Boolean);
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
