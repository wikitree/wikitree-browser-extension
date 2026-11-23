// Christmas Tree's picture: an SVG of the member's list as a tree in the snow. Each row of the list (treeRows in
// christmas_tree_data.js) is one tier, top of the tree first, with a row of baubles: lit ones for people in good shape,
// dark ones for those who need help. The star on top lights when the Advent doors so far are all done. Plain shapes
// only (no fonts or emoji), so the same SVG can be drawn onto a canvas for "Save picture". No page code here.
import { litBaubles } from "./christmas_tree_data";

export const WIDTH = 360;
const ROW_HEIGHT = 46;
const TOP = 52; // room for the star
const TRUNK = 26;
const BOTTOM = 14;
const BEACH = 58; // extra room at the bottom for the summer scene's beach
const MIN_TIER = 70;
const MAX_TIER = WIDTH - 36;
const BAUBLE_GAP = 22;
const BAUBLE_R = 6.5;
const LIT_COLOURS = ["#ff4d5e", "#ffd166", "#4cc9f0", "#ff7bd0", "#9bf6a0"];
const DARK_FILL = "#7d8f86"; // unlit glass: clearly off, but still a decoration
const DARK_STROKE = "#5c6e65";

const escapeXml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const round = (n) => Math.round(n * 10) / 10;

/** Which of `count` baubles are lit, when `lit` are: spread along the row rather than bunched at one end. */
export function litPattern(lit, count) {
  const pattern = [];
  for (let i = 0; i < count; i++) pattern.push(Math.floor(((i + 1) * lit) / count) > Math.floor((i * lit) / count));
  return pattern;
}

/** A tier's width at its base: narrow at the top, wide at the bottom. */
const tierWidth = (index, rows) => MIN_TIER + ((MAX_TIER - MIN_TIER) * (index + 1)) / rows;

/** How many baubles a tier has room for, but never more than the people on that row. */
export function baubleCount(index, rows, total) {
  const room = Math.max(1, Math.floor((tierWidth(index, rows) * 0.8) / BAUBLE_GAP));
  return Math.min(room, total);
}

function starPoints(cx, cy, outer, inner) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(`${round(cx + r * Math.cos(angle))},${round(cy + r * Math.sin(angle))}`);
  }
  return points.join(" ");
}

// A scatter of snow, the same every time
function snow(height) {
  const flakes = [];
  for (let i = 0; i < 34; i++) {
    const x = (i * 97 + 31) % WIDTH;
    const y = (i * 61 + 17) % height;
    const r = i % 3 === 0 ? 1.6 : 1;
    flakes.push(`<circle cx="${x}" cy="${y}" r="${r + 0.6}" fill="#ffffff" opacity="${i % 2 ? 0.95 : 0.7}"/>`);
  }
  return flakes.join("");
}

/** A reindeer leaping to the right, about 75 wide and 60 high at scale 1, its top left at (x, y). */
export function reindeer(x, y, scale = 1, { redNose = true } = {}) {
  const legs = "M24 40 L14 47 L10 53 M30 41 L24 51 M46 40 L55 47 L62 46 M51 38 L60 41 L66 38";
  const antlers = "M60 13 L57 2 L52 -2 M57 2 L60 -4 M58 7 L53 5 M64 13 L66 1 L71 -3 M66 1 L64 -5 M66 6 L71 5";
  return (
    `<g transform="translate(${x},${y + 6}) scale(${scale})">` +
    `<path d="${legs}" stroke="#6b4226" stroke-width="3.2" stroke-linecap="round" fill="none"/>` +
    `<path d="${antlers}" stroke="#7a5230" stroke-width="2.2" stroke-linecap="round" fill="none"/>` +
    `<ellipse cx="16" cy="30" rx="5" ry="3.5" fill="#f4efe6"/>` +
    `<ellipse cx="36" cy="33" rx="21" ry="10" fill="#8b5a2b"/>` +
    `<polygon points="47,30 56,14 66,17 56,36" fill="#8b5a2b"/>` +
    `<ellipse cx="64" cy="17" rx="9" ry="5.5" fill="#8b5a2b" transform="rotate(12 64 17)"/>` +
    `<polygon points="58,13 53,7 61,11" fill="#6b4226"/>` +
    `<circle cx="64" cy="15" r="1.3" fill="#1b1b1b"/>` +
    (redNose
      ? `<circle cx="73" cy="20" r="3" fill="#e63946" filter="url(#ct-glow)"/>`
      : `<circle cx="72.5" cy="19.5" r="2" fill="#3b2414"/>`) +
    `<rect x="44" y="27" width="10" height="4" rx="2" fill="#c8283a" transform="rotate(-50 49 29)"/>` +
    `</g>`
  );
}

