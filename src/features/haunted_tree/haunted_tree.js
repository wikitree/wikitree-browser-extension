// Haunted Tree: a Halloween hunt through the member's CC7 or watchlist for profiles that need help (see
// haunted_tree_data.js for the groups, and haunted_tree_marks.js for the icons it adds beside people's names around
// WikiTree). The first scan reads the whole list, with paged getPeople calls for the CC7 and paged getWatchlist calls
// for the watchlist; after that, opening it shows the saved result, Re-check reads just the haunted profiles again,
// and Full rescan reads the whole list again. Each list has its own saved scan.
import $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { getUserNumId, oncePerTab } from "../../core/common";
import { createAppsLoginButton, pageHadAuthcode, redeemAuthcode } from "../../core/loginButton";
import {
  GROUPS,
  groupsFor,
  groupsNotLookedFor,
  HAUNTED_FIELDS,
  hauntedOnlyBy,
  isProjectAccount,
  mergeLaidToRest,
  readAllPages,
  recheckHaunted,
  rescanHaunted,
  sortPeople,
  summarize,
} from "./haunted_tree_data";
import { lastSource, loadHauntedTree, rememberSource, saveHauntedTree } from "./haunted_tree_store";
import { markPeopleWhenShown } from "./haunted_tree_marks";
import "./haunted_tree.css";

const APP_ID = "haunted_tree";
const POPUP_ID = "hauntedTree";
const PAGE_SIZE = 1000;
// Set (per tab) when the member goes off to log in to the apps server, so we can carry on when they come back
const RUN_AFTER_LOGIN_KEY = "hauntedTreeRunAfterLogin";

// What the popup calls each list
const SOURCES = {
  cc7: {
    label: "Your CC7",
    your: "your CC7",
    people: "relatives",
    summoning: "Summoning your relatives…",
    rescan: "Read your whole CC7 again, to find new relatives",
  },
  watchlist: {
    label: "Your watchlist",
    your: "your watchlist",
    people: "profiles",
    summoning: "Summoning your watchlist…",
    rescan: "Read your whole watchlist again, to find profiles you've added",
  },
};

let busy = false;

const thisSeason = () => new Date().getFullYear();

function getCC7Total() {
  // The member's CC7 size, from the "My WikiTree > Connections" menu item
  const text = $('nav[aria-label="My WikiTree Navigation"] a[href*="Special:MyConnections"]').text();
  const match = text.match(/\d[\d,]*/);
  return match ? Number(match[0].replace(/,/g, "")) : null;
}

function setRunAfterLogin(action, source) {
  try {
    sessionStorage.setItem(RUN_AFTER_LOGIN_KEY, `${action}:${source}`);
  } catch (error) {
    // Then the member just chooses Haunted Tree again after logging in
  }
}

/** { action, source } if the member went off to log in, or null. */
function takeRunAfterLogin() {
  try {
    const value = sessionStorage.getItem(RUN_AFTER_LOGIN_KEY);
    sessionStorage.removeItem(RUN_AFTER_LOGIN_KEY);
    if (!value) return null;
    const [action, source] = value.split(":");
    return { action, source: SOURCES[source] ? source : "cc7" };
  } catch (error) {
    return null;
  }
}

async function isLoggedIntoAPI(userNumId) {
  // Coming back from the login page, the authcode has to be redeemed before we ask
  await redeemAuthcode(APP_ID);
  return WikiTreeAPI.isLoggedIntoAPI(userNumId, APP_ID);
}

/** The whole CC7 (degrees 1 to 7), a page of 1,000 at a time. */
async function fetchCC7(userNumId, onProgress) {
  const people = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const options = { nuclear: 7, start, limit: PAGE_SIZE };
    const [status, , page] = await WikiTreeAPI.getPeople(APP_ID, userNumId, HAUNTED_FIELDS, options);
    if (status == null) throw new Error("No answer from the WikiTree API.");
    const more = status.startsWith("Maximum number of profiles");
    if (!more && status !== "") throw new Error(`The WikiTree API said: ${status}`);
    const batch = Object.values(page || {});
    people.push(...batch);
    onProgress(people.length);
    // The member comes back too, at degree 0 (live, 2026-10-19), but isn't one of their relatives
    if (!more || !batch.length) return people.filter((person) => person.Meta?.Degrees !== 0);
  }
}

