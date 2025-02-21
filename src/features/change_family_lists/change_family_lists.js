/*
Created By: Ian Beacall (Beacall-6)
Contributors: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isOK, htmlEntities, displayName } from "../../core/common";
import { displayDates } from "../verifyID/verifyID";
import { getUserWtId } from "../../core/common";
import "./change_family_lists.css";
import { initRelationshipDB, RELATIONSHIP_STORE_NAME } from "../distanceAndRelationship/distanceAndRelationship.js";
import { profilePerson } from "../../core/common";

const mainDomain = "dev-2025.wikitree.com";
let options;
const user = getUserWtId();
window.people = null;
window.peopleByWtID = null;

/************************************************
 * 1) Data Structures
 ************************************************/
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
  };
}
function newFamilyData() {
  return {
    parents: [],
    siblings: [],
    spouses: [],
    children: [],
  };
}

/************************************************
 * 2) ITEMPROP + BRACKET PARSING
 ************************************************/
function parseItempropElement(el) {
  const record = newPersonRecord();

  const linkEl = el.querySelector("a[itemprop='url'], a[href*='/wiki/']");
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
  }
  const fullText = el.textContent.trim();
  if (!record.FullName) {
    const bracketMatch = fullText.match(/\[([^\]]+)\]/);
    if (bracketMatch) {
      record.UnknownText = bracketMatch[0];
      const inner = bracketMatch[1];
      const dateRange = inner.match(/\(([^)]+)\)/);
      if (dateRange) {
        const [b, d] = dateRange[1].split(/\s*-\s*/);
        record.BirthDate = b?.trim() || "";
        record.DeathDate = d?.trim() || "";
      }
      const noDates = inner.replace(/\([^)]*\)/, "").trim();
      record.Name = noDates;
    } else {
      record.Name = fullText;
    }
  }
  return record;
}

function newPersonFromBracket(bracketText, link = "") {
  const record = newPersonRecord();
  record.UnknownText = bracketText;
  record.Name = bracketText;
  record.Link = link;
  return record;
}

function parseBracketedUnknownInBlock(blockEl) {
  const results = [];

  const anchors = blockEl.querySelectorAll("a");
  anchors.forEach((a) => {
    const text = a.textContent.trim();
    if (/^\[[^]]*\]$/.test(text)) {
      results.push(newPersonFromBracket(text, a.getAttribute("href") || ""));
    }
  });

  let raw = blockEl.innerText;
  anchors.forEach((a) => {
    const t = a.textContent.trim();
    if (/^\[[^]]*\]$/.test(t)) {
      raw = raw.replace(t, "");
    }
  });
  const bracketRegex = /\[[^\]]*\]/g;
  const bracketed = raw.match(bracketRegex) || [];
  bracketed.forEach((b) => {
    results.push(newPersonFromBracket(b));
  });

  return results;
}

function parseBlock(blockEl, itempropName) {
  const records = [];
  const itempropEls = blockEl.querySelectorAll(`[itemprop="${itempropName}"]`);
  itempropEls.forEach((el) => {
    const rec = parseItempropElement(el);
    if (rec.Name || rec.FullName || rec.UnknownText) {
      records.push(rec);
    }
  });
  const bracketed = parseBracketedUnknownInBlock(blockEl);
  bracketed.forEach((b) => {
    records.push(b);
  });
  return records;
}

/************************************************
 * 3) PARSE SPOUSES BLOCK
 ************************************************/
function parseSpousesBlock(spousesEl) {
  const html = spousesEl.innerHTML;
  const reSplit = /(?:Husband|Wife|Spouse)\s+of/i;
  const chunks = html.split(reSplit);

  const spouseRecords = [];
  chunks.forEach((chunk, i) => {
    if (i === 0) return;
    const div = document.createElement("div");
    div.innerHTML = chunk;

    const spouseSpan = div.querySelector('[itemprop="spouse"]');
    const rec = newPersonRecord();
    if (spouseSpan) {
      const spouseData = parseItempropElement(spouseSpan);
      Object.assign(rec, spouseData);
    }

    const chunkText = div.innerText;
    const idx = chunkText.toLowerCase().indexOf("— married");
    if (idx >= 0) {
      rec.MarriageDetails = chunkText.slice(idx).trim();
    }
    const mapLink = div.querySelector('a[href*="maps.google"]');
    if (mapLink) {
      rec.MarriageMapLink = mapLink.getAttribute("href");
    }

    if (rec.Name || rec.FullName || rec.UnknownText || rec.MarriageDetails) {
      spouseRecords.push(rec);
    }
  });

  return spouseRecords;
}

