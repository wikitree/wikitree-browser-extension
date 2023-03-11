/*
Created By: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage.js";
import { ensureProfileClasses } from "../../core/profileClasses";

async function initAccessibility() {
  ensureProfileClasses();
  const options = await getFeatureOptions("accessibility");
  if (options.listItemSpacing && options.listItemSpacing > 0) {
    document.documentElement.style.setProperty("--a11y-spacing", 1.5 * options.listItemSpacing / 100 + "em"); // this is based on the normal paragraph margin being 1.5em
    if (options.spaceSourceItemsOnly) {
      $("html").addClass("a11y-src-spacing"); // only apply spacing to lists in the Sources section
    } else {
      $("html").addClass("a11y-list-spacing"); // apply spacing rules to all lists in the profile content
    }
  }
  if (options.mergeAdjacentLists) {
    let qy;
    if (options.spaceSourceItemsOnly) {
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
  if (options.removeBackReferences) {
    // if enabled, remove back references first so we don't have to skip over them later
    $(".x-src").each(function () {
      let li = $(this);
      li.contents().each(function () {
        let el = $(this);
        if (el.is("sup, a[href^='#'], span:empty")) {
          if (this.tagName !== "SPAN") {
            $(this).remove();
          }
          return true; // remove back-reference links
        }
        if (this.nodeValue && /^\u2191?\s*$/.test(this.nodeValue)) {
          $(this).remove();
          return true; // remove whitespace and the up arrow
        }
        return false;
      });
    });
  }
  if (options.removeSourceBreaks || options.removeSourceLabels || options.boldSources) {
    let qy = $(".x-src");
    if (options.removeSourceBreaks) {
      qy.each(function () {
        let li = $(this);
        li.find("br").replaceWith(" ");
      });
    }
    if (options.removeSourceLabels) {
      qy.each(function () {
        let li = $(this);
        li.contents().each(function () {
          let el = $(this);
          if (el.is("sup, a[href^='#'], span:empty")) {
            return true; // skip over back-reference links
          }
          if (this.nodeValue && /^\u2191?\s*$/.test(this.nodeValue)) {
            return true; // skip over whitespace and the up arrow (sometimes a link, sometimes text, depending on whether there are multiple references)
          }
          if (el.is("b")) {
            if (this.nextSibling && this.nextSibling.nodeType && this.nextSibling.nodeType === 3) {
              this.nextSibling.nodeValue = this.nextSibling.nodeValue.replace(/^[\s:;,.-]+/, "");
            }
            el.remove();
          }
          return false;
        });
      });
    }
    if (options.boldSources) {
      $("html").addClass("a11y-src-bold");
      qy.each(function (index) {
        let li = $(this);
        let state = 1;
        li.contents().filter(function () {
          let el = $(this);
          if (state > 3) {
            return false;
          } else if (state == 1) {
            // skip back-references, anchors, whitespace, and the up arrow (sometimes a link, sometimes text, depending on whether there are multiple references) at the beginning
            if (el.is("sup, a[href^='#'], span:empty") || (this.nodeValue && /^\u2191?\s*$/.test(this.nodeValue))) {
              return false;
            }
            state++;
          }
          if (this.nodeType) {
            if (state == 2 && this.nodeType == 1 && $(this).is("i, b, a")) {
              state++;
              return true;
            } else if (this.nodeType == 3 && state <= 3) {
              if (/\S/.test(this.textContent)) {
                state = 4;
                return true;
              }
            }
          }
          return false;
        }).each(function () {
          if (this.nodeType == 3) {
            let match;
            if (state < 5) {
              let first, rest;
              if (match = (this.textContent.match(/^(\s*["\u201c-\u201d].{6,100}?["\u201c-\u201d]+)(.*)/s))) {
                // for sources that start with something enclosed in quotes
                rest = match[2];
                first = match[1];
              } else if (match = (this.textContent.match(/^((\s*[^"\u2018-\u201d,]{4,20}\w*,){1,2}[^"\u2018-\u201d,.]{4,20}\w*[,.]\s*)(.*)/s))) {
                // for sources with comma separators such as Last, First Middle, Jr.
                rest = match[3];
                first = match[1];
              } else if (match = (this.textContent.match(/^(\s*[^"\u201c-\u201d]{3,20}\w*\b[^"\u201c-\u201d,.(]{0,20}\w*[,.)]*)(.*)/s))) {
                // for sources that start with some other non-quoted phrase that terminates with a separator
                rest = match[2];
                first = match[1];
                if (match = (first.match(/(.*(\w{1,4}\.\s*){2,}\s+\b(\w+\.)?)(.*)/s))) {
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
          } else if (state > 3) { // if it's only a standalone link, don't bold the whole thing
            $(this).wrap('<span class="a11y-src-first"></span>');
            state = 5;
          }
        });
      });
    }
    if (options.cleanCitations) {
      $("html").addClass("a11y-ref-clean");
      $(".x-content sup.reference").filter(function () {
        return !(this.previousSibling && this.previousSibling.nodeType === 1 && $(this.previousSibling).is("sup.reference"));
      }).each(function () {
        let group = [$(this.cloneNode(true))];
        let node = this.nextSibling;
        while (node && $(node).is("sup.reference")) {
          let item = $(node);
          node = node.nextSibling;
          group.push(item.remove());
        }
        if (group.length > 1) {
          group.sort(function (a, b) {
            let c = parseInt(a.text().replace(/\D/g, ""), 10);
            let d = parseInt(b.text().replace(/\D/g, ""), 10);
            return c > d ? 1 : c < d ? -1 : 0;
          });
          // add the sorted citations, including the clone, after the first node and then remove the duplicate
          $(this).after(group).remove();
        }
        group[0].find("a").first().before("[");
        group[group.length - 1].find("a").last().after("]");
        for (let i = 0; i < group.length; i++) {
          let el = group[i].get(0);
          if (i == 0) {
            if (el.previousSibling && el.previousSibling.nodeType === 3 && el.previousSibling.nodeValue) {
              // trim whitespace between the previous text and the citation
              el.previousSibling.nodeValue = el.previousSibling.nodeValue.replace(/\s+$/, "");
            }
          } else {
            group[i].prepend(",<wbr />");
          }
          group[i].find("a").each(function () {
            // remove the brackets from the individual citation links
            this.innerText = this.innerText.replace("[", "").replace("]", "");
          });
        }
      });
    }
  }
}

checkIfFeatureEnabled("accessibility").then((result) => {
  if (result) {
    import("./accessibility.css");
    initAccessibility();
  }
});
