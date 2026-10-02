/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "./g2g_.css";
import { isOK, getUserWtId, treeImageURL } from "../../core/common";
import { mainDomain } from "../../core/pageType";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { addItems, attachScissorsEvent } from "../scissors/scissors";
import { getWikiTreePage } from "../../core/API/wwwWikiTree";

/**
 * Split an element's direct text nodes on every occurrence of `text` and drop a
 * copy of `link` into each gap, leaving all other child nodes untouched.
 * @param {Element} element - Element whose direct children are scanned.
 * @param {string} text - The substring to replace with a link.
 * @param {Node} link - The link node to clone into each occurrence.
 * @returns {Node[]} The rebuilt list of child nodes (text nodes interleaved with link clones).
 */
function text2Link(element, text, link) {
  const childNodes = element.childNodes;
  let modifiedNodes = [];

  for (let i = 0; i < childNodes.length; i++) {
    if (childNodes[i].nodeType === 3) {
      const nodeText = childNodes[i].textContent;

      if (nodeText.includes(text)) {
        const textSegments = nodeText.split(text);

        const nodesWithLinks = textSegments.flatMap((segment, index) => {
          const clonedLink = link.cloneNode(true);
          const textNode = document.createTextNode(segment);

          return index < textSegments.length - 1 ? [textNode, clonedLink] : [textNode];
        });

        modifiedNodes.push(...nodesWithLinks);
      } else {
        modifiedNodes.push(childNodes[i]);
      }
    } else {
      modifiedNodes.push(childNodes[i]);
    }
  }

  return modifiedNodes;
}

/**
 * Turn WikiTree IDs (e.g. "Smith-123") found in question/answer/comment text
 * into links to the matching profile, skipping look-alikes that aren't IDs
 * (decades like "pre-1700"/"mid-1800", DNA markers like "Y-37"/"CTS-4466",
 * military designations like "B-17", citations like "Ref-3", roads like
 * "US-101"). See `excludeList` for the full set.
 * @returns {void}
 */
