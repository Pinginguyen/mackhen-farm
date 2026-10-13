$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot 'sample-data.json'
curl.exe -i -X POST "http://localhost:3000/api/webhooks/payos" -H "Content-Type: application/json" --data-binary "@$path"
