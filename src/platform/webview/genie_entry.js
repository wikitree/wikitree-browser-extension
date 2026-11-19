/*
The WikiTree Tree Apps mobile app's Genie file (wbe-genie.js, after shim.js). Genie is only loaded when it's opened
(src/features/chat/load_genie.js adds this file to the page), as the extensions load it as a lazy chunk.
*/
import * as genie from "../../features/chat/chat";

globalThis.__wbeGenie = genie;
