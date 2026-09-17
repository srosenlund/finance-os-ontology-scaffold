/* Slim demo domain. No private account lists. Transfers (x=1) are not spend. */
(function (root) {
  "use strict";

  function createDomain(DATA, state) {
    state = state || {};
    const overrides = state.overrides || {};

    function matchRule(description) {
      const desc = String(description || "");
      const rules = (DATA.rules || []).concat(state.customRules || []);
      for (const rule of rules) {
        const needles = rule.match || [];
        if (needles.some((n) => n && desc === n)) {
          return { cat: rule.cat, sub: rule.sub || "", ruleId: rule.id };
        }
      }
      return null;
    }

    function classifyDescription(description, fallback) {
      const hit = matchRule(description);
      if (hit) return { cat: hit.cat, sub: hit.sub, x: 0, ruleId: hit.ruleId };
      if (fallback) return fallback;
      return { cat: "uncategorized", sub: "", x: 0 };
    }

    function effective(t) {
      const ovr = overrides[t.id];
      if (ovr) {
        return {
          cat: ovr.cat || t.cat,
          sub: ovr.sub != null ? ovr.sub : t.sub,
          x: ovr.x != null ? ovr.x : t.x,
        };
      }
      if (!t.cat || t.cat === "uncategorized") {
        const hit = matchRule(t.c);
        if (hit) return { cat: hit.cat, sub: hit.sub, x: t.x || 0 };
      }
      return { cat: t.cat, sub: t.sub, x: t.x };
    }

    function buildBudgetIndex() {
      const map = new Map();
      const sections = (DATA.budget && DATA.budget.sections) || [];
      for (const sec of sections) {
        for (const m of sec.taxonomy_map || []) {
          const key = m.category_id + "|" + (m.subcategory_id || "");
          if (!map.has(key)) map.set(key, { section: sec, childId: m.budget_child });
        }
      }
      return { map, sections };
    }

    const BUDGET_IDX = buildBudgetIndex();

    function mapToBudget(cat, sub) {
      const exact = BUDGET_IDX.map.get(cat + "|" + (sub || ""));
      const fal = BUDGET_IDX.map.get(cat + "|");
      if (exact) return exact;
      if (fal) return fal;
      const diverse = BUDGET_IDX.sections.find((s) => s.id === "diverse");
      return { section: diverse, childId: "div_andet" };
    }

    function yearSpend(year) {
      const sections = (DATA.budget && DATA.budget.sections) || [];
      const spend = {};
      const system = {};
      for (const s of sections) {
        const bucket = { total: 0, children: {} };
        for (const c of s.children || []) bucket.children[c.id] = { label: c.label_da, total: 0 };
        (s.kind === "spend" ? spend : system)[s.id] = { label: s.label_da, kind: s.kind, ...bucket };
      }
      let spendTotal = 0;
      for (const t of DATA.txns || []) {
        if (!(t.d || "").startsWith(String(year))) continue;
        const e = effective(t);
        const mapped = mapToBudget(e.cat, e.sub);
        if (!mapped || !mapped.section) continue;
        const sec = mapped.section;
        const target = sec.kind === "spend" ? spend[sec.id] : system[sec.id];
        if (!target) continue;
        const amt = Number(t.amt) || 0;
        let add = 0;
        if (sec.kind === "spend") {
          if (e.x) continue;
          if (amt >= 0) continue;
          add = Math.abs(amt);
          spendTotal += add;
        } else if (sec.id === "indkomst") {
          if (amt <= 0) continue;
          add = amt;
        } else {
          add = Math.abs(amt);
        }
        target.total += add;
        const cid = mapped.childId;
        if (cid && target.children[cid]) target.children[cid].total += add;
      }
      return { spend, system, spendTotal };
    }

    function diverseStats(year) {
      const ys = yearSpend(year);
      const div = (ys.spend && ys.spend.diverse && ys.spend.diverse.total) || 0;
      const pct = ys.spendTotal ? (100 * div) / ys.spendTotal : 0;
      const top = topTxnsForSection("diverse", year);
      const y = String(year || "");
      let nUncat = 0;
      for (const t of DATA.txns || []) {
        if (!(t.d || "").startsWith(y)) continue;
        const e = effective(t);
        if (!e.cat || e.cat === "uncategorized") nUncat += 1;
      }
      return { div, pct, spendTotal: ys.spendTotal, nUncat, top };
    }

    function topTxnsForSection(sectionId, year) {
      const y = String(year || "");
      const sections = (DATA.budget && DATA.budget.sections) || [];
      const secMeta = sections.find((s) => s.id === sectionId);
      if (!secMeta) return [];
      const isSpend = secMeta.kind === "spend";
      const result = [];
      for (const t of DATA.txns || []) {
        if (!(t.d || "").startsWith(y)) continue;
        const amt = Number(t.amt) || 0;
        const e = effective(t);
        const mapped = mapToBudget(e.cat, e.sub);
        if (!mapped || !mapped.section || mapped.section.id !== sectionId) continue;
        if (isSpend) {
          if (e.x) continue;
          if (amt >= 0) continue;
        } else if (sectionId === "indkomst") {
          if (amt <= 0) continue;
        }
        result.push({ t, e, abs: Math.abs(amt), mapped });
      }
      result.sort((a, b) => b.abs - a.abs);
      return result.slice(0, 3);
    }

    function insuranceCash(year) {
      const y = String(year || "");
      const rows = [];
      let total = 0;
      for (const t of DATA.txns || []) {
        if (!(t.d || "").startsWith(y)) continue;
        const e = effective(t);
        if (e.x) continue;
        if (e.cat !== "insurance") continue;
        const amt = Number(t.amt) || 0;
        if (amt >= 0) continue;
        total += Math.abs(amt);
        rows.push(t);
      }
      rows.sort((a, b) => Math.abs(b.amt) - Math.abs(a.amt));
      return { total, transactions: rows };
    }

    function dashboardYears(endYear, mode) {
      mode = mode || "period";
      const dates = (DATA.txns || []).map((t) => t.d).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
      const asOf = /^\d{4}-\d{2}-\d{2}$/.test(DATA.as_of || "") ? DATA.as_of : dates[dates.length - 1];
      if (!asOf || !Number.isInteger(Number(endYear))) return [];
      return [Number(endYear) - 2, Number(endYear) - 1, Number(endYear)].map((year) => {
        let until = year + "-" + (mode === "period" ? asOf.slice(5) : "12-31");
        if (until > asOf) until = asOf;
        const rows = (DATA.txns || []).filter((t) => (t.d || "").startsWith(year + "-") && t.d <= until);
        return {
          year: String(year),
          until,
          available: rows.length > 0,
          partial: until < year + "-12-31",
          count: rows.length,
          totals: rows.length ? createDomain({ ...DATA, txns: rows }, state).yearSpend(String(year)) : null,
        };
      });
    }

    return {
      effective,
      matchRule,
      classifyDescription,
      mapToBudget,
      yearSpend,
      diverseStats,
      topTxnsForSection,
      insuranceCash,
      dashboardYears,
    };
  }

  root.createDomain = createDomain;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createDomain };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
