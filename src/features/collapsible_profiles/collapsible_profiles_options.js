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
  contributors: [{ name: "Riël Smit", wikitreeid: "Smit-641" }],
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
          type: OptionType.RADIO,
          label: "Initial State",
          values: [
            {
              value: true,
              text: "Add all toggle buttons",
            },
            {
              value: false,
              text: "Add a single activation button",
            },
          ],
          defaultValue: false,
        },
        {
          type: OptionType.GROUP,
          label: "Collapse by default",
          options: [
            {
              id: "collapseProfilesAllSections",
              type: OptionType.CHECKBOX,
              label: "All sections",
              defaultValue: false,
            },
            {
              id: "collapseProfilesBiography",
              type: OptionType.CHECKBOX,
              label: "Biography",
              defaultValue: false,
            },
            {
              id: "collapseProfilesResearchNotes",
              type: OptionType.CHECKBOX,
              label: "Research Notes",
              defaultValue: false,
            },
            {
              id: "collapseProfilesSources",
              type: OptionType.CHECKBOX,
              label: "Sources",
              defaultValue: false,
            },
            {
              id: "collapseProfilesAcknowledgments",
              type: OptionType.CHECKBOX,
              label: "Acknowledgments",
              defaultValue: false,
            },
            {
              id: "collapseProfilesMemories",
              type: OptionType.CHECKBOX,
              label: "Memories",
              defaultValue: false,
            },
            {
              id: "collapseProfilesCollaboration",
              type: OptionType.CHECKBOX,
              label: "Collaboration",
              defaultValue: false,
            },
            {
              id: "collapseProfilesComments",
              type: OptionType.CHECKBOX,
              label: "Comments",
              defaultValue: false,
            },
            {
              id: "collapseProfilesMatches",
              type: OptionType.CHECKBOX,
              label: "Matches",
              defaultValue: false,
            },
            {
              id: "collapseProfilesFeatured",
              type: OptionType.CHECKBOX,
              label: "Featured Connections",
              defaultValue: false,
            },
          ],
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
          type: OptionType.RADIO,
          label: "Initial State",
          values: [
            {
              value: true,
              text: "Add all toggle buttons",
            },
            {
              value: false,
              text: "Add a single activation button",
            },
          ],
          defaultValue: false,
        },
        {
          type: OptionType.GROUP,
          label: "Collapse by default",
          options: [
            {
              id: "collapseSpacesAllSections",
              type: OptionType.CHECKBOX,
              label: "All sections",
              defaultValue: false,
            },
            {
              id: "collapseSpacesResearchNotes",
              type: OptionType.CHECKBOX,
              label: "Research Notes",
              defaultValue: false,
            },
            {
              id: "collapseSpacesSources",
              type: OptionType.CHECKBOX,
              label: "Sources",
              defaultValue: false,
            },
            {
              id: "collapseSpacesAcknowledgments",
              type: OptionType.CHECKBOX,
              label: "Acknowledgments",
              defaultValue: false,
            },
            {
              id: "collapseSpacesMemories",
              type: OptionType.CHECKBOX,
              label: "Memories",
              defaultValue: false,
            },
            {
              id: "collapseSpacesCollaboration",
              type: OptionType.CHECKBOX,
              label: "Collaboration",
              defaultValue: false,
            },
            {
              id: "collapseSpacesComments",
              type: OptionType.CHECKBOX,
              label: "Comments",
              defaultValue: false,
            },
          ],
        },
      ],
    },
  ],
});
