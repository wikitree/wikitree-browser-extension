import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("customStyle").then((result) => {
  if (result) {
    initCustomStyle();
    import("./custom_style.css");
  }
});

async function initCustomStyle() {
  let rules = "";
  const options = await getFeatureOptions("customStyle");
  const keys = Object.keys(options);
  keys.forEach(function (key) {
    let important = " !important";
    if (options[key]) {
      let bits = key.split("_");
      let selectors;

      if (bits[0] == "headings") {
        selectors = "h1,h2,h3,h4,h5,h6\n" + "#themeTable caption";
        if (bits[1] == "color") {
          selectors += ",button.copyWidget";
        }
      }
      if (bits[1] == "padding" || bits[1] == "border-radius") {
        options[key] += "px";
      }

      if (bits[1] == "box-shadow") {
        options[key] = options[key] += "px " + options[key] + "px " + options[key] + "px " + options[key] + "px gray";
        //          options[key] += "px";
      }
      if (bits[0] == "date-headings") {
        selectors = "span.HISTORY-DATE:not(body.profile .HISTORY-DATE),span.THANKYOU-DATE";
      }
      if (bits[0] == "color1") {
        selectors = "ul.profile-tabs li,\n" + ".ten.columns div.SMALL[style='background-color:#e1f0b4;']";
      }
      if (bits[0] == "color2") {
        selectors = "ul.profile-tabs li.current,\n" + "div.SMALL[style='background-color:#ffe183;']";
      }
      if (bits[0] == "color3") {
        selectors = "div.SMALL[style='background-color:#ffe183;']";
      }
      if (bits[0] == "color4") {
        selectors = "div.SMALL[style='background-color:#eeeeee;']";
      }

      if (bits[0] == "link") {
        selectors =
          "a:link:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a,a.qa-tag-link,a.new)";
      }
      if (bits[0] == "link2") {
        selectors = ".qa-q-item-tag-item a:link";
      }
      if (bits[0] == "scissorsText") {
        selectors = "button.copyWidget";
      }
      if (bits[0] == "visitedLink") {
        selectors =
          "a:visited:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a)";
      }
      if (bits[0].match(/^cm-/)) {
        // Code Mirror"
        selectors = "body span.cm-mw-";
        if (bits[0] == "cm-reference-tag-bg") {
          selectors += "exttag-bracket, body span.cm-mw-exttag-name, body span.cm-mw-exttag-attribute";
        }
        if (bits[0] == "cm-reference-text-bg") {
          selectors += "tag-ref";
        }
        if (bits[0] == "cm-heading-bg") {
          if (options[key] == "#eeeeee") {
            selectors += "section-header";
          } else {
            selectors += "section-header, body pre.cm-mw-section-2, body pre.cm-mw-section-3, body pre.cm-mw-section-4";
          }
        }
        if (bits[0] == "cm-asterisk-bg") {
          selectors += "list";
        }
        if (bits[0] == "cm-category-bracket-bg") {
          selectors += "link-bracket";
        }
        if (bits[0] == "cm-category-text-bg") {
          selectors += "link-pagename";
        }
        if (bits[0] == "cm-template-bracket-bg") {
          selectors += "template-bracket";
        }
        if (bits[0] == "cm-template-name-bg") {
          selectors += "template-name";
        }
        if (bits[0] == "cm-template-pipe-bg") {
          selectors += "template-delimiter";
        }
        if (bits[0] == "cm-template-parameter-bg") {
          selectors += "template-argument-name";
        }
        if (bits[0] == "cm-template-parameter-value-bg") {
          selectors += "template";
        }

        // Text colors
        if (bits[0] == "cm-regular-text") {
          selectors = "span[role='presentation']";
        }
        if (bits[0] == "cm-reference-text") {
          selectors +=
            "tag-ref, body span.cm-mw-exttag-bracket, body span.cm-mw-exttag-name, body span.cm-mw-exttag-attribute";
        }
        if (bits[0] == "cm-heading-text") {
          if (options[key] == "#000000") {
            selectors += "section-header";
          } else {
            selectors += "section-header, body pre.cm-mw-section-2, body pre.cm-mw-section-3, body pre.cm-mw-section-4";
          }
        }
        if (bits[0] == "cm-reference-text-font") {
          selectors += "tag-ref";
        }

        important = "";
      }
      rules += selectors + "{" + bits[1] + ":" + options[key] + important + ";}\n";
    }
  });
  $("<style>" + rules + "</style>").appendTo($("head"));
  addStartEndTagClasses();
  $("#wpTextbox1").on("change", addStartEndTagClasses);

  watchCodeMirror();
}

function watchCodeMirror() {
  const codeMirrorLines = document.querySelector(".CodeMirror-lines");

  if (codeMirrorLines) {
    // Create a new MutationObserver instance
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "childList") {
          addStartEndTagClasses();
        }
      });
    });

    // Specify what the observer should watch for: changes to the children of codeMirrorLines
    const config = { childList: true, subtree: true };
    observer.observe(codeMirrorLines, config);
  }
}

function addStartEndTagClasses() {
  $("span.cm-mw-exttag-bracket")
    .filter(function () {
      return $(this).text() === "<";
    })
    .addClass("start-tag");
  $("span.cm-mw-exttag-bracket")
    .filter(function () {
      return $(this).text() === ">" || $(this).text() === "/>";
    })
    .addClass("end-tag");
  $("pre.cm-mw-section-2:has(span:contains('Sources'))").nextAll().addClass("source");
}
