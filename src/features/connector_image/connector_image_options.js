/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature } from "../../core/options/options_registry";
import { isProfilePage } from "../../core/pageType";

registerFeature({
  name: "Connector Image",
  id: "connectorImage",
  description:
    "Gives you a Connector jigsaw puzzle symbol (as used by the Connectors Project) " +
    "in the header of a profile page if the profile is not " +
    "connected to the big tree. ",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfilePage],
});
