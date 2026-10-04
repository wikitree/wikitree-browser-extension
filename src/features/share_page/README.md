# Share Page

Adds a **Share** button to WikiTree pages. The button opens a dialog where a member picks a social network, picks a
picture, edits the post and posts it. The post tags WikiTree's official account for that network and includes the brand
hashtags `#WhereGenealogistsCollaborate #CollaborativeGenealogy`.

The feature is off by default. Its option category is Global.

## Pages covered

| Page                                | Address                                                                | Link in the post                                             |
| ----------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| Profile                             | `/wiki/Robinson-27274`                                                 | The profile                                                  |
| Free-space, project, category, help | `/wiki/Space:…`, `/wiki/Project:…`, `/wiki/Category:…`, `/wiki/Help:…` | The page                                                     |
| Image page                          | `/photo/jpg/Robinson-27274`                                            | The image page                                               |
| Full-screen image                   | `/photo.php/4/49/Robinson-27274.jpg`                                   | The image page, rebuilt from the file name                   |
| Tree widget                         | `/treewidget/Robinson-27274/6`                                         | The widget                                                   |
| Tree Apps view                      | `/apps/Robinson-27274#name=…&view=…`                                   | The full address, including the `#` part that holds the view |

Other pages get no button. Where the button goes: the jump bar on profiles, after the page heading elsewhere, and a
floating button at the bottom right on pages with no heading (tree widgets, Tree Apps). A full-screen image gets the
floating button at the top right, because another feature already uses the bottom right there.

## The dialog

1. **Where to share.** Ten networks, each showing the account it tags.
2. **Picture.** The share card, then the photos found on the page. Select several to post them in order, up to the
   network's limit, or select none.
3. **Post text.** Editable, with a character count for the chosen network. Switching network swaps the account tag and
   keeps the member's edits. "Reset to suggested text" starts again.
4. **Post it.** The buttons depend on what the network allows (see below).

A preview on the right shows the post as it will look.

## Cropping a photo

When a photo is selected, a "Crop picture" panel opens for it (with a picker when two or more photos are selected, for
the one being cropped). The member chooses a shape, then which part of the picture shows:

- Shapes: Original (the default, nothing cropped), Wide 1.91:1 (the shape of a link preview), Square 1:1, Tall 4:5.
- A tall picture slides up and down, a wide one left and right. Drag the preview or use the slider (Top to Bottom, or
  Left to Right). If the picture already has the shape, there is nothing to move.
- The preview in the post, the grid and the saved picture all use the crop. A cropped picture is saved as
  `name-cropped.jpg` (or `.png` if the original is a PNG) at up to 2,400 pixels wide, and the share sheet gets the same
  file. The maths is `cropRect()` in `share_page_core.js`.

## Background script

`public/background.js` has one handler for this feature, `sharePageFetchImage`. The content script asks it for a
picture the page itself may not read, and it replies with the bytes as base64. It ignores the browser's cross-origin
rules, so it is strict about what it fetches: only `https` addresses on `wikitree.com` or its subdomains (a look-alike
such as `wikitree.com.example.net` is refused), only responses that are images, nothing larger than 3 MB, and a picture
that redirects to another site is refused. Requests to `apps.wikitree.com` carry an `appId`, because that host answers
requests without one with an empty page. No new permission is needed: the manifest already allows
`https://*.wikitree.com/*`. `background_fetch.test.js` runs the real `background.js` against these rules.

## Share card

A 1200 × 630 picture drawn on a canvas, so no screenshot and no extra permission is needed. It uses WikiTree's colours
(taken from the live site's header and footer, with the gold from the logo), Roboto, and the site's own logo file
(`/images/wikitree-logo-tagline.png`, loaded from the same address as the page so the picture can be saved). If Roboto or
the logo has not loaded, it falls back to Arial and the word "WikiTree".

On **profiles** the card shows the person's data fields (Born, Died, Parents, Spouse), a portrait, and a short life
summary:

- Everything is read from the page's own structured markup (`#Birth`, `#Death`, `#Parents`, `#Spouses`, `#Children`
  and `#pageData`), so it matches what the page shows.
- The summary is built from templates, not AI. It uses _he_ or _she_ only when the profile records a gender, and repeats
  the first name otherwise.
- The member can edit the summary in the dialog and the card redraws.
- It says nothing about someone who could still be living: no death year and born less than 110 years ago. Private
  children are skipped. This logic is in `lifeSummary()` in `share_page_core.js`.

**Help, project, free-space and category pages** get the page title, a short text, and for most of them a data field:

- Help, project and free-space pages: the opening sentences of the page's text (footnote markers removed, tables
  skipped, up to about 330 characters), and an "On this page" field with the first section names.
- Category pages: counts of subcategories, pages and person profiles, and a line inviting people to explore the category
  and check their connections to the ancestors in it.
- The member can edit the text in the dialog and the card redraws. The page's logo or badge images are not put on the
  card, because they crop badly; they stay available as pictures to choose.

**Tree Apps views** get the app's name (read from the page's `#view-title`, then the view selector, then the address, for
example "Fan Chart"), the person's name (from the page, or from the API), a short summary of what the view is showing, and
a picture of the chart as the member sees it.

- The summary is built when the dialog opens, so it follows the member's settings. A fan chart reads, for example, "A fan
  chart of Firman Joseph Robinson's ancestors over 5 generations. Each ring is one generation further back." (the number
  comes from the view's own generation counter, `#numGensInBBar`). Other views use their own description with the
  instructions dropped ("Click on…", "Use the wheel…"), or a plain sentence if there is none. The member can edit it,
  and the card redraws. See `appSummary()` in `share_page_core.js`.
