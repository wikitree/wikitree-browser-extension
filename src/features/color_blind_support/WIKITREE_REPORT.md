# Colour-only signals on WikiTree

**A findings note from the WikiTree Browser Extension project.**
Ian Beacall (Beacall-6), August 2026.

This is a working document, not an official WikiTree audit. It exists because a member
reported a specific problem in G2G, and looking into it turned up the same pattern in
several other places. Every hex value below was read from WikiTree's own live stylesheets
(`wt-links.css`, `wt-components.css`, `wt-stylesheet.css`); re-check them before acting,
as the site changes.

## The report that started it

A member with red-green colour blindness said that links to unregistered categories are
indistinguishable from ordinary links. They are right, and the cause is two rules:

```css
/* every ordinary link: green */
a,
a:link {
  color: rgb(0, 128, 0);
}

/* a link to a page that does not exist yet: red, and nothing else */
a.new {
  color: red;
}
a.new:visited {
  color: red !important;
}
```

Red against green, with nothing else separating them. Red-green colour blindness is the
most common form — roughly 1 in 12 men and 1 in 200 women — so this is not a rare edge.

One suggestion in the thread was to let users change the red to blue. That helps the
person who changes it, and it is what the extension now offers. But it only helps people
who install a browser extension and go looking for the setting, which is a small fraction
of the people affected, and none of the logged-out readers.

## Where else the same pattern appears

| What                    | The rule                                                                                                                 | Is there a second, non-colour signal?                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| New/unknown links       | `a.new { color: red }` vs `a { color: rgb(0,128,0) }`                                                                    | **No**                                                                                     |
| Info vs attention boxes | `.box.green { background:#e1f0b4 }` vs `.box.orange { background:#ffee99 }`                                              | **No**                                                                                     |
| Status banners          | `.status` `#ffee99`, `.status.green` `#e1f0b4`, `.status.red` `#ffcccc`                                                  | Partly — each has its own icon, but the icons are themselves colour-coded and small        |
| Badges                  | `.badge.green` `#8fc641`, `.badge.red` `#cc0000`                                                                         | **No**                                                                                     |
| Privacy indicators      | `--60` white, `--50` `#8fc641`, `--40` `#ffe270`, `--35` `#fad158`, `--30` `#fcb815`, `--20` `#cc0000`, `--10` `#25422d` | Weak — three lock icons across seven levels, and 40/35/30 are three near-identical yellows |
| Gender backgrounds      | `.tree--person_m #f2f1ff`, `_f #ffeeee`, `_u #eeffee`                                                                    | **No** — and pink against green is exactly the red-green case                              |

The privacy row is worth singling out. Levels 30, 35 and 40 differ only as three shades of
yellow, and they share an icon. Those are hard to tell apart with normal colour vision.

## The recommendation

The general principle, put well by Celia Marsh-9608 in the original thread: **colour should
never be the only thing carrying a meaning.** Pair it with something else — a different
weight or style, a border treatment, an icon with a distinct silhouette, or simply a word.

Concretely, in rough order of benefit against effort:

1. **Give `a.new` a second signal.** A dotted underline costs one CSS rule and fixes the
   reported problem for everyone, logged in or not, extension or not. A trailing marker
   such as a superscript `?` is even clearer.
2. **Put the outcome in words where a colour currently carries it**, particularly on
   status banners. "Passed" and "Issues found" are unambiguous in a way that a green or
   orange background is not.
3. **Distinguish privacy levels 30/35/40 by more than shade.** The level number beside the
   dot, or a distinct border treatment per level, would do it.
4. **Give the box variants distinct edges** as well as distinct fills — solid, dashed and
   double read differently in any colour vision, and in greyscale.

None of these require giving up the existing colours. They add a channel rather than
replacing one.

## A caution about how you test this

If you check a change by running the page through a colour-blindness simulator and
comparing the two colours, be careful about what that actually tells you.

The standard simulation matrices model the loss of hue but keep each colour's luminance.
So WikiTree's red `a.new` and its green links, run through the deuteranopia matrix and
compared in CIE Lab, come out **91.8 dE apart** — a large difference. Searching the space
of readable reds against readable greens does not turn up a single pair within 14 dE.

By that measure the problem does not exist. But it does exist, and here is the gap: what
separates those two simulated colours is mostly lightness, and a reader looking at one
link in a paragraph has no second link beside it to compare that lightness against. Colour
normally gives an answer without a comparison. Lightness alone does not.

The practical consequence is that a numeric check will pass a page that a real reader
struggles with. Two better tests:

- View the page in **greyscale**. If two things are still distinguishable with hue removed
  entirely, they will survive any form of colour blindness.
- Look at a signal **in isolation**, not next to its counterpart. One red link in a
  paragraph of green ones, not the two side by side in a swatch.

## What the extension does about it meanwhile

The WikiTree Browser Extension now has a **Color-Blind Support** feature that recolours
these signals with a colour-blind-safe palette and, more importantly, adds the second
channel described above — dotted underline and `?` on new links, distinct border styles
per box severity, the privacy level as a number, an edge treatment on gender backgrounds.

It also ships a **simulator**: right-click any WikiTree page and choose _Color-Blind
Simulator_ to view it as a reader with deuteranopia, protanopia, tritanopia or
achromatopsia. It has a Support switch, so a page can be seen with and without the
remediation side by side. That is offered to whoever takes this on, as the cheapest way to
review a page — and it works whether or not the rest of the feature is switched on.

The extension can only help people who install it. Fixing the four items above at source
would help everyone.