function linkify() {
  const posts = document.querySelectorAll('div[itemprop="text"]');

  let allElements = [];
  posts.forEach((post) => {
    allElements.push(post);
    const paragraphs = post.querySelectorAll("p");
    if (paragraphs.length > 0) {
      paragraphs.forEach((paragraph) => {
        allElements.push(paragraph);
        const strongElements = paragraph.querySelectorAll("strong");
        if (strongElements.length > 0) {
          strongElements.forEach((strongElement) => {
            allElements.push(strongElement);
          });
        }
        const spanElements = paragraph.querySelectorAll("span");
        if (spanElements.length > 0) {
          spanElements.forEach((spanElement) => {
            allElements.push(spanElement);
          });
        }
      });
    }
  });

  // Things that look like WikiTree IDs (Word-Number) but aren't. We deliberately
  // don't exclude words that are also real surnames (e.g. Page-66, Ward-2).
  const excludeList = [
    // Decades: pre-1700, post-1500, mid-1800(s).
    /\bpre-\d{4}/i,
    /\bpost-\d{4}/i,
    /\bmid-\d{4}/i,
    /COVID-19/i,
    // A single letter before the hyphen is never a WikiTree ID. Covers Y-STR
    // marker counts (Y-37, Y-67, Y-111), single-letter DNA SNPs (M-269, L-21,
    // U-152, P-312) and military designations (B-17, B-29, P-51, P-38).
    /^[A-Za-zÀ-ž]-\d+$/,
    // Multi-letter DNA SNP naming authorities (CTS-4466, DF-27, FGC-...).
    // Not BY-, which is a real surname.
    /^(?:CTS|DF|FGC|FT|ZS|YP|YSC|PF)-\d+$/i,
    // Citation/reference shorthand. Deliberately omits words that are also real
    // surnames (Page, Volume, Note, Table, Verse, Chapter).
    /^(?:ref|reference|footnote|figure|fig|section)-\d+$/i,
    // Roads. Not Route- or Highway-, which are real surnames.
    /^(?:us|hwy|interstate)-\d+$/i,
  ];

  /* Regex explanation:
1. The first three lookaheads check that the string contains between 0 and 3 dashes, between 0 and 2 underscores, and between 0 and 1 apostrophes, respectively.
2. The fourth lookahead checks that there is at least one letter between A and Z, or between À and ž.
3. The final part checks for a hyphen and a number of up to 6 digits. */
  const regexPattern =
    /\b(?=(?:[^-\n]*-){0,3}[^-\n]*$)(?=(?:[^_\n]*_){0,2}[^_\n]*$)(?=(?:[^'\n]*'){0,1}[^'\n]*$)(?=.*[A-ZÀ-ž])[A-Za-zÀ-ž_\-']+-\d{1,6}\b/g;

  allElements.forEach((element) => {
    const childNodes = element.childNodes;

    childNodes.forEach((childNode, j) => {
      if (childNode.nodeType === 3) {
        const nodeText = childNode.textContent;
        let matches = nodeText.match(regexPattern);
        matches = [...new Set(matches)];
        matches = matches.filter((match) => !excludeList.some((regex) => regex.test(match)));
        const matchCount = matches.length;

        if (matches && matchCount > 0) {
          matches.forEach((match) => {
            const link = document.createElement("a");
            link.href = "https://wikitree.com/wiki/" + match;
            link.textContent = match;
            link.className = "WBE_G2G_WTID_link";
            const currentElement = element;
            const modifiedElement = currentElement.cloneNode(true);
            const modifiedNodes = text2Link(modifiedElement, match, link);
            currentElement.innerHTML = "";
            modifiedNodes.forEach((modifiedNode) => {
              const clonedNode = modifiedNode.cloneNode(true);
              currentElement.appendChild(clonedNode);
            });
          });
        }
      }
    });
  });
}

/**
 * Add "Preview"/"URL" scissors copy links to each answer/comment anchor on a
 * question page.
 * @returns {void}
 */
function addScissorsToAnswers() {
  const allAnchorNodes = document.querySelectorAll("a:not(header a)");
  for (let i = 0; i < allAnchorNodes.length; i++) {
    // Supports both:
    // https://wikitree.com/g2g/1652303/join-the-2nd-germany-research-party-on-wikitree-day?show=1657604#a1657604
    // https://www.wikitree.com/g2g/2046376#2046391

    const href = allAnchorNodes[i].href;
    const indexShow = href.indexOf("show=");
    const indexHash = href.indexOf("#");

    if ((indexShow > -1 || href.match(/\/g2g\/\d+#\d+$/)) && indexHash > -1 && indexHash < href.length - 1) {
      const number = href.substring(indexHash + 1).replace(/^[ac]/i, "");
      const plainURL = window.location.href.split("?")[0];
      //allAnchorNodes[i].href = "https://apps.wikitree.com/apps/straub620/g2gpeek.php?post=" + plainURL + "&a=" + number;

      const previewLinkItem = {
        label: "Preview",
        text: "https://apps.wikitree.com/apps/straub620/g2gpeek.php?post=" + plainURL + "&a=" + number,
        image: true,
      };

      const urlItem = {
        label: "URL",
        text: href,
      };

      const g2gScissorsClassDiv = $("<div class='g2gScissors'></div>");
      g2gScissorsClassDiv.insertAfter(allAnchorNodes[i].parentNode);

      addItems([previewLinkItem, urlItem], g2gScissorsClassDiv);
    }
  }
}

const G2G_TAG_PICKER_MAX_RESULTS = 50;
let g2gTagsPromise = null;
// Lower case tag names, worked out once per tag list rather than on every keystroke.
const g2gTagNames = new WeakMap();

/**
 * Load the G2G tag list. It's big, so it's imported as its own webpack chunk on
 * first use and the promise is cached for the life of the page.
 * @returns {Promise<Array<{tag: string, count: number}>>} The tag list (empty on failure).
 */
function loadG2GTags() {
  if (!g2gTagsPromise) {
    g2gTagsPromise = import(/* webpackChunkName: "g2g-tags" */ "./g2g_tags.json")
      .then((module) => module.default || module)
      .catch((error) => {
        console.error("WBE G2G tag picker: couldn't load the tag list.", error);
        return [];
      });
  }
  return g2gTagsPromise;
}

/**
 * Build the G2G URL for a tag's question list.
 * @param {string} tag - The tag name.
 * @returns {string} The absolute URL to that tag's page.
 */
function g2gTagURL(tag) {
  return "https://" + mainDomain + "/g2g/tag/" + encodeURIComponent(tag);
}

/**
 * Rank tag matches best-first: tags starting with the needle, then tags where a
 * word within them starts with it (so 'york' finds new_york before corkery),
 * then tags merely containing it. Within each group the input order is kept, and
 * since `names` is ordered by question count the most-used tags come first.
 * @param {string[]} names - Lower-cased tag names, ordered by question count.
 * @param {string} needle - The lower-cased, underscore-joined search term.
 * @param {number} limit - Maximum number of indexes to return.
 * @returns {number[]} Indexes into `names`, best match first, capped at `limit`.
 */
function rankG2GTagMatches(names, needle, limit) {
  const startsWith = [];
  const startsWord = [];
  const contains = [];
  for (let i = 0; i < names.length; i++) {
    const position = names[i].indexOf(needle);
    if (position === 0) {
      startsWith.push(i);
      if (startsWith.length >= limit) {
        break;
      }
    } else if (position > 0) {
      const group = names[i][position - 1] === "_" ? startsWord : contains;
      if (group.length < limit) {
        group.push(i);
      }
    }
  }
  return startsWith.concat(startsWord, contains).slice(0, limit);
}

/**
 * Find the tags matching a search query. The lower-cased name list is computed
 * once per tag array (cached in a WeakMap) rather than on every keystroke.
 * @param {Array<{tag: string, count: number}>} tags - The full tag list.
 * @param {string} query - The user's raw search input.
 * @returns {Array<{tag: string, count: number}>} Matching tags, best first, capped.
 */
function matchG2GTags(tags, query) {
  const needle = query.trim().toLowerCase().replace(/\s+/g, "_");
  if (!needle) {
    return tags.slice(0, G2G_TAG_PICKER_MAX_RESULTS);
  }
  if (!g2gTagNames.has(tags)) {
    g2gTagNames.set(
      tags,
      tags.map((tag) => tag.tag.toLowerCase())
    );
  }
  const matches = rankG2GTagMatches(g2gTagNames.get(tags), needle, G2G_TAG_PICKER_MAX_RESULTS);
  return matches.map((index) => tags[index]);
}

/**
 * Render the tag-picker dropdown from a set of matches (or an empty message).
 * @param {JQuery} results - The <ul> results element.
 * @param {Array<{tag: string, count: number}>} matches - Tags to show.
 * @returns {void}
 */
function showG2GTagPickerResults(results, matches) {
  results.empty();
  if (matches.length === 0) {
    results.append($("<li class='g2gTagPickerEmpty'>No matching tags</li>"));
  } else {
    matches.forEach(function (tag) {
      const item = $("<li class='g2gTagPickerItem'></li>");
      $("<a></a>").attr("href", g2gTagURL(tag.tag)).text(tag.tag).appendTo(item);
      $("<span class='g2gTagPickerCount'></span>").text(tag.count).appendTo(item);
      results.append(item);
    });
  }
  results.prop("hidden", false);
}

/**
 * Move the highlighted item in the tag-picker dropdown, wrapping at the ends.
 * @param {JQuery} results - The <ul> results element.
 * @param {number} direction - 1 to move down, -1 to move up.
 * @returns {void}
 */
function moveG2GTagPickerSelection(results, direction) {
  const items = results.find(".g2gTagPickerItem");
  if (items.length === 0) {
    return;
  }
  const current = items.index(items.filter(".g2gTagPickerActive"));
  let next = current + direction;
  if (next < 0) {
    next = items.length - 1;
  } else if (next >= items.length) {
    next = 0;
  }
  items.removeClass("g2gTagPickerActive");
  const active = items.eq(next).addClass("g2gTagPickerActive");
  active[0].scrollIntoView({ block: "nearest" });
}

/**
 * Build the "Find a tag" search box on the G2G Tags page: a debounced-by-nature
 * autocomplete over the whole tag list with keyboard and mouse navigation.
 * @returns {void}
 */
function addG2GTagPicker() {
  if ($("#g2gTagPicker").length) {
    return;
  }
  const surnameIndexLink = $('a[href*="/indexes/person.html"]').first();
  const anchor = surnameIndexLink.length ? surnameIndexLink.parent() : $(".qa-main-heading").first();
  if (anchor.length === 0) {
    return;
  }

  const picker = $("<div id='g2gTagPicker'></div>");
  $("<label for='g2gTagPickerInput' title='Last updated: 30 July 2026'>Find a tag:</label>").appendTo(picker);
  const input = $(
    "<input type='search' id='g2gTagPickerInput' autocomplete='off' placeholder='Type to search all G2G tags'>"
  ).appendTo(picker);
  const results = $("<ul id='g2gTagPickerResults' hidden></ul>").appendTo(picker);
  anchor.after(picker);

  let tags = null;
  loadG2GTags().then(function (loaded) {
    tags = loaded;
    // The user may have typed something while the list was loading.
    if (input.is(":focus") && input.val()) {
      showG2GTagPickerResults(results, matchG2GTags(tags, input.val()));
    }
  });

  function updateResults() {
    if (tags === null) {
      results.empty().append($("<li class='g2gTagPickerEmpty'>Loading tags…</li>")).prop("hidden", false);
      return;
    }
    showG2GTagPickerResults(results, matchG2GTags(tags, input.val()));
  }

  input.on("input focus", updateResults);

  input.on("keydown", function (event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveG2GTagPickerSelection(results, event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter") {
      const active = results.find(".g2gTagPickerActive a").first();
      const link = active.length ? active : results.find(".g2gTagPickerItem a").first();
      if (link.length) {
        event.preventDefault();
        window.location.href = link.attr("href");
      }
    } else if (event.key === "Escape") {
      results.prop("hidden", true);
    }
  });

  results.on("mouseenter", ".g2gTagPickerItem", function () {
    results.find(".g2gTagPickerItem").removeClass("g2gTagPickerActive");
    $(this).addClass("g2gTagPickerActive");
  });

  $(document).on("click", function (event) {
    if ($(event.target).closest("#g2gTagPicker").length === 0) {
      results.prop("hidden", true);
    }
  });
}

/**
 * Read the G2G feature options and wire up each enabled sub-feature on the
 * current page.
 * @returns {Promise<void>}
 */
async function initG2G() {
  const options = await getFeatureOptions("g2g");
  if (options.removeAds && getUserWtId()) {
    import("./remove_ad.css");
  }
  if (options.checkMarks) {
    g2gCheckmarks();
  }
  if (options.favorited) {
    g2gFavorited();
  }
  if (options.moreTabs) {
    addG2GButtons();
  }

  if (options.backToTop) {
    g2gBackToTop();
  }
  if (options.filter) {
    addG2GCategoryCheckboxes();
    doG2GCategories();
  }
  if (options.tagPicker && window.location.pathname.match(/^\/g2g\/tags\b/)) {
    addG2GTagPicker();
  }
  if (options.scissors) {
    g2gScissors(options.scissors_answers);
  }
  if (options.bigButtons) {
    bigG2GButtons();
  }
  if (options.reverseAnswers) {
    addReverseAnswersButton();
  }
  if (options.pageLinks) {
    g2gPageLinksAtTop();
  }
  if (options.linkify) {
    linkify();
  }

  if (options.fixHome) {
    // Temp: This won't work until G2G has the top menus.
    // document.getElementsByClassName("pureCssMenui0")[0].href = "https://" + mainDomain + "/wiki/Special:Home";
  }
  if (options.compact) {
    $("html").addClass("g2gCompact");
  }
}

shouldInitializeFeature("g2g").then((result) => {
  if (result && $(".qa-body-wrapper").length) {
    import("./g2g.css");
    initG2G();
  }
});

/**
 * Enlarge the Comment and Reply submit buttons.
 * @returns {void}
 */
function bigG2GButtons() {
  $(".qa-body-wrapper input[name$='_docomment'").addClass("bigButton");
}

// G2G shows 20 answers per page.
const G2G_ANSWERS_PER_PAGE = 20;

/**
 * Work out the `?start=` offset of every page of answers, read from the paging
 * control at the bottom of the answer list (the numbered links, ignoring
 * "next »"/"« prev").
 * @returns {number[]} One start offset per page, in order (e.g. [0, 20, 40]).
 */
function g2gAnswerPageStarts() {
  let maxPage = 1;
  document.querySelectorAll(".qa-page-links .qa-page-links-item").forEach((item) => {
    const label = (item.querySelector("a") || item).textContent.trim();
    const page = parseInt(label, 10);
    if (!isNaN(page) && String(page) === label && page > maxPage) {
      maxPage = page;
    }
  });
  const starts = [];
  for (let page = 0; page < maxPage; page++) {
    starts.push(page * G2G_ANSWERS_PER_PAGE);
  }
  return starts;
}

/**
 * The `?start=` offset of the page we're currently on.
 * @returns {number} The current start offset (0 on the first page).
 */
function g2gCurrentStart() {
  const match = window.location.search.match(/[?&]start=(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Fetch one page of the current question through the API and return its answer
 * items (still owned by the parsed document — import them before inserting).
 * @param {number} start - The `?start=` offset of the page to fetch.
 * @returns {Promise<Element[]>} The `.qa-a-list-item` elements on that page.
 */
async function g2gFetchAnswerItems(start) {
  const html = await getWikiTreePage("G2GReverseAnswers", window.location.pathname, "start=" + start);
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll(".qa-a-list .qa-a-list-item"));
}

/**
 * Add a switch (in the "N Answers" heading) that flips the answer order so the
 * newest is first, while keeping any "Best answer" pinned to the top. The
 * comments within each answer are flipped to match. When the answers span more
 * than one page, the other pages are pulled in through the API the first time
 * it's used so the whole set can be reversed at once.
 * @returns {void}
 */
function addReverseAnswersButton() {
  const title = document.getElementById("a_list_title");
  const list = document.querySelector(".qa-a-list");
  if (!title || !list || document.getElementById("wbeReverseAnswers")) {
    return;
  }

  const starts = g2gAnswerPageStarts();
  const multiPage = starts.length > 1;
  // Nothing worth reversing on a single page with fewer than two answers.
  if (!multiPage && list.querySelectorAll(".qa-a-list-item").length < 2) {
    return;
  }

  // A little On/Off switch, matching the "Active members only" toggle in
  // usability_tweaks.
  const toggle = document.createElement("span");
  toggle.id = "wbeReverseAnswers";
  toggle.className = "wbe-reverse-answers";
  toggle.setAttribute("role", "button");
  toggle.setAttribute("tabindex", "0");
  toggle.setAttribute("aria-pressed", "false");
  toggle.title = "Reverse the order of answers (newest first), keeping any Best answer at the top";
  toggle.innerHTML =
    '<span class="wbe-reverse-answers-label">Newest first</span>' +
    '<span class="wbe-reverse-answers-switch"><span class="wbe-reverse-answers-knob"></span></span>' +
    '<span class="wbe-reverse-answers-state">Off</span>';
  title.appendChild(toggle);
  const stateLabel = toggle.querySelector(".wbe-reverse-answers-state");

  // The little "shaking tree" spinner (as used by familyStatusSync etc.), shown
  // next to the switch while the other answer pages are fetched.
  let spinner = null;
  function showSpinner() {
    if (!spinner) {
      spinner = document.createElement("img");
      spinner.src = treeImageURL;
      spinner.alt = "Loading…";
      spinner.className = "wbe-reverse-answers-tree";
    }
    toggle.after(spinner);
  }
  function hideSpinner() {
    if (spinner) {
      spinner.remove();
    }
  }

  // The full set of answer items in the site's original order. Filled in lazily
  // the first time the switch is used.
  let orderedItems = null;
  let reversed = false;
  let working = false;
  // Each answer's comments in their original (oldest-first) order, captured once
  // per comment list so we can flip them back and forth with the answers.
  const originalCommentOrder = new WeakMap();

  /**
   * Reverse (or restore) the comments inside one answer item to match the
   * current `reversed` state. Comments have no "best", so the whole list flips.
   * @param {Element} answerItem - A `.qa-a-list-item` element.
   * @returns {void}
   */
  function orderComments(answerItem) {
    const commentList = answerItem.querySelector(".qa-a-item-c-list");
    if (!commentList) {
      return;
    }
    let original = originalCommentOrder.get(commentList);
    if (!original) {
      original = Array.from(commentList.querySelectorAll(":scope > .qa-c-list-item"));
      if (original.length < 2) {
        return;
      }
      originalCommentOrder.set(commentList, original);
    }
    const ordered = reversed ? original.slice().reverse() : original;
    ordered.forEach((comment) => commentList.appendChild(comment));
  }

  async function ensureAllLoaded() {
    if (orderedItems) {
      return;
    }
    if (!multiPage) {
      orderedItems = Array.from(list.querySelectorAll(".qa-a-list-item"));
      return;
    }
    // Keep the current page's live items (Q2A's inline vote/comment handlers
    // still work on them) and fetch the rest, placing each page by its start
    // offset so the combined list keeps the site's order.
    const currentStart = g2gCurrentStart();
    const byStart = new Map();
    byStart.set(currentStart, Array.from(list.querySelectorAll(".qa-a-list-item")));
    const others = starts.filter((start) => start !== currentStart);
    const fetched = await Promise.all(others.map((start) => g2gFetchAnswerItems(start)));
    others.forEach((start, index) => {
      byStart.set(
        start,
        fetched[index].map((item) => document.importNode(item, true))
      );
    });
    orderedItems = starts.flatMap((start) => byStart.get(start) || []);
    // Everything is on this page now, so the paging links no longer apply.
    document.querySelectorAll(".qa-page-links").forEach((links) => {
      links.hidden = true;
    });
  }

  function render() {
    const best = orderedItems.find((item) => item.classList.contains("qa-a-list-item-selected"));
    const rest = orderedItems.filter((item) => item !== best);
    const ordered = reversed ? rest.slice().reverse() : rest;
    const fragment = document.createDocumentFragment();
    if (best) {
      fragment.appendChild(best);
    }
    ordered.forEach((item) => fragment.appendChild(item));
    list.appendChild(fragment);
    // Flip the comments within each answer to match the answer order.
    orderedItems.forEach(orderComments);
    toggle.classList.toggle("wbe-reverse-answers-active", reversed);
    toggle.setAttribute("aria-pressed", reversed ? "true" : "false");
    stateLabel.textContent = reversed ? "On" : "Off";
  }

  async function flip() {
    if (working) {
      return;
    }
    if (!orderedItems) {
      working = true;
      if (multiPage) {
        showSpinner();
      }
      try {
        await ensureAllLoaded();
      } catch (error) {
        console.error("WBE G2G reverse answers: couldn't load all answer pages.", error);
        hideSpinner();
        working = false;
        return;
      }
      hideSpinner();
      working = false;
    }
    reversed = !reversed;
    render();
  }

  toggle.addEventListener("click", flip);
  toggle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      flip();
    }
  });
}

/**
 * Copy the bottom paging links up into the main heading so they're reachable at
 * the top of the page too.
 * @returns {void}
 */
function g2gPageLinksAtTop() {
  if ($(".qa-page-links").length && $(".qa-main-heading").find(".qa-page-links").length == 0) {
    const links2 = $(".qa-page-links").clone();
    $(".qa-main-heading").append(links2);
  }
}

/**
 * Add the scissors copy panel (ID / URL / Question) to a question page, and
 * optionally per-answer copy links.
 * @param {boolean} alsoInAnswers - Whether to also add copy links to answers.
 * @returns {void}
 */
function g2gScissors(alsoInAnswers) {
  if ($("body.qa-template-question.qa-body-js-on").length && $("#g2gScissors").length == 0) {
    const g2gScissors = $("<div id='g2gScissors'></div>");
    $(".qa-sidepanel").prepend(g2gScissors);
    const url = window.location.href.replaceAll(/%2C/g, ",");
    const g2gIDmatch = url.match(/\/([0-9]{1,8})\//);
    if (g2gIDmatch != null) {
      window.g2gID = g2gIDmatch[1];
      const g2gURL = "https://" + mainDomain + "/g2g/" + window.g2gID;
      const g2gQuestion = $(".qa-main-heading h1").text();

      const position = $("#g2gScissors");

      const IDItem = {
        label: "ID",
        text: window.g2gID,
        image: true,
      };

      const urlItem = {
        label: "URL",
        text: g2gURL,
      };

      const questionItem = {
        label: "Question",
        text: g2gQuestion.replaceAll('"', "“").replaceAll("\n", "").trim(),
      };

      addItems([IDItem, urlItem, questionItem], position, {
        positioning: "prepend",
        style: "margin-bottom: 1em",
      });

      if (alsoInAnswers) {
        addScissorsToAnswers();
      }
      attachScissorsEvent();
    }
  }
}

/**
 * Build one of the extra G2G nav-bar tab buttons.
 * @param {string} id - The element id to give the button.
 * @param {string} url - The href for the button's link.
 * @param {string} text - The link text.
 * @returns {JQuery} The button element (not yet inserted).
 */
function createG2GButton(id, url, text) {
  const button = $('<span class="awtG2GLink nav-link qa-nav-main-item-opp"></span>');
  const link = $('<a class="qa-nav-main-link"></a>').attr("href", url).text(text);
  return button.attr("id", id).append(link);
}

/**
 * Add "Recent Activity", "My Activity" and "+ (Favorited)" tab buttons to the
 * G2G nav bar, marking the current one as selected.
 * @returns {void}
 */
function addG2GButtons() {
  if ($("#recentActivity").length === 0) {
    const mainList = $(".qa-nav-main-list");
    const mainDomainURL = "https://" + mainDomain;
    const userActivityURL = `${mainDomainURL}/g2g/user/${getUserWtId()}/activity`;

    const recentActivity = createG2GButton(
      "recentActivity",
      `${mainDomainURL}/g2g/activity`,
      "Recent Activity"
    ).appendTo(mainList);
    const myActivity = createG2GButton("myActivity", userActivityURL, "My Activity").appendTo(mainList);
    const favouritesSRC = `${mainDomainURL}/images/icons/icon-save.svg`;
    const myFavourites = createG2GButton("myFavourites", `${mainDomainURL}/g2g/favorites`, "+").appendTo(mainList);
    myFavourites.find("a").html(`<img src="${favouritesSRC}" alt="Bookmarked" id="favouritesTabImage" />`);

    myFavourites.on("click", () => $("li.qa-nav-sub-favorites a").trigger("click"));

    // Highlight the selected tab based on the current URL
    const currentURL = window.location.href;
    [recentActivity, myActivity, myFavourites].forEach((button) => {
      if (currentURL === button.find("a").attr("href")) {
        button.find("a").parent().addClass("qa-nav-main-selected").addClass("active");
      }
    });
    // Prevent tabs from wrapping to the next line by adjusting padding
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .nav-tabs .nav-link, .nav-tabs .nav-link:visited {
        padding-left: 0.3em !important;
        padding-right: 0.3em !important;
      }
    `;
    document.head.appendChild(styleElement);
  }
}

/**
 * Mark questions you've favorited with a "+" badge in the question list.
 * @returns {void}
 */
function g2gFavorited() {
  if ($(".qa-q-list-item.qa-q-favorited").length) {
    $(".qa-q-list-item.qa-q-favorited div.qa-q-item-title a").each(function () {
      if ($(this).find(".g2gPlus").length == 0) {
        $(this).css("position", "relative").prepend("<span class='g2gPlus' title='Favorited'>+</span>");
      }
    });
  }
}

/**
 * Add a "↑ Back to top" link that smooth-scrolls to the top of the page.
 * @returns {void}
 */
function g2gBackToTop() {
  if ($(".qa-q-list-form").length && $(".backToTop").length == 0) {
    const backToTop = $("<a class='backToTop'>&uarr; Back to top</a>");
    $(".qa-q-list-form").before(backToTop);
    $(document).on("click", ".backToTop", function (event) {
      event.preventDefault();
      $([document.documentElement, document.body]).animate(
        {
          scrollTop: 0,
        },
        2000
      );
    });
  }
}

/**
 * Read one or more keys from `chrome.storage.sync`.
 * @param {string|string[]} key - The key(s) to read.
 * @returns {Promise<Object|undefined>} The stored values (undefined on error).
 */
export async function getSync(key) {
  try {
    const result = await chrome.storage.sync.get(key);
    return result;
  } catch (error) {
    console.error(error);
  }
}

/**
 * Write an object of key/value pairs to `chrome.storage.sync`.
 * @param {Object} thing - The key/value pairs to store.
 * @returns {void}
 */
export function setSync(thing) {
  chrome.storage.sync.set(thing, function () {});
}

/**
 * Add a "show/hide" checkbox next to each category link in the sidebar, checked
 * according to the user's saved `g2gCategories` preferences, then apply them.
 * @returns {void}
 */
function addG2GCategoryCheckboxes() {
  getSync(["g2gCategories"]).then((sync) => {
    const sidePanelA = $(".qa-sidepanel a");
    if (sidePanelA.length) {
      sidePanelA.each(function () {
        let dHref = $(this).attr("href");
        if (dHref) {
          let dCatBits = dHref.split("/");
          let dCat = dCatBits[dCatBits.length - 1];
          let dChecked = "";
          if (isOK(dCat) && dCat.match(/\.rss/) == null) {
            if (sync.g2gCategories) {
              if (sync.g2gCategories[dCat] == false) {
                dChecked = "";
              } else {
                dChecked = "checked='checked'";
              }
            } else {
              dChecked = "checked='checked'";
            }

            let aCheckbox = $(
              `<input class='catCheck' type='checkbox' style='margin:0 !important; float:right' id='${dCat}Check' value='1' data-category='${dCat}' ${dChecked}>`
            );
            aCheckbox.insertAfter($(this));
          }
        }
      });
      $(".catCheck").on("change", function () {
        g2gCategoriesSync();
      });
      doG2GCategories();
    }
  });
}

/**
 * Save the current state of the category checkboxes to `chrome.storage.sync`,
 * then re-apply the show/hide filtering.
 * @returns {void}
 */
function g2gCategoriesSync() {
  const g2gCategories = { g2gCategories: {} };
  const checks = $(".catCheck");
  checks.each(function () {
    g2gCategories.g2gCategories[$(this).data("category")] = $(this).prop("checked");
  });
  setSync(g2gCategories);
  setTimeout(function () {
    doG2GCategories();
  }, 1000);
}

/**
 * Show or hide each question in the list according to the user's saved
 * `g2gCategories` preferences.
 * @returns {void}
 */
function doG2GCategories() {
  const catLinks = $(".qa-q-item-where-data a");
  getSync(["g2gCategories"]).then((sync) => {
    catLinks.each(function () {
      let oCatBits = $(this).attr("href").split("/");
      let oCat = oCatBits[oCatBits.length - 1];
      let qBox = $(this).closest("div[id]");
      if (sync.g2gCategories) {
        if (sync.g2gCategories[oCat] == false) {
          qBox.slideUp("swing");
        } else {
          qBox.slideDown("swing");
        }
      }
    });
  });
}

/**
 * Prepend a checkmark to questions you've already visited.
 * @returns {void}
 */
function g2gCheckmarks() {
  $("div.qa-q-item-title a,span.qa-q-item-meta a.qa-q-item-what").each(function () {
    if ($(this).find(".checkmark").length == 0) {
      $(this).prepend("<span class='checkmark'>&#10003;</span>");
    }
  });
}
