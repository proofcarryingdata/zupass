import * as crypto from "crypto";
import NodeRSA from "node-rsa";

export function generateInputs() {
  const key = new NodeRSA({ b: 2048 });
  const message = Uint8Array.from([0xff, 0xfa]);

  const components = key.exportKey("components-public");
  const modulusBigInt = BigInt(`0x${components.n.toString("hex")}`);
  const exponentBigInt =
    typeof components.e === "number"
      ? BigInt(components.e)
      : BigInt(`0x${components.e.toString("hex")}`);
  console.log("exponent: ", exponentBigInt);
  console.log("modulus: ", modulusBigInt);

  const signatureBuffer = key.sign(message);
  const signatureBigInt = BigInt(`0x${signatureBuffer.toString("hex")}`);
  console.log("signature: ", signatureBigInt);

  const hashBuffer = crypto.createHash("sha256").update(message).digest();
  const hashBigInt = BigInt(`0x${hashBuffer.toString("hex")}`);

  console.log("hash: ", hashBigInt);

  // const text = "Hello RSA!";
  // const encrypted = key.encrypt(text, "base64");
  // console.log("encrypted: ", encrypted);
  // const decrypted = key.decrypt(encrypted, "utf8");
  // console.log("decrypted: ", decrypted);
}
