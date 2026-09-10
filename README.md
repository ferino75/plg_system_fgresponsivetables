<p align="center">
  <img src="assets/logo.png" alt="FG Responsive Tables logo" width="128" height="128">
</p>

<h1 align="center">FG Responsive Tables</h1>

<p align="center">
  <a href="https://github.com/ferino75/plg_system_fgresponsivetables/releases"><img src="https://img.shields.io/github/v/release/ferino75/plg_system_fgresponsivetables?color=FF6B4A&label=release" alt="Latest release"></a>
  <img src="https://img.shields.io/badge/Joomla-4%20%7C%205%20%7C%206-1B7FBF" alt="Joomla 4 | 5 | 6">
  <img src="https://img.shields.io/badge/PHP-7.4%2B-777BB4" alt="PHP 7.4+">
  <a href="LICENSE.txt"><img src="https://img.shields.io/badge/license-GPL--2.0-green.svg" alt="License: GPL-2.0-or-later"></a>
  <img src="https://img.shields.io/github/downloads/ferino75/plg_system_fgresponsivetables/total?cacheSeconds=3600" alt="Downloads">
</p>

A Joomla 4/5/6 system plugin that turns any `<table class="responsiv">` into a labelled, accessible card layout on narrow screens — without touching the desktop table.

## Features

- **CSS Grid card layout** — label and value each get their own column, so a long header (e.g. "Cena za 1 hod. nad paušál (min. 3 hod.)") can wrap without ever colliding with the value.
- **Accessible by default** — explicit `role`/`scope` attributes compensate for the `display:block` stacking, so screen readers still navigate the table normally on mobile. Respects an author-supplied `role="presentation"`.
- **Colspan/rowspan-aware header resolution** — a grouped header (`<th colspan="2">Cena</th>` over `<th>hodina</th><th>km</th>`) resolves to the correct per-column label, not a naive cell-index guess.
- **Nested-table safe** — uses native `table.rows` / `row.cells` throughout, so a `<table>` nested inside a cell is never touched by the outer table's processing.
- **Reacts to container width, not just viewport** — `ResizeObserver` on the table's own wrapper, so it stacks correctly inside a narrow module, sidebar, or accordion panel even on a wide screen.
- **Configurable**: table selector, exclude selector, breakpoint, card style (bordered card vs. plain dividing lines), optional float-clearing, optional legacy-class compatibility layer.
- **Zero dependencies**, plain JS + CSS, ships as a single system plugin.

## Installation

