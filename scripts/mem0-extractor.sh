#!/usr/bin/env bash
# Extractor de hechos para Mem0 - Academia Catalizadora, Sesion 5.
# Lee commits recientes de este repo y los guarda como memorias en Mem0.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -z "${MEM0_API_KEY:-}" ] && [ -f .env ]; then
  export "$(grep -v '^#' .env | xargs)"
fi

if [ -z "${MEM0_API_KEY:-}" ]; then
  echo "Error: falta MEM0_API_KEY (ponla en .env o como variable de entorno)." >&2
  exit 1
fi

USER_ID="mem0-mcp"
SINCE="${1:-7 days ago}"
saved=0
failed=0

commits=$(git log --since="$SINCE" --pretty=format:"%s")

if [ -z "$commits" ]; then
  echo "No hay commits nuevos desde: $SINCE"
  exit 0
fi

while IFS= read -r subject; do
  [ -z "$subject" ] && continue

  status=$(curl -s -o /tmp/mem0-extractor-response.json -w "%{http_code}" \
    -X POST "https://api.mem0.ai/v1/memories/" \
    -H "Authorization: Token ${MEM0_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$(node -e "console.log(JSON.stringify({messages:[{role:'user',content:'Commit en mi-contexto: ' + process.argv[1]}],user_id:process.argv[2],metadata:{source:'git-commit'}}))" "$subject" "$USER_ID")")

  if [ "$status" = "200" ] || [ "$status" = "201" ]; then
    saved=$((saved + 1))
    echo "Guardado: $subject"
  else
    failed=$((failed + 1))
    echo "Fallo ($status): $subject" >&2
  fi
done <<< "$commits"

echo ""
echo "Fuente: git-commits | Guardados: $saved | Fallidos: $failed"
