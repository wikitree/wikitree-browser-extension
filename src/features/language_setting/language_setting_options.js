/*
 * Created By: Ian Beacall (Beacall-6)
 */

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfileAddRelative, isAddUnrelatedPerson } from "../../core/pageType";

const languageSettingFeature = {
  name: "Language Setting",
  id: "languageSetting",
  description: "Remembers your choice of language and automatically selects it on Add Person pages.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfileAddRelative, isAddUnrelatedPerson],
  options: [
    {
      id: "language",
      type: OptionType.SELECT,
      label: "Default Language for Location Suggestions",
      values: [
        { value: "", text: "" },
        { value: "sq", text: "Albanian" },
        { value: "ar", text: "Arabic" },
        { value: "be", text: "Belarusian" },
        { value: "ca", text: "Catalan" },
        { value: "zh", text: "Chinese" },
        { value: "hr", text: "Croatian" },
        { value: "cs", text: "Czech" },
        { value: "da", text: "Danish" },
        { value: "nl", text: "Dutch/Flemish" },
        { value: "en", text: "English" },
        { value: "et", text: "Estonian" },
        { value: "fi", text: "Finnish" },
        { value: "fr", text: "French" },
        { value: "de", text: "German" },
        { value: "iw", text: "Hebrew" },
        { value: "hu", text: "Hungarian" },
        { value: "is", text: "Icelandic" },
        { value: "in", text: "Indonesian" },
        { value: "ga", text: "Irish" },
        { value: "it", text: "Italian" },
        { value: "ja", text: "Japanese" },
        { value: "ko", text: "Korean" },
        { value: "lv", text: "Latvian" },
        { value: "lt", text: "Lithuanian" },
        { value: "mk", text: "Macedonian" },
        { value: "ms", text: "Malay" },
        { value: "mt", text: "Maltese" },
        { value: "el", text: "Modern Greek" },
        { value: "no", text: "Norwegian" },
        { value: "pl", text: "Polish" },
        { value: "pt", text: "Portuguese" },
        { value: "ro", text: "Romanian" },
        { value: "ru", text: "Russian" },
        { value: "sr", text: "Serbian" },
        { value: "sk", text: "Slovak" },
        { value: "sl", text: "Slovenian" },
        { value: "es", text: "Spanish" },
        { value: "sv", text: "Swedish" },
        { value: "th", text: "Thai" },
        { value: "tr", text: "Turkish" },
        { value: "uk", text: "Ukrainian" },
        { value: "vi", text: "Vietnamese" },
        { value: "other", text: "Other" },
      ],
      defaultValue: "",
    },
    {
      id: "changeDefaultFromSelect",
      type: OptionType.CHECKBOX,
      label: "Change the default each time you choose a different language on an Add Person page.",
      defaultValue: true,
    },
  ],
};

registerFeature(languageSettingFeature);
