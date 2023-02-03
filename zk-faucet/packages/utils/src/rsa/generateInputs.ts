import * as crypto from "crypto";
import NodeRSA from "node-rsa";
import { splitToWords } from "./util";

export function generateInputs() {
  const key = new NodeRSA({ b: 2048 });
  // key.setOptions();
  const message = Uint8Array.from([0xff, 0xfa]);

  const components = key.exportKey("components-public");
  console.log(components.n.toString("hex"));
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

  const input = Object.assign(
    {},
    splitToWords(signatureBigInt, 64, 32, "sign"),
    splitToWords(exponentBigInt, 64, 32, "exp"),
    splitToWords(modulusBigInt, 64, 32, "modulus"),
    splitToWords(hashBigInt, 64, 4, "hashed")
  );

  console.log(input);

  return input;
}