/** Santa in his sleigh, pulled by two reindeer, flying to the right: about 125 wide and 55 high at scale 1. */
export function sleighTeam(x, y, scale = 1) {
  const reins = "M40 30 Q60 34 76 24 M40 30 Q78 36 112 20";
  return (
    `<g transform="translate(${x},${y}) scale(${scale})">` +
    `<path d="${reins}" stroke="#e8d9b0" stroke-width="1" fill="none"/>` +
    reindeer(44, 2, 0.48, { redNose: false }) +
    reindeer(82, -4, 0.48) +
    // Santa, with his sack behind him
    `<ellipse cx="7" cy="20" rx="8" ry="9" fill="#2f6b45"/>` +
    `<circle cx="20" cy="18" r="7" fill="#c8283a"/>` +
    `<circle cx="22" cy="9" r="4.5" fill="#f1c27d"/>` +
    `<path d="M17.5 9.5 Q22 19 26.5 9.5 Z" fill="#fff"/>` +
    `<polygon points="17.5,7 26.5,7 15,1" fill="#c8283a"/>` +
    `<rect x="17" y="5.5" width="10" height="2.6" rx="1.3" fill="#fff"/><circle cx="15" cy="1" r="1.8" fill="#fff"/>` +
    // The sleigh
    `<path d="M0 22 L30 22 Q36 22 37 15 L42 15 Q42 34 26 34 L6 34 Q0 34 0 28 Z" fill="#b3202f" ` +
    `stroke="#ffd166" stroke-width="1.2"/>` +
    `<path d="M8 34 L8 39 M30 34 L30 39 M0 39 L36 39 Q44 39 44 33" stroke="#ffd166" stroke-width="2" ` +
    `stroke-linecap="round" fill="none"/>` +
    `</g>`
  );
}

/** A full moon with a soft glow, centred on (x, y). */
function moon(x, y) {
  return (
    `<circle cx="${x}" cy="${y}" r="26" fill="#fff6d5" opacity="0.18"/>` +
    `<circle cx="${x}" cy="${y}" r="18" fill="#fff6d5"/>` +
    `<circle cx="${x - 6}" cy="${y - 4}" r="4" fill="#ece0b8"/><circle cx="${x + 5}" cy="${y + 6}" r="3" ` +
    `fill="#ece0b8"/><circle cx="${x + 6}" cy="${y - 7}" r="2" fill="#ece0b8"/>`
  );
}

