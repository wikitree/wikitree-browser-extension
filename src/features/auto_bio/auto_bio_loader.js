import { loadFirstNameVariants } from "./first_name_variants_loader";

let autoBioModulePromise = null;

// Callers use Auto Bio's helpers straight away (getNameVariants among them), so the first-name
// variants list is loaded with the module rather than left to generateBio().
export function loadAutoBioModule() {
  if (!autoBioModulePromise) {
    autoBioModulePromise = Promise.all([
      import(
        /* webpackChunkName: "auto-bio" */
        "./auto_bio"
      ),
      loadFirstNameVariants(),
    ])
      .then(([module]) => module)
      .catch((error) => {
        autoBioModulePromise = null;
        throw error;
      });
  }

  return autoBioModulePromise;
}
