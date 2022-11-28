import { registerFeature, OptionType } from "../../core/options/options_registry";

registerFeature({
  name: "Extra Watchlist",
  id: "extraWatchlist",
  description: "Gives you an extra watchlist. Add to it by clicking the + button. View it with the binoculars button.",
  category: "Global",
  defaultValue: true,
  options: [
    {
      id: "sortBy",
      type: OptionType.RADIO,
      label: "Sort by",
      values: [
        {
          value: "ID",
          text: "ID",
        },
        {
          value: "Name",
          text: "Name",
        },
        {
          value: "Changed",
          text: "Changed",
        },
        {
          value: "None",
          text: "None",
        },
      ],
      defaultValue: "Changed",
    },
  ],
});
