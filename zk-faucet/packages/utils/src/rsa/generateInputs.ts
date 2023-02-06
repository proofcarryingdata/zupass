import { readFileSync } from "fs";

export async function generateInputs() {
  return JSON.parse(
    readFileSync(
      "/Users/ivanchub/Projects/zk-faucet/zk-faucet/packages/utils/test_rsa_input.json"
    ).toString()
  );
}
