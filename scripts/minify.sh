#!/usr/bin/env bash
# Generates .min.css / .min.js (+ source maps) alongside the plugin's
# real source files. Nothing else needs to change: Joomla's Web Asset
# Manager automatically prefers a *.min.* file over its unminified
# counterpart when it exists in the same folder, and automatically
# falls back to the unminified file when Joomla's own Debug mode
# (Global Configuration) is on -- confirmed against Joomla's own
# documentation (manual.joomla.org/docs/*/general-concepts/javascript/
# adding-javascript). No changes to joomla.asset.json or the PHP are
# needed for this to take effect.
#
# Run via `npm run minify`, or as part of the release workflow.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Minifying JS..."
npx terser media/js/fgresponsivetables.js \
  -o media/js/fgresponsivetables.min.js \
  --source-map "url='fgresponsivetables.min.js.map'" \
  --compress --mangle

echo "Minifying CSS..."
npx cleancss -o media/css/fgresponsivetables.min.css --source-map media/css/fgresponsivetables.css
npx cleancss -o media/css/legacy.min.css --source-map media/css/legacy.css

echo "Done:"
ls -la media/js/fgresponsivetables.min.js media/js/fgresponsivetables.min.js.map
ls -la media/css/fgresponsivetables.min.css media/css/fgresponsivetables.min.css.map
ls -la media/css/legacy.min.css media/css/legacy.min.css.map
