import $ from "jquery";

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
  if (link.match("cgi-bin/fg.cgi") && link.match("id=")) {
    let memorial = link.split("id=")[1];
    link = "https://www.findagrave.com/memorial/" + memorial;
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
    console.error("Error fetching citation:", error);
    return null;
  }
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
