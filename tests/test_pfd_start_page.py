"""Begyndersiden start/ må ikke drive væk fra docs/START-HER.md."""
import html
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class StartPageTests(unittest.TestCase):
    def test_shared_prompts_match_start_her(self):
        guide = (ROOT / "docs/START-HER.md").read_text(encoding="utf-8")
        page = (ROOT / "start/index.html").read_text(encoding="utf-8")
        shared = re.findall(r'<pre data-src="START-HER"><code>(.*?)</code>', page, re.S)
        self.assertEqual(len(shared), 4)
        for block in shared:
            self.assertIn(html.unescape(block).strip(), guide)


    def test_uses_the_dashboard_stylesheets(self):
        app = (ROOT / "app/index.html").read_text(encoding="utf-8")
        page = (ROOT / "start/index.html").read_text(encoding="utf-8")
        for css in re.findall(r'href="(css/[a-z-]+\.css)"', app):
            if "sot-map" not in css:
                self.assertIn(f'href="../app/{css}"', page)


if __name__ == "__main__":
    unittest.main()
