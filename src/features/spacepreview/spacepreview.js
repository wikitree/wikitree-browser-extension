/*
Created By: Steve Harris (Harris-5439)
Contributors: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import "../../thirdparty/jquery.hoverDelay";
import { WBE } from "../../core/common";
import { getWikiTreePage } from "../../core/API/wwwWikiTree";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import "../../core/navigatorDetect"; // needed for CSS classes

let previewClasses = "x-page-preview";

function onHoverIn($element) {
  if ($element.get(0).xCancelHover) {
    // if they already clicked on the link, don't pop up the preview
    return false;
  }
  hideActivePreview();
  const match = $element[0].href.match(/\/wiki\/((\w+):.*?)(#.*|$)/i);
  const pageType = match[2].toLowerCase();
  let $popup = $(
    '<div id="activePagePreview" class="' +
      previewClasses +
      " preview-" +
      pageType +
      ' no-link-preview" style="display: none;"></div>'
  );

  // add the hidden placeholder to the document immediately to prevent double preview windows if loading causes a delay
  if ($element.closest('*[class$="suggestion-maplink"]').length > 0) {
    // a bug in Safari causes the fixed window to be clipped, so we'll add it to the body instead
    $(document.body).append($popup);
  } else if ($element.closest("dialog").length > 0) {
    // if the preview is inside a dialog element, add it to the end of the dialog body instead of after the link
    $element.closest("dialog").append($popup);
  } else {
    $element.after($popup);
  }

  // fetch the content to be displayed in the popup
  getPreviewContent(
    pageType, // page type (Space, Category, Help, etc.)
    decodeURIComponent(match[1]), // prefixed ID (Space:WikiTree_Browser_Extension, Category:Cemeteries, Help:Apps)
    $element[0].href // page URL
  )
    .then((content) => {
      $popup.append(content.body);
      let hashTarget = null,
        hash = $element[0].hash;
      if (hash) {
        hash = hash.substr(1);
      }
      $popup.find('a[name], *[id], a[href^="#"]').each(function () {
        if (this.name) {
          if (this.name === hash) {
            hashTarget = this;
          }
          this.name = "_xPagePreview_" + this.name;
        }
        if (this.id) {
          if (this.id === hash) {
            hashTarget = this;
          }
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
      if (pageType === "space") {
        $popup.find(".preview-links:empty").remove(); // sometimes the categories box can be present but empty
        let $links = $popup.find(".preview-links");
        if ($links.length > 0) {
          // put all the links together in a green box container
          $popup.prepend(
            ($links = $('<div class="box green rounded preview-links"></div>').append(
              $links.removeClass("preview-links")
            ))
          );
        }
      } else {
        $popup
          .find("p.SMALL, p.small")
          .filter(function () {
            let txt = $(this).text();
            return txt.indexOf("last modified") > -1 && txt.indexOf("been accessed") > -1;
          })
          .prevUntil(":not(br)")
          .addBack()
          .addClass("preview-audit"); // this text is displayed at the bottom on other content pages
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
      // check to make sure hover wasn't cancelled while we were loading before displaying it
      if (!$popup.get(0).xCancelShow) {
        $popup.fadeIn("fast");
        if (hashTarget) {
          $popup.get(0).scrollTop = hashTarget.offsetTop;
        }
      }
    })
    .catch((reason) => {
      console.warn(reason);
      hideActivePreview();
    });
}

function getPreviewContent(type, pageId, url) {
  if (!window.xPagePreviewCache) {
    window.xPagePreviewCache = [];
  }
  return new Promise((resolve, reject) => {
    const parse =
      type === "space"
        ? parseSpaceContent // free-space profiles
        : type === "category"
        ? parseCategoryContent // category profiles
        : parsePageContent; // any other generic content page
    let cacheItem = window.xPagePreviewCache[url.replace(/#.*/, "").toLowerCase()];
    if (cacheItem && cacheItem.expiresOn > Date.now()) {
      resolve(parse(cacheItem.html));
    } else {
      doFetch(type, pageId, url)
        .then((response) => {
          // cache for next time
          window.xPagePreviewCache[url.replace(/#.*/, "").toLowerCase()] = {
            html: response,
            expiresOn: Date.now() + 300000, // expire after 5 minutes
          };
          // do stuff with the content
          resolve(parse(response));
        })
        .catch((reason) => {
          reject(reason);
        });
    }
  });
}

function doFetch(type, pageId, url) {
  // right now, we have to get the full HTML from the page because the user may not be authenticated on the API
  const urlObj = new URL(url);
  return getWikiTreePage("PagePreview", urlObj.pathname, urlObj.search);
}

function parseDocument(html) {
  // prevent jQuery from loading assets that we don't need
  return $($.parseHTML(html, null, false));
}

