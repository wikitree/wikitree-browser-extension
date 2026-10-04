/*
Created By: TODO author name (TODO WikiTree ID)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isMainDomain } from "../../core/pageType";
import { CHANNELS } from "./share_page_core";

registerFeature({
  name: "Share Page",
  id: "sharePage",
  description:
    "Adds a Share button to profiles, free-space, project, category and help pages, image pages, tree widgets and Tree Apps views. Opens a dialog to post to social media with WikiTree's accounts tagged and the brand hashtags added.",
  category: "Global",
  creators: [{ name: "TODO author name", wikitreeid: "TODO" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
  options: [
    {
      id: "defaultChannel",
      type: OptionType.SELECT,
      label: "Channel selected when the dialog opens",
      defaultValue: "facebook",
      values: CHANNELS.map((c) => ({ value: c.id, text: c.name })),
    },
    {
      id: "mastodonInstance",
      type: OptionType.TEXT,
      label: "Your Mastodon server (for example mastodon.social)",
      defaultValue: "mastodon.social",
    },
    {
      id: "cardSummary",
      type: OptionType.CHECKBOX,
      label: "Add a short life summary to the share card on profiles",
      defaultValue: true,
    },
    {
      id: "includeHashtags",
      type: OptionType.CHECKBOX,
      label: "Add the WikiTree hashtags to the post",
      defaultValue: true,
    },
  ],
});
