// Scripts that run in the page's own world (injected with a <script src> tag), so they are copied as they are, not
// bundled. Paths are relative to src/ and keep the same path in the build output. Shared by webpack.common.js (the
// extension builds) and webpack.webview.js (the WikiTree Tree Apps mobile app build).
module.exports = [
  "features/text_expander/cm_helper.js",
  "features/text_expander/event_dispatcher.js",
  "features/clipboard_and_notes/cm_insert.js",
  "core/cm_text.js",
  "features/find_and_replace/find_and_replace_page.js",
  "features/custom_change_summary_options/edit_draft_page.js",
  "features/trusted_list_changes_table/trusted_list_changes_page.js",
];
