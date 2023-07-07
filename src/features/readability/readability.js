/*
 * Created By: Jonathan Duke (Duke-5773)
 * Original Features:
 *   Accessibility Options (Duke-5773)
 *   Reading Mode (Duke-5773)
 *   Collapsible Sources (Beacall-6)
 *   Format Source Reference Numbers (Beacall-6)
 */

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage.js";
import { ensureProfileClasses } from "../../core/profileClasses";

async function initReadability() {
  ensureProfileClasses();
  const options = await getFeatureOptions("readability");
  // options related to sources and accessibility
  if (options.listItemSpacing && options.listItemSpacing !== "default") {
    document.documentElement.style.setProperty("--a11y-li-spacing", (1.5 * options.listItemSpacing) / 100 + "em"); // this is based on the normal paragraph margin being 1.5em
    if (false !== options.spaceSourceItemsOnly) {
      $("html").addClass("a11y-src-spacing"); // only apply spacing to lists in the Sources section
    } else {
      $("html").addClass("a11y-list-spacing"); // apply spacing rules to all lists in the profile content
    }
  }
  if (options.mergeAdjacentLists) {
    let qy;
    if (false !== options.spaceSourceItemsOnly) {
      qy = $(".x-content > .x-sources"); // only look at elements in the Sources section
    } else {
      qy = $(".x-content > *:not(#toc)").first().nextAll(); // look at all elements at the root of the content section (except for the TOC)
    }
    let ul;
    qy.each(function () {
      let el = $(this);
      if (el.is("ul")) {
        if (ul) {
          let li = el.children().detach().appendTo(ul); // merge all child list items into the preceding list
          el.remove();
        } else {
          ul = el; // this will be the starting point where all successive lists will be merged into
        }
      } else {
        ul = null; // there are no more adjacent lists, so start looking for the next starting point
      }
    });
  }
  if (options.removeBackReferences % 4 > 0) {
    // if enabled, remove back references first so we don't have to skip over them later
    $(".x-src").each(function () {
      let li = $(this);
      li.contents().each(function () {
        let el = $(this);
        if (el.is("sup, a[href^='#_ref']:first-of-type, span:empty, a[name]:empty")) {
          if (!$(this).is(":empty")) {
            $(this).addClass("a11y-back-ref");
          }
          return true; // flag back-reference links
        }
        if (this.nodeValue && /^[*\s\u2191]*$/.test(this.nodeValue)) {
          $(this).wrap('<span class="a11y-back-ref"></span>');
          return true; // flag whitespace and the up arrow
        }
        return false;
      });
    });
  }
  if (options.indentSrcPlainText) {
    $(".x-sources.x-text-only")
      .wrapInner('<dl class="section-sources x-sources x-text-only"><dd></dd></dl>')
      .children()
      .unwrap();
  }
  if (options.removeSourceBreaks / 1 || options.removeSourceLabels || options.boldSources) {
    let qy = $(".x-src");
    if (options.removeSourceBreaks % 4 > 0) {
      qy.each(function () {
        let li = $(this);
        li.find("br").addClass("a11y-src-br").after(" ");
      });
    }
    if (options.removeSourceLabels % 4 > 0) {
      qy.each(function () {
        let li = $(this);
        li.contents().each(function () {
          let el = $(this);
          if (
            el.is(
              "sup, a[href^='#_ref']:first-of-type, span:empty, a[name]:empty, .a11y-back-ref, .a11y-back-br, .a11y-src-label"
            )
          ) {
            return true; // skip over back-reference links
          }
          if (this.nodeValue && /^[*\s\u2191]*$/.test(this.nodeValue)) {
            return true; // skip over whitespace and the up arrow (sometimes a link, sometimes text, depending on whether there are multiple references)
          }
          if (el.is("b")) {
            if (this.nextSibling && this.nextSibling.nodeType && this.nextSibling.nodeType === 3) {
              this.nextSibling.nodeValue = this.nextSibling.nodeValue.replace(/^[\s:;,.-]+/, function (match) {
                // add trailing whitespace and punctuation as part of the label (even if it is not bold)
                let span = $('<span class="a11y-src-label"></span>');
                span.text(match);
                el.after(span);
                return "";
              });
            }
            el.addClass("a11y-src-label");
          }
          return false;
        });
        $(".a11y-back-ref")
          .filter(function () {
            // any node with only whitespace and asterisks that got flagged as a back-ref should be switched to a label
            return /^\s*(\*\s*)+$/.test($(this).text());
          })
          .removeClass("a11y-back-ref")
          .addClass("a11y-src-label")
          .each(function () {
            let el = $(this),
              match,
              trim = false;
            // trim whitespace and move it outside of the tag
            if ((match = el.text().match(/^\s+/))) {
              trim = true;
              el.before(match[0]);
            }
            if ((match = el.text().match(/\s+$/))) {
              trim = true;
              el.after(match[0]);
            }
            if (trim) {
              el.text(el.text().replace(/(^\s+)|(\s+$)/g, ""));
            }
          });
        // if the label is actually a subheading before a list, remove the flag
        li.contents(".a11y-src-label + ul, .a11y-src-label + ol, .a11y-src-label + dl")
          .prevAll()
          .removeClass("a11y-src-label");
      });
    }
    if (options.boldSources % 4 > 0) {
      qy.each(function (index) {
        let li = $(this);
        let state = 1;
        li.contents()
          .filter(function () {
            let el = $(this);
            if (state > 3) {
              return false;
            } else if (state == 1) {
              // skip back-references, anchors, whitespace, and the up arrow (sometimes a link, sometimes text, depending on whether there are multiple references) at the beginning
              if (
                el.is(
                  "sup, a[href^='#_ref']:first-of-type, span:empty, a[name]:empty, .a11y-back-ref, .a11y-src-br, .a11y-src-label"
                ) ||
                (this.nodeValue && /^[*\s\u2191]*$/.test(this.nodeValue))
              ) {
                return false;
              }
              state++;
            }
            if (this.nodeType) {
              if (state == 2 && this.nodeType == 1 && $(this).is("i, b, a")) {
                state++;
                return true;
              } else if (this.nodeType == 3 && state <= 3) {
                if (/[^\s:;,.-]/.test(this.textContent)) {
                  state = 4;
                  return true;
                }
              }
            }
            return false;
          })
          .each(function () {
            if (this.nodeType == 3) {
              let match;
              if (state < 5) {
                let first, rest;
                // split off leading asterisks and whitespace as part of the label
                if ((match = this.textContent.match(/^([*\s]*\*)(.*)/))) {
                  let segment = $('<span class="a11y-src-label"></span>');
                  segment.text(match[1]).insertBefore(this);
                  this.textContent = match[2];
                }
                // detect the first significant segment of the source
                if ((match = this.textContent.match(/^(\s*["\u201c-\u201d].{6,100}?["\u201c-\u201d]+)(.*)/s))) {
                  // for sources that start with something enclosed in quotes
                  rest = match[2];
                  first = match[1];
                } else if (
                  (match = this.textContent.match(
                    /^((\s*[^"\u2018-\u201d,]{4,20}\w*,){1,2}[^"\u2018-\u201d,.]{4,20}\w*[,.]\s*)(.*)/s
                  ))
                ) {
                  // for sources with comma separators such as Last, First Middle, Jr.
                  rest = match[3];
                  first = match[1];
                } else if (
                  (match = this.textContent.match(
                    /^(\s*[^"\u201c-\u201d]{3,20}\w*\b[^"\u201c-\u201d,.(]{0,20}\w*[,.)]*)(.*)/s
                  ))
                ) {
                  // for sources that start with some other non-quoted phrase that terminates with a separator
                  rest = match[2];
                  first = match[1];
                  if ((match = first.match(/(.*(\w{1,4}\.\s*){2,}\s+\b(\w+\.)?)(.*)/s))) {
                    // special case for Smith, John, Ph.D. or Smith, Lt. Col. Samuel.
                    first = match[1];
                    rest = match[4] + rest;
                  }
                }
                // only update if there would be some content after the bold text
                if (/\S/.test(rest || "") || $(this).nextAll().length > 0) {
                  this.textContent = rest;
                  let segment = $('<span class="a11y-src-first"></span>');
                  segment.text(first).insertBefore(this);
                }
              }
            } else if (state > 3) {
              // if it's only a standalone link, don't bold the whole thing
              $(this).wrap('<span class="a11y-src-first"></span>');
              state = 5;
            }
          });
      });
    }
  }
  if (options.hideCitations % 256 !== 255) {
    // no reason to modify citations if they are always hidden
    if (options.citationSize / 1 !== 100) {
      document.documentElement.style.setProperty("--a11y-citation-size", options.citationSize / 1 + "%");
    }
    if (options.citationSpacing / 1 !== 0) {
      document.documentElement.style.setProperty("--a11y-citation-spacing", options.citationSpacing / 100 + "em");
    }
    if (options.cleanCitations) {
      $("html").addClass("a11y-ref-clean");
    }
    if (
      options.citationFormat / 1 > 0 ||
      options.citationSpacing / 1 !== 0 ||
      options.cleanCitations ||
      options.sortCitations
    ) {
      // remove whitespace from between adjacent citations to prevent 1234 instead of 1,2,3,4
      $(".x-content sup.reference + sup.reference").each(function () {
        let prev = this.previousSibling;
        if (prev && prev.nodeType === 3 && (!prev.nodeValue || prev.nodeValue.replace(/\s+$/, "").length === 0)) {
          prev.remove();
        }
      });
      $(".x-content sup.reference")
        .filter(function () {
          return !(
            this.previousSibling &&
            this.previousSibling.nodeType === 1 &&
            $(this.previousSibling).is("sup.reference")
          );
        })
        .each(function () {
          let group = [$(this)];
          let node = this.nextSibling;
          while (node && $(node).is("sup.reference")) {
            let item = $(node);
            node = node.nextSibling;
            group.push(item);
            if (options.sortCitations) item.remove();
          }
          if (options.sortCitations && group.length > 1) {
            group[0] = $(this.cloneNode(true)); // clone the first node so that we can sort the entire group while preserving the location
            group.sort(function (a, b) {
              let c = parseInt(a.text().replace(/\D/g, ""), 10);
              let d = parseInt(b.text().replace(/\D/g, ""), 10);
              return c > d ? 1 : c < d ? -1 : 0;
            });
            // add the sorted citations, including the clone, after the first node and then remove the duplicate
            $(this).after(group).remove();
          }
          if (options.citationFormat % 2 == 1) {
            group[0].prepend('<span class="x-ref-bracket">[</span>');
            group[group.length - 1].append('<span class="x-ref-bracket">]</span>');
          }
          for (let i = 0; i < group.length; i++) {
            let el = group[i].get(0);
            if (i == 0 && options.cleanCitations) {
              if (el.previousSibling && el.previousSibling.nodeType === 3 && el.previousSibling.nodeValue) {
                // trim whitespace between the previous text and the citation
                el.previousSibling.nodeValue = el.previousSibling.nodeValue.replace(/\s+$/, "");
              }
            }
            if (options.citationFormat / 1 > 1) {
              // [1,2,3] (with or without brackets)
              if (i > 0) group[i].prepend('<span class="x-ref-separator">,</span><wbr />');
            } else if (options.citationFormat / 1 > 0) {
              // [1 2 3]
              if (i > 0) group[i].prepend('<span class="x-ref-separator">&nbsp;</span><wbr />');
            } else {
              // [1][2][3]
              group[i].prepend('<span class="x-ref-bracket">[</span>').append('<span class="x-ref-bracket">]</span>');
            }
            group[i].find("a").each(function () {
              // remove the brackets from the individual citation links
              this.innerText = this.innerText.replace("[", "").replace("]", "");
            });
          }
        });
    }
    if (options.collapseSources / 1 > 0 || options.collapseResearchNotes / 1 > 0) {
      // when clicking on a citation, make sure that the containing section is not collapsed
      $(".x-content sup.reference a, .x-content a[href^='#']")
        .filter(function () {
          if (!$(this).parent().is("sup.reference")) {
            let refId = this.getAttribute("href").substring(1);
            if (refId) {
              let el = document.getElementById(refId);
              if (!el) {
                el = document.getElementsByName(this.getAttribute("href").substring(1));
                if (el.length > 0) {
                  el = el[0];
                }
              }
              let $section;
              if (el && ($section = $(el).closest(".section-sources, .section-researchnotes")) && $section.length > 0) {
                el.xContainingSection = $section.get(0).className.match(/\bsection-\S+/)[0]; // remember the section for later when we need to trigger expansion
                return true; // any links to elements under the containing section should also trigger this
              }
            }
            return false; // any other links should not expand the section
          }
          return true; // any citations by <ref> tags are automatically covered
        })
        .on("click", function () {
          let targetSection = this.xContainingSection && this.xContainingSection.match(/\bsection-(\S+)/)[1];
          let $chk = $(".collapse-" + targetSection + " input#" + targetSection + "_checkbox");
          let chk = $chk.get(0);
          if (chk && !chk.checked) {
            chk.checked = true;
            $chk.trigger("change");
          }
        });
    }
  }
  // toggle hidden elements (either always or in reading mode only)
  function setHiddenElements(toggleValue) {
    const isReadingMode = !!(toggleValue !== undefined ? toggleValue : options.readingMode_toggle);
    let isToggled = function (option, flags) {
      let alwaysFlag = ((flags || 0) ^ 0x7e) | 0x81; // negate the flag bits and set the always and reading bits
      let readingFlag = (flags || 0) | 1; // set the reading bit
      if (option) {
        if (toggleValue === undefined) {
          return option % 256 === alwaysFlag || (isReadingMode && option % 128 === readingFlag);
        } else {
          return option % 256 === readingFlag;
        }
      }
      return 0;
    };
    if (isToggled(options.boldSources)) {
      $("html").toggleClass("a11y-src-bold");
    }
    if (isToggled(options.removeSourceBreaks)) {
      $("html").toggleClass("hide-src-br");
    }
    if (isToggled(options.removeSourceLabels)) {
      $("html").toggleClass("hide-src-label");
    }
    if (isToggled(options.removeBackReferences)) {
      $("html").toggleClass("hide-src-back");
    }
    if (isToggled(options.hideSidebarStatus)) {
      $("html").toggleClass("hide-sidebar-status");
    }
    if (isToggled(options.hideForumPosts)) {
      $("html").toggleClass("hide-sidebar-posts");
    }
    if (isToggled(options.hideDNAConnections, 2)) {
      $("html").toggleClass("hide-dna-no-carriers");
    } else if (isToggled(options.hideDNAConnections)) {
      $("html").toggleClass("hide-sidebar-dna");
    }
    if (isToggled(options.hideSidebarImages)) {
      $("html").toggleClass("hide-sidebar-images");
    }
    if (isToggled(options.hideCollaborationLinks)) {
      $("html").toggleClass("hide-sidebar-collaboration");
    }
    if (isToggled(options.hideResearch)) {
      $("html").toggleClass("hide-sidebar-research");
    }
    if (isToggled(options.hideInlineTables)) {
      $("html").toggleClass("hide-inline-tables");
    }
    (function (collapsibleSections) {
      collapsibleSections.forEach(function (section) {
        let sectionLower = section.toLowerCase();
        if (options["collapse" + section] / 1 === 254) {
          if (toggleValue === undefined) {
            // this displays the toggle button at initialization, but it will start expanded instead of collapsed (see toggleSection below)
            $("html").toggleClass("collapse-" + sectionLower);
          }
        } else if (isToggled(options["collapse" + section])) {
          $("html").toggleClass("collapse-" + sectionLower);
        }
      });
    })(["Sources", "ResearchNotes"]);
    if (isToggled(options.hideCitations)) {
      $("html").toggleClass("hide-citations");
    }
    if (isToggled(options.hidePageTabs)) {
      $("html").toggleClass("hide-page-tabs");
    }
    if (isToggled(options.hideViewTabs)) {
      $("html").toggleClass("hide-view-tabs");
    }
    if (isToggled(options.hideAuditData)) {
      $("html").toggleClass("hide-audit-data");
    }
    if (isToggled(options.hideMemberSection)) {
      $("html").toggleClass("hide-member-section");
    }
    if (isToggled(options.hideStatus)) {
      $("html").toggleClass("hide-status");
    }
    if (isToggled(options.hideStickers)) {
      $("html").toggleClass("hide-stickers");
    }
    if (isToggled(options.hideTableOfContents)) {
      $("html").toggleClass("hide-toc");
    }
    if (isToggled(options.hideInlineImages)) {
      $("html").toggleClass("hide-inline-images");
    }
    if (isToggled(options.hideComments)) {
      $("html").toggleClass("hide-comments");
    }
    if (isToggled(options.hideHeadingExtras)) {
      $("html").toggleClass("hide-heading-extras");
    }
    if (isToggled(options.hideThumbnail, 2)) {
      $("html").toggleClass("hide-default-thumbnail");
    } else if (isToggled(options.hideThumbnail)) {
      $("html").toggleClass("hide-thumbnail");
    }
    if (isToggled(options.hideEdits)) {
      $("html").toggleClass("hide-edits");
    }
    if (isToggled(options.hideConnections)) {
      $("html").toggleClass("hide-connections");
    }
    if (isToggled(options.hideCategories)) {
      $("html").toggleClass("hide-categories");
    }
    if (isToggled(options.hideBackground)) {
      $("html").toggleClass("hide-background");
    }
    // this needs to take place after all of the other elements are toggled (to check for visible children)
    if (options.hideSidebar / 1 > 0) {
      let $sb = $(".x-sidebar");
      if (isToggled(options.hideSidebar, 2)) {
        $("html").toggleClass("collapse-sidebar-if-empty");
      } else if (isToggled(options.hideSidebar)) {
        $("html").toggleClass("collapse-sidebar");
        $sb.prev().toggleClass("ten").toggleClass("sixteen");
      }
      if (options.hideSidebar / 1 === 3 || options.hideSidebar / 1 === 253) {
        $sb.removeClass("no-visible-content");
        // wait for the CSS to apply so that we can determine visibility
        window.setTimeout(function () {
          if (
            $sb.children(":visible").filter(function () {
              // some elements may technically be visible but have no content, like anchors and #geneticfamily
              return !!$(this).html();
            }).length === 0
          ) {
            $sb.addClass("no-visible-content");
          } else {
            $sb.removeClass("no-visible-content");
          }
          // wait for the no-visible-content class to be applied
          window.setTimeout(
            function () {
              if (!$sb.is(":visible")) {
                $sb.prev().addClass("sixteen").removeClass("ten");
              } else {
                $sb.prev().removeClass("sixteen").addClass("ten");
              }
            },
            toggleValue === undefined ? 1000 : 0 // delay a little extra on the initial load
          );
        }, 0);
      }
    }
  }

  (function (collapsibleSections) {
    collapsibleSections.forEach(function (section) {
      let sectionLower = section.toLowerCase();
      if (options["collapse" + section]) {
        let toggleSection = function () {
          $("html").toggleClass("expand-" + sectionLower);
        };
        let startExpanded = options["collapse" + section] / 1 === 254; // by default we start collapsed, but in some cases we may need to start expanded
        if (!startExpanded && !!window.location.hash) {
          let target = document.getElementById(window.location.hash.substring(1));
          if (!target) {
            let byName = document.getElementsByName(window.location.hash.substring(1));
            if (byName.length > 0) {
              target = byName[0];
            }
          }
          if (target && $(target).closest(".section-" + sectionLower).length > 0) {
            // only expand if the target is part of the containing section
            startExpanded = true;
          }
        }
        if (startExpanded) {
          toggleSection();
        }
        let toggleElement = $(
          '<span class="toggle toggle-section show-' +
            sectionLower +
            '"><input type="checkbox" id="toggle_section_' +
            sectionLower +
            '"' +
            (startExpanded ? ' checked="checked"' : "") +
            '><label for="toggle_section_' +
            sectionLower +
            '"></label></span>'
        );
        toggleElement.find("input").on("change", function () {
          toggleSection();
        });
        $("h2.section-" + sectionLower)
          .first()
          .append(toggleElement);
      }
    });
  })(["Sources", "ResearchNotes"]);

  if (options.hideBackground) {
    let bgStyle = $(".x-style-bg");
    bgStyle.text(bgStyle.text().replace(/\b(BODY\s*{)/is, "html:not(.hide-background) $1"));
  }

  setHiddenElements(); // initialize with the saved setting

  // this only controls whether the toggle button for reading mode is on the screen
  if (options.readingMode) {
    // this function will toggle reading mode on/off in the feature options
    let setToggleValue = async function (value) {
      try {
        (chrome ?? browser)?.storage?.sync?.get("readability_options", async function (result) {
          if (result) {
            let options = (result.readability_options = result.readability_options || {});
            options.readingMode_toggle = value;
            await chrome.storage.sync.set(result);
          }
        });
      } catch {
        // ignore the error if the extension context was invalidated; the value simply won't be persisted this time
      }
    };

    // add the toggle to turn reading mode on/off while viewing the page instead of having to go into the extension for it
    let toggleElement = $(
      '<div style="--font-px:11" class="toggle label-left reading-mode .x-widget"><input type="checkbox" id="reading_mode_checkbox"' +
        (options.readingMode_toggle ? " checked" : "") +
        '><label for="reading_mode_checkbox">Reading Mode</label>'
    );
    toggleElement.find("input").on("change", function () {
      setHiddenElements(this.checked);
      setToggleValue(this.checked);
    });
    // add the toggle button at the top of the page content
    //$(".x-profile").first().prepend(toggleElement);
    $("#header .pureCssMenu").first().after(toggleElement);
  }
}

shouldInitializeFeature("readability").then((result) => {
  if (result) {
    import("../../core/toggleCheckbox.css");
    import("./readability.css");
    initReadability();
  }
});
