# Roadmap

## Resolved: `<changelogurl>` — confirmed working (v2.0.24)

Took five attempts (2.0.18–2.0.24) to get right, all found via live
testing on the real production site, not local checks:

1. **2.0.18/2.0.19** — used an invented, wrong `<changelog>` schema
   (`<fixes><fix title="...">`, `<name>`, `<description>`), causing
   PHP 8.2 "dynamic property" deprecation warnings in Joomla's
   `Changelog` class. Looked like a Joomla core bug at first, wasn't.
2. **2.0.20** — reverted the whole feature on that (wrong) diagnosis.
3. **2.0.21** — re-added with the actually-correct schema per
   Joomla's own docs (manual.joomla.org): `<element>`/`<type>`/
   `<version>`, then singular category tags (`<fix>`, `<addition>`,
   `<change>`, `<remove>`, `<security>`, `<language>`, `<note>`) each
   containing plain `<item>` children. No more PHP errors, but the
   changelog modal rendered as meaningless one-word bullets.
4. **2.0.22/2.0.23** — Joomla's changelog viewer doesn't re-escape
   item text before handing it to the browser, so literal `<tag>`
   references AND literal `&` characters in the source text both got
   interpreted as real HTML (tags / entities) and shredded the
   bullet. Fixed by stripping angle-bracket tag references down to
   their bare text and replacing every ampersand with the word "and"
   before escaping.
5. **2.0.24** — the same viewer also splits a single item into
   separate bullets at em/en dashes. Fixed by replacing those with
   commas.

Confirmed live: a full multi-sentence bullet now displays as one
continuous, readable list item. `changelog.xml`'s generator (in the
release script, not committed as a standalone tool) sanitizes
`CHANGELOG.md` bullets through all of the above before escaping.

## 3.0 — Container queries instead of ResizeObserver

`container-type: inline-size` + `@container` can do natively what
`ResizeObserver` does today in JS (stack a table by its own wrapper's
width, not the viewport) — no layout-thrashing, no flash of
unstacked content while JS boots.

Sketch:

```php
$wa->addInlineStyle(sprintf(
    '.rwd-table-wrap{container-type:inline-size}@container (max-width:%dpx){.rwd-table-wrap table.responsiv{/* today's .is-stacked rules */}}',
    (int) $this->params->get('breakpoint', 600)
));
```

JS would then only be left doing what CSS still can't: filling in
missing `data-label` and the ARIA roles that compensate for
`display:block` in the stacked layout.

Needs a `ResizeObserver` fallback via `@supports not (container-type:
inline-size)` for older browsers, since container query support is
newer than everything else this plugin relies on. Flagged as a 3.0
target (not a patch release) — this is an architecture change to how
stacking itself works, not a bug fix.

Source: external review (Perplexity), P3 §18.
