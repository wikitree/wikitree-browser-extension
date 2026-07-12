/*
Created By: Ian Beacall (Beacall-6)
Contributors: Jonathan Duke (Duke-5773), Riël Smit (Smit-641)

This version builds the family lists with these features:
• Uses the full getAge/isLeapYear implementation for marriage age calculations.
• If dates are not available (or are “unknown”), no date text is shown.
• Parsed records like “[children?]” or “[spouse?]” are rendered as clickable links—
  using their parsed link if available, or a default edit URL using the profile’s ID.
• Each record (parent, sibling, child) is wrapped in a schema.org container using itemprop attributes,
  with date spans placed in grid cells to the right of the name.
• The spouse header is a span.
• Relative ages for siblings/children are calculated and inserted.
• Marriage ages are calculated and appended.
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isOK, displayName } from "../../core/common";
import { displayDates } from "../verifyID/verifyID";
import { getUserWtId } from "../../core/common";
import "./change_family_lists.css";
import { getAge } from "./change_family_lists_age";
import * as distRel from "../distanceAndRelationship/distanceAndRelationship.js";
const { initRelationshipDB, RELATIONSHIP_STORE_NAME } = distRel;
import { getProfilePersonInfo } from "../../core/common";
import { mainDomain, isProfileAddRelative } from "../../core/pageType";
import { autoClickAddPersonOptions } from "../usability_tweaks/usability_tweaks.js";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";

const WBE_CFL_APP_ID = "WBE_change_family_lists";

let options;
const user = getUserWtId();
let familyData;
// Global variable to track the header toggle state.
let useAltHeadings = false;
// Debug flag - set to true to enable console logging for troubleshooting
const DEBUG_FAMILY_LISTS = false;
const treePersonBit = $("#nav-familyContent #Family-pane div.tree--person");
const profilePerson = getProfilePersonInfo(); // from the page
let profilePersonData; // from API
let pencils;
let nativeParentDNA = { BioFather: false, BioMother: false };

function captureNativeParentDNA() {
  try {
    // In the native DOM, the DNA icon sits in a sibling <a> after the parent span.
    const bf = treePersonBit.find("#BioFather");
    const bm = treePersonBit.find("#BioMother");
    nativeParentDNA.BioFather = bf.length && bf.nextAll("a:has(.icon--dna-checked)").length > 0;
    nativeParentDNA.BioMother = bm.length && bm.nextAll("a:has(.icon--dna-checked)").length > 0;
  } catch (e) {
    if (DEBUG_FAMILY_LISTS) console.warn("captureNativeParentDNA error", e);
  }
}

const getPeopleFields =
  "BirthDate,BirthDateDecade,BirthLocation,BirthName,Connected,DataStatus,DeathDate,DeathDateDecade,DeathLocation," +
  "Derived.BirthNamePrivate,Derived.LongName,Derived.LongNamePrivate,Father,BioFather,FirstName,Gender,Id,IsLiving," +
  "LastNameAtBirth,LastNameCurrent,LastNameOther,Manager,MiddleName,Mother,BioMother,Name,Prefix,RealName,ShortName," +
  "Spouses,Suffix,TrustedList";

/**
 * Creates a new person record object with default values.
 * @returns {Object} A person record object.
 */
function newPersonRecord() {
  return {
    Name: "",
    FullName: "",
    BirthDate: "",
    DeathDate: "",
    UnknownText: "",
    Link: "",
    MarriageDetails: "",
    MarriageMapLink: "",
    RelationshipStatus: null,
    merge: false, // flag for mergeable records
    halfMarker: false, // contains the complete SMALL span containing [half], if present
    biological: false, // whether the person was marked [biological] in the original text
  };
}

/**
 * Creates a new family data object.
 * @returns {Object} A family data object with empty arrays for each relationship.
 */
function newFamilyData() {
  return { parents: [], bioParents: [], siblings: [], spouses: [], children: [] };
}

function getInitialPencils() {
  let pencils = {};
  pencils.parents = treePersonBit.find("#Parents span.EDIT a").attr("href") || "";
  pencils.siblings = treePersonBit.find("#Siblings span.EDIT a").attr("href") || "";
  pencils.spouses = treePersonBit.find(".spouse span.EDIT a").attr("href") || "";
  pencils.hasAddSpouse = treePersonBit.find("#Spouses a:contains('[spouse?]')").length > 0;
  pencils.children = treePersonBit.find("#Children span.EDIT a").attr("href") || "";
  return pencils;
}

/**
 * Parses an element that has an itemprop attribute and returns a person record.
 * @param {HTMLElement} el - The DOM element containing person data.
 * @returns {Object} A person record object.
 */
function parseItempropElement(el) {
  const record = newPersonRecord();
  const linkEl = el.querySelector("a[itemprop='url'], a[href*='/wiki/']");
  record.relationship = el.getAttribute("id");
  if (linkEl) {
    record.Link = linkEl.getAttribute("href") || "";
    record.FullName = linkEl.textContent.trim();
    // Detect and strip trailing [biological]
    if (/\[biological\]/i.test(record.FullName)) {
      record.biological = true;
      record.FullName = record.FullName.replace(/\s*\[biological\]/i, "").trim();
    }
    const match = record.Link.match(/\/wiki\/([^#]+)/);
    if (match) {
      record.Name = match[1]?.replace(/ /g, "_");
    }
  }
  const smallSpan = el.querySelector("span.SMALL");
  if (smallSpan) {
    const dateMatch = smallSpan.textContent.match(/\(([^)]*)\)/);
    if (dateMatch) {
      const [b, d] = dateMatch[1].split(/\s*-\s*/);
      record.BirthDate = b?.trim() || "";
      record.DeathDate = d?.trim() || "";
    }
    const halfMatch = smallSpan.textContent.match(/\[half\]/i);
    if (halfMatch) {
      record.halfMarker = smallSpan;
    }
  }
  const fullText = el.textContent.trim();
  if (!record.FullName) {
    const bracketMatch = fullText.match(/\[([^\]]+)\]/);
    if (bracketMatch) {
      record.UnknownText = bracketMatch[0].trim();
      const inner = bracketMatch[1].trim();
      // If the bracketed inner text is the biological marker, note it and clear UnknownText
      if (/^biological$/i.test(inner)) {
        record.biological = true;
        record.UnknownText = "";
      }
      const dateRange = inner.match(/\(([^)]+)\)/);
      if (dateRange) {
        const [b, d] = dateRange[1].split(/\s*-\s*/);
        record.BirthDate = b?.trim() || "";
        record.DeathDate = d?.trim() || "";
      }
      record.Name = inner.replace(/\s*\([^)]*\)/, "").trim();
      // Also detect [biological] appended inside the inner text (e.g., "John (1900) [biological]")
      if (/\[biological\]/i.test(record.Name)) {
        record.biological = true;
        record.Name = record.Name.replace(/\s*\[biological\]/i, "").trim();
      }
    } else {
      record.Name = fullText;
      if (/\[biological\]/i.test(record.Name)) {
        record.biological = true;
        record.Name = record.Name.replace(/\s*\[biological\]/i, "").trim();
      }
    }
  }
  return record;
}

/**
 * Creates a new person record from a bracketed text.
 * @param {string} bracketText - The bracketed text containing person data.
 * @param {string} [link=""] - An optional link for the record.
 * @returns {Object} A person record.
 */
function newPersonFromBracket(bracketText, link = "") {
  const record = newPersonRecord();
  const trimmed = bracketText.trim();
  record.UnknownText = trimmed;
  // Detect solitary or appended [biological] marker
  if (/\[biological\]/i.test(record.UnknownText)) {
    record.biological = true;
    record.UnknownText = record.UnknownText.replace(/\[biological\]/i, "").trim();
    if (!record.UnknownText) record.UnknownText = "";
  }
  const dateRangeMatch = trimmed.match(/\(([^)]+)\)/);
  if (dateRangeMatch && dateRangeMatch[1] != "s") {
    const [b, d] = dateRangeMatch[1].split(/\s*-\s*/);
    record.BirthDate = b?.trim() || "";
    record.DeathDate = d?.trim() || "";
    record.Name = trimmed.replace(/\s*\([^)]*\)/, "").trim();
    if (/\[biological\]/i.test(record.Name)) {
      record.biological = true;
      record.Name = record.Name.replace(/\s*\[biological\]/i, "").trim();
    }
  } else {
    record.Name = trimmed;
    if (/\[biological\]/i.test(record.Name)) {
      record.biological = true;
      record.Name = record.Name.replace(/\s*\[biological\]/i, "").trim();
    }
  }
  record.Link = link;
  return record;
}

/**
 * Parses bracketed unknown entries (for example, "[private son (1900s - unknown)]")
 * within a block element.
 * @param {HTMLElement} blockEl - The container element.
 * @returns {Object[]} An array of person records parsed from bracketed text.
 */
function parseBracketedUnknownInBlock(blockEl) {
  const results = [];
  const anchors = blockEl.querySelectorAll("a");
  anchors.forEach((a) => {
    const text = a.textContent.trim();
    // Skip known placeholders.
    if (
      /^\[half\]$/i.test(text) ||
      /^add\b/i.test(text) ||
      /^edit\b/i.test(text) ||
      text === "[date unknown]" ||
      text === "[location unknown]" ||
      text === "[uncertain]" ||
      text === "[South Africa]" ||
      text === "[Suid Afrika]"
    ) {
      return;
    }
    results.push(newPersonFromBracket(text, a.getAttribute("href") || ""));
  });
  let raw = blockEl.innerText;
  anchors.forEach((a) => {
    const t = a.textContent.trim();
    if (
      /^\[half\]$/i.test(t) ||
      /^add\b/i.test(t) ||
      /^edit\b/i.test(t) ||
      ["[South Africa]", "[Suid Afrika]"].includes(t)
    ) {
      return;
    }
    raw = raw.replace(t, "");
  });
  const bracketRegex = /\[[^\]]*\]/g;
  const bracketed = raw.match(bracketRegex) || [];
  bracketed.forEach((b) => {
    const trimmed = b.trim().toLowerCase();
    if (
      /^\[half\]$/i.test(b) ||
      /^add\b/i.test(b) ||
      /^edit\b/i.test(b) ||
      ["[uncertain]", "[certain]", "[non-biological]", "[South Africa]", "[Suid Afrika]", "[biological]"].includes(
        trimmed
      )
    ) {
      return;
    }
    results.push(newPersonFromBracket(b));
  });

  return results;
}

/**
 * Parses a block element for items with a given itemprop attribute.
 * @param {HTMLElement} blockEl - The container element.
 * @param {string} itempropName - The itemprop value to search for.
 * @returns {Object[]} An array of person records.
 */
function parseBlock(blockEl, itempropName) {
  const records = [];
  const itempropEls = blockEl.querySelectorAll(`[itemprop="${itempropName}"]`);
  itempropEls.forEach((el) => {
    const rec = parseItempropElement(el);
    // keep a reference to the source element so we can attach standalone markers
    rec._el = el;
    if (itempropName == "sibling" && !rec.halfMarker) {
      const smallSpan = $(el).next(".SMALL");
      if (smallSpan.length && smallSpan.text().match(/\[half\]/i)) {
        rec.halfMarker = smallSpan.prop("outerHTML");
      }
    }
    if (rec.Name || rec.FullName || rec.UnknownText) {
      records.push(rec);
    }
  });
  // If we found itemprop elements, also look for standalone bracket markers (e.g. "[biological]")
  // that appear as text nodes in the block and apply them to the nearest preceding itemprop element.
  if (records.length > 0) {
    try {
      const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        if (/\[biological\]/i.test(node.nodeValue)) {
          // find the last itemprop element that precedes this text node
          let targetEl = null;
          for (let i = 0; i < itempropEls.length; i++) {
            const el = itempropEls[i];
            if (el.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) {
              targetEl = el;
            }
          }
          // if none found, fallback to the last record
          const targetRecord = records.find((r) => r._el === targetEl) || records[records.length - 1];
          if (targetRecord) {
            targetRecord.biological = true;
          }
        }
      }
    } catch (e) {
      // swallow any issues with TreeWalker on odd DOMs
      if (DEBUG_FAMILY_LISTS) console.warn("parseBlock: error scanning for standalone markers", e);
    }
  }
  // If no itemprop elements found, use bracketed text.
  if (records.length === 0) {
    const bracketed = parseBracketedUnknownInBlock(blockEl);
    records.push(...bracketed);
  }
  return records;
}

/**
 * Parses a spouses block and returns an array of spouse records.
 * @param {HTMLElement} spousesEl - The element containing spouse data.
 * @returns {Object[]} Array of spouse person records.
 */
function parseSpousesBlock(spouseEls) {
  const records = [];
  spouseEls.forEach((spouse, index) => {
    const spouseClone = spouse.cloneNode(true);
    const spouseEl = spouseClone.querySelector('[itemprop="spouse"]');
    if (spouseEl) {
      const rec = parseItempropElement(spouseEl);
      rec.RelationshipStatus = getRelationshipStatusFromElement(spouse);
      spouseEl.remove();
      let details = spouseClone.textContent || "";
      details = details.replace(/\s{2,}/g, " ").trim();
      details = details.replace(/add\/edit spouses/gi, "").trim();
      rec.MarriageDetails = details;
      const mapLinkEl = spouseClone.querySelector('a[href*="maps.google"]');
      if (mapLinkEl) {
        rec.MarriageMapLink = mapLinkEl.getAttribute("href") || "";
      }
      rec.merge = false;
      if (rec.Name && rec.Name.trim()) {
        rec.Name = rec.Name.trim();
        records.push(rec);
      }
    }
  });

  // Add spouseEls to a temporary div to parse bracketed unknowns.
  const tempDiv = document.createElement("div");
  spouseEls.forEach((spouse) => {
    tempDiv.appendChild(spouse.cloneNode(true));
  });

  const bracketed = parseBracketedUnknownInBlock(tempDiv).filter(
    (b) => b.Name && b.Name.trim() && !b.Link.startsWith("https://maps.google")
  );
  bracketed.forEach((b) => {
    if (
      (!records.some((m) => m.Link === b.Link || m.Name === b.Name) &&
        ["[South Africa]", "[Suid Afrika]"].includes(b.Name.trim()) == false) ||
      b.Name.includes("private")
    ) {
      records.push(b);
    }
  });

  return records;
}

