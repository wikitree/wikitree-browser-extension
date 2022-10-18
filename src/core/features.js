// Categories
export const GLOBAL = "Global";
export const PROFILE = "Profile";
export const EDITING = "Editing";
export const STYLE = "Style";

export const CATEGORIES = [GLOBAL, PROFILE, EDITING, STYLE];

const features = [];

/** Registers a new feature. */
export function registerFeature(feature) {
    features.push(feature);
}

/** Returns a list of all features. */
export function getFeatures() {
    return features;
}

/** Initializes all features that have been enabled in extension options. */
export function initializeFeatures() {
    for (const feature of features) {
        chrome.storage.sync.get(feature.id, (result) => {
            if (result[feature.id]) {
                console.log('initializing', feature.id);
                feature.init();
            } else {
                console.log('disabled', feature.id);
            }
        });        
    }
}
