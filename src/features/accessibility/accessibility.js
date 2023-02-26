import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage.js";

async function initAccessibility() {
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
      //$("html").addClass("a11y-adj-src-merge");
      qy = $("ol.references, a[name='Sources']").first().nextUntil("a[name^='Acknowledgement']"); // only look at elements between "Sources" and "Acknowledgements" (or the <references /> list, if there is no section header)
    } else {
      //$("html").addClass("a11y-adj-ul-merge");
      qy = $("#toc, a[name='Biography']").first().nextAll(); // look at all elements after either the TOC or Biography header
    }
    let ul;
    qy.each(function(index) {
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
  if (options.removeSourceBreaks || options.removeSourceLabels || options.boldSources) {
    let qy = $("ol.references, a[name='Sources']").first().nextUntil("a[name^='Acknowledgement']").addBack().filter("ol, ul").children("li");
    if (options.removeSourceBreaks) {
      qy.each(function (index) {
        let li = $(this);
        let isFirst = true;
        li.find("br").replaceWith(" ");
      });
    }
    if (options.removeSourceLabels) {
      qy.each(function (index) {
        let li = $(this);
        let isFirst = true;
        li.contents().each(function() {
          let el = $(this);
          if (el.is("sup, a[href^='#'], span:empty")) {
            return true; // skip over back-reference links
          }
          if (this.nodeValue && /^\u2191?\s*$/.test(this.nodeValue)) {
            return true; // skip over whitespace and the up arrow (sometimes a link, sometimes text, depending on whether there are multiple references)
          }
          if (el.is("b")) {
            if (this.nextSibling && this.nextSibling.nodeType && this.nextSibling.nodeType === 3) {
              this.nextSibling.nodeValue = this.nextSibling.nodeValue.replace(/^\s*:\s*/, "");
            }
            el.remove();
          }
          return false;
        });
      });
    }
    if (options.boldSources) {
      $("html").addClass("a11y-src-bold");
      let qy = $("ol.references, a[name='Sources']").first().nextUntil("a[name^='Acknowledgement']").addBack().filter("ol, ul").children("li");
      qy.each(function (index) {
        let li = $(this);
        li.contents().filter(function() {
          let el = $(this);
          if (!el.is("sup, a[href^='#'], span:empty")) {
            if (this.nodeValue && /^\u2191?\s*$/.test(this.nodeValue)) {
              return false; // weed out whitespace and the up arrow (sometimes a link, sometimes text, depending on whether there are multiple references)
            }
            return (this.nodeType && (this.nodeType == 1 || this.nodeType == 3));
          }
          return false;
        }).first().wrap('<span class="a11y-src-first"></span>');
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
