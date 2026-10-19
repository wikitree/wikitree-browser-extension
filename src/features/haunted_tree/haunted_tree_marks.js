// Haunted Tree's icons beside people's names: in the lists on the Watchlist, search results and surname pages, and
// in a profile page's heading. One getPeople call (by WikiTree ID) reads everyone in a list; a profile's heading is
// read from the profile page itself, so it needs no API call (or apps login). Each icon's tooltip says what it means.
import $ from "jquery";
import { isGenealogyPage, isProfilePage, isSearchPage, isSpecialWatchedList } from "../../core/pageType";
import { GROUPS, hauntedGroups, wikiTreeIdFromHref, wikiTreeIdKey } from "./haunted_tree_data";
import { personFromProfilePage } from "./haunted_tree_page";

// The name links in each kind of list
const NAME_LINKS = [
  "#Sort-Table tr a.text-no-break", // Watchlist and search results
  "#People dl.profiles dt.profile--name > a", // Surname pages (/genealogy/SURNAME)
].join(", ");

const GROUP_BY_KEY = Object.fromEntries(GROUPS.map((group) => [group.key, group]));

function iconsFor(groups) {
  const icons = $("<span class='ht-icons'></span>");
  for (const key of groups) {
    const group = GROUP_BY_KEY[key];
    icons.append($("<span>").text(group.icon).attr("title", `🎃 ${group.title}: ${group.meaning}`));
  }
  return icons;
}

/** The names not looked at yet, as { id: WikiTree ID, element: what the icons go after }. */
function namesToMark() {
  const names = [];
  const take = (element, id) => {
    if (element.dataset.htSeen) return;
    element.dataset.htSeen = "1";
    if (id) names.push({ id, element });
  };
  $(NAME_LINKS).each(function () {
    take(this, wikiTreeIdFromHref(this.getAttribute("href")));
  });
  return names;
}

/** Marks the names not looked at yet. fetchPeople(wikiTreeIds) gives the getPeople people. */
async function markPeople(fetchPeople) {
  const byKey = new Map();
  for (const { id, element } of namesToMark()) {
    const key = wikiTreeIdKey(id);
    if (!byKey.has(key)) byKey.set(key, { id, elements: [] });
    byKey.get(key).elements.push(element);
  }
  if (!byKey.size) return;

  const people = await fetchPeople([...byKey.values()].map((entry) => entry.id));
  const thisYear = new Date().getFullYear();
  for (const person of people) {
    const groups = hauntedGroups(person, thisYear);
    if (!groups.length) continue;
    // A link to a merged-away profile comes back as the profile it was merged into
    for (const name of [person.Name, person.redirectedFrom]) {
      const key = wikiTreeIdKey(name);
      const entry = name && byKey.get(key);
      if (!entry) continue;
      byKey.delete(key);
      for (const element of entry.elements) $(element).after(iconsFor(groups));
    }
  }
}

function markProfileHeading() {
  const heading = document.querySelector("h1 [data-cy='person-name']");
  if (!heading) return;
  const groups = hauntedGroups(personFromProfilePage(document));
  if (groups.length) $(heading).after(iconsFor(groups));
}

/** Marks the haunted people on this page (and, on the search page, any results that come later). */
export function markPeopleWhenShown(fetchPeople) {
  if (isProfilePage) {
    try {
      markProfileHeading();
    } catch (error) {
      console.error("wbe: Haunted Tree couldn't mark this profile", error);
    }
    return;
  }
  if (!isSpecialWatchedList && !isSearchPage && !isGenealogyPage) return;
  const mark = () =>
    markPeople(fetchPeople).catch((error) => console.error("wbe: Haunted Tree couldn't mark the people here", error));
  mark();
  if (isSearchPage) {
    // Search results can arrive after the page has loaded
    let timer;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(mark, 500);
    }).observe(document.body, { childList: true, subtree: true });
  }
}
