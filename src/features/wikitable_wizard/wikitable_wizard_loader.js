let wikitableWizardModulePromise = null;

export function loadWikitableWizardModule() {
  if (!wikitableWizardModulePromise) {
    wikitableWizardModulePromise = import(
      /* webpackChunkName: "wikitable-wizard" */
      "./wikitable_wizard"
    ).catch((error) => {
      wikitableWizardModulePromise = null;
      throw error;
    });
  }

  return wikitableWizardModulePromise;
}

export async function createWikitableWizard(params) {
  const module = await loadWikitableWizardModule();
  return module.createWikitableWizard?.(params);
}
