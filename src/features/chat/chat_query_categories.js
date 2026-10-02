// A category search should show which of each person's categories matched
// ("Chicago military" → the military categories), not just the person.

const normalizeCategory = (value) =>
  String(value || "")
    .replace(/_+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .toLowerCase();

/** Category=… values, CategoryWord=… words and SubCatN=… category trees in a WT+ query. */
export function extractQueryCategoryTerms(query) {
  const text = String(query || "");
  const terms = { categories: [], words: [], trees: [] };
  const re = /\b(Category|CategoryWord|SubCat\d)=("[^"]*"|'[^']*'|[^\s()]+)/gi;
  let match;
  while ((match = re.exec(text))) {
    const value = match[2].replace(/^["']|["']$/g, "").trim();
    if (!value) continue;
    if (/^CategoryWord$/i.test(match[1])) terms.words.push(value);
    else if (/^SubCat/i.test(match[1])) terms.trees.push(value);
    else terms.categories.push(value);
  }
  return terms;
}

export function queryHasCategoryTerms(query) {
  const terms = extractQueryCategoryTerms(query);
  return terms.categories.length > 0 || terms.words.length > 0 || terms.trees.length > 0;
}

/** The person's categories (API names, underscores) that the query matched. */
export function matchQueryCategories(categories, query) {
  const list = Array.isArray(categories) ? categories : Object.values(categories || {});
  const terms = extractQueryCategoryTerms(query);
  const wanted = new Set(terms.categories.map(normalizeCategory));
  const words = terms.words.map((word) => normalizeCategory(word)).filter(Boolean);
  // A subcategory's name ends with its parent's: "Adams County, Mississippi, Slave Owners".
  const trees = terms.trees.map(normalizeCategory).filter(Boolean);
  return list.filter((name) => {
    const plain = normalizeCategory(name);
    if (wanted.has(plain)) return true;
    if (trees.some((tree) => plain === tree || plain.endsWith(`, ${tree}`))) return true;
    return words.some((word) => new RegExp(`(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(plain));
  });
}
