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

  getSelectors(bits) {
    let idToSelectorMapping = {
      header: ".sticky-header body:not(.darkMode) .wrapper #header::before,#header",
      headings: "h1,h2,h3,h4,h5,h6,#themeTable caption",
      date_headings: "span.HISTORY-DATE:not(body.profile .HISTORY-DATE),span.THANKYOU-DATE",
      color1: "ul.profile-tabs li,\n.ten.columns div.SMALL[style='background-color:#e1f0b4;']",
      color2: "ul.profile-tabs li.current,\ndiv.SMALL[style='background-color:#ffe183;']",
      color3: "div.SMALL[style='background-color:#ffe183;']",
      color4: "div.SMALL[style='background-color:#eee;']",
      link: "a:link:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a,a.qa-tag-link,a.new)",
      link2: ".qa-q-item-tag-item a:link",
      tag: ".qa-q-item-tag-item a:link",
      scissorsText: "button.copyWidget",
      visitedLink:
        "a:visited:not(.qa-nav-main-link,a.button,.qa-nav-sub-link,.qa-nav-footer-link,ul.pureCssMenu a,#footer a)",
      g2gtab: ".qa-voting,a.qa-nav-main-link:link,a.qa-nav-main-link:visited",
      g2gtabHover: "a.qa-nav-main-link:hover,a.qa-nav-main-link:link:hover,a.qa-nav-main-link:visited:hover",
      g2gtabSelected:
        "a.qa-nav-main-selected," +
        "a.qa-nav-main-selected.qa-nav-main-link:link," +
        "a.qa-nav-main-selected.qa-nav-main-link:visited",
      count: ".qa-a-count",
    };

    if (bits[1] === "color" && bits[0] === "headings") {
      idToSelectorMapping["headings"] += ",button.copyWidget";
    }

    let id = bits[0].replace(/-/g, "_");

    return idToSelectorMapping[id] || null;
  }

  myCustomStyleFunction() {
    let rules = "";
    const rulesMap = new Map();
    const contrastRatioThreshold = 4.5;

    for (let key in this.options) {
      let important = " !important";
      if (key == "g2gtab_color") {
        // important = "";
      }
      const bits = key.split("_");
      let selectors = this.getSelectors(bits);
      let theValue = this.options[key];
      let textColor = null;
      if (bits[1] === "color") {
        const selectedBackgroundColor = this.options[bits[0] + "_background-color"];
        if (selectedBackgroundColor) {
          let backgroundColor = this.hexToRgb(selectedBackgroundColor);
          let chosenTextColor = this.hexToRgb(theValue);
          const contrastRatio = this.contrastRatio(backgroundColor, chosenTextColor);
          if (contrastRatio >= contrastRatioThreshold) {
            textColor = theValue;
          } else {
            textColor = this.isLight(backgroundColor) ? "#000000" : "#ffffff";
          }
          theValue = textColor;
        }
      } else if (bits[1] === "padding" || bits[1] === "border-radius") {
        theValue += "px";
      } else if (bits[1] === "box-shadow") {
        theValue = `${theValue}px ${theValue}px ${theValue}px ${theValue}px gray`;
      } else if (key == "header_background-color") {
        if (theValue != "#f7f6f0") {
          bits[1] = "background";
          theValue += " url()";
        }
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
    //console.log(rules);
    return rules;
  }

  applyStyles() {
    let rules = this.myCustomStyleFunction();
    $("<style>" + rules + "</style>").appendTo($("head"));
  }
}

shouldInitializeFeature("customStyle").then((result) => {
  if (result) {
    getFeatureOptions("customStyle").then((options) => {
      const customStyle = new CustomStyle(options);
      customStyle.applyStyles();
      import("./custom_style.css");
    });
  }
});
