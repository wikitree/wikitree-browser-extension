import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfileEdit, isProfileAddRelative, isAddUnrelatedPerson } from "../../core/pageType";

registerFeature({
  name: "Unnamed Infant",
  id: "unnamedInfant",
  description: "Standardizes the naming of unnamed infants and adds a Died Young sticker to the profile.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileEdit, isProfileAddRelative, isAddUnrelatedPerson],
  options: [
    {
      id: "unnamedInfant",
      type: OptionType.CHECKBOX,
      label: "Re-name unnamed infants to 'Unnamed Infant'",
      defaultValue: true,
    },
    {
      id: "diedYoung",
      type: OptionType.CHECKBOX,
      label: "Add Died Young sticker",
      defaultValue: false,
    },
    {
      id: "diedYoungImage",
      type: OptionType.SELECT,
      label: "Died Young sticker image",
      values: [
        {
          value: "Default",
          text: "Default",
        },
        {
          value: "Ribbon",
          text: "Ribbon",
        },
        {
          value: "Cradle",
          text: "Cradle",
        },
        {
          value: "Swing",
          text: "Swing",
        },
        {
          value: "Candle",
          text: "Candle",
        },
        {
          value: "Babyfeet",
          text: "Babyfeet",
        },
        {
          value: "Butterfly1",
          text: "Butterfly1",
        },
        {
          value: "Butterfly2",
          text: "Butterfly2",
        },
        {
          value: "Marigold",
          text: "Marigold",
        },
        {
          value: "Bluebirds",
          text: "Bluebirds",
        },
        {
          value: "Feethands",
          text: "Feethands",
        },
        {
          value: "Lotusbutterfly",
          text: "Lotusbutterfly",
        },
      ],
      defaultValue: "Default",
    },
    {
      id: "autoCheckBoxesUnder13",
      type: OptionType.CHECKBOX,
      label: "Automatically check 'No spouses' and 'No children' for children under 13",
      defaultValue: true,
    },
    {
      id: "offerToCheckBoxes",
      type: OptionType.CHECKBOX,
      label:
        "Offer to check 'No spouses' and 'No children' for profiles " +
        "with no children and no spouses, respectively, if the profile was created over 6 months ago.",
      defaultValue: false,
    },
  ],
});
