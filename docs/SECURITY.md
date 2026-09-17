# Sikkerhed og følsomme data

Dette offentlige scaffold leverer **kun eksempler**. Personlige og live data bliver på din maskine.

## Må aldrig ind i git (eller chat-paste)

| Klasse | Eksempler |
|--------|-----------|
| Hemmeligheder | API-tokens, OAuth-sessioner, `.env`, PEM/KEY, `~/.bankmcp` |
| Identitet | CPR, e-mail, telefon, hjemmeadresse som lagret data |
| Penge | Live saldi/IBAN i commits (lokal `bank-view.json` er OK **uden track**) |
| Dokumenter | Kontoudtog/lån/police-**PDF’er** og rå extracts med PII |
| Taxonomy-sladder | Bank-/forsikrings-**produktnavne** inde i `taxonomy/*.json` |

OK i docs: BankMCP, «PDF-inbox», FIBO-stil, Palantir som branchekontekst.  
OK lokalt (gitignoreret / kun browser): `local/bank-view.json`, eksporterede PDF’er under `local/pdfs/inbox/`, extracts, og **browser IndexedDB / localStorage**-PDF-upload i `/app/` (synces aldrig til git).

## Foretræk filsystem frem for chat

- Læg PDF’er i `local/pdfs/inbox/` og lad Codex læse filerne dér  
- Paste **ikke** PDF-indhold eller fulde opgørelser ind i ChatGPT-tråden  

## Gitignore-baseline

- `.env`, credentials, oauth-sessioner, snapshots  
- `taxonomy/sot-map.json`, `local/bank-view.json`, `local/pdfs/providers.local.json`  
- `local/pdfs/inbox/**` (undtagen `.gitkeep`), `local/pdfs/extracted/**` (undtagen `.gitkeep`)  
- `transactions/`, `secrets/`

## Før du pusher en fork

```bash
git status
# forvent: ingen PDF’er, ingen bank-view.json, ingen .env
```

Hvis du har pastet en hemmelighed i chatten: roter den, og betragt tråden som kompromitteret for den hemmelighed.
