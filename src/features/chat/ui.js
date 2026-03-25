import $ from "jquery";
import { formatDate, getRelationColour, getYearColour } from "../../core/formatting";
import { escapeHtml } from "../../core/lib/diff_utils";
import { setHighestZIndex } from "../../core/common";
import { PersonName } from "../auto_bio/person_name";

/**
 * Normalize simple text for comparisons.
 * @param {any} value
 * @returns {string}
 */
function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatConnectionPersonName(person) {
  try {
    const personName = new PersonName(person || {});
    const pedigreeName = personName.withParts(["PedigreeName"]);
    if (typeof pedigreeName === "string" && pedigreeName.trim() && !pedigreeName.startsWith("Invalid name part")) {
      return pedigreeName.trim();
    }
  } catch (error) {
    // Ignore formatting errors and use a simple fallback
  }

  const fallbackName = `${person?.FirstName || ""} ${person?.LastNameCurrent || person?.LastNameAtBirth || ""}`.trim();
  return fallbackName || person?.RealName || person?.Name || "";
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Set reasonable min/max size and position for a popup element.
 * @param {HTMLElement} popup
 * @param {number|null} preferredLeft
 * @param {number|null} preferredTop
 * @param {number} margin
 */
export function setPopupPositionAndSize(popup, preferredLeft = null, preferredTop = null, margin = 10) {
  if (!popup) return;
  const rect = popup.getBoundingClientRect();
  const maxWidth = Math.max(320, window.innerWidth - margin * 2);
  const maxHeight = Math.max(260, window.innerHeight - margin * 2);
  const minWidth = Math.min(400, maxWidth);
  popup.style.minWidth = `${minWidth}px`;
  popup.style.maxWidth = `${maxWidth}px`;
  popup.style.maxHeight = `${maxHeight}px`;
  if (rect.width > maxWidth) popup.style.width = `${maxWidth}px`;
  if (rect.height > maxHeight) popup.style.height = `${maxHeight}px`;
  const updated = popup.getBoundingClientRect();
  const left =
    preferredLeft !== null ? clamp(preferredLeft, margin, window.innerWidth - updated.width - margin) : updated.left;
  const top =
    preferredTop !== null ? clamp(preferredTop, margin, window.innerHeight - updated.height - margin) : updated.top;
  popup.style.position = "fixed";
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.style.right = "auto";
  popup.style.transform = "none";
}

export function positionPopupFixed(popup, preferredLeft, preferredTop) {
  const rect = popup.getBoundingClientRect();
  const maxLeft = Math.max(10, window.innerWidth - rect.width - 10);
  const maxTop = Math.max(10, window.innerHeight - rect.height - 10);
  popup.style.position = "fixed";
  popup.style.left = `${clamp(preferredLeft, 10, maxLeft)}px`;
  popup.style.top = `${clamp(preferredTop, 10, maxTop)}px`;
  popup.style.right = "auto";
  popup.style.transform = "none";
}

export function clampPopupToViewport(popup, margin = 10) {
  if (!popup) return;
  const maxWidth = Math.max(320, window.innerWidth - margin * 2);
  const maxHeight = Math.max(260, window.innerHeight - margin * 2);
  const minWidth = Math.min(400, maxWidth);
  const minHeight = Math.min(320, maxHeight);
  popup.style.minWidth = `${minWidth}px`;
  popup.style.minHeight = `${minHeight}px`;
  popup.style.maxWidth = `${maxWidth}px`;
  popup.style.maxHeight = `${maxHeight}px`;
  const rect = popup.getBoundingClientRect();
  if (rect.width > maxWidth) popup.style.width = `${maxWidth}px`;
  if (rect.height > maxHeight) popup.style.height = `${maxHeight}px`;
  const updated = popup.getBoundingClientRect();
  const nextLeft = clamp(updated.left, margin, Math.max(margin, window.innerWidth - updated.width - margin));
  const nextTop = clamp(updated.top, margin, Math.max(margin, window.innerHeight - updated.height - margin));
  popup.style.left = `${nextLeft}px`;
  popup.style.top = `${nextTop}px`;
  popup.style.right = "auto";
  popup.style.transform = "none";
}

export function getPopupResizeLimits(margin = 10) {
  const maxWidth = Math.max(320, window.innerWidth - margin * 2);
  const maxHeight = Math.max(260, window.innerHeight - margin * 2);
  return {
    minWidth: Math.min(400, maxWidth),
    minHeight: Math.min(320, maxHeight),
    maxWidth,
    maxHeight,
  };
}

export function positionPopupForOpen(popup) {
  if (!popup) return;
  const rect = popup.getBoundingClientRect();
  positionPopupFixed(popup, Math.round((window.innerWidth - rect.width) / 2), 10);
  clampPopupToViewport(popup);
}

/**
 * Show a connections popup for a getConnections-style result.
 * This function is UI-only and does not mutate external module state.
 */
export function showConnectionsPopup(connectionsResult) {
  if (!Array.isArray(connectionsResult) || !connectionsResult.length) return;
  const conn = connectionsResult[0];
  const path = conn.path || [];

  // Remove any existing popup before showing a new one
  $("#wbe-connections-popup").remove();

  const popup = document.createElement("div");
  popup.className = "wbe-popup chat-popup ui-draggable chat-connections-popup";
  popup.id = "wbe-connections-popup";
  popup.style.display = "block";
  popup.innerHTML = `
    <div class="chat-popup-header ui-draggable-handle">
      <strong>Connections Path</strong>
      <div class="chat-popup-controls">
        <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
      </div>
    </div>
    <div class="chat-popup-body">
      <table class="connections-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Relation</th>
            <th>Birth Date</th>
            <th>Birth Location</th>
            <th>Death Date</th>
            <th>Death Location</th>
          </tr>
        </thead>
        <tbody>
          ${path
            .map((person) => {
              const name = formatConnectionPersonName(person);
              const relation = person.pathType || "";
              const birthDate = formatDate(person.BirthDate);
              const birthLoc = person.BirthLocation || "";
              const deathDate = formatDate(person.DeathDate);
              const deathLoc = person.DeathLocation || "";
              const normalizedGender = normalizeText(person.Gender);
              let rowClass = "background--gender-no-gender";
              if (normalizedGender === "male") rowClass = "background--gender-male";
              else if (normalizedGender === "female") rowClass = "background--gender-female";
              return `
                <tr class="${rowClass}">
                  <td><a href="https://www.wikitree.com/wiki/${person.Name}" target="_blank">${escapeHtml(
                name
              )}</a></td>
                  <td style="background:${getRelationColour(relation)}">${escapeHtml(relation)}</td>
                  <td style="background:${getYearColour(person.BirthDate)}">${escapeHtml(birthDate)}</td>
                  <td>${escapeHtml(birthLoc)}</td>
                  <td style="background:${getYearColour(person.DeathDate)}">${escapeHtml(deathDate)}</td>
                  <td>${escapeHtml(deathLoc)}</td>
                </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  document.body.appendChild(popup);
  setPopupPositionAndSize(popup, Math.round((window.innerWidth - popup.getBoundingClientRect().width) / 2), 110);
  popup.querySelector(".close-popup")?.addEventListener("click", () => popup.remove());
  setHighestZIndex(popup);
  $(popup).draggable({
    handle: ".chat-popup-header",
    containment: "window",
    scroll: false,
    start: () => {
      popup.style.right = "auto";
      popup.style.transform = "none";
    },
  });
}

/**
 * Small shaky-tree loader UI used in chat operations.
 */
export function showChatShaky(label = "Finding connection...", position = "center") {
  let $existing = $("#wbeShakyTree");
  const treeUrl = chrome?.runtime?.getURL ? chrome.runtime.getURL("images/tree.gif") : "images/tree.gif";
  if ($existing.length === 0) {
    const html = `
      <div id="wbeShakyTree" class="wbe-shaky-tree" style="display:none">
        <div class="wbe-shaky-image"><img src="${treeUrl}" alt="loading" /></div>
        <div class="wbe-shaky-messages">
          <div class="wbe-shaky-label">${label}</div>
        </div>
      </div>
      `;
    $(document.body).append(html);
    $existing = $("#wbeShakyTree");
  } else {
    const $msgs = $existing.find(".wbe-shaky-messages");
    // Replace existing messages with the latest label to avoid duplicates
    $msgs.html(`<div class="wbe-shaky-label">${label}</div>`);
  }
  if (position === "center") $existing.addClass("center");
  else $existing.removeClass("center");
  $existing.stop(true, true).fadeIn(180);
  try {
    setTimeout(() => {
      setHighestZIndex($existing.get(0));
    }, 10);
  } catch (e) {
    /* ignore */
  }
}

export function hideChatShaky() {
  const $el = $("#wbeShakyTree");
  if ($el.length) {
    $el.stop(true, true).fadeOut(150, function () {
      $(this).removeClass("center");
    });
  }
}

// Expose some utilities for console debugging
window.wbeUi = window.wbeUi || {};
window.wbeUi.showChatShaky = showChatShaky;
window.wbeUi.hideChatShaky = hideChatShaky;
window.wbeUi.showConnectionsPopup = showConnectionsPopup;

// Sanitize profile HTML for insertion into popups to avoid CSP inline-script execution.
export function sanitizeHtmlForPopup(html) {
  try {
    if (!html) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html), "text/html");
    // Remove script tags
    doc.querySelectorAll("script").forEach((s) => s.remove());
    // Remove inline event handler attributes (on*) and javascript: src/href
    const all = doc.querySelectorAll("*");
    all.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = String(attr.name || "");
        const val = String(attr.value || "");
        if (/^on/i.test(name)) {
          el.removeAttribute(name);
        }
        if ((name === "src" || name === "href") && /^javascript:/i.test(val)) {
          el.removeAttribute(name);
        }
      });
    });
    return doc.body.innerHTML || "";
  } catch (e) {
    return "";
  }
}

