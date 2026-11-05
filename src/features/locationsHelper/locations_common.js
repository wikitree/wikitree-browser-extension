import { familyArray, profilePerson } from "../../core/common";
import { isSpaceEdit, isNewSpace, isImagePage, isAddUnrelatedPerson } from "../../core/pageType";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";

/* ── logging helpers  ───────────────────────────────────────────────── */
const DEBUG_LEVEL = 0; // 0=none, 1=basic, 2=verbose
export var dbg1 = function () {};
export var dbg2 = function () {};
export var logIfChanged = function () {};
switch (DEBUG_LEVEL) {
  case 2:
    dbg2 = function (...args) {
      console.log(...args);
    };
    logIfChanged = function (msg, a, b) {
      if (a !== b) console.log(msg, a, b);
    };
  // fall through...
  case 1:
    dbg1 = function (...args) {
      console.log(...args);
    };
  default:
}
export function elInfo(el) {
  if (!el) return "null";
  return `${el.tagName || ""}#${el.id || ""}.${(el.className || "").toString()}`;
}
/* ─────────────────────────────────────────────────────────────────────── */
export const WBE_LOC_HELPER_APP_ID = "WBE_locations_helper";

export function retrieveFamilyBDLocations() {
  if (isSpaceEdit || isNewSpace || isAddUnrelatedPerson || isImagePage) return;
  const theID = profilePerson.Id;
  dbg2("profilePerson Id check", { theID, isSpaceEdit, isNewSpace, isAddUnrelatedPerson, isImagePage });

  if (theID) {
    WikiTreeAPI.getRelatives(WBE_LOC_HELPER_APP_ID, theID, "*", {
      getParents: 1,
      getSiblings: 1,
      getSpouses: 1,
      getChildren: 1,
    }).then((items) => {
      const thisFamily = familyArray(items[0].person);
      window.normalisedBDLocations = [];
      thisFamily.forEach(function (aPe) {
        if (aPe.BirthLocation) {
          window.normalisedBDLocations.push(normalizeForFamilyMatch(aPe.BirthLocation));
        }
        if (aPe.DeathLocation) {
          window.normalisedBDLocations.push(normalizeForFamilyMatch(aPe.DeathLocation));
        }
      });
      dbg1("normalisedBDLocations built", {
        count: window.normalisedBDLocations.length,
        sample: window.normalisedBDLocations.slice(0, 5),
      });
    });
  } else {
    dbg2("No profilePerson Id; skipping normalisedBDLocations");
  }
}

/**
 * Checks if a location suggestion matches any of the profile's family members' locations.
 *
 * familyLoc1 (level 1): Strong match (similarity > 0.92). Highlighted in pale lime green (#daf7a6).
 * familyLoc2 (level 2): Very high confidence or exact match (similarity > 0.98). Highlighted in light green.
 *
 * @param {string} dText - The location text to check.
 * @returns {object} { familyLoc: boolean, familyLoc2: boolean }
 */
