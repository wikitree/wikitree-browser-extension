import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("enhancedEditorStyle").then((result) => {
  if (result) {
    initEnhancedEditorStyle();
    import("./enhanced_editor_style.css");
  }
});

async function initEnhancedEditorStyle() {
  let rules = "";
  const options = await getFeatureOptions("enhancedEditorStyle");
  const keys = Object.keys(options);
  keys.forEach(function (key) {
    let important = " !important";
    if (options[key]) {
      let bits = key.split("_");
      let selectors;
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
            selectors +=
              "section-header, body pre.cm-mw-section-2, body pre.cm-mw-section-3, " +
              "body pre.cm-mw-section-4, body pre.cm-mw-section-5, " +
              "body pre.cm-mw-section-6, " +
              "body.darkMode div.CodeMirror pre.cm-mw-section-2 span, " +
              "body.darkMode div.CodeMirror pre.cm-mw-section-3 span, " +
              "body.darkMode div.CodeMirror pre.cm-mw-section-4 span, " +
              "body.darkMode div.CodeMirror pre.cm-mw-section-5 span, " +
              "body.darkMode div.CodeMirror pre.cm-mw-section-6 span";
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
          selectors =
            "span[role='presentation'], body.darkMode div.CodeMirror span[role='presentation']," +
            "body.darkMode div.CodeMirror span.cm-mw-link-ground, body.darkMode div.CodeMirror cm-mw-link-pagename, " +
            "body.darkMode div.CodeMirror span.cm-mw-link-bracket, " +
            "body.darkMode div.CodeMirror span.cm-mw-link-text, " +
            "body.darkMode div.CodeMirror span.cm-mw-link-pipe, " +
            "body.darkMode div.CodeMirror span.cm-mw-link-namespace, " +
            "body.darkMode div.CodeMirror span.cm-mw-template-ground, " +
            "body.darkMode div.CodeMirror span.cm-mw-template-bracket, " +
            "body.darkMode div.CodeMirror span.cm-mw-template-name, " +
            "body.darkMode div.CodeMirror span.cm-mw-template-pipe, " +
            "body.darkMode div.CodeMirror span.cm-mw-template-parameter, " +
            "body.darkMode div.CodeMirror span.cm-mw-template-parameter-value, " +
            "body.darkMode div.CodeMirror span.cm-mw-exttag-bracket, " +
            "body.darkMode div.CodeMirror span.cm-mw-exttag-name, " +
            "body.darkMode div.CodeMirror span.cm-mw-exttag-attribute, " +
            "body.darkMode div.CodeMirror span.cm-mw-exttag-value, " +
            "body.darkMode div.CodeMirror span.cm-mw-exttag-pipe, " +
            "body.darkMode div.CodeMirror span.cm-mw-exttag-namespace, " +
            "body.darkMode div.CodeMirror span.cm-mw-exttag-namespace-pipe, " +
            "body.darkMode div.CodeMirror span.cm-mw-exttag-namespace-name, " +
            "body.darkMode div.CodeMirror span.cm-mw-exttag-namespace-value";
        }
        if (bits[0] == "cm-reference-text") {
          selectors +=
            "tag-ref, body span.cm-mw-exttag-bracket, body span.cm-mw-exttag-name, body span.cm-mw-exttag-attribute";
        }
        if (bits[0] == "cm-heading-text") {
          if (options[key] == "#000000") {
            selectors += "section-header";
          } else {
            selectors +=
              "section-header, body pre.cm-mw-section-2, body pre.cm-mw-section-3, body pre.cm-mw-section-4, " +
              "body.darkMode div.CodeMirror pre.cm-mw-section-2 span, " +
              "body.darkMode div.CodeMirror pre.cm-mw-section-3 span, " +
              "body.darkMode div.CodeMirror pre.cm-mw-section-4 span, " +
              "body.darkMode div.CodeMirror pre.cm-mw-section-5 span, " +
              "body.darkMode div.CodeMirror pre.cm-mw-section-6 span";
          }
        }
        if (bits[0] == "cm-reference-text-font") {
          selectors += "tag-ref";
        }
        if (bits[0] == "cm-value-font") {
          selectors += "link-text, body span.cm-mw-template";
        }

        //important = "";
      }
      selectors = selectors.replace(/body/g, "html body");
      const darkModeSelectors = selectors.replace(/body(?!\.)/g, "body.darkMode div.CodeMirror");
      rules += selectors + "," + darkModeSelectors + "{" + bits[1] + ":" + options[key] + important + ";}\n";
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
