// Christmas Tree: the member's CC7 or watchlist drawn as a Christmas tree (christmas_tree_draw.js), lit where profiles
// are in good shape and dark where they need help (christmas_tree_data.js), with Advent doors that each give one
// profile and one small job (christmas_tree_doors.js). The first scan reads the whole list (seasonal_fetch.js); after
// that, opening it shows the saved scan, Re-check reads just the kept profiles again, a door's "I've done it" reads
// just that profile, and Full rescan reads the whole list again. Each list has its own saved scan and doors.
import $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { getUserNumId, oncePerTab } from "../../core/common";
import { createAppsLoginButton, pageHadAuthcode, redeemAuthcode } from "../../core/loginButton";
import { sortPeople } from "../haunted_tree/haunted_tree_data";
import {
  fetchByIds as fetchByIdsFor,
  fetchOne as fetchOneFor,
  fetchCC7 as fetchCC7For,
  fetchWatchlist as fetchWatchlistFor,
  PAGE_SIZE,
} from "../seasonal_tree/seasonal_fetch";
import {
  CHRISTMAS_FIELDS,
  christmasFromScan,
  GROUP_BY_KEY,
  GROUPS,
  groupsFor,
  needsHelp,
  recheckChristmas,
  rowLabel,
  summarize,
  treeRows,
} from "./christmas_tree_data";
import {
  canSwap,
  checkDoors,
  CHRISTMAS_DOOR,
  DOOR_COUNT,
  EMPTY_JOB,
  FOLK_JOB,
  openDoor,
  openDoorCount,
  seasonOf,
  starLit,
  swapDoor,
} from "./christmas_tree_doors";
import { drawTree, isSummerChristmas, rowDescription } from "./christmas_tree_draw";
import { lastSource, loadChristmasTree, rememberSource, saveChristmasTree } from "./christmas_tree_store";
import "./christmas_tree.css";

const APP_ID = "christmas_tree";
const POPUP_ID = "christmasTree";
// Set (per tab) when the member goes off to log in to the apps server, so we can carry on when they come back
const RUN_AFTER_LOGIN_KEY = "christmasTreeRunAfterLogin";
// The doors' places on the calendar, jumbled as on a real one
// Door 25 comes first so the grid places it (big, in the middle) before the small doors fill in around it
const DOOR_ORDER = [25, 7, 15, 1, 20, 11, 4, 23, 9, 17, 2, 13, 24, 5, 19, 10, 3, 22, 8, 14, 21, 6, 12, 18, 16];

const SOURCES = {
  cc7: {
    label: "Your CC7",
    your: "your CC7",
    people: "relatives",
    gathering: "Gathering your relatives…",
    rescan: "Read your whole CC7 again, to find new relatives",
  },
  watchlist: {
    label: "Your watchlist",
    your: "your watchlist",
    people: "profiles",
    gathering: "Gathering your watchlist…",
    rescan: "Read your whole watchlist again, to find profiles you've added",
  },
};

let busy = false;

const fetchCC7 = (userNumId, onProgress) => fetchCC7For(APP_ID, userNumId, CHRISTMAS_FIELDS, onProgress);
const fetchWatchlist = (onProgress) => fetchWatchlistFor(APP_ID, CHRISTMAS_FIELDS, onProgress);
const fetchByIds = (ids) => fetchByIdsFor(APP_ID, ids, CHRISTMAS_FIELDS);
const fetchOne = (id) => fetchOneFor(APP_ID, id, CHRISTMAS_FIELDS);

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
    // Then the member just chooses Christmas Tree again after logging in
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

