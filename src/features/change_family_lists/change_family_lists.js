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
import { initRelationshipDB, RELATIONSHIP_STORE_NAME } from "../distanceAndRelationship/distanceAndRelationship.js";
import { getProfilePersonInfo } from "../../core/common";
import { mainDomain } from "../../core/pageType";

let options;
const user = getUserWtId();
let familyData;
// Global variable to track the header toggle state.
let useAltHeadings = false;
const treePersonBit = $("#nav-familyContent #Family-pane div.tree--person");
const profilePerson = getProfilePersonInfo();
let profilePersonData;

const getPeopleFields =
  "BirthDate,BirthDateDecade,BirthLocation,BirthName,Connected,DataStatus,DeathDate,DeathDateDecade,DeathLocation," +
  "Derived.BirthNamePrivate,Derived.LongName,Derived.LongNamePrivate,Father,FirstName,Gender,Id,IsLiving," +
  "LastNameAtBirth,LastNameCurrent,LastNameOther,Manager,MiddleName,Mother,Name,Prefix,RealName,ShortName," +
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
    merge: false, // flag for mergeable records
    halfMarker: false, // contains the complete SMALL span containing [half], if present
  };
}

/**
 * Creates a new family data object.
 * @returns {Object} A family data object with empty arrays for each relationship.
 */
