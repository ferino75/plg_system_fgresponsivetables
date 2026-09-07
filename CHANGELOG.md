# Changelog

## 2.0.0
- Rebranded into the FG series as `plg_system_fgresponsivetables` (element, namespace `FG\Plugin\System\Fgresponsivetables`, language files, media destination, display name all renamed accordingly). Version numbering restarted at 2.0.0; the pre-rebrand history (originally built for mechanizmysevcik.sk and fnspza.sk, 1.0.0–1.9.7) is preserved in the project's earlier development notes, not repeated here.
- Functionally identical to 1.9.7 at the point of rebrand: stacks `table.responsiv` into labelled, accessible cards on narrow screens (CSS Grid label/value layout, ARIA roles compensating for `display:block`, colspan/rowspan-aware header resolution, nested-table-safe DOM traversal), with admin-configurable breakpoint, card style, optional float-clearing, and an opt-in `legacy.css` for the original sites' generically-named helper classes (`.day-content`, `.sirka-*`, etc.).
- Removed `protected $autoloadLanguage = true;` (unused on the frontend side; kept out going forward per FG convention).
- Added an extension update server (`updates.xml` on the repo's `master` branch, `<client>site</client>` declared for the plugin entry).