/** A reindeer on its day off: lying on the sand in sunglasses, about 70 wide and 40 high, its top left at (x, y). */
export function restingReindeer(x, y, scale = 1) {
  const antlers = "M46 8 L43 -3 L38 -7 M43 -3 L46 -9 M44 2 L39 0 M50 8 L52 -4 L57 -8 M52 -4 L50 -10 M52 1 L57 0";
  return (
    `<g transform="translate(${x},${y + 10}) scale(${scale})">` +
    `<ellipse cx="34" cy="36" rx="30" ry="3" fill="#000" opacity="0.12"/>` +
    `<ellipse cx="30" cy="27" rx="22" ry="9" fill="#8b5a2b"/>` +
    `<ellipse cx="14" cy="34" rx="7" ry="3" fill="#6b4226"/><ellipse cx="40" cy="34" rx="7" ry="3" fill="#6b4226"/>` +
    `<ellipse cx="9" cy="24" rx="4" ry="3" fill="#f4efe6"/>` +
    `<polygon points="38,24 44,10 54,13 48,28" fill="#8b5a2b"/>` +
    `<path d="${antlers}" stroke="#7a5230" stroke-width="2.2" stroke-linecap="round" fill="none"/>` +
    `<ellipse cx="51" cy="13" rx="9" ry="5.5" fill="#8b5a2b" transform="rotate(10 51 13)"/>` +
    `<rect x="47" y="9" width="9" height="3" rx="1.2" fill="#1b1b1b"/>` +
    `<circle cx="60" cy="16" r="2.2" fill="#3b2414"/>` +
    `</g>`
  );
}

/** A red and white beach umbrella, its pole standing at (x, y), about 90 wide and 60 high. */
function beachUmbrella(x, y) {
  const top = y - 60; // the canopy's rim
  const left = x - 44;
  const right = x + 46;
  return (
    `<path d="M${x} ${y} L${x} ${top - 16}" stroke="#8a6a4a" stroke-width="2.5"/>` +
    `<path d="M${left} ${top} Q${x} ${top - 40} ${right} ${top} Z" fill="#c8283a"/>` +
    `<path d="M${x - 14} ${top} Q${x - 6} ${top - 22} ${x} ${top - 20} Q${x + 6} ${top - 22} ${x + 14} ${top} Z" ` +
    `fill="#fff"/>` +
    `<path d="M${left} ${top} L${right} ${top}" stroke="#a51c2c" stroke-width="1.2"/>`
  );
}

/** Santa on a surfboard, riding a wave, about 92 wide and 68 high at scale 1, its top left at (x, y). */
export function surfingSanta(x, y, scale = 1) {
  return (
    `<g transform="translate(${x},${y}) scale(${scale})">` +
    `<path d="M0 68 L0 50 Q18 34 40 44 Q58 52 70 36 Q78 24 70 16 Q86 18 90 34 Q92 56 72 68 Z" fill="#2a9fd6"/>` +
    `<path d="M6 68 Q24 54 44 58 Q62 62 74 50 Q82 60 72 68 Z" fill="#5cc3ec"/>` +
    `<circle cx="70" cy="16" r="3" fill="#fff"/><circle cx="76" cy="15.5" r="2.6" fill="#fff"/>` +
    `<circle cx="82" cy="18" r="2.6" fill="#fff"/><circle cx="66" cy="20" r="2" fill="#fff"/>` +
    `<circle cx="87" cy="23" r="2" fill="#fff"/>` +
    `<ellipse cx="42" cy="46" rx="25" ry="4.2" fill="#ffd166" transform="rotate(-14 42 46)"/>` +
    `<ellipse cx="42" cy="46" rx="24" ry="1.2" fill="#c8283a" transform="rotate(-14 42 46)"/>` +
    `<path d="M34 45 L38 36 L42 31 M50 41 L47 35 L45 30" stroke="#c8283a" stroke-width="4.5" stroke-linecap="round" ` +
    `fill="none"/>` +
    `<ellipse cx="33" cy="45.5" rx="3.6" ry="2" fill="#1b1b1b"/><ellipse cx="51" cy="41.5" rx="3.6" ry="2" fill="#1b1b1b"/>` +
    `<path d="M37 20 L28 13 M49 20 L58 15" stroke="#c8283a" stroke-width="4" stroke-linecap="round" fill="none"/>` +
    `<circle cx="27.5" cy="12.5" r="2.4" fill="#fff"/><circle cx="58.5" cy="14.5" r="2.4" fill="#fff"/>` +
    `<ellipse cx="43" cy="24" rx="8" ry="9" fill="#c8283a"/>` +
    `<rect x="35" y="25.5" width="16" height="3" fill="#1b1b1b"/><rect x="41" y="25.2" width="4" height="3.6" ` +
    `fill="#ffd166"/>` +
    `<circle cx="44" cy="10" r="5" fill="#f1c27d"/>` +
    `<path d="M38.5 10.5 Q44 23 49.5 10.5 Z" fill="#fff"/>` +
    `<rect x="40.5" y="8" width="7.5" height="2.2" rx="1" fill="#1b1b1b"/>` +
    `<polygon points="39,7 49,7 53,-2" fill="#c8283a"/>` +
    `<rect x="38" y="5.5" width="12" height="3" rx="1.5" fill="#fff"/><circle cx="53" cy="-2" r="2.2" fill="#fff"/>` +
    `</g>`
  );
}

