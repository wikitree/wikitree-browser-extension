/*
Created by: Elaine Martzen (Weatherall-96)
*/

import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("reorderNames").then((result) => {
  if (!result) return;

  ("use strict");

  const langChecks = {
    he: /[\u0590-\u05FF]/,
    ru: /[\u0400-\u04FF]/,
    gr: /[\u0370-\u03FF\u1F00-\u1FFF]/,
    ko: /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/,
    zh: /[\u4E00-\u9FFF]/,
    ja: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/,
    en: /[A-Za-z]/,
  };

  const containsLang = (text, lang) => langChecks[lang].test(text || "");
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const unique = (arr) => [...new Set(arr.filter(Boolean))];
  const isMixed = (s) => containsLang(s, "en") && Object.keys(langChecks).some((l) => l !== "en" && containsLang(s, l));

  const whenReady = (sel, t = 7000) =>
    new Promise((resolve, reject) => {
      const found = document.querySelector(sel);
      if (found) return resolve(found);
      const obs = new MutationObserver(() => {
        const el = document.querySelector(sel);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        reject("timeout");
      }, t);
    });

  // Helper functions for script detection
  const hasNonLatin = (text) => {
    if (!text) return false;
    return Object.keys(langChecks).some((lang) => lang !== "en" && containsLang(text, lang));
  };

  // Helper function to detect specific Japanese scripts
  const isKanji = (text) => /[\u4E00-\u9FFF]/.test(text);
  const isHiragana = (text) => /[\u3040-\u309F]/.test(text);
  const isKatakana = (text) => /[\u30A0-\u30FF]/.test(text);
  const isKana = (text) => isHiragana(text) || isKatakana(text);

  // Helper function to get specific Japanese script types
  const getJapaneseScriptType = (text) => {
    if (isKana(text) && !isKanji(text)) return "kana";
    if (isKanji(text) && !isKana(text)) return "kanji";
    if (isKanji(text) && isKana(text)) return "mixed";
    return "unknown";
  };

  const isHebrew = (text) => containsLang(text, "he");
  const isGreek = (text) => containsLang(text, "gr");
  const isCyrillic = (text) => containsLang(text, "ru");
  const isChinese = (text) => containsLang(text, "zh");
  const isKorean = (text) => containsLang(text, "ko");
  const isJapanese = (text) => containsLang(text, "ja");

  const getScriptsInText = (text, isJapaneseContext = false) => {
    const scripts = [];
    if (containsLang(text, "he")) scripts.push("hebrew");
    if (containsLang(text, "gr")) scripts.push("greek");
    if (containsLang(text, "ru")) scripts.push("cyrillic");

    // Handle CJK disambiguation
    if (containsLang(text, "zh")) {
      if (isJapaneseContext) {
        // If we know this is Japanese context, treat kanji as Japanese
        scripts.push("japanese");
      } else {
        // Otherwise, treat as Chinese
        scripts.push("chinese");
      }
    }

    if (containsLang(text, "ko")) scripts.push("korean");
    if (containsLang(text, "ja")) scripts.push("japanese");
    if (containsLang(text, "en")) scripts.push("latin");
    return scripts;
  };

  const getPrecedingText = (element) => {
    let precedingText = "";
    let current = element.previousSibling;
    let charCount = 0;

    while (current && charCount < 200) {
      if (current.nodeType === Node.TEXT_NODE) {
        const text = current.textContent;
        precedingText = text + precedingText;
        charCount += text.length;
      } else if (current.nodeType === Node.ELEMENT_NODE) {
        const text = current.textContent;
        precedingText = text + precedingText;
        charCount += text.length;
      }
      current = current.previousSibling;
    }

    return precedingText.toLowerCase().replace(/\s+/g, " ").trim();
  };

  whenReady('p.VITALS[data-cy="vitals-name"]').then((vitals) => {
    const genealogyLinks = Array.from(vitals.querySelectorAll("a[href*='/genealogy/']"));
    const allStrongs = Array.from(vitals.querySelectorAll("strong"));
    const givenSpans = Array.from(vitals.querySelectorAll('[itemprop="givenName"]')).map((s) => clean(s.textContent));
    const lnab = clean(vitals.querySelector('meta[itemprop="familyName"]')?.getAttribute("content") || "");

    // Extract honorific prefix if present
    const honorificPrefix = clean(vitals.querySelector('[itemprop="honorificPrefix"]')?.textContent || "");

    // Check if this is a Japanese person by looking at birth location
    const isJapaneseContext = (() => {
      const birthLocation = document.querySelector('[itemprop="name"][data-cy="birth-location"]');
      if (birthLocation) {
        const locationText = clean(birthLocation.textContent);
        // Check for Japan in various forms
        return /japan|日本|にっぽん|にほん/i.test(locationText);
      }
      return false;
    })();

    // Classify strong elements
    const firstNameStrongs = [];
    const lastNameStrongs = [];
    const quotedNicknameFields = [];
    const parentheticalNames = []; // For names in parentheses like "(Menachem Mendel)"

    const getPrecedingText = (element) => {
      let precedingText = "";
      let current = element.previousSibling;
      let charCount = 0;

      while (current && charCount < 200) {
        if (current.nodeType === Node.TEXT_NODE) {
          const text = current.textContent;
          precedingText = text + precedingText;
          charCount += text.length;
        } else if (current.nodeType === Node.ELEMENT_NODE) {
          const text = current.textContent;
          precedingText = text + precedingText;
          charCount += text.length;
        }
        current = current.previousSibling;
      }

      return precedingText.toLowerCase().replace(/\s+/g, " ").trim();
    };

    allStrongs.forEach((strongEl) => {
      const text = clean(strongEl.textContent);
      if (!text) return;

      const precedingText = getPrecedingText(strongEl);

      // Check for genealogy links - but handle aka ones specially
      if (strongEl.querySelector("a[href*='/genealogy/']")) {
        // If this genealogy link is in aka context, extract and preserve the link
        if (precedingText.includes("aka")) {
          // Handle multiple links within the same strong element
          const links = strongEl.querySelectorAll("a[href*='/genealogy/']");
          links.forEach((linkEl) => {
            const linkText = clean(linkEl.textContent);
            if (linkText) {
              // Only add the link HTML, not duplicate plain text
              lastNameStrongs.push(linkEl.outerHTML);
            }
          });
        }
        return; // Skip further processing of genealogy links
      }

      // Check if this is a quoted nickname (from DB nickname field)
      if (/^["'].*["']$/.test(text)) {
        quotedNicknameFields.push(text);
        return;
      }

      // Check if this is a parenthetical name like "(Menachem Mendel)"
      if (/^\([^)]+\)$/.test(text)) {
        parentheticalNames.push(text);
        return;
      }

      // Classify based on preceding markers
      if (precedingText.includes("formerly") || precedingText.includes("aka")) {
        lastNameStrongs.push(text);
      } else {
        // Default to first name unless it's clearly a surname context
        firstNameStrongs.push(text);
      }
    });

    // Extract text from various name fields for validation
    const primaryFirstNameFields = [
      clean(vitals.querySelector('[itemprop="givenName"]')?.textContent || ""),
      clean(vitals.querySelector('[itemprop="additionalName"]')?.textContent || ""),
      ...firstNameStrongs.filter((text) => !getPrecedingText({ textContent: text }).includes("aka")),
    ];

    const primaryLastNameFields = [
      lnab,
      ...genealogyLinks
        .filter((a) => {
          const strongParent = a.closest("strong");
          if (strongParent) {
            const precedingText = getPrecedingText(strongParent);
            return !precedingText.includes("aka");
          }
          return true;
        })
        .map((a) => clean(a.textContent)),
    ];

    const allFirstNameFields = [
      ...primaryFirstNameFields,
      ...quotedNicknameFields,
      ...firstNameStrongs,
      ...parentheticalNames,
    ];

    const allLastNameFields = [...primaryLastNameFields, ...lastNameStrongs];

    // Also extract potential last names from quoted nicknames
    // (e.g., "Έστερ Αμπαρμπανέλ Λεβί" -> "Λεβί" as Greek last name)
    quotedNicknameFields.forEach((nickname) => {
      const cleanNickname = nickname.replace(/["']/g, "").trim();
      // If it contains multiple words, the last word might be a surname
      const words = cleanNickname.split(/\s+/);
      if (words.length > 1) {
        const lastWord = words[words.length - 1];
        // If the last word is non-Latin, add it as a potential surname
        if (hasNonLatin(lastWord)) {
          allLastNameFields.push(lastWord);
        }
      }
    });

    console.log("Debug Ester - primaryFirstNameFields:", primaryFirstNameFields);
    console.log("Debug Ester - primaryLastNameFields:", primaryLastNameFields);
    console.log("Debug Ester - allFirstNameFields:", allFirstNameFields);
    console.log("Debug Ester - allLastNameFields:", allLastNameFields);

    // Get all scripts present in ALL name fields (including aka)
    const allFirstNameScripts = new Set();
    allFirstNameFields.forEach((field) => {
      if (field) {
        getScriptsInText(field, isJapaneseContext).forEach((script) => allFirstNameScripts.add(script));
      }
    });

    const allLastNameScripts = new Set();
    allLastNameFields.forEach((field) => {
      if (field) {
        getScriptsInText(field, isJapaneseContext).forEach((script) => allLastNameScripts.add(script));
      }
    });

    // Also get scripts from primary name fields for validation
    const primaryFirstNameScripts = new Set();
    primaryFirstNameFields.forEach((field) => {
      if (field) {
        getScriptsInText(field, isJapaneseContext).forEach((script) => primaryFirstNameScripts.add(script));
      }
    });

    const primaryLastNameScripts = new Set();
    primaryLastNameFields.forEach((field) => {
      if (field) {
        getScriptsInText(field, isJapaneseContext).forEach((script) => primaryLastNameScripts.add(script));
      }
    });

    // Check if there are any matching non-Latin scripts between first and last names
    const matchingScripts = [...allFirstNameScripts].filter(
      (script) => script !== "latin" && allLastNameScripts.has(script)
    );

    console.log("Debug Ester - allFirstNameScripts:", [...allFirstNameScripts]);
    console.log("Debug Ester - allLastNameScripts:", [...allLastNameScripts]);
    console.log("Debug Ester - matchingScripts:", matchingScripts);
    console.log("Debug Ester - primaryFirstNameScripts:", [...primaryFirstNameScripts]);
    console.log("Debug Ester - primaryLastNameScripts:", [...primaryLastNameScripts]);

    // However, don't run if the ONLY non-Latin script is in aka context for surnames
    // (like the Hayim case where Hebrew is only in "aka ביאליק")
    if (matchingScripts.length === 0) {
      console.log("Debug Ester - No matching scripts, returning");
      return; // Don't run the feature
    }

    // Additional check: if primary names are purely Latin and the only non-Latin
    // is in aka context, don't run (handles Hayim case)
    const primaryHasNonLatin =
      [...primaryFirstNameScripts].some((script) => script !== "latin") ||
      [...primaryLastNameScripts].some((script) => script !== "latin");

    // Also check quoted nicknames for non-Latin scripts
    const quotedNicknameScripts = new Set();
    quotedNicknameFields.forEach((field) => {
      if (field) {
        getScriptsInText(field, isJapaneseContext).forEach((script) => quotedNicknameScripts.add(script));
      }
    });

    const quotedNicknameHasNonLatin = [...quotedNicknameScripts].some((script) => script !== "latin");

    console.log("Debug Ester - primaryHasNonLatin:", primaryHasNonLatin);
    console.log("Debug Ester - quotedNicknameHasNonLatin:", quotedNicknameHasNonLatin);

    if (!primaryHasNonLatin && !quotedNicknameHasNonLatin) {
      // Check if non-Latin scripts are only in aka context
      const akaOnlyScripts = matchingScripts.every((script) => {
        // Check if this script appears in primary names or quoted nicknames
        const inPrimaryFirst = [...primaryFirstNameScripts].includes(script);
        const inPrimaryLast = [...primaryLastNameScripts].includes(script);
        const inQuotedNicknames = [...quotedNicknameScripts].includes(script);
        return !inPrimaryFirst && !inPrimaryLast && !inQuotedNicknames;
      });

      console.log("Debug Ester - akaOnlyScripts:", akaOnlyScripts);

      if (akaOnlyScripts) {
        console.log("Debug Ester - Scripts only in aka context, returning");
        return; // Don't run - like Hayim case
      }
    }

    console.log("Debug Ester - Validation passed, proceeding with feature");

    // Build lines for each script (English + each matching non-Latin script)
    const lines = [];

    // Track which nickname parts are used in script lines to avoid duplication
    const usedFromQuotedNicknames = new Set();

    // English line first - preserve original structure with "formerly" and "aka"
    // Filter quoted nicknames to remove non-Latin parts that are used in script lines
    const quotedLatinNick = quotedNicknameFields.filter((t) => /^["'][A-Za-z].*["']$/.test(t));

    // Remove non-Latin parts from quoted nicknames for the English line
    const filteredQuotedNick = quotedLatinNick
      .map((nickname) => {
        const cleanNickname = nickname.replace(/["']/g, "").trim();
        if (cleanNickname.includes(",")) {
          // Filter out non-Latin parts that were used in script lines
          const parts = cleanNickname.split(",").map((p) => p.trim());
          const latinParts = parts.filter(
            (part) => /^[A-Za-z]/.test(part) && !hasNonLatin(part) && !usedFromQuotedNicknames.has(part)
          );
          return latinParts.length > 0 ? `"${latinParts.join(", ")}"` : "";
        }
        // For single names, only include if Latin and not used elsewhere
        return /^[A-Za-z]/.test(cleanNickname) &&
          !hasNonLatin(cleanNickname) &&
          !usedFromQuotedNicknames.has(cleanNickname)
          ? nickname
          : "";
      })
      .filter(Boolean);

    const given = unique([...givenSpans, ...filteredQuotedNick].filter((t) => /^[A-Za-z"']/.test(t))).join(" ");

    // Build English given names - prefer parenthetical Latin alternatives if primary is non-Latin
    const givenName = clean(vitals.querySelector('[itemprop="givenName"]')?.textContent || "");
    const middleName = clean(vitals.querySelector('[itemprop="additionalName"]')?.textContent || "");

    let engGiven = given;

    // If no Latin given name found and we have parenthetical alternatives, use those
    if (!engGiven && parentheticalNames.length > 0) {
      const latinParentheticals = parentheticalNames
        .map((p) => p.replace(/[()]/g, "").trim())
        .filter((p) => /^[A-Za-z]/.test(p) && !hasNonLatin(p));
      if (latinParentheticals.length > 0) {
        engGiven = latinParentheticals.join(" ");
      }
    }

    // Fallback to original given names only if they're Latin
    if (!engGiven) {
      const givenNames = [givenName, middleName].filter(Boolean).join(" ");
      if (givenNames && /^[A-Za-z]/.test(givenNames) && !hasNonLatin(givenNames)) {
        engGiven = givenNames;
      }
    }

    // For Japanese context, add romaji variants from quoted nicknames in brackets
    if (isJapaneseContext && engGiven) {
      const romajiVariants = [];
      quotedNicknameFields.forEach((nickname) => {
        const cleanNickname = nickname.replace(/["']/g, "").trim();
        if (cleanNickname.includes(",")) {
          const parts = cleanNickname.split(",").map((p) => p.trim());
          parts.forEach((part) => {
            // Look for romaji variants (contains Latin + diacritics, different from main engGiven)
            if (/[A-Za-z]/.test(part) && !hasNonLatin(part) && part !== engGiven && !romajiVariants.includes(part)) {
              romajiVariants.push(part);
            }
          });
        }
      });

      if (romajiVariants.length > 0) {
        engGiven += ` [${romajiVariants.join(", ")}]`;
      }
    }

    // Find current surname (CLN) - could be Latin or non-Latin
    const currentSurname = genealogyLinks.find((a) => {
      const linkText = clean(a.textContent);
      // Look for genealogy links that are not the LNAB and not in aka context
      const strongParent = a.closest("strong");
      if (strongParent) {
        const precedingText = getPrecedingText(strongParent);
        return !precedingText.includes("formerly") && !precedingText.includes("aka") && linkText !== lnab;
      }
      return linkText !== lnab;
    });

    // Find formerly surname (LNAB)
    const formerlySurname = genealogyLinks.find((a) => clean(a.textContent) === lnab);

    // Find aka surnames (Latin parts only for English line)
    const akaSurnames = [];

    // Check lastNameStrongs for aka surnames
    lastNameStrongs.forEach((surname) => {
      // Check if this is already an HTML link (from genealogy processing)
      if (surname.includes("<a href=")) {
        // Extract text to check if it's Latin
        const textMatch = surname.match(/>([^<]+)</);
        if (textMatch) {
          const linkText = textMatch[1];
          if (/^[A-Za-z]/.test(linkText) && !hasNonLatin(linkText)) {
            akaSurnames.push(surname);
          }
        }
        return;
      }

      // Handle plain text surnames (Latin only)
      if (surname.includes(",")) {
        // Split comma-separated and take Latin parts
        const parts = surname.split(",").map((p) => p.trim());
        parts.forEach((part) => {
          if (/^[A-Za-z]/.test(part) && !hasNonLatin(part)) {
            akaSurnames.push(part);
          }
        });
      } else if (/^[A-Za-z]/.test(surname) && !hasNonLatin(surname)) {
        akaSurnames.push(surname);
      }
    });

    // Build English line
    let engLine = honorificPrefix ? `${honorificPrefix} ${engGiven}` : engGiven;
    let currentSurnameShownInEnglish = false;

    // Only include current surname if it's Latin or if no non-Latin scripts match
    if (currentSurname) {
      const currentSurnameText = clean(currentSurname.textContent);
      const isCurrentSurnameNonLatin = hasNonLatin(currentSurnameText);
      const currentSurnameScripts = getScriptsInText(currentSurnameText, isJapaneseContext);
      const currentSurnameInMatchingScript = matchingScripts.some((script) => currentSurnameScripts.includes(script));

      // Include current surname in English line only if it's Latin or won't appear in script lines
      if (!isCurrentSurnameNonLatin || !currentSurnameInMatchingScript) {
        engLine += ` ${currentSurname.outerHTML}`;
        currentSurnameShownInEnglish = true;
      }
    }

    // Only show "formerly" if there's a current surname shown in the English line
    if (formerlySurname && formerlySurname !== currentSurname && currentSurnameShownInEnglish) {
      engLine += ` formerly ${formerlySurname.outerHTML}`;
    } else if (formerlySurname && formerlySurname !== currentSurname && !currentSurnameShownInEnglish) {
      // If no current surname in English line, just show the formerly surname without "formerly"
      engLine += ` ${formerlySurname.outerHTML}`;
    }

    if (akaSurnames.length > 0) {
      engLine += ` aka ${akaSurnames.join(", ")}`;
    }

    lines.push(engLine.trim());

    // Create lines for each matching non-Latin script
    matchingScripts.forEach((script) => {
      // Special handling for Japanese - create separate lines for kanji and kana
      if (script === "japanese" && isJapaneseContext) {
        // Collect all Japanese names by type
        const kanjiNames = { first: [], last: [] };
        const kanaNames = { first: [], last: [] };
        const romajiVariants = [];

        // Add primary given name if it's kanji
        const primaryGivenName = clean(vitals.querySelector('[itemprop="givenName"]')?.textContent || "");
        if (primaryGivenName && getScriptsInText(primaryGivenName, isJapaneseContext).includes("japanese")) {
          const scriptType = getJapaneseScriptType(primaryGivenName);
          if (scriptType === "kanji" || scriptType === "mixed") {
            kanjiNames.first.push(primaryGivenName);
          }
          if (scriptType === "kana") {
            kanaNames.first.push(primaryGivenName);
          }
        }

        // Process quoted nicknames carefully - extract individual names
        quotedNicknameFields.forEach((nickname) => {
          const cleanNickname = nickname.replace(/["']/g, "").trim();
          if (cleanNickname.includes(",")) {
            const parts = cleanNickname.split(",").map((p) => p.trim());
            parts.forEach((part) => {
              // Skip if this is romaji (contains Latin characters)
              if (/[A-Za-z]/.test(part)) {
                romajiVariants.push(part);
                return;
              }

              if (getScriptsInText(part, isJapaneseContext).includes("japanese")) {
                const scriptType = getJapaneseScriptType(part);
                if (scriptType === "kanji") {
                  // Only add if it's not already present and not the primary given name
                  if (part !== primaryGivenName && !kanjiNames.first.includes(part)) {
                    kanjiNames.first.push(part);
                  }
                } else if (scriptType === "kana") {
                  if (!kanaNames.first.includes(part)) {
                    kanaNames.first.push(part);
                  }
                }
              }
            });
          }
        });

        // Add Japanese surnames
        if (formerlySurname) {
          const formerlySurnameText = clean(formerlySurname.textContent);
          if (getScriptsInText(formerlySurnameText, isJapaneseContext).includes("japanese")) {
            const scriptType = getJapaneseScriptType(formerlySurnameText);
            if (scriptType === "kanji" || scriptType === "mixed") {
              kanjiNames.last.push(formerlySurname.outerHTML);
            }
          }
        }

        // Add Japanese aka surnames
        lastNameStrongs.forEach((name) => {
          if (name.includes("<a href=")) {
            const textMatch = name.match(/>([^<]+)</);
            if (textMatch && getScriptsInText(textMatch[1], isJapaneseContext).includes("japanese")) {
              const scriptType = getJapaneseScriptType(textMatch[1]);
              if (scriptType === "kana") {
                kanaNames.last.push(name); // Keep the HTML link
              }
            }
          } else if (getScriptsInText(name, isJapaneseContext).includes("japanese")) {
            const scriptType = getJapaneseScriptType(name);
            if (scriptType === "kana") {
              kanaNames.last.push(name);
            }
          }
        });

        // Create Japanese line: family name first, then given name, then kana reading in brackets
        if (
          kanjiNames.first.length > 0 ||
          kanjiNames.last.length > 0 ||
          kanaNames.first.length > 0 ||
          kanaNames.last.length > 0
        ) {
          let japaneseLine = "";

          // Start with kanji family name
          if (kanjiNames.last.length > 0) {
            japaneseLine += kanjiNames.last.join(" ");
          }

          // Add kanji given name
          if (kanjiNames.first.length > 0) {
            if (japaneseLine) japaneseLine += " ";
            japaneseLine += kanjiNames.first.join(" ");
          }

          // Add kana reading in square brackets
          if (kanaNames.last.length > 0 || kanaNames.first.length > 0) {
            let kanaReading = "";
            if (kanaNames.last.length > 0) {
              kanaReading += kanaNames.last.join(" ");
            }
            if (kanaNames.first.length > 0) {
              if (kanaReading) kanaReading += " ";
              kanaReading += kanaNames.first.join(" ");
            }
            if (kanaReading) {
              japaneseLine += ` [${kanaReading}]`;
            }
          }

          if (honorificPrefix && japaneseLine.trim()) {
            japaneseLine = `${honorificPrefix} ${japaneseLine}`;
          }

          if (japaneseLine.trim()) {
            lines.push(japaneseLine);
          }
        }

        return; // Skip the regular script processing for Japanese
      }

      // Regular script processing for non-Japanese scripts
      const scriptFirstNames = [];
      const scriptLastNames = [];

      // Collect first names for this script
      firstNameStrongs.forEach((name) => {
        if (getScriptsInText(name, isJapaneseContext).includes(script)) {
          // For Hebrew, remove parentheses
          if (script === "hebrew") {
            const cleanName = name.replace(/[()]/g, "").trim();
            scriptFirstNames.push(cleanName);
          } else {
            scriptFirstNames.push(name);
          }
        }
      });

      // Also include primary given name if it matches this script and isn't already included
      const primaryGivenName = clean(vitals.querySelector('[itemprop="givenName"]')?.textContent || "");
      if (
        primaryGivenName &&
        getScriptsInText(primaryGivenName, isJapaneseContext).includes(script) &&
        !scriptFirstNames.includes(primaryGivenName)
      ) {
        scriptFirstNames.push(primaryGivenName);
      }

      // Also include additional name (middle name) if it matches this script and isn't already included
      const additionalName = clean(vitals.querySelector('[itemprop="additionalName"]')?.textContent || "");
      if (
        additionalName &&
        getScriptsInText(additionalName, isJapaneseContext).includes(script) &&
        !scriptFirstNames.includes(additionalName)
      ) {
        scriptFirstNames.push(additionalName);
      }

      // Collect quoted nicknames for this script
      quotedNicknameFields.forEach((nickname) => {
        const cleanNickname = nickname.replace(/["']/g, "").trim();
        if (cleanNickname.includes(",")) {
          const parts = cleanNickname.split(",").map((p) => p.trim());
          parts.forEach((part) => {
            if (getScriptsInText(part, isJapaneseContext).includes(script)) {
              scriptFirstNames.push(part); // No quotes in script lines
              usedFromQuotedNicknames.add(part);
            }
          });
        } else if (getScriptsInText(cleanNickname, isJapaneseContext).includes(script)) {
          scriptFirstNames.push(cleanNickname); // No quotes in script lines
          usedFromQuotedNicknames.add(cleanNickname);
        }
      });

      // Collect parenthetical names for this script
      parentheticalNames.forEach((parenthetical) => {
        const cleanParenthetical = parenthetical.replace(/[()]/g, "").trim();
        if (getScriptsInText(cleanParenthetical, isJapaneseContext).includes(script)) {
          scriptFirstNames.push(cleanParenthetical); // No parentheses in script lines
        }
      });

      // Collect last names for this script
      lastNameStrongs.forEach((name) => {
        // Handle HTML links (preserve them)
        if (name.includes("<a href=")) {
          // Extract text from link to check script
          const textMatch = name.match(/>([^<]+)</);
          if (textMatch && getScriptsInText(textMatch[1], isJapaneseContext).includes(script)) {
            scriptLastNames.push(name);
          }
        } else if (getScriptsInText(name, isJapaneseContext).includes(script)) {
          // For Hebrew, remove parentheses
          if (script === "hebrew") {
            const cleanName = name.replace(/[()]/g, "").trim();
            scriptLastNames.push(cleanName);
          } else {
            scriptLastNames.push(name);
          }
        }
      });

      // Also check current surname if it matches this script
      if (currentSurname) {
        const currentSurnameText = clean(currentSurname.textContent);
        if (getScriptsInText(currentSurnameText, isJapaneseContext).includes(script)) {
          scriptLastNames.push(currentSurname.outerHTML);
        }
      }

      // Also check formerly surname if it matches this script
      if (formerlySurname && formerlySurname !== currentSurname) {
        const formerlySurnameText = clean(formerlySurname.textContent);
        if (getScriptsInText(formerlySurnameText, isJapaneseContext).includes(script)) {
          scriptLastNames.push(formerlySurname.outerHTML);
        }
      }

      // Also check for aka names in this script
      const allStrongs = Array.from(vitals.querySelectorAll("strong"));
      allStrongs.forEach((strongEl) => {
        const text = clean(strongEl.textContent);
        if (!text) return;

        // Skip if already processed or genealogy links
        if (strongEl.querySelector("a[href*='/genealogy/']") || /^["'].*["']$/.test(text)) return;

        const precedingText = getPrecedingText(strongEl);
        if (precedingText.includes("aka") && getScriptsInText(text, isJapaneseContext).includes(script)) {
          if (text.includes(",")) {
            const parts = text.split(",").map((p) => p.trim());
            parts.forEach((part) => {
              if (getScriptsInText(part, isJapaneseContext).includes(script)) {
                if (script === "hebrew") {
                  const cleanPart = part.replace(/[()]/g, "").trim();
                  scriptLastNames.push(cleanPart);
                } else {
                  scriptLastNames.push(part);
                }
              }
            });
          } else {
            if (script === "hebrew") {
              const cleanText = text.replace(/[()]/g, "").trim();
              scriptLastNames.push(cleanText);
            } else {
              scriptLastNames.push(text);
            }
          }
        }
      });

      // Build the line for this script
      if (scriptFirstNames.length > 0 || scriptLastNames.length > 0) {
        const firstNamePart = scriptFirstNames.length > 0 ? scriptFirstNames.join(" ") : "";
        const lastNamePart = scriptLastNames.length > 0 ? scriptLastNames.join(" ") : "";

        let scriptLine;

        // For East Asian languages (Chinese, Korean, Japanese), put family name first
        if (script === "chinese" || script === "korean" || script === "japanese") {
          scriptLine = [lastNamePart, firstNamePart].filter(Boolean).join(" ");
        } else {
          // For other scripts, keep given name first
          scriptLine = [firstNamePart, lastNamePart].filter(Boolean).join(" ");
        }

        // Add honorific prefix if present
        if (honorificPrefix && scriptLine.trim()) {
          scriptLine = `${honorificPrefix} ${scriptLine}`;
        }

        if (scriptLine.trim()) {
          lines.push(scriptLine);
        }
      }
    });

    // Special case: if the PRIMARY given name (itemprop="givenName") is non-Latin
    // and there are Latin alternatives, reorder to put non-Latin first
    const primaryGivenName = clean(vitals.querySelector('[itemprop="givenName"]')?.textContent || "");
    const primaryGivenIsNonLatin = hasNonLatin(primaryGivenName);
    const hasLatinAlternatives = allFirstNameScripts.has("latin") || allLastNameScripts.has("latin");

    if (primaryGivenIsNonLatin && hasLatinAlternatives && lines.length > 1) {
      // Find the non-Latin line (should contain the primary given name)
      const nonLatinLineIndex = lines.findIndex((line) => line.includes(primaryGivenName));
      if (nonLatinLineIndex > 0) {
        // Move the non-Latin line to the front
        const nonLatinLine = lines.splice(nonLatinLineIndex, 1)[0];
        lines.unshift(nonLatinLine);

        // Build a simple Latin fallback line to replace the complex English line
        // Use parenthetical names as Latin alternatives if available
        let latinGivenName = "";

        // Look for Latin names in parenthetical names first
        parentheticalNames.forEach((parenthetical) => {
          const cleanParenthetical = parenthetical.replace(/[()]/g, "").trim();
          if (getScriptsInText(cleanParenthetical).includes("latin") && !hasNonLatin(cleanParenthetical)) {
            latinGivenName = cleanParenthetical;
          }
        });

        // Fallback to engGiven if no parenthetical Latin name found
        if (!latinGivenName) {
          latinGivenName = engGiven
            .replace(/^["']|["']$/g, "")
            .replace(/["']/g, "")
            .trim();
        }

        const latinSurnameLink = genealogyLinks.find((a) => /^[A-Za-z]/.test(clean(a.textContent)));
        let engSurnamePiece = null;
        if (latinSurnameLink) {
          engSurnamePiece = latinSurnameLink.outerHTML;
        } else if (akaSurnames && akaSurnames.length > 0) {
          engSurnamePiece = akaSurnames.join(", ");
        }

        let engFallback = [latinGivenName, engSurnamePiece].filter(Boolean).join(" ").trim();

        // Add honorific prefix to Latin fallback line
        if (honorificPrefix && engFallback) {
          engFallback = `${honorificPrefix} ${engFallback}`;
        }

        if (engFallback) {
          // Replace the first (English) line with the simpler version
          lines[1] = engFallback;
        }
      }
    }

    // Remove duplicate lines before final output
    const uniqueLines = [];
    const seen = new Set();

    lines.forEach((line) => {
      // Normalize the line for comparison (remove extra whitespace)
      const normalizedLine = line.replace(/\s+/g, " ").trim();
      if (!seen.has(normalizedLine)) {
        seen.add(normalizedLine);
        uniqueLines.push(line);
      }
    });

    vitals.innerHTML = uniqueLines.join("<br>\n");
  });
});
