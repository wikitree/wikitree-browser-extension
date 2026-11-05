// Loads the Wikitable Wizard (chunk "wikitable-wizard") only where it's enabled (edit pages), so its code isn't in
// content.js, which every WikiTree page loads. The edit toolbar's buttons load it through wikitable_wizard_loader.js.
// (Its CSS was injected on every page when the wizard was part of content.js; kept here so styles don't change.)
import "./wikitable_wizard.css";
import { loadFeatureWhereEnabled } from "../../core/options/lazy_feature";
import { loadWikitableWizardModule } from "./wikitable_wizard_loader";

loadFeatureWhereEnabled("wikitableWizard", loadWikitableWizardModule);
