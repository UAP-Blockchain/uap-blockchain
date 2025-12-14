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

  for (let i = 0n; i < totalUsers; i++) {
    try {
      // userAddresses(i) -> address
      // @ts-ignore
      const userAddress: string = await uni.userAddresses(i);

      // users(address) -> DataTypes.User struct
      // @ts-ignore
      const user = await uni.users(userAddress);

      // struct DataTypes.User:
      // userAddress, userId, fullName, email, role, isActive, createdAt
      const userId: string = user.userId;
      const fullName: string = user.fullName;
      const email: string = user.email;
      const role: bigint = user.role;
      const isActive: boolean = user.isActive;
      const createdAt: bigint = user.createdAt;

      console.log("------------------------------");
      console.log("Index      :", i.toString());
      console.log("Address    :", userAddress);
      console.log("UserId     :", userId);
      console.log("FullName   :", fullName);
      console.log("Email      :", email);
      console.log("Role (uint):", role.toString());
      console.log("Active     :", isActive);
      console.log("CreatedAt  :", createdAt.toString());
    } catch (e) {
      console.error(`Lỗi khi đọc user index ${i.toString()}:`, e);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});