let siblingCounter = 0;
function improvedSiblingsArray() {
  const siblingsArray = [];
  const siblingsContainer = document.getElementById("Siblings");
  if (!siblingsContainer) return siblingsArray;

  // --- Step 1: Extract structured sibling entries ---
  const structuredSiblings = siblingsContainer.querySelectorAll("span[itemprop='sibling']");
  structuredSiblings.forEach((elem) => {
    let nameElem = elem.querySelector("span[itemprop='name']");
    let rawText = nameElem ? nameElem.textContent.trim() : elem.textContent.trim();
    let BirthDate = "";
    let DeathDate = "";
    const dateMatch = rawText.match(/\(([^)]*\d{4}[^)]*)\)/);
    if (dateMatch) {
      const [b, d] = dateMatch[1].split(/\s*-\s*/);
      BirthDate = b ? b.trim() : "";
      DeathDate = d ? d.trim() : "";
      rawText = rawText.replace(/\s*\([^)]*\)/, "").trim();
    }
    let half = /\[half\]/i.test(rawText);
    rawText = rawText.replace(/\[half\]/gi, "").trim();
    rawText = rawText.replace(/^\[|\]$/g, "").trim();

    // Detect [biological] marker
    let biological = false;
    if (/\[biological\]/i.test(rawText)) {
      biological = true;
      rawText = rawText.replace(/\s*\[biological\]/i, "").trim();
    }
    // Assign a unique ID
    siblingsArray.push({
      uniqueId: siblingCounter++,
      FullName: rawText,
      half: half,
      BirthDate: BirthDate,
      DeathDate: DeathDate,
      biological: biological,
    });
  });

  // --- Step 2: Fallback for bracketed/unstructured entries ---
  let remainingText = siblingsContainer.innerText;
  structuredSiblings.forEach((elem) => {
    let text = elem.textContent.trim();
    remainingText = remainingText.replace(text, "");
  });
  const bracketRegex = /\[[^\]]+\]/g;
  const bracketMatches = remainingText.match(bracketRegex) || [];
  const placeholders = new Set([
    "[date unknown]",
    "[location unknown]",
    "[uncertain]",
    "[confident]",
    "[non-biological]",
    "[marriage location?]",
    "[marriage date?]",
    "[half]",
    "[biological]",
  ]);
  bracketMatches.forEach((bracketText) => {
    const normalized = bracketText.trim().toLowerCase();
    if (placeholders.has(normalized)) return;
    const temp = document.createElement("div");
    temp.innerHTML = bracketText;
    let textContent = temp.textContent.trim();
    let BirthDate = "";
    let DeathDate = "";
    const dateMatch = textContent.match(/\(([^)]*\d{4}[^)]*)\)/);
    if (dateMatch) {
      const [b, d] = dateMatch[1].split(/\s*-\s*/);
      BirthDate = b ? b.trim() : "";
      DeathDate = d ? d.trim() : "";
      textContent = textContent.replace(/\s*\([^)]*\)/, "").trim();
    }
    let half = /\[half\]/i.test(textContent);
    let biological = false;
    if (/\[biological\]/i.test(textContent)) {
      biological = true;
      textContent = textContent.replace(/\s*\[biological\]/i, "").trim();
    }
    textContent = textContent.replace(/\[half\]/gi, "").trim();
    //textContent = textContent.replace(/^\[|\]$/g, "").trim();
    siblingsArray.push({
      uniqueId: siblingCounter++,
      FullName: textContent,
      half: half,
      BirthDate: BirthDate,
      DeathDate: DeathDate,
      biological: biological,
    });
  });

  return siblingsArray;
}

/**
 * Parses the initial family data from the DOM.
 * @returns {Object} The family data object with arrays for parents, siblings, spouses, and children.
 */
function parseInitialData() {
  const theSiblingsArray = improvedSiblingsArray();

  const excludeBrackets = [
    "[date unknown]",
    "[location unknown]",
    "[uncertain]",
    "[confident]",
    "[non-biological]",
    "[marriage location?]",
    "[marriage date?]",
    "[South Africa]",
    "[Suid Afrika]",
    "[biological]",
  ];
  const container = document.querySelector("#nav-familyContent div.tree--person");
  if (DEBUG_FAMILY_LISTS) console.log("Container found:", container);

  // If the expected container isn't found due to malformed HTML, try broader search
  let fallbackContainer = null;
  if (!container) {
    if (DEBUG_FAMILY_LISTS) console.log("Primary container not found, trying fallback searches...");
    fallbackContainer =
      document.querySelector("#nav-familyContent") ||
      document.querySelector("#Family-pane") ||
      document.querySelector("body");
    if (DEBUG_FAMILY_LISTS) console.log("Fallback container:", fallbackContainer);
  }

  const searchContainer = container || fallbackContainer;
  familyData = newFamilyData();

  // Parse parents
  const parentsBlock = searchContainer ? searchContainer.querySelector("#Parents") : null;
  if (DEBUG_FAMILY_LISTS) console.log("Parents block found:", parentsBlock);
  if (parentsBlock) {
    let parsedParents = parseBlock(parentsBlock, "parent").filter((r) => r.Name && !/^(edit)$/i.test(r.Name));
    const bracketed = parseBracketedUnknownInBlock(parentsBlock).filter((b) => {
      return b.Name && b.Name.trim() && !b.Link.startsWith("https://maps.google");
    });
    bracketed.forEach((b) => {
      const exists = parsedParents.some((m) => {
        return (
          (m.Name && b.Name && m.Name.toLowerCase() === b.Name.toLowerCase()) ||
          (m.UnknownText && b.UnknownText && m.UnknownText.toLowerCase() === b.UnknownText.toLowerCase())
        );
      });
      if (!exists) {
        parsedParents.push(b);
      }
    });
    parsedParents = parsedParents.filter((parent, index, self) => {
      if (parent.Link) {
        parent.Link = parent.Link.replace(/ /g, "_");
        return index === self.findIndex((p) => p.Link === parent.Link);
      } else {
        // Allow multiple bracketed private entries (e.g., [private daughter ...]) to be preserved
        if (/(?:private)/i.test(parent.UnknownText || parent.Name || "")) return true;
        return index === self.findIndex((p) => p.UnknownText === parent.UnknownText);
      }
    });
    familyData.parents = parsedParents;
  } else {
    delete familyData.parents;
  }

  // Parse bio parents
  const bioParentsBlock = searchContainer ? searchContainer.querySelector("#BioParents") : null;
  if (DEBUG_FAMILY_LISTS) console.log("BioParents block found:", bioParentsBlock);
  if (bioParentsBlock) {
    let parsedBioParents = parseBlock(bioParentsBlock, "parent").filter((r) => r.Name && !/^(edit)$/i.test(r.Name));
    const bracketed = parseBracketedUnknownInBlock(bioParentsBlock).filter((b) => {
      return b.Name && b.Name.trim() && !b.Link.startsWith("https://maps.google");
    });
    bracketed.forEach((b) => {
      const exists = parsedBioParents.some((m) => {
        return (
          (m.Name && b.Name && m.Name.toLowerCase() === b.Name.toLowerCase()) ||
          (m.UnknownText && b.UnknownText && m.UnknownText.toLowerCase() === b.UnknownText.toLowerCase())
        );
      });
      if (!exists) {
        parsedBioParents.push(b);
      }
    });
    parsedBioParents = parsedBioParents.filter((parent, index, self) => {
      if (parent.Link) {
        parent.Link = parent.Link.replace(/ /g, "_");
        return index === self.findIndex((p) => p.Link === parent.Link);
      } else {
        // Allow multiple bracketed private entries to be preserved
        if (/(?:private)/i.test(parent.UnknownText || parent.Name || "")) return true;
        return index === self.findIndex((p) => p.UnknownText === parent.UnknownText);
      }
    });
    familyData.bioParents = parsedBioParents;
  } else {
    delete familyData.bioParents;
  }

  // Parse siblings
  const siblingsBlock = searchContainer ? searchContainer.querySelector("#Siblings") : null;
  if (DEBUG_FAMILY_LISTS) console.log("Siblings block found:", siblingsBlock);
  if (siblingsBlock) {
    // const parsedSiblings = parseBlock(siblingsBlock, "sibling");.filter(
    const x = parseBlock(siblingsBlock, "sibling");
    const parsedSiblings = x.filter((r) => r.Name && !/^(add sibling)$/i.test(r.Name) && !/^\[half\]$/i.test(r.Name));
    const bracketed = parseBracketedUnknownInBlock(siblingsBlock).filter((b) => {
      return b.Name && b.Name.trim() && !b.Link.startsWith("https://maps.google");
    });
    // Build a count map of private entries already in parsedSiblings to avoid doubling
    // when parseBlock's internal fallback and this explicit call find the same entries.
    const existingPrivateSiblingCounts = {};
    parsedSiblings.forEach((p) => {
      const name = (p.Name || "").toLowerCase();
      if (name.includes("private")) {
        existingPrivateSiblingCounts[name] = (existingPrivateSiblingCounts[name] || 0) + 1;
      }
    });
    bracketed.forEach((b) => {
      const bName = (b.Name || "").toLowerCase();
      const isPrivate = bName.includes("private");
      if (isPrivate) {
        if (existingPrivateSiblingCounts[bName] > 0) {
          existingPrivateSiblingCounts[bName]--;
        } else {
          parsedSiblings.push(b);
        }
      } else {
        if (!parsedSiblings.some((m) => m.Link === b.Link || m.Name === b.Name)) {
          parsedSiblings.push(b);
        }
      }
    });
    // name in siblingsArray == FullName in parsedSiblings
    // Check siblingsArray for half. If half and !halfMarker in parsedSiblings, create halfMarker:
    // <span class="SMALL" title="${profilePerson.FullName} and sibling share one parent.">[half]</span>
    // Make a copy of parsedSiblings so we can remove matches as they are found.
    const parsedSiblingsCopy = parsedSiblings.slice();

    theSiblingsArray.forEach((sibling) => {
      const index = parsedSiblingsCopy.findIndex(
        (s) =>
          ((s.FullName === sibling.FullName || s.Name === sibling.FullName) &&
            s.BirthDate === sibling.BirthDate &&
            s.DeathDate === sibling.DeathDate) ||
          s.Name.includes("private")
      );
      if (index !== -1) {
        const siblingObj = parsedSiblingsCopy.splice(index, 1)[0];
        Object.assign(sibling, siblingObj);
        if (sibling.half && !siblingObj.halfMarker) {
          sibling.halfMarker = `<span class="SMALL" title="${profilePerson.FullName} and sibling share one parent."> [half]</span>`;
        }
      } else {
        if (DEBUG_FAMILY_LISTS) console.log(`Sibling not found in parsedSiblings: ${sibling.FullName}`);
      }
    });

    //    familyData.siblings = parsedSiblings;
    familyData.siblings = theSiblingsArray;
  } else {
    delete familyData.siblings;
  }

  // Parse spouses
  const spousesBlock = searchContainer ? searchContainer.querySelectorAll(".spouse") : [];
  if (DEBUG_FAMILY_LISTS) console.log("Spouses block found:", spousesBlock, "length:", spousesBlock.length);
  if (spousesBlock && spousesBlock.length > 0) {
    let spouseEntries = parseSpousesBlock(spousesBlock);
    spouseEntries = spouseEntries.filter(
      (r) => r.Name && r.Name.trim() && excludeBrackets.includes(r.Name.trim().toLowerCase()) === false
    );

    const tempDiv = document.createElement("div");
    spousesBlock.forEach((spouse) => {
      tempDiv.appendChild(spouse.cloneNode(true));
    });

    const bracketed = parseBracketedUnknownInBlock(tempDiv).filter((b) => {
      return (
        b.Name &&
        b.Name.trim() &&
        excludeBrackets.includes(b.Name.trim().toLowerCase()) === false &&
        !b.Link.startsWith("https://maps.google")
      );
    });
    bracketed.forEach((b) => {
      if (
        !spouseEntries.some((m) => m.Link === b.Link || m.Name === b.Name) &&
        ["[South Africa]", "[Suid Afrika]"].includes(b.Name.trim()) == false
      ) {
        spouseEntries.push(b);
      }
    });
    familyData.spouses = spouseEntries;
  } else {
    if (DEBUG_FAMILY_LISTS) console.log("No spouses block found.");
    delete familyData.spouses;
  }

  // Parse children
  const childrenBlock = searchContainer ? searchContainer.querySelector("#Children") : null;
  if (DEBUG_FAMILY_LISTS) console.log("Children block found:", childrenBlock);
  if (childrenBlock) {
    let parsedChildren = parseBlock(childrenBlock, "children");
    parsedChildren = parsedChildren.filter(
      (r) => r.Name && !/\b(add|edit)\b/i.test(r.Name) && r.Name.toLowerCase() !== "add/edit children"
    );
    const bracketed = parseBracketedUnknownInBlock(childrenBlock).filter((b) => {
      return b.Name && b.Name.trim() && !b.Link.startsWith("https://maps.google");
    });
    // Build a count map of private entries already in parsedChildren (these may have come from
    // parseBlock's internal parseBracketedUnknownInBlock fallback when no itemprop elements exist).
    // This prevents doubling when both parseBlock and the explicit call below find the same entries.
    const existingPrivateCounts = {};
    parsedChildren.forEach((p) => {
      const name = (p.Name || "").toLowerCase();
      if (name.includes("private")) {
        existingPrivateCounts[name] = (existingPrivateCounts[name] || 0) + 1;
      }
    });
    bracketed.forEach((b) => {
      const bName = (b.Name || "").toLowerCase();
      const isPrivate = bName.includes("private");
      if (isPrivate) {
        // Only add if not already accounted for from parseBlock's internal fallback.
        // Decrement the count to allow genuinely new additional private entries through.
        if (existingPrivateCounts[bName] > 0) {
          existingPrivateCounts[bName]--;
        } else {
          parsedChildren.push(b);
        }
      } else {
        if (!parsedChildren.some((m) => m.Link === b.Link || m.Name === b.Name)) {
          parsedChildren.push(b);
        }
      }
    });
    familyData.children = parsedChildren;
  } else {
    delete familyData.children;
  }

  return familyData;
}

/**
 * Builds the complete family lists DOM structure.
 * @param {Object} familyData - The family data object.
 * @returns {HTMLElement} The DOM element containing the family lists.
 */
function buildFamilyListsFromData(familyData) {
  const container = document.createElement("div");
  container.id = "nVitals";
  container.className = "row";
  const headerDiv = document.createElement("div");
  headerDiv.className = "large sidebar-heading";
  headerDiv.style.marginBottom = "0.5em";
  headerDiv.innerHTML = "<strong>Family Relationships</strong>";
  container.appendChild(headerDiv);

  if (familyData.parents !== undefined) {
    container.appendChild(buildParentsSection(familyData.parents));
  }
  if (familyData.bioParents !== undefined) {
    container.appendChild(buildBioParentsSection(familyData.bioParents));
  }
  if (familyData.siblings !== undefined) {
    container.appendChild(buildSiblingsSection(familyData.siblings));
  }
  // only show a spouses section if we actually have spouse data
  // or if the original page offered an Add/Edit Spouses link
  if ((familyData.spouses && familyData.spouses.length > 0) || pencils.spouses || pencils.hasAddSpouse) {
    if (familyData.spouses && familyData.spouses.length > 0) {
      container.appendChild(buildSpousesSection(familyData.spouses));
    } else {
      // no spouses, but pencils.spouses is truthy → render “[spouse?]”
      container.appendChild(buildSpousesUnknown());
    }
  }
  if (familyData.children !== undefined) {
    if (familyData.children.length === 0) {
      container.appendChild(buildChildrenUnknown());
    } else {
      container.appendChild(buildChildrenSection(familyData.children));
    }
  }
  return container;
}

/**
 * Extracts date information from a person record.
 * @param {Object} p - The person record.
 * @returns {Object} An object containing birthYear, deathYear, and a formatted dates string.
 */
