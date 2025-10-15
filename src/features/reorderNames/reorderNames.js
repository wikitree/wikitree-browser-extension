/*
Created By: Elaine Martzen (Weatherall-96)
*/

import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("reorderNames").then((result) => {
  if (!result) return;

  ("use strict");

  // ---------- helpers ----------
  const containsHebrew = (s) => /[\u0590-\u05FF]/.test(s || "");
  const containsRussian = (s) => /[\u0400-\u04FF]/.test(s || "");
  const containsGreek = (s) => /[\u0370-\u03FF\u1F00-\u1FFF]/.test(s || "");
  const containsKorean = (s) => /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(s || "");
  const containsEnglish = (s) => /[A-Za-z]/.test(s || "");
  const containsHanzi = (s) => /[\u4E00-\u9FFF]/.test(s || "");

  const clean = (s) =>
    (s || "")
      .replace(/\s+/g, " ")
      .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, "")
      .trim();

  function isGenealogyLink(a) {
    if (!a) return false;
    const raw = (a.getAttribute("href") || a.href || "").toLowerCase();
    return raw.includes("/genealogy/");
  }

  function findGenealogyLinks(container) {
    return Array.from(container.querySelectorAll("a")).filter(isGenealogyLink);
  }

  function pickLinkByLang(links) {
    const map = { he: null, en: null, ru: null, el: null, ko: null, zh: null };
    for (const a of links) {
      const txt = (a.textContent || "").trim();
      if (!map.he && containsHebrew(txt)) map.he = a;
      if (!map.en && containsEnglish(txt)) map.en = a;
      if (!map.ru && containsRussian(txt)) map.ru = a;
      if (!map.el && containsGreek(txt)) map.el = a;
      if (!map.ko && containsKorean(txt)) map.ko = a;
      if (!map.zh && containsHanzi(txt)) map.zh = a;
    }
    return map;
  }

  function surnameHTML(linkElem, textFallback) {
    if (linkElem) return linkElem.outerHTML;
    if (textFallback) return clean(textFallback);
    return "";
  }

  // Extract each language substring separately from mixed text
  function extractByLanguage(s) {
    const parts = (s || "")
      .split(/[\s,;:/|]+/)
      .map(clean)
      .filter(Boolean);
    const result = { en: [], he: [], ru: [], el: [], ko: [], zh: [] };
    for (const p of parts) {
      if (containsHebrew(p)) result.he.push(p);
      else if (containsRussian(p)) result.ru.push(p);
      else if (containsGreek(p)) result.el.push(p);
      else if (containsKorean(p)) result.ko.push(p);
      else if (containsHanzi(p)) result.zh.push(p);
      else if (containsEnglish(p)) result.en.push(p);
    }
    return result;
  }

  function whenReady(selector, timeout = 7000) {
    return new Promise((resolve, reject) => {
      const now = document.querySelector(selector);
      if (now) return resolve(now);
      const obs = new MutationObserver((_, o) => {
        const el = document.querySelector(selector);
        if (el) {
          o.disconnect();
          resolve(el);
        }
      });
      obs.observe(document.body, { subtree: true, childList: true });
      setTimeout(() => {
        try {
          obs.disconnect();
        } catch (e) {}
        reject("timeout");
      }, timeout);
    });
  }

  // ---------- main ----------
  whenReady('p.VITALS[data-cy="vitals-name"]', 7000)
    .then((vitals) => {
      // Gather first-name candidates
      const givenFromItemprop = vitals.querySelector('[itemprop="givenName"]')?.textContent || "";
      const strongs = Array.from(vitals.querySelectorAll("strong"));
      const firstCandidates = strongs
        .filter((s) => !s.querySelector("a") && !/\bedit\b/i.test(s.textContent))
        .map((s) => clean(s.textContent));
      if (givenFromItemprop && !firstCandidates.includes(clean(givenFromItemprop))) {
        firstCandidates.unshift(clean(givenFromItemprop));
      }

      // Surname links detection
      const geneLinks = findGenealogyLinks(vitals);
      const linkMap = pickLinkByLang(geneLinks);

      // Collect plain surnames (from strongs that contain links)
      const plainSurnames = strongs.filter((s) => s.querySelector("a")).map((s) => clean(s.textContent));

      // Build first-name map by language using extractByLanguage
      const firstMap = { en: "", ru: "", he: "", el: "", ko: "", zh: "" };
      for (const c of firstCandidates) {
        const found = extractByLanguage(c);
        for (const lang of Object.keys(found)) {
          if (!firstMap[lang] && found[lang].length) {
            firstMap[lang] = found[lang].join(" ");
          }
        }
      }

      // Build last-name map
      const lastMap = {
        he: surnameHTML(
          linkMap.he,
          plainSurnames.find((x) => containsHebrew(x))
        ),
        en: surnameHTML(
          linkMap.en,
          plainSurnames.find((x) => containsEnglish(x))
        ),
        ru: surnameHTML(
          linkMap.ru,
          plainSurnames.find((x) => containsRussian(x))
        ),
        el: surnameHTML(
          linkMap.el,
          plainSurnames.find((x) => containsGreek(x))
        ),
        ko: surnameHTML(
          linkMap.ko,
          plainSurnames.find((x) => containsKorean(x))
        ),
        zh: surnameHTML(
          linkMap.zh,
          plainSurnames.find((x) => containsHanzi(x))
        ),
      };

      // Only rewrite if any non-English names exist
      const hasNonEnglish =
        firstMap.he ||
        firstMap.ru ||
        firstMap.el ||
        firstMap.ko ||
        firstMap.zh ||
        lastMap.he ||
        lastMap.ru ||
        lastMap.el ||
        lastMap.ko ||
        lastMap.zh;
      if (!hasNonEnglish) {
        console.log("%cWT: English-only page; leaving original format", "color: gray;");
        return;
      }

      // Build language rows (EN → KO → RU → HE → EL → ZH)
      const order = ["en", "ko", "ru", "he", "el", "zh"];
      const rows = order
        .map((lang) => {
          const f = clean(firstMap[lang] || "");
          const l = (lastMap[lang] || "").toString();
          if (!f && !l) return null;
          return (f ? f + (l ? " " : "") : "") + (l || "");
        })
        .filter(Boolean);

      if (rows.length > 0) {
        vitals.innerHTML = rows.join("<br>\n");
        console.log(
          "%cWT: Rewrote vitals with multilingual rows (Korean + Hanzi supported)",
          "color: green; font-weight: bold;"
        );
      } else {
        console.log("%cWT: No names found to rewrite", "color: orange;");
      }
    })
    .catch(() => console.warn("WT: vitals not found in time"));
})();
