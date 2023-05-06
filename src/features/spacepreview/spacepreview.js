/*
Created By: Steve Harris (Harris-5439)
Contributors: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import "../../thirdparty/jquery.hoverDelay";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

let previewClasses = "x-page-preview";

function onHoverIn($element) {
  hideActivePreview();
  let $popup = $('<div id="activePagePreview" class="' + previewClasses + '" style="display: none;"></div>');
  const match = $element[0].href.match(/\/wiki\/((Space|Category):.*?)(#.*|$)/i);
  getPreviewContent(
    match[2].toLowerCase(), // page type (Space, Category, Help, etc.)
    decodeURIComponent(match[1]), // prefixed ID (Space:WikiTree_Browser_Extension, Category:Cemeteries, Help:Apps)
    $element[0].href // page URL
  )
    .then((content) => {
      $element.after($popup);
      $popup.append(content.body);
      $popup.find('a[name], *[id], a[href^="#"]').each(function () {
        if (this.name) {
          this.name = "_xPagePreview_" + this.name;
        }
        if (this.id) {
          this.id = "_xPagePreview_" + this.id;
        }
        if (this.href) {
          $(this).attr("href", $(this).attr("href").replace(/^#/, "#_xPagePreview_"));
        }
      });
      if (previewClasses.indexOf("show-toc") > -1) {
        let toggleElement = $(
          '<span class="toggle toggle-toc"><input type="checkbox" id="_xPagePreview_toc_checkbox"' +
            (previewClasses.indexOf("expand-toc") > -1 ? ' checked="checked"' : "") +
            '><label for="_xPagePreview_toc_checkbox"></label></span>'
        );
        toggleElement.find("input").on("change", function () {
          $(this).closest(".x-page-preview").toggleClass("expand-toc");
        });
        $popup.find("#_xPagePreview_toctitle > h2").first().wrapInner("<span></span>").append(toggleElement);
      }
      addCloseButton($popup);
      $popup.prepend(
        $('<h2 class="preview-title"></h2>')
          .append($("<a></a>").attr("href", $element[0].href).text(content.title))
          .append(
            ' <button aria-label="Copy ID" class="copyWidget" data-copy-text="' +
              decodeURIComponent(match[1]).replace(/_/g, " ") +
              '" style="color:#8fc641;"><img src="/images/icons/scissors.png">ID</button><button aria-label="Copy Wiki Link" class="copyWidget" data-copy-label="Copy Wiki Link" data-copy-text="[[:' +
              decodeURIComponent(match[1]).replace(/_/g, " ") +
              ']]" style="color:#8fc641;">/Link</button><button aria-label="Copy URL" class="copyWidget" data-copy-label="Copy URL" data-copy-text="' +
              (window.location.href.match(/^.*\/{2,}.*?(?=\/)/) ?? "") +
              "/wiki/" +
              match[1] +
              '" style="color:#8fc641;">/URL</button>'
          )
      );
      let visibleElements = $popup.children().filter(function () {
        if ($(this).css("visibility") !== "hidden") {
          return !($(this).is(".x-preview-close") || !$(this).text());
        }
        return false;
      });
      visibleElements.first().addClass("x-first-visible");
      visibleElements.last().addClass("x-last-visible");
      $popup.fadeIn("fast");
    })
    .catch((reason) => {
      console.warn(reason);
      hideActivePreview();
    });
}

function getPreviewContent(type, pageId, url) {
  return new Promise((resolve, reject) => {
    const parse =
      type === "space"
        ? parseSpaceContent // free-space profiles
        : type === "category"
        ? parseCategoryContent // category profiles
        : parsePageContent; // any other generic content page
    fetch(type, pageId, url)
      .then((response) => {
        // do stuff with the content
        resolve(parse(response));
      })
      .catch((reason) => {
        reject(reason);
      });
  });
}

function fetch(type, pageId, url) {
  // right now, we have to get the full HTML from the page because the user may not be authenticated on the API
  return new Promise((resolve, reject) => {
    $.ajax({
      url: url,
      type: "GET",
      xhrFields: { withCredentials: true },
    })
      .done((data, textStatus, jqXHR) => {
        if (data) {
          resolve(data);
        } else {
          reject(textStatus);
        }
      })
      .fail((jqXHR, textStatus, errorThrown) => {
        reject(errorThrown);
      });
  });
}

function parsePageContent(response) {
  let content = {
    document: response.replace(/(<\/?)(?=script)/g, "$1no"), // sanitize script tags
    body: "<div></div>",
  };
  let $content = $(content.document);
  content.title = (
    $content.find("h1").first().clone().children().remove().end().text() ?? $content.find("title").first().text()
  )?.replace(/(^\s+)|(\s+$)/g, "");
  if ($content && ($content = $content.find("h1").first())) {
    let $keep = $content.next();
    $content.prevAll().addBack().remove();
    content.body = $keep.parent().html();
  }
  return content;
}

function parseSpaceContent(response) {
  let content = parsePageContent(response);
  let $content = $(content.document);
  let $categories = $content.find("#categories");
  $content = $content.find(".columns.ten");
  // flag the colored audit box plus the div below it to clear the float
  $content
    .find('.SMALL[style*="background-color"] + div[style*=clear]')
    .addClass("preview-audit")
    .prevAll('.SMALL[style*="background-color"]')
    .addClass("preview-audit");
  // mark all elements above the TOC or first heading as part of the header
  let head = $content.children("h2, .toc").first();
  if (head.length === 0) head = $content.children(".preview-audit").first();
  if (head.length > 0) {
    head = head.get(0).previousSibling;
    while (head) {
      let node = head;
      head = head.previousSibling;
      if (node.nodeType === 3 && /\S/.test(node.textContent)) {
        $(node).wrap('<span class="preview-header"></span>');
      } else {
        node = $(node).addClass("preview-header");
        if (node.is('.SMALL[style*="background-color"]')) {
          node.removeClass("preview-header").addClass("preview-audit");
        }
      }
    }
    $content.find(".preview-audit ~ .preview-header").removeClass("preview-header").addClass("preview-other");
    $content
      .find('.preview-other > a[href*="/wiki/Space:"]')
      .closest(".preview-other")
      .filter(function () {
        return /^\s*(Other):/.test($(this).text());
      })
      .removeClass("preview-other")
      .addClass("preview-links");
    // move category links directly below the audit section
    $content.find(".preview-audit").last().after($('<p class="preview-links"></p>').html($categories.html()));
    $content.find("p.preview-links + p.preview-links").first().prev().addClass("first-of-many");
  }
  // if the first h2 matches the page title (as many pages do), hide it if the title is shown
  $content
    .children("h2")
    .first()
    .filter(function () {
      let heading = ($(this).find(".mw-headline").text() ?? "").replace(/(^\s+)|(\s+$)/g, "");
      return heading && heading === content.title;
    })
    .addClass("same-title");
  // remove memories
  let $memories = $content.find("a[name='Memories']");
  $memories.prev().nextAll().addBack().remove();
  // remove <br> tags and the invite button from the bottom
  [].reverse.call($content.children()).each(function (index, element) {
    if ($(element).is("br, a.button")) {
      element.remove();
      return true;
    }
    return false;
  });
  content.body = $content.html();
  return content;
}

function parseCategoryContent(response) {
  let content = parsePageContent(response);
  if (content.title) {
    content.title = content.title.replace(/^\s*Category\s*:\s*/, "");
  }
  let $content = $("<div></div>").html(content.body);
  $content.find('p > a[href$="/wiki/Category:Categories"]:first-child').closest("p").addClass("preview-links");
  let $subs = $content
    .children(".SMALL")
    .filter(function () {
      return $(this).has("a.toggleSection");
    })
    .first();
  $subs.prev("br").remove();
  $subs.nextAll().addBack().remove();
  content.body = $content.html();
  return content;
}

