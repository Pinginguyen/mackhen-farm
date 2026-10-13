#!/usr/bin/env bash
set -euo pipefail
curl -sS -i -X POST "http://localhost:3000/api/payments/payos/create" \
  -H "Content-Type: application/json" \
  --data @"$(dirname "$0")/sample-data.json"
