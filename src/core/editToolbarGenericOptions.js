import { wtPlus } from "../features/wt+/contentEdit";
import { editToolbarApp, editToolbarWiki } from "./editToolbar";
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
    button: "Content",
    items: [{ featureid: "wtplus", title: "Automated corrections", call: wtPlus, params: { action: "AutoUpdate" } }],
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