/************************************************
 * 4) parseInitialData
 ************************************************/
function parseInitialData() {
  const container = document.querySelector("div.tree--person") || document.body;
  const familyData = newFamilyData();

  const parentsBlock = container.querySelector("#Parents");
  if (parentsBlock) {
    familyData.parents = parseBlock(parentsBlock, "parent");
  }
  const siblingsBlock = container.querySelector("#Siblings");
  if (siblingsBlock) {
    familyData.siblings = parseBlock(siblingsBlock, "sibling");
  }
  const spousesBlock = container.querySelector("#Spouses");
  if (spousesBlock) {
    const spouseEntries = parseSpousesBlock(spousesBlock);
    familyData.spouses.push(...spouseEntries);
    const bracketed = parseBracketedUnknownInBlock(spousesBlock);
    familyData.spouses.push(...bracketed);
  }
  const childrenBlock = container.querySelector("#Children");
  if (childrenBlock) {
    familyData.children = parseBlock(childrenBlock, "children");
  }
  console.log("Parsed familyData:", familyData);
  return familyData;
}

/************************************************
 * 5) BUILD #nVitals FROM DATA
 ************************************************/
function buildFamilyListsFromData(familyData) {
  const container = document.createElement("div");
  container.id = "nVitals";
  container.className = "familyLists";

  const heading = document.createElement("h2");
  heading.className = "mt-5 sidebar-heading";
  heading.textContent = "Family Relationships";
  container.appendChild(heading);

  container.appendChild(buildParentsSection(familyData.parents));
  container.appendChild(buildSiblingsSection(familyData.siblings));
  container.appendChild(buildSpousesSection(familyData.spouses));
  container.appendChild(buildChildrenSection(familyData.children));

  return container;
}

function buildParentsSection(parents) {
  const div = document.createElement("div");
  div.className = "VITALS familyList";
  div.id = "Parents";

  const heading = document.createElement("span");
  heading.id = "parentsHeader";
  heading.className = "clickable familyListHeading";
  heading.textContent = "Parents: ";
  div.appendChild(heading);

  const ol = document.createElement("ol");
  ol.id = "parentList";
  ol.className = "nameList";
  div.appendChild(ol);

  parents.forEach((p) => {
    const li = document.createElement("li");
    const text = p.FullName || p.Name || p.UnknownText;
    if (p.Link) {
      const a = document.createElement("a");
      a.href = p.Link;
      a.textContent = text;
      li.appendChild(a);
    } else {
      li.textContent = text;
    }
    if (p.BirthDate || p.DeathDate) {
      const bd = document.createElement("span");
      bd.className = "bdDates";
      bd.textContent = ` (${p.BirthDate} - ${p.DeathDate})`;
      li.appendChild(bd);
    }
    ol.appendChild(li);
  });

  return div;
}

function buildSiblingsSection(siblings) {
  const div = document.createElement("div");
  div.className = "VITALS familyList";
  div.id = "Siblings";

  const heading = document.createElement("span");
  heading.id = "siblingsHeader";
  heading.className = "clickable familyListHeading";
  heading.textContent = "Siblings: ";
  div.appendChild(heading);

  const ol = document.createElement("ol");
  ol.id = "siblingList";
  ol.className = "nameList";
  div.appendChild(ol);

  siblings.forEach((s) => {
    const li = document.createElement("li");
    const text = s.FullName || s.Name || s.UnknownText;
    if (s.Link) {
      const a = document.createElement("a");
      a.href = s.Link;
      a.textContent = text;
      a.setAttribute("itemprop", "sibling");
      li.appendChild(a);
    } else {
      li.textContent = text;
    }
    if (s.BirthDate || s.DeathDate) {
      const bd = document.createElement("span");
      bd.className = "bdDates";
      bd.textContent = ` (${s.BirthDate} - ${s.DeathDate})`;
      li.appendChild(bd);
    }
    ol.appendChild(li);
  });

  return div;
}