// Normalize extraction of wiki and html bio fields from profile objects
export function extractProfileBios(profile) {
  if (!profile || typeof profile !== "object") return { wikiBio: "", htmlBio: "" };
  const wikiBio =
    profile.Bio ||
    profile.BioText ||
    profile.BioWiki ||
    profile.Biography ||
    profile.bio ||
    profile.bioText ||
    profile.biography ||
    "";
  const htmlBio =
    profile.BioHtml ||
    profile.BioHTML ||
    profile.Bio_Html ||
    profile.BioHtmlText ||
    profile.bioHTML ||
    profile.bioHtml ||
    profile.bio_html ||
    "";
  return { wikiBio, htmlBio };
}

// Small popup to list multiple bios with Open buttons
export function showBioListPopup(title, entries = [], onOpenTiled) {
  try {
    $("#wbe-bio-list-popup").remove();
    const popupWidth = Math.max(360, Math.floor(window.innerWidth * 0.4));

    const listItems = (entries || [])
      .map(
        (e) =>
          `<li><span>${escapeHtml(e.displayName || e.wtid || "")} (${escapeHtml(
            e.wtid || ""
          )})</span> <button class="open-bio" data-wtid="${escapeHtml(e.wtid || "")}">Open Bio</button></li>`
      )
      .join("");

    const html = `
      <div id="wbe-bio-list-popup" class="wbe-popup chat-popup ui-draggable" style="display:block;width:${popupWidth}px;left:${Math.floor(
      (window.innerWidth - popupWidth) / 2
    )}px">
        <div class="chat-popup-header ui-draggable-handle">
          <strong>${escapeHtml(title || "Profiles")}</strong>
          <div class="chat-popup-controls">
            <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
          </div>
        </div>
        <div class="chat-popup-body chat-popup-body--compact">
          <ul class="spouse-list">
            ${listItems}
          </ul>
          <div class="bio-list-actions" style="margin-top:8px;">
            <button class="open-all-tiled small">Open All (Tiled)</button>
          </div>
        </div>
      </div>`;

    const $popup = $(html).appendTo(document.body);
    $popup.find(".close-popup").on("click", () => $popup.remove());
    $popup.find(".open-all-tiled").on("click", () => {
      const ids = entries.map((e) => e.wtid).filter(Boolean);
      if (ids.length && typeof onOpenTiled === "function") onOpenTiled(ids.slice(0, 12));
    });
    $popup.find(".open-bio").on("click", async (e) => {
      const raw = $(e.currentTarget).attr("data-wtid");
      if (!raw) return;
      // callers should resolve WTID before opening; provide raw back via attribute
      $popup.remove();
      if (typeof onOpenTiled === "function") onOpenTiled([raw]);
    });
    setHighestZIndex($popup.get(0));
    $popup.draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
    // Do not auto-open the first bio to avoid unexpected popups when profile
    // fetches fail or return empty content. Require the user to click an entry.
  } catch (e) {
    console.error("wbe: showBioListPopup error", e);
  }
}

