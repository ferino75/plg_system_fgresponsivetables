# Changelog

## 2.0.2
- Fixed a real card-overflow bug found by an external analysis (Perplexity): the mobile card's value column used `white-space: nowrap` with a plain `auto` grid track, so a long text value (a note, a description — not just a short price) forced the whole card wider than its wrap and overflowed sideways with no visual cue (the scroll-shadow indicator and keyboard focus are both intentionally suppressed while `.is-stacked`, since a stacked card shouldn't normally need to scroll at all). Measured at 360px viewport before the fix: wrap `clientWidth` 344px vs. `scrollWidth` 834px.
- Value now wraps by default (`white-space: normal; overflow-wrap: anywhere;`), and both grid columns use `minmax(0, ...)` so the tracks can actually shrink below their content's natural width — the earlier plain `1fr auto` looked fine for short values only because grid's default track minimum is content-based, not because the layout was actually safe. Added an opt-in `rwd-nowrap` class for a `<td>` whose value is always short and should never wrap regardless of the label next to it.
- Verified via headless-browser render: the reported scenario now measures `scrollWidth === clientWidth` (344px), long values wrap and stay inside the card, short values are unaffected, and `rwd-nowrap` still forces a single line when explicitly requested.

## 2.0.1
- Desktop table header font-size increased from `0.85em` to `0.95em` — was noticeably small.

## 2.0.0
- Rebranded into the FG series as `plg_system_fgresponsivetables` (element, namespace `FG\Plugin\System\Fgresponsivetables`, language files, media destination, display name all renamed accordingly). Version numbering restarted at 2.0.0; the pre-rebrand history (originally built for mechanizmysevcik.sk and fnspza.sk, 1.0.0–1.9.7) is preserved in the project's earlier development notes, not repeated here.
- Functionally identical to 1.9.7 at the point of rebrand: stacks `table.responsiv` into labelled, accessible cards on narrow screens (CSS Grid label/value layout, ARIA roles compensating for `display:block`, colspan/rowspan-aware header resolution, nested-table-safe DOM traversal), with admin-configurable breakpoint, card style, optional float-clearing, and an opt-in `legacy.css` for the original sites' generically-named helper classes (`.day-content`, `.sirka-*`, etc.).
- Removed `protected $autoloadLanguage = true;` (unused on the frontend side; kept out going forward per FG convention).
- Added an extension update server (`updates.xml` on the repo's `master` branch, `<client>site</client>` declared for the plugin entry).
