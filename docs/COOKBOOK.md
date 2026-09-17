# Cookbook: Personal Finance Dashboard i ChatGPT Desktop + Codex

> **Start her (praktisk):** [`START-HER.md`](START-HER.md) — ontologi (2 prompts) → **lokal BankMCP** → **PDF-kilder**.  
> Lokal BankMCP-pakke: [`BANKMCP-LOKALT.md`](BANKMCP-LOKALT.md).

**Målgruppe:** ChatGPT Desktop + Codex (ZIP eller clone).  
**Mål:** Se konkret cash i `/app/`, udvid derefter ontologien med egne providere (PDF først).

## Før du starter

- ChatGPT Desktop installeret og logget ind.
- Codex tilgængelig for projektmappen.
- Denne mappe lokalt (ZIP eller `git clone`).
- Ingen bankadgangskoder, OAuth-sessioner eller personlige registre i chat eller git.
- Læs [`SECURITY.md`](SECURITY.md). Længere prompt-pakke: [`PROMPT-STARTERS.md`](PROMPT-STARTERS.md).

## Prompt-pakke (indsæt i Codex)

Brug dem i rækkefølge. Hold hver prompt kort; lad Codex læse filerne.  
(Fuld pakke: [`PROMPT-STARTERS.md`](PROMPT-STARTERS.md).)

### 1 — Orientér

```text
Du arbejder i personal-finance-dashboard.
Læs README.md, docs/ARCHITECTURE.md og taxonomy/sot-map.example.json.
Opsummér på dansk i 8 bullets: lag, spines og reglen "Cash ≠ Current".
Opfind ingen datakilder jeg ikke har nævnt.
```

### 2 — Personliggør kortet (ingen vendor-sladder)

```text
Kopiér taxonomy/sot-map.example.json til taxonomy/sot-map.json.
Behold generiske roller (cash-kilde, ejendomsregister, køretøjsregister,
offentligt arkiv, indstillings-pegepinde). Opfind ingen vendor-/bank-/produktnavne.
Behold de fire lag og seks spines medmindre jeg beder om andet.
Vis et kort diff-resume, når du er færdig.
```

### 3 — Arkitektur-tjek

```text
Ud fra docs/ARCHITECTURE.md: tilføj 5 manuelle assertions som en kort
docs/CHECKS.md-tjekliste jeg kan afkrydse (ingen personlige tal).
Fokus: SoT før UI; Cash vs Current; arkiv understøtter register.
```

### 4 — UI over mit kort

```text
Bekræft at /app/ viser Life OS med 11 faner og demo-payload.
List systemer og spines fra taxonomy (example eller lokal sot-map.json).
Ingen live saldi, ingen kontonumre i chatten.
```

### 5 — MCP-oplåsning (valgfri)

```text
Læs docs/SOURCES.md.
Skriv en kort docs/MCP-PLAN.md der forklarer, hvordan jeg tilslutter en
MCP cash-bro uden credentials i repoet og uden vendor-navne i taxonomy.
List kun placeholder-navne for miljøvariabler.
```

## Succeskriterier

- [ ] `taxonomy/sot-map.json` findes lokalt, uden personlige identifikatorer, og er **gitignoreret** (kun example er offentlig).
- [ ] Du kan forklare ontologi vs CRM/ERP i ét afsnit.
- [ ] `/app/` viser demo-husstand + ontologi-kontrolplan.
- [ ] `.gitignore` blokerer stadig `.env`, snapshots, oauth og lokale cookbook-outputs.
- [ ] Du har **ikke** pastet live saldi ind i ChatGPT.

## Undervisningsnote

Cookbooken matcher den offentlige idé: ontologi + SoT + MCP, bygget med
**ChatGPT Desktop + Codex**. Det private live Finance OS forbliver privat;
dette repo er den delbare opskrift.
