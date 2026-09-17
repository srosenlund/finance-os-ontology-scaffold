#!/usr/bin/env bash
# Byg en let ZIP til ChatGPT Desktop / Codex-nybegyndere (uden tests og tunge contributor-docs).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/dist/personal-finance-dashboard-beginner.zip}"
STAGE="$(mktemp -d)"
NAME="personal-finance-dashboard"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$(dirname "$OUT")" "$STAGE/$NAME"

rsync -a \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude 'tests' \
  --exclude '__pycache__' \
  --exclude '.DS_Store' \
  --exclude 'local/bank-view.json' \
  --exclude 'local/pdfs/inbox/***' \
  --exclude 'local/pdfs/extracted/***' \
  --exclude 'taxonomy/sot-map.json' \
  --exclude 'docs/ARCHITECTURE.md' \
  --exclude 'docs/PROMPT-STARTERS.md' \
  "$ROOT/" "$STAGE/$NAME/"

# Behold inbox/extracted placeholders
mkdir -p "$STAGE/$NAME/local/pdfs/inbox" "$STAGE/$NAME/local/pdfs/extracted"
touch "$STAGE/$NAME/local/pdfs/inbox/.gitkeep" "$STAGE/$NAME/local/pdfs/extracted/.gitkeep"

# Kort pegepind i pakken
cat > "$STAGE/$NAME/START.md" <<'EOF'
# Start her

1. Åbn denne mappe i ChatGPT Desktop som Codex-projekt.
2. Følg `docs/START-HER.md`.
3. Se demo-appen: `python3 -m http.server 8765` → http://127.0.0.1:8765/app/

BankMCP er valgfri. PDF’er under Ingest forlader ikke browseren, før du eksporterer.
EOF

rm -f "$OUT"
(cd "$STAGE" && zip -qr "$OUT" "$NAME")
echo "Skrev $OUT"
ls -lh "$OUT"
