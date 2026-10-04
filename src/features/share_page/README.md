# Share Page

Creator: Azure Robinson (Robinson-27225)

Adds a **Share** button to WikiTree pages. The button opens a dialog where a member picks a social network, picks and crops
a picture, edits the post and posts it. The post tags WikiTree's official account for that network and includes the
brand hashtags `#WhereGenealogistsCollaborate #CollaborativeGenealogy`.

The feature is off by default. Its option category is Global.

## Pages covered

| Page                                | Address                                                                | Link in the post                                             |
| ----------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| Profile                             | `/wiki/Robinson-27274`                                                 | The profile                                                  |
| Free-space, project, category, help | `/wiki/Space:…`, `/wiki/Project:…`, `/wiki/Category:…`, `/wiki/Help:…` | The page                                                     |
| Image page                          | `/photo/jpg/Robinson-27274`                                            | The image page                                               |
| Full-screen image                   | `/photo.php/4/49/Robinson-27274.jpg`                                   | The image page, rebuilt from the file name                   |
| Tree widget                         | `/treewidget/Robinson-27274/6`                                         | The widget                                                   |
| Tree Apps view                      | `/apps/Robinson-27274#name=…&view=…`                                   | The person's profile by default, or the view (see Tree Apps) |

Other pages get no button.

**Where the button goes:** the jump bar on profiles, after the page heading elsewhere, and a floating button at the
bottom right on pages with no heading (tree widgets, Tree Apps). A full-screen image gets the floating button at the top
right, because another feature already uses the bottom right there.

## Who can be shared

Before the button appears, the feature asks WikiTree's API (`WikiTreeAPI.getProfile`, app id `WBE_sharePage`) for the
page's `Privacy` and `IsLiving` fields. This covers profiles, free-space pages, tree widgets, Tree Apps views (the person
in `#name=` in the address, then the path) and images whose file name is a profile ID.

- Public (50) and Open (60) can be shared. Levels 10 to 40 cannot.
- Anyone marked as living cannot, whatever the level.
- If the API cannot be reached, the button is not shown.
- The level is checked again when the button is clicked, because Tree Apps lets people move to another person without
  reloading the page. If it fails then, a short message appears and the dialog does not open.
- An image whose name is not a profile gets no check, since no such profile exists. Categories, project and help pages
  have no privacy level and are not checked.

Levels 30 and 40 have a public biography, and level 40 a public tree, but the card and post draw on the data fields, so
they are left out. To allow them, change `isShareablePrivacy()` in `share_page_core.js`.

## The dialog

1. **Where to share.** Ten networks, each showing the account it tags.
2. **Picture.** The share card, then the photos found on the page. Select several to post them in order, up to the
   network's limit, or select none. Selecting a photo opens the crop panel for it (below). A box edits the text on the
   share card.
3. **Post text.** Editable, with a character count for the chosen network. Switching network swaps the account tag and
   keeps the member's edits. "Reset to suggested text" starts again.
4. **Post it.** The buttons depend on what the network allows (see below).

A preview on the right shows the post as it will look. The dialog is keyboard accessible: Tab stays inside it, and Escape
closes it.

## Share card

A 1200 × 630 picture drawn on a canvas, so no screenshot and no extra permission is needed. It uses WikiTree's colours
(taken from the live site's header and footer, with the gold from the logo), Roboto, and the site's own logo file
(`/images/wikitree-logo-tagline.png`, loaded from the same address as the page so the picture can be saved). If Roboto or
the logo has not loaded, it falls back to Arial and the word "WikiTree". The footer reads "WikiTree.com" and "The FREE
Family Tree".

**Profiles** show the person's data fields (Born, Died, Parents, Spouse, with every parent and spouse name in bold), a
portrait, and a short life summary:

- Everything is read from the page's own structured markup (`#Birth`, `#Death`, `#Parents`, `#Spouses`, `#Children`
  and `#pageData`), so it matches what the page shows.
- The summary is built from templates, not AI. It uses _he_ or _she_ only when the profile records a gender, and repeats
  the first name otherwise.
