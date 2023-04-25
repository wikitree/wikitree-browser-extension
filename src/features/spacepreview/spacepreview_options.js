/*
 * Created By: Steve Harris (Harris-5439)
 * Contributor: Jonathan Duke (Duke-5773)
 */

import { registerFeature, OptionType } from "../../core/options/options_registry";

const pagePreviewFeature = {
  name: "Space Page Previews",
  id: "spacePreviews", // keep ID the same to preserve configuration
  description: "Enable previews of Space Pages on hover.",
  category: "Global",
  creators: [{ name: "Steve Harris", wikitreeid: "Harris-5439" }],
  contributors: [{ name: "Jonathan Duke", wikitreeid: "Duke-5773" }],
  defaultValue: false,
  pages: [true],
};

registerFeature(pagePreviewFeature);
