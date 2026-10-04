/*
Created By: Azure Robinson (Robinson-27225)

The WikiTree colours and font used on the share card, and the small pictures a surname's genealogy hub can show on it:
the collaboration score, the rank and the DNA tests. They are drawn here, 260 by 300 pixels each, in the style of the
hub's own badges, because a copy of the page's badges drawn on its own would lose their fonts and styling.
*/

import { ordinal } from "./share_page_core";

// WikiTree brand, taken from the live site: the header and footer colours and Roboto from its stylesheet,
// the gold from the logo's emblem.
export const BRAND = {
  green: "#25422d",
  ink: "#393a3c",
  paper: "#fcfcfc",
  band: "#f0f0eb",
  gold: "#f8a820",
  muted: "rgba(57, 58, 60, 0.72)",
};
export const CARD_FONT = 'Roboto, "Helvetica Neue", Arial, sans-serif';

export const ART_WIDTH = 260;
export const ART_HEIGHT = 300;

const font = (spec) => `${spec} ${CARD_FONT}`;

function newArt() {
  const canvas = document.createElement("canvas");
  canvas.width = ART_WIDTH;
  canvas.height = ART_HEIGHT;
  return { canvas, g: canvas.getContext("2d") };
}

/** Centre text in the picture, wrapped to a width. Returns nothing; draws up to maxLines lines. */
function centredText(g, text, y, maxWidth, lineHeight, maxLines = 3) {
  g.textAlign = "center";
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((text, i) => g.fillText(text, ART_WIDTH / 2, y + i * lineHeight));
  g.textAlign = "left";
}

function roundedRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

/** The surname collaboration score as a dark green disc, like the hub's own badge: "95%". */
export function drawScoreBadge(score) {
  const { canvas, g } = newArt();
  g.fillStyle = BRAND.green;
  g.beginPath();
  g.arc(ART_WIDTH / 2, 115, 105, 0, Math.PI * 2);
  g.fill();

  const number = String(Math.round(score));
  g.font = font("700 92px");
  const numberWidth = g.measureText(number).width;
  g.font = font("700 40px");
  const percentWidth = g.measureText("%").width;
  const start = (ART_WIDTH - (numberWidth + percentWidth + 4)) / 2;
  g.fillStyle = "#ffffff";
  g.font = font("700 92px");
  g.fillText(number, start, 148);
  g.font = font("700 40px");
  g.fillText("%", start + numberWidth + 4, 148);

  g.fillStyle = BRAND.ink;
  g.font = font("700 21px");
  centredText(g, "Surname collaboration score", 252, 240, 26, 2);
  return canvas;
}

/** The surname's rank by popularity, in an outlined oval like the hub's rank badge: "8,840th". */
export function drawRankBadge(rank) {
  const { canvas, g } = newArt();
  g.fillStyle = "#ffffff";
  g.strokeStyle = BRAND.green;
  g.lineWidth = 6;
  g.beginPath();
  g.ellipse(ART_WIDTH / 2, 115, 122, 76, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  g.fillStyle = BRAND.green;
  g.font = font("700 54px");
  centredText(g, ordinal(rank), 134, 220, 56, 1);

  g.fillStyle = BRAND.ink;
  g.font = font("700 21px");
  centredText(g, "most popular surname on WikiTree", 238, 240, 26, 2);
  return canvas;
}

const DNA_TAGS = [
  { key: "y", tag: "Y", colour: "#6b3fa0", name: "Y-DNA" },
  { key: "mt", tag: "mt", colour: "#c0392b", name: "mtDNA" },
  { key: "au", tag: "au", colour: "#2e7d32", name: "Autosomal" },
];

/** The DNA tests members with the surname have taken, in a light green box like the hub's DNA box. */
export function drawDnaPanel(surname, dna) {
  const { canvas, g } = newArt();
  g.fillStyle = "#dcf5aa";
  roundedRect(g, 0, 0, ART_WIDTH, ART_HEIGHT, 18);
  g.fill();

  g.fillStyle = BRAND.green;
  g.font = font("700 25px");
  g.fillText(`${surname} DNA`.slice(0, 22), 18, 44);

  DNA_TAGS.filter((t) => dna[t.key]).forEach((t, i) => {
    const y = 74 + i * 72;
    const { members, profiles } = dna[t.key];
    g.fillStyle = "#ffffff";
    g.strokeStyle = t.colour;
    g.lineWidth = 2;
    roundedRect(g, 18, y, 38, 28, 4);
    g.fill();
    g.stroke();
    g.fillStyle = t.colour;
    g.font = font("700 16px");
    g.textAlign = "center";
    g.fillText(t.tag, 37, y + 20);
    g.textAlign = "left";

    g.fillStyle = BRAND.ink;
    g.font = font("700 19px");
    g.fillText(`${members.toLocaleString("en-US")} ${members === 1 ? "member" : "members"}`, 68, y + 14);
    g.font = font("400 17px");
    g.fillText(`connect ${profiles.toLocaleString("en-US")} profiles`, 68, y + 38);
  });
  return canvas;
}
