#!/usr/bin/env python3
"""
Generate changelog.xml (Joomla's own changelog format) from
CHANGELOG.md, so the two never drift out of sync.

Schema verified against Joomla's own documentation
(manual.joomla.org/docs/building-extensions/install-update/installation/change-log):
each <changelog> entry needs <element>/<type>/<version>, then
category tags in the SINGULAR (<fix>, <addition>, <change>, <remove>,
<security>, <language>, <note>) each containing plain <item> children
-- not <fixes><fix title="..."> and not <name>/<description>, which
looked plausible but aren't real properties on Joomla's Changelog
class (confirmed live: they triggered PHP 8.2 "dynamic property"
deprecation warnings, see CHANGELOG.md 2.0.18-2.0.21).

The sanitization below exists because Joomla's changelog VIEWER does
not re-escape item text before handing it to the browser, so anything
that decodes back into a real HTML special character shreds the
bullet into fragments (confirmed live, see CHANGELOG.md 2.0.21-2.0.24):
  - a literal <tag> reference decodes back into a real tag and the
    browser parses it as an (unknown) HTML element
  - a literal & (even describing an entity, e.g. "&lt;" as prose)
    decodes back into a real ampersand and the browser reads it as
    the start of an HTML entity
  - an em dash or en dash also splits the bullet into a new one
All three are stripped/replaced below before XML-escaping. If a
future CHANGELOG.md entry still displays broken, look for another
character behaving the same way and add it here.
"""
import re
import sys
import xml.sax.saxutils as sx
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHANGELOG_MD = ROOT / "CHANGELOG.md"
CHANGELOG_XML = ROOT / "changelog.xml"

ELEMENT = "fgresponsivetables"
TYPE = "plugin"


def parse_versions(md_text):
    blocks = re.split(r"^## ", md_text, flags=re.MULTILINE)[1:]
    entries = []
    for block in blocks:
        lines = block.strip().split("\n")
        version = lines[0].strip()
        bullets = [line[2:].strip() for line in lines[1:] if line.strip().startswith("- ")]
        entries.append((version, bullets))
    return entries


def sanitize(text):
    # Markdown formatting we don't want literally in the output.
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\*\*([^*]*)\*\*", r"\1", text)
    # Any <...> span, tag-like or not, down to its bare inner text.
    text = re.sub(r"<([^<>]*)>", r"\1", text)
    # No ampersand of any kind, entity-shaped or not.
    text = text.replace("&", "and")
    # Em/en dashes also split a bullet into a new one.
    text = text.replace(" — ", ", ").replace(" – ", ", ")
    text = text.replace("—", ",").replace("–", ",")
    return text


def build_xml(entries):
    parts = ['<?xml version="1.0" encoding="utf-8"?>', "<changelogs>"]
    for version, bullets in entries:
        parts.append("\t<changelog>")
        parts.append(f"\t\t<element>{ELEMENT}</element>")
        parts.append(f"\t\t<type>{TYPE}</type>")
        parts.append(f"\t\t<version>{version}</version>")
        if bullets:
            parts.append("\t\t<fix>")
            for bullet in bullets:
                clean = sx.escape(sanitize(bullet))
                parts.append(f"\t\t\t<item>{clean}</item>")
            parts.append("\t\t</fix>")
        parts.append("\t</changelog>")
    parts.append("</changelogs>")
    return "\n".join(parts) + "\n"


def main():
    if not CHANGELOG_MD.exists():
        print(f"error: {CHANGELOG_MD} not found", file=sys.stderr)
        return 1

    entries = parse_versions(CHANGELOG_MD.read_text(encoding="utf-8"))
    if not entries:
        print("error: no ## version headings found in CHANGELOG.md", file=sys.stderr)
        return 1

    xml_out = build_xml(entries)
    CHANGELOG_XML.write_text(xml_out, encoding="utf-8")
    print(f"wrote {CHANGELOG_XML} ({len(entries)} versions, top: {entries[0][0]})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
