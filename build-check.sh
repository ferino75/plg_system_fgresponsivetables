#!/usr/bin/env bash
# Verifies fgresponsivetables.xml <version>, media/joomla.asset.json
# "version", updates.xml <version>, and changelog.xml's newest entry
# are all identical before packaging/tagging a release. Run this
# before every zip/tag/push.
set -euo pipefail
cd "$(dirname "$0")"

xml_version=$(grep -oP '(?<=<version>)[^<]+' fgresponsivetables.xml)
asset_version=$(grep -oP '"version":\s*"\K[^"]+' media/joomla.asset.json)
updates_version=$(grep -oP '(?<=<version>)[^<]+' updates.xml)
changelog_version=$(grep -m1 -oP '(?<=<version>)[^<]+' changelog.xml)

if [ "$xml_version" != "$asset_version" ] || [ "$xml_version" != "$updates_version" ] || [ "$xml_version" != "$changelog_version" ]; then
  echo "VERSION MISMATCH: fgresponsivetables.xml=$xml_version, joomla.asset.json=$asset_version, updates.xml=$updates_version, changelog.xml(top)=$changelog_version" >&2
  exit 1
fi

echo "OK: all four at version $xml_version"
