import { createChartPopup, mountChartPopup, closeChartPopup, escapeText, profileUrl, toggleChartFullScreen, chartPopupControls, saveChart } from "./chat_chart_common";
import { fullWikiTreeName } from "./chat_fan_chart_data";

const displayDate = (value) => String(value).replace(/-00-00$/, "").replace(/-00$/, "");
// WikiTree's date status: guess → Abt., before → Bef., after → Aft. ("certain" and blank show nothing).
const STATUS_PREFIX = { guess: "Abt. ", before: "Bef. ", after: "Aft. " };
const lifeEvent = (date, place, status) => `${date && !/^0000/.test(date) ? `${STATUS_PREFIX[status] || ""}${displayDate(date)}` : "?"} in ${String(place || "").trim() || "?"}`;
// "BORN Abt. 1788-01 in Place" / "DIED ? in ?" — a missing part shows as ?; the label is styled (.wbe-kin-event).
const eventLine = (label, text) => `<span class="wbe-kin-event">${label}</span> ${escapeText(text)}`;
const datesHtml = (person) => [eventLine("Born", lifeEvent(person.birth, person.birthPlace, person.birthStatus)), person.living ? "Living" : eventLine("Died", lifeEvent(person.death, person.deathPlace, person.deathStatus))].join("<br>");