function parsePageContent(response) {
  let content = {
    documentHTML: response.replace(/(<\/?)(?=(script|style|link))/g, "$1no"), // sanitize script/style/link tags
    body: "<div></div>",
  };
  let $content = parseDocument(content.documentHTML);
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
  let $content = parseDocument(content.documentHTML);
  let $categories = $content.find("#categories");
  $content = $content.find(".columns.ten");
  // flag the colored audit box plus the div below it to clear the float
  $content
    .find(
      '.SMALL[style*="background-color"] + div[style*="clear"], ' +
        '.SMALL[style*="background-color"]:contains("page has been accessed")'
    )
    .last()
    .prevAll()
    .addBack()
    .addClass("preview-audit");
  // mark all elements above the TOC or first heading as part of the header
  let head = $content.children("h2, .toc").first();
  if (head.length === 0) head = $content.children(".preview-audit").last();
  if (head.length === 0) {
    head = $content
      .children('.SMALL[style*="background-color"]')
      .first()
      .nextAll('.SMALL[style*="background-color"]')
      .addBack()
      .addClass("preview-audit")
      .last();
  }
  if (head.length > 0) {
    head = head.get(0).previousSibling;
    while (head) {
      let node = head;
      head = head.previousSibling;
      if (node.nodeType === 3 && /\S/.test(node.textContent)) {
        $(node).wrap('<span class="preview-header"></span>');
      } else if (node.nodeType === 1) {
        let $node = $(node);
        if ($node.is('.SMALL[style*="background-color"]')) {
          $node.addClass("preview-audit");
        } else {
          $node.removeClass("preview-audit").addClass("preview-header");
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
    let $header = $content.find(".preview-header");
    if ($header.length > 0) {
      // put all the header items together in a gray box container
      $content.prepend(
        ($header = $('<div class="box rounded preview-header"></div>').append($header.removeClass("preview-header")))
      );
      $header.find(":not(br)").first().prevAll().remove();
      $header.children(":not(:last-child)").after("\n");
    }
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
  if ($element.length) {
    $element.get(0).xCancelShow = true;
    $element
      .attr("id", "")
      .css("z-index", "9998")
      .fadeOut("fast", function () {
        $(this).remove();
      });
  }
}

function onCloseClicked($element) {
  hidePreview($element.closest(".x-page-preview"));
}

function hideActivePreview() {
  hidePreview($(".x-page-preview[id='activePagePreview']"));
}

let spacePagePreview = true,
  categoryPagePreview = false,
  otherPagePreview = false;

function attachHover(target) {
  if (spacePagePreview || categoryPagePreview || otherPagePreview) {
    const selectors = [
      spacePagePreview ? 'a[href*="/wiki/Space:"]' : null,
      spacePagePreview && /\/wiki\/Space:/i.test(window.location.href) ? 'a[href^="#"]' : null,
      categoryPagePreview ? 'a[href*="/wiki/Category:"]' : null,
      categoryPagePreview && /\/wiki\/Category:/i.test(window.location.href) ? 'a[href^="#"]' : null,
      otherPagePreview ? 'a[href*="/wiki/Help:"]' : null,
      otherPagePreview ? 'a[href*="/wiki/Project:"]' : null,
      otherPagePreview ? 'a[href*="/wiki/Special:"]' : null,
      otherPagePreview ? 'a[href*="/wiki/Template:"]' : null,
      otherPagePreview ? 'a[href*="/wiki/Automated:"]' : null,
      otherPagePreview && /\/wiki\/(Help|Project|Special|Template|Automated):/i.test(window.location.href)
        ? 'a[href^="#"]'
        : null,
    ]
      .join(", ")
      .replace(/,[\s+,]+/g, ", ")
      .replace(/^[\s,]+|[\s,]+$/g, "");
    $(target)
      .find(selectors)
      .filter(function () {
        // make sure each element is only wired up once
        if (!this.xHasSpaceHover) {
          // do not apply to certain links
          if (
            $(this).closest(
              ".no-link-preview, .reference, #header, #footer, .profile-tabs, #views-wrap, .pureCssMenu, #customMenuOptions, .button"
            ).length > 0
          ) {
            return false;
          }
          // special handling for links to the same page
          if (this.href.replace(/#.*/, "").toLowerCase() === window.location.href.replace(/#.*/, "").toLowerCase()) {
            if (this.href.indexOf("#") === -1 || /#(top)?$/.test(this.href)) {
              // if there is no hash (or it is blank or links back to #top) then don't enable preview
              return false;
            }
          }
          this.xHasSpaceHover = true;
          return true;
        }
        return false;
      })
      .attr("title", "")
      .on("mousedown", function () {
        hideActivePreview();
        let self = this;
        self.xCancelHover = true;
        window.setTimeout(function () {
          self.xCancelHover = false;
        }, 500);
      })
      .hoverDelay({
        delayIn: 600,
        delayOut: 0,
        handlerIn: onHoverIn,
      });
  }
}

async function initFeature() {
  const options = await getFeatureOptions("spacePreviews");
  spacePagePreview = options.spacePagePreview !== false;
  categoryPagePreview = !!options.categoryPagePreview;
  otherPagePreview = !!options.otherPagePreview;

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

shouldInitializeFeature("spacePreviews").then((result) => {
  if (result) {
    import("./spacepreview.css");
    initFeature();
  }
});
