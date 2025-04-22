/*
 Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { showCopyMessage } from "../access_keys/access_keys.js";

let options;
let templateSection;
let examples;
let exampleParagraphs;
let imageTitle;

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
  // 1. Update the EXAMPLE blocks
  examples.each((_, example) => {
    let text = getCleanedExampleText(example);
    text = text.replace(/\n\}\}/, `\n|label=${imageTitle}\n}}`);
    setExampleHTMLFromText(example, text);
  });

  // 2. Update the paragraphs
  exampleParagraphs.each((_, paragraph) => {
    const $p = $(paragraph);
    let html = $p.html();
    html = html.replace(/caption:/g, "caption and with hover text (label parameter):");
    $p.html(html);
  });
}

function fixCaption() {
  // 1. Update the EXAMPLE blocks
  examples.each((_, example) => {
    let text = getCleanedExampleText(example);
    text = text.replace(/caption=[^|}]+/, `caption=${imageTitle}\n`);
    setExampleHTMLFromText(example, text);
  });

  // 2. Update the paragraphs
  exampleParagraphs.each((_, paragraph) => {
    const $p = $(paragraph);
    let html = $p.html();
    html = html.replace(/a different caption/g, "a caption");
    $p.html(html);
  });
}

async function init() {
  // grab everything *after* the DOM is loaded
  templateSection = $("h3:contains('Use inside text')").closest("section");
  examples = templateSection.find("div.EXAMPLE");
  exampleParagraphs = templateSection.find("p");
  imageTitle = $("#heading h1").text().trim();

  options = await getFeatureOptions("imagePageOptions");
  if (options.addLabel) addLabel();
  if (options.fixCaption) fixCaption();
  if (options.addCopyButtons) addCopyButtons();
}

shouldInitializeFeature("imagePageOptions").then((result) => {
  if (!result) return;
  import("./image_page_options.css");
  init();
});
