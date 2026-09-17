# Personal Finance Dashboard

Life OS-app med 11 faner (Overblik, Konti, Ingest, Forsikring, Bil, Bolig, SKAT,
Transaktioner, Årsbudget, Ontologi, Indstillinger) på en **fiktiv husstand**
(~25.000 kr. netto/md). Synlig tekst er på **dansk**; ontologi-**id’er**
(`cash_source`, …) forbliver engelske roller.

Byg videre med **ChatGPT Desktop + Codex**. Eneste anbefalede live kilde er
lokal **BankMCP**. Resten starter som PDF under **Ingest**.

→ **[`docs/START-HER.md`](docs/START-HER.md)**

Helt ny? Klik for klik fra «Åbn ChatGPT»: **[begynderguiden](https://srosenlund.github.io/personal-finance-dashboard/start/)**

Live data og PDF’er bliver på **din** maskine (gitignoreret). Se [`docs/SECURITY.md`](docs/SECURITY.md).

---

## To veje ind

### A — Nybegynder (ChatGPT / Codex)

1. På GitHub: **Code → Download ZIP** (eller kør `./scripts/make-beginner-zip.sh` hvis du allerede har clon’et).
2. Pak ud → åbn mappen i **ChatGPT Desktop** som Codex-projekt.
3. Følg [`docs/START-HER.md`](docs/START-HER.md) Del 0–3 (ontologi → valgfri BankMCP → PDF).
4. Se appen: `python3 -m http.server 8765` → [http://127.0.0.1:8765/app/](http://127.0.0.1:8765/app/).

Du behøver ikke Git. ZIP-pakken springer `tests/` og tunge contributor-docs over.

### B — Udvikler (GitHub)

```bash
git clone https://github.com/srosenlund/personal-finance-dashboard.git
cd personal-finance-dashboard
python3 -m unittest discover -s tests -v
python3 -m http.server 8765
# åbn http://127.0.0.1:8765/app/
# BankMCP er valgfri: ./scripts/start-bankmcp.sh
```

Fuld clone inkl. tests, arkitektur og privacy-scan. Samme cookbook som A.

---

## Hurtig UI-test

Appen viser demo-data med det samme. `local/bank-view.json` (gitignoreret) kan
overskrive cash-konti. PDF-upload ligger under **Ingest**.

---

## Hvorfor denne stak

| Lag | Hvad |
|-----|------|
| Ontologi | Kort over betydning og sammenhænge (Cash ≠ Current) |
| BankMCP lokalt | Read-only cash Source of Truth via open banking — **du hoster den** |
| PDF inbox | Nemmeste måde at tilføje lån/police/SKAT som Arkiv/Current-kilder |

BankMCP: https://bankmcp.dk/ · guide: [`docs/BANKMCP-LOKALT.md`](docs/BANKMCP-LOKALT.md)

---

## Indhold

| Path | Rolle |
|------|--------|
| [`docs/START-HER.md`](docs/START-HER.md) | Hovedguide + prompts (ontologi → BankMCP → PDF) |
| [`docs/BANKMCP-LOKALT.md`](docs/BANKMCP-LOKALT.md) | Lokal hosting pakket ind |
| [`scripts/start-bankmcp.sh`](scripts/start-bankmcp.sh) | Start lokal BankMCP |
| [`scripts/make-beginner-zip.sh`](scripts/make-beginner-zip.sh) | ZIP til Codex-nybegyndere |
| [`config/bankmcp.mcp.example.json`](config/bankmcp.mcp.example.json) | MCP-skabelon til klienten |
| [`local/bank-view.example.json`](local/bank-view.example.json) | Demo bank-UI |
| [`local/pdfs/`](local/pdfs/) | PDF inbox + provider-eksempel |
| [`app/`](app/) | Life OS-app (demo-payload + 11 faner) |
| [`app/data/demo-payload.json`](app/data/demo-payload.json) | Fiktiv husstand |
| [`tests/`](tests/) | Privacy-scan + domain (Cash ≠ Current) |
| [`taxonomy/sot-map.example.json`](taxonomy/sot-map.example.json) | Eksempel-ontologi |
| [`docs/SOURCES.md`](docs/SOURCES.md) · [`SECURITY.md`](docs/SECURITY.md) | Kilder + sikkerhed |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Lag/spines (contributor-reference) |

## License

MIT — se [LICENSE](LICENSE).
