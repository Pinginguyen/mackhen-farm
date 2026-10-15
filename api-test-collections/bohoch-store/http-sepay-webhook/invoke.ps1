$path = Join-Path $PSScriptRoot 'sample-data.json'
curl.exe -i -X POST "http://localhost:3000/api/payment/sepay/webhook" -H "Content-Type: application/json" --data-binary "@$path"