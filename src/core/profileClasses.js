/*
 * Created By: Jonathan Duke (Duke-5773)
 * Used By: readability (for debugging, see debugProfileClasses)
 */

import $ from "jquery";
import { isProfilePage, isSpacePage, isCategoryPage } from "./pageType";

export let hasProfileClasses = false;

export function ensureProfileClasses() {
  // only apply once per load by tracking the status in hasProfileClasses
  if (!hasProfileClasses) {
    // at the moment, WikiTree puts two different elements with id="content" on person pages (the heading and tabs are separate from the rest of the profile)
    $("div[id='content']")
      .addClass("x-profile")
      .addClass(
        isProfilePage
          ? "x-profile-person"
          : isCategoryPage
          ? "x-profile-category"
          : isSpacePage
          ? "x-profile-space"
          : ""
      );

    // mark the CSS element to apply a custom background image
    $("style")
      .filter(function () {
        let css = $(this).text();
        let i1 = css.indexOf("BODY");
        return i1 >= 0 && css.indexOf("background-image:") > i1;
      })
      .addClass("x-style-bg");

    // mark the heading content (the h1 beside the thumbnail image and the privacy status, which includes the scissors inside) *** varies by profile type
    $(".x-profile-person > .row h1, .x-profile-space > .row h1").first().addClass("x-heading-title");
    $(".x-heading-title").closest(".row").addClass("x-heading");
    $(".x-profile-category > .sixteen.columns h1").first().addClass("x-heading x-heading-title");

    // mark the thumbnail image container based on the heading
    $(".x-heading > .alpha").first().addClass("x-thumbnail");

    // mark the widgets (including the scissors container) inside the h1 tag, plus the green buttons like showHideTree
    $(".x-heading-title button, .showHideTree, #showHideDescendants").addClass("x-widget");
    $(".x-profile-category .x-heading")
      .prevAll()
      .filter(function () {
        return $(this).css("float") == "right" && $(this).has("a, button");
      })
      .addClass("x-widget");
    $(function () {
      // some extensions add these differently based on the type of profile, so we need to reapply these after the page is loaded and other extensions have made their updates
      window.setTimeout(function () {
        // .copyWidget seems mostly standard, but other extensions put their widgets in identified span tags (helpScissors, distanceFromYou, yourRelationshipText, etc.)
        $(
          ".x-heading-title button, .copyWidget, .x-heading-title span[id], .x-heading-title:not(.x-heading) ~ *[id]"
        ).addClass("x-widget");
      }, 500);
    });

    // mark the privacy status container at the right of the heading
    $(".x-heading a.nohover").parent().addClass("x-privacy");

    // mark the content section (on the left of the sidebar) which contains the biography, sources, etc. up to where the comments section starts; for categories, the content is all in the root section
    $(".x-profile > .ten.columns, .x-profile-category > .columns").first().addClass("x-content");

    // mark alert boxes (like research notes, orphaned profile, etc.)
    $(
      "x-content > .status, .x-content > a[name]:last-of-type ~ .box.orange, .x-content:not(* > a[name]) > .box.orange"
    ).addClass("x-alert");

    // mark the sidebar to the right (with DNA connections, images, collaboration, etc.)
    $(".x-profile > .six.columns").first().addClass("x-sidebar");

    // mark the tabs, including the main tabs at the top (which link to different pages) and the buttons below them (which jump to different views)
    $(".x-profile .profile-tabs").addClass("x-tabs-page");
    $(".x-profile #views-wrap").addClass("x-tabs-view");
    $(".x-tabs-page, .x-tabs-view").first().closest(".columns").addClass("x-tabs"); // this includes the div containing both sets of tabs

    // mark any kind of edit links or buttons like [edit], [add spouse], Invite Others, etc.
    $(".x-content div.EDIT, .x-content a.BLANK, .x-content .editsection, .x-content a[href$='#additions']").addClass(
      "x-edit"
    );

    // mark the audit lines in the profile that show the manager, last modified, how many times the page has been accessed, etc.
    $(".x-content > div.SMALL").addClass("x-audit");
    $(".x-content p.SMALL")
      .filter(function () {
        var txt = $(this).text();
        return txt.indexOf("last modified") > -1 && txt.indexOf("been accessed") > -1;
      })
      .addClass("x-audit"); // category pages are displayed this way

    // mark the sources link in the table of contents
    $(".x-content .toc a[href='#Sources']").closest("li").addClass("x-toc-sources");

    // mark stickers inside the content
    $(".x-content > div")
      .filter(function () {
        return $(this).css("float") == "right" && $(this).css("display") == "flex";
      })
      .addClass("x-sticker");

    // mark inline citations (both <ref> tags and "citation needed")
    $(".x-content sup.reference, .x-content sup > i > a[href$='/Help:Sources']").closest("sup").addClass("x-citation");

    // mark inline images (and the containing link)
    $(".x-content a.image > img").addClass("x-inline-img").parent().addClass("x-inline-img");

    // mark tables (and the row and cell) that only wrap a single inline image
    $("tr:first-child > td > .x-inline-img")
      .filter(function () {
        var el = $(this);
        if (el.siblings().length > 0) return false; // this should be the only element in the cell
        el = el.parent();
        if (el.siblings().length > 0) return false; // this should be the only cell in the row
        el = el.parent();
        if (el.siblings().length > 1) return false; // allow one additional row for the caption
        return true;
      })
      .parent()
      .addClass("x-inline-img")
      .parent()
      .addClass("x-inline-img")
      .closest("table")
      .addClass("x-inline-img");

    // mark inline tables (inline images must be marked first so that they will be excluded, along with the table of contents)
    $(".x-content table:not(.toc):not(.x-inline-img)").addClass("x-inline-table");

    // mark root sections in content (h2 only)
    $(".x-content a[name] + h1, .x-content a[name] + h2").prev().addClass("x-root-section x-section");

    // mark subdivided sections (h3, etc.)
    $(".x-content a[name] + h3, .x-content a[name] + h4, .x-content a[name] + h5, .x-content a[name] + h6")
      .prev()
      .addClass("x-section");

    // mark memories section (only at the bottom of certain profiles)
    $("a[name='Memories']").prev().addClass("x-memories").nextAll().addClass("x-memories");
    $(".x-memories, .x-content > br:last-child").addClass("x-memories").prevUntil("*:not(br)").addClass("x-memories"); // memories are usually preceded by a couple of line breaks, sometimes present at the end of content even if the memories block is missing

    // mark elements related to the sources section (including header, lists, and any other root elements) up until the next section *** dependent on x-memories being set
    $(".x-content a[name='Sources']")
      .first()
      .addClass("x-sources")
      .nextUntil(".x-root-section, div.EDIT, .x-memories, br[clear] + div.SMALL")
      .addClass("x-sources")
      .each(function () {
        // sometimes text can be put in the sources section, such as "See also:" (only happens with leading whitespace)
        if (this.previousSibling.nodeType == 3 && /\S/.test(this.previousSibling.nodeValue)) {
          $(this.previousSibling).wrap('<span class="x-sources"></span>');
        }
      });
    $(".x-content ol.references").addClass("x-sources");
    // mark source list items separately
    $("ul.x-sources > li, ol.x-sources > li").addClass("x-src");

    // mark comments section, including the form components
    $("#comments, .comment-form-container").addClass("x-comments");

    // mark merges section, including pending and rejected matches
    $(".x-profile-person a[name='matches']").parent().addClass("x-merges").nextAll(".five").addClass("x-merges");

    // mark connections to famous people
    $(".x-profile-person > div:last-child")
      .filter(function () {
        return $(this).text().indexOf("degrees from") > -1 && $(this).has("a[href~='Special:Connect']");
      })
      .last()
      .addClass("x-connections");

    // mark the container for the categories box, including the breadcrumbs at the bottom of profiles (ie. S > Smith > John Smith) and the top of the category profile
    $(".x-profile-category .x-content > p > a:first-of-type[href$='/Category:Categories']")
      .parent()
      .addClass("x-categories");
    $("#categories").closest(".container").addClass("x-categories");
    $("#footer").prev().addClass("x-categories");

    // prevent this from running more than once per page
    hasProfileClasses = true;
  }
}
