// Shared formatting helpers used by multiple features

/**
 * Branch/family palette — used to colour-code consecutive family branches
 * in connections tables. A new branch starts each time a spouse step is
 * encountered. Imported by connection_finder and chat/ui.
 */
export const familyColours = [
  "#90EE90", // lightgreen
  "#ADD8E6", // lightblue
  "#FFC0CB", // pink
  "#D3D3D3", // lightgray
  "#FFA500", // orange
  "#FF69B4", // hotpink
  "#FFD700", // gold
  "#FA8072", // salmon
  "#98FF98", // mint
  "#fe9", // yellow
  "#cbc3e3", // purple
  "#fff", // white
  "#d0ece7", // green2
  "#c6f0fd", // blue2
  "#d0d0d0", // grey2
  "#fad347", // orange2
  "#e6b0aa", // red2
  "#c4a484", // brown
  "#afeeee", // turquoise
  "#fffdd0", // cream
  "#ffe5b4", // peach
  "#aa98a9", // lilac
  "#87ceeb", // skyblue
  "#ecf0f1", // grey3
];

export const relationshipColours = [
  "#90EE90",
  "#ADDBE6",
  "#FFC0CB",
  "#D3D3D3",
  "#FFA500",
  "#FF6B94",
  "#FFD700",
  "#FA8072",
  "#98FB98",
  "#f9e",
  "#cbc3e3",
  "#fff",
  "#d0ece7",
  "#c6f0fd",
  "#d0d0d0",
  "#fad347",
  "#e6b0aa",
  "#c4a484",
  "#afeeee",
  "#fffdd0",
  "#ffee5b",
  "#aa98a9",
  "#87ceeb",
  "#ecf0f1",
];

export function getRelationColour(relation) {
  const rels = ["parent", "child", "sibling", "spouse", "ancestor", "descendant", "other"];
  const idx = rels.indexOf(String(relation || "").toLowerCase());
  return idx >= 0 ? relationshipColours[idx % relationshipColours.length] : "#fff";
}

export function getYearColour(date) {
  if (!date || date === "0000-00-00") return "#fff";
  const year = parseInt(String(date || "").split("-")[0], 10);
  if (!year || isNaN(year)) return "#fff";
  const base = 1800;
  const idx = Math.max(0, Math.min(relationshipColours.length - 1, Math.floor((year - base) / 50)));
  return relationshipColours[idx];
}

export function formatDate(date) {
  if (!date || date === "0000-00-00") return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = String(date || "").split("-");
  if (parts[0] === "0000") return "";
  if (parts[1] === "00") return parts[0];
  if (parts[2] === "00") return months[parseInt(parts[1], 10) - 1] + " " + parts[0];
  return parseInt(parts[2], 10) + " " + months[parseInt(parts[1], 10) - 1] + " " + parts[0];
}
