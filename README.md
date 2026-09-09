# xdeck

A control deck for the X (Twitter) timeline: it reclaims the wasted width, turns media into a clickable thumbnail, and keeps a radar of the posts X downloaded but never put on screen.

On wide screens X pins the post column at 600px, spends the rest on sidebars, and lets a single photo push the action bar 600px down — two posts fit on screen. This script fixes both, and every part is optional: each one toggles in a floating panel, and "Restore X defaults" gives the original layout back without uninstalling anything.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Extension icon → **Create a new script**.
3. Clear the editor, paste [`xdeck.user.js`](xdeck.user.js), `Ctrl+S`.
4. Reload X.

## What it does

A floating button in the bottom-right corner opens the options panel:

| Option | Effect |
| --- | --- |
| **Full width** | The timeline uses the free width instead of a fixed 600px. |
| **Hide right sidebar** | Removes trends, "who to follow" and the search box. |
| **Compact left nav** | Icons-only menu, 88px. |
| **Media as thumbnail** | Photos and videos become a clickable thumbnail beside the text, with adjustable size. This is what multiplies how many posts fit on screen. |
| **New posts radar** | A modal with statistics and the list of captured posts. |

### Media viewer

The `⤢` on a thumbnail opens the media centered, with fullscreen, arrows for multi-photo galleries, and a built-in video player (play/pause, scrubber, elapsed and total time, volume).

Shortcuts: `Esc` closes (the first `Esc` leaves fullscreen), `F` toggles fullscreen, `space` plays/pauses, `←`/`→` seek 5s in a video or move between photos in a gallery.

### New posts radar

Statistics on volume and pace, authors, engagement and content, plus a "Worth a click" card with the highest-traction posts and a list filterable by text, author and media. With the modal open, a bar announces incoming posts and offers to refresh the list or to trigger X's own "Show N posts".

Global shortcut: `Alt+W` toggles the whole wide mode.

## How it works

A few things that are not obvious, and that explain why the code looks the way it does.

**The 600px cap is an atomic class generated at build time.** Besides the limit on `primaryColumn`, X applies a second cap on an inner wrapper through a class like `r-1ye8kvj`, whose name changes between releases. Instead of hardcoding it, the script sweeps the classes inside the column at runtime, tests which one yields a `max-width` between 480 and 720px, and caches the result.

**Media height comes from aspect boxes.** They use `padding-bottom` in percent, which resolves against the **parent's** width — capping the image's own width changes nothing. The cap has to go on the parent element.

**Thumbnails are tagged from JS, not CSS.** The tweet's content column becomes a two-column grid, but CSS alone cannot isolate that column: nested `:has()` is forbidden and every ancestor would match the same selector. Both elements are tagged from JS instead.

**X's player does not survive the change of context.** The video is MSE — `src` and `<source>` are `blob:`, so the player cannot be rebuilt, only moved. But outside the `<article>` X's UI stops working: the control bar is never mounted and the play button does not fire, not even on a real click. The `<video>` element itself stays intact, so the viewer hides X's UI and drives the `<video>` directly.

**"New" is measured by rendering.** A post enters the buffer unread and leaves the count when X renders it as an `<article>`. Cutting by `created_at` does not work — the timeline is not chronological, and a poll brings posts older than the already-rendered top. Inferring it from the request does not work either: X's poll re-fetches the top **without a cursor**, indistinguishable from a render.

**Capture is passive.** Hooks on XHR and `fetch`, installed at `document-start`, read `HomeTimeline` / `HomeLatestTimeline` responses in passing. The script requests nothing of its own and the radar changes nothing in the DOM. The buffer lives in `localStorage`, capped at 1200 posts and 36h.

## Limitations

- The radar only sees what X downloads. With the tab idle X polls rarely, so the buffer fills at its pace.
- The counter tracks everything downloaded and never displayed, which is usually larger than X's own "Show N posts".
- The class that keeps the `<video>` visible in the viewer sits on React-managed nodes; if X re-renders that subtree while the viewer is open, the video may flicker.
- The script relies on X's `data-testid` attributes. They have been stable for years, but a large front-end change may require adjustment.

## Notes

The UI is in English; the term-ranking stop word list is deliberately bilingual, since it has to match whatever languages your feed carries. Internal identifiers and the `localStorage` keys are still in Portuguese — the keys on purpose, so upgrading does not wipe your settings or the read/unread state of the buffer.

## Compatibility

Chrome with Tampermonkey. Uses `:has()` and CSS grid, so it needs a current browser.
