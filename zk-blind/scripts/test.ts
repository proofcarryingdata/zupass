import * as fs from "fs";
import NodeRSA from "node-rsa";
import { toCircomBigIntBytes } from "../helpers/binaryFormat";

const key = new NodeRSA({ b: 2048 });

const text = "Hello RSA!";
const encrypted = key.encrypt(text, "base64");
const decrypted = key.decrypt(encrypted, "utf8");
const exported = key.exportKey("components-public");

const jwt = JSON.parse(fs.readFileSync("./jwt.json").toString());

const message = Buffer.from(jwt.message);
const signature = key.sign(message);

const signatureBigInt = BigInt(`0x` + signature.toString("hex"));
const modulusBigInt = BigInt(`0x` + exported.n.toString("hex"));

const signatureInput = toCircomBigIntBytes(signatureBigInt);
const modulusInput = toCircomBigIntBytes(modulusBigInt);

console.log({
  signatureInput,
  modulusInput,
});

jwt.modulus = modulusInput;
jwt.signature = signatureInput;

fs.writeFileSync("./jwt_modified.json", JSON.stringify(jwt, null, 2));
