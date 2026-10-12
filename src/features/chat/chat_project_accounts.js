// WikiTree project accounts, from wtplus_projects.json ({"WikiTree-9": {Project: "Mayflower Project"}, …}). WT+'s
// Manager= takes only an account ID, so a project named in a request is looked up here: by its name with or
// without "project", or by the ID itself. (The search reader and the spec parser both use it.)
import wtPlusProjectAccounts from "./wtplus_projects.json";

/** "The Mayflower Project!" → "the mayflower project": the form names are looked up in. */
export const projectKey = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Map of projectKey → {id, name} for every account in `data` (the bundled list by default). */
export function projectAccountMap(data = wtPlusProjectAccounts) {
  const map = new Map();
  Object.entries(data || {}).forEach(([account, details]) => {
    const id = String(account || "").trim();
    if (!id) return;
    const name = String(details?.Project || "").trim();
    const entry = { id, name };
    const key = projectKey(name).replace(/ project$/, "");
    if (key) {
      map.set(key, entry);
      map.set(`${key} project`, entry);
    }
    map.set(projectKey(id), entry);
  });
  return map;
}
