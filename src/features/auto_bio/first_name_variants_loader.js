/*
Loads the first-name variants list (first_name_variants.js, ~2.7 MB minified) the first time it's needed,
so it isn't part of content.js on every page.

`firstNameVariants` is a live binding: it is an empty stand-in until loadFirstNameVariants() resolves, then
the real list. Await loadFirstNameVariants() before code that reads it. The stand-in behaves like an empty
list (no variants found) and warns once, so a caller that forgot to wait shows up in the console.
*/

let warned = false;
function warnNotLoaded() {
  if (!warned) {
    warned = true;
    console.warn("wbe: first-name variants were used before they loaded; name matching falls back to exact names");
  }
}

const notLoadedYet = new Proxy(
  {},
  {
    get(target, key) {
      if (typeof key === "string") {
        warnNotLoaded();
      }
      return undefined;
    },
    has() {
      warnNotLoaded();
      return false;
    },
    ownKeys() {
      warnNotLoaded();
      return [];
    },
  }
);

export let firstNameVariants = notLoadedYet;

let loadPromise = null;

export function loadFirstNameVariants() {
  if (!loadPromise) {
    loadPromise = import(
      /* webpackChunkName: "first-name-variants" */
      "./first_name_variants.js"
    )
      .then((module) => {
        firstNameVariants = module.firstNameVariants;
        return firstNameVariants;
      })
      .catch((error) => {
        loadPromise = null;
        throw error;
      });
  }
  return loadPromise;
}
