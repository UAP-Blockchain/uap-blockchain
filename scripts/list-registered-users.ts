import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const { ethers } = hre;

// ESM: tự tính __dirname từ import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const universityAddress =
    process.env.UNIVERSITY_MANAGEMENT_ADDRESS ||
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  if (!universityAddress) {
    console.error(
      "UNIVERSITY_MANAGEMENT_ADDRESS chưa được set. Hãy set biến môi trường hoặc chỉnh trực tiếp trong script."
    );
    process.exit(1);
  }

  // Đọc ABI từ artifacts
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "UniversityManagement.sol",
    "UniversityManagement.json"
  );

  if (!fs.existsSync(artifactPath)) {
    console.error("Không tìm thấy artifact UniversityManagement.json tại:", artifactPath);
    process.exit(1);
  }

  const artifactRaw = fs.readFileSync(artifactPath, "utf8");
  const artifact = JSON.parse(artifactRaw);

  const [signer] = await ethers.getSigners();
  const uni = new ethers.Contract(universityAddress, artifact.abi, signer);

  // getTotalUsers() trả về uint256
  let totalUsers: bigint;

  try {
    // @ts-ignore
    totalUsers = await uni.getTotalUsers();
  } catch (e) {
    console.error("Gọi getTotalUsers() lỗi:", e);
    process.exit(1);
  }

  console.log("UniversityManagement contract:", universityAddress);
  console.log("Total on-chain users:", totalUsers.toString());

  // IMPORTANT:
  // - userAddresses[] may contain historical addresses (old wallets) after updateUserAddress.
  // - To get the CURRENT wallet for a user, use userIdToAddress(userId).

  // 1) Scan userAddresses[] to build history map: userId -> addresses[]
  type OnChainUser = {
    userId: string;
    fullName: string;
    email: string;
    role: bigint;
    isActive: boolean;
    createdAt: bigint;
  };

  const userIdToHistory = new Map<string, string[]>();
  const addressToUser = new Map<string, OnChainUser>();

  for (let i = 0n; i < totalUsers; i++) {
    try {
      // @ts-ignore
      const addr: string = await uni.userAddresses(i);
      // @ts-ignore
      const u = await uni.users(addr);

      const userId: string = (u?.userId ?? "").toString();
      if (!userId) {
        continue;
      }

      const record: OnChainUser = {
        userId,
        fullName: (u?.fullName ?? "").toString(),
        email: (u?.email ?? "").toString(),
        role: BigInt(u?.role ?? 0),
        isActive: Boolean(u?.isActive),
        createdAt: BigInt(u?.createdAt ?? 0),
      };

      addressToUser.set(addr, record);

      const existing = userIdToHistory.get(userId) ?? [];
      if (!existing.some((x) => x.toLowerCase() === addr.toLowerCase())) {
        existing.push(addr);
      }
      userIdToHistory.set(userId, existing);
    } catch (e) {
      console.error(`Lỗi khi scan user index ${i.toString()}:`, e);
    }
  }

  console.log("Unique userIds:", userIdToHistory.size);

  // 2) For each userId: print current wallet and history wallets
  let idx = 0;
  for (const [userId, historyAddresses] of userIdToHistory.entries()) {
    try {
      // @ts-ignore
      const currentAddress: string = await uni.userIdToAddress(userId);

      console.log("==============================");
      console.log("Index  :", idx);
      console.log("UserId :", userId);
      console.log("Current:", currentAddress);

      if (!currentAddress || /^0x0{40}$/i.test(currentAddress)) {
        console.log("=> Current address not found for this userId");
      } else {
        // @ts-ignore
        const currentUser = await uni.users(currentAddress);
        console.log("FullName   :", currentUser.fullName);
        console.log("Email      :", currentUser.email);
        console.log("Role (uint):", currentUser.role.toString());
        console.log("Active     :", currentUser.isActive);
        console.log("CreatedAt  :", currentUser.createdAt.toString());
      }

      console.log("-- History wallets (including inactive) --");
      for (const addr of historyAddresses) {
        const r = addressToUser.get(addr);
        const isCurrent =
          !!currentAddress && addr.toLowerCase() === currentAddress.toLowerCase();

        console.log("------------------------------");
        console.log("Address    :", addr, isCurrent ? "(current)" : "");
        if (r) {
          console.log("Active     :", r.isActive);
          console.log("Role (uint):", r.role.toString());
          console.log("FullName   :", r.fullName);
          console.log("Email      :", r.email);
          console.log("CreatedAt  :", r.createdAt.toString());
        } else {
          // Fallback (shouldn't happen, but keep output readable)
          // @ts-ignore
          const u = await uni.users(addr);
          console.log("Active     :", u.isActive);
          console.log("Role (uint):", u.role.toString());
          console.log("FullName   :", u.fullName);
          console.log("Email      :", u.email);
          console.log("CreatedAt  :", u.createdAt.toString());
        }
      }

      idx++;
    } catch (e) {
      console.error(`Lỗi khi resolve userId ${userId}:`, e);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});