- The link defaults to the person's profile, because Tree Apps views open only for people logged in to WikiTree. A
  checkbox switches to the view itself. While the box is ticked the post reads "Fan Chart for Firman Joseph Robinson on
  WikiTree. Explore their profile and family connections."; unticked it reads "Explore Fan Chart in WikiTree's Tree Apps
  for Firman Joseph Robinson." Text the member has edited keeps their words and only the address is swapped.
- The picture is taken from the largest SVG or canvas in `#view-container`. Tree Apps draw the chart after the people
  have loaded, so the capture first waits (up to 8 seconds) while `#view-loader` is showing or the drawing is still
  changing. The page's styles are copied onto a copy of the SVG, which is drawn first as it is (colours and text). Then
  the portraits are fetched, shrunk (JPEG photos stay JPEG) and embedded, because an SVG drawn on its own cannot load
  outside pictures. The version with portraits is used only if it came out at least as full as the plain one. The empty
  margin is trimmed so the chart gets the room. Portraits on the page's own site are fetched directly. Portraits from another WikiTree site, such as
  `apps.wikitree.com`, are blocked for the page, so they are fetched by the extension's background script (see below).
  A portrait that still cannot be fetched is left out rather than shown as a broken-image icon. Views that are plain text and
  tables get no picture.

Where the link goes is decided by the person in `#name=` in the address, then by the path.

**Image pages** have no card; the image is the picture.

Other pages with no summary get the title and a picture.

## Privacy

Before the button appears, the feature asks WikiTree's API (`WikiTreeAPI.getProfile`, app id `WBE_sharePage`) for the
page's `Privacy` and `IsLiving` fields. It applies to profiles, free-space pages, tree widgets, Tree Apps views (the
person in the address or `#name=`) and images whose file name is a profile ID.

- Public (50) and Open (60) can be shared. Levels 10 to 40 cannot.
- Anyone marked as living cannot, whatever the level.
- If the API cannot be reached, the button is not shown.
- The level is checked again when the button is clicked, because Tree Apps lets people move to another person without
  reloading the page.
- An image whose name is not a profile gets no check (no such profile exists).
- Categories, project and help pages have no privacy level and are not checked.

Levels 30 and 40 have a public biography, and level 40 a public tree, but the card summary and post draw on the data
fields, so they are left out. To allow them, change `isShareablePrivacy()` in `share_page_core.js`.

## What each network allows

| Network   | Tag                           | Button                                                                           |
| --------- | ----------------------------- | -------------------------------------------------------------------------------- |
| X         | `@WikiTreers`                 | Opens the composer with the text filled in                                       |
| Threads   | `@WikiTreers`                 | Opens the composer with the text filled in                                       |
| Bluesky   | `@wikitree.bsky.social`       | Opens the composer with the text filled in                                       |
| Mastodon  | `@wikitree@genealysis.social` | Opens the composer on the member's own server (option)                           |
| Reddit    | none                          | Opens a link post to r/wikitree. The text is the title, with no tags or hashtags |
| Facebook  | `@WikiTree`                   | Passes the link only. The member pastes the text                                 |
| LinkedIn  | `@WikiTree`                   | Passes the link only. The member pastes the text                                 |
| Instagram | `@WikiTreers`                 | No web composer. Copy the caption, save the picture, post in the app             |
| TikTok    | `@WikiTreers`                 | As Instagram                                                                     |
| YouTube   | `@WikiTreers`                 | As Instagram                                                                     |

No network accepts pictures through a link. The dialog saves them to the downloads folder, or opens the system share
sheet where the browser supports sharing files. Facebook and LinkedIn build the picture from the link preview. A plain
`@WikiTree` does not create a tag on Facebook or LinkedIn, so the dialog tells the member to retype the `@` and choose the
account from the list.

Character limits and picture counts are in `CHANNELS` in `share_page_core.js`. They are planning values to confirm.

## Options

| Option                                                                                        | Default         |
| --------------------------------------------------------------------------------------------- | --------------- |
| Channel selected when the dialog opens                                                        | Facebook        |
| Your Mastodon server (for example mastodon.social)                                            | mastodon.social |
| Add a short summary to the share card (life summary on profiles, opening text on other pages) | On              |
| Add the WikiTree hashtags to the post                                                         | On              |

## Files

| File                       | Purpose                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `share_page_core.js`       | Pure logic: page detection, post text, network list, composer links, life summary         |
| `share_page_core.test.js`  | Unit tests for the core module                                                            |
| `share_page.js`            | Button, dialog, share card drawing, reading the profile's data fields, copy and save      |
| `share_page.test.js`       | jsdom tests that open the dialog and click through it                                     |
| `background_fetch.test.js` | Runs `public/background.js` with a stand-in extension API to test the picture fetch rules |
| `share_page_options.js`    | Registers the feature and its options                                                     |
| `share_page.css`           | Dialog and button styles. Every class starts with `wbe-share`                             |

## Development

```bash
npm install
npx jest src/features/share_page   # tests for this feature
npm run build-dev                  # build, plus the undefined-globals, Safari and palette checks
```

Load the `dist` folder as an unpacked extension (see `docs/tutorial.md`), switch on **Share Page** in the options, and
visit a profile. The tests use jsdom, which has no canvas and does not load images, so the card drawing and the real
photo fetching are only checked by loading the extension.

## Open items

- **Chart capture.** Reading the chart from the page was written against the Tree Apps source (`#view-container`,
  `fanChartSVG`) and tested only on stand-in markup. Check each view in a logged-in browser. Photos drawn inside an SVG
  do not appear in the copy.
- **Browser coverage.** Check Save picture and the share sheet in Safari and Firefox. Safari handles downloads
  differently (see the WBE help page's known issues).
- **Network details.** Character limits, picture counts and the composer links can change. Re-check them before each
  release.