function getDatesFromFamilyData(p) {
  const getYear = (dateStr) => {
    if (dateStr && dateStr !== "0000-00-00" && dateStr.toLowerCase() !== "unknown") {
      return dateStr.includes("s") ? dateStr : dateStr.split("-")[0];
    }
    return "";
  };

  const birthYear = getYear(p.BirthDate);
  const deathYear = getYear(p.DeathDate);

  if (birthYear || deathYear) {
    return { birthYear, deathYear, dates: ` (${birthYear}–${deathYear})` };
  }
  return {};
}
// en dash character: &#8211; or &ndash; or " - "
/**
 * Creates a header element.
 * @param {string} label - The header label.
 * @param {string} headerId - The element ID.
 * @param {string} tooltip - The tooltip text.
 * @returns {HTMLElement} The header span element.
 */
function createHeader(label, headerId, tooltip) {
  const span = document.createElement("span");
  span.id = headerId;
  span.className = "clickable";
  span.setAttribute("data-replace-text", label);
  span.setAttribute("data-alt-text", label);
  span.setAttribute("data-original-text", label);
  span.setAttribute("data-this-text", label);
  span.title = tooltip;
  span.style.cursor = "pointer";
  span.textContent = label;
  return span;
}

/**
 * Creates an edit button element.
 * @param {string} href - The link URL.
 * @param {string} tooltip - The tooltip text.
 * @param {string} [text="edit"] - The text for the button.
 * @returns {HTMLElement} The edit button span element.
 */
function createEditButton(href, tooltip, text = "edit") {
  const span = document.createElement("span");
  span.className = "EDIT";
  span.setAttribute("data-bs-toggle", "tooltip");
  span.setAttribute("data-bs-title", tooltip);
  span.setAttribute("title", tooltip);
  span.innerHTML = `<a href="${href}">${text}</a>`;
  return span;
}

/**
 * Creates a default link for an unknown entry.
 * @param {string} section - The family section (e.g. "father", "child").
 * @param {string} defaultText - The default link text.
 * @returns {HTMLElement} The default link element.
 */
function createDefaultLink(section, defaultText) {
  const a = document.createElement("a");
  a.href = `https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=${section}`;
  if (options.addNotEdit) {
    a.href += "&WBEaction=Add";
  }
  a.className = "BLANK";
  a.textContent = defaultText;
  return a;
}

/**
 * Creates an ordered list element.
 * @param {string} id - The element ID.
 * @param {string} [className="nameList"] - The class name.
 * @param {string} [listStyle="none"] - The CSS list-style value.
 * @returns {HTMLElement} The ol element.
 */
function createListElement(id, className = "nameList", listStyle = "none") {
  const ol = document.createElement("ol");
  ol.id = id;
  ol.className = className;
  ol.style.listStyle = listStyle;
  return ol;
}

/**
 * Builds the Parents section DOM.
 * @param {Object[]} parents - Array of parent records.
 * @returns {HTMLElement} The parents section element.
 */
function buildParentsSection(parents) {
  const container = document.createElement("div");
  container.className = "VITALS familyList";
  container.id = "parentDetails";

  const headerDiv = document.createElement("div");
  headerDiv.appendChild(createHeader("Parents: ", "parentsHeader", ""));
  headerDiv.appendChild(
    createEditButton(
      `https://${mainDomain}/index.php?title=Special:EditPerson&u=${profilePerson.Id}#Family`,
      "Edit Parents"
    )
  );
  container.appendChild(headerDiv);

  const ol = createListElement("parentList");
  if (parents.length === 0) {
    ol.appendChild(createDefaultLink("father", "[father?]"));
    ol.appendChild(createDefaultLink("mother", "[mother?]"));
  } else {
    parents.forEach((p) => {
      const li = document.createElement("li");
      li.dataset.parseName = p.Name;
      const dates = getDatesFromFamilyData(p);
      const isPrivate = /^\[.*(unknown|private).*?\]$/i.test(p.Name);
      let hrefBit = `href="${p.Link}"`;
      if (isPrivate) {
        hrefBit = "";
        p.Gender = p.Name.includes("father") ? "Male" : p.Name.includes("mother") ? "Female" : "";
      }
      let relationshipStatus;

      if (profilePersonData?.DataStatus?.Father && p.relationship == "Father") {
        relationshipStatus = profilePersonData.DataStatus?.Father;
        p.Gender = "Male";
      } else if (profilePersonData?.DataStatus?.Mother && p.relationship == "Mother") {
        relationshipStatus = profilePersonData.DataStatus.Mother;
        p.Gender = "Female";
      }
      const statusUi = buildRelationshipStatusUi(relationshipStatus);
      li.innerHTML = `<span itemprop="${
        p.relationship || "parent"
      }" itemscope itemtype="https://schema.org/Person"><a ${hrefBit} itemprop="url" title="" aria-label="Parent"><span itemprop="name">${
        p.FullName || p.Name
      }${p.biological ? ' <span class="biological">[biological]</span>' : ""}</span>${
        statusUi.html
      }</a><span class="bdDates" data-birth-year="${dates.birthYear || ""}" data-death-year="${
        dates.deathYear || ""
      }">${dates.dates ? " " + dates.dates : ""}</span><span class="relAge"></span></span>`;
      ol.appendChild(li);
      applyRelationshipStatusTooltip(li, statusUi.label);
      li.dataset.gender = getGender(p);
    });
  }
  container.appendChild(ol);
  return container;
}

/**
 * Builds the Bio Parents section DOM.
 * @param {Object[]} bioParents - Array of bio parent records.
 * @returns {HTMLElement} The bio parents section element.
 */
function buildBioParentsSection(bioParents) {
  const container = document.createElement("div");
  container.className = "VITALS familyList";
  container.id = "bioParentDetails";

  const headerDiv = document.createElement("div");
  headerDiv.appendChild(createHeader("Biological Parents: ", "bioParentsHeader", "Biological Parents"));
  container.appendChild(headerDiv);

  const ol = createListElement("bioParentList");
  if (bioParents.length === 0) {
    ol.appendChild(createDefaultLink("bioFather", "[bio father?]"));
    ol.appendChild(createDefaultLink("bioMother", "[bio mother?]"));
  } else {
    // Ensure father appears before mother when present
    bioParents = bioParents.slice().sort((a, b) => {
      if (a.relationship === b.relationship) return 0;
      if (a.relationship === "BioFather") return -1;
      if (b.relationship === "BioFather") return 1;
      if (a.relationship === "BioMother") return -1;
      if (b.relationship === "BioMother") return 1;
      // fallback to gender: male first
      if ((a.Gender || "").toLowerCase() === "male" && (b.Gender || "").toLowerCase() !== "male") return -1;
      if ((b.Gender || "").toLowerCase() === "male" && (a.Gender || "").toLowerCase() !== "male") return 1;
      return 0;
    });

    bioParents.forEach((p) => {
      // sanitize names: remove any leading conjunctions like 'and' or '&'
      if (p.FullName) p.FullName = p.FullName.replace(/^\s*(?:and|&|,)\s+/i, "").trim();
      if (p.Name) p.Name = p.Name.replace(/^\s*(?:and|&|,)\s+/i, "").trim();
      const li = document.createElement("li");
      li.dataset.parseName = p.Name;
      const dates = getDatesFromFamilyData(p);
      const isPrivate = /^\[.*(unknown|private).*?\]$/i.test(p.Name);
      let hrefBit = `href="${p.Link}"`;
      if (isPrivate) {
        hrefBit = "";
        p.Gender = p.Name.includes("father") || p.relationship === "BioFather" ? "Male" : "Female";
      } else {
        p.Gender = p.relationship === "BioFather" ? "Male" : "Female";
      }

      const _pid_for_class = p.Id || p.Name || "unknown";
      const _pid_safe = String(_pid_for_class).replace(/[^a-zA-Z0-9_-]/g, "_");
      li.dataset.id = _pid_for_class;
      li.className =
        p.relationship == "BioFather" ? `parent_1 parent_1_pid${_pid_safe}` : `parent_2 parent_2_pid${_pid_safe}`;
      if (p.Gender == "Male") {
        li.classList.add("male");
        li.dataset.gender = "Male";
      }
      if (p.Gender == "Female") {
        li.classList.add("female");
        li.dataset.gender = "Female";
      }
      li.innerHTML = `<span itemprop="parent" ${
        p.relationship == "BioFather"
          ? `class="parent_1 parent_1_pid${_pid_safe}"`
          : `class="parent_2 parent_2_pid${_pid_safe}"`
      }><a ${hrefBit} data-gender="${p.Gender}">${p.FullName || p.Name}</a>
        </span><span class="bdDates">${dates.dates || ""}</span>`;
      ol.appendChild(li);
    });
  }

  container.appendChild(ol);
  return container;
}

/**
 * Builds the Siblings section DOM.
 * @param {Object[]} siblings - Array of sibling records.
 * @returns {HTMLElement} The siblings section element.
 */
function buildSiblingsSection(siblings) {
  const container = document.createElement("div");
  container.className = "VITALS familyList";
  container.id = "siblingDetails";

  const headerDiv = document.createElement("div");
  headerDiv.appendChild(createHeader("Siblings: ", "siblingsHeader", ""));
  if (pencils.siblings) {
    headerDiv.appendChild(createEditButton(pencils.siblings, "Add Sibling"));
  }
  container.appendChild(headerDiv);

  const ol = createListElement("siblingList", "nameList hasRelAge");
  if (siblings.length === 0) {
    ol.appendChild(createDefaultLink("sibling", "[siblings?]"));
  } else {
    siblings.forEach((s) => {
      ol.appendChild(createSiblingListItem(s));
    });
  }
  container.appendChild(ol);
  return container;
}

/**
 * Creates a sibling <li> element from a sibling record.
 * @param {Object} s - Sibling record
 * @returns {HTMLElement} li element
 */
function createSiblingListItem(s) {
  const li = document.createElement("li");
  li.dataset.parseName = s.Name;
  const dates = getDatesFromFamilyData(s);
  s.Name = s.Name?.trim() || "";
  s.FullName = s.FullName?.trim() || "";
  const isPrivate = s.Name?.toLowerCase()?.startsWith("[private");
  s.Gender = getGender(s);
  if (isPrivate) {
    li.innerHTML = `<span itemprop="sibling" class="privateSibling" itemtype="https://schema.org/Person">
            <span itemprop="name">${s.FullName || s.Name}${
      s.biological ? ' <span class="biological">[biological]</span>' : ""
    } ${s.halfMarker || ""}</span><span class="bdDates" data-birth-year="${dates.birthYear || ""}" data-death-year="${
      dates.deathYear || ""
    }">${dates.dates ? " " + dates.dates : ""}</span><span class="relAge"></span></span>`;
  } else {
    li.innerHTML = `<span itemprop="sibling" itemscope itemtype="https://schema.org/Person">
          <a href="${s.Link}" itemprop="url" title="" aria-label="Sibling"><span itemprop="name">${
      s.FullName || s.Name
    }${
      s.biological ? ' <span class="biological">[biological]</span>' : ""
    }</span></a><span class="bdDates" data-birth-year="${dates.birthYear || ""}" data-death-year="${
      dates.deathYear || ""
    }">${dates.dates ? " " + dates.dates : ""}</span><span class="relAge"></span></span>`;

    if (s.halfMarker) {
      $(li).find(".bdDates").before(s.halfMarker);
    }

    if (s.Father) li.setAttribute("data-father", s.Father);
    if (s.Mother) li.setAttribute("data-mother", s.Mother);
  }
  li.setAttribute("data-gender", s.Gender || "");
  return li;
}

function getGender(person) {
  const isMale =
    person.Gender == "Male" ||
    person.Name?.includes("brother") ||
    person.Name?.includes("husband") ||
    person.Name?.includes("son") ||
    person.FullName?.includes("brother") ||
    person.FullName?.includes("husband") ||
    person.FullName?.includes("son") ||
    person.relationship == "Father" ||
    person.relationship == "Son";
  const isFemale =
    person.Gender == "Female" ||
    person.Name?.includes("sister") ||
    person.Name?.includes("wife") ||
    person.Name?.includes("daughter") ||
    person.FullName?.includes("sister") ||
    person.FullName?.includes("wife") ||
    person.FullName?.includes("daughter") ||
    person.relationship == "Mother" ||
    person.relationship == "Daughter";
  const notShow = person.DataStatus?.Gender == "blank";

  return isMale && !notShow ? "Male" : isFemale && !notShow ? "Female" : "";
}

const RELATIONSHIP_STATUS_META = {
  5: {
    label: "Non-biological",
    iconClass: "icon--dna-none",
    iconHtml: "<span class='icon--dna-none wbe-icon' title='Non-biological'></span>",
  },
  10: {
    label: "Uncertain",
    iconClass: "icon--uncertain",
    iconHtml: "<span class='icon--uncertain wbe-icon' title='Uncertain'></span>",
  },
  20: {
    label: "Certain",
    iconClass: "icon--confident",
    iconHtml: "<span class='icon--confident wbe-icon' title='Certain'></span>",
  },
  30: {
    label: "DNA confirmed",
    iconClass: "icon--dna-checked",
    iconHtml:
      "<span class='icon--dna-checked wbe-icon' style='background-size:40px 20px !important; width:40px !important'></span>",
  },
};

function getRelationshipStatusLabel(status) {
  const normalizedStatus = Number(status);
  return RELATIONSHIP_STATUS_META[normalizedStatus]?.label || "";
}

function getRelationshipStatusMeta(status) {
  const normalizedStatus = Number(status);
  return RELATIONSHIP_STATUS_META[normalizedStatus] || null;
}

function getRelationshipStatusByIconClass(iconClass) {
  if (!iconClass) return null;
  const entry = Object.entries(RELATIONSHIP_STATUS_META).find(([, meta]) => meta.iconClass === iconClass);
  return entry ? Number(entry[0]) : null;
}

function getRelationshipStatusClassSelector() {
  const iconClasses = Object.values(RELATIONSHIP_STATUS_META)
    .map((meta) => `.${meta.iconClass}`)
    .join(", ");
  return iconClasses;
}

function getRelationshipStatusIconClassList() {
  return Object.values(RELATIONSHIP_STATUS_META).map((meta) => meta.iconClass);
}

function getRelationshipStatusFromText(indicatorText) {
  if (!indicatorText) return null;
  const normalizedText = indicatorText.toLowerCase();

  if (normalizedText.includes("non-biological")) return 5;
  if (normalizedText.includes("uncertain")) return 10;
  if (normalizedText.includes("dna confirmed") || normalizedText.includes("confirmed")) return 30;
  if (/\bcertain\b/.test(normalizedText)) return 20;
  return null;
}

function getRelationshipStatusIcon(status) {
  const meta = getRelationshipStatusMeta(status);
  if (meta) return meta.iconHtml;
  return "";
}

function buildRelationshipStatusUi(status) {
  const label = getRelationshipStatusLabel(status);
  const icon = getRelationshipStatusIcon(status);
  const html = icon ? ` <span class="dataStatus" title="">${icon}</span>` : "";
  return { label, html };
}

function applyRelationshipStatusTooltip(li, label) {
  $(li).data("tooltip", label).data("bs-tooltip", label);
  li.dataset.bsTooltip = label;
}