// Time zones south of the equator, where Christmas comes in summer: by region, then the zone names (or name prefixes
// ending in "/") in each
const SOUTHERN_ZONES = {
  Australia: ["Australia/", "Antarctica/Macquarie"],
  Pacific: [
    "Pacific/Auckland",
    "Pacific/Chatham",
    "Pacific/Fiji",
    "Pacific/Tongatapu",
    "Pacific/Apia",
    "Pacific/Noumea",
    "Pacific/Efate",
    "Pacific/Port_Moresby",
    "Pacific/Bougainville",
    "Pacific/Guadalcanal",
    "Pacific/Tahiti",
    "Pacific/Rarotonga",
    "Pacific/Niue",
    "Pacific/Pago_Pago",
    "Pacific/Funafuti",
    "Pacific/Wallis",
    "Pacific/Norfolk",
    "Pacific/Easter",
    "Pacific/Galapagos",
    "Pacific/Gambier",
    "Pacific/Marquesas",
    "Pacific/Pitcairn",
    "Pacific/Nauru",
    "Pacific/Fakaofo",
  ],
  SouthAmerica: [
    "America/Argentina/",
    "America/Buenos_Aires",
    "America/Santiago",
    "America/Punta_Arenas",
    "America/Montevideo",
    "America/Asuncion",
    "America/Sao_Paulo",
    "America/Bahia",
    "America/Recife",
    "America/Fortaleza",
    "America/Belem",
    "America/Maceio",
    "America/Araguaina",
    "America/Santarem",
    "America/Cuiaba",
    "America/Campo_Grande",
    "America/Porto_Velho",
    "America/Rio_Branco",
    "America/Manaus",
    "America/Eirunepe",
    "America/Noronha",
    "America/La_Paz",
    "America/Lima",
    "America/Guayaquil",
    "Atlantic/Stanley",
    "Atlantic/South_Georgia",
  ],
  Africa: [
    "Africa/Johannesburg",
    "Africa/Maseru",
    "Africa/Mbabane",
    "Africa/Windhoek",
    "Africa/Gaborone",
    "Africa/Harare",
    "Africa/Lusaka",
    "Africa/Lubumbashi",
    "Africa/Blantyre",
    "Africa/Maputo",
    "Africa/Luanda",
    "Africa/Kinshasa",
    "Africa/Brazzaville",
    "Africa/Libreville",
    "Africa/Dar_es_Salaam",
    "Africa/Kigali",
    "Africa/Bujumbura",
    "Africa/Nairobi",
    "Indian/Antananarivo",
    "Indian/Comoro",
    "Indian/Mayotte",
    "Indian/Mauritius",
    "Indian/Reunion",
    "Indian/Mahe",
    "Indian/Chagos",
    "Indian/Cocos",
    "Indian/Christmas",
    "Atlantic/St_Helena",
  ],
  Asia: ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Dili"],
  Antarctica: ["Antarctica/"],
};
const SOUTHERN = Object.values(SOUTHERN_ZONES).flat();

/** Christmas in summer: south of the equator, going by the computer's time zone. */
export function isSummerChristmas(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "") {
  return SOUTHERN.some((zone) => (zone.endsWith("/") ? timeZone.startsWith(zone) : timeZone === zone));
}

