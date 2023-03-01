import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage.js";

async function initReadingMode() {
  const options = await getFeatureOptions("readingMode");
  $("#content .ten.columns").addClass("x-is-content");
  $("#content .six.columns").addClass("x-is-sidebar");
  $("#content .fourteen.omega").first().addClass("x-is-header");
  $("a[name='Memories']").prev().addClass("x-is-memories").nextAll().addClass("x-is-memories");
  $("a[name='Sources']").first().addClass("x-is-source").nextUntil("a, .x-is-memories").addClass("x-is-source");
  $("a[name='matches']").parent().addClass("x-is-merges").nextAll(".five").addClass("x-is-merges");
  $("#content > div:last-child").filter(function() { return $(this).text().indexOf('degrees from') > -1 && $(this).has("a[href~='Special:Connect']"); }).last().addClass("x-is-connections");
  $("#footer").prev().addClass("x-is-categories");
  if (options.hideSideBar) {
    $("html").addClass("x-rm-side");
    $(".x-is-content").toggleClass("ten").toggleClass("sixteen");
  }
  if (options.hideTables) {
    $("html").addClass("x-rm-tbl");
  }
  if (options.hideSources) {
    $("html").addClass("x-rm-src");
  }
  if (options.hideTabs) {
    $("html").addClass("x-rm-tabs");
  }
  if (options.hideButtons) {
    $("html").addClass("x-rm-btn");
  }
  if (options.hideProfileStatus) {
    $("html").addClass("x-rm-mgr");
  }
  if (options.hideInlineImages) {
    $("html").addClass("x-rm-img");
  }
  if (options.hideComments) {
    $("html").addClass("x-rm-com");
  }
  if (options.hideHeaderExtras) {
    $("html").addClass("x-rm-hdx");
  }
  if (options.hideEdits) {
    $("html").addClass("x-rm-edit");
  }
  if (options.hideConnections) {
    $("html").addClass("x-rm-conn");
  }
  if (options.hideCategories) {
    $("html").addClass("x-rm-cat");
  }
}

checkIfFeatureEnabled("readingMode").then((result) => {
  if (result) {
    import("./readingMode.css");
    initReadingMode();
  }
});
