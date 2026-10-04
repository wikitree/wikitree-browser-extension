/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isMainDomain } from "../../core/pageType";
import { sharedAiOptionGroup } from "../../core/options/shared_ai_options";

registerFeature({
  name: "Genie",
  id: "chat",
  description:
    "Genie gives you two ways to explore WikiTree. Search mode lets you use simple keywords and filters to find profiles and run WikiTree+ queries. Chat mode connects to your preferred AI to answer questions about the profile you're viewing, WikiTree in general, or anything else.",
  category: "Global",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isMainDomain],
  options: [
    sharedAiOptionGroup("Auto Bio"),
    {
      id: "showResultsInTable",
      type: OptionType.CHECKBOX,
      label: "Open structured results in a DataTable",
      defaultValue: false,
      comment: "When available, Genie will show result sets in a searchable, sortable table.",
    },
    {
      id: "allowAiFallback",
      type: OptionType.CHECKBOX,
      label: "Allow AI fallback for unmatched prompts",
      defaultValue: true,
      comment: "If disabled, prompts that don't match local tools stay local and are not sent to an AI provider.",
    },
  ],
});
