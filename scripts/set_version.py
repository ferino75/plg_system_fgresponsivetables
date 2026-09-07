#!/usr/bin/env python3
"""
Set VERSION in fgresponsivetables.xml, media/joomla.asset.json, and
updates.xml (including the release download URL) all at once, so a
release is never shipped with one of them forgotten -- exactly the
silent-cache-bust bug this script exists to prevent (a stale
media/joomla.asset.json version means visitors keep getting old CSS/
JS from cache even though the manifest says otherwise).

Usage: scripts/set_version.py 2.0.25
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "fgresponsivetables.xml"
ASSET_JSON = ROOT / "media" / "joomla.asset.json"
UPDATES_XML = ROOT / "updates.xml"
ELEMENT = "fgresponsivetables"
REPO = "ferino75/plg_system_fgresponsivetables"


def set_manifest_version(version):
    text = MANIFEST.read_text(encoding="utf-8")
    new_text, count = re.subn(r"<version>[^<]*</version>", f"<version>{version}</version>", text, count=1)
    if count != 1:
        raise SystemExit(f"error: could not find <version> in {MANIFEST}")
    MANIFEST.write_text(new_text, encoding="utf-8")


def set_asset_json_version(version):
    text = ASSET_JSON.read_text(encoding="utf-8")
    new_text, count = re.subn(r'"version":\s*"[^"]*"', f'"version": "{version}"', text, count=1)
    if count != 1:
        raise SystemExit(f"error: could not find \"version\" in {ASSET_JSON}")
    ASSET_JSON.write_text(new_text, encoding="utf-8")


def set_updates_xml(version):
    text = UPDATES_XML.read_text(encoding="utf-8")
    text, count = re.subn(r"<version>[^<]*</version>", f"<version>{version}</version>", text, count=1)
    if count != 1:
        raise SystemExit(f"error: could not find <version> in {UPDATES_XML}")
    new_url = (
        f"https://github.com/{REPO}/releases/download/"
        f"v{version}/plg_system_{ELEMENT}_v{version}.zip"
    )
    text, count = re.subn(
        r'<downloadurl type="full" format="zip">[^<]*</downloadurl>',
        f'<downloadurl type="full" format="zip">{new_url}</downloadurl>',
        text,
        count=1,
    )
    if count != 1:
        raise SystemExit(f"error: could not find <downloadurl> in {UPDATES_XML}")
    UPDATES_XML.write_text(text, encoding="utf-8")


def main():
    if len(sys.argv) != 2:
        print("usage: scripts/set_version.py X.Y.Z", file=sys.stderr)
        return 1
    version = sys.argv[1]
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        print(f"error: '{version}' doesn't look like a plain X.Y.Z version", file=sys.stderr)
        return 1

    set_manifest_version(version)
    set_asset_json_version(version)
    set_updates_xml(version)
    print(f"set version {version} in fgresponsivetables.xml, media/joomla.asset.json, updates.xml")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