- It says nothing about someone who could still be living: no death year and born less than 110 years ago. Private
  children are skipped. See `lifeSummary()` in `share_page_core.js`.

**Help, project and free-space pages** show the title, the opening sentences of the page's text (footnote markers removed,
tables skipped, up to about 330 characters) and an "On this page" field with the first section names.

**Category pages** show counts of subcategories, pages and person profiles, and a line inviting people to explore the
category and check their connections to the ancestors in it.

For all of these the member can edit the text in the dialog and the card redraws. The page's own logo or badge images are
not put on these cards, because they crop badly; they stay available as pictures to choose.

**Tree Apps views** show the app's name (from the page's `#view-title`, then the view selector, then the address, for
example "Fan Chart"), the person's name (from the page, or from the API), a short summary of what the view is showing,
and a picture of the chart as the member sees it.

- The summary is built when the dialog opens, so it follows the member's settings. A fan chart reads, for example, "A fan
  chart of Firman Joseph Robinson's ancestors over 5 generations. Each ring is one generation further back." (the number
  comes from the view's own generation counter, `#numGensInBBar`). Other views use their own description with the
  instructions dropped ("Click on…", "Use the wheel…"), or a plain sentence if there is none. See `appSummary()`.
- The picture is taken from the largest SVG or canvas in `#view-container`. Tree Apps draw the chart after the people
  have loaded, so the capture first waits (up to 8 seconds) while `#view-loader` is showing or the drawing is still
  changing. The page's styles are copied onto a copy of the SVG (for the names, dates and portraits inside
  `foreignObject` boxes, their sizes and spacing too), which is drawn first as it is (colours and text). Then the
  portraits, whether SVG `<image>` elements or HTML `<img>` tags as the fan chart uses, are fetched, shrunk (JPEG photos
  stay JPEG) and embedded, because an SVG drawn on its own cannot load outside pictures. The version with portraits is used only if it came out at least as full as the plain one. The empty
  margin is trimmed so the chart gets the room. A portrait that cannot be fetched is left out rather than shown as a
  broken-image icon. Views that are plain text and tables get no picture.

**Image pages** have no card; the image is the picture.

## Tree Apps links

Tree Apps views open only for people logged in to WikiTree; anyone else sees the login page. So the link defaults to the
person's profile, which anyone can open, and the post reads "Fan Chart for Firman Joseph Robinson on WikiTree. Explore
their profile and family connections." A checkbox, "Link to the person's profile instead, so anyone can open it", switches
to the view itself. Unticked, the post reads "Explore Fan Chart in WikiTree's Tree Apps for Firman Joseph Robinson." and a
note explains the login. Text the member has edited keeps their words, and only the address is swapped.

## Cropping a photo

When a photo is selected, a "Crop picture" panel opens for it (with a picker when two or more photos are selected, for
the one being cropped). The member chooses a shape, then which part of the picture shows:

- Shapes: Original (the default, nothing cropped), Wide 1.91:1 (the shape of a link preview), Square 1:1, Tall 4:5.
- A tall picture slides up and down, a wide one left and right. Drag the preview or use the slider (Top to Bottom, or
  Left to Right). If the picture already has the shape, there is nothing to move.
- The preview in the post, the grid and the saved picture all use the crop. A cropped picture is saved as
  `name-cropped.jpg` (or `.png` if the original is a PNG) at up to 2,400 pixels wide, and the share sheet gets the same
  file. The maths is `cropRect()` in `share_page_core.js`.

## What each network allows

| Network   | Tag                           | Characters | Pictures | Button                                                                           |
| --------- | ----------------------------- | ---------- | -------- | -------------------------------------------------------------------------------- |
| X         | `@WikiTreers`                 | 280        | 4        | Opens the composer with the text filled in                                       |
| Threads   | `@WikiTreers`                 | 500        | 20       | Opens the composer with the text filled in                                       |
| Bluesky   | `@wikitree.bsky.social`       | 300        | 4        | Opens the composer with the text filled in                                       |
| Mastodon  | `@wikitree@genealysis.social` | 500        | 4        | Opens the composer on the member's own server (option)                           |
| Reddit    | none                          | 300        | 1        | Opens a link post to r/wikitree. The text is the title, with no tags or hashtags |
| Facebook  | `@WikiTree`                   | 63,206     | 10       | Passes the link only. The member pastes the text                                 |
| LinkedIn  | `@WikiTree`                   | 3,000      | 9        | Passes the link only. The member pastes the text                                 |
| Instagram | `@WikiTreers`                 | 2,200      | 10       | No web composer. Copy the caption, save the picture, post in the app             |
| TikTok    | `@WikiTreers`                 | 2,200      | 35       | As Instagram                                                                     |
| YouTube   | `@WikiTreers`                 | 5,000      | 1        | As Instagram                                                                     |

