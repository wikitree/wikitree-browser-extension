/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isSpacePage, isProjectPage } from "../../core/pageType";

registerFeature({
  name: "Countdown",
  id: "countdown",
  description: "Add live countdown timers to space pages and project pages using simple HTML.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isSpacePage, isProjectPage],
  options: [
    {
      id: "updateFrequency",
      type: OptionType.SELECT,
      label: "Update frequency",
      defaultValue: "second",
      comment: "How often the countdown updates",
      values: [
        { value: "second", text: "Every second" },
        { value: "minute", text: "Every minute" },
      ],
    },
    {
      id: "padHours",
      type: OptionType.CHECKBOX,
      label: "Pad hours with zeros",
      defaultValue: true,
      comment: "Show hours as 01h instead of 1h",
    },
    {
      id: "compactMode",
      type: OptionType.CHECKBOX,
      label: "Use compact display",
      defaultValue: false,
      comment: "Use a smaller countdown design for tight spaces",
    },
  ],
});

export const countdownDefaults = {
  updateFrequency: "second",
  showLabels: true, // Always true now, not user-configurable
  padHours: true,
  compactMode: false,
  defaultCompleteText: "Event has arrived!",
  debug: true,
};
