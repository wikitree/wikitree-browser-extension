import { options } from "yargs";
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
      id: "diedYoung",
      type: OptionType.CHECKBOX,
      label: "Add Died Young sticker for people who died aged 16 or younger",
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
  ],
});
