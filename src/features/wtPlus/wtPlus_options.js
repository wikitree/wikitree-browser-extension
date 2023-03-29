/*
Created By: Aleš Trtnik (Trtnik-2)
*/

import { isWikiEdit } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry";

registerFeature({
  name: "WikiTree+ Edit Helper",
  id: "wtplus",
  description: "Adds multiple editing features.",
  category: "Editing",
  creators: [{ name: "Aleš Trtnik", wikitreeid: "Trtnik-2" }],
  contributors: [],
  defaultValue: true,
  pages: [isWikiEdit],
  options: [
    {
      id: "wtplusSourceInline",
      type: OptionType.CHECKBOX,
      label: "Add pasted sources as inline citation instead of bulleted list",
      defaultValue: true,
    },
  ],
});