function timeAgo(timestamp) {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes == 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours == 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days == 1 ? "" : "s"} ago`;
}

const stepsFromYou = (degrees) => (degrees ? `${degrees} step${degrees == 1 ? "" : "s"} from you` : "");
const profileHref = (name) => `/wiki/${encodeURIComponent(name)}`;
const editHref = (id) => `/index.php?title=Special:EditPerson&u=${id}`;

function createPopup() {
  const popup = $(`<div id="${POPUP_ID}" class="wbe-popup">
    <div class="ct-header">
      <h2>🎄 Christmas Tree</h2>
      <button class="close-popup" title="Close" aria-label="Close">&times;</button>
    </div>
    <div class="ct-sources" role="group" aria-label="Which list to light up"></div>
    <div class="ct-body"></div>
  </div>`);
  for (const [source, { label, your }] of Object.entries(SOURCES)) {
    const tab = $(`<button class="ct-source" aria-pressed="false"></button>`).text(label);
    tab.attr({ "data-source": source, title: `The tree of ${your}` });
    tab.on("click", () => !busy && showSource(popup, source));
    popup.find(".ct-sources").append(tab);
  }
  popup.find(".close-popup").on("click", () => popup.fadeOut(200, () => popup.remove()));
  $("body").append(popup);
  popup.css("left", Math.max(16, ($(window).width() - popup.outerWidth()) / 2));
  popup.draggable({ handle: ".ct-header", cancel: ".close-popup" });
  return popup;
}

// Test mode, for trying the doors on other days: set localStorage wbeChristmasTreeTestDate to a date ("2026-12-10") in
// the console on any WikiTree page. wbeChristmasTreeTestSummer "1" or "0" picks the summer or snowy picture. While a
// test date is set, a bar at the top of the popup changes or stops it, and the doors opened are kept apart from the
// member's real ones (under their Id + "-test"), starting from a copy of the real record.
const TEST_DATE_KEY = "wbeChristmasTreeTestDate";
const TEST_SUMMER_KEY = "wbeChristmasTreeTestSummer";

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (error) {
    // Only test mode uses this
  }
}

/** The test date, at midday, or null when not testing. */
function testDate() {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(readStorage(TEST_DATE_KEY) || "");
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12) : null;
}

/** Today, or the test date. */
const today = () => testDate() || new Date();

/** The summer picture: in the southern hemisphere, unless test mode says otherwise. */
function summerScene() {
  const forced = readStorage(TEST_SUMMER_KEY);
  return forced === "1" ? true : forced === "0" ? false : isSummerChristmas();
}

const storeId = (userNumId) => (testDate() ? `${userNumId}-test` : userNumId);

/** This list's record for this season: in test mode, the test copy, or else a copy of the real one. */
async function loadRecord(userNumId, source) {
  const season = seasonOf(today());
  if (!testDate()) return loadChristmasTree(userNumId, season, source);
  return (
    (await loadChristmasTree(storeId(userNumId), season, source)) ||
    (await loadChristmasTree(userNumId, season, source))
  );
}

const saveRecord = (userNumId, record, source) => saveChristmasTree(storeId(userNumId), record, source);

function isoDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The test-mode bar: change the date or the picture, start the test doors again, or stop testing. */
function testBar(popup) {
  const date = testDate();
  const bar = $("<div class='ct-test-bar' role='region' aria-label='Test mode'>");
  const reload = () => showSource(popup, popup.data("source") || "cc7");
  const dateInput = $("<input type='date'>")
    .val(isoDate(date))
    .on("change", function () {
      if (this.value) writeStorage(TEST_DATE_KEY, this.value);
      reload();
    });
  const step = (days) =>
    button(days < 0 ? "◀ Day" : "Day ▶", days < 0 ? "The day before" : "The next day", () => {
      const next = new Date(date);
      next.setDate(next.getDate() + days);
      writeStorage(TEST_DATE_KEY, isoDate(next));
      reload();
    });
  const summer = $("<input type='checkbox'>")
    .prop("checked", summerScene())
    .on("change", function () {
      writeStorage(TEST_SUMMER_KEY, this.checked ? "1" : "0");
      reload();
    });
  bar.append(
    $("<strong>").text("🧪 Test mode "),
    $("<label>").append("Date: ", dateInput),
    " ",
    step(-1),
    " ",
    step(1),
    " ",
    $("<label>").append(summer, " Southern hemisphere"),
    " ",
    button("Start the test doors again", "Forget the doors opened in test mode", async () => {
      const userNumId = getUserNumId();
      for (const source of Object.keys(SOURCES)) {
        const record = await loadChristmasTree(`${userNumId}-test`, seasonOf(date), source);
        if (record) await saveChristmasTree(`${userNumId}-test`, { ...record, season: -1 }, source);
      }
      reload();
    }),
    " ",
    button("Stop testing", "Back to today's date and your real doors", () => {
      writeStorage(TEST_DATE_KEY, null);
      writeStorage(TEST_SUMMER_KEY, null);
      reload();
    }),
    $("<p class='ct-meaning'>").text(
      "Doors opened in test mode are kept apart from your real ones, so the real December isn't spoiled."
    )
  );
  return bar;
}

function body(popup) {
  const container = popup.find(".ct-body").empty();
  if (testDate()) container.append(testBar(popup));
  return container;
}

function selectSource(popup, source) {
  rememberSource(source);
  popup.data("source", source);
  popup.find(".ct-source").each(function () {
    $(this).attr("aria-pressed", String(this.dataset.source === source));
  });
}

/** This list's saved scan, or the intro if it hasn't been scanned this season. */
async function showSource(popup, source) {
  selectSource(popup, source);
  const record = await loadRecord(getUserNumId(), source);
  if (popup.data("source") !== source || busy) return; // something else was chosen meanwhile
  if (record) showRecord(popup, record, source);
  else showIntro(popup, source);
}

function button(label, title, onClick) {
  return $(`<button class="small button ct-button"></button>`).text(label).attr("title", title).on("click", onClick);
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
        ? "Christmas Tree reads your CC7 and draws it as a tree, one row for each degree,"
        : "Christmas Tree reads your watchlist and draws it as a tree, one row for each century,") +
        " with a light for everyone. Profiles in good shape are lit; the dark ones need a little help: no dates, " +
        "no death date, no sources, no parents" +
        (source === "cc7" ? "" : ", or not connected to the global family tree") +
        "."
    ),
    $("<p>").text(
      "Each day in December an Advent door opens with one profile and one small job. Do the job, and a light " +
        "comes on. Do every door so far, and the star on top shines."
    ),
    size ? $("<p>").text(size) : "",
    $("<p>").append(button("Light the tree", `Read ${SOURCES[source].your} now`, () => run(popup, "scan", source)))
  );
}

function showLogin(popup, action, source) {
  const pill = createAppsLoginButton(APP_ID, "Log in to the WikiTree apps server. You'll come straight back here.");
  pill.on("click", () => setRunAfterLogin(action, source));
  body(popup).append(
    $("<p>").text(
      `Christmas Tree reads ${SOURCES[source].your} through the WikiTree apps server, so you need to log in there ` +
        "first. You'll come straight back here and the tree will be lit."
    ),
    $("<p>").append(pill)
  );
}

function showWorking(popup, text) {
  body(popup).append($(`<p class="ct-working"></p>`).text(text));
}

function showError(popup, error, source) {
  body(popup).append(
    $("<p class='ct-error'>").text(`The lights wouldn't come on: ${error?.message || error}. Try again later.`),
    $("<p>").append(button("Try again", `Read ${SOURCES[source].your} again`, () => run(popup, "scan", source)))
  );
}

