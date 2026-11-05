import { escapeHtml } from "../../core/lib/diff_utils";

// A name linked to its profile; numeric Ids have no /wiki/ page, so they stay plain text.
export function profileLinkHtml(label, wtid) {
  const id = String(wtid || "").trim();
  if (!/^[^\s/]+-\d+$/.test(id)) return escapeHtml(label);
  return `<a href="/wiki/${encodeURIComponent(id)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
}
