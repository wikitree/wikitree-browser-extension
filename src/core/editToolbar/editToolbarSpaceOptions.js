/*
Created By: Aleš Trtnik (Trtnik-2)
*/

import { wtPlus } from "../../features/wtPlus/wtPlus";
import { editToolbarApp, editToolbarWiki } from "./editToolbar";
import { createWikitableWizard } from "../../features/wikitable_wizard/wikitable_wizard";
export default [
  {
    button: "Templates",
    items: [
      { featureid: "wtplus", title: "Edit Template", call: wtPlus, params: { action: "EditTemplate" } },
      { featureid: "wtplus", title: "Add any template", call: wtPlus, params: { action: "AddTemplate" } },
      { featureid: "wtplus", title: "Format Template Params", call: wtPlus, params: { action: "AutoFormat" } },
    ],
  },
  {
    button: "Categories",
    items: [
      {
        featureid: "wtplus",
        title: "Add any category",
        hint: "Add any category using search for words in name and parent categories.",
        call: wtPlus,
        params: { action: "AddCIBCategory", data: "Category" },
      },
    ],
  },
  {
    button: "Content",
    items: [
      {
        featureid: "wtplus",
        hint: "Performs automated corrections that EditBOT does on the page",
        title: "Automated corrections",
        call: wtPlus,
        params: { action: "AutoUpdate" },
      },
      {
        featureid: "wikitableWizard",
        hint: "Create and/or edit wikitables",
        title: "Wikitable Wizard",
        call: createWikitableWizard,
        params: {},
      },
    ],
  },
  {
    button: "Misc",
    items: [
      {
        featureid: "wtplus",
        title: "Help",
        call: editToolbarWiki,
        params: { wiki: "Space:WikiTree_Plus_Chrome_Extension#On_Other_pages" },
      },
    ],
  },
];
