import { wtPlus } from "../features/wt+/contentEdit";
import { editToolbarApp, editToolbarWiki } from "./editToolbar";
export default [
  {
    button: "Templates",
    items: [
      { featureid: "wtplus", title: "Edit Template", call: wtPlus, params: { action: "EditTemplate" } },
      { featureid: "wtplus", title: "Add any template", call: wtPlus, params: { action: "AddTemplate" } },
      {
        title: "Category templates",
        items: [
          { featureid: "wtplus", title: "Aka", call: wtPlus, params: { template: "Aka" } },
          { featureid: "wtplus", title: "Top Level", call: wtPlus, params: { template: "Top Level" } },
          {
            featureid: "wtplus",
            title: "Geographic Location",
            call: wtPlus,
            params: { template: "Geographic Location" },
          },
        ],
      },
      { featureid: "wtplus", title: "Format Template Params", call: wtPlus, params: { action: "AutoFormat" } },
    ],
  },
  {
    button: "CIB",
    items: [
      { featureid: "wtplus", title: "Cemetery", call: wtPlus, params: { template: "CategoryInfoBox Cemetery" } },
      { featureid: "wtplus", title: "Location", call: wtPlus, params: { template: "CategoryInfoBox Location" } },
      {
        featureid: "wtplus",
        title: "Add any CIB",
        call: wtPlus,
        params: { action: "AddTemplate", data: "CategoryInfoBox" },
      },
      {
        title: "Cemeteries",
        items: [
          { featureid: "wtplus", title: "Cemetery", call: wtPlus, params: { template: "CategoryInfoBox Cemetery" } },
          {
            featureid: "wtplus",
            title: "Cemetery Group",
            call: wtPlus,
            params: { template: "CategoryInfoBox CemeteryGroup" },
          },
        ],
      },
      {
        title: "Religion",
        items: [
          {
            featureid: "wtplus",
            title: "Religious Institution Group",
            call: wtPlus,
            params: { template: "CategoryInfoBox ReligiousInstitutionGroup" },
          },
        ],
      },
      {
        title: "Maintenance",
        items: [
          {
            featureid: "wtplus",
            title: "Maintenance",
            call: wtPlus,
            params: { template: "CategoryInfoBox Maintenance" },
          },
          { featureid: "wtplus", title: "Needs", call: wtPlus, params: { template: "CategoryInfoBox Needs" } },
          {
            featureid: "wtplus",
            title: "Needs GEDCOM Cleanup",
            call: wtPlus,
            params: { template: "CategoryInfoBox NeedsGEDCOMCleanup" },
          },
          {
            featureid: "wtplus",
            title: "Unconnected",
            call: wtPlus,
            params: { template: "CategoryInfoBox Unconnected" },
          },
          { featureid: "wtplus", title: "Unsourced", call: wtPlus, params: { template: "CategoryInfoBox Unsourced" } },
        ],
      },
      {
        title: "Others",
        items: [
          { featureid: "wtplus", title: "Location", call: wtPlus, params: { template: "CategoryInfoBox Location" } },
          { featureid: "wtplus", title: "Migration", call: wtPlus, params: { template: "CategoryInfoBox Migration" } },
          {
            featureid: "wtplus",
            title: "One Name Study",
            call: wtPlus,
            params: { template: "CategoryInfoBox OneNameStudy" },
          },
          {
            featureid: "wtplus",
            title: "One Place Study",
            call: wtPlus,
            params: { template: "CategoryInfoBox OnePlaceStudy" },
          },
          { featureid: "wtplus", title: "CategoryInfoBox", call: wtPlus, params: { template: "CategoryInfoBox" } },
        ],
      },
    ],
  },
  {
    button: "Content",
    items: [{ featureid: "wtplus", title: "Automated corrections", call: wtPlus, params: { action: "AutoUpdate" } }],
  },
  {
    button: "EditBOT",
    items: [
      { featureid: "wtplus", title: "Rename Category", call: wtPlus, params: { template: "Rename Category" } },
      { featureid: "wtplus", title: "Merge Category", call: wtPlus, params: { template: "Merge Category" } },
      { featureid: "wtplus", title: "Delete Category", call: wtPlus, params: { template: "Delete Category" } },
      { featureid: "wtplus", title: "Confirm for EditBOT", call: wtPlus, params: { action: "EditBOTConfirm" } },
    ],
  },
  {
    button: "Misc",
    items: [
      {
        featureid: "wtplus",
        title: "Help",
        call: editToolbarWiki,
        params: { wiki: "Space:WikiTree_Plus_Chrome_Extension#On_Category_pages" },
      },
    ],
  },
];
