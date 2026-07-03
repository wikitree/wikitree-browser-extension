function serializeCellForHash(cell) {
  if (typeof cell === "string") {
    return cell;
  }

  return `${cell?.text || ""}:${cell?.colspan || 1}:${cell?.rowspan || 1}`;
}

function utf8ToBase64(value) {
  return btoa(encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
}

export function generateRowHash(row) {
  const rowStr = row.map(serializeCellForHash).join("|");
  return utf8ToBase64(rowStr);
}