function personItem(person) {
  const item = $("<li>");
  item.append(
    $(`<a target="_blank"></a>`)
      .attr("href", profileHref(person.Name))
      .text(person.LongName || person.Name)
  );
  if (person.years) item.append($("<span class='ct-years'>").text(` (${person.years})`));
  const icons = person.groups.map((key) => GROUP_BY_KEY[key]).filter((group) => group?.scored);
  if (icons.length) {
    item.append(" ", $("<span class='ct-icons'>").text(icons.map((group) => group.icon).join("")));
    item.attr(
      "title",
      [stepsFromYou(person.Degrees), ...icons.map((group) => group.one || group.title)].filter(Boolean).join(". ")
    );
  }
  item.append(" ", $(`<a class="ct-edit" target="_blank">edit</a>`).attr("href", editHref(person.Id)));
  return item;
}

/** A collapsed group whose list is only built when it's opened (it can run to thousands). */
function groupSection(icon, title, meaning, people) {
  const section = $(`<details class="ct-group"><summary></summary></details>`);
  section.find("summary").text(`${icon} ${title} (${people.length.toLocaleString()})`);
  section.append($("<p class='ct-meaning'>").text(meaning));
  if (!people.length) {
    section.addClass("ct-empty");
    return section;
  }
  section.one("toggle", () => {
    const list = $("<ol>");
    for (const person of sortPeople(people)) list.append(personItem(person));
    section.append(list);
  });
  return section;
}