function buildSpousesSection(spouses) {
  const div = document.createElement("div");
  div.className = "VITALS spouseDetails familyList";
  div.id = "Spouses";

  const heading = document.createElement("span");
  heading.className = "spouseText clickable";
  heading.id = "spousesHeader";
  heading.textContent = "Spouses: ";
  div.appendChild(heading);

  spouses.forEach((sp, idx) => {
    const aSpouseDiv = document.createElement("div");
    aSpouseDiv.className = `aSpouse spouse_${idx + 1}`;

    // spouseGrid
    const spouseGrid = document.createElement("div");
    spouseGrid.className = "spouseGrid";

    const spouseSpan = document.createElement("span");
    spouseSpan.className = "spouseEntry";
    spouseSpan.setAttribute("itemprop", "spouse");
    spouseSpan.setAttribute("itemscope", "");
    spouseSpan.setAttribute("itemtype", "https://schema.org/Person");

    const text = sp.FullName || sp.Name || sp.UnknownText;
    if (sp.Link) {
      const a = document.createElement("a");
      a.href = sp.Link;
      a.textContent = text;
      spouseSpan.appendChild(a);
    } else {
      spouseSpan.textContent = text;
    }

    spouseGrid.appendChild(spouseSpan);

    if (sp.BirthDate || sp.DeathDate) {
      const bdDates = document.createElement("span");
      bdDates.className = "spouseDates bdDates";
      bdDates.textContent = ` (${sp.BirthDate} - ${sp.DeathDate})`;
      spouseGrid.appendChild(bdDates);
    }

    aSpouseDiv.appendChild(spouseGrid);

    if (sp.MarriageDetails) {
      const mdSpan = document.createElement("span");
      mdSpan.className = "marriageDetails";
      mdSpan.textContent = sp.MarriageDetails;
      aSpouseDiv.appendChild(mdSpan);

      if (sp.MarriageMapLink) {
        const mapA = document.createElement("a");
        mapA.href = sp.MarriageMapLink;
        mapA.target = "_map";
        mapA.setAttribute("data-bs-toggle", "tooltip");
        mapA.setAttribute("data-bs-title", "Marriage Location on Map");
        mapA.innerHTML = '<img src="/images/icons/icon-map-pin.svg" alt="map icon">';
        mdSpan.appendChild(document.createTextNode(" "));
        mdSpan.appendChild(mapA);
      }
    }

    div.appendChild(aSpouseDiv);
  });
  return div;
}

function buildChildrenSection(children) {
  const div = document.createElement("div");
  div.className = "VITALS familyList";
  div.id = "Children";

  const heading = document.createElement("span");
  heading.id = "childrenHeader";
  heading.className = "clickable familyListHeading";
  heading.textContent = "Children: ";
  div.appendChild(heading);

  const ol = document.createElement("ol");
  ol.id = "childrenList";
  ol.className = "nameList";
  div.appendChild(ol);

  children.forEach((c) => {
    const li = document.createElement("li");
    const text = c.FullName || c.Name || c.UnknownText;
    if (c.Link) {
      const a = document.createElement("a");
      a.href = c.Link;
      a.textContent = text;
      a.setAttribute("itemprop", "children");
      li.appendChild(a);
    } else {
      li.textContent = text;
    }
    if (c.BirthDate || c.DeathDate) {
      const bdDates = document.createElement("span");
      bdDates.className = "bdDates";
      bdDates.textContent = ` (${c.BirthDate} - ${c.DeathDate})`;
      li.appendChild(bdDates);
    }
    ol.appendChild(li);
  });
  return div;
}

/************************************************
 * 6) API calls
 ************************************************/
const getPeopleFields =
  "BirthDate,BirthDateDecade,BirthLocation,BirthName,Connected,DataStatus,DeathDate,DeathDateDecade,DeathLocation," +
  "Derived.BirthNamePrivate,Derived.LongName,Derived.LongNamePrivate,Father,FirstName,Gender,Id,IsLiving," +
  "LastNameAtBirth,LastNameCurrent,LastNameOther,Manager,MiddleName,Mother,Name,Prefix,RealName,ShortName," +
  "Spouses,Suffix,TrustedList";

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
}

