import { registerFeature, OptionType } from "../../core/options/options_registry.js";

const redirExtLinksFeature = {
  name: "Redirect External Links",
  id: "redirExtLinks",
  description: "Updates links to external sites to point to user desired domains.",
  category: "Profile",
  options: [
    {
      id: "ancestryOldLinks",
      type: OptionType.CHECKBOX,
      label: "If there are old Ancestry link formats that no longer work, redirect to the new format",
      defaultValue: false,
    },
    {
      id: "ancestryDomain",
      type: OptionType.SELECT,
      label: "Locally change Ancestry links to use this domain",
      values: [
        { value: "none", text: "Do not modify" },
        { value: "ancestry.com", text: "ancestry.com" },
        { value: "ancestry.co.uk", text: "ancestry.co.uk" },
        { value: "ancestry.ca", text: "ancestry.ca" },
        { value: "ancestry.com.au", text: "ancestry.com.au" },
        { value: "ancestry.de", text: "ancestry.de" },
        { value: "ancestry.it", text: "ancestry.it" },
        { value: "ancestry.fr", text: "ancestry.fr" },
        { value: "ancestry.se", text: "ancestry.se" },
        { value: "ancestry.mx", text: "ancestry.mx" },
        { value: "ancestrylibrary.com", text: "ancestrylibrary.com" },
        { value: "ancestrylibraryedition.co.uk", text: "ancestrylibraryedition.co.uk" },
        { value: "ancestrylibrary.ca", text: "ancestrylibrary.ca" },
        { value: "ancestrylibrary.com.au", text: "ancestrylibrary.com.au" },
      ],
      defaultValue: "none",
    },
    {
      id: "fmpDomain",
      type: OptionType.SELECT,
      label: "Locally change FindMyPast links to use this domain",
      values: [
        { value: "none", text: "Do not modify" },
        { value: "findmypast.com", text: "findmypast.com" },
        { value: "findmypast.co.uk", text: "findmypast.co.uk" },
        { value: "findmypast.ie", text: "findmypast.ie" },
        { value: "findmypast.com.au", text: "findmypast.com.au" },
      ],
      defaultValue: "none",
    },
  ],
};

registerFeature(redirExtLinksFeature);