1. Download the latest release ZIP from the [Releases](https://github.com/ferino75/plg_system_fgresponsivetables/releases) page.
2. Joomla admin → System → Install → Extensions → upload the ZIP.
3. System → Plugins → search "FG Responsive Tables" → enable.

## Usage

```html
<table class="responsiv">
  <thead>
    <tr><th>Service</th><th>Price</th></tr>
  </thead>
  <tbody>
    <tr><td>Consultation</td><td>€45</td></tr>
  </tbody>
</table>
```

The `responsiv` class is required unless "Enhance all article tables" is turned on in the plugin settings. `data-label` is filled in automatically from the table header; add it manually only if you want a different label than the header text.

For integrating with another script, listen for `rwdTables:enhanced` on `document` — it fires once per table, right after that table's enhancement (labels, ARIA roles, wrap, everything) is fully done:

```js
document.addEventListener('rwdTables:enhanced', function (e) {
  var table = e.detail.table;
  // table is already fully enhanced at this point
});
```

To exclude a specific table: `<table class="no-responsiv">`.

Two more helper classes on the table/cells themselves:

- `<table class="responsiv responsiv-fixed">` — forces `table-layout: fixed` on the desktop table, useful when column widths jump around as content loads.
- `<td class="rwd-nowrap" data-label="Price">€195</td>` — a value that's always short (a price, a code) and should never wrap onto a second line even next to a long label. The mobile card lets the value wrap by default, since that's safer for a longer piece of text (a note, a description).
- `<table class="responsiv rwd-scroll-only">` — never stacks into cards, regardless of width; stays a real table and scrolls horizontally instead. For a comparison matrix (many columns, each row meaningful only alongside the others), turning each row into its own label:value card list loses the grid relationship the table depends on. Per-table, so a site can mix ordinary stacking price tables with scroll-only comparison matrices.
- `<table class="responsiv rwd-scroll-only rwd-sticky-col">` — freezes the first column in place while scrolling horizontally, for a wide report table (many columns, where the first one identifies the row — an ID or name) so you don't lose track of which row you're looking at while scrolling right. Combine with `rwd-scroll-only`, or use alone on any table that already scrolls (e.g. via the `min-width` setting). Has no effect while a table is stacked into cards.

See `README.txt` (Slovak) for the full list of helper classes, including the opt-in `legacy.css` compatibility layer for sites migrating from the original tabulka.css.

## Configuration

| Setting | Default | What it does |
|---|---|---|
| Table selector | `table.responsiv` | Which tables to enhance |
| Enhance all article tables | Off | Also add `.responsiv` to tables inside `article`/`.com-content`/`.item-page`/`.blog`/`.category` |
| Container selector | (the list above) | Only shown when "Enhance all article tables" is on. The CSS selector list itself — replace it for templates (Helix, JD, T4, ...) that wrap content differently than Joomla core does |
| Compose multi-level labels | Off | For a grouped header (`Cena` split into `hodina`/`km`), compose the full path (`Cena › hodina`) instead of just the leaf column name |
| Level separator | ` › ` | Only shown when "Compose multi-level labels" is on |
| Border color, Text color, Header background color, Label text color, Card corner radius, Card shadow | (all empty) | Quick branding overrides for the six most visually significant CSS custom properties, without a `custom.css` edit — output as a small inline `:root{...}` block only when at least one is set. Covers the default (light) palette only; dark-mode-specific colors still need `custom.css` |
| Fill data-label | On | Copy missing `data-label` from the matching header column |
| Wrap table | On | Wrap in `.rwd-table-wrap` so stacking follows container width |
| Accessibility (ARIA roles) | On | Add `role`/`scope` attributes compensating for mobile `display:block` |
| Mobile card style | Bordered card | Bordered card (rounded, shadow) vs. plain dividing lines |
| Clear floats before the table | Off | Add `clear:both` — for pages with an uncleared `float:right` image before the table |
| Breakpoint (px) | 600 | Below this wrapper width, the table stacks into cards |
| Minimum table width (px) | 0 (off) | Forces horizontal scroll (instead of squeezed columns) in the width band between the breakpoint and full width — a non-stacked `table-layout:auto` table otherwise shrinks columns rather than overflows, so the scroll-shadow/keyboard-focus logic never gets a chance to activate |
| Load legacy compatible styles | On | Load `legacy.css` (`.day-content`, `.sirka-*`, `.col-w-md-*`, ...) — turn off on a new/unrelated site, these class names are generic |
| Watch for dynamically added tables | Off | Enables a `MutationObserver` so a table added later via AJAX (lazy-loaded tabs/accordion, SP Page Builder, a custom fetch) is picked up automatically instead of needing a manual `window.rwdTablesEnhance()` call — costs watching the page continuously, so it's opt-in |
| Load only on com_content pages | Off | Skips loading the ~10KB CSS/JS entirely on pages outside `com_content` (articles/categories) — a real saving on a content-heavy site, but the plugin won't apply at all to a table living in a module or another component while this is on |

## Known limitations

- **`dir="rtl"` support is CSS-level only, not scroll-position-aware.** The grid layout and text alignment (both desktop headers and the mobile card's label/value) use logical properties (`text-align: start/end`, grid's own inline-direction-aware track placement) and correctly mirror under `dir="rtl"` with no separate RTL stylesheet needed. The `can-scroll-left`/`can-scroll-right` scroll-shadow indicator classes and their underlying `scrollLeft` detection are not RTL-aware — different browsers measure horizontal scroll position differently under RTL (some use negative values, some don't), so the shadow indicator may point the wrong way on a genuinely RTL page that also needs `min-width`-forced horizontal scroll. The far more common RTL case — a stacked card, or a table that fits without scrolling — is unaffected.

- **A brief flash of the unstacked table on mobile (FOUC).** The script has `defer` and runs as early as that allows (immediately once the document is parsed, not waiting for the `DOMContentLoaded` event if it hasn't already fired) — but a table can still render squeezed for a moment before JS stacks it into cards. Hiding the table until JS runs would remove this flash but break the safer no-JS fallback (a plain, fully-labeled table) this plugin deliberately keeps — not a trade worth making. The real fix is architectural: see [ROADMAP.md](ROADMAP.md) (container queries, 3.0), which would stack tables in pure CSS with no JS timing involved at all.
- **Double announcement of the label on some screen readers.** The mobile card's label comes from `content: attr(data-label)` on a `::before` pseudo-element. Some screen readers (VoiceOver, NVDA in certain modes) read that generated content AND the `role="columnheader"`/`headers` association this plugin restores, so a user can hear the column name twice for one cell. This is a known trade-off of the "generated-content label" pattern used for the stacked-card layout, not a regression — `role="region"` + a name on the scrollable wrap (see Configuration) at least keeps the table clearly bounded even where this happens.

## Development

From the repository root:

```
composer install    # (n/a — plain PHP/JS/CSS, no build step)
```

### Cutting a release

1. Add the new version's entry at the top of `CHANGELOG.md` and push that to `master`.
2. Tag it and push the tag: `git tag v2.0.25 && git push origin v2.0.25`.

`.github/workflows/release.yml` then does everything else: bumps the version in `fgresponsivetables.xml`, `media/joomla.asset.json`, and `updates.xml`, regenerates `changelog.xml` from `CHANGELOG.md`, verifies all four agree (`build-check.sh`) and that the XML/JSON/JS are syntactically valid, generates minified CSS/JS (`scripts/minify.sh` — see below), packages the install ZIP, commits the regenerated files back to `master`, and creates the GitHub Release with the ZIP attached. It fails on purpose if `CHANGELOG.md`'s newest entry doesn't match the tag — a forgotten changelog entry can't silently ship.

`scripts/set_version.py` and `scripts/build_changelog_xml.py` are also runnable by hand for local testing; `build-check.sh` re-checks version consistency any time.

### Minified assets

`scripts/minify.sh` (`npm run minify`) generates `media/js/fgresponsivetables.min.js` and `media/css/*.min.css`, each with a source map, alongside the real source files — not committed to the repo (they're build output, regenerated fresh on every release), but included in the release ZIP. No changes to `joomla.asset.json` or the PHP are needed for this to take effect: Joomla's Web Asset Manager automatically prefers a `.min.` file over its unminified counterpart when both exist in the same folder, and automatically falls back to the unminified version when Joomla's own Debug mode (Global Configuration) is on.

## Presets

Not an automated feature — just three field combinations worth starting from, to copy into the plugin's settings screen by hand, depending on what the site needs.

### Minimal — a small site, simple price/spec tables, nothing extra

| Field | Value |
|---|---|
| Fill data-label | On |
| Enhance all article tables | Off |
| Compose multi-level labels | Off |
| Mobile card style | Plain dividing lines |
| Watch for dynamically added tables | Off |
| Load only on com_content pages | Off |
| Load legacy compatible styles | Off |
| Minimum table width (px) | 0 (off) |
| Everything else | leave at default |

### Full — use everything the plugin offers

| Field | Value |
|---|---|
| Fill data-label | On |
| Enhance all article tables | On (set Container selector to match your template if it isn't Joomla core markup) |
| Compose multi-level labels | On |
| Mobile card style | Bordered card |
| Clear floats before the table | On, if the site has float-based layouts near tables |
| Minimum table width (px) | 480 (or whatever fits your narrowest realistic column set) |
| Watch for dynamically added tables | On, if the site uses AJAX-loaded content, accordions, or a page builder |
| Load only on com_content pages | Off — a table living in a module or another component still needs to work |
| Load legacy compatible styles | On, if migrating from the original tabulka.css |

### Performance — a content-heavy site, prioritize page weight

| Field | Value |
|---|---|
| Fill data-label | On |
| Enhance all article tables | Off (skips a second DOM scan) |
| Compose multi-level labels | Off |
| Mobile card style | Plain dividing lines |
| Watch for dynamically added tables | Off (no standing `MutationObserver`) |
| Load only on com_content pages | On — the actual measurable win, skips ~10KB CSS/JS on every page without a table |
| Load legacy compatible styles | Off (skips loading `legacy.css` entirely) |
| Minimum table width (px) | 0 (off) |

Accessibility (ARIA roles) stays **On** in all three — it costs a handful of attribute writes, never worth trading away.

## License

GPL-2.0-or-later — see [LICENSE.txt](LICENSE.txt).