function getRelationshipStatusFromElement(containerEl) {
  if (!containerEl) return null;

  const statusIcon = containerEl.querySelector(getRelationshipStatusClassSelector());
  if (statusIcon) {
    const matchedClass = getRelationshipStatusIconClassList().find((iconClass) =>
      statusIcon.classList.contains(iconClass)
    );
    const status = getRelationshipStatusByIconClass(matchedClass);
    if (status != null) return status;
  }

  const relationshipIndicator = containerEl.querySelector(
    "[data-bs-title*='Relationship'], [title*='Relationship'], [aria-label*='Relationship']"
  );
  const indicatorText =
    relationshipIndicator?.getAttribute("data-bs-title") ||
    relationshipIndicator?.getAttribute("title") ||
    relationshipIndicator?.getAttribute("aria-label") ||
    "";

  const statusFromText = getRelationshipStatusFromText(indicatorText);
  if (statusFromText != null) return statusFromText;

  return null;
}

function getChildStatusForProfile(childPerson) {
  if (!childPerson || !profilePerson?.Id) return null;

  const profileId = String(profilePerson.Id);
  const fatherId = childPerson.Father != null ? String(childPerson.Father) : "";
  const motherId = childPerson.Mother != null ? String(childPerson.Mother) : "";

  if (fatherId && fatherId === profileId) {
    return childPerson.DataStatus?.Father;
  }
  if (motherId && motherId === profileId) {
    return childPerson.DataStatus?.Mother;
  }

  if (profilePerson?.Gender === "Male") {
    return childPerson.DataStatus?.Father;
  }
  if (profilePerson?.Gender === "Female") {
    return childPerson.DataStatus?.Mother;
  }

  return null;
}

/**
 * Builds the Spouses section DOM.
 * @param {Object[]} spouses - Array of spouse records.
 * @returns {HTMLElement} The spouses section element.
 */
function buildSpousesSection(spouses) {
  if (spouses.length === 1 && spouses[0].Name === "[spouse?]") {
    return buildSpousesUnknown();
  }

  const container = document.createElement("div");
  container.className = "VITALS spouseDetails familyList";

  // ── HEADER ─────────────────────────────────────────
  const headerDiv = document.createElement("div");
  if (pencils.spouses) {
    headerDiv.appendChild(createEditButton(pencils.spouses, "Add/Edit Spouses"));
  }
  headerDiv.appendChild(createHeader("Spouses: ", "spousesHeader", ""));
  container.appendChild(headerDiv);

  // ── MAIN LIST (first 6) ────────────────────────────
  const olMain = createListElement("Spouses");
  olMain.className += " oneSpousePerLine";
  if (spouses.length > 6) {
    olMain.classList.add("hasOverflow");
  }
  container.appendChild(olMain);

  // ── OVERFLOW LIST (≥7) ─────────────────────────────
  let olOverflow = null;
  if (spouses.length > 6) {
    olOverflow = document.createElement("ol");
    olOverflow.className = "oneSpousePerLine";
    olOverflow.style.display = "none";
    olOverflow.id = "overflowSpousesWBE";
    container.appendChild(olOverflow);
  }

  // ── BUILD EACH <li> ─────────────────────────────────
  spouses.forEach((spouse, idx) => {
    const li = document.createElement("li");
    li.className = "spouse";
    li.dataset.parseName = spouse.Name;
    li.setAttribute("data-id", spouse.Id);
    li.setAttribute("data-gender", getGender(spouse));

    // Name + link
    const grid = document.createElement("div");
    grid.className = "spouseGrid";
    const entry = document.createElement("span");
    entry.className = "spouseEntry";
    entry.setAttribute("itemprop", "spouse");
    entry.setAttribute("itemscope", "");
    entry.setAttribute("itemtype", "https://schema.org/Person");
    entry.setAttribute("data-gender", spouse.Gender);

    const isPrivate = spouse.Name.trim().toLowerCase().startsWith("[private");
    const spouseStatusUi = buildRelationshipStatusUi(spouse.RelationshipStatus);
    if (spouse.Link && !isPrivate) {
      entry.innerHTML = `
        <a href="${spouse.Link}" itemprop="url" class="spouseLink">
          <span itemprop="name" class="spouse-name">
            ${spouse.FullName || spouse.Name}${spouse.biological ? ' <span class="biological">[biological]</span>' : ""}
          </span>${spouseStatusUi.html}
        </a>`;
    } else {
      entry.innerHTML = `
        <span itemprop="name">
          <strong>${spouse.FullName || spouse.Name}${
        spouse.biological ? ' <span class="biological">[biological]</span>' : ""
      }</strong>${spouseStatusUi.html}
        </span>`;
    }
    applyRelationshipStatusTooltip(li, spouseStatusUi.label);
    grid.appendChild(entry);

    // Birth/death dates
    const datesEl = document.createElement("span");
    datesEl.className = "spouseDates bdDates";
    const theDates = getDatesFromFamilyData(spouse);
    datesEl.setAttribute("data-birth-year", theDates.birthYear || "");
    datesEl.setAttribute("data-death-year", theDates.deathYear || "");
    datesEl.textContent = theDates.dates ? " " + theDates.dates : "";
    if (spouse.Name) {
      const idName = spouse.Name.replace(/\s+/g, "-");
      datesEl.id = idName + "-bdDates";
    }
    grid.appendChild(datesEl);
    li.appendChild(grid);

    // Marriage details
    const details = document.createElement("span");
    details.className = "marriageDetails";
    let dt = spouse.MarriageDetails || "";
    dt = dt
      .replace(/add\/edit spouses/gi, "")
      .trim()
      .replace(/^(?:Husband|Wife|Spouse) of\s*/i, "");

    // Wrap date
    const dateRegex = /(\d{1,2}\s)?([A-Z][a-z]+\s)?\d{4}/;
    const dm = dt.match(dateRegex);
    if (dm) {
      dt = dt.replace(dateRegex, `<span class="marriage-date">${dm[0].trim()}</span>`);
    }

    // Wrap location (stop before "at age")
    const locRegex = /\bin\s+(.+?)(?:\s+at age|\s*$)/i;
    const lm = dt.match(locRegex);
    if (lm) {
      dt = dt.replace(/\bin\s+(.+?)(?=\s+at age|\s*$)/i, `in <span class="marriage-location">${lm[1].trim()}</span>`);
    }

    details.innerHTML = dt;
    li.appendChild(details);

    // Map icon link
    if (spouse.MarriageMapLink) {
      const mapLink = document.createElement("a");
      mapLink.className = "marriageMapLink";
      mapLink.style.position = "relative";
      mapLink.style.marginLeft = "4px";
      mapLink.href = spouse.MarriageMapLink;
      mapLink.setAttribute("data-bs-toggle", "tooltip");
      mapLink.setAttribute("data-bs-title", "Marriage Location on Map");
      mapLink.target = "_map";
      const img = document.createElement("img");
      img.className = "marriageMapIcon";
      img.src = "/images/icons/icon-map-pin.svg";
      img.alt = "map icon";
      mapLink.appendChild(img);
      const ageTextNode = Array.from(details.childNodes).find(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim().startsWith("at age")
      );
      const locationSpan = details.querySelector(".marriage-location");
      if (locationSpan) {
        // Keep the map pin attached to the location and before any age text.
        locationSpan.insertAdjacentElement("afterend", mapLink);
      } else if (ageTextNode) {
        details.insertBefore(mapLink, ageTextNode);
      } else {
        details.appendChild(mapLink);
      }
    }

    // Placeholder edit styling
    if (li.dataset.parseName.includes("?")) {
      li.classList.add("editAction");
      li.classList.remove("spouse");
    }

    // Append to main or overflow
    if (idx < 6 || !olOverflow) {
      olMain.appendChild(li);
    } else {
      olOverflow.appendChild(li);
    }
  });

  // ── SHOW/HIDE BUTTON ────────────────────────────────
  if (spouses.length > 6) {
    const btn = document.createElement("button");
    btn.className = "btn btn-utility SMALL p-0 mb-2";
    btn.type = "button";

    const txtShow = document.createElement("span");
    txtShow.className = "when-collapsed";
    txtShow.textContent = "Show more spouses";

    const txtHide = document.createElement("span");
    txtHide.className = "when-expanded d-none";
    txtHide.textContent = "Show fewer spouses";

    btn.appendChild(txtShow);
    btn.appendChild(txtHide);

    btn.addEventListener("click", () => {
      // Check **new** state after we flip it
      const nowHidden = olOverflow.style.display === "" || olOverflow.style.display === "block";
      if (nowHidden) {
        // It was visible → hide it
        olOverflow.style.display = "none";
        txtShow.classList.remove("d-none");
        txtHide.classList.add("d-none");
      } else {
        // It was hidden → show it
        olOverflow.style.display = "";
        txtShow.classList.add("d-none");
        txtHide.classList.remove("d-none");
      }
    });

    container.appendChild(btn);
  }

  return container;
}

/**
 * Builds the unknown spouses section.
 * @returns {HTMLElement} The unknown spouses element.
 */
function buildSpousesUnknown() {
  const container = document.createElement("div");
  container.className = "VITALS spouseUnknown";
  container.id = "spousesUnknownHeading";
  container.style.cursor = "pointer";

  container.appendChild(createHeader("Spouses: ", "spousesHeader", ""));
  container.appendChild(document.createElement("br"));
  container.appendChild(createDefaultLink("spouse", "[spouse?]"));
  return container;
}

/**
 * Builds the Children section DOM.
 * @param {Object[]} children - Array of children records.
 * @returns {HTMLElement} The children section element.
 */
function buildChildrenSection(children) {
  const container = document.createElement("div");
  container.className = "VITALS familyList";
  container.id = "childrenDetails";

  container.appendChild(createHeader("Children: ", "childrenHeader", ""));
  if (pencils.children) {
    container.appendChild(createEditButton(pencils.children, "Add/Edit Children"));
  }

  const ol = createListElement("childrenList", "nameList hasRelAge");
  children.forEach((c) => {
    ol.appendChild(createChildListItem(c));
  });
  container.appendChild(ol);
  return container;
}

/**
 * Creates a child <li> element from a child record.
 * @param {Object} c - Child record
 * @returns {HTMLElement} li element
 */
function createChildListItem(c) {
  const dates = getDatesFromFamilyData(c);
  const li = document.createElement("li");
  li.dataset.parseName = c.Name;
  const isPrivate = c.FullName.trim().toLowerCase().startsWith("[private");
  c.Gender = getGender(c);
  const childPerson = c.Name ? getPersonByWtID(c.Name) : null;
  let childStatus = getChildStatusForProfile(childPerson);
  // If API provides no status, fall back to the original DOM element's icon/text
  if ((childStatus === null || childStatus === undefined) && c._el) {
    try {
      const domStatus = getRelationshipStatusFromElement(c._el);
      if (domStatus != null) childStatus = domStatus;
    } catch (e) {
      if (DEBUG_FAMILY_LISTS) console.warn("[CFL] child DOM status fallback error", e);
    }
  }
  const childStatusUi = buildRelationshipStatusUi(childStatus);
  if (c.Link && !isPrivate) {
    li.innerHTML = `<span itemprop="children" itemtype="https://schema.org/Person">
          <a href="${
            c.Link.startsWith("http") ? c.Link : "https://" + mainDomain + c.Link
          }" itemprop="url" title="" aria-label="Child" class="childLink"><span itemprop="name">${
      c.FullName || c.Name
    }${c.biological ? ' <span class="biological">[biological]</span>' : ""}</span>${
      childStatusUi.html
    }</a><span class="bdDates" data-birth-year="${dates.birthYear || ""}" data-death-year="${dates.deathYear || ""}">${
      dates.dates ? " " + dates.dates : ""
    }</span><span class="relAge"></span></span>`;
  } else {
    li.innerHTML = `<span itemprop="children" class="privateChild" itemtype="https://schema.org/Person">
            <span itemprop="name">${c.FullName || c.Name}${
      c.biological ? ' <span class="biological">[biological]</span>' : ""
    }</span>${childStatusUi.html}<span class="bdDates" data-birth-year="${dates.birthYear || ""}" data-death-year="${
      dates.deathYear || ""
    }">${dates.dates ? " " + dates.dates : ""}</span><span class="relAge"></span></span>`;
  }
  applyRelationshipStatusTooltip(li, childStatusUi.label);
  if (!/^\[.*\?\]$/.test(c.Name)) {
    li.setAttribute("data-gender", c.Gender || "");
  }
  if (c.Father) li.setAttribute("data-father", c.Father);
  if (c.Mother) li.setAttribute("data-mother", c.Mother);
  if (c.Link?.includes("EditFamily")) {
    li.classList.add("editAction");
    li.setAttribute("data-gender", "");
    // Remove all classes that start with "spouse_"
    li.classList.forEach((className) => {
      if (className.startsWith("spouse_")) {
        li.classList.remove(className);
      }
    });
  }
  return li;
}

/**
 * Builds the unknown children section.
 * @returns {HTMLElement} The unknown children element.
 */
function buildChildrenUnknown() {
  const container = document.createElement("div");
  container.className = "VITALS";
  container.id = "childrenUnknownHeading";
  container.title = "Add a child";
  container.style.cursor = "pointer";
  container.appendChild(createDefaultLink("child", "[children?]"));
  return container;
}

function isLikelyFamilyListApiAccessError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    error?.name === "TypeError" ||
    message.includes("failed to fetch") ||
    message.includes("load failed") ||
    message.includes("networkerror") ||
    message.includes("cors") ||
    message.includes("cross-origin")
  );
}

/**
 * Retrieves people data from the API and stores it in global Maps.
 * @returns {Promise<boolean>} True when people data was loaded, otherwise false.
 */
