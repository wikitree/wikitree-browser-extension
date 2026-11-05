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
| Surname page                        | `/genealogy/PEASLEY`                                                   | The page                                                     |
| Image page                          | `/photo/jpg/Robinson-27274`                                            | The image page                                               |
| Full-screen image                   | `/photo.php/4/49/Robinson-27274.jpg`                                   | The image page, rebuilt from the file name                   |
| Tree widget                         | `/treewidget/Robinson-27274/6`                                         | The widget                                                   |
| G2G post                            | `/g2g/2098490/the-title`                                               | The post by its number only, `/g2g/2098490`                  |
| Tree Apps view                      | `/apps/Robinson-27274#name=…&view=…`                                   | The person's profile by default, or the view (see Tree Apps) |

Other pages get no button.

**Where the button goes:**

- Signed-in members on profiles and free-space pages: a share icon (`images/share.svg`) in the row of WBE icon buttons
  beside the site's own (Clipboard, Notes, ...).
- Otherwise, in the jump bar (profiles, Genealogy Hub pages): a "Share" link like the others there, with the share icon.
- G2G posts: a share icon to the right of the post's title (the empty `.col-auto` in `.qa-main-heading`, beside the
  bookmark when signed in), or at the end of the title line if that slot is missing.
- Category, Help and Project pages: a "Share" link with the icon at the right-hand end of the "Categories: ..." row.
- Other pages with a heading (Project pages and tree widgets, say): the "Share" link at the end of the title line, after the Scissors
  ID / LINK / URL buttons.
- A floating button at the bottom right on pages with no heading (Tree Apps). A full-screen image gets it at
  the top right, because another feature already uses the bottom right there.

## Who can be shared

Before the button appears, the feature asks WikiTree's API (`WikiTreeAPI.getProfile`, app id `WBE_sharePage`) for the
page's `Privacy` and `IsLiving` fields. This covers profiles, free-space pages, tree widgets, Tree Apps views (the person
in `#name=` in the address, then the path) and images whose file name is a profile ID. G2G posts, and category, project and help pages, are not checked: they are public.

- Public (50) and Open (60) can be shared. Levels 10 to 40 cannot.
- Anyone marked as living cannot, whatever the level.
- If the API cannot be reached, the button is not shown.
- The level is checked again when the button is clicked, because Tree Apps lets people move to another person without
  reloading the page. If it fails then, a short message appears and the dialog does not open.
- An image whose name is not a profile gets no check, since no such profile exists. Categories, project and help pages
  have no privacy level and are not checked.

### Living people on the card

A deceased person's profile can list living relatives, so passing the check above is not enough to name them on the card.
When the dialog opens on a profile, the feature asks the API (`WikiTreeAPI.getRelatives`) for the `IsLiving` and `Privacy`
of the person's parents, spouses and children, and a relative is named on the card only if the API says they are **not
living and not Private** (level 10). See `isNameSafe()` and `safeRelativeIds()`.

- A relative who is not safe is left out of the Parents and Spouse fields and the written summary. Children who are not
  named are still counted: "He was the father of Carl Jr and 3 more", or "He was the father of 5 children."
- If the API cannot be reached, nobody is named, with the same counts. The card still shows the person's own dates and
  places.
- A Tree Apps chart is a picture of whatever the page shows, which can include living people. Names and portraits are
  therefore only in the picture for views that show **just the person's ancestors**: Fan Chart (`fanchart`), Ancestor
  Webs (`webs`), Fractal Tree (`fractal`), X Family Tree (`xtree`), Ancestor Lines Explorer (`ale`) and Name Cloud while
  its scope is "ancestors" (`ancestorGenerations()` reads how many generations each is showing). They keep them only
  when `WikiTreeAPI.getAncestors` says every ancestor in it, to that many generations, is deceased and not Private. If
  the generations cannot be read, or are more than the API can check (10), nothing is verified. Every other view
  (descendants, CC7 and so on), and an ancestor view that fails the check, gets a picture of its **shapes only**: the
  text, portraits, names, dates and hover text are taken out of the SVG, and a canvas (which cannot be edited) is not
  used. The dialog says names were left off. A name cloud without its names has no picture at all, because it is only
  names. CC7's Circles display is drawn from its dots alone, with no initials. A picture with nothing left in it is not
  used. **Slippy Tree** does not hide living people, so it is checked person by person: each person's box has their WikiTree
  number in its id (`person-<id>`), `getPeople` is asked whether they are living or Private, and only the boxes of people
  who are deceased and not Private keep their names and dates (everything else, boxes and lines, stays). Anyone who cannot
  be checked is shown without a name, and the dialog says so. Members who can see living profiles in Tree Apps (managers and trusted-list members) get the same rule, because
  the card goes to everyone.
