# Roadmap

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
