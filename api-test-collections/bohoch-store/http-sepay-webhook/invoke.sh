#!/usr/bin/env sh
set -eu
curl -sS -i -X POST "http://localhost:3000/api/payment/sepay/webhook" \
  -H "Content-Type: application/json" \
  --data-binary "@$(dirname "$0")/sample-data.json"