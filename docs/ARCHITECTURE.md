# Architecture

> **For contributors (English reference).** Brugerrettede guides er på dansk:
> [`START-HER.md`](START-HER.md), [`SECURITY.md`](SECURITY.md), [`SOURCES.md`](SOURCES.md).
> Ontologi-**id’er** forbliver engelske (`cash_source`, …); lag-tokens Register / Current / Cash / Arkiv er kontraktord.

## SoT before UI

Do not start with screens. Start with:

1. **Systems** — where truth is measured or declared (cash-source MCP, property register, archive…).
2. **Spines** — the questions the app must answer (household cash, housing loans, vehicles…).
3. **Entities + relations** — the ontology graph.
4. **UI** — thin views over that graph.

## Four layers

| Layer | Meaning |
|-------|---------|
| **Register** | Official / registry facts (property, liens, vehicles, market references). |
| **Current** | The active contractual state you point at (current loan terms, active policy). |
| **Cash** | Money movement (accounts, transactions, year budget). |
| **Arkiv** | Supporting documents from government, private, or mail archives. |

**Rule:** cash transactions do **not** replace Current loan terms. Crossing that boundary is how finance apps lie.

## Spines (example)

- **HUSHOLD** — What flows on accounts; year cash?
- **BOLIG** — Which properties and which Current loans?
- **MOBILITET** — Which vehicle and financing mode?
- **BESKYTTELSE** — Which policies are active?
- **SKAT** — Advance/annual tax and property tax?
- **FÆLLES** — Identity, pointers, archive channels?

Edit spines in `taxonomy/sot-map.json` for your domain.
