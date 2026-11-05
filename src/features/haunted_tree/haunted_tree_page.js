// What Haunted Tree needs to know about a profile, read from the profile page itself (so its heading needs no API
// call), in the shape getPeople sends, for hauntedGroups(). Checked against getPeople for the same profiles on
// 2026-10-19. Anything the page doesn't show (a private profile's dates, say) is left out, so it's not taken as
// missing:
// - dates: <time itemprop="birthDate" datetime="1857-00-00"> in #Birth (deathDate in #Death); with no date, the line
//   has only the "[death date ?]" edit link, so no year at all
// - parents: the Ancestors tab (.tree--parents, which no WBE feature changes, unlike the family lists) has a cell for
//   each parent: a name link if there is one, or a .BLANK "Father?" link if not. A parent the member can't see is
//   "[private father (1930s - unknown)]" in the family lists, so that rules out headless too
// - {{Unsourced}} (however it's written) puts the profile in Category:Unsourced_Profiles
// - connected to the global tree: only a connected profile has the line near the bottom that says how far it is
//   from this week's notables ("Explorers Connection Checkers: Elisabeth is 16 degrees from Louis Jolliet, ...";
//   in 2025 just "J. R. R. is 28 degrees from Quincy Jones, ..."). It matched getPeople's Connected for all 77
//   profiles checked on 2026-10-20 (open, public and semi-private ones the member can't see in full). Only read
//   where the page has the Matches and Merges section, which comes before it, so a page that leaves out the bottom
//   sections isn't taken as unconnected
// - living: the small line under the name says "Smith-304528: Person #38227665 | Living Person" or
//   "Unknown-206595: Person #6202029 | Not Living | Has Children", with "Living" linked to Help:Living_People
//   (2026-10-20, logged in). Matches getPeople's IsLiving for both
// - the WikiTree ID is #pageData's data-mnamedb (so project accounts, WikiTree-N, can be left out)

function textWithout(element, selector) {
  const copy = element.cloneNode(true);
  copy.querySelectorAll(selector).forEach((child) => child.remove());
  return copy.textContent;
}

function readDate(doc, section, prop) {
  const line = doc.getElementById(section);
  if (!line) return {};
  const datetime = line.querySelector(`time[itemprop='${prop}']`)?.getAttribute("datetime");
  if (datetime) return { date: datetime };
  const text = textWithout(line, "[itemprop$='Place']");
  const decade = /\b(\d{3}0)s\b/.exec(text);
  if (decade) return { decade: `${decade[1]}s` };
  if (/\d{4}/.test(text)) return {};
  return { date: "0000-00-00", decade: "unknown" };
}

/**
 * A getPeople-like person from a profile page: WikiTree ID, dates, IsLiving, parents (0 only if none shown),
 * templates, and Connected.
 */
export function personFromProfilePage(doc) {
  const person = {};
  const name = doc.getElementById("pageData")?.dataset.mnamedb;
  if (name) person.Name = name;
  const birth = readDate(doc, "Birth", "birthDate");
  const death = readDate(doc, "Death", "deathDate");
  if (birth.date) person.BirthDate = birth.date;
  if (birth.decade) person.BirthDateDecade = birth.decade;
  if (death.date) person.DeathDate = death.date;
  if (death.decade) person.DeathDateDecade = death.decade;
  const livingLink = [...doc.querySelectorAll("a[href$='/wiki/Help:Living_People']")].find((link) =>
    /Person #\d+/.test(link.parentElement?.textContent || "")
  );
  if (livingLink) person.IsLiving = /\bNot\s*$/.test(livingLink.previousSibling?.textContent || "") ? 0 : 1;

  const parentCells = [...doc.querySelectorAll(".tree--parents .tree--person")];
  const noParents = parentCells.length > 0 && parentCells.every((cell) => cell.querySelector(".BLANK"));
  const privateParent = /\[private (father|mother|parent)/i.test(doc.body?.textContent || "");
  if (noParents && !privateParent) {
    person.Father = 0;
    person.Mother = 0;
  }

  const unsourced = [...doc.querySelectorAll("a[href*='Category:']")].some((link) =>
    /\/wiki\/Category:Unsourced_Profiles$/.test(link.getAttribute("href"))
  );
  person.Templates = unsourced ? [{ name: "Unsourced", params: [] }] : [];

  if (doc.getElementById("Matches")) {
    const degreesFrom = [...doc.querySelectorAll("a[href*='Special:Connection']")].some((link) =>
      /^\d+ degrees? from /.test(link.textContent.trim())
    );
    person.Connected = degreesFrom ? 1 : 0;
  }
  return person;
}
