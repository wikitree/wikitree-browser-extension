/*
Created By: Ian Beacall (Beacall-6)

The changes in a draft (2026-10-21). When the edit page was opened from a draft, what the page loaded is
the draft, not the saved profile, so comparing the page with how it loaded misses everything done
before. WikiTree's "compare draft with saved information" button asks the server for the differences
between the saved profile and the draft; this does the same, after bringing the draft up to date as
that button does (edit_draft_page.js runs WikiTree's own saveDraft), and reads the changes out of the
server's table as { form, before, after }, like pageChanges in change_explanation.js.

The table (2026-10-21) has a row with a td.diff-lineno label for each changed field ("Death
Location"), its old value in td.diff-deletedline and new one in td.diff-addedline; the text's section
("Bio Changes") has its changed lines and a few unchanged ones (td.diff-context) around them.
*/

const PAGE_SCRIPT = "features/custom_change_summary_options/edit_draft_page.js";
const DRAFT_SAVE_TIMEOUT = 30 * 1000;
// The text's section, not a field's.
const TEXT_SECTION = /^(?:bio|biography|text|content)\b|\bchanges$/i;

/** Whether this edit has a draft on WikiTree's server: the "delete draft" link shows when it has. */
export const hasDraft = (doc = document) => Boolean(doc.querySelector(".deleteDraftButton"));

/** Brings WikiTree's draft up to date with the page. Resolves to "saved", "current" or "none". */
export function updateDraft(doc = document, { timeout = DRAFT_SAVE_TIMEOUT } = {}) {
  return new Promise((resolve, reject) => {
    const script = doc.createElement("script");
    let timer;
    const finish = () => {
      clearTimeout(timer);
      script.remove();
    };
    script.addEventListener("wbe-draft-done", () => {
      finish();
      resolve(script.getAttribute("data-state"));
    });
    script.onerror = () => {
      finish();
      reject(new Error("the draft helper couldn't load"));
    };
    timer = setTimeout(() => {
      finish();
      reject(new Error("WikiTree didn't save the draft"));
    }, timeout);
    script.src = chrome.runtime.getURL(PAGE_SCRIPT);
    doc.documentElement.appendChild(script);
  });
}

/** WikiTree's comparison of the saved profile (or free-space page) and the draft, as HTML. */
export async function fetchDraftDiff(doc = document) {
  const button = doc.querySelector(".viewDiffButton");
  const mId = button?.getAttribute("data-mid");
  if (!mId) return "";
  const rs = button.getAttribute("data-is-space") ? "EditSpace::ajaxGetDiff" : "EditPerson::ajaxGetDiff";
  const response = await fetch(new URL("/index.php", doc.location.href), {
    method: "POST",
    body: new URLSearchParams({ action: "ajax", rs, mId }),
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error(`WikiTree's comparison didn't load (${response.status})`);
  const json = JSON.parse(await response.text());
  if (json.error) throw new Error(String(json.error));
  return json.html || "";
}

const cellText = (cell) => (cell?.textContent ?? "").replace(/\u00a0/g, " ").replace(/\s+$/, "");
// A field's label as the form's are: "Death Location" → "death place".
const fieldLabel = (label) => label.toLowerCase().replace(/\blocation\b/g, "place");

/** The changes in WikiTree's comparison table, as { form, before, after }; null when there's no table. */
export function parseDraftDiff(html) {
  const table = new DOMParser().parseFromString(String(html || ""), "text/html").querySelector("table.diff");
  if (!table) return null;
  const sections = [];
  let section = null;
  for (const row of table.querySelectorAll("tr")) {
    const label = row.querySelector("td.diff-lineno")?.textContent.trim();
    if (label) {
      section = { label, before: [], after: [] };
      sections.push(section);
      continue;
    }
    if (!section || row.querySelector("td.diff-lineno")) continue;
    const context = row.querySelectorAll("td.diff-context");
    if (context.length) {
      section.before.push(cellText(context[0]));
      section.after.push(cellText(context[context.length - 1]));
      continue;
    }
    const deleted = row.querySelector("td.diff-deletedline");
    const added = row.querySelector("td.diff-addedline");
    if (deleted) section.before.push(cellText(deleted));
    if (added) section.after.push(cellText(added));
  }
  const text = sections.filter((part) => TEXT_SECTION.test(part.label));
  return {
    form: sections
      .filter((part) => !TEXT_SECTION.test(part.label))
      .map((part) => ({ label: fieldLabel(part.label), from: part.before.join(" ").trim(), to: part.after.join(" ").trim() })),
    before: text.flatMap((part) => part.before).join("\n"),
    after: text.flatMap((part) => part.after).join("\n"),
  };
}

/**
 * The changes between the saved profile and the draft (brought up to date first), or null when there's
 * no draft. onDraft is called when there is one, before the draft is saved and compared.
 */
export async function draftChanges(doc = document, { onDraft, update = updateDraft, fetchDiff = fetchDraftDiff } = {}) {
  if (!hasDraft(doc)) return null;
  onDraft?.();
  await update(doc);
  return parseDraftDiff(await fetchDiff(doc));
}