- A surname hub shows its coordinator, who is a public volunteer role, and the DNA test counts, which are numbers only.

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

A 1080 × 1080 square (1:1, the size of an Instagram post, which the other networks also show well) drawn on a canvas, so no screenshot and no extra permission is needed. It uses WikiTree's colours
(taken from the live site's header and footer, with the gold from the logo), Roboto, and the site's own logo file
(`/images/wikitree-logo-tagline.png`, loaded from the same address as the page so the picture can be saved). If Roboto or
the logo has not loaded, it falls back to Arial and the word "WikiTree". The footer reads "WikiTree.com" and "The FREE
Family Tree".

**The person's WikiTree ID** (for example `Washington-11`) is on the card's first line, after the kind of page, on
profile and Tree Apps cards, so anyone can find the profile from the picture.

**How a picture fills its box on a card.** It fills the box when that crops at most a fifth of the picture, and the crop
never takes the top, where heads and the tops of drawings are: a taller picture loses only its bottom, a wider one only
its sides. If more would be lost, the whole picture is shown with plain bars where it does not reach. See `drawPhoto()`.

**G2G posts** show the post's title (without the "G2G: " the page heading adds; a long title is drawn smaller, up to four
lines, so it is not cut off), the opening text of the post, and three fields: the category it was asked in, the number
of answers (from the "N Answers" heading, since the page lists only one page of them), its votes and its first three
tags. The
post's own first picture starts on the card (pictures in answers and comments are not offered). All G2G is public, so
there is no privacy check, and the saved card is named `wtshare-G2G-<number>.png`. Only question pages are covered, not
the lists, tags and user pages around them. The code is `readG2GFacts()` and `pageSummary("g2g")`.

**Profiles** show the person's data fields (Born, Died, Parents, Spouse, with every parent and spouse name in bold), a
portrait, and a short life summary:

- Everything is read from the page's own structured markup (`#Birth`, `#Death`, `#Parents`, `#Spouses`, `#Children`
  and `#pageData`), so it matches what the page shows.
- The summary is built from templates, not AI. It uses _he_ or _she_ only when the profile records a gender, and repeats
  the first name otherwise.
- It says nothing about someone who could still be living: no death year and born less than 110 years ago. Private
  children are skipped. See `lifeSummary()` in `share_page_core.js`.
- **Notability statement.** If the profile has one (the `{{Notability}}` box under the Biography heading, read from the
  page: the row with the star icon whose alt text says "Notability Statement"), the card starts with that text instead
  of the life summary. A "Text to start from" choice in the dialog switches to the life summary or to both. Statements
  are limited to about 350 characters, so they fit the card; both together may be cut short. See `readNotability()` in
  `share_page.js` and `cardBio()` in `share_page_core.js`.
- **Research status.** A profile or free-space page at Silver Standard (40), Gold Standard Candidate (50) or Gold
  Standard (60) shows a medal and WikiTree's own wording next to "PROFILE" ("Silver Standard", "Gold Standard
  Candidate", "Gold Standard: Genealogically Complete and Peer Reviewed"). The status comes from `ResearchStatus` in the
  `getProfile` call that already checks privacy. Lower statuses show nothing. See `researchBadge()` and `drawMedal()`.

**Help, project and free-space pages** show the title and the opening sentences of the page's text (footnote markers
removed, tables skipped, up to about 330 characters). The page's headings are not listed on any of them: many of these
pages are lists of topics or of people (Help:WikiTree Team, Help:Projects), and a list of headings is not a useful summary
of any page.

