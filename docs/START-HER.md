# Start her — ontologi → lokal BankMCP → egne PDF-kilder

Målet med repoet er **praktisk**, ikke et ontologi-kursus.

`/app/` er en Life OS-app med 11 faner og en fiktiv husstand (ca. 25.000 kr.
netto om måneden). Den kører uden BankMCP. Cookbooken herunder lærer ontologi,
valgfri live-cash og PDF-kilder:

1. **Kort** forstå ontologi (2 prompts)  
2. **Host BankMCP lokalt** (valgfrit) og overskriv cash i `/app/`  
3. **Egne kilder** — PDF-upload under **Ingest**

Du behøver ikke være udvikler. Download mappen → åbn i **ChatGPT Desktop + Codex** → kopiér prompts.

**Sikkerhed:** Paste ikke passwords/CPR ind i chatten. Læg PDF’er i `local/pdfs/inbox/` (Codex læser filerne dér). BankMCP er read-only. Commit aldrig `local/bank-view.json`, `~/.bankmcp` eller PDF’er.

---

## Du skal bruge

| Ting | Til hvad |
|------|----------|
| [ChatGPT Desktop](https://chatgpt.com/) + **Codex** | Prompts der retter filer |
| Denne mappe lokalt | ZIP eller `git clone` |
| [Node.js 24+](https://nodejs.org) | Lokal BankMCP (`./scripts/start-bankmcp.sh`) |
| Bank via Enable Banking | Live cash (valgfrit i Del 2) |
| PDF’er du allerede har | Lån, police, SKAT, bil — Del 3 |

Pakket BankMCP-hjælp: [`BANKMCP-LOKALT.md`](BANKMCP-LOKALT.md) · script: `scripts/start-bankmcp.sh` · MCP-eksempel: `config/bankmcp.mcp.example.json`

---

## Del 0 — Hent projektet

**Nybegynder (anbefalet):**  
1. https://github.com/srosenlund/personal-finance-dashboard → **Code** → **Download ZIP**  
2. Pak ud → åbn mappen i ChatGPT Desktop som Codex-projekt  
3. Tjek: *“List filerne i projektets rod”* → `README.md`, `docs/`, `app/`, `taxonomy/`, `scripts/`, `local/`

**Udvikler:**  
```bash
git clone https://github.com/srosenlund/personal-finance-dashboard.git
cd personal-finance-dashboard
python3 -m unittest discover -s tests -v
```
Samme Codex-prompts herunder. Se også README «To veje ind».

---

## Del 1 — Ontologi på 10 minutter

### Prompt 1 — Hvad er ontologi her?

```text
Jeg er ikke udvikler. Læs README.md, docs/START-HER.md og taxonomy/sot-map.example.json.

Forklar på dansk i max 80 ord:
1) hvad en ontologi er i DETTE projekt
2) hvorfor bankposteringer er Source of Truth for cash
3) reglen Cash ≠ Current med ét hverdagseksempel (ingen rigtige tal)

Ret ingen filer. Stop.
```

### Prompt 2 — Lav mit lokale kort

```text
Kopiér taxonomy/sot-map.example.json → taxonomy/sot-map.json.
Behold lag + spines. Kun generiske roller (ingen bank-/forsikringsproduktnavne i taxonomy).
Vis 5-linjers resume. Opfind ingen saldi.
```

**Færdig når:** `taxonomy/sot-map.json` findes (gitignoreret).

---

## Del 2 — Lokal BankMCP → noget synligt i appen

Antagelse: du **hoster BankMCP på din egen maskine**. Det er pakket ind her.

### B1 — Start BankMCP lokalt

```bash
chmod +x scripts/start-bankmcp.sh   # første gang
./scripts/start-bankmcp.sh
```

Eller: `npx -y bankmcp`  
Følg setup i browseren (Enable Banking + bank). Se [`BANKMCP-LOKALT.md`](BANKMCP-LOKALT.md).

### B2 — Tilslut i ChatGPT Desktop

Brug `config/bankmcp.mcp.example.json` som skabelon:

- `command`: `npx`  
- `args`: `["-y", "bankmcp"]`

Godkend / “connect my bank” indtil `list_accounts` virker.  
Tjek: *“Brug BankMCP list_accounts — sig kun antal konti og valuta, ikke IBAN.”*

### B3 — Prompt: sync til lokal fil + UI

```text
Læs docs/BANKMCP-LOKALT.md og local/bank-view.example.json.

Antagelse: BankMCP kører LOKALT på min maskine og er tilsluttet denne ChatGPT/Codex-session.

1) Brug BankMCP (list_accounts, get_balances, get_transactions).
2) Skriv local/bank-view.json i samme format som eksemplet:
   accounts[{id,label,currency,booked_balance}]
   transactions[op til 25: account_label,booked_at,amount,currency,description]
3) Maskér IBAN (max sidste 4 tegn). Ingen tokens/passwords i filen. Commit aldrig filen.
4) Sørg for at app/index.html viser bank-sektion fra local/bank-view.json
   (fallback: local/bank-view.example.json).
5) Giv 3 bullets på dansk: start BankMCP, start http-server, åbn /app/.

Hvis BankMCP ikke er tilgængeligt: stop og sig præcis hvad jeg mangler — opfind ikke live-data.
```

### B4 — Åbn appen

```bash
python3 -m http.server 8765
```

http://127.0.0.1:8765/app/ — konti + posteringer (eller demo-data indtil sync).

---

## Del 3 — Udvid ontologien med egne kilder (PDF i appen)

**Simpleste approach:** upload PDF’er **inde i `/app/`** — de gemmes i browserens **lokale storage** (IndexedDB + manifest i `localStorage`).  
Ingen API-nøgler. Senere kan samme ontology-rolle skifte til MCP.

### C1 — Upload i appen

1. Start UI: `python3 -m http.server 8765` → http://127.0.0.1:8765/app/  
2. Brug upload-områderne: **Bolig / Forsikring / SKAT / Bil / Andet**  
3. Filene ligger kun lokalt i browseren (ikke på GitHub)  
4. Valgfrit til Codex:
   - **Download manifest** + **Download PDF’er**, eller  
   - **Gem til valgt mappe…** → peg på `local/pdfs/inbox/`

Filesystem-mappen `local/pdfs/inbox/` er stadig støttet som fallback.

### C2 — Prompt: registrér PDF-provider (app + lokal storage)

```text
Læs taxonomy/sot-map.json (ellers example), docs/SOURCES.md og app/index.html (PDF-upload sektion).

Jeg bruger in-app PDF-upload med lokal browser-storage som første provider.

1) Sørg for generiske system-roller i taxonomy (private_archive, policy_archive, gov_archive).
2) Skriv/opdater local/pdfs/providers.local.json med:
   [{ "id": "pdf_app_local", "kind": "browser_local_upload",
      "maps_to_system": "private_archive",
      "note": "Uploads in /app/ → IndexedDB + localStorage manifest; export to inbox for Codex" }]
3) Behold muligheden for kind: pdf_folder path local/pdfs/inbox som fallback.
4) Ingen produkt-/banknavne i taxonomy. Vis diff-resume.
```

### C3 — Prompt: udtræk fra eksporterede PDF’er

```text
Jeg har uploadet PDF’er i /app/ (lokal storage) og eksporteret dem til local/pdfs/inbox/
(eller lagt pdf-manifest.local.json + PDF’er dér).

Regler:
- Læs PDF’er fra local/pdfs/inbox/ (eller manifest-navne). Paste ikke indhold i chatten.
- Skriv udtræk til local/pdfs/extracted/<filnavn>.json:
  source_file, doc_type (loan|policy|tax|vehicle|other), maps_to_system,
  summary (max 5 bullets), facts[{label,value,layer}] (Register|Current|Cash|Arkiv)
- Opdater taxonomy/sot-map.json kun med manglende generiske entities/relations.
- Ingen CPR/fulde kontonumre. needs_review: true ved tvivl.
- Commit aldrig PDF’er eller extracted-filer.
- Dansk resume: hvilken spine der blev styrket.
```

### C4 — Prompt: flere filer / skift til MCP senere

```text
Scan local/pdfs/inbox/ (+ pdf-manifest.local.json hvis den findes) for nye PDF’er uden udtræk.
Kør samme udtræksregler.
Hvis jeg senere får MCP/API for samme rolle: foreslå providers.local.json-skift
fra browser_local_upload / pdf_folder → mcp uden at ændre maps_to_system.
```

**Færdig når:** Mindst én PDF er uploadet i appen, eksporteret/udtrukket, og ontologien kender kilden.

---

## Er jeg i mål?

- [ ] Del 1: ontologi forstået + lokalt kort  
- [ ] Del 2: lokal BankMCP + `/app/` viser bank-sektion  
- [ ] Del 3: mindst én PDF uploadet i `/app/` (lokal storage) → eksporteret/udtrukket → ontologi udvidet  

---

## Mere

| Doc | Når |
|-----|-----|
| [`BANKMCP-LOKALT.md`](BANKMCP-LOKALT.md) | BankMCP på din maskine |
| [`SOURCES.md`](SOURCES.md) | Roller + PDF vs MCP |
| [`SECURITY.md`](SECURITY.md) | Hvad der aldrig må i git |
| [`PROMPT-STARTERS.md`](PROMPT-STARTERS.md) | Ekstra prompts |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Lag dig-dybere |
