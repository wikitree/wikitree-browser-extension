import { registerFeature, OptionType } from "../../core/options/options_registry";

registerFeature({
  name: "WikiTree+ Edit Helper",
  id: "wtplus",
  description: "Adds multiple editing features.",
  category: "Editing",
  creators: [{name:"Aleš Trtnik", wikitreeid:"Trtnik-2"},{name:"1 Aleš Trtnik", wikitreeid:"Trtnik-2"}],
  contributors: [{name:"2 Aleš Trtnik", wikitreeid:"Trtnik-2"},{name:"3 Aleš Trtnik", wikitreeid:"Trtnik-2"}],
  defaultValue: true,
  pages: [
    "AllEditPages"
  ],
  options: [
    {
      id: "wtplusSourceInline",
      type: OptionType.CHECKBOX,
      label: "Add pasted sources as inline citation instead of bulleted list",
      defaultValue: true,
    },
  ],
});
