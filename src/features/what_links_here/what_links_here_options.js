import { registerFeature, OptionType } from "../../core/options/options_registry";

const whatLinksHere = {
  name: "What Links Here",
  id: "whatLinksHere",
  description:
    "Adds a 'What Links Here' button to the Find menu. Click to go to the What Links Here page;" +
    " right-click to copy wiki markdown for links to what links to the page.",
  category: "Global",
  creators: [{name:"Ian Beacall", wikitreeid:"Beacall-6"}],
  contributors: [],
  defaultValue: true,
  options: [
    {
      id: "whatLinksHereSection",
      type: OptionType.CHECKBOX,
      label: "Add a 'What Links Here' section to profiles and edit pages",
      defaultValue: false,
    },
  ],
};

registerFeature(whatLinksHere);
