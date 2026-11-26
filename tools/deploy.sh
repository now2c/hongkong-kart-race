#!/usr/bin/env bash
# Deploy hongkong-kart-race/ to hk-kart.sonoato.net via Hostinger TUS upload.
# Usage: ./tools/deploy.sh            (from hongkong-kart-race/ or anywhere)
# Safe to rerun: ?override=true is idempotent (see wiki recipes/tus-upload).
set -euo pipefail

DOMAIN="hk-kart.sonoato.net"
USER="u598147296"
SRC="$(cd "$(dirname "$0")/.." && pwd)"

FILES=(index.html css/style.css js/three.min.js js/characters.js js/game.js js/scene.js)

command -v jq >/dev/null || { echo "need jq"; exit 1; }
: "${HOSTINGER_API_TOKEN:?HOSTINGER_API_TOKEN not set}"

echo "== request upload URLs =="
UPLOAD_JSON=$(curl -s -X POST https://developers.hostinger.com/api/hosting/v1/files/upload-urls \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER\",\"domain\":\"$DOMAIN\"}")
# retry on transient Hosting:9999
if echo "$UPLOAD_JSON" | grep -q "9999"; then
  sleep 15
  UPLOAD_JSON=$(curl -s -X POST https://developers.hostinger.com/api/hosting/v1/files/upload-urls \
    -H "Authorization: Bearer $HOSTINGER_API_TOKEN" -H "Content-Type: application/json" \
    -d "{\"username\":\"$USER\",\"domain\":\"$DOMAIN\"}")
fi
BASE_URL=$(echo "$UPLOAD_JSON" | jq -r '.url')
AUTH=$(echo "$UPLOAD_JSON" | jq -r '.auth_key')
AUTH_REST=$(echo "$UPLOAD_JSON" | jq -r '.rest_auth_key')
[ "$BASE_URL" != "null" ] || { echo "upload-urls failed: $UPLOAD_JSON"; exit 2; }
FILES_HOST=$(echo "$BASE_URL" | awk -F/ '{print $3}')

upload() {
  local rel="$1" file="$SRC/$1"
  local size; size=$(stat -c%s "$file")
  local enc; enc=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$rel")
  local url="$BASE_URL/$enc?override=true"
  echo "-- $rel ($size bytes)"
  local create_headers location
  create_headers=$(curl -s -D - -o /dev/null -X POST "$url" \
    -H "X-Auth: $AUTH" -H "X-Auth-Rest: $AUTH_REST" \
    -H "Tus-Resumable: 1.0.0" -H "Upload-Length: $size" -H "Upload-Offset: 0")
  local create_code
  create_code=$(echo "$create_headers" | head -1 | awk '{print $2}')
  location=$(echo "$create_headers" | grep -i '^location:' | tr -d '\r' | sed 's/^[Ll]ocation:[[:space:]]*//')
  echo "   create: $create_code"
  case "$create_code" in 200|201) ;; *) return 1 ;; esac
  # wiki tus-upload PATCH trap: Location lacks /rest/ prefix -> PATCH https://<files-host>/rest + Location
  local patch_url="https://$FILES_HOST/rest$location"
  local headers code off
  headers=$(curl -s -D - -o /dev/null -X PATCH "$patch_url" \
    -H "X-Auth: $AUTH" -H "X-Auth-Rest: $AUTH_REST" \
    -H "Tus-Resumable: 1.0.0" -H "Upload-Offset: 0" \
    -H "Content-Type: application/offset+octet-stream" \
    --data-binary "@$file")
  code=$(echo "$headers" | head -1 | awk '{print $2}')
  off=$(echo "$headers" | grep -i '^upload-offset' | tr -d '\r' | awk '{print $2}')
  echo "   patch: $code, final offset: ${off:-?} / $size"
  [ "${off:-0}" = "$size" ] || { echo "   MISMATCH for $rel"; return 1; }
}

FAIL=0
for f in "${FILES[@]}"; do upload "$f" || FAIL=1; done
[ $FAIL -eq 0 ] || { echo "some uploads failed — rerun this script (idempotent)"; exit 3; }

echo "== clear cache =="
hostinger hosting cache clear-website "$USER" "$DOMAIN"

echo "== verify =="
for f in "${FILES[@]}"; do
  remote=$(curl -sL "https://$DOMAIN/$f" | md5sum | awk '{print $1}')
  local_md5=$(md5sum "$SRC/$f" | awk '{print $1}')
  if [ "$remote" = "$local_md5" ]; then echo "OK  $f"; else echo "MD5 DIFF $f (remote=$remote local=$local_md5)"; fi
done
echo "DEPLOY DONE → https://$DOMAIN/"