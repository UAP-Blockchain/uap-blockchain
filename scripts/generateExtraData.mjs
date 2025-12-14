import { Buffer } from "buffer";
import rlp from "rlp";

// ✅ 4 validator = 4 account trong personal.listAccounts của 4 node
const validators = [
  "0x7f34479456ea71e9b3ba5d95a78b1965aa75c8cf", // node1
  "0x22b6d51b637ce6e3dd9ba1a734bf0e8a20bed76b", // node2
  "0x3e8580762230b9c6377a4f23e7f76e12ac386a19", // node3
  "0x41eab64288d9c07131fbca4f5e704c28eacdcd23"  // node4
];

// ✅ 32 bytes vanity (bắt buộc)
const vanity = Buffer.alloc(32, 0);

// ✅ Convert validator → 20 bytes
const validatorBytes = validators.map(v =>
  Buffer.from(v.slice(2), "hex")
);

// ✅ proposerSeal = 65 bytes 0 ở genesis
const proposerSeal = Buffer.alloc(65, 0);

// ✅ committedSeals = RLP empty list
const committedSeals = [];

// ✅ RLP encode đúng chuẩn Istanbul
const istanbulExtra = rlp.encode([
  validatorBytes,
  proposerSeal,
  committedSeals
]);

// ✅ extraData cuối cùng = vanity + rlp(...)
const extraData = Buffer.concat([
  vanity,
  istanbulExtra
]);

console.log("extraData:");
console.log("0x" + extraData.toString("hex"));
