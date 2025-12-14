# 🔧 Quorum Network Setup Guide

## Overview

This directory contains configuration files for setting up a 4-node Ethereum Quorum network using Docker Compose.

## Network Architecture

```
┌─────────────────┐
│   Gateway       │
│ (RPC / WS only) │
│                 │
│   HTTP: 22000   │
│   WS:   22001   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Node 1        │     │   Node 2        │     │   Node 3        │     │   Node 4        │
│   (Validator)   │────▶│   (Validator)   │────▶│   (Validator)   │────▶│   (Validator)   │
│                 │     │                 │     │                 │     │                 │
│   P2P: 30303    │     │   P2P: 30303    │     │   P2P: 30303    │     │   P2P: 30303    │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Quick Start

### One-command reset (recommended after genesis/validator changes)

```powershell
./reset-quorum.ps1 -Verify
```

### 1. Start Quorum Network

```bash
cd quorum-config
docker-compose up -d
```

### Verify Validators

```powershell
./verify-validators.ps1
```

### 2. Check Node Status

```bash
# Check all containers
docker-compose ps

# Check Node 1 logs
docker logs quorum-node1

# Check Node 2 logs
docker logs quorum-node2

# Check Node 3 logs
docker logs quorum-node3
```

### 3. Verify Blockchain

```bash
# Check block number via Gateway
curl -X POST http://127.0.0.1:22000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check if mining (validators still mine; gateway just relays RPC)
curl -X POST http://127.0.0.1:22000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_mining","params":[],"id":1}'
```

## Configuration Files

### genesis.json

Genesis block configuration for the Quorum network:
- **Chain ID**: 1337
- **Consensus**: Istanbul BFT
- **Block Period**: 5 seconds
- **Gas Limit**: 0xE0000000 (~3.7 billion)

### docker-compose.yml

Docker Compose configuration for 4 Quorum nodes:
- **Gateway** (RPC/WS entrypoint): Ports 22000 (HTTP), 22001 (WebSocket)
- **Node 1-4** (Validators): No host ports exposed (hardening). Nodes communicate over the internal Docker network.

## Port Mapping

| Service | Host Port | Container Port | Protocol |
|---------|-----------|----------------|----------|
| Gateway HTTP | 22000 | 8545 | JSON-RPC |
| Gateway WS | 22001 | 8546 | WebSocket |

## Management Commands

### Start Network

```bash
docker-compose up -d
```

### Stop Network

```bash
docker-compose down
```

### Restart Network

```bash
docker-compose restart
```

### View Logs

```bash
# All nodes
docker-compose logs -f

# Specific node
docker logs -f quorum-node1
```

### Clean Data (Reset Network)

```bash
docker-compose down -v
docker-compose up -d
```

## Testing Connection

### Test Node 1

```bash
curl -X POST http://127.0.0.1:22000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Test Node 2

```bash
curl -X POST http://127.0.0.1:22002 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Test Node 3

```bash
curl -X POST http://127.0.0.1:22004 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

### Test Node 4

```bash
curl -X POST http://127.0.0.1:22006 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```
```

## Troubleshooting

### Containers Won't Start

```bash
# Check Docker status
docker ps -a

# View container logs
docker logs quorum-node1

# Check port conflicts
netstat -an | findstr "22000"
```

### Nodes Not Syncing

```bash
# Check peer connections
curl -X POST http://127.0.0.1:22000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"admin_peers","params":[],"id":1}'

# Restart network
docker-compose restart
```

### Node 1 Not Mining (Unauthorized)

If Node 1 logs show "Unauthorized" or it fails to seal blocks, it usually means the `nodekey` does not match the validator address in `genesis.json`.

1. Check the validator address in `docker-compose.yml` (entry `--unlock`).
2. Ensure `quorum-node1-data/geth/nodekey` corresponds to that address.
3. If needed, regenerate the nodekey or restore the correct one.

### Data Corruption

```bash
# Stop network
docker-compose down

# Remove volumes
docker volume rm quorum-config_quorum-node1-data
docker volume rm quorum-config_quorum-node2-data
docker volume rm quorum-config_quorum-node3-data

# Restart network
docker-compose up -d
```

## Production Recommendations

1. **Use persistent volumes** for node data
2. **Enable TLS/SSL** for RPC connections
3. **Configure firewall rules** to restrict access
4. **Setup monitoring** (Prometheus + Grafana)
5. **Enable audit logging** for all transactions
6. **Backup node data** regularly
7. **Use separate machines** for each node
8. **Configure resource limits** in docker-compose.yml

## Network Features

- ✅ **Istanbul BFT Consensus** - Byzantine fault tolerant
- ✅ **Zero Gas Price** - Free transactions
- ✅ **5-second Block Time** - Fast finality
- ✅ **Permissioned Network** - Controlled access
- ✅ **Private Transactions** - Optional privacy
- ✅ **Smart Contract Support** - Full EVM compatibility

## Next Steps

1. **Deploy Smart Contracts**:
   ```bash
   npx hardhat run scripts/deploy.ts --network quorum_local
   # Or use the npm script:
   # npm run deploy:quorum
   ```
   *This will generate a `deployments.json` file containing contract addresses.*

2. **Setup Initial Roles**:
   ```bash
   npx hardhat run scripts/setup-roles.ts --network quorum_local
   ```
   *This script reads `deployments.json` and initializes admin/teacher roles.*

3. **Verify Deployment**:
   ```bash
   npx hardhat run scripts/verify.ts --network quorum_local
   ```

---

**Network**: Quorum 3-node Istanbul BFT  
**Chain ID**: 1337  
**Last Updated**: December 2025
