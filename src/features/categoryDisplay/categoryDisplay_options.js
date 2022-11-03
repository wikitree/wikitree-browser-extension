import { registerFeature, OptionType } from "../../core/options/options_registry.js";

const categoryDisplay = {
  name: "Category Display",
  id: "categoryDisplay",
  description: "Allows you to move the location of categories to the top of the profile, or sidebar.",
  category: "Profile",
  defaultValue: false,
  options: [
    {
        id: "categoryPosition",
        type: OptionType.GROUP,
        label: "Select the location to display categories",
        options: [
            {
                id: "categoryLocation",
                type: OptionType.SELECT,
                label: "Category Location",
                values: [
                  {
                    value: "sidebar",
                    text: "Sidebar",
                  },
                  {
                    value: "top",
                    text: "Above Biography",
                  },
                  {
                    value: "default",
                    text: "Below Biography",
                  },
                ],
                defaultValue: "default",   
              },
        ]
    },
    {
      id: "categoryBorder",
      type: OptionType.GROUP,
      label: "Control the border on categories",
      options: [
        {
            id: "borderColor",
            type: OptionType.SELECT,
            label: "Border Color",
            values: [
                {
                    value: "none",
                    text: "No Border",
                },
                {
                    value: "gray",
                    text: "Gray Border",
                },
                {
                    value: "default",
                    text: "Green Border",
                },
                {
                    value: "orange",
                    text: "Orange Border",
                },
            ],
            defaultValue: "default",   
        },
      ]
    },
  ],
};

registerFeature(categoryDisplay);