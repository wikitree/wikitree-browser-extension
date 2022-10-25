import { wtPlus } from "../features/wt+/contentEdit";
import { editToolbarApp, editToolbarWiki } from "./editToolbar";
export default [
  {
    button: "Templates",
    items: [
      { featureid: "wtplus", title: "Format Parameters", call: wtPlus, params: { action: "AutoFormat" } },
      { featureid: "wtplus", title: "Edit Template", call: wtPlus, params: { action: "EditTemplate" } },
      { featureid: "wtplus", title: "Add TemplateParam", call: wtPlus, params: { template: "TemplateParam" } },
      { featureid: "wtplus", title: "Add Documentation", call: wtPlus, params: { template: "Documentation" } },
      {
        title: "Add Base Templates",
        items: [
          { featureid: "wtplus", title: "Project Box", call: wtPlus, params: { template: "Project Box" } },
          { featureid: "wtplus", title: "Sticker", call: wtPlus, params: { template: "Sticker" } },
          { featureid: "wtplus", title: "Research Note Box", call: wtPlus, params: { template: "Research Note Box" } },
        ],
      },
      {
        title: "Add Other Templates",
        items: [
          {
            featureid: "wtplus",
            title: "Project Box Instructions",
            call: wtPlus,
            params: { template: "Project Box Instructions" },
          },
        ],
      },
      { featureid: "wtplus", title: "Add any template", call: wtPlus, params: { action: "AddTemplate" } },
    ],
  },
  {
    button: "Misc",
    items: [
      {
        featureid: "wtplus",
        title: "Help",
        call: editToolbarWiki,
        params: { wiki: "Space:WikiTree_Plus_Chrome_Extension#On_Template_pages" },
      },
    ],
  },
];