/** The member's whole watchlist (person profiles only), a page of 1,000 at a time. */
function fetchWatchlist(onProgress) {
  const getPage = async (offset) => {
    const options = { limit: PAGE_SIZE, offset, getPerson: 1, getSpace: 0 };
    const [people, total, status] = await WikiTreeAPI.getWatchlist(APP_ID, HAUNTED_FIELDS, options);
    if (status) throw new Error(`The WikiTree API said: ${status}`);
    return { people: Array.isArray(people) ? people : [], total: Number(total) || 0 };
  };
  return readAllPages(getPage, PAGE_SIZE, onProgress);
}

/** Just these profiles, by Id or WikiTree ID. */
async function fetchByIds(ids) {
  const people = [];
  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const [status, , page] = await WikiTreeAPI.getPeople(APP_ID, ids.slice(i, i + PAGE_SIZE).join(","), HAUNTED_FIELDS);
    if (status == null) throw new Error("No answer from the WikiTree API.");
    people.push(...Object.values(page || {}));
  }
  return people;
}

function timeAgo(timestamp) {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes == 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours == 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days == 1 ? "" : "s"} ago`;
}

function createPopup() {
  const popup = $(`<div id="${POPUP_ID}" class="wbe-popup">
    <div class="ht-header">
      <h2>🎃 Haunted Tree</h2>
      <button class="close-popup" title="Close" aria-label="Close">&times;</button>
    </div>
    <div class="ht-sources" role="group" aria-label="Which list to hunt through"></div>
    <div class="ht-body"></div>
  </div>`);
  for (const [source, { label, your }] of Object.entries(SOURCES)) {
    const tab = $(`<button class="ht-source" aria-pressed="false"></button>`).text(label);
    tab.attr({ "data-source": source, title: `The hunt through ${your}` });
    tab.on("click", () => !busy && showSource(popup, source));
    popup.find(".ht-sources").append(tab);
  }
  popup.find(".close-popup").on("click", () => popup.fadeOut(200, () => popup.remove()));
  $("body").append(popup);
  popup.css("left", Math.max(16, ($(window).width() - popup.outerWidth()) / 2));
  popup.draggable({ handle: ".ht-header", cancel: ".close-popup" });
  return popup;
}

function body(popup) {
  return popup.find(".ht-body").empty();
}

function selectSource(popup, source) {
  rememberSource(source);
  popup.data("source", source);
  popup.find(".ht-source").each(function () {
    $(this).attr("aria-pressed", String(this.dataset.source === source));
  });
}

/** This list's saved scan, or the intro if it hasn't been scanned this season. */
async function showSource(popup, source) {
  selectSource(popup, source);
  const record = await loadHauntedTree(getUserNumId(), thisSeason(), source);
  if (popup.data("source") !== source || busy) return; // something else was chosen meanwhile
  if (record) showRecord(popup, record, source);
  else showIntro(popup, source);
}

function button(label, title, onClick) {
  return $(`<button class="small button ht-button"></button>`).text(label).attr("title", title).on("click", onClick);
}

function showIntro(popup, source) {
  const total = source === "cc7" ? getCC7Total() : null;
  const size = total
    ? `Your CC7 has ${total.toLocaleString()} people, so this takes about ${Math.ceil(
        total / PAGE_SIZE
      )} calls to the WikiTree API.`
    : "";
  body(popup).append(
    $("<p>").text(
      (source === "cc7"
        ? "Something is stirring in your family tree. Haunted Tree reads your CC7"
        : "Something is stirring in your watchlist. Haunted Tree reads it") +
        " and finds the restless spirits: the Undead (no death date), Ghosts (no dates at all), Skeletons in the " +
        "closet (unsourced), Headless Horsemen (no parents)" +
        (source === "cc7" ? " " : ", Lone wolves (not connected to the global family tree) ") +
        "and Halloween folk."
    ),
    size ? $("<p>").text(size) : "",
    $("<p>").append(button("Start the hunt", `Read ${SOURCES[source].your} now`, () => run(popup, "scan", source)))
  );
}

function showLogin(popup, action, source) {
  const pill = createAppsLoginButton(APP_ID, "Log in to the WikiTree apps server. You'll come straight back here.");
  pill.on("click", () => setRunAfterLogin(action, source));
  body(popup).append(
    $("<p>").text(
      `Haunted Tree reads ${SOURCES[source].your} through the WikiTree apps server, so you need to log in there ` +
        "first. You'll come straight back here and the hunt will begin."
    ),
    $("<p>").append(pill)
  );
}

function showWorking(popup, text) {
  body(popup).append($(`<p class="ht-working"></p>`).text(text));
}

function showError(popup, error, source) {
  body(popup).append(
    $("<p class='ht-error'>").text(`The spirits are being difficult: ${error?.message || error}. Try again later.`),
    $("<p>").append(button("Try again", `Read ${SOURCES[source].your} again`, () => run(popup, "scan", source)))
  );
}

function personItem(person) {
  const item = $("<li>");
  const name = $(`<a target="_blank"></a>`)
    .attr("href", `/wiki/${encodeURIComponent(person.Name)}`)
    .text(person.LongName || person.Name);
  item.append(name);
  if (person.years) item.append($("<span class='ht-years'>").text(` (${person.years})`));
  if (person.Degrees) item.attr("title", `${person.Degrees} step${person.Degrees == 1 ? "" : "s"} from you`);
  item.append(
    " ",
    $(`<a class="ht-edit" target="_blank">edit</a>`).attr("href", `/index.php?title=Special:EditPerson&u=${person.Id}`)
  );
  return item;
}

/**
 * A collapsed group whose list is only built when it's opened (Headless Horsemen can run to thousands). `count` is
 * what the heading shows in brackets: how many, unless it's given.
 */
function groupSection(icon, title, meaning, people, count = people.length.toLocaleString()) {
  const section = $(`<details class="ht-group"><summary></summary></details>`);
  section.find("summary").text(`${icon} ${title} (${count})`);
  section.append($("<p class='ht-meaning'>").text(meaning));
  if (!people.length) {
    section.addClass("ht-empty");
    return section;
  }
  section.one("toggle", () => {
    const list = $("<ol>");
    for (const person of sortPeople(people)) list.append(personItem(person));
    section.append(list);
  });
  return section;
}

const groupNames = (keys, icons = true) =>
  GROUPS.filter((group) => keys.includes(group.key))
    .map((group) => (icons ? `${group.icon} ${group.title}` : group.title))
    .join(" and ");

/** For a scan made before a group was added: a Full rescan will find them, so the score may go up. */
function newGroupsNote(notLookedFor) {
  if (!notLookedFor.length) return "";
  return (
    `New: Haunted Tree now looks for ${groupNames(notLookedFor)} too. This scan was made before that, so click ` +
    "Full rescan to find them. They count towards the score, so it may go up."
  );
}

/** For the first scan to count a new group (the last one was made before it was added): what it did to the score. */
function firstCountedNote(record, source) {
  const keys = record.firstCounted || [];
  if (!keys.length) return "";
  const first = `This is the first scan that counts ${groupNames(keys)}.`;
  const found = record.people.filter((person) => person.groups.some((key) => keys.includes(key)));
  if (!found.length) return `${first} It found none, so they haven't changed the score.`;
  const only = new Set(hauntedOnlyBy(record.people, keys).map((person) => String(person.Id)));
  if (!only.size) return `${first} They're all haunted in other ways too, so they haven't changed the score.`;
  const { haunted } = summarize(record.people, record.total);
  const without = summarize(
    record.people.filter((person) => !only.has(String(person.Id))),
    record.total
  ).percent;
  return (
    `${first} Of the ${haunted.toLocaleString()} restless spirits, ${only.size.toLocaleString()} ` +
    `${only.size == 1 ? "is" : "are"} only in ${groupNames(keys, false)}: without them, ${SOURCES[source].your} ` +
    `would be ${without}% haunted.`
  );
}

