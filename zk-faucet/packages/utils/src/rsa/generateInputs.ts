import * as crypto from "crypto";
import NodeRSA from "node-rsa";
import { splitToWords } from "./util";
const bigInt = require("big-integer");

function exampleInputs() {
  // public key params. decimal
  const modulus = BigInt(
    "27333278531038650284292446400685983964543820405055158402397263907659995327446166369388984969315774410223081038389734916442552953312548988147687296936649645550823280957757266695625382122565413076484125874545818286099364801140117875853249691189224238587206753225612046406534868213180954324992542640955526040556053150097561640564120642863954208763490114707326811013163227280580130702236406906684353048490731840275232065153721031968704703853746667518350717957685569289022049487955447803273805415754478723962939325870164033644600353029240991739641247820015852898600430315191986948597672794286676575642204004244219381500407"
  );
  const exp = BigInt(65537);
  // signature. decimal
  const sign = BigInt(
    "27166015521685750287064830171899789431519297967327068200526003963687696216659347317736779094212876326032375924944649760206771585778103092909024744594654706678288864890801000499430246054971129440518072676833029702477408973737931913964693831642228421821166326489172152903376352031367604507095742732994611253344812562891520292463788291973539285729019102238815435155266782647328690908245946607690372534644849495733662205697837732960032720813567898672483741410294744324300408404611458008868294953357660121510817012895745326996024006347446775298357303082471522757091056219893320485806442481065207020262668955919408138704593"
  );
  // hashed data. decimal
  const hashed = BigInt(
    "83814198383102558219731078260892729932246618004265700685467928187377105751529"
  );

  let input = Object.assign(
    {},
    splitToWords(sign, 64, 32, "sign"),
    splitToWords(exp, 64, 32, "exp"),
    splitToWords(modulus, 64, 32, "modulus"),
    splitToWords(hashed, 64, 4, "hashed")
  );

  console.log(input);
}

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

  // exampleInputs();

  return input;

  // const text = "Hello RSA!";
  // const encrypted = key.encrypt(text, "base64");
  // console.log("encrypted: ", encrypted);
  // const decrypted = key.decrypt(encrypted, "utf8");
  // console.log("decrypted: ", decrypted);
}