/** A summer sun with short rays, centred on (x, y). */
function sun(x, y) {
  const rays = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const from = (r) => `${round(x + r * Math.cos(angle))} ${round(y + r * Math.sin(angle))}`;
    rays.push(`M${from(19)} L${from(25)}`);
  }
  return (
    `<path d="${rays.join(" ")}" stroke="#ffb703" stroke-width="2.5" stroke-linecap="round"/>` +
    `<circle cx="${x}" cy="${y}" r="15" fill="#ffd166" filter="url(#ct-glow)"/>`
  );
}

/** A present: a box of `fill` with a ribbon and bow of `ribbon`. */
function present(x, y, width, height, fill, ribbon) {
  const mid = x + width / 2;
  return (
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2" fill="${fill}" stroke="rgba(0,0,0,0.15)"/>` +
    `<rect x="${mid - 2}" y="${y}" width="4" height="${height}" fill="${ribbon}"/>` +
    `<rect x="${x}" y="${y + height / 2 - 2}" width="${width}" height="4" fill="${ribbon}"/>` +
    `<ellipse cx="${mid - 4}" cy="${y - 2}" rx="4.5" ry="3" fill="${ribbon}"/>` +
    `<ellipse cx="${mid + 4}" cy="${y - 2}" rx="4.5" ry="3" fill="${ribbon}"/>`
  );
}

/** "412 relatives, 37 need help" */
export function rowDescription(row, noun = "people") {
  const needs = row.dark ? `${row.dark.toLocaleString()} need${row.dark === 1 ? "s" : ""} help` : "all lit";
  const singular = { relatives: "relative", profiles: "profile", people: "person" }[noun] || noun;
  return `${row.label}: ${row.total.toLocaleString()} ${row.total === 1 ? singular : noun}, ${needs}`;
}

/**
 * The tree as an SVG string. rows: treeRows(...); starLit: whether the star shines; noun: "relatives" or "profiles"
 * (for the tooltips); summer: a southern-hemisphere Christmas (sun, sand and a surfing Santa as well as the reindeer, not snow).
 * Each tier is a focusable group with data-row, for the popup to make clickable.
 */