function showRecord(popup, record, source) {
  const { label, people: noun, rescan } = SOURCES[source];
  const { haunted, percent } = summarize(record.people, record.total);
  const container = body(popup);

  let status = `Scanned ${timeAgo(record.scannedAt)}: ${record.total.toLocaleString()} ${noun}.`;
  if (record.checkedAt > record.scannedAt) status += ` Re-checked ${timeAgo(record.checkedAt)}.`;
  container.append($("<p class='ht-status'>").text(status));
  // The CC7 count includes relatives WikiTree won't name to the member (Help:Connection_Counts): on 2026-10-19 its
  // own My Connections page listed 1,199 of a member's 1,208, and the API sent 1,192. Said only for a bigger gap.
  if (record.cc7Total && record.cc7Total - record.total > Math.max(5, record.cc7Total / 100)) {
    container.append(
      $("<p class='ht-status'>").text(
        `WikiTree sent ${record.total.toLocaleString()} of the ${record.cc7Total.toLocaleString()} people in your ` +
          "CC7. It counts some relatives whose names it keeps private (their family trees are private and you " +
          "aren't on their Trusted Lists), so Haunted Tree can't check them."
      )
    );
  }

  const score = $("<p class='ht-score'>");
  if (haunted) {
    score.append(
      `${label} is `,
      $("<strong>").text(`${percent}%`),
      ` haunted: ${haunted.toLocaleString()} restless spirit${haunted == 1 ? "" : "s"}.`
    );
  } else {
    score.text(`Not a spirit in sight. ${label} is 0% haunted!`);
  }
  container.append(score);
  const notLookedFor = groupsNotLookedFor(record, source);
  for (const note of [newGroupsNote(notLookedFor), firstCountedNote(record, source)]) {
    if (note) container.append($("<p class='ht-new'>").text(note));
  }
  const rested = record.laidToRest || [];
  if (rested.length) {
    container.append(
      $("<p class='ht-rested'>").text(`🕯️ ${rested.length.toLocaleString()} laid to rest so far. Well done!`)
    );
  }

  const actions = $("<p class='ht-actions'>");
  const recheck = button("Re-check", "Look again at just these profiles, to see which you've put right", () =>
    run(popup, "recheck", source)
  );
  if (!record.people.length) recheck.prop("disabled", true);
  actions.append(
    recheck,
    " ",
    button("Full rescan", rescan, () => run(popup, "scan", source))
  );
  container.append(actions);

  const keys = groupsFor(source);
  for (const group of GROUPS.filter(({ key }) => keys.includes(key))) {
    const meaning = [group.meaning, group.note].filter(Boolean).join(" ");
    if (notLookedFor.includes(group.key)) {
      // A Re-check may have found a few, among those haunted in other ways, but that isn't all of them
      container.append(groupSection(group.icon, group.title, meaning, [], "not looked for yet"));
      continue;
    }
    const people = record.people.filter((person) => person.groups.includes(group.key));
    container.append(groupSection(group.icon, group.title, meaning, people));
  }
  if (rested.length) {
    container.append(groupSection("🕯️", "Laid to rest", "Put right since your first scan.", rested));
  }
}

