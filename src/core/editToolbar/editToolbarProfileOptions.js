/*
Created By: Aleš Trtnik (Trtnik-2)
*/
import { generateBio } from "../../features/auto_bio/auto_bio";
import { addAutoCategories } from "../../features/auto_categories/auto_categories";
import { getFamilyList } from "../../features/family_lists/family_lists";
import { wtPlus } from "../../features/wtPlus/wtPlus";
import { editToolbarApp, editToolbarWiki } from "./editToolbar";
import { createWikitableWizard } from "../../features/wikitable_wizard/wikitable_wizard";
export default [
  {
    button: "Sources",
    items: [
      {
        featureid: "wtplus",
        title: "Paste sources",
        hint: "Opens Paste dialog where sources can be pasted and reformated for some standard sites (FindaGrave, FamillySearch,...).",
        call: wtPlus,
        params: { action: "PasteSource" },
      },
    ],
  },
  {
    button: "Templates",
    items: [
      {
        featureid: "wtplus",
        title: "Edit Template",
        hint: "Edit template fields for template under cursor.",
        call: wtPlus,
        params: { action: "EditTemplate" },
      },
      {
        featureid: "wtplus",
        title: "Add any template",
        hint: "Adds any template using search and also edit all template fields.",
        call: wtPlus,
        params: { action: "AddTemplate" },
      },
      {
        featureid: "wtplus",
        title: "Add Project Box",
        hint: "Adds Project Box template using search and also edit all template fields.",
        call: wtPlus,
        params: { action: "AddTemplate", data: "Project Box" },
      },
      {
        featureid: "wtplus",
        title: "Add Sticker",
        hint: "Adds Sticker template using search and also edit all template fields.",
        call: wtPlus,
        params: { action: "AddTemplate", data: "Sticker" },
      },
      {
        featureid: "wtplus",
        title: "Add Research Note Box",
        hint: "Adds Research Note Box template using search and also edit all template fields.",
        call: wtPlus,
        params: { action: "AddTemplate", data: "Profile Box" },
      },
      {
        featureid: "wtplus",
        title: "Add External links",
        hint: "Adds External links template using search and also edit all template fields.",
        call: wtPlus,
        params: { action: "AddTemplate", data: "External Link" },
      },
      {
        featureid: "wtplus",
        title: "Format Template Params",
        hint: "Reformats template parameters with just the necessary spaces.",
        call: wtPlus,
        params: { action: "AutoFormat" },
      },
    ],
  },
  {
    button: "Categories",
    items: [
      {
        featureid: "wtplus",
        title: "Add any Category",
        hint: "Add any category using search for words in name and parent categories.",
        call: wtPlus,
        params: { action: "AddCIBCategory", data: "Category" },
      },
      {
        featureid: "wtplus",
        title: "Add Location Category",
        hint: "Add location category using search for words in name and parent categories.",
        call: wtPlus,
        params: { action: "AddCIBCategory", data: "Location" },
      },
      {
        featureid: "wtplus",
        title: "Add Cemetery Category",
        hint: "Add cemetery category using search for words in name, parent, location and aka names.",
        call: wtPlus,
        params: { action: "AddCIBCategory", data: "Cemetery" },
      },
      {
        featureid: "wtplus",
        title: "Add One Name Study Category",
        hint: "Add name study category using search for words in name, variations, parent and location.",
        call: wtPlus,
        params: { action: "AddCIBCategory", data: "NameStudy" },
      },
      {
        featureid: "autoCategories",
        hint: "Add categories to the profile based on the available data",
        title: "Auto Categories",
        call: addAutoCategories,
        params: {},
      },
    ],
  },
  {
    button: "Biography",
    items: [
      {
        featureid: "autoBio",
        hint: "Generate a biography from the profile data and current biography",
        title: "Auto Bio",
        call: generateBio,
        params: {},
      },
      {
        featureid: "wtplus",
        hint: "Performs automated corrections that EditBOT does on the page",
        title: "Automated corrections",
        call: wtPlus,
        params: { action: "AutoUpdate" },
      },
      {
        featureid: "familyLists",
        hint: "Generate a narrative for birth and parent details",
        title: "Birth and Parent Details",
        call: getFamilyList,
        params: { functionName: "birthAndParents" },
      },
      {
        featureid: "familyLists",
        hint: "Generate a narrative for death details",
        title: "Death Details",
        call: getFamilyList,
        params: { functionName: "death" },
      },
      {
        featureid: "familyLists",
        hint: "Generate a list of siblings",
        title: "Sibling List",
        call: getFamilyList,
        params: { functionName: "siblingList" },
      },
      {
        featureid: "familyLists",
        hint: "Generate a list of spouses and their children",
        title: "Spouse and Child Details",
        call: getFamilyList,
        params: { functionName: "spouseChildList" },
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
        hint: "Opens WikiTree+ help page",
        call: editToolbarWiki,
        params: { wiki: "Space:WikiTree_Plus_Chrome_Extension#On_Profile_pages" },
      },
    ],
  },
];
