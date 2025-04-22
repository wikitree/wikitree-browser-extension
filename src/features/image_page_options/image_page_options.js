/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { showCopyMessage } from "../access_keys/access_keys.js";

let options;
const templateSection = $("h3:contains('Use inside text')").closest("section");
const examples = templateSection.find("div.EXAMPLE");
const imageTitle = $("#heading h1").text().trim();

function getCleanedExampleText(example) {
  return $(example)
    .html()
    .replace(/<br\s*\/?>/gi, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function setExampleHTMLFromText(example, text) {
  const html = text.replace(/\n/g, "<br>");
  $(example).html(html);
}

function addCopyButtons() {
  examples.each((_, example) => {
    const exampleText = getCleanedExampleText(example);

    const copyButton = $("<button>Copy</button>")
      .addClass("image-template-copy-button")
      .data("clipboard-text", exampleText)
      .on("click", function () {
        const copiedText = $(this).data("clipboard-text");
        navigator.clipboard.writeText(copiedText).then(() => {
          showCopyMessage(`\n${copiedText}`);
        });
      });

    $(example).append(copyButton);
  });
}

function addLabel() {
  examples.each((_, example) => {
    let text = getCleanedExampleText(example);
    text = text.replace(/\n\}\}/, `\n|label=${imageTitle}\n}}`);
    text = text.replace(/caption:/, "caption and with hover text (label parameter):");
    setExampleHTMLFromText(example, text);
  });
}

function fixCaption() {
  examples.each((_, example) => {
    let text = getCleanedExampleText(example);
    text = text.replace(/caption=[^|}]+/, `caption=${imageTitle}\n`);
    text = text.replace(/a different caption/, "a caption");
    setExampleHTMLFromText(example, text);
  });
}

async function init() {
  options = await getFeatureOptions("imagePageOptions");
  if (options.addLabel) addLabel();
  if (options.fixCaption) fixCaption();
  if (options.addCopyButtons) addCopyButtons();
}

shouldInitializeFeature("imagePageOptions").then((result) => {
  if (result) {
    import("./image_page_options.css");
    init();
  }
});