/** "scan" reads the whole list ("cc7" or "watchlist"); "recheck" reads just the saved haunted profiles. */
async function run(popup, action, source) {
  const userNumId = getUserNumId();
  if (busy || !userNumId) return;
  busy = true;
  selectSource(popup, source);
  popup.find(".ht-source").prop("disabled", true);
  try {
    WikiTreeAPI.clearCachedApiLoginStatus(userNumId); // they may have logged in or out elsewhere
    if (!(await isLoggedIntoAPI(userNumId))) {
      showLogin(popup, action, source);
      return;
    }
    const before = await loadHauntedTree(userNumId, thisSeason(), source);
    const thisYear = new Date().getFullYear();
    const now = Date.now();
    const keys = groupsFor(source);
    let record;
    if (action === "recheck" && before?.people.length) {
      showWorking(popup, `Checking on ${before.people.length.toLocaleString()} spirits…`);
      const fresh = await fetchByIds(before.people.map((person) => person.Id));
      const { people, rested } = recheckHaunted(before.people, fresh, thisYear, keys);
      record = {
        ...before,
        people,
        checkedAt: now,
        laidToRest: mergeLaidToRest(before.laidToRest || [], rested, people),
      };
    } else {
      const cc7Total = source === "cc7" ? getCC7Total() : null;
      const { summoning } = SOURCES[source];
      showWorking(popup, summoning);
      const onProgress = (count, total) => {
        const of = total ? ` of ${total.toLocaleString()}` : "";
        popup.find(".ht-working").text(`${summoning} ${count.toLocaleString()}${of}`);
      };
      const read =
        source === "cc7"
          ? await fetchCC7(userNumId, (count) => onProgress(count, cc7Total))
          : await fetchWatchlist(onProgress);
      // Project accounts aren't people, so they aren't counted at all
      const scanned = read.filter((person) => !isProjectAccount(person));
      const { people, rested } = rescanHaunted(before?.people || [], scanned, thisYear, keys);
      record = {
        season: thisSeason(),
        scannedAt: now,
        checkedAt: now,
        looksFor: keys,
        // Groups the last scan didn't look for (it was made before they were added), to say what they changed
        firstCounted: before ? groupsNotLookedFor(before, source) : [],
        total: scanned.length,
        cc7Total,
        people,
        laidToRest: mergeLaidToRest(before?.laidToRest || [], rested, people),
      };
    }
    await saveHauntedTree(userNumId, record, source);
    showRecord(popup, record, source);
  } catch (error) {
    console.error("Haunted Tree:", error);
    showError(popup, error, source);
  } finally {
    busy = false;
    popup.find(".ht-source").prop("disabled", false);
  }
}

