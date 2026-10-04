# Share Page

Adds a **Share** button to WikiTree profiles, free-space, project, category and help pages, image pages, tree widgets
and Tree Apps views. The button opens a dialog where a member picks a social network, picks pictures from the page (or a
generated share card), edits the post, and posts it.

## What the post contains

- A sentence about the page, the page address, the WikiTree account tag for the chosen network, and the hashtags
  `#WhereGenealogistsCollaborate #CollaborativeGenealogy`.
- Image pages share the image and a link to the image page. A full-screen image (`/photo.php/…`) links to its image page.
- Tree Apps views keep the part of the address after `#`, because that holds the view.

## Files

| File                      | Purpose                                                                           |
| ------------------------- | --------------------------------------------------------------------------------- |
| `share_page_core.js`      | Pure logic: page detection, post text, network list, composer links. Unit tested. |
| `share_page_core.test.js` | Jest tests for the core module.                                                   |
| `share_page.js`           | Button, dialog, share card drawing, copy and save.                                |
| `share_page_options.js`   | Registers the feature and its options.                                            |
| `share_page.css`          | Dialog styles. All classes start with `wbe-share`.                                |

## Options

- Channel selected when the dialog opens.
- The member's own Mastodon server, so the composer opens there.
- Whether to add the WikiTree hashtags.

## What each network allows

- **Opens the composer with the text filled in:** X, Bluesky, Threads, Mastodon, Reddit.
- **Only the page address can be passed (the member pastes the text):** Facebook, LinkedIn.
- **No web composer (copy the caption, save the picture, post in the app):** Instagram, TikTok, YouTube.
- Pictures cannot be attached through a link on any network. The dialog saves them, or opens the system share sheet where
  the browser supports sharing files.

Account tags: `@WikiTree` (Facebook, LinkedIn), `@wikitree.bsky.social`, `@wikitree@genealysis.social`,
`@WikiTreers` (X, Threads, Instagram, TikTok, YouTube), `r/wikitree` (Reddit, no tags or hashtags).
Character limits and picture counts are planning values to confirm before release.

## Open items before release

- **Privacy.** `isPubliclyShareable()` in `share_page.js` is a placeholder. Decide how to hide the button on Private and
  Unlisted profiles and private images.
- **Reddit.** Confirm r/wikitree's rules allow member-shared links.
- **Tree Apps links** may ask the person who opens them to log in to apps.wikitree.com.
- **Not yet tested in a browser.** Build, load the extension and try each page type and network.
- **Safari downloads.** The docs note Safari's download quirks. Check Save picture there.
