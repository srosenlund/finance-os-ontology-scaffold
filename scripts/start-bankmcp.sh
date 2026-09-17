#!/usr/bin/env bash
# Start BankMCP locally (read-only open-banking MCP for your own accounts).
# Docs: https://bankmcp.dk/ · https://github.com/noskillish/bankmcp
set -euo pipefail

if ! command -v npx >/dev/null 2>&1; then
  echo "Node.js/npx mangler. Installer Node 24+ fra https://nodejs.org og prøv igen." >&2
  exit 1
fi

echo "Starter lokal BankMCP (npx -y bankmcp)…"
echo "Følg setup-siden i browseren (Enable Banking + forbind bank)."
echo "Stop med Ctrl+C. State ligger typisk i ~/.bankmcp — commit aldrig den mappe."
exec npx -y bankmcp "$@"