async function getWindowPeople() {
  let people;
  try {
    [, , people] = await WikiTreeAPI.getPeople(WBE_CFL_APP_ID, profilePerson.Id, getPeopleFields, {
      nuclear: 1,
    });
  } catch (error) {
    window.people = new Map();
    window.peopleByWtID = new Map();
    profilePersonData = undefined;
    throw error;
  }

  if (!people || typeof people !== "object") {
    window.people = new Map();
    window.peopleByWtID = new Map();
    profilePersonData = undefined;
    return false;
  }

  if (DEBUG_FAMILY_LISTS) {
    try {
      console.log("[CFL] getWindowPeople API response keys:", Object.keys(people || {}));
      console.log(
        "[CFL] getWindowPeople API sample:",
        Object.values(people || {})
          .slice(0, 5)
          .map((p) => ({
            Id: p.Id,
            Name: p.Name,
            Father: p.Father,
            Mother: p.Mother,
            BioFather: p.BioFather,
            BioMother: p.BioMother,
            DataStatus: p.DataStatus,
          }))
      );
    } catch (e) {
      console.warn("[CFL] logging people failed", e);
    }
  }
  window.people = new Map(Object.entries(people));
  const arr = Object.values(people);
  window.peopleByWtID = new Map(arr.map((p) => [p.Name, p]));
  profilePersonData = people[profilePerson.Id];

  // If returned person objects lack explicit Father/Mother fields, request them explicitly for all returned WTIDs
  try {
    const sample = arr[0] || {};
    const hasParentFields = typeof sample.Father !== "undefined" || typeof sample.Mother !== "undefined";
    if (!hasParentFields) {
      if (DEBUG_FAMILY_LISTS)
        console.log("[CFL] parent fields missing from initial response — fetching parent fields explicitly");
      const wtids = arr
        .map((p) => p.Name)
        .filter(Boolean)
        .join(",");
      if (wtids) {
        const [, , parentFieldsPeople] = await WikiTreeAPI.getPeople(
          WBE_CFL_APP_ID,
          wtids,
          "Id,Name,Father,Mother,BioFather,BioMother",
          { nuclear: 1 }
        );
        if (parentFieldsPeople) {
          if (DEBUG_FAMILY_LISTS)
            console.log("[CFL] explicit parent fields fetch keys:", Object.keys(parentFieldsPeople));
          Object.entries(parentFieldsPeople).forEach(([k, v]) => {
            // merge parent ids into existing window.people entries
            const existing = window.people.get(String(k)) || window.peopleByWtID.get(v.Name);
            if (existing) {
              existing.Father = v.Father ?? existing.Father;
              existing.Mother = v.Mother ?? existing.Mother;
              existing.BioFather = v.BioFather ?? existing.BioFather;
              existing.BioMother = v.BioMother ?? existing.BioMother;
              // update maps
              window.people.set(String(existing.Id || k), existing);
              if (existing.Name) window.peopleByWtID.set(existing.Name, existing);
            } else {
              // add new entry
              window.people.set(String(k), v);
              if (v.Name) window.peopleByWtID.set(v.Name, v);
            }
          });
          // rebuild arr
          const mergedArr = Array.from(window.people.values());
          if (mergedArr.length) {
            if (DEBUG_FAMILY_LISTS)
              console.log(
                "[CFL] merged parent fields into window.people sample",
                mergedArr.slice(0, 5).map((p) => ({
                  Id: p.Id,
                  Name: p.Name,
                  Father: p.Father,
                  Mother: p.Mother,
                  BioFather: p.BioFather,
                  BioMother: p.BioMother,
                }))
              );
          }
        }
      }
    }
  } catch (e) {
    if (DEBUG_FAMILY_LISTS) console.warn("[CFL] explicit parent fields fetch failed", e);
  }
  // Fallbacks: try several heuristics to locate the profile person in the API results
  if (!profilePersonData) {
    try {
      // 1) Exact WTID match (Name)
      if (profilePerson?.Name && window.peopleByWtID?.has(profilePerson.Name)) {
        profilePersonData = window.peopleByWtID.get(profilePerson.Name);
      }
      // 2) Exact FullName match
      if (!profilePersonData && profilePerson?.FullName) {
        const full = String(profilePerson.FullName).trim();
        profilePersonData = arr.find((p) => (p.FullName || "").replace(/_/g, " ") === full);
      }
      // 3) Exact displayName match
      if (!profilePersonData) {
        const display = (displayName(profilePerson) || [""])[0];
        if (display) {
          profilePersonData = arr.find(
            (p) => (p.FullName || "").replace(/_/g, " ") === display || (p.Name || "").replace(/_/g, " ") === display
          );
        }
      }
      // 4) Token-based contains match (given and family parts)
      if (!profilePersonData) {
        const tokens = [];
        if (profilePerson?.FullName) tokens.push(...profilePerson.FullName.split(/\s+/));
        else if (profilePerson?.Name) tokens.push(...profilePerson.Name.split(/[^A-Za-z0-9]+/));
        const normTokens = tokens.map((t) => t.toLowerCase()).filter(Boolean);
        if (normTokens.length) {
          profilePersonData = arr.find((p) => {
            const check = (p.FullName || p.Name || "").replace(/_/g, " ").toLowerCase();
            return normTokens.every((tok) => check.includes(tok));
          });
        }
      }
    } catch (e) {
      if (DEBUG_FAMILY_LISTS) console.warn("[CFL] getWindowPeople fallback error", e);
    }
    if (DEBUG_FAMILY_LISTS) console.log("[CFL] getWindowPeople fallback result", { found: !!profilePersonData });
  }
  // Final explicit fallback: call API using the profile's WTID/name if we still don't have profilePersonData
  if (!profilePersonData && profilePerson?.Name) {
    try {
      if (DEBUG_FAMILY_LISTS) console.log(`[CFL] attempting explicit API fetch for WTID ${profilePerson.Name}`);
      // Request non-nuclear to ensure the profile record itself is returned
      const [, , morePeople] = await WikiTreeAPI.getPeople(WBE_CFL_APP_ID, profilePerson.Name, getPeopleFields, {
        nuclear: 0,
      });
      // Merge returned people into window.people
      if (morePeople) {
        if (DEBUG_FAMILY_LISTS) {
          try {
            console.log("[CFL] explicit API fetch keys:", Object.keys(morePeople || {}));
            console.log(
              "[CFL] explicit API fetch sample:",
              Object.values(morePeople || {})
                .slice(0, 5)
                .map((p) => ({
                  Id: p.Id,
                  Name: p.Name,
                  Father: p.Father,
                  Mother: p.Mother,
                  BioFather: p.BioFather,
                  BioMother: p.BioMother,
                  DataStatus: p.DataStatus,
                }))
            );
          } catch (e) {
            console.warn("[CFL] logging morePeople failed", e);
          }
        }
        Object.entries(morePeople).forEach(([k, v]) => {
          window.people.set(String(k), v);
        });
        const arr2 = Object.values(Object.assign({}, morePeople));
        arr2.forEach((p) => {
          if (p && p.Name) window.peopleByWtID.set(p.Name, p);
        });
        profilePersonData = morePeople[profilePerson?.Id] || morePeople[profilePerson.Name] || profilePersonData;
        if (!profilePersonData) {
          // try to find by Name in the newly fetched set
          profilePersonData = Object.values(morePeople).find(
            (p) =>
              (p.Name || "") === profilePerson.Name ||
              (p.FullName || "").replace(/_/g, " ") === (profilePerson.FullName || "")
          );
        }
        if (DEBUG_FAMILY_LISTS)
          console.log("[CFL] explicit API fetch result", {
            found: !!profilePersonData,
            profilePersonData: profilePersonData ? { Id: profilePersonData.Id, Name: profilePersonData.Name } : null,
          });
      }
    } catch (e) {
      if (DEBUG_FAMILY_LISTS) console.warn("[CFL] explicit API fetch failed", e);
    }
  }
  if (DEBUG_FAMILY_LISTS)
    console.log(
      "[CFL] profilePersonData set to",
      profilePersonData ? { Id: profilePersonData.Id, Name: profilePersonData.Name } : null
    );

  return true;
}

/**
 * Returns the person object corresponding to the given ID.
 * @param {string|number} id - The person ID.
 * @returns {Object|undefined} The person object.
 */
function getPerson(id) {
  return window.people?.get(String(id));
}

/**
 * Returns the person object corresponding to the given WikiTree ID.
 * @param {string} wtId - The WikiTree ID.
 * @returns {Object|undefined} The person object.
 */
function getPersonByWtID(wtId) {
  return window.peopleByWtID?.get(wtId);
}

/**
 * Fills in the birth and death date information into the given element.
 * @param {jQuery} $el - A jQuery-wrapped element.
 * @param {Object} p - The person record.
 */
function fillBirthDeathDates($el, p) {
  let bYear = "";
  let dYear = "";
  if (isOK(p.BirthDate)) {
    bYear = p.BirthDate.split("-")[0];
  } else if (p.BirthDateDecade) {
    bYear = p.BirthDateDecade;
  }
  if (isOK(p.DeathDate)) {
    dYear = p.DeathDate.split("-")[0];
  } else if (p.DeathDateDecade) {
    dYear = "~" + p.DeathDateDecade;
  }
  if (bYear.trim().toLowerCase() === "unknown" || bYear.trim().toLowerCase() === "~unknown") {
    bYear = "";
  }
  if (dYear.trim().toLowerCase() === "unknown" || dYear.trim().toLowerCase() === "~unknown") {
    dYear = "";
  }
  let finalText = "";
  if (bYear && dYear) {
    finalText = ` (${bYear}–${dYear})`;
  } else if (bYear) {
    finalText = ` (${bYear})`;
  } else if (dYear) {
    finalText = ` ( –${dYear})`;
  }
  $el.find(".bdDates, .spouseDates").each(function () {
    $(this).text(finalText);
    $(this).attr("data-birth-year", bYear);
    $(this).attr("data-death-year", dYear);
  });
}

/**
 * Attaches API data to the DOM elements.
 */
function attachApiData() {
  $("#nVitals li, #nVitals div.spouse").each(function () {
    const parseName = $(this).data("parseName");
    if (!parseName) return;
    const p = getPersonByWtID(parseName);
    if (!p) return;
    $(this).attr("data-id", p.Id);
    if (p.Gender) {
      $(this).attr("data-gender", p.Gender);
    }
    if (p.Father) {
      $(this).attr("data-father", p.Father);
    }
    if (p.Mother) {
      $(this).attr("data-mother", p.Mother);
    }
    fillBirthDeathDates($(this), p);
  });
}

/**
 * Calculates the marriage age given two dates.
 * @param {string} d1 - The birth date.
 * @param {string} d2 - The marriage date.
 * @param {Object} mPerson - The person record.
 * @returns {string} The marriage age (with an approximate marker if needed).
 */
function getMarriageAge(d1, d2, mPerson) {
  const bDate = getApproxDate(d1);
  const mDate = getApproxDate(d2);
  let approx = "";
  if (
    bDate.Approx === true ||
    mDate.Approx === true ||
    (mPerson?.DataStatus?.BirthDate !== "certain" && mPerson?.DataStatus?.BirthDate !== "")
  ) {
    approx = "~";
  }
  const dt1 = bDate.Date;
  const dt2 = mDate.Date;
  const ageAtMarriage = getAge(dt1, dt2);
  return approx + ageAtMarriage[0];
}

/**
 * Adjusts a date string for approximation.
 * @param {string} theDate - A date string.
 * @returns {Object} An object with the adjusted Date string and a Boolean flag for approximation.
 */
function getApproxDate(theDate) {
  let approx = false;
  let aDate;
  if (typeof theDate === "object") return theDate;
  if (theDate.match(/0s$/) != null) {
    aDate = theDate.replace(/0s/, "5");
    approx = true;
  } else {
    const bits = theDate.split("-");
    if (theDate.match(/00-00$/) != null || !bits[1]) {
      aDate = bits[0] + "-07-02";
      approx = true;
    } else if (theDate.match(/-00$/) != null) {
      aDate = bits[0] + "-" + bits[1] + "-16";
      approx = true;
    } else {
      aDate = theDate;
    }
  }
  return { Date: aDate, Approx: approx };
}

/**
 * Changes the edit links to add links
 */
function changeNativeEditLinks() {
  const editFamilyLinks = document.querySelectorAll('a[href*="EditFamily"]');
  for (let i = 0; i < editFamilyLinks.length; i++) {
    if (editFamilyLinks[i].innerText.includes("?")) {
      editFamilyLinks[i].href = editFamilyLinks[i].href + "&WBEaction=Add";
    }
  }

  const nVitals = $("#nVitals");
  if (pencils.siblings) {
    nVitals.find("#siblingDetails").append(" ");
    nVitals.find("#siblingDetails").append(createDefaultLink("sibling", "[+]"));
  }
  if (pencils.children) {
    nVitals.find("#childrenDetails").append(" ");
    nVitals.find("#childrenDetails").append(createDefaultLink("child", "[+]"));
  }
}

/**
 * Calculates and displays marriage ages for spouse entries.
 */
function addMarriageAges() {
  window.runningAMA++;
  const pagePerson = getPerson(profilePerson.Id);
  if (pagePerson?.Spouses != undefined) {
    window.doneMarriageAges = true;
    const apiSpouses = Object.entries(pagePerson.Spouses);
    apiSpouses.forEach((spouseEntry, idx) => {
      const marData = spouseEntry[1];
      const spouseId = marData.Id;
      const marriageDiv = $(`.spouse[data-id='${spouseId}']`);
      if (!marriageDiv.length) return;
      if (isOK(marData.MarriageDate)) {
        let profileMarriageAge = "";
        if (!window.excludeValues.includes(pagePerson.BirthDate)) {
          profileMarriageAge = getMarriageAge(pagePerson.BirthDate, marData.MarriageDate, pagePerson);
        }
        const spouseFromApi = getPerson(marData.Id);
        const spouseMarriageAge =
          spouseFromApi && isOK(spouseFromApi.BirthDate)
            ? getMarriageAge(spouseFromApi.BirthDate, marData.MarriageDate, spouseFromApi)
            : "";
        const marriageDetailsSpan = marriageDiv.find(".marriageDetails");
        const detailsHasNativeAge = marriageDetailsSpan.length
          ? /at age\s*\d+/i.test(marriageDetailsSpan.text())
          : /at age\s*\d+/i.test(marriageDiv.text());
        let profileAgeText =
          !detailsHasNativeAge && profileMarriageAge ? `${pagePerson.FirstName}, ${profileMarriageAge}` : "";
        let spouseAgeText = spouseMarriageAge ? `${spouseFromApi.FirstName}, ${spouseMarriageAge}` : "";
        const agesParts = [profileAgeText, spouseAgeText].filter(Boolean);
        const agesText = agesParts.length ? (detailsHasNativeAge ? ". (" : " (") + agesParts.join("; ") + ")" : "";
        let marriageAgesSpan = marriageDiv.find(".marriageAges");
        if (!marriageAgesSpan.length) {
          marriageAgesSpan = $("<span class='marriageAges'></span>");
          marriageDiv.append(marriageAgesSpan);
        }
        marriageAgesSpan.text(agesText);
        if (marriageDetailsSpan.length) {
          let html = marriageDetailsSpan.html();
          html = html.replace(
            /(husband|wife) of —\s*married\s*/i,
            `— <a href="https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=editspouse&s=${spouseId}" target="_blank" title="Edit marriage" class="clickable">married</a> `
          );
          marriageDetailsSpan.html(html);
          marriageDetailsSpan.contents().wrapAll('<div class="marriageDetailsInner"></div>');
        }
      }
    });
  }
  if (window.runningAMA > 10 || window.doneMarriageAges === true) {
    clearInterval(window.ama);
  }
}

/**
 * Calculates and displays relative ages for family members.
 */
function addRelativeAges() {
  const profileBirth = getPerson(profilePerson.Id)?.BirthDate;
  if (!profileBirth || profileBirth === "0000-00-00") return;
  const container = $("#nVitals");
  container.addClass("hasRelAge");
  let selectors = ``;
  if (options.parentAges) {
    selectors += `#parentList li span[itemprop='parent'],#parentList li span[itemprop='Mother'],#parentList li span[itemprop='Father'], `;
  }
  if (options.ageDifferences) {
    selectors += `#siblingList li span[itemprop='sibling'], #childrenList li span[itemprop='children'], `;
  }
  selectors = selectors.slice(0, -2);
  container.find(selectors).each(function () {
    const $container = $(this);
    const nameAnchor = $container.find("a");
    if (!nameAnchor.length) return;
    const personHref = nameAnchor.attr("href");
    if (!personHref) return;
    const wtId = personHref.split("/").pop().replace(/ /g, "_");
    const personData = getPersonByWtID(wtId);
    if (!personData || !personData.BirthDate || personData.BirthDate === "0000-00-00") return;
    const diff = getAge(profileBirth, personData.BirthDate);
    const relText = diff[0] !== 0 ? (diff[0] > 0 ? "(+" + diff[0] + ")" : "(" + Math.abs(diff[0]) + ")") : "";
    $container.find(".relAge").text(" " + relText);
  });
}

/**
 * Adjusts layout for vertical family lists.
 */
function makeVerticalFamLists() {
  setTimeout(() => {
    addHalfsStyle();
    assignSpouseAndChildClasses();
  }, 1000);
}

