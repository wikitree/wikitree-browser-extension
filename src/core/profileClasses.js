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
    $("header").addClass("x-header");
    $("footer").addClass("x-footer");

    // there can be multiple sections with profile content (the heading and tabs are separate from the rest of the profile)
    $("main, section#person, section#heading")
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

    // mark the content section (on the left of the sidebar) which contains the biography, sources, etc. up to where the comments section starts; for categories, the content is all in the root section
    $(".x-profile .body-text, .x-profile .tab-content, .x-profile-category .page--content").addClass("x-content");

    // mark the CSS element to apply a custom background image
    $(".has--bg_img").addClass("x-style-bg");

    // mark the heading content
    $("section.x-profile h1").addClass("x-heading-title");
    $(".x-heading-title").closest(".row").addClass("x-heading");

    // mark the thumbnail image container based on the heading
    $(".x-heading .img-profile").first().addClass("x-thumbnail");
    $(
      ".x-thumbnail img[alt*='upload photo'], .x-thumbnail img[alt*='upload image'], .x-thumbnail img[alt*='no photo'], .x-thumbnail img[alt*='no image']"
    )
      .closest(".x-thumbnail")
      .addClass("x-thumbnail-default");

    // mark the widgets (scissors, buttons, etc.)
    $(".copy--buttons, .x-heading .btn-utility, .x-content .btn-utility").addClass("x-widget");
    $(".x-profile-category .page--content > div.clearfix:first-child, .x-profile-category nav#bottm-nav").addClass(
      "x-widget"
    );

    // relationships (family members, ancestor tree, descendants tree), including the tabs (which were buttons and considered widgets in the past)
    $(".tree--header").addClass("x-widget");
    $(".tree--header, .tree--header + .tab-content").addClass("x-relationships");

    // mark the privacy status container at the right of the heading
    $(".x-heading .privacy").closest("div").addClass("x-privacy");

    // special content elements
    $(".x-content .toc").addClass("x-toc");
    $(".x-content .status").addClass("x-status");

    // PPP was in the sidebar on v1, so we'll maintain that cass just in case it was used anywhere, but also with additional classes
    $(".protected--profile").closest(".row").addClass("x-sidebar-status x-status-ppp");

    // mark alert boxes (like research notes, orphaned profile, etc.)
    $(
      ".x-content > .status, .x-status-ppp, .x-content > .projectbox, .x-content > a[name]:last-of-type ~ .box.orange, .x-content:not(* > a[name]) > .box.orange"
    ).addClass("x-alert");

    $(
      ".x-content > .status, .x-content > .projectbox, .x-content > a[name]:last-of-type ~ .box.orange, .x-content:not(* > a[name]) > .box.orange"
    ).addClass("x-alert");

    // mark the sidebar to the right (with DNA connections, images, collaboration, etc.)
    $(".x-profile .container .col-lg-8 ~ .col-lg-4").addClass("x-sidebar");

    // mark the individual sections of the sidebar (based on content)
    $(".x-sidebar > section, .x-sidebar > aside").each(function () {
      let el = $(this);
      el.addClass("x-sidebar-section");
      if (el.is("#Profile-Data") || el.is("aside:first-child")) {
        // Profile Data (also .x-audit, which was not in the sidebar in v1)
        el.addClass("x-sidebar-profile");
      } else if (el.is("#Photos")) {
        // Images
        el.addClass("x-photos x-sidebar-images");
      } else if (el.is("#DNA-Connections")) {
        // DNA connections
        el.addClass("x-dna-connections x-sidebar-dna");
        if (!el.find("ul").length > 0) {
          // This section doesn't seem to be displayed if there are no carriers now, but keeping this logic just in case
          el.addClass("x-dna-no-carriers");
        }
      } else if (el.is("#Research")) {
        // Research
        el.addClass("x-callout x-callout-research x-sidebar-research");
      } else if (el.is("#G2G")) {
        // G2G posts
        el.addClass("x-g2g-posts x-sidebar-posts");
        const appreciation = ["Wonderful WikiTreer", "Congratulations", "G2G points", "new pilot", "awesome WikiTreer"];
        const appreciationPosts = el.find("a[href^='/g2g/']").filter(function () {
          return appreciation.some((app) => new RegExp(app, "i").test($(this).text()));
        });
        appreciationPosts.parent().addClass("x-g2g-appreciation");
      } else {
        // flag other sections even if not recognized
        el.addClass("x-sidebar-unknown");
      }
    });

    // mark the tabs section and the buttons within it
    $(".tabs--wrapper, .x-profile-category nav.x-widget").addClass("x-tabs");
    $(".x-tabs .profile--actions").addClass("x-tabs-page");
    $(".x-tabs #jump-nav").addClass("x-tabs-view");

    // mark any kind of edit links or buttons like [edit], [add spouse], Invite Others, etc.
    $(".x-content .EDIT, .x-heading .EDIT, .x-content .editsection").addClass("x-edit");
    $(".x-content .icon--edit").closest("a").addClass("x-edit");
    $(".VITALS a[href*='Special:Edit']").addClass("x-edit");

    // mark the audit section of the profile that show the manager, last modified, how many times the page has been accessed, etc.
    // this also includes the "Problems or Questions?"" button
    $(".x-sidebar .x-sidebar-profile, .x-profile-category nav + aside.footnote").addClass("x-audit");
    $("button[data-bs-target='#privacyModal']").closest("span").addClass("x-audit");

    // mark the sources link in the table of contents
    $(".x-toc a[href='#Sources']").closest("li").addClass("x-toc-sources");

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
        let el = $(this);
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

    // unmark inline images that are inside stickers, project boxes, or inline tables
    $(".x-inline-table .x-inline-img, .x-sticker .x-inline-img, .x-alert .x-inline-img").removeClass("x-inline-img");

    // unmark inline tables that are inside stickers, project boxes, etc.
    $(".x-sticker .x-inline-table, .x-alert .x-inline-table").removeClass("x-inline-table");

    // mark root sections in content (h2 only)
    $(".x-content a[name] + h1, .x-content a[name] + h2").prev().addClass("x-root-section x-section");

    // mark subdivided sections (h3, etc.)
    $(".x-content a[name] + h3, .x-content a[name] + h4, .x-content a[name] + h5, .x-content a[name] + h6")
      .prev()
      .addClass("x-section");

    // mark memories section (only at the bottom of certain profiles)
    $("section#Memories").addClass("x-memories");

    // mark collaboration section (was in the sidebar in the past)
    $(".x-content.body-text ~ .box.rounded")
      .filter(function () {
        return $(this).find("h3 ~ ul").length > 0;
      })
      .last()
      .addClass("x-callout x-callout-collaboration x-sidebar-collaboration");

    // mark elements related to certain sections (including header, lists, and any other root elements) up until the next section *** dependent on x-memories being set
    $(".x-content a[name].x-root-section, .x-content a[name].x-section").each(function () {
      let className = "section-" + this.name.replace(/[\W_]+/g, "").toLowerCase();
      if (className == "section-sources") {
        className += " x-sources";
      }
      $(this)
        .first()
        .nextUntil(".x-root-section, .x-edit, .x-memories, br[clear] + div.SMALL")
        .addBack()
        .addClass(className)
        .each(function () {
          /*
           * Sometimes unwrapped text can be rendered in the body, such as "See also:"
           * (this seems to happen with leading whitespace or when templates/stickers are
           * placed within text). Since there are no containers to wrap a section's content,
           * we have to wrap the text nodes in a <span> tag so that the classes can be applied.
           */
          if (this.previousSibling.nodeType == 3 && /\S/.test(this.previousSibling.nodeValue)) {
            $(this.previousSibling).wrap('<span class="' + className + '"></span>');
          }
        });
    });
    $(".x-content ol.references").addClass("section-sources x-sources");

    // mark plain-text elements at the root of the sources section
    $(".x-content > p.x-sources")
      .filter(function () {
        return (
          $(this)
            .children()
            .filter(function () {
              return !(this.nodeType === 3 || $(this).is("a[name]:empty, a[id]:empty, span[id]:empty"));
            }).length === 0
        );
      })
      .addClass("x-text-only");

    // mark source list items separately
    $("ul.x-sources > li, ol.x-sources > li").addClass("x-src");

    // mark comments section, including the form components
    $("section#Comments").addClass("x-comments");

    // mark merges section, including pending and rejected matches
    $("section#Matches").addClass("x-merges");

    // mark connections to famous people
    $(".x-profile-person > section:last-child")
      .filter(function () {
        return $(this).text().indexOf("degrees from") > -1 && $(this).has("a[href*='Special:Connect']");
      })
      .addClass("x-connections");

    // mark the categories section, including the breadcrumbs at the bottom of profiles (ie. S > Smith > John Smith) for backward compatibility
    $("main ~ .category--links, main > .category--links:first-child").addClass("x-categories");
    $("#categories").closest(".container").addClass("x-categories");
    $("#categories").addClass("x-categories");
    $("main ~ #subfooter").addClass("x-categories x-breadcrumbs");

    // mark the member section and the header/button for it
    $(".genealogical--interests, section#memberSection").addClass("x-member-section");

    // new callout banner for member status or notables
    $("aside.callout").addClass("x-callout");
    $(".x-callout.notable--connection").addClass("x-callout-notable");
    $(".x-callout:not(.notable--connection)")
      .filter(function () {
        return $(this).find(".is--verified").length > 0;
      })
      .addClass("x-callout-verified");

    // mark the banner that sometimes is displayed above the header
    $("body > #banner").addClass("x-banner");

    // mark the leaders-only section above the footer
    $("main ~ #subfooter + div:not(#footer)").addClass("x-leaders");

    // prevent this from running more than once per page
    hasProfileClasses = true;
  }
}