**Surname (genealogy) pages** (the hub at `/genealogy/PEASLEY`) show the title, up to four fields read from the page's
text (Profiles: "Search all 652 profiles"; Open profiles and Rank: "Rank: 8,840th most popular surname on WikiTree, with
585 Open profiles"; Coordinator: the one-name study's coordinator) and a line inviting people to explore the surname's
ancestors, cousins and community members, ending with "The surname collaboration score is 95%." when the page has one.
A surname page has no privacy level, so it is not checked. See `parseGenealogyText()` and `readGenealogyFacts()`.

The picture slot on a hub card can hold, at the member's choice:

- **Collaboration score**: the score as a dark green disc ("95%"), drawn like the hub's own badge. The card starts with it.
- **Rank**: the rank in an outlined oval ("8,840th").
- **DNA tests**: a light green box listing the Y-DNA, mtDNA and autosomal tests members have taken, with the members and
  connected profiles for each (only the kinds that were taken).
- **Coordinator**: the coordinator's photo from the page's title bar.
- **One-name study background**: the picture behind the page's title (`#surname-heading`), when there is one.
- Any photo found on the page, or none.

The three drawn pictures are 260 × 300 pixels and made in `share_page_card_art.js`, in WikiTree's colours and Roboto. They
are drawn, not copied from the page, because a standalone copy of the page's own badges would lose their fonts and
styling. The hub's search box is not offered, as it is not something to share.

**Category pages** show counts of subcategories, pages and person profiles, and a line inviting people to explore the
category and check their connections to the ancestors in it.

The page's text is read without the controls inside it: WikiTree's "[edit]" link, footnote markers, and the Link and URL
copy buttons that Scissors adds. See `textWithoutControls()`.

**The picture on the card.** A profile or free-space page starts with its primary photo on the card (the first photo on the
page). Help, project and category pages start with no photo, because their first picture is often a logo or badge. On any
of these a "Picture on the card" strip lets the member choose any photo found on the page, or none, and the card redraws.
The photo fills a portrait slot at the right, and the text stops short of it. Tree Apps cards show the chart instead and
have no chooser.

**Picture position.** A photo on a card that has text goes beside the title and fields by default. "Picture position" in
the dialog moves it under the text instead, across the whole card, which leaves a wide picture far more room. A photo
that loses at most 40% of its height to fill the width does so; a taller one is shown whole on a band. The surname hub's
drawn pictures always go beside the text. See `drawShareCard()`.

For all of these the member can edit the text in the dialog and the card redraws.

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
  `foreignObject` boxes, their sizes and spacing too). Without permission for names, `text`, `tspan`, `foreignObject`,
  `image`, `img`, `title` and `desc` are then removed (`PEOPLE_MARKUP`) and that is the picture. With permission, the SVG
  is drawn first as it is (colours and text), then the portraits, whether SVG `<image>` elements or HTML `<img>` tags
  as the fan chart uses, are fetched, shrunk (JPEG photos stay JPEG) and embedded, because an SVG drawn on its own
  cannot load outside pictures. The version with portraits is used only if it came out at least as full as the plain
  one. The empty margin is trimmed so the chart gets the room. A portrait that cannot be fetched is left out rather
  than shown as a broken-image icon.
- **CC7 Circles** is not one SVG. Each person is a small SVG (`#circlePerson<id>`) placed on a pale background SVG
  (`#CirclesBkgd`) inside `#circlesDIV4SVG`, so `composeCirclesGraphic()` draws a canvas from the dots' positions and
  colours and leaves out their initials or names. It is used only while the Circles display is showing. If the member
  ticked **Central Photo**, that photo (`#theCentralPhotoIMG`, the photo of the person the view is about, who has already
  passed the privacy check) is fetched and drawn in the middle.
- Views with no chart (the Ahnentafel list, Descendants lists, WT+ Maps) get no picture, and the dialog says so.

## Open items

- **Browser coverage.** Check Save picture, Share… and the crop panel in Safari and Firefox. Safari handles downloads
  differently (see the WBE help page's known issues).
- **Other Tree Apps views.** The generation count is read from the fan chart's counter only. Other views use their own
  description or a plain sentence. Their shapes-only pictures are captured the same way as the fan chart, but have only
  been tested on stand-in markup, except the Circles display, whose real markup was read from the
  `wikitree-dynamic-tree` source. A view that draws with several SVGs, or with HTML, may need its own capture like
  Circles has.
- **Network details.** Character limits, picture counts and the composer links can change. Re-check them before each
  release.
