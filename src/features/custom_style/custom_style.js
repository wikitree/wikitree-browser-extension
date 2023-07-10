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
        selectors = "h1,h2,h3,\n" + "#themeTable caption";
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
        selectors = "body .cm-mw-";
        if (bits[0] == "cm-bracket") {
          selectors += "exttag-bracket";
        }
        if (bits[0] == "cm-reference") {
          selectors += "tag-ref";
        }
        if (bits[0] == "cm-tag") {
          selectors += "exttag-name";
        }
        if (bits[0] == "cm-heading") {
          selectors += "section-header";
        }
        if (bits[0] == "cm-asterisk") {
          selectors += "list";
        }
        if (bits[0] == "cm-attribute") {
          selectors += "exttag-attribute";
        }
        if (bits[0] == "cm-category-bracket") {
          selectors += "link-bracket";
        }
        if (bits[0] == "cm-category-text") {
          selectors += "link-pagename";
        }
        /*
 {
          id: "cm-template-bracket_background-color",
          type: "color",
          label: "Template bracket background color",
          defaultValue: "#eef5e5",
        },
        {
          id: "cm-template-name_background-color",
          type: "color",
          label: "Template name background color",
          defaultValue: "#eeeeee",
        },
        {
          id: "cm-template-pipe_background-color",
          type: "color",
          label: "Template pipe background color",
          defaultValue: "#eeeeee",
        },
        {
          id: "cm-template-parameter_background-color",
          type: "color",
          label: "Template parameter background color",
          defaultValue: "#eeeeee",
        },
        {
          id: "cm-template-parameter-value_background-color",
          type: "color",
          label: "Template parameter value background color",
          defaultValue: "#fcf5d5",
        },
        */

        if (bits[0] == "cm-template-bracket") {
          selectors += "template-bracket";
        }
        if (bits[0] == "cm-template-name") {
          selectors += "template-name";
        }
        if (bits[0] == "cm-template-pipe") {
          selectors += "template-delimiter";
        }
        if (bits[0] == "cm-template-parameter") {
          selectors += "template-argument-name";
        }
        if (bits[0] == "cm-template-parameter-value") {
          selectors += "template";
        }

        important = "";
      }
      rules += selectors + "{" + bits[1] + ":" + options[key] + important + ";}\n";
    }
  });
  $("<style>" + rules + "</style>").appendTo($("head"));
  addStartEndTagClasses();
  $("#wpTextbox1").on("change", addStartEndTagClasses);
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
}
