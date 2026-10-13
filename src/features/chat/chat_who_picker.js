// The "About: [Ted ▾]" picker above Genie's box (the user, 2026-10-11): people asked about the
// profile they were on and never typed. Choosing someone sets who the chart buttons draw and who
// "his"/"her" means. The list: this profile, you, the profile's family and the other people on the
// page, people named in this chat, and your watchlist (as you type, or browsed from "Your watchlist").

import { escapeText, yearOf } from "./chat_text_utils";

const MAX_MATCHES = 8;
let pickerCount = 0;

function fold(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** "1850–1912", "b. 1850", "d. 1912" or "". */
export function lifeYearsText(birthDate, deathDate) {
  const born = yearOf(birthDate);
  const died = yearOf(deathDate);
  if (born && died) return `${born}–${died}`;
  if (born) return `b. ${born}`;
  if (died) return `d. ${died}`;
  return "";
}

/** Watchlist entries as picker people: {wtId, name, years}. */
export function watchlistPickerPeople(entries, displayName = (person) => person?.RealName || person?.Name) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => entry?.profile || entry?.person || entry)
    .filter((person) => person && String(person.Name || "").trim())
    .map((person) => ({
      wtId: String(person.Name).trim(),
      name: String(displayName(person) || person.Name).trim(),
      years: lifeYearsText(person.BirthDate, person.DeathDate),
    }));
}

/**
 * The people whose name or ID has every typed word at the start of one of its words, best first:
 * the name starting with the text, then the first word matching, then the rest (in list order).
 */