/** The people on one row of the tree who need help, under the tree. */
function showRow(popup, record, source, key) {
  const panel = popup.find(".ct-row-people").empty();
  const row = treeRows(record.rows, record.people, source).find((r) => r.key === key);
  if (!row) return;
  const people = record.people.filter((person) => person.row === key && needsHelp(person.groups));
  panel.append(
    $("<div class='ct-row-heading'>").append(
      $("<strong>").text(rowDescription(row, SOURCES[source].people)),
      " ",
      button("Close", "Close this list", () => panel.empty())
    )
  );
  if (people.length) {
    const list = $("<ol>");
    for (const person of sortPeople(people)) list.append(personItem(person));
    panel.append(list);
  } else {
    panel.append($("<p>").text("Every light on this row is on."));
  }
  panel[0].scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function doorState(door, number, openCount) {
  if (number > openCount) return "locked";
  if (!door) return "ready";
  return door.done ? "done" : "open";
}

function doorButton(popup, record, source, number, openCount, todayDoor) {
  const door = record.doors.find((d) => d.door === number);
  const state = doorState(door, number, openCount);
  const label = $("<span class='ct-door-number'>").text(number);
  const el = $(`<button class="ct-door"></button>`).addClass(`ct-door-${state}`).attr("data-door", number);
  el.append(label);
  if (state === "done") el.append($("<span class='ct-door-mark'>").text(door.job === FOLK_JOB ? "🎄" : "⭐"));
  if (state === "open") el.append($("<span class='ct-door-mark'>").text(GROUP_BY_KEY[door.job]?.icon || ""));
  if (number === todayDoor && state !== "locked") el.addClass("ct-door-today");
  if (number === CHRISTMAS_DOOR) {
    el.addClass("ct-door-christmas");
    if (state === "locked" || state === "ready") el.append($("<span class='ct-door-mark'>").text("🎁"));
  }
  const titles = {
    locked:
      number === CHRISTMAS_DOOR
        ? "Opens on Christmas Day"
        : openCount
        ? `Opens on ${number} December`
        : "The doors open on 1 December",
    ready: `Open door ${number}`,
    open: `Door ${number}: ${door?.LongName || door?.Name || ""}`,
    done: `Door ${number}: done`,
  };
  el.attr({ title: titles[state], "aria-label": titles[state] });
  if (state === "locked") el.prop("disabled", true);
  else el.on("click", () => !busy && clickDoor(popup, record, source, number));
  return el;
}

async function clickDoor(popup, record, source, number) {
  if (!record.doors.some((d) => d.door === number)) {
    const { doors, door } = openDoor(record.doors, number, record.people, today());
    if (!door) return;
    record = { ...record, doors };
    await saveRecord(getUserNumId(), record, source);
  }
  showRecord(popup, record, source, { door: number });
}

/** What's behind an opened door, with its buttons. `note` says how a check went. */
function doorPanel(popup, record, source, number, note) {
  const door = record.doors.find((d) => d.door === number);
  const panel = $("<div class='ct-door-panel' role='region'>").attr("aria-label", `Door ${number}`);
  panel.append($("<h3>").text(number === CHRISTMAS_DOOR ? `Door ${number}: Christmas Day 🎁` : `Door ${number}`));
  if (!door) return panel;
  if (door.job === EMPTY_JOB) {
    return panel.append(
      $("<p>").text(`Everyone on ${SOURCES[source].your} has been helped already. Merry Christmas! 🎄`)
    );
  }
  // The kept profile is read again on every check, so its name and years are newer than the door's
  const person = record.people.find((p) => String(p.Id) === String(door.Id));
  const years = person?.years ?? door.years;
  const name = $(`<a target="_blank"></a>`)
    .attr("href", profileHref(person?.Name || door.Name))
    .text(person?.LongName || door.LongName || door.Name);
  const who = $("<p class='ct-door-who'>").append(name);
  if (years) who.append($("<span class='ct-years'>").text(` (${years})`));
  const about = [stepsFromYou(door.Degrees), person?.managed ? "you manage this profile" : ""].filter(Boolean);
  if (about.length) who.append($("<span class='ct-about'>").text(` · ${about.join(" · ")}`));
  panel.append(who);

  if (door.job === FOLK_JOB) {
    const day = { born: "was born", died: "died", both: "was born and died" }[person?.christmasDay] || "is linked to";
    const intro = number === CHRISTMAS_DOOR ? "🎁 Your Christmas present" : "🎄 Christmas folk";
    panel.append(
      $("<p>").text(
        `${intro}: ${door.LongName || door.Name} ${day} on Christmas Day. Nothing to do here: just a ` +
          "relative to remember this Christmas."
      )
    );
    return panel;
  }

  const group = GROUP_BY_KEY[door.job];
  // Once done, the meaning ("Marked {{Unsourced}}") is no longer true, so just the job's name
  const title = group.one || group.title;
  const groupText = door.done ? `${group.icon} ${title}` : `${group.icon} ${title}: ${group.meaning}`;
  panel.append($("<p class='ct-door-group'>").text(groupText));
  if (door.done) {
    panel.append($("<p class='ct-door-thanks'>").text("⭐ Done! A light has come on. Thank you."));
  } else {
    panel.append($("<p class='ct-door-job'>").append($("<strong>").text("Your job: "), group.job));
    const actions = $("<p class='ct-actions'>");
    actions.append(
      $(`<a class="small button ct-button" target="_blank">Edit the profile</a>`).attr("href", editHref(door.Id)),
      " ",
      button("I've done it: check", "Read this profile again to see if the job is done", () =>
        checkOneDoor(popup, record, source, number)
      )
    );
    if (canSwap(door)) {
      actions.append(
        " ",
        button("Pick someone else", "Swap this person for someone else (once for each door)", async () => {
          if (busy) return;
          const { doors } = swapDoor(record.doors, number, record.people);
          const next = { ...record, doors };
          await saveRecord(getUserNumId(), next, source);
          showRecord(popup, next, source, { door: number });
        })
      );
    }
    panel.append(actions);
  }
  if (door.swappedFrom != null) panel.append($("<p class='ct-meaning'>").text("Swapped once."));
  if (note) panel.append($("<p class='ct-door-note' role='status'>").text(note));
  return panel;
}

/** What "Not yet" says: what WikiTree still shows, what's often missed, and that the apps database can lag. */
function notYetNote(job) {
  const group = GROUP_BY_KEY[job];
  return [
    group ? `Not yet: WikiTree still shows "${group.meaning.replace(/\.$/, "")}".` : "Not yet.",
    group?.notYet,
    "If you've only just saved, please try again in a few minutes. The apps database may be a little behind the main " +
      "database.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** "I've done it": read just this door's profile again. */
async function checkOneDoor(popup, record, source, number) {
  const userNumId = getUserNumId();
  const door = record.doors.find((d) => d.door === number);
  if (busy || !userNumId || !door) return;
  busy = true;
  popup.find(".ct-door-panel .ct-button").prop("disabled", true);
  try {
    if (!(await isLoggedIntoAPI(userNumId))) {
      showLogin(popup, "recheck", source);
      return;
    }
    // By WikiTree ID: getProfile takes a number as a page Id. Old doors without a Name use getPeople.
    const fresh = door.Name ? await fetchOne(door.Name) : await fetchByIds([door.Id]);
    const { people } = recheckChristmas(record.people, fresh, today().getFullYear(), source, userNumId);
    const doors = checkDoors(record.doors, people, fresh);
    const next = { ...record, people, doors, checkedAt: Date.now() };
    await saveRecord(userNumId, next, source);
    const done = doors.find((d) => d.door === number)?.done;
    const note = done
      ? ""
      : !fresh.length
      ? "Couldn't read that profile just now. Try again in a minute."
      : notYetNote(door.job);
    showRecord(popup, next, source, { door: number, note });
  } catch (error) {
    console.error("Christmas Tree:", error);
    showRecord(popup, record, source, { door: number, note: `That didn't work: ${error?.message || error}` });
  } finally {
    busy = false;
  }
}

function doorsSection(popup, record, source, options) {
  const now = today();
  const openCount = openDoorCount(now);
  const todayDoor = now.getMonth() === 11 ? now.getDate() : 0;
  const section = $("<div class='ct-doors'>");
  const done = record.doors.filter((d) => d.done).length;
  section.append(
    $("<h3>").text("Advent doors"),
    $("<p class='ct-status'>").text(
      !openCount
        ? "Door 1 opens on 1 December, then one more each day until Christmas Day."
        : openCount < DOOR_COUNT
        ? `${done} of ${openCount} door${openCount == 1 ? "" : "s"} done so far. One new door opens each day; ` +
          "if you miss a day, its door stays open, so you can catch up."
        : `${done} of ${openCount} doors done.`
    )
  );
  const grid = $("<div class='ct-door-grid'>");
  for (const number of DOOR_ORDER) grid.append(doorButton(popup, record, source, number, openCount, todayDoor));
  section.append(grid);
  if (options.door) section.append(doorPanel(popup, record, source, options.door, options.note));
  return section;
}

/** Saves the tree as a PNG, drawn twice the size for sharp edges. */
function savePicture(record, source) {
  const svg = drawTree(treeRows(record.rows, record.people, source), {
    starLit: starLit(record.doors, today()),
    summer: summerScene(),
    noun: SOURCES[source].people,
  });
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = image.width * 2;
    canvas.height = image.height * 2;
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `christmas-tree-${source}-${record.season}.png`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(link.href);
      }, 30000);
    }, "image/png");
  };
  image.src = url;
}