On X and Mastodon a link counts as 23 characters. No network accepts pictures through a link. The dialog saves them to
the downloads folder, or opens the system share sheet where the browser supports sharing files. Facebook and LinkedIn
build the picture from the link preview. A plain `@WikiTree` does not create a tag on Facebook or LinkedIn, so the dialog
tells the member to retype the `@` and choose the account from the list. Links in Instagram captions are not clickable,
so the dialog suggests the bio link. The character limits and picture counts are in `CHANNELS` in `share_page_core.js`
and are planning values to re-check before each release.

## Options

| Option                                                                           | Default         |
| -------------------------------------------------------------------------------- | --------------- |
| Channel selected when the dialog opens                                           | Facebook        |
| Your Mastodon server (for example mastodon.social)                               | mastodon.social |
| Add a short summary to the share card (life summary, or the page's opening text) | On              |
| Add the WikiTree hashtags to the post                                            | On              |

## Background script

`public/background.js` has one handler for this feature, `sharePageFetchImage`. The content script asks it for a
picture the page itself may not read (such as a portrait on `apps.wikitree.com`), and it replies with the bytes as base64.
It ignores the browser's cross-origin rules, so it is strict about what it fetches:

- only `https` addresses on `wikitree.com` or its subdomains (a look-alike such as `wikitree.com.example.net` is refused);
- only responses that are images, and nothing larger than 3 MB;
- a picture that redirects to another site is refused;
- requests to `apps.wikitree.com` carry an `appId`, because that host answers requests without one with an empty page.

No new permission is needed: the manifest already allows `https://*.wikitree.com/*`.

## Files

| File                       | Purpose                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `share_page_core.js`       | Pure logic: page detection, privacy rule, post text, networks, composer links, summaries, cropping |
| `share_page_core.test.js`  | Unit tests for the core module (70)                                                                |
| `share_page.js`            | Button, privacy check, dialog, share card drawing, chart capture, crop panel, copy and save        |
| `share_page.test.js`       | jsdom tests that open the dialog and click through it (41)                                         |
| `background_fetch.test.js` | Runs the real `public/background.js` against the picture fetch rules (15)                          |
| `share_page_options.js`    | Registers the feature and its options                                                              |
| `share_page.css`           | Dialog and button styles. Every class starts with `wbe-share`                                      |

The feature is imported in `src/content_main.js` and its options in `src/features/register_feature_options.js`.

## Development

```bash
npm install
npx jest src/features/share_page   # the 126 tests for this feature
npm run build-dev                  # build, plus the undefined-globals, Safari and palette checks
```

Load the `dist` folder as an unpacked extension (see `docs/tutorial.md`), switch on **Share Page** in the options, and
visit a profile. The tests use jsdom, which has no canvas and does not load images, so they stand in for both. The card
drawing, the chart capture, the crop preview and real photo fetching are only checked by loading the extension.

The build forbids regular-expression lookbehind (older Safari) and test code that uses globals such as `Buffer` or
`__dirname`, so the code and tests avoid both.

## Open items

- **Browser coverage.** Check Save picture, Share… and the crop panel in Safari and Firefox. Safari handles downloads
  differently (see the WBE help page's known issues).
- **Other Tree Apps views.** The generation count is read from the fan chart's counter only. Other views use their own
  description or a plain sentence, and their charts are captured the same way as the fan chart but have been tested on
  stand-in markup.
- **Network details.** Character limits, picture counts and the composer links can change. Re-check them before each
  release.
