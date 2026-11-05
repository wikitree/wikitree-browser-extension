// The relationship finder (getConnections relation=2, getRelationJSON) only follows blood lines,
// so a spouse who is also a distant cousin shows up as "12th cousin 4 times removed", and one
// who isn't shows nothing. The profile page itself lists the profile person's spouses, so read
// those to see whether the logged-in user is one of them.

const SPOUSE_WORDS = ["wife", "husband", "spouse"];

function normalizeWtId(value) {
  if (!value) return "";
  let id = String(value);
  try {
    id = decodeURIComponent(id);
  } catch (e) {
    // leave as is
  }
  return id.trim().replace(/ /g, "_").toLowerCase();
}

function wtIdFromHref(href) {
  const match = String(href || "").match(/\/wiki\/([^?#]+)/);
  return match ? normalizeWtId(match[1]) : "";
}

/**
 * True when the profile page lists the given user as a spouse of the profile person.
 * @param {ParentNode} root - usually document
 * @param {string} userWtId - e.g. "Harris-55071"
 */
export function isUserSpouseOnPage(root, userWtId) {
  const userId = normalizeWtId(userWtId);
  if (!root || !userId) return false;
  const links = root.querySelectorAll('[itemprop="spouse"] a[href*="/wiki/"]');
  return Array.from(links).some((link) => wtIdFromHref(link.getAttribute("href")) === userId);
}

export function spouseWord(gender) {
  if (gender === "Female") return "wife";
  if (gender === "Male") return "husband";
  return "spouse";
}

export function isSpouseWord(text) {
  return SPOUSE_WORDS.includes(String(text || "").trim().toLowerCase());
}

/**
 * Decide what the relationship box says.
 * @param {string} relationship - stored/derived relationship (may already be a spouse word)
 * @param {string} bloodRelationship - blood relationship stored alongside a spouse word
 * @param {string} spouseLabel - "wife"/"husband"/"spouse" when the user is the profile's spouse, else ""
 * @returns {{main: string, also: string}} main is "" when there is nothing to show
 */
export function relationshipBoxText(relationship, bloodRelationship, spouseLabel) {
  const blood = bloodRelationship || (isSpouseWord(relationship) ? "" : relationship || "");
  if (spouseLabel) {
    return { main: spouseLabel, also: blood };
  }
  // No longer (or never) listed as a spouse on the page: fall back to the blood relationship.
  return { main: blood, also: "" };
}
