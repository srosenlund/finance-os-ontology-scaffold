(function () {
  "use strict";

  const VIEWS = [
    "overblik", "konti", "ingest", "forsikring", "bil", "bolig",
    "skat", "transaktioner", "aarsbudget", "ontologi", "indstillinger",
  ];
  const PAGE = 25;
  const LS_MANIFEST = "pfd.pdf.manifest.v1";
  const DB_NAME = "pfd-local";
  const DB_STORE = "pdfs";
  const ZONES = [
    { id: "housing", title: "Bolig / lån", mapsTo: "private_archive", layer: "Current", hint: "Lånetilbud, vilkår" },
    { id: "policy", title: "Forsikring", mapsTo: "policy_archive", layer: "Current", hint: "Policer og vilkår" },
    { id: "tax", title: "SKAT / offentligt", mapsTo: "gov_archive", layer: "Arkiv", hint: "Årsopgørelse, forskud" },
    { id: "vehicle", title: "Bil / mobilitet", mapsTo: "private_archive", layer: "Current", hint: "Finansiering" },
    { id: "other", title: "Andet arkiv", mapsTo: "private_archive", layer: "Arkiv", hint: "Øvrige PDF’er" },
  ];

  let DATA = null;
  let domain = null;
  let bankOverlayLoaded = false;
  const state = {
    view: "overblik",
    year: "2026",
    dashboardYear: "2026",
    dashboardMode: "period",
    overrides: {},
    filters: { year: "2026", account: "", cat: "", uncat: false, q: "", page: 0 },
    txnSort: { key: "d", direction: "desc" },
    selectedId: null,
    budgetExpand: null,
    ingestTab: "requirements",
    reviewDomain: "bolig",
    settingsTab: "connections",
    taxKey: "2026:advance",
    domainYear: "2026",
    status: "",
  };

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }
  function fmtDKK(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", maximumFractionDigits: 0 }).format(n);
  }
  function fmtNum(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(n);
  }
  function pct(a, b) {
    if (!b) return "—";
    return (100 * a / b).toFixed(1).replace(".", ",") + " %";
  }
  function deltaPct(cur, prev) {
    if (prev == null || prev === 0) return null;
    return (100 * (cur - prev) / Math.abs(prev));
  }
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2200);
  }
  function setStatus(text) {
    state.status = text;
    document.getElementById("navStatus").textContent = text;
    document.getElementById("metaLine").textContent = text || "Fiktiv husstand · demo-data";
  }
  function layerNote() {
    return "<p class=\"muted\">Lag: <strong>Register</strong> · <strong>Current</strong> · <strong>Cash</strong> · <strong>Arkiv</strong>. Cash-posteringer erstatter ikke Current-vilkår.</p>";
  }
  function facts(rows) {
    return `<dl class="housing-facts">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
  }
  function catLabel(id) {
    const c = (DATA.categories || []).find((x) => x.id === id);
    return (c && c.label_da) || id || "—";
  }
  function rebuildDomain() {
    domain = createDomain(DATA, state);
  }
  function saveOverrides() {
    const key = (DATA.ls_keys && DATA.ls_keys.overrides) || "pfd-overrides";
    try { localStorage.setItem(key, JSON.stringify(state.overrides)); } catch {}
    rebuildDomain();
  }

  function initTheme() {
    const btn = document.getElementById("themeToggle");
    try { document.documentElement.dataset.theme = localStorage.getItem("pfd-theme") || "dark"; } catch {}
    const sync = () => {
      const light = document.documentElement.dataset.theme === "light";
      const sun = btn.querySelector(".theme-icon-sun");
      const moon = btn.querySelector(".theme-icon-moon");
      const label = document.getElementById("themeLabel");
      if (sun) sun.hidden = light;
      if (moon) moon.hidden = !light;
      if (label) label.textContent = light ? "Mørkt tema" : "Lyst tema";
      else btn.textContent = light ? "Mørkt tema" : "Lyst tema";
    };
    sync();
    btn.onclick = () => {
      const theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      try { localStorage.setItem("pfd-theme", theme); } catch {}
      sync();
    };
  }

  function yearOptions() {
    return Object.keys((DATA.kpis && DATA.kpis.years) || {}).sort().reverse();
  }

  function updateKpis() {
    const el = document.getElementById("kpiStrip");
    if (!el || !domain) return;
    const y = state.filters.year || state.year;
    const st = domain.diverseStats(y);
    el.innerHTML = `
      <span class="chip">År <strong>${esc(y)}</strong></span>
      <span class="chip">Forbrug <strong>${fmtDKK(st.spendTotal)}</strong></span>
      <span class="chip">Diverse <strong>${fmtDKK(st.div)}</strong> (${st.pct.toFixed(1).replace(".", ",")}%)</span>
      <span class="chip">Konti <strong>${fmtNum((DATA.accounts || []).length)}</strong></span>
      <span class="chip">Posteringer <strong>${fmtNum((DATA.txns || []).length)}</strong></span>
    `;
  }

  function setView(name, sotTab) {
    if (!VIEWS.includes(name)) name = "overblik";
    state.view = name;
    document.getElementById("kpiStrip").hidden = !["konti", "transaktioner", "aarsbudget"].includes(name);
    document.querySelectorAll(".tab").forEach((b) => {
      const on = b.dataset.view === name;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
    });
    document.querySelectorAll(".view").forEach((v) => {
      const on = v.id === "view-" + name;
      v.hidden = !on;
      v.classList.toggle("is-active", on);
    });
    if (name === "ontologi") {
      const fromHash = (location.hash.match(/^#\/ontologi\/([\w-]+)/) || [])[1];
      const tab = (window.LifeOsSotMap && LifeOsSotMap.normalizeTab(sotTab || fromHash || "kilder")) || "kilder";
      const next = "#/ontologi/" + tab;
      if (location.hash !== next) location.hash = next;
      renderOntologi(tab);
    } else {
      const next = "#/" + name;
      if (location.hash !== next) location.hash = next;
      if (name === "overblik") renderOverblik();
      if (name === "konti") renderKonti();
      if (name === "ingest") renderIngest();
      if (name === "forsikring") renderForsikring();
      if (name === "bil") renderBil();
      if (name === "bolig") renderBolig();
      if (name === "skat") renderSkat();
      if (name === "transaktioner") renderTxns();
      if (name === "aarsbudget") renderBudget();
      if (name === "indstillinger") renderSettings();
    }
    updateKpis();
  }

  function dashboardChart(years, sections) {
    const w = 640, h = 220, pad = 36;
    const max = Math.max(1, ...years.map((y) => y.totals ? y.totals.spendTotal : 0));
    const bw = (w - pad * 2) / years.length;
    const bars = years.map((y, i) => {
      let stacked = 0;
      const parts = sections.map((s, n) => {
        const val = y.totals ? (y.totals.spend[s.id]?.total || 0) : 0;
        const bh = (val / max) * (h - pad * 1.4);
        const x = pad + i * bw + bw * 0.22;
        const yy = h - pad - stacked - bh;
        stacked += bh;
        return `<rect x="${x}" y="${yy}" width="${bw * 0.56}" height="${Math.max(0, bh)}" fill="var(--dash-${n})"/>`;
      }).join("");
      return `${parts}<text class="dash-year" x="${pad + i * bw + bw / 2}" y="${h - 10}" text-anchor="middle">${y.year}</text>`;
    }).join("");
    return `<svg class="dash-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Forbrug over tre år">${bars}</svg>`;
  }

  function renderOverblik() {
    const el = document.getElementById("view-overblik");
    const options = yearOptions();
    if (!options.length) {
      el.innerHTML = "<div class=\"dash-panel\"><h2>Dit økonomiske overblik</h2><p>Der er endnu ingen posteringer at vise.</p></div>";
      return;
    }
    const selected = state.dashboardYear || options[0];
    const mode = state.dashboardMode || "period";
    const years = domain.dashboardYears(Number(selected), mode);
    if (!years.length) {
      el.innerHTML = "<p>Der mangler en dato for datagrundlaget.</p>";
      return;
    }
    const latest = years[2], previous = years[1];
    const sections = (DATA.budget?.sections || []).filter((s) => s.kind === "spend");
    const amount = latest.totals?.spendTotal;
    const income = latest.totals?.system.indkomst?.total;
    const diverse = latest.totals?.spend.diverse?.total;
    const change = latest.available && previous.available ? deltaPct(amount, previous.totals.spendTotal) : null;
    const total = amount || 0;
    const ordered = sections.map((s, n) => ({ ...s, color: n, total: latest.totals?.spend[s.id]?.total || 0 }))
      .sort((a, b) => b.total - a.total);
    let offset = 0;
    const arcs = ordered.map((s) => {
      const share = total ? s.total / total * 100 : 0;
      const arc = `<circle cx="100" cy="100" r="76" pathLength="100" fill="none" stroke="var(--dash-${s.color})" stroke-width="22" stroke-dasharray="${share} ${100 - share}" stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)"/>`;
      offset += share;
      return share ? arc : "";
    }).join("");
    const legend = sections.map((s, n) => `<span><i style="background:var(--dash-${n})"></i>${esc(s.label_da)}</span>`).join("");
    const periodEnd = new Date(latest.until + "T12:00:00Z").toLocaleDateString("da-DK", { day: "numeric", month: "short", timeZone: "UTC" });
    const periodText = mode === "period" ? `1. jan. – ${periodEnd} i hvert år` : `Hele kalenderår${latest.partial ? ` · ${selected} foreløbigt til ${periodEnd}` : ""}`;
    el.innerHTML = `
      <div class="dash-heading">
        <div><p class="dash-eyebrow">DIT ØKONOMISKE OVERBLIK</p><h2>De store linjer.</h2><p class="muted">${years[0].year}–${selected} · ${esc(periodText)}</p></div>
        <div class="dash-controls">
          <label>Seneste år<select id="dashYear">${options.map((y) => `<option ${y === selected ? "selected" : ""}>${y}</option>`).join("")}</select></label>
          <label>Sammenligning<select id="dashMode">
            <option value="period" ${mode === "period" ? "selected" : ""}>Samme periode</option>
            <option value="full" ${mode === "full" ? "selected" : ""}>Hele kalenderår</option>
          </select></label>
        </div>
      </div>
      <div class="dash-metrics">
        <article class="dash-metric dash-primary"><span class="dash-eyebrow">Forbrug · ${selected}</span><strong>${fmtDKK(amount)}</strong><span>Registreret udgående cash</span></article>
        <article class="dash-metric dash-sand"><span class="dash-eyebrow">Indkomst</span><strong>${fmtDKK(income)}</strong><span>Ikke formue</span></article>
        <article class="dash-metric"><span class="dash-eyebrow">Forbrug vs. ${previous.year}</span><strong>${change == null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(1).replace(".", ",")} %`}</strong><span>Samme demo-periode</span></article>
        <button class="dash-metric dash-review" data-budget="diverse"><span class="dash-eyebrow">Diverse · ${selected}</span><strong>${fmtDKK(diverse)}</strong><span>${latest.available ? pct(diverse, total) + " af forbruget · Gennemgå i Årsbudget →" : "Ingen data"}</span></button>
      </div>
      <div class="dash-layout">
        <section class="dash-panel dash-evolution"><div class="dash-panel-head"><div><p class="dash-eyebrow">TRE ÅRS PERSPEKTIV</p><h3>Hvordan udvikler forbruget sig?</h3></div></div>
          ${dashboardChart(years, sections)}<div class="dash-legend">${legend}</div>
        </section>
        <section class="dash-panel dash-distribution"><p class="dash-eyebrow">FORDELING · ${selected}</p><h3>Hvor går pengene hen?</h3>
          ${latest.available && total > 0 ? `<svg viewBox="0 0 200 200" class="dash-donut" role="img" aria-label="Forbrugsfordeling">${arcs}<text x="100" y="97" text-anchor="middle" class="dash-donut-value">${pct(ordered[0].total, total)}</text><text x="100" y="119" text-anchor="middle" class="dash-axis">${esc(ordered[0].label_da)}</text></svg>` : "<p>Intet registreret forbrug.</p>"}
        </section>
        <section class="dash-panel dash-categories"><div class="dash-panel-head"><div><p class="dash-eyebrow">KATEGORIER FRA ÅRSBUDGET</p><h3>Dit forbrug, kategori for kategori</h3></div>
          <button class="btn" id="dashBudget">Åbn hele ${selected} i Årsbudget →</button></div>
          <div class="dash-category-list">${ordered.map((s) => {
            const prev = previous.totals?.spend[s.id]?.total;
            const delta = latest.available && previous.available ? deltaPct(s.total, prev) : null;
            return `<button class="dash-category" data-budget="${esc(s.id)}"><span class="dash-category-title"><i style="background:var(--dash-${s.color})"></i>${esc(s.label_da)}</span><strong>${fmtDKK(s.total)}</strong><span class="dash-track"><i style="width:${total ? s.total / total * 100 : 0}%;background:var(--dash-${s.color})"></i></span><span class="muted">${pct(s.total, total)} af forbrug${delta == null ? "" : ` · ${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")} % vs. ${previous.year}`}</span></button>`;
          }).join("")}</div>
        </section>
      </div>
      <section class="dash-panel dash-data"><div class="dash-panel-head"><div><p class="dash-eyebrow">TALLENE BAG GRAFERNE</p><h3>Sammenlign på tværs af år</h3></div></div>
        <div class="dash-table-scroll" tabindex="0" role="region" aria-label="Budgetkategorier over tre år"><table><caption>${esc(periodText)}. Beløb i kroner.</caption><thead><tr><th scope="col">Budgetkategori</th>${years.map((y) => `<th scope="col" class="num">${y.year}</th>`).join("")}</tr></thead><tbody>
        ${sections.map((s) => `<tr><th scope="row">${esc(s.label_da)}</th>${years.map((y) => `<td class="num">${y.available ? fmtDKK(y.totals.spend[s.id]?.total || 0) : "—"}</td>`).join("")}</tr>`).join("")}
        <tr class="dash-total"><th scope="row">Samlet forbrug</th>${years.map((y) => `<td class="num">${fmtDKK(y.totals?.spendTotal)}</td>`).join("")}</tr>
        <tr><th scope="row">Indkomst</th>${years.map((y) => `<td class="num">${fmtDKK(y.totals?.system.indkomst?.total)}</td>`).join("")}</tr>
        </tbody></table></div>
      </section>
      <section class="dash-other"><p class="dash-eyebrow">SÆRSKILT FRA FORBRUG</p><h3>Øvrige bevægelser · ${selected}</h3>
        <div class="dash-system-grid">
          <button class="dash-system" data-budget="indkomst"><span>Indkomst</span><strong>${fmtDKK(latest.totals?.system.indkomst?.total)}</strong><span class="muted">Se hele året →</span></button>
        </div>
      </section>
      <p class="dash-footnote">Datagrundlag pr. ${esc(DATA.as_of)}. Demo-beløb. Ingen fremskrivning. Interne overførsler følger Årsbudgettets afgrænsning.</p>
    `;
    el.querySelector("#dashYear").onchange = (e) => { state.dashboardYear = e.target.value; renderOverblik(); };
    el.querySelector("#dashMode").onchange = (e) => { state.dashboardMode = e.target.value; renderOverblik(); };
    el.querySelector("#dashBudget").onclick = () => { state.year = selected; state.budgetExpand = null; setView("aarsbudget"); };
    el.querySelectorAll("[data-budget]").forEach((btn) => {
      btn.onclick = () => { state.year = selected; state.budgetExpand = btn.dataset.budget; setView("aarsbudget"); };
    });
  }

  function renderKonti() {
    const el = document.getElementById("view-konti");
    const k = DATA.kpis || {};
    const years = k.years || {};
    const yearKeys = Object.keys(years).sort();
    el.innerHTML = `
      <div class="page-heading"><p class="muted">CASH</p><h2>Dine konti.</h2><p class="muted">Demo-konti. IBAN kun sidste fire.</p></div>
      <div class="kpis">
        <div class="kpi"><div class="label">Konti</div><div class="value">${k.accounts || 0}</div></div>
        <div class="kpi"><div class="label">Transaktioner</div><div class="value">${fmtNum(k.txns || 0)}</div></div>
        <div class="kpi"><div class="label">Regler</div><div class="value">${k.rules || 0}</div></div>
        <div class="kpi"><div class="label">Overførselskanter</div><div class="value">${k.transfer_edges || 0}</div></div>
        <div class="kpi"><div class="label">År dækket</div><div class="value">${yearKeys.length}</div></div>
      </div>
      <h2>Konti</h2>
      <table><thead><tr><th>Konto</th><th>Rolle</th><th>Valuta</th><th class="num">Booked</th><th class="num">Txns</th><th>IBAN</th></tr></thead>
      <tbody>${(DATA.accounts || []).map((a) => `<tr>
        <td>${esc(a.label)}</td><td><span class="role">${esc(a.role)}</span></td><td>${esc(a.currency)}</td>
        <td class="num ${(a.booked || 0) < 0 ? "neg" : "pos"}">${a.currency === "EUR" ? Number(a.booked).toFixed(2) + " EUR" : fmtDKK(a.booked)}</td>
        <td class="num">${fmtNum(a.txn_count)}</td><td>…${esc(a.iban_last4)}</td>
      </tr>`).join("")}</tbody></table>
      <h2>Overførselsflow (hub: ${esc((DATA.hub_flow && DATA.hub_flow.hub) || "Daglig konto")})</h2>
      <div class="hub">
        <div class="col"><strong>Ind</strong><ul>${((DATA.hub_flow && DATA.hub_flow.incoming) || []).map((e) => `<li>${esc(e.from)} <span class="muted">×${e.evidence}</span></li>`).join("")}</ul></div>
        <div class="center">→ hub →</div>
        <div class="col"><strong>Ud</strong><ul>${((DATA.hub_flow && DATA.hub_flow.outgoing) || []).map((e) => `<li>${esc(e.to)} <span class="muted">×${e.evidence}</span></li>`).join("")}</ul></div>
      </div>
      <h2>Kategorier (taxonomy)</h2>
      <table><thead><tr><th>Top</th><th>Børn</th></tr></thead>
      <tbody>${(DATA.categories || []).map((c) => `<tr><td>${esc(c.label_da)} <span class="muted">(${esc(c.id)})</span></td><td>${(c.children || []).map((ch) => esc(ch.label_da)).join(", ") || "—"}</td></tr>`).join("")}</tbody></table>
      <h2>Txn-volumen pr. år</h2>
      <table><thead><tr><th>År</th><th class="num">Antal</th></tr></thead>
      <tbody>${yearKeys.map((y) => `<tr><td>${y}</td><td class="num">${fmtNum(years[y])}</td></tr>`).join("")}</tbody></table>
    `;
  }

  function cashYearPanel(title, year, rows) {
    const total = rows.reduce((s, t) => s + Math.abs(Number(t.amt) || 0), 0);
    return `<section class="dash-panel"><h3>${esc(title)} · ${esc(year)}</h3>
      <p class="muted">Cash · kontant drift. Erstatter ikke Current-vilkår.</p>
      ${facts([["Registreret cash", fmtDKK(total)], ["Poster", String(rows.length)]])}
      ${rows.length ? `<div class="dash-table-scroll"><table><thead><tr><th>Dato</th><th>Tekst</th><th class="num">Beløb</th></tr></thead>
      <tbody>${rows.slice(0, 8).map((t) => `<tr><td>${esc(t.d)}</td><td>${esc(t.c)}</td><td class="num">${fmtDKK(t.amt)}</td></tr>`).join("")}</tbody></table></div>` : "<p>Ingen cash-poster i året.</p>"}
    </section>`;
  }

  function yearPicker(id, year) {
    return `<label>Regnskabsår <select id="${id}">${yearOptions().map((y) => `<option ${y === year ? "selected" : ""}>${y}</option>`).join("")}</select></label>`;
  }

  function renderBolig() {
    const el = document.getElementById("view-bolig");
    const p = (DATA.housing && DATA.housing.properties && DATA.housing.properties[0]) || null;
    if (!p) {
      el.innerHTML = "<div class=\"page-heading\"><h2>Bolig</h2><p>Ingen ejendom i demo-payload.</p></div>";
      return;
    }
    const loan = (p.loans || [])[0];
    const lien = (p.liens || [])[0];
    const year = state.domainYear || yearOptions()[0];
    const cash = (DATA.txns || []).filter((t) => (t.d || "").startsWith(year) && t.cat === "housing" && !t.x && Number(t.amt) < 0);
    el.innerHTML = `
      <div class="page-heading"><p class="muted">REGISTER · CURRENT</p><h2>${esc(p.label)}.</h2><p>${esc(p.use)}</p>${yearPicker("boligYear", year)}</div>
      ${layerNote()}
      <section class="dash-panel"><h3>Current-lån</h3>
        ${facts([["Restgæld", fmtDKK(loan.balance)], ["Ydelse", fmtDKK(loan.payment)], ["Rente", loan.rate_pct + " %"], ["Vilkår pr.", loan.as_of]])}
        <p class="muted">Current-vilkår. Summen af husleje-posteringer i cash er ikke restgæld.</p>
      </section>
      <section class="dash-panel"><h3>Register</h3>
        ${facts([["Hæftelse", lien.label], ["Tinglyst hovedstol", fmtDKK(lien.principal)]])}
        <p class="muted">Hovedstol er register, ikke Current-saldo.</p>
      </section>
      ${cashYearPanel("Husleje og forbrug", year, cash)}
      <p><a class="btn" href="#/ingest">Se datakrav i Ingest</a></p>
    `;
    el.querySelector("#boligYear").onchange = (e) => { state.domainYear = e.target.value; renderBolig(); };
  }

  function renderBil() {
    const el = document.getElementById("view-bil");
    const v = DATA.vehicle || {};
    const year = state.domainYear || yearOptions()[0];
    const cash = (DATA.txns || []).filter((t) => (t.d || "").startsWith(year) && t.cat === "transport" && !t.x && Number(t.amt) < 0);
    el.innerHTML = `
      <div class="page-heading"><p class="muted">MOBILITET</p><h2>${esc(v.label || "Køretøj")}.</h2>${yearPicker("bilYear", year)}</div>
      ${layerNote()}
      <section class="dash-panel"><h3>Register</h3>${facts([["Genstand", v.label], ["Lag", v.layer]])}</section>
      <section class="dash-panel"><h3>Current finansiering</h3>
        ${facts([["Form", v.financing_mode], ["Ydelse", fmtDKK(v.payment)], ["Rente", v.rate_pct + " %"], ["Lag", v.layer_finance]])}
        <p class="muted">Current-vilkår. Brændstof og transit i cash er ikke restgæld.</p>
      </section>
      ${cashYearPanel("Drift og betalinger", year, cash)}
      <p><a class="btn" href="#/ingest">Se datakrav i Ingest</a></p>
    `;
    el.querySelector("#bilYear").onchange = (e) => { state.domainYear = e.target.value; renderBil(); };
  }

  function renderForsikring() {
    const el = document.getElementById("view-forsikring");
    const policies = (DATA.insurance && DATA.insurance.policies) || [];
    const year = state.domainYear || yearOptions()[0];
    const cash = domain.insuranceCash(year);
    const annual = policies.reduce((s, p) => s + (Number(p.premium) || 0), 0);
    el.innerHTML = `
      <div class="page-heading"><p class="muted">BESKYTTELSE</p><h2>Dine forsikringer.</h2>
        <p>Current-policer først; bankbetalinger er kontant drift.</p>${yearPicker("insYear", year)}</div>
      ${layerNote()}
      <div class="dash-metrics">
        <article class="dash-metric dash-primary"><span class="dash-eyebrow">Aktive policer</span><strong>${policies.length}</strong><span>Current · demo</span></article>
        <article class="dash-metric"><span class="dash-eyebrow">Aftalt årspræmie</span><strong>${fmtDKK(annual)}</strong><span>Current · ikke fremskrevet fra bank</span></article>
        <article class="dash-metric"><span class="dash-eyebrow">Betalt · ${year}</span><strong>${fmtDKK(cash.total)}</strong><span>Cash · udgående posteringer</span></article>
      </div>
      ${policies.map((p) => `<section class="dash-panel"><h3>${esc(p.label)}</h3>
        ${facts([["Objekt", p.object], ["Præmie / år", fmtDKK(p.premium)], ["Fornyelse", p.renewal], ["Lag", p.layer]])}
      </section>`).join("")}
      <section class="dash-panel"><h3>Betalinger · ${esc(year)}</h3>
        <p class="muted">Genkendt via kategori Forsikring i demo-cash.</p>
        ${cash.transactions.length ? `<div class="dash-table-scroll"><table><thead><tr><th>Dato</th><th>Konto / postering</th><th class="num">Beløb</th><th></th></tr></thead>
        <tbody>${cash.transactions.slice(0, 12).map((t) => `<tr><td>${esc(t.d)}</td><td>${esc(t.a)}<br>${esc(t.c)}</td><td class="num">${fmtDKK(t.amt)}</td>
          <td><button class="btn" data-ins-txn="${esc(t.id)}">Se postering</button></td></tr>`).join("")}</tbody></table></div>` : "<p>Ingen forsikringsposter i året.</p>"}
      </section>
      <p><a class="btn" href="#/ingest">Se datakrav i Ingest</a></p>
    `;
    el.querySelector("#insYear").onchange = (e) => { state.domainYear = e.target.value; renderForsikring(); };
    el.querySelectorAll("[data-ins-txn]").forEach((btn) => {
      btn.onclick = () => {
        state.filters.q = "";
        state.filters.page = 0;
        setView("transaktioner");
        setTimeout(() => openDrawer(btn.dataset.insTxn), 40);
      };
    });
  }

  function renderSkat() {
    const el = document.getElementById("view-skat");
    const st = DATA.tax || {};
    const statements = st.statements || [];
    const key = state.taxKey || (statements[0] ? `${statements[0].year}:${statements[0].basis}` : "");
    const period = statements.find((s) => `${s.year}:${s.basis}` === key) || statements[0];
    el.innerHTML = `
      <div class="page-heading"><p class="muted">SKAT</p><h2>Forskud og års.</h2>
        <p>Current-erklæringer. Ejendomsskat er ikke Årsbudget-forbrug.</p>
        <label>Opgørelse<select id="skatContext">${statements.map((s) => {
          const k = `${s.year}:${s.basis}`;
          const label = (s.basis === "annual" ? "Årsopgørelse" : "Forskud") + " " + s.year;
          return `<option value="${esc(k)}" ${period && k === `${period.year}:${period.basis}` ? "selected" : ""}>${esc(label)}</option>`;
        }).join("")}</select></label>
      </div>
      ${layerNote()}
      <section class="dash-panel"><h3>${esc(period ? period.label : "Opgørelse")}</h3>
        ${facts([["År", period ? String(period.year) : "—"], ["Type", period ? (period.basis === "annual" ? "Årsopgørelse" : "Forskud") : "—"], ["Lag", period ? period.layer : "—"]])}
      </section>
      <section class="dash-panel"><h3>Ejendomsskat</h3>
        ${facts((st.property_taxes || []).map((s) => [s.label + " " + s.year, fmtDKK(s.amount)]))}
        <p class="muted">Current. Tælles ikke igen i Årsbudget-forbrug.</p>
      </section>
      <p><a class="btn" href="#/ingest">Se datakrav i Ingest</a></p>
    `;
    el.querySelector("#skatContext").onchange = (e) => { state.taxKey = e.target.value; renderSkat(); };
  }

  function filteredTxns() {
    const f = state.filters;
    let rows = (DATA.txns || []).slice();
    if (f.year) rows = rows.filter((t) => (t.d || "").startsWith(f.year));
    if (f.account) rows = rows.filter((t) => t.a === f.account);
    if (f.cat) rows = rows.filter((t) => domain.effective(t).cat === f.cat);
    if (f.uncat) rows = rows.filter((t) => {
      const e = domain.effective(t);
      return !e.cat || e.cat === "uncategorized";
    });
    if (f.q) {
      const q = f.q.toLowerCase();
      rows = rows.filter((t) => (t.c || "").toLowerCase().includes(q) || (t.a || "").toLowerCase().includes(q) || (t.id || "").toLowerCase().includes(q));
    }
    const sort = state.txnSort || { key: "d", direction: "desc" };
    const dir = sort.direction === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const ea = domain.effective(a), eb = domain.effective(b);
      let av, bv;
      if (sort.key === "amt") { av = Number(a.amt) || 0; bv = Number(b.amt) || 0; }
      else if (sort.key === "cat") { av = ea.cat || ""; bv = eb.cat || ""; }
      else if (sort.key === "a") { av = a.a || ""; bv = b.a || ""; }
      else if (sort.key === "c") { av = a.c || ""; bv = b.c || ""; }
      else { av = a.d || ""; bv = b.d || ""; }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return rows;
  }

  function renderTxns() {
    const el = document.getElementById("view-transaktioner");
    const f = state.filters;
    const rows = filteredTxns();
    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    if (f.page >= pages) f.page = pages - 1;
    if (f.page < 0) f.page = 0;
    const slice = rows.slice(f.page * PAGE, f.page * PAGE + PAGE);
    const accounts = [...new Set((DATA.txns || []).map((t) => t.a))].sort();
    const cats = (DATA.categories || []).map((c) => c.id);
    const sort = state.txnSort;
    const head = (key, label) => {
      const on = sort.key === key;
      const arrow = on ? (sort.direction === "asc" ? " ↑" : " ↓") : "";
      return `<th scope="col"><button type="button" class="btn" data-sort="${key}" style="padding:0;border:0;background:transparent;min-height:0">${esc(label)}${arrow}</button></th>`;
    };
    el.innerHTML = `
      <div class="page-heading"><p class="muted">CASH</p><h2>Transaktioner.</h2>
        <p>Filtrér posteringer. Restgæld og boligskat låses i Bolig og SKAT, ikke her.</p></div>
      <div class="toolbar">
        <button type="button" class="btn" id="btnExport">Eksporter JSON</button>
      </div>
      <div class="filters">
        <label>År<select id="fYear"><option value="">Alle</option>${yearOptions().map((y) => `<option value="${y}" ${f.year === y ? "selected" : ""}>${y}</option>`).join("")}</select></label>
        <label>Konto<select id="fAcc"><option value="">Alle</option>${accounts.map((a) => `<option value="${esc(a)}" ${f.account === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></label>
        <label>Kategori<select id="fCat"><option value="">Alle</option>${cats.map((c) => `<option value="${esc(c)}" ${f.cat === c ? "selected" : ""}>${esc(catLabel(c))}</option>`).join("")}</select></label>
        <label style="flex-direction:row;align-items:center;gap:.35rem;margin-top:1rem"><input type="checkbox" id="fUncat" ${f.uncat ? "checked" : ""}/> Kun ukategoriseret</label>
        <label>Søg<input type="search" id="fQ" value="${esc(f.q)}" placeholder="tekst / konto / id"/></label>
        <button type="button" class="btn" id="fApply">Filtrer</button>
      </div>
      <div class="pager"><span>${fmtNum(rows.length)} rækker · side ${f.page + 1}/${pages}</span>
        <button class="btn" id="prevPg" ${f.page <= 0 ? "disabled" : ""}>Forrige</button>
        <button class="btn" id="nextPg" ${f.page + 1 >= pages ? "disabled" : ""}>Næste</button></div>
      <div id="txnTableWrap"><table><thead><tr>
        ${head("d", "Dato")}${head("a", "Konto")}${head("c", "Tekst")}${head("amt", "Beløb")}${head("cat", "Kategori")}
      </tr></thead>
      <tbody>${slice.map((t) => {
        const e = domain.effective(t);
        return `<tr data-id="${esc(t.id)}" style="cursor:pointer">
          <td>${esc(t.d)}</td><td>${esc(t.a)}</td><td>${esc(t.c)}${e.x ? ' <span class="badge">xfer</span>' : ""}</td>
          <td class="num ${t.amt < 0 ? "neg" : "pos"}">${fmtDKK(t.amt)}</td>
          <td>${esc(catLabel(e.cat))}</td>
        </tr>`;
      }).join("")}</tbody></table></div>
    `;
    const apply = () => {
      f.year = el.querySelector("#fYear").value;
      f.account = el.querySelector("#fAcc").value;
      f.cat = el.querySelector("#fCat").value;
      f.uncat = el.querySelector("#fUncat").checked;
      f.q = el.querySelector("#fQ").value.trim();
      f.page = 0;
      renderTxns();
      updateKpis();
    };
    el.querySelector("#fApply").onclick = apply;
    el.querySelector("#fQ").addEventListener("keydown", (e) => { if (e.key === "Enter") apply(); });
    el.querySelector("#prevPg").onclick = () => { f.page -= 1; renderTxns(); };
    el.querySelector("#nextPg").onclick = () => { f.page += 1; renderTxns(); };
    el.querySelector("#btnExport").onclick = () => {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "pfd-transactions.json";
      a.click();
    };
    el.querySelectorAll("[data-sort]").forEach((btn) => {
      btn.onclick = () => {
        const key = btn.dataset.sort;
        if (state.txnSort.key === key) state.txnSort.direction = state.txnSort.direction === "asc" ? "desc" : "asc";
        else state.txnSort = { key, direction: key === "d" || key === "amt" ? "desc" : "asc" };
        renderTxns();
      };
    });
    el.querySelectorAll("tbody tr").forEach((tr) => {
      tr.onclick = () => openDrawer(tr.dataset.id);
    });
  }

  function openDrawer(id) {
    const t = (DATA.txns || []).find((x) => x.id === id);
    const drawer = document.getElementById("drawer");
    if (!t) { drawer.hidden = true; return; }
    state.selectedId = id;
    const e = domain.effective(t);
    const cats = (DATA.categories || []);
    drawer.hidden = false;
    drawer.innerHTML = `<button class="btn" id="closeDrawer">Luk</button>
      <h3>${esc(t.c)}</h3>
      <p>${esc(t.d)} · ${esc(t.a)}</p>
      <p class="${t.amt < 0 ? "neg" : "pos"}">${fmtDKK(t.amt)}</p>
      <p>Kategori ${esc(catLabel(e.cat))} / ${esc(e.sub || "—")}${e.x ? " · intern overførsel" : ""}</p>
      <form id="ovrForm" class="filters" style="flex-direction:column;align-items:stretch">
        <label>Tilsidesæt kategori<select name="cat"><option value="">— behold —</option>${cats.map((c) => `<option value="${esc(c.id)}" ${e.cat === c.id ? "selected" : ""}>${esc(c.label_da)}</option>`).join("")}</select></label>
        <label>Underkategori<input name="sub" value="${esc(e.sub || "")}" maxlength="40"/></label>
        <label style="flex-direction:row;gap:.4rem;align-items:center"><input type="checkbox" name="x" ${e.x ? "checked" : ""}/> Markér som intern overførsel</label>
        <button class="btn primary" type="submit">Gem override</button>
        <button class="btn" type="button" id="clearOvr">Fjern override</button>
      </form>`;
    drawer.querySelector("#closeDrawer").onclick = () => { drawer.hidden = true; };
    drawer.querySelector("#ovrForm").onsubmit = (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.currentTarget);
      const cat = fd.get("cat");
      const sub = String(fd.get("sub") || "").trim();
      const x = fd.get("x") ? 1 : 0;
      if (!cat && !sub && !x) {
        delete state.overrides[id];
      } else {
        state.overrides[id] = {
          cat: cat || t.cat,
          sub: sub || t.sub,
          x,
        };
      }
      saveOverrides();
      toast("Tilsidesættelse gemt");
      renderTxns();
      openDrawer(id);
    };
    drawer.querySelector("#clearOvr").onclick = () => {
      delete state.overrides[id];
      saveOverrides();
      toast("Tilsidesættelse fjernet");
      renderTxns();
      openDrawer(id);
    };
  }

  function renderBudget() {
    const el = document.getElementById("view-aarsbudget");
    const years = yearOptions();
    if (!state.year) state.year = years[0] || "2026";
    const y = state.year;
    const prev = String(Number(y) - 1);
    const cur = domain.yearSpend(y);
    const prv = years.includes(prev) ? domain.yearSpend(prev) : null;
    const cards = Object.entries(cur.spend).map(([id, s]) => {
      const prevT = prv && prv.spend[id] ? prv.spend[id].total : null;
      const d = deltaPct(s.total, prevT);
      const dHtml = d == null ? "" : `<span class="${d <= 0 ? "pos" : "neg"}">${d > 0 ? "+" : ""}${d.toFixed(1).replace(".", ",")}% vs ${prev}</span>`;
      return `<div class="card" data-sec="${id}">
        <div class="ttl">${esc(s.label)}</div>
        <div class="amt">${fmtDKK(s.total)}</div>
        <div class="sub">${pct(s.total, cur.spendTotal)} af forbrug · ${dHtml}</div>
        <div class="bar"><i style="width:${cur.spendTotal ? (100 * s.total / cur.spendTotal) : 0}%"></i></div>
      </div>`;
    }).join("");
    const hiddenSections = new Set(((DATA.budget && DATA.budget.sections) || []).filter((s) => s.hidden).map((s) => s.id));
    const sysCards = Object.entries(cur.system).filter(([id]) => !hiddenSections.has(id)).map(([id, s]) => `
      <div class="card system" data-sec="${id}">
        <div class="ttl">${esc(s.label)} <span class="badge">system</span></div>
        <div class="amt">${fmtDKK(s.total)}</div>
        <div class="sub">Ikke med i forbrugstotal</div>
      </div>`).join("");
    el.innerHTML = `
      <div class="filters">
        <label>År<select id="bYear">${years.map((yy) => `<option value="${yy}" ${yy === y ? "selected" : ""}>${yy}</option>`).join("")}</select></label>
        <div class="kpi" style="padding:.45rem .7rem"><div class="label">Samlet forbrug ${y}</div><div class="value" style="font-size:1.05rem">${fmtDKK(cur.spendTotal)}</div></div>
      </div>
      <h2>Forbrug</h2>
      <p class="muted">Hus her er kontant drift (husleje, el/vand/varme). Aktuel restgæld og boligskat låses i Bolig og SKAT.</p>
      <div class="cards" id="spendCards">${cards}</div>
      <div id="budgetExpand"></div>
      <h2>System (ekskluderet fra forbrug)</h2>
      <div class="cards">${sysCards}</div>
    `;
    el.querySelector("#bYear").onchange = (e) => { state.year = e.target.value; state.budgetExpand = null; renderBudget(); updateKpis(); };
    el.querySelectorAll(".card[data-sec]").forEach((card) => {
      card.onclick = () => {
        const id = card.dataset.sec;
        state.budgetExpand = state.budgetExpand === id ? null : id;
        paintBudgetExpand(cur, prv, prev);
      };
    });
    if (state.budgetExpand) paintBudgetExpand(cur, prv, prev);
  }

  function paintBudgetExpand(cur, prv, prevYear) {
    const box = document.getElementById("budgetExpand");
    if (!box) return;
    const id = state.budgetExpand;
    if (!id) { box.innerHTML = ""; return; }
    const s = cur.spend[id] || cur.system[id];
    if (!s) { box.innerHTML = ""; return; }
    const prevS = prv && (prv.spend[id] || prv.system[id]);
    const rows = Object.entries(s.children || {}).sort((a, b) => b[1].total - a[1].total);
    const y = state.year;
    const top = domain.topTxnsForSection(id, y);
    const isSpend = s.kind === "spend";
    const topHtml = top.length ? `<div class="top3">
      <h4>${esc(isSpend ? "Top 3 udgifter" : "Top 3 beløb")} ${esc(String(y))}</h4>
      <p class="muted">Klik række for at åbne i Transaktioner.</p>
      <table><thead><tr><th>Dato</th><th>Konto</th><th class="num">Beløb</th><th>Tekst</th><th>Kategori</th></tr></thead>
      <tbody>${top.map(({ t, e, mapped }) => {
        const child = mapped && mapped.childId && s.children && s.children[mapped.childId];
        const label = (child && child.label) || catLabel(e.cat) || e.cat || "—";
        return `<tr class="clickable top3row" data-id="${esc(t.id)}" style="cursor:pointer">
          <td>${esc(t.d || "")}</td><td>${esc(t.a || "")}</td><td class="num">${fmtDKK(Number(t.amt) || 0)}</td>
          <td>${esc(t.c || "—")}</td><td>${esc(label)}</td></tr>`;
      }).join("")}</tbody></table></div>` : "";
    const diverseNote = id === "diverse"
      ? `<p class="muted">${fmtNum(domain.diverseStats(y).nUncat)} poster i top-listen · apotek og øvrigt under Diverse.</p>`
      : "";
    const clockNote = id === "hus"
      ? "<p class=\"muted\">Hus-kortet er kontant drift. Aktuel restgæld låses i Bolig. Ejendomsskat tælles ikke igen her.</p>"
      : "";
    box.innerHTML = `<div class="expand">
      <h3>${esc(s.label)} — detaljer ${esc(y)}</h3>
      ${clockNote}${diverseNote}
      <table><thead><tr><th>Underkategori</th><th class="num">Beløb</th><th class="num">% af top</th><th class="num">Vs ${esc(prevYear || "—")}</th></tr></thead>
      <tbody>${rows.map(([cid, c]) => {
        const pt = prevS && prevS.children[cid] ? prevS.children[cid].total : null;
        const d = deltaPct(c.total, pt);
        return `<tr><td>${esc(c.label)}</td><td class="num">${fmtDKK(c.total)}</td><td class="num">${pct(c.total, s.total)}</td>
          <td class="num ${d == null ? "" : (d <= 0 ? "pos" : "neg")}">${d == null ? "—" : ((d > 0 ? "+" : "") + d.toFixed(1).replace(".", ",") + "%")}</td></tr>`;
      }).join("")}</tbody></table>
      ${topHtml}
    </div>`;
    box.querySelectorAll(".top3row").forEach((tr) => {
      tr.onclick = () => {
        const tid = tr.getAttribute("data-id");
        const t = (DATA.txns || []).find((x) => x.id === tid);
        if (t && t.c) state.filters.q = t.c;
        state.filters.page = 0;
        setView("transaktioner");
        setTimeout(() => openDrawer(tid), 50);
      };
    });
  }

  function renderOntologi(tab) {
    const el = document.getElementById("view-ontologi");
    if (!DATA.sot_map || !window.LifeOsSotMap) {
      el.innerHTML = "<div class=\"page-heading\"><h2>Ontologi</h2><p>Ontologikortet er ikke tilgængeligt.</p></div>";
      return;
    }
    LifeOsSotMap.render(el, DATA.sot_map, { tab });
  }

  function renderSettings() {
    const el = document.getElementById("view-indstillinger");
    const active = state.settingsTab || "connections";
    const tabs = [["connections", "Forbindelser"], ["general", "App"], ["bank", "Bank"]];
    el.innerHTML = `
      <div class="page-heading"><p class="muted">INDSTILLINGER</p><h2>Lokal cash-kilde.</h2>
        <p>Eneste anbefalede live system er BankMCP på din maskine. Øvrige fakta er demo-kort.</p></div>
      <div class="settings-tabs" aria-label="Indstillingsområder">${tabs.map(([key, label]) =>
        `<button type="button" class="btn ${key === active ? "primary" : ""}" data-settings-tab="${key}" aria-pressed="${key === active}">${label}</button>`
      ).join("")}</div>
      ${active === "connections" ? `<div class="settings-grid">
        <section class="dash-panel"><h3>BankMCP</h3><p>Konti og posteringer via lokal open banking.</p>
          <p>${bankOverlayLoaded ? "Bank-overlay er indlæst." : "Demo-cash aktiv · intet overlay."}</p>
          <button class="btn" data-settings-tab="bank">Administrér forbindelse</button>
          <a class="btn" href="#/ingest">Se Ingest</a></section>
      </div>` : ""}
      ${active === "general" ? `<section class="dash-panel"><h3>App</h3>
        <p>Basisvaluta: DKK. Tema gemmes som <code>pfd-theme</code>.</p>
        <p>Tilsidesættelser gemmes som <code>${esc((DATA.ls_keys && DATA.ls_keys.overrides) || "pfd-overrides")}</code>.</p>
      </section>` : ""}
      ${active === "bank" ? `<section class="dash-panel"><h3>BankMCP</h3>
        <p>Read-only open banking. Start lokalt, tilslut i ChatGPT Desktop, skriv <code>local/bank-view.json</code> (gitignoreret).</p>
        <pre><code>./scripts/start-bankmcp.sh</code></pre>
        <p>Status: ${bankOverlayLoaded ? "Overlay indlæst ved start" : "Ingen overlay (demo-cash)"}</p>
        <p><a href="../docs/BANKMCP-LOKALT.md">docs/BANKMCP-LOKALT.md</a></p>
      </section>` : ""}
    `;
    el.querySelectorAll("[data-settings-tab]").forEach((btn) => {
      btn.onclick = () => { state.settingsTab = btn.dataset.settingsTab; renderSettings(); };
    });
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbAll() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbPut(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async function idbDelete(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function renderIngest() {
    const el = document.getElementById("view-ingest");
    const domains = (DATA.ingest && DATA.ingest.requirements && DATA.ingest.requirements.domains) || [];
    const tab = state.ingestTab || "requirements";
    const reviewDomain = state.reviewDomain || "bolig";
    const domain = domains.find((d) => d.id === reviewDomain) || domains[0];
    const statusLabel = { documented: "Dokumenteret", missing: "Mangler", conflict: "Konflikt" };
    el.innerHTML = `
      <div class="page-heading"><p class="muted">INGEST</p><h2>Datakrav, PDF og BankMCP.</h2>
        <p>Demo-krav er dokumenteret i payloaden. PDF bliver i browseren. BankMCP er den eneste anbefalede live kilde.</p></div>
      <nav class="settings-tabs" aria-label="Ingest visninger">${[["requirements", "Datakrav"], ["pdf", "PDF"], ["bank", "BankMCP"]].map(([key, title]) =>
        `<button class="btn ${tab === key ? "primary" : ""}" data-ingest-tab="${key}" aria-pressed="${tab === key}">${title}</button>`
      ).join("")}</nav>
      <div id="ingestBody"></div>
    `;
    const body = el.querySelector("#ingestBody");
    if (tab === "requirements") {
      body.innerHTML = `
        <div class="ingest-domains">${domains.map((d) => {
          const documented = (d.rows || []).filter((r) => r.status === "documented").length;
          return `<button class="ingest-domain ${d.id === (domain && domain.id) ? "is-selected" : ""}" data-review-domain="${esc(d.id)}" aria-pressed="${d.id === (domain && domain.id)}">
            <strong>${esc(d.label)}</strong>
            <span>${documented} af ${(d.rows || []).length} dokumenteret</span>
            <small>Demo · read-only</small>
          </button>`;
        }).join("")}</div>
        ${domain ? `<section class="dash-panel"><h3>${esc(domain.label)} · datakrav</h3>
          <p class="muted">Alle rækker er dokumenteret i demo-payloaden. Upload af PDF muterer ikke Current.</p>
          <div class="table-wrap ingest-table ingest-requirements-table" tabindex="0"><table>
            <thead><tr><th>Oplysning</th><th>Værdi</th><th>Status</th><th>Næste handling</th></tr></thead>
            <tbody>${(domain.rows || []).map((r) => `<tr>
              <th scope="row">${esc(r.label)}<small>${esc(r.instruction || "")}</small></th>
              <td>${esc(r.value || "—")}<small>${esc(r.as_of || "")}</small></td>
              <td>${esc(statusLabel[r.status] || r.status)}</td>
              <td>${esc(r.next || "—")}</td>
            </tr>`).join("")}</tbody>
          </table></div>
        </section>` : "<section class=\"dash-panel\"><p>Ingen datakrav.</p></section>"}
      `;
      body.querySelectorAll("[data-review-domain]").forEach((btn) => {
        btn.onclick = () => { state.reviewDomain = btn.dataset.reviewDomain; renderIngest(); };
      });
    } else if (tab === "pdf") {
      body.innerHTML = `
        <section class="dash-panel"><h3>PDF-upload</h3>
          <p>Filer gemmes i IndexedDB på denne maskine. De opdaterer ikke demo-payloaden.</p>
          <div class="dropzones" id="dropzones"></div>
          <div class="row-actions" style="display:flex;gap:.5rem;flex-wrap:wrap;margin:1rem 0">
            <button type="button" class="btn primary" id="btn-export-manifest">Download manifest</button>
            <button type="button" class="btn danger" id="btn-clear-pdfs">Ryd lokale PDF’er</button>
          </div>
          <div id="pdf-list"></div>
        </section>`;
      const root = body.querySelector("#dropzones");
      root.innerHTML = ZONES.map((z) => `<label class="drop" data-zone="${z.id}" style="display:block;border:1.5px dashed var(--line);border-radius:12px;padding:1rem;margin:.4rem 0;cursor:pointer">
        <strong>${esc(z.title)}</strong><div class="muted">${esc(z.mapsTo)} · ${esc(z.layer)} · ${esc(z.hint)}</div>
        <input type="file" accept="application/pdf,.pdf" multiple data-zone="${z.id}" style="display:none"/>
      </label>`).join("");
      root.querySelectorAll(".drop").forEach((node) => {
        const zone = ZONES.find((z) => z.id === node.dataset.zone);
        const input = node.querySelector("input");
        input.onchange = () => addFiles(input.files, zone).then(refreshPdfList);
      });
      body.querySelector("#btn-export-manifest").onclick = async () => {
        const all = await idbAll();
        const blob = new Blob([JSON.stringify({ format: "pfd-pdf-manifest/1", docs: all.map(({ blob, ...m }) => m) }, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "pdf-manifest.local.json";
        a.click();
      };
      body.querySelector("#btn-clear-pdfs").onclick = async () => {
        const db = await openDb();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(DB_STORE, "readwrite");
          tx.objectStore(DB_STORE).clear();
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
        localStorage.removeItem(LS_MANIFEST);
        refreshPdfList();
      };
      refreshPdfList();
    } else {
      body.innerHTML = `<section class="dash-panel"><h3>BankMCP</h3>
        <p>Read-only open banking. Appen er komplet uden BankMCP. Overlay erstatter booked balances og prepender op til 25 cash-poster.</p>
        <pre><code>./scripts/start-bankmcp.sh</code></pre>
        <p>Status: <strong>${bankOverlayLoaded ? "Overlay indlæst" : "Ikke indlæst · demo-cash"}</strong></p>
        <p>Læg output i <code>local/bank-view.json</code> (gitignoreret). Se <a href="../docs/BANKMCP-LOKALT.md">docs/BANKMCP-LOKALT.md</a>.</p>
      </section>`;
    }
    el.querySelectorAll("[data-ingest-tab]").forEach((btn) => {
      btn.onclick = () => { state.ingestTab = btn.dataset.ingestTab; renderIngest(); };
    });
  }

  async function addFiles(fileList, zone) {
    const files = [...fileList].filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    for (const file of files) {
      await idbPut({
        id: "pdf_" + crypto.randomUUID(),
        name: file.name,
        size: file.size,
        zone: zone.id,
        maps_to_system: zone.mapsTo,
        layer: zone.layer,
        uploaded_at: new Date().toISOString(),
        blob: await file.arrayBuffer(),
      });
    }
    toast(files.length ? "PDF gemt lokalt" : "Kun PDF");
  }

  async function refreshPdfList() {
    const wrap = document.getElementById("pdf-list");
    if (!wrap) return;
    const all = await idbAll();
    localStorage.setItem(LS_MANIFEST, JSON.stringify({ docs: all.map(({ blob, ...m }) => m) }));
    wrap.innerHTML = all.length
      ? `<table><thead><tr><th>Fil</th><th>Zone</th><th></th></tr></thead><tbody>${all.map((r) => `<tr>
          <td>${esc(r.name)}</td><td>${esc(r.zone)}</td>
          <td><button class="btn" data-del="${esc(r.id)}">Fjern</button></td></tr>`).join("")}</tbody></table>`
      : "<p class=\"muted\">Ingen PDF’er i browseren.</p>";
    wrap.querySelectorAll("[data-del]").forEach((btn) => {
      btn.onclick = async () => { await idbDelete(btn.dataset.del); refreshPdfList(); };
    });
  }

  function applyBankOverlay(view) {
    if (!view || !Array.isArray(view.accounts)) return;
    const byLabel = new Map((DATA.accounts || []).map((a) => [a.label, a]));
    for (const acc of view.accounts) {
      const row = byLabel.get(acc.label);
      if (row && acc.booked_balance != null) row.booked = acc.booked_balance;
    }
    const extra = (view.transactions || []).slice(0, 25).map((t, i) => ({
      id: "overlay-" + i,
      d: t.booked_at,
      a: t.account_label,
      c: ["Løn", "Husleje", "Dagligvarer", "Transport", "Kaffe", "Streaming", "Forsyning", "Overførsel til opsparing", "Overførsel fra daglig", "Forsikring", "Brændstof", "Apotek", "Restaurant"].includes(t.description) ? t.description : "Restaurant",
      amt: t.amount,
      cat: "food",
      sub: "dining",
      x: 0,
    }));
    DATA.txns = extra.concat(DATA.txns || []);
    bankOverlayLoaded = true;
  }

  async function boot() {
    initTheme();
    document.querySelectorAll(".tab").forEach((a) => {
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        setView(a.dataset.view);
      });
    });
    window.addEventListener("hashchange", () => {
      const raw = location.hash.replace(/^#\/?/, "");
      const [view, sot] = raw.split("/");
      setView(view || "overblik", sot);
    });
    try {
      const res = await fetch("data/demo-payload.json");
      if (!res.ok) throw new Error("http " + res.status);
      DATA = await res.json();
    } catch (err) {
      setStatus("Kunne ikke hente demo-payload");
      document.getElementById("view-overblik").innerHTML = "<div class=\"dash-panel\"><h2>Dit økonomiske overblik</h2><p>Der er endnu ingen posteringer at vise.</p></div>";
      return;
    }
    try {
      const bank = await fetch("../local/bank-view.json");
      if (bank.ok) applyBankOverlay(await bank.json());
    } catch {
      setStatus("Bank-overlay kunne ikke læses");
    }
    try {
      state.overrides = JSON.parse(localStorage.getItem((DATA.ls_keys || {}).overrides || "pfd-overrides") || "{}") || {};
    } catch { state.overrides = {}; }
    rebuildDomain();
    setStatus("Fiktiv husstand · ca. 25.000 kr./md · " + (DATA.as_of || ""));
    const raw = location.hash.replace(/^#\/?/, "");
    const [view, sot] = raw.split("/");
    setView(view || "overblik", sot);
  }

  boot();
})();
