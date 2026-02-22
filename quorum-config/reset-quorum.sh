#!/usr/bin/env bash
set -euo pipefail

VERIFY=0
COMPOSE_FILE="docker-compose.yml"
RPC_URL="http://127.0.0.1:22000"

usage() {
  cat <<'USAGE'
reset-quorum.sh - Reset Quorum chain data safely (Ubuntu/Linux)

What it does:
- Stops docker compose stack
- Deletes geth chaindata directories (forces re-init from genesis on next start)
- Deletes txpool journal files (transactions.rlp) and LOCK files
- Starts docker compose stack
- Waits for RPC to respond

It DOES NOT delete keystore/ or nodekey files.

Options:
  --verify              After RPC is up, print validator list (istanbul_getValidators)
  --compose-file <path> Compose file path (default: docker-compose.yml)
  --rpc-url <url>       RPC URL to wait/check (default: http://127.0.0.1:22000)
  -h, --help            Show help

Examples:
  ./reset-quorum.sh
  ./reset-quorum.sh --verify
  ./reset-quorum.sh --compose-file docker-compose.yml --rpc-url http://127.0.0.1:22000
USAGE
}

log() {
  echo "[reset-quorum] $*"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --verify)
      VERIFY=1
      shift
      ;;
    --compose-file)
      COMPOSE_FILE="${2:-}"
      shift 2
      ;;
    --rpc-url)
      RPC_URL="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 2
      ;;
  esac
done

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"
log "Working dir: $HERE"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI not found. Install Docker on this machine/VM first." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon not reachable. Start Docker (or check permissions), then rerun." >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

log "Stopping containers..."
docker compose -f "$COMPOSE_FILE" down

log "Removing chaindata (and txpool journals) to apply updated genesis..."
RESET_PATHS=(
  "quorum-gateway-data/geth/chaindata"
  "quorum-node1-data/geth/chaindata"
  "quorum-node2-data/geth/chaindata"
  "quorum-node3-data/geth/chaindata"
  "quorum-node4-data/geth/chaindata"

  "quorum-gateway-data/geth/transactions.rlp"
  "quorum-node1-data/geth/transactions.rlp"
  "quorum-node2-data/geth/transactions.rlp"
  "quorum-node3-data/geth/transactions.rlp"
  "quorum-node4-data/geth/transactions.rlp"

  "quorum-gateway-data/geth/LOCK"
  "quorum-node1-data/geth/LOCK"
  "quorum-node2-data/geth/LOCK"
  "quorum-node3-data/geth/LOCK"
  "quorum-node4-data/geth/LOCK"
)

for p in "${RESET_PATHS[@]}"; do
  if [[ -e "$p" ]]; then
    log "Deleting $p"
    sudo rm -rf "$p"
  else
    log "Skip (missing) $p"
  fi
done

log "Starting containers..."
docker compose -f "$COMPOSE_FILE" up -d

log "Waiting for RPC..."
BODY='{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
OK=0
for i in $(seq 1 60); do
  # Use curl if available; otherwise fail with a clear error.
  if command -v curl >/dev/null 2>&1; then
    RESP="$(curl -sS --max-time 3 -H 'Content-Type: application/json' -d "$BODY" "$RPC_URL" 2>/dev/null || true)"
    if [[ "$RESP" == *"\"result\""* ]]; then
      OK=1
      break
    fi
  else
    echo "curl not found. Install curl (sudo apt-get install -y curl) or update script to use another HTTP client." >&2
    exit 1
  fi
  sleep 1
done

if [[ $OK -ne 1 ]]; then
  log "RPC did not respond in time. Check container logs: docker logs quorum-gateway"
  exit 1
fi

log "RPC is up."

if [[ $VERIFY -eq 1 ]]; then
  log "Fetching validators..."
  V_BODY='{"jsonrpc":"2.0","method":"istanbul_getValidators","params":[],"id":1}'
  V_RESP="$(curl -sS --max-time 10 -H 'Content-Type: application/json' -d "$V_BODY" "$RPC_URL" 2>/dev/null || true)"
  echo "$V_RESP"
fi