/** Opens the popup on this list (the one last looked at, if not given), and runs the action if there is one. */
async function openHauntedTree(action, source = lastSource()) {
  const userNumId = getUserNumId();
  if (!userNumId) return;
  let popup = $(`#${POPUP_ID}`);
  if (popup.length) {
    popup.trigger("click"); // the click handler for .wbe-popup brings it to the front
    if (!action) return;
  } else {
    popup = createPopup();
  }
  if (action) return run(popup, action, source);
  return showSource(popup, source);
}

function addMenuItem() {
  $("li a.dropdown-item[href='/wiki/Special:BrowseRS']").each(function () {
    const item = $(
      `<li><a href="#n" class="dropdown-item hauntedTreeMenuItem" title="A Halloween hunt through your CC7 or watchlist for profiles that need help">🎃 Haunted Tree</a></li>`
    );
    item.insertBefore($(this).parent());
    item.on("click", (e) => {
      e.preventDefault();
      openHauntedTree();
    });
  });
}

shouldInitializeFeature("hauntedTree").then((enabled) => {
  if (!enabled || !getUserNumId()) return;
  oncePerTab(() => {
    addMenuItem();
    markPeopleWhenShown(fetchByIds);
    const pending = takeRunAfterLogin();
    if (pending && pageHadAuthcode()) openHauntedTree(pending.action, pending.source);
  });
});