function newFamilyData() {
  return { parents: [], siblings: [], spouses: [], children: [] };
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
    const match = record.Link.match(/\/wiki\/([^#]+)/);
    if (match) {
      record.Name = match[1];
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
      const dateRange = inner.match(/\(([^)]+)\)/);
      if (dateRange) {
        const [b, d] = dateRange[1].split(/\s*-\s*/);
        record.BirthDate = b?.trim() || "";
        record.DeathDate = d?.trim() || "";
      }
      record.Name = inner.replace(/\s*\([^)]*\)/, "").trim();
    } else {
      record.Name = fullText;
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
  const dateRangeMatch = trimmed.match(/\(([^)]+)\)/);
  if (dateRangeMatch && dateRangeMatch[1] != "s") {
    const [b, d] = dateRangeMatch[1].split(/\s*-\s*/);
    record.BirthDate = b?.trim() || "";
    record.DeathDate = d?.trim() || "";
    record.Name = trimmed.replace(/\s*\([^)]*\)/, "").trim();
  } else {
    record.Name = trimmed;
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
      text === "[uncertain]"
    ) {
      return;
    }
    results.push(newPersonFromBracket(text, a.getAttribute("href") || ""));
  });
  let raw = blockEl.innerText;
  anchors.forEach((a) => {
    const t = a.textContent.trim();
    if (/^\[half\]$/i.test(t) || /^add\b/i.test(t) || /^edit\b/i.test(t)) {
      return;
    }
    raw = raw.replace(t, "");
  });
  const bracketRegex = /\[[^\]]*\]/g;
  const bracketed = raw.match(bracketRegex) || [];
  bracketed.forEach((b) => {
    if (/^\[half\]$/i.test(b) || /^add\b/i.test(b) || /^edit\b/i.test(b)) return;
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
function parseSpousesBlock(spousesEl) {
  const records = [];
  // Split the innerHTML by markers (e.g., "Husband of", "Wife of", etc.)
  const chunks = spousesEl.innerHTML.split(/(?:Husband|Wife|Spouse)\s+of/i);
  // Remove the first chunk (content before the first spouse).
  chunks.shift();
  chunks.forEach((chunk) => {
    const temp = document.createElement("div");
    temp.innerHTML = chunk;
    const spouseEl = temp.querySelector('[itemprop="spouse"]');
    if (spouseEl) {
      const rec = parseItempropElement(spouseEl);
      spouseEl.remove();
      let details = temp.textContent || "";
      details = details.replace(/\s{2,}/g, " ").trim();
      details = details.replace(/add\/edit spouses/gi, "").trim();
      rec.MarriageDetails = details;
      const mapLinkEl = temp.querySelector('a[href*="maps.google"]');
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
  const bracketed = parseBracketedUnknownInBlock(spousesEl).filter(
    (b) => b.Name && b.Name.trim() && !b.Link.startsWith("https://maps.google")
  );
  bracketed.forEach((b) => {
    if (!records.some((m) => m.Link === b.Link || m.Name === b.Name)) {
      records.push(b);
    }
  });
  return records;
}

/**
 * Parses the siblings text from the treePersonBit element and returns an array of sibling objects.
 * Each sibling object contains the name, half-sibling status, and birth date (if available).
 *
 * @returns {Array<Object>} An array of sibling objects.
 * @returns {string} siblingsArray[].name - The name of the sibling.
 * @returns {boolean} siblingsArray[].half - Indicates if the sibling is a half-sibling.
 * @returns {string} siblingsArray[].BirthDate - The birth date of the sibling, if available.
 */
function siblingsTextArray() {
  const siblingsArray = [];
  const siblingsText = treePersonBit.find("#Siblings").text();
  // Split by commas or "and".
  const siblings = siblingsText.split(/, |\sand\s/).map((s) => s.trim());

  siblings.forEach((s) => {
    const obj = {};
    const half = s.includes("[half]");
    const name1 = s
      .replace("[half]", "")
      .trim()
      .replace(/(Brother|Sister) of\n/, "")
      .replace(/\nadd sibling/, "")
      .trim();
    let BirthDate;
    let DeathDate;
    let name;
    // Find the name and birthdate
    // [private sister (1950s - unknown)] --> name: [private sister], BirthDate: '1950s'
    if (name1.match(/\d{4}/)) {
      name = name1.replace(/ \(\d{4}s - .*?\)/, "").trim();
      BirthDate = name1.match(/\d{4}s/) ? name1.match(/\d{4}s/)[0] : "";
      DeathDate = name1.match(/\d{4}s - (.*?)\)/) ? name1.match(/\d{4}s - (.*?)\)/)[1] : "";
    } else {
      name = name1;
    }
    obj.FullName = name;
    obj.half = half;
    obj.BirthDate = BirthDate || "";
    obj.DeathDate = DeathDate || "";
    siblingsArray.push(obj);
  });
  return siblingsArray;
}

/**
 * Parses the initial family data from the DOM.
 * @returns {Object} The family data object with arrays for parents, siblings, spouses, and children.
 */
function parseInitialData() {
  const theSiblingsArray = siblingsTextArray();

  const excludeBrackets = [
    "[date unknown]",
    "[location unknown]",
    "[uncertain]",
    "[confident]",
    "[non-biological]",
    "[marriage location?]",
    "[marriage date?]",
  ];
  const container = document.querySelector("#nav-familyContent div.tree--person");
  familyData = newFamilyData();

  // Parse parents
  const parentsBlock = container.querySelector("#Parents");
  if (parentsBlock) {
    let parsedParents = parseBlock(parentsBlock, "parent").filter((r) => r.Name && !/^(edit)$/i.test(r.Name));
    const bracketed = parseBracketedUnknownInBlock(parentsBlock).filter((b) => {
      return b.Name && b.Name.trim() && !b.Link.startsWith("https://maps.google");
    });
    bracketed.forEach((b) => {
      if (
        !parsedParents.some((m) => {
          return (
            (m.Name && m.Name.toLowerCase() === b.Name.toLowerCase()) ||
            (m.UnknownText && m.UnknownText.toLowerCase() === b.UnknownText.toLowerCase())
          );
        })
      ) {
        parsedParents.push(b);
      }
    });
    parsedParents = parsedParents.filter((parent, index, self) => {
      if (parent.Link) {
        return index === self.findIndex((p) => p.Link === parent.Link);
      } else {
        return index === self.findIndex((p) => p.UnknownText === parent.UnknownText);
      }
    });
    familyData.parents = parsedParents;
  } else {
    delete familyData.parents;
  }

  // Parse siblings
  const siblingsBlock = container.querySelector("#Siblings");
  if (siblingsBlock) {
    // const parsedSiblings = parseBlock(siblingsBlock, "sibling");.filter(
    const x = parseBlock(siblingsBlock, "sibling");
    const parsedSiblings = x.filter((r) => r.Name && !/^(add sibling)$/i.test(r.Name) && !/^\[half\]$/i.test(r.Name));
    const bracketed = parseBracketedUnknownInBlock(siblingsBlock).filter((b) => {
      return b.Name && b.Name.trim() && !b.Link.startsWith("https://maps.google");
    });
    bracketed.forEach((b) => {
      if (!parsedSiblings.some((m) => m.Link === b.Link || m.Name === b.Name)) {
        parsedSiblings.push(b);
      }
    });
    // name in siblingsArray == FullName in parsedSiblings
    // Check siblingsArray for half. If half and !halfMarker in parsedSiblings, create halfMarker:
    // <span class="SMALL" title="${profilePerson.FullName} and sibling share one parent.">[half]</span>
    theSiblingsArray.forEach((sibling) => {
      const siblingObj = parsedSiblings.find(
        (s) =>
          (s.FullName == sibling.FullName || s.Name == sibling.FullName) &&
          s.BirthDate == sibling.BirthDate &&
          s.DeathDate == sibling.DeathDate
      );
      if (siblingObj) {
        Object.assign(sibling, siblingObj);
        if (sibling.half && !siblingObj.halfMarker) {
          sibling.halfMarker = ` <span class="SMALL" title="${profilePerson.FullName} and sibling share one parent.">[half]</span>`;
        }
      } else {
        console.log(`Sibling not found in parsedSiblings: ${sibling.FullName}`);
      }
    });

    //    familyData.siblings = parsedSiblings;
    familyData.siblings = theSiblingsArray;
  } else {
    delete familyData.siblings;
  }

  // Parse spouses
  const spousesBlock = container.querySelector("#Spouses");
  if (spousesBlock) {
    let spouseEntries = parseSpousesBlock(spousesBlock);
    spouseEntries = spouseEntries.filter(
      (r) => r.Name && r.Name.trim() && excludeBrackets.includes(r.Name.trim().toLowerCase()) === false
    );
    const bracketed = parseBracketedUnknownInBlock(spousesBlock).filter((b) => {
      return (
        b.Name &&
        b.Name.trim() &&
        excludeBrackets.includes(b.Name.trim().toLowerCase()) === false &&
        !b.Link.startsWith("https://maps.google")
      );
    });
    bracketed.forEach((b) => {
      if (!spouseEntries.some((m) => m.Link === b.Link || m.Name === b.Name)) {
        spouseEntries.push(b);
      }
    });
    familyData.spouses = spouseEntries;
  } else {
    delete familyData.spouses;
  }

  // Parse children
  const childrenBlock = container.querySelector("#Children");
  if (childrenBlock) {
    let parsedChildren = parseBlock(childrenBlock, "children");
    parsedChildren = parsedChildren.filter(
      (r) => r.Name && !/\b(add|edit)\b/i.test(r.Name) && r.Name.toLowerCase() !== "add/edit children"
    );
    const bracketed = parseBracketedUnknownInBlock(childrenBlock).filter((b) => {
      return b.Name && b.Name.trim() && !b.Link.startsWith("https://maps.google");
    });
    bracketed.forEach((b) => {
      if (!parsedChildren.some((m) => m.Link === b.Link || m.Name === b.Name)) {
        parsedChildren.push(b);
      }
    });
    familyData.children = parsedChildren;
  } else {
    delete familyData.children;
  }

  // console.log("Parsed familyData:", familyData);
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
  if (familyData.siblings !== undefined) {
    container.appendChild(buildSiblingsSection(familyData.siblings));
  }
  if (familyData.spouses !== undefined) {
    if (familyData.spouses.length === 0) {
      container.appendChild(buildSpousesUnknown());
    } else {
      container.appendChild(buildSpousesSection(familyData.spouses));
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
    return { birthYear, deathYear, dates: ` (${birthYear} - ${deathYear})` };
  }
  return {};
}

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
  span.setAttribute("data-tooltip", tooltip);
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

  const meta = document.createElement("meta");
  meta.setAttribute("itemprop", "gender");
  meta.content = "male";
  container.appendChild(meta);

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
      }
      let status;

      if (profilePersonData.DataStatus?.Father && p.relationship == "Father") {
        status = profilePersonData.DataStatus?.Father;
      } else if (profilePersonData.DataStatus?.Mother && p.relationship == "Mother") {
        status = profilePersonData.DataStatus.Mother;
      }
      // console.log(profilePersonData);
      if (status) {
        // console.log("status", status);
        const statusWord =
          status == 5
            ? "[non-biological]"
            : status == 10
            ? "[uncertain]"
            : status == 20
            ? "[certain]"
            : status == 30
            ? "<span class='icon--dna-checked' style='background-size:40px 20px !important; width:40px !important'></span>"
            : "";
        status = ` <span class="dataStatus" title="">${statusWord}</span>`;
      }
      li.innerHTML = `<span itemprop="${
        p.relationship || "parent"
      }" itemscope itemtype="https://schema.org/Person"><a ${hrefBit} itemprop="url" title="" aria-label="Parent"><span itemprop="name">${
        p.FullName || p.Name
      }</span>${status || ""}</a><span class="bdDates" data-birth-year="${dates.birthYear || ""}" data-death-year="${
        dates.deathYear || ""
      }">${dates.dates ? " " + dates.dates : ""}/span><span class="relAge"></span></span>`;
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

  // console.log("siblings", siblings);

  const headerDiv = document.createElement("div");
  headerDiv.appendChild(createHeader("Siblings: ", "siblingsHeader", ""));
  headerDiv.appendChild(
    createEditButton(
      `https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=sibling`,
      "Add Sibling"
    )
  );
  container.appendChild(headerDiv);

  const ol = createListElement("siblingList", "nameList hasRelAge");
  if (siblings.length === 0) {
    ol.appendChild(createDefaultLink("sibling", "[siblings?]"));
  } else {
    siblings.forEach((s) => {
      const li = document.createElement("li");
      li.dataset.parseName = s.Name;
      const dates = getDatesFromFamilyData(s);
      const isPrivate = s.Name?.trim().toLowerCase().startsWith("[private");
      if (isPrivate) {
        li.innerHTML = `<span itemprop="sibling" itemscope itemtype="https://schema.org/Person">
          <span itemprop="name">${s.FullName || s.Name} ${
          s.halfMarker || ""
        }</span><span class="bdDates" data-birth-year="${dates.birthYear || ""}" data-death-year="${
          dates.deathYear || ""
        }">${dates.dates ? " " + dates.dates : ""}</span><span class="relAge"></span></span>`;
      } else {
        li.innerHTML = `<span itemprop="sibling" itemscope itemtype="https://schema.org/Person">
          <a href="${s.Link}" itemprop="url" title="" aria-label="Sibling"><span itemprop="name">${
          s.FullName || s.Name
        }</span></a><span class="bdDates" data-birth-year="${dates.birthYear || ""}" data-death-year="${
          dates.deathYear || ""
        }">${dates.dates ? " " + dates.dates : ""}</span><span class="relAge"></span></span>`;
        li.setAttribute("data-gender", s.Gender || "male");
        if (s.halfMarker) {
          $(li).find(".bdDates").before(s.halfMarker);
        }

        if (s.Father) li.setAttribute("data-father", s.Father);
        if (s.Mother) li.setAttribute("data-mother", s.Mother);
      }
      ol.appendChild(li);
    });
  }
  container.appendChild(ol);
  return container;
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
  const headerDiv = document.createElement("div");

  headerDiv.appendChild(
    createEditButton(
      `https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=spouse`,
      "Add/Edit Spouses"
    )
  );
  headerDiv.appendChild(createHeader("Spouses: ", "spousesHeader", ""));
  container.appendChild(headerDiv);

  // Create an ordered list for spouses.
  const ol = createListElement("spouseList");
  if (options.oneSpousePerLine && spouses.length > 1) {
    ol.className += " oneSpousePerLine";
  }
  container.appendChild(ol);

  spouses.forEach((spouse) => {
    const spouseLI = document.createElement("li");
    spouseLI.className = "aSpouse";
    spouseLI.dataset.parseName = spouse.Name;
    spouseLI.setAttribute("data-id", spouse.Id);
    spouseLI.setAttribute("data-gender", spouse.Gender);

    const grid = document.createElement("div");
    grid.className = "spouseGrid";
    const entry = document.createElement("span");
    entry.className = "spouseEntry";
    entry.setAttribute("itemprop", "spouse");
    entry.setAttribute("itemscope", "");
    entry.setAttribute("itemtype", "https://schema.org/Person");
    entry.setAttribute("data-gender", spouse.Gender);
    const theDates = getDatesFromFamilyData(spouse);
    const isPrivate = spouse.Name.trim().toLowerCase().startsWith("[private");
    if (spouse.Link && !isPrivate) {
      entry.innerHTML = `<a href="${spouse.Link}" itemprop="url" title="" class="spouseLink">
        <span itemprop="name"><strong>${spouse.FullName || spouse.Name}</strong></span></a>`;
    } else {
      entry.innerHTML = `<span itemprop="name"><strong>${spouse.FullName || spouse.Name}</strong></span>`;
    }
    grid.appendChild(entry);
    const datesEl = document.createElement("span");
    datesEl.className = "spouseDates bdDates";
    datesEl.setAttribute("data-birth-year", theDates.birthYear || "");
    datesEl.setAttribute("data-death-year", theDates.deathYear || "");
    datesEl.textContent = theDates.dates ? " " + theDates.dates : "";
    if (spouse.Name) {
      const idName = (spouse.Name || "").replace(/\s/g, "-");
      datesEl.id = idName + "-bdDates";
    }
    grid.appendChild(datesEl);
    spouseLI.appendChild(grid);

    const details = document.createElement("span");
    details.className = "marriageDetails";
    let detailsText = spouse.MarriageDetails || "";
    detailsText = detailsText.replace(/add\/edit spouses/gi, "").trim();
    details.textContent = detailsText;
    spouseLI.appendChild(details);

    // Append map link if available.
    if (spouse.MarriageMapLink) {
      const mapLink = document.createElement("a");
      mapLink.style.position = "relative";
      mapLink.href = spouse.MarriageMapLink;
      mapLink.setAttribute("data-bs-toggle", "tooltip");
      mapLink.setAttribute("data-bs-title", "Marriage Location on Map");
      mapLink.setAttribute("data-tooltip", "Marriage Location on Map");
      mapLink.target = "_map";
      const mapIcon = document.createElement("img");
      mapIcon.src = "/images/icons/icon-map-pin.svg";
      mapIcon.alt = "map icon";
      mapLink.appendChild(mapIcon);
      details.appendChild(mapLink);
    }
    if (spouseLI.dataset.parseName.includes("?")) {
      spouseLI.classList.add("editAction");
      spouseLI.classList.remove("aSpouse");
    }
    ol.appendChild(spouseLI);
  });
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
  container.appendChild(
    createEditButton(
      `https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=child`,
      "Add/Edit Children"
    )
  );

  const ol = createListElement("childrenList", "nameList hasRelAge");
  children.forEach((c) => {
    const dates = getDatesFromFamilyData(c);
    const li = document.createElement("li");
    li.dataset.parseName = c.Name;
    const isPrivate = c.Name.trim().toLowerCase().startsWith("[private");
    if (c.Link && !isPrivate) {
      li.innerHTML = `<span itemprop="children" itemscope itemtype="https://schema.org/Person">
          <a href="${
            c.Link.startsWith("http") ? c.Link : "https://" + mainDomain + c.Link
          }" itemprop="url" title="" aria-label="Child" class="childLink"><span itemprop="name">${
        c.FullName || c.Name
      }</span></a><span class="bdDates" data-birth-year="${dates.birthYear || ""}" data-death-year="${
        dates.deathYear || ""
      }">
            ${dates.dates ? " " + dates.dates : ""}</span><span class="relAge"></span></span>`;
    } else {
      li.innerHTML = `<span itemprop="children" itemscope itemtype="https://schema.org/Person">
            <span itemprop="name">${c.FullName || c.Name}</span><span class="bdDates" data-birth-year="${
        dates.birthYear || ""
      }" data-death-year="${dates.deathYear || ""}">
             ${dates.dates ? " " + dates.dates : ""}</span><span class="relAge"></span></span>`;
    }
    if (!/^\[.*\?\]$/.test(c.Name)) {
      li.setAttribute("data-gender", c.Gender || "male");
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
    ol.appendChild(li);
  });
  container.appendChild(ol);
  return container;
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

/**
 * Retrieves people data from the API and stores it in global Maps.
 * @returns {Promise<void>}
 */
async function getWindowPeople() {
  const result = await $.ajax({
    url: "https://api.wikitree.com/api.php",
    type: "POST",
    dataType: "json",
    xhrFields: { withCredentials: true },
    data: {
      action: "getPeople",
      appId: "WBE_changeFamilyLists",
      keys: profilePerson.Id,
      fields: getPeopleFields,
      nuclear: 1,
    },
  });
  const people = result[0].people;
  window.people = new Map(Object.entries(people));
  const arr = Object.values(people);
  window.peopleByWtID = new Map(arr.map((p) => [p.Name, p]));
  profilePersonData = people[profilePerson.Id];
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
    finalText = ` (${bYear} - ${dYear})`;
  } else if (bYear) {
    finalText = ` (${bYear})`;
  } else if (dYear) {
    finalText = ` (${dYear})`;
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
  $("#nVitals li, #nVitals div.aSpouse").each(function () {
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
 * Calculates the age difference between two dates.
 * @param {string|Object} start - The start date in "YYYY-MM-DD" format or an object with date parts.
 * @param {string|Object} end - The end date in "YYYY-MM-DD" format or an object with date parts.
 * @returns {number[]} An array: [fullYears, extraDays, totalDays].
 */
export function getAge(start, end = false) {
  let start_day, start_month, start_year, end_day, end_month, end_year;
  if (typeof start === "object") {
    start_day = parseInt(start.start.date);
    start_month = parseInt(start.start.month);
    start_year = parseInt(start.start.year);
    end_day = parseInt(start.end.date);
    end_month = parseInt(start.end.month);
    end_year = parseInt(start.end.year);
  } else {
    const startSplit = start.split("-");
    start_day = parseInt(startSplit[2]);
    start_month = parseInt(startSplit[1]);
    start_year = parseInt(startSplit[0]);
    const endSplit = end.split("-");
    end_day = parseInt(endSplit[2]);
    end_month = parseInt(endSplit[1]);
    end_year = parseInt(endSplit[0]);
  }
  const month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (isLeapYear(start_year)) {
    month[1] = 29;
  }
  const firstMonthDays = month[start_month - 1] - start_day;
  let restOfYearDays = 0;
  for (let i = start_month; i < 12; i++) {
    restOfYearDays += month[i];
  }
  const firstYearDays = firstMonthDays + restOfYearDays;
  let fullYears = end_year - (start_year + 1);
  let lastYearMonthDays = 0;
  if (isLeapYear(end_year)) {
    month[1] = 29;
  } else {
    month[1] = 28;
  }
  for (let i = 0; i < end_month - 1; i++) {
    lastYearMonthDays += month[i];
  }
  let lastYearDaysTotal = end_day + lastYearMonthDays;
  let totalExtraDays = lastYearDaysTotal + firstYearDays;
  let andDays;
  if (totalExtraDays > 364) {
    fullYears++;
    let yearDays = 365;
    if (isLeapYear(start_year) && start_month < 3) {
      yearDays++;
    }
    if (isLeapYear(end_year) && end_month > 3) {
      yearDays++;
    }
    andDays = totalExtraDays - yearDays;
  } else {
    andDays = totalExtraDays;
    if (isLeapYear(start_year) && start_month < 3) {
      totalExtraDays--;
    }
    if (isLeapYear(end_year) && end_month > 3) {
      totalExtraDays--;
    }
  }
  const totalDays = Math.round(fullYears * 365.25) + andDays;
  return [fullYears, andDays, totalDays];
}

/**
 * Checks whether the given year is a leap year.
 * @param {number} year - The year to check.
 * @returns {boolean} True if leap year, false otherwise.
 */
function isLeapYear(year) {
  return year % 100 === 0 ? year % 400 === 0 : year % 4 === 0;
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
      const marriageDiv = $(`.aSpouse[data-id='${spouseId}']`);
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
        let profileAgeText = profileMarriageAge ? pagePerson.FirstName + " (" + profileMarriageAge + ")" : "";
        let spouseAgeText = spouseMarriageAge ? spouseFromApi.FirstName + " (" + spouseMarriageAge + ")" : "";
        if (profileAgeText && spouseAgeText) {
          spouseAgeText = "; " + spouseAgeText;
        }
        let marriageAgesSpan = marriageDiv.find(".marriageAges");
        if (!marriageAgesSpan.length) {
          marriageAgesSpan = $("<span class='marriageAges'></span>");
          marriageDiv.append(marriageAgesSpan);
        }
        marriageAgesSpan.text(profileAgeText + spouseAgeText);
        let marriageDetailsSpan = marriageDiv.find(".marriageDetails");
        if (marriageDetailsSpan.length) {
          let html = marriageDetailsSpan.html();
          html = html.replace(
            /—\s*married\s*/i,
            `<a href="https://${mainDomain}/index.php?title=Special:EditFamily&u=${profilePerson.Id}&who=editspouse&s=${spouseId}" target="_blank" title="Edit marriage" class="clickable">married</a> `
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
    const wtId = personHref.split("/").pop();
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
  if ($(".aSpouse").length > 0) {
    const firstSpouseGender = $(".aSpouse").first().data("gender");
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
  if ($(".aSpouse").length > 1 || uniqueParentIDs.length > 1) {
    $(".aSpouse").each(function (index) {
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

  const cond1 = uniqueFathers.length == 1 && uniqueFathers[0] == profilePersonData.Father;
  const cond2 = uniqueFathers.length == 0 && !profilePersonData.Father;
  const cond3 = uniqueMothers.length == 1 && uniqueMothers[0] == profilePersonData.Mother;
  const cond4 = uniqueMothers.length == 0 && !profilePersonData.Mother;
  if ((cond1 || cond2) && (cond3 || cond4)) {
    return;
  }

  const pList = $("#parentList li");
  /*
  if (pList.length >= 2) {
    const p1 = pList.eq(0).attr("data-id");
    const p2 = pList.eq(1).attr("data-id");
    if (p1 && p2 && p1 !== p2) {
      pList.eq(0).addClass("parent_1");
      pList.eq(1).addClass("parent_2");
      $("#siblingList li").each(function () {
        const father = String($(this).attr("data-father") || "");
        const mother = String($(this).attr("data-mother") || "");
        if (father === p1) {
          $(this).addClass("parent_1");
        }
        if (mother === p2) {
          $(this).addClass("parent_2");
        }
      });
      if ($(".aSpouse").length > 1) {
        $(".aSpouse").each(function (index) {
          $(this).addClass("spouse_" + (index + 1));
        });
      }
    }
  }
    */

  // Grab the <li> elements for father and mother based on data-gender
  const fatherLi = pList.filter('[data-gender="Male"]').first();
  const motherLi = pList.filter('[data-gender="Female"]').first();

  if (fatherLi.length && motherLi.length) {
    const fatherID = fatherLi.attr("data-id");
    const motherID = motherLi.attr("data-id");

    // Assign classes to the parent <li> elements
    fatherLi.addClass("parent_1");
    motherLi.addClass("parent_2");

    // Go through siblings and see who shares father/mother
    $("#siblingList li").each(function () {
      const theirFather = String($(this).attr("data-father") || "");
      const theirMother = String($(this).attr("data-mother") || "");
      if (theirFather === fatherID) {
        $(this).addClass("parent_1");
      }
      if (theirMother === motherID) {
        $(this).addClass("parent_2");
      }
      if ($(this).text().includes("[half]")) {
        $(this).addClass("fl-half-tooltip").attr("data-title", "[half]");
      }
    });

    // If there are multiple .aSpouse elements, assign them spouse_1, spouse_2, etc.
    if ($(".aSpouse").length > 1) {
      $(".aSpouse").each(function (index) {
        $(this).addClass("spouse_" + (index + 1));
      });
    }
  }
}

/**
 * Moves the family lists to a different part of the page based on options.
 */
function moveFamilyLists() {
  const $nVitals = $("#nVitals");
  const sidebarHeading = $nVitals.find(".sidebar-heading");
  if (window.innerWidth < 992) {
    sidebarHeading.hide();
    $nVitals.removeClass("row").appendTo(treePersonBit);
  } else if (options.moveToRight) {
    if (options.showSidebarHeading) {
      sidebarHeading.show();
    }
    $nVitals.addClass("row");
    let $before;
    if (options.familyListPosition === "beforeManager") {
      $before = $("#Profile-Data");
    } else if (options.familyListPosition === "beforePhotos") {
      $before = $("#Photos");
    }
    if (!$before?.length) {
      $before = $("#DNA-Connections");
      if (!$before.length) {
        $before = $("#Research");
      }
    }
    if ($before.length) {
      $nVitals.insertBefore($before);
    } else {
      $nVitals.insertAfter("#Profile-Data");
    }
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
  ];
  const p = getPerson(profilePerson.Id);
  let gen = "neutral";
  if (p?.Gender === "Male") {
    gen = "male";
  } else if (p?.Gender === "Female") {
    gen = "female";
  }
  headings.forEach((obj) => {
    const el = document.querySelector(obj.sel);
    if (!el) return;
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
  const headingIds = ["parentsHeader", "siblingsHeader", "spousesHeader", "childrenHeader"];
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
  // console.log("Profile person for insertion:", pPerson);

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
    if (profilePersonData.Father) {
      parentClasses += "parent_1 ";
    }
    if (profilePersonData.Mother) {
      parentClasses += "parent_2";
    }
  }

  let inserter = $(`
      <span itemprop="sibling" itemtype="http://schema.org/Person" data-private="0" class="${parentClasses}"><a href="#n" class="activeProfile" data-wtid="${
    pPerson.Name
  }">${displayName(pPerson)[0]}</a><span class="bdDates" data-birth-year="${birthYear || ""}" data-death-year="${
    deathYear || ""
  }"> ${displayDates(pPerson).trim()}</span></span>`);

  const profilePersonLi = $(`<li id='profilePerson' class="${parentClasses}"></li>`);
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
    $("#profilePerson span[itemprop='sibling']").addClass("parent_1");
  }
  if ($(".parent_2").length) {
    $("#profilePerson").addClass("parent_2");
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
  const dbPromise = new Promise((resolve, reject) => {
    initRelationshipDB((event) => resolve(event.target.result));
  });
  const db = await dbPromise;
  const ancestorsPromise = new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const allItemsRequest = store.getAll();
    allItemsRequest.onsuccess = () => {
      const items = allItemsRequest.result;
      const ancestorKeys = items
        .filter((item) => {
          const relationship = item?.relationship?.toLowerCase();
          if (!relationship) return false;
          return relationship.match(/father|mother/i) != null && item.userId === user;
        })
        .map((item) => item.id);
      resolve(ancestorKeys);
    };
    allItemsRequest.onerror = (event) => reject(event.target.error);
  });
  const ancestorKeys = await ancestorsPromise;
  //console.log("Ancestor keys:", ancestorKeys);
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
  // console.log("People on page:", peopleOnPage);
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
      // console.log("Adding ancestor label to", ancestor, element);
      addAncestorLabels(element);
    }
  });
  if (
    ancestorsOnPage.includes(profilePerson.Name) ||
    $("#yourRelationshipText")
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
  const url = `https://plus.wikitree.com/function/WTPath/Path.htm?WikiTreeID1=${ancestor}&WikiTreeID2=${user}&relatives=1`;
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
  if ($("#childrenCount").length === 0) {
    const nVitals = $("#nVitals");
    const siblingCount = countItems(nVitals.find("span[itemprop='sibling']"));
    nVitals
      .find("#siblingDetails")
      .append(
        $(
          `<span id="siblingCount" class="familyCount" title="${profilePerson.FirstName} has ${siblingCount} sibling${
            siblingCount !== 1 ? "s" : ""
          }">[${siblingCount}]</span>`
        )
      );
    const childrenCount = countItems(nVitals.find("span[itemprop='children']"));
    nVitals
      .find("#childrenDetails")
      .append($(`<span id="childrenCount" class="familyCount">[${childrenCount}]</span>`));
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
  formatListItems("#nVitals span[itemprop='parent'],#nVitals span[itemprop='Father'],#nVitals span[itemprop='Mother']");
  formatListItems("#nVitals span[itemprop='sibling']");
  formatListItems("#nVitals span[itemprop='children']");
  formatListItems("#nVitals li.aSpouse", "inside");
}

function moveMetaGender() {
  const vitalsElement = document.querySelector(".tree-person p.VITALS");
  if (vitalsElement && !vitalsElement.querySelector('meta[itemprop="gender"]')) {
    const genderMeta = $("meta[itemprop='gender']").eq(0);
    vitalsElement.append(genderMeta);
  }
}

/* ========================================================================
   Main Hook: Initialize, Replace DOM, and Attach Events
   ======================================================================== */
shouldInitializeFeature("changeFamilyLists").then(async (result) => {
  if (!result) {
    // parseSiblings();
    return;
  }
  moveMetaGender();
  const familyData = parseInitialData();
  const treePerson = $("#Family-pane div.tree--person");
  // Retain only the first .VITALS element.
  treePerson.children().not(":first").remove();
  options = await getFeatureOptions("changeFamilyLists");
  await getWindowPeople();
  const newVitals = buildFamilyListsFromData(familyData);
  treePersonBit.append(newVitals);
  attachApiData();
  window.excludeValues = ["", null, "null", "0000-00-00", "unknown", "undefined", undefined, NaN, "NaN"];

  if (options.moveToRight) {
    moveFamilyLists();
  }
  if (options.verticalLists) {
    $("#nVitals").addClass("vertical");
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

  const pagePerson = getPerson(profilePerson.Id);
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

  // Wait until Distance and Relationship feature has loaded (hopefully)
  if (options.highlightAncestors) {
    setTimeout(() => {
      getAncestorsOnPage().catch(console.error);
    }, 4000);
  }
});