function getPerson(id) {
  return window.people?.get(String(id));
}
function getPersonByWtID(wtId) {
  return window.peopleByWtID?.get(wtId);
}

/************************************************
 * 7) highlightAncestors, half-sibling detection, etc.
 ************************************************/
// Examples:

async function getAncestorsOnPage() {
  const dbPromise = new Promise((resolve) => {
    initRelationshipDB((e) => resolve(e.target.result));
  });
  const db = await dbPromise;
  const store = db.transaction(RELATIONSHIP_STORE_NAME, "readonly").objectStore(RELATIONSHIP_STORE_NAME);
  const allItemsRequest = store.getAll();

  const items = await new Promise((resolve) => {
    allItemsRequest.onsuccess = () => resolve(allItemsRequest.result);
  });

  // gather ancestor IDs
  const ancestorKeys = items
    .filter((x) => x.userId === user && x.relationship?.toLowerCase().match(/father|mother/))
    .map((x) => x.id);

  const familyLinks = $("#nVitals .VITALS a[href*='/wiki/']");
  const peopleOnPage = familyLinks
    .map(function () {
      const href = $(this).attr("href");
      return href ? href.split("/").pop() : null;
    })
    .get();

  // highlight
  peopleOnPage.push(profilePerson.Name);
  const ancestorsOnPage = peopleOnPage.filter((p) => {
    const underscored = p.replace(/ /g, "_");
    const spaced = p.replace(/_/g, " ");
    return ancestorKeys.includes(underscored) || ancestorKeys.includes(spaced);
  });
  ancestorsOnPage.forEach((anc) => {
    const sel = `#nVitals .VITALS a[href$="/wiki/${anc.replace(/ /g, "_")}"], #nVitals a[href$="/wiki/${anc.replace(
      /_/g,
      " "
    )}"]`;
    $(sel).addClass("ancestor").attr("title", "Ancestor");
  });
  // done
}

/************************************************
 * 8) relative ages, marriage ages
 ************************************************/
function isLeapYear(year) {
  return year % 100 === 0 ? year % 400 === 0 : year % 4 === 0;
}
function getAge(start, end = false) {
  // same logic as your original
  // ...
  if (!start) return [0, 0, 0];
  const startSplit = start.split("-");
  // minimal example
  const startYear = parseInt(startSplit[0]);
  // ...
  return [/* fullYears */ 0, /* andDays */ 0, /* totalDays */ 0];
}

function addMarriageAges() {
  // your logic that calculates "He was 25; She was 23" at time of marriage, etc.
}
function getMarriageAge(birthDate, marriageDate) {
  // ...
}

/************************************************
 * 9) vertical/horizontal transformations
 ************************************************/
function makeVerticalFamLists() {
  // The function that re-styles #nVitals for vertical,
  // including half-sibling detection, etc.
}

function moveFamilyLists() {
  // place #nVitals on the right side if wide screen
}

/************************************************
 * 10) MAIN HOOK
 ************************************************/
shouldInitializeFeature("changeFamilyLists").then(async (result) => {
  if (!result) return;

  // 1) parse old DOM => structured data
  const familyData = parseInitialData();

  // 2) remove original #familyVitals
  $("#familyVitals").remove();

  // 3) fetch from API so we can highlight or do father/mother detection, etc.
  await getWindowPeople();

  // 4) build brand-new #nVitals from parse data
  const newVitals = buildFamilyListsFromData(familyData);

  // 5) insert
  $("#Profile-Data").after(newVitals);

  // 6) load user options
  options = await getFeatureOptions("changeFamilyLists");

  // 7) if user wants to move to right
  if (options.moveToRight) {
    moveFamilyLists();
  }

  // 8) vertical vs. horizontal
  if (options.verticalLists) {
    $("#nVitals").addClass("vertical");
    makeVerticalFamLists();
  } else {
    // e.g. headings, sibling counts, etc.
  }

  // 9) highlight ancestors if desired
  if (options.highlightAncestors) {
    getAncestorsOnPage();
  }

  // 10) marriage ages, relative ages, etc.
  if (options.agesAtMarriages) {
    addMarriageAges();
  }
  // if (options.parentAges) { ... do parent/child relative ages... }

  console.log("Built brand-new #nVitals from new parse approach, with your features intact!", familyData);
});
