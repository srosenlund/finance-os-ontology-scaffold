# Prompt-startere — ChatGPT Desktop + Codex

> **Hovedsti:** [`START-HER.md`](START-HER.md) (ontologi → lokal BankMCP → PDF).  
> Denne side er den **udvidede** prompt-pakke (dansk først).

Kopiér ind i **Codex** med dette repo åbent. Hold privacy-værn.

**Paste aldrig i chat:** saldi, kontonumre, IBAN/CPR, OAuth-tokens, `.env`-indhold, PDF-opgørelser eller vendor-produktnavne der hører til dit private kort.

---

## 0 — Sikkerhedsskinne (kør én gang)

```text
Du hjælper mig med personal-finance-dashboard.
Hårde regler for hele sessionen:
- Opfind ikke live credentials, saldi, kontonumre eller personlige identifikatorer.
- Bed mig ikke om at paste secrets, OAuth-sessioner, bank-eksport eller PDF-kontoudtog i chatten.
- Hold taxonomy-roller generiske (ingen vendor-/bank-/forsikringsproduktnavne i taxonomy/*.json).
- Foretræk gitignorerede lokale filer til alt personligt.
Bekræft på 3 bullets, og vent så på næste prompt.
```

---

## 1 — Orientér (hvad er dette repo?)

```text
Du arbejder i personal-finance-dashboard.
Læs README.md, docs/ARCHITECTURE.md, docs/SOURCES.md og taxonomy/sot-map.example.json.
Opsummér på dansk i 8 bullets: fire lag, spines, entities vs relations, og reglen "Cash ≠ Current".
Opfind ikke datakilder jeg ikke har nævnt. Ingen personlige eksempler.
```

---

## 2 — Forklar ontologi på hverdagsdansk

```text
Kun ud fra dette repos docs: forklar i ét kort afsnit (max 120 ord)
hvad en ontologi er her, hvordan den adskiller sig fra CRM/ERP-eksport, og hvorfor Source of Truth betyder noget.
Giv derefter 5 bullets med gør / gør-ikke for den der bygger sit første kort.
Ingen vendor-navne. Ingen live data.
```

---

## 3 — Personliggør SoT-kortet (kun roller)

```text
Kopiér taxonomy/sot-map.example.json til taxonomy/sot-map.json.
Behold generiske roller (cash-kilde, ejendomsregister, køretøjsregister,
offentligt arkiv, indstillings-pegepinde). Navngiv ikke vendors, banker eller produkter.
Behold fire lag og seks spines medmindre jeg beder om andet.
Vis et diff-resume. Opfind ikke konto-id’er eller saldi.
```

---

## 4 — Arkitektur-tjekliste

```text
Ud fra docs/ARCHITECTURE.md: opret docs/CHECKS.md som en kort manuel tjekliste
(5–8 afkrydsninger, ingen personlige tal).
Fokus: SoT før UI; Cash vs Current; arkiv understøtter register; secrets uden for git.
Hvis docs/CHECKS.md allerede findes, forbedr den i stedet for at duplikere.
```

---

## 5 — UI over mit kort

```text
Bekræft at app/ viser Life OS med 11 faner og demo-payload.
List systemer og spines fra taxonomy/sot-map.json hvis den findes, ellers example.
Ingen saldi, ingen kontonumre, intet dokumentindhold i chatten.
Vis et kort resume af hvad brugeren ser.
```

---

## 6 — MCP-oplåsning (ingen secrets i repo)

```text
Læs docs/SOURCES.md.
Skriv docs/MCP-PLAN.md der forklarer, hvordan jeg tilslutter en MCP cash-bro
uden credentials i repoet og uden vendor-navne i taxonomy/sot-map.json.
List kun placeholder-navne for miljøvariabler (fx CASH_MCP_TOKEN=).
Opfind ikke rigtige tokens. Mind mig om, hvad der skal forblive gitignoreret.
```

---

## 7 — Tilføj én domæne-spine sikkert

```text
Jeg vil udvide ontologien med én ekstra spine til mit domæne.
Foreslå spine-id + spørgsmål, 2–4 entities og relationer der respekterer Cash ≠ Current.
Kun generiske roller. Opfind ikke live systemer eller personlige facts.
Vis foreslåede JSON-fragmenter før du skriver filer; vent på mit OK.
```

---

## 8 — Privacy-selvrevision af working tree

```text
Scan working tree (tracked + almindelige untracked suspects) for lækagerisiko:
.env*, oauth-sessioner, snapshots, saldi, kontonumre, IBAN-lignende strenge, e-mails, CPR-lignende id’er,
vendor-produktnavne inde i taxonomy/*.json.
Rapportér: sti · severity (block/warn/ok) · hvorfor · fix.
Print ikke hemmelige værdier — kun redigerede hints.
```

---

## 9 — Tilføj en PDF-kilde (enkleste provider)

```text
Jeg udvider kilder med PDF-upload først.
PDF’erne ligger allerede i local/pdfs/inbox/ (bed mig ikke om at paste dem).
1) Sørg for at taxonomy har en generisk archive/policy-systemrolle.
2) Udtræk hver ny PDF til local/pdfs/extracted/<name>.json
   (doc_type, summary-bullets, facts med lag Register|Current|Cash|Arkiv).
3) Opdater local/pdfs/providers.local.json fra providers.example.json hvis den mangler.
4) Ingen produkt-/vendor-navne i taxonomy. Ingen CPR/IBAN i extracts.
5) Dansk resume: hvad der ændrede sig i ontologien, og hvad jeg bør gennemgå.
```

---

## Anbefalet rækkefølge

1. Sikkerhedsskinne → Orientér → Forklar  
2. Personliggør kort → Arkitektur-tjekliste → UI-tjek  
3. Valgfrit: MCP-plan → Ekstra spine → Privacy-selvrevision