/**
 * Assigns CSS classes to spouse and child elements based on parent IDs.
 */
function assignSpouseAndChildClasses() {
  if ($("#childrenList li").length === 0) return;
  let checkParent = "mother";
  if ($("#nVitals .spouse").length > 0) {
    const firstSpouseGender = $("#nVitals .spouse").first().data("gender");
    if (firstSpouseGender === "male") {
      checkParent = "father";
    }
  }
  let uniqueParentIDs = [];
  $("#childrenList li").each(function () {
    const pid = $(this).data(checkParent);
    if (pid && uniqueParentIDs.indexOf(pid) === -1) {
      uniqueParentIDs.push(pid);
    }
  });
  if ($("#nVitals .spouse").length > 1 || uniqueParentIDs.length > 1) {
    $("#nVitals .spouse").each(function (index) {
      const className = "spouse_" + (index + 1);
      $(this).addClass(className);
      const spouseID = $(this).data("id");
      $("#childrenList li").each(function () {
        const childMother = $(this).data("mother");
        const childFather = $(this).data("father");
        if (childMother == spouseID || childFather == spouseID) {
          $(this).addClass(className);
        }
      });
    });
  }
}

/**
 * Adds half-sibling CSS classes if parents differ.
 */
function addParentClassIfNotActive($el, className) {
  if (!$el || !$el.length) return;
  $el.each(function () {
    const $this = $(this);
    if ($this.find(".activeProfile").length === 0 && !$this.hasClass("activeProfile")) {
      $this.addClass(className);
    }
  });
}

function addHalfsStyle() {
  const siblings = $("#siblingList li");
  const fathers = siblings
    .map(function () {
      return $(this).attr("data-father");
    })
    .get();
  const mothers = siblings
    .map(function () {
      return $(this).attr("data-mother");
    })
    .get();
  const uniqueFathers = [...new Set(fathers)];
  const uniqueMothers = [...new Set(mothers)];

  if (!profilePersonData) {
    console.warn("[CFL] addHalfsStyle: profilePersonData is undefined - skipping half-sibling styling");
    return;
  }

  const cond1 = uniqueFathers.length == 1 && uniqueFathers[0] == profilePersonData?.Father;
  const cond2 = uniqueFathers.length == 0 && !profilePersonData?.Father;
  const cond3 = uniqueMothers.length == 1 && uniqueMothers[0] == profilePersonData?.Mother;
  const cond4 = uniqueMothers.length == 0 && !profilePersonData?.Mother;
  if ((cond1 || cond2) && (cond3 || cond4)) {
    return;
  }

  const pList = $("#parentList li");

  // Grab the <li> elements for father and mother based on data-gender
  const fatherLi = pList.filter('[data-gender="Male"]').first();
  const motherLi = pList.filter('[data-gender="Female"]').first();
  // Compute parent IDs and classes when available (allow one or both parents)
  const fatherID = fatherLi.length ? fatherLi.attr("data-id") : null;
  const motherID = motherLi.length ? motherLi.attr("data-id") : null;
  const _fatherSafe = fatherID ? String(fatherID).replace(/[^a-zA-Z0-9_-]/g, "_") : null;
  const _motherSafe = motherID ? String(motherID).replace(/[^a-zA-Z0-9_-]/g, "_") : null;
  const fatherClass = _fatherSafe ? `parent_1 parent_1_pid${_fatherSafe}` : "parent_1";
  const motherClass = _motherSafe ? `parent_2 parent_2_pid${_motherSafe}` : "parent_2";

  if (fatherLi.length) addParentClassIfNotActive(fatherLi, fatherClass);
  if (motherLi.length) addParentClassIfNotActive(motherLi, motherClass);

  // Assign parent classes to siblings (each sibling may get both classes if applicable)
  $("#siblingList li").each(function () {
    const $sib = $(this);
    const theirFather = String($sib.attr("data-father") || "");
    const theirMother = String($sib.attr("data-mother") || "");
    // Apply father class to the sibling <li> and mother class to the inner span[itemprop='sibling']
    // Do not apply classes to elements that contain the active profile marker.
    if (fatherID && theirFather === fatherID) {
      addParentClassIfNotActive($sib, fatherClass);
    }
    if (motherID && theirMother === motherID) {
      try {
        const $sSpan = $sib.find("span[itemprop='sibling']");
        addParentClassIfNotActive($sSpan, motherClass);
      } catch (e) {}
    }
    if ($sib.text().includes("[half]")) {
      $sib.addClass("fl-half-tooltip").attr("data-title", "[half]");
    }
  });

  // Also assign parent classes to children list so parent colours reflect on children items
  $("#childrenList li").each(function () {
    const $child = $(this);
    const childFather = String($child.attr("data-father") || "");
    const childMother = String($child.attr("data-mother") || "");
    if (fatherID && childFather === fatherID) {
      addParentClassIfNotActive($child, fatherClass);
    }
    if (motherID && childMother === motherID) {
      try {
        const $cSpan = $child.find("span[itemprop='children']");
        addParentClassIfNotActive($cSpan, motherClass);
      } catch (e) {}
    }
  });

  // Also apply parent-specific classes to children so they inherit the same colored border
  $("#childrenList li").each(function () {
    const $c = $(this);
    const cFather = String($c.attr("data-father") || "");
    const cMother = String($c.attr("data-mother") || "");
    if (fatherID && cFather === fatherID) addParentClassIfNotActive($c, fatherClass);
    if (motherID && cMother === motherID) addParentClassIfNotActive($c, motherClass);
    try {
      const $span = $c.find("span[itemprop='children']");
      if ($span.length) {
        if (fatherID && cFather === fatherID) addParentClassIfNotActive($span, fatherClass);
        if (motherID && cMother === motherID) addParentClassIfNotActive($span, motherClass);
      }
    } catch (e) {}
  });

  // If there are multiple .spouse elements, assign them spouse_1, spouse_2, etc.
  if ($("#nVitals .spouse").length > 1) {
    $("#nVitals .spouse").each(function (index) {
      $(this).addClass("spouse_" + (index + 1));
    });
  }
}

/**
 * Moves the family lists to a different part of the page based on options.
 */
function moveFamilyLists() {
  try {
    const width = window.innerWidth;
    const t0 = performance.now();
    const $nVitals = $("#nVitals");
    if (!$nVitals.length) {
      if (DEBUG_FAMILY_LISTS) console.warn("[changeFamilyLists] moveFamilyLists: #nVitals not found.");
      return;
    }
    const sidebarHeading = $nVitals.find(".sidebar-heading");
    if (DEBUG_FAMILY_LISTS)
      console.log("[changeFamilyLists] moveFamilyLists: start", {
        width,
        moveToRightOption: options?.moveToRight,
        showSidebarHeading: options?.showSidebarHeading,
        familyListPosition: options?.familyListPosition,
        isVertical: $nVitals.hasClass("vertical"),
      });

    if (width < 992) {
      if (DEBUG_FAMILY_LISTS) console.log("[changeFamilyLists] Using mobile layout (width < 992)");
      sidebarHeading.hide();
      $nVitals.removeClass("row").appendTo(treePersonBit);
      if (DEBUG_FAMILY_LISTS) console.log("[changeFamilyLists] Appended #nVitals back to treePersonBit (mobile)");
    } else if (options.moveToRight) {
      if (DEBUG_FAMILY_LISTS) console.log("[changeFamilyLists] Using desktop right-column layout");
      $("body").addClass("familyListsRight");
      if (options.showSidebarHeading) {
        sidebarHeading.show();
        if (DEBUG_FAMILY_LISTS) console.log("[changeFamilyLists] Sidebar heading shown");
      } else {
        sidebarHeading.hide();
        if (DEBUG_FAMILY_LISTS) console.log("[changeFamilyLists] Sidebar heading hidden (option disabled)");
      }
      $nVitals.addClass("row");

      let $before;
      if (options.familyListPosition === "beforeManager") {
        $before = $(".col-lg-4 #Profile-Data");
        if (DEBUG_FAMILY_LISTS)
          console.log("[changeFamilyLists] Target position: beforeManager", { found: !!$before.length });
      } else if (options.familyListPosition === "beforePhotos") {
        $before = $(".col-lg-4 #Photos");
        if (DEBUG_FAMILY_LISTS)
          console.log("[changeFamilyLists] Target position: beforePhotos", { found: !!$before.length });
      }

      if (!$before?.length) {
        $before = $("#DNA-Connections");
        if ($before.length) {
          console.log("[changeFamilyLists] Fallback target: #DNA-Connections");
        } else {
          $before = $(".col-lg-4 #Research");
          if ($before.length) {
            console.log("[changeFamilyLists] Second fallback target: #Research");
          }
        }
      }

      if ($before.length) {
        $nVitals.insertBefore($before);
        if (DEBUG_FAMILY_LISTS)
          console.log("[changeFamilyLists] Inserted #nVitals before target", { targetId: $before.attr("id") });
      } else if ($(".col-lg-4 #Profile-Data").length) {
        $nVitals.insertAfter($(".col-lg-4 #Profile-Data"));
        if (DEBUG_FAMILY_LISTS)
          console.log("[changeFamilyLists] Inserted #nVitals after #Profile-Data (final fallback)");
      } else {
        if (DEBUG_FAMILY_LISTS)
          console.warn("[changeFamilyLists] No suitable insertion point found; leaving in place.");
      }
    } else {
      if (DEBUG_FAMILY_LISTS)
        console.log("[changeFamilyLists] moveToRight option disabled; no action for desktop width.");
    }
    if (DEBUG_FAMILY_LISTS)
      console.log("[changeFamilyLists] moveFamilyLists: done", {
        elapsedMs: (performance.now() - t0).toFixed(1),
      });
  } catch (e) {
    if (DEBUG_FAMILY_LISTS) console.error("[changeFamilyLists] moveFamilyLists error:", e);
  }
}

/**
 * Changes the headers based on the toggle state.
 */
export function changeFamilyHeaders(setIt = false) {
  if (setIt == "Y") {
    useAltHeadings = false;
  } else if (setIt == "N") {
    useAltHeadings = true;
  } else {
    useAltHeadings = !useAltHeadings;
  }
  const ofText = $("#nVitals").hasClass("vanilla") ? "of" : "of:";
  const headings = [
    {
      sel: "#parentsHeader",
      alt: "Parents: ",
      male: `Son ${ofText} `,
      female: `Daughter ${ofText} `,
      neutral: `Child ${ofText} `,
    },
    {
      sel: "#siblingsHeader",
      alt: "Siblings: ",
      male: `Brother ${ofText} `,
      female: `Sister ${ofText} `,
      neutral: `Sibling ${ofText} `,
    },
    {
      sel: "#spousesHeader",
      alt: "Spouses: ",
      male: `Husband ${ofText} `,
      female: `Wife ${ofText} `,
      neutral: `Spouse ${ofText} `,
    },
    {
      sel: "#childrenHeader",
      alt: "Children: ",
      male: `Father ${ofText} `,
      female: `Mother ${ofText} `,
      neutral: `Parent ${ofText} `,
    },
    {
      sel: "#bioParentsHeader",
      alt: "Biological Parents: ",
      male: `Biological son ${ofText} `,
      female: `Biological daughter ${ofText} `,
      neutral: `Biological child ${ofText} `,
    },
  ];
  const p = getPerson(profilePerson.Id) || profilePerson;
  if (!p.Gender) {
    p.Gender = profilePerson.Gender;
  }
  let gen = "neutral";
  if (p?.Gender === "Male") {
    gen = "male";
  } else if (p?.Gender === "Female") {
    gen = "female";
  }
  headings.forEach((obj) => {
    const el = document.querySelector(obj.sel);
    if (!el) return;
    // Special-case bioParents to use singular 'Parent' when only one exists
    if (obj.sel === "#bioParentsHeader") {
      const count = document.querySelectorAll("#bioParentList li").length;
      obj.alt = count === 1 ? "Biological Parent: " : "Biological Parents: ";
    }
    if (useAltHeadings) {
      el.textContent = gen === "male" ? obj.male : gen === "female" ? obj.female : obj.neutral;
    } else {
      el.textContent = obj.alt;
    }
  });
  if (!setIt) {
    getFeatureOptions("changeFamilyLists").then((optionsData) => {
      optionsData.changeHeaders = !useAltHeadings;
      const storageName = "changeFamilyLists_options";
      chrome.storage.sync.set({
        [storageName]: optionsData,
      });
    });
  }
}

/**
 * Attaches click event handlers to header elements.
 */
function attachHeadingEvents() {
  const headingIds = ["parentsHeader", "siblingsHeader", "spousesHeader", "childrenHeader", "bioParentsHeader"];
  headingIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", () => {
      changeFamilyHeaders();
    });
  });
}

/**
 * Inserts the profile person into the sibling list based on birth year.
 */
