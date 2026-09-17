"""Fail if the public scaffold grows vendor names, identity, or live money IDs."""
from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Bred brancheliste med vilje: den må ikke afsløre, hvilke udbydere nogen bruger privat.
BLOCK = re.compile(
    r"ownr|forsia|nasdaq|motorapi|lunar|revolut|wise|danske|nykredit|nordea|"
    r"jyske bank|jyskebank|sydbank|sparnord|spar nord|saxobank|saxo bank|bunq|monzo|"
    r"totalkredit|topdanmark|gjensidige|almbrand|alm\. brand|codan|danica|velliv|"
    r"bilbasen|boligsiden|gmail|"
    r"eboks|e-boks|mit\.dk|mitid|tastselv|stefan|rosenlund|privat-okonomi",
    re.I,
)
CPR = re.compile(r"\b\d{6}-?\d{4}\b")
IBAN = re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,}\b")
ALLOWED_DESC = {
    "Løn",
    "Husleje",
    "Dagligvarer",
    "Transport",
    "Kaffe",
    "Streaming",
    "Forsyning",
    "Overførsel til opsparing",
    "Overførsel fra daglig",
    "Forsikring",
    "Brændstof",
    "Apotek",
    "Restaurant",
}
SKIP_NAMES = {".git", "node_modules", ".venv", "__pycache__"}
DOC_ALLOW_BANKMCP = {"BankMCP", "Enable Banking"}


def tracked_text_files() -> list[Path]:
    roots = [ROOT / "app", ROOT / "taxonomy", ROOT / "docs", ROOT / "config", ROOT / "scripts", ROOT / "start"]
    files: list[Path] = []
    for base in roots:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            if any(part in SKIP_NAMES for part in path.parts):
                continue
            if path.suffix.lower() in {".woff", ".woff2", ".png", ".jpg", ".pdf"}:
                continue
            files.append(path)
    return files


class PrivacyTests(unittest.TestCase):
    def test_tracked_app_docs_have_no_sensitive_tokens(self):
        hits = []
        for path in tracked_text_files():
            rel = str(path.relative_to(ROOT))
            text = path.read_text(encoding="utf-8", errors="ignore")
            if rel == "LICENSE":
                continue
            cleaned = re.sub(
                r"https://github\.com/srosenlund/personal-finance-dashboard",
                "",
                text,
            )
            if BLOCK.search(cleaned):
                hits.append(rel)
            if CPR.search(cleaned):
                hits.append(f"{rel}:cpr")
            if IBAN.search(cleaned) and path.suffix != ".md":
                hits.append(f"{rel}:iban")
        self.assertEqual(hits, [], msg="sensitive tokens in " + ", ".join(hits))

    def test_demo_payload_contract(self):
        path = ROOT / "app" / "data" / "demo-payload.json"
        self.assertTrue(path.is_file(), "demo-payload.json missing")
        data = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(data["format"], "pfd-demo-payload/1")
        self.assertEqual(len(data["accounts"]), 4)
        n = len(data["txns"])
        self.assertGreaterEqual(n, 80)
        self.assertLessEqual(n, 450)
        self.assertTrue(any(t.get("x") == 1 for t in data["txns"]))
        for acc in data["accounts"]:
            self.assertEqual(len(str(acc["iban_last4"])), 4)
            self.assertRegex(str(acc["iban_last4"]), r"^\d{4}$")
        for t in data["txns"]:
            self.assertIn(t["c"], ALLOWED_DESC)
        labels = {a["label"] for a in data["accounts"]}
        self.assertEqual(labels, {"Daglig konto", "Opsparing", "Regninger", "Neobank forbrug"})
        self.assertNotRegex(json.dumps(data), BLOCK)

    def test_nav_tabs_include_life_os_icons(self):
        html = (ROOT / "app" / "index.html").read_text(encoding="utf-8")
        tabs = re.findall(
            r'<a href="#/[^"]+" class="tab[^"]*" data-view="([^"]+)"[^>]*>(.*?)</a>',
            html,
            re.S,
        )
        expected = {
            "overblik", "konti", "ingest", "forsikring", "bil", "bolig",
            "skat", "transaktioner", "aarsbudget", "ontologi", "indstillinger",
        }
        self.assertEqual({name for name, _ in tabs}, expected)
        for name, inner in tabs:
            self.assertIn("<svg", inner, name)
            self.assertIn('class="icon"', inner, name)
        self.assertIn('id="themeToggle"', html)
        self.assertIn("theme-icon-sun", html)
        self.assertIn("theme-icon-moon", html)

    def test_ingest_rows_have_value_and_status(self):
        data = json.loads((ROOT / "app" / "data" / "demo-payload.json").read_text(encoding="utf-8"))
        domains = data["ingest"]["requirements"]["domains"]
        self.assertEqual({d["id"] for d in domains}, {"bolig", "forsikring", "bil", "skat"})
        for domain in domains:
            for row in domain["rows"]:
                self.assertEqual(row["status"], "documented", row["id"])
                self.assertTrue(row.get("value"), row["id"])
                self.assertTrue(row.get("as_of"), row["id"])
                self.assertTrue(row.get("next"), row["id"])

    def test_aarsbudget_renderer_uses_spend_cards(self):
        app = (ROOT / "app" / "js" / "app.js").read_text(encoding="utf-8")
        self.assertIn("spendCards", app)
        self.assertIn("data-sec", app)
        self.assertIn("paintBudgetExpand", app)
        self.assertIn("function renderBudget", app)


if __name__ == "__main__":
    unittest.main()
