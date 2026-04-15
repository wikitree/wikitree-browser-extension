let autoBioModulePromise = null;

export function loadAutoBioModule() {
  if (!autoBioModulePromise) {
    autoBioModulePromise = import(
      /* webpackChunkName: "auto-bio" */
      "./auto_bio"
    ).catch((error) => {
      autoBioModulePromise = null;
      throw error;
    });
  }

  return autoBioModulePromise;
}
