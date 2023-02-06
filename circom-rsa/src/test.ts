import { getCircuitInputs } from "./helpers/groupSignature/sign";
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import * as forge from "node-forge";

function generateRSASignature() {
  const signature = execSync(
    'echo "E PLURIBUS UNUM; DO NOT SHARE" | ssh-keygen -q -Y sign -n double-blind.xyz -f ~/.ssh/id_rsa'
  );

  return signature.toString();
}

async function test() {
  const signature = generateRSASignature();
  const inputs = await getCircuitInputs(
    signature,
    "E PLURIBUS UNUM; DO NOT SHARE"
  );

  writeFileSync(
    "/Users/ivanchub/Projects/zk-faucet/zk-faucet/packages/utils/test_rsa_input.json",
    JSON.stringify(inputs, null, 2)
  );
}

test();
