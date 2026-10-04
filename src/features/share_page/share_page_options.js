/*
Created By: Azure Robinson (Robinson-27225)
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
  creators: [{ name: "Azure Robinson", wikitreeid: "Robinson-27225" }],
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
      label: "Add a short summary to the share card (a life summary on profiles, the opening text on other pages)",
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
