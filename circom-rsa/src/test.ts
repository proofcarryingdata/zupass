import { getCircuitInputs } from "./helpers/groupSignature/sign";
import { execSync } from "child_process";

function generateRSASignature() {
  const signature = execSync(
    'echo "E PLURIBUS UNUM; DO NOT SHARE" | ssh-keygen -q -Y sign -n double-blind.xyz -f ~/.ssh/id_rsa'
  );

  return signature.toString();
}

async function test() {
  const signature = generateRSASignature();
  const inputs = getCircuitInputs(signature);
  console.log(await inputs);
}

test();
