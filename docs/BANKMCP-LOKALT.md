# BankMCP lokalt — pakket ind i denne repo

Antagelse i cookbook’en: du **hoster BankMCP på din egen maskine** (ikke en shared cloud du ikke styrer).  
Det er den model, prompts og scripts her er skrevet til.

Officiel produktside: https://bankmcp.dk/  
Kilde: https://github.com/noskillish/bankmcp

## Hvad der ligger i repoet

| Fil | Formål |
|-----|--------|
| [`scripts/start-bankmcp.sh`](../scripts/start-bankmcp.sh) | Starter lokal BankMCP via `npx -y bankmcp` |
| [`config/bankmcp.mcp.example.json`](../config/bankmcp.mcp.example.json) | Eksempel på MCP-server entry (stdio) til din klient |
| [`local/bank-view.example.json`](../local/bank-view.example.json) | Fake demo til UI før live sync |
| `local/bank-view.json` | **Din** live-visning (gitignoreret — Codex skriver den) |

## Start lokalt (uden Codex)

```bash
chmod +x scripts/start-bankmcp.sh   # første gang
./scripts/start-bankmcp.sh
```

Eller direkte:

```bash
npx -y bankmcp
```

Kræver **Node.js 24+**. Setup-siden i browseren guider Enable Banking + bank-login.  
State ligger typisk i `~/.bankmcp` — **commit aldrig** den mappe ind i dette projekt.

## Tilslut ChatGPT Desktop / Codex

1. Kør BankMCP lokalt (scriptet ovenfor)  
2. Tilføj MCP-serveren i klienten med samme kommando som i `config/bankmcp.mcp.example.json`  
   (`command: npx`, `args: ["-y", "bankmcp"]`) — eller følg BankMCP’s guide til din klient  
3. Godkend / “connect my bank” indtil `list_accounts` virker  
4. Kør **Prompt B** i [`START-HER.md`](START-HER.md) så Codex skriver `local/bank-view.json` og opdaterer `/app/`

## Sikkerhedsregler (lokalt host)

- BankMCP er **read-only** (ingen betalinger)  
- Live JSON kun under `local/` (gitignoreret)  
- Ingen tokens, OAuth-sessioner eller fulde IBAN i git  
- Del ikke din lokale URL/password; det er din private server  

Se også [`SECURITY.md`](SECURITY.md).
