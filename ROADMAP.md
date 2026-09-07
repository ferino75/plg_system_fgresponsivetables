# Roadmap

## Resolved: `<changelogurl>` — was our wrong schema, not a Joomla bug

Tried in 2.0.18–2.0.20, reverted as apparently blocked by a Joomla
core bug (dynamic properties on `Changelog.php`, PHP 8.2 deprecation).
That diagnosis was wrong: the actual `<changelog>` entry schema
(confirmed against Joomla's own documentation,
manual.joomla.org/docs/building-extensions/install-update/installation/change-log)
uses singular category tags — `<fix>`, `<addition>`, `<change>`,
`<remove>`, `<security>`, `<language>`, `<note>` — each containing
plain `<item>` children, plus `<element>`/`<type>`/`<version>`. What
was actually shipped in 2.0.18/2.0.19 (`<fixes><fix title="...">`,
`<name>`, `<description>`) doesn't match that schema at all — none of
those are real properties on the `Changelog` class, which is exactly
why they triggered the "dynamic property" deprecation. Re-added in
2.0.21 with the corrected schema. **Needs a second live confirmation**
on the real site before fully trusting it — the first two attempts
both looked fine locally and both failed in production.

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