export function checkFamilyMatch(dText) {
  let familyLoc = false;
  let familyLoc2 = false;
  if (window.normalisedBDLocations) {
    const sugNorm = normalizeForFamilyMatch(dText);
    for (const famNorm of window.normalisedBDLocations) {
      const sim = similarity(famNorm, sugNorm);

      // Logging matching attempts for troubleshooting
      if (sim > 0.8 || sugNorm.includes(famNorm) || famNorm.includes(sugNorm)) {
        dbg2(
          `[locHelper] Match check:\n` +
            `Input:  '${dText}'\n` +
            `Norm:   '${sugNorm}'\n` +
            `Family: '${famNorm}'\n` +
            `Sim:    ${sim.toFixed(4)}\n` +
            `SubStr: ${sugNorm.includes(famNorm) || famNorm.includes(sugNorm)}`
        );
      }

      if (famNorm === sugNorm || sim > 0.92) familyLoc = true;
      if (famNorm === sugNorm || sim > 0.98) familyLoc2 = true;

      // High resilience: check for substring matches if strings are sufficiently long
      if (!familyLoc && sugNorm.length > 10 && famNorm.length > 10) {
        if (sugNorm.includes(famNorm) || famNorm.includes(sugNorm)) {
          familyLoc = true;
          // If they are almost the same but one has slightly more/less detail, treat as level 2
          if (Math.abs(sugNorm.length - famNorm.length) < 10) {
            familyLoc2 = true;
          }
        }
      }

      if (familyLoc2) break;
    }
  }
  return { familyLoc, familyLoc2 };
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  let costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0) costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function similarity(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  var longer = s1;
  var shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

// Normalize a location string so family matching is resilient to common variants
const US_STATE_ABBR_MAP = {
  al: "alabama",
  ak: "alaska",
  az: "arizona",
  ar: "arkansas",
  ca: "california",
  co: "colorado",
  ct: "connecticut",
  de: "delaware",
  fl: "florida",
  ga: "georgia",
  hi: "hawaii",
  id: "idaho",
  il: "illinois",
  in: "indiana",
  ia: "iowa",
  ks: "kansas",
  ky: "kentucky",
  la: "louisiana",
  me: "maine",
  md: "maryland",
  ma: "massachusetts",
  mi: "michigan",
  mn: "minnesota",
  ms: "mississippi",
  mo: "missouri",
  mt: "montana",
  ne: "nebraska",
  nv: "nevada",
  nh: "new hampshire",
  nj: "new jersey",
  nm: "new mexico",
  ny: "new york",
  nc: "north carolina",
  nd: "north dakota",
  oh: "ohio",
  ok: "oklahoma",
  or: "oregon",
  pa: "pennsylvania",
  ri: "rhode island",
  sc: "south carolina",
  sd: "south dakota",
  tn: "tennessee",
  tx: "texas",
  ut: "utah",
  vt: "vermont",
  va: "virginia",
  wa: "washington",
  wv: "west virginia",
  wi: "wisconsin",
  wy: "wyoming",
  dc: "district of columbia",
};

export function normalizeForFamilyMatch(str) {
  if (!str) return "";
  // let s = (str.split("(")[0] || str) // drop anything in parentheses like dates
  //   .toLowerCase()
  //   .replace(/\./g, "") // Strip periods early (handles St., USA, etc.)
  //   .normalize("NFD")
  //   .replace(/[\u0300-\u036f]/g, ""); // remove diacritics
  let s = normalise(
    (str.split("(")[0] || str) // drop anything in parentheses like dates
      .replace(/\./g, "") // Strip periods early (handles St., USA, etc.)
  );

  // Normalize common place name abbreviations
  s = s.replace(/\bst\b/g, "saint");
  s = s.replace(/\bmt\b/g, "mount");
  s = s.replace(/\bft\b/g, "fort");
  s = s.replace(/\bpt\b/g, "point");

  // Normalize United States variants
  s = s.replace(/\bunited states of america\b/g, "united states");
  s = s.replace(/\busa\b/g, "united states");
  s = s.replace(/\bus\b/g, "united states");

  // Normalize United Kingdom variants
  s = s.replace(/\bunited kingdom\b/g, "uk");
  s = s.replace(/\bgreat britain\b/g, "uk");
  s = s.replace(/\buk\b/g, "uk");

  // Remove administrative suffix tokens that differ by option or region
  s = s.replace(/\b(county|parish|borough|census area|regional municipality|municipality)\b/g, "");

  // Cleanup punctuation and whitespace around commas
  s = s.replace(/\s*,\s*/g, ", ");
  s = s.replace(/\s{2,}/g, " ").trim();

  // Collapse duplicate commas possibly created by token removal
  s = s.replace(/,\s*,/g, ", ");
  // Trim trailing commas
  s = s.replace(/,\s*$/g, "");

  // Normalize US state abbreviations to full names for better matching
  // Only do this confidently when it's clearly a US location (contains 'united states')
  const parts = s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const hasUS = parts.some((p) => p === "united states");
  if (parts.length) {
    const newParts = parts.map((p, idx) => {
      const token = p.replace(/\./g, "");
      const abbr = token.toLowerCase();
      if (US_STATE_ABBR_MAP[abbr] && (hasUS || idx >= parts.length - 2)) {
        return US_STATE_ABBR_MAP[abbr];
      }
      return p;
    });
    s = newParts.join(", ");
  }
  return s;
}

const replaceMap = {
  // Lowercase
  á: "a",
  à: "a",
  â: "a",
  ä: "a",
  ã: "a",
  å: "a",
  ā: "a",
  ą: "a",
  ç: "c",
  ć: "c",
  č: "c",
  ď: "d",
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  ē: "e",
  ę: "e",
  ě: "e",
  ė: "e",
  í: "i",
  ì: "i",
  î: "i",
  ï: "i",
  ī: "i",
  į: "į",
  ľ: "l",
  ł: "l",
  ñ: "n",
  ń: "n",
  ň: "n",
  ó: "o",
  ò: "o",
  ô: "o",
  ö: "o",
  õ: "o",
  ø: "o",
  ō: "o",
  ŕ: "r",
  ř: "r",
  š: "s",
  ś: "s",
  ť: "t",
  ú: "u",
  ù: "u",
  û: "u",
  ü: "u",
  ů: "u",
  ū: "u",
  ų: "ų",
  ý: "y",
  ÿ: "y",
  ž: "z",
  ź: "z",
  ż: "z",
  ß: "ss",

  // Uppercase
  Á: "A",
  À: "A",
  Â: "A",
  Ä: "A",
  Ã: "A",
  Å: "A",
  Ā: "A",
  Ą: "A",
  Ç: "C",
  Ć: "C",
  Č: "C",
  Ď: "D",
  É: "E",
  È: "E",
  Ê: "E",
  Ë: "E",
  Ē: "E",
  Ę: "E",
  Ě: "E",
  Ė: "E",
  Í: "I",
  Ì: "I",
  Î: "I",
  Ï: "I",
  Ī: "I",
  Į: "I",
  Ľ: "L",
  Ł: "L",
  Ñ: "N",
  Ń: "N",
  Ň: "N",
  Ó: "O",
  Ò: "O",
  Ô: "O",
  Ö: "O",
  Õ: "O",
  Ø: "O",
  Ō: "O",
  Ŕ: "R",
  Ř: "R",
  Š: "S",
  Ś: "S",
  Ť: "T",
  Ú: "U",
  Ù: "U",
  Û: "U",
  Ü: "U",
  Ů: "U",
  Ū: "U",
  Ý: "Y",
  Ÿ: "Y",
  Ž: "Z",
  Ź: "Z",
  Ż: "Z",
};
const diacriticRE = new RegExp(Object.keys(replaceMap).join("|"), "g");

// We cannot use the JS string.normalize() method as it does not handle ł and ø
export function normalise(str) {
  if (!str) return "";
  return str.replace(diacriticRE, (match) => replaceMap[match]).toLowerCase();
}