function treeSection(popup, record, source) {
  const rows = treeRows(record.rows, record.people, source);
  const noun = SOURCES[source].people;
  const section = $("<div class='ct-tree'>");
  const picture = $("<div class='ct-picture'>").html(
    drawTree(rows, {
      starLit: starLit(record.doors, today()),
      noun,
      title: `The Christmas Tree of ${SOURCES[source].your}`,
      summer: summerScene(),
    })
  );
  picture.on("click", ".ct-tier", function () {
    showRow(popup, record, source, this.dataset.row);
  });
  picture.on("keydown", ".ct-tier", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    showRow(popup, record, source, this.dataset.row);
  });
  const list = $("<ul class='ct-rows'>");
  for (const row of rows) {
    const item = $("<li>");
    const link = $(`<button class="ct-row-link"></button>`)
      .text(rowLabel(row.key, source))
      .attr("title", rowDescription(row, noun))
      .on("click", () => showRow(popup, record, source, row.key));
    item.append(
      link,
      $("<span class='ct-row-count'>").text(` ${row.lit.toLocaleString()} of ${row.total.toLocaleString()} lit`)
    );
    list.append(item);
  }
  return section.append(picture, list);
}

function showRecord(popup, record, source, options = {}) {
  const { label, people: noun, rescan } = SOURCES[source];
  const { dark, total, percentLit } = summarize(record.rows, record.people);
  const container = body(popup);

  let status = `Scanned ${timeAgo(record.scannedAt)}: ${total.toLocaleString()} ${noun}.`;
  if (record.checkedAt > record.scannedAt) status += ` Re-checked ${timeAgo(record.checkedAt)}.`;
  container.append($("<p class='ct-status'>").text(status));
  // The CC7 count includes relatives WikiTree won't name to the member (Help:Connection_Counts). Said only for a big gap.
  if (record.cc7Total && record.cc7Total - total > Math.max(5, record.cc7Total / 100)) {
    container.append(
      $("<p class='ct-status'>").text(
        `WikiTree sent ${total.toLocaleString()} of the ${record.cc7Total.toLocaleString()} people in your CC7. ` +
          "It counts some relatives whose names it keeps private, so Christmas Tree can't check them."
      )
    );
  }

  const score = $("<p class='ct-score'>");
  if (dark) {
    score.append(
      `${label} is `,
      $("<strong>").text(`${percentLit}% lit`),
      `: ${dark.toLocaleString()} light${dark == 1 ? "" : "s"} still out.`
    );
  } else {
    score.text(`Every light is on. ${label} is 100% lit!`);
  }
  container.append(score);

  const actions = $("<p class='ct-actions'>");
  const recheck = button("Re-check", "Look again at just the profiles that need help, to see which are now lit", () =>
    run(popup, "recheck", source)
  );
  if (!record.people.length) recheck.prop("disabled", true);
  actions.append(
    recheck,
    " ",
    button("Full rescan", rescan, () => run(popup, "scan", source)),
    " ",
    button("Save picture", "Save the tree as a picture (PNG), to share", () => savePicture(record, source))
  );
  container.append(actions);

  container.append(
    $("<div class='ct-main'>").append(treeSection(popup, record, source), doorsSection(popup, record, source, options)),
    $("<div class='ct-row-people'>")
  );

  const keys = groupsFor(source);
  for (const group of GROUPS.filter(({ key }) => keys.includes(key))) {
    const people = record.people.filter((person) => person.groups.includes(group.key));
    const meaning = group.scored ? group.meaning : `${group.meaning} Not counted as needing help.`;
    container.append(groupSection(group.icon, group.title, meaning, people));
  }
  if (options.door) container.find(".ct-door-panel")[0]?.scrollIntoView({ block: "nearest" });
}

