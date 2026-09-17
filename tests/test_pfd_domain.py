"""Demo domain: transfers out of spend, known 2026 total, Cash ≠ Current."""
from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / "app" / "data" / "demo-payload.json"
DOMAIN = ROOT / "app" / "js" / "domain.js"


def domain_eval(expr: str) -> str:
    script = f"""
const {{ createDomain }} = require({json.dumps(str(DOMAIN))});
const DATA = require({json.dumps(str(PAYLOAD))});
const domain = createDomain(DATA, {{ overrides: {{}} }});
process.stdout.write(JSON.stringify({expr}));
"""
    return subprocess.check_output(["node", "-e", script], text=True)


class DomainTests(unittest.TestCase):
    def test_2026_spend_excludes_transfers_and_matches_fixture(self):
        data = json.loads(PAYLOAD.read_text(encoding="utf-8"))
        expected = 0.0
        for t in data["txns"]:
            if not str(t["d"]).startswith("2026"):
                continue
            if t.get("x") == 1:
                continue
            amt = float(t["amt"])
            if amt >= 0:
                continue
            expected += abs(amt)
        spent = json.loads(domain_eval("domain.yearSpend('2026').spendTotal"))
        self.assertEqual(spent, expected)
        self.assertGreater(spent, 0)

    def test_cash_does_not_equal_current_loan_balance(self):
        data = json.loads(PAYLOAD.read_text(encoding="utf-8"))
        balance = data["housing"]["properties"][0]["loans"][0]["balance"]
        housing_cash = sum(
            abs(float(t["amt"]))
            for t in data["txns"]
            if t.get("x") != 1 and float(t["amt"]) < 0 and t["cat"] == "housing"
        )
        self.assertNotEqual(balance, housing_cash)
        self.assertGreater(balance, 100000)

    def test_salary_is_about_25000_each_month(self):
        data = json.loads(PAYLOAD.read_text(encoding="utf-8"))
        by_month: dict[str, float] = {}
        for t in data["txns"]:
            if t.get("c") != "Løn":
                continue
            month = str(t["d"])[:7]
            by_month[month] = by_month.get(month, 0.0) + float(t["amt"])
        expected = [f"{y}-{m:02d}" for y, last in ((2024, 12), (2025, 12), (2026, 8)) for m in range(1, last + 1)]
        self.assertEqual(sorted(by_month), expected)
        for month, amt in by_month.items():
            self.assertGreaterEqual(amt, 24000, month)
            self.assertLessEqual(amt, 26000, month)

    def test_2025_spend_mix_is_typical_for_25000_income(self):
        mix = json.loads(domain_eval("domain.yearSpend('2025')"))
        spend = mix["spend"]
        total = mix["spendTotal"]
        income = mix["system"]["indkomst"]["total"]
        self.assertGreater(total, 0)
        self.assertAlmostEqual(income / 12, 25000, delta=800)
        self.assertGreater(total / income, 0.62)
        self.assertLess(total / income, 0.88)
        share = {key: spend[key]["total"] / total for key in ("hus", "mad", "transport", "forsikring")}
        self.assertGreater(share["hus"], 0.40)
        self.assertLess(share["hus"], 0.66)
        self.assertGreater(share["mad"], 0.18)
        self.assertLess(share["mad"], 0.34)
        self.assertGreater(share["transport"], 0.04)
        self.assertLess(share["transport"], 0.14)
        self.assertGreater(share["forsikring"], 0.025)
        self.assertLess(share["forsikring"], 0.10)

    def test_2025_spend_cards_sum_to_total(self):
        mix = json.loads(domain_eval("domain.yearSpend('2025')"))
        card_sum = sum(mix["spend"][k]["total"] for k in mix["spend"])
        self.assertAlmostEqual(card_sum, mix["spendTotal"], places=2)

    def test_hus_children_sum_and_top3_excludes_transfers(self):
        mix = json.loads(domain_eval("domain.yearSpend('2025')"))
        hus = mix["spend"]["hus"]
        child_sum = sum(c["total"] for c in hus["children"].values())
        self.assertAlmostEqual(child_sum, hus["total"], places=2)
        top = json.loads(domain_eval("domain.topTxnsForSection('hus','2025')"))
        self.assertEqual(len(top), 3)
        for row in top:
            self.assertNotEqual(row["t"].get("x"), 1)
            self.assertLess(float(row["t"]["amt"]), 0)
            self.assertEqual(row["mapped"]["section"]["id"], "hus")
            self.assertEqual(row["t"]["cat"], "housing")
        abs_vals = [row["abs"] for row in top]
        self.assertEqual(abs_vals, sorted(abs_vals, reverse=True))

    def test_insurance_cash_matches_insurance_spend(self):
        mix = json.loads(domain_eval("domain.yearSpend('2025')"))
        cash = json.loads(domain_eval("domain.insuranceCash('2025')"))
        self.assertAlmostEqual(cash["total"], mix["spend"]["forsikring"]["total"], places=2)
        self.assertGreater(len(cash["transactions"]), 0)

    def test_streaming_is_not_insurance(self):
        data = json.loads(PAYLOAD.read_text(encoding="utf-8"))
        for t in data["txns"]:
            if t.get("c") == "Streaming":
                self.assertEqual(t["cat"], "leisure", t)
                self.assertEqual(t["sub"], "streaming", t)

    def test_rules_match_salary_description(self):
        hit = json.loads(domain_eval("domain.classifyDescription('Løn')"))
        self.assertEqual(hit["cat"], "income")
        self.assertEqual(hit["sub"], "salary")

    def test_sot_map_has_demo_live_overlay(self):
        data = json.loads(PAYLOAD.read_text(encoding="utf-8"))
        entities = data["sot_map"]["entities"]
        statuses = [e.get("live", {}).get("status") for e in entities]
        self.assertIn("landet", statuses)
        self.assertGreaterEqual(statuses.count("landet"), 4)
        self.assertLess(statuses.count("hul"), len(entities))
        self.assertTrue(data["sot_map"].get("live", {}).get("overlay_at"))


if __name__ == "__main__":
    unittest.main()