function relationshipGrid(matrix, rootName) {
  const oldest = Math.max(0, ...matrix.cards.map((card) => card.up - card.down));
  const youngest = Math.min(0, ...matrix.cards.map((card) => card.up - card.down));
  const branches = Math.max(1, ...matrix.cards.map((card) => card.down ? card.up : 0));
  const headers = ["Direct family", "Siblings’ branch", ...Array.from({ length: branches - 1 }, (_, i) => `${i + 1}${i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} cousins’ branch`)];
  const rows = [];
  for (let generation = oldest; generation >= youngest; generation--) {
    const cells = headers.map((_, branch) => {
      const cards = matrix.cards.map((card, index) => ({ card, index })).filter(({ card }) => card.up - card.down === generation && (card.down ? card.up : 0) === branch);
      const focus = generation === 0 && branch === 0 ? `<div class="wbe-kin-root" title="${escapeText(matrix.root.Name || "")}">${escapeText(rootName)}</div>` : "";
      return `<td>${focus}${cards.map(({ card, index }) => `<button type="button" class="wbe-kin-card" data-card="${index}" style="--kin-background:${card.down === 0 ? "#ffee99" : card.up === 0 ? "#eeffee" : "#e1f0b4"};--kin-border:${card.down === 0 ? "#fad158" : "#a5d167"}"><strong>${card.people.length}</strong><span>${escapeText(card.label)}</span></button>`).join("")}</td>`;
    }).join("");
    rows.push(`<tr data-generation="${generation}">${cells}</tr>`);
  }
  return `<div class="wbe-kin-grid"><table class="wbe-kin-matrix"><thead><tr>${headers.map((label) => `<th scope="col">${label}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

// Native SVG shapes keep both exports portable, without HTML foreignObject rendering.
export function familyRelationshipsSvg(popup, title) {
  const table = popup.querySelector(".wbe-kin-matrix");
  const bounds = table.getBoundingClientRect();
  const width = Math.max(360, bounds.width + 32);
  const height = Math.max(120, bounds.height + 80);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  function element(tag, attributes, text) {
    const node = document.createElementNS(svg.namespaceURI, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    svg.appendChild(node);
    return node;
  }
  function lines(text, x, y, maxCharacters, colour, size = 11, weight = "normal") {
    const result = [];
    String(text).split(/\s+/).forEach((word) => {
      if (!result.length || `${result[result.length - 1]} ${word}`.length > maxCharacters) result.push(word);
      else result[result.length - 1] += ` ${word}`;
    });
    result.forEach((line, index) => element("text", { x, y: y + index * 14, fill: colour, "text-anchor": "middle", "font-family": "Arial, sans-serif", "font-size": size, "font-weight": weight }, line));
  }
  element("rect", { width, height, fill: "#ffffff" });
  lines(title, width / 2, 26, Math.floor(width / 9), "#25422d", 16, "bold");
  table.querySelectorAll("th, .wbe-kin-card, .wbe-kin-root").forEach((node) => {
    const rect = node.getBoundingClientRect();
    const x = rect.left - bounds.left + 16;
    const y = rect.top - bounds.top + 54;
    const cx = x + rect.width / 2;
    if (node.tagName === "TH") { lines(node.textContent, cx, y + 16, 16, "#666666", 11, "bold"); return; }
    const root = node.classList.contains("wbe-kin-root");
    element("rect", { x, y, width: rect.width, height: rect.height, rx: 10, fill: root ? "#25422d" : node.style.getPropertyValue("--kin-background") || "#e1f0b4", stroke: root ? "#25422d" : node.style.getPropertyValue("--kin-border") || "#a5d167" });
    if (root) { lines(node.childNodes[0].textContent, cx, y + 28, 16, "#ffffff", 12, "bold"); return; }
    element("rect", { x: cx - 22, y: y + 8, width: 44, height: 22, rx: 11, fill: "#ffffff" });
    lines(node.querySelector("strong").textContent, cx, y + 24, 16, "#25422d", 16, "bold");
    lines(node.querySelector("span").textContent, cx, y + 46, 16, "#25422d");
  });
  return svg;
}

export function showFamilyMatrixPopup(matrix, { reload } = {}) {
  const rootName = fullWikiTreeName(matrix.root) || matrix.root.RealName || matrix.root.Name || "Private profile";
  const popup = createChartPopup({ id: "wbe-family-matrix-popup", keepFullScreen: true, html: `
    <div class="chat-popup-header"><strong>Relationship Chart: ${escapeText(rootName)}</strong><div class="chat-popup-controls">${chartPopupControls()}</div></div>
    <div class="chat-popup-body wbe-kin-dashboard">
      <div class="wbe-kin-controls"><label>Ancestors <input type="number" name="ancestors" min="1" max="25" value="${matrix.ancestorDepth}"></label><label>Descendant branches <input type="number" name="descendants" min="1" max="10" value="${matrix.descendantDepth}"></label><button type="button" data-act="load">Load generations</button><input type="search" placeholder="Find a relative" aria-label="Find a relative"></div>
      <p class="wbe-kin-status">${matrix.total} relatives found. Hover or focus a card for names and dates; click to pin its hover list.</p>
      ${relationshipGrid(matrix, rootName)}
      <section class="wbe-kin-list" hidden tabindex="0" aria-label="People in selected relationship"></section>
      <details class="wbe-kin-note"><summary>About the counts</summary><p>Counts are unique profiles in the fetched range, not everyone who ever lived. Privacy and missing links can hide relatives. Cousin branches reach as far as the Ancestors number (3rd cousins need 4, 4th cousins 5, up to 8) and the Descendant branches number (at least as large). Cousin cards include full and half cousins; uncertain sibling links are grouped as siblings. Where several relationships exist, the closest is shown.</p></details>
    </div>` });
  const list = popup.querySelector(".wbe-kin-list");
  let selected = null;
  let pinned = false;
  let hideTimer;
  function hide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (!pinned) list.hidden = true; }, 180);
  }
  function show(index) {
    selected = Number(index);
    const query = popup.querySelector('input[type="search"]').value.toLowerCase();
    const card = matrix.cards[selected];
    const candidates = query ? matrix.cards.flatMap((group) => group.people.map((person) => ({ ...person, relationship: group.label }))) : card?.people || [];
    const people = candidates.filter((person) => `${person.name} ${person.wtid}`.toLowerCase().includes(query));
    list.innerHTML = `<h3>${escapeText(query ? "Search results" : card?.label || "Relatives")} · ${people.length}</h3><ul>${people.map((person) => `<li class="wbe-kin-gender-${person.gender === "Male" ? "male" : person.gender === "Female" ? "female" : "unknown"}">${person.wtid ? `<a href="${escapeText(profileUrl(person.wtid))}" target="_blank" rel="noopener noreferrer">${escapeText(person.name)}</a>` : escapeText(person.name)}<small>${datesHtml(person)}${person.relationship ? `<br>${escapeText(person.relationship)}` : ""}</small></li>`).join("")}</ul>${people.length ? "" : "<p>No matching people.</p>"}`;
    list.hidden = false;
    clearTimeout(hideTimer);
    const anchor = query ? popup.querySelector('input[type="search"]') : popup.querySelector(`[data-card="${selected}"]`);
    const bounds = anchor?.getBoundingClientRect() || popup.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    list.style.width = `${width}px`;
    list.style.left = `${Math.max(12, Math.min(bounds.right + 8, window.innerWidth - width - 12))}px`;
    list.style.top = `${Math.max(12, Math.min(bounds.top, window.innerHeight - Math.min(list.offsetHeight, 320) - 12))}px`;
    popup.querySelectorAll("[data-card]").forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.card) === selected && pinned)));
  }
  popup.querySelectorAll("[data-card]").forEach((button) => {
    button.addEventListener("mouseenter", () => { if (!pinned) show(button.dataset.card); });
    button.addEventListener("focus", () => { if (!pinned) show(button.dataset.card); });
    button.addEventListener("mouseleave", hide);
    button.addEventListener("blur", hide);
    button.addEventListener("click", () => { pinned = !pinned || selected !== Number(button.dataset.card); show(button.dataset.card); });
  });
  list.addEventListener("mouseenter", () => clearTimeout(hideTimer));
  list.addEventListener("mouseleave", hide);
  list.addEventListener("focusin", () => clearTimeout(hideTimer));
  list.addEventListener("focusout", hide);
  popup.addEventListener("keydown", (event) => { if (event.key === "Escape") { pinned = false; list.hidden = true; } }, { signal: popup._wbeSignal.signal });
  popup.querySelector('input[type="search"]').addEventListener("input", () => { if (selected !== null || popup.querySelector('input[type="search"]').value) show(selected); });
  popup.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.classList.contains("close-popup")) closeChartPopup(popup);
    else if (button.dataset.act === "full") toggleChartFullScreen(popup);
    else if (["svg", "png"].includes(button.dataset.act)) {
      saveChart(familyRelationshipsSvg(popup, `Relationship Chart: ${rootName}`), `${matrix.root.Name || "profile"}-relationships`, button.dataset.act);
    }
    else if (button.dataset.act === "load" && reload) {
      const ancestors = popup.querySelector('[name="ancestors"]');
      const descendants = popup.querySelector('[name="descendants"]');
      if (!ancestors.reportValidity() || !descendants.reportValidity()) return;
      button.disabled = true;
      const status = popup.querySelector(".wbe-kin-status");
      status.textContent = "Loading family branches…";
      try { await reload(Number(ancestors.value), Number(descendants.value), (count) => { status.textContent = `Loading family branches… ${count} profiles fetched`; }); }
      catch (error) { status.textContent = `Could not load: ${error.message || error}`; }
      finally { button.disabled = false; }
    }
  }, { signal: popup._wbeSignal.signal });
  mountChartPopup(popup);
  return popup;
}
