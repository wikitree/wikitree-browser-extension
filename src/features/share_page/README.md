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
floating button on pages with no heading (tree widgets, Tree Apps).

## The dialog

1. **Where to share.** Ten networks, each showing the account it tags.
2. **Picture.** The share card, then the photos found on the page. Select several to post them in order, up to the
   network's limit, or select none.
3. **Post text.** Editable, with a character count for the chosen network. Switching network swaps the account tag and
   keeps the member's edits. "Reset to suggested text" starts again.
4. **Post it.** The buttons depend on what the network allows (see below).

A preview on the right shows the post as it will look.

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

Other pages get a card with the page title and a picture.

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

| Option                                                 | Default         |
| ------------------------------------------------------ | --------------- |
| Channel selected when the dialog opens                 | Facebook        |
| Your Mastodon server (for example mastodon.social)     | mastodon.social |
| Add a short life summary to the share card on profiles | On              |
| Add the WikiTree hashtags to the post                  | On              |

## Files

| File                      | Purpose                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `share_page_core.js`      | Pure logic: page detection, post text, network list, composer links, life summary    |
| `share_page_core.test.js` | Unit tests for the core module                                                       |
| `share_page.js`           | Button, dialog, share card drawing, reading the profile's data fields, copy and save |
| `share_page.test.js`      | jsdom tests that open the dialog and click through it                                |
| `share_page_options.js`   | Registers the feature and its options                                                |
| `share_page.css`          | Dialog and button styles. Every class starts with `wbe-share`                        |

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

- **Privacy.** `isPubliclyShareable()` in `share_page.js` is a placeholder. WikiTree's page markup does not show a
  privacy level that this feature could confirm. Decide how to hide the button on Private and Unlisted profiles and on
  private images.
- **Reddit.** Confirm r/wikitree's rules allow member-shared links.
- **Tree Apps links** may ask the person who opens them to log in to apps.wikitree.com. The dialog warns the member.
- **Browser coverage.** Check Save picture and the share sheet in Safari and Firefox. Safari handles downloads
  differently (see the WBE help page's known issues).
- **Network details.** Character limits, picture counts and the composer links can change. Re-check them before each
  release.
