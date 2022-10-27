import { wtPlus } from "../features/wt+/contentEdit";
import { editToolbarApp, editToolbarWiki } from "./editToolbar";
export default [
  {
    button: "Sources",
    items: [{ featureid: "wtplus", title: "Paste sources", call: wtPlus, params: { action: "PasteSource" } }],
  },
  {
    button: "Templates",
    items: [
      { featureid: "wtplus", title: "Edit Template", call: wtPlus, params: { action: "EditTemplate" } },
      { featureid: "wtplus", title: "Add any template", call: wtPlus, params: { action: "AddTemplate" } },
      {
        featureid: "wtplus",
        title: "Add Project Box",
        call: wtPlus,
        params: { action: "AddTemplate", data: "Project Box" },
      },
      { featureid: "wtplus", title: "Add Sticker", call: wtPlus, params: { action: "AddTemplate", data: "Sticker" } },
      {
        featureid: "wtplus",
        title: "Add Research Note Box",
        call: wtPlus,
        params: { action: "AddTemplate", data: "Profile Box" },
      },
      {
        featureid: "wtplus",
        title: "Add External links",
        call: wtPlus,
        params: { action: "AddTemplate", data: "External Link" },
      },
      { featureid: "wtplus", title: "Format Template Params", call: wtPlus, params: { action: "AutoFormat" } },
    ],
  },
  {
    button: "Biography",
    items: [{ featureid: "wtplus", title: "Automated corrections", call: wtPlus, params: { action: "AutoUpdate" } }],
  },
  {
    button: "Misc",
    items: [
      {
        title: "WikiTree Apps",
        items: [
          {
            featureid: "wtplus",
            title: "DNA Confirmation",
            hint: "DNA Confirmation by Greg Clarke",
            call: editToolbarApp,
            params: { app: "clarke11007/DNAconf.php" },
          },
          {
            featureid: "wtplus",
            title: "Ancestry Citation",
            hint: "Ancestry Citation by Greg Clarke",
            call: editToolbarApp,
            params: { app: "clarke11007/ancite.php" },
          },
          {
            featureid: "wtplus",
            title: "Drouin Citer",
            hint: "Drouin Citer by Greg Clarke",
            call: editToolbarApp,
            params: { app: "clarke11007/drouinCite.php" },
          },
          {
            featureid: "wtplus",
            title: "Surnames Generator",
            hint: "Surnames Generator by Greg Clarke",
            call: editToolbarApp,
            params: { app: "clarke11007/surnames.php" },
          },
          {
            featureid: "wtplus",
            title: "Riksarkivet SVAR sources",
            hint: "Riksarkivet SVAR sources by Maria Lundholm",
            call: editToolbarApp,
            params: { app: "lundholm24/ref-making/ra-ref.php" },
          },
          {
            featureid: "wtplus",
            title: "Arkiv Digital sources",
            hint: "Arkiv Digital sources by Maria Lundholm",
            call: editToolbarApp,
            params: { app: "lundholm24/ref-making/ad-ref.php" },
          },
          {
            featureid: "wtplus",
            title: "Sveriges Dödbok sources",
            hint: "Sveriges Dödbok sources by Maria Lundholm",
            call: editToolbarApp,
            params: { app: "lundholm24/ref-making/sdb-ref.php" },
          },
          {
            featureid: "wtplus",
            title: "Biography Generator",
            hint: "Biography Generator (for Open pr.) by Greg Shipley",
            call: editToolbarApp,
            params: { app: "shipley1223/Bio.html" },
          },
          {
            title: "Other Apps",
            items: [
              {
                featureid: "wtplus",
                title: "Bio Check",
                hint: "Bio Check by Kay Knight",
                call: editToolbarApp,
                params: { app: "sands1865/biocheck/" },
              },
              {
                featureid: "wtplus",
                title: "Fan Chart",
                hint: "Fan Chart by Greg Clarke",
                call: editToolbarApp,
                params: { app: "clarke11007/fan.php" },
              },
            ],
          },
        ],
      },
      {
        featureid: "wtplus",
        title: "Help",
        call: editToolbarWiki,
        params: { wiki: "Space:WikiTree_Plus_Chrome_Extension#On_Profile_pages" },
      },
    ],
  },
];
