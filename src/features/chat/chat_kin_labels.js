// Relationship labels shared by chart summaries and tables.

export function ancestorWord(generation, gender) {
  const base = gender === "Female" ? "mother" : gender === "Male" ? "father" : "parent";
  if (generation <= 0) return "";
  if (generation === 1) return base[0].toUpperCase() + base.slice(1);
  if (generation === 2) return `Grand${base}`;
  if (generation === 3) return `Great-grand${base}`;
  return `${generation - 2}x great-grand${base}`;
}

export function generationLabel(generation) {
  if (generation === 0) return "";
  return `${ancestorWord(generation, "")}s`;
}

export function descendantWord(generation, gender) {
  const base = gender === "Female" ? "daughter" : gender === "Male" ? "son" : "child";
  if (generation <= 0) return "";
  if (generation === 1) return base[0].toUpperCase() + base.slice(1);
  if (generation === 2) return `Grand${base}`;
  if (generation === 3) return `Great-grand${base}`;
  return `${generation - 2}x great-grand${base}`;
}

// Lowercase plural labels used in ancestor-depth prose.
export function ancestorGenerationLabel(generation) {
  if (generation === 1) return "parents";
  if (generation === 2) return "grandparents";
  if (generation === 3) return "great-grandparents";
  return `${generation - 2}x great-grandparents`;
}
