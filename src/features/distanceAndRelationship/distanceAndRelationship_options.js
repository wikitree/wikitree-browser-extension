import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfilePage, isProfileEdit } from "../../core/pageType";

registerFeature({
  name: "Distance and Relationship",
  id: "distanceAndRelationship",
  description:
    "Adds the distance (degrees) between you and the profile person and any relationship between you. " +
    "Click the degree number or relationship text to update.",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [{ name: "Riël Smit", wikitreeid: "Smit-641" }],
  defaultValue: true,
  pages: [isProfilePage, isProfileEdit],
  options: [
    {
      id: "relationshipBoxPosition",
      type: OptionType.RADIO,
      label: "Position of the relationship box",
      values: [
        {
          text: "Above the birth and death details",
          value: "above",
        },
        {
          text: "Below the birth and death details",
          value: "below",
        },
      ],
      defaultValue: "above",
    },
  ],
});
