# Visual/functional regression tests

Playwright suite covering the scenarios that have actually regressed
or broken in this project's history — most directly the four P1 bugs
an external review found (colspan/rowspan header resolution, nested
tables, rowspan-in-body label shift, `th[scope=row]` in stacked mode),
plus the earlier float→flex mobile-card regression (v1.3.4/v1.3.5)
this kind of suite would have caught immediately.

## Running locally

```
npm install
npx playwright install chromium
npm test
```

## What's actually being tested

`tests/visual.spec.js` has two layers:

1. **Functional assertions** (the real regression net) — deterministic
   checks against computed styles, ARIA roles, `data-label` values,
   overflow measurements, etc. These don't need a baseline image and
   fail precisely on the exact condition that broke before (e.g.
   "second row's cells report `data-label=Stroj`/`Cena`, not
   `Deň`/`Stroj`" for the rowspan-shift bug).
2. **Screenshots** at 320/360/600/768/1200px for every fixture,
   saved to `test-results/screenshots/` as CI artifacts. These are
   **not diffed against a baseline yet** — no baseline exists in this
   repo. To turn this into true pixel-diff regression testing:
   convert the screenshot step to `expect(page).toHaveScreenshot()`,
   run once locally with `--update-snapshots` after a human has
   reviewed the current rendering as correct, and commit the
   resulting `*-snapshots/` folder. Until then, review the screenshot
   artifacts by eye after a change that could affect layout.

## Fixtures

`tests/fixtures/*.html` load the plugin's real CSS/JS directly (no
Joomla involved) with a handful of representative tables per file:

- `basic.html` — 12 tables in one page: simple, long label, long
  value (must wrap), `rwd-nowrap` opt-out, colspan/rowspan header,
  rowspan in body, `th[scope=row]`, no `<thead>`, `<caption>`, a
  table nested inside a cell, an author-supplied `role="table"`, and
  `role="presentation"`.
- `shared-wrapper.html` — two tables sharing one `.table-wrapper`,
  plus one table alone in its own `.table-wrapper`.
- `min-width.html` — the "Minimum table width" setting forcing
  horizontal scroll instead of squeezed columns.
- `dark-mode.html` — `data-bs-theme="dark"` on `<body>`.
- `card-style-lines.html` — the "Plain dividing lines" card style.

## Adding a new fixture

When a bug is found and fixed, add the reproducing table (or a new
fixture file for something needing different plugin options) here
alongside its assertion in `visual.spec.js`, so it can't silently
regress again — this is exactly the gap this whole test suite exists
to close.
