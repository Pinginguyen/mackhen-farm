$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot 'sample-data.json'
curl.exe -i -X POST "http://localhost:3000/api/payments/payos/create" -H "Content-Type: application/json" --data-binary "@$path"