/** "scan" reads the whole list ("cc7" or "watchlist"); "recheck" reads just the kept profiles. */
async function run(popup, action, source) {
  const userNumId = getUserNumId();
  if (busy || !userNumId) return;
  busy = true;
  selectSource(popup, source);
  popup.find(".ct-source").prop("disabled", true);
  try {
    WikiTreeAPI.clearCachedApiLoginStatus(userNumId); // they may have logged in or out elsewhere
    if (!(await isLoggedIntoAPI(userNumId))) {
      showLogin(popup, action, source);
      return;
    }
    const season = seasonOf(today());
    const before = await loadRecord(userNumId, source);
    const thisYear = today().getFullYear();
    const now = Date.now();
    let record;
    if (action === "recheck" && before?.people.length) {
      showWorking(popup, `Checking on ${before.people.length.toLocaleString()} ${SOURCES[source].people}…`);
      const fresh = await fetchByIds(before.people.map((person) => person.Id));
      const { people } = recheckChristmas(before.people, fresh, thisYear, source, userNumId);
      record = { ...before, people, doors: checkDoors(before.doors || [], people, fresh), checkedAt: now };
    } else {
      const cc7Total = source === "cc7" ? getCC7Total() : null;
      const { gathering } = SOURCES[source];
      showWorking(popup, gathering);
      const onProgress = (count, total) => {
        const of = total ? ` of ${total.toLocaleString()}` : "";
        popup.find(".ct-working").text(`${gathering} ${count.toLocaleString()}${of}`);
      };
      const read =
        source === "cc7"
          ? await fetchCC7(userNumId, (count) => onProgress(count, cc7Total))
          : await fetchWatchlist(onProgress);
      const { rows, people } = christmasFromScan(read, thisYear, source, userNumId);
      record = {
        season,
        scannedAt: now,
        checkedAt: now,
        looksFor: groupsFor(source),
        cc7Total,
        rows,
        people,
        doors: checkDoors(before?.doors || [], people, read),
      };
    }
    await saveRecord(userNumId, record, source);
    showRecord(popup, record, source);
  } catch (error) {
    console.error("Christmas Tree:", error);
    showError(popup, error, source);
  } finally {
    busy = false;
    popup.find(".ct-source").prop("disabled", false);
  }
}

/** Opens the popup on this list (the one last looked at, if not given), and runs the action if there is one. */
async function openChristmasTree(action, source = lastSource()) {
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
      `<li><a href="#n" class="dropdown-item christmasTreeMenuItem" title="Your CC7 or watchlist as a Christmas tree, with an Advent door a day">🎄 Christmas Tree</a></li>`
    );
    item.insertBefore($(this).parent());
    item.on("click", (e) => {
      e.preventDefault();
      openChristmasTree();
    });
  });
}

shouldInitializeFeature("christmasTree").then((enabled) => {
  if (!enabled || !getUserNumId()) return;
  oncePerTab(() => {
    addMenuItem();
    const pending = takeRunAfterLogin();
    if (pending && pageHadAuthcode()) openChristmasTree(pending.action, pending.source);
  });
});
