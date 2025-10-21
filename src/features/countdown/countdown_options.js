/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isSpacePage } from "../../core/pageType";

registerFeature({
  name: "Countdown",
  id: "countdown",
  description: "Add live countdown timers to space pages using simple HTML.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isSpacePage],
  options: [
    {
      id: "tickInterval",
      type: OptionType.NUMBER,
      label: "Update interval (milliseconds)",
      defaultValue: 1000,
      comment: "How often the countdown updates (1000 = every second)",
    },
    {
      id: "showLabels",
      type: OptionType.CHECKBOX,
      label: "Show countdown labels",
      defaultValue: true,
      comment: "Display the event title above the countdown",
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
  tickInterval: 1000,
  showLabels: true,
  padHours: true,
  compactMode: false,
  defaultCompleteText: "Event has arrived!",
  debug: true,
};
