import $ from "jquery";
import { pageProfile, pageCategory, pageSpace, isEditPage } from './common';

export let hasProfileClasses = false;

export function ensureProfileClasses() {
  // only apply once per load by tracking the status in hasProfileClasses
  if (!hasProfileClasses) {
    // only apply to person, category, and space profiles in read mode
    if (!isEditPage && (pageProfile || pageCategory || pageSpace)) {
      // at the moment, WikiTree puts two different elements with id="content" on person and space pages (the header with the profile thumbnail and the section below the tabs)
      $("div[id='content']").addClass("x-profile").addClass(pageProfile ? "x-profile-person" : pageCategory ? "x-profile-category" : pageSpace ? "x-profile-space" : "");

      // mark the heading content (the h1 beside the thumbnail image and the privacy status, which includes the scissors inside) *** varies by profile type
      $(".x-profile-person > .row h1, .x-profile-category > .sixteen.columns h1, .x-profile-space > .row h1").first().addClass("x-heading");

      // mark the thumbnail image container based on the heading *** varies by profile type
      $(".x-profile-person .x-heading, .x-profile-space .x-heading").closest(".row").children(".alpha").first().addClass("x-thumbnail");

      // mark the widgets (including the scissors container) inside the h1 tag
      $(".x-heading button").addClass("x-heading-widget");
      // some extensions add these differently based on the type of profile, so we need to reapply these after the page is loaded
      $(function () {
        // .copyWidget seems mostly standard, but other extensions put their widgets in identified span tags (helpScissors, distanceFromYou, etc.)
        $(".x-heading button, .x-heading .copyWidget, .x-heading span[id]").addClass("x-heading-widget");
      });

      // mark the privacy status container based on the heading *** varies by profile type
      $(".x-profile-person .x-heading, .x-profile-space .x-heading").closest(".row").find("a.nohover").parent().addClass("x-privacy");

      // mark the content section (on the left of the sidebar) which contains the biography, sources, etc. up to where the comments section starts; for categories, the content is all in the root section
      $(".x-profile > .ten.columns, .x-profile-category").first().addClass("x-content");

      // mark the sidebar to the right (with DNA connections, images, collaboration, etc.)
      $(".x-profile > .six.columns").first().addClass("x-sidebar");

      // mark the tabs, including the main tabs at the top (which link to different pages) and the buttons below them (which jump to different views)
      $(".x-profile .profile-tabs").addClass("x-tabs-page");
      $(".x-profile #views-wrap").addClass("x-tabs-view");
      $(".x-tabs-page, .x-tabs-view").first().closest(".columns").addClass("x-tabs"); // this includes the div containing both sets of tabs

      // mark any kind of edit links or buttons like [edit], [add spouse], Invite Others, etc.
      $(".x-content div.EDIT, .x-content a.BLANK, .x-content .editsection, .x-content a[href$='#additions']").addClass("x-edit");

      // mark the audit lines in the profile that show the manager, last modified, how many times the page has been accessed, etc.
      $(".x-content > div.SMALL").addClass("x-audit");
      $(".x-content p.SMALL").filter(function() { var txt = $(this).text(); return (txt.indexOf('last modified') > -1 && txt.indexOf('been accessed') > -1); }).addClass("x-audit"); // category pages are displayed this way

      // mark stickers inside the content
      $(".x-content > div").filter(function () { return $(this).css("float") == "right" && $(this).css("display") == "flex"; }).addClass("x-sticker");

      // mark inline images
      $(".x-content table").has("a.image > img").addClass("x-inline-img");

      // mark inline tables
      $(".x-content table:not(#toc):not(.x-inline-img)").addClass("x-inline-table");

      // mark root sections in content (h2 only)
      $(".x-content a[name] + h2").prev().addClass("x-root-section x-section");

      // mark subdivided sections (h3, etc.)
      $(".x-content a[name] + h3, .x-content a[name] + h4, .x-content a[name] + h5, .x-content a[name] + h6").prev().addClass("x-section");

      // mark memories section (only at the bottom of certain profiles)
      $("a[name='Memories']").prev().addClass("x-memories").nextAll().addClass("x-memories");
      $(".x-memories, .x-content > br:last-child").addClass("x-memories").prevUntil("*:not(br)").addClass("x-memories"); // memories are usually preceded by a couple of line breaks, sometimes present at the end of content even if the memories block is missing

      // mark elements related to the sources section (including header, lists, and any other root elements) up until the next section *** dependent on x-memories being set
      $(".x-content a[name='Sources']").first().addClass("x-sources").nextUntil(".x-root-section, div.EDIT, .x-memories").addClass("x-sources");
      $(".x-content ol.references").addClass("x-sources");
      // mark source list items separately
      $("ul.x-sources > li, ol.x-sources > li").addClass("x-src");

      // mark comments section, including the form components
      $("#comments, .comment-form-container").addClass("x-comments");

      // mark merges section, including pending and rejected matches
      $(".x-profile-person a[name='matches']").parent().addClass("x-merges").nextAll(".five").addClass("x-merges");

      // mark connections to famous people
      $(".x-profile-person > div:last-child").filter(function() { return $(this).text().indexOf('degrees from') > -1 && $(this).has("a[href~='Special:Connect']"); }).last().addClass("x-connections");

      // mark the container for the categories box, including the breadcrumbs at the bottom of profiles (ie. S > Smith > John Smith)
      $("#categories").closest(".container").addClass("x-categories");
      $("#footer").prev().addClass("x-categories");

      // prevent this from running twice
      hasProfileClasses = true;
    }
  }
}
