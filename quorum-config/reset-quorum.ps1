Param(
  [switch]$Verify,
  [string]$ComposeFile = "docker-compose.yml",
  [string]$RpcUrl = "http://127.0.0.1:22000"
)

$ErrorActionPreference = 'Stop'

function Write-Info([string]$msg) { Write-Host "[reset-quorum] $msg" }

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

Write-Info "Working dir: $here"

# Basic Docker availability checks
$dockerExe = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerExe) {
  throw "Docker CLI not found in PATH. Install Docker Desktop and reopen PowerShell."
}

try {
  docker version | Out-Null
} catch {
  Write-Info "Docker daemon not reachable. Open Docker Desktop and wait for 'Engine running', then rerun this script."
  throw
}

if (-not (Test-Path $ComposeFile)) {
  throw "Compose file not found: $ComposeFile"
}

Write-Info "Stopping containers..."
docker compose -f $ComposeFile down | Out-Host

Write-Info "Removing chaindata (and txpool journals) to apply updated genesis..."
$resetPaths = @(
  (Join-Path $here 'quorum-gateway-data\geth\chaindata'),
  (Join-Path $here 'quorum-node1-data\geth\chaindata'),
  (Join-Path $here 'quorum-node2-data\geth\chaindata'),
  (Join-Path $here 'quorum-node3-data\geth\chaindata'),
  (Join-Path $here 'quorum-node4-data\geth\chaindata'),

  # Clear locally-journaled txs; otherwise old pending txs can be reloaded on startup.
  (Join-Path $here 'quorum-gateway-data\geth\transactions.rlp'),
  (Join-Path $here 'quorum-node1-data\geth\transactions.rlp'),
  (Join-Path $here 'quorum-node2-data\geth\transactions.rlp'),
  (Join-Path $here 'quorum-node3-data\geth\transactions.rlp'),
  (Join-Path $here 'quorum-node4-data\geth\transactions.rlp')
)
foreach ($p in $resetPaths) {
  if (Test-Path $p) {
    Write-Info "Deleting $p"
    Remove-Item -Recurse -Force $p
  } else {
    Write-Info "Skip (missing) $p"
  }
}

Write-Info "Starting containers..."
docker compose -f $ComposeFile up -d | Out-Host

Write-Info "Waiting for RPC..."
$body = @{ jsonrpc = '2.0'; method = 'eth_blockNumber'; params = @(); id = 1 } | ConvertTo-Json -Compress
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  try {
    $resp = Invoke-RestMethod -Method Post -Uri $RpcUrl -ContentType 'application/json' -Body $body -TimeoutSec 3
    if ($resp.result) { $ok = $true; break }
  } catch {
    Start-Sleep -Seconds 1
  }
}

if (-not $ok) {
  Write-Info "RPC did not respond in time. Check container logs: docker logs quorum-node1"
  exit 1
}

Write-Info "RPC is up."

if ($Verify) {
  Write-Info "Fetching validators..."
  $vBody = @{ jsonrpc = '2.0'; method = 'istanbul_getValidators'; params = @(); id = 1 } | ConvertTo-Json -Compress
  $vResp = Invoke-RestMethod -Method Post -Uri $RpcUrl -ContentType 'application/json' -Body $vBody -TimeoutSec 10
  $validators = @($vResp.result)
  Write-Info ("Validator count: {0}" -f $validators.Count)
  $validators | ForEach-Object { Write-Host $_ }
}
