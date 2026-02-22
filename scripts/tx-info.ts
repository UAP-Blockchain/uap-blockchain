import fs from "node:fs";
import path from "node:path";
import hre from "hardhat";

const { ethers } = hre;

const TX_HASH = "0xfa1690e19ecd41442120f8c824c6854ade051c5aba2fd9fbc1a70b91fbbefac6";

type DeploymentsFile = {
  network?: string;
  chainId?: string;
  deployer?: string;
  timestamp?: string;
  contracts?: Record<string, string>;
};

function usage(): never {
  console.error(
    [
      "Usage:",
      "  npx hardhat run .\\scripts\\tx-info.ts --network quorum_local",
      "  npx hardhat run .\\scripts\\tx-info.ts --network quorum_local --tx <txHash>",
      "",
      "Example:",
      "  npx hardhat run .\\scripts\\tx-info.ts --network quorum_local",
      "  npx hardhat run .\\scripts\\tx-info.ts --network quorum_local --tx 0x...",
    ].join("\n")
  );
  process.exit(1);
}

function normalizeAddress(value: string): string {
  return value.toLowerCase();
}

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") return value.toString();
  return value;
}

function tryReadJson<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getArgValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

async function main() {
  const txHashFromFlag = getArgValue("--tx");
  const lastArg = process.argv[process.argv.length - 1];
  const txHashFromLastArg = /^0x[0-9a-fA-F]{64}$/.test(lastArg) ? lastArg : null;
  const txHash = txHashFromFlag ?? txHashFromLastArg ?? TX_HASH;

  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    usage();
  }

  if (!txHashFromFlag && !txHashFromLastArg) {
    console.log("Using TX_HASH:", txHash);
  }

  const provider = ethers.provider;

  const tx = await provider.getTransaction(txHash);
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!tx) {
    console.log("Transaction not found:", txHash);
    console.log("Tip: if receipt is null, the tx may not be mined yet.");
    return;
  }

  const block = tx.blockNumber != null ? await provider.getBlock(tx.blockNumber) : null;

  // Load deployments.json (optional) to map known contract addresses to ABIs
  const rootDir = process.cwd();
  const deploymentsPath = path.join(rootDir, "deployments.json");
  const deployments = tryReadJson<DeploymentsFile>(deploymentsPath);

  const addressToContractName = new Map<string, string>();
  if (deployments?.contracts) {
    for (const [name, addr] of Object.entries(deployments.contracts)) {
      if (typeof addr === "string" && addr.startsWith("0x")) {
        addressToContractName.set(normalizeAddress(addr), name);
      }
    }
  }

  function tryLoadInterfaceForAddress(address: string): { name: string; iface: ethers.Interface } | null {
    const contractName = addressToContractName.get(normalizeAddress(address));
    if (!contractName) return null;

    const artifactPath = path.join(
      rootDir,
      "artifacts",
      "contracts",
      `${contractName}.sol`,
      `${contractName}.json`
    );

    const artifact = tryReadJson<{ abi: unknown }>(artifactPath);
    if (!artifact?.abi) return null;

    try {
      const iface = new ethers.Interface(artifact.abi as any);
      return { name: contractName, iface };
    } catch {
      return null;
    }
  }

  // Decode call input (if to is a known contract)
  let decodedCall: any = null;
  if (tx.to) {
    const contract = tryLoadInterfaceForAddress(tx.to);
    if (contract) {
      try {
        const parsed = contract.iface.parseTransaction({ data: tx.data, value: tx.value });
        decodedCall = {
          contract: contract.name,
          to: tx.to,
          function: parsed?.name,
          signature: parsed?.signature,
          args: parsed?.args ? Array.from(parsed.args).map((v) => v) : null,
        };
      } catch {
        decodedCall = {
          contract: contract.name,
          to: tx.to,
          error: "Unable to decode tx input with ABI",
        };
      }
    }
  }

  // Decode logs (if emitting contracts are known)
  let decodedLogs: any[] | null = null;
  if (receipt?.logs?.length) {
    decodedLogs = [];
    for (const log of receipt.logs) {
      const contract = tryLoadInterfaceForAddress(log.address);
      if (!contract) continue;

      try {
        const parsed = contract.iface.parseLog({ topics: log.topics, data: log.data });
        decodedLogs.push({
          contract: contract.name,
          address: log.address,
          event: parsed?.name,
          signature: parsed?.signature,
          args: parsed?.args ? Array.from(parsed.args).map((v) => v) : null,
        });
      } catch {
        decodedLogs.push({
          contract: contract.name,
          address: log.address,
          error: "Unable to decode log with ABI",
          topics: log.topics,
        });
      }
    }
  }

  const result = {
    network: deployments?.network ?? null,
    chainId: deployments?.chainId ?? null,
    tx: {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      nonce: tx.nonce,
      value: tx.value,
      data: tx.data,
      gasLimit: tx.gasLimit,
      gasPrice: (tx as any).gasPrice ?? null,
      maxFeePerGas: (tx as any).maxFeePerGas ?? null,
      maxPriorityFeePerGas: (tx as any).maxPriorityFeePerGas ?? null,
      type: tx.type,
      chainIdTx: tx.chainId,
      blockNumber: tx.blockNumber,
      blockHash: tx.blockHash,
    },
    receipt: receipt
      ? {
          status: receipt.status,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          transactionIndex: receipt.index,
          gasUsed: receipt.gasUsed,
          cumulativeGasUsed: receipt.cumulativeGasUsed,
          contractAddress: receipt.contractAddress,
          logsCount: receipt.logs.length,
          logs: receipt.logs.map((l) => ({
            address: l.address,
            topics: l.topics,
            data: l.data,
            transactionHash: l.transactionHash,
            blockNumber: l.blockNumber,
          })),
        }
      : null,
    block: block
      ? {
          number: block.number,
          hash: block.hash,
          parentHash: block.parentHash,
          timestamp: block.timestamp,
          miner: (block as any).miner ?? null,
          transactions: Array.isArray(block.transactions) ? block.transactions.length : null,
        }
      : null,
    decodedCall,
    decodedLogs,
  };

  console.log(JSON.stringify(result, jsonReplacer, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
