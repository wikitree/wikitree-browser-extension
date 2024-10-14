/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isSpacePage, isProfilePage } from "../../core/pageType";

registerFeature({
  name: "Collapsible Profiles",
  id: "collapsibleProfiles",
  description:
    "Adds a button to the submenu of profile and space pages to collapse all sections and make them togglable. " +
    "Selecting any option here will automatically load the toggle buttons on every profile or space page.",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isSpacePage, isProfilePage],
  options: [
    {
      id: "profilesGroup",
      type: OptionType.GROUP,
      label: "Profiles",
      options: [
        {
          id: "automaticallyAddButtonsProfiles",
          type: OptionType.CHECKBOX,
          label: "Add toggle buttons",
          defaultValue: false,
        },
        {
          id: "collapseProfilesAllSections",
          type: OptionType.CHECKBOX,
          label: "Collapse all sections",
          defaultValue: false,
        },
        {
          id: "collapseProfilesBiography",
          type: OptionType.CHECKBOX,
          label: "Collapse Biography",
          defaultValue: false,
        },
        {
          id: "collapseProfilesResearchNotes",
          type: OptionType.CHECKBOX,
          label: "Collapse Research Notes",
          defaultValue: false,
        },
        {
          id: "collapseProfilesSources",
          type: OptionType.CHECKBOX,
          label: "Collapse Sources",
          defaultValue: false,
        },
        {
          id: "collapseProfilesAcknowledgments",
          type: OptionType.CHECKBOX,
          label: "Collapse Acknowledgments",
          defaultValue: false,
        },
      ],
    },
    {
      id: "spacesGroup",
      type: OptionType.GROUP,
      label: "Space Pages",
      options: [
        {
          id: "automaticallyAddButtonsSpaces",
          type: OptionType.CHECKBOX,
          label: "Add toggle buttons",
          defaultValue: false,
        },
        {
          id: "collapseSpacesAllSections",
          type: OptionType.CHECKBOX,
          label: "Collapse all sections",
          defaultValue: false,
        },
        {
          id: "collapseSpacesResearchNotes",
          type: OptionType.CHECKBOX,
          label: "Collapse Research Notes",
          defaultValue: false,
        },
        {
          id: "collapseSpacesSources",
          type: OptionType.CHECKBOX,
          label: "Collapse Sources",
          defaultValue: false,
        },
        {
          id: "collapseSpacesAcknowledgments",
          type: OptionType.CHECKBOX,
          label: "Collapse Acknowledgments",
          defaultValue: false,
        },
      ],
    },
  ],
});
