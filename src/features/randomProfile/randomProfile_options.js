import { registerFeature, OptionType } from "../../core/options/options_registry.js";

const randomProfileFeature = {
  name: "Random Profile",
  id: "randomProfile",
  description: "Adds a Random Profile link to the Find menu.",
  category: "Global",
  defaultValue: true,
  options: [
    {
      id: "country",
      type: OptionType.SELECT,
      label: "Country, State, or Province",
      values: [
        {
          value: "any",
          text: "Any",
        },
        {
          value: "Alabama",
          text: "Alabama",
        },
        {
          value: "Arkansas",
          text: "Arkansas",
        },
        {
          value: "Australia",
          text: "Australia",
        },
        {
          value: "Austria",
          text: "Austria",
        },
        {
          value: "California",
          text: "California",
        },
        {
          value: "Canada",
          text: "Canada",
        },
        {
          value: "Colorado",
          text: "Colorado",
        },
        {
          value: "Connecticut",
          text: "Connecticut",
        },
        {
          value: "England",
          text: "England",
        },
        {
          value: "Florida",
          text: "Florida",
        },
        {
          value: "France",
          text: "France",
        },
        {
          value: "Georgia",
          text: "Georgia",
        },
        {
          value: "Germany, Deutschland",
          text: "Germany, Deutschland",
        },
        {
          value: "Illinois",
          text: "Illinois",
        },
        {
          value: "Indiana",
          text: "Indiana",
        },
        {
          value: "Iowa",
          text: "Iowa",
        },
        {
          value: "Ireland",
          text: "Ireland",
        },
        {
          value: "Italy, Italia",
          text: "Italy, Italia",
        },
        {
          value: "Kansas",
          text: "Kansas",
        },
        {
          value: "Kentucky",
          text: "Kentucky",
        },
        {
          value: "Louisiana",
          text: "Louisiana",
        },
        {
          value: "Maine",
          text: "Maine",
        },
        {
          value: "Maryland",
          text: "Maryland",
        },
        {
          value: "Massachusetts",
          text: "Massachusetts",
        },
        {
          value: "Massachusetts Bay",
          text: "Massachusetts Bay",
        },
        {
          value: "Mexico",
          text: "Mexico",
        },
        {
          value: "Michigan",
          text: "Michigan",
        },
        {
          value: "Minnesota",
          text: "Minnesota",
        },
        {
          value: "Mississippi",
          text: "Mississippi",
        },
        {
          value: "Missouri",
          text: "Missouri",
        },
        {
          value: "Netherlands, Nederland",
          text: "Netherlands, Nederland",
        },
        {
          value: "New Brunswick",
          text: "New Brunswick",
        },
        {
          value: "New Jersey",
          text: "New Jersey",
        },
        {
          value: "North Carolina",
          text: "North Carolina",
        },
        {
          value: "Nova Scotia",
          text: "Nova Scotia",
        },
        {
          value: "Nebraska",
          text: "Nebraska",
        },
        {
          value: "New Hampshire",
          text: "New Hampshire",
        },
        {
          value: "New South Wales",
          text: "New South Wales",
        },
        {
          value: "New York",
          text: "New York",
        },
        {
          value: "New Zealand",
          text: "New Zealand",
        },
        {
          value: "Norway, Norge",
          text: "Norway, Norge",
        },
        {
          value: "Ohio",
          text: "Ohio",
        },
        {
          value: "Ontario",
          text: "Ontario",
        },
        {
          value: "Oklahoma",
          text: "Oklahoma",
        },
        {
          value: "Oregon",
          text: "Oregon",
        },
        {
          value: "Pennsylvania",
          text: "Pensylvania",
        },
        {
          value: "Quebec",
          text: "Quebec",
        },
        {
          value: "Queensland",
          text: "Queensland",
        },
        {
          value: "Rhode Island",
          text: "Rhode Island",
        },
        {
          value: "Russia",
          text: "Russia",
        },
        {
          value: "Scotland",
          text: "Scotland",
        },
        {
          value: "South Africa, Suid-Afrika",
          text: "South Africa, Suid-Afrika",
        },
        {
          value: "South Australia",
          text: "South Australia",
        },
        {
          value: "South Carolina",
          text: "South Carolina",
        },
        {
          value: "Sweden, Sverige",
          text: "Sweden, Sverige",
        },
        {
          value: "Tennessee",
          text: "Tennessee",
        },
        {
          value: "Texas",
          text: "Texas",
        },
        {
          value: "United Kingdom, UK",
          text: "United Kingdom, UK",
        },
        {
          value: "United States, USA",
          text: "United States, USA",
        },
        {
          value: "Utah",
          text: "Utah",
        },
        {
          value: "Vermont",
          text: "Vermont",
        },
        {
          value: "Victoria",
          text: "Victoria",
        },
        {
          value: "Virginia",
          text: "Virginia",
        },
        {
          value: "Wales",
          text: "Wales",
        },
        {
          value: "Washington",
          text: "Washington",
        },
        {
          value: "West Virginia",
          text: "West Virginia",
        },
        {
          value: "Wisconsin",
          text: "Wisconsin",
        },
      ],
      defaultValue: "any",
    },
  ],
};

registerFeature(randomProfileFeature);