export function matchPickerPeople(people, query, limit = MAX_MATCHES) {
  const words = fold(query).split(/[\s,]+/).filter(Boolean);
  if (!words.length) return [];
  const whole = fold(query).trim();
  const scored = [];
  let best = 0;
  for (const person of Array.isArray(people) ? people : []) {
    if (!person._words) {
      const name = fold(person.name);
      person._name = name;
      // (the whole ID too, for "beacall-6")
      person._words = [...`${name} ${fold(person.wtId)}`.split(/[\s()"'’.,-]+/).filter(Boolean), fold(person.wtId)];
    }
    if (!words.every((word) => person._words.some((candidate) => candidate.startsWith(word)))) continue;
    const score = person._name.startsWith(whole) ? 0 : person._words[0]?.startsWith(words[0]) ? 1 : 2;
    scored.push([score, scored.length, person]);
    if (score === 0 && ++best >= limit) break;
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .slice(0, limit)
    .map(([, , person]) => person);
}

/** A WikiTree ID as typed ("beacall-6" → "Beacall-6"), or "". */
export function typedWikiTreeId(text) {
  const value = String(text || "").trim();
  if (!/^[\p{L}][\p{L}\p{M}'_ -]*-\d+$/u.test(value)) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/ /g, "_");
}

/** The first word of a name, for "Ask about Ted…" ("" when it isn't a plain word). */
export function pickerFirstName(person) {
  const first = String(person?.name || "").trim().split(/\s+/)[0] || "";
  return /^\p{Lu}[\p{L}'’-]*$/u.test(first) ? first : "";
}

/**
 * The picker: a button showing who is chosen, opening a menu with a search box.
 * options: chosen() → person; fixedPeople() → [{wtId, name, note}]; familyPeople() → Promise of the
 * profile's relatives [{wtId, name, note, years}] (read once); pagePeople() → others linked on the page; onChoose(person);
 * loadWatchlist() → Promise<{people, message}> (read once, then kept); onSearch(text) for a name
 * that matches no one (Genie looks for it).
 */
export function createWhoPicker($, options) {
  const $root = $("<span>").addClass("chat-who");
  const $button = $("<button>").attr({ type: "button", "aria-haspopup": "listbox", "aria-expanded": "false", title: "Choose who to ask about: this profile, you, or anyone" }).addClass("chat-who-button");
  const $menu = $("<div>").addClass("chat-who-menu").attr("hidden", true);
  const $input = $("<input>").attr({ type: "text", placeholder: "Type a name or WikiTree ID", "aria-label": "Type a name or WikiTree ID", autocomplete: "off", spellcheck: "false" }).addClass("chat-who-input");
  const $list = $("<div>").addClass("chat-who-list").attr("role", "listbox");
  $menu.append($input, $list);
  $root.append($("<span>").addClass("chat-who-label").text("About"), $button, $menu);

  let watchlist = null; // {people, message} once read
  let watchlistLoading = null;
  let family = null; // the profile's relatives, once read
  let familyLoading = null;
  let mode = "all"; // or "watchlist": browsing it
  let items = [];
  let active = 0;

  function refreshButton() {
    const person = options.chosen();
    $button.empty().append($("<span>").addClass("chat-who-name").text(person?.name || person?.wtId || "you"), $("<span>").addClass("chat-who-caret").attr("aria-hidden", true).text("▾"));
  }

  function personItems(people, query, seen) {
    const shown = query ? matchPickerPeople(people, query, 50) : people;
    return shown
      .filter((person) => person?.wtId && !seen.has(person.wtId.toLowerCase()) && seen.add(person.wtId.toLowerCase()))
      .map((person) => ({ kind: "person", person }));
  }

  function render() {
    const query = String($input.val() || "").trim();
    let status = "";
    if (mode === "watchlist") {
      items = [{ kind: "back" }];
      if (!watchlist) {
        status = "Reading your watchlist…";
        loadWatchlistOnce();
      } else if (!watchlist.people.length) {
        status = watchlist.message || "Your watchlist is empty.";
      } else {
        const people = query ? matchPickerPeople(watchlist.people, query, 50) : sortedWatchlist().slice(0, 50);
        items.push(...people.map((person) => ({ kind: "person", person: { ...person, note: "" } })));
        if (!query && watchlist.people.length > 50) status = `The first 50 of ${watchlist.people.length.toLocaleString("en-US")}: type to search them all.`;
        else if (query && !people.length) status = "No one on your watchlist matches.";
      }
    } else {
      const lowered = fold(query);
      const fixed = options.fixedPeople();
      const fixedShown = query ? fixed.filter((person) => matchPickerPeople([person], query).length || fold(person.note).startsWith(lowered)) : fixed;
      const seen = new Set();
      items = personItems(fixedShown, "", seen);
      // The profile's family (from the API), then anyone else linked on the page.
      if (family) items.push(...personItems(family, query, seen));
      else loadFamilyOnce();
      items.push(...personItems(options.pagePeople?.() || [], query, seen).slice(0, query ? 8 : 12));
      if (query.length >= 2) {
        if (watchlist) {
          matchPickerPeople(watchlist.people, query)
            .filter((person) => !seen.has(person.wtId.toLowerCase()))
            .forEach((person) => items.push({ kind: "person", person: { ...person, note: "watchlist" } }));
          if (!watchlist.people.length && watchlist.message) status = watchlist.message;
        } else {
          status = "Reading your watchlist…";
          loadWatchlistOnce();
        }
        const id = typedWikiTreeId(query);
        if (id && !items.some((item) => item.person.wtId.toLowerCase() === id.toLowerCase())) items.unshift({ kind: "person", person: { wtId: id, name: id, note: "WikiTree ID" } });
        if (!id) items.push({ kind: "search", text: query });
      }
      if (!query && options.loadWatchlist) items.push({ kind: "watchlist" });
    }
    active = Math.min(active, Math.max(0, items.length - 1));
    $list.html(
      items
        .map((item, index) => {
          const selected = index === active ? ' aria-selected="true"' : "";
          if (item.kind === "search") return `<div class="chat-who-item chat-who-search" role="option" data-index="${index}"${selected}>Find “${escapeText(item.text)}” on WikiTree</div>`;
          if (item.kind === "watchlist") {
            const count = watchlist?.people.length ? ` <span class="chat-who-note">${watchlist.people.length.toLocaleString("en-US")} people</span>` : "";
            return `<div class="chat-who-item chat-who-more" role="option" data-index="${index}"${selected}>Your watchlist ▸${count}</div>`;
          }
          if (item.kind === "back") return `<div class="chat-who-item chat-who-more" role="option" data-index="${index}"${selected}>◂ Back</div>`;
          const { person } = item;
          const extra = [person.years, person.note].filter(Boolean).join(" · ");
          const id = person.name === person.wtId ? "" : ` <span class="chat-who-id">${escapeText(person.wtId)}</span>`;
          return `<div class="chat-who-item" role="option" data-index="${index}"${selected}><span class="chat-who-item-name">${escapeText(person.name)}</span>${id}${extra ? ` <span class="chat-who-note">${escapeText(extra)}</span>` : ""}</div>`;
        })
        .join("") + (status ? `<div class="chat-who-status">${escapeText(status)}</div>` : "")
    );
  }

  function sortedWatchlist() {
    if (!watchlist._sorted) watchlist._sorted = [...watchlist.people].sort((a, b) => fold(a.name).localeCompare(fold(b.name)));
    return watchlist._sorted;
  }

  function loadFamilyOnce() {
    if (familyLoading || !options.familyPeople) return;
    familyLoading = Promise.resolve()
      .then(() => options.familyPeople())
      .catch(() => [])
      .then((people) => {
        family = Array.isArray(people) ? people : [];
        if (!$menu.prop("hidden")) render();
      });
  }

  function loadWatchlistOnce() {
    if (watchlistLoading) return;
    watchlistLoading = Promise.resolve()
      .then(() => options.loadWatchlist())
      .catch(() => ({ people: [], message: "Your watchlist couldn't be read." }))
      .then((result) => {
        watchlist = { people: result?.people || [], message: result?.message || "" };
        if (!$menu.prop("hidden")) render();
      });
  }

  function setMode(next) {
    mode = next;
    $input.val("").attr("placeholder", mode === "watchlist" ? "Search your watchlist" : "Type a name or WikiTree ID");
    active = 0;
    render();
    $input.trigger("focus");
  }

  function open() {
    mode = "all";
    $input.attr("placeholder", "Type a name or WikiTree ID");
    $menu.prop("hidden", false);
    $button.attr("aria-expanded", "true");
    $input.val("");
    active = 0;
    render();
    $input.trigger("focus");
  }

  function close() {
    $menu.prop("hidden", true);
    $button.attr("aria-expanded", "false");
  }

  function choose(index) {
    const item = items[index];
    if (!item) return;
    if (item.kind === "watchlist" || item.kind === "back") {
      setMode(item.kind === "watchlist" ? "watchlist" : "all");
      return;
    }
    close();
    if (item.kind === "search") {
      options.onSearch?.(item.text);
      return;
    }
    options.onChoose(item.person);
    refreshButton();
  }

  $button.on("click", () => ($menu.prop("hidden") ? open() : close()));
  $input.on("input", () => {
    active = 0;
    render();
  });
  $input.on("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!items.length) return;
      active = (active + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      render();
      $list.find('[aria-selected="true"]')[0]?.scrollIntoView?.({ block: "nearest" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (mode === "watchlist") {
        setMode("all");
        return;
      }
      close();
      $button.trigger("focus");
    }
  });
  // (mousedown, so the click lands before the input loses focus)
  $list.on("mousedown", ".chat-who-item", function (event) {
    event.preventDefault();
    // (choosing "Your watchlist" redraws the list: the "outside" check below would close the menu)
    event.stopPropagation();
    choose(Number(this.dataset.index));
  });
  const namespace = `mousedown.chatWho${++pickerCount}`;
  $(document).on(namespace, (event) => {
    if (!$root[0].isConnected) {
      $(document).off(namespace);
      return;
    }
    if (!$menu.prop("hidden") && !$root[0].contains(event.target)) close();
  });

  refreshButton();
  return { $root, refresh: refreshButton, close };
}
