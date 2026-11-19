/*
The WikiTree Tree Apps mobile app's Genie file (wbe-genie.js, after shim.js). Genie is only loaded when it's opened
(src/features/chat/load_genie.js adds this file to the page), as the extensions load it as a lazy chunk.

This file is a bundle of its own, so it has its own copy of the options registry, which starts empty: the feature
list in wbe-webview.js isn't shared with it. Registering the features again here lets Genie read its own options and
the AI Settings (otherwise every lookup failed with "Invalid featureId").
*/
import "../../features/register_feature_options";
import * as genie from "../../features/chat/chat";

globalThis.__wbeGenie = genie;