export function drawTree(rows, { starLit = false, noun = "people", title = "Christmas Tree", summer = false } = {}) {
  const count = rows.length;
  const height = TOP + Math.max(count, 1) * ROW_HEIGHT + TRUNK + BOTTOM + (summer ? BEACH : 0);
  const cx = WIDTH / 2;
  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}" ` +
      `role="img" aria-label="${escapeXml(title)}">`,
    `<title>${escapeXml(title)}</title>`,
    `<defs><filter id="ct-glow" x="-100%" y="-100%" width="300%" height="300%">` +
      `<feGaussianBlur stdDeviation="2.6" result="blur"/><feMerge><feMergeNode in="blur"/>` +
      `<feMergeNode in="SourceGraphic"/></feMerge></filter>` +
      `<linearGradient id="ct-sky" x1="0" y1="0" x2="0" y2="1">` +
      (summer
        ? `<stop offset="0" stop-color="#4fb3ea"/><stop offset="1" stop-color="#fff1c9"/>`
        : `<stop offset="0" stop-color="#26346a"/><stop offset="0.6" stop-color="#4a5d9c"/>` +
          `<stop offset="1" stop-color="#9a8fc0"/>`) +
      `</linearGradient></defs>`,
    `<rect width="${WIDTH}" height="${height}" rx="10" fill="url(#ct-sky)"/>`
  );
  // Summer: Santa goes surfing while the reindeer have the day off. Winter: an evening sky, with the sleigh out.
  if (summer) parts.push(sun(WIDTH - 34, 34), surfingSanta(4, 16, 1.15));
  else parts.push(snow(height), moon(WIDTH - 40, 38), sleighTeam(4, 20, 1.2));
  parts.push(
    `<ellipse cx="${WIDTH / 2}" cy="${height - 2}" rx="${WIDTH * 0.75}" ry="${BOTTOM + 10}" ` +
      `fill="${summer ? "#f3d9a4" : "#ffffff"}"/>` +
      (summer
        ? `<rect x="0" y="${TOP + count * ROW_HEIGHT + 20}" width="${WIDTH}" height="${height}" fill="#f3d9a4"/>`
        : "")
  );

  const lastBase = TOP + count * ROW_HEIGHT + 4;
  parts.push(`<rect x="${cx - 15}" y="${lastBase - 2}" width="30" height="${TRUNK}" fill="#6b4226"/>`);
  // Presents under the tree, in front of the trunk's sides
  const giftY = lastBase + 4;
  parts.push(
    present(cx - 62, giftY, 26, 18, "#c8283a", "#ffffff"),
    present(cx - 32, giftY + 6, 18, 12, "#ffffff", "#c8283a"),
    present(cx + 20, giftY + 2, 24, 16, "#1f7a43", "#ffd166"),
    present(cx + 48, giftY + 7, 16, 11, "#ffffff", "#1f7a43")
  );

  // Bottom tier first, so each tier above overlaps the one below
  for (let index = count - 1; index >= 0; index--) {
    const row = rows[index];
    const baseY = TOP + (index + 1) * ROW_HEIGHT + 4;
    const width = tierWidth(index, count);
    const apexY = baseY - ROW_HEIGHT * 1.6;
    const label = rowDescription(row, noun);
    parts.push(
      `<g class="ct-tier" data-row="${escapeXml(row.key)}" tabindex="0" role="button" aria-label="${escapeXml(
        label
      )}">`,
      `<title>${escapeXml(label)}</title>`,
      `<polygon points="${cx},${round(apexY)} ${round(cx - width / 2)},${baseY} ${round(cx + width / 2)},${baseY}" ` +
        `fill="${index % 2 ? "#1d6b3c" : "#22783f"}" stroke="#134d2a" stroke-width="1.5" stroke-linejoin="round"/>`
    );
    const baubles = baubleCount(index, count, row.total);
    const pattern = litPattern(litBaubles(row.lit, row.total, baubles), baubles);
    const spread = width * 0.78;
    const y = baseY - 11;
    for (let i = 0; i < baubles; i++) {
      const x = baubles === 1 ? cx : cx - spread / 2 + (spread * i) / (baubles - 1);
      if (pattern[i]) {
        const colour = LIT_COLOURS[(i + index * 2) % LIT_COLOURS.length];
        parts.push(
          `<circle class="ct-lit" cx="${round(x)}" cy="${y}" r="${BAUBLE_R}" fill="${colour}" filter="url(#ct-glow)"/>`,
          `<circle cx="${round(x - 2)}" cy="${y - 2}" r="1.8" fill="#ffffff" opacity="0.7"/>`
        );
      } else {
        parts.push(
          `<circle class="ct-dark" cx="${round(x)}" cy="${y}" r="${BAUBLE_R}" fill="${DARK_FILL}" ` +
            `stroke="${DARK_STROKE}" stroke-width="1"/>`
        );
      }
    }
    parts.push(`</g>`);
  }

  // The reindeer's day off, in the shade on the beach, in front of the tree
  if (summer) parts.push(beachUmbrella(58, height - 6), restingReindeer(18, height - 50, 0.9));

  const star = starPoints(cx, 30, 17, 7.5);
  parts.push(
    starLit
      ? `<polygon class="ct-star ct-star-lit" points="${star}" fill="#ffd166" stroke="#fff3c4" stroke-width="1" ` +
          `filter="url(#ct-glow)"/>`
      : `<polygon class="ct-star" points="${star}" fill="#d8dde3" stroke="#9aa3ad" stroke-width="1.5"/>`,
    `</svg>`
  );
  return parts.join("");
}
