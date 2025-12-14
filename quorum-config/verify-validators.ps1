Param(
  [string]$RpcUrl = "http://127.0.0.1:22000"
)

$ErrorActionPreference = 'Stop'

$body = @{ jsonrpc = '2.0'; method = 'istanbul_getValidators'; params = @(); id = 1 } | ConvertTo-Json -Compress
$resp = Invoke-RestMethod -Method Post -Uri $RpcUrl -ContentType 'application/json' -Body $body -TimeoutSec 10

$validators = @($resp.result)
Write-Host ("Validator count: {0}" -f $validators.Count)
$validators | ForEach-Object { Write-Host $_ }
