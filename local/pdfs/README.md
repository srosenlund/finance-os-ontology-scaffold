# PDF-kilder

**Primært:** upload i `/app/` — filer gemmes i browserens lokale storage (IndexedDB + manifest i `localStorage`).

**Til Codex:** eksporter via knapperne i appen (manifest + PDF’er), eller **Gem til valgt mappe…** → `local/pdfs/inbox/`.

## Mapper (fallback / Codex-bro)

| Path | Formål |
|------|--------|
| `inbox/` | Eksporterede PDF’er til filsystemet (gitignoreret) |
| `extracted/` | Codex JSON-udtræk (gitignoreret) |

## Flow

1. Åbn `/app/` → drop PDF i Bolig / Forsikring / SKAT / Bil / Andet  
2. Download manifest (eller gem mappe til `inbox/`)  
3. Kør Del 3-prompts i [`docs/START-HER.md`](../docs/START-HER.md)