function insertInSibList() {
  if (!window.people) {
    console.log("No API people data available.");
    return;
  }
  let pPerson = getPerson(profilePerson.Id) || profilePerson;
  if (!pPerson) {
    console.log("Profile person data is missing.");
    return;
  }

  const getBirthYear = (person) => {
    if (person.BirthDate && person.BirthDate !== "0000-00-00") {
      if (person.BirthDate.match(/s$/)) {
        const yr = parseInt(person.BirthDate);
        return isNaN(yr) ? null : yr + 5;
      } else {
        return parseInt(person.BirthDate.split("-")[0]);
      }
    } else if (person.UnknownText) {
      const match = person.UnknownText.match(/\(([^)]+)\)/);
      if (match) {
        const parts = match[1].split(/\s*-\s*/);
        if (parts.length > 0) {
          let b = parts[0].trim();
          if (b.match(/s$/)) {
            const yr = parseInt(b);
            return isNaN(yr) ? null : yr + 5;
          } else {
            return parseInt(b);
          }
        }
      }
    } else if (person.BirthDateDecade) {
      const yr = parseInt(person.BirthDateDecade);
      return isNaN(yr) ? null : yr + 5;
    }
    return null;
  };

  const profileBirthYear = getBirthYear(pPerson);
  const birthYear = profileBirthYear;
  const deathYear =
    pPerson.DeathDate && pPerson.DeathDate !== "0000-00-00"
      ? pPerson.DeathDate.match(/s$/)
        ? parseInt(pPerson.DeathDate) + 5
        : parseInt(pPerson.DeathDate.split("-")[0])
      : pPerson.DeathDateDecade
      ? parseInt(pPerson.DeathDateDecade) + 5
      : null;

  const fatherId = pPerson.Father;
  const motherId = pPerson.Mother;

  let parentClasses = "";
  // Are there any siblings with different parents?
  const siblings = $("#siblingList li");
  const diffFather = siblings.filter(function () {
    return $(this).data("father") !== fatherId;
  });
  const diffMother = siblings.filter(function () {
    return $(this).data("mother") !== motherId;
  });
  if (diffMother.length || diffFather.length) {
    if (pPerson.Father) {
      parentClasses += "parent_1 ";
    }
    if (pPerson.Mother) {
      parentClasses += "parent_2";
    }
  }

  let inserter = $(`
      <span itemprop="sibling" itemtype="http://schema.org/Person" data-private="0"><a href="#n" class="activeProfile" data-wtid="${
        pPerson.Name
      }">${displayName(pPerson)[0]}</a><span class="bdDates" data-birth-year="${birthYear || ""}" data-death-year="${
    deathYear || ""
  }"> ${displayDates(pPerson).trim().replace(/ - /, "–")}</span></span>`);

  const profilePersonLi = $(`<li id='profilePerson'></li>`);
  let elToFind = "#Siblings li";
  let closestEl = "li";
  if (options && options.verticalLists) {
    profilePersonLi.append(inserter);
    inserter = profilePersonLi;
  } else {
    elToFind = "#Siblings span[itemprop='sibling']";
    closestEl = "span[itemprop='sibling']";
  }

  let apiSiblings = [...window.people.values()]
    .filter((p) => p.Id !== pPerson.Id)
    .map((p) => {
      if (!p.Name && p.UnknownText) {
        p.Name = p.UnknownText;
      }
      const sibBirthYear = getBirthYear(p);
      return {
        element: $(`${elToFind} a[href$="${p.Name}"]`).closest(closestEl),
        birthYear: sibBirthYear,
        id: p.Id,
      };
    })
    .filter((s) => s.element.length && s.birthYear !== null);

  let domSiblings = [];
  $("#siblingList li").each(function () {
    let $li = $(this);
    let bdYear = $li.find(".bdDates").attr("data-birth-year");
    let sibBirthYear = null;
    if (bdYear) {
      if (bdYear.match(/s$/)) {
        let yr = parseInt(bdYear);
        sibBirthYear = isNaN(yr) ? null : yr + 5;
      } else {
        sibBirthYear = parseInt(bdYear.split("-")[0]);
      }
    }
    if (sibBirthYear !== null) {
      domSiblings.push({ element: $li, birthYear: sibBirthYear, id: $li.data("parseName") });
    }
  });

  let siblingList = apiSiblings.length > 0 ? apiSiblings : domSiblings;
  siblingList.sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999));

  let inserted = false;
  for (let i = 0; i < siblingList.length; i++) {
    if (birthYear !== null && siblingList[i].birthYear !== null) {
      if (birthYear < siblingList[i].birthYear) {
        inserter.insertBefore(siblingList[i].element);
        inserted = true;
        break;
      }
    }
  }
  if (!inserted) {
    $("#siblingList").append(inserter);
  }
  if ($(".parent_1").length) {
    // Avoid adding parent classes to the profile person (activeProfile)
    $("#profilePerson span[itemprop='sibling']")
      .filter(function () {
        return $(this).find(".activeProfile").length === 0 && !$(this).hasClass("activeProfile");
      })
      .addClass("parent_1");
  }
  if ($(".parent_2").length) {
    $("#profilePerson")
      .filter(function () {
        return $(this).find(".activeProfile").length === 0 && !$(this).hasClass("activeProfile");
      })
      .addClass("parent_2");
  }
  if (pPerson?.Gender) {
    const genderLabel = pPerson.Gender === "Male" ? "male" : pPerson.Gender === "Female" ? "female" : "";
    const ariaLabel = genderLabel ? `profile person (${genderLabel})` : "profile person";
    $("#profilePerson").attr("data-gender", genderLabel).attr("aria-label", ariaLabel);
  }
  $("#addSibling").appendTo($("#addSibling").parent());
}

/**
 * Adds an "ancestor" CSS class and title attribute to the given element.
 * @param {jQuery|HTMLElement} element - The element to modify.
 */
function addAncestorLabels(element) {
  $(element).addClass("ancestor");
  $(element).attr("title", "Ancestor");
}

/**
 * Retrieves ancestor WikiTree IDs from the relationship database and highlights ancestors on the page.
 * @returns {Promise<string[]>} A promise that resolves with an array of ancestor WikiTree IDs.
 */
async function getAncestorsOnPage() {
  const storeName = RELATIONSHIP_STORE_NAME;
  // initRelationshipDB only signals success; if the DB never opens (seen in Safari),
  // give up after a few seconds and fall through with no keys so the
  // relationship-text fallback below still gets a chance to run.
  const dbPromise = new Promise((resolve) => {
    initRelationshipDB((event) => resolve(event.target.result));
    setTimeout(() => resolve(null), 3000);
  });
  const db = await dbPromise;
  let ancestorKeys = [];
  if (db) {
    ancestorKeys = await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const allItemsRequest = store.getAll();
      allItemsRequest.onsuccess = () => {
        const items = allItemsRequest.result;
        resolve(
          items
            .filter((item) => {
              const relationship = item?.relationship?.toLowerCase();
              if (!relationship) return false;
              return relationship.match(/father|mother/i) != null && item.userId === user;
            })
            .map((item) => item.id)
        );
      };
      allItemsRequest.onerror = (event) => reject(event.target.error);
    });
  }
  const familyLinks = $(".VITALS a[href*='/wiki/']");
  const peopleOnPage = familyLinks
    .map(function () {
      const link = $(this);
      const href = link.attr("href");
      if (href) {
        const wtid = href.split("/").pop();
        return wtid;
      }
    })
    .get();
  peopleOnPage.push(profilePerson.Name);
  const ancestorsOnPage = peopleOnPage.filter((person) => {
    const personWithUnderscores = person.replace(/ /g, "_");
    const personWithSpaces = person.replace(/_/g, " ");
    return ancestorKeys.includes(personWithUnderscores) || ancestorKeys.includes(personWithSpaces);
  });
  ancestorsOnPage.forEach((ancestor) => {
    const element = $(
      `#nVitals .VITALS a[href$="/wiki/${ancestor.replace(/ /g, "_")}"],
       #nVitals .VITALS a[data-wtid="${ancestor.replace(/ /g, "_")}"],
       #nVitals .VITALS a[href$="/wiki/${ancestor.replace(/_/g, " ")}"],
       #nVitals .VITALS a[data-wtid="${ancestor.replace(/_/g, " ")}"]`
    );
    if (element.length && element.data("status") != 5) {
      addAncestorLabels(element);
    }
  });
  if (
    ancestorsOnPage.includes(profilePerson.Name) ||
    // Distance and Relationship renders this element with a class (the id was dropped
    // in March 2025 to avoid duplicate ids), so match on the class
    $(".yourRelationshipText")
      .text()
      ?.match(/father|mother/)
  ) {
    const fatherElement = $(`#nVitals .VITALS span[itemprop="Father"] a[aria-label="Parent"]`);
    const motherElement = $(`#nVitals .VITALS span[itemprop="Mother"] a[aria-label="Parent"]`);
    if (fatherElement.length && fatherElement.data("status") != 5) {
      addAncestorLabels(fatherElement);
    }
    if (motherElement.length && motherElement.data("status") != 5) {
      addAncestorLabels(motherElement);
    }
    if ($("#childrenList").length && $("#childrenList").find("a.ancestor").length == 0) {
      const connectionName = await getAncestorConnection(profilePerson.Name, user);
      if (connectionName) {
        const connectionElement = $(
          `#nVitals .VITALS a[href$="/wiki/${connectionName.replace(/ /g, "_")}"],
           #nVitals .VITALS a[data-wtid="${connectionName.replace(/ /g, "_")}"],
           #nVitals .VITALS a[href$="/wiki/${connectionName.replace(/_/g, " ")}"],
           #nVitals .VITALS a[data-wtid="${connectionName.replace(/_/g, " ")}"]`
        );
        if (connectionElement.length) {
          addAncestorLabels(connectionElement);
        }
      }
    }
    if ($("#childrenList a.ancestor").length && $(".spouseDetails a.ancestor").length == 0) {
      const connectionElement = $("#childrenList a.ancestor");
      const thisClass = connectionElement.closest("li").attr("class");
      const spouseClass = thisClass?.split(" ").find((c) => c.startsWith("spouse_"));
      if (spouseClass) {
        const spouseA = $(`.spouseDetails.${spouseClass} span a.spouseLink`);
        if (spouseA.length) {
          addAncestorLabels(spouseA);
        }
      } else {
        const spouseA = $(`a.spouseLink`);
        if (spouseA.length) {
          addAncestorLabels(spouseA);
        }
      }
    }
  } else if ($("#siblingList a.ancestor").length) {
    const closestLi = $("#siblingList a.ancestor").closest("li");
    const fatherId = closestLi.data("father");
    const motherId = closestLi.data("mother");
    const fatherElement = $(`#nVitals .VITALS li[data-id="${fatherId}"] a`);
    const motherElement = $(`#nVitals .VITALS li[data-id="${motherId}"] a`);
    if (fatherElement.length && fatherElement.data("status") != 5) {
      addAncestorLabels(fatherElement);
    }
    if (motherElement.length && motherElement.data("status") != 5) {
      addAncestorLabels(motherElement);
    }
  }
  return ancestorsOnPage.map((a) => a.Name);
}

/**
 * Retrieves an ancestor connection from the WT+ API.
 * @param {string} ancestor - The ancestor WikiTree ID.
 * @param {string|number} user - The current user ID.
 * @returns {Promise<string|undefined>} A promise that resolves with the connection WikiTree ID.
 */
async function getAncestorConnection(ancestor, user) {
  const url = `https://plus.wikitree.com/function/WTPath/Path.htm?WikiTreeID1=${ancestor}&WikiTreeID2=${user}&relatives=1&appID=WBE-ancestorConnection`;
  return fetch(url)
    .then((response) => response.text())
    .then((html) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const table = doc.querySelector("table");
      const rows = table.querySelectorAll("tr");
      const ancestorLink = rows[2].querySelector("td:nth-child(2) a");
      if (ancestorLink) {
        return ancestorLink.href.split("/").pop();
      }
    });
}

/**
 * Adds sibling and child counts to the DOM.
 */
function addChildrenSiblingCount() {
  const isLiving = pagePerson?.IsLiving;
  const hasHad = isLiving ? "has" : "had";
  if ($("#childrenCount").length === 0) {
    const nVitals = $("#nVitals");
    const siblingCount = countItems(nVitals.find("span[itemprop='sibling']"));
    nVitals
      .find("#siblingDetails")
      .append(
        $(
          `<span id="siblingCount" class="familyCount" title="${
            profilePerson.FirstName
          } ${hasHad} ${siblingCount} sibling${siblingCount !== 1 ? "s" : ""}">[${siblingCount}].</span>`
        )
      );
    const childrenCount = countItems(nVitals.find("span[itemprop='children']"));
    nVitals
      .find("#childrenDetails")
      .append(
        $(
          `<span id="childrenCount" class="familyCount" title="${
            profilePerson.FirstName
          } ${hasHad} ${childrenCount} child${childrenCount !== 1 ? "ren" : ""}">[${childrenCount}].</span>`
        )
      );
  }
}

/**
 * Counts the number of elements that do not contain "?" or "unknown" in their text.
 * @param {jQuery} elements - A jQuery collection of elements.
 * @returns {number} The count of valid items.
 */
function countItems(elements) {
  let count = 0;
  elements.each(function () {
    const text = $(this).text();
    if (!/\?|\bunknown\b/.test(text) && !$(this).find(".activeProfile").length) {
      count++;
    }
  });
  return count;
}

/**
 * Formats list items by inserting commas and the word "and" appropriately.
 * @param {string} selector - The CSS selector for the list items.
 * @param {string} [position="outside"] - Where to place the comma ("inside" or "outside").
 */
function formatListItems(selector, position = "outside") {
  const items = Array.from(document.querySelectorAll(selector));
  const count = items.length;
  if (count <= 1) return;
  if (count === 2) {
    const second = items[1];
    if (
      !second.firstChild ||
      second.firstChild.nodeType !== Node.TEXT_NODE ||
      !second.firstChild.textContent.trim().startsWith(" and ")
    ) {
      second.insertAdjacentText("afterbegin", " and ");
    }
  } else {
    items.slice(0, count - 1).forEach((item) => {
      if (position === "inside") {
        if (
          !item.lastChild ||
          item.lastChild.nodeType !== Node.TEXT_NODE ||
          !item.lastChild.textContent.includes(",")
        ) {
          item.insertAdjacentText("beforeend", ", ");
        }
      } else {
        if (
          !item.nextSibling ||
          item.nextSibling.nodeType !== Node.TEXT_NODE ||
          !item.nextSibling.textContent.includes(",")
        ) {
          item.insertAdjacentText("afterend", ", ");
        }
      }
    });
    const last = items[count - 1];
    if (
      !last.firstChild ||
      last.firstChild.nodeType !== Node.TEXT_NODE ||
      !last.firstChild.textContent.trim().startsWith(" and ")
    ) {
      last.insertAdjacentText("afterbegin", " and ");
    }
  }
}

/**
 * Makes adjustments for the vanilla layout (non-vertical).
 */
function fixVanilla() {
  const $nVitals = $("#nVitals");
  $nVitals.find("span.clickable").each(function () {
    const $header = $(this);
    const headerText = $header.text();
    if (headerText.includes("of:")) {
      $header.text(headerText.replace(":", ""));
    }
  });
  // Format lists separately per section to avoid cross-section 'and' insertion
  formatListItems(
    "#nVitals #parentList span[itemprop='parent'],#nVitals #parentList span[itemprop='Father'],#nVitals #parentList span[itemprop='Mother']"
  );
  formatListItems("#nVitals #bioParentList span[itemprop='parent']");
  formatListItems("#nVitals #siblingList span[itemprop='sibling']");
  formatListItems("#nVitals #childrenList span[itemprop='children']");
  formatListItems("#nVitals li.spouse", "inside");
}

function moveMetaGender() {
  const vitalsElement = document.querySelector(".tree-person p.VITALS");
  if (vitalsElement && !vitalsElement.querySelector('meta[itemprop="gender"]')) {
    const genderMeta = $("meta[itemprop='gender']").eq(0);
    vitalsElement.append(genderMeta);
  }
}

