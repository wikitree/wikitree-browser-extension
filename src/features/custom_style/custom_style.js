import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

class CustomStyle {
  constructor(options) {
    this.options = options;
  }

  isLight(color) {
    const brightness = Math.round(
      (parseInt(color[0]) * 299 + parseInt(color[1]) * 587 + parseInt(color[2]) * 114) / 1000
    );
    return brightness > 155;
  }

  getTextColor(backgroundColor, chosenTextColor) {
    const contrastRatio = this.contrastRatio(backgroundColor, chosenTextColor);
    console.log(`Contrast ratio: ${contrastRatio}`);

    if (contrastRatio >= 4.5) {
      console.log(`Sufficient contrast ratio. Returning chosen text color: ${chosenTextColor}`);
      return chosenTextColor;
    } else {
      const isLightBackground = this.isLight(backgroundColor);
      console.log(`Insufficient contrast ratio. Background is light: ${isLightBackground}`);

      const textColor = isLightBackground ? "#000000" : "#ffffff";
      console.log(`Setting text color to: ${textColor}`);

      return textColor;
    }
  }

  hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
  }

  rgbToHex(rgb) {
    return "#" + ((1 << 24) | (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]).toString(16).slice(1).toUpperCase();
  }

  contrastRatio(rgb1, rgb2) {
    const luminance = (rgb) => {
      let a = rgb.map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };
    let l1 = luminance(rgb1) + 0.05;
    let l2 = luminance(rgb2) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
  }

  getTextColorForBackground(theValue, backgroundColorKey) {
    const contrastRatioThreshold = 4.5;
    const selectedBackgroundColor = this.options[backgroundColorKey];
    let textColor = null;
    if (selectedBackgroundColor) {
      let backgroundColor = this.hexToRgb(selectedBackgroundColor);
      let chosenTextColor = this.hexToRgb(theValue);
      const contrastRatio = this.contrastRatio(backgroundColor, chosenTextColor);
      if (contrastRatio >= contrastRatioThreshold) {
        textColor = theValue;
      } else {
        textColor = this.isLight(backgroundColor) ? "#000000" : "#ffffff";
      }
    }
    return textColor || theValue;
  }

  darkenColor(rgb, percent) {
    return rgb.map((value) => Math.round(value * (1 - percent / 100)));
  }

  handleRoundedCorners() {
    return `
  div.ten.columns table,
  ul.views.viewsm a.viewsi,
  ul.views.viewsm li.viewsi a,
  .HISTORY-DATE,
  .THANKYOU-DATE,
  .qa-voting,
  .qa-a-count,
  input.qa-form-tall-text,
  input[type="text"],
  input[type="submit"],
  .qa-q-list-item-featured,
  .qa-tag-link,
  .qa-page-link,
  .qa-page-selected,
  .qa-page-prev,
  .qa-page-next,
  div.status,
  .pureCssMenui,
  .profile div.sixteen.columns p a[href*="Special:Connection"],
  .profile div.sixteen.columns .box.rounded a[href*="Special:Connection"],
  h2, h3, h4, h5, h6,
  .qa-form-tall-table,
  ul.qa-nav-cat-list a {
    border-radius: 1em;
  }
  ul.profile-tabs li,
  ul.qa-nav-main-list li a,
  ul.qa-nav-sub-list li a,
  ul.qa-nav-footer-list li a {
    border-radius: 1em 1em 0 0;
  }
  ul.qa-nav-sub-list li a,
  ul.qa-nav-footer-list li a {
    border-radius: 0 0 1em 1em;
  }
  img[src*="images/badge"] {
    border-radius: 50%;
  }`;
  }

  editorFontSize(size) {
    return `
    div.codeMirror{
      font-size: ${size} !important;
    }`;
  }

  getSelectors(bits) {
    let idToSelectorMapping = {
      header: ".sticky-header body:not(.darkMode) .wrapper #header::before,#header",
      headings:
        "h1,h2:not(#view-container h2),h3:not(#view-container h3),h4:not(#view-container h4),h5:not(#view-container h5),h6:not(#view-container h6),#themeTable caption",
      headingLinks:
        "h1 a:link:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a), " +
        "h1 a:visited:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a), " +
        "h2 a:link:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a), " +
        "h2 a:visited:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a), " +
        "h3 a:link:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a), " +
        "h3 a:visited:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a), " +
        "h4 a:link:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a), " +
        "h4 a:visited:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a), " +
        "h5 a:link:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a), " +
        "h5 a:visited:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a), " +
        "h6 a:link:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a), " +
        "h6 a:visited:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a)",
      dateHeadings: "span.HISTORY-DATE:not(body.profile .HISTORY-DATE),span.THANKYOU-DATE",
      color1: "ul.profile-tabs li,\n.ten.columns div.SMALL[style='background-color:#e1f0b4;']",
      color2: "ul.profile-tabs li.current,\ndiv.SMALL[style='background-color:#ffe183;']",
      color3: "div.SMALL[style='background-color:#ffe183;']",
      color4: "div.SMALL[style='background-color:#eee;']",
      link: "a:link:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a,a.qa-tag-link,a.new,.wt.names th a,#editToolbarExt a,#view-container a)",
      tag: ".qa-q-item-tag-item a:link",
      tagHover: ".qa-q-item-tag-item a:link:hover,.qa-q-item-tag-item a:visited:hover",
      scissorsText: "button.copyWidget",
      visitedLink:
        "a:visited:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a,.wt.names th a,#editToolbarExt a,#view-container a)",
      g2gtab: ".qa-voting,a.qa-nav-main-link:link,a.qa-nav-main-link:visited",
      g2gtabHover: "a.qa-nav-main-link:hover,a.qa-nav-main-link:link:hover,a.qa-nav-main-link:visited:hover",
      g2gtabSelected:
        "a.qa-nav-main-selected," +
        "a.qa-nav-main-selected.qa-nav-main-link:link," +
        "a.qa-nav-main-selected.qa-nav-main-link:visited",
      count: ".qa-a-count",
      editor: "div.CodeMirror,#wpTextbox1",
    };

    if (bits[1] === "color" && bits[0] === "headings") {
      idToSelectorMapping["headings"] += ",button.copyWidget";
      idToSelectorMapping["headingLinks"] = "h1 a,h2 a,h3 a,h4 a,h5 a,h6 a";
    }

    let id = bits[0].replace(/-/g, "_");

    return idToSelectorMapping[id] || null;
  }

  myCustomStyleFunction() {
    let rules = "";
    const rulesMap = new Map();

    let important = " !important";
    for (let key in this.options) {
      important = " !important";
      if (key == "g2gtab_color") {
        // important = "";
      }

      const bits = key.split("_");
      let selectors = this.getSelectors(bits);
      let theValue = this.options[key];
      let textColor = null;
      if (bits[1] === "color") {
        let backgroundColorKey =
          key === "heading_links_color" ? "headings_background-color" : bits[0] + "_background-color";
        theValue = this.getTextColorForBackground(theValue, backgroundColorKey);
      } else if (bits[1] === "padding" || bits[1] === "border-radius") {
        theValue += "px";
      } else if (bits[1] === "box-shadow") {
        theValue = `${theValue}px ${theValue}px ${theValue}px ${theValue}px gray`;
      } else if (key == "header_background-color") {
        if (theValue != "#f7f6f0") {
          bits[1] = "background";
          theValue += " url()";
        }
      } else if (key === "headingLinks_color") {
        theValue = this.options["headings_color"];
      } else if (key === "editor_font-size") {
        theValue += "%";
      }

      if (!rulesMap.has(selectors)) {
        rulesMap.set(selectors, {
          selectors: selectors,
          rules: {},
        });
      }

      const selectorObj = rulesMap.get(selectors);
      selectorObj.rules[bits[1]] = `${theValue}${important}`;
      if (textColor) {
        selectorObj.rules["color"] = `${textColor}${important}`;
      }
    }
    // Extra section for handling headingLinks
    const headingLinksSelectors = this.getSelectors(["headingLinks"]);
    const headingBgColor = this.options["headings_background-color"];

    if (headingLinksSelectors && headingBgColor) {
      ["link_color", "scissorsText_color", "visitedLink_color"].forEach((linkColorOption) => {
        let linkColor = this.options[linkColorOption];
        let contrastRatio = this.contrastRatio(this.hexToRgb(linkColor), this.hexToRgb(headingBgColor));
        if (contrastRatio < 4.5) {
          if (!rulesMap.has(headingLinksSelectors)) {
            rulesMap.set(headingLinksSelectors, {
              selectors: headingLinksSelectors,
              rules: {},
            });
          }
          const selectorObj = rulesMap.get(headingLinksSelectors);
          selectorObj.rules["color"] = this.isLight(this.hexToRgb(headingBgColor))
            ? "#000000 !important"
            : "#ffffff !important";
        }
      });
    }

    rules = "";

    for (const [selectors, selectorObj] of rulesMap) {
      const { selectors: selectorString, rules: selectorRules } = selectorObj;
      rules += `${selectorString} {\n`;
      for (const [propertyName, propertyValue] of Object.entries(selectorRules)) {
        rules += `  ${propertyName}: ${propertyValue};\n`;
      }
      rules += "}\n";
    }

    if (this.options["roundedCorners"]) {
      rules += this.handleRoundedCorners();
    }

    return rules;
  }

  applyStyles() {
    let rules = this.myCustomStyleFunction();
    $("<style>" + rules + "</style>").appendTo($("head"));
  }

  addFontButtons() {
    // Add font-size buttons to toolbar
    const fontIncreaseImage = chrome.runtime.getURL("images/fontIncrease.png");
    const fontDecreaseImage = chrome.runtime.getURL("images/fontDecrease.png");
    const fontIncreaseButton = $(`<img id='fontIncreaseButton' class='fontSizeButton' src='${fontIncreaseImage}'>`);
    const fontDecreaseButton = $(`<img id='fontDecreaseButton' class='fontSizeButton' src='${fontDecreaseImage}'>`);
    $("body").data("instance", this);
    $("body").on("click", ".fontSizeButton", function () {
      // Get the selectors for changing the font size
      const instance = $("body").data("instance");
      const selectors = instance.getSelectors(["editor"], ["font-size"]);

      getFeatureOptions("customStyle").then((options) => {
        // Get the current font size
        const currentFontSize = options["editor_font-size"];

        // Calculate the new font size
        const newFontSize = parseInt(currentFontSize) + ($(this).prop("id") === "fontIncreaseButton" ? 10 : -10);

        // Debug: Log the new font size
        console.log("New font size calculated: " + newFontSize);

        // Update the customStyle options
        options["editor_font-size"] = newFontSize;
        const storageName = "customStyle_options";
        chrome.storage.sync.set({
          [storageName]: options,
        });

        // Change the font size
        $(selectors).attr("style", function (i, style) {
          return style + "; font-size: " + newFontSize + "% !important;";
        });
      });
    });

    $("#toolbar").append(fontIncreaseButton, fontDecreaseButton);
  }
}

shouldInitializeFeature("customStyle").then((result) => {
  if (result) {
    getFeatureOptions("customStyle").then((options) => {
      const customStyle = new CustomStyle(options);
      customStyle.applyStyles();
      import("./custom_style.css");
      customStyle.addFontButtons();
    });
  }
});
