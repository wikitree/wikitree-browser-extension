import $ from "jquery";

let lastCitationFailure = null;

export function getFindAGraveLink(text) {
  const match1 = /(https?:\/\/www\.findagrave.com[^\s);.,<]+)/;
  const match2 = /\[(https?:\/\/www\.findagrave.com[^\s]+)(\s([^\]]+))?\]/;
  const match3 = /\{\{\s?FindAGrave\s?\|\s?(\d+)(\|.*?)?\s?\}\}/;
  const match4 = /database and images/;
  const match5 = /^\s?Find a Grave:?( memorial)? #?(\d+)\.?$/i;
  const sourcerMatch = /'''.+<br(.*)?>.+<br(.*)?>/;
  const familySearchFindAGraveMatch = /"Find a Grave Index"/;

  if (!text.match(sourcerMatch) || text.match(familySearchFindAGraveMatch)) {
    if (text.match(match1)) {
      return text.match(match1)[1];
    } else if (text.match(match2)) {
      return text.match(match2)[1];
    } else if (text.match(match3) && text.match(match4) == null && text.match(match3)[0].match(/samesas=no/) == null) {
      return "https://www.findagrave.com/memorial/" + text.match(match3)[1];
    } else if (text.match(match5) && text.match(match5)[0].match(/samesas=no/) == null) {
      return "https://www.findagrave.com/memorial/" + text.match(match5)[2];
    }
  }

  return null;
}

export async function getCitation(link) {
  lastCitationFailure = null;

  if (link.match("cgi-bin/fg.cgi") && link.match("id=")) {
    let memorial = link.split("id=")[1];
    link = "https://www.findagrave.com/memorial/" + memorial;
  }

  if (isFindAGraveMemorialLink(link)) {
    return getFindAGraveCitation(link);
  }

  const encodedLink = encodeGuid(link);
  try {
    let result = await $.ajax({
      url: "https://wikitreebee.com/citation",
      type: "GET",
      data: { link: encodedLink },
      dataType: "text",
    });
    return result;
  } catch (error) {
    setCitationFailure({
      source: "remote-citation-service",
      link,
      userMessage: "WBE couldn't retrieve this citation right now. Your source text was left unchanged.",
      technicalMessage: error?.message || "Unknown citation service error",
    });
    console.error("Error fetching citation:", error);
    return null;
  }
}

export function getLastCitationFailure() {
  return lastCitationFailure;
}

export function cleanFindAGraveCitation(citation, refText) {
  citation = addHeading(citation, refText);
  citation = addAccessedDate(citation);
  citation = fixDashes(citation);
  citation = fixSpaces(citation);
  return citation;
}

function encodeGuid(url) {
  const urlObj = new URL(url);
  if (urlObj.hostname === "archives.gnb.ca") {
    const guid = urlObj.searchParams.get("guid");
    if (guid) {
      urlObj.searchParams.set("guid", encodeURIComponent(guid));
      return urlObj.href;
    }
  }
  return url;
}

function addHeading(citation, text) {
  citation = citation.replace(/Find a Grave/, "''Find a Grave''");
  const boldHeadingMatch = text.match(/'''(Memorial|Death|Burial)'''/);
  if (boldHeadingMatch) {
    citation = boldHeadingMatch[0] + ": " + citation;
  }
  return citation;
}

function fixDashes(citation) {
  citation = citation.replace("&ndash;", "–");
  return citation;
}

function fixSpaces(citation) {
  citation = citation.replaceAll(/\s+/g, " ");
  citation = citation.replace(" )", ")");
  return citation;
}

function addAccessedDate(citation) {
  const accessedPattern = /:\s*accessed\s*\)/;
  if (citation.match(accessedPattern)) {
    const today = new Date();
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const dateStr = `${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    citation = citation.replace(accessedPattern, `: accessed ${dateStr})`);
  }
  return citation;
}

function isFindAGraveMemorialLink(link) {
  return /findagrave\.com\/(?:memorial|cgi-bin\/fg\.cgi)/i.test(link);
}

async function getFindAGraveCitation(link) {
  const normalizedLink = normalizeFindAGraveMemorialLink(link);

  try {
    const fetchResult = await fetchFindAGraveMemorialHtml(normalizedLink);
    if (!fetchResult?.success) {
      throw new Error(fetchResult?.error || "Find a Grave request failed");
    }

    const html = fetchResult.html;
    if (!html.trim()) {
      throw new Error("Find a Grave returned an empty response");
    }

    const citation = parseFindAGraveCitationFromHtml(html, fetchResult.url || normalizedLink);
    if (!citation) {
      throw new Error("Unable to parse memorial details from Find a Grave response");
    }

    return citation;
  } catch (error) {
    setCitationFailure({
      source: "findagrave-browser-fetch",
      link: normalizedLink,
      userMessage: "WBE couldn't read this Find a Grave memorial right now. Your source text was left unchanged.",
      technicalMessage: error?.message || "Unknown Find a Grave fetch error",
    });
    console.warn("Error fetching Find a Grave citation in browser context:", error);
    return null;
  }
}

function fetchFindAGraveMemorialHtml(link) {
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      console.warn("[WBE FaG] chrome.runtime.sendMessage unavailable");
      reject(new Error("Extension messaging is unavailable for Find a Grave fetches"));
      return;
    }

    console.log("[WBE FaG] Sending fetchFindAGraveMemorial to background →", link);
    chrome.runtime.sendMessage({ action: "fetchFindAGraveMemorial", link }, (response) => {
      const runtimeError = chrome.runtime?.lastError;
      if (runtimeError) {
        console.warn("[WBE FaG] runtime.lastError:", runtimeError.message);
        reject(new Error(runtimeError.message));
        return;
      }

      console.log("[WBE FaG] Background response:", response?.success, response?.error, "url:", response?.url);
      resolve(response || { success: false, error: "No response from background fetch" });
    });
  });
}

function normalizeFindAGraveMemorialLink(link) {
  if (link.match("cgi-bin/fg.cgi") && link.match("id=")) {
    let memorial = link.split("id=")[1];
    return `https://www.findagrave.com/memorial/${memorial}`;
  }

  try {
    const url = new URL(link);
    if (url.hostname === "findagrave.com") {
      url.hostname = "www.findagrave.com";
    }
    return url.toString();
  } catch (_error) {
    return link;
  }
}

export function parseFindAGraveCitationFromHtml(html, link) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const memorialData = extractFindAGraveMemorialData(doc, link);
  if (!memorialData.name || !memorialData.memorialId || !memorialData.cemeteryName) {
    return null;
  }

  const lifeDates = `${memorialData.birthDate || "unknown"}–${memorialData.deathDate || "unknown"}`;
  const cemetery = [memorialData.cemeteryName, memorialData.cemeteryLocation].filter(Boolean).join(", ");
  let citation = `Find a Grave, database and images (${memorialData.pageUrl} : accessed), memorial page for ${memorialData.name} (${lifeDates}), Find a Grave Memorial ID ${memorialData.memorialId}, citing ${cemetery}`;

  if (memorialData.maintainer) {
    citation += ` ; Maintained by ${memorialData.maintainer}`;
  }

  return citation;
}

function extractFindAGraveMemorialData(doc, link) {
  const bodyText = normalizeFindAGraveText(doc.body?.textContent || "");
  const name = cleanFindAGraveField(doc.querySelector("h1")?.textContent || extractNameFromBody(bodyText));
  const pageUrl = cleanFindAGravePageUrl(link);
  const memorialId = extractFindAGraveId(pageUrl) || extractField(bodyText, /Find a Grave Memorial ID:\s*(\d+)/i);
  const birthBlock = extractLabeledBlock(bodyText, "BIRTH", "DEATH");
  const deathBlock = extractLabeledBlock(bodyText, "DEATH", "BURIAL");
  const burialBlock = extractLabeledBlock(bodyText, "BURIAL", "MEMORIAL ID");
  const maintainer = extractMaintainer(bodyText);

  const cemeteryName = cleanFindAGraveField(
    doc.querySelector('a[href*="/cemetery/"]')?.textContent || extractCemeteryName(burialBlock)
  );
  const cemeteryLocation = cleanFindAGraveField(extractCemeteryLocation(burialBlock, cemeteryName));

  return {
    name,
    pageUrl,
    memorialId,
    birthDate: extractEventDate(birthBlock),
    deathDate: extractEventDate(deathBlock),
    cemeteryName,
    cemeteryLocation,
    maintainer,
  };
}

function extractNameFromBody(bodyText) {
  const match = bodyText.match(/^(.+?)\s+BIRTH\b/i);
  return match ? match[1] : "";
}

function extractLabeledBlock(bodyText, startLabel, endLabel) {
  const pattern = new RegExp(`${startLabel}\\s+([\\s\\S]*?)\\s+${endLabel}\\b`, "i");
  const match = bodyText.match(pattern);
  return match ? match[1].trim() : "";
}

function extractEventDate(block) {
  const cleanedBlock = cleanFindAGraveField(block)
    .replace(/\(aged[^\)]*\)/gi, "")
    .trim();
  const dateMatch = cleanedBlock.match(
    /^(unknown|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4}|[A-Za-z]{3,9}\s+[0-9]{4}|[0-9]{4})\b/i
  );
  return dateMatch ? dateMatch[1] : "unknown";
}

function extractCemeteryName(burialBlock) {
  if (!burialBlock) {
    return "";
  }

  const cleanedBlock = cleanFindAGraveField(burialBlock)
    .replace(/\s+Add to Map$/i, "")
    .trim();
  const segments = cleanedBlock.split(/,\s*/).filter(Boolean);
  return segments.length ? segments[0] : cleanedBlock;
}

function extractCemeteryLocation(burialBlock, cemeteryName) {
  if (!burialBlock) {
    return "";
  }

  const cleanedBlock = cleanFindAGraveField(burialBlock)
    .replace(/\s+Add to Map$/i, "")
    .trim();
  if (!cemeteryName) {
    return cleanedBlock;
  }

  if (cleanedBlock.startsWith(cemeteryName)) {
    return cleanedBlock.slice(cemeteryName.length).replace(/^,\s*/, "");
  }

  return cleanedBlock;
}

function extractMaintainer(bodyText) {
  const createdByMatch = bodyText.match(/Created by:\s*(.+?)\s+Added:\s*/i);
  if (createdByMatch) {
    return cleanFindAGraveField(createdByMatch[1]).replace(
      /\s+(RELATIVE|FRIEND|SPOUSE|PARENT|CHILD|SIBLING|NIECE\/NEPHEW|GRANDCHILD|OTHER)\b.*$/i,
      ""
    );
  }

  return "Find a Grave";
}

function extractFindAGraveId(link) {
  const match = link.match(/\/memorial\/(\d+)/i);
  return match ? match[1] : "";
}

function extractField(text, pattern) {
  const match = text.match(pattern);
  return match ? cleanFindAGraveField(match[1]) : "";
}

function cleanFindAGravePageUrl(link) {
  try {
    const url = new URL(link);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch (_error) {
    return link;
  }
}

function normalizeFindAGraveText(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanFindAGraveField(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function setCitationFailure(failure) {
  lastCitationFailure = failure;
}