function addCloseButton($popup) {
  $popup.prepend(
    $('<a href="#" class="x-preview-close" title="Click here to close this preview window">&#x2716;</a>')
      .on("auxclick", function (e) {
        e.stopPropagation();
        e.preventDefault();
      })
      .on("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        onCloseClicked($(this));
      })
  );
}

function hidePreview($element) {
  $element
    .attr("id", "")
    .css("z-index", "9998")
    .fadeOut("fast", function () {
      $(this).remove();
    });
}

function onCloseClicked($element) {
  hidePreview($element.closest(".x-page-preview"));
}

function hideActivePreview() {
  hidePreview($(".x-page-preview[id='activePagePreview']"));
}

let spacePagePreview = true,
  categoryPagePreview = false;

function attachHover(target) {
  if (spacePagePreview || categoryPagePreview) {
    const selectors = [
      spacePagePreview ? 'a[href*="/wiki/Space:"]' : null,
      categoryPagePreview ? 'a[href*="/wiki/Category:"]' : null,
    ]
      .join(", ")
      .replace(/^[\s,]+|[\s,]+$/g, "");
    $(target)
      .find(selectors)
      .filter(function () {
        // make sure each element is only wired up once
        if (!this.xHasSpaceHover) {
          // don't wire up space previews inside other space preview windows
          if ($(this).closest(".x-page-preview").length > 0) {
            return false;
          }
          this.xHasSpaceHover = true;
          return true;
        }
        return false;
      })
      .attr("title", "")
      .hoverDelay({
        delayIn: 500,
        delayOut: 0,
        handlerIn: onHoverIn,
      });
  }
}

async function initFeature() {
  const options = await getFeatureOptions("spacePreviews");
  spacePagePreview = options.spacePagePreview !== false;
  categoryPagePreview = !!options.categoryPagePreview;

  if (options.showTitle !== false) previewClasses += " show-title";
  if (options.showScissors !== false) previewClasses += " show-scissors";
  if (options.showHeader !== false) previewClasses += " show-header";
  if (options.showLinks !== false) previewClasses += " show-links";
  if (!!options.showAudit) previewClasses += " show-audit";
  if (!!options.showEdit) previewClasses += " show-edit";
  if (options.tocDisplay % 2 === 1) {
    previewClasses += " show-toc";
    import("../../core/toggleCheckbox.css");
  }
  if (options.tocDisplay / 1 >= 2) previewClasses += " expand-toc";

  $(() => {
    new MutationObserver(function (mutations) {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          attachHover(document);
          break;
        }
      }
    }).observe(document, { childList: true, subtree: true });
    attachHover(document);
  });

  // intercept clicks outside of the preview to close it
  $(document).on("click", function (event) {
    if ($(event.target).closest("#activePagePreview").length === 0) {
      hideActivePreview();
    }
  });
}

checkIfFeatureEnabled("spacePreviews").then((result) => {
  if (result) {
    import("./spacepreview.css");
    initFeature();
  }
});