function addDNAConfirmedToFamily() {
  if (!window.people || !(window.people instanceof Map)) {
    if (DEBUG_FAMILY_LISTS) console.warn("window.people is not a Map or is missing.");
    return;
  }

  const dnaStatuses = new Set(["30", "40", "50"]);
  const isDNAStatus = (val) => val && dnaStatuses.has(String(val));

  const parentId = profilePersonData?.Id;
  const parentPerson = window.people.get(String(parentId));

  if (!parentPerson) {
    if (DEBUG_FAMILY_LISTS) console.warn(`No person found in window.people for ID: ${parentId}`);
    return;
  }

  for (const person of window.people.values()) {
    let addDNAconfirmed = false;

    const isMother = person.Mother == parentId || person.BioMother == parentId;
    const isFather = person.Father == parentId || person.BioFather == parentId;
    const isBioParentView = person.BioMother == parentId || person.BioFather == parentId;

    const motherStatus = person.DataStatus?.BioMother ?? person.DataStatus?.Mother;
    const fatherStatus = person.DataStatus?.BioFather ?? person.DataStatus?.Father;

    if (isMother && motherStatus == "30") {
      addDNAconfirmed = true;
    } else if (isFather && fatherStatus == "30") {
      addDNAconfirmed = true;
    }

    if (DEBUG_FAMILY_LISTS) {
      try {
        console.log("[CFL] person check:", {
          Id: person.Id,
          Name: person.Name,
          Father: person.Father,
          Mother: person.Mother,
          BioFather: person.BioFather,
          BioMother: person.BioMother,
          DataStatus: person.DataStatus,
          isMother,
          isFather,
          isBioParentView,
          motherStatus,
          fatherStatus,
          addDNAconfirmed,
        });
      } catch (e) {
        console.warn("[CFL] person debug log error", e);
      }
    }

    const name = person.Name;
    const nameWithSpaces = name?.replace(/_/g, " ");
    const $links = $(`.VITALS a[href$="${name}"],.VITALS a[href$="${nameWithSpaces}"]`);

    if (isBioParentView && $links.length) {
      // Remove erroneous non-bio indicators when viewing the biological parent's profile.
      $links.find(".icon--dna-none").remove();
      $links.closest("li").removeAttr("data-bs-tooltip");
      $links
        .find(".dataStatus")
        .filter(function () {
          return $(this).children().length === 0;
        })
        .remove();
    }

    if (addDNAconfirmed && $links.length) {
      // Only append if there isn't already a DNA-checked icon present
      $links.each(function () {
        const $this = $(this);
        if ($this.find(".icon--dna-checked").length === 0) {
          $this.append(
            $(
              `<span class='icon--dna-checked wbe-icon' title='Confirmed with DNA testing' style='background-size:40px 20px !important; width:40px !important'></span>`
            )
          );
        }
      });
      // If we added a DNA badge for a child, drop redundant [biological] markers.
      $links.find(".biological").remove();
      $links.find("span:contains('[biological]')").each(function () {
        const txt = $(this)
          .text()
          .replace(/\[biological\]/i, "");
        $(this).text(txt);
      });
      if (DEBUG_FAMILY_LISTS) console.log(`[CFL] added DNA badge to links for ${name || person.Name}`);
    }
  }

  // Add DNA badge to BioFather/BioMother entries for the profile when confirmed.
  const parentTargets = [
    {
      id: profilePersonData?.BioFather,
      status:
        parentPerson?.DataStatus?.BioFather ??
        (profilePersonData?.BioFather && profilePersonData?.BioFather === profilePersonData?.Father
          ? parentPerson?.DataStatus?.Father
          : undefined),
      fallbackIcon: nativeParentDNA.BioFather,
      selectorFallback: "#BioFather a[itemprop='url']",
      label: "BioFather",
    },
    {
      id: profilePersonData?.BioMother,
      status:
        parentPerson?.DataStatus?.BioMother ??
        (profilePersonData?.BioMother && profilePersonData?.BioMother === profilePersonData?.Mother
          ? parentPerson?.DataStatus?.Mother
          : undefined),
      fallbackIcon: nativeParentDNA.BioMother,
      selectorFallback: "#BioMother a[itemprop='url']",
      label: "BioMother",
    },
  ];

  if (DEBUG_FAMILY_LISTS) {
    console.log("[CFL] DNA debug -> parentTargets", parentTargets);
    console.log(
      "[CFL] profilePersonData",
      profilePersonData
        ? { Id: profilePersonData.Id, Name: profilePersonData.Name, DataStatus: profilePersonData.DataStatus }
        : null
    );
    console.log(
      "[CFL] window.people sample",
      Array.from(window.people.values()).map((p) => ({
        Id: p.Id,
        Name: p.Name,
        BioFather: p.BioFather,
        BioMother: p.BioMother,
        DataStatus: p.DataStatus,
      }))
    );
  }

  parentTargets.forEach((p) => {
    const parObj = p.id ? getPerson(p.id) : null;
    const name = parObj?.Name || p.id;
    const nameWithSpaces = name?.replace(/_/g, " ");
    let $links = name ? $(`.VITALS a[href$="${name}"],.VITALS a[href$="${nameWithSpaces}"]`) : $();
    if (!$links.length && p.selectorFallback) {
      $links = $(p.selectorFallback);
    }
    const dnaNeeded = isDNAStatus(p.status) || p.fallbackIcon;
    if (DEBUG_FAMILY_LISTS) {
      console.log("[CFL] parent target:", {
        label: p.label,
        id: p.id,
        parObj: parObj ? { Id: parObj.Id, Name: parObj.Name, DataStatus: parObj.DataStatus } : null,
        status: p.status,
        fallbackIcon: p.fallbackIcon,
        selectorFallback: p.selectorFallback,
        name,
        linksFound: $links.length,
        dnaNeeded,
      });
    }
    // If we don't have an explicit id/name match but DataStatus indicates DNA, try positional DOM fallbacks
    if (!dnaNeeded) return;
    if (!$links.length && !p.id) {
      try {
        const idx = p.label === "BioFather" ? 0 : 1;
        const $bioLi = $("#bioParentList li").eq(idx);
        if ($bioLi.length) {
          const $a = $bioLi.find("a");
          if ($a.length) {
            $links = $a;
            if (DEBUG_FAMILY_LISTS) console.log(`[CFL] fallback found via #bioParentList for ${p.label}`);
          }
        }
        if (!$links.length) {
          const $parentLi = $("#parentList li").eq(idx);
          if ($parentLi.length) {
            const $a2 = $parentLi.find("a");
            if ($a2.length) {
              $links = $a2;
              if (DEBUG_FAMILY_LISTS) console.log(`[CFL] fallback found via #parentList for ${p.label}`);
            }
          }
        }
      } catch (e) {
        if (DEBUG_FAMILY_LISTS) console.warn("[CFL] parent fallback error", e);
      }
    }
    if (!$links.length) return;
    // Append only if no existing dna-checked icon is present
    $links.each(function () {
      const $this = $(this);
      if ($this.find(".icon--dna-checked").length === 0) {
        $this.append(
          $(
            `<span class='icon--dna-checked wbe-icon' title='Confirmed with DNA testing' style='background-size:40px 20px !important; width:40px !important'></span>`
          )
        );
      }
    });
    if (DEBUG_FAMILY_LISTS) console.log(`[CFL] added DNA badge to parent ${p.label} (${name})`);
  });
  // Cleanup: ensure no anchor has more than one DNA-checked icon
  try {
    $("#nVitals a").each(function () {
      const $a = $(this);
      const icons = $a.find(".icon--dna-checked");
      if (icons.length > 1) {
        icons.slice(1).remove();
      }
    });
  } catch (e) {
    if (DEBUG_FAMILY_LISTS) console.warn("[CFL] cleanup duplicate DNA icons error", e);
  }
}

/**
 * Reconcile children list DOM with API data in window.people.
 * Ensures data-id/data-father/data-mother are set and updates DNA icons
 * based on each child's DataStatus relative to the profile person.
 */
function reconcileChildrenWithAPI() {
  if (!window.people || !profilePersonData) return;
  try {
    // Derive parent IDs from the rendered parent list as a fallback when profilePersonData is not set
    let domFatherId = null;
    let domMotherId = null;
    try {
      const $fatherLi = $("#parentList li").filter('[data-gender="Male"]').first();
      const $motherLi = $("#parentList li").filter('[data-gender="Female"]').first();
      if ($fatherLi.length) domFatherId = $fatherLi.attr("data-id");
      if ($motherLi.length) domMotherId = $motherLi.attr("data-id");
    } catch (e) {
      if (DEBUG_FAMILY_LISTS) console.warn("[CFL] derive parent ids error", e);
    }

    $("#childrenList li").each(function () {
      const $li = $(this);
      let personObj = null;
      const liId = $li.attr("data-id");
      if (liId && window.people.has(String(liId))) {
        personObj = window.people.get(String(liId));
      }
      if (!personObj) {
        const $a = $li.find("a[itemprop='url'], a.childLink").first();
        const href = $a.attr("href") || "";
        let wtName = null;
        const m = href.match(/\/wiki\/([^#?]+)/);
        if (m) wtName = m[1];
        if (wtName && window.peopleByWtID && window.peopleByWtID.has(wtName)) {
          personObj = window.peopleByWtID.get(wtName);
        }
        if (!personObj) {
          const linkText = $a.text().trim();
          personObj = Array.from(window.people.values()).find(
            (p) =>
              (p.FullName && linkText.includes((p.FullName || "").replace(/_/g, " "))) ||
              (p.Name && linkText.includes((p.Name || "").replace(/_/g, " ")))
          );
        }
      }
      if (!personObj) return;
      // set canonical ids on li
      $li.attr("data-id", personObj.Id);
      if (personObj.Father) $li.attr("data-father", personObj.Father);
      if (personObj.Mother) $li.attr("data-mother", personObj.Mother);

      const fatherConfirmed = personObj.DataStatus?.BioFather === "30" || personObj.DataStatus?.Father === "30";
      const motherConfirmed = personObj.DataStatus?.BioMother === "30" || personObj.DataStatus?.Mother === "30";

      // Determine whether parent in DOM corresponds to this child's father/mother
      const childFatherId = personObj.BioFather || personObj.Father;
      const childMotherId = personObj.BioMother || personObj.Mother;

      // If DOM has father and child's DataStatus shows confirmed to that father, show checked icon
      if (domFatherId && String(childFatherId) === String(domFatherId) && fatherConfirmed) {
        $li.find(".icon--dna-none").remove();
        if ($li.find(".icon--dna-checked").length === 0) {
          $li
            .find("a")
            .append(
              `<span class='icon--dna-checked wbe-icon' title='Confirmed with DNA testing' style='background-size:40px 20px !important; width:40px !important'></span>`
            );
        }
      }
      // If DOM has mother and child's DataStatus shows confirmed to that mother, show checked icon
      if (domMotherId && String(childMotherId) === String(domMotherId) && motherConfirmed) {
        $li.find(".icon--dna-none").remove();
        if ($li.find(".icon--dna-checked").length === 0) {
          $li
            .find("a")
            .append(
              `<span class='icon--dna-checked wbe-icon' title='Confirmed with DNA testing' style='background-size:40px 20px !important; width:40px !important'></span>`
            );
        }
      }
      // If child's DataStatus explicitly indicates BioFather or BioMother confirmed, add badge regardless
      try {
        if (personObj.DataStatus?.BioFather === "30") {
          if ($li.find(".icon--dna-checked").length === 0) {
            $li.find(".icon--dna-none").remove();
            $li
              .find("a")
              .append(
                `<span class='icon--dna-checked wbe-icon' title='Confirmed with DNA testing' style='background-size:40px 20px !important; width:40px !important'></span>`
              );
            if (DEBUG_FAMILY_LISTS)
              console.log(
                `[CFL] reconcileChildrenWithAPI: added BioFather DNA badge for ${personObj.Name || personObj.Id}`
              );
          }
        }
        if (personObj.DataStatus?.BioMother === "30") {
          if ($li.find(".icon--dna-checked").length === 0) {
            $li.find(".icon--dna-none").remove();
            $li
              .find("a")
              .append(
                `<span class='icon--dna-checked wbe-icon' title='Confirmed with DNA testing' style='background-size:40px 20px !important; width:40px !important'></span>`
              );
            if (DEBUG_FAMILY_LISTS)
              console.log(
                `[CFL] reconcileChildrenWithAPI: added BioMother DNA badge for ${personObj.Name || personObj.Id}`
              );
          }
        }
      } catch (e) {
        if (DEBUG_FAMILY_LISTS) console.warn("[CFL] reconcileChildrenWithAPI add explicit Bio badge error", e);
      }
    });
    if (DEBUG_FAMILY_LISTS) console.log("[CFL] reconcileChildrenWithAPI: completed");
  } catch (e) {
    if (DEBUG_FAMILY_LISTS) console.warn("[CFL] reconcileChildrenWithAPI error", e);
  }
}

/* ========================================================================
   Main Hook: Initialize, Replace DOM, and Attach Events
   ======================================================================== */
let pagePerson;
shouldInitializeFeature("changeFamilyLists").then(async (result) => {
  if (!result) {
    // parseSiblings();
    return;
  }

  options = await getFeatureOptions("changeFamilyLists");
  if (isProfileAddRelative && options.addNotEdit) {
    autoClickAddPersonOptions();

    return;
  }

  const treePerson = $("#Family-pane div.tree--person");

  let newVitals;
  let familyData;
  try {
    // Only rejected first-load API requests should abort before we touch the native family DOM.
    const hasApiPeople = await getWindowPeople();
    if (!hasApiPeople) {
      console.warn("[CFL] Proceeding without apps server people data.");
    }

    pencils = getInitialPencils();
    captureNativeParentDNA();
    familyData = parseInitialData();
    if (DEBUG_FAMILY_LISTS) console.log("Family data:", familyData);

    newVitals = buildFamilyListsFromData(familyData);
  } catch (error) {
    const errorType = isLikelyFamilyListApiAccessError(error)
      ? "likely CORS/network error"
      : "API initialization error";
    console.warn(`[CFL] Leaving native family lists in place due to ${errorType}.`, error);
    return;
  }

  moveMetaGender();
  // Retain only the first .VITALS element.
  treePerson.children().not(":first").remove();
  treePersonBit.append(newVitals);
  attachApiData();
  window.excludeValues = ["", null, "null", "0000-00-00", "unknown", "undefined", undefined, NaN, "NaN"];

  if (options.moveToRight) {
    moveFamilyLists();
  }
  if (options.verticalLists) {
    $("#nVitals").addClass("vertical");
    $("body").addClass("verticalLists");
    makeVerticalFamLists();
  } else {
    $("#nVitals,div.tree--person").addClass("vanilla");
    if (!options.showDates) {
      $("#nVitals").addClass("noDates");
    }
  }
  attachHeadingEvents();
  if (options.moveToRight) {
    window.addEventListener("resize", moveFamilyLists);
  }
  if (options.ageDifferences || options.parentAges) {
    addRelativeAges();
  }
  if (options.agesAtMarriages) {
    addMarriageAges();
  }

  if (options.addNotEdit) {
    changeNativeEditLinks();
  }

  pagePerson = getPerson(profilePerson.Id);
  let isPrivate = false;
  if (!pagePerson?.Name) {
    isPrivate = true;
  }
  if (
    !isPrivate &&
    $("li#profilePerson").length === 0 &&
    familyData.siblings &&
    familyData.siblings.length &&
    familyData.siblings[0].FullName &&
    options.addProfilePersonToSiblingList
  ) {
    insertInSibList();
  }
  if (!options.verticalLists) {
    fixVanilla();
    if (options.siblingAndChildCount) {
      addChildrenSiblingCount();
    }
  } else {
    $("#siblingList, #childrenList, #spouseList").each(function () {
      // Count actual people by excluding "?" and "edit" entries
      const count = $(this).find("li").length;
      // Find any items with a ? or 'edit' in the text
      const unknown = $(this).find("li:contains('?'), li:contains('edit')").length;
      const realCount = count - unknown;

      if (realCount > 1) {
        $(this).css("list-style", "number");
      }
    });
  }

  // Set the family relationship headers to the right option
  const setHeaders = options.changeHeaders ? "Y" : "N";
  changeFamilyHeaders(setHeaders);
  reconcileChildrenWithAPI();
  addDNAConfirmedToFamily();

  // Wait until Distance and Relationship feature has loaded (hopefully).
  // That feature's IndexedDB write has no completion signal we can await, and its
  // own latency varies a lot (async storage read, network fetch with legacy fallbacks).
  // A single fixed delay races against that and can lose in slower browsers (e.g. Safari),
  // so retry a few times instead of betting on one guess - each pass is a cheap, idempotent re-check.
  if (options.highlightAncestors) {
    [2000, 4000, 7000, 11000].forEach((delay) => {
      setTimeout(() => {
        getAncestorsOnPage().catch(console.error);
      }, delay);
    });
  }
});
