# Kilder

## Standardsti i denne cookbook

1. **Cash:** lokalt hostet **[BankMCP](https://bankmcp.dk/)** → `local/bank-view.json` (gitignoreret)  
2. **Alt andet (første version):** **PDF-upload i `/app/`** (browser local storage) → eksport til `local/pdfs/inbox/` → Codex-udtræk → ontologi  

Se [`START-HER.md`](START-HER.md) og [`BANKMCP-LOKALT.md`](BANKMCP-LOKALT.md).

## Hvorfor in-app PDF + local storage først

| Tilgang | Hvornår |
|---------|---------|
| `browser_local_upload` | Standard-UX: dropzoner i `/app/`, IndexedDB + localStorage-manifest |
| `pdf_folder` | Efter eksport til `local/pdfs/inbox/` så Codex kan læse filer |
| `mcp` / API | Senere: samme ontologi-**rolle**, skift provider-kind |

`local/pdfs/providers.example.json` viser:

- `pdf_app_local` → browser-upload i `/app/`  
- `pdf_inbox` → mappe-fallback  
- `cash_bankmcp_local` → lokal BankMCP

Kopiér til `local/pdfs/providers.local.json` (gitignoreret) på din maskine.

## Ontologi-roller forbliver generiske

Nævn BankMCP og «PDF-inbox» i docs/chat. I **taxonomy** behold roller:

| Rolle-id | Lag | Typisk første provider |
|----------|-----|------------------------|
| `cash_source` | Cash | Lokal BankMCP |
| `private_archive` / `policy_archive` / `gov_archive` | Arkiv / Current | PDF-inbox |
| `property_register` / `lien_register` / `vehicle_register` | Register | PDF først, MCP senere |
| `settings` | Current | Erklærede pegepinde |

## Regler

- Autentificér lokalt — commit aldrig hemmeligheder eller `~/.bankmcp`  
- PDF’er bliver under `local/pdfs/inbox/` (gitignoreret); paste dem ikke i chat  
- Extracts går til `local/pdfs/extracted/` (gitignoreret)  
- Cash-posteringer erstatter **ikke** Current lån-/policevilkår  