// Open multiple bio popups tiled on screen. Creates individual popups per profile id.
export function showTiledBioPopups(ids = [], fetchProfilesFn) {
  if (!Array.isArray(ids) || !ids.length) return;
  const max = Math.min(ids.length, 12);
  const toOpen = ids.slice(0, max);
  // fetchProfilesFn should be provided by caller (chat module) to perform API fetch
  if (typeof fetchProfilesFn !== "function") {
    console.error("showTiledBioPopups requires a fetchProfilesFn callback");
    return;
  }
  return (async () => {
    const profiles = await fetchProfilesFn(toOpen);
    const anyValid = Array.isArray(profiles) && profiles.some((p) => p && Object.keys(p).length > 0);
    if (!anyValid) {
      try {
        // fallback: let caller append a message
        return { opened: 0, error: true };
      } catch (e) {
        return { opened: 0, error: true };
      }
    }
    // Layout: up to 4 columns depending on count
    const cols = Math.min(3, Math.max(1, Math.floor(Math.sqrt(toOpen.length))));
    const width = Math.floor((window.innerWidth - 40) / cols);
    let left = 10;
    let top = 80;
    let col = 0;
    let opened = 0;
    for (let i = 0; i < toOpen.length; i += 1) {
      const id = toOpen[i];
      const profile = profiles[i] || null;
      if (!profile) continue; // skip failed fetches
      const { wikiBio, htmlBio } = extractProfileBios(profile);
      // Skip profiles that have no biography content to avoid empty popups
      if (!wikiBio && !htmlBio) continue;
      const name = (profile && (profile.RealName || profile.Name)) || id;
      const pid = `wbe-bio-popup-${encodeURIComponent(id)}`;
      $(`#${pid}`).remove();
      const $p = $(
        `<div id="${pid}" class="wbe-popup chat-popup ui-draggable" style="display:block;width:${width}px;left:${left}px;top:${top}px">
          <div class="chat-popup-header ui-draggable-handle">
            <strong>Biography: ${escapeHtml(name)}</strong>
            <div class="chat-popup-controls"><button type="button" class="small close-popup" title="Close">×</button></div>
          </div>
          <div class="chat-popup-body chat-popup-body--columns" style="height:320px;overflow:auto;">
            <div class="bio-column bio-column--wiki">
              <pre class="bio-wiki-pre">${escapeHtml(wikiBio || "(no wiki text)")}</pre>
            </div>
            <div class="bio-column">
              <div class="bio-html-container">${sanitizeHtmlForPopup(htmlBio) || "<i>(no html)</i>"}</div>
            </div>
          </div>
        </div>`
      ).appendTo(document.body);
      $p.find(".close-popup").on("click", () => $p.remove());
      setHighestZIndex($p.get(0));
      $p.draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
      // advance grid position for next tiled popup
      if (!Number.isFinite(col)) col = 0;
      col += 1;
      if (col >= cols) {
        col = 0;
        left = 10;
        top += 340;
      } else {
        left += width + 10;
      }
      opened += 1;
    }
    return { opened, error: false };
  })();
}

export function closeBioPopup() {
  document.getElementById("wbe-bio-popup")?.remove();
}

// Safe no-op to satisfy callers; removes any leftover persistent button if present.
export function addBioButton() {
  try {
    $("#wbe-bio-button").remove();
  } catch (e) {
    /* ignore */
  }
}
