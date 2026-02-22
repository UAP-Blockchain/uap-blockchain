# UAP Blockchain (University Academic Platform)

This repository contains the **Blockchain** part of the “University Academic & Student Management on Blockchain” capstone project. The goal is to record and verify academic workflows (class management, attendance, grades, credentials, etc.) on a permissioned **Ethereum Quorum** network.

The project uses **Hardhat (TypeScript)** to compile, test, deploy, and interact with the smart contracts.

## Overview

- **Target network:** Ethereum Quorum (permissioned), can be run locally via quorum-dev-quickstart
- **Tooling:** Hardhat + TypeScript
- **Testing:** Solidity/TypeScript tests (depending on the current project setup)
- **Architecture & deployment docs:** see the `docs/` folder

## Folder structure

```
Capstone Project/
	contracts/            # Smart contracts (Solidity)
	scripts/              # Deploy/interaction scripts (Hardhat/Node/TS)
	test/                 # Smart contract tests
	quorum-config/        # Quorum-related configs/notes (if any)
	docs/                 # Docs: overview, architecture, deployment...
	hardhat.config.ts     # Hardhat config
	package.json          # Scripts and dependencies
```

## Prerequisites

- Node.js (recommended: LTS) + npm
- Docker (if you run Quorum locally using the quickstart)
- (Optional) WSL2 on Windows to run the quickstart scripts more smoothly

## Quick start (Hardhat local)

```bash
npm install
npm run compile
npm test
```

Notes:
- You can run Hardhat directly as well (e.g. `npx hardhat test`).

## Run Quorum locally

To start a sample Quorum network (with Tessera), you can use quorum-dev-quickstart:

```bash
git clone https://github.com/ConsenSys/quorum-dev-quickstart.git
cd quorum-dev-quickstart
./run.sh up
```

After it starts, the quickstart output will print the RPC ports (often `22000`, `22001`, ...). For example:

- Quorum Node 1 RPC: `http://127.0.0.1:22000`
- Quorum Node 2 RPC: often `http://127.0.0.1:22001` or `http://127.0.0.1:22002` (follow the quickstart output)

## Environment configuration (.env)

Create a `.env` file at the project **root** (do not commit it). Example:

```text
# Quorum RPC URLs (defaults also exist in hardhat.config.ts)
QUORUM_NODE_URL=http://127.0.0.1:22000
QUORUM_NODE2_URL=http://127.0.0.1:22002

# Quorum chain ID (commonly 1337)
QUORUM_CHAIN_ID=1337

# Provide accounts to Hardhat when using Quorum:
# Option 1) single admin private key (simplest)
ADMIN_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Option 2) mnemonic (Hardhat derives multiple accounts)
# QUORUM_MNEMONIC=your twelve word mnemonic ...

# (Optional) used by some scripts that read UniversityManagement state
# You can copy it from deployments.json after deployment
# UNIVERSITY_MANAGEMENT_ADDRESS=0x...
```

## Deploy & interact with Quorum

Scripts in `scripts/` support deployment and basic interactions (depending on each contract).

### Deploy to Quorum

Deploying to the `quorum_local` network runs [scripts/deploy.ts](scripts/deploy.ts) and writes contract addresses to `deployments.json`:

```bash
npm run deploy:quorum
```

### Seed sample users/roles

After deployment, you can register sample users/roles (reads addresses from `deployments.json`):

```bash
npx hardhat run scripts/setup-roles.ts --network quorum_local
```

### Utility scripts

```bash
# Verify there is contract bytecode at the addresses in deployments.json
npx hardhat run scripts/verify.ts --network quorum_local

# Inspect a transaction and try to decode input/logs (when ABI is available)
npx hardhat run .\scripts\tx-info.ts --network quorum_local --tx 0x...

# List registered users from UniversityManagement
# Note: this script needs UNIVERSITY_MANAGEMENT_ADDRESS (or you can edit it inside the file)
npx hardhat run scripts/list-registered-users.ts --network quorum_local
```

### Deploy on Hardhat local (optional)

If you want a fast local chain for testing, start a node in one terminal:

```bash
npm run node
```

Then deploy in another terminal:

```bash
npm run deploy
```

## Documentation

- See the `docs/` folder:
	- `OVERVIEW.md`: project overview
	- `ARCHITECTURE.md`: architecture
	- `DEPLOYMENT.md`: deployment guide
	- `API.md`: integration/API notes (if any)

## Team

- SE170107 — Nguyễn Phi Hùng (Leader)
- SE170246 — Nguyễn Trung Nam
- SE170118 — Huỳnh Gia Bảo
- SE170117 — Nghiêm Văn Hoàng

Supervisor: Mr. Nguyễn Ngọc Lâm

## License

MIT
