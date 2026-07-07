import { buildTreeAppRecommendations } from "./chat_tree_apps";

describe("chat_tree_apps", () => {
  test("builds ancestor recommendations with expected URLs", () => {
    expect(buildTreeAppRecommendations("ancestors", "Smith-123")).toEqual([
      {
        label: "Super Tree",
        url: "https://www.wikitree.com/apps/Smith-123#name=Smith-123&view=superbig",
      },
      {
        label: "Slippy Tree",
        url: "https://www.wikitree.com/apps/Smith-123#name=Smith-123&view=slippyTree",
      },
      {
        label: "Ahnentafel Ancestor List",
        url: "https://www.wikitree.com/apps/Smith-123#name=Smith-123&view=ahnentafel",
      },
      {
        label: "Ancestor Lines Explorer",
        url: "https://www.wikitree.com/apps/Smith-123#name=Smith-123&view=ale",
      },
      {
        label: "Compact Couple Ancestors",
        url: "https://www.wikitree.com/apps/Smith-123#name=Smith-123&view=cctree",
      },
      {
        label: "Fan Chart",
        url: "https://www.wikitree.com/apps/Smith-123#name=Smith-123&view=fanchart",
      },
      {
        label: "Ancestor Explorer",
        url: "https://apps.wikitree.com/apps/ashley1950/ancestorexplorer/?id=Smith-123",
      },
    ]);
  });

  test("builds cc7 and descendant recommendations", () => {
    expect(buildTreeAppRecommendations("cc7", "Jones-456")).toEqual([
      {
        label: "CC7 Views",
        url: "https://www.wikitree.com/apps/Jones-456#name=Jones-456&view=cc7",
      },
    ]);

    expect(buildTreeAppRecommendations("descendants", "Jones-456")).toEqual([
      {
        label: "Super Tree",
        url: "https://www.wikitree.com/apps/Jones-456#name=Jones-456&view=superbig",
      },
      {
        label: "Slippy Tree",
        url: "https://www.wikitree.com/apps/Jones-456#name=Jones-456&view=slippyTree",
      },
      {
        label: "Descendants",
        url: "https://www.wikitree.com/apps/Jones-456#name=Jones-456&view=descendants",
      },
      {
        label: "Compact Couple Descendants",
        url: "https://www.wikitree.com/apps/Jones-456#name=Jones-456&view=ccdtree",
      },
    ]);
  });

  test("returns no recommendations without a WTID", () => {
    expect(buildTreeAppRecommendations("ancestors", "")).toEqual([]);
  });
